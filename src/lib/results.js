import { validateSessionScore } from './scoreValidation.js';
import { submitScore, calculatePlayerRank } from './supabase.js';
import { readPreference, writePreference } from './storage.js';
const pendingResults = new WeakMap();

// Share one result task across effect replay. A failed save can be retried.
export function processResult(session, score) {
  if (pendingResults.has(session)) return pendingResults.get(session);
  const task = (async () => {
    const validation = validateSessionScore(session, score);
    if (!validation.isValid) throw new Error(validation.reason);
    if (!session.personalBestResult) {
      const previous = Number(readPreference('botblitz_personal_best', '0')) || 0;
      session.personalBestResult = {best: Math.max(previous, score), isRecord: score > previous};
      writePreference('botblitz_personal_best', Math.max(previous, score));
    }
    const saved = await submitScore({
      nickname: session.nickname, score: validation.validatedScore,
      sessionId: session.sessionId, gameDuration: validation.duration,
    });
    let rank = null;
    if (saved.sync !== 'local') {
      try { rank = await calculatePlayerRank(score); } catch { /* Score saved, rank temporarily unavailable. */ }
    }
    return {...saved, rank, ...session.personalBestResult};
  })();
  pendingResults.set(session, task);
  task.catch(() => pendingResults.delete(session));
  return task;
}
export function retryResult(session, score) {
  pendingResults.delete(session);
  return processResult(session, score);
}
