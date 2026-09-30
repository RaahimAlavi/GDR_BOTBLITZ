import { Heart, Maximize, Minimize, Timer, X, Zap } from 'lucide-react';
import SoundToggle from './SoundToggle';
export function Hearts({ lives = 3 }) {
  return <span className="hearts" role="img" aria-label={lives + ' of 3 hearts remaining'}>{[0,1,2].map(i => <Heart key={i} size={19} className={i < lives ? 'heart-full' : 'heart-empty'} fill={i < lives ? 'currentColor' : 'none'} aria-hidden="true" />)}</span>;
}
export default function GameHUD({score, timeRemaining, lives, combo, comboProgress, isOverload, fullscreen, onFullscreen, onExit}) {
  return <header className={isOverload ? 'game-hud is-overload' : 'game-hud'}>
    <div className="hud-score"><span className="hud-label">SCORE</span><strong>{score.toLocaleString()}</strong></div>
    <div className="hud-combo"><span><Zap size={15} />{combo}×</span><div className="combo-track"><i style={{transform: 'scaleX(' + (combo > 1 ? comboProgress : 0) + ')'}} /></div></div>
    <div className="hud-hearts"><Hearts lives={lives} /></div>
    <div className={timeRemaining <= 10 ? 'hud-time urgent' : 'hud-time'}><Timer size={17} /><strong>{String(timeRemaining).padStart(2, '0')}</strong><span>s</span></div>
    <div className="hud-actions"><SoundToggle /><button className="icon-button" onClick={onFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button><button className="icon-button" onClick={onExit} aria-label="Exit run"><X size={19} /></button></div>
  </header>;
}
