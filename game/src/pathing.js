// Walking routes: a breadth-first flow field from the shrine over every open cell, so each
// beetle only has to look up which way to step next. Rebuilt whenever a piece is placed or lifted.
import { DX, DY } from './config.js';
import { cellIndex, isWalkable } from './grid.js';

/** dist[i] = steps to the shrine (-1 if unreachable); next[i] = direction to step (0-3, -1 at the shrine). */
export function buildFlowField(grid) {
  const n = grid.cols * grid.rows;
  const dist = new Int16Array(n).fill(-1);
  const next = new Int8Array(n).fill(-1);
  const start = cellIndex(grid, grid.shrine.c, grid.shrine.r);
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const c = i % grid.cols;
    const r = (i / grid.cols) | 0;
    // North first so ties lean towards the shrine side, then E, W, S: deterministic.
    for (const d of [3, 0, 2, 1]) {
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (!isWalkable(grid, nc, nr)) continue;
      const ni = cellIndex(grid, nc, nr);
      if (dist[ni] !== -1) continue;
      dist[ni] = dist[i] + 1;
      next[ni] = (d + 2) % 4; // step back the way the search came
      queue.push(ni);
    }
  }
  return { dist, next, cols: grid.cols };
}

/** The direction a walker on (c, r) should step, or -1 if it is at the shrine / cut off. */
export function flowDirectionAt(flow, c, r) {
  return flow.next[r * flow.cols + c];
}

/** Steps from a cell to the shrine along the flow field. */
export function routeLength(flow, c, r) {
  return flow.dist[r * flow.cols + c];
}
