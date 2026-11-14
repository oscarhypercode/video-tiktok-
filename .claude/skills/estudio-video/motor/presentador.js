// presentador.js — personaje "rubber hose": cuerpo con forma por nicho, cara expresiva (cejas, párpados,
// pupilas, 6 bocas), brazos de manguera con guantes, piernas cortas, accesorios y aura. Todo vectorial.
import { TAU, clamp, lerp, trazo, rr, alfa, aclarar, oscurecer, mancha, caja, ruido } from './core.js';

// Parámetros de cara por emoción (se mezclan suavemente entre sí).
export const EMOCIONES = {
  neutral: { cejaY: 0, cejaInc: 0, ojo: 1, pupila: 1, curva: 0.45, ancho: 0.9, abierta: 0, o: 0, asim: 0, ojoFeliz: 0 },
  feliz: { cejaY: 0.25, cejaInc: -0.05, ojo: 1, pupila: 1, curva: 1, ancho: 1.05, abierta: 0.12, o: 0, asim: 0, ojoFeliz: 0 },
  emocionado: { cejaY: 0.65, cejaInc: 0.05, ojo: 1.12, pupila: 1.05, curva: 1, ancho: 1.25, abierta: 0.5, o: 0, asim: 0, ojoFeliz: 0 },
  sorpresa: { cejaY: 1, cejaInc: 0.2, ojo: 1.28, pupila: 0.62, curva: 0, ancho: 0.62, abierta: 0.45, o: 1, asim: 0, ojoFeliz: 0 },
  pensando: { cejaY: 0.35, cejaInc: 0.15, ojo: 0.82, pupila: 0.95, curva: -0.05, ancho: 0.62, abierta: 0, o: 0, asim: 1, ojoFeliz: 0 },
  preocupado: { cejaY: 0.35, cejaInc: 0.75, ojo: 1.05, pupila: 0.9, curva: -0.7, ancho: 0.75, abierta: 0.05, o: 0, asim: 0, ojoFeliz: 0 },
  risa: { cejaY: 0.45, cejaInc: 0, ojo: 1, pupila: 1, curva: 1, ancho: 1.3, abierta: 0.75, o: 0, asim: 0, ojoFeliz: 1 },
  orgulloso: { cejaY: 0.1, cejaInc: -0.35, ojo: 0.78, pupila: 1, curva: 0.85, ancho: 1, abierta: 0, o: 0, asim: 0.6, ojoFeliz: 0 },
  decidido: { cejaY: -0.15, cejaInc: -0.6, ojo: 0.9, pupila: 1, curva: 0.35, ancho: 0.95, abierta: 0.05, o: 0, asim: 0, ojoFeliz: 0 },
};
export const mezclarEmo = (a, b, p) => { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k] ?? a[k], p); return o; };

export const R = 165;            // radio del cuerpo a escala 1
const PIERNA = 74;
export const CY = -(PIERNA + R * 0.95);   // centro del cuerpo respecto a los pies
export const ALTO = -CY + R;              // alto total aproximado

function cuerpoPath(ctx, forma, t, sq) {
  const cy = CY;
  ctx.beginPath();
  if (forma === 'caja') ctx.roundRect(-R * 0.95, cy - R * 1.02, R * 1.9, R * 2.04, R * 0.42);
  else if (forma === 'gota') { ctx.moveTo(0, cy - R * 1.35); ctx.bezierCurveTo(R * 0.55, cy - R * 0.8, R, cy - R * 0.1, R, cy + R * 0.25); ctx.arc(0, cy + R * 0.25, R, 0, Math.PI); ctx.bezierCurveTo(-R, cy - R * 0.1, -R * 0.55, cy - R * 0.8, 0, cy - R * 1.35); }
  else if (forma === 'blob') {
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU, r = R * (1 + 0.035 * Math.sin(3 * a + t * 1.7) + 0.025 * Math.sin(5 * a - t * 1.3) + (Math.sin(a) > 0 ? -0.04 * Math.sin(a) : 0));
      const x = Math.cos(a) * r, y = cy + Math.sin(a) * r * 1.02;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  } else ctx.arc(0, cy, R, 0, TAU); // circulo, globulo
}

