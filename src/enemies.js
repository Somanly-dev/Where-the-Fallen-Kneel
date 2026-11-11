'use strict';

// Enemy soldiers. They are "targets": the player's sword and bolt hit them through hitbox() and hit().

const SOLDIERS = {
  grunt: { hp: 4, speed: 52, w: 12, h: 26, reach: 20, windup: 0.42, active: 0.12, cd: 0.9, dmg: 1, kb: 130, aggro: 190,
    drop: () => (Math.random() < 0.3 ? 2 : 1) },
  brute: { hp: 10, speed: 36, w: 20, h: 34, reach: 30, windup: 0.65, active: 0.18, cd: 1.4, dmg: 1, kb: 70, aggro: 220,
    drop: () => 3 },
  // the soldiers of the pits (boss 7): tougher, and they come looking for you
  pitgrunt: { look: 'grunt', hp: 10, speed: 56, w: 12, h: 26, reach: 22, windup: 0.42, active: 0.12, cd: 0.85, dmg: 1, kb: 90, aggro: 999,
    drop: () => (Math.random() < 0.3 ? 2 : 1) },
  pitbrute: { look: 'brute', hp: 22, speed: 40, w: 20, h: 34, reach: 32, windup: 0.62, active: 0.18, cd: 1.2, dmg: 1, kb: 40, aggro: 999,
    drop: () => 3 },
  // a hound of the pit guard: small, slow for a hound, and it goes down in a few hits
  pitdog: { look: 'dog', hp: 6, speed: 62, w: 18, h: 12, reach: 16, windup: 0.5, active: 0.14, cd: 1.1, dmg: 1, kb: 60, aggro: 999, lunge: 105,
    drop: () => 1 },
  captain: { look: 'captain', hp: 28, speed: 46, w: 14, h: 32, reach: 40, windup: 0.5, active: 0.14, cd: 1.0, dmg: 1, kb: 30, aggro: 999,
    drop: () => 3 },
};

class Soldier {
  constructor(x, kind = 'grunt', facing = -1) {
    this.kind = kind; this.T = SOLDIERS[kind]; this.look = this.T.look || kind;
    this.x = x; this.y = GROUND_Y; this.vx = 0; this.vy = 0; this.facing = facing;
    this.hp = this.T.hp;
    this.state = 'idle'; this.timer = 0; this.stunT = 0; this.flash = 0; this.animT = 0;
    this.didHit = false; this.dead = false; this.gone = false;
    this.passive = false;            // set when the capture starts: they close in but stop attacking
  }

  hitbox() { return { x: this.x - this.T.w / 2, y: this.y - this.T.h, w: this.T.w, h: this.T.h }; }

  attackBox() {
    const T = this.T;
    const x0 = this.facing > 0 ? this.x + T.w / 2 - 2 : this.x - T.w / 2 - T.reach + 2;
    if (this.look === 'dog') return { x: x0, y: this.y - T.h, w: T.reach, h: T.h };
    return { x: x0, y: this.y - T.h + 4, w: T.reach, h: T.h - 6 };
  }

  debugBoxes() { return this.state === 'attack' ? [{ box: this.attackBox(), color: '#ff9a3a' }] : []; }

