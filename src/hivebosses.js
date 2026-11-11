'use strict';

// The Trial of the Bugs: bosses 1 to 9. They fight in a narrow honeycomb well (see hive.js).
// Every attack is a segment list like the Pits bosses, hits never interrupt an attack, and only boxes from attacks() hurt.

const HIVE_L = 24, HIVE_R = 456;               // the walls of the well
const HIVE_BOSSES = [];                         // each boss registers here, in order; the last (the queen) is added in hivequeen.js
const HIVE_MUSIC = ['hiveA', 'hiveG', 'hiveN'];  // bosses 1 to 9 cycle these three

function disc(ctx, cx, cy, rx, ry, col) {
  for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); if (hw > 0) px(ctx, cx - hw, cy + y, hw * 2, 1, col); }
}
function bugWings(ctx, x, y, t, span, ry, fast) {
  const f = Math.sin(t * (fast ? 40 : 22)) * 0.5 + 0.5;
  ctx.globalAlpha = 0.4;
  for (const sg of [-1, 1]) { disc(ctx, x + sg * span * 0.5, y - 3 - f * 4, span * 0.5, ry, '#ffffff'); disc(ctx, x + sg * span * 0.4, y + 2, span * 0.38, ry * 0.7, '#d8e8ff'); }
  ctx.globalAlpha = 1;
}
function compoundEye(ctx, x, y, r, col) { disc(ctx, x, y, r, r + 1, '#140a04'); disc(ctx, x, y, r - 1, r, col); px(ctx, x - r + 2, y - r + 2, 2, 2, '#ffffff'); }

class HiveBoss extends Boss {
  constructor(o) {
    super(o);
    this.bl = HIVE_L + 14; this.br = HIVE_R - 14; this.floorY = GROUND_Y;
    this.flies = !!o.flies; this.hoverY = o.hoverY || 120; this.add = !!o.add;
  }
  physics(dt) {
    if (this.flies) { this.x = clamp(this.x + this.vx * dt, this.bl, this.br); this.y = clamp(this.y + this.vy * dt, 40, this.floorY); this.airborne = this.y < this.floorY - 1; return; }
    this.vy += this.gravity * dt; this.y += this.vy * dt; this.airborne = true;
    if (this.y >= this.floorY) { this.y = this.floorY; this.vy = 0; this.airborne = false; }
    this.x = clamp(this.x + this.vx * dt, this.bl, this.br);
  }
  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'idle'; }
  // fly toward a point
  steer(tx, ty, sp) { const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1, v = Math.min(sp, d * 4); this.vx = dx / d * v; this.vy = dy / d * v; }
  get rage() { return this.hp <= this.maxHp * 0.5; }
  get k() { return this.rage ? 0.9 : 1.12; }
  restTime() { return (0.55 + Math.random() * 0.5) * (this.rage ? 0.8 : 1); }
  pickMove(w, list) { const m = this.choose(list); this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w); }
  // the usual way a flyer idles: drift above the knight and bob
  hoverIdle(p, dt, ox, hy) { this.faceTo(p); this.steer(clamp(p.x + Math.sin(this.age * 0.9) * ox, this.bl, this.br), hy + Math.sin(this.age * 2.2) * 8, 80); }
}

