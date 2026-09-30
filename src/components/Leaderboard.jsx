import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Gamepad2, Maximize, Trophy, Users, RefreshCw } from 'lucide-react';
import { fetchTopScores, fetchKioskStats, subscribeToLeaderboard, isSupabaseConfigured } from '../lib/supabase';
import Brand from './Brand';
import SoundToggle from './SoundToggle';
import LeaderboardRow from './LeaderboardRow';
import QRCodePanel from './QRCodePanel';
import HighScoreAlert from './HighScoreAlert';

export default function Leaderboard() {
  const [mode, setMode] = useState('today');
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState({totalPlayersToday:0, gamesPlayedToday:0, highestScoreToday:0});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState(isSupabaseConfigured ? 'connecting' : 'demo');
  const [alert, setAlert] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const requestId = useRef(0);
  const scoresRef = useRef([]);
  const highlightTimer = useRef(null);
  const closeAlert = useCallback(() => setAlert(null), []);
  const loadData = useCallback(async (signal) => {
    const request = ++requestId.current;
    try {
      const [rows, totals] = await Promise.all([fetchTopScores({mode}), fetchKioskStats()]);
      if (request !== requestId.current || signal?.aborted) return;
      scoresRef.current = rows; setScores(rows); setStats(totals); setError('');
    } catch {
      if (request === requestId.current && !signal?.aborted) setError('Connection interrupted. Showing the last rankings we received.');
    } finally {
      if (request === requestId.current && !signal?.aborted) setLoading(false);
    }
  }, [mode]);
  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => void loadData(controller.signal), 0);
    const timer = setInterval(() => void loadData(controller.signal), 30000);
    return () => {controller.abort(); clearTimeout(initial); clearInterval(timer);};
  }, [loadData]);
  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard(record => {
      const today = new Date(); today.setHours(0,0,0,0);
      if (mode === 'today' && new Date(record.created_at) < today) return;
      const top = scoresRef.current;
      const rank = top.filter(row => row.score > record.score).length + 1;
      if (rank <= 10 && (top.length < 10 || record.score >= top.at(-1).score)) {
        setAlert({nickname:record.nickname, score:record.score, rank, isChampion:rank === 1 && (!top.length || record.score > top[0].score)});
      }
      setHighlight(record.id);
      clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlight(null), 4000);
      void loadData();
    }, setConnection);
    return () => {unsubscribe(); clearTimeout(highlightTimer.current);};
  }, [loadData, mode]);
  function fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }
  return <div className="arcade-shell leaderboard-shell">
    <header className="site-header"><Brand /><nav><Link className="quiet-link" to="/play"><ArrowLeft size={17} />Back to play</Link><button className="icon-button tv-fullscreen" onClick={fullscreen} aria-label="Toggle TV fullscreen"><Maximize size={19} /></button><SoundToggle /></nav></header>
    <main className="board-main">
      <div className="board-heading"><div><span className="eyebrow">A LITTLE FRIENDLY COMPETITION</span><h1>The leaderboard<span>.</span></h1></div><span className={'connection-label ' + connection}><span className="status-dot" />{error ? 'RECONNECTING' : connection === 'live' ? 'LIVE SCORES' : connection === 'demo' ? 'DEMO MODE' : 'CONNECTING'}</span></div>
      <section className="board-stats" aria-label="Today's statistics"><div><Users size={20} /><span>PLAYERS TODAY<strong>{stats.totalPlayersToday.toLocaleString()}</strong></span></div><div><Gamepad2 size={20} /><span>RUNS TODAY<strong>{stats.gamesPlayedToday.toLocaleString()}</strong></span></div><div><Trophy size={20} /><span>TOP SCORE<strong>{stats.highestScoreToday.toLocaleString()}</strong></span></div></section>
      <div className="board-grid">
        <section className="rankings" aria-label="Top ten players">
          <div className="rank-controls"><div className="segmented" aria-label="Ranking period"><button aria-pressed={mode === 'today'} onClick={() => setMode('today')}>Today</button><button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>All time</button></div><button className="icon-button" onClick={() => void loadData()} aria-label="Refresh rankings"><RefreshCw size={17} /></button></div>
          {error && <p className="board-error" role="status">{error}</p>}
          <div className="rank-column-labels"><span>RANK / PLAYER</span><span>SCORE</span></div>
          {loading ? <div className="board-empty">Loading the rankings…</div> : !scores.length ? <div className="board-empty"><Trophy size={28} /><h2>The top spot is yours to take.</h2><p>Play the first run and get this party started.</p><Link className="quiet-link" to="/play">Let's play <ArrowUpRight size={16} /></Link></div> : scores.map((entry, i) => <LeaderboardRow key={entry.id} entry={entry} rank={i + 1} isNew={entry.id === highlight} />)}
          <Link className="mobile-play-link primary-button" to="/play">YOUR TURN TO BLITZ <ArrowUpRight size={19} /></Link>
        </section>
        <QRCodePanel />
      </div>
    </main>
    <footer className="site-footer"><span>Chase the score. Cheer for the next pilot.</span><span>GDR · FRESHERS WEEK 2026</span></footer>
    <HighScoreAlert alertData={alert} onClose={closeAlert} />
  </div>;
}
