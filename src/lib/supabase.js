/**
 * Supabase Client & Realtime Leaderboard Service for BOT BLITZ
 * Works with live Supabase credentials and provides a local fallback mode
 * so the game and TV leaderboard work immediately even before credentials are set up.
 */

import { createClient } from '@supabase/supabase-js';
import { createScoreSync } from './scoreSync.js';
import { getScoreTarget, persistScore, readScoreJob, writeScoreJob, listScoreJobs } from './scoreOutbox.js';
import { uploadQueuedScore } from './scoreUpload.js';
import { preparePlayerName, nameKey } from './playerNames.js';
import { bestScoresByName, fetchBestScores, kioskStats } from './leaderboardData.js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  !SUPABASE_URL.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Local fallback storage key for offline or pre-configured kiosk testing
const LOCAL_STORAGE_KEY = 'botblitz_local_scores_v1';

// Seed mock scores for immediate kiosk display if no scores exist yet
const INITIAL_DEMO_SCORES = [
  { id: '1', nickname: 'ZAIN_BOT', score: 18420, created_at: new Date(Date.now() - 3600000 * 2).toISOString(), session_id: 'seed-1', game_duration: 60 },
  { id: '2', nickname: 'SARA_99', score: 17850, created_at: new Date(Date.now() - 3600000 * 3).toISOString(), session_id: 'seed-2', game_duration: 60 },
  { id: '3', nickname: 'AHMED_ROBO', score: 16900, created_at: new Date(Date.now() - 3600000 * 4).toISOString(), session_id: 'seed-3', game_duration: 60 },
  { id: '4', nickname: 'HAMZA_X', score: 15770, created_at: new Date(Date.now() - 3600000 * 5).toISOString(), session_id: 'seed-4', game_duration: 60 },
  { id: '5', nickname: 'CYBER_VIPER', score: 14320, created_at: new Date(Date.now() - 3600000 * 6).toISOString(), session_id: 'seed-5', game_duration: 60 },
  { id: '6', nickname: 'ROBO_KNIGHT', score: 13100, created_at: new Date(Date.now() - 3600000 * 7).toISOString(), session_id: 'seed-6', game_duration: 60 },
  { id: '7', nickname: 'NOVA_CORE', score: 12450, created_at: new Date(Date.now() - 3600000 * 8).toISOString(), session_id: 'seed-7', game_duration: 60 },
  { id: '8', nickname: 'VOLT_RUNNER', score: 11200, created_at: new Date(Date.now() - 3600000 * 9).toISOString(), session_id: 'seed-8', game_duration: 60 },
  { id: '9', nickname: 'MECHA_PILOT', score: 9800, created_at: new Date(Date.now() - 3600000 * 10).toISOString(), session_id: 'seed-9', game_duration: 60 },
  { id: '10', nickname: 'BYTE_SURFER', score: 8500, created_at: new Date(Date.now() - 3600000 * 11).toISOString(), session_id: 'seed-10', game_duration: 60 },
];

function getLocalScores() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_SCORES));
      return INITIAL_DEMO_SCORES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(row => typeof row.nickname === 'string' && Number.isFinite(row.score) && row.created_at) : INITIAL_DEMO_SCORES;
  } catch {
    return INITIAL_DEMO_SCORES;
  }
}

function saveLocalScores(scores) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
}

// Custom event emitter for same-window / cross-tab local realtime sync
const localRealtimeListeners = new Set();

function notifyLocalRealtime(newRecord) {
  localRealtimeListeners.forEach(listener => {
    try {
      listener(newRecord);
    } catch (e) {
      console.error('Error in local realtime listener', e);
    }
  });

  // Other tabs receive the native storage event from saveLocalScores.
}

/**
 * Returns beginning of today in ISO string
 */
function getStartOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Fetch Top Scores
 * @param {object} options
 * @param {'today' | 'all'} options.mode
 * @param {number} options.limit
 */
