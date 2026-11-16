// Persistence in localStorage: best score and furthest sun per difficulty, the run history shown
// on the results screen, the FEATS earned, and settings.
const KEY = 'sunwright.save.v1';

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private mode or storage full: the game still plays, it just forgets.
  }
}

/** { score, waves, played } for a difficulty; played is false until a run there has ended. */
export function loadBest(difficultyId) {
  const best = readSave().best?.[difficultyId];
  return best ? { ...best, played: true } : { score: 0, waves: 0, played: false };
}

const HISTORY_KEEP = 10;

/**
 * Record a finished run (summary: { difficultyId, outcome, score, suns, day, phase }) in the
 * history and the per-difficulty best; returns { isBest, previousBest }.
 */
export function recordRun(summary) {
  const data = readSave();
  data.best ??= {};
  const old = data.best[summary.difficultyId] ?? { score: 0, waves: 0 };
  const isBest = summary.score > old.score;
  data.best[summary.difficultyId] = { score: Math.max(old.score, summary.score), waves: Math.max(old.waves, summary.suns) };
  data.history = [...(data.history ?? []), summary].slice(-HISTORY_KEEP);
  if (summary.outcome === 'won') data.eclipseUnlocked = true;
  if (summary.mode === 'eclipse') data.eclipseBest = Math.max(data.eclipseBest ?? 0, summary.suns);
  data.feats = [...new Set([...(data.feats ?? []), ...(summary.feats ?? [])])];
  writeSave(data);
  return { isBest, previousBest: old.score };
}

/** ECLIPSE: { unlocked (any win, any difficulty), best (most suns held in an eclipse run, 0 if none) }. */
export function loadEclipse() {
  const data = readSave();
  return { unlocked: !!data.eclipseUnlocked || (data.history ?? []).some((h) => h.outcome === 'won'), best: data.eclipseBest ?? 0 };
}

/** Every FEAT id any finished run has earned. */
export function loadFeats() {
  return readSave().feats ?? [];
}

/** Finished runs, oldest first. */
export function loadHistory() {
  return readSave().history ?? [];
}

export function loadSettings() {
  return { muted: false, volume: 0.8, music: 0.6, sfx: 0.9, shake: true, patterns: false, difficulty: 'normal', ...readSave().settings };
}

export function saveSettings(settings) {
  const data = readSave();
  data.settings = settings;
  writeSave(data);
}
