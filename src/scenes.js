'use strict';

// Title screen, file select and settings. Layouts follow the approved previews.

function idleKnight(look) {
  return { x: 0, y: 0, vx: 0, vy: 0, facing: 1, onGround: true, healing: false, animT: 0, dashing: false, atkT: 0, atkDir: 'side', look };
}

function buildBricks(dim) {
  const cv = makeCanvas(W, H), g = cv.getContext('2d');
  const rng = mulberry32(4);
  px(g, 0, 0, W, H, '#07080f');
  for (let y = 0; y < H; y += 12) {
    for (let b = (y / 12 % 2) * 16 - 16; b < W; b += 32) {
      const v = Math.floor(rng() * 8);
      px(g, b + 1, y + 1, 30, 10, `rgb(${20 + v},${23 + v},${40 + v})`);
    }
  }
  g.fillStyle = `rgba(0,0,0,${dim})`;
  g.fillRect(0, 0, W, H);
  return cv;
}

function drawButton(ctx, cx, y, w, label, state, kind) {
  const L = cx - w / 2;
  let border = '#4a4e72', color = '#a8a8c4', fill = '#0a0c1a';
  if (state === 'focus') {
    if (kind === 'danger') { border = '#ff5a6a'; color = '#ff9aa4'; fill = '#2a0d12'; }
    else { border = '#f2c14e'; color = '#f2c14e'; fill = '#1d1a0a'; }
  } else if (state === 'disabled') { border = '#2a2c44'; color = '#4a4a66'; fill = '#080914'; }
  else if (kind === 'danger') { border = '#6a3a48'; color = '#b8808a'; }
  px(ctx, L, y, w, 22, fill);
  px(ctx, L, y, w, 2, border); px(ctx, L, y + 20, w, 2, border);
  px(ctx, L, y, 2, 22, border); px(ctx, L + w - 2, y, 2, 22, border);
  text(ctx, label, cx, y + 7, color, 'center');
  if (state === 'focus') { px(ctx, L + 8, y + 9, 4, 4, color); px(ctx, L + w - 12, y + 9, 4, 4, color); }
}

function glowAdd(ctx, x, y, r, rgb, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  radialLight(ctx, Math.round(x), Math.round(y), r, `rgba(${rgb},${a})`, `rgba(${rgb},0)`);
  ctx.restore();
}

// The controls shown in Settings and in the pause menu. Values stay short so they fit inside a panel.
function controlRows() {
  return [
    ['Move', 'Arrow keys'],
    ['Jump', keyName(KEYS.jump)],
    ['Attack', keyName(KEYS.attack)],
    ['Aim', 'Hold Up or Down'],
    ['Heal', `${keyName(KEYS.heal)} (hold)`],
    ['Dash', keyName(KEYS.dash)],
    ['Bee Bolt', keyName(KEYS.special)],
    ['Interact', keyName(KEYS.interact)],
    ['Pause', keyName(KEYS.cancel2)],
  ];
}

// ---------------------------------------------------------------- title

const KEPT_CELLS = [[60, '#e8e8e0'], [180, '#ffb040'], [300, '#ff4a4a'], [420, '#ffd86a']];

function buildKeptLayers() {
  const back = buildBricks(0.5), bg = back.getContext('2d');
  for (const [cx] of KEPT_CELLS) {
    px(bg, cx - 48, 80, 96, 140, '#04040a');
    px(bg, cx - 14, 118, 28, 26, '#0d0d18');
    px(bg, cx - 22, 144, 44, 76, '#0d0d18');
  }
  const front = makeCanvas(W, H), fg = front.getContext('2d');
  for (let b = 0; b < W; b += 16) { px(fg, b + 6, 72, 4, 156, '#454859'); px(fg, b + 6, 72, 2, 156, '#6a6e86'); }
  px(fg, 0, 80, W, 6, '#363a50'); px(fg, 0, 208, W, 6, '#363a50'); px(fg, 0, 72, W, 4, '#2a2d44');
  for (const [cx] of KEPT_CELLS) px(fg, cx + 48, 72, 6, 152, '#363a50');
  px(fg, 0, 224, W, 46, '#14172a'); px(fg, 0, 224, W, 4, '#4a4e72');
  return { back, front };
}

