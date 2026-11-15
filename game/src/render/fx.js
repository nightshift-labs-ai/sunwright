// Light and juice: additive sunbeams with starbursts at bounces, sparks on burning beetles,
// smoke and flipped husks on kills, quartz that fly to the HUD counter, floating CHAIN text,
// screen shake, the Flare flash and the red hurt vignette. Effects advance with sim time.
import { NAMES } from '../config.js';
import { QUARTZ_ANCHOR, VIEW_H, VIEW_W, toScreenX, toScreenY } from './layout.js';

/** Seconds a floating number lives (opaque for the first 70%). */
export const FLOATER_LIFE = 1.4;

export function createFx() {
  return { particles: [], texts: [], shake: 0, flash: 0, hurt: 0, seed: 12345, waveBanner: 0 };
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

/** Turn one sim event into effects. */
export function fxFromEvent(fx, ev) {
  if (ev.type === 'kill') {
    const x = toScreenX(ev.x);
    const y = toScreenY(ev.y);
    burst(fx, x, y, 10, 'smoke', 'rgba(110,80,70,', 40, 0.9, 9);
    burst(fx, x, y, 14, 'spark', '#FFD34D', 160, 0.45, 3);
    fx.particles.push({ kind: 'husk', x, y, vx: 0, vy: 0, life: 1.4, max: 1.4, size: ev.boss ? 34 : 18, color: ev.enemy });
    for (let k = 0; k < ev.quartz; k++) {
      fx.particles.push({ kind: 'quartz', x: x + k * 6, y, sx: x + k * 6, sy: y, vx: 0, vy: 0, life: 0.75 + k * 0.08, max: 0.75 + k * 0.08, size: 6, color: '#7FE8FF' });
    }
    const label = ev.mult > 1 ? `+${ev.points}  ${NAMES.combo} x${ev.mult}` : `+${ev.points}`;
    fx.texts.push({ x, y: y - 18, text: label, life: FLOATER_LIFE, max: FLOATER_LIFE, color: ev.mult >= 4 ? '#FFFFFF' : '#F2C14E', size: 28 + (Math.min(ev.mult, 5) - 1) * 4 });
  } else if (ev.type === 'bite') {
    fx.shake = Math.min(14, fx.shake + 6 + ev.harm * 2);
    fx.hurt = 1;
    fx.texts.push({ x: toScreenX(ev.x), y: toScreenY(ev.y) - 30, text: `-${ev.harm} ${NAMES.fountainShort}`, life: FLOATER_LIFE, max: FLOATER_LIFE, color: '#FF5C5C', size: 32 });
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
const BEAM_PASSES = [[26, 0.18], [11, 0.55], [5, 0.95]];
/** Glow / halo / core colours per tint: sunlight, red (1), blue (2), gold (4). */
const TINT_COLORS = {
  0: ['rgba(255,197,49,', 'rgba(255,128,24,', 'rgba(255,251,230,'],
  1: ['rgba(255,77,61,', 'rgba(255,110,80,', 'rgba(255,215,200,'],
  2: ['rgba(89,184,255,', 'rgba(120,200,255,', 'rgba(225,245,255,'],
  4: ['rgba(255,170,20,', 'rgba(255,200,40,', 'rgba(255,246,190,'],
};
const FOCUS_COLORS = ['rgba(255,120,40,', 'rgba(255,160,60,', 'rgba(255,251,230,'];

/**
 * Draw a traced beam additively. opts: { alpha, flare (0-1), time }.
 * Width follows power so a split or bounced beam visibly thins.
 */
export function drawBeams(ctx, trace, opts) {
  const alpha = opts.alpha ?? 1;
  const surge = 1 + (opts.flare ?? 0) * 0.3;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    const [width, a] = BEAM_PASSES[pass];
    for (const leg of trace.legs) {
      const w = Math.min(1.7, Math.max(0.5, Math.sqrt(leg.power / 10))) * surge;
      const colors = leg.focused && pass < 2 ? FOCUS_COLORS : TINT_COLORS[leg.tint] ?? TINT_COLORS[0];
      ctx.strokeStyle = `${colors[pass]}${a * alpha})`;
      ctx.lineWidth = width * w;
      ctx.beginPath();
      ctx.moveTo(toScreenX(leg.x0), toScreenY(leg.y0));
      ctx.lineTo(toScreenX(leg.x1), toScreenY(leg.y1));
      ctx.stroke();
    }
  }
  const twinkle = 0.85 + Math.sin((opts.time ?? 0) * 7) * 0.15;
  for (const b of trace.bursts) drawStarburst(ctx, toScreenX(b.x), toScreenY(b.y), 24 * Math.min(1.3, Math.max(0.7, Math.sqrt(b.power / 10))) * twinkle, 0.85 * alpha);
  ctx.restore();
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
export function drawBeamGhost(ctx, trace, pathCellsLit, time) {
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
    const label = misses ? 'MISSES' : `HITS ${pathCellsLit} PATH CELLS`;
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.textAlign = x > 640 ? 'right' : 'left';
    const tx = x + (x > 640 ? -28 : 28);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3B1247';
    ctx.strokeText(label, tx, y + 11);
    ctx.fillStyle = misses ? '#FF6B5E' : '#FFE27A';
    ctx.fillText(label, tx, y + 11);
  }
  ctx.restore();
}

/** Particles and floating text, drawn above the board. */
export function drawFx(ctx, fx) {
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
    } else if (p.kind === 'husk') {
      // A beetle flipped on its back, legs in the air, dimming.
      ctx.globalAlpha = Math.min(1, k * 1.5);
      ctx.fillStyle = p.color === 'veerwing' ? '#7A3B9A' : '#4A1A55';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size, p.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2A0E30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = -1; j <= 1; j++) {
        ctx.moveTo(p.x + j * p.size * 0.5, p.y - p.size * 0.4);
        ctx.lineTo(p.x + j * p.size * 0.7, p.y - p.size * 1.1);
      }
      ctx.stroke();
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
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const t of fx.texts) {
    // Full strength for 70% of its life, then fade; pops from 1.4x to 1x as it appears.
    const k = t.life / t.max;
    const age = t.max - t.life;
    ctx.globalAlpha = k > 0.3 ? 1 : Math.max(0, k / 0.3);
    const pop = age < 0.15 ? 1.4 - (age / 0.15) * 0.4 : 1;
    ctx.font = `900 ${Math.round(t.size * pop)}px system-ui, sans-serif`;
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#3A1A08';
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
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

