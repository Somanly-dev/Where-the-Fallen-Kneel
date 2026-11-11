'use strict';

// The Foundry: three more attacks for each of bosses 1 to 7 (the Heap, Old Sprocket and the arena keep theirs).

// a warning that shows where something is about to land, with no hazard of its own
FBoss.prototype.warnMark = function (box, secs) { this.marks.push({ box, t0: this.age + secs, t1: this.age + secs }); };

// ---------------------------------------------------------------- Loose Wire
Object.assign(LooseWire.prototype, {
  // coils up and spins
  mKnot(w) { return [sTell(0.55 * this.k, 'rear'), { d: 1.0, pose: 'low', bot: 'away', on: () => Sfx.play('whoosh'), tick: (b) => { b.vx = 0; }, hz: b => [{ box: { x: b.x - 48, y: b.y - 58, w: 96, h: 58 }, dmg: 1, fromX: b.x }] }, sRest(0.45)]; },
  // pulses of current race out along the floor in both directions
  mPulse(w) { return [sTell(0.5, 'rear', { on: (b) => { Sfx.play('warn'); for (let i = 0; i < 4; i++) for (const dir of [-1, 1]) b.zone({ x: clamp(b.x + dir * (40 + i * 62), 26, 454) - 26, y: GROUND_Y - 10, w: 52, h: 10 }, 0.55 + i * 0.25, 0.28); } }), { d: 1.9, pose: 'low' }]; },
  // dives into the floor and bursts up under the knight, twice
  mBurrow(w) {
    const up = () => ({ d: 1.05, pose: 'low', tell: true, on: (b, w2) => { Sfx.play('warn'); b.zone({ x: clamp(w2.player.x, 30, 450) - 17, y: GROUND_Y - 48, w: 34, h: 48 }, 0.8, 0.3); }, tick: (b) => { b.vx = 0; } });
    return [up(), up(), sRest(0.4)];
  },
});

// ---------------------------------------------------------------- The Welder
Object.assign(TheWelder.prototype, {
  // the torch swings up through an arc in front of him
  mSweep(w) {
    return [sTell(0.6 * this.k, 'tell'), { d: 1.2, pose: 'sweep', bot: 'away', on: (b) => { b.sweepAng = -0.5; Sfx.play('whoosh'); }, tick: (b) => { b.vx = 0; b.sweepAng = -0.5 + b.sT / 1.2 * 1.9; },
      hz: b => { const a = b.sweepAng, out = []; for (let r = 22; r <= 190; r += 14) out.push({ box: { x: b.x + b.facing * (22 + Math.cos(a) * r) - 5, y: b.y - 34 - Math.sin(a) * r - 5, w: 10, h: 10 }, dmg: 1, fromX: b.x }); return out; } },
      { d: 0.1, pose: 'low', on: (b) => { b.sweepAng = null; } }, sRest(0.4)];
  },
  // the hose sprays slag across the floor ahead of him
  mSpray(w) {
    return [sTell(0.5, 'up'), { d: 0.15, pose: 'down', on: (b) => { Sfx.play('flap'); for (let i = 0; i < 7; i++) { const s = fshot(b, 'slag', b.x + b.facing * 20, b.y - 34, b.facing * (60 + i * 32), -240 - (i % 3) * 30, { grav: 640, life: 3 }); s.onLand = (sh) => b.zone({ x: sh.x - 11, y: GROUND_Y - 8, w: 22, h: 8 }, 0.05, 1.3); } } }, sRest(0.7)];
  },
  // flashes from the ceiling, one of them right on the knight
  mColumns(w) {
    return [sTell(0.5, 'tell', { on: (b, w2) => { Sfx.play('warn'); const p = w2.player; [0, -80, 80, -40, 40].forEach((o, i) => b.zone({ x: clamp(p.x + o, 30, 450) - 10, y: 30, w: 20, h: GROUND_Y - 30 }, 0.7 + i * 0.22, 0.25)); } }), { d: 1.9, pose: 'low' }];
  },
});
(function () { const od = TheWelder.prototype.draw; TheWelder.prototype.draw = function (ctx, t) { od.call(this, ctx, t); if (this.sweepAng != null && this.pose === 'sweep') { const a = this.sweepAng, x = this.x + this.facing * 24, y = this.y - 34; ctx.globalAlpha = 0.5; pixLine(ctx, x, y, x + this.facing * Math.cos(a) * 190, y - Math.sin(a) * 190, 6, '#7fe8ff'); ctx.globalAlpha = 1; pixLine(ctx, x, y, x + this.facing * Math.cos(a) * 190, y - Math.sin(a) * 190, 2, '#e8fcff'); } }; })();