// Start and Settings hang side by side, and Music previews hangs from Settings ("from" is the sign it hangs from).
const TITLE_ITEMS = [
  { label: 'Start', x: 160, y: 108, w: 140, size: 12 },
  { label: 'Settings', x: 320, y: 108, w: 140, size: 12 },
  { label: 'Music previews', x: 346, y: 164, w: 148, size: 8, from: 1 },
  { label: 'Achievements', x: 134, y: 164, w: 148, size: 8, from: 0 },
];
const TITLE_NAV = [{ right: 1, down: 3 }, { left: 0, down: 2 }, { up: 1, left: 3 }, { up: 0, right: 2 }];

class TitleScene {
  constructor(index = 0) {
    this.t = 0;
    this.index = index;
    this.layers = buildKeptLayers();
    this.knight = idleKnight(LOOKS[0]);
    Music.play('whispers');          // keeps playing, and building, through the file and look screens
    const rng = mulberry32(11);
    this.motes = [];
    for (let i = 0; i < 40; i++) this.motes.push({ x: rng() * W, y: rng() * 230, s: 3 + rng() * 6, ph: rng() * 6 });
  }

  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    const nav = TITLE_NAV[this.index];
    let to;
    if (Input.pressed(KEYS.left)) to = nav.left;
    else if (Input.pressed(KEYS.right)) to = nav.right;
    else if (Input.pressed(KEYS.up)) to = nav.up;
    else if (Input.pressed(KEYS.down)) to = nav.down;
    if (to !== undefined) { this.index = to; Sfx.play('menu'); }
    if (Input.confirm()) {
      Sfx.play('confirm');
      if (this.index === 0) Game.go(() => new FileSelectScene());
      else if (this.index === 1) Game.go(() => new SettingsScene());
      else if (this.index === 3) Game.go(() => new AchievementsScene());
      else Game.go(() => new MusicPreviewScene());
    }
  }

  draw(ctx) {
    const t = this.t;
    const pulse = Music.pulse() * Math.min(1, Music.build() * 2);       // the screen throbs with the music as it builds
    ctx.save();
    if (pulse > 0.7 && Music.build() > 0.5) ctx.translate(0, 1);
    ctx.drawImage(this.layers.back, 0, 0);
    KEPT_CELLS.forEach(([cx, col], i) => {
      const blink = (t * 0.6 + i * 1.7) % 5 < 0.14;
      const h = blink ? 2 : 6;
      px(ctx, cx - 16, 128 + (6 - h) / 2, 6, h, col);
      px(ctx, cx + 10, 128 + (6 - h) / 2, 6, h, col);
    });
    ctx.drawImage(this.layers.front, 0, 0);

    // hanging lanterns at the sides
    const fl = 0.8 + 0.2 * Math.sin(t * 8) * Math.sin(t * 3.1);
    for (const lx of [64, 416]) {
      px(ctx, lx, 0, 2, 40, '#3a3a46');
      px(ctx, lx - 8, 40, 18, 4, '#3a3a46'); px(ctx, lx - 8, 44, 2, 18, '#3a3a46'); px(ctx, lx + 8, 44, 2, 18, '#3a3a46');
      px(ctx, lx - 6, 44, 14, 18, '#ffb347');
      ctx.globalAlpha = fl; px(ctx, lx - 3, 48, 8, 12, '#fff2b0'); ctx.globalAlpha = 1;
      px(ctx, lx - 8, 62, 18, 4, '#3a3a46');
      glowAdd(ctx, lx + 1, 54, 110, '255,179,71', 0.16 * fl + 0.12 * pulse);
    }

    // knight
    ctx.save();
    ctx.translate(240, 244);
    drawKnight(ctx, this.knight, t);
    ctx.restore();

    // motes
    for (const m of this.motes) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t + m.ph);
      px(ctx, (m.x + t * m.s) % W, m.y + Math.sin(t * 0.5 + m.ph) * 6, 2, 2, '#c8d0ff');
    }
    ctx.globalAlpha = 1;

    // hanging signs
    TITLE_ITEMS.forEach((it, i) => {
      const sel = i === this.index;
      const bob = n => Math.round(Math.sin(t * 1.4 + n * 2));
      const y = it.y + bob(i), hw = it.w / 2;
      const top = it.from === undefined ? 78 : TITLE_ITEMS[it.from].y + 44 + bob(it.from);
      px(ctx, it.x - hw + 24, top, 2, y - top, '#3a3a46');
      px(ctx, it.x + hw - 26, top, 2, y - top, '#3a3a46');
      if (sel) glowAdd(ctx, it.x, y + 18, 100, '255,179,71', 0.14);
      const h = it.from === undefined ? 44 : 34;
      px(ctx, it.x - hw, y, it.w, h, sel ? '#4a3a2a' : '#2a2d3c');
      px(ctx, it.x - hw, y, it.w, 4, sel ? '#ffb347' : '#4a4e72');
      px(ctx, it.x - hw, y + h - 4, it.w, 4, '#14152a');
      px(ctx, it.x - hw + 6, y + 8, 4, 4, '#14152a'); px(ctx, it.x + hw - 10, y + 8, 4, 4, '#14152a');
      text(ctx, it.label, it.x, y + (it.from === undefined ? 17 : 14), sel ? '#fff2b0' : '#8a8aa6', 'center', it.size);
    });

    text(ctx, 'WHERE THE FALLEN', 240, 10, '#c8ccd8', 'center', 24);
    text(ctx, 'KNEEL', 240, 40, '#c8ccd8', 'center', 24);
    text(ctx, `Arrows choose   ${keyName(KEYS.jump)} select`, 240, 254, '#6a6a8a', 'center');
    ctx.restore();
  }
}

