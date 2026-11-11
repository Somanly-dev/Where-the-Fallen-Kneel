'use strict';

// Boss fights for The Pits. A boss is a "target": the knight's sword and bolt hit it through hitbox() and hit().
// Rules that every boss follows:
//   - a hit never interrupts an attack (hit() only hurts, it never staggers)
//   - dust and shockwaves are drawn only, they have no hitbox
//   - the only things that hurt the knight are the boxes returned by attacks() and the shots a boss throws
//     (the 0 key shows them all in orange)

const ARENA_L = 44, ARENA_R = 436;
const PIT_BOSSES = [];         // each boss file registers its entry here (index 0 is the first boss)

function mixHex(a, b, k) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const m = (s) => Math.round(((x >> s) & 255) * (1 - k) + ((y >> s) & 255) * k);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}

// A crisp pixel line, for blades and limbs (rotated rectangles would blur).
function pixLine(ctx, x0, y0, x1, y1, th, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) px(ctx, x0 + (x1 - x0) * i / n - th / 2, y0 + (y1 - y0) * i / n - th / 2, th, th, color);
}

// Something a boss throws or leaves behind. It hurts on touch.
class BossShot {
  constructor(o) {
    Object.assign(this, { x: 0, y: 0, vx: 0, vy: 0, w: 8, h: 8, grav: 0, life: 4, dmg: 1, kind: 'mud', dead: false, age: 0,
      onLand: null, ground: true, ph: Math.random() * 6 }, o);
  }
  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }
  update(dt, world) {
    this.age += dt; this.life -= dt;
    this.vy += this.grav * dt;
    if (this.home) {                                              // a homing shot steers toward the knight
      const p = world.player, dx = p.x - this.x, dy = p.y - 12 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx += dx / d * this.home * dt; this.vy += dy / d * this.home * dt;
      const sp = Math.hypot(this.vx, this.vy), mx = this.maxSp || 140;
      if (sp > mx) { this.vx *= mx / sp; this.vy *= mx / sp; }
    }
    const prevBottom = this.y + this.h / 2;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.landOn && this.vy >= 0 && world.platforms) {
      const bot = this.y + this.h / 2;
      for (const pl of world.platforms) {
        if (pl.gone || this.x < pl.x || this.x > pl.x + pl.w) continue;
        if (prevBottom <= pl.y + 1 && bot >= pl.y) { this.y = pl.y - this.h / 2; this.dead = true; this.landed = pl; if (this.onLand) this.onLand(this, world); break; }
      }
    }
    if (this.ground && this.vy >= 0 && this.y + this.h / 2 >= GROUND_Y) {
      this.y = GROUND_Y - this.h / 2;
      this.dead = true;
      if (this.onLand) this.onLand(this, world);
    }
    if (this.life <= 0 || this.x < -30 || this.x > W + 30) this.dead = true;
  }
  draw(ctx, boss) {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (this.kind === 'mud') {
      px(ctx, x - 4, y - 3, 8, 7, '#2a1c14'); px(ctx, x - 3, y - 4, 6, 9, '#2a1c14'); px(ctx, x - 2, y - 3, 3, 2, '#5a4030');
    } else if (this.kind === 'feather') {
      const dx = Math.sign(this.vx) || 1;
      pixLine(ctx, x - 5 * dx, y - 3, x + 5 * dx, y + 3, 2, '#2a2230');
      pixLine(ctx, x - 4 * dx, y - 3, x + 5 * dx, y + 2, 1, '#8a7aa0');
    } else if (this.kind === 'orb') {
      px(ctx, x - 4, y - 2, 8, 5, '#c8a050'); px(ctx, x - 2, y - 4, 4, 9, '#c8a050'); px(ctx, x - 2, y - 2, 4, 4, '#fff0b0');
    } else if (this.kind === 'ring') {
      px(ctx, x - 1, y - this.h / 2, 3, this.h, '#e8d890'); px(ctx, x, y - this.h / 2, 1, this.h, '#ffffff');
    } else {
      px(ctx, x - this.w / 2, y - this.h / 2, this.w, this.h, '#c0405a');
    }
  }
}

