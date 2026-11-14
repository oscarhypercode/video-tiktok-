// motor.js — lee proyecto/video.json + words.json + vo_env.json y compone el video.
// Capas por cuadro: escena (fondo, textura, titulares, visual) con transición → presentador → subtítulos → progreso.
import { W, H, TAU, ZONA, clamp, lerp, prog, bump, E, sp, MUELLE, vaiven, pasos, claves, h01, ruido, rgb, mezcla, alfa, luz, aclarar, oscurecer,
  fuente, letras, ancho, ajustar, partir, numero, norm, rr, zoomEn, trazo, mancha, caja, arnes } from './core.js';
import { tema as cargarTema, FUENTES } from './temas.js';
import { icono, ICONOS } from './iconos.js';
import { presentador, EMOCIONES, mezclarEmo, manos, R as HR, CY as HCY, ALTO as HALTO } from './presentador.js';

const P = '/p/';
const [spec, WORDS, VO] = await Promise.all([
  fetch(P + 'video.json').then((r) => r.json()),
  fetch(P + 'words.json').then((r) => r.json()),
  fetch(P + 'vo_env.json').then((r) => r.json()).catch(() => null),
]);
const T = cargarTema(spec.tema, spec.ajustes);
const C = T.colores;
const host = { ...T.host, ...(spec.presentador || {}) };

// ---------------------------------------------------------------- fuentes
const famD = FUENTES[T.display[0]].fam, pesoD = T.display[1];
const famU = FUENTES[T.ui[0]].fam, pesoU = T.ui[1];
await Promise.all([[T.display[0], pesoD], [T.ui[0], pesoU], ['rubik', 800], ['rubik', 600]].map(async ([k, w]) => {
  const f = FUENTES[k]; const file = f.archivos[w] || Object.values(f.archivos)[0];
  const ff = new FontFace(f.fam, `url(/fuentes/${file})`, { weight: String(w) });
  document.fonts.add(await ff.load());
}));
const FD = (s) => fuente(s, pesoD, famD), FU = (s, w = pesoU) => fuente(s, w, famU);

// ---------------------------------------------------------------- tiempo de palabras
const NW = WORDS.map((w) => norm(w[0]));
const ULT = WORDS[WORDS.length - 1][2];
const DUR = spec.duracion || +(ULT + (spec.cola ?? 1.4)).toFixed(2);
function buscar(q, desde = 0) {
  if (q == null) return -1;
  if (typeof q === 'number') return q;
  const parts = String(q).split(/\s+/).map(norm).filter(Boolean);
  for (const exact of [true, false]) for (let i = Math.max(0, desde); i < NW.length; i++)
    if (parts.every((p, j) => (exact ? NW[i + j] === p : (NW[i + j] || '').startsWith(p)))) return i;
  console.warn('palabra no encontrada:', q); return -1;
}
const tPal = (i) => (i >= 0 ? WORDS[i][1] : null);
const talk = (t) => { if (!VO) return 0; const i = t * VO.rate, a = Math.floor(i), f = i - a; return (VO.env[a] || 0) * (1 - f) + (VO.env[a + 1] || 0) * f; };

// ---------------------------------------------------------------- eventos (sonido + cámara)
const EV = [], PUNCH = [], SHAKE = [];
const ev = (t, s, o = {}) => EV.push({ t: +t.toFixed(3), s, ...o });

