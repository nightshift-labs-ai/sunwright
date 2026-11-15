// Screenshot look gate: decode each screenshot in headless Chromium and measure mean HSV
// saturation (target >= 0.33, aim 0.45), luminance standard deviation (>= 40), a warm floor
// (mean R > mean B over the frame), the share of near-black pixels, mean luminance >= 0.45 and
// no 64x64 block darker than 0.15 (no dark frames).
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
    let darkest = 255;
    for (let by = 0; by + 64 <= c.height; by += 64) {
      for (let bx = 0; bx + 64 <= c.width; bx += 64) {
        const b = g.getImageData(bx, by, 64, 64).data;
        let sum = 0;
        for (let i = 0; i < b.length; i += 4) sum += 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
        darkest = Math.min(darkest, sum / (b.length / 4));
      }
    }
    let blown = 0;
    for (let by = 140; by + 32 <= 680; by += 32) {
      for (let bx = 250; bx + 32 <= 1030; bx += 32) {
        const b = g.getImageData(bx, by, 32, 32).data;
        let sum = 0;
        for (let i = 0; i < b.length; i += 4) sum += 0.2126 * b[i] + 0.7152 * b[i + 1] + 0.0722 * b[i + 2];
        if (sum / (b.length / 4) > 0.92 * 255) blown++;
      }
    }
    const mean = lum / n;
    return { blown, darkest, sat: sat / n, lumSd: Math.sqrt(lum2 / n - mean * mean), meanLum: mean, black: black / n, warm: red > blue };
  }, dataUrl);
  const ok = m.sat >= 0.33 && m.lumSd >= 40 && m.warm && m.black < 0.02 && m.meanLum >= 0.45 * 255 && m.darkest >= 0.15 * 255;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${f}: saturation ${m.sat.toFixed(2)}  luminance SD ${m.lumSd.toFixed(1)}  mean ${(m.meanLum / 255).toFixed(2)}  blown 32px blocks ${m.blown}  darkest block ${(m.darkest / 255).toFixed(2)}  near-black ${(m.black * 100).toFixed(1)}%  warm ${m.warm}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
