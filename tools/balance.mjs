// Headless balance runs: a greedy bot plays seeded runs through the real sim modules (no DOM)
// and prints how far it gets at each difficulty.
//   node tools/balance.mjs [runsPerDifficulty=8] [bot=greedy|careful]
import { DIFFICULTY_ORDER, PIECE_ORDER, WAVE_COUNT } from '../game/src/config.js';
import { createRun, pieceCost, stepSim } from '../game/src/sim.js';
import { placementCheck, setPiece } from '../game/src/grid.js';
import { buildFlowField, flowDirectionAt } from '../game/src/pathing.js';
import { beamModsFor, traceBeams } from '../game/src/beams.js';
import { DX, DY } from '../game/src/config.js';

/** Cells walkers step through from each burrow to the shrine (counted once per burrow). */
function routeCells(grid, flow) {
  const cells = [];
  for (const g of grid.gates) {
    let c = g.c;
    let r = g.r;
    for (let guard = 0; guard < 200; guard++) {
      cells.push(r * grid.cols + c);
      const d = flowDirectionAt(flow, c, r);
      if (d < 0) break;
      c += DX[d];
      r += DY[d];
    }
  }
  return cells;
}

/** How much burning a layout does: beam power summed over the walking route cells. */
function layoutValue(run, grid) {
  const flow = buildFlowField(grid);
  const trace = traceBeams(grid, run.aperture, beamModsFor(run.boons));
  let v = 0;
  for (const i of routeCells(grid, flow)) v += trace.lit[i];
  // Lampmoths fly straight: reward light near the shrine too.
  const s = grid.shrine;
  for (let r = s.r; r <= s.r + 2; r++) for (let c = s.c - 1; c <= s.c + 1; c++) if (r < grid.rows) v += trace.lit[r * grid.cols + c] * 0.5;
  return v;
}

function bestPlacement(run, careful) {
  const grid = run.grid;
  let best = null;
  let bestValue = layoutValue(run, grid);
  for (const type of PIECE_ORDER) {
    const cost = pieceCost(run, type);
    if (cost > run.shards) continue;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!placementCheck(grid, c, r).ok) continue;
        for (const rot of type === 'pillar' ? [0] : [0, 1]) {
          setPiece(grid, c, r, { type, rot });
          const v = layoutValue(run, grid);
          setPiece(grid, c, r, null);
          const gain = careful ? (v - bestValue) / cost : v - bestValue;
          const bestGain = best ? best.gain : 0.5;
          if (gain > bestGain) best = { type, c, r, rot, gain, value: v };
        }
      }
    }
  }
  return best;
}

/** Re-aim existing mirrors for the new opening (careful bot only): try each rotation. */
function reaimPieces(run) {
  const orders = [];
  for (let i = 0; i < run.grid.pieces.length; i++) {
    const p = run.grid.pieces[i];
    if (!p || p.type === 'pillar') continue;
    const before = layoutValue(run, run.grid);
    p.rot = (p.rot + 1) & 3;
    const after = layoutValue(run, run.grid);
    p.rot = (p.rot + 3) & 3;
    if (after > before) orders.push({ type: 'rotate', c: i % run.grid.cols, r: Math.floor(i / run.grid.cols), dir: 1 });
  }
  return orders;
}

export function playRun(seed, difficulty, bot = 'greedy') {
  const run = createRun(seed, difficulty);
  const careful = bot === 'careful';
  for (let guard = 0; guard < 60 * 60 * 40; guard++) {
    const orders = [];
    if (run.phase === 'build') {
      if (careful) for (const o of reaimPieces(run)) stepSim(run, [o]);
      for (let k = 0; k < 20; k++) {
        const p = bestPlacement(run, careful);
        if (!p) break;
        stepSim(run, [{ type: 'place', piece: p.type, c: p.c, r: p.r, rot: p.rot }]);
      }
      orders.push({ type: 'startWave' });
    } else if (run.phase === 'wave') {
      if (run.flareCharges > 0 && run.enemies.filter((e) => e.litPower > 0).length >= (careful ? 4 : 2)) orders.push({ type: 'flare' });
    } else if (run.phase === 'draft') {
      orders.push({ type: 'pick', index: 0 });
    } else break;
    stepSim(run, orders);
    run.events.length = 0;
  }
  return { seed, difficulty, phase: run.phase, waves: run.stats.wavesCleared, score: run.score, hp: run.shrineHp, kills: run.stats.kills, best: run.chain.best };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 8);
  const bot = process.argv[3] ?? 'greedy';
  for (const difficulty of DIFFICULTY_ORDER) {
    const rows = [];
    for (let k = 0; k < n; k++) rows.push(playRun(1000 + k * 7919, difficulty, bot));
    const wins = rows.filter((r) => r.phase === 'won').length;
    const mean = rows.reduce((s, r) => s + r.waves, 0) / n;
    console.log(`${bot} ${difficulty.padEnd(8)} wins ${wins}/${n}  mean waves ${mean.toFixed(1)}/${WAVE_COUNT}  waves: ${rows.map((r) => r.waves).join(' ')}  scores: ${rows.map((r) => r.score).join(' ')}`);
  }
}
