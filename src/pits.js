'use strict';

// The Pits: a mud pit ringed by timber stands. One boss at a time. Between bosses you choose a gate:
// the left gate leaves and banks your coins, the right gate is the cage of the next boss.

const GATE_L = 30, GATE_R = 450;
const TORCH_XS = [36, 146, 240, 334, 444];
const FINAL_PRIZE = 140;

// ------------------------------------------------------------------ crowd sound
// A far-off roar that is always there while the crowd is loud, plus cheers on top.
const Crowd = (() => {
  let ac = null, gain = null;
  function ensure() {
    if (gain) return true;
    ac = Sfx.ctx(); if (!ac) return false;
    const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), f = ac.createBiquadFilter();
    src.buffer = buf; src.loop = true;
    f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.6;
    gain = ac.createGain(); gain.gain.value = 0;
    src.connect(f); f.connect(gain); gain.connect(Sfx.out());
    src.start();
    return true;
  }
  return {
    set(v) { if (ensure()) gain.gain.setTargetAtTime(v * 0.1, ac.currentTime, 0.5); },     // 0 is silent, 1 is the loudest crowd
    cheer(power = 1) {
      if (!ensure()) return;
      const t = ac.currentTime, n = Math.floor(ac.sampleRate * 1.6), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + 0.7); f.frequency.linearRampToValueAtTime(700, t + 1.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * power, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55);
      s.connect(f); f.connect(g); g.connect(Sfx.out());
      s.start(t);
    },
    hush() { if (ensure()) gain.gain.setTargetAtTime(0, ac.currentTime, 0.15); },
  };
})();

// ------------------------------------------------------------------ arena art

