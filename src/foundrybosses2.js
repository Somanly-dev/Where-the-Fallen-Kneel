'use strict';

// The Foundry: bosses 5 to 8 (Rigspider, Half-Built, The Overseer, The Heap).

// a pass across the arena at one height, dropping bolts straight down
function segPass(w, speed, every, y) {
  return [
    { d: 0.7, pose: 'rise', tell: true, on: () => Sfx.play('warn'), tick: (b) => { b.side = b.x < 240 ? -1 : 1; b.steer(b.side < 0 ? HIVE_L + 24 : HIVE_R - 24, y, 260); } },
    { d: 2.8, pose: 'fire', min: 0.3, on: (b) => { b.dir = b.side < 0 ? 1 : -1; b.facing = b.dir; b.nextDrop = 0; },
      tick: (b, dt) => { b.vx = b.dir * speed; b.vy = (y - b.y) * 4; b.nextDrop -= dt; if (b.nextDrop <= 0) { b.nextDrop = every; Sfx.play('flap'); fshot(b, 'bolt', b.x, b.y + 4, 0, 160, { w: 4, h: 10, life: 2.6, grav: 160 }); } },
      until: (b) => (b.dir > 0 && b.x >= b.br - 2) || (b.dir < 0 && b.x <= b.bl + 2) },
    { d: 0.5, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 500 * dt); b.vy = -40; } },
  ];
}

