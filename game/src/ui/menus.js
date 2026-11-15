// DOM overlays above the canvas: title (with difficulty picker and best scores), how to play,
// pause, the draft's stained-glass roundels, and the results screen. Buttons only queue
// { kind: 'ui', action, arg } intents; main.js decides what they do.
import { DIFFICULTY_ORDER, DIFFICULTIES, ENEMIES, NAMES, PIECES, PIECE_ORDER, RESULT_LOSE_TITLE, RESULT_WIN_TITLE, SCOPE_LINE, WAVE_COUNT } from '../config.js';
import { boonById, rerollCost } from '../draft.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';
import { rankFor } from '../combat.js';
import { drawCharmGlyph } from '../render/charms.js';


const SCREENS = ['title', 'howto', 'options', 'pause', 'draft', 'results'];

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

export function createMenus(intents) {
  document.getElementById('stage').addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button) intents.push({ kind: 'ui', action: button.dataset.action, arg: button.dataset.arg ?? null });
  });
  document.getElementById('options-screen').addEventListener('input', (e) => {
    const input = e.target.closest('[data-setting]');
    if (input) intents.push({ kind: 'ui', action: 'setting', arg: { name: input.dataset.setting, value: input.type === 'checkbox' ? input.checked : Number(input.value) } });
  });
  const menus = { current: 'title', draftKey: '', resultsKey: '' };
  return menus;
}

/** Show one overlay (or none with null). */
export function showScreen(menus, name) {
  menus.current = name;
  for (const s of SCREENS) el(`${s}-screen`).classList.toggle('hidden', s !== name);
}

/** Put the saved settings into the options sliders and boxes. */
export function renderOptions(settings) {
  for (const name of ['volume', 'music', 'sfx']) el(`opt-${name}`).value = settings[name];
  el('opt-shake').checked = settings.shake;
  el('opt-muted').checked = settings.muted;
}

/** Difficulty buttons with each difficulty's best score. */
export function showTitle(menus, bestFor, selected) {
  el('difficulty-picker').innerHTML = DIFFICULTY_ORDER.map((id) => {
    const best = bestFor(id);
    return `<button class="diff ${id === selected ? 'on' : ''}" data-action="difficulty" data-arg="${id}">
      <b>${DIFFICULTIES[id].name}</b><small>${best.played ? `best ${best.score.toLocaleString('en-US')}` : 'not played yet'}</small></button>`;
  }).join('');
  el('rule-scope').textContent = SCOPE_LINE;
}

