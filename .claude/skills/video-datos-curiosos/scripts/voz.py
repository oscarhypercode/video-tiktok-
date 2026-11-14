#!/usr/bin/env python3
"""Voz completa de un video: guion -> toma ElevenLabs -> pausas recortadas -> tiempos por palabra -> boca.

Uso:  python3 voz.py <slug> [--voz VOICE_ID] [--modelo eleven_v3] [--tempo 1.08] [--pausa 0.11] [--sin-generar]
Lee   <slug>/guion.txt
Crea  <slug>/audio/vo/toma.mp3 (+ .json), <slug>/audio/vo.wav, <slug>/words.json, <slug>/vo_env.json
      y pone en <slug>/film.json la duración = última palabra + 1,1 s.
Clave: ELEVENLABS_API_KEY si existe; si no, 'proxy-injected' (el proxy del entorno la inyecta).
"""
import argparse, base64, json, math, os, re, struct, subprocess, sys, tempfile, urllib.request, uuid

ap = argparse.ArgumentParser()
ap.add_argument("slug")
ap.add_argument("--voz", default="cgSgspJ2msm6clMCkdW9")          # Jessica (prediseñada)
ap.add_argument("--modelo", default="eleven_v3")
ap.add_argument("--tempo", type=float, default=1.08)
ap.add_argument("--pausa", type=float, default=0.11)
ap.add_argument("--cola", type=float, default=1.1)
ap.add_argument("--sin-generar", action="store_true", help="reusar audio/vo/toma.mp3")
a = ap.parse_args()
D = a.slug.rstrip("/")
KEY = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
API = "https://api.elevenlabs.io/v1"
os.makedirs(f"{D}/audio/vo", exist_ok=True)

def ff(*args, **kw):
    return subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True, **kw)

# 1. Toma única con todo el guion
texto = open(f"{D}/guion.txt", encoding="utf-8").read().strip()
toma = f"{D}/audio/vo/toma.mp3"
if not a.sin_generar:
    t = ("[excited] " + texto) if a.modelo == "eleven_v3" and not texto.startswith("[") else texto
    vs = {"stability": 0.0} if a.modelo == "eleven_v3" else {"stability": 0.3, "similarity_boost": 0.8, "style": 0.7, "speed": 1.15}
    body = {"text": t, "model_id": a.modelo, "language_code": "es", "voice_settings": vs}
    req = urllib.request.Request(f"{API}/text-to-speech/{a.voz}?output_format=mp3_44100_128", data=json.dumps(body).encode(),
                                 headers={"xi-api-key": KEY, "Content-Type": "application/json"})
    open(toma, "wb").write(urllib.request.urlopen(req).read())
    print(f"toma: {a.modelo}, voz {a.voz}")

# 2. Recortar pausas a <= a.pausa y acelerar a.tempo
log = subprocess.run(["ffmpeg", "-i", toma, "-af", "silencedetect=n=-38dB:d=0.1", "-f", "null", "-"], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
en = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
h, m, s = re.search(r"Duration: (\d+):(\d+):([0-9.]+)", log).groups()
dur = int(h) * 3600 + int(m) * 60 + float(s)
segs, cur = [], 0.0
for s0, s1 in zip(st, en):
    if s0 <= 0.01: cur = max(0, s1 - 0.04); continue
    if s1 >= dur - 0.05: segs.append((cur, s0 + 0.15)); cur = None; break
    segs.append((cur, s0 + a.pausa / 2)); cur = s1 - a.pausa / 2
if cur is not None: segs.append((cur, dur))
fil = "".join(f"[0:a]atrim={x:.3f}:{y:.3f},asetpts=PTS-STARTPTS[s{i}];" for i, (x, y) in enumerate(segs))
fil += "".join(f"[s{i}]" for i in range(len(segs))) + f"concat=n={len(segs)}:v=0:a=1,atempo={a.tempo},aresample=48000,aformat=channel_layouts=stereo,highpass=f=90,acompressor=threshold=-20dB:ratio=3:attack=5:release=80[out]"
ff("-i", toma, "-filter_complex", fil, "-map", "[out]", "-c:a", "pcm_s24le", f"{D}/audio/vo.wav")

# 3. Tiempos reales de cada palabra (Scribe sobre el audio final)
mp3 = tempfile.mktemp(suffix=".mp3"); ff("-i", f"{D}/audio/vo.wav", "-b:a", "128k", mp3)
b = uuid.uuid4().hex
body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nspa\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"vo.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() \
       + open(mp3, "rb").read() + f"\r\n--{b}--\r\n".encode()
req = urllib.request.Request(f"{API}/speech-to-text", data=body, headers={"xi-api-key": KEY, "Content-Type": f"multipart/form-data; boundary={b}"})
d = json.load(urllib.request.urlopen(req))
words = [[w["text"], round(w["start"], 3), round(w["end"], 3)] for w in d["words"] if w["type"] == "word"]
json.dump(words, open(f"{D}/words.json", "w"), ensure_ascii=False)

# 4. Envolvente de la boca (100 por segundo)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{D}/audio/vo.wav", "-ac", "1", "-ar", "4800", "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = struct.unpack(f"{len(raw)//4}f", raw)
env = [math.sqrt(sum(v * v for v in x[i:i+48]) / 48) for i in range(0, len(x), 48)]
mx = sorted(env)[int(len(env) * 0.97)] or 1
env = [round(min(1, v / mx) ** 0.7, 3) if v > mx * 0.08 else 0 for v in env]
json.dump({"rate": 100, "env": env}, open(f"{D}/vo_env.json", "w"))

# 5. Duración del video
fj = json.load(open(f"{D}/film.json"))
fj["duration"] = round(words[-1][2] + a.cola, 2)
fj["poster"] = round(words[-1][2] * 0.7, 2)
json.dump(fj, open(f"{D}/film.json", "w"), indent=1, ensure_ascii=False)

gaps = [round(words[i+1][1] - words[i][2], 2) for i in range(len(words) - 1)]
print("\nTRANSCRIPCIÓN:", d["text"])
print(f"\n{len(words)} palabras · primera {words[0][1]}s · última termina {words[-1][2]}s · video {fj['duration']}s · pausa máx {max(gaps)}s")
print("\nÍndice de palabras (para escenas):")
print("  ".join(f"{i}:{w[0]}@{w[1]}" for i, w in enumerate(words)))
