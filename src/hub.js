'use strict';

const PEDDLER_X = 395;
const SMITH_X = 575;
const DUMMY_X = 960;
const GATE_X0 = 1280, GATE_DX = 150;
const LANTERNS =[300, 480, 650, 820, 1000, 1180, 1350, 1500, 1660, 1830].map((x, i) => ({ x, len: 56 + (i % 3) * 14, seed: i * 1.7 }));

// The Pits are open from the start. Every other trial opens once the one before it is cleared.
function trialOpen(i) { return i === 0 || !!Save.data.cleared[TRIALS[i - 1].id]; }

// A sealed gate: the portal is dark and chained shut.
function drawGateLock(ctx, g) {
  const x = g.x, y = GROUND_Y;
  ctx.globalAlpha = 0.82; px(ctx, x - 20, y - 88, 40, 88, '#05050c'); ctx.globalAlpha = 1;
  pixLine(ctx, x - 20, y - 78, x + 20, y - 30, 3, '#4a4e5e'); pixLine(ctx, x + 20, y - 78, x - 20, y - 30, 3, '#4a4e5e');
  pixLine(ctx, x - 20, y - 78, x + 20, y - 30, 1, '#8a8ea2'); pixLine(ctx, x + 20, y - 78, x - 20, y - 30, 1, '#8a8ea2');
  px(ctx, x - 6, y - 60, 12, 10, '#8a6a30'); px(ctx, x - 6, y - 60, 12, 2, '#c8a050'); px(ctx, x - 3, y - 66, 6, 7, '#4a4e5e'); px(ctx, x - 1, y - 56, 2, 4, '#1c1408');
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

class Hub {
  constructor(opts = {}) {
    this.t = 0;
    this.player = new Player(500, GROUND_Y);
    this.player.look = LOOKS[Save.data.look] || LOOKS[0];
    this.saveT = 0;
    this.lookAhead = 0;
    this.pause = null;
    this.dummy = new Dummy(DUMMY_X);
    this.targets = [this.dummy];
    this.platforms = [
      { x: -100, y: GROUND_Y, w: WORLD_W + 200, solid: true },
      { x: 830, y: 172, w: 52 },
      { x: 930, y: 130, w: 64 },
      { x: 1070, y: 172, w: 52 },
    ];
    this.initFx();
    Music.setIntensity(0);
    Music.play('lullaby');
    this.gatePulse = 0;
    this.cam = { x: clamp(500 - W / 2, 0, WORLD_W - W) };

    this.gates = TRIALS.map((trial, i) => ({ trial, x: GATE_X0 + GATE_DX * i }));
    this.interactables = [
      ...PRISONERS.map((p, i) => ({ kind: 'prisoner', index: i, x: CHAMBER.x + i * CHAMBER.cellW + CHAMBER.cellW / 2, range: 30, top: GROUND_Y - 78, label: 'Talk' })),
      { kind: 'peddler', x: PEDDLER_X, range: 46, top: GROUND_Y - 96, label: 'Abilities' },
      { kind: 'smith', x: SMITH_X, range: 46, top: GROUND_Y - 96, label: 'Weapons' },
      ...this.gates.map(g => ({ kind: 'gate', gate: g, x: g.x, range: 34, top: GROUND_Y - 36, label: 'Enter' })),
    ];
    this.focus = null;

    this.mode = 'play';
    this.dlg = null; this.shop = null; this.confirm = null; this.notice = null;
    this.fade = 0; this.fadeTarget = 0; this.pendingGate = null;

    this.smithHit = false;
    this.titleT = 0;

    this.wall = buildWall();
    this.ground = buildGround();
    this.backdrop = buildBackdrop();
    this.light = makeCanvas(W, H);

    const rng = mulberry32(5);
    this.motes = [];
    for (let i = 0; i < 60; i++) this.motes.push({ x: rng() * WORLD_W, y: 20 + rng() * 190, s: 4 + rng() * 8, ph: rng() * 6 });
    if (opts.intro) this.startIntro();
    if (opts.fromTrial) {                       // walking back out of a trial gate
      const gi = Math.max(0, TRIALS.findIndex(t => t.id === opts.fromTrial));
      this.player.x = GATE_X0 + GATE_DX * gi - 52; this.player.facing = -1;
      this.cam.x = clamp(this.player.x - W / 2, 0, WORLD_W - W); this.lookAhead = -28;
    }
  }

  // ------------------------------------------------------------ effect hooks used by entities

  // ------------------------------------------------------------ update
  update(dt) {
    if (this.mode === 'pause') { this.updatePause(dt); return; }   // the world stands still
    this.t += dt;
    this.titleT += dt;
    Save.data.played = (Save.data.played || 0) + dt;
    this.updateMusic();
    this.saveT += dt;
    if (this.saveT >= 20) { this.saveT = 0; Save.write(); }
    this.devKeys();

    this.fade = approach(this.fade, this.fadeTarget, dt * 1.8);

    if (this.mode === 'play') this.updatePlay(dt);
    else if (this.mode === 'dialogue') this.updateDialogue(dt);
    else if (this.mode === 'shop') this.updateShop(dt);
    else if (this.mode === 'confirm') this.updateConfirm(dt);
    else if (this.mode === 'entering') this.updateEntering(dt);
    else if (this.mode === 'notice') this.updateNotice(dt);

    this.dummy.update(dt);
    this.updateFx(dt);

    const p = this.player;
    this.lookAhead = approach(this.lookAhead, p.facing * 28, 90 * dt);   // eases when you turn around
    const target = clamp(p.x - W / 2 + this.lookAhead, 0, WORLD_W - W);
    this.cam.x += (target - this.cam.x) * Math.min(1, dt * 5);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 12);

    // smith swings every few seconds
    const phase = this.t % 3.4;
    if (phase < 0.5) {
      if (phase > 0.25 && !this.smithHit) {
        this.smithHit = true;
        for (let i = 0; i < 6; i++) this.spawn({ x: SMITH_X + 22, y: GROUND_Y - 14, vx: (Math.random() - 0.3) * 90, vy: -30 - Math.random() * 70, life: 0.5, color: '#ffc060', size: 1, grav: 260 });
      }
    } else this.smithHit = false;
  }

  devKeys() {
    if (!Settings.devTools) return;
    if (Input.pressed('Digit1')) { Save.data.coins += 100; Save.write(); Sfx.play('buy'); }
    if (Input.pressed('Digit2')) { this.player.hp = Math.max(1, this.player.hp - 1); Sfx.play('hit'); }
    if (Input.pressed('Digit4')) this.player.gainEnergy(3);
  }

  updatePlay(dt) {
    if (Input.pressed(KEYS.cancel2)) { this.openPause(); return; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    const p = this.player;
    p.update(dt, this);
    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    // nearest interactable in range
    this.focus = null;
    let best = 1e9;
    if (p.onGround && !p.dashing) {
      for (const it of this.interactables) {
        const d = Math.abs(p.x - it.x);
        if (d < it.range && d < best) { best = d; this.focus = it; }
      }
    }
    if (this.focus && Input.pressed(KEYS.interact) && p.atkT <= 0) this.interact(this.focus);
  }


  // ------------------------------------------------------------ interactions
  interact(it) {
    const p = this.player;
    p.vx = 0;
    Sfx.play('confirm');
    if (it.kind === 'prisoner') this.talk(it.index);
    else if (it.kind === 'peddler') this.openShop('abilities');
    else if (it.kind === 'smith') this.openShop('weapons');
    else if (it.kind === 'gate') {
      const i = TRIALS.indexOf(it.gate.trial);
      if (trialOpen(i)) { this.confirm = { gate: it.gate }; this.mode = 'confirm'; }
      else {
        this.notice = { title: it.gate.trial.name, color: it.gate.trial.color, lines: ['The gate is sealed.', `Clear ${TRIALS[i - 1].name} first.`] };
        this.mode = 'notice'; this.fadeTarget = 0.6; Sfx.play('deny'); Ach.award('rejected');
      }
    }
  }


  talk(i) {
    const pr = PRISONERS[i];
    // each prisoner belongs to one trial (same order), and speaks differently once it is cleared
    const won = !!Save.data.cleared[TRIALS[i].id];
    const key = won ? i + 'w' : i;
    const first = !Save.data.talked[key];
    const full = won ? pr.won : pr.lines, again = won ? pr.wonAgain : pr.again;
    let lines = first ? full : [again[Math.floor(Math.random() * again.length)]];
    if (pr.tip && !won && !Save.data.abilities.includes(pr.tip.needs)) lines = lines.concat(pr.tip.lines);      // a warning until the knight is ready
    this.startDialogue(pr.name, pr.color, lines, () => { Save.data.talked[key] = true; Save.write(); });
  }


  openShop(kind) {
    let quotes = kind === 'weapons' ? SMITH_QUOTES : PEDDLER_QUOTES;
    if (kind === 'weapons' && Save.data.cleared.pits) quotes = quotes.concat(SMITH_WON_QUOTES);
    let quote = quotes[Math.floor(Math.random() * quotes.length)];
    if (kind === 'weapons' && Save.data.cleared.pits && !Save.data.talked.smithNew) { quote = SMITH_NEW_LINE; Save.data.talked.smithNew = true; Save.write(); }
    if (kind === 'weapons' && Save.data.cleared.hive && !Save.data.talked.smithHive) { quote = SMITH_HIVE_LINE; Save.data.talked.smithHive = true; Save.write(); }
    if (kind === 'abilities' && Save.data.cleared.hive && !Save.data.talked.peddlerNew) { quote = PEDDLER_NEW_LINE; Save.data.talked.peddlerNew = true; Save.write(); }
    this.shop = { kind, index: 0, msg: '', msgT: 0, msgColor: C.text, quote };
    this.mode = 'shop';
  }

  shopItems() {
    if (this.shop.kind === 'weapons') return WEAPONS.filter(w => !w.after || Save.data.cleared[w.after]);
    return ABILITIES.filter(a => !a.after || Save.data.cleared[a.after] || Save.data.abilities.includes(a.id));      // the Bee Bolt is sold after the Trial of the Bugs
  }
  owns(kind, id) { return kind === 'weapons' ? Save.data.weapons.includes(id) : Save.data.abilities.includes(id); }

  shopMsg(text, color) { this.shop.msg = text; this.shop.msgT = 1.6; this.shop.msgColor = color; }

  updateShop(dt) {
    const s = this.shop, items = this.shopItems();
    s.msgT = Math.max(0, s.msgT - dt);
    if (Input.pressed(KEYS.up)) { s.index = (s.index + items.length - 1) % items.length; Sfx.play('menu'); }
    if (Input.pressed(KEYS.down)) { s.index = (s.index + 1) % items.length; Sfx.play('menu'); }
    if (Input.cancel()) { this.mode = 'play'; this.shop = null; Save.write(); Sfx.play('cancel'); return; }
    if (!Input.confirm()) return;

    const it = items[s.index];
    const owned = this.owns(s.kind, it.id);
    if (owned) {
      if (s.kind === 'weapons') {
        if (Save.data.equipped === it.id) this.shopMsg('Already equipped.', C.dim);
        else { Save.data.equipped = it.id; this.shopMsg(`Equipped ${it.name}.`, C.good); Sfx.play('confirm'); }
      } else this.shopMsg('You already own this.', C.dim);
    } else if (Save.data.coins >= it.price) {
      Save.data.coins -= it.price;
      if (s.kind === 'weapons') { Save.data.weapons.push(it.id); Save.data.equipped = it.id; }
      else Save.data.abilities.push(it.id);
      this.shopMsg(s.kind === 'weapons' ? `Bought and equipped ${it.name}!` : `Learned ${it.name}!`, C.gold);
      Sfx.play('buy');
      Save.write();
    } else {
      this.shopMsg(`Need ${it.price - Save.data.coins} more coins.`, C.bad);
      Sfx.play('deny');
    }
  }

  updateConfirm() {
    if (Input.confirm()) {
      this.pendingGate = this.confirm.gate;
      this.mode = 'entering'; this.fadeTarget = 1;
      Sfx.play('gate');
    } else if (Input.cancel()) { this.confirm = null; this.mode = 'play'; Sfx.play('cancel'); }
  }

  updateEntering() {
    if (this.fade >= 1) this.startTrial(this.pendingGate.trial);
  }

  startTrial(trial) {
    Ach.entered(trial.id);
    if (trial.id === 'pits') { Game.go(() => new PitsScene()); return; }
    if (trial.id === 'hive') { Game.go(() => new HiveScene()); return; }
    if (trial.id === 'foundry') { Game.go(() => new FoundryScene()); return; }
    this.notice = {
      title: trial.name, color: trial.color,
      lines: ['The gate shudders, then stays sealed.', 'This trial has not been built yet.'],
    };
    this.mode = 'notice'; this.fadeTarget = 0.88;
  }

  updateNotice() {
    if (Input.confirm() || Input.cancel()) {
      this.notice = null; this.confirm = null; this.pendingGate = null;
      this.mode = 'play'; this.fadeTarget = 0; Sfx.play('cancel');
    }
  }

  // ------------------------------------------------------------ draw
  draw(ctx) {
    const sx = (Math.random() - 0.5) * 2 * this.shakeAmt, sy = (Math.random() - 0.5) * 2 * this.shakeAmt;
    const cx = Math.round(this.cam.x + sx);
    ctx.save();
    ctx.translate(0, Math.round(sy));

    drawBackdrop(ctx, cx, this.t, this.backdrop);
    ctx.drawImage(this.wall, -cx, 0);
    this.drawShafts(ctx, cx);

    ctx.save();
    ctx.translate(-cx, 0);
    this.drawWorld(ctx);
    ctx.restore();

    this.drawFog(ctx);
    this.drawLighting(ctx, cx);
    if (Dev.hitboxes) { ctx.save(); ctx.translate(-cx, 0); drawHitboxes(ctx, this); ctx.restore(); }
    ctx.restore();

    this.drawHud(ctx);
    drawHitboxLegend(ctx);
    if (this.mode === 'dialogue') this.drawDialogue(ctx);
    if (this.fade > 0.01) { ctx.fillStyle = `rgba(0,0,0,${this.fade})`; ctx.fillRect(0, 0, W, H); }
    if (this.mode === 'shop') this.drawShop(ctx);
    if (this.mode === 'confirm') this.drawConfirm(ctx);
    if (this.mode === 'notice') this.drawNotice(ctx);
    if (this.mode === 'pause') this.drawPause(ctx);
  }

  drawShafts(ctx, cx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(120,150,255,0.045)';
    for (const wx of WINDOW_XS) {
      const x = wx - cx;
      ctx.beginPath();
      ctx.moveTo(x - 18, 70); ctx.lineTo(x + 18, 70);
      ctx.lineTo(x + 78, GROUND_Y); ctx.lineTo(x + 6, GROUND_Y);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFog(ctx) {
    const g = ctx.createLinearGradient(0, 168, 0, GROUND_Y);
    g.addColorStop(0, 'rgba(110,120,200,0)');
    g.addColorStop(1, 'rgba(110,120,200,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 168, W, GROUND_Y - 168);
  }

  drawWorld(ctx) {
    const t = this.t, p = this.player;

    drawChamber(ctx, t);
    PRISONERS.forEach((pr, i) => drawPrisoner(ctx, i, CHAMBER.x + i * CHAMBER.cellW + CHAMBER.cellW / 2, GROUND_Y, t));
    drawChamberBars(ctx);

    for (const l of LANTERNS) drawLantern(ctx, l.x, l.len, t, l.seed);

    drawPeddler(ctx, PEDDLER_X, GROUND_Y, t);
    const ph = this.t % 3.4;
    drawSmith(ctx, SMITH_X, GROUND_Y, t, ph < 0.5 ? ph / 0.5 : 0);
    drawSign(ctx, 770, 'TRAINING');

    ctx.drawImage(this.ground, 0, GROUND_Y);
    for (const pl of this.platforms) if (!pl.solid) drawPlatform(ctx, pl);

    for (const g of this.gates) {
      const near = this.focus && this.focus.gate === g;
      drawGate(ctx, g, t, near, Save.data.best[g.trial.id] || 0);
      if (!trialOpen(TRIALS.indexOf(g.trial))) drawGateLock(ctx, g);
    }

    drawDummy(ctx, this.dummy);
    const dps = this.dummy.dps(this.t);
    if (dps !== null) text(ctx, `DPS ${dps.toFixed(1)}`, this.dummy.x, this.dummy.y - 66, '#ffe9a0', 'center');

    // afterimages
    for (const a of this.afters) {
      ctx.globalAlpha = a.life / 0.18 * 0.35;
      drawKnight(ctx, { x: a.x, y: a.y, facing: a.facing, vx: 0, vy: 0, onGround: false, healing: false, animT: 0, dashing: true, atkT: 0, atkDir: 'side', look: p.look }, t);
    }
    ctx.globalAlpha = 1;

    drawKnight(ctx, p, t);
    drawSlash(ctx, p);
    if (p.healing) {
      const f = p.healT / PHYS.healTime;
      px(ctx, p.x - 8, p.y - 32, 16, 3, '#16213a');
      px(ctx, p.x - 8, p.y - 32, Math.round(16 * f), 3, '#7fe8ff');
    }
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const so of this.souls) so.draw(ctx, this.t);

    // motes
    for (const m of this.motes) {
      const x = (m.x + Math.sin(this.t * 0.3 + m.ph) * 20 + this.t * m.s * 0.4) % WORLD_W;
      const y = m.y + Math.sin(this.t * 0.5 + m.ph) * 6;
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.t + m.ph);
      px(ctx, x, y, 1, 1, '#c8d0ff');
    }
    ctx.globalAlpha = 1;

    for (const q of this.particles) {
      ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
      px(ctx, q.x, q.y, q.size, q.size, q.color);
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      ctx.globalAlpha = clamp(f.life / 0.4, 0, 1);
      text(ctx, f.text, f.x, f.y, f.color, 'center');
    }
    ctx.globalAlpha = 1;

    if (this.mode === 'play' && this.focus) this.drawPrompt(ctx, this.focus);
  }

  drawPrompt(ctx, it) {
    const sealed = it.kind === 'gate' && !trialOpen(TRIALS.indexOf(it.gate.trial));
    const label = `[${keyName(KEYS.interact)}] ${sealed ? 'Sealed' : it.label}`;
    const sub = it.kind === 'gate' ? it.gate.trial.name : (it.kind === 'prisoner' ? PRISONERS[it.index].name : null);
    const w = Math.max(textW(ctx, label), sub ? textW(ctx, sub) : 0) + 14;
    const h = sub ? 28 : 16;
    const bob = Math.round(Math.sin(this.t * 4) * 1.5);
    const bx = Math.round(clamp(it.x - w / 2, this.cam.x + 4, this.cam.x + W - 4 - w));
    const by = it.top - h + bob;
    panel(ctx, bx, by, w, h, it.kind === 'gate' ? it.gate.trial.color : C.panelBorder);
    if (sub) {
      text(ctx, sub, bx + w / 2, by + 5, it.kind === 'gate' ? it.gate.trial.color : PRISONERS[it.index].color, 'center');
      text(ctx, label, bx + w / 2, by + 16, C.text, 'center');
    } else text(ctx, label, bx + w / 2, by + 4, C.text, 'center');
  }

  drawLighting(ctx, cx) {
    const t = this.t, p = this.player;
    const lights = [];
    for (const l of LANTERNS) {
      const fl = 0.8 + 0.2 * Math.sin(t * 8 + l.seed) * Math.sin(t * 3.1 + l.seed);
      lights.push({ x: l.x, y: l.len + 6, r: 95, i: 0.7 * fl, c: '255,176,90' });
    }
    const ff = 0.75 + 0.25 * Math.sin(t * 9) * Math.sin(t * 5.3);
    lights.push({ x: SMITH_X + 61, y: GROUND_Y - 16, r: 120, i: 0.95 * ff, c: '255,120,40' });
    lights.push({ x: PEDDLER_X, y: GROUND_Y - 44, r: 85, i: 0.75, c: '150,120,255' });
    lights.push({ x: 144, y: GROUND_Y - 40, r: 150, i: 0.75, c: '130,150,210' });
    for (const g of this.gates) lights.push({ x: g.x, y: GROUND_Y - 44, r: 100, i: (0.85 + 0.3 * this.gatePulse) * (trialOpen(TRIALS.indexOf(g.trial)) ? 1 : 0.35), c: hexRgb(g.trial.color) });
    for (const wx of WINDOW_XS) lights.push({ x: wx, y: 96, r: 90, i: 0.4, c: '120,150,255' });
    lights.push({ x: p.x, y: p.y - 12, r: 70, i: 0.55, c: '200,210,255' });

    const l = this.light.getContext('2d');
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, W, H);
    l.fillStyle = 'rgba(4,5,16,0.62)';
    l.fillRect(0, 0, W, H);
    l.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const x = L.x - cx;
      if (x < -L.r || x > W + L.r) continue;
      radialLight(l, Math.round(x), Math.round(L.y), L.r, `rgba(0,0,0,${L.i})`, 'rgba(0,0,0,0)');
    }
    ctx.drawImage(this.light, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const x = L.x - cx;
      if (x < -L.r || x > W + L.r) continue;
      radialLight(ctx, Math.round(x), Math.round(L.y), L.r, `rgba(${L.c},${L.i * 0.2})`, `rgba(${L.c},0)`);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------ pause menu




  // The chained beasts' pulse starts at the training dummy and grows all the way to the trial gates.
  updateMusic() {
    const start = DUMMY_X - 10, full = GATE_X0 - 30;
    const prox = clamp((this.player.x - start) / (full - start), 0, 1);
    Music.setProximity(prox);
    this.gatePulse = Music.pulse() * prox;
    if (this.gatePulse > 0.35) this.shake(0.8 * this.gatePulse);
  }

  // ------------------------------------------------------------ pause menu and arrival
  openPause() {
    this.mode = 'pause';
    this.shakeAmt = 0;
    this.pauseMenu = new PauseMenu(() => this.resume());
    Sfx.play('menu');
  }

  resume() {
    this.mode = 'play';
    this.pauseMenu = null;
    Sfx.play('cancel');
  }

  updatePause() { this.pauseMenu.update(); }
  drawPause(ctx) { this.pauseMenu.draw(ctx); }

  // First arrival after the capture: the prisoners speak to the new captive.
  startIntro() {
    const p = this.player;
    p.x = 330; p.facing = -1;
    this.cam.x = 0; this.lookAhead = -28;
    this.titleT = 100;
    this.startDialogue('', '#ffffff', INTRO_LINES, () => Save.write());
  }

  // ------------------------------------------------------------ HUD + panels
  drawHud(ctx) {
    const p = this.player;
    drawHealthHud(ctx, p, this.t);

    const coins = String(Save.data.coins);
    const tw = textW(ctx, coins);
    drawCoin(ctx, W - 12 - tw - 8, 9);
    text(ctx, coins, W - 8, 8, C.gold, 'right');

    if (this.titleT < 4.2) {
      const a = clamp(Math.min(this.titleT / 0.8, (4.2 - this.titleT) / 0.8), 0, 1);
      ctx.globalAlpha = a;
      text(ctx, 'THE ANTECHAMBER', W / 2, 40, '#e8e2d0', 'center');
      text(ctx, 'where the captives wait', W / 2, 54, C.dim, 'center');
      ctx.globalAlpha = 1;
    }
  }


  drawShop(ctx) {
    const s = this.shop, items = this.shopItems();
    const accent = s.kind === 'weapons' ? '#ff9a5a' : '#a78bfa';
    const X = 44, Y = 16, PW = 392, PH = 240;
    panel(ctx, X, Y, PW, PH, accent);
    text(ctx, s.kind === 'weapons' ? "HOBB'S FORGE" : 'THE VEILED PEDDLER', X + 12, Y + 10, accent);
    const coins = String(Save.data.coins);
    text(ctx, coins, X + PW - 12, Y + 10, C.gold, 'right');
    drawCoin(ctx, X + PW - 12 - textW(ctx, coins) - 10, Y + 11);
    px(ctx, X + 10, Y + 24, PW - 20, 1, C.panelInner);

    // list
    const rowH = items.length > 6 ? 16 : 24, ty = rowH > 20 ? 2 : 1;
    items.forEach((it, i) => {
      const y = Y + 30 + i * rowH;
      const sel = i === s.index;
      const owned = this.owns(s.kind, it.id);
      if (it.after && !(items[i - 1] && items[i - 1].after === it.after)) { px(ctx, X + 10, y - 2, 176, 1, accent); }      // the second shelf starts here
      if (sel) {
        px(ctx, X + 10, y - 1, 176, rowH - 2, '#1d1f3a');
        px(ctx, X + 10, y - 1, 2, rowH - 2, accent);
      }
      text(ctx, it.short || it.name, X + 18, y + ty, sel ? '#ffffff' : (it.after ? '#c8a880' : C.dim));
      if (s.kind === 'weapons' && Save.data.equipped === it.id) text(ctx, 'ON', X + 180, y + ty, C.good, 'right');
      else if (owned) text(ctx, 'OWNED', X + 180, y + ty, '#5a5a7a', 'right');
      else text(ctx, String(it.price), X + 180, y + ty, Save.data.coins >= it.price ? C.gold : '#7a5a3a', 'right');
    });

    // detail
    const it = items[s.index], owned = this.owns(s.kind, it.id);
    const dx = X + 200;
    px(ctx, dx - 6, Y + 30, 1, 140, C.panelInner);
    text(ctx, it.name, dx, Y + 34, C.gold);
    const desc = wrapText(ctx, it.desc, PW - 214);
    desc.forEach((l, k) => text(ctx, l, dx, Y + 50 + k * 11, C.text));
    let sy = Y + 50 + desc.length * 11 + 8;
    if (s.kind === 'weapons') {
      drawWeaponIcon(ctx, it, dx + 108, sy - 3, 70, 46, this.t);
      for (const [label, v] of [['DMG', it.stats.dmg], ['REACH', it.stats.reach], ['SPEED', it.stats.speed]]) {
        text(ctx, label, dx, sy, C.dim);
        for (let k = 0; k < 5; k++) px(ctx, dx + 52 + k * 11, sy, 9, 7, k < v ? it.color : '#25263f');
        sy += 14;
      }
    } else {
      text(ctx, 'KEY', dx, sy, C.dim);
      text(ctx, it.id === 'doublejump' ? `${keyName(KEYS.jump)} x2` : keyName(KEYS[it.key]), dx + 52, sy, C.text);
    }
    let action, ac = C.text;
    if (s.kind === 'weapons' && Save.data.equipped === it.id) { action = 'EQUIPPED'; ac = C.good; }
    else if (owned) { action = s.kind === 'weapons' ? `${keyName(KEYS.jump)}: EQUIP` : 'OWNED'; ac = s.kind === 'weapons' ? C.text : C.dim; }
    else { action = `${keyName(KEYS.jump)}: BUY ${it.price}`; ac = Save.data.coins >= it.price ? C.gold : C.bad; }
    text(ctx, action, dx, Y + 160, ac);

    // keeper quote / message
    px(ctx, X + 10, Y + 182, PW - 20, 1, C.panelInner);
    if (s.msgT > 0) text(ctx, s.msg, X + 12, Y + 192, s.msgColor);
    else wrapText(ctx, `"${s.quote}"`, PW - 24).forEach((l, k) => text(ctx, l, X + 12, Y + 192 + k * 11, C.dim));
    text(ctx, `UP/DOWN browse   ${keyName(KEYS.jump)} select   ${keyName(KEYS.attack)} leave`, X + PW / 2, Y + PH - 14, '#5f5f84', 'center');
  }

  drawConfirm(ctx) {
    const g = this.confirm.gate, tr = g.trial;
    const X = 90, Y = 64, PW = 300, PH = 142;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    panel(ctx, X, Y, PW, PH, tr.color);
    text(ctx, tr.name.toUpperCase(), X + PW / 2, Y + 12, tr.color, 'center');
    text(ctx, tr.theme, X + PW / 2, Y + 26, C.dim, 'center');
    px(ctx, X + 10, Y + 40, PW - 20, 1, C.panelInner);
    text(ctx, `BOSSES ${tr.bosses}`, X + 16, Y + 50, C.text);
    text(ctx, `BEST STREAK ${Save.data.best[tr.id] || 0}`, X + PW - 16, Y + 50, C.text, 'right');
    const rules = 'Coins are earned in here. After each win, bank them or press on for more. Fall, and you lose it all.';
    wrapText(ctx, rules, PW - 32).forEach((l, k) => text(ctx, l, X + 16, Y + 68 + k * 11, C.dim));
    if (tr.id === 'hive' && !Save.data.abilities.includes('doublejump')) text(ctx, 'Buy Wraith Wings first.', X + PW / 2, Y + PH - 40, C.bad, 'center');
    text(ctx, `${keyName(KEYS.jump)}  ENTER`, X + 16, Y + PH - 20, C.good);
    text(ctx, `${keyName(KEYS.attack)}  BACK`, X + PW - 16, Y + PH - 20, C.dim, 'right');
  }

  drawNotice(ctx) {
    const n = this.notice;
    const X = 90, Y = 88, PW = 300, PH = 94;
    panel(ctx, X, Y, PW, PH, n.color);
    text(ctx, n.title.toUpperCase(), X + PW / 2, Y + 12, n.color, 'center');
    n.lines.forEach((l, k) => text(ctx, l, X + PW / 2, Y + 34 + k * 12, C.text, 'center'));
    text(ctx, `${keyName(KEYS.jump)}  RETURN`, X + PW / 2, Y + PH - 18, C.dim, 'center');
  }
}

Object.assign(Hub.prototype, FxHooks, DialogueHooks);
