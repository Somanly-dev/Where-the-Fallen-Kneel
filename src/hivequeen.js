'use strict';

// The last boss of the Trial of the Bugs: the armored queen. Four phases:
//   1. the well: stinger volley, honey rain, bee wave, bee bombs
//   2. a long run to the right, chased. She cannot be hurt. Honey spit (1), arm jab (1), mandible bite (1)
//   3. a long climb up, chased from below, with bees and more bombs as well
//   4. the well again: phase 1 with harder attacks

// the queen, face on. s is the scale; jab and snap are 0..1; jabDir is 'right' or 'up'.
function drawQueenArt(ctx, x, y, t, s, o) {
  o = o || {};
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const cy = Math.sin(t * 5) * (o.calm ? 1.5 : 2.5), jab = o.jab || 0, snap = o.snap || 0, fast = o.fast ? 22 : 14, flap = o.flap == null ? 0.1 : o.flap;
  const wing = (cx, wy, rx, ry, rot, ph) => { ctx.save(); ctx.translate(cx, wy); ctx.rotate(rot + Math.sin(t * fast + ph) * flap); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0); ctx.stroke(); ctx.restore(); };
  wing(-56, cy - 6, 50, 20, -0.5, 0); wing(56, cy - 6, 50, 20, 0.5, 1); wing(-46, cy + 12, 38, 15, -0.2, 2); wing(46, cy + 12, 38, 15, 0.2, 3);
  const col = c => (o.hurt ? mixHex(c, '#ffffff', 0.7) : c);
  for (let yy = -40; yy <= 40; yy++) { const hw = Math.round(24 * Math.sqrt(Math.max(0, 1 - yy * yy / 1600))); if (hw > 0) px(ctx, -hw, cy + 60 + yy, hw * 2, 1, Math.floor((yy + 40) / 8) % 2 ? '#140a04' : col('#d8982a')); }
  for (let i = 0; i < 12; i++) px(ctx, -1, cy + 100 + i, 3 - Math.floor(i / 5), 1, o.hot ? '#ff5a3a' : '#fff0b0');
  disc(ctx, 0, cy + 28, 26, 22, col('#f0c850'));
  for (const sg of [-1, 1]) {
    const sh = [sg * 22, cy + 26]; let ha = [sg * 60, cy + 56 + Math.sin(t * 6 + sg) * 4], el = [sg * 44, cy + 36];
    if (sg > 0 && jab > 0) { if (o.jabDir === 'up') { ha = [20, cy + 26 - jab * 190]; el = [20, cy + 10 - jab * 80]; } else { ha = [60 + jab * 150, cy + 40 - jab * 10]; el = [(sh[0] + ha[0]) / 2, (sh[1] + ha[1]) / 2 - 8]; } }
    pixLine(ctx, sh[0], sh[1], el[0], el[1], 6, col('#d8982a')); pixLine(ctx, el[0], el[1], ha[0], ha[1], 6, '#4a3a1a');
    px(ctx, ha[0] - 3, ha[1] - 2, 4, 9, '#fff0b0'); px(ctx, ha[0] + 2, ha[1] - 2, 4, 9, '#fff0b0');
  }
  disc(ctx, 0, cy, 28, 24, col('#d8982a'));
  const eye = (ex) => { disc(ctx, ex, cy - 4, 11, 14, '#140a04'); disc(ctx, ex, cy - 4, 9, 12, o.crit ? (Math.floor(t * 16) % 2 ? '#ff1a1a' : '#ffffff') : (o.glow ? '#ffffff' : '#ff5a3a')); px(ctx, ex - 7, cy - 14, 3, 3, '#ffffff'); };
  eye(-14); eye(14);
  const sway = Math.sin(t * 4) * 4;
  for (const sg of [-1, 1]) { pixLine(ctx, sg * 8, cy - 20, sg * 24 + sway * sg, cy - 46, 2, '#4a3a1a'); pixLine(ctx, sg * 24 + sway * sg, cy - 46, sg * 30 + sway * sg, cy - 56, 2, '#4a3a1a'); px(ctx, sg * 30 + sway * sg - 2, cy - 59, 5, 5, '#f0c850'); }
  const mw = 8 + snap * 16 + Math.sin(t * 8) * 1.5;
  for (const sg of [-1, 1]) { pixLine(ctx, sg * 5, cy + 16, sg * (5 + mw), cy + 26, 4, '#2a1608'); pixLine(ctx, sg * (5 + mw), cy + 26, sg * (mw - 1), cy + 34, 3, '#fff0b0'); }
  if (o.spit) { px(ctx, -5, cy + 20, 10, 8, '#e8a010'); px(ctx, -3, cy + 22, 4, 3, '#ffe070'); }
  const cr = o.crit ? (Math.floor(t * 16) % 2 ? '#ff4a4a' : '#ffffff') : (o.crownGlow ? '#ffffff' : '#ffd24a');
  for (let i = -2; i <= 2; i++) px(ctx, i * 8 - 2, cy - 28 - (i % 2 ? 0 : 5), 4, 8 + (i % 2 ? 0 : 5), cr); px(ctx, -22, cy - 22, 44, 4, cr);
  if (!o.noArmor) { px(ctx, -28, cy + 6, 56, 5, '#8a8ea2'); px(ctx, -28, cy + 6, 56, 1, '#c8ccdc'); px(ctx, -24, cy + 24, 48, 8, '#6a6e86'); for (let i = -3; i <= 3; i++) px(ctx, i * 7, cy + 27, 2, 2, '#c8ccdc'); for (const sg of [-1, 1]) px(ctx, sg * 26 - 6, cy + 20, 12, 10, '#8a8ea2'); }
  px(ctx, -4, cy - 22, 8, 6, '#c0405a');
  ctx.restore();
}

