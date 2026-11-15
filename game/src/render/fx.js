// Light and juice: additive sunbeams with starbursts at bounces, sparks on burning beetles,
// smoke and flipped husks on kills, quartz that fly to the HUD counter, floating CHAIN text,
// screen shake, the Flare flash and the red hurt vignette. Effects advance with sim time.
import { NAMES, WAVE_COUNT } from '../config.js';
import { beamModsFor, traceBeams } from '../beams.js';
import { sunApertureFor } from '../sun.js';
import { currentBanner } from '../announce.js';
import { BOARD_H, BOARD_W, BOARD_X, BOARD_Y, QUARTZ_ANCHOR, VIEW_H, VIEW_W, toScreenX, toScreenY } from './layout.js';
import { boardLabelBoxes } from './board.js';
import { BEETLE_COLORS } from './beetles.js';

/** Light text on sand: a 3 px dark-brown outline and a 2 px drop shadow under it. */
function outlinedText(ctx, str, x, y, color) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.shadowColor = 'rgba(40,15,5,0.7)';
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = '#3A1A08';
  ctx.strokeText(str, x, y);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Seconds a kill's scorch mark and flipped husk stay on the floor. */
const DECAL_LIFE = 6;

/** Where the beams have been killing: a scorch on the sand and a flipped husk, fading over 6 s. */
export function drawDecals(ctx, fx) {
  for (const d of fx.decals) {
    const k = d.life / d.max;
    const scorch = ctx.createRadialGradient(d.x, d.y + 4, 2, d.x, d.y + 4, d.size * 1.8);
    scorch.addColorStop(0, `rgba(70,32,12,${0.45 * k})`);
    scorch.addColorStop(1, 'rgba(70,32,12,0)');
    ctx.fillStyle = scorch;
    ctx.fillRect(d.x - d.size * 1.8, d.y - d.size * 1.8 + 4, d.size * 3.6, d.size * 3.6);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = (BEETLE_COLORS[d.enemy] ?? BEETLE_COLORS.scuttler).under;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.size, d.size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(201,154,214,0.8)';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.size * 0.6, d.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2A0E30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let j = -1; j <= 1; j++) {
      ctx.moveTo(d.x + j * d.size * 0.5, d.y - d.size * 0.4);
      ctx.lineTo(d.x + j * d.size * 0.7, d.y - d.size * 1.1);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Seconds a floating number lives (opaque for the first 70%). */
export const FLOATER_LIFE = 1.4;

export function createFx() {
  return { particles: [], texts: [], decals: [], shake: 0, flash: 0, hurt: 0, seed: 12345, waveBanner: 0 };
}

function fxRandom(fx) {
  fx.seed = (fx.seed * 16807) % 2147483647;
  return fx.seed / 2147483647;
}

function burst(fx, x, y, n, kind, color, speed, life, size) {
  for (let k = 0; k < n; k++) {
    const a = fxRandom(fx) * Math.PI * 2;
    const v = speed * (0.4 + fxRandom(fx) * 0.8);
    fx.particles.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (kind === 'smoke' ? 20 : 0), life, max: life, size: size * (0.6 + fxRandom(fx) * 0.8), color });
  }
}

/** A floater's box (screen px) now, or over the rest of its life when rising (24 px/s). */
export function floaterBox(t, rising = false) {
  const w = t.text.length * t.size * 0.62 * 1.1;
  return { x0: t.x - w / 2, x1: t.x + w / 2, y0: t.y - t.size * 1.15 - (rising ? 24 * t.life : 0), y1: t.y + t.size * 0.3 };
}

/** Floaters (as boxes now) that overlap another floater, a floor label or a beam core. */
export function floaterConflicts(fx, run) {
  const labels = boardTextBoxes(run);
  let n = 0;
  fx.texts.forEach((t, i) => {
    const box = floaterBox(t);
    if (fx.texts.slice(i + 1).some((o) => overlaps(box, floaterBox(o)))) n++;
    if (labels.some((l) => overlaps(box, l)) || boxTouchesBeam(box, run.trace.legs)) n++;
  });
  return n;
}

