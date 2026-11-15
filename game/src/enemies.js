// Beetle behaviour: Scuttlers and Shellbacks walk the flow field around pieces, Lampmoths fly
// over everything towards the shrine but veer into the brightest light nearby, and the Umbral
// Matriarch walks slowly with a carapace that only opens part of the time.
import { BOARD, DX, DY, ENEMIES, MATRIARCH_CARAPACE, MOTH_DAZZLE, MOTH_LURE } from './config.js';
import { flowDirectionAt } from './pathing.js';

export function spawnEnemy(run, type, gateIndex) {
  const def = ENEMIES[type];
  const gate = run.grid.gates[gateIndex % run.grid.gates.length];
  const hp = Math.round(def.hp * run.diff.hpMul);
  const enemy = {
    id: run.nextEnemyId++,
    type,
    def,
    hp,
    maxHp: hp,
    x: gate.c + 0.5,
    y: BOARD.rows + 0.35, // emerges from the burrow in the south wall
    tc: gate.c, // walkers head for the burrow's own cell first
    tr: gate.r,
    heading: 3,
    litPower: 0,
    shielded: false,
    age: 0,
    wobble: (run.nextEnemyId * 1.7) % 6.28,
  };
  run.enemies.push(enemy);
  return enemy;
}

/** Current armour: the Matriarch's drops to 0 while her carapace is open. */
export function armourOf(enemy) {
  if (!enemy.def.boss) return enemy.def.armour;
  return carapaceOpen(enemy) ? 0 : enemy.def.armour;
}

export function carapaceOpen(enemy) {
  return enemy.age % MATRIARCH_CARAPACE.cycle > MATRIARCH_CARAPACE.cycle - MATRIARCH_CARAPACE.open;
}

function stepWalker(run, e, dt) {
  let budget = e.def.speed * dt;
  while (budget > 0) {
    const tx = e.tc + 0.5;
    const ty = e.tr + 0.5;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= budget) {
      e.x = tx;
      e.y = ty;
      budget -= dist;
      if (e.tc === run.grid.shrine.c && e.tr === run.grid.shrine.r) return;
      const d = flowDirectionAt(run.flow, e.tc, e.tr);
      if (d < 0) return;
      e.heading = d;
      e.tc += DX[d];
      e.tr += DY[d];
    } else {
      e.x += (dx / dist) * budget;
      e.y += (dy / dist) * budget;
      budget = 0;
    }
  }
}

/**
 * Lampmoths: fly at the shrine, pulled hard towards the brightest lit cell within 2.5 cells,
 * and dazzled (slowed) while they flutter in the light.
 */
function stepFlyer(run, e, dt) {
  const sx = run.grid.shrine.c + 0.5;
  const sy = run.grid.shrine.r + 0.5;
  let vx = sx - e.x;
  let vy = sy - e.y;
  const len = Math.hypot(vx, vy) || 1;
  vx /= len;
  vy /= len;
  const lure = brightestCellNear(run, e.x, e.y, 2.5);
  if (lure) {
    const lx = lure.x - e.x;
    const ly = lure.y - e.y;
    const ll = Math.hypot(lx, ly) || 1;
    vx += (lx / ll) * MOTH_LURE;
    vy += (ly / ll) * MOTH_LURE;
  }
  vx += Math.cos(e.age * 3 + e.wobble) * 0.35;
  const vl = Math.hypot(vx, vy) || 1;
  const speed = e.def.speed * (e.litPower > 0 ? MOTH_DAZZLE : 1);
  e.x += (vx / vl) * speed * dt;
  e.y += (vy / vl) * speed * dt;
  e.heading = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 0 : 2) : vy > 0 ? 1 : 3;
}

function brightestCellNear(run, x, y, radius) {
  const lit = run.trace?.lit;
  if (!lit) return null;
  let best = null;
  let bestPower = 0;
  const { cols, rows } = run.grid;
  for (let r = Math.max(0, Math.floor(y - radius)); r <= Math.min(rows - 1, Math.floor(y + radius)); r++) {
    for (let c = Math.max(0, Math.floor(x - radius)); c <= Math.min(cols - 1, Math.floor(x + radius)); c++) {
      const p = lit[r * cols + c];
      if (p > bestPower) {
        bestPower = p;
        best = { x: c + 0.5, y: r + 0.5 };
      }
    }
  }
  return best;
}

export function moveEnemies(run, dt) {
  for (const e of run.enemies) {
    e.age += dt;
    if (e.def.flies) stepFlyer(run, e, dt);
    else stepWalker(run, e, dt);
  }
}

/** Beetles close enough to the shrine to bite it. */
export function reachedShrine(run, e) {
  return Math.hypot(e.x - (run.grid.shrine.c + 0.5), e.y - (run.grid.shrine.r + 0.5)) < 0.42;
}

/** The board cell a beetle stands on (or null while still in its burrow). */
export function enemyCell(run, e) {
  const c = Math.floor(e.x);
  const r = Math.floor(e.y);
  if (c < 0 || r < 0 || c >= run.grid.cols || r >= run.grid.rows) return null;
  return r * run.grid.cols + c;
}