class Boss {
  constructor(o) {
    this.name = o.name; this.hp = this.maxHp = o.hp; this.w = o.w; this.h = o.h;
    this.x = o.x == null ? 330 : o.x; this.y = GROUND_Y; this.vx = 0; this.vy = 0; this.facing = -1;
    this.flash = 0; this.engaged = false; this.dying = false; this.dead = false; this.sink = 0;
    this.shots = []; this.age = 0; this.animT = 0; this.intangible = false; this.soulsGiven = 0;
    this.state = 'idle'; this.st = 0; this.cool = 0.8; this.airborne = false; this.gravity = 1400; this.heat = 0;
  }

  engage() { this.engaged = true; }
  targetList() { return this.engaged && !this.dying && !this.dead ? [this] : []; }

  hitbox() {
    if (this.dead || this.dying || this.intangible) return { x: -999, y: -999, w: 1, h: 1 };
    return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h };
  }

  // Damage only. Never interrupts whatever the boss is doing.
  hit(dmg, dirX, world) {
    if (!this.engaged || this.dying || this.intangible) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.heat += dmg;
    this.flash = 0.1;
    world.floater(this.x + (Math.random() - 0.5) * 12, this.y - this.h - 6, String(dmg), '#ffe9a0');
    for (let i = 0; i < 5; i++) world.spawn({ x: this.x, y: this.y - this.h * 0.55, vx: (Math.random() - 0.5) * 90 + dirX * 40, vy: -Math.random() * 90, life: 0.45, color: '#5a1c22', size: 2, grav: 300 });
    // a soul of the fallen is released at every quarter of its health
    while (this.soulsGiven < 3 && this.hp <= this.maxHp * (1 - 0.25 * (this.soulsGiven + 1))) {
      this.soulsGiven++;
      world.spawnSoul(this.x, this.y - this.h * 0.6, 2);
    }
    if (this.hp <= 0) this.die(world);
  }

  die(world) {
    this.dying = true; this.sink = 0; this.vx = 0; this.shots = [];
    world.bossFell(this);
  }

  faceTo(p) { this.facing = p.x >= this.x ? 1 : -1; }

  // ---- attack sequences ----
  // A move is a list of segments. A segment: { d: seconds (or until: fn), pose, tell: true while it warns,
  // face: true to turn to the knight first, on(b, w) once at the start, tick(b, dt, w) every step, hz(b) -> hazards }.
  play(name, segs, w) {
    this.seq = segs; this.si = -1; this.state = name; this.last = name;
    this.nextSeg(w);
  }
  nextSeg(w) {
    this.si++; this.sT = 0;
    const s = this.seq[this.si];
    if (!s) { this.seq = null; this.state = 'idle'; this.pose = 'idle'; this.vx = 0; this.cool = this.restTime(); this.moveDone(w); return; }
    if (s.pose) this.pose = s.pose;
    if (s.face) this.faceTo(w.player);
    if (s.on) s.on(this, w);
  }
  stepSeq(dt, w) {
    const s = this.seq[this.si];
    this.sT += dt;
    if (s.tick) s.tick(this, dt, w);
    if (this.sT >= (s.d == null ? 99 : s.d) || (s.until && this.sT > (s.min || 0.05) && s.until(this, w))) this.nextSeg(w);
  }
  segHaz() { const s = this.seq && this.seq[this.si]; return s && s.hz ? s.hz(this) : []; }
  restTime() { return 0.4 + Math.random() * 0.4; }
  moveDone(w) {}
  // what the test bot should do right now (see bottest.js)
  danger() {
    const s = this.seq && this.seq[this.si];
    if (!s) return false;
    return s.bot || (s.tell || s.hz ? 'away' : false);
  }
  // pick a move that was not the last one, from a weighted list of names
  choose(list) {
    const fresh = list.filter(o => o !== this.last);
    const l = fresh.length ? fresh : list;
    return l[Math.floor(Math.random() * l.length)];
  }

  // ---- hooks for each boss ----
  idleUpdate(dt, world) { this.animT += dt; }       // waiting in the cage
  think(dt, world) {}
  attacks() { return this.seq ? this.segHaz() : []; }     // boxes that hurt the knight right now: { box, dmg, fromX, grab }
  poseDraw(ctx, t) {}

  // a hazard that switches on later (a hand that was grabbing, then slams): { t0, t1, box, dmg } in this boss's own clock
  later(delay, dur, box, dmg = 1) { (this.timed || (this.timed = [])).push({ t0: this.age + delay, t1: this.age + delay + dur, box, dmg }); }

  hazards() {
    if (this.dying || this.dead) return [];
    const hs = this.attacks().map(shrinkHz);
    if (this.timed) {
      this.timed = this.timed.filter(z => this.age < z.t1);
      for (const z of this.timed) if (this.age >= z.t0) hs.push(shrinkHz({ box: z.box, dmg: z.dmg, fromX: z.box.x + z.box.w / 2 }));
    }
    for (const s of this.shots) hs.push({ box: s.box(), dmg: s.dmg, fromX: s.x, shot: s });
    return hs;
  }
  debugBoxes() { return this.hazards().map(h => ({ box: h.box, color: '#ff9a3a' })); }

  update(dt, world) {
    if (this.dead) return;
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.heat = Math.max(0, this.heat - dt * 2.2);
    if (this.dying) {
      this.sink = Math.min(1, this.sink + dt / 2.2);
      if (Math.random() < 0.5) world.spawn({ x: this.x + (Math.random() - 0.5) * this.w * 1.4, y: GROUND_Y, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 40, life: 0.5, color: Math.random() < 0.5 ? '#2a1c14' : '#4a3426', size: 2, grav: 200 });
      if (this.sink >= 1) this.dead = true;
      return;
    }
    this.physics(dt);
    for (const s of this.shots) s.update(dt, world);
    this.shots = this.shots.filter(s => !s.dead);
    if (!this.engaged) this.idleUpdate(dt, world); else this.think(dt, world);
  }

  physics(dt) {
    this.vy += this.gravity * dt;
    this.y += this.vy * dt;
    this.airborne = true;
    if (this.y >= GROUND_Y) { this.y = GROUND_Y; this.vy = 0; this.airborne = false; }
    this.x = clamp(this.x + this.vx * dt, ARENA_L, ARENA_R);
  }

  // the colour, whitened for a moment when the boss is struck
  col(hex) { return this.flash > 0 ? mixHex(hex, '#ffffff', 0.7) : hex; }

  drawAll(ctx, t) {
    if (this.dead) return;
    ctx.save();
    if (this.dying) {
      ctx.beginPath(); ctx.rect(0, 0, W, GROUND_Y + 1); ctx.clip();
      ctx.translate(Math.round((Math.random() - 0.5) * 2 * (1 - this.sink)), Math.round(this.sink * (this.h + 14)));
    }
    this.draw(ctx, t);
    ctx.restore();
    for (const s of this.shots) s.draw(ctx, this);
  }
  draw(ctx, t) {}
}

