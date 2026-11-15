// Staging plan, headless: one directed bot run through the real sim modules, with the ticks the
// screenshots are taken at. tools/shots.mjs replays the plan in the browser; tools/stage-search
// style loops can call planRun over many seeds without a browser.
import { layoutValue, playRun } from './balance.mjs';

export const COVER_WAVE = 4;
const DIFF = 'normal';
const BOT = 'greedy';

/**
 * The staging director: on sun 4 it turns the K most useful glass pieces off-target (a real live
 * rotation) so the swarm bites the fountain, then turns them back once it is down to 8/10. The
 * cover sun then plays normally: its bigger swarm bites again, and the cover is the moment that
 * best shows density, burning, a fresh bite and a beetle at the rim.
 */
const DIRECTED = { [COVER_WAVE - 1]: 8 };

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

export function makeDirector(K) {
  let wave = -1;
  let turned = null;
  return (run) => {
    const orders = [];
    const target = DIRECTED[run.waveIndex];
    if (target === undefined) return orders;
    if (wave !== run.waveIndex) {
      wave = run.waveIndex;
      turned = null;
    }
    if (turned === null && run.waveTime > 0.5 && run.shrineHp > target) {
      turned = mostUsefulPieces(run, K);
      for (const p of turned) orders.push({ type: 'rotate', c: p.c, r: p.r, dir: 1 });
    } else if (turned && turned.length && run.shrineHp <= target) {
      for (const p of turned) orders.push({ type: 'rotate', c: p.c, r: p.r, dir: -1 });
      turned = [];
    }
    orders.holdFlare = !!(turned && turned.length);
    return orders;
  };
}

/** Plan one directed run headless and find the cover, draft and end ticks. */
export function planRun(seed, K, difficulty = DIFF, bot = BOT) {
  let cover = { tick: -1, score: -1 };
  let draftTick = -1;
  let draftHp = -1;
  let endTick = -1;
  const floaters = []; // kill and bite times: each leaves a floating number, opaque for 0.98 s
  const bites = [];
  const { result, log } = playRun(seed, difficulty, bot, (run, events) => {
    for (const ev of events) {
      if (ev.type === 'kill' || ev.type === 'bite') floaters.push(run.time);
      if (ev.type === 'bite') bites.push(run.time);
    }
    if (run.phase === 'wave' && run.waveIndex === COVER_WAVE && run.flareLeft <= 0) {
      const opaque = floaters.filter((t) => run.time - t < 0.98).length;
      const freshBite = bites.some((t) => run.time - t < 0.9);
      const s = run.grid.shrine;
      const atRim = run.enemies.some((e) => e.type === 'scuttler' && Math.hypot(e.x - s.c - 0.5, e.y - s.r - 0.5) < 1.6);
      const burning = run.enemies.filter((e) => e.litPower > 0 && !e.shielded).length;
      const types = new Set(run.enemies.map((e) => e.type)).size;
      const hurt = run.shrineHp < run.shrineMax;
      const score = Math.min(run.enemies.length, 24) * 2 + Math.min(burning, 8) * 2 + types * 4 + Math.min(opaque, 6) * 3 + (freshBite ? 12 : 0) + (atRim ? 12 : 0) + (hurt ? 20 : 0) + (run.enemies.some((e) => e.shielded) ? 4 : 0);
      if (score > cover.score) cover = { tick: run.tick, score, hp: run.shrineHp, enemies: run.enemies.length, burning, types, opaque, freshBite, atRim };
    }
    if (run.phase === 'draft' && run.waveIndex === COVER_WAVE + 1 && draftTick < 0) {
      draftTick = run.tick;
      draftHp = run.shrineHp;
    }
    if ((run.phase === 'won' || run.phase === 'lost') && endTick < 0) endTick = run.tick;
  }, makeDirector(K));
  return { result, log, cover, draftTick, draftHp, endTick };
}