// ---------------------------------------------------------------- compilar escenas
const escenas = [];
let cursor = 0;
spec.escenas.forEach((e, i) => {
  const i0 = i === 0 ? 0 : buscar(e.en, cursor);
  const t0 = i === 0 ? 0 : tPal(i0) - (e.antes ?? 0.12);
  cursor = Math.max(cursor, i0);
  escenas.push({ ...e, i0, t0, idx: i });
});
escenas.forEach((s, i) => {
  s.t1 = i + 1 < escenas.length ? escenas[i + 1].t0 : DUR + 0.5;
  s.i1 = i + 1 < escenas.length ? escenas[i + 1].i0 : WORDS.length;
  s.bg = C[s.fondo] || s.fondo || (i === 0 ? C.fondo : null);
});
escenas.forEach((s, i) => { if (!s.bg) s.bg = escenas[i - 1].bg; s.ink = luz(s.bg) < 0.5 ? '#FFFFFF' : C.texto === '#FFFFFF' ? T.tinta : C.texto; });
// transiciones automáticas: rota las del tema sin repetir dos seguidas
let ti = 0;
escenas.forEach((s, i) => {
  if (i === 0) { s.trans = 'corte'; return; }
  if (!s.transicion || s.transicion === 'auto') { s.trans = T.transiciones[ti % T.transiciones.length]; ti++; } else s.trans = s.transicion;
  const snd = { empujar: 'whoosh', mancha: 'swish', iris: 'swoosh', persiana: 'whoosh', corte: 'thud' }[s.trans];
  ev(s.t0 - 0.12, snd, { g: 0.22 });
});
// tiempo de cada palabra dentro de una escena (para texto que aparece mientras se dice)
function tiemposLinea(s, palabras, anclaQ) {
  let k = anclaQ != null ? buscar(anclaQ, s.i0) : s.i0;
  if (k < 0) k = s.i0;
  const t0 = anclaQ != null ? tPal(k) : Math.max(s.t0 + 0.05, tPal(s.i0) ?? s.t0);
  const hits = palabras.map(() => null);
  palabras.forEach((w, j) => {
    const nw = norm(w); if (!nw) return;
    for (let q = k; q < Math.min(s.i1 + 1, k + 10); q++) if (NW[q] === nw || (nw.length > 3 && NW[q]?.startsWith(nw.slice(0, Math.max(4, nw.length - 2))))) { hits[j] = tPal(q); k = q + 1; break; }
  });
  const n = hits.filter((x) => x != null).length;
  if (n < Math.ceil(palabras.length * 0.5)) { // la línea parafrasea la voz: entra completa en su ancla
    const base = anclaQ != null ? t0 : (hits.find((x) => x != null) ?? t0);
    return palabras.map((_, j) => base + j * 0.05);
  }
  for (let j = 0; j < hits.length; j++) if (hits[j] == null) {
    let nx = null; for (let q = j + 1; q < hits.length; q++) if (hits[q] != null) { nx = hits[q] - 0.05 * (q - j); break; }
    hits[j] = nx ?? ((j ? hits[j - 1] : t0) + 0.07);
  }
  for (let j = 1; j < hits.length; j++) hits[j] = Math.max(hits[j], hits[j - 1]);
  return hits;
}
const TAM = { xl: 250, l: 150, m: 104, s: 62 };
const tmp = document.createElement('canvas').getContext('2d');
// maquetar titulares
function marcado(txt) {
  // *acento*  _marcador_  ~caja~  (pueden abarcar varias palabras y llevar signos alrededor)
  const out = []; let modo = null;
  const MK = { '*': 'acento', '_': 'marcador', '~': 'caja' };
  txt.split(/\s+/).filter(Boolean).forEach((tok) => {
    const m = tok.match(/^([¿¡"«(]*)([*_~]?)(.*?)([*_~]?)([?!.,:;"»)]*)$/);
    let [, pre, ab, core, ci, post] = m;
    if (ab && !modo) modo = MK[ab];
    const cur = modo;
    if (ci && modo) modo = null;
    out.push({ w: pre + core + post, m: cur });
  });
  return out;
}
function maquetar(s, factor) {
  const zonaAncho = ZONA.arriba.w - 20;
  let y = ZONA.arriba.y + 20, prevT = -1;
  if (s.item && !(s.lineasSpec || s.lineas || []).length) y += 128;
  s.lineas = (s.lineasSpec || (s.lineasSpec = s.lineas || [])).map((L, li) => {
    const indent = s.item && li === 0 ? 150 : 0;
    const tam = L.tam || 'm', esD = tam !== 's';
    let txt = L.txt; if (T.mayusculas && esD && !L.minusculas) txt = txt.toUpperCase();
    const toks = marcado(txt);
    let size = Math.round((L.max || TAM[tam]) * factor);
    const fam = (sz) => (esD ? FD(sz) : FU(sz));
    const plain = toks.map((x) => x.w).join(' ');
    // reducir hasta que la palabra más larga quepa; luego partir en renglones
    const longest = toks.reduce((a, b) => (ancho(tmp, b.w, fam(100)) > ancho(tmp, a.w, fam(100)) ? b : a), toks[0]);
    size = Math.min(size, ajustar(tmp, longest.w, esD ? pesoD : pesoU, esD ? famD : famU, zonaAncho - indent, size));
    if (tam === 'xl') size = Math.min(size, Math.max(TAM.l, ajustar(tmp, plain, esD ? pesoD : pesoU, esD ? famD : famU, zonaAncho, size)));
    const maxRows = L.renglones || (tam === 's' ? 2 : 2);
    const wrap = (sz) => { // reparte en renglones de ancho parecido (sin palabras huérfanas)
      const ff = fam(sz), tot = ancho(tmp, plain, ff);
      const nR = Math.max(1, Math.ceil((tot + indent) / zonaAncho - 0.02));
      const objetivo = tot / nR;
      const rs = []; let cur = [];
      toks.forEach((tk) => { const test = [...cur, tk].map((x) => x.w).join(' '); const wt = ancho(tmp, test, ff), lim = zonaAncho - (rs.length ? 0 : indent);
        if (cur.length && (wt > lim || (rs.length < nR - 1 && wt > objetivo * 1.12))) { rs.push(cur); cur = [tk]; } else cur.push(tk); });
      if (cur.length) rs.push(cur);
      return rs;
    };
    let renglones = wrap(size);
    while (renglones.length > maxRows && size > TAM[tam] * 0.5) { size -= 4; renglones = wrap(size); }
    const f = fam(size);
    const tiempos = tiemposLinea(s, toks.map((x) => x.w), L.en).map((x) => Math.max(x, prevT));
    prevT = tiempos[0];
    let wi = 0;
    const lh = size * (esD ? 0.96 : 1.18);
    const rows = renglones.map((rw, ri) => {
      const lineW = ancho(tmp, rw.map((x) => x.w).join(' '), f);
      const x0 = T.alineacion === 'centro' ? 540 - lineW / 2 : ZONA.arriba.x + (ri === 0 ? indent : 0);
      y += lh;
      let x = x0; const sp1 = ancho(tmp, ' ', f);
      const words = rw.map((tk) => { const w = ancho(tmp, tk.w, f); const o = { txt: tk.w, m: tk.m, x, w, t: tiempos[wi++] }; x += w + sp1; return o; });
      return { y, words, w: lineW, x0 };
    });
    y += size * (esD ? 0.16 : 0.22);
    const color = L.color ? (C[L.color] || L.color) : null;
    rows.forEach((r) => r.words.forEach((wd) => {
      if (wd.m) { ev(wd.t, 'pop', { g: 0.16, p: 4 + (li % 3) * 2 }); PUNCH.push([wd.t, 0.03]); }
    }));
    if (rows[0]) ev(rows[0].words[0].t, tam === 'xl' ? 'thud' : 'pop', { g: tam === 'xl' ? 0.2 : 0.1, p: -2 });
    if (L.golpe && rows[0]) { const tg = rows[rows.length - 1].words.at(-1).t; SHAKE.push([tg, 22]); ev(tg, 'impacto', { g: 0.35 }); }
    if (indent && rows[0]) s.badgeY = rows[0].y - size * 0.36;
    return { tam, size, f, rows, color, esD, entrada: L.entrada || T.entrada, golpe: L.golpe, li };
  });
  s.yTexto = y;
}
// el título cede espacio al visual: si el bloque de texto es muy alto, se reduce hasta caber
escenas.forEach((s) => {
  const ev0 = EV.length, p0 = PUNCH.length, s0 = SHAKE.length;
  let f = 1;
  for (;;) {
    EV.length = ev0; PUNCH.length = p0; SHAKE.length = s0;
    maquetar(s, f);
    const lim = s.visual ? (s.visual.tipo === 'cta' ? 560 : 640) : 900;
    if (s.yTexto <= lim || f < 0.6) break;
    f -= 0.06;
  }
});

