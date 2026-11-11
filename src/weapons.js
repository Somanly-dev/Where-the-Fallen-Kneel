'use strict';

// Weapon art: pixel drawings of the weapons, used for the weapon in the knight's hand, for the swing, and for the shop icons.
// A weapon is drawn from its grip at (x, y), pointing along ang (radians), len pixels long.

const WPN_SWING = ['spear', 'cleaver', 'chain', 'flail', 'dagger', 'hammer', 'scythe'];       // these have their own held art and swing

function wpnArt(ctx, kind, x, y, ang, len, t, o = {}) {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const P = (s, off) => [x + dx * s + nx * off, y + dy * s + ny * off];
  const L = (s0, s1, th, c, off = 0) => { const a = P(s0, off), b = P(s1, off); pixLine(ctx, a[0], a[1], b[0], b[1], th, c); };
  const dot = (s, off, w, c) => { const a = P(s, off); px(ctx, a[0] - w / 2, a[1] - w / 2, w, w, c); };
  const glow = o.glow || 0;

  if (kind === 'spear') {
    const fancy = !!o.fancy;
    const wood = fancy ? '#3a2a22' : '#6a5a4a', band = '#d8b050', steel = fancy ? '#e4ecf8' : '#c8ced8', steelD = fancy ? '#8a96aa' : '#8a8ea0', teal = '#7fffd4';
    // a faint glow around the head
    if (fancy || glow) { ctx.globalAlpha = (fancy ? 0.12 : 0) + 0.18 * glow; L(len - 13, len + 2, fancy ? 9 : 6, teal); ctx.globalAlpha = 1; }
    L(-6, len - 12, 2, wood);
    L(-6, -3, 3, '#1c1410');
    if (fancy) { for (const f of [0.25, 0.5, 0.74]) L(len * f, len * f + 2, 3, band); L(len * 0.5 + 3, len * 0.5 + 3, 3, '#a8782a'); }
    if (fancy) { const fl = Math.sin(t * 9) * 2; L(len - 14, len - 22, 1, '#c0405a', 1 + fl * 0.5); L(len - 14, len - 20, 1, '#8a2a30', -1 - fl * 0.5); }
    const prof = [1, 2, 3, 3, 3, 3, 2, 2, 1, 1, 1, 0];
    for (let i = 0; i < 12; i++) L(len - 12 + i, len - 11 + i, Math.max(1, prof[i] * (fancy ? 2 : 1) + (fancy ? 1 : 0)), steelD);
    for (let i = 1; i < 12; i++) L(len - 12 + i, len - 11 + i, Math.max(1, (prof[i] - 1) * (fancy ? 2 : 1) + 1), steel);
    L(len - 10, len - 2, 1, fancy ? teal : '#ffffff');
    if (fancy) {
      const a = P(len - 13, -5), b = P(len - 13, 5);
      pixLine(ctx, a[0], a[1], b[0], b[1], 2, band);
      for (const sg of [-1, 1]) { const q = P(len - 13, sg * 5), r = P(len - 18, sg * 7); pixLine(ctx, q[0], q[1], r[0], r[1], 1, steelD); }
      dot(len + 1, 0, 2, '#ffffff');
    }
  } else if (kind === 'cleaver' && o.fancy) {
    // the Royal Guard Cleaver: dark armor plate, gold bands, the queen's brand, and wings at the guard
    const gold = '#e8b020', goldL = '#ffe070', iron = '#4a4a62', ironL = '#8a8ea8', edge = '#e4e8f4';
    L(-5, 6, 3, '#15161c');
    for (let s = -4; s < 6; s += 4) L(s, s + 1, 3, gold);
    for (const sg of [-1, 1]) {                                                     // two swept-back wings
      const a = P(6, sg * 4), b = P(-2, sg * 11), c = P(2, sg * 8);
      ctx.globalAlpha = 0.65; pixLine(ctx, a[0], a[1], b[0], b[1], 3, '#d8ecff');
      ctx.globalAlpha = 0.9; pixLine(ctx, a[0], a[1], c[0], c[1], 1, '#ffffff'); ctx.globalAlpha = 1;
    }
    { const a = P(6, -5), b = P(6, 5); pixLine(ctx, a[0], a[1], b[0], b[1], 2, gold); }
    dot(-6, 0, 3, gold); dot(-6, 0, 1, '#c0405a');
    for (let s = 7; s <= len; s++) {
      const k = (s - 7) / Math.max(1, len - 7), half = Math.round(3 + k * 3);
      L(s, s + 1, half * 2 + 1, iron);
      dot(s, -half, 2, ironL);
      dot(s, half, 2, edge);
    }
    L(len + 1, len + 1, 12, iron);
    for (const f of [0.3, 0.8]) { const hf = Math.round(3 + f * 3); for (let o = -hf + 1; o < hf; o += 2) dot(7 + (len - 7) * f, o, 2, gold); }
    L(len * 0.18, len * 0.4, 1, '#c0405a', -3);
    { const s0 = len * 0.55;                                                       // the queen, small: a crown over a striped body
      dot(s0 + 4, -2, 1, goldL); dot(s0 + 4, 0, 1, goldL); dot(s0 + 4, 2, 1, goldL); dot(s0 + 3, 0, 3, goldL);
      dot(s0 + 1, 0, 2, '#15161c'); dot(s0 - 1, 0, 2, gold); dot(s0 - 3, 0, 2, '#15161c'); dot(s0 - 5, 0, 2, gold); }
    dot(len - 6, -2, 1, gold); dot(len - 6, 2, 1, gold);
    if (glow) { ctx.globalAlpha = 0.55 * glow; L(len * 0.35, len + 1, 2, '#ffc83c', 8); L(len * 0.5, len, 1, '#fff0b0', 9); ctx.globalAlpha = 1; }
  } else if (kind === 'cleaver') {
    L(-5, 6, 3, '#3a2a22');
    for (let s = -4; s < 6; s += 3) L(s, s, 3, '#6a4a34');
    { const a = P(6, -4), b = P(6, 4); pixLine(ctx, a[0], a[1], b[0], b[1], 2, '#6a6e86'); }
    dot(-6, 0, 3, '#8a8ea2');
    for (let s = 7; s <= len; s++) {
      const k = (s - 7) / Math.max(1, len - 7), half = Math.round(3 + k * 3);
      L(s, s + 1, half * 2 + 1, '#8a8ea0');
      dot(s, -half, 2, '#2c2e3a');
      dot(s, half, 2, (s % 7 === 3) ? '#2c2e3a' : '#f4f8ff');                  // the nicked edge
    }
    L(len + 1, len + 1, 12, '#8a8ea0');
    dot(len * 0.45, 0, 2, '#c0405a'); dot(len * 0.45 + 3, 1, 1, '#c0405a');   // a brand worn into the steel
    dot(len - 6, -2, 2, '#15161c');
    if (glow) { ctx.globalAlpha = 0.55 * glow; L(len * 0.35, len + 1, 2, '#ff7a30', 8); L(len * 0.5, len, 1, '#ffd09a', 9); ctx.globalAlpha = 1; }
  } else if (kind === 'chain') {
    const amp = o.wave || 0, links = Math.max(1, Math.floor((len - 14) / 4));
    L(-5, 5, 3, '#4a3a2a'); L(-5, -9, 1, '#9aa0b8');
    { const a = P(2, -4), b = P(2, 4); pixLine(ctx, a[0], a[1], b[0], b[1], 1, '#9aa0b8'); }
    let tip = 6;
    for (let i = 0; i < links; i++) {
      const s = 6 + i * 4, off = Math.sin(t * 22 + i * 0.9) * amp * ((i + 1) / links);
      L(s, s + 3, 3, i % 2 ? '#9aa0b8' : '#4a4e62', off); dot(s + 1.5, off, 1, '#f4f8ff');
      tip = s + 4;
    }
    const off = Math.sin(t * 22 + links * 0.9) * amp;
    if (glow) { ctx.globalAlpha = 0.16 * glow; L(6, len, 4, '#b4a8ff'); ctx.globalAlpha = 1; }
    L(tip, tip + 8, 3, '#c8ccdc', off); L(tip + 8, tip + 11, 1, '#ffffff', off);
    for (const sg of [-1, 1]) L(tip + 2, tip - 1, 1, '#c8ccdc', off + sg * 3);
    for (const sg of [-1, 1]) L(tip + 5, tip + 2, 1, '#9aa0b8', off + sg * 3);
  } else if (kind === 'flail') {
    L(-5, 9, 3, '#4a3a2a'); L(1, 2, 4, '#6a6e86'); L(6, 7, 4, '#6a6e86'); dot(-6, 0, 3, '#8a8ea2');
    for (let s = 10; s < len - 3; s += 3) { L(s, s + 2, 2, (s / 3) % 2 ? '#9aa0b8' : '#5a5e72'); }
    const b = P(len, 0);
    drawBell(ctx, b[0], b[1] - 1, 11, 8, '#a87838', '#e8b868', '#6a4a20');
    px(ctx, b[0] - 1, b[1] + 10, 3, 2, '#3a2a14');
    if (glow || o.sparkle) { for (let i = 0; i < 4; i++) { const a = t * 3 + i * 1.6; px(ctx, b[0] + Math.cos(a) * 9, b[1] + 4 + Math.sin(a * 1.3) * 7, 1, 1, i % 2 ? '#fff0b0' : '#e8b868'); } }
  } else if (kind === 'sword') {
    L(-5, 4, 3, '#4a3a2a'); { const a = P(4, -5), b = P(4, 5); pixLine(ctx, a[0], a[1], b[0], b[1], 2, '#d8b050'); }
    L(5, len, 3, o.color || '#dfe6ff'); L(5, len, 1, '#ffffff', -1); L(len, len + 2, 1, '#ffffff');
  } else if (kind === 'dagger') {
    for (const off of (o.single ? [0] : [-3, 3])) { L(-3, 3, 2, '#4a3a2a', off); L(3, len, 2, o.color || '#9ff0d0', off); L(3, len, 1, '#ffffff', off - 1); L(len, len + 2, 1, '#ffffff', off); }
  } else if (kind === 'hammer') {
    L(-5, len, 3, '#6a4a34'); L(len * 0.3, len * 0.3 + 1, 4, '#8a6a48');
    const a = P(len - 2, -9), b = P(len - 2, 9); pixLine(ctx, a[0], a[1], b[0], b[1], 9, '#8a8ea0');
    pixLine(ctx, a[0], a[1], b[0], b[1], 3, o.color || '#ffb070');
    const c = P(len - 6, -9), d = P(len - 6, 9); pixLine(ctx, c[0], c[1], d[0], d[1], 1, '#2c2e3a');
  } else if (kind === 'scythe') {
    L(-5, len, 2, '#4a3a2a');
    for (let u = 0; u <= 1.001; u += 0.05) { const s = len - 2 + 18 * Math.sin(u * 1.5), off = -2 - 22 * u * u; const q = P(s, off); px(ctx, q[0] - 1, q[1] - 1, 3 - Math.floor(u * 1.5), 3 - Math.floor(u * 1.5), u < 0.5 ? (o.color || '#ff6a8a') : '#ffd0d8'); }
    ctx.globalAlpha = 0.25; for (let u = 0; u <= 1.001; u += 0.1) { const s = len - 2 + 18 * Math.sin(u * 1.5), off = -4 - 22 * u * u; const q = P(s, off); px(ctx, q[0] - 2, q[1] - 2, 4, 4, '#ff6a2a'); } ctx.globalAlpha = 1;
  }
}

