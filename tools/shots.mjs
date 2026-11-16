// Screenshot staging: plan ONE seeded bot run headless (tools/balance.mjs), pick the cover tick
// (the busiest moment of wave 5, Day 2 noon), then replay the very same orders in the browser
// through the real fixed-step loop, renderer and HUD, capturing in forward order:
// title -> play (cover) -> draft (evening approaches) -> results. Writes screenshots/*.jpg and
// tools/shots-manifest.json (the HUD state at each capture, for check-shot-truth.mjs).
//   node tools/shots.mjs [seed] [difficulty=normal] [bot=greedy] [quality=80]
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { COVER_WAVE, planRun } from './stageplan.mjs';
import { playRun } from './balance.mjs';
const require = createRequire('/home/agent/tools/pw/node_modules/');
const { chromium } = require('playwright');

const SEED = Number(process.argv[2] ?? 1000);
const DIFF = process.argv[3] ?? 'normal';
const BOT = process.argv[4] ?? 'greedy';
const QUALITY = Number(process.argv[5] ?? 74);
const URL = 'http://127.0.0.1:8796/index.html?test=1';

/** Two earlier real runs that fell (Day 2 evening, Day 3 noon): they fill the RUN HISTORY and BEST. */
const HISTORY_SEEDS = [3002, 3004];
const history = HISTORY_SEEDS.map((seed) => {
  let end = -1;
  const { result, log } = playRun(seed, DIFF, BOT, (run) => {
    if ((run.phase === 'won' || run.phase === 'lost') && end < 0) end = run.tick;
  });
  return { seed, result, log, endTick: end };
});
for (const h of history) console.log(`history run ${h.seed}: ${h.result.phase} after ${h.result.waves} suns, score ${h.result.score}`);

const plan = planRun(SEED, Number(process.env.STAGE_K ?? 2), DIFF, BOT);
const { result, log, cover, draftTick, endTick } = plan;
console.log(JSON.stringify({ result, cover, draftTick, draftHp: plan.draftHp, endTick, orders: log.length }));
if (result.phase !== 'won') console.log('WARNING: this run is not a win');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => window.__test, null, { timeout: 15000 });
await page.waitForTimeout(200);
const manifest = { seed: SEED, difficulty: DIFF, bot: BOT, shots: [], history: history.map((h) => ({ seed: h.seed, log: h.log, endTick: h.endTick })) };
async function capture(name, state) {
  await page.evaluate(() => window.__test.squeezes());
  await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/${name}`, type: 'jpeg', quality: QUALITY });
  manifest.shots.push({ name, tick: state.tick ?? null, state, squeeze: await page.evaluate(() => window.__test.squeezes()), propOverlaps: await page.evaluate(() => window.__test.propOverlaps()) });
  console.log(`${name}: ${state.phase ?? state.screen} day ${state.day ?? '-'} wave ${state.wave ?? '-'} score ${state.score ?? '-'}`);
}
for (const h of history) {
  await page.evaluate(([seed, diff]) => window.__test.start(seed, diff), [h.seed, DIFF]);
  await page.evaluate(([log, t]) => window.__test.replay(log, t), [h.log, h.endTick + 2]);
}
await page.evaluate(([seed, diff]) => window.__test.start(seed, diff), [SEED, DIFF]);
await page.evaluate(() => window.__test.pointAt(-1, -1));
await capture('1-play.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, cover.tick]));
manifest.shots.at(-1).textOverlaps = await page.evaluate(() => window.__test.textOverlaps());
manifest.shots.at(-1).floaters = await page.evaluate(() => window.__test.floaterCount());
manifest.shots.at(-1).tagOverlaps = await page.evaluate(() => window.__test.tagOverlaps());
manifest.shots.at(-1).starbursts = await page.evaluate(() => window.__test.starbursts());
manifest.shots.at(-1).floaterList = await page.evaluate(() => window.__test.floaters());
await capture('3-draft.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, draftTick]));
manifest.shots.at(-1).draftText = await page.evaluate(() => window.__test.draftText());
await capture('4-results.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, endTick + 150]));
await page.waitForTimeout(100);
manifest.shots.at(-1).resultsText = await page.evaluate(() => window.__test.resultsText());
// Every results text box must sit inside its plaque, and the plaques inside a 24 px margin.
manifest.shots.at(-1).textOutside = await page.evaluate(() => {
  const bad = [];
  for (const plaque of document.querySelectorAll('#results-screen .sheet, #results-screen .results-head')) {
    const p = plaque.getBoundingClientRect();
    if (p.left < 24 || p.top < 24 || p.right > 1256 || p.bottom > 776) bad.push(`plaque ${plaque.className} outside the 24 px margin`);
    for (const node of plaque.querySelectorAll('*')) {
      if (node.childElementCount || !node.textContent.trim()) continue;
      const r = node.getBoundingClientRect();
      if (r.left < p.left || r.right > p.right || r.top < p.top || r.bottom > p.bottom) bad.push(node.textContent.trim().slice(0, 40));
    }
  }
  return bad;
});
// The title last, after every run is saved: its pills and FEATS count read the real save.
await page.evaluate(() => window.__test.ui('menu'));
await page.waitForTimeout(150);
await capture('2-title.jpg', await page.evaluate(() => window.__test.advance(240)));
manifest.shots.at(-1).titleText = await page.evaluate(() => {
  const table = document.getElementById('title-rules').getBoundingClientRect();
  const rows = [...document.querySelectorAll('#title-rules .rule')].map((row) => {
    const line = row.querySelector('span');
    const r = line.getBoundingClientRect();
    const fit = parseFloat(line.style.getPropertyValue('--fit') || '1');
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) parts.push(walker.currentNode.nodeValue.trim());
    return { text: parts.join(' '), px: parseFloat(getComputedStyle(line).fontSize), fit, inside: r.right <= table.right - 4 && r.bottom <= table.bottom && line.scrollWidth * fit <= line.clientWidth + 1 };
  });
  const hint = document.getElementById('start-hint');
  return { rows, hint: hint.textContent.trim(), hintPx: parseFloat(getComputedStyle(hint).fontSize), feats: document.getElementById('feats-count').textContent.trim(), best: document.getElementById('title-best').textContent.trim(), cardOverflow: (() => {
    const card = document.querySelector('.title-card').getBoundingClientRect();
    return [...document.querySelectorAll('.title-card button, .title-card span, .title-card p')].filter((n) => { const r = n.getBoundingClientRect(); return r.left < card.left || r.right > card.right; }).map((n) => n.textContent.trim().slice(0, 20));
  })() };
});
manifest.log = log;
writeFileSync('tools/shots-manifest.json', JSON.stringify(manifest));
console.log(errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors');
await browser.close();
