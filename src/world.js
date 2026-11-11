'use strict';

// Pieces shared by every scene where the knight can act: effects, souls, dialogue, the hitbox view.

function applyDevSetting() { if (!Settings.devTools) { Dev.invincible = false; Dev.hitboxes = false; } }
const Dev = { hitboxes: false, invincible: false };       // hitboxes: toggled with 0. invincible: 8 turns it on, 9 turns it off

const SOUL_COLORS = { 1: '#9fdcff', 2: '#ffe08a', 3: '#d6a8ff' };

// Uneven cave floors and ceilings. Both are polylines of [x, y] points. Two points a pixel apart
// make a rock step. A ceiling y of 0 means open space. Scenes with a flat floor leave terrain unset.
class Terrain {
  constructor(ground, ceiling = []) { this.g = ground; this.c = ceiling; }

  interp(pts, x) {
    if (!pts.length) return 0;
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + (y1 - y0) * (x - x0) / Math.max(1e-6, x1 - x0);
      }
    }
    return pts[pts.length - 1][1];
  }

  groundAt(x) { return this.interp(this.g, x); }
  ceilAt(x) { return this.interp(this.c, x); }
}

// A soul of the fallen. It drifts toward the knight and gives energy when it arrives.
class Soul {
  constructor(x, y, value) {
    this.x = x; this.y = y; this.value = value;
    this.vx = (Math.random() - 0.5) * 90;
    this.vy = -80 - Math.random() * 50;
    this.age = 0; this.dead = false; this.ph = Math.random() * 6;
  }

  update(dt, world) {
    this.age += dt;
    const p = world.player;
    const dx = p.x - this.x, dy = (p.y - 11) - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.age > 0.5 && d < 70) {
      const sp = 120 + (70 - d) * 5, k = Math.min(1, dt * 10);
      this.vx += (dx / d * sp - this.vx) * k;
      this.vy += (dy / d * sp - this.vy) * k;
    } else {
      this.vy += 220 * dt;
      this.vx *= Math.max(0, 1 - 1.5 * dt);
      const floor = (world.terrain ? world.terrain.groundAt(this.x) : GROUND_Y) - 8;
      if (this.y > floor) { this.y = floor; this.vy = -22 - Math.random() * 10; }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (d < 10 && this.age > 0.3 && !p.dead) {
      p.gainEnergy(this.value);
      world.floater(p.x, p.y - 32, `+${this.value}`, SOUL_COLORS[this.value]);
      for (let i = 0; i < 6; i++) world.spawn({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.35, color: SOUL_COLORS[this.value], size: 2, grav: 0 });
      Sfx.play('soul');
      this.dead = true;
    }
  }

  draw(ctx, t) {
    const c = SOUL_COLORS[this.value], r = 1 + this.value, b = Math.round(Math.sin(t * 4 + this.ph) * 1.5);
    ctx.globalAlpha = 0.55;
    px(ctx, this.x - 1, this.y + r + b, 2, 4, c);
    ctx.globalAlpha = 0.95;
    px(ctx, this.x - 1, this.y - r + b, 2, r * 2, c);
    px(ctx, this.x - r, this.y - 1 + b, r * 2, 2, c);
    px(ctx, this.x - 1, this.y - 1 + b, 2, 2, '#ffffff');
    ctx.globalAlpha = 1;
  }
}

