#!/usr/bin/env bash
# Crea un video nuevo desde la plantilla.  Uso: nuevo.sh <slug> "Título"
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="${1:?slug}"; TITULO="${2:-$1}"
[ -e "$SLUG" ] && { echo "ya existe $SLUG/ (no se sobrescribe)"; exit 1; }
mkdir -p "$SLUG"/{audio/vo,docs}
cp -r "$SK/template/lib" "$SK/template/fonts" "$SK/template/index.html" "$SK/template/film.js" "$SLUG/"
sed -i "s|<title>.*</title>|<title>$TITULO</title>|" "$SLUG/index.html"
printf '{\n "title": "%s",\n "duration": 25,\n "formats": ["9x16"],\n "poster": 17\n}\n' "$TITULO" > "$SLUG/film.json"
cp "$SK/template/guion.txt" "$SLUG/guion.txt"
echo "creado $SLUG/  → escribe $SLUG/guion.txt y luego: python3 $SK/scripts/voz.py $SLUG"
