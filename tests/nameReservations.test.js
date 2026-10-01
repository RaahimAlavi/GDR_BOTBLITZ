import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db = new PGlite();
const migration = await readFile(new URL('../supabase-name-reservations.sql',import.meta.url),'utf8');
const tokenA='a'.repeat(64), tokenB='b'.repeat(64);
before(async()=>{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE public.scores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nickname varchar(16) NOT NULL,
      score integer NOT NULL, session_id text NOT NULL, game_duration integer DEFAULT 60,
      created_at timestamptz NOT NULL DEFAULT now());
    INSERT INTO scores(nickname,score,session_id) VALUES('Raahim',100,'legacy-run');`);
  await db.exec(migration);
});
after(()=>db.close());
async function claim(name,token,legacy=null) {
  const result=await db.query('SELECT public.claim_player_name($1,$2,$3) AS result',[name,token,legacy]);
  return result.rows[0].result;
}

test('database reservation lets exactly one device claim a name, ignoring case and spaces',async()=>{
  const [first,second]=await Promise.all([claim('Ayesha A',tokenA),claim(' ayesha   a ',tokenB)]);
  assert.equal([first,second].filter(row=>row.available).length,1);
  assert.equal((await claim('AYESHA A',tokenA)).available,true);
  assert.equal((await claim('Ayesha A',tokenB)).available,false);
});

test('existing names are reserved and adoption requires a matching historical run receipt',async()=>{
  assert.equal((await claim('Raahim',tokenA)).available,false);
  assert.equal((await claim('Raahim',tokenA,'wrong-run')).available,false);
  assert.equal((await claim('Raahim',tokenA,'legacy-run')).available,true);
  assert.equal((await claim('Raahim',tokenB,'legacy-run')).available,false);
});

test('anonymous clients can reserve names without reading other device tokens',async()=>{
  await db.exec('SET ROLE anon');
  try {
    assert.equal((await claim('Ali Z',tokenB)).available,true);
    await assert.rejects(db.query('SELECT * FROM public.botblitz_name_claims'), /permission denied/);
  } finally {await db.exec('RESET ROLE');}
});

test('named uploads verify ownership and repeat uploads keep one run and its original date',async()=>{
  const run={id:crypto.randomUUID(),nickname:'AYESHA A',score:1500,game_duration:45,created_at:'2026-09-30T11:00:00Z'};
  run.session_id=run.id;
  const submit=token=>db.query('SELECT public.submit_named_score($1,$2::jsonb) AS result',[token,JSON.stringify(run)]);
  await assert.rejects(submit(tokenB),/belongs to another player/);
  await db.exec('SET ROLE anon');
  try {
    const first=await submit(tokenA),second=await submit(tokenA);
    assert.deepEqual(first.rows,second.rows);
    assert.equal(first.rows[0].result.nickname,'Ayesha A');
    assert.equal(new Date(first.rows[0].result.created_at).toISOString(),'2026-09-30T11:00:00.000Z');
  } finally {await db.exec('RESET ROLE');}
  const saved=await db.query('SELECT count(*)::integer AS count FROM scores WHERE id=$1',[run.id]);
  assert.equal(saved.rows[0].count,1);
});

test('invalid names, tokens and scores cannot pass the new database functions',async()=>{
  await assert.rejects(claim('',tokenA),/Invalid name/);
  await assert.rejects(claim('Safe name','short'),/Invalid name/);
  const id=crypto.randomUUID();
  await assert.rejects(db.query('SELECT public.submit_named_score($1,$2::jsonb)',[tokenA,
    JSON.stringify({id,session_id:id,nickname:'Ayesha A',score:1000001,game_duration:60,created_at:new Date().toISOString()})]),/Invalid run/);
});

test('migration can be applied again without deleting history or changing ownership',async()=>{
  await db.exec(migration);
  assert.equal((await claim('Ayesha A',tokenA)).available,true);
  assert.equal((await claim('Ayesha A',tokenB)).available,false);
  const legacy=await db.query("SELECT score FROM scores WHERE session_id='legacy-run'");
  assert.equal(legacy.rows[0].score,100);
});
