'use strict';

// The Foundry: bosses 1 to 4 (Loose Wire, The Welder, Press Jaw, Ripper) and what they all share.
// Same rules as every boss: attacks are segment lists, a hit never interrupts an attack, only boxes from attacks()/zones/shots hurt.

const FOUNDRY_MUSIC = ['foundryA', 'foundryC', 'foundryD'];       // bosses 1 to 8 cycle these three

// shots used here: sparks, bolts, slag, saws, rivets, gears, junk, tanks, fists, drills, loops and the floor shockwave
(function extendFoundryShots() {
  const old = BossShot.prototype.draw;
  BossShot.prototype.draw = function (ctx, boss) {
    const x = Math.round(this.x), y = Math.round(this.y), d = Math.sign(this.vx) || 1, t = this.age;
    if (this.kind === 'spark') { disc(ctx, x, y, 3, 3, '#ffb347'); px(ctx, x - 1, y - 1, 2, 2, '#ffffff'); }
    else if (this.kind === 'bolt') { const a = Math.atan2(this.vy, this.vx); pixLine(ctx, x - Math.cos(a) * 9, y - Math.sin(a) * 9, x, y, 2, '#3fc7d9'); px(ctx, x - 2, y - 2, 4, 4, '#e8fcff'); }
    else if (this.kind === 'slag') { disc(ctx, x, y, 4, 4, '#ff7a2a'); px(ctx, x - 2, y - 2, 3, 3, '#ffd080'); }
    else if (this.kind === 'saw') { disc(ctx, x, y, 7, 7, '#c8d0d8'); disc(ctx, x, y, 2, 2, '#3a4048'); for (let k = 0; k < 6; k++) { const a = t * 18 + k * Math.PI / 3; px(ctx, x + Math.round(Math.cos(a) * 8) - 1, y + Math.round(Math.sin(a) * 8) - 1, 3, 3, '#e8ecf0'); } }
    else if (this.kind === 'rivet') { const a = Math.atan2(this.vy, this.vx); pixLine(ctx, x - Math.cos(a) * 6, y - Math.sin(a) * 6, x, y, 2, '#9aa4ae'); px(ctx, x - 1, y - 1, 3, 3, '#e8ecf0'); }
    else if (this.kind === 'gear') { const r = this.w / 2; disc(ctx, x, y, r, r, '#6a7a86'); disc(ctx, x, y, r - 4, r - 4, '#3a4852'); disc(ctx, x, y, 3, 3, '#14202a'); for (let k = 0; k < 8; k++) { const a = t * 6 * d + k * Math.PI / 4; px(ctx, x + Math.round(Math.cos(a) * (r + 1)) - 2, y + Math.round(Math.sin(a) * (r + 1)) - 2, 4, 4, '#8a9aa6'); } }
    else if (this.kind === 'junk') { px(ctx, x - 4, y - 4, 8, 8, '#6a6258'); px(ctx, x - 4, y - 4, 8, 2, '#9a9080'); px(ctx, x + 1, y - 1, 3, 3, '#3a342c'); }
    else if (this.kind === 'tank') { px(ctx, x - 3, y - 6, 6, 12, '#c0405a'); px(ctx, x - 3, y - 6, 6, 2, '#e07080'); px(ctx, x - 1, y - 9, 2, 3, '#9aa4ae'); }
    else if (this.kind === 'fist') { px(ctx, x - 7, y - 5, 14, 10, '#8a96a0'); px(ctx, x - 7, y - 5, 14, 2, '#c8d0d8'); px(ctx, x + d * 4, y - 3, 4, 6, '#5a6670'); pixLine(ctx, x - d * 7, y, x - d * 16, y, 2, '#3a4852'); }
    else if (this.kind === 'drill') { for (let k = 0; k < 5; k++) px(ctx, x - 4 + k, y - 10 + k * 4, 8 - k * 2, 4, k % 2 ? '#c8d0d8' : '#8a96a0'); px(ctx, x - 5, y - 13, 10, 4, '#4a5660'); }
    else if (this.kind === 'loop') { disc(ctx, x, y, 8, 8, '#3fc7d9'); disc(ctx, x, y, 5, 5, '#0a1218'); for (let k = 0; k < 3; k++) { const a = t * 14 + k * 2.1; px(ctx, x + Math.round(Math.cos(a) * 8) - 1, y + Math.round(Math.sin(a) * 8) - 1, 3, 3, '#ffffff'); } }
    else if (this.kind === 'plasma') { disc(ctx, x, y, 6, 6, '#3fc7d9'); disc(ctx, x, y, 3, 3, '#e8fcff'); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 30); disc(ctx, x, y, 8, 8, '#7fe8ff'); ctx.globalAlpha = 1; }
    else if (this.kind === 'shock') {                  // the floor shockwave: a tall bright wedge that must be jumped
      const gy = this.gy || GROUND_Y, lead = d;
      ctx.globalAlpha = 0.4; px(ctx, x - lead * 30 - (lead > 0 ? 0 : 8), gy - 7, 38, 7, '#3fc7d9'); ctx.globalAlpha = 0.25; px(ctx, x - lead * 48 - (lead > 0 ? 0 : 8), gy - 4, 56, 4, '#3fc7d9'); ctx.globalAlpha = 1;
      px(ctx, x - 11, gy - 8, 22, 8, '#3fc7d9'); px(ctx, x - 9, gy - 16, 18, 10, '#7fe8ff'); px(ctx, x - 6 + lead * 3, gy - 24, 12, 10, '#b8f4ff'); px(ctx, x - 2 + lead * 6, gy - 32, 7, 10, '#ffffff'); px(ctx, x - 11, gy - 2, 22, 2, '#ffffff');
    }
    else old.call(this, ctx, boss);
  };
})();