// ---------------------------------------------------------------- Press Jaw
Object.assign(PressJaw.prototype, {
  // walls of press plates close in on the knight: the safe place is the middle
  mClamp(w) {
    return [{ d: 0.5, pose: 'open', tell: true, face: true, on: (b, w2) => { Sfx.play('warn'); const p = w2.player; for (const [off, dl] of [[104, 0.7], [68, 1.1], [34, 1.5]]) for (const s of [-1, 1]) b.zone({ x: p.x + s * off - 14, y: GROUND_Y - 90, w: 28, h: 90 }, dl, 0.3); }, tick: (b) => { b.vx = 0; } }, { d: 1.9, pose: 'chomp', tick: (b) => { b.vx = 0; } }, sRest(0.4, 'idle')];
  },
  // two gears are rolled out along the floor, one each way
  mGears(w) {
    return [sTell(0.55, 'lift'), { d: 0.3, pose: 'stomp', on: (b, w2) => { Sfx.play('whoosh'); w2.shake(3); for (const dir of [-1, 1]) b.shots.push(new BounceShot({ kind: 'gear', x: b.x + dir * 34, y: GROUND_Y - 13, vx: dir * 140, vy: 0, w: 26, h: 26, ground: false, life: 5.5 })); } }, sRest(0.9, 'lift')];
  },
  // molten metal drips from the ceiling in a line
  mSlagrain(w) {
    return [sTell(0.5, 'open', { on: () => Sfx.play('warn') }), { d: 0.15, pose: 'chomp', on: (b, w2) => { const p = w2.player; for (let i = 0; i < 7; i++) { const s = fshot(b, 'slag', clamp(p.x + (i - 3) * 46, 30, 450), 24 - i * 30, 0, 0, { grav: 680, life: 4 }); s.onLand = (sh) => b.zone({ x: sh.x - 12, y: GROUND_Y - 8, w: 24, h: 8 }, 0.05, 1.3); } } }, { d: 1.6, pose: 'open' }];
  },
});

// ---------------------------------------------------------------- Ripper
Object.assign(Ripper.prototype, {
  // three quick lunges
  mFlurry(w) {
    const lunge = (tw) => [sTell(tw, 'tell'), { d: 0.25, pose: 'dash', bot: 'away', on: (b) => { b.vx = b.facing * 330; Sfx.play('whoosh'); }, hz: b => [hzBody(b, 8)] }, sRest(0.08)];
    return [...lunge(0.5 * this.k), ...lunge(0.28), ...lunge(0.26), sRest(0.5)];
  },
  // a long low swing of a torn cable across the floor
  mWhip(w) {
    return [sTell(0.5 * this.k, 'up'), { d: 0.2, pose: 'down', on: (b) => { b.vx = b.facing * 100; Sfx.play('slash'); }, hz: b => [hzFront(b, 4, 140, -20, 0)] }, sRest(0.2), sTell(0.3, 'up'), { d: 0.2, pose: 'down', on: (b) => { Sfx.play('slash'); }, hz: b => [hzFront(b, 4, 140, -20, 0)] }, sRest(0.5)];
  },
  // saws are thrown up and come down across the floor, then keep spinning where they land
  mSawlob(w) {
    return [sTell(0.45, 'up'), { d: 0.12, pose: 'down', on: (b, w2) => { Sfx.play('flap'); const p = w2.player; for (let i = 0; i < 3; i++) { const tx = clamp(p.x + (i - 1) * 56, 30, 450), tt = 0.9 + i * 0.12; const s = fshot(b, 'saw', b.x, b.y - 40, (tx - b.x) / tt, -320, { grav: 660, w: 14, h: 14, life: 3 }); s.onLand = (sh) => b.zone({ x: sh.x - 10, y: GROUND_Y - 12, w: 20, h: 12 }, 0.05, 1.8); } } }, sRest(0.8)];
  },
});

// ---------------------------------------------------------------- Rigspider
Object.assign(Rigspider.prototype, {
  // a line of drills falls all at once, with a gap over the knight
  mCurtain(w) {
    return [{ d: 0.7, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: (b, w2) => { Sfx.play('warn'); const p = w2.player; for (let i = 0; i < 8; i++) { const x = 34 + i * 58; if (Math.abs(x - p.x) < 46) continue; b.warnMark({ x: x - 5, y: 36, w: 10, h: GROUND_Y - 36 }, 0.7); } } },
      { d: 0.15, pose: 'drop', on: (b, w2) => { const p = w2.player; for (let i = 0; i < 8; i++) { const x = 34 + i * 58; if (Math.abs(x - p.x) < 46) continue; fshot(b, 'drill', x, 26, 0, 150, { grav: 800, w: 8, h: 20, life: 2.4 }); } } }, { d: 1.4, pose: 'idle' }];
  },
  // mines are dropped and stay armed on the floor
  mMines(w) {
    return [{ d: 0.5, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }, { d: 0.12, pose: 'drop', on: (b, w2) => { Sfx.play('flap'); const p = w2.player; for (let i = 0; i < 3; i++) { const tx = clamp(p.x + (i - 1) * 70, 30, 450), tt = 0.8 + i * 0.12; const s = fshot(b, 'junk', b.x, b.y, (tx - b.x) / tt, -80, { grav: 800, w: 10, h: 10, life: 3 }); s.onLand = (sh) => { Sfx.play('slam'); b.zone({ x: sh.x - 14, y: GROUND_Y - 16, w: 28, h: 16 }, 0.1, 3.2); }; } } }, { d: 0.9, pose: 'idle' }];
  },
  // its legs sweep the whole floor under it, so the knight has to jump
  mLegs(w) {
    return [{ d: 0.6, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: (b) => { Sfx.play('warn'); b.zone({ x: clamp(b.x - 150, 26, 300), y: GROUND_Y - 14, w: 300, h: 14 }, 0.75, 0.35); } }, { d: 1.4, pose: 'stab' }, { d: 0.3, pose: 'idle' }];
  },
});

