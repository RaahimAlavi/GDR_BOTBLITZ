import { useState } from 'react';
import { ArrowUpRight, Dice5, Heart, Play, RotateCw, Trophy, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sanitizeNickname, generateRandomNickname } from '../lib/profanityFilter';
import { readPreference, writePreference } from '../lib/storage';
import { sound } from '../lib/soundFx';
import Brand from './Brand';
import RobotArt from './RobotArt';
import SoundToggle from './SoundToggle';
import ScoreSyncNotice from './ScoreSyncNotice';

export default function StartScreen({ onStartGame }) {
  const [nickname, setNickname] = useState(() => readPreference('botblitz_player_name'));
  const [error, setError] = useState('');
  const best = Number(readPreference('botblitz_personal_best', '0')) || 0;
  function start(event) {
    event.preventDefault();
    const validation = sanitizeNickname(nickname || generateRandomNickname());
    if (!validation.isValid) { setError(validation.error); return; }
    writePreference('botblitz_player_name', validation.sanitizedName);
    sound.init();
    onStartGame(validation.sanitizedName);
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
          <label htmlFor="nickname">YOUR PLAYER NAME <span>Optional</span></label>
          <div className={error ? 'name-field has-error' : 'name-field'}>
            <input id="nickname" maxLength={16} value={nickname} onChange={e => {setNickname(e.target.value); setError('');}} placeholder="Choose a name" autoComplete="nickname" autoCapitalize="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'name-error' : undefined} />
            <button type="button" className="icon-button" aria-label="Generate random name" onClick={() => {setNickname(generateRandomNickname()); setError('');}}><Dice5 size={20} /></button>
          </div>
          {error && <p id="name-error" className="form-error" role="alert">{error}</p>}
          <button className="primary-button play-button" type="submit"><Play size={21} fill="currentColor" /> LET'S BLITZ <ArrowUpRight size={21} /></button>
        </form>
        <div className="rotate-tip"><RotateCw size={17} /><span>Best played sideways. Fullscreen on Play.</span></div>
        <details className="how-to-play"><summary>How to play <span>+</span></summary><p>Drag anywhere to steer. Your bot follows your movement, so your finger stays out of the way. Collect green batteries and blue or gold cores. Chain pickups for up to 5× points. Red hazards cost a heart; a shield absorbs one hit. Survive 60 seconds or play until all three hearts are gone. On a keyboard, use WASD or the arrow keys.</p></details>
        <div className="personal-best"><span>YOUR BEST</span><strong>{best.toLocaleString()} <small>PTS</small></strong></div>
      </section>
    </main>
    <footer className="site-footer"><span>Built for quick breaks. Played for bragging rights.</span><span>GDR · FRESHERS WEEK 2026</span></footer>
  </div>;
}