// ---------------------------------------------------------------- visuales (compilar tiempos y sonidos)
const tEn = (s, q, def) => { if (q == null) return def; const i = buscar(q, s.i0); return i >= 0 ? tPal(i) : def; };
escenas.forEach((s) => {
  const v = s.visual; if (!v) return;
  const tPrimera = s.lineas.length ? s.lineas[0].rows[0]?.words.at(-1).t ?? s.t0 : s.t0;
  v.t = tEn(s, v.en, tPrimera + 0.35);
  v.y0 = s.yTexto + 24; v.y1 = 1035; v.cx = 520;
  const tipo = v.tipo;
  if (tipo === 'dato') { v.dur = v.duracion ?? 0.9; ev(v.t, 'pop', { g: 0.2 }); for (let k = 0; k < 8; k++) ev(v.t + k * v.dur / 8, 'tick', { g: 0.07, p: k }); ev(v.t + v.dur, 'ding', { g: 0.18 }); PUNCH.push([v.t + v.dur, 0.05]); }
  if (tipo === 'comparar') ['a', 'b'].forEach((k, j) => { v[k].t = tEn(s, v[k].en, v.t + j * 0.5); ev(v[k].t, 'pop', { g: 0.2, p: j * 3 }); PUNCH.push([v[k].t, 0.035]); if (v.barras !== false) ev(v[k].t + 0.15, 'subida', { g: 0.1 }); });
  if (tipo === 'icono') { ev(v.t, 'pop', { g: 0.22, p: -3 }); PUNCH.push([v.t, 0.04]); if (v.icono === 'corazon') for (let k = 1; k < 8; k++) ev(v.t + k * 0.62, 'latido', { g: 0.18 }); if (v.orbitas) ev(v.t + 0.2, 'subida', { g: 0.14 }); if (v.anim?.nivel) ev(v.t + 0.1, 'burbujas', { g: 0.12 }); }
  if (tipo === 'barras' || tipo === 'pasos' || tipo === 'iconos') (v.items || v.lista).forEach((it, j) => { it.t = tEn(s, it.en, v.t + j * 0.45); ev(it.t, tipo === 'pasos' ? 'ding' : 'pop', { g: 0.16, p: j * 2 }); PUNCH.push([it.t, 0.025]); });
  if (tipo === 'sello') { v.t = tEn(s, v.en, v.t); ev(v.t, 'sello', { g: 0.4 }); SHAKE.push([v.t, 26]); }
  if (tipo === 'cta') { ev(v.t + 0.55, 'click', { g: 0.3 }); ev(v.t + 0.62, 'ding', { g: 0.2, p: 5 }); }
  if (tipo === 'cita') ev(v.t, 'pop', { g: 0.15 });
});
// momentos (cambios del presentador y efectos dentro de una escena)
const hostKeys = [{ t: -1, emocion: 'feliz', gesto: 'reposo', pos: escenas[0].visual ? 'abajo' : 'centro', brillo: 0 }];
escenas.forEach((s) => {
  const hp = s.presentador || {};
  hostKeys.push({ t: s.t0, pos: hp.pos || (s.visual ? 'abajo' : 'centro'), emocion: hp.emocion || 'feliz', gesto: hp.gesto || (s.visual ? 'presentar' : 'reposo'), brillo: hp.brillo ?? 0, sudor: hp.sudor ?? 0, salto: hp.saltar });
  (s.momentos || []).forEach((m) => {
    const t = tEn(s, m.en, s.t0) + (m.retraso || 0);
    if (m.presentador) hostKeys.push({ t, ...m.presentador });
    if (m.efecto === 'golpe') { SHAKE.push([t, 24]); ev(t, 'impacto', { g: 0.35 }); }
    if (m.efecto === 'apagon') { s.apagon = t; ev(t, 'apagon', { g: 0.25 }); }
    if (m.efecto === 'zoom') PUNCH.push([t, 0.08]);
  });
});
hostKeys.sort((a, b) => a.t - b.t);
let acum = {};
hostKeys.forEach((k) => { acum = { ...acum, ...Object.fromEntries(Object.entries(k).filter(([, v]) => v !== undefined)) }; Object.assign(k, acum); });
hostKeys.forEach((k, i) => { if (i && hostKeys[i].salto) ev(k.t, 'boing', { g: 0.12 }); });
const POS = { centro: [540, 1340, 1.05], abajo: [540, 1342, 0.74], izq: [250, 1335, 0.62], der: [770, 1335, 0.6], grande: [540, 1395, 1.45], oculto: [540, 2400, 0.6] };
const hostPath = hostKeys.map((k) => [k.t, POS[k.pos] || k.pos || POS.centro]);
// guiño final
ev(ULT + 0.35, 'ding', { g: 0.16, p: 7 });

// ---------------------------------------------------------------- subtítulos (fragmentos de 1–3 palabras)
const trozos = [];
{
  let cur = [];
  WORDS.forEach((w, i) => {
    cur.push(i);
    const txt = cur.map((j) => WORDS[j][0]).join(' ');
    const fin = /[.,;:!?¡¿…]$/.test(w[0]) || cur.length >= 3 || txt.length > 16 || (WORDS[i + 1] && WORDS[i + 1][1] - w[2] > 0.25);
    if (fin) { trozos.push(cur); cur = []; }
  });
  if (cur.length) trozos.push(cur);
}
const escenaEn = (t) => { let s = escenas[0]; for (const e of escenas) if (t >= e.t0) s = e; return s; };
const subt = trozos.map((ids) => {
  const t0 = WORDS[ids[0]][1], t1 = WORDS[ids.at(-1)][2];
  const s = escenaEn(t0 + 0.05);
  const vis = new Set(s.lineas.flatMap((L) => L.rows.flatMap((r) => r.words.map((w) => norm(w.txt)))));
  if (s.visual?.etiqueta) s.visual.etiqueta.split(/\s+/).forEach((w) => vis.add(norm(w)));
  const hits = ids.filter((j) => vis.has(NW[j])).length;
  return { ids, t0, t1, oculto: spec.subtitulos === false || hits / ids.length >= 0.6 };
});

