---
name: video-datos-curiosos
description: Crea videos verticales para TikTok/Reels/Shorts de "datos curiosos" en el estilo del video del pulpo — una mascota 2D dibujada en código que narra con voz de ElevenLabs a ritmo de charla, texto gigante que salta en cada palabra clave, golpes de cámara, olas, nube de tinta, fichas, monitor y contadores, todo sincronizado palabra a palabra. Úsala para cualquier nicho (animales, espacio, historia, dinero, salud, tecnología, comida, deportes...) cuando pidan "otro video como el del pulpo", "un video de datos curiosos sobre X", "el mismo estilo pero de X", o una serie de videos con esa animación.
---

# Video de datos curiosos (estilo pulpo)

El estilo ya está construido como motor reutilizable. Para un video nuevo **solo se escriben dos cosas**:
`guion.txt` (lo que dice la voz) y `film.js` (mascota + lista de escenas atadas a palabras).
El motor `template/lib/estilo.js` pone animación, cámara, transiciones, efectos de sonido, lip sync y sincronía.

Referencias en este repo: `pulpo/` (video original, hecho a mano), `espacio/` (hecho con esta skill),
`GUIA_ESTILO_VIDEOS_DATOS_CURIOSOS.md` (la guía de estilo completa).

`SK` = carpeta de esta skill (`.claude/skills/video-datos-curiosos`). Ejecuta todo desde la raíz del repo.

## 0. Requisitos (una vez por sesión)
- Playwright: `npm ls playwright` debe coincidir con el Chromium del sistema; si el render falla por versión,
  `npm i -D playwright@<versión de /opt/node-tools/node_modules/playwright>`.
- La skill **motion-reel** (render, efectos, mezcla, música). `producir.sh` la busca sola; si no, `MOTION_REEL=<carpeta>`.
- ElevenLabs: clave como *network secret* del entorno para `api.elevenlabs.io` (cabecera `xi-api-key`), o la
  variable `ELEVENLABS_API_KEY`. Si falta, pídela con el formulario seguro (`request_credential`), nunca en el chat.

## 1. Preguntar lo mínimo (una sola ronda, con opciones por defecto)
Nicho y tema concreto · duración (por defecto ~22–26 s) · voz (por defecto Jessica `cgSgspJ2msm6clMCkdW9`, o un
Voice ID que den) · mascota (proponer una, ver tabla). Si el usuario ya dio el tema, no preguntes: decide y avanza.

## 2. Guion (`<slug>/guion.txt`)
Estructura fija, ~3,4 palabras/s, 65–85 palabras, una sola línea de texto:
1. **Gancho** "¿Sabías que …?" + el dato más fuerte + repetición corta ("¡Tres!", "¡Sí, flotaría!").
2. **Explicación** del dato (para qué / por qué).
3. **"Y ojo:"** dato 2 con comparación o ejemplo cotidiano ("como nosotros", "en una bañera gigante").
4. **"Pero lo más loco:"** dato sorprendente + consecuencia graciosa.
5. **"Y no acaba ahí:"** 1–2 datos rápidos.
6. **Remate** con exclamación ("¡Un genio del océano!", "¡El universo es rarísimo!").
7. **Cierre** "Sígueme para más datos curiosos."
Reglas: datos verificados (si dudas, no lo pongas o matízalo); frases cortas; cada dato tiene que poder
**dibujarse**; números que se puedan mostrar en grande.

## 3. Crear proyecto y voz
```bash
bash $SK/scripts/nuevo.sh <slug> "Título"          # copia la plantilla (no sobrescribe)
# escribir <slug>/guion.txt
python3 $SK/scripts/voz.py <slug> [--voz VOICE_ID]  # toma eleven_v3 [excited] → recorta pausas → tiempos → boca
```
`voz.py` imprime la transcripción y el **índice de palabras con sus tiempos**. Compara la transcripción con el
guion: si una palabra sale mal, cambia el guion (sinónimo) y repite. Fija la duración del video en film.json.

## 4. Escribir `<slug>/film.js` (lo único creativo)
Parte de la plantilla (`template/film.js`, ejemplo de espacio). Formato:

```js
import { video, PALETA as P } from './lib/estilo.js';
await video({
  mascota: { forma: 'gota'|'circulo'|'caja', extremidades: 'tentaculos'|'brazos'|'ninguna', colores: [cuerpo, sombra], anillo?: color },
  fondo?: color inicial (papel por defecto),
  escenas: [ { palabra, textos: [...], fondo?, fondoEn?, transicion?, decor?, mascota?, acciones?, graficos? }, ... ],
});
```

**palabra**: dónde empieza algo. Texto (`'nueve'`, `'tres corazones'`, sin tildes ni signos da igual) que se busca
hacia delante desde el inicio de la escena, o un índice numérico de `words.json`, o `{ t: segundos }`.
Una escena dura hasta que empieza la siguiente; sus textos salen solos.

