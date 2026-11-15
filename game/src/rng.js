// Seeded random numbers (mulberry32). The state lives in a plain object so a run can be copied.

export function createRng(seed) {
  return { state: seed >>> 0 };
}

/** A float in [0, 1). */
export function nextRandom(rng) {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randomInt(rng, n) {
  return Math.floor(nextRandom(rng) * n);
}

/** Pick one item with probability proportional to weightOf(item). */
export function pickWeighted(rng, items, weightOf) {
  let total = 0;
  for (const item of items) total += weightOf(item);
  let roll = nextRandom(rng) * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/** A fresh 6-digit run seed from a non-seeded source (only used when starting a new run). */
export function freshSeed() {
  return 100000 + Math.floor(Math.random() * 900000);
}
