import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Sparkles, Trophy } from 'lucide-react';
import { sound } from '../lib/soundFx';

export default function HighScoreAlert({ alertData, onClose }) {
  const isChampion = alertData?.rank === 1;

  useEffect(() => {
    if (!alertData) return;

    // Play celebratory audio
    if (isChampion) {
      sound.playHighScore();
      // Burst confetti for new #1 champion!
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#00f0ff', '#00ff88', '#ff007f'],
        });
      } catch {}
    } else {
      sound.playRareCollect();
    }

    // Auto-dismiss after 6.5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 6500);

    return () => clearTimeout(timer);
  }, [alertData, isChampion, onClose]);

  if (!alertData) return null;

  const { nickname, score, rank } = alertData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className={`relative max-w-lg w-full p-8 rounded-3xl border-4 text-center transform transition-all animate-scale-up ${
          isChampion
            ? 'cyber-card-gold border-amber-400 shadow-[0_0_60px_rgba(255,215,0,0.5)]'
            : 'cyber-card border-cyber-neonCyan shadow-neon-cyan'
        }`}
      >
        {/* Glow particle background */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyber-neonCyan via-cyber-gold to-cyber-neonGreen opacity-30 blur-xl pointer-events-none" />

        {isChampion ? (
          // ==================== NEW CHAMPION VIEW ====================
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 shadow-neon-gold animate-bounce">
              <Crown className="w-12 h-12 text-cyber-gold" />
            </div>

            <span className="text-sm font-mono tracking-widest text-amber-300 font-bold uppercase mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyber-gold" />
              NEW CHAMPION
              <Sparkles className="w-4 h-4 text-cyber-gold" />
            </span>

            <h2 className="text-4xl sm:text-5xl font-display font-black text-cyber-gold text-glow-gold uppercase tracking-wider my-2">
              {nickname}
            </h2>

            <div className="text-4xl sm:text-5xl font-display font-black text-white my-1">
              {score.toLocaleString()}{' '}
              <span className="text-xl sm:text-2xl text-amber-300 font-mono">PTS</span>
            </div>

            <div className="mt-4 px-5 py-2 rounded-full bg-amber-400 text-slate-950 font-display font-black text-base tracking-widest uppercase shadow-lg">
              HAS TAKEN #1 TODAY
            </div>
          </div>
        ) : (
          // ==================== TOP 10 SCORE VIEW ====================
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyber-neonCyan flex items-center justify-center mb-3 shadow-neon-cyan">
              <Trophy className="w-8 h-8 text-cyber-neonCyan" />
            </div>

            <span className="text-sm font-mono tracking-widest text-cyber-neonCyan font-bold uppercase mb-1">
              NEW TOP 10 SCORE!
            </span>

            <h2 className="text-3xl sm:text-4xl font-display font-black text-white text-glow-cyan uppercase tracking-wider my-2">
              {nickname}
            </h2>

            <div className="text-3xl sm:text-4xl font-display font-black text-cyber-neonGreen my-1">
              {score.toLocaleString()}{' '}
              <span className="text-lg text-slate-300 font-mono">POINTS</span>
            </div>

            <div className="mt-4 px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyber-neonCyan/50 text-cyber-neonCyan font-display font-bold text-sm tracking-widest uppercase">
              #{rank} TODAY
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 text-xs font-mono text-slate-400 hover:text-white uppercase tracking-wider transition underline"
        >
          [ Dismiss ]
        </button>
      </div>
    </div>
  );
}
