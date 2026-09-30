import { validateSessionScore } from './scoreValidation.js';
import { recordPlayerBest } from './playerBests.js';
import { persistCompletedScore, scoreJobStatus } from './scoreOutbox.js';
const pendingResults = new WeakMap();

// Share one result task across effect replay. A failed save can be retried.
export function processResult(session, score) {
  if (pendingResults.has(session)) return pendingResults.get(session);
  const task = (async () => {
    const validation = validateSessionScore(session, score);
    if (!validation.isValid) throw new Error(validation.reason);
    if (!session.personalBestResult) {
      session.personalBestResult = recordPlayerBest(session.nickname,score,session.sessionId);
    }
    const job = persistCompletedScore(session, score);
    let saved = scoreJobStatus(job);
    // The local confirmation is available without downloading a network client.
    if (job.target === 'demo') {
      try {
        const service = await import('./supabase.js');
        saved = await service.submitScore({nickname:session.nickname, score, sessionId:session.sessionId, gameDuration:validation.duration});
      } catch { /* The durable demo run can be completed on the next visit. */ }
    }
    let rank = null;
    if (saved.sync === 'live' || saved.sync === 'demo') {
      try {const service = await import('./supabase.js'); rank = await service.calculatePlayerRank(score,true,session.nickname);} catch { /* Score saved, rank temporarily unavailable. */ }
    }
    return {...saved, rank, ...session.personalBestResult};
  })();
  pendingResults.set(session, task);
  task.catch(() => pendingResults.delete(session));
  return task;
}
export async function retryResult(session, score) {
  const service = await import('./supabase.js');
  await service.retryQueuedScores(session.sessionId);
  pendingResults.delete(session);
  return processResult(session, score);
}
