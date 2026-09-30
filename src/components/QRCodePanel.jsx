import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Zap } from 'lucide-react';

export default function QRCodePanel() {
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Use configured play URL or dynamic origin URL
  const playUrl = import.meta.env.VITE_PLAY_URL || (typeof window !== 'undefined' ? `${window.location.origin}/play` : 'https://botblitz.soc/play');

  useEffect(() => {
    QRCode.toDataURL(playUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#07090e',
        light: '#00f0ff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [playUrl]);

  return (
    <div className="relative p-6 rounded-2xl bg-cyber-card border-2 border-cyber-neonCyan/50 shadow-neon-cyan flex flex-col items-center text-center overflow-hidden">
      {/* Decorative corner glows */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-cyber-neonCyan/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyber-neonGreen/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Accent */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyber-neonCyan/40 text-cyber-neonCyan text-[11px] font-mono uppercase tracking-widest mb-3">
        <Smartphone className="w-3.5 h-3.5 animate-pulse" />
        <span>INSTANT MOBILE PLAY</span>
      </div>

      <h3 className="text-xl sm:text-2xl font-black font-display tracking-wider text-white">
        THINK YOU CAN TAKE #1?
      </h3>

      <p className="text-sm font-mono text-cyber-neonGreen font-bold tracking-widest uppercase my-1">
        SCAN TO PLAY
      </p>

      {/* QR Code Container */}
      <div className="my-4 p-2.5 rounded-xl bg-cyber-neonCyan shadow-lg transition-transform hover:scale-105 duration-300">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Scan QR code to play BOT BLITZ"
            className="w-48 h-48 sm:w-52 sm:h-52 rounded-lg block"
          />
        ) : (
          <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center bg-slate-900 text-xs font-mono text-slate-400">
            Generating QR Code...
          </div>
        )}
      </div>

      {/* Call to action lines */}
      <div className="text-xs font-mono text-slate-300 space-y-1 font-semibold tracking-wider">
        <p className="text-white">60 SECONDS.</p>
        <p className="text-cyber-neonCyan">ONE ROBOT.</p>
        <p className="text-cyber-danger font-bold">NO EXCUSES.</p>
      </div>

      {/* Display play URL link for manual entry */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-center gap-1 text-[11px] font-mono text-slate-400 truncate">
        <Zap className="w-3 h-3 text-cyber-gold" />
        <span className="truncate">{playUrl}</span>
      </div>
    </div>
  );
}
