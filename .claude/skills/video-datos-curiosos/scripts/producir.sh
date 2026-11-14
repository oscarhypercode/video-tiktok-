#!/usr/bin/env bash
# Música + render + efectos + mezcla + portada + verificación.  Uso: producir.sh <slug> [--revisar]
#   --revisar  solo hojas de contacto (out/<slug>/contact_9x16*.png y phone_9x16*.png)
set -euo pipefail
SLUG="${1:?slug}"; MODE="${2:-}"
MR="${MOTION_REEL:-$(dirname "$(find / -path '*skills/motion-reel/SKILL.md' -not -path '/proc/*' 2>/dev/null | head -1)")}"
[ -f "$MR/scripts/render.mjs" ] || { echo "No encuentro la skill motion-reel (render.mjs). Define MOTION_REEL=<carpeta>."; exit 1; }
DUR=$(python3 -c "import json;print(json.load(open('$SLUG/film.json'))['duration'])")
if [ ! -f "$SLUG/beats.json" ] || [ "$(python3 -c "import json;print(round(json.load(open('$SLUG/beats.json')).get('duration',0),2))")" != "$(python3 -c "print(round($DUR,2))")" ]; then
  uv run "$MR/scripts/beats.py" "$SLUG" --synth --flavor house --bpm 124 --mode dorian --tonic D --drop 1 --duration "$DUR" 2>&1 | grep -E "grid|->"
fi
if [ "$MODE" = "--revisar" ]; then node "$MR/scripts/render.mjs" --film "$SLUG" --contact --format 9x16 --every 0.5 2>&1 | tail -1; exit 0; fi
node "$MR/scripts/render.mjs" --film "$SLUG" --format 9x16 --video-only 2>&1 | tail -1
node "$MR/scripts/sfx.mjs" "$SLUG" | tail -1
node "$MR/scripts/mix.mjs" "$SLUG" | tail -1
node "$MR/scripts/render.mjs" --film "$SLUG" --format 9x16 --poster 2>&1 | tail -1
F="out/$SLUG/final.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of compact "$F"
echo "silencios > 0,4 s: $(ffmpeg -v info -i "$F" -af silencedetect=n=-45dB:d=0.4 -f null - 2>&1 | grep -c silence_start || true)"
echo "→ $F"
