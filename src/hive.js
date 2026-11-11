'use strict';

// The Trial of the Bugs: a narrow honeycomb well, one screen tall. Ledges to climb, a honey pool below, a few soldiers watching from the rim.
// Between bosses you choose a gate: the left one leaves and banks your coins, the right one is the next boss's cage.
// The last boss (the armored queen) is four phases: the well, a long run across, a long climb up, and the well again.

const HIVE_GATE_L = 80, HIVE_GATE_R = 400;
const HIVE_FINAL_PRIZE = 250;
const HIVE_HONEY_Y = 258;

function buildWell() {
  const cv = makeCanvas(W, H), g = cv.getContext('2d'), rng = mulberry32(2024);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const hex = (cx, cy, r, f, s) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = 1; g.stroke(); } };
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#3a1e08'); grad.addColorStop(1, '#1a0c04'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  for (let r = 0; r < 11; r++) for (let q = 0; q < 17; q++) hex(q * 31 + (r % 2 ? 15 : 0), r * 27 + 8, 15, 'rgba(120,70,10,0.12)', 'rgba(255,190,70,0.08)');
  // the walls of the well: big honey cells, glowing from inside
  for (const side of [0, 1]) for (let col = 0; col < 2; col++) for (let r = 0; r < 14; r++) {
    const cx = side ? W - 7 - col * 10 : 7 + col * 10, cy = 8 + r * 20 + (col % 2 ? 10 : 0);
    hex(cx, cy, 9, 'rgba(110,60,8,0.92)', 'rgba(255,190,70,0.5)');
    if (rng() < 0.35) hex(cx, cy, 5, 'rgba(255,190,70,0.28)', null);
  }
  rect(HIVE_L - 4, 0, 4, H, '#4a2a08'); rect(HIVE_R, 0, 4, H, '#4a2a08'); rect(HIVE_L - 4, 0, 1, H, '#c88a20'); rect(HIVE_R + 3, 0, 1, H, '#c88a20');
  // the rim at the top, where the watchers stand
  rect(HIVE_L - 4, 0, HIVE_R - HIVE_L + 8, 26, '#2a1608'); rect(HIVE_L - 4, 26, HIVE_R - HIVE_L + 8, 4, '#6a4010'); rect(HIVE_L - 4, 26, HIVE_R - HIVE_L + 8, 1, '#c88a20');
  for (let x = HIVE_L; x < HIVE_R; x += 16) rect(x, 30, 3, 8, '#3a2408');
  return cv;
}

function drawWatcher(ctx, x, y, cheer, t, i) {
  const b = cheer ? Math.round(Math.sin(t * 10 + i) * 2) : 0;
  px(ctx, x - 4, y - 12 + b, 9, 12, '#6a6e86'); px(ctx, x - 4, y - 12 + b, 9, 2, '#9aa0b8'); px(ctx, x - 3, y - 18 + b, 7, 6, '#8a8ea2'); px(ctx, x - 1, y - 15 + b, 3, 1, '#14152a');
  px(ctx, x - 1, y - 22 + b, 3, 5, '#c0405a');
  if (cheer) px(ctx, x + 5, y - 20 + b - Math.round(Math.sin(t * 12 + i) * 2), 2, 8, '#8a8ea2');
}

class HiveScene {
  // a trial scene built on this one (the Foundry) changes these
  get roster() { return HIVE_BOSSES; }
  get trialId() { return 'hive'; }
  get theme() { return { frame: '#6a4010', fill: '#e0a830', hi: '#ffe070', title: '#e0a830', name: '#e8d8b0', soul: ['#c88a20', '#5a3410'] }; }
  buildBg() { return buildWell(); }
  constructor() {
    this.t = 0;
    this.width = W;
    this.player = new Player(240, GROUND_Y);
    this.player.look = LOOKS[Save.data.look] || LOOKS[0];
    this.targets = []; this.bosses = []; this.interactables = [];
    this.initFx();
    this.light = makeCanvas(W, H);
    this.bg = this.buildBg();
    this.idx = 0; this.pot = 0; this.stage = 'well';
    this.phase = 'intro'; this.pt = 0; this.locked = true;
    this.mode = 'play'; this.pauseMenu = null;
    this.curtain = 1; this.curtainTarget = 0; this.curtainCb = null;
    this.cage = null; this.cheerT = 0; this.hushed = false;
    this.focus = null; this.confirm = false; this.banner = 0; this.sinkT = 0; this.paid = false;
    this.camX = 0; this.camY = 0; this.run = null; this.caption = ''; this.captionT = 0;
    this.floodY = HIVE_HONEY_Y; this.floodTarget = HIVE_HONEY_Y; this.floodHold = 0;
    this.total = this.roster.length;
    this.watchers = [70, 155, 240, 325, 410].map((x, i) => ({ x, i }));
    this.resetPlatforms();
    Music.play(null); Music.setIntensity(0);
    this.startBoss(0, true);
  }

