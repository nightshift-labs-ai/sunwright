// DOM overlays above the canvas: title (with difficulty picker and best scores), how to play,
// pause, the draft's stained-glass roundels, and the results screen. Buttons only queue
// { kind: 'ui', action, arg } intents; main.js decides what they do.
import { DIFFICULTY_ORDER, DIFFICULTIES, ENEMIES, FEATS, NAMES, PIECES, PIECE_ORDER, RESULT_LOSE_TITLE, RESULT_WIN_TITLE, SCOPE_LINE, SYNERGY, WAVE_COUNT } from '../config.js';
import { boonById, rerollCost } from '../draft.js';
import { sunApertureFor } from '../sun.js';
import { waveRoster } from '../waves.js';
import { rankFor, rankLadder, runLine } from '../combat.js';
import { runSummary } from '../sim.js';
import { loadFeats } from '../save.js';
import { draftContext, draftHeal, draftHint, historyChip, nextGoal, titleRules } from '../announce.js';
import { drawCharmGlyph } from '../render/charms.js';
import { drawHowtoPicture } from '../render/howto.js';
import { drawRuleIcon } from '../render/ruleicons.js';
import { MIN_SQUEEZE, fitScale } from '../render/fit.js';


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

/** Show one overlay (or none with null); the How to play pictures are drawn the first time. */
export function showScreen(menus, name) {
  if (name === 'howto') for (const c of document.querySelectorAll('.howto-pic')) drawHowtoPicture(c.getContext('2d'), c.dataset.pic);
  menus.current = name;
  for (const s of SCREENS) el(`${s}-screen`).classList.toggle('hidden', s !== name);
}

/** Put the saved settings into the options sliders and boxes. */
export function renderOptions(settings) {
  for (const name of ['volume', 'music', 'sfx']) el(`opt-${name}`).value = settings[name];
  el('opt-shake').checked = settings.shake;
  el('opt-muted').checked = settings.muted;
  el('opt-patterns').checked = !!settings.patterns;
}

/** Difficulty buttons (one word each; the BEST chip shows the selected one's best), the scope line, the rules table. */
export function showTitle(menus, bestFor, selected) {
  el('difficulty-picker').innerHTML = DIFFICULTY_ORDER.map((id) => {
    // The selected difficulty also shows its saved best under its name.
    const best = id === selected ? bestFor(id) : null;
    const line = best?.played ? `<small>best ${best.score.toLocaleString('en-US')}</small>` : '';
    return `<button class="diff ${id === selected ? 'on' : ''}" data-action="difficulty" data-arg="${id}"><b>${DIFFICULTIES[id].name}</b>${line}</button>`;
  }).join('');
  el('rule-scope').textContent = SCOPE_LINE;
  el('feats-count').textContent = `FEATS ${loadFeats().length}/${FEATS.length}`;
  const best = bestFor(selected);
  el('title-best').textContent = best.played ? `BEST ${best.score.toLocaleString('en-US')}` : 'NO BEST YET';
  // The rules table: icon, gold tag, one line per rule (announce.titleRules, numbers from config).
  el('title-rules').innerHTML = titleRules()
    .map((r) =>
      r.tag2
        ? `<div class="rule rule-winlose"><span class="fit"><b>${escapeHtml(r.tag)}</b>${escapeHtml(r.line)}<b class="lose">${escapeHtml(r.tag2)}</b>${escapeHtml(r.line2)}</span></div>`
        : `<div class="rule rule-${r.icon}"><canvas width="36" height="36" data-icon="${r.icon}"></canvas><b>${escapeHtml(r.tag)}</b><span class="fit">${escapeHtml(r.line)}</span></div>`,
    )
    .join('');
  for (const c of el('title-rules').querySelectorAll('canvas')) drawRuleIcon(c.getContext('2d'), c.dataset.icon, 36);
  requestAnimationFrame(() => {
    for (const n of el('title-rules').querySelectorAll('.fit')) {
      n.style.setProperty('--fit', '1');
      n.style.setProperty('--fit', String(fitScale(n.textContent, n.scrollWidth, n.clientWidth)));
    }
  });
}

