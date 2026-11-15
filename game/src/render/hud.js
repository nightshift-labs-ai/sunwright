// The heads-up display, drawn on the canvas so screenshots show exactly what the player sees:
// sun dial with NOW / NEXT openings, day-phase-wave banner with the remaining bar, Sunseed HP
// pips, Flare and CHAIN, score and shards, the INCOMING roster, boons taken, and the hotbar.
import { BEAM, ENEMIES, PIECES, PIECE_ORDER, WAVE_COUNT } from '../config.js';
import { boonById } from '../draft.js';
import { chainMultiplier, chainWindow } from '../combat.js';
import { enemiesRemaining, pieceCost, pieceUnlocked } from '../sim.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';
import { drawEnemy } from './beetles.js';
import { BOARD_X, BOARD_Y, CELL, SHARD_ANCHOR, VIEW_H, VIEW_W } from './layout.js';

const INK = '#FFF6DF';
const GOLD = '#F2C14E';
const FONT = 'system-ui, "Segoe UI", sans-serif';
const PANEL_W = 188;

const HOTBAR = { y: 716, w: 104, h: 76, gap: 8 };
const HOTBAR_X = 640 - (PIECE_ORDER.length * (HOTBAR.w + HOTBAR.gap) + 150 + 190) / 2;

/** Hotbar hit test for the mouse: a piece type, 'flare', 'start', or null. */
export function hotbarHit(px, py) {
  if (py < HOTBAR.y || py > HOTBAR.y + HOTBAR.h) return null;
  for (let i = 0; i < PIECE_ORDER.length; i++) {
    const x = HOTBAR_X + i * (HOTBAR.w + HOTBAR.gap);
    if (px >= x && px <= x + HOTBAR.w) return PIECE_ORDER[i];
  }
  const fx = HOTBAR_X + PIECE_ORDER.length * (HOTBAR.w + HOTBAR.gap);
  if (px >= fx && px <= fx + 140) return 'flare';
  if (px >= fx + 150 && px <= fx + 340) return 'start';
  return null;
}

function text(ctx, str, x, y, size, color = INK, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = 'rgba(30,20,60,0.75)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function sunGlyph(ctx, x, y, r, lit) {
  ctx.save();
  if (lit) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, 'rgba(255,230,120,0.9)');
    g.addColorStop(1, 'rgba(255,197,49,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = lit ? '#FFE27A' : 'rgba(255,230,170,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = lit ? '#FFF6DF' : 'rgba(255,230,170,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
    ctx.lineTo(x + Math.cos(a) * r * 1.75, y + Math.sin(a) * r * 1.75);
  }
  ctx.stroke();
  ctx.restore();
}

const WALL_ANGLE = { east: 0, north: -Math.PI / 2, west: Math.PI };

