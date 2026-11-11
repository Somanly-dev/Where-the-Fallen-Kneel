'use strict';

// The Trial of the Bugs: bosses 4 to 9.

// shots used here: stinger darts, larva sacs, honey globs, falling rock, mantis blades, acid, scales and a honey wave
(function extendHiveShots() {
  const old = BossShot.prototype.draw;
  BossShot.prototype.draw = function (ctx, boss) {
    const x = Math.round(this.x), y = Math.round(this.y), d = Math.sign(this.vx) || 1;
    if (this.kind === 'dart') { const a = Math.atan2(this.vy, this.vx); pixLine(ctx, x - Math.cos(a) * 8, y - Math.sin(a) * 8, x, y, 2, '#fff0b0'); px(ctx, x - 2, y - 2, 4, 4, '#ff5a3a'); }
    else if (this.kind === 'sac') { disc(ctx, x, y, 6, 6, '#c8d890'); disc(ctx, x - 1, y - 1, 3, 3, '#e8f0b0'); px(ctx, x - 5, y - 6, 3, 2, '#8a9a50'); }
    else if (this.kind === 'honey') { disc(ctx, x, y, 5, 5, '#e8a010'); px(ctx, x - 2, y - 3, 3, 3, '#ffe070'); for (let k = 1; k < 4; k++) px(ctx, x - 1, y - 5 - k * 3, 2, 2, 'rgba(232,160,16,' + (0.5 - k * 0.1) + ')'); }
    else if (this.kind === 'rock') { px(ctx, x - 4, y - 4, 8, 8, '#7a5a30'); px(ctx, x - 4, y - 4, 8, 2, '#a88050'); px(ctx, x - 2, y - 7, 4, 3, 'rgba(122,90,48,0.5)'); }
    else if (this.kind === 'blade') { pixLine(ctx, x - d * 8, y, x + d * 8, y, 3, '#c8ccdc'); pixLine(ctx, x - d * 8, y - 1, x + d * 8, y - 1, 1, '#ffffff'); px(ctx, x + d * 6, y - 3, 3, 6, '#e8ecf4'); }
    else if (this.kind === 'acid') { disc(ctx, x, y, 4, 4, '#9ad030'); px(ctx, x - 2, y - 2, 2, 2, '#d8ff80'); }
    else if (this.kind === 'scale') { const a = Math.atan2(this.vy, this.vx); pixLine(ctx, x - Math.cos(a) * 5, y - Math.sin(a) * 5, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 3, '#c8d8a0'); px(ctx, x - 1, y - 1, 3, 3, '#ffffff'); }
    else if (this.kind === 'honeywave') { const gy = this.gy || GROUND_Y; px(ctx, x - 11, gy - 6, 22, 6, '#b87810'); px(ctx, x - 9, gy - 12, 16, 7, '#e8a010'); px(ctx, x - d * 2 - 2, gy - 18, 8, 8, '#e8a010'); px(ctx, x + d * 3, gy - 19, 3, 3, '#ffe070'); }
    else if (this.kind === 'bomb') { disc(ctx, x, y, 4, 3, '#f0c020'); px(ctx, x - 1, y - 3, 2, 6, '#201000'); }
    else old.call(this, ctx, boss);
  };
})();

