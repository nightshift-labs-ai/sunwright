// The between-wave draft: offer three different boons (weighted, owned ones removed unless
// repeatable), reroll for shards, and apply the chosen boon to the run.
import { BOONS, ECONOMY } from './config.js';
import { pickWeighted } from './rng.js';

export function boonById(id) {
  return BOONS.find((b) => b.id === id);
}

/** Three distinct boon ids the run may take. */
export function offerBoons(run) {
  const pool = BOONS.filter((b) => b.repeat || !run.boons.includes(b.id));
  const offer = [];
  while (offer.length < 3 && pool.length) {
    const pick = pickWeighted(run.rng, pool, (b) => b.weight);
    offer.push(pick.id);
    pool.splice(pool.indexOf(pick), 1);
  }
  return offer;
}

export function rerollCost(run) {
  return ECONOMY.rerollCost + run.rerolls;
}

/** Spend shards for a new offer; false if the run cannot afford it. */
export function rerollOffer(run) {
  const cost = rerollCost(run);
  if (run.shards < cost) return false;
  run.shards -= cost;
  run.rerolls++;
  run.offer = offerBoons(run);
  return true;
}

export function applyBoon(run, id) {
  run.boons.push(id);
  if (id === 'sunstone') {
    run.shrineMax += 2;
    run.shrineHp = Math.min(run.shrineMax, run.shrineHp + 2);
  } else if (id === 'mend') {
    run.shrineHp = Math.min(run.shrineMax, run.shrineHp + 4);
  }
}