function fshot(b, kind, x, y, vx, vy, o) { const s = new BossShot(Object.assign({ kind, x, y, vx, vy, w: 8, h: 8, life: 4 }, o)); b.shots.push(s); return s; }

// a cable: round segments along a curve from the base to the head
function drawCable(ctx, pts, col, tip) {
  for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i]; disc(ctx, Math.round(x), Math.round(y), 3, 3, col); px(ctx, Math.round(x) - 1, Math.round(y) - 2, 2, 1, tip || '#e08090'); }
}
function bez(p0, p1, p2, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return out; }

class FBoss extends HiveBoss {
  constructor(o) { super(o); this.moves = o.moves || []; this.speed = o.speed || 50; this.keep = o.keep || 60; this.marks = []; this.eyes = !!o.eyes; this.pose = 'idle'; }
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) { this.vx = 0; return; }
    if (this.seq) { this.stepSeq(dt, w); return; }
    this.pose = 'idle'; this.faceTo(p); this.cool -= dt;
    this.idleMove(dt, w);
    if (this.cool <= 0) this.pickMove(w, this.moves.filter(m => !this.rageOnly || !this.rageOnly[m] || this.rage));
  }
  idleMove(dt, w) { const p = w.player; this.vx = Math.abs(p.x - this.x) > this.keep ? this.facing * this.speed : 0; }
  // a danger zone: it flashes as a warning, then hurts. Boxes are in world pixels.
  zone(box, warn, dur, dmg, col) { this.marks.push({ box, t0: this.age + warn, t1: this.age + warn + dur, col }); this.later(warn, dur, box, dmg || 1); }
  drawAll(ctx, t) {
    if (this.dead) return;
    if (!this.dying) for (const m of this.marks) {
      if (this.age > m.t1) continue;
      const b = m.box, on = this.age >= m.t0;
      if (on) { px(ctx, b.x, b.y, b.w, b.h, m.col || '#3fc7d9'); px(ctx, b.x + 1, b.y + 1, Math.max(1, b.w - 2), Math.max(1, b.h - 2), '#e8fcff'); }
      else { ctx.globalAlpha = 0.18 + 0.12 * Math.sin(this.age * 36); px(ctx, b.x, b.y, b.w, b.h, '#ffb347'); ctx.globalAlpha = 0.7; px(ctx, b.x, b.y, b.w, 1, '#ffb347'); px(ctx, b.x, b.y + b.h - 1, b.w, 1, '#ffb347'); px(ctx, b.x, b.y, 1, b.h, '#ffb347'); px(ctx, b.x + b.w - 1, b.y, 1, b.h, '#ffb347'); ctx.globalAlpha = 1; }
    }
    this.marks = this.marks.filter(m => this.age < m.t1);
    super.drawAll(ctx, t);
  }
}
const sTell = (d, pose, o) => Object.assign({ d, pose: pose || 'tell', tell: true, face: true, tick: b => { b.vx *= 0.8; } }, o);
const sRest = (d, pose) => ({ d, pose: pose || 'low', tick: (b, dt) => { b.vx = approach(b.vx, 0, 900 * dt); } });
function dieSparks(b, w, n) { for (let i = 0; i < n; i++) w.spawn({ x: b.x + (Math.random() - 0.5) * b.w, y: b.y - Math.random() * b.h, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 100, life: 0.5, color: i % 2 ? '#7fe8ff' : '#ffb347', size: 2, grav: 300 }); }

