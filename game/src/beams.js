// Light routing: trace the sunbeam cell by cell from the opening through mirrors, splitters,
// lenses and pillars. Produces the power on every cell (what burns beetles), the beam legs to
// draw, and the bounce points that get a starburst. Loops are cut by remembering (cell, direction).
import { BEAM, DX, DY } from './config.js';
import { cellIndex, inBounds, isShrineCell, pieceAt } from './grid.js';

const MIRROR_SLASH = [3, 2, 1, 0]; // "/" : E->N, S->W, W->S, N->E
const MIRROR_BACKSLASH = [1, 0, 3, 2]; // "\" : E->S, S->E, W->N, N->W

export function reflectDirection(rot, dir) {
  return rot % 2 === 0 ? MIRROR_SLASH[dir] : MIRROR_BACKSLASH[dir];
}

/** A lens only passes light along its axis: rot 0/2 horizontal, rot 1/3 vertical. */
export function lensPasses(rot, dir) {
  return rot % 2 === 0 ? dir % 2 === 0 : dir % 2 === 1;
}

/** Light modifiers from boons: { power, bounceLoss, lensMult, lensReach }. */
export function beamModsFor(boons) {
  const has = (id) => boons.includes(id);
  return {
    power: BEAM.power * (has('highsun') ? 1.2 : 1),
    bounceLoss: has('silvered') ? 0 : BEAM.bounceLoss,
    lensMult: BEAM.lensMult,
    lensReach: BEAM.lensReach + (has('burning') ? 2 : 0),
  };
}

/**
 * Trace all light from one opening.
 * Returns { lit: Float32Array power per cell, legs: [{x0,y0,x1,y1,power,focused}], bursts: [{x,y,power}] }
 * with coordinates in cell units (cell centres at c + 0.5).
 */
export function traceBeams(grid, aperture, mods) {
  const lit = new Float32Array(grid.cols * grid.rows);
  const legs = [];
  const bursts = [];
  const seen = new Set();
  const rays = [{ c: aperture.c, r: aperture.r, dir: aperture.dir, power: mods.power, focus: 0, x: aperture.x, y: aperture.y }];
  let steps = 0;
  while (rays.length && legs.length < BEAM.maxLegs) {
    const ray = rays.shift();
    let { c, r, dir, power, focus } = ray;
    let x0 = ray.x;
    let y0 = ray.y;
    const endLeg = (x1, y1) => {
      if (x1 !== x0 || y1 !== y0) legs.push({ x0, y0, x1, y1, power, focused: focus > 0 });
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
      const key = cellIndex(grid, c, r) * 4 + dir;
      if (seen.has(key)) {
        endLeg(cx, cy);
        break;
      }
      seen.add(key);
      const i = cellIndex(grid, c, r);
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
      if (piece) {
        endLeg(cx, cy);
        if (piece.type === 'mirror') {
          bursts.push({ x: cx, y: cy, power });
          dir = reflectDirection(piece.rot, dir);
          power *= 1 - mods.bounceLoss;
        } else if (piece.type === 'splitter') {
          bursts.push({ x: cx, y: cy, power });
          const turned = reflectDirection(piece.rot, dir);
          power *= 0.5;
          rays.push({ c: c + DX[turned], r: r + DY[turned], dir: turned, power, focus, x: cx, y: cy });
        } else if (piece.type === 'lens') {
          bursts.push({ x: cx, y: cy, power: power * 0.6 });
          power *= mods.lensMult;
          focus = mods.lensReach + 1;
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
  return { lit, legs, bursts };
}

/** Total length of lit beam (cells), used for the beam hum's loudness. */
export function litLength(trace) {
  let n = 0;
  for (const p of trace.lit) if (p > 0) n++;
  return n;
}
