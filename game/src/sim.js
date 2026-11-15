// The run state and its fixed-step update. Input never touches this state directly: it queues
// orders, and stepSim applies them at the start of the next 60 Hz tick, then advances the phase
// machine build -> wave -> draft -> build ... -> won | lost.
import { BEAM, DIFFICULTIES, DT, ECONOMY, FLARE_CHARGES, PIECES, WAVE_COUNT } from './config.js';
import { createRng } from './rng.js';
import { createGrid, pieceAt, placementCheck, setPiece } from './grid.js';
import { buildFlowField } from './pathing.js';
import { beamModsFor, traceBeams } from './beams.js';
import { sunApertureFor } from './sun.js';
import { moveEnemies, spawnEnemy } from './enemies.js';
import { buildWaveSchedule } from './waves.js';
import { applyBeamDamage, resolveFallenAndBiters, tickChain, waveClearBonus } from './combat.js';
import { applyBoon, offerBoons, rerollOffer } from './draft.js';

export function createRun(seed, difficultyId = 'keeper') {
  const diff = DIFFICULTIES[difficultyId];
  const grid = createGrid();
  const run = {
    seed,
    difficultyId,
    diff,
    rng: createRng(seed ^ 0x5eed),
    tick: 0,
    time: 0,
    phase: 'build',
    waveIndex: 0,
    grid,
    flow: buildFlowField(grid),
    trace: null,
    aperture: null,
    shards: diff.startShards,
    score: 0,
    shrineHp: diff.shrineHp,
    shrineMax: diff.shrineHp,
    boons: [],
    offer: [],
    rerolls: 0,
    enemies: [],
    nextEnemyId: 1,
    schedule: [],
    spawnCursor: 0,
    waveTime: 0,
    flareCharges: 0,
    flareLeft: 0,
    chain: { count: 0, timer: 0, best: 0 },
    stats: { kills: 0, leaked: 0, wavesCleared: 0 },
    events: [],
    endedAt: 0,
    layoutVersion: 0,
  };
  refreshLight(run);
  return run;
}

/** Re-trace the beam for the current wave's opening (after any piece, boon or wave change). */
export function refreshLight(run) {
  run.layoutVersion++;
  run.aperture = sunApertureFor(run.seed, run.waveIndex);
  run.trace = traceBeams(run.grid, run.aperture, beamModsFor(run.boons));
}

export function pieceCost(run, type) {
  const discount = run.boons.includes('discount') && (type === 'mirror' || type === 'splitter') ? 1 : 0;
  return Math.max(1, PIECES[type].cost - discount);
}

/** Shards returned when lifting a piece: all of it if placed this build phase, else half. */
export function liftRefund(run, piece) {
  return piece.placedWave === run.waveIndex ? piece.paid : Math.floor(piece.paid * ECONOMY.oldPieceRefund);
}

function emit(run, event) {
  event.t = run.time;
  run.events.push(event);
  if (run.events.length > 400) run.events.splice(0, 200);
}

