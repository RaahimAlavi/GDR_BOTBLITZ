import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {MAX_SCORE,LEGACY_SCORE_LIMIT} from '../src/lib/scoreLimits.js';
const db=new PGlite();
const migration=await readFile(new URL('../supabase-score-limit.sql',import.meta.url),'utf8');
const names=await readFile(new URL('../supabase-name-reservations.sql',import.meta.url),'utf8');
const token='a'.repeat(64);
before(async()=>{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;
    CREATE TABLE public.scores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nickname varchar(16) NOT NULL,
      score integer NOT NULL,session_id text NOT NULL,game_duration integer DEFAULT 60,
      created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT ON scores TO anon;
    CREATE POLICY "read scores" ON scores FOR SELECT USING(true);
    CREATE POLICY "Allow anonymous score inserts" ON scores FOR INSERT WITH CHECK(
      score>=0 AND score<=${LEGACY_SCORE_LIMIT} AND length(nickname) BETWEEN 1 AND 16);
    INSERT INTO scores(nickname,score,session_id) VALUES('Existing',1500,'existing-run');`);
});
after(()=>db.close());
const insert=(name,score)=>db.query('INSERT INTO scores(nickname,score,session_id) VALUES($1,$2,$3) RETURNING *',[name,score,crypto.randomUUID()]);

test('the score migration fixes the real anonymous insert policy without installing names or deleting scores',async()=>{
  await db.exec('SET ROLE anon');
  try {await assert.rejects(insert('First player',90000),/row-level security/);}
  finally {await db.exec('RESET ROLE');}
  await db.exec(migration);
  await db.exec('SET ROLE anon');
  try {
    const saved=await insert('First player',90000);
    assert.equal(saved.rows[0].score,90000);
    await assert.rejects(insert('Too high',MAX_SCORE+1),/row-level security/);
    await assert.rejects(insert('Negative',-1),/row-level security/);
  }finally {await db.exec('RESET ROLE');}
  const existing=await db.query("SELECT score FROM scores WHERE session_id='existing-run'");
  assert.equal(existing.rows[0].score,1500);
});

test('the migration upgrades an existing old named upload function and keeps its ownership checks',async()=>{
  await db.exec(names.replace('run_score NOT BETWEEN 0 AND 1000000','run_score NOT BETWEEN 0 AND 60000'));
  await db.query('SELECT claim_player_name($1,$2,NULL)',['High named run',token]);
  const id=crypto.randomUUID();
  const run={id,session_id:id,nickname:'High named run',score:90000,game_duration:60,created_at:'2026-10-01T10:00:00Z'};
  const submit=value=>db.query('SELECT submit_named_score($1,$2::jsonb) AS result',[value,JSON.stringify(run)]);
  await assert.rejects(submit(token),/Invalid run/);
  await db.exec(migration);
  await db.exec('SET ROLE anon');
  try {
    const saved=await submit(token);assert.equal(saved.rows[0].result.score,90000);
    await assert.rejects(submit('b'.repeat(64)),/belongs to another player/);
  }finally {await db.exec('RESET ROLE');}
  await db.exec(migration);
  const existing=await db.query("SELECT count(*)::int AS count FROM scores WHERE id=$1",[id]);
  assert.equal(existing.rows[0].count,1);
});
