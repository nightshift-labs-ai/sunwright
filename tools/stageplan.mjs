// Staging plan, headless: one directed bot run through the real sim modules, with the ticks the
// screenshots are taken at. tools/shots.mjs replays the plan in the browser; tools/stage-search
// style loops can call planRun over many seeds without a browser.
import { bestUpgrade, layoutValue, playRun } from './balance.mjs';
import { boardTagOverlaps, createFx, floaterConflicts, fxFromEvent, updateFx } from '../game/src/render/fx.js';
import { DT, UPGRADES, WAVE_COUNT } from '../game/src/config.js';
import { beamModsFor, traceBeams } from '../game/src/beams.js';
import { sunApertureFor } from '../game/src/sun.js';
import { routeCells } from '../game/src/pathing.js';
import { carapaceOpen } from '../game/src/enemies.js';
import { placementCheck, setPiece } from '../game/src/grid.js';
import { pieceCost, upgradeCost } from '../game/src/sim.js';

/** The sun the cover shows (index; 4 = sun 5, Day 2 noon). STAGE_COVER_WAVE overrides it for experiments. */
export const COVER_WAVE = Number(process.env.STAGE_COVER_WAVE ?? 4);
/** The staged upgrades: during this sun (sun 1), from this tick, this many on the most-lit glass (Lv2, Lv3). */
const UPGRADE_PLAN = { wave: Number(process.env.STAGE_UPGRADE_WAVE ?? 0), tick: Number(process.env.STAGE_UPGRADE_TICK ?? 0), count: Number(process.env.STAGE_UPGRADE_COUNT ?? 2) };
const DIFF = 'normal';
const BOT = 'greedy';

/**
 * The staging director: on sun 4 it turns the K most useful glass pieces off-target (a real live
 * rotation) so the swarm bites the fountain, then turns them back once it is down to 8/10. The
 * cover sun then plays normally: its bigger swarm bites again, and the cover is the moment that
 * best shows density, burning, a fresh bite and a beetle at the rim.
 */
/** Fountain targets per sun: { start: act only once HP is at most this, after: from this many seconds, to: stop at }. */
const DIRECTED = { [COVER_WAVE - 1]: { start: 10, after: 0.5, to: 8 } };
/** With STAGE_V3=1 the cover sun bites once more after the cover moment (7 -> 6), for a 6/10 draft. */
if (process.env.STAGE_V3 === '1') DIRECTED[COVER_WAVE] = { start: 7, after: 12, to: 6 };

function mostUsefulPieces(run, K) {
  const cols = run.grid.cols;
  const scored = [];
  run.grid.pieces.forEach((p, i) => {
    if (!p || p.type === 'pillar') return;
    const before = layoutValue(run, run.grid, false);
    p.rot = (p.rot + 1) & 3;
    const after = layoutValue(run, run.grid, false);
    p.rot = (p.rot + 3) & 3;
    scored.push({ c: i % cols, r: Math.floor(i / cols), loss: before - after });
  });
  scored.sort((a, b) => b.loss - a.loss);
  return scored.slice(0, K);
}

/**
 * After the bot has built for the cover sun, the director swaps the glass it will not use for
 * pillars (same maze): panes neither the noon light nor the next sun's ghost reaches, then
 * ghost-only panes until 70% of the glass is lit.
 */