// ======================================================================= the armored queen in the well (phases 1 and 4)
class ArmoredQueen extends HiveBoss {
  constructor(phase) {
    super({ name: 'The Armored Queen', hp: phase === 4 ? 70 : 50, w: 40, h: 78, flies: true, hoverY: 124, x: 240 });
    this.qphase = phase; this.pose = 'idle'; this.marks = []; this.todo = []; this.bombs = []; this.y = GROUND_Y; this.hot = false; this.glow = false;
    this.floorY = GROUND_Y;
  }
  get hard() { return this.qphase === 4; }
  restTime() { return (0.7 + Math.random() * 0.6) * (this.rage ? 0.8 : 1) * (this.hard ? 0.85 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; }
  die(world) {
    if (this.qphase === 1) { this.dying = true; this.shots = []; world.queenDown(this); }
    else super.die(world);
  }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    this.marks = this.marks.filter(m => this.age < m.t1);
    for (const j of this.todo) if (!j.done && this.age >= j.t) { j.done = true; j.fn(this, w); }
    this.todo = this.todo.filter(j => !j.done);
    if (p.dead) { this.vx = this.vy = 0; return; }
    this.glow = false; this.hot = false;
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.faceTo(p);
    this.steer(clamp(p.x + Math.sin(this.age * 0.8) * 70, this.bl + 10, this.br - 10), 122 + Math.sin(this.age * 2) * 10, 70);
    if (this.heat >= 6) { this.heat = 0; this.play('lift', [{ d: 1.1, pose: 'tell', tick: (b) => { b.steer(b.x, 70, 200); } }, { d: 0.3, pose: 'idle' }], w); return; }
    this.cool -= dt;
    if (this.cool <= 0) this.pickMove(w, this.hard ? ['volley', 'rain', 'wave', 'bombs', 'twinWave', 'flood'] : ['volley', 'rain', 'wave', 'bombs']);
  }
  mVolley(w) {
    const k = this.k, fire = (b, w2, off) => {
      const p = w2.player, a0 = Math.atan2(p.y - 12 - (b.y - 20), p.x - b.x) + (off || 0); Sfx.play('flap');
      for (let i = 0; i < 5; i++) { const a = a0 + (i - 2) * 0.4; b.shots.push(new BossShot({ kind: 'dart', x: b.x, y: b.y - 20, vx: Math.cos(a) * 155, vy: Math.sin(a) * 155, w: 8, h: 4, life: 3.4 })); }
    };
    const segs = [{ d: 0.7 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.hot = true; b.glow = true; }, on: () => Sfx.play('warn') }, { d: 0.14, pose: 'fire', on: (b, w2) => fire(b, w2, 0) }, { d: 0.5, pose: 'idle' }];
    if (this.hard) segs.splice(2, 0, { d: 0.4, pose: 'fire' }, { d: 0.14, pose: 'fire', on: (b, w2) => fire(b, w2, 0.2) });
    return segs;
  }
  mRain(w) {
    const k = this.k;
    return [{ d: 0.5 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.glow = true; } }, { d: 0.2, pose: 'cast', on: (b, w2) => {
      Sfx.play('growl');
      for (let i = 0; i < 8; i++) {
        const x = 50 + i * 56, t0 = b.age + 1.0 + i * 0.16;
        b.marks.push({ kind: 'bulge', x, t0: b.age, t1: t0 + 0.05 });
        b.todo.push({ t: t0, fn: (bb) => { bb.shots.push(new BossShot({ kind: 'honey', x, y: 34, vx: 0, vy: 30, grav: 900, w: 10, h: 14, life: 1.8, ground: false, landOn: true, dmg: 1, onLand: (s, w3) => { if (s.landed) w3.honeyLedge(s.landed, 3); } })); } });
      }
      if (b.hard) for (let i = 0; i < 7; i++) { const x = 78 + i * 56, t0 = b.age + 2.1 + i * 0.16; b.marks.push({ kind: 'bulge', x, t0: b.age + 1.0, t1: t0 + 0.05 }); b.todo.push({ t: t0, fn: (bb) => { bb.shots.push(new BossShot({ kind: 'honey', x, y: 34, vx: 0, vy: 30, grav: 900, w: 10, h: 14, life: 1.8, ground: false, landOn: true, dmg: 1 })); } }); }
    } }, { d: this.hard ? 2.8 : 1.9, pose: 'idle' }];
  }
  beeWall(b, w, side, gapY) {
    Sfx.play('whoosh');
    for (let j = 0; j < 11; j++) {
      const y = 34 + j * 19; if (Math.abs(y - gapY) < 24) continue;
      b.shots.push(new BossShot({ kind: 'wavebee', x: side > 0 ? HIVE_R + 12 : HIVE_L - 12, y, vx: -side * 185, vy: 0, w: 9, h: 6, life: 2.8, ground: false, pierce: true }));
    }
  }
  mWave(w) {
    const k = this.k;
    return [{ d: 0.9 * k, pose: 'tell', tell: true, face: true, on: (b, w2) => { b.gap = ledgeOf(w2, w2.player.x, w2.player.y); b.gapY = (b.gap ? b.gap.y : GROUND_Y) - 14; b.side = w2.player.x < 240 ? 1 : -1; b.marks.push({ kind: 'gap', y: b.gapY, side: b.side, t0: b.age, t1: b.age + 1.2 }); Sfx.play('warn'); }, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.glow = true; } },
      { d: 0.2, pose: 'cast', on: (b, w2) => b.beeWall(b, w2, b.side, b.gapY) }, { d: 1.6, pose: 'idle' }];
  }
  mTwinWave(w) {
    const k = this.k;
    return [{ d: 0.9 * k, pose: 'tell', tell: true, face: true, on: (b, w2) => { const g = ledgeOf(w2, w2.player.x, w2.player.y); b.gapY = (g ? g.y : GROUND_Y) - 14; b.gapY2 = clamp(b.gapY - 46, 40, 210); b.marks.push({ kind: 'gap', y: b.gapY, side: 1, t0: b.age, t1: b.age + 1.2 }, { kind: 'gap', y: b.gapY2, side: -1, t0: b.age, t1: b.age + 1.2 }); Sfx.play('warn'); }, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.glow = true; } },
      { d: 0.2, pose: 'cast', on: (b, w2) => { b.beeWall(b, w2, 1, b.gapY); b.beeWall(b, w2, -1, b.gapY2); } }, { d: 1.8, pose: 'idle' }];
  }
  mBombs(w) {
    const k = this.k, n = this.hard ? 5 : 3;
    return [{ d: 0.6 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.glow = true; } }, { d: 0.2, pose: 'cast', on: (b, w2) => {
      Sfx.play('whoosh');
      const pls = w2.platforms.filter(pl => !pl.gone && !pl.solid).slice(); const here = ledgeOf(w2, w2.player.x, w2.player.y); if (here && !pls.includes(here)) pls.push(here);
      pls.sort(() => Math.random() - 0.5); if (here) { const ix = pls.indexOf(here); if (ix > 0) { pls.splice(ix, 1); pls.unshift(here); } }
      for (let i = 0; i < Math.min(n, pls.length); i++) {
        const pl = pls[i], tx = pl.x + 10 + Math.random() * (pl.w - 20), T = 0.7, g = 520, sy = b.y - 20;
        b.shots.push(new BossShot({ kind: 'bomb', x: b.x, y: sy, vx: (tx - b.x) / T, vy: (pl.y - 4 - sy - 0.5 * g * T * T) / T, grav: g, w: 8, h: 6, life: 3, ground: false, landOn: true, dmg: 0,
          onLand: (s, w3) => { const bx = s.x, by = s.y; b.bombs.push({ x: bx, y: by, t0: b.age, t1: b.age + 1.7 }); b.later(1.7, 0.32, { x: bx - 38, y: by - 40, w: 76, h: 52 }, 1); } }));
      }
    } }, { d: 1.9, pose: 'idle' }];
  }
  mFlood(w) {
    return [{ d: 0.7 * this.k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.glow = true; }, on: () => Sfx.play('growl') },
      { d: 0.2, pose: 'cast', on: (b, w2) => { w2.floodTarget = 204; w2.floodHold = 5.0; } }, { d: 2.0, pose: 'idle' }];
  }
  attacks() { const hs = this.seq ? this.segHaz() : []; return hs; }
  draw(ctx, t) {
    for (const m of this.marks) {
      if (m.kind === 'bulge') { const u = clamp((this.age - m.t0) / 0.9, 0, 1); if (this.age < m.t1) { px(ctx, m.x - 3, 30, 6, 4 + u * 12, '#e8a010'); disc(ctx, m.x, 38 + u * 12, 5, 4, '#ffcf40'); } }
      else if (m.kind === 'gap') { ctx.globalAlpha = 0.35; for (let x = HIVE_L; x < HIVE_R; x += 12) px(ctx, x, m.y - 1, 6, 2, '#7fffd4'); ctx.globalAlpha = 1; px(ctx, m.side > 0 ? HIVE_R - 4 : HIVE_L, m.y - 14, 4, 28, '#7fffd4'); }
    }
    this.bombs = this.bombs.filter(b => this.age < b.t1 + 0.35);
    for (const b of this.bombs) {
      if (this.age < b.t1) { const pulse = Math.sin(this.age * (12 + (this.age - b.t0) * 10)) > 0; px(ctx, b.x - 4, b.y - 6, 8, 5, pulse ? '#ff5a3a' : '#f0c020'); px(ctx, b.x - 1, b.y - 6, 2, 5, '#201000'); }
      else { const u = (this.age - b.t1) / 0.35; ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y - 8, 10 + u * 36, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,200,80,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y - 8, 8 + u * 28, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }
    drawQueenArt(ctx, Math.round(this.x), Math.round(this.y - 62), t, 0.55, { glow: this.glow, hot: this.hot, hurt: this.flash > 0, crownGlow: this.glow, flap: this.seq ? 0.14 : 0.08 });
  }
}
(function extendQueenShots() {
  const old = BossShot.prototype.draw;
  BossShot.prototype.draw = function (ctx, boss) {
    if (this.kind === 'wavebee') { const x = Math.round(this.x), y = Math.round(this.y), f = Math.floor(performance.now() / 45) % 2; px(ctx, x - 4, y - 3, 9, 6, '#f0c020'); px(ctx, x - 1, y - 3, 2, 6, '#201000'); px(ctx, x + 2, y - 3, 2, 6, '#201000'); px(ctx, x - 3, y - 5 - f * 2, 5, 1, 'rgba(255,255,255,0.8)'); px(ctx, x + (this.vx < 0 ? -6 : 4), y - 1, 3, 3, '#140a04'); }
    else if (this.kind === 'bee') { const x = Math.round(this.x), y = Math.round(this.y), f = Math.floor(performance.now() / 40) % 2; px(ctx, x - 4, y - 3, 8, 6, '#f0c020'); px(ctx, x - 1, y - 3, 2, 6, '#201000'); px(ctx, x + 2, y - 3, 2, 6, '#201000'); px(ctx, x - 3, y - 5 - f * 2, 5, 1, 'rgba(255,255,255,0.8)'); }
    else old.call(this, ctx, boss);
  };
})();
HIVE_BOSSES[9] = { id: 'queen', name: 'The Armored Queen', sub: 'They took her first. They armored her last', coins: 0, music: 'hiveO', cageW: 0, make: () => [new ArmoredQueen(1)] };
// the two pairs fight from a cage that is wide enough for both
HIVE_BOSSES[5].cageX = 240; HIVE_BOSSES[5].cageW = 190;
HIVE_BOSSES[6].cageX = 240; HIVE_BOSSES[6].cageW = 150;

