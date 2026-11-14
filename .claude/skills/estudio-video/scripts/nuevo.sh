#!/usr/bin/env bash
# Crea un proyecto de video.   Uso: nuevo.sh <carpeta> [tema] ["Título"]
# Temas: salud ciencia animales espacio dinero historia tecnologia cocina motivacion curiosidades
set -euo pipefail
D="${1:?carpeta}"; TEMA="${2:-curiosidades}"; TIT="${3:-$D}"
[ -e "$D/video.json" ] && { echo "$D/video.json ya existe (no se sobrescribe)"; exit 1; }
mkdir -p "$D/audio" "$D/salida"
[ -f "$D/guion.txt" ] || echo "¿Sabías que …? (escribe aquí el guion: una sola línea, ~3,3 palabras por segundo)" > "$D/guion.txt"
cat > "$D/video.json" <<JSON
{
  "titulo": "$TIT",
  "tema": "$TEMA",
  "escenas": [
    { "lineas": [ { "txt": "Gancho en *2-3* palabras", "tam": "xl" } ],
      "presentador": { "pos": "grande", "emocion": "emocionado" } },
    { "en": "PALABRA", "item": 1,
      "lineas": [ { "txt": "Titular del punto", "tam": "l" } ],
      "visual": { "tipo": "dato", "en": "PALABRA", "valor": 100, "etiqueta": "unidad" },
      "presentador": { "emocion": "sorpresa", "gesto": "presentar" } },
    { "en": "PALABRA", "fondo": "fondo",
      "lineas": [ { "txt": "¿Cuál te sorprendió *más*?", "tam": "l" } ],
      "visual": { "tipo": "cta", "en": "sigueme", "comentario": true },
      "presentador": { "pos": "centro", "emocion": "feliz", "gesto": "saludar" } }
  ]
}
JSON
echo "creado $D/  (tema: $TEMA) → escribe guion.txt, corre voz.py y completa video.json con las palabras que imprime"