function buildPit(level) {
  const cv = makeCanvas(W, H), g = cv.getContext('2d'), rng = mulberry32(900 + level * 31);
  const R = (a, b) => a + rng() * (b - a);
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  // the cave behind the stands
  const bands = ['#0a050c', '#120810', '#1a0b14', '#220e18', '#2a121c', '#301620'];
  bands.forEach((c, i) => rect(0, i * GROUND_Y / bands.length, W, Math.ceil(GROUND_Y / bands.length), c));
  for (let x = 0; x < W; x += 12) rect(x, 0, 12, 12 + rng() * 18, '#050308');
  for (let i = 0; i < 60; i++) rect(R(0, W), R(10, 100), R(6, 22), R(2, 5), '#1a0e14');

  // tiers of benches for the crowd
  [96, 78, 60].forEach(y => {
    rect(0, y, W, 4, '#2a1a12'); rect(0, y, W, 1, '#3e2a1c');
    for (let x = 30; x < W; x += 60) rect(x, y + 4, 4, 14, '#1c120c');
  });

  // the palisade: sharpened planks standing around the pit
  for (let x = 0; x < W; x += 8) {
    const top = 104 + Math.floor(rng() * 6) - 4, v = Math.floor(rng() * 10);
    rect(x, top, 7, GROUND_Y - top, `rgb(${40 + v},${28 + v},${20 + v})`);
    rect(x, top, 1, GROUND_Y - top, '#4a3426'); rect(x + 6, top, 1, GROUND_Y - top, '#150c08');
    rect(x + 2, top - 3, 3, 3, '#2c1e14'); rect(x + 3, top - 5, 1, 2, '#2c1e14');
  }
  for (let x = 20; x < W; x += 96) { rect(x - 3, 96, 7, GROUND_Y - 96, '#3a281a'); rect(x - 3, 96, 1, GROUND_Y - 96, '#5a4028'); }
  rect(0, 150, W, 3, '#1c120c'); rect(0, 182, W, 3, '#1c120c');                  // crossbeams

  // timber scaffolds at the sides, with the gates between them
  for (const [x0, dir] of [[0, 1], [W, -1]]) {
    for (const px0 of [x0 + dir * 8, x0 + dir * 30]) {
      rect(px0 - 3, 0, 7, GROUND_Y, '#3a281a'); rect(px0 - 3, 0, 1, GROUND_Y, '#5a4028'); rect(px0 + 3, 0, 1, GROUND_Y, '#150c08');
    }
    for (const y of [40, 92]) rect(Math.min(x0, x0 + dir * 38), y, 38, 5, '#2c1e14');
    pixLine(g, x0 + dir * 8, 40, x0 + dir * 30, 92, 3, '#2c1e14');
    pixLine(g, x0 + dir * 8, 92, x0 + dir * 30, 40, 3, '#2c1e14');
  }

  // torch brackets
  for (const x of TORCH_XS) { rect(x - 2, 120, 5, 3, '#15161c'); rect(x - 1, 122, 3, 16, '#2a1c14'); rect(x - 3, 118, 7, 3, '#15161c'); }

  // the exit gate (left) and the cage gate (right), cut into the palisade
  for (const [gx, dir] of [[GATE_L, 1], [GATE_R, -1]]) {
    rect(gx - 17, GROUND_Y - 62, 34, 62, '#050308');
    rect(gx - 19, GROUND_Y - 64, 38, 4, '#3a3d4a'); rect(gx - 19, GROUND_Y - 64, 4, 64, '#3a3d4a'); rect(gx + 15, GROUND_Y - 64, 4, 64, '#3a3d4a');
    for (let y = GROUND_Y - 58; y < GROUND_Y; y += 7) rect(gx - 15, y, 30, 1, '#14152a');
  }

  // the mud
  const mg = g.createLinearGradient(0, GROUND_Y, 0, H);
  mg.addColorStop(0, '#2a1c12'); mg.addColorStop(1, '#0c0705');
  g.fillStyle = mg; g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  rect(0, GROUND_Y, W, 2, '#52382a'); rect(0, GROUND_Y + 2, W, 1, '#1c120c');
  for (let i = 0; i < 70; i++) rect(R(0, W), GROUND_Y + R(4, 50), R(6, 24), 1, i % 2 ? '#1a100a' : '#3a281c');

  // blood: more of it for every boss that has fallen here
  for (let i = 0; i < 2 + level * 2; i++) {
    const x = R(10, W - 40), w = R(18, 56);
    g.globalAlpha = 0.5 + 0.05 * level; rect(x, GROUND_Y + R(1, 30), w, 2 + Math.floor(rng() * 2), '#5a1218');
    g.globalAlpha = 0.35; rect(x + 4, GROUND_Y + R(1, 30), w * 0.6, 1, '#8a2028');
    g.globalAlpha = 1;
  }
  for (let i = 0; i < level * 2 + 1; i++) {                                      // drips down the planks
    const x = Math.floor(R(10, W - 10)), len = R(10, 30 + level * 6);
    g.globalAlpha = 0.55; rect(x, GROUND_Y - len, 2, len, '#3a0e14'); g.globalAlpha = 1;
  }

  // bones in the mud
  for (let i = 0; i < 5 + level * 2; i++) {
    const x = R(60, W - 60), y = GROUND_Y + R(4, 40), k = Math.floor(rng() * 3);
    if (k === 0) { rect(x, y, 6, 5, '#cfc6a8'); rect(x + 1, y + 2, 1, 2, '#15110c'); rect(x + 4, y + 2, 1, 2, '#15110c'); rect(x + 1, y + 5, 4, 1, '#a89e84'); }
    else if (k === 1) { rect(x, y, 14, 2, '#cfc6a8'); rect(x - 1, y - 1, 3, 4, '#cfc6a8'); rect(x + 12, y - 1, 3, 4, '#cfc6a8'); }
    else { for (let r = 0; r < 4; r++) rect(x + r * 3, y - (r % 2), 2, 6, '#b8af94'); rect(x - 1, y + 5, 12, 1, '#8a8068'); }
  }

  // stakes: sharpened poles leaning along the foot of the palisade. There are more of them for every boss.
  const used = [];
  for (let i = 0; i < 3 + level * 2; i++) {
    let x, tries = 0;
    do { x = R(76, W - 76); tries++; } while (used.some(u => Math.abs(u - x) < 22) && tries < 30);
    used.push(x);
    const h = R(18, 38), lean = R(-4, 4);
    pixLine(g, x, GROUND_Y + 1, x + lean, GROUND_Y - h, 4, '#4a3626');
    pixLine(g, x, GROUND_Y + 1, x + lean, GROUND_Y - h, 1, '#6a4e38');
    rect(x + lean - 1, GROUND_Y - h - 4, 2, 4, '#4a3626');
    if (level >= 2 && rng() < 0.5) { rect(x + lean - 3, GROUND_Y - h - 8, 7, 6, '#cfc6a8'); rect(x + lean - 2, GROUND_Y - h - 6, 2, 2, '#15110c'); rect(x + lean + 1, GROUND_Y - h - 6, 2, 2, '#15110c'); }
  }
  return cv;
}

