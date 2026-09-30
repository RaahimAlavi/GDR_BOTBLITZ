import { nameKey } from './playerNames.js';

export function bestScoresByName(rows, limit = Infinity) {
  const best = new Map();
  for (const row of rows) {
    const key = nameKey(row.nickname);
    const previous = best.get(key);
    if (!previous || row.score > previous.score || (row.score === previous.score &&
      (row.created_at < previous.created_at || (row.created_at === previous.created_at && row.id < previous.id)))) best.set(key, row);
  }
  return [...best.values()].sort((a,b) => b.score - a.score || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)).slice(0,limit);
}

// Page through runs until enough distinct names are found. A limit on raw runs
// would hide players when one person holds several of the highest scores.
export async function fetchBestScores(client, {since, limit = 10, pageSize = 200, higherThan} = {}) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from('scores').select('*').order('score', {ascending:false})
      .order('created_at', {ascending:true}).order('id', {ascending:true}).range(offset, offset + pageSize - 1);
    if (since) query = query.gte('created_at', since);
    if (higherThan !== undefined) query = query.gt('score', higherThan);
    const {data, error} = await query;
    if (error) throw error;
    rows.push(...(data || []));
    const best = bestScoresByName(rows, limit);
    if ((data || []).length < pageSize || best.length >= limit) return best;
  }
}

export function kioskStats(rows) {
  return {totalPlayersToday:new Set(rows.map(row => nameKey(row.nickname))).size,
    gamesPlayedToday:rows.length, highestScoreToday:rows.reduce((best,row)=>Math.max(best,row.score),0)};
}
