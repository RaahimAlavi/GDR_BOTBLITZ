import {nameKey} from './playerNames.js';
import {getScoreTarget, listScoreJobs} from './scoreOutbox.js';
import {readPreference, writePreference} from './storage.js';
const key = nickname => 'botblitz_personal_best_v2:' + encodeURIComponent(getScoreTarget()) + ':' + nameKey(nickname);
export function readPlayerBest(nickname, excludeSessionId) {
  let best = Number(readPreference(key(nickname),'0')) || 0;
  try {
    for (const job of listScoreJobs()) if (job.payload.session_id !== excludeSessionId && nameKey(job.payload.nickname) === nameKey(nickname)) best = Math.max(best,job.payload.score);
  } catch { /* Preferences remain optional when storage is unavailable. */ }
  return best;
}
export function recordPlayerBest(nickname,score,sessionId) {
  const previous = readPlayerBest(nickname,sessionId);
  const best = Math.max(previous,score);
  writePreference(key(nickname),best);
  return {best,isRecord:score > previous};
}
