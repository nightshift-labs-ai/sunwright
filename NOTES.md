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

- Benchmark 4 item 5: rank ring (S/A/B/C, 128 px) beside the score from RANK_THRESHOLDS via
  combat.rankFor (score, fountain left, Titan burn time), truth-checked. Staged run = A.

- Benchmark 4 item 8: floaters are placed (15 candidate spots) clear of other floaters, the floor
  labels and the NEXT SUN tag over their whole rise, and of beam cores where they appear, inside the
  courtyard; else dropped. stageplan.mjs runs the same deterministic fx in Node to pick the cover;
  the test hook measures real boxes and check-shot-truth asserts zero overlaps.

- Benchmark 4 item 9: calmer cover - LOG panel and SEAR panel gone (SEAR xN is a combo line under
  SCORE), banner plaque 60% wide at cap 44 inside the north wall (floaters avoid it), wide top bar
  with DAY - PHASE - SUN n/9 and the 9-sun track; left panel = sun dial + fountain.

- Benchmark 3 item 4: board tags (SWARM on the south wall beside each burrow, FOUNTAIN at the first
  spot round the basin clear of beam cores and beetles) drawn last as lapis plaques; the test hook
  measures tag overlaps and check-shot-truth asserts none.

- Benchmark 3 item 3 (part): glass lit by the current sun gets a white rim + glow, glass only the
  next sun reaches gets a dashed gold outline + its wall letter (W). Staging prune (swap stray panes
  for pillars before the cover, restore after) exists behind STAGE_PRUNE=1 but no seed wins with it
  yet, so the cover's solved-plan ratio is reported, not enforced. Defeat title fit now measured
  after the overlay shows (it overflowed before).

- Benchmark 3 item 8: sun track grows and warms from pale yellow (sun 1) to deep orange (sun 8),
  sun 9 a big red Titan skull; INCOMING ends with "NEXT SUN: +4 SCUTTLER, NEW GLASSBACK" from
  waves.nextSunPreview (first-ever kinds, then biggest rises), truth-checked. README carries the three
  live make.fun badges (kit repo_readme check).

- Benchmark 3 item 7: identity colours + 2 px dark outlines - silver mirror in a lapis frame, cyan
  splitter, aqua lens, terracotta pillar, rainbow prism; the hotbar icons match.

- Benchmark 3 item 10: beams drawn on their own layer with normal blending (gold glow 0.32, orange
  edge 0.75, white core), so crossings no longer add up to white blots; photon dashes flow along each
  leg away from the sun; starbursts softer. measure-shots counts near-white 32 px blocks on the board
  (cover 5, from starburst centres; draft/results count their parchment plaques).

- Benchmark 2 item 14: lit window gets a god-ray wedge + sun disk; inactive windows are shuttered
  lapis arches; kills leave a scorch + flipped husk on the floor layer for 6 s (fx.decals).

- Draft roundels: synergy tags (config SYNERGY), magenta rare rims, unit-safe text; draft verdict
  plaque under the heading.

- Benchmark 2 item 22: potted palms and a lapis urn on the sand outside the walls (static surround).

- Benchmark 3 item 5 (part): HUD panels at 80% opacity; sun dial + FOUNTAIN merged into one left
  panel; dial shows only NEXT: EVENING (W) with an amber "after this sun" chip (the real trigger).

- M3: Options > Beam patterns (colour-blind): red prism light in long dashes, blue in dots (off by default).

- M3: How to play has three code-drawn pictures (render/howto.js: build / burn / adapt).

- Benchmark 5 item 1: each draft roundel shows its one-line effect (30 px, BOONS[].line) in its own
  400 px column; numbers come from config CHARM_FX, which the sim now reads too (beams, combat, sim,
  draft). Footer: NEW chip, then `X - reroll` + `CLICK A ROUNDEL OR PRESS 1-3` (34 px). Floating
  numbers hide under the draft. check-shot-truth: effects = offer lines, hint, no draft text collisions.

- Benchmark 5 item 2: results LAST 3 RUNS strip (replaces the 30 px red caption): 30 px label, the real
  lose title at 22 px inside the strip only, chips `LOST - Day 2 evening` (red) / `WON 9/9` (gold) from
  the save via announce.historyChip. check-shot-truth rebuilds the chips from the replayed runs and
  checks the label size, the caption size, and that a won results screen has no other lose title.

- Benchmark 5 item 3: title says CLICK PLAY OR PRESS ENTER (34 px) under PLAY; ENTER starts the selected
  difficulty, Up/Down move the selection, Enter no longer also clicks a focused button. Title relaid:
  wordmark 160 px unsqueezed, hook 46 px, a full-width rules row, a 600 px card (PLAY, hint, picker,
  HOW TO PLAY / OPTIONS), the demo courtyard (scale 0.58, clipped to its walls) right of it, and the
  keycaps as one band along the bottom (26 px, no squeeze). Playtest asserts ENTER -> SCORCHED run
  and ArrowUp -> Normal.

- Benchmark 5 item 4: title key band has M MUTE; during a sun the HUD key line gets a third line with a
  drawn speaker and `M sound on` (red X + `M sound off` when muted). M toggles the real master gain and
  saves settings.muted; the playtest reads the gain (audio.audioProbe) and the save both ways.

