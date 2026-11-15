// The results hero art, drawn on the canvas beside the results plaque: the Hornback Titan flipped
// on its back and smoking on a scorched patch (or the drained fountain on a defeat), the 9-sun
// track with the skull crossed out, and the glass charms taken.
import { WAVE_COUNT } from '../config.js';
import { boonById } from '../draft.js';
import { drawCharmBadge } from './charms.js';
import { drawSunTrack } from './hud.js';
import { VIEW_H, VIEW_W } from './layout.js';

const HERO = { x: 178, y: 400 };

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

/** Everything the results screen shows on the canvas (the DOM plaque sits to the right). */
export function drawResultsHero(ctx, run, time) {
  ctx.fillStyle = 'rgba(70,40,15,0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const won = run.phase === 'won';
  if (won) drawTitanCarcass(ctx, HERO.x, HERO.y, 0.9, time);
  else drawDrainedFountain(ctx, HERO.x, HERO.y, 1);
  ctx.fillStyle = 'rgba(31,63,153,0.9)';
  ctx.beginPath();
  ctx.roundRect(20, 586, 392, 196, 16);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 4;
  ctx.stroke();
  drawSunTrack(ctx, 50, 636, 42, 15, run.stats.wavesCleared, won ? -1 : run.waveIndex);
  run.boons.slice(0, 8).forEach((id, k) => drawCharmBadge(ctx, boonById(id), 52 + (k % 4) * 94, 704 + Math.floor(k / 4) * 50, 22));
  if (run.boons.length === 0) {
    ctx.font = '900 30px system-ui, sans-serif';
    ctx.fillStyle = '#FFF6DF';
    ctx.textAlign = 'center';
    ctx.fillText(`${run.stats.wavesCleared}/${WAVE_COUNT}`, 216, 720);
  }
}