// The weapon in the knight's hand while he is not swinging. Drawn in the knight's own space: feet at the origin, facing right.
function wpnHeld(ctx, wp, t) {
  const hx = 8, hy = -10;
  if (wp.kind === 'spear') wpnArt(ctx, 'spear', hx, hy, -1.22, 46, t, { fancy: wp.fancy });
  else if (wp.kind === 'cleaver') wpnArt(ctx, 'cleaver', hx, hy, -0.95, 30, t, { fancy: wp.fancy });
  else if (wp.kind === 'chain') wpnArt(ctx, 'chain', hx, hy, 1.35 + Math.sin(t * 3) * 0.08, 18, t, { wave: 0.8 });
  else if (wp.kind === 'flail') wpnArt(ctx, 'flail', hx, hy, 1.4 + Math.sin(t * 3) * 0.1, 17, t, { sparkle: true });
  else if (wp.kind === 'dagger') { wpnArt(ctx, 'dagger', hx, hy, -0.5, 17, t, { single: true, color: wp.color }); wpnArt(ctx, 'dagger', -6, -13, 2.5, 13, t, { single: true, color: wp.color }); }
  else if (wp.kind === 'hammer') wpnArt(ctx, 'hammer', hx, hy, -0.95, 30, t, { color: wp.color });
  else if (wp.kind === 'scythe') wpnArt(ctx, 'scythe', hx, hy, -1.05, 34, t, { color: wp.color });
}