// ---------------------------------------------------------------- fondos
function fondo(ctx, s, t) {
  ctx.fillStyle = s.bg; ctx.fillRect(-100, -100, W + 200, H + 200);
  const oscuro = luz(s.bg) < 0.5, m = oscuro ? '#FFFFFF' : T.tinta;
  if (T.formas) { // manchas suaves de profundidad
    [[200, 520, 380, 1], [930, 1100, 460, 2], [300, 1650, 420, 3]].forEach(([x, y, r, k]) => {
      ctx.fillStyle = oscuro ? alfa('#FFFFFF', 0.04) : alfa(mezcla(s.bg, C.fondo2 === s.bg ? C.acento : C.fondo2, 0.6), 0.32);
      mancha(ctx, x + Math.sin(t * 0.3 + k) * 40, y + Math.cos(t * 0.25 + k) * 30, r, t * 0.6, k, 0.14); ctx.fill();
    });
  }
  const mot = s.motivo || T.motivo;
  ctx.save();
  if (mot === 'puntos') { ctx.fillStyle = alfa(m, 0.08); const off = (t * 18) % 64; for (let y = -64; y < H + 64; y += 64) for (let x = -64; x < W + 64; x += 64) { ctx.beginPath(); ctx.arc(x + off + ((y / 64) % 2) * 32, y + off, 4.5, 0, TAU); ctx.fill(); } }
  else if (mot === 'cuadricula') { ctx.strokeStyle = alfa(m, 0.07); ctx.lineWidth = 2; const off = (t * 12) % 72; ctx.beginPath(); for (let x = -72; x < W + 72; x += 72) { ctx.moveTo(x + off, 0); ctx.lineTo(x + off, H); } for (let y = -72; y < H + 72; y += 72) { ctx.moveTo(0, y + off); ctx.lineTo(W, y + off); } ctx.stroke(); }
  else if (mot === 'rayas') { ctx.fillStyle = alfa(m, 0.045); const off = (t * 30) % 120; for (let x = -H; x < W + H; x += 120) { ctx.beginPath(); ctx.moveTo(x + off, 0); ctx.lineTo(x + off + 50, 0); ctx.lineTo(x + off + 50 - H * 0.5, H); ctx.lineTo(x + off - H * 0.5, H); ctx.fill(); } }
  else if (mot === 'estrellas') { for (let i = 0; i < 70; i++) { const x = h01(i, 51) * W, y = (h01(i, 53) * H + t * 8 * h01(i, 59)) % H, r = 2 + h01(i, 55) * 5, a = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * (1.5 + h01(i, 57) * 3) + i)); ctx.fillStyle = alfa('#FFFFFF', a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); } }
  else if (mot === 'burbujas') { ctx.strokeStyle = alfa(m, 0.12); ctx.lineWidth = 4; for (let i = 0; i < 26; i++) { const x = h01(i, 7) * W + Math.sin(t * 1.5 + i) * 16, sp1 = 60 + h01(i, 9) * 120, y = H + 60 - ((t * sp1 + h01(i, 13) * H * 1.3) % (H * 1.3)); ctx.beginPath(); ctx.arc(x, y, 8 + h01(i, 11) * 22, 0, TAU); ctx.stroke(); } }
  else if (mot === 'papel') { ctx.strokeStyle = alfa(m, 0.05); ctx.lineWidth = 2; for (let i = 0; i < 90; i++) { const x = h01(i, 61) * W, y = h01(i, 63) * H, l = 20 + h01(i, 65) * 60, a = h01(i, 67) * TAU; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke(); }
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, alfa('#5A3A1A', 0.18)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  else if (mot === 'circuito') { ctx.strokeStyle = alfa(C.acento, 0.12); ctx.lineWidth = 3; for (let i = 0; i < 16; i++) { const y = h01(i, 71) * H, x0 = h01(i, 73) * W * 0.5, L = 200 + h01(i, 75) * 400; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + L * 0.6, y); ctx.lineTo(x0 + L * 0.6 + 60, y + 60); ctx.lineTo(x0 + L, y + 60); ctx.stroke(); const q = ((t * 0.4 + h01(i, 77)) % 1); ctx.fillStyle = alfa(C.acento, 0.5); ctx.beginPath(); ctx.arc(x0 + L * 0.6 * q, y, 6, 0, TAU); ctx.fill(); } }
  ctx.restore();
}

// ---------------------------------------------------------------- titulares
function dibujaTitulares(ctx, s, t) {
  s.lineas.forEach((L) => {
    const ink = L.color || s.ink;
    L.rows.forEach((r, ri) => {
      let x1 = 1e9, x2 = -1e9;
      r.words.forEach((wd, wi) => {
        const tin = wd.t - 0.06;
        if (t < tin) return;
        const k = sp(t, tin, MUELLE.rebote);
        // fondo del énfasis
        if (wd.m === 'marcador' || wd.m === 'caja') {
          const p = E.outC(prog(t, tin, tin + 0.22));
          ctx.save(); ctx.translate(wd.x - 12, r.y - L.size * 0.78); ctx.rotate(-0.02);
          rr(ctx, 0, 0, (wd.w + 24) * p, L.size * 0.92, wd.m === 'caja' ? 16 : 6); ctx.fillStyle = wd.m === 'caja' ? C.acento : alfa(C.acento3, 0.9); ctx.fill(); ctx.restore();
        }
        const col = wd.m === 'acento' ? (L.color === C.acento ? C.acento2 : C.acento) : wd.m === 'caja' ? '#FFFFFF' : ink;
        const G = letras(ctx, wd.txt, L.f);
        G.g.forEach((g, gi) => {
          const kk = L.entrada === 'maquina' ? (t >= tin + gi * 0.025 ? 1 : 0) : sp(t, tin + gi * 0.012, MUELLE.rebote);
          if (kk <= 0.001) return;
          ctx.save();
          if (L.entrada === 'escala') { ctx.translate(wd.x + g.cx, r.y - L.size * 0.32); ctx.scale(kk, kk); ctx.translate(-g.cx, L.size * 0.32); }
          else if (L.entrada === 'deslizar') { ctx.translate(wd.x - (1 - kk) * 80, r.y); ctx.transform(1, 0, -0.25 * (1 - kk), 1, 0, 0); }
          else if (L.entrada === 'maquina') ctx.translate(wd.x, r.y);
          else { ctx.translate(wd.x + g.cx, r.y + (1 - kk) * L.size * 0.9); ctx.rotate((1 - kk) * 0.35 * (gi % 2 ? 1 : -1)); ctx.translate(-g.cx, 0); }
          ctx.font = L.f; ctx.fillStyle = col; ctx.fillText(g.ch, g.x, 0);
          ctx.restore();
        });
        if (wd.m === 'acento' && T.subrayado !== false) { const p = E.outC(prog(t, tin + 0.1, tin + 0.35)); if (p > 0) { ctx.beginPath(); ctx.moveTo(wd.x, r.y + L.size * 0.1); ctx.quadraticCurveTo(wd.x + wd.w * 0.5 * p, r.y + L.size * 0.18, wd.x + wd.w * p, r.y + L.size * 0.08); ctx.strokeStyle = alfa(col, 0.85); ctx.lineWidth = Math.max(5, L.size * 0.06); ctx.lineCap = 'round'; ctx.stroke(); } }
        x1 = Math.min(x1, wd.x); x2 = Math.max(x2, wd.x + wd.w);
      });
      if (x2 > x1) caja('texto', `L${s.idx}.${L.li}.${ri}`, x1, r.y - L.size * 0.8, x2 - x1, L.size);
    });
  });
}

