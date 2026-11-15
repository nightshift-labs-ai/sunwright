// Glass charm pictograms: one distinct glyph and colour per charm, drawn in code, used at 28 px in
// the HUD and at 84 px in the draft roundels so each charm reads at thumbnail size.

const INK = '#3B1247';

function sun(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ctx.moveTo(x + Math.cos(a) * r * 0.58, y + Math.sin(a) * r * 0.58);
    ctx.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85);
  }
  ctx.stroke();
}

function droplet(ctx, x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.85);
  ctx.bezierCurveTo(x + r * 0.25, y - r * 0.4, x + r * 0.6, y - r * 0.1, x + r * 0.6, y + r * 0.25);
  ctx.arc(x, y + r * 0.25, r * 0.6, 0, Math.PI);
  ctx.bezierCurveTo(x - r * 0.6, y - r * 0.1, x - r * 0.25, y - r * 0.4, x, y - r * 0.85);
  ctx.fill();
  ctx.stroke();
}

const GLYPHS = {
  spreading(ctx, x, y, r) {
    // A flame.
    ctx.fillStyle = '#FF6A2A';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.85);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 0.2, x + r * 0.6, y + r * 0.75, x, y + r * 0.8);
    ctx.bezierCurveTo(x - r * 0.6, y + r * 0.75, x - r * 0.7, y - r * 0.1, x - r * 0.15, y - r * 0.35);
    ctx.quadraticCurveTo(x - r * 0.05, y - r * 0.6, x, y - r * 0.85);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FFE14D';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.35, r * 0.22, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  grinder(ctx, x, y, r) {
    // A lens disc with a grinding arrow around it.
    ctx.fillStyle = '#77D7E8';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.3, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, -2.4, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.62, y + r * 0.45);
    ctx.lineTo(x + r * 0.85, y + r * 0.85);
    ctx.lineTo(x + r * 0.4, y + r * 0.78);
    ctx.stroke();
  },
  sunstone(ctx, x, y, r) {
    sun(ctx, x, y, r, '#FFC531');
  },
  burning(ctx, x, y, r) {
    // A magnifying glass.
    ctx.fillStyle = '#BFE9FF';
    ctx.beginPath();
    ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth *= 2;
    ctx.beginPath();
    ctx.moveTo(x + r * 0.2, y + r * 0.2);
    ctx.lineTo(x + r * 0.75, y + r * 0.75);
    ctx.stroke();
  },
  longchain(ctx, x, y, r) {
    // An hourglass.
    ctx.fillStyle = '#FFB0D8';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.75);
    ctx.lineTo(x + r * 0.5, y - r * 0.75);
    ctx.lineTo(x + r * 0.08, y);
    ctx.lineTo(x + r * 0.5, y + r * 0.75);
    ctx.lineTo(x - r * 0.5, y + r * 0.75);
    ctx.lineTo(x - r * 0.08, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y + r * 0.75);
    ctx.lineTo(x + r * 0.3, y + r * 0.75);
    ctx.lineTo(x, y + r * 0.35);
    ctx.closePath();
    ctx.fill();
  },
  mend(ctx, x, y, r) {
    droplet(ctx, x, y, r, '#3FD6C8');
  },
  silvered(ctx, x, y, r) {
    // A silver mirror bar.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#E6F1FF';
    ctx.fillRect(-r * 0.85, -r * 0.22, r * 1.7, r * 0.44);
    ctx.strokeRect(-r * 0.85, -r * 0.22, r * 1.7, r * 0.44);
    ctx.restore();
  },
  flare2(ctx, x, y, r) {
    sun(ctx, x - r * 0.35, y + r * 0.2, r * 0.6, '#FFE27A');
    sun(ctx, x + r * 0.35, y - r * 0.25, r * 0.6, '#FFC531');
  },
  magnet(ctx, x, y, r) {
    // A quartz gem with two pull arrows.
    ctx.fillStyle = '#7FE8FF';
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.7);
    ctx.lineTo(x + r * 0.42, y - r * 0.15);
    ctx.lineTo(x, y + r * 0.7);
    ctx.lineTo(x - r * 0.42, y - r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.95, y + r * 0.1);
    ctx.lineTo(x - r * 0.6, y + r * 0.1);
    ctx.moveTo(x + r * 0.95, y + r * 0.1);
    ctx.lineTo(x + r * 0.6, y + r * 0.1);
    ctx.stroke();
  },
  discount(ctx, x, y, r) {
    // A price tag reading -1.
    ctx.fillStyle = '#7DFFC4';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r * 0.45);
    ctx.lineTo(x + r * 0.4, y - r * 0.45);
    ctx.lineTo(x + r * 0.85, y);
    ctx.lineTo(x + r * 0.4, y + r * 0.45);
    ctx.lineTo(x - r * 0.8, y + r * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(r * 0.7)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('-1', x - r * 0.15, y + r * 0.25);
  },
  highsun(ctx, x, y, r) {
    sun(ctx, x, y + r * 0.15, r * 0.8, '#FFC531');
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, y - r * 0.55);
    ctx.lineTo(x, y - r * 0.9);
    ctx.lineTo(x + r * 0.3, y - r * 0.55);
    ctx.stroke();
  },
  trueprism(ctx, x, y, r) {
    const faces = ['#FF4D3D', '#59B8FF', '#FFC531'];
    const tri = [[x, y - r * 0.8], [x + r * 0.75, y + r * 0.55], [x - r * 0.75, y + r * 0.55]];
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = faces[k];
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(...tri[k]);
      ctx.lineTo(...tri[(k + 1) % 3]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(...tri[0]);
    ctx.lineTo(...tri[1]);
    ctx.lineTo(...tri[2]);
    ctx.closePath();
    ctx.stroke();
  },
};

/** Draw a charm's pictogram centred on (x, y), r = half its size. */
export function drawCharmGlyph(ctx, id, x, y, r) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r / 9);
  (GLYPHS[id] ?? GLYPHS.sunstone)(ctx, x, y, r);
  ctx.restore();
}

/** A charm badge for the HUD: a coloured disc with a gold rim and the charm's glyph. */
export function drawCharmBadge(ctx, boon, x, y, r) {
  ctx.fillStyle = `hsl(${boon.hue}, 70%, 32%)`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF6DF';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F2C14E';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  drawCharmGlyph(ctx, boon.id, x, y, r * 0.72);
}