// ======================================================================= the two runs (phases 2 and 3)
class HiveRun {
  constructor(scene, type) {
    this.s = scene; this.type = type; this.t = 0; this.shots = []; this.bees = []; this.bombs = []; this.marks = []; this.timed = []; this.cd = type === 'V' ? 4.2 : 2.2; this.state = 'idle'; this.st = 0; this.atk = null;
    this.lastSafe = null; this.over = false;
    const rng = mulberry32(type === 'H' ? 31 : 77), L = (x, y, w, o) => Object.assign({ x, y, w, honey: 0, gone: 0, stand: 0 }, o);
    const p = scene.player;
    if (type === 'H') {
      this.LEN = 5400; const plats = [L(60, 204, 220, { solid: true })]; let x = 330, y = 204;
      while (x < this.LEN - 200) { const w = 60 + Math.floor(rng() * 44), gap = 34 + Math.floor(rng() * 24); y = clamp(y + Math.floor((rng() - 0.5) * 52), 146, 214); plats.push(L(x, y, w, rng() < 0.12 ? { comb: true } : {})); x += w + gap; }
      plats.push(L(this.LEN - 200, 204, 320, { solid: true }));
      this.platforms = plats; this.endX = this.LEN - 60; this.camX = 0; this.camY = 0;
      p.x = 120; p.y = 204; this.qx = 70;
    } else {
      this.TOP = -3400; const plats = [L(140, GROUND_Y, 200, { solid: true })]; let y = GROUND_Y, side = 0;
      let cx = 240;
      while (y > this.TOP + 60) { y -= 40 + Math.floor(rng() * 8); const w = 64 + Math.floor(rng() * 30); cx = clamp(cx + (rng() < 0.5 ? -1 : 1) * (36 + Math.floor(rng() * 44)), HIVE_L + 8 + w / 2, HIVE_R - 8 - w / 2); plats.push(L(Math.round(cx - w / 2), y, w, rng() < 0.1 ? { comb: true } : {})); }
      const topY = y - 46; plats.push(L(160, topY, 160, { solid: true })); this.TOP = topY;
      this.platforms = plats; this.camX = 0; this.camY = 0; this.endY = topY;
      p.x = 240; p.y = GROUND_Y; this.qx = 240; this.camY = 60;          // the knight starts higher on the screen, and the queen rises into view
    }
    p.vx = 0; p.vy = 0; p.invuln = 0; p.facing = 1; this.lastSafe = this.platforms[0];
    this.camLerp = 0;
  }
  get prog() { const p = this.s.player; return clamp(this.type === 'H' ? p.x / this.endX : (GROUND_Y - p.y) / (GROUND_Y - this.TOP), 0, 1); }
  targets() { return this.bees; }
  lights() { const L = []; for (const b of this.bombs) L.push({ x: b.x, y: b.y - 8, r: 40, i: 0.5, c: '255,120,60' }); return L; }

