// core.js — base del motor: matemáticas de movimiento, color, texto y el "arnés" de render.
// Contrato: cada cuadro es función pura del tiempo. window.seek(t) pinta el instante t; nada de
// Math.random, temporizadores ni estado entre cuadros (el render pide cuadros en paralelo y desordenados).

export const W = 1080, H = 1920, TAU = Math.PI * 2;

// Zonas de la pantalla vertical (TikTok/Reels/Shorts). La columna de botones ocupa la derecha
// desde y≈900, el pie de texto la franja inferior y la barra de pestañas la parte de arriba.
export const ZONA = {
  arriba: { x: 72, y: 250, w: 936, h: 0 },          // titulares (se mide al maquetar)
  centro: { x: 72, y: 0, w: 858, h: 0 },             // visuales
  host: { x: 72, y: 1040, w: 858, h: 300, suelo: 1335 },
  subt: { x: 90, y: 1370, w: 820, h: 110, cx: 501, base: 1440 },
  segura: { izq: 72, der: 1008, derBaja: 930, arriba: 230, abajo: 1490, yBotones: 880 },
};

// ---------------------------------------------------------------- matemáticas
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const bump = (t, c, w) => { const x = (t - c) / w; return Math.abs(x) >= 1 ? 0 : Math.cos(x * Math.PI / 2) ** 2; };
export const E = {
  lin: (x) => x,
  inQ: (x) => x * x, outQ: (x) => 1 - (1 - x) ** 2,
  inC: (x) => x ** 3, outC: (x) => 1 - (1 - x) ** 3, inOutC: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outQuint: (x) => 1 - (1 - x) ** 5, inOutS: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x, s = 1.7) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  inBack: (x, s = 1.7) => (s + 1) * x ** 3 - s * x ** 2,
  outElastic: (x) => (x === 0 || x === 1 ? x : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
};
// Muelle amortiguado en forma cerrada: 0 antes de t0, se asienta en 1 (con rebote si poco amortiguado).
export function spring(dt, { k = 170, d = 18, m = 1, v = 0 } = {}) {
  if (dt <= 0) return 0;
  const w0 = Math.sqrt(k / m), z = d / (2 * Math.sqrt(k * m));
  if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w0 * dt) * (Math.cos(wd * dt) + ((z * w0 - v) / wd) * Math.sin(wd * dt)); }
  return 1 - Math.exp(-w0 * dt) * (1 + (w0 - v) * dt);
}
export const MUELLE = {
  rapido: { k: 420, d: 30 }, rebote: { k: 280, d: 14 }, suave: { k: 120, d: 20 }, gelatina: { k: 200, d: 9 }, firme: { k: 600, d: 45 },
};
export const sp = (t, t0, cfg = MUELLE.rebote) => spring(t - t0, cfg);
export const vaiven = (dt, f = 2.2, amort = 5) => (dt < 0 ? 0 : Math.exp(-amort * dt) * Math.cos(TAU * f * dt));
// Pasos encadenados que un muelle persigue (superposición lineal: interrumpir un movimiento es físico).
export function pasos(t, keys, cfg = MUELLE.suave) {
  let v = Array.isArray(keys[0][1]) ? keys[0][1].slice() : keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = sp(t, keys[i][0], cfg);
    if (k === 0) continue;
    if (Array.isArray(v)) v = v.map((x, j) => x + (keys[i][1][j] - keys[i - 1][1][j]) * k);
    else v += (keys[i][1] - keys[i - 1][1]) * k;
  }
  return v;
}
// Interpolación por fotogramas clave con suavizado (para valores que no deben rebotar).
export function claves(t, keys, ease = E.inOutC) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b] = keys[i], p = ease((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((x, j) => lerp(x, b[j], p)) : lerp(a, b, p);
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- azar con semilla
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const h01 = (i, s = 1) => rng((i * 374761393 + s * 668265263) | 0)();
export function ruido(x, s = 1) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h01(i, s), h01(i + 1, s), u) * 2 - 1; }

// ---------------------------------------------------------------- color
export const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export const mezcla = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(...A.map((v, i) => lerp(v, B[i], clamp(t)))); };
export const alfa = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
export const luz = (h) => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
export const aclarar = (h, t) => mezcla(h, '#ffffff', t), oscurecer = (h, t) => mezcla(h, '#000000', t);

