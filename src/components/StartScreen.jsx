import { useState } from 'react';
import { ArrowUpRight, Heart, Play, RotateCw, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sanitizeNickname } from '../lib/profanityFilter';
import { getNameProfile, initialPlayerName } from '../lib/playerNames';
import { writePreference } from '../lib/storage';
import { readPlayerBest } from '../lib/playerBests';
import { sound } from '../lib/soundFx';
import Brand from './Brand';
import RobotArt from './RobotArt';
import SoundToggle from './SoundToggle';
import ScoreSyncNotice from './ScoreSyncNotice';
import { getScoreTarget } from '../lib/scoreOutbox';

export default function StartScreen({ onStartGame }) {
  const [nickname, setNickname] = useState(initialPlayerName);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [readyName, setReadyName] = useState(() => {
    const name = initialPlayerName(), profile = getNameProfile(name);
    return profile?.confirmed && (profile.reserved || getScoreTarget() === 'demo' || navigator.onLine === false) ? name : '';
  });
  const best = readPlayerBest(nickname);
  async function start(event) {
    event.preventDefault();
    if (checking) return;
    const validation = sanitizeNickname(nickname);
    if (!validation.isValid) { setError(validation.error); return; }
    if (readyName === validation.sanitizedName) {
      writePreference('botblitz_player_name', readyName);
      sound.init(); onStartGame(readyName); return;
    }
    setChecking(true); setError('');
    try {
      const service = await import('../lib/supabase');
      const profile = await service.checkPlayerName(validation.sanitizedName);
      setNickname(profile.nickname); setReadyName(profile.nickname);
    } catch (err) {setError(err.message);}
    finally {setChecking(false);}
  }
  return <div className="arcade-shell">
    <header className="site-header"><Brand />
      <nav aria-label="Main navigation"><Link className="quiet-link" to="/leaderboard"><Trophy size={17} /><span>Leaderboard</span><ArrowUpRight size={15} /></Link><SoundToggle /></nav>
    </header>
    <ScoreSyncNotice />
    <main className="lobby">
      <section className="lobby-hero">
        <div className="eyebrow"><span className="status-dot" /> THE 60-SECOND ARCADE CHALLENGE</div>
        <h1>BOT<span>BLITZ<span className="title-dot">.</span></span></h1>
        <p className="hero-line">Small bot. <em>Big energy.</em></p>
        <div className="hero-art"><RobotArt /><span className="art-caption"><span className="status-dot" /> YOUR BOT IS READY</span></div>
      </section>
      <section className="launch-panel" aria-labelledby="launch-title">
        <div className="panel-heading"><span className="eyebrow">LET'S PLAY</span><span className="session-tag">01 / SURVIVAL</span></div>
        <h2 id="launch-title">Chase the high score.</h2>
        <p className="muted">Collect energy. Dodge the red stuff.<br />Keep your little bot alive.</p>
        <div className="game-facts"><span><Zap size={17} />60 seconds</span><span><Heart size={17} />3 lives</span><span><Trophy size={17} />5× combos</span></div>
        <form onSubmit={start}>
          <label htmlFor="nickname">YOUR PLAYER NAME <span>Required</span></label>
          <div className={error ? 'name-field has-error' : 'name-field'}>
            <input id="nickname" maxLength={16} value={nickname} disabled={checking} onChange={e => {setNickname(e.target.value); setReadyName(''); setError('');}} placeholder="Your name + initials" autoComplete="nickname" autoCapitalize="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : 'name-help'} />
          </div>
          {error && <p id="name-error" className="form-error" role="alert">{error}</p>}
          <p id="name-help" className={'name-help ' + (readyName ? 'ready' : '')} role="status">{readyName ? 'Name ready. Tap Play to begin.' : 'Choose a unique name. Replays keep your best score.'}</p>
          <button className="primary-button play-button" type="submit" disabled={checking}><Play size={21} fill="currentColor" /> {checking ? 'CHECKING NAME…' : readyName ? "LET'S BLITZ" : 'CHECK NAME'} <ArrowUpRight size={21} /></button>
        </form>
        <div className="rotate-tip"><RotateCw size={17} /><span>Best played sideways. Fullscreen on Play.</span></div>
        <details className="how-to-play"><summary>How to play <span>+</span></summary><p>Drag anywhere to steer. Your bot follows your movement, so your finger stays out of the way. Collect green batteries and blue or gold cores. Chain pickups for up to 5× points. Red hazards cost a heart; a shield absorbs one hit. Survive 60 seconds or play until all three hearts are gone. On a keyboard, use WASD or the arrow keys.</p></details>
        <div className="personal-best"><span>YOUR BEST</span><strong>{best.toLocaleString()} <small>PTS</small></strong></div>
      </section>
    </main>
    <footer className="site-footer"><span>Built for quick breaks. Played for bragging rights.</span><span>GDR · FRESHERS WEEK 2026</span></footer>
  </div>;
}
