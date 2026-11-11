'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

// Fill the window. Use whole-number scaling when it wastes little space, so pixels stay even.
function fitCanvas() {
  const fill = Math.min(innerWidth / W, innerHeight / H);
  const whole = Math.floor(fill);
  const scale = whole >= 1 && whole / fill >= 0.85 ? whole : fill;
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
}
addEventListener('resize', fitCanvas);
addEventListener('mousedown', () => window.focus());

// Owns the active scene and fades between scenes. Scenes call Game.go(() => new Scene()).
const Game = {
  scene: null,
  pending: null,
  fade: 1,                       // starts black and fades in

  go(make) { if (!this.pending) this.pending = make; },

  update(dt) {
    Ach.update(dt);
    if (Settings.devTools) {                                          // dev keys only work when Settings > Dev tools is on
      if (Input.pressed('Digit0')) Dev.hitboxes = !Dev.hitboxes;       // show every hitbox
      if (Input.pressed('Digit8')) Dev.invincible = true;              // 8 turns invincibility on (the knight takes no damage)
      if (Input.pressed('Digit9')) Dev.invincible = false;             // 9 turns it off
    } else applyDevSetting();
    this.fade = approach(this.fade, this.pending ? 1 : 0, dt * 4);
    if (this.pending && this.fade >= 1) {
      this.scene = this.pending();
      this.pending = null;
    }
    this.scene.update(dt);
  },

  draw(ctx) {
    this.scene.draw(ctx);
    if (this.fade > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (Dev.invincible) text(ctx, 'INVINCIBLE (9 = off)', 4, 262, '#ff8a3a');
    Ach.draw(ctx);
    // Keys only reach the game while the page has focus (an embedded preview needs a click first).
    if (!document.hasFocus()) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, 100, 105, 280, 60, '#f2c14e');
      text(ctx, 'Click here to play', 240, 124, '#f2c14e', 'center');
      text(ctx, 'The game needs keyboard focus', 240, 142, '#8a8aa6', 'center');
    }
  },
};

function stepGame(dt) {
  Game.update(dt);
  Input.endStep();
}

const STEP = 1 / 120;
let acc = 0, last = performance.now();

function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { stepGame(STEP); acc -= STEP; }
  ctx.imageSmoothingEnabled = false;
  Game.draw(ctx);
  requestAnimationFrame(frame);
}

function start() {
  fitCanvas();
  Game.scene = new TitleScene();
  requestAnimationFrame(t => { last = t; frame(t); });
}

// Wait briefly for the pixel font so the first frame is not drawn in a fallback face.
const afterRestore = () => { Settings.load(); Ach.load(); if (typeof Sfx.setVolume === 'function') Sfx.setVolume(Settings.volume); };
Promise.race([
  Promise.all([document.fonts ? document.fonts.load('8px "Press Start 2P"') : Promise.resolve(), Store.restore().then(afterRestore, afterRestore)]),
  new Promise(r => setTimeout(r, 2500)),
]).then(start, start);