// ======================================================================= 4. THE BEETLE GUARD
class BeetleGuard extends HiveBoss {
  constructor() { super({ name: 'The Beetle Guard', hp: 100, w: 44, h: 30 }); this.pose = 'idle'; }
  // the head is out unless he is curled up; only the head and horn can be hit
  get headOut() { return !(this.pose === 'curl' || this.pose === 'roll' || this.pose === 'hunker'); }
  hit(dmg, dirX, world) { if (!this.headOut) return; super.hit(dmg, dirX, world); }
  hitbox() {
    if (this.dead || this.dying || !this.headOut) return { x: -999, y: -999, w: 1, h: 1 };
    return { x: this.facing > 0 ? this.x + 8 : this.x - 26, y: this.y - 31, w: 18, h: 26 };
  }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.faceTo(p); this.pose = 'idle'; this.cool -= dt;
    this.vx = Math.abs(p.x - this.x) > 70 ? this.facing * 38 : 0;
    if (this.cool <= 0) this.pickMove(w, ['roll', 'stomp', 'horn', 'hunker', 'toss', 'roll']);
  }
  mRoll(w) {
    const k = this.k, run = (dir) => ({ d: 3, pose: 'roll', bot: 'jump', min: 0.4, on: (b) => { b.facing = dir; b.vx = dir * 250; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4)], until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) });
    const segs = [{ d: 0.6 * k, pose: 'curl', tell: true, face: true, tick: (b) => { b.vx = 0; } }, run(0), { d: 0.5, pose: 'stunned', on: (b, w2) => { b.vx = 0; w2.shake(4); Sfx.play('slam'); } }];
    segs[1] = { ...run(0), on: (b) => { b.vx = b.facing * 250; Sfx.play('whoosh'); } };
    if (this.rage) segs.push({ d: 0.35, pose: 'curl', tell: true }, { ...run(0), on: (b) => { b.facing = -b.facing; b.vx = b.facing * 250; Sfx.play('whoosh'); } });
    segs.push({ d: 0.9, pose: 'stunned', on: (b, w2) => { b.vx = 0; w2.shake(4); Sfx.play('slam'); } });
    return segs;
  }
  mStomp(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.tx = clamp(w.player.x, b.bl, b.br); } },
      { d: 1.2, pose: 'air', bot: 'away', min: 0.2, until: (b) => !b.airborne, on: (b) => { b.vy = -540; b.vx = clamp((b.tx - b.x) / 0.78, -240, 240); Sfx.play('whoosh'); } },
      { d: 0.16, pose: 'slam', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 16);
        for (let i = 0; i < 3; i++) b.shots.push(new BossShot({ kind: 'rock', x: clamp(w2.player.x + (i - 1) * 56, HIVE_L + 10, HIVE_R - 10), y: 8, vx: 0, vy: 40, grav: 500, w: 8, h: 8, life: 3, ground: false, landOn: true, dmg: 1 })); },
        hz: b => [{ box: { x: b.x - 64, y: b.y - 24, w: 128, h: 24 }, dmg: 1, fromX: b.x }] },
      { d: 0.6, pose: 'idle' },
    ];
  }
  // he pulls his head in and crawls at the knight. Nothing can hurt him, but the end of it leaves him open
  mHunker(w) {
    return [
      { d: 0.5 * this.k, pose: 'curl', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 2.2, pose: 'hunker', on: () => Sfx.play('growl'), tick: (b, dt, w2) => { b.faceTo(w2.player); b.vx = b.facing * 85; }, hz: b => [hzBody(b, 4)] },
      { d: 0.9, pose: 'stunned', on: (b, w2) => { b.vx = 0; w2.shake(3); Sfx.play('slam'); } },
    ];
  }
  // he tosses three rocks over his shoulder at where the knight is
  mToss(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'toss', on: (b, w2) => {
        Sfx.play('whoosh'); const p = w2.player;
        for (let i = 0; i < 3; i++) { const tx = clamp(p.x + (i - 1) * 60, HIVE_L + 12, HIVE_R - 12), T = 0.9 + i * 0.08; b.shots.push(new BossShot({ kind: 'rock', x: b.x + b.facing * 14, y: b.y - 32, vx: (tx - b.x) / T, vy: -330, grav: 520, w: 8, h: 8, life: 3, ground: false, landOn: true, dmg: 1 })); }
      } },
      { d: 0.6, pose: 'idle' },
    ];
  }
  mHorn(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.3, pose: 'charge', on: (b) => { b.vx = b.facing * 300; Sfx.play('roar'); }, hz: b => [hzBody(b, 4), hzFront(b, 14, 46, -22, -6)] },
      { d: 0.55, pose: 'idle', tick: (b, dt) => { b.vx = approach(b.vx, 0, 800 * dt); } },
    ];
  }
  draw(ctx, t) {
    const shell = this.col('#2a3a2a'), shellL = this.col('#4a6a4a'), dark = this.col('#101810'), pose = this.pose, flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    const curl = pose === 'curl' || pose === 'roll' || pose === 'hunker';
    if (curl) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.age * 14); disc(ctx, 0, -15, 24, 19, '#9fd8ff'); ctx.globalAlpha = 1; disc(ctx, 0, -15, 20, 15, shell); disc(ctx, -2, -19, 14, 9, shellL); px(ctx, 0, -30, 1, 28, dark); }
    else {
      const crouch = pose === 'crouch' || pose === 'stunned' ? 4 : 0;
      for (let i = 0; i < 3; i++) px(ctx, -14 + i * 12, -6, 4, 6, dark);
      disc(ctx, -4, -17 + crouch, 20, 12 - crouch / 2, shell); disc(ctx, -6, -21 + crouch, 13, 7, shellL); px(ctx, -4, -29 + crouch, 1, 24, dark);
      disc(ctx, 17, -14 + crouch, 7, 7, dark); px(ctx, 14, -26 + crouch, 3, 10, '#c8b890'); px(ctx, 12, -30 + crouch, 3, 6, '#c8b890');          // head and a long horn
      px(ctx, 19, -17 + crouch, 3, 3, flare ? '#ffffff' : '#ff9a3a');
      pixLine(ctx, 19, -22 + crouch, 24, -26 + crouch, 1, dark);
    }
    ctx.restore();
  }
}
HIVE_BOSSES[3] = { id: 'beetle', name: 'The Beetle Guard', sub: 'Plates on plates. Nothing gets past', coins: 46, make: () => [new BeetleGuard()] };

