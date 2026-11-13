// Pulpo: 3 corazones — pure function of time. window.seek(t) paints frame t.
// Timing in beats (u): 120 bpm, 1 beat = 0.5 s, 60 beats = 30 s. docs/shotlist.md is the plan.
import * as M from './lib/motion.js';

const { W, H, FORMAT, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, bump, font, layout, fitSize, glyph, fill, hash01, noise1, zoomAbout, TAU } = M;

const C = {
  paper: '#FFF1E2', ink: '#1C1A33', blue: '#2F5BFF', blueDeep: '#1E3FCC', weed: '#2447D9',
  body: '#FF7A6B', bodyDark: '#E85A4E', belly: '#FFB4A3', white: '#FFFFFF', heart: '#D9304A',
  stop: '#8D96C9', red: '#FF4D6D', sand: '#F6C978', sandDark: '#E3AE58', inkCloud: '#14122A',
};
const DISPLAY = 'Display', UI = 'UI';
const S = FORMAT.safe;

// Every accent: [beat, label, sfx, opts]. sfx.mjs voices them so sound can't drift from picture.
const HITS = [
  [0, 'hook', 'impact'],
  [0.6, 'octopus pops up', 'boing', { pitch: 'C5', to: 'G5' }],
  [1.5, 'EL', 'thud'],
  [2, 'PULPO', 'thud', { pitch: 120 }],
  [6, 'push in', 'whoosh', { len: 0.4 }],
  [8, 'heart 1', 'pop', { pitch: 'D5' }],
  [9, 'heart 2', 'pop', { pitch: 'F5' }],
  [10, 'heart 3', 'pop', { pitch: 'A5' }],
  [11, 'CORAZONES', 'bell', { pitch: 'D6' }],
  [16, 'blue flood', 'riser', { len: 1.0 }],
  [16, 'flood lands', 'sub', { len: 0.8 }],
  [17, 'Y SU SANGRE', 'pop', { pitch: 'E5' }],
  [18, 'ES AZUL', 'impact'],
  [20, 'hemocianina', 'tick'],
  [21, 'cobre', 'coins'],
  [26, 'para qué', 'tick'],
  [27, '2 branquias', 'blip', { pitch: 'A5' }],
  [29.5, '1 cuerpo', 'blip', { pitch: 'D6' }],
  [34, 'PERO CUANDO', 'whoosh', { len: 0.4, from: 2400, to: 600 }],
  [35, 'jet 1', 'whoosh', { len: 0.35, from: 300, to: 2600 }],
  [36, 'ecg', 'blip', { pitch: 'A6' }],
  [37, 'jet 2 + ecg', 'whoosh', { len: 0.35, from: 300, to: 2600, pan: 0.4 }],
  [37, 'ecg', 'blip', { pitch: 'A6' }],
  [38, 'ecg', 'blip', { pitch: 'A6' }],
  [39, 'jet 3 + ecg', 'whoosh', { len: 0.35, from: 300, to: 2600, pan: -0.4 }],
  [39, 'ecg', 'blip', { pitch: 'A6' }],
  [40, 'ecg', 'blip', { pitch: 'A6' }],
  [41, 'flatline', 'blip', { pitch: 'A6', len: 1.6, gain: 0.16 }],
  [42, 'SE DETIENE', 'impact'],
  [43, 'sinks', 'boing', { pitch: 'G5', to: 'C4', len: 0.7 }],
  [45.5, 'sand floor', 'thud'],
  [45.8, 'POR ESO PREFIERE', 'pop', { pitch: 'E5' }],
  [46.8, 'CAMINAR', 'boing', { pitch: 'C5', to: 'C6', gain: 0.1 }],
  [48, 'step', 'tok', { pitch: 'D5', gain: 0.15 }],
  [49, 'step', 'tok', { pitch: 'F5' }],
  [50, 'step', 'tok', { pitch: 'D5' }],
  [51, 'step', 'tok', { pitch: 'A5' }],
  [51.8, 'ink squirt', 'whoosh', { len: 0.6, from: 3000, to: 300 }],
  [52, 'ink lands', 'sub', { len: 0.8 }],
  [53.5, 'end card', 'impact'],
  [54.2, 'para más datos', 'pop', { pitch: 'A5' }],
  [55, 'wink', 'bell', { pitch: 'A6' }],
];