  update(dt) {
    const s = this.s, p = s.player; this.t += dt;
    const H_ = this.type === 'H';
    for (const pl of this.platforms) { pl.honey = Math.max(0, pl.honey - dt); if (pl.comb) { if (pl.gone > 0) { pl.gone -= dt; if (pl.gone <= 0) { pl.gone = 0; pl.stand = 0; } } else if (p.onGround && p.platform === pl) pl.stand += dt; else pl.stand = Math.max(0, pl.stand - dt * 0.5); if (pl.stand >= 0.9) { pl.gone = 3; pl.stand = 0; Sfx.play('slam'); } } }
    s.platforms = this.platforms.filter(pl => !pl.gone);
    if (p.onGround && p.platform) this.lastSafe = p.platform;
    // the chase
    const sp = (H_ ? 68 + 16 * this.prog : 26 + 5 * this.prog);
    if (H_) {
      this.camX = Math.max(this.camX + sp * dt, p.x - 310); this.camX = clamp(this.camX, 0, this.LEN - W + 20);
      p.x = Math.max(p.x, this.camX + 12); this.qx = this.camX + 70; this.qy = 150;
    } else {
      this.camY = Math.min(this.camY - sp * dt, p.y - 140); this.camY = Math.max(this.camY, this.TOP - 40);
      this.qx += (clamp(p.x, HIVE_L + 90, HIVE_R - 90) - this.qx) * Math.min(1, dt * 1.2); this.qy = this.camY + 236;
      p.x = clamp(p.x, HIVE_L + 8, HIVE_R - 8);
    }
    s.camX = this.camX; s.camY = this.camY;
    Music.setIntensity(0.45 + 0.55 * this.prog);
    // falling: into the honey (across) or into the queen (up)
    const fell = H_ ? p.y > 270 : p.y > this.camY + H + 24;
    if (fell && !p.dead) {
      Sfx.play('splash'); p.takeDamage(1, p.x, s);
      if (!p.dead) {
        let pl = this.lastSafe;
        if (H_) { const lim = this.camX + 150; if (!pl || pl.x + pl.w < lim) pl = this.platforms.find(q => q.x > lim && !q.gone) || pl; }
        else { const lim = this.camY + 150; if (!pl || pl.y > lim) pl = this.platforms.filter(q => !q.gone && q.y < lim).sort((a, b) => b.y - a.y)[0] || pl; }
        p.x = pl.x + pl.w / 2; p.y = pl.y; p.vx = 0; p.vy = 0; p.invuln = 1.8;
      }
    }
    this.updateAttacks(dt);
    for (const sh of this.shots) sh.update(dt, s);
    this.shots = this.shots.filter(sh => !sh.dead);
    for (const b of this.bees) b.update(dt, s);
    this.bees = this.bees.filter(b => !b.dead);
    this.timed = this.timed.filter(z => this.t < z.t1);
    this.marks = this.marks.filter(m => this.t < m.t1);
    this.bombs = this.bombs.filter(b => this.t < b.t1 + 0.4);
    // the end
    const done = H_ ? p.x >= this.endX : p.y <= this.endY + 10;
    if (done && !this.over && !p.dead) { this.over = true; return true; }
    return false;
  }

