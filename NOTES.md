# SUNWRIGHT build notes

## Done
- M1 plumbing: git repo, LICENSE (MIT), vendor/makefun-game.ts (kit copy, byte-identical), main.ts
  (sorted copy of game/ + screenshots/, buildDossier), README, tools/budget.mjs, tools/peek.mjs.
- M1 game: title (Play / How to play, difficulty picker with best score, rules strip, live demo
  courtyard), build phase (mirror/splitter/lens/pillar, keys 1-4 + mouse, Q/E/wheel rotate, ghost +
  live beam preview, cannot seal the shrine, lift with refund), real-time waves (beam damage on lit
  cells, Space Flare, armour threshold, CHAIN), Scuttler / Lampmoth / Shellback + Umbral Matriarch
  boss (wave 9, carapace cycle), draft 1-of-3 boons (10 boons) with reroll, sun dawn E / noon N /
  dusk W with seeded spots per day, 9 waves / 3 days, Sunseed HP, shards, score, win/lose results
  with R / S / Esc, Esc pause, WebAudio sfx + beam hum. Fixed 60 Hz sim; sim modules DOM-free.
- tools/balance.mjs greedy + careful bots (headless); playRun records orders per tick.
- tools/playtest.mjs (real clicks/keys, full run to results, R restart, Esc pause, no console errors).
- tools/shots.mjs (one seeded bot run planned in Node, replayed in the browser through the real loop;
  title -> cover at the busiest Day 2 noon tick -> draft before dusk -> win), tools/check-shot-truth.mjs
  (HUD numbers rebuilt from a headless replay at each captured tick), tools/measure-shots.mjs (look gate).
- M2 (part): Prism (key 5, unlocks day 2: gold pierces armour + shells, red burns, blue slows),
  Glassback (mirror shell stops non-gold light; beam re-traced when shells change cell), Lampmoth
  dazzle (lured by light, slowed in it), 12 boons (+ Lens Grinder, True Prism).

## Next
- M2: tune difficulties apart (Gentle clearly easier, Scorched harder); careful bot should win sometimes.
- M3 feel: generative pentatonic music + volume sliders/options, hit-stop on CHAIN steps, shrine pip
  crack, Flare draining ring polish, fast-forward F, colour-blind beam patterns (option).
- Staging: cover must show a lit prism fan (red/blue/gold) across a swarm; consider a hand-directed
  staging player for waves 1-5 instead of the greedy bot (still one real seeded run, forward order).

## Known bugs
- Cover (seed 2023 greedy) has prisms on the board but none in the noon beam.

## Balance tally
- 18:35 UTC, 8 seeds: greedy keeper 0/8 wins mean 3.3 waves; careful keeper 0/8 mean 3.3.
- 18:50 UTC (prism + Glassback + dazzle), 8 seeds: greedy gentle 1/8 (5.4), keeper 1/8 (5.4),
  scorched 0/8 (3.5); careful keeper 0/8 (5.5). Greedy keeper wins 9/60 seeds (2001-2060).

## Operator items
- Entry route: no `makefun init` was run (needs the wallet keypair + drand fetch); the repo now has
  commits, so a source-bundle entry would need a fresh repo. `.makefun/owner.json` (operator's entry
  wallet, as given by the operator) is committed for the GitHub route; keep it unchanged.