// ---------------------------------------------------------------- file select

function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// How much of the game a file has finished, as a whole percent. Only trials that are built count (add the Pantheon here when it exists).
//   2%  the village raid          60%  every boss (the same share each; a boss counts once your best streak reached it)
//   12%  each trial cleared (4% each)     26%  every weapon and ability that is bought (the free starting ones do not count)
// It only shows 100% when every part is done.
const PROGRESS_TRIALS = ['pits', 'hive', 'foundry'];
function gameProgress(d) {
  const trials = TRIALS.filter(t => PROGRESS_TRIALS.includes(t.id));
  const totalBosses = trials.reduce((n, t) => n + t.bosses, 0);
  let pct = d.tutorialDone ? 2 : 0;
  for (const t of trials) {
    const beaten = Math.min(t.bosses, d.best[t.id] || 0);
    pct += 60 * beaten / totalBosses;
    if (d.cleared[t.id]) pct += 12 / trials.length;
  }
  const items = WEAPONS.filter(w => w.price > 0).map(w => d.weapons.includes(w.id)).concat(ABILITIES.filter(a => a.price > 0).map(a => d.abilities.includes(a.id)));
  pct += 26 * items.filter(Boolean).length / items.length;
  return pct > 99.999 ? 100 : Math.floor(pct + 1e-9);
}

function fileSummary(d) {
  const s = Math.floor(d.played || 0);
  return {
    coins: `${d.coins.toLocaleString('en-US')} coins`,
    pct: gameProgress(d),
    time: `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m played`,
  };
}

class FileSelectScene {
  constructor(sel = 0) {
    this.t = 0;
    this.sel = sel;
    this.focus = 'start';       // 'start' or 'delete'
    this.modal = null;          // null or { choice: 'keep' | 'delete' }
    this.bg = buildBricks(0.6);
    this.refresh();
  }

  refresh() { this.files = []; for (let n = 1; n <= SLOT_COUNT; n++) this.files.push(Save.peek(n)); }

  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    const left = Input.pressed(KEYS.left), right = Input.pressed(KEYS.right);
    const up = Input.pressed(KEYS.up), down = Input.pressed(KEYS.down);
    const file = this.files[this.sel];

    if (this.modal) {
      if (left || right) { this.modal.choice = this.modal.choice === 'keep' ? 'delete' : 'keep'; Sfx.play('menu'); }
      if (Input.cancel()) { this.modal = null; Sfx.play('cancel'); }
      else if (Input.confirm()) {
        if (this.modal.choice === 'delete') {
          Save.erase(this.sel + 1);
          this.refresh();
          this.focus = 'start';
          Sfx.play('deny');
        } else Sfx.play('cancel');
        this.modal = null;
      }
      return;
    }

