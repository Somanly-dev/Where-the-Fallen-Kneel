'use strict';

// Achievements. They are shared by all three save files (stored on their own, and copied to IndexedDB like the saves).
// The game calls Ach.award(id) when something happens; the title screen has an Achievements sign that lists them.
// Secret ones show as ??? until they are earned. While invincibility (a dev tool) is on, skill achievements are not given.

const ACH_KEY = 'cc_bossgame_achievements_v1';

const ACHIEVEMENTS = [
  { id: 'raid', name: 'Out of the Fire', desc: 'Escape the raid on your village.' },
  { id: 'pits', name: 'Champion of the Pits', desc: 'Clear the Pits for the first time.' },
  { id: 'hive', name: 'Hive Breaker', desc: 'Clear the Trial of the Bugs for the first time.' },
  { id: 'foundry', name: 'Machine Breaker', desc: 'Clear the Foundry for the first time.' },
  { id: 'flawless', name: 'Untouched', desc: 'Beat any boss without taking a hit.' },
  { id: 'straight', name: 'No Turning Back', desc: 'Clear a trial the first time you enter it.' },
  { id: 'closecall', name: 'By a Thread', desc: 'Beat a boss with 1 health left.' },
  { id: 'arsenal', name: 'Armoury', desc: 'Own every weapon.' },
  { id: 'awakened', name: 'Fully Awakened', desc: 'Own every ability.' },
  { id: 'rich', name: 'Fat Purse', desc: 'Hold 1,000 coins at once.' },
  { id: 'honey', name: 'Sticky End', desc: 'Fall into the honey.', secret: true },
  { id: 'stubborn', name: 'Stubborn', desc: 'Fall to the same boss ten times.', secret: true },
  { id: 'chicken', name: 'Cold Feet', desc: 'Leave a trial right before its final boss.', secret: true },
  { id: 'rejected', name: 'Not Yet', desc: 'Be turned away from a sealed trial.', secret: true },
];

const Ach = {
  earned: {},                 // id -> time earned
  queue: [], cur: null, curT: 0,
  hits: 0, cheated: false, won: false, scanT: 0,

  load() {
    try { const raw = Store.get(ACH_KEY); this.earned = raw ? (JSON.parse(raw).earned || {}) : {}; } catch (e) { this.earned = {}; }
  },
  save() { Store.set(ACH_KEY, JSON.stringify({ earned: this.earned })); },
  has(id) { return !!this.earned[id]; },
  count() { return ACHIEVEMENTS.filter(a => this.earned[a.id]).length; },

  // earn one (once). It also queues the toast.
  award(id) {
    if (this.earned[id]) return false;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a) return false;
    this.earned[id] = Date.now(); this.save(); this.queue.push(a);
    return true;
  },

  // ---- boss fights: a flawless win and a win at 1 health
  fightStart() { this.hits = 0; this.cheated = !!Dev.invincible; this.won = false; },
  hit() { this.hits++; },
  fightWon(scene) {
    if (this.won) return;
    this.won = true;
    if (this.cheated || Dev.invincible) return;
    if (this.hits === 0) this.award('flawless');
    if (scene.player && scene.player.hp === 1) this.award('closecall');
  },
  // ---- trials
  entered(id) { const d = Save.data; if (!d) return; d.entries = d.entries || {}; d.entries[id] = (d.entries[id] || 0) + 1; Save.write(); },
  trialCleared(id) {
    this.award(id);
    const d = Save.data;
    if (d && d.entries && d.entries[id] === 1) this.award('straight');         // cleared on the very first visit
  },
  died(id, idx) {
    const d = Save.data; if (!d) return;
    d.deaths = d.deaths || {}; const k = id + ':' + idx; d.deaths[k] = (d.deaths[k] || 0) + 1; Save.write();
    if (d.deaths[k] >= 10) this.award('stubborn');
  },
  // things that are true of the save right now
  scan() {
    const d = Save.data; if (!d || Save.slot == null) return;
    if (d.coins >= 1000) this.award('rich');
    if (typeof WEAPONS !== 'undefined' && WEAPONS.every(w => d.weapons.includes(w.id))) this.award('arsenal');
    if (typeof ABILITIES !== 'undefined' && ABILITIES.every(a => d.abilities.includes(a.id))) this.award('awakened');
  },

  update(dt) {
    if (Dev.invincible) this.cheated = true;
    this.scanT -= dt; if (this.scanT <= 0) { this.scanT = 1; this.scan(); }
    if (this.cur) { this.curT += dt; if (this.curT > 3.8) this.cur = null; }
    if (!this.cur && this.queue.length) { this.cur = this.queue.shift(); this.curT = 0; Sfx.play('buy'); }
  },
  // a small banner at the top of the screen
  draw(ctx) {
    if (!this.cur) return;
    const k = clamp(Math.min(this.curT / 0.3, (3.8 - this.curT) / 0.3), 0, 1), y = Math.round(4 - (1 - k) * 36);
    ctx.globalAlpha = 0.5 + 0.5 * k;
    panel(ctx, 130, y, 220, 34, '#f2c14e');
    px(ctx, 136, y + 5, 26, 26, '#f2c14e'); px(ctx, 137, y + 6, 24, 24, '#1b1d33');
    ctx.drawImage(achIcon(this.cur.id, 'earned'), 137, y + 6);
    text(ctx, 'ACHIEVEMENT', 170, y + 8, '#f2c14e');
    text(ctx, this.cur.name, 170, y + 20, '#e8e2d0');
    ctx.globalAlpha = 1;
  },
};
Ach.load();

