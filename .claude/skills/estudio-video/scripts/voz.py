#!/usr/bin/env python3
"""Voz del video: guion -> una toma con ElevenLabs -> pausas recortadas -> tiempos reales por palabra -> boca.

  python3 voz.py <proyecto> [--voz ID] [--modelo eleven_v3] [--etiqueta excited] [--tempo 1.06] [--pausa 0.12] [--reusar]

Lee   <proyecto>/guion.txt  (texto plano; con eleven_v3 se pueden usar etiquetas como [laughs] o [whispers])
Crea  <proyecto>/audio/toma.mp3, audio/vo.wav, words.json (palabra, inicio, fin), vo_env.json (apertura de boca)
Clave: variable ELEVENLABS_API_KEY o, si no existe, la inyecta el proxy del entorno ("proxy-injected").
"""
import argparse, json, math, os, re, struct, subprocess, tempfile, urllib.request, uuid, difflib, unicodedata

ap = argparse.ArgumentParser()
ap.add_argument("proyecto")
ap.add_argument("--voz", default="cgSgspJ2msm6clMCkdW9")   # Jessica (prediseñada; las de biblioteca requieren plan de pago)
ap.add_argument("--modelo", default="eleven_v3")
ap.add_argument("--etiqueta", default="excited")
ap.add_argument("--idioma", default="es")
ap.add_argument("--tempo", type=float, default=1.06)
ap.add_argument("--pausa", type=float, default=0.12)
ap.add_argument("--reusar", action="store_true")
a = ap.parse_args()
D = a.proyecto.rstrip("/")
KEY = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
API = "https://api.elevenlabs.io/v1"
os.makedirs(f"{D}/audio", exist_ok=True)
ff = lambda *x: subprocess.run(["ffmpeg", "-v", "error", "-y", *x], check=True)
norm = lambda s: re.sub(r"[^a-z0-9ñ]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())

texto = open(f"{D}/guion.txt", encoding="utf-8").read().strip()
toma = f"{D}/audio/toma.mp3"
if not (a.reusar and os.path.exists(toma)):
    t = (f"[{a.etiqueta}] " + texto) if a.modelo == "eleven_v3" and a.etiqueta and not texto.startswith("[") else texto
    vs = {"stability": 0.0} if a.modelo == "eleven_v3" else {"stability": 0.3, "similarity_boost": 0.8, "style": 0.7, "speed": 1.12}
    body = {"text": t, "model_id": a.modelo, "language_code": a.idioma, "voice_settings": vs}
    req = urllib.request.Request(f"{API}/text-to-speech/{a.voz}?output_format=mp3_44100_128", data=json.dumps(body).encode(), headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    try:
        open(toma, "wb").write(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ElevenLabs {e.code}: {e.read().decode()[:300]}")
    print(f"toma: {a.modelo} · voz {a.voz}")

# recortar silencios a <= pausa y acelerar
log = subprocess.run(["ffmpeg", "-i", toma, "-af", "silencedetect=n=-38dB:d=0.1", "-f", "null", "-"], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
h, m, s = re.search(r"Duration: (\d+):(\d+):([0-9.]+)", log).groups()
dur = int(h) * 3600 + int(m) * 60 + float(s)
segs, cur = [], 0.0
for s0, s1 in zip(st, en):
    if s0 <= 0.01: cur = max(0, s1 - 0.03); continue
    if s1 >= dur - 0.05: segs.append((cur, s0 + 0.12)); cur = None; break
    keep = a.pausa if (s1 - s0) < 0.6 else a.pausa + 0.06   # fin de frase: un respiro un poco mayor
    segs.append((cur, s0 + keep / 2)); cur = s1 - keep / 2
if cur is not None: segs.append((cur, dur))
fil = "".join(f"[0:a]atrim={x:.3f}:{y:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,areverse,afade=t=in:d=0.012,areverse[s{i}];" for i, (x, y) in enumerate(segs))
fil += "".join(f"[s{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1,atempo={a.tempo},aresample=48000,aformat=channel_layouts=stereo,highpass=f=80,equalizer=f=3500:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=80[out]"
ff("-i", toma, "-filter_complex", fil, "-map", "[out]", "-c:a", "pcm_s24le", f"{D}/audio/vo.wav")

# tiempos reales por palabra (Scribe sobre el audio final)
mp3 = tempfile.mktemp(suffix=".mp3"); ff("-i", f"{D}/audio/vo.wav", "-b:a", "128k", mp3)
b = uuid.uuid4().hex
body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n{'spa' if a.idioma == 'es' else a.idioma}\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"vo.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() + open(mp3, "rb").read() + f"\r\n--{b}--\r\n".encode()
req = urllib.request.Request(f"{API}/speech-to-text", data=body, headers={"xi-api-key": KEY, "Content-Type": f"multipart/form-data; boundary={b}"})
d = json.load(urllib.request.urlopen(req))
words = [[w["text"], round(w["start"], 3), round(w["end"], 3)] for w in d["words"] if w["type"] == "word"]
json.dump(words, open(f"{D}/words.json", "w"), ensure_ascii=False)

# envolvente para la boca (100/s)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{D}/audio/vo.wav", "-ac", "1", "-ar", "4800", "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = struct.unpack(f"{len(raw)//4}f", raw)
env = [math.sqrt(sum(v * v for v in x[i:i+48]) / 48) for i in range(0, len(x), 48)]
mx = sorted(env)[int(len(env) * 0.97)] or 1
env = [round(min(1, v / mx) ** 0.7, 3) if v > mx * 0.08 else 0 for v in env]
json.dump({"rate": 100, "env": env}, open(f"{D}/vo_env.json", "w"))

# informe
g = [w for w in re.sub(r"\[[^\]]*\]", " ", texto).split()]
sim = difflib.SequenceMatcher(None, [norm(w) for w in g], [norm(w[0]) for w in words]).ratio()
gaps = [round(words[i+1][1] - words[i][2], 2) for i in range(len(words) - 1)]
print("\nTRANSCRIPCIÓN:", d["text"])
print(f"\ncoincidencia con el guion: {sim*100:.0f}%  ·  {len(words)} palabras  ·  habla {words[0][1]:.2f}–{words[-1][2]:.2f}s  ·  pausa máx {max(gaps):.2f}s  ·  {len(words)/(words[-1][2]-words[0][1]):.2f} palabras/s")
if sim < 0.9: print("⚠ la voz no dice exactamente el guion: revisa la transcripción, cambia palabras o vuelve a generar")
print("\nPalabras (índice:texto@segundo):")
print("  ".join(f"{i}:{w[0]}@{w[1]}" for i, w in enumerate(words)))
