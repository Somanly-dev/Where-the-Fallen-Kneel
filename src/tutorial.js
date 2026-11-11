'use strict';

// The opening: Lowmere, a hidden village beneath the stone. It is calm, then the soldiers arrive.
// Cave paintings on the walls teach the controls. The level ends with the knight's capture.

const T_WORLD_W = 3700;
const T_ALARM_X = 1170;        // walking past here starts the raid
const T_AMBUSH_X = 3200;       // walking past here starts the final ambush
const T_WAVES = [              // [kind, offset from the knight]
  { x: 1420, spawn: [['grunt', 300], ['grunt', 380]] },
  { x: 2000, spawn: [['grunt', 300], ['grunt', -300]] },
  { x: 2600, spawn: [['brute', 320], ['grunt', 400]] },
];
const T_GROUND = [
  [0, 216], [200, 216], [290, 204], [360, 192], [440, 192], [441, 164], [520, 164], [580, 178], [640, 196], [720, 216],
  [1340, 216], [1420, 216], [1500, 200], [1560, 176], [1640, 176], [1641, 204], [1720, 210], [1800, 230], [1900, 236],
  [2000, 230], [2100, 212], [2160, 190], [2161, 160], [2260, 160], [2330, 184], [2400, 216], [2500, 216], [2560, 226],
  [2640, 226], [2700, 200], [2760, 176], [2761, 148], [2860, 148], [2920, 172], [3000, 216], [3700, 216],
];
const T_CEIL = [                // low tunnels; 0 is open cave
  [500, 0], [540, 118], [760, 118], [800, 0],
  [1520, 0], [1570, 138], [1730, 138], [1770, 0],
  [2330, 0], [2370, 148], [2560, 148], [2600, 0],
  [2700, 0], [2740, 98], [2900, 98], [2940, 0],
];
const T_HUTS = [160, 820, 960, 1100, 1240];   // the first is your own home
const T_MUSHROOMS = [200, 280, 600, 720, 1500, 1800, 2150, 2500, 2850];
const T_PAINTINGS = [
  { x: 120, kind: 'move' }, { x: 420, kind: 'jump' }, { x: 840, kind: 'interact' },
  { x: 1090, kind: 'attack' }, { x: 1210, kind: 'heal' },
];
const T_CAMPFIRE_X = 1000;
const TOV_FALL_X = 1440;

// ---- people ----

const VILLAGE = [
  { id: 'rook', name: 'Rook', x: 640, look: 'earth', gear: 'lamp', color: '#f2d46a', lines: [
    'Mind the ledges. Hold the jump button for the high ones and tap it for the low ones.',
    'My knees say it is going to rain. We are underground, so that is a worry.'] },
  { id: 'dessa', name: 'Dessa', x: 860, look: 'ember', gear: 'apron', color: '#d9a05a', lines: [
    'Soup is nearly ready. Do not tell the others it needs salt.',
    'Eat something before you wander off again.'] },
  { id: 'teller', name: 'Old Teller', x: 930, look: 'pale', gear: 'staff', color: '#e0c890', lines: [
    'Read the walls, young one. Our people painted everything they knew on them: walking, leaping, striking, mending.',
    'The old ones say the fallen linger a moment. If you must, you can mend yourself with what they leave behind.'] },
  { id: 'mother', name: 'Mother', x: 1040, look: 'gilded', color: '#c8a0d8', lines: [
    'You are up late. Come and sit by the fire.',
    'Promise me you will stay close to home.'] },
  { id: 'kit', name: 'Kit', x: 1085, look: 'rose', small: true, color: '#f2d46a', lines: [
    'I painted a monster on the wall! Do you like it?',
    'When I grow up I am going to fight just like you.'] },
  { id: 'tov', name: 'Tov', x: 1260, look: 'frost', gear: 'bow', color: '#8aa0c8', lines: [
    'Quiet tonight. Too quiet. Ha, listen to me, I am just jumpy.',
    'If anything comes down the east tunnel, I will see it first.'] },
];

class Villager {
  constructor(o) { Object.assign(this, { y: GROUND_Y, dir: -1, state: 'idle', delay: 0, speed: 80, ph: Math.random() * 6, talked: false, gone: false }, o); }

  get talkable() { return this.lines && this.state === 'idle'; }

  update(dt, w) {
    if (w.terrain) this.y = w.terrain.groundAt(this.x);
    if (this.state !== 'flee' && this.state !== 'run') return;
    this.delay -= dt;
    if (this.delay > 0) return;
    this.x += this.dir * this.speed * dt;
    if (this.id === 'tov' && this.x >= TOV_FALL_X) {
      this.state = 'down';
      w.shake(2);
      Sfx.play('kill');
    }
    if (this.x < -40 || this.x > w.width + 40) this.gone = true;
  }
}

