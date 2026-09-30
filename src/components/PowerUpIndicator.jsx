import React from 'react';
import { Shield, Magnet, Zap, Clock, FastForward, AlertOctagon } from 'lucide-react';

const POWERUP_CONFIG = {
  SHIELD: {
    label: 'SHIELD ONLINE',
    icon: Shield,
    color: 'text-cyber-neonCyan',
    bg: 'bg-cyber-neonCyan/15',
    border: 'border-cyber-neonCyan/40',
    bar: 'bg-cyber-neonCyan',
  },
  MAGNET: {
    label: 'MAGNET CORE',
    icon: Magnet,
    color: 'text-cyber-neonPurple',
    bg: 'bg-cyber-neonPurple/15',
    border: 'border-cyber-neonPurple/40',
    bar: 'bg-cyber-neonPurple',
  },
  DOUBLE: {
    label: '2X POINTS',
    icon: Zap,
    color: 'text-cyber-gold',
    bg: 'bg-cyber-gold/15',
    border: 'border-cyber-gold/40',
    bar: 'bg-cyber-gold',
  },
  TIME_SLOW: {
    label: 'TIME WARP',
    icon: Clock,
    color: 'text-cyber-neonGreen',
    bg: 'bg-cyber-neonGreen/15',
    border: 'border-cyber-neonGreen/40',
    bar: 'bg-cyber-neonGreen',
  },
  SPEED: {
    label: 'TURBO BOOST',
    icon: FastForward,
    color: 'text-cyber-neonOrange',
    bg: 'bg-cyber-neonOrange/15',
    border: 'border-cyber-neonOrange/40',
    bar: 'bg-cyber-neonOrange',
  },
  MALFUNCTION: {
    label: 'SYSTEM GLITCH',
    icon: AlertOctagon,
    color: 'text-cyber-danger',
    bg: 'bg-cyber-danger/20',
    border: 'border-cyber-danger/60',
    bar: 'bg-cyber-danger animate-pulse',
  },
};

export default function PowerUpIndicator({ activePowerUp }) {
  if (!activePowerUp) return null;

  const config = POWERUP_CONFIG[activePowerUp.type] || POWERUP_CONFIG.SHIELD;
  const IconComponent = config.icon;
  const progressPercent = Math.max(0, Math.min(100, (activePowerUp.progress || 0) * 100));

  return (
    <div className={`powerup-indicator ${config.color}`}>
      <div className="flex items-center gap-2">
        <IconComponent className={`w-4 h-4 ${config.color}`} />
        <span className={`text-xs font-display font-bold tracking-wider ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Countdown progress bar */}
      <div className="w-full h-1 bg-slate-900/60 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${config.bar}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
