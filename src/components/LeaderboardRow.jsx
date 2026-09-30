import { Crown } from 'lucide-react';
export default function LeaderboardRow({entry, rank, isNew = false}) {
  return <div className={'rank-row ' + (rank === 1 ? 'rank-first ' : '') + (isNew ? 'rank-new' : '')}>
    <span className="rank-number">{rank === 1 ? <Crown size={20} /> : String(rank).padStart(2, '0')}</span>
    <div className="rank-player"><strong>{entry.nickname}</strong>{rank === 1 && <span>TOP PILOT</span>}</div>
    <strong className="rank-score">{entry.score.toLocaleString()}<small>PTS</small></strong>
  </div>;
}
