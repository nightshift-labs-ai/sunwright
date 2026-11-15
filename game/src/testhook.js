// A tiny test hook for the staging and playtest tools (only with ?test=1 in the URL): the page
// stops advancing on its own and the tools step the real fixed-step loop, queue real orders,
// point the mouse, and read back the numbers the HUD shows.
import { WAVE_COUNT } from './config.js';
import { enemiesRemaining } from './sim.js';
import { currentBanner, winLoseHeadline } from './announce.js';
import { loadHistory } from './save.js';

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
        best: app.ui.best,
        history: loadHistory().slice(-3),
        tick: run.tick,
      };
    },
  };
}