function drawCage(ctx, cx, bottom, w, h, rattle = 0) {
  const x0 = Math.round(cx - w / 2 + rattle), top = Math.round(bottom - h);
  for (let y = top - 6; y > -10; y -= 7) { px(ctx, Math.round(cx + rattle) - 1, y - 5, 3, 5, '#4a4e5e'); px(ctx, Math.round(cx + rattle), y - 3, 1, 2, '#1c1d24'); }
  px(ctx, x0 - 3, top - 5, w + 6, 5, '#3a3d4a'); px(ctx, x0 - 3, top - 5, w + 6, 1, '#6a6e86');
  for (let x = x0; x <= x0 + w; x += 8) { px(ctx, x, top, 2, h, '#23242e'); px(ctx, x, top, 1, h, '#5a5e72'); }
  px(ctx, x0 - 2, top + Math.round(h * 0.5), w + 4, 2, '#2a2d38');
  px(ctx, x0 - 3, bottom - 4, w + 6, 4, '#3a3d4a'); px(ctx, x0 - 3, bottom - 4, w + 6, 1, '#6a6e86');
}

function drawPlank(ctx, p, t) {
  px(ctx, p.x, p.y, p.w, 5, '#4a3626'); px(ctx, p.x, p.y, p.w, 1, '#7a5a3c'); px(ctx, p.x, p.y + 4, p.w, 1, '#1c120c');
  for (const cx of [p.x + 4, p.x + p.w - 6]) for (let y = p.y - 1; y > -8; y -= 6) { px(ctx, cx, y - 4, 2, 4, '#4a4e5e'); px(ctx, cx, y - 2, 2, 1, '#1c1d24'); }
}

// ------------------------------------------------------------------ the scene

class PitsScene {
  constructor() {
    this.t = 0;
    this.width = W;
    this.player = new Player(80, GROUND_Y);
    this.player.look = LOOKS[Save.data.look] || LOOKS[0];
    this.platforms = [
      { x: -100, y: GROUND_Y, w: W + 200, solid: true },
      { x: 92, y: 160, w: 62 },
      { x: 326, y: 160, w: 62 },
    ];
    this.targets = []; this.bosses = []; this.interactables = [];
    this.initFx();
    this.light = makeCanvas(W, H);

    this.idx = 0; this.pot = 0;
    this.phase = 'intro'; this.pt = 0;
    this.locked = true;
    this.mode = 'play'; this.pauseMenu = null;
    this.curtain = 1; this.curtainTarget = 0; this.curtainCb = null;
    this.cage = null; this.cheerT = 0; this.hushed = false;
    this.focus = null; this.confirm = false;
    this.banner = 0; this.panelT = 0; this.coinsShown = 0;
    this.sinkT = 0; this.paid = false;
    this.total = PIT_BOSSES.length;

    const rng = mulberry32(77);
    this.crowd = [];
    [[92, 40], [74, 36], [56, 32]].forEach(([y, n], r) => {
      for (let i = 0; i < n; i++) {
        const x = 46 + (i + rng() * 0.8) * ((W - 92) / n);
        this.crowd.push({ x, y, ph: rng() * 6, c: ['#3a1c20', '#4a2428', '#2e1618'][Math.floor(rng() * 3)], big: rng() < 0.2, horn: rng() < 0.12 });
      }
    });
    this.setLevel(0);
    Music.play(null); Music.setIntensity(0);
    this.startBoss(0, true);
  }

  // ------------------------------------------------------------ flow

  setLevel(i) {
    this.bg = buildPit(i);
    Crowd.set(0.25 + 0.1 * i);
  }

  startBoss(i, first) {
    Ach.fightStart();
    this.idx = i; this.def = PIT_BOSSES[i];
    this.bosses = this.def.make();
    this.finalBoss = i === this.total - 1;
    this.targets = []; this.souls = []; this.projectiles = [];
    const p = this.player;
    p.x = 84; p.y = GROUND_Y; p.vx = 0; p.vy = 0; p.facing = 1; p.invuln = 0; p.rootT = 0; p.speedMul = 1;
    this.setLevel(i);
    const cx = this.def.cageX || 330, cw = this.def.cageW || 60;
    this.cage = this.def.cageW === 0 ? null : { x: cx, w: cw, h: 84, y: -20, rattle: 0 };
    this.phase = first ? 'intro' : 'cage'; this.pt = first ? -0.9 : 0;
    this.locked = true; this.hushed = false; this.sinkT = 0; this.paid = false;
    this.focus = null; this.interactables = [];
    this.banner = 0;
    this.noCageSpawn = !this.cage;
  }

