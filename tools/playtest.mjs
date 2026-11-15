// Automated playtest in headless Chromium: real clicks and keys for every control, the ?test=1
// hook only to fast-forward time. Plays a run to its end, checks the results screen, restart
// and pause, and fails on any console error.
//   node tools/playtest.mjs [baseUrl=http://127.0.0.1:8796/index.html]
import { createRequire } from 'node:module';
const require = createRequire('/home/agent/tools/pw/node_modules/');
const { chromium } = require('playwright');

const base = process.argv[2] ?? 'http://127.0.0.1:8796/index.html';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
const failures = [];
const expect = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures.push(what); };
const frame = () => page.waitForTimeout(60);
const state = () => page.evaluate(() => window.__test.state());
const advance = (n) => page.evaluate((k) => window.__test.advance(k), n);
const visible = (id) => page.evaluate((i) => !document.getElementById(i).classList.contains('hidden'), id);
const cellCentre = (c, r) => ({ x: 224 + c * 64 + 32, y: 106 + r * 64 + 32 });

await page.goto(`${base}?test=1`, { waitUntil: 'load' });
await frame();
expect(await visible('title-screen'), 'title screen shows on load');
await page.click('#howto-button');
await frame();
expect(await visible('howto-screen'), 'How to play opens');
await page.click('#howto-screen button[data-action="back"]');
await frame();
await page.click('#difficulty-picker button[data-arg="gentle"]');
await frame();
await page.click('#play-button');
await frame();
let s = await state();
expect(s.screen === 'play' && s.phase === 'build' && s.difficulty === 'Gentle', 'Play starts a Gentle run in the build phase');

const shardsBefore = s.shards;
await page.keyboard.press('Digit1');
const at = cellCentre(4, 4);
await page.mouse.move(at.x, at.y);
await page.keyboard.press('KeyE');
await frame();
await page.mouse.click(at.x, at.y);
await frame();
await advance(1);
s = await state();
expect(s.shards === shardsBefore - 3, 'clicking a cell places a mirror and spends 3 shards');
await page.keyboard.press('KeyQ');
await frame();
await advance(1);
await page.mouse.click(at.x, at.y, { button: 'right' });
await frame();
await advance(1);
s = await state();
expect(s.shards === shardsBefore, 'right-click lifts it for a full refund');
const shrineSide = cellCentre(6, 1);
await page.keyboard.press('Digit4');
await page.mouse.click(shrineSide.x, shrineSide.y);
await frame();
await advance(1);
s = await state();
expect(s.shards === shardsBefore - 1, 'a pillar can be placed next to the shrine');

await page.keyboard.press('Enter');
await frame();
await advance(1);
s = await state();
expect(s.phase === 'wave', 'Enter starts the wave');
await advance(200);
await page.keyboard.press('Space');
await frame();
await advance(1);
s = await state();
expect(s.flareCharges === 0, 'Space fires the Flare');

let draftSeen = false;
for (let guard = 0; guard < 400; guard++) {
  s = await state();
  if (s.phase === 'won' || s.phase === 'lost') break;
  if (s.phase === 'draft') {
    draftSeen = true;
    await frame();
    if (!(await visible('draft-screen'))) failures.push('draft overlay hidden in draft phase');
    await page.keyboard.press('Digit1');
  } else if (s.phase === 'build') await page.keyboard.press('Enter');
  await frame();
  await advance(s.phase === 'wave' ? 300 : 1);
}
s = await state();
expect(draftSeen, 'a draft was offered between waves');
expect(s.phase === 'won' || s.phase === 'lost', `the run ends (${s.phase} after ${s.kills} kills, wave ${s.wave})`);
await advance(90);
await frame();
expect(await visible('results-screen'), 'results screen shows');
const title = await page.textContent('#results-title');
expect(/SUNSEED/.test(title), `results title reads "${title}"`);
await page.keyboard.press('KeyR');
await frame();
await advance(1);
s = await state();
expect(s.phase === 'build' && s.wave === 1 && s.score === 0, 'R starts a fresh run');
await page.keyboard.press('Escape');
await frame();
expect(await visible('pause-screen'), 'Esc pauses');
await page.keyboard.press('Escape');
await frame();
expect(!(await visible('pause-screen')), 'Esc resumes');
expect(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failures.length ? `${failures.length} FAILED` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
