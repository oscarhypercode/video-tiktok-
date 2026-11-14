// iconos.js — iconos vectoriales con el mismo trazo que el presentador. Todos centrados en (0,0), radio r.
// o = { t, tinta, lw, color, nivel, parpadeo, latido, ... }. Algunos se animan solos con o.t.
import { TAU, clamp, lerp, trazo, rr, alfa, aclarar, oscurecer, mancha } from './core.js';

const brillo = (ctx, r, x = -0.38, y = -0.3) => { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(r * x, r * y, r * 0.13, r * 0.22, -0.6, 0, TAU); ctx.fill(); };
function heart(ctx, s) { ctx.beginPath(); ctx.moveTo(0, s * 0.95); ctx.bezierCurveTo(-s * 1.25, s * 0.15, -s * 0.95, -s * 0.85, 0, -s * 0.32); ctx.bezierCurveTo(s * 0.95, -s * 0.85, s * 1.25, s * 0.15, 0, s * 0.95); ctx.closePath(); }
function star(ctx, r, n = 5, k = 0.45) { ctx.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r * k : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); }

export const ICONOS = {
  corazon(ctx, r, o) { const b = 1 + 0.12 * (o.latido ?? Math.exp(-((o.t * 1.6) % 1) * 7)); ctx.scale(b, b); heart(ctx, r * 0.78); trazo(ctx, o.color || '#F2434F', o.tinta, o.lw); brillo(ctx, r * 0.8); },
  cerebro(ctx, r, o) {
    const c = o.color || '#FF9EC4';
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.36, 0, r * 0.6, r * 0.7, 0, 0, TAU); trazo(ctx, c, o.tinta, o.lw); });
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.58, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = oscurecer(c, 0.25); ctx.lineWidth = o.lw * 0.8; ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6);
    ctx.moveTo(-r * 0.7, -r * 0.15); ctx.quadraticCurveTo(-r * 0.4, -r * 0.45, -r * 0.2, -r * 0.1); ctx.moveTo(r * 0.7, r * 0.15); ctx.quadraticCurveTo(r * 0.4, r * 0.45, r * 0.2, r * 0.1); ctx.stroke();
  },
  hueso(ctx, r, o) {
    ctx.rotate(-0.6); const L = r * 0.62, k = r * 0.24;
    ctx.beginPath(); ctx.rect(-L, -k * 0.7, 2 * L, k * 1.4);
    [[-L, -k * 0.75], [-L, k * 0.75], [L, -k * 0.75], [L, k * 0.75]].forEach(([x, y]) => { ctx.moveTo(x + k, y); ctx.arc(x, y, k, 0, TAU); });
    trazo(ctx, o.color || '#FFF4DE', o.tinta, o.lw);
    ctx.fillStyle = o.color || '#FFF4DE'; ctx.fillRect(-L - k * 0.2, -k * 0.62, 2 * L + k * 0.4, k * 1.24);
  },
  ojo(ctx, r, o) {
    const p = 1 - clamp(o.parpadeo ?? Math.max(0, 1 - Math.abs(((o.t * 0.7) % 1) - 0.5) * 22)) * 0.95;
    ctx.save(); ctx.scale(1, p); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -r * 1.05, r, 0); ctx.quadraticCurveTo(0, r * 1.05, -r, 0); ctx.closePath();
    trazo(ctx, '#FFFFFF', o.tinta, o.lw); ctx.clip();
    ctx.beginPath(); ctx.arc(Math.sin(o.t * 1.3) * r * 0.15, 0, r * 0.4, 0, TAU); trazo(ctx, o.color || '#2D9CDB', o.tinta, o.lw * 0.7);
    ctx.beginPath(); ctx.arc(Math.sin(o.t * 1.3) * r * 0.15, 0, r * 0.18, 0, TAU); ctx.fillStyle = o.tinta; ctx.fill();
    ctx.beginPath(); ctx.arc(Math.sin(o.t * 1.3) * r * 0.15 - r * 0.12, -r * 0.12, r * 0.08, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  },
  gota(ctx, r, o) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.5, -r * 0.35, r * 0.8, r * 0.05, r * 0.8, r * 0.3); ctx.arc(0, r * 0.3, r * 0.8, 0, Math.PI); ctx.bezierCurveTo(-r * 0.8, r * 0.05, -r * 0.5, -r * 0.35, 0, -r); ctx.closePath(); trazo(ctx, o.color || '#3BA7FF', o.tinta, o.lw); brillo(ctx, r * 0.8, -0.3, 0.3); },
  vaso(ctx, r, o) {
    const nivel = clamp(o.nivel ?? 0.7), top = -r, bot = r, wT = r * 0.75, wB = r * 0.55;
    const path = () => { ctx.beginPath(); ctx.moveTo(-wT, top); ctx.lineTo(-wB, bot); ctx.lineTo(wB, bot); ctx.lineTo(wT, top); };
    path(); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
    ctx.save(); path(); ctx.closePath(); ctx.clip();
    const y = lerp(bot, top + r * 0.15, nivel);
    ctx.beginPath(); ctx.moveTo(-r, bot + 5);
    for (let x = -r; x <= r; x += 6) ctx.lineTo(x, y + Math.sin(x * 0.05 + o.t * 7) * r * 0.04 * (1 - nivel * 0.5));
    ctx.lineTo(r, bot + 5); ctx.closePath(); ctx.fillStyle = o.color || '#7FD3FF'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-wT * 0.7, top, r * 0.12, 2 * r); ctx.restore();
    path(); ctx.strokeStyle = o.tinta; ctx.lineWidth = o.lw; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, top, wT, r * 0.12, 0, 0, TAU); ctx.stroke();
  },
  estomago(ctx, r, o) {
    const c = o.color || '#FF8FA3';
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r); ctx.lineTo(-r * 0.25, -r * 0.55);
    ctx.bezierCurveTo(-r * 1.05, -r * 0.45, -r * 1.0, r * 0.75, -r * 0.1, r * 0.8);
    ctx.bezierCurveTo(r * 0.6, r * 0.85, r * 1.0, r * 0.35, r * 0.75, r * 0.0);
    ctx.bezierCurveTo(r * 0.55, -r * 0.3, r * 0.1, -r * 0.1, r * 0.1, -r * 0.55); ctx.lineTo(r * 0.1, -r);
    trazo(ctx, c, o.tinta, o.lw);
    ctx.strokeStyle = oscurecer(c, 0.2); ctx.lineWidth = o.lw * 0.7;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.05); ctx.quadraticCurveTo(-r * 0.2, r * 0.35, r * 0.3, r * 0.3); ctx.stroke();
    brillo(ctx, r * 0.7, -0.8, -0.1);
  },
  bebe(ctx, r, o) {
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); trazo(ctx, o.color || '#FFD7B5', o.tinta, o.lw);
    ctx.lineWidth = o.lw; ctx.strokeStyle = o.tinta; ctx.beginPath(); ctx.moveTo(-r * 0.05, -r * 0.85); ctx.bezierCurveTo(r * 0.3, -r * 1.25, r * 0.45, -r * 0.7, r * 0.12, -r * 0.72); ctx.stroke();
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * r * 0.32, -r * 0.05, r * 0.12, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,90,110,0.35)'; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.5, r * 0.22, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill(); });
    ctx.beginPath(); ctx.arc(0, r * 0.35, r * 0.17, 0, TAU); trazo(ctx, '#7FD3FF', o.tinta, o.lw * 0.8);
  },
  tierra(ctx, r, o) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, o.color || '#3BA7FF', null, 0);
    ctx.save(); ctx.clip(); ctx.fillStyle = '#5BD17A';
    const sh = (o.t * r * 0.35) % (r * 4);
    [[-0.5, -0.35, 0.42, 0.3], [0.45, 0.2, 0.35, 0.45], [-0.2, 0.55, 0.3, 0.18], [1.5, -0.3, 0.4, 0.3], [2.4, 0.3, 0.35, 0.4]].forEach(([x, y, a, b], i) => {
      const px = (((x * r - sh) % (r * 4)) + r * 6) % (r * 4) - r * 2; mancha(ctx, px, y * r, (a + b) * r * 0.5, 0, i, 0.3, 24); ctx.fill();
    });
    ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, null, o.tinta, o.lw); brillo(ctx, r);
  },
  reloj(ctx, r, o) {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, o.color || '#FFFFFF', o.tinta, o.lw);
    ctx.lineWidth = o.lw; ctx.strokeStyle = o.tinta; ctx.beginPath();
    const a1 = o.t * 6, a2 = o.t * 0.5; ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a1) * r * 0.7, -Math.cos(a1) * r * 0.7); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(a2) * r * 0.45, -Math.cos(a2) * r * 0.45); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.arc(Math.sin(a) * r * 0.82, -Math.cos(a) * r * 0.82, o.lw * 0.35, 0, TAU); ctx.fillStyle = o.tinta; ctx.fill(); }
  },
  rayo(ctx, r, o) { ctx.beginPath(); ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.02, r * 0.15); ctx.lineTo(-r * 0.25, r); ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.05, -r * 0.2); ctx.closePath(); trazo(ctx, o.color || '#FFD23F', o.tinta, o.lw); },
  estrella(ctx, r, o) { ctx.rotate(Math.sin(o.t * 2) * 0.12); star(ctx, r); trazo(ctx, o.color || '#FFD23F', o.tinta, o.lw); brillo(ctx, r * 0.6); },
  fuego(ctx, r, o) {
    const f = (k) => 1 + Math.sin(o.t * 12 + k) * 0.05;
    ctx.beginPath(); ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 0.9 * f(1), r * 0.9, -r * 0.8, -r * 0.1, -r * 0.2, -r * f(2)); ctx.bezierCurveTo(-r * 0.15, -r * 0.4, r * 0.25, -r * 0.35, r * 0.25, -r * 0.75 * f(3)); ctx.bezierCurveTo(r * 0.85, -r * 0.3, r * 0.95, r * 0.9, 0, r); ctx.closePath();
    trazo(ctx, o.color || '#FF6B35', o.tinta, o.lw);
    ctx.beginPath(); ctx.moveTo(0, r * 0.95); ctx.bezierCurveTo(-r * 0.45, r * 0.85, -r * 0.4, r * 0.25, 0, r * 0.05 * f(4)); ctx.bezierCurveTo(r * 0.4, r * 0.3, r * 0.45, r * 0.85, 0, r * 0.95); ctx.fillStyle = '#FFD23F'; ctx.fill();
  },
  moneda(ctx, r, o) { ctx.scale(Math.cos(o.t * 2.5) * 0.25 + 0.75, 1); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, o.color || '#FFC53D', o.tinta, o.lw); ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); trazo(ctx, null, alfa('#000000', 0.25), o.lw * 0.6); ctx.fillStyle = o.tinta; ctx.font = `900 ${r * 1.05}px "Rubik"`; ctx.textAlign = 'center'; ctx.fillText(o.txt || '$', 0, r * 0.37); },
  bombilla(ctx, r, o) {
    const g = 0.5 + 0.5 * Math.sin(o.t * 5);
    ctx.save(); ctx.globalAlpha = 0.25 + 0.2 * g; ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = o.lw; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.05, -r * 0.15 + Math.sin(a) * r * 1.05); ctx.lineTo(Math.cos(a) * r * 1.3, -r * 0.15 + Math.sin(a) * r * 1.3); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.72, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(r * 0.3, r * 0.6); ctx.lineTo(-r * 0.3, r * 0.6); ctx.closePath(); trazo(ctx, o.color || '#FFE066', o.tinta, o.lw);
    rr(ctx, -r * 0.32, r * 0.6, r * 0.64, r * 0.35, r * 0.08); trazo(ctx, '#B8C2D9', o.tinta, o.lw); brillo(ctx, r * 0.7, -0.4, -0.5);
  },
  check(ctx, r, o) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, o.color || '#20C878', o.tinta, o.lw); ctx.beginPath(); ctx.moveTo(-r * 0.45, 0); ctx.lineTo(-r * 0.1, r * 0.35); ctx.lineTo(r * 0.5, -r * 0.35); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); },
  cruz(ctx, r, o) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); trazo(ctx, o.color || '#FF4757', o.tinta, o.lw); ctx.beginPath(); ctx.moveTo(-r * 0.38, -r * 0.38); ctx.lineTo(r * 0.38, r * 0.38); ctx.moveTo(r * 0.38, -r * 0.38); ctx.lineTo(-r * 0.38, r * 0.38); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.2; ctx.lineCap = 'round'; ctx.stroke(); },
  comentario(ctx, r, o) {
    rr(ctx, -r, -r * 0.75, r * 2, r * 1.3, r * 0.4); ctx.moveTo(-r * 0.4, r * 0.55); ctx.lineTo(-r * 0.7, r * 0.95); ctx.lineTo(-r * 0.05, r * 0.55);
    trazo(ctx, o.color || '#FFFFFF', o.tinta, o.lw);
    for (let i = -1; i <= 1; i++) { const b = Math.max(0, Math.sin(o.t * 6 - i * 0.9)); ctx.beginPath(); ctx.arc(i * r * 0.45, -r * 0.1 - b * r * 0.12, r * 0.13, 0, TAU); ctx.fillStyle = o.tinta; ctx.fill(); }
  },
  mano(ctx, r, o) {
    ctx.rotate(-0.35);
    rr(ctx, -r * 0.18, -r, r * 0.36, r * 1.1, r * 0.18); trazo(ctx, o.color || '#FFFFFF', o.tinta, o.lw);
    rr(ctx, -r * 0.55, -r * 0.1, r * 1.1, r * 0.95, r * 0.3); trazo(ctx, o.color || '#FFFFFF', o.tinta, o.lw);
    ctx.fillStyle = o.color || '#FFFFFF'; ctx.fillRect(-r * 0.13, -r * 0.2, r * 0.26, r * 0.25);
  },
  libro(ctx, r, o) { rr(ctx, -r, -r * 0.75, r * 2, r * 1.5, r * 0.12); trazo(ctx, o.color || '#B23A2B', o.tinta, o.lw); rr(ctx, -r * 0.82, -r * 0.6, r * 1.64, r * 1.2, r * 0.06); trazo(ctx, '#FFF8E7', o.tinta, o.lw * 0.6); ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6); ctx.stroke(); },
  cohete(ctx, r, o) {
    ctx.rotate(0.5); const fl = 1 + Math.sin(o.t * 30) * 0.15;
    ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.6); ctx.lineTo(0, r * (0.6 + 0.5 * fl)); ctx.lineTo(r * 0.2, r * 0.6); trazo(ctx, '#FFB14E', o.tinta, o.lw * 0.7);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.bezierCurveTo(r * 0.5, -r * 0.6, r * 0.38, r * 0.3, r * 0.3, r * 0.6); ctx.lineTo(-r * 0.3, r * 0.6); ctx.bezierCurveTo(-r * 0.38, r * 0.3, -r * 0.5, -r * 0.6, 0, -r); trazo(ctx, o.color || '#F0F3FF', o.tinta, o.lw);
    ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.17, 0, TAU); trazo(ctx, '#3BA7FF', o.tinta, o.lw * 0.7);
  },
  trofeo(ctx, r, o) { ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.8); ctx.lineTo(r * 0.6, -r * 0.8); ctx.bezierCurveTo(r * 0.6, r * 0.1, r * 0.2, r * 0.2, 0, r * 0.25); ctx.bezierCurveTo(-r * 0.2, r * 0.2, -r * 0.6, r * 0.1, -r * 0.6, -r * 0.8); trazo(ctx, o.color || '#FFC53D', o.tinta, o.lw); rr(ctx, -r * 0.45, r * 0.55, r * 0.9, r * 0.35, r * 0.08); trazo(ctx, '#B8873A', o.tinta, o.lw); ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(0, r * 0.55); ctx.stroke(); brillo(ctx, r * 0.6, -0.5, -0.9); },
  lupa(ctx, r, o) { ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.3); ctx.lineTo(r * 0.9, r * 0.9); ctx.strokeStyle = o.tinta; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.stroke(); ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.15, r * 0.6, 0, TAU); trazo(ctx, 'rgba(160,220,255,0.6)', o.tinta, o.lw); brillo(ctx, r * 0.5, -0.8, -0.8); },
  alerta(ctx, r, o) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r * 0.8); ctx.lineTo(-r, r * 0.8); ctx.closePath(); trazo(ctx, o.color || '#FFC53D', o.tinta, o.lw); ctx.fillStyle = o.tinta; rr(ctx, -r * 0.08, -r * 0.4, r * 0.16, r * 0.7, r * 0.08); ctx.fill(); ctx.beginPath(); ctx.arc(0, r * 0.52, r * 0.1, 0, TAU); ctx.fill(); },
  calendario(ctx, r, o) { rr(ctx, -r, -r * 0.8, r * 2, r * 1.7, r * 0.18); trazo(ctx, '#FFFFFF', o.tinta, o.lw); ctx.save(); rr(ctx, -r, -r * 0.8, r * 2, r * 0.5, r * 0.18); ctx.clip(); ctx.fillStyle = o.color || '#FF4757'; ctx.fillRect(-r, -r, r * 2, r * 0.7); ctx.restore(); ctx.fillStyle = o.tinta; ctx.font = `800 ${r * 0.85}px "Rubik"`; ctx.textAlign = 'center'; ctx.fillText(o.txt || '7', 0, r * 0.65); },
  ciclo(ctx, r, o) { ctx.rotate(o.t * 3); ctx.strokeStyle = o.color || '#1FB8A6'; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(0, 0, r * 0.7, k * Math.PI + 0.3, k * Math.PI + Math.PI - 0.3); ctx.stroke(); const a = k * Math.PI + Math.PI - 0.3; ctx.save(); ctx.translate(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.05); ctx.lineTo(0, r * 0.25); ctx.lineTo(r * 0.25, -r * 0.05); ctx.fillStyle = o.color || '#1FB8A6'; ctx.fill(); ctx.restore(); } },
  grafico(ctx, r, o) { rr(ctx, -r, -r, r * 2, r * 2, r * 0.25); trazo(ctx, '#FFFFFF', o.tinta, o.lw); [0.35, 0.6, 0.95].forEach((h, i) => { const g = clamp(o.t * 1.5 - i * 0.2); rr(ctx, -r * 0.65 + i * r * 0.48, r * 0.7 - h * r * 1.3 * g, r * 0.32, h * r * 1.3 * g, r * 0.06); trazo(ctx, o.color || '#12A150', o.tinta, o.lw * 0.6); }); },
  planeta(ctx, r, o) { ctx.save(); ctx.rotate(-0.3); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.32, 0, Math.PI, TAU); ctx.strokeStyle = o.tinta; ctx.lineWidth = r * 0.2; ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, TAU); trazo(ctx, o.color || '#FFB14E', o.tinta, o.lw); ctx.save(); ctx.rotate(-0.3); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.32, 0, 0, Math.PI); ctx.strokeStyle = o.tinta; ctx.lineWidth = r * 0.2; ctx.stroke(); ctx.restore(); },
  sol(ctx, r, o) { ctx.rotate(o.t * 0.5); for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); ctx.beginPath(); ctx.moveTo(r * 0.7, -r * 0.12); ctx.lineTo(r, 0); ctx.lineTo(r * 0.7, r * 0.12); trazo(ctx, '#FFB14E', o.tinta, o.lw * 0.6); } ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); trazo(ctx, o.color || '#FFD23F', o.tinta, o.lw); },
  dinero(ctx, r, o) { ctx.rotate(-0.15); rr(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.12); trazo(ctx, o.color || '#7BD389', o.tinta, o.lw); ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, TAU); trazo(ctx, aclarar(o.color || '#7BD389', 0.4), o.tinta, o.lw * 0.6); ctx.fillStyle = o.tinta; ctx.font = `900 ${r * 0.45}px "Rubik"`; ctx.textAlign = 'center'; ctx.fillText('$', 0, r * 0.16); },
};
export function icono(ctx, nombre, x, y, r, k, o) {
  if (k <= 0.001 || !ICONOS[nombre]) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ICONOS[nombre](ctx, r, { lw: Math.max(5, r * 0.09), ...o });
  ctx.restore();
}
