// Burning and scoring: beam damage per tick with armour thresholds, the Flare, the CHAIN
// multiplier for quick successive kills, shard drops, and beetles biting the Sunseed.
import { BEAM, KINDLING, SCORING, TINT_EFFECTS } from './config.js';
import { TINT_BLUE, TINT_GOLD, TINT_RED } from './beams.js';
import { armourOf, enemyCell, reachedShrine } from './enemies.js';

export function flareMultiplier(run) {
  return run.flareLeft > 0 ? BEAM.flareMult : 1;
}

export function chainWindow(run) {
  return run.boons.includes('longchain') ? 1.6 : SCORING.chainWindow;
}

export function chainMultiplier(count) {
  return Math.max(1, Math.min(SCORING.chainMaxMult, count));
}

/**
 * Every beetle on a lit cell loses (cell power x Flare) hp per second unless its armour is
 * higher; gold prism light ignores armour, red sets it burning, blue slows it.
 */
export function applyBeamDamage(run, dt) {
  const { lit, tints } = run.trace;
  const mult = flareMultiplier(run);
  for (const e of run.enemies) {
    const i = enemyCell(run, e);
    const power = i === null ? 0 : lit[i] * mult;
    const tint = i === null ? 0 : tints[i];
    e.litPower = power;
    e.shielded = power > 0 && power < armourOf(e) && !(tint & TINT_GOLD);
    if (power > 0 && !e.shielded) e.hp -= power * dt;
    if (power > 0 && tint & TINT_RED) e.burn = TINT_EFFECTS.burnSeconds;
    if (power > 0 && tint & TINT_BLUE) e.slow = TINT_EFFECTS.slowSeconds;
    if (e.burn > 0) {
      e.burn -= dt;
      e.hp -= TINT_EFFECTS.burnDps * dt;
    }
    if (e.slow > 0) e.slow -= dt;
  }
}

function registerKill(run, e) {
  const chain = run.chain;
  chain.count = chain.timer > 0 ? chain.count + 1 : 1;
  chain.timer = chainWindow(run);
  chain.best = Math.max(chain.best, chain.count);
  const mult = chainMultiplier(chain.count);
  const points = e.def.score * mult;
  const shards = e.def.shards + (run.boons.includes('magnet') ? 1 : 0);
  run.score += points;
  run.shards += shards;
  run.stats.kills++;
  run.events.push({ t: run.time, type: 'kill', x: e.x, y: e.y, enemy: e.type, points, chain: chain.count, mult, shards, boss: !!e.def.boss });
  if (run.boons.includes('kindling') && (e.litPower > 0 || e.burn > 0)) {
    for (const other of run.enemies) {
      if (other !== e && other.hp > 0 && Math.hypot(other.x - e.x, other.y - e.y) < KINDLING.radius) {
        other.hp -= KINDLING.damage;
        run.events.push({ t: run.time, type: 'scorch', x: other.x, y: other.y });
      }
    }
  }
}

/** Remove dead beetles (scoring them) and beetles that reached the shrine (hurting it). */
export function resolveFallenAndBiters(run) {
  const survivors = [];
  for (const e of run.enemies) {
    if (e.hp <= 0) {
      registerKill(run, e);
    } else if (reachedShrine(run, e)) {
      run.shrineHp = Math.max(0, run.shrineHp - e.def.harm);
      run.stats.leaked++;
      run.events.push({ t: run.time, type: 'bite', x: e.x, y: e.y, harm: e.def.harm, enemy: e.type });
    } else {
      survivors.push(e);
    }
  }
  // Kindling can push a neighbour below 0 after it was already kept: catch it next tick.
  run.enemies = survivors;
}

export function tickChain(run, dt) {
  if (run.chain.timer > 0) {
    run.chain.timer -= dt;
    if (run.chain.timer <= 0) run.chain.count = 0;
  }
}

/** End-of-wave bonus: points for every Sunseed HP left plus a clear bonus that grows each wave. */
export function waveClearBonus(run) {
  return run.shrineHp * SCORING.perShrineHp + SCORING.waveClear * (run.waveIndex + 1);
}
