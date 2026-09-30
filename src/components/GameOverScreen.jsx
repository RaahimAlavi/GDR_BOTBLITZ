import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Monitor, Award, Sparkles, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { calculatePlayerRank, submitScore } from '../lib/supabase';
import { validateSessionScore } from '../lib/scoreValidation';
import { sound } from '../lib/soundFx';

export default function GameOverScreen({ score, session, onPlayAgain }) {
  const [rank, setRank] = useState(null);
  const [personalBest, setPersonalBest] = useState(0);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('Verifying run...');

  useEffect(() => {
    let isMounted = true;

    async function processGameResult() {
      // 1. Check personal best in localStorage
      const prevBest = parseInt(localStorage.getItem('botblitz_personal_best') || '0', 10);
      const isRecord = score > prevBest;
      if (isRecord) {
        localStorage.setItem('botblitz_personal_best', score.toString());
      }
      setPersonalBest(Math.max(prevBest, score));
      setIsNewPersonalBest(isRecord);

      // 2. Validate session with Anti-Cheat engine
      const validation = validateSessionScore(session, score);
      if (!validation.isValid) {
        console.warn('Anti-cheat rejection:', validation.reason);
        setSubmitStatus('Run verification flagged');
        setIsSubmitting(false);
        return;
      }

      // 3. Submit score to Supabase (or offline local storage)
      setSubmitStatus('Transmitting score to kiosk...');
      try {
        await submitScore({
          nickname: session.nickname,
          score: validation.validatedScore,
          sessionId: session.sessionId,
          gameDuration: validation.duration,
        });

        // 4. Calculate Rank Today
        const playerRank = await calculatePlayerRank(validation.validatedScore, true);
        if (isMounted) {
          setRank(playerRank);
          setSubmitStatus('Score logged successfully');
          setIsSubmitting(false);

          if (playerRank <= 3) {
            sound.playHighScore();
          }
        }
      } catch (err) {
        console.error('Error submitting score:', err);
        if (isMounted) {
          setSubmitStatus('Score saved offline');
          setIsSubmitting(false);
        }
      }
    }

    processGameResult();

    return () => {
      isMounted = false;
    };
  }, [score, session]);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 py-6 cyber-grid-dense text-slate-100 overflow-y-auto animate-fade-in">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono tracking-widest text-cyber-neonGreen uppercase font-bold">
            Freshers Week 2026
          </span>
          <span className="text-xs font-mono tracking-wider text-slate-400">
            Gaming & Robotics Society
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] font-mono text-slate-300">
          <CheckCircle2 className="w-3 h-3 text-cyber-neonGreen" />
          <span>{submitStatus}</span>
        </div>
      </header>

      {/* Main Result Card */}
      <main className="w-full max-w-md flex flex-col items-center text-center my-auto py-4 z-10">
        <div className="text-xs font-mono tracking-widest text-cyber-neonCyan uppercase mb-1">
          SIMULATION CONCLUDED
        </div>
        <h1 className="text-3xl sm:text-4xl font-black font-display tracking-wider text-white">
          BOT BLITZ
        </h1>
        <p className="text-xs font-mono text-slate-400 tracking-wider mb-6">
          PILOT: <span className="text-cyber-neonGreen font-bold">{session?.nickname || 'PILOT'}</span>
        </p>

        {/* Score Display Card */}
        <div className="w-full relative p-6 rounded-2xl bg-cyber-card border-2 border-cyber-neonCyan/40 shadow-neon-cyan flex flex-col items-center">
          {isNewPersonalBest && (
            <div className="absolute -top-3 px-3 py-1 rounded-full bg-gradient-to-r from-cyber-gold to-yellow-500 text-slate-950 font-display font-black text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-md">
              <Sparkles className="w-3 h-3" />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}

          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">
            FINAL SCORE
          </span>
          <div className="text-5xl sm:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyber-neonCyan tracking-tight text-glow-cyan">
            {score.toLocaleString()}
          </div>

          {/* Stats Grid: Rank Today & Best Score */}
          <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-6 border-t border-slate-800">
            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
                <Trophy className="w-3.5 h-3.5 text-cyber-gold" />
                <span>Rank Today</span>
              </div>
              <span className="text-2xl font-display font-extrabold text-white mt-1">
                {rank !== null ? `#${rank}` : '...'}
              </span>
            </div>

            <div className="flex flex-col items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 uppercase">
                <Award className="w-3.5 h-3.5 text-cyber-neonPurple" />
                <span>Personal Best</span>
              </div>
              <span className="text-2xl font-display font-extrabold text-slate-200 mt-1">
                {personalBest.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full mt-6">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-cyber-neonCyan to-cyan-400 text-slate-950 font-display font-black text-lg tracking-widest uppercase flex items-center justify-center gap-2 shadow-neon-cyan hover:brightness-110 active:scale-98 transition duration-150"
          >
            <RotateCcw className="w-5 h-5 stroke-[2.5]" />
            <span>PLAY AGAIN</span>
          </button>

          <Link
            to="/leaderboard"
            className="w-full h-12 rounded-xl bg-slate-900/90 border border-cyber-gold/50 text-cyber-gold hover:bg-cyber-gold/10 font-display font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-md active:scale-98 transition duration-150"
          >
            <Monitor className="w-4 h-4" />
            <span>VIEW LIVE LEADERBOARD</span>
          </Link>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="w-full max-w-md text-center text-[10px] font-mono text-slate-500 z-10">
        Gaming & Robotics Society • Freshers Week
      </footer>
    </div>
  );
}