// Villagers share the knight's body, drawn from the same sprite with a different look.
function drawVillager(ctx, v, t) {
  const L = VILLAGER_LOOKS[v.look];
  const run = (v.state === 'flee' || v.state === 'run') && v.delay <= 0;
  const legs = run ? (Math.floor(t * 10 + v.ph) % 2 ? 'run1' : 'run2') : 'stand';
  const bob = run ? 0 : (Math.sin(t * 1.5 + v.ph) > 0.5 ? 1 : 0);
  const frame = knightFrame(L, { bob, legs, arm: 'none', trail: run ? 2 : 0 });
  const size = v.small ? 24 : 32;
  const hop = run ? Math.round(Math.abs(Math.sin(t * 14 + v.ph)) * 2) : 0;
  ctx.save();
  ctx.translate(Math.round(v.x), Math.round(v.y) - hop);
  if (v.state === 'down') {
    ctx.translate(0, -size / 2);
    ctx.rotate(v.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
    ctx.drawImage(frame, -size / 2, -size / 2, size, size);
  } else {
    ctx.scale(v.dir || 1, 1);
    ctx.drawImage(frame, -size / 2, -size, size, size);
    if (v.gear === 'lamp') { px(ctx, 6, -34, 4, 3, '#f2d46a'); px(ctx, 7, -35, 2, 1, '#fff2b0'); }
    if (v.gear === 'apron') { px(ctx, -4, -14, 9, 11, '#e8e0c8'); px(ctx, -5, -14, 11, 1, '#e8e0c8'); }
    if (v.gear === 'staff') { px(ctx, 8, -30, 1, 30, '#6a5a4a'); px(ctx, 7, -32, 3, 3, '#a08a60'); }
    if (v.gear === 'bow') { px(ctx, -9, -24, 1, 16, '#8a6a4a'); px(ctx, -8, -24, 1, 16, '#c8c0a8'); }
  }
  ctx.restore();
}

// ---- cave drawing ----

function buildCaveWall() {
  const cv = makeCanvas(T_WORLD_W, H), g = cv.getContext('2d'), r = mulberry32(31);
  px(g, 0, 0, T_WORLD_W, H, '#13121c');
  for (let i = 0; i < 1100; i++) {
    const v = Math.floor(r() * 14);
    px(g, r() * T_WORLD_W, r() * H, 8 + r() * 40, 6 + r() * 24, `rgb(${24 + v},${22 + v},${34 + v})`);
  }
  for (let y = 40; y < H; y += 26 + Math.floor(r() * 20)) px(g, 0, y, T_WORLD_W, 1, 'rgba(0,0,0,0.25)');
  px(g, 0, 0, T_WORLD_W, 26, '#0a0a12');
  for (let x = 0; x < T_WORLD_W; x += 14 + Math.floor(r() * 24)) {
    const len = 14 + Math.floor(r() * 50), w = 6 + Math.floor(r() * 10);
    for (let k = 0; k < len; k++) px(g, x - w / 2, 26 + k, Math.max(1, Math.round(w * (1 - k / len))), 1, '#0e0d17');
  }
  const shade = g.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0.55)');
  shade.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, T_WORLD_W, H);
  return cv;
}

function buildTerrain(terrain) {
  const cv = makeCanvas(T_WORLD_W, H), g = cv.getContext('2d');
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const shades = [];
  for (let v = 0; v < 12; v++) for (let d = 0; d < 4; d++) {
    const k = 1 - d * 0.14;
    shades.push(`rgb(${Math.round((28 + v) * k)},${Math.round((26 + v) * k)},${Math.round((40 + v) * k)})`);
  }
  for (let x = 0; x < T_WORLD_W; x++) {
    const gy = Math.round(terrain.groundAt(x));
    for (let y = gy; y < H; y += 4) {
      g.fillStyle = shades[Math.floor(hash(x >> 2, (y - gy) >> 2) * 12) * 4 + Math.min(3, Math.floor((y - gy) / 20))];
      g.fillRect(x, y, 1, Math.min(4, H - y));
    }
    g.fillStyle = '#3a384a'; g.fillRect(x, gy, 1, 3);
    g.fillStyle = '#242232'; g.fillRect(x, gy + 3, 1, 1);
    const cy = Math.round(terrain.ceilAt(x));
    if (cy > 0) {
      for (let y = 0; y < cy; y += 4) {
        g.fillStyle = shades[Math.floor(hash(x >> 2, 40 + (y >> 2)) * 12) * 4 + 1];
        g.fillRect(x, y, 1, Math.min(4, cy - y));
      }
      g.fillStyle = '#34324a'; g.fillRect(x, cy - 3, 1, 3);
      if (hash(x, 7) > 0.96) { g.fillStyle = '#2a2838'; g.fillRect(x, cy, 2, 5 + Math.floor(hash(x, 9) * 14)); }
    }
  }
  return cv;
}