/** The draft: a huge "SUN MOVES WEST - PICK 1", three roundels each with its one-line effect, NEW chip, reroll and how to pick. */
export function showDraft(menus, run) {
  const key = `${run.waveIndex}|${run.offer.join(',')}|${run.quartz}`;
  if (key === menus.draftKey) return;
  menus.draftKey = key;
  const ap = sunApertureFor(run.seed, run.waveIndex);
  el('draft-banner').textContent = `${NAMES.sun} MOVES ${ap.phase.wallName} - PICK 1`;
  fitHeading(el('draft-banner'), 112, 1160);
  const heal = draftHeal(run);
  el('draft-context').innerHTML = `<span class="ctx">${escapeHtml(draftContext(run))}</span>${heal ? `<span class="healchip">${escapeHtml(heal)}</span>` : ''}`;
  el('draft-roundels').innerHTML = run.offer
    .map((id, i) => {
      const b = boonById(id);
      return `<button class="roundel ${b.weight <= 2 ? 'rare' : ''}" style="--hue:${b.hue}" data-action="pick" data-arg="${i}">
        <span class="glass"></span><span class="key">${i + 1}</span>
        <canvas class="glyph" width="96" height="96" data-charm="${id}"></canvas>
        <b>${escapeHtml(b.name)}</b><span class="effect">${escapeHtml(b.line)}</span>${synergyTag(run, id)}</button>`;
    })
    .join('');
  for (const canvas of el('draft-roundels').querySelectorAll('canvas.glyph')) drawCharmGlyph(canvas.getContext('2d'), canvas.dataset.charm, 48, 48, 46);
  const cost = rerollCost(run);
  const reroll = el('draft-reroll');
  reroll.textContent = `X - reroll (${cost} ${NAMES.currency.toLowerCase()})`;
  reroll.disabled = run.quartz < cost;
  el('draft-hint').textContent = draftHint(run);
  const unlocked = PIECE_ORDER.find((type) => PIECES[type].unlockWave === run.waveIndex);
  const newFoe = waveRoster(run.waveIndex, run.diff).find((r) => r.isNew);
  el('draft-new').textContent = unlocked ? `NEW GLASS: ${PIECES[unlocked].name} [${PIECE_ORDER.indexOf(unlocked) + 1}]` : newFoe ? `NEW: ${ENEMIES[newFoe.type].name}` : '';
}

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "+ pairs with X" when the run already owns this charm's partner. */
function synergyTag(run, id) {
  const partner = SYNERGY[id];
  return partner && run.boons.includes(partner) ? `<span class="synergy">+ pairs with ${escapeHtml(boonById(partner).name)}</span>` : '';
}

/** A drawn mark for the S ladder: green circle with a tick, or red circle with a cross. */
function markSvg(ok) {
  const sign = ok ? '<path d="M6.5 12.5l3.6 3.6 7.4-8.2" />' : '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />';
  return `<svg class="mark ${ok ? 'ok' : 'no'}" data-ok="${ok}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="${ok ? '#2BB673' : '#E0453A'}"/><g stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round">${sign}</g></svg>`;
}

/** Squeeze the ladder line to its plaque, never under 92% (render/fit.js). */
function fitLadder(node) {
  node.style.setProperty('--fit', '1');
  node.style.setProperty('--fit', String(fitScale(node.textContent, node.scrollWidth, node.parentElement.clientWidth - 24)));
}

/** Fit each stat label to its tile on one line, never squeezed under 92% (needs the overlay shown). */
function fitLabels(root) {
  for (const label of root.querySelectorAll('.stats small')) {
    label.style.setProperty('--fit', '1');
    label.style.setProperty('--fit', String(fitScale(label.textContent, label.scrollWidth, label.parentElement.clientWidth - 12)));
  }
}

const measure = document.createElement('canvas').getContext('2d');

/**
 * A one-line heading in `room` px: its natural size up to maxPx, squeezed to no less than 92%;
 * a longer line gets a smaller font instead (render/fit.js rule).
 */
