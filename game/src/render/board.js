// The courtyard diorama: sandstone floor, lapis walls with gold trim and star tiles, the sun
// windows for the day, beetle burrows, oblique glass pieces on plinths with shadows cast away
// from the sun, and the jade Sun Fountain.
import { BOARD, DX, DY } from '../config.js';
import { sunApertureFor } from '../sun.js';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, CELL, VIEW_H, VIEW_W, WALL, WALL_FRONT } from './layout.js';
import { bannerLayout } from './banner.js';

export const PALETTE = {
  sandA: '#D29E5E',
  sandB: '#C38B4F',
  grout: '#AE7642',
  lapis: '#2D5BD0',
  lapisDark: '#1F3F99',
  gold: '#F2C14E',
  jade: '#34C38F',
  shadow: 'rgba(84,48,20,0.42)',
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
      // Each stone a little lighter or darker than its neighbours, so the floor is not a flat checker.
      const tint = rand() - 0.5;
      g.fillStyle = tint > 0 ? `rgba(255,236,200,${tint * 0.16})` : `rgba(110,60,25,${-tint * 0.16})`;
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
      // Worn edges: a lit top-left lip, a shaded bottom-right lip, and a chipped corner now and then.
      g.fillStyle = 'rgba(255,236,200,0.22)';
      g.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 2);
      g.fillRect(c * CELL + 1, r * CELL + 1, 2, CELL - 2);
      g.fillStyle = 'rgba(100,55,20,0.2)';
      g.fillRect(c * CELL + 1, r * CELL + CELL - 4, CELL - 2, 3);
      g.fillRect(c * CELL + CELL - 4, r * CELL + 1, 3, CELL - 2);
      if (rand() < 0.35) {
        const cx = c * CELL + (rand() < 0.5 ? 1 : CELL - 1);
        const cy = r * CELL + (rand() < 0.5 ? 1 : CELL - 1);
        const s = 4 + rand() * 5;
        g.fillStyle = 'rgba(95,52,18,0.28)';
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + (cx % CELL < 2 ? s : -s), cy);
        g.lineTo(cx, cy + (cy % CELL < 2 ? s : -s));
        g.closePath();
        g.fill();
      }
      for (let k = 0; k < 26; k++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(255,236,200,0.18)' : 'rgba(150,95,45,0.16)';
        g.fillRect(c * CELL + rand() * CELL, r * CELL + rand() * CELL, 1 + rand() * 3, 1 + rand() * 2);
      }
      // A small worn diamond inlay on every other tile.
      if ((r * 7 + c * 3) % 4 === 0) {
        g.strokeStyle = 'rgba(160,100,50,0.25)';
        g.beginPath();
        const h = CELL / 2;
        g.moveTo(c * CELL + h, r * CELL + h - 10);
        g.lineTo(c * CELL + h + 10, r * CELL + h);
        g.lineTo(c * CELL + h, r * CELL + h + 10);
        g.lineTo(c * CELL + h - 10, r * CELL + h);
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


/** A potted palm: terracotta pot, muted fronds (kept dimmer than any beam). */
function drawPalm(g, x, y) {
  g.fillStyle = 'rgba(91,58,30,0.3)';
  g.beginPath();
  g.ellipse(x + 10, y + 34, 34, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#5E7A44';
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (const [dx, dy] of [[-46, -30], [-30, -58], [0, -66], [30, -58], [46, -30], [-20, -40], [22, -42]]) {
    g.beginPath();
    g.moveTo(x, y - 8);
    g.quadraticCurveTo(x + dx * 0.4, y - 8 + dy * 0.9, x + dx, y + dy * 0.6);
    g.stroke();
  }
  g.fillStyle = '#B5603A';
  g.beginPath();
  g.moveTo(x - 22, y - 8);
  g.lineTo(x + 22, y - 8);
  g.lineTo(x + 16, y + 30);
  g.lineTo(x - 16, y + 30);
  g.closePath();
  g.fill();
  g.fillStyle = PALETTE.gold;
  g.fillRect(x - 22, y - 8, 44, 5);
}

/** A lapis-glazed urn with a gold band. */
function drawUrn(g, x, y) {
  g.fillStyle = 'rgba(91,58,30,0.3)';
  g.beginPath();
  g.ellipse(x + 8, y + 30, 28, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3A64C8';
  g.beginPath();
  g.ellipse(x, y + 6, 24, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x - 10, y - 30, 20, 16);
  g.fillStyle = PALETTE.gold;
  g.fillRect(x - 24, y + 2, 48, 5);
  g.fillRect(x - 13, y - 32, 26, 4);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath();
  g.ellipse(x - 8, y - 2, 6, 12, 0, 0, Math.PI * 2);
  g.fill();
}

/**
 * Life outside the walls: a potted palm and a vase on the sand, in the gaps under the side columns, so no
 * prop touches text. Only the play screen shows them (draft and results put text there).
 */
const PROPS = [
  { kind: 'palm', x: 92, y: 618 },
  { kind: 'urn', x: 1168, y: 622 },
];

/** Each prop's bounding box, shadow and fronds included. */
export function propBoxes() {
  return PROPS.map((p) => (p.kind === 'palm' ? { text: 'palm', x0: p.x - 50, x1: p.x + 50, y0: p.y - 48, y1: p.y + 44 } : { text: 'urn', x0: p.x - 24, x1: p.x + 36, y0: p.y - 32, y1: p.y + 38 }));
}

let propCanvas = null;
let propsShown = false;

/** The props layer, drawn after the walls on the play screen only. */
export function drawProps(ctx) {
  if (!propCanvas) {
    propCanvas = makeCanvas(VIEW_W, VIEW_H);
    const g = propCanvas.getContext('2d');
    for (const p of PROPS) (p.kind === 'palm' ? drawPalm : drawUrn)(g, p.x, p.y);
  }
  ctx.drawImage(propCanvas, 0, 0);
  propsShown = true;
}

/** Whether the last frame drew the props (for the screenshot checks). */
export function propsVisible() {
  return propsShown;
}

/** The static frame: warm surround, lapis side walls, the north wall's oblique front, the low south wall. */
function buildWallTexture() {
  const cv = makeCanvas(VIEW_W, VIEW_H);
  const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#D39A62');
  bg.addColorStop(1, '#B67A46');
  g.fillStyle = bg;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.strokeStyle = 'rgba(255,225,180,0.16)';
  g.lineWidth = 2;
  for (let y = 10; y < VIEW_H; y += 22) {
    g.beginPath();
    for (let x = 0; x <= VIEW_W; x += 20) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 4);
    g.stroke();
  }
  const left = BOARD_X - WALL;
  const right = BOARD_X + BOARD_W + WALL;
  const top = BOARD_Y - WALL_FRONT - WALL;
  const front = BOARD_Y - WALL_FRONT;
  const bottom = BOARD_Y + BOARD_H + WALL;
  g.fillStyle = 'rgba(91,58,30,0.35)';
  g.fillRect(left + 10, top + 14, right - left, bottom + 10 - top);
  for (let y = top; y < bottom; y += WALL) {
    drawStarTile(g, left, y, WALL);
    drawStarTile(g, right - WALL, y, WALL);
  }
  for (let x = left; x < right; x += WALL) {
    drawStarTile(g, x, top, WALL);
    drawStarTile(g, x, BOARD_Y + BOARD_H, WALL);
  }
  // North wall front face: shaded lapis with a star frieze and gold-edged pilasters.
  const face = g.createLinearGradient(0, front, 0, BOARD_Y);
  face.addColorStop(0, '#2F5ED6');
  face.addColorStop(1, '#173887');
  g.fillStyle = face;
  g.fillRect(BOARD_X, front, BOARD_W, WALL_FRONT);
  for (let x = BOARD_X + 6; x < BOARD_X + BOARD_W - 18; x += 30) drawStarTile(g, x, front + 14, 18);
  g.fillStyle = PALETTE.gold;
  for (let c = 0; c <= BOARD.cols; c += 2) g.fillRect(BOARD_X + c * CELL - 2, front, 4, WALL_FRONT);
  // Low south curb: a short front face below its top.
  g.fillStyle = '#173887';
  g.fillRect(left, bottom, right - left, 8);
  g.strokeStyle = PALETTE.gold;
  g.lineWidth = 3;
  g.strokeRect(left + 1.5, top + 1.5, right - left - 3, bottom - top - 3);
  g.beginPath();
  g.moveTo(BOARD_X, front);
  g.lineTo(BOARD_X + BOARD_W, front);
  g.stroke();
  g.strokeRect(BOARD_X - 1.5, BOARD_Y - 1.5, BOARD_W + 3, BOARD_H + 3);
  return cv;
}

/** Plain warm sand behind everything (the title shows the courtyard smaller, off to the right). */
export function drawSandSurround(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  bg.addColorStop(0, '#D39A62');
  bg.addColorStop(1, '#B67A46');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

/** Where a sun window sits in its wall (screen pixels). */
function windowRect(ap) {
  if (ap.wall === 'east') return { x: BOARD_X + BOARD_W, y: BOARD_Y + ap.r * CELL + 8, w: WALL, h: CELL - 16 };
  if (ap.wall === 'west') return { x: BOARD_X - WALL, y: BOARD_Y + ap.r * CELL + 8, w: WALL, h: CELL - 16 };
  return { x: BOARD_X + ap.c * CELL + 10, y: BOARD_Y - WALL_FRONT - WALL, w: CELL - 20, h: WALL + WALL_FRONT };
}

/** A little lapis plaque reading SUN - E / N / W beside a window (rotated on the side walls). */
function drawWindowLabel(ctx, ap, slot, lit) {
  const label = `SUN - ${ap.phase.wallName[0]}`;
  ctx.save();
  if (ap.wall === 'north') ctx.translate(slot.x + slot.w + 36, BOARD_Y - 16);
  else {
    ctx.translate(slot.x + slot.w / 2, slot.y - 34);
    ctx.rotate(ap.wall === 'east' ? Math.PI / 2 : -Math.PI / 2);
  }
  ctx.font = '900 13px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 12;
  ctx.fillStyle = lit ? PALETTE.gold : '#1F3F99';
  ctx.fillRect(-w / 2, -9, w, 18);
  ctx.strokeStyle = lit ? '#FFFFFF' : PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -9, w, 18);
  ctx.fillStyle = lit ? '#3B1247' : '#FFF6DF';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 5);
  ctx.restore();
}

/** Words painted on the floor: SWARM at the burrows, FOUNTAIN under the shrine. */
function boxHitsBeam(box, legs) {
  return legs.some((leg) => {
    const x0 = BOARD_X + Math.min(leg.x0, leg.x1) * CELL - 5;
    const x1 = BOARD_X + Math.max(leg.x0, leg.x1) * CELL + 5;
    const y0 = BOARD_Y + Math.min(leg.y0, leg.y1) * CELL - 5;
    const y1 = BOARD_Y + Math.max(leg.y0, leg.y1) * CELL + 5;
    return box.x0 < x1 && x0 < box.x1 && box.y0 < y1 && y0 < box.y1;
  });
}

function boxHitsBeetle(box, run) {
  return run.enemies.some((e) => {
    const r = e.def.size * CELL;
    const x = BOARD_X + e.x * CELL;
    const y = BOARD_Y + e.y * CELL;
    return box.x0 < x + r && x - r < box.x1 && box.y0 < y + r && y - r < box.y1;
  });
}

function tagBox(text, x, y) {
  const w = text.length * 11 + 16;
  return { text, x, y, x0: x - w / 2, x1: x + w / 2, y0: y - 15, y1: y + 7 };
}

const FOUNTAIN_TAG_SPOTS = [[0, 46], [-78, 34], [78, 34], [0, -46], [-86, -10], [86, -10]];

/**
 * The board's name tags and their boxes: SWARM on the south wall beside each burrow, and
 * FOUNTAIN at the first spot round the basin that no beam core or beetle covers.
 */
export function boardLabelBoxes(run) {
  // One SWARM tag (at the first burrow): one label per thing on the board.
  const labels = run.grid.gates.slice(0, 1).map((g) => tagBox('SWARM', BOARD_X + g.c * CELL + CELL / 2 + 66, BOARD_Y + BOARD_H + 19));
  const s = run.grid.shrine;
  const fx = BOARD_X + s.c * CELL + CELL / 2;
  const fy = BOARD_Y + s.r * CELL + CELL / 2;
  const legs = run.trace?.legs ?? [];
  const spots = FOUNTAIN_TAG_SPOTS.map(([dx, dy]) => tagBox('FOUNTAIN', fx + dx, fy + dy));
  // The tag also keeps out from under the docked banner pill.
  const pill = bannerLayout(run);
  const underPill = (b) => !!pill && b.x0 < pill.x1 && pill.x0 < b.x1 && b.y0 < pill.y1 && pill.y0 < b.y1;
  labels.push(spots.find((b) => !boxHitsBeam(b, legs) && !boxHitsBeetle(b, run) && !underPill(b)) ?? spots[0]);
  return labels;
}

/** Board tags drawn last, as small lapis plaques with gold lettering. */
export function drawBoardTags(ctx, run) {
  ctx.font = '900 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const t of boardLabelBoxes(run)) {
    ctx.fillStyle = 'rgba(31,63,153,0.92)';
    ctx.beginPath();
    ctx.roundRect(t.x0, t.y0 - 2, t.x1 - t.x0, t.y1 - t.y0 + 4, 7);
    ctx.fill();
    // A 2 px dark outline round the gold rim, so the tag reads above sprites and beams.
    ctx.strokeStyle = '#2A1608';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFE27A';
    ctx.fillText(t.text, t.x, t.y);
  }
}

