// The between-wave draft: offer three different boons (weighted, owned ones removed unless
// repeatable), reroll for quartz, and apply the chosen boon to the run.
import { BOONS, CHARM_FX, ECONOMY } from './config.js';
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

/** Spend quartz for a new offer; false if the run cannot afford it. */
export function rerollOffer(run) {
  const cost = rerollCost(run);
  if (run.quartz < cost) return false;
  run.quartz -= cost;
  run.rerolls++;
  run.offer = offerBoons(run);
  run.stats.offersSeen += run.offer.length;
  for (const id of run.offer) if (!run.met.charms.includes(id)) run.met.charms.push(id);
  return true;
}

export function applyBoon(run, id) {
  run.boons.push(id);
  if (id === 'mend') {
    run.shrineHp = Math.min(run.shrineMax, run.shrineHp + CHARM_FX.mend.heal);
  }
}