// Attack boxes are drawn a little tighter than the art, so a graze is a miss. Grabs keep their size.
function shrinkHz(h) {
  if (h.grab) return h;
  const b = h.box, w = b.w * 0.88, hh = b.h * 0.88;
  return Object.assign({}, h, { box: { x: b.x + (b.w - w) / 2, y: b.y + (b.h - hh) / 2, w, h: hh } });
}

// A hazard box in front of a boss: dx0..dx1 ahead of its centre, y0..y1 relative to its feet (negative is up).
function hzFront(b, dx0, dx1, y0, y1, dmg = 1) {
  const a = b.x + b.facing * dx0, c = b.x + b.facing * dx1;
  return { box: { x: Math.min(a, c), y: b.y + y0, w: Math.abs(dx1 - dx0), h: y1 - y0 }, dmg, fromX: b.x };
}
function hzBody(b, pad = 4, dmg = 1) {
  return { box: { x: b.x - b.w / 2 - pad, y: b.y - b.h - pad / 2, w: b.w + pad * 2, h: b.h + pad }, dmg, fromX: b.x };
}

// A soft dust cloud along the floor. Drawn only: it has no hitbox.
function dustWave(world, x, dir, n = 12) {
  for (let i = 0; i < n; i++) {
    const side = dir || (i % 2 ? 1 : -1);
    world.spawn({ x: x + side * (2 + Math.random() * 8), y: GROUND_Y - 1 - Math.random() * 3, vx: side * (50 + Math.random() * 130), vy: -Math.random() * 12, life: 0.5 + Math.random() * 0.3, color: Math.random() < 0.5 ? '#6a5a4a' : '#4a3c32', size: 3, grav: 0 });
  }
}

