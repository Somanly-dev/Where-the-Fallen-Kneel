'use strict';

// Composed music. Each track is written out bar by bar: real melodies, chords and drum patterns,
// played by synthesized strings, brass, choir, piano, chiptune leads and drums.
// Intensity (0 to 1) adds layers; for boss music it would follow the boss's health.
// A bar is 16 steps (sixteenth notes). A track is { bpm, bar(S) } where S gives the bar number,
// S.at(step) = the time of a step, S.d(n) = the length of n steps, and S.k = the intensity.

const Score = (() => {
  const m2f = n => 440 * Math.pow(2, (n - 69) / 12);
  let ac = null, bus = null, echo = null, noiseBuf = null;
  let cur = null, pending = null, bar = 0, nextT = 0, timer = null, intensity = 0.5;
  let prox = 0; const beats = [];             // prox: how near the knight is to the trial gates; beats: heartbeats the screen can throb with
  const pulses = {};

  function setup() {
    if (ac) return true;
    ac = Sfx.ctx();
    if (!ac) return false;
    const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noiseBuf = buf;
    return true;
  }

  // Every play gets its own bus and echo, so stopping one track never leaves its sound in the next.
  function newBus() {
    bus = ac.createGain(); bus.gain.value = 0.0001; bus.connect(Sfx.out());
    echo = ac.createGain(); echo.gain.value = 1;
    const delay = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
    delay.delayTime.value = 0.3; fb.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 2200;
    echo.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(bus);
    bus.gain.setTargetAtTime(0.7, ac.currentTime + 0.2, 0.3);
  }

  let slowFade = false;
  function fadeOut() {
    if (!bus) return;
    const b = bus, slow = slowFade;
    slowFade = false;
    b.gain.cancelScheduledValues(ac.currentTime);
    b.gain.setTargetAtTime(0, ac.currentTime, slow ? 0.7 : 0.12);
    setTimeout(() => { try { b.disconnect(); } catch (e) { /* already gone */ } }, slow ? 6000 : 2500);
    bus = null;
  }

  // ---- instruments ----

  function env(g, t, attack, dur, vol, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
  }

  function synth(o) {
    const rel = o.rel || 0.05, g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = o.ft || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.f0 || 3000, o.t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, o.t + (o.fdur || 0.1));
    for (const [type, det, gain] of o.osc) {
      const os = ac.createOscillator(), og = ac.createGain();
      os.type = type; os.frequency.value = o.freq; os.detune.value = det; og.gain.value = gain === undefined ? 1 : gain;
      os.connect(og); og.connect(f);
      os.start(o.t); os.stop(o.t + o.dur + rel + 0.05);
    }
    env(g, o.t, o.attack || 0.01, o.dur, o.vol, rel);
    f.connect(g); g.connect(bus);
    if (o.send) { const s = ac.createGain(); s.gain.value = o.send; g.connect(s); s.connect(echo); }
  }

  const strings = (n, t, d, v) => synth({ freq: m2f(n), t, dur: d, vol: v, osc: [['sawtooth', -8], ['sawtooth', 8]], f0: 2600, attack: 0.008, rel: 0.03, send: 0.12 });
  const pad = (n, t, d, v) => synth({ freq: m2f(n), t, dur: d, vol: v, osc: [['sawtooth', -6, 0.7], ['sawtooth', 6, 0.7], ['triangle', 0]], f0: 1700, attack: 0.25, rel: 0.4, send: 0.3 });
  const brass = (n, t, d, v) => synth({ freq: m2f(n), t, dur: d, vol: v, osc: [['sawtooth', -5], ['sawtooth', 5], ['square', 0, 0.5]], f0: 500, f1: 2600, fdur: 0.07, attack: 0.03, rel: 0.12, send: 0.22 });
  const bass = (n, t, d, v) => synth({ freq: m2f(n), t, dur: d, vol: v, osc: [['sawtooth', 0, 0.8], ['sine', 0, 1.3]], f0: 800, f1: 170, fdur: 0.15, attack: 0.004, rel: 0.04 });
  const choir = (notes, t, d, v) => notes.forEach(n => synth({ freq: m2f(n), t, dur: d, vol: v, osc: [['sawtooth', -4, 0.45], ['triangle', 4], ['sine', 0]], f0: 1400, q: 1.1, attack: 0.5, rel: 0.6, send: 0.45 }));

  function pulseWave(d) {
    if (!pulses[d]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * d);
      pulses[d] = ac.createPeriodicWave(re, im);
    }
    return pulses[d];
  }
  function lead(n, t, d, v, duty = 0.25) {                 // a chiptune lead with a little vibrato
    const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), s = ac.createGain();
    o.setPeriodicWave(pulseWave(duty)); o.frequency.value = m2f(n);
    lfo.frequency.value = 5.5; lg.gain.value = 7; lfo.connect(lg); lg.connect(o.detune);
    env(g, t, 0.004, d, v, 0.04);
    s.gain.value = 0.2;
    o.connect(g); g.connect(bus); g.connect(s); s.connect(echo);
    o.start(t); o.stop(t + d + 0.1); lfo.start(t); lfo.stop(t + d + 0.1);
  }
  function piano(n, t, v, d = 1.5) {
    [[1, 1, 'triangle'], [2, 0.4, 'sine'], [3, 0.15, 'sine']].forEach(([m, a, type], i) => {
      const o = ac.createOscillator(), g = ac.createGain(), s = ac.createGain();
      o.type = type; o.frequency.value = m2f(n) * m;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * a, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d / (1 + i * 0.6));
      s.gain.value = 0.35;
      o.connect(g); g.connect(bus); g.connect(s); s.connect(echo);
      o.start(t); o.stop(t + d + 0.05);
    });
  }

  function burst(t, dur, type, freq, q, vol) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 1.4); s.stop(t + dur + 0.02);
  }
  function drumTone(t, f0, f1, dur, vol, type = 'sine') {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const kick = (t, v) => { drumTone(t, 170, 46, 0.28, v); burst(t, 0.015, 'highpass', 3000, 0.7, v * 0.4); };
  const snare = (t, v) => { burst(t, 0.15, 'bandpass', 2200, 0.6, v); drumTone(t, 210, 130, 0.12, v * 0.6, 'triangle'); };
  const hat = (t, v, open) => burst(t, open ? 0.2 : 0.04, 'highpass', 7000, 0.7, v);
  const tom = (t, v, f) => { drumTone(t, f, f * 0.5, 0.26, v); burst(t, 0.02, 'bandpass', 600, 0.8, v * 0.3); };
  const crash = (t, v) => { burst(t, 1.5, 'highpass', 4500, 0.5, v); burst(t, 0.8, 'bandpass', 8000, 0.4, v * 0.5); };
  const timp = (t, v) => { drumTone(t, 98, 58, 0.9, v); burst(t, 0.04, 'bandpass', 300, 0.8, v * 0.5); };
  const taiko = (t, v) => { drumTone(t, 130, 62, 0.32, v); burst(t, 0.025, 'bandpass', 500, 0.8, v * 0.45); };
  const rim = (t, v) => burst(t, 0.035, 'bandpass', 1900, 3, v);
  const clap = (t, v) => { burst(t, 0.03, 'bandpass', 1300, 1.2, v); burst(t + 0.012, 0.09, 'bandpass', 1500, 0.9, v * 0.8); };
  function swarm(n, t, dur, v) {
    const g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain(), snd = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 3;
    lfo.frequency.value = 26 + Math.random() * 6; lg.gain.value = v * 0.45;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.25);
    g.gain.setValueAtTime(v, Math.max(t + 0.25, t + dur - 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    lfo.connect(lg); lg.connect(g.gain);
    [-28, 0, 28].forEach(det => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = m2f(n); o.connect(f); o.start(t); o.stop(t + dur + 0.3); });
    f.connect(g); g.connect(bus); snd.gain.value = 0.2; g.connect(snd); snd.connect(echo);
    lfo.start(t); lfo.stop(t + dur + 0.3);
  }
  function buzz(n, t, dur, v, o = {}) {
    const g = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain(), snd = ac.createGain();
    f.type = 'bandpass'; f.frequency.value = o.cut || 1400; f.Q.value = o.q || 2.2;
    lfo.frequency.value = o.lfo || 48; lg.gain.value = v * 0.5;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.05);
    g.gain.setValueAtTime(v, Math.max(t + 0.05, t + dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    lfo.connect(lg); lg.connect(g.gain);
    [-35, 0, 35].forEach(det => {
      const os = ac.createOscillator(), f0 = m2f(n);
      os.type = 'sawtooth'; os.detune.value = det; os.frequency.setValueAtTime(f0, t);
      if (o.bend) os.frequency.exponentialRampToValueAtTime(f0 * o.bend, t + dur);
      os.connect(f); os.start(t); os.stop(t + dur + 0.12);
    });
    f.connect(g); g.connect(bus); snd.gain.value = 0.15; g.connect(snd); snd.connect(echo);
    lfo.start(t); lfo.stop(t + dur + 0.12);
  }
  const thud = (t, v) => drumTone(t, 118, 34, 0.38, v);
  const chainRattle = (t, v) => { for (let i = 0; i < 5; i++) burst(t + i * 0.045 + Math.random() * 0.02, 0.05, 'highpass', 3500 + Math.random() * 3500, 1, v); };
  const crackle = (t, v) => burst(t, 0.05 + Math.random() * 0.05, 'bandpass', 1800 + Math.random() * 4200, 1.3, v);
  // a rush of noise that climbs and climbs, for the bar before a section hits
  function riser(t, dur, v) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7500, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 1.4); src.stop(t + dur + 0.1);
  }

  // ---- machine sounds: metal strikes, steam, pistons, gears, motors, robot voices, sirens ----
  function partials(t, f, ratios, vols, dur, v, type = 'sine') {
    ratios.forEach((r, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f * r;
      g.gain.setValueAtTime(v * vols[i], t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + i * 0.5));
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  const clang = (t, v, f = 420) => { partials(t, f, [1, 2.76, 5.4, 8.93], [1, 0.7, 0.45, 0.3], 0.55, v); burst(t, 0.03, 'highpass', 6000, 0.8, v * 0.5); };
  const anvil = (t, v) => { partials(t, 640, [1, 2.4, 3.9, 6.1], [1, 0.6, 0.4, 0.25], 1.1, v, 'triangle'); burst(t, 0.04, 'bandpass', 3000, 1, v * 0.6); };
  const hiss = (t, v, dur = 0.3) => burst(t, dur, 'highpass', 5500, 0.6, v);
  function motor(n, t, dur, v) {                               // a steady machine hum: two saws through a low filter, no wobble
    const g = ac.createGain(), f = ac.createBiquadFilter(), sd = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 2;
    env(g, t, 0.2, dur, v, 0.2);
    [-7, 7].forEach(det => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = m2f(n); o.connect(f); o.start(t); o.stop(t + dur + 0.3); });
    f.connect(g); g.connect(bus); sd.gain.value = 0.1; g.connect(sd); sd.connect(echo);
  }
  const pistonHit = (t, v) => { drumTone(t, 90, 40, 0.3, v); hiss(t + 0.02, v * 0.5, 0.35); };
  function robo(n, t, d, v, duty = 0.5) {                      // a short, hard, robotic pulse note
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(), s = ac.createGain();
    o.setPeriodicWave(pulseWave(duty)); o.frequency.value = m2f(n);
    f.type = 'lowpass'; f.frequency.setValueAtTime(3500, t); f.frequency.exponentialRampToValueAtTime(500, t + d);
    env(g, t, 0.003, d, v, 0.02); s.gain.value = 0.15;
    o.connect(f); f.connect(g); g.connect(bus); g.connect(s); s.connect(echo);
    o.start(t); o.stop(t + d + 0.08);
  }
  function siren(t, dur, v, f0, f1) {                          // an alarm that climbs
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
    f.type = 'lowpass'; f.frequency.value = 2400; env(g, t, 0.02, dur, v, 0.05);
    o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.1);
  }

  // ---- the tracks ----
  const T = {};
  const pick = (a, i) => a[i % a.length];

  // ---- tools for the long tracks ----
  const RUN16 = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 3];
  const lcg = seed => { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
  const mod = (a, n) => ((a % n) + n) % n;
  const clampn = (v, a, b) => Math.max(a, Math.min(b, v));
  const MIN = [0, 3, 7], MAJ = [0, 4, 7];
  const NMIN = [0, 2, 3, 5, 7, 8, 10], HARM = [0, 2, 3, 5, 7, 8, 11], PHRY = [0, 1, 4, 5, 7, 8, 10], CHROM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  // a chord: root (bass note), the notes' pitch classes, and a five-note arpeggio above it
  const chd = (r, q) => ({ r, tones: q.map(i => mod(r + i, 12)), arp: [r + 24 + q[0], r + 24 + q[1], r + 24 + q[2], r + 36, r + 36 + q[1]] });
  // sixteen notes that lurch up and down a long way over a scale: leaps, turns and plunges. The first note of each beat snaps to the chord.
  function walk(sc, base, seed, lo, hi, tones, bias, n = 16) {
    const r = lcg(seed), L = sc.length, midi = dg => { dg = Math.round(dg); return base + 12 * Math.floor(dg / L) + sc[mod(dg, L)]; };
    let deg = lo + Math.floor(r() * (hi - lo)), dir = r() < 0.5 ? -1 : 1; const out = [];
    for (let i = 0; i < n; i++) {
      const x = r();
      if (x < 0.15) deg += (r() < 0.5 ? -1 : 1) * (4 + Math.floor(r() * 5));
      else if (x < 0.3) { dir = -dir; deg += dir; }
      else deg += dir * (r() < 0.7 ? 1 : 2);
      if (bias) deg += bias;
      if (deg > hi) { deg = hi - Math.floor(r() * 3); dir = -1; }
      if (deg < lo) { deg = lo + Math.floor(r() * 3); dir = 1; }
      let note = midi(deg);
      if (tones && i % 4 === 0) { let best = note, bd = 99; for (let dd = -6; dd <= 6; dd++) { const mm = note + dd; if (tones.includes(mod(mm, 12)) && Math.abs(dd) < bd) { bd = Math.abs(dd); best = mm; } } note = best; }
      out.push(note);
    }
    return out;
  }

  // Pits fight A: Hollow Knight, the gladiators' dirge. Four sections of eight bars: the ostinato, the dirge itself, a funeral
  // breakdown that climbs, and the charge. It lifts a key each lap and gets busier.
  {
    const CH = [
      { r: 38, a: [62, 65, 69, 74], t: [62, 65, 69] }, { r: 34, a: [58, 62, 65, 70], t: [58, 62, 65] },
      { r: 43, a: [55, 58, 62, 67], t: [55, 58, 62] }, { r: 33, a: [57, 61, 64, 69], t: [57, 61, 64] },
      { r: 38, a: [62, 65, 69, 74], t: [62, 65, 69] }, { r: 41, a: [57, 60, 65, 69], t: [57, 60, 65] },
      { r: 43, a: [55, 58, 62, 67], t: [55, 58, 62] }, { r: 33, a: [57, 61, 64, 69], t: [57, 61, 64] },
    ];
    const MEL = [
      [[0, 74, 4], [4, 77, 2], [6, 76, 2], [8, 74, 4], [12, 72, 4]], [[0, 70, 4], [4, 74, 2], [6, 72, 2], [8, 70, 8]],
      [[0, 67, 4], [4, 70, 2], [6, 72, 2], [8, 74, 4], [12, 70, 4]], [[0, 69, 4], [4, 73, 4], [8, 76, 4], [12, 73, 4]],
      [[0, 74, 4], [4, 77, 2], [6, 79, 2], [8, 81, 6], [14, 79, 2]], [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 8]],
      [[0, 70, 4], [4, 72, 4], [8, 74, 4], [12, 77, 4]], [[0, 76, 6], [6, 73, 2], [8, 69, 8]],
    ];
    const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1];
    T.pitA = { bpm: 140, bar(S) {
      const sec = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32), up = [0, 2, 0, 3][lap % 4];
      const k = Math.max(S.k, Math.min(0.9, 0.3 + lap * 0.12)), c = CH[m], N = n => n + up, at = S.at, d = S.d;
      const tones = c.t.map(n => mod(n, 12));
      if (sec === 0) {                                                   // THE OSTINATO
        timp(at(0), 0.5); timp(at(8), 0.36);
        snare(at(4), 0.2 + 0.1 * k); snare(at(12), 0.2 + 0.1 * k);
        if (k > 0.35 || lap > 0) for (let i = 0; i < 16; i += 2) hat(at(i), 0.03 + 0.02 * k);
        if (m === 0 && S.bar > 0) crash(at(0), 0.18);
        if (m >= 4) [0, 3, 6, 10, 12].forEach(x => taiko(at(x), 0.16));
        if (m === 7) { [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.28, 160 - i * 12)); riser(at(0), d(16), 0.04); }
        for (let i = 0; i < 8; i++) bass(N(c.r), at(i * 2), d(1.6), 0.15);
        for (let i = 0; i < 16; i++) strings(N(c.a[ARP[i]]), at(i), d(0.9), 0.045 + 0.02 * k);
        if (k >= 0.3) for (const [x, n, len] of MEL[m]) brass(N(n), at(x), d(len) * 0.95, 0.085);
        if (k >= 0.55) choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.04);
      } else if (sec === 1) {                                            // THE DIRGE: the melody in full voice
        timp(at(0), 0.5); timp(at(8), 0.36);
        [0, 6, 8, 14].forEach(x => kick(at(x), 0.3));
        snare(at(4), 0.26); snare(at(12), 0.26);
        for (let i = 0; i < 16; i += 2) hat(at(i), 0.04);
        rim(at(2), 0.1); rim(at(10), 0.1);
        if (m % 2 === 0) crash(at(0), 0.18);
        if (m % 2 === 1) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.26, 170 - i * 14));
        for (let i = 0; i < 8; i++) bass(N(c.r), at(i * 2), d(1.6), 0.15);
        for (let i = 0; i < 16; i++) strings(N(c.a[ARP[i]]), at(i), d(0.9), 0.057 + 0.02 * k);
        for (const [x, n, len] of MEL[m]) { brass(N(n), at(x), d(len) * 0.95, 0.09); brass(N(n - 12), at(x), d(len) * 0.95, 0.05); }
        choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.045);
        if (m === 7) riser(at(0), d(16), 0.05);
      } else if (sec === 2) {                                            // THE FUNERAL: nearly silent, then a roll that climbs
        timp(at(0), 0.5); timp(at(8), 0.28); rim(at(4), 0.1); rim(at(12), 0.1);
        pad(N(c.t[0] + 12), at(0), d(16), 0.06); pad(N(c.t[1] + 12), at(0), d(16), 0.05); pad(N(c.t[2] + 12), at(0), d(16), 0.05);
        for (let i = 0; i < 8; i++) piano(N(c.a[i % 4] + (i > 3 ? 12 : 0)), at(i * 2), 0.09, 1.6);
        bass(N(c.r), at(0), d(16), 0.13);
        choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.04);
        if (m >= 4) brass(N(c.r + 12), at(0), d(16), 0.05);
        if (m >= 5) for (let i = 0; i < 16; i += (m === 5 ? 4 : m === 6 ? 2 : 1)) snare(at(i), 0.05 + i * 0.01 + (m - 5) * 0.04);
        if (m === 6) riser(at(0), d(32), 0.07);
        if (m === 7) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.3, 190 - i * 24));
      } else {                                                           // THE CHARGE: kicks, galloping bass, a line that never sits still
        for (let i = 0; i < 16; i += 2) kick(at(i), 0.3);
        snare(at(4), 0.3); snare(at(12), 0.3);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.08 + i * 0.012);
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.024 : 0.042, i === 14);
        [0, 3, 6, 10, 12, 14].forEach(x => taiko(at(x), 0.24));
        [0, 8].forEach(x => timp(at(x), 0.4));
        if (m % 2 === 0) crash(at(0), 0.18);
        [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 200 - i * 26));
        [0, 1, 3, 4, 6, 8, 9, 11, 12, 14].forEach((x, i) => bass(N(c.r + (i % 5 === 4 ? 12 : 0)), at(x), d(1.2), 0.15));
        const w = walk(NMIN, 50, S.bar * 911 + lap * 97 + 3, 7, 24, tones);
        w.forEach((n, i) => { strings(N(n), at(i), d(0.85), 0.05 + 0.02 * k); if (i % 2 === 0) strings(N(n + 12), at(i), d(1.4), 0.028); if (k > 0.55) lead(N(n), at(i), d(0.7), 0.026, 0.125); });
        for (const [x, n, len] of MEL[m]) { brass(N(n + 12), at(x), d(len) * 0.95, 0.09); brass(N(n + 5), at(x), d(len) * 0.95, 0.04); }
        [0, 6, 12].forEach(x => { brass(N(c.r + 24), at(x), d(2), 0.06); brass(N(c.r + 31), at(x), d(2), 0.045); });
        choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.05);
        if (m === 7) riser(at(0), d(16), 0.06);
      }
    } };
  }

  // Pits fight C: Hollow Knight, the emotional one. Four sections of eight bars: tears, rising, the fall, the last stand.
  {
    const CH = [
      { r: 38, p: [50, 57, 62, 65, 69, 65, 62, 57], t: [62, 65, 69] }, { r: 34, p: [46, 53, 58, 62, 65, 62, 58, 53], t: [58, 62, 65] },
      { r: 41, p: [53, 57, 60, 65, 69, 65, 60, 57], t: [57, 60, 65] }, { r: 36, p: [48, 55, 60, 64, 67, 64, 60, 55], t: [60, 64, 67] },
      { r: 38, p: [50, 57, 62, 65, 69, 65, 62, 57], t: [62, 65, 69] }, { r: 34, p: [46, 53, 58, 62, 65, 62, 58, 53], t: [58, 62, 65] },
      { r: 43, p: [43, 50, 55, 58, 62, 58, 55, 50], t: [55, 58, 62] }, { r: 33, p: [45, 52, 57, 61, 64, 61, 57, 52], t: [57, 61, 64] },
    ];
    const MEL = [
      [[0, 69, 8], [8, 70, 4], [12, 72, 4]], [[0, 70, 8], [8, 72, 4], [12, 74, 4]], [[0, 72, 8], [8, 74, 4], [12, 77, 4]], [[0, 76, 12], [12, 74, 4]],
      [[0, 74, 8], [8, 77, 4], [12, 76, 4]], [[0, 74, 8], [8, 72, 4], [12, 70, 4]], [[0, 70, 8], [8, 72, 4], [12, 70, 4]], [[0, 73, 12], [12, 76, 4]],
    ];
    T.pitC = { bpm: 120, bar(S) {
      const sec = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32), up = [0, 2, 0, 3][lap % 4];
      const k = Math.max(S.k, Math.min(0.9, 0.3 + lap * 0.12)), c = CH[m], N = n => n + up, at = S.at, d = S.d;
      const tones = c.t.map(n => mod(n, 12));
      if (sec === 0) {                                                   // TEARS: piano and a pad
        timp(at(0), 0.55);
        if (k > 0.4) timp(at(8), 0.35);
        for (let i = 0; i < 8; i++) piano(N(c.p[i]), at(i * 2), 0.09 + 0.03 * k, 1.4);
        for (const [x, n, len] of MEL[m]) pad(N(n), at(x), d(len), 0.07);
        choir(c.t.map(n => N(n + 12)), at(0), d(16), k > 0.3 ? 0.045 : 0.025);
        bass(N(c.r), at(0), d(8), 0.14); bass(N(c.r), at(8), d(8), 0.12);
        if (m === 0 && S.bar > 0) crash(at(0), 0.18);
        if (m === 7) for (let i = 8; i < 16; i++) snare(at(i), 0.08 + i * 0.012);
        if (k > 0.5) { snare(at(4), 0.2); snare(at(12), 0.2); }
      } else if (sec === 1) {                                            // RISING: brass joins, the drums wake up
        timp(at(0), 0.55); timp(at(8), 0.35);
        for (let i = 0; i < 8; i++) piano(N(c.p[i]), at(i * 2), 0.1, 1.4);
        for (const [x, n, len] of MEL[m]) { pad(N(n), at(x), d(len), 0.07); brass(N(n), at(x), d(len) * 0.95, 0.065); }
        choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.045);
        bass(N(c.r), at(0), d(8), 0.14); bass(N(c.r), at(8), d(8), 0.12);
        for (let i = 0; i < 16; i++) strings(N(c.t[i % 3] + 12), at(i), d(0.9), 0.03 + 0.02 * k);
        snare(at(4), 0.22); snare(at(12), 0.22);
        [0, 6, 12].forEach(x => taiko(at(x), 0.18));
        for (let i = 0; i < 16; i += 2) hat(at(i), 0.03);
        if (m % 2 === 1) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 180 - i * 20));
        if (m === 0) crash(at(0), 0.18);
        if (m === 7) riser(at(0), d(16), 0.05);
      } else if (sec === 2) {                                            // THE FALL: one piano, one voice, and a long silence before the end
        timp(at(0), 0.5); rim(at(8), 0.08);
        for (let i = 0; i < 8; i++) piano(N(c.p[i] + 12), at(i * 2), 0.1, 2.4);
        piano(N(c.r + 24), at(0), 0.07, 4);
        for (const [x, n, len] of MEL[m]) strings(N(n - 12), at(x), d(len), 0.045);
        pad(N(c.t[0]), at(0), d(16), 0.045); choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.035);
        bass(N(c.r), at(0), d(16), 0.12);
        if (m >= 5) { if (m === 6) riser(at(0), d(32), 0.07); for (let i = 0; i < 16; i += (m === 5 ? 4 : m === 6 ? 2 : 1)) snare(at(i), 0.05 + i * 0.01 + (m - 5) * 0.04); }
        if (m === 7) [0, 4, 8, 12].forEach(x => timp(at(x), 0.34));
      } else {                                                           // THE LAST STAND: the melody an octave up, runs across the whole range
        [0, 4, 8, 12].forEach(x => kick(at(x), 0.34));
        snare(at(4), 0.28); snare(at(12), 0.28);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.08 + i * 0.012);
        [0, 3, 6, 10, 12, 14].forEach(x => taiko(at(x), 0.2));
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.022 : 0.04);
        timp(at(0), 0.45); timp(at(8), 0.36);
        if (m % 2 === 0) crash(at(0), 0.2);
        [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 190 - i * 24));
        for (let i = 0; i < 8; i++) piano(N(c.p[i]), at(i * 2), 0.1, 1.4);
        for (const [x, n, len] of MEL[m]) { brass(N(n + 12), at(x), d(len) * 0.95, 0.085); pad(N(n), at(x), d(len), 0.06); }
        const w = walk(NMIN, 50, S.bar * 677 + lap * 59 + 5, 7, 24, tones);
        w.forEach((n, i) => { strings(N(n), at(i), d(0.85), 0.045 + 0.02 * k); if (k > 0.55) lead(N(n + 12), at(i), d(0.7), 0.024, 0.125); });
        bass(N(c.r), at(0), d(8), 0.15); bass(N(c.r), at(8), d(8), 0.14);
        choir(c.t.map(n => N(n + 12)), at(0), d(16), 0.05);
        if (m === 7) riser(at(0), d(16), 0.06);
      }
    } };
  }

  // Pits fight D: Hollow Knight, frantic, and long. Four sections of eight bars (the chase, the theme, the breakdown, the climax).
  // Each time round it lifts to a new key and gets busier, so it is a couple of minutes before it returns to the same place.
  // The wild runs are written bar by bar by a seeded walk over D phrygian dominant, snapped to the chord on the beats.
  {
    const PD = [0, 1, 4, 5, 7, 8, 10];
    const degMidi = d => { d = Math.round(d); return 50 + 12 * Math.floor(d / 7) + PD[((d % 7) + 7) % 7]; };
    const lcg = seed => { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
    const MIN = [0, 3, 7], MAJ = [0, 4, 7];
    const ch = (r, q) => ({ r, tones: q.map(i => (r + i) % 12), arp: [r + 24 + q[0], r + 24 + q[1], r + 24 + q[2], r + 36, r + 36 + q[1]] });
    const Dm = ch(38, MIN), Gm = ch(43, MIN), G = ch(43, MAJ), Bb = ch(34, MAJ), A = ch(33, MAJ), Eb = ch(39, MAJ), F = ch(41, MAJ);
    const PROG = [
      [Dm, Dm, Bb, A, Dm, Dm, Bb, A],          // the chase
      [Dm, Gm, Bb, A, Dm, Gm, Eb, A],          // the theme
      [Dm, Dm, Dm, Dm, Bb, Bb, A, A],          // the breakdown
      [F, G, A, Dm, F, G, A, A],               // the climax
    ];
    const RUN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 3];
    const HOOK = [[0, 74, 2], [2, 77, 2], [4, 81, 4], [8, 79, 2], [10, 77, 2], [12, 74, 4]];
    const ANSWER = [[0, 81, 2], [2, 84, 2], [4, 86, 4], [8, 84, 2], [10, 81, 2], [12, 77, 4]];
    const snap = (n, c) => {                                            // the nearest note of the chord
      let best = n, bd = 99;
      for (let d = -6; d <= 6; d++) { const mm = n + d; if (c.tones.includes(((mm % 12) + 12) % 12) && Math.abs(d) < bd) { bd = Math.abs(d); best = mm; } }
      return best;
    };
    // sixteen notes that lurch up and down a long way, with leaps, turns and the odd plunge
    const run = (seed, lo, hi, c, bias) => {
      const r = lcg(seed); let deg = lo + Math.floor(r() * (hi - lo)), dir = r() < 0.5 ? -1 : 1; const out = [];
      for (let i = 0; i < 16; i++) {
        const x = r();
        if (x < 0.15) deg += (r() < 0.5 ? -1 : 1) * (4 + Math.floor(r() * 5));          // a wild leap
        else if (x < 0.3) { dir = -dir; deg += dir; }                                       // turn around
        else deg += dir * (r() < 0.7 ? 1 : 2);
        if (bias) deg += bias;                                                              // a build climbs
        if (deg > hi) { deg = hi - Math.floor(r() * 3); dir = -1; }
        if (deg < lo) { deg = lo + Math.floor(r() * 3); dir = 1; }
        let n = degMidi(deg); if (i % 4 === 0) n = snap(n, c);
        out.push(n);
      }
      return out;
    };

    T.pitD = { bpm: 172, bar(S) {
      const sec = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32);
      const up = [0, 2, 0, 3][lap % 4], k = Math.max(S.k, Math.min(0.9, 0.4 + lap * 0.1));
      const c = PROG[sec][m], N = n => n + up, tr = c.r - 38;
      const wild = (lo, hi, salt, bias) => run(S.bar * 977 + lap * 131 + salt, lo, hi, c, bias).map(N);
      const at = S.at, d = S.d;

      if (sec === 0) {                                                  // THE CHASE: racing strings, the first hint of the theme
        [0, 8].forEach(x => timp(at(x), 0.42)); [4, 12].forEach(x => timp(at(x), 0.26));
        [2, 6, 10, 14].forEach(x => tom(at(x), 0.16 + 0.1 * k, 150));
        snare(at(4), 0.26); snare(at(12), 0.26);
        for (let i = 0; i < 16; i += 2) hat(at(i), 0.035);
        if (m === 0 && S.bar > 0) crash(at(0), 0.2);
        if (m % 4 === 3) [12, 13, 14, 15].forEach((x, i) => { snare(at(x), 0.2); tom(at(x), 0.12, 190 - i * 18); });
        if (m === 7) riser(at(0), d(16), 0.05);
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUN[i]] + (m % 2 && i > 7 ? 12 : 0)), at(i), d(0.85), 0.05 + 0.025 * k);
        [0, 3, 6, 10, 12].forEach(x => { brass(N(c.r + 24), at(x), d(1.7), 0.085); bass(N(c.r), at(x), d(1.7), 0.15); });
        if (m === 3 || m === 7) for (const [x, n, len] of HOOK) brass(N(n), at(x), d(len) * 0.95, 0.09);
        if (k > 0.6 && m % 2 === 0) choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.035);
      } else if (sec === 1) {                                           // THE THEME: the hook, answered by a runaway line
        [0, 3, 6, 8, 11, 14].forEach(x => kick(at(x), 0.42));
        snare(at(4), 0.28); snare(at(12), 0.28); snare(at(7), 0.07); snare(at(15), 0.08);
        for (let i = 0; i < 16; i++) hat(at(i), i % 4 === 2 ? 0.05 : 0.026, i === 14);
        rim(at(2), 0.12); rim(at(10), 0.12);
        [0, 6, 12].forEach(x => taiko(at(x), 0.24));
        if (m === 0) crash(at(0), 0.2);
        if (m % 2 === 1) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 200 - i * 24));
        if (m === 7) { riser(at(0), d(16), 0.06); for (let i = 8; i < 16; i++) snare(at(i), 0.06 + i * 0.012); }
        for (let i = 0; i < 8; i++) bass(N(c.r + (i % 4 === 3 ? 12 : 0)), at(i * 2), d(1.8), 0.15);
        for (let i = 0; i < 16; i++) strings(N(c.arp[i % 3]), at(i), d(0.8), 0.04 + 0.02 * k);
        if (m % 2 === 0) {
          const H = m % 4 === 0 ? HOOK : ANSWER;
          for (const [x, n, len] of H) { brass(N(n), at(x), d(len) * 0.95, 0.095); brass(N(n - 12), at(x), d(len) * 0.95, 0.045); }
        } else {
          const w = wild(9, 24, 1);
          w.forEach((n, i) => { lead(n, at(i), d(0.8), 0.045, 0.25); if (k > 0.5 && i % 2 === 0) strings(n + 12, at(i), d(1.4), 0.03); });
        }
        if (m >= 4) choir([N(c.arp[0] + 12), N(c.arp[2] + 12), N(c.arp[3] + 12)], at(0), d(16), 0.04);
      } else if (sec === 2) {                                           // THE BREAKDOWN: it drops away, then climbs
        timp(at(0), 0.5); timp(at(8), 0.3);
        rim(at(4), 0.12); rim(at(12), 0.12);
        const ramp = m / 7;
        for (let i = 0; i < 16; i++) hat(at(i), 0.015 + 0.03 * ramp, false);
        if (m < 6) {
          for (let i = 0; i < 8; i++) piano(N(c.arp[(i * 2 + m) % 5] + (i > 3 ? 12 : 0)), at(i * 2), 0.09, 1.4);
          for (let i = 0; i < 16; i++) strings(N(c.arp[2] + 12), at(i), d(0.9), 0.016 + 0.01 * m);
          choir([N(c.arp[0] + 12), N(c.arp[1] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045);
          bass(N(m < 4 ? 38 : c.r), at(0), d(16), 0.13);
          if (m >= 4) for (let i = 0; i < 4; i++) taiko(at(i * 4), 0.2);
          if (m === 5) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 180 - i * 20));
        } else {                                                        // the climb into the climax: a roll that grows and a line that rises
          if (m === 6) riser(at(0), d(32), 0.08);
          for (let i = 0; i < 16; i += (m === 6 ? 2 : 1)) snare(at(i), (m === 6 ? 0.05 : 0.09) + i * 0.012 + (m === 7 ? 0.03 : 0));
          if (m === 7) [0, 4, 8, 12].forEach(x => timp(at(x), 0.32));
          const w = wild(10, 26, 7 + m, m === 6 ? 0.18 : 0.3);
          w.forEach((n, i) => { lead(n, at(i), d(0.8), 0.05, 0.125); strings(n, at(i), d(0.85), 0.05); });
          bass(N(38 + (m - 6) * 2), at(0), d(8), 0.14); bass(N(40 + (m - 6) * 2), at(8), d(8), 0.14);
          if (m === 7) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.3, 220 - i * 30));
        }
      } else {                                                          // THE CLIMAX: everything at once, a key up, runs all over the range
        for (let i = 0; i < 16; i += 2) kick(at(i), 0.34);
        snare(at(4), 0.3); snare(at(12), 0.3);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.08 + i * 0.012); else { snare(at(7), 0.09); snare(at(15), 0.1); clap(at(4), 0.1); clap(at(12), 0.1); }
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.026 : 0.045, i === 14);
        [0, 3, 6, 10, 12, 14].forEach(x => taiko(at(x), 0.26));
        [0, 8].forEach(x => timp(at(x), 0.4));
        if (m % 2 === 0) crash(at(0), 0.2);
        [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.22, 210 - i * 28));
        [0, 1, 3, 4, 6, 8, 9, 11, 12, 14].forEach((x, i) => bass(N(c.r + (i % 5 === 4 ? 12 : 0)), at(x), d(1.2), 0.15));
        const w = wild(8, 25, 23, 0);
        w.forEach((n, i) => {
          strings(n, at(i), d(0.85), 0.05 + 0.02 * k);
          if (i % 2 === 0) strings(n + 12, at(i), d(1.4), 0.03);
          if (k > 0.55) lead(n + 12 * (i % 8 > 3 ? 0 : 1), at(i), d(0.7), 0.028, 0.125);
        });
        if (m % 4 === 0) for (const [x, n, len] of HOOK) { brass(N(n + 12 + tr), at(x), d(len) * 0.95, 0.1); brass(N(n + tr), at(x), d(len) * 0.95, 0.05); }
        else if (m % 4 === 2) for (const [x, n, len] of ANSWER) { brass(N(n + 6 + tr), at(x), d(len) * 0.95, 0.1); }
        [0, 6, 12].forEach(x => { brass(N(c.r + 24), at(x), d(2), 0.07); brass(N(c.r + 31), at(x), d(2), 0.05); });
        choir([N(c.arp[0] + 12), N(c.arp[2] + 12), N(c.arp[3] + 12)], at(0), d(16), 0.05);
        if (m === 7) riser(at(0), d(16), 0.07);
      }
    } };
  }

  // Final boss B: Undertale style, tense. Four sections of eight bars: the riff, the hook, a glitching breakdown, the climax.
  {
    const CHS = [chd(38, MIN), { r: 38, tones: [2, 5, 8], arp: [74, 77, 80, 77, 74] }, chd(34, MAJ), chd(33, MAJ)];
    const CH = [{ r: 38, a: [74, 77, 81, 77] }, { r: 38, a: [74, 77, 80, 77] }, { r: 34, a: [74, 77, 82, 77] }, { r: 33, a: [73, 76, 81, 76] }];
    const PROG = [[0, 1, 2, 3, 0, 1, 2, 3], [0, 0, 2, 3, 0, 0, 1, 3], [1, 1, 1, 1, 3, 3, 3, 3], [2, 3, 0, 1, 2, 3, 0, 3]];
    const RIFF = [0, 2, 3, 6, 8, 10, 11, 14];
    const HK = [
      [[0, 86, 2], [2, 86, 2], [4, 89, 2], [6, 86, 2], [8, 85, 4], [12, 81, 4]],
      [[0, 86, 2], [2, 86, 2], [4, 88, 2], [6, 86, 2], [8, 84, 4], [12, 80, 4]],
      [[0, 82, 2], [2, 86, 2], [4, 89, 2], [6, 86, 2], [8, 82, 4], [12, 79, 4]],
      [[0, 85, 2], [2, 88, 2], [4, 91, 4], [8, 88, 2], [10, 85, 2], [12, 81, 4]],
    ];
    T.finalB = { bpm: 150, bar(S) {
      const sec = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32), up = [0, 2, 0, 3][lap % 4];
      const ci = PROG[sec][m], c = CH[ci], cc = CHS[ci], k = Math.max(S.k, Math.min(0.9, 0.35 + lap * 0.1)), N = n => n + up, at = S.at, d = S.d;
      const riff = () => RIFF.forEach((x, i) => bass(N(c.r + (i % 3 === 2 ? 12 : 0)), at(x), d(1.7), 0.16));
      if (sec === 0) {                                                   // THE RIFF
        [0, 8].forEach(x => kick(at(x), 0.5)); if (k > 0.4) [3, 11].forEach(x => kick(at(x), 0.4));
        snare(at(4), 0.25); snare(at(12), 0.25);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.07 + i * 0.012);
        for (let i = 0; i < 16; i += 2) hat(at(i), 0.03 + 0.02 * k);
        riff();
        for (let i = 0; i < 16; i++) if ((i * 5 + S.bar) % 3 !== 0 || k > 0.6) lead(N(c.a[i % 4]), at(i), d(0.7), 0.03 + 0.012 * k, 0.125);
        if (k > 0.45) [0, 6, 12].forEach(x => brass(N(c.r + 24), at(x), d(2), 0.08));
        if (m === 0 && S.bar > 0) crash(at(0), 0.18);
        if (k > 0.7) choir([N(c.r + 24), N(c.r + 31)], at(0), d(16), 0.035);
        if (m === 7) riser(at(0), d(16), 0.05);
      } else if (sec === 1) {                                            // THE HOOK: the chip lead sings over the riff
        [0, 3, 6, 8, 11, 14].forEach(x => kick(at(x), 0.4));
        snare(at(4), 0.26); snare(at(12), 0.26); snare(at(7), 0.07); snare(at(15), 0.08);
        for (let i = 0; i < 16; i++) hat(at(i), i % 4 === 2 ? 0.05 : 0.026, i === 14);
        rim(at(2), 0.1); rim(at(10), 0.1);
        if (m === 0) crash(at(0), 0.18);
        if (m % 2 === 1) [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 200 - i * 24));
        riff();
        for (let i = 0; i < 16; i += 2) lead(N(c.a[i % 4]), at(i), d(0.7), 0.022, 0.125);
        for (const [x, n, len] of HK[m % 4]) { lead(N(n), at(x), d(len) * 0.92, 0.065, 0.25); if (k > 0.5) lead(N(n + 7), at(x), d(len) * 0.92, 0.026, 0.125); brass(N(n - 24), at(x), d(len) * 0.9, 0.04); }
        if (m >= 4) choir([N(c.r + 24), N(c.r + 31)], at(0), d(16), 0.03);
        if (m === 7) riser(at(0), d(16), 0.06);
      } else if (sec === 2) {                                            // THE GLITCH: stutters, holes, and a build that cuts out
        kick(at(0), 0.5); if (m % 2 === 1) kick(at(8), 0.4);
        if (m >= 4) { for (let i = 0; i < 16; i += 2) snare(at(i), 0.06 + i * 0.008 + (m - 4) * 0.02); }
        for (let i = 0; i < 16; i++) if ((i + m) % 3 !== 0) lead(N(cc.arp[(i >> 1) % 4] + (i % 4 === 3 ? 12 : 0)), at(i), d(0.55), 0.04, 0.125);
        for (let i = 0; i < 16; i += 4) lead(N(cc.arp[i % 5] + 12), at(i), d(0.9), 0.025, 0.25);
        bass(N(c.r), at(0), d(8), 0.16); if (m % 2 === 0) bass(N(c.r + 12), at(8), d(6), 0.13);
        for (let i = 0; i < 16; i += 2) hat(at(i), 0.02);
        if (m === 6) riser(at(0), d(32), 0.07);
        if (m === 7) { for (let i = 0; i < 8; i++) snare(at(i), 0.1 + i * 0.015); }
        if (m === 0) crash(at(0), 0.2);
      } else {                                                           // THE CLIMAX: double-time drums, brass, runs everywhere
        for (let i = 0; i < 16; i += 2) kick(at(i), 0.36);
        for (let i = 2; i < 16; i += 2) snare(at(i), i === 4 || i === 12 ? 0.26 : 0.1);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.08 + i * 0.012);
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.024 : 0.044, i === 14);
        [0, 6, 12].forEach(x => taiko(at(x), 0.2));
        if (m % 2 === 0) crash(at(0), 0.2);
        [12, 13, 14, 15].forEach((x, i) => tom(at(x), 0.2, 200 - i * 26));
        riff();
        const w = walk(CHROM.filter(v => v !== 6 && v !== 9 && v !== 11), 62, S.bar * 811 + lap * 71 + 9, 5, 18, cc.tones);
        w.forEach((n, i) => { lead(N(n), at(i), d(0.7), 0.04, 0.125); if (i % 2 === 0) strings(N(n - 12), at(i), d(1.4), 0.035); });
        [0, 6, 12].forEach(x => { brass(N(c.r + 24), at(x), d(2), 0.075); brass(N(c.r + 31), at(x), d(2), 0.05); });
        for (const [x, n, len] of HK[m % 4]) brass(N(n - 12), at(x), d(len) * 0.9, 0.07);
        choir([N(c.r + 24), N(c.r + 31), N(c.r + 36)], at(0), d(16), 0.04);
        if (m === 7) riser(at(0), d(16), 0.07);
      }
    } };
  }

  // The raid: the village burning. Urgent, and it follows the fire: k is how far the flames have spread.
  // Four sections of eight bars (the alarm, the burning, the collapse, the flight), a key up each lap.
  {
    const CHS = [chd(38, MIN), chd(39, MAJ), chd(34, MAJ), chd(33, MAJ)];
    const PROG = [[0, 1, 2, 3, 0, 1, 2, 3], [0, 1, 0, 1, 2, 3, 1, 3], [0, 0, 1, 1, 2, 2, 3, 3], [3, 0, 3, 0, 1, 2, 3, 3]];
    T.invasion = { bpm: 126, bar(S) {
      const sec = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32), up = [0, 2, 0, 3][lap % 4];
      const c = CHS[PROG[sec][m]], N = n => n + up, at = S.at, d = S.d;
      const kk = clampn(S.k + [-0.12, 0, 0.08, 0.16][sec] + lap * 0.05, 0, 1), r = lcg(S.bar * 53 + lap * 7);
      // always: a heartbeat of war drums, a toll, the low drone
      taiko(at(0), 0.3 + 0.12 * kk); taiko(at(8), 0.22 + 0.1 * kk);
      if (m % 2 === 0) piano(N(c.r + 36), at(0), 0.07 + 0.04 * kk, 3.5);
      bass(N(c.r), at(0), d(16), 0.12 + 0.03 * kk);
      rim(at(4), 0.05); rim(at(12), 0.05);
      // the fire
      for (let i = 0; i < 16; i++) if (r() < 0.1 + 0.4 * kk) crackle(at(i), 0.02 + 0.035 * kk);
      if (kk > 0.12) { for (let i = 0; i < 16; i += 4) tom(at(i + 2), 0.16 + 0.12 * kk, 150); }
      if (kk > 0.2) for (let i = 0; i < 16; i++) strings(N(c.arp[RUN16[i]]), at(i), d(0.9), 0.018 + 0.03 * kk);
      if (kk > 0.35) {
        snare(at(4), 0.14 + 0.1 * kk); snare(at(12), 0.14 + 0.1 * kk);
        [0, 8].forEach(x => { brass(N(c.r + 24), at(x), d(7), 0.05 + 0.025 * kk); brass(N(c.r + 25), at(x), d(7), 0.035 + 0.02 * kk); });   // an alarm, a half step apart
        for (let i = 0; i < 16; i += 2) taiko(at(i), 0.1 + 0.08 * kk);
      }
      if (kk > 0.55) {
        [0, 3, 6, 10, 12].forEach(x => brass(N(c.r + 12), at(x), d(1.6), 0.07));
        const w = walk(PHRY, 50, S.bar * 401 + lap * 31 + 2, 7, 22, c.tones);
        w.forEach((n, i) => strings(N(n), at(i), d(0.8), 0.035 + 0.02 * kk));
        for (let i = 0; i < 16; i += 2) kick(at(i), 0.22);
      }
      if (kk > 0.75) {
        choir([N(c.arp[0] + 12), N(c.arp[0] + 13), N(c.arp[2] + 12)], at(0), d(16), 0.04);
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.02 : 0.036);
        if (m % 2 === 0) crash(at(0), 0.16);
        if (m % 4 === 3) for (let i = 8; i < 16; i++) snare(at(i), 0.06 + i * 0.012);
      }
      if (m === 7 && kk > 0.2) riser(at(0), d(16), 0.04 + 0.03 * kk);
      if (sec === 2 && kk > 0.3) choir([N(c.r + 24), N(c.r + 27), N(c.r + 31)], at(0), d(16), 0.035);
    } };
  }

  // The Antechamber: a lullaby hummed from a cell. One bar is one beat of the tune, so the beasts' heartbeat near the gates can answer quickly.
  // Four sections of thirty-two beats: the hum, a second voice, a drift of chimes and wind, and the dark. It shifts key each lap.
  {
    const LULL = [74, 77, 81, 79, 77, 76, 74, null, 72, 74, 77, 76, 74, 72, 70, null];
    const ROOTS = [38, 34, 31, 33];
    const TRI = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]];
    const PENT = [74, 77, 79, 81, 84, 86];
    T.lullaby = { bpm: 200, bar(S) {
      const b = S.bar, sec = Math.floor(b / 32) % 4, lap = Math.floor(b / 128), up = [0, 0, 5, -2][lap % 4];
      const gi = Math.floor(b / 4) % 4, root = ROOTS[gi], tri = TRI[gi], N = n => n + up, at = S.at, d = S.d, r = lcg(b * 31 + lap * 13 + 1);
      const note = LULL[b % 16], first = b % 4 === 0;
      // the tune, and the drone under it
      if (note) piano(N(note), at(0), 0.1, 2.4);
      if (first) { pad(N(root + 12), at(0), d(64), 0.04); piano(N(root + 24), at(0), 0.04, 4.5); }
      if (sec >= 1) {                                                    // a second voice: chords under the tune, and a music box above it
        if (first) tri.forEach(n => pad(N(n), at(0), d(64), 0.028));
        if (note && b % 2 === 0) piano(N(note + 12), at(5), 0.05, 1.6);
        if (b % 8 === 0) piano(N(root + 36), at(0), 0.05, 5);
      }
      if (sec === 2) {                                                   // chimes and wind
        if (r() < 0.28) piano(N(PENT[Math.floor(r() * PENT.length)]), at(Math.floor(r() * 14)), 0.045, 3);
        if (b % 2 === 0) strings(N(tri[(b >> 1) % 3] - 12), at(0), d(30), 0.028);
        if (r() < 0.05) burst(at(0), 2.2, 'bandpass', 600 + r() * 500, 2, 0.016);
      }
      if (sec === 3) {                                                   // the dark: the tune low, a choir far off
        if (note) pad(N(note - 12), at(0), d(18), 0.05);
        if (b % 8 === 0) choir(tri.map(n => N(n + 12)), at(0), d(128), 0.03);
        if (b % 16 === 8) piano(N(root + 12), at(0), 0.08, 6);
        if (r() < 0.06) burst(at(0), 2.6, 'bandpass', 500 + r() * 400, 2.2, 0.016);
      }
      // near the trial gates: the chained beasts. Hearts that never quite keep time, and chains.
      if (S.prox > 0.005) {
        const q = S.prox, ent = Math.min(1, q / 0.06), g = ent * (1 + 1.2 * q);
        thud(at(0), 0.39 * g); S.pulse(at(0));
        if (b % 2 === 1) thud(at(6), 0.25 * g);
        if (q > 0.35 && b % 4 === 2) thud(at(11), 0.2 * g);
        if (q > 0.2 && r() < 0.1 + 0.4 * q) chainRattle(at(Math.floor(r() * 14)), 0.05 * g);
        if (q > 0.7 && b % 4 === 0) pad(N(root), at(0), d(40), 0.05 + 0.04 * q);
      }
    } };
  }

  // ================= The Hive's fight music: six songs. Each is four sections of eight bars, built so that no lap repeats the last:
  // the sections change order, the chords change, the hooks come back upside down or in a new key, the bass and stab rhythms rotate,
  // the drums change pattern, and the end of every section has a different event (a roll, a drum run, a swell).
  {
    const ORDERS = [[0, 1, 2, 3], [0, 2, 1, 3], [1, 0, 3, 2], [0, 3, 2, 1]];
    const KEYS = [0, 2, 0, 3, -2, 5];
    const mk = S => {
      const slot = Math.floor(S.bar / 8) % 4, m = S.bar % 8, lap = Math.floor(S.bar / 32), sec = ORDERS[lap % 4][slot], up = KEYS[lap % 6];
      return { m, slot, sec, lap, up, v: lap % 3, k: Math.max(S.k, Math.min(0.9, 0.4 + lap * 0.08)), N: n => n + up, at: S.at, d: S.d, bar: S.bar, r: lcg(S.bar * 131 + lap * 7 + 3) };
    };
    const RHY = [[0, 3, 6, 10, 12, 14], [0, 2, 3, 6, 8, 11, 14], [0, 4, 6, 8, 12, 14], [0, 3, 4, 8, 11, 12], [0, 1, 3, 6, 9, 12], [0, 2, 6, 7, 10, 14]];
    const BAS = [[0, 2, 4, 6, 8, 10, 12, 14], [0, 1, 3, 4, 6, 8, 9, 11, 12, 14], [0, 3, 6, 8, 11, 14], [0, 2, 3, 5, 6, 8, 10, 11, 13, 14]];
    const stabs = X => RHY[(X.lap * 2 + X.sec + (X.m >> 2)) % 6];
    const bassR = X => BAS[(X.lap + X.sec + (X.m % 2)) % 4];
    const hookV = (H, X) => { const f = H[0][1]; return H.map(([x, n, len]) => [x, X.v === 1 ? 2 * f - n + 5 : (X.v === 2 ? n + 5 : n), len]); };
    const fillT = (X, v, f0) => [12, 13, 14, 15].forEach((x, i) => tom(X.at(x), v, f0 - i * 22));
    const rollS = (X, from, v) => { for (let i = from; i < 16; i++) snare(X.at(i), v + i * 0.01); };
    // what happens at the end of every section: it is different each lap
    const finale = X => {
      const { m, at, d, v } = X;
      if (m !== 7) return;
      if (v === 0) { riser(at(0), d(16), 0.06); rollS(X, 8, 0.08); }
      else if (v === 1) { for (let i = 0; i < 16; i++) tom(at(i), 0.14 + i * 0.006, 230 - i * 9); riser(at(8), d(8), 0.05); }
      else { riser(at(0), d(16), 0.07); crash(at(12), 0.2); for (let i = 0; i < 16; i += 2) snare(at(i), 0.05 + i * 0.01); }
    };
    const kit = (style, X) => {
      const { m, sec, k, at, v } = X;
      if (style === 'war') {
        if (sec === 0) { [0, 8].forEach(x => timp(at(x), 0.42)); [0, 6, 12].forEach(x => taiko(at(x), 0.16)); if (k > 0.3) { snare(at(4), 0.22); snare(at(12), 0.22); } if (m % 4 === 3) fillT(X, 0.26, 170); if (m === 0 && X.bar > 0) crash(at(0), 0.18); }
        else if (sec === 1) { [0, 6, 8, 14].forEach(x => kick(at(x), 0.32)); [0, 8].forEach(x => timp(at(x), 0.38)); snare(at(4), 0.26); snare(at(12), 0.26); for (let i = 0; i < 16; i += 2) hat(at(i), 0.035); if (m % 2) fillT(X, 0.24, 180); if (m % 2 === 0) crash(at(0), 0.16); }
        else if (sec === 2) { timp(at(0), 0.5); rim(at(4), 0.1); rim(at(12), 0.1); if (v) [3, 11].forEach(x => taiko(at(x), 0.16)); if (m >= 5) rollS(X, m === 5 ? 8 : 0, 0.05 + (m - 5) * 0.03); if (m === 7) fillT(X, 0.3, 190); if (m === 6) riser(at(0), X.d(32), 0.06); }
        else { for (let i = 0; i < 16; i += 2) kick(at(i), 0.3); snare(at(4), 0.3); snare(at(12), 0.3); [0, 3, 6, 10, 12, 14].forEach(x => taiko(at(x), 0.22)); [0, 8].forEach(x => timp(at(x), 0.4)); for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.022 : 0.04); if (m % 2 === 0) crash(at(0), 0.18); fillT(X, 0.2, 200); }
      } else if (style === 'march') {
        timp(at(0), 0.5); timp(at(8), 0.36);
        snare(at(4), 0.2); snare(at(12), 0.2); if (sec >= 1) { snare(at(2), 0.08); snare(at(10), 0.08); snare(at(14), 0.1); }
        if (sec === 3) for (let i = 0; i < 16; i += 2) kick(at(i), 0.28);
        if (sec === 2 && m >= 5) rollS(X, m === 5 ? 8 : 0, 0.05 + (m - 5) * 0.03);
        if (v === 1) [6, 14].forEach(x => taiko(at(x), 0.18));
        if (m % 4 === 0) crash(at(0), 0.16);
        if (m === 7) fillT(X, 0.28, 180);
      } else if (style === 'relent') {
        for (let i = 0; i < 16; i += 2) kick(at(i), sec === 3 ? 0.34 : 0.3);
        if (sec >= 1) [3, 11].forEach(x => kick(at(x), 0.22));
        if (v === 2) [5, 13].forEach(x => kick(at(x), 0.2));
        snare(at(4), 0.3); snare(at(12), 0.3); [7, 9, 15].forEach(x => snare(at(x), 0.07));
        if (sec === 3) for (let i = 2; i < 16; i += 4) snare(at(i), 0.12);
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.02 : 0.04, i === 14);
        [0, 3, 6, 10, 12, 14].forEach(x => taiko(at(x), 0.18));
        fillT(X, 0.2, 200 - (m % 2) * 20);
        if (m % 2 === 0) crash(at(0), 0.16);
      } else if (style === 'orch') {
        for (let i = 0; i < 16; i += 2) timp(at(i), 0.2 + (i % 8 === 0 ? 0.2 : 0));
        for (let i = 0; i < 16; i++) snare(at(i), i % 4 === 0 ? 0.14 : 0.05);
        snare(at(4), 0.26); snare(at(12), 0.26);
        if (sec >= 2 || v) [0, 6, 12].forEach(x => taiko(at(x), 0.2));
        if (m % 2 === 0) crash(at(0), 0.18);
        fillT(X, 0.24, 180);
      } else {                                                           // a breakbeat
        [[0, 3, 6, 10, 13], [0, 2, 5, 8, 11, 14], [0, 3, 7, 10, 12, 15]][v].forEach(x => kick(at(x), 0.4)); snare(at(4), 0.3); snare(at(12), 0.3); [7, 9, 15].forEach(x => snare(at(x), 0.08));
        for (let i = 0; i < 16; i++) hat(at(i), i % 2 ? 0.02 : 0.04, i === 14);
        if (m % 2) fillT(X, 0.22, 200); if (m % 2 === 0) crash(at(0), 0.17);
        if (sec === 3) [2, 5, 11].forEach(x => taiko(at(x), 0.2));
      }
    };
    const RUN = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 3];
    const RUNS = [RUN, [0, 2, 1, 3, 2, 4, 3, 2, 0, 2, 1, 3, 2, 4, 3, 2], [0, 1, 0, 2, 0, 3, 0, 4, 0, 3, 0, 2, 0, 3, 0, 1]];

    // 1. The swarm: a buzzing drone, chirping lines and war drums.
    {
      const P = [
        [chd(38, MIN), chd(39, MAJ), chd(38, MIN), chd(36, MAJ), chd(34, MAJ), chd(39, MAJ), chd(33, MAJ), chd(38, MIN)],
        [chd(38, MIN), chd(34, MAJ), chd(43, MIN), chd(33, MAJ), chd(38, MIN), chd(41, MAJ), chd(39, MAJ), chd(33, MAJ)],
        [chd(38, MIN), chd(38, MIN), chd(39, MAJ), chd(39, MAJ), chd(36, MIN), chd(34, MAJ), chd(33, MAJ), chd(33, MAJ)],
      ];
      const HOOK = [[0, 74, 3], [3, 75, 3], [6, 74, 2], [8, 70, 4], [12, 69, 4]];
      T.hiveA = { bpm: 168, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit('war', X);
        swarm(N(c.r + 12), at(0), d(16), 0.045 + 0.02 * k); swarm(N(c.r + 19), at(0), d(16), 0.025);
        if (!(X.r() < 0.08 && m % 4 === 2)) bassR(X).forEach(x => bass(N(c.r), at(x), d(1.3), 0.14));
        if (v) buzz(N(c.r + 24), at(m % 2 ? 8 : 0), d(8), 0.03, { bend: v === 1 ? 1.3 : 0.78, lfo: 48 });
        if (sec === 0) { for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]]), at(i), d(0.8), 0.04 + 0.02 * k); stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.4), 0.06)); }
        else if (sec === 1) {
          for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]]), at(i), d(0.8), 0.035);
          walk(PHRY, 50, S.bar * 701 + lap, 10, 26, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.6), 0.035, 0.125));
          if (m % 2 === 0) for (const [x, n, len] of hookV(HOOK, X)) brass(N(n), at(x), d(len) * 0.95, 0.08);
        } else if (sec === 2) {
          choir([N(c.arp[0] + 12), N(c.arp[1] + 13), N(c.arp[2] + 12)], at(0), d(16), 0.04);
          for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 24), at(i * 2), 0.05, 1.2);
          walk(NMIN, 62, S.bar * 31 + lap, 7, 22, c.tones).forEach((n, i) => { if (i % 2) lead(N(n), at(i), d(0.5), 0.026, 0.25); });
        } else {
          walk(PHRY, 50, S.bar * 911 + lap * 3, 8, 26, c.tones).forEach((n, i) => { strings(N(n), at(i), d(0.8), 0.05); if (i % 2 === 0) lead(N(n + 12), at(i), d(0.6), 0.03, 0.125); });
          for (const [x, n, len] of hookV(HOOK, X)) brass(N(n + 12), at(x), d(len) * 0.95, 0.09);
          stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.5), 0.065));
          choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045);
        }
        finale(X);
      } };
    }

    // 7. The taken queen: slow and enormous. A huge choir, an organ-like pad, chains and brass hits.
    {
      const P = [
        [chd(43, MIN), chd(39, MAJ), chd(34, MAJ), chd(41, MAJ), chd(43, MIN), chd(39, MAJ), chd(36, MIN), chd(38, MAJ)],
        [chd(43, MIN), chd(36, MIN), chd(39, MAJ), chd(38, MAJ), chd(43, MIN), chd(34, MAJ), chd(41, MAJ), chd(38, MAJ)],
        [chd(43, MIN), chd(43, MIN), chd(39, MAJ), chd(39, MAJ), chd(36, MIN), chd(36, MIN), chd(38, MAJ), chd(38, MAJ)],
      ];
      const MEL = [[[0, 74, 8], [8, 70, 4], [12, 72, 4]], [[0, 75, 8], [8, 74, 4], [12, 70, 4]], [[0, 77, 8], [8, 74, 4], [12, 77, 4]], [[0, 77, 6], [6, 74, 2], [8, 72, 8]],
        [[0, 74, 8], [8, 79, 4], [12, 77, 4]], [[0, 75, 8], [8, 79, 4], [12, 75, 4]], [[0, 72, 8], [8, 75, 4], [12, 79, 4]], [[0, 78, 6], [6, 74, 2], [8, 69, 8]]];
      T.hiveG = { bpm: 120, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit('march', X);
        bass(N(c.r), at(0), d(16), 0.16); if (v === 2) bass(N(c.r + 12), at(8), d(8), 0.1);
        pad(N(c.arp[0]), at(0), d(16), 0.06); pad(N(c.arp[1]), at(0), d(16), 0.05); pad(N(c.arp[2]), at(0), d(16), 0.05);
        choir([N(c.arp[0] + 12), N(c.arp[1] + 12), N(c.arp[2] + 12), N(c.arp[3] + 12)], at(0), d(16), 0.05);
        chainRattle(at(4), 0.04); chainRattle(at(12), 0.04); if (v) chainRattle(at(8), 0.03);
        if (sec >= 1) for (const [x, n, len] of hookV(MEL[m], X)) { brass(N(n), at(x), d(len) * 0.95, 0.09); brass(N(n - 12), at(x), d(len) * 0.95, 0.05); }
        if (sec === 2) for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 12), at(i * 2), 0.07, 2.5);
        if (sec === 3) { for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]] + 12), at(i), d(0.85), 0.045); stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(2), 0.07)); walk(HARM, 55, S.bar * 41 + lap, 7, 22, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.6), 0.025, 0.125)); }
        if (lap >= 1 && sec !== 3) walk(HARM, 43, S.bar * 19 + lap, 7, 18, c.tones).forEach((n, i) => { if (i % 2 === 0) strings(N(n), at(i), d(1.6), 0.03); });
        finale(X);
      } };
    }

    // 14. Swarm intelligence: four buzzing voices, each stepping through the chord at its own rate. The rates change every lap.
    {
      const P = [
        [chd(43, MIN), chd(44, MAJ), chd(43, MIN), chd(41, MAJ), chd(43, MIN), chd(39, MAJ), chd(41, MAJ), chd(42, MAJ)],
        [chd(43, MIN), chd(34, MAJ), chd(36, MIN), chd(38, MAJ), chd(43, MIN), chd(39, MAJ), chd(38, MAJ), chd(38, MAJ)],
        [chd(43, MIN), chd(43, MIN), chd(44, MAJ), chd(44, MAJ), chd(41, MAJ), chd(41, MAJ), chd(42, MAJ), chd(42, MAJ)],
      ];
      const RATES = [[2, 3, 4, 5], [3, 4, 5, 7], [2, 4, 6, 3]];
      T.hiveN = { bpm: 192, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit(v === 2 ? 'break' : 'relent', X);
        for (let vo = 0; vo < 4; vo++) for (let i = 0; i < 16; i += RATES[v][vo]) buzz(N(c.arp[(i + vo + m + lap) % 5] + 12 * (vo % 2)), at(i), d(RATES[v][vo] - 0.5), 0.016 + 0.004 * vo, { lfo: 50 + vo * 6, cut: 1200 + vo * 500 });
        bassR(X).forEach(x => bass(N(c.r + (x % 4 === 3 ? 12 : 0)), at(x), d(1.3), 0.15));
        swarm(N(c.r + 12), at(0), d(16), 0.04);
        if (sec >= 1) { for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]]), at(i), d(0.8), 0.04); choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.04); }
        if (sec >= 2) { stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.5), 0.07)); walk(PHRY, 55, S.bar * 401 + lap, 8, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.45), 0.026, 0.125)); }
        if (sec === 3) { choir([N(c.arp[0] + 12), N(c.arp[1] + 13), N(c.arp[3] + 12)], at(0), d(16), 0.05); for (let i = 0; i < 16; i++) strings(N(c.arp[(i * 2) % 5] + 12), at(i), d(0.7), 0.04); buzz(N(c.r + 24), at(0), d(16), 0.03, { bend: 1.5, lfo: 40 }); }
        finale(X);
      } };
    }

    // 15. Hornet march: a heavy brass riff hammered over and over, in a new shape each lap.
    {
      const P = [
        [chd(39, MIN), chd(39, MIN), chd(35, MAJ), chd(34, MAJ), chd(39, MIN), chd(42, MAJ), chd(35, MAJ), chd(34, MAJ)],
        [chd(39, MIN), chd(32, MAJ), chd(35, MAJ), chd(34, MAJ), chd(39, MIN), chd(37, MAJ), chd(35, MAJ), chd(34, MAJ)],
        [chd(39, MIN), chd(39, MIN), chd(42, MAJ), chd(42, MAJ), chd(35, MIN), chd(35, MIN), chd(34, MAJ), chd(34, MAJ)],
      ];
      const RIFFS = [[[0, 0], [3, 3], [6, 5], [8, 3], [11, 0], [14, -2]], [[0, 0], [2, 3], [4, 5], [8, 7], [10, 5], [14, 3]], [[0, 0], [3, 0], [6, 3], [8, 0], [11, 5], [14, 3]]];
      T.hiveO = { bpm: 170, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit(sec >= 2 ? 'relent' : 'orch', X);
        RIFFS[v].forEach(([x, o]) => { brass(N(c.r + 24 + o), at(x), d(2), 0.085); brass(N(c.r + 12 + o), at(x), d(2), 0.06); });
        bassR(X).forEach(x => bass(N(c.r), at(x), d(1.3), 0.15));
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]] + 12), at(i), d(0.8), 0.045);
        swarm(N(c.r + 12), at(0), d(16), 0.045); buzz(N(c.r + 24), at(0), d(16), 0.025, { lfo: 54 });
        if (sec >= 1) choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045);
        if (sec >= 2) walk(PHRY, 51, S.bar * 177 + lap, 8, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.5), 0.028, 0.125));
        if (sec === 3) { choir([N(c.arp[0] + 12), N(c.arp[1] + 12), N(c.arp[3] + 12)], at(0), d(16), 0.05); for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 24), at(i * 2), 0.06, 1); }
        finale(X);
      } };
    }

    // 8. Stinger: almost all rhythm. A breakbeat, a bass riff that never sits down, and horn hits.
    {
      const P = [
        [chd(41, MIN), chd(41, MIN), chd(37, MAJ), chd(36, MAJ), chd(41, MIN), chd(44, MAJ), chd(37, MAJ), chd(39, MAJ)],
        [chd(41, MIN), chd(46, MAJ), chd(44, MAJ), chd(39, MAJ), chd(41, MIN), chd(36, MIN), chd(37, MAJ), chd(40, MAJ)],
        [chd(41, MIN), chd(41, MIN), chd(44, MAJ), chd(44, MAJ), chd(39, MAJ), chd(39, MAJ), chd(37, MAJ), chd(37, MAJ)],
      ];
      T.hiveH = { bpm: 180, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit('break', X);
        bassR(X).forEach((x, i) => bass(N(c.r + (i % 4 === 3 ? 12 : (i % 5 === 4 ? 7 : 0))), at(x), d(1.3), 0.16));
        swarm(N(c.r + 12), at(0), d(16), 0.04);
        if (sec >= 1) stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.5), 0.07));
        if (sec >= 1) for (let i = 0; i < 16; i += 2) lead(N(c.arp[((i >> 1) + lap) % 4] + 12), at(i), d(0.7), 0.03, 0.125);
        if (sec === 2) for (let i = 0; i < 16; i++) lead(N(87 - Math.floor(i * 0.7) + (m % 2) * 2 - lap), at(i), d(0.6), 0.022, 0.5);
        if (sec === 3) { walk(PHRY, 53, S.bar * 29 + lap, 8, 24, c.tones).forEach((n, i) => { strings(N(n), at(i), d(0.8), 0.045); lead(N(n + 12), at(i), d(0.5), 0.024, 0.125); }); choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.04); }
        if (v) buzz(N(c.r + 24), at(0), d(8), 0.03, { bend: v === 1 ? 1.4 : 0.7, lfo: 52 });
        finale(X);
      } };
    }

    // 10. The queen's guard: orchestral and marching. Fanfares over a string ostinato that does not let up.
    {
      const P = [
        [chd(38, MIN), chd(34, MAJ), chd(43, MIN), chd(33, MAJ), chd(38, MIN), chd(41, MAJ), chd(43, MIN), chd(33, MAJ)],
        [chd(38, MIN), chd(41, MAJ), chd(34, MAJ), chd(36, MAJ), chd(38, MIN), chd(43, MIN), chd(41, MAJ), chd(33, MAJ)],
        [chd(38, MIN), chd(38, MIN), chd(34, MAJ), chd(34, MAJ), chd(43, MIN), chd(43, MIN), chd(33, MAJ), chd(33, MAJ)],
      ];
      const MEL = [[[0, 74, 4], [4, 77, 2], [6, 81, 2], [8, 79, 4], [12, 77, 4]], [[0, 77, 4], [4, 74, 2], [6, 70, 2], [8, 72, 4], [12, 74, 4]], [[0, 79, 4], [4, 82, 2], [6, 86, 2], [8, 84, 4], [12, 82, 4]], [[0, 81, 6], [6, 76, 2], [8, 73, 4], [12, 76, 4]],
        [[0, 74, 4], [4, 81, 4], [8, 86, 4], [12, 84, 4]], [[0, 84, 4], [4, 81, 2], [6, 77, 2], [8, 79, 8]], [[0, 79, 4], [4, 82, 2], [6, 79, 2], [8, 77, 4], [12, 74, 4]], [[0, 76, 6], [6, 73, 2], [8, 81, 8]]];
      T.hiveJ = { bpm: 176, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m];
        kit(sec >= 2 ? 'relent' : 'orch', X);
        bassR(X).forEach(x => bass(N(c.r), at(x), d(1.3), 0.15));
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]]), at(i), d(0.8), 0.05 + 0.02 * k);
        swarm(N(c.r + 12), at(0), d(16), 0.04);
        for (let i = 0; i < 16; i += 4) buzz(N(c.arp[(i + lap) % 5] + 24), at(i), d(4), 0.022, { lfo: 56, cut: 2200 });
        for (const [x, n, len] of hookV(MEL[m], X)) { brass(N(n), at(x), d(len) * 0.95, 0.09); if (sec >= 1) brass(N(n - 12), at(x), d(len) * 0.95, 0.05); }
        if (sec >= 1) choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045);
        if (sec >= 2) walk(NMIN, 57, S.bar * 313 + lap, 7, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.5), 0.03, 0.125));
        if (sec === 3) { for (const [x, n, len] of hookV(MEL[m], X)) brass(N(n + 12), at(x), d(len) * 0.95, 0.08); for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 12), at(i * 2), 0.06, 1.2); }
        finale(X);
      } };
    }

    // ================= The Foundry: seven songs (the three chosen boss themes, Old Sprocket twice, the final boss twice).
    // Built for variety: each tune is an eight-bar melody (not one bar repeated), the third section of every lap opens with a quiet breakdown
    // (no kit, piano and pad), the last section switches to a second drum pattern and doubles the tune up an octave.
    // Machine sounds land on the beat: metal on the backbeats, an anvil on the downbeat, steam on the off-beats, a steady motor hum.
    const PG = (...vs) => vs.map(vv => vv.map(([r, q]) => chd(r, q ? MAJ : MIN)));
    const bd = X => X.sec === 2 && X.m < 4;                              // the breakdown: first half of the third section
    const mach = (X, c, pist) => {
      const { m, at, d, N, k } = X;
      if (bd(X)) { if (m % 2 === 0) clang(at(0), 0.09, 300); } else [4, 12].forEach(x => clang(at(x), 0.1, 360));
      if (m % 4 === 0) anvil(at(0), 0.1 + 0.08 * k);
      [6, 14].forEach(x => hiss(at(x), 0.035, 0.18));
      motor(N(c.r + 12), at(0), d(16), 0.03);
      if (pist) { pistonHit(at(0), 0.4); if (!bd(X)) pistonHit(at(8), 0.3); }
    };
    // drums: the song's kit, a second kit for the last section, and in the breakdown just a heartbeat that builds into the fill
    const drums = (X, style, alt) => {
      const { m, sec, at, d } = X;
      if (bd(X)) { kick(at(0), 0.28); kick(at(8), 0.2); for (let i = 0; i < 16; i += 4) hat(at(i), 0.03); if (m === 3) { fillT(X, 0.2, 190); riser(at(0), d(16), 0.05); } }
      else kit(sec === 3 && alt ? alt : style, X);
    };
    // the breakdown's bed: pad and a soft choir
    const hush = (X, c) => {
      if (!bd(X)) return;
      const { at, d, N } = X;
      pad(N(c.arp[0]), at(0), d(16), 0.06); pad(N(c.arp[2]), at(0), d(16), 0.045); choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.035);
    };
    // the tune: brass normally, piano in the breakdown, doubled an octave up in the last section
    const tune = (X, mel, vol, cl) => {
      const { m, sec, at, d, N } = X;
      for (const [x, n, len] of hookV(mel[m], X)) {
        if (bd(X)) { piano(N(n), at(x), 0.1, 1.6); piano(N(n + 12), at(x), 0.045, 1); continue; }
        brass(N(n), at(x), d(len) * 0.95, vol);
        if (sec === 3) brass(N(n + 12), at(x), d(len) * 0.95, vol * 0.8);
        else if (sec === 1 && m >= 4) brass(N(n - 12), at(x), d(len) * 0.95, vol * 0.5);
        if (cl) clang(at(x), 0.1, m2f(N(n)));
      }
    };

    // 1. Assembly line: a relentless machine drive. Fast drums, pumping bass, a brass tune, strings running underneath.
    {
      const P = PG([[38, 0], [34, 1], [43, 0], [33, 1], [38, 0], [34, 1], [41, 1], [33, 1]], [[38, 0], [41, 1], [34, 1], [36, 1], [38, 0], [43, 0], [41, 1], [33, 1]], [[38, 0], [38, 0], [34, 1], [34, 1], [43, 0], [43, 0], [33, 1], [33, 1]]);
      const MEL = [[[0, 74, 3], [3, 77, 3], [6, 81, 2], [8, 79, 4], [12, 77, 4]], [[0, 77, 3], [3, 74, 3], [6, 70, 2], [8, 72, 4], [12, 74, 4]], [[0, 79, 3], [3, 82, 3], [6, 79, 2], [8, 77, 4], [12, 74, 4]], [[0, 81, 3], [3, 76, 3], [6, 73, 2], [8, 76, 4], [12, 81, 4]],
        [[0, 86, 3], [3, 84, 3], [6, 81, 2], [8, 79, 4], [12, 77, 4]], [[0, 82, 4], [4, 79, 2], [6, 77, 2], [8, 74, 8]], [[0, 81, 3], [3, 77, 3], [6, 72, 2], [8, 77, 4], [12, 79, 4]], [[0, 81, 4], [4, 80, 2], [6, 81, 2], [8, 76, 8]]];
      T.foundryA = { bpm: 148, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m], B = bd(X);
        drums(X, 'relent', 'break'); mach(X, c); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach(x => bass(N(c.r + (sec === 3 && x % 8 === 6 ? 7 : 0)), at(x), d(1.2), 0.16));
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]]), at(i), d(0.8), (B ? 0.03 : 0.045) + 0.02 * k);
        if (!B) for (let i = 0; i < 16; i += (sec === 3 ? 1 : 2)) robo(N(c.arp[RUNS[v][i]] + 12), at(i), d(sec === 3 ? 0.5 : 1.4), 0.024, 0.25);
        tune(X, MEL, 0.085);
        if (sec === 1 && !B) walk(NMIN, 57, S.bar * 313 + lap, 7, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.5), 0.03, 0.125));
        if (sec >= 2 && !B) choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045);
        if (sec === 3) stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.4), 0.065));
        finale(X);
      } };
    }

    // 2. Short circuit: a breakbeat at speed. Bass that never sits down, 16th-note robot arps, brass stabs and a jumpy tune.
    {
      const P = PG([[40, 0], [41, 1], [40, 0], [43, 1], [38, 1], [41, 1], [36, 1], [35, 1]], [[40, 0], [45, 0], [43, 1], [38, 1], [40, 0], [36, 1], [41, 1], [35, 1]], [[40, 0], [40, 0], [43, 1], [43, 1], [38, 1], [38, 1], [35, 1], [35, 1]]);
      const MEL = [[[0, 76, 2], [2, 83, 2], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 79, 4]], [[0, 77, 2], [2, 81, 2], [4, 84, 2], [6, 81, 2], [8, 77, 4], [12, 72, 4]], [[0, 76, 2], [2, 83, 2], [4, 81, 2], [6, 79, 2], [8, 83, 4], [12, 81, 4]], [[0, 79, 2], [2, 83, 2], [4, 86, 2], [6, 83, 2], [8, 79, 4], [12, 74, 4]],
        [[0, 78, 2], [2, 81, 2], [4, 86, 2], [6, 81, 2], [8, 78, 4], [12, 81, 4]], [[0, 84, 2], [2, 81, 2], [4, 77, 2], [6, 81, 2], [8, 84, 4], [12, 81, 4]], [[0, 79, 2], [2, 84, 2], [4, 88, 2], [6, 84, 2], [8, 79, 4], [12, 76, 4]], [[0, 83, 2], [2, 87, 2], [4, 90, 2], [6, 87, 2], [8, 83, 8]]];
      T.foundryC = { bpm: 176, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m], B = bd(X);
        drums(X, 'break', 'relent'); mach(X, c); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach((x, i) => bass(N(c.r + (i % 4 === 3 ? 12 : (i % 5 === 4 ? 7 : 0))), at(x), d(1.1), 0.16));
        if (B) { for (let i = 0; i < 16; i += 4) robo(N(c.arp[RUNS[v][i]] + 12), at(i), d(3), 0.022, 0.25); }
        else for (let i = 0; i < 16; i++) robo(N(c.arp[RUNS[(v + sec) % 3][i]] + 12), at(i), d(0.45), 0.028, 0.125);
        if (!B) stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.3), 0.06));
        tune(X, MEL, 0.075);
        if (sec >= 1 && !B) walk(PHRY, 52, S.bar * 53 + lap, 8, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.45), 0.03, 0.125));
        if (sec >= 2) for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[v][i]]), at(i), d(0.7), B ? 0.025 : 0.045);
        if (sec === 3) choir([N(c.arp[0] + 12), N(c.arp[1] + 13), N(c.arp[3] + 12)], at(0), d(16), 0.05);
        finale(X);
      } };
    }

    // 3. Scrapyard: orchestral drums, a tune hammered out on scrap metal and brass, strings that do not let up.
    {
      const P = PG([[45, 0], [41, 1], [43, 1], [40, 1], [45, 0], [38, 0], [41, 1], [40, 1]], [[45, 0], [47, 1], [41, 1], [43, 1], [45, 0], [40, 1], [38, 0], [40, 1]], [[45, 0], [45, 0], [41, 1], [41, 1], [38, 0], [38, 0], [40, 1], [40, 1]]);
      const MEL = [[[0, 76, 3], [3, 79, 3], [6, 76, 2], [8, 74, 3], [11, 72, 2], [13, 71, 3]], [[0, 77, 3], [3, 81, 3], [6, 84, 2], [8, 81, 4], [12, 77, 4]], [[0, 79, 3], [3, 83, 3], [6, 79, 2], [8, 74, 3], [11, 79, 2], [13, 83, 3]], [[0, 80, 4], [4, 76, 2], [6, 80, 2], [8, 83, 4], [12, 80, 4]],
        [[0, 81, 3], [3, 84, 3], [6, 81, 2], [8, 79, 3], [11, 76, 2], [13, 72, 3]], [[0, 77, 3], [3, 81, 3], [6, 86, 2], [8, 84, 4], [12, 81, 4]], [[0, 84, 3], [3, 81, 3], [6, 77, 2], [8, 79, 3], [11, 81, 2], [13, 84, 3]], [[0, 83, 2], [2, 80, 2], [4, 76, 4], [8, 80, 4], [12, 83, 4]]];
      T.foundryD = { bpm: 150, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m], B = bd(X);
        drums(X, 'orch', 'relent'); mach(X, c); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach(x => bass(N(c.r), at(x), d(1.2), 0.16));
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]]), at(i), d(0.8), (B ? 0.03 : 0.045) + 0.02 * k);
        tune(X, MEL, 0.085, true);
        if (sec === 1 && !B) walk(HARM, 55, S.bar * 41 + lap, 7, 22, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.5), 0.028, 0.125));
        if (sec >= 2 && !B) { choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045); stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.3), 0.06)); }
        if (sec === 3) for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 12), at(i * 2), 0.06, 1.2);
        finale(X);
      } };
    }

    // 4. Old Sprocket: a music box tune over a marching machine. Sad on top, relentless underneath.
    const SPR = PG([[41, 0], [37, 1], [36, 0], [34, 1], [41, 0], [39, 1], [37, 1], [36, 0]], [[41, 0], [44, 1], [37, 1], [36, 0], [41, 0], [32, 1], [39, 1], [36, 0]], [[41, 0], [41, 0], [37, 1], [37, 1], [36, 0], [36, 0], [34, 1], [34, 1]]);
    const SPM = [[[0, 77, 2], [2, 80, 2], [4, 84, 2], [6, 80, 2], [8, 77, 2], [10, 75, 2], [12, 72, 4]], [[0, 73, 2], [2, 77, 2], [4, 80, 2], [6, 77, 2], [8, 73, 2], [10, 72, 2], [12, 70, 4]], [[0, 72, 2], [2, 75, 2], [4, 79, 2], [6, 75, 2], [8, 72, 2], [10, 70, 2], [12, 67, 4]], [[0, 70, 2], [2, 74, 2], [4, 77, 2], [6, 74, 2], [8, 77, 4], [12, 82, 4]],
      [[0, 84, 4], [4, 80, 2], [6, 77, 2], [8, 75, 2], [10, 77, 2], [12, 80, 4]], [[0, 79, 2], [2, 82, 2], [4, 87, 4], [8, 82, 4], [12, 79, 4]], [[0, 80, 4], [4, 77, 2], [6, 73, 2], [8, 77, 4], [12, 80, 4]], [[0, 79, 2], [2, 75, 2], [4, 72, 2], [6, 75, 2], [8, 79, 8]]];
    {
      T.foundrySprocket = { bpm: 124, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = SPR[v][m], B = bd(X);
        drums(X, 'march'); mach(X, c); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.14); else bassR(X).forEach(x => bass(N(c.r), at(x), d(1.2), 0.15));
        for (const [x, n, len] of hookV(SPM[m], X)) {
          piano(N(n), at(x), B ? 0.12 : 0.1, 1.4); piano(N(n) + 12, at(x), 0.05, 1);
          if (sec >= 1 && !B) brass(N(n - 12), at(x), d(len) * 0.95, 0.07);
          if (sec === 3) brass(N(n), at(x), d(len) * 0.95, 0.06);
        }
        pad(N(c.arp[0]), at(0), d(16), 0.05);
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]]), at(i), d(0.8), (B ? 0.022 : 0.035) + 0.02 * k);
        if (sec >= 2 && !B) choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.05);
        if (sec === 3) { stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.4), 0.065)); for (let i = 0; i < 16; i += 2) robo(N(c.arp[RUNS[v][i]] + 12), at(i), d(1.2), 0.026, 0.25); }
        finale(X);
      } };
    }

    // 5. Sprocket unbound: the same tune at a run, the machine pulling his strings.
    {
      T.foundrySprocket2 = { bpm: 160, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = SPR[v][m], B = bd(X);
        drums(X, 'break', 'relent'); mach(X, c); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach((x, i) => bass(N(c.r + (i % 4 === 3 ? 12 : 0)), at(x), d(1.1), 0.16));
        for (const [x, n, len] of hookV(SPM[m], X)) {
          if (B) { piano(N(n), at(x), 0.11, 1.4); continue; }
          brass(N(n), at(x), d(len) * 0.95, 0.085); piano(N(n + 12), at(x), 0.06, 0.8);
          if (sec === 3) brass(N(n + 12), at(x), d(len) * 0.95, 0.07);
        }
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]]), at(i), d(0.75), (B ? 0.025 : 0.045) + 0.02 * k);
        if (!B) { for (let i = 0; i < 16; i += 2) robo(N(c.arp[RUNS[v][i]] + 12), at(i), d(1), 0.028, 0.125); stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.3), 0.06)); }
        if (sec >= 2 && !B) { choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.045); walk(PHRY, 53, S.bar * 29 + lap, 8, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.45), 0.028, 0.125)); }
        if (m === 7) siren(at(8), d(8), 0.02, 400, 1100);
        finale(X);
      } };
    }

    // 6. The foundry awakens: the final boss, phase 1. A hammered brass riff (a new shape every two bars) over relentless drums, pistons and motors.
    {
      const P = PG([[39, 0], [39, 0], [35, 1], [34, 1], [39, 0], [42, 1], [35, 1], [34, 1]], [[39, 0], [32, 1], [35, 1], [34, 1], [39, 0], [37, 1], [35, 1], [34, 1]], [[39, 0], [39, 0], [42, 1], [42, 1], [35, 0], [35, 0], [34, 1], [34, 1]]);
      const RIFFS = [[[0, 0], [3, 3], [6, 5], [8, 3], [11, 0], [14, -2]], [[0, 0], [2, 3], [4, 5], [8, 7], [10, 5], [14, 3]], [[0, 0], [3, 0], [6, 3], [8, 0], [11, 5], [14, 3]]];
      T.foundryF1 = { bpm: 160, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m], B = bd(X);
        drums(X, 'relent', 'break'); mach(X, c, true); hush(X, c);
        if (B) { for (let i = 0; i < 4; i++) piano(N(c.arp[(i * 2 + lap) % 5] + 12), at(i * 4), 0.1, 1.6); }
        else RIFFS[(v + (m >> 1)) % 3].forEach(([x, o]) => { brass(N(c.r + 24 + o), at(x), d(2), 0.085); brass(N(c.r + 12 + o), at(x), d(2), 0.06); });
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach(x => bass(N(c.r), at(x), d(1.2), 0.16));
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]] + 12), at(i), d(0.8), B ? 0.025 : 0.045);
        if (sec >= 1 && !B) for (let i = 0; i < 16; i += 2) robo(N(c.arp[((i >> 1) + lap) % 4] + 12), at(i), d(1.2), 0.03, 0.25);
        if (sec >= 2 && !B) { choir([N(c.arp[0] + 12), N(c.arp[2] + 12)], at(0), d(16), 0.05); walk(PHRY, 51, S.bar * 177 + lap, 8, 24, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.5), 0.028, 0.125)); }
        if (sec === 3) for (let i = 0; i < 8; i++) piano(N(c.arp[(i + lap) % 5] + 24), at(i * 2), 0.06, 1);
        finale(X);
      } };
    }

    // 7. Meltdown: the final boss, phase 2. Faster and harsher, an alarm whooping over a screaming tune.
    {
      const P = PG([[40, 0], [41, 1], [40, 0], [38, 1], [40, 0], [43, 1], [41, 1], [35, 1]], [[40, 0], [36, 1], [38, 1], [41, 1], [40, 0], [35, 1], [43, 1], [38, 1]], [[40, 0], [40, 0], [41, 1], [41, 1], [38, 1], [38, 1], [35, 1], [35, 1]]);
      const MEL = [[[0, 83, 2], [2, 86, 2], [4, 88, 4], [8, 86, 2], [10, 83, 2], [12, 81, 4]], [[0, 84, 2], [2, 81, 2], [4, 77, 4], [8, 81, 2], [10, 84, 2], [12, 89, 4]], [[0, 83, 2], [2, 86, 2], [4, 88, 4], [8, 88, 2], [10, 86, 2], [12, 83, 4]], [[0, 81, 2], [2, 86, 2], [4, 90, 4], [8, 86, 4], [12, 81, 4]],
        [[0, 88, 4], [4, 86, 2], [6, 83, 2], [8, 86, 4], [12, 83, 4]], [[0, 86, 2], [2, 83, 2], [4, 79, 4], [8, 83, 2], [10, 86, 2], [12, 91, 4]], [[0, 89, 4], [4, 84, 2], [6, 81, 2], [8, 84, 4], [12, 89, 4]], [[0, 87, 2], [2, 90, 2], [4, 83, 2], [6, 87, 2], [8, 90, 8]]];
      T.foundryF2 = { bpm: 188, bar(S) {
        const X = mk(S), { m, sec, lap, v, k, N, at, d } = X, c = P[v][m], B = bd(X);
        drums(X, 'relent', 'break'); mach(X, c, true); hush(X, c);
        if (B) bass(N(c.r), at(0), d(16), 0.15); else bassR(X).forEach((x, i) => bass(N(c.r + (i % 4 === 3 ? 12 : 0)), at(x), d(1), 0.16));
        if (m % 2 === 0) siren(at(0), d(8), (B ? 0.008 : 0.012) + 0.008 * k, 600, 1000);
        if (!B) for (let i = 0; i < 16; i++) robo(N(c.arp[(i * 3 + lap) % 5] + 12), at(i), d(0.4), 0.026, 0.125);
        if (!B) stabs(X).forEach(x => brass(N(c.r + 24), at(x), d(1.3), 0.06));
        tune(X, MEL, 0.07);
        for (let i = 0; i < 16; i++) strings(N(c.arp[RUNS[(v + sec) % 3][i]] + 12), at(i), d(0.7), B ? 0.025 : 0.045);
        if (sec >= 1 && !B) walk(PHRY, 52, S.bar * 211 + lap, 8, 26, c.tones).forEach((n, i) => lead(N(n), at(i), d(0.45), 0.03, 0.125));
        if (sec >= 2 && !B) choir([N(c.arp[0] + 12), N(c.arp[1] + 13), N(c.arp[3] + 12)], at(0), d(16), 0.05);
        finale(X);
      } };
    }
  }

  // ---- the sequencer ----
  function tick() {
    if (!setup()) return;
    if (pending !== cur) {
      fadeOut();
      cur = pending; bar = 0;
      if (cur) { newBus(); nextT = ac.currentTime + 0.35; }
    }
    if (!cur || !bus) return;
    const tr = T[cur], sl = 60 / tr.bpm / 4;
    while (nextT < ac.currentTime + 0.5) {
      const t0 = nextT;
      tr.bar({ bar, k: intensity, prox, pulse: t => beats.push(t), sl, at: s => t0 + s * sl, d: n => n * sl });
      nextT += sl * 16;
      bar++;
    }
  }

  return {
    has: id => !!T[id],
    play(id) { pending = id; if (!timer) timer = setInterval(tick, 80); },
    stop(slow) { pending = null; slowFade = !!slow; },
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); },
    setProximity(v) { prox = Math.max(0, Math.min(1, v)); },
    // 1 right on a heartbeat, fading to 0 over a third of a second (the hub throbs with it near the gates)
    pulse() {
      if (!ac) return 0;
      const now = ac.currentTime;
      while (beats.length && beats[0] < now - 1) beats.shift();
      let last = -1;
      for (const t of beats) if (t <= now) last = t;
      return last < 0 ? 0 : Math.max(0, 1 - (now - last) / 0.3);
    },
  };
})();