// ======================================================================= 1. LOOSE WIRE
class LooseWire extends FBoss {
  constructor() { super({ name: 'Loose Wire', hp: 80, w: 24, h: 46, speed: 58, keep: 64, eyes: true, moves: ['lash', 'floor', 'sparks', 'whip', 'loop', 'beam', 'knot', 'pulse', 'burrow'] }); this.reach = 0; }
  mLash(w) {
    const k = this.k, one = [sTell(0.55 * k, 'rear'), { d: 0.16, pose: 'lash', on: (b) => { b.vx = b.facing * 90; Sfx.play('slash'); }, hz: b => [hzFront(b, 0, 96, -58, -8)] }, sRest(0.35)];
    return this.rage ? [...one, sTell(0.3, 'rear'), ...one.slice(1)] : one;
  }
  mFloor(w) {
    return [sTell(0.5, 'rear', { on: (b, w2) => { Sfx.play('warn'); const p = w2.player; [0, 1, 2].forEach(i => b.zone({ x: clamp(p.x + (i - 1) * 84, 26, 454) - 32, y: GROUND_Y - 10, w: 64, h: 10 }, 0.6 + i * 0.33, 0.4, 1)); } }), { d: 1.7, pose: 'low' }];
  }
  mSparks(w) {
    return [sTell(0.5, 'rear'), { d: 0.1, pose: 'lash', on: (b, w2) => { Sfx.play('flap'); const n = this.rage ? 7 : 5; for (let i = 0; i < n; i++) fshot(b, 'spark', b.x, b.y - 44, (i - (n - 1) / 2) * 52 + (w2.player.x - b.x) * 0.3, -190 - Math.random() * 40, { grav: 380, w: 6, h: 6 }); } }, sRest(0.55)];
  }
  mWhip(w) {
    const k = this.k, col = () => ({ d: 0.5 * k, pose: 'rear', tell: true, face: true, on: (b, w2) => { Sfx.play('warn'); b.zone({ x: clamp(w2.player.x, 30, 450) - 12, y: GROUND_Y - 130, w: 24, h: 130 }, 0.45, 0.3); } });
    return [col(), col(), col(), sRest(0.5)];
  }
  mLoop(w) {
    const one = { d: 0.5, pose: 'lash', on: (b) => { Sfx.play('flap'); fshot(b, 'loop', b.x + b.facing * 14, GROUND_Y - 9, b.facing * 175, 0, { w: 14, h: 14, ground: false, life: 3.2 }); } };
    return [sTell(0.5 * this.k, 'rear'), one, ...(this.rage ? [one, one] : []), sRest(0.3)];
  }
  mBeam(w) {
    const L = 230;
    return [sTell(0.7, 'rear', { on: (b) => { Sfx.play('warn'); const bx = b.facing > 0 ? b.x : b.x - L; b.zone({ x: bx, y: GROUND_Y - 20, w: L, h: 12 }, 0.7, 0.3); b.zone({ x: bx, y: GROUND_Y - 74, w: L, h: 12 }, 1.4, 0.3); } }), { d: 1.4, pose: 'lash' }, sRest(0.4)];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose, s = Math.sin(this.age * 5);
    let hx = f * 4 + s * 4, hy = -44 + Math.sin(this.age * 3) * 2;
    if (p === 'rear') { hx = -f * 14; hy = -52; } else if (p === 'lash') { hx = f * 78; hy = -34; } else if (p === 'low') { hx = f * 14; hy = -20; }
    ctx.save(); ctx.translate(x, y);
    px(ctx, -12, -6, 24, 6, '#3a4852'); px(ctx, -12, -6, 24, 2, '#6a7a86'); px(ctx, -7, -9, 14, 3, '#2a343c'); px(ctx, -10, -5, 2, 2, '#ffb347'); px(ctx, 8, -5, 2, 2, '#ffb347');
    drawCable(ctx, bez([0, -7], [-f * 6 + (p === 'lash' ? f * 24 : 0), -60], [hx, hy], 9), this.col('#c0405a'), '#e08090');
    px(ctx, hx - 5, hy - 5, 10, 10, this.col('#9aa4ae')); px(ctx, hx + f * 3, hy - 4, 5, 2, '#e8ecf0'); px(ctx, hx + f * 3, hy + 2, 5, 2, '#e8ecf0'); px(ctx, hx - 2, hy - 2, 3, 3, Math.sin(this.age * 40) > 0 ? '#e8fcff' : '#3fc7d9');
    if (p === 'lash') for (let k = 0; k < 4; k++) px(ctx, hx - f * (8 + k * 14), hy + ((k * 7) % 5) - 2, 6, 1, 'rgba(184,244,255,0.7)');
    ctx.restore();
  }
}
FOUNDRY_BOSSES[0] = { id: 'wire', name: 'Loose Wire', sub: 'It was a cable once. Now it is everywhere', coins: 70, make: () => [new LooseWire()] };

