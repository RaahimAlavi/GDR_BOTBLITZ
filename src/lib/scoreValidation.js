/**
 * Anti-Cheat and Session Verification Engine for BOT BLITZ
 * Protects the kiosk leaderboard from blatant manipulation, script injections, and speed-hacks
 */

// Memory store of processed sessions to prevent replay attacks
const processedSessions = new Set();
let lastSubmissionTimestamp = 0;

/**
 * Creates a cryptographically sound game session
 * @param {string} nickname 
 * @returns {object} Session descriptor
 */
export function createGameSession(nickname) {
  const rand = Math.random().toString(36).substring(2, 10);
  const now = Date.now();
  const sessionId = `bb_${now}_${rand}`;

  return {
    sessionId,
    nickname,
    startTime: now,
    endTime: null,
    events: [],
    hits: 0,
    accumulatedScore: 0,
    isCompleted: false,
  };
}

/**
 * Logs a verified item collection event into the session tracker
 */
export function recordCollection(session, itemType, points, combo = 1, isDouble = false) {
  if (!session || session.isCompleted) return;

  const now = Date.now();
  const effectivePoints = Math.round(points * combo * (isDouble ? 2 : 1));
  session.accumulatedScore += effectivePoints;

  session.events.push({
    t: now - session.startTime,
    type: itemType,
    pts: effectivePoints,
    combo,
  });
}

/**
 * Logs a hazard collision event
 */
export function recordHazardHit(session, penalty = 150) {
  if (!session || session.isCompleted) return;

  session.hits += 1;
  session.accumulatedScore = Math.max(0, session.accumulatedScore - penalty);

  session.events.push({
    t: Date.now() - session.startTime,
    type: 'HAZARD_HIT',
    penalty,
  });
}

/**
 * Validates the session integrity before allowing leaderboard submission
 * 
 * @param {object} session 
 * @param {number} reportedScore 
 * @returns {{ isValid: boolean, reason?: string, validatedScore: number, duration: number }}
 */
export function validateSessionScore(session, reportedScore) {
  if (!session || !session.sessionId) {
    return { isValid: false, reason: 'Invalid or missing session token', validatedScore: 0, duration: 0 };
  }

  // 1. Prevent Replay Attack
  if (processedSessions.has(session.sessionId)) {
    return { isValid: false, reason: 'Session has already been submitted', validatedScore: 0, duration: 0 };
  }

  const now = Date.now();
  session.endTime = now;
  session.isCompleted = true;

  const durationSec = Math.round((session.endTime - session.startTime) / 1000);

  // 2. Reject games finishing significantly faster than 60 seconds (allow 53s minimum for slow timers/devices)
  if (durationSec < 53) {
    return { 
      isValid: false, 
      reason: `Game duration (${durationSec}s) was too short. Must survive full 60 seconds.`, 
      validatedScore: 0, 
      duration: durationSec 
    };
  }

  // 3. Client device rate limit: at least 45 seconds between submissions
  if (now - lastSubmissionTimestamp < 45000 && lastSubmissionTimestamp !== 0) {
    return { 
      isValid: false, 
      reason: 'Rate limit exceeded: Please wait before submitting another score.', 
      validatedScore: 0, 
      duration: durationSec 
    };
  }

  // 4. Verify accumulated score against reported score (tolerating tiny rounding margin)
  const scoreDelta = Math.abs(session.accumulatedScore - reportedScore);
  if (scoreDelta > 100) {
    return { 
      isValid: false, 
      reason: 'Score discrepancy detected during session validation.', 
      validatedScore: 0, 
      duration: durationSec 
    };
  }

  // 5. Hard ceiling: in 60s, absolute theoretical maximum score is ~55,000 points
  if (reportedScore > 55000) {
    return { 
      isValid: false, 
      reason: 'Score exceeds physical limits of the arena.', 
      validatedScore: 0, 
      duration: durationSec 
    };
  }

  // Mark session as used and update rate-limit timestamp
  processedSessions.add(session.sessionId);
  lastSubmissionTimestamp = now;

  return {
    isValid: true,
    validatedScore: Math.max(0, session.accumulatedScore),
    duration: Math.min(60, durationSec),
  };
}
