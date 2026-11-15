// Mouse and keyboard: raw DOM events become intents in a queue (click, wheel, key) plus the
// current pointer position in stage pixels. Handlers never touch the game state; main.js reads
// the queue once per frame and turns intents into sim orders.
import { VIEW_H, VIEW_W } from './render/layout.js';

// Enter is ours too: a focused button must not also click itself (PLAY would start twice).
const BLOCKED_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function createInput(stage, canvas) {
  const input = { intents: [], mouse: { x: -1, y: -1, inside: false } };

  const toStage = (e) => {
    const rect = stage.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * VIEW_W) / rect.width, y: ((e.clientY - rect.top) * VIEW_H) / rect.height };
  };

  canvas.addEventListener('mousemove', (e) => {
    const p = toStage(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouse.inside = false;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toStage(e);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    input.intents.push({ kind: 'click', button: e.button, x: p.x, y: p.y });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (e.deltaY !== 0) input.intents.push({ kind: 'wheel', dir: e.deltaY > 0 ? 1 : -1 });
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (BLOCKED_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    input.intents.push({ kind: 'key', code: e.code });
  });
  return input;
}

/** Take every queued intent (oldest first) and empty the queue. */
export function drainIntents(input) {
  return input.intents.splice(0, input.intents.length);
}
