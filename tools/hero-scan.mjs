// Field benchmark 7 item 5(a) experiment: scan sun 9 (STAGE_COVER_WAVE=8) for a Titan hero tick.
//   STAGE_COVER_WAVE=8 [NO_DIRECTOR=1] node tools/hero-scan.mjs <seeds...>
// Sun 9 hero-shot scan: per tick of the last sun, the operator's conditions (Bench7 item 5a).
import { playRun } from './balance.mjs';
import { makeDirector } from './stageplan.mjs';
import { boardTagOverlaps, createFx, floaterConflicts, fxFromEvent, updateFx } from '../game/src/render/fx.js';
import { carapaceOpen } from '../game/src/enemies.js';
import { DT } from '../game/src/config.js';
const seeds = process.argv.slice(2).map(Number);
const crosses = (leg, x, y, r) => {
  const x0 = Math.min(leg.x0, leg.x1), x1 = Math.max(leg.x0, leg.x1), y0 = Math.min(leg.y0, leg.y1), y1 = Math.max(leg.y0, leg.y1);
  return x0 <= x + r && x1 >= x - r && y0 <= y + r && y1 >= y - r;
};
for (const seed of seeds) {
  const fx = createFx();
  const best = { n: 0, sample: null, stats: {} };
  const { result } = playRun(seed, 'normal', 'greedy', (run, events) => {
    for (const ev of events) fxFromEvent(fx, ev, run);
    updateFx(fx, run, DT);
    if (run.phase !== 'wave' || run.waveIndex !== 8) return;
    const titan = run.enemies.find((e) => e.type === 'titan');
    if (!titan || titan.hp <= 0) return;
    const ratio = titan.hp / titan.maxHp;
    const open = carapaceOpen(titan);
    const legs = run.trace.legs.filter((l) => crosses(l, titan.x, titan.y, titan.def.size)).length;
    const escorts = run.enemies.filter((e) => e !== titan);
    const burning = escorts.filter((e) => e.litPower > 0 && !e.shielded).length;
    const floaters = fx.texts.filter((t) => t.kind === 'kill' && t.life / t.max > 0.3).length;
    const sear = run.chain.count;
    const c = { open, hp: ratio >= 0.35 && ratio <= 0.75, legs: legs >= 2, escorts: escorts.length >= 8, burning: burning >= 2, floaters: floaters >= 2, sear: sear >= 2 };
    for (const [k, v] of Object.entries(c)) if (v) best.stats[k] = (best.stats[k] ?? 0) + 1;
    const all = Object.values(c).every(Boolean) && floaterConflicts(fx, run) === 0 && boardTagOverlaps(run).length === 0;
    if (all) { best.n++; if (!best.sample) best.sample = { tick: run.tick, ratio: +ratio.toFixed(2), legs, escorts: escorts.length, burning, floaters, sear }; }
  }, process.env.NO_DIRECTOR ? null : makeDirector(1));
  console.log(JSON.stringify({ seed, phase: result.phase, hp: result.hp, passing: best.n, sample: best.sample, stats: best.stats }));
}
