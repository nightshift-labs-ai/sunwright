// Boot and the main loop: a fixed 60 Hz sim step separate from rendering, the screen state
// (title / how to play / play + pause), and turning queued input intents into sim orders.
import { DIFFICULTIES, DT, PIECES, PIECE_ORDER } from './config.js';
import { createRun, pieceCost, pieceUnlocked, runSummary, stepSim } from './sim.js';
import { playSfx, playSizzle, setBeamHum, setVolume, unlockAudio, updateMusic } from './audio.js';
import { loadBest, loadHistory, loadSettings, recordRun, saveSettings } from './save.js';
import { drawFrame } from './render/scene.js';
import { createFx, fxFromEvent, updateFx } from './render/fx.js';
import { hotbarHit } from './render/hud.js';
import { createMenus, renderOptions, restartRun, showDraft, showResults, showScreen, showTitle } from './ui/menus.js';
import { createTitleDemo, stepTitleDemo } from './titledemo.js';
import { createInput, drainIntents } from './input.js';
import { pieceAt, placementCheck, setPiece } from './grid.js';
import { beamModsFor, litLength, traceBeams } from './beams.js';
import { freshSeed } from './rng.js';
import { VIEW_H, VIEW_W, cellAtPixel } from './render/layout.js';
import { installTestHook } from './testhook.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const input = createInput(stage, canvas);
const menus = createMenus(input.intents);

const EVENT_SOUNDS = { placed: 'place', rotated: 'rotate', lifted: 'lift', denied: 'deny', kill: 'kill', bite: 'bite', flare: 'flare', waveStart: 'wave', boss: 'boss', waveClear: 'clear', charm: 'pluck', reroll: 'pluck', won: 'won', lost: 'lost' };
const RESULTS_DELAY = 1.2;

const app = {
  screen: 'title', // 'title' | 'howto' | 'play'
  paused: false,
  manual: false,
  run: null,
  demo: createTitleDemo(),
  settings: loadSettings(),
  fx: createFx(),
  ui: { selected: 'mirror', ghostRot: 0, ghost: null, ghostTrace: null, ghostKey: '', hint: '', hintBad: false, hoverCell: null, hoverPiece: null, best: 0, fast: false },
  orders: [],
  record: { isBest: false, previousBest: 0 },
  shrineHurtAt: -9,
  accumulator: 0,
  lastFrame: 0,
  overlay: '',
  restartArmedUntil: 0,
  showOptions: false,
  fast: false,
};
const NO_UI = { ghost: null, ghostTrace: null, hoverCell: null };