function overlaps(a, b) {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/** Does a box touch a beam's white core (legs are straight and axis-aligned)? */
export function boxTouchesBeam(box, legs) {
  return legs.some((leg) => {
    const x0 = toScreenX(Math.min(leg.x0, leg.x1)) - 5;
    const x1 = toScreenX(Math.max(leg.x0, leg.x1)) + 5;
    const y0 = toScreenY(Math.min(leg.y0, leg.y1)) - 5;
    const y1 = toScreenY(Math.max(leg.y0, leg.y1)) + 5;
    return overlaps(box, { x0, x1, y0, y1 });
  });
}

const FLOATER_SPOTS = [[0, 0], [0, -30], [40, -20], [-40, -20], [0, 34], [70, 0], [-70, 0], [0, -64], [90, 30], [-90, 30], [0, 70], [110, -40], [-110, -40], [0, -100], [0, 100]];

/** Place a floating number at the first spot near the kill that keeps clear of other floaters,
 *  the floor labels and the beam cores, inside the courtyard; drop it if there is none. */
function placeFloater(fx, t, run) {
  const labels = run ? boardTextBoxes(run) : [];
  const legs = run?.trace?.legs ?? [];
  for (const [dx, dy] of FLOATER_SPOTS) {
    const cand = { ...t, x: t.x + dx, y: t.y + dy };
    const box = floaterBox(cand);
    const path = floaterBox(cand, true);
    if (path.x0 < BOARD_X + 4 || path.x1 > BOARD_X + BOARD_W - 4 || path.y0 < BOARD_Y + 4 || box.y1 > BOARD_Y + BOARD_H - 4) continue;
    if (fx.texts.some((o) => overlaps(box, floaterBox(o)))) continue;
    if (labels.some((l) => overlaps(path, l)) || boxTouchesBeam(box, legs)) continue;
    fx.texts.push(cand);
    return;
  }
}

/** Turn one sim event into effects (run gives the beams and labels floaters must avoid). */
export function fxFromEvent(fx, ev, run = null) {
  if (ev.type === 'kill') {
    const x = toScreenX(ev.x);
    const y = toScreenY(ev.y);
    burst(fx, x, y, 10, 'smoke', 'rgba(110,80,70,', 40, 0.9, 9);
    burst(fx, x, y, 14, 'spark', '#FFD34D', 160, 0.45, 3);
    fx.decals.push({ x, y, life: DECAL_LIFE, max: DECAL_LIFE, size: ev.boss ? 40 : 18, enemy: ev.enemy });
    for (let k = 0; k < ev.quartz; k++) {
      fx.particles.push({ kind: 'quartz', x: x + k * 6, y, sx: x + k * 6, sy: y, vx: 0, vy: 0, life: 0.75 + k * 0.08, max: 0.75 + k * 0.08, size: 6, color: '#7FE8FF' });
    }
    const label = ev.mult > 1 ? `+${ev.points}  ${NAMES.combo} x${ev.mult}` : `+${ev.points}`;
    placeFloater(fx, { x, y: y - 18, text: label, life: FLOATER_LIFE, max: FLOATER_LIFE, color: ev.mult >= 4 ? '#FFFFFF' : '#F2C14E', size: 28 + (Math.min(ev.mult, 5) - 1) * 4 }, run);
  } else if (ev.type === 'bite') {
    fx.shake = Math.min(14, fx.shake + 6 + ev.harm * 2);
    fx.hurt = 1;
    placeFloater(fx, { x: toScreenX(ev.x), y: toScreenY(ev.y) - 30, text: `-${ev.harm} ${NAMES.fountainShort}`, life: FLOATER_LIFE, max: FLOATER_LIFE, color: '#FF5C5C', size: 32 }, run);
    burst(fx, toScreenX(ev.x), toScreenY(ev.y), 12, 'spark', '#FF5C5C', 120, 0.5, 3);
  } else if (ev.type === 'placed' || ev.type === 'lifted') {
    burst(fx, toScreenX(ev.c + 0.5), toScreenY(ev.r + 0.85), 12, 'smoke', 'rgba(232,196,140,', 50, 0.6, 7);
  } else if (ev.type === 'flare') {
    fx.flash = 1;
  } else if (ev.type === 'scorch') {
    burst(fx, toScreenX(ev.x), toScreenY(ev.y), 8, 'spark', '#FF7A2E', 110, 0.4, 3);
  } else if (ev.type === 'waveStart') {
    fx.waveBanner = 1;
  } else if (ev.type === 'denied' && ev.c !== undefined) {
    fx.texts.push({ x: toScreenX(ev.c + 0.5), y: toScreenY(ev.r + 0.2), text: ev.reason, life: 1.2, max: 1.2, color: '#FF6B6B', size: 20 });
  }
}

/** Sparks rising from every burning beetle. */
function emitBurnSparks(fx, run, dt) {
  for (const e of run.enemies) {
    if (e.litPower <= 0 || e.shielded) continue;
    if (fxRandom(fx) < dt * (6 + e.litPower * 0.4)) {
      const x = toScreenX(e.x) + (fxRandom(fx) - 0.5) * 20;
      const y = toScreenY(e.y) + (fxRandom(fx) - 0.5) * 14;
      fx.particles.push({ kind: 'spark', x, y, vx: (fxRandom(fx) - 0.5) * 40, vy: -40 - fxRandom(fx) * 60, life: 0.5, max: 0.5, size: 2.5, color: fxRandom(fx) < 0.5 ? '#FFB02E' : '#FFF2A8' });
    }
  }
}

export function updateFx(fx, run, dt) {
  if (run) emitBurnSparks(fx, run, dt);
  for (const p of fx.particles) {
    p.life -= dt;
    if (p.kind === 'quartz') continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - dt * 2.5;
    p.vy = p.vy * (1 - dt * 2.5) + (p.kind === 'spark' ? 60 * dt : 0);
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  for (const d of fx.decals) d.life -= dt;
  fx.decals = fx.decals.filter((d) => d.life > 0);
  for (const t of fx.texts) {
    t.life -= dt;
    t.y -= 24 * dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  fx.shake = Math.max(0, fx.shake - dt * 30);
  fx.flash = Math.max(0, fx.flash - dt * 2.2);
  fx.hurt = Math.max(0, fx.hurt - dt * 1.6);
  fx.waveBanner = Math.max(0, fx.waveBanner - dt * 0.7);
}

function drawStarburst(ctx, x, y, r, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,251,230,${alpha})`);
  g.addColorStop(0.35, `rgba(255,197,49,${alpha * 0.5})`);
  g.addColorStop(1, 'rgba(255,197,49,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.strokeStyle = `rgba(255,251,230,${alpha * 0.9})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [0, 1], [0.6, 0.6], [0.6, -0.6]]) {
    ctx.moveTo(x - dx * r, y - dy * r);
    ctx.lineTo(x + dx * r, y + dy * r);
  }
  ctx.stroke();
}