// ======================================================================= 1. THE HOLLOW SERGEANT
// A soldier who was cut open and put back wrong. Slow to turn, and slow to recover: hit him after his swings.

class HollowSergeant extends Boss {
  constructor() {
    super({ name: 'The Hollow Sergeant', hp: 30, w: 24, h: 46 });
    this.last = ''; this.want = null; this.enraged = false; this.pose = 'idle'; this.mark = null; this.n = 0;
  }

  get k() { return this.enraged ? 0.8 : 1; }

  idleUpdate(dt) { this.animT += dt; this.facing = -1; this.pose = 'idle'; }

  begin(state, T) { this.state = state; this.st = 0; this.T = T; this.fired = false; this.last = state; this.n = 0; this.pose = 'idle'; }
  rest(w, lo = 0.3, hi = 0.65) { this.state = 'idle'; this.st = 0; this.cool = (lo + Math.random() * (hi - lo)) * (this.enraged ? 0.7 : 1); this.pose = 'idle'; this.vx = 0; }

  choose(w, ad) {
    let opts;
    if (ad < 80) opts = ['cleave', 'cleave', 'combo'];
    else if (ad < 170) opts = ['combo', 'charge', 'leap', 'cleave'];
    else opts = ['charge', 'leap', 'charge', 'combo'];
    const fresh = opts.filter(o => o !== this.last);
    if (fresh.length) opts = fresh;
    this.want = opts[Math.floor(Math.random() * opts.length)];
  }

  launch(w) {
    const p = w.player, k = this.k;
    this.faceTo(p);
    if (this.want === 'cleave') this.begin('cleave', { a: 0.55 * k, b: 0.14, c: 0.5 });
    else if (this.want === 'combo') this.begin('combo', { c: 0.5 });
    else if (this.want === 'charge') this.begin('charge', { a: 0.62 * k, run: 0.7, c: 0.55 });
    else if (this.want === 'leap') this.begin('leap', { a: 0.42 * k, c: 0.5 });
    else if (this.want === 'retreat') this.begin('retreat', { a: 0.16 });
    this.want = null;
  }

  // the strokes of the combo: [windup, active, kind]
  strokes() {
    const k = this.k, s = [[0.44 * k, 0.1, 'side'], [0.28 * k, 0.1, 'side']];
    if (this.enraged) s.push([0.32, 0.14, 'over']);
    return s;
  }