function pruneForCover(run, swapped) {
  if (run.waveIndex !== COVER_WAVE) return [];
  const next = traceBeams(run.grid, sunApertureFor(run.seed, run.waveIndex + 1), beamModsFor(run.boons));
  const glass = [];
  run.grid.pieces.forEach((p, i) => p && p.type !== 'pillar' && glass.push({ i, lit: run.trace.lit[i] > 0, ghost: next.lit[i] > 0 }));
  const lift = glass.filter((g) => !g.lit && !g.ghost);
  const keep = glass.filter((g) => g.lit || g.ghost);
  const lit = keep.filter((g) => g.lit).length;
  const ghostOnly = keep.filter((g) => !g.lit);
  while (ghostOnly.length && lit / (lit + ghostOnly.length) < 0.7) lift.push(ghostOnly.pop());
  // Each sold pane becomes a sandstone pillar on the same cell, so the maze the bot built stays.
  return lift.flatMap((g) => {
    const c = g.i % run.grid.cols;
    const r = Math.floor(g.i / run.grid.cols);
    const piece = run.grid.pieces[g.i];
    swapped.push({ c, r, piece: piece.type, rot: piece.rot });
    return [{ type: 'lift', c, r }, { type: 'place', piece: 'pillar', c, r, rot: 0 }];
  });
}

/**
 * Where the director acts this sun: sun 4 down to 8/10; with scars (STAGE_V4) also the cover sun
 * after the cover tick and the last sun, each down to 6/10 as shown (Sunstone heals 1 after a sun).
 */
function planFor(run, scars) {
  if (DIRECTED[run.waveIndex]) return DIRECTED[run.waveIndex];
  if (!scars) return undefined;
  const shown = 6 - (run.boons.includes('sunstone') ? 1 : 0);
  if (run.waveIndex === COVER_WAVE && run.tick > scars.coverTick) return { start: 10, after: 0, to: shown };
  if (run.waveIndex === WAVE_COUNT - 1 && process.env.STAGE_V4_LAST !== '0') return { start: 10, after: 0.5, to: shown };
  return undefined;
}

/** How many beetles stand on lit cells of the current sun's light through this grid. */
function litBeetles(run, grid) {
  const lit = traceBeams(grid, run.aperture, beamModsFor(run.boons)).lit;
  return run.enemies.filter((e) => {
    const c = Math.floor(e.x);
    const r = Math.floor(e.y);
    return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && lit[r * grid.cols + c] > 0;
  }).length;
}

/** Chasing the swarm the way a player does: the one live turn that puts >= 2 more beetles in the light. */
function bestChaseTurn(run) {
  const base = litBeetles(run, run.grid);
  let best = null;
  run.grid.pieces.forEach((p, i) => {
    if (!p || p.type === 'pillar') return;
    for (const dir of [1, -1]) {
      const old = p.rot;
      p.rot = (p.rot + (dir > 0 ? 1 : 3)) & 3;
      const n = litBeetles(run, run.grid);
      p.rot = old;
      if (n >= base + 2 && (!best || n > best.n)) best = { c: i % run.grid.cols, r: Math.floor(i / run.grid.cols), dir, n };
    }
  });
  return best;
}

/**
 * STAGE_AIM=1: before the bot builds for the cover sun, place the one mirror (any free cell, any turn)
 * whose light covers the most cells of the swarm's lower path (rows 4+) on the coming sun, if it adds >= 3.
 */
function aimMirror(run) {
  if (run.waveIndex !== COVER_WAVE || run.quartz < pieceCost(run, 'mirror')) return [];
  const grid = run.grid;
  const path = routeCells(grid, run.flow).filter((i) => Math.floor(i / grid.cols) >= 4);
  const mods = beamModsFor(run.boons);
  const lit = () => {
    const t = traceBeams(grid, sunApertureFor(run.seed, run.waveIndex), mods);
    return path.filter((i) => t.lit[i] > 0).length;
  };
  const base = lit();
  let best = null;
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (!placementCheck(grid, c, r).ok) continue;
      for (let rot = 0; rot < 4; rot++) {
        setPiece(grid, c, r, { type: 'mirror', rot, prevRot: rot, turnedAt: -1, placedWave: run.waveIndex, paid: 0 });
        const n = lit();
        setPiece(grid, c, r, null);
        if (n >= base + 3 && (!best || n > best.n)) best = { c, r, rot, n };
      }
    }
  }
  return best ? [{ type: 'place', piece: 'mirror', c: best.c, r: best.r, rot: best.rot }] : [];
}