// ---------------------------------------------------------------- Half-Built
Object.assign(HalfBuilt.prototype, {
  mCharge(w) {
    return [sTell(0.5 * this.k, 'low'), { d: 1.4, pose: 'drill', bot: 'away', min: 0.3, on: (b) => { b.vx = b.facing * 270; Sfx.play('whoosh'); }, tick: (b) => { b.vx = Math.sign(b.vx || b.facing) * 270; }, until: (b) => (b.vx > 0 && b.x >= b.br - 2) || (b.vx < 0 && b.x <= b.bl + 2), hz: b => [hzBody(b, 6), hzFront(b, 6, 46, -44, 0)] }, { d: 0.9, pose: 'low', on: (b, w2) => { b.vx = 0; Sfx.play('slam'); w2.shake(3); } }];
  },
  // a saw snaps onto the arm: two quick swings
  mSawarm(w) {
    const sw = (tw) => [sTell(tw * this.k, 'up'), { d: 0.14, pose: 'drill', on: (b) => { b.vx = b.facing * 120; Sfx.play('slash'); }, hz: b => [hzFront(b, 6, 64, -48, 0)] }, sRest(0.08)];
    return [...sw(0.5), ...sw(0.3), sRest(0.4)];
  },
  mGrenade(w) {
    return [sTell(0.5, 'up'), { d: 0.12, pose: 'low', on: (b, w2) => { Sfx.play('flap'); const tx = clamp(w2.player.x, 30, 450); const s = fshot(b, 'tank', b.x, b.y - 50, (tx - b.x) / 0.9, -330, { grav: 700, life: 3, w: 8, h: 12 }); s.onLand = (sh) => { Sfx.play('slam'); b.zone({ x: sh.x - 42, y: GROUND_Y - 50, w: 84, h: 50 }, 0.35, 0.3); }; } }, sRest(0.9)];
  },
});

// ---------------------------------------------------------------- The Overseer
Object.assign(TheOverseer.prototype, {
  // a cage of beams, then a floor sweep
  mGrid(w) {
    return [{ d: 0.5, pose: 'tell', tell: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; }, on: (b, w2) => { Sfx.play('warn'); const p = w2.player; for (let i = 0; i < 6; i++) { const x = 34 + i * 82; if (Math.abs(x - p.x) < 46) continue; b.zone({ x: x - 7, y: b.y + 10, w: 14, h: GROUND_Y - b.y - 10 }, 0.9, 0.4); } b.zone({ x: HIVE_L, y: GROUND_Y - 14, w: HIVE_R - HIVE_L, h: 12 }, 1.7, 0.34); } }, { d: 2.4, pose: 'lasers', tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }];
  },
  // a steady stream of shots at the knight
  mRapid(w) {
    return [{ d: 0.5, pose: 'tell', tell: true, face: true, tick: (b) => { b.vx *= 0.8; b.vy *= 0.8; } }, { d: this.rage ? 2.2 : 1.7, pose: 'fire', on: (b) => { b.rt = 0; }, tick: (b, dt, w2) => { b.vx *= 0.8; b.vy *= 0.8; b.rt -= dt; if (b.rt <= 0) { b.rt = this.rage ? 0.2 : 0.26; dartFan(b, w2, 1, 0, 215, 'plasma'); } } }, { d: 0.6, pose: 'idle' }];
  },
  // drops on the knight and cracks the floor
  mCrash(w) {
    return [{ d: 0.6 * this.k, pose: 'rise', tell: true, tick: (b) => { b.steer(w.player.x, 56, 200); } },
      { d: 0.25 * this.k, pose: 'tell', tell: true, tick: (b) => { b.vx = b.vy = 0; b.px = w.player.x; }, on: () => Sfx.play('warn') },
      { d: 1.4, pose: 'dive', bot: 'away', min: 0.1, hz: b => [hzBody(b, 6)], on: (b) => { b.vx = 0; b.vy = 440; Sfx.play('whoosh'); }, tick: (b) => { b.vx = (b.px - b.x) * 4; }, until: (b) => b.y >= GROUND_Y - 1 },
      { d: 0.9, pose: 'stuck', on: (b, w2) => { b.vx = 0; b.vy = 0; w2.shake(5); Sfx.play('slam'); dustWave(w2, b.x, 0, 12); b.zone({ x: b.x - 70, y: GROUND_Y - 12, w: 140, h: 12 }, 0.05, 0.3); }, tick: (b) => { b.vx = 0; b.vy = 0; } },
      { d: 0.5, pose: 'rise', tick: (b) => { b.vx = 0; b.vy = -170; } }];
  },
});
