// Every sound synthesised with WebAudio, no samples: glass ting, rotate tick, denial buzz,
// kill pop, burn sizzle, fountain thump, sun gong, Flare whoosh, draft pluck, victory and
// defeat cues, a beam hum whose loudness follows how much light is on the board, and
// generative pentatonic music. Master, music and effects each have their own volume.
let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let hum = null;
let noiseBuffer = null;
let lastSizzle = 0;
let levels = { volume: 0.8, music: 0.6, sfx: 0.9, muted: false };

/** Create the audio graph on the first user gesture (browsers require one). */
export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.connect(master);
  applyLevels();
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  hum = buildBeamHum();
}

function applyLevels() {
  if (!ctx) return;
  master.gain.setTargetAtTime(levels.muted ? 0 : levels.volume, ctx.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(levels.sfx, ctx.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(levels.music * 0.5, ctx.currentTime, 0.05);
}

/** settings: { volume, music, sfx, muted } (0-1 each). */
export function setVolume(settings) {
  levels = { volume: settings.volume, music: settings.music, sfx: settings.sfx, muted: settings.muted };
  applyLevels();
}

function envGain(t, peak, attack, decay, bus = sfxBus) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(bus);
  return g;
}

function tone(type, freq, t, peak, attack, decay, endFreq, bus = sfxBus) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + decay);
  o.connect(envGain(t, peak, attack, decay, bus));
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noise(t, peak, decay, lo, hi, bus = sfxBus) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = lo + Math.random() * (hi - lo);
  f.Q.value = 2;
  src.connect(f);
  f.connect(envGain(t, peak, 0.004, decay, bus));
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.05);
}

/** FM bell: the glass "ting" of a placed piece. */
function glassTing(t, base) {
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  car.frequency.value = base;
  mod.frequency.value = base * 3.5;
  modGain.gain.setValueAtTime(base * 1.2, t);
  modGain.gain.exponentialRampToValueAtTime(1, t + 0.6);
  mod.connect(modGain);
  modGain.connect(car.frequency);
  car.connect(envGain(t, 0.22, 0.003, 0.6));
  car.start(t);
  mod.start(t);
  car.stop(t + 0.7);
  mod.stop(t + 0.7);
}

function gong(t, base, peak) {
  for (const [ratio, amp] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone('sine', base * ratio, t, peak * amp, 0.01, 2.6);
}

function buildBeamHum() {
  const g = ctx.createGain();
  g.gain.value = 0;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;
  for (const f of [55, 55.7, 110.4]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    o.start();
  }
  lp.connect(g);
  g.connect(sfxBus);
  return { gain: g, filter: lp };
}

/** Beam hum follows the lit length (0 when no wave is running). */
export function setBeamHum(litCells, active) {
  if (!hum) return;
  const level = active ? Math.min(0.06, 0.01 + litCells * 0.0018) : 0;
  hum.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.2);
  hum.filter.frequency.setTargetAtTime(220 + litCells * 22, ctx.currentTime, 0.2);
}

/** Burning beetles crackle, at most a few times a second. */
export function playSizzle(burning) {
  if (!ctx || burning === 0) return;
  const now = ctx.currentTime;
  if (now - lastSizzle < 0.09) return;
  lastSizzle = now;
  noise(now, Math.min(0.12, 0.04 + burning * 0.01), 0.06, 3000, 6000);
}

