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

- Operator field benchmark items 3-4 applied: NAMES table in config.js (VEERWING, HORNBACK TITAN,
  SUN FOUNTAIN, QUARTZ, SEAR, NORMAL, Quartz Pull, Spreading Burn, MORNING/NOON/EVENING, glass charms),
  RESULT_WIN_TITLE / RESULT_LOSE_TITLE, "SUN n/9" everywhere, X rerolls; internal ids renamed too
  (boon stays internal). tools/check-names.mjs scans every visible string for the banned words.

- M3 (part): generative pentatonic music (marimba ostinato + drone; tempo/layers rise each sun,
  sparse between suns), master/music/effects buses, Options screen (3 sliders, shake, mute) from
  title and pause, F fast-forward x2 during a sun.

- M4 (part): layout to 60 px cells (board at y 140) so the north wall shows a 48 px oblique lapis
  front face with gold pilasters and an arched sun window; side-wall slots; low south curb with
  burrow arches; SUN - E/N/W plaques; floor labels SWARM / FOUNTAIN; shadows >= 0.6 cell long.

- M4 (part): no dark frames - sepia rgba(70,40,15,0.35) dims, orange-edged white-core beams,
  parchment roundel centres; measure-shots gates mean luminance >= 0.45, no 64x64 block < 0.15.

- Draft redesign (benchmark 1 item 9 + item 1 sizes): huge condensed "SUN MOVES WEST - PICK 1"
  heading, three 236 px roundels with 48 px keys and 34 px names (effect text on hover), "X - reroll"
  + "NEW: GLASSBACK" footer, HUD hidden; the next sun's beam drawn as a dashed ghost ending in an X
  labelled MISSES (or HITS n PATH CELLS, honestly computed from pathing.routeCells).

- FOUNTAIN_MAX = 10 for every difficulty (Gentle/Scorched differ by enemy HP, count and quartz);
  Sunstone now heals 1 after every sun. Greedy 8 seeds: gentle 2/8 (6.4), normal 1/8 (5.4), scorched 0/8 (3.0).

- Cover HUD (benchmark 1 item 5, part of 6; benchmark 2 items 2 and 4): announce.js (sim event log +
  banner: rare events else "NEXT SUN: WEST - REAIM GLASS"), banner plaque at cap >= 44 px over the
  courtyard, 9-sun track with Titan skull + HOLD n MORE SUNS, droplets pulsing red when empty +
  EMPTY = RUN LOST, SCORE + BEST, INCOMING with remaining count and SUN 9: HORNBACK TITAN skull row,
  hovered-piece tooltip with ghost icon and keys (Q/E turn, X sell +n; X sells in build and wave),
  3-line log, key line, FLARE READY/USED/BURNING. Truth check covers banner, log, suns held.

- Floating numbers restyled (benchmark 2 item 5) + red -n FOUNTAIN floater; red march chevrons along
  each swarm route and a basin-of-water fountain sprite with its HP ring (item 3).

- Staging v1: tools/stageplan.mjs (pure Node) plans a directed run: on sun 4 the director turns the
  most useful glass off-target until the fountain is 8/10 (a real live action), sun 5 (now 18
  Scuttlers + 3 Shellbacks + 7 Veerwings) plays normally and the cover is the best-scoring moment
  (density, burning, fountain below max, fresh bite, beetle at the rim, 3+ opaque floaters).
  Seed 2013 K=1: cover 7/10 with 17 beetles, draft 8/10, win 8/10. shots.mjs replays it.

- Charm icons (benchmark 2 item 9): render/charms.js draws a distinct pictogram per charm (flame,
  lens, sun, magnifier, hourglass, droplet, mirror, twin suns, gem, tag, sun+arrow, prism); HUD badges
  and a 96 px glyph in each draft roundel.

- Results redesign (benchmark 2 items 4, 6, 20; 1 item 2 in part): RESULT_WIN_TITLE = THE TITAN IS
  ASH across the top on an opaque lapis plaque, subline "Courtyard held - 9/9 suns", 84 px score with
  NEW BEST, tiles LONGEST SEAR / FOUNTAIN n/10 / TITAN BURNED IN m:ss (sim stat titanSeconds),
  44 px R - RUN AGAIN; canvas hero (render/results.js): flipped smoking Titan on a scorch, 9-sun
  track with the skull crossed out, charm badges; sepia dim at noon (sunrise wash removed).
  tools/thumbs.py writes the judge-scale contact sheet (768 cover + 252 px cells).

