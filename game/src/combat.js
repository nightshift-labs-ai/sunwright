// Burning and scoring: beam damage per tick with armour thresholds, the Flare, the CHAIN
// multiplier for quick successive kills, quartz drops, and beetles biting the Sun Fountain.
import { BEAM, CHARM_FX, RANK_THRESHOLDS, SPREAD_BURN, SCORING, TINT_EFFECTS } from './config.js';
import { TINT_BLUE, TINT_GOLD, TINT_RED } from './beams.js';
import { armourOf, enemyCell, reachedShrine } from './enemies.js';

/** Emit a teaching event the first time something happens in a sun (e.g. armour shrugging light off). */
function noteOnce(run, type, e) {
  if (run.waveNotes.has(type)) return;
  run.waveNotes.add(type);
  run.events.push({ t: run.time, type, x: e.x, y: e.y });
}

export function flareMultiplier(run) {
  return run.flareLeft > 0 ? BEAM.flareMult : 1;
}

export function chainWindow(run) {
  return run.boons.includes('longchain') ? CHARM_FX.longchain.window : SCORING.chainWindow;
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
    if (e.shielded && e.type === 'shellback') noteOnce(run, 'shrug', e);
    e.deflecting = power > 0 && !!e.def.blocksLight && !(tint & TINT_GOLD);
    if (e.deflecting) noteOnce(run, 'deflect', e);
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
  const quartz = e.def.quartz + (run.boons.includes('magnet') ? CHARM_FX.magnet.quartz : 0);
  run.score += points;
  run.quartz += quartz;
  run.feedback.quartzAt = run.time;
  if (chain.count >= 2) run.feedback.searAt = run.time;
  run.stats.kills++;
  if (e.def.boss) run.stats.titanSeconds = run.time - e.bornAt;
  run.events.push({ t: run.time, type: 'kill', x: e.x, y: e.y, enemy: e.type, points, chain: chain.count, mult, quartz, boss: !!e.def.boss, lit: e.litPower > 0 });
  if (run.boons.includes('spreading') && (e.litPower > 0 || e.burn > 0)) {
    for (const other of run.enemies) {
      if (other !== e && other.hp > 0 && Math.hypot(other.x - e.x, other.y - e.y) < SPREAD_BURN.radius) {
        other.hp -= SPREAD_BURN.damage;
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
      run.feedback.biteAt = run.time;
      run.feedback.biteHarm = e.def.harm;
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

/** S/A/B for a won run by RANK_THRESHOLDS; every other run is a C. */
export function rankFor(run) {
  if (run.phase !== 'won') return 'C';
  const titan = run.stats.titanSeconds ?? Infinity;
  const tier = RANK_THRESHOLDS.find((t) => run.score >= t.score && run.shrineHp >= t.fountain && titan <= t.titanSeconds);
  return tier ? tier.rank : 'C';
}

function clockText(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The results S ladder. A won run short of S lists what S needs (RANK_THRESHOLDS[0]) with a mark
 * each: { head: 'FOR S:', marks: [{ label: '40,000', ok }, ...] }; an S run { head: 'TOP RANK - S' };
 * a lost run has none (head '').
 */
export function rankLadder(run) {
  if (run.phase !== 'won') return { head: '', marks: [] };
  if (rankFor(run) === 'S') return { head: 'TOP RANK - S', marks: [] };
  const s = RANK_THRESHOLDS[0];
  const titan = run.stats.titanSeconds ?? Infinity;
  return {
    head: 'FOR S:',
    marks: [
      { label: s.score.toLocaleString('en-US'), ok: run.score >= s.score },
      { label: `FOUNTAIN ${s.fountain}`, ok: run.shrineHp >= s.fountain },
      { label: `TITAN ${clockText(s.titanSeconds)}`, ok: titan <= s.titanSeconds },
    ],
  };
}

/** The results run line: difficulty, seed, time and the score against the best before this run. */
export function runLine(run, previousBest) {
  const delta = run.score - previousBest;
  const vs = delta >= 0 ? `+${delta.toLocaleString('en-US')} over best` : `${(-delta).toLocaleString('en-US')} under best`;
  return `${run.diff.name} - seed ${run.seed} - ${clockText(run.time)} - ${vs}`;
}

/** End-of-wave bonus: points for every Sun Fountain HP left plus a clear bonus that grows each wave. */
export function waveClearBonus(run) {
  return run.shrineHp * SCORING.perShrineHp + SCORING.waveClear * (run.waveIndex + 1);
}
