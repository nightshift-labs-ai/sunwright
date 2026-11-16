// Light routing: trace the sunbeam cell by cell from the opening through mirrors, splitters,
// lenses, prisms and pillars. Produces the power and tint on every cell (what burns beetles),
// the beam legs to draw, and the bounce points that get a starburst. Glassback shells stop
// any light but gold. Loops are cut by tracking visited (cell, direction) pairs.
import { BEAM, CHARM_FX, DX, DY, UPGRADES } from './config.js';
import { cellIndex, inBounds, isShrineCell, pieceAt } from './grid.js';

/** Beam tints (bit flags on lit cells): plain sunlight is 0. */
export const TINT_RED = 1;
export const TINT_BLUE = 2;
export const TINT_GOLD = 4;

const MIRROR_SLASH = [3, 2, 1, 0]; // "/" : E->N, S->W, W->S, N->E
const MIRROR_BACKSLASH = [1, 0, 3, 2]; // "\" : E->S, S->E, W->N, N->W

export function reflectDirection(rot, dir) {
  return rot % 2 === 0 ? MIRROR_SLASH[dir] : MIRROR_BACKSLASH[dir];
}

/** A lens only passes light along its axis: rot 0/2 horizontal, rot 1/3 vertical. */
export function lensPasses(rot, dir) {
  return rot % 2 === 0 ? dir % 2 === 0 : dir % 2 === 1;
}

/** A prism fans light three ways: gold straight on, red and blue to the sides (rot swaps the sides). */
export function prismFan(rot, dir) {
  const left = (dir + 3) % 4;
  const right = (dir + 1) % 4;
  return [
    { dir, tint: TINT_GOLD },
    { dir: rot % 2 === 0 ? left : right, tint: TINT_RED },
    { dir: rot % 2 === 0 ? right : left, tint: TINT_BLUE },
  ];
}

/** A piece's upgrade level, 1-3 (pieces from before upgrades existed are Lv1). */
export function levelOf(piece) {
  return piece.level ?? 1;
}

/** Light modifiers from boons: { power, bounceLoss, lensMult, lensReach, prismShare }. */
export function beamModsFor(boons) {
  const has = (id) => boons.includes(id);
  return {
    power: BEAM.power * (has('highsun') ? CHARM_FX.highsun.power : 1),
    bounceLoss: has('silvered') ? 0 : BEAM.bounceLoss,
    lensMult: has('grinder') ? CHARM_FX.grinder.lensMult : BEAM.lensMult,
    lensReach: BEAM.lensReach + (has('burning') ? CHARM_FX.burning.lensReach : 0),
    prismShare: has('trueprism') ? CHARM_FX.trueprism.prismShare : BEAM.prismShare,
  };
}

/**
 * Trace all light from one opening. blockers: optional Set of cell indices holding a Glassback.
 * Returns { lit: Float32Array power per cell, tints: Uint8Array flags per cell,
 *   legs: [{x0,y0,x1,y1,power,tint,focused}], bursts: [{x,y,power,kind}] } in cell units
 *   (kind: mirror, splitter, lens, prism, or shell where a Glassback soaks the beam).
 */