  // ------------------------------------------------------------ the ledges
  resetPlatforms() {
    const L = (x, y, w, o) => Object.assign({ x, y, w, honey: 0, gone: 0, stand: 0 }, o);
    this.allPlats = [L(60, GROUND_Y, 360, { solid: true }),
      L(34, 172, 70), L(205, 172, 70), L(376, 172, 70),
      L(112, 128, 70, { comb: true }), L(298, 128, 70),
      L(34, 84, 70), L(205, 84, 70), L(376, 84, 70),
      L(120, 40, 84), L(276, 40, 84)];
    this.platforms = this.allPlats.filter(p => !p.gone);
  }
  // a ledge turns to honey for a few seconds: it slows whoever stands on it
  honeyLedge(pl, secs) { if (pl) pl.honey = Math.max(pl.honey, secs); }
  updateLedges(dt) {
    const p = this.player;
    for (const pl of this.allPlats) {
      pl.honey = Math.max(0, pl.honey - dt);
      if (pl.comb) {
        if (pl.gone > 0) { pl.gone -= dt; if (pl.gone <= 0) { pl.gone = 0; pl.stand = 0; } }
        else if (p.onGround && p.platform === pl) pl.stand += dt;
        else if (pl.stand > 0 && pl.stand < 0.9) pl.stand = Math.max(0, pl.stand - dt * 0.5);
        if (pl.gone === 0 && pl.stand >= 0.9) { pl.gone = 3; Sfx.play('slam'); for (let i = 0; i < 8; i++) this.spawn({ x: pl.x + Math.random() * pl.w, y: pl.y + 4, vx: (Math.random() - 0.5) * 40, vy: Math.random() * 40, life: 0.6, color: '#c88a20', size: 2, grav: 300 }); }
      }
    }
    this.platforms = this.allPlats.filter(pl => !pl.gone);
  }

  // ------------------------------------------------------------ flow
  startBoss(i, first) {
    Ach.fightStart();
    this.idx = i; this.def = this.roster[i];
    this.stage = 'well';
    this.bosses = this.def.make();
    this.finalBoss = i === this.total - 1;
    this.targets = []; this.souls = []; this.projectiles = []; this.run = null;
    this.resetPlatforms();
    const p = this.player;
    p.x = 140; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.facing = 1; p.invuln = 0; p.rootT = 0; p.speedMul = 1; p.dead = p.hp <= 0;
    this.camX = 0; this.camY = 0;
    const cw = this.def.cageW === undefined ? 56 : this.def.cageW, cx = this.def.cageX || 330;
    this.cage = cw === 0 ? null : { x: cx, w: cw, h: 84, y: -20, rattle: 0 };
    this.phase = first ? 'intro' : 'cage'; this.pt = first ? -0.9 : 0;
    this.locked = true; this.hushed = false; this.sinkT = 0; this.paid = false; this.focus = null; this.interactables = []; this.banner = 0; this.lifted = false;
    Crowd.set(0.12);
  }

  updateCage(dt) {
    const c = this.cage, t = this.pt;
    if (!c) { this.banner = clamp(Math.min((t - 0.2) / 0.3, (1.8 - t) / 0.4), 0, 1); if (t > 2.0) this.beginFight(); return; }
    if (t < 0.8) { const k = t / 0.8; c.y = -20 + (GROUND_Y + 20) * k * k; c.rattle = 0; }
    else if (t < 1.4) {
      if (c.y !== GROUND_Y) { c.y = GROUND_Y; this.shake(5); Sfx.play('slam'); Sfx.play('chain'); this.cheer(0.8); dustWave(this, c.x - c.w / 2, 0, 8); dustWave(this, c.x + c.w / 2, 0, 8); }
      c.rattle = Math.round(Math.sin(t * 60));
      if (Math.random() < 0.05) Sfx.play('growl');
    } else if (t < 1.95) { const k = (t - 1.4) / 0.55; c.y = GROUND_Y - (GROUND_Y + 20) * k * k; c.rattle = 0; if (!this.lifted) { this.lifted = true; Sfx.play('gate'); } }
    else c.y = -40;
    for (const b of this.bosses) { b.idleUpdate(dt, this); b.y = c.y < GROUND_Y && t < 1.4 ? Math.min(GROUND_Y, c.y) : GROUND_Y; }
    this.banner = t > 1.5 ? clamp(Math.min((t - 1.5) / 0.3, (3.0 - t) / 0.4), 0, 1) : 0;
    if (t >= 3.0) this.beginFight();
  }

