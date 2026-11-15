// Beetle sprites drawn in code: magenta Scuttlers with walking legs, violet Veerwings with
// beating wings, armour-plated Shellbacks, and the Hornback Titan with her opening carapace.
import { carapaceOpen } from '../enemies.js';
import { CELL, toScreenX, toScreenY } from './layout.js';

const HEADING_ANGLE = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

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
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
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

function drawHead(ctx, rx, eye) {
  ctx.fillStyle = '#5A1E6E';
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

function drawHealthBar(ctx, e, x, y, w) {
  if (e.hp >= e.maxHp) return;
  ctx.fillStyle = 'rgba(40,10,40,0.7)';
  ctx.fillRect(x - w / 2, y, w, 5);
  ctx.fillStyle = e.def.boss ? '#FF4D8D' : '#FFE14D';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 5);
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

export function drawEnemy(ctx, e, time) {
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
    ctx.fillStyle = 'rgba(214,120,255,0.85)';
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
    drawShell(ctx, size * 0.7, size * 0.38, '#9A3BC9', '#5A1E6E', '#3B1247');
    drawHead(ctx, size * 0.6, '#FFE14D');
  } else if (e.type === 'shellback') {
    drawLegs(ctx, size * 1.1, phase * 0.6);
    drawShell(ctx, size, size * 0.8, '#7A2A8C', '#3B1247', '#F2C14E');
    ctx.strokeStyle = '#F2C14E';
    ctx.lineWidth = 2;
    for (const k of [-0.4, 0.15]) {
      ctx.beginPath();
      ctx.arc(size * k, 0, size * 0.6, -1.1, 1.1);
      ctx.stroke();
    }
    drawHead(ctx, size * 0.8, '#FFE14D');
  } else if (e.type === 'glassback') {
    drawLegs(ctx, size * 1.05, phase * 0.8);
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.45, '#BFD9F2');
    g.addColorStop(1, '#6F8FC4');
    drawShell(ctx, size, size * 0.78, g, '#3B1247', '#F2C14E');
    ctx.strokeStyle = '#B0307A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawHead(ctx, size * 0.8, '#FFE14D');
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
        ctx.fillStyle = '#2A0E3A';
        ctx.beginPath();
        ctx.ellipse(-size * 0.15, side * size * 0.75, size * 0.8, size * 0.32, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      drawShell(ctx, size, size * 0.85, '#3A1458', '#1E0A30', '#B0307A');
      ctx.strokeStyle = '#FF4D8D';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawHead(ctx, size * 0.8, '#FF4D8D');
  } else {
    drawLegs(ctx, size, phase);
    drawShell(ctx, size, size * 0.72, '#B0307A', '#5A1E6E', '#5A1E6E');
    drawHead(ctx, size * 0.8, '#FFE14D');
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
  drawHealthBar(ctx, e, x, y - size - 10, Math.max(26, size * 1.6));
  if (e.shielded) {
    ctx.fillStyle = '#F2C14E';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARMOUR', x, y + size + 14);
  }
}

export function drawEnemies(ctx, run, time) {
  // Walkers first, flyers above them.
  for (const e of run.enemies) if (!e.def.flies) drawEnemy(ctx, e, time);
  for (const e of run.enemies) if (e.def.flies) drawEnemy(ctx, e, time);
}