/** Upgrade orders for the glass taking the most light right now: Lv2, then Lv3, as quartz allows. */
function upgradeOrders(run, n) {
  const lit = run.trace.lit;
  let best = -1;
  run.grid.pieces.forEach((p, i) => {
    if (p && p.type !== 'pillar' && lit[i] > 0 && (best < 0 || lit[i] > lit[best])) best = i;
  });
  if (best < 0) return [];
  const p = run.grid.pieces[best];
  const c = best % run.grid.cols;
  const r = Math.floor(best / run.grid.cols);
  const orders = [];
  let quartz = run.quartz;
  for (let level = p.level ?? 1; orders.length < n && level < 3; level++) {
    const cost = UPGRADES.cost[level - 1];
    if (cost > quartz) break;
    quartz -= cost;
    orders.push({ type: 'upgrade', c, r });
  }
  return orders;
}

export function makeDirector(K, scars = null) {
  let upgradesDone = 0;
  let wave = -1;
  let turned = null;
  const director = (run) => {
    const orders = [];
    // During the cover sun, spend quartz as it comes on the most-lit glass, up to Lv3 (the cover shows its pips).
    if (run.phase === 'wave' && run.waveIndex === UPGRADE_PLAN.wave && process.env.STAGE_UPGRADES !== '0' && upgradesDone < UPGRADE_PLAN.count && run.tick >= UPGRADE_PLAN.tick) {
      const up = upgradeOrders(run, 1);
      upgradesDone += up.length;
      orders.push(...up);
    }
    // STAGE_CHASE=1: on the cover sun, turn glass live onto the swarm (every half second at most).
    if (process.env.STAGE_CHASE === '1' && run.phase === 'wave' && run.waveIndex === COVER_WAVE && run.tick % 30 === 0) {
      const turn = bestChaseTurn(run);
      if (turn) orders.push({ type: 'rotate', c: turn.c, r: turn.r, dir: turn.dir });
    }
    const plan = planFor(run, scars);
    if (plan === undefined) return orders;
    const target = plan.to;
    if (wave !== run.waveIndex) {
      wave = run.waveIndex;
      turned = null;
    }
    if (turned === null && run.waveTime > plan.after && run.shrineHp <= plan.start && run.shrineHp > target) {
      turned = mostUsefulPieces(run, K);
      for (const p of turned) orders.push({ type: 'rotate', c: p.c, r: p.r, dir: 1 });
    } else if (turned && turned.length && run.shrineHp <= target) {
      for (const p of turned) orders.push({ type: 'rotate', c: p.c, r: p.r, dir: -1 });
      turned = [];
    }
    orders.holdFlare = !!(turned && turned.length);
    return orders;
  };
  // The panes swapped for pillars before the cover go back in at the next build phase.
  const swapped = [];
  // Off by default: no seed found yet where the pruned plan still wins (STAGE_PRUNE=1 to try).
  // After the bot's build for the cover sun: upgrade the glass that helps most, up to twice (the cover
  // shows its pips). STAGE_PRUNE=1 also swaps unused panes for pillars.
  if (process.env.STAGE_PRUNE === '1') director.afterBuild = (run) => pruneForCover(run, swapped);
  director.beforeBuild = (run) => {
    if (process.env.STAGE_AIM === '1' && run.waveIndex === COVER_WAVE) return aimMirror(run);
    if (run.waveIndex !== COVER_WAVE + 1 || !swapped.length) return [];
    return swapped.splice(0).flatMap((p) => [{ type: 'lift', c: p.c, r: p.r }, { type: 'place', piece: p.piece, c: p.c, r: p.r, rot: p.rot }]);
  };
  // Keep the fountain's scars visible: never take the healing charms while staging.
  if (process.env.STAGE_V3 === '1') director.pick = (run) => Math.max(0, run.offer.findIndex((id) => id !== 'sunstone' && id !== 'mend'));
  return director;
}