// Brazo de manguera: curva hombro→mano con codo suave; mano con guante (y dedo si señala).
function brazo(ctx, sx, sy, hx, hy, lado, col, ink, lw, señala) {
  const mx = (sx + hx) / 2, my = (sy + hy) / 2, dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1;
  const bend = Math.max(0, R * 1.25 - L) * 0.55 + 10;
  const cx = mx - (dy / L) * bend * lado, cy = my + (dx / L) * bend * lado;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.strokeStyle = ink; ctx.lineWidth = R * 0.17 + lw * 2; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.strokeStyle = col; ctx.lineWidth = R * 0.17; ctx.stroke();
  const ang = Math.atan2(hy - cy, hx - cx);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  if (señala) { rr(ctx, R * 0.05, -R * 0.055, R * 0.24, R * 0.11, R * 0.055); trazo(ctx, '#FFFFFF', ink, lw); }
  ctx.beginPath(); ctx.arc(0, 0, R * 0.155, 0, TAU); trazo(ctx, '#FFFFFF', ink, lw);
  ctx.beginPath(); ctx.ellipse(-R * 0.02, R * 0.1 * lado, R * 0.07, R * 0.05, 0.4 * lado, 0, TAU); trazo(ctx, '#FFFFFF', ink, lw * 0.8);
  ctx.restore();
}

// Posición de las manos (relativas al centro del cuerpo) para cada gesto.
export function manos(gesto, t, objetivoLocal) {
  const sw = Math.sin(t * 2.6) * R * 0.05;
  const G = {
    reposo: [[-R * 1.12, R * 0.78 + sw], [R * 1.12, R * 0.78 - sw]],
    saludar: [[-R * 1.12, R * 0.78 + sw], [R * 1.28 + Math.sin(t * 13) * R * 0.18, -R * 0.85]],
    arriba: [[-R * 1.02 + Math.sin(t * 16) * 8, -R * 1.1], [R * 1.02 - Math.sin(t * 16) * 8, -R * 1.1]],
    pensar: [[-R * 1.05, R * 0.45], [R * 0.32, R * 0.55]],
    encoger: [[-R * 1.4, R * 0.05], [R * 1.4, R * 0.05]],
    presentar: [[-R * 1.12, R * 0.78 + sw], [R * 1.25, -R * 0.55 + sw]],
    aplaudir: [[-R * 0.25 - Math.abs(Math.sin(t * 11)) * R * 0.3, R * 0.55], [R * 0.25 + Math.abs(Math.sin(t * 11)) * R * 0.3, R * 0.55]],
    jarras: [[-R * 1.02, R * 0.25], [R * 1.02, R * 0.25]],
  };
  if (gesto === 'señalar' && objetivoLocal) {
    const [ox, oy] = objetivoLocal, lado = ox >= 0 ? 1 : -1;
    const sx = lado * R * 0.92, sy = R * 0.1, d = Math.hypot(ox - sx, oy - sy) || 1;
    const h = [sx + (ox - sx) / d * R * 1.15, sy + (oy - sy) / d * R * 1.15];
    return lado > 0 ? [G.reposo[0], h] : [h, G.reposo[1]];
  }
  return G[gesto] || G.reposo;
}

