import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, CloudUpload, Home, RotateCcw, Trophy, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { processResult, retryResult } from '../lib/results';
import { readPlayerBest } from '../lib/playerBests';
import { readScoreJob, scoreJobStatus, SYNC_EVENT } from '../lib/scoreOutbox';
import Brand from './Brand';
import { Hearts } from './GameHUD';

export default function GameOverScreen({score, session, result, onPlayAgain, onHome}) {
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(session.persistenceError || '');
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    let active = true;
    let rankRequested = false;
    const update = async () => {
      const data = scoreJobStatus(readScoreJob(session.sessionId));
      if (!active || !data) return;
      setSaved(previous => ({...previous, ...data}));
      if (data.sync === 'live' && !rankRequested) {
        rankRequested = true;
        try {const service = await import('../lib/supabase'); const rank = await service.calculatePlayerRank(score,true,session.nickname); if (active) setSaved(previous => ({...previous, rank}));} catch {rankRequested = false;}
      }
    };
    window.addEventListener(SYNC_EVENT, update); window.addEventListener('storage', update);
    void update();
    processResult(session, score).then(data => {if (active) {setError(''); setSaved(previous => ({...previous, ...data, ...scoreJobStatus(readScoreJob(session.sessionId))}));}})
      .catch(err => {if (active) setError(err.message);});
    return () => {active = false; window.removeEventListener(SYNC_EVENT, update); window.removeEventListener('storage', update);};
  }, [score, session]);
  async function retry() {
    setRetrying(true); setError('');
    try {setSaved(await retryResult(session, score));} catch(err) {setError(err.message);}
    finally {setRetrying(false);}
  }
  const livesEnded = result.reason === 'LIVES';
  const waiting = saved?.sync === 'queued';
  const status = error || saved?.error || (!saved ? 'Saving your score…' : waiting ?
    (saved.state === 'syncing' ? 'Saved on this device. Syncing your score…' : 'Saved on this device. Will sync automatically when connected.') :
    saved.sync === 'demo' ? 'Saved to the demo leaderboard.' : 'Your score is on the leaderboard.');
  return <div className="arcade-shell result-shell">
    <header className="site-header"><Brand /><button className="quiet-link" onClick={onHome}><Home size={17} />Home</button></header>
    <main className="result-layout">
      <section className="result-intro">
        <span className="eyebrow">{livesEnded ? 'OUT OF HEARTS, STILL A HERO' : '60 SECONDS. YOU MADE IT.'}</span>
        <h1>{livesEnded ? <>Good run,<span>pilot.</span></> : <>Nicely<span>blitzed.</span></>}</h1>
        <p className="muted">{livesEnded ? 'A little practice. A bigger score next time.' : 'Your little bot has earned a breather.'}</p>
        <div className="result-player"><span className="status-dot" />{session.nickname}<Hearts lives={result.lives} /></div>
      </section>
      <section className="result-panel">
        <div className="panel-heading"><span className="eyebrow">YOUR SCORE</span>{saved?.isRecord && <span className="record-badge"><Trophy size={13} />PERSONAL BEST</span>}</div>
        <div className="final-score">{score.toLocaleString()}<span>PTS</span></div>
        <div className="result-stats">
          <div><span>SURVIVED</span><strong>{Math.floor(result.duration)}<small>s</small></strong></div>
          <div><span>BEST COMBO</span><strong>{result.bestCombo}<small>×</small></strong></div>
          <div><span>COLLECTED</span><strong>{result.collected}</strong></div>
        </div>
        <div className="result-standing"><span>Today's rank <strong>{saved?.rank ? '#' + saved.rank : '—'}</strong></span><span>Your best <strong>{(saved?.best ?? Math.max(readPlayerBest(session.nickname),score)).toLocaleString()}</strong></span></div>
        <div className={'save-status ' + ((waiting || error) ? 'offline' : '')} role="status">{error ? <WifiOff size={16} /> : waiting ? <CloudUpload size={16} /> : <CheckCircle2 size={16} />}<span>{retrying ? 'Trying again…' : status}</span>{(waiting || error) && <button onClick={retry} disabled={retrying || saved?.state === 'syncing'}>Retry</button>}</div>
        <button className="primary-button" onClick={onPlayAgain}><RotateCcw size={19} /> ONE MORE RUN <ArrowRight size={20} /></button>
        <Link className="secondary-button" to="/leaderboard"><Trophy size={17} /> View leaderboard</Link>
      </section>
    </main>
    <footer className="site-footer"><span>Every run starts with a fresh set of hearts.</span><span>GDR / ARCADE</span></footer>
  </div>;
}
