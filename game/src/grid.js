// The courtyard grid: which cell holds which glass piece, and the placement rules
// (inside the walls, not on the shrine or a burrow, and never sealing the shrine off).
import { BOARD, DX, DY } from './config.js';

export function createGrid() {
  const { cols, rows } = BOARD;
  return {
    cols,
    rows,
    pieces: new Array(cols * rows).fill(null),
    shrine: { ...BOARD.shrine },
    gates: BOARD.gates.map((g) => ({ ...g })),
  };
}

export function cellIndex(grid, c, r) {
  return r * grid.cols + c;
}

export function inBounds(grid, c, r) {
  return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows;
}

export function pieceAt(grid, c, r) {
  return inBounds(grid, c, r) ? grid.pieces[cellIndex(grid, c, r)] : null;
}

export function isShrineCell(grid, c, r) {
  return c === grid.shrine.c && r === grid.shrine.r;
}

export function isGateCell(grid, c, r) {
  return grid.gates.some((g) => g.c === c && g.r === r);
}

/** Walkers can stand on any in-bounds cell without a piece. */
export function isWalkable(grid, c, r) {
  return inBounds(grid, c, r) && !grid.pieces[cellIndex(grid, c, r)];
}

/** True when every burrow can still reach the shrine on foot. */
export function shrineReachable(grid) {
  const seen = new Uint8Array(grid.cols * grid.rows);
  const queue = [cellIndex(grid, grid.shrine.c, grid.shrine.r)];
  seen[queue[0]] = 1;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const c = i % grid.cols;
    const r = (i / grid.cols) | 0;
    for (let d = 0; d < 4; d++) {
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (!isWalkable(grid, nc, nr)) continue;
      const ni = cellIndex(grid, nc, nr);
      if (!seen[ni]) {
        seen[ni] = 1;
        queue.push(ni);
      }
    }
  }
  return grid.gates.every((g) => seen[cellIndex(grid, g.c, g.r)]);
}

/** Would a piece on (c, r) cut every path from a burrow to the shrine? */
export function wouldSealShrine(grid, c, r) {
  const i = cellIndex(grid, c, r);
  grid.pieces[i] = { type: 'probe', rot: 0 };
  const sealed = !shrineReachable(grid);
  grid.pieces[i] = null;
  return sealed;
}

/** { ok, reason } for placing any piece on (c, r). */
export function placementCheck(grid, c, r) {
  if (!inBounds(grid, c, r)) return { ok: false, reason: 'Outside the courtyard' };
  if (isShrineCell(grid, c, r)) return { ok: false, reason: 'That is the Sunseed' };
  if (isGateCell(grid, c, r)) return { ok: false, reason: 'Burrows must stay open' };
  if (pieceAt(grid, c, r)) return { ok: false, reason: 'Cell taken' };
  if (wouldSealShrine(grid, c, r)) return { ok: false, reason: 'Would seal the shrine' };
  return { ok: true, reason: '' };
}

export function setPiece(grid, c, r, piece) {
  grid.pieces[cellIndex(grid, c, r)] = piece;
}

export function countPieces(grid) {
  let n = 0;
  for (const p of grid.pieces) if (p) n++;
  return n;
}
