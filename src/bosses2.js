'use strict';

// Pits bosses 2 to 4: the branded sprinter, the pit vulture, the mud man.

// ======================================================================= 2. THE BRANDED SPRINTER
// A wolf with the soldiers' brand burned into its flank. Fast, and it never stands still for long.

class BrandedSprinter extends Boss {
  constructor() {
    super({ name: 'The Branded Sprinter', hp: 25, w: 30, h: 18 });
    this.pose = 'idle'; this.mark = null; this.enraged = false; this.tx = 0;
  }
  get k() { return this.enraged ? 0.8 : 1; }
  restTime() { return (0.22 + Math.random() * 0.35) * (this.enraged ? 0.7 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'crouch'; }

  think(dt, w) {
    const p = w.player, k = this.k;
    this.animT += dt;
    if (p.dead) { this.vx = 0; this.pose = 'idle'; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    const ad = Math.abs(p.x - this.x);
    this.faceTo(p);
    this.cool -= dt;
    this.pose = 'idle';
    if (!this.enraged && this.hp <= this.maxHp * 0.5) {
      this.enraged = true;
      this.play('howl', [{ d: 0.9, pose: 'howl', on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); } }], w);
      return;
    }
    // it circles at a distance, then goes in
    this.vx = ad > 150 ? this.facing * 100 : (ad < 70 ? -this.facing * 70 : 0);
    if (this.heat >= 5) { this.heat = 0; this.play('scatter', this.mScatter(w), w); return; }
    if (this.cool > 0) return;
    const opts = ad < 80 ? ['swipe', 'lunge', 'pounce'] : (ad < 220 ? ['lunge', 'pounce', 'sprint', 'swipe'] : ['sprint', 'pounce', 'lunge']);
    const m = this.choose(opts);
    this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w);
  }

  mSwipe(w) {
    const k = this.k;
    return [
      { d: 0.3 * k, pose: 'rear', tell: true, face: true },
      { d: 0.12, pose: 'swipe', on: () => Sfx.play('slash'), hz: b => [hzFront(b, 0, 44, -30, 0)] },
      { d: 0.32, pose: 'idle' },
    ];
  }
  mLunge(w) {
    const k = this.k;
    const one = [
      { d: 0.42 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.3, pose: 'lunge', on: (b) => { b.vx = b.facing * 350; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 6), hzFront(b, 6, 26, -16, 0)] },
      { d: 0.45, pose: 'skid', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); } },
    ];
    if (!this.enraged) return one;
    return one.slice(0, 2).concat([{ d: 0.1, pose: 'skid', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); } }], [
      { d: 0.26, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.3, pose: 'lunge', on: (b) => { b.vx = b.facing * 350; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 6), hzFront(b, 6, 26, -16, 0)] },
      { d: 0.45, pose: 'skid', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); } },
    ]);
  }
  mPounce(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; b.mark = b.tx = clamp(w.player.x, ARENA_L + 10, ARENA_R - 10); } },
      { until: b => !b.airborne, min: 0.2, d: 1.2, pose: 'air', bot: 'away', on: (b) => { b.vy = -520; b.vx = clamp((b.tx - b.x) / 0.74, -300, 300); Sfx.play('whoosh'); } },
      { d: 0.14, pose: 'claw', on: (b, w2) => { b.mark = null; b.vx = 0; Sfx.play('slam'); w2.shake(2); dustWave(w2, b.x, 0, 8); }, hz: b => [{ box: { x: b.x - 28, y: b.y - 22, w: 56, h: 22 }, dmg: 1, fromX: b.x }] },
      { d: 0.5, pose: 'idle' },
    ];
  }
  mSprint(w) {
    const k = this.k;
    return [
      { d: 0.55 * k, pose: 'paw', tell: true, face: true, tick: (b) => { b.vx = 0; if (Math.random() < 0.3) w.spawn({ x: b.x + b.facing * 12, y: GROUND_Y - 1, vx: -b.facing * 30, vy: -20, life: 0.4, color: '#6a5a4a', size: 2, grav: 40 }); } },
      { d: 3, pose: 'sprint', bot: 'jump', on: (b) => { b.vx = b.facing * 400; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4)], until: b => (b.facing > 0 && b.x >= ARENA_R - 1) || (b.facing < 0 && b.x <= ARENA_L + 1), tick: (b) => { if (Math.random() < 0.5) w.spawn({ x: b.x - b.facing * 12, y: GROUND_Y - 2, vx: 0, vy: -8, life: 0.3, color: '#6a5a4a', size: 3, grav: 0 }); } },
      { d: 0.7, pose: 'skid', on: (b, w2) => { b.vx = 0; w2.shake(2); Sfx.play('slam'); } },
    ];
  }
  mScatter(w) {
    return [
      { d: 0.1, pose: 'crouch' },
      { d: 0.32, pose: 'sprint', on: (b, w2) => { const away = w2.player.x >= b.x ? -1 : 1; b.facing = away; b.vx = away * 330; if ((away < 0 && b.x < ARENA_L + 90) || (away > 0 && b.x > ARENA_R - 90)) { b.facing = -away; b.vx = -away * 330; } } },
      { d: 0.1, pose: 'skid', on: (b) => { b.vx = 0; } },
    ];
  }

  draw(ctx, t) {
    const fur = this.col('#4a4650'), furD = this.col('#2e2a34'), belly = this.col('#6a6470'), mark = this.col('#ff7a30');
    const pose = this.pose;
    if (this.mark != null) { ctx.globalAlpha = 0.5; px(ctx, this.mark - 18, GROUND_Y - 2, 36, 3, '#000000'); px(ctx, this.mark - 11, GROUND_Y - 3, 22, 1, '#000000'); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const flare = this.state !== 'idle' && this.seq && this.seq[this.si] && this.seq[this.si].tell;
    const run = Math.abs(this.vx) > 20 && !this.airborne, ph = Math.floor(this.animT * (pose === 'sprint' ? 18 : 9)) % 2;
    let low = pose === 'crouch' || pose === 'paw' ? 4 : 0, stretch = pose === 'lunge' || pose === 'sprint' ? 3 : 0, lift = pose === 'rear' ? 9 : 0;
    if (pose === 'skid') low = 2;
    // legs
    if (this.airborne || pose === 'lunge') { px(ctx, -16 - stretch, -6, 7, 3, furD); px(ctx, 9, -8, 8, 3, furD); px(ctx, 12, -5, 6, 3, furD); }
    else if (pose === 'rear') { px(ctx, -12, -8, 4, 8, furD); px(ctx, -6, -8, 4, 8, furD); px(ctx, 10, -16, 3, 8, furD); px(ctx, 14, -18, 3, 8, furD); }
    else {
      const o = run ? (ph ? 3 : -3) : 0;
      px(ctx, -13 + o, -8, 4, 8, furD); px(ctx, -7 - o, -8, 4, 8, furD); px(ctx, 7 + o, -8, 4, 8, furD); px(ctx, 12 - o, -8, 4, 8, furD);
    }
    // body, tail
    const by = -17 + low - (pose === 'rear' ? 5 : 0);
    px(ctx, -15 - stretch, by, 28 + stretch, 11, fur); px(ctx, -15 - stretch, by + 8, 28 + stretch, 3, belly); px(ctx, -15 - stretch, by, 28 + stretch, 2, this.col('#5e5a68'));
    pixLine(ctx, -15 - stretch, by + 2, -24 - stretch, by - (pose === 'howl' ? 8 : 5) + (run ? 2 : 0), 3, fur);
    // the brand on its flank
    const glow = 0.6 + 0.4 * Math.sin(t * 5);
    px(ctx, -7, by + 3, 7, 6, mark); px(ctx, -5, by + 5, 3, 2, '#fff0b0'); px(ctx, -7, by + 3, 7, 1, glow > 0.8 ? '#ffd24a' : mark);
    // head
    const hy = pose === 'howl' ? by - 12 : by - 2 - lift * 0.3 + (pose === 'crouch' ? 3 : 0);
    const hx = pose === 'howl' ? 8 : 11 + stretch;
    px(ctx, hx, hy, 12, 10, fur); px(ctx, hx + 9, hy + 3, 8, 5, furD);
    px(ctx, hx + 1, hy - 4, 3, 5, fur); px(ctx, hx + 7, hy - 3, 3, 4, fur);
    px(ctx, hx + 6, hy + 3, 3, 2, flare ? '#ffffff' : '#ffd24a');
    if (pose === 'swipe' || pose === 'lunge' || pose === 'howl' || pose === 'rear') { px(ctx, hx + 11, hy + 7, 5, 2, '#ffffff'); }
    if (pose === 'swipe') { pixLine(ctx, 14, by + 2, 40, by + 16, 3, '#e8e4f0'); pixLine(ctx, 14, by + 5, 38, by + 22, 2, '#e8e4f0'); }
    // chain scars
    px(ctx, 0, by + 1, 1, 6, '#1c1820'); px(ctx, 5, by + 1, 1, 5, '#1c1820');
    ctx.restore();
  }
}