    if (left && this.sel > 0) { this.sel--; this.focus = 'start'; Sfx.play('menu'); }
    if (right && this.sel < SLOT_COUNT - 1) { this.sel++; this.focus = 'start'; Sfx.play('menu'); }
    if (up || down) {
      if (this.files[this.sel]) { this.focus = this.focus === 'start' ? 'delete' : 'start'; Sfx.play('menu'); }
    }
    if (Input.cancel()) { Sfx.play('cancel'); Game.go(() => new TitleScene(0)); return; }
    if (Input.confirm()) {
      if (this.focus === 'delete' && file) { this.modal = { choice: 'keep' }; Sfx.play('menu'); }
      else if (file) {
        Sfx.play('confirm');
        Save.start(this.sel + 1);
        Game.go(() => (Save.data.tutorialDone ? new Hub() : new TutorialScene()));
      } else {
        // A new file is only created once a look is chosen.
        Sfx.play('confirm');
        const slot = this.sel + 1;
        Game.go(() => new CharacterScene(slot));
      }
    }
  }

  draw(ctx) {
    const t = this.t;
    ctx.drawImage(this.bg, 0, 0);
    text(ctx, 'Select file', 240, 10, '#e8e2d0', 'center', 16);
    px(ctx, 0, 28, W, 3, '#363a50');

    this.files.forEach((d, i) => {
      const c = 100 + i * 140, L = c - 60, sel = i === this.sel;
      px(ctx, c - 20, 31, 1, 8, '#3a3a46'); px(ctx, c + 20, 31, 1, 8, '#3a3a46');
      this.box(ctx, c - 40, 39, 80, 18, sel ? '#ffb347' : '#4a4e72', sel ? '#4a3a2a' : '#2a2d3c');
      text(ctx, `File ${i + 1}`, c, 44, sel ? '#fff2b0' : '#8a8aa6', 'center');
      if (sel) glowAdd(ctx, c, 100, 90, '255,179,71', 0.08 * (0.85 + 0.15 * Math.sin(t * 7)));

      px(ctx, L, 60, 120, 92, '#04040a');
      for (let b = 0; b < 120; b += 16) { px(ctx, L + b + 6, 60, 4, 92, '#454859'); px(ctx, L + b + 6, 60, 2, 92, '#6a6e86'); }
      px(ctx, L, 60, 120, 4, '#363a50'); px(ctx, L, 148, 120, 4, '#363a50');
      if (d) {
        ctx.save();
        ctx.translate(c, 142); ctx.scale(2, 2);
        drawKnight(ctx, idleKnight(LOOKS[d.look] || LOOKS[0]), t + i);
        ctx.restore();
      } else {
        px(ctx, c - 30, 140, 60, 4, '#6b5a34');
        text(ctx, 'Empty', c, 92, '#5a5a78', 'center');
      }
      if (!sel) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(L, 60, 120, 92); }

      this.box(ctx, L, 158, 120, 50, sel ? '#f2c14e' : '#4a4e72', '#0a0c1a');
      if (d) {
        const s = fileSummary(d);
        text(ctx, s.coins, c, 164, '#f2c14e', 'center');
        text(ctx, `${s.pct}% complete`, c, 178, s.pct >= 100 ? '#7fe88a' : '#e8e2d0', 'center');
        text(ctx, s.time, c, 192, '#8a8aa6', 'center');
      } else text(ctx, 'New file', c, 176, sel ? '#f2c14e' : '#8a8aa6', 'center');
    });

    const file = this.files[this.sel];
    drawButton(ctx, 170, 220, 130, file ? 'Start' : 'New game', this.focus === 'start' && !this.modal ? 'focus' : 'idle');
    drawButton(ctx, 310, 220, 130, 'Delete', !file ? 'disabled' : (this.focus === 'delete' && !this.modal ? 'focus' : 'idle'), 'danger');
    text(ctx, `Left/Right file   Up/Down button   ${keyName(KEYS.jump)} select   ${keyName(KEYS.attack)} back`, 240, 252, '#6a6a8a', 'center');

    if (this.modal) this.drawModal(ctx, file);
  }

  box(ctx, x, y, w, h, border, fill) {
    px(ctx, x, y, w, h, fill);
    px(ctx, x, y, w, 2, border); px(ctx, x, y + h - 2, w, 2, border);
    px(ctx, x, y, 2, h, border); px(ctx, x + w - 2, y, 2, h, border);
  }

  drawModal(ctx, file) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);
    this.box(ctx, 80, 62, 320, 146, '#ff5a6a', '#0c0e1a');
    px(ctx, 82, 64, 316, 2, '#23233f');
    text(ctx, `Delete File ${this.sel + 1}?`, 240, 76, '#ff9aa4', 'center');
    const msg = `This permanently erases ${file.coins.toLocaleString('en-US')} coins, every weapon, and every ability. You cannot undo it.`;
    wrapText(ctx, msg, 280).forEach((l, k) => text(ctx, l, 240, 98 + k * 14, '#e8e2d0', 'center'));
    drawButton(ctx, 170, 166, 130, 'Keep file', this.modal.choice === 'keep' ? 'focus' : 'idle');
    drawButton(ctx, 310, 166, 130, 'Delete', this.modal.choice === 'delete' ? 'focus' : 'idle', 'danger');
    text(ctx, `Left/Right   ${keyName(KEYS.jump)} confirm   ${keyName(KEYS.attack)} cancel`, 240, 194, '#6a6a8a', 'center');
  }
}