  // the cage drops, rattles, and lifts; then the name card, then the fight
  updateCage(dt) {
    const c = this.cage, t = this.pt;
    if (!c) { this.banner = clamp(Math.min((t - 0.2) / 0.3, (1.8 - t) / 0.4), 0, 1); if (t > 2.0) this.beginFight(); return; }
    const bottomRest = GROUND_Y;
    if (t < 0.8) { const k = t / 0.8; c.y = -20 + (bottomRest + 20) * k * k; c.rattle = 0; }
    else if (t < 1.4) {
      if (c.y !== bottomRest) { c.y = bottomRest; this.shake(5); Sfx.play('slam'); Sfx.play('chain'); this.cheer(1); dustWave(this, c.x - c.w / 2, 0, 8); dustWave(this, c.x + c.w / 2, 0, 8); }
      c.rattle = Math.round(Math.sin(t * 60) * 1);
      if (Math.random() < 0.05) Sfx.play('growl');
    } else if (t < 1.95) { const k = (t - 1.4) / 0.55; c.y = bottomRest - (bottomRest + 20) * k * k; c.rattle = 0; if (!this.lifted) { this.lifted = true; Sfx.play('gate'); } }
    else c.y = -40;
    for (const b of this.bosses) { b.idleUpdate(dt, this); if (c.y < GROUND_Y && t < 1.4) b.y = Math.min(GROUND_Y, c.y); else b.y = GROUND_Y; }
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
    const hp = this.bosses.reduce((s, b) => s + b.hp, 0), mx = this.bosses.reduce((s, b) => s + b.maxHp, 0) || 1;
    const base = this.finalBoss ? 0.4 : 0.05;
    Music.setIntensity(base + (1 - base) * (1 - hp / mx));
  }

  // add a fighter during a fight (a soldier walking in, for instance)
  addBoss(b) { this.bosses.push(b); if (this.phase === 'fight') b.engage(); }

  cheer(power) { this.cheerT = 1.4; Crowd.cheer(power); }

  // a boss has fallen. If that was the last of them, the pit goes quiet and the mud takes it.
  bossFell(b) {
    this.hitstop = 0.22; this.shake(5);
    Sfx.play('kill');
    this.spawnSoul(b.x, b.y - b.h * 0.5, 2);
    for (let i = 0; i < 14; i++) this.spawn({ x: b.x + (Math.random() - 0.5) * b.w, y: b.y - Math.random() * b.h, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 100, life: 0.6, color: i % 2 ? '#5a1c22' : '#2a1c14', size: 2, grav: 320 });
    if (this.fightOver()) {
      Ach.fightWon(this);
      this.phase = 'sink'; this.pt = 0; this.paid = false;
      Music.fade(); Crowd.hush(); this.hushed = true;
      Sfx.play('sink');
      Save.data.best.pits = Math.max(Save.data.best.pits || 0, this.idx + 1);
      Save.write();
    }
  }

  fightOver() { return this.bosses.every(x => x.dying || x.dead) && (!this.def.done || this.def.done(this)); }

  updateSink(dt) {
    if (!this.paid && this.pt > 1.5) {
      this.paid = true;
      const n = this.finalBoss ? 0 : this.def.coins, b = this.bosses[0];
      if (n) { this.pot += n; this.floater(b.x, GROUND_Y - 50, `+${n}`, '#f2c14e'); }
      Sfx.play('coins');
      const cn = this.finalBoss ? 18 : 8 + Math.min(10, (n || 0) / 2);
      for (let i = 0; i < cn; i++) this.spawn({ x: b.x, y: GROUND_Y - 16, vx: (Math.random() - 0.5) * 150, vy: -80 - Math.random() * 120, life: 1.0, color: i % 3 ? '#f2c14e' : '#fff0b0', size: 3, grav: 420 });
    }
    if (this.bosses.every(x => x.dead) && this.pt > 2.5) {
      if (this.finalBoss) { this.phase = 'prize'; this.pt = 0; Music.setIntensity(0); }
      else this.beginBetween();
    }
  }

  beginBetween() {
    this.phase = 'between'; this.pt = 0;
    const p = this.player;
    if (p.hp < p.maxHp) { p.hp++; this.onHeal(p); }       // a breath between bosses: one link is mended
    this.interactables = [
      { kind: 'exit', x: GATE_L, range: 34, label: 'Leave' },
      { kind: 'next', x: GATE_R, range: 34, label: 'Next' },
    ];
    this.nextCage = 0;
    this.focus = null;
  }

  bank(extra = 0) { Save.data.coins += this.pot + extra; this.pot = 0; Save.write(); }

