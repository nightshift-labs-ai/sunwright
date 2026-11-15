// Wave makeup: turn the WAVES table into a timed spawn list for one wave and difficulty,
// plus the roster shown in the INCOMING panel and the draft's next-wave preview.
import { ENEMY_ORDER, WAVES } from './config.js';

/** Sorted spawns [{ t, type, gate }] for a wave (0-based). */
export function buildWaveSchedule(waveIndex, diff) {
  const spawns = [];
  for (const [type, count, gate, first, interval] of WAVES[waveIndex]) {
    const n = type === 'matriarch' ? count : Math.max(1, Math.round(count * diff.countMul));
    const gap = interval * (count / n);
    for (let k = 0; k < n; k++) spawns.push({ t: first + k * gap, type, gate: gate === 2 ? k % 2 : gate });
  }
  spawns.sort((a, b) => a.t - b.t || ENEMY_ORDER.indexOf(a.type) - ENEMY_ORDER.indexOf(b.type));
  return spawns;
}

/** [{ type, count, isNew }] for a wave, in first-appearance order. */
export function waveRoster(waveIndex, diff) {
  const counts = new Map();
  for (const s of buildWaveSchedule(waveIndex, diff)) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  return ENEMY_ORDER.filter((t) => counts.has(t)).map((type) => ({ type, count: counts.get(type), isNew: firstWaveOf(type) === waveIndex }));
}

/** The first wave an enemy type appears in. */
export function firstWaveOf(type) {
  return WAVES.findIndex((groups) => groups.some((g) => g[0] === type));
}

export function waveSize(waveIndex, diff) {
  return buildWaveSchedule(waveIndex, diff).length;
}
