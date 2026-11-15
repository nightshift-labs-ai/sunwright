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
const QUALITY = Number(process.argv[5] ?? 80);
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
  await page.waitForTimeout(150);
  await page.screenshot({ path: `screenshots/${name}`, type: 'jpeg', quality: QUALITY });
  manifest.shots.push({ name, tick: state.tick ?? null, state });
  console.log(`${name}: ${state.phase ?? state.screen} day ${state.day ?? '-'} wave ${state.wave ?? '-'} score ${state.score ?? '-'}`);
}
for (const h of history) {
  await page.evaluate(([seed, diff]) => window.__test.start(seed, diff), [h.seed, DIFF]);
  await page.evaluate(([log, t]) => window.__test.replay(log, t), [h.log, h.endTick + 2]);
}
await page.evaluate(() => window.__test.ui('menu'));
await page.waitForTimeout(150);
await capture('2-title.jpg', await page.evaluate(() => window.__test.advance(240)));
await page.evaluate(([seed, diff]) => window.__test.start(seed, diff), [SEED, DIFF]);
await page.evaluate(() => window.__test.pointAt(-1, -1));
await capture('1-play.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, cover.tick]));
await capture('3-draft.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, draftTick]));
await capture('4-results.jpg', await page.evaluate(([log, t]) => window.__test.replay(log, t), [log, endTick + 150]));
manifest.log = log;
writeFileSync('tools/shots-manifest.json', JSON.stringify(manifest));
console.log(errors.length ? `console errors: ${errors.join(' | ')}` : 'no console errors');
await browser.close();