// ---------------------------------------------------------------- choose your look

class CharacterScene {
  constructor(slot) {
    this.t = 0;
    this.slot = slot;
    this.sel = 0;
    this.bg = buildBricks(0.62);
  }

  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    if (Input.pressed(KEYS.left) && this.sel > 0) { this.sel--; Sfx.play('menu'); }
    if (Input.pressed(KEYS.right) && this.sel < LOOKS.length - 1) { this.sel++; Sfx.play('menu'); }
    if (Input.cancel()) { Sfx.play('cancel'); Game.go(() => new FileSelectScene(this.slot - 1)); return; }
    if (Input.confirm()) {
      Sfx.play('confirm');
      Save.start(this.slot);
      Save.data.look = this.sel;
      Save.write();
      Game.go(() => new TutorialScene());
    }
  }

  draw(ctx) {
    const t = this.t;
    const bob = Math.sin(t * 3) > 0.35 ? 1 : 0;
    ctx.drawImage(this.bg, 0, 0);
    text(ctx, 'Choose your look', 240, 10, '#e8e2d0', 'center', 16);
    px(ctx, 0, 28, W, 3, '#363a50');

    LOOKS.forEach((L, i) => {
      const cx = 120 + i * 120, sel = i === this.sel;
      if (sel) glowAdd(ctx, cx, 130, 120, '255,179,71', 0.16 * (0.9 + 0.1 * Math.sin(t * 7)));
      px(ctx, cx - 52, 196, 104, 10, '#3a3e5c');
      px(ctx, cx - 52, 196, 104, 2, sel ? '#f2c14e' : '#5a5f88');
      px(ctx, cx - 46, 206, 92, 14, '#262942');
      ctx.drawImage(knightFrame(L, { bob: sel ? bob : 0, legs: 'stand', arm: 'rest', trail: 0 }), cx - 64, 68, 128, 128);
      text(ctx, L.name, cx, 209, sel ? '#f2c14e' : '#8a8aa6', 'center');
      if (!sel) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(cx - 60, 60, 120, 160); }
    });

    drawButton(ctx, 240, 226, 130, 'Begin', 'focus');
    text(ctx, `Left/Right look   ${keyName(KEYS.jump)} begin   ${keyName(KEYS.attack)} back`, 240, 256, '#6a6a8a', 'center');
  }
}

// ---------------------------------------------------------------- settings

