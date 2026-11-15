// The live courtyard behind the title screen: a real sim run with a fixed glass layout, a
// trickle of beetles, and the sun hopping dawn -> noon -> dusk every few seconds.
import { DT } from './config.js';
import { setPiece } from './grid.js';
import { buildFlowField } from './pathing.js';
import { createRun, refreshLight, stepSim } from './sim.js';

const DEMO_SEED = 5150;
const SUN_HOP_SECONDS = 4.5;
/** [type, c, r, rot] */
const DEMO_LAYOUT = [
  ['mirror', 1, 1, 1],
  ['mirror', 11, 1, 0],
  ['splitter', 4, 6, 0],
  ['mirror', 8, 6, 1],
  ['lens', 6, 5, 1],
  ['pillar', 5, 3, 0],
  ['pillar', 7, 3, 0],
  ['mirror', 2, 4, 0],
  ['mirror', 10, 4, 1],
];

export function createTitleDemo() {
  const run = createRun(DEMO_SEED, 'gentle');
  for (const [type, c, r, rot] of DEMO_LAYOUT) setPiece(run.grid, c, r, { type, rot, prevRot: rot, turnedAt: -1, placedWave: -1, paid: 0 });
  run.flow = buildFlowField(run.grid);
  refreshLight(run);
  stepSim(run, [{ type: 'startWave' }]);
  return { run, clock: 0 };
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
