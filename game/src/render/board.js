// The courtyard diorama: sandstone floor, lapis walls with gold trim and star tiles, the sun
// windows for the day, beetle burrows, oblique glass pieces on plinths with shadows cast away
// from the sun, and the jade Sun Fountain.
import { BOARD } from '../config.js';
import { sunApertureFor } from '../sun.js';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, CELL, VIEW_H, VIEW_W, WALL } from './layout.js';

export const PALETTE = {
  sandA: '#D8A86A',
  sandB: '#C99559',
  grout: '#B9824A',
  lapis: '#2D5BD0',
  lapisDark: '#1F3F99',
  gold: '#F2C14E',
  jade: '#34C38F',
  shadow: 'rgba(91,58,30,0.38)',
  plinthTop: '#EBC68C',
  plinthFront: '#B47E48',
};

let floorCanvas = null;
let wallCanvas = null;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Sandstone checker with grout lines and speckle noise, drawn once. */
function buildFloorTexture() {
  const cv = makeCanvas(BOARD_W, BOARD_H);
  const g = cv.getContext('2d');
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let r = 0; r < BOARD.rows; r++) {
    for (let c = 0; c < BOARD.cols; c++) {
      g.fillStyle = (r + c) % 2 ? PALETTE.sandB : PALETTE.sandA;
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
      for (let k = 0; k < 26; k++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(255,236,200,0.18)' : 'rgba(150,95,45,0.16)';
        g.fillRect(c * CELL + rand() * CELL, r * CELL + rand() * CELL, 1 + rand() * 3, 1 + rand() * 2);
      }
      // A small worn diamond inlay on every other tile.
      if ((r * 7 + c * 3) % 4 === 0) {
        g.strokeStyle = 'rgba(160,100,50,0.25)';
        g.beginPath();
        g.moveTo(c * CELL + 32, r * CELL + 22);
        g.lineTo(c * CELL + 42, r * CELL + 32);
        g.lineTo(c * CELL + 32, r * CELL + 42);
        g.lineTo(c * CELL + 22, r * CELL + 32);
        g.closePath();
        g.stroke();
      }
    }
  }
  g.strokeStyle = PALETTE.grout;
  g.lineWidth = 2;
  for (let c = 0; c <= BOARD.cols; c++) {
    g.beginPath();
    g.moveTo(c * CELL, 0);
    g.lineTo(c * CELL, BOARD_H);
    g.stroke();
  }
  for (let r = 0; r <= BOARD.rows; r++) {
    g.beginPath();
    g.moveTo(0, r * CELL);
    g.lineTo(BOARD_W, r * CELL);
    g.stroke();
  }
  return cv;
}

/** An eight-point star tile: two overlapped squares in gold on lapis. */
function drawStarTile(g, x, y, s) {
  g.fillStyle = PALETTE.lapis;
  g.fillRect(x, y, s, s);
  g.fillStyle = PALETTE.lapisDark;
  g.fillRect(x, y, s, 2);
  g.fillRect(x, y, 2, s);
  const cx = x + s / 2;
  const cy = y + s / 2;
  const k = s * 0.32;
  g.fillStyle = '#E9B949';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    const rad = i % 2 ? k * 0.55 : k;
    g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
  g.fillStyle = '#5FA8FF';
  g.beginPath();
  g.arc(cx, cy, k * 0.32, 0, Math.PI * 2);
  g.fill();
}

/** The whole static frame: warm surround, lapis wall ring with tiles and trim. */
function buildWallTexture() {
  const cv = makeCanvas(VIEW_W, VIEW_H);
  const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#C98C57');
  bg.addColorStop(1, '#A9693B');
  g.fillStyle = bg;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  // Sand ripples on the surround.
  g.strokeStyle = 'rgba(255,220,170,0.13)';
  g.lineWidth = 2;
  for (let y = 10; y < VIEW_H; y += 22) {
    g.beginPath();
    for (let x = 0; x <= VIEW_W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 4);
    g.stroke();
  }
  const x0 = BOARD_X - WALL;
  const y0 = BOARD_Y - WALL;
  const w = BOARD_W + WALL * 2;
  const h = BOARD_H + WALL * 2;
  g.fillStyle = 'rgba(91,58,30,0.35)';
  g.fillRect(x0 + 8, y0 + 12, w, h);
  const s = WALL;
  for (let x = x0; x < x0 + w; x += s) {
    drawStarTile(g, x, y0, s);
    drawStarTile(g, x, y0 + h - s, s);
  }
  for (let y = y0 + s; y < y0 + h - s; y += s) {
    drawStarTile(g, x0, y, s);
    drawStarTile(g, x0 + w - s, y, s);
  }
  g.strokeStyle = PALETTE.gold;
  g.lineWidth = 3;
  g.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
  g.strokeRect(BOARD_X - 1.5, BOARD_Y - 1.5, BOARD_W + 3, BOARD_H + 3);
  return cv;
}