// Effect hooks the player and enemies call on whatever scene they live in.
// A scene calls this.initFx() in its constructor and Object.assign(Scene.prototype, FxHooks).
const FxHooks = {
  initFx() {
    this.projectiles = []; this.particles = []; this.floaters = []; this.afters = []; this.souls = [];
    this.hitstop = 0; this.shakeAmt = 0;
  },
  spawn(p) { this.particles.push(Object.assign({ max: p.life }, p)); },
  floater(x, y, text, color) { this.floaters.push({ x, y, text, color, life: 0.9 }); },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  dustBurst(x, y, n) {
    for (let i = 0; i < n; i++) this.spawn({ x: x + (Math.random() - 0.5) * 8, y: y - 1, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 25, life: 0.3, color: '#6d7090', size: 2, grav: 0 });
  },
  ring(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      this.spawn({ x, y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 30, life: 0.3, color: '#bff6ff', size: 2, grav: 0 });
    }
  },
  afterimage(p) { this.afters.push({ x: p.x, y: p.y, facing: p.facing, life: 0.18 }); },
  onHeal(p) {
    Sfx.play('heal');
    this.floater(p.x, p.y - 34, '+1', '#7fe8ff');
    for (let i = 0; i < 12; i++) this.spawn({ x: p.x + (Math.random() - 0.5) * 12, y: p.y - 4, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 50, life: 0.7, color: '#bff6ff', size: 2, grav: 0 });
  },
  spawnSoul(x, y, value) { this.souls.push(new Soul(x, y, value)); },
  updateFx(dt) {
    for (const f of this.floaters) { f.y -= 22 * dt; f.life -= dt; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    for (const q of this.particles) { q.life -= dt; q.vy += (q.grav || 0) * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const a of this.afters) a.life -= dt;
    this.afters = this.afters.filter(a => a.life > 0);
    for (const s of this.souls) s.update(dt, this);
    this.souls = this.souls.filter(s => !s.dead);
  },
};

// Typewriter dialogue box at the top of the screen. Lines are strings (spoken by name) or
// { name, color, text } objects when several people speak.
const DialogueHooks = {
  startDialogue(name, color, lines, onEnd) {
    this.dlg = { name, color, lines, i: 0, timer: 0, onEnd };
    this.mode = 'dialogue';
  },

  dialogueLine() {
    const d = this.dlg, l = d.lines[d.i];
    return typeof l === 'string' ? { name: d.name, color: d.color, text: l } : l;
  },

  updateDialogue(dt) {
    const d = this.dlg, len = this.dialogueLine().text.length;
    const before = Math.floor(d.timer * 45);
    d.timer += dt;
    const after = Math.floor(d.timer * 45);
    if (after > before && after <= len && after % 3 === 0) Sfx.play('talk');
    if (Input.confirm()) {
      if (after < len) d.timer = len / 45 + 0.01;
      else if (d.i < d.lines.length - 1) { d.i++; d.timer = 0; Sfx.play('menu'); }
      else {
        const end = d.onEnd;
        this.dlg = null; this.mode = 'play';
        Sfx.play('cancel');
        if (end) end();
      }
    } else if (Input.cancel()) {
      d.timer = len / 45 + 0.01;
    }
  },

  drawDialogue(ctx) {
    const d = this.dlg, line = this.dialogueLine();
    const Y = 34;
    panel(ctx, 16, Y, 448, 68, line.color);
    if (line.name) text(ctx, line.name, 28, Y + 9, line.color);
    let remaining = Math.floor(d.timer * 45);
    wrapText(ctx, line.text, 424).forEach((l, k) => {
      text(ctx, l.slice(0, Math.max(0, remaining)), 28, Y + 25 + k * 12);
      remaining -= l.length + 1;
    });
    if (d.timer * 45 >= line.text.length && Math.floor(this.t * 3) % 2 === 0) {
      px(ctx, 448, Y + 56, 7, 1, C.text); px(ctx, 449, Y + 57, 5, 1, C.text); px(ctx, 450, Y + 58, 3, 1, C.text); px(ctx, 451, Y + 59, 1, 1, C.text);
    }
    text(ctx, d.i < d.lines.length - 1 ? `${keyName(KEYS.jump)} next` : `${keyName(KEYS.jump)} close`, 452, Y + 70, C.dim, 'right');
  },
};

// ---- Dev view: press 0 to see every hitbox ----

