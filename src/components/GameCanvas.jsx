import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../lib/gameEngine';
import GameHUD from './GameHUD';

export default function GameCanvas({ session, onGameOver }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // HUD state updated from game engine
  const [hudState, setHudState] = useState({
    score: 0,
    timeRemaining: 60,
    combo: 1,
    comboProgress: 0,
    activePowerUp: null,
    isOverload: false,
  });

  const handleHUDUpdate = useCallback((update) => {
    setHudState((prev) => ({
      ...prev,
      ...update,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Prevent iOS rubber-banding and accidental scrolling
    const preventDefaultTouch = (e) => {
      if (e.target === canvas) {
        e.preventDefault();
      }
    };
    document.body.addEventListener('touchmove', preventDefaultTouch, { passive: false });

    // Initialize Game Engine
    const engine = new GameEngine(canvas, {
      session,
      onHUDUpdate: handleHUDUpdate,
      onGameOver,
    });
    engineRef.current = engine;
    engine.start();

    // Window resize handler
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      document.body.removeEventListener('touchmove', preventDefaultTouch);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [session, onGameOver, handleHUDUpdate]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-cyber-darker">
      {/* Heads Up Display */}
      <GameHUD
        score={hudState.score}
        timeRemaining={hudState.timeRemaining}
        combo={hudState.combo}
        comboProgress={hudState.comboProgress}
        activePowerUp={hudState.activePowerUp}
        isOverload={hudState.isOverload}
      />

      {/* HTML5 Game Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
