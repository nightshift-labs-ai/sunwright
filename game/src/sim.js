// The run state and its fixed-step update. Input never touches this state directly: it queues
// orders, and stepSim applies them at the start of the next 60 Hz tick, then advances the phase
// machine build -> wave -> draft -> build ... -> won | lost.
import { BEAM, CHARM_FX, DIFFICULTIES, FEATS, DT, ECONOMY, FLARE_CHARGES, FOUNTAIN_MAX, PIECES, UPGRADES, WAVE_COUNT } from './config.js';
import { beamModsFor, levelOf, traceBeams } from './beams.js';
import { sunApertureFor } from './sun.js';
import { moveEnemies, shellBlockers, spawnEnemy } from './enemies.js';
import { buildWaveSchedule } from './waves.js';
import { applyBeamDamage, resolveFallenAndBiters, tickChain, waveClearBonus } from './combat.js';
import { applyBoon, offerBoons, rerollOffer } from './draft.js';
import { announceEvents } from './announce.js';
import { buildFlowField } from './pathing.js';
import { createGrid, pieceAt, placementCheck, setPiece } from './grid.js';
import { createRng } from './rng.js';

/** mode: 'campaign' (win by holding 9 suns) or 'eclipse' (endless: the suns go on until the fountain runs dry). */
export function createRun(seed, difficultyId = 'normal', mode = 'campaign') {
  const diff = DIFFICULTIES[difficultyId];
  const grid = createGrid();
  const run = {
    seed,
    difficultyId,
    diff,
    mode,
    rng: createRng(seed ^ 0x5eed),
    tick: 0,
    time: 0,
    phase: 'build',
    waveIndex: 0,
    grid,
    flow: buildFlowField(grid),
    trace: null,
    aperture: null,
    quartz: diff.startQuartz,
    score: 0,
    shrineHp: FOUNTAIN_MAX,
    shrineMax: FOUNTAIN_MAX,
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
    feedback: { searAt: -9, biteAt: -9, biteHarm: 0, quartzAt: -9 },
    stats: { kills: 0, sunHeal: 0, leaked: 0, wavesCleared: 0, offersSeen: 0 },
    // What this run has met, for the Almanac: beetle kinds spawned, glass placed, charms offered.
    met: { enemies: [], glass: [], charms: [] },
    events: [],
    endedAt: 0,
    layoutVersion: 0,
    shellKey: '',
    log: [],
    banner: null,
    waveNotes: new Set(),
  };
  refreshLight(run);
  return run;
}

/** Re-trace the beam for the current wave's opening (after any piece, boon or wave change). */
export function refreshLight(run) {
  run.layoutVersion++;
  run.aperture = sunApertureFor(run.seed, run.waveIndex);
  const shells = shellBlockers(run);
  run.shellKey = shells.key;
  run.trace = traceBeams(run.grid, run.aperture, beamModsFor(run.boons), shells.cells.size ? shells.cells : null);
}

/** Pieces unlock as the days pass (the Prism on day 2). */
export function pieceUnlocked(run, type) {
  return run.waveIndex >= (PIECES[type].unlockWave ?? 0);
}

export function pieceCost(run, type) {
  const discount = run.boons.includes('discount') && (type === 'mirror' || type === 'splitter') ? CHARM_FX.discount.cost : 0;
  return Math.max(1, PIECES[type].cost - discount);
}

/** Quartz returned when lifting a piece: all of it if placed this build phase, else half. */
/** The price of a placed piece's next level, or null (pillars and Lv3 glass cannot upgrade). */
export function upgradeCost(piece) {
  if (!piece || piece.type === 'pillar' || levelOf(piece) >= 3) return null;
  return UPGRADES.cost[levelOf(piece) - 1];
}

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
      if (!pieceUnlocked(run, order.piece)) check.ok = false;
      if (!check.ok || run.quartz < cost) {
        emit(run, { type: 'denied', c: order.c, r: order.r, reason: !pieceUnlocked(run, order.piece) ? 'Unlocks on day 2' : check.ok ? 'Not enough quartz' : check.reason });
        return;
      }
      run.quartz -= cost;
      if (!run.met.glass.includes(order.piece)) run.met.glass.push(order.piece);
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
      if (!piece || !(building || run.phase === 'wave')) return;
      run.quartz += liftRefund(run, piece);
      setPiece(run.grid, order.c, order.r, null);
      run.flow = buildFlowField(run.grid);
      refreshLight(run);
      emit(run, { type: 'lifted', c: order.c, r: order.r });
      return;
    }
    case 'upgrade': {
      const piece = pieceAt(run.grid, order.c, order.r);
      const cost = upgradeCost(piece);
      if (cost === null || !(building || run.phase === 'wave')) return;
      if (run.quartz < cost) {
        emit(run, { type: 'denied', c: order.c, r: order.r, reason: 'Not enough quartz' });
        return;
      }
      run.quartz -= cost;
      piece.level = levelOf(piece) + 1;
      piece.paid += cost;
      refreshLight(run);
      emit(run, { type: 'upgraded', c: order.c, r: order.r, level: piece.level });
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
        emit(run, { type: 'charm', id });
      }
      return;
    case 'reroll':
      if (run.phase === 'draft') emit(run, rerollOffer(run) ? { type: 'reroll' } : { type: 'denied', reason: 'Not enough quartz' });
      return;
  }
}