PIT_BOSSES[1] = {
  id: 'sprinter', name: 'The Branded Sprinter', sub: 'A wolf, with the soldiers\' mark on its flank',
  coins: 12, music: 'pitC', cageW: 56, make: () => [new BrandedSprinter()],
};

// ======================================================================= 3. THE PIT VULTURE
// It circles over the pit. Rise to meet it, or wait for it to come down.

class PitVulture extends Boss {
  constructor() {
    super({ name: 'The Pit Vulture', hp: 32, w: 34, h: 22 });
    this.y = 150; this.ty = 150; this.pose = 'hover'; this.enraged = false; this.px = 0; this.crashed = false;
  }
  get k() { return this.enraged ? 0.8 : 1; }
  restTime() { return (0.35 + Math.random() * 0.5) * (this.enraged ? 0.7 : 1); }
  physics(dt) { this.y += this.vy * dt; this.x = clamp(this.x + this.vx * dt, ARENA_L - 10, ARENA_R + 10); this.airborne = this.y < GROUND_Y - 1; }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'perch'; this.y = GROUND_Y; }

  hover(dt, w, tx) {                              // drift above the knight, bobbing
    const p = w.player;
    const gx = clamp(tx == null ? p.x + Math.sin(this.age * 0.9) * 110 : tx, ARENA_L, ARENA_R);
    this.vx = clamp((gx - this.x) * 2.2, -150, 150);
    const gy = this.ty + Math.sin(this.age * 2.2) * 6;
    this.vy = clamp((gy - this.y) * 4, -260, 260);
  }

  think(dt, w) {
    const p = w.player;
    this.animT += dt;
    if (p.dead) { this.vx = 0; this.vy = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.faceTo(p);
    this.pose = 'hover'; this.ty = 148;
    this.hover(dt, w);
    this.cool -= dt;
    if (!this.enraged && this.hp <= this.maxHp * 0.5) {
      this.enraged = true;
      this.play('screech', [{ d: 1.0, pose: 'screech', tick: (b) => { b.vx = 0; b.vy = 0; }, on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); } }], w);
      return;
    }
    if (this.heat >= 6) { this.heat = 0; this.play('lift', this.mLift(w), w); return; }
    if (this.cool > 0) return;
    const m = this.choose(['dive', 'fan', 'sweep', 'dive', 'fan']);
    this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w);
  }

  mLift(w) {                                      // out of reach for a moment
    return [{ d: 0.9, pose: 'rise', tick: (b) => { b.vy = -240; b.vx = 0; if (b.y < 80) b.vy = 0; } }, { d: 0.2, pose: 'hover' }];
  }

  mDive(w) {
    const k = this.k;
    const one = [
      { d: 0.5 * k, pose: 'rise', tell: true, tick: (b, dt) => { b.vy = -330; b.vx = 0; if (b.y < 64) b.vy = 0; b.faceTo(w.player); } },
      { d: 0.2 * k, pose: 'hang', tell: true, tick: (b) => { b.vy = 0; b.vx = 0; }, on: (b) => { b.px = clamp(w.player.x, ARENA_L, ARENA_R); Sfx.play('warn'); } },
      { d: 1.2, pose: 'dive', bot: 'away', min: 0.12, until: b => b.y >= GROUND_Y - 1, hz: b => [hzBody(b, 6)],
        on: (b) => { const T = 0.42; b.vy = (GROUND_Y - b.y) / T; b.vx = (b.px - b.x) / T; Sfx.play('whoosh'); } },
      { d: 0.9, pose: 'crash', on: (b, w2) => { b.y = GROUND_Y; b.vy = 0; b.vx = 0; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 18); } },
      { d: 0.45, pose: 'rise', tick: (b) => { b.vy = -230; b.vx = 0; } },
    ];
    return this.enraged ? one.slice(0, 4).concat([{ d: 0.15, pose: 'crash' }]).concat(one.slice(0, 4)).concat([one[4]]) : one;
  }

  mFan(w) {
    const k = this.k, n = this.enraged ? 6 : 5;
    const fire = (b, w2) => {
      const p = w2.player, a0 = Math.atan2(p.y - 11 - (b.y - 10), p.x - b.x);
      Sfx.play('flap');
      for (let i = 0; i < n; i++) {
        const a = a0 + (i - (n - 1) / 2) * 0.36;
        b.shots.push(new BossShot({ kind: 'feather', x: b.x + b.facing * 10, y: b.y - 10, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, w: 6, h: 3, life: 4 }));
      }
    };
    const segs = [
      { d: 0.55 * k, pose: 'spread', tell: true, face: true, tick: (b) => { b.vx = 0; b.vy = (148 - b.y) * 3; } },
      { d: 0.18, pose: 'fling', on: fire },
      { d: 0.4, pose: 'hover' },
    ];
    if (this.enraged) segs.push({ d: 0.4 * k, pose: 'spread', tell: true, face: true }, { d: 0.18, pose: 'fling', on: fire }, { d: 0.35, pose: 'hover' });
    return segs;
  }

  mSweep(w) {
    const k = this.k;
    return [
      { d: 0.75, pose: 'hover', tell: true, on: (b) => { b.sx = w.player.x < W / 2 ? ARENA_R : ARENA_L; }, tick: (b) => { b.vx = clamp((b.sx - b.x) * 4, -320, 320); b.vy = clamp((90 - b.y) * 4, -260, 260); b.facing = b.sx > W / 2 ? -1 : 1; } },
      { d: 0.4 * k, pose: 'rise', tell: true, tick: (b) => { b.vx = 0; b.vy = clamp((GROUND_Y - 13 - b.y) * 3, -200, 200); }, on: () => Sfx.play('warn') },
      { d: 2, pose: 'swoop', bot: 'jump', min: 0.2, until: b => (b.facing > 0 && b.x >= ARENA_R + 6) || (b.facing < 0 && b.x <= ARENA_L - 6), on: (b) => { b.vx = b.facing * 340; b.vy = 0; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 2)] },
      { d: 0.4, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -240; } },
    ];
  }

  draw(ctx, t) {
    const body = this.col('#3a3040'), dark = this.col('#241c2a'), wing = this.col('#2a2230'), tip = this.col('#8a7aa0'), skin = this.col('#c8808a'), beak = this.col('#d8c070');
    const pose = this.pose, f = Math.floor(this.age * (pose === 'hover' ? 6 : 3)) % 2;
    const flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    // the dive's landing spot
    if (this.seq && (pose === 'hang' || pose === 'dive')) { ctx.globalAlpha = 0.5; px(ctx, this.px - 20, GROUND_Y - 2, 40, 3, '#000000'); px(ctx, this.px - 12, GROUND_Y - 3, 24, 1, '#000000'); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    // wings: a fan of long feathers from the shoulder
    const up = pose === 'spread' || pose === 'screech' || pose === 'fling';
    if (pose === 'crash' || pose === 'perch') {
      px(ctx, -16, -20, 10, 14, wing); px(ctx, -22, -14, 8, 10, wing); px(ctx, -24, -8, 6, 6, tip);
    } else {
      const fold = pose === 'dive' || pose === 'hang';
      const flap = f ? 1 : 0;
      const a0 = up ? 205 : (fold ? 150 : (flap ? 120 : 190)), a1 = up ? 275 : (fold ? 168 : (flap ? 165 : 235));
      const len = fold ? 26 : (pose === 'swoop' ? 40 : 36);
      px(ctx, -12, -20, 14, 7, wing);
      for (let i = 0; i < 7; i++) {
        const ang = (a0 + (a1 - a0) * i / 6) * Math.PI / 180, l = len - Math.abs(i - 3) * 2;
        const ex = -3 + Math.cos(ang) * l, ey = -15 + Math.sin(ang) * l;
        pixLine(ctx, -3, -15, ex, ey, 3, wing);
        pixLine(ctx, -3 + Math.cos(ang) * l * 0.55, -15 + Math.sin(ang) * l * 0.55, ex, ey, 2, tip);
      }
    }
    // body
    px(ctx, -12, -18, 24, 14, body); px(ctx, -12, -18, 24, 2, this.col('#4e4458')); px(ctx, -8, -6, 16, 4, dark);
    // legs (talons)
    if (pose !== 'dive') { px(ctx, -5, -4, 2, 6, beak); px(ctx, 2, -4, 2, 6, beak); px(ctx, -7, 2, 5, 1, beak); px(ctx, 1, 2, 5, 1, beak); }
    else { px(ctx, 8, -6, 4, 12, beak); px(ctx, 12, 4, 4, 2, beak); }
    // neck and head: bald, hooked beak
    px(ctx, 8, -26, 5, 10, this.col('#e8e0f0'));
    px(ctx, 9, -34, 9, 10, skin); px(ctx, 16, -30, 7, 3, beak); px(ctx, 20, -28, 3, 5, beak);
    px(ctx, 11, -31, 3, 2, flare ? '#ffffff' : '#ff5a3a');
    ctx.restore();
  }
}

