import { useRef, useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { GameEngine } from '../lib/gameEngine';
import { enterGameFullscreen, leaveGameFullscreen } from '../lib/fullscreen';
import GameHUD from './GameHUD';
import PowerUpIndicator from './PowerUpIndicator';
export default function GameCanvas({session, onGameOver, onExit}) {
  const canvasRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [hud, setHud] = useState({score:0, timeRemaining:60, lives:3, combo:1, comboProgress:0, activePowerUp:null, isOverload:false, ready:3});
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new GameEngine(canvas, {session, onHUDUpdate:setHud, onGameOver});
    const resize = new ResizeObserver(() => engine.resize());
    resize.observe(canvas);
    engine.start();
    return () => {resize.disconnect(); engine.destroy();};
  }, [session, onGameOver]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  return <main className="game-screen">
    <GameHUD {...hud} fullscreen={fullscreen} onFullscreen={fullscreen ? leaveGameFullscreen : enterGameFullscreen} onExit={onExit} />
    <div className="arena-wrap">
      <canvas ref={canvasRef} className="game-canvas" aria-label="BOT BLITZ arena. Drag to steer, or use WASD and arrow keys." />
      {hud.ready > 0 && <div className="ready-overlay" aria-live="polite"><span>READY, PILOT?</span><strong key={hud.ready}>{hud.ready}</strong><p>Drag anywhere to steer</p></div>}
      {hud.activePowerUp && <div className="powerup-anchor"><PowerUpIndicator activePowerUp={hud.activePowerUp} /></div>}
    </div>
    <footer className="game-footer"><span>{hud.isOverload ? 'OVERLOAD · 50% MORE POINTS' : 'COLLECT ENERGY. KEEP MOVING.'}</span><span className="portrait-hint"><RotateCw size={13} /> Try landscape for more room</span><span className="desktop-hint">DRAG TO STEER · WASD / ↑ ↓ ← →</span></footer>
  </main>;
}