// ---------------------------------------------------------------- type helpers
// A line of type: glyphs spring up on uIn, fly up and out on uOut.
function line(ctx, str, x, base, f, color, uIn, uOut, u, { stagger = 0.04, cfg = SPRING.bouncy, rise = 1.1, wob = 0 } = {}) {
  const L = layout(ctx, str, f, 0);
  const size = parseInt(f.split(' ')[1], 10);
  L.glyphs.forEach((g, j) => {
    const k = springU(u, uIn + j * stagger, cfg);
    if (k <= 0.001) return;
    const out = uOut == null ? 0 : E.inBack(prog(u, uOut + j * 0.015, uOut + 0.35 + j * 0.015), 1.6);
    if (out >= 1) return;
    const w = wob ? wob * wobble((u - uIn - j * stagger) * 0.5, 2.6, 4) : 0;
    const y = base + (1 - k) * size * rise - out * (size * 2.2);
    glyph(ctx, g.ch, x + g.cx, y, f, color, 1 + w, 1 - w, (1 - k) * 0.25 * (j % 2 ? 1 : -1));
  });
  return L;
}
// A highlighter bar that wipes in behind a word.
function bar(ctx, x, y, w, h, color, uIn, uOut, u) {
  const p = E.outCubic(prog(u, uIn, uIn + 0.5));
  const q = uOut == null ? 0 : E.inCubic(prog(u, uOut, uOut + 0.3));
  if (p <= 0 || q >= 1) return;
  ctx.fillStyle = color;
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.03);
  ctx.fillRect(w * q, 0, w * (p - q), h);
  ctx.restore();
}

// ---------------------------------------------------------------- the octopus
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.95);
  ctx.bezierCurveTo(x - s * 1.25, y + s * 0.15, x - s * 0.95, y - s * 0.85, x, y - s * 0.32);
  ctx.bezierCurveTo(x + s * 0.95, y - s * 0.85, x + s * 1.25, y + s * 0.15, x, y + s * 0.95);
  ctx.closePath();
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
}