function drawHut(ctx, x, burn, t) {
  const y = GROUND_Y, warm = burn > 0 ? '#ff7a30' : '#ffb347';
  px(ctx, x - 36, y - 54, 72, 54, '#2a2936'); px(ctx, x - 36, y - 54, 72, 3, '#3a3948');
  px(ctx, x - 42, y - 62, 84, 8, '#1c1b27'); px(ctx, x - 42, y - 62, 84, 2, '#2c2b3a');
  px(ctx, x - 9, y - 30, 18, 30, '#0a0a10');
  ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 6 + x);
  px(ctx, x - 7, y - 28, 14, 28, warm);
  ctx.globalAlpha = 1;
  px(ctx, x + 16, y - 42, 12, 10, '#0a0a10'); px(ctx, x + 17, y - 41, 10, 8, warm);
  px(ctx, x - 28, y - 42, 12, 10, '#0a0a10'); px(ctx, x - 27, y - 41, 10, 8, warm);
  if (burn > 0) {
    ctx.globalAlpha = 0.35 * burn; px(ctx, x - 36, y - 54, 72, 54, '#000000'); ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const h = Math.round((10 + 16 * burn) * (0.6 + 0.4 * Math.sin(t * 9 + i * 1.7 + x)));
      ctx.globalAlpha = 0.9;
      px(ctx, x - 38 + i * 10, y - 62 - h, 8, h, '#ff5a1c');
      px(ctx, x - 36 + i * 10, y - 62 - h * 0.7, 4, Math.round(h * 0.7), '#ffb040');
      px(ctx, x - 35 + i * 10, y - 62 - h * 0.35, 2, Math.round(h * 0.35), '#ffe888');
    }
    ctx.globalAlpha = 1;
  }
}

function drawCampfire(ctx, x, t) {
  px(ctx, x - 12, GROUND_Y - 4, 24, 4, '#3a3038');
  px(ctx, x - 9, GROUND_Y - 6, 18, 3, '#2a2028');
  for (let i = 0; i < 3; i++) {
    const h = Math.round((12 + i * 3) * (0.7 + 0.3 * Math.sin(t * 10 + i * 2)));
    px(ctx, x - 7 + i * 5, GROUND_Y - 6 - h, 5, h, i === 1 ? '#ffb040' : '#ff6a20');
    px(ctx, x - 6 + i * 5, GROUND_Y - 6 - h * 0.5, 3, Math.round(h * 0.5), '#ffe888');
  }
}

