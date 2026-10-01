import { test, after } from 'node:test';
import assert from 'node:assert/strict';

const noop = () => {};
let tick = 0;
const originalNow = Date.now;
Date.now = () => 2000000 + tick;
after(() => { Date.now = originalNow; });
Object.defineProperty(globalThis, 'performance', { value: { now: () => tick }, configurable: true });
const memory = new Map();
globalThis.localStorage = {getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem:key=>memory.delete(key), key:index=>Array.from(memory.keys())[index], get length(){return memory.size;}};
memory.set('botblitz_muted', 'true');
globalThis.window = Object.assign(new EventTarget(), {devicePixelRatio:3, matchMedia:()=>({matches:false})});
Object.defineProperty(globalThis, 'navigator', { value: { vibrate:noop }, configurable:true });
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;
const context = new Proxy({}, {get:()=>noop, set:()=>true});
globalThis.document = {createElement:()=>({getContext:()=>context})};
const {GameEngine} = await import('../src/lib/gameEngine.js');
const {createGameSession, validateSessionScore} = await import('../src/lib/scoreValidation.js');
const {submitScore, subscribeToLeaderboard, calculatePlayerRank} = await import('../src/lib/supabase.js');
const {processResult} = await import('../src/lib/results.js');

function fixture() {
  tick = 0;
  let rect = {left:0,top:0,width:844,height:314};
  const canvas = {getContext:()=>context, getBoundingClientRect:()=>rect, addEventListener:noop, removeEventListener:noop, setPointerCapture:noop};
  const completed = [];
  const hud = [];
  const session = createGameSession('TEST_PILOT');
  const engine = new GameEngine(canvas, {session,onGameOver:run=>completed.push(run),onHUDUpdate:value=>hud.push(value)});
  // Lifecycle tests create their own pickups/hits; random spawns would make them flaky.
  engine.handleSpawners = noop;
  engine.start();
  const step = (milliseconds) => {tick += milliseconds; engine.loop(tick);};
  const simulate = (seconds) => {for (let i=0;i<seconds*60;i++) step(1000/60);};
  return {engine,session,completed,hud,step,simulate,rotate:value=>{rect=value;engine.resize();}};
}

test('three unshielded hits end once; grace prevents repeated damage', () => {
  const f = fixture(); f.step(3000);
  f.engine.onPlayerHit(); assert.equal(f.engine.lives,2);
  f.engine.onPlayerHit(); assert.equal(f.engine.lives,2);
  f.simulate(1.7); f.engine.onPlayerHit(); assert.equal(f.engine.lives,1);
  f.simulate(1.7); f.engine.onPlayerHit();
  assert.equal(f.engine.lives,0); assert.equal(f.completed.length,1);
  assert.equal(f.completed[0].reason,'LIVES'); assert.equal(f.session.hits,3);
  assert.equal(validateSessionScore(f.session,0).isValid,true);
  assert.deepEqual(validateSessionScore(f.session,0),validateSessionScore(f.session,0));
  f.engine.onPlayerHit(); assert.equal(f.completed.length,1);
  const rematch = fixture(); assert.equal(rematch.engine.lives,3);
});

test('shield absorbs damage without a lost heart or logged hit', () => {
  const f=fixture(); f.step(3000); f.engine.triggerPowerUp('SHIELD');
  f.engine.onPlayerHit(); assert.equal(f.engine.lives,3); assert.equal(f.session.hits,0);
  assert.equal(f.engine.player.shieldActive,false);
  f.engine.onPlayerHit(); assert.equal(f.engine.lives,3);
  f.engine.destroy();
});

test('a hidden-tab frame gap cannot extend the match or simulate a huge jump', () => {
  const f=fixture(); f.step(3000); f.step(10000);
  assert.equal(f.engine.gameTimeRemaining,50);
  f.step(50000); assert.equal(f.completed[0].reason,'TIME');
  assert.equal(f.completed[0].duration,60);
  assert.equal(validateSessionScore(f.session,0).isValid,true);
});

test('rotation keeps pickups, laser endpoints and player targets in bounds', () => {
  const f=fixture();
  f.engine.collectibles=[{type:'BATTERY',x:900,y:500,radius:14,points:100}];
  f.engine.hazards=[{type:'LASER',x1:0,y1:520,x2:960,y2:520}];
  f.rotate({left:0,top:100,width:390,height:716});
  assert.equal(f.engine.width,540); assert.equal(f.engine.height,800);
  assert.ok(f.engine.collectibles[0].y < f.engine.height);
  assert.ok(f.engine.hazards[0].x2 <= f.engine.width);
  f.rotate({left:0,top:54,width:844,height:314});
  assert.ok(Math.abs(f.engine.collectibles[0].x-900) < .001);
  assert.ok(f.engine.player.targetY < f.engine.height);
  assert.equal(f.engine.dpr,2); f.engine.destroy();
});

