// Every tuning number in one place. Units: cells, seconds, shards, and beam power
// (damage per second dealt to a beetle standing on a lit cell).

export const GAME_NAME = 'SUNWRIGHT';
export const SIM_HZ = 60;
export const DT = 1 / SIM_HZ;

// Directions: 0 east (+x), 1 south (+y), 2 west (-x), 3 north (-y).
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];

/** The courtyard: 13 x 9 cells, the Sunseed shrine near the north wall, beetle burrows in the south wall. */
export const BOARD = {
  cols: 13,
  rows: 9,
  shrine: { c: 6, r: 2 },
  gates: [{ c: 2, r: 8 }, { c: 10, r: 8 }],
};

export const PIECES = {
  mirror: { name: 'Mirror', cost: 3, blurb: 'Bounces light 90 degrees (-10% power)' },
  splitter: { name: 'Splitter', cost: 5, blurb: 'Half the light passes, half bounces' },
  lens: { name: 'Lens', cost: 7, blurb: 'x2.5 power for 3 cells, then the beam ends' },
  pillar: { name: 'Pillar', cost: 1, blurb: 'Blocks beetles and light' },
};
export const PIECE_ORDER = ['mirror', 'splitter', 'lens', 'pillar'];

export const BEAM = {
  power: 10,
  bounceLoss: 0.1,
  lensMult: 2.5,
  lensReach: 3,
  maxLegs: 64,
  maxSteps: 480,
  flareMult: 2,
  flareSeconds: 3,
};

/** hp, speed in cells/s, armour = minimum beam power that hurts it, harm = Sunseed HP it costs. */
export const ENEMIES = {
  scuttler: { name: 'Scuttler', hp: 18, speed: 1.15, armour: 0, flies: false, harm: 1, shards: 1, score: 20, size: 0.34 },
  lampmoth: { name: 'Lampmoth', hp: 11, speed: 1.45, armour: 0, flies: true, harm: 1, shards: 1, score: 30, size: 0.3 },
  shellback: { name: 'Shellback', hp: 60, speed: 0.72, armour: 12, flies: false, harm: 2, shards: 3, score: 60, size: 0.42 },
  matriarch: { name: 'Umbral Matriarch', hp: 1100, speed: 0.36, armour: 30, flies: false, harm: 5, shards: 0, score: 1500, size: 0.62, boss: true },
};
/** The Matriarch's carapace opens (armour 0) for `open` seconds out of every `cycle`. */
export const MATRIARCH_CARAPACE = { cycle: 6, open: 2.5 };

/** Lampmoths steer this hard towards nearby light, and move at this fraction of their speed while lit. */
export const MOTH_LURE = 1.4;
export const MOTH_DAZZLE = 0.5;

/** The order enemies first appear in, used for the NEW tag in the draft preview. */
export const ENEMY_ORDER = ['scuttler', 'lampmoth', 'shellback', 'matriarch'];

export const SUN_PHASES = [
  { id: 'dawn', name: 'DAWN', wall: 'east', wallName: 'EAST' },
  { id: 'noon', name: 'NOON', wall: 'north', wallName: 'NORTH' },
  { id: 'dusk', name: 'DUSK', wall: 'west', wallName: 'WEST' },
];
export const DAYS = 3;
export const WAVE_COUNT = DAYS * SUN_PHASES.length;
/** Rows (east/west walls) and columns (north wall) a sun opening may use: never the shrine's or a burrow's line. */
export const OPENING_ROWS = [1, 3, 4, 5, 6, 7];
export const OPENING_COLS = [1, 3, 4, 5, 7, 8, 9, 11];

/**
 * Waves: each group is [enemy, count, gate (0, 1 or 2 = alternate), first spawn s, interval s].
 * Day 1 teaches one enemy per wave, day 2 opens the second burrow, day 3 brings the Matriarch.
 */
export const WAVES = [
  [['scuttler', 8, 0, 1, 1.5]],
  [['scuttler', 10, 0, 1, 1.2], ['lampmoth', 4, 0, 7, 2.2]],
  [['scuttler', 10, 0, 1, 1.1], ['shellback', 2, 0, 9, 7], ['lampmoth', 3, 0, 14, 2]],
  [['scuttler', 14, 2, 1, 0.9], ['lampmoth', 5, 1, 8, 1.8]],
  [['scuttler', 14, 2, 1, 0.8], ['shellback', 3, 2, 6, 5], ['lampmoth', 6, 2, 12, 1.4]],
  [['scuttler', 18, 2, 1, 0.7], ['shellback', 4, 2, 4, 4.5], ['lampmoth', 6, 2, 10, 1.3]],
  [['scuttler', 20, 2, 1, 0.6], ['lampmoth', 10, 2, 5, 1.1], ['shellback', 4, 2, 9, 4]],
  [['scuttler', 22, 2, 1, 0.55], ['shellback', 6, 2, 3, 3.5], ['lampmoth', 8, 2, 12, 1]],
  [['matriarch', 1, 0, 2, 1], ['scuttler', 24, 2, 3, 0.8], ['shellback', 5, 1, 8, 5], ['lampmoth', 10, 2, 14, 1.2]],
];

export const DIFFICULTIES = {
  gentle: { name: 'Gentle', hpMul: 0.8, countMul: 0.85, startShards: 16, shrineHp: 12 },
  keeper: { name: 'Keeper', hpMul: 1, countMul: 1, startShards: 14, shrineHp: 10 },
  scorched: { name: 'Scorched', hpMul: 1.3, countMul: 1.2, startShards: 10, shrineHp: 8 },
};
export const DIFFICULTY_ORDER = ['gentle', 'keeper', 'scorched'];

export const ECONOMY = { waveShards: 5, waveShardsPerWave: 1, rerollCost: 3, oldPieceRefund: 0.5 };
export const SCORING = { perShrineHp: 50, waveClear: 100, chainWindow: 1, chainMaxMult: 5 };
export const FLARE_CHARGES = 1;

/** Boons offered in the draft. weight: how often it shows; repeat: may be taken more than once. */
export const BOONS = [
  { id: 'silvered', name: 'Silvered Glass', text: 'Mirrors lose no power', weight: 2, hue: 205 },
  { id: 'burning', name: 'Burning Glass', text: 'Lens focus reaches +2 cells', weight: 3, hue: 22 },
  { id: 'flare2', name: 'Second Flare', text: '+1 Flare charge every wave', weight: 3, hue: 48 },
  { id: 'magnet', name: 'Shard Magnet', text: 'Every beetle drops +1 shard', weight: 3, hue: 280 },
  { id: 'discount', name: "Glasswright's Discount", text: 'Mirrors and splitters cost 1 less', weight: 3, hue: 160 },
  { id: 'sunstone', name: 'Sunstone', text: 'Sunseed +2 max HP and heal 2', weight: 2, hue: 140 },
  { id: 'mend', name: 'Mend the Seed', text: 'Heal the Sunseed 4 HP', weight: 3, hue: 120, repeat: true },
  { id: 'kindling', name: 'Kindling', text: 'Beetles burned to death scorch their neighbours', weight: 2, hue: 8 },
  { id: 'highsun', name: 'High Sun', text: 'Every beam +20% power', weight: 2, hue: 52 },
  { id: 'longchain', name: 'Long Chain', text: 'CHAIN window 1 s -> 1.6 s', weight: 2, hue: 330 },
];
export const KINDLING = { radius: 1.1, damage: 12 };
