import React from 'react';
import { Crown } from 'lucide-react';

export default function LeaderboardRow({ entry, rank, isNew = false }) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;

  // Medals and highlight styling for Top 3
  const getRowStyle = () => {
    if (isFirst) {
      return 'bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-950/30 border-amber-400/80 shadow-neon-gold text-amber-100';
    }
    if (isSecond) {
      return 'bg-gradient-to-r from-slate-400/20 via-slate-300/10 to-slate-900/40 border-slate-300/60 text-slate-100';
    }
    if (isThird) {
      return 'bg-gradient-to-r from-amber-700/20 via-amber-800/10 to-slate-900/40 border-amber-600/60 text-amber-200';
    }
    return 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700';
  };

  const getRankBadge = () => {
    if (isFirst) {
      return (
        <div className="flex items-center gap-1">
          <span className="text-2xl" role="img" aria-label="1st Place">🥇</span>
          <Crown className="w-4 h-4 text-cyber-gold hidden sm:inline" />
        </div>
      );
    }
    if (isSecond) {
      return <span className="text-2xl" role="img" aria-label="2nd Place">🥈</span>;
    }
    if (isThird) {
      return <span className="text-2xl" role="img" aria-label="3rd Place">🥉</span>;
    }
    return (
      <span className="text-sm font-mono font-bold text-slate-500 w-7 text-center">
        #{rank}
      </span>
    );
  };

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-300 ${getRowStyle()} ${
        isNew ? 'animate-pulse scale-102 ring-2 ring-cyber-neonCyan' : ''
      }`}
    >
      {/* Left: Rank & Nickname */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 flex items-center justify-center w-8">
          {getRankBadge()}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-display font-bold text-base sm:text-lg tracking-wider truncate uppercase ${
              isFirst ? 'text-cyber-gold text-glow-gold' : 'text-white'
            }`}>
              {entry.nickname}
            </span>
            {isFirst && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400 text-slate-950 uppercase tracking-widest">
                CHAMPION
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Right: Score */}
      <div className="flex flex-col items-end flex-shrink-0 ml-4">
        <span className={`text-xl sm:text-2xl font-display font-black tracking-tight ${
          isFirst 
            ? 'text-cyber-gold text-glow-gold' 
            : (isSecond ? 'text-slate-100' : (isThird ? 'text-amber-200' : 'text-cyber-neonCyan'))
        }`}>
          {entry.score.toLocaleString()}
        </span>
        <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
          POINTS
        </span>
      </div>
    </div>
  );
}
