// ===== CHART DRAWING MODULE =====
import { getCat } from './utils.js';

let _fmt = (n, c) => c + Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
let _fmtShort = (n, c) => c + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});

export function setChartUtils(fmtFn, fmtShortFn) {
  _fmt = fmtFn;
  _fmtShort = fmtShortFn;
}

function setupCanvas(canvasId, height) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return null;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = height || 200;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return { canvas, ctx, w, h };
}

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getFont(size) {
  return size + 'px ' + getComputedStyle(document.body).fontFamily;
}

function drawNoData(ctx, w, h, msg) {
  ctx.fillStyle = getThemeColor('--text3');
  ctx.font = getFont(14);
  ctx.textAlign = 'center';
  ctx.fillText(msg || 'No data yet', w / 2, h / 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawPieChart(canvasId, data, total, currency) {
  const s = setupCanvas(canvasId, 260);
  if(!s) return;
  const { ctx, w, h } = s;

  if(!data.length) { drawNoData(ctx, w, h); return; }

  const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 24;
  let start = -Math.PI / 2;

  data.forEach(d => {
    const angle = (d.amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = getCat(d.category).color;
    ctx.fill();

    if(angle > 0.15) {
      const mid = start + angle / 2;
      const tx = cx + Math.cos(mid) * (r * 0.65);
      const ty = cy + Math.sin(mid) * (r * 0.65);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + getFont(11);
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(d.amount / total * 100) + '%', tx, ty);
    }
    start += angle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = getThemeColor('--bg2');
  ctx.fill();

  ctx.fillStyle = getThemeColor('--text');
  ctx.font = 'bold ' + getFont(14);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(_fmt(total, currency || '৳'), cx, cy - 8);
  ctx.font = getFont(11);
  ctx.fillStyle = getThemeColor('--text3');
  ctx.fillText('Total', cx, cy + 10);
}

export function drawBarChart(canvasId, data, labels, color, currency) {
  const s = setupCanvas(canvasId, 200);
  if(!s) return;
  const { ctx, w, h } = s;

  if(!data.length) { drawNoData(ctx, w, h); return; }

  const maxVal = Math.max(...data, 1);
  const barW = Math.min(40, (w - 60) / data.length - 8);
  const chartH = h - 50;
  const startX = 40;

  data.forEach((v, i) => {
    const x = startX + i * (barW + 8) + 4;
    const barH = (v / maxVal) * chartH;
    const y = h - 30 - barH;

    const grad = ctx.createLinearGradient(x, y, x, h - 30);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + '44');
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = getThemeColor('--text3');
    ctx.font = getFont(9);
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + barW / 2, h - 14);

    if(v > 0) {
      ctx.fillStyle = getThemeColor('--text2');
      ctx.font = getFont(9);
      ctx.fillText(_fmtShort(v, currency || '₹'), x + barW / 2, y - 6);
    }
  });
}

export function drawLineChart(canvasId, data, labels, color) {
  const s = setupCanvas(canvasId, 200);
  if(!s) return;
  const { ctx, w, h } = s;

  if(data.length < 2) { drawNoData(ctx, w, h, 'Need more data'); return; }

  const maxVal = Math.max(...data, 1);
  const chartH = h - 50;
  const startX = 40;
  const stepX = (w - 60) / (data.length - 1);
  const pts = data.map((v, i) => ({ x: startX + i * stepX, y: h - 30 - (v / maxVal) * chartH }));

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + '33');
  grad.addColorStop(1, color + '00');
  ctx.lineTo(pts[pts.length - 1].x, h - 30);
  ctx.lineTo(pts[0].x, h - 30);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  pts.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    if(i % Math.max(1, Math.floor(data.length / 7)) === 0) {
      ctx.fillStyle = getThemeColor('--text3');
      ctx.font = getFont(9);
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], p.x, h - 14);
    }
  });
}

export function drawHealthRing(canvasId, score) {
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 100;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2, cy = size / 2, r = 40, lw = 7;
  const startAngle = -Math.PI / 2;
  const pct = score / 100;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = getThemeColor('--bg4');
  ctx.lineWidth = lw;
  ctx.stroke();

  if(score > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, startAngle + pct * Math.PI * 2);
    const col = score >= 70 ? getThemeColor('--green') : score >= 50 ? getThemeColor('--yellow') : getThemeColor('--red');
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
