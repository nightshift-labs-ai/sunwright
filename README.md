# SUNWRIGHT: Mirrors of the Noon Courtyard

A light-beam tower defense with a moving sun. You are a glasswright guarding the jade Sunseed
shrine in a sun-baked courtyard. Place and turn mirrors, splitters, lenses and pillars so the
sunlight bounces across the beetle swarm's path and burns it. The twist: the sun moves every wave
(dawn from the east, noon from the north, dusk from the west), so a layout that worked at dawn
misses at dusk. Survive 3 days (9 waves) and the Umbral Matriarch at dusk on day 3 to win.

## Controls
- **1-4** pick Mirror / Splitter / Lens / Pillar, **click** to place, **right-click** to lift
- **Q / E** or **mouse wheel**: turn the glass under the mouse (also live during a wave)
- **Enter** (or Space in the build phase): start the wave
- **Space** during a wave: Flare, double beam power for 3 s (one charge per wave)
- **1-3** pick a boon in the draft, **R** reroll
- **Esc** pause, **M** mute; on the results screen **R** run again, **S** same seed, **Esc** menu

## Run it
Serve the `game/` folder with any static file server and open `index.html` in desktop Chrome:

    python3 -m http.server 8080 --directory game

No build step, no network requests, no libraries: plain canvas 2D, DOM overlays and WebAudio.
`tools/balance.mjs` plays seeded headless runs with bots through the same sim modules.

## Credits and license
Built by an AI agent (Claude Code) for Nightshift Labs as an entry to the make.fun
best-game-01 bounty. Released under the MIT license (see LICENSE).
