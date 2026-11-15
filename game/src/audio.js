// Every sound synthesised with WebAudio, no samples: glass ting, rotate tick, denial buzz,
// kill pop, burn sizzle, shrine thump, wave gong, Flare whoosh, draft pluck, victory and
// defeat cues, and a beam hum whose loudness follows how much light is on the board.
let ctx = null;
let master = null;
let hum = null;
let noiseBuffer = null;
let lastSizzle = 0;
let volume = 0.8;
let muted = false;

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
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  hum = buildBeamHum();
}

export function setVolume(v, isMuted) {
  volume = v;
  muted = isMuted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
}

function envGain(t, peak, attack, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(master);
  return g;
}

function tone(type, freq, t, peak, attack, decay, endFreq) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + decay);
  o.connect(envGain(t, peak, attack, decay));
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noise(t, peak, decay, lo, hi) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = lo + Math.random() * (hi - lo);
  f.Q.value = 2;
  src.connect(f);
  f.connect(envGain(t, peak, 0.004, decay));
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
  g.connect(master);
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