  leave() {
    Crowd.set(0); Music.fade();
    this.curtainTarget = 1;
    this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: 'pits' })); };
  }

  goNext() {
    Sfx.play('gate');
    this.curtainTarget = 1;
    this.curtainCb = () => this.startBoss(this.idx + 1, false);
  }

  // ------------------------------------------------------------ update

  update(dt) {
    if (this.mode === 'pause') { this.pauseMenu.update(); return; }
    this.t += dt;
    Save.data.played = (Save.data.played || 0) + dt;
    this.curtain = approach(this.curtain, this.curtainTarget, dt * 2.2);
    if (this.curtainCb && this.curtain >= 1) { const cb = this.curtainCb; this.curtainCb = null; cb(); this.curtainTarget = 0; }
    this.cheerT = Math.max(0, this.cheerT - dt);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 12);
    this.panelT += dt;

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

    this.locked = this.phase === 'intro' || this.phase === 'cage' || this.phase === 'prize' || this.phase === 'dead';

    // the knight
    p.speedMul = 1;
    for (const b of this.bosses) if (b.slow) for (const z of b.slow()) if (p.onGround && p.x > z[0] && p.x < z[1]) p.speedMul = 0.5;
    p.update(dt, this);
    p.x = clamp(p.x, 14, W - 14);
    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    // the bosses
    if (this.phase === 'fight' || this.phase === 'sink' || this.phase === 'dead') {
      this.targets = this.bosses.flatMap(b => b.targetList());
      for (const b of this.bosses.slice()) b.update(dt, this);
      if (this.phase === 'fight') this.checkHazards();
      this.updateIntensity();
    } else this.targets = [];

    if (p.dead && this.phase !== 'dead') this.playerFell();
    if (p.dead && p.onGround) p.lying = true;

    this.updateFx(dt);
  }

  checkHazards() {
    const p = this.player;
    if (p.dead) return;
    const body = p.hitbox();
    for (const b of this.bosses) {
      for (const hz of b.hazards()) {
        if (!overlap(hz.box, body)) continue;
        if (hz.grab) {
          if (p.invuln <= 0 && p.rootT <= 0) { p.rootT = hz.grab; p.vx = 0; p.x = hz.box.x + hz.box.w / 2; if (b.onGrab) b.onGrab(hz, this); }
          continue;
        }
        const hit = p.takeDamage(hz.dmg || 1, hz.fromX == null ? b.x : hz.fromX, this);
        if (hit && hz.shot && !hz.shot.pierce) hz.shot.dead = true;
        if (hit && b.onHurt) b.onHurt(hz, this);
      }
    }
  }

  playerFell() {
    Ach.died('pits', this.idx);
    this.phase = 'dead'; this.pt = 0; this.panelT = 0;
    Music.fade(); Crowd.set(0.9); this.cheer(1);
    for (const b of this.bosses) { b.vx = 0; }
    Save.write();
  }

  updateDead(dt) {
    if (this.pt > 2.3 && Input.confirm() && !this.curtainCb) {
      Sfx.play('cancel');
      Crowd.set(0);
      this.curtainTarget = 1;
      this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: 'pits' })); };
    }
  }

  updatePrize(dt) {
    if (this.pt > 2.8 && Input.confirm() && !this.curtainCb) {
      Sfx.play('buy');
      this.bank(FINAL_PRIZE);
      Save.data.cleared.pits = true; Ach.trialCleared('pits');
      Save.data.bonusEnergy = Math.max(1, Save.data.bonusEnergy || 0);
      Save.write();
      Crowd.set(0);
      this.curtainTarget = 1;
      this.curtainCb = () => { Game.go(() => new Hub({ fromTrial: 'pits' })); };
    }
  }

  updateBetween(dt) {
    const p = this.player;
    this.focus = null;
    if (p.onGround && !p.dashing && !this.curtainCb) {
      let best = 1e9;
      for (const it of this.interactables) {
        const d = Math.abs(p.x - it.x);
        if (d < it.range && d < best) { best = d; this.focus = it; }
      }
    }
    if (this.focus && Input.pressed(KEYS.interact) && p.atkT <= 0) {
      Sfx.play('confirm'); p.vx = 0;
      if (this.focus.kind === 'exit') this.confirm = true;
      else this.goNext();
    }
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
    ctx.drawImage(this.bg, 0, 0);
    this.drawCrowd(ctx);
    this.drawTorches(ctx);
    this.drawBubbles(ctx);
    for (const pl of this.platforms) if (!pl.solid) drawPlank(ctx, pl, this.t);
    if (this.phase === 'between') this.drawGateCage(ctx);

    for (const b of this.bosses) b.drawAll(ctx, this.t);
    if (this.cage && this.cage.y > -30) drawCage(ctx, this.cage.x, this.cage.y, this.cage.w, this.cage.h, this.cage.rattle);

    const p = this.player;
    for (const a of this.afters) {
      ctx.globalAlpha = a.life / 0.18 * 0.35;
      drawKnight(ctx, { x: a.x, y: a.y, facing: a.facing, vx: 0, vy: 0, onGround: false, healing: false, animT: 0, dashing: true, atkT: 0, atkDir: 'side', look: p.look }, this.t);
    }
    ctx.globalAlpha = 1;
    drawKnight(ctx, p, this.t);
    drawSlash(ctx, p);
    if (p.healing) {
      const f = p.healT / PHYS.healTime;
      px(ctx, p.x - 8, p.y - 32, 16, 3, '#16213a'); px(ctx, p.x - 8, p.y - 32, Math.round(16 * f), 3, '#7fe8ff');
    }
    if (p.rootT > 0) for (let i = 0; i < 3; i++) px(ctx, p.x - 8 + i * 6, GROUND_Y - 6 - (i % 2) * 3, 4, 8, '#2a1c14');
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const so of this.souls) so.draw(ctx, this.t);
    for (const q of this.particles) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); px(ctx, q.x, q.y, q.size, q.size, q.color); }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) { ctx.globalAlpha = clamp(f.life / 0.4, 0, 1); text(ctx, f.text, f.x, f.y, f.color, 'center'); }
    ctx.globalAlpha = 1;
    if (this.phase === 'between' && this.focus) this.drawPrompt(ctx, this.focus);

    this.drawLights(ctx);
    if (Dev.hitboxes) drawHitboxes(ctx, this);
    ctx.restore();

    this.drawHud(ctx);
    drawHitboxLegend(ctx);
    if (this.phase === 'dead') this.drawDefeat(ctx);
    if (this.phase === 'prize') this.drawPrize(ctx);
    if (this.confirm) this.drawConfirm(ctx);
    if (this.curtain > 0.01) { ctx.fillStyle = `rgba(0,0,0,${this.curtain})`; ctx.fillRect(0, 0, W, H); }
    if (this.mode === 'pause') this.pauseMenu.draw(ctx);
  }

  drawCrowd(ctx) {
    const loud = this.cheerT > 0, still = this.hushed;
    for (const c of this.crowd) {
      const bob = still ? 0 : Math.round(Math.sin(this.t * (loud ? 9 : 2.5) + c.ph) * (loud ? 3 : 0.7));
      const y = c.y + bob + (still ? 1 : 0), w = c.big ? 8 : 6;
      px(ctx, c.x - w / 2, y - 9, w, 9, c.c);
      px(ctx, c.x - 2, y - 14, 5, 5, c.c);
      if (c.horn) { px(ctx, c.x - 3, y - 17, 1, 3, c.c); px(ctx, c.x + 3, y - 17, 1, 3, c.c); }
      if (loud) { px(ctx, c.x - w / 2 - 1, y - 16 + Math.round(Math.sin(this.t * 12 + c.ph) * 2), 1, 8, c.c); px(ctx, c.x + w / 2, y - 15 + Math.round(Math.sin(this.t * 12 + c.ph + 1) * 2), 1, 8, c.c); }
      px(ctx, c.x - 1, y - 12, 2, 1, '#8a5a38'); px(ctx, c.x - w / 2, y - 9, 1, 9, '#6a3a30');                        // a glint of torchlight on every face
    }
  }

  drawTorches(ctx) {
    for (const x of TORCH_XS) {
      const f = 0.7 + 0.3 * Math.sin(this.t * 11 + x) * Math.sin(this.t * 4.3 + x * 0.1);
      px(ctx, x - 2, 114, 5, 5, '#ff7a30'); px(ctx, x - 1, 111 - Math.round(f * 2), 3, 6, '#ffb347'); px(ctx, x, 109 - Math.round(f * 3), 1, 4, '#fff2b0');
    }
  }

  drawBubbles(ctx) {
    for (let i = 0; i < 9; i++) {
      const ph = (this.t * 0.35 + i * 0.37) % 1, x = (i * 53 + 31) % (W - 40) + 20, y = GROUND_Y + 8 + ((i * 29) % 36);
      if (ph < 0.7) { px(ctx, x, y - Math.round(ph * 3), 3, 1, '#4a3426'); px(ctx, x + 1, y - 1 - Math.round(ph * 3), 1, 1, '#6a4e38'); }
      else px(ctx, x - 1, y, 5, 1, '#2a1c12');
    }
  }

  drawGateCage(ctx) {
    const near = this.focus && this.focus.kind === 'next', t = this.t;
    // the next boss's cage, lowered at the right gate, with something shifting inside
    px(ctx, GATE_R - 14, GROUND_Y - 60, 30, 60, '#050308');
    const blink = (t * 0.7) % 4 < 0.12 ? 1 : 3;
    px(ctx, GATE_R - 6, GROUND_Y - 36, 4, blink, near ? '#ff9a3a' : '#c0405a'); px(ctx, GATE_R + 3, GROUND_Y - 36, 4, blink, near ? '#ff9a3a' : '#c0405a');
    drawCage(ctx, GATE_R, GROUND_Y, 36, 66, 0);
    // the exit
    const nx = this.focus && this.focus.kind === 'exit';
    px(ctx, GATE_L - 14, GROUND_Y - 56, 28, 56, nx ? '#1a1612' : '#0c0a10');
    px(ctx, GATE_L - 1, GROUND_Y - 56, 2, 56, '#2a2d38');
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3); px(ctx, GATE_L - 12, GROUND_Y - 54, 24, 54, '#ffb347'); ctx.globalAlpha = 1;
  }

  drawLights(ctx) {
    const t = this.t, p = this.player, lights = [];
    for (const x of TORCH_XS) {
      const f = 0.8 + 0.2 * Math.sin(t * 11 + x) * Math.sin(t * 4.3 + x * 0.1);
      lights.push({ x, y: 120, r: 110, i: 0.85 * f, c: '255,150,60' });
    }
    lights.push({ x: p.x, y: p.y - 12, r: 64, i: 0.5, c: '200,210,255' });
    for (const b of this.bosses) if (!b.dead && b.eyes) lights.push({ x: b.x, y: b.y - b.h * 0.8, r: 34, i: 0.35, c: '255,90,60' });
    if (this.phase === 'between') lights.push({ x: GATE_L, y: GROUND_Y - 30, r: 60, i: 0.6, c: '255,179,71' });
    renderLights(ctx, this.light, 0, lights, 'rgba(6,3,8,0.46)');
  }

  drawPrompt(ctx, it) {
    let label, sub, color;
    if (it.kind === 'exit') { label = `[${keyName(KEYS.interact)}] Leave`; sub = `Bank ${this.pot} coins`; color = '#ffb347'; }
    else { label = `[${keyName(KEYS.interact)}] Next`; sub = PIT_BOSSES[this.idx + 1].name; color = '#c0405a'; }
    const w = Math.max(textW(ctx, label), textW(ctx, sub)) + 14, h = 28;
    const bob = Math.round(Math.sin(this.t * 4) * 1.5);
    const bx = Math.round(clamp(it.x - w / 2, 4, W - 4 - w)), by = GROUND_Y - 90 + bob;
    panel(ctx, bx, by, w, h, color);
    text(ctx, sub, bx + w / 2, by + 5, color, 'center');
    text(ctx, label, bx + w / 2, by + 16, C.text, 'center');
  }

  bars() {
    // one bar per fighter, or whatever a boss reports about itself (a squad shows its numbers)
    const out = [];
    for (const b of this.bosses) {
      if (b.dead || b.noBar) continue;
      out.push(b.barInfo ? b.barInfo() : { name: b.name, hp: b.hp, max: b.maxHp });
    }
    return out.filter(Boolean);
  }

  drawHud(ctx) {
    const p = this.player;
    drawHealthHud(ctx, p, this.t);
    // coins carried in this run
    const label = String(this.pot), tw = textW(ctx, label);
    drawCoin(ctx, W - 12 - tw - 8, 9);
    text(ctx, label, W - 8, 8, C.gold, 'right');
    text(ctx, 'carried', W - 8, 20, '#8a7a50', 'right');
    text(ctx, `BOSS ${this.idx + 1}/${this.total}`, W - 8, 32, '#8a8aa6', 'right');

    // the boss bar
    const bars = (this.phase === 'fight' || this.phase === 'cage' && this.banner > 0 || this.phase === 'sink') ? this.bars() : [];
    if (bars.length) {
      const total = 300, gap = 8, bw = Math.floor((total - gap * (bars.length - 1)) / bars.length);
      const x0 = Math.round((W - total) / 2), y = 244;
      const alpha = this.phase === 'cage' ? this.banner : 1;
      ctx.globalAlpha = alpha;
      bars.forEach((b, i) => {
        const x = x0 + i * (bw + gap), f = clamp(b.hp / b.max, 0, 1);
        text(ctx, b.name, x + bw / 2, y - 12, '#d8c8c0', 'center');
        px(ctx, x - 2, y - 2, bw + 4, 12, '#454859'); px(ctx, x, y, bw, 8, '#14080c');
        px(ctx, x, y, Math.round(bw * f), 8, '#c0405a'); px(ctx, x, y, Math.round(bw * f), 2, '#e8707e');
        for (const q of [0.25, 0.5, 0.75]) px(ctx, x + Math.round(bw * q), y, 1, 8, '#05060c');
        if (b.text) text(ctx, b.text, x + bw / 2, y + 12, '#8a8aa6', 'center');
      });
      ctx.globalAlpha = 1;
    }
    // the name card
    if (this.phase === 'cage' && this.banner > 0) {
      ctx.globalAlpha = this.banner;
      text(ctx, this.def.name.toUpperCase(), W / 2, 74, '#e8e2d0', 'center', 16);
      text(ctx, this.def.sub, W / 2, 98, '#c0405a', 'center');
      ctx.globalAlpha = 1;
    }
  }

  drawConfirm(ctx) {
    const X = 100, Y = 78, PW = 280, PH = 110;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, X, Y, PW, PH, '#ffb347');
    text(ctx, 'LEAVE THE PITS?', X + PW / 2, Y + 12, '#ffb347', 'center');
    text(ctx, `Bank ${this.pot} coins and go back.`, X + PW / 2, Y + 34, C.text, 'center');
    text(ctx, `Your best streak is ${Save.data.best.pits || 0}/${this.total}.`, X + PW / 2, Y + 48, C.dim, 'center');
    text(ctx, `${keyName(KEYS.jump)}  LEAVE`, X + 16, Y + PH - 20, C.good);
    text(ctx, `${keyName(KEYS.attack)}  STAY`, X + PW - 16, Y + PH - 20, C.dim, 'right');
  }

  drawDefeat(ctx) {
    const a = clamp((this.pt - 0.8) / 0.8, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
    if (this.pt < 1.6) return;
    const X = 90, Y = 72, PW = 300, PH = 124, b = Save.data.best.pits || 0;
    panel(ctx, X, Y, PW, PH, '#c0405a');
    text(ctx, 'YOU FELL', X + PW / 2, Y + 12, '#ff8a9a', 'center', 16);
    text(ctx, `Coins lost: ${this.pot}`, X + PW / 2, Y + 44, C.text, 'center');
    text(ctx, `Bosses beaten: ${this.idx}    Best streak: ${b}/${this.total}`, X + PW / 2, Y + 60, C.dim, 'center');
    if (this.pt > 2.3) text(ctx, `${keyName(KEYS.jump)}  RETURN`, X + PW / 2, Y + PH - 20, C.good, 'center');
  }

  drawPrize(ctx) {
    const t = this.pt, a = clamp(t / 0.8, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`; ctx.fillRect(0, 0, W, H);
    const X = 70, Y = 44, PW = 340, PH = 182;
    ctx.globalAlpha = a; panel(ctx, X, Y, PW, PH, '#f2c14e');
    text(ctx, 'THE PITS ARE QUIET', X + PW / 2, Y + 12, '#f2c14e', 'center', 12);
    text(ctx, 'Eight have fallen. The crowd has gone.', X + PW / 2, Y + 30, C.dim, 'center');
    const first = !(Save.data.bonusEnergy > 0);
    const rows = [
      [0.8, `Coins carried  ${this.pot}`, C.text], [1.3, `Final prize   ${FINAL_PRIZE}`, C.gold],
      [1.8, first ? 'An energy slot is yours (7)' : 'Your energy slot is already yours', '#7fe8ff'], [2.3, Save.data.cleared.hive ? 'The Hive stays open' : 'The gate to The Hive opens', '#e0a830'],
    ];
    rows.forEach(([at, s, c], i) => { if (t > at) { ctx.globalAlpha = a * clamp((t - at) / 0.3, 0, 1); text(ctx, s, X + PW / 2, Y + 54 + i * 18, c, 'center'); } });
    ctx.globalAlpha = a;
    if (t > 2.8) text(ctx, `${keyName(KEYS.jump)}  TAKE THE PRIZE`, X + PW / 2, Y + PH - 20, C.good, 'center');
    ctx.globalAlpha = 1;
  }
}

Object.assign(PitsScene.prototype, FxHooks);
