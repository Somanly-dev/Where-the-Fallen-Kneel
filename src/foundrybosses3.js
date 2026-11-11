'use strict';

// The Foundry: boss 9 (Old Sprocket, two phases) and boss 10 (the arena itself, two phases).

// a timeline inside one segment: events = [[seconds, fn(b, w)], ...]
function timeline(events, total) {
  return { d: total, pose: 'idle', on: () => events.forEach(e => { e.done = false; }), tick: (b, dt, w) => { for (const e of events) if (!e.done && b.sT >= e[0]) { e.done = true; e[1](b, w); } } };
}

// ======================================================================= 9. OLD SPROCKET
class OldSprocket extends FBoss {
  constructor() { super({ name: 'Old Sprocket', hp: 89, w: 24, h: 42, speed: 70, keep: 46, eyes: true, moves: ['wrench', 'rivets', 'toolbox', 'jump', 'echo', 'combo'] }); this.phase = 1; this.transforming = false; this.talkCd = 3; }
  get rage() { return this.phase === 2; }
  get k() { return 1.0; }
  restTime() { return (0.5 + Math.random() * 0.45) * (this.phase === 2 ? 1.15 : 1); }
  barInfo() { return { name: this.phase === 2 ? 'Old Sprocket, unbound' : 'Old Sprocket', hp: this.hp, max: this.maxHp }; }
  say(w, text, secs) { w.caption_(text, secs || 2.4); }
  engage() { super.engage(); this.moves = ['wrench', 'rivets', 'toolbox', 'jump', 'echo', 'combo']; }
  think(dt, w) {
    if (!this.seq && !this.transforming && !w.player.dead) { this.talkCd -= dt; if (this.talkCd <= 0 && this.cool < 0.2 && w.captionT <= 0) { this.talkCd = 9 + Math.random() * 5; const L = this.phase === 1 ? ['Hold still. I need to calibrate you.', 'Tighten. Tighten. Tighten.', 'The work... the work must go on.', 'You are out of tolerance.'] : ['I can hear them. All of them.', 'Get out of my head!', 'Run. Please. Run.', 'The hum will not stop.']; this.say(w, L[Math.floor(Math.random() * L.length)]); } }
    this.lookT = w.player.x; super.think(dt, w);
  }
  mWrench(w) {
    const sw = (wd, y0, y1) => [sTell(wd * this.k, 'up'), { d: 0.14, pose: 'down', on: (b) => { b.vx = b.facing * 130; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 62, y0, y1)] }, sRest(0.08)];
    return [...sw(0.5, -70, 0), ...sw(0.3, -34, 0), sRest(this.phase === 2 ? 0.55 : 0.35)];
  }
  mCombo(w) {
    const st = (wd) => [sTell(wd * this.k, 'up'), { d: 0.12, pose: 'down', on: (b) => { b.vx = b.facing * 200; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 54, -60, 0)] }];
    return [...st(0.4), ...st(0.22), ...st(0.22), sRest(0.5)];
  }
  mRivets(w) {
    const v = () => [sTell(0.4 * this.k, 'aim'), { d: 0.14, pose: 'fire', on: (b, w2) => dartFan(b, w2, this.phase === 2 ? 4 : 3, 0.16, 230, 'rivet') }, sRest(0.2, 'aim')];
    return [...v(), ...v()];
  }
  // a toolbox lobbed at the knight bursts into bolts when it lands
  mToolbox(w) {
    return [sTell(0.45, 'up'), { d: 0.12, pose: 'down', on: (b, w2) => { Sfx.play('flap'); const tx = clamp(w2.player.x, 40, 440); const s = fshot(b, 'junk', b.x, b.y - 40, (tx - b.x) / 0.9, -330, { grav: 700, w: 14, h: 12, life: 3 }); s.onLand = (sh) => { Sfx.play('slam'); const n = 6; for (let i = 0; i < n; i++) fshot(b, 'rivet', sh.x, GROUND_Y - 8, (i - (n - 1) / 2) * 60, -230 - (i % 2) * 70, { grav: 650, life: 2.4 }); }; } }, sRest(0.8)];
  }
  mJump(w) {
    return [sTell(0.4 * this.k, 'low', { on: (b, w2) => { b.tx = clamp(w2.player.x, b.bl, b.br); } }),
      { d: 1.6, pose: 'air', bot: 'away', min: 0.3, until: (b) => !b.airborne, hz: b => [hzBody(b, 2)], on: (b) => { b.vy = -540; b.vx = clamp((b.tx - b.x) / 0.8, -280, 280); Sfx.play('whoosh'); } },
      { d: 0.2, pose: 'down', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(4); dustWave(w2, b.x, 0, 10); }, hz: b => [{ box: { x: b.x - 44, y: b.y - 22, w: 88, h: 22 }, dmg: 1, fromX: b.x }] }, sRest(0.45)];
  }
  // he calls up his old work: the machines that came before him
  mEcho(w) {
    const echoes = [
      ['WIRE!', (b, w2) => { const p = w2.player; [0, 1, 2].forEach(i => b.zone({ x: clamp(p.x + (i - 1) * 84, 26, 454) - 32, y: GROUND_Y - 10, w: 64, h: 10 }, 0.6 + i * 0.33, 0.4)); }],
      ['WELDER!', (b, w2) => { const L = 230, bx = b.facing > 0 ? b.x : b.x - L; b.zone({ x: bx, y: GROUND_Y - 16, w: L, h: 8 }, 0.7, 0.7); }],
      ['PRESS!', (b, w2) => { const p = w2.player; b.zone({ x: p.x - 30, y: 36, w: 60, h: p.y + 2 - 36 }, 0.7, 0.3); }],
      ['RIPPER!', (b, w2) => { b.shots.push(new SawShot({ kind: 'saw', x: b.x + b.facing * 12, y: GROUND_Y - 14, vx: b.facing * 300, vy: 0, w: 14, h: 14, ground: false, life: 2.6 })); }],
      ['SPIDER!', (b, w2) => { const p = w2.player; [0, 1, 2].forEach(i => b.zone({ x: clamp(p.x + (i - 1) * 60, 26, 454) - 8, y: 36, w: 16, h: GROUND_Y - 36 }, 0.6 + i * 0.3, 0.3)); }],
    ];
    const pick = () => echoes[Math.floor(Math.random() * echoes.length)];
    const one = () => { const e = pick(); return [{ d: 0.9, pose: 'call', tell: true, face: true, tick: (b) => { b.vx = 0; }, on: (b, w2) => { b.say(w2, e[0], 1.2); Sfx.play('warn'); e[1](b, w2); } }, { d: 1.0, pose: 'call' }]; };
    return [...one(), sRest(0.4)];
  }
  // phase 2: the machines' arms come out of his back and strike from above
  mArms(w) {
    return [sTell(0.6, 'call', { on: (b, w2) => { Sfx.play('warn'); const p = w2.player; [0, 1, 2].forEach(i => b.zone({ x: clamp(p.x + (i % 2 ? 1 : -1) * (40 + i * 26), 26, 454) - 8, y: 60, w: 16, h: GROUND_Y - 60 }, 0.8 + i * 0.4, 0.25)); } }), { d: 2.0, pose: 'call' }, sRest(0.4)];
  }
  mRush(w) {
    return [sTell(0.6, 'low'), { d: 1.4, pose: 'dash', bot: 'away', min: 0.3, on: (b) => { b.vx = b.facing * 290; Sfx.play('whoosh'); }, tick: (b) => { b.vx = Math.sign(b.vx || b.facing) * 290; }, until: (b) => (b.vx > 0 && b.x >= b.br - 2) || (b.vx < 0 && b.x <= b.bl + 2), hz: b => [hzBody(b, 6)] }, sRest(0.6)];
  }
  // he blinks out and comes back behind the knight
  mGlitch(w) {
    return [{ d: 0.75, pose: 'call', tell: true, tick: (b) => { b.vx = 0; }, on: (b) => { Sfx.play('warn'); } },
      { d: 0.2, pose: 'gone', on: (b, w2) => { b.intangible = true; b.hidden = true; } },
      { d: 0.7, pose: 'up', tell: true, on: (b, w2) => { const p = w2.player; b.hidden = false; b.intangible = false; b.x = clamp(p.x - p.facing * 95, b.bl, b.br); b.facing = p.x >= b.x ? 1 : -1; Sfx.play('whoosh'); } },
      { d: 0.16, pose: 'down', on: (b) => { b.vx = b.facing * 160; Sfx.play('slash'); }, hz: b => [hzFront(b, 2, 70, -70, 0)] }, sRest(0.5)];
  }
  die(world) {
    if (this.phase === 1) { this.beginPhase2(world); return; }
    this.say(world, 'The hum... it stopped. Thank you.', 3.2);
    this.hidden = false; this.intangible = false;
    super.die(world);
  }
  beginPhase2(w) {
    this.phase = 2; this.transforming = true; this.intangible = true; this.soulsGiven = 0; this.shots = []; this.timed = []; this.marks = []; this.vx = 0;
    this.moves = ['wrench', 'rivets', 'toolbox', 'echo', 'combo', 'arms', 'rush', 'glitch', 'jump'];
    w.hitstop = 0.25; w.shake(7); Sfx.play('roar'); Music.fade(); w.cheer(1);
    for (let i = 0; i < 20; i++) w.spawn({ x: this.x + (Math.random() - 0.5) * 30, y: this.y - Math.random() * 40, vx: (Math.random() - 0.5) * 200, vy: -60 - Math.random() * 120, life: 0.8, color: i % 2 ? '#7fe8ff' : '#ffb347', size: 3, grav: 320 });
    this.play('transform', [
      { d: 2.8, pose: 'break', tick: (b, dt) => { b.vx = 0; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * dt / 2.6); if (Math.random() < 0.4) w.spawn({ x: b.x + (Math.random() - 0.5) * 30, y: b.y - Math.random() * 40, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 80, life: 0.5, color: '#7fe8ff', size: 2, grav: 200 }); },
        on: (b, w2) => { b.say(w2, 'No... not again. They are in my head!', 2.6); } },
      { d: 0.2, pose: 'rise', on: (b, w2) => { b.hp = b.maxHp; b.transforming = false; b.intangible = false; Music.play('foundrySprocket2'); b.say(w2, 'UNBOUND', 1.8); w2.shake(5); Sfx.play('roar'); } }], w);
  }
  draw(ctx, t) {
    if (this.hidden) return;
    const x = Math.round(this.x), y = Math.round(this.y), f = this.facing, p = this.pose, a = this.age, ph2 = this.phase === 2, run = Math.abs(this.vx) > 10 ? Math.floor(a * 14) % 2 : 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
    const hunch = ph2 ? 3 : 0, up = p === 'up' || p === 'call';
    if (ph2) {                                                          // the machines' arms, folded out of his back
      for (let i = 0; i < 4; i++) { const sg = i % 2 ? 1 : -1, reach = p === 'call' ? 1 : 0.35, ex = -8 + sg * (10 + i * 5) * (0.6 + reach * 0.7), ey = -46 - 14 * reach + (i > 1 ? 6 : 0) + Math.sin(a * 6 + i) * 2; pixLine(ctx, -6, -30, -10 + sg * 8, -44 + Math.sin(a * 4 + i) * 2, 2, this.col('#4a5660')); pixLine(ctx, -10 + sg * 8, -44, ex, ey + (p === 'call' ? 30 * reach : 0), 2, this.col('#6a7a86')); px(ctx, ex - 1, ey - 1 + (p === 'call' ? 30 * reach : 0), 3, 3, '#c8d0d8'); }
    }
    px(ctx, -7, -16, 6, 16 - run, this.col('#2a3a5a')); px(ctx, 2, -16, 6, 16 - (1 - run), this.col('#2a3a5a')); px(ctx, -8, -2, 8, 2, '#1a1612'); px(ctx, 2, -2, 8, 2, '#1a1612');          // legs and boots
    px(ctx, -8, -32 + hunch, 17, 18, this.col('#3a5a8a')); px(ctx, -8, -32 + hunch, 17, 2, '#6a8ab8'); px(ctx, -8, -22 + hunch, 17, 2, '#8a6a30'); px(ctx, -1, -30 + hunch, 3, 3, '#e0a830');       // coveralls and belt
    px(ctx, -5, -42 + hunch, 11, 10, this.col('#c8a888')); px(ctx, -6, -44 + hunch, 13, 4, '#6a4a2a'); px(ctx, -3, -41 + hunch, 9, 3, '#8a96a0');                                                    // face, cap, goggles
    const eye = ph2 ? '#ffffff' : '#7fe8ff'; px(ctx, -2, -38 + hunch, 2, 2, eye); px(ctx, 3, -38 + hunch, 2, 2, eye);
    pixLine(ctx, 6, -22 + hunch, 12, -24 + hunch, 2, '#7fe8ff'); if (Math.sin(a * 20) > 0) px(ctx, 11, -26 + hunch, 2, 2, '#e8fcff');       // the cable plugged in behind his ear
    const ax = 8, ay = -28 + hunch;                                                                                   // the arm and wrench
    if (p === 'aim' || p === 'fire') { pixLine(ctx, ax, ay, ax + 14, ay + 2, 3, this.col('#3a5a8a')); px(ctx, ax + 12, ay - 1, 14, 5, '#4a5660'); if (p === 'fire') px(ctx, ax + 26, ay, 5, 4, '#ffb347'); }
    else if (up) { pixLine(ctx, ax, ay, ax + 6, ay - 22, 3, this.col('#3a5a8a')); pixLine(ctx, ax + 6, ay - 22, ax + 8, ay - 34, 3, '#9aa4ae'); px(ctx, ax + 4, ay - 38, 9, 5, '#c8d0d8'); }
    else if (p === 'down') { pixLine(ctx, ax, ay, ax + 24, ay + 6, 3, this.col('#3a5a8a')); px(ctx, ax + 22, ay + 2, 12, 5, '#c8d0d8'); }
    else { pixLine(ctx, ax, ay, ax + 6, ay + 12, 3, this.col('#3a5a8a')); pixLine(ctx, ax + 6, ay + 12, ax + 8, ay + 20, 3, '#9aa4ae'); px(ctx, ax + 5, ay + 20, 8, 4, '#c8d0d8'); }
    ctx.restore();
  }
}
FOUNDRY_BOSSES[8] = { id: 'sprocket', name: 'Old Sprocket', sub: 'He built the Foundry. Then it built him back', coins: 95, make: () => [new OldSprocket()] };