  beginFight() {
    this.phase = 'fight'; this.pt = 0; this.locked = false; this.cage = null; this.lifted = false; this.banner = 0;
    for (const b of this.bosses) b.engage();
    Music.play(this.def.music);
    this.updateIntensity();
  }

  updateIntensity() {
    const real = this.bosses.filter(b => !b.add), hp = real.reduce((s, b) => s + b.hp, 0), mx = real.reduce((s, b) => s + b.maxHp, 0) || 1;
    const base = this.finalBoss ? 0.4 : 0.05;
    Music.setIntensity(base + (1 - base) * (1 - hp / mx));
  }

  addBoss(b) { b.add = true; b.bl = HIVE_L + 8; b.br = HIVE_R - 8; this.bosses.push(b); if (this.phase === 'fight') b.engage(); }
  cheer(power) { this.cheerT = 1.4; Crowd.cheer(power); }
  caption_(text, secs) { this.caption = text; this.captionT = secs || 2.6; }

  fightOver() { return this.bosses.filter(b => !b.add).every(b => b.dying || b.dead); }

  bossFell(b) {
    if (b.add) return;
    this.hitstop = 0.22; this.shake(5); Sfx.play('kill');
    this.spawnSoul(b.x, b.y - b.h * 0.5, 2);
    for (let i = 0; i < 14; i++) this.spawn({ x: b.x + (Math.random() - 0.5) * b.w, y: b.y - Math.random() * b.h, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, life: 0.6, color: i % 2 ? '#c88a20' : '#5a3410', size: 2, grav: 320 });
    if (this.fightOver()) {
      Ach.fightWon(this);
      for (const x of this.bosses) if (x.add) { x.hp = 0; if (x.die) x.die(this); }
      this.phase = 'sink'; this.pt = 0; this.paid = false;
      Music.fade(); Crowd.hush(); this.hushed = true; Sfx.play('sink');
      Save.data.best[this.trialId] = Math.max(Save.data.best[this.trialId] || 0, this.idx + 1); Save.write();
    }
  }

  updateSink(dt) {
    const b0 = this.bosses.find(b => !b.add);
    if (!this.paid && this.pt > 1.5) {
      this.paid = true;
      const n = this.finalBoss ? 0 : this.def.coins;
      if (n) { this.pot += n; this.floater(b0.x, GROUND_Y - 50, `+${n}`, '#f2c14e'); }
      Sfx.play('coins');
      const cn = this.finalBoss ? 40 : 8 + Math.min(14, n / 3);
      for (let i = 0; i < cn; i++) this.spawn({ x: b0.x, y: Math.min(GROUND_Y - 16, b0.y - 10), vx: (Math.random() - 0.5) * 170, vy: -90 - Math.random() * 140, life: 1.2, color: i % 3 ? '#f2c14e' : '#fff0b0', size: 3, grav: 420 });
    }
    if (this.bosses.filter(b => !b.add).every(b => b.dead || b.sink >= 1) && this.pt > 2.5) {
      if (this.finalBoss) { this.phase = 'prize'; this.pt = 0; Music.setIntensity(0); this.cheer(1); }
      else this.beginBetween();
    }
  }

  beginBetween() {
    this.phase = 'between'; this.pt = 0;
    const p = this.player;
    if (p.hp < p.maxHp) { p.hp++; this.onHeal(p); }
    this.interactables = [{ kind: 'exit', x: HIVE_GATE_L, range: 28, label: 'Leave' }, { kind: 'next', x: HIVE_GATE_R, range: 28, label: 'Next' }];
    this.focus = null; this.bosses = this.bosses.filter(b => !b.add);
  }

