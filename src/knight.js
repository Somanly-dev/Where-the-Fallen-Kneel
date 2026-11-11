'use strict';

// The player sprite: a 32x32 pixel grid, feet on the bottom row, facing right.
// Each pose is drawn once per look and cached. The hitbox (10 x 22) is unrelated to the art
// and identical for every look.

const KNIGHT_FRAMES = {};

// o = { bob: 0|1, legs: 'stand'|'run1'|'run2'|'air', arm: 'rest'|'swing'|'up'|'down', trail: 0..3 }
function knightFrame(L, o) {
  const key = `${L.kind}|${o.bob}|${o.legs}|${o.arm}|${o.trail}`;
  if (KNIGHT_FRAMES[key]) return KNIGHT_FRAMES[key];

  const cv = makeCanvas(32, 32), g = cv.getContext('2d');
  const P = (a, b, c) => { g.fillStyle = c; g.fillRect(a, b, 1, 1); };
  const block = (x0, y0, w, h, c) => { g.fillStyle = c; g.fillRect(x0, y0, w, h); };
  const ell = (cx, cy, rx, ry, f) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let q = Math.floor(cx - rx); q <= Math.ceil(cx + rx); q++) {
        const dx = (q + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) f(q, y);
      }
    }
  };
  const hy = o.bob;
  const WOOD = '#6a5a4a';

  // dusk: crescent moon hovering behind
  if (L.kind === 'dusk') {
    const cut = new Set();
    ell(5, 11 + hy, 2.6, 3, (q, y) => cut.add(q + ',' + y));
    ell(3.5, 11.5 + hy, 3, 3.4, (q, y) => { if (!cut.has(q + ',' + y)) P(q, y, L.T); });
  }

  // gilded: a thin golden ring behind the head
  if (L.kind === 'gilded') {
    for (let y = 0; y <= 22; y++) for (let q = 3; q <= 28; q++) {
      const dx = (q + 0.5 - 15.5) / 12, dy = (y + 0.5 - (10.5 + hy)) / 11, d = dx * dx + dy * dy;
      if (d <= 1 && d > 0.8) P(q, y, L.T);
    }
  }
  // ember: a scarf that trails behind
  if (L.kind === 'ember') {
    for (let y = 17; y <= 26; y++) {
      const w = Math.round(2 + Math.sin((y - 17) * 0.7) * 1.5);
      for (let i = 0; i < 3; i++) P(8 - w - i + (y > 21 ? -1 : 0), y, i === 0 ? L.T : '#d9741f');
    }
  }

  // cape tail trails further behind when moving
  for (let y = 22; y <= 30; y++) {
    for (let q = 4 - o.trail + Math.floor((y - 22) * -0.2); q < 9; q++) P(q, y, L.Cs);
  }
  // body
  for (let y = 17; y <= 29; y++) {
    const xl = 9 - Math.floor((y - 17) * 0.3), xr = 22 + Math.floor((y - 17) * 0.25);
    for (let q = xl; q <= xr; q++) P(q, y, (q >= xr - 1 || y >= 28) ? L.Cs : L.C);
  }
  if (L.kind === 'cinder') {
    [[13, 20], [13, 21], [14, 22], [14, 23], [15, 24], [19, 19], [19, 20], [18, 21], [18, 22], [17, 23], [17, 24], [10, 25], [11, 26], [20, 26], [21, 27]]
      .forEach(([a, b]) => P(a, b, L.T));
    [[13, 20], [19, 19], [14, 23], [18, 22]].forEach(([a, b]) => P(a, b, '#ffd09a'));
  }

  // legs
  const leg = (q0, q1, y0, y1) => block(q0, y0, q1 - q0 + 1, y1 - y0 + 1, L.Cs);
  if (o.legs === 'run1') { leg(10, 13, 29, 31); leg(19, 22, 30, 31); }
  else if (o.legs === 'run2') { leg(12, 15, 30, 31); leg(17, 20, 29, 31); }
  else if (o.legs === 'air') { leg(12, 14, 29, 30); leg(17, 19, 29, 30); }
  else { leg(11, 14, 29, 31); leg(18, 21, 29, 31); }

  // arm and blade
  if (o.arm === 'none') {                                 // villagers, and the knight once bound
    block(21, 21, 3, 6, L.C);
  } else if (o.arm === 'restX') {                          // holding a different weapon: the arm only
    block(21, 21, 4, 3, L.C);
  } else if (o.arm === 'swingX') {
    block(21, 20, 6, 2, L.C);
  } else if (o.arm === 'upX') {
    block(21, 17, 3, 4, L.C);
  } else if (o.arm === 'downX') {
    block(21, 22, 3, 4, L.C);
  } else if (o.arm === 'swing') {
    block(21, 20, 6, 2, L.C);
    P(27, 20, WOOD); P(28, 20, WOOD);
    block(29, 20, 3, 2, L.N);
  } else if (o.arm === 'up') {
    block(21, 17, 3, 4, L.C);
    P(24, 16, WOOD); P(24, 15, WOOD);
    block(24, 8, 2, 7, L.N);
  } else if (o.arm === 'down') {
    block(21, 22, 3, 4, L.C);
    P(24, 26, WOOD); P(24, 27, WOOD);
    block(24, 28, 2, 4, L.N);
  } else {
    block(21, 21, 4, 3, L.C);
    for (let i = 0; i < 8; i++) {
      P(24 + i, 22 - i, i < 2 ? WOOD : L.N);
      if (i >= 2) P(24 + i, 23 - i, L.N);
    }
    P(23, 20, WOOD); P(24, 21, WOOD);
  }

  // neck and collar
  block(12, 14, 8, 5, L.Cs);
  if (L.kind === 'moss') {
    for (let q = 9; q <= 22; q += 3) { P(q, 17, L.T); P(q + 1, 17, L.T); P(q, 18, L.T); P(q + 1, 18, L.Cs); P(q, 19, L.T); }
  } else if (L.kind === 'dusk') {
    for (let q = 9; q <= 22; q++) { P(q, 17, L.T); P(q, 28, L.T); }
    for (let y = 18; y <= 28; y++) { P(15, y, L.T); P(16, y, L.T); }
  } else if (L.kind === 'cinder') {
    for (let q = 10; q <= 21; q++) P(q, 18, L.T);
  } else if (L.kind === 'pale') {
    for (let q = 10; q <= 21; q++) P(q, 18, L.T);
  } else if (L.kind === 'ember') {
    for (let q = 10; q <= 22; q++) { P(q, 17, L.T); P(q, 18, L.T); }
  } else if (L.kind === 'frost') {
    for (let k = 9; k <= 22; k++) P(k, 18, L.Cs);
    for (let q = 9; q <= 22; q += 3) {
      P(q + 1, 15, L.T); P(q, 16, L.T); P(q + 1, 16, '#ffffff'); P(q + 2, 16, L.T);
      P(q, 17, L.T); P(q + 1, 17, L.T); P(q + 2, 17, L.T); P(q + 1, 18, L.T);
    }
  } else if (L.kind === 'gilded') {
    for (let q = 9; q <= 22; q++) { P(q, 17, L.T); P(q, 28, L.T); }
  } else if (L.kind === 'earth') {
    for (let q = 9; q <= 22; q++) P(q, 24, L.T);
  } else if (L.kind === 'rose') {
    for (let q = 9; q <= 22; q += 2) { P(q, 17, L.T); P(q + 1, 18, L.T); }
  }

  // horns
  const horn = (pts) => pts.forEach(([a, b], i) => {
    const c = i < 2 ? L.H : L.M;
    P(a, b + hy, c); P(a + 1, b + hy, c);
  });
  horn([[7, 0], [8, 1], [8, 2], [9, 3], [9, 4], [10, 5]]);
  horn([[22, 0], [22, 1], [21, 2], [20, 3], [19, 4], [18, 5]]);
  if (L.kind === 'frost') { P(6, 2 + hy, L.H); P(23, 3 + hy, L.H); P(7, 3 + hy, L.H); }      // jagged horn tips

  // mask
  ell(15.5, 10.5 + hy, 8, 7, (q, y) => {
    const shade = (q < 10 || y > 15 + hy) || (q - 15) * (q - 15) + (y - 10 - hy) * (y - 10 - hy) > 46;
    P(q, y, shade ? L.Ms : L.M);
  });
  ell(15.5, 10.5 + hy, 8, 7, (q, y) => { if (y < 6 + hy && q > 12 && q < 20) P(q, y, L.M); });
  const crack = L.kind === 'cinder' ? L.T : L.Ms;
  for (let y = 5; y <= 7; y++) P(15, y + hy, crack);
  P(14, 7 + hy, crack);
  ell(12.2, 10.6 + hy, 1.7, 2.7, (q, y) => P(q, y, '#07070d'));
  ell(19.2, 10.6 + hy, 1.7, 2.7, (q, y) => P(q, y, '#07070d'));
  P(12, 9 + hy, L.E); P(19, 9 + hy, L.E);
  P(16, 14 + hy, '#07070d');

  return (KNIGHT_FRAMES[key] = cv);
}