  think(dt, w) {
    const p = w.player, k = this.k;
    this.animT += dt; this.st += dt;
    const ad = Math.abs(p.x - this.x);
    if (p.dead) { this.vx = 0; this.pose = 'idle'; return; }

    if (this.state === 'idle') {
      this.faceTo(p);
      this.cool -= dt;
      if (!this.enraged && this.hp <= this.maxHp * 0.5) {          // at half health he bellows, and gets faster
        this.begin('roar', { a: 0.9 });
        this.enraged = true; this.pose = 'roar';
        Sfx.play('roar'); w.cheer(1);
        return;
      }
      if (!this.want && this.heat >= 6) { this.want = 'retreat'; this.heat = 0; }
      if (this.want) {
        if (ad > 78 && (this.want === 'cleave' || this.want === 'combo')) this.vx = this.facing * (this.enraged ? 95 : 78);
        else this.launch(w);
      } else {
        this.vx = ad > 50 ? this.facing * (this.enraged ? 92 : 74) : 0;
        if (this.cool <= 0) this.choose(w, ad);
      }
      return;
    }

    if (this.state === 'roar') {
      this.vx = 0;
      if (this.st >= this.T.a) this.rest(w, 0.2, 0.4);
    } else if (this.state === 'cleave') {
      const T = this.T; this.vx = 0;
      if (this.st < T.a) this.pose = 'up';
      else if (this.st < T.a + T.b) {
        this.pose = 'down';
        if (!this.fired) { this.fired = true; Sfx.play('slam'); w.shake(3); dustWave(w, this.x + this.facing * 52, 0, 14); }
      } else { this.pose = 'low'; if (this.st >= T.a + T.b + T.c) this.rest(w); }
    } else if (this.state === 'combo') {
      const ss = this.strokes();
      let t = this.st, i = 0;
      while (i < ss.length && t >= ss[i][0] + ss[i][1] + 0.08) { t -= ss[i][0] + ss[i][1] + 0.08; i++; }
      if (i >= ss.length) { this.pose = 'low'; this.vx = 0; if (t >= this.T.c) this.rest(w); return; }
      if (i !== this.n) { this.n = i; this.faceTo(p); this.fired = false; }
      const [a, b, kind] = ss[i];
      if (t < a) { this.pose = kind === 'over' ? 'up' : 'sideWind'; this.vx = 0; }
      else if (t < a + b) {
        this.pose = kind === 'over' ? 'down' : 'side';
        this.vx = this.facing * 110;                              // each stroke lunges
        if (!this.fired) { this.fired = true; Sfx.play('slash'); if (kind === 'over') { Sfx.play('slam'); w.shake(2); dustWave(w, this.x + this.facing * 52, 0, 10); } }
      } else { this.pose = 'low'; this.vx = 0; }
    } else if (this.state === 'charge') {
      const T = this.T;
      if (this.st < T.a) {                                           // bellow, and paw the floor
        this.vx = 0; this.pose = 'crouch';
        if (!this.fired && this.st > 0.1) { this.fired = true; Sfx.play('roar'); }
        if (Math.random() < 0.4) w.spawn({ x: this.x + this.facing * 8, y: GROUND_Y - 1, vx: -this.facing * 30, vy: -20, life: 0.4, color: '#6a5a4a', size: 2, grav: 60 });
      } else if (this.st < T.a + T.run && !this.hitWall) {
        this.pose = 'rush'; this.vx = this.facing * 240;
        if (Math.random() < 0.6) w.spawn({ x: this.x - this.facing * 10, y: GROUND_Y - 2, vx: -this.facing * 40, vy: -10, life: 0.35, color: '#6a5a4a', size: 3, grav: 0 });
        if ((this.x <= ARENA_L + 1 && this.facing < 0) || (this.x >= ARENA_R - 1 && this.facing > 0)) {
          this.hitWall = true; this.wallT = this.st; this.vx = 0; w.shake(4); Sfx.play('slam');
          for (let i = 0; i < 10; i++) w.spawn({ x: this.x + this.facing * 10, y: GROUND_Y - 20 - Math.random() * 25, vx: -this.facing * (30 + Math.random() * 70), vy: -Math.random() * 60, life: 0.5, color: '#8a6a40', size: 2, grav: 300 });
        }
      } else {
        this.vx = approach(this.vx, 0, 700 * dt); this.pose = 'stumble';
        const rec = this.hitWall ? 1.3 : T.c;
        if (this.st >= T.a + T.run + rec || (this.hitWall && this.st >= this.wallT + 1.3)) { this.hitWall = false; this.rest(w, 0.3, 0.6); }
      }
    } else if (this.state === 'retreat') {
      const T = this.T;
      if (this.st < T.a) { this.vx = 0; this.pose = 'crouch'; }
      else if (!this.fired) {
        this.fired = true;
        let away = p.x >= this.x ? -1 : 1;
        if ((away < 0 && this.x < ARENA_L + 90) || (away > 0 && this.x > ARENA_R - 90)) away = -away;
        this.vy = -470; this.vx = away * 230; this.pose = 'leap'; Sfx.play('whoosh');
      } else if (!this.airborne && this.st > T.a + 0.1) { this.vx = 0; this.rest(w, 0.2, 0.4); }
    } else if (this.state === 'leap') {
      const T = this.T;
      if (this.st < T.a) {
        this.vx = 0; this.pose = 'crouch';
        if (!this.target) this.target = clamp(p.x, ARENA_L + 10, ARENA_R - 10);
        this.mark = this.target;
      } else if (!this.fired) {
        this.fired = true; this.airT = 0.8;
        this.vy = -560; this.vx = clamp((this.target - this.x) / this.airT, -260, 260);
        this.pose = 'leap'; Sfx.play('whoosh');
      } else if (this.airborne) { this.pose = 'leap'; }
      else if (!this.landed) {
        this.landed = true; this.landT = this.st; this.vx = 0; this.pose = 'down'; this.mark = null;
        Sfx.play('slam'); w.shake(4); dustWave(w, this.x, 0, 16);
      } else {
        this.vx = 0; this.pose = this.st - this.landT < 0.14 ? 'down' : 'low';
        if (this.st >= this.landT + 0.14 + T.c) { this.target = null; this.landed = false; this.rest(w, 0.3, 0.7); }
      }
    }
  }