// the knight is on, or has just left, this ledge
function ledgeOf(w, x, y) { let best = null; for (const pl of w.platforms) { if (pl.gone || x < pl.x - 4 || x > pl.x + pl.w + 4 || pl.y < y - 4) continue; if (!best || pl.y < best.y) best = pl; } return best; }
function segHold(d, tellFlag, face) { return { d, pose: 'tell', tell: tellFlag !== false, face: face !== false, tick: (b) => { b.vx *= 0.85; b.vy *= 0.85; } }; }
function dartFan(b, w, n, spread, speed, kind) {
  const p = w.player, a0 = Math.atan2(p.y - 12 - (b.y - b.h / 2), p.x - b.x);
  Sfx.play('flap');
  for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; b.shots.push(new BossShot({ kind: kind || 'dart', x: b.x, y: b.y - b.h / 2, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, w: 8, h: 4, life: 3.5 })); }
}
// a pass across the well at one height, letting stingers fall straight down
function segStrafe(w, speed, every, y) {
  return [
    { d: 0.7, pose: 'rise', tell: true, on: () => Sfx.play('warn'), tick: (b) => { b.side = b.x < 240 ? -1 : 1; b.steer(b.side < 0 ? HIVE_L + 24 : HIVE_R - 24, y, 260); } },
    { d: 2.8, pose: 'fire', min: 0.3, on: (b) => { b.dir = b.side < 0 ? 1 : -1; b.facing = b.dir; b.nextDrop = 0; },
      tick: (b, dt) => { b.vx = b.dir * speed; b.vy = (y - b.y) * 4; b.nextDrop -= dt; if (b.nextDrop <= 0) { b.nextDrop = every; Sfx.play('flap'); b.shots.push(new BossShot({ kind: 'dart', x: b.x, y: b.y - 8, vx: 0, vy: 150, w: 4, h: 8, life: 2.6, grav: 120 })); } },
      until: (b) => (b.dir > 0 && b.x >= b.br - 2) || (b.dir < 0 && b.x <= b.bl + 2) },
    { d: 0.6, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 500 * dt); b.vy = -40; } },
  ];
}
// a dive that ends on whatever ledge is below the knight
function segDive(speed, w) {
  return { d: 1.6, pose: 'dive', bot: 'away', min: 0.1, hz: b => [hzBody(b, 6)],
    on: (b) => { b.vx = 0; b.vy = speed; Sfx.play('whoosh'); },
    tick: (b) => { b.vx = (b.px - b.x) * 4; },
    until: (b) => { const pl = ledgeOf(w, b.x, b.y - 2); return b.y >= (pl ? pl.y : GROUND_Y) - 1; } };
}
function segLand(d) { return { d, pose: 'stuck', on: (b, w2) => { b.vx = 0; b.vy = 0; w2.shake(3); Sfx.play('slam'); dustWave(w2, b.x, 0, 8); }, tick: (b) => { b.vx = 0; b.vy = 0; } }; }

// ---- small things the bosses leave behind ----
class Swarmling extends HiveBoss {                           // a bee or wasp sent at the knight. One or two hits.
  constructor(x, y, hp, big) { super({ name: 'Bee', hp: hp || 1, w: big ? 14 : 10, h: big ? 10 : 8, x, flies: true, add: true }); this.y = y; this.big = big; this.engaged = true; this.born = 0; this.maxV = big ? 120 : 100; }
  idleUpdate() {}
  think(dt, w) {
    const p = w.player; this.born += dt;
    if (p.dead) { this.vx = this.vy = 0; return; }
    const dx = p.x - this.x, dy = (p.y - 12) - this.y, d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d * this.maxV - this.vx) * Math.min(1, dt * 1.6); this.vy += (dy / d * this.maxV - this.vy) * Math.min(1, dt * 1.6);
    this.vx += Math.sin(this.age * 9 + this.x) * 14 * dt * 10; this.facing = this.vx >= 0 ? 1 : -1;
    if (this.born > 9) this.hp = 0, this.die(w);
  }
  die(w) { this.dead = true; this.dying = true; this.shots = []; for (let i = 0; i < 5; i++) w.spawn({ x: this.x, y: this.y - 4, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 0.4, color: '#f0c020', size: 2, grav: 200 }); }
  attacks() { return this.dead ? [] : [hzBody(this, 2)]; }
  draw(ctx) { const x = Math.round(this.x), y = Math.round(this.y), f = Math.floor(this.age * 26) % 2; ctx.save(); ctx.translate(x, y); ctx.scale(this.facing, 1); px(ctx, -5, -8, 10, 6, this.col(this.big ? '#e0902a' : '#f0c020')); px(ctx, -1, -8, 2, 6, '#201000'); px(ctx, 3, -8, 2, 6, '#201000'); px(ctx, 4, -7, 3, 3, '#140a04'); px(ctx, -4, -11 - f * 2, 6, 2, 'rgba(255,255,255,0.8)'); if (this.big) px(ctx, -8, -6, 3, 2, '#c0405a'); ctx.restore(); }
}
class Grub extends HiveBoss {                                // a larva that crawls along one ledge
  constructor(x, pl) { super({ name: 'Grub', hp: 2, w: 14, h: 9, x, add: true }); this.pl = pl; this.floorY = pl.y; this.y = pl.y; this.engaged = true; this.born = 0; }
  idleUpdate() {}
  think(dt, w) {
    const p = w.player; this.born += dt;
    this.faceTo(p); this.vx = Math.abs(p.x - this.x) > 4 ? this.facing * 46 : 0;
    this.x = clamp(this.x, this.pl.x + 6, this.pl.x + this.pl.w - 6);
    if (this.born > 14) { this.hp = 0; this.die(w); }
  }
  die(w) { this.dead = true; this.dying = true; this.shots = []; for (let i = 0; i < 5; i++) w.spawn({ x: this.x, y: this.y - 4, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 50, life: 0.4, color: '#d8e8a0', size: 2, grav: 200 }); }
  attacks() { return this.dead ? [] : [hzBody(this, 2)]; }
  draw(ctx) { const x = Math.round(this.x), y = Math.round(this.y), s = Math.sin(this.age * 8) * 1; ctx.save(); ctx.translate(x, y); ctx.scale(this.facing, 1); for (let i = 0; i < 4; i++) disc(ctx, -6 + i * 4, -3 - (i % 2 ? 1 : 0) + s, 3, 3, i % 2 ? '#c8d890' : '#e8f0b0'); px(ctx, 6, -5, 3, 3, '#3a2a10'); px(ctx, 8, -5, 1, 1, '#ff5a3a'); ctx.restore(); }
}

