'use strict';

const FONT = '8px "Press Start 2P", monospace';

const C = {
  text: '#e8e2d0', dim: '#8a8aa6', gold: '#f2c14e', good: '#7fe0a0', bad: '#ff6a7a',
  panelBg: 'rgba(10,12,26,0.94)', panelBorder: '#6d6c92', panelInner: '#23233f',
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, step) => v < target ? Math.min(target, v + step) : Math.max(target, v - step);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// Draw a sprite from rows of characters. '.' is transparent, other chars index into pal.
function drawPix(ctx, rows, x, y, pal) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch !== '.' && pal[ch]) px(ctx, x + c, y + r, 1, 1, pal[ch]);
    }
  }
}

function text(ctx, s, x, y, color = C.text, align = 'left', size = 8) {
  ctx.font = size === 8 ? FONT : `${size}px "Press Start 2P", monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  const o = size >= 16 ? 2 : 1;
  ctx.fillStyle = '#05060c';
  ctx.fillText(s, Math.round(x) + o, Math.round(y) + o);
  ctx.fillStyle = color;
  ctx.fillText(s, Math.round(x), Math.round(y));
}

function textW(ctx, s) {
  ctx.font = FONT;
  return ctx.measureText(s).width;
}

function wrapText(ctx, s, maxW) {
  ctx.font = FONT;
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function panel(ctx, x, y, w, h, border = C.panelBorder) {
  ctx.fillStyle = C.panelBg;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
  px(ctx, x + 1, y, w - 2, 1, border);
  px(ctx, x + 1, y + h - 1, w - 2, 1, border);
  px(ctx, x, y + 1, 1, h - 2, border);
  px(ctx, x + w - 1, y + 1, 1, h - 2, border);
  px(ctx, x + 2, y + 2, w - 4, 1, C.panelInner);
  px(ctx, x + 2, y + h - 3, w - 4, 1, C.panelInner);
}

// Small icons
const MASK_ROWS = [
  '.#####.',
  '#######',
  '#.###.#',
  '#.###.#',
  '.#####.',
  '..###..',
];
function drawMask(ctx, x, y, full) {
  drawPix(ctx, MASK_ROWS, x, y, { '#': full ? '#ece6d4' : '#2c2c44' });
  if (full) {
    px(ctx, x + 1, y + 2, 1, 2, '#0a0a14');
    px(ctx, x + 5, y + 2, 1, 2, '#0a0a14');
  }
}

function drawEnergyPip(ctx, x, y, full) {
  const c = full ? '#7fe8ff' : '#26324a';
  px(ctx, x + 1, y, 3, 5, c);
  px(ctx, x, y + 1, 5, 3, c);
  if (full) px(ctx, x + 1, y + 1, 1, 1, '#ffffff');
}

function drawCoin(ctx, x, y) {
  px(ctx, x + 1, y, 3, 1, '#f2c14e');
  px(ctx, x, y + 1, 5, 3, '#f2c14e');
  px(ctx, x + 1, y + 4, 3, 1, '#f2c14e');
  px(ctx, x + 2, y + 1, 1, 3, '#b7882a');
}

function radialLight(g, x, y, r, rgba0, rgba1) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, rgba0);
  grad.addColorStop(1, rgba1);
  g.fillStyle = grad;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
