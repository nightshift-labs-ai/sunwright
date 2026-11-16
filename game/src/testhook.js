// A tiny test hook for the staging and playtest tools (only with ?test=1 in the URL): the page
// stops advancing on its own and the tools step the real fixed-step loop, queue real orders,
// point the mouse, and read back the numbers the HUD shows.
import { ENEMIES, WAVE_COUNT } from './config.js';
import { nextSunPreview } from './waves.js';
import { enemiesRemaining } from './sim.js';
import { rankFor } from './combat.js';
import { currentBanner, winLoseHeadline } from './announce.js';
import { loadHistory } from './save.js';
import { audioProbe } from './audio.js';
import { squeezeReport } from './render/fit.js';
import { bannerLayout } from './render/banner.js';
import { buildIconCount } from './render/results.js';
import { hudTextBoxes, lastFrieze } from './render/hud.js';
import { beetleUnder, boardTagOverlaps, boardTextBoxes, boxTouchesBeam, drawnStarbursts } from './render/fx.js';
import { boardLabelBoxes, propBoxes, propsVisible } from './render/board.js';


/** Props (palm, vase) drawn this frame whose box touches HUD text or a visible overlay's text. */
function propOverlaps(app) {
  if (!propsVisible()) return [];
  const texts = app.screen === 'play' ? hudTextBoxes() : [];
  for (const n of document.querySelectorAll('#stage .overlay:not(.hidden) *')) {
    if (n.childElementCount || !n.textContent.trim()) continue;
    const r = n.getBoundingClientRect();
    texts.push({ text: n.textContent.trim().slice(0, 30), x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
  }
  const bad = [];
  for (const p of propBoxes()) for (const t of texts) if (p.x0 < t.x1 && t.x0 < p.x1 && p.y0 < t.y1 && t.y0 < p.y1) bad.push(`${p.text} / ${t.text}`);
  return bad;
}

/** The banner pill's wall and box as drawn (render/banner.js), or null. */
function bannerBox(run) {
  const b = bannerLayout(run);
  return b && { wall: b.wall, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
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
    if (beetleUnder(b, run)) bad.push(`${b.text} / beetle`);
  });
  return bad;
}

/** The draft overlay's visible text, and any two of its text boxes (or a box and the screen edge) that collide. */
function draftText() {
  const screen = document.getElementById('draft-screen');
  if (screen.classList.contains('hidden')) return null;
  const boxes = [...screen.querySelectorAll('.sunbanner, .draft-context, .key, .effect, .synergy, .newchip, #draft-reroll, .draft-hint')]
    .filter((n) => n.textContent.trim())
    .map((n) => ({ text: n.textContent.trim(), r: n.getBoundingClientRect() }));
  const bad = [];
  boxes.forEach((a, i) => {
    if (a.r.left < 12 || a.r.top < 0 || a.r.right > 1268 || a.r.bottom > 800) bad.push(`${a.text} / screen edge`);
    for (const b of boxes.slice(i + 1)) if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) bad.push(`${a.text} / ${b.text}`);
  });
  // The canvas verdict plaque (fx.drawBeamGhost, y 166-210, at most x 330-950) is text too.
  for (const a of boxes) if (a.r.top < 210 && a.r.bottom > 166 && a.r.left < 950 && a.r.right > 330) bad.push(`${a.text} / NEXT SUN verdict plaque`);
  // Each roundel owns a 400 px column; its effect line keeps a 12 px gutter inside it.
  for (const n of screen.querySelectorAll('.effect')) if (n.getBoundingClientRect().width > 388) bad.push(`${n.textContent.trim()} / wider than its column`);
  const all = (sel) => [...screen.querySelectorAll(sel)].map((n) => n.textContent.trim());
  const context = document.querySelector('#draft-context .ctx');
  const heal = document.querySelector('#draft-context .healchip');
  return { effects: all('.effect'), hint: all('.draft-hint')[0], reroll: all('#draft-reroll')[0], context: context.textContent.trim(), heal: heal ? heal.textContent.trim() : '', contextPx: parseFloat(getComputedStyle(context).fontSize), overlaps: bad };
}

/** The results LAST 3 RUNS strip as shown: label, small lose title, chips, their type sizes, and any
 *  other results text that repeats the lose title. */