export function traceBeams(grid, aperture, mods, blockers = null) {
  const lit = new Float32Array(grid.cols * grid.rows);
  const tints = new Uint8Array(grid.cols * grid.rows);
  const legs = [];
  const bursts = [];
  const seen = new Set();
  const rays = [{ c: aperture.c, r: aperture.r, dir: aperture.dir, power: mods.power, focus: 0, tint: 0, x: aperture.x, y: aperture.y }];
  let steps = 0;
  while (rays.length && legs.length < BEAM.maxLegs) {
    const ray = rays.shift();
    let { c, r, dir, power, focus, tint } = ray;
    let x0 = ray.x;
    let y0 = ray.y;
    const endLeg = (x1, y1) => {
      if (x1 !== x0 || y1 !== y0) legs.push({ x0, y0, x1, y1, power, tint, focused: focus > 0 });
      x0 = x1;
      y0 = y1;
    };
    for (;;) {
      if (++steps > BEAM.maxSteps) break;
      const cx = c + 0.5;
      const cy = r + 0.5;
      if (!inBounds(grid, c, r)) {
        endLeg(cx - DX[dir] * 0.55, cy - DY[dir] * 0.55); // stop at the wall face
        break;
      }
      const i = cellIndex(grid, c, r);
      const key = (i * 4 + dir) * 8 + tint;
      if (seen.has(key)) {
        endLeg(cx, cy);
        break;
      }
      seen.add(key);
      if (isShrineCell(grid, c, r)) {
        endLeg(cx - DX[dir] * 0.4, cy - DY[dir] * 0.4);
        break;
      }
      const piece = pieceAt(grid, c, r);
      if (piece && (piece.type === 'pillar' || (piece.type === 'lens' && !lensPasses(piece.rot, dir)))) {
        endLeg(cx - DX[dir] * 0.42, cy - DY[dir] * 0.42);
        break;
      }
      lit[i] += power;
      tints[i] |= tint;
      if (blockers && blockers.has(i) && tint !== TINT_GOLD) {
        endLeg(cx, cy); // a Glassback's mirror shell soaks the beam
        bursts.push({ x: cx, y: cy, power: power * 0.5, kind: 'shell' });
        break;
      }
      if (piece) {
        endLeg(cx, cy);
        if (piece.type === 'mirror') {
          bursts.push({ x: cx, y: cy, power, kind: 'mirror' });
          dir = reflectDirection(piece.rot, dir);
          power *= 1 - mods.bounceLoss * UPGRADES.mirror.lossScale[levelOf(piece) - 1];
        } else if (piece.type === 'splitter') {
          bursts.push({ x: cx, y: cy, power, kind: 'splitter' });
          const turned = reflectDirection(piece.rot, dir);
          power *= UPGRADES.splitter.half[levelOf(piece) - 1];
          rays.push({ c: c + DX[turned], r: r + DY[turned], dir: turned, power, focus, tint, x: cx, y: cy });
        } else if (piece.type === 'lens') {
          bursts.push({ x: cx, y: cy, power: power * 0.6, kind: 'lens' });
          power *= mods.lensMult + UPGRADES.lens.multAdd[levelOf(piece) - 1];
          focus = mods.lensReach + 1;
        } else if (piece.type === 'prism') {
          bursts.push({ x: cx, y: cy, power, kind: 'prism' });
          const fan = prismFan(piece.rot, dir);
          power *= Math.min(0.95, mods.prismShare + UPGRADES.prism.shareAdd[levelOf(piece) - 1]);
          for (const branch of fan.slice(1)) rays.push({ c: c + DX[branch.dir], r: r + DY[branch.dir], dir: branch.dir, power, focus: 0, tint: branch.tint, x: cx, y: cy });
          tint = TINT_GOLD;
          focus = 0;
        }
      }
      if (focus > 0 && --focus === 0) {
        endLeg(cx, cy);
        break;
      }
      c += DX[dir];
      r += DY[dir];
    }
  }
  return { lit, tints, legs, bursts };
}

/** Total length of lit beam (cells), used for the beam hum's loudness. */
export function litLength(trace) {
  let n = 0;
  for (const p of trace.lit) if (p > 0) n++;
  return n;
}

/** How many big starbursts a frame may show. */
export const MAX_STARBURSTS = 6;

/**
 * The big starbursts worth drawing: prism splits and Glassback shells first, then the beetles the
 * light hits hardest, at most MAX_STARBURSTS. Plain bounces get none (render/fx.js gives them a glint).
 */
export function bigStarbursts(trace, enemies) {
  // One per spot: a prism crossed by several rays still splits light in one place.
  const out = [];
  for (const b of trace.bursts) {
    if (b.kind !== 'prism' && b.kind !== 'shell') continue;
    const same = out.find((o) => o.x === b.x && o.y === b.y);
    if (same) same.power = Math.max(same.power, b.power);
    else out.push({ x: b.x, y: b.y, power: b.power, kind: b.kind });
  }
  const hits = enemies
    .filter((e) => e.hp > 0 && e.litPower > 0 && !out.some((b) => Math.hypot(b.x - e.x, b.y - e.y) < 0.6))
    .sort((a, b) => b.litPower - a.litPower || a.id - b.id)
    .map((e) => ({ x: e.x, y: e.y, power: e.litPower, kind: 'hit' }));
  return [...out, ...hits].slice(0, MAX_STARBURSTS);
}
