#!/usr/bin/env node
// audio.mjs — música + efectos + mezcla + video final.
//   node audio.mjs <proyecto> [--sin-musica] [--musica archivo.wav] [--nivel-musica 0.42]
// Lee <proyecto>/eventos.json (render.mjs --eventos) y audio/vo.wav.
// Escribe audio/musica.wav, audio/sfx.wav, audio/mezcla.wav (−14 LUFS, −1,5 dBTP) y salida/final.mp4.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const PROY = path.resolve(args[0] || '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SR = 48000, TAU = Math.PI * 2;
const EVJ = JSON.parse(fs.readFileSync(path.join(PROY, 'eventos.json'), 'utf8'));
const DUR = EVJ.duracion, N = Math.ceil(DUR * SR);
const M = EVJ.tema.musica || { estilo: 'pop', bpm: 114, tonica: 'G', modo: 'mayor' };
fs.mkdirSync(path.join(PROY, 'audio'), { recursive: true });

// ---------------------------------------------------------------- utilidades DSP
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(7), noise = () => R() * 2 - 1;
class Biquad { // RBJ
  constructor(type, f, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = 0.707) {
    const w = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2, a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  p(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
const est = () => [new Float32Array(N), new Float32Array(N)];
function poner(buf, t, mono, g = 1, pan = 0) { // mezcla una señal mono en estéreo
  const i0 = Math.round(t * SR), gl = g * Math.cos((pan + 1) * Math.PI / 4) * 1.414, gr = g * Math.sin((pan + 1) * Math.PI / 4) * 1.414;
  for (let i = 0; i < mono.length; i++) { const j = i0 + i; if (j < 0 || j >= N) continue; buf[0][j] += mono[i] * gl; buf[1][j] += mono[i] * gr; }
}
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const gen = (seg, fn) => { const n = Math.floor(seg * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = fn(i / SR, i); return o; };

// ---------------------------------------------------------------- instrumentos
const I = {
  bombo: (g = 1) => { let ph = 0; return gen(0.45, (t) => { const f = 48 + 110 * Math.exp(-t / 0.035); ph += TAU * f / SR; return (Math.sin(ph) * Math.exp(-t / 0.22) + (t < 0.004 ? noise() * 0.4 : 0)) * g; }); },
  palmas: () => { const bp = new Biquad('bp', 1300, 0.9); return gen(0.3, (t) => { const e = (t < 0.012 ? 1 : 0) + (t > 0.012 && t < 0.024 ? 0.8 : 0) + (t > 0.024 ? Math.exp(-(t - 0.024) / 0.09) * 0.9 : 0); return bp.p(noise()) * e * 1.6; }); },
  caja: () => { const bp = new Biquad('bp', 1800, 0.7); let ph = 0; return gen(0.3, (t) => { ph += TAU * 190 / SR; return bp.p(noise()) * Math.exp(-t / 0.1) * 1.3 + Math.sin(ph) * Math.exp(-t / 0.05) * 0.5; }); },
  plato: (abierto = false) => { const hp = new Biquad('hp', 8000, 0.7); return gen(abierto ? 0.3 : 0.06, (t) => hp.p(noise()) * Math.exp(-t / (abierto ? 0.11 : 0.022)) * 0.7); },
  shaker: () => { const bp = new Biquad('bp', 6500, 1.2); return gen(0.07, (t) => bp.p(noise()) * Math.sin(Math.PI * Math.min(1, t / 0.06)) * 0.8); },
  tom: (f0 = 110) => { let ph = 0; return gen(0.6, (t) => { ph += TAU * (f0 * 0.65 + f0 * 0.35 * Math.exp(-t / 0.08)) / SR; return Math.sin(ph) * Math.exp(-t / 0.25); }); },
  bajo: (f, dur, brillo = 900) => { const lp = new Biquad('lp', brillo, 1.1); let ph = 0; return gen(dur + 0.05, (t) => { ph += f / SR; const saw = 2 * (ph % 1) - 1, sub = Math.sin(TAU * ph); const e = Math.min(1, t / 0.006) * Math.exp(-t / (dur * 0.9)) * (t > dur ? Math.exp(-(t - dur) / 0.02) : 1); lp.set(brillo * (0.4 + 1.2 * Math.exp(-t / 0.08)), 1.1); return (lp.p(saw) * 0.6 + sub * 0.55) * e; }); },
  marimba: (f, g = 1) => gen(0.6, (t) => (Math.sin(TAU * f * t) * Math.exp(-t / 0.28) + 0.35 * Math.sin(TAU * f * 3.99 * t) * Math.exp(-t / 0.05) + 0.1 * Math.sin(TAU * f * 9.2 * t) * Math.exp(-t / 0.012)) * Math.min(1, t / 0.002) * g),
  pulsada: (f, g = 1, dur = 1.2, brillo = 0.5) => { // Karplus-Strong
    const L = Math.max(2, Math.round(SR / f)), line = new Float32Array(L); for (let i = 0; i < L; i++) line[i] = noise();
    let idx = 0, prev = 0; const damp = 0.996 - (1 - brillo) * 0.01;
    return gen(dur, (t) => { const cur = line[idx]; const nx = damp * (brillo * cur + (1 - brillo) * prev); prev = cur; line[idx] = nx; idx = (idx + 1) % L; return cur * g * Math.min(1, t / 0.002); });
  },
  pad: (fs, dur, brillo = 1100) => { const lp = new Biquad('lp', brillo, 0.6); const ph = fs.flatMap((f) => [-7, 0, 7].map((c) => ({ f: f * 2 ** (c / 1200), p: R() }))); return gen(dur + 0.6, (t) => { let s = 0; for (const o of ph) { o.p += o.f / SR; s += 2 * (o.p % 1) - 1; } const e = Math.min(1, t / 0.35) * (t > dur ? Math.exp(-(t - dur) / 0.25) : 1); return lp.p(s / ph.length) * e; }); },
  campana: (f, g = 1) => gen(1.4, (t) => [[1, 1, 0.9], [2.76, 0.4, 0.35], [5.4, 0.2, 0.15]].reduce((s, [r, a, d]) => s + a * Math.sin(TAU * f * r * t) * Math.exp(-t / d), 0) * Math.min(1, t / 0.001) * g),
  cuadrada: (f, dur, g = 1) => { const lp = new Biquad('lp', 2400, 0.8); return gen(dur + 0.05, (t) => lp.p(((f * t) % 1) < 0.5 ? 1 : -1) * Math.exp(-t / (dur * 0.7)) * Math.min(1, t / 0.003) * g); },
};

// ---------------------------------------------------------------- música
function musica() {
  const [L, Rr] = est(), dr = est(), sc = new Float32Array(N).fill(1);
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const raiz = 48 + (PC[M.tonica] ?? 7), esc = M.modo === 'menor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const PROG = { jugueton: M.modo === 'menor' ? [0, 5, 3, 4] : [0, 4, 5, 3], pop: M.modo === 'menor' ? [0, 5, 2, 6] : [5, 3, 0, 4], tech: [0, 6, 5, 6], epico: [0, 5, 2, 6], lofi: [1, 4, 0, 0] }[M.estilo] || [0, 4, 5, 3];
  const nota = (grado, oct = 0) => raiz + esc[((grado % 7) + 7) % 7] + 12 * (Math.floor(grado / 7) + oct);
  const acorde = (g) => [nota(g), nota(g + 2), nota(g + 4)];
  const bpm = M.bpm || 112, beat = 60 / bpm, bar = beat * 4, nBars = Math.ceil(DUR / bar) + 1;
  const esc0 = EVJ.escenas, tLleno = esc0[1]?.t0 ?? bar, tFinal = esc0[esc0.length - 1].t0;
  const music = [L, Rr];
  for (let b = 0; b < nBars; b++) {
    const tb = b * bar; if (tb > DUR) break;
    const ch = acorde(PROG[b % PROG.length]), lleno = tb + bar > tLleno && tb < tFinal - 0.01, final = tb >= tFinal - bar * 0.5;
    // pad de fondo siempre
    poner(music, tb, I.pad(ch.map((m) => hz(m + 12)), bar * 0.98, M.estilo === 'tech' ? 1500 : 1000), 0.11, 0);
    for (let k = 0; k < 16; k++) { // semicorcheas
      const t = tb + k * beat / 4 + (M.estilo === 'lofi' && k % 2 ? beat * 0.06 : 0); if (t > DUR) break;
      const enDrums = t >= tLleno - 0.02 && !final;
      if (M.estilo === 'epico') {
        if (enDrums && (k === 0 || k === 10)) { poner(dr, t, I.bombo(1), 0.9); for (let j = Math.round(t * SR); j < Math.min(N, Math.round((t + 0.3) * SR)); j++) sc[j] = Math.min(sc[j], 0.55 + 0.45 * ((j / SR - t) / 0.3)); }
        if (enDrums && k === 8) poner(dr, t, I.caja(), 0.55, 0.05);
        if (enDrums && b % 4 === 3 && k >= 12) poner(dr, t, I.tom(150 - (k - 12) * 18), 0.4, (k - 13.5) * 0.3);
        if (k % 2 === 0) poner(music, t, I.pulsada(hz(ch[(k / 2) % 3] + 12), 0.5, 0.5, 0.3), 0.13, ((k / 2) % 3 - 1) * 0.4);
        if (k === 0) poner(music, t, I.bajo(hz(ch[0] - 12), bar * 0.95, 500), 0.32);
        continue;
      }
      if (enDrums && k % 4 === 0 && M.estilo !== 'lofi') { poner(dr, t, I.bombo(1), 0.85); for (let j = Math.round(t * SR); j < Math.min(N, Math.round((t + 0.22) * SR)); j++) sc[j] = Math.min(sc[j], 0.5 + 0.5 * ((j / SR - t) / 0.22)); }
      if (M.estilo === 'lofi' && enDrums && (k === 0 || k === 7 || k === 10)) poner(dr, t, I.bombo(1), 0.7);
      if (enDrums && (k === 4 || k === 12)) poner(dr, t, M.estilo === 'lofi' ? I.caja() : I.palmas(), 0.42, 0.08);
      if (M.estilo === 'jugueton') { if (k % 2 === 1 || !enDrums) poner(dr, t, I.shaker(), 0.16, 0.3); }
      else if (M.estilo === 'tech') poner(dr, t, I.plato(k % 4 === 2), k % 4 === 2 ? 0.18 : 0.1, -0.3);
      else if (k % 4 === 2) poner(dr, t, I.plato(true), 0.14, -0.3); else if (k % 2 === 0) poner(dr, t, I.plato(false), 0.08, 0.3);
      // bajo
      if (M.estilo === 'tech') { if (enDrums || k % 4 === 2) poner(music, t, I.bajo(hz(ch[0] - 12 + (k % 4 === 3 ? 12 : 0)), beat / 4 * 0.9, 700), 0.26); }
      else if (k % 4 === 2 || (k === 0 && !enDrums) || (M.estilo === 'jugueton' && k % 8 === 0)) poner(music, t, I.bajo(hz(ch[0] - 12 + (M.estilo === 'jugueton' && k % 8 === 0 ? 0 : (k % 8 === 6 ? 12 : 0))), beat * 0.45, 850), 0.3);
      // melodía / arpegio
      const pat = [0, 1, 2, 1, 0, 2, 1, 2];
      if (M.estilo === 'jugueton' && k % 2 === 0) poner(music, t, I.marimba(hz(ch[pat[(k / 2) % 8] % 3] + 24 + (k % 8 === 6 ? 12 : 0)), 1), 0.16, ((k / 2) % 3 - 1) * 0.35);
      if (M.estilo === 'pop' && [0, 3, 6, 10, 12].includes(k)) ch.forEach((m, j) => poner(music, t + j * 0.008, I.pulsada(hz(m + 12), 0.6, 0.7, 0.55), 0.07, (j - 1) * 0.3));
      if (M.estilo === 'tech') poner(music, t, I.cuadrada(hz(ch[k % 3] + 24 + (k % 8 >= 6 ? 12 : 0)), beat / 4 * 0.8, 0.5), 0.05, (k % 2 ? 0.4 : -0.4));
      if (M.estilo === 'lofi' && k === 0) ch.forEach((m, j) => poner(music, t + j * 0.02, I.campana(hz(m + 12), 0.4), 0.06, (j - 1) * 0.3));
    }
  }
  // sidechain al bombo, suma de batería y cola final
  const fadeI = Math.round((DUR - 0.9) * SR);
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
    let v = music[c][i] * sc[i] + dr[c][i];
    if (i > fadeI) v *= Math.max(0, 1 - (i - fadeI) / (0.9 * SR));
    if (i < SR * 0.02) v *= i / (SR * 0.02);
    music[c][i] = Math.tanh(v * 1.1) * 0.9;
  }
  return music;
}

// ---------------------------------------------------------------- efectos de sonido
function sfxNombre(s, p = 0) {
  const k = 2 ** (p / 12);
  switch (s) {
    case 'pop': return gen(0.12, (t) => Math.sin(TAU * (950 * k * Math.exp(-t / 0.05) + 380 * k) * t) * Math.exp(-t / 0.045) + (t < 0.003 ? noise() * 0.3 : 0));
    case 'tick': return gen(0.03, (t) => Math.sin(TAU * 2600 * k * t) * Math.exp(-t / 0.006));
    case 'click': { const hp = new Biquad('hp', 3000); return gen(0.04, (t) => hp.p(noise()) * Math.exp(-t / 0.004) + Math.sin(TAU * 3200 * t) * Math.exp(-t / 0.008) * 0.6); }
    case 'ding': return I.campana(1568 * k, 0.8);
    case 'thud': { let ph = 0; const lp = new Biquad('lp', 900); return gen(0.35, (t) => { ph += TAU * (55 + 90 * Math.exp(-t / 0.04)) / SR; return Math.sin(ph) * Math.exp(-t / 0.14) + lp.p(noise()) * Math.exp(-t / 0.03) * 0.5; }); }
    case 'impacto': { let ph = 0, ph2 = 0; const lp = new Biquad('lp', 2200); return gen(1.0, (t) => { ph += TAU * (42 + 100 * Math.exp(-t / 0.05)) / SR; ph2 += TAU * 38 / SR; return Math.sin(ph) * Math.exp(-t / 0.3) + lp.p(noise()) * Math.exp(-t / 0.12) * 0.7 + Math.sin(ph2) * Math.exp(-t / 0.5) * 0.5; }); }
    case 'whoosh': case 'swish': case 'swoosh': {
      const bp = new Biquad('bp', 500, 1.2), len = s === 'swish' ? 0.26 : 0.34, f0 = s === 'swish' ? 1500 : s === 'swoosh' ? 400 : 300, f1 = s === 'swish' ? 5500 : s === 'swoosh' ? 3000 : 2400, pk = 0.38;
      return gen(len, (t) => { const q = t / len; bp.set(f0 * (f1 / f0) ** q, 1.2); return bp.p(noise()) * (q < pk ? (q / pk) ** 2 : ((1 - q) / (1 - pk)) ** 1.5) * 1.8; });
    }
    case 'subida': { let ph = 0; return gen(0.42, (t) => { ph += TAU * (420 * 4 ** (t / 0.42) + 18 * Math.sin(TAU * 16 * t)) / SR; return Math.sin(ph) * Math.sin(Math.PI * t / 0.42) * 0.6; }); }
    case 'latido': { const th = (d) => { let ph = 0; return gen(0.2, (t) => { ph += TAU * (50 + 40 * Math.exp(-t / 0.03)) / SR; return Math.sin(ph) * Math.exp(-t / 0.07); }); }; const o = new Float32Array(Math.round(0.45 * SR)); [[0, 1], [0.17, 0.7]].forEach(([d, g]) => { const x = th(); for (let i = 0; i < x.length; i++) o[Math.round(d * SR) + i] += x[i] * g; }); return o; }
    case 'burbujas': { const o = new Float32Array(Math.round(0.7 * SR)); for (let j = 0; j < 7; j++) { const x = sfxNombre('pop', -6 + Math.floor(R() * 14)); const d = Math.round((j * 0.08 + R() * 0.03) * SR); for (let i = 0; i < x.length && d + i < o.length; i++) o[d + i] += x[i] * 0.5; } return o; }
    case 'sello': { const a = sfxNombre('impacto'), hp = new Biquad('hp', 1800); const b = gen(0.1, (t) => hp.p(noise()) * Math.exp(-t / 0.02)); for (let i = 0; i < b.length; i++) a[i] += b[i] * 0.8; return a; }
    case 'boing': { let ph = 0; return gen(0.45, (t) => { ph += TAU * (220 + 300 * (1 - Math.exp(-t / 0.08)) + 30 * Math.sin(TAU * 14 * t) * Math.exp(-t / 0.15)) / SR; return Math.sin(ph) * Math.exp(-t / 0.18); }); }
    case 'apagon': { let ph = 0; return gen(0.4, (t) => { ph += TAU * (60 + 260 * Math.exp(-t / 0.08)) / SR; return Math.sin(ph) * Math.exp(-t / 0.15); }); }
    default: return new Float32Array(1);
  }
}
function sfx() {
  const b = est();
  for (const e of EVJ.eventos) poner(b, e.t, sfxNombre(e.s, e.p || 0), (e.g ?? 0.2) * 1.0, e.pan || 0);
  return b;
}

// ---------------------------------------------------------------- E/S de audio
function leer(f) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  const fa = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const o = est(); for (let i = 0; i < Math.min(N, fa.length / 2); i++) { o[0][i] = fa[2 * i]; o[1][i] = fa[2 * i + 1]; }
  return o;
}
function escribir(f, [l, r]) {
  const n = l.length, buf = Buffer.alloc(44 + n * 8);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 8, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 8, 28); buf.writeUInt16LE(8, 32); buf.writeUInt16LE(32, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 8, 40);
  for (let i = 0; i < n; i++) { buf.writeFloatLE(l[i], 44 + i * 8); buf.writeFloatLE(r[i], 48 + i * 8); }
  fs.writeFileSync(f, buf);
}

// ---------------------------------------------------------------- mezcla
const A = (f) => path.join(PROY, 'audio', f);
const mus = opt('sin-musica') ? est() : opt('musica') ? leer(path.resolve(opt('musica'))) : musica();
const fx = sfx();
const vo = fs.existsSync(A('vo.wav')) ? leer(A('vo.wav')) : est();
escribir(A('musica.wav'), mus); escribir(A('sfx.wav'), fx);
// envolvente de la voz para bajar la música cuando se habla (ataque 15 ms, relajación 300 ms)
const env = new Float32Array(N); { let e = 0; const at = Math.exp(-1 / (0.015 * SR)), rl = Math.exp(-1 / (0.3 * SR)); for (let i = 0; i < N; i++) { const x = Math.abs(vo[0][i]) + Math.abs(vo[1][i]); e = x > e ? at * e + (1 - at) * x : rl * e + (1 - rl) * x; env[i] = e; } }
const ref = [...env].filter((_, i) => i % 480 === 0).sort((a, b) => a - b)[Math.floor(N / 480 * 0.8)] || 1;
const NM = Number(opt('nivel-musica', 0.42));
const mix = est();
for (let i = 0; i < N; i++) { const d = 1 - 0.62 * Math.min(1, env[i] / (ref * 0.5)); for (let c = 0; c < 2; c++) mix[c][i] = vo[c][i] + fx[c][i] * 0.75 + mus[c][i] * NM * d; }
escribir(A('pre.wav'), mix);
// normalización en dos pasadas a −14 LUFS
const p1 = spawnSync('ffmpeg', ['-hide_banner', '-i', A('pre.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const m = JSON.parse(p1.slice(p1.lastIndexOf('{'), p1.lastIndexOf('}') + 1));
spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', A('pre.wav'), '-af', `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`, '-c:a', 'pcm_s16le', A('mezcla.wav')], { stdio: 'inherit' });
fs.rmSync(A('pre.wav'));
const chk = spawnSync('ffmpeg', ['-hide_banner', '-i', A('mezcla.wav'), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const mm = JSON.parse(chk.slice(chk.lastIndexOf('{'), chk.lastIndexOf('}') + 1));
console.log(`mezcla: ${mm.input_i} LUFS · pico ${mm.input_tp} dBTP · música ${M.estilo} ${M.bpm} bpm ${M.tonica} ${M.modo} · ${EVJ.eventos.length} efectos`);
// video final
const vid = path.join(PROY, 'salida', 'video.mp4');
if (fs.existsSync(vid)) {
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', vid, '-i', A('mezcla.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(PROY, 'salida', 'final.mp4')], { stdio: 'inherit' });
  console.log('-> ' + path.join(PROY, 'salida', 'final.mp4'));
} else console.log('(sin salida/video.mp4: renderiza con render.mjs --video y vuelve a correr audio.mjs)');
