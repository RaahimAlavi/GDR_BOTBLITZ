import React, { useState } from 'react';
import { Play, Dice5, Trophy, Zap, ShieldAlert, Sparkles } from 'lucide-react';
import { sanitizeNickname, generateRandomNickname } from '../lib/profanityFilter';
import { sound } from '../lib/soundFx';
import SoundToggle from './SoundToggle';
import { Link } from 'react-router-dom';

export default function StartScreen({ onStartGame }) {
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem('botblitz_player_name') || '';
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleRandomize = () => {
    sound.init();
    sound.playTone(600, 'sine', 0.08, 0.15, 100);
    const randomName = generateRandomNickname();
    setNickname(randomName);
    setErrorMsg('');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sound.init();

    const { isValid, sanitizedName, error } = sanitizeNickname(nickname);
    if (!isValid) {
      setErrorMsg(error || 'Invalid nickname');
      sound.playHit();
      return;
    }

    localStorage.setItem('botblitz_player_name', sanitizedName);
    sound.playPowerUp();
    onStartGame(sanitizedName);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-6 cyber-grid-bg text-slate-100 overflow-y-auto">
      {/* Top Header & Branding */}
      <header className="w-full max-w-md flex items-center justify-between z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-neonGreen animate-ping" />
            <span className="text-[10px] font-mono tracking-widest text-cyber-neonGreen uppercase font-bold">
              Freshers Week 2026
            </span>
          </div>
          <span className="text-xs font-mono tracking-wider text-slate-400">
            Gaming & Robotics Society
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/leaderboard"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyber-card border border-cyber-gold/40 text-cyber-gold text-xs font-display hover:border-cyber-gold transition-all active:scale-95 shadow-md"
            title="View Live Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>TV Rank</span>
          </Link>
          <SoundToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md flex flex-col items-center text-center my-auto py-4 z-10">
        {/* Robot Hero Avatar Graphic */}
        <div className="relative mb-4 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-cyber-neonCyan via-cyber-neonPurple to-cyber-neonGreen rounded-full blur-xl opacity-40 group-hover:opacity-75 transition duration-1000 animate-pulse-glow" />
          <div className="relative w-24 h-24 rounded-2xl bg-cyber-card border-2 border-cyber-neonCyan/60 flex items-center justify-center shadow-neon-cyan transform hover:rotate-3 transition duration-300">
            <svg className="w-14 h-14 text-cyber-neonCyan" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <rect x="25" y="28" width="50" height="44" rx="10" strokeWidth="6" fill="#0f1420" />
              <circle cx="40" cy="46" r="6" fill="#00f0ff" strokeWidth="0" />
              <circle cx="60" cy="46" r="6" fill="#00f0ff" strokeWidth="0" />
              <line x1="50" y1="12" x2="50" y2="28" stroke="#ffdd00" strokeWidth="6" strokeLinecap="round" />
              <circle cx="50" cy="10" r="5" fill="#ff007f" />
              <rect x="36" y="58" width="28" height="6" rx="2" fill="#00ff88" strokeWidth="0" />
            </svg>
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-4xl sm:text-5xl font-black font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyber-neonCyan drop-shadow-[0_0_20px_rgba(0,240,255,0.7)]">
          BOT BLITZ
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-300 font-mono tracking-wide max-w-xs">
          "60 Seconds. One Robot. How High Can You Score?"
        </p>

        {/* Quick Kiosk Rules Bar */}
        <div className="grid grid-cols-3 gap-2 w-full my-5 text-[11px] font-mono">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-cyber-neonGreen" />
            <span className="text-slate-200">Collect Cores</span>
            <span className="text-[9px] text-cyber-neonGreen">+100 to +750</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-cyber-danger" />
            <span className="text-slate-200">Dodge Hazards</span>
            <span className="text-[9px] text-cyber-danger">Lasers & Mines</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-1">
            <Sparkles className="w-4 h-4 text-cyber-gold" />
            <span className="text-slate-200">Chain Combo</span>
            <span className="text-[9px] text-cyber-gold">Up to 5X Bonus</span>
          </div>
        </div>

        {/* Form: Nickname input and PLAY button */}
        <form onSubmit={handleFormSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col text-left">
            <label htmlFor="nickname" className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
              <span>PILOT CALLSIGN</span>
              <span>{nickname.length}/16</span>
            </label>
            <div className="relative flex items-center">
              <input
                id="nickname"
                type="text"
                maxLength={16}
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="ENTER NICKNAME"
                autoComplete="off"
                autoFocus
                className="w-full h-12 px-4 pr-12 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-white font-mono text-base focus:outline-none focus:border-cyber-neonCyan focus:ring-2 focus:ring-cyber-neonCyan/30 uppercase tracking-widest placeholder-slate-600 transition shadow-inner"
              />
              <button
                type="button"
                onClick={handleRandomize}
                className="absolute right-2 p-2 text-slate-400 hover:text-cyber-neonCyan transition active:scale-95"
                title="Generate Random Callsign"
              >
                <Dice5 className="w-5 h-5" />
              </button>
            </div>
            {errorMsg && (
              <span className="mt-1 text-xs font-mono text-cyber-danger text-left">
                ⚠️ {errorMsg}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full mt-2 h-14 rounded-xl bg-gradient-to-r from-cyber-neonCyan to-cyan-400 text-slate-950 font-display font-black text-xl tracking-widest uppercase flex items-center justify-center gap-2 shadow-neon-cyan hover:brightness-110 active:scale-98 transition duration-150"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>PLAY NOW</span>
          </button>
        </form>

        <p className="mt-3 text-[11px] text-slate-500 font-mono">
          Touch & drag anywhere to steer your robot. No app install required.
        </p>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md text-center text-[10px] font-mono text-slate-500 z-10">
        Gaming & Robotics Society • Kiosk Terminal
      </footer>
    </div>
  );
}