function wallSlotRect(ap) {
  if (ap.wall === 'east') return { x: BOARD_X + BOARD_W, y: BOARD_Y + ap.r * CELL + 8, w: WALL, h: CELL - 16 };
  if (ap.wall === 'west') return { x: BOARD_X - WALL, y: BOARD_Y + ap.r * CELL + 8, w: WALL, h: CELL - 16 };
  return { x: BOARD_X + ap.c * CELL + 8, y: BOARD_Y - WALL, w: CELL - 16, h: WALL };
}

/** Floor, walls, the day's three sun windows (lit / next / shuttered) and the burrows. */
export function drawCourtyard(ctx, run, time) {
  floorCanvas ??= buildFloorTexture();
  wallCanvas ??= buildWallTexture();
  ctx.drawImage(wallCanvas, 0, 0);
  ctx.drawImage(floorCanvas, BOARD_X, BOARD_Y);
  const now = run.aperture;
  const dayStart = (now.day - 1) * 3;
  for (let k = 0; k < 3; k++) {
    const ap = sunApertureFor(run.seed, dayStart + k);
    const slot = wallSlotRect(ap);
    const lit = ap.wall === now.wall;
    const next = run.waveIndex + 1 === dayStart + k;
    ctx.fillStyle = lit ? '#FFF4C8' : '#3A2A55';
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    if (lit) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,197,49,${0.35 + Math.sin(time * 3) * 0.08})`;
      ctx.fillRect(slot.x - 6, slot.y - 6, slot.w + 12, slot.h + 12);
      ctx.restore();
    }
    ctx.strokeStyle = next ? '#FFFFFF' : PALETTE.gold;
    ctx.lineWidth = next ? 3 : 2;
    ctx.strokeRect(slot.x + 1, slot.y + 1, slot.w - 2, slot.h - 2);
  }
  // Burrows: violet arches in the south wall.
  for (const g of run.grid.gates) {
    const x = BOARD_X + g.c * CELL + CELL / 2;
    const y = BOARD_Y + BOARD_H + WALL / 2;
    ctx.fillStyle = '#4A2350';
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B0307A';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/** Convex hull of points (monotone chain), for shadow shapes. */
function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[i]) <= 0) upper.pop();
    upper.push(p[i]);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

export function drawBlockShadow(ctx, x, y, w, d, height, shadow) {
  const len = height * 1.7;
  const ox = shadow.x * len;
  const oy = shadow.y * len;
  const pts = hull([[x, y], [x + w, y], [x, y + d], [x + w, y + d], [x + ox, y + oy], [x + w + ox, y + oy], [x + ox, y + d + oy], [x + w + ox, y + d + oy]]);
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
}

/** An oblique block: lit top face raised by `height`, darker front face below it. */
export function drawBlock(ctx, x, y, w, d, height, top, front) {
  ctx.fillStyle = front;
  ctx.fillRect(x, y + d - height, w, height);
  ctx.fillStyle = top;
  ctx.fillRect(x, y - height, w, d);
  ctx.strokeStyle = 'rgba(90,50,20,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y - height + 0.5, w - 1, d - 1);
}

function easeTurn(piece, time) {
  const t = piece.turnedAt < 0 ? 1 : Math.min(1, (time - piece.turnedAt) / 0.09);
  let from = piece.prevRot * 90;
  let to = piece.rot * 90;
  if (to - from > 180) from += 360;
  if (from - to > 180) to += 360;
  return ((from + (to - from) * t) * Math.PI) / 180;
}

/** Draw one piece standing in cell (c, r). alpha < 1 for the placement ghost. */
export function drawPiece(ctx, piece, c, r, shadow, time, alpha = 1) {
  const px = BOARD_X + c * CELL;
  const py = BOARD_Y + r * CELL;
  const age = piece.placedAt === undefined ? 9 : time - piece.placedAt;
  const squash = age < 0.25 ? 1 + Math.sin(age * 25) * 0.18 * (1 - age / 0.25) : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  const tall = piece.type === 'pillar';
  const h = (tall ? 30 : 12) * squash;
  const inset = tall ? 9 : 7;
  if (alpha === 1) drawBlockShadow(ctx, px + inset, py + inset, CELL - inset * 2, CELL - inset * 2, h + (tall ? 0 : 10), shadow);
  drawBlock(ctx, px + inset, py + inset + 4, CELL - inset * 2, CELL - inset * 2, h, tall ? '#E2B57A' : PALETTE.plinthTop, tall ? '#A86F3C' : PALETTE.plinthFront);
  const cx = px + CELL / 2;
  const cy = py + CELL / 2 - h + 4;
  if (tall) {
    ctx.fillStyle = PALETTE.lapis;
    ctx.fillRect(px + inset, py + inset + 4 - h + 6, CELL - inset * 2, 6);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(px + inset, py + inset + 4 - h + 12, CELL - inset * 2, 2);
    ctx.restore();
    return;
  }
  ctx.translate(cx, cy);
  const angle = easeTurn(piece, time);
  if (piece.type === 'mirror' || piece.type === 'splitter') {
    // Rot 0 = "/" (bottom-left to top-right); each step turns 90 degrees.
    ctx.rotate(-Math.PI / 4 + angle);
    if (piece.type === 'mirror') {
      const grad = ctx.createLinearGradient(0, -6, 0, 6);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, '#BFD9F2');
      grad.addColorStop(1, '#7E9CC4');
      ctx.fillStyle = grad;
      ctx.fillRect(-27, -5, 54, 10);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(-27, -5, 54, 10);
    } else {
      ctx.fillStyle = 'rgba(120,230,240,0.55)';
      ctx.fillRect(-27, -5, 54, 10);
      ctx.fillStyle = '#E8FFFF';
      ctx.fillRect(-25, -1, 50, 2);
      ctx.strokeStyle = '#7FE0F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(-27, -5, 54, 10);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-30, -6, 5, 12);
      ctx.fillRect(25, -6, 5, 12);
    }
  } else if (piece.type === 'prism') {
    // A triangular prism pointing the way its gold beam leaves; rainbow faces.
    ctx.rotate(angle);
    const tri = [[0, -20], [18, 13], [-18, 13]];
    const faces = ['#FF4D3D', '#59B8FF', '#FFC531'];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = faces[k];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(...tri[k]);
      ctx.lineTo(...tri[(k + 1) % 3]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(6, 2);
    ctx.lineTo(-6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...tri[0]);
    ctx.lineTo(...tri[1]);
    ctx.lineTo(...tri[2]);
    ctx.closePath();
    ctx.stroke();
  } else if (piece.type === 'lens') {
    // The lens disc stands across its axis: rot 0 passes east-west light.
    ctx.rotate(angle);
    const grad = ctx.createRadialGradient(-3, -4, 2, 0, 0, 22);
    grad.addColorStop(0, '#F4FFFF');
    grad.addColorStop(0.6, '#77D7E8');
    grad.addColorStop(1, '#2C8FB0');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPieces(ctx, grid, shadow, time) {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const p = grid.pieces[r * grid.cols + c];
      if (p) drawPiece(ctx, p, c, r, shadow, time);
    }
  }
}

/** The Sun Fountain: a jade crystal on a round plinth, with its health ring. */
export function drawShrine(ctx, run, shadow, time, hurtAgo) {
  const s = run.grid.shrine;
  const x = BOARD_X + s.c * CELL + CELL / 2;
  const y = BOARD_Y + s.r * CELL + CELL / 2;
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(x + shadow.x * 22, y + 14 + shadow.y * 16, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#B47E48';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 27, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EBC68C';
  ctx.beginPath();
  ctx.ellipse(x, y + 9, 27, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 46);
  glow.addColorStop(0, `rgba(80,255,180,${0.45 + pulse * 0.2})`);
  glow.addColorStop(1, 'rgba(80,255,180,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 50, y - 58, 100, 100);
  ctx.restore();
  const hurt = hurtAgo < 0.3 ? 1 - hurtAgo / 0.3 : 0;
  ctx.fillStyle = hurt > 0 ? `rgb(${52 + 200 * hurt},${195 - 100 * hurt},${143 - 80 * hurt})` : PALETTE.jade;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(x + 14, y - 8);
  ctx.lineTo(x, y + 10);
  ctx.lineTo(x - 14, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#B8FFE0';
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(x + 5, y - 10);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 6, y - 10);
  ctx.closePath();
  ctx.fill();
  // Health ring: one arc per Sun Fountain HP.
  const n = run.shrineMax;
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI / 2 + (k / n) * Math.PI * 2 + 0.06;
    const a1 = -Math.PI / 2 + ((k + 1) / n) * Math.PI * 2 - 0.06;
    ctx.strokeStyle = k < run.shrineHp ? '#4DFFB0' : 'rgba(60,30,40,0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 4, 30, a0, a1);
    ctx.stroke();
  }
}