// Cave paintings: the tutorial. Pale ochre pictures of keys and stick figures on a slab of wall.
function drawPainting(ctx, x, y, kind, t) {
  const L = x - 56, ink = '#d4a45a', bone = '#e8dcc0';
  px(ctx, L, y, 112, 76, '#1d1c28');
  px(ctx, L, y, 112, 2, '#33313f'); px(ctx, L, y + 74, 112, 2, '#33313f');
  px(ctx, L, y, 2, 76, '#33313f'); px(ctx, L + 110, y, 2, 76, '#33313f');
  ctx.globalAlpha = 0.92;
  const cap = (cx, cy, label) => {
    px(ctx, cx - 9, cy - 9, 18, 18, bone); px(ctx, cx - 7, cy - 7, 14, 14, '#2c2b3a');
    if (label) text(ctx, label, cx, cy - 4, bone, 'center');
  };
  const arrow = (cx, cy, d) => {
    if (d === 'u') { px(ctx, cx - 1, cy - 4, 2, 1, bone); px(ctx, cx - 2, cy - 3, 4, 1, bone); px(ctx, cx - 3, cy - 2, 6, 1, bone); px(ctx, cx - 1, cy - 1, 2, 5, bone); }
    if (d === 'd') { px(ctx, cx - 1, cy - 4, 2, 5, bone); px(ctx, cx - 3, cy + 1, 6, 1, bone); px(ctx, cx - 2, cy + 2, 4, 1, bone); px(ctx, cx - 1, cy + 3, 2, 1, bone); }
    if (d === 'l') { px(ctx, cx - 4, cy - 1, 1, 2, bone); px(ctx, cx - 3, cy - 2, 1, 4, bone); px(ctx, cx - 2, cy - 3, 1, 6, bone); px(ctx, cx - 1, cy - 1, 5, 2, bone); }
    if (d === 'r') { px(ctx, cx + 3, cy - 1, 1, 2, bone); px(ctx, cx + 2, cy - 2, 1, 4, bone); px(ctx, cx + 1, cy - 3, 1, 6, bone); px(ctx, cx - 4, cy - 1, 5, 2, bone); }
  };
  const man = (cx, cy, pose) => {
    px(ctx, cx - 2, cy - 14, 4, 4, ink); px(ctx, cx, cy - 10, 1, 7, ink);
    if (pose === 'walk') { px(ctx, cx - 3, cy - 3, 3, 1, ink); px(ctx, cx - 3, cy - 2, 1, 2, ink); px(ctx, cx + 1, cy - 3, 3, 1, ink); px(ctx, cx + 3, cy - 2, 1, 2, ink); px(ctx, cx - 3, cy - 9, 7, 1, ink); }
    else if (pose === 'jump') { px(ctx, cx - 2, cy - 3, 2, 1, ink); px(ctx, cx + 1, cy - 3, 2, 1, ink); px(ctx, cx - 3, cy - 12, 1, 4, ink); px(ctx, cx + 3, cy - 12, 1, 4, ink); }
    else { px(ctx, cx - 2, cy - 3, 1, 3, ink); px(ctx, cx + 1, cy - 3, 1, 3, ink); px(ctx, cx - 3, cy - 9, 7, 1, ink); }
  };
  const dots = (x0, y0, w, hgt, c) => { for (let i = 0; i <= 8; i++) px(ctx, x0 + i * (w / 8), y0 - Math.sin(i / 8 * Math.PI) * hgt, 2, 2, c); };
  if (kind === 'move') {
    cap(L + 24, y + 24); arrow(L + 24, y + 24, 'l'); cap(L + 48, y + 24); arrow(L + 48, y + 24, 'r');
    px(ctx, L + 64, y + 62, 40, 1, ink); man(L + 84, y + 62, 'walk');
    px(ctx, L + 18, y + 54, 8, 1, ink); px(ctx, L + 36, y + 54, 8, 1, ink);
  } else if (kind === 'jump') {
    cap(L + 24, y + 22, keyName(KEYS.jump));
    dots(L + 36, y + 54, 24, 10, ink); dots(L + 68, y + 54, 28, 22, ink);
    text(ctx, 'tap', L + 48, y + 62, bone, 'center'); text(ctx, 'hold', L + 84, y + 62, bone, 'center');
  } else if (kind === 'attack') {
    cap(L + 20, y + 22, keyName(KEYS.attack)); cap(L + 44, y + 22); arrow(L + 44, y + 22, 'u'); cap(L + 68, y + 22); arrow(L + 68, y + 22, 'd');
    man(L + 36, y + 66, 'slash'); px(ctx, L + 40, y + 52, 14, 1, bone); px(ctx, L + 52, y + 50, 1, 4, bone);
    px(ctx, L + 82, y + 58, 14, 8, '#6a5a4a'); px(ctx, L + 84, y + 50, 4, 8, '#6a5a4a');
  } else if (kind === 'heal') {
    cap(L + 22, y + 22, keyName(KEYS.heal)); text(ctx, 'hold', L + 22, y + 38, bone, 'center');
    man(L + 62, y + 62, 'stand');
    ctx.strokeStyle = '#8fc8e8'; ctx.lineWidth = 1; ctx.strokeRect(L + 52.5, y + 38.5, 20, 26);
    for (const [ox, oy] of [[96, 26], [88, 42], [100, 54]]) { px(ctx, L + ox - 1, y + oy - 3, 2, 6, '#9fdcff'); px(ctx, L + ox - 3, y + oy - 1, 6, 2, '#9fdcff'); }
  } else if (kind === 'interact') {
    cap(L + 22, y + 24); arrow(L + 22, y + 24, 'u');
    man(L + 62, y + 62, 'stand'); man(L + 92, y + 62, 'stand');
    px(ctx, L + 72, y + 40, 2, 2, bone); px(ctx, L + 78, y + 40, 2, 2, bone); px(ctx, L + 84, y + 40, 2, 2, bone);
  }
  ctx.globalAlpha = 1;
}

// ---- the scene ----

