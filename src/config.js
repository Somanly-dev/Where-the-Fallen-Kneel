'use strict';

// Everything you are likely to tweak lives here: keys, physics, shop stock, trials, lore.

const W = 480, H = 270;          // internal pixel resolution (scaled up by CSS)
const GROUND_Y = 216;
const WORLD_W = 1900;

// ---- Key bindings (KeyboardEvent.code values). Change them here and nowhere else. ----
const KEYS = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',        // also: look up / up-slash
  down: 'ArrowDown',    // also: down-slash (pogo) / drop through platforms
  jump: 'KeyD',
  attack: 'KeyS',
  heal: 'KeyA',         // hold
  dash: 'KeyF',
  special: 'KeyW',      // second ability slot
  interact: 'ArrowUp',  // talk, shop, enter gates
  confirm2: 'Enter',    // extra menu keys
  cancel2: 'Escape',
};

const KEY_NAMES = {
  ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN',
  Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC',
};
const keyName = code => KEY_NAMES[code] || code.replace(/^Key|^Digit/, '');

// ---- Player feel ----
const PHYS = {
  gravity: 1300, fallMult: 1.25, maxFall: 470,      // falling is a little heavier than rising
  run: 108,
  groundAccel: 750, groundDecel: 1300, groundTurn: 1700,   // speed up gently, stop and turn quickly
  airAccel: 600, airDecel: 450, airTurn: 900,
  jumpV: 456, jumpCut: 0.45, doubleJumpV: 380,             // jumpV 456 at gravity 1300 is an 80px jump
  coyote: 0.09, buffer: 0.11,
  dashSpeed: 285, dashTime: 0.16, dashCooldown: 0.4,
  pogo: 300,
  attackScale: 1.2,                                  // the sword reaches and covers this much more than the shop numbers say
  healTime: 0.85, healCost: 3, boltCost: 2, boltCooldown: 0.35,
  maxHp: 5, maxEnergy: 6,
};

