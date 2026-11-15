// Where the event banner sits: a pill no wider than 40% of the board, docked inside the wall beside
// the gate it talks about (the next sun's window for "NEXT SUN: WEST - REAIM GLASS", else the
// current sun's), with a nub pointing at that window. DOM-free, so the stage planner and the
// screenshot checks can place it too.
import { bannerSun, currentBanner } from '../announce.js';
import { sunApertureFor } from '../sun.js';
import { BOARD_W, BOARD_X, BOARD_Y, CELL } from './layout.js';

/** The pill's width: under 40% of the board (780 px -> 312). */
export const BANNER_W = 304;
const GAP = 6;

/**
 * The banner now, or null: { head, sub, wall, x0, y0, x1, y1, nub: [[x, y] x3] }. The message splits
 * at its first " - " into a 32 px headline and a 20 px second line.
 */
export function bannerLayout(run) {
  const message = currentBanner(run);
  if (!message) return null;
  const cut = message.indexOf(' - ');
  const head = cut > 0 ? message.slice(0, cut) : message;
  const sub = cut > 0 ? message.slice(cut + 3) : '';
  const ap = sunApertureFor(run.seed, bannerSun(run));
  const w = BANNER_W;
  const h = sub ? 74 : 48;
  let x0;
  let y0;
  let nub;
  if (ap.wall === 'north') {
    // Row 0, right of the window's column (left of it near the east wall); the nub points up at it.
    y0 = BOARD_Y + GAP;
    const right = BOARD_X + (ap.c + 1) * CELL + GAP;
    const toRight = right + w <= BOARD_X + BOARD_W - GAP;
    x0 = toRight ? right : BOARD_X + ap.c * CELL - GAP - w;
    const edge = toRight ? x0 : x0 + w;
    const out = toRight ? -1 : 1;
    nub = [[edge, y0 + 12], [edge, y0 + 34], [edge + out * 14, y0 - 2]];
  } else {
    // Hugging the side wall, in the row above the window (below it at the top row); the nub points at it.
    const west = ap.wall === 'west';
    x0 = west ? BOARD_X + GAP : BOARD_X + BOARD_W - GAP - w;
    const above = BOARD_Y + ap.r * CELL - GAP - h;
    const below = above < BOARD_Y + GAP;
    y0 = below ? BOARD_Y + (ap.r + 1) * CELL + GAP : above;
    const edge = below ? y0 : y0 + h;
    const out = below ? -1 : 1;
    const side = west ? x0 : x0 + w;
    const inward = west ? 1 : -1;
    nub = [[side + inward * 12, edge], [side + inward * 36, edge], [side - inward * 2, edge + out * 16]];
  }
  return { head, sub, wall: ap.wall, x0, y0, x1: x0 + w, y1: y0 + h, nub };
}