class TutorialScene {
  constructor() {
    this.width = T_WORLD_W;
    this.t = 0; this.titleT = 0;
    this.player = new Player(120, GROUND_Y);
    this.player.look = LOOKS[Save.data.look] || LOOKS[0];
    this.dummy = new Dummy(1140);
    this.dummy.soulCap = 4;
    this.enemies = [];
    this.villagers = VILLAGE.map(v => new Villager(v));
    this.terrain = new Terrain(T_GROUND, T_CEIL);
    this.platforms = [];
    this.initFx();
    this.cam = { x: 0 }; this.lookAhead = 0;
    this.mode = 'play'; this.dlg = null; this.pauseMenu = null;
    this.locked = false;
    this.phase = 'calm';          // calm -> alarm -> war -> ambush -> capture
    this.fireT = 0; this.waveIdx = 0; this.ambushT = 0; this.spawnT = 0; this.bruteSent = false;
    this.capT = 0; this.capSaid = false; this.captureLines = []; this.bindT = -1; this.ropes = 0; this.nail = null;
    this.focus = null;
    this.wall = buildCaveWall();
    this.rock = buildTerrain(this.terrain);
    this.light = makeCanvas(W, H);
    Music.play('village');
  }

  get targets() { return [this.dummy, ...this.enemies.filter(e => !e.dead)]; }

  get interactables() {
    return this.phase === 'calm' ? this.villagers.filter(v => v.talkable).map(v => ({ x: v.x, range: 28 })) : [];
  }

  fireLevel() { return this.phase === 'calm' ? 0 : clamp(this.fireT / 8, 0, 1); }
  hutBurn(i) { return this.phase === 'calm' || i === 0 ? 0 : clamp((this.fireT - i * 0.9) / 2, 0, 1); }   // your own home stays safe

  // ------------------------------------------------------------ update
  update(dt) {
    if (this.mode === 'pause') { this.pauseMenu.update(); return; }
    this.t += dt; this.titleT += dt;
    if (this.mode === 'dialogue') {
      this.updateDialogue(dt); this.updateFx(dt); this.updateCamera(dt);
      return;
    }
    if (!this.locked && Input.pressed(KEYS.cancel2)) { this.openPause(); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; this.updateCamera(dt); return; }

    this.player.update(dt, this);
    this.dummy.update(dt);
    for (const e of this.enemies) e.update(dt, this);
    this.enemies = this.enemies.filter(e => !e.gone);
    for (const v of this.villagers) v.update(dt, this);
    this.villagers = this.villagers.filter(v => !v.gone);
    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    this.updateScript(dt);
    this.updateFx(dt);
    this.updateCamera(dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 12);
    this.updateAtmosphere(dt);
  }

  updateCamera(dt) {
    const p = this.player;
    this.lookAhead = approach(this.lookAhead, p.facing * 28, 90 * dt);
    const target = clamp(p.x - W / 2 + this.lookAhead, 0, this.width - W);
    this.cam.x += (target - this.cam.x) * Math.min(1, dt * 5);
  }

  updateAtmosphere(dt) {
    Music.setIntensity(this.fireLevel());
    if (this.phase === 'calm') return;
    if (Math.random() < dt * 24) this.spawn({ x: this.cam.x + Math.random() * W, y: GROUND_Y - Math.random() * 120, vx: 8 + Math.random() * 14, vy: -26 - Math.random() * 30, life: 2, color: Math.random() < 0.5 ? '#ff9a3a' : '#ffd070', size: 1, grav: 0 });
    if (this.fireLevel() < 1 && Math.random() < dt * 10) this.spawn({ x: this.cam.x + Math.random() * W, y: 24, vx: 0, vy: 40, life: 1.2, color: '#6d7090', size: 1, grav: 120 });
  }

  updateScript(dt) {
    const p = this.player;
    if (this.phase === 'calm') {
      this.focus = null;
      let best = 1e9;
      if (p.onGround) {
        for (const v of this.villagers) {
          const d = Math.abs(p.x - v.x);
          if (v.talkable && d < 28 && d < best) { best = d; this.focus = v; }
        }
      }
      if (this.focus && Input.pressed(KEYS.interact) && p.atkT <= 0) this.talkTo(this.focus);
      if (p.x >= T_ALARM_X) this.startAlarm();
      return;
    }
    this.focus = null;
    this.fireT += dt;

    if (this.phase === 'war') {
      const wave = T_WAVES[this.waveIdx];
      if (wave && p.x >= wave.x) this.spawnWave(wave);
      if (p.x >= T_AMBUSH_X) this.startAmbush();
    } else if (this.phase === 'ambush') {
      this.ambushT += dt;
      this.spawnT -= dt;
      const alive = this.enemies.filter(e => !e.dead).length;
      if (this.spawnT <= 0 && alive < 4) {
        this.addSoldier(clamp(p.x + (Math.random() < 0.5 ? -300 : 300), 80, this.width - 80), 'grunt');
        this.spawnT = 1.6;
      }
      if (this.ambushT > 5 && !this.bruteSent) { this.bruteSent = true; this.addSoldier(clamp(p.x + 320, 80, this.width - 80), 'brute'); }
      if (this.ambushT >= 11) this.startCapture(false);
    }
    if (p.dead && this.phase !== 'capture') this.startCapture(true);
    if (this.phase === 'capture') this.updateCapture(dt);
  }