// ---- Shop stock ----
// stats are 1..5 pips for display only; dmg/reach/h/cd/active drive the real thing.
const WEAPONS = [
  { id: 'rusted_blade', name: 'Rusted Blade', price: 0, dmg: 2, reach: 26, h: 22, cd: 0.30, active: 0.14, color: '#dfe6ff',
    stats: { dmg: 2, reach: 2, speed: 3 }, desc: 'Pitted and dull, but it has never failed you. Yet.' },
  { id: 'twin_daggers', name: 'Twin Daggers', price: 120, kind: 'dagger', dmg: 1, reach: 18, h: 16, cd: 0.17, active: 0.09, color: '#9ff0d0',
    stats: { dmg: 1, reach: 1, speed: 5 }, desc: 'Barely arm length. Strike so fast the enemy forgets to strike back.' },
  { id: 'vigil_spear', name: 'Vigil Spear', price: 200, kind: 'spear', dmg: 2, reach: 42, h: 10, cd: 0.38, active: 0.14, color: '#f0e6a0',
    stats: { dmg: 2, reach: 4, speed: 2 }, desc: 'A long, thin reach. Keeps the danger at the far end of the shaft.' },
  { id: 'gravehammer', name: 'Gravehammer', price: 320, kind: 'hammer', dmg: 6, reach: 28, h: 30, cd: 0.65, active: 0.16, color: '#ffb070',
    stats: { dmg: 5, reach: 2, speed: 1 }, desc: 'Slow as a funeral march and twice as final.' },
  { id: 'ember_scythe', name: 'Ember Scythe', price: 450, kind: 'scythe', dmg: 4, reach: 34, h: 32, cd: 0.50, active: 0.16, color: '#ff6a8a',
    stats: { dmg: 4, reach: 3, speed: 2 }, desc: 'A wide, burning arc that reaps everything in front of you.' },
  // the second shelf: opens when The Pits are cleared
  { id: 'sergeant_cleaver', name: 'Sergeant Cleaver', price: 400, after: 'pits', kind: 'cleaver', dmg: 7, reach: 34, h: 40, cd: 0.85, active: 0.2, color: '#ff7a30',
    stats: { dmg: 5, reach: 3, speed: 1 }, desc: "Cut from the sergeant's own weapon. Slow as grief, and it ends fights." },
  { id: 'brothers_chain', name: 'Brothers Chain', price: 550, after: 'pits', kind: 'chain', dmg: 2, reach: 64, h: 12, cd: 0.5, active: 0.18, color: '#7f77dd',
    stats: { dmg: 2, reach: 5, speed: 2 }, desc: 'Still warm from the brothers. Fight from where nothing can reach you.' },
  { id: 'bell_flail', name: 'Bell Flail', price: 650, after: 'pits', kind: 'flail', both: true, dmg: 3, reach: 30, h: 26, cd: 0.55, active: 0.18, color: '#e8b868',
    stats: { dmg: 3, reach: 2, speed: 3 }, desc: 'The bell that rang every fight. Now it rings behind you too.' },
  { id: 'kneelbreaker', name: 'Kneelbreaker', price: 800, after: 'pits', kind: 'spear', fancy: true, dmg: 5, reach: 56, h: 13, cd: 0.42, active: 0.16, color: '#7fffd4',
    stats: { dmg: 4, reach: 5, speed: 3 }, desc: 'Taken from the last champion. Long, quick, and nobody kneels twice.' },
  // the third shelf: one weapon, when the Trial of the Bugs is cleared
  { id: 'royal_guard_cleaver', name: 'Royal Guard Cleaver', short: 'Royal Guard', price: 900, after: 'hive', kind: 'cleaver', fancy: true, dmg: 8, reach: 39, h: 45, cd: 0.80, active: 0.2, color: '#ffc83c',
    stats: { dmg: 5, reach: 4, speed: 1 }, desc: "Struck from the queen's own guard. Heavy, regal, and it has never been refused." },
];
const SHELF_TWO = WEAPONS.filter(w => w.after);
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Focus (heal) is part of the knight from the start, so it is not sold here.
const ABILITIES = [
  { id: 'dash', name: 'Shadow Dash', price: 100, key: 'dash',
    desc: 'A short burst of speed. Once per airtime.' },
  { id: 'doublejump', name: 'Wraith Wings', price: 250, key: 'jump',
    desc: 'Jump again in mid-air.' },
  { id: 'bolt', name: 'Bee Bolt', price: 300, key: 'special', after: 'hive',            // sold only once the Trial of the Bugs is cleared
    desc: 'Send a bee after your foe. Costs 2 energy.' },
];

// ---- Trials (one gate each in the hub) ----
const TRIALS = [
  { id: 'pits', name: 'The Pits', theme: 'Failed conversions', bosses: 8, color: '#c0405a' },
  { id: 'hive', name: 'Trial of the Bugs', theme: 'A taken insect people', bosses: 10, color: '#e0a830' },
  { id: 'foundry', name: 'The Foundry', theme: 'Rebuilt machine-makers', bosses: 10, color: '#3fc7d9' },
  { id: 'pantheon', name: 'The Pantheon', theme: 'Twisted temple guardians', bosses: 12, color: '#b58cf0' },
];

// The three looks offered when you start a new game. Cosmetic only: same hitbox and stats.
// M/Ms mask and shade, H horn tips, C/Cs cloak and shade, T trim, E eye glint, N blade.
const LOOKS = [
  { kind: 'moss', name: 'Moss', tag: 'Quiet roots',
    M: '#cdd9bc', Ms: '#8ea284', H: '#8fd06a', C: '#2f6b4f', Cs: '#1b4331', T: '#b4e078', E: '#c8f090', N: '#dcebc8' },
  { kind: 'dusk', name: 'Dusk', tag: 'Edge of night',
    M: '#d9d0ee', Ms: '#9a8cbc', H: '#c89aff', C: '#4a3a86', Cs: '#2a1f52', T: '#f2d46a', E: '#ffe9a0', N: '#e8dcff' },
  { kind: 'cinder', name: 'Cinder', tag: 'Ember in the ash',
    M: '#cbc6be', Ms: '#8a857e', H: '#ff6a2a', C: '#2a2a32', Cs: '#141419', T: '#ff7a30', E: '#ff9a50', N: '#d8d4cc' },
];