// ======================================================================= 5. THE MOTH PRIESTESS
class MothPriestess extends HiveBoss {
  constructor() { super({ name: 'The Moth Priestess', hp: 50, w: 26, h: 30, flies: true, hoverY: 90 }); this.pose = 'idle'; this.marks = []; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    this.marks = this.marks.filter(m => this.age < m.t1);
    if (p.dead) { this.vx = this.vy = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.hoverIdle(p, dt, 80, 90); this.cool -= dt;
    if (this.cool <= 0) this.pickMove(w, ['pollen', 'pillars', 'scales', 'lanterns', 'rain']);
  }
  mPollen(w) {
    return [segHold(0.6 * this.k), { d: 0.25, pose: 'flap', on: (b, w2) => {
      const p = w2.player; Sfx.play('flap');
      for (let i = -1; i <= 1; i++) { const cx = clamp(p.x + i * 64, HIVE_L + 24, HIVE_R - 24), cy = clamp(p.y - 14 + (i ? -26 : 0), 50, 210); b.marks.push({ kind: 'cloud', x: cx, y: cy, t0: b.age + 0.8, t1: b.age + 4.3 }); b.later(0.8, 3.5, { x: cx - 22, y: cy - 20, w: 44, h: 40 }, 1); }
    } }, { d: 0.8, pose: 'idle' }];
  }
  mPillars(w) {
    return [segHold(0.5 * this.k), { d: 0.2, pose: 'cast', on: (b, w2) => {
      Sfx.play('warn'); const p = w2.player;
      [-62, 0, 62].forEach(o => { const x = clamp(p.x + o, HIVE_L + 10, HIVE_R - 10); b.marks.push({ kind: 'pillar', x, t0: b.age + 0.95, t1: b.age + 1.45 }); b.later(0.95, 0.4, { x: x - 9, y: 0, w: 18, h: 250 }, 1); });
    } }, { d: 1.3, pose: 'idle' }];
  }
  // slow lights that drift after the knight
  mLanterns(w) {
    const n = this.rage ? 3 : 2;
    return [segHold(0.6 * this.k), { d: 0.2, pose: 'cast', on: (b) => {
      Sfx.play('growl');
      for (let i = 0; i < n; i++) b.shots.push(new BossShot({ kind: 'orb', x: b.x + (i - (n - 1) / 2) * 16, y: b.y - 10, vx: (i - (n - 1) / 2) * 90, vy: -50, w: 9, h: 9, life: 5, ground: false, dmg: 1, home: 130, maxSp: 85 }));
    } }, { d: 1.0, pose: 'idle' }];
  }
  // wing scales fall from the ceiling around the knight
  mRain(w) {
    return [segHold(0.5 * this.k), { d: 1.7, pose: 'flap', on: (b) => { Sfx.play('flap'); b.nextS = 0; },
      tick: (b, dt, w2) => { b.nextS -= dt; if (b.nextS <= 0) { b.nextS = 0.17; const x = clamp(w2.player.x + (Math.random() - 0.5) * 240, HIVE_L + 10, HIVE_R - 10); b.shots.push(new BossShot({ kind: 'scale', x, y: 8, vx: 0, vy: 150, w: 6, h: 6, life: 2.6, ground: true, dmg: 1 })); } } }, { d: 0.9, pose: 'idle' }];
  }
  mScales(w) {
    const k = this.k;
    return [segHold(0.5 * k), { d: 0.12, pose: 'flap', on: (b, w2) => dartFan(b, w2, 5, 0.3, 150, 'scale') }, { d: 0.4, pose: 'idle' }, ...(this.rage ? [segHold(0.35 * k), { d: 0.12, pose: 'flap', on: (b, w2) => dartFan(b, w2, 5, 0.3, 150, 'scale') }, { d: 0.4, pose: 'idle' }] : [])];
  }
  draw(ctx, t) {
    const body = this.col('#d8d0b8'), furD = this.col('#a89878'), eye = this.col('#ffb030'), flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    for (const m of this.marks) {
      if (m.kind === 'cloud') { const on = this.age >= m.t0; ctx.globalAlpha = on ? 0.5 : 0.25; disc(ctx, m.x, m.y, 22, 20, on ? '#c8d868' : '#c8d868'); if (on) { disc(ctx, m.x - 8, m.y - 6, 12, 10, '#e8f088'); } ctx.globalAlpha = 1; }
      else { const on = this.age >= m.t0; if (!on) { ctx.globalAlpha = 0.35; px(ctx, m.x - 1, 0, 2, 250, '#fff0b0'); ctx.globalAlpha = 1; } else { px(ctx, m.x - 9, 0, 18, 250, 'rgba(255,240,160,0.8)'); px(ctx, m.x - 3, 0, 6, 250, '#ffffff'); } }
    }
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    const f = Math.sin(this.age * (this.pose === 'flap' ? 30 : 12));
    for (const sg of [-1, 1]) { ctx.globalAlpha = 0.9; pixLine(ctx, sg * 4, -18, sg * (28 + f * 3), -30 - f * 4, 8, furD); pixLine(ctx, sg * 4, -18, sg * (30 + f * 3), -10 + f * 4, 8, furD); disc(ctx, sg * 24, -22, 5, 5, '#c8b890'); ctx.globalAlpha = 1; px(ctx, sg * 22 - 1, -23, 3, 3, '#6a5a3a'); }
    disc(ctx, 0, -14, 6, 12, body); disc(ctx, 0, -28, 7, 6, body); compoundEye(ctx, 3, -29, 3, flare ? '#ffffff' : eye);
    for (const sg of [-1, 1]) { pixLine(ctx, sg * 3, -34, sg * 9, -44 + Math.sin(this.age * 3) * 2, 1, '#a89878'); px(ctx, sg * 9, -46, 3, 3, '#d8d0b8'); }
    px(ctx, -5, -34, 10, 2, '#c0405a');                                                                             // a veil
    for (let i = 0; i < 5; i++) px(ctx, -4 + i * 2, -3, 1, 4 + (i % 2) * 2, '#c8b890');                              // robes
    ctx.restore();
  }
}
HIVE_BOSSES[4] = { id: 'moth', name: 'The Moth Priestess', sub: 'She follows the light, and the light follows her', coins: 49, make: () => [new MothPriestess()] };

// ======================================================================= 6. THE MANTIS TWINS
class Mantis extends HiveBoss {
  constructor(name, x) { super({ name, hp: 42, w: 20, h: 46, x }); this.mate = null; this.pose = 'idle'; this.enraged = false; }
  get alone() { return !this.mate || this.mate.dying || this.mate.dead; }
  get k() { return (this.rage || this.alone ? 0.88 : 1.12); }
  restTime() { return (0.55 + Math.random() * 0.45) * (this.alone ? 0.75 : 1); }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.alone && !this.enraged) { this.enraged = true; this.play('howl', [{ d: 0.9, pose: 'wind', on: (b, w2) => { Sfx.play('roar'); w2.cheer(1); } }], w); return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.faceTo(p); this.pose = 'idle'; this.cool -= dt;
    this.vx = Math.abs(p.x - this.x) > 70 ? this.facing * 70 : 0;
    if (this.cool <= 0) this.pickMove(w, ['slash', 'leap', 'throw', 'rush', 'vault', 'low', 'combo']);
  }
  mSlash(w) {
    const k = this.k;
    return [{ d: 0.5 * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } }, { d: 0.14, pose: 'slash', on: (b) => { b.vx = b.facing * 100; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 62, -52, -6)] }, { d: 0.45, pose: 'idle', tick: (b, dt) => { b.vx = approach(b.vx, 0, 600 * dt); } }];
  }
  mLeap(w) {
    const k = this.k;
    return [
      { d: 0.45 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.tx = clamp(w.player.x, b.bl, b.br); } },
      { d: 1.2, pose: 'air', bot: 'away', min: 0.2, until: (b) => !b.airborne, on: (b) => { b.vy = -520; b.vx = clamp((b.tx - b.x) / 0.74, -230, 230); Sfx.play('whoosh'); } },
      { d: 0.14, pose: 'slash', on: (b) => { b.vx = 0; Sfx.play('slash'); }, hz: b => [{ box: { x: b.x - 42, y: b.y - 34, w: 84, h: 34 }, dmg: 1, fromX: b.x }] },
      { d: 0.5, pose: 'idle' },
    ];
  }
  // a run across the well, blade out
  mRush(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.9, pose: 'slash', bot: 'jump', min: 0.2, on: (b) => { b.vx = b.facing * 290; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4), hzFront(b, 4, 60, -52, -6)], until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.6, pose: 'idle', tick: (b, dt) => { b.vx = approach(b.vx, 0, 700 * dt); } },
    ];
  }
  // a high jump, and at the top two blades thrown down
  mVault(w) {
    const k = this.k;
    return [
      { d: 0.45 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.tx = clamp(w.player.x, b.bl, b.br); } },
      { d: 1.5, pose: 'air', bot: 'away', min: 0.2, until: (b) => !b.airborne,
        on: (b) => { b.thrown = false; b.vy = -640; b.vx = clamp((b.tx - b.x) / 0.95, -200, 200); Sfx.play('whoosh'); },
        tick: (b, dt, w2) => { if (!b.thrown && b.vy > -60) { b.thrown = true; Sfx.play('slash'); const p = w2.player; for (const o of [-26, 26]) { const a = Math.atan2(p.y - 12 - (b.y - 30), p.x + o - b.x); b.shots.push(new BossShot({ kind: 'blade', x: b.x, y: b.y - 30, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, w: 14, h: 8, life: 2, ground: true })); } } } },
      { d: 0.14, pose: 'slash', on: (b) => { b.vx = 0; Sfx.play('slam'); }, hz: b => [{ box: { x: b.x - 38, y: b.y - 30, w: 76, h: 30 }, dmg: 1, fromX: b.x }] },
      { d: 0.5, pose: 'idle' },
    ];
  }
  // a low sweep along the ground
  mLow(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'crouch', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.16, pose: 'sweep', on: (b) => { b.vx = b.facing * 110; Sfx.play('slash'); }, hz: b => [hzFront(b, 4, 74, -15, 0)] },
      { d: 0.5, pose: 'idle', tick: (b, dt) => { b.vx = approach(b.vx, 0, 600 * dt); } },
    ];
  }
  // three cuts in a row
  mCombo(w) {
    const k = this.k, cut = (wd) => [
      { d: wd * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.12, pose: 'slash', on: (b) => { b.vx = b.facing * 130; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 62, -52, -6)] },
      { d: 0.05, pose: 'idle', on: (b) => { b.vx = 0; } }];
    return [...cut(0.5), ...cut(0.28), ...cut(0.28), { d: 0.6, pose: 'idle' }];
  }
  mThrow(w) {
    const k = this.k;
    return [{ d: 0.5 * k, pose: 'wind', tell: true, face: true, tick: (b) => { b.vx = 0; } }, { d: 0.1, pose: 'slash', on: (b) => { Sfx.play('whoosh'); b.shots.push(new BossShot({ kind: 'blade', x: b.x + b.facing * 14, y: GROUND_Y - 18, vx: b.facing * 230, w: 16, h: 8, ground: false, life: 2.6, pierce: true })); } }, { d: 0.5, pose: 'idle' }];
  }
  draw(ctx, t) {
    const body = this.col('#6a9a3a'), dark = this.col('#2a4a14'), blade = this.col('#dfe8f4'), pose = this.pose, flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    const crouch = pose === 'crouch' ? 8 : 0, moving = Math.abs(this.vx) > 5 && !this.airborne, step = moving && Math.floor(this.animT * 8) % 2;
    px(ctx, -5, -16 + crouch / 2 + (step ? -2 : 0), 3, 16 - crouch / 2, dark); px(ctx, 3, -16 + crouch / 2 + (step ? 0 : -2), 3, 16 - crouch / 2, dark);
    disc(ctx, -2, -26 + crouch, 5, 12 - crouch / 2, body); px(ctx, -7, -26 + crouch, 3, 14, dark);
    disc(ctx, 2, -42 + crouch, 5, 5, body); px(ctx, 4, -43 + crouch, 3, 2, flare ? '#ffffff' : '#ff3a3a'); px(ctx, -1, -49 + crouch, 1, 5, dark); px(ctx, 4, -49 + crouch, 1, 5, dark);
    let hx = 4, hy = -30 + crouch, tx = 12, ty = -10;                                                                         // the foreblade
    if (pose === 'wind') { tx = -8; ty = -52; } else if (pose === 'slash') { tx = 58; ty = -24; } else if (pose === 'sweep') { tx = 62; ty = -6; } else if (pose === 'air') { tx = 14; ty = -50; }
    pixLine(ctx, hx, hy, tx, ty, 3, body); pixLine(ctx, tx, ty, tx + (tx - hx) * 0.8, ty + (ty - hy) * 0.8, 2, blade);
    ctx.restore();
  }
}
HIVE_BOSSES[5] = { id: 'mantis', name: 'The Mantis Twins', sub: 'Reed and Thorn. Neither is patient', coins: 52, make: () => { const a = new Mantis('Reed', 170), b = new Mantis('Thorn', 310); a.mate = b; b.mate = a; return [a, b]; } };

