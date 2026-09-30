import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  fetchTopScores, 
  fetchKioskStats, 
  subscribeToLeaderboard,
  isSupabaseConfigured 
} from '../lib/supabase';
import LeaderboardRow from './LeaderboardRow';
import QRCodePanel from './QRCodePanel';
import HighScoreAlert from './HighScoreAlert';
import SoundToggle from './SoundToggle';
import { Trophy, Users, Gamepad2, Maximize, Minimize, RefreshCw, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [mode, setMode] = useState('today'); // 'today' | 'all'
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState({
    totalPlayersToday: 0,
    gamesPlayedToday: 0,
    highestScoreToday: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newScoreAlert, setNewScoreAlert] = useState(null);
  const [lastUpdatedScoreId, setLastUpdatedScoreId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Store scores ref to avoid stale closure during realtime updates
  const scoresRef = useRef(scores);
  useEffect(() => {
    scoresRef.current = scores;
  }, [scores]);

  // Load scores and stats
  const loadData = useCallback(async (currentMode = mode) => {
    try {
      const [topScores, kioskStats] = await Promise.all([
        fetchTopScores({ mode: currentMode, limit: 10 }),
        fetchKioskStats(),
      ]);
      setScores(topScores);
      setStats(kioskStats);
    } catch (err) {
      console.error('Failed to load leaderboard data', err);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadData(mode);
  }, [mode, loadData]);

  // Handle Realtime incoming score
  const handleIncomingScore = useCallback((newRecord) => {
    setLastUpdatedScoreId(newRecord.id);

    // Refresh data to keep stats and list exact
    loadData(mode);

    // Check if new score qualifies for Top 10 alert
    const currentTop = scoresRef.current;
    const existingIndex = currentTop.findIndex(s => s.score < newRecord.score);

    let rank = null;
    if (existingIndex !== -1) {
      rank = existingIndex + 1;
    } else if (currentTop.length < 10) {
      rank = currentTop.length + 1;
    }

    if (rank !== null && rank <= 10) {
      setNewScoreAlert({
        nickname: newRecord.nickname,
        score: newRecord.score,
        rank,
      });
    }

    // Reset highlight effect after 4s
    setTimeout(() => {
      setLastUpdatedScoreId(null);
    }, 4000);
  }, [mode, loadData]);

  // Supabase Realtime subscription
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(handleIncomingScore);
    return () => {
      unsubscribe();
    };
  }, [handleIncomingScore]);

  // Fullscreen TV toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="min-h-screen w-full bg-cyber-dark cyber-grid-bg text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8">
      {/* High Score Celebration Modal Alert */}
      <HighScoreAlert
        alertData={newScoreAlert}
        onClose={() => setNewScoreAlert(null)}
      />

      {/* ================= TOP BRANDING & TV HEADER ================= */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-neonCyan animate-ping" />
            <h3 className="text-xs sm:text-sm font-mono tracking-widest text-cyber-neonCyan font-bold uppercase">
              GAMING & ROBOTICS SOCIETY
            </h3>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyber-neonCyan">
            BOT BLITZ
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm sm:text-base font-display tracking-widest text-slate-300 font-bold uppercase">
              LIVE LEADERBOARD
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-cyber-neonGreen">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              {isSupabaseConfigured ? 'REALTIME SYNC' : 'OFFLINE MODE'}
            </span>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher: TODAY vs ALL TIME */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('today')}
              className={`px-4 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition ${
                mode === 'today'
                  ? 'bg-cyber-neonCyan text-slate-950 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              TODAY
            </button>
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition ${
                mode === 'all'
                  ? 'bg-cyber-neonCyan text-slate-950 shadow-neon-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL TIME
            </button>
          </div>

          <Link
            to="/play"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-display font-bold hover:border-cyber-neonGreen text-cyber-neonGreen transition"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>PLAY</span>
          </Link>

          {/* Fullscreen TV Kiosk Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-display font-bold text-slate-300 hover:text-white hover:border-cyber-neonCyan transition active:scale-95"
            title="Toggle TV Fullscreen Mode"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4" />
                <span className="hidden sm:inline">EXIT FULLSCREEN</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4" />
                <span className="hidden sm:inline">TV FULLSCREEN</span>
              </>
            )}
          </button>

          <SoundToggle />
        </div>
      </header>

      {/* ================= STATS BAR ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {/* Total Players Today */}
        <div className="p-4 rounded-2xl bg-cyber-card border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Total Players Today
            </span>
            <div className="text-3xl font-display font-black text-white mt-1">
              {stats.totalPlayersToday.toLocaleString()}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyber-neonCyan/30 flex items-center justify-center text-cyber-neonCyan">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Games Played Today */}
        <div className="p-4 rounded-2xl bg-cyber-card border border-slate-800 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Games Played Today
            </span>
            <div className="text-3xl font-display font-black text-cyber-neonGreen mt-1">
              {stats.gamesPlayedToday.toLocaleString()}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-cyber-neonGreen/30 flex items-center justify-center text-cyber-neonGreen">
            <Gamepad2 className="w-6 h-6" />
          </div>
        </div>

        {/* Highest Score Today */}
        <div className="p-4 rounded-2xl bg-cyber-card border border-amber-500/30 flex items-center justify-between shadow-neon-gold">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-300">
              Highest Score Today
            </span>
            <div className="text-3xl font-display font-black text-cyber-gold text-glow-gold mt-1">
              {stats.highestScoreToday.toLocaleString()}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-cyber-gold/40 flex items-center justify-center text-cyber-gold">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* ================= MAIN DUAL-PANEL GRID ================= */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): TOP 10 LEADERBOARD */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">
              TOP 10 PILOTS • {mode === 'today' ? "TODAY'S RANKINGS" : 'ALL TIME LEGENDS'}
            </span>
            <button
              type="button"
              onClick={() => loadData(mode)}
              className="text-slate-500 hover:text-cyber-neonCyan transition"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 font-mono text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyber-neonCyan" />
              Loading rankings...
            </div>
          ) : scores.length === 0 ? (
            <div className="p-8 rounded-2xl bg-cyber-card border border-slate-800 text-center">
              <p className="text-base font-display text-slate-300">No runs logged yet today!</p>
              <p className="text-xs font-mono text-cyber-neonCyan mt-1">
                Scan the QR code to be the first champion on the board!
              </p>
            </div>
          ) : (
            scores.map((entry, idx) => (
              <LeaderboardRow
                key={entry.id || idx}
                entry={entry}
                rank={idx + 1}
                isNew={entry.id === lastUpdatedScoreId}
              />
            ))
          )}
        </div>

        {/* Right Column (5 cols): QR CODE & HOW TO PLAY PANEL */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <QRCodePanel />
        </div>
      </main>

      {/* Kiosk Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-900 text-center text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Gaming & Robotics Society Freshers Week Kiosk</span>
        <span className="text-slate-600">Scores auto-refresh in realtime</span>
      </footer>
    </div>
  );
}