  talkTo(v) {
    const lines = v.talked ? [v.lines[Math.floor(Math.random() * v.lines.length)]] : v.lines;
    v.talked = true;
    this.player.vx = 0;
    Sfx.play('confirm');
    this.startDialogue(v.name, v.color, lines);
  }

  startAlarm() {
    this.phase = 'alarm'; this.fireT = 0;
    Sfx.play('horn');
    Music.play('invasion');
    this.shake(5);
    this.villagers.forEach(v => {
      if (v.id === 'tov') { v.state = 'run'; v.dir = 1; v.speed = 90; v.delay = 0.3; }
      else { v.state = 'flee'; v.dir = -1; v.speed = 70 + Math.random() * 30; v.delay = Math.random() * 0.8; }
    });
    const looks = Object.keys(VILLAGER_LOOKS);
    for (let i = 0; i < 6; i++) {
      this.villagers.push(new Villager({ id: 'extra' + i, look: looks[i % looks.length], small: i % 3 === 2, x: 1250 + i * 16, dir: -1, state: 'flee', speed: 80 + Math.random() * 40, delay: i * 0.25 }));
    }
    this.addSoldier(TOV_FALL_X + 60, 'grunt', -1);
    this.startDialogue('Old Teller', '#e0c890', [
      'The horns! The soldiers have found us!',
      'Get the little ones to the tunnels. Go! GO!'], () => { this.phase = 'war'; });
  }

  addSoldier(x, kind = 'grunt', facing = -1) {
    const sol = new Soldier(x, kind, facing);
    sol.y = this.terrain.groundAt(x);
    this.enemies.push(sol);
    return sol;
  }

  spawnWave(w) {
    const p = this.player;
    for (const [kind, off] of w.spawn) {
      this.addSoldier(clamp(p.x + off, 80, this.width - 80), kind, off > 0 ? -1 : 1);
    }
    this.waveIdx++;
  }

  startAmbush() {
    this.phase = 'ambush'; this.ambushT = 0; this.spawnT = 0;
    Sfx.play('horn');
    this.shake(4);
    this.floater(this.player.x, this.player.y - 44, 'Surround it!', '#ff9a9a');
  }

  startCapture(down) {
    if (this.phase === 'capture') return;
    const p = this.player;
    this.phase = 'capture'; this.locked = true; this.capT = 0; this.capSaid = false;
    this.bindT = -1; this.ropes = 0; this.nail = null;
    p.vx = 0; p.hurtT = 0; p.invuln = 0;
    p.dead = false; p.hp = Math.max(1, p.hp);          // the knight is taken alive, not struck down
    Music.play('capture');
    this.shake(4);
    // make sure there are soldiers on both sides, then give each one a place in the ring
    for (let i = this.enemies.filter(e => !e.dead && e.x < p.x).length; i < 2; i++) this.addSoldier(clamp(p.x - 240 - i * 40, 60, this.width - 60), 'grunt', 1);
    for (let i = this.enemies.filter(e => !e.dead && e.x >= p.x).length; i < 2; i++) this.addSoldier(clamp(p.x + 240 + i * 40, 60, this.width - 60), 'grunt', -1);
    let left = 0, right = 0;
    for (const e of [...this.enemies].sort((a, b) => a.x - b.x)) {
      e.passive = true; e.state = 'chase';
      e.slot = e.x < p.x ? -(26 + 22 * left++) : 26 + 22 * right++;
    }
    const S = { name: 'Soldier', color: '#c84a4a' };
    this.captureLines = (down ? [
      Object.assign({ text: 'That one is spent. Do not finish it. The men will want to watch it fight.' }, S),
    ] : [
      Object.assign({ text: 'Enough. That one has some fight in it.' }, S),
    ]).concat([
      Object.assign({ text: 'Bind it. The arena will pay well. Leave the old ones and burn the rest.' }, S),
      Object.assign({ text: 'Move it. The Antechamber is waiting.' }, S),
    ]);
  }

