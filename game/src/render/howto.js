// The How to play pictures, drawn in code: BUILD (a mirror turning the sunbeam onto the swarm's
// path), BURN (beetles searing in the beam), ADAPT (the sun hopping east -> north -> west).
const SAND = '#D8A86A';
const GOLD = '#FFC531';

function beam(g, points) {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [w, c] of [[16, 'rgba(255,197,49,0.4)'], [7, '#FF8A1A'], [3, '#FFFBE6']]) {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    points.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  }
}

function beetle(g, x, y, burning) {
  if (burning) {
    g.fillStyle = 'rgba(255,170,40,0.55)';
    g.beginPath();
    g.arc(x, y, 20, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#B0307A';
  g.strokeStyle = '#26091C';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#FFE14D';
  g.fillRect(x + 8, y - 4, 3, 3);
  g.fillRect(x + 8, y + 2, 3, 3);
}

function sun(g, x, y, r, lit) {
  g.fillStyle = lit ? GOLD : 'rgba(255,230,170,0.45)';
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

/** Draw one How to play picture into a 240 x 120 canvas. */
export function drawHowtoPicture(g, kind) {
  const w = g.canvas.width;
  const h = g.canvas.height;
  g.fillStyle = SAND;
  g.fillRect(0, 0, w, h);
  if (kind === 'build') {
    beam(g, [[w, 40], [120, 40], [120, h]]);
    g.save();
    g.translate(120, 40);
    g.rotate(-Math.PI / 4);
    g.fillStyle = '#2D5BD0';
    g.fillRect(-26, -7, 52, 14);
    g.fillStyle = '#E6F1FF';
    g.fillRect(-22, -3, 44, 6);
    g.restore();
    beetle(g, 120, 95, true);
    g.strokeStyle = '#C81C1C';
    g.lineWidth = 3;
    for (const x of [60, 180]) {
      g.beginPath();
      g.moveTo(x - 6, 92);
      g.lineTo(x, 84);
      g.lineTo(x + 6, 92);
      g.stroke();
    }
  } else if (kind === 'burn') {
    beam(g, [[0, 60], [w, 60]]);
    beetle(g, 70, 60, true);
    beetle(g, 140, 60, true);
    g.font = '900 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 4;
    g.strokeStyle = '#3A1A08';
    g.strokeText('+120 SEAR x3', 120, 30);
    g.fillStyle = '#F2C14E';
    g.fillText('+120 SEAR x3', 120, 30);
  } else {
    const cx = w / 2;
    const cy = h - 18;
    g.strokeStyle = '#7A4A22';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, 80, Math.PI, 0);
    g.stroke();
    sun(g, cx + 80, cy, 12, false);
    sun(g, cx, cy - 80, 14, true);
    sun(g, cx - 80, cy, 12, false);
    g.strokeStyle = '#FFFFFF';
    g.setLineDash([5, 4]);
    g.beginPath();
    g.arc(cx - 80, cy, 18, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.font = '900 16px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#3B1247';
    g.fillText('E', cx + 80, cy - 18);
    g.fillText('N', cx + 22, cy - 84);
    g.fillText('NEXT: W', cx - 80, cy - 24);
  }
}
