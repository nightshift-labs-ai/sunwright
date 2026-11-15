// One rule for type that has to fit a box, on every screen: a line may be squeezed to no less than
// 92% of its width. When that is not enough the caller's shorter wording (or smaller size) is used
// instead. A line that still needs more is remembered, so the screenshot checks can fail on it.
export const MIN_SQUEEZE = 0.92;
const tooTight = new Map();
const squeezed = new Map();

function note(map, str, k) {
  map.set(str, Math.min(k, map.get(str) ?? 1));
}

/**
 * The first option that fits maxW at >= 92% width, with the font already set on ctx.
 * options: a string or a list of wordings, longest first. Returns { str, squeeze }.
 */
export function fitOption(ctx, options, maxW) {
  const list = Array.isArray(options) ? options : [options];
  for (const str of list) {
    const k = Math.min(1, maxW / ctx.measureText(str).width);
    if (k >= MIN_SQUEEZE) {
      if (k < 1) note(squeezed, str, k);
      return { str, squeeze: k };
    }
  }
  const str = list[list.length - 1];
  note(tooTight, str, maxW / ctx.measureText(str).width);
  return { str, squeeze: MIN_SQUEEZE };
}

/** fitOption over font sizes too: each wording tries every size (largest first), then the next wording. */
export function fitSized(ctx, options, maxW, sizes, font) {
  const list = Array.isArray(options) ? options : [options];
  for (const str of list) {
    for (const size of sizes) {
      ctx.font = font(size);
      const k = Math.min(1, maxW / ctx.measureText(str).width);
      if (k >= MIN_SQUEEZE) {
        if (k < 1) note(squeezed, str, k);
        return { str, squeeze: k, size };
      }
    }
  }
  const size = sizes[sizes.length - 1];
  ctx.font = font(size);
  return { ...fitOption(ctx, list[list.length - 1], maxW), size };
}

/** For a DOM label of natural width `width` in `room` px: its horizontal scale, never under 92%. */
export function fitScale(str, width, room) {
  const k = Math.min(1, room / width);
  if (k < MIN_SQUEEZE) note(tooTight, str, k);
  else if (k < 1) note(squeezed, str, k);
  return Math.max(MIN_SQUEEZE, k);
}

/** Lines squeezed since the last call: { tooTight: ['text (0.85)'], squeezed: [...] }; clears both. */
export function squeezeReport() {
  const list = (map) => [...map].map(([s, k]) => `${s} (${k.toFixed(2)})`);
  const out = { tooTight: list(tooTight), squeezed: list(squeezed) };
  tooTight.clear();
  squeezed.clear();
  return out;
}