// ---------------------------------------------------------------- insignia de lista + progreso
function insignia(ctx, s, t) {
  if (!s.item) return;
  const t0 = tPal(s.i0) - 0.04, k = sp(t, t0, MUELLE.gelatina);
  if (k <= 0) return;
  const bx = ZONA.arriba.x + 64, by = s.badgeY ?? ZONA.arriba.y + 80;
  const m = E.inOutC(prog(t, t0 + 0.42, t0 + 0.78));
  const x = lerp(540, bx, m), y = lerp(760, by, m), sc = lerp(2.9, 1, m) * k;
  ctx.save(); ctx.translate(x, y); ctx.rotate((1 - k) * -1.2 + (1 - m) * Math.sin(t * 9) * 0.06); ctx.scale(sc, sc);
  ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i * TAU / 24, q = i % 2 ? 57 : 66; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath();
  trazo(ctx, s.bg === C.acento ? C.tinta : C.acento, T.tinta, T.contorno / lerp(2.2, 1, m));
  ctx.fillStyle = '#FFFFFF'; ctx.font = FD(74); ctx.textAlign = 'center'; ctx.fillText(String(s.item), 0, 27);
  ctx.restore();
  caja('insignia', 'item' + s.idx, bx - 66, by - 66, 132, 132);
  const n = spec.lista; if (!n || m < 1) return;
  // puntos de progreso de la lista bajo el visual (no compiten con el título)
}
// ---------------------------------------------------------------- visuales
function tarjeta(ctx, x, y, w, h, fillC) { rr(ctx, x, y, w, h, T.radio); trazo(ctx, fillC || '#FFFFFF', T.tinta, T.contorno); }
function visual(ctx, s, t) {
  const v = s.visual; if (!v || t < v.t - 0.1) return;
  const ink = s.ink, cx = v.cx, y0 = v.y0, y1 = Math.max(v.y0 + 220, v.y1), cy = (y0 + y1) / 2, ht = y1 - y0;
  const lw = T.contorno, io = { t, tinta: T.tinta };
  if (v.tipo === 'dato') {
    const p = E.outQuint(prog(t, v.t, v.t + v.dur)), k = sp(t, v.t, MUELLE.rebote);
    const val = (v.desde ?? 0) + (v.valor - (v.desde ?? 0)) * p;
    const txt = (v.prefijo || '') + numero(val, v.dec || 0, v.miles !== false) + (v.sufijo || '');
    const full = (v.prefijo || '') + numero(v.valor, v.dec || 0, v.miles !== false) + (v.sufijo || '');
    const hasI = !!v.icono, iw = hasI ? 190 : 0;
    const size = Math.min(260, ajustar(ctx, full, pesoD, famD, 850 - iw), ht * 0.52);
    const tw = ancho(ctx, full, FD(size)), x0 = cx - (tw + iw) / 2 + iw;
    if (hasI) icono(ctx, v.icono, x0 - 108, cy - size * 0.3, Math.min(95, size * 0.42), sp(t, v.t - 0.1, MUELLE.gelatina), { ...io, ...(v.opciones || {}) });
    ctx.save(); ctx.translate(x0, cy + size * 0.1); ctx.scale(lerp(0.6, 1, k) * (1 + 0.08 * bump(t, v.t + v.dur, 0.12)), lerp(0.6, 1, k));
    ctx.font = FD(size); ctx.fillStyle = v.color ? (C[v.color] || v.color) : C.acento; ctx.lineWidth = lw * 1.4; ctx.strokeStyle = T.tinta; ctx.lineJoin = 'round';
    if (v.contorno !== false) ctx.strokeText(txt, 0, 0); ctx.fillText(txt, 0, 0); ctx.restore();
    if (v.etiqueta) { const ke = sp(t, tEn(s, v.etiquetaEn, v.t + 0.3), MUELLE.rapido); const f = FU(Math.min(58, ajustar(ctx, v.etiqueta, pesoU, famU, 840))); ctx.save(); ctx.globalAlpha = clamp(ke); ctx.font = f; ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(v.etiqueta, cx, cy + size * 0.1 + 80 - (1 - ke) * 30); ctx.restore(); }
    caja('visual', 'dato' + s.idx, x0 - iw, cy - size * 0.75, tw + iw, size * 0.9 + 90);
  } else if (v.tipo === 'comparar') {
    const cw = 350, chh = clamp(ht - 10, 300, 470), gap = 110, xs = [cx - gap / 2 - cw, cx + gap / 2];
    const mx = Math.max(+v.a.valor || 0, +v.b.valor || 0);
    ['a', 'b'].forEach((key, j) => {
      const d = v[key], k = sp(t, d.t - 0.05, MUELLE.rebote); if (k <= 0.001) return;
      const x = xs[j], y = cy - chh / 2 + (1 - k) * 120;
      ctx.save(); ctx.translate(x + cw / 2, y + chh / 2); ctx.rotate((1 - k) * (j ? 0.2 : -0.2) + (j ? 0.02 : -0.02)); ctx.translate(-(x + cw / 2), -(y + chh / 2));
      tarjeta(ctx, x, y, cw, chh, d.fondo || '#FFFFFF');
      if (d.icono) icono(ctx, d.icono, x + cw / 2, y + chh * 0.23, chh * 0.15, sp(t, d.t + 0.05, MUELLE.gelatina), { ...io, ...(d.opciones || {}) });
      const p = E.outQuint(prog(t, d.t + 0.1, d.t + 0.8));
      const valTxt = d.valor != null ? (typeof d.valor === 'number' ? numero(d.valor * p, d.dec || 0) : d.valor) + (d.sufijo || '') : '';
      const fs = Math.min(chh * 0.27, ajustar(ctx, (typeof d.valor === 'number' ? numero(d.valor, d.dec || 0) : d.valor) + (d.sufijo || ''), pesoD, famD, cw - 40));
      ctx.font = FD(fs); ctx.textAlign = 'center'; ctx.fillStyle = d.color ? (C[d.color] || d.color) : (j ? C.acento : C.acento2); ctx.fillText(valTxt, x + cw / 2, y + chh * 0.53 + fs * 0.32);
      ctx.font = FU(Math.min(44, ajustar(ctx, d.etiqueta || '', pesoU, famU, cw - 40))); ctx.fillStyle = T.tinta; ctx.fillText(d.etiqueta || '', x + cw / 2, y + chh - chh * 0.08);
      if (v.barras !== false && typeof d.valor === 'number' && mx > 0) { const bw = (cw - 60) * (d.valor / mx) * E.outC(prog(t, d.t + 0.15, d.t + 0.9)); const byy = y + chh * 0.71; rr(ctx, x + 30, byy, cw - 60, 22, 11); ctx.fillStyle = alfa(T.tinta, 0.1); ctx.fill(); rr(ctx, x + 30, byy, Math.max(22, bw), 22, 11); ctx.fillStyle = d.color ? (C[d.color] || d.color) : (j ? C.acento : C.acento2); ctx.fill(); }
      ctx.restore();
      caja('visual', 'comp' + key + s.idx, x, y, cw, chh);
    });
    const kv = sp(t, v.b.t - 0.05, MUELLE.gelatina);
    if (kv > 0.01) { ctx.save(); ctx.translate(cx, cy); ctx.scale(kv, kv); ctx.rotate(-0.1); ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); trazo(ctx, C.acento3, T.tinta, lw); ctx.fillStyle = T.tinta; ctx.font = FD(52); ctx.textAlign = 'center'; ctx.fillText(v.vs || 'VS', 0, 18); ctx.restore(); }
  } else if (v.tipo === 'icono') {
    const k = sp(t, v.t - 0.05, MUELLE.gelatina), r = Math.min(210, ht * (v.etiqueta ? 0.33 : 0.42));
    const o = { ...io, ...(v.opciones || {}) };
    if (v.anim?.nivel) o.nivel = lerp(v.anim.nivel[0], v.anim.nivel[1], E.inOutS(prog(t, v.t + 0.15, v.t + (v.anim.dur || 1.6))));
    if (v.orbitas) { // trayectoria que da N vueltas alrededor del icono
      const to = tEn(s, v.orbitasEn, v.t + 0.2), p = E.inOutS(prog(t, to, to + 2.0)), tot = v.orbitas * TAU * p;
      ctx.save(); ctx.translate(cx, cy - (v.etiqueta ? 30 : 0)); ctx.strokeStyle = v.colorOrbita ? (C[v.colorOrbita] || v.colorOrbita) : C.acento; ctx.lineWidth = 18; ctx.lineCap = 'round';
      ctx.beginPath(); for (let a = 0; a <= tot; a += 0.05) { const rr2 = r * (1.5 + a * 0.05); const x = Math.cos(a - Math.PI / 2) * rr2, y = Math.sin(a - Math.PI / 2) * rr2 * 0.55; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      if (p > 0) { const rr2 = r * (1.5 + tot * 0.05); ctx.beginPath(); ctx.arc(Math.cos(tot - Math.PI / 2) * rr2, Math.sin(tot - Math.PI / 2) * rr2 * 0.55, 20, 0, TAU); trazo(ctx, C.acento3, T.tinta, lw * 0.7); }
      ctx.restore();
    }
    icono(ctx, v.icono, cx, cy - (v.etiqueta ? 30 : 0), r, k, o);
    if (v.etiqueta) { const ke = sp(t, tEn(s, v.etiquetaEn, v.t + 0.35), MUELLE.rapido); if (ke > 0.01) { const f = FD(Math.min(66, ajustar(ctx, v.etiqueta, pesoD, famD, 700))); const w = ancho(ctx, v.etiqueta, f) + 60; ctx.save(); ctx.translate(cx, cy + r + 30); ctx.scale(ke, ke); ctx.rotate(-0.03); rr(ctx, -w / 2, -52, w, 88, 44); trazo(ctx, C.acento, T.tinta, lw); ctx.fillStyle = '#FFFFFF'; ctx.font = f; ctx.textAlign = 'center'; ctx.fillText(v.etiqueta, 0, 14); ctx.restore(); } }
    caja('visual', 'icono' + s.idx, cx - r, cy - r - 30, 2 * r, 2 * r + (v.etiqueta ? 110 : 0));
  } else if (v.tipo === 'barras') {
    const n = v.items.length, bh = Math.min(110, (ht - 20) / n - 26), mx = Math.max(...v.items.map((i) => i.valor));
    v.items.forEach((it, j) => {
      const y = y0 + 10 + j * (bh + 26), p = E.outC(prog(t, it.t, it.t + 0.7)), k = sp(t, it.t - 0.05, MUELLE.rapido); if (k <= 0.001) return;
      const lab = 270, bwMax = 840 - lab - 150, bw = bwMax * (it.valor / mx) * p;
      ctx.font = FU(Math.min(52, bh * 0.55)); ctx.fillStyle = ink; ctx.textAlign = 'right'; ctx.globalAlpha = clamp(k); ctx.fillText(it.etiqueta, 72 + lab - 16, y + bh * 0.68); ctx.globalAlpha = 1;
      rr(ctx, 72 + lab, y, Math.max(bh, bw), bh, bh / 2); trazo(ctx, it.color ? (C[it.color] || it.color) : [C.acento, C.acento2, C.acento3][j % 3], T.tinta, lw * 0.7);
      ctx.font = FD(Math.min(64, bh * 0.7)); ctx.textAlign = 'left'; ctx.fillStyle = ink; if (k > 0.05) ctx.fillText(numero(it.valor * p, it.dec || 0) + (v.unidad || ''), 72 + lab + Math.max(bh, bw) + 16, y + bh * 0.74);
    });
    caja('visual', 'barras' + s.idx, 72, y0, 858, n * (bh + 26));
  } else if (v.tipo === 'pasos' || v.tipo === 'iconos') {
    const items = v.items || v.lista, n = items.length;
    if (v.tipo === 'iconos') {
      const gap = 840 / n, ri = Math.min(130, gap * 0.38, ht * 0.3);
      items.forEach((it, j) => { const k = sp(t, it.t - 0.05, MUELLE.gelatina), x = cx - 420 + gap * (j + 0.5); icono(ctx, it.icono, x, cy - 30, ri, k, { ...io, ...(it.opciones || {}) }); if (it.etiqueta && k > 0.01) { ctx.font = FU(Math.min(50, ajustar(ctx, it.etiqueta, pesoU, famU, gap - 16))); ctx.textAlign = 'center'; ctx.fillStyle = ink; ctx.globalAlpha = clamp(k); ctx.fillText(it.etiqueta, x, cy + ri + 40); ctx.globalAlpha = 1; } });
      caja('visual', 'iconos' + s.idx, cx - 420, cy - 120, 840, 250);
    } else {
      const rh = Math.min(130, ht / n);
      items.forEach((it, j) => { const k = sp(t, it.t - 0.05, MUELLE.rapido), y = y0 + j * rh + rh / 2; if (k <= 0.001) return; icono(ctx, it.icono || 'check', 125, y, Math.min(46, rh * 0.36), sp(t, it.t, MUELLE.gelatina), io); ctx.save(); ctx.globalAlpha = clamp(k); ctx.font = FU(Math.min(62, rh * 0.48, ajustar(ctx, it.txt, pesoU, famU, 740))); ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.fillText(it.txt, 190 + (1 - k) * 40, y + rh * 0.16); ctx.restore(); });
      caja('visual', 'pasos' + s.idx, 80, y0, 850, n * rh);
    }
  } else if (v.tipo === 'cita') {
    const k = sp(t, v.t, MUELLE.rapido);
    ctx.font = FD(260); ctx.fillStyle = alfa(C.acento, 0.9); ctx.fillText('“', 60, y0 + 190);
    const f = FD(Math.min(96, ajustar(ctx, v.txt, pesoD, famD, 2200))), rows = partir(ctx, v.txt, f, 780), lh = parseInt(f.split(' ')[1]) * 1.12;
    const words = rows.map((r) => r.split(' ')), tw = tiemposLinea(s, v.txt.split(/\s+/), v.en); let wi = 0;
    words.forEach((r, ri) => { let x = 140; r.forEach((w) => { const tt = tw[wi++]; ctx.font = f; const ww = ancho(ctx, w + ' ', f); ctx.fillStyle = t >= tt - 0.05 ? ink : alfa(ink, 0.25); ctx.fillText(w, x, y0 + 130 + ri * lh); x += ww; }); });
    if (v.autor) { ctx.font = FU(42); ctx.fillStyle = C.acento; ctx.globalAlpha = clamp(k); ctx.fillText('— ' + v.autor, 140, y0 + 150 + rows.length * lh); ctx.globalAlpha = 1; }
    caja('visual', 'cita' + s.idx, 60, y0, 860, 150 + rows.length * lh);
  } else if (v.tipo === 'sello') {
    const p = prog(t, v.t - 0.12, v.t), k = p < 1 ? lerp(3, 1, E.inC(p)) : 1 + 0.06 * vaiven(t - v.t, 3, 6);
    if (p <= 0) return;
    const col = v.color ? (C[v.color] || v.color) : (/(mito|falso)/i.test(v.txt) ? '#E5383B' : '#20C878');
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.18); ctx.scale(k, k); ctx.globalAlpha = clamp(p * 1.5);
    const f = FD(150), w = ancho(ctx, v.txt, f) + 80; rr(ctx, -w / 2, -110, w, 200, 26); ctx.strokeStyle = col; ctx.lineWidth = 18; ctx.stroke();
    ctx.fillStyle = col; ctx.font = f; ctx.textAlign = 'center'; ctx.fillText(v.txt, 0, 52); ctx.restore();
    caja('visual', 'sello' + s.idx, cx - 300, cy - 140, 600, 260);
  } else if (v.tipo === 'cta') {
    const k = sp(t, v.t, MUELLE.gelatina), pressed = bump(t, v.t + 0.58, 0.1), on = t > v.t + 0.6;
    const label = on ? (v.hecho || 'SIGUIENDO ✓') : (v.boton || '+ SEGUIR');
    const f = FD(96), w = Math.max(ancho(ctx, v.boton || '+ SEGUIR', f), ancho(ctx, v.hecho || 'SIGUIENDO ✓', f)) + 110;
    ctx.save(); ctx.translate(cx, cy - 20); ctx.scale(k * (1 - 0.08 * pressed), k * (1 - 0.08 * pressed));
    rr(ctx, -w / 2, -80, w, 160, 80); trazo(ctx, on ? '#20C878' : C.acento, T.tinta, lw);
    ctx.fillStyle = '#FFFFFF'; ctx.font = f; ctx.textAlign = 'center'; ctx.fillText(label, 0, 33); ctx.restore();
    const hp = claves(t, [[v.t + 0.1, [cx + 360, cy + 260]], [v.t + 0.5, [cx + w * 0.25, cy + 20]], [v.t + 0.75, [cx + w * 0.25, cy + 30]], [v.t + 1.2, [cx + 380, cy + 250]]]);
    if (t > v.t + 0.1 && t < v.t + 1.25) icono(ctx, 'mano', hp[0], hp[1], 52, 1, io);
    if (v.comentario) { const kc = sp(t, tEn(s, v.comentarioEn, v.t - 0.6), MUELLE.gelatina); icono(ctx, 'comentario', cx - 300, cy - 200, 92, kc, io); }
    caja('visual', 'cta' + s.idx, cx - w / 2, cy - 86, w, 132);
  }
}