  // used by the test bot (bottest.js) to decide when to retreat: what the knight should do right now
  danger() {
    if (this.state === 'cleave') return this.st < this.T.a + this.T.b ? 'away' : false;
    if (this.state === 'combo') return this.pose === 'low' ? false : 'away';
    if (this.state === 'charge') return this.pose === 'rush' ? 'jump' : (this.pose === 'crouch' ? 'away' : false);
    if (this.state === 'leap') return this.pose === 'crouch' || this.pose === 'leap' ? 'away' : false;
    return false;
  }

  attacks() {
    if (this.dying) return [];
    const f = this.facing, T = this.T, hs = [];
    if (this.state === 'cleave' && this.st >= T.a && this.st < T.a + T.b)
      hs.push({ box: { x: f > 0 ? this.x + 4 : this.x - 4 - 64, y: this.y - 88, w: 64, h: 88 }, dmg: 1, fromX: this.x });
    if (this.state === 'combo') {
      const ss = this.strokes();
      let t = this.st;
      for (const [a, b, kind] of ss) {
        if (t >= a && t < a + b) hs.push({ box: kind === 'over' ? { x: f > 0 ? this.x + 4 : this.x - 4 - 64, y: this.y - 88, w: 64, h: 88 } : { x: f > 0 ? this.x + 6 : this.x - 6 - 56, y: this.y - 42, w: 56, h: 30 }, dmg: 1, fromX: this.x });
        t -= a + b + 0.08;
        if (t < 0) break;
      }
    }
    if (this.state === 'charge' && this.pose === 'rush') hs.push({ box: { x: this.x - this.w / 2 - 4, y: this.y - this.h, w: this.w + 8, h: this.h }, dmg: 1, fromX: this.x });
    if (this.state === 'leap' && this.landed && this.st - this.landT < 0.14) hs.push({ box: { x: this.x - 36, y: this.y - 26, w: 72, h: 26 }, dmg: 1, fromX: this.x });
    return hs;
  }