const HITBOX_KEY = [
  ['Player', '#33e0ff'], ['Attack', '#ff4a5a'], ['Target', '#ffe04a'], ['Enemy attack', '#ff9a3a'],
  ['Bolt', '#ff66ee'], ['Platform', '#4a8cff'], ['Trigger zone', '#ffffff'],
];

function outlineBox(ctx, b, color, filled) {
  if (filled) { ctx.globalAlpha = 0.25; px(ctx, b.x, b.y, b.w, b.h, color); ctx.globalAlpha = 1; }
  px(ctx, b.x, b.y, b.w, 1, color); px(ctx, b.x, b.y + b.h - 1, b.w, 1, color);
  px(ctx, b.x, b.y, 1, b.h, color); px(ctx, b.x + b.w - 1, b.y, 1, b.h, color);
}

// Call inside world space (after the camera translate).
function drawHitboxes(ctx, w) {
  if (!Dev.hitboxes) return;
  for (const pl of w.platforms) px(ctx, pl.x, pl.y, pl.w, 1, '#4a8cff');
  if (w.terrain) {
    const x0 = Math.floor(w.player.x - 260);
    for (let x = x0; x < x0 + 520; x += 2) {
      px(ctx, x, w.terrain.groundAt(x), 2, 1, '#4a8cff');
      const c = w.terrain.ceilAt(x);
      if (c > 0) px(ctx, x, c, 2, 1, '#4a8cff');
    }
  }
  for (const it of (w.interactables || [])) px(ctx, it.x - it.range, GROUND_Y - 3, it.range * 2, 2, '#ffffff');
  for (const t of w.targets) {
    outlineBox(ctx, t.hitbox(), '#ffe04a');
    if (t.debugBoxes) for (const d of t.debugBoxes()) outlineBox(ctx, d.box, d.color, true);
  }
  for (const pr of w.projectiles) outlineBox(ctx, { x: pr.x - 5, y: pr.y - 4, w: 10, h: 8 }, '#ff66ee');
  const p = w.player;
  outlineBox(ctx, p.hitbox(), '#33e0ff');
  if (p.atkT > 0) for (const b of p.attackBoxes()) outlineBox(ctx, b, '#ff4a5a', true);
}

// Call in screen space.
function drawHitboxLegend(ctx) {
  if (!Dev.hitboxes) return;
  const h = HITBOX_KEY.length * 11 + 16;
  panel(ctx, 8, 62, 136, h);
  text(ctx, 'Hitboxes', 16, 68, C.gold);
  HITBOX_KEY.forEach(([label, color], i) => {
    px(ctx, 16, 82 + i * 11, 8, 8, color);
    text(ctx, label, 30, 82 + i * 11, C.text);
  });
}

// ---- Health display: the knight's face in an iron frame, with five chain links beside it ----
// Each hit snaps a link and the face cracks and warps a little more. Energy pips sit under the chain.

const FACE_CRACKS = [
  [],
  [[40, 4], [42, 8], [40, 12], [42, 16], [44, 20]],
  [[14, 8], [12, 12], [14, 16], [12, 20]],
  [[26, 0], [28, 4], [26, 8], [28, 12], [30, 16]],
  [[4, 26], [10, 28], [16, 26], [22, 30], [30, 28], [38, 30]],
];