// ======================================================================= 2. THE WELDER
class TheWelder extends FBoss {
  constructor() { super({ name: 'The Welder', hp: 90, w: 30, h: 46, speed: 46, keep: 78, eyes: true, moves: ['arc', 'hose', 'lob', 'puddle', 'lunge', 'tank', 'zipper', 'sweep', 'spray', 'columns'] }); this.beam = null; }
  mArc(w) {
    const hi = Math.random() < 0.5, y0 = hi ? -62 : -16, L = 220;
    return [sTell(0.65 * this.k, 'tell', { on: (b) => { Sfx.play('warn'); b.hi = hi; } }),
      { d: 0.95, pose: 'beam', bot: 'away', on: (b) => { b.beam = { y: y0, L }; Sfx.play('whoosh'); }, tick: (b) => { b.vx = 0; }, hz: b => [hzFront(b, 14, L, y0 - 4, y0 + 4)] },
      { d: 0.1, pose: 'low', on: (b) => { b.beam = null; } }, sRest(0.4)];
  }
  mHose(w) {
    const sw = (wd) => [sTell(wd * this.k, 'up'), { d: 0.16, pose: 'down', on: (b) => { Sfx.play('slam'); b.vx = b.facing * 100; }, hz: b => [hzFront(b, -8, 72, -46, 0)] }, sRest(0.12)];
    return [...sw(0.5), ...sw(0.3), sRest(0.4)];
  }
  mLob(w) {
    return [sTell(0.45, 'up'), { d: 0.1, pose: 'down', on: (b, w2) => { Sfx.play('flap'); const p = w2.player; for (let i = 0; i < 6; i++) { const tx = clamp(p.x + (i - 2.5) * 34, 30, 450), tt = 0.95; const s = fshot(b, 'spark', b.x, b.y - 40, (tx - b.x) / tt, -300, { grav: 620, w: 6, h: 6, life: 3 }); s.onLand = (sh) => b.zone({ x: sh.x - 12, y: GROUND_Y - 6, w: 24, h: 6 }, 0.1, 1.4); } } }, sRest(0.6)];
  }
  mPuddle(w) {
    return [sTell(0.5, 'up'), { d: 0.12, pose: 'down', on: (b, w2) => { Sfx.play('flap'); const tx = clamp(w2.player.x, 30, 450); const s = fshot(b, 'slag', b.x, b.y - 40, (tx - b.x) / 0.7, -250, { grav: 700, life: 3 }); s.onLand = (sh) => { b.zone({ x: sh.x - 22, y: GROUND_Y - 9, w: 44, h: 9 }, 0.1, 3.2); Sfx.play('splash'); }; } }, sRest(0.5)];
  }
  mLunge(w) {
    return [sTell(0.5 * this.k, 'tell'), { d: 0.34, pose: 'lunge', bot: 'away', on: (b) => { b.vx = b.facing * 310; Sfx.play('whoosh'); }, hz: b => [hzFront(b, 6, 44, -46, 0)] }, sRest(0.6)];
  }
  mTank(w) {
    return [sTell(0.5, 'up'), { d: 0.12, pose: 'down', on: (b, w2) => { Sfx.play('flap'); const tx = clamp(w2.player.x, 30, 450); const s = fshot(b, 'tank', b.x, b.y - 44, (tx - b.x) / 0.9, -330, { grav: 700, life: 3, w: 8, h: 12 }); s.onLand = (sh) => { Sfx.play('slam'); b.zone({ x: sh.x - 42, y: GROUND_Y - 52, w: 84, h: 52 }, 0.35, 0.3); }; } }, sRest(0.9)];
  }
  // a weld seam races across the floor toward the knight, then erupts piece by piece
  mZipper(w) {
    return [sTell(0.5, 'down', { on: (b, w2) => { Sfx.play('warn'); const dir = w2.player.x >= b.x ? 1 : -1; for (let i = 0; i < 7; i++) b.zone({ x: b.x + dir * (26 + i * 44) - (dir < 0 ? 40 : 0), y: GROUND_Y - 12, w: 40, h: 12 }, 0.5 + i * 0.16, 0.3); } }), { d: 1.7, pose: 'low' }];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose, bob = Math.round(Math.sin(this.age * 6) * (Math.abs(this.vx) > 5 ? 1 : 0));
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(f, 1);
    px(ctx, -15, -16, 8, 16, this.col('#3a4048')); px(ctx, 5, -16, 8, 16, this.col('#3a4048'));                 // boots and legs
    px(ctx, -14, -38, 26, 24, this.col('#5a6470')); px(ctx, -14, -38, 26, 3, this.col('#8a96a2')); px(ctx, -14, -22, 26, 3, '#2a2f36');
    px(ctx, -22, -36, 8, 18, this.col('#c0405a')); px(ctx, -22, -36, 8, 2, '#e07080'); px(ctx, -19, -40, 2, 4, '#9aa4ae');            // gas tank
    px(ctx, -8, -52, 18, 16, this.col('#2a2f36')); px(ctx, -8, -52, 18, 2, '#5a6470'); px(ctx, 2, -46, 10, 4, p === 'tell' || p === 'beam' || p === 'lunge' ? '#ffffff' : '#ffb347');       // mask and visor
    const up = p === 'up' || p === 'tell';
    px(ctx, 10, up ? -52 : -34, 6, up ? 18 : 8, this.col('#5a6470')); px(ctx, 14, up ? -58 : -32, 12, 5, '#2a2f36'); px(ctx, 24, up ? -58 : -32, 3, 5, '#e8fcff');
    if (p === 'down') { px(ctx, 10, -30, 22, 8, this.col('#5a6470')); px(ctx, 30, -32, 4, 12, '#9aa4ae'); }
    if (this.beam && p === 'beam') { const L = this.beam.L, by = this.beam.y; px(ctx, 28, by - 3, L - 14, 6, 'rgba(127,232,255,0.5)'); px(ctx, 28, by - 1, L - 14, 3, '#e8fcff'); for (let k = 0; k < 8; k++) px(ctx, 30 + ((k * 31 + Math.floor(this.age * 60)) % (L - 20)), by - 5 - (k % 3), 2, 2, '#ffb347'); }
    ctx.restore();
  }
}
FOUNDRY_BOSSES[1] = { id: 'welder', name: 'The Welder', sub: 'He fixes things. He is not fixing them now', coins: 73, make: () => [new TheWelder()] };

