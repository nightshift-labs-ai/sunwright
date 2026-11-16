// The results hero art, drawn on the canvas beside the results plaque: the Hornback Titan flipped
// on its back and smoking on a scorched patch (or the drained fountain on a defeat), the 9-sun
// track with the skull crossed out, and the glass charms taken.
import { FOUNTAIN_MAX, NAMES, WAVE_COUNT } from '../config.js';
import { boonById } from '../draft.js';
import { drawCharmBadge } from './charms.js';
import { fitOption } from './fit.js';
import { drawSunTrack } from './hud.js';
import { VIEW_H, VIEW_W } from './layout.js';

const HERO = { x: 172, y: 344 };

/** The Titan burned to ash, on its back: charcoal shell, ash-grey plates with glowing cracks, legs up, smoke and embers. */
function drawTitanCarcass(ctx, x, y, s, time) {
  ctx.save();
  ctx.translate(x, y);
  const scorch = ctx.createRadialGradient(0, 30 * s, 10, 0, 30 * s, 140 * s);
  scorch.addColorStop(0, 'rgba(60,25,10,0.65)');
  scorch.addColorStop(1, 'rgba(60,25,10,0)');
  ctx.fillStyle = scorch;
  ctx.fillRect(-150 * s, -110 * s, 300 * s, 280 * s);
  ctx.strokeStyle = '#26201E';
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
  ctx.fillStyle = '#3A3434';
  ctx.beginPath();
  ctx.ellipse(0, 0, 110 * s, 64 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 5 * s;
  ctx.stroke();
  ctx.fillStyle = '#B8ADA6';
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(k * 34 * s, -6 * s, 15 * s, 40 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ember cracks still glowing in the ash plates.
  ctx.strokeStyle = `rgba(255,${130 + Math.round(Math.sin(time * 5) * 30)},50,0.9)`;
  ctx.lineWidth = 3 * s;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(k * 34 * s - 6 * s, -34 * s);
    ctx.lineTo(k * 34 * s + 5 * s, -12 * s);
    ctx.lineTo(k * 34 * s - 4 * s, 8 * s);
    ctx.lineTo(k * 34 * s + 4 * s, 26 * s);
    ctx.stroke();
  }
  ctx.fillStyle = '#4A403C';
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
    ctx.fillStyle = `rgba(120,110,105,${0.55 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc((k - 3) * 22 * s + Math.sin(t * 6 + k) * 10 * s, -60 * s - t * 170 * s, (14 + t * 26) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Embers drifting up out of the smoke.
  for (let k = 0; k < 9; k++) {
    const t = (time * 0.5 + k / 9) % 1;
    ctx.fillStyle = `rgba(255,${150 + (k % 3) * 35},60,${1 - t})`;
    ctx.beginPath();
    ctx.arc((k - 4) * 18 * s + Math.sin(t * 8 + k * 2) * 14 * s, -30 * s - t * 140 * s, 3.5 * s, 0, Math.PI * 2);
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
  // One 48 px icon per charm taken (4 + 3 grid) with its short name, an xN badge on repeats.
  const counts = new Map();
  for (const id of run.boons) counts.set(id, (counts.get(id) ?? 0) + 1);
  const icons = [...counts].slice(0, 8);
  icons.forEach(([id, n], k) => {
    const row = Math.floor(k / 4);
    const inRow = Math.min(4, icons.length - row * 4);
    const x = 192 + (k % 4 - (inRow - 1) / 2) * 80;
    const y = 608 + row * 76;
    drawCharmBadge(ctx, boonById(id), x, y, 24);
    // Its short name under it (Mend, Long Sear, ...).
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillStyle = '#FFF6DF';
    ctx.textAlign = 'center';
    fitText(ctx, NAMES.charmShort[id], x, y + 41, 78);
    if (n > 1) {
      ctx.fillStyle = '#F2C14E';
      ctx.beginPath();
      ctx.arc(x + 20, y - 18, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3B1247';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '900 15px system-ui, sans-serif';
      ctx.fillStyle = '#3B1247';
      ctx.fillText(`x${n}`, x + 20, y - 13);
    }
  });
  lastBuildIcons = icons.length;
  ctx.textAlign = 'left';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillStyle = '#FFE27A';
  fitText(ctx, `${run.boons.length} picked from ${run.stats.offersSeen} offers`, 40, 762, 300);
}

let lastBuildIcons = 0;

/** How many charm icons YOUR BUILD drew last (for the screenshot checks). */
export function buildIconCount() {
  return lastBuildIcons;
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Everything the results screen shows on the canvas (the DOM plaque sits to the right). */
let chartDrawn = null;
/** The per-sun chart as last drawn (for the screenshot checks). */
export function lastSunChart() {
  return chartDrawn;
}

/**
 * Beetles burned per sun (gold bars) with the fountain at each sun's end (cyan line, 0-10), from the
 * run's own record (stats.perSun): one bar per sun played, 9 or more in ECLIPSE.
 */
function drawSunChart(ctx, run, x, y, w, h) {
  const suns = run.stats.perSun;
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = '900 14px system-ui, sans-serif';
  ctx.fillStyle = '#FFE27A';
  ctx.fillText('BURNED PER SUN', x + 10, y + 18);
  ctx.fillStyle = '#7FE8FF';
  ctx.textAlign = 'right';
  ctx.fillText('- FOUNTAIN', x + w - 10, y + 18);
  const n = Math.max(suns.length, 1);
  const top = y + 26;
  const base = y + h - 18;
  const left = x + 12;
  const span = w - 24;
  const slot = span / Math.max(n, WAVE_COUNT);
  const most = Math.max(1, ...suns.map((s) => s.kills));
  suns.forEach((s, k) => {
    const bh = ((base - top) * s.kills) / most;
    ctx.fillStyle = '#F2C14E';
    ctx.fillRect(left + k * slot + 3, base - bh, slot - 6, bh);
    ctx.fillStyle = '#FFF6DF';
    ctx.textAlign = 'center';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText(String(k + 1), left + k * slot + slot / 2, base + 13);
  });
  ctx.strokeStyle = '#7FE8FF';
  ctx.lineWidth = 3;
  ctx.beginPath();
  suns.forEach((s, k) => {
    const px = left + k * slot + slot / 2;
    const py = base - ((base - top) * s.fountain) / FOUNTAIN_MAX;
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  chartDrawn = suns.map((s) => ({ kills: s.kills, fountain: s.fountain }));
}

export function drawResultsHero(ctx, run, time) {
  ctx.fillStyle = 'rgba(70,40,15,0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const won = run.phase === 'won';
  if (won) {
    // A won run needs no sun track (SUNS 9/9 and the WON chip say it): the Titan takes the space.
    drawTitanCarcass(ctx, HERO.x, HERO.y - 56, 0.72, time);
    if (run.stats.titanSeconds !== undefined) {
      caption(ctx, 'TITAN BURNED IN', 140, 404, 22, '#FFE27A');
      caption(ctx, clock(run.stats.titanSeconds), 304, 406, 32, '#FFFFFF');
    }
  } else {
    ctx.fillStyle = 'rgba(31,63,153,0.92)';
    ctx.beginPath();
    ctx.roundRect(24, 164, 336, 58, 14);
    ctx.fill();
    ctx.strokeStyle = '#F2C14E';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawSunTrack(ctx, 48, 193, 36, 12, run.stats.wavesCleared, run.waveIndex);
    drawDrainedFountain(ctx, HERO.x, HERO.y - 30, 0.7);
  }
  drawSunChart(ctx, run, 24, 418, 336, 110);
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(24, 536, 336, 240, 16);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawYourBuild(ctx, run);
}