- Benchmark 5 item 5: the pink lose line is gone; under the hook a plum band holds two 34 px stroked
  lines from announce.titleRules(): `Place glass to bend sunlight onto beetles` (cream) and
  `WIN: survive 9 suns - LOSE: the fountain runs dry` (gold, suns = WAVE_COUNT). check-shot-truth
  checks both lines and the ENTER hint (text, >= 34 px, unclipped). Demo courtyard at scale 0.565.

- Benchmark 5 item 6: draft context line under the heading (34 px, plum band):
  `SUN 5 HELD - 28 burned - FOUNTAIN 8/10` from announce.draftContext; "burned" is the sun just held
  (new run.stats.sunKills, reset at each sun start; outcomes unchanged). Verdict plaque moved to y 200.
  check-shot-truth compares the line with the replayed sim and checks its size.

- Benchmark 5 item 7: one family (system-ui) everywhere; the Georgia roundel names and sheet headings
  are gone. render/fit.js holds the type rule: squeeze to no less than 92%, else a shorter wording or
  a smaller size; anything tighter is recorded and fails check-shot-truth (per shot) and the playtest
  (every frame it drew). Shortened: tiles BURNED / BEST SEAR, YOUR BUILD short charm names (`Mend x2`,
  NAMES.charmShort), DRY = RUN LOST, NEXT: WEST, SUN 9: THE TITAN, NEXT: NEW GLASSBACK, frieze
  `WIN: 5 more suns - LOSE: the fountain runs dry`, Mirror tooltip `turns light 90 degrees`, prism
  `splits burn, slow, pierce`, refusals `Would seal the fountain` / `That is the fountain`;
  Glasswright's Discount renamed Glass Discount. Draft heading and results title drop font size
  (84 / 104 px) instead of squeezing; the event banner tries 61-36 px; sun track spacing 36 px.

- Benchmark 5 item 8: beetles.BEETLE_COLORS, one colour per kind: Scuttler magenta, Veerwing violet
  (lilac wings), Shellback bronze (metallic sweep, gold ribs), Glassback cyan (teal ring), Titan plum.
  The INCOMING icons are the same sprites; floor husks and the results Titan use the same palette.

- Benchmark 5 item 9: big starbursts only where light hits a beetle or a prism splits (beams.
  bigStarbursts: prism/Glassback-shell spots once each, then lit beetles by power, at most 6); mirror,
  splitter and lens joints get a small glint. Trace bursts carry a kind. check-shot-truth replays the
  cover and compares the drawn bursts. Cover: 2 big bursts, 0 blown 32 px blocks (was 5).

- Benchmark 5 item 10: the event banner is a 304 px lapis pill (< 40% of the 780 px board) docked inside
  the wall beside the gate it names (render/banner.js: next sun's window for NEXT SUN advice, else the
  current one), headline 32 px + second line 20 px split at " - ", nub pointing at the window. When it
  sits at the next sun's gate, the NEXT SUN (W) ghost label is dropped (the pill says it). Floaters
  avoid the pill. check-shot-truth replays the box, its width and its gate. Stage planner now only
  takes cover ticks the checks pass (no floater conflict, no covered tag) and rewards an active SEAR:
  cover tick 4694, SEAR x3, 17 beetles, 1 floater.

- Benchmark 5 item 11: props (palm, two urns) left the static wall texture for their own layer, drawn on
  the play screen only, placed in the gaps the HUD leaves (right palm -> urn below the tooltip panel);
  the test hook checks every prop box against hud.hudTextBoxes() and visible overlay text, per shot.
  Kill events carry `lit`; a kill's number anchors on the beam hit (lit beetle, else the nearest lit
  cell within 1.5 cells, else no number) and spawns within 1.5 cells of it. check-shot-truth replays
  the cover's fx in Node and compares every floater, its spawn distance and its anchor. Cover now has
  +30 and +90 SEAR x3.

- Title demo back to a bigger courtyard (scale 0.68, was 0.565 after the relayout): E, N and W beams
  all visible, right of the card; it is cut off at the key band's top edge, so no board tag is hidden
  under a box (Bench4-10).

- HUD: a difficulty with no finished run shows NO BEST YET under SCORE instead of BEST 0 (Bench4-3).

