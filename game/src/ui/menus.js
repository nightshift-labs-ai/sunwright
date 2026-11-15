// DOM overlays above the canvas: title (with difficulty picker and best scores), how to play,
// pause, the draft's stained-glass roundels, and the results screen. Buttons only queue
// { kind: 'ui', action, arg } intents; main.js decides what they do.
import { DIFFICULTY_ORDER, DIFFICULTIES, ENEMIES, NAMES, PIECES, PIECE_ORDER, RESULT_LOSE_TITLE, RESULT_WIN_TITLE, SCOPE_LINE, WAVE_COUNT } from '../config.js';
import { boonById, rerollCost } from '../draft.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';
import { drawCharmGlyph } from '../render/charms.js';
import { drawLoopPicto } from '../render/pictos.js';


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
      <b>${DIFFICULTIES[id].name}</b><small>best ${best.score.toLocaleString('en-US')}</small></button>`;
  }).join('');
  el('rule-scope').textContent = SCOPE_LINE;
  if (!el('rule-loop').childElementCount) {
    el('rule-loop').innerHTML = [['place', 'PLACE'], ['burn', 'BURN'], ['reaim', 'RE-AIM']]
      .map(([kind, label], k) => `${k ? '<span class="arrow">-&gt;</span>' : ''}<canvas width="52" height="52" data-picto="${kind}"></canvas><span>${label}</span>`)
      .join('');
    for (const canvas of el('rule-loop').querySelectorAll('canvas')) drawLoopPicto(canvas.getContext('2d'), canvas.dataset.picto, 52);
  }
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

/** Break a title at the space nearest its middle (for narrow history cells). */
function twoLines(title) {
  const words = title.split(' ');
  const half = Math.ceil(words.length / 2);
  return `${words.slice(0, half).join(' ')}<br>${words.slice(half).join(' ')}`;
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Results: THE TITAN IS ASH (or THE SWARM BROKE THROUGH) across the top, then score with NEW BEST,
 * one-line tiles and the restart keys; the canvas draws the Titan's carcass beside it.
 */
export function showResults(menus, run, isBest, history) {
  const key = `${run.seed}|${run.phase}|${run.score}|${history.length}`;
  if (key === menus.resultsKey) return;
  menus.resultsKey = key;
  const won = run.phase === 'won';
  el('results-screen').classList.toggle('lost', !won);
  const title = el('results-title');
  title.textContent = won ? RESULT_WIN_TITLE : RESULT_LOSE_TITLE;
  title.style.setProperty('--fit', String(Math.min(1, 1180 / title.offsetWidth)));
  el('results-sub').textContent = won
    ? `Courtyard held - ${run.stats.wavesCleared}/${WAVE_COUNT} ${NAMES.suns.toLowerCase()}`
    : `Fell on Day ${run.aperture.day} ${run.aperture.phase.name.toLowerCase()} - ${run.stats.wavesCleared}/${WAVE_COUNT} ${NAMES.suns.toLowerCase()}`;
  el('results-score').innerHTML = `${run.score.toLocaleString('en-US')}${isBest ? '<em>NEW BEST</em>' : ''}`;
  const tiles = [
    [`LONGEST ${NAMES.combo}`, `x${run.chain.best}`],
    [NAMES.fountainShort, `${run.shrineHp}/${run.shrineMax}`],
    won && run.stats.titanSeconds !== undefined ? ['TITAN BURNED', clock(run.stats.titanSeconds)] : ['BEETLES', run.stats.kills],
  ];
  el('results-stats').innerHTML = tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
  el('results-history').innerHTML =
    '<span class="label">RUN HISTORY</span>' +
    history
      .map((h) =>
        h.outcome === 'won'
          ? `<div class="won"><b>WON ${h.suns}/${WAVE_COUNT}</b><small>${h.score.toLocaleString('en-US')}</small></div>`
          : `<div class="fell"><i class="dry"></i><b>${twoLines(RESULT_LOSE_TITLE)}</b><small>Day ${h.day} ${h.phase.toLowerCase()}</small></div>`,
      )
      .join('');
}

/** R / S on the results screen (and the RUN AGAIN / SAME SEED buttons): queue a fresh run. */
export function restartRun(intents, sameSeed) {
  intents.push({ kind: 'ui', action: sameSeed ? 'sameSeed' : 'runAgain', arg: null });
}
