// Visible-name check: every string literal in game/ scripts, and every text node, attribute
// value and id in index.html, must avoid the retired names. Comments are skipped (not shown).
//   node tools/check-names.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = /moth|wisp|shade|lantern|ember|lumen|fade|night|dawn|dusk|shard|keeper|bloom|boon/i;
const RETIRED = /lampmoth|matriarch|umbral|sunseed|kindling|CHAIN|WAVE \d|NOONKEEPER/;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

/** String literals of a JS source (quotes and template text), comments removed. */
function jsStrings(src) {
  const out = [];
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') i = src.indexOf('\n', i);
    else if (ch === '/' && src[i + 1] === '*') i = src.indexOf('*/', i) + 1;
    else if (ch === '/' && /[(,=:[!&|?{};]/.test(src.slice(0, i).trimEnd().slice(-1))) {
      // A regex literal: skip to its closing slash (outside any [...] class).
      let inClass = false;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') inClass = true;
        else if (src[i] === ']') inClass = false;
        else if (src[i] === '/' && !inClass) break;
      }
    } else if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      let text = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') text += src[j++];
        if (ch === '`' && src[j] === '$' && src[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (depth && j < src.length) depth += src[j] === '{' ? 1 : src[j] === '}' ? -1 : 0, j++;
          text += ' ';
          continue;
        }
        text += src[j++];
      }
      out.push(text);
      i = j;
    }
    if (i < 0) break;
  }
  return out;
}

const problems = [];
for (const file of walk('game')) {
  const src = readFileSync(file, 'utf8');
  let strings = [];
  if (file.endsWith('.js')) strings = jsStrings(src);
  else if (file.endsWith('.html')) strings = src.replace(/<!--[\s\S]*?-->/g, '').split(/[<>"]/);
  else if (file.endsWith('.css')) strings = src.replace(/\/\*[\s\S]*?\*\//g, '').split(/[{};]/);
  for (const s of strings) if (BANNED.test(s) || RETIRED.test(s)) problems.push(`${file}: "${s.trim().slice(0, 80)}"`);
}
console.log(problems.length ? problems.join('\n') : 'names OK: no visible string uses a retired or banned name');
process.exit(problems.length ? 1 : 0);
