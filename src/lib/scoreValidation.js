/** Client consistency checks. Competitive anti-cheat requires a trusted server. */
export function createGameSession(nickname) {
  return {
    sessionId: crypto.randomUUID(), nickname, startTime: null, endTime: null,
    events: [], hits: 0, collected: 0, bestCombo: 1, accumulatedScore: 0,
    isCompleted: false, endReason: null,
  };
}
export function recordCollection(session, itemType, points, combo = 1, isDouble = false) {
  if (!session || session.isCompleted) return;
  const effectivePoints = Math.round(points * combo * (isDouble ? 2 : 1));
  session.accumulatedScore += effectivePoints;
  session.collected += 1;
  session.bestCombo = Math.max(session.bestCombo, Math.min(5, combo + 1));
  session.events.push({ t: Date.now() - session.startTime, type: itemType, pts: effectivePoints, combo });
}
export function recordHazardHit(session, penalty = 150) {
  if (!session || session.isCompleted) return;
  session.hits += 1;
  session.accumulatedScore = Math.max(0, session.accumulatedScore - penalty);
  session.events.push({ t: Date.now() - session.startTime, type: 'HAZARD_HIT', penalty });
}
// Pure and repeat-safe: effect replay and retries must not consume a run.
export function validateSessionScore(session, reportedScore) {
  const invalid = reason => ({ isValid: false, reason, validatedScore: 0, duration: 0 });
  if (!session?.sessionId || !session.isCompleted || !Number.isFinite(session.startTime) || !Number.isFinite(session.endTime)) {
    return invalid('This run did not finish correctly.');
  }
  const duration = (session.endTime - session.startTime) / 1000;
  const livesLost = session.endReason === 'LIVES' && session.hits === 3 &&
    session.events.filter(event => event.type === 'HAZARD_HIT').length === 3;
  const timerFinished = session.endReason === 'TIME' && duration >= 59.5;
  if (duration < 0 || (!livesLost && !timerFinished)) return invalid('The run ended before the timer or the third hit.');
  if (!Number.isSafeInteger(reportedScore) || reportedScore < 0 || reportedScore > 60000 || reportedScore !== session.accumulatedScore) {
    return invalid('The score does not match the run.');
  }
  return { isValid: true, validatedScore: reportedScore, duration: Math.min(60, Math.round(duration)) };
}
