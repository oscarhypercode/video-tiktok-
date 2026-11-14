# Catálogo del video.json

```json
{
  "titulo": "…",
  "tema": "salud",                    // ver Temas
  "ajustes": { "colores": { "acento": "#FF4757" }, "musica": { "estilo": "pop", "bpm": 118 } },
  "presentador": { "forma": "blob", "cuerpo": "#7C5CFF", "sombra": "#5A3DE0", "accesorio": "gafas" },
  "lista": 7,                         // total de puntos si es un top (solo informativo)
  "subtitulos": true,                 // subtítulos tipo TikTok (se ocultan solos si repiten el titular)
  "cola": 1.1,                        // segundos tras la última palabra
  "escenas": [ { … }, … ]
}
```

## Escena
| campo | valores |
|---|---|
| `en` | palabra donde empieza (texto, varias palabras o índice de words.json). La 1.ª escena empieza en 0 |
| `item` | número del punto en un top: entra gigante al decirlo y se acomoda junto al titular |
| `fondo` | `fondo`, `fondo2`, `oscuro`, `acento`, `acento2`, `acento3` o `#hex` (se hereda) |
| `transicion` | `auto` (rota las del tema), `empujar`, `mancha`, `iris`, `persiana`, `corte` |
| `lineas` | titulares, de arriba abajo (ver abajo) |
| `visual` | un visual (ver abajo) |
| `presentador` | `{ pos, emocion, gesto, brillo, sudor, saltar }` al empezar la escena |
| `momentos` | `[{ en, retraso?, presentador?: {…}, efecto?: "golpe" \| "apagon" \| "zoom" }]` dentro de la escena |

### Línea
`{ "txt": "Brillas en la _oscuridad_", "tam": "xl|l|m|s", "en"?: "palabra", "color"?: "acento|#hex", "golpe"?: true, "entrada"?: "salto|escala|deslizar|maquina", "minusculas"?: true, "renglones"?: 2 }`
- `xl` gigante (1–3 palabras), `l` titular, `m` apoyo, `s` texto chico (fuente UI).
- Marcas: `*acento*`, `_marcador_`, `~caja~` (pueden abarcar varias palabras).
- Se ajusta solo: reparte en renglones parejos y encoge si el visual necesita espacio.

### Visuales
| tipo | campos |
|---|---|
| `dato` | `valor`, `dec`, `miles` (false para años), `prefijo`, `sufijo`, `desde`, `duracion`, `etiqueta`, `etiquetaEn`, `icono`, `color`, `en` — número que cuenta hasta el valor |
| `comparar` | `a`/`b`: `{ icono, valor, sufijo, etiqueta, color, en }`, `vs`: "VS"\|"→"\|">", `barras` |
| `icono` | `icono`, `etiqueta`, `etiquetaEn`, `anim: { nivel: [0, 0.9], dur }` (vaso), `orbitas: 2.3`, `orbitasEn`, `opciones` |
| `barras` | `items: [{ etiqueta, valor, color, en }]`, `unidad` |
| `pasos` | `items: [{ txt, icono?, en }]` — lista con checks que aparecen al decirse |
| `iconos` | `lista: [{ icono, etiqueta, en }]` — fila de hasta 4 iconos |
| `cita` | `txt`, `autor`, `en` — las palabras se iluminan mientras se dicen |
| `sello` | `txt: "MITO"\|"VERDAD"\|…`, `color`, `en` — sello que cae con golpe |
| `cta` | `en`, `boton`, `hecho`, `comentario: true`, `comentarioEn` — botón de seguir con mano que lo pulsa |

### Iconos
corazon (late), cerebro, hueso, ojo (parpadea), gota, vaso (se llena), estomago, bebe, tierra (gira),
reloj (avanza), rayo, estrella, fuego (flamea), moneda (gira), bombilla (brilla), check, cruz, comentario,
mano, libro, cohete, trofeo, lupa, alerta, calendario (`opciones.txt`), ciclo, grafico (sube), planeta,
sol, dinero.

### Presentador
- `pos`: `centro`, `abajo` (con visual, por defecto), `izq`, `der`, `grande` (ganchos), `oculto`, o `[x, y, escala]`
- `emocion`: `neutral`, `feliz`, `emocionado`, `sorpresa`, `pensando`, `preocupado`, `risa`, `orgulloso`, `decidido`
- `gesto`: `reposo`, `presentar` (por defecto con visual), `señalar` (apunta al visual), `saludar`, `arriba`,
  `pensar`, `encoger`, `aplaudir`, `jarras`
- `brillo`: 0–1 (aura), `sudor`: 0–1, `saltar`: true
- Solo: parpadea, mira lo que aparece, mueve la boca con la voz, salta al cambiar de escena y guiña al final.
- Formas: `blob`, `circulo`, `globulo`, `caja`, `gota`. Accesorios: `gafas`, `antena`, `anillo`, `sombrero`,
  `gorro`, `cinta`, `moneda`, `birrete`.

## Temas
| tema | tipografía | fondo / acento | textura | presentador | música |
|---|---|---|---|---|---|
| salud | Baloo 2 + Rubik | crema / coral | puntos | glóbulo rojo | juguetón 112 Fa mayor |
| ciencia | Bricolage + Rubik | azul hielo / índigo | cuadrícula | blob con gafas | pop 116 Re mayor |
| animales | Baloo 2 + Rubik | menta / naranja | burbujas | blob con antena | juguetón 108 Sol mayor |
| espacio | Space Grotesk + Rubik | violeta noche / naranja | estrellas | planeta con anillo | tech 104 Mi menor |
| dinero | Archivo Black + Rubik | verde claro / verde | rayas | moneda | pop 120 La menor |
| historia | Fraunces + Rubik | pergamino / granate | papel | caja con sombrero | épica 92 Re menor |
| tecnologia | Space Grotesk + JetBrains Mono | azul noche / turquesa | circuito | caja con antena | tech 118 Do menor |
| cocina | Fredoka + Rubik | crema / naranja | puntos | círculo con gorro | juguetón 104 Do mayor |
| motivacion | Bebas Neue + Rubik | negro / rojo | rayas | blob con cinta | épica 96 La menor |
| curiosidades | Bricolage + Rubik | crema / coral | manchas | blob coral | pop 114 Sol mayor |

Estilos de música: `jugueton` (marimba, shaker), `pop` (cuerdas pulsadas, palmas), `tech` (arpegio cuadrado),
`epico` (tambores a medio tiempo, ostinato), `lofi` (swing, campanas). Siempre en la tonalidad del tema,
con sidechain al bombo, intro ligera hasta la 2.ª escena y final sin batería.
