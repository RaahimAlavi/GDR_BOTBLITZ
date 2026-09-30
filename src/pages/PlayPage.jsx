import React, { useState, useCallback } from 'react';
import StartScreen from '../components/StartScreen';
import GameCanvas from '../components/GameCanvas';
import GameOverScreen from '../components/GameOverScreen';
import { createGameSession } from '../lib/scoreValidation';

export default function PlayPage() {
  const [gameState, setGameState] = useState('START'); // 'START' | 'PLAYING' | 'GAMEOVER'
  const [session, setSession] = useState(null);
  const [finalScore, setFinalScore] = useState(0);

  // Start new game run
  const handleStartGame = useCallback((nickname) => {
    const newSession = createGameSession(nickname);
    setSession(newSession);
    setFinalScore(0);
    setGameState('PLAYING');
  }, []);

  // Handle run conclusion (60s timer finished)
  const handleGameOver = useCallback(({ score, session: finalSession }) => {
    setFinalScore(score);
    if (finalSession) {
      setSession(finalSession);
    }
    setGameState('GAMEOVER');
  }, []);

  // Rematch
  const handlePlayAgain = useCallback(() => {
    if (session && session.nickname) {
      handleStartGame(session.nickname);
    } else {
      setGameState('START');
    }
  }, [session, handleStartGame]);

  return (
    <div className="w-full h-full min-h-screen bg-cyber-dark text-slate-100 flex flex-col justify-center items-center">
      {gameState === 'START' && (
        <StartScreen onStartGame={handleStartGame} />
      )}

      {gameState === 'PLAYING' && (
        <div className="fixed inset-0 w-full h-full">
          <GameCanvas
            session={session}
            onGameOver={handleGameOver}
          />
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <GameOverScreen
          score={finalScore}
          session={session}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
