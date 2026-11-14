// estilo.js — motor del estilo "datos curiosos" (pulpo): mascota dibujada en código, texto con muelle,
// golpes de cámara, olas/tinta, fichas, monitor, contadores y todo sincronizado palabra a palabra con la voz.
//
// Uso (film.js):   import { video } from './lib/estilo.js';  await video({ mascota, escenas });
// Lee words.json (tiempos reales de cada palabra), vo_env.json (boca) y beats.json (rejilla de la música).
// Todo es función pura del tiempo: window.seek(t) pinta el cuadro t (contrato de lib/motion.js).
import * as M from './motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, spring, SPRING, wobble, bump, font, layout, fitSize, glyph, fill, hash01, zoomAbout, TAU } = M;
export const S = FORMAT.safe;
export const DISPLAY = 'Display', UI = 'UI';
const sp = (t, t0, cfg = SPRING.bouncy) => spring(t - t0, cfg);

// ---------------------------------------------------------------- paleta base (se puede sobrescribir)
export const PALETA = {
  papel: '#FFF1E2', tinta: '#1C1A33', blanco: '#FFFFFF', mar: '#2F5BFF', marOscuro: '#1E3FCC', alga: '#2447D9',
  coral: '#FF7A6B', coralOscuro: '#E85A4E', vientre: '#FFB4A3', corazon: '#D9304A', gris: '#8D96C9',
  alerta: '#FF4D6D', arena: '#F6C978', arenaOscura: '#E3AE58', nube: '#14122A', cobre: '#E08A3C',
  hierro: '#C73B3B', cerebro: '#FF9EC4', cerebroOscuro: '#E46A9C', oro: '#FFD23F', sudor: '#9FD8FF',
};
export const ARCOIRIS = [['#FF7A6B', '#E85A4E'], ['#3DDC84', '#26A862'], ['#A066FF', '#7C46D9'], ['#FFD23F', '#E0B21F'], ['#B7864F', '#8E6235'], ['#FF5FA8', '#D9408A']];
const P = PALETA;

const lum = (hex) => { const [r, g, b] = M.hexRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const tintaSobre = (bg) => (lum(bg) < 0.55 ? P.blanco : P.tinta);

// ---------------------------------------------------------------- texto
// Una línea: letras que saltan con muelle en tIn (escalonadas) y salen disparadas hacia arriba en tOut.
export function line(ctx, str, x, base, f, color, tIn, tOut, t, { stagger = 0.018, cfg = SPRING.bouncy, rise = 1.1, wob = 0, colorAt = null } = {}) {
  const L = layout(ctx, str, f, 0);
  const size = parseInt(f.split(' ')[1], 10);
  L.glyphs.forEach((g, j) => {
    const k = sp(t, tIn + j * stagger, cfg);
    if (k <= 0.001) return;
    const out = tOut == null ? 0 : E.inBack(prog(t, tOut + j * 0.008, tOut + 0.16 + j * 0.008), 1.6);
    if (out >= 1) return;
    const w = wob ? wob * wobble((t - tIn - j * stagger) * 2, 1.4, 3) : 0;
    const y = base + (1 - k) * size * rise - out * (size * 2.2);
    glyph(ctx, g.ch, x + g.cx, y, f, colorAt ? colorAt(j) : color, 1 + w, 1 - w, (1 - k) * 0.25 * (j % 2 ? 1 : -1));
  });
  return L;
}
export function bar(ctx, x, y, w, h, color, tIn, tOut, t) {
  const p = E.outCubic(prog(t, tIn, tIn + 0.2));
  const q = tOut == null ? 0 : E.inCubic(prog(t, tOut, tOut + 0.15));
  if (p <= 0 || q >= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
  ctx.fillStyle = color; ctx.fillRect(w * q, 0, w * (p - q), h);
  ctx.restore();
}
export function arrow(ctx, x, y, len, a, color) {
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = len * a;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x + L - 30 * a, y - 30 * a); ctx.lineTo(x + L, y); ctx.lineTo(x + L - 30 * a, y + 30 * a);
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------- iconos (dentro de la ventana, en los brazos, sueltos)
function heartPath(ctx, s) {
  ctx.beginPath(); ctx.moveTo(0, s * 0.95);
  ctx.bezierCurveTo(-s * 1.25, s * 0.15, -s * 0.95, -s * 0.85, 0, -s * 0.32);
  ctx.bezierCurveTo(s * 0.95, -s * 0.85, s * 1.25, s * 0.15, 0, s * 0.95); ctx.closePath();
}
function starPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath();
}
// tipo: corazon | cerebro | moneda | estrella | rayo | gota | ojo | circulo  (r = radio aprox.)
export function icono(ctx, tipo, x, y, r, k, color, txt) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = P.tinta; ctx.lineWidth = Math.max(5, r * 0.12);
  const brillo = () => { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.14, r * 0.24, -0.6, 0, TAU); ctx.fill(); };
  if (tipo === 'corazon') { heartPath(ctx, r * 0.75); ctx.fillStyle = color || P.corazon; ctx.fill(); ctx.stroke(); brillo(); }
  else if (tipo === 'cerebro') {
    ctx.fillStyle = color || P.cerebro;
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.38, 0, r * 0.62, r * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.cerebroOscuro; ctx.lineWidth = Math.max(3, r * 0.1);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6);
    ctx.moveTo(-r * 0.7, -r * 0.15); ctx.quadraticCurveTo(-r * 0.4, -r * 0.45, -r * 0.2, -r * 0.1);
    ctx.moveTo(r * 0.7, r * 0.15); ctx.quadraticCurveTo(r * 0.4, r * 0.45, r * 0.2, r * 0.1); ctx.stroke();
  } else if (tipo === 'moneda') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = color || P.oro; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, TAU); ctx.lineWidth = Math.max(3, r * 0.07); ctx.stroke();
    ctx.fillStyle = P.tinta; ctx.font = font(r * 1.05, 900, DISPLAY); ctx.textAlign = 'center'; ctx.fillText(txt || '$', 0, r * 0.37);
  } else if (tipo === 'estrella') { starPath(ctx, r); ctx.fillStyle = color || P.oro; ctx.fill(); ctx.stroke(); }
  else if (tipo === 'rayo') {
    ctx.beginPath(); ctx.moveTo(r * 0.2, -r); ctx.lineTo(-r * 0.55, r * 0.15); ctx.lineTo(-r * 0.02, r * 0.15); ctx.lineTo(-r * 0.25, r);
    ctx.lineTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 0.05, -r * 0.2); ctx.closePath(); ctx.fillStyle = color || P.oro; ctx.fill(); ctx.stroke();
  } else if (tipo === 'gota') {
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.9, r * 0.1, 0, r * 0.8); ctx.quadraticCurveTo(-r * 0.9, r * 0.1, 0, -r);
    ctx.fillStyle = color || P.mar; ctx.fill(); ctx.stroke(); brillo();
  } else if (tipo === 'ojo') {
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.62, 0, 0, TAU); ctx.fillStyle = P.blanco; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, TAU); ctx.fillStyle = color || P.tinta; ctx.fill();
  } else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = color || P.coral; ctx.fill(); ctx.stroke(); if (txt) { ctx.fillStyle = P.blanco; ctx.font = font(r * 0.9, 900, DISPLAY); ctx.textAlign = 'center'; ctx.fillText(txt, 0, r * 0.32); } }
  ctx.restore();
}

