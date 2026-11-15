// Persistence in localStorage: best score and furthest sun per difficulty, the run history shown
// on the results screen, and settings.
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

export function loadBest(difficultyId) {
  return readSave().best?.[difficultyId] ?? { score: 0, waves: 0 };
}

const HISTORY_KEEP = 10;

/**
 * Record a finished run (summary: { difficultyId, outcome, score, suns, day, phase }) in the
 * history and the per-difficulty best; returns true when it is a new best score.
 */
export function recordRun(summary) {
  const data = readSave();
  data.best ??= {};
  const old = data.best[summary.difficultyId] ?? { score: 0, waves: 0 };
  const isBest = summary.score > old.score;
  data.best[summary.difficultyId] = { score: Math.max(old.score, summary.score), waves: Math.max(old.waves, summary.suns) };
  data.history = [...(data.history ?? []), summary].slice(-HISTORY_KEEP);
  writeSave(data);
  return isBest;
}

/** Finished runs, oldest first. */
export function loadHistory() {
  return readSave().history ?? [];
}

export function loadSettings() {
  return { muted: false, volume: 0.8, music: 0.6, sfx: 0.9, shake: true, difficulty: 'normal', ...readSave().settings };
}

export function saveSettings(settings) {
  const data = readSave();
  data.settings = settings;
  writeSave(data);
}
