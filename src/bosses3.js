'use strict';

// Pits bosses 5 and 6: the bell-bearer and the brothers.

// extra shots drawn here: the iron ball, and the thrown hook
(function extendShots() {
  const old = BossShot.prototype.draw;
  BossShot.prototype.draw = function (ctx, boss) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.kind === 'ball') {
      px(ctx, x - 4, y - 5, 9, 9, '#3a3d4a'); px(ctx, x - 5, y - 2, 11, 3, '#3a3d4a'); px(ctx, x - 2, y - 7, 3, 13, '#3a3d4a'); px(ctx, x - 3, y - 4, 3, 3, '#7a7e92');
    } else if (this.kind === 'hook') {
      const d = Math.sign(this.vx) || 1;
      px(ctx, x - d * 12, y - 1, 12, 2, '#6a6e86'); px(ctx, x - 3, y - 4, 7, 8, '#9aa0b8'); px(ctx, x + d * 3, y - 4, 3, 3, '#c8ccdc'); px(ctx, x + d * 3, y + 1, 3, 3, '#c8ccdc');
    } else old.call(this, ctx, boss);
  };
})();

function drawBell(ctx, cx, top, w, h, col, light, dark) {
  for (let i = 0; i < h; i++) {
    const k = i / h, rw = Math.round(w * (0.38 + 0.62 * Math.pow(k, 0.75)));
    px(ctx, cx - rw / 2, top + i, rw, 1, col);
    px(ctx, cx - rw / 2, top + i, Math.max(1, Math.round(rw * 0.22)), 1, light);
    px(ctx, cx + rw / 2 - Math.max(1, Math.round(rw * 0.18)), top + i, Math.max(1, Math.round(rw * 0.18)), 1, dark);
  }
  px(ctx, cx - w / 2 - 2, top + h, w + 4, 3, dark); px(ctx, cx - w / 2 - 2, top + h, w + 4, 1, light);
  px(ctx, cx - 1, top - 3, 3, 4, dark);
}

// ======================================================================= 5. THE BELL-BEARER
// He carries the bell that was rung for every fight. Its voice is what hurts.

class BellBearer extends Boss {
  constructor() {
    super({ name: 'The Bell-Bearer', hp: 40, w: 30, h: 56 });
    this.pose = 'idle'; this.enraged = false; this.echoes = []; this.ringT = 0;
  }
  get k() { return this.enraged ? 0.8 : 1; }
  restTime() { return (0.4 + Math.random() * 0.4) * (this.enraged ? 0.72 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'idle'; }

  think(dt, w) {
    const p = w.player;
    this.animT += dt;
    for (const e of this.echoes) if (!e.done && this.age >= e.t) { e.done = true; this.rings(e.x, w, true); }
    this.echoes = this.echoes.filter(e => !e.done || this.age < e.t + 0.6);
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    const ad = Math.abs(p.x - this.x);
    this.faceTo(p);
    this.pose = 'idle'; this.cool -= dt;
    if (!this.enraged && this.hp <= this.maxHp * 0.5) {
      this.enraged = true;
      this.play('toll!', [{ d: 0.2, pose: 'lift' }, { d: 0.9, pose: 'toll', on: (b, w2) => { Sfx.play('toll'); w2.cheer(1); w2.shake(3); b.rings(b.x, w2, false); } }], w);
      return;
    }
    this.vx = ad > 60 ? this.facing * (this.enraged ? 58 : 46) : 0;
    if (this.heat >= 6) { this.heat = 0; this.play('tolls', this.mTolls(w), w); return; }
    if (this.cool > 0) return;
    const opts = ad < 90 ? ['slam', 'clapper', 'tolls', 'slam'] : (ad < 200 ? ['tolls', 'rush', 'lob', 'echo', 'clapper'] : ['rush', 'lob', 'echo', 'tolls']);
    const m = this.choose(opts);
    this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w);
  }

  // a ring of sound runs out along the floor each way
  rings(x, w, echo) {
    Sfx.play('toll');
    for (const d of [-1, 1]) this.shots.push(new BossShot({ kind: 'ring', x: x + d * 14, y: GROUND_Y - 17, vx: d * (echo ? 150 : 165), w: 8, h: 34, ground: false, life: 3.2, pierce: true }));
    for (let i = 0; i < 6; i++) w.spawn({ x, y: GROUND_Y - 6, vx: (i % 2 ? 1 : -1) * (30 + Math.random() * 60), vy: -Math.random() * 20, life: 0.4, color: '#e8d890', size: 2, grav: 0 });
  }

