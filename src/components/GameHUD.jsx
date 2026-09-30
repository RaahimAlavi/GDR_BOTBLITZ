import React from 'react';
import SoundToggle from './SoundToggle';
import PowerUpIndicator from './PowerUpIndicator';
import { Flame, Timer } from 'lucide-react';

export default function GameHUD({
  score = 0,
  timeRemaining = 60,
  combo = 1,
  comboProgress = 0,
  activePowerUp = null,
  isOverload = false,
}) {
  const isUrgent = timeRemaining <= 10;

  // Multiplier color styling
  const comboStyles = {
    1: 'text-slate-400 border-slate-700 bg-slate-900/60',
    2: 'text-cyber-neonGreen border-cyber-neonGreen/40 bg-cyber-neonGreen/10',
    3: 'text-cyber-neonCyan border-cyber-neonCyan/40 bg-cyber-neonCyan/10',
    4: 'text-cyber-neonOrange border-cyber-neonOrange/50 bg-cyber-neonOrange/15 animate-pulse',
    5: 'text-cyber-gold border-cyber-gold/70 bg-cyber-gold/20 shadow-neon-gold animate-bounce',
  };

  const currentComboStyle = comboStyles[combo] || comboStyles[1];

  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none p-2 sm:p-4 flex flex-col gap-2">
      {/* Top Main Status Bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Score display */}
        <div className="flex flex-col bg-cyber-dark/85 border border-cyan-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg">
          <span className="text-[10px] tracking-widest text-slate-400 font-mono uppercase">
            Score
          </span>
          <span className="text-xl sm:text-2xl font-display font-black text-white text-glow-cyan tracking-wider">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Center: Timer */}
        <div className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
          isUrgent 
            ? 'bg-cyber-danger/25 border-cyber-danger text-cyber-danger shadow-neon-danger animate-pulse scale-105' 
            : 'bg-cyber-dark/85 border-slate-700/60 text-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <Timer className={`w-3.5 h-3.5 ${isUrgent ? 'text-cyber-danger animate-spin' : 'text-slate-400'}`} />
            <span className="text-[10px] font-mono tracking-widest uppercase">
              {isOverload ? 'OVERLOAD' : 'TIME'}
            </span>
          </div>
          <span className={`text-2xl sm:text-3xl font-display font-black tracking-widest ${
            isUrgent ? 'text-cyber-danger text-glow-danger font-extrabold' : 'text-white'
          }`}>
            {timeRemaining}s
          </span>
        </div>

        {/* Right: Sound toggle and Multiplier */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Combo Multiplier Badge */}
          <div className={`flex flex-col items-center px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all ${currentComboStyle}`}>
            <div className="flex items-center gap-1">
              <Flame className={`w-3.5 h-3.5 ${combo >= 4 ? 'animate-bounce' : ''}`} />
              <span className="text-xs sm:text-sm font-display font-extrabold tracking-wider">
                x{combo}
              </span>
            </div>
            {/* Combo timer decay bar */}
            {combo > 1 && (
              <div className="w-10 h-1 bg-slate-800/80 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, comboProgress * 100))}%` }}
                />
              </div>
            )}
          </div>

          <SoundToggle />
        </div>
      </div>

      {/* Active Power-up banner row */}
      {activePowerUp && (
        <div className="flex justify-center">
          <PowerUpIndicator activePowerUp={activePowerUp} />
        </div>
      )}
    </header>
  );
}
