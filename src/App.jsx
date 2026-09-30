import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayPage from './pages/PlayPage';
import LeaderboardPage from './pages/LeaderboardPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        {/* Default route redirects to /play */}
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
