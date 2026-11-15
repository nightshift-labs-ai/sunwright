// Headless balance runs: bots play seeded runs through the real sim modules (no DOM) and we
// print how far they get at each difficulty. playRun also records every order with the tick it
// was applied on, so tools/shots.mjs can replay the exact run in the browser.
//   node tools/balance.mjs [runsPerDifficulty=8] [bot=greedy|careful]
import { DIFFICULTY_ORDER, PIECE_ORDER, WAVE_COUNT } from '../game/src/config.js';
import { createRun, pieceCost, pieceUnlocked, stepSim } from '../game/src/sim.js';
import { placementCheck, setPiece } from '../game/src/grid.js';
import { buildFlowField, routeCells } from '../game/src/pathing.js';
import { beamModsFor, traceBeams } from '../game/src/beams.js';

/** Boons the careful bot prefers, best first. */
const BOON_TASTE = ['highsun', 'silvered', 'burning', 'spreading', 'sunstone', 'flare2', 'magnet', 'discount', 'longchain', 'mend'];

/**
 * How much burning a layout does: beam power summed over the walking route cells, plus light
 * near the shrine for Veerwings. The careful bot also values light that pierces armour (12+).
 */
export function layoutValue(run, grid, careful) {
  const flow = buildFlowField(grid);
  const trace = traceBeams(grid, run.aperture, beamModsFor(run.boons));
  let v = 0;
  for (const i of routeCells(grid, flow)) v += Math.min(trace.lit[i], 30) + (careful && trace.lit[i] >= 12 ? 12 : 0);
  const s = grid.shrine;
  for (let r = s.r; r <= s.r + 2; r++) for (let c = s.c - 1; c <= s.c + 1; c++) if (r < grid.rows) v += trace.lit[r * grid.cols + c] * 0.5;
  return v;
}

function bestPlacement(run, careful) {
  const grid = run.grid;
  let best = null;
  const base = layoutValue(run, grid, careful);
  for (const type of PIECE_ORDER) {
    const cost = pieceCost(run, type);
    if (cost > run.quartz || !pieceUnlocked(run, type)) continue;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!placementCheck(grid, c, r).ok) continue;
        for (const rot of type === 'pillar' ? [0] : [0, 1]) {
          // (prism rot 0/1 swaps its red and blue sides)
          setPiece(grid, c, r, { type, rot });
          const v = layoutValue(run, grid, careful);
          setPiece(grid, c, r, null);
          const gain = careful ? (v - base) / cost : v - base;
          if (gain > (best ? best.gain : 0.5)) best = { type, c, r, rot, gain };
        }
      }
    }
  }
  return best;
}

/** Careful bot: turn existing glass when that lights more of the route for the new opening. */
function reaimOrders(run) {
  const orders = [];
  run.grid.pieces.forEach((p, i) => {
    if (!p || p.type === 'pillar') return;
    const before = layoutValue(run, run.grid, true);
    p.rot = (p.rot + 1) & 3;
    const after = layoutValue(run, run.grid, true);
    p.rot = (p.rot + 3) & 3;
    if (after > before) orders.push({ type: 'rotate', c: i % run.grid.cols, r: Math.floor(i / run.grid.cols), dir: 1 });
  });
  return orders;
}

/**
 * Play one run. Returns { result, log, run } where log is [{ tick, orders }] and tick is the
 * run's tick just before the step that applied them. onTick(run, events) is called after every step;
 * director(run), if given, returns extra orders for each wave tick (holdFlare: true to save the Flare).
 */
export function playRun(seed, difficulty, bot = 'greedy', onTick = null, director = null) {
  const run = createRun(seed, difficulty);
  const careful = bot === 'careful';
  const log = [];
  const step = (orders) => {
    if (orders.length) log.push({ tick: run.tick, orders });
    stepSim(run, orders);
    if (onTick) onTick(run, run.events);
    run.events.length = 0;
  };
  for (let guard = 0; guard < 60 * 60 * 40; guard++) {
    if (run.phase === 'build') {
      if (director?.beforeBuild) for (const o of director.beforeBuild(run)) step([o]);
      if (careful) for (const o of reaimOrders(run)) step([o]);
      for (let k = 0; k < 20; k++) {
        const p = bestPlacement(run, careful);
        if (!p) break;
        step([{ type: 'place', piece: p.type, c: p.c, r: p.r, rot: p.rot }]);
      }
      if (director?.afterBuild) for (const o of director.afterBuild(run)) step([o]);
      step([{ type: 'startWave' }]);
    } else if (run.phase === 'wave') {
      const lit = run.enemies.filter((e) => e.litPower > 0).length;
      const orders = director ? director(run) : [];
      if (run.flareCharges > 0 && run.flareLeft <= 0 && lit >= (careful ? 4 : 2) && !orders.holdFlare) orders.push({ type: 'flare' });
      step(orders);
    } else if (run.phase === 'draft') {
      const index = director?.pick ? director.pick(run) : careful ? run.offer.indexOf(BOON_TASTE.find((id) => run.offer.includes(id))) : 0;
      step([{ type: 'pick', index: Math.max(0, index) }]);
    } else break;
  }
  const result = { seed, difficulty, phase: run.phase, waves: run.stats.wavesCleared, score: run.score, hp: run.shrineHp, kills: run.stats.kills, best: run.chain.best };
  return { result, log, run };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 8);
  const bot = process.argv[3] ?? 'greedy';
  for (const difficulty of DIFFICULTY_ORDER) {
    const rows = [];
    for (let k = 0; k < n; k++) rows.push(playRun(1000 + k * 7919, difficulty, bot).result);
    const wins = rows.filter((r) => r.phase === 'won').length;
    const mean = rows.reduce((s, r) => s + r.waves, 0) / n;
    console.log(`${bot} ${difficulty.padEnd(8)} wins ${wins}/${n}  mean waves ${mean.toFixed(1)}/${WAVE_COUNT}  waves: ${rows.map((r) => r.waves).join(' ')}  scores: ${rows.map((r) => r.score).join(' ')}`);
  }
}
