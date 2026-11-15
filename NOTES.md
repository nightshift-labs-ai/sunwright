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
- tools/balance.mjs greedy + careful bots (headless).

## Next
- Fix: draft banner wraps (too big), INCOMING name/count overlap, NEXT label overflow in the sun
  panel, hotbar names overlap icons, hover hint sits on the top wall.
- Proper staging tools/shots.mjs (one seeded run, forward order, win shot) + check-shot-truth.mjs.
- M2: balance (bots die early on some seeds; careful bot must be able to win on Keeper), prism,
  Glassback, more boons.

## Known bugs
- Screenshots are interim (results shot is a defeat, cover is wave 1).

## Balance tally
- 18:35 UTC, 8 seeds: greedy keeper 0/8 wins mean 3.3 waves; careful keeper 0/8 mean 3.3.

## Operator items
- Entry route: no `makefun init` was run (needs the wallet keypair + drand fetch); the repo now has
  commits, so a source-bundle entry would need a fresh repo. Prior entries used the GitHub route
  with `.makefun/owner.json`, which is not added here.