export async function fetchTopScores({ mode = 'today', limit = 10 } = {}) {
  const startOfToday = getStartOfTodayISO();

  if (isSupabaseConfigured && supabase) {
    try {
      return await fetchBestScores(supabase, {since:mode === 'today' ? startOfToday : undefined, limit});
    } catch (err) {
      throw new Error('Leaderboard unavailable. Please try again.', { cause: err });
    }
  }

  // Fallback to local store
  const allScores = getLocalScores();
  let filtered = allScores;

  if (mode === 'today') {
    const todayTimestamp = new Date(startOfToday).getTime();
    filtered = allScores.filter(s => new Date(s.created_at).getTime() >= todayTimestamp);
  }

  return bestScoresByName(filtered, limit);
}

/**
 * Fetch Aggregated Kiosk Stats (Total Players Today, Games Played Today, Highest Score Today)
 */
export async function fetchKioskStats() {
  const startOfToday = getStartOfTodayISO();

  if (isSupabaseConfigured && supabase) {
    try {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const {data, error} = await supabase.from('scores').select('id, nickname, score, created_at')
          .gte('created_at',startOfToday).order('id',{ascending:true}).range(offset,offset + 499);
        if (error) throw error;
        rows.push(...(data || []));
        if ((data || []).length < 500) return kioskStats(rows);
      }
    } catch (err) {
      throw new Error('Leaderboard stats unavailable.', { cause: err });
    }
  }

  // Local fallback
  const scores = getLocalScores();
  const todayTimestamp = new Date(startOfToday).getTime();
  const todayScores = scores.filter(s => new Date(s.created_at).getTime() >= todayTimestamp);

  return kioskStats(todayScores);
}

export async function checkPlayerName(nickname) {
  return preparePlayerName(nickname, {connected:!supabase || navigator.onLine !== false, claim:async candidate => {
    const own = candidate.previous?.confirmed;
    if (!supabase) return {available:own || candidate.legacyOwner || !getLocalScores().some(row => nameKey(row.nickname) === nameKey(nickname)), nickname};
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const legacy = listScoreJobs().find(job => job.state === 'synced' && nameKey(job.payload.nickname) === nameKey(nickname));
      const claim = await supabase.rpc('claim_player_name', {p_nickname:nickname, p_token:candidate.token,
        p_legacy_session_id:legacy?.payload.session_id || null}).abortSignal(controller.signal);
      if (!claim.error) return {...claim.data, reserved:true};
      // Existing installations can check names against run history until the
      // reservation migration is applied. Never fall back on network failures.
      if (claim.error.code !== 'PGRST202') throw claim.error;
      if (own || candidate.legacyOwner) return {available:true, nickname};
      const escaped = nickname.replace(/[\\%_]/g, char => '\\' + char);
      const {data, error} = await supabase.from('scores').select('nickname').ilike('nickname',escaped)
        .limit(1).abortSignal(controller.signal);
      if (error) throw error;
      return {available:!data?.length, nickname};
    } catch {
      throw new Error('Could not check your name. Check your connection and try again.');
    } finally {clearTimeout(timer);}
  }});
}

/**
 * Submit verified score to the database
 */
