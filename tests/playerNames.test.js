import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparePlayerName, getNameProfile, initialPlayerName, rememberName} from '../src/lib/playerNames.js';
import {bestScoresByName, fetchBestScores, kioskStats} from '../src/lib/leaderboardData.js';

function memoryStore() {
  const values = new Map();
  return {getItem:key=>values.get(key) ?? null, setItem:(key,value)=>values.set(key,value)};
}
const options = storage => ({storage,target:'test',connected:true,claim:async ({nickname})=>({available:true,nickname,reserved:true})});

test('names are required and generated saved names are cleared from the lobby', async()=>{
  const storage = memoryStore();
  for (const name of ['', '   ', '<b></b>']) await assert.rejects(preparePlayerName(name,options(storage)));
  storage.setItem('botblitz_player_name','NEON_BYTE855');
  assert.equal(initialPlayerName(storage),'');
  storage.setItem('botblitz_player_name','QUANTUM_RUNNER85');
  assert.equal(initialPlayerName(storage),'');
  storage.setItem('botblitz_player_name','Raahim');
  assert.equal(initialPlayerName(storage),'Raahim');
});

test('a claimed name is remembered with a token and reused with different case', async()=>{
  const storage = memoryStore(), o=options(storage), tokens=[];
  o.claim=async candidate=>{tokens.push(candidate.token);return {available:true,nickname:'Raahim A',reserved:true};};
  const first = await preparePlayerName(' Raahim   A ',o);
  const second = await preparePlayerName('raahim a',o);
  assert.equal(first.nickname,'Raahim A'); assert.match(first.token,/^[a-f0-9]{64}$/);
  assert.equal(tokens[0],tokens[1]); assert.equal(second.confirmed,true);
});

test('a name taken by someone else is rejected and cannot be used offline', async()=>{
  const storage=memoryStore();
  await assert.rejects(preparePlayerName('Raahim',{...options(storage),claim:async()=>({available:false})}),/already taken/);
  assert.equal(getNameProfile('raahim',storage,'test').confirmed,false);
  await assert.rejects(preparePlayerName('Raahim',{...options(storage),connected:false}),/Connect to the internet/);
});

test('a lost claim response retries with the same persisted token', async()=>{
  const storage=memoryStore(); let firstToken;
  await assert.rejects(preparePlayerName('Ayesha', {...options(storage),claim:async candidate=>{firstToken=candidate.token;throw Error('connection lost');}}));
  const result=await preparePlayerName('Ayesha',{...options(storage),claim:async candidate=>{
    assert.equal(candidate.token,firstToken); return {available:true,nickname:'Ayesha',reserved:true};
  }});
  assert.equal(result.token,firstToken);
});

test('returning players can play offline; unconfirmed and new names cannot', async()=>{
  const storage=memoryStore();
  rememberName({nickname:'Ali Z',token:'a'.repeat(64),confirmed:true,reserved:true},storage,'test');
  const result=await preparePlayerName('ALI Z',{...options(storage),connected:false,claim:()=>{throw Error('must not call network');}});
  assert.equal(result.nickname,'Ali Z');
  await assert.rejects(preparePlayerName('New name',{...options(storage),connected:false}),/Connect to the internet/);
});

test('name tokens remain private to their configured backend and storage failures are reported', async()=>{
  const storage=memoryStore(); await preparePlayerName('Raahim',options(storage));
  assert.equal(getNameProfile('Raahim',storage,'other'),null);
  storage.setItem=()=>{throw Error('quota');};
  await assert.rejects(preparePlayerName('Someone new',options(storage)),/cannot remember/);
});

test('special property names cannot escape the profile map', async()=>{
  const storage=memoryStore();
  const result=await preparePlayerName('__proto__',options(storage));
  assert.equal(getNameProfile('__proto__',storage,'test').token,result.token);
  assert.equal(getNameProfile('constructor',storage,'test'),null);
});

const run=(nickname,score,id='1')=>({id,nickname,score,created_at:'2026-10-01T00:00:00Z'});
test('repeat runs use the best score; capitalization and spaces do not create new players',()=>{
  const rows=[run('Raahim',23700,'a'),run(' raahim ',56550,'b'),run('NEON_BYTE855',22650,'c'),run('NEON_BYTE855',58650,'d'),run('Hashir',43400,'e')];
  const best=bestScoresByName(rows);
  assert.deepEqual(best.map(r=>r.score),[58650,56550,43400]);
  assert.equal(rows.length,5);
  assert.deepEqual(kioskStats(rows),{totalPlayersToday:3,gamesPlayedToday:5,highestScoreToday:58650});
});

test('ties use the earliest run consistently',()=>{
  const a=run('Raahim',100,'a'), b={...run('RAAHIM',100,'b'),created_at:'2026-10-01T00:01:00Z'};
  assert.deepEqual(bestScoresByName([b,a]),[a]);
});

test('paging fills leaderboard places even when raw top runs belong to one player',async()=>{
  const rows=[run('A',100,'a'),run('A',99,'b'),run('A',98,'c'),run('B',97,'d'),run('C',96,'e')]; let requests=0;
  const client={from:()=>{const q={select:()=>q,order:()=>q,range:async(start,end)=>{requests++;return {data:rows.slice(start,end+1)};}};return q;}};
  const best=await fetchBestScores(client,{limit:3,pageSize:2});
  assert.deepEqual(best.map(r=>r.nickname),['A','B','C']); assert.equal(requests,3);
});

test('failed leaderboard pages do not silently return incomplete rankings',async()=>{
  const client={from:()=>{const q={select:()=>q,order:()=>q,range:async()=>({error:Error('offline')})};return q;}};
  await assert.rejects(fetchBestScores(client),/offline/);
});
