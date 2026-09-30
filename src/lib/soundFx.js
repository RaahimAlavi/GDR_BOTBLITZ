/**
 * Web Audio API Sound Synthesizer for BOT BLITZ
 * Zero-dependency, low-latency, works smoothly on mobile and desktop
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('botblitz_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  isMuted() {
    return this.muted;
  }

  setMuted(mute) {
    this.muted = mute;
    localStorage.setItem('botblitz_muted', mute ? 'true' : 'false');
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15, pitchBend = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (pitchBend !== 0) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freq + pitchBend),
          this.ctx.currentTime + duration
        );
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // AudioContext policy or closed
    }
  }

  playCollect(combo = 1) {
    if (this.muted) return;
    this.init();
    // Pitch increases with combo multiplier (x1: 520Hz, x5: 980Hz)
    const baseFreq = 500 + Math.min(combo, 5) * 90;
    this.playTone(baseFreq, 'sine', 0.1, 0.2, 180);
  }

  playRareCollect() {
    if (this.muted) return;
    this.init();
    // Multi-tone sparkly chime
    const notes = [659, 830, 987, 1318];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.18, 0.22, 100);
      }, idx * 45);
    });
  }

  playPowerUp() {
    if (this.muted) return;
    this.init();
    // Ascending arpeggio
    const chord = [440, 554, 659, 880, 1108];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.14, 0.12, 150);
      }, idx * 50);
    });
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Low punchy impact + noise
      this.playTone(160, 'sawtooth', 0.25, 0.35, -90);

      // Noise burst buffer
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start();
    } catch {
      // fallback
    }
  }

  playMalfunction() {
    if (this.muted) return;
    this.init();
    // Glitchy warble
    this.playTone(280, 'sawtooth', 0.1, 0.2, -100);
    setTimeout(() => this.playTone(180, 'sawtooth', 0.15, 0.2, 80), 80);
    setTimeout(() => this.playTone(120, 'sawtooth', 0.2, 0.25, -50), 180);
  }

  playCountdown(number) {
    if (this.muted) return;
    this.init();
    if (number <= 3) {
      // Urgent high beep for 3, 2, 1
      this.playTone(950, 'square', 0.12, 0.25, 0);
    } else {
      // Regular warning beep
      this.playTone(650, 'sine', 0.1, 0.18, 0);
    }
  }

  playOverload() {
    if (this.muted) return;
    this.init();
    // Dramatic rising siren sweep
    this.playTone(350, 'sawtooth', 0.5, 0.25, 450);
  }

  playGameOver() {
    if (this.muted) return;
    this.init();
    const melody = [587, 523, 440, 392, 330];
    melody.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.3, 0.25, -20);
      }, idx * 120);
    });
  }

  playHighScore() {
    if (this.muted) return;
    this.init();
    // Triumphant fanfare
    const fanfare = [523.25, 659.25, 783.99, 1046.5];
    fanfare.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.25, 0.18, 50);
      }, idx * 100);
    });
  }
}

export const sound = new SoundEngine();
