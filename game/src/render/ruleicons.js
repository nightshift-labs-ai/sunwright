// Small icons for the title's rules table, drawn on 36 px canvases from the game's own glyphs:
// the fountain droplet, a mirror, the sun, the SEAR flame, the Titan skull, a gold star, a dry drop.
import { drawCharmGlyph } from './charms.js';
import { drawPieceIcon, drawTitanSkull } from './hud.js';
import { drawEnemy } from './beetles.js';
import { ENEMIES } from '../config.js';

function droplet(ctx, x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 0.1, x + r * 0.75, y + r * 0.85, x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 0.75, y + r * 0.85, x - r * 0.9, y - r * 0.1, x, y - r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFD34D';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3B1247';
  ctx.stroke();
}

const CELL_OFFSET = 0;

/** Draw one rules-table icon centred in a size x size canvas. */
export function drawRuleIcon(ctx, kind, size) {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);
  if (kind === 'goal') {
    // A Scuttler (the game's own sprite) heading for a fountain droplet.
    droplet(ctx, c + 9, c + 3, c - 9, '#3FD0E0', '#0D4F66');
    ctx.save();
    ctx.translate(-CELL_OFFSET, 0);
    drawEnemy(ctx, { id: 1, type: 'scuttler', def: { ...ENEMIES.scuttler, size: 0.22 }, heading: 0, hp: 1, maxHp: 1, litPower: 0, age: 0, x: (c - 7) / 60 - 250 / 60 + CELL_OFFSET / 60, y: c / 60 - 140 / 60, burn: 0, slow: 0 }, 0, false);
    ctx.restore();
  }
  else if (kind === 'lose') droplet(ctx, c, c + 1, c - 3, null, '#FF6B5E');
  else if (kind === 'win') star(ctx, c, c + 1, c - 2);
  else if (kind === 'titan') drawTitanSkull(ctx, c, c, c * 0.62, false, '#FF6B5E');
  else if (kind === 'build') {
    ctx.save();
    ctx.translate(c, c);
    ctx.scale(size / 52, size / 52);
    drawPieceIcon(ctx, 'mirror', 0, 0);
    ctx.restore();
  } else drawCharmGlyph(ctx, kind === 'sun' ? 'highsun' : 'spreading', c, c, c - 1);
}