  draw(ctx, t) {
    const dark = this.col('#23242e'), armor = this.col('#3a3d4a'), red = this.col('#8a2a30'), skin = this.col('#7a5a52'), bone = this.col('#d8cdb0'), steel = this.col('#a8aebc');
    const flare = (this.state === 'cleave' && this.st < this.T.a) || this.state === 'roar' || (this.state === 'charge' && this.pose === 'crouch') || (this.state === 'leap' && this.pose === 'crouch') || (this.state === 'combo' && this.pose.endsWith('Wind'));
    // where the leap will land (a shadow on the floor)
    if (this.mark != null) { ctx.globalAlpha = 0.5; px(ctx, this.mark - 22, GROUND_Y - 2, 44, 3, '#000000'); px(ctx, this.mark - 14, GROUND_Y - 3, 28, 1, '#000000'); ctx.globalAlpha = 1; }
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    const moving = Math.abs(this.vx) > 5 && !this.airborne;
    const step = moving && Math.floor(this.animT * 8) % 2;
    const pose = this.pose;
    const crouch = pose === 'crouch' ? 8 : (pose === 'low' || pose === 'stumble' ? 5 : 0);
    const air = this.airborne;
    // legs
    if (air) { px(ctx, -8, -14 + 3, 6, 11, dark); px(ctx, 2, -14 + 3, 6, 11, dark); }
    else { px(ctx, -8, -14 + crouch / 2 + (step ? -2 : 0), 6, 14 - crouch / 2 + (step ? 2 : 0), dark); px(ctx, 2, -14 + crouch / 2 + (step ? 0 : -2), 6, 14 - crouch / 2 + (step ? 0 : 2), dark); }
    px(ctx, -9, -3, 8, 3, '#15161c'); px(ctx, 2, -3, 9, 3, '#15161c');
    // torso (hunches as he crouches)
    const ty = -34 + crouch;
    px(ctx, -11, ty, 22, 22 - crouch / 2, armor); px(ctx, -11, ty, 22, 2, this.col('#555a6a'));
    px(ctx, -3, ty, 8, 22 - crouch / 2, red); px(ctx, -3, ty + 18 - crouch / 2, 3, 4, dark); px(ctx, 2, ty + 20 - crouch / 2, 3, 3, dark);
    px(ctx, -11, ty + 18 - crouch / 2, 22, 3, '#1c1d24');
    // the swollen arm
    px(ctx, -17, ty + 1, 8, 11, skin); px(ctx, -19, ty + 8, 7, 12, skin); px(ctx, -17, ty + 3, 2, 6, this.col('#9a6a62'));
    // head and the horns that grew through the helmet
    const hy = ty - 12;
    px(ctx, -6, hy, 12, 12, dark); px(ctx, -6, hy, 12, 2, this.col('#3a3c48')); px(ctx, 0, hy, 1, 5, '#0c0c12');
    px(ctx, -7, hy - 7, 3, 8, bone); px(ctx, 4, hy - 8, 3, 9, bone); px(ctx, -6, hy - 9, 1, 2, bone); px(ctx, 5, hy - 11, 1, 3, bone);
    px(ctx, 1, hy + 5, 4, 2, flare ? '#ffffff' : '#ff7a3a');
    px(ctx, -2, hy + 9, 8, 3, bone); for (let i = 0; i < 4; i++) px(ctx, -1 + i * 2, hy + 9, 1, 3, '#15161c');
    // the cleaver
    let hx, hyy, tx, tyy;
    if (pose === 'up') { hx = 5; hyy = ty - 4; tx = 2; tyy = ty - 46; }
    else if (pose === 'down') { hx = 10; hyy = ty + 4; tx = 48; tyy = -4; }
    else if (pose === 'sideWind') { hx = -2; hyy = ty + 4; tx = -26; tyy = ty - 4; }
    else if (pose === 'side') { hx = 10; hyy = ty + 8; tx = 56; tyy = ty + 10; }
    else if (pose === 'low' || pose === 'stumble') { hx = 8; hyy = ty + 12; tx = 28; tyy = -1; }
    else if (pose === 'roar') { hx = 8; hyy = ty - 2; tx = 10; tyy = ty - 38; }
    else if (pose === 'rush') { hx = 8; hyy = ty + 10; tx = 34; tyy = ty + 18; }
    else if (pose === 'leap') { hx = 6; hyy = ty - 2; tx = 14; tyy = ty - 38; }
    else { hx = 9; hyy = ty + 10; tx = 18; tyy = -4; }
    pixLine(ctx, hx - 6 * Math.sign(tx - hx || 1) * 0, hyy, tx, tyy, 5, steel);
    pixLine(ctx, hx, hyy, hx + (tx - hx) * 0.22, hyy + (tyy - hyy) * 0.22, 4, this.col('#4a3a2a'));
    pixLine(ctx, hx + (tx - hx) * 0.3, hyy + (tyy - hyy) * 0.3, tx, tyy, 1, this.col('#e8ecf4'));
    px(ctx, hx - 2, hyy - 2, 5, 5, skin);
    ctx.restore();
  }
}

PIT_BOSSES[0] = {
  id: 'sergeant', name: 'The Hollow Sergeant', sub: 'A soldier, cut open and put back wrong',
  coins: 10, music: 'pitA', cageW: 56, make: () => [new HollowSergeant()],
};