function drawKnight(ctx, p, t) {
  const look = p.look || LOOKS[0];
  if (p.invuln > 0 && Math.floor(p.invuln * 18) % 2 === 0) return;      // flicker while invulnerable
  const run = p.onGround && Math.abs(p.vx) > 20 && !p.healing;
  let legs = 'stand';
  if (!p.onGround) legs = 'air';
  else if (run) legs = Math.floor(p.animT * 11) % 2 ? 'run1' : 'run2';
  const wp = p.weapon, custom = !!(wp && WPN_SWING.includes(wp.kind)) && !p.bound && !p.lying;
  let arm = p.bound ? 'none' : (p.atkT > 0 ? (p.atkDir === 'side' ? 'swing' : p.atkDir) : 'rest');
  if (custom) arm += 'X';
  const bob = p.bound ? 1 : ((!run && p.onGround && Math.sin(t * 3) > 0.35) ? 1 : 0);      // head bowed once bound
  const trail = Math.round(clamp(p.vx * p.facing / 40, 0, 3));
  const frame = knightFrame(look, { bob, legs, arm, trail });

  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y));
  ctx.scale(p.facing, 1);
  if (p.dashing) ctx.scale(1.25, 0.9);
  if (p.lying) { ctx.translate(0, -16); ctx.rotate(-Math.PI / 2); ctx.drawImage(frame, -16, -16); }
  else ctx.drawImage(frame, -16, -32);
  if (custom && p.atkT <= 0) wpnHeld(ctx, wp, t);
  if (p.healing) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 20);
    px(ctx, -9, -30, 18, 1, '#bff6ff');
    px(ctx, -9, 0, 18, 1, '#bff6ff');
    px(ctx, -9, -30, 1, 30, '#bff6ff');
    px(ctx, 8, -30, 1, 30, '#bff6ff');
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
