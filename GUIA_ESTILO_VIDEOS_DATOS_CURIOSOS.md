# Guía de estilo: videos de datos curiosos animados en 2D (TikTok)

Receta completa para replicar el estilo del video del pulpo (`pulpo/`): qué se ve, cómo suena, cómo se
escribe el guion y cómo se produce paso a paso.

---

## 1. La fórmula en una línea

**Un personaje animal dibujado en código cuenta, a ritmo de charla, 6–9 datos curiosos en ~25 s. Cada
palabra clave aparece en pantalla gigante justo cuando se dice, y el personaje "actúa" cada dato.**

## 2. Formato

| Parámetro | Valor |
|---|---|
| Relación | 9:16 vertical, 1080×1920 |
| Duración | 24–27 s (la voz manda; ~1 s de cierre después de la última palabra) |
| FPS / códec | 60 fps, H.264 yuv420p, AAC |
| Volumen | −14 LUFS integrado, −1 dBTP (estándar de redes) |
| Zona segura | margen izq. 72 px, arriba 250 px, der. 150 px, abajo 430 px (botones y pie de TikTok) |
| Idioma | Español, tono cercano ("¿Sabías que…?", "Y ojo:", "Pero lo más loco:") |

## 3. Estructura del guion (≈ 80–85 palabras)

| Bloque | Tiempo aprox. | Función | Ejemplo (pulpo) |
|---|---|---|---|
| Gancho | 0–3 s | Pregunta + dato más sorprendente; la voz arranca en el frame 0 | "¿Sabías que el pulpo tiene tres corazones? ¡Tres!" |
| Explicación | 3–6 s | El "para qué" del dato | "Dos mandan la sangre a las branquias, y el tercero, al resto del cuerpo." |
| Dato 2 + ejemplo | 6–11 s | Dato con comparación con nosotros | "Su sangre es azul, porque usa cobre en vez de hierro, como nosotros." |
| Giro | 11–15 s | "Pero lo más loco…" + consecuencia graciosa | "Cuando nada, su corazón principal ¡se detiene! Por eso prefiere caminar." |
| Ráfaga | 15–21 s | "Y no acaba ahí:" + 2 datos rápidos | "Nueve cerebros, uno en cada brazo… cambia de color en menos de un segundo." |
| Remate | 21–22.5 s | Elogio/chiste corto | "¡Un genio del océano!" |
| Cierre | 22.5–24.5 s | Llamado a seguir | "¡Sígueme para más datos curiosos!" |

Reglas del guion:
- **~3,4 palabras por segundo.** Frases cortas, sin relleno. Nada de pausas dramáticas largas.
- Conectores de charla entre datos: *"¡Tres!"*, *"Y ojo:"*, *"Pero lo más loco:"*, *"Y no acaba ahí:"*.
- Cada dato debe poder **dibujarse** (un objeto, un número, una acción del personaje).
- Datos verificados; si un dato es "popular" pero discutible, matizarlo (ej. "uno en cada brazo").
- Números con cifra en pantalla aunque se digan con letra ("tres" → **3**, "nueve" → **9**).

## 4. Look visual

### Paleta (tokens en `film.js`, objeto `C`)
| Uso | Color |
|---|---|
| Fondo papel (inicio y cierre) | `#FFF1E2` |
| Tinta (texto, contornos) | `#1C1A33` |
| Fondo mar (desde el dato "azul") | `#2F5BFF`, algas `#2447D9` |
| Personaje | cuerpo `#FF7A6B`, sombra `#E85A4E`, vientre `#FFB4A3` |
| Acentos por dato | corazón `#D9304A`, alerta `#FF4D6D`, arena `#F6C978`, oro `#FFD23F`, cerebro `#FF9EC4`, cobre `#E08A3C`, hierro `#C73B3B` |

Regla: fondo **papel claro** para el gancho → **cambio de fondo con una ola** en el dato visual más
fuerte → **papel** otra vez en el cierre (tras el chorro de tinta). El cambio de fondo marca la mitad.

