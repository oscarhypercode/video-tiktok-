---
name: estudio-video
description: Estudio propio para crear videos verticales animados en 2D (TikTok, Reels, Shorts) de CUALQUIER nicho — salud, ciencia, dinero, historia, tecnología, espacio, cocina, animales, motivación, curiosidades — en cualquier formato: top/lista, datos curiosos, mito o verdad, explicador paso a paso, comparación, cita. Un video se describe en un solo video.json (sin programar); el motor anima un presentador con emociones, titulares sincronizados palabra a palabra con la voz de ElevenLabs, datos que cuentan, comparaciones, iconos animados, subtítulos estilo TikTok, transiciones, música sintetizada por tema y efectos de sonido, y entrega un MP4 1080×1920 a 60 fps normalizado a −14 LUFS. Úsala cuando pidan crear, animar o producir un video corto vertical o una serie de videos de un nicho.
---

# Estudio de video vertical

Todo es propio y local: motor de animación en canvas (`motor/`), render paralelo (`scripts/render.mjs`),
voz (`scripts/voz.py`), música + efectos + mezcla (`scripts/audio.mjs`). Ninguna otra skill es necesaria.

`SK` = esta carpeta. Un **proyecto** es una carpeta con `guion.txt` y `video.json`; todo lo demás se genera.
Ejemplo completo y probado: `cuerpo/` (salud, top 7, 51 s) → `cuerpo/salida/final.mp4`.

```
<proyecto>/guion.txt      lo que dice la voz (una sola toma)
<proyecto>/video.json     tema + escenas (qué se ve y en qué palabra)
<proyecto>/words.json     tiempos reales de cada palabra     ← voz.py
<proyecto>/vo_env.json    apertura de boca del presentador   ← voz.py
<proyecto>/eventos.json   escenas + efectos (para el audio)  ← render.mjs --eventos
<proyecto>/audio/         toma.mp3, vo.wav, musica.wav, sfx.wav, mezcla.wav
<proyecto>/salida/        hoja_N.png, fotos/, video.mp4, final.mp4
```

## Flujo (en orden)
1. **Brief** (una pregunta como mucho, con opciones por defecto): nicho → `tema`, formato, duración
   (30–60 s; ~3,3 palabras/s), voz. Si el usuario ya dio el tema, no preguntes: decide y avanza.
2. **Guion** → `<proyecto>/guion.txt`. Fórmulas por formato en `docs/guiones.md`. Datos verificados
   (si dudas de un dato, no lo uses o matízalo). Gancho en la primera frase, sin saludo.
3. **Proyecto**: `bash $SK/scripts/nuevo.sh <proyecto> <tema>` (crea carpeta, guion y video.json de partida).
4. **Voz**: `python3 $SK/scripts/voz.py <proyecto> [--voz ID]`. Imprime la transcripción, la coincidencia con
   el guion (debe ser ≥ 95 %) y el índice de palabras con su segundo. Si una palabra sale mal, cambia el guion.
5. **video.json**: escenas atadas a palabras (catálogo completo en `docs/catalogo.md`). Reglas abajo.
6. **Revisar** (mínimo 2 rondas):
   - `node $SK/scripts/render.mjs <proyecto> --revisar` → solapes y zonas seguras (debe salir ✓)
   - `node $SK/scripts/render.mjs <proyecto> --hoja 1` → mira TODAS las hojas `salida/hoja_N.png`
   - `--fotos 12.3,20` para ver un instante; `--rango 10:16` para ver un tramo en movimiento.
   Busca: cuadros sin texto ni visual, textos que aparecen antes de decirse, visuales pequeños o tapados,
   presentador que no reacciona, escenas quietas > 2 s. Arregla en video.json (o en el motor si es general).
7. **Producir**: `bash $SK/scripts/producir.sh <proyecto>` (eventos → video 60 fps → música + efectos + mezcla
   → final.mp4 → verificación). Tarda ~1 min por cada 10 s de video.
8. **Verificar y entregar**: duración, 60 fps, audio, −14 LUFS, 0 silencios > 0,4 s y transcripción del
   final.mp4 (producir.sh lo hace). Entrega `salida/final.mp4` y di qué mejorarías.

## Reglas de dirección
- **La voz manda.** El texto aparece cuando se dice: el motor busca cada palabra del titular en la voz.
  Si un titular parafrasea (cifras, palabras distintas), entra completo en su `en`.
- **Una escena cada 2–6 s**, cada una con: titular corto (≤ 6 palabras) + un visual + una reacción del
  presentador (emoción y gesto). Nunca dos escenas seguidas con el mismo visual o la misma emoción.
- **Cifras siempre como visual `dato`** (cuentan hacia arriba) o `comparar`; nunca solo en el texto.
- **Fondo**: alterna `fondo`/`fondo2`; usa `oscuro` o `acento` 1–2 veces para momentos fuertes.
- **Énfasis**: `*palabra*` color acento, `_palabra_` marcador, `~palabra~` caja. Uno por titular.
- **Efectos**: `golpe` en la revelación principal, `apagon` solo si el guion lo motiva, `zoom` para remates.
- **Cierre** con pregunta para comentarios + visual `cta` (botón de seguir que se pulsa).
- No pongas nada importante por debajo de y≈1490 ni pegado a la derecha por debajo de y≈880
  (interfaz de TikTok). El revisor lo comprueba.

## Temas (identidad por nicho)
`salud`, `ciencia`, `animales`, `espacio`, `dinero`, `historia`, `tecnologia`, `cocina`, `motivacion`,
`curiosidades`. Cada uno trae 2 tipografías propias, paleta, textura de fondo, transiciones, estilo de
entrada del texto, presentador (forma, color, accesorio) y música (estilo, bpm, tonalidad). Todo se puede
sobrescribir en `"ajustes"` y `"presentador"`. Detalle en `docs/catalogo.md`.

## Voz
ElevenLabs con la clave del entorno (o `ELEVENLABS_API_KEY`). Por defecto `eleven_v3` con `[excited]`,
una sola toma, pausas recortadas a 0,12 s y +6 % de velocidad. Voz por defecto: Jessica
(`cgSgspJ2msm6clMCkdW9`, prediseñada). Las voces de la biblioteca (p. ej. nativas en español como
"Andres – Social Media Host" `u36BhA6zuwclwVyAT1Bi`) requieren plan de pago para usarse por API.
Nunca pidas la clave en el chat.

## Extender
- Nuevo nicho: añade una entrada en `motor/temas.js` (o usa `ajustes` en el video.json).
- Nuevo icono: función en `motor/iconos.js` (centrado en 0,0, radio r, trazo `o.tinta`/`o.lw`, puede animarse con `o.t`).
- Nuevo visual: rama en `visual()` de `motor/motor.js` + sus eventos de sonido en "visuales (compilar…)".
- Contrato del motor: todo es función del tiempo (`window.seek(t)`), sin `Math.random` ni estado entre cuadros.
