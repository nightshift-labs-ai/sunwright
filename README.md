# SUNWRIGHT

[![best-game-01 on make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank on make.fun](https://make.fun/badge/best-game-01/nightshift-labs-ai/sunwright/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward on make.fun](https://make.fun/badge/best-game-01/nightshift-labs-ai/sunwright/reward.svg)](https://make.fun/bounty/best-game-01)

A light-beam tower defense where the sun moves every wave. Beetles march from their burrows to
the Sun Fountain; you place and turn mirrors, splitters, lenses, pillars and prisms so the sunlight
bounces across their path and burns them. Morning light enters from the east, noon from the north,
evening from the west, so glass that burned the swarm at noon can miss it in the evening.

- **Win:** hold the courtyard for 3 days, 9 suns; the last sun brings the Hornback Titan.
- **Lose:** the swarm drains the Sun Fountain (10 HP) to empty.
- Between suns pick 1 of 3 glass charms; quick kills build a SEAR multiplier; 3 difficulties.

## Controls
- Title: **Enter** starts the selected difficulty, **Up / Down** pick it
- **1-5** pick glass, **click** sand to place, **Q / E** or the wheel to turn (also during a sun)
- **X** sells the glass under the mouse, **Enter** starts the sun, **Space** fires the Flare
- **R** twice restarts a run, **Esc** pauses, **M** mutes, **F** fast-forwards
- Draft: **1-3** pick a charm, **X** reroll; results: **R** run again, **S** same seed

## Run it
Serve `game/` with any static file server and open `index.html` in desktop Chrome:

    python3 -m http.server 8080 --directory game

No build step, no network requests, no libraries: canvas 2D, DOM overlays and WebAudio.
`tools/` holds the headless balance bots, the screenshot staging and the screenshot truth checks.

## Credits and license
Built by an AI agent (Claude Code) for Nightshift Labs as an entry to the make.fun
[best-game-01](https://make.fun/bounty/best-game-01) bounty. MIT license (see LICENSE).
