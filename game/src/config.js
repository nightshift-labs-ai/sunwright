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
    discount: 'Glass Discount',
    sunstone: 'Sunstone',
    mend: 'Mend the Fountain',
    spreading: 'Spreading Burn',
    highsun: 'High Sun',
    longchain: 'Long Sear',
    grinder: 'Lens Grinder',
    trueprism: 'True Prism',
  },
  /** Charm names for tight rows (results YOUR BUILD): `Mend x2`. */
  charmShort: {
    silvered: 'Silvered', burning: 'Burning', flare2: '2nd Flare', magnet: 'Quartz Pull', discount: 'Discount', sunstone: 'Sunstone',
    mend: 'Mend', spreading: 'Spreading', highsun: 'High Sun', longchain: 'Long Sear', grinder: 'Grinder', trueprism: 'True Prism',
  },
};
export const RESULT_WIN_TITLE = 'THE TITAN IS ASH';
export const RESULT_LOSE_TITLE = 'THE SWARM BROKE THROUGH';

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
  mirror: { name: NAMES.piece.mirror, cost: 3, blurb: 'Bounces light 90 degrees (-10% power)', short: 'turns light 90 degrees' },
  splitter: { name: NAMES.piece.splitter, cost: 5, blurb: 'Halves the beam: half passes, half bounces', short: 'halves the beam' },
  lens: { name: NAMES.piece.lens, cost: 7, blurb: 'x2.5 power for 3 cells, then the beam ends', short: 'focuses x2.5 for 3 cells' },
  pillar: { name: NAMES.piece.pillar, cost: 1, blurb: 'Blocks beetles and light', short: 'blocks beetles and light' },
  prism: { name: NAMES.piece.prism, cost: 8, blurb: 'Fans light: red burns, blue slows, gold pierces armour', short: 'splits burn, slow, pierce', unlockWave: 3 },
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
  scuttler: { name: NAMES.enemy.scuttler, hp: 18, speed: 1.15, armour: 0, flies: false, harm: 1, quartz: 1, score: 20, size: 0.4 },
  veerwing: { name: NAMES.enemy.veerwing, hp: 11, speed: 1.45, armour: 0, flies: true, harm: 1, quartz: 1, score: 30, size: 0.36 },
  shellback: { name: NAMES.enemy.shellback, hp: 60, speed: 0.72, armour: 12, flies: false, harm: 2, quartz: 3, score: 60, size: 0.47 },
  glassback: { name: NAMES.enemy.glassback, hp: 40, speed: 0.95, armour: 0, flies: false, harm: 2, quartz: 2, score: 50, size: 0.45, blocksLight: true },
  titan: { name: NAMES.enemy.titan, hp: 1100, speed: 0.36, armour: 30, flies: false, harm: 5, quartz: 0, score: 1500, size: 0.85, boss: true },
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
  [['scuttler', 18, 2, 1, 0.65], ['shellback', 3, 2, 5, 4], ['veerwing', 7, 2, 6, 1]],
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
/** A won run's rank: the best tier whose score, fountain left and Titan burn time it all meets (else C). */
export const RANK_THRESHOLDS = [
  { rank: 'S', score: 40000, fountain: 9, titanSeconds: 25 },
  { rank: 'A', score: 30000, fountain: 6, titanSeconds: 40 },
  { rank: 'B', score: 18000, fountain: 3, titanSeconds: 60 },
];
export const FLARE_CHARGES = 1;

/** What each glass charm changes, in numbers: the sim reads these, and so does every charm line. */
export const CHARM_FX = {
  burning: { lensReach: 2 },
  flare2: { charges: 1 },
  magnet: { quartz: 1 },
  discount: { cost: 1 },
  sunstone: { heal: 1 },
  mend: { heal: 4 },
  highsun: { power: 1.2 },
  longchain: { window: 1.6 },
  grinder: { lensMult: 3.2 },
  trueprism: { prismShare: 0.75 },
};
const pct = (x) => `${Math.round(x * 100)}%`;
/**
 * Glass charms (internally boons) offered in the draft. text: the full sentence; line: the one-line
 * effect under its draft roundel. weight: how often it shows; repeat: may be taken again.
 */
