'use strict';

// The Foundry: machines gone haywire. The arena (a "pressfloor") has three hydraulic pistons on the left whose top plates rise and fall,
// and a tall tesla coil on the right with two hover pads. They are the only platforms. Soldiers watch from a glass skybox, bettors crowd the sides.
// It is built on the Hive's scene (gates between bosses, the cage, coins carried), with its own look and its own prize.

const FOUNDRY_FINAL_PRIZE = 300;
const FOUNDRY_BOSSES = [];
const COIL_X = 438;                                   // the tesla coil's centre

function buildFoundryBg() {
  const cv = makeCanvas(W, H), g = cv.getContext('2d'), rng = mulberry32(77);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#0a1118'); grad.addColorStop(1, '#16222b'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // the back wall: plates, pipes and rivets
  for (let x = HIVE_L; x < HIVE_R; x += 48) { rect(x, 30, 1, 190, 'rgba(120,200,220,0.07)'); for (let y = 36; y < 210; y += 24) { rect(x + 3, y, 2, 2, 'rgba(160,220,235,0.12)'); rect(x + 43, y, 2, 2, 'rgba(160,220,235,0.12)'); } }
  for (const y of [96, 140, 178]) { rect(HIVE_L, y, HIVE_R - HIVE_L, 5, '#1f2f3a'); rect(HIVE_L, y, HIVE_R - HIVE_L, 1, '#3a5566'); for (let x = HIVE_L + 20; x < HIVE_R; x += 70) rect(x, y - 1, 4, 7, '#2c4352'); }
  // the glass skybox across the top
  rect(HIVE_L - 4, 0, HIVE_R - HIVE_L + 8, 34, '#0d151c'); rect(HIVE_L - 4, 0, HIVE_R - HIVE_L + 8, 30, 'rgba(70,130,150,0.22)');
  for (let x = HIVE_L; x < HIVE_R; x += 40) rect(x, 0, 2, 30, '#22333f');
  rect(HIVE_L - 4, 30, HIVE_R - HIVE_L + 8, 4, '#2c4352'); rect(HIVE_L - 4, 30, HIVE_R - HIVE_L + 8, 1, '#5a8296');
  // the odds board in the middle
  rect(184, 40, 112, 46, '#0c161d'); rect(182, 38, 116, 2, '#3f6070'); rect(182, 86, 116, 2, '#3f6070'); rect(182, 38, 2, 50, '#3f6070'); rect(296, 38, 2, 50, '#3f6070');
  rect(236, 34, 2, 4, '#3f6070'); rect(244, 34, 2, 4, '#3f6070');
  // the walls and bleachers on both sides, with the bettors
  for (const side of [0, 1]) {
    const x0 = side ? HIVE_R : 0;
    rect(side ? HIVE_R : 0, 30, side ? W - HIVE_R : HIVE_L, 190, '#0f1a22'); rect(side ? HIVE_R : HIVE_L - 2, 30, 2, 190, '#3a5566');
    for (let r = 0; r < 6; r++) {
      const y = 70 + r * 22, tx = side ? HIVE_R + 2 : 0;
      rect(tx, y + 12, HIVE_L - 2, 4, '#26394a'); rect(tx, y + 12, HIVE_L - 2, 1, '#4c7086');
      for (let k = 0; k < 3; k++) { const bx = tx + 3 + k * 7 + (r % 2) * 2, c = ['#c0405a', '#e0a830', '#6a8ec8', '#8a6ac0', '#58b87a'][Math.floor(rng() * 5)]; rect(bx, y + 3, 4, 9, c); rect(bx, y, 4, 3, '#b8a090'); if (rng() < 0.4) rect(bx + 4, y + 2, 1, 6, '#e8e2d0'); }
    }
  }
  // a merchant stall at each side, low down
  for (const side of [0, 1]) {
    const sx = side ? HIVE_R + 3 : 2;
    rect(sx, 196, 19, 20, '#1a2832'); rect(sx - 1, 188, 21, 5, side ? '#2f7f95' : '#a0502f'); for (let k = 0; k < 21; k += 5) rect(sx - 1 + k, 193, 3, 3, side ? '#2f7f95' : '#a0502f');
    rect(sx + 2, 199, 15, 3, '#4a6070'); rect(sx + 4, 196, 3, 3, '#e0a830'); rect(sx + 10, 196, 3, 3, '#7fe8ff');
  }
  // the floor: steel plate over a dark pit of gears
  rect(0, GROUND_Y, W, H - GROUND_Y, '#0a1016'); rect(0, GROUND_Y, W, 3, '#5a7a8a'); rect(0, GROUND_Y + 3, W, 3, '#2c4352');
  for (let x = 0; x < W; x += 24) { rect(x, GROUND_Y + 6, 1, 8, '#1a2832'); rect(x + 12, GROUND_Y + 14, 12, 2, '#142029'); }
  for (let x = 0; x < W; x += 16) rect(x, GROUND_Y + 22, 8, 3, x % 32 ? '#c8a020' : '#14151a');
  return cv;
}