**textos** (se apilan desde arriba, entran al decir su `palabra`; si no tiene, al empezar la escena):
| Línea | Uso |
|---|---|
| `{ txt, tam: 'xl' }` | palabra clave gigante (ajusta al ancho). `golpe: true` = impacto + temblor |
| `{ txt, tam: 'l' }` / `'m'` | frases de apoyo grandes / medianas |
| `{ txt, tam: 's' }` | texto chico (fuente UI) |
| `{ numero: '3' }` | número gigante solo |
| `{ numero: '2', txt: 'BRANQUIAS', sub: 'mandan sangre a las', flecha: true, palabraTxt }` | fila número → palabra |
| `{ numero: '9', txt: 'CEREBROS', contar: [1, 9, 0.15, 'cerebros'] }` | contador que sube |
| `color: '#hex' \| 'arcoiris'`, `barra: true \| '#hex'`, `wob`, `max`, `x` | opciones |
El color por defecto se elige solo (blanco sobre fondo oscuro, tinta sobre claro).

**fondo**: cambia el color de fondo al empezar la escena (o en `fondoEn: 'palabra'`).
`transicion: 'ola'` (ola que inunda, por defecto) · `'tinta'` (nube de tinta, usar para el cierre) · `'corte'`.
**decor**: `['burbujas', 'algas', 'estrellas', 'suelo']` mientras dure la escena.
**mascota** (posición): `'normal' | 'grande' | 'abajo' | 'pequeno' | 'alto' | 'cierre'` o `[x, y, escala]`.

**acciones** de la mascota (`{ tipo, palabra?, hasta? }`):
| tipo | Qué hace |
|---|---|
| `ventana` | abre una ventana "rayos X" en el cuerpo con `iconos: [{ tipo, palabra, color? }]` (laten al ritmo). Iconos: corazon, cerebro, moneda (`txt:'$'`), estrella, rayo, gota, ojo, circulo |
| `resaltar` | `iconos: [0, 1]` ilumina iconos de la ventana |
| `teñir` | `color` cambia el color de los iconos (ej. sangre azul) |
| `detener` | `icono: 2` se apaga y deja de latir |
| `brazos` | `icono: 'cerebro'`, uno en la cabeza (en `palabra`) y uno en cada extremidad desde `siguiente` |
| `nadar` | `ruta: [['palabra', [x, y, esc]], ...]` nada con estelas |
| `caminar` | camina (usar con `decor: ['suelo']`), `dx` píxeles |
| `saltar` · `saludar` | salta de alegría · saluda con un brazo |
| `susto` | ojos chicos, boca "o", sudor, impacto |
| `ojo` | un ojo gigante (chiste visual con "¡ojo!") |
| `colores` | cambia de color muy rápido |
| `birrete` · `gafas` | accesorio que cae (queda hasta el cierre) |

**graficos**: `{ tipo: 'fichas', a: { sim, nombre, etiqueta, color, palabra }, b: {...}, vs: 'vs'|'>', y }`
(comparaciones: Cu vs Fe, 243 > 225) · `{ tipo: 'monitor', palabra, plano: 'palabra', y }` (latido que se queda plano).

Los efectos de sonido y los golpes de cámara se generan solos a partir de escenas, textos y acciones.

### Reglas de dirección (lo que hace que se vea "vivo")
- **Una escena cada 1–3 s.** Ninguna escena sin texto en pantalla: la primera línea entra en la palabra de inicio.
- Cada dato = **una acción de la mascota** distinta. No repetir acción dos veces seguidas.
- **Un cambio de fondo a mitad** del video (con `ola`) y **tinta** al pasar al cierre (fondo papel).
- Una palabra `xl` por escena como mucho; números siempre en cifra grande.
- Zona segura: no colocar gráficos por debajo de y≈1490 ni texto a la derecha de x≈930.
- Gráficos (`fichas`, `monitor`) entre el texto y la mascota (y ≈ 750–900); si chocan, mascota `'abajo'`.

### Mascotas por nicho (ideas)
| Nicho | Mascota | Config |
|---|---|---|
| Animales marinos | pulpo | `gota` + `tentaculos`, coral |
| Espacio | planeta con anillo | `circulo` + `brazos`, `anillo` |
| Dinero / finanzas | moneda | `circulo` + `brazos`, oro `#FFD23F`, iconos `moneda` |
| Tecnología | teléfono | `caja` + `brazos`, gris/azul |
| Historia / libros | libro | `caja` + `brazos`, marrón |
| Salud / cuerpo | gota de sangre o célula | `gota` + `brazos`, rojo |
| Comida | fruta | `circulo` + `brazos`, color de la fruta |

## 5. Revisar (mínimo 2 rondas) y producir
```bash
bash $SK/scripts/producir.sh <slug> --revisar   # música + hojas de contacto out/<slug>/contact_9x16*.png, phone_*.png
```
Mira las hojas (también la de tamaño móvil) y corrige: cuadros sin texto, textos que tapan a la mascota,
gráficos encima de la cara, texto ilegible en el móvil. Luego:
```bash
bash $SK/scripts/producir.sh <slug>              # render + efectos + mezcla −14 LUFS + portada + comprobaciones
```
Verificación final obligatoria: duración correcta, 60 fps, audio presente, **0 silencios > 0,4 s**, y transcribir
`out/<slug>/final.mp4` con Scribe para confirmar que se entiende todo. Entregar `out/<slug>/final.mp4`.

## 6. Si hace falta algo que el motor no tiene
Añádelo en `<slug>/lib/estilo.js` del proyecto (o en la plantilla si servirá para más videos), respetando el
contrato: todo es función del tiempo `t` (nada de `Math.random`, temporizadores ni estado entre cuadros).
Para un personaje muy distinto, dibuja su cuerpo en `bodyPath`/`GEO` y reutiliza cara, boca y accesorios.