  mSlam(w) {
    const k = this.k;
    return [
      { d: 0.65 * k, pose: 'lift', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'slam', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 40, 0, 12); }, hz: b => [hzFront(b, 4, 78, -76, 0)] },
      { d: 0.55, pose: 'low' },
    ];
  }

  mTolls(w) {
    const k = this.k, n = this.enraged ? 4 : 3, segs = [];
    for (let i = 0; i < n; i++) {
      segs.push({ d: (i ? 0.38 : 0.5) * k, pose: i % 2 ? 'swing1' : 'swing0', tell: i === 0, face: i === 0, tick: (b) => { b.vx = 0; } });
      segs.push({ d: 0.12, pose: 'toll', on: (b, w2) => { b.rings(b.x, w2, false); w2.shake(1.5); } });
    }
    segs.push({ d: 0.5, pose: 'low' });
    return segs;
  }

  mClapper(w) {
    const k = this.k;
    return [
      { d: 0.7 * k, pose: 'cwind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.3, pose: 'cswing', on: () => Sfx.play('whoosh'), hz: b => [{ box: { x: b.x - 72, y: b.y - 50, w: 144, h: 32 }, dmg: 1, fromX: b.x }] },
      { d: 0.6, pose: 'low' },
    ];
  }

  mRush(w) {
    const k = this.k;
    return [
      { d: 0.65 * k, pose: 'tuck', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 3, pose: 'roll', bot: 'jump', min: 0.25, until: b => (b.facing > 0 && b.x >= ARENA_R - 1) || (b.facing < 0 && b.x <= ARENA_L + 1), on: (b) => { b.vx = b.facing * 215; Sfx.play('whoosh'); }, hz: b => [{ box: { x: b.x - 24, y: b.y - 50, w: 48, h: 50 }, dmg: 1, fromX: b.x }] },
      { d: 1.0, pose: 'stunned', on: (b, w2) => { b.vx = 0; w2.shake(5); Sfx.play('toll'); w2.shake(4); } },
    ];
  }

  // one toll now, and the same toll again where it rang, a moment later
  mEcho(w) {
    const k = this.k;
    return [
      { d: 0.7 * k, pose: 'lift', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'toll', on: (b, w2) => { b.rings(b.x, w2, false); w2.shake(3); b.echoes.push({ x: b.x, t: b.age + 1.1, done: false }); } },
      { d: 0.55, pose: 'low' },
    ];
  }

  mLob(w) {
    const k = this.k;
    return [
      { d: 0.55 * k, pose: 'lobWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'lobThrow', on: (b, w2) => {
        const p = w2.player, T = 0.85, g = 650, y0 = b.y - 44, sx = b.x + b.facing * 18;
        Sfx.play('whoosh');
        b.shots.push(new BossShot({ kind: 'ball', x: sx, y: y0, vx: (clamp(p.x, ARENA_L, ARENA_R) - sx) / T, vy: (GROUND_Y - 5 - y0 - 0.5 * g * T * T) / T, grav: g, w: 11, h: 11, life: 3,
          onLand: (s, w3) => { Sfx.play('slam'); w3.shake(2); dustWave(w3, s.x, 0, 8); } }));
      } },
      { d: 0.55, pose: 'low' },
    ];
  }

  draw(ctx, t) {
    const robe = this.col('#3a3d4a'), robeD = this.col('#23242e'), red = this.col('#8a2a30'), bronze = this.col('#a87838'), bL = this.col('#d8a85a'), bD = this.col('#6a4a20');
    const pose = this.pose, flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    // the echo of a toll: a faint bell where it rang
    for (const e of this.echoes) if (!e.done) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.age * 20); drawBell(ctx, e.x, GROUND_Y - 36, 20, 22, '#e8d890', '#ffffff', '#a89850'); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const moving = Math.abs(this.vx) > 5 && !this.airborne, step = moving && Math.floor(this.animT * 5) % 2;
    const crouch = pose === 'low' || pose === 'stunned' ? 6 : 0;
    const tuck = pose === 'tuck' || pose === 'roll';
    if (!tuck) {
      px(ctx, -8, -14 + crouch / 2 + (step ? -2 : 0), 6, 14 - crouch / 2 + (step ? 2 : 0), robeD); px(ctx, 3, -14 + crouch / 2 + (step ? 0 : -2), 6, 14 - crouch / 2 + (step ? 0 : 2), robeD);
      px(ctx, -9, -3, 8, 3, '#15161c'); px(ctx, 3, -3, 8, 3, '#15161c');
      const ty = -42 + crouch;
      px(ctx, -11, ty, 22, 28 - crouch / 2, robe); px(ctx, -11, ty, 22, 2, this.col('#555a6a')); px(ctx, -2, ty, 5, 28 - crouch / 2, red); px(ctx, -11, ty + 22 - crouch / 2, 22, 3, '#1c1d24');
      px(ctx, -7, ty - 12, 13, 13, robeD); px(ctx, -6, ty - 14, 11, 3, robeD);
      px(ctx, 1, ty - 7, 4, 3, flare ? '#ffffff' : '#ffd070');
    }
    // the bell and what he holds
    if (pose === 'lift') { drawBell(ctx, 4, -88, 26, 24, bronze, bL, bD); px(ctx, -2, -62, 3, 16, robe); px(ctx, 6, -62, 3, 16, robe); }
    else if (pose === 'slam') { drawBell(ctx, 30, -28, 26, 26, bronze, bL, bD); px(ctx, 6, -40, 24, 4, robe); }
    else if (pose === 'swing0') { drawBell(ctx, -26, -56, 22, 22, bronze, bL, bD); px(ctx, -14, -44, 8, 3, robe); }
    else if (pose === 'swing1') { drawBell(ctx, 28, -56, 22, 22, bronze, bL, bD); px(ctx, 8, -44, 14, 3, robe); }
    else if (pose === 'toll') { drawBell(ctx, 0, -78, 24, 22, bronze, bL, bD); ctx.globalAlpha = 0.6; px(ctx, -26, -76, 4, 20, '#e8d890'); px(ctx, 24, -76, 4, 20, '#e8d890'); ctx.globalAlpha = 1; }
    else if (tuck) { drawBell(ctx, 0, -54, 38, 50, bronze, bL, bD); px(ctx, 6, -22, 4, 3, flare ? '#ffffff' : '#ffd070'); px(ctx, -8, -22, 3, 2, '#ffd070'); }
    else if (pose === 'cwind') { pixLine(ctx, -6, -34, -34, -42, 2, '#6a6e86'); drawBall(ctx, -36, -44); drawBell(ctx, -16, -30, 14, 14, bronze, bL, bD); }
    else if (pose === 'cswing') { pixLine(ctx, 8, -34, 62, -34, 2, '#6a6e86'); drawBall(ctx, 64, -35); pixLine(ctx, -8, -34, -62, -34, 2, '#6a6e86'); drawBall(ctx, -64, -35); }
    else if (pose === 'lobWind') { pixLine(ctx, 6, -36, 6, -60, 2, '#6a6e86'); drawBall(ctx, 6, -64); drawBell(ctx, -16, -30, 14, 14, bronze, bL, bD); }
    else if (pose === 'lobThrow') { pixLine(ctx, 6, -38, 20, -48, 2, '#6a6e86'); drawBell(ctx, -16, -30, 14, 14, bronze, bL, bD); }
    else if (pose === 'stunned') { drawBell(ctx, 26, -22, 22, 22, bronze, bL, bD); }
    else { drawBell(ctx, -18, -34, 20, 20, bronze, bL, bD); pixLine(ctx, -10, -30, -14, -34, 2, '#6a6e86'); px(ctx, 10, -32, 4, 3, robe); pixLine(ctx, 12, -30, 18, -8, 2, '#6a6e86'); }
    ctx.restore();
  }
}

