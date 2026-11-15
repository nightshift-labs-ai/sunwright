// The courtyard's voice: turns notable sim events into the three-line event log and the big
// banner over the board. Pure sim state (no DOM), so screenshots can be checked against it.
import { NAMES, WAVE_COUNT } from './config.js';
import { sunApertureFor } from './sun.js';

const LOG_LINES = 3;
const BANNER_SECONDS = 2.5;

function logLineFor(run, ev) {
  switch (ev.type) {
    case 'kill':
      if (ev.boss) return `${NAMES.enemy.titan} BURNED`;
      return ev.mult >= 2 ? `+${ev.points} ${NAMES.combo} x${ev.mult}` : null;
    case 'bite':
      return `${NAMES.fountainShort} -${ev.harm}: ${run.shrineHp}/${run.shrineMax} LEFT`;
    case 'flare':
      return `${NAMES.flare}! DOUBLE POWER 3s`;
    case 'waveStart':
      return `${NAMES.sun} ${ev.wave + 1} RISES IN THE ${run.aperture.phase.wallName}`;
    case 'boss':
      return `THE ${NAMES.enemy.titan} COMES`;
    case 'shrug':
      return `${NAMES.enemy.shellback}: ARMOUR 12 - FOCUS LIGHT`;
    case 'deflect':
      return `${NAMES.enemy.glassback} DEFLECTS THE BEAM`;
    default:
      return null;
  }
}

function bannerFor(run, ev) {
  if (ev.type === 'flare') return `${NAMES.flare}! DOUBLE POWER`;
  if (ev.type === 'boss') return `THE TITAN COMES!`;
  if (ev.type === 'bite' && run.shrineHp <= 3) return `${NAMES.fountainShort} ${run.shrineHp}/${run.shrineMax} - HOLD ON!`;
  if (ev.type === 'waveStart') return `${NAMES.sun} ${ev.wave + 1}: ${run.aperture.phase.name} (${run.aperture.phase.wallName[0]})`;
  return null;
}

/** Feed the events of one tick into the log and banner. */
export function announceEvents(run, events) {
  for (const ev of events) {
    const line = logLineFor(run, ev);
    if (line) {
      run.log.push(line);
      if (run.log.length > LOG_LINES) run.log.shift();
    }
    const banner = bannerFor(run, ev);
    if (banner) run.banner = { text: banner, at: run.time };
  }
}

/** The title's two rule lines: the core verb, then the win and lose conditions (suns counted from config). */
export function titleRules() {
  return {
    verb: 'Place glass to bend sunlight onto beetles',
    winLose: `WIN: survive ${WAVE_COUNT} ${NAMES.suns.toLowerCase()} - LOSE: the ${NAMES.fountainShort.toLowerCase()} runs dry`,
  };
}

/** The run's win and lose conditions with the real count of suns still to hold (current included). */
export function winLoseHeadline(run) {
  const left = WAVE_COUNT - run.stats.wavesCleared;
  return `WIN: hold ${left} more ${left === 1 ? NAMES.sun.toLowerCase() : NAMES.suns.toLowerCase()} - LOSE: the ${NAMES.fountainShort.toLowerCase()} runs dry`;
}

/** The banner shown now: a fresh event, else advice about the next sun. */
export function currentBanner(run) {
  if (run.banner && run.time - run.banner.at < BANNER_SECONDS) return run.banner.text;
  if (run.phase === 'build') return `PLACE GLASS - ENTER STARTS ${NAMES.sun} ${run.waveIndex + 1}`;
  if (run.phase !== 'wave') return '';
  if (run.waveIndex + 1 >= WAVE_COUNT) return 'LAST SUN - BURN THE TITAN';
  return `NEXT ${NAMES.sun}: ${sunApertureFor(run.seed, run.waveIndex + 1).phase.wallName} - REAIM GLASS`;
}

/** The draft's context line under its heading: the sun just held, what burned in it, the fountain. */
export function draftContext(run) {
  return `${NAMES.sun} ${run.stats.wavesCleared} HELD - ${run.stats.sunKills} burned - ${NAMES.fountainShort} ${run.shrineHp}/${run.shrineMax}`;
}

/** How to take a charm, under the draft roundels. */
export function draftHint(run) {
  return `CLICK A ROUNDEL OR PRESS 1-${run.offer.length}`;
}

/** One RUN HISTORY chip on the results screen, from a saved run summary. */
export function historyChip(h) {
  return h.outcome === 'won' ? `WON ${h.suns}/${WAVE_COUNT}` : `LOST - Day ${h.day} ${h.phase.toLowerCase()}`;
}
