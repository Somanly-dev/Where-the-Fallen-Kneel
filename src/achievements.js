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
    panel(ctx, 130, y, 220, 30, '#f2c14e');
    text(ctx, 'ACHIEVEMENT', 240, y + 6, '#f2c14e', 'center');
    text(ctx, this.cur.name, 240, y + 18, '#e8e2d0', 'center');
    ctx.globalAlpha = 1;
  },
};
Ach.load();

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
      px(ctx, 46, y + 4, 14, 14, got ? '#f2c14e' : '#2a2d3c'); px(ctx, 46, y + 4, 14, 2, got ? '#fff0b0' : '#4a4e72');
      if (got) { px(ctx, 50, y + 11, 3, 3, '#4a3a10'); px(ctx, 53, y + 13, 3, 3, '#4a3a10'); px(ctx, 56, y + 8, 2, 6, '#4a3a10'); } else text(ctx, hide ? '?' : '-', 53, y + 7, '#6a6a8a', 'center');
      text(ctx, hide ? '???' : a.name, 70, y + 2, got ? '#f2c14e' : '#8a8aa6');
      text(ctx, hide ? 'A secret. Keep playing to find out.' : a.desc, 70, y + 14, got ? '#e8e2d0' : '#6a6a8a');
      if (got) text(ctx, 'DONE', 436, y + 8, '#7fe88a', 'right');
    }
    if (this.top > 0) text(ctx, '^', 440, 36, '#f2c14e', 'right');
    if (this.top + 7 < ACHIEVEMENTS.length) text(ctx, 'v', 440, 232, '#f2c14e', 'right');
    text(ctx, `Up/Down scroll   ${keyName(KEYS.attack)} back`, 240, 252, '#6a6a8a', 'center');
  }
}