// ---------------------------------------------------------------- the icons: 24 x 24 pixel art, drawn by code once and kept
const ACH_ICON_FN = {
  raid(h) { const { R, ROWS } = h;                                        // a flame
    ROWS(12, 2, [2, 4, 6, 6, 8, 10, 12, 14, 16, 16, 18, 18, 18, 16, 14, 10], '#c0405a');
    ROWS(12, 4, [2, 4, 4, 6, 8, 10, 12, 14, 14, 16, 16, 16, 14, 12, 8], '#ff9a3a');
    ROWS(12, 9, [2, 4, 6, 8, 10, 10, 10, 8, 6, 4], '#ffd060');
    ROWS(12, 13, [2, 4, 6, 6, 4], '#fff0b0');
    R(17, 2, 2, 3, '#ff9a3a'); R(5, 7, 2, 2, '#ff9a3a'); R(19, 10, 2, 2, '#ffd060'); R(3, 13, 1, 1, '#ffd060'); },
  pits(h) { const { R, D, L } = h;                                        // crossed swords in a ring
    D(12, 12, 11, '#5a1c22'); D(12, 12, 9, '#1b1d33');
    L(5, 5, 19, 19, '#c8d0d8', 2); L(19, 5, 5, 19, '#c8d0d8', 2);
    R(3, 17, 5, 2, '#f2c14e'); R(16, 17, 5, 2, '#f2c14e'); R(3, 3, 3, 3, '#f2c14e'); R(18, 3, 3, 3, '#f2c14e'); D(12, 12, 2, '#c0405a'); },
  hive(h) { const { R, D, L, ROWS } = h;                                  // a cracked honeycomb cell and a bee
    ROWS(12, 2, [4, 8, 12, 16, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 16, 12, 8, 4], '#8a5a10');
    ROWS(12, 4, [4, 8, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 8, 4], '#e0a830');
    ROWS(12, 5, [2, 6, 8, 8, 8, 8], '#f0c860');
    L(9, 3, 13, 11, '#3a2410'); L(13, 11, 10, 19, '#3a2410'); R(13, 12, 2, 1, '#3a2410');
    D(17, 17, 3, '#f0c020'); R(16, 15, 1, 5, '#201000'); R(18, 15, 1, 5, '#201000'); R(14, 13, 2, 2, '#ffffff'); R(18, 13, 2, 2, '#ffffff'); },
  foundry(h) { const { R, D, L } = h;                                     // a broken gear
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; R(12 + Math.round(Math.cos(a) * 9) - 2, 12 + Math.round(Math.sin(a) * 9) - 2, 4, 4, '#8a9aa6'); }
    D(12, 12, 7, '#8a9aa6'); D(12, 12, 5, '#4a5660'); D(12, 12, 2, '#0a1218');
    L(12, 5, 15, 10, '#0a1218'); L(15, 10, 12, 14, '#0a1218'); L(12, 14, 15, 19, '#0a1218');
    R(18, 3, 2, 2, '#7fe8ff'); R(19, 2, 1, 4, '#e8fcff'); R(17, 4, 4, 1, '#e8fcff'); R(3, 18, 2, 2, '#7fe8ff'); },
  flawless(h) { const { R, ROWS } = h;                                    // an unmarked shield
    ROWS(12, 3, [16, 16, 16, 16, 16, 16, 15, 14, 12, 10, 8, 6, 4, 2], '#c8d0d8');
    ROWS(12, 5, [12, 12, 12, 12, 12, 11, 10, 8, 6, 4, 2], '#6a7a86');
    R(4, 3, 16, 2, '#f2c14e'); R(11, 5, 2, 12, '#8a9aa6'); R(7, 6, 1, 5, '#ffffff'); R(5, 8, 5, 1, '#ffffff'); },
  straight(h) { const { R, D } = h;                                       // a doorway and an arrow through it
    R(4, 9, 16, 13, '#3a3e5c'); D(12, 9, 8, '#3a3e5c');
    R(7, 11, 10, 11, '#0a0c1a'); D(12, 11, 5, '#0a0c1a');
    R(8, 15, 8, 2, '#f2c14e'); R(15, 13, 1, 6, '#f2c14e'); R(16, 14, 1, 4, '#f2c14e'); R(17, 15, 1, 2, '#f2c14e'); R(4, 21, 16, 2, '#25263f'); },
  closecall(h) { const { R, D, L, ROWS } = h;                             // a cracked heart on a thread
    R(12, 0, 1, 6, '#e8e2d0');
    D(8, 10, 4, '#c0405a'); D(16, 10, 4, '#c0405a'); ROWS(12, 11, [16, 14, 12, 10, 8, 6, 4, 2], '#c0405a');
    R(6, 8, 2, 2, '#ffb0c0'); L(12, 10, 10, 14, '#501020'); L(10, 14, 13, 17, '#501020'); },
  arsenal(h) { const { R, D, L, ROWS } = h;                               // spear, sword and axe
    L(3, 22, 8, 6, '#8a5a30', 2); ROWS(8, 2, [2, 4, 4], '#c8d0d8');
    L(20, 22, 16, 6, '#8a5a30', 2); D(15, 6, 3, '#c8d0d8'); D(15, 6, 1, '#6a7a86');
    R(11, 2, 2, 13, '#e8ecf4'); R(8, 15, 8, 2, '#f2c14e'); R(11, 17, 2, 4, '#8a5a30'); R(11, 21, 2, 2, '#f2c14e'); },
  awakened(h) { const { R, D, L } = h;                                    // a gem with wings
    for (const s of [-1, 1]) { L(12 + s * 5, 10, 12 + s * 10, 3, '#9fe8ff', 2); L(12 + s * 5, 12, 12 + s * 11, 8, '#c8f4ff', 2); L(12 + s * 5, 14, 12 + s * 10, 13, '#9fe8ff', 2); L(12 + s * 5, 16, 12 + s * 8, 19, '#7fe8ff', 2); }
    D(12, 12, 4, '#f2c14e'); D(12, 12, 2, '#fff0b0'); R(11, 5, 2, 2, '#fff0b0'); },
  rich(h) { const { R, D } = h;                                           // a coin purse
    D(11, 15, 7, '#8a5a30'); D(11, 15, 6, '#a8723a');
    R(9, 6, 5, 4, '#8a5a30'); R(7, 4, 9, 3, '#a8723a'); R(8, 9, 7, 2, '#f2c14e');
    D(18, 19, 3, '#f2c14e'); D(18, 19, 1, '#fff0b0'); D(5, 21, 2, '#f2c14e'); R(10, 13, 2, 6, '#fff0b0'); },
  honey(h) { const { R, D } = h;                                          // dripping honey
    R(3, 4, 18, 5, '#e0a830'); R(2, 5, 20, 3, '#e0a830'); R(4, 4, 10, 1, '#ffe070');
    R(5, 9, 3, 7, '#e0a830'); D(6, 17, 2, '#e0a830'); R(11, 9, 3, 11, '#e0a830'); D(12, 21, 2, '#e0a830'); R(17, 9, 3, 5, '#e0a830'); D(18, 15, 2, '#e0a830');
    R(5, 10, 1, 5, '#ffe070'); R(11, 10, 1, 8, '#ffe070'); },
  stubborn(h) { const { R, D, L } = h;                                    // a skull and a tally
    D(12, 10, 8, '#e8e2d0'); R(8, 16, 8, 5, '#e8e2d0');
    R(7, 9, 3, 4, '#14152a'); R(14, 9, 3, 4, '#14152a'); R(11, 14, 2, 2, '#14152a'); R(10, 19, 1, 2, '#14152a'); R(13, 19, 1, 2, '#14152a');
    R(1, 18, 1, 5, '#f2c14e'); R(3, 18, 1, 5, '#f2c14e'); R(5, 18, 1, 5, '#f2c14e'); R(7, 18, 1, 5, '#f2c14e'); L(0, 22, 8, 19, '#f2c14e'); },
  chicken(h) { const { R, L } = h;                                        // a frosty boot
    R(8, 3, 8, 12, '#4a6ac0'); R(8, 14, 13, 6, '#4a6ac0'); R(8, 20, 13, 2, '#1a2a50'); R(7, 3, 10, 2, '#9fc8ff'); R(10, 6, 1, 6, '#6a8ae0');
    R(9, 22, 2, 2, '#e8fcff'); R(14, 22, 2, 1, '#e8fcff'); R(18, 22, 2, 2, '#e8fcff');
    R(19, 3, 1, 7, '#e8fcff'); R(16, 6, 7, 1, '#e8fcff'); L(17, 4, 21, 8, '#e8fcff'); L(21, 4, 17, 8, '#e8fcff'); },
  rejected(h) { const { R, D } = h;                                       // a padlock
    R(7, 2, 10, 3, '#c8d0d8'); R(7, 2, 3, 9, '#c8d0d8'); R(14, 2, 3, 9, '#c8d0d8');
    R(5, 10, 14, 11, '#f2c14e'); R(5, 10, 14, 2, '#fff0b0'); R(5, 19, 14, 2, '#8a6a20');
    D(12, 15, 2, '#14152a'); R(11, 16, 2, 3, '#14152a'); R(1, 14, 3, 2, '#8a9aa6'); R(20, 14, 3, 2, '#8a9aa6'); },
};
const ACH_ICONS = {};
// state: 'earned' (colour), 'locked' (grey), 'secret' (a question mark)
function achIcon(id, state) {
  const key = id + ':' + state;
  if (ACH_ICONS[key]) return ACH_ICONS[key];
  const c = document.createElement('canvas'); c.width = 24; c.height = 24;
  const g = c.getContext('2d');
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const D = (cx, cy, r, col) => { for (let y = -r; y <= r; y++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - y * y))); R(cx - hw, cy + y, hw * 2 + 1, 1, col); } };
  const L = (x0, y0, x1, y1, col, t) => { t = t || 1; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, t, t, col); };
  const ROWS = (cx, y0, arr, col) => { arr.forEach((w, i) => R(cx - Math.floor(w / 2), y0 + i, w, 1, col)); };
  if (state === 'secret') {
    const k = '#6a6a8a'; R(8, 3, 8, 3, k); R(6, 5, 3, 5, k); R(15, 5, 3, 6, k); R(12, 10, 4, 3, k); R(10, 12, 3, 4, k); R(10, 19, 4, 4, k);
  } else {
    if (ACH_ICON_FN[id]) ACH_ICON_FN[id]({ R, D, L, ROWS });
    if (state === 'locked') {
      const d = g.getImageData(0, 0, 24, 24);
      for (let k = 0; k < d.data.length; k += 4) if (d.data[k + 3]) { const v = (d.data[k] * 0.3 + d.data[k + 1] * 0.59 + d.data[k + 2] * 0.11) * 0.5; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; }
      g.putImageData(d, 0, 0);
    }
  }
  return (ACH_ICONS[key] = c);
}

