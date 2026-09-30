/**
 * High-Performance HTML5 Canvas Game Engine for BOT BLITZ
 * Mobile-first touch controls, 60 FPS physics, hazard progression, power-ups, and particles
 */

import { sound } from './soundFx';
import { recordCollection, recordHazardHit } from './scoreValidation';

export class GameEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;

    // Callbacks to React
    this.onHUDUpdate = options.onHUDUpdate || (() => {});
    this.onGameOver = options.onGameOver || (() => {});
    this.session = options.session || null;

    // Viewport dimensions
    this.width = canvas.width;
    this.height = canvas.height;
    this.dpr = window.devicePixelRatio || 1;

    // Game state
    this.isRunning = false;
    this.isPaused = false;
    this.gameTimeRemaining = 60.0; // 60.0 seconds
    this.totalElapsedTime = 0;
    this.lastFrameTime = performance.now();
    this.score = 0;

    // Combo system
    this.combo = 1;
    this.comboTimer = 0;
    this.maxComboTime = 2.8; // seconds to keep combo alive

    // Active power-up
    this.activePowerUp = null; // { type, timeLeft, duration }

    // Screen effects
    this.screenShake = 0;
    this.redVignette = 0;
    this.systemOverloadActive = false;
    this.overloadBannerTimer = 0;

    // Player Robot
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      targetX: this.width / 2,
      targetY: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 20,
      angle: -Math.PI / 2,
      speed: 480, // pixels per second base speed
      isStunned: false,
      stunTime: 0,
      isInvulnerable: false,
      invulnerableTime: 0,
      shieldActive: false,
      isMalfunctioning: false,
    };

    // Entities
    this.collectibles = [];
    this.hazards = []; // drones, lasers, barriers, mines
    this.particles = [];
    this.floatingTexts = [];

    // Spawning timers
    this.spawnTimers = {
      battery: 0,
      core: 0,
      goldenCore: 0,
      powerup: 6.0, // first power-up spawns around 6s
      laser: 2.0,
      drone: 4.0,
      barrier: 5.0,
      mine: 3.0,
    };

    // 10s countdown tracking to play sound once per second
    this.lastCountdownSpoken = 11;

    // Bound handlers for cleanup
    this.handleTouchStart = this.onTouchStart.bind(this);
    this.handleTouchMove = this.onTouchMove.bind(this);
    this.handleTouchEnd = this.onTouchEnd.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);

    this.isDragging = false;

    this.initInput();
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5); // cap at 2.5 for mobile battery efficiency
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    this.ctx.resetTransform?.();
    this.ctx.scale(this.dpr, this.dpr);
  }

  initInput() {
    const el = this.canvas;
    // Mobile Touch
    el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    el.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    el.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    // Desktop Mouse
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  destroy() {
    this.isRunning = false;
    const el = this.canvas;
    el.removeEventListener('touchstart', this.handleTouchStart);
    el.removeEventListener('touchmove', this.handleTouchMove);
    el.removeEventListener('touchend', this.handleTouchEnd);
    el.removeEventListener('touchcancel', this.handleTouchEnd);

    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  setInputTarget(rawX, rawY) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = rawX - rect.left;
    const clientY = rawY - rect.top;

    if (this.player.isMalfunctioning) {
      // Reverse player controls relative to player pos
      const dx = clientX - this.player.x;
      const dy = clientY - this.player.y;
      this.player.targetX = Math.max(25, Math.min(this.width - 25, this.player.x - dx));
      this.player.targetY = Math.max(25, Math.min(this.height - 25, this.player.y - dy));
    } else {
      this.player.targetX = Math.max(25, Math.min(this.width - 25, clientX));
      this.player.targetY = Math.max(25, Math.min(this.height - 25, clientY));
    }
  }

  onTouchStart(e) {
    e.preventDefault();
    this.isDragging = true;
    if (e.touches && e.touches[0]) {
      this.setInputTarget(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (this.isDragging && e.touches && e.touches[0]) {
      this.setInputTarget(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.isDragging = false;
  }

  onMouseDown(e) {
    this.isDragging = true;
    this.setInputTarget(e.clientX, e.clientY);
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.setInputTarget(e.clientX, e.clientY);
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  start() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.player.x = this.width / 2;
    this.player.y = this.height / 2;
    this.player.targetX = this.width / 2;
    this.player.targetY = this.height / 2;

    // Initial spawn of safe batteries
    for (let i = 0; i < 4; i++) {
      this.spawnBattery();
    }
    this.spawnCore();

    requestAnimationFrame(this.loop.bind(this));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // clamp dt to max 100ms
    this.lastFrameTime = currentTime;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    if (this.gameTimeRemaining > 0) {
      requestAnimationFrame(this.loop.bind(this));
    } else {
      this.endGame();
    }
  }

  endGame() {
    this.isRunning = false;
    sound.playGameOver();

    // Trigger Game Over with final stats
    this.onGameOver({
      score: this.score,
      duration: Math.round(60 - this.gameTimeRemaining),
      session: this.session,
    });
  }

  // ==========================================
  // UPDATES & GAMEPLAY LOGIC
  // ==========================================
  update(dt) {
    this.gameTimeRemaining = Math.max(0, this.gameTimeRemaining - dt);
    this.totalElapsedTime += dt;
    const elapsed = 60.0 - this.gameTimeRemaining;

    // 10-Second Dramatic Countdown Audio
    const secondsFloor = Math.ceil(this.gameTimeRemaining);
    if (secondsFloor <= 10 && secondsFloor > 0 && secondsFloor !== this.lastCountdownSpoken) {
      this.lastCountdownSpoken = secondsFloor;
      sound.playCountdown(secondsFloor);
      this.addFloatingText(`${secondsFloor}`, this.width / 2, this.height * 0.4, '#ff2a55', 48, 0.9);
    }

    // Check System Overload (last 10 seconds: 50-60s)
    if (elapsed >= 50 && !this.systemOverloadActive) {
      this.systemOverloadActive = true;
      this.overloadBannerTimer = 3.5;
      sound.playOverload();
      this.screenShake = 12;
    }

    if (this.overloadBannerTimer > 0) {
      this.overloadBannerTimer -= dt;
    }

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }
    // Red Vignette decay
    if (this.redVignette > 0) {
      this.redVignette = Math.max(0, this.redVignette - dt * 2);
    }

    // Power-up Timer Update
    if (this.activePowerUp) {
      this.activePowerUp.timeLeft -= dt;
      if (this.activePowerUp.timeLeft <= 0) {
        // Power-up expired
        if (this.activePowerUp.type === 'MALFUNCTION') {
          this.player.isMalfunctioning = false;
        } else if (this.activePowerUp.type === 'SHIELD') {
          this.player.shieldActive = false;
        }
        this.activePowerUp = null;
      }
    }

    // Combo Timer Decay
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.comboTimer = 0;
      }
    }

    // Player Movement & Physics
    this.updatePlayer(dt);

    // Hazard & Entity Spawners
    this.handleSpawners(dt, elapsed);

    // Update Entities
    this.updateCollectibles(dt);
    this.updateHazards(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    // Collisions
    this.checkCollisions();

    // Push HUD updates (score, combo, time, active power-up)
    this.onHUDUpdate({
      score: this.score,
      timeRemaining: Math.ceil(this.gameTimeRemaining),
      combo: this.combo,
      comboProgress: this.combo > 1 ? this.comboTimer / this.maxComboTime : 0,
      activePowerUp: this.activePowerUp ? {
        type: this.activePowerUp.type,
        name: this.activePowerUp.name,
        progress: this.activePowerUp.timeLeft / this.activePowerUp.duration,
      } : null,
      isOverload: this.systemOverloadActive,
    });
  }

  updatePlayer(dt) {
    const p = this.player;

    // Invulnerability and Stun cooldowns
    if (p.isInvulnerable) {
      p.invulnerableTime -= dt;
      if (p.invulnerableTime <= 0) {
        p.isInvulnerable = false;
      }
    }

    if (p.isStunned) {
      p.stunTime -= dt;
      if (p.stunTime <= 0) {
        p.isStunned = false;
      }
      return; // Can't move while stunned
    }

    // Speed calculation
    let currentSpeed = p.speed;
    if (this.activePowerUp?.type === 'SPEED') {
      currentSpeed *= 1.45;
    }

    // Smooth lerp tracking to finger / cursor
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      // Calculate target angle
      const targetAngle = Math.atan2(dy, dx);
      // Smooth angle interpolation
      let angleDiff = targetAngle - p.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      p.angle += angleDiff * Math.min(1, dt * 16);

      // Move toward target
      const moveStep = Math.min(dist, currentSpeed * dt * Math.min(3, dist / 20));
      p.vx = (dx / dist) * moveStep;
      p.vy = (dy / dist) * moveStep;
      p.x += p.vx;
      p.y += p.vy;

      // Spawn thruster jet particles
      if (Math.random() < 0.8) {
        const jetAngle = p.angle + Math.PI + (Math.random() - 0.5) * 0.4;
        const jetSpeed = 80 + Math.random() * 80;
        this.particles.push({
          x: p.x - Math.cos(p.angle) * 16,
          y: p.y - Math.sin(p.angle) * 16,
          vx: Math.cos(jetAngle) * jetSpeed,
          vy: Math.sin(jetAngle) * jetSpeed,
          color: this.activePowerUp?.type === 'SPEED' ? '#ffdd00' : '#00f0ff',
          radius: 2 + Math.random() * 2.5,
          alpha: 1,
          decay: 2.5 + Math.random() * 2,
        });
      }
    }

    // Clamp inside arena walls
    p.x = Math.max(p.radius, Math.min(this.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(this.height - p.radius, p.y));
  }

  // ==========================================
  // DIFFICULTY PROGRESSION & SPAWNERS
  // ==========================================
  handleSpawners(dt, elapsed) {
    const st = this.spawnTimers;
    const isOverload = this.systemOverloadActive;
    const speedMultiplier = isOverload ? 1.4 : (elapsed > 40 ? 1.25 : 1.0);

    // 1. Batteries (constant supply)
    st.battery += dt * speedMultiplier;
    const maxBatteries = isOverload ? 7 : 5;
    if (st.battery > 1.2 && this.countCollectibles('BATTERY') < maxBatteries) {
      st.battery = 0;
      this.spawnBattery();
    }

    // 2. Blue Energy Cores
    st.core += dt * speedMultiplier;
    const maxCores = isOverload ? 4 : 3;
    if (st.core > 2.8 && this.countCollectibles('CORE') < maxCores) {
      st.core = 0;
      this.spawnCore();
    }

    // 3. Rare Golden Cores
    st.goldenCore += dt;
    if (st.goldenCore > 9.0 && this.countCollectibles('GOLDEN_CORE') < 2) {
      st.goldenCore = 0;
      if (Math.random() < 0.65 || isOverload) {
        this.spawnGoldenCore();
      }
    }

    // 4. Mystery Power-Ups
    st.powerup += dt;
    if (st.powerup > 12.0 && this.countCollectibles('POWERUP') < 1 && !this.activePowerUp) {
      st.powerup = 0;
      this.spawnPowerUp();
    }

    // ========================================
    // HAZARD DIFFICULTY PROGRESSION BY TIMELINE
    // ========================================

    // 10s+: Lasers start appearing
    if (elapsed >= 10) {
      st.laser += dt * speedMultiplier;
      const laserInterval = isOverload ? 2.5 : (elapsed > 40 ? 3.2 : 4.5);
      if (st.laser > laserInterval) {
        st.laser = 0;
        this.spawnLaser();
      }
    }

    // 20s+: Enemy Drones deploy
    if (elapsed >= 20) {
      st.drone += dt * speedMultiplier;
      const maxDrones = isOverload ? 4 : (elapsed > 40 ? 3 : 2);
      if (st.drone > 5.0 && this.countHazards('DRONE') < maxDrones) {
        st.drone = 0;
        this.spawnDrone(elapsed > 40 || isOverload);
      }
    }

    // 30s+: Electric Barriers
    if (elapsed >= 30) {
      st.barrier += dt * speedMultiplier;
      const maxBarriers = isOverload ? 3 : 2;
      if (st.barrier > 6.0 && this.countHazards('BARRIER') < maxBarriers) {
        st.barrier = 0;
        this.spawnBarrier();
      }
    }

    // Mines (occasional obstacles)
    st.mine += dt;
    const maxMines = elapsed < 10 ? 1 : (isOverload ? 4 : 3);
    if (st.mine > 4.5 && this.countHazards('MINE') < maxMines) {
      st.mine = 0;
      this.spawnMine();
    }
  }

  countCollectibles(type) {
    return this.collectibles.filter(c => c.type === type).length;
  }

  countHazards(type) {
    return this.hazards.filter(h => h.type === type).length;
  }

  // ==========================================
  // SPAWN HELPERS
  // ==========================================
  getSafeRandomPos(padding = 50) {
    return {
      x: padding + Math.random() * (this.width - padding * 2),
      y: padding + Math.random() * (this.height - padding * 2),
    };
  }

  spawnBattery() {
    const pos = this.getSafeRandomPos(40);
    this.collectibles.push({
      type: 'BATTERY',
      x: pos.x,
      y: pos.y,
      radius: 14,
      points: 100,
      color: '#00ff88',
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  spawnCore() {
    const pos = this.getSafeRandomPos(45);
    this.collectibles.push({
      type: 'CORE',
      x: pos.x,
      y: pos.y,
      radius: 17,
      points: 300,
      color: '#00f0ff',
      bobOffset: Math.random() * Math.PI * 2,
      rotation: 0,
    });
  }

  spawnGoldenCore() {
    const pos = this.getSafeRandomPos(50);
    this.collectibles.push({
      type: 'GOLDEN_CORE',
      x: pos.x,
      y: pos.y,
      radius: 20,
      points: 750,
      color: '#ffd700',
      bobOffset: Math.random() * Math.PI * 2,
      rotation: 0,
      sparkleTimer: 0,
    });
  }

  spawnPowerUp() {
    const pos = this.getSafeRandomPos(50);
    const types = ['SHIELD', 'MAGNET', 'DOUBLE', 'TIME_SLOW', 'SPEED', 'MALFUNCTION'];
    // Malfunction has ~6% chance, other 5 power-ups share 94%
    const isNegative = Math.random() < 0.06;
    const selectedType = isNegative ? 'MALFUNCTION' : types[Math.floor(Math.random() * 5)];

    this.collectibles.push({
      type: 'POWERUP',
      powerType: selectedType,
      x: pos.x,
      y: pos.y,
      radius: 18,
      points: 50,
      color: selectedType === 'MALFUNCTION' ? '#ff007f' : '#a855f7',
      bobOffset: Math.random() * Math.PI * 2,
      rotation: 0,
    });
  }

  spawnLaser() {
    // Laser sweeps across screen: horizontal, vertical, or angled
    const isHorizontal = Math.random() > 0.5;
    const telegraphDuration = 1.25;
    const fireDuration = 0.95;

    let x1, y1, x2, y2;
    if (isHorizontal) {
      const y = 60 + Math.random() * (this.height - 120);
      x1 = 0;
      y1 = y;
      x2 = this.width;
      y2 = y;
    } else {
      const x = 50 + Math.random() * (this.width - 100);
      x1 = x;
      y1 = 0;
      x2 = x;
      y2 = this.height;
    }

    this.hazards.push({
      type: 'LASER',
      x1, y1, x2, y2,
      thickness: 14,
      state: 'TELEGRAPH', // TELEGRAPH -> ACTIVE -> DONE
      stateTimer: telegraphDuration,
      fireDuration,
    });
  }

  spawnDrone(isFast = false) {
    const pos = this.getSafeRandomPos(60);
    // Don't spawn directly on top of player
    if (Math.hypot(pos.x - this.player.x, pos.y - this.player.y) < 140) {
      pos.x = (pos.x + this.width / 2) % (this.width - 60) + 30;
    }

    const baseSpeed = isFast ? 170 : 110;
    const angle = Math.random() * Math.PI * 2;

    this.hazards.push({
      type: 'DRONE',
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      radius: 16,
      angle: angle,
      isFast,
      pulse: 0,
    });
  }

  spawnBarrier() {
    const isHorizontal = Math.random() > 0.5;
    const length = isHorizontal ? 140 : 120;
    const speed = 80 + Math.random() * 50;

    let x = isHorizontal ? 20 : (Math.random() > 0.5 ? 40 : this.width - 40);
    let y = isHorizontal ? (Math.random() > 0.5 ? 60 : this.height - 60) : 40;
    let vx = isHorizontal ? speed : 0;
    let vy = isHorizontal ? 0 : speed;

    this.hazards.push({
      type: 'BARRIER',
      x, y,
      vx, vy,
      isHorizontal,
      length,
      thickness: 12,
    });
  }

  spawnMine() {
    const pos = this.getSafeRandomPos(50);
    if (Math.hypot(pos.x - this.player.x, pos.y - this.player.y) < 120) {
      return; // skip if too close to player
    }

    this.hazards.push({
      type: 'MINE',
      x: pos.x,
      y: pos.y,
      radius: 14,
      pulse: 0,
      lifetime: 14.0, // despawns after 14s
    });
  }

  // ==========================================
  // UPDATE ENTITIES
  // ==========================================
  updateCollectibles(dt) {
    const isMagnet = this.activePowerUp?.type === 'MAGNET';
    const magnetRadius = 220;

    for (const c of this.collectibles) {
      c.bobOffset += dt * 3.5;
      if (c.rotation !== undefined) {
        c.rotation += dt * 2.2;
      }

      // Magnet attraction
      if (isMagnet) {
        const dx = this.player.x - c.x;
        const dy = this.player.y - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < magnetRadius && dist > 5) {
          const pullSpeed = 380 * (1 - dist / magnetRadius) + 120;
          c.x += (dx / dist) * pullSpeed * dt;
          c.y += (dy / dist) * pullSpeed * dt;
        }
      }

      // Sparkles for golden core
      if (c.type === 'GOLDEN_CORE') {
        c.sparkleTimer = (c.sparkleTimer || 0) + dt;
        if (c.sparkleTimer > 0.08) {
          c.sparkleTimer = 0;
          this.particles.push({
            x: c.x + (Math.random() - 0.5) * 25,
            y: c.y + (Math.random() - 0.5) * 25,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            color: '#ffd700',
            radius: 1.5 + Math.random() * 2,
            alpha: 1,
            decay: 2.0,
          });
        }
      }
    }
  }

  updateHazards(dt) {
    const isTimeSlow = this.activePowerUp?.type === 'TIME_SLOW';
    const hazardSpeedScale = isTimeSlow ? 0.45 : 1.0;

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];

      if (h.type === 'DRONE') {
        h.pulse += dt * 4;
        h.x += h.vx * hazardSpeedScale * dt;
        h.y += h.vy * hazardSpeedScale * dt;

        // Bounce off arena walls
        if (h.x - h.radius < 10) { h.x = 10 + h.radius; h.vx = Math.abs(h.vx); }
        if (h.x + h.radius > this.width - 10) { h.x = this.width - 10 - h.radius; h.vx = -Math.abs(h.vx); }
        if (h.y - h.radius < 10) { h.y = 10 + h.radius; h.vy = Math.abs(h.vy); }
        if (h.y + h.radius > this.height - 10) { h.y = this.height - 10 - h.radius; h.vy = -Math.abs(h.vy); }

        h.angle = Math.atan2(h.vy, h.vx);
      } 
      else if (h.type === 'LASER') {
        h.stateTimer -= dt * (isTimeSlow ? 0.6 : 1.0);
        if (h.state === 'TELEGRAPH' && h.stateTimer <= 0) {
          h.state = 'ACTIVE';
          h.stateTimer = h.fireDuration;
          sound.playTone(850, 'sawtooth', 0.2, 0.2, -300);
        } else if (h.state === 'ACTIVE' && h.stateTimer <= 0) {
          // Remove laser
          this.hazards.splice(i, 1);
        }
      } 
      else if (h.type === 'BARRIER') {
        h.x += h.vx * hazardSpeedScale * dt;
        h.y += h.vy * hazardSpeedScale * dt;

        // Bounce back and forth
        if (h.isHorizontal) {
          if (h.x < 15) { h.x = 15; h.vx = Math.abs(h.vx); }
          if (h.x + h.length > this.width - 15) { h.x = this.width - 15 - h.length; h.vx = -Math.abs(h.vx); }
        } else {
          if (h.y < 15) { h.y = 15; h.vy = Math.abs(h.vy); }
          if (h.y + h.length > this.height - 15) { h.y = this.height - 15 - h.length; h.vy = -Math.abs(h.vy); }
        }
      }
      else if (h.type === 'MINE') {
        h.pulse += dt * 3.5;
        h.lifetime -= dt;
        if (h.lifetime <= 0) {
          this.hazards.splice(i, 1);
        }
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 45 * dt;
      t.alpha -= t.decay * dt;
      if (t.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  addFloatingText(text, x, y, color = '#00f0ff', size = 18, decay = 1.0) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      size,
      alpha: 1,
      decay,
    });
  }

  // ==========================================
  // COLLISIONS
  // ==========================================
  checkCollisions() {
    const p = this.player;

    // 1. Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const dist = Math.hypot(p.x - c.x, p.y - c.y);

      if (dist < p.radius + c.radius) {
        // Collected item!
        this.collectibles.splice(i, 1);
        this.onCollectItem(c);
      }
    }

    // 2. Hazards
    if (!p.isInvulnerable) {
      for (const h of this.hazards) {
        let isHit = false;

        if (h.type === 'DRONE' || h.type === 'MINE') {
          const dist = Math.hypot(p.x - h.x, p.y - h.y);
          if (dist < p.radius + h.radius) {
            isHit = true;
          }
        } else if (h.type === 'LASER' && h.state === 'ACTIVE') {
          // Point to line segment distance
          if (this.distToSegment(p.x, p.y, h.x1, h.y1, h.x2, h.y2) < p.radius + h.thickness / 2) {
            isHit = true;
          }
        } else if (h.type === 'BARRIER') {
          // Bounding box / line check
          const x2 = h.isHorizontal ? h.x + h.length : h.x;
          const y2 = h.isHorizontal ? h.y : h.y + h.length;
          if (this.distToSegment(p.x, p.y, h.x, h.y, x2, y2) < p.radius + h.thickness / 2) {
            isHit = true;
          }
        }

        if (isHit) {
          this.onPlayerHit();
          break; // break to avoid multiple hits in same frame
        }
      }
    }
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // ==========================================
  // ITEM COLLECTION & COMBO LOGIC
  // ==========================================
  onCollectItem(c) {
    const isDouble = this.activePowerUp?.type === 'DOUBLE';
    const isOverload = this.systemOverloadActive;
    const overloadMultiplier = isOverload ? 1.5 : 1.0;

    // Handle Power-Up Item
    if (c.type === 'POWERUP') {
      this.triggerPowerUp(c.powerType);
    }

    // Points calculation
    const basePts = Math.round(c.points * overloadMultiplier);
    const earnedPoints = Math.round(basePts * this.combo * (isDouble ? 2 : 1));

    this.score += earnedPoints;

    // Anti-cheat verification logging
    if (this.session) {
      recordCollection(this.session, c.type, basePts, this.combo, isDouble);
    }

    // Combo progression
    if (this.combo < 5) {
      this.combo += 1;
    }
    this.comboTimer = this.maxComboTime;

    // Sounds
    if (c.type === 'GOLDEN_CORE') {
      sound.playRareCollect();
    } else if (c.type === 'POWERUP') {
      sound.playPowerUp();
    } else {
      sound.playCollect(this.combo);
    }

    // Floating text feedback
    const textDesc = isDouble ? `+${earnedPoints} (2X)` : `+${earnedPoints}`;
    const textColor = c.type === 'GOLDEN_CORE' ? '#ffd700' : (isDouble ? '#ffdd00' : c.color);
    this.addFloatingText(textDesc, c.x, c.y - 10, textColor, c.type === 'GOLDEN_CORE' ? 22 : 17);

    // Sparkle burst particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 120;
      this.particles.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: c.color,
        radius: 2 + Math.random() * 2,
        alpha: 1,
        decay: 2.2,
      });
    }
  }

  triggerPowerUp(type) {
    if (type === 'SHIELD') {
      this.player.shieldActive = true;
      this.activePowerUp = { type, name: 'SHIELD', timeLeft: 12.0, duration: 12.0 };
      this.addFloatingText('SHIELD ONLINE!', this.player.x, this.player.y - 30, '#00f0ff', 20, 1.2);
    } else if (type === 'MAGNET') {
      this.activePowerUp = { type, name: 'MAGNET', timeLeft: 8.0, duration: 8.0 };
      this.addFloatingText('MAGNET ACTIVE!', this.player.x, this.player.y - 30, '#a855f7', 20, 1.2);
    } else if (type === 'DOUBLE') {
      this.activePowerUp = { type, name: '2X POINTS', timeLeft: 8.0, duration: 8.0 };
      this.addFloatingText('DOUBLE POINTS!', this.player.x, this.player.y - 30, '#ffd700', 22, 1.2);
    } else if (type === 'TIME_SLOW') {
      this.activePowerUp = { type, name: 'TIME SLOW', timeLeft: 6.0, duration: 6.0 };
      this.addFloatingText('TIME WARP!', this.player.x, this.player.y - 30, '#00ff88', 20, 1.2);
    } else if (type === 'SPEED') {
      this.activePowerUp = { type, name: 'SPEED BOOST', timeLeft: 7.0, duration: 7.0 };
      this.addFloatingText('TURBO SPEED!', this.player.x, this.player.y - 30, '#ff6600', 20, 1.2);
    } else if (type === 'MALFUNCTION') {
      // Rare negative
      sound.playMalfunction();
      this.player.isMalfunctioning = true;
      this.activePowerUp = { type, name: 'MALFUNCTION', timeLeft: 3.0, duration: 3.0 };
      this.screenShake = 6;
      this.addFloatingText('SYSTEM MALFUNCTION!', this.player.x, this.player.y - 30, '#ff007f', 22, 1.5);
    }
  }

  // ==========================================
  // HAZARD COLLISION HANDLER
  // ==========================================
  onPlayerHit() {
    const p = this.player;

    // Check if Shield absorbs hit!
    if (p.shieldActive) {
      p.shieldActive = false;
      this.activePowerUp = null;
      p.isInvulnerable = true;
      p.invulnerableTime = 1.0;
      sound.playTone(300, 'square', 0.2, 0.3, -150);
      this.addFloatingText('SHIELD BROKEN!', p.x, p.y - 25, '#00f0ff', 20, 1.2);
      this.screenShake = 5;
      return;
    }

    // Normal Hazard Hit:
    // Stun player, deduct points, reset combo, shake & flash
    p.isStunned = true;
    p.stunTime = 0.75;
    p.isInvulnerable = true;
    p.invulnerableTime = 1.6;

    // Reset combo
    this.combo = 1;
    this.comboTimer = 0;

    // Deduct points (-150)
    const penalty = 150;
    this.score = Math.max(0, this.score - penalty);

    if (this.session) {
      recordHazardHit(this.session, penalty);
    }

    // Audio & Screen Effects
    sound.playHit();
    if (navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }
    this.screenShake = 10;
    this.redVignette = 1.0;

    this.addFloatingText(`-${penalty}`, p.x, p.y - 25, '#ff2a55', 22, 1.2);

    // Collision shockwave sparks
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 160;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: '#ff2a55',
        radius: 2 + Math.random() * 3,
        alpha: 1,
        decay: 3.0,
      });
    }
  }

  // ==========================================
  // RENDERING ENGINE
  // ==========================================
  render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen Shake offset
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Cyber Arena Floor
    this.renderArena(ctx);

    // 2. Draw Hazards
    this.renderHazards(ctx);

    // 3. Draw Collectibles
    this.renderCollectibles(ctx);

    // 4. Draw Particles
    this.renderParticles(ctx);

    // 5. Draw Player Robot
    this.renderPlayer(ctx);

    // 6. Draw Floating Combat Text
    this.renderFloatingTexts(ctx);

    // 7. Red Vignette Flash
    if (this.redVignette > 0) {
      ctx.fillStyle = `rgba(255, 42, 85, ${this.redVignette * 0.4})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 8. System Overload Warning Banner
    if (this.overloadBannerTimer > 0) {
      this.renderOverloadBanner(ctx);
    }

    ctx.restore();
  }

  renderArena(ctx) {
    // Cyber arena dark background
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid pattern
    const gridSize = 32;
    const gridColor = this.systemOverloadActive 
      ? 'rgba(255, 42, 85, 0.15)' 
      : 'rgba(0, 240, 255, 0.08)';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y <= this.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // Arena glowing boundary border
    ctx.strokeStyle = this.systemOverloadActive 
      ? 'rgba(255, 42, 85, 0.8)' 
      : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, this.width - 6, this.height - 6);
  }

  renderPlayer(ctx) {
    const p = this.player;

    // Invulnerability blinking
    if (p.isInvulnerable && Math.floor(Date.now() / 80) % 2 === 0) {
      return; // Skip frame for blink effect
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // 1. Thruster Glow
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(-14, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Robot Chassis (Futuristic Diamond/Arrow Shape)
    ctx.fillStyle = p.isStunned ? '#ff2a55' : (p.isMalfunctioning ? '#ff007f' : '#0f172a');
    ctx.strokeStyle = p.isStunned ? '#ffffff' : (p.isMalfunctioning ? '#ff007f' : '#00f0ff');
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(18, 0);           // Front nose
    ctx.lineTo(-12, -14);        // Top rear wing
    ctx.lineTo(-6, 0);           // Rear notch
    ctx.lineTo(-12, 14);         // Bottom rear wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Glowing Center Core / Eye
    ctx.fillStyle = p.isStunned ? '#ffffff' : '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(3, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 4. Shield Bubble
    if (p.shieldActive) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 5. Magnet Aura Ring
    if (this.activePowerUp?.type === 'MAGNET') {
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  renderCollectibles(ctx) {
    for (const c of this.collectibles) {
      const bob = Math.sin(c.bobOffset) * 3;
      const cy = c.y + bob;

      ctx.save();
      ctx.translate(c.x, cy);

      if (c.type === 'BATTERY') {
        // Green Battery
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        // Battery body
        ctx.fillRect(-8, -12, 16, 24);
        // Terminal cap
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4, -15, 8, 3);
        // Inner lightning icon
        ctx.fillStyle = '#07090e';
        ctx.beginPath();
        ctx.moveTo(1, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(-1, 7);
        ctx.lineTo(4, -1);
        ctx.lineTo(0, -1);
        ctx.closePath();
        ctx.fill();
      } 
      else if (c.type === 'CORE') {
        // Blue Energy Core
        ctx.rotate(c.rotation);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.arc(0, 0, c.radius - 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-11, -11, 22, 22);
      } 
      else if (c.type === 'GOLDEN_CORE') {
        // Golden Rare Core
        ctx.rotate(c.rotation);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.arc(0, 0, c.radius - 2, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing outer crown
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i * Math.PI) / 3;
          const r = c.radius + 3;
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        ctx.stroke();
      } 
      else if (c.type === 'POWERUP') {
        // Mystery Power-Up Box
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 16;

        ctx.fillRect(-12, -12, 24, 24);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);

        // '?' Glyph
        ctx.rotate(-c.rotation); // keep question mark upright
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 1);
      }

      ctx.restore();
    }
  }

  renderHazards(ctx) {
    for (const h of this.hazards) {
      ctx.save();

      if (h.type === 'DRONE') {
        ctx.translate(h.x, h.y);
        ctx.rotate(h.angle);

        // Drone hull (triangular predator)
        ctx.fillStyle = '#1e1b2e';
        ctx.strokeStyle = '#ff2a55';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff2a55';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-12, -12);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing red optic eye
        ctx.fillStyle = '#ff2a55';
        ctx.beginPath();
        ctx.arc(3, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (h.type === 'LASER') {
        if (h.state === 'TELEGRAPH') {
          // Warning guide dashed line
          ctx.strokeStyle = 'rgba(255, 42, 85, 0.4)';
          ctx.setLineDash([8, 8]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(h.x1, h.y1);
          ctx.lineTo(h.x2, h.y2);
          ctx.stroke();
        } else if (h.state === 'ACTIVE') {
          // Active lethal laser
          ctx.strokeStyle = 'rgba(255, 42, 85, 0.9)';
          ctx.lineWidth = h.thickness;
          ctx.shadowColor = '#ff2a55';
          ctx.shadowBlur = 20;

          ctx.beginPath();
          ctx.moveTo(h.x1, h.y1);
          ctx.lineTo(h.x2, h.y2);
          ctx.stroke();

          // Laser core white beam
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      } 
      else if (h.type === 'BARRIER') {
        ctx.strokeStyle = '#ff2a55';
        ctx.lineWidth = h.thickness;
        ctx.shadowColor = '#ff2a55';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        if (h.isHorizontal) {
          ctx.moveTo(h.x, h.y);
          ctx.lineTo(h.x + h.length, h.y);
        } else {
          ctx.moveTo(h.x, h.y);
          ctx.lineTo(h.x, h.y + h.length);
        }
        ctx.stroke();

        // High voltage electric sparks
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 2;
        ctx.stroke();
      } 
      else if (h.type === 'MINE') {
        ctx.translate(h.x, h.y);
        const pulseScale = 1 + Math.sin(h.pulse) * 0.12;

        ctx.fillStyle = '#1c1917';
        ctx.strokeStyle = '#ff2a55';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff2a55';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, h.radius * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pulsing red core
        ctx.fillStyle = '#ff2a55';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderFloatingTexts(ctx) {
    ctx.save();
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px Orbitron, Rajdhani, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  renderOverloadBanner(ctx) {
    ctx.save();
    const bannerY = this.height * 0.28;
    ctx.fillStyle = 'rgba(255, 42, 85, 0.85)';
    ctx.fillRect(0, bannerY - 24, this.width, 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText('⚠️ SYSTEM OVERLOAD! ⚠️', this.width / 2, bannerY);
    ctx.restore();
  }
}
