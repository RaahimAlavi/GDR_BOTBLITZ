import React, { useEffect } from 'react';
import Leaderboard from '../components/Leaderboard';

export default function LeaderboardPage() {
  useEffect(() => {
    document.title = 'BOT BLITZ | Live Kiosk Leaderboard';
  }, []);

  return (
    <div className="w-full min-h-screen bg-cyber-dark">
      <Leaderboard />
    </div>
  );
}