function drawHealthHud(ctx, p, t) {
  const st = p.hudState || (p.hudState = { hp: p.hp, snap: [] });
  if (p.hp < st.hp) for (let i = p.hp; i < st.hp; i++) st.snap[i] = t;       // a link just snapped
  if (p.hp > st.hp) for (let i = st.hp; i < p.hp; i++) st.snap[i] = null;      // healed: the link is whole again
  st.hp = p.hp;
  const dmg = p.maxHp - p.hp, x0 = 8, y0 = 8;

  // iron frame
  px(ctx, x0, y0, 60, 44, '#454859');
  px(ctx, x0 + 2, y0 + 2, 56, 40, '#0a0c1a');
  for (const [a, b] of [[x0 + 2, y0 + 2], [x0 + 54, y0 + 2], [x0 + 2, y0 + 38], [x0 + 54, y0 + 38]]) px(ctx, a, b, 4, 4, '#6a6e86');

  // the face: drawn in 2px strips so it can slip sideways as damage builds
  const frame = knightFrame(p.look || LOOKS[0], { bob: 0, legs: 'stand', arm: 'none', trail: 0 });
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 + 4, y0 + 3, 52, 38); ctx.clip();
  for (let row = 0; row < 19; row++) {
    let ox = 0;
    if (dmg >= 2 && (row + Math.floor(t * 5)) % (8 - Math.min(dmg, 5)) === 0) ox = (row % 2 ? 1 : -1) * (dmg >= 4 ? 2 : 1);
    ctx.drawImage(frame, 3, row, 26, 1, x0 + 4 + ox, y0 + 3 + row * 2, 52, 2);
  }
  ctx.fillStyle = '#0a0a12';
  for (let k = 1; k <= Math.min(dmg, 4); k++) for (const [a, b] of FACE_CRACKS[k]) ctx.fillRect(x0 + 4 + a, y0 + 3 + b, 2, 3);
  if (dmg >= 3) {
    ctx.globalAlpha = (0.1 + 0.07 * (dmg - 2)) * (0.7 + 0.3 * Math.sin(t * 6));
    ctx.fillStyle = '#ff2a3a'; ctx.fillRect(x0 + 4, y0 + 3, 52, 38);
  }
  if (p.invuln > 0.95) { ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 + 4, y0 + 3, 52, 38); }   // flash on a hit
  ctx.globalAlpha = 1;
  ctx.restore();

  // chain links
  for (let i = 0; i < p.maxHp; i++) {
    const lx = x0 + 68 + i * 18, ly = y0 + 12;
    if (i < p.hp) {
      px(ctx, lx, ly, 14, 10, '#9aa0b8'); px(ctx, lx + 2, ly + 2, 10, 6, '#0a0c1a'); px(ctx, lx, ly, 14, 2, '#c8ccdc');
      if (i < p.maxHp - 1) px(ctx, lx + 14, ly + 4, 4, 2, '#6a6e86');
    } else {
      const age = st.snap[i] == null ? 9 : t - st.snap[i];
      px(ctx, lx, ly, 6, 10, '#4a4e5e'); px(ctx, lx + 2, ly + 2, 4, 6, '#0a0c1a');          // the stump that stays
      if (age < 0.8) {                                                                    // the other half falls away
        ctx.globalAlpha = 1 - age / 0.8;
        px(ctx, lx + 9 + Math.round(age * 6), ly + 4 + Math.round(age * age * 60), 5, 6, '#9aa0b8');
        ctx.globalAlpha = 1;
      }
    }
  }
  for (let i = 0; i < p.maxEnergy; i++) drawEnergyPip(ctx, x0 + 68 + i * 10, y0 + 34, i < p.energy);
}

// Darkens the scene and cuts warm holes where lights are, then adds a colored glow on top.
function renderLights(ctx, lightCanvas, cx, lights, ambient) {
  const l = lightCanvas.getContext('2d');
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, W, H);
  l.fillStyle = ambient;
  l.fillRect(0, 0, W, H);
  l.globalCompositeOperation = 'destination-out';
  for (const L of lights) {
    const x = L.x - cx;
    if (x < -L.r || x > W + L.r) continue;
    radialLight(l, Math.round(x), Math.round(L.y), L.r, `rgba(0,0,0,${L.i})`, 'rgba(0,0,0,0)');
  }
  ctx.drawImage(lightCanvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const x = L.x - cx;
    if (x < -L.r || x > W + L.r) continue;
    radialLight(ctx, Math.round(x), Math.round(L.y), L.r, `rgba(${L.c},${L.i * 0.2})`, `rgba(${L.c},0)`);
  }
  ctx.restore();
}