// ======================================================================= 7. THE ANT DIGGERS
class Ant extends HiveBoss {
  constructor(name, x) { super({ name, hp: 34, w: 24, h: 20, x }); this.pose = 'idle'; this.ripple = null; this.mate = null; }
  get alone() { return !this.mate || this.mate.dying || this.mate.dead; }
  get k() { return (this.rage || this.alone) ? 0.9 : 1.12; }
  restTime() { return (0.4 + Math.random() * 0.4) * (this.alone ? 0.75 : 1); }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.faceTo(p); this.pose = 'idle'; this.intangible = false; this.ripple = null; this.cool -= dt;
    this.vx = Math.abs(p.x - this.x) > 50 && this.floorY === GROUND_Y ? this.facing * 55 : 0;
    if (this.cool <= 0) this.pickMove(w, ['tunnel', 'acid', 'snap', 'spikes', 'rocks', 'barrage'].concat(this.floorY === GROUND_Y ? ['charge', 'tunnel'] : ['tunnel']));
  }
  mTunnel(w) {
    const k = this.k;
    return [
      { d: 0.45, pose: 'dig', tell: true, on: () => Sfx.play('splash'), tick: (b) => { b.vx = 0; if (b.sT > 0.25) b.intangible = true; } },
      { d: 1.1, pose: 'under', on: (b) => { b.intangible = true; },
        tick: (b, dt, w2) => { const p = w2.player, pl = ledgeOf(w2, p.x, p.y); const ly = pl ? pl.y : GROUND_Y, lo = pl ? pl.x + 8 : b.bl, hi = pl ? pl.x + pl.w - 8 : b.br; b.floorY = ly; b.y = ly; b.x = clamp(b.x + clamp(p.x - b.x, -1, 1) * 140 * dt, lo, hi); b.ripple = b.x; } },
      { d: 0.55 * k, pose: 'under', tell: true, on: (b) => { b.lockX = b.x; Sfx.play('warn'); }, tick: (b, dt, w2) => { b.x = b.lockX; b.ripple = b.x; if (Math.random() < 0.6) w2.spawn({ x: b.x + (Math.random() - 0.5) * 24, y: b.y - 1, vx: 0, vy: -26, life: 0.4, color: '#7a5a30', size: 2, grav: 100 }); } },
      { d: 0.3, pose: 'erupt', on: (b, w2) => { b.intangible = false; b.ripple = null; Sfx.play('slam'); w2.shake(3); dustWave(w2, b.x, 0, 10); }, hz: b => [{ box: { x: b.x - 16, y: b.y - 72, w: 32, h: 72 }, dmg: 1, fromX: b.x }] },
      { d: 1.0, pose: 'idle' },
    ];
  }
  mAcid(w) {
    const k = this.k;
    return [{ d: 0.5 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; } }, { d: 0.15, pose: 'spit', on: (b, w2) => {
      const p = w2.player, T = 0.8, g = 560, sy = b.y - 14;
      b.shots.push(new BossShot({ kind: 'acid', x: b.x, y: sy, vx: (p.x - b.x) / T, vy: (p.y - 8 - sy - 0.5 * g * T * T) / T, grav: g, w: 8, h: 8, life: 3, ground: false, landOn: true, dmg: 1,
        onLand: (s, w3) => { Sfx.play('splash'); b.later(0, 2.6, { x: s.x - 12, y: s.y + 2, w: 24, h: 6 }, 1); b.marks = (b.marks || []).concat({ x: s.x, y: s.y + 4, t1: b.age + 2.6 }); } }));
    } }, { d: 0.5, pose: 'idle' }];
  }
  // spikes burst out of the floor ahead of him, one after another
  mSpikes(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => {
        Sfx.play('warn'); const pl = ledgeOf(w, b.x, b.y), ly = pl ? pl.y : GROUND_Y, lo = pl ? pl.x + 6 : b.bl, hi = pl ? pl.x + pl.w - 6 : b.br;
        b.mounds = b.mounds || [];
        for (let i = 0; i < 4; i++) { const x = clamp(b.x + b.facing * (46 + i * 42), lo, hi), t0 = b.age + 0.6 + i * 0.16; b.mounds.push({ x, y: ly, t0, t1: t0 + 0.4 }); b.later(0.6 + i * 0.16, 0.34, { x: x - 9, y: ly - 46, w: 18, h: 46 }, 1); }
      } },
      { d: 1.3, pose: 'idle' },
    ];
  }
  // a run along the floor
  mCharge(w) {
    const k = this.k;
    return [
      { d: 0.45 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 1.1, pose: 'snap', bot: 'jump', min: 0.2, on: (b) => { b.vx = b.facing * 250; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4), hzFront(b, 4, 40, -24, -2)], until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.6, pose: 'idle', tick: (b, dt) => { b.vx = approach(b.vx, 0, 700 * dt); } },
    ];
  }
  // rocks shaken loose from the ceiling around the knight
  mRocks(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'snap', on: (b, w2) => {
        Sfx.play('slam'); w2.shake(3); const p = w2.player;
        for (let i = 0; i < 4; i++) { const x = clamp(p.x + (i - 1.5) * 52 + (Math.random() - 0.5) * 20, HIVE_L + 10, HIVE_R - 10); b.shots.push(new BossShot({ kind: 'rock', x, y: 8 - i * 14, vx: 0, vy: 40, grav: 480, w: 8, h: 8, life: 3.4, ground: false, landOn: true, dmg: 1 })); }
      } },
      { d: 0.8, pose: 'idle' },
    ];
  }
  // three acid globs in a spread
  mBarrage(w) {
    const k = this.k;
    return [{ d: 0.55 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; } }, { d: 0.15, pose: 'spit', on: (b, w2) => {
      const p = w2.player, g = 560, sy = b.y - 14; Sfx.play('whoosh');
      for (const o of [-56, 0, 56]) {
        const tx = clamp(p.x + o, HIVE_L + 10, HIVE_R - 10), T = 0.8;
        b.shots.push(new BossShot({ kind: 'acid', x: b.x, y: sy, vx: (tx - b.x) / T, vy: (p.y - 8 - sy - 0.5 * g * T * T) / T, grav: g, w: 8, h: 8, life: 3, ground: false, landOn: true, dmg: 1,
          onLand: (s, w3) => { Sfx.play('splash'); b.later(0, 2.2, { x: s.x - 12, y: s.y + 2, w: 24, h: 6 }, 1); b.marks = (b.marks || []).concat({ x: s.x, y: s.y + 4, t1: b.age + 2.2 }); } }));
      }
    } }, { d: 0.6, pose: 'idle' }];
  }
  mSnap(w) {
    const k = this.k;
    return [{ d: 0.4 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx = 0; } }, { d: 0.12, pose: 'snap', on: (b) => { Sfx.play('slash'); b.vx = b.facing * 80; }, hz: b => [hzFront(b, 4, 42, -26, -2)] }, { d: 0.4, pose: 'idle', tick: (b) => { b.vx = 0; } }];
  }
  draw(ctx, t) {
    const body = this.col('#8a2a1a'), dark = this.col('#3a0c06'), pose = this.pose, flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    this.mounds = (this.mounds || []).filter(m => this.age < m.t1);
    for (const m of this.mounds) {
      if (this.age < m.t0) { const u = (this.age - (m.t0 - 0.6)) / 0.6; px(ctx, m.x - 8, m.y - 2 - Math.round(u * 4), 16, 3 + Math.round(u * 4), '#7a5a30'); if (Math.random() < 0.3) px(ctx, m.x - 6 + Math.random() * 12, m.y - 6, 2, 2, '#4a3420'); }
      else { px(ctx, m.x - 8, m.y - 12, 16, 12, '#7a5a30'); px(ctx, m.x - 5, m.y - 28, 10, 16, '#a88050'); px(ctx, m.x - 2, m.y - 46, 4, 18, '#d8c090'); }
    }
    this.marks = (this.marks || []).filter(m => this.age < m.t1);
    for (const m of this.marks) { ctx.globalAlpha = 0.8; px(ctx, m.x - 12, m.y - 1, 24, 3, '#7ab020'); px(ctx, m.x - 7, m.y - 3, 14, 2, '#c8ff60'); ctx.globalAlpha = 1; }
    if (this.ripple != null) { const x = Math.round(this.ripple); disc(ctx, x, this.y - 2, 14, 4, '#4a3420'); disc(ctx, x, this.y - 4, 8, 4, '#7a5a30'); px(ctx, x - 22 - ((this.age * 40) % 10), this.y - 1, 5, 1, '#7a5a30'); px(ctx, x + 18 + ((this.age * 40) % 10), this.y - 1, 5, 1, '#7a5a30'); }
    if (this.intangible && pose !== 'dig') return;
    const dig = pose === 'dig' ? clamp(this.sT / 0.45, 0, 1) : 0, erupt = pose === 'erupt' ? clamp(this.sT / 0.1, 0, 1) : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, this.y + 1); ctx.clip();
    ctx.translate(Math.round(this.x), Math.round(this.y + dig * 24 + (1 - erupt) * 24)); ctx.scale(this.facing, 1);
    const moving = Math.abs(this.vx) > 5, step = moving && Math.floor(this.animT * 9) % 2;
    for (let i = 0; i < 3; i++) { px(ctx, -6 + i * 5, -5, 2, 5 + (step ? 1 : 0), dark); }
    disc(ctx, -9, -10, 7, 6, body); disc(ctx, 0, -11, 5, 4, body); disc(ctx, 8, -12, 6, 6, body); px(ctx, 10, -14, 3, 3, flare ? '#ffffff' : '#ffd24a');
    pixLine(ctx, 11, -8, 17, pose === 'snap' ? -3 : -6, 2, dark); pixLine(ctx, 11, -7, 17, pose === 'snap' ? -9 : -8, 2, dark); px(ctx, 10, -19, 1, 5, dark); px(ctx, 13, -18, 1, 4, dark);
    ctx.restore();
  }
}
HIVE_BOSSES[6] = { id: 'ants', name: 'The Ant Diggers', sub: 'The comb is full of holes, and they dug them', coins: 55, make: () => { const a = new Ant('Delver', 180), b = new Ant('Burrow', 300); a.mate = b; b.mate = a; return [a, b]; } };

