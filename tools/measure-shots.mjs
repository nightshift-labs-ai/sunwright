// Screenshot look gate: decode each screenshot in headless Chromium and measure mean HSV
// saturation (target >= 0.33, aim 0.45), luminance standard deviation (>= 40), a warm floor
// (mean R > mean B over the frame) and the share of near-black pixels (keep it tiny).
//   node tools/measure-shots.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/home/agent/tools/pw/node_modules/');
const { chromium } = require('playwright');

const files = readdirSync('screenshots').filter((f) => f.endsWith('.jpg')).sort();
const browser = await chromium.launch();
const page = await browser.newPage();
let failed = 0;
for (const f of files) {
  const dataUrl = `data:image/jpeg;base64,${readFileSync(`screenshots/${f}`).toString('base64')}`;
  const m = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sat = 0, lum = 0, lum2 = 0, black = 0, n = 0, red = 0, blue = 0;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], gr = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
      sat += mx ? (mx - mn) / mx : 0;
      const l = 0.2126 * r + 0.7152 * gr + 0.0722 * b;
      lum += l;
      lum2 += l * l;
      if (l < 25) black++;
      red += r;
      blue += b;
      n++;
    }
    const mean = lum / n;
    return { sat: sat / n, lumSd: Math.sqrt(lum2 / n - mean * mean), meanLum: mean, black: black / n, warm: red > blue };
  }, dataUrl);
  const ok = m.sat >= 0.33 && m.lumSd >= 40 && m.warm && m.black < 0.02;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f}: saturation ${m.sat.toFixed(2)}  luminance SD ${m.lumSd.toFixed(1)}  mean ${m.meanLum.toFixed(0)}  near-black ${(m.black * 100).toFixed(1)}%  warm ${m.warm}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