// ======================================================================= 1. THE DRONE SENTRY
class DroneSentry extends HiveBoss {
  constructor() { super({ name: 'The Drone Sentry', hp: 44, w: 26, h: 22, flies: true, hoverY: 130 }); this.pose = 'idle'; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = this.vy = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.hoverIdle(p, dt, 70, 130); this.cool -= dt;
    if (this.cool <= 0) this.pickMove(w, ['dash', 'darts', 'plunge', 'strafe', 'feint']);
  }
  mDash(w) {
    const k = this.k;
    return [
      { d: 0.55 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.ty = w.player.y - 14; } },
      { d: 0.55, pose: 'dash', bot: 'away', on: (b) => { b.vx = b.facing * 330; b.vy = (b.ty - b.y) * 2.6; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.96; }, hz: b => [hzBody(b, 6)] },
      { d: 0.55, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 500 * dt); b.vy = approach(b.vy, 0, 400 * dt); } },
    ];
  }
  mDarts(w) {
    const k = this.k, n = this.rage ? 5 : 3;
    return [segHold(0.5 * k), { d: 0.12, pose: 'fire', on: (b, w2) => dartFan(b, w2, n, 0.22, 200) }, { d: 0.4, pose: 'idle' },
      ...(this.rage ? [segHold(0.35 * k), { d: 0.12, pose: 'fire', on: (b, w2) => dartFan(b, w2, n, 0.22, 200) }, { d: 0.4, pose: 'idle' }] : [])];
  }
  // a pass across the well, stingers falling straight down
  mStrafe(w) { return segStrafe(w, 165 + (this.rage ? 30 : 0), 0.3, 70); }
  // two quick dashes in a row
  mFeint(w) {
    const k = this.k, dash = (td) => [
      { d: td * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.ty = w.player.y - 14; } },
      { d: 0.32, pose: 'dash', bot: 'away', on: (b) => { b.vx = b.facing * 340; b.vy = (b.ty - b.y) * 3; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.94; }, hz: b => [hzBody(b, 6)] },
      { d: 0.12, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); b.vy = approach(b.vy, 0, 600 * dt); } }];
    return [...dash(0.5), ...dash(0.3), { d: 0.5, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 500 * dt); b.vy = approach(b.vy, 0, 400 * dt); } }];
  }
  mPlunge(w) {
    const k = this.k;
    return [
      { d: 0.6 * k, pose: 'rise', tell: true, tick: (b) => { b.steer(w.player.x, 56, 200); } },
      { d: 0.25 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; }, on: () => Sfx.play('warn') },
      segDive(420, w), segLand(0.8), { d: 0.4, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -160; } },
    ];
  }
  draw(ctx, t) {
    const body = this.col('#c8a040'), dark = this.col('#3a2410'), flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    bugWings(ctx, 0, -18, this.age, 24, 6, true);
    disc(ctx, -4, -9, 9, 7, body); for (let i = 0; i < 3; i++) px(ctx, -9 + i * 5, -15, 2, 12, dark);           // striped thorax
    disc(ctx, 8, -11, 7, 7, body); compoundEye(ctx, 10, -12, 4, flare ? '#ffffff' : '#ff5a3a');
    px(ctx, 12, -18, 1, 4, dark); px(ctx, 14, -17, 1, 4, dark);                                            // antennae
    disc(ctx, -14, -8, 5, 4, dark); px(ctx, -20, -8, 5, 2, '#fff0b0');                                       // abdomen and stinger
    ctx.restore();
  }
}
HIVE_BOSSES[0] = { id: 'drone', name: 'The Drone Sentry', sub: 'A worker, taken and made to guard', coins: 37, make: () => [new DroneSentry()] };

