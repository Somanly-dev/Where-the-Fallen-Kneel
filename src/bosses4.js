'use strict';

// Pits bosses 7 and 8: the ranks, and the patchwork champion.

// ======================================================================= 7. THE RANKS
// Three waves of the soldiers who guard the pit. There are never more strong ones than weak ones.

const RANK_WAVES = [
  ['pitgrunt', 'pitgrunt', 'pitgrunt'],
  ['pitgrunt', 'pitgrunt', 'pitgrunt', 'pitgrunt', 'pitbrute'],
  ['pitbrute', 'pitdog', 'captain', 'pitdog', 'pitbrute'],
];

class RankSquad extends Boss {
  constructor() {
    super({ name: 'The Ranks', hp: 1, w: 2, h: 30 });
    this.soldiers = []; this.queue = []; this.corpses = [];
    this.wave = 0; this.gapT = 0.5; this.rally = 0; this.rallyT = 4;
    this.total = RANK_WAVES.reduce((s, wv) => s + wv.reduce((a, k) => a + SOLDIERS[k].hp, 0), 0);
  }

  hitbox() { return { x: -999, y: -999, w: 1, h: 1 }; }
  hit() {}
  targetList() { return this.engaged && !this.dying ? this.soldiers.filter(s => !s.dead) : []; }
  attacks() { return []; }
  idleUpdate(dt) { this.animT += dt; }

  remaining() {
    let hp = this.soldiers.reduce((s, x) => s + Math.max(0, x.hp), 0);
    hp += this.queue.reduce((s, q) => s + SOLDIERS[q.kind].hp, 0);
    for (let i = this.wave; i < RANK_WAVES.length; i++) hp += RANK_WAVES[i].reduce((a, k) => a + SOLDIERS[k].hp, 0);
    return hp;
  }
  barInfo() { return { name: 'The Ranks', hp: this.remaining(), max: this.total, text: `Wave ${Math.max(1, this.wave)} of ${RANK_WAVES.length}` }; }

  startWave(w) {
    this.wave++;
    const list = RANK_WAVES[this.wave - 1];
    list.forEach((kind, i) => this.queue.push({ t: this.age + 0.3 + i * 0.6, kind, side: i % 2 ? 1 : -1 }));
    Sfx.play('horn'); w.cheer(0.8);
    w.floater(W / 2, 60, `WAVE ${this.wave}`, '#c0405a');
    this.rallyT = 3.5;
  }

  update(dt, w) {
    if (this.dying || this.dead) { super.update(dt, w); return; }
    this.age += dt;
    if (!this.engaged) return;
    const p = w.player;
    // soldiers march in from the gates, one by one
    for (const q of this.queue) if (!q.done && this.age >= q.t) {
      q.done = true;
      const s = new Soldier(q.side < 0 ? ARENA_L + 2 : ARENA_R - 2, q.kind, -q.side);
      s.state = 'chase';
      this.soldiers.push(s);
    }
    this.queue = this.queue.filter(q => !q.done);
    // the captain's shout: for a few seconds everyone moves and strikes faster
    const cap = this.soldiers.some(s => s.look === 'captain' && !s.dead);
    this.rally = Math.max(0, this.rally - dt);
    if (cap) {
      this.rallyT -= dt;
      if (this.rallyT <= 0) { this.rallyT = 8; this.rally = 3.5; Sfx.play('horn'); w.shake(2); w.floater(this.soldiers.find(s => s.look === 'captain').x, GROUND_Y - 52, 'FORWARD!', '#ff7a3a'); }
    }
    const speed = this.rally > 0 ? 1.35 : 1;
    for (const s of this.soldiers) if (!p.dead) s.update(dt * speed, w);
    // keep them from standing inside each other
    for (let i = 0; i < this.soldiers.length; i++) for (let j = i + 1; j < this.soldiers.length; j++) {
      const a = this.soldiers[i], b = this.soldiers[j], d = b.x - a.x;
      if (!a.dead && !b.dead && Math.abs(d) < 12) { const push = (12 - Math.abs(d)) * 3 * dt * (d >= 0 ? 1 : -1); a.x -= push; b.x += push; }
    }
    for (const s of this.soldiers) if (s.dead && !s.sunk) { s.sunk = true; this.corpses.push({ s, t: 0 }); this.lastX = s.x; }
    this.soldiers = this.soldiers.filter(s => !s.dead);
    for (const c of this.corpses) c.t += dt;
    this.corpses = this.corpses.filter(c => c.t < 1.6);
    if (!this.soldiers.length && !this.queue.length) {
      if (this.wave >= RANK_WAVES.length) { this.x = this.lastX == null ? W / 2 : this.lastX; this.y = GROUND_Y; this.die(w); return; }
      this.gapT -= dt;
      if (this.gapT <= 0) { this.gapT = 1.3; this.startWave(w); }
    } else this.gapT = 1.3;
  }