// ---------------------------------------------------------------- mascota
// forma: gota (pulpo) | circulo (planeta, moneda, pelota) | caja (teléfono, libro, edificio)
// extremidades: tentaculos | brazos | ninguna.   Coordenadas locales: y=0 es la base, cuerpo hacia arriba.
const GEO = {
  gota: { top: -490, ey: -50, ex: 82, my: 2, cy: -8, cx: 150, win: [0, -240, 199, 145], half: 255, sweatY: -260,
    brazos: [[-215, -130, Math.PI - 0.5], [215, -130, 0.5], [-75, 20, Math.PI / 2 + 0.12], [75, 20, Math.PI / 2 - 0.12]] },
  circulo: { top: -480, ey: -170, ex: 88, my: -108, cy: -122, cx: 150, win: [0, -335, 150, 85], half: 250, sweatY: -330,
    brazos: [[-238, -200, Math.PI - 0.45], [238, -200, 0.45], [-85, 12, Math.PI / 2 + 0.12], [85, 12, Math.PI / 2 - 0.12]] },
  anillo: { top: -480, ey: -285, ex: 84, my: -222, cy: -232, cx: 150, win: [0, -405, 135, 52], half: 250, sweatY: -400, ringY: -105,
    brazos: [[-238, -200, Math.PI - 0.45], [238, -200, 0.45], [-85, 12, Math.PI / 2 + 0.12], [85, 12, Math.PI / 2 - 0.12]] },
  caja: { top: -470, ey: -160, ex: 85, my: -95, cy: -110, cx: 140, win: [0, -335, 150, 90], half: 230, sweatY: -330,
    brazos: [[-228, -230, Math.PI - 0.45], [228, -230, 0.45], [-90, 12, Math.PI / 2 + 0.1], [90, 12, Math.PI / 2 - 0.1]] },
};
function bodyPath(ctx, forma, t) {
  const b = 1 + Math.sin(t * 4.8) * 0.02;
  ctx.beginPath();
  if (forma === 'circulo') ctx.arc(0, -230, 250 * b, 0, TAU);
  else if (forma === 'caja') ctx.roundRect(-230 * b, -470, 460 * b, 480, 80);
  else {
    const mw = 255, mh = 290, my = -200;
    ctx.ellipse(0, my, mw * b, mh / b, 0, Math.PI * 0.92, Math.PI * 2.08);
    ctx.bezierCurveTo(mw * 0.9, my + mh * 0.75, mw * 0.55, 30, 0, 30);
    ctx.bezierCurveTo(-mw * 0.55, 30, -mw * 0.9, my + mh * 0.75, -mw * Math.cos(Math.PI * 0.08), my + mh * Math.sin(Math.PI * 0.08));
    ctx.closePath();
  }
}
function tentacle(ctx, bx, by, ang, len, w0, t, phase, curl, color, freq = 3.1, suckers = true) {
  const n = 22, pts = [];
  let x = bx, y = by, a = ang;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    pts.push([x, y, w0 * Math.pow(1 - s, 0.85) + 4]);
    a += (Math.sin(t * freq + phase + s * 4.2) * 0.09 + curl * s * 0.11);
    x += Math.cos(a) * len / n; y += Math.sin(a) * len / n;
  }
  const L = [], R = [];
  for (let i = 0; i <= n; i++) {
    const p = pts[i], q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy) || 1;
    L.push([p[0] - dy / d * p[2], p[1] + dx / d * p[2]]); R.push([p[0] + dy / d * p[2], p[1] - dx / d * p[2]]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  const tip = pts[n]; ctx.arc(tip[0], tip[1], tip[2], 0, Math.PI);
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.stroke();
  if (suckers) {
    ctx.fillStyle = P.vientre;
    for (let i = 4; i < n - 2; i += 3) { const p = pts[i]; ctx.beginPath(); ctx.arc(lerp(p[0], R[i][0], 0.55), lerp(p[1], R[i][1], 0.55), p[2] * 0.32, 0, TAU); ctx.fill(); }
  } else { // mano redonda
    ctx.beginPath(); ctx.arc(tip[0], tip[1], w0 * 0.55, 0, TAU); ctx.fillStyle = color; ctx.fill(); ctx.stroke();
  }
  return pts[Math.round(n * 0.62)];
}
function limbs(ctx, o, geo, body, dark) {
  const t = o.t, mids = [], sw = o.swim || 0, wk = o.walk || 0, spr = o.spread || 0;
  const freq = lerp(3.1, 9, sw);
  if (o.extremidades === 'ninguna') return mids;
  if (o.extremidades === 'brazos') {
    geo.brazos.forEach(([x, y, a0], i) => {
      const leg = i >= 2, side = x < 0 ? -1 : 1;
      let ang = a0, curl = leg ? 0 : side * -0.6, len = leg ? 170 : 210;
      if (spr && !leg) ang = lerp(ang, side > 0 ? -0.2 : Math.PI + 0.2, spr);
      if (sw) { ang = lerp(ang, Math.PI / 2 - side * 0.25, sw); curl = lerp(curl, 0, sw); }
      if (wk) ang += Math.sin(o.walkPhase + (leg ? 0 : Math.PI) + (side > 0 ? Math.PI : 0)) * (leg ? 0.45 : 0.3) * wk;
      if (!leg && side > 0 && o.wave) { ang = lerp(ang, -1.1 + Math.sin(t * 10) * 0.35, o.wave); curl = lerp(curl, -0.3, o.wave); }
      mids.push(tentacle(ctx, x, y, ang, len, leg ? 36 : 30, t, i * 2.1, curl, leg ? dark : body, freq * 0.6, false));
    });
    return mids;
  }
  // tentáculos (8): 4 detrás oscuros, 4 delante
  const by = o.forma === 'gota' ? 0 : 10;
  for (let pass = 0; pass < 2; pass++) {
    const front = pass === 1;
    for (let i = 0; i < 4; i++) {
      const k = i - 1.5;
      let ang = Math.PI / 2 - k * (front ? 0.85 : 0.55), curl = (i < 2 ? 1 : -1) * (front ? 1.5 : 1.2), len = front ? 360 : 330;
      if (spr) { ang = lerp(ang, Math.PI / 2 - k * (front ? 1.25 : 0.95), spr); curl *= 1 - 0.6 * spr; }
      if (sw) { ang = lerp(ang, Math.PI / 2 - k * 0.12, sw); curl = lerp(curl, 0, sw); len = lerp(len, 430, sw); }
      if (wk) ang += Math.sin(o.walkPhase + i * Math.PI / 2 + (front ? 0 : 1)) * 0.38 * wk;
      if (front && i === 0 && o.wave) { ang = lerp(ang, -0.55, o.wave); curl = lerp(curl, -1.8 + Math.sin(t * 9) * 1.4, o.wave); }
      mids.push(tentacle(ctx, k * (front ? 95 : 70), by + (front ? -10 : -40), ang, len, front ? 44 : 34, t, i * (front ? 2.3 : 1.7) + (front ? 0 : 3), curl, front ? body : dark, freq));
    }
  }
  return mids;
}
function ringHalf(ctx, front, color, y) {
  ctx.save(); ctx.translate(0, y); ctx.rotate(-0.16);
  ctx.beginPath(); ctx.ellipse(0, 0, 390, 88, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
  ctx.lineWidth = 58; ctx.strokeStyle = P.tinta; ctx.stroke(); ctx.lineWidth = 40; ctx.strokeStyle = color; ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(28,26,51,0.35)'; ctx.stroke();
  ctx.restore();
}
export function mascota(ctx, o) {
  const geo = o.forma === 'circulo' && o.anillo ? GEO.anillo : (GEO[o.forma] || GEO.gota);
  ctx.save(); ctx.translate(o.x, o.y); if (o.rot) ctx.rotate(o.rot);
  const q = o.squash || 0; ctx.scale(o.s * (1 + q), o.s * (1 - q));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = P.tinta; ctx.lineWidth = 9;
  const [body, dark] = o.colors;
  if (o.anillo) ringHalf(ctx, false, o.anillo, geo.ringY ?? -230);
  const mids = limbs(ctx, o, geo, body, dark);
  ctx.strokeStyle = P.tinta; ctx.lineWidth = 9;
  bodyPath(ctx, o.forma, o.t); ctx.fillStyle = body; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-geo.half * 0.42, geo.top + 140, 60, 95, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = dark;
  [[0.5, 0.3, 18], [0.66, 0.55, 12], [0.38, 0.5, 10]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(geo.half * a, geo.top + (geo.ey - geo.top) * b, r, 0, TAU); ctx.fill(); });
  const [wx, wy, wrx, wry] = geo.win, xr = o.ventana || 0;
  if (xr > 0) {
    ctx.globalAlpha = clamp(xr); ctx.fillStyle = o.vientre || P.vientre;
    const e = E.outBack(clamp(xr));
    ctx.beginPath(); ctx.ellipse(wx, wy, wrx * e, wry * e, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.stroke();
  if (o.anillo) ringHalf(ctx, true, o.anillo, geo.ringY ?? -230);
  // iconos de la ventana
  if (xr > 0 && o.iconos) {
    const n = o.iconos.length;
    o.iconos.forEach((ic, i) => {
      let px, py, r;
      if (n === 3) { [px, py, r] = [[-wrx * 0.63, wy - wry * 0.2, wry * 0.36], [wrx * 0.63, wy - wry * 0.2, wry * 0.36], [0, wy + wry * 0.2, wry * 0.5]][i]; }
      else { px = wx + (n === 1 ? 0 : lerp(-wrx * 0.6, wrx * 0.6, i / (n - 1))); py = wy; r = n === 1 ? wry * 0.6 : Math.min(wry * 0.5, wrx * 1.2 / n); }
      const k = ic.k * clamp(xr);
      if (k <= 0.001) return;
      const pulse = ic.parado ? 0 : (o.pulso || 0), hl = ic.hl || 0;
      if (hl > 0) { ctx.save(); ctx.globalAlpha = 0.3 * hl; ctx.fillStyle = P.blanco; ctx.beginPath(); ctx.arc(px, py, r * 1.7 * (1 + 0.15 * pulse), 0, TAU); ctx.fill(); ctx.restore(); }
      const col = ic.parado ? M.mix(ic.color, P.gris, ic.parado) : ic.color;
      icono(ctx, ic.tipo, px, py, r, k * (1 + 0.16 * pulse) * (1 + 0.15 * hl), col, ic.txt);
    });
  }
  // iconos en las extremidades (y uno en la cabeza)
  if (o.enBrazos) {
    icono(ctx, o.enBrazos.tipo, 0, geo.top + 130, 100, o.enBrazos.k[0], o.enBrazos.color);
    mids.forEach((p, i) => icono(ctx, o.enBrazos.tipo, p[0], p[1], 56, o.enBrazos.k[i + 1] || 0, o.enBrazos.color));
  }
  // cara
  const blink = o.blink || 0, shock = o.shock || 0, big = o.bigEye || 0;
  [-1, 1].forEach((side) => {
    const shut = side === 1 ? Math.max(blink, o.wink || 0) : blink;
    const g = 1 + 0.15 * shock + (side === 1 ? 0.9 * big : 0);
    ctx.save(); ctx.translate(side * geo.ex + (side === 1 ? 20 * big : 0), geo.ey - (side === 1 ? 20 * big : 0)); ctx.scale(g, Math.max(0.08, 1 - shut) * g);
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 54, 0, 0, TAU); ctx.fillStyle = P.blanco; ctx.fill(); ctx.lineWidth = 8 / g; ctx.stroke();
    const [lx, ly] = o.look || [0, 0], pr = lerp(24, 12, shock);
    ctx.beginPath(); ctx.arc(lx * 16, ly * 18 + 6, pr, 0, TAU); ctx.fillStyle = P.tinta; ctx.fill();
    ctx.beginPath(); ctx.arc(lx * 16 - pr * 0.33, ly * 18 + 6 - pr * 0.42, pr * 0.33, 0, TAU); ctx.fillStyle = P.blanco; ctx.fill();
    ctx.restore();
  });
  if (o.gafas > 0.01) {
    ctx.save(); ctx.translate(0, geo.ey - (1 - o.gafas) * 600); ctx.lineWidth = 12; ctx.strokeStyle = P.tinta;
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * geo.ex, 0, 66, 0, TAU); ctx.fillStyle = 'rgba(160,220,255,0.25)'; ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-geo.ex + 66, -6); ctx.quadraticCurveTo(0, -30, geo.ex - 66, -6); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = 'rgba(217,48,74,0.35)';
  [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * geo.cx, geo.cy, 30, 18, 0, 0, TAU); ctx.fill(); });
  ctx.beginPath(); ctx.lineWidth = 8; ctx.strokeStyle = P.tinta;
  const open = o.mouth || 0, my = geo.my;
  if (shock > 0.5) { ctx.ellipse(0, my + 16, 14 + open * 6, 18 + open * 14, 0, 0, TAU); ctx.fillStyle = P.tinta; ctx.fill(); }
  else {
    ctx.moveTo(-34 - open * 8, my); ctx.quadraticCurveTo(0, my + 28 + open * 60, 34 + open * 8, my);
    if (open > 0.05) { ctx.closePath(); ctx.fillStyle = P.tinta; ctx.fill(); }
    ctx.stroke();
  }
  if (o.sweat > 0) {
    [[-1, 0], [1, 0.4]].forEach(([side, d]) => {
      const p = ((o.t * 2.2 + d) % 1);
      ctx.save(); ctx.globalAlpha = o.sweat * (1 - p); ctx.translate(side * geo.half * 0.95, geo.sweatY + p * 140); ctx.scale(o.sweat, o.sweat);
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.quadraticCurveTo(22, 0, 0, 14); ctx.quadraticCurveTo(-22, 0, 0, -34);
      ctx.fillStyle = P.sudor; ctx.fill(); ctx.lineWidth = 6; ctx.stroke(); ctx.restore();
    });
  }
  if (o.birrete != null) {
    const cap = o.birrete;
    ctx.save(); ctx.translate(0, geo.top - 10 - (1 - cap) * 900); ctx.rotate(-0.12 + 0.1 * (1 - clamp(cap)));
    ctx.lineWidth = 8; ctx.strokeStyle = P.tinta; ctx.fillStyle = P.tinta;
    ctx.beginPath(); ctx.rect(-95, -10, 190, 70); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-210, -20); ctx.lineTo(0, -95); ctx.lineTo(210, -20); ctx.lineTo(0, 55); ctx.closePath(); ctx.fill(); ctx.stroke();
    const sx = Math.sin(o.t * 6) * 14;
    ctx.strokeStyle = P.oro; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(160, 0); ctx.lineTo(170 + sx, 110); ctx.stroke();
    ctx.fillStyle = P.oro; ctx.beginPath(); ctx.arc(170 + sx, 120, 16, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- fondos y decorados
function ola(ctx, t, t0, t1, color) {
  const p = E.inOutCubic(prog(t, t0, t1));
  if (p <= 0) return;
  const top = lerp(H + 80, -140, p);
  ctx.beginPath(); ctx.moveTo(-80, H + 80);
  for (let x = -80; x <= W + 80; x += 20) ctx.lineTo(x, top + Math.sin(x * 0.012 + t * 8) * 30 + Math.sin(x * 0.031 - t * 5) * 12);
  ctx.lineTo(W + 80, H + 80); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
function algas(ctx, t, a, color) {
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round';
  [[60, 520, 34], [190, 380, 26], [880, 600, 36], [1010, 420, 28], [760, 300, 22]].forEach(([x0, h, w], i) => {
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, H + 20);
    for (let k = 1; k <= 12; k++) { const s = k / 12; ctx.lineTo(x0 + Math.sin(t * 2.2 + i * 1.3 + s * 3) * 40 * s, H + 20 - h * a * s); }
    ctx.stroke();
  });
  ctx.restore();
}
function burbujas(ctx, t, a, color = P.blanco) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = color; ctx.lineWidth = 5;
  for (let i = 0; i < 24; i++) {
    const sx = hash01(i, 7) * W, spd = 160 + hash01(i, 9) * 260, r = 8 + hash01(i, 11) * 22;
    const y = H + 60 - ((t * spd + hash01(i, 13) * H * 1.4) % (H * 1.4));
    ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + i) * 18, y, r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
function estrellas(ctx, t, a) {
  if (a <= 0) return;
  ctx.save();
  for (let i = 0; i < 40; i++) {
    const x = hash01(i, 51) * W, y = hash01(i, 53) * H, r = 4 + hash01(i, 55) * 9;
    const tw = 0.5 + 0.5 * Math.sin(t * (2 + hash01(i, 57) * 4) + i);
    ctx.globalAlpha = a * (0.35 + 0.65 * tw); ctx.fillStyle = P.blanco;
    ctx.save(); ctx.translate(x, y - (t * 20 * hash01(i, 59)) % 60); starPath(ctx, r); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}
function suelo(ctx, p, color, oscuro) {
  if (p <= 0.001) return;
  const top = lerp(H + 40, 1640, p);
  ctx.beginPath(); ctx.moveTo(-80, H + 80);
  for (let x = -80; x <= W + 80; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.008) * 18);
  ctx.lineTo(W + 80, H + 80); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = P.tinta; ctx.lineWidth = 8; ctx.stroke();
  ctx.fillStyle = oscuro;
  for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(hash01(i, 21) * W, top + 50 + hash01(i, 23) * 220, 6 + hash01(i, 25) * 8, 0, TAU); ctx.fill(); }
}
function lineasVelocidad(ctx, x, y, vx, vy, amt) {
  if (amt <= 0.01) return;
  const v = Math.hypot(vx, vy); if (v < 1) return;
  const dx = vx / v, dy = vy / v, nx = -dy, ny = dx;
  ctx.save(); ctx.strokeStyle = P.blanco; ctx.lineCap = 'round'; ctx.lineWidth = 10; ctx.globalAlpha = 0.7 * amt;
  for (let i = 0; i < 7; i++) {
    const off = (hash01(i, 31) - 0.5) * 380, back = 250 + hash01(i, 33) * 170, len = clamp(v / 1500) * (140 + hash01(i, 35) * 160);
    const sx = x - dx * back + nx * off, sy = y - dy * back + ny * off;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx * len, sy - dy * len); ctx.stroke();
  }
  ctx.restore();
}
function monitor(ctx, t, t0, tFlat, t1, y, color) {
  const a = E.outCubic(prog(t, t0, t0 + 0.25)) * (1 - E.inCubic(prog(t, t1, t1 + 0.2)));
  if (a <= 0) return;
  const x0 = S.x, x1 = W - S.x, win = 1.6, per = 0.32;
  const val = (tt) => {
    if (tt < t0 || (tFlat != null && tt >= tFlat)) return 0;
    const f = ((tt - t0) / per) % 1;
    return f < 0.06 ? -0.35 * Math.sin(f / 0.06 * Math.PI) : f < 0.16 ? Math.sin((f - 0.06) / 0.1 * Math.PI) : f < 0.24 ? -0.4 * Math.sin((f - 0.16) / 0.08 * Math.PI) : 0;
  };
  const flat = tFlat != null && t >= tFlat;
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const head = lerp(x0, x1, a);
  const path = () => { ctx.beginPath(); for (let x = x0; x <= head; x += 4) { const yy = y - val(t - ((x1 - x) / (x1 - x0)) * win) * 140; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } };
  path(); ctx.strokeStyle = P.tinta; ctx.lineWidth = 24; ctx.stroke();
  path(); ctx.strokeStyle = flat ? P.alerta : color; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.arc(head, y - val(t) * 140, 16, 0, TAU); ctx.fillStyle = flat ? P.alerta : color; ctx.fill();
  ctx.restore();
}
function nubeTinta(ctx, t, t0, ox, oy, color) {
  if (t < t0 || t > t0 + 1.3) return;
  ctx.save(); ctx.fillStyle = color;
  for (let i = 0; i < 30; i++) {
    const d = hash01(i, 41) * 0.12;
    const grow = E.outCubic(prog(t, t0 + d, t0 + 0.28 + d));
    const shrink = E.inCubic(prog(t, t0 + 0.42 + d * 1.5, t0 + 0.85 + d * 1.5));
    const r = (180 + hash01(i, 43) * 380) * grow * (1 - shrink);
    if (r <= 1) continue;
    const ang = hash01(i, 45) * TAU, dist = (200 + hash01(i, 47) * 900) * grow;
    ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * dist, oy - 200 + Math.sin(ang) * dist * 1.3, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function ficha(ctx, x, y, f, k, t, ink) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(Math.sin(t * 3 + x) * 0.05);
  ctx.lineWidth = 10; ctx.strokeStyle = P.tinta;
  ctx.beginPath(); ctx.arc(0, 0, 105, 0, TAU); ctx.fillStyle = f.color || P.coral; ctx.fill(); ctx.stroke();
  ctx.fillStyle = P.blanco; ctx.textAlign = 'center';
  ctx.font = font(f.sim.length > 2 ? 80 : 110, 900, DISPLAY); ctx.fillText(f.sim, 0, f.sim.length > 2 ? 28 : 38);
  ctx.fillStyle = ink;
  if (f.nombre) { ctx.font = font(48, 900, DISPLAY); ctx.fillText(f.nombre, 0, 170); }
  if (f.etiqueta) { ctx.font = font(40, 600, UI); ctx.fillText(f.etiqueta, 0, 218); }
  ctx.restore();
}

// ---------------------------------------------------------------- motor de escenas
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const POS = { normal: [540, 1440, 0.95], grande: [540, 1500, 1.3], abajo: [540, 1620, 1.1], pequeno: [540, 1340, 0.82], alto: [540, 1300, 1.0], cierre: [540, 1420, 0.95], fuera: [-400, 1400, 0.8] };

export async function video(cfg) {
  const [WORDS, GRID0, VO] = await Promise.all([
    fetch('words.json').then((r) => r.json()),
    fetch('beats.json').then((r) => r.json()),
    fetch('vo_env.json').then((r) => r.json()).catch(() => null),
  ]);
  const DUR = (await fetch('film.json').then((r) => r.json()).catch(() => ({}))).duration || WORDS[WORDS.length - 1][2] + 1.1;
  Object.assign(P, cfg.paleta || {});
  const NW = WORDS.map((w) => norm(w[0]));
  // palabra -> índice. Acepta número (índice), texto ("nueve", "tres corazones") o {t: segundos}.
  const find = (q, from = 0) => {
    if (typeof q === 'number') return q;
    const parts = q.split(/\s+/).map(norm).filter(Boolean);
    for (let i = Math.max(0, from); i < NW.length; i++) if (parts.every((p, j) => NW[i + j] === p)) return i;
    for (let i = Math.max(0, from); i < NW.length; i++) if (NW[i].startsWith(parts[0])) return i;
    console.error(`palabra no encontrada: "${q}" (desde ${from})`); return from;
  };
  const at = (q, from) => (q && typeof q === 'object' && 't' in q ? q.t : WORDS[find(q, from)][1]);
  const atEnd = (q, from) => WORDS[find(q, from)][2];
  const B = (s) => (s - GRID0.offset) / GRID0.period;
  const HITS = [], PUNCH = [0], SHAKE = [[0, 12]];
  const hit = (s, label, sfx, o = {}) => HITS.push([B(s), label, sfx, o]);
  hit(0, 'inicio', 'impact', { gain: 0.45 });

  // -------- compilar escenas
  const mc = cfg.mascota || {};
  const masc = { forma: mc.forma || 'gota', extremidades: mc.extremidades || (mc.forma && mc.forma !== 'gota' ? 'brazos' : 'tentaculos'), colors: mc.colores || [P.coral, P.coralOscuro], anillo: mc.anillo || null, vientre: mc.vientre };
  const escenas = cfg.escenas.map((e) => ({ ...e }));
  let cursor = 0;
  escenas.forEach((e) => { e.i0 = find(e.palabra ?? cursor, cursor); e.t0 = e.i0 === 0 && e.palabra == null ? 0 : WORDS[e.i0][1]; if (escenas.indexOf(e) === 0) e.t0 = 0; cursor = e.i0; });
  escenas.forEach((e, k) => { e.t1 = k + 1 < escenas.length ? escenas[k + 1].t0 : DUR + 1; e.ultima = k === escenas.length - 1; });

  const fondos = [{ t: -1, color: cfg.fondo || P.papel, trans: 'corte' }];
  const decor = [], paths = [[-1, mc.pos ? (POS[mc.pos] || mc.pos) : POS.normal]], acts = [], textos = [], graficos = [];
  escenas.forEach((e) => {
    if (e.fondo) {
      const trans = e.transicion || 'ola';
      const tf = e.fondoEn ? at(e.fondoEn, e.i0) : e.t0; e.tf = tf;
      fondos.push({ t: tf, color: e.fondo, trans });
      if (trans === 'ola') { hit(tf, 'ola', 'sub', { len: 0.8 }); hit(tf, 'ola', 'crash', { gain: 0.12 }); SHAKE.push([tf, 16]); }
      if (trans === 'tinta') hit(tf - 0.3, 'tinta', 'whoosh', { len: 0.5, from: 3000, to: 300, gain: 0.22 });
    }
    (e.decor || []).forEach((d) => decor.push({ tipo: typeof d === 'string' ? d : d.tipo, color: d.color, t0: e.tf ?? e.t0, t1: e.t1 }));
    if (e.mascota) paths.push([e.t0 - 0.05, POS[e.mascota] || e.mascota]);
    (e.acciones || []).forEach((a) => {
      const A = { ...a, t: at(a.palabra ?? e.i0, e.i0), tEnd: a.hasta ? at(a.hasta, e.i0) : e.t1, escena: e };
      acts.push(A);
      if (A.tipo === 'nadar') {
        (a.ruta || []).forEach(([q, pos], j) => { const tt = at(q, e.i0) - 0.05; paths.push([tt, pos]); hit(tt + 0.05, 'nadar', 'whoosh', { len: 0.35, from: 300, to: 2600, pan: j % 2 ? 0.4 : -0.4, gain: 0.2 }); });
        A.tEnd = a.hasta ? at(a.hasta, e.i0) : paths[paths.length - 1][0] + 0.4;
      }
      if (A.tipo === 'ventana' && A.iconos && A.iconos.length && a.palabra == null) A.t = Math.min(...A.iconos.map((ic) => at(ic.palabra ?? e.i0, e.i0) + (ic.retraso || 0)));
      if (A.tipo === 'ventana') (A.iconos || []).forEach((ic, j) => { ic.ta = at(ic.palabra ?? a.palabra ?? e.i0, e.i0) + (ic.retraso || 0); hit(ic.ta, 'icono', 'pop', { pitch: ['D5', 'F5', 'A5', 'C6', 'E6'][j % 5], gain: 0.18 }); PUNCH.push(ic.ta); });
      if (A.tipo === 'brazos') { const cada = a.cada || 0.15; A.cada = cada; hit(A.t, 'icono cabeza', 'pop', { pitch: 'C5', gain: 0.18 }); const t2 = a.siguiente ? at(a.siguiente, e.i0) : A.t + 0.3; A.t2 = t2; for (let j = 0; j < 8; j++) hit(t2 + 0.1 + j * cada, 'icono brazo', 'blip', { pitch: ['D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7'][j], gain: 0.1 }); }
      if (A.tipo === 'colores') for (let j = 0; j < 10; j++) hit(A.t + j * 0.13, 'color', 'tick', { gain: 0.12 });
      if (A.tipo === 'detener') { hit(A.t, 'plano', 'blip', { pitch: 'A6', len: 1.0, gain: 0.1 }); }
      if (A.tipo === 'susto') { hit(A.t, 'susto', 'impact', { gain: 0.4 }); SHAKE.push([A.t, 26]); }
      if (A.tipo === 'ojo') hit(A.t, 'ojo', 'boing', { pitch: 'C5', to: 'C6', gain: 0.18 });
      if (A.tipo === 'birrete' || A.tipo === 'gafas') { hit(A.t + 0.15, A.tipo, 'thud', { gain: 0.3 }); SHAKE.push([A.t + 0.15, 14]); }
      if (A.tipo === 'caminar') hit(A.t + 0.3, 'paso', 'tok', { pitch: 'D5', gain: 0.15 });
      if (A.tipo === 'suelo') { hit(A.t, 'suelo', 'thud', { gain: 0.25 }); }
    });
    (e.graficos || []).forEach((g) => {
      const G = { ...g, escena: e };
      if (g.tipo === 'fichas') ['a', 'b'].forEach((s) => { if (g[s]) { G[s] = { ...g[s], ta: at(g[s].palabra ?? e.i0, e.i0) }; hit(G[s].ta, 'ficha', s === 'a' ? 'coins' : 'thud', { gain: 0.2 }); PUNCH.push(G[s].ta); } });
      if (g.tipo === 'monitor') { G.ta = at(g.palabra ?? e.i0, e.i0) - 0.2; G.tf = g.plano ? at(g.plano, e.i0) : null; G.tEnd = g.hasta ? at(g.hasta, e.i0) : e.t1; }
      graficos.push(G);
    });
    // textos apilados desde arriba
    (e.textos || []).forEach((L, j) => {
      const tIn = at(L.palabra ?? e.i0, e.i0) - 0.06;
      textos.push({ ...L, tIn, tOut: e.ultima ? null : e.t1 - 0.14 + j * 0.02, escena: e, j });
      if (L.numero || L.tam === 'xl') { hit(tIn + 0.06, 'grande', L.golpe ? 'impact' : 'thud', { gain: L.golpe ? 0.4 : 0.22 }); PUNCH.push(tIn + 0.06); }
      else if (L.tam === 'l') PUNCH.push(tIn + 0.06);
      if (L.golpe) SHAKE.push([tIn + 0.06, 22]);
      if (L.numero && L.txt && L.palabraTxt) PUNCH.push(at(L.palabraTxt, e.i0));
    });
    if (e.ultima) { PUNCH.push(e.t0); SHAKE.push([e.t0, 14]); hit(e.t0, 'cierre', 'impact', { gain: 0.35 }); }
  });
  const lastEnd = WORDS[WORDS.length - 1][2];
  hit(lastEnd + 0.15, 'guiño', 'bell', { pitch: 'A6', gain: 0.2 });
  paths.sort((a, b) => a[0] - b[0]);
  const ultima = escenas[escenas.length - 1];
  if (!ultima.mascota) paths.push([ultima.t0 + 0.05, POS.cierre]);
  paths.sort((a, b) => a[0] - b[0]);

  const keysS = (t) => {
    let v = paths[0][1].slice();
    for (let i = 1; i < paths.length; i++) { const k = sp(t, paths[i][0], SPRING.gentle); if (k === 0) break; v = v.map((x, j) => x + (paths[i][1][j] - paths[i - 1][1][j]) * k); }
    return v;
  };
  const talk = (t) => { if (!VO) return 0; const i = t * VO.rate, a = Math.floor(i), f = i - a; return (VO.env[a] || 0) * (1 - f) + (VO.env[a + 1] || 0) * f; };
  const activo = (tipo, t) => acts.filter((a) => a.tipo === tipo && t >= a.t - 0.2 && t < a.tEnd + 0.3);
  const bgAt = (t) => { let c = fondos[0]; for (const f of fondos) if (t >= f.t) c = f; return c; };
  const blinks = []; for (let s = 1.7; s < DUR; s += 2.1 + hash01(Math.round(s * 10), 3) * 1.4) blinks.push(s);

  // -------- pintar
  M.film({
    fonts: [font(100, 900, DISPLAY), font(40, 600, UI)],
    hits: HITS,
    draw(ctx, u, t) {
      fill(ctx, P.papel);
      ctx.save();
      // cámara: golpe de zoom en cada palabra clave, temblor en impactos, balanceo leve
      let z = 1; for (const b of PUNCH) if (t >= b) z += 0.045 * Math.exp(-(t - b) * 9);
      zoomAbout(ctx, z, W / 2, H * 0.45);
      ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(t * 1.3) * 0.008); ctx.translate(-W / 2, -H / 2);
      for (const [b, amp] of SHAKE) if (t >= b) { const a = amp * Math.exp(-(t - b) / 0.22); if (a > 0.05) ctx.translate(a * M.noise1(t * 90, 3 + b), a * M.noise1(t * 90, 12 + b)); }

      // fondo (+ transición)
      let cur = fondos[0];
      for (let i = 0; i < fondos.length; i++) {
        const f = fondos[i];
        if (f.trans === 'ola' && t >= f.t - 0.3) cur = f;
        else if (f.trans === 'tinta' && t >= f.t - 0.05) cur = f;
        else if (f.trans === 'corte' && t >= f.t) cur = f;
      }
      const idx = fondos.indexOf(cur);
      const prev = fondos[Math.max(0, idx - 1)];
      ctx.fillStyle = cur.trans === 'ola' && t < cur.t + 0.12 ? prev.color : cur.color; ctx.fillRect(-80, -80, W + 160, H + 160);
      if (cur.trans === 'ola' && t < cur.t + 0.12) ola(ctx, t, cur.t - 0.3, cur.t + 0.12, cur.color);
      const bg = bgAt(t + 0.05).color, ink = tintaSobre(bg);

      decor.forEach((d) => {
        const a = E.outCubic(prog(t, d.t0, d.t0 + 0.5)) * (1 - prog(t, d.t1 - 0.1, d.t1 + 0.2));
        if (a <= 0) return;
        if (d.tipo === 'algas') algas(ctx, t, a, d.color || M.mix(bg, P.tinta, 0.18));
        else if (d.tipo === 'burbujas') burbujas(ctx, t, a, d.color);
        else if (d.tipo === 'estrellas') estrellas(ctx, t, a);
        else if (d.tipo === 'suelo') suelo(ctx, sp(t, d.t0 - 0.1) - E.inCubic(prog(t, d.t1, d.t1 + 0.25)), d.color || P.arena, P.arenaOscura);
      });

      // ---- mascota
      let [ox, oy, sc] = keysS(t);
      oy -= 120 * wobble(t * 2, 1.2, 3) * (t < 1.5 ? 1 : 0);
      const walkA = activo('caminar', t)[0];
      const walk = walkA ? clamp(prog(t, walkA.t, walkA.t + 0.15) - prog(t, walkA.tEnd - 0.1, walkA.tEnd + 0.05)) : 0;
      if (walk > 0) { ox += lerp(0, walkA.dx ?? 220, E.outQuad(prog(t, walkA.t, walkA.tEnd))) * walk; oy -= Math.abs(Math.sin(t * 9)) * 25 * walk; }
      const jumpA = activo('saltar', t)[0];
      if (jumpA && t > jumpA.t) oy -= Math.abs(Math.sin((t - jumpA.t) * 7)) * 70 * (1 - prog(t, jumpA.tEnd - 0.1, jumpA.tEnd));
      if (t > lastEnd) oy -= Math.abs(Math.sin((t - lastEnd) * 6)) * 50;
      oy += Math.sin(t * 4.2) * 10;
      const [px, py] = keysS(t - 0.03), [qx, qy] = keysS(t);
      const vx = (qx - px) / 0.03, vy = (qy - py) / 0.03;
      const swA = activo('nadar', t)[0];
      const swim = swA ? clamp(prog(t, swA.t - 0.1, swA.t + 0.1) - prog(t, swA.tEnd - 0.1, swA.tEnd + 0.1)) : 0;
      const rot = swim * clamp(Math.atan2(vy, vx) + Math.PI / 2, -1.1, 1.1) * clamp(Math.hypot(vx, vy) / 500) + Math.sin(t * 4.2) * 0.04 * (1 - swim);
      lineasVelocidad(ctx, ox, oy - 200 * sc, vx, vy, swim);
      const imp = [0.6, ...SHAKE.map((s) => s[0]).filter((s) => s > 0.5)];
      let squash = 0.08 * wobble(t * 2, 1.2, 3);
      imp.forEach((b) => { if (t > b) squash += 0.05 * wobble((t - b) * 2, 1.4, 4); });
      if (swA) (swA.ruta || []).forEach(([q]) => { squash -= 0.1 * bump(t, at(q, swA.escena.i0), 0.15); });

      // ventana + iconos
      let ventana = 0, iconos = null, pulso = 0;
      const vA = acts.filter((a) => a.tipo === 'ventana' && t >= a.t - 0.3 && t < a.tEnd + 0.3).pop();
      if (vA) {
        ventana = clamp(sp(t, vA.t - 0.15, SPRING.snappy) - prog(t, vA.tEnd - 0.1, vA.tEnd + 0.15) * 1.2, 0, 1.2);
        const tint = acts.filter((a) => a.tipo === 'teñir' && t >= a.t).pop();
        const det = acts.filter((a) => a.tipo === 'detener' && t >= a.t - 0.01).pop();
        iconos = vA.iconos.map((ic, j) => ({
          tipo: ic.tipo, txt: ic.txt, k: sp(t, ic.ta), color: tint && (tint.iconos ? tint.iconos.includes(j) : true) ? tint.color : (ic.color || null),
          hl: acts.filter((a) => a.tipo === 'resaltar' && a.iconos.includes(j)).reduce((m, a) => Math.max(m, clamp(prog(t, a.t, a.t + 0.15) - prog(t, a.tEnd - 0.1, a.tEnd + 0.1))), 0),
          parado: det && det.icono === j ? clamp(prog(t, det.t, det.t + 0.25)) : 0,
        }));
        const t0 = Math.min(...vA.iconos.map((ic) => ic.ta));
        pulso = t < t0 ? 0 : Math.exp(-(((t - t0) / 0.4) % 1) * 6);
      }
      const brA = acts.filter((a) => a.tipo === 'brazos' && t >= a.t - 0.05 && t < a.tEnd).pop();
      const enBrazos = brA ? { tipo: brA.icono || 'cerebro', color: brA.color, k: [sp(t, brA.t), ...[0, 1, 2, 3, 4, 5, 6, 7].map((j) => sp(t, brA.t2 + 0.1 + j * brA.cada))].map((k) => k * (1 - E.inBack(prog(t, brA.tEnd - 0.25, brA.tEnd)))) } : null;
      const cA = activo('colores', t)[0];
      const colors = cA && t >= cA.t && t < cA.tEnd ? ARCOIRIS[1 + Math.floor((t - cA.t) / 0.13) % (ARCOIRIS.length - 1)] : masc.colors;
      const suA = activo('susto', t)[0];
      const shock = suA ? clamp(prog(t, suA.t, suA.t + 0.1) - prog(t, suA.tEnd - 0.1, suA.tEnd)) : 0;
      const ojA = activo('ojo', t)[0];
      const bigEye = ojA ? clamp(sp(t, ojA.t - 0.05) - prog(t, ojA.tEnd - 0.1, ojA.tEnd + 0.1)) : 0;
      const capA = acts.find((a) => a.tipo === 'birrete' && t >= a.t - 0.3 && t < (a.hasta ? a.tEnd : ultima.t0 + 0.4));
      const gafA = acts.find((a) => a.tipo === 'gafas' && t >= a.t - 0.3 && t < (a.hasta ? a.tEnd : ultima.t0 + 0.4));
      const waveA = activo('saludar', t)[0];
      const wave = clamp(sp(t, lastEnd, SPRING.gentle) + (waveA ? clamp(sp(t, waveA.t, SPRING.gentle) - sp(t, waveA.tEnd - 0.3, SPRING.gentle)) : 0));
      const look = swim > 0.3 ? [0.6, -0.4] : walk > 0.3 ? [1, -0.2] : shock > 0.3 ? [0, -1] : cA ? [Math.sin(t * 3) * 0.6, -0.4] : t > lastEnd ? [0, 0] : [0.2 * Math.sin(t * 0.7), -0.9];
      mascota(ctx, {
        ...masc, x: ox, y: oy, s: sc, t, squash, rot, colors, swim, walk, walkPhase: t * 9,
        spread: brA ? clamp(prog(t, brA.t - 0.2, brA.t) - prog(t, brA.tEnd - 0.25, brA.tEnd)) : 0,
        wave, ventana, iconos, pulso, enBrazos, shock, bigEye,
        sweat: shock, blink: blinks.reduce((m, b) => Math.max(m, bump(t, b, 0.09)), 0),
        wink: bump(t, lastEnd + 0.4, 0.3), look, mouth: clamp(talk(t) * 1.15),
        birrete: capA ? sp(t, capA.t - 0.1) : null, gafas: gafA ? sp(t, gafA.t - 0.1) : 0,
      });

      // gráficos
      graficos.forEach((g) => {
        const e = g.escena, out = e.ultima ? 1e9 : e.t1 - 0.1;
        if (g.tipo === 'fichas') {
          const y = g.y ?? S.y + 520;
          const ka = g.a ? sp(t, g.a.ta - 0.06) * (1 - E.inBack(prog(t, out, out + 0.18))) : 0;
          const kb = g.b ? sp(t, g.b.ta - 0.06) * (1 - E.inBack(prog(t, out + 0.03, out + 0.21))) : 0;
          if (g.a) ficha(ctx, g.b ? 290 : 540, y, g.a, ka, t, ink);
          if (g.b) { ficha(ctx, 790, y, g.b, kb, t, ink); const vs = sp(t, g.b.ta) * (1 - prog(t, out, out + 0.1)); if (vs > 0.01) glyph(ctx, g.vs || 'vs', 540, y + 30, font(80, 900, DISPLAY), ink, vs, vs); }
        } else if (g.tipo === 'monitor') monitor(ctx, t, g.ta, g.tf, g.tEnd - 0.1, g.y ?? S.y + 470, g.color || P.blanco);
      });

      // textos
      const porEscena = new Map();
      textos.forEach((L) => { if (!porEscena.has(L.escena)) porEscena.set(L.escena, []); porEscena.get(L.escena).push(L); });
      porEscena.forEach((lista, e) => {
        if (t < e.t0 - 0.3 || t > e.t1 + 0.4) return;
        const inkE0 = tintaSobre(bgAt(e.t0 + 0.2).color);
        let y = S.y + (e.arriba ?? 10);
        lista.forEach((L) => {
          const inkE = tintaSobre(bgAt(t + 0.05).color) || inkE0;
          const color = L.color === 'arcoiris' ? null : (L.color || inkE);
          const colorAt = L.color === 'arcoiris' ? (j) => ARCOIRIS[(j + Math.max(0, Math.floor((t - L.tIn) / 0.13))) % ARCOIRIS.length][0] : null;
          const x0 = S.x + (L.x || 0);
          if (L.numero) {
            if (L.txt) { // fila: número grande + (flecha) + palabra con texto chico encima
              const base = y + 210;
              const shown = L.contar ? String(t < L.tIn + 0.06 ? L.contar[0] : Math.min(L.contar[1], L.contar[0] + Math.floor(Math.max(0, t - at(L.contar[3] ?? L.palabra, e.i0) - 0.1) / (L.contar[2] || 0.15)) + (t >= at(L.contar[3] ?? L.palabra, e.i0) + 0.1 ? 1 : 0))) : L.numero;
              line(ctx, shown, x0, base, font(220, 900, DISPLAY), L.colorNumero || P.corazon, L.tIn, L.tOut, t, { wob: 0.1 });
              const gap = L.flecha ? 300 : 40 + layout(ctx, shown.length > 1 ? shown : '9', font(220, 900, DISPLAY)).width + 30;
              if (L.flecha) arrow(ctx, x0 + 150, base - 75, 110, E.outCubic(prog(t, L.tIn + 0.1, L.tIn + 0.35)) * (L.tOut == null ? 1 : 1 - E.inBack(prog(t, L.tOut, L.tOut + 0.15))), color || inkE);
              const tw = L.palabraTxt ? at(L.palabraTxt, e.i0) - 0.06 : L.tIn + 0.1;
              const wf = font(fitSize(ctx, L.txt, 900, DISPLAY, S.w - gap, 150), 900, DISPLAY);
              line(ctx, L.txt, x0 + gap, base - 20, wf, color, tw, L.tOut, t, { wob: 0.08, colorAt });
              if (L.sub) line(ctx, L.sub, x0 + gap + 4, base - 150, font(Math.min(60, fitSize(ctx, L.sub, 600, UI, S.w - gap, 60)), 600, UI), color, L.palabraSub ? at(L.palabraSub, e.i0) - 0.05 : L.tIn + 0.1, L.tOut, t, { stagger: 0.006, cfg: SPRING.snappy });
              y = base + 40;
            } else { // número solo, gigante
              const size = L.tam === 'l' ? 220 : 330, base = y + size * 0.85;
              const k = sp(t, L.tIn), out = L.tOut == null ? 0 : E.inBack(prog(t, L.tOut, L.tOut + 0.15), 1.6);
              if (k > 0.001 && out < 1) glyph(ctx, L.numero, x0 + layout(ctx, L.numero, font(size, 900, DISPLAY)).width / 2, base - out * 700, font(size, 900, DISPLAY), L.color || P.corazon, 0.6 + 0.4 * k, 0.6 + 0.4 * k, (1 - k) * 0.4 + 0.06 * Math.sin(t * 9));
              y = base + 30;
            }
            return;
          }
          const tam = L.tam || 'm';
          let f, size;
          if (tam === 's') { size = Math.min(L.max || 66, fitSize(ctx, L.txt, 600, UI, S.w, 66)); f = font(size, 600, UI); }
          else { const mx = { xl: 300, l: 170, m: 112 }[tam] || 112; size = Math.min(L.max || mx, fitSize(ctx, L.txt, 900, DISPLAY, S.w + (tam === 'xl' ? 30 : 0), mx)); f = font(size, 900, DISPLAY); }
          const base = y + size * (tam === 's' ? 0.95 : 0.9);
          if (L.barra) bar(ctx, x0 - 20, base - size * 0.82, S.w + 40, size * 1.02, L.barra === true ? P.alerta : L.barra, L.tIn + 0.02, L.tOut, t);
          line(ctx, L.txt, x0 - (tam === 'xl' ? 6 : 0), base, f, color, L.tIn, L.tOut, t, { stagger: tam === 's' ? 0.006 : tam === 'xl' ? 0.03 : 0.018, cfg: tam === 's' ? SPRING.snappy : SPRING.bouncy, wob: L.wob ?? (tam === 'xl' ? 0.18 : tam === 'l' ? 0.1 : 0), colorAt });
          y = base + size * 0.14 + (tam === 's' ? 14 : 0);
        });
      });

      // transición de tinta (cubre, cambia el fondo por debajo y se retira)
      fondos.forEach((f) => { if (f.trans === 'tinta') nubeTinta(ctx, t, f.t - 0.35, ox, oy, P.nube); });
      ctx.restore();
    },
  });
}