// ======================================================================= 2. THE BROOD NURSE
class BroodNurse extends HiveBoss {
  constructor() { super({ name: 'The Brood Nurse', hp: 48, w: 32, h: 30, flies: true, hoverY: 74 }); this.pose = 'idle'; this.still = 0; this.lastPl = null; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = this.vy = 0; return; }
    // standing still on one ledge for too long is answered with honey on that ledge
    const pl = p.onGround ? p.platform : null;
    if (pl && pl === this.lastPl && Math.abs(p.vx) < 5) this.still += dt; else this.still = 0;
    this.lastPl = pl;
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.hoverIdle(p, dt, 90, 74); this.cool -= dt;
    if (this.still > 2.4 && pl) { this.still = 0; this.play('spit', this.mSpit(w), w); return; }
    if (this.cool <= 0) this.pickMove(w, ['sacs', 'spray', 'swoop', 'spit', 'nursery']);
  }
  mSacs(w) {
    const k = this.k, n = this.rage ? 3 : 2;
    return [segHold(0.6 * k), { d: 0.15, pose: 'throw', on: (b, w2) => {
      Sfx.play('whoosh');
      for (let i = 0; i < n; i++) {
        const tx = clamp(w2.player.x + (i - (n - 1) / 2) * 60, HIVE_L + 20, HIVE_R - 20), T = 0.9, g = 600, sy = b.y - 10;
        b.shots.push(new BossShot({ kind: 'sac', x: b.x, y: sy, vx: (tx - b.x) / T, vy: -170 - i * 18, grav: g, w: 12, h: 12, life: 3, ground: false, landOn: true, dmg: 1,
          onLand: (s, w3) => { Sfx.play('splash'); const pl = s.landed; for (let j = 0; j < 2; j++) w3.addBoss(new Grub(clamp(s.x + (j ? 8 : -8), pl.x + 6, pl.x + pl.w - 6), pl)); for (let q = 0; q < 6; q++) w3.spawn({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, life: 0.4, color: '#d8e8a0', size: 2, grav: 200 }); } }));
      }
    } }, { d: 0.6, pose: 'idle' }];
  }
  mSpit(w) {
    return [segHold(0.5 * this.k), { d: 0.15, pose: 'throw', on: (b, w2) => {
      const p = w2.player, pl = ledgeOf(w2, p.x, p.y), tx = pl ? pl.x + pl.w / 2 : p.x;
      b.shots.push(new BossShot({ kind: 'honey', x: b.x, y: b.y - 10, vx: (tx - b.x) / 0.8, vy: -140, grav: 560, w: 10, h: 10, life: 3, ground: false, landOn: true, dmg: 1, onLand: (s, w3) => { if (s.landed) w3.honeyLedge(s.landed, 6); Sfx.play('splash'); } }));
    } }, { d: 0.5, pose: 'idle' }];
  }
  // a fan of honey globs that land across the ledges
  mSpray(w) {
    const n = this.rage ? 6 : 4;
    return [segHold(0.6 * this.k), { d: 0.2, pose: 'throw', on: (b, w2) => {
      Sfx.play('whoosh'); const p = w2.player;
      for (let i = 0; i < n; i++) {
        const tx = clamp(p.x + (i - (n - 1) / 2) * 56, HIVE_L + 14, HIVE_R - 14), T = 0.9 + i * 0.06;
        b.shots.push(new BossShot({ kind: 'honey', x: b.x, y: b.y - 10, vx: (tx - b.x) / T, vy: -230, grav: 560, w: 10, h: 10, life: 3, ground: false, landOn: true, dmg: 1, onLand: (s, w3) => { if (s.landed) w3.honeyLedge(s.landed, 5); Sfx.play('splash'); } }));
      }
    } }, { d: 0.6, pose: 'idle' }];
  }
  // she flies across the well at the knight's height, the whole body a danger
  mSwoop(w) {
    const k = this.k;
    return [
      { d: 0.7, pose: 'rise', tell: true, tick: (b) => { b.side = w.player.x < 240 ? 1 : -1; b.steer(b.side > 0 ? HIVE_R - 20 : HIVE_L + 20, w.player.y - 20, 240); b.faceTo({ x: 240 }); } },
      { d: 0.45 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.ty = clamp(w.player.y - 16, 60, 210); b.facing = -b.side; }, on: () => Sfx.play('warn') },
      { d: 1.8, pose: 'lunge', bot: 'jump', min: 0.15, on: (b) => { b.vx = b.facing * 300; b.vy = (b.ty - b.y) * 3; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.92; }, hz: b => [hzBody(b, 4)],
        until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.5, pose: 'drift', tick: (b) => { b.vx = 0; b.vy = -40; } },
    ];
  }
  mNursery(w) {
    return [segHold(0.6 * this.k), { d: 0.2, pose: 'throw', on: (b, w2) => { Sfx.play('growl'); for (let i = 0; i < (b.rage ? 3 : 2); i++) w2.addBoss(new Swarmling(b.x + (i - 1) * 12, b.y - 12, 1)); } }, { d: 0.7, pose: 'idle' }];
  }
  draw(ctx, t) {
    const body = this.col('#d8b060'), gown = this.col('#e8e0c0'), dark = this.col('#3a2410'), flare = this.seq && this.seq[this.si] && this.seq[this.si].tell;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    bugWings(ctx, 0, -24, this.age, 34, 8, false);
    disc(ctx, 0, -10, 10, 11, gown); px(ctx, -10, -2, 20, 3, '#c0a060');                                    // a nurse's apron over a round body
    for (const sg of [-1, 1]) { px(ctx, sg * 9, -18, 3, 10, body); px(ctx, sg * 11, -9 + Math.sin(this.age * 3) * 1, 4, 4, '#fff0b0'); }
    disc(ctx, 2, -26, 8, 8, body); compoundEye(ctx, 6, -27, 4, flare ? '#ffffff' : '#c0405a'); px(ctx, -2, -37, 1, 6, dark); px(ctx, 6, -37, 1, 6, dark);
    px(ctx, -6, -34, 12, 3, '#ffffff'); px(ctx, -1, -35, 2, 3, '#c0405a');                                   // a nurse's cap with a cross
    for (let i = 0; i < 3; i++) disc(ctx, -12 - i * 3, -5 + i, 3, 3, i % 2 ? '#c8e090' : '#e8f0b0');        // larvae trailing behind her
    ctx.restore();
  }
}
HIVE_BOSSES[1] = { id: 'nurse', name: 'The Brood Nurse', sub: 'She raised them. Now she feeds the soldiers', coins: 40, make: () => [new BroodNurse()] };

