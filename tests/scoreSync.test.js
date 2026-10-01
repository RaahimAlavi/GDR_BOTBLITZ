import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScoreSync } from '../src/lib/scoreSync.js';
import { persistScore, readScoreJob, listScoreJobs, scoreKey, SYNC_EVENT } from '../src/lib/scoreOutbox.js';
import { uploadQueuedScore, stableScoreId } from '../src/lib/scoreUpload.js';

const target='https://test.supabase.co';
const payload={nickname:'OFFLINE_TEST',score:1500,session_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',game_duration:45,created_at:'2026-09-30T08:00:00.000Z'};
function memoryStore() {
  const values=new Map();
  return {get length(){return values.size;},key:i=>Array.from(values.keys())[i],getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
}
const settle=async()=>{for(let i=0;i<20;i++) await Promise.resolve();};
function fixture(upload, storage=memoryStore(), connected=false) {
  const events=new EventTarget(), visibility=Object.assign(new EventTarget(),{visibilityState:'visible'});
  let time=Date.parse('2026-09-30T08:01:00Z'), next=0;
  const timers=new Map();
  const f={events,visibility,storage,online:connected};
  const schedule=(fn,delay)=>{const id=++next;timers.set(id,{fn,at:time+delay});return id;};
  f.sync=createScoreSync({storage,target,upload,events,visibility,online:()=>f.online,locks:null,now:()=>time,random:()=>0,schedule,cancel:id=>timers.delete(id)});
  f.advance=async ms=>{time+=ms;for(const [id,timer] of Array.from(timers)){if(timer.at<=time){timers.delete(id);timer.fn();}}await settle();};
  f.job=()=>readScoreJob(payload.session_id,storage,target);
  f.timers=timers;
  return f;
}
test('a run is durable before any network call and reconnect uploads automatically', async()=>{
  let calls=0;
  const f=fixture(async row=>{calls++;assert.ok(f.storage.getItem(scoreKey(target,row.session_id)));return {...row,id:row.session_id};});
  const queued=f.sync.enqueue(payload);
  assert.equal(queued.state,'pending');assert.equal(calls,0);assert.equal(f.job().payload.score,1500);
  f.online=true;f.events.dispatchEvent(new Event('online'));await f.sync.flush();
  assert.equal(calls,1);assert.equal(f.job().state,'synced');f.sync.stop();
});

test('a worker started during name checking uploads the first externally persisted game', async()=>{
  let calls=0;
  const f=fixture(async row=>{calls++;return {...row,id:row.session_id};},undefined,true);
  f.sync.start();await f.sync.flush();
  persistScore(payload,f.storage,target);
  f.events.dispatchEvent(new Event(SYNC_EVENT));await f.sync.flush();
  assert.equal(calls,1);assert.equal(f.job().state,'synced');
  f.events.dispatchEvent(new Event(SYNC_EVENT));await f.sync.flush();
  assert.equal(calls,1);f.sync.stop();
});

test('a new game persisted during another upload is scheduled without another game or reconnect',async()=>{
  let release;
  const seen=[];
  const second={...payload,session_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
  const f=fixture(async row=>{
    seen.push(row.session_id);
    if(seen.length===1)await new Promise(resolve=>{release=resolve;});
    return row;
  },undefined,true);
  f.sync.enqueue(payload);await settle();
  persistScore(second,f.storage,target);
  f.events.dispatchEvent(new Event(SYNC_EVENT));
  release();await f.sync.flush();await f.advance(500);await f.sync.flush();
  assert.deepEqual(seen,[payload.session_id,second.session_id]);
  assert.equal(readScoreJob(second.session_id,f.storage,target).state,'synced');f.sync.stop();
});
test('reopening restores an unfinished upload and keeps the original completion date', async()=>{
  const first=fixture(async()=>{throw Error('offline');});
  first.sync.enqueue(payload);first.sync.stop();
  let sent;
  const second=fixture(async row=>{sent=row;return {...row,id:row.session_id};},first.storage,true);
  second.sync.start();await second.sync.flush();
  assert.equal(sent.created_at,payload.created_at);assert.equal(second.job().state,'synced');second.sync.stop();
});
test('a hung connection times out, aborts, retains the score and retries with backoff', async()=>{
  let mode='hang',signal,calls=0;
  const f=fixture(async(row,options)=>{calls++;signal=options.signal;if(mode==='hang') return new Promise(()=>{});return row;},undefined,true);
  f.sync.enqueue(payload);await settle();
  await f.advance(8000);
  assert.equal(signal.aborted,true);assert.equal(f.job().state,'pending');assert.equal(f.job().attempts,1);
  await f.sync.flush();assert.equal(calls,1);
  mode='success';await f.advance(2000);await f.sync.flush();
  assert.equal(calls,2);assert.equal(f.job().state,'synced');f.sync.stop();
});
test('a repeated submission and simultaneous flushes do not duplicate work', async()=>{
  let release,calls=0;
  const f=fixture(async row=>{calls++;return new Promise(resolve=>{release=()=>resolve(row);});},undefined,true);
  f.sync.enqueue(payload);f.sync.enqueue({...payload,score:999});
  const first=f.sync.flush(),second=f.sync.flush();assert.equal(first,second);
  await settle();assert.equal(calls,1);assert.equal(f.job().payload.score,1500);
  release();await first;assert.equal(f.job().state,'synced');f.sync.stop();
});
test('different runs from two tabs never overwrite each other in storage', ()=>{
  const storage=memoryStore();
  persistScore(payload,storage,target);
  persistScore({...payload,session_id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'},storage,target);
  assert.equal(listScoreJobs(storage,target).length,2);
  assert.equal(listScoreJobs(storage,'https://other.supabase.co').length,0);
});
test('storage failure is reported instead of claiming a score is saved', ()=>{
  const storage=memoryStore();storage.setItem=()=>{throw Error('quota');};
  assert.throws(()=>persistScore(payload,storage,target),/could not save/);
});
test('permanent rejection retains the run and requires an explicit retry', async()=>{
  let rejected=true,calls=0;
  const f=fixture(async row=>{calls++;if(rejected)throw Object.assign(Error('denied'),{status:403});return row;},undefined,true);
  f.sync.enqueue(payload);await f.sync.flush();
  assert.equal(f.job().state,'blocked');assert.equal(f.timers.size,0);
  await f.advance(60000);assert.equal(calls,1);
  rejected=false;await f.sync.retry(payload.session_id);assert.equal(f.job().state,'synced');f.sync.stop();
});

test('a high first score survives the old server limit and syncs after the policy is updated',async()=>{
  let updated=false,calls=0;
  const f=fixture(async row=>{
    calls++;
    if(!updated)throw Object.assign(Error('old score policy'),{status:403,code:'42501'});
    return {...row,id:row.session_id};
  },undefined,true);
  f.sync.enqueue({...payload,score:90000});await f.sync.flush();
  assert.equal(f.job().state,'pending');assert.equal(f.job().payload.score,90000);
  assert.match(f.job().error,/score limit updated/);
  updated=true;await f.advance(2000);await f.sync.flush();
  assert.equal(calls,2);assert.equal(f.job().state,'synced');assert.equal(f.job().record.score,90000);f.sync.stop();
});
test('returning to a visible page retries pending runs', async()=>{
  const f=fixture(async row=>row);
  f.sync.enqueue(payload);f.online=true;
  f.visibility.dispatchEvent(new Event('visibilitychange'));await f.sync.flush();
  assert.equal(f.job().state,'synced');f.sync.stop();
});
test('reopening online retries immediately instead of inheriting an old backoff', async()=>{
  const first=fixture(async()=>{throw Error('no connection');},undefined,true);
  first.sync.enqueue(payload);await first.sync.flush();assert.equal(first.job().attempts,1);first.sync.stop();
  const second=fixture(async row=>row,first.storage,true);
  second.sync.start();await second.sync.flush();assert.equal(second.job().state,'synced');second.sync.stop();
});
function database({dropFirst=false,race=false}={}) {
  const rows=new Map();let inserts=0,finds=0,waiting=[];
  function client() {return {from:()=> {
    let mode='find',session,row;
    const query={
      select(){return query;},eq(_key,value){session=value;return query;},limit(){return query;},maybeSingle(){return query;},single(){return query;},
      insert(value){mode='insert';row=value;return query;},
      async abortSignal(){
        if(mode==='find'){
          finds++;
          if(race&&finds<=2)return new Promise(resolve=>{waiting.push(resolve);if(waiting.length===2){for(const done of waiting)done({data:null,error:null,status:200});waiting=[];}});
          return {data:Array.from(rows.values()).find(value=>value.session_id===session)||null,error:null,status:200};
        }
        inserts++;
        if(rows.has(row.id))return {data:null,error:{code:'23505',message:'duplicate primary key'},status:409};
        rows.set(row.id,row);
        if(dropFirst&&inserts===1)return {data:null,error:{message:'Response lost'},status:0};
        return {data:row,error:null,status:201};
      }
    };return query;
  }};}
  return {client,rows,get inserts(){return inserts;}};
}
test('a committed insert with a lost response is acknowledged on retry without inserting again', async()=>{
  const db=database({dropFirst:true}),client=db.client();
  const f=fixture((row,options)=>uploadQueuedScore(client,row,options),undefined,true);
  f.sync.enqueue(payload);await f.sync.flush();
  assert.equal(f.job().state,'pending');assert.equal(db.rows.size,1);
  await f.sync.retry(payload.session_id);
  assert.equal(f.job().state,'synced');assert.equal(db.inserts,1);f.sync.stop();
});
test('two browsers racing the same run use one database primary key', async()=>{
  const db=database({race:true});
  const a=fixture((row,options)=>uploadQueuedScore(db.client(),row,options),undefined,true);
  const b=fixture((row,options)=>uploadQueuedScore(db.client(),row,options),undefined,true);
  a.sync.enqueue(payload);b.sync.enqueue(payload);
  await Promise.all([a.sync.flush(),b.sync.flush()]);
  assert.equal(db.rows.size,1);assert.equal(db.inserts,2);
  assert.equal(a.job().state,'synced');assert.equal(b.job().state,'synced');
  a.sync.stop();b.sync.stop();
});
test('legacy session strings produce the same valid UUID on every retry', async()=>{
  const first=await stableScoreId('old-session-123');
  assert.match(first,/^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.equal(first,await stableScoreId('old-session-123'));
  assert.notEqual(first,await stableScoreId('old-session-124'));
});

test('reserved names upload through the ownership RPC without exposing a token in the score row',async()=>{
  const db=database(), client=db.client(); let sent;
  client.rpc=(name,args)=>({abortSignal:async()=>{
    assert.equal(name,'submit_named_score'); sent=args;
    return {data:{...args.p_run,nickname:'OFFLINE_TEST'},error:null};
  }});
  const result=await uploadQueuedScore(client,{...payload,name_token:'a'.repeat(64)},{signal:new AbortController().signal});
  assert.equal(sent.p_token,'a'.repeat(64)); assert.equal(sent.p_run.name_token,undefined);
  assert.equal(result.session_id,payload.session_id);assert.equal(db.inserts,0);
});