class SettingsScene {
  constructor() {
    this.t = 0; this.row = 0;
    this.bg = buildBricks(0.62);
  }

  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    if (Input.pressed(KEYS.down) || Input.pressed(KEYS.up)) { this.row = 1 - this.row; Sfx.play('menu'); }
    const step =(Input.pressed(KEYS.right) ? 1 : 0) - (Input.pressed(KEYS.left) ? 1 : 0);
    if (step && this.row === 1) { Settings.devTools = !Settings.devTools; applyDevSetting(); Settings.write(); Sfx.play('menu'); }
    else if (step) {
      Settings.volume = clamp(Math.round((Settings.volume + step * 0.1) * 10) / 10, 0, 1);
      Sfx.setVolume(Settings.volume);
      Settings.write();
      Sfx.play('menu');
    }
    if (Input.cancel() || Input.confirm()) { Sfx.play('cancel'); Game.go(() => new TitleScene(1)); }
  }

  draw(ctx) {
    ctx.drawImage(this.bg, 0, 0);
    text(ctx, 'Settings', 240, 10, '#e8e2d0', 'center', 16);
    panel(ctx, 70, 34, 340, 210);

    text(ctx, 'Volume', 94, 52, this.row === 0 ? '#f2c14e' : '#e8e2d0');
    const pips = Math.round(Settings.volume * 10);
    for (let i = 0; i < 10; i++) px(ctx, 178 + i * 16, 50, 12, 12, i < pips ? '#f2c14e' : '#25263f');
    text(ctx, '<', 164, 52, '#f2c14e'); text(ctx, '>', 340, 52, '#f2c14e');
    text(ctx, `${Math.round(Settings.volume * 100)}%`, 386, 52, '#8a8aa6', 'right');
    text(ctx, 'Dev tools', 94, 66, this.row === 1 ? '#f2c14e' : '#e8e2d0');
    text(ctx, Settings.devTools ? 'ON' : 'OFF', 386, 66, Settings.devTools ? '#7fe88a' : '#8a8aa6', 'right');
    if (this.row === 1) { text(ctx, '<', 330, 66, '#f2c14e'); text(ctx, '>', 346, 66, '#f2c14e'); }

    px(ctx, 94, 79, 292, 1, C.panelInner);
    text(ctx, 'Controls', 94, 90, '#f2c14e');
    controlRows().forEach(([a, b], k) => {
      text(ctx, a, 94, 108 + k * 14, '#8a8aa6');
      text(ctx, b, 386, 108 + k * 14, '#e8e2d0', 'right');
    });
    text(ctx, `Up/Down row   Left/Right change   ${keyName(KEYS.attack)} back`, 240, 252, '#6a6a8a', 'center');
  }
}

// ---------------------------------------------------------------- music previews

const MUSIC_LIST = [
  // The Foundry's candidates: pick for each slot
  { id: 'foundryA', name: 'Assembly line', where: 'Foundry bosses 1 to 8' },
  { id: 'foundryC', name: 'Short circuit', where: 'Foundry bosses 1 to 8' },
  { id: 'foundryD', name: 'Scrapyard', where: 'Foundry bosses 1 to 8' },
  { id: 'foundrySprocket', name: 'Old Sprocket', where: 'Boss 9, phase 1' },
  { id: 'foundrySprocket2', name: 'Sprocket unbound', where: 'Boss 9, phase 2' },
  { id: 'foundryF1', name: 'The foundry awakens', where: 'Final boss, phase 1' },
  { id: 'foundryF2', name: 'Meltdown', where: 'Final boss, phase 2' },
  { id: 'whispers', name: 'Cell whispers', where: 'The title screen' },
  { id: 'lullaby', name: 'Distant lullaby', where: 'The Antechamber' },
  { id: 'village', name: 'Lowmere', where: 'The village before the raid' },
  { id: 'invasion', name: 'The raid', where: 'The village burning' },
  { id: 'pitA', name: "Gladiator's dirge", where: 'Pits bosses 1, 4 and 7' },
  { id: 'pitC', name: 'Dirge of the fallen', where: 'Pits bosses 2 and 5' },
  { id: 'finalB', name: 'No way back', where: 'Pits bosses 3 and 6' },
  { id: 'pitD', name: 'The hunt', where: 'The Pits final boss' },
  // The Hive's fight music
  { id: 'hiveA', name: 'The swarm', where: 'Hive bosses 1 to 9' },
  { id: 'hiveG', name: 'The taken queen', where: 'Hive bosses 1 to 9' },
  { id: 'hiveN', name: 'Swarm intelligence', where: 'Hive bosses 1 to 9' },
  { id: 'hiveO', name: 'Hornet march', where: 'Hive final, phase 1' },
  { id: 'hiveH', name: 'Stinger', where: 'Hive final, phase 2' },
  { id: 'hiveJ', name: 'The queen guard', where: 'Hive final, phase 3' },
];