function fitHeading(node, maxPx, room) {
  measure.font = `900 ${maxPx}px system-ui, sans-serif`;
  const k = room / measure.measureText(node.textContent).width;
  const px = k >= MIN_SQUEEZE ? maxPx : Math.floor((maxPx * k) / MIN_SQUEEZE);
  node.style.fontSize = `${px}px`;
  node.style.setProperty('--fit', String(Math.min(1, Math.max(MIN_SQUEEZE, k))));
}


/**
 * Results: THE TITAN IS ASH (or THE SWARM BROKE THROUGH) across the top, then score with NEW BEST,
 * stat tiles, run line, the LAST 3 RUNS strip and the restart keys; the canvas draws the Titan beside it.
 */
export function showResults(menus, run, record, history) {
  const key = `${run.seed}|${run.phase}|${run.score}|${history.length}`;
  if (key === menus.resultsKey) return;
  menus.resultsKey = key;
  const won = run.phase === 'won';
  el('results-screen').classList.toggle('lost', !won);
  const title = el('results-title');
  title.textContent = won ? RESULT_WIN_TITLE : RESULT_LOSE_TITLE;
  fitHeading(title, 104, 1180);
  el('results-sub').textContent = won
    ? `The ${NAMES.fountainShort.toLowerCase()} still runs. The courtyard is yours.`
    : `Fell on Day ${run.aperture.day} ${run.aperture.phase.name.toLowerCase()} - ${run.stats.wavesCleared}/${WAVE_COUNT} ${NAMES.suns.toLowerCase()}`;
  const rank = rankFor(run);
  el('results-score').innerHTML = `<span class="rank rank-${rank}">${rank}</span>${run.score.toLocaleString('en-US')}${record.isBest ? '<em>NEW BEST</em>' : ''}`;
  const tiles = [
    ['BURNED', run.stats.kills],
    [NAMES.suns, `${run.stats.wavesCleared}/${WAVE_COUNT}`],
    [NAMES.fountainShort, `${run.shrineHp}/${run.shrineMax}`],
    [`BEST ${NAMES.combo}`, `x${run.chain.best}`],
  ];
  el('results-stats').innerHTML = tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
  requestAnimationFrame(() => fitLabels(el('results-stats')));
  // Status line: what S still needs, a drawn mark per threshold (seed and "over best" live elsewhere).
  const ladder = rankLadder(run);
  el('results-meta').classList.toggle('hidden', !ladder.head);
  el('results-meta').innerHTML = `<span>${escapeHtml(ladder.head)}</span>` + ladder.marks.map((m) => `<span class="req">${escapeHtml(m.label)}${markSvg(m.ok)}</span>`).join('');
  requestAnimationFrame(() => fitLadder(el('results-meta')));
  el('results-run').textContent = runLine(run, record.previousBest);
  // LAST 3 RUNS strip: the label and one chip per run (a fallen run's red chip says LOST - Day d phase).
  el('results-history').innerHTML = history.length
    ? `<div class="strip-head"><b>LAST ${history.length} RUN${history.length > 1 ? 'S' : ''}</b></div>` +
      `<div class="chips">${history.map((h) => `<span class="chip ${h.outcome === 'won' ? 'won' : 'fell'}">${historyChip(h)}</span>`).join('')}</div>`
    : '';
  // FEATS this run earned, as gold medals (config FEATS, tested on the finished run).
  const earned = runSummary(run).feats;
  el('results-next').textContent = nextGoal(run);
  el('results-feats').classList.toggle('many', earned.length > 4);
  el('results-feats').innerHTML = `<b>FEATS ${earned.length}/${FEATS.length}</b>` + earned.map((id) => `<span class="feat"><i></i>${escapeHtml(FEATS.find((f) => f.id === id).name)}</span>`).join('');
}

/** R / S on the results screen (and the RUN AGAIN / SAME SEED buttons): queue a fresh run. */
export function restartRun(intents, sameSeed) {
  intents.push({ kind: 'ui', action: sameSeed ? 'sameSeed' : 'runAgain', arg: null });
}