/** Plan one directed run headless and find the cover, draft and end ticks. */
export function planRun(seed, K, difficulty = DIFF, bot = BOT, scars = null) {
  let cover = { tick: -1, score: -1 };
  let draftTick = -1;
  let draftHp = -1;
  let endTick = -1;
  let titanTick = -1;
  const fx = createFx(); // the same deterministic effects the browser runs, to count real floaters
  const bites = [];
  const { result, log } = playRun(seed, difficulty, bot, (run, events) => {
    for (const ev of events) {
      fxFromEvent(fx, ev, run);
      if (ev.type === 'bite') bites.push(run.time);
    }
    updateFx(fx, run, DT);
    // Only ticks the screenshot checks would pass: no floater on a label, beam or floater, no covered tag.
    const litLive = run.enemies.filter((e) => e.litPower > 0 && !e.shielded && e.hp > 0).length;
    const upgraded = process.env.STAGE_UPGRADES === '0' || run.grid.pieces.some((p) => p && (p.level ?? 1) > 1);
    if (!scars && upgraded && run.phase === 'wave' && run.waveIndex === COVER_WAVE && run.flareLeft <= 0 && floaterConflicts(fx, run) === 0 && boardTagOverlaps(run).length === 0 && (process.env.STAGE_AIM !== '1' || litLive >= 3)) {
      const opaque = floaterConflicts(fx, run) === 0 ? fx.texts.filter((t) => t.life / t.max > 0.3).length : 0;
      const freshBite = bites.some((t) => run.time - t < 0.9);
      const s = run.grid.shrine;
      const atRim = run.enemies.some((e) => e.type === 'scuttler' && Math.hypot(e.x - s.c - 0.5, e.y - s.r - 0.5) < 1.6);
      const burning = run.enemies.filter((e) => e.litPower > 0 && !e.shielded).length;
      const types = new Set(run.enemies.map((e) => e.type)).size;
      const hurt = run.shrineHp < run.shrineMax;
      const score = Math.min(run.enemies.length, 24) * 2 + Math.min(burning, 8) * 6 + types * 4 + Math.min(opaque, 6) * 3 + (opaque >= 3 ? 30 : 0) + (freshBite ? 12 : 0) + (atRim ? 12 : 0) + (hurt ? 20 : 0) + (run.shrineHp === 7 ? 25 : 0) + (run.enemies.some((e) => e.shielded) ? 4 : 0) + (run.chain.count >= 2 ? 15 : 0) + (fx.texts.some((t) => t.text.includes('SEAR') && t.life / t.max > 0.3) ? 40 : 0);
      if (process.env.STAGE_DUMP === '1') console.error(JSON.stringify({ tick: run.tick, score, hp: run.shrineHp, enemies: run.enemies.length, burning, opaque, chain: run.chain.count }));
      if (score > cover.score) cover = { tick: run.tick, score, hp: run.shrineHp, enemies: run.enemies.length, burning, types, opaque, freshBite, atRim };
    }
    // A sun-9 tick with the Titan on the board, already hurt, her shell open, for the bar check.
    if (titanTick < 0 && run.phase === 'wave') {
      const t = run.enemies.find((e) => e.def.boss && e.hp > 0);
      if (t && t.hp < t.maxHp && carapaceOpen(t)) titanTick = run.tick;
    }
    if (run.phase === 'draft' && run.waveIndex === COVER_WAVE + 1 && draftTick < 0) {
      draftTick = run.tick;
      draftHp = run.shrineHp;
    }
    if ((run.phase === 'won' || run.phase === 'lost') && endTick < 0) endTick = run.tick;
  }, makeDirector(K, scars));
  if (scars) return { result, log, cover: scars.cover, draftTick, draftHp, endTick, titanTick };
  // STAGE_V4: replay the same run, now scarring the fountain after the cover and in the last sun.
  if (process.env.STAGE_V4 === '1') return planRun(seed, K, difficulty, bot, { coverTick: cover.tick, cover });
  return { result, log, cover, draftTick, draftHp, endTick, titanTick };
}

