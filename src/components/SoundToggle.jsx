import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../lib/soundFx';

export default function SoundToggle({ className = '' }) {
  const [muted, setMuted] = useState(sound.isMuted());

  const handleToggle = (e) => {
    e.stopPropagation();
    const next = sound.toggleMute();
    setMuted(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`relative z-20 flex items-center justify-center p-2 rounded-lg bg-cyber-card border border-slate-700/60 text-slate-300 hover:text-cyber-neonCyan hover:border-cyber-neonCyan/50 transition-all active:scale-95 shadow-md ${className}`}
      title={muted ? 'Unmute Sound FX' : 'Mute Sound FX'}
      aria-label={muted ? 'Unmute audio' : 'Mute audio'}
    >
      {muted ? (
        <VolumeX className="w-5 h-5 text-cyber-danger" />
      ) : (
        <Volume2 className="w-5 h-5 text-cyber-neonGreen animate-pulse" />
      )}
    </button>
  );
}