// ======================================================================= 10. THE FOUNDRY ITSELF
// The arena is the boss. It cannot talk. The pistons, the hover pads, the coil and the lights are all of it; the knight hits the core
// at the foot of the coil, which opens only after a chain of attacks.
class FoundryCore extends FBoss {
  constructor() {
    super({ name: 'The Foundry', hp: 250, w: 30, h: 36, speed: 0, eyes: false, moves: [] });
    this.x = COIL_X - 2; this.y = GROUND_Y; this.phase = 1; this.open = false; this.openT = 0; this.q = []; this.transforming = false; this.cool = 1.4; this.armed = false;
    this.p1 = ['punch', 'wave', 'pad', 'arcs', 'sky', 'chain', 'tiles', 'cables', 'burst', 'relay', 'fan', 'strafe', 'bounce', 'gearstorm', 'electrify'];
    this.p2 = ['punch', 'wave', 'pad', 'arcs', 'sky', 'chain', 'tiles', 'cables', 'burst', 'triple', 'rain', 'sweep', 'collapse', 'blackout', 'nova', 'twin', 'cascade', 'relay', 'fan', 'strafe', 'bounce', 'gearstorm', 'electrify', 'padslam', 'pull', 'presses', 'spiral'];
    this.intangible = true;
  }
  get k() { return this.phase === 2 ? 0.82 : 1.0; }
  barInfo() { return { name: this.phase === 2 ? 'The Foundry, overloaded' : 'The Foundry', hp: this.hp, max: this.maxHp }; }
  physics() {}
  hitbox() { if (this.dead || this.dying || this.intangible) return { x: -999, y: -999, w: 1, h: 1 }; return { x: this.x - 14, y: GROUND_Y - 38, w: 28, h: 38 }; }
  // ---- control of the pistons and pads
  rise(w, pl, y, sp) { pl.ctl = (dt, p) => { p.y = approach(p.y, y, sp * dt); }; }
  jitter(w, pl) { const y0 = pl.y, x0 = pl.x; pl.ctl = (dt, p) => { p.y = y0 + Math.sin(w.t * 90) * 1.6; if (p.pad) p.x = x0 + Math.sin(w.t * 70) * 1.5; }; }
  padHz(w) { return w.pads.filter(pl => pl.flying).map(pl => ({ box: { x: pl.x + 2, y: pl.y - 3, w: pl.w - 4, h: 14 }, dmg: 1, fromX: pl.x + 26 })); }
  release(w, pl) {
    const i = w.pads.indexOf(pl); pl.flying = false;
    pl.ctl = (dt, p) => {
      let ty, tx = p.x;
      if (p.piston) ty = p.lo - (p.lo - p.hi) * (0.5 + 0.5 * Math.sin(w.t * Math.PI * 2 / p.per + p.ph));
      else { ty = p.by + Math.sin(w.t * Math.PI * 2 / p.per + i) * 3; tx = w.padBase[i] + Math.sin(w.t * 0.8 + i * 2) * 4; }
      p.y = approach(p.y, ty, (p.piston ? 220 : 160) * dt); p.x = approach(p.x, tx, 160 * dt);
      if (Math.abs(p.y - ty) < 0.8 && Math.abs(p.x - tx) < 0.8) p.ctl = null;
    };
  }
  nearest(w) { let bi = 0, bd = 1e9; w.pistons.forEach((pl, i) => { const d = Math.abs(w.player.x - pl.c); if (d < bd) { bd = d; bi = i; } }); return bi; }
  beamZone(x0, y0, x1, y1, warn, dur) { const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 9)); for (let i = 0; i <= n; i++) this.zone({ x: x0 + (x1 - x0) * i / n - 5, y: y0 + (y1 - y0) * i / n - 5, w: 10, h: 10 }, warn, dur); }
  wave(b, w, pl) { Sfx.play('slam'); w.shake(5); dustWave(w, pl.c, 0, 10); for (const dir of [-1, 1]) fshot(b, 'shock', pl.c + dir * 26, GROUND_Y - 10, dir * 175, 0, { w: 22, h: 30, ground: false, life: 3.4 }); }

  // ---- the attacks
  mPunch(w) {
    const pl = w.pistons[this.nearest(w)], top = 84;
    return [{ d: 0.85, pose: 'charge', tell: true, on: (b, w2) => { Sfx.play('warn'); pl.heat = 1.4; b.zone({ x: pl.x - 2, y: top, w: pl.w + 4, h: 106 }, 0.8, 0.4); b.jitter(w2, pl); } },
      { d: 0.55, pose: 'charge', on: (b, w2) => { Sfx.play('slam'); w2.shake(5); b.rise(w2, pl, top, 1100); } }, { d: 0.9, pose: 'charge', on: (b, w2) => b.release(w2, pl) }];
  }
  mWave(w) {
    const pl = w.pistons[this.nearest(w)];
    return [{ d: 0.75, pose: 'charge', tell: true, on: (b, w2) => { Sfx.play('warn'); pl.heat = 1; b.rise(w2, pl, 104, 260); } },
      { d: 0.2, pose: 'charge', on: (b, w2) => { b.rise(w2, pl, 190, 1500); } }, { d: 0.25, pose: 'charge', on: (b, w2) => b.wave(b, w2, pl) }, { d: 0.9, pose: 'charge', on: (b, w2) => b.release(w2, pl) }];
  }
  mTriple(w) {
    const ev = []; const order = Math.random() < 0.5 ? [0, 1, 2] : [2, 1, 0];
    order.forEach((i, k) => { ev.push([k * 0.75, (b, w2) => { Sfx.play('warn'); w2.pistons[i].heat = 0.7; b.rise(w2, w2.pistons[i], 104, 300); }], [k * 0.75 + 0.55, (b, w2) => { b.rise(w2, w2.pistons[i], 190, 1500); }], [k * 0.75 + 0.62, (b, w2) => b.wave(b, w2, w2.pistons[i])]); });
    ev.push([2.7, (b, w2) => w2.pistons.forEach(pl => b.release(w2, pl))]);
    return [timeline(ev, 3.4)];
  }
  mCollapse(w) {
    const ev = [], seq = [0, 1, 2, 1, 0, 2];
    ev.push([0, (b, w2) => { Sfx.play('warn'); w2.pistons.forEach(pl => { pl.heat = 1; b.rise(w2, pl, 100, 240); }); }]);
    seq.forEach((i, k) => ev.push([0.8 + k * 0.42, (b, w2) => { const pl = w2.pistons[i]; b.rise(w2, pl, 190, 1500); b.wave(b, w2, pl); }], [0.8 + k * 0.42 + 0.3, (b, w2) => { b.rise(w2, w2.pistons[i], 100, 600); }]));
    ev.push([3.9, (b, w2) => w2.pistons.forEach(pl => b.release(w2, pl))]);
    return [timeline(ev, 4.6)];
  }
  mCascade(w) {
    const ev = [], tops = 84;
    [0, 1, 2].forEach(i => ev.push([i * 0.5, (b, w2) => { const pl = w2.pistons[i]; Sfx.play('warn'); pl.heat = 1; b.zone({ x: pl.x - 2, y: tops, w: pl.w + 4, h: 106 }, 0.75, 0.35); b.jitter(w2, pl); }], [i * 0.5 + 0.75, (b, w2) => { Sfx.play('slam'); w2.shake(4); b.rise(w2, w2.pistons[i], tops, 1100); }], [i * 0.5 + 1.4, (b, w2) => b.release(w2, w2.pistons[i])]));
    return [timeline(ev, 3.2)];
  }
  // a hover pad rips loose and flies at the knight
  mPad(w) {
    const p = w.player, j = p.y < 150 ? 1 : Math.abs(p.x - w.pads[0].x) < Math.abs(p.x - w.pads[1].x) ? 0 : 1, pl = w.pads[j];
    return [{ d: 0.9, pose: 'charge', tell: true, on: (b, w2) => { Sfx.play('warn'); pl.heat = 1.6; b.jitter(w2, pl); }, tick: (b) => { b.tx = w.player.x - 26; b.ty = w.player.y - 22; } },
      { d: 0.75, pose: 'charge', bot: 'away', on: (b, w2) => { Sfx.play('whoosh'); pl.flying = true; const dx = b.tx - pl.x, dy = b.ty - pl.y, d = Math.hypot(dx, dy) || 1, vx = dx / d * 400, vy = dy / d * 400; pl.ctl = (dt, q) => { q.x = clamp(q.x + vx * dt, 20, 410); q.y = clamp(q.y + vy * dt, 52, 200); }; },
        hz: b => b.padHz(w) },
      { d: 1.2, pose: 'charge', on: (b, w2) => b.release(w2, pl) }];
  }
  mTwin(w) {
    const fly = (j, d0) => [d0, (b, w2) => { const pl = w2.pads[j], p = w2.player, dx = p.x - 26 - pl.x, dy = p.y - 22 - pl.y, d = Math.hypot(dx, dy) || 1, vx = dx / d * 380, vy = dy / d * 380; Sfx.play('whoosh'); pl.flying = true; pl.ctl = (dt, q) => { q.x = clamp(q.x + vx * dt, 20, 410); q.y = clamp(q.y + vy * dt, 52, 200); }; }];
    const ev = [[0, (b, w2) => { Sfx.play('warn'); w2.pads.forEach(pl => { pl.heat = 2; b.jitter(w2, pl); }); }], fly(0, 0.9), fly(1, 1.7), [2.5, (b, w2) => w2.pads.forEach(pl => b.release(w2, pl))]];
    return [Object.assign(timeline(ev, 3.8), { bot: 'away', hz: b => b.padHz(w) })];
  }
  mArcs(w) {
    for (let i = 0; i < 6; i++) this.zone({ x: 424 - i * 72, y: GROUND_Y - 12, w: 72, h: 12 }, 0.6 + i * 0.24, 0.3);
    return [{ d: 2.9, pose: 'charge', tell: true, on: () => Sfx.play('warn') }];
  }
  mSky(w) {
    const volley = (delay) => (b, w2) => { Sfx.play('warn'); const p = w2.player; [-1, 1, -2, 2].forEach((o, i) => b.zone({ x: clamp(p.x + o * 46 + (i - 1.5) * 8, 30, 450) - 8, y: 30, w: 16, h: GROUND_Y - 30 }, delay + i * 0.1, 0.22)); b.zone({ x: clamp(p.x, 30, 450) - 8, y: 30, w: 16, h: GROUND_Y - 30 }, delay + 0.45, 0.22); };
    return [{ d: 1.5, pose: 'charge', tell: true, on: volley(0.75) }, { d: 1.7, pose: 'charge', tell: true, on: volley(0.7) }];
  }
  mChain(w) {
    const nodes = [[COIL_X - 14, 40], ...[w.pads[1], w.pads[0]].map(pl => [pl.x + pl.w / 2, pl.y]), ...[w.pistons[2], w.pistons[1], w.pistons[0]].map(pl => [pl.c, pl.y])];
    for (let i = 0; i < nodes.length - 1; i++) this.beamZone(nodes[i][0], nodes[i][1], nodes[i + 1][0], nodes[i + 1][1], 0.55 + i * 0.28, 0.32);
    return [{ d: 2.4, pose: 'charge', tell: true, on: () => Sfx.play('warn') }];
  }
  mTiles(w) {
    const ids = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5).slice(0, 3);
    ids.forEach(i => this.zone({ x: 24 + i * 70, y: GROUND_Y - 8, w: 70, h: 8 }, 0.95, 1.3));
    return [{ d: 2.7, pose: 'charge', tell: true, on: () => Sfx.play('warn') }];
  }
  mCables(w) {
    const base = [90, 220, 350].sort(() => Math.random() - 0.5);
    return [{ d: 0.8, pose: 'cables', tell: true, on: (b) => { Sfx.play('warn'); b.cab = base; b.cabT = 0; } },
      { d: 2.6, pose: 'cables', bot: 'away', tick: (b, dt) => { b.cabT += dt; }, hz: b => b.cab.map((c, k) => ({ box: { x: c + Math.sin(b.cabT * 3 + k * 2) * 56 - 4, y: 36, w: 8, h: 128 }, dmg: 1, fromX: c })) }, { d: 0.3, pose: 'charge', on: (b) => { b.cab = null; } }];
  }
  mBurst(w) {
    const v = () => [{ d: 0.5 * this.k, pose: 'charge', tell: true, tick: () => {} }, { d: 0.14, pose: 'charge', on: (b, w2) => dartFan(b, w2, this.phase === 2 ? 7 : 5, 0.22, 190, 'plasma') }];
    return [...v(), ...v(), { d: 0.3, pose: 'charge' }];
  }
  mRain(w) {
    const ev = [[0, (b, w2) => { Sfx.play('warn'); w2.pads.forEach((pl, i) => { pl.heat = 2.2; b.rise(w2, pl, 62, 260); }); }]];
    for (let k = 0; k < 14; k++) ev.push([0.9 + k * 0.16, (b, w2) => { w2.pads.forEach((pl, i) => { pl.x = clamp(w2.padBase[i] + Math.sin((0.9 + k * 0.16) * 2.4 + i * 2) * 80, 30, 420); fshot(b, 'bolt', pl.x + pl.w / 2, pl.y + 8, 0, 120, { grav: 500, w: 4, h: 12, life: 2.6 }); }); }]);
    ev.push([3.4, (b, w2) => w2.pads.forEach(pl => b.release(w2, pl))]);
    return [timeline(ev, 4.4)];
  }
  // a beam anchored at the core sweeps down from straight up to along the floor, then back
  mSweep(w) {
    const px0 = this.x, py0 = GROUND_Y - 22, L = 340;
    return [{ d: 0.9, pose: 'spinwarn', tell: true, on: () => Sfx.play('warn') },
      { d: 4.2, pose: 'spin', bot: 'away', on: (b) => { b.ang = Math.PI / 2; Sfx.play('whoosh'); },
        tick: (b, dt) => { const T = b.sT; b.ang = T < 2.0 ? Math.PI / 2 + (T / 2.0) * (Math.PI / 2) : (T < 2.2 ? Math.PI : Math.PI - ((T - 2.2) / 2.0) * (Math.PI / 2)); },
        hz: b => { const a = b.ang, out = []; for (let r = 24; r <= L; r += 14) out.push({ box: { x: px0 + Math.cos(a) * r - 6, y: py0 - Math.sin(a) * r - 6, w: 12, h: 12 }, dmg: 1, fromX: px0 }); return out; } },
      { d: 0.2, pose: 'charge', on: (b) => { b.ang = null; } }];
  }
  mBlackout(w) {
    const ev = [[0, (b, w2) => { Sfx.play('warn'); w2.blackout = true; }]];
    for (let k = 0; k < 8; k++) ev.push([0.6 + k * 0.42, (b, w2) => { w2.blackout = k % 3 === 2 ? false : true; const p = w2.player; b.zone({ x: clamp(p.x + (k % 2 ? 36 : -36) * (1 + (k % 3) * 0.5), 30, 450) - 20, y: GROUND_Y - 10, w: 40, h: 10 }, 0.4, 0.3); if (k % 2) b.zone({ x: clamp(p.x, 30, 450) - 7, y: 36, w: 14, h: GROUND_Y - 36 }, 0.45, 0.22); }]);
    ev.push([4.4, (b, w2) => { w2.blackout = false; }]);
    return [timeline(ev, 4.8)];
  }
  mNova(w) {
    const cx = this.x - 6, cy = GROUND_Y - 24;
    return [{ d: 0.8, pose: 'charge', tell: true, on: () => Sfx.play('warn') }, { d: 0.14, pose: 'charge', on: (b, w2) => { Sfx.play('roar'); w2.shake(5); const n = 16, gap = Math.floor(Math.random() * n); for (let i = 0; i < n; i++) { if (i === gap || i === (gap + 1) % n) continue; const a = Math.PI / 2 + (i + 0.5) * Math.PI / n; fshot(b, 'plasma', cx, cy, Math.cos(a) * 125, -Math.sin(a) * 125, { w: 10, h: 10, ground: false, life: 4 }); } } }, { d: 1.2, pose: 'charge' }];
  }

  // ---- the loop: a chain of attacks, then the core opens
  think(dt, w) {
    const p = w.player; this.animT += dt;
    if (p.dead) return;
    if (this.seq) {
      this.stepSeq(dt, w);
      return;
    }
    if (this.openT > 0) { this.openT -= dt; this.open = true; this.intangible = false; this.guardT -= dt; if (this.guardT <= 0) { this.guardT = this.phase === 2 ? 1.2 : 1.6; this.guard(w); } if (this.openT <= 0) { this.open = false; this.intangible = true; this.cool = 0.4; Sfx.play('gate'); } return; }
    this.open = false; this.intangible = !!this.transforming || true;
    this.cool -= dt;
    if (this.cool <= 0) {
      const list = this.phase === 2 ? this.p2 : this.p1, n = this.phase === 2 ? 3 : 2; this.q = [];
      let last = this.lastPick;
      for (let i = 0; i < n; i++) { const o = list.filter(m => m !== last); last = o[Math.floor(Math.random() * o.length)]; this.q.push(last); }
      this.lastPick = last; this.next(w);
    }
  }
  next(w) { const m = this.q.shift(); this.cur = m; this.play(m, this['m' + m[0].toUpperCase() + m.slice(1)](w), w); }
  moveDone(w) {
    if (this.transforming) return;
    if (this.q.length) { this.cool = 0.15; this.next(w); return; }
    this.openT = this.phase === 2 ? 4.6 : 5.4; this.guardT = 1.0; this.open = true; this.intangible = false; Sfx.play('gate'); this.cool = 0.5;
  }
  restTime() { return 0.35; }
  hit(dmg, dirX, w) { if (!this.open || this.intangible) return; super.hit(dmg, dirX, w); }
  die(w) {
    if (this.phase === 1) { this.beginPhase2(w); return; }
    w.blackout = false; w.frozen = true;
    for (const pl of [...w.pistons, ...w.pads]) pl.ctl = null;
    this.open = true; this.q = []; this.seq = null; this.marks = []; this.timed = [];
    for (let i = 0; i < 30; i++) w.spawn({ x: this.x + (Math.random() - 0.5) * 40, y: GROUND_Y - Math.random() * 60, vx: (Math.random() - 0.5) * 240, vy: -60 - Math.random() * 160, life: 1, color: i % 2 ? '#7fe8ff' : '#ffb347', size: 3, grav: 320 });
    super.die(w);
  }
  beginPhase2(w) {
    this.phase = 2; this.transforming = true; this.intangible = true; this.open = false; this.openT = 0; this.q = []; this.soulsGiven = 0; this.shots = []; this.timed = []; this.marks = [];
    w.hitstop = 0.3; w.shake(8); Sfx.play('roar'); Music.fade(); w.cheer(1);
    for (const pl of [...w.pistons, ...w.pads]) pl.ctl = null;
    const ev = [[0, (b, w2) => { w2.pistons.concat(w2.pads).forEach(pl => { pl.heat = 3; b.jitter(w2, pl); }); }]];
    for (let k = 0; k < 10; k++) ev.push([0.3 + k * 0.25, (b, w2) => { w2.shake(4); w2.blackout = k % 2 === 0; Sfx.play(k % 3 ? 'slam' : 'roar'); for (let i = 0; i < 8; i++) w2.spawn({ x: Math.random() * W, y: 40 + Math.random() * 160, vx: (Math.random() - 0.5) * 100, vy: -Math.random() * 90, life: 0.5, color: '#7fe8ff', size: 2, grav: 200 }); }]);
    ev.push([2.9, (b, w2) => { w2.blackout = false; w2.pistons.concat(w2.pads).forEach(pl => b.release(w2, pl)); b.hp = b.maxHp; b.transforming = false; Music.play('foundryF2'); Sfx.play('roar'); w2.shake(6); }]);
    this.play('overload', [Object.assign(timeline(ev, 3.4), { tick: (b, dt, w2) => { for (const e of ev) if (!e.done && b.sT >= e[0]) { e.done = true; e[1](b, w2); } b.hp = Math.min(b.maxHp, b.hp + b.maxHp * dt / 2.8); } })], w);
  }
  draw(ctx, t) {
    const x = Math.round(this.x), y = GROUND_Y - 20, a = this.age, open = this.open, p = this.pose, cx = x, cy = y;
    // the socket at the foot of the coil
    disc(ctx, cx, cy, 17, 17, '#1c2b35'); disc(ctx, cx, cy, 15, 15, '#0a1218');
    if (open) {
      const pulse = 0.7 + 0.3 * Math.sin(a * 14); ctx.globalAlpha = pulse; disc(ctx, cx, cy, 13, 13, this.flash > 0 ? '#ffffff' : '#7fe8ff'); ctx.globalAlpha = 1; disc(ctx, cx, cy, 8, 8, '#e8fcff'); disc(ctx, cx, cy, 3, 3, '#ffffff');
      const crack = 1 - this.hp / this.maxHp; if (crack > 0.2) pixLine(ctx, cx - 9, cy - 6, cx - 2, cy + 1, 1, '#0a1218'); if (crack > 0.5) pixLine(ctx, cx + 8, cy - 7, cx + 1, cy + 6, 1, '#0a1218');
    } else {
      for (let k = 0; k < 4; k++) { const ang = k * Math.PI / 2 + Math.PI / 4; px(ctx, cx + Math.round(Math.cos(ang) * 7) - 5, cy + Math.round(Math.sin(ang) * 7) - 5, 10, 10, '#4a5660'); px(ctx, cx + Math.round(Math.cos(ang) * 7) - 5, cy + Math.round(Math.sin(ang) * 7) - 5, 10, 2, '#8a9aa6'); }
      disc(ctx, cx, cy, 4, 4, p === 'charge' || p === 'cables' ? '#ffb347' : '#e0405a');
    }
    if (p === 'spinwarn' || p === 'spin') {                              // the sweeping beam
      const ang = p === 'spin' && this.ang != null ? this.ang : Math.PI / 2, L = 340, py0 = GROUND_Y - 22, px0 = this.x;
      ctx.globalAlpha = p === 'spin' ? 0.55 : 0.28 + 0.12 * Math.sin(a * 30); pixLine(ctx, px0, py0, px0 + Math.cos(ang) * L, py0 - Math.sin(ang) * L, 7, '#3fc7d9'); ctx.globalAlpha = 1;
      if (p === 'spin') pixLine(ctx, px0, py0, px0 + Math.cos(ang) * L, py0 - Math.sin(ang) * L, 2, '#e8fcff');
    }
    if (p === 'cables' && this.cab) for (let k = 0; k < this.cab.length; k++) { const bx = Math.round(this.cab[k] + Math.sin((this.cabT || 0) * 3 + k * 2) * 56); pixLine(ctx, bx, 34, bx, 160, 3, '#c0405a'); px(ctx, bx - 4, 160, 9, 8, '#9aa4ae'); px(ctx, bx - 2, 166, 5, 4, Math.sin(a * 40) > 0 ? '#e8fcff' : '#3fc7d9'); }
  }
}
FOUNDRY_BOSSES[9] = { id: 'foundry', name: 'The Foundry', sub: 'The machines woke up. All of them', coins: 0, cageW: 0, make: () => [new FoundryCore()] };

// the first eight cycle the three chosen themes; Sprocket and the Foundry have their own
FOUNDRY_BOSSES.forEach((d, i) => { if (!d) return; d.music = i < 8 ? FOUNDRY_MUSIC[i % 3] : (i === 8 ? 'foundrySprocket' : 'foundryF1'); });
