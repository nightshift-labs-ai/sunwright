// Source budget: build the dossier exactly as main.ts does (in memory) and print each source
// file's bytes in dossier order, so we can see what the judge's outline and the 160 KiB cap hold.
//   node tools/budget.mjs
import { fileURLToPath } from 'node:url';
import { buildDossier } from '../vendor/makefun-game.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const bytes = buildDossier(root, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648, game_path_max_bytes: 1000 });
const dossier = JSON.parse(new TextDecoder().decode(bytes));
const text = dossier.text ?? '';
const heads = [...text.matchAll(/^(?:#+ |== |--- )?(game\/[^\s]+|[\w./-]+\.(?:html|js|css|mjs|json))\b.*?(\d+) lines?.*?(\d+) bytes/gm)];
let total = 0;
if (heads.length) {
  for (const m of heads) {
    total += Number(m[3]);
    console.log(`${m[3].padStart(7)}  ${m[1]}`);
  }
} else {
  console.log(text.split('\n').filter((l) => /bytes/.test(l)).slice(0, 60).join('\n'));
}
console.log(`total source ${total} bytes of 163840; dossier ${bytes.byteLength} bytes`);
