// DOM overlays above the canvas: title (with difficulty picker and best scores), how to play,
// pause, the draft's stained-glass roundels, and the results screen. Buttons only queue
// { kind: 'ui', action, arg } intents; main.js decides what they do.
import { DIFFICULTY_ORDER, DIFFICULTIES, ENEMIES, NAMES, PIECES, PIECE_ORDER, RESULT_LOSE_TITLE, RESULT_WIN_TITLE, WAVE_COUNT } from '../config.js';
import { boonById, rerollCost } from '../draft.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';


const SCREENS = ['title', 'howto', 'options', 'pause', 'draft', 'results'];

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
}

function boonChip(id) {
  const b = boonById(id);
  return `<span class="chip" style="--hue:${b.hue}" title="${escapeHtml(b.text)}">${escapeHtml(b.name)}</span>`;
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
export function renderTitle(bestFor, selected) {
  el('difficulty-picker').innerHTML = DIFFICULTY_ORDER.map((id) => {
    const best = bestFor(id);
    return `<button class="diff ${id === selected ? 'on' : ''}" data-action="difficulty" data-arg="${id}">
      <b>${DIFFICULTIES[id].name}</b><small>best ${best.score.toLocaleString('en-US')}</small></button>`;
  }).join('');
}

/** The draft: a huge "SUN MOVES WEST - PICK 1", three roundels (effect on hover), reroll, NEW chip. */
export function renderDraft(menus, run) {
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
        <b>${escapeHtml(b.name)}</b><span class="effect">${escapeHtml(b.text)}</span></button>`;
    })
    .join('');
  const cost = rerollCost(run);
  const reroll = el('draft-reroll');
  reroll.textContent = `X - reroll (${cost} ${NAMES.currency.toLowerCase()})`;
  reroll.disabled = run.quartz < cost;
  const unlocked = PIECE_ORDER.find((type) => PIECES[type].unlockWave === run.waveIndex);
  const newFoe = waveRoster(run.waveIndex, run.diff).find((r) => r.isNew);
  el('draft-new').textContent = unlocked ? `NEW GLASS: ${PIECES[unlocked].name} [${PIECE_ORDER.indexOf(unlocked) + 1}]` : newFoe ? `NEW: ${ENEMIES[newFoe.type].name}` : '';
}

/** Results: win or defeat title, score with NEW BEST, stats, boons, seed and the restart keys. */
export function renderResults(menus, run, isBest) {
  const key = `${run.seed}|${run.phase}|${run.score}`;
  if (key === menus.resultsKey) return;
  menus.resultsKey = key;
  const won = run.phase === 'won';
  el('results-screen').classList.toggle('lost', !won);
  el('results-title').textContent = won ? RESULT_WIN_TITLE : RESULT_LOSE_TITLE;
  el('results-sub').textContent = won
    ? `The ${ENEMIES.titan.name} is ash and the courtyard still blazes at noon.`
    : `The swarm reached the fountain on Day ${run.aperture.day}, ${run.aperture.phase.name.toLowerCase()}.`;
  el('results-score').innerHTML = `${run.score.toLocaleString('en-US')}${isBest ? '<em>NEW BEST</em>' : ''}`;
  el('results-stats').innerHTML = [
    ['BEETLES BURNED', run.stats.kills],
    [`LONGEST ${NAMES.combo}`, `x${run.chain.best}`],
    [NAMES.suns, `${run.stats.wavesCleared}/${WAVE_COUNT}`],
    [NAMES.fountainShort, `${run.shrineHp}/${run.shrineMax}`],
  ]
    .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
    .join('');
  el('results-charms').innerHTML = run.boons.length ? run.boons.map(boonChip).join('') : '<span class="none">No charms taken</span>';
  el('results-seed').textContent = `${run.diff.name} - seed ${run.seed}`;
}
