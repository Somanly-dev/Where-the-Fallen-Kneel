'use strict';

// The Foundry (the arena boss): ten more attacks, and guard attacks that keep the core dangerous while it is open.

class BallShot extends BossShot {                                  // a big energy ball that bounces off the floor and the walls
  update(dt, w) {
    this.age += dt; this.life -= dt;
    this.vy += 520 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.y + this.h / 2 >= GROUND_Y) { this.y = GROUND_Y - this.h / 2; this.vy = -Math.abs(this.vy) * 0.96 - 60; }
    if (this.y < 50) { this.y = 50; this.vy = Math.abs(this.vy); }
    if (this.x < 30 || this.x > 432) { this.vx = -this.vx; this.x = clamp(this.x, 30, 432); }
    if (this.life <= 0) this.dead = true;
  }
}

Object.assign(FoundryCore.prototype, {
  // guard attacks while the core is open: standing at the core is never free
  guard(w) {
    const p = w.player, r = Math.floor(Math.random() * 3);
    if (r === 0) { Sfx.play('warn'); this.zone({ x: 330, y: GROUND_Y - 12, w: 112, h: 12 }, 0.55, 0.3); }
    else if (r === 1) { Sfx.play('warn'); [0, p.x > this.x - 60 ? -52 : 52].forEach(o => this.zone({ x: clamp(p.x + o, 30, 450) - 8, y: 30, w: 16, h: GROUND_Y - 30 }, 0.6, 0.22)); }
    else { Sfx.play('roar'); const cx = this.x - 6, cy = GROUND_Y - 24; for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + (i + 0.5) * Math.PI / 6; fshot(this, 'plasma', cx, cy, Math.cos(a) * 120, -Math.sin(a) * 120, { w: 10, h: 10, ground: false, life: 3 }); } }
  },
  waveDir(b, w, pl, dir) { Sfx.play('slam'); w.shake(4); dustWave(w, pl.c, dir, 8); fshot(b, 'shock', pl.c + dir * 26, GROUND_Y - 10, dir * 175, 0, { w: 22, h: 30, ground: false, life: 3.4 }); },

  // the far-left piston slams again and again: a line of waves, each a beat apart
  mRelay(w) {
    const pl = w.pistons[0], ev = [[0, (b, w2) => { Sfx.play('warn'); pl.heat = 3; b.rise(w2, pl, 112, 260); }]], n = this.phase === 2 ? 6 : 4, gap = this.phase === 2 ? 0.5 : 0.62;
    for (let k = 0; k < n; k++) { const t0 = 0.8 + k * gap; ev.push([t0, (b, w2) => { b.rise(w2, pl, 190, 1500); b.waveDir(b, w2, pl, 1); }], [t0 + gap * 0.45, (b, w2) => { b.rise(w2, pl, 120, 700); }]); }
    ev.push([0.8 + n * gap + 0.3, (b, w2) => b.release(w2, pl)]);
    return [timeline(ev, 0.8 + n * gap + 0.9)];
  },
  // beams from the top of the coil fan down to the floor around the knight
  mFan(w) {
    const p = w.player, sx = COIL_X - 14, sy = 40, tg = [-110, -40, 30, 100].map(o => clamp(p.x + o, 30, 440));
    tg.forEach((x, i) => { const n = Math.ceil(Math.hypot(x - sx, GROUND_Y - 6 - sy) / 12); for (let k = 0; k <= n; k++) this.zone({ x: sx + (x - sx) * k / n - 6, y: sy + (GROUND_Y - 6 - sy) * k / n - 6, w: 12, h: 12 }, 0.9 + i * 0.22, 0.28); });
    return [{ d: 2.6, pose: 'charge', tell: true, on: () => Sfx.play('warn') }];
  },
  // two pads sweep across the arena: one low (jump it), one high (stay down)
  mStrafe(w) {
    const mk = (j, dir, ty, t0) => (b, w2) => {
      const pl = w2.pads[j], sx = dir > 0 ? 24 : 408; pl.heat = 2; let t = 0;
      pl.ctl = (dt, q) => { t += dt; q.y = approach(q.y, ty, 400 * dt); if (t < t0) { q.x = approach(q.x, sx, 420 * dt); if (t > t0 - 0.35) q.x += Math.sin(t * 90) * 1.2; } else { pl.flying = true; q.x += dir * 280 * dt; } };
    };
    const ev = [[0, (b, w2) => { Sfx.play('warn'); mk(0, -1, GROUND_Y - 20, 1.0)(b, w2); }], [0.4, (b, w2) => { mk(1, 1, GROUND_Y - 62, 1.0)(b, w2); }], [1.05, () => Sfx.play('whoosh')], [3.2, (b, w2) => w2.pads.forEach(pl => { pl.flying = false; b.release(w2, pl); })]];
    return [Object.assign(timeline(ev, 4.4), { bot: 'away', hz: b => b.padHz(w) })];
  },
  // a big ball bounces around the arena
  mBounce(w) {
    const n = this.phase === 2 ? 2 : 1;
    return [{ d: 0.7, pose: 'charge', tell: true, on: () => Sfx.play('warn') }, { d: 5.4, pose: 'charge', bot: 'away', on: (b) => { Sfx.play('roar'); for (let i = 0; i < n; i++) b.shots.push(new BallShot({ kind: 'plasma', x: b.x - 20, y: 150, vx: -130 - i * 40, vy: -120, w: 14, h: 14, ground: false, life: 5.2 })); } }];
  },
  // gears roll in from the coil's side, one after another, and bounce off the far wall
  mGearstorm(w) {
    const ev = []; for (let k = 0; k < (this.phase === 2 ? 4 : 3); k++) ev.push([0.5 + k * 1.1, (b) => { Sfx.play('whoosh'); b.shots.push(new BounceShot({ kind: 'gear', x: 410, y: GROUND_Y - 14, vx: -150, vy: 0, w: 28, h: 28, ground: false, life: 6.5 })); }]);
    return [{ d: 0.5, pose: 'charge', tell: true, on: () => Sfx.play('warn') }, timeline(ev, 4.8 + (this.phase === 2 ? 1 : 0))];
  },
  // the whole floor goes live: get onto a piston or a pad
  mElectrify(w) {
    return [{ d: 1.4, pose: 'charge', tell: true, on: (b, w2) => { Sfx.play('warn'); w2.pistons.forEach(pl => { pl.heat = 1.4; }); b.zone({ x: HIVE_L, y: GROUND_Y - 8, w: HIVE_R - HIVE_L, h: 8 }, 1.2, 1.8); } }, { d: 2.4, pose: 'charge', bot: 'away' }];
  },
  // phase 2: a pad lifts, tracks the knight and falls on them
  mPadslam(w) {
    const j = Math.random() < 0.5 ? 0 : 1, pl = w.pads[j];
    const ev = [[0, (b, w2) => { Sfx.play('warn'); pl.heat = 2; let ft = 0; pl.ctl = (dt, q) => { ft += dt; q.y = approach(q.y, 56, 420 * dt); q.x = approach(q.x, clamp(w2.player.x - 26, 20, 410), 380 * dt); }; }],
      [1.1, (b, w2) => { Sfx.play('whoosh'); pl.flying = true; pl.ctl = (dt, q) => { q.y = Math.min(GROUND_Y - 8, q.y + 1000 * dt); if (q.y >= GROUND_Y - 8 && !q.hit) { q.hit = true; Sfx.play('slam'); w2.shake(6); dustWave(w2, q.x + 26, 0, 12); for (const dir of [-1, 1]) fshot(b, 'shock', q.x + 26 + dir * 30, GROUND_Y - 10, dir * 170, 0, { w: 22, h: 30, ground: false, life: 3 }); } }; }],
      [1.9, (b, w2) => { pl.hit = false; pl.flying = false; b.release(w2, pl); }]];
    return [Object.assign(timeline(ev, 3.4), { bot: 'away', hz: b => b.padHz(w) })];
  },
  // phase 2: the coil drags the knight toward it, then discharges across the floor
  mPull(w) {
    return [{ d: 0.7, pose: 'charge', tell: true, on: () => Sfx.play('warn') },
      { d: 1.9, pose: 'charge', bot: 'away', tick: (b, dt, w2) => { const p = w2.player; if (!p.dead && p.x < 432) p.x = Math.min(432, p.x + 68 * dt); } },
      { d: 0.3, pose: 'charge', on: (b) => { Sfx.play('slam'); b.zone({ x: 300, y: GROUND_Y - 14, w: 140, h: 14 }, 0.05, 0.45); } }, { d: 0.8, pose: 'charge' }];
  },
  // phase 2: press plates stamp down across the arena and leave only two safe lanes, twice
  mPresses(w) {
    const wave = (warn) => (b) => { Sfx.play('warn'); const slots = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 4); slots.forEach(i => b.zone({ x: 24 + i * 72, y: 36, w: 72, h: GROUND_Y - 36 }, warn, 0.4)); };
    return [{ d: 1.9, pose: 'charge', tell: true, on: wave(1.1) }, { d: 1.9, pose: 'charge', tell: true, on: wave(1.0) }, { d: 0.3, pose: 'charge' }];
  },
  // phase 2: a spiral of plasma winds out of the core
  mSpiral(w) {
    return [{ d: 0.7, pose: 'charge', tell: true, on: () => Sfx.play('warn') }, { d: 2.8, pose: 'charge', bot: 'away', on: (b) => { b.sp = 0; }, tick: (b, dt) => { b.sp -= dt; if (b.sp <= 0) { b.sp = 0.1; const a = Math.PI / 2 + ((b.sT * 3.4) % Math.PI); fshot(b, 'plasma', b.x - 6, GROUND_Y - 24, Math.cos(a) * 125, -Math.sin(a) * 125, { w: 10, h: 10, ground: false, life: 3.2 }); } } }];
  },
});