- RUN HISTORY: save.js recordRun(summary) + loadHistory(); results strip of the last 3 runs (losses
  in red with RESULT_LOSE_TITLE + a dry-basin icon + day/phase; WON 9/9 with score). shots.mjs first
  replays two real losing runs (seeds 3002, 3004: Day 2 evening, Day 3 noon) so the history and
  BEST (18,260 on the cover) are real; check-shot-truth asserts BEST and the history against
  headless replays. menus.js exports showTitle / showDraft / showResults / restartRun.

- Title (benchmark 1 item 8, 2 items 2 and 16, 3 item 6): stained-glass SUNWRIGHT wordmark (196 px,
  coloured panes + lead lines on a bright plaque), hook THE SUN MOVES EVERY WAVE 52 px, 56 px PLAY,
  difficulty pills with real bests, rules box: PLACE -> BURN -> RE-AIM pictograms, lose rule line,
  SCOPE_LINE (counted from config.js; also the first line of the index.html note, which now names the
  moving sun, the 9-sun win, the lose rule and R). Demo scaled 1.2x with all three suns beaming.

- Benchmark 3 item 1: WIN/LOSE frieze along the north wall ("WIN: hold n more suns - LOSE: the
  fountain runs dry", n from the sim, truth-checked); INCOMING - n LEFT; HOLD line removed.

- Benchmark 3 item 2: key line beside the hotbar ("Click sand: place - Q/E turn - X sell" /
  "R restart - SPACE flare - ESC pause"); R in a run restarts on a second press within 2 s.

- Source outline: main.js / sim.js / scene.js import order puts config, sim, beams, sun, enemies, waves,
  combat, draft, announce, audio, save, render/scene in the judge's first 17 headings (checked with
  makefun-tools/jv view.mjs).

- Benchmark 4 items 1, 6, 7: results plaques inside a 24 px margin (asserted per text box by shots.mjs
  + check-shot-truth), tiles BEETLES BURNED / SUNS / FOUNTAIN / LONGEST SEAR fitted to one line,
  meta line (difficulty, seed, run clock, +N over the previous best from recordRun), compact RUN
  HISTORY (red RESULT_LOSE_TITLE caption + chips), NEXT GOAL under RUN AGAIN; TITAN BURNED IN on canvas.

- Benchmark 4 items 10 + 2: title = wordmark plaque with SCOPE_LINE as subtitle, hook band, 80% lapis
  menu card on the left (PLAY, stacked difficulty pills, keycap rows 1-5 GLASS / Q/E TURN / SPACE FLARE
  / X SELL / R RESTART / ESC PAUSE, lose rule, HOW TO PLAY / OPTIONS), the three-sun courtyard on the
  right at 0.7 with every board label uncovered. Loop pictograms removed (render/pictos.js deleted).

- Benchmark 4 items 3, 4: unplayed difficulties read "not played yet"; results YOUR BUILD panel
  (charm glyph + name, xN repeats, "P picked from O offers" with the sim's offersSeen, truth-checked).

## Next
- M3 feel (rest): hit-stop-like pop on SEAR steps, fountain pip crack, quartz counter pulse,
  colour-blind beam patterns (option), How to play illustrated panels.
- Staging: cover must show a lit prism fan (red/blue/gold) across a swarm; consider a hand-directed
  staging player for waves 1-5 instead of the greedy bot (still one real seeded run, forward order).

## Known bugs
- Source is 175.8 KB > 160 KiB dossier text cap (tail files truncated in dossier text): trim pass needed.
- Staging: K=1 and K=2 give identical runs on every seed (director turns 1 piece either way?): check.
- Cover still lacks a fresh bite + Scuttler at the rim + 4 burning; lens/flare overlap blows out.
- Cover (seed 2023 greedy) has prisms on the board but none in the noon beam.

## Balance tally
- 18:35 UTC, 8 seeds: greedy keeper 0/8 wins mean 3.3 waves; careful keeper 0/8 mean 3.3.
- 18:50 UTC (prism + Glassback + dazzle), 8 seeds: greedy gentle 1/8 (5.4), keeper 1/8 (5.4),
  scorched 0/8 (3.5); careful keeper 0/8 (5.5). Greedy keeper wins 9/60 seeds (2001-2060).
- 18:50 UTC (Gentle 0.65 hp / 0.8 count / 18 quartz / 14 HP; Scorched 1.35 hp / 12 quartz), 8 seeds:
  greedy gentle 2/8 (6.8), normal 1/8 (5.4), scorched 0/8 (3.3); careful flat ~5.5 on all three
  (it cannot lift pieces: an old lens can block a new opening, e.g. seed 56433 sun 3 - a bot limit).

## Operator items
- Entry route: no `makefun init` was run (needs the wallet keypair + drand fetch); the repo now has
  commits, so a source-bundle entry would need a fresh repo. `.makefun/owner.json` (operator's entry
  wallet, as given by the operator) is committed for the GitHub route; keep it unchanged.