/** The sun dial: the three openings of the day, the lit one, and a NEXT marker. */
function drawSunDial(ctx, run) {
  const cx = PANEL_W / 2 + 4;
  const cy = 132;
  const R = 58;
  ctx.fillStyle = '#E9C48A';
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, Math.PI, 0);
  ctx.lineTo(cx + R + 12, cy + 14);
  ctx.lineTo(cx - R - 12, cy + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,70,30,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 6, Math.PI, 0);
  ctx.stroke();
  const now = run.aperture.wall;
  const next = run.waveIndex + 1 < WAVE_COUNT ? sunApertureFor(run.seed, run.waveIndex + 1).wall : null;
  // Gnomon pointing at the lit opening.
  const a = WALL_ANGLE[now];
  ctx.strokeStyle = '#7A4A22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18));
  ctx.stroke();
  for (const wall of ['east', 'north', 'west']) {
    const wa = WALL_ANGLE[wall];
    const gx = cx + Math.cos(wa) * R;
    const gy = cy + Math.sin(wa) * R;
    sunGlyph(ctx, gx, gy, wall === now ? 12 : 8, wall === now);
    if (wall === next) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(gx, gy, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  text(ctx, 'E', cx + R + 2, cy + 32, 13, INK, 'center');
  text(ctx, 'N', cx, cy - R - 20, 13, INK, 'center');
  text(ctx, 'W', cx - R - 2, cy + 32, 13, INK, 'center');
  const phase = run.aperture.phase;
  text(ctx, `NOW: ${phase.name} - ${phase.wallName}`, cx, 178, 14, INK, 'center');
  if (next) {
    const nap = sunApertureFor(run.seed, run.waveIndex + 1);
    text(ctx, `NEXT: ${nap.phase.name} - ${nap.phase.wallName}`, cx, 206, 16, GOLD, 'center', 900);
  } else {
    text(ctx, 'LAST LIGHT', cx, 206, 16, GOLD, 'center', 900);
  }
}

function drawSunseedPips(ctx, run, y) {
  text(ctx, 'SUNSEED', 16, y, 15, INK);
  text(ctx, `${run.shrineHp}/${run.shrineMax}`, PANEL_W - 8, y, 15, '#7DFFC4', 'right');
  for (let k = 0; k < run.shrineMax; k++) {
    const x = 24 + (k % 6) * 27;
    const yy = y + 22 + Math.floor(k / 6) * 28;
    ctx.fillStyle = k < run.shrineHp ? '#34C38F' : 'rgba(40,20,50,0.55)';
    ctx.beginPath();
    ctx.moveTo(x, yy - 11);
    ctx.lineTo(x + 9, yy);
    ctx.lineTo(x, yy + 11);
    ctx.lineTo(x - 9, yy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = k < run.shrineHp ? '#B8FFE0' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawChainMeter(ctx, run, y) {
  const mult = chainMultiplier(run.chain.count);
  const active = run.chain.count >= 2;
  text(ctx, 'CHAIN', 16, y, 15, INK);
  text(ctx, active ? `x${mult}` : 'x1', PANEL_W - 8, y + 4, active ? 30 : 20, active ? '#FFF2A8' : 'rgba(255,246,223,0.6)', 'right', 900);
  ctx.fillStyle = 'rgba(30,20,60,0.5)';
  ctx.fillRect(16, y + 14, PANEL_W - 24, 6);
  if (run.chain.timer > 0) {
    ctx.fillStyle = '#FFD34D';
    ctx.fillRect(16, y + 14, (PANEL_W - 24) * (run.chain.timer / chainWindow(run)), 6);
  }
  text(ctx, `best x${run.chain.best}`, 16, y + 40, 13, 'rgba(255,246,223,0.75)', 'left', 600);
}

function drawLeftPanel(ctx, run) {
  panel(ctx, 6, 8, PANEL_W, 222);
  drawSunDial(ctx, run);
  panel(ctx, 6, 240, PANEL_W, 104);
  drawSunseedPips(ctx, run, 266);
  panel(ctx, 6, 354, PANEL_W, 74);
  drawChainMeter(ctx, run, 380);
}

const ICON_ENEMIES = Object.fromEntries(Object.keys(ENEMIES).map((type) => [type, { id: 3, type, def: ENEMIES[type], heading: 0, hp: 1, maxHp: 1, litPower: 0, age: 0, x: 0, y: 0 }]));

function drawEnemyIcon(ctx, type, x, y, scale) {
  const e = ICON_ENEMIES[type];
  e.x = (x - BOARD_X) / CELL;
  e.y = 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-x, -BOARD_Y);
  drawEnemy(ctx, e, 0);
  ctx.restore();
}

function drawRightPanel(ctx, run) {
  const x0 = VIEW_W - PANEL_W - 6;
  panel(ctx, x0, 8, PANEL_W, 222);
  text(ctx, 'SCORE', x0 + 14, 36, 15, INK);
  text(ctx, run.score.toLocaleString('en-US'), x0 + PANEL_W - 12, 82, 36, '#FFF2A8', 'right', 900);
  text(ctx, 'SHARDS', x0 + 14, 132, 15, INK);
  ctx.fillStyle = '#7FE8FF';
  ctx.beginPath();
  ctx.moveTo(SHARD_ANCHOR.x, SHARD_ANCHOR.y - 18);
  ctx.lineTo(SHARD_ANCHOR.x + 11, SHARD_ANCHOR.y - 4);
  ctx.lineTo(SHARD_ANCHOR.x, SHARD_ANCHOR.y + 14);
  ctx.lineTo(SHARD_ANCHOR.x - 11, SHARD_ANCHOR.y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, String(run.shards), x0 + PANEL_W - 12, 210, 40, '#BDF4FF', 'right', 900);

  panel(ctx, x0, 240, PANEL_W, 236);
  const inWave = run.phase === 'wave';
  text(ctx, inWave ? 'INCOMING' : `WAVE ${run.waveIndex + 1} BRINGS`, x0 + 14, 266, 15, INK);
  const roster = waveRoster(run.waveIndex, run.diff);
  const left = new Map();
  if (inWave) {
    for (let i = run.spawnCursor; i < run.schedule.length; i++) left.set(run.schedule[i].type, (left.get(run.schedule[i].type) ?? 0) + 1);
    for (const e of run.enemies) left.set(e.type, (left.get(e.type) ?? 0) + 1);
  }
  roster.forEach((row, k) => {
    const y = 306 + k * 44;
    drawEnemyIcon(ctx, row.type, x0 + 28, y, row.type === 'matriarch' ? 0.55 : 0.8);
    text(ctx, ENEMIES[row.type].name.replace('Umbral ', ''), x0 + 52, y + 5, 14, INK, 'left', 700);
    text(ctx, inWave ? `${left.get(row.type) ?? 0}` : `x${row.count}`, x0 + PANEL_W - 10, y + 6, 18, '#FFE14D', 'right', 900);
    if (row.isNew && !inWave) text(ctx, 'NEW', x0 + 52, y + 22, 11, '#FF8AD0', 'left', 800);
  });

  panel(ctx, x0, 486, PANEL_W, 200);
  text(ctx, `BOONS (${run.boons.length})`, x0 + 14, 512, 15, INK);
  run.boons.forEach((id, k) => {
    const b = boonById(id);
    const bx = x0 + 32 + (k % 4) * 42;
    const by = 548 + Math.floor(k / 4) * 44;
    drawBoonMedallion(ctx, b, bx, by, 17);
  });
  text(ctx, `${run.diff.name.toUpperCase()}  -  SEED ${run.seed}`, x0 + PANEL_W / 2, 674, 12, 'rgba(255,246,223,0.8)', 'center', 600);
}

/** A small stained-glass roundel for a boon (also used by the results screen via DOM canvas). */
export function drawBoonMedallion(ctx, boon, x, y, r) {
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = `hsl(${boon.hue + (k % 2) * 30}, 80%, ${k % 2 ? 48 : 62}%)`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, (k * Math.PI) / 3, ((k + 1) * Math.PI) / 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#FFF6DF';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawTopBanner(ctx, run, ui) {
  const { day, phase } = run.aperture;
  text(ctx, `DAY ${day} - ${phase.name} - WAVE ${run.waveIndex + 1}/${WAVE_COUNT}`, 640, 40, 30, INK, 'center', 900);
  if (run.phase === 'wave') {
    const total = run.schedule.length;
    const left = enemiesRemaining(run);
    ctx.fillStyle = 'rgba(30,20,60,0.55)';
    ctx.fillRect(460, 56, 360, 12);
    ctx.fillStyle = '#B0307A';
    ctx.fillRect(460, 56, 360 * (total ? left / total : 0), 12);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(460, 56, 360, 12);
    text(ctx, `${left} beetles left`, 830, 67, 14, INK, 'left', 700);
  } else if (run.phase === 'build') {
    text(ctx, ui.hint || 'BUILD: place glass to bend the light onto the beetle path', 640, 70, 16, ui.hint ? (ui.hintBad ? '#FF8A8A' : INK) : '#FFF2A8', 'center', 700);
  }
}

function drawPieceIcon(ctx, type, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#EBC68C';
  ctx.fillRect(-16, -8, 32, 20);
  ctx.fillStyle = '#B47E48';
  ctx.fillRect(-16, 12, 32, 6);
  if (type === 'mirror' || type === 'splitter') {
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = type === 'mirror' ? '#DDEBFA' : 'rgba(120,230,240,0.85)';
    ctx.fillRect(-17, -4, 34, 8);
    ctx.strokeStyle = type === 'mirror' ? GOLD : '#E8FFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(-17, -4, 34, 8);
  } else if (type === 'prism') {
    const faces = ['#FF4D3D', '#59B8FF', '#FFC531'];
    const tri = [[0, -18], [14, 8], [-14, 8]];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = faces[k];
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(...tri[k]);
      ctx.lineTo(...tri[(k + 1) % 3]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...tri[0]);
    ctx.lineTo(...tri[1]);
    ctx.lineTo(...tri[2]);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'lens') {
    ctx.fillStyle = '#77D7E8';
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#E2B57A';
    ctx.fillRect(-12, -22, 24, 34);
    ctx.fillStyle = '#2D5BD0';
    ctx.fillRect(-12, -18, 24, 5);
  }
  ctx.restore();
}

function drawHotbar(ctx, run, ui) {
  PIECE_ORDER.forEach((type, i) => {
    const x = HOTBAR_X + i * (HOTBAR.w + HOTBAR.gap);
    const cost = pieceCost(run, type);
    const unlocked = pieceUnlocked(run, type);
    const afford = run.shards >= cost && unlocked;
    const selected = ui.selected === type;
    ctx.globalAlpha = afford ? 1 : 0.45;
    panel(ctx, x, HOTBAR.y, HOTBAR.w, HOTBAR.h);
    if (selected) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 2, HOTBAR.y - 2, HOTBAR.w + 4, HOTBAR.h + 4);
    }
    drawPieceIcon(ctx, type, x + 32, HOTBAR.y + 36);
    text(ctx, String(i + 1), x + 9, HOTBAR.y + 19, 15, GOLD, 'left', 900);
    text(ctx, PIECES[type].name, x + HOTBAR.w / 2, HOTBAR.y + 70, 13, INK, 'center', 700);
    text(ctx, unlocked ? `${cost}` : 'DAY 2', x + (unlocked ? 80 : 72), HOTBAR.y + 40, unlocked ? 24 : 14, afford ? '#BDF4FF' : '#FF8A8A', 'center', 900);
    ctx.fillStyle = '#7FE8FF';
    ctx.beginPath();
    ctx.moveTo(x + 94, HOTBAR.y + 22);
    ctx.lineTo(x + 99, HOTBAR.y + 29);
    ctx.lineTo(x + 94, HOTBAR.y + 37);
    ctx.lineTo(x + 89, HOTBAR.y + 29);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  const fx = HOTBAR_X + PIECE_ORDER.length * (HOTBAR.w + HOTBAR.gap);
  const ready = run.phase === 'wave' && run.flareCharges > 0 && run.flareLeft <= 0;
  ctx.globalAlpha = run.phase === 'wave' ? 1 : 0.55;
  panel(ctx, fx, HOTBAR.y, 140, HOTBAR.h);
  sunGlyph(ctx, fx + 30, HOTBAR.y + 38, 11, ready || run.flareLeft > 0);
  if (run.flareLeft > 0) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(fx + 30, HOTBAR.y + 38, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (run.flareLeft / BEAM.flareSeconds));
    ctx.stroke();
  }
  text(ctx, 'SPACE', fx + 62, HOTBAR.y + 28, 13, GOLD, 'left', 900);
  text(ctx, 'FLARE', fx + 62, HOTBAR.y + 48, 16, INK, 'left', 800);
  text(ctx, `x${run.phase === 'wave' ? run.flareCharges : 0}`, fx + 62, HOTBAR.y + 68, 14, '#FFF2A8', 'left', 800);
  ctx.globalAlpha = 1;
  if (run.phase === 'build') {
    const bx = fx + 150;
    ctx.fillStyle = '#B0307A';
    ctx.beginPath();
    ctx.roundRect(bx, HOTBAR.y, 190, HOTBAR.h, 10);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, 'ENTER', bx + 95, HOTBAR.y + 30, 15, GOLD, 'center', 900);
    text(ctx, 'START WAVE', bx + 95, HOTBAR.y + 56, 20, INK, 'center', 900);
  } else if (run.phase === 'wave') {
    text(ctx, ui.hint ? ui.hint.slice(0, 44) : 'Q/E or wheel: turn glass live', fx + 156, HOTBAR.y + 34, 14, INK, 'left', 600);
    text(ctx, 'ESC pause  -  M mute', fx + 156, HOTBAR.y + 58, 14, 'rgba(255,246,223,0.75)', 'left', 600);
  }
}

export function drawHud(ctx, run, ui) {
  drawTopBanner(ctx, run, ui);
  drawLeftPanel(ctx, run);
  drawRightPanel(ctx, run);
  drawHotbar(ctx, run, ui);
  if (run.phase === 'wave' && run.flareLeft > 0) text(ctx, 'FLARE!', 640, VIEW_H - 98, 24, '#FFFFFF', 'center', 900);
}
