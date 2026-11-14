#!/usr/bin/env bash
# Produce el video completo y lo verifica.   Uso: producir.sh <proyecto> [--muestras 5]
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"; P="${1:?proyecto}"; shift || true
node "$SK/scripts/render.mjs" "$P" --revisar || { echo "⚠ el revisor encontró problemas (arriba). Corrige video.json y repite."; exit 2; }
node "$SK/scripts/render.mjs" "$P" --eventos | head -1
node "$SK/scripts/render.mjs" "$P" --video "$@"
node "$SK/scripts/audio.mjs" "$P"
F="$P/salida/final.mp4"
echo "--- verificación"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of compact "$F"
echo "silencios > 0,4 s: $(ffmpeg -v info -i "$F" -af silencedetect=n=-45dB:d=0.4 -f null - 2>&1 | grep -c silence_start || true)"
python3 - "$P" <<'PY'
import json, os, subprocess, sys, tempfile, urllib.request, uuid, re, unicodedata, difflib
P = sys.argv[1]; key = os.environ.get("ELEVENLABS_API_KEY", "proxy-injected")
mp3 = tempfile.mktemp(suffix=".mp3"); subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{P}/salida/final.mp4", "-vn", "-b:a", "128k", mp3], check=True)
b = uuid.uuid4().hex
body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nspa\r\n--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"f.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() + open(mp3, "rb").read() + f"\r\n--{b}--\r\n".encode()
try:
    d = json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, headers={"xi-api-key": key, "Content-Type": f"multipart/form-data; boundary={b}"})))
except Exception as e:
    print("transcripción no disponible:", e); sys.exit(0)
n = lambda s: re.sub(r"[^a-z0-9ñ]", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())
g = [n(w) for w in re.sub(r"\[[^\]]*\]", " ", open(f"{P}/guion.txt", encoding="utf-8").read()).split()]
h = [n(w["text"]) for w in d["words"] if w["type"] == "word"]
print(f"inteligibilidad del final (voz + música + efectos): {difflib.SequenceMatcher(None, g, h).ratio()*100:.0f}% del guion reconocido")
PY
echo "-> $F"
