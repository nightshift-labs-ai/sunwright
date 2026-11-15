// A tiny test hook for the staging and playtest tools (only with ?test=1 in the URL): the page
// stops advancing on its own and the tools step the real fixed-step loop, queue real orders,
// point the mouse, and read back the numbers the HUD shows.
import { ENEMIES, WAVE_COUNT } from './config.js';
import { nextSunPreview } from './waves.js';
import { enemiesRemaining } from './sim.js';
import { rankFor } from './combat.js';
import { currentBanner, winLoseHeadline } from './announce.js';
import { loadHistory } from './save.js';
import { boardTextBoxes, boxTouchesBeam } from './render/fx.js';
import { boardLabelBoxes } from './render/board.js';

/** Board tags (SWARM, FOUNTAIN) that a beam core or a beetle covers right now. */
function tagOverlaps(app) {
  const run = app.run;
  if (!run) return [];
  const bad = [];
  for (const t of boardLabelBoxes(run)) {
    if (boxTouchesBeam(t, run.trace.legs)) bad.push(`${t.text} / beam`);
    for (const e of run.enemies) {
      const r = e.def.size * 60;
      const x = 250 + e.x * 60;
      const y = 140 + e.y * 60;
      if (t.x0 < x + r && x - r < t.x1 && t.y0 < y + r && y - r < t.y1) bad.push(`${t.text} / ${e.type}`);
    }
  }
  return bad;
}

/** Measure each floating number as drawn now and list any that overlap another, a label or a beam core. */
function floaterOverlaps(app) {
  const run = app.run;
  if (!run) return [];
  const g = document.createElement('canvas').getContext('2d');
  const boxes = app.fx.texts.map((t) => {
    const age = t.max - t.life;
    const pop = age < 0.15 ? 1.4 - (age / 0.15) * 0.4 : 1;
    g.font = `900 ${Math.round(t.size * pop)}px system-ui, sans-serif`;
    const w = g.measureText(t.text).width;
    const h = t.size * pop;
    return { text: t.text, x0: t.x - w / 2, x1: t.x + w / 2, y0: t.y - h * 0.8, y1: t.y + h * 0.2 };
  });
  const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const bad = [];
  boxes.forEach((b, i) => {
    boxes.slice(i + 1).forEach((o) => hit(b, o) && bad.push(`${b.text} / ${o.text}`));
    boardTextBoxes(run).forEach((l) => hit(b, l) && bad.push(`${b.text} / label ${l.text}`));
    if (boxTouchesBeam(b, run.trace.legs)) bad.push(`${b.text} / beam`);
  });
  return bad;
}

export function installTestHook(app, api) {
  app.manual = true;
  window.__test = {
    start(seed, difficulty) {
      api.startRun(seed, difficulty);
    },
    advance(ticks) {
      for (let i = 0; i < ticks; i++) api.tick();
      return this.state();
    },
    /** Replay a recorded order log ([{ tick, orders }]) up to a tick, through the real loop. */
    replay(log, untilTick) {
      let k = log.findIndex((entry) => entry.tick >= app.run.tick);
      while (app.run.tick < untilTick) {
        if (k >= 0 && k < log.length && log[k].tick === app.run.tick) app.orders.push(...log[k++].orders);
        api.tick();
      }
      return this.state();
    },
    order(order) {
      app.orders.push(order);
      api.tick();
    },
    key(code) {
      api.intent({ kind: 'key', code });
    },
    ui(action, arg = null) {
      api.intent({ kind: 'ui', action, arg });
    },
    pointAt(x, y) {
      api.pointAt(x, y);
    },
    /** Floating numbers that overlap each other, a floor label or a beam core (measured boxes). */
    textOverlaps() {
      return floaterOverlaps(app);
    },
    tagOverlaps() {
      return tagOverlaps(app);
    },
    floaterCount() {
      return app.fx.texts.length;
    },
    /** Every number the HUD draws, straight from sim state. */
    state() {
      const run = app.run;
      if (!run) return { screen: app.screen };
      return {
        screen: app.screen,
        phase: run.phase,
        seed: run.seed,
        difficulty: run.diff.name,
        day: run.aperture.day,
        sun: run.aperture.phase.name,
        wall: run.aperture.phase.wallName,
        wave: run.waveIndex + 1,
        waves: WAVE_COUNT,
        quartz: run.quartz,
        score: run.score,
        shrineHp: run.shrineHp,
        shrineMax: run.shrineMax,
        chain: run.chain.count,
        bestChain: run.chain.best,
        flareCharges: run.flareCharges,
        remaining: enemiesRemaining(run),
        enemies: run.enemies.map((e) => ({ type: e.type, x: +e.x.toFixed(2), y: +e.y.toFixed(2), hp: Math.round(e.hp) })),
        boons: run.boons.slice(),
        offer: run.offer.slice(),
        kills: run.stats.kills,
        banner: currentBanner(run),
        headline: winLoseHeadline(run),
        log: run.log.join(' | '),
        sunsHeld: run.stats.wavesCleared,
        offersSeen: run.stats.offersSeen,
        rank: rankFor(run),
        nextSun: nextSunPreview(run.waveIndex, run.diff, (t) => ENEMIES[t].name),
        best: app.ui.best,
        history: loadHistory().slice(-3),
        tick: run.tick,
      };
    },
  };
}