// ======================================================================= 5. RIGSPIDER
class Rigspider extends FBoss {
  constructor() { super({ name: 'Rigspider', hp: 105, w: 40, h: 24, flies: true, speed: 80, eyes: true, moves: ['drill', 'web', 'stab', 'pounce', 'pass', 'bolts', 'curtain', 'mines', 'legs'] }); this.y = 80; }
  idleMove(dt, w) { this.hoverIdle(w.player, dt, 90, 78); }
  mDrill(w) {
    const k = this.k, d1 = () => ({ d: 0.4, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.7; b.steer(clamp(w.player.x, b.bl, b.br), 54, 160); }, on: () => Sfx.play('warn') });
    const drop = () => ({ d: 0.18, pose: 'drop', on: (b, w2) => { Sfx.play('flap'); fshot(b, 'drill', clamp(w2.player.x, 30, 450), 40, 0, 120, { grav: 900, w: 8, h: 20, life: 2.4 }); } });
    return [d1(), drop(), d1(), drop(), d1(), drop(), ...(this.rage ? [d1(), drop()] : []), { d: 0.3, pose: 'idle' }];
  }
  mWeb(w) {
    const wave = (delay) => (b, w2) => { Sfx.play('warn'); const px0 = w2.player.x; for (let i = 0; i < 9; i++) { const x = 30 + i * 52; if (Math.abs(x - px0) < 42) continue; b.zone({ x: x - 4, y: 36, w: 8, h: GROUND_Y - 36 }, delay, 0.45); } };
    return [{ d: 0.5, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: wave(0.8) }, { d: 1.5, pose: 'idle' }, { d: 0.4, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: wave(0.7) }, { d: 1.4, pose: 'idle' }];
  }
  mStab(w) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    return [{ d: 0.5, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: (b) => { Sfx.play('warn'); for (let i = 0; i < 8; i++) { const x = (dir > 0 ? 30 : 450) + dir * i * 58; b.zone({ x: x - 7, y: 64, w: 14, h: GROUND_Y - 64 }, 0.55 + i * 0.21, 0.28); } } }, { d: 2.3, pose: 'stab' }, { d: 0.3, pose: 'idle' }];
  }
  mPounce(w) {
    const k = this.k;
    return [{ d: 0.6 * k, pose: 'rise', tell: true, tick: (b) => { b.steer(w.player.x, 54, 200); } },
      { d: 0.25 * k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; }, on: () => Sfx.play('warn') },
      { d: 1.4, pose: 'dive', bot: 'away', min: 0.1, hz: b => [hzBody(b, 6)], on: (b) => { b.vx = 0; b.vy = 460; Sfx.play('whoosh'); }, tick: (b) => { b.vx = (b.px - b.x) * 4; }, until: (b) => b.y >= GROUND_Y - 1 },
      { d: 0.8, pose: 'stuck', on: (b, w2) => { b.vx = 0; b.vy = 0; w2.shake(4); Sfx.play('slam'); dustWave(w2, b.x, 0, 10); }, tick: (b) => { b.vx = 0; b.vy = 0; } },
      { d: 0.5, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -170; } }];
  }
  mPass(w) { return segPass(w, 170 + (this.rage ? 30 : 0), 0.28, 62); }
  mBolts(w) {
    const k = this.k, n = this.rage ? 5 : 3;
    const volley = () => [{ d: 0.45 * k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }, { d: 0.12, pose: 'fire', on: (b, w2) => dartFan(b, w2, n, 0.2, 210, 'bolt') }, { d: 0.35, pose: 'idle' }];
    return [...volley(), ...volley(), ...(this.rage ? volley() : [])];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), p = this.pose, a = this.age;
    pixLine(ctx, x, 30, x, y - 8, 1, '#4a5660'); px(ctx, x - 2, 28, 5, 4, '#6a7a86');                                           // the rig cable it hangs from
    ctx.save(); ctx.translate(x, y);
    const reach = p === 'stab' ? 70 : p === 'dive' ? 24 : p === 'stuck' ? 30 : 22;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const fx = i * (p === 'stab' ? 20 : 11) + Math.sin(a * 4 + i) * 2, fy = reach + Math.sin(a * 5 + i * 2) * 3, kx = i * 8, ky = -6 + Math.abs(i) * 2;
      pixLine(ctx, 0, 0, kx, ky - 8, 2, this.col('#4a5660')); pixLine(ctx, kx, ky - 8, fx, fy, 2, this.col('#6a7a86')); px(ctx, fx - 1, fy - 1, 3, 3, '#c8d0d8');
    }
    disc(ctx, 0, 0, 14, 10, this.col('#4a5660')); disc(ctx, 0, -2, 11, 7, this.col('#6a7a86')); px(ctx, -10, -9, 20, 2, '#8a9aa6');
    const lit = p === 'tell' || p === 'dive' || p === 'drop';
    for (let i = -2; i <= 2; i += 2) px(ctx, i * 3 - 1, -3, 3, 3, lit ? '#ffffff' : '#ff5a3a');
    px(ctx, -3, 5, 6, 3, '#2a343c'); if (p === 'drop' || p === 'tell') px(ctx, -2, 8, 4, 6, '#c8d0d8');
    ctx.restore();
  }
}
FOUNDRY_BOSSES[4] = { id: 'spider', name: 'Rigspider', sub: 'It strung the whole ceiling with its own cables', coins: 82, make: () => [new Rigspider()] };

