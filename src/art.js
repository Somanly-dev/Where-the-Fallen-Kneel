'use strict';

// All art is drawn from rectangles so the game needs no image files.
// Every character function draws with feet at (x, y), facing right unless flipped.

// ------------------------------------------------------------------ player
// Pixel crescent for the sword slash.
function drawSlash(ctx, p) {
  if (p.atkT <= 0) return;
  const wp = p.weapon;
  if (WPN_SWING.includes(wp.kind)) { drawWeaponSwing(ctx, p, wp); return; }
  const prog = 1 - p.atkT / wp.active;                 // 0..1
  const cx = p.x, cy = p.y - 11;
  const base = p.atkDir === 'up' ? -Math.PI / 2 : p.atkDir === 'down' ? Math.PI / 2 : (p.facing > 0 ? 0 : Math.PI);
  const sweep = p.facing > 0 || p.atkDir !== 'side' ? 1 : -1;
  const r = wp.reach * PHYS.attackScale * 0.85 + 4;
  const end = -0.95 + 1.9 * Math.min(1, prog * 1.5 + 0.25);
  ctx.globalAlpha = 1 - prog * 0.65;
  for (let a = -0.95; a <= end; a += 0.07) {
    const thick = Math.max(1, Math.round(4 * (1 - Math.abs(a) / 1.0)));
    for (let k = 0; k < thick; k++) {
      const ang = base + a * sweep;
      const rr = r - k;
      px(ctx, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 2, 2, k === 0 ? '#ffffff' : wp.color);
    }
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ shops
function drawPeddler(ctx, x, y, t) {
  // veiled figure behind the counter
  px(ctx, x - 9, y - 40, 18, 40, '#2d2750');
  px(ctx, x - 7, y - 50, 14, 12, '#3b3368');
  px(ctx, x - 4, y - 47, 8, 7, '#07070e');
  const blink = (Math.floor(t * 0.7) % 7 === 0) ? 1 : 2;
  px(ctx, x - 3, y - 45, 2, blink, '#7ff3ff');
  px(ctx, x + 1, y - 45, 2, blink, '#7ff3ff');
  px(ctx, x - 12, y - 30, 4, 14, '#241f42');
  px(ctx, x + 8, y - 30, 4, 14, '#241f42');
  // floating wares
  const orb = (ox, oy, c) => {
    const f = Math.round(Math.sin(t * 2 + ox) * 2);
    px(ctx, x + ox - 2, y + oy + f - 4, 5, 5, c);
    px(ctx, x + ox - 1, y + oy + f - 5, 3, 7, c);
    px(ctx, x + ox - 1, y + oy + f - 3, 1, 1, '#ffffff');
  };
  orb(-24, -30, '#ff8f4a'); orb(24, -32, '#6fe3ff'); orb(-4, -62, '#ae7bff');
  // counter
  px(ctx, x - 36, y - 18, 72, 18, '#3a2c26');
  px(ctx, x - 36, y - 18, 72, 3, '#5b2d73');
  px(ctx, x - 36, y - 15, 72, 1, '#2c1d18');
  // awning
  px(ctx, x - 42, y - 78, 84, 6, '#4b2663');
  for (let i = 0; i < 7; i++) px(ctx, x - 42 + i * 12, y - 72, 12, 4 + (i % 2) * 2, i % 2 ? '#35194a' : '#5b2d73');
  px(ctx, x - 40, y - 72, 3, 72, '#2a1f1a');
  px(ctx, x + 37, y - 72, 3, 72, '#2a1f1a');
}

function drawSmith(ctx, x, y, t, swing) {
  // weapon rack on the wall
  px(ctx, x - 40, y - 70, 80, 3, '#2a1f1a');
  for (let i = 0; i < 5; i++) {
    const w = WEAPONS[i];
    px(ctx, x - 34 + i * 16, y - 66, 2, Math.round(10 + w.reach * 0.5), w.color);
    px(ctx, x - 36 + i * 16, y - 66, 6, 1, '#6a5a4a');
  }
  // smith
  px(ctx, x - 8, y - 32, 16, 32, '#5b4a40');
  px(ctx, x - 8, y - 22, 16, 22, '#2a2420');             // apron
  px(ctx, x - 5, y - 43, 10, 11, '#c9a27e');
  px(ctx, x - 6, y - 46, 12, 5, '#3a3036');              // cap
  px(ctx, x - 3, y - 39, 2, 2, '#1a1010');
  px(ctx, x + 1, y - 39, 2, 2, '#1a1010');
  px(ctx, x - 5, y - 34, 10, 3, '#8a6a52');              // beard
  // arm + hammer
  const sw = swing > 0 ? Math.sin(swing * Math.PI) : 0;
  const hy = y - 40 + Math.round(sw * 20);
  px(ctx, x + 8, y - 28, 5, 3, '#c9a27e');
  px(ctx, x + 12, hy, 2, 18, '#6a4a30');
  px(ctx, x + 9, hy - 3, 8, 6, '#9aa0b4');
  // anvil
  px(ctx, x + 14, y - 12, 18, 5, '#4a4e5c');
  px(ctx, x + 18, y - 7, 10, 7, '#363a46');
  px(ctx, x + 12, y - 14, 5, 3, '#4a4e5c');
  // forge
  px(ctx, x + 44, y - 36, 34, 36, '#2b2b36');
  px(ctx, x + 44, y - 36, 34, 4, '#3a3a48');
  px(ctx, x + 50, y - 24, 22, 14, '#0a0606');
  const f = 0.6 + 0.4 * Math.sin(t * 9) * Math.sin(t * 5.3);
  ctx.globalAlpha = 0.65 + 0.35 * f;
  px(ctx, x + 51, y - 18, 20, 7, '#ff7a1c');
  px(ctx, x + 54, y - 22, 14, 6, '#ffb040');
  px(ctx, x + 58, y - 24, 6, 5, '#ffe080');
  ctx.globalAlpha = 1;
  px(ctx, x + 56, y - 56, 10, 22, '#232330');            // chimney
  // counter
  px(ctx, x - 36, y - 16, 40, 16, '#3a2c26');
  px(ctx, x - 36, y - 16, 40, 3, '#6a3a2a');
  // awning
  px(ctx, x - 42, y - 80, 50, 5, '#5a2a22');
  px(ctx, x - 40, y - 75, 3, 75, '#2a1f1a');
}

// ------------------------------------------------------------------ chamber + prisoners
const CHAMBER = { x: 24, w: 240, cells: 4, cellW: 60, top: GROUND_Y - 92 };

function drawChamber(ctx, t) {
  const c = CHAMBER;
  px(ctx, c.x, c.top, c.w, 92, '#07080f');
  // frame
  px(ctx, c.x - 6, c.top - 8, c.w + 12, 8, '#2a2d44');
  px(ctx, c.x - 6, c.top - 8, c.w + 12, 2, '#3c4062');
  px(ctx, c.x - 6, c.top, 6, 92, '#23263c');
  px(ctx, c.x + c.w, c.top, 6, 92, '#23263c');
  // back wall bricks hint
  for (let r = 0; r < 11; r++) for (let i = 0; i < c.w / 20; i++) {
    px(ctx, c.x + i * 20 + (r % 2) * 10, c.top + r * 8, 19, 1, '#10121e');
  }
  // straw on the floor
  for (let i = 0; i < c.cells; i++) {
    const cx = c.x + i * c.cellW + c.cellW / 2;
    px(ctx, cx - 18, GROUND_Y - 2, 36, 2, '#6b5a34');
    px(ctx, cx - 12, GROUND_Y - 3, 22, 1, '#7d6a3c');
  }
}

function drawChamberBars(ctx) {
  const c = CHAMBER;
  const bar = '#454859', barHi = '#6a6e86';
  for (let i = 0; i <= c.cells; i++) {
    px(ctx, c.x + i * c.cellW - 2, c.top, 4, 92, '#363a50');   // cell dividers
  }
  for (let x = 0; x < c.w; x += 8) {
    px(ctx, c.x + x + 3, c.top, 2, 92, bar);
    px(ctx, c.x + x + 3, c.top, 1, 92, barHi);
  }
  px(ctx, c.x, c.top + 4, c.w, 3, '#363a50');
  px(ctx, c.x, GROUND_Y - 14, c.w, 3, '#363a50');
  // plaque
  px(ctx, c.x + c.w / 2 - 34, c.top - 20, 68, 12, '#1a1c2c');
  px(ctx, c.x + c.w / 2 - 34, c.top - 20, 68, 1, '#6d6c92');
  text(ctx, 'THE KEPT', c.x + c.w / 2, c.top - 18, '#9a98c0', 'center');
}

function drawPrisoner(ctx, v, x, y, t) {
  const sway = Math.round(Math.sin(t * 1.3 + v));
  if (v === 0) {                                   // old knight, slumped
    px(ctx, x - 8, y - 14, 16, 14, '#5f6374');
    px(ctx, x - 6, y - 24 + sway, 12, 10, '#838799');
    px(ctx, x - 4, y - 20 + sway, 8, 2, '#10101a');
    px(ctx, x - 5, y - 14 + sway, 10, 5, '#d8d8d0');
    px(ctx, x - 9, y - 10, 3, 6, '#454859');
    px(ctx, x + 6, y - 10, 3, 6, '#454859');
  } else if (v === 1) {                            // moth
    const fl = Math.round(Math.sin(t * 6) * 1);
    px(ctx, x - 13, y - 36, 8, 20 + fl, '#a99c78');
    px(ctx, x + 5, y - 36, 8, 20 + fl, '#a99c78');
    px(ctx, x - 14, y - 36, 1, 20, '#c7b890');
    px(ctx, x - 5, y - 30, 10, 24, '#c7b890');
    px(ctx, x - 4, y - 38, 8, 8, '#d9ccaa');
    px(ctx, x - 4, y - 45, 1, 7, '#8a7a50'); px(ctx, x + 3, y - 45, 1, 7, '#8a7a50');
    px(ctx, x - 3, y - 36, 2, 2, '#ff8a2a'); px(ctx, x + 1, y - 36, 2, 2, '#ff8a2a');
    px(ctx, x - 4, y - 6, 3, 6, '#8a7a50'); px(ctx, x + 1, y - 6, 3, 6, '#8a7a50');
  } else if (v === 2) {                            // robot
    px(ctx, x - 9, y - 26, 18, 18, '#59616e');
    px(ctx, x - 9, y - 26, 18, 3, '#7b8594');
    px(ctx, x - 6, y - 38, 12, 11, '#7b8594');
    const on = Math.sin(t * 5) > -0.6;
    px(ctx, x - 3, y - 34, 6, 3, on ? '#ff4040' : '#601818');
    px(ctx, x - 1, y - 44, 2, 6, '#59616e');
    px(ctx, x - 2, y - 46, 4, 3, Math.sin(t * 3) > 0 ? '#ff4040' : '#601818');
    px(ctx, x - 7, y - 8, 5, 8, '#454c58'); px(ctx, x + 2, y - 8, 5, 8, '#454c58');
    px(ctx, x - 13, y - 24, 4, 12, '#454c58'); px(ctx, x + 9, y - 24, 4, 12, '#454c58');
  } else {                                         // oracle, floating
    const f = Math.round(Math.sin(t * 1.6) * 3);
    px(ctx, x - 8, y - 38 + f, 16, 30, '#cfc4ee');
    px(ctx, x - 6, y - 8 + f, 12, 4, '#cfc4ee');
    px(ctx, x - 3, y - 4 + f, 6, 3, '#cfc4ee');
    px(ctx, x - 6, y - 46 + f, 12, 10, '#e4dcf8');
    px(ctx, x - 4, y - 43 + f, 8, 5, '#2a1e4a');
    px(ctx, x - 3, y - 42 + f, 2, 2, '#ffd86a'); px(ctx, x + 1, y - 42 + f, 2, 2, '#ffd86a');
    ctx.globalAlpha = 0.6;
    px(ctx, x - 9, y - 52 + f, 18, 1, '#ffd86a');
    ctx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ dummy
function drawDummy(ctx, d) {
  ctx.save();
  ctx.translate(Math.round(d.x), Math.round(d.y));
  ctx.rotate(d.angle);
  px(ctx, -9, -3, 18, 3, '#5a4630');
  px(ctx, -2, -34, 4, 32, '#6b5238');
  px(ctx, -10, -26, 20, 3, '#6b5238');
  px(ctx, -7, -30, 14, 18, '#b59a5a');
  px(ctx, -7, -20, 14, 2, '#8a7440');
  px(ctx, -6, -42, 12, 12, '#c4aa6a');
  px(ctx, -4, -38, 2, 2, '#3a2e1a'); px(ctx, 2, -38, 2, 2, '#3a2e1a');
  px(ctx, -3, -34, 6, 1, '#3a2e1a');
  px(ctx, -5, -44, 3, 3, '#d4ba7a'); px(ctx, 2, -44, 4, 3, '#d4ba7a');
  if (d.flash > 0) {
    ctx.globalAlpha = Math.min(1, d.flash * 8) * 0.8;
    px(ctx, -10, -44, 20, 44, '#ffffff');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ------------------------------------------------------------------ gates
function drawGate(ctx, g, t, near, best) {
  const x = g.x, y = GROUND_Y, col = g.trial.color;
  const stone = '#2c2f48', stoneHi = '#444868', stoneLo = '#1c1e32';
  // portal
  px(ctx, x - 20, y - 88, 40, 88, '#05050c');
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 20, y - 88, 40, 88); ctx.clip();
  for (let i = 0; i < 22; i++) {
    const yy = y - ((i * 4 + t * 24) % 88);
    ctx.globalAlpha = 0.18 + 0.2 * Math.sin(t * 2 + i * 0.7) + (near ? 0.15 : 0);
    px(ctx, x - 20, yy, 40, 3, col);
  }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 6; i++) {
    const sx = x - 16 + ((i * 17 + Math.sin(t + i) * 4) % 32);
    const sy = y - ((i * 29 + t * 18) % 84);
    px(ctx, sx, sy, 2, 2, '#ffffff');
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // frame
  px(ctx, x - 30, y - 92, 10, 92, stone);
  px(ctx, x + 20, y - 92, 10, 92, stone);
  px(ctx, x - 30, y - 92, 2, 92, stoneHi);
  px(ctx, x + 20, y - 92, 2, 92, stoneHi);
  px(ctx, x - 20, y - 92, 40, 4, stoneLo);
  px(ctx, x - 34, y - 104, 68, 12, stone);
  px(ctx, x - 34, y - 104, 68, 2, stoneHi);
  px(ctx, x - 28, y - 96, 6, 4, stone); px(ctx, x + 22, y - 96, 6, 4, stone);
  px(ctx, x - 34, y - 6, 14, 6, stoneLo); px(ctx, x + 20, y - 6, 14, 6, stoneLo);
  // count plate on lintel
  text(ctx, `${best}/${g.trial.bosses}`, x, y - 102, near ? '#ffffff' : col, 'center');
  // emblem
  drawEmblem(ctx, g.trial.id, x, y - 118, col);
}

function drawEmblem(ctx, id, x, y, col) {
  if (id === 'fallen') {            // sword
    px(ctx, x - 1, y - 8, 2, 14, col); px(ctx, x - 4, y - 2, 8, 2, col); px(ctx, x - 1, y + 6, 2, 3, '#ffffff');
  } else if (id === 'hive') {       // hex
    px(ctx, x - 3, y - 7, 6, 2, col); px(ctx, x - 6, y - 5, 12, 10, col); px(ctx, x - 3, y + 5, 6, 2, col);
    px(ctx, x - 2, y - 3, 4, 6, '#1a1408');
  } else if (id === 'foundry') {    // cog
    px(ctx, x - 5, y - 5, 10, 10, col);
    px(ctx, x - 2, y - 8, 4, 16, col); px(ctx, x - 8, y - 2, 16, 4, col);
    px(ctx, x - 2, y - 2, 4, 4, '#05181c');
  } else {                          // sun
    px(ctx, x - 4, y - 4, 8, 8, col);
    px(ctx, x - 1, y - 8, 2, 16, col); px(ctx, x - 8, y - 1, 16, 2, col);
    px(ctx, x - 2, y - 2, 4, 4, '#ffffff');
  }
}

// ------------------------------------------------------------------ props
function drawLantern(ctx, x, len, t, seed) {
  px(ctx, x, 0, 1, len, '#2b2b38');
  const fl = 0.75 + 0.25 * Math.sin(t * 8 + seed) * Math.sin(t * 3.1 + seed);
  px(ctx, x - 3, len, 7, 2, '#3a3a46');
  px(ctx, x - 3, len + 2, 1, 8, '#3a3a46'); px(ctx, x + 3, len + 2, 1, 8, '#3a3a46');
  px(ctx, x - 2, len + 2, 5, 8, '#ffb347');
  ctx.globalAlpha = fl;
  px(ctx, x - 1, len + 4, 3, 5, '#fff2b0');
  ctx.globalAlpha = 1;
  px(ctx, x - 3, len + 10, 7, 2, '#3a3a46');
}

function drawPlatform(ctx, p) {
  px(ctx, p.x, p.y, p.w, 8, '#3a3e5c');
  px(ctx, p.x, p.y, p.w, 2, '#5a5f88');
  px(ctx, p.x, p.y + 6, p.w, 2, '#262942');
  for (let i = 8; i < p.w; i += 16) px(ctx, p.x + i, p.y + 2, 1, 4, '#262942');
}

function drawSign(ctx, x, label) {
  const y = GROUND_Y;
  const w = textW(ctx, label) + 12;
  px(ctx, x - 1, y - 40, 3, 40, '#4a3a2a');
  px(ctx, x - w / 2, y - 52, w, 14, '#6b5238');
  px(ctx, x - w / 2, y - 52, w, 2, '#85683f');
  text(ctx, label, x, y - 49, '#e8d8b0', 'center');
}

// ------------------------------------------------------------------ pre-rendered layers
function archColumns(g, cx, top, w, h, fn) {
  const r = w / 2;
  for (let dx = 0; dx < w; dx++) {
    const u = (dx + 0.5 - r) / r;
    const y0 = Math.round(top + r - Math.sqrt(Math.max(0, 1 - u * u)) * r);
    fn(Math.round(cx - r + dx), y0, top + h - y0);
  }
}

const WINDOW_XS = [380, 760, 1140, 1520];
const PILLAR_XS = [];
for (let k = 0; k < 10; k++) PILLAR_XS.push(95 + 190 * k);

function buildWall() {
  const wall = makeCanvas(WORLD_W, GROUND_Y);
  const g = wall.getContext('2d');
  const rng = mulberry32(7);
  g.fillStyle = '#0d0f1e';
  g.fillRect(0, 0, WORLD_W, GROUND_Y);
  for (let row = 0; row < GROUND_Y / 8; row++) {
    const off = (row % 2) * 8;
    for (let x = -16 + off; x < WORLD_W; x += 16) {
      const v = Math.floor(rng() * 9);
      g.fillStyle = `rgb(${22 + v},${25 + v},${44 + v})`;
      g.fillRect(x + 1, row * 8 + 1, 15, 7);
    }
  }
  // arches between pillars
  g.fillStyle = '#10122a';
  for (let i = 0; i < PILLAR_XS.length - 1; i++) {
    const a = PILLAR_XS[i], b = PILLAR_XS[i + 1];
    const span = b - a;
    for (let dx = 0; dx < span; dx++) {
      const u = (dx + 0.5 - span / 2) / (span / 2);
      const y = Math.round(54 - Math.sqrt(Math.max(0, 1 - u * u)) * 36);
      g.fillStyle = '#171a36'; g.fillRect(a + dx, y, 1, 5);
      g.fillStyle = '#0a0b18'; g.fillRect(a + dx, y + 5, 1, 2);
    }
  }
  // windows
  for (const wx of WINDOW_XS) {
    archColumns(g, wx, 32, 52, 100, (x, y, hh) => { g.fillStyle = '#2a2e50'; g.fillRect(x, y, 1, hh); });
    g.globalCompositeOperation = 'destination-out';
    archColumns(g, wx, 38, 40, 90, (x, y, hh) => { g.fillStyle = '#000'; g.fillRect(x, y, 1, hh); });
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#2a2e50';
    g.fillRect(wx - 1, 38, 2, 90);
    g.fillRect(wx - 20, 78, 40, 2);
  }
  // pillars
  for (const x of PILLAR_XS) {
    g.fillStyle = '#1d2038'; g.fillRect(x - 8, 0, 16, GROUND_Y);
    g.fillStyle = '#2c3052'; g.fillRect(x - 8, 0, 2, GROUND_Y);
    g.fillStyle = '#12142a'; g.fillRect(x + 6, 0, 2, GROUND_Y);
    g.fillStyle = '#2a2e4c'; g.fillRect(x - 11, 28, 22, 6);
    g.fillStyle = '#2a2e4c'; g.fillRect(x - 11, GROUND_Y - 12, 22, 12);
    g.fillStyle = '#3a3e62'; g.fillRect(x - 11, GROUND_Y - 12, 22, 2);
  }
  // ceiling beam
  g.fillStyle = '#090a16'; g.fillRect(0, 0, WORLD_W, 14);
  g.fillStyle = '#1a1c32'; g.fillRect(0, 14, WORLD_W, 2);
  // darken toward the top
  const grad = g.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.globalCompositeOperation = 'source-atop';
  g.fillRect(0, 0, WORLD_W, GROUND_Y);
  g.globalCompositeOperation = 'source-over';
  return wall;
}

function buildGround() {
  const h = H - GROUND_Y;
  const cv = makeCanvas(WORLD_W, h);
  const g = cv.getContext('2d');
  const rng = mulberry32(21);
  g.fillStyle = '#191b2e'; g.fillRect(0, 0, WORLD_W, h);
  for (let row = 0; row < h / 12; row++) {
    for (let x = -24 + (row % 2) * 16; x < WORLD_W; x += 32) {
      const v = Math.floor(rng() * 8);
      g.fillStyle = `rgb(${28 + v},${31 + v},${52 + v})`;
      g.fillRect(x + 1, row * 12 + 3, 30, 9);
    }
  }
  g.fillStyle = '#4a4e72'; g.fillRect(0, 0, WORLD_W, 2);
  g.fillStyle = '#2c2f4c'; g.fillRect(0, 2, WORLD_W, 1);
  for (let i = 0; i < 90; i++) {                      // moss tufts
    const x = Math.floor(rng() * WORLD_W), w = 2 + Math.floor(rng() * 6);
    g.fillStyle = '#2e5a46'; g.fillRect(x, 0, w, 2);
    g.fillStyle = '#3f7a5c'; g.fillRect(x, 0, w, 1);
  }
  const fade = g.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = fade; g.fillRect(0, 0, WORLD_W, h);
  return cv;
}

function buildBackdrop() {
  const rng = mulberry32(99);
  const stars = [];
  for (let i = 0; i < 70; i++) stars.push([Math.floor(rng() * W), Math.floor(rng() * 150), rng() < 0.2 ? 2 : 1]);
  const spires = [];
  for (let i = 0; i < 30; i++) spires.push(34 + Math.floor(rng() * 70));
  return { stars, spires };
}

function drawBackdrop(ctx, camX, t, bd) {
  const bands = ['#090b1a', '#0b0d20', '#0e0f26', '#11122c', '#141432', '#171637', '#1a193c', '#1d1b40', '#201e44', '#232048'];
  for (let i = 0; i < bands.length; i++) px(ctx, 0, Math.round(i * GROUND_Y / bands.length), W, Math.ceil(GROUND_Y / bands.length), bands[i]);
  for (const [sx, sy, s] of bd.stars) {
    const x = ((sx - camX * 0.04) % W + W) % W;
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.5 + sx);
    px(ctx, x, sy, s, s, '#cfd6ff');
  }
  ctx.globalAlpha = 1;
  // distant spires
  for (let i = 0; i < bd.spires.length; i++) {
    const x = Math.round(i * 44 - camX * 0.3 - 20);
    if (x < -40 || x > W) continue;
    const h = bd.spires[i];
    px(ctx, x, GROUND_Y - h, 24, h, '#12132d');
    for (let r = 0; r < 12; r++) px(ctx, x + 12 - (r * 1 + 1), GROUND_Y - h - 12 + r, (r + 1) * 2, 1, '#12132d');
    if (i % 3 === 0) px(ctx, x + 10, GROUND_Y - h + 12, 4, 7, '#2a2a58');
  }
}
