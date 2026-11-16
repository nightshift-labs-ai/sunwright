// The heads-up display, drawn on the canvas so screenshots show exactly what the player sees:
// the event banner, the 9-sun track with HOLD n MORE SUNS, the sun dial (NOW / NEXT), fountain
// droplets with the lose rule, SEAR, score with BEST, quartz, INCOMING (with the Titan's row),
// glass charms, the hovered piece's tooltip and keys, the event log, and the hotbar.
import { BEAM, ENEMIES, NAMES, PIECES, PIECE_ORDER, WAVE_COUNT, enemyRuleTag } from '../config.js';
import { boonById } from '../draft.js';
import { beamModsFor } from '../beams.js';
import { chainMultiplier } from '../combat.js';
import { enemiesRemaining, liftRefund, pieceCost, pieceUnlocked } from '../sim.js';
import { winLoseParts } from '../announce.js';
import { sunApertureFor } from '../sun.js';
import { nextSunPreview, waveRoster } from '../waves.js';
import { drawEnemy } from './beetles.js';
import { drawCharmBadge } from './charms.js';
import { fitSized } from './fit.js';
import { bannerLayout } from './banner.js';
import { BOARD_W, BOARD_X, BOARD_Y, CELL, QUARTZ_ANCHOR, VIEW_W, WALL } from './layout.js';

const INK = '#FFF6DF';
const GOLD = '#F2C14E';
const FONT = 'system-ui, "Segoe UI", sans-serif';
const PANEL_W = 212;
/** The left panel: sun dial, then the FOUNTAIN pips with DRY = RUN LOST under them (the next sun is the pill's). */
const LEFT_PANEL_H = 282;
/** INCOMING under it: kind rows, the Titan row and the NEXT SUN preview. */
const INCOMING_H = 248;
const LEFT_X = 6;
const RIGHT_X = VIEW_W - PANEL_W - 6;

const HOTBAR = { y: 716, w: 132, h: 76, gap: 6 };
const HOTBAR_X = 640 - (PIECE_ORDER.length * (HOTBAR.w + HOTBAR.gap) + 150 + 190) / 2;

/** The pause, speed and sound buttons under the right panels: icons only (Esc / F / M on the keyboard). */
const HUD_BUTTONS = ['pause', 'speed', 'mute'].map((id, k) => ({ id, x: RIGHT_X + 4 + k * 70, y: 494, w: 62, h: 50 }));

/** Which HUD button (pause, speed, mute) is under the mouse, or null. */
export function hudButtonHit(px, py) {
  const b = HUD_BUTTONS.find((h) => px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h);
  return b ? b.id : null;
}

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

