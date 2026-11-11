'use strict';

// Three save files. Each lives in its own storage key; Save.data is whichever file is active.
const SAVE_PREFIX = 'cc_bossgame_save_v3_slot';
// Saves from before the look screen. They are deleted on load.
const OLD_SAVE_KEYS = ['cc_bossgame_save_v1', 'cc_bossgame_save_v2_slot1', 'cc_bossgame_save_v2_slot2', 'cc_bossgame_save_v2_slot3'];
const SETTINGS_KEY = 'cc_bossgame_settings_v1';
const SLOT_COUNT = 3;

// Storage with an in-memory fallback, so the game still runs when the browser blocks it.
// Every write also goes to a second copy in IndexedDB. At start-up (restore) anything missing from one is filled in from the other,
// and the browser is asked to keep this site's storage ("persistent"), so it is not cleared when the browser is short of space.
const Store = (() => {
  const mem = {};
  let db = null;
  const kv = (mode) => db.transaction('kv', mode).objectStore('kv');
  const openDb = () => new Promise(res => {
    try {
      const r = indexedDB.open('cc_bossgame', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => { db = r.result; res(true); };
      r.onerror = r.onblocked = () => res(false);
    } catch (e) { res(false); }
  });
  const mine = k => k.startsWith('cc_bossgame_');
  return {
    get(k) { try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* blocked */ } return k in mem ? mem[k] : null; },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* blocked */ } if (db) try { kv('readwrite').put(v, k); } catch (e) { /* keep going */ } },
    remove(k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* blocked */ } if (db) try { kv('readwrite').delete(k); } catch (e) { /* keep going */ } },
    // call once before the game starts; resolves when the two copies agree
    async restore() {
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* not supported */ }
      if (!await openDb()) return;
      try {
        const store = kv('readonly');
        const keys = await new Promise(r => { const q = store.getAllKeys(); q.onsuccess = () => r(q.result); q.onerror = () => r([]); });
        const vals = await new Promise(r => { const q = store.getAll(); q.onsuccess = () => r(q.result); q.onerror = () => r([]); });
        const inDb = {}; keys.forEach((k, i) => { inDb[k] = vals[i]; });
        for (const k of keys) { if (mine(k) && localStorage.getItem(k) === null) localStorage.setItem(k, inDb[k]); }       // lost from localStorage: bring it back
        for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (mine(k) && !(k in inDb)) kv('readwrite').put(localStorage.getItem(k), k); }      // not yet copied
      } catch (e) { /* the game still works from localStorage alone */ }
    },
  };
})();

const Save = {
  slot: null,          // 1..SLOT_COUNT once a file is started
  data: null,

  defaults() {
    return {
      coins: 0,
      weapons: ['rusted_blade'],
      equipped: 'rusted_blade',
      abilities: ['focus'],   // the knight can heal from the start
      best: {},        // trial id -> best boss streak
      talked: {},      // prisoner index -> true once heard the full story
      played: 0,       // seconds
      look: 0,         // index into LOOKS
      tutorialDone: false,
      cleared: {},     // trial id -> true once its last boss has fallen (unlocks the next trial)
      bonusEnergy: 0,  // extra energy slots won from trials
      bonusHp: 0,      // extra health won from trials
      deaths: {},      // "trial:boss" -> times you fell to it (for an achievement)
      entries: {},     // trial id -> times you walked in (for an achievement)
    };
  },

  // The saved data for a file, or null when the file is empty.
  peek(n) {
    const raw = Store.get(SAVE_PREFIX + n);
    if (!raw) return null;
    try {
      const saved = JSON.parse(raw);
      if (!('tutorialDone' in saved)) saved.tutorialDone = true;     // files from before the tutorial skip it
      const d = Object.assign(this.defaults(), saved);
      if (!d.abilities.includes('focus')) d.abilities.push('focus');
      return d;
    } catch (e) { return null; }
  },

  // Begin playing a file, creating it if it is empty.
  start(n) {
    this.slot = n;
    this.data = this.peek(n) || this.defaults();
    this.write();
  },

  write() {
    if (this.slot == null) return;
    Store.set(SAVE_PREFIX + this.slot, JSON.stringify(this.data));
  },

  erase(n) {
    Store.remove(SAVE_PREFIX + n);
    if (this.slot === n) { this.slot = null; this.data = this.defaults(); }
  },

  // Wipe the active file's progress (test key).
  reset() {
    this.data = this.defaults();
    this.write();
  },

  // Delete saves from earlier versions of the game.
  purgeOld() { OLD_SAVE_KEYS.forEach(k => Store.remove(k)); },
};

const Settings = {
  volume: 0.6,
  devTools: false,          // the dev keys (invincibility, hitboxes, hub cheats) only work when this is on
  load() {
    try {
      const raw = Store.get(SETTINGS_KEY);
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { /* keep defaults */ }
    this.devTools = this.devTools === true;
  },
  write() { Store.set(SETTINGS_KEY, JSON.stringify({ volume: this.volume, devTools: this.devTools })); },
};

Save.data = Save.defaults();
Save.purgeOld();
Settings.load();
