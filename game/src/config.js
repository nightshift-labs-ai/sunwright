// Every tuning number in one place. Units: cells, seconds, quartz, and beam power
// (damage per second dealt to a beetle standing on a lit cell).

/**
 * Every player-facing name, in one table: the UI shows only these strings. Internal ids
 * (veerwing, titan, quartz, boon...) stay lower-case in code.
 */
export const NAMES = {
  game: 'SUNWRIGHT',
  fountain: 'SUN FOUNTAIN',
  fountainShort: 'FOUNTAIN',
  currency: 'QUARTZ',
  combo: 'SEAR',
  sun: 'SUN',
  suns: 'SUNS',
  charms: 'GLASS CHARMS',
  charmsShort: 'CHARMS',
  swarm: 'SWARM',
  flare: 'FLARE',
  goal: 'Hold the courtyard for 3 days - 9 suns',
  hook: 'THE SUN MOVES EVERY WAVE',
  piece: { mirror: 'MIRROR', splitter: 'SPLITTER', lens: 'LENS', pillar: 'PILLAR', prism: 'PRISM' },
  enemy: { scuttler: 'SCUTTLER', veerwing: 'VEERWING', shellback: 'SHELLBACK', glassback: 'GLASSBACK', titan: 'HORNBACK TITAN' },
  difficulty: { gentle: 'GENTLE', normal: 'NORMAL', scorched: 'SCORCHED' },
  phase: { morning: 'MORNING', noon: 'NOON', evening: 'EVENING' },
  charm: {
    silvered: 'Silvered Glass',
    burning: 'Burning Glass',
    flare2: 'Second Flare',
    magnet: 'Quartz Pull',
    discount: "Glasswright's Discount",
    sunstone: 'Sunstone',
    mend: 'Mend the Fountain',
    spreading: 'Spreading Burn',
    highsun: 'High Sun',
    longchain: 'Long Sear',
    grinder: 'Lens Grinder',
    trueprism: 'True Prism',
  },
};
export const RESULT_WIN_TITLE = 'COURTYARD HELD';
export const RESULT_LOSE_TITLE = 'THE SWARM BROKE THROUGH';

export const GAME_NAME = NAMES.game;
export const SIM_HZ = 60;
export const DT = 1 / SIM_HZ;

// Directions: 0 east (+x), 1 south (+y), 2 west (-x), 3 north (-y).
export const DX = [1, 0, -1, 0];
export const DY = [0, 1, 0, -1];

/** The courtyard: 13 x 9 cells, the Sun Fountain near the north wall, beetle burrows in the south wall. */
export const BOARD = {
  cols: 13,
  rows: 9,
  shrine: { c: 6, r: 2 },
  gates: [{ c: 2, r: 8 }, { c: 10, r: 8 }],
};

export const PIECES = {
  mirror: { name: NAMES.piece.mirror, cost: 3, blurb: 'Bounces light 90 degrees (-10% power)' },
  splitter: { name: NAMES.piece.splitter, cost: 5, blurb: 'Halves the beam: half passes, half bounces' },
  lens: { name: NAMES.piece.lens, cost: 7, blurb: 'x2.5 power for 3 cells, then the beam ends' },
  pillar: { name: NAMES.piece.pillar, cost: 1, blurb: 'Blocks beetles and light' },
  prism: { name: NAMES.piece.prism, cost: 8, blurb: 'Fans light: red burns, blue slows, gold pierces armour', unlockWave: 3 },
};
export const PIECE_ORDER = ['mirror', 'splitter', 'lens', 'pillar', 'prism'];

export const BEAM = {
  power: 10,
  bounceLoss: 0.1,
  lensMult: 2.5,
  lensReach: 3,
  maxLegs: 64,
  maxSteps: 480,
  flareMult: 2,
  flareSeconds: 3,
  prismShare: 0.6,
};
/** Prism light effects: red sets beetles burning, blue slows them, gold ignores armour and shells. */
export const TINT_EFFECTS = { burnDps: 4, burnSeconds: 3, slowFactor: 0.55, slowSeconds: 0.8 };

/** hp, speed in cells/s, armour = minimum beam power that hurts it, harm = fountain HP it costs. */
export const ENEMIES = {
  scuttler: { name: NAMES.enemy.scuttler, hp: 18, speed: 1.15, armour: 0, flies: false, harm: 1, quartz: 1, score: 20, size: 0.34 },
  veerwing: { name: NAMES.enemy.veerwing, hp: 11, speed: 1.45, armour: 0, flies: true, harm: 1, quartz: 1, score: 30, size: 0.3 },
  shellback: { name: NAMES.enemy.shellback, hp: 60, speed: 0.72, armour: 12, flies: false, harm: 2, quartz: 3, score: 60, size: 0.42 },
  glassback: { name: NAMES.enemy.glassback, hp: 40, speed: 0.95, armour: 0, flies: false, harm: 2, quartz: 2, score: 50, size: 0.4, blocksLight: true },
  titan: { name: NAMES.enemy.titan, hp: 1100, speed: 0.36, armour: 30, flies: false, harm: 5, quartz: 0, score: 1500, size: 0.62, boss: true },
};
/** The Hornback Titan's carapace opens (armour 0) for `open` seconds out of every `cycle`. */
export const TITAN_CARAPACE = { cycle: 6, open: 2.5 };

/** Veerwings steer this hard towards nearby light, and move at this fraction of their speed while lit. */
export const VEER_LURE = 1.4;
export const VEER_DAZZLE = 0.5;

