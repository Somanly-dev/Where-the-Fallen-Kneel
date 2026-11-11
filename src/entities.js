'use strict';

// "world" below is whatever scene hosts the entity (the hub today, boss arenas later).
// It must provide: platforms[], targets[], and the effect hooks used in this file.

// What the player sees while stunned, dead, or in a cutscene: no keys pressed.
const NO_INPUT = { down: () => false, pressed: () => false, released: () => false };

class Player {
  constructor(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hw = 5; this.h = 22;
    this.facing = 1;
    this.onGround = false; this.platform = null;
    this.coyote = 0; this.jumpBuf = 0; this.jumpHeld = false;
    this.airJumps = 1; this.dashAvail = true;
    this.dashing = false; this.dashT = 0; this.dashCd = 0; this.dashDir = 1; this.afterT = 0;
    this.atkT = 0; this.atkCd = 0; this.atkBuf = 0; this.atkDir = 'side'; this.atkHit = new Set();
    this.healing = false; this.healT = 0;
    this.boltCd = 0;
    this.dropT = 0; this.dropPlat = null;
    this.recoilT = 0;
    this.maxHp = PHYS.maxHp + (Save.data.bonusHp || 0); this.hp = this.maxHp;
    this.maxEnergy = PHYS.maxEnergy + (Save.data.bonusEnergy || 0); this.energy = 0;
    this.rootT = 0; this.speedMul = 1;       // set by boss attacks: held in place, slowed by mud
    this.animT = 0;
    this.invuln = 0; this.hurtT = 0; this.dead = false; this.lying = false;
  }

  get weapon() { return WEAPON_BY_ID[Save.data.equipped] || WEAPONS[0]; }
  has(id) { return Save.data.abilities.includes(id); }

  hitbox() { return { x: this.x - this.hw, y: this.y - this.h, w: this.hw * 2, h: this.h }; }

  attackBox() {
    const wp = this.weapon, cy = this.y - 11, S = PHYS.attackScale, reach = wp.reach * S, bh = wp.h * S;
    if (this.atkDir === 'up') return { x: this.x - bh / 2, y: this.y - 22 - reach * 0.8, w: bh, h: reach * 0.8 + 8 };
    if (this.atkDir === 'down') return { x: this.x - bh / 2, y: this.y - 8, w: bh, h: reach * 0.8 + 8 };
    const x0 = this.facing > 0 ? this.x + 2 : this.x - 2 - reach;
    return { x: x0, y: cy - bh / 2, w: reach, h: bh };
  }

  // Every box the blade covers: usually one, two for a weapon that also hits behind (the bell flail).
  attackBoxes() {
    const f = this.attackBox();
    if (this.weapon.both && this.atkDir === 'side') {
      const reach = this.weapon.reach * PHYS.attackScale;
      return [f, { x: this.facing > 0 ? this.x - 2 - reach : this.x + 2, y: f.y, w: f.w, h: f.h }];
    }
    return [f];
  }

  // Terrain helpers: the feet stand on the highest of three samples; the head hits the lowest ceiling.
  groundUnder(t) { return Math.min(t.groundAt(this.x - this.hw), t.groundAt(this.x), t.groundAt(this.x + this.hw)); }
  ceilingOver(t) { return Math.max(t.ceilAt(this.x - this.hw), t.ceilAt(this.x), t.ceilAt(this.x + this.hw)); }

  blockedAt(t, nx) {
    const lead = nx + (nx >= this.x ? 1 : -1) * this.hw;
    if (this.y > t.groundAt(lead) + 6) return true;
    const c = t.ceilAt(lead);
    return c > 0 && this.y - this.h < c;
  }

  gainEnergy(n) { this.energy = Math.min(this.maxEnergy, this.energy + n); }