export const BOONS = [
  { id: 'silvered', name: NAMES.charm.silvered, text: 'Mirrors lose no power', line: 'Mirrors: no loss', weight: 2, hue: 205 },
  { id: 'burning', name: NAMES.charm.burning, text: `Lens focus reaches +${CHARM_FX.burning.lensReach} cells`, line: `Lens reach +${CHARM_FX.burning.lensReach}`, weight: 3, hue: 22 },
  { id: 'flare2', name: NAMES.charm.flare2, text: `+${CHARM_FX.flare2.charges} Flare charge every sun`, line: `+${CHARM_FX.flare2.charges} Flare every sun`, weight: 3, hue: 48 },
  { id: 'magnet', name: NAMES.charm.magnet, text: `Every beetle drops +${CHARM_FX.magnet.quartz} quartz`, line: `+${CHARM_FX.magnet.quartz} quartz a kill`, weight: 3, hue: 280 },
  { id: 'discount', name: NAMES.charm.discount, text: `Mirrors and splitters cost ${CHARM_FX.discount.cost} less`, line: `Mirror, Splitter -${CHARM_FX.discount.cost}`, weight: 3, hue: 160 },
  { id: 'sunstone', name: NAMES.charm.sunstone, text: `Fountain heals ${CHARM_FX.sunstone.heal} HP after every sun`, line: `Fountain +${CHARM_FX.sunstone.heal} a sun`, weight: 2, hue: 140 },
  { id: 'mend', name: NAMES.charm.mend, text: `Heal the fountain ${CHARM_FX.mend.heal} HP`, line: `Fountain +${CHARM_FX.mend.heal} now`, weight: 3, hue: 120, repeat: true },
  { id: 'spreading', name: NAMES.charm.spreading, text: 'Burned beetles scorch their neighbours', line: 'Kills burn nearby', weight: 2, hue: 8 },
  { id: 'highsun', name: NAMES.charm.highsun, text: `Every beam +${pct(CHARM_FX.highsun.power - 1)} power`, line: `Beams +${pct(CHARM_FX.highsun.power - 1)} power`, weight: 2, hue: 52 },
  { id: 'longchain', name: NAMES.charm.longchain, text: `SEAR window ${SCORING.chainWindow}s -> ${CHARM_FX.longchain.window}s`, line: `SEAR ${SCORING.chainWindow}s -> ${CHARM_FX.longchain.window}s`, weight: 2, hue: 330 },
  { id: 'grinder', name: NAMES.charm.grinder, text: `Lenses focus x${CHARM_FX.grinder.lensMult} instead of x${BEAM.lensMult}`, line: `Lens x${BEAM.lensMult} -> x${CHARM_FX.grinder.lensMult}`, weight: 2, hue: 190 },
  { id: 'trueprism', name: NAMES.charm.trueprism, text: `Prism branches keep ${pct(CHARM_FX.trueprism.prismShare)} power`, line: `Prism ${pct(BEAM.prismShare)} -> ${pct(CHARM_FX.trueprism.prismShare)}`, weight: 2, hue: 300 },
];
export const SPREAD_BURN = { radius: 1.1, damage: 12 };
/** Charm pairs that work well together (a draft roundel names its partner when you own it). */
export const SYNERGY = {
  silvered: 'highsun', highsun: 'silvered', burning: 'grinder', grinder: 'burning', spreading: 'trueprism',
  trueprism: 'spreading', flare2: 'highsun', magnet: 'discount', discount: 'magnet', sunstone: 'mend',
  mend: 'sunstone', longchain: 'spreading',
};

/** The game's scope in one line, counted from the tables above (title screen and index.html note). */
export const SCOPE_LINE = `${PIECE_ORDER.length} glass - ${ENEMY_ORDER.filter((t) => !ENEMIES[t].boss).length} beetles + the Titan - ${WAVE_COUNT} suns - ${BOONS.length} charms - ${DIFFICULTY_ORDER.length} difficulties`;