function resultsText() {
  const screen = document.getElementById('results-screen');
  if (screen.classList.contains('hidden')) return null;
  const strip = document.getElementById('results-history');
  const px = (n) => (n ? parseFloat(getComputedStyle(n).fontSize) : 0);
  const label = strip.querySelector('.strip-head b');
  const cap = strip.querySelector('.strip-head small');
  const elsewhere = [...screen.querySelectorAll('*')].filter((n) => !strip.contains(n) && !n.childElementCount && n.textContent.trim() === cap?.textContent.trim());
  return {
    label: label?.textContent.trim() ?? '',
    labelPx: px(label),
    cap: cap?.textContent.trim() ?? '',
    capPx: px(cap),
    capElsewhere: elsewhere.length,
    chips: [...strip.querySelectorAll('.chip')].map((n) => ({ text: n.textContent.trim(), won: n.classList.contains('won') })),
    featsLabel: document.querySelector('#results-feats b')?.textContent.trim() ?? '',
    next: document.getElementById('results-next').textContent.trim(),
    runLine: document.getElementById('results-run').textContent.trim(),
    buildIcons: buildIconCount(),
    nineOfNine: [...screen.querySelectorAll('*')].filter((n) => !n.childElementCount && n.textContent.includes('9/9')).length,
    sub: document.getElementById('results-sub').textContent.trim(),
    ladder: (() => {
      const meta = document.getElementById('results-meta');
      const spans = [...meta.children].filter((n) => n.tagName === 'SPAN');
      return {
        head: spans[0]?.textContent.trim() ?? '',
        marks: [...meta.querySelectorAll('.req')].map((n) => ({ label: n.textContent.trim(), ok: n.querySelector('svg')?.dataset.ok === 'true' })),
        px: parseFloat(getComputedStyle(meta).fontSize),
        fit: parseFloat(meta.style.getPropertyValue('--fit') || '1'),
        fits: meta.scrollWidth * 0.92 <= meta.parentElement.clientWidth - 24,
        natural: meta.scrollWidth,
        room: meta.parentElement.clientWidth - 24,
      };
    })(),
    feats: [...document.querySelectorAll('#results-feats .feat')].map((n) => n.textContent.trim()),
  };
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
    /** Covered board tags on the play board, or on the title demo's courtyard; and how many tags it has. */
    propOverlaps() {
      return propOverlaps(app);
    },
    tagOverlaps() {
      const run = app.screen === 'play' ? app.run : app.demo.run;
      return run ? boardTagOverlaps(run) : [];
    },
    titleLabels() {
      return boardLabelBoxes(app.demo.run).length + 1;
    },
    /** Combo kills (SEAR x2+) this run and the SEAR numbers they spawned. */
    sear() {
      return { kills: app.fx.searKills ?? 0, floaters: app.fx.searFloaters ?? 0 };
    },
    draftText() {
      return draftText();
    },
    resultsText() {
      return resultsText();
    },
    audio() {
      return audioProbe();
    },
    /** Lines squeezed since the last call: { tooTight, squeezed } (render/fit.js); clears the record. */
    squeezes() {
      return squeezeReport();
    },
    starbursts() {
      return drawnStarbursts();
    },
    /** Floating numbers now: text, kind, spawn point and the beam hit (or bite) it belongs to. */
    floaters() {
      return app.fx.texts.filter((t) => t.kind).map((t) => ({ text: t.text, kind: t.kind, sx: Math.round(t.sx), sy: Math.round(t.sy), ax: Math.round(t.ax), ay: Math.round(t.ay) }));
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
        bannerBox: bannerBox(run),
        frieze: lastFrieze(),
        headline: winLoseHeadline(run),
        log: run.log.join(' | '),
        sunsHeld: run.stats.wavesCleared,
        offersSeen: run.stats.offersSeen,
        rank: rankFor(run),
        nextSun: nextSunPreview(run.waveIndex, run.diff, (t) => ENEMIES[t].name),
        best: app.ui.best,
        fast: app.fast,
        muted: app.settings.muted,
        paused: app.paused,
        history: loadHistory().slice(-3),
        tick: run.tick,
      };
    },
  };
}