// ---------------------------------------------------------------- escena completa
function dibujaEscena(ctx, s, t) {
  fondo(ctx, s, t);
  insignia(ctx, s, t);
  dibujaTitulares(ctx, s, t);
  visual(ctx, s, t);
}

// ---------------------------------------------------------------- presentador
const blinks = []; for (let x = 1.4; x < DUR; x += 2.2 + h01(Math.round(x * 10), 3) * 1.8) blinks.push(x);
function estadoHost(t) {
  let i = 0; for (let j = 0; j < hostKeys.length; j++) if (hostKeys[j].t <= t) i = j;
  const cur = hostKeys[i], prev = hostKeys[Math.max(0, i - 1)];
  const pe = E.outC(prog(t, cur.t, cur.t + 0.22));
  const emo = mezclarEmo(EMOCIONES[prev.emocion] || EMOCIONES.feliz, EMOCIONES[cur.emocion] || EMOCIONES.feliz, pe);
  const [x, y, s] = pasos(t, hostPath, MUELLE.suave);
  const pg = E.outBack(prog(t, cur.t, cur.t + 0.32), 1.3);
  const sEsc = escenaEn(t), v = sEsc.visual;
  const objetivo = v ? [v.cx, (v.y0 + Math.max(v.y0 + 220, v.y1)) / 2] : [540, sEsc.yTexto - 80];
  const local = [(objetivo[0] - x) / s, (objetivo[1] - y) / s - HCY];
  const mA = manos(prev.gesto, t, local), mB = manos(cur.gesto, t, local);
  const hands = mA.map((h, k) => [lerp(h[0], mB[k][0], pg), lerp(h[1], mB[k][1], pg)]);
  const señala = cur.gesto === 'señalar' ? (local[0] >= 0 ? 1 : -1) : 0;
  // saltos: al cambiar de escena (pequeño) y cuando se pide saltar
  let salto = 0, aplastar = 0;
  escenas.forEach((e, k) => { if (k && t > e.t0 - 0.1) { const d = t - (e.t0 - 0.1); salto += 60 * bump(d, 0.17, 0.17); if (d > 0.34) aplastar += 0.06 * vaiven(d - 0.34, 2.4, 6); } });
  if (cur.salto) { const d = t - cur.t; if (d > 0 && d < 1.6) { salto += Math.abs(Math.sin(d * 7)) * 90 * (1 - d / 1.6); } }
  aplastar += 0.025 * Math.sin(t * 4.4);
  // mirada: hacia lo último que apareció
  const mir = [clamp(local[0] / 600, -1, 1), clamp((local[1] + HR) / 400, -1, 0.6)];
  const parp = blinks.reduce((m, b) => Math.max(m, bump(t, b, 0.07)), 0);
  const brillo = claves(t, [[prev.t, prev.brillo || 0], [cur.t, prev.brillo || 0], [cur.t + 0.4, cur.brillo || 0]]);
  return { x, y, s, emo, manos: hands, señala, salto, aplastar, mirar: mir, parpadeo: parp, brillo, sudor: cur.sudor || 0, rot: Math.sin(t * 2.2) * 0.03 };
}