  updateCapture(dt) {
    const p = this.player;
    this.capT += dt;
    if (this.capT > 0.6 && !this.nail) {                  // the knight lets the blade fall
      this.nail = { x: p.x + 12, y: this.terrain.groundAt(p.x + 12) };
      p.bound = true;
      Sfx.play('hit');
    }
    if (this.bindT < 0) {
      const closed = this.enemies.every(e => e.slot === undefined || Math.abs(e.x - (p.x + e.slot)) < 4);
      if ((closed && this.capT > 1.2) || this.capT > 4) this.bindT = 0;
    } else {
      this.bindT += dt;
      const level = Math.min(4, Math.floor(this.bindT / 0.55));
      if (level > this.ropes) { this.ropes = level; Sfx.play('chain'); this.shake(1.5); }
      if (this.bindT > 2.8 && !this.capSaid) {
        this.capSaid = true;
        this.startDialogue('', '#c84a4a', this.captureLines, () => this.finish());
      }
    }
  }

  finish() {
    Ach.award('raid');
    Save.data.tutorialDone = true;
    Save.write();
    Music.play(null);
    Game.go(() => new Hub({ intro: true }));
  }

  // ------------------------------------------------------------ pause
  openPause() {
    this.mode = 'pause';
    this.shakeAmt = 0;
    this.pauseMenu = new PauseMenu(() => { this.mode = 'play'; this.pauseMenu = null; Sfx.play('cancel'); });
    Sfx.play('menu');
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const sx = (Math.random() - 0.5) * 2 * this.shakeAmt, sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
    const cx = Math.round(this.cam.x + sx);
    ctx.save();
    ctx.translate(0, Math.round(sy));
    ctx.drawImage(this.wall, -cx, 0);
    ctx.save();
    ctx.translate(-cx, 0);
    this.drawWorld(ctx);
    ctx.restore();
    this.drawLighting(ctx, cx);
    if (Dev.hitboxes) { ctx.save(); ctx.translate(-cx, 0); drawHitboxes(ctx, this); ctx.restore(); }
    ctx.restore();

    this.drawHud(ctx);
    if (this.mode === 'dialogue') this.drawDialogue(ctx);
    if (this.mode === 'pause') this.pauseMenu.draw(ctx);
  }

