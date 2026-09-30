import { useEffect } from 'react';
import { Crown, Trophy, X } from 'lucide-react';
import { sound } from '../lib/soundFx';
export default function HighScoreAlert({alertData, onClose}) {
  const champion = alertData?.isChampion;
  useEffect(() => {
    if (!alertData) return;
    if (champion) {
      sound.playHighScore();
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        void import('canvas-confetti').then(({default: confetti}) => confetti({particleCount:65, spread:70, origin:{y:0.55}, colors:['#56e3dd','#c4f979','#f8cb73'],disableForReducedMotion:true})).catch(() => {});
      }
    } else sound.playRareCollect();
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [alertData, champion, onClose]);
  if (!alertData) return null;
  return <div className="score-toast" role="status">
    <div className="toast-icon">{champion ? <Crown size={26} /> : <Trophy size={26} />}</div>
    <div><span className="eyebrow">{champion ? 'NEW TOP PILOT' : 'TOP 10 RUN'}</span><strong>{alertData.nickname}</strong><p>#{alertData.rank} · {alertData.score.toLocaleString()} points</p></div>
    <button className="icon-button" onClick={onClose} aria-label="Dismiss announcement"><X size={18} /></button>
  </div>;
}