/** Glow, halo and core widths and alphas of a beam. */
const BEAM_PASSES = [[26, 0.32], [11, 0.75], [5, 0.95]];
/** Glow / halo / core colours per tint: sunlight, red (1), blue (2), gold (4). */
const TINT_COLORS = {
  0: ['rgba(255,197,49,', 'rgba(255,128,24,', 'rgba(255,251,230,'],
  1: ['rgba(255,77,61,', 'rgba(255,110,80,', 'rgba(255,215,200,'],
  2: ['rgba(89,184,255,', 'rgba(120,200,255,', 'rgba(225,245,255,'],
  4: ['rgba(255,170,20,', 'rgba(255,200,40,', 'rgba(255,246,190,'],
};
const TINT_DASHES = { 1: [16, 7], 2: [3, 7] };
const FOCUS_COLORS = ['rgba(255,120,40,', 'rgba(255,160,60,', 'rgba(255,251,230,'];

/**
 * Draw a traced beam additively. opts: { alpha, flare (0-1), time }.
 * Width follows power so a split or bounced beam visibly thins.
 */
export function drawBeams(ctx, trace, opts) {
  const alpha = opts.alpha ?? 1;
  const surge = 1 + (opts.flare ?? 0) * 0.3;
  // Beams go onto their own layer with normal blending, so crossings keep a gold glow, an orange
  // edge and a white core instead of adding up to a white blot; the layer then lies over the scene.
  const layer = beamLayer(ctx);
  const g = layer.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, layer.width, layer.height);
  g.setTransform(ctx.getTransform());
  g.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    const [width, a] = BEAM_PASSES[pass];
    for (const leg of trace.legs) {
      const w = Math.min(1.7, Math.max(0.5, Math.sqrt(leg.power / 10))) * surge;
      const colors = leg.focused && pass < 2 ? FOCUS_COLORS : TINT_COLORS[leg.tint] ?? TINT_COLORS[0];
      g.strokeStyle = `${colors[pass]}${a})`;
      g.lineWidth = width * w;
      // Colour-blind option: prism light also differs by pattern (red long dashes, blue dots).
      g.setLineDash(opts.patterns && pass === 2 ? TINT_DASHES[leg.tint] ?? [] : []);
      g.beginPath();
      g.moveTo(toScreenX(leg.x0), toScreenY(leg.y0));
      g.lineTo(toScreenX(leg.x1), toScreenY(leg.y1));
      g.stroke();
    }
  }
  // Photons: bright dashes flowing along each leg, away from the sun.
  g.setLineDash([5, 23]);
  g.lineDashOffset = -(opts.time ?? 0) * 140;
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 3;
  for (const leg of trace.legs) {
    g.beginPath();
    g.moveTo(toScreenX(leg.x0), toScreenY(leg.y0));
    g.lineTo(toScreenX(leg.x1), toScreenY(leg.y1));
    g.stroke();
  }
  g.setLineDash([]);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const twinkle = 0.85 + Math.sin((opts.time ?? 0) * 7) * 0.15;
  for (const b of trace.bursts) drawStarburst(ctx, toScreenX(b.x), toScreenY(b.y), 22 * Math.min(1.25, Math.max(0.7, Math.sqrt(b.power / 10))) * twinkle, 0.55 * alpha);
  ctx.restore();
}