  drawAll(ctx, t) {
    for (const c of this.corpses) {                                    // the fallen sink into the mud
      const k = clamp(c.t / 1.4, 0, 1);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, GROUND_Y + 1); ctx.clip();
      ctx.globalAlpha = 1 - k * 0.5;
      ctx.translate(0, Math.round(k * 36));
      c.s.draw(ctx);
      ctx.restore();
    }
    for (const s of this.soldiers) {
      s.draw(ctx);
      if (this.rally > 0 && !s.dead) { ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.age * 14); px(ctx, s.x - s.T.w / 2 - 1, s.y - s.T.h - 1, s.T.w + 2, 2, '#ff5a3a'); ctx.globalAlpha = 1; }
    }
  }
}

PIT_BOSSES[6] = {
  id: 'ranks', name: 'The Ranks', sub: 'The ones who watched, and bet',
  coins: 25, music: 'pitA', cageW: 0, make: () => [new RankSquad()],
};

// ======================================================================= 8. THE PATCHWORK CHAMPION
// Sewn from everything the pit ever made. He is faster than he looks.

class PatchworkChampion extends Boss {
  constructor() {
    super({ name: 'The Patchwork Champion', hp: 95, w: 24, h: 46 });
    this.antiCd = 0; this.swatCd = 0; this.swatPhase = 0; this.swatTm = 0; this.volleys = 0;
    this.pose = 'idle'; this.mark = null; this.tx = 0; this.half = false; this.fury = false;
  }
  get k() { return this.hp <= this.maxHp * 0.5 ? 1.05 : 1.25; }                 // longer warnings: he is slower than he was
  get desperate() { return this.hp <= this.maxHp * 0.25; }
  restTime() { return (0.34 + Math.random() * 0.34) * (this.desperate ? 0.65 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'idle'; }

  think(dt, w) {
    const p = w.player;
    this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    const ad = Math.abs(p.x - this.x);
    this.faceTo(p); this.pose = 'idle'; this.mark = null; this.gravity = 1400;
    this.cool -= dt;
    if (!this.half && this.hp <= this.maxHp * 0.5) {
      this.half = true;
      this.play('roar', [{ d: 0.7, pose: 'roar', on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); } }], w);
      return;
    }
    if (!this.fury && this.desperate) {
      this.fury = true;
      this.play('roar', [{ d: 0.8, pose: 'roar', on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); w2.shake(4); } }], w);
      return;
    }
    this.vx = ad > 64 ? this.facing * 100 : 0;
    this.antiCd = Math.max(0, this.antiCd - dt);
    // standing above him and pogoing is answered at once with a stab straight up
    if (this.antiCd <= 0 && p.y < this.y - 34 && !p.onGround && ad < 58) { this.antiCd = 1.1; this.play('uplash', this.mUplash(w), w); return; }
    if (this.heat >= 8) { this.heat = 0; this.play('blink', this.mBlink(w), w); return; }
    if (this.cool > 0) return;
    let m;
    if (this.desperate && Math.random() < 0.4) m = 'fury';
    else m = this.choose(ad < 90 ? ['flurry', 'chop', 'toll', 'thrust', 'flurry'] : (ad < 200 ? ['thrust', 'dive', 'fan', 'toll', 'chop', 'flight'] : ['thrust', 'dive', 'fan', 'toll', 'flight', 'flight']));
    this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w);
  }

  // the column above him: anything over his head is hit
  upBox(b) { return { box: { x: b.x - 30, y: b.y - 130, w: 60, h: 104 }, dmg: 1, fromX: b.x }; }

  mUplash(w) {
    return [
      { d: 0.22, pose: 'uptell', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: () => Sfx.play('warn') },
      { d: 0.14, pose: 'upslash', on: () => Sfx.play('slash'), hz: b => [b.upBox(b)] },
      { d: 0.35, pose: 'low' },
    ];
  }

  // he takes to the air on the wing, rains feathers while he circles over you, then drops on you
  mFlight(w) {
    const k = this.k;
    const volley = (b, w2) => {
      const p = w2.player, a0 = Math.atan2(p.y - 11 - (b.y - 20), p.x - b.x);
      Sfx.play('flap');
      for (let i = 0; i < 3; i++) { const a = a0 + (i - 1) * 0.4; b.shots.push(new BossShot({ kind: 'feather', x: b.x, y: b.y - 20, vx: Math.cos(a) * 145, vy: Math.sin(a) * 145, w: 6, h: 3, life: 4 })); }
    };
    return [
      { d: 0.4 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.35, pose: 'takeoff', on: (b) => { b.gravity = 0; b.vy = -520; Sfx.play('flap'); }, tick: (b) => { b.vy = Math.max(-520, (118 - b.y) * 6); } },
      { d: 2.3 * k, pose: 'fly', bot: 'away', on: (b) => { b.swatPhase = 0; b.swatCd = 0.6; b.volleys = 0; },
        tick: (b, dt, w2) => {
          const p = w2.player;
          b.faceTo(p);
          const gx = clamp(p.x + Math.sin(b.age * 1.7) * 90, ARENA_L, ARENA_R);
          b.vx = clamp((gx - b.x) * 2.2, -170, 170);
          b.vy = clamp((118 + Math.sin(b.age * 3) * 10 - b.y) * 5, -240, 240);
          if (b.sT > 0.7 + b.volleys * 0.8 && b.volleys < 2) { b.volleys++; volley(b, w2); }
          // anyone above him gets swatted
          b.swatCd -= dt;
          if (!b.swatPhase && b.swatCd <= 0 && p.y < b.y - 20 && Math.abs(p.x - b.x) < 58) { b.swatPhase = 1; b.swatTm = 0.22; b.swatCd = 1.3; Sfx.play('warn'); }
          else if (b.swatPhase) { b.swatTm -= dt; if (b.swatTm <= 0) { if (b.swatPhase === 1) { b.swatPhase = 2; b.swatTm = 0.14; Sfx.play('slash'); } else b.swatPhase = 0; } }
        },
        hz: b => (b.swatPhase === 2 ? [b.upBox(b)] : []) },
      { d: 0.25 * k, pose: 'hang', tell: true, bot: 'away', on: (b) => { b.swatPhase = 0; b.vy = 0; b.vx = 0; b.mark = clamp(w.player.x, ARENA_L, ARENA_R); Sfx.play('warn'); }, tick: (b) => { b.vy = 0; b.vx = 0; } },
      { d: 1.2, pose: 'dive', bot: 'away', min: 0.1, until: b => !b.airborne, on: (b) => { b.gravity = 1400; const T = 0.38; b.vy = (GROUND_Y - b.y) / T; b.vx = (b.mark - b.x) / T; b.facing = Math.sign(b.vx) || b.facing; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 6)] },
      { d: 0.14, pose: 'slam', on: (b, w2) => { b.vx = 0; b.vy = 0; b.mark = null; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 16); }, hz: b => [{ box: { x: b.x - 36, y: b.y - 28, w: 72, h: 28 }, dmg: 1, fromX: b.x }] },
      { d: 0.5, pose: 'low' },
    ];
  }

  mBlink(w) {
    return [
      { d: 0.08, pose: 'crouch' },
      { d: 0.28, pose: 'sprint', on: (b, w2) => { let away = w2.player.x >= b.x ? -1 : 1; if ((away < 0 && b.x < ARENA_L + 90) || (away > 0 && b.x > ARENA_R - 90)) away = -away; b.facing = away; b.vx = away * 360; } },
      { d: 0.08, pose: 'idle', on: (b) => { b.vx = 0; } },
    ];
  }

  mThrust(w) {
    const k = this.k;
    return [
      { d: 0.34 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.45, pose: 'sprint', min: 0.08, until: b => Math.abs(w.player.x - b.x) < 48, on: (b) => { b.vx = b.facing * 380; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4)] },
      { d: 0.14, pose: 'thrust', on: (b) => { b.vx = b.facing * 60; Sfx.play('slash'); }, hz: b => [hzFront(b, 4, 78, -36, -8)] },
      { d: 0.4, pose: 'low', tick: (b, dt) => { b.vx = approach(b.vx, 0, 700 * dt); } },
    ];
  }

  mDive(w) {
    const k = this.k;
    return [
      { d: 0.3 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.42, pose: 'air', bot: 'away', on: (b) => { b.vy = -680; b.vx = clamp((w.player.x - b.x) * 0.9, -200, 200); Sfx.play('flap'); } },
      { d: 0.2 * k, pose: 'hang', tell: true, bot: 'away', on: (b) => { b.gravity = 0; b.vy = 0; b.vx = 0; b.mark = clamp(w.player.x, ARENA_L, ARENA_R); Sfx.play('warn'); }, tick: (b) => { b.vy = 0; b.vx = 0; } },
      { d: 1.2, pose: 'dive', bot: 'away', min: 0.1, until: b => !b.airborne, on: (b) => { b.gravity = 1400; const T = 0.37; b.vy = (GROUND_Y - b.y) / T; b.vx = (b.mark - b.x) / T; b.facing = Math.sign(b.vx) || b.facing; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 6)] },
      { d: 0.14, pose: 'slam', on: (b, w2) => { b.vx = 0; b.vy = 0; b.mark = null; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 16); }, hz: b => [{ box: { x: b.x - 36, y: b.y - 28, w: 72, h: 28 }, dmg: 1, fromX: b.x }] },
      { d: 0.45, pose: 'low' },
    ];
  }

  mFlurry(w) {
    const k = this.k;
    const claw = (windup, dur, y0, y1, reach, pose) => [
      { d: windup * k, pose: pose + 'W', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: dur, pose, on: (b) => { b.vx = b.facing * 130; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, reach, y0, y1)] },
      { d: 0.05, pose: 'idle', on: (b) => { b.vx = 0; } },
    ];
    return [].concat(claw(0.3, 0.1, -36, -8, 54, 'claw1'), claw(0.18, 0.1, -40, -12, 56, 'claw2'), claw(0.2, 0.14, -48, 0, 62, 'claw3'), [{ d: 0.4, pose: 'low' }]);
  }

  mFan(w) {
    const k = this.k, n = this.desperate ? 6 : 5;
    return [
      { d: 0.45 * k, pose: 'wing', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'wingFling', on: (b, w2) => {
        const p = w2.player, a0 = Math.atan2(p.y - 11 - (b.y - 34), p.x - b.x);
        Sfx.play('flap');
        for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.2; b.shots.push(new BossShot({ kind: 'feather', x: b.x, y: b.y - 34, vx: Math.cos(a) * 205, vy: Math.sin(a) * 205, w: 10, h: 5, life: 3 })); }
      } },
      { d: 0.35, pose: 'idle' },
    ];
  }

  mChop(w) {
    const k = this.k;
    return [
      { d: 0.36 * k, pose: 'sweepW', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.12, pose: 'sweep', on: (b) => { b.vx = b.facing * 100; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 66, -16, 0)] },
      { d: 0.1, pose: 'idle', on: (b) => { b.vx = 0; } },
      { d: 0.28 * k, pose: 'up', tell: true, face: true },
      { d: 0.14, pose: 'chop', on: (b, w2) => { Sfx.play('slam'); w2.shake(3); dustWave(w2, b.x + b.facing * 50, 0, 10); }, hz: b => [hzFront(b, 4, 68, -94, 0)] },
      { d: 0.4, pose: 'low' },
    ];
  }

  mToll(w) {
    const k = this.k;
    return [
      { d: 0.45 * k, pose: 'bellRaise', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'bell', bot: 'jump', on: (b, w2) => {
        Sfx.play('toll'); w2.shake(2);
        for (const d of [-1, 1]) b.shots.push(new BossShot({ kind: 'ring', x: b.x + d * 14, y: GROUND_Y - 17, vx: d * 150, w: 8, h: 34, ground: false, life: 3, pierce: true }));
      } },
      { d: 0.28, pose: 'idle' },
      { d: 0.24, pose: 'crouch', tell: true, face: true },
      { d: 0.28, pose: 'sprint', min: 0.1, on: (b) => { b.vx = b.facing * 330; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4), hzFront(b, 4, 40, -34, -6)] },
      { d: 0.4, pose: 'low', tick: (b, dt) => { b.vx = approach(b.vx, 0, 800 * dt); } },
    ];
  }

  // when he is nearly done he stops resting between his best moves
  mFury(w) {
    const a = this.mThrust(w).slice(0, -1), b = this.mDive(w).slice(0, -1), c = this.mFlurry(w);
    return [].concat(a, [{ d: 0.12, pose: 'idle', on: (bb) => { bb.vx = 0; } }], b, [{ d: 0.1, pose: 'idle' }], c);
  }

  draw(ctx, t) {
    const fur = this.col('#4a4650'), furD = this.col('#2e2a34'), armor = this.col('#3a3d4a'), red = this.col('#8a2a30'), skin = this.col('#7a5a52'), bone = this.col('#d8cdb0');
    const wing = this.col('#2a2230'), tip = this.col('#8a7aa0'), bronze = this.col('#a87838'), steel = this.col('#c8ced8'), stitch = this.col('#e8e0d0');
    const pose = this.pose, tell = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    if (this.mark != null && (pose === 'hang' || pose === 'dive')) { ctx.globalAlpha = 0.5; px(ctx, this.mark - 22, GROUND_Y - 2, 44, 3, '#000000'); px(ctx, this.mark - 14, GROUND_Y - 3, 28, 1, '#000000'); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const moving = Math.abs(this.vx) > 5 && !this.airborne, step = moving && Math.floor(this.animT * (Math.abs(this.vx) > 200 ? 16 : 9)) % 2;
    const crouch = pose === 'crouch' ? 8 : (pose === 'low' ? 5 : 0);
    // the wing sewn onto his back
    const flap = (pose === 'fly' || pose === 'takeoff') ? (Math.floor(this.age * 8) % 2 ? -32 : -4) : null;
    const up = pose === 'wing' || pose === 'wingFling' || pose === 'roar' || pose === 'hang';
    const wy = flap != null ? flap : (up ? -30 : (pose === 'dive' || pose === 'sprint' ? 2 : -14));
    pixLine(ctx, -8, -34 + crouch, -22, -34 + crouch + wy * 0.6, 5, wing); pixLine(ctx, -22, -34 + crouch + wy * 0.6, -34, -34 + crouch + wy, 4, wing);
    for (let i = 0; i < 4; i++) pixLine(ctx, -20 - i * 4, -34 + crouch + wy * (0.55 + i * 0.12), -22 - i * 4, -34 + crouch + wy * (0.55 + i * 0.12) + 9, 2, tip);
    // wolf legs
    if (this.airborne) { px(ctx, -9, -14 + 4, 6, 10, furD); px(ctx, 3, -14 + 4, 6, 10, furD); }
    else { px(ctx, -9, -16 + crouch / 2 + (step ? -3 : 0), 6, 16 - crouch / 2 + (step ? 3 : 0), furD); px(ctx, 3, -16 + crouch / 2 + (step ? 0 : -3), 6, 16 - crouch / 2 + (step ? 0 : 3), furD); px(ctx, -8, -22 + crouch / 2, 4, 8, fur); px(ctx, 4, -22 + crouch / 2, 4, 8, fur); }
    px(ctx, -10, -3, 8, 3, '#15161c'); px(ctx, 3, -3, 8, 3, '#15161c');
    // sergeant's armour, with stitches
    const ty = -38 + crouch;
    px(ctx, -11, ty, 22, 22 - crouch / 2, armor); px(ctx, -11, ty, 22, 2, this.col('#555a6a')); px(ctx, -3, ty, 7, 22 - crouch / 2, red);
    for (let i = 0; i < 4; i++) px(ctx, -10 + i * 6, ty + 14 - crouch / 2, 2, 1, stitch);
    px(ctx, 0, ty + 3, 1, 9, stitch); for (let i = 0; i < 3; i++) px(ctx, -1, ty + 4 + i * 3, 3, 1, stitch);
    // a bell at his belt
    px(ctx, 7, ty + 16 - crouch / 2, 6, 5, bronze); px(ctx, 6, ty + 20 - crouch / 2, 8, 2, this.col('#6a4a20'));
    // the swollen arm, and the head
    px(ctx, -17, ty + 1, 7, 12, skin); px(ctx, -18, ty + 10, 6, 5, bone);
    const hy = ty - 13;
    px(ctx, -6, hy, 12, 13, this.col('#2c2e3a')); px(ctx, -6, hy, 12, 2, this.col('#3a3c48')); px(ctx, -6, hy + 5, 12, 1, stitch);
    px(ctx, 6, hy + 5, 8, 4, bone); px(ctx, 12, hy + 7, 3, 5, bone);                                    // a beak
    px(ctx, -6, hy - 4, 3, 5, fur); px(ctx, 3, hy - 4, 3, 5, fur);                                      // wolf ears
    px(ctx, 1, hy + 3, 3, 2, tell ? '#ffffff' : '#ff7a3a'); px(ctx, -4, hy + 4, 2, 2, tell ? '#ffffff' : '#ffd24a');
    // the spear
    let hx = 9, hyy = ty + 10, tx = 22, tyy = ty - 6;
    if (pose === 'thrust') { hx = 12; hyy = ty + 6; tx = 76; tyy = ty + 8; }
    else if (pose === 'sprint' || pose === 'dive') { hx = 8; hyy = ty + 8; tx = 44; tyy = ty + 12; }
    else if (pose === 'up' || pose === 'uptell') { hx = 6; hyy = ty - 2; tx = 4; tyy = ty - 50; }
    else if (pose === 'upslash') { hx = 4; hyy = ty - 2; tx = 4; tyy = ty - 92; }
    else if (pose === 'fly' || pose === 'takeoff') { hx = 8; hyy = ty + 12; tx = 20; tyy = ty + 30; }
    else if (pose === 'chop') { hx = 10; hyy = ty + 4; tx = 54; tyy = -4; }
    else if (pose === 'sweepW') { hx = -2; hyy = ty + 14; tx = -26; tyy = -2; }
    else if (pose === 'sweep') { hx = 8; hyy = ty + 18; tx = 62; tyy = -4; }
    else if (pose === 'claw1W' || pose === 'claw2W' || pose === 'claw3W') { hx = 0; hyy = ty + 6; tx = -16; tyy = ty - 4; }
    else if (pose === 'claw1' || pose === 'claw2' || pose === 'claw3') { hx = 8; hyy = ty + 8; tx = pose === 'claw3' ? 60 : 52; tyy = ty + (pose === 'claw2' ? 6 : (pose === 'claw3' ? 14 : 12)); }
    else if (pose === 'low') { hx = 8; hyy = ty + 14; tx = 28; tyy = -1; }
    else if (pose === 'roar') { hx = 8; hyy = ty - 2; tx = 10; tyy = ty - 38; }
    else if (pose === 'bell' || pose === 'bellRaise') { hx = 8; hyy = ty + 10; tx = 18; tyy = -4; }
    if (pose.startsWith('claw')) { pixLine(ctx, hx, hyy, tx, tyy, 3, bone); pixLine(ctx, hx, hyy + 4, tx - 2, tyy + 5, 2, bone); pixLine(ctx, hx, hyy - 4, tx - 2, tyy - 5, 2, bone); }
    else { pixLine(ctx, hx, hyy, tx, tyy, 2, this.col('#4a3a2a')); pixLine(ctx, hx + (tx - hx) * 0.78, hyy + (tyy - hyy) * 0.78, tx, tyy, 4, steel); }
    px(ctx, hx - 2, hyy - 2, 5, 5, skin);
    if (pose === 'bellRaise' || pose === 'bell') drawBell(ctx, 2, ty - 52, 22, 20, bronze, this.col('#d8a85a'), this.col('#6a4a20'));
    ctx.restore();
  }
}

PIT_BOSSES[7] = {
  id: 'champion', name: 'The Patchwork Champion', sub: 'Everything the pit ever made, sewn into one',
  coins: 0, music: 'pitD', cageW: 64, make: () => [new PatchworkChampion()],
};
