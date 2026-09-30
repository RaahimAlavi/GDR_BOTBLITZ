import { validateSessionScore } from './scoreValidation.js';

export const OUTBOX_PREFIX = 'botblitz_outbox_v1:';
export const SYNC_EVENT = 'botblitz:score-sync';
export function getScoreTarget() {
  const url = import.meta.env?.VITE_SUPABASE_URL;
  return url && import.meta.env?.VITE_SUPABASE_ANON_KEY && !url.includes('placeholder') &&
    url !== 'https://your-project-id.supabase.co' ? url : 'demo';
}
export function scoreKey(target, sessionId) { return OUTBOX_PREFIX + encodeURIComponent(target) + ':' + sessionId; }
export function readScoreJob(sessionId, storage, target = getScoreTarget()) {
  try { return JSON.parse((storage || localStorage).getItem(scoreKey(target, sessionId)) || 'null'); } catch { return null; }
}
export function listScoreJobs(storage = localStorage, target = getScoreTarget()) {
  const jobs = [];
  const prefix = OUTBOX_PREFIX + encodeURIComponent(target) + ':';
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const job = JSON.parse(storage.getItem(key));
      if (job?.payload?.session_id && job.target === target) jobs.push(job);
    } catch { /* An unrelated corrupt entry must not prevent other uploads. */ }
  }
  return jobs;
}
export function pendingScoreCount() {
  try { return listScoreJobs().filter(job => job.state !== 'synced').length; } catch { return 0; }
}
export function announceScoreChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SYNC_EVENT));
}
export function writeScoreJob(job, storage = localStorage) {
  // One key per run avoids lost updates when two tabs finish different runs.
  storage.setItem(scoreKey(job.target, job.payload.session_id), JSON.stringify(job));
  announceScoreChange();
}
export function persistScore(payload, storage = localStorage, target = getScoreTarget()) {
  const existing = readScoreJob(payload.session_id, storage, target);
  if (existing) return existing;
  const job = {target, payload, state:'pending', attempts:0, retryAt:0, error:null};
  try { writeScoreJob(job, storage); }
  catch { throw new Error('This device could not save your score. Keep this page open and retry.'); }
  return job;
}
export function persistCompletedScore(session, score) {
  const validation = validateSessionScore(session, score);
  if (!validation.isValid) throw new Error(validation.reason);
  return persistScore({nickname:session.nickname, ...(session.nameToken ? {name_token:session.nameToken} : {}), score, session_id:session.sessionId,
    game_duration:validation.duration, created_at:new Date(session.endTime).toISOString()});
}
export function scoreJobStatus(job) {
  if (!job) return null;
  return {success:true, sync:job.state === 'synced' ? (job.target === 'demo' ? 'demo' : 'live') : 'queued',
    state:job.state, error:job.error, record:job.record || job.payload};
}