// ======================================================================= 6. HALF-BUILT
class HalfBuilt extends FBoss {
  constructor() { super({ name: 'Half-Built', hp: 110, w: 34, h: 50, speed: 54, keep: 70, eyes: true, moves: ['drill', 'jet', 'arm', 'rivets', 'rain', 'assemble', 'charge', 'sawarm', 'grenade'] }); this.shield = 0; this.armed = true; }
  hit(dmg, dirX, world) { super.hit(this.shield > 0 ? Math.max(1, Math.ceil(dmg / 2)) : dmg, dirX, world); }
  update(dt, w) { this.shield = Math.max(0, this.shield - dt); super.update(dt, w); }
  mDrill(w) {
    return [sTell(0.5 * this.k, 'tell'), { d: 0.34, pose: 'drill', bot: 'away', on: (b) => { b.vx = b.facing * 290; Sfx.play('whoosh'); }, hz: b => [hzFront(b, 8, 62, -44, 0)] }, sRest(0.55)];
  }
  mJet(w) {
    return [sTell(0.4 * this.k, 'low', { on: (b, w2) => { b.tx = clamp(w2.player.x, b.bl, b.br); } }),
      { d: 1.7, pose: 'air', bot: 'away', min: 0.3, until: (b) => !b.airborne, hz: b => [hzBody(b, 4)], on: (b) => { b.vy = -540; b.vx = clamp((b.tx - b.x) / 0.8, -280, 280); Sfx.play('whoosh'); } },
      { d: 0.2, pose: 'low', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x, 0, 12); }, hz: b => [{ box: { x: b.x - 46, y: b.y - 22, w: 92, h: 22 }, dmg: 1, fromX: b.x }] }, sRest(0.5)];
  }
  mArm(w) {
    const one = { d: 0.4, pose: 'throw', on: (b) => { Sfx.play('flap'); b.armed = false; b.shots.push(new SawShot({ kind: 'fist', x: b.x + b.facing * 14, y: GROUND_Y - 18, vx: b.facing * 280, vy: 0, w: 14, h: 10, ground: false, life: 2.6 })); }, tick: (b) => { b.vx = 0; } };
    return [sTell(0.5, 'up'), one, ...(this.rage ? [sTell(0.3, 'up'), one] : []), { d: 0.7, pose: 'low', on: (b) => { b.armed = true; } }];
  }
  mRivets(w) {
    const k = this.k, v = () => [sTell(0.45 * k, 'aim'), { d: 0.14, pose: 'fire', on: (b, w2) => dartFan(b, w2, this.rage ? 5 : 4, 0.13, 240, 'rivet') }, sRest(0.25, 'aim')];
    return [...v(), ...(this.rage ? v() : [])];
  }
  mRain(w) {
    return [sTell(0.5, 'up', { on: () => Sfx.play('warn') }), { d: 0.1, pose: 'low', on: (b, w2) => { for (let i = 0; i < 7; i++) fshot(b, 'junk', i === 0 ? clamp(w2.player.x, 30, 450) : 40 + Math.random() * 400, 20 - i * 46, 0, 0, { grav: 650, w: 10, h: 10, life: 4 }); } }, { d: 1.5, pose: 'low' }];
  }
  // stands still while parts snap on (hits do half) and then fires the cannon it just built
  mAssemble(w) {
    const L = 260;
    return [{ d: 1.3, pose: 'build', tell: true, face: true, on: (b) => { b.shield = 1.9; Sfx.play('warn'); }, tick: (b) => { b.vx = 0; } },
      { d: 0.2, pose: 'cannon', tell: true, tick: (b) => { b.vx = 0; }, on: (b) => { const bx = b.facing > 0 ? b.x + 10 : b.x - 10 - L; b.zone({ x: bx, y: GROUND_Y - 38, w: L, h: 16 }, 0.4, 0.4); b.zone({ x: bx, y: GROUND_Y - 80, w: L, h: 12 }, 0.4, 0.4); } }, { d: 1.0, pose: 'cannon', tick: (b) => { b.vx = 0; } }, sRest(0.4)];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose, a = this.age, w = Math.abs(this.vx) > 5 ? Math.floor(a * 10) % 2 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    px(ctx, -10, -18, 7, 18 - w, this.col('#8a8e98')); px(ctx, 4, -14, 4, 14, this.col('#6a7480')); px(ctx, 3, -3, 7, 3, '#4a5660');                       // one proper leg, one thin one
    px(ctx, -14, -42, 28, 26, this.col('#c8783a')); px(ctx, -14, -42, 28, 3, '#e0a070'); px(ctx, -4, -36, 14, 16, '#14202a');                        // primer-orange torso with a hole
    for (let k = 0; k < 3; k++) disc(ctx, 2 + (k % 2) * 3, -34 + k * 5, 3, 3, k % 2 ? '#7a8a96' : '#4a5660');
    px(ctx, -16, -46, 6, 8, '#8a8e98');
    px(ctx, -7, -58, 18, 14, this.col('#6a7480')); px(ctx, -7, -58, 18, 2, '#9aa4ae'); px(ctx, 5, -53, 6, 4, p === 'fire' || p === 'tell' || p === 'build' ? '#ffffff' : '#3fc7d9'); px(ctx, -9, -50, 3, 12, '#c0405a');
    const up = p === 'up' || p === 'tell';
    px(ctx, 12, up ? -62 : -42, 6, up ? 22 : 12, this.col('#8a8e98'));                                           // the arm he has
    if (p === 'drill' || p === 'tell') { px(ctx, 16, -42, 24, 8, '#c8d0d8'); for (let k = 0; k < 5; k++) px(ctx, 18 + k * 5, -42 + (Math.floor(a * 30 + k) % 2) * 2, 3, 6, '#8a96a2'); }
    else if (p === 'aim' || p === 'fire') { px(ctx, 14, -40, 22, 6, '#4a5660'); if (p === 'fire') px(ctx, 36, -41, 6, 8, '#ffb347'); }
    else if (p === 'cannon' || p === 'build') { px(ctx, 12, -48, 26 + (p === 'cannon' ? 6 : 0), 14, '#5a6670'); px(ctx, 12, -48, 26, 2, '#9aa4ae'); if (p === 'build') for (let k = 0; k < 6; k++) px(ctx, 20 + Math.floor(Math.random() * 24), -52 + Math.floor(Math.random() * 14), 2, 2, '#ffb347'); }
    if (this.armed || p === 'low') { /* the other arm is gone: a stump with sparks */ }
    px(ctx, -20, -40, 5, 5, '#2a343c'); if (Math.sin(a * 22) > 0.6) px(ctx, -22 + Math.floor(Math.random() * 4), -42 + Math.floor(Math.random() * 4), 2, 2, '#ffb347');
    if (this.shield > 0) { ctx.globalAlpha = 0.35 + 0.15 * Math.sin(a * 30); disc(ctx, 0, -30, 26, 30, '#7fe8ff'); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
FOUNDRY_BOSSES[5] = { id: 'half', name: 'Half-Built', sub: 'They left in the middle of the shift. It kept going', coins: 85, make: () => [new HalfBuilt()] };

// ======================================================================= 7. THE OVERSEER
class SecDrone extends Swarmling {
  constructor(x, y) { super(x, y, 2, false); this.name = 'Drone'; }
  draw(ctx) { const x = Math.round(this.x), y = Math.round(this.y), a = this.age; px(ctx, x - 6, y - 10, 12, 8, this.col('#6a7480')); px(ctx, x - 6, y - 10, 12, 2, '#9aa4ae'); px(ctx, x - 2, y - 8, 4, 4, Math.sin(a * 12) > 0 ? '#ff5a3a' : '#ffb0a0'); px(ctx, x - 4, y - 13 - Math.floor(a * 30) % 2 * 2, 8, 2, 'rgba(200,230,255,0.8)'); }
}
class TheOverseer extends FBoss {
  constructor() { super({ name: 'The Overseer', hp: 112, w: 38, h: 32, flies: true, speed: 80, eyes: true, moves: ['scan', 'flash', 'drones', 'lasers', 'seek', 'sweep', 'grid', 'rapid', 'crash'] }); this.y = 96; this.scanX = -99; }
  idleMove(dt, w) { this.hoverIdle(w.player, dt, 120, 94); }
  mScan(w) {
    return [{ d: 0.8, pose: 'tell', tell: true, on: (b) => { Sfx.play('warn'); b.side = b.x < 240 ? 1 : -1; b.scanX = b.side > 0 ? HIVE_L + 6 : HIVE_R - 6; }, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } },
      { d: 3.4, pose: 'scan', bot: 'away', min: 0.4, on: () => Sfx.play('whoosh'), tick: (b, dt) => { b.scanX += b.side * 170 * dt; b.vx *= 0.8; b.vy *= 0.8; }, until: (b) => b.scanX > HIVE_R + 8 || b.scanX < HIVE_L - 8,
        hz: b => [{ box: { x: b.scanX - 8, y: b.y + 8, w: 16, h: GROUND_Y - b.y - 8 }, dmg: 1, fromX: b.scanX }] },
      { d: 0.1, pose: 'idle', on: (b) => { b.scanX = -99; } }];
  }
  mFlash(w) {
    const ring = (off) => (b, w2) => { Sfx.play('whoosh'); w2.shake(2); for (let i = 0; i < 10; i++) { const a = off + i * Math.PI / 5; fshot(b, 'plasma', b.x, b.y - 12, Math.cos(a) * 150, Math.sin(a) * 150, { w: 8, h: 8, ground: false, life: 3 }); } };
    return [{ d: 0.7 * this.k, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: () => Sfx.play('warn') }, { d: 0.15, pose: 'flash', on: ring(0) }, ...(this.rage ? [{ d: 0.5, pose: 'idle' }, { d: 0.15, pose: 'flash', on: ring(Math.PI / 10) }] : []), { d: 0.5, pose: 'idle' }];
  }
  mDrones(w) {
    return [{ d: 0.6, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }, { d: 0.2, pose: 'flash', on: (b, w2) => { Sfx.play('flap'); const n = w2.bosses.filter(x => x.add).length; for (let i = n; i < 2 + (this.rage ? 1 : 0); i++) w2.addBoss(new SecDrone(b.x + (i - 0.5) * 20, b.y - 10)); } }, { d: 0.7, pose: 'idle' }];
  }
  // one beam at a time, low and then high: jump, then stay down
  mLasers(w) {
    const row = (y0, h, delay) => (b) => b.zone({ x: HIVE_L, y: y0, w: HIVE_R - HIVE_L, h }, delay, 0.34);
    return [{ d: 0.4, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: (b) => { Sfx.play('warn'); row(GROUND_Y - 14, 12, 0.8)(b); row(GROUND_Y - 72, 12, 1.65)(b); row(GROUND_Y - 14, 12, 2.5)(b); if (this.rage) row(GROUND_Y - 72, 12, 3.3)(b); } }, { d: this.rage ? 3.7 : 2.9, pose: 'lasers', tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }];
  }
  mSeek(w) {
    return [{ d: 0.5, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }, { d: 0.3, pose: 'fire', on: (b) => { Sfx.play('flap'); fshot(b, 'plasma', b.x, b.y - 8, 0, 60, { home: 230, maxSp: 120, w: 10, h: 10, ground: false, life: 4.2 }); } }, ...(this.rage ? [{ d: 0.6, pose: 'idle' }, { d: 0.3, pose: 'fire', on: (b) => { fshot(b, 'plasma', b.x, b.y - 8, 0, 60, { home: 230, maxSp: 120, w: 10, h: 10, ground: false, life: 4.2 }); } }] : []), { d: 0.8, pose: 'idle' }];
  }
  mSweep(w) {
    return [{ d: 0.55 * this.k, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; b.ty = w.player.y - 14; } },
      { d: 0.7, pose: 'dash', bot: 'away', on: (b) => { b.vx = b.facing * 340; b.vy = (b.ty - b.y) * 2.4; Sfx.play('whoosh'); }, tick: (b) => { b.vy *= 0.95; }, hz: b => [hzBody(b, 6)] },
      { d: 0.6, pose: 'drift', tick: (b, dt) => { b.vx = approach(b.vx, 0, 500 * dt); b.vy = approach(b.vy, 0, 400 * dt); } }];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), p = this.pose, pl = this.look || { x: x + 30, y: y }, a = this.age;
    pixLine(ctx, x - 8, 30, x - 8, y - 14, 1, '#4a5660'); pixLine(ctx, x + 8, 30, x + 8, y - 14, 1, '#4a5660');
    ctx.save(); ctx.translate(x, y);
    px(ctx, -20, -18, 40, 6, this.col('#4a5660')); px(ctx, -20, -18, 40, 2, '#8a9aa6');                 // the housing
    disc(ctx, 0, -2, 18, 15, this.col('#2a343c')); disc(ctx, 0, -2, 16, 13, this.col('#c8d0d8')); disc(ctx, 0, -2, 12, 10, '#e8f0f4');
    const hot = p === 'tell' || p === 'flash' || p === 'scan' || p === 'lasers', ex = clamp(((this.lookX == null ? x + 20 : this.lookX) - x) * 0.12, -5, 5);
    disc(ctx, ex, -2, hot ? 8 : 6, hot ? 8 : 6, hot ? '#ff5a3a' : '#c0405a'); px(ctx, ex - 1, -4, 3, 6, '#0a0a0e'); px(ctx, ex - 4, -6, 2, 2, '#ffffff');
    for (let k = -2; k <= 2; k++) px(ctx, k * 6 - 1, 12, 3, 4, '#2a343c');
    if (p === 'scan') { ctx.globalAlpha = 0.5; px(ctx, -2, 12, 4, 6, '#ff9a8a'); ctx.globalAlpha = 1; }
    ctx.restore();
    if (p === 'scan') { const bx = Math.round(this.scanX); ctx.globalAlpha = 0.55; px(ctx, bx - 8, y + 12, 16, GROUND_Y - y - 12, '#ff5a3a'); ctx.globalAlpha = 1; px(ctx, bx - 2, y + 12, 4, GROUND_Y - y - 12, '#ffe8e0'); }
  }
  think(dt, w) { this.lookX = w.player.x; super.think(dt, w); }
}
FOUNDRY_BOSSES[6] = { id: 'overseer', name: 'The Overseer', sub: 'It counted every worker. Then it stopped counting', coins: 88, make: () => [new TheOverseer()] };

