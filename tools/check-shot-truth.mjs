// Screenshot truth check: for every staged shot taken during a run, replay the recorded order log
// headless (the same sim modules, no browser) to the captured tick, rebuild every number the HUD
// draws from that sim state, and fail on any mismatch with what the browser reported at capture.
// Also checks each screenshot file: JPEG, 1280x800, at most 256 KiB, and the shots sort the cover first.
//   node tools/check-shot-truth.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { WAVE_COUNT } from '../game/src/config.js';
import { createRun, enemiesRemaining, stepSim } from '../game/src/sim.js';

const manifest = JSON.parse(readFileSync('tools/shots-manifest.json', 'utf8'));
const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
};

/** The HUD's numbers, computed the way render/hud.js computes them. */
function hudFacts(run) {
  return {
    phase: run.phase,
    seed: run.seed,
    difficulty: run.diff.name,
    day: run.aperture.day,
    sun: run.aperture.phase.name,
    wall: run.aperture.phase.wallName,
    wave: run.waveIndex + 1,
    waves: WAVE_COUNT,
    shards: run.shards,
    score: run.score,
    shrineHp: run.shrineHp,
    shrineMax: run.shrineMax,
    chain: run.chain.count,
    bestChain: run.chain.best,
    flareCharges: run.flareCharges,
    remaining: enemiesRemaining(run),
    boons: run.boons.join(','),
    kills: run.stats.kills,
  };
}

function replayTo(tick) {
  const run = createRun(manifest.seed, manifest.difficulty);
  let k = 0;
  while (run.tick < tick) {
    const orders = k < manifest.log.length && manifest.log[k].tick === run.tick ? manifest.log[k++].orders : [];
    stepSim(run, orders);
    run.events.length = 0;
  }
  return run;
}

for (const shot of manifest.shots) {
  if (shot.state.screen !== 'play') continue;
  const truth = hudFacts(replayTo(shot.state.tick));
  const shown = { ...shot.state, boons: shot.state.boons.join(',') };
  for (const [key, value] of Object.entries(truth)) check(shown[key] === value, `${shot.name} ${key}: shown ${shown[key]} vs sim ${value}`);
  console.log(`${shot.name}: tick ${shot.state.tick} ${truth.phase} day ${truth.day} ${truth.sun} wave ${truth.wave}/${truth.waves} score ${truth.score} shards ${truth.shards} hp ${truth.shrineHp}/${truth.shrineMax}`);
}

/** JPEG size from its SOF marker. */
function jpegSize(buf) {
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

const files = readdirSync('screenshots').filter((f) => !f.startsWith('.')).sort();
check(files.length === 4, `expected 4 screenshots, found ${files.length}`);
check(files[0] === '1-play.jpg', `cover must sort first, got ${files[0]}`);
for (const f of files) {
  const buf = readFileSync(`screenshots/${f}`);
  const size = jpegSize(buf);
  check(size && size.w === 1280 && size.h === 800, `${f} is ${size ? `${size.w}x${size.h}` : 'not a JPEG'}`);
  check(statSync(`screenshots/${f}`).size <= 262144, `${f} is over 256 KiB`);
}
console.log(failures.length ? `FAIL\n${failures.join('\n')}` : 'shot truth OK: every HUD number matches the sim at its tick');
process.exit(failures.length ? 1 : 0);