- Benchmark 6 item 1: title rules table (announce.titleRules, numbers from config) replaces the hook
  and the rules band: GOAL / BUILD / SUN / SEAR (as the sim scores it: kills within 1s, up to x5) /
  TITAN / WIN / LOSE, each with a 36 px icon (render/ruleicons.js, the game's own glyphs), a gold tag
  and a 28 px line. Below it a compact card (PLAY, ENTER hint, the three difficulty pills in a row);
  the demo courtyard is whole on the right (scale 0.649) with HOW TO PLAY / OPTIONS under it.
  check-shot-truth compares the rows and sizes.

- Benchmark 6 item 2: the 3 in-game shots read as one run. Draft context counts the run's burned total
  (81, results 229; was the sun's 28); a +1 SUNSTONE chip names the heal after the sun (stats.sunHeal),
  so cover 7/10 -> draft 8/10 adds up. check-shot-truth: in tick order score, burned and suns only
  grow, charms extend the earlier picks, fountain <= earlier + shown heal.

- Benchmark 6 item 3: the title demo runs 5740 ticks before the title shows (seeded, ~0.1 s), so 4 s
  later (the staged title) 6 beetles march, 2 sear (a Shellback shows ARMOUR 12) and a +20 floats; the
  demo drops its fountain bites (no -1 FOUNTAIN or red flash on the title). Ticks found with a
  headless scan of the demo + fx.

- Benchmark 6 item 4: win results carry no lose title (the strip is LAST 3 RUNS + chips; reverses
  Bench5-2's caption). The Titan carcass is ash: charcoal shell, ash plates with glowing ember cracks,
  embers rising through the smoke, drawn at 0.82 (about 235 px wide), whole in the left column.

- Benchmark 6 item 5: a searing beetle (lit and not shrugging, or set burning) gets a shell glow that
  lerps orange -> white with heat (1 - hp/max), keeps 3-5 embers rising off it (fx, deterministic
  RNG) and a thin smoke puff. The staged cover tick has no beetle in the light; the title demo shows it.

- Benchmark 6 item 6: clean beams: three passes, a soft halo (<= 12 px, 35% alpha), a tinted core
  (<= 6 px: orange sunlight, red/blue prism light) and a 2 px white centre, all capped whatever the
  power (was a 26 px glow + 11 px edge that turned the prism loop lilac). Lit glass no longer gets a
  white cell box: the pane itself glows gold (shadow blur on the sprite only, not the plinth).

- Benchmark 6 item 7: INCOMING rows carry the kind's rule at 20 px (config.enemyRuleTag, from stats:
  fast / armoured / deflects / boss); with nothing hovered the tooltip panel is a GLASS legend, one
  verb per piece (config PIECES[].verb; the lens shows this run's focus). Offsets, same commit: the
  dial's NEXT line and chip (the pill says it), DRY = RUN LOST (the frieze says it), BEST, and the idle
  tooltip lines. Cover canvas text items (fillText per frame, /tmp count script): 61 before, 61 after.

- Benchmark 6 item 8: draft: the staged offer's Spreading Burn is the rule-changing charm (kills scorch
  their neighbours); Glass Discount reads `Mirror & Splitter cost 1 less` (effect boxes may wrap to
  2 lines within their column); the white X at the next beam's end is drawn only when it MISSES; the
  verdict plaque moved up to y 166 (roundel keys touched it) and the draft collision check now
  includes that canvas plaque's band.

- Benchmark 6 item 9: three icon buttons under the right panels (pause, speed x2, speaker with a red X
  when muted; gold/red while on), clickable during build and sun, the same as Esc / F / M. The key
  line drops its third line (M sound on) and the right urn made room. Playtest clicks all three
  (speed on/off, mute saved on/off, pause then Esc). Cover text items 61 -> 60.

- Benchmark 6 item 10: FEATS (config FEATS, tested on the finished run; runSummary lists them, the save
  keeps their union): TITAN ASH, FULL BASIN (win at 8/10+), SWIFT ASH (Titan under 30 s), 200 BURNED,
  SEAR x40, SCORCHED WIN. Results: a FEATS 4/6 row of gold medals replaces the NEXT GOAL line; title:
  a FEATS n/6 chip beside PLAY. The title is now shot last (after the staged run is saved): FEATS 4/6,
  NORMAL best 33,090. check-shot-truth replays both from the runs.

- A/B 00:50Z (61673e1 vs d1c1363, 2-2): the 00b9096 beams were too thin at 252 px. Bold beams again:
  outer warm glow (26 px per unit of power, cap 36, 36% alpha) and inner glow (15/18 px, 60%) drawn
  with 'lighten' on the beam layer (overlaps keep one glow, no additive glare), gold for sunlight and
  blue/gold prism light, red-orange for red light (red + gold lighten to orange, never lilac); tinted
  core 9.5 px (cap 11) and a 3 px white-hot centre; +8% while a SEAR combo is live. Kept: no white
  cell squares, lit panes glow on the sprite. Cover: 0 blown 32 px blocks.
- The three cues the A/B missed are back: BEST under SCORE (NO BEST YET before a first finished run),
  BEST beside PLAY on the title (the selected difficulty's saved best: BEST 33,090, with FEATS 4/6),
  DRY = RUN LOST under the fountain drops, NEXT GOAL under the FEATS row on results
  (announce.nextGoal). Same commit drops duplicates on the cover: the dial's N/W/E letters (the wall
  tags say SUN - N/W/E) and the flare panel's SPACE (the key line says SPACE flare). Cover canvas text
  items 60 -> 58. check-shot-truth: NEXT GOAL vs the replayed run, title BEST vs the saved runs, and
  nothing in the title card sticks out of it.

- Bench7 item 1: results status line is the S ladder (combat.rankLadder from RANK_THRESHOLDS[0]):
  `NORMAL 4:29  FOR S: 40,000 x  FOUNTAIN 9 x  TITAN 0:25 v` at 28 px with drawn SVG marks (green
  tick / red cross); TOP RANK - S on an S run; NORMAL - m:ss on a loss. Seed and "over best" dropped
  (S - SAME SEED and NEW BEST say them). Fitted at 93% (904 px natural in 842). check-shot-truth
  recomputes the head and each mark from the replayed run and checks size and fit.
- Bench7 item 2: results lower third calmer: YOUR BUILD is 7 charm icons at 56 px in a 4+3 grid
  (Mend has an x2 badge, the name labels are gone; heading and "8 picked from 24 offers" stay); a won
  run drops the top-left sun strip (the Titan moves up) and its subline reads `The fountain still
  runs. The courtyard is yours.` (30 px; lost runs keep theirs); +6 px above LAST 3 RUNS and the
  buttons. check-shot-truth: icon count = distinct charms (7), 9/9 shown at most twice.
- Bench7 item 3: title bottom half: the difficulty buttons are single 40 px words (GENTLE / NORMAL /
  SCORCHED, selected one gold, content-sized in an 8 px padded card); `not played yet` and NORMAL's
  `best` line are gone (the BEST chip shows the selected best); the keycap bar has 5 keys (1-5 GLASS,
  Q/E TURN, SPACE FLARE, X SELL, M MUTE) at 36 px. Playtest: ENTER starts the selected difficulty,
  arrows move it, M mutes and saves; check-shot-truth: BEST = saved best, nothing outside the card.
- Bench7 item 4: title rules table 6 rows at 32 px: GOAL / BUILD `Glass bends light onto them` / SUN /
  SEAR `Kills within 1s: up to x5` / TITAN `Sun 9 boss: Hornback Titan` (shortened to fit, numbers
  and names from config), last one full-width row: gold WIN `survive 9 suns` + red LOSE `fountain dry`
  (fit 0.96). Card moved up to close the gap. check-shot-truth: rows = titleRules(), >= 32 px, fit >=
  92%, inside the table, WIN/LOSE last.

- CHECKPOINT A (Bench7 items 1-4, 02:12 UTC): shot truth OK, playtest 32/32, measure-shots 4/4, shots
  refreshed (seed 2013 staging unchanged; cover untouched by items 1-4).

- Bench7 item 5 (hero shot), fell back to (c): seed 2013 sun 5 cover kept. (a) tools/hero-scan.mjs over
  the 23 seeds that won the K=1 scan, cover on sun 9: no tick has Titan open + 35-75% HP + 2 beams on
  her + 8 escorts / 2 burning + 2 floaters + SEAR x2 at once (with the director many seeds lose; without
  it 11 win, still 0 passing; floaters are the usual miss). (b) STAGE_AIM=1 (stageplan.aimMirror: before
  the cover sun's build, the one mirror lighting the most lower-path cells of the coming sun) places
  the same mirror the greedy bot would; seed 2013's sun 5 never has more than 1 lit live beetle (beetles
  in the light die within about a second), so no cover tick with >= 3. Both flags off by default.

- Bench7 item 6 (needs the operator's A/B vs 9052725 before shipping): the full-width WIN/LOSE frieze
  is a pill on the north wall, `WIN: 5 more suns` (announce.winHeadline, 30 px cream), <= 55% of the
  board, on the wider side of the live north gate and its SUN tag (cover: 698-1026, gate 546-694);
  the lose rule stays as DRY = RUN LOST. The top wall and the N gate show again. check-shot-truth:
  width and clear of the gate; the drawn box is read after the frames render.

- Bench7 item 7: one label per thing: the score panel's SEAR line is gone (every combo kill now always
  shows its SEAR number: beam hit, else where it died; when no clean spot exists it takes the nearest
  one, clearing plain numbers, even over a beam, last of all slid into the court; check-shot-truth
  replays the whole staged run: 144 combo kills, 144 SEAR numbers); only the live gate keeps its SUN
  tag; one SWARM tag; no NEXT: line under INCOMING (the draft chip says it); no ARMOUR / DEFLECTS
  tags on the title demo; board tags get a 2 px dark outline. check-shot-truth: no covered tag on the
  cover and the title demo, <= 5 title-demo labels. Cover text items 58 -> 53 (cover tick 4801 again).

- Bench7 item 8: cover columns rebalanced: INCOMING (unchanged) moved to the left gutter under the
  fountain (x 6-218, y 304-500); the right column is SCORE + BEST, QUARTZ, CHARMS, the GLASS legend and
  the pause / speed / sound buttons, 20 px apart (11 text items); the palm and urn props and their
  whole layer are gone. Quartz particles fly to the moved gem. Cover text items stay 53.

- READY FOR A/B (Bench7, 02:22 UTC): items 1-4 (checkpoint A a59692d), 5 fell back to (c), 6 (WIN pill:
  ship only if the A/B vs 9052725 does not lose), 7, 8; 9 held: draft differs from 9052725 by 40 px
  (an edge of the SUN - N tag under the context line), logo unchanged. Verified: shot truth OK (incl.
  144/144 SEAR numbers over the staged run), playtest 33/33, measure-shots 4/4, names OK, pack 1.12 MB,
  kit check (only transcripts_present). Cover canvas text items 58 -> 53.

- A/B 02:23Z (d8d2149 vs 9052725: 2 of 6, margins 1): the de-clutter lost information the judges
  liked; restoring it on the new layout. Item 1: the full-width WIN + LOSE banner is back across the
  north wall (announce.winLoseParts / winLoseHeadline); when the live sun is in the north wall the band
  opens around that gate and its SUN tag, WIN left and LOSE right at the largest common size that fits
  (cover: `WIN: 5 more suns` | gate | `LOSE: fountain dry`, 32 px). check-shot-truth: the segments
  never cover the live gate.

- Restore item 2: SEAR xN under the score again (right column re-stacked 20 px apart: SCORE 8-136,
  QUARTZ 156, CHARMS 238, legend 340, buttons 468), SUN - W / SUN - E tags on every gate of the day
  (the live one gold), INCOMING's NEXT: preview line, and a potted palm (under INCOMING) and a vase
  (under the buttons) on a props layer drawn only in play; the prop-vs-text check (hud.hudTextBoxes
  + visible overlay text) is back in check-shot-truth.

- Restore item 3: results keep the S ladder (now `FOR S: 40,000 x  FOUNTAIN 9 x  TITAN 0:25 v`) and the
  flavour line, and bring back the run line `NORMAL - seed 2013 - 4:29 - +14,830 over best` (24 px,
  combat.runLine, checked against the save's best before the run) and the charm names (14 px short
  names under 48 px icons). Spacing trimmed to fit the 24 px margin (rank ring 104 px).

- Restore item 4: title keeps the 6-row rules table and one-word difficulty buttons; the selected one
  shows `best 33,090` under its name (20 px; checked against the save and the title-card bounds).

- READY FOR A/B (restore pass, 02:31 UTC): information the 02:23Z A/B missed is back on the new layout
  (why: on this judge, information and feedback beat minimalism; d8d2149's removals lost 2 of 6).
  Kept from Bench7: sunlight cone, INCOMING in the left column, flavour line, S ladder, rules table,
  one-word difficulty buttons. Verified: shot truth OK, playtest 33/33, measure-shots 4/4, names OK,
  pack 1.14 MB, kit check (only transcripts_present). Cover canvas text items 58 (as 9052725).

- Field panel 03:15Z (88dcfa2 vs the 4 strongest rivals: 8/8 for us); remaining asks are look and
  readability. Item 1, board lighting: sand a touch darker and warmer (#D29E5E / #C38B4F), each stone a
  random lighter/darker tint, worn lit/shaded lips and chipped corners; cast shadows longer (0.7 cell
  min) and blurred, still thrown away from the live sun (sun.shadowVectorFor); lit cells get a warm
  wash under the beams (board.drawLitFloor). Cover mean luminance 0.51 (gate 0.45), still warm.

- Item 2, build bar: 132 px cards (bar re-centred, key line still fits): hotkey + name on top, the
  piece with its quartz cost beside it, and a one-line effect underneath, true to beams.js (mirror
  `turns light 90°`, splitter `splits light in 2`, lens `x2.5 for 3 cells` from this run's beam mods,
  pillar `blocks beetles`, prism `burn/slow/pierce`). The right-hand GLASS legend stays.

- Item 3, HUD readability: side-panel text 15 -> 18 px (counts 20 -> 24, legend rows 18 px); one big
  key number per panel (FOUNTAIN 7/10, INCOMING 16 LEFT, CHARMS 4 at 30 px; SCORE and QUARTZ already 32);
  popups get a dark pill; a popup spot that covers a beetle is skipped (plain numbers then drop, SEAR
  numbers fall back), and the conflict checks (planner, check-shot-truth) count beetles too; the NEXT
  SUN pill docks on whichever side of its gate covers no beetle. Cover: +60 SEAR x2 (the +20 that sat
  on a Scuttler is gone). Panels and buttons re-stacked; palm and vase moved to stay clear.

- Item 4, Titan bar: while the Titan is on the board a boss bar takes the banner's slot at the top of
  the court (announce.titanStatus): skull, HORNBACK TITAN, HP bar (hp / maxHp) and her one real phase,
  the carapace (TITAN_CARAPACE): `SHELL OPEN - BURN!` (pink pulse) or `SHELL SHUT - ARMOUR 30`. Floaters
  and tags avoid it. Not added to the sheet (the kit needs exactly 4 shots; a 5th would shrink them):
  shots.mjs replays the staged run to a hurt, open-shell Titan tick (14328) and check-shot-truth compares
  the drawn bar with the sim (`TITAN_SHOT=/tmp/x.jpg` saves that frame to look at). Seen: in seed 2013
  the Titan takes almost no damage until she reaches the hottest cell, then dies within 0.1 s.

- Item 5, title air: wordmark 160 -> 172 px in a 1222 px banner; the rules table spans the width in two
  columns (GOAL / BUILD, SUN / SEAR, TITAN / WIN + LOSE) at 28 px with icons drawn from the game's own
  sprites (a Scuttler heading for a fountain drop, the mirror, the sun and flame charm glyphs, the Titan
  skull); below, the menu card (PLAY, BEST, FEATS, ENTER hint, GENTLE / NORMAL best N / SCORCHED, HOW
  TO PLAY, OPTIONS) and the whole demo courtyard (scale 0.52) side by side. Rules check floor now 28 px.

- READY FOR A/B (look and readability pass, 03:31 UTC), after the 03:15Z field panel (8/8, every ask
  was look/readability; nothing that won was removed). Verified on a fresh re-shoot (identical to the
  commit): shot truth OK (incl. the Titan bar on a replayed sun-9 tick), playtest 33/33, measure-shots
  4/4, names OK, pack 1.14 MB, kit check (only transcripts_present).
  Open: a Titan frame would make a strong 5th shot but the sheet takes exactly 4; the cover now shows
  one popup (+60 SEAR x2) because the +20 that covered a Scuttler is no longer placed there.

- Glass upgrades (operator 03:32Z, "visible scale"): U on a placed glass piece upgrades it Lv1 -> Lv2
  (4 quartz) -> Lv3 (7) (config UPGRADES; pillars do not upgrade; the price joins what selling refunds).
  Per level, in beams.js: mirror bounce loss x1 / x0.5 / none; splitter halves keep 50 / 55 / 60%;
  lens focus +0 / +0.3 / +0.6 (x2.5 -> x2.8 -> x3.1); prism side branches +0 / +10 / +20% light (cap 95%).
  Upgraded pieces show 2 or 3 gold pips on the plinth (Lv1 shows none, to keep the board calm); build
  cards show `U+4`, the tooltip `... - U +4` and `LENS Lv2`, the key line `U up`, How to play explains it.
  Balance, 40 seeds per difficulty (tools/balance.mjs 40 <bot>): greedy (never upgrades) before
  6 / 2 / 2 wins (gentle / normal / scorched), after 6 / 2 / 2 (unchanged); greedy-up (spends leftover
  quartz on the best upgrade) 3 / 3 / 2. Not easier, so costs stay 4 / 7.
  Staging: any upgrade during seed 2013's sun 5 (one Lv2 or Lv2+Lv3, at any tick 4400-4780) makes the
  run lose later (it is a rare greedy-bot win); STAGE_UPGRADES=1 (+ STAGE_UPGRADE_TICK / _COUNT) keeps
  that experiment; off by default, so the cover has no upgraded glass yet.

- Cover shows upgraded glass (truthfully): the stage director now spends quartz during sun 1 on the
  most-lit glass (two upgrades; UPGRADE_PLAN, STAGE_UPGRADES=0 to switch off). Seed 2013 still wins
  (36,460, fountain 10/10, FEATS 5/6); upgrades during sun 5 made it lose (see above). Cover tick 4354:
  `+60 SEAR x2` and `+30`, 18 Scuttlers, fountain 6/10, a Lv2 mirror with 2 gold pips (pips are drawn
  above the light on a dark backing). Planner: a visible SEAR number scores +40, and its beetle test uses
  the popped (as-drawn) floater size, like check-shot-truth. Fixed: the results FEATS row overflowed its
  plaque with 5 feats (smaller chips when there are more than 4). check-shot-truth requires >= 1 Lv2/Lv3
  piece on the cover.

- ECLIPSE (endless), unlocked by a win on any difficulty (save: eclipseUnlocked, or a won run in the
  history): E on the title (selected difficulty) or on a win's results starts it. Same 9 suns, then the
  suns go on: eclipse sun n (n >= 10) sends campaign sun 7 / 8 / 9's swarm in turn (no Titan) with counts
  x (1 + 0.15 (n - 9)) and HP x (1 + 0.12 (n - 9)) (config ECLIPSE, waves.waveGroups). Score keeps
  counting; best depth saved (eclipseBest). HUD `ECLIPSE SUN n`, banner `ECLIPSE: k suns held - LOSE:
  ...`, results sub / SUNS tile / NEXT GOAL in eclipse terms. Title line: `ECLIPSE (endless) - unlocked
  after a win` / `E - ECLIPSE (endless) unlocked - not played yet` / `E - ECLIPSE (endless) best: SUN n`;
  a won results screen: `ECLIPSE UNLOCKED - press E` pill. Sim (BALANCE_MODE=eclipse, greedy, 40 seeds):
  the gentle seeds that win go on to suns 10, 13, 14. Playtest: E locked does nothing; unlocked starts an
  eclipse run. check-shot-truth: title line from the replayed runs.

- READY FOR A/B (scale pass, 03:56 UTC): glass upgrades + ECLIPSE; README features and keys updated.
  Verified on a fresh re-shoot (identical to the commit): shot truth OK, playtest 35/35, measure-shots 4/4,
  names OK, pack 1.15 MB, kit check (only transcripts_present). The staged run changed with the sun-1
  upgrades: score 33,090 -> 36,460, FOUNTAIN 10/10, FEATS 5/6, Titan 0:07, ladder FOUNTAIN 9 now OK;
  cover tick 4354 (fountain 6/10, 18 Scuttlers, +60 SEAR x2); the draft's verdict reads HITS 2 PATH CELLS
  (was 6); cover quartz 3 greys three build cards (true at that tick). Nothing was removed from any shot.

- Cover liveliness (operator 04:2xZ: judges liked the old cover's lit cards and busier wave): during the
  cover sun the staged player turns quartz above 9 into upgrades (STAGE_SPEND_AT, most-lit glass), and the
  planner only takes ticks with >= 3 build cards affordable and >= 1 greyed by its cost. A SEAR number may
  now sit over a beam (its dark pill keeps it readable; plain numbers still may not; labels, beetles and
  other numbers still never). Cover tick 4452: 18 beetles, `+40 SEAR x2` and `+20`, quartz 5 (mirror,
  splitter, pillar lit; lens 7 and prism 8 greyed), the Lv2 mirror's pips, fountain 6/10. Run still wins
  (36,440, 10/10). check-shot-truth asserts the card counts from the replayed run.

- ALMANAC (A on the title, title button, pause button, A during a sun pauses and opens it): one sheet
  with every beetle (HP, speed, armour, trait, first sun), every glass type (cost, first sun, effect at
  Lv1 / Lv2 / Lv3 and upgrade prices; pillar "no levels") and the 12 charms (effect, common/rare pick,
  repeatable), all built from config at runtime (almanac.js). Unmet entries (save `met`: beetle kinds
  spawned, glass placed, charms offered, unioned over finished runs) show as `???` with `? not met yet -
  first seen sun N`. check-shot-truth: staging opens it after the title shot; every row's numbers equal
  config and its met state equals the replayed runs (22/22 met in the staged save). The kit takes exactly
  4 screenshots, so the title shows the `A - ALMANAC` button and an `A ALMANAC` keycap (bar now 30 px,
  6 keys; overflow checked).

- Results per-sun chart (left column, above YOUR BUILD): gold bars = beetles burned in each sun, cyan
  line = the fountain at that sun's end (0-10), sun numbers under the bars, `BURNED PER SUN` and
  `- FOUNTAIN` as the axis words; one bar per sun played (more in ECLIPSE). Data: run.stats.perSun (sim,
  pushed at each sun's end and at a loss). check-shot-truth: drawn data = the replayed run's, bars add up
  to BURNED (232). The Titan is drawn at 0.72 (still over 200 px) and TITAN BURNED IN 0:07 on one line to
  make room; everything else on results is unchanged.

- READY FOR A/B (depth and feedback pass, 04:30 UTC): livelier cover (3 cards lit, 2 greyed by cost),
  ALMANAC (A), per-sun results chart; README features and keys updated. Verified on the committed state:
  shot truth OK (cover card counts, Almanac vs config and save, chart vs run), playtest 37/37,
  measure-shots 4/4, names OK, pack 1.16 MB, kit check (only transcripts_present). The kit takes exactly
  4 shots, so the Almanac shows on the title as its button and keycap. Nothing removed from any shot.

- Feel-and-look pass (operator 04:3xZ: rivals beat us only on look; do not add systems or remove info).
  Item 1, one frame: every HUD panel, the sun bar, the WIN/LOSE banner and the HUD buttons are recessed
  terracotta (rgba(96,42,20,0.9)) with a sandstone rim and a top inner shadow, and everything outside the
  courtyard walls sits under a terracotta wash (hud.drawFrame), so the court is the brightest area. March
  chevrons 0.72 -> 0.42 alpha, the next-sun ghost line 0.8 -> 0.5. Same text everywhere. Cover mean
  luminance 0.47 (gate 0.45). Fixed after: YOUR BUILD charm names 13 px (Quartz Pull squeezed to 89%).

- Item 2, time of day: the courtyard floor takes a light tint per sun phase (board.drawDaylight:
  morning rose 0.13, noon white-gold 0.08, evening amber 0.15; never dark), and cast shadows are 1.35x
  long at morning/evening, 0.85x at noon, still thrown away from the live sun. The floor was already
  darkened in the earlier lighting pass; cover mean luminance stays 0.47.

- Item 3, hit feedback: a kill leaves a pale ash puff (14 smoke particles, 1.1 s) and a ring of ember
  flecks; floating numbers are bigger (30 px + 5 per SEAR step, was 28 + 4); a SEAR streak meter under the
  SEAR line shows how much of the combo window is left and flashes white on each kill. Searing embers were
  already in. Cover tick now 4484: three numbers (+120 SEAR x4, +40 SEAR x2, +20), ash puffs, SEAR x4,
  quartz 7 (4 of 5 cards lit, prism greyed), run still wins.

- Item 4 (results part): the per-sun chart is 336 x 156 (was 110 tall) with 17 px axis words, 14 px sun
  numbers and a 5 px fountain line, so the bars read in the 252 px results cell; the Titan is drawn at 0.62
  (about 200 px) and TITAN BURNED IN 0:07 moved up to make room. Big grade ring and score and the 4-tile
  stat grid were already there. Not done this run: a larger title rules table (28 px two-column rows do not
  fit at 30 px) and the draft card restyle; item 5's "selected glass tooltip on the cover" would replace the
  GLASS legend there (removed info), so the build cards keep their effect line instead.

- READY FOR A/B (feel-and-look pass, 04:51 UTC): one terracotta frame, time-of-day light, hit feedback,
  larger results chart; items 4 (title / draft parts) and 5 not done (see above). Verified on the committed
  state: shot truth OK, playtest 37/37, measure-shots 4/4 (cover mean 0.47), names OK, pack 1.15 MB, kit
  check (only transcripts_present). Nothing removed from any shot.

## Next
- READY FOR A/B (01:00 UTC): bold beams + the three cues on top of 61673e1 (FEATS, GLASS legend,
  INCOMING tags, HUD buttons, SUNSTONE chip, title rules table kept). Verified on the final state:
  shot truth OK, playtest 32/32, measure-shots 4/4, pack 1.14 MB, kit check (only
  transcripts_present fails: the operator bundles transcripts). Cover canvas text items: 58.
- Open: cover staging (17 beetles, 0 lit, 2 floaters vs >= 18 / >= 4 / >= 3), Bench3-3 solved plan
  (6 stray panes), Bench3-5 board >= 58% of the cover.
- Field benchmark 5: items 1-11 all committed (21:45 UTC). Open from older sections: staging below,
  Bench3-3 solved plan (6 stray panes on the cover), Bench3-5 board >= 58%.
- Idea not yet tried: a director that builds (not turns) one mirror line across the swarm's path
  before the cover sun, so >= 4 beetles burn while floaters stay off moving beams.
- Staging (benchmark 2 item 1, benchmark 1 item 6): cover wants >= 18 beetles, >= 4 burning, >= 3
  floaters, a Scuttler at the rim and a fresh -1 FOUNTAIN; draft and win at 6/10 (now 8/10).
  Tried: director v3 (STAGE_V3=1: extra bite on the cover sun, no healing charms) gives 6/10 draft
  but a dead cover - reverted to the default. Solved-plan prune (STAGE_PRUNE=1) has no winning seed.
  Director v4 (STAGE_V4=1, two passes: identical cover, then scars after the cover tick and in the
  last sun, aiming at a 6/10 draft and win; STAGE_V4_LAST=0 skips the last-sun scar): seed 2013
  then loses on day 3; 2003/2010 win with 6/10 or 5/10 drafts but have sparse covers. Off by default.
  Denser Day 2 noon (22 Scuttlers @0.55 s, 8 Veerwings): seed 2013 cover gets 19 beetles + 3
  floaters but the run loses; the best winner (2048) has 20 beetles but almost no beams on the
  cover - reverted (beams are the game's identity; keep seed 2013's lit cover).
- Benchmark 2 item 12 (Glassback on the cover): tried one scout Glassback in sun 5 (+ draft chip
  showing nextSunPreview). Best winning seed 2090 gave 19 beetles / 4 types but weak beams, fading
  floaters and a floater-on-beam truth failure, Glassback not deflecting - reverted.
- Benchmark 3 item 5 rest: board >= 58% of the cover (now ~52% incl. walls: needs a layout change),
  (HUD type sizes done: 15 / 20 / 32 px plus the 61 px banner.)

- Cover staging scan (21:35 UTC, after the pill + floater rules): seeds 2001-2300 K=1 greedy, 22 wins.
  Only check-passing ticks count now. 2013 stays best (17 beetles, 2 floaters, SEAR x3, fountain 7/10,
  win 8/10); 2112 has 3 lit beetles but no floaters and a flawless 10/10 win. In 2013's sun 5 no clean
  tick has more than 1 lit beetle (STAGE_DUMP=1 lists all 866 candidates): the beams and the swarm's
  path barely cross, so >= 4 burning needs a director that aims glass at the path, not tick picking.
  Tried STAGE_CHASE=1 (on the cover sun, the one live turn that puts >= 2 more beetles in the light,
  every 0.5 s): 2013 gets worse (10 beetles, 1 lit, 0 floaters: kills come faster and floaters next to
  moving beams fail the no-text-on-beam rule); 2112 reaches 5 lit / 13 beetles but 0 floaters and a
  flawless 10/10 win. Off by default; 2013 K=1 stays the staging.
  STAGE_V4=1 scan (same seeds): 2112 wins with draft 6/10 and win 5/10, cover 17 beetles / 3 lit /
  SEAR x5 / prism split but 0 floaters, 10 stray panes and no Mend on its draft; staged and looked
  at, kept 2013 (floaters, fuller beams). That shot showed the pill hiding the FOUNTAIN tag: fixed
  (the tag's adaptive spot avoids the pill; boardTagOverlaps counts tag-under-pill for the planner
  and check-shot-truth).
  STAGE_COVER_WAVE=5 (cover on sun 6, Day 2 evening, Glassbacks out): seed 2046 wins with 21 beetles
  of 4 kinds on the cover, 2015 with 3 lit; but the next sun is then east (the pill docks at the E gate,
  against Bench5-10's W gate) and the draft after sun 6 has no NEW: GLASSBACK chip (Bench1-9). Kept sun 5.

## Known bugs
- Cover has 2 floaters (benchmark 1 asks >= 3), 17 beetles (asks >= 18), 0 beetles lit: staging.
- Source is ~205 KB > 160 KiB dossier text cap: the last 6 files (34 KB) are cut from the dossier text
  (the judge's outline only reaches ~17 headings anyway). Dead exports/CSS removed; JPEG q74 keeps
  every shot under 210 KB and the dossier at 1.07 MB (gate 1.5 MiB).
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
