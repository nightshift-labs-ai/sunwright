// The title's loop pictograms, drawn in code: PLACE (a mirror on its plinth), BURN (a beam
// through a beetle) and RE-AIM (a sun with a turning arrow).
export function drawLoopPicto(ctx, kind, s) {
  const c = s / 2;
  ctx.clearRect(0, 0, s, s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2A1608';
  ctx.lineWidth = s / 18;
  if (kind === 'place') {
    ctx.fillStyle = '#EBC68C';
    ctx.fillRect(s * 0.18, s * 0.55, s * 0.64, s * 0.28);
    ctx.strokeRect(s * 0.18, s * 0.55, s * 0.64, s * 0.28);
    ctx.save();
    ctx.translate(c, s * 0.42);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#E6F1FF';
    ctx.fillRect(-s * 0.3, -s * 0.08, s * 0.6, s * 0.16);
    ctx.strokeRect(-s * 0.3, -s * 0.08, s * 0.6, s * 0.16);
    ctx.restore();
  } else if (kind === 'burn') {
    ctx.fillStyle = '#B0307A';
    ctx.beginPath();
    ctx.ellipse(c, c + s * 0.12, s * 0.26, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#FFC531';
    ctx.lineWidth = s / 7;
    ctx.beginPath();
    ctx.moveTo(s * 0.04, c + s * 0.12);
    ctx.lineTo(s * 0.96, c + s * 0.12);
    ctx.stroke();
    ctx.strokeStyle = '#FFFBE6';
    ctx.lineWidth = s / 18;
    ctx.stroke();
    ctx.fillStyle = '#FF6A2A';
    ctx.beginPath();
    ctx.moveTo(c - s * 0.1, s * 0.42);
    ctx.quadraticCurveTo(c, s * 0.02, c + s * 0.1, s * 0.42);
    ctx.fill();
  } else {
    ctx.fillStyle = '#FFC531';
    ctx.beginPath();
    ctx.arc(c, c, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = s / 12;
    ctx.beginPath();
    ctx.arc(c, c, s * 0.38, -2.6, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c + s * 0.38 * Math.cos(1.2) - s * 0.12, c + s * 0.38 * Math.sin(1.2));
    ctx.lineTo(c + s * 0.38 * Math.cos(1.2), c + s * 0.38 * Math.sin(1.2));
    ctx.lineTo(c + s * 0.38 * Math.cos(1.2), c + s * 0.38 * Math.sin(1.2) - s * 0.13);
    ctx.stroke();
  }
}
