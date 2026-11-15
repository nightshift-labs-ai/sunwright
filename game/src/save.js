// Persistence in localStorage: best score and furthest wave per difficulty, and settings.
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

/** Record a finished run; returns true when it is a new best score. */
export function recordRun(difficultyId, score, waves) {
  const data = readSave();
  data.best ??= {};
  const old = data.best[difficultyId] ?? { score: 0, waves: 0 };
  const isBest = score > old.score;
  data.best[difficultyId] = { score: Math.max(old.score, score), waves: Math.max(old.waves, waves) };
  writeSave(data);
  return isBest;
}

export function loadSettings() {
  return { muted: false, volume: 0.8, music: 0.6, sfx: 0.9, shake: true, difficulty: 'normal', ...readSave().settings };
}

export function saveSettings(settings) {
  const data = readSave();
  data.settings = settings;
  writeSave(data);
}
