'use strict';

// Tiny synthesized sound effects. No audio files needed.
const Sfx = (() => {
  let ac = null;
  let master = null;
  let sfx = null;                  // sound effects share the master volume but sit below the music
  let vol = typeof Settings !== 'undefined' ? Settings.volume : 0.6;

  function unlock() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain();
      master.gain.value = 0.3 * vol;
      master.connect(ac.destination);
      sfx = ac.createGain();
      sfx.gain.value = 0.45;
      sfx.connect(master);
    } catch (e) { ac = null; }
  }

  function tone(freq, dur, type = 'square', slide = 0, vol = 1, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 1, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g); g.connect(sfx);
    s.start(t);
  }

  const sounds = {
    jump: () => tone(300, 0.12, 'square', 260, 0.5),
    djump: () => tone(420, 0.14, 'triangle', 380, 0.6),
    land: () => noise(0.05, 0.3),
    slash: () => { noise(0.08, 0.5); tone(520, 0.07, 'sawtooth', -300, 0.25); },
    hit: () => { noise(0.07, 0.7); tone(160, 0.08, 'square', -90, 0.5); },
    dash: () => { noise(0.14, 0.45); tone(260, 0.14, 'sawtooth', -150, 0.2); },
    heal: () => { tone(520, 0.12, 'triangle', 0, 0.5); tone(780, 0.2, 'triangle', 0, 0.5, 0.1); },
    bolt: () => { tone(190, 0.3, 'sawtooth', 30, 0.28); tone(198, 0.3, 'sawtooth', 30, 0.28); tone(380, 0.25, 'square', 40, 0.1); noise(0.1, 0.15); },
    menu: () => tone(620, 0.04, 'square', 0, 0.3),
    confirm: () => { tone(520, 0.06, 'square', 0, 0.4); tone(780, 0.09, 'square', 0, 0.4, 0.05); },
    cancel: () => tone(300, 0.08, 'square', -80, 0.35),
    buy: () => { tone(660, 0.07, 'square', 0, 0.4); tone(880, 0.07, 'square', 0, 0.4, 0.07); tone(1170, 0.14, 'square', 0, 0.4, 0.14); },
    deny: () => { tone(150, 0.12, 'square', -30, 0.5); tone(120, 0.16, 'square', -30, 0.5, 0.1); },
    talk: () => tone(240 + Math.random() * 60, 0.03, 'square', 0, 0.18),
    gate: () => { tone(110, 0.8, 'sawtooth', 220, 0.5); noise(0.6, 0.3); },
    hurt: () => { noise(0.14, 0.7); tone(130, 0.2, 'sawtooth', -70, 0.55); },
    soul: () => { tone(880, 0.09, 'sine', 500, 0.4); tone(1320, 0.12, 'sine', 300, 0.3, 0.06); },
    kill: () => { noise(0.18, 0.6); tone(200, 0.2, 'square', -120, 0.4); },
    chain: () => { noise(0.06, 0.5); tone(1800, 0.05, 'square', -600, 0.25); tone(900, 0.08, 'square', -300, 0.2, 0.05); },
    horn: () => { tone(98, 1.4, 'sawtooth', -20, 0.5); tone(147, 1.4, 'sawtooth', -30, 0.35); },
    // boss fights
    roar: () => { tone(110, 0.7, 'sawtooth', -50, 0.5); tone(82, 0.7, 'square', -30, 0.3, 0.05); noise(0.5, 0.35); },
    growl: () => { tone(90, 0.35, 'sawtooth', -25, 0.4); noise(0.25, 0.25); },
    slam: () => { tone(80, 0.3, 'sine', -50, 0.9); noise(0.22, 0.6); },
    splash: () => { noise(0.25, 0.5); tone(220, 0.15, 'sine', -120, 0.3); },
    sink: () => { tone(140, 1.6, 'sine', -90, 0.5); noise(1.2, 0.2); },
    toll: () => { tone(196, 1.4, 'sine', -6, 0.7); tone(392, 1.0, 'sine', -10, 0.35); tone(588, 0.8, 'triangle', -10, 0.2); },
    coins: () => { for (let i = 0; i < 6; i++) tone(1200 + i * 130, 0.08, 'square', 0, 0.3, i * 0.05); },
    flap: () => { noise(0.1, 0.4); tone(180, 0.1, 'triangle', -60, 0.25); },
    whoosh: () => { noise(0.2, 0.35); tone(300, 0.2, 'sawtooth', -200, 0.15); },
    warn: () => { tone(740, 0.12, 'square', 0, 0.35); tone(740, 0.12, 'square', 0, 0.35, 0.16); },
  };

  function setVolume(v) {
    vol = v;
    if (master) master.gain.value = 0.3 * v;
  }

  return {
    unlock, setVolume,
    play: name => { if (sounds[name]) sounds[name](); },
    ctx: () => ac,          // the music module shares this audio context and volume
    out: () => master,
  };
})();