function drawBall(ctx, x, y) { px(ctx, x - 4, y - 4, 9, 9, '#3a3d4a'); px(ctx, x - 5, y - 1, 11, 3, '#3a3d4a'); px(ctx, x - 1, y - 6, 3, 13, '#3a3d4a'); px(ctx, x - 3, y - 3, 3, 3, '#7a7e92'); }

PIT_BOSSES[4] = {
  id: 'bell', name: 'The Bell-Bearer', sub: 'He rang it for every one of you',
  coins: 20, music: 'pitC', cageW: 70, make: () => [new BellBearer()],
};

// ======================================================================= 6. THE BROTHERS
// Two of them, shackled by one chain. Kill one and the other does not stop. It only gets worse.

class Brother extends Boss {
  constructor(role, x) {
    const maul = role === 'maul';
    super({ name: maul ? 'Maul' : 'Lash', hp: 24, w: maul ? 28 : 18, h: maul ? 48 : 42, x });
    this.role = role; this.mate = null; this.pose = 'idle'; this.enraged = false; this.mode = null; this.tgt = x;
  }
  get alone() { return !this.mate || this.mate.dying || this.mate.dead; }
  get lead() { return this.role === 'maul' || (this.mate && (this.mate.dying || this.mate.dead)); }
  get k() { return this.enraged ? 0.74 : 1; }
  restTime() { return (0.45 + Math.random() * 0.35) * (this.enraged ? 0.6 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = this.role === 'maul' ? -1 : -1; this.pose = 'idle'; }

  chainBox(yTop, yBot) {
    const m = this.mate;
    if (!m || m.dying || m.dead) return [];
    const x0 = Math.min(this.x, m.x), x1 = Math.max(this.x, m.x);
    return [{ box: { x: x0, y: GROUND_Y - yTop, w: Math.max(4, x1 - x0), h: yTop - yBot }, dmg: 1, fromX: (x0 + x1) / 2 }];
  }

  think(dt, w) {
    const p = w.player;
    this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.alone && !this.enraged) {                         // its brother is gone
      this.enraged = true;
      this.play('howl', [{ d: 1.0, pose: 'howl', tick: (b) => { b.vx = 0; }, on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); w2.shake(3); } }], w);
      return;
    }
    if (this.seq) { this.stepSeq(dt, w); return; }
    const ad = Math.abs(p.x - this.x);
    this.faceTo(p); this.pose = 'idle'; this.mode = null;
    this.cool -= dt;
    if (!this.alone && !this.lead) {                           // the follower keeps a little distance and waits for the lead
      const want = clamp(p.x + (this.mate.x < p.x ? 1 : -1) * 150, ARENA_L, ARENA_R);
      this.vx = Math.abs(want - this.x) > 12 ? Math.sign(want - this.x) * 70 : 0;
      return;
    }
    this.vx = ad > 64 ? this.facing * (this.alone ? 86 : 62) : 0;
    if (this.heat >= 6 && !this.alone) { this.heat = 0; }
    if (this.cool > 0) return;
    if (!this.alone) {
      if (this.mate.seq) return;                               // wait for the other brother to finish
      this.startDuo(w);
    } else {
      const solo = this.role === 'maul' ? ['smash', 'charge', 'quake', 'smash'] : ['hook', 'dash', 'spin', 'hook'];
      const m = this.choose(solo);
      this.play(m, this['s' + m[0].toUpperCase() + m.slice(1)](w), w);
    }
  }

  startDuo(w) {
    const m = this.choose(['pincer', 'smashHook', 'whip', 'pincer', 'smashHook']);
    const [a, b] = this['d' + m[0].toUpperCase() + m.slice(1)](w);
    this.play(m, a, w); this.mate.play(m, b, w);
  }

  // ---- the two of them together ----
  dPincer(w) {
    const k = this.k, p = w.player;
    const mk = (me, other, side) => [
      { d: 0.9, pose: 'run', tick: (b) => { const g = clamp(w.player.x + side * 150, ARENA_L, ARENA_R); b.facing = Math.sign(w.player.x - b.x) || 1; b.vx = Math.abs(g - b.x) > 8 ? Math.sign(g - b.x) * 150 : 0; } },
      { d: 0.55 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.mode = 'wind'; } },
      { d: 2, pose: 'rush', bot: 'jump', min: 0.3, on: (b) => { b.tgt = clamp(w.player.x - side * 70, ARENA_L, ARENA_R); b.mode = 'low'; b.vx = Math.sign(b.tgt - b.x) * 255; b.facing = Math.sign(b.vx) || 1; Sfx.play('whoosh'); },
        until: b => Math.abs(b.tgt - b.x) < 8 || (b.vx > 0 ? b.x >= ARENA_R - 1 : b.x <= ARENA_L + 1),
        hz: b => b.lead ? [hzBody(b, 4), ...b.chainBox(10, 0)] : [hzBody(b, 4)] },
      { d: 0.65, pose: 'stumble', on: (b, w2) => { b.vx = 0; b.mode = null; w2.shake(2); } },
    ];
    const side = this.x <= this.mate.x ? -1 : 1;
    return [mk(this, this.mate, side), mk(this.mate, this, -side)];
  }

  dSmashHook(w) {
    const k = this.k;
    const lead = [
      { d: 1.5, pose: 'run', bot: 'away', tick: (b) => { b.faceTo(w.player); b.vx = b.facing * 112; }, until: b => Math.abs(w.player.x - b.x) < 66 },
      { d: 0.62 * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.16, pose: 'smash', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 48, 0, 12); }, hz: b => [hzFront(b, 4, 78, -84, 0)] },
      { d: 0.6, pose: 'stumble' },
    ];
    const mate = [
      { d: 1.0, pose: 'run', tick: (b) => { const g = clamp(w.player.x + (b.x < w.player.x ? -1 : 1) * 180, ARENA_L, ARENA_R); b.faceTo(w.player); b.vx = Math.abs(g - b.x) > 8 ? Math.sign(g - b.x) * 130 : 0; } },
      { d: 0.55 * k, pose: 'throwWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.12, pose: 'throw', on: (b, w2) => { Sfx.play('chain'); b.shots.push(new BossShot({ kind: 'hook', x: b.x + b.facing * 12, y: GROUND_Y - 16, vx: b.facing * 270, w: 16, h: 7, ground: false, life: 2.4 })); } },
      { d: 0.7, pose: 'idle' },
    ];
    return [lead, mate];
  }

  dWhip(w) {
    const k = this.k;
    const mk = (side) => [
      { d: 1.0, pose: 'run', tick: (b) => { const g = clamp(w.player.x + side * 130, ARENA_L, ARENA_R); b.faceTo(w.player); b.vx = Math.abs(g - b.x) > 8 ? Math.sign(g - b.x) * 150 : 0; } },
      { d: 0.7 * k, pose: 'liftChain', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.mode = 'high'; } },
      { d: 0.5, pose: 'liftChain', bot: 'jump', on: () => Sfx.play('whoosh'), hz: b => b.lead ? b.chainBox(42, 14) : [] },
      { d: 0.5, pose: 'idle', on: (b) => { b.mode = null; } },
    ];
    const side = this.x <= this.mate.x ? -1 : 1;
    return [mk(side), mk(-side)];
  }

  // ---- one of them alone ----
  sSmash(w) {
    const k = this.k;
    return [
      { d: 1.5, pose: 'run', bot: 'away', tick: (b) => { b.faceTo(w.player); b.vx = b.facing * 120; }, until: b => Math.abs(w.player.x - b.x) < 66 },
      { d: 0.5 * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.16, pose: 'smash', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 48, 0, 12); }, hz: b => [hzFront(b, 4, 78, -84, 0)] },
      { d: 0.2, pose: 'stumble' },
      { d: 0.42 * k, pose: 'wind', tell: true, face: true },
      { d: 0.16, pose: 'smash', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 48, 0, 12); }, hz: b => [hzFront(b, 4, 78, -84, 0)] },
      { d: 0.5, pose: 'stumble' },
    ];
  }
  sCharge(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 2, pose: 'rush', bot: 'jump', min: 0.3, on: (b) => { b.vx = b.facing * 290; Sfx.play('roar'); }, until: b => (b.facing > 0 && b.x >= ARENA_R - 1) || (b.facing < 0 && b.x <= ARENA_L + 1), hz: b => [hzBody(b, 5)] },
      { d: 0.9, pose: 'stumble', on: (b, w2) => { b.vx = 0; w2.shake(5); Sfx.play('slam'); } },
    ];
  }
  sQuake(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.tgt = clamp(w.player.x, ARENA_L + 10, ARENA_R - 10); } },
      { d: 1.2, pose: 'air', bot: 'away', min: 0.2, until: b => !b.airborne, on: (b) => { b.vy = -560; b.vx = clamp((b.tgt - b.x) / 0.8, -260, 260); Sfx.play('whoosh'); } },
      { d: 0.14, pose: 'smash', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 16); }, hz: b => [{ box: { x: b.x - 40, y: b.y - 28, w: 80, h: 28 }, dmg: 1, fromX: b.x }] },
      { d: 0.6, pose: 'stumble' },
    ];
  }
  sHook(w) {
    const k = this.k, fire = (b) => { Sfx.play('chain'); b.shots.push(new BossShot({ kind: 'hook', x: b.x + b.facing * 12, y: GROUND_Y - 16, vx: b.facing * 300, w: 16, h: 7, ground: false, life: 2.4 })); };
    return [
      { d: 0.45 * k, pose: 'throwWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.1, pose: 'throw', on: fire },
      { d: 0.25, pose: 'idle' },
      { d: 0.35 * k, pose: 'throwWind', tell: true, face: true },
      { d: 0.1, pose: 'throw', on: fire },
      { d: 0.5, pose: 'idle' },
    ];
  }
  sDash(w) {
    const k = this.k;
    return [
      { d: 0.4 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.28, pose: 'dash', on: (b) => { b.vx = b.facing * 360; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 6), hzFront(b, 4, 34, -34, -6)] },
      { d: 0.5, pose: 'stumble', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); } },
    ];
  }
  sSpin(w) {
    const k = this.k;
    return [
      { d: 0.6 * k, pose: 'liftChain', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.4, pose: 'spin', on: () => Sfx.play('whoosh'), hz: b => [{ box: { x: b.x - 66, y: b.y - 40, w: 132, h: 28 }, dmg: 1, fromX: b.x }] },
      { d: 0.6, pose: 'stumble' },
    ];
  }

  draw(ctx, t) {
    const pose = this.pose, maul = this.role === 'maul', flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const moving = Math.abs(this.vx) > 5 && !this.airborne, step = moving && Math.floor(this.animT * (pose === 'rush' || pose === 'dash' ? 14 : 7)) % 2;
    const crouch = pose === 'crouch' || pose === 'stumble' ? (maul ? 8 : 6) : 0;
    const air = this.airborne;
    if (maul) {
      const skin = this.col('#8a6a5e'), skinD = this.col('#5a4238'), iron = this.col('#4a4e5e'), pants = this.col('#2a2a32');
      px(ctx, -10, -16 + crouch / 2 + (step ? -2 : 0), 8, 16 - crouch / 2 + (step ? 2 : 0), pants); px(ctx, 2, -16 + crouch / 2 + (step ? 0 : -2), 8, 16 - crouch / 2 + (step ? 0 : 2), pants);
      px(ctx, -11, -3, 10, 3, '#15161c'); px(ctx, 2, -3, 10, 3, '#15161c'); px(ctx, -11, -8, 10, 2, iron);
      const ty = -38 + crouch;
      px(ctx, -14, ty, 28, 24 - crouch / 2, skin); px(ctx, -14, ty, 28, 3, this.col('#a8806e')); px(ctx, -14, ty + 20 - crouch / 2, 28, 3, pants);
      px(ctx, -17, ty + 2, 6, 12, skin); px(ctx, 11, ty + 2, 6, 12, skin); px(ctx, -17, ty + 12, 6, 3, iron);
      px(ctx, -6, ty - 10, 13, 11, this.col('#2a2a32')); px(ctx, -6, ty - 10, 13, 2, this.col('#3a3a44')); px(ctx, 1, ty - 6, 4, 2, flare ? '#ffffff' : '#ff7a3a');
      let hx = 12, hy = ty + 8, tx = 28, tyy = -6;                                         // the maul
      if (pose === 'wind') { hx = 6; hy = ty - 4; tx = 4; tyy = ty - 42; }
      else if (pose === 'smash') { hx = 12; hy = ty + 4; tx = 52; tyy = -2; }
      else if (pose === 'howl') { hx = 8; hy = ty - 2; tx = 8; tyy = ty - 36; }
      else if (pose === 'rush') { hx = 8; hy = ty + 10; tx = 34; tyy = ty + 18; }
      else if (pose === 'air') { hx = 6; hy = ty - 2; tx = 14; tyy = ty - 38; }
      pixLine(ctx, hx, hy, tx, tyy, 4, this.col('#4a3a2a'));
      px(ctx, tx - 7, tyy - 6, 14, 12, iron); px(ctx, tx - 7, tyy - 6, 14, 2, this.col('#7a7e92')); px(ctx, tx - 9, tyy - 2, 3, 4, iron); px(ctx, tx + 6, tyy - 2, 3, 4, iron);
      px(ctx, hx - 2, hy - 2, 5, 5, skin);
    } else {
      const cloak = this.col('#2a3a3a'), cloakL = this.col('#3e5656'), mask = this.col('#e8e4d8'), pants = this.col('#1c2424');
      px(ctx, -6, -14 + crouch / 2 + (step ? -2 : 0), 5, 14 - crouch / 2 + (step ? 2 : 0), pants); px(ctx, 1, -14 + crouch / 2 + (step ? 0 : -2), 5, 14 - crouch / 2 + (step ? 0 : 2), pants);
      px(ctx, -7, -3, 7, 3, '#101616'); px(ctx, 1, -3, 7, 3, '#101616');
      const ty = -34 + crouch;
      px(ctx, -8, ty, 16, 22 - crouch / 2, cloak); px(ctx, -8, ty, 16, 2, cloakL); px(ctx, -10, ty + 14 - crouch / 2, 4, 8, cloak); px(ctx, -12, ty + 18 - crouch / 2, 3, 6, cloak);
      px(ctx, -5, ty - 10, 10, 11, cloak); px(ctx, -4, ty - 8, 8, 8, mask); px(ctx, 0, ty - 5, 3, 2, flare ? '#ff3a3a' : '#202020'); px(ctx, -3, ty - 5, 2, 2, '#202020');
      if (pose === 'liftChain' || pose === 'spin') { pixLine(ctx, 6, ty + 2, 10, ty - 26, 3, '#6a6e86'); px(ctx, 6, ty - 30, 8, 5, '#9aa0b8'); if (pose === 'spin') { pixLine(ctx, 10, ty - 8, 66, ty + 4, 2, '#6a6e86'); pixLine(ctx, -10, ty - 8, -66, ty + 4, 2, '#6a6e86'); px(ctx, 64, ty, 6, 8, '#9aa0b8'); px(ctx, -70, ty, 6, 8, '#9aa0b8'); } }
      else if (pose === 'throwWind') { pixLine(ctx, -2, ty + 4, -18, ty - 6, 3, cloakL); px(ctx, -22, ty - 10, 6, 6, '#9aa0b8'); }
      else if (pose === 'throw') { pixLine(ctx, 4, ty + 4, 20, ty + 6, 3, cloakL); px(ctx, 18, ty + 2, 6, 6, '#9aa0b8'); }
      else if (pose === 'dash') { pixLine(ctx, 4, ty + 4, 30, ty + 10, 2, '#e8ecf4'); pixLine(ctx, 4, ty + 7, 28, ty + 16, 2, '#e8ecf4'); }
      else { pixLine(ctx, 4, ty + 8, 10, ty + 20, 3, cloakL); }
    }
    ctx.restore();
  }

  // the chain that binds them: it hangs between their wrists, lies on the floor when they run, and lifts when they pull
  drawAll(ctx, t) {
    super.drawAll(ctx, t);
    if (this.role !== 'lash') return;
    const a = this.mate, b = this;
    if (a.dead && b.dead) return;
    const alive = !(a.dying || a.dead);
    const ax = a.x + a.facing * 10, bx = b.x + b.facing * 6;
    const mode = a.mode || b.mode;
    const n = Math.max(2, Math.round(Math.abs(ax - bx) / 5));
    if (alive && !b.dying) {
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = ax + (bx - ax) * u;
        let y;
        if (mode === 'low') y = GROUND_Y - 4;
        else if (mode === 'high') y = GROUND_Y - 28 + Math.sin(u * Math.PI) * -6;
        else y = GROUND_Y - 22 + Math.sin(u * Math.PI) * Math.min(18, Math.abs(ax - bx) * 0.08 + 2);
        px(ctx, x - 1, y - 1, 3, 3, i % 2 ? '#6a6e86' : '#9aa0b8');
      }
    } else if (!b.dying) {                                                             // the broken chain lies by the one who is left
      for (let i = 0; i < 6; i++) px(ctx, b.x - b.facing * (10 + i * 4) - 1, GROUND_Y - 2 - (i % 2), 3, 3, i % 2 ? '#6a6e86' : '#9aa0b8');
    }
  }
}

function makeBrothers() {
  const a = new Brother('maul', 300), b = new Brother('lash', 366);
  a.mate = b; b.mate = a;
  return [a, b];
}

PIT_BOSSES[5] = {
  id: 'brothers', name: 'The Brothers', sub: 'Maul and Lash. One chain between them.',
  coins: 22, music: 'finalB', cageW: 130, cageX: 333, make: makeBrothers,
};