// ======================================================================= 8. THE HORNET CAPTAIN
class HornetCaptain extends HiveBoss {
  constructor() { super({ name: 'The Hornet Captain', hp: 62, w: 28, h: 28, flies: true, hoverY: 104 }); this.pose = 'idle'; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = this.vy = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.hoverIdle(p, dt, 90, 104); this.cool -= dt;
    if (this.cool <= 0) this.pickMove(w, ['dive', 'barrage', 'shout', 'ram', 'strafe', 'flurry']);
  }
  mDive(w) {
    const k = this.k;
    return [
      { d: 0.55 * k, pose: 'rise', tell: true, tick: (b) => { b.steer(w.player.x, 50, 240); } },
      { d: 0.2 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; }, on: () => Sfx.play('warn') },
      segDive(460, w), segLand(0.7), { d: 0.4, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -180; } },
    ];
  }
  mBarrage(w) {
    const k = this.k, fire = (b, w2) => dartFan(b, w2, 5, 0.2, 210);
    return [segHold(0.5 * k), { d: 0.12, pose: 'fire', on: fire }, { d: 0.3, pose: 'idle' }, segHold(0.3 * k), { d: 0.12, pose: 'fire', on: fire }, { d: 0.5, pose: 'idle' }];
  }
  // a fast pass across the well, a rain of stingers underneath
  mStrafe(w) { return segStrafe(w, 200, 0.22, 64); }
  // quick lunges that each aim at where the knight stood
  mFlurry(w) {
    const k = this.k, lunge = (td) => [
      { d: td * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.7; b.vy *= 0.7; b.px = w.player.x; b.py = w.player.y - 14; } },
      { d: 0.28, pose: 'lunge', bot: 'away', on: (b) => { const dx = b.px - b.x, dy = b.py - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * 400; b.vy = dy / d * 400; b.facing = Math.sign(dx) || b.facing; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 5)] },
      { d: 0.1, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); b.vy = approach(b.vy, 0, 900 * dt); } }];
    return [{ d: 0.6, pose: 'rise', tell: true, tick: (b) => { b.steer(clamp(w.player.x, b.bl, b.br), 90, 220); } }, ...lunge(0.5), ...lunge(0.32), ...lunge(0.32), ...(this.rage ? lunge(0.3) : []), { d: 0.6, pose: 'drift', tick: (b) => { b.vx = 0; b.vy = -40; } }];
  }
  mShout(w) {
    return [segHold(0.6 * this.k), { d: 0.5, pose: 'shout', on: (b, w2) => { Sfx.play('horn'); w2.shake(2); for (let i = 0; i < (b.rage ? 3 : 2); i++) w2.addBoss(new Swarmling(b.x + (i - 1) * 14, b.y - 12, 3, true)); } }, { d: 0.6, pose: 'idle' }];
  }
  mRam(w) {
    const k = this.k;
    return [
      { d: 0.6, pose: 'rise', tell: true, tick: (b) => { b.side = w.player.x < 240 ? 1 : -1; b.steer(b.side > 0 ? HIVE_R - 20 : HIVE_L + 20, w.player.y - 14, 260); } },
      { d: 0.4 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.ty = clamp(w.player.y - 14, 60, 210); b.facing = -b.side; }, on: () => Sfx.play('warn') },
      { d: 1.2, pose: 'lunge', bot: 'jump', min: 0.15, on: (b) => { b.vx = b.facing * 400; b.vy = (b.ty - b.y) * 4; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.9; }, hz: b => [hzBody(b, 5)], until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.5, pose: 'drift', tick: (b) => { b.vx = 0; b.vy = -40; } },
    ];
  }
  draw(ctx, t) {
    const body = this.col('#c4561c'), dark = this.col('#2a0e06'), plate = this.col('#8a8ea2'), flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    bugWings(ctx, -2, -22, this.age, 34, 8, true);
    disc(ctx, -10, -11, 11, 6, body); for (let i = 0; i < 3; i++) px(ctx, -18 + i * 6, -17, 3, 12, dark); px(ctx, -22, -11, 6, 2, '#fff0b0');
    disc(ctx, 4, -14, 8, 7, body); px(ctx, -2, -20, 12, 4, plate); px(ctx, 0, -20, 8, 1, '#c8ccdc');                                // a captain's gorget
    disc(ctx, 13, -15, 6, 6, body); compoundEye(ctx, 15, -16, 3, flare ? '#ffffff' : '#ffd030'); px(ctx, 17, -9, 4, 3, dark);
    px(ctx, 6, -27, 2, 6, '#c0405a'); px(ctx, 4, -29, 6, 3, '#c0405a');                                                              // a plume
    pixLine(ctx, 14, -22, 20, -29, 1, dark);
    ctx.restore();
  }
}
HIVE_BOSSES[7] = { id: 'captain', name: 'The Hornet Captain', sub: 'He gives the orders, and the orders sting', coins: 58, make: () => [new HornetCaptain()] };

