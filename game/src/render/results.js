// The results hero art, drawn on the canvas beside the results plaque: the Hornback Titan flipped
// on its back and smoking on a scorched patch (or the drained fountain on a defeat), the 9-sun
// track with the skull crossed out, and the glass charms taken.
import { NAMES, WAVE_COUNT } from '../config.js';
import { boonById } from '../draft.js';
import { drawCharmBadge } from './charms.js';
import { fitOption } from './fit.js';
import { drawSunTrack } from './hud.js';
import { VIEW_H, VIEW_W } from './layout.js';

const HERO = { x: 182, y: 336 };

/** The Titan on its back: pale belly plates, legs kicked up, horns, smoke curling off it. */
function drawTitanCarcass(ctx, x, y, s, time) {
  ctx.save();
  ctx.translate(x, y);
  const scorch = ctx.createRadialGradient(0, 30 * s, 10, 0, 30 * s, 140 * s);
  scorch.addColorStop(0, 'rgba(60,25,10,0.65)');
  scorch.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = scorch;
  ctx.fillRect(-150 * s, -110 * s, 300 * s, 280 * s);
  ctx.strokeStyle = '#26091C';
  ctx.lineWidth = 9 * s;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      const lx = side * (34 + k * 26) * s;
      ctx.beginPath();
      ctx.moveTo(lx * 0.8, -20 * s);
      ctx.lineTo(lx * 1.25, -78 * s - k * 6 * s);
      ctx.lineTo(lx * 1.05, -112 * s);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#2A0E3A';
  ctx.beginPath();
  ctx.ellipse(0, 0, 110 * s, 64 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5 * s;
  ctx.stroke();
  ctx.fillStyle = '#C99AD6';
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(k * 34 * s, -6 * s, 15 * s, 40 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3A1458';
  ctx.beginPath();
  ctx.ellipse(118 * s, 6 * s, 34 * s, 28 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#F4E9D2';
  ctx.lineWidth = 8 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(136 * s, side * 14 * s);
    ctx.quadraticCurveTo(178 * s, side * 30 * s, 172 * s, side * 64 * s);
    ctx.stroke();
  }
  ctx.strokeStyle = '#FF8A8A';
  ctx.lineWidth = 4 * s;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(122 * s, side * 10 * s - 6 * s);
    ctx.lineTo(132 * s, side * 10 * s + 6 * s);
    ctx.moveTo(132 * s, side * 10 * s - 6 * s);
    ctx.lineTo(122 * s, side * 10 * s + 6 * s);
    ctx.stroke();
  }
  for (let k = 0; k < 7; k++) {
    const t = (time * 0.35 + k / 7) % 1;
    ctx.fillStyle = `rgba(120,95,85,${0.55 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc((k - 3) * 22 * s + Math.sin(t * 6 + k) * 10 * s, -60 * s - t * 170 * s, (14 + t * 26) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The fountain run dry: a cracked empty basin. */
function drawDrainedFountain(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#A8723F';
  ctx.beginPath();
  ctx.ellipse(0, 14 * s, 120 * s, 66 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F0CF97';
  ctx.beginPath();
  ctx.ellipse(0, 0, 120 * s, 66 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7A4A22';
  ctx.beginPath();
  ctx.ellipse(0, 0, 92 * s, 46 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3A1A08';
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(-60 * s, -10 * s);
  ctx.lineTo(-20 * s, 6 * s);
  ctx.lineTo(10 * s, -12 * s);
  ctx.lineTo(50 * s, 14 * s);
  ctx.stroke();
  ctx.restore();
}

function caption(ctx, str, x, y, size, color) {
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#3A1A08';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Draw the first wording that fits maxW at >= 92% width (render/fit.js), squeezed that little. */
export function fitText(ctx, options, x, y, maxW) {
  const { str, squeeze } = fitOption(ctx, options, maxW);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squeeze, 1);
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

/** YOUR BUILD: each glass charm taken (glyph, name, xN for repeats) and how many were offered. */
function drawYourBuild(ctx, run) {
  ctx.textAlign = 'left';
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.fillStyle = '#FFE27A';
  ctx.fillText('YOUR BUILD', 40, 570);
  const counts = new Map();
  for (const id of run.boons) counts.set(id, (counts.get(id) ?? 0) + 1);
  [...counts].slice(0, 8).forEach(([id, n], k) => {
    const x = 40 + (k % 2) * 164;
    const y = 604 + Math.floor(k / 2) * 38;
    const boon = boonById(id);
    drawCharmBadge(ctx, boon, x + 15, y, 15);
    ctx.font = '800 20px system-ui, sans-serif';
    ctx.fillStyle = '#FFF6DF';
    ctx.textAlign = 'left';
    const times = n > 1 ? ` x${n}` : '';
    fitText(ctx, [`${boon.name}${times}`, `${NAMES.charmShort[id]}${times}`], x + 36, y + 7, 120);
  });
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillStyle = '#FFE27A';
  fitText(ctx, `${run.boons.length} picked from ${run.stats.offersSeen} offers`, 40, 762, 300);
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Everything the results screen shows on the canvas (the DOM plaque sits to the right). */
export function drawResultsHero(ctx, run, time) {
  ctx.fillStyle = 'rgba(70,40,15,0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const won = run.phase === 'won';
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(24, 164, 336, 58, 14);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawSunTrack(ctx, 48, 193, 36, 12, run.stats.wavesCleared, won ? -1 : run.waveIndex);
  if (won) {
    drawTitanCarcass(ctx, HERO.x, HERO.y, 0.72, time);
    if (run.stats.titanSeconds !== undefined) {
      caption(ctx, 'TITAN BURNED IN', 192, 474, 30, '#FFE27A');
      caption(ctx, clock(run.stats.titanSeconds), 192, 514, 40, '#FFFFFF');
    }
  } else {
    drawDrainedFountain(ctx, HERO.x, HERO.y, 0.8);
  }
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(24, 536, 336, 240, 16);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawYourBuild(ctx, run);
}
