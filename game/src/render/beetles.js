// Beetle sprites drawn in code, one colour per kind (the INCOMING icons are these same sprites):
// magenta Scuttlers, violet Veerwings with beating wings, bronze armour-plated Shellbacks, cyan
// Glassbacks, and the plum Hornback Titan with her opening carapace.
import { armourOf, carapaceOpen } from '../enemies.js';
import { CELL, toScreenX, toScreenY } from './layout.js';

const HEADING_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

/** Each kind's shell radii (x size): where the searing glow is painted. */
const SHELL_SIZE = { scuttler: [1, 0.72], veerwing: [0.7, 0.38], shellback: [1, 0.8], glassback: [1, 0.78], titan: [1, 0.85] };

/** Each kind's shell (top), underside and head; husks and the results Titan use the same. */
export const BEETLE_COLORS = {
  scuttler: { top: '#C2307E', under: '#6A1A4A', head: '#5A1446' },
  veerwing: { top: '#7B4BE0', under: '#3E2183', head: '#3E2183', wing: 'rgba(176,140,255,0.85)' },
  shellback: { top: '#B86E2C', under: '#5C3210', head: '#4A2810', light: '#E7A75A', dark: '#7A4317' },
  glassback: { top: '#6FE6F2', under: '#0D4F66', head: '#0D4F66', light: '#E9FFFF', dark: '#1597B8' },
  titan: { top: '#6E2160', under: '#33102D', head: '#4A1640' },
};

