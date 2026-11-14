// Video de datos curiosos — estilo "pulpo". Este archivo SOLO describe el video: mascota + escenas.
// El motor (lib/estilo.js) se encarga de animación, cámara, transiciones, efectos de sonido y sincronía.
//
// Cada escena empieza en una PALABRA de la voz (texto o índice de words.json) y dura hasta la siguiente.
// Los textos entran cuando se dice su palabra y salen solos al cambiar de escena.
// Ejemplo de nicho: ESPACIO (mascota planeta con anillo, brazos y piernas).
import { video, PALETA as P } from './lib/estilo.js';

const NARANJA = ['#FFB14E', '#E08A3C'], ESPACIO = '#1B1446';

await video({
  mascota: { forma: 'circulo', extremidades: 'brazos', colores: NARANJA, anillo: '#FFD9A0' },
  escenas: [
    { palabra: 0, textos: [
      { txt: '¿SABÍAS QUE', tam: 'm' },
      { txt: 'SATURNO', tam: 'xl', palabra: 'saturno', color: NARANJA[1] },
    ] },
    { palabra: 'flotaria', mascota: 'grande', fondo: P.mar, fondoEn: 'agua', decor: ['burbujas'], textos: [
      { txt: 'FLOTARÍA', tam: 'l' },
      { txt: 'EN EL AGUA', tam: 'xl', palabra: 'agua' },
    ] },
    { palabra: 'si', acciones: [{ tipo: 'saltar' }], decor: ['burbujas'], textos: [
      { txt: '¡SÍ!', tam: 'xl', golpe: true, color: P.oro },
    ] },
    { palabra: 'es tan', mascota: 'abajo', decor: ['burbujas'], textos: [
      { txt: 'TAN LIGERO', tam: 'l', palabra: 'ligero' },
      { txt: 'que en una bañera', tam: 's', palabra: 'que' },
      { txt: 'GIGANTE', tam: 'xl', palabra: 'gigante', color: P.oro },
      { txt: 'no se hundiría', tam: 's', palabra: 'no' },
    ] },
    { palabra: 'y ojo', mascota: 'normal', acciones: [{ tipo: 'ojo', palabra: 'ojo' }], textos: [
      { txt: '¡OJO!', tam: 'xl', palabra: 'ojo' },
    ] },
    { palabra: 'en venus', fondo: ESPACIO, transicion: 'corte', decor: ['estrellas'], mascota: 'abajo', textos: [
      { txt: 'EN VENUS', tam: 'l', palabra: 'venus' },
      { txt: 'UN DÍA DURA MÁS', tam: 'm', palabra: 'dia' },
      { txt: 'QUE UN AÑO', tam: 'l', palabra: 'ano', color: P.oro },
    ], graficos: [{ tipo: 'fichas', y: 770, vs: '>',
      a: { sim: '243', nombre: '1 DÍA', etiqueta: 'días terrestres', color: '#E06A3C', palabra: 'dura' },
      b: { sim: '225', nombre: '1 AÑO', etiqueta: 'días terrestres', color: '#7C46D9', palabra: 'ano' } }] },
    { palabra: 'pero lo mas', decor: ['estrellas'], mascota: 'normal', textos: [
      { txt: 'LO MÁS LOCO:', tam: 'l', wob: 0.15 },
    ] },
    { palabra: 'en el espacio las', decor: ['estrellas'],
      acciones: [{ tipo: 'ventana', iconos: [{ tipo: 'gota', palabra: 'lagrimas' }] }, { tipo: 'susto', palabra: 'caen' }], textos: [
      { txt: 'en el espacio', tam: 's' },
      { txt: 'LAS LÁGRIMAS', tam: 'l', palabra: 'lagrimas' },
      { txt: 'NO CAEN', tam: 'xl', palabra: 'caen', barra: true, golpe: true },
      { txt: 'se quedan como una', tam: 's', palabra: 'quedan' },
      { txt: 'BURBUJA', tam: 'l', palabra: 'burbuja', color: '#9FD8FF' },
    ] },
    { palabra: 'y no acaba', decor: ['estrellas'], textos: [
      { txt: '¡Y NO ACABA AHÍ!', tam: 'l' },
      { txt: 'NO HAY', tam: 'm', palabra: 'hay' },
      { txt: 'SONIDO', tam: 'xl', palabra: 'sonido', color: P.oro },
      { txt: 'ni una explosión se escucha', tam: 's', palabra: 'explosion' },
    ], graficos: [{ tipo: 'monitor', palabra: 'acaba', plano: 'sonido', y: 880 }],
      acciones: [{ tipo: 'susto', palabra: 'explosion' }] },
    { palabra: 'el universo', decor: ['estrellas'], acciones: [{ tipo: 'colores' }, { tipo: 'gafas', palabra: 'rarisimo' }], textos: [
      { txt: '¡EL UNIVERSO ES', tam: 'm' },
      { txt: 'RARÍSIMO!', tam: 'xl', palabra: 'rarisimo', color: 'arcoiris' },
    ] },
    { palabra: 'sigueme', fondo: P.papel, transicion: 'tinta', textos: [
      { txt: 'SÍGUEME', tam: 'xl', color: NARANJA[1] },
      { txt: 'para más datos', tam: 'm', palabra: 'para' },
      { txt: 'curiosos', tam: 'm', palabra: 'curiosos' },
    ] },
  ],
});