// ======================================================================= 3. THE WASP LANCER
class WaspLancer extends HiveBoss {
  constructor() { super({ name: 'The Wasp Lancer', hp: 46, w: 22, h: 26, flies: true, hoverY: 100 }); this.pose = 'idle'; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = this.vy = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.hoverIdle(p, dt, 100, 100); this.cool -= dt;
    if (this.cool <= 0) this.pickMove(w, ['lanceDive', 'sweep', 'jabs', 'volley', 'spiral']);
  }
  mLanceDive(w) {
    const k = this.k;
    return [
      { d: 0.5 * k, pose: 'rise', tell: true, tick: (b) => { b.steer(w.player.x, 50, 260); } },
      { d: 0.22 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; }, on: () => Sfx.play('warn') },
      segDive(500, w), segLand(0.6), { d: 0.35, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -200; } },
    ];
  }
  mSweep(w) {
    const k = this.k;
    return [
      { d: 0.7, pose: 'rise', tell: true, tick: (b) => { b.side = w.player.x < 240 ? 1 : -1; b.steer(b.side > 0 ? HIVE_R - 20 : HIVE_L + 20, w.player.y - 14, 260); b.faceTo({ x: 240 }); } },
      { d: 0.4 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.ty = clamp(w.player.y - 14, 60, 210); b.facing = -b.side; }, on: () => Sfx.play('warn') },
      { d: 1.2, pose: 'lunge', bot: 'jump', min: 0.15, on: (b) => { b.vx = b.facing * 380; b.vy = (b.ty - b.y) * 4; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.9; }, hz: b => [hzBody(b, 4), hzFront(b, 6, 36, -22, -6)],
        until: (b) => (b.facing > 0 && b.x >= b.br - 1) || (b.facing < 0 && b.x <= b.bl + 1) },
      { d: 0.5, pose: 'drift', tick: (b) => { b.vx = 0; b.vy = -40; } },
    ];
  }
  // three quick fans of stingers
  mVolley(w) {
    const k = this.k, fire = (b, w2) => dartFan(b, w2, 3, 0.14, 230);
    return [segHold(0.5 * k), { d: 0.12, pose: 'fire', on: fire }, { d: 0.18, pose: 'idle' }, segHold(0.28 * k), { d: 0.12, pose: 'fire', on: fire }, { d: 0.18, pose: 'idle' }, segHold(0.28 * k), { d: 0.12, pose: 'fire', on: fire }, { d: 0.5, pose: 'idle' }];
  }
  // it circles the knight, then spears straight in
  mSpiral(w) {
    const k = this.k;
    return [
      { d: 1.3, pose: 'rise', on: () => Sfx.play('growl'), tick: (b, dt, w2) => { const p = w2.player, a = b.sT * 4.2; b.steer(clamp(p.x + Math.cos(a) * 100, b.bl, b.br), clamp(p.y - 20 + Math.sin(a) * 58, 46, 200), 220); b.faceTo(p); } },
      { d: 0.28 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; b.py = w.player.y - 14; b.faceTo(w.player); }, on: () => Sfx.play('warn') },
      { d: 0.5, pose: 'lunge', bot: 'away', on: (b) => { const dx = b.px - b.x, dy = b.py - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * 430; b.vy = dy / d * 430; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 4), hzFront(b, 6, 36, -22, -6)] },
      { d: 0.5, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 700 * dt); b.vy = approach(b.vy, 0, 700 * dt); } },
    ];
  }
  mJabs(w) {
    const k = this.k, jab = (i) => [{ d: (i ? 0.26 : 0.42) * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.steer(b.x, w.player.y - 14, 90); } },
      { d: 0.12, pose: 'jab', on: (b) => { b.vx = b.facing * 160; Sfx.play('slash'); }, hz: b => [hzFront(b, 6, 62, -24, -4)] }, { d: 0.06, pose: 'tell', tick: (b) => { b.vx = 0; } }];
    return [...jab(0), ...jab(1), ...jab(2), { d: 0.5, pose: 'idle' }];
  }
  draw(ctx, t) {
    const body = this.col('#e8c020'), dark = this.col('#201000'), flare = this.seq && this.seq[this.si] && this.seq[this.si].tell, pose = this.pose;
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y)); ctx.scale(this.facing, 1);
    bugWings(ctx, -2, -20, this.age, 28, 6, true);
    disc(ctx, -8, -10, 10, 5, body); for (let i = 0; i < 3; i++) px(ctx, -15 + i * 5, -15, 2, 10, dark); px(ctx, -19, -10, 5, 2, '#fff0b0');
    disc(ctx, 4, -13, 6, 6, body); disc(ctx, 11, -14, 5, 5, body); compoundEye(ctx, 12, -15, 3, flare ? '#ffffff' : '#ff3a3a');
    const ext = pose === 'jab' ? 20 : (pose === 'lunge' || pose === 'dive' ? 8 : 0);
    pixLine(ctx, 6, -8, 22 + ext, -8 + (pose === 'dive' ? 8 : 0), 2, '#c8ccdc'); px(ctx, 22 + ext, -10, 5, 4, '#ffffff');       // the lance
    px(ctx, 12, -22, 1, 5, dark); px(ctx, 15, -21, 1, 5, dark);
    ctx.restore();
  }
}
HIVE_BOSSES[2] = { id: 'lancer', name: 'The Wasp Lancer', sub: 'It was a messenger once', coins: 43, make: () => [new WaspLancer()] };