function drawLegs(ctx, len, phase) {
  ctx.strokeStyle = '#3B1247';
  ctx.lineWidth = 2.5;
  for (let k = -1; k <= 1; k++) {
    const swing = Math.sin(phase + k * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(k * len * 0.35, -len * 0.3);
    ctx.lineTo(k * len * 0.45 + swing, -len * 0.75);
    ctx.moveTo(k * len * 0.35, len * 0.3);
    ctx.lineTo(k * len * 0.45 - swing, len * 0.75);
    ctx.stroke();
  }
}

function drawShell(ctx, rx, ry, top, under, ridge) {
  ctx.fillStyle = under;
  ctx.beginPath();
  ctx.ellipse(-1, 2, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#26091C';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#26091C';
  ctx.stroke();
  ctx.strokeStyle = ridge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.85, 0);
  ctx.lineTo(rx * 0.55, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.2, -ry * 0.42, rx * 0.45, ry * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(ctx, rx, eye, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(rx * 0.95, 0, rx * 0.36, rx * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(rx * 1.08, -rx * 0.2, 2.6, 0, Math.PI * 2);
  ctx.arc(rx * 1.08, rx * 0.2, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawBurnGlow(ctx, power, size) {
  if (power <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 1.4);
  g.addColorStop(0, `rgba(255,220,90,${Math.min(0.75, 0.25 + power / 40)})`);
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-size * 1.5, -size * 1.5, size * 3, size * 3);
  ctx.restore();
}

/** Heat bar: fills as the beetle sears, glowing from orange to white as it nears death. */
function drawHeatBar(ctx, e, x, y, w) {
  if (e.hp >= e.maxHp) return;
  const heat = Math.min(1, Math.max(0, 1 - e.hp / e.maxHp));
  ctx.fillStyle = 'rgba(38,9,28,0.8)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 7);
  ctx.fillStyle = `rgb(255,${Math.round(130 + 125 * heat)},${Math.round(40 + 215 * heat)})`;
  ctx.fillRect(x - w / 2, y, w * heat, 5);
}

/** Little flickering flames on a beetle set burning by red prism light. */
function drawFlames(ctx, x, y, size, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 3; k++) {
    const fx = x + (k - 1) * size * 0.5;
    const h = size * (0.7 + Math.sin(t * 14 + k * 2) * 0.25);
    ctx.fillStyle = k % 2 ? 'rgba(255,90,40,0.85)' : 'rgba(255,200,60,0.85)';
    ctx.beginPath();
    ctx.moveTo(fx - 5, y - size * 0.2);
    ctx.quadraticCurveTo(fx, y - size * 0.2 - h * 1.4, fx + 5, y - size * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawEnemy(ctx, e, time, labels = true) {
  const x = toScreenX(e.x);
  const y = toScreenY(e.y);
  const size = e.def.size * CELL;
  ctx.save();
  ctx.translate(x, y);
  if (!e.def.flies) {
    ctx.fillStyle = 'rgba(91,58,30,0.3)';
    ctx.beginPath();
    ctx.ellipse(4, 6, size * 0.9, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBurnGlow(ctx, e.litPower, size);
  ctx.rotate(HEADING_ANGLE[e.heading]);
  const phase = time * 18 + e.id;
  if (e.type === 'veerwing') {
    const flap = 0.55 + Math.abs(Math.sin(phase * 0.9)) * 0.6;
    ctx.fillStyle = BEETLE_COLORS.veerwing.wing;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-2, side * size * 0.75 * flap, size * 0.75, size * 0.55 * flap, side * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFE14D';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(-2, side * size * 0.75 * flap, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    const c = BEETLE_COLORS.veerwing;
    drawShell(ctx, size * 0.7, size * 0.38, c.top, c.under, '#2A145C');
    drawHead(ctx, size * 0.6, '#FFE14D', c.head);
  } else if (e.type === 'shellback') {
    drawLegs(ctx, size * 1.1, phase * 0.6);
    // Bronze: a metallic sweep, gold rib plates.
    const c = BEETLE_COLORS.shellback;
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, c.light);
    g.addColorStop(0.5, c.top);
    g.addColorStop(1, c.dark);
    drawShell(ctx, size, size * 0.8, g, c.under, '#F2C14E');
    ctx.strokeStyle = '#F2C14E';
    ctx.lineWidth = 2;
    for (const k of [-0.4, 0.15]) {
      ctx.beginPath();
      ctx.arc(size * k, 0, size * 0.6, -1.1, 1.1);
      ctx.stroke();
    }
    drawHead(ctx, size * 0.8, '#FFE14D', c.head);
  } else if (e.type === 'glassback') {
    drawLegs(ctx, size * 1.05, phase * 0.8);
    const c = BEETLE_COLORS.glassback;
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, c.light);
    g.addColorStop(0.45, c.top);
    g.addColorStop(1, c.dark);
    drawShell(ctx, size, size * 0.78, g, c.under, '#F2C14E');
    ctx.strokeStyle = '#0E6F86';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawHead(ctx, size * 0.8, '#FFE14D', c.head);
  } else if (e.type === 'titan') {
    const open = carapaceOpen(e);
    drawLegs(ctx, size * 1.2, phase * 0.4);
    if (open) {
      ctx.fillStyle = '#FF4D8D';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.75, size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      for (const side of [-1, 1]) {
        ctx.fillStyle = BEETLE_COLORS.titan.under;
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, side * size * 0.75, size * 0.8, size * 0.32, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      drawShell(ctx, size, size * 0.85, BEETLE_COLORS.titan.top, BEETLE_COLORS.titan.under, '#B0307A');
      ctx.strokeStyle = '#FF4D8D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHead(ctx, size * 0.8, '#FF4D8D', BEETLE_COLORS.titan.head);
  } else {
    drawLegs(ctx, size, phase);
    const c = BEETLE_COLORS.scuttler;
    drawShell(ctx, size, size * 0.72, c.top, c.under, c.under);
    drawHead(ctx, size * 0.8, '#FFE14D', c.head);
  }
  // Searing: the shell glows orange, then white as the heat (damage taken) rises.
  if ((e.litPower > 0 && !e.shielded) || e.burn > 0) {
    const heat = Math.min(1, Math.max(0, 1 - e.hp / e.maxHp));
    const [rx, ry] = SHELL_SIZE[e.type] ?? SHELL_SIZE.scuttler;
    ctx.fillStyle = `rgba(255,${Math.round(140 + 110 * heat)},${Math.round(40 + 195 * heat)},${0.3 + 0.4 * heat})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * rx, size * ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  if (e.burn > 0) drawFlames(ctx, x, y, size, time + e.id);
  if (e.slow > 0) {
    ctx.strokeStyle = 'rgba(150,215,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHeatBar(ctx, e, x, y - size - 12, Math.max(30, size * 1.6));
  const tag = !labels ? '' : e.shielded ? `ARMOUR ${armourOf(e)}` : e.deflecting ? 'DEFLECTS' : '';
  if (tag) {
    ctx.font = '900 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#26091C';
    ctx.strokeText(tag, x, y + size + 16);
    ctx.fillStyle = e.shielded ? '#F2C14E' : '#BFE6FF';
    ctx.fillText(tag, x, y + size + 16);
  }

}

/** labels false (the title demo): no ARMOUR / DEFLECTS tags under the beetles. */
export function drawEnemies(ctx, run, time, labels = true) {
  // Walkers first, flyers above them.
  for (const e of run.enemies) if (!e.def.flies) drawEnemy(ctx, e, time, labels);
  for (const e of run.enemies) if (e.def.flies) drawEnemy(ctx, e, time, labels);
}
