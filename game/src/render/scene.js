// One frame of the game: courtyard, glass, shrine, beetles, light, effects, then the HUD.
// The draft dims the board so the new opening's beam (through the current layout) stands out;
// a win floods the courtyard with sunrise, a defeat drains the light.
import { drawBeamGhost, drawBeams, drawFx, drawNextSunGhost, drawScreenFx, shakeOffset } from './fx.js';
import { drawHud } from './hud.js';
import { drawBoardTags, drawCourtyard, drawMarchLines, drawPiece, drawPieces, drawSandSurround, drawShrine } from './board.js';
import { drawEnemies } from './beetles.js';
import { drawResultsHero } from './results.js';
import { shadowVectorFor, sunApertureFor } from '../sun.js';
import { beamModsFor, traceBeams } from '../beams.js';
import { NAMES, WAVE_COUNT } from '../config.js';
import { routeCells } from '../pathing.js';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, CELL, VIEW_H, VIEW_W, WALL, WALL_FRONT } from './layout.js';

function drawCellCursor(ctx, cell, ok) {
  const x = BOARD_X + cell.c * CELL;
  const y = BOARD_Y + cell.r * CELL;
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.9)' : 'rgba(255,90,90,0.95)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
  if (!ok) {
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 16);
    ctx.lineTo(x + CELL - 16, y + CELL - 16);
    ctx.moveTo(x + CELL - 16, y + 16);
    ctx.lineTo(x + 16, y + CELL - 16);
    ctx.stroke();
  }
}

/** Where the title's demo courtyard sits: centred right of the menu card, below the hook. */
const TITLE_DEMO = { x: 935, y: 562, scale: 0.7 };

const nextCache = { run: null, version: -1, value: null };

/** The next sun's beam through the current glass, re-traced only when the layout changes. */
function nextSunTrace(run) {
  if (nextCache.run !== run || nextCache.version !== run.layoutVersion) {
    const ap = sunApertureFor(run.seed, run.waveIndex + 1);
    nextCache.value = { trace: traceBeams(run.grid, ap, beamModsFor(run.boons)), wall: ap.phase.wallName[0] };
    nextCache.run = run;
    nextCache.version = run.layoutVersion;
  }
  return nextCache.value;
}


/**
 * frame: { run, ui, fx, time, showHud, shake, shrineHurtAgo }
 * ui: { ghost: { piece, c, r, ok } | null, ghostTrace, hoverCell, selected, hint, hintBad }
 */
export function drawFrame(ctx, frame) {
  const { run, ui, fx, time } = frame;
  const phase = run.phase;
  ctx.save();
  const s = frame.shake ? shakeOffset(fx, time) : { x: 0, y: 0 };
  ctx.translate(s.x, s.y);
  if (frame.titleTraces) {
    // Title: the courtyard sits to the right of the menu card, every sun window ablaze.
    drawSandSurround(ctx);
    ctx.translate(TITLE_DEMO.x, TITLE_DEMO.y);
    ctx.scale(TITLE_DEMO.scale, TITLE_DEMO.scale);
    ctx.translate(-VIEW_W / 2, -390);
  }
  drawCourtyard(ctx, run, time, !!frame.titleTraces);
  if (frame.showHud && (phase === 'build' || phase === 'wave')) drawMarchLines(ctx, run, time);
  const shadow = shadowVectorFor(run.aperture.wall);
  const showPlan = frame.showHud && (phase === 'wave' || phase === 'build');
  const next = showPlan && run.waveIndex + 1 < WAVE_COUNT ? nextSunTrace(run) : null;
  drawPieces(ctx, run.grid, shadow, time, showPlan ? run.trace.lit : null, next && { lit: next.trace.lit, wall: next.wall });
  drawShrine(ctx, run, shadow, time, frame.shrineHurtAgo ?? 9);
  if (ui.ghost) {
    drawPiece(ctx, ui.ghost.piece, ui.ghost.c, ui.ghost.r, shadow, time, 0.55);
    drawCellCursor(ctx, ui.ghost, ui.ghost.ok);
  } else if (ui.hoverCell && (phase === 'build' || phase === 'wave')) {
    drawCellCursor(ctx, ui.hoverCell, true);
  }
  drawEnemies(ctx, run, time);
  if (phase === 'draft' || phase === 'lost') {
    ctx.fillStyle = 'rgba(70,40,15,0.35)';
    ctx.fillRect(BOARD_X - WALL, BOARD_Y - WALL_FRONT - WALL, BOARD_W + WALL * 2, BOARD_H + WALL_FRONT + WALL * 2);
  }
  if (phase === 'draft') {
    const onPath = new Set(routeCells(run.grid, run.flow).filter((i) => run.trace.lit[i] > 0)).size;
    drawBeamGhost(ctx, run.trace, onPath, time);
  } else if (frame.titleTraces) {
    for (const trace of frame.titleTraces) drawBeams(ctx, trace, { alpha: 1, flare: 0, time });
  } else if (phase !== 'lost') {
    if (frame.showHud && (phase === 'wave' || phase === 'build') && run.waveIndex + 1 < WAVE_COUNT) {
      const next = nextSunTrace(run);
      drawNextSunGhost(ctx, next.trace, `NEXT ${NAMES.sun} (${next.wall})`, time);
    }
    const alpha = phase === 'wave' || phase === 'won' ? 1 : phase === 'build' ? 0.8 : 0.95;
    drawBeams(ctx, ui.ghostTrace ?? run.trace, { alpha, flare: run.flareLeft > 0 ? 1 : 0, time });
  }
  drawFx(ctx, fx);
  if (phase !== 'draft' && !frame.resultsHero) drawBoardTags(ctx, run);
  ctx.restore();
  if (frame.resultsHero) drawResultsHero(ctx, run, time);
  if (frame.showHud) drawHud(ctx, run, ui);
  drawScreenFx(ctx, fx);
}