class FoundryScene extends HiveScene {
  get roster() { return FOUNDRY_BOSSES; }
  get trialId() { return 'foundry'; }
  get theme() { return { frame: '#1f5a68', fill: '#3fc7d9', hi: '#b8f4ff', title: '#3fc7d9', name: '#d8f0f4' }; }
  buildBg() { return buildFoundryBg(); }

  // ------------------------------------------------------------ the moving platforms
  resetPlatforms() {
    const P = (c, ph, per) => ({ x: c - 22, w: 44, y: 190, mover: true, piston: true, c, ph, per, lo: 190, hi: 142, ctl: null, heat: 0 });
    const D = (x, y, per) => ({ x, w: 52, y, by: y, mover: true, pad: true, ph: 0, per, ctl: null, heat: 0, dx: 0 });
    this.pistons = [P(66, 0, 6.2), P(128, 2.1, 5.4), P(190, 4.0, 6.8)];
    this.pads = [D(296, 150, 3.4), D(360, 98, 4.1)];
    this.floorPl = { x: 0, y: GROUND_Y, w: W, honey: 0, gone: 0, stand: 0, solid: true };
    this.allPlats = [this.floorPl, ...this.pistons, ...this.pads];
    this.platforms = this.allPlats.slice();
    this.padBase = this.pads.map(p => p.x);
    this.updateLedges(0);
  }
  updateLedges(dt) {
    const p = this.player, t = this.t;
    if (this.frozen) { if (p.onGround && p.platform && p.platform.mover && !p.dead) p.y = p.platform.y; this.platforms = this.allPlats.slice(); return; }
    for (const pl of this.pistons) {
      pl.heat = Math.max(0, pl.heat - dt);
      if (pl.ctl) { pl.ctl(dt, pl); continue; }
      const f = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / pl.per + pl.ph);
      pl.y = pl.lo - (pl.lo - pl.hi) * f;
    }
    this.pads.forEach((pl, i) => {
      pl.heat = Math.max(0, pl.heat - dt);
      if (pl.ctl) { pl.ctl(dt, pl); return; }
      pl.y = pl.by + Math.sin(t * Math.PI * 2 / pl.per + i) * 3; pl.x = this.padBase[i] + Math.sin(t * 0.8 + i * 2) * 4;
    });
    // standing on a moving plate: ride it, up or down
    if (p.onGround && p.platform && p.platform.mover && !p.dead) p.y = p.platform.y;
    this.platforms = this.allPlats.slice();
  }

  // ------------------------------------------------------------ drawing
  drawWatchers(ctx) {
    const cheer = this.cheerT > 0 && !this.hushed;
    for (let i = 0; i < 11; i++) drawWatcher(ctx, 40 + i * 40, 29, cheer, this.t, i);
    // the odds board: digits that flicker with the fight
    const lit = this.phase === 'fight' ? 1 : 0.4;
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) {
      const v = Math.floor((this.t * (2 + r) + k * 7.3) % 10), x = 192 + k * 26, y = 46 + r * 13;
      ctx.globalAlpha = 0.5 + 0.5 * lit * (Math.sin(this.t * 3 + k + r) * 0.5 + 0.5);
      text(ctx, String(v) + (k % 2 ? '' : '.'), x, y, r === 1 ? '#e0a830' : '#3fc7d9'); ctx.globalAlpha = 1;
    }
    // lightning between the coil and the skybox
    const f = Math.floor(this.t * 14);
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#b8f4ff';
    for (let k = 0; k < 2; k++) { let x = COIL_X, y = 36; const sd = f * 7 + k * 13; for (let s = 0; s < 7; s++) { const nx = x - 28 - ((sd * (s + 3)) % 13) - k * 18, ny = y - 6 + ((sd + s * 5) % 11) - 2; px(ctx, Math.min(x, nx), Math.min(y, ny), Math.abs(nx - x) + 1, 1, '#b8f4ff'); x = nx; y = Math.max(4, ny); } }
    ctx.globalAlpha = 1;
  }

  drawLedges(ctx) {
    // the coil: a tall column ringed with copper, a bright cap, and the core socket at its foot
    const t = this.t;
    px(ctx, COIL_X - 9, 40, 18, GROUND_Y - 40, '#1c2b35'); px(ctx, COIL_X - 9, 40, 3, GROUND_Y - 40, '#3a5566'); px(ctx, COIL_X + 6, 40, 3, GROUND_Y - 40, '#0e1820');
    for (let y = 56; y < GROUND_Y - 24; y += 14) { px(ctx, COIL_X - 12, y, 24, 4, '#9a5a2a'); px(ctx, COIL_X - 12, y, 24, 1, '#d89050'); }
    px(ctx, COIL_X - 14, 34, 28, 8, '#2c4352'); disc(ctx, COIL_X, 30, 11, 9, '#5a8296');
    const glow = 0.55 + 0.35 * Math.sin(t * 9); ctx.globalAlpha = glow; disc(ctx, COIL_X, 30, 7, 6, '#b8f4ff'); ctx.globalAlpha = 1;
    // the pistons: a shaft from the floor and a plate on top
    for (const pl of this.pistons) {
      px(ctx, pl.c - 10, pl.y + 6, 20, GROUND_Y - pl.y - 6, '#22333f'); px(ctx, pl.c - 10, pl.y + 6, 3, GROUND_Y - pl.y - 6, '#4c7086');
      for (let y = pl.y + 14; y < GROUND_Y - 4; y += 10) px(ctx, pl.c - 10, y, 20, 2, '#101a22');
      px(ctx, pl.c - 16, GROUND_Y - 10, 32, 10, '#2c4352'); px(ctx, pl.c - 16, GROUND_Y - 10, 32, 2, '#5a8296');
      const hot = pl.heat > 0;
      px(ctx, pl.x, pl.y, pl.w, 7, hot ? '#ff8a3a' : '#7a96a6'); px(ctx, pl.x, pl.y, pl.w, 2, hot ? '#ffd080' : '#b8d0dc'); px(ctx, pl.x, pl.y + 5, pl.w, 2, 'rgba(0,0,0,0.35)');
      for (let k = 4; k < pl.w - 2; k += 10) px(ctx, pl.x + k, pl.y + 3, 2, 2, '#26394a');
    }
    // the hover pads: a slab with a glow underneath
    for (const pl of this.pads) {
      const hot = pl.heat > 0;
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 8 + pl.x); px(ctx, pl.x + 6, pl.y + 7, pl.w - 12, 3, hot ? '#ff8a3a' : '#7fe8ff'); px(ctx, pl.x + 12, pl.y + 10, pl.w - 24, 3, hot ? '#ff8a3a' : '#7fe8ff'); ctx.globalAlpha = 1;
      px(ctx, pl.x, pl.y, pl.w, 6, hot ? '#e87030' : '#7a96a6'); px(ctx, pl.x, pl.y, pl.w, 2, hot ? '#ffd080' : '#c8e0ea'); px(ctx, pl.x + 2, pl.y + 4, pl.w - 4, 2, '#26394a');
      px(ctx, pl.x + 3, pl.y - 2, 3, 2, '#3fc7d9'); px(ctx, pl.x + pl.w - 6, pl.y - 2, 3, 2, '#3fc7d9');
    }
  }
  drawHoney() {}

  drawGates(ctx) {
    const near = this.focus, t = this.t, nx = near && near.kind === 'exit', nn = near && near.kind === 'next';
    // left: the way out, a lit steel door. right: the next machine's crate, red light blinking
    px(ctx, HIVE_GATE_L - 14, GROUND_Y - 44, 28, 44, nx ? '#223038' : '#10181e'); px(ctx, HIVE_GATE_L - 16, GROUND_Y - 46, 32, 3, '#5a8296'); px(ctx, HIVE_GATE_L - 16, GROUND_Y - 46, 3, 46, '#5a8296'); px(ctx, HIVE_GATE_L + 13, GROUND_Y - 46, 3, 46, '#5a8296');
    ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 3); px(ctx, HIVE_GATE_L - 12, GROUND_Y - 42, 24, 42, '#7fe8ff'); ctx.globalAlpha = 1;
    const blink = (t * 2) % 1 < 0.5;
    px(ctx, HIVE_GATE_R - 14, GROUND_Y - 44, 28, 44, '#06090c'); px(ctx, HIVE_GATE_R - 16, GROUND_Y - 46, 32, 3, '#5a8296');
    for (let y = GROUND_Y - 40; y < GROUND_Y - 4; y += 8) px(ctx, HIVE_GATE_R - 12, y, 24, 2, '#14202a');
    px(ctx, HIVE_GATE_R - 2, GROUND_Y - 38, 4, 4, blink || nn ? (nn ? '#ffb347' : '#e0405a') : '#401018');
  }

  drawLights(ctx) {
    const t = this.t, p = this.player, lights = [];
    lights.push({ x: COIL_X, y: 40, r: 150, i: 0.8 + 0.1 * Math.sin(t * 9), c: '127,232,255' });
    for (const pl of this.pistons) lights.push({ x: pl.c, y: pl.y, r: 50, i: pl.heat > 0 ? 0.7 : 0.3, c: '255,160,80' });
    for (const pl of this.pads) lights.push({ x: pl.x + pl.w / 2, y: pl.y + 8, r: 56, i: 0.55, c: '127,232,255' });
    lights.push({ x: 240, y: 62, r: 100, i: 0.5, c: '63,199,217' }, { x: 60, y: 40, r: 80, i: 0.4, c: '224,168,48' }, { x: 420, y: 40, r: 80, i: 0.4, c: '224,168,48' });
    lights.push({ x: p.x, y: p.y - 12, r: 60, i: 0.5, c: '220,240,255' });
    for (const b of this.bosses) if (!b.dead && b.eyes) lights.push({ x: b.x, y: b.y - b.h * 0.8, r: 38, i: 0.4, c: '255,90,60' });
    renderLights(ctx, this.light, this.camX, lights.map(L => ({ ...L, y: L.y - this.camY })), this.blackout ? 'rgba(2,4,8,0.88)' : 'rgba(4,10,16,0.36)');
  }

  bossFell(b) {
    if (b.add) return;
    this.hitstop = 0.22; this.shake(5); Sfx.play('kill');
    this.spawnSoul(b.x, b.y - b.h * 0.5, 2);
    for (let i = 0; i < 16; i++) this.spawn({ x: b.x + (Math.random() - 0.5) * b.w, y: b.y - Math.random() * b.h, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 110, life: 0.6, color: i % 3 === 0 ? '#ffb347' : (i % 2 ? '#7fe8ff' : '#5a7a8a'), size: 2, grav: 320 });
    if (this.fightOver()) {
      Ach.fightWon(this);
      for (const x of this.bosses) if (x.add) { x.hp = 0; if (x.die) x.die(this); }
      this.phase = 'sink'; this.pt = 0; this.paid = false;
      Music.fade(); Crowd.hush(); this.hushed = true; Sfx.play('sink');
      Save.data.best.foundry = Math.max(Save.data.best.foundry || 0, this.idx + 1); Save.write();
    }
  }

  // the clear: +1 health and +1 energy slot, and a purse
  updatePrize(dt) {
    if (this.pt > 0.4 && this.pt < 3.2 && Math.random() < 0.7) this.spawn({ x: 120 + Math.random() * 240, y: -4, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 60, life: 3, color: Math.random() < 0.7 ? '#7fe8ff' : '#fff0b0', size: 3, grav: 120 });
    if (this.pt > 0.4 && this.pt < 3.5 && Math.random() < 0.03) this.cheer(1);
    if (this.pt > 3.4 && Input.confirm() && !this.curtainCb) {
      Sfx.play('buy'); this.bank(FOUNDRY_FINAL_PRIZE);
      Save.data.cleared.foundry = true; Ach.trialCleared('foundry');
      Save.data.bonusHp = Math.max(2, Save.data.bonusHp || 0); Save.data.bonusEnergy = Math.max(2, Save.data.bonusEnergy || 0); Save.write();
      Crowd.set(0); this.curtainTarget = 1; this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: 'foundry' })); };
    }
  }
  drawPrize(ctx) {
    const t = this.pt, a = clamp(t / 0.8, 0, 1); ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
    const X = 70, Y = 44, PW = 340, PH = 182;
    ctx.globalAlpha = a; panel(ctx, X, Y, PW, PH, '#3fc7d9');
    text(ctx, 'THE FOUNDRY GOES QUIET', X + PW / 2, Y + 12, '#3fc7d9', 'center'); text(ctx, 'Every machine has stopped. The crowd is on its feet.', X + PW / 2, Y + 30, C.dim, 'center');
    const firstHp = (Save.data.bonusHp || 0) < 2, firstEn = (Save.data.bonusEnergy || 0) < 2;
    const rows = [[0.8, `Coins carried  ${this.pot}`, C.text], [1.3, `Final prize   ${FOUNDRY_FINAL_PRIZE}`, C.gold], [1.8, firstHp ? 'One more health. It is yours.' : 'Your extra health is already yours', '#ff9a9a'], [2.3, firstEn ? 'One more energy slot. It is yours.' : 'Your extra energy is already yours', '#7fe8ff']];
    rows.forEach(([at, s, c], i) => { if (t > at) { ctx.globalAlpha = a * clamp((t - at) / 0.3, 0, 1); text(ctx, s, X + PW / 2, Y + 54 + i * 18, c, 'center'); } });
    ctx.globalAlpha = a; if (t > 3.4) text(ctx, `${keyName(KEYS.jump)}  TAKE THE PRIZE`, X + PW / 2, Y + PH - 20, C.good, 'center'); ctx.globalAlpha = 1;
  }
}