// ======================================================================= 9. THE HONEY KNIGHT
class HoneyKnight extends HiveBoss {
  constructor() { super({ name: 'The Honey Knight', hp: 70, w: 34, h: 46 }); this.pose = 'idle'; this.world = null; this.jumpCd = 1.5; }
  get onFloor() { return !this.airborne && this.y >= GROUND_Y - 1; }
  // he lands on ledges as well as the floor
  physics(dt) {
    const w = this.world, prev = this.y;
    this.vy += this.gravity * dt; this.y += this.vy * dt; this.airborne = true;
    let landed = null;
    if (this.vy >= 0 && w) for (const pl of w.platforms) { if (pl.gone || this.x < pl.x + 2 || this.x > pl.x + pl.w - 2) continue; if (prev <= pl.y + 1 && this.y >= pl.y) { landed = pl; break; } }
    if (landed) { this.y = landed.y; this.vy = 0; this.airborne = false; }
    else if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.airborne = false; }
    this.x = clamp(this.x + this.vx * dt, this.bl, this.br);
  }
  think(dt, w) {
    this.world = w;
    const p = w.player; this.animT += dt; this.jumpCd -= dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.faceTo(p); this.pose = 'idle'; this.cool -= dt;
    // the knight is on another ledge: hop after them
    const pl = p.onGround ? ledgeOf(w, p.x, p.y) : null;
    if (!this.airborne && this.jumpCd <= 0 && pl && Math.abs(pl.y - this.y) > 6) { this.jumpCd = 1.3; if (pl.y < this.y) this.play('hop', this.mHop(w, pl), w); else this.play('drop', this.mDrop(w), w); return; }
    this.vx = Math.abs(p.x - this.x) > 60 ? this.facing * 50 : 0;
    if (this.cool <= 0) this.pickMove(w, this.onFloor ? ['slam', 'lob', 'bash', 'wave', 'leapSlam', 'swing'] : ['slam', 'lob', 'wave', 'leapSlam', 'swing']);
  }
  // the knight is below: walk off the edge of this ledge and steer down onto them
  mDrop(w) {
    return [{ d: 3, pose: 'idle', min: 0.2, until: (b) => b.sawAir && !b.airborne,
      on: (b) => { const cur = ledgeOf(w, b.x, b.y), p = w.player; b.dropDir = cur && p.x >= cur.x && p.x <= cur.x + cur.w ? (b.x - cur.x < cur.x + cur.w - b.x ? -1 : 1) : (p.x >= b.x ? 1 : -1); b.sawAir = false; b.dropY = b.y; },
      tick: (b, dt, w2) => { if (b.airborne && b.y > b.dropY + 14) b.sawAir = true; b.vx = b.sawAir ? clamp((w2.player.x - b.x) * 2, -150, 150) : b.dropDir * 130; b.facing = Math.sign(b.vx) || b.facing; } }];
  }
  // a jump that lands on the given ledge
  mHop(w, pl) {
    return [
      { d: 0.3 * this.k, pose: 'low', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 1.8, pose: 'air', bot: 'away', min: 0.25, until: (b) => !b.airborne, hz: b => [hzBody(b, 2)],
        on: (b) => { const g = b.gravity, H = Math.max(46, b.y - pl.y + 26), vy = -Math.sqrt(2 * g * H), tu = -vy / g, td = Math.sqrt(2 * Math.max(1, pl.y - (b.y - H)) / g), tx = clamp(w.player.x, pl.x + 10, pl.x + pl.w - 10); b.vy = vy; b.vx = clamp((tx - b.x) / (tu + td), -320, 320); b.facing = Math.sign(b.vx) || b.facing; Sfx.play('whoosh'); } },
      { d: 0.18, pose: 'down', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(3); }, hz: b => [{ box: { x: b.x - 38, y: b.y - 24, w: 76, h: 24 }, dmg: 1, fromX: b.x }] },
      { d: 0.3, pose: 'low' },
    ];
  }
  // a big jump at the knight, and a heavy landing
  mLeapSlam(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'low', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b) => { b.tx = clamp(w.player.x, b.bl, b.br); } },
      { d: 1.6, pose: 'air', bot: 'away', min: 0.25, until: (b) => !b.airborne, hz: b => [hzBody(b, 2)], on: (b) => { b.vy = -560; b.vx = clamp((b.tx - b.x) / 0.8, -260, 260); Sfx.play('roar'); } },
      { d: 0.2, pose: 'down', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 14); const pl = ledgeOf(w2, b.x, b.y); if (pl) w2.honeyLedge(pl, 5); }, hz: b => [{ box: { x: b.x - 60, y: b.y - 26, w: 120, h: 26 }, dmg: 1, fromX: b.x }] },
      { d: 0.7, pose: 'low' },
    ];
  }
  // a high chop, then a low sweep
  mSwing(w) {
    const k = this.k, sw = (wd, y0, y1) => [
      { d: wd * k, pose: 'up', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.14, pose: 'down', on: (b) => { b.vx = b.facing * 110; Sfx.play('slash'); }, hz: b => [hzFront(b, 4, 70, y0, y1)] },
      { d: 0.06, pose: 'low', on: (b) => { b.vx = 0; } }];
    return [...sw(0.55, -90, 0), ...sw(0.32, -36, 0), { d: 0.7, pose: 'low' }];
  }
  mSlam(w) {
    const k = this.k;
    return [
      { d: 0.62 * k, pose: 'up', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 0.15, pose: 'down', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 52, 0, 12); const pl = ledgeOf(w2, b.x, b.y); if (pl) w2.honeyLedge(pl, 4); }, hz: b => [hzFront(b, 4, 68, -90, 0)] },
      { d: 0.55, pose: 'low' },
    ];
  }
  mLob(w) {
    const k = this.k, n = this.rage ? 4 : 3;
    return [segHold(0.55 * k), { d: 0.15, pose: 'lob', on: (b, w2) => {
      Sfx.play('whoosh'); const p = w2.player;
      for (let i = 0; i < n; i++) {
        const tx = clamp(p.x + (i - (n - 1) / 2) * 70, HIVE_L + 16, HIVE_R - 16), T = 0.95, g = 560, y0 = b.y - 44;
        b.shots.push(new BossShot({ kind: 'honey', x: b.x, y: y0, vx: (tx - b.x) / T, vy: -250 - i * 22, grav: g, w: 10, h: 10, life: 3.2, ground: false, landOn: true, dmg: 1, onLand: (s, w3) => { if (s.landed) w3.honeyLedge(s.landed, 5); Sfx.play('splash'); } }));
      }
    } }, { d: 0.6, pose: 'low' }];
  }
  mBash(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'shield', tell: true, face: true, tick: (b) => { b.vx = 0; } },
      { d: 3, pose: 'rush', bot: 'jump', min: 0.3, on: (b) => { b.vx = b.facing * 270; Sfx.play('roar'); }, hz: b => [hzBody(b, 6)], until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.9, pose: 'low', on: (b, w2) => { b.vx = 0; w2.shake(4); Sfx.play('slam'); } },
    ];
  }
  mWave(w) {
    const k = this.k;
    return [segHold(0.6 * k), { d: 0.2, pose: 'down', on: (b, w2) => { Sfx.play('slam'); Sfx.play('splash'); w2.shake(3); b.shots.push(new BossShot({ kind: 'honeywave', x: b.x + b.facing * 24, y: b.y - 9, gy: b.y, vx: b.facing * 235, w: 22, h: 18, ground: false, life: 3, pierce: true })); } }, { d: 0.55, pose: 'low' }];
  }
  draw(ctx, t) {
    const armor = this.col('#8a8ea2'), dark = this.col('#3a3d4a'), honey = this.col('#e8a010'), honeyD = this.col('#b87810'), pose = this.pose, flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    const crouch = pose === 'low' ? 5 : 0, moving = Math.abs(this.vx) > 5, step = moving && Math.floor(this.animT * 6) % 2;
    px(ctx, -9, -16 + crouch / 2 + (step ? -2 : 0), 7, 16 - crouch / 2, dark); px(ctx, 2, -16 + crouch / 2 + (step ? 0 : -2), 7, 16 - crouch / 2, dark);
    const ty = -38 + crouch;
    px(ctx, -12, ty, 24, 24 - crouch / 2, armor); px(ctx, -12, ty, 24, 2, '#c8ccdc'); px(ctx, -3, ty, 7, 24 - crouch / 2, '#8a2a30');
    for (let i = 0; i < 3; i++) hexAt2(ctx, -9 + i * 9, ty + 20 - crouch / 2, 5, honey, honeyD);                                       // the hive growing out of him
    hexAt2(ctx, 11, ty + 2, 6, honey, honeyD); hexAt2(ctx, 14, ty + 10, 5, honey, honeyD);
    px(ctx, -7, ty - 11, 13, 12, dark); px(ctx, -7, ty - 11, 13, 2, '#555a6a'); px(ctx, 0, ty - 7, 4, 3, flare ? '#ffffff' : '#ffb030');
    for (let i = 0; i < 4; i++) px(ctx, -8 + i * 4, ty - 15, 2, 5, '#c0405a');
    let hx = 10, hy = ty + 8, tx = 24, tyy = -4;
    if (pose === 'up') { hx = 6; hy = ty - 2; tx = 4; tyy = ty - 44; } else if (pose === 'down') { hx = 12; hy = ty + 4; tx = 54; tyy = -3; } else if (pose === 'shield') { hx = 12; hy = ty + 6; tx = 12; tyy = ty + 6; }
    pixLine(ctx, hx, hy, tx, tyy, 5, '#a8aebc'); pixLine(ctx, hx, hy, hx + (tx - hx) * 0.2, hy + (tyy - hy) * 0.2, 4, '#4a3a2a'); px(ctx, hx - 2, hy - 2, 5, 5, honey);
    if (pose === 'shield' || pose === 'rush') { px(ctx, 12, ty - 2, 8, 28, honeyD); px(ctx, 14, ty, 4, 24, honey); }
    ctx.restore();
  }
}
function hexAt2(ctx, cx, cy, r, f, s) { px(ctx, cx - r / 2, cy - r, r, r * 2, f); px(ctx, cx - r, cy - r / 2, r * 2, r, f); px(ctx, cx - r / 2, cy - r, r, 1, s); px(ctx, cx - r / 2, cy + r - 1, r, 1, s); }
HIVE_BOSSES[8] = { id: 'knight', name: 'The Honey Knight', sub: 'A soldier the hive grew into', coins: 61, make: () => [new HoneyKnight()] };

HIVE_BOSSES.forEach((d, i) => { if (d) d.music = HIVE_MUSIC[i % 3]; });
