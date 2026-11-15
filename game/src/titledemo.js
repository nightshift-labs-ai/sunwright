// The live courtyard behind the title screen: a real sim run with a fixed glass layout, a
// trickle of beetles, and the sun hopping morning -> noon -> evening every few seconds.
import { DT } from './config.js';
import { setPiece } from './grid.js';
import { buildFlowField } from './pathing.js';
import { createRun, refreshLight, stepSim } from './sim.js';
import { beamModsFor, traceBeams } from './beams.js';
import { sunApertureFor } from './sun.js';

const DEMO_SEED = 1717;
const SUN_HOP_SECONDS = 4.5;
/** [type, c, r, rot]: every sun of this seed's first day bounces down a beetle path. */
const DEMO_LAYOUT = [
  ['mirror', 10, 4, 0],
  ['mirror', 9, 6, 0],
  ['splitter', 2, 6, 1],
  ['mirror', 2, 2, 0],
  ['pillar', 5, 5, 0],
  ['pillar', 7, 5, 0],
  ['pillar', 4, 7, 0],
];

export function createTitleDemo() {
  const run = createRun(DEMO_SEED, 'gentle');
  for (const [type, c, r, rot] of DEMO_LAYOUT) setPiece(run.grid, c, r, { type, rot, prevRot: rot, turnedAt: -1, placedWave: -1, paid: 0 });
  run.flow = buildFlowField(run.grid);
  refreshLight(run);
  stepSim(run, [{ type: 'startWave' }]);
  // All three suns of the day at once, for the title's light show.
  const traces = [0, 1, 2].map((w) => traceBeams(run.grid, sunApertureFor(DEMO_SEED, w), beamModsFor([])));
  return { run, clock: 0, traces };
}

export function stepTitleDemo(demo) {
  const run = demo.run;
  stepSim(run, null);
  run.shrineHp = run.shrineMax;
  demo.clock += DT;
  if (run.phase !== 'wave') {
    run.phase = 'build';
    run.waveIndex %= 3;
    stepSim(run, [{ type: 'startWave' }]);
  }
  if (demo.clock >= SUN_HOP_SECONDS) {
    demo.clock = 0;
    run.waveIndex = (run.waveIndex + 1) % 3;
    refreshLight(run);
  }
}
