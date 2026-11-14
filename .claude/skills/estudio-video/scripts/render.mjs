#!/usr/bin/env node
// render.mjs — renderiza un proyecto del estudio.
//   node render.mjs <proyecto> --video            video.mp4 (sin audio) en <proyecto>/salida/
//   node render.mjs <proyecto> --hoja [cada]      hojas de contacto (por defecto cada 0,5 s)
//   node render.mjs <proyecto> --fotos 1.2,5,9    fotos sueltas
//   node render.mjs <proyecto> --revisar          revisor de maquetación (solapes, zonas seguras)
//   node render.mjs <proyecto> --eventos          exporta eventos.json (lo usa audio.mjs)
//   node render.mjs <proyecto> --rango 10:16      vista previa rápida de un tramo (30 fps, sin desenfoque)
// Opciones: --muestras N (desenfoque de movimiento, 5), --fps N (60), --hilos N (4)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const PROY = path.resolve(args[0] || '.');
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const OUT = path.join(PROY, 'salida'); fs.mkdirSync(OUT, { recursive: true });
const FPS = Number(opt('fps', 60)), HILOS = Number(opt('hilos', Math.min(4, os.cpus().length)));

// ---------------- playwright (del proyecto o del sistema)
function cargarPW() {
  for (const base of [process.cwd(), PROY, '/opt/node-tools', SK]) {
    try { return createRequire(path.join(base, 'x.js'))('playwright'); } catch { /* sigue */ }
  }
  console.error('Falta Playwright: npm i -D playwright'); process.exit(1);
}
const { chromium } = cargarPW();

// ---------------- servidor estático con tres montajes
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wav': 'audio/wav', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = null;
  if (u.startsWith('/motor/')) f = path.join(SK, 'motor', u.slice(7));
  else if (u.startsWith('/fuentes/')) f = path.join(SK, 'fuentes', u.slice(9));
  else if (u.startsWith('/p/')) f = path.join(PROY, u.slice(3));
  else if (u.startsWith('/proyecto/')) f = path.join(PROY, u.slice(10));
  if (!f || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL0 = `http://127.0.0.1:${server.address().port}/motor/index.html`;

const browser = await chromium.launch({ args: ['--disable-web-security'] });
async function pagina(q) {
  const pg = await browser.newPage({ viewport: { width: 540, height: 960 } });
  pg.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[motor]', m.text()); });
  pg.on('pageerror', (e) => console.log('[motor] ERROR', e.stack || e.message));
  await pg.goto(`${URL0}?render=1&${q}`);
  await pg.waitForFunction(() => window.listo === true, null, { timeout: 60000 });
  return pg;
}
const fin = async (code = 0) => { await browser.close(); server.close(); process.exit(code); };

// ---------------- modos
if (opt('eventos')) {
  const pg = await pagina('muestras=1');
  const data = await pg.evaluate(() => ({ duracion: window.DURACION, eventos: window.EVENTOS, escenas: window.ESCENAS, tema: { nombre: window.TEMA.nombre, musica: window.TEMA.musica } }));
  fs.writeFileSync(path.join(PROY, 'eventos.json'), JSON.stringify(data, null, 1));
  console.log(`eventos.json: ${data.eventos.length} eventos · ${data.escenas.length} escenas · ${data.duracion}s`);
  data.escenas.forEach((s) => console.log(`  ${String(s.i).padStart(2)} ${s.t0.toFixed(2).padStart(6)}–${s.t1.toFixed(2).padEnd(6)} ${s.trans.padEnd(9)} ${s.lineas.join(' | ')}`));
  await fin();
}

if (opt('revisar')) {
  const pg = await pagina('muestras=1');
  const { dur, esc } = await pg.evaluate(() => ({ dur: window.DURACION, esc: window.ESCENAS }));
  const bordes = esc.map((s) => s.t0);
  const problemas = new Map();
  const nota = (k, t, msg) => { if (!problemas.has(k)) problemas.set(k, { t0: t, t1: t, msg }); else problemas.get(k).t1 = t; };
  const inter = (a, b) => { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (x * y) / Math.max(1, Math.min(a.w * a.h, b.w * b.h)); };
  for (let t = 0.05; t < dur; t += 0.1) {
    if (bordes.some((b) => Math.abs(t - b) < 0.25)) continue;
    const cajas = await pg.evaluate((tt) => window.revisar(tt), t);
    for (const c of cajas) {
      if (c.tipo === 'cara') continue;
      const derMax = c.y + c.h > 880 ? 945 : 1015;
      if (c.x < 55 || c.x + c.w > derMax || c.y < 236 || (c.tipo !== 'subt' && c.y + c.h > 1500)) nota('zona:' + c.id, t, `"${c.id}" sale de la zona segura (x ${c.x | 0}–${(c.x + c.w) | 0}, y ${c.y | 0}–${(c.y + c.h) | 0})`);
    }
    for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
      const a = cajas[i], b = cajas[j];
      if (a.id === b.id || (a.tipo === 'texto' && b.tipo === 'texto' && a.id.split('.').slice(0, 2).join() === b.id.split('.').slice(0, 2).join())) continue;
      const o = inter(a, b);
      if (o > 0.12) nota(`sol:${a.id}|${b.id}`, t, `"${a.id}" (${a.tipo}) se solapa con "${b.id}" (${b.tipo}) ${(o * 100) | 0}%`);
    }
  }
  if (!problemas.size) console.log('revisión: sin problemas de maquetación ✓');
  else { console.log(`revisión: ${problemas.size} problema(s)`); for (const p of problemas.values()) console.log(`  ${p.t0.toFixed(1)}–${p.t1.toFixed(1)}s  ${p.msg}`); }
  await fin(problemas.size ? 2 : 0);
}