// ---------------------------------------------------------------- the list
class AchievementsScene {
  constructor() { this.t = 0; this.bg = buildBricks(0.62); this.sel = 0; this.top = 0; }
  update(dt) {
    this.t += dt;
    if (Game.pending) return;
    const move = (Input.pressed(KEYS.down) ? 1 : 0) - (Input.pressed(KEYS.up) ? 1 : 0);
    if (move) {
      this.sel = clamp(this.sel + move, 0, ACHIEVEMENTS.length - 1); Sfx.play('menu');
      if (this.sel < this.top) this.top = this.sel;
      if (this.sel > this.top + 6) this.top = this.sel - 6;
    }
    if (Input.cancel() || Input.confirm()) { Sfx.play('cancel'); Game.go(() => new TitleScene(3)); }
  }
  draw(ctx) {
    ctx.drawImage(this.bg, 0, 0);
    text(ctx, 'Achievements', 240, 8, '#e8e2d0', 'center', 16);
    text(ctx, `${Ach.count()} / ${ACHIEVEMENTS.length}`, 444, 12, '#f2c14e', 'right');
    panel(ctx, 30, 30, 420, 214);
    for (let r = 0; r < 7; r++) {
      const i = this.top + r, a = ACHIEVEMENTS[i];
      if (!a) break;
      const y = 36 + r * 29, got = Ach.has(a.id), hide = a.secret && !got;
      if (i === this.sel) { px(ctx, 36, y - 2, 408, 28, '#25263f'); px(ctx, 36, y - 2, 3, 28, '#f2c14e'); }
      px(ctx, 44, y + 1, 26, 26, got ? '#f2c14e' : '#4a4e72'); px(ctx, 45, y + 2, 24, 24, '#1b1d33');
      ctx.drawImage(achIcon(a.id, got ? 'earned' : (a.secret ? 'secret' : 'locked')), 45, y + 2);
      text(ctx, hide ? '???' : a.name, 78, y + 2, got ? '#f2c14e' : '#8a8aa6');
      text(ctx, hide ? 'A secret. Keep playing to find out.' : a.desc, 78, y + 14, got ? '#e8e2d0' : '#6a6a8a');
      if (got) text(ctx, 'DONE', 436, y + 8, '#7fe88a', 'right');
    }
    if (this.top > 0) text(ctx, '^', 440, 36, '#f2c14e', 'right');
    if (this.top + 7 < ACHIEVEMENTS.length) text(ctx, 'v', 440, 232, '#f2c14e', 'right');
    text(ctx, `Up/Down scroll   ${keyName(KEYS.attack)} back`, 240, 252, '#6a6a8a', 'center');
  }
}