/** The draft: a huge "SUN MOVES WEST - PICK 1", three roundels (effect on hover), reroll, NEW chip. */
export function showDraft(menus, run) {
  const key = `${run.waveIndex}|${run.offer.join(',')}|${run.quartz}`;
  if (key === menus.draftKey) return;
  menus.draftKey = key;
  const ap = sunApertureFor(run.seed, run.waveIndex);
  el('draft-banner').textContent = `${NAMES.sun} MOVES ${ap.phase.wallName} - PICK 1`;
  el('draft-roundels').innerHTML = run.offer
    .map((id, i) => {
      const b = boonById(id);
      return `<button class="roundel ${b.weight <= 2 ? 'rare' : ''}" style="--hue:${b.hue}" data-action="pick" data-arg="${i}">
        <span class="glass"></span><span class="key">${i + 1}</span>
        <canvas class="glyph" width="96" height="96" data-charm="${id}"></canvas>
        <b>${escapeHtml(b.name)}</b><span class="effect">${escapeHtml(b.text)}</span></button>`;
    })
    .join('');
  for (const canvas of el('draft-roundels').querySelectorAll('canvas.glyph')) drawCharmGlyph(canvas.getContext('2d'), canvas.dataset.charm, 48, 48, 46);
  const cost = rerollCost(run);
  const reroll = el('draft-reroll');
  reroll.textContent = `X - reroll (${cost} ${NAMES.currency.toLowerCase()})`;
  reroll.disabled = run.quartz < cost;
  const unlocked = PIECE_ORDER.find((type) => PIECES[type].unlockWave === run.waveIndex);
  const newFoe = waveRoster(run.waveIndex, run.diff).find((r) => r.isNew);
  el('draft-new').textContent = unlocked ? `NEW GLASS: ${PIECES[unlocked].name} [${PIECE_ORDER.indexOf(unlocked) + 1}]` : newFoe ? `NEW: ${ENEMIES[newFoe.type].name}` : '';
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Shrink each stat label horizontally until it fits its tile on one line (needs the overlay shown). */
function fitLabels(root) {
  for (const label of root.querySelectorAll('.stats small')) {
    label.style.setProperty('--fit', '1');
    const room = label.parentElement.clientWidth - 12;
    if (label.scrollWidth > room) label.style.setProperty('--fit', String(room / label.scrollWidth));
  }
}

/** What to aim for next, from this run's outcome and difficulty. */
function nextGoal(run) {
  if (run.phase !== 'won') return `NEXT GOAL: hold ${run.stats.wavesCleared + 1} ${NAMES.suns.toLowerCase()}`;
  const harder = DIFFICULTY_ORDER[DIFFICULTY_ORDER.indexOf(run.difficultyId) + 1];
  return harder ? `NEXT GOAL: win on ${DIFFICULTIES[harder].name}` : `NEXT GOAL: beat ${run.score.toLocaleString('en-US')}`;
}

/**
 * Results: THE TITAN IS ASH (or THE SWARM BROKE THROUGH) across the top, then score with NEW BEST,
 * stat tiles, run line, RUN HISTORY and the restart keys; the canvas draws the Titan beside it.
 */
export function showResults(menus, run, record, history) {
  const key = `${run.seed}|${run.phase}|${run.score}|${history.length}`;
  if (key === menus.resultsKey) return;
  menus.resultsKey = key;
  const won = run.phase === 'won';
  el('results-screen').classList.toggle('lost', !won);
  const title = el('results-title');
  title.textContent = won ? RESULT_WIN_TITLE : RESULT_LOSE_TITLE;
  requestAnimationFrame(() => title.style.setProperty('--fit', String(Math.min(1, 1180 / title.offsetWidth))));
  el('results-sub').textContent = won
    ? `Courtyard held - ${run.stats.wavesCleared}/${WAVE_COUNT} ${NAMES.suns.toLowerCase()}`
    : `Fell on Day ${run.aperture.day} ${run.aperture.phase.name.toLowerCase()} - ${run.stats.wavesCleared}/${WAVE_COUNT} ${NAMES.suns.toLowerCase()}`;
  const rank = rankFor(run);
  el('results-score').innerHTML = `<span class="rank rank-${rank}">${rank}</span>${run.score.toLocaleString('en-US')}${record.isBest ? '<em>NEW BEST</em>' : ''}`;
  const tiles = [
    ['BEETLES BURNED', run.stats.kills],
    [NAMES.suns, `${run.stats.wavesCleared}/${WAVE_COUNT}`],
    [NAMES.fountainShort, `${run.shrineHp}/${run.shrineMax}`],
    [`LONGEST ${NAMES.combo}`, `x${run.chain.best}`],
  ];
  el('results-stats').innerHTML = tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
  requestAnimationFrame(() => fitLabels(el('results-stats')));
  const delta = run.score - record.previousBest;
  el('results-meta').textContent = `${run.diff.name} - seed ${run.seed} - ${clock(run.time)} - ${delta >= 0 ? `+${delta.toLocaleString('en-US')} over best` : `${(-delta).toLocaleString('en-US')} under best`}`;
  const losses = history.some((h) => h.outcome !== 'won');
  el('results-history').innerHTML =
    (losses ? `<span class="cap">${RESULT_LOSE_TITLE}</span>` : '') +
    history
      .map((h) => (h.outcome === 'won' ? `<span class="chip won">WON ${h.suns}/${WAVE_COUNT}</span>` : `<span class="chip fell">Day ${h.day} ${h.phase.toLowerCase()}</span>`))
      .join('');
  el('results-next').textContent = nextGoal(run);
}

/** R / S on the results screen (and the RUN AGAIN / SAME SEED buttons): queue a fresh run. */
export function restartRun(intents, sameSeed) {
  intents.push({ kind: 'ui', action: sameSeed ? 'sameSeed' : 'runAgain', arg: null });
}