// p = { x, y, s, t, forma, cuerpo, sombra, tinta, lw, emo, hablar, parpadeo, mirar:[dx,dy], manos:[[x,y],[x,y]],
//       señala:-1|0|1, salto, aplastar, rot, brillo, accesorio, vx, sudor }
export function presentador(ctx, p) {
  const ink = p.tinta, lw = p.lw ?? 9, e = p.emo, t = p.t;
  const sq = p.aplastar || 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  // sombra en el suelo
  const hgt = p.salto || 0;
  ctx.fillStyle = alfa('#000000', 0.16 * (1 - clamp(hgt / 500)));
  ctx.beginPath(); ctx.ellipse(0, 4, R * 1.05 * p.s * (1 - hgt / 900), R * 0.17 * p.s, 0, 0, TAU); ctx.fill();
  ctx.translate(0, -hgt);
  ctx.scale(p.s * (1 + sq), p.s * (1 - sq));
  if (p.rot) { ctx.translate(0, CY); ctx.rotate(p.rot); ctx.translate(0, -CY); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // aura
  if (p.brillo > 0.01) {
    const g = ctx.createRadialGradient(0, CY, R * 0.5, 0, CY, R * 2.3);
    g.addColorStop(0, alfa(p.colorBrillo || '#FFF6A8', 0.75 * p.brillo)); g.addColorStop(1, alfa(p.colorBrillo || '#FFF6A8', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, CY, R * 2.3, 0, TAU); ctx.fill();
  }
  const acc = p.accesorio;
  if (acc === 'anillo') anillo(ctx, false, p);
  // piernas
  [-1, 1].forEach((s) => {
    const fx = s * R * 0.4 + (p.paso ? Math.sin(p.paso + (s > 0 ? Math.PI : 0)) * 18 : 0);
    ctx.beginPath(); ctx.moveTo(s * R * 0.36, CY + R * 0.8); ctx.quadraticCurveTo(s * R * 0.42, CY + R * 0.95 + PIERNA * 0.5, fx, -14);
    ctx.strokeStyle = ink; ctx.lineWidth = R * 0.15 + lw * 2; ctx.stroke(); ctx.strokeStyle = p.sombra; ctx.lineWidth = R * 0.15; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(fx + s * 14, -10, R * 0.2, R * 0.11, 0, 0, TAU); trazo(ctx, ink, ink, lw);
  });
  // brazo trasero si señala hacia el otro lado se dibuja igual (ambos delante del cuerpo queda mejor para gestos)
  const sh = [[-R * 0.9, CY + R * 0.12], [R * 0.9, CY + R * 0.12]];
  // cuerpo
  cuerpoPath(ctx, p.forma, t, sq); trazo(ctx, p.cuerpo, null, 0);
  ctx.save(); cuerpoPath(ctx, p.forma, t, sq); ctx.clip();
  // volumen: sombra inferior y brillo
  ctx.fillStyle = alfa(oscurecer(p.cuerpo, 0.35), 0.35); ctx.beginPath(); ctx.ellipse(R * 0.25, CY + R * 0.95, R * 1.3, R * 0.55, 0, 0, TAU); ctx.fill();
  if (p.forma === 'globulo') {
    ctx.beginPath(); ctx.ellipse(0, CY + R * 0.05, R * 0.66, R * 0.6, 0, 0, TAU); ctx.fillStyle = alfa(oscurecer(p.cuerpo, 0.25), 0.55); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-R * 0.08, CY - R * 0.02, R * 0.52, R * 0.46, 0, 0, TAU); ctx.fillStyle = alfa(aclarar(p.cuerpo, 0.12), 0.9); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-R * 0.5, CY - R * 0.58, R * 0.2, R * 0.32, -0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-R * 0.3, CY - R * 0.82, R * 0.06, 0, TAU); ctx.fill();
  if (acc === 'moneda') { ctx.fillStyle = alfa(oscurecer(p.cuerpo, 0.3), 0.6); ctx.font = `900 ${R * 0.5}px "Rubik"`; ctx.textAlign = 'center'; ctx.fillText('$', R * 0.55, CY + R * 0.75); }
  ctx.restore();
  cuerpoPath(ctx, p.forma, t, sq); trazo(ctx, null, ink, lw);
  // cara
  const fy = CY + R * 0.02, ex = R * 0.34, ey = fy - R * 0.1;
  const [mx, my] = p.mirar || [0, 0];
  caja('cara', 'presentador', p.x - R * 0.7 * p.s, p.y - hgt + (CY - R * 0.6) * p.s, R * 1.4 * p.s, R * 1.2 * p.s);
  // mejillas
  ctx.fillStyle = alfa('#FF5A7A', 0.35); [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * R * 0.58, fy + R * 0.22, R * 0.13, R * 0.08, 0, 0, TAU); ctx.fill(); });
  // ojos
  [-1, 1].forEach((s) => {
    const guiño = s > 0 ? (p.guiño || 0) : 0;
    const open = clamp(e.ojo * (1 - Math.max(p.parpadeo || 0, guiño)) * (1 - (e.asim > 0 && s < 0 ? 0.25 * e.asim : 0)), 0.06, 1.6);
    const rx = R * 0.19 * (e.ojo > 1 ? 1 + (e.ojo - 1) * 0.6 : 1), ry = R * 0.24 * open;
    ctx.save(); ctx.translate(s * ex + mx * R * 0.04, ey + my * R * 0.03);
    if (e.ojoFeliz > 0.5 || open < 0.2) { // ojo cerrado/feliz: arco
      ctx.beginPath(); ctx.arc(0, R * 0.06, R * 0.15, Math.PI * 1.15, Math.PI * 1.85); ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.1; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); trazo(ctx, '#FFFFFF', ink, lw * 0.9);
      ctx.save(); ctx.clip();
      const pr = R * 0.12 * e.pupila;
      ctx.beginPath(); ctx.arc(mx * rx * 0.45, my * ry * 0.4 + R * 0.02, pr, 0, TAU); ctx.fillStyle = ink; ctx.fill();
      ctx.beginPath(); ctx.arc(mx * rx * 0.45 - pr * 0.35, my * ry * 0.4 + R * 0.02 - pr * 0.4, pr * 0.36, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      // párpado superior (da expresión: cansado, orgulloso, decidido)
      if (e.ojo < 0.95) { ctx.fillStyle = p.cuerpo; ctx.fillRect(-rx * 1.2, -ry * 1.3, rx * 2.4, ry * (1.3 - (e.ojo - 0.3) * 1.2)); }
      ctx.restore();
    }
    ctx.restore();
    // ceja
    const by = ey - R * 0.36 - e.cejaY * R * 0.13 - (e.asim > 0 && s > 0 ? e.asim * R * 0.1 : 0) + my * R * 0.02;
    const inc = e.cejaInc * R * 0.12;
    ctx.beginPath(); ctx.moveTo(s * ex - s * R * 0.17, by - inc);
    ctx.quadraticCurveTo(s * ex, by - R * 0.06 - inc * 0.5, s * ex + s * R * 0.17, by + inc * 0.3);
    ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.25; ctx.stroke();
  });
  // boca
  const bw = R * 0.25 * e.ancho, by = fy + R * 0.33;
  const ab = clamp(e.abierta + (p.hablar || 0) * (0.65 - e.abierta * 0.4), 0, 1);
  ctx.save(); ctx.translate(0, by);
  if (e.o > 0.5) {
    ctx.beginPath(); ctx.ellipse(0, R * 0.04, R * (0.08 + ab * 0.04), R * (0.09 + ab * 0.13), 0, 0, TAU); trazo(ctx, '#3A1020', ink, lw * 0.9);
  } else if (ab < 0.08) {
    ctx.beginPath(); ctx.moveTo(-bw, -e.curva * R * 0.03); ctx.quadraticCurveTo(e.asim * R * 0.05, e.curva * R * 0.2, bw, -e.curva * R * 0.03 - e.asim * R * 0.05); ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.1; ctx.stroke();
  } else {
    const top = -Math.max(0, e.curva) * R * 0.02, bot = R * (0.06 + ab * 0.36) + Math.max(0, e.curva) * R * 0.08;
    const path = () => { ctx.beginPath(); ctx.moveTo(-bw, top - e.curva * R * 0.03); ctx.quadraticCurveTo(0, top + e.curva * R * 0.08, bw, top - e.curva * R * 0.03); ctx.quadraticCurveTo(0, bot * 1.6, -bw, top - e.curva * R * 0.03); ctx.closePath(); };
    path(); ctx.fillStyle = '#3A1020'; ctx.fill();
    ctx.save(); path(); ctx.clip();
    if (ab > 0.3) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-bw, top - R * 0.05, bw * 2, R * 0.075); }
    ctx.fillStyle = '#FF6B81'; ctx.beginPath(); ctx.ellipse(0, bot * 1.05, bw * 0.6, bot * 0.42, 0, 0, TAU); ctx.fill();
    ctx.restore();
    path(); ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.9; ctx.stroke();
  }
  ctx.restore();
  // sudor
  if (p.sudor > 0.01) [[-1, 0], [1, 0.45]].forEach(([s, d]) => {
    const q = (t * 1.8 + d) % 1; ctx.save(); ctx.globalAlpha = p.sudor * (1 - q); ctx.translate(s * R * 0.92, CY - R * 0.55 + q * R * 0.7);
    ctx.beginPath(); ctx.moveTo(0, -R * 0.16); ctx.quadraticCurveTo(R * 0.11, 0, 0, R * 0.07); ctx.quadraticCurveTo(-R * 0.11, 0, 0, -R * 0.16); trazo(ctx, '#9FD8FF', ink, lw * 0.6); ctx.restore();
  });
  // accesorios delante
  if (acc === 'anillo') anillo(ctx, true, p);
  if (acc === 'gafas') { ctx.lineWidth = lw * 1.2; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * ex, ey, R * 0.27, 0, TAU); ctx.fillStyle = 'rgba(170,220,255,0.22)'; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke(); }); ctx.beginPath(); ctx.moveTo(-ex + R * 0.27, ey - 4); ctx.quadraticCurveTo(0, ey - R * 0.12, ex - R * 0.27, ey - 4); ctx.stroke(); }
  if (acc === 'antena') { const w = Math.sin(t * 3) * 0.15 - (p.vx || 0) * 0.0006; ctx.save(); ctx.translate(0, CY - R * 0.98); ctx.rotate(w); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(R * 0.12, -R * 0.3, R * 0.05, -R * 0.5); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke(); ctx.beginPath(); ctx.arc(R * 0.05, -R * 0.55, R * 0.1, 0, TAU); trazo(ctx, p.acento || '#FFD23F', ink, lw * 0.8); ctx.restore(); }
  if (acc === 'sombrero') { ctx.save(); ctx.translate(0, CY - R * 0.92); ctx.rotate(-0.1); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.95, R * 0.17, 0, 0, TAU); trazo(ctx, '#6B4A2B', ink, lw); rr(ctx, -R * 0.55, -R * 0.55, R * 1.1, R * 0.55, R * 0.18); trazo(ctx, '#6B4A2B', ink, lw); ctx.fillStyle = '#B23A2B'; ctx.fillRect(-R * 0.55 + lw / 2, -R * 0.2, R * 1.1 - lw, R * 0.13); ctx.restore(); }
  if (acc === 'gorro') { ctx.save(); ctx.translate(0, CY - R * 0.85); [[-0.4, -0.55], [0, -0.75], [0.4, -0.55]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * R, b * R, R * 0.33, 0, TAU); trazo(ctx, '#FFFFFF', ink, lw); }); rr(ctx, -R * 0.6, -R * 0.5, R * 1.2, R * 0.45, R * 0.08); trazo(ctx, '#FFFFFF', ink, lw); ctx.restore(); }
  if (acc === 'cinta') { ctx.save(); cuerpoPath(ctx, p.forma, t, sq); ctx.clip(); ctx.fillStyle = p.acento || '#FFFFFF'; ctx.fillRect(-R * 1.2, CY - R * 0.72, R * 2.4, R * 0.2); ctx.restore(); }
  if (acc === 'birrete' || p.birrete != null) birrete(ctx, p.birrete ?? 1, t, ink, lw);
  // brazos al final (gestos por delante del cuerpo)
  const [hl, hr] = p.manos;
  brazo(ctx, sh[0][0], sh[0][1], hl[0], CY + hl[1], -1, p.sombra, ink, lw, p.señala === -1);
  brazo(ctx, sh[1][0], sh[1][1], hr[0], CY + hr[1], 1, p.sombra, ink, lw, p.señala === 1);
  ctx.restore();
}
function anillo(ctx, front, p) {
  ctx.save(); ctx.translate(0, CY + R * 0.45); ctx.rotate(-0.14);
  ctx.beginPath(); ctx.ellipse(0, 0, R * 1.6, R * 0.36, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
  ctx.lineWidth = R * 0.3; ctx.strokeStyle = p.tinta; ctx.stroke(); ctx.lineWidth = R * 0.3 - (p.lw ?? 9) * 2; ctx.strokeStyle = p.acento2 || '#FFD9A0'; ctx.stroke();
  ctx.restore();
}
function birrete(ctx, k, t, ink, lw) {
  ctx.save(); ctx.translate(0, CY - R * 0.95 - (1 - k) * 900); ctx.rotate(-0.12);
  ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.rect(-R * 0.4, -R * 0.05, R * 0.8, R * 0.28); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-R * 0.9, -R * 0.08); ctx.lineTo(0, -R * 0.4); ctx.lineTo(R * 0.9, -R * 0.08); ctx.lineTo(0, R * 0.22); ctx.closePath(); ctx.fill();
  const sx = Math.sin(t * 6) * 10; ctx.strokeStyle = '#FFD23F'; ctx.beginPath(); ctx.moveTo(0, -R * 0.1); ctx.lineTo(R * 0.7, 0); ctx.lineTo(R * 0.72 + sx, R * 0.45); ctx.stroke();
  ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.arc(R * 0.72 + sx, R * 0.5, R * 0.07, 0, TAU); ctx.fill(); ctx.restore();
}
