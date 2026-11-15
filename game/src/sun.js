// The moving sun: which wall the light enters through each wave (morning east, noon north,
// evening west), the seeded spot on that wall for each day, and which way shadows fall.
import { BOARD, OPENING_COLS, OPENING_ROWS, SUN_PHASES } from './config.js';
import { createRng, randomInt } from './rng.js';

/** Day number (1-3) and sun phase of a wave (0-based index). */
export function sunPhaseFor(waveIndex) {
  return { day: Math.floor(waveIndex / SUN_PHASES.length) + 1, phase: SUN_PHASES[waveIndex % SUN_PHASES.length] };
}

/** The three opening spots for one day of one seed: an east row, a north column, a west row. */
function openingSpotsForDay(seed, day) {
  const rng = createRng((Math.imul(seed, 2654435761) ^ Math.imul(day, 40503)) >>> 0);
  const eastRow = OPENING_ROWS[randomInt(rng, OPENING_ROWS.length)];
  const northCol = OPENING_COLS[randomInt(rng, OPENING_COLS.length)];
  const westChoices = OPENING_ROWS.filter((r) => r !== eastRow);
  const westRow = westChoices[randomInt(rng, westChoices.length)];
  return { eastRow, northCol, westRow };
}

/**
 * Where sunlight enters for a wave: the first board cell it lights, the direction it travels,
 * and the point on the wall (in cell units) the beam is drawn from.
 */
export function sunApertureFor(seed, waveIndex) {
  const { day, phase } = sunPhaseFor(waveIndex);
  const spots = openingSpotsForDay(seed, day);
  const { cols } = BOARD;
  if (phase.wall === 'east') return { day, phase, wall: 'east', c: cols - 1, r: spots.eastRow, dir: 2, x: cols + 0.45, y: spots.eastRow + 0.5 };
  if (phase.wall === 'north') return { day, phase, wall: 'north', c: spots.northCol, r: 0, dir: 1, x: spots.northCol + 0.5, y: -0.45 };
  return { day, phase, wall: 'west', c: 0, r: spots.westRow, dir: 0, x: -0.45, y: spots.westRow + 0.5 };
}

/** Unit-ish vector shadows are cast along (away from the sun), in screen space. */
export function shadowVectorFor(wall) {
  if (wall === 'east') return { x: -0.9, y: 0.45 };
  if (wall === 'north') return { x: 0.15, y: 1 };
  return { x: 0.9, y: 0.45 };
}
