'use strict';

// Generated music, no audio files. Slow, sparse and dark.
//   village : warm and sad. A low pad and a few lonely notes, with an echo.
//   invasion: a heartbeat, a brass-like swell on each bar, minor-second tension in the chords.
//             It speeds up and brightens as the fire grows (setIntensity 0..1).
//   capture : the pad and a slow pulse, fading to silence.
// It waits for the first key press, because browsers keep audio off until then.

const Music = (() => {
  const MUSIC_GAIN = 1.3;                                  // the music sits above the sound effects
  const BUILD_SECONDS = 75;                                // how long the title track takes to reach its full pulse
  const HZ = n => 440 * Math.pow(2, (n - 69) / 12);          // MIDI note number to frequency

  const MOODS = {
    village:  { bpm: 52, roots: [38, 34, 31, 33], scale: [62, 65, 67, 69, 72, 70], drone: 0.10, cut: 260, level: 0.5 },
    invasion: { bpm: 66, roots: [38, 39, 34, 33], scale: [50, 53, 56, 57, 62, 51], drone: 0.17, cut: 330, level: 0.62 },
    // candidate themes for the Antechamber (not wired into the hub yet)
  vigil:    { bpm: 46, roots: [38, 34, 41, 36], scale: [62, 64, 65, 67, 69, 72], drone: 0.07, cut: 220, level: 0.5 },
  stone:    { bpm: 40, roots: [38, 38, 37, 38], scale: [], drone: 0.13, cut: 150, level: 0.55 },
  lullaby:  { bpm: 50, roots: [38, 34, 31, 33], scale: [], drone: 0.06, cut: 240, level: 0.5 },
  waiting:  { bpm: 56, roots: [38, 37, 34, 33], scale: [], drone: 0.09, cut: 200, level: 0.5 },
  // candidate title screen tracks (not wired in yet)
  march:    { bpm: 48, roots: [38, 38, 34, 33], scale: [], drone: 0.10, cut: 220, level: 0.52 },
  choir:    { bpm: 42, roots: [38, 34, 41, 36], scale: [], drone: 0.05, cut: 200, level: 0.5 },
  whispers: { bpm: 50, roots: [38, 38, 37, 38], scale: [74, 77, 81, 72], drone: 0.10, cut: 170, level: 0.5 },
  lament:   { bpm: 54, roots: [38, 33, 34, 31], scale: [], drone: 0.07, cut: 230, level: 0.5 },
  capture:  { bpm: 44, roots: [38, 34, 38, 33], scale: [50, 53], drone: 0.14, cut: 220, level: 0.45 },
  };

  let ac = null, bus = null, echo = null, noise = null;
  let moodStart = 0;                                       // when the current mood began, for tracks that build over time
  const buildAt = t => Math.min(1, 0.06 + Math.max(0, t - moodStart) / BUILD_SECONDS * 0.94);
  let prox = 0;                                            // 0..1, how close the knight is to the trial gates
  const pulses = [];                                       // times of recent heartbeats, so the screen can pulse with them
  let want = null, cur = null, intensity = 0, beat = 0, nextT = 0, timer = null, drone = null;

  function setup() {
    if (ac) return true;
    ac = Sfx.ctx();
    if (!ac) return false;
    bus = ac.createGain(); bus.gain.value = 0; bus.connect(Sfx.out());
    echo = ac.createGain(); echo.gain.value = 0.55;
    const delay = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
    delay.delayTime.value = 0.46; fb.gain.value = 0.42; lp.type = 'lowpass'; lp.frequency.value = 1300;
    echo.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(bus);
    const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
    return true;
  }

  function startDrone(m) {
    const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = m.cut; f.Q.value = 2; g.gain.value = m.drone;
    const oscs = [['sawtooth', 0], ['sawtooth', 8], ['triangle', 0]].map(([type, det]) => {
      const o = ac.createOscillator();
      o.type = type; o.detune.value = det; o.frequency.value = HZ(m.roots[0]);
      o.connect(f); o.start();
      return o;
    });
    f.connect(g); g.connect(bus);
    drone = { oscs, f };
  }

  function switchTo(mood) {
    const now = ac.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0, now, 0.25);
    if (drone) { drone.oscs.forEach(o => o.stop(now + 1.4)); drone = null; }
    cur = mood; beat = 0; nextT = now + 0.6; moodStart = now + 0.6;
    if (!mood) return;
    startDrone(MOODS[mood]);
    bus.gain.setTargetAtTime(MOODS[mood].level * MUSIC_GAIN, now + 0.6, 0.6);
    if (mood === 'capture') bus.gain.setTargetAtTime(0, now + 9, 2.5);     // fades away
  }

  function pluck(freq, t, dur, vol, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); g.connect(echo);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function thump(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.22);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.4);
  }

  function swell(midi, t, vol) {                         // a brass-like note that rises slowly
    const f = ac.createBiquadFilter(), g = ac.createGain();
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 1.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 1.0);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    f.connect(g); g.connect(bus); g.connect(echo);
    [0, 9].forEach(det => {
      const o = ac.createOscillator();
      o.type = 'sawtooth'; o.detune.value = det; o.frequency.value = HZ(midi);
      o.connect(f); o.start(t); o.stop(t + 3.4);
    });
  }

  function riser(t, len, vol = 0.06) {                               // a rush of wind that builds
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(1500, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t); s.stop(t + len + 0.1);
  }

  function shaker(t, vol) {                                // a dry, shaker-like tick
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 5500;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 1.5); s.stop(t + 0.05);
  }

  function rim(t, vol) {                                   // a woody click
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = 1700;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.06);
  }

  function tom(t, vol, f0) {                               // a low drum, softer than the heartbeat
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + 0.2);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.34);
  }

  function bassPulse(freq, t, vol) {                       // a short, muted note that keeps the pulse moving
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = 240;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(f); f.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.25);
  }

  function bell(freq, t, dur, vol) {                       // a soft struck bell: two sine partials that ring out
    [[1, 1], [2.76, 0.35]].forEach(([mul, amp]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur / mul);
      o.connect(g); g.connect(bus); g.connect(echo);
      o.start(t); o.stop(t + dur + 0.05);
    });
  }

  function drip(t) {                                       // a drop of water somewhere far off
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 1800 + Math.random() * 1200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g); g.connect(echo); g.connect(bus);
    o.start(t); o.stop(t + 0.12);
  }

  // A heartbeat with a mid-range body. The low thump alone is mostly sub-bass, which small speakers drop.
  function thud(t, vol) {
    thump(t, vol);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    g.gain.setValueAtTime(vol * 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 0.2);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), ng = ac.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = 220; f.Q.value = 1.2;
    ng.gain.setValueAtTime(vol * 0.6, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(f); f.connect(ng); ng.connect(bus);
    s.start(t, Math.random()); s.stop(t + 0.1);
  }

  function chainRattle(t, vol) {                           // a few soft links clinking together
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.05 + Math.random() * 0.02, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = 1500 + Math.random() * 900;
      g.gain.setValueAtTime(vol, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
      o.connect(g); g.connect(bus); g.connect(echo);
      o.start(tt); o.stop(tt + 0.08);
    }
  }

  // Voices in the distance: each note is two soft, slightly detuned tones that swell in and fade out slowly.
  function choirChord(t, midis, dur, vol) {
    midis.forEach((n, i) => {
      [-6, 6].forEach(det => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = i % 2 ? 'triangle' : 'sine'; o.detune.value = det; o.frequency.value = HZ(n);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus); g.connect(echo);
        o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }

  function whisper(t, len, vol) {                          // a breath of cold air, like someone whispering nearby
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; s.loop = true;
    f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(900 + Math.random() * 500, t); f.frequency.linearRampToValueAtTime(1100 + Math.random() * 700, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + len * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(bus); g.connect(echo);
    s.start(t, Math.random()); s.stop(t + len + 0.1);
  }

  const MARCH = [62, null, 65, 64, 62, null, 60, null, 62, 65, 69, 67, 65, 64, 62, null];   // a note every two beats
  const CHOIR = [[50, 57, 62, 65], [46, 53, 58, 62], [53, 57, 60, 65], [48, 55, 60, 64]];
  const ARP = [24, 31, 36, 39, 36, 31, 27, 34];                                              // above the chord root

  const LULLABY = [74, 77, 81, 79, 77, 76, 74, null, 72, 74, 77, 76, 74, 72, 70, null];   // one note a beat, two bars of eight

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const beatLen = () => 60 / (cur === 'whispers' ? MOODS.whispers.bpm + 14 * buildAt(nextT) : cur === 'invasion' ? MOODS.invasion.bpm + 30 * Math.min(intensity, 0.85) : MOODS[cur].bpm);

  function scheduleBeat(b, t) {
    const m = MOODS[cur], step = b % 4, root = m.roots[Math.floor(b / 4) % m.roots.length];
    if (step === 0 && drone) {
      drone.oscs.forEach(o => o.frequency.setTargetAtTime(HZ(root), t, 0.7));
      drone.f.frequency.setTargetAtTime(m.cut + intensity * 520, t, 0.8);
    }
    if (cur === 'village') {
      if (step % 2 === 0 && Math.random() < 0.75) pluck(HZ(pick(m.scale)), t, 2.4, 0.11, 'triangle');
      if (step === 0) pluck(HZ(root + 24), t, 3.2, 0.045, 'sine');
    } else if (cur === 'invasion') {
      const k = Math.min(0.85, intensity), half = beatLen() / 2;       // k grows as the village burns
      thump(t, 0.55);
      if (step % 2 === 1) thump(t + beatLen() * 0.28, 0.3);
      if (step === 0) swell(root + 12, t, 0.07);
      if (step === 2 && Math.random() < 0.85) pluck(HZ(pick(m.scale)), t, 2.8, 0.12, 'triangle');
      if (b % 8 === 7) riser(t, beatLen() * 2);
      // percussion: steady ticks, a click on beats 2 and 4, low toms that fill in as the fire spreads
      shaker(t, 0.03 + 0.03 * k); shaker(t + half, 0.045 + 0.04 * k);
      if (step % 2 === 1) rim(t, 0.04 + 0.03 * k);
      if (step === 1 || step === 3) tom(t + half, 0.22 + 0.18 * k, 150);
      if (k > 0.35 && step === 2) tom(t, 0.2 + 0.15 * k, 130);
      if (k > 0.6 && step === 0) tom(t + half, 0.2, 110);
      if (k > 0.2) { bassPulse(HZ(root), t, 0.05 + 0.05 * k); bassPulse(HZ(root), t + half, 0.04 + 0.04 * k); }
    } else if (cur === 'vigil') {
      // lantern light: a soft chord and the odd bell, with a long echo
      if (step === 0) { pluck(HZ(root + 24), t, 4, 0.035, 'sine'); pluck(HZ(root + 27), t, 4, 0.03, 'sine'); }
      if (step % 2 === 0 && Math.random() < 0.65) bell(HZ(pick(m.scale)), t, 3.2, 0.1);
    } else if (cur === 'stone') {
      // cold stone: almost no melody, only a low rumble, far-off water and wind
      if (Math.random() < 0.18) drip(t + Math.random() * beatLen());
      if (b % 12 === 6) riser(t, beatLen() * 5, 0.03);
      if (step === 0 && b % 8 === 0) swell(root + 12, t, 0.04);
    } else if (cur === 'lullaby') {
      // someone humming a slow tune from a cell
      const n = LULLABY[b % LULLABY.length];
      if (n) pluck(HZ(n), t, 2.2, 0.1, 'triangle');
      if (step === 0) pluck(HZ(root + 24), t, 3.5, 0.04, 'sine');
      // near the trial gates: the chained beasts. Hearts that never quite keep time, and chains.
      if (prox > 0.005) {
        // prox runs 0 to 1 from the training dummy to the gates. The pulse is at full presence almost at once,
        // then gets louder the whole way.
        const q = prox, bl = beatLen(), ent = Math.min(1, q / 0.06), g = ent * (1 + 1.2 * q);
        thud(t, 0.39 * g); pulses.push(t);
        if (step % 2 === 1) thud(t + bl * 0.37, 0.25 * g);
        if (q > 0.35 && step === 2) thud(t + bl * 0.71, 0.2 * g);
        if (q > 0.2 && Math.random() < 0.1 + 0.4 * q) chainRattle(t + Math.random() * bl, 0.05 * g);
        if (q > 0.7 && step === 0 && b % 4 === 0) swell(root, t, 0.07 + 0.05 * q);
      }
    } else if (cur === 'waiting') {
      // a quiet clock, and a low bell tolling now and then
      rim(t, 0.018);
      if (b % 8 === 0) bell(HZ(root + 12), t, 4.5, 0.14);
      if (b % 16 === 8) swell(root, t, 0.05);
    } else if (cur === 'march') {
      // a slow funeral march: a muffled drum on beats 1 and 3, and a mournful horn line
      if (step % 2 === 0) thump(t, 0.4);
      const n = MARCH[Math.floor(b / 2) % MARCH.length];
      if (step % 2 === 0 && n) swell(n, t, 0.05);
      if (step === 0) swell(root + 12, t, 0.04);
    } else if (cur === 'choir') {
      // distant voices: slow chords that swell and overlap, and a bell now and then
      if (step === 0) choirChord(t, CHOIR[Math.floor(b / 4) % CHOIR.length], beatLen() * 4.4, 0.045);
      if (b % 16 === 8) bell(HZ(root + 24), t, 5, 0.09);
    } else if (cur === 'whispers') {
      // cold cell air, a lone music-box tune, and a pulse that builds the longer you stay
      const bd = buildAt(t), bl = beatLen(), half = bl / 2;
      if (Math.random() < 0.25) whisper(t + Math.random() * bl * 2, bl * 3, 0.035);
      if (step % 2 === 0 && Math.random() < 0.55) bell(HZ(pick(m.scale)), t, 3, 0.09);
      if (step === 0 && b % 8 === 0) swell(root + 12, t, 0.035);
      thud(t, 0.14 + 0.5 * bd); pulses.push(t);                          // a heartbeat on every beat
      if (step % 2 === 1 && bd > 0.15) thud(t + bl * 0.37, 0.08 + 0.34 * bd);      // a second one out of step
      if (bd > 0.3 && step === 2) thud(t + bl * 0.71, 0.25 * bd);
      if (bd > 0.4) { shaker(t, 0.02 + 0.03 * bd); shaker(t + half, 0.03 + 0.04 * bd); }
      if (bd > 0.5 && (step === 1 || step === 3)) tom(t + half, 0.2 + 0.2 * bd, 140);
      if (bd > 0.55) { bassPulse(HZ(root), t, 0.04 + 0.05 * bd); bassPulse(HZ(root), t + half, 0.03 + 0.04 * bd); }
      if (bd > 0.35 && Math.random() < 0.15 + 0.3 * bd) chainRattle(t + Math.random() * bl, 0.03 + 0.03 * bd);
      if (bd > 0.7 && step % 2 === 1) rim(t, 0.03 + 0.03 * bd);
      if (bd > 0.75 && step === 0 && b % 4 === 0) swell(root, t, 0.05 + 0.04 * bd);
    } else if (cur === 'lament') {
      // a slow, harp-like arpeggio that never quite resolves, with far-off chains
      pluck(HZ(root + ARP[b % ARP.length]), t, 2.2, 0.085, 'triangle');
      if (step === 0) pluck(HZ(root + 12), t, 3.5, 0.05, 'sine');
      if (Math.random() < 0.08) chainRattle(t + Math.random() * beatLen(), 0.025);
    } else if (cur === 'capture') {
      if (step % 2 === 0) thump(t, 0.4);
      if (step === 0) swell(root + 12, t, 0.06);
    }
  }

  function tick() {
    if (!setup()) return;
    if (want !== cur) switchTo(want);
    if (!cur) return;
    while (nextT < ac.currentTime + 0.35) { scheduleBeat(beat, nextT); nextT += beatLen(); beat++; }
  }

  return {
    play(mood) {
      if (typeof Score !== 'undefined' && Score.has(mood)) {       // a composed track: music.js falls silent
        want = null;
        Score.play(mood);
      } else {
        if (typeof Score !== 'undefined') Score.stop();
        want = mood;
      }
      if (!timer) timer = setInterval(tick, 100);
    },
    setIntensity(v) { intensity = Math.max(0, Math.min(1, v)); if (typeof Score !== 'undefined') Score.setIntensity(v); },
    // Let a composed track die away slowly (the pits fall silent when a boss sinks).
    fade() { want = null; if (typeof Score !== 'undefined') Score.stop(true); },
    // How far the pulse has built, 0 to 1. Only the title track builds.
    build() { return cur === 'whispers' && ac ? buildAt(ac.currentTime) : 0; },
    skip(seconds) { moodStart -= seconds; },                            // for the preview page: jump ahead in the build
    setProximity(v) { prox = Math.max(0, Math.min(1, v)); if (typeof Score !== 'undefined') Score.setProximity(v); },
    // 1 right on a heartbeat, fading to 0 over a third of a second. The hub uses it to shake the screen a little.
    pulse() {
      const sp = typeof Score !== 'undefined' ? Score.pulse() : 0;
      if (!ac) return sp;
      const now = ac.currentTime;
      while (pulses.length && pulses[0] < now - 1) pulses.shift();
      let last = -1;
      for (const t of pulses) if (t <= now) last = t;
      return Math.max(sp, last < 0 ? 0 : Math.max(0, 1 - (now - last) / 0.3));
    },
  };
})();