test('relative dragging starts anywhere without teleporting under the finger', () => {
  const f=fixture(); f.step(3000);
  const x=f.engine.player.x;
  f.engine.onPointerDown({pointerId:1,pointerType:'touch',clientX:40,clientY:100,preventDefault:noop});
  assert.equal(f.engine.player.targetX,x);
  f.engine.onPointerMove({pointerId:1,clientX:100,clientY:100});
  assert.ok(Math.abs(f.engine.player.targetX-x-60/f.engine.worldScale)<.001);
  f.engine.onPointerMove({pointerId:2,clientX:300,clientY:300});
  assert.ok(Math.abs(f.engine.player.targetX-x-60/f.engine.worldScale)<.001);
  f.engine.onPointerUp({pointerId:1}); assert.equal(f.engine.isDragging,false); f.engine.destroy();
});

test('HUD updates are throttled but a life change is immediate', () => {
  const f=fixture(); f.step(3000); f.simulate(10);
  assert.ok(f.hud.length < 160, 'Expected fewer than 160 callbacks over ten seconds');
  f.engine.onPlayerHit(); assert.equal(f.hud.at(-1).lives,2); f.engine.destroy();
});

test('pickup combos, double points and overload match the saved score after damage', () => {
  const f=fixture(); f.step(3000);
  const battery={type:'BATTERY',points:100,x:100,y:100,color:'#c4f979'};
  f.engine.onCollectItem(battery);
  assert.equal(f.engine.score,100); assert.equal(f.engine.combo,2);
  f.engine.triggerPowerUp('DOUBLE'); f.engine.systemOverloadActive=true;
  f.engine.onCollectItem(battery);
  assert.equal(f.engine.score,700); assert.equal(f.engine.combo,3);
  f.engine.onPlayerHit(); assert.equal(f.engine.score,550); assert.equal(f.engine.combo,1);
  tick+=60000; f.engine.endGame('TIME');
  assert.equal(f.session.collected,2); assert.equal(f.session.bestCombo,3);
  assert.equal(validateSessionScore(f.session,550).isValid,true);
});

test('short unfinished runs and invalid scores are rejected', () => {
  const session=createGameSession('TEST');
  session.startTime=2000000; session.endTime=2010000; session.isCompleted=true; session.endReason='TIME';
  assert.equal(validateSessionScore(session,0).isValid,false);
  session.endTime=2060000;
  for (const score of [NaN,Infinity,-1,0.5,999]) assert.equal(validateSessionScore(session,score).isValid,false);
});

test('a legitimate first run above 60,000 points passes validation and is saved', async()=>{
  const f=fixture();f.step(3000);
  const core={type:'GOLDEN_CORE',points:1000,x:100,y:100,color:'#c4f979'};
  for(let i=0;i<20;i++)f.engine.onCollectItem(core);
  assert.equal(f.engine.score,90000);
  f.step(60000);
  assert.equal(validateSessionScore(f.session,f.engine.score).isValid,true);
  const saved=await processResult(f.session,f.engine.score);
  assert.equal(saved.record.score,90000);assert.equal(saved.sync,'demo');
  const queued=JSON.parse([...memory.entries()].find(([key])=>key.endsWith(':'+f.session.sessionId))[1]);
  assert.equal(queued.state,'synced');assert.equal(queued.payload.score,90000);
});

test('higher scores still reject mismatches and values over the shared ceiling',()=>{
  const session=createGameSession('BOUNDS');
  Object.assign(session,{startTime:2000000,endTime:2060000,isCompleted:true,endReason:'TIME',accumulatedScore:1000001});
  assert.equal(validateSessionScore(session,1000001).isValid,false);
  session.accumulatedScore=100000;
  assert.equal(validateSessionScore(session,99999).isValid,false);
  assert.equal(validateSessionScore(session,100000).isValid,true);
});