// The knight's own people. These are the models that were not chosen for the player, plus two new ones
// (earth and rose). They are only used for villagers.
const VILLAGER_LOOKS = {
  pale:   { kind: 'pale',   M: '#ece8dc', Ms: '#b4afa0', H: '#ece8dc', C: '#2c3058', Cs: '#171a38', T: '#6a72b8', E: '#9fb0ff', N: '#d4dcec' },
  ember:  { kind: 'ember',  M: '#f2e2c6', Ms: '#c4a67c', H: '#ff9a3c', C: '#a83432', Cs: '#6a1c20', T: '#ff9a3c', E: '#ffb060', N: '#ffd9a8' },
  frost:  { kind: 'frost',  M: '#e4f2f8', Ms: '#9fbfd0', H: '#9fe8ff', C: '#3f6f9a', Cs: '#264866', T: '#bfeaff', E: '#bff6ff', N: '#e6f6ff' },
  gilded: { kind: 'gilded', M: '#f6e7a8', Ms: '#cfae5a', H: '#ffd24a', C: '#ebe7dc', Cs: '#b9b4a4', T: '#d8a63a', E: '#fff1b0', N: '#ffe27a' },
  earth:  { kind: 'earth',  M: '#e8d8b8', Ms: '#b09a70', H: '#c89050', C: '#6a5238', Cs: '#3e2e20', T: '#f2d46a', E: '#ffe9a0', N: '#d8c8a8' },
  rose:   { kind: 'rose',   M: '#f0dce0', Ms: '#c4a0aa', H: '#e8a0b4', C: '#8a4a62', Cs: '#52283c', T: '#f4b8c8', E: '#ffd0dc', N: '#f0e0e4' },
};

// ---- Lore ----
const PRISONERS = [
  { name: 'Old Brannoch', color: '#c8ccd8',
    lines: [
      'I held the northern gate for forty years. The soldiers took it in a single night.',
      'They do not kill you at first. They feed you to the Pits, to see what is left of you.',
      'Bank your coins when you can. Greed has buried more of us than any beast.',
    ],
    again: ['Still here. Still counting the stones.', 'Bank early, lad.'],
    // after The Pits are cleared
    won: [
      'You came back out of the Pits. I have watched a hundred go in. You are the first I have seen walk out of the far side.',
      'I knew the sergeant. He held the east wall beside me, before they cut him open and sent him to the sand.',
      'The crowd has gone quiet. The soldiers do not know what to do with a quiet pit. Keep it that way, lad.',
    ],
    wonAgain: ['The Pits are still. I keep listening for the bell.', 'You gave the sergeant his rest. More than the rest of us managed.'] },
  { name: 'Mirrel', color: '#e0c890',
    lines: [
      'The Hive was my people. They took our queens first, then the rest of us.',
      'What crawls the Hive now hums with our voices. I hear them through the walls.',
      'Do not hate them. They are not themselves. Just be quick.',
    ],
    again: ['Bzzz... no. Nothing. Just the walls.', 'They are listening.'],
    tip: { needs: 'doublejump', lines: ['One more thing. The way up is all ledges. Buy Wraith Wings from the peddler before you go, or you will not reach them.'] },
    // after the Trial of the Bugs is cleared
    won: [
      'The humming in the walls is softer. I felt it in my bones, a long breath let out.',
      'You were gentle with what was left of them. I heard it through the stone.',
      'Thank you. For all of us who cannot say it with a voice.',
    ],
    wonAgain: ['Quiet now. Only the walls, and they are only walls.', 'Bzzz... no. Only me.'] },
  { name: 'UNIT-7', color: '#ff8080',
    lines: [
      'ERROR: purpose not found. Assigning temporary purpose: warn the newly captured.',
      'The Foundry made machines. The soldiers rebuilt the engineers into more of them.',
      'Recommendation: buy Shadow Dash first. Survival odds improve by 31 percent.',
    ],
    again: ['Recommendation stands.', 'Purpose: still temporary.'],
    // after The Foundry is cleared
    won: [
      'TRIAL LOG: The Foundry cleared. Survival odds recalculated: unexpected.',
      'The engineers have been decommissioned. Their purpose is concluded. I envy them. Unknown variable detected.',
      'New temporary purpose assigned: congratulate the captive. Congratulations.',
    ],
    wonAgain: ['Purpose: still temporary. Mood: improved. Odds: classified.', 'Recommendation: rest.'] },
  { name: 'The Nameless', color: '#e8d8ff',
    lines: [
      'I served in a temple. The gods did not answer when the soldiers came.',
      'The Pantheon beasts were my congregation. They wear our altar gold like chains.',
      'The soldiers pay coin for survivors. Press on if you must. Few return.',
    ],
    again: ['The thread is thin. Walk carefully.', 'You have been here before. Or will be.'],
    // after The Pantheon is cleared
    won: [
      'The temple is silent. For the first time the gods do not speak over my thoughts.',
      'The guardians were my congregation. You did what I could not. You let them stop.',
      'The thread I called thin has held. Walk gently where you tread now.',
    ],
    wonAgain: ['The altar is cold. It is a good cold.', 'You have been here before. I know now you will not be back for long.'] },
];

