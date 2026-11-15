// Screen geometry shared by the renderer, the HUD and the mouse: a 1280 x 800 stage with the
// 13 x 9 courtyard of 64 px cells in the middle, lapis walls around it.
import { BOARD } from '../config.js';

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const CELL = 64;
export const BOARD_X = Math.round((VIEW_W - BOARD.cols * CELL) / 2);
export const BOARD_Y = 106;
export const BOARD_W = BOARD.cols * CELL;
export const BOARD_H = BOARD.rows * CELL;
export const WALL = 26;

/** Cell-unit coordinates (cell centres at c + 0.5) to stage pixels. */
export function toScreenX(x) {
  return BOARD_X + x * CELL;
}
export function toScreenY(y) {
  return BOARD_Y + y * CELL;
}

/** Stage pixels to a board cell, or null outside the courtyard. */
export function cellAtPixel(px, py) {
  const c = Math.floor((px - BOARD_X) / CELL);
  const r = Math.floor((py - BOARD_Y) / CELL);
  if (c < 0 || r < 0 || c >= BOARD.cols || r >= BOARD.rows) return null;
  return { c, r };
}

/** HUD anchors that effects fly towards (the shard counter) or burst from (the Sunseed pips). */
export const SHARD_ANCHOR = { x: 1120, y: 196 };
export const SCORE_ANCHOR = { x: 1120, y: 92 };