function applyOrder(run, order) {
  const building = run.phase === 'build';
  switch (order.type) {
    case 'place': {
      if (!building) return;
      const check = placementCheck(run.grid, order.c, order.r);
      const cost = pieceCost(run, order.piece);
      if (!check.ok || run.shards < cost) {
        emit(run, { type: 'denied', c: order.c, r: order.r, reason: check.ok ? 'Not enough shards' : check.reason });
        return;
      }
      run.shards -= cost;
      setPiece(run.grid, order.c, order.r, { type: order.piece, rot: order.rot & 3, prevRot: order.rot & 3, turnedAt: -1, placedAt: run.time, placedWave: run.waveIndex, paid: cost });
      run.flow = buildFlowField(run.grid);
      refreshLight(run);
      emit(run, { type: 'placed', c: order.c, r: order.r, piece: order.piece });
      return;
    }
    case 'rotate': {
      const piece = pieceAt(run.grid, order.c, order.r);
      if (!piece || piece.type === 'pillar' || !(building || run.phase === 'wave')) return;
      piece.prevRot = piece.rot;
      piece.rot = (piece.rot + (order.dir > 0 ? 1 : 3)) & 3;
      piece.turnedAt = run.time;
      refreshLight(run);
      emit(run, { type: 'rotated', c: order.c, r: order.r });
      return;
    }
    case 'lift': {
      const piece = pieceAt(run.grid, order.c, order.r);
      if (!piece || !building) return;
      run.shards += liftRefund(run, piece);
      setPiece(run.grid, order.c, order.r, null);
      run.flow = buildFlowField(run.grid);
      refreshLight(run);
      emit(run, { type: 'lifted', c: order.c, r: order.r });
      return;
    }
    case 'startWave':
      if (building) startWave(run);
      return;
    case 'flare':
      if (run.phase === 'wave' && run.flareCharges > 0 && run.flareLeft <= 0) {
        run.flareCharges--;
        run.flareLeft = BEAM.flareSeconds;
        emit(run, { type: 'flare' });
      }
      return;
    case 'pick':
      if (run.phase === 'draft' && run.offer[order.index]) {
        const id = run.offer[order.index];
        applyBoon(run, id);
        run.offer = [];
        run.phase = 'build';
        refreshLight(run);
        emit(run, { type: 'boon', id });
      }
      return;
    case 'reroll':
      if (run.phase === 'draft') emit(run, rerollOffer(run) ? { type: 'reroll' } : { type: 'denied', reason: 'Not enough shards' });
      return;
  }
}

function startWave(run) {
  run.phase = 'wave';
  run.schedule = buildWaveSchedule(run.waveIndex, run.diff);
  run.spawnCursor = 0;
  run.waveTime = 0;
  run.flareCharges = FLARE_CHARGES + (run.boons.includes('flare2') ? 1 : 0);
  run.flareLeft = 0;
  refreshLight(run);
  emit(run, { type: 'waveStart', wave: run.waveIndex });
}

function finishWave(run) {
  const bonus = waveClearBonus(run);
  run.score += bonus;
  run.shards += ECONOMY.waveShards + ECONOMY.waveShardsPerWave * run.waveIndex;
  run.stats.wavesCleared++;
  run.chain.count = 0;
  run.chain.timer = 0;
  emit(run, { type: 'waveClear', wave: run.waveIndex, bonus });
  if (run.waveIndex === WAVE_COUNT - 1) {
    endRun(run, 'won');
    return;
  }
  run.waveIndex++;
  run.phase = 'draft';
  run.offer = offerBoons(run);
  refreshLight(run);
}

function endRun(run, outcome) {
  run.phase = outcome;
  run.endedAt = run.time;
  run.enemies.length = outcome === 'lost' ? run.enemies.length : 0;
  emit(run, { type: outcome });
}

function stepWave(run) {
  run.waveTime += DT;
  while (run.spawnCursor < run.schedule.length && run.schedule[run.spawnCursor].t <= run.waveTime) {
    const s = run.schedule[run.spawnCursor++];
    spawnEnemy(run, s.type, s.gate);
    if (s.type === 'matriarch') emit(run, { type: 'boss' });
  }
  moveEnemies(run, DT);
  applyBeamDamage(run, DT);
  resolveFallenAndBiters(run);
  tickChain(run, DT);
  if (run.flareLeft > 0) run.flareLeft = Math.max(0, run.flareLeft - DT);
  if (run.shrineHp <= 0) endRun(run, 'lost');
  else if (run.spawnCursor >= run.schedule.length && run.enemies.length === 0) finishWave(run);
}

/** Advance one fixed tick after applying the queued orders. */
export function stepSim(run, orders) {
  if (orders) for (const order of orders) applyOrder(run, order);
  run.tick++;
  run.time += DT;
  if (run.phase === 'wave') stepWave(run);
}

/** Waves still to spawn plus beetles on the board, for the HUD's remaining bar. */
export function enemiesRemaining(run) {
  return run.schedule.length - run.spawnCursor + run.enemies.length;
}
