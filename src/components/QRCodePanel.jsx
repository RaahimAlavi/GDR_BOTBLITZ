import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ArrowUpRight, Smartphone } from 'lucide-react';
import { resolvePlayUrl, isLoopbackUrl } from '../lib/playUrl';
export default function QRCodePanel() {
  const [qr, setQr] = useState('');
  const playUrl = resolvePlayUrl(import.meta.env.VITE_PLAY_URL, window.location.origin);
  const localOnly = isLoopbackUrl(playUrl);
  useEffect(() => {
    let active = true;
    if (localOnly) return;
    QRCode.toDataURL(playUrl, {width:280, margin:4, color:{dark:'#0b1420', light:'#ffffff'}})
      .then(value => {if (active) setQr(value);}).catch(() => {});
    return () => {active = false;};
  }, [playUrl, localOnly]);
  return <aside className="qr-panel">
    <span className="eyebrow"><Smartphone size={16} /> YOUR PHONE. YOUR TURN.</span>
    <h2>Next stop:<br /><span>the top spot.</span></h2>
    <p className="muted">{localOnly ? 'Open the deployed leaderboard to scan and play on your phone.' : 'Scan with your camera. Open the link. Play.'}</p>
    <div className={localOnly ? 'qr-local-notice' : 'qr-image'}>{localOnly ? <><Smartphone size={32} /><span>Phone QR available on the public site</span></> : qr ? <img src={qr} alt="Scan to play BOT BLITZ" width="224" height="224" /> : <span>Making your QR code…</span>}</div>
    {!localOnly && <p className="qr-destination">{new URL(playUrl).host}/play</p>}
    <div className="qr-facts"><span>60 SECONDS</span><span>3 HEARTS</span><span>∞ REMATCHES</span></div>
    <a className="quiet-link" href={playUrl}>Open the game <ArrowUpRight size={16} /></a>
  </aside>;
}
