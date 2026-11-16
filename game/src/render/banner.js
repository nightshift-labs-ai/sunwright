// Where the event banner sits: a pill no wider than 40% of the board, docked inside the wall beside
// the gate it talks about (the next sun's window for "NEXT SUN: WEST - REAIM GLASS", else the
// current sun's), with a nub pointing at that window. DOM-free, so the stage planner and the
// screenshot checks can place it too.
import { bannerSun, currentBanner, titanStatus } from '../announce.js';
import { sunApertureFor } from '../sun.js';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, CELL } from './layout.js';

/** The pill's width: under 40% of the board (780 px -> 312). */
export const BANNER_W = 304;
const GAP = 6;

/**
 * The banner now, or null: { head, sub, wall, x0, y0, x1, y1, nub: [[x, y] x3] }. The message splits
 * at its first " - " into a 32 px headline and a 20 px second line.
 */
export function bannerLayout(run) {
  const message = currentBanner(run);
  // While the Titan is on the board her bar takes the banner's place (hud.drawTitanBar).
  if (!message || titanStatus(run)) return null;
  const cut = message.indexOf(' - ');
  const head = cut > 0 ? message.slice(0, cut) : message;
  const sub = cut > 0 ? message.slice(cut + 3) : '';
  const ap = sunApertureFor(run.seed, bannerSun(run));
  const w = BANNER_W;
  const h = sub ? 74 : 48;
  // Two docking spots per gate (above / below it on a side wall, right / left of it on the north wall):
  // the first that covers no beetle wins, else the first.
  const spots = [];
  if (ap.wall === 'north') {
    const y0 = BOARD_Y + GAP;
    for (const toRight of [true, false]) {
      const x0 = toRight ? BOARD_X + (ap.c + 1) * CELL + GAP : BOARD_X + ap.c * CELL - GAP - w;
      if (x0 < BOARD_X + GAP || x0 + w > BOARD_X + BOARD_W - GAP) continue;
      const edge = toRight ? x0 : x0 + w;
      const out = toRight ? -1 : 1;
      spots.push({ x0, y0, nub: [[edge, y0 + 12], [edge, y0 + 34], [edge + out * 14, y0 - 2]] });
    }
  } else {
    const west = ap.wall === 'west';
    const x0 = west ? BOARD_X + GAP : BOARD_X + BOARD_W - GAP - w;
    for (const below of [false, true]) {
      const y0 = below ? BOARD_Y + (ap.r + 1) * CELL + GAP : BOARD_Y + ap.r * CELL - GAP - h;
      if (y0 < BOARD_Y + GAP || y0 + h > BOARD_Y + BOARD_H - GAP) continue;
      const edge = below ? y0 : y0 + h;
      const out = below ? -1 : 1;
      const side = west ? x0 : x0 + w;
      const inward = west ? 1 : -1;
      spots.push({ x0, y0, nub: [[side + inward * 12, edge], [side + inward * 36, edge], [side - inward * 2, edge + out * 16]] });
    }
  }
  const covers = (sp) => run.enemies.some((e) => {
    const r = e.def.size * CELL;
    const ex = BOARD_X + e.x * CELL;
    const ey = BOARD_Y + e.y * CELL;
    return sp.x0 < ex + r && ex - r < sp.x0 + w && sp.y0 < ey + r && ey - r < sp.y0 + h;
  });
  const { x0, y0, nub } = spots.find((sp) => !covers(sp)) ?? spots[0];
  return { head, sub, wall: ap.wall, x0, y0, x1: x0 + w, y1: y0 + h, nub };
}