// pose blends: swim (tentacles trail straight back), walk (tentacles step), wave (one arm up)
function armPose(i, front, o, t) {
  const k = front ? (i - 1.5) : (i - 1.5);
  let ang = Math.PI / 2 - k * (front ? 0.85 : 0.55);
  let curl = (i < 2 ? 1 : -1) * (front ? 1.5 : 1.2);
  let len = front ? 360 : 330;
  const sw = o.swim || 0, wk = o.walk || 0;
  if (sw) { ang = lerp(ang, Math.PI / 2 - k * 0.12, sw); curl = lerp(curl, 0, sw); len = lerp(len, 430, sw); }
  if (wk) { ang += Math.sin(o.walkPhase + i * Math.PI / 2 + (front ? 0 : 1)) * 0.38 * wk; }
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
  for (let i = 0; i < 4; i++) {
    const [ang, curl, len] = armPose(i, false, o, t);
    tentacle(ctx, (i - 1.5) * 70, -40, ang, len, 34, t, i * 1.7 + 3, curl, C.bodyDark, freq);
  }
  for (let i = 0; i < 4; i++) {
    const [ang, curl, len] = armPose(i, true, o, t);
    tentacle(ctx, (i - 1.5) * 95, -10, ang, len, 44, t, i * 2.3, curl, C.body, freq);
  }
  // mantle
  const mw = 255, mh = 290, my = -200;
  const breathe = 1 + Math.sin(t * 2.4) * 0.015;
  ctx.beginPath();
  ctx.ellipse(0, my, mw * breathe, mh / breathe, 0, Math.PI * 0.92, Math.PI * 2.08);
  ctx.bezierCurveTo(mw * 0.9, my + mh * 0.75, mw * 0.55, 30, 0, 30);
  ctx.bezierCurveTo(-mw * 0.55, 30, -mw * 0.9, my + mh * 0.75, -mw * Math.cos(Math.PI * 0.08), my + mh * Math.sin(Math.PI * 0.08));
  ctx.closePath();
  ctx.fillStyle = C.body; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-mw * 0.42, my - mh * 0.55, 60, 95, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = C.bodyDark;
  [[0.5, -0.5, 18], [0.66, -0.22, 12], [0.38, -0.3, 10]].forEach(([a, b, r]) => {
    ctx.beginPath(); ctx.arc(mw * a, my + mh * b, r, 0, TAU); ctx.fill();
  });
  const xr = o.xray || 0;
  if (xr > 0) {
    ctx.globalAlpha = clamp(xr);
    ctx.fillStyle = C.belly;
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
      const sc = k * (1 + 0.16 * pulse) * (1 + 0.12 * hl);
      if (hl > 0) {
        ctx.save(); ctx.globalAlpha = 0.25 * hl; ctx.fillStyle = C.white;
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
  // face
  const ey = -50, ex = 82;
  const blink = o.blink || 0, shock = o.shock || 0;
  [-1, 1].forEach((side) => {
    const shut = side === 1 ? Math.max(blink, o.wink || 0) : blink;
    ctx.save(); ctx.translate(side * ex, ey); ctx.scale(1 + 0.15 * shock, Math.max(0.08, 1 - shut) * (1 + 0.15 * shock));
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 54, 0, 0, TAU);
    ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 8; ctx.stroke();
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
  if (shock > 0.5) { // small "o" of surprise
    ctx.ellipse(0, 18, 14, 18 + open * 8, 0, 0, TAU); ctx.fillStyle = C.ink; ctx.fill();
  } else {
    ctx.moveTo(-34 - open * 8, 2); ctx.quadraticCurveTo(0, 30 + open * 60, 34 + open * 8, 2);
    if (open > 0.05) { ctx.closePath(); ctx.fillStyle = C.ink; ctx.fill(); }
    ctx.stroke();
  }
  // sweat drops
  const sw = o.sweat || 0;
  if (sw > 0) {
    [[-1, 0], [1, 0.4]].forEach(([side, d]) => {
      const p = ((o.t * 1.3 + d) % 1);
      ctx.save(); ctx.globalAlpha = sw * (1 - p);
      ctx.translate(side * (mw * 0.95), my - 60 + p * 140); ctx.scale(sw, sw);
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.quadraticCurveTo(22, 0, 0, 14); ctx.quadraticCurveTo(-22, 0, 0, -34);
      ctx.fillStyle = '#9FD8FF'; ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      ctx.restore();
    });
  }
  ctx.restore();
}

// voice envelope (100 Hz) drives the mouth: the octopus is the narrator
let VO = null;
const talk = (t) => { if (!VO) return 0; const i = t * VO.rate, a = Math.floor(i), f = i - a; const e = VO.env; return (e[a] || 0) * (1 - f) + (e[a + 1] || 0) * f; };
const blinkAt = (u, beats) => beats.reduce((m, b) => Math.max(m, bump(u, b, 0.18)), 0);
const beatPulse = (u, from) => (u < from ? 0 : Math.exp(-((u % 1) * 6)));

// ---------------------------------------------------------------- octopus blocking
const PATH = [
  [-0.45, [540, 1440, 0.95]],
  [6, [540, 1500, 1.3]],
  [33.4, [540, 1260, 0.82]],
  [35, [330, 1350, 0.78]],
  [37, [760, 1180, 0.78]],
  [39, [360, 1300, 0.78]],
  [41, [560, 1240, 0.85]],
  [43, [560, 1560, 0.8]],
  [45.4, [-420, 1360, 0.78]],
  [51.6, [540, 1360, 0.78]],
  [53.2, [540, 1420, 0.95]],
];
function octoAt(u) {
  let [x, y, s] = springKeys(u, PATH, SPRING.gentle);
  if (u < 0.2) y = lerp(H + 700, y, springU(u, -0.45, SPRING.bouncy)); // first rise is bouncy
  // walk in from the left: linear stroll, bob on each step
  if (u >= 45.4 && u < 51.6) {
    x = lerp(-300, 540, E.outQuad(prog(u, 45.4, 49.5)));
    y = 1360 - Math.abs(Math.sin(u * Math.PI)) * 30;
  }
  // dance on the beat while a fact sinks in
  const dance = clamp(prog(u, 12, 12.5) - prog(u, 14.8, 15.2)) + clamp(prog(u, 22, 22.5) - prog(u, 25.2, 25.6));
  x += Math.sin(u * Math.PI / 2) * 45 * dance;
  y -= Math.abs(Math.sin(u * Math.PI)) * 25 * dance;
  // end card: little hops every two beats
  if (u > 55.5) y -= Math.abs(Math.sin((u - 55.5) * Math.PI / 2)) * 60;
  return [x, y, s];
}

// ---------------------------------------------------------------- backgrounds
function flood(ctx, u, t) {
  const p = E.inOutCubic(prog(u, 15.2, 16.4));
  if (p <= 0) return 0;
  const top = lerp(H + 80, -120, p);
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, top + Math.sin(x * 0.012 + t * 5) * 28 + Math.sin(x * 0.031 - t * 3) * 12);
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = C.blue; ctx.fill();
  return p;
}
function seaweed(ctx, u, t) {
  const a = E.outCubic(prog(u, 16.2, 17.5));
  if (a <= 0) return;
  ctx.save(); ctx.strokeStyle = C.weed; ctx.lineCap = 'round';
  [[60, 520, 34], [190, 380, 26], [880, 600, 36], [1010, 420, 28], [760, 300, 22]].forEach(([x0, h, w], i) => {
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, H + 20);
    for (let k = 1; k <= 12; k++) {
      const s = k / 12;
      ctx.lineTo(x0 + Math.sin(t * 1.6 + i * 1.3 + s * 3) * 40 * s, H + 20 - h * a * s);
    }
    ctx.stroke();
  });
  ctx.restore();
}
function bubbles(ctx, u, t) {
  const a = prog(u, 16, 17);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = C.white; ctx.lineWidth = 5;
  for (let i = 0; i < 22; i++) {
    const sx = hash01(i, 7) * W, sp = 120 + hash01(i, 9) * 220, r = 8 + hash01(i, 11) * 22;
    const y = H + 60 - ((t * sp + hash01(i, 13) * H * 1.4) % (H * 1.4));
    ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + i) * 18, y, r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
function sandFloor(ctx, u) {
  const p = springU(u, 45.2, SPRING.bouncy) - E.inCubic(prog(u, 52.6, 53));
  if (p <= 0.001) return;
  const top = lerp(H + 40, 1640, p);
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, top + Math.sin(x * 0.008) * 18);
  ctx.lineTo(W, H); ctx.closePath();
  ctx.fillStyle = C.sand; ctx.fill(); ctx.strokeStyle = C.ink; ctx.lineWidth = 8; ctx.stroke();
  ctx.fillStyle = C.sandDark;
  for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(hash01(i, 21) * W, top + 50 + hash01(i, 23) * 220, 6 + hash01(i, 25) * 8, 0, TAU); ctx.fill(); }
}
// speed lines trailing a swimming octopus
function speedLines(ctx, u, x, y, vx, vy, amt) {
  if (amt <= 0.01) return;
  const v = Math.hypot(vx, vy); if (v < 1) return;
  const dx = vx / v, dy = vy / v, nx = -dy, ny = dx;
  ctx.save(); ctx.strokeStyle = C.white; ctx.lineCap = 'round'; ctx.lineWidth = 10; ctx.globalAlpha = 0.7 * amt;
  for (let i = 0; i < 6; i++) {
    const off = (hash01(i, 31) - 0.5) * 360, back = 260 + hash01(i, 33) * 160, len = clamp(v / 40) * (120 + hash01(i, 35) * 140);
    const sx = x - dx * back + nx * off, sy = y - dy * back + ny * off;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - dx * len, sy - dy * len); ctx.stroke();
  }
  ctx.restore();
}
// heart monitor: a scrolling trace, beats until u41 then flat
function ecg(ctx, u) {
  const a = E.outCubic(prog(u, 35.6, 36.2)) * (1 - E.inCubic(prog(u, 45.3, 45.7)));
  if (a <= 0) return;
  const x0 = S.x, x1 = W - S.x, yc = S.y + 440, win = 4;
  const val = (uu) => {
    if (uu < 35.6 || uu >= 41) return 0;
    const f = uu - Math.floor(uu);
    return (f < 0.06 ? -0.35 * Math.sin(f / 0.06 * Math.PI) : f < 0.16 ? Math.sin((f - 0.06) / 0.1 * Math.PI) : f < 0.24 ? -0.4 * Math.sin((f - 0.16) / 0.08 * Math.PI) : 0);
  };
  const flat = u >= 41;
  ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const head = lerp(x0, x1, a);
  const path = () => {
    ctx.beginPath();
    for (let x = x0; x <= head; x += 4) {
      const uu = u - ((x1 - x) / (x1 - x0)) * win;
      const y = yc - val(uu) * 150;
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  };
  path(); ctx.strokeStyle = C.ink; ctx.lineWidth = 24; ctx.stroke();
  path(); ctx.strokeStyle = flat ? C.red : C.white; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.arc(head, yc - val(u) * 150, 16, 0, TAU); ctx.fillStyle = flat ? C.red : C.white; ctx.fill();
  ctx.restore();
}
// ink squirt: blobs burst from the octopus, cover the frame, then recede onto the end card
function inkCloud(ctx, u, ox, oy) {
  if (u < 51.7 || u > 54.6) return;
  ctx.save(); ctx.fillStyle = C.inkCloud;
  for (let i = 0; i < 30; i++) {
    const d = hash01(i, 41) * 0.35;
    const grow = E.outCubic(prog(u, 51.7 + d, 52.5 + d));
    const shrink = E.inCubic(prog(u, 53.2 + d * 1.5, 54.1 + d * 1.5));
    const r = (180 + hash01(i, 43) * 380) * grow * (1 - shrink);
    if (r <= 1) continue;
    const ang = hash01(i, 45) * TAU, dist = (200 + hash01(i, 47) * 900) * grow;
    ctx.beginPath(); ctx.arc(ox + Math.cos(ang) * dist, oy - 200 + Math.sin(ang) * dist * 1.3, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- camera: beat punches + impact shake
const PUNCH = [0, 2, 8, 9, 10, 11, 18, 21, 27, 29.5, 42, 46.8, 53.5];
const SHAKE = [[0, 14], [18, 18], [42, 26], [45.5, 10], [52, 14], [53.5, 16]];
function camera(ctx, u) {
  let z = 1;
  for (const b of PUNCH) if (u >= b) z += 0.035 * Math.exp(-(u - b) * 5);
  zoomAbout(ctx, z, W / 2, H * 0.45);
  for (const [b, amp] of SHAKE) M.shake(ctx, u, b, amp, 3 + b, 0.5);
}

// ---------------------------------------------------------------- film
M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 600, UI)],
  hits: HITS,
  async init() { try { VO = await fetch('vo_env.json').then((r) => r.json()); } catch { VO = null; } },
  draw(ctx, u, t) {
    const endCard = u >= 53.2;
    fill(ctx, C.paper);
    ctx.save();
    camera(ctx, u);
    ctx.fillStyle = C.paper; ctx.fillRect(-60, -60, W + 120, H + 120);
    if (!endCard) {
      const fp = flood(ctx, u, t);
      if (fp >= 1) { ctx.fillStyle = C.blue; ctx.fillRect(-60, -60, W + 120, H + 120); }
      seaweed(ctx, u, t);
      bubbles(ctx, u, t);
      sandFloor(ctx, u);
    }
    const x0 = S.x;

    // ---- octopus
    const [ox, oy, sc] = octoAt(u);
    const [px, py] = octoAt(u - 0.08);
    const vx = (ox - px) / 0.08 / 30, vy = (oy - py) / 0.08 / 30;  // px per frame-ish
    const swim = clamp(prog(u, 34.6, 35) - prog(u, 40.8, 41.2));
    const dance = clamp(prog(u, 12, 12.5) - prog(u, 14.8, 15.2)) + clamp(prog(u, 22, 22.5) - prog(u, 25.2, 25.6));
    const rot = Math.sin(u * Math.PI / 2 + Math.PI / 2) * 0.08 * dance + swim * clamp(Math.atan2(vy, vx) + Math.PI / 2, -1.2, 1.2) * clamp(Math.hypot(vx, vy) / 6);
    speedLines(ctx, u, ox, oy - 200 * sc, vx, vy, swim);
    const jet = [35, 37, 39].reduce((m, b) => m + 0.12 * bump(u, b - 0.1, 0.35), 0);
    const squash = 0.07 * wobble((u - 0.6) * 0.5, 2.2, 5) + 0.05 * wobble((u - 16.2) * 0.5, 2.4, 5)
      + 0.08 * wobble((u - 43.6) * 0.5, 2.4, 5) - jet;
    const hearts = [springU(u, 8, SPRING.bouncy), springU(u, 9, SPRING.bouncy), springU(u, 10, SPRING.bouncy)];
    const hl2 = clamp(prog(u, 27, 27.4) - prog(u, 32.6, 33));
    const hl1 = clamp(prog(u, 29.5, 29.9) - prog(u, 32.6, 33));
    const xray = clamp(springU(u, 7.2, SPRING.gentle) - prog(u, 45.4, 46) * 1.2, 0, 1.2);
    const stop = clamp(prog(u, 41, 41.6));
    const shock = clamp(prog(u, 41, 41.3) - prog(u, 44.5, 45));
    const look = u < 6 ? [0.3, -0.9] : u < 16 ? [0, -1] : u < 34 ? [-0.4, -0.8] : u < 41 ? [0.6, -0.4]
      : u < 45 ? [0, -1] : u < 52 ? [1, -0.2] : [0, 0];
    if (!endCard || u >= 53.2) octopus(ctx, {
      x: ox, y: oy, s: sc, t, squash, rot,
      blink: blinkAt(u, [5, 13.5, 24.5, 31.5, 49.3, 57]),
      look, swim, shock, stop,
      walk: clamp(prog(u, 45.4, 46) - prog(u, 51.4, 51.8)), walkPhase: u * Math.PI,
      wave: clamp(springU(u, 3, SPRING.gentle) - springU(u, 5.5, SPRING.gentle) + springU(u, 54, SPRING.gentle)),
      xray, hearts, beatPulse: beatPulse(u, 8), hl: [hl2, hl2, hl1],
      heartColor: u >= 18 ? C.blueDeep : C.heart,
      wink: bump(u, 55.3, 0.6),
      sweat: clamp(prog(u, 42, 42.5) - prog(u, 46.5, 47)),
      mouth: clamp(talk(t) * 1.1 + bump(u, 55.6, 0.6) * 0.3),
    });
    ecg(ctx, u);

    // ---- S1 hook  (u 0..6)
    if (u < 6.5) {
      line(ctx, '¿SABÍAS QUE', x0, S.y + 120, font(112, 900, DISPLAY), C.ink, -0.6, 5.6, u, { stagger: 0.035 });
      const big = Math.min(270, fitSize(ctx, 'PULPO', 900, DISPLAY, S.w + 30, 400));
      line(ctx, 'EL', x0 - 6, S.y + 120 + big * 0.98, font(big, 900, DISPLAY), C.body, 1.5, 5.65, u, { stagger: 0.05, wob: 0.12 });
      line(ctx, 'PULPO', x0 - 6, S.y + 120 + big * 1.88, font(big, 900, DISPLAY), C.body, 2, 5.7, u, { stagger: 0.05, wob: 0.12 });
    }
    // ---- S2 hearts  (u 6..16)
    if (u >= 5.8 && u < 16.6) {
      line(ctx, 'TIENE', x0, S.y + 120, font(112, 900, DISPLAY), C.ink, 6, 15, u);
      const n = u < 9 ? 1 : u < 10 ? 2 : 3;
      if (u >= 8 && u < 15.4) {
        const k = springU(u, n === 1 ? 8 : n === 2 ? 9 : 10, SPRING.bouncy);
        const out = E.inBack(prog(u, 15, 15.35), 1.6);
        const sw = 0.06 * Math.sin(u * Math.PI);  // the 3 dances on the beat
        glyph(ctx, String(n), x0 + 330, S.y + 390 - out * 600, font(330, 900, DISPLAY), C.heart, 0.6 + 0.4 * k, 0.6 + 0.4 * k, (1 - k) * 0.4 + sw);
      }
      const cz = fitSize(ctx, 'CORAZONES', 900, DISPLAY, S.w, 200);
      line(ctx, 'CORAZONES', x0, S.y + 390 + cz * 0.95, font(cz, 900, DISPLAY), C.ink, 11, 15.1, u, { stagger: 0.035, wob: 0.1 });
    }
    // ---- S3 blue blood  (u 16..26)
    if (u >= 16.4 && u < 26.2) {
      line(ctx, 'Y SU SANGRE', x0, S.y + 110, font(104, 900, DISPLAY), C.white, 17, 25.6, u, { stagger: 0.03 });
      const az = fitSize(ctx, 'ES AZUL', 900, DISPLAY, S.w + 40, 280);
      line(ctx, 'ES AZUL', x0 - 4, S.y + 110 + az * 0.98, font(az, 900, DISPLAY), C.white, 18, 25.7, u, { stagger: 0.06, wob: 0.16 });
      const sub = font(62, 600, UI);
      line(ctx, 'Culpa de la hemocianina:', x0 + 4, S.y + 210 + az * 1.1, sub, C.white, 20, 25.5, u, { stagger: 0.012, cfg: SPRING.gentle, rise: 0.8 });
      bar(ctx, x0 - 6, S.y + 236 + az * 1.1, 330, 72, C.ink, 21, 25.4, u);
      line(ctx, 'usa cobre, no hierro.', x0 + 4, S.y + 290 + az * 1.1, sub, C.white, 21, 25.55, u, { stagger: 0.012, cfg: SPRING.gentle, rise: 0.8 });
    }
    // ---- S4 who pumps where  (u 26..34)
    if (u >= 25.9 && u < 34.2) {
      line(ctx, '¿Y para qué tres?', x0, S.y + 80, font(70, 600, UI), C.white, 26, 33.5, u, { stagger: 0.012, cfg: SPRING.gentle });
      const rows = [['2', 'BRANQUIAS', 27, S.y + 290], ['1', 'CUERPO', 29.5, S.y + 520]];
      rows.forEach(([d, word, u0, base], i) => {
        line(ctx, d, x0, base, font(220, 900, DISPLAY), C.white, u0, 33.6 + i * 0.1, u);
        const a = E.outCubic(prog(u, u0 + 0.3, u0 + 0.8)) * (1 - E.inBack(prog(u, 33.6 + i * 0.1, 33.9 + i * 0.1)));
        if (a > 0) {
          const ax = x0 + 150, ay = base - 75, len = 110 * a;
          ctx.save(); ctx.strokeStyle = C.white; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + len, ay);
          ctx.moveTo(ax + len - 30 * a, ay - 30 * a); ctx.lineTo(ax + len, ay); ctx.lineTo(ax + len - 30 * a, ay + 30 * a);
          ctx.stroke(); ctx.restore();
        }
        const wf = font(fitSize(ctx, word, 900, DISPLAY, S.w - 300, 140), 900, DISPLAY);
        line(ctx, word, x0 + 300, base - 20, wf, C.white, u0 + 0.6, 33.65 + i * 0.1, u, { stagger: 0.03 });
        line(ctx, i ? 'al resto del' : 'bombean a las', x0 + 304, base - 160, font(58, 600, UI), C.white, u0 + 0.7, 33.7 + i * 0.1, u, { stagger: 0.01, cfg: SPRING.gentle });
      });
    }
    // ---- S5 swimming stops the heart  (u 34..46)
    if (u >= 33.9 && u < 46) {
      line(ctx, 'PERO CUANDO', x0, S.y + 110, font(104, 900, DISPLAY), C.white, 34, 40.2, u, { stagger: 0.03 });
      const nz = fitSize(ctx, 'NADA...', 900, DISPLAY, S.w * 0.8, 260);
      line(ctx, 'NADA...', x0 - 4, S.y + 110 + nz * 0.98, font(nz, 900, DISPLAY), C.white, 35, 40.3, u, { stagger: 0.06, wob: 0.14 });
      line(ctx, 'SU CORAZÓN', x0, S.y + 110, font(104, 900, DISPLAY), C.white, 40.8, 45.3, u, { stagger: 0.03 });
      const st = fitSize(ctx, '¡SE DETIENE!', 900, DISPLAY, S.w + 20, 230);
      bar(ctx, x0 - 20, S.y + 140, S.w + 40, st * 1.02, C.red, 42, 45.2, u);
      line(ctx, '¡SE DETIENE!', x0 - 4, S.y + 130 + st * 0.92, font(st, 900, DISPLAY), C.white, 42, 45.4, u, { stagger: 0.04, wob: 0.2 });
    }
    // ---- S6 so it walks  (u 46..52)
    if (u >= 46 && u < 52.4) {
      line(ctx, 'POR ESO PREFIERE', x0, S.y + 110, font(92, 900, DISPLAY), C.white, 45.8, 51.8, u, { stagger: 0.025 });
      const cm = fitSize(ctx, 'CAMINAR', 900, DISPLAY, S.w + 30, 300);
      line(ctx, 'CAMINAR', x0 - 6, S.y + 110 + cm * 0.98, font(cm, 900, DISPLAY), C.sand, 46.8, 51.9, u, { stagger: 0.05, wob: 0.22 });
    }
    // ---- S7 end card  (u 53.2..)
    if (endCard) {
      const big = fitSize(ctx, 'SÍGUEME', 900, DISPLAY, S.w + 40, 260);
      line(ctx, 'SÍGUEME', x0 - 4, S.y + 40 + big * 0.9, font(big, 900, DISPLAY), C.body, 53.5, null, u, { stagger: 0.04, wob: 0.14 });
      line(ctx, 'para más datos', x0 + 4, S.y + 40 + big * 0.9 + 130, font(96, 900, DISPLAY), C.ink, 54.2, null, u, { stagger: 0.02 });
      line(ctx, 'curiosos', x0 + 4, S.y + 40 + big * 0.9 + 240, font(96, 900, DISPLAY), C.ink, 54.4, null, u, { stagger: 0.02 });
    }
    inkCloud(ctx, u, ox, oy);
    ctx.restore();
  },
});