test('result replay shares one save and local notifications are delivered once', async () => {
  const f=fixture(); f.step(3000); f.step(60000);
  let notifications=0;
  const unsubscribe=subscribeToLeaderboard(()=>notifications++);
  const first=processResult(f.session,f.engine.score), second=processResult(f.session,f.engine.score);
  assert.equal(first,second);
  const saved=await first;
  assert.equal(saved.sync,'demo'); assert.equal(notifications,1);
  await submitScore({nickname:f.session.nickname,score:f.engine.score,sessionId:f.session.sessionId});
  assert.equal(notifications,1); unsubscribe();
});

test('rank counts all higher local scores instead of capping at 100', async () => {
  memory.set('botblitz_local_scores_v1',JSON.stringify(Array.from({length:150},(_,i)=>({id:String(i),session_id:String(i),nickname:'P'+i,score:1000+i,created_at:new Date().toISOString()}))));
  assert.equal(await calculatePlayerRank(10),151);
});

test('rank uses distinct names and the returning player best score, not their slower replay', async()=>{
  memory.set('botblitz_local_scores_v1',JSON.stringify([
    {id:'a',nickname:'Raahim',score:5000,created_at:new Date().toISOString()},
    {id:'b',nickname:'RAAHIM',score:3000,created_at:new Date().toISOString()},
    {id:'c',nickname:'Ali',score:4000,created_at:new Date().toISOString()},
    {id:'d',nickname:'Ali',score:2500,created_at:new Date().toISOString()},
    {id:'e',nickname:'Ayesha',score:6000,created_at:new Date().toISOString()},
  ]));
  assert.equal(await calculatePlayerRank(1000,true,'raahim'),2);
});

test('personal bests on a shared browser belong to the chosen name and recognize a queued new record',async()=>{
  const {persistScore}=await import('../src/lib/scoreOutbox.js');
  const {readPlayerBest,recordPlayerBest}=await import('../src/lib/playerBests.js');
  persistScore({nickname:'NAME_A',score:5000,session_id:'personal-a'});
  assert.equal(readPlayerBest('NAME_B'),0);
  assert.deepEqual(recordPlayerBest('NAME_A',5000,'personal-a'),{best:5000,isRecord:true});
  persistScore({nickname:'name_a',score:6000,session_id:'personal-a-2'});
  assert.deepEqual(recordPlayerBest('NAME_A',6000,'personal-a-2'),{best:6000,isRecord:true});
  assert.equal(readPlayerBest('NAME_B'),0);
});

test('native storage events deliver new scores from another tab once', () => {
  const seen=[]; const unsubscribe=subscribeToLeaderboard(row=>seen.push(row));
  const event=new Event('storage');
  Object.assign(event,{key:'botblitz_local_scores_v1',oldValue:'[]',newValue:JSON.stringify([{id:'fresh',session_id:'fresh',nickname:'CROSS_TAB',score:100,created_at:new Date().toISOString()}])});
  window.dispatchEvent(event); assert.equal(seen.length,1); unsubscribe();
});

test('fullscreen requests landscape and cleans up only a game-owned fullscreen', async () => {
  const {enterGameFullscreen,leaveGameFullscreen}=await import('../src/lib/fullscreen.js');
  const calls=[];
  globalThis.screen={orientation:{lock:async mode=>calls.push(mode),unlock:()=>calls.push('unlock')}};
  document.fullscreenElement=null;
  document.documentElement={requestFullscreen:async options=>{calls.push(options.navigationUI);document.fullscreenElement={};}};
  document.exitFullscreen=async()=>{calls.push('exit');document.fullscreenElement=null;};
  await enterGameFullscreen();
  assert.deepEqual(calls,['hide','landscape']);
  leaveGameFullscreen(); assert.deepEqual(calls,['hide','landscape','unlock','exit']);
});

test('declined fullscreen still resolves so play can continue', async () => {
  const {enterGameFullscreen,leaveGameFullscreen}=await import('../src/lib/fullscreen.js');
  document.fullscreenElement=null;
  document.documentElement.requestFullscreen=async()=>{throw new Error('Not supported');};
  await assert.doesNotReject(enterGameFullscreen()); leaveGameFullscreen();
});

test('a late fullscreen transition is released after the run exits', async () => {
  const {enterGameFullscreen,leaveGameFullscreen}=await import('../src/lib/fullscreen.js');
  let finishRequest;
  document.fullscreenElement=null;
  document.documentElement.requestFullscreen=()=>new Promise(resolve=>{finishRequest=()=>{document.fullscreenElement={};resolve();};});
  const pending=enterGameFullscreen(); leaveGameFullscreen(); finishRequest(); await pending;
  assert.equal(document.fullscreenElement,null);
});