// ======================================================================= 8. THE HEAP
class BounceShot extends BossShot {                               // a gear that rolls and bounces off the walls
  update(dt, w) { if ((this.x < 44 && this.vx < 0) || (this.x > 436 && this.vx > 0)) this.vx = -this.vx; super.update(dt, w); }
}
class TheHeap extends FBoss {
  constructor() { super({ name: 'The Heap', hp: 108, w: 64, h: 58, speed: 30, keep: 70, eyes: true, moves: ['avalanche', 'slam', 'gear', 'lob', 'magnet', 'eject'] }); this.bits = []; const r = mulberry32(5); for (let i = 0; i < 26; i++) this.bits.push({ x: (r() - 0.5) * 56, y: -r() * 50, w: 6 + r() * 12, h: 5 + r() * 9, c: ['#6a6258', '#8a8070', '#4a4640', '#7a4a3a', '#5a6a72', '#9a8a60'][Math.floor(r() * 6)] }); }
  mAvalanche(w) {
    return [sTell(0.6, 'raise', { on: () => Sfx.play('warn') }), { d: 0.15, pose: 'raise', on: (b, w2) => { const dir = w2.player.x >= b.x ? 1 : -1, n = 10; for (let i = 0; i < n; i++) fshot(b, 'junk', b.x + dir * (24 + i * 40), 16 - i * 26, 0, 0, { grav: 700, w: 10, h: 10, life: 4 }); } }, { d: 1.6, pose: 'low' }];
  }
  mSlam(w) {
    const sl = (wd) => [sTell(wd * this.k, 'raise'), { d: 0.18, pose: 'slam', on: (b, w2) => { Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x - 40, -1, 8); dustWave(w2, b.x + 40, 1, 8); }, hz: b => [{ box: { x: b.x - 100, y: b.y - 30, w: 200, h: 30 }, dmg: 1, fromX: b.x }] }, sRest(0.25)];
    return this.rage ? [...sl(0.7), ...sl(0.4)] : [...sl(0.7), sRest(0.3)];
  }
  mGear(w) {
    const g = { d: 0.4, pose: 'raise', on: (b) => { Sfx.play('whoosh'); b.shots.push(new BounceShot({ kind: 'gear', x: b.x + b.facing * 36, y: GROUND_Y - 15, vx: b.facing * 150, vy: 0, w: 30, h: 30, ground: false, life: 6.5 })); } };
    return [sTell(0.5, 'raise'), g, ...(this.rage ? [{ d: 1.2, pose: 'low' }, g] : []), { d: 0.7, pose: 'low' }];
  }
  mLob(w) {
    return [sTell(0.5, 'raise'), { d: 0.12, pose: 'toss', on: (b, w2) => { Sfx.play('flap'); const p = w2.player; for (let i = 0; i < 4; i++) { const tx = clamp(p.x + (i - 1.5) * 38, 30, 450), tt = 0.95 + i * 0.1; fshot(b, 'junk', b.x, b.y - 54, (tx - b.x) / tt, -300, { grav: 640, w: 10, h: 10, life: 3 }); } } }, sRest(0.8, 'low')];
  }
  // the whole pile is magnetic: it drags the knight in, then slams
  mMagnet(w) {
    return [sTell(0.6, 'raise', { on: () => Sfx.play('warn') }),
      { d: 1.5, pose: 'magnet', tick: (b, dt, w2) => { const p = w2.player; if (!p.dead && Math.abs(p.x - b.x) > 28) p.x += Math.sign(b.x - p.x) * 78 * dt; b.vx = 0; } },
      { d: 0.2, pose: 'slam', on: (b, w2) => { Sfx.play('slam'); w2.shake(5); dustWave(w2, b.x, 0, 14); }, hz: b => [{ box: { x: b.x - 84, y: b.y - 32, w: 168, h: 32 }, dmg: 1, fromX: b.x }] }, sRest(0.6)];
  }
  mEject(w) {
    return [sTell(0.55, 'raise'), { d: 0.12, pose: 'toss', on: (b) => { Sfx.play('roar'); const n = this.rage ? 12 : 9; for (let i = 0; i < n; i++) { const a = -Math.PI + (i + 0.5) * Math.PI / n; fshot(b, 'junk', b.x, b.y - 40, Math.cos(a) * 170, Math.sin(a) * 250 - 40, { grav: 500, w: 10, h: 10, life: 3 }); } } }, sRest(0.9, 'low')];
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = Math.round(this.y), p = this.pose, a = this.age, raise = p === 'raise' || p === 'toss' ? 1 : 0, wob = Math.round(Math.sin(a * 3) * 1);
    ctx.save(); ctx.translate(x, y);
    for (const b of this.bits) { px(ctx, Math.round(b.x - b.w / 2) + (b.y < -30 ? wob : 0), Math.round(b.y), Math.round(b.w), Math.round(b.h), this.col(b.c)); px(ctx, Math.round(b.x - b.w / 2), Math.round(b.y), Math.round(b.w), 1, 'rgba(255,255,255,0.18)'); }
    px(ctx, -30, -14, 60, 14, this.col('#4a4640'));
    disc(ctx, 0, -28, 11, 11, '#14202a'); disc(ctx, 0, -28, 8, 8, p === 'raise' || p === 'magnet' || p === 'slam' ? '#ffffff' : '#ff5a3a'); px(ctx, -1, -30, 3, 5, '#0a0a0e');
    const ay = raise ? -66 : p === 'slam' ? -8 : -30;                                                                         // the two arms
    for (const sg of [-1, 1]) { pixLine(ctx, sg * 28, -34, sg * 40, ay, 4, this.col('#5a6a72')); px(ctx, sg * 40 - 5, ay - 4, 10, 9, this.col('#8a96a0')); px(ctx, sg * 40 - 5, ay - 4, 10, 2, '#c8d0d8'); }
    if (p === 'magnet') for (let k = 0; k < 4; k++) { ctx.globalAlpha = 0.4; pixLine(ctx, -50 - k * 20, -20 - k * 4, -20, -30, 1, '#7fe8ff'); pixLine(ctx, 50 + k * 20, -20 - k * 4, 20, -30, 1, '#7fe8ff'); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}
FOUNDRY_BOSSES[7] = { id: 'heap', name: 'The Heap', sub: 'Every broken machine ended up here', coins: 91, make: () => [new TheHeap()] };