/** The order enemies first appear in, used for the NEW tag in the draft preview. */
export const ENEMY_ORDER = ['scuttler', 'veerwing', 'shellback', 'glassback', 'titan'];

export const SUN_PHASES = [
  { id: 'morning', name: NAMES.phase.morning, wall: 'east', wallName: 'EAST' },
  { id: 'noon', name: NAMES.phase.noon, wall: 'north', wallName: 'NORTH' },
  { id: 'evening', name: NAMES.phase.evening, wall: 'west', wallName: 'WEST' },
];
export const DAYS = 3;
export const WAVE_COUNT = DAYS * SUN_PHASES.length;
/** Rows (east/west walls) and columns (north wall) a sun opening may use: never the shrine's or a burrow's line. */
export const OPENING_ROWS = [1, 3, 4, 5, 6, 7];
export const OPENING_COLS = [1, 3, 4, 5, 7, 8, 9, 11];

/**
 * Waves: each group is [enemy, count, gate (0, 1 or 2 = alternate), first spawn s, interval s].
 * Day 1 teaches one enemy per wave, day 2 opens the second burrow, day 3 ends with the Titan.
 */
export const WAVES = [
  [['scuttler', 8, 0, 1, 1.5]],
  [['scuttler', 10, 0, 1, 1.2], ['veerwing', 4, 0, 7, 2.2]],
  [['scuttler', 10, 0, 1, 1.1], ['shellback', 2, 0, 9, 7], ['veerwing', 3, 0, 14, 2]],
  [['scuttler', 14, 2, 1, 0.9], ['veerwing', 5, 1, 8, 1.8]],
  [['scuttler', 14, 2, 1, 0.8], ['shellback', 3, 2, 6, 5], ['veerwing', 6, 2, 12, 1.4]],
  [['scuttler', 18, 2, 1, 0.7], ['glassback', 3, 2, 3, 4], ['shellback', 3, 2, 6, 4.5], ['veerwing', 6, 2, 10, 1.3]],
  [['scuttler', 20, 2, 1, 0.6], ['glassback', 4, 2, 4, 3.5], ['veerwing', 10, 2, 5, 1.1], ['shellback', 4, 2, 9, 4]],
  [['scuttler', 22, 2, 1, 0.55], ['shellback', 6, 2, 3, 3.5], ['glassback', 4, 2, 6, 3], ['veerwing', 8, 2, 12, 1]],
  [['titan', 1, 0, 2, 1], ['scuttler', 24, 2, 3, 0.8], ['glassback', 4, 2, 6, 4], ['shellback', 5, 1, 8, 5], ['veerwing', 10, 2, 14, 1.2]],
];

export const DIFFICULTIES = {
  gentle: { name: NAMES.difficulty.gentle, hpMul: 0.6, countMul: 0.8, startQuartz: 20 },
  normal: { name: NAMES.difficulty.normal, hpMul: 1, countMul: 1, startQuartz: 14 },
  scorched: { name: NAMES.difficulty.scorched, hpMul: 1.45, countMul: 1.2, startQuartz: 11 },
};
export const DIFFICULTY_ORDER = ['gentle', 'normal', 'scorched'];
/** The Sun Fountain always holds 10 HP; the run is lost when it runs dry. */
export const FOUNTAIN_MAX = 10;

export const ECONOMY = { waveQuartz: 5, waveQuartzPerWave: 1, rerollCost: 3, oldPieceRefund: 0.5 };
export const SCORING = { perShrineHp: 50, waveClear: 100, chainWindow: 1, chainMaxMult: 5 };
export const FLARE_CHARGES = 1;

/** Glass charms (internally boons) offered in the draft. weight: how often it shows; repeat: may be taken again. */
export const BOONS = [
  { id: 'silvered', name: NAMES.charm.silvered, text: 'Mirrors lose no power', weight: 2, hue: 205 },
  { id: 'burning', name: NAMES.charm.burning, text: 'Lens focus reaches +2 cells', weight: 3, hue: 22 },
  { id: 'flare2', name: NAMES.charm.flare2, text: '+1 Flare charge every sun', weight: 3, hue: 48 },
  { id: 'magnet', name: NAMES.charm.magnet, text: 'Every beetle drops +1 quartz', weight: 3, hue: 280 },
  { id: 'discount', name: NAMES.charm.discount, text: 'Mirrors and splitters cost 1 less', weight: 3, hue: 160 },
  { id: 'sunstone', name: NAMES.charm.sunstone, text: 'Fountain heals 1 HP after every sun', weight: 2, hue: 140 },
  { id: 'mend', name: NAMES.charm.mend, text: 'Heal the fountain 4 HP', weight: 3, hue: 120, repeat: true },
  { id: 'spreading', name: NAMES.charm.spreading, text: 'Burned beetles scorch their neighbours', weight: 2, hue: 8 },
  { id: 'highsun', name: NAMES.charm.highsun, text: 'Every beam +20% power', weight: 2, hue: 52 },
  { id: 'longchain', name: NAMES.charm.longchain, text: 'SEAR window 1 s -> 1.6 s', weight: 2, hue: 330 },
  { id: 'grinder', name: NAMES.charm.grinder, text: 'Lenses focus x3.2 instead of x2.5', weight: 2, hue: 190 },
  { id: 'trueprism', name: NAMES.charm.trueprism, text: 'Prism branches keep 75% power', weight: 2, hue: 300 },
];
export const SPREAD_BURN = { radius: 1.1, damage: 12 };
