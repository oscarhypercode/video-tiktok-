// Pulpo: datos curiosos — pure function of time. window.seek(t) paints frame t.
// Voice-first edit: every cue is a word of the voice-over (words.json, measured on audio/vo.wav),
// so picture follows the narration. Times here are SECONDS.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, spring, SPRING, wobble, bump, font, layout, fitSize, glyph, fill, hash01, zoomAbout, TAU } = M;

const [WORDS, GRID0] = await Promise.all([
  fetch('words.json').then((r) => r.json()),
  fetch('beats.json').then((r) => r.json()),
]);
const T = (i) => WORDS[i][1];            // word i starts (s)
const TE = (i) => WORDS[i][2];           // word i ends (s)
const B = (s) => (s - GRID0.offset) / GRID0.period;   // seconds -> beats (HITS are in beats)

const C = {
  paper: '#FFF1E2', ink: '#1C1A33', blue: '#2F5BFF', blueDeep: '#1E3FCC', weed: '#2447D9',
  body: '#FF7A6B', bodyDark: '#E85A4E', belly: '#FFB4A3', white: '#FFFFFF', heart: '#D9304A',
  stop: '#8D96C9', red: '#FF4D6D', sand: '#F6C978', sandDark: '#E3AE58', inkCloud: '#14122A',
  copper: '#E08A3C', iron: '#C73B3B', brain: '#FF9EC4', brainDark: '#E46A9C', gold: '#FFD23F',
};
const DISPLAY = 'Display', UI = 'UI';
const S = FORMAT.safe;
const sp = (t, t0, cfg = SPRING.bouncy) => spring(t - t0, cfg);

// ---------------------------------------------------------------- SFX on word cues (light: the voice leads)
const HITS = [
  [B(0), 'hook', 'impact', { gain: 0.45 }],
  [B(T(5)), 'hearts', 'pop', { pitch: 'D5', gain: 0.18 }],
  [B(T(5) + 0.12), 'hearts', 'pop', { pitch: 'F5', gain: 0.18 }],
  [B(T(5) + 0.24), 'hearts', 'pop', { pitch: 'A5', gain: 0.18 }],
  [B(T(7)), '¡Tres!', 'impact', { gain: 0.4 }],
  [B(T(8)), '2', 'blip', { pitch: 'A5', gain: 0.14 }],
  [B(T(17)), '1', 'blip', { pitch: 'D6', gain: 0.14 }],
  [B(T(23)), 'ojo', 'boing', { pitch: 'C5', to: 'C6', gain: 0.18 }],
  [B(T(27)), 'azul flood', 'sub', { len: 0.8 }],
  [B(T(27)), 'azul', 'crash', { gain: 0.12 }],
  [B(T(30)), 'Cu', 'coins', { gain: 0.18 }],
  [B(T(35)), 'Fe', 'thud', { gain: 0.25 }],
  [B(T(40)), 'loco', 'boing', { pitch: 'G4', to: 'G5', gain: 0.16 }],
  [B(T(42)), 'swim', 'whoosh', { len: 0.35, from: 300, to: 2600, gain: 0.2 }],
  [B(T(43)), 'swim', 'whoosh', { len: 0.35, from: 300, to: 2600, pan: 0.4, gain: 0.2 }],
  [B(T(46)), 'flatline', 'blip', { pitch: 'A6', len: 1.0, gain: 0.1 }],
  [B(T(47)), 'detiene', 'impact', { gain: 0.4 }],
  [B(T(48)), 'sand', 'thud', { gain: 0.25 }],
  [B(T(51) + 0.3), 'step', 'tok', { pitch: 'D5', gain: 0.15 }],
  [B(T(52)), 'no acaba', 'whoosh', { len: 0.4, from: 2400, to: 500, gain: 0.2 }],
  [B(T(57)), 'brain', 'pop', { pitch: 'C5', gain: 0.18 }],
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => [B(T(58) + 0.1 + k * 0.15), 'brain', 'blip', { pitch: ['D6', 'E6', 'F6', 'G6', 'A6', 'B6', 'C7', 'D7'][k], gain: 0.1 }]),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [B(T(65) + k * 0.13), 'color', 'tick', { gain: 0.12 }]),
  [B(T(72)), 'segundo', 'bell', { pitch: 'A6', gain: 0.15 }],
  [B(T(74)), 'cap', 'thud', { gain: 0.3 }],
  [B(T(76)), 'océano', 'bell', { pitch: 'D7', gain: 0.15 }],
  [B(T(77) - 0.3), 'ink', 'whoosh', { len: 0.5, from: 3000, to: 300, gain: 0.22 }],
  [B(T(77)), 'end card', 'impact', { gain: 0.35 }],
  [B(TE(81) + 0.15), 'wink', 'bell', { pitch: 'A6', gain: 0.2 }],
];