  bank(extra) { Save.data.coins += this.pot + (extra || 0); this.pot = 0; Save.write(); }
  leave() { Crowd.set(0); Music.fade(); this.curtainTarget = 1; this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: this.trialId })); }; }
  goNext() { Sfx.play('gate'); this.curtainTarget = 1; this.curtainCb = () => this.startBoss(this.idx + 1, false); }

  // ------------------------------------------------------------ the queen's four phases (hivequeen.js does the work)
  queenDown(q) {
    this.hitstop = 0.3; this.shake(6); Sfx.play('kill'); Music.fade();
    for (let i = 0; i < 24; i++) this.spawn({ x: q.x + (Math.random() - 0.5) * 30, y: q.y - Math.random() * 40, vx: (Math.random() - 0.5) * 200, vy: -60 - Math.random() * 120, life: 0.8, color: i % 3 ? '#8a8ea2' : '#f0c850', size: 3, grav: 320 });
    this.spawnSoul(q.x, q.y - 20, 2);
    this.phase = 'trans'; this.pt = 0; this.transQueen = q; this.cheer(1);
    this.caption_(this.run && this.run.type === 'V' ? '' : 'THE QUEEN GIVES CHASE', 2.4);
  }
  startRun(type) {
    this.stage = 'run'; this.phase = 'run'; this.pt = 0; this.locked = false; this.bosses = []; this.targets = [];
    this.run = new HiveRun(this, type);
    this.platforms = this.run.platforms;
    this.width = type === 'H' ? this.run.LEN + 600 : W;          // the long run is wider than the screen
    Music.play('hiveH'); Music.setIntensity(0.5);
    this.caption_(type === 'H' ? 'RUN' : 'CLIMB', 2.4);
  }
  runDone() {
    this.curtainTarget = 1;
    this.curtainCb = () => {
      if (this.run.type === 'H') { this.startRun('V'); }
      else { this.run = null; this.camX = 0; this.camY = 0; this.startQueenFour(); }
    };
  }
  startQueenFour() {
    this.stage = 'well'; this.width = W; this.resetPlatforms(); this.idx = this.total - 1; this.def = this.roster[this.idx];
    this.bosses = [new ArmoredQueen(4)]; this.finalBoss = true;
    const p = this.player; p.x = 240; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.invuln = 0; p.rootT = 0; p.speedMul = 1;
    this.souls = []; this.projectiles = [];
    this.cage = null; this.phase = 'cage'; this.pt = 0; this.locked = true; this.banner = 0; this.sinkT = 0; this.paid = false;
    this.def = Object.assign({}, this.def, { music: 'hiveJ', name: 'The Queen, Unchained', sub: 'She has stopped running' });
  }

  // ------------------------------------------------------------ update
  update(dt) {
    if (this.mode === 'pause') { this.pauseMenu.update(); return; }
    this.t += dt;
    Save.data.played = (Save.data.played || 0) + dt;
    this.curtain = approach(this.curtain, this.curtainTarget, dt * 2.2);
    if (this.curtainCb && this.curtain >= 1) { const cb = this.curtainCb; this.curtainCb = null; cb(); this.curtainTarget = 0; }
    this.cheerT = Math.max(0, this.cheerT - dt);
    this.captionT = Math.max(0, this.captionT - dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 12);
    if (this.confirm) { this.updateConfirm(); return; }
    if (this.phase !== 'dead' && this.phase !== 'prize' && Input.pressed(KEYS.cancel2)) { this.mode = 'pause'; this.pauseMenu = new PauseMenu(() => { this.mode = 'play'; this.pauseMenu = null; }); Sfx.play('menu'); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }

    this.pt += dt;
    const p = this.player;
    if (this.phase === 'intro') { if (this.pt >= 0) { this.phase = 'cage'; this.pt = 0; } }
    else if (this.phase === 'cage') this.updateCage(dt);
    else if (this.phase === 'sink') this.updateSink(dt);
    else if (this.phase === 'between') this.updateBetween(dt);
    else if (this.phase === 'prize') this.updatePrize(dt);
    else if (this.phase === 'dead') this.updateDead(dt);
    else if (this.phase === 'trans') this.updateTrans(dt);

    this.locked = this.phase === 'intro' || this.phase === 'cage' || this.phase === 'prize' || this.phase === 'dead' || this.phase === 'trans';
    if (this.stage === 'well') this.updateLedges(dt);

    // the knight
    const inFlood = this.stage === 'well' && p.y > this.floodY + 2 && this.floodY < HIVE_HONEY_Y - 6;
    p.speedMul = (p.onGround && p.platform && p.platform.honey > 0) || inFlood ? 0.45 : 1;
    p.update(dt, this);
    if (this.stage === 'well') p.x = clamp(p.x, HIVE_L + 8, HIVE_R - 8);
    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    // the honey pool can rise (the queen's flood); it is a hit for every moment you stand in it
    if (this.floodHold > 0) { this.floodHold -= dt; if (this.floodHold <= 0) this.floodTarget = HIVE_HONEY_Y; }
    this.floodY = approach(this.floodY, this.floodTarget, (this.floodTarget < this.floodY ? 24 : 16) * dt);
    // falling into the honey costs a hit and puts the knight back on the floor ledge
    if (this.stage === 'well' && p.y > this.floodY && !p.dead) {
      Sfx.play('splash'); Ach.award('honey'); p.takeDamage(1, p.x, this);
      if (!p.dead && this.floodY >= HIVE_HONEY_Y - 6) { p.x = 240; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.invuln = 1.6; }
    }

    if (this.stage === 'run' && this.run && this.phase === 'run') { if (this.run.update(dt)) this.phase = 'runEnd', this.runDone(); }

    if (this.stage === 'well' && (this.phase === 'fight' || this.phase === 'sink' || this.phase === 'dead')) {
      this.targets = this.bosses.flatMap(b => b.targetList());
      for (const b of this.bosses.slice()) b.update(dt, this);
      this.bosses = this.bosses.filter(b => !(b.add && b.dead));
      if (this.phase === 'fight') this.checkHazards();
      this.updateIntensity();
    } else if (this.stage === 'run') { this.targets = this.run && this.run.targets ? this.run.targets() : []; if (this.phase === 'run') this.checkHazards(); }
    else this.targets = [];

    if (p.dead && this.phase !== 'dead') this.playerFell();
    if (p.dead && p.onGround) p.lying = true;
    this.updateFx(dt);
  }

  checkHazards() {
    const p = this.player;
    if (p.dead) return;
    const body = p.hitbox();
    const lists = this.bosses.map(b => ({ b, hs: b.hazards() }));
    if (this.run) lists.push({ b: this.run, hs: this.run.hazards() });
    for (const { b, hs } of lists) {
      for (const hz of hs) {
        if (!overlap(hz.box, body)) continue;
        if (hz.grab) { if (p.invuln <= 0 && p.rootT <= 0) { p.rootT = hz.grab; p.vx = 0; p.x = hz.box.x + hz.box.w / 2; if (b.onGrab) b.onGrab(hz, this); } continue; }
        const hit = p.takeDamage(hz.dmg || 1, hz.fromX == null ? b.x : hz.fromX, this);
        if (hit && hz.shot && !hz.shot.pierce) hz.shot.dead = true;
        if (hit && b.onHurt) b.onHurt(hz, this);
      }
    }
  }

  playerFell() {
    Ach.died(this.trialId, this.idx);
    this.phase = 'dead'; this.pt = 0;
    Music.fade(); Crowd.set(0.5); this.cheer(1);
    for (const b of this.bosses) b.vx = 0;
    Save.write();
  }
  updateDead() {
    if (this.pt > 2.3 && Input.confirm() && !this.curtainCb) { Sfx.play('cancel'); Crowd.set(0); this.curtainTarget = 1; this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: this.trialId })); }; }
  }
  updateTrans(dt) {
    const q = this.transQueen;
    if (q) { q.x += 120 * dt * (q.x < 240 ? -1 : 1); q.y -= 30 * dt; }
    if (this.pt > 2.2 && !this.curtainCb) { this.curtainTarget = 1; this.curtainCb = () => { this.transQueen = null; this.startRun('H'); }; }
  }
  updatePrize(dt) {
    if (this.pt > 0.4 && this.pt < 3.2 && Math.random() < 0.7) this.spawn({ x: 120 + Math.random() * 240, y: -4, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 60, life: 3, color: Math.random() < 0.7 ? '#f2c14e' : '#fff0b0', size: 3, grav: 120 });
    if (this.pt > 0.4 && this.pt < 3.5 && Math.random() < 0.03) this.cheer(1);
    if (this.pt > 3.4 && Input.confirm() && !this.curtainCb) {
      Sfx.play('buy'); this.bank(HIVE_FINAL_PRIZE);
      Save.data.cleared.hive = true; Ach.trialCleared('hive'); Save.data.bonusHp = Math.max(1, Save.data.bonusHp || 0); Save.write();
      Crowd.set(0); this.curtainTarget = 1; this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: this.trialId })); };
    }
  }
  updateBetween(dt) {
    const p = this.player;
    this.focus = null;
    if (p.onGround && !p.dashing && !this.curtainCb) {
      let best = 1e9;
      for (const it of this.interactables) { const d = Math.abs(p.x - it.x); if (d < it.range && d < best) { best = d; this.focus = it; } }
    }
    if (this.focus && Input.pressed(KEYS.interact) && p.atkT <= 0) { Sfx.play('confirm'); p.vx = 0; if (this.focus.kind === 'exit') this.confirm = true; else this.goNext(); }
  }
  updateConfirm() {
    if (Input.confirm()) { this.confirm = false; Sfx.play('confirm'); if (this.idx + 1 === this.total - 1) Ach.award('chicken'); this.bank(); this.leave(); }
    else if (Input.cancel()) { this.confirm = false; Sfx.play('cancel'); }
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const sx = (Math.random() - 0.5) * 2 * this.shakeAmt, sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    if (this.stage === 'run' && this.run) this.run.drawBack(ctx); else { ctx.drawImage(this.bg, 0, 0); this.drawWatchers(ctx); }
    ctx.save(); ctx.translate(-Math.round(this.camX), -Math.round(this.camY));
    if (this.stage === 'well') this.drawLedges(ctx);
    if (this.phase === 'between') this.drawGates(ctx);
    for (const b of this.bosses) b.drawAll(ctx, this.t);
    if (this.cage && this.cage.y > -30) drawCage(ctx, this.cage.x, this.cage.y, this.cage.w, this.cage.h, this.cage.rattle);
    if (this.run) this.run.drawWorld(ctx);
    const p = this.player;
    for (const a of this.afters) { ctx.globalAlpha = a.life / 0.18 * 0.35; drawKnight(ctx, { x: a.x, y: a.y, facing: a.facing, vx: 0, vy: 0, onGround: false, healing: false, animT: 0, dashing: true, atkT: 0, atkDir: 'side', look: p.look }, this.t); }
    ctx.globalAlpha = 1;
    drawKnight(ctx, p, this.t); drawSlash(ctx, p);
    if (p.healing) { const f = p.healT / PHYS.healTime; px(ctx, p.x - 8, p.y - 32, 16, 3, '#16213a'); px(ctx, p.x - 8, p.y - 32, Math.round(16 * f), 3, '#7fe8ff'); }
    if (p.rootT > 0) for (let i = 0; i < 3; i++) px(ctx, p.x - 8 + i * 6, p.y - 3 - (i % 2) * 3, 4, 8, '#b87810');
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const so of this.souls) so.draw(ctx, this.t);
    for (const q of this.particles) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); px(ctx, q.x, q.y, q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) { ctx.globalAlpha = clamp(f.life / 0.4, 0, 1); text(ctx, f.text, f.x, f.y, f.color, 'center'); }
    ctx.globalAlpha = 1;
    if (this.phase === 'between' && this.focus) this.drawPrompt(ctx, this.focus);
    ctx.restore();
    if (this.stage === 'well') this.drawHoney(ctx);
    this.drawLights(ctx);
    if (Dev.hitboxes) { ctx.save(); ctx.translate(-Math.round(this.camX), -Math.round(this.camY)); drawHitboxes(ctx, this); ctx.restore(); }
    ctx.restore();

    this.drawHud(ctx);
    drawHitboxLegend(ctx);
    if (this.phase === 'dead') this.drawDefeat(ctx);
    if (this.phase === 'prize') this.drawPrize(ctx);
    if (this.confirm) this.drawConfirm(ctx);
    if (this.curtain > 0.01) { ctx.fillStyle = `rgba(0,0,0,${this.curtain})`; ctx.fillRect(0, 0, W, H); }
    if (this.mode === 'pause') this.pauseMenu.draw(ctx);
  }

  drawWatchers(ctx) {
    const cheer = this.cheerT > 0, still = this.hushed;
    for (const w of this.watchers) drawWatcher(ctx, w.x, 26, cheer && !still, this.t, w.i);
  }

  drawLedges(ctx) {
    for (const pl of this.allPlats) {
      if (pl.gone > 0) continue;
      const h = pl.honey > 0, crack = pl.comb && pl.stand > 0.3, a = h ? '#e8a010' : (pl.comb ? '#c07818' : '#c8a050'), b = h ? '#ffe070' : (pl.comb ? '#f0a838' : '#f0d088');
      const sh = crack ? Math.round(Math.sin(this.t * 60) * 1) : 0;
      px(ctx, pl.x + sh, pl.y, pl.w, 7, a); px(ctx, pl.x + sh, pl.y, pl.w, 2, b); px(ctx, pl.x + sh, pl.y + 5, pl.w, 2, 'rgba(0,0,0,0.3)');
      if (pl.comb) for (let i = 8; i < pl.w - 4; i += 12) { px(ctx, pl.x + i - 3, pl.y + 2, 6, 1, 'rgba(70,30,0,0.8)'); px(ctx, pl.x + i - 3, pl.y + 4, 6, 1, 'rgba(70,30,0,0.8)'); }
      if (crack) { px(ctx, pl.x + pl.w * 0.3, pl.y, 1, 7, '#3a2410'); px(ctx, pl.x + pl.w * 0.65, pl.y, 1, 7, '#3a2410'); }
      if (h) for (let k = 4; k < pl.w - 3; k += 8) px(ctx, pl.x + k, pl.y + 7, 2, 5 + ((k + Math.floor(this.t * 4)) % 6), '#ffcf40');
    }
  }
  drawHoney(ctx) {
    const fy = this.floodY;
    for (let x = 0; x < W; x += 4) px(ctx, x, fy + 4 + Math.sin(this.t * 2.4 + x * 0.05) * 2, 4, 270 - fy, '#b87810');
    px(ctx, 0, fy + 2, W, 2, '#ffd060');
  }
  drawGates(ctx) {
    const near = this.focus, t = this.t;
    const nx = near && near.kind === 'exit';
    px(ctx, HIVE_GATE_L - 14, GROUND_Y - 44, 28, 44, nx ? '#1a1612' : '#0c0a10'); px(ctx, HIVE_GATE_L - 16, GROUND_Y - 46, 32, 3, '#6a4010'); px(ctx, HIVE_GATE_L - 16, GROUND_Y - 46, 3, 46, '#6a4010'); px(ctx, HIVE_GATE_L + 13, GROUND_Y - 46, 3, 46, '#6a4010');
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); px(ctx, HIVE_GATE_L - 12, GROUND_Y - 42, 24, 42, '#ffb347'); ctx.globalAlpha = 1;
    const nn = near && near.kind === 'next', blink = (t * 0.7) % 4 < 0.12 ? 1 : 3;
    px(ctx, HIVE_GATE_R - 14, GROUND_Y - 44, 28, 44, '#050308');
    px(ctx, HIVE_GATE_R - 6, GROUND_Y - 26, 4, blink, nn ? '#ff9a3a' : '#c0405a'); px(ctx, HIVE_GATE_R + 3, GROUND_Y - 26, 4, blink, nn ? '#ff9a3a' : '#c0405a');
    drawCage(ctx, HIVE_GATE_R, GROUND_Y, 32, 50, 0);
  }
  drawLights(ctx) {
    const t = this.t, p = this.player, lights = [];
    const cx = this.camX, cy = this.camY;
    if (this.stage === 'well') for (const y of [60, 130, 200]) for (const x of [HIVE_L, HIVE_R]) lights.push({ x, y, r: 90, i: 0.7 + 0.1 * Math.sin(t * 3 + y), c: '255,170,50' });
    lights.push({ x: p.x, y: p.y - 12, r: 66, i: 0.55, c: '255,230,170' });
    for (const b of this.bosses) if (!b.dead && b.eyes) lights.push({ x: b.x, y: b.y - b.h * 0.8, r: 34, i: 0.35, c: '255,90,60' });
    if (this.run) for (const L of this.run.lights()) lights.push(L);
    renderLights(ctx, this.light, cx, lights.map(L => ({ ...L, y: L.y - cy })), this.stage === 'run' ? 'rgba(14,6,2,0.4)' : 'rgba(14,6,2,0.34)');
  }
  drawPrompt(ctx, it) {
    let label, sub, color;
    if (it.kind === 'exit') { label = `[${keyName(KEYS.interact)}] Leave`; sub = `Bank ${this.pot} coins`; color = '#ffb347'; }
    else { label = `[${keyName(KEYS.interact)}] Next`; sub = this.roster[this.idx + 1].name; color = '#e0a830'; }
    const w = Math.max(textW(ctx, label), textW(ctx, sub)) + 14, h = 28, bob = Math.round(Math.sin(this.t * 4) * 1.5);
    const bx = Math.round(clamp(it.x - w / 2, 4, W - 4 - w)), by = GROUND_Y - 84 + bob;
    panel(ctx, bx, by, w, h, color); text(ctx, sub, bx + w / 2, by + 5, color, 'center'); text(ctx, label, bx + w / 2, by + 16, C.text, 'center');
  }
  bars() {
    const out = [];
    for (const b of this.bosses) { if (b.dead || b.noBar || b.add) continue; out.push(b.barInfo ? b.barInfo() : { name: b.name, hp: b.hp, max: b.maxHp }); }
    return out.filter(Boolean);
  }
  drawHud(ctx) {
    drawHealthHud(ctx, this.player, this.t);
    const label = String(this.pot), tw = textW(ctx, label);
    drawCoin(ctx, W - 12 - tw - 8, 9); text(ctx, label, W - 8, 8, C.gold, 'right'); text(ctx, 'carried', W - 8, 20, '#8a7a50', 'right');
    text(ctx, `BOSS ${Math.min(this.idx + 1, this.total)}/${this.total}`, W - 8, 32, '#8a8aa6', 'right');
    if (this.stage === 'run' && this.run) this.run.drawHud(ctx);
    const bars = (this.phase === 'fight' || (this.phase === 'cage' && this.banner > 0) || this.phase === 'sink') && this.stage === 'well' ? this.bars() : [];
    if (bars.length) {
      const total = 300, gap = 8, bw = Math.floor((total - gap * (bars.length - 1)) / bars.length), x0 = Math.round((W - total) / 2), y = 244, alpha = this.phase === 'cage' ? this.banner : 1;
      ctx.globalAlpha = alpha;
      bars.forEach((b, i) => {
        const x = x0 + i * (bw + gap), f = clamp(b.hp / b.max, 0, 1);
        text(ctx, b.name, x + bw / 2, y - 12, this.theme.name, 'center'); px(ctx, x - 2, y - 2, bw + 4, 12, this.theme.frame); px(ctx, x, y, bw, 8, '#140a04');
        px(ctx, x, y, Math.round(bw * f), 8, this.theme.fill); px(ctx, x, y, Math.round(bw * f), 2, this.theme.hi);
        for (const q of [0.25, 0.5, 0.75]) px(ctx, x + Math.round(bw * q), y, 1, 8, '#05060c');
      });
      ctx.globalAlpha = 1;
    }
    if (this.phase === 'cage' && this.banner > 0) { ctx.globalAlpha = this.banner; text(ctx, this.def.name.toUpperCase(), W / 2, 74, '#e8e2d0', 'center', 16); text(ctx, this.def.sub, W / 2, 98, this.theme.title, 'center'); ctx.globalAlpha = 1; }
    if (this.captionT > 0 && this.caption) { ctx.globalAlpha = clamp(Math.min(this.captionT, 1), 0, 1); text(ctx, this.caption, W / 2, 110, '#fff0b0', 'center', 16); ctx.globalAlpha = 1; }
  }
  drawConfirm(ctx) {
    const X = 100, Y = 78, PW = 280, PH = 110;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H); panel(ctx, X, Y, PW, PH, '#ffb347');
    text(ctx, 'LEAVE THE TRIAL?', X + PW / 2, Y + 12, '#ffb347', 'center'); text(ctx, `Bank ${this.pot} coins and go back.`, X + PW / 2, Y + 34, C.text, 'center');
    text(ctx, `Your best streak is ${Save.data.best[this.trialId] || 0}/${this.total}.`, X + PW / 2, Y + 48, C.dim, 'center');
    text(ctx, `${keyName(KEYS.jump)}  LEAVE`, X + 16, Y + PH - 20, C.good); text(ctx, `${keyName(KEYS.attack)}  STAY`, X + PW - 16, Y + PH - 20, C.dim, 'right');
  }
  drawDefeat(ctx) {
    const a = clamp((this.pt - 0.8) / 0.8, 0, 1); ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
    if (this.pt < 1.6) return;
    const X = 90, Y = 72, PW = 300, PH = 124, b = Save.data.best[this.trialId] || 0;
    panel(ctx, X, Y, PW, PH, '#c0405a'); text(ctx, 'YOU FELL', X + PW / 2, Y + 12, '#ff8a9a', 'center', 16); text(ctx, `Coins lost: ${this.pot}`, X + PW / 2, Y + 44, C.text, 'center');
    text(ctx, `Bosses beaten: ${this.idx}    Best streak: ${b}/${this.total}`, X + PW / 2, Y + 60, C.dim, 'center');
    if (this.pt > 2.3) text(ctx, `${keyName(KEYS.jump)}  RETURN`, X + PW / 2, Y + PH - 20, C.good, 'center');
  }
  drawPrize(ctx) {
    const t = this.pt, a = clamp(t / 0.8, 0, 1); ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
    const X = 70, Y = 44, PW = 340, PH = 182;
    ctx.globalAlpha = a; panel(ctx, X, Y, PW, PH, '#f2c14e');
    text(ctx, 'THE TRIAL OF THE BUGS IS OVER', X + PW / 2, Y + 12, '#f2c14e', 'center'); text(ctx, 'The queen is dead. The crowd is on its feet.', X + PW / 2, Y + 30, C.dim, 'center');
    const first = !(Save.data.bonusHp > 0);
    const rows = [[0.8, `Coins carried  ${this.pot}`, C.text], [1.3, `Final prize   ${HIVE_FINAL_PRIZE}`, C.gold], [1.8, first ? 'One more health. It is yours.' : 'Your extra health is already yours', '#ff9a9a'], [2.3, Save.data.cleared.foundry ? 'The Foundry stays open' : 'The gate to The Foundry stirs', '#3fc7d9']];
    rows.forEach(([at, s, c], i) => { if (t > at) { ctx.globalAlpha = a * clamp((t - at) / 0.3, 0, 1); text(ctx, s, X + PW / 2, Y + 54 + i * 18, c, 'center'); } });
    ctx.globalAlpha = a; if (t > 3.4) text(ctx, `${keyName(KEYS.jump)}  TAKE THE PRIZE`, X + PW / 2, Y + PH - 20, C.good, 'center'); ctx.globalAlpha = 1;
  }
}

Object.assign(HiveScene.prototype, FxHooks);
