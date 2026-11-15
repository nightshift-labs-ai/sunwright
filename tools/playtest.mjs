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
const cellCentre = (c, r) => ({ x: 250 + c * 60 + 30, y: 140 + r * 60 + 30 });

await page.goto(`${base}?test=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__test, null, { timeout: 15000 });
await frame();
expect(await visible('title-screen'), 'title screen shows on load');
await page.click('#howto-button');
await frame();
expect(await visible('howto-screen'), 'How to play opens');
await page.click('#howto-screen button[data-action="back"]');
await frame();
await page.click('#options-button');
await frame();
expect(await visible('options-screen'), 'Options opens from the title');
await page.fill('#opt-music', '0.3');
await page.dispatchEvent('#opt-music', 'input');
await frame();
const music = await page.evaluate(() => JSON.parse(localStorage.getItem('sunwright.save.v1')).settings.music);
expect(music === 0.3, 'the music slider saves its setting');
await page.click('#options-screen button[data-action="closeOptions"]');
await frame();
expect(await visible('title-screen'), 'Back returns to the title');
// ENTER starts the selected difficulty; the arrow keys move the selection.
await page.click('#difficulty-picker button[data-arg="scorched"]');
await frame();
await page.keyboard.press('Enter');
await frame();
let s = await state();
expect(s.screen === 'play' && s.difficulty === 'SCORCHED', `ENTER on the title starts the selected difficulty (${s.difficulty})`);
await page.evaluate(() => window.__test.ui('menu'));
await frame();
await page.keyboard.press('ArrowUp');
await frame();
const picked = await page.evaluate(() => document.querySelector('#difficulty-picker .diff.on')?.dataset.arg);
expect(picked === 'normal', `ArrowUp on the title moves the selection to Normal (${picked})`);
await page.click('#difficulty-picker button[data-arg="gentle"]');
await frame();
await page.click('#play-button');
await frame();
s = await state();
expect(s.screen === 'play' && s.phase === 'build' && s.difficulty === 'GENTLE', 'Play starts a Gentle run in the build phase');

// M mutes the real mix and the setting is saved; M again brings the sound back.
const savedMuted = () => page.evaluate(() => JSON.parse(localStorage.getItem('sunwright.save.v1')).settings.muted);
await page.keyboard.press('KeyM');
await page.waitForTimeout(400);
let audio = await page.evaluate(() => window.__test.audio());
expect((await savedMuted()) === true && audio.muted && (audio.gain === null || audio.gain < 0.05), `M mutes the audio and saves it (gain ${audio.gain})`);
await page.keyboard.press('KeyM');
await page.waitForTimeout(400);
audio = await page.evaluate(() => window.__test.audio());
expect((await savedMuted()) === false && !audio.muted && (audio.gain === null || audio.gain > 0.3), `M again turns the sound back on (gain ${audio.gain})`);

const quartzBefore = s.quartz;
await page.keyboard.press('Digit1');
const at = cellCentre(4, 4);
await page.mouse.move(at.x, at.y);
await page.keyboard.press('KeyE');
await frame();
await page.mouse.click(at.x, at.y);
await frame();
await advance(1);
s = await state();
expect(s.quartz === quartzBefore - 3, 'clicking a cell places a mirror and spends 3 quartz');
await page.keyboard.press('KeyQ');
await frame();
await advance(1);
await page.mouse.click(at.x, at.y, { button: 'right' });
await frame();
await advance(1);
s = await state();
expect(s.quartz === quartzBefore, 'right-click lifts it for a full refund');
const shrineSide = cellCentre(6, 1);
await page.keyboard.press('Digit4');
await page.mouse.click(shrineSide.x, shrineSide.y);
await frame();
await advance(1);
s = await state();
expect(s.quartz === quartzBefore - 1, 'a pillar can be placed next to the shrine');

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
expect(/COURTYARD HELD|SWARM BROKE THROUGH/.test(title), `results title reads "${title}"`);
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
const before = (await state()).quartz;
await page.keyboard.press('Digit1');
const spot = cellCentre(4, 5);
await page.mouse.click(spot.x, spot.y);
await frame();
await advance(1);
await page.keyboard.press('KeyR');
await frame();
await advance(1);
expect((await state()).quartz === before - 3, 'one R press in a run does not restart it');
await page.keyboard.press('KeyR');
await frame();
await advance(1);
expect((await state()).quartz === before && (await state()).tick <= 2, 'a second R press restarts the run');
// Every line drawn during the whole playtest fits its box at >= 92% width (render/fit.js).
const squeeze = await page.evaluate(() => window.__test.squeezes());
expect(squeeze.tooTight.length === 0, `no line squeezed under 92%${squeeze.tooTight.length ? `: ${squeeze.tooTight.join(' | ')}` : ''}`);
expect(errors.length === 0, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failures.length ? `${failures.length} FAILED` : 'ALL PASSED');
process.exit(failures.length ? 1 : 0);