// ---------------------------------------------------------------- type
// Glyphs spring up at tIn (staggered), fly up and out at tOut. All in seconds.
function line(ctx, str, x, base, f, color, tIn, tOut, t, { stagger = 0.018, cfg = SPRING.bouncy, rise = 1.1, wob = 0, colorAt = null } = {}) {
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
function bar(ctx, x, y, w, h, color, tIn, tOut, t) {
  const p = E.outCubic(prog(t, tIn, tIn + 0.2));
  const q = tOut == null ? 0 : E.inCubic(prog(t, tOut, tOut + 0.15));
  if (p <= 0 || q >= 1) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
  ctx.fillStyle = color; ctx.fillRect(w * q, 0, w * (p - q), h);
  ctx.restore();
}
function arrow(ctx, x, y, len, a, color) {
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const L = len * a;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + L, y);
  ctx.moveTo(x + L - 30 * a, y - 30 * a); ctx.lineTo(x + L, y); ctx.lineTo(x + L - 30 * a, y + 30 * a);
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------- the octopus
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.15, x - s * 0.95, y - s * 0.85, x, y - s * 0.32);
  ctx.bezierCurveTo(x + s * 0.95, y - s * 0.85, x + s * 1.25, y + s * 0.15, x, y + s * 0.95);
  ctx.closePath();
}
function brainIcon(ctx, x, y, r, k) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.lineWidth = Math.max(4, r * 0.14); ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.fillStyle = C.brain;
  ctx.beginPath(); ctx.ellipse(-r * 0.38, 0, r * 0.62, r * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(r * 0.38, 0, r * 0.62, r * 0.72, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.3, r * 0.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = C.brainDark; ctx.lineWidth = Math.max(3, r * 0.1);
  ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(0, r * 0.6);
  ctx.moveTo(-r * 0.7, -r * 0.15); ctx.quadraticCurveTo(-r * 0.4, -r * 0.45, -r * 0.2, -r * 0.1);
  ctx.moveTo(r * 0.7, r * 0.15); ctx.quadraticCurveTo(r * 0.4, r * 0.45, r * 0.2, r * 0.1);
  ctx.stroke();
  ctx.restore();
}

function tentacle(ctx, bx, by, ang, len, w0, t, phase, curl, color, freq = 3.1) {
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
    const nx = -dy / d, ny = dx / d;
    L.push([p[0] + nx * p[2], p[1] + ny * p[2]]); R.push([p[0] - nx * p[2], p[1] - ny * p[2]]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  const tip = pts[n];
  ctx.arc(tip[0], tip[1], tip[2], 0, Math.PI);
  for (let i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.belly;
  for (let i = 4; i < n - 2; i += 3) {
    const p = pts[i], r = p[2] * 0.32;
    ctx.beginPath(); ctx.arc(lerp(p[0], R[i][0], 0.55), lerp(p[1], R[i][1], 0.55), r, 0, TAU); ctx.fill();
  }
  return pts[Math.round(n * 0.62)];
}

function armPose(i, front, o, t) {
  const k = i - 1.5;
  let ang = Math.PI / 2 - k * (front ? 0.85 : 0.55);
  let curl = (i < 2 ? 1 : -1) * (front ? 1.5 : 1.2);
  let len = front ? 360 : 330;
  const sw = o.swim || 0, wk = o.walk || 0, sp2 = o.spread || 0;
  if (sp2) { ang = lerp(ang, Math.PI / 2 - k * (front ? 1.25 : 0.95), sp2); curl *= 1 - 0.6 * sp2; }
  if (sw) { ang = lerp(ang, Math.PI / 2 - k * 0.12, sw); curl = lerp(curl, 0, sw); len = lerp(len, 430, sw); }
  if (wk) ang += Math.sin(o.walkPhase + i * Math.PI / 2 + (front ? 0 : 1)) * 0.38 * wk;
  if (front && i === 0 && o.wave) {
    ang = lerp(ang, -0.55, o.wave);
    curl = lerp(curl, -1.8 + Math.sin(t * 9) * 1.4, o.wave);
  }
  return [ang, curl, len];
}

function octopus(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.rot) ctx.rotate(o.rot);
  const q = o.squash || 0;
  ctx.scale(o.s * (1 + q), o.s * (1 - q));
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
  const t = o.t, freq = lerp(3.1, 9, o.swim || 0);
  const [body, dark] = o.colors || [C.body, C.bodyDark];
  const mids = [];
  for (let i = 0; i < 4; i++) {
    const [ang, curl, len] = armPose(i, false, o, t);
    mids.push(tentacle(ctx, (i - 1.5) * 70, -40, ang, len, 34, t, i * 1.7 + 3, curl, dark, freq));
  }
  for (let i = 0; i < 4; i++) {
    const [ang, curl, len] = armPose(i, true, o, t);
    mids.push(tentacle(ctx, (i - 1.5) * 95, -10, ang, len, 44, t, i * 2.3, curl, body, freq));
  }
  const mw = 255, mh = 290, my = -200;
  const breathe = 1 + Math.sin(t * 4.8) * 0.02;
  ctx.beginPath();
  ctx.ellipse(0, my, mw * breathe, mh / breathe, 0, Math.PI * 0.92, Math.PI * 2.08);
  ctx.bezierCurveTo(mw * 0.9, my + mh * 0.75, mw * 0.55, 30, 0, 30);
  ctx.bezierCurveTo(-mw * 0.55, 30, -mw * 0.9, my + mh * 0.75, -mw * Math.cos(Math.PI * 0.08), my + mh * Math.sin(Math.PI * 0.08));
  ctx.closePath();
  ctx.fillStyle = body; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-mw * 0.42, my - mh * 0.55, 60, 95, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = dark;
  [[0.5, -0.5, 18], [0.66, -0.22, 12], [0.38, -0.3, 10]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(mw * a, my + mh * b, r, 0, TAU); ctx.fill(); });
  const xr = o.xray || 0;
  if (xr > 0) {
    ctx.globalAlpha = clamp(xr); ctx.fillStyle = C.belly;
    const e = E.outBack(clamp(xr));
    ctx.beginPath(); ctx.ellipse(0, my - 40, mw * 0.78 * e, mh * 0.5 * e, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.stroke();
  if (xr > 0) {
    const hk = o.hearts || [0, 0, 0];
    const pos = [[-125, my - 70, 44], [125, my - 70, 44], [0, my - 10, 64]];
    pos.forEach(([hx, hy, hs], i) => {
      const k = hk[i] * clamp(xr);
      if (k <= 0.001) return;
      const hl = o.hl ? o.hl[i] : 0;
      const stopped = i === 2 && o.stop;
      const pulse = stopped ? 0 : (o.beatPulse || 0);
      const sc = k * (1 + 0.16 * pulse) * (1 + 0.15 * hl);
      if (hl > 0) {
        ctx.save(); ctx.globalAlpha = 0.3 * hl; ctx.fillStyle = C.white;
        ctx.beginPath(); ctx.arc(hx, hy, hs * 1.7 * (1 + 0.15 * pulse), 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.translate(hx, hy); ctx.scale(sc, sc);
      heartPath(ctx, 0, 0, hs);
      ctx.fillStyle = stopped ? M.mix(o.heartColor || C.heart, C.stop, o.stop) : (o.heartColor || C.heart);
      ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(-hs * 0.45, -hs * 0.25, hs * 0.16, hs * 0.26, -0.6, 0, TAU); ctx.fill();
      ctx.restore();
    });
  }
  if (o.brains) {
    brainIcon(ctx, 0, my - 90, 105, o.brains[0]);
    mids.forEach((p, i) => brainIcon(ctx, p[0], p[1], 58, o.brains[i + 1]));
  }
  const ey = -50, ex = 82;
  const blink = o.blink || 0, shock = o.shock || 0, big = o.bigEye || 0;
  [-1, 1].forEach((side) => {
    const shut = side === 1 ? Math.max(blink, o.wink || 0) : blink;
    const g = 1 + 0.15 * shock + (side === 1 ? 0.9 * big : 0);
    ctx.save(); ctx.translate(side * ex + (side === 1 ? 20 * big : 0), ey - (side === 1 ? 20 * big : 0)); ctx.scale(g, Math.max(0.08, 1 - shut) * g);
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 54, 0, 0, TAU);
    ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 8 / g; ctx.stroke();
    const [lx, ly] = o.look || [0, 0];
    const pr = lerp(24, 12, shock);
    ctx.beginPath(); ctx.arc(lx * 16, ly * 18 + 6, pr, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
    ctx.beginPath(); ctx.arc(lx * 16 - pr * 0.33, ly * 18 + 6 - pr * 0.42, pr * 0.33, 0, TAU); ctx.fillStyle = C.white; ctx.fill();
    ctx.restore();
  });
  ctx.fillStyle = 'rgba(217,48,74,0.35)';
  [-1, 1].forEach((side) => { ctx.beginPath(); ctx.ellipse(side * 150, -8, 30, 18, 0, 0, TAU); ctx.fill(); });
  ctx.beginPath(); ctx.lineWidth = 8;
  const open = o.mouth || 0;
  if (shock > 0.5) {
    ctx.ellipse(0, 18, 14 + open * 6, 18 + open * 14, 0, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  } else {
    ctx.moveTo(-34 - open * 8, 2); ctx.quadraticCurveTo(0, 30 + open * 60, 34 + open * 8, 2);
    if (open > 0.05) { ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill(); }
    ctx.stroke();
  }
  const sw = o.sweat || 0;
  if (sw > 0) {
    [[-1, 0], [1, 0.4]].forEach(([side, d]) => {
      const p = ((o.t * 2.2 + d) % 1);
      ctx.save(); ctx.globalAlpha = sw * (1 - p);
      ctx.translate(side * (mw * 0.95), my - 60 + p * 140); ctx.scale(sw, sw);
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.quadraticCurveTo(22, 0, 0, 14); ctx.quadraticCurveTo(-22, 0, 0, -34);
      ctx.fillStyle = '#9FD8FF'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    });
  }
  const cap = o.cap;
  if (cap != null) {
    ctx.save(); ctx.translate(0, my - mh - 10 - (1 - cap) * 900); ctx.rotate(-0.12 + 0.1 * (1 - clamp(cap)));
    ctx.lineWidth = 8; ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.rect(-95, -10, 190, 70); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-210, -20); ctx.lineTo(0, -95); ctx.lineTo(210, -20); ctx.lineTo(0, 55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 9;
    const sx = Math.sin(o.t * 6) * 14;
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(160, 0); ctx.lineTo(170 + sx, 110); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(170 + sx, 120, 16, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- voice-driven mouth
let VO = null;
const talk = (t) => { if (!VO) return 0; const i = t * VO.rate, a = Math.floor(i), f = i - a; const e = VO.env; return (e[a] || 0) * (1 - f) + (e[a + 1] || 0) * f; };
const blinkAt = (t, ts) => ts.reduce((m, b) => Math.max(m, bump(t, b, 0.09)), 0);
const beatPulse = (t, from, per) => (t < from ? 0 : Math.exp(-(((t - from) / per) % 1) * 6));

function keysS(t, keys, cfg = SPRING.gentle) {
  let v = keys[0][1].slice();
  for (let i = 1; i < keys.length; i++) {
    const k = sp(t, keys[i][0], cfg);
    if (k === 0) break;
    v = v.map((x, j) => x + (keys[i][1][j] - keys[i - 1][1][j]) * k);
  }
  return v;
}

// ---------------------------------------------------------------- backgrounds
function flood(ctx, t, t0, t1) {
  const p = E.inOutCubic(prog(t, t0, t1));
  if (p <= 0) return 0;
  const top = lerp(H + 80, -140, p);
  ctx.beginPath(); ctx.moveTo(-60, H + 60);
  for (let x = -60; x <= W + 60; x += 20) ctx.lineTo(x, top + Math.sin(x * 0.012 + t * 8) * 30 + Math.sin(x * 0.031 - t * 5) * 12);
  ctx.lineTo(W + 60, H + 60); ctx.closePath();
  ctx.fillStyle = C.blue; ctx.fill();
  return p;
}
function seaweed(ctx, t, t0) {
  const a = E.outCubic(prog(t, t0, t0 + 0.6));
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = C.weed; ctx.lineCap = 'round';
  [[60, 520, 34], [190, 380, 26], [880, 600, 36], [1010, 420, 28], [760, 300, 22]].forEach(([x0, h, w], i) => {
    ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, H + 20);
    for (let k = 1; k <= 12; k++) { const s = k / 12; ctx.lineTo(x0 + Math.sin(t * 2.2 + i * 1.3 + s * 3) * 40 * s, H + 20 - h * a * s); }
    ctx.stroke();
  });
  ctx.restore();
}
function bubbles(ctx, t, t0) {
  const a = prog(t, t0, t0 + 0.5);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = C.white; ctx.lineWidth = 5;
  for (let i = 0; i < 24; i++) {
    const sx = hash01(i, 7) * W, spd = 160 + hash01(i, 9) * 260, r = 8 + hash01(i, 11) * 22;
    const y = H + 60 - ((t * spd + hash01(i, 13) * H * 1.4) % (H * 1.4));
    ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + i) * 18, y, r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
function sandFloor(ctx, t, t0, t1) {
  const p = sp(t, t0) - E.inCubic(prog(t, t1, t1 + 0.25));
  if (p <= 0.001) return;
  const top = lerp(H + 40, 1640, p);
  ctx.beginPath(); ctx.moveTo(-60, H + 60);
  for (let x = -60; x <= W + 60; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.008) * 18);
  ctx.lineTo(W + 60, H + 60); ctx.closePath();
  ctx.fillStyle = C.sand; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.stroke();
  ctx.fillStyle = C.sandDark;
  for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(hash01(i, 21) * W, top + 50 + hash01(i, 23) * 220, 6 + hash01(i, 25) * 8, 0, TAU); ctx.fill(); }
}
function speedLines(ctx, x, y, vx, vy, amt) {
  if (amt <= 0.01) return;
  const v = Math.hypot(vx, vy); if (v < 1) return;
  const dx = vx / v, dy = vy / v, nx = -dy, ny = dx;
  ctx.save(); ctx.strokeStyle = C.white; ctx.lineCap = 'round'; ctx.lineWidth = 10; ctx.globalAlpha = 0.7 * amt;
  for (let i = 0; i < 7; i++) {
    const off = (hash01(i, 31) - 0.5) * 380, back = 250 + hash01(i, 33) * 170, len = clamp(v / 1500) * (140 + hash01(i, 35) * 160);
    const sx = x - dx * back + nx * off, sy = y - dy * back + ny * off;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx * len, sy - dy * len); ctx.stroke();
  }
  ctx.restore();
}
function ecg(ctx, t, t0, tFlat, t1) {
  const a = E.outCubic(prog(t, t0, t0 + 0.25)) * (1 - E.inCubic(prog(t, t1, t1 + 0.2)));
  if (a <= 0) return;
  const x0 = S.x, x1 = W - S.x, yc = S.y + 470, win = 1.6, per = 0.32;
  const val = (tt) => {
    if (tt < t0 || tt >= tFlat) return 0;
    const f = ((tt - t0) / per) % 1;
    return f < 0.06 ? -0.35 * Math.sin(f / 0.06 * Math.PI) : f < 0.16 ? Math.sin((f - 0.06) / 0.1 * Math.PI) : f < 0.24 ? -0.4 * Math.sin((f - 0.16) / 0.08 * Math.PI) : 0;
  };
  const flat = t >= tFlat;
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const head = lerp(x0, x1, a);
  const path = () => {
    ctx.beginPath();
    for (let x = x0; x <= head; x += 4) {
      const y = yc - val(t - ((x1 - x) / (x1 - x0)) * win) * 140;
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  };
  path(); ctx.strokeStyle = C.ink; ctx.lineWidth = 24; ctx.stroke();
  path(); ctx.strokeStyle = flat ? C.red : C.white; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.arc(head, yc - val(t) * 140, 16, 0, TAU); ctx.fillStyle = flat ? C.red : C.white; ctx.fill();
  ctx.restore();
}
function inkCloud(ctx, t, t0, ox, oy) {
  if (t < t0 || t > t0 + 1.3) return;
  ctx.save(); ctx.fillStyle = C.inkCloud;
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
function chip(ctx, x, y, sym, name, color, label, k, t) {
  if (k <= 0.001) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(Math.sin(t * 3 + x) * 0.05);
  ctx.lineWidth = 10; ctx.strokeStyle = C.ink;
  ctx.beginPath(); ctx.arc(0, 0, 105, 0, TAU); ctx.fillStyle = color; ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.white; ctx.textAlign = 'center';
  ctx.font = font(110, 900, DISPLAY); ctx.fillText(sym, 0, 38);
  ctx.font = font(48, 900, DISPLAY); ctx.fillText(name, 0, 170);
  ctx.font = font(40, 600, UI); ctx.fillText(label, 0, 218);
  ctx.restore();
}

// ---------------------------------------------------------------- camera
function camera(ctx, t, punches, shakes) {
  let z = 1;
  for (const b of punches) if (t >= b) z += 0.045 * Math.exp(-(t - b) * 9);
  zoomAbout(ctx, z, W / 2, H * 0.45);
  ctx.translate(W / 2, H / 2); ctx.rotate(Math.sin(t * 1.3) * 0.008); ctx.translate(-W / 2, -H / 2);
  for (const [b, amp] of shakes) if (t >= b) {
    const a = amp * Math.exp(-(t - b) / 0.22);
    if (a > 0.05) ctx.translate(a * M.noise1(t * 90, 3 + b), a * M.noise1(t * 90, 12 + b));
  }
}

// ---------------------------------------------------------------- film
const PAL = [[C.body, C.bodyDark], ['#3DDC84', '#26A862'], ['#A066FF', '#7C46D9'], ['#FFD23F', '#E0B21F'], ['#B7864F', '#8E6235'], ['#FF5FA8', '#D9408A']];

M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 600, UI)],
  hits: HITS,
  async init() { try { VO = await fetch('vo_env.json').then((r) => r.json()); } catch { VO = null; } },
  draw(ctx, u, t) {
    const tHearts = T(5), tTres = T(7), tDos = T(8), tTer = T(17), tOjo = T(23), tSangre = T(24), tAzul = T(27);
    const tCobre = T(30), tHierro = T(34), tPero = T(37), tNada = T(42), tCor = T(44), tSe = T(46);
    const tPor = T(48), tCam = T(51), tNoAc = T(52), tNueve = T(57), tCereb = T(58), tUno = T(59);
    const tCamb = T(65), tMenos = T(68), tSeg = T(72), tUn = T(73), tGenio = T(74), tSig = T(77), tEnd = TE(81);
    const tInk = tSig - 0.35, endCard = t >= tInk + 0.4;

    const punches = [0, tHearts, tTres, tDos, tTer, tOjo, tAzul, tCobre, tHierro, tSe, tCam, tNueve, tSeg, tGenio, tSig];
    const shakes = [[0, 12], [tTres, 22], [tAzul, 16], [T(47), 26], [tGenio + 0.15, 14], [tSig, 14]];

    fill(ctx, C.paper);
    ctx.save();
    camera(ctx, t, punches, shakes);
    ctx.fillStyle = C.paper; ctx.fillRect(-80, -80, W + 160, H + 160);
    if (!endCard) {
      const fp = flood(ctx, t, tAzul - 0.3, tAzul + 0.12);
      if (fp >= 1) { ctx.fillStyle = C.blue; ctx.fillRect(-80, -80, W + 160, H + 160); }
      seaweed(ctx, t, tAzul);
      bubbles(ctx, t, tAzul);
      sandFloor(ctx, t, tPor - 0.1, tNoAc);
    }
    const onBlue = t >= tAzul;
    const x0 = S.x;

    // ---- octopus blocking
    const PATH = [
      [-1, [540, 1440, 0.95]],
      [tHearts - 0.15, [540, 1500, 1.3]],
      [tDos, [540, 1520, 1.25]],
      [tOjo - 0.05, [520, 1330, 1.6]],
      [tSangre, [540, 1620, 1.1]],
      [tPero, [540, 1330, 0.82]],
      [tNada - 0.05, [320, 1330, 0.78]],
      [T(43), [760, 1170, 0.78]],
      [T(45), [400, 1260, 0.78]],
      [tSe, [560, 1200, 0.85]],
      [T(47) + 0.15, [560, 1340, 0.8]],
      [tNoAc, [540, 1500, 1.12]],
      [tInk + 0.45, [540, 1420, 0.95]],
    ];
    let [ox, oy, sc] = keysS(t, PATH);
    oy -= 120 * wobble(t * 2, 1.2, 3) * (t < 1.5 ? 1 : 0);
    const walk = clamp(prog(t, tPor, tPor + 0.15) - prog(t, tNoAc - 0.1, tNoAc + 0.05));
    if (walk > 0) { ox += lerp(0, 220, E.outQuad(prog(t, tPor, tNoAc))) * walk; oy -= Math.abs(Math.sin(t * 9)) * 25 * walk; }
    if (t > tGenio && t < tInk) oy -= Math.abs(Math.sin((t - tGenio) * 7)) * 70;
    if (t > tEnd) oy -= Math.abs(Math.sin((t - tEnd) * 6)) * 50;
    oy += Math.sin(t * 4.2) * 10;
    const [px, py] = keysS(t - 0.03, PATH);
    const [qx, qy] = keysS(t, PATH);
    const vx = (qx - px) / 0.03, vy = (qy - py) / 0.03;
    const swim = clamp(prog(t, tNada - 0.1, tNada + 0.1) - prog(t, tSe - 0.1, tSe + 0.1));
    const rot = swim * clamp(Math.atan2(vy, vx) + Math.PI / 2, -1.1, 1.1) * clamp(Math.hypot(vx, vy) / 500)
      + Math.sin(t * 4.2) * 0.04 * (1 - swim);
    speedLines(ctx, ox, oy - 200 * sc, vx, vy, swim);
    const squash = 0.08 * wobble(t * 2, 1.2, 3) + (t > tAzul ? 0.06 * wobble((t - tAzul) * 2, 1.4, 4) : 0)
      + (t > T(47) ? 0.08 * wobble((t - T(47) - 0.2) * 2, 1.4, 4) : 0) - 0.1 * bump(t, tNada, 0.15) - 0.1 * bump(t, T(43), 0.15);
    const hearts = [sp(t, tHearts), sp(t, tHearts + 0.12), sp(t, tHearts + 0.24)];
    const hl2 = clamp(prog(t, tDos, tDos + 0.15) - prog(t, T(22), T(22) + 0.2));
    const hl1 = clamp(prog(t, tTer, tTer + 0.15) - prog(t, T(22), T(22) + 0.2));
    const xray = clamp(sp(t, tHearts - 0.15, SPRING.snappy) - prog(t, tPor - 0.1, tPor + 0.15) * 1.2, 0, 1.2);
    const stop = clamp(prog(t, tSe, tSe + 0.25));
    const shock = clamp(prog(t, tSe, tSe + 0.1) - prog(t, tPor - 0.1, tPor));
    const look = t < tHearts ? [0.3, -0.9] : t < tOjo ? [0, -1] : t < tPero ? [-0.4, -0.8] : t < tSe ? [0.6, -0.4]
      : t < tPor ? [0, -1] : t < tNoAc ? [1, -0.2] : t < tCamb ? [0, -1] : [Math.sin(t * 3) * 0.6, -0.4];
    let colors = PAL[0];
    if (t >= tCamb && t < tSeg + 0.4) colors = PAL[1 + Math.floor((t - tCamb) / 0.13) % (PAL.length - 1)];
    const brains = t >= tNueve - 0.05 && t < tCamb ? [sp(t, tNueve), ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => sp(t, tCereb + 0.1 + k * 0.15))]
      .map((k) => k * (1 - E.inBack(prog(t, tCamb - 0.25, tCamb)))) : null;
    const capK = t >= tGenio - 0.3 && t < tInk + 0.4 ? sp(t, tGenio - 0.1, SPRING.bouncy) : null;
    octopus(ctx, {
      x: ox, y: oy, s: sc, t, squash, rot, colors, brains, cap: capK,
      blink: blinkAt(t, [2.1, 5.5, 9.9, 16.3, 18.9, 24.7]),
      look, swim, shock, stop,
      spread: clamp(prog(t, tNueve - 0.2, tNueve) - prog(t, tCamb - 0.25, tCamb)),
      walk, walkPhase: t * 9,
      wave: clamp(sp(t, tEnd, SPRING.gentle)),
      xray, hearts, beatPulse: beatPulse(t, tHearts, 0.4), hl: [hl2, hl2, hl1],
      heartColor: onBlue ? C.blueDeep : C.heart,
      bigEye: clamp(sp(t, tOjo - 0.05) - prog(t, tSangre - 0.1, tSangre + 0.1)),
      wink: bump(t, tEnd + 0.4, 0.3),
      sweat: clamp(prog(t, T(47), T(47) + 0.2) - prog(t, tPor + 0.2, tPor + 0.4)),
      mouth: clamp(talk(t) * 1.15),
    });
    ecg(ctx, t, tNada - 0.2, tSe, tPor - 0.1);

    // ---- type, each line on its word
    const H1 = font(112, 900, DISPLAY);
    if (t < tTres + 0.7) {
      line(ctx, '¿SABÍAS QUE', x0, S.y + 120, H1, C.ink, -0.3, T(4) - 0.1, t);
      const big = Math.min(270, fitSize(ctx, 'PULPO', 900, DISPLAY, S.w + 30, 400));
      line(ctx, 'EL', x0 - 6, S.y + 120 + big * 0.98, font(big, 900, DISPLAY), C.body, T(2) - 0.06, T(4) - 0.05, t, { wob: 0.1 });
      line(ctx, 'PULPO', x0 - 6, S.y + 120 + big * 1.88, font(big, 900, DISPLAY), C.body, T(3) - 0.06, T(4), t, { stagger: 0.025, wob: 0.1 });
      line(ctx, 'TIENE', x0, S.y + 120, H1, C.ink, T(4) - 0.05, tTres - 0.1, t);
      if (t >= tHearts - 0.05 && t < tTres) {
        const k = sp(t, tHearts - 0.05);
        const out = E.inBack(prog(t, tTres - 0.12, tTres), 1.6);
        glyph(ctx, '3', x0 + 330, S.y + 390 - out * 600, font(330, 900, DISPLAY), C.heart, 0.6 + 0.4 * k, 0.6 + 0.4 * k, (1 - k) * 0.4 + 0.06 * Math.sin(t * 9));
      }
      const cz = fitSize(ctx, 'CORAZONES', 900, DISPLAY, S.w, 200);
      line(ctx, 'CORAZONES', x0, S.y + 390 + cz * 0.95, font(cz, 900, DISPLAY), C.ink, T(6) - 0.06, tTres - 0.08, t, { wob: 0.1 });
      const tr = fitSize(ctx, '¡TRES!', 900, DISPLAY, S.w + 40, 330);
      line(ctx, '¡TRES!', x0 - 8, S.y + 80 + tr * 0.95, font(tr, 900, DISPLAY), C.heart, tTres - 0.05, tDos - 0.12, t, { stagger: 0.03, wob: 0.25 });
    }
    if (t >= tDos - 0.2 && t < tOjo + 0.3) {
      const out = T(22) - 0.05;
      const rows = [['2', 'BRANQUIAS', 'mandan sangre a las', tDos, T(14), S.y + 260], ['1', 'CUERPO', 'y el tercero, al', tTer, T(21), S.y + 500]];
      rows.forEach(([d, word, small, t0, tw, base], i) => {
        line(ctx, d, x0, base, font(220, 900, DISPLAY), C.heart, t0 - 0.05, out + i * 0.04, t);
        arrow(ctx, x0 + 150, base - 75, 110, E.outCubic(prog(t, t0 + 0.05, t0 + 0.3)) * (1 - E.inBack(prog(t, out, out + 0.15))), C.ink);
        line(ctx, small, x0 + 304, base - 160, font(60, 600, UI), C.ink, t0 + 0.1, out + i * 0.04, t, { stagger: 0.006, cfg: SPRING.snappy });
        const wf = font(fitSize(ctx, word, 900, DISPLAY, S.w - 300, 140), 900, DISPLAY);
        line(ctx, word, x0 + 300, base - 20, wf, C.ink, tw - 0.06, out + 0.02 + i * 0.04, t, { wob: 0.08 });
      });
      const oj = fitSize(ctx, '¡OJO!', 900, DISPLAY, S.w * 0.7, 300);
      line(ctx, '¡OJO!', x0, S.y + 80 + oj * 0.95, font(oj, 900, DISPLAY), C.ink, tOjo - 0.06, tSangre - 0.12, t, { stagger: 0.03, wob: 0.2 });
    }
    if (t >= tSangre - 0.2 && t < tPero + 0.3) {
      const out = tPero - 0.1;
      const cs = () => M.mix(C.ink, C.white, prog(t, tAzul - 0.15, tAzul + 0.05));
      line(ctx, 'SU SANGRE', x0, S.y + 110, font(104, 900, DISPLAY), C.ink, tSangre - 0.06, out, t, { colorAt: cs });
      const az = fitSize(ctx, 'ES AZUL', 900, DISPLAY, S.w + 40, 280);
      line(ctx, 'ES AZUL', x0 - 4, S.y + 110 + az * 0.98, font(az, 900, DISPLAY), C.white, tAzul - 0.12, out + 0.03, t, { stagger: 0.03, wob: 0.2 });
      const k1 = sp(t, tCobre - 0.06) * (1 - E.inBack(prog(t, out, out + 0.18)));
      const k2 = sp(t, tHierro - 0.06) * (1 - E.inBack(prog(t, out + 0.03, out + 0.21)));
      const cy = S.y + 520;
      chip(ctx, 290, cy, 'Cu', 'COBRE', C.copper, 'pulpo', k1, t);
      chip(ctx, 790, cy, 'Fe', 'HIERRO', C.iron, 'nosotros', k2, t);
      const vs = sp(t, tHierro) * (1 - prog(t, out, out + 0.1));
      if (vs > 0.01) glyph(ctx, 'vs', 540, cy + 30, font(80, 900, DISPLAY), C.white, vs, vs);
    }
    if (t >= tPero - 0.2 && t < tPor + 0.2) {
      line(ctx, 'LO MÁS LOCO:', x0, S.y + 110, font(104, 900, DISPLAY), C.white, tPero, tNada - 0.3, t, { wob: 0.15 });
      const nz = fitSize(ctx, 'CUANDO NADA...', 900, DISPLAY, S.w, 200);
      line(ctx, 'CUANDO NADA...', x0, S.y + 110 + nz * 0.98, font(nz, 900, DISPLAY), C.white, T(41) - 0.05, tCor - 0.12, t, { stagger: 0.012 });
      line(ctx, 'SU CORAZÓN', x0, S.y + 110, font(104, 900, DISPLAY), C.white, tCor - 0.06, tPor - 0.15, t);
      const st = fitSize(ctx, '¡SE DETIENE!', 900, DISPLAY, S.w + 20, 230);
      bar(ctx, x0 - 20, S.y + 140, S.w + 40, st * 1.02, C.red, tSe - 0.05, tPor - 0.15, t);
      line(ctx, '¡SE DETIENE!', x0 - 4, S.y + 130 + st * 0.92, font(st, 900, DISPLAY), C.white, tSe - 0.04, tPor - 0.12, t, { stagger: 0.02, wob: 0.25 });
    }
    if (t >= tPor - 0.2 && t < tNoAc + 0.2) {
      line(ctx, 'POR ESO PREFIERE', x0, S.y + 110, font(92, 900, DISPLAY), C.white, tPor - 0.05, tNoAc - 0.1, t, { stagger: 0.01 });
      const cm = fitSize(ctx, 'CAMINAR', 900, DISPLAY, S.w + 30, 300);
      line(ctx, 'CAMINAR', x0 - 6, S.y + 110 + cm * 0.98, font(cm, 900, DISPLAY), C.sand, tCam - 0.06, tNoAc - 0.06, t, { stagger: 0.025, wob: 0.25 });
    }
    if (t >= tNoAc - 0.2 && t < tCamb + 0.2) {
      const na = fitSize(ctx, '¡Y NO ACABA AHÍ!', 900, DISPLAY, S.w, 130);
      line(ctx, '¡Y NO ACABA AHÍ!', x0, S.y + 110, font(na, 900, DISPLAY), C.white, tNoAc - 0.05, tNueve - 0.15, t, { stagger: 0.01, wob: 0.12 });
      if (t >= tNueve - 0.05 && t < tCamb) {
        const shown = t < tCereb + 0.1 ? 1 : Math.min(9, 2 + Math.floor((t - tCereb - 0.1) / 0.15));
        const k = sp(t, tNueve - 0.05), out = E.inBack(prog(t, tCamb - 0.15, tCamb), 1.6);
        const pop = 1 + 0.15 * Math.exp(-(((t - tCereb - 0.1) % 0.15 + 0.15) % 0.15) * 30) * (shown > 1 && shown < 9 ? 1 : 0);
        glyph(ctx, String(shown), x0 + 110, S.y + 330 - out * 700, font(300, 900, DISPLAY), C.brain, (0.5 + 0.5 * k) * pop, (0.5 + 0.5 * k) * pop, (1 - k) * 0.4);
      }
      const cf = font(fitSize(ctx, 'CEREBROS', 900, DISPLAY, S.w - 270, 170), 900, DISPLAY);
      line(ctx, 'CEREBROS', x0 + 260, S.y + 270, cf, C.white, tCereb - 0.06, tCamb - 0.12, t, { wob: 0.12 });
      line(ctx, 'uno en cada brazo', x0 + 266, S.y + 350, font(56, 600, UI), C.white, tUno - 0.05, tCamb - 0.1, t, { stagger: 0.006, cfg: SPRING.snappy });
    }
    if (t >= tCamb - 0.2 && t < tUn + 0.2) {
      const cc = fitSize(ctx, 'CAMBIA DE COLOR', 900, DISPLAY, S.w, 150);
      line(ctx, 'CAMBIA DE COLOR', x0, S.y + 110, font(cc, 900, DISPLAY), C.white, tCamb - 0.05, tUn - 0.1, t,
        { stagger: 0.012, wob: 0.1, colorAt: (j) => (t < tSeg + 0.4 ? PAL[(j + Math.max(0, Math.floor((t - tCamb) / 0.13))) % PAL.length][0] : C.white) });
      line(ctx, 'en menos de', x0 + 4, S.y + 210, font(64, 600, UI), C.white, tMenos - 0.05, tUn - 0.08, t, { stagger: 0.008 });
      const us = fitSize(ctx, '1 SEGUNDO', 900, DISPLAY, S.w, 220);
      line(ctx, '1 SEGUNDO', x0, S.y + 230 + us * 0.95, font(us, 900, DISPLAY), C.gold, T(71) - 0.06, tUn - 0.06, t, { stagger: 0.02, wob: 0.18 });
    }
    if (t >= tUn - 0.2 && t < tInk + 0.3) {
      line(ctx, '¡UN GENIO', x0, S.y + 130, font(150, 900, DISPLAY), C.gold, tUn - 0.05, tInk + 0.1, t, { stagger: 0.02, wob: 0.15 });
      line(ctx, 'DEL OCÉANO!', x0, S.y + 280, font(fitSize(ctx, 'DEL OCÉANO!', 900, DISPLAY, S.w, 150), 900, DISPLAY), C.white, T(75) - 0.05, tInk + 0.12, t, { stagger: 0.015 });
    }
    if (endCard) {
      const big = fitSize(ctx, 'SÍGUEME', 900, DISPLAY, S.w + 40, 260);
      line(ctx, 'SÍGUEME', x0 - 4, S.y + 40 + big * 0.9, font(big, 900, DISPLAY), C.body, tSig - 0.05, null, t, { stagger: 0.02, wob: 0.15 });
      line(ctx, 'para más datos', x0 + 4, S.y + 40 + big * 0.9 + 130, font(96, 900, DISPLAY), C.ink, T(78) - 0.04, null, t, { stagger: 0.012 });
      line(ctx, 'curiosos', x0 + 4, S.y + 40 + big * 0.9 + 240, font(96, 900, DISPLAY), C.ink, T(81) - 0.05, null, t, { stagger: 0.015, wob: 0.15 });
    }
    inkCloud(ctx, t, tInk, ox, oy);
    ctx.restore();
  },
});
