import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayPage from './pages/PlayPage';
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
export default function App() {
  return <BrowserRouter><Suspense fallback={<div className="loading-screen">Loading the arcade…</div>}><Routes>
    <Route path="/play" element={<PlayPage />} />
    <Route path="/leaderboard" element={<LeaderboardPage />} />
    <Route path="*" element={<Navigate to="/play" replace />} />
  </Routes></Suspense></BrowserRouter>;
}
