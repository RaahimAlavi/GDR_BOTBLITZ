import { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { getScoreTarget, listScoreJobs, pendingScoreCount, SYNC_EVENT } from '../lib/scoreOutbox';

function queueState() {
  try {const jobs = listScoreJobs().filter(job => job.state !== 'synced'); return {count:jobs.length, blocked:jobs.some(job => job.state === 'blocked')};}
  catch {return {count:0, blocked:false};}
}

export function ScoreSyncBootstrap() {
  useEffect(() => {
    let loading = false, active = true;
    const resume = () => {
      let legacy = false;
      try {legacy = getScoreTarget() !== 'demo' && JSON.parse(localStorage.getItem('botblitz_local_scores_v1') || '[]').some(row => row.id?.startsWith('local_'));} catch { /* Invalid legacy storage. */ }
      if (loading || (!pendingScoreCount() && !legacy)) return;
      loading = true;
      import('../lib/supabase').then(module => {if (active) module.startScoreSync();})
        .catch(() => { /* An offline chunk load leaves scores in the durable queue. */ })
        .finally(() => {loading = false;});
    };
    resume();
    for (const event of ['online', 'pageshow', 'storage', SYNC_EVENT]) window.addEventListener(event, resume);
    const visible = () => {if (document.visibilityState !== 'hidden') resume();};
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      for (const event of ['online', 'pageshow', 'storage', SYNC_EVENT]) window.removeEventListener(event, resume);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return null;
}

export default function ScoreSyncNotice() {
  const [{count, blocked}, setQueue] = useState(queueState);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    const update = () => setQueue(queueState());
    window.addEventListener(SYNC_EVENT, update); window.addEventListener('storage', update);
    return () => {window.removeEventListener(SYNC_EVENT, update); window.removeEventListener('storage', update);};
  }, []);
  if (!count) return null;
  async function retry() {
    setRetrying(true);
    try {const module = await import('../lib/supabase'); await module.retryQueuedScores();}
    catch { /* The queue is retained while offline. */ }
    finally {setRetrying(false);}
  }
  return <div className="sync-notice" role="status"><CloudUpload size={18} /><span>{count} {count === 1 ? 'score' : 'scores'} saved on this device. {blocked ? 'An upload needs attention.' : 'Sync resumes automatically.'}</span><button onClick={retry} disabled={retrying}>{retrying ? 'Syncing…' : 'Try sync'}</button></div>;
}