function saveDemoScore(payload) {
  const existing = getLocalScores();
  const previous = existing.find(row => row.session_id === payload.session_id);
  if (previous) return previous;
  const localRecord = {
    ...payload,
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };
  saveLocalScores([localRecord, ...existing]);
  notifyLocalRealtime(localRecord);
  return localRecord;
}
let scoreSync;
export function startScoreSync() {
  if (!scoreSync) {
    scoreSync = createScoreSync({storage:localStorage, target:getScoreTarget(),
      upload:(payload, options) => supabase ? uploadQueuedScore(supabase, payload, options) : saveDemoScore(payload),
      online:() => !supabase || navigator.onLine !== false});
    scoreSync.subscribe(job => {
      if (!supabase || job.state !== 'synced') return;
      try {
        const old = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        if (old.some(row => row.session_id === job.payload.session_id)) saveLocalScores(old.filter(row => row.session_id !== job.payload.session_id));
      } catch { /* A confirmed legacy score can safely be checked again. */ }
    });
    // Adopt device-only saves from the previous deployed version, never seeds.
    if (supabase) {
      try {
        const old = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        for (const row of old) if (row.id?.startsWith('local_') && row.session_id &&
          Number.isSafeInteger(row.score) && row.score >= 0 && row.score <= 60000 && row.nickname?.length <= 16) {
          persistScore({nickname:row.nickname, score:row.score, session_id:row.session_id,
            game_duration:row.game_duration ?? 60, created_at:row.created_at});
        }
      } catch { /* Keep old records intact if migration cannot persist them. */ }
    }
  }
  scoreSync.start();
  return scoreSync;
}
export function scoreJobResult(job) {
  return {success:true, sync:job.state === 'synced' ? (supabase ? 'live' : 'demo') : 'queued',
    state:job.state, error:job.error, record:job.record || job.payload};
}
export async function submitScore({nickname, score, sessionId, gameDuration = 60}) {
  const payload = {nickname, score, session_id:sessionId, game_duration:gameDuration, created_at:new Date().toISOString()};
  if (!supabase) {
    const job = persistScore(payload);
    const record = saveDemoScore(job.payload);
    const confirmed = {...job, state:'synced', record, syncedAt:Date.now()};
    writeScoreJob(confirmed);
    return scoreJobResult(confirmed);
  }
  return scoreJobResult(startScoreSync().enqueue(payload));
}
export function subscribeToScoreSync(sessionId, listener) {
  const sync = startScoreSync();
  const unsubscribe = sync.subscribe(job => {if (job.payload.session_id === sessionId) listener(scoreJobResult(job));});
  const current = readScoreJob(sessionId);
  if (current) listener(scoreJobResult(current));
  return unsubscribe;
}
export function retryQueuedScores(sessionId) {
  return startScoreSync().retry(sessionId);
}

/**
 * Calculates a player's rank based on their score
 */
export async function calculatePlayerRank(score, todayOnly = true, nickname) {
  if (supabase) {
    const higher = await fetchBestScores(supabase, {since:todayOnly ? getStartOfTodayISO() : undefined,
      limit:Infinity, higherThan:score});
    const ownBest = nickname ? higher.find(row => nameKey(row.nickname) === nameKey(nickname))?.score || score : score;
    return higher.filter(row => row.score > ownBest && (!nickname || nameKey(row.nickname) !== nameKey(nickname))).length + 1;
  }
  const scores = await fetchTopScores({ mode: todayOnly ? 'today' : 'all', limit: Number.MAX_SAFE_INTEGER });
  const ownBest = nickname ? scores.find(row => nameKey(row.nickname) === nameKey(nickname))?.score || score : score;
  const higherScores = scores.filter(s => s.score > ownBest && (!nickname || nameKey(s.nickname) !== nameKey(nickname)));
  return higherScores.length + 1;
}

/**
 * Subscribes to realtime score updates for TV leaderboard
 * @param {(newRecord: object) => void} onNewScore
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToLeaderboard(onNewScore, onStatus = () => {}) {
  let supabaseChannel = null;

  if (isSupabaseConfigured && supabase) {
    try {
      supabaseChannel = supabase
        .channel('public:scores')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'scores' },
          (payload) => {
            if (payload && payload.new) {
              onNewScore(payload.new);
            }
          }
        )
        .subscribe(status => onStatus(status === 'SUBSCRIBED' ? 'live' : 'reconnecting'));
    } catch {
      onStatus('reconnecting');
    }
  }

  // Local-only records must never be announced as a live kiosk score.
  if (!supabase) localRealtimeListeners.add(onNewScore);

  const storageHandler = (e) => {
    if (supabase || e.key !== LOCAL_STORAGE_KEY || !e.newValue) return;
    try {
      const before = new Set(JSON.parse(e.oldValue || '[]').map(row => row.session_id));
      const added = JSON.parse(e.newValue).filter(row => !before.has(row.session_id));
      for (const row of added) onNewScore(row);
    } catch { /* Ignore malformed data from other tabs. */ }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
    localRealtimeListeners.delete(onNewScore);
    window.removeEventListener('storage', storageHandler);
  };
}
