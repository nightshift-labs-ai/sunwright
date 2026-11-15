// One frame of the game: courtyard, glass, shrine, beetles, light, effects, then the HUD.
// The draft dims the board so the new opening's beam (through the current layout) stands out;
// a win floods the courtyard with sunrise, a defeat drains the light.
import { shadowVectorFor } from '../sun.js';
import { drawBeamGhost, drawBeams, drawFx, drawScreenFx, shakeOffset } from './fx.js';
import { routeCells } from '../pathing.js';
import { drawCourtyard, drawPiece, drawPieces, drawShrine } from './board.js';
import { drawEnemies } from './beetles.js';
import { drawHud } from './hud.js';
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

function drawSunrise(ctx, time, since) {
  const k = Math.min(1, since / 1.5);
  const g = ctx.createLinearGradient(VIEW_W, 0, 0, VIEW_H);
  g.addColorStop(0, `rgba(255,236,170,${0.55 * k})`);
  g.addColorStop(0.5, `rgba(255,190,90,${0.25 * k})`);
  g.addColorStop(1, `rgba(255,150,80,${0.1 * k})`);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
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
  drawCourtyard(ctx, run, time);
  const shadow = shadowVectorFor(run.aperture.wall);
  drawPieces(ctx, run.grid, shadow, time);
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
  } else if (phase !== 'lost') {
    const alpha = phase === 'wave' || phase === 'won' ? 1 : phase === 'build' ? 0.8 : 0.95;
    drawBeams(ctx, ui.ghostTrace ?? run.trace, { alpha, flare: run.flareLeft > 0 ? 1 : 0, time });
  }
  drawFx(ctx, fx);
  ctx.restore();
  if (phase === 'won') drawSunrise(ctx, time, time - run.endedAt);
  if (frame.showHud) drawHud(ctx, run, ui);
  drawScreenFx(ctx, fx);
}