/** One-shot sound effects by name. */
export function playSfx(name) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  switch (name) {
    case 'place': glassTing(t, 1320); noise(t, 0.05, 0.15, 400, 900); break;
    case 'rotate': tone('square', 1800, t, 0.05, 0.002, 0.03); break;
    case 'lift': tone('triangle', 660, t, 0.12, 0.005, 0.15, 330); break;
    case 'deny': tone('sawtooth', 120, t, 0.12, 0.005, 0.18); tone('sawtooth', 127, t, 0.1, 0.005, 0.18); break;
    case 'kill': tone('sine', 900, t, 0.16, 0.003, 0.14, 180); noise(t, 0.06, 0.03, 2000, 4000); break;
    case 'bite': tone('sine', 60, t, 0.5, 0.005, 0.35, 40); noise(t, 0.2, 0.12, 600, 1400); break;
    case 'flare': noise(t, 0.25, 0.8, 800, 2400); tone('sine', 440, t, 0.12, 0.05, 0.8, 1320); break;
    case 'wave': gong(t, 110, 0.3); break;
    case 'boss': gong(t, 55, 0.45); break;
    case 'clear': [523, 659, 784].forEach((f, i) => tone('triangle', f, t + i * 0.09, 0.14, 0.005, 0.4)); break;
    case 'pluck': tone('triangle', 880, t, 0.16, 0.003, 0.3); break;
    case 'won': [523, 659, 784, 988, 1319].forEach((f, i) => tone('triangle', f, t + i * 0.14, 0.16, 0.01, 0.9)); break;
    case 'lost': [392, 311, 262].forEach((f, i) => tone('sawtooth', f, t + i * 0.32, 0.09, 0.02, 0.9, f * 0.7)); break;
    case 'click': tone('triangle', 1200, t, 0.08, 0.002, 0.05); break;
    default: break;
  }
}

// --- Generative music: a pentatonic marimba ostinato over a soft drone. ---
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const ROOT = 196; // G3
const music = { next: 0, step: 0, seed: 7, pattern: [], drone: null };

function musicRandom() {
  music.seed = (music.seed * 16807) % 2147483647;
  return music.seed / 2147483647;
}

function noteFreq(degree, octave = 0) {
  return ROOT * 2 ** ((PENTATONIC[degree % PENTATONIC.length] + 12 * octave) / 12);
}

/** A marimba-like strike: sine body plus a quickly dying 4th harmonic. */
function marimba(t, freq, peak) {
  tone('sine', freq, t, peak, 0.004, 0.45, null, musicBus);
  tone('sine', freq * 4, t, peak * 0.25, 0.002, 0.08, null, musicBus);
}

function startDrone() {
  const g = ctx.createGain();
  g.gain.value = 0.05;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  for (const f of [ROOT / 2, ROOT * 0.75, ROOT / 2 + 0.6]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.connect(lp);
    o.start();
  }
  lp.connect(g);
  g.connect(musicBus);
  return g;
}

/** A new 16-step phrase: melody degrees, rests where a step is null. */
function newPhrase() {
  let degree = 2 + Math.floor(musicRandom() * 3);
  music.pattern = Array.from({ length: 16 }, (_, i) => {
    if (i % 4 !== 0 && musicRandom() < 0.35) return null;
    degree = Math.max(0, Math.min(PENTATONIC.length - 1, degree + Math.floor(musicRandom() * 5) - 2));
    return degree;
  });
}

/**
 * Keep the music scheduled ~150 ms ahead. intensity 0 (title, calm) to 9 (last sun):
 * tempo and layers rise with it; between suns only the drone and a sparse melody play.
 */
export function updateMusic(intensity, fighting) {
  if (!ctx || ctx.state !== 'running') return;
  music.drone ??= startDrone();
  const stepDur = 60 / (84 + intensity * 5) / 2;
  if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
  while (music.next < ctx.currentTime + 0.15) {
    const i = music.step % 16;
    if (i === 0) newPhrase();
    const t = music.next;
    if (i % 8 === 0) marimba(t, noteFreq(0, -1), 0.22);
    const degree = music.pattern[i];
    if (degree !== null && (fighting || i % 2 === 0)) marimba(t, noteFreq(degree), fighting ? 0.13 : 0.09);
    if (fighting && intensity >= 3 && i % 4 === 2) marimba(t, noteFreq((degree ?? 4) + 2, 1), 0.05);
    if (fighting && intensity >= 6 && i % 2 === 1) noise(t, 0.025, 0.03, 6000, 9000, musicBus);
    music.next += stepDur;
    music.step++;
  }
}

/** For the playtest: whether the mix is muted and the master gain right now (null before audio starts). */
export function audioProbe() {
  return { muted: levels.muted, gain: master ? master.gain.value : null };
}