// The swing: drawn in world space around the knight while an attack is live.
function drawWeaponSwing(ctx, p, wp) {
  const prog = 1 - p.atkT / wp.active, S = PHYS.attackScale, f = p.facing, t = performance.now() / 1000;
  const reach = wp.reach * S, base = p.atkDir === 'up' ? -Math.PI / 2 : p.atkDir === 'down' ? Math.PI / 2 : 0;
  const e = 1 - Math.pow(1 - clamp(prog * 1.5, 0, 1), 2);
  const fade = 1 - prog * 0.5;
  ctx.save();
  ctx.translate(Math.round(p.x), Math.round(p.y - 11));
  if (p.atkDir === 'side') ctx.scale(f, 1);

  if (wp.kind === 'spear') {
    const len = 16 + (reach + 4 - 16) * e;
    ctx.globalAlpha = 0.42 * (1 - prog);                                    // the streak behind the point
    for (const off of [-4, 0, 4]) { const dx = Math.cos(base), dy = Math.sin(base), nx = -dy, ny = dx; pixLine(ctx, dx * 6 + nx * off, dy * 6 + ny * off, dx * len + nx * off, dy * len + ny * off, 1, off ? '#7fffd4' : '#ffffff'); }
    ctx.globalAlpha = 1;
    wpnArt(ctx, 'spear', 4, 0, base, len, t, { fancy: wp.fancy, glow: 1 });
    if (prog > 0.4) { const dx = Math.cos(base), dy = Math.sin(base); for (let i = 0; i < 5; i++) px(ctx, dx * (len + 2 + i * 2) + (i % 2 ? 2 : -2), dy * (len + 2 + i * 2) + (i % 3 - 1) * 2, 1, 1, '#c8fff0'); }
  } else if (wp.kind === 'cleaver') {
    const a = base + (-1.2 + 2.4 * e);
    for (let k = 7; k >= 1; k--) {                                          // a trail of embers behind the blade
      const ang = a - k * 0.17;
      ctx.globalAlpha = (0.55 - k * 0.07) * fade;
      pixLine(ctx, Math.cos(ang) * 12, Math.sin(ang) * 12, Math.cos(ang) * (reach * 0.95 + 4), Math.sin(ang) * (reach * 0.95 + 4), 2, wp.fancy ? (k % 2 ? '#ffc83c' : '#fff0b0') : (k % 2 ? '#ff7a30' : '#ffd09a'));
    }
    ctx.globalAlpha = 1;
    wpnArt(ctx, 'cleaver', 2, 0, a, reach * 0.9, t, { glow: 1, fancy: wp.fancy });
  } else if (wp.kind === 'chain') {
    const len = 12 + (reach + 6 - 12) * e;
    ctx.globalAlpha = 0.3 * (1 - prog);
    wpnArt(ctx, 'chain', 4, 2, base, len, t + 0.05, { wave: 4, glow: 1 });
    ctx.globalAlpha = 1;
    wpnArt(ctx, 'chain', 4, 0, base, len, t, { wave: 3.5 * (1 - prog), glow: 1 });
  } else if (wp.kind === 'flail') {
    const sides = p.atkDir === 'side' ? [1, -1] : [1];
    for (const sg of sides) {
      ctx.save(); if (sg < 0) ctx.scale(-1, 1);
      const a = base + (-1.35 + 1.6 * e), r = reach * 0.92;
      const bx = Math.cos(a) * r, by = Math.sin(a) * r;
      ctx.globalAlpha = 0.35 * fade;
      for (let k = 1; k <= 3; k++) { const ang = a - k * 0.2; pixLine(ctx, 0, 0, Math.cos(ang) * r, Math.sin(ang) * r, 1, '#e8b868'); }
      ctx.globalAlpha = 1;
      wpnArt(ctx, 'flail', 0, 0, a, r, t, { sparkle: true });
      // the ring of sound that comes off the bell
      for (let k = 0; k < 2; k++) {
        const rr = 6 + prog * 16 + k * 7; ctx.globalAlpha = Math.max(0, (1 - prog) * (k ? 0.45 : 0.8));
        for (let ang = -1.2; ang <= 1.2; ang += 0.4) px(ctx, bx + Math.cos(ang + a) * rr, by + 4 + Math.sin(ang + a) * rr, 2, 2, '#ffe9a0');
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  } else if (wp.kind === 'dagger') {
    // two quick cuts that cross: the second blade chases the first
    const a1 = base + (-0.95 + 1.9 * e), a2 = base + (0.95 - 1.9 * e), len = reach * 0.9 + 4;
    for (const [a, sg, c] of [[a1, 1, '#9ff0d0'], [a2, -1, '#ffffff']]) {
      for (let k = 5; k >= 1; k--) { const ang = a - sg * k * 0.2; ctx.globalAlpha = (0.55 - k * 0.09) * fade; pixLine(ctx, Math.cos(ang) * 6, Math.sin(ang) * 6, Math.cos(ang) * (len + 2), Math.sin(ang) * (len + 2), 1, k % 2 ? c : '#d8fff0'); }
      ctx.globalAlpha = 1;
      wpnArt(ctx, 'dagger', 3, sg > 0 ? 0 : 2, a, len, t, { single: true, color: wp.color });
      px(ctx, 3 + Math.cos(a) * (len + 2) - 1, (sg > 0 ? 0 : 2) + Math.sin(a) * (len + 2) - 1, 2, 2, '#ffffff');
    }
  } else if (wp.kind === 'hammer') {
    // an overhead smash: the head comes down heavy, and the floor jumps where it lands
    const a = base + (-2.1 + 3.0 * e), len = reach * 0.92;
    for (let k = 6; k >= 1; k--) { const ang = a - k * 0.2; ctx.globalAlpha = (0.5 - k * 0.06) * fade; pixLine(ctx, Math.cos(ang) * 14, Math.sin(ang) * 14, Math.cos(ang) * (len + 6), Math.sin(ang) * (len + 6), 3, k % 2 ? '#ffb070' : '#8a8ea0'); }
    ctx.globalAlpha = 1;
    wpnArt(ctx, 'hammer', 2, 0, a, len, t, { color: wp.color });
    if (prog > 0.5 && p.atkDir !== 'up') {
      const k = clamp((prog - 0.5) * 2, 0, 1);
      ctx.globalAlpha = 1 - k;
      for (let i = 0; i < 6; i++) { const sx = (p.atkDir === 'down' ? 0 : 10 + i * 6 + k * 8) + (i % 2 ? 2 : -2); px(ctx, p.atkDir === 'down' ? (i - 3) * 6 : sx, 10 - Math.round(Math.sin(k * 3 + i) * 4), 3, 2, i % 2 ? '#c8a880' : '#ffb070'); }
      ctx.globalAlpha = 1;
    }
  } else if (wp.kind === 'scythe') {
    // a wide burning reap: a crescent of embers follows the blade
    const a = base + (-1.4 + 2.5 * e), len = reach * 0.85;
    for (let k = 10; k >= 1; k--) {
      const ang = a - k * 0.13, rr = len + 8 + 4 * Math.sin(k);
      ctx.globalAlpha = (0.7 - k * 0.06) * fade;
      px(ctx, Math.cos(ang) * rr - 1, Math.sin(ang) * rr - 1, 3, 3, k % 3 === 0 ? '#ffd0d8' : (k % 3 === 1 ? '#ff6a2a' : '#ff6a8a'));
      px(ctx, Math.cos(ang) * (rr - 5) - 1, Math.sin(ang) * (rr - 5) - 1, 2, 2, '#ff9a50');
    }
    ctx.globalAlpha = 1;
    wpnArt(ctx, 'scythe', 2, 0, a, len, t, { color: wp.color });
    for (let i = 0; i < 6; i++) { const q = a - 0.1 * i; px(ctx, Math.cos(q) * (len + 12) + Math.sin(t * 17 + i) * 2, Math.sin(q) * (len + 12) - ((t * 40 + i * 5) % 10), 1, 1, i % 2 ? '#ffe9a0' : '#ff9a50'); }
  }
  ctx.restore();
}

// A weapon on show: the shop's picture. Draws a framed box with the weapon held at an angle and a small glint.
function drawWeaponIcon(ctx, wp, x, y, w, h, t) {
  px(ctx, x, y, w, h, '#0a0c1a'); px(ctx, x, y, w, 1, '#454859'); px(ctx, x, y + h - 1, w, 1, '#454859'); px(ctx, x, y, 1, h, '#454859'); px(ctx, x + w - 1, y, 1, h, '#454859');
  ctx.save();
  ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
  const kind = wp.kind || (wp.id === 'twin_daggers' ? 'dagger' : wp.id === 'gravehammer' ? 'hammer' : wp.id === 'ember_scythe' ? 'scythe' : 'sword');
  const bob = Math.sin(t * 2) * 1.2;
  const lens = { spear: 54, cleaver: 38, chain: 52, flail: 34, sword: 36, dagger: 26, hammer: 38, scythe: 32 }, angs = { spear: -0.62, cleaver: -0.7, chain: -0.35, flail: -0.55, sword: -0.65, dagger: -0.7, hammer: -0.7, scythe: -0.9 };
  wpnArt(ctx, kind, x + 8, y + h - 8 + bob, angs[kind], lens[kind], t, { fancy: wp.fancy, color: wp.color, wave: kind === 'chain' ? 1.5 : 0, glow: wp.fancy || kind === 'cleaver' ? 0.5 + 0.3 * Math.sin(t * 3) : 0, sparkle: true });
  ctx.restore();
}
