export async function stableScoreId(sessionId) {
  if (/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(sessionId)) return sessionId;
  // Older locally saved runs may predate UUID session IDs.
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('BOTBLITZ:' + sessionId))).slice(0,16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function uploadQueuedScore(client, payload, {signal}) {
  const find = () => client.from('scores').select('*').eq('session_id',payload.session_id).limit(1).maybeSingle().abortSignal(signal);
  const existing = await find();
  if (existing.error) throw Object.assign(new Error(existing.error.message), existing.error, {status:existing.status});
  if (existing.data) return existing.data;
  if (payload.name_token) {
    const {name_token, ...run} = payload;
    const result = await client.rpc('submit_named_score', {p_token:name_token, p_run:{...run, id:await stableScoreId(run.session_id)}}).abortSignal(signal);
    if (result.error) throw Object.assign(new Error(result.error.message),result.error,{status:result.status});
    return result.data;
  }
  const result = await client.from('scores').insert({...payload, id:await stableScoreId(payload.session_id)}).select().single().abortSignal(signal);
  if (!result.error) return result.data;
  if (result.error.code === '23505') {
    const confirmed = await find();
    if (confirmed.data) return confirmed.data;
  }
  throw Object.assign(new Error(result.error.message), result.error, {status:result.status});
}
