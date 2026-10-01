import { listScoreJobs, persistScore, readScoreJob, writeScoreJob, scoreKey, OUTBOX_PREFIX, SYNC_EVENT } from './scoreOutbox.js';
import {MAX_SCORE, LEGACY_SCORE_LIMIT} from './scoreLimits.js';

export function createScoreSync({storage, target, upload, events = window, visibility = document,
  online = () => navigator.onLine !== false, locks = navigator.locks,
  now = Date.now, schedule = setTimeout, cancel = clearTimeout, random = Math.random, timeoutMs = 8000}) {
  const listeners = new Set();
  let running = null, timer = null, started = false, disposed = false;
  function emit(job) { for (const listener of listeners) {try {listener(job);} catch { /* UI cannot interrupt a save. */ }} }
  function save(job) {
    try { writeScoreJob(job, storage); } catch { /* Original pending run remains available for retry. */ }
    emit(job);
  }
  function jobs() { try { return listScoreJobs(storage, target); } catch { return []; } }
  function plan() {
    cancel(timer); timer = null;
    if (disposed || !online()) return;
    const pending = jobs().filter(job => job.state === 'pending');
    if (!pending.length) return;
    const delay = Math.max(500, Math.min(...pending.map(job => job.retryAt || 0)) - now());
    timer = schedule(() => { timer = null; void flush(); }, delay);
  }
  async function send(job) {
    const controller = new AbortController();
    let requestTimer;
    emit({...job, state:'syncing'});
    try {
      const timeout = new Promise((_, reject) => {
        requestTimer = schedule(() => { controller.abort(); reject(new Error('Upload timed out.')); }, timeoutMs);
      });
      const record = await Promise.race([upload(job.payload, {signal:controller.signal}), timeout]);
      save({...job, state:'synced', record, error:null, syncedAt:now(), retryAt:0});
    } catch (error) {
      // Another tab may have confirmed this same run while our request failed.
      const current = readScoreJob(job.payload.session_id, storage, target);
      if (current?.state === 'synced') { emit(current); return; }
      const oldScoreLimit = job.payload.score > LEGACY_SCORE_LIMIT && job.payload.score <= MAX_SCORE &&
        ((!job.payload.name_token && error.code === '42501') || error.code === '22023');
      const blocked = !oldScoreLimit && ((error.status >= 400 && error.status < 500 && ![408,429].includes(error.status)) ||
        ['42501','23514','22P02'].includes(error.code));
      const attempts = job.attempts + 1;
      const delay = Math.min(60000, 2000 * 2 ** Math.min(attempts - 1, 5)) * (1 + random() * .2);
      save({...job, state:blocked ? 'blocked' : 'pending', attempts,
        retryAt:now() + delay, error:oldScoreLimit ? 'Your score is saved on this device. The leaderboard needs its score limit updated.' :
          blocked ? 'The leaderboard rejected this upload. Your score is still on this device.' : null});
    } finally { cancel(requestTimer); }
  }
  async function drain(force) {
    for (const job of jobs()) {
      if (disposed || !online()) break;
      const current = readScoreJob(job.payload.session_id, storage, target);
      if (current?.state === 'pending' && (force || current.retryAt <= now())) await send(current);
    }
    // Keep pending runs indefinitely. Only prune confirmed receipts after a week.
    for (const job of jobs()) if (job.state === 'synced' && now() - job.syncedAt > 7 * 86400000) {
      try { storage.removeItem(scoreKey(target, job.payload.session_id)); } catch { /* Safe to retain. */ }
    }
  }
  function flush(force = false) {
    if (disposed || !online()) { plan(); return Promise.resolve(); }
    if (running) return running;
    cancel(timer); timer = null;
    // Web Locks serialize tabs. The stable database primary key also protects
    // browsers without this API and requests whose responses were lost.
    running = Promise.resolve().then(() => locks?.request ?
      locks.request('botblitz-score-sync:' + target, {ifAvailable:true}, lock => lock ? drain(force) : undefined) : drain(force))
      .catch(() => { /* Retain the queue if storage or Web Locks is unavailable. */ })
      .finally(() => {running = null; plan();});
    return running;
  }
  const wake = () => {void flush(true);};
  const onQueueChange = () => {void flush();};
  const onVisibility = () => {if (visibility.visibilityState !== 'hidden') wake();};
  const onStorage = event => {
    if (!event.key?.startsWith(OUTBOX_PREFIX)) return;
    try {const job = JSON.parse(event.newValue || 'null'); if (job?.target === target) emit(job);} catch { /* Invalid entry. */ }
    void flush();
  };
  function start() {
    disposed = false;
    const firstStart = !started;
    if (!started) {
      started = true; events.addEventListener('online', wake); events.addEventListener('pageshow', wake);
      events.addEventListener(SYNC_EVENT, onQueueChange);
      events.addEventListener('storage', onStorage); visibility.addEventListener('visibilitychange', onVisibility);
    }
    void flush(firstStart);
  }
  function enqueue(payload) {
    const job = persistScore(payload, storage, target);
    start(); emit(job); void flush();
    return job;
  }
  function retry(sessionId) {
    for (const job of jobs()) if ((!sessionId || job.payload.session_id === sessionId) && job.state !== 'synced') {
      save({...job, state:'pending', retryAt:0, error:null});
    }
    return flush(true);
  }
  function stop() {
    disposed = true; started = false; cancel(timer);
    events.removeEventListener('online', wake); events.removeEventListener('pageshow', wake);
    events.removeEventListener(SYNC_EVENT, onQueueChange);
    events.removeEventListener('storage', onStorage); visibility.removeEventListener('visibilitychange', onVisibility);
  }
  return {start, enqueue, retry, flush, stop, subscribe:listener => {listeners.add(listener); return () => listeners.delete(listener);}};
}
