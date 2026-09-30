import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PlayPage from './pages/PlayPage';
import { ScoreSyncBootstrap } from './components/ScoreSyncNotice';
import PageLoadBoundary from './components/PageLoadBoundary';
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
export default function App() {
  return <BrowserRouter><ScoreSyncBootstrap /><PageLoadBoundary><Suspense fallback={<div className="loading-screen">Loading the arcade…</div>}><Routes>
    <Route path="/play" element={<PlayPage />} />
    <Route path="/leaderboard" element={<LeaderboardPage />} />
    <Route path="*" element={<Navigate to="/play" replace />} />
  </Routes></Suspense></PageLoadBoundary></BrowserRouter>;
}
