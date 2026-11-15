// SUNWRIGHT hand-in program (Node 22, standard library + the kit's vendored library only).
// It packs the entry the way make.fun's grader expects: game/ (static files, no build step) and
// screenshots/ (four real renders of the game) are copied into the output directory, then
// dossier.json is written there with buildDossier. Nothing here depends on time, randomness or
// directory iteration order, so two runs produce identical bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copy a directory tree file by file in sorted order (plain files and folders only). */
function copyTreeSorted(from: string, to: string): number {
  mkdirSync(to, { recursive: true });
  let copied = 0;
  for (const name of readdirSync(from).sort()) {
    const source = join(from, name);
    const target = join(to, name);
    const info = statSync(source);
    if (info.isDirectory()) copied += copyTreeSorted(source, target);
    else if (info.isFile()) {
      copyFileSync(source, target);
      copied += 1;
    }
  }
  return copied;
}

const gameFiles = copyTreeSorted(join(repoRoot, 'game'), join(outputDir, 'game'));
const shotFiles = copyTreeSorted(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The grader's caps: a 160 KiB source text, at most 4 screenshots of 256 KiB each, and the
// game/ folder's file-count, byte and path-length limits.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`packed ${gameFiles} game files and ${shotFiles} screenshots; dossier.json ${dossier.byteLength} bytes`);