// ---------------------------------------------------------------- subtítulos
function dibujaSubt(ctx, t) {
  const c = subt.find((c) => t >= c.t0 - 0.06 && t < c.t1 + 0.12 && !c.oculto);
  if (!c) return;
  const size = 70, f = FU(size, 800);
  const ws = c.ids.map((j) => WORDS[j][0]);
  ctx.font = f; const sp1 = ancho(ctx, ' ', f) + 12;
  const widths = ws.map((w) => ancho(ctx, w, f)), tot = widths.reduce((a, b) => a + b, 0) + sp1 * (ws.length - 1);
  const k = sp(t, c.t0 - 0.06, MUELLE.rapido);
  let x = ZONA.subt.cx - tot / 2; const y = ZONA.subt.base;
  ctx.save(); ctx.translate(ZONA.subt.cx, y); ctx.scale(lerp(0.85, 1, k), lerp(0.85, 1, k)); ctx.translate(-ZONA.subt.cx, -y);
  ws.forEach((w, i) => {
    const j = c.ids[i], on = t >= WORDS[j][1] - 0.03 && t < (WORDS[j + 1] ? WORDS[j + 1][1] - 0.03 : WORDS[j][2] + 0.3);
    const pop = on ? 1 + 0.1 * bump(t, WORDS[j][1] + 0.05, 0.12) : 1;
    ctx.save(); ctx.translate(x + widths[i] / 2, y - size * 0.3); ctx.scale(pop, pop); ctx.translate(-(x + widths[i] / 2), -(y - size * 0.3));
    ctx.font = f; ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = '#141414'; ctx.strokeText(w, x, y);
    ctx.fillStyle = on ? T.subtitulos.activo : '#FFFFFF'; ctx.fillText(w, x, y); ctx.restore();
    x += widths[i] + sp1;
  });
  ctx.restore();
  caja('subt', 'subt', ZONA.subt.cx - tot / 2, y - size * 0.8, tot, size);
}