class MusicPreviewScene {
  constructor() {
    this.t = 0;
    this.bg = buildBricks(0.62);
    this.index = 0; this.top = 0;
    this.playing = null;
    this.intensity = 0.5;
    Music.setIntensity(this.intensity);
  }

  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    const move = (Input.pressed(KEYS.down) ? 1 : 0) - (Input.pressed(KEYS.up) ? 1 : 0);
    if (move) {
      this.index = (this.index + move + MUSIC_LIST.length) % MUSIC_LIST.length; Sfx.play('menu');
      if (this.index < this.top) this.top = this.index;
      if (this.index >= this.top + 8) this.top = this.index - 7;
    }
    const side = (Input.pressed(KEYS.right) ? 1 : 0) - (Input.pressed(KEYS.left) ? 1 : 0);
    if (side) {
      this.intensity = clamp(Math.round((this.intensity + side * 0.1) * 10) / 10, 0, 1);
      Music.setIntensity(this.intensity);
      Sfx.play('menu');
    }
    if (Input.confirm()) {
      const id = MUSIC_LIST[this.index].id;
      if (this.playing === id) { this.playing = null; Music.play(null); }
      else { this.playing = id; Music.play(id); }
      Sfx.play('menu');
    }
    if (Input.cancel()) {
      Music.setIntensity(0);
      Sfx.play('cancel');
      Game.go(() => new TitleScene(2));
    }
  }

  draw(ctx) {
    ctx.drawImage(this.bg, 0, 0);
    text(ctx, 'Music previews', 240, 10, '#e8e2d0', 'center', 16);
    panel(ctx, 24, 34, 432, 184);
    if (this.top > 0) { px(ctx, 440, 38, 7, 1, '#f2c14e'); px(ctx, 441, 37, 5, 1, '#f2c14e'); px(ctx, 442, 36, 3, 1, '#f2c14e'); }
    if (this.top + 8 < MUSIC_LIST.length) { px(ctx, 440, 213, 7, 1, '#f2c14e'); px(ctx, 441, 214, 5, 1, '#f2c14e'); px(ctx, 442, 215, 3, 1, '#f2c14e'); }
    MUSIC_LIST.forEach((m, i) => {
      if (i < this.top || i >= this.top + 8) return;
      const y = 44 + (i - this.top) * 21, sel = i === this.index, on = this.playing === m.id;
      if (sel) { px(ctx, 30, y - 4, 420, 19, '#1d1f3a'); px(ctx, 30, y - 4, 3, 19, '#f2c14e'); }
      if (on) for (let b = 0; b < 3; b++) {
        const h = Math.round(2 + Math.abs(Math.sin(this.t * 6 + b * 1.7)) * 7);
        px(ctx, 38 + b * 4, y + 9 - h, 3, h, '#7fe8ff');
      }
      text(ctx, m.name, 56, y, on ? '#7fe8ff' : (sel ? '#ffffff' : C.dim));
      text(ctx, m.where, 442, y, sel ? '#c8ccd8' : '#5f5f84', 'right');
    });
    text(ctx, 'Intensity', 36, 232, '#e8e2d0');
    for (let i = 0; i < 10; i++) px(ctx, 120 + i * 14, 230, 10, 10, i < Math.round(this.intensity * 10) ? '#f2c14e' : '#25263f');
    text(ctx, 'for boss tracks', 270, 232, '#5f5f84');
    text(ctx, `Arrows choose   ${keyName(KEYS.jump)} play/stop   ${keyName(KEYS.attack)} back`, 240, 252, '#6a6a8a', 'center');
  }
}