// ---------------------------------------------------------------- texto
export const fuente = (size, peso, fam) => `${Math.round(peso)} ${Math.round(size)}px "${fam}"`;
const cacheL = new Map();
// Maquetación por letra con interletraje real: la letra i está en ancho(texto[0..i]) - ancho(letra i).
export function letras(ctx, str, f) {
  const key = f + '|' + str;
  if (cacheL.has(key)) return cacheL.get(key);
  ctx.font = f;
  const cs = [...str], out = [];
  let prev = 0;
  for (let i = 0; i < cs.length; i++) {
    const w = ctx.measureText(cs.slice(0, i + 1).join('')).width;
    out.push({ ch: cs[i], x: prev, w: w - prev, cx: (prev + w) / 2 });
    prev = w;
  }
  const m = ctx.measureText(str);
  const L = { g: out, w: prev, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
  cacheL.set(key, L);
  return L;
}
export const ancho = (ctx, str, f) => letras(ctx, str, f).w;
// Mayor tamaño (≤ max) al que str cabe en maxW.
export function ajustar(ctx, str, peso, fam, maxW, max = 300, min = 20) {
  const w100 = ancho(ctx, str, fuente(100, peso, fam));
  return clamp(Math.floor((100 * maxW) / Math.max(1, w100)), min, max);
}
// Parte un texto en líneas que caben en maxW a tamaño size (respeta palabras).
export function partir(ctx, str, f, maxW) {
  const ws = str.split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (const w of ws) {
    const c = cur ? cur + ' ' + w : w;
    if (cur && ancho(ctx, c, f) > maxW) { lines.push(cur); cur = w; } else cur = c;
  }
  if (cur) lines.push(cur);
  return lines;
}
// Número con separador de miles español (100.000) y decimales con coma.
export function numero(v, dec = 0, miles = true) {
  const s = Math.abs(v).toFixed(dec).split('.');
  if (miles) s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '−' : '') + s.join(',');
}
export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');

// ---------------------------------------------------------------- dibujo
export function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
export function zoomEn(ctx, s, x, y) { ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y); }
// Contorno de "tinta" + relleno, estilo plano de dibujo animado.
export function trazo(ctx, fillC, ink, lw) { if (fillC) { ctx.fillStyle = fillC; ctx.fill(); } if (ink && lw > 0) { ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); } }
// Mancha orgánica (para transiciones y formas de fondo): círculo deformado por ruido.
export function mancha(ctx, cx, cy, r, t, seed = 1, rug = 0.12, n = 48) {
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr2 = r * (1 + rug * (Math.sin(a * 3 + seed + t * 1.3) * 0.5 + Math.sin(a * 5 - seed * 2 + t * 0.9) * 0.3 + Math.sin(a * 2 + seed * 3) * 0.2));
    const x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- revisor (lint)
// En modo lint cada elemento registra su caja; render.mjs --revisar detecta solapes y salidas de zona.
export const LINT = { on: false, cajas: [] };
export function caja(tipo, id, x, y, w, h) { if (LINT.on) LINT.cajas.push({ tipo, id, x, y, w, h }); }

// ---------------------------------------------------------------- arnés
// draw(ctx, t) pinta; post(ctx, t) va después del desenfoque (grano). muestras = sub-cuadros de desenfoque.
export function arnes({ draw, post, duracion, eventos = [], muestras = 5, obturador = 0.5 }) {
  const params = new URLSearchParams(location.search);
  const RENDER = params.get('render') === '1';
  const fps = Number(params.get('fps') || 60);
  const n = Number(params.get('muestras') || (RENDER ? muestras : 1));
  const cv = document.getElementById('lienzo');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { alpha: false });
  const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  const bctx = buf.getContext('2d', { alpha: false });
  const frame = (c, t) => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; draw(c, t); c.restore(); };
  window.seek = (t) => {
    const t0 = t + 0.5 / fps;
    if (n <= 1) frame(ctx, t0);
    else for (let k = 0; k < n; k++) { frame(bctx, t0 + (k / n) * (obturador / fps)); ctx.globalAlpha = 1 / (k + 1); ctx.drawImage(buf, 0, 0); }
    ctx.globalAlpha = 1;
    if (post) { ctx.save(); post(ctx, t0); ctx.restore(); }
  };
  window.cuadro = (t, q = 0.93) => { window.seek(t); return cv.toDataURL('image/jpeg', q); };
  window.revisar = (t) => { LINT.on = true; LINT.cajas = []; frame(ctx, t); LINT.on = false; return LINT.cajas; };
  window.DURACION = duracion;
  window.EVENTOS = eventos;
  window.listo = true;
  window.seek(Number(params.get('t') || 0));
  if (!RENDER) vista(cv, duracion);
}
function vista(cv, dur) {
  const audio = new Audio(new URLSearchParams(location.search).get('audio') || 'proyecto/audio/mezcla.wav');
  let on = false;
  const loop = () => { if (!on) return; window.seek(audio.currentTime % dur); requestAnimationFrame(loop); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); on = !on; if (on) { audio.play().catch(() => {}); loop(); } else audio.pause(); } });
  cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * dur; window.seek(audio.currentTime); });
}