  drawWorld(ctx) {
    const t = this.t, p = this.player, cam = this.cam.x;
    for (const m of T_MUSHROOMS) {
      const gy = Math.round(this.terrain.groundAt(m));
      px(ctx, m - 1, gy - 7, 2, 8, '#2a3a38');
      px(ctx, m - 4, gy - 11, 8, 4, '#3a8a80'); px(ctx, m - 2, gy - 12, 4, 1, '#7ae0d0');
    }
    for (const pt of T_PAINTINGS) if (pt.x > cam - 80 && pt.x < cam + W + 80) drawPainting(ctx, pt.x, GROUND_Y - 150, pt.kind, t);
    T_HUTS.forEach((x, i) => drawHut(ctx, x, this.hutBurn(i), t));
    drawCampfire(ctx, T_CAMPFIRE_X, t);
    for (const v of this.villagers) drawVillager(ctx, v, t);
    ctx.drawImage(this.rock, 0, 0);
    for (const pl of this.platforms) {
      if (pl.solid) continue;
      px(ctx, pl.x, pl.y, pl.w, 10, '#34324a'); px(ctx, pl.x, pl.y, pl.w, 3, '#4a4868'); px(ctx, pl.x, pl.y + 8, pl.w, 2, '#22202e');
    }
    drawDummy(ctx, this.dummy);
    for (const e of this.enemies) e.draw(ctx);
    for (const a of this.afters) {
      ctx.globalAlpha = a.life / 0.18 * 0.35;
      drawKnight(ctx, { x: a.x, y: a.y, facing: a.facing, vx: 0, vy: 0, onGround: false, healing: false, animT: 0, dashing: true, atkT: 0, atkDir: 'side', look: p.look }, t);
    }
    ctx.globalAlpha = 1;
    if (this.nail) { px(ctx, this.nail.x - 5, this.nail.y - 2, 12, 2, p.look.N); px(ctx, this.nail.x - 9, this.nail.y - 2, 4, 2, '#6a5a4a'); }
    drawKnight(ctx, p, t);
    drawSlash(ctx, p);
    this.drawBinding(ctx);
    if (p.healing) {
      const f = p.healT / PHYS.healTime;
      px(ctx, p.x - 8, p.y - 38, 16, 3, '#16213a'); px(ctx, p.x - 8, p.y - 38, Math.round(16 * f), 3, '#7fe8ff');
    }
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const s of this.souls) s.draw(ctx, t);
    for (const q of this.particles) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); px(ctx, q.x, q.y, q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) { ctx.globalAlpha = clamp(f.life / 0.4, 0, 1); text(ctx, f.text, f.x, f.y, f.color, 'center'); }
    ctx.globalAlpha = 1;
    if (this.mode === 'play' && this.focus) this.drawPrompt(ctx, this.focus);
  }

  // Rope around the knight, and chains held by the two soldiers beside it.
  drawBinding(ctx) {
    const p = this.player;
    for (let k = 0; k < this.ropes; k++) {
      px(ctx, p.x - 6, p.y - 10 - k * 4, 12, 2, '#8a6a4a');
      px(ctx, p.x - 6 + (k % 2) * 9, p.y - 10 - k * 4, 3, 3, '#a8845a');
    }
    if (this.bindT >= 1) {
      for (const e of this.enemies) {
        if (e.slot === undefined || Math.abs(e.slot) > 30) continue;
        const d = Math.sign(e.slot), x0 = p.x + d * 6, x1 = e.x - d * 5;
        for (let i = 0; i <= 8; i++) px(ctx, x0 + (x1 - x0) * i / 8, p.y - 13 + Math.sin(i / 8 * Math.PI) * 4, 2, 2, '#7a7e8c');
      }
    }
  }

  drawPrompt(ctx, v) {
    const label = `[${keyName(KEYS.interact)}] Talk`, sub = v.name;
    const w = Math.max(textW(ctx, label), textW(ctx, sub)) + 14, h = 28;
    const bx = Math.round(clamp(v.x - w / 2, this.cam.x + 4, this.cam.x + W - 4 - w));
    const by = v.y - (v.small ? 28 : 38) - h - 8 + Math.round(Math.sin(this.t * 4) * 1.5);
    panel(ctx, bx, by, w, h);
    text(ctx, sub, bx + w / 2, by + 5, v.color, 'center');
    text(ctx, label, bx + w / 2, by + 16, C.text, 'center');
  }

  drawLighting(ctx, cx) {
    const t = this.t, p = this.player, f = this.fireLevel(), lights = [];
    const flick = 0.8 + 0.2 * Math.sin(t * 9) * Math.sin(t * 5.3);
    lights.push({ x: T_CAMPFIRE_X, y: GROUND_Y - 12, r: 150, i: 0.9 * flick, c: '255,150,60' });
    for (const m of T_MUSHROOMS) lights.push({ x: m, y: this.terrain.groundAt(m) - 8, r: 50, i: 0.55, c: '90,220,200' });
    T_HUTS.forEach((x, i) => {
      const b = this.hutBurn(i);
      lights.push({ x, y: GROUND_Y - 28, r: 60 + 80 * b, i: (0.6 + 0.4 * b) * (b > 0 ? flick : 1), c: b > 0 ? '255,110,40' : '255,190,100' });
    });
    for (const s of this.souls) lights.push({ x: s.x, y: s.y, r: 36, i: 0.6, c: '150,210,255' });
    lights.push({ x: p.x, y: p.y - 14, r: 80, i: 0.6, c: '200,210,255' });
    renderLights(ctx, this.light, cx, lights, `rgba(${4 + Math.round(18 * f)},5,${14 - Math.round(6 * f)},0.58)`);
    if (f > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(150,40,10,${0.09 * f})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  drawHud(ctx) {
    const p = this.player;
    drawHealthHud(ctx, p, this.t);
    if (Dev.hitboxes) drawHitboxLegend(ctx);
    if (this.titleT < 4.2 && this.phase === 'calm') {
      const a = clamp(Math.min(this.titleT / 0.8, (4.2 - this.titleT) / 0.8), 0, 1);
      ctx.globalAlpha = a;
      text(ctx, 'LOWMERE', W / 2, 40, '#e8e2d0', 'center');
      text(ctx, 'a village beneath the stone', W / 2, 54, C.dim, 'center');
      ctx.globalAlpha = 1;
    }
    if (this.mode === 'play' && this.phase !== 'calm' && this.phase !== 'capture' && p.hp < p.maxHp && p.energy >= PHYS.healCost && Math.floor(this.t * 2) % 2 === 0) {
      text(ctx, `Hold ${keyName(KEYS.heal)} to heal`, W / 2, 246, '#7fe8ff', 'center');
    }
  }
}

Object.assign(TutorialScene.prototype, FxHooks, DialogueHooks);