### Tipografía (solo dos)
- **Titulares:** Inter Display Black (`pulpo/fonts/display.otf`), 92–330 px, alineado a la izquierda.
- **Texto secundario:** Inter SemiBold (`pulpo/fonts/ui.otf`), 54–70 px.
- La palabra clave va **gigante** (ajustada al ancho con `fitSize`); la frase de apoyo, pequeña encima o debajo.
- Nada de texto centrado sobre degradado.

### Personaje
- Dibujado 100 % en código (contorno tinta de 9 px, colores planos, brillo blanco 22 %).
- Ojos grandes con brillo, mejillas rosadas, boca que **se abre con el volumen de la voz** (lip sync).
- Siempre vivo: respiración, balanceo, parpadeos, tentáculos ondulando.
- **Cada dato = una acción del personaje**: rayos X con corazones, ojo gigante en "ojo", nadar con
  estelas, susto con sudor, caminar sobre arena, cerebros en los brazos, cambio de color, birrete.

### Movimiento
- Letras que **saltan con muelle** desde abajo, una tras otra (escalonado de 10–30 ms), y salen
  disparadas hacia arriba.
- **Golpe de zoom** (+4,5 %) en cada palabra clave; **temblor de cámara** en los 4–6 impactos fuertes.
- Algo nuevo en pantalla **cada 1–2 s**. Ninguna escena quieta más de 2 s.
- Transiciones con objetos del mundo: ola que inunda, arena que sube, nube de tinta.
- Prohibido: todo apareciendo con fundido, partículas genéricas, destellos en cada corte.

## 5. Sonido

| Capa | Cómo |
|---|---|
| Voz | ElevenLabs, ver sección 6. Siempre por encima de todo. |
| Música | Sintetizada en código: house, 124 bpm, Re dórico (`beats.py --synth`). Baja sola cuando habla la voz. |
| Efectos | Sintetizados, uno por acento visual (lista `HITS`). **Volumen bajo (0,1–0,25)** para no tapar la voz; impactos fuertes solo en 4–6 momentos. |

Efectos típicos: `impact` (gancho, número grande, giro, cierre), `pop` (corazones), `boing` (chistes),
`whoosh` (nadar, tinta), `blip` (monitor), `coins` (cobre), `bell` (cierre, logro), `tick` (cambios rápidos).

## 6. Voz con ElevenLabs

- **Conexión:** la clave se guarda como *network secret* del entorno para `api.elevenlabs.io` (cabecera
  `xi-api-key`). Nunca en el chat ni en el repo. La clave actual solo tiene permiso de texto a voz y
  transcripción (no lista voces).
- **Voz actual:** Jessica, `cgSgspJ2msm6clMCkdW9` (prediseñada). Para una voz nativa, usar su Voice ID.
- **Modelo:** `eleven_v3` con la etiqueta `[excited]` al inicio del texto y `stability: 0.0` → más emoción.
  (`eleven_multilingual_v2` con `speed: 1.15, style: 0.7` es la alternativa más rápida pero más plana.)
- **Una sola toma con todo el guion**, nunca frases sueltas: así suena a charla.
- **Pausas:** `tighten.py` recorta cada silencio a ≤ 0,11 s y acelera ×1,08 (máximo 1,2).
- **Comprobación:** transcribir el audio final con Scribe (`/v1/speech-to-text`, `scribe_v1`) y comparar
  con el guion. Si una palabra no se entiende, bajar el efecto que la tapa o regenerar la toma.

## 7. Sincronía (la clave del estilo)

1. Se genera la voz → se recorta → `pulpo/audio/vo.wav`.
2. Se transcribe con Scribe para obtener **el tiempo real de cada palabra** → `pulpo/words.json`.
3. `film.js` lee `words.json` y todo se programa con `T(i)` = inicio de la palabra *i*:
   el texto entra ~50 ms antes de la palabra, y la acción y el efecto de sonido caen en la palabra.
4. La boca del personaje sigue la envolvente de la voz (`pulpo/vo_env.json`, 100 por segundo).

Si cambia la voz, se regeneran `vo.wav`, `words.json` y `vo_env.json`, y la animación se re-sincroniza sola.