// Spoken when the knight arrives in the hub for the first time, after the capture.
const INTRO_LINES = [
  { name: 'UNIT-7', color: '#ff8080', text: 'New arrival logged. Condition: burned. Survival odds: low.' },
  { name: 'Mirrel', color: '#e0c890', text: 'Shh... the guards listen at the bars. Speak softly.' },
  { name: 'Old Brannoch', color: '#c8ccd8', text: 'Welcome to the Antechamber, lad. We are the Kept: the ones they have not thrown to the beasts. Yet.' },
  { name: 'Old Brannoch', color: '#c8ccd8', text: 'The soldiers raid a village, take whoever they can use, and make sport of us in the arena. They bet on who falls first.' },
  { name: 'The Nameless', color: '#e8d8ff', text: 'The beasts out there were people once. Taken, cut, stitched and broken, one whole people at a time.' },
  { name: 'Old Brannoch', color: '#c8ccd8', text: 'The smith and the peddler sell what you need. Gather what you can, then choose a gate. And lad, do not look away from what they were.' },
];

const SMITH_QUOTES = [
  'Steel does not care who swings it. Pick one that suits your arm.',
  'Heavier hits harder. Lighter hits more. Nobody hits both.',
  'Every blade here has killed something. Most deserved it.',
];
// Hobb, once The Pits are cleared
const SMITH_HIVE_LINE = 'The hive fell silent, and the queen left her guard behind. I hammered it into a cleaver. It is the best thing I have ever made.';
const SMITH_NEW_LINE = 'Heard the pit went quiet. I forged a few things from what was left on the sand. Take a look.';
const SMITH_WON_QUOTES = [
  'Pit steel is a different animal. Mind your fingers.',
  'The sergeant\'s cleaver was too good to leave in the mud.',
  'Hear that bell? Nobody rings it anymore. Take it.',
];
// the peddler, once the Trial of the Bugs is cleared
const PEDDLER_NEW_LINE = 'The queen is dead and her bees are loose. I can teach you to send one after your enemies. It is not cheap.';
const PEDDLER_QUOTES = [
  'Skills are not found. They are borrowed from better fighters.',
  'Pay first. The dead are poor customers.',
  'Take what you can carry. Leave what you cannot afford.',
];