PIT_BOSSES[2] = {
  id: 'vulture', name: 'The Pit Vulture', sub: 'It has fed here for a long time',
  coins: 15, music: 'finalB', cageW: 70, make: () => [new PitVulture()],
};

// ======================================================================= 4. THE MUD MAN
// A heap of the pit's own mud, drawn up on a frame of bones. It is hurt only while it stands.

class MudMan extends Boss {
  constructor() {
    super({ name: 'The Mud Man', hp: 38, w: 38, h: 52 });
    this.pose = 'idle'; this.enraged = false; this.puddles = []; this.hands = []; this.mx = 0; this.lockX = 0; this.ripple = null; this.arm = 0;
  }
  get k() { return this.enraged ? 0.8 : 1; }
  restTime() { return (0.4 + Math.random() * 0.4) * (this.enraged ? 0.75 : 1); }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'idle'; }
  slow() { return this.puddles.map(q => [q.x - 18, q.x + 18]); }

  think(dt, w) {
    const p = w.player;
    this.animT += dt;
    for (const q of this.puddles) q.t -= dt;
    this.puddles = this.puddles.filter(q => q.t > 0);
    this.hands = this.hands.filter(h => this.age < h.t1 + 0.6);
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    const ad = Math.abs(p.x - this.x);
    this.faceTo(p);
    this.pose = 'idle'; this.intangible = false;
    this.cool -= dt;
    if (!this.enraged && this.hp <= this.maxHp * 0.5) {
      this.enraged = true;
      this.play('roar', [{ d: 0.9, pose: 'roar', on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); } }], w);
      return;
    }
    this.vx = ad > 70 ? this.facing * 36 : 0;                                  // it shambles toward you
    if (this.heat >= 6) { this.heat = 0; this.play('burrow', this.mBurrow(w), w); return; }
    if (this.cool > 0) return;
    const opts = ad < 90 ? ['reach', 'tide', 'hands', 'burrow'] : ['lob', 'burrow', 'hands', 'tide', 'lob'];
    const m = this.choose(opts);
    this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w);
  }

  mReach(w) {
    const k = this.k;
    return [
      { d: 0.6 * k, pose: 'coil', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'reach', on: () => Sfx.play('slash'), hz: b => [hzFront(b, 10, 118, -36, -14)], tick: (b) => { b.arm = Math.min(1, b.sT / 0.08); } },
      { d: 0.55, pose: 'retract', tick: (b) => { b.arm = Math.max(0, 1 - b.sT / 0.4); } },
    ];
  }

  mTide(w) {
    const k = this.k;
    return [
      { d: 0.7 * k, pose: 'slapWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'slap', bot: 'jump', on: (b, w2) => {
        Sfx.play('slam'); Sfx.play('splash'); w2.shake(3);
        b.shots.push(new BossShot({ kind: 'wave', x: b.x + b.facing * 22, y: GROUND_Y - 9, vx: b.facing * 235, w: 22, h: 18, ground: false, life: 3, pierce: true }));
        if (b.enraged) b.shots.push(new BossShot({ kind: 'wave', x: b.x - b.facing * 22, y: GROUND_Y - 9, vx: -b.facing * 235, w: 22, h: 18, ground: false, life: 3, pierce: true }));
      } },
      { d: 0.6, pose: 'retract' },
    ];
  }

  mLob(w) {
    const k = this.k, n = this.enraged ? 5 : 3;
    return [
      { d: 0.55 * k, pose: 'lobWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'lob', on: (b, w2) => {
        const p = w2.player, T = 0.9, g = 700, y0 = GROUND_Y - 40;
        Sfx.play('whoosh');
        for (let i = 0; i < n; i++) {
          const tx = clamp(p.x + (i - (n - 1) / 2) * 54, ARENA_L, ARENA_R);
          b.shots.push(new BossShot({ kind: 'mud', x: b.x + b.facing * 14, y: y0, vx: (tx - b.x - b.facing * 14) / T, vy: (GROUND_Y - y0 - 0.5 * g * T * T) / T, grav: g, w: 9, h: 9, life: 3,
            onLand: (s, w3) => { b.puddles.push({ x: s.x, t: 6 }); if (b.puddles.length > 6) b.puddles.shift(); Sfx.play('splash'); for (let j = 0; j < 8; j++) w3.spawn({ x: s.x, y: GROUND_Y - 2, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, life: 0.5, color: '#2a1c14', size: 2, grav: 260 }); } }));
        }
      } },
      { d: 0.55, pose: 'retract' },
    ];
  }

  // sinks, travels as a mound, and comes up under the knight
  mBurrow(w) {
    return [
      { d: 0.45, pose: 'sink', on: () => Sfx.play('splash'), tick: (b) => { b.vx = 0; if (b.sT > 0.25) b.intangible = true; } },
      { d: 1.0, pose: 'under', intangible: true, on: (b) => { b.mx = b.x; b.intangible = true; }, tick: (b, dt, w2) => { b.mx += clamp(w2.player.x - b.mx, -1, 1) * 150 * dt; b.x = b.mx; b.ripple = b.mx; if (Math.random() < 0.3) w2.spawn({ x: b.mx + (Math.random() - 0.5) * 20, y: GROUND_Y - 1, vx: 0, vy: -20, life: 0.4, color: '#4a3426', size: 2, grav: 100 }); } },
      { d: 0.55, pose: 'under', tell: true, on: (b) => { b.lockX = b.mx; Sfx.play('warn'); }, tick: (b, dt, w2) => { b.x = b.lockX; b.ripple = b.lockX; if (Math.random() < 0.6) w2.spawn({ x: b.lockX + (Math.random() - 0.5) * 30, y: GROUND_Y - 1, vx: 0, vy: -26, life: 0.4, color: '#4a3426', size: 2, grav: 100 }); } },
      { d: 0.3, pose: 'erupt', on: (b, w2) => { b.intangible = false; b.ripple = null; b.x = b.lockX; Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x, 0, 12); }, hz: b => [{ box: { x: b.x - 22, y: b.y - 76, w: 44, h: 76 }, dmg: 1, fromX: b.x }] },
      { d: 0.65, pose: 'idle' },
    ];
  }

  // hands rise from the mud around the knight. One of them grabs, and what it holds is slammed.
  mHands(w) {
    const k = this.k;
    return [
      { d: 0.45 * k, pose: 'slapWind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.85 * k, pose: 'channel', on: (b, w2) => {
        const p = w2.player, side = p.facing || 1;
        b.hands = [];
        const xs = [p.x, p.x + 64 * side, p.x - 64 * side];
        xs.forEach((x, i) => b.hands.push({ x: clamp(x, ARENA_L - 10, ARENA_R + 10), t0: b.age + 0.85 * b.k, t1: b.age + 0.85 * b.k + 0.35, grab: i === 0 }));
        Sfx.play('growl');
      }, tick: (b, dt, w2) => { for (const h of b.hands) if (Math.random() < 0.25) w2.spawn({ x: h.x + (Math.random() - 0.5) * 18, y: GROUND_Y - 1, vx: 0, vy: -16, life: 0.4, color: '#4a3426', size: 2, grav: 80 }); } },
      { d: 0.4, pose: 'channel', on: () => Sfx.play('slam'),
        hz: b => b.hands.map(h => ({ box: { x: h.x - 8, y: GROUND_Y - 50, w: 16, h: 50 }, dmg: h.grab ? 0 : 1, grab: h.grab ? 0.8 : 0, fromX: h.x })) },
      { d: 0.6, pose: 'retract' },
    ];
  }

  onGrab(hz, w) {
    Sfx.play('growl');
    const cx = hz.box.x + hz.box.w / 2;
    this.later(0.6, 0.18, { x: cx - 16, y: GROUND_Y - 62, w: 32, h: 62 }, 1);        // the slam
  }

  draw(ctx, t) {
    const mud = this.col('#3a2a1e'), mudL = this.col('#5a4030'), mudD = this.col('#22160e'), bone = this.col('#cfc6a8'), eye = this.col('#ffb347');
    // puddles
    for (const q of this.puddles) { const a = clamp(q.t, 0, 1); ctx.globalAlpha = 0.85 * a; px(ctx, q.x - 18, GROUND_Y - 2, 36, 3, '#1a100a'); px(ctx, q.x - 12, GROUND_Y - 3, 24, 1, '#3a2a1e'); px(ctx, q.x - 6 + Math.round(Math.sin(this.age * 3 + q.x) * 4), GROUND_Y - 3, 3, 1, '#7a5a40'); ctx.globalAlpha = 1; }
    // hands rising
    for (const h of this.hands) {
      const a = this.age;
      if (a < h.t0 - 0.0) {                                           // the mud swells, then splits
        const bub = clamp(1 - (h.t0 - a) / 0.85, 0, 1);
        px(ctx, h.x - 10, GROUND_Y - 2 - Math.round(bub * 4), 20, 3 + Math.round(bub * 4), mudD); px(ctx, h.x - 6, GROUND_Y - 3 - Math.round(bub * 4), 12, 2, mudL);
      } else if (a < h.t1 + 0.5) {
        const e = a < h.t1 ? clamp((a - h.t0) / 0.12, 0, 1) : clamp(1 - (a - h.t1) / 0.4, 0, 1), hh = Math.round(48 * e);
        px(ctx, h.x - 4, GROUND_Y - hh, 8, hh, mud); px(ctx, h.x - 4, GROUND_Y - hh, 2, hh, mudL);
        for (let i = 0; i < 4; i++) px(ctx, h.x - 6 + i * 4, GROUND_Y - hh - 6 * e, 2, 7 * e, mud);
        if (h.grab) px(ctx, h.x - 1, GROUND_Y - hh - 2, 3, 3, bone);
      }
    }
    // the ripple of a burrowed mud man
    if (this.ripple != null) {
      const x = Math.round(this.ripple), s = Math.sin(this.age * 14);
      px(ctx, x - 18, GROUND_Y - 4, 36, 4, mudD); px(ctx, x - 12, GROUND_Y - 7, 24, 4, mud); px(ctx, x - 5, GROUND_Y - 10 + Math.round(s), 10, 4, mudL);
      px(ctx, x - 26 - Math.round((this.age * 40) % 12), GROUND_Y - 1, 6, 1, mudL); px(ctx, x + 22 + Math.round((this.age * 40) % 12), GROUND_Y - 1, 6, 1, mudL);
    }
    if (this.intangible && this.pose !== 'sink') return;
    const pose = this.pose;
    const sink = pose === 'sink' ? clamp(this.sT / 0.45, 0, 1) : 0;
    const erupt = pose === 'erupt' ? clamp(this.sT / 0.12, 0, 1) : 1;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, GROUND_Y + 1); ctx.clip();
    ctx.translate(Math.round(this.x), Math.round(this.y + sink * 54 + (1 - erupt) * 54));
    ctx.scale(this.facing, 1);
    const bob = Math.round(Math.sin(this.animT * 3) * 1), lean = pose === 'coil' || pose === 'lobWind' || pose === 'slapWind' ? -3 : (pose === 'reach' ? 4 : 0);
    // body: a heap
    px(ctx, -19 + lean, -26, 38, 26, mud); px(ctx, -15 + lean, -40 + bob, 30, 16, mud); px(ctx, -10 + lean, -52 + bob, 20, 14, mud);
    px(ctx, -19 + lean, -26, 38, 3, mudD); px(ctx, -12 + lean, -38 + bob, 6, 3, mudL); px(ctx, 2 + lean, -49 + bob, 5, 3, mudL); px(ctx, -14 + lean, -14, 8, 3, mudL);
    for (let i = 0; i < 4; i++) px(ctx, -16 + i * 9 + lean, -2 + Math.round(Math.sin(this.animT * 2 + i) * 1), 5, 5 + (i % 2) * 3, mudD);        // drips
    // the bones it is built on
    px(ctx, -8 + lean, -33, 2, 9, bone); px(ctx, -4 + lean, -34, 2, 7, bone); px(ctx, 0 + lean, -33, 2, 8, bone);
    px(ctx, -2 + lean, -49 + bob, 6, 5, bone); px(ctx, -1 + lean, -48 + bob, 1, 2, '#15110c');
    // the face: two eyes in the mud
    const flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    px(ctx, 2 + lean, -44 + bob, 4, 3, flare ? '#ffffff' : eye); px(ctx, -6 + lean, -43 + bob, 3, 2, flare ? '#ffffff' : eye);
    // arms
    const reach = this.arm;
    if (reach > 0.02) { const len = Math.round(12 + reach * 100); px(ctx, 10, -34, len, 7, mud); px(ctx, 10, -34, len, 2, mudL); px(ctx, 10 + len - 3, -39, 9, 17, mud); for (let i = 0; i < 3; i++) px(ctx, 10 + len + 4, -38 + i * 5, 6, 3, mud); }
    else if (pose === 'slapWind') { px(ctx, 8, -52, 8, 22, mud); px(ctx, 6, -58, 12, 8, mud); }
    else if (pose === 'slap') { px(ctx, 8, -8, 22, 8, mud); px(ctx, 28, -14, 10, 14, mud); }
    else if (pose === 'lobWind') { px(ctx, 10, -48, 7, 14, mud); px(ctx, 8, -56, 10, 10, mudD); }
    else if (pose === 'coil') { px(ctx, -22, -36, 10, 8, mud); px(ctx, -28, -38, 8, 10, mud); }
    else { px(ctx, 14, -26, 6, 16, mud); px(ctx, 14, -12, 8, 8, mud); px(ctx, -22, -24, 6, 14, mud); }
    ctx.restore();
  }
}

PIT_BOSSES[3] = {
  id: 'mudman', name: 'The Mud Man', sub: 'The pit itself, standing up',
  coins: 18, music: 'pitA', cageW: 64, make: () => [new MudMan()],
};

// the mud man's wave and clods are drawn here
(function extendShots() {
  const old = BossShot.prototype.draw;
  BossShot.prototype.draw = function (ctx, boss) {
    if (this.kind === 'wave') {
      const x = Math.round(this.x), d = Math.sign(this.vx) || 1;
      px(ctx, x - 11, GROUND_Y - 6, 22, 6, '#22160e'); px(ctx, x - 9, GROUND_Y - 12, 16, 7, '#3a2a1e'); px(ctx, x - d * 2 - 2, GROUND_Y - 18, 8, 8, '#3a2a1e'); px(ctx, x + d * 3, GROUND_Y - 19, 3, 3, '#5a4030');
      px(ctx, x - d * 14, GROUND_Y - 2, 6, 2, '#5a4030');
    } else old.call(this, ctx, boss);
  };
})();