## 8. Paso a paso para un video nuevo

Herramientas: skill *motion-reel* (`$S` = carpeta de la skill), Node + Playwright, ffmpeg, uv.

```bash
# 1. Proyecto nuevo (no tocar pulpo/)
node $S/scripts/scaffold.mjs <animal> --title "..." --duration 25 --formats 9x16
cp pulpo/fonts/* <animal>/fonts/            # mismas dos fuentes
cp pulpo/index.html <animal>/index.html      # ya apunta a display.otf / ui.otf

# 2. Guion (sección 3) → <animal>/audio/vo/v2/script.txt  (y una copia con "[excited] " delante)
# 3. Voz: una toma con eleven_v3 (take.py), luego recorte de pausas
python3 take.py cgSgspJ2msm6clMCkdW9 eleven_v3 v2/v3 v2/script_v3.txt '{"stability":0.0}'
python3 tighten.py                           # → audio/vo.wav + words.json provisional
# 4. Tiempos reales de cada palabra (Scribe) → <animal>/words.json
python3 pulpo/audio/vo/scribe_words.py <animal>
# 5. Envolvente para la boca → <animal>/vo_env.json
python3 pulpo/audio/vo/envelope.py <animal>
# 6. Música del largo exacto (fin de voz + 1,1 s)
uv run $S/scripts/beats.py <animal> --synth --flavor house --bpm 124 --mode dorian --tonic D --drop 1 --duration 25.5
# 7. film.js: copiar el del pulpo y cambiar personaje, escenas y HITS (cada escena en su palabra)
# 8. Revisar: hojas de contacto, mínimo 2–3 rondas
node $S/scripts/render.mjs --film <animal> --contact --format 9x16
# 9. Render final + efectos + mezcla + portada
node $S/scripts/render.mjs --film <animal> --format 9x16 --video-only
node $S/scripts/sfx.mjs <animal>
node $S/scripts/mix.mjs <animal>
node $S/scripts/render.mjs --film <animal> --format 9x16 --poster
# 10. Verificar: ffprobe (25,5 s, 60 fps, audio) + transcripción del final.mp4
```

Archivos de referencia en este repo:
- `pulpo/film.js`: animación completa (personaje, escenas, cámara, efectos)
- `pulpo/audio/vo/take.py`, `pulpo/audio/vo/v2/tighten.py`: voz y recorte de pausas
- `pulpo/audio/vo/scribe_words.py`, `pulpo/audio/vo/envelope.py`: tiempos por palabra y boca
- `pulpo/words.json`: ejemplo de tiempos por palabra
- `out/pulpo/final.mp4`: resultado

## 9. Lista de control antes de publicar

- [ ] La voz empieza en < 0,2 s y no hay silencios > 0,4 s
- [ ] Todo el guion se entiende en la transcripción del video final
- [ ] Cada palabra clave aparece en pantalla en su momento (±0,1 s)
- [ ] Los textos se leen en el móvil (hoja `phone_*.png`) y no tocan la zona de botones
- [ ] El personaje hace una acción distinta en cada dato
- [ ] Hay un cambio de fondo a mitad del video y una transición de cierre
- [ ] Cierre ≤ 1,2 s después de la última palabra
- [ ] Solo dos fuentes, colores de la paleta, −14 LUFS

## 10. Ideas para la serie (mismo personaje-narrador, distinto animal)

- **Ajolote:** regenera patas, corazón y parte del cerebro; sonríe siempre; nunca "crece" del todo.
- **Colibrí:** corazón a más de 1.000 latidos por minuto; único pájaro que vuela hacia atrás.
- **Tardígrado:** sobrevive al espacio, al hielo y a la radiación; se "seca" y revive.
- **Medusa inmortal:** vuelve a ser joven; no tiene cerebro ni corazón.
- **Camarón mantis:** golpe tan rápido que hierve el agua; ve colores que nosotros no.
- **Vaca:** tiene mejores amigas y se estresa si la separan.

Verificar cada dato antes de grabar la voz.