function startWave(run) {
  run.phase = 'wave';
  run.schedule = buildWaveSchedule(run.waveIndex, run.diff);
  run.spawnCursor = 0;
  run.waveTime = 0;
  run.flareCharges = FLARE_CHARGES + (run.boons.includes('flare2') ? CHARM_FX.flare2.charges : 0);
  run.flareLeft = 0;
  run.waveNotes = new Set();
  refreshLight(run);
  emit(run, { type: 'waveStart', wave: run.waveIndex });
}

function finishWave(run) {
  // Sunstone mends the fountain after the sun; the draft names that heal (stats.sunHeal).
  const before = run.shrineHp;
  if (run.boons.includes('sunstone')) run.shrineHp = Math.min(run.shrineMax, run.shrineHp + CHARM_FX.sunstone.heal);
  run.stats.sunHeal = run.shrineHp - before;
  const bonus = waveClearBonus(run);
  run.score += bonus;
  run.quartz += ECONOMY.waveQuartz + ECONOMY.waveQuartzPerWave * run.waveIndex;
  run.stats.wavesCleared++;
  run.chain.count = 0;
  run.chain.timer = 0;
  emit(run, { type: 'waveClear', wave: run.waveIndex, bonus });
  if (run.waveIndex === WAVE_COUNT - 1 && run.mode !== 'eclipse') {
    endRun(run, 'won');
    return;
  }
  run.waveIndex++;
  run.phase = 'draft';
  run.offer = offerBoons(run);
  run.stats.offersSeen += run.offer.length;
  for (const id of run.offer) if (!run.met.charms.includes(id)) run.met.charms.push(id);
  refreshLight(run);
  for (const type of Object.keys(PIECES)) if (PIECES[type].unlockWave === run.waveIndex) emit(run, { type: 'unlock', piece: type });
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
    spawnEnemy(run, s.type, s.gate, s.hpMul);
    if (!run.met.enemies.includes(s.type)) run.met.enemies.push(s.type);
    if (s.type === 'titan') emit(run, { type: 'boss' });
  }
  moveEnemies(run, DT);
  if (shellBlockers(run).key !== run.shellKey) refreshLight(run);
  applyBeamDamage(run, DT);
  resolveFallenAndBiters(run);
  tickChain(run, DT);
  if (run.flareLeft > 0) run.flareLeft = Math.max(0, run.flareLeft - DT);
  if (run.shrineHp <= 0) endRun(run, 'lost');
  else if (run.spawnCursor >= run.schedule.length && run.enemies.length === 0) finishWave(run);
}

/** Advance one fixed tick after applying the queued orders. */
export function stepSim(run, orders) {
  const first = run.events.length;
  if (orders) for (const order of orders) applyOrder(run, order);
  run.tick++;
  run.time += DT;
  if (run.phase === 'wave') stepWave(run);
  announceEvents(run, run.events.slice(Math.min(first, run.events.length)));
}

/** What the save keeps of a finished run (also shown in the results' RUN HISTORY). */
export function runSummary(run) {
  const feats = FEATS.filter((f) => f.test(run)).map((f) => f.id);
  return { met: run.met, difficultyId: run.difficultyId, mode: run.mode, outcome: run.phase, score: run.score, suns: run.stats.wavesCleared, day: run.aperture.day, phase: run.aperture.phase.name, feats };
}

/** Waves still to spawn plus beetles on the board, for the HUD's remaining bar. */
export function enemiesRemaining(run) {
  return run.schedule.length - run.spawnCursor + run.enemies.length;
}