// ---------------------------------------------------------------- transiciones
function transicion(ctx, a, b, t, hx, hy) {
  const D = 0.36, p = prog(t, b.t0 - D / 2, b.t0 + D / 2), q = E.inOutC(p);
  if (p <= 0) return dibujaEscena(ctx, a, t);
  if (p >= 1 || b.trans === 'corte') return dibujaEscena(ctx, b, t);
  if (b.trans === 'empujar') {
    const dir = b.idx % 2 ? 1 : -1;
    ctx.save(); ctx.translate(-dir * W * q, 0); dibujaEscena(ctx, a, t); ctx.restore();
    ctx.save(); ctx.translate(dir * W * (1 - q), 0); dibujaEscena(ctx, b, t); ctx.restore();
    ctx.fillStyle = C.acento3; ctx.fillRect(dir > 0 ? W * (1 - q) - 14 : W * q, 0, 14, H);
  } else if (b.trans === 'mancha' || b.trans === 'iris') {
    dibujaEscena(ctx, a, t);
    const r = 1.25 * Math.hypot(W, H) * E.inOutC(p), cx = b.trans === 'mancha' ? hx : 540, cy = b.trans === 'mancha' ? hy : 800;
    ctx.save(); if (b.trans === 'mancha') mancha(ctx, cx, cy, r, t, b.idx, 0.16); else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); }
    ctx.lineWidth = 40; ctx.strokeStyle = C.acento3; ctx.stroke(); ctx.clip(); dibujaEscena(ctx, b, t); ctx.restore();
  } else if (b.trans === 'persiana') {
    dibujaEscena(ctx, a, t);
    const n = 7, bh = H / n + 2;
    ctx.save(); ctx.beginPath();
    for (let i = 0; i < n; i++) { const pp = E.inOutC(clamp(p * 1.6 - i * 0.09)); ctx.rect(0, i * (H / n), W * pp, bh); }
    ctx.clip(); dibujaEscena(ctx, b, t); ctx.restore();
  } else dibujaEscena(ctx, b, t);
}

// ---------------------------------------------------------------- grano
const granos = [0, 1, 2, 3].map((k) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const im = g.createImageData(256, 256); const r = h01; for (let i = 0; i < 256 * 256; i++) { const v = (h01(i, k + 9) * 255) | 0; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return c; });

// ---------------------------------------------------------------- cuadro
arnes({
  duracion: DUR,
  eventos: EV,
  draw(ctx, t) {
    let i = 0; for (let j = 0; j < escenas.length; j++) if (t >= escenas[j].t0 - 0.18) i = j;
    const b = escenas[i], a = escenas[Math.max(0, i - 1)];
    const hs = estadoHost(t);
    ctx.save();
    // cámara: golpes de zoom + temblor + respiración
    let z = 1 + 0.008 * Math.sin(t * 0.9);
    for (const [pt, amp] of PUNCH) if (t >= pt) z += amp * Math.exp(-(t - pt) * 9);
    zoomEn(ctx, z, W / 2, H * 0.42);
    for (const [st, amp] of SHAKE) if (t >= st) { const k = amp * Math.exp(-(t - st) / 0.2); if (k > 0.05) ctx.translate(k * ruido(t * 80, 3 + st), k * ruido(t * 80, 11 + st)); }
    if (i === 0) dibujaEscena(ctx, b, t); else transicion(ctx, a, b, t, hs.x, hs.y + HCY * hs.s);
    // presentador
    const sEsc = escenaEn(t);
    presentador(ctx, { ...hs, t, forma: host.forma, cuerpo: host.cuerpo, sombra: host.sombra, tinta: T.tinta, lw: T.contorno, accesorio: host.accesorio,
      acento: C.acento3, acento2: aclarar(C.acento3, 0.4), hablar: clamp(talk(t) * 1.1), guiño: bump(t, ULT + 0.45, 0.25), colorBrillo: host.brillo || '#FFF3A0' });
    ctx.restore();
    // apagón (parpadeo literal de pantalla)
    for (const s of escenas) if (s.apagon && t >= s.apagon && t < s.apagon + 0.16) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    dibujaSubt(ctx, t);
    // progreso
    const pw = 936 * clamp(t / DUR);
    ctx.fillStyle = alfa(sEsc.ink, 0.15); rr(ctx, 72, 226, 936, 8, 4); ctx.fill();
    ctx.fillStyle = C.acento; rr(ctx, 72, 226, Math.max(8, pw), 8, 4); ctx.fill();
  },
  post(ctx, t) {
    if (!T.grano) return;
    ctx.globalAlpha = T.grano; ctx.globalCompositeOperation = 'overlay';
    const g = granos[Math.floor(t * 24) % 4]; for (let y = 0; y < H; y += 256) for (let x = 0; x < W; x += 256) ctx.drawImage(g, x, y);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  },
});
window.ESCENAS = escenas.map((s) => ({ i: s.idx, t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2), trans: s.trans, item: s.item || null, lineas: s.lineas.map((L) => L.rows.map((r) => r.words.map((w) => w.txt).join(' ')).join(' / ')) }));
window.TEMA = T;
