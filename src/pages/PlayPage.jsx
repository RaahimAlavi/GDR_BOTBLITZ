import { useState, useCallback, useEffect } from 'react';
import StartScreen from '../components/StartScreen';
import GameCanvas from '../components/GameCanvas';
import { createGameSession } from '../lib/scoreValidation';
import { enterGameFullscreen, leaveGameFullscreen } from '../lib/fullscreen';
import { persistCompletedScore } from '../lib/scoreOutbox';
import GameOverScreen from '../components/GameOverScreen';
import { getNameProfile } from '../lib/playerNames';
export default function PlayPage() {
  const [stage, setStage] = useState('START');
  const [session, setSession] = useState(null);
  const [result, setResult] = useState(null);
  const start = useCallback(nickname => {
    // Keep fullscreen in the tap handler: browsers require user activation.
    void enterGameFullscreen();
    const run = createGameSession(nickname);
    const profile = getNameProfile(nickname);
    if (profile?.reserved) run.nameToken = profile.token;
    setSession(run); setResult(null); setStage('PLAYING');
  }, []);
  const finish = useCallback(run => {
    // Persist before the results chunk, network requests or fullscreen cleanup.
    try { persistCompletedScore(run.session, run.score); } catch(error) {run.session.persistenceError = error.message;}
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
    {stage === 'GAMEOVER' && <GameOverScreen score={result.score} session={session} result={result} onPlayAgain={() => start(session.nickname)} onHome={home} />}
  </div>;
}
