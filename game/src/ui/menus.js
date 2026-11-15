// DOM overlays above the canvas: title (with difficulty picker and best scores), how to play,
// pause, the draft's stained-glass roundels, and the results screen. Buttons only queue
// { kind: 'ui', action, arg } intents; main.js decides what they do.
import { DIFFICULTY_ORDER, DIFFICULTIES, ENEMIES, PIECES, PIECE_ORDER, WAVE_COUNT } from '../config.js';
import { boonById, rerollCost } from '../draft.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';

const RESULT_TITLES = { won: 'DAWN OF DAY FOUR - THE SUNSEED ENDURES', lost: 'THE SUNSEED DIMS' };
const PHASE_ARRIVAL = { dawn: 'DAWN BREAKS', noon: 'NOON BLAZES', dusk: 'DUSK APPROACHES' };

const SCREENS = ['title', 'howto', 'pause', 'draft', 'results'];

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
  const menus = { current: 'title', draftKey: '', resultsKey: '' };
  return menus;
}

/** Show one overlay (or none with null). */
export function showScreen(menus, name) {
  menus.current = name;
  for (const s of SCREENS) el(`${s}-screen`).classList.toggle('hidden', s !== name);
}

/** Difficulty buttons with each difficulty's best score. */
export function renderTitle(bestFor, selected) {
  el('difficulty-picker').innerHTML = DIFFICULTY_ORDER.map((id) => {
    const best = bestFor(id);
    return `<button class="diff ${id === selected ? 'on' : ''}" data-action="difficulty" data-arg="${id}">
      <b>${DIFFICULTIES[id].name}</b><small>best ${best.score.toLocaleString('en-US')}</small></button>`;
  }).join('');
}

/** The draft: banner for the coming sun, three roundels, reroll, next-wave preview, owned boons. */
export function renderDraft(menus, run) {
  const key = `${run.waveIndex}|${run.offer.join(',')}|${run.shards}`;
  if (key === menus.draftKey) return;
  menus.draftKey = key;
  const ap = sunApertureFor(run.seed, run.waveIndex);
  el('draft-banner').textContent = `${PHASE_ARRIVAL[ap.phase.id]} - THE SUN ENTERS FROM THE ${ap.phase.wallName}`;
  const unlocked = PIECE_ORDER.find((type) => PIECES[type].unlockWave === run.waveIndex);
  el('draft-sub').textContent = unlocked
    ? `NEW GLASS: ${PIECES[unlocked].name.toUpperCase()} (key ${PIECE_ORDER.indexOf(unlocked) + 1}) - ${PIECES[unlocked].blurb}`
    : `Wave ${run.waveIndex} cleared. Choose a boon for Day ${ap.day}, wave ${run.waveIndex + 1}/${WAVE_COUNT}.`;
  el('draft-roundels').innerHTML = run.offer
    .map((id, i) => {
      const b = boonById(id);
      return `<button class="roundel ${b.weight <= 2 ? 'rare' : ''}" style="--hue:${b.hue}" data-action="pick" data-arg="${i}">
        <span class="key">${i + 1}</span><span class="glass"></span>
        <b>${escapeHtml(b.name)}</b><span class="effect">${escapeHtml(b.text)}</span></button>`;
    })
    .join('');
  const cost = rerollCost(run);
  const reroll = el('draft-reroll');
  reroll.textContent = `R - Reroll (${cost} shards)`;
  reroll.disabled = run.shards < cost;
  el('draft-next').innerHTML =
    '<span class="label">NEXT WAVE</span>' +
    waveRoster(run.waveIndex, run.diff)
      .map((r) => `<span class="foe">${escapeHtml(ENEMIES[r.type].name)} x${r.count}${r.isNew ? ' <em>NEW</em>' : ''}</span>`)
      .join('');
  el('draft-owned').innerHTML = run.boons.length ? run.boons.map(boonChip).join('') : '<span class="none">No boons yet</span>';
}

/** Results: win or defeat title, score with NEW BEST, stats, boons, seed and the restart keys. */
export function renderResults(menus, run, isBest) {
  const key = `${run.seed}|${run.phase}|${run.score}`;
  if (key === menus.resultsKey) return;
  menus.resultsKey = key;
  const won = run.phase === 'won';
  el('results-screen').classList.toggle('lost', !won);
  el('results-title').textContent = RESULT_TITLES[won ? 'won' : 'lost'];
  el('results-sub').textContent = won
    ? 'The Umbral Matriarch is ash and the courtyard wakes to a new sun.'
    : `The swarm reached the shrine on Day ${run.aperture.day}, ${run.aperture.phase.name.toLowerCase()}.`;
  el('results-score').innerHTML = `${run.score.toLocaleString('en-US')}${isBest ? '<em>NEW BEST</em>' : ''}`;
  el('results-stats').innerHTML = [
    ['Beetles burned', run.stats.kills],
    ['Longest chain', `x${run.chain.best}`],
    ['Waves cleared', `${run.stats.wavesCleared}/${WAVE_COUNT}`],
    ['Sunseed', `${run.shrineHp}/${run.shrineMax}`],
  ]
    .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
    .join('');
  el('results-boons').innerHTML = run.boons.length ? run.boons.map(boonChip).join('') : '<span class="none">No boons taken</span>';
  el('results-seed').textContent = `${run.diff.name} - seed ${run.seed}`;
}
