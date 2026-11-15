// Wave makeup: turn the WAVES table into a timed spawn list for one wave and difficulty,
// plus the roster shown in the INCOMING panel and the draft's next-wave preview.
import { ENEMY_ORDER, WAVES } from './config.js';

/** Sorted spawns [{ t, type, gate }] for a wave (0-based). */
export function buildWaveSchedule(waveIndex, diff) {
  const spawns = [];
  for (const [type, count, gate, first, interval] of WAVES[waveIndex]) {
    const n = type === 'titan' ? count : Math.max(1, Math.round(count * diff.countMul));
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

/** What the next sun adds over this one, from the wave tables: first-ever kinds, then the biggest rises. */
export function nextSunPreview(waveIndex, diff, nameOf) {
  if (waveIndex + 1 >= WAVES.length) return '';
  const now = new Map(waveRoster(waveIndex, diff).map((r) => [r.type, r.count]));
  const changes = waveRoster(waveIndex + 1, diff)
    .map((r) => ({ type: r.type, isNew: firstWaveOf(r.type) === waveIndex + 1, more: r.count - (now.get(r.type) ?? 0) }))
    .filter((c) => c.isNew || c.more > 0)
    .sort((a, b) => b.isNew - a.isNew || b.more - a.more)
    .slice(0, 2)
    .map((c) => (c.isNew ? `NEW ${nameOf(c.type)}` : `+${c.more} ${nameOf(c.type)}`));
  return changes.length ? `NEXT SUN: ${changes.join(', ')}` : '';
}

export function waveSize(waveIndex, diff) {
  return buildWaveSchedule(waveIndex, diff).length;
}