let beamCanvas = null;

/** The offscreen beam layer, matched to the main canvas's backing size. */
function beamLayer(ctx) {
  const { width, height } = ctx.canvas;
  if (!beamCanvas || beamCanvas.width !== width || beamCanvas.height !== height) {
    beamCanvas = document.createElement('canvas');
    beamCanvas.width = width;
    beamCanvas.height = height;
  }
  return beamCanvas;
}

/** Where the first ray of a trace ends (follow legs end to start from the opening). */
function beamTerminal(trace) {
  if (!trace.legs.length) return null;
  let leg = trace.legs[0];
  for (let guard = 0; guard < trace.legs.length; guard++) {
    const next = trace.legs.find((l) => l.x0 === leg.x1 && l.y0 === leg.y1 && l !== leg);
    if (!next) break;
    leg = next;
  }
  return { x: leg.x1, y: leg.y1 };
}

/**
 * The next sun's light through the current glass, drawn as a dashed ghost: red ending in an X
 * labelled MISSES when it lights none of the swarm's path, gold with the path cells it hits otherwise.
 */
export function drawBeamGhost(ctx, trace, pathCellsLit, time, wall) {
  const misses = pathCellsLit === 0;
  const color = misses ? '#FF3B30' : '#FFD34D';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([16, 12]);
  ctx.lineDashOffset = -time * 40;
  for (const [width, stroke] of [[12, 'rgba(255,250,235,0.9)'], [6, color]]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    for (const leg of trace.legs) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(leg.x0), toScreenY(leg.y0));
      ctx.lineTo(toScreenX(leg.x1), toScreenY(leg.y1));
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  const end = beamTerminal(trace);
  if (end) {
    const x = toScreenX(end.x);
    const y = toScreenY(end.y);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#FFFFFF';
    for (const pass of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 18);
      ctx.lineTo(x + 18, y + 18);
      ctx.moveTo(x + 18, y - 18);
      ctx.lineTo(x - 18, y + 18);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.strokeStyle = color;
      if (pass === 0 && !misses) break;
    }
  }
  // The verdict sits on a plaque under the draft heading and its context line, clear of the roundels.
  const label = `NEXT ${NAMES.sun} (${wall}): ${misses ? 'MISSES THE PATH' : `HITS ${pathCellsLit} PATH CELLS`}`;
  ctx.font = '900 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const w = ctx.measureText(label).width + 36;
  ctx.fillStyle = 'rgba(31,63,153,0.92)';
  ctx.beginPath();
  ctx.roundRect(640 - w / 2, 200, w, 44, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = misses ? '#FF8A80' : '#FFE27A';
  ctx.fillText(label, 640, 233);
  ctx.restore();
}

/** Where the NEXT SUN label sits beside the ghost beam's window (shared by drawing and floaters). */
export function ghostLabelBox(trace, label) {
  const start = trace.legs[0];
  const x = toScreenX(start.x0) + (start.x1 > start.x0 ? 12 : start.x1 < start.x0 ? -12 : 0);
  const y = toScreenY(start.y0) + (start.y1 > start.y0 ? 40 : -16);
  const align = start.x1 < start.x0 ? 'right' : start.x1 > start.x0 ? 'left' : 'center';
  const w = label.length * 13;
  const x0 = align === 'right' ? x - w : align === 'left' ? x : x - w / 2;
  return { align, x0, x1: x0 + w, y0: y - 18, y1: y + 4 };
}