/** Text with a dark-brown outline so it reads on sand, lapis or light. */
function text(ctx, str, x, y, size, color = INK, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = 'rgba(48,22,10,0.85)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(31,63,153,0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function sunGlyph(ctx, x, y, r, lit, color = '#FFE27A') {
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
  ctx.globalAlpha = lit ? 1 : 0.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
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

/** The Hornback Titan's horned skull (sun track, INCOMING row, results). */
export function drawTitanSkull(ctx, x, y, r, crossed = false, bone = '#F4E9D2') {
  ctx.save();
  ctx.fillStyle = bone;
  ctx.strokeStyle = '#3B1247';
  ctx.lineWidth = Math.max(1.5, r / 6);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y - r * 0.35);
  ctx.quadraticCurveTo(x - r * 1.35, y - r * 1.0, x - r * 1.05, y - r * 1.4);
  ctx.quadraticCurveTo(x - r * 0.75, y - r * 0.9, x - r * 0.4, y - r * 0.75);
  ctx.moveTo(x + r * 0.75, y - r * 0.35);
  ctx.quadraticCurveTo(x + r * 1.35, y - r * 1.0, x + r * 1.05, y - r * 1.4);
  ctx.quadraticCurveTo(x + r * 0.75, y - r * 0.9, x + r * 0.4, y - r * 0.75);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - r * 0.1, r * 0.8, Math.PI * 0.85, Math.PI * 2.15);
  ctx.lineTo(x + r * 0.5, y + r * 0.75);
  ctx.lineTo(x - r * 0.5, y + r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3B1247';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.32, y - r * 0.05, r * 0.2, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (crossed) {
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = Math.max(2, r / 4);
    ctx.beginPath();
    ctx.moveTo(x - r * 1.1, y - r * 1.1);
    ctx.lineTo(x + r * 1.1, y + r * 1.1);
    ctx.moveTo(x + r * 1.1, y - r * 1.1);
    ctx.lineTo(x - r * 1.1, y + r * 1.1);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The 9-sun track: held suns filled, the current one ringed, the last one the Titan's skull
 * (crossed out once burned).
 */
export function drawSunTrack(ctx, x, y, spacing, r, held, current) {
  for (let k = 0; k < WAVE_COUNT; k++) {
    const gx = x + k * spacing;
    // Suns grow and burn hotter towards the end: pale yellow at sun 1, deep orange at sun 8.
    const heat = k / (WAVE_COUNT - 2);
    if (k === WAVE_COUNT - 1) drawTitanSkull(ctx, gx, y + 2, r * 1.3, held >= WAVE_COUNT, '#FF6B5E');
    else sunGlyph(ctx, gx, y, r * (0.5 + 0.3 * heat), k < held, `rgb(255,${Math.round(240 - 118 * heat)},${Math.round(170 - 150 * heat)})`);
    if (k === current) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gx, y, r * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

const WALL_ANGLE = { east: 0, north: -Math.PI / 2, west: Math.PI };

/** The sun dial: the three openings of the day, the lit one, and a NEXT marker. */
function drawSunDial(ctx, run, cx, cy) {
  const R = 50;
  ctx.fillStyle = '#E9C48A';
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, Math.PI, 0);
  ctx.lineTo(cx + R + 12, cy + 12);
  ctx.lineTo(cx - R - 12, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  const now = run.aperture.wall;
  const nextAp = run.waveIndex + 1 < WAVE_COUNT ? sunApertureFor(run.seed, run.waveIndex + 1) : null;
  const a = WALL_ANGLE[now];
  ctx.strokeStyle = '#7A4A22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16));
  ctx.stroke();
  for (const wall of ['east', 'north', 'west']) {
    const gx = cx + Math.cos(WALL_ANGLE[wall]) * R;
    const gy = cy + Math.sin(WALL_ANGLE[wall]) * R;
    sunGlyph(ctx, gx, gy, wall === now ? 12 : 8, wall === now);
    if (nextAp && wall === nextAp.wall) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(gx, gy, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

/** One water droplet pip: pointed top, round bottom. */
function droplet(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.5);
  ctx.bezierCurveTo(x + r * 0.4, y - r * 0.6, x + r, y - r * 0.2, x + r, y + r * 0.3);
  ctx.arc(x, y + r * 0.3, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.4, y - r * 0.6, x, y - r * 1.5);
  ctx.closePath();
}

/** FOUNTAIN n/10: a droplet per HP, empty ones pulsing red, and how the run is lost. */
function drawFountainPips(ctx, run, y) {
  const x0 = LEFT_X + 10;
  text(ctx, NAMES.fountainShort, x0, y, 18, INK, 'left', 900);
  text(ctx, `${run.shrineHp}/${run.shrineMax}`, LEFT_X + PANEL_W - 10, y + 6, 30, run.shrineHp <= 3 ? '#FF8A8A' : '#7DFFC4', 'right', 900);
  const pulse = 0.5 + Math.sin(run.time * 6) * 0.5;
  for (let k = 0; k < run.shrineMax; k++) {
    const x = x0 + 12 + (k % 5) * 38;
    const yy = y + 30 + Math.floor(k / 5) * 32;
    const crack = k >= run.shrineHp && k < run.shrineHp + run.feedback.biteHarm && run.time - run.feedback.biteAt < 0.8;
    const empty = k >= run.shrineHp;
    ctx.fillStyle = crack ? '#FF5C5C' : empty ? `rgba(${150 + 100 * pulse},40,50,${0.45 + 0.35 * pulse})` : '#3FD6C8';
    droplet(ctx, x, yy, 10);
    ctx.fill();
    ctx.strokeStyle = empty ? '#FFB0B0' : '#E0FFF6';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (crack) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(x - 5, yy - 8);
      ctx.lineTo(x + 2, yy);
      ctx.lineTo(x - 3, yy + 4);
      ctx.lineTo(x + 5, yy + 11);
      ctx.stroke();
    }
  }
  fitLine(ctx, ['EMPTY = RUN LOST', 'DRY = RUN LOST'], LEFT_X + PANEL_W / 2, y + 100, PANEL_W - 20, 20, '#FFB0B0', 'center');
}


function drawLeftPanel(ctx, run) {
  panel(ctx, LEFT_X, 8, PANEL_W, LEFT_PANEL_H);
  drawSunDial(ctx, run, LEFT_X + PANEL_W / 2, 94);
  ctx.strokeStyle = 'rgba(242,193,78,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LEFT_X + 12, 140);
  ctx.lineTo(LEFT_X + PANEL_W - 12, 140);
  ctx.stroke();
  drawFountainPips(ctx, run, 166);
  // INCOMING sits in the left gutter under the fountain.
  panel(ctx, LEFT_X, 304, PANEL_W, INCOMING_H);
  drawIncoming(ctx, run, LEFT_X, 304);
}

/** The wide bar across the top: day, phase and sun count, then the 9-sun track. */
function drawSunBar(ctx, run) {
  const { day, phase } = run.aperture;
  const x = BOARD_X - WALL + 4;
  const w = BOARD_W + WALL * 2 - 8;
  panel(ctx, x, 4, w, 58);
  const trackX = x + w - 26 - 8 * 36;
  fitLine(ctx, `DAY ${day} - ${phase.name} - ${NAMES.sun} ${run.waveIndex + 1}/${WAVE_COUNT}`, x + 16, 44, trackX - x - 46, 32, INK);
  drawSunTrack(ctx, trackX, 33, 36, 13, run.stats.wavesCleared, run.waveIndex);
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

function drawQuartzGem(ctx, x, y) {
  ctx.fillStyle = '#7FE8FF';
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 9, y - 3);
  ctx.lineTo(x, y + 11);
  ctx.lineTo(x - 9, y - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** INCOMING: what this sun brings (or still has on the way) and the Titan waiting at sun 9. */
function drawIncoming(ctx, run, x0, y0) {
  const inWave = run.phase === 'wave';
  if (inWave) {
    text(ctx, 'INCOMING', x0 + 12, y0 + 26, 18, '#FFB0D8', 'left', 900);
    text(ctx, `${enemiesRemaining(run)}`, x0 + PANEL_W - 46, y0 + 30, 30, '#FFE14D', 'right', 900);
    text(ctx, 'LEFT', x0 + PANEL_W - 8, y0 + 26, 14, '#FFB0D8', 'right', 900);
  } else text(ctx, `${NAMES.sun} ${run.waveIndex + 1} BRINGS`, x0 + 12, y0 + 26, 18, INK, 'left', 900);
  const roster = waveRoster(run.waveIndex, run.diff);
  const left = new Map();
  if (inWave) {
    for (let i = run.spawnCursor; i < run.schedule.length; i++) left.set(run.schedule[i].type, (left.get(run.schedule[i].type) ?? 0) + 1);
    for (const e of run.enemies) left.set(e.type, (left.get(e.type) ?? 0) + 1);
  }
  let y = y0 + 58;
  for (const row of roster) {
    if (row.type === 'titan') continue;
    drawEnemyIcon(ctx, row.type, x0 + 26, y, 0.62);
    text(ctx, ENEMIES[row.type].name, x0 + 48, y + 7, 18, INK, 'left', 800);
    text(ctx, inWave ? `${left.get(row.type) ?? 0}` : `x${row.count}`, x0 + PANEL_W - 10, y + 8, 24, '#FFE14D', 'right', 900);
    // The kind's rule in one word (from its stats), and NEW before its first sun.
    const rule = enemyRuleTag(ENEMIES[row.type]);
    const isNew = row.isNew && !inWave;
    if (rule) text(ctx, rule, x0 + 48, y + 29, 20, '#9FE8FF', 'left', 900);
    if (isNew) text(ctx, 'NEW', rule ? x0 + PANEL_W - 10 : x0 + 48, y + 29, 18, '#FF8AD0', rule ? 'right' : 'left', 900);
    y += rule || isNew ? 46 : 34;
  }
  const titanLeft = run.waveIndex === WAVE_COUNT - 1 && inWave ? left.get('titan') ?? 0 : 1;
  drawTitanSkull(ctx, x0 + 22, y, 9, titanLeft === 0, '#FF6B5E');
  fitLine(ctx, [`${NAMES.sun} ${WAVE_COUNT}: ${NAMES.enemy.titan}`, `${NAMES.sun} ${WAVE_COUNT}: THE TITAN`, `${NAMES.sun} ${WAVE_COUNT}: TITAN`], x0 + 36, y + 6, PANEL_W - 100, [18, 17, 16], '#FFB0B0');
  text(ctx, enemyRuleTag(ENEMIES.titan), x0 + PANEL_W - 10, y + 7, 18, '#FF8A8A', 'right', 900);
  const preview = nextSunPreview(run.waveIndex, run.diff, (t) => ENEMIES[t].name);
  if (preview) {
    // Shorter wordings of the same preview: drop SUN, then keep only the first change.
    const parts = preview.replace(`NEXT ${NAMES.sun}: `, '').split(', ');
    fitLine(ctx, [preview, `NEXT: ${parts.join(', ')}`, `NEXT: ${parts[0]}`, parts[0]], x0 + 12, y + 32, PANEL_W - 20, 15, '#FFE27A');
  }
}

/**
 * One HUD line in maxW: the first wording that fits at >= 92% width (render/fit.js), squeezed that
 * little. size may be a list (largest first): each wording tries every size before the next wording.
 */
function fitLine(ctx, options, x, y, maxW, sizes, color, align = 'left') {
  const { str, squeeze, size } = fitSized(ctx, options, maxW, [sizes].flat(), (px) => `900 ${px}px ${FONT}`);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  text(ctx, str, 0, 0, size, color, align, 900);
  ctx.restore();
  return str;
}

/** Owned glass charms as small medallions. */
function drawCharmRow(ctx, run, y0) {
  text(ctx, NAMES.charmsShort, RIGHT_X + 12, y0 + 22, 18, INK, 'left', 900);
  text(ctx, `${run.boons.length}`, RIGHT_X + PANEL_W - 10, y0 + 26, 30, '#FFF2A8', 'right', 900);
  run.boons.forEach((id, k) => {
    const b = boonById(id);
    drawCharmBadge(ctx, b, RIGHT_X + 24 + (k % 6) * 33, y0 + 54 + Math.floor(k / 6) * 32, 15);
  });
}

/** What the mouse is over: the piece (drawn as a ghost), its cost and job, and its keys. */
/** The GLASS legend: each piece's icon and what it does, one verb each (the lens with this run's focus). */
function drawGlassLegend(ctx, run, y0) {
  PIECE_ORDER.forEach((type, k) => {
    const y = y0 + 24 + k * 23;
    ctx.save();
    ctx.translate(RIGHT_X + 26, y - 7);
    ctx.scale(0.5, 0.5);
    drawPieceIcon(ctx, type, 0, 0);
    ctx.restore();
    const verb = type === 'lens' ? `focuses x${beamModsFor(run.boons).lensMult}` : PIECES[type].verb;
    text(ctx, verb, RIGHT_X + 52, y, 18, pieceUnlocked(run, type) ? INK : 'rgba(255,246,223,0.5)', 'left', 800);
  });
}

function drawTooltip(ctx, run, ui, y0) {
  const hover = ui.hoverPiece;
  if (!hover && !ui.ghost && !(ui.hintBad && ui.hint)) {
    drawGlassLegend(ctx, run, y0);
    return;
  }
  const type = hover?.type ?? ui.selected;
  ctx.globalAlpha = 0.85;
  drawPieceIcon(ctx, type, RIGHT_X + 30, y0 + 40);
  ctx.globalAlpha = 1;
  text(ctx, `${PIECES[type].name}`, RIGHT_X + 58, y0 + 26, 15, GOLD, 'left', 900);
  text(ctx, `${pieceCost(run, type)} ${NAMES.currency.toLowerCase()}`, RIGHT_X + 58, y0 + 46, 15, '#BDF4FF', 'left', 800);
  fitLine(ctx, PIECES[type].short, RIGHT_X + 12, y0 + 74, PANEL_W - 20, 15, INK);
  const keys = hover
    ? `${hover.type === 'pillar' ? '' : 'Q/E turn - '}X sell +${liftRefund(run, hover)}`
    : `${PIECE_ORDER.indexOf(type) + 1} select - click place`;
  // A placement the rules refuse says why (e.g. "Would seal the fountain").
  if (ui.hintBad && ui.hint) fitLine(ctx, ui.hint, RIGHT_X + 12, y0 + 96, PANEL_W - 20, 15, '#FF8A8A');
  else text(ctx, keys, RIGHT_X + 12, y0 + 96, 15, '#FFF2A8', 'left', 900);
}


/** Right column, 20 px apart: SCORE with BEST, QUARTZ, CHARMS, the GLASS legend (the buttons sit under it). */
function drawRightPanel(ctx, run, ui) {
  const x0 = RIGHT_X;
  panel(ctx, x0, 8, PANEL_W, 128);
  text(ctx, 'SCORE', x0 + 12, 30, 18, INK, 'left', 900);
  text(ctx, run.score.toLocaleString('en-US'), x0 + PANEL_W - 10, 66, 32, '#FFF2A8', 'right', 900);
  // BEST from the save (a difficulty never finished says so: no "BEST 0").
  text(ctx, ui.best > 0 ? `BEST ${ui.best.toLocaleString('en-US')}` : 'NO BEST YET', x0 + PANEL_W - 10, 90, 18, '#FFD9A0', 'right', 900);
  drawComboLine(ctx, run, x0, 120);
  panel(ctx, x0, 156, PANEL_W, 62);
  text(ctx, NAMES.currency, x0 + 12, 184, 18, INK, 'left', 900);
  drawQuartzGem(ctx, QUARTZ_ANCHOR.x, QUARTZ_ANCHOR.y);
  const pulse = Math.max(0, 1 - (run.time - run.feedback.quartzAt) / 0.3);
  text(ctx, String(run.quartz), x0 + PANEL_W - 10, 204, 32 + pulse * 8, pulse > 0 ? '#FFFFFF' : '#BDF4FF', 'right', 900);
  panel(ctx, x0, 238, PANEL_W, 90);
  drawCharmRow(ctx, run, 238);
  panel(ctx, x0, 348, PANEL_W, 126);
  drawTooltip(ctx, run, ui, 348);
}

/** SEAR combo under the score: the live multiplier, popping on each step. */
function drawComboLine(ctx, run, x0, y) {
  const mult = chainMultiplier(run.chain.count);
  const active = run.chain.count >= 2;
  const pop = Math.max(0, 1 - (run.time - run.feedback.searAt) / 0.25);
  text(ctx, `${NAMES.combo} x${active ? mult : 1}`, x0 + PANEL_W - 10, y + 8, active ? 26 + pop * 8 : 20, active ? '#FFF2A8' : 'rgba(255,246,223,0.7)', 'right', 900);
}

/** The play HUD's panels and text rows (props must keep clear of these). */
export function hudTextBoxes() {
  const top = BOARD_X - WALL;
  return [
    { text: 'left panel', x0: LEFT_X, y0: 8, x1: LEFT_X + PANEL_W, y1: 8 + LEFT_PANEL_H },
    { text: 'incoming', x0: LEFT_X, y0: 304, x1: LEFT_X + PANEL_W, y1: 304 + INCOMING_H },
    { text: 'sun bar', x0: top + 4, y0: 4, x1: top + BOARD_W + WALL * 2 - 4, y1: 62 },
    { text: 'win/lose banner', x0: top, y0: 68, x1: top + BOARD_W + WALL * 2, y1: 106 },
    { text: 'right panels and buttons', x0: RIGHT_X, y0: 8, x1: RIGHT_X + PANEL_W, y1: HUD_BUTTONS[0].y + HUD_BUTTONS[0].h },
    { text: 'hotbar and keys', x0: HOTBAR_X, y0: HOTBAR.y, x1: 1270, y1: HOTBAR.y + HOTBAR.h },
  ];
}



/** The WIN + LOSE banner's band segments as last drawn (for the screenshot checks). */
let friezeBox = null;
export function lastFrieze() {
  return friezeBox;
}

/**
 * The win and lose rules across the north wall, full width. When the live sun is in the north wall the
 * band opens around that gate and its SUN tag (gate and beam stay in view): WIN left, LOSE right, both
 * at the largest size that fits (LOSE may shorten).
 */
function drawWinLoseFrieze(ctx, run) {
  const { win, lose } = winLoseParts(run);
  const x = BOARD_X - WALL;
  const w = BOARD_W + WALL * 2;
  const ap = run.aperture;
  const notch = ap.wall === 'north' ? [BOARD_X + ap.c * CELL - 4, BOARD_X + (ap.c + 1) * CELL + 84] : null;
  const segs = notch ? [[x, notch[0]], [notch[1], x + w]] : [[x, x + w]];
  for (const [a, b] of segs) {
    ctx.fillStyle = 'rgba(31,63,153,0.96)';
    ctx.fillRect(a, 68, b - a, 38);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(a + 1, 69, b - a - 2, 36);
  }
  if (!notch) fitLine(ctx, `${win} - ${lose}`, 640, 99, w - 24, 32, '#FFF2A8', 'center');
  else {
    const [[l0, l1], [r0, r1]] = segs;
    const loses = [lose, lose.replace('the ', ''), lose.replace('the ', '').replace(' runs', '')];
    const fits = (str, room) => ctx.measureText(str).width * 0.92 <= room - 20;
    let pick = null;
    search: for (const size of [32, 28, 26, 24]) {
      ctx.font = `900 ${size}px ${FONT}`;
      if (!fits(win, l1 - l0)) continue;
      for (const l of loses) {
        if (fits(l, r1 - r0)) {
          pick = { size, lose: l };
          break search;
        }
      }
    }
    if (pick) {
      fitLine(ctx, win, (l0 + l1) / 2, 98, l1 - l0 - 20, pick.size, '#FFF2A8', 'center');
      fitLine(ctx, pick.lose, (r0 + r1) / 2, 98, r1 - r0 - 20, pick.size, '#FFB0B0', 'center');
    } else {
      // A gate near one end leaves one side too narrow: the wider side carries the whole sentence.
      const [a, b] = l1 - l0 >= r1 - r0 ? [l0, l1] : [r0, r1];
      fitLine(ctx, loses.map((l) => `${win} - ${l}`), (a + b) / 2, 98, b - a - 20, [32, 28, 26, 24, 22, 20, 18], '#FFF2A8', 'center');
    }
  }
  friezeBox = { segs, notch };
}

/**
 * The event banner: a lapis pill (render/banner.js) docked at the gate it talks about, e.g.
 * NEXT SUN: WEST / REAIM GLASS beside the west window. It fades while the mouse works the cells under it.
 */
function drawEventBanner(ctx, run, ui) {
  const b = bannerLayout(run);
  if (!b) return;
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  ctx.save();
  if (ui.hoverCell) {
    const hx = BOARD_X + ui.hoverCell.c * CELL;
    const hy = BOARD_Y + ui.hoverCell.r * CELL;
    if (hx < b.x1 && b.x0 < hx + CELL && hy < b.y1 && b.y0 < hy + CELL) ctx.globalAlpha = 0.45;
  }
  ctx.fillStyle = 'rgba(31,63,153,0.94)';
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(...b.nub[0]);
  ctx.lineTo(...b.nub[2]);
  ctx.lineTo(...b.nub[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(b.x0, b.y0, w, h, Math.min(24, h / 2));
  ctx.fill();
  ctx.stroke();
  const cx = b.x0 + w / 2;
  fitLine(ctx, b.head, cx, b.y0 + (b.sub ? 36 : 35), w - 24, [32, 28, 24], '#FFE27A', 'center');
  if (b.sub) fitLine(ctx, b.sub, cx, b.y0 + 63, w - 24, 20, INK, 'center');
  ctx.restore();
}

/** The hotbar's piece icons, in the same identity colours as the board's glass. */
export function drawPieceIcon(ctx, type, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#2A1608';
  ctx.lineWidth = 2;
  if (type !== 'pillar') {
    ctx.fillStyle = '#EBC68C';
    ctx.fillRect(-16, 4, 32, 12);
    ctx.fillStyle = '#B47E48';
    ctx.fillRect(-16, 16, 32, 5);
  }
  if (type === 'mirror' || type === 'splitter') {
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = type === 'mirror' ? '#2D5BD0' : '#16C9E0';
    ctx.fillRect(-19, -6, 38, 12);
    if (type === 'mirror') {
      ctx.fillStyle = '#E6F1FF';
      ctx.fillRect(-15, -3, 30, 6);
    }
    ctx.strokeRect(-19, -6, 38, 12);
  } else if (type === 'prism') {
    const faces = ['#FF4D3D', '#59B8FF', '#FFC531'];
    const tri = [[0, -18], [15, 9], [-15, 9]];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = faces[k];
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(...tri[k]);
      ctx.lineTo(...tri[(k + 1) % 3]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(...tri[0]);
    ctx.lineTo(...tri[1]);
    ctx.lineTo(...tri[2]);
    ctx.closePath();
    ctx.stroke();
  } else if (type === 'lens') {
    ctx.fillStyle = '#3FE0C5';
    ctx.beginPath();
    ctx.ellipse(0, -4, 8, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#D9713F';
    ctx.fillRect(-12, -22, 24, 40);
    ctx.fillStyle = '#9A4424';
    ctx.fillRect(-12, 8, 24, 10);
    ctx.fillStyle = '#2D5BD0';
    ctx.fillRect(-12, -16, 24, 5);
    ctx.strokeRect(-12, -22, 24, 40);
  }
  ctx.restore();
}

/** The controls, in one key line over two rows beside the hotbar (R needs a second press). */
/** A small speaker: box and cone, then two sound waves (or an X when muted). Centred on y. */
function drawSpeaker(ctx, x, y, muted, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x + 4, y - 3);
  ctx.lineTo(x + 9, y - 8);
  ctx.lineTo(x + 9, y + 8);
  ctx.lineTo(x + 4, y + 3);
  ctx.lineTo(x, y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  if (muted) {
    ctx.moveTo(x + 12, y - 4);
    ctx.lineTo(x + 19, y + 4);
    ctx.moveTo(x + 19, y - 4);
    ctx.lineTo(x + 12, y + 4);
  } else {
    for (const r of [4, 8]) {
      ctx.moveTo(x + 10 + r * Math.cos(-0.9), y + r * Math.sin(-0.9));
      ctx.arc(x + 10, y, r, -0.9, 0.9);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Two short key lines beside the hotbar during a sun. */
function drawKeyLine(ctx, x, ui) {
  text(ctx, 'Click sand: place - Q/E turn - X sell', x, HOTBAR.y + 32, 15, INK, 'left', 800);
  if (ui.restartArmed) text(ctx, 'PRESS R AGAIN TO RESTART', x, HOTBAR.y + 58, 15, '#FF8A8A', 'left', 900);
  else text(ctx, 'R restart - SPACE flare - ESC pause', x, HOTBAR.y + 58, 15, INK, 'left', 800);
}

/** Pause (two bars), speed (two arrows, gold while x2 is on) and sound (speaker, red X when muted). */
function drawHudButtons(ctx, ui) {
  for (const b of HUD_BUTTONS) {
    const on = (b.id === 'speed' && ui.fast) || (b.id === 'mute' && ui.muted);
    ctx.fillStyle = on ? (b.id === 'mute' ? '#7A2A3A' : GOLD) : 'rgba(31,63,153,0.85)';
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 12);
    ctx.fill();
    ctx.stroke();
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const ink = on && b.id === 'speed' ? '#3B1247' : INK;
    ctx.fillStyle = ink;
    if (b.id === 'pause') {
      ctx.fillRect(cx - 10, cy - 12, 7, 24);
      ctx.fillRect(cx + 3, cy - 12, 7, 24);
    } else if (b.id === 'speed') {
      for (const dx of [-12, 2]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy - 11);
        ctx.lineTo(cx + dx + 12, cy);
        ctx.lineTo(cx + dx, cy + 11);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.save();
      ctx.translate(cx - 15, cy);
      ctx.scale(1.5, 1.5);
      drawSpeaker(ctx, 0, 0, ui.muted, ui.muted ? '#FF8A8A' : INK);
      ctx.restore();
    }
  }
}

/** A build card's one-line effect, true to beams.js (the lens with this run's focus and reach). */
function cardEffect(run, type) {
  const mods = beamModsFor(run.boons);
  if (type === 'mirror') return ['turns light 90°', 'turns light'];
  if (type === 'splitter') return ['splits light in two', 'splits light in 2', 'splits in two'];
  if (type === 'lens') return [`x${mods.lensMult} for ${mods.lensReach} cells`, `focus x${mods.lensMult}`];
  if (type === 'pillar') return ['blocks beetles', 'blocks'];
  return ['burn, slow, pierce', 'burn/slow/pierce', 'fans 3 colours'];
}

function drawHotbar(ctx, run, ui) {
  PIECE_ORDER.forEach((type, i) => {
    const x = HOTBAR_X + i * (HOTBAR.w + HOTBAR.gap);
    const cost = pieceCost(run, type);
    const unlocked = pieceUnlocked(run, type);
    const afford = run.quartz >= cost && unlocked;
    const selected = ui.selected === type;
    ctx.globalAlpha = afford ? 1 : 0.45;
    panel(ctx, x, HOTBAR.y, HOTBAR.w, HOTBAR.h);
    if (selected) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 2, HOTBAR.y - 2, HOTBAR.w + 4, HOTBAR.h + 4);
    }
    // Card: hotkey and name on top, the piece with its cost (quartz) beside it, what it does underneath.
    text(ctx, String(i + 1), x + 8, HOTBAR.y + 19, 15, GOLD, 'left', 900);
    text(ctx, PIECES[type].name, x + 22, HOTBAR.y + 19, 15, INK, 'left', 900);
    text(ctx, unlocked ? `${cost}` : 'DAY 2', x + HOTBAR.w - (unlocked ? 22 : 8), HOTBAR.y + 49, unlocked ? 22 : 14, afford ? '#BDF4FF' : '#FF8A8A', 'right', 900);
    if (unlocked) {
      ctx.fillStyle = '#7FE8FF';
      ctx.beginPath();
      ctx.moveTo(x + HOTBAR.w - 13, HOTBAR.y + 33);
      ctx.lineTo(x + HOTBAR.w - 8, HOTBAR.y + 40);
      ctx.lineTo(x + HOTBAR.w - 13, HOTBAR.y + 48);
      ctx.lineTo(x + HOTBAR.w - 18, HOTBAR.y + 40);
      ctx.closePath();
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x + HOTBAR.w / 2, HOTBAR.y + 41);
    ctx.scale(0.72, 0.72);
    drawPieceIcon(ctx, type, 0, 0);
    ctx.restore();
    fitLine(ctx, cardEffect(run, type), x + HOTBAR.w / 2, HOTBAR.y + 70, HOTBAR.w - 10, 14, '#FFF2A8', 'center');
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
  // The key is in the key line (SPACE flare); the panel says what and whether it is ready.
  text(ctx, NAMES.flare, fx + 62, HOTBAR.y + 36, 20, INK, 'left', 900);
  const flareState = run.flareLeft > 0 ? 'BURNING' : ready ? 'READY' : run.phase === 'wave' ? 'USED' : 'NEXT SUN';
  text(ctx, flareState, fx + 62, HOTBAR.y + 60, 15, ready ? '#7DFFC4' : '#FFF2A8', 'left', 900);
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
    text(ctx, `START ${NAMES.sun}`, bx + 95, HOTBAR.y + 56, 20, INK, 'center', 900);
  } else {
    drawKeyLine(ctx, fx + 152, ui);
  }
}


export function drawHud(ctx, run, ui) {
  drawSunBar(ctx, run);
  drawWinLoseFrieze(ctx, run);
  drawEventBanner(ctx, run, ui);
  drawLeftPanel(ctx, run);
  drawRightPanel(ctx, run, ui);
  drawHotbar(ctx, run, ui);
  drawHudButtons(ctx, ui);
}