// ======================================================================= 3. PRESS JAW
class PressJaw extends FBoss {
  constructor() { super({ name: 'Press Jaw', hp: 100, w: 54, h: 40, speed: 36, keep: 56, eyes: true, moves: ['stomp', 'chomp', 'crush', 'roll', 'spit', 'quake', 'clamp', 'gears', 'slagrain'] }); this.open = 0; }
  mStomp(w) {
    const st = (wd) => [sTell(wd * this.k, 'lift'), { d: 0.14, pose: 'stomp', on: (b, w2) => { Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x + b.facing * 44, 0, 12); }, hz: b => [hzFront(b, -4, 76, -34, 0)] }, sRest(0.2)];
    return this.rage ? [...st(0.55), ...st(0.3), sRest(0.4)] : [...st(0.55), sRest(0.4)];
  }
  mChomp(w) {
    return [sTell(0.6 * this.k, 'open'), { d: 0.18, pose: 'chomp', bot: 'away', on: (b) => { b.vx = b.facing * 130; Sfx.play('roar'); }, hz: b => [hzFront(b, 6, 74, -50, 0)] }, sRest(0.8, 'chomp')];
  }
  // a press plate falls from the ceiling onto where the knight stands, on the floor or on a plate
  mCrush(w) {
    const go = () => ({ d: 0.7, pose: 'idle', tell: true, on: (b, w2) => { Sfx.play('warn'); const p = w2.player, top = 36; b.zone({ x: p.x - 30, y: top, w: 60, h: p.y + 2 - top }, 0.65, 0.3); b.crushes = 1; }, tick: (b) => { b.vx = 0; } });
    return [go(), { d: 0.5, pose: 'idle', on: (b) => { Sfx.play('slam'); b.vx = 0; } }, ...(this.rage ? [go(), { d: 0.4, pose: 'idle' }] : []), sRest(0.3, 'idle')];
  }
  mRoll(w) {
    return [sTell(0.5, 'curl'), { d: 2.4, pose: 'roll', bot: 'away', min: 0.4, on: (b) => { b.vx = b.facing * 250; Sfx.play('whoosh'); }, tick: (b) => { b.vx = Math.sign(b.vx || b.facing) * 250; if ((b.x <= b.bl + 1 && b.vx < 0) || (b.x >= b.br - 1 && b.vx > 0)) b.hitWall = true; }, until: (b) => b.hitWall, hz: b => [hzBody(b, 4)] },
      { d: 0.9, pose: 'curl', on: (b, w2) => { b.hitWall = false; b.vx = 0; Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 12); } }];
  }
  mSpit(w) {
    return [sTell(0.5, 'open'), { d: 0.1, pose: 'chomp', on: (b, w2) => { Sfx.play('flap'); const p = w2.player; for (let i = 0; i < 3; i++) { const tx = clamp(p.x + (i - 1) * 46, 30, 450), tt = 0.9 + i * 0.12; const s = fshot(b, 'slag', b.x + b.facing * 24, b.y - 30, (tx - b.x) / tt, -280, { grav: 650, life: 3 }); s.onLand = (sh) => b.zone({ x: sh.x - 14, y: GROUND_Y - 8, w: 28, h: 8 }, 0.1, 1.6); } } }, sRest(0.7, 'open')];
  }
  mQuake(w) {
    return [sTell(0.5 * this.k, 'lift', { on: (b, w2) => { b.tx = clamp(w2.player.x, b.bl, b.br); } }),
      { d: 1.6, pose: 'air', bot: 'away', min: 0.25, until: (b) => !b.airborne, hz: b => [hzBody(b, 2)], on: (b) => { b.vy = -560; b.vx = clamp((b.tx - b.x) / 0.8, -260, 260); Sfx.play('whoosh'); } },
      { d: 0.2, pose: 'stomp', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(6); dustWave(w2, b.x, 0, 14); for (const dir of [-1, 1]) fshot(b, 'shock', b.x + dir * 30, GROUND_Y - 10, dir * 160, 0, { w: 22, h: 30, ground: false, life: 3 }); }, hz: b => [{ box: { x: b.x - 52, y: b.y - 24, w: 104, h: 24 }, dmg: 1, fromX: b.x }] },
      sRest(0.8, 'lift')];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose;
    const open = p === 'open' ? 16 : p === 'chomp' ? 2 : 6, lift = p === 'lift' ? 10 : 0, curl = p === 'curl' || p === 'roll';
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    if (curl) { ctx.translate(0, -20); ctx.rotate(p === 'roll' ? this.age * 12 * f : 0); ctx.translate(0, 20); disc(ctx, 0, -20, 22, 20, this.col('#6a7480')); disc(ctx, 0, -20, 14, 12, this.col('#8a96a2')); for (let k = 0; k < 6; k++) px(ctx, -2 + Math.round(Math.cos(k * 1.05) * 18), -22 + Math.round(Math.sin(k * 1.05) * 16), 4, 4, '#2a343c'); ctx.restore(); return; }
    px(ctx, -22, -14 - lift, 8, 14 + lift, this.col('#3a4852')); px(ctx, 14, -14, 8, 14, this.col('#3a4852'));            // pistons for legs
    px(ctx, -26, -34 - open * 0.3, 52, 22, this.col('#6a7480')); px(ctx, -26, -34 - open * 0.3, 52, 3, '#a0acb8');              // body
    px(ctx, -26, -40 - open, 54, 8, this.col('#8a96a2')); px(ctx, -26, -40 - open, 54, 2, '#c8d0d8');                          // top jaw
    px(ctx, -4, -16, 34, 6, this.col('#8a96a2')); px(ctx, -4, -12, 34, 2, '#3a4852');                                         // bottom jaw
    for (let k = 0; k < 6; k++) { px(ctx, 2 + k * 5, -32 - open, 3, 5, '#e8ecf0'); px(ctx, 4 + k * 5, -16, 3, 5, '#e8ecf0'); }
    px(ctx, 14, -48 - open, 10, 4, p === 'open' || p === 'chomp' ? '#ffffff' : '#e0405a');
    px(ctx, -24, -50 - open, 4, 12, '#2a343c'); px(ctx, -26, -52 - open, 8, 3, '#5a6670');
    ctx.restore();
  }
}
FOUNDRY_BOSSES[2] = { id: 'jaw', name: 'Press Jaw', sub: 'It stamped out parts. Now it stamps out people', coins: 76, make: () => [new PressJaw()] };

