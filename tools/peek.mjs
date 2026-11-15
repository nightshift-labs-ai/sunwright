// Development peek: load the game at 1280x800, optionally run a JS snippet against the page
// (the ?test=1 hook is window.__test), wait, screenshot, and print console errors.
//   node tools/peek.mjs "<url>" out.jpg [waitMs] [snippet]
import { createRequire } from 'node:module';
const require = createRequire('/home/agent/tools/pw/node_modules/');
const { chromium } = require('playwright');
const [url, out, wait = '1500', snippet = ''] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(300);
let result = null;
if (snippet) result = await page.evaluate(snippet);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
console.log(JSON.stringify({ errors, result }, null, 1).slice(0, 3000));
await browser.close();