if (opt('hoja') || opt('fotos')) {
  const pg = await pagina('muestras=1');
  const dur = await pg.evaluate(() => window.DURACION);
  const cada = opt('hoja') === true ? 0.5 : Number(opt('hoja') || 0.5);
  const ts = opt('fotos') ? String(opt('fotos')).split(',').map(Number) : Array.from({ length: Math.floor(dur / cada) + 1 }, (_, i) => +(i * cada).toFixed(2));
  const dir = path.join(OUT, opt('fotos') ? 'fotos' : 'hoja_tmp'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < ts.length; i++) {
    const url = await pg.evaluate((t) => { window.seek(t); const c = document.getElementById('lienzo'); const x = c.getContext('2d'); if (!new URLSearchParams(location.search).has('limpio')) { x.fillStyle = 'rgba(0,0,0,.65)'; x.fillRect(0, 0, 300, 90); x.fillStyle = '#fff'; x.font = 'bold 60px sans-serif'; x.fillText(t.toFixed(1) + 's', 18, 68); } return c.toDataURL('image/jpeg', 0.9); }, ts[i]);
    fs.writeFileSync(path.join(dir, `${opt('fotos') ? 't' + ts[i] : String(i).padStart(4, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  if (opt('hoja')) {
    for (const f of fs.readdirSync(OUT).filter((f) => f.startsWith('hoja_') && f.endsWith('.png'))) fs.rmSync(path.join(OUT, f));
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, '%04d.jpg'), '-vf', 'scale=270:480,tile=8x3:padding=6:color=0x333333', path.join(OUT, 'hoja_%d.png')], { stdio: 'inherit' });
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`hojas: ${fs.readdirSync(OUT).filter((f) => f.startsWith('hoja_')).sort().map((f) => path.join(OUT, f)).join(' ')}`);
  } else console.log(`fotos en ${dir}`);
  await fin();
}

if (opt('video') || opt('rango')) {
  const rango = opt('rango') ? String(opt('rango')).split(':').map(Number) : null;
  const fps = rango ? 30 : FPS, muestras = rango ? 1 : Number(opt('muestras', 5));
  const pages = await Promise.all(Array.from({ length: HILOS }, () => pagina(`muestras=${muestras}&fps=${fps}`)));
  const dur = await pages[0].evaluate(() => window.DURACION);
  const [a, b] = rango || [0, dur];
  const N = Math.round((b - a) * fps);
  const out = path.join(OUT, rango ? `rango_${a}-${b}.mp4` : 'video.mp4');
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', rango ? 'veryfast' : 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < N; f += HILOS) {
    const lote = await Promise.all(pages.map((pg, k) => (f + k < N ? pg.evaluate(([t, q]) => window.cuadro(t, q), [a + (f + k) / fps, 0.95]) : null)));
    for (const url of lote) if (url) { if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise((r) => ff.stdin.once('drain', r)); }
    if (f % (fps * 2) < HILOS) process.stdout.write(`\r  ${f}/${N} cuadros  ${((f + 1) / ((Date.now() - t0) / 1000)).toFixed(1)} fps   `);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\n-> ${out}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
  await fin();
}
console.log('uso: node render.mjs <proyecto> --video | --hoja [cada] | --fotos t,t | --revisar | --eventos | --rango a:b');
await fin(1);