  // ---- her attacks. Everything she does is 1 damage, except a charged jab or bite (25% of them in the chase, 10% in the climb), which is 2 and flickers red.
  updateAttacks(dt) {
    const s = this.s, p = s.player, H_ = this.type === 'H';
    this.st += dt;
    if (p.dead) return;
    if (this.state === 'idle') {
      this.cd -= dt;
      if (this.cd <= 0) {
        const dist = H_ ? p.x - this.qx : this.qy - p.y;
        let pick;
        if (H_) pick = dist < 150 ? (Math.random() < 0.5 ? 'bite' : 'jab') : (dist < 215 ? 'jab' : 'spit');
        else {
          const opts = ['spit', 'bees', 'bombs'];
          if (dist < 160) opts.push('bite', 'jab'); else if (dist < 210) opts.push('jab');
          pick = opts[Math.floor(Math.random() * opts.length)];
        }
        this.state = pick; this.st = 0; this.atk = { x: p.x, y: p.y };
        this.crit = (pick === 'jab' || pick === 'bite') && Math.random() < (H_ ? 0.25 : 0.10);          // a charged jab or bite does double damage
        Sfx.play('warn'); if (this.crit) Sfx.play('growl');
        if (pick === 'spit' || pick === 'bees' || pick === 'bombs') Sfx.play('growl');
      }
      return;
    }
    const tell = { jab: 0.62, bite: 0.44, spit: 0.7, bees: 0.7, bombs: 0.7 }[this.state];
    if (this.state === 'jab' || this.state === 'bite') {
      const act = this.state === 'jab' ? 0.16 : 0.14;
      if (this.st > tell && this.st < tell + act) {
        if (!this.struck) { this.struck = true; Sfx.play('slash'); s.shake(3); }
      } else if (this.st >= tell + act) { this.struck = false; this.state = 'idle'; this.cd = this.state === 'idle' ? (this.jabLast ? 2 : 1.6) : 1.8; this.cd = (H_ ? 2.1 : 3.4) + Math.random() * 0.9; }
    } else if (this.st > tell) {
      if (this.state === 'spit') this.spit();
      else if (this.state === 'bees') this.sendBees();
      else if (this.state === 'bombs') this.throwBombs();
      this.state = 'idle'; this.cd = (H_ ? 1.9 : 3.6) + Math.random() * 1.0;
    }
  }
  telegraph() { const k = { jab: 0.62, bite: 0.44 }[this.state]; return k ? this.st / k : 0; }
  spit() {
    const s = this.s, p = s.player, H_ = this.type === 'H', mx = H_ ? this.qx + 20 : this.qx, my = H_ ? this.qy + 30 : this.qy - 30;
    const cands = this.platforms.filter(pl => !pl.gone && (H_ ? pl.x > p.x + 90 && pl.x < p.x + 300 : pl.y < p.y - 20 && pl.y > p.y - 170));
    const pl = cands.length ? cands[Math.floor(Math.random() * cands.length)] : null;
    const tx = pl ? pl.x + pl.w / 2 : p.x + 160, ty = pl ? pl.y - 4 : p.y, T = 1.0, g = 560;
    Sfx.play('whoosh');
    this.shots.push(new BossShot({ kind: 'honey', x: mx, y: my, vx: (tx - mx) / T, vy: (ty - my - 0.5 * g * T * T) / T, grav: g, w: 10, h: 10, life: 3, ground: false, landOn: true, dmg: 1, onLand: (sh, w3) => { if (sh.landed) sh.landed.honey = Math.max(sh.landed.honey, 6); Sfx.play('splash'); } }));
  }
  sendBees() {
    const s = this.s, H_ = this.type === 'H', mx = H_ ? this.qx + 20 : this.qx, my = H_ ? this.qy : this.qy - 40;
    Sfx.play('growl');
    for (let i = 0; i < (H_ ? 3 : 2); i++) this.bees.push(new RunBee(mx + (i - 1) * 10, my - i * 6, this));
  }
  throwBombs() {
    const s = this.s, p = s.player, H_ = this.type === 'H', mx = H_ ? this.qx + 20 : this.qx, my = H_ ? this.qy : this.qy - 30;
    const cands = this.platforms.filter(pl => !pl.gone && (H_ ? pl.x > p.x - 40 && pl.x < p.x + 260 : Math.abs(pl.y - p.y) < 130)).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).slice(0, H_ ? 4 : 3);
    Sfx.play('whoosh');
    for (const pl of cands) {
      const tx = pl.x + 8 + Math.random() * Math.max(1, pl.w - 16), T = 0.9, g = 520;
      this.shots.push(new BossShot({ kind: 'bomb', x: mx, y: my, vx: (tx - mx) / T, vy: (pl.y - 4 - my - 0.5 * g * T * T) / T, grav: g, w: 8, h: 6, life: 3, ground: false, landOn: true, dmg: 0,
        onLand: (sh) => { const t = this.t; this.bombs.push({ x: sh.x, y: sh.y, t0: t, t1: t + 1.7 }); this.timed.push({ t0: t + 1.7, t1: t + 2.02, box: { x: sh.x - 38, y: sh.y - 40, w: 76, h: 52 }, dmg: 1 }); } }));
    }
  }

  hazards() {
    const hs = [], t = this.t, H_ = this.type === 'H';
    if ((this.state === 'jab' || this.state === 'bite') && !this.s.player.dead) {
      const tell = this.state === 'jab' ? 0.62 : 0.44, act = this.state === 'jab' ? 0.16 : 0.14, dm = this.crit ? 2 : 1;
      if (this.st > tell && this.st < tell + act) {
        if (this.state === 'jab') hs.push(H_ ? { box: { x: this.qx + 30, y: 70, w: 160, h: 190 }, dmg: dm, fromX: this.qx } : { box: { x: this.atk.x - 30, y: this.qy - 200, w: 60, h: 200 }, dmg: dm, fromX: this.atk.x });
        else hs.push(H_ ? { box: { x: this.qx + 24, y: 90, w: 86, h: 170 }, dmg: dm, fromX: this.qx } : { box: { x: this.qx - 64, y: this.qy - 90, w: 128, h: 90 }, dmg: dm, fromX: this.qx });
      }
    }
    for (const sh of this.shots) if (sh.dmg) hs.push({ box: sh.box(), dmg: sh.dmg, fromX: sh.x, shot: sh });
    for (const z of this.timed) if (t >= z.t0) hs.push({ box: z.box, dmg: z.dmg, fromX: z.box.x + z.box.w / 2 });
    for (const b of this.bees) hs.push({ box: { x: b.x - 4, y: b.y - 4, w: 8, h: 8 }, dmg: 1, fromX: b.x });
    return hs;
  }

  // ---- drawing
  drawBack(ctx) {
    const cx = this.camX, cy = this.camY, H_ = this.type === 'H';
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a1e08'); g.addColorStop(1, '#1a0c04'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const offx = H_ ? (cx * 0.35) % 31 : 0, offy = H_ ? 0 : (cy * 0.35) % 27;
    for (let r = -1; r < 11; r++) for (let q = -1; q < 17; q++) { ctx.beginPath(); const hx = q * 31 + (r % 2 ? 15 : 0) - offx, hy = r * 27 + 8 - offy; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * 15, hy + Math.sin(a) * 15); } ctx.closePath(); ctx.fillStyle = 'rgba(120,70,10,0.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,190,70,0.08)'; ctx.stroke(); }
    if (H_) {
      px(ctx, 0, 0, W, 30, '#2a1608'); px(ctx, 0, 30, W, 4, '#6a4010'); px(ctx, 0, 30, W, 1, '#c88a20');
      for (let i = -1; i < 4; i++) { const x = i * 190 - (cx * 0.9) % 190 + 80; drawWatcher(ctx, x, 30, this.s.cheerT > 0, this.t, i); }
      for (let q = -1; q < 18; q++) { ctx.beginPath(); const hx = q * 28 - (cx * 0.6) % 28, hy = 14; for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * 12, hy + Math.sin(a) * 12); } ctx.closePath(); ctx.fillStyle = 'rgba(90,52,16,0.7)'; ctx.fill(); }
    } else {
      for (const side of [0, 1]) for (let r = -1; r < 15; r++) for (let col = 0; col < 2; col++) { const hx = side ? W - 7 - col * 10 : 7 + col * 10, hy = r * 20 + (col % 2 ? 10 : 0) - ((cy * 1) % 20); ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(hx + Math.cos(a) * 9, hy + Math.sin(a) * 9); } ctx.closePath(); ctx.fillStyle = 'rgba(110,60,8,0.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,190,70,0.5)'; ctx.stroke(); }
      px(ctx, HIVE_L - 4, 0, 4, H, '#4a2a08'); px(ctx, HIVE_R, 0, 4, H, '#4a2a08');
      for (let i = 0; i < 4; i++) { const wy = ((i * 230 - cy * 1) % 920 + 920) % 920 - 40; drawWatcher(ctx, HIVE_L - 18, wy, this.s.cheerT > 0, this.t, i); drawWatcher(ctx, HIVE_R + 18, wy + 100, this.s.cheerT > 0, this.t, i + 9); }
    }
  }
  drawWorld(ctx) {
    const H_ = this.type === 'H', s = this.s;
    for (const pl of this.platforms) {
      if (pl.gone > 0 || pl.x > this.camX + W + 20 || pl.x + pl.w < this.camX - 20 || pl.y > this.camY + H + 20 || pl.y < this.camY - 20) continue;
      const h = pl.honey > 0, crack = pl.comb && pl.stand > 0.3, a = h ? '#e8a010' : (pl.comb ? '#c07818' : '#c8a050'), b = h ? '#ffe070' : (pl.comb ? '#f0a838' : '#f0d088'), sh = crack ? Math.round(Math.sin(this.t * 60)) : 0;
      px(ctx, pl.x + sh, pl.y, pl.w, 7, a); px(ctx, pl.x + sh, pl.y, pl.w, 2, b); px(ctx, pl.x + sh, pl.y + 5, pl.w, 2, 'rgba(0,0,0,0.3)');
      if (pl.comb) for (let i = 8; i < pl.w - 4; i += 12) { px(ctx, pl.x + i - 3, pl.y + 2, 6, 1, 'rgba(70,30,0,0.8)'); px(ctx, pl.x + i - 3, pl.y + 4, 6, 1, 'rgba(70,30,0,0.8)'); }
      if (h) for (let k = 4; k < pl.w - 3; k += 8) px(ctx, pl.x + k, pl.y + 7, 2, 5 + ((k + Math.floor(this.t * 4)) % 6), '#ffcf40');
    }
    if (H_) { const ex = this.endX; px(ctx, ex - 14, 150, 28, 54, '#ffd24a'); px(ctx, ex - 10, 154, 20, 50, '#140a04'); ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.t * 3); px(ctx, ex - 8, 156, 16, 48, '#ffe9a0'); ctx.globalAlpha = 1; }
    else { const ey = this.endY; px(ctx, 190, ey - 50, 100, 4, '#ffd24a'); px(ctx, 190, ey - 50, 4, 50, '#ffd24a'); px(ctx, 286, ey - 50, 4, 50, '#ffd24a'); ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 3); px(ctx, 194, ey - 46, 92, 46, '#ffe9a0'); ctx.globalAlpha = 1; }
    for (const m of this.marks) { }
    for (const b of this.bombs) {
      if (this.t < b.t1) { const pulse = Math.sin(this.t * (12 + (this.t - b.t0) * 10)) > 0; px(ctx, b.x - 4, b.y - 6, 8, 5, pulse ? '#ff5a3a' : '#f0c020'); px(ctx, b.x - 1, b.y - 6, 2, 5, '#201000'); }
      else { const u = (this.t - b.t1) / 0.4; ctx.globalAlpha = Math.max(0, 1 - u); ctx.strokeStyle = '#ff9a4a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y - 8, 10 + u * 36, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,200,80,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y - 8, 8 + u * 28, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    }
    for (const b of this.bees) b.draw(ctx);
    for (const sh of this.shots) sh.draw(ctx);
    // the queen
    const tl = this.telegraph(), jab = this.state === 'jab' ? (this.st < 0.62 ? -0.25 * (this.st / 0.62) : clamp((this.st - 0.62) / 0.08, 0, 1) * (1 - clamp((this.st - 0.72) / 0.12, 0, 1))) : 0;
    const snap = this.state === 'bite' ? (this.st < 0.44 ? 0 : (this.st < 0.58 ? 1 : 0)) : 0;
    const spitting = this.state === 'spit' || this.state === 'bees' || this.state === 'bombs';
    const lunge = (this.state === 'jab' || this.state === 'bite') && this.st > 0.36 ? 28 : 0, crit = !!this.crit && (this.state === 'jab' || this.state === 'bite'), zc = crit ? '#ff1a1a' : '#ff5a3a', za = crit ? 0.55 : 0.3;
    if (H_) {
      if (this.state === 'jab' && this.st > 0.62 && this.st < 0.78) { ctx.globalAlpha = za; px(ctx, this.qx + 30, 70, 160, 190, zc); ctx.globalAlpha = 1; }
      if (this.state === 'bite' && this.st > 0.44 && this.st < 0.58) { ctx.globalAlpha = za; px(ctx, this.qx + 24, 90, 86, 170, zc); ctx.globalAlpha = 1; }
      drawQueenArt(ctx, this.qx + lunge, this.qy, this.t, 0.8, { jab: Math.max(0, jab), snap, glow: spitting || tl > 0.3, spit: spitting, fast: true, crit });
      for (let x = 0; x < 14; x++) { ctx.globalAlpha = 0.08 * (1 - x / 14); px(ctx, this.camX + x * 10, 34, 10, 210, '#ff5a3a'); } ctx.globalAlpha = 1;
    } else {
      if (this.state === 'jab') { ctx.globalAlpha = (this.st < 0.62 ? 0.15 + 0.25 * (this.st / 0.62) : 0.35) * (crit ? 1.6 : 1); px(ctx, this.atk.x - 30, this.qy - 200, 60, 200, zc); ctx.globalAlpha = 1; }
      drawQueenArt(ctx, this.qx, this.qy - lunge * 0.4, this.t, 0.8, { jab: Math.max(0, jab), jabDir: 'up', snap, glow: spitting || tl > 0.3, spit: spitting, fast: true, crit });
    }
  }
  drawHud(ctx) {
    const f = this.prog, x = 120, w = 240, y = 258;
    px(ctx, x - 2, y - 2, w + 4, 10, '#6a4010'); px(ctx, x, y, w, 6, '#140a04'); px(ctx, x, y, Math.round(w * f), 6, '#e0a830');
    px(ctx, x + Math.round(w * f) - 2, y - 3, 4, 12, '#e0e8d0');
    text(ctx, 'RUN', x - 6, y - 1, '#ff9a8a', 'right'); text(ctx, this.type === 'H' ? 'THE QUEEN CANNOT BE HURT' : 'KEEP CLIMBING', x + w / 2, y - 14, '#ffe9a0', 'center');
  }
}