function fitStage() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${(window.innerWidth - VIEW_W * scale) / 2}px`;
  stage.style.top = `${(window.innerHeight - VIEW_H * scale) / 2}px`;
  const density = Math.min(2, scale * (window.devicePixelRatio || 1));
  canvas.width = Math.round(VIEW_W * density);
  canvas.height = Math.round(VIEW_H * density);
  ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
}

function startRun(seed = freshSeed(), difficulty = app.settings.difficulty) {
  app.run = createRun(seed, difficulty);
  app.screen = 'play';
  app.paused = false;
  app.fx = createFx();
  app.orders = [];
  app.record = { isBest: false, previousBest: 0 };
  app.shrineHurtAt = -9;
  app.restartArmedUntil = 0;
  app.ui.selected = 'mirror';
  app.ui.ghostRot = 0;
  app.ui.best = loadBest(difficulty).score;
  app.ui.ghostKey = '';
}

function goTitle() {
  app.screen = 'title';
  app.run = null;
  app.paused = false;
  app.fx = createFx();
}

function toggleMute() {
  app.settings.muted = !app.settings.muted;
  setVolume(app.settings);
  saveSettings(app.settings);
  if (app.showOptions) renderOptions(app.settings);
}

function order(o) {
  app.orders.push(o);
}

/** Q/E/wheel: turn the piece under the mouse, or the placement ghost when the cell is empty. */
function rotateAtHover(dir) {
  const run = app.run;
  const cell = app.ui.hoverCell;
  if (cell && pieceAt(run.grid, cell.c, cell.r)) order({ type: 'rotate', c: cell.c, r: cell.r, dir });
  else if (run.phase === 'build') {
    app.ui.ghostRot = (app.ui.ghostRot + (dir > 0 ? 1 : 3)) & 3;
    playSfx('rotate');
  }
}

/** X: sell the piece under the mouse (refund shown in the tooltip). */
function liftAtHover() {
  const cell = app.ui.hoverCell;
  if (cell && pieceAt(app.run.grid, cell.c, cell.r)) order({ type: 'lift', c: cell.c, r: cell.r });
}

function selectPiece(type) {
  app.ui.selected = type;
  playSfx('click');
}

function handleUiAction(action, arg) {
  playSfx('click');
  const run = app.run;
  switch (action) {
    case 'play': startRun(); break;
    case 'difficulty':
      app.settings.difficulty = arg;
      saveSettings(app.settings);
      showTitle(menus, loadBest, arg);
      break;
    case 'howto': app.screen = 'howto'; break;
    case 'back': app.screen = 'title'; break;
    case 'resume': app.paused = false; break;
    case 'restart': startRun(undefined, run?.difficultyId); break;
    case 'mute': toggleMute(); break;
    case 'options':
      app.showOptions = true;
      renderOptions(app.settings);
      break;
    case 'closeOptions': app.showOptions = false; break;
    case 'setting':
      app.settings[arg.name] = arg.value;
      setVolume(app.settings);
      saveSettings(app.settings);
      break;
    case 'menu': goTitle(); break;
    case 'pick': order({ type: 'pick', index: Number(arg) }); break;
    case 'reroll': order({ type: 'reroll' }); break;
    case 'runAgain': startRun(undefined, run?.difficultyId); break;
    case 'sameSeed': startRun(run.seed, run.difficultyId); break;
    default: break;
  }
}

function handleKeyInPlay(code) {
  const run = app.run;
  if (code === 'KeyM') return toggleMute();
  const over = run.phase === 'won' || run.phase === 'lost';
  if (code === 'Escape') {
    if (app.showOptions) app.showOptions = false;
    else if (over) goTitle();
    else app.paused = !app.paused;
    return;
  }
  if (code === 'KeyF') {
    app.fast = !app.fast;
    return;
  }
  if (app.paused) return;
  if (over) {
    if (code === 'KeyR') restartRun(input.intents, false);
    else if (code === 'KeyS') restartRun(input.intents, true);
    return;
  }
  if (code === 'KeyR') {
    // In a run R restarts only on a second press within 2 s, so a stray key never ends a run.
    if (performance.now() < app.restartArmedUntil) startRun(undefined, run.difficultyId);
    else app.restartArmedUntil = performance.now() + 2000;
    return;
  }
  const digit = code.startsWith('Digit') ? Number(code.slice(5)) : 0;
  if (run.phase === 'draft') {
    if (digit >= 1 && digit <= 3) order({ type: 'pick', index: digit - 1 });
    else if (code === 'KeyX') order({ type: 'reroll' });
    return;
  }
  if (digit >= 1 && digit <= PIECE_ORDER.length) selectPiece(PIECE_ORDER[digit - 1]);
  else if (code === 'KeyX') liftAtHover();
  else if (code === 'KeyQ') rotateAtHover(-1);
  else if (code === 'KeyE') rotateAtHover(1);
  else if (code === 'Space') order({ type: run.phase === 'wave' ? 'flare' : 'startWave' });
  else if (code === 'Enter' || code === 'NumpadEnter') order({ type: 'startWave' });
}

function handleClickInPlay(it) {
  const run = app.run;
  if (app.paused || !(run.phase === 'build' || run.phase === 'wave')) return;
  const hit = hotbarHit(it.x, it.y);
  if (hit) {
    if (PIECES[hit]) selectPiece(hit);
    else order({ type: hit === 'flare' ? 'flare' : 'startWave' });
    return;
  }
  const cell = cellAtPixel(it.x, it.y);
  if (!cell) return;
  const piece = pieceAt(run.grid, cell.c, cell.r);
  if (it.button === 2) {
    if (piece) order({ type: 'lift', c: cell.c, r: cell.r });
  } else if (piece) {
    order({ type: 'rotate', c: cell.c, r: cell.r, dir: 1 });
  } else if (run.phase === 'build') {
    order({ type: 'place', piece: app.ui.selected, c: cell.c, r: cell.r, rot: app.ui.ghostRot });
  }
}

function handleIntent(it) {
  if (it.kind === 'ui') return handleUiAction(it.action, it.arg);
  if (app.screen === 'play') {
    if (it.kind === 'key') handleKeyInPlay(it.code);
    else if (it.kind === 'click') handleClickInPlay(it);
    else if (it.kind === 'wheel' && !app.paused) rotateAtHover(it.dir);
  } else if (it.kind === 'key') {
    if (it.code === 'Enter' || it.code === 'Space') startRun();
    else if (it.code === 'Escape') {
      app.showOptions = false;
      app.screen = 'title';
    }
    else if (it.code === 'KeyM') toggleMute();
  }
}

/** Sim events become effects and sounds; the end of a run is recorded once. */
function consumeEvents(run, withSound) {
  for (const ev of run.events) {
    fxFromEvent(app.fx, ev, run);
    if (withSound && EVENT_SOUNDS[ev.type]) playSfx(EVENT_SOUNDS[ev.type]);
    if (ev.type === 'bite') app.shrineHurtAt = run.time;
    if (ev.type === 'won' || ev.type === 'lost') app.record = recordRun(runSummary(run));
  }
  run.events.length = 0;
}

/** One fixed 60 Hz step of whatever is live: the run, or the title demo. */
function tick() {
  if (app.screen === 'play') {
    if (app.paused) return;
    stepSim(app.run, app.orders);
    app.orders = [];
    consumeEvents(app.run, true);
    updateFx(app.fx, app.run, DT);
  } else {
    stepTitleDemo(app.demo);
    consumeEvents(app.demo.run, false);
    updateFx(app.fx, app.demo.run, DT);
  }
}

/** Ghost piece, predicted beam and hint text for whatever the mouse is over. */
function updateHover() {
  const ui = app.ui;
  const run = app.run;
  ui.ghost = null;
  ui.ghostTrace = null;
  ui.hoverPiece = null;
  ui.hint = '';
  ui.hintBad = false;
  ui.hoverCell = null;
  if (!run || app.screen !== 'play' || app.paused || !input.mouse.inside) return;
  const { x, y } = input.mouse;
  const hit = hotbarHit(x, y);
  if (hit && PIECES[hit]) {
    ui.hint = `${PIECES[hit].name} (${pieceCost(run, hit)} quartz): ${PIECES[hit].blurb}`;
    return;
  }
  const cell = cellAtPixel(x, y);
  if (!cell || !(run.phase === 'build' || run.phase === 'wave')) return;
  ui.hoverCell = cell;
  const piece = pieceAt(run.grid, cell.c, cell.r);
  ui.hoverPiece = piece;
  if (piece) {
    ui.hint = `${PIECES[piece.type].name}: ${PIECES[piece.type].blurb}${piece.type === 'pillar' ? '' : ' - click or Q/E to turn'}${run.phase === 'build' ? ' - right-click to lift' : ''}`;
    return;
  }
  if (run.phase !== 'build') return;
  const type = ui.selected;
  const key = `${cell.c},${cell.r},${type},${ui.ghostRot},${run.layoutVersion},${run.quartz}`;
  if (key !== ui.ghostKey) {
    const probe = { ...run.grid, pieces: run.grid.pieces.slice() };
    const check = placementCheck(probe, cell.c, cell.r);
    if (!pieceUnlocked(run, type)) Object.assign(check, { ok: false, reason: `The ${PIECES[type].name} unlocks on day 2` });
    const afford = run.quartz >= pieceCost(run, type);
    let trace = null;
    if (check.ok) {
      setPiece(probe, cell.c, cell.r, { type, rot: ui.ghostRot });
      trace = traceBeams(probe, run.aperture, beamModsFor(run.boons));
    }
    ui.ghostKey = key;
    ui.ghostCache = { ok: check.ok && afford, trace, hint: !check.ok ? check.reason : afford ? `Place ${PIECES[type].name} (${pieceCost(run, type)} quartz) - Q/E turns it` : 'Not enough quartz' };
  }
  ui.ghost = { piece: { type, rot: ui.ghostRot, prevRot: ui.ghostRot, turnedAt: -1 }, c: cell.c, r: cell.r, ok: ui.ghostCache.ok };
  ui.ghostTrace = ui.ghostCache.trace;
  ui.hint = ui.ghostCache.hint;
  ui.hintBad = !ui.ghostCache.ok;
}

/** Keep the DOM overlay in step with the screen and run phase. */
function syncOverlays() {
  let want = null;
  const run = app.run;
  if (app.showOptions) want = 'options';
  else if (app.screen === 'title') want = 'title';
  else if (app.screen === 'howto') want = 'howto';
  else if (app.paused) want = 'pause';
  else if (run.phase === 'draft') want = 'draft';
  else if ((run.phase === 'won' || run.phase === 'lost') && run.time - run.endedAt >= RESULTS_DELAY) want = 'results';
  if (want === 'draft') showDraft(menus, run);
  if (want === 'results') showResults(menus, run, app.record, loadHistory().slice(-3));
  if (want !== app.overlay) {
    if (want === 'title') showTitle(menus, loadBest, app.settings.difficulty);
    showScreen(menus, want);
    app.overlay = want;
  }
}

function render() {
  if (app.screen === 'play') {
    const run = app.run;
    app.ui.fast = app.fast;
    app.ui.restartArmed = performance.now() < app.restartArmedUntil;
    const resultsHero = app.overlay === 'results';
    const showHud = run.phase !== 'draft' && !resultsHero;
    drawFrame(ctx, { run, ui: app.ui, fx: app.fx, time: run.time, showHud, resultsHero, shake: app.settings.shake, shrineHurtAgo: run.time - app.shrineHurtAt });
    setBeamHum(litLength(run.trace), run.phase === 'wave' && !app.paused);
    updateMusic(run.waveIndex, run.phase === 'wave' && !app.paused);
    if (run.phase === 'wave' && !app.paused) playSizzle(run.enemies.reduce((n, e) => n + (e.litPower > 0 && !e.shielded ? 1 : 0), 0));
  } else {
    drawFrame(ctx, { run: app.demo.run, ui: NO_UI, fx: app.fx, time: app.demo.run.time, showHud: false, shake: false, titleTraces: app.demo.traces });
    setBeamHum(0, false);
    updateMusic(0, false);
  }
}

function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - app.lastFrame) / 1000));
  app.lastFrame = now;
  for (const it of drainIntents(input)) handleIntent(it);
  if (!app.manual) {
    app.accumulator += dt * (app.fast && app.run?.phase === 'wave' ? 2 : 1);
    let steps = 0;
    while (app.accumulator >= DT && steps < 16) {
      tick();
      app.accumulator -= DT;
      steps++;
    }
    if (steps === 16) app.accumulator = 0;
  }
  updateHover();
  syncOverlays();
  render();
  requestAnimationFrame(frame);
}

// Audio may only start after a user gesture.
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
setVolume(app.settings);
window.addEventListener('resize', fitStage);
fitStage();
if (!DIFFICULTIES[app.settings.difficulty]) app.settings.difficulty = 'normal';

if (new URLSearchParams(location.search).has('test')) {
  installTestHook(app, {
    startRun,
    tick,
    intent: (it) => handleIntent(it),
    pointAt: (x, y) => {
      input.mouse.x = x;
      input.mouse.y = y;
      input.mouse.inside = x >= 0;
    },
    render: () => {
      updateHover();
      syncOverlays();
      render();
    },
  });
}
requestAnimationFrame((now) => {
  app.lastFrame = now;
  frame(now);
});