/** A warm wedge of light fanning from the lit window across the sand. */
function drawGodRays(ctx, ap, slot, time) {
  const cx = slot.x + slot.w / 2;
  const cy = ap.wall === 'north' ? BOARD_Y : slot.y + slot.h / 2;
  const dir = ap.wall === 'north' ? [0, 1] : ap.wall === 'east' ? [-1, 0] : [1, 0];
  const len = ap.wall === 'north' ? BOARD_H * 0.8 : BOARD_W * 0.55;
  const spread = 0.42 + Math.sin(time * 0.8) * 0.02;
  const ex = cx + dir[0] * len;
  const ey = cy + dir[1] * len;
  const px = -dir[1] * len * spread;
  const py = dir[0] * len * spread;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const grad = ctx.createLinearGradient(cx, cy, ex, ey);
  grad.addColorStop(0, 'rgba(255,214,120,0.30)');
  grad.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - dir[1] * 12, cy + dir[0] * 12);
  ctx.lineTo(ex + px, ey + py);
  ctx.lineTo(ex - px, ey - py);
  ctx.lineTo(cx + dir[1] * 12, cy - dir[0] * 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Floor, walls, the day's three sun windows (lit / next / shuttered), labels and the burrows. */
export function drawCourtyard(ctx, run, time, allLit = false) {
  propsShown = false;
  floorCanvas ??= buildFloorTexture();
  wallCanvas ??= buildWallTexture();
  ctx.drawImage(wallCanvas, 0, 0);
  ctx.drawImage(floorCanvas, BOARD_X, BOARD_Y);
  const now = run.aperture;
  const dayStart = (now.day - 1) * 3;
  for (let k = 0; k < 3; k++) {
    const ap = sunApertureFor(run.seed, dayStart + k);
    const slot = windowRect(ap);
    const lit = allLit || ap.wall === now.wall;
    const next = run.waveIndex + 1 === dayStart + k;
    if (lit && !allLit) drawGodRays(ctx, ap, slot, time);
    ctx.fillStyle = lit ? '#FFF4C8' : PALETTE.lapis;
    ctx.beginPath();
    if (ap.wall === 'north') {
      // An arched window through the wall's front face.
      ctx.moveTo(slot.x, slot.y + slot.h);
      ctx.lineTo(slot.x, slot.y + 16);
      ctx.arc(slot.x + slot.w / 2, slot.y + 16, slot.w / 2, Math.PI, 0);
      ctx.lineTo(slot.x + slot.w, slot.y + slot.h);
      ctx.closePath();
    } else ctx.rect(slot.x, slot.y, slot.w, slot.h);
    ctx.fill();
    if (lit) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sx = slot.x + slot.w / 2;
      const sy = slot.y + slot.h / 2;
      const disk = ctx.createRadialGradient(sx, sy, 2, sx, sy, 34);
      disk.addColorStop(0, 'rgba(255,255,235,0.95)');
      disk.addColorStop(0.45, `rgba(255,214,90,${0.6 + Math.sin(time * 3) * 0.1})`);
      disk.addColorStop(1, 'rgba(255,170,40,0)');
      ctx.fillStyle = disk;
      ctx.fillRect(sx - 34, sy - 34, 68, 68);
      ctx.restore();
    } else {
      // Shuttered: gold slats across a lapis arch.
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      for (let k = 6; k < slot.h; k += 7) {
        ctx.beginPath();
        ctx.moveTo(slot.x, slot.y + k);
        ctx.lineTo(slot.x + slot.w, slot.y + k);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = next ? '#FFFFFF' : PALETTE.gold;
    ctx.lineWidth = next ? 3 : 2;
    ctx.stroke();
    // Every gate of the day keeps its SUN tag; the live one is gold.
    drawWindowLabel(ctx, ap, slot, lit);
  }
  // Burrows: violet arches in the low south wall.
  for (const g of run.grid.gates) {
    const x = BOARD_X + g.c * CELL + CELL / 2;
    const y = BOARD_Y + BOARD_H + WALL / 2 + 2;
    ctx.fillStyle = '#4A2350';
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 13, 0, 0, Math.PI * 2);
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

/** A soft cast shadow, thrown away from the current sun (sun.shadowVectorFor), longer for taller pieces. */
export function drawBlockShadow(ctx, x, y, w, d, height, shadow) {
  const len = Math.max(CELL * 0.7, height * 1.9);
  const ox = shadow.x * len;
  const oy = shadow.y * len;
  const pts = hull([[x, y], [x + w, y], [x, y + d], [x + w, y + d], [x + ox, y + oy], [x + w + ox, y + oy], [x + ox, y + d + oy], [x + w + ox, y + d + oy]]);
  ctx.save();
  ctx.filter = 'blur(3px)';
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The courtyard's light by time of day: rose in the morning, white-gold at noon, warm amber in the evening. */
const DAYLIGHT = { morning: 'rgba(255,150,150,0.13)', noon: 'rgba(255,246,210,0.08)', evening: 'rgba(255,150,50,0.15)' };
export function drawDaylight(ctx, phaseId) {
  ctx.fillStyle = DAYLIGHT[phaseId] ?? DAYLIGHT.noon;
  ctx.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);
}

/** The sun's light pooling on the stones it reaches: a warm wash under the beams (play screen). */
export function drawLitFloor(ctx, trace, cols) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < trace.lit.length; i++) {
    if (trace.lit[i] <= 0) continue;
    const c = i % cols;
    const r = Math.floor(i / cols);
    ctx.fillStyle = `rgba(255,180,80,${Math.min(0.2, 0.08 + trace.lit[i] / 200)})`;
    ctx.fillRect(BOARD_X + c * CELL + 2, BOARD_Y + r * CELL + 2, CELL - 4, CELL - 4);
  }
  ctx.restore();
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
/** One piece on its plinth; glow = the light is on it (the pane itself glows warm, no cell box). */
export function drawPiece(ctx, piece, c, r, shadow, time, alpha = 1, glow = false) {
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
  drawBlock(ctx, px + inset, py + inset + 4, CELL - inset * 2, CELL - inset * 2, h, tall ? '#D9713F' : PALETTE.plinthTop, tall ? '#9A4424' : PALETTE.plinthFront);
  if (tall) {
    ctx.strokeStyle = '#2A1608';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + inset, py + inset + 4 - h, CELL - inset * 2, CELL - inset * 2 + h);
  }
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
  if (glow) {
    ctx.shadowColor = 'rgba(255,196,48,1)';
    ctx.shadowBlur = 22;
  }
  const angle = easeTurn(piece, time);
  if (piece.type === 'mirror' || piece.type === 'splitter') {
    // Rot 0 = "/" (bottom-left to top-right); each step turns 90 degrees.
    ctx.rotate(-Math.PI / 4 + angle);
    if (piece.type === 'mirror') {
      // A silver pane in a lapis frame.
      ctx.fillStyle = PALETTE.lapis;
      ctx.fillRect(-30, -8, 60, 16);
      const grad = ctx.createLinearGradient(0, -5, 0, 5);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.5, '#D7E6F5');
      grad.addColorStop(1, '#9DB4D2');
      ctx.fillStyle = grad;
      ctx.fillRect(-26, -4, 52, 8);
    } else {
      // A saturated cyan half-silvered pane with gold clips.
      ctx.fillStyle = '#16C9E0';
      ctx.fillRect(-28, -6, 56, 12);
      ctx.fillStyle = '#E8FFFF';
      ctx.fillRect(-24, -1, 48, 2);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-31, -7, 5, 14);
      ctx.fillRect(26, -7, 5, 14);
    }
    ctx.strokeStyle = '#2A1608';
    ctx.lineWidth = 2;
    ctx.strokeRect(-30, -8, 60, 16);
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
    ctx.strokeStyle = '#2A1608';
    ctx.lineWidth = 2.5;
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
    grad.addColorStop(0, '#F0FFFB');
    grad.addColorStop(0.5, '#3FE0C5');
    grad.addColorStop(1, '#13A08C');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2A1608';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draw every piece. Glass the current light reaches gets a white rim and glow; glass only the
 * next sun will reach gets a dashed gold outline tagged with that sun's wall letter.
 */
export function drawPieces(ctx, grid, shadow, time, lit = null, next = null) {
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      const p = grid.pieces[i];
      if (!p) continue;
      const litNow = !!lit && lit[i] > 0 && p.type !== 'pillar';
      drawPiece(ctx, p, c, r, shadow, time, 1, litNow);
      if (!lit || p.type === 'pillar' || litNow) continue;
      const x = BOARD_X + c * CELL;
      const y = BOARD_Y + r * CELL;
      if (next && next.lit[i] > 0) {
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 5, y + 5, CELL - 10, CELL - 10);
        ctx.setLineDash([]);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.arc(x + CELL - 10, y + 10, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3B1247';
        ctx.font = '900 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(next.wall, x + CELL - 10, y + 15);
      }
    }
  }
}