// a bee sent after the knight during the climb (one hit pops it)
class RunBee {
  constructor(x, y, run) { this.x = x; this.y = y; this.vx = 0; this.vy = -40; this.run = run; this.hp = 1; this.dead = false; this.age = 0; this.flash = 0; }
  hitbox() { return { x: this.x - 6, y: this.y - 5, w: 12, h: 10 }; }
  hit(dmg, dirX, w) { if (this.dead) return; this.hp -= dmg; this.dead = true; for (let i = 0; i < 6; i++) w.spawn({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 60, life: 0.4, color: '#f0c020', size: 2, grav: 200 }); Sfx.play('kill'); }
  update(dt, w) {
    const p = w.player; this.age += dt;
    const dx = p.x - this.x, dy = p.y - 12 - this.y, d = Math.hypot(dx, dy) || 1, sp = this.run.type === 'H' ? 85 : 68;
    this.vx += (dx / d * sp - this.vx) * Math.min(1, dt * 1.5) + Math.sin(this.age * 9 + this.x) * 10; this.vy += (dy / d * sp - this.vy) * Math.min(1, dt * 1.5);
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.age > 9) this.dead = true;
  }
  debugBoxes() { return []; }
  draw(ctx) { const x = Math.round(this.x), y = Math.round(this.y), f = Math.floor(this.age * 26) % 2; px(ctx, x - 4, y - 3, 8, 6, '#f0c020'); px(ctx, x - 1, y - 3, 2, 6, '#201000'); px(ctx, x + 2, y - 3, 2, 6, '#201000'); px(ctx, x - 3, y - 5 - f * 2, 5, 1, 'rgba(255,255,255,0.8)'); }
}