  hit(dmg, dirX, world) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    // a hit never interrupts a swing; between swings it staggers him a little
    if (this.state !== 'windup' && this.state !== 'attack') { this.state = 'stun'; this.stunT = 0.22; this.vx = dirX * this.T.kb; }
    for (let i = 0; i < 4; i++) world.spawn({ x: this.x, y: this.y - this.T.h / 2, vx: (Math.random() - 0.5) * 80 + dirX * 40, vy: -Math.random() * 80, life: 0.4, color: '#7a2a30', size: 2, grav: 300 });
    if (this.hp <= 0) this.die(world);
  }

  die(world) {
    this.dead = true; this.gone = true;
    world.spawnSoul(this.x, this.y - this.T.h / 2, this.T.drop());
    for (let i = 0; i < 12; i++) world.spawn({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - Math.random() * this.T.h, vx: (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 90, life: 0.6, color: i % 2 ? '#3a3d4a' : '#7a2a30', size: 2, grav: 320 });
    world.shake(2);
    Sfx.play('kill');
  }

  update(dt, w) {
    if (this.dead) return;
    const T = this.T, p = w.player;
    this.flash = Math.max(0, this.flash - dt);
    this.vy += 1100 * dt;
    this.y += this.vy * dt;
    const gy = w.terrain ? w.terrain.groundAt(this.x) : GROUND_Y;
    if (this.y >= gy || (this.vy > 0 && gy - this.y <= 6)) { this.y = gy; this.vy = 0; }   // follows slopes
    const dx = p.x - this.x, ad = Math.abs(dx);

    if (this.state === 'stun') {
      this.stunT -= dt;
      this.vx = approach(this.vx, 0, 500 * dt);
      if (this.stunT <= 0) this.state = 'chase';
    } else if (this.passive) {                             // closing in to surround the knight
      const gap = p.x + (this.slot || 0) - this.x;
      this.facing = dx >= 0 ? 1 : -1;
      this.vx = Math.abs(gap) > 3 ? Math.sign(gap) * T.speed * 2.4 : 0;
      this.animT += dt;
    } else if (this.state === 'idle') {
      this.vx = 0;
      if (ad < T.aggro && !p.dead) this.state = 'chase';
    } else if (this.state === 'chase') {
      this.facing = dx >= 0 ? 1 : -1;
      this.animT += dt;
      if (ad > T.reach * 0.75) this.vx = this.facing * T.speed;
      else { this.vx = 0; this.state = 'windup'; this.timer = T.windup; }
    } else if (this.state === 'windup') {
      this.vx = 0; this.timer -= dt;
      if (this.timer <= 0) { this.state = 'attack'; this.timer = T.active; this.didHit = false; Sfx.play('slash'); }
    } else if (this.state === 'attack') {
      this.timer -= dt;
      if (T.lunge) this.vx = this.facing * T.lunge;                // a hound springs
      if (!this.didHit && overlap(this.attackBox(), p.hitbox())) { this.didHit = true; p.takeDamage(T.dmg, this.x, w); }
      if (this.timer <= 0) { this.state = 'cool'; this.timer = T.cd; }
    } else if (this.state === 'cool') {
      this.vx = 0; this.timer -= dt;
      if (this.timer <= 0) this.state = 'chase';
    }
    let nx = clamp(this.x + this.vx * dt, 40, (w.width || WORLD_W) - 40);
    if (w.terrain && this.vx) {
      const rise = this.y - w.terrain.groundAt(nx + Math.sign(this.vx) * T.w / 2);
      if (rise > 6) {                                      // a rock step: hop up it if it is low enough
        nx = this.x;
        if (rise <= 40 && this.vy === 0) this.vy = -280;
      }
    }
    this.x = nx;
  }

  draw(ctx) {
    const T = this.T, brute = this.look === 'brute', captain = this.look === 'captain', dog = this.look === 'dog';
    const armor = '#3a3d4a', dark = '#23242e', red = '#8a2a30', steel = '#c8ced8';
    const walk = Math.abs(this.vx) > 1 && (this.state === 'chase' || this.passive) && Math.floor(this.animT * 8) % 2;
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.scale(this.facing, 1);
    if (dog) {
      const fur = '#5a5560', furD = '#34303c', crouch = this.state === 'windup' ? 2 : 0, o = walk ? 2 : 0;
      px(ctx, -8, -4, 3, 4, furD); px(ctx, -3 + o, -4, 3, 4, furD); px(ctx, 3 - o, -4, 3, 4, furD); px(ctx, 7, -4, 3, 4, furD);
      px(ctx, -9, -10 + crouch, 17, 7, fur); px(ctx, -9, -10 + crouch, 17, 1, '#7a7584');
      pixLine(ctx, -9, -9 + crouch, -14, -13 + crouch, 2, fur);
      px(ctx, 6, -13 + crouch, 8, 7, fur); px(ctx, 12, -10 + crouch, 5, 3, furD); px(ctx, 7, -16 + crouch, 2, 4, fur); px(ctx, 11, -15 + crouch, 2, 3, fur);
      px(ctx, 5, -8 + crouch, 3, 2, '#c0405a');
      px(ctx, 10, -12 + crouch, 2, 2, this.state === 'windup' ? '#ffffff' : '#ff5a3a');
      if (this.state === 'windup' || this.state === 'attack') px(ctx, 14, -8 + crouch, 3, 1, '#ffffff');
    } else if (!brute) {
      px(ctx, -4, walk ? -7 : -8, 3, walk ? 7 : 8, dark); px(ctx, 1, walk ? -8 : -7, 3, walk ? 8 : 7, dark);
      px(ctx, -5, -18, 10, 11, armor); px(ctx, -2, -18, 4, 11, red); px(ctx, -5, -10, 10, 2, '#1c1d24');
      px(ctx, -4, -25, 8, 7, dark); px(ctx, 0, -22, 4, 2, '#ff5a3a'); px(ctx, -1, -27, 2, 2, red);
      if (captain) { px(ctx, -3, -33, 5, 6, '#c0405a'); px(ctx, -6, -18, 12, 3, '#c0405a'); px(ctx, -7, -20, 3, 12, '#6a1c20'); }
      if (this.state === 'windup') { px(ctx, 3, -22, 3, 2, armor); px(ctx, 5, -34 - (captain ? 6 : 0), 2, 14 + (captain ? 6 : 0), steel); }
      else if (this.state === 'attack') { px(ctx, 3, -17, 3, 2, armor); px(ctx, 6, -18, T.reach - 2, 2, steel); }
      else { px(ctx, 4, -15, 3, 2, armor); px(ctx, 6, -17, 2, 12, steel); }
    } else {
      px(ctx, -7, walk ? -9 : -10, 5, walk ? 9 : 10, dark); px(ctx, 2, walk ? -10 : -9, 5, walk ? 10 : 9, dark);
      px(ctx, -9, -24, 18, 15, armor); px(ctx, -3, -24, 6, 15, red); px(ctx, -9, -12, 18, 3, '#1c1d24');
      px(ctx, -10, -26, 5, 5, dark); px(ctx, 5, -26, 5, 5, dark);
      px(ctx, -6, -34, 12, 10, dark); px(ctx, 0, -30, 5, 2, '#ff5a3a'); px(ctx, -2, -37, 4, 3, red);
      if (this.state === 'windup') { px(ctx, 6, -26, 3, 2, armor); px(ctx, 8, -46, 3, 22, '#6a5a4a'); px(ctx, 3, -52, 13, 8, '#5a5e6e'); }
      else if (this.state === 'attack') { px(ctx, 7, -20, 3, 2, armor); px(ctx, 9, -21, 18, 3, '#6a5a4a'); px(ctx, 24, -26, 8, 12, '#5a5e6e'); }
      else { px(ctx, 8, -22, 3, 2, armor); px(ctx, 10, -32, 3, 22, '#6a5a4a'); px(ctx, 6, -36, 11, 7, '#5a5e6e'); }
    }
    if (this.flash > 0) { ctx.globalAlpha = 0.7; px(ctx, -T.w / 2, -T.h, T.w, T.h, '#ffffff'); ctx.globalAlpha = 1; }
    if (this.state === 'windup') { px(ctx, -1, -T.h - 12, 2, 6, '#ff5a3a'); px(ctx, -1, -T.h - 4, 2, 2, '#ff5a3a'); }
    ctx.restore();
  }
}
