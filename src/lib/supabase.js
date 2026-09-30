/**
 * Supabase Client & Realtime Leaderboard Service for BOT BLITZ
 * Works with live Supabase credentials and provides a local fallback mode
 * so the game and TV leaderboard work immediately even before credentials are set up.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_SCORES;
  }
}

function saveLocalScores(scores) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
  } catch (err) {
    console.error('Failed to save local scores', err);
  }
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

  // Cross-tab broadcast via storage event
  try {
    window.dispatchEvent(new CustomEvent('botblitz_new_score', { detail: newRecord }));
  } catch {}
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
      let query = supabase
        .from('scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(limit);

      if (mode === 'today') {
        query = query.gte('created_at', startOfToday);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local scores:', err.message);
    }
  }

  // Fallback to local store
  const allScores = getLocalScores();
  let filtered = allScores;

  if (mode === 'today') {
    const todayTimestamp = new Date(startOfToday).getTime();
    filtered = allScores.filter(s => new Date(s.created_at).getTime() >= todayTimestamp);
  }

  return [...filtered]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fetch Aggregated Kiosk Stats (Total Players Today, Games Played Today, Highest Score Today)
 */
export async function fetchKioskStats() {
  const startOfToday = getStartOfTodayISO();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('nickname, score, created_at')
        .gte('created_at', startOfToday);

      if (!error && data) {
        const uniqueNicknames = new Set(data.map(d => d.nickname.trim().toLowerCase())).size;
        const highestScore = data.reduce((max, d) => Math.max(max, d.score || 0), 0);
        return {
          totalPlayersToday: uniqueNicknames,
          gamesPlayedToday: data.length,
          highestScoreToday: highestScore,
        };
      }
    } catch (err) {
      console.warn('Supabase stats fetch error, falling back to local stats:', err);
    }
  }

  // Local fallback
  const scores = getLocalScores();
  const todayTimestamp = new Date(startOfToday).getTime();
  const todayScores = scores.filter(s => new Date(s.created_at).getTime() >= todayTimestamp);

  const uniqueNicknames = new Set(todayScores.map(d => d.nickname.trim().toLowerCase())).size;
  const highestScore = todayScores.reduce((max, d) => Math.max(max, d.score || 0), 0);

  return {
    totalPlayersToday: uniqueNicknames || todayScores.length,
    gamesPlayedToday: todayScores.length,
    highestScoreToday: highestScore,
  };
}

/**
 * Submit verified score to the database
 */
export async function submitScore({ nickname, score, sessionId, gameDuration = 60 }) {
  const payload = {
    nickname,
    score,
    session_id: sessionId,
    game_duration: gameDuration,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('scores')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, record: data };
    } catch (err) {
      console.warn('Supabase insert failed, saving to local store:', err.message);
    }
  }

  // Local storage save
  const existing = getLocalScores();
  const localRecord = {
    ...payload,
    id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };

  const updated = [localRecord, ...existing];
  saveLocalScores(updated);
  notifyLocalRealtime(localRecord);

  return { success: true, record: localRecord };
}

/**
 * Calculates a player's rank based on their score
 */
export async function calculatePlayerRank(score, todayOnly = true) {
  const scores = await fetchTopScores({ mode: todayOnly ? 'today' : 'all', limit: 100 });
  const higherScores = scores.filter(s => s.score > score);
  return higherScores.length + 1;
}

/**
 * Subscribes to realtime score updates for TV leaderboard
 * @param {(newRecord: object) => void} onNewScore
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToLeaderboard(onNewScore) {
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
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription failed, using local polling/events:', err);
    }
  }

  // Always register local listener as well (handles local games and fallback)
  localRealtimeListeners.add(onNewScore);

  const storageHandler = (e) => {
    if (e.detail) {
      onNewScore(e.detail);
    }
  };
  window.addEventListener('botblitz_new_score', storageHandler);

  return () => {
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
    localRealtimeListeners.delete(onNewScore);
    window.removeEventListener('botblitz_new_score', storageHandler);
  };
}
