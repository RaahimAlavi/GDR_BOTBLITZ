import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import StartScreen from '../components/StartScreen';
import GameCanvas from '../components/GameCanvas';
import { createGameSession } from '../lib/scoreValidation';
import { enterGameFullscreen, leaveGameFullscreen } from '../lib/fullscreen';
const GameOverScreen = lazy(() => import('../components/GameOverScreen'));
export default function PlayPage() {
  const [stage, setStage] = useState('START');
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const start = useCallback(nickname => {
    // Keep fullscreen in the tap handler: browsers require user activation.
    void enterGameFullscreen();
    setSession(createGameSession(nickname)); setResult(null); setStage('PLAYING');
  }, []);
  const finish = useCallback(run => {
    leaveGameFullscreen(); setResult(run); setStage('GAMEOVER');
  }, []);
  const home = useCallback(() => { leaveGameFullscreen(); setStage('START'); }, []);
  useEffect(() => {
    document.title = 'BOT BLITZ | GDR Arcade';
    return () => leaveGameFullscreen();
  }, []);
  return <div className="play-page">
    {stage === 'START' && <StartScreen onStartGame={start} />}
    {stage === 'PLAYING' && <GameCanvas key={session.sessionId} session={session} onGameOver={finish} onExit={home} />}
    {stage === 'GAMEOVER' && <Suspense fallback={<div className="loading-screen">Wrapping up your run…</div>}><GameOverScreen score={result.score} session={session} result={result} onPlayAgain={() => start(session.nickname)} onHome={home} /></Suspense>}
  </div>;
}