  // Returns true if the hit landed. A short stun and a second of invulnerability follow.
  takeDamage(dmg, fromX, world) {
    if (this.invuln > 0 || this.dead || Dev.invincible) return false;       // invincibility is a dev tool
    Ach.hit();
    this.hp = Math.max(0, this.hp - dmg);
    this.invuln = 1.1; this.hurtT = 0.22; this.recoilT = 0.18;
    this.healing = false; this.healT = 0; this.dashing = false; this.atkT = 0;
    this.vx = (this.x >= fromX ? 1 : -1) * 150;
    this.vy = -170; this.onGround = false;
    world.hitstop = 0.07;
    world.shake(3);
    Sfx.play('hurt');
    for (let i = 0; i < 8; i++) world.spawn({ x: this.x, y: this.y - 12, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 100, life: 0.4, color: '#ece6d4', size: 2, grav: 300 });
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  update(dt, world) {
    const wp = this.weapon;
    const I = (this.hurtT > 0 || this.dead || world.locked) ? NO_INPUT : Input;
    const left = I.down(KEYS.left), right = I.down(KEYS.right);
    const up = I.down(KEYS.up), down = I.down(KEYS.down);
    const rooted = this.rootT > 0;
    const dir = rooted ? 0 : (right ? 1 : 0) - (left ? 1 : 0);
    this.rootT = Math.max(0, this.rootT - dt);

    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.atkBuf = Math.max(0, this.atkBuf - dt);
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.atkT = Math.max(0, this.atkT - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.boltCd = Math.max(0, this.boltCd - dt);
    this.recoilT = Math.max(0, this.recoilT - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dropT === 0) this.dropPlat = null;
    if (I.pressed(KEYS.jump)) this.jumpBuf = PHYS.buffer;
    if (I.pressed(KEYS.attack)) this.atkBuf = PHYS.buffer;

    // ---- focus / heal (hold) ----
    const canHeal = this.has('focus') && this.onGround && !this.dashing && this.atkT <= 0 &&
      this.hp < this.maxHp && this.energy >= PHYS.healCost;
    if (I.down(KEYS.heal) && canHeal) {
      this.healing = true;
      this.healT += dt;
      if (this.healT >= PHYS.healTime) {
        this.hp++; this.energy -= PHYS.healCost; this.healT = 0;
        world.onHeal(this);
      }
    } else { this.healing = false; this.healT = 0; }

    // ---- dash ----
    if (I.pressed(KEYS.dash) && this.has('dash') && this.dashCd <= 0 && (this.onGround || this.dashAvail) && !this.healing && !rooted) {
      this.dashing = true; this.dashT = PHYS.dashTime; this.dashCd = PHYS.dashCooldown;
      this.dashDir = dir || this.facing; this.facing = this.dashDir;
      if (!this.onGround) this.dashAvail = false;
      world.dustBurst(this.x, this.y, 4);
      Sfx.play('dash');
    }

    // ---- horizontal ----
    if (this.dashing) {
      this.vx = this.dashDir * PHYS.dashSpeed;
      this.vy = 0;
      this.dashT -= dt;
      this.afterT -= dt;
      if (this.afterT <= 0) { world.afterimage(this); this.afterT = 0.025; }
      if (this.dashT <= 0) { this.dashing = false; this.vx = this.dashDir * PHYS.run; }
    } else {
      const target = this.healing ? 0 : dir * PHYS.run * this.speedMul;
      const g = this.onGround;
      if (this.recoilT <= 0) {
        let accel;
        if (target === 0) accel = g ? PHYS.groundDecel : PHYS.airDecel;
        else if (this.vx * target < 0) accel = g ? PHYS.groundTurn : PHYS.airTurn;
        else accel = g ? PHYS.groundAccel : PHYS.airAccel;
        this.vx = approach(this.vx, target, accel * dt);
      } else this.vx = approach(this.vx, 0, 500 * dt);
      if (dir && !this.healing) this.facing = dir;
      this.vy = Math.min(this.vy + PHYS.gravity * (this.vy > 0 ? PHYS.fallMult : 1) * dt, PHYS.maxFall);
    }

    // ---- jump ----
    if (this.jumpBuf > 0 && !this.dashing && !rooted) {
      if (down && this.onGround && this.platform && !this.platform.solid) {
        this.dropT = 0.25; this.dropPlat = this.platform; this.onGround = false; this.y += 1; this.jumpBuf = 0;
      } else if (this.onGround || this.coyote > 0) {
        this.vy = -PHYS.jumpV; this.jumpBuf = 0; this.coyote = 0; this.onGround = false; this.jumpHeld = true;
        world.dustBurst(this.x, this.y, 3);
        Sfx.play('jump');
      } else if (this.has('doublejump') && this.airJumps > 0) {
        this.vy = -PHYS.doubleJumpV; this.airJumps--; this.jumpBuf = 0; this.jumpHeld = true;
        world.ring(this.x, this.y - 4);
        Sfx.play('djump');
      }
    }
    if (I.released(KEYS.jump) && this.jumpHeld && this.vy < 0) { this.vy *= PHYS.jumpCut; this.jumpHeld = false; }
    if (this.vy >= 0) this.jumpHeld = false;

    // ---- attack ----
    if (this.atkBuf > 0 && this.atkCd <= 0) {
      this.atkBuf = 0;
      this.atkDir = up ? 'up' : (down && !this.onGround ? 'down' : 'side');
      this.atkT = wp.active; this.atkCd = wp.cd;
      this.atkHit = new Set();
      Sfx.play('slash');
    }
    if (this.atkT > 0) {
      const boxes = this.attackBoxes();
      for (const tg of world.targets) {
        if (this.atkHit.has(tg) || !boxes.some(b => overlap(b, tg.hitbox()))) continue;
        this.atkHit.add(tg);
        tg.hit(wp.dmg, this.facing, world);
        world.hitstop = 0.045;
        world.shake(1.5);
        Sfx.play('hit');
        if (this.atkDir === 'down') {
          this.vy = -PHYS.pogo; this.airJumps = 1; this.dashAvail = true; this.jumpHeld = false;
        } else if (this.atkDir === 'side') {
          this.vx = -this.facing * 80; this.recoilT = 0.08;
        }
      }
    }

    // ---- special (W): Bee Bolt ----
    if (I.pressed(KEYS.special) && this.has('bolt') && this.boltCd <= 0 && this.energy >= PHYS.boltCost && !this.healing) {
      this.energy -= PHYS.boltCost; this.boltCd = PHYS.boltCooldown;
      world.projectiles.push(new Projectile(this.x + this.facing * 8, this.y - 11, this.facing * 270));
      this.vx -= this.facing * 40; this.recoilT = 0.06;
      Sfx.play('bolt');
    }

    // ---- integrate ----
    const terrain = world.terrain;
    const nx = clamp(this.x + this.vx * dt, 8, (world.width || WORLD_W) - 8);
    if (terrain && this.blockedAt(terrain, nx)) this.vx = 0;     // a rock wall or a ceiling in the way
    else this.x = nx;
    const prev = this.y;
    this.y += this.vy * dt;
    const wasGround = this.onGround;
    this.onGround = false; this.platform = null;
    if (terrain) {
      const g = this.groundUnder(terrain);
      if (this.vy >= 0 && (this.y >= g || (wasGround && g - this.y <= 6))) {   // walk up and down slopes
        this.y = g; this.vy = 0; this.onGround = true;
      }
      const c = this.ceilingOver(terrain);
      if (c > 0 && this.y - this.h < c) { this.y = c + this.h; if (this.vy < 0) this.vy = 0; }
    }
    if (this.vy >= 0) {
      for (const pl of world.platforms) {
        if (pl === this.dropPlat) continue;
        if (this.x + this.hw > pl.x && this.x - this.hw < pl.x + pl.w && prev <= pl.y + 0.01 && this.y >= pl.y) {
          this.y = pl.y; this.vy = 0; this.onGround = true; this.platform = pl;
          break;
        }
      }
    }
    if (this.onGround) {
      this.coyote = PHYS.coyote; this.airJumps = 1; this.dashAvail = true;
      if (!wasGround) { world.dustBurst(this.x, this.y, 3); Sfx.play('land'); }
    }

    if (this.onGround && Math.abs(this.vx) > 20) this.animT += dt;
    else this.animT = 0;
  }
}

class Dummy {
  constructor(x) {
    this.x = x; this.y = GROUND_Y;
    this.angle = 0; this.av = 0; this.flash = 0;
    this.hits = 0; this.total = 0; this.log = [];
    this.soulCap = Infinity; this.soulsGiven = 0;      // a practice dummy sheds a little soul per hit
  }
  hitbox() { return { x: this.x - 8, y: this.y - 44, w: 16, h: 44 }; }

  hit(dmg, dirX, world) {
    this.hits++; this.total += dmg;
    this.log.push({ t: world.t, d: dmg });
    this.av += dirX * (0.9 + dmg * 0.18);
    this.flash = 0.1;
    world.floater(this.x + (Math.random() - 0.5) * 10, this.y - 52, String(dmg), '#ffe9a0');
    if (this.soulsGiven < this.soulCap && world.souls.length < 3) { this.soulsGiven++; world.spawnSoul(this.x, this.y - 30, 1); }
    for (let i = 0; i < 5; i++) {
      world.spawn({ x: this.x, y: this.y - 24, vx: (Math.random() - 0.5) * 90 + dirX * 40, vy: -Math.random() * 90, life: 0.5 + Math.random() * 0.3, color: '#c4aa6a', size: 2, grav: 300 });
    }
  }

  dps(now) {
    this.log = this.log.filter(e => now - e.t < 4);
    if (!this.log.length) return null;
    const first = this.log[0].t;
    const span = Math.max(1, now - first);
    return this.log.reduce((s, e) => s + e.d, 0) / span;
  }

  update(dt) {
    this.av += (-70 * this.angle - 5 * this.av) * dt;
    this.angle += this.av * dt;
    this.flash = Math.max(0, this.flash - dt);
  }
}

class Projectile {
  constructor(x, y, vx) { this.x = x; this.y = y; this.vx = vx; this.life = 0.9; this.dead = false; this.dmg = 3; }
  update(dt, world) {
    this.x += this.vx * dt; this.life -= dt;
    if (this.life <= 0 || this.x < 0 || this.x > (world.width || WORLD_W)) this.dead = true;
    const box = { x: this.x - 5, y: this.y - 4, w: 10, h: 8 };
    for (const tg of world.targets) {
      if (overlap(box, tg.hitbox())) {
        tg.hit(this.dmg, Math.sign(this.vx), world);
        world.shake(1.5);
        Sfx.play('hit');
        for (let i = 0; i < 8; i++) world.spawn({ x: this.x, y: this.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.35, color: i % 2 ? '#f0c020' : '#fff0b0', size: 2, grav: 0 });
        this.dead = true;
        break;
      }
    }
    if (Math.random() < 0.5) world.spawn({ x: this.x - Math.sign(this.vx) * 6, y: this.y + (Math.random() - 0.5) * 6, vx: 0, vy: 0, life: 0.22, color: '#e8b020', size: 1, grav: 0 });
  }
  // a bee, flying nose first
  draw(ctx) {
    const d = Math.sign(this.vx) || 1, f = Math.floor(performance.now() / 35) % 2, bob = Math.round(Math.sin(performance.now() / 30) * 1);
    ctx.save(); ctx.translate(Math.round(this.x), Math.round(this.y) + bob); ctx.scale(d, 1);
    px(ctx, -5, -3, 3, 5, '#fff0b0'); px(ctx, -7, -1, 3, 1, '#fff0b0');                    // the stinger end
    px(ctx, -5, -3, 11, 6, '#f0c020'); px(ctx, -2, -3, 2, 6, '#201000'); px(ctx, 2, -3, 2, 6, '#201000'); px(ctx, -5, -3, 11, 1, '#ffe070');
    px(ctx, 6, -2, 3, 4, '#201000'); px(ctx, 8, -2, 1, 1, '#ff5a3a');                      // head and eye
    px(ctx, 6, -5, 1, 2, '#201000'); px(ctx, 8, -5, 1, 2, '#201000');                       // antennae
    ctx.globalAlpha = 0.75; px(ctx, -3, -6 - f * 2, 6, 2, '#ffffff'); px(ctx, 0, -7 + f * 2, 5, 2, '#d8e8ff'); ctx.globalAlpha = 1;   // the wings
    ctx.restore();
  }
}