/** Every upgraded piece's pips, drawn above the light so a beam never hides them. */
export function drawAllLevelPips(ctx, grid) {
  grid.pieces.forEach((p, i) => p && drawLevelPips(ctx, p, i % grid.cols, Math.floor(i / grid.cols)));
}

/** Upgraded glass (Lv2, Lv3) shows that many gold pips along its plinth's front. */
export function drawLevelPips(ctx, piece, c, r) {
  const level = piece.level ?? 1;
  if (level < 2) return;
  const cx = BOARD_X + c * CELL + CELL / 2;
  const y = BOARD_Y + r * CELL + CELL - 9;
  const w = level * 16 + 6;
  ctx.fillStyle = 'rgba(42,22,8,0.85)';
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y - 10, w, 20, 10);
  ctx.fill();
  for (let k = 0; k < level; k++) {
    const x = cx + (k - (level - 1) / 2) * 16;
    ctx.fillStyle = '#FFD34D';
    ctx.strokeStyle = '#FFF6DF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 6, y);
    ctx.lineTo(x, y + 7);
    ctx.lineTo(x - 6, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/** The Sun Fountain: a sandstone basin of turquoise water around a jade spout, ringed by its HP. */
export function drawShrine(ctx, run, shadow, time, hurtAgo) {
  const s = run.grid.shrine;
  const x = BOARD_X + s.c * CELL + CELL / 2;
  const y = BOARD_Y + s.r * CELL + CELL / 2 + 6;
  ctx.fillStyle = PALETTE.shadow;
  ctx.beginPath();
  ctx.ellipse(x + shadow.x * 22, y + 8 + shadow.y * 16, 30, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Basin: darker front rim, lit top rim, water inside.
  ctx.fillStyle = '#A8723F';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 30, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F0CF97';
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  const hurt = hurtAgo < 0.3 ? 1 - hurtAgo / 0.3 : 0;
  const water = ctx.createRadialGradient(x - 6, y - 4, 2, x, y, 24);
  water.addColorStop(0, hurt > 0 ? '#FF9A9A' : '#B6FFF6');
  water.addColorStop(1, hurt > 0 ? '#C0303A' : '#22A99E');
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.ellipse(x, y, 23, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y - 14, 2, x, y - 14, 44);
  glow.addColorStop(0, `rgba(80,255,200,${0.35 + pulse * 0.2})`);
  glow.addColorStop(1, 'rgba(80,255,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 48, y - 62, 96, 96);
  ctx.restore();
  // Jade spout and arcing droplets.
  ctx.fillStyle = PALETTE.jade;
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(x + 9, y - 12);
  ctx.lineTo(x, y + 2);
  ctx.lineTo(x - 9, y - 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#D8FFF0';
  ctx.fillRect(x - 2, y - 26, 3, 18);
  ctx.fillStyle = '#C8FFF8';
  for (let k = 0; k < 6; k++) {
    const t = (time * 0.9 + k / 6) % 1;
    const side = k % 2 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(x + side * t * 18, y - 30 + t * 34 - Math.sin(t * Math.PI) * 10, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Health ring around the basin: one arc per fountain HP.
  const n = run.shrineMax;
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI / 2 + (k / n) * Math.PI * 2 + 0.07;
    const a1 = -Math.PI / 2 + ((k + 1) / n) * Math.PI * 2 - 0.07;
    ctx.strokeStyle = k < run.shrineHp ? '#4DFFB0' : `rgba(255,60,60,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y - 6, 36, 30, 0, a0, a1);
    ctx.stroke();
  }
}

/**
 * March lines: thin red chevrons along each swarm's walking route from its burrow to the
 * fountain, sliding slowly towards the fountain.
 */
export function drawMarchLines(ctx, run, time) {
  const { grid, flow } = run;
  ctx.save();
  // March chevrons stay, quieter than the light.
  ctx.strokeStyle = 'rgba(200,28,28,0.42)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const shift = (time * 0.6) % 1;
  for (const g of grid.gates) {
    let c = g.c;
    let r = g.r;
    for (let step = 0; step < grid.cols * grid.rows; step++) {
      const d = flow.next[r * grid.cols + c];
      if (d < 0) break;
      const nc = c + DX[d];
      const nr = r + DY[d];
      if (nc === grid.shrine.c && nr === grid.shrine.r) break;
      const t = shift;
      const x = BOARD_X + (c + 0.5 + DX[d] * t) * CELL;
      const y = BOARD_Y + (r + 0.5 + DY[d] * t) * CELL;
      const ax = DX[d] * 9;
      const ay = DY[d] * 9;
      ctx.beginPath();
      ctx.moveTo(x - ax - ay, y - ay + ax);
      ctx.lineTo(x, y);
      ctx.lineTo(x - ax + ay, y - ay - ax);
      ctx.stroke();
      c = nc;
      r = nr;
    }
  }
  ctx.restore();
}