// ======================================================================= 4. RIPPER
class SawShot extends BossShot {                                 // a saw that flies out and comes back
  update(dt, w) { if (this.age > 0.65 && !this.back) { this.back = true; this.vx = -this.vx * 1.1; } super.update(dt, w); }
}
class Ripper extends FBoss {
  constructor() { super({ name: 'Ripper', hp: 96, w: 26, h: 40, speed: 82, keep: 40, eyes: true, moves: ['charge', 'pipe', 'throw', 'pounce', 'tear', 'spin', 'flurry', 'whip', 'sawlob'] }); }
  mCharge(w) {
    return [sTell(0.5 * this.k, 'tell'), { d: 1.4, pose: 'dash', bot: 'away', min: 0.3, on: (b) => { b.vx = b.facing * 330; Sfx.play('whoosh'); }, tick: (b) => { b.vx = Math.sign(b.vx || b.facing) * 330; }, until: (b) => (b.vx > 0 && b.x >= b.br - 2) || (b.vx < 0 && b.x <= b.bl + 2), hz: b => [hzBody(b, 8)] },
      { d: 0.7, pose: 'low', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(3); } }];
  }
  mPipe(w) {
    const sw = (wd, y0, y1) => [sTell(wd * this.k, 'up'), { d: 0.15, pose: 'down', on: (b) => { b.vx = b.facing * 130; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 66, y0, y1)] }, sRest(0.08)];
    return [...sw(0.5, -80, 0), ...sw(0.3, -40, 0), ...sw(0.26, -80, 0), sRest(0.4)];
  }
  mThrow(w) {
    const one = { d: 0.35, pose: 'down', on: (b) => { Sfx.play('flap'); const s = new SawShot({ kind: 'saw', x: b.x + b.facing * 12, y: GROUND_Y - 14, vx: b.facing * 300, vy: 0, w: 14, h: 14, ground: false, life: 2.6 }); b.shots.push(s); } };
    return [sTell(0.45, 'up'), one, ...(this.rage ? [sTell(0.25, 'up'), one] : []), sRest(0.6)];
  }
  mPounce(w) {
    return [sTell(0.4 * this.k, 'low', { on: (b, w2) => { b.tx = clamp(w2.player.x, b.bl, b.br); } }),
      { d: 1.5, pose: 'air', bot: 'away', min: 0.25, until: (b) => !b.airborne, hz: b => [hzBody(b, 6)], on: (b) => { b.vy = -520; b.vx = clamp((b.tx - b.x) / 0.78, -300, 300); Sfx.play('whoosh'); } },
      { d: 0.18, pose: 'down', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x, 0, 10); }, hz: b => [{ box: { x: b.x - 40, y: b.y - 20, w: 80, h: 20 }, dmg: 1, fromX: b.x }] }, sRest(0.5)];
  }
  // floor panels are ripped up: spikes of torn metal, one after another from the knight outward
  mTear(w) {
    return [sTell(0.45, 'down', { on: (b, w2) => { Sfx.play('warn'); const p = w2.player; [0, -1, 1, -2, 2].forEach((o, i) => b.zone({ x: clamp(p.x + o * 48, 26, 454) - 12, y: GROUND_Y - 30, w: 24, h: 30 }, 0.55 + i * 0.22, 0.3)); } }), { d: 1.5, pose: 'low' }];
  }
  mSpin(w) {
    return [sTell(0.5 * this.k, 'tell'), { d: 1.0, pose: 'spin', bot: 'away', on: () => Sfx.play('whoosh'), tick: (b, dt, w2) => { b.vx = clamp((w2.player.x - b.x) * 1.2, -70, 70); }, hz: b => [{ box: { x: b.x - 46, y: b.y - 34, w: 92, h: 34 }, dmg: 1, fromX: b.x }] }, sRest(0.7)];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose, run = Math.abs(this.vx) > 20 ? Math.floor(this.age * 14) % 2 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    px(ctx, -8, -16, 5, 16 - run, this.col('#6a7480')); px(ctx, 3, -16, 5, 16 - (1 - run), this.col('#6a7480'));
    px(ctx, -9, -34, 18, 20, this.col('#8a8e98')); px(ctx, -9, -34, 18, 3, '#b8bcc8'); px(ctx, -3, -30, 6, 10, '#3a4048');
    px(ctx, -5, -44, 12, 10, this.col('#6a7480')); px(ctx, 2, -41, 6, 3, '#ff5a3a');
    const sa = this.age * 22, up = p === 'up' || p === 'tell';
    const arm = (ax, ay, a) => { pixLine(ctx, ax, ay, ax + Math.round(Math.cos(a) * 12), ay + Math.round(Math.sin(a) * 12), 3, this.col('#4a5660')); };
    const sx = up ? 14 : 16, sy = up ? -50 : -26;
    arm(8, -32, up ? -1.1 : p === 'down' ? 0.1 : -0.3);
    disc(ctx, sx + 4, sy, 8, 8, '#c8d0d8'); disc(ctx, sx + 4, sy, 2, 2, '#3a4048'); for (let k = 0; k < 6; k++) { const a = sa + k * Math.PI / 3; px(ctx, sx + 4 + Math.round(Math.cos(a) * 9) - 1, sy + Math.round(Math.sin(a) * 9) - 1, 3, 3, '#e8ecf0'); }
    if (p === 'spin' || p === 'dash') { disc(ctx, -sx, sy + 10, 8, 8, '#c8d0d8'); for (let k = 0; k < 6; k++) { const a = -sa + k * Math.PI / 3; px(ctx, -sx + Math.round(Math.cos(a) * 9) - 1, sy + 10 + Math.round(Math.sin(a) * 9) - 1, 3, 3, '#e8ecf0'); } }
    px(ctx, -14, -30, 3, 14, '#c0405a'); px(ctx, -17, -22, 3, 10, '#3fc7d9');                          // torn cables
    if (Math.random() < 0.05) px(ctx, -14 + Math.floor(Math.random() * 4), -16, 2, 2, '#ffb347');
    ctx.restore();
  }
}
FOUNDRY_BOSSES[3] = { id: 'ripper', name: 'Ripper', sub: 'Built to tear down. It never learned to stop', coins: 79, make: () => [new Ripper()] };