/** Labels on the board that floaters must keep clear of: floor words and the NEXT SUN tag. */
export function boardTextBoxes(run) {
  const boxes = boardLabelBoxes(run);
  // The event banner plaque over the top of the courtyard (see hud.drawEventBanner).
  if (currentBanner(run)) boxes.push({ text: 'BANNER', x0: 640 - VIEW_W * 0.3, x1: 640 + VIEW_W * 0.3, y0: BOARD_Y + 6, y1: BOARD_Y + 68 });
  if ((run.phase === 'wave' || run.phase === 'build') && run.waveIndex + 1 < WAVE_COUNT) {
    const ap = sunApertureFor(run.seed, run.waveIndex + 1);
    const trace = traceBeams(run.grid, ap, beamModsFor(run.boons));
    if (trace.legs.length) boxes.push({ text: 'NEXT SUN', ...ghostLabelBox(trace, `NEXT ${NAMES.sun} (${ap.phase.wallName[0]})`) });
  }
  return boxes;
}

/** The next sun's light through today's glass: a faint white dashed line labelled at its window. */
export function drawNextSunGhost(ctx, trace, label, time) {
  if (!trace.legs.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([12, 12]);
  ctx.lineDashOffset = -time * 30;
  for (const [width, stroke] of [[7, 'rgba(60,30,10,0.35)'], [4, 'rgba(255,255,255,0.8)']]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = stroke;
    for (const leg of trace.legs) {
      ctx.beginPath();
      ctx.moveTo(toScreenX(leg.x0), toScreenY(leg.y0));
      ctx.lineTo(toScreenX(leg.x1), toScreenY(leg.y1));
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  const at = ghostLabelBox(trace, label);
  const x = at.align === 'right' ? at.x1 : at.align === 'left' ? at.x0 : (at.x0 + at.x1) / 2;
  const y = at.y1 - 4;
  ctx.font = '900 20px system-ui, sans-serif';
  ctx.textAlign = at.align;
  ctx.lineJoin = 'round';
  outlinedText(ctx, label, x, y, '#FFFFFF');
  ctx.restore();
}

/** Particles, then the floating numbers (left off under the draft roundels: texts false). */
export function drawFx(ctx, fx, texts = true) {
  for (const p of fx.particles) {
    const k = p.life / p.max;
    if (p.kind === 'smoke') {
      ctx.fillStyle = `${p.color}${0.45 * k})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    } else if (p.kind === 'quartz') {
      const t = 1 - k;
      const e = t * t;
      const mx = (p.sx + QUARTZ_ANCHOR.x) / 2;
      const my = Math.min(p.sy, QUARTZ_ANCHOR.y) - 140;
      const x = (1 - e) * (1 - e) * p.sx + 2 * (1 - e) * e * mx + e * e * QUARTZ_ANCHOR.x;
      const y = (1 - e) * (1 - e) * p.sy + 2 * (1 - e) * e * my + e * e * QUARTZ_ANCHOR.y;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(x, y - p.size);
      ctx.lineTo(x + p.size * 0.6, y);
      ctx.lineTo(x, y + p.size);
      ctx.lineTo(x - p.size * 0.6, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (!texts) return;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const t of fx.texts) {
    // Full strength for 70% of its life, then fade; pops from 1.4x to 1x as it appears.
    const k = t.life / t.max;
    const age = t.max - t.life;
    ctx.globalAlpha = k > 0.3 ? 1 : Math.max(0, k / 0.3);
    const pop = age < 0.15 ? 1.4 - (age / 0.15) * 0.4 : 1;
    ctx.font = `900 ${Math.round(t.size * pop)}px system-ui, sans-serif`;
    outlinedText(ctx, t.text, t.x, t.y, t.color);
  }
  ctx.globalAlpha = 1;
}

/** Full-screen overlays: the Flare's white flash and the red hurt vignette. */
export function drawScreenFx(ctx, fx) {
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,250,225,${fx.flash * 0.5})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (fx.hurt > 0) {
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.8);
    g.addColorStop(0, 'rgba(200,20,40,0)');
    g.addColorStop(1, `rgba(200,20,40,${fx.hurt * 0.5})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

/** Pixel offset for screen shake this frame. */
export function shakeOffset(fx, time) {
  if (fx.shake <= 0) return { x: 0, y: 0 };
  return { x: Math.sin(time * 91) * fx.shake, y: Math.cos(time * 77) * fx.shake * 0.7 };
}

