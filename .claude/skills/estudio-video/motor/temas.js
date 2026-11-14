// temas.js — identidad por nicho: tipografía (2 familias), paleta, textura de fondo, transiciones,
// personalidad del movimiento, presentador y música. Un video elige un tema y puede sobrescribir cualquier campo.

export const FUENTES = {
  baloo: { fam: 'Baloo 2', archivos: { 700: 'baloo-2-latin-700-normal.woff2', 800: 'baloo-2-latin-800-normal.woff2' } },
  rubik: { fam: 'Rubik', archivos: { 500: 'rubik-latin-500-normal.woff2', 600: 'rubik-latin-600-normal.woff2', 700: 'rubik-latin-700-normal.woff2', 800: 'rubik-latin-800-normal.woff2' } },
  fraunces: { fam: 'Fraunces', archivos: { 700: 'fraunces-latin-700-normal.woff2', 900: 'fraunces-latin-900-normal.woff2' } },
  space: { fam: 'Space Grotesk', archivos: { 500: 'space-grotesk-latin-500-normal.woff2', 700: 'space-grotesk-latin-700-normal.woff2' } },
  bricolage: { fam: 'Bricolage Grotesque', archivos: { 700: 'bricolage-grotesque-latin-700-normal.woff2', 800: 'bricolage-grotesque-latin-800-normal.woff2' } },
  fredoka: { fam: 'Fredoka', archivos: { 600: 'fredoka-latin-600-normal.woff2', 700: 'fredoka-latin-700-normal.woff2' } },
  archivo: { fam: 'Archivo Black', archivos: { 400: 'archivo-black-latin-400-normal.woff2' } },
  bebas: { fam: 'Bebas Neue', archivos: { 400: 'bebas-neue-latin-400-normal.woff2' } },
  mono: { fam: 'JetBrains Mono', archivos: { 700: 'JetBrainsMono-Bold.ttf', 800: 'JetBrainsMono-ExtraBold.ttf' } },
};

const base = {
  tinta: '#1D1A2F', blanco: '#FFFFFF', contorno: 9, radio: 30, grano: 0.03,
  alineacion: 'izq', mayusculas: true, entrada: 'salto', formas: true,
  transiciones: ['empujar', 'mancha', 'iris', 'persiana'],
  subtitulos: { activo: '#FFD23F' },
};

export const TEMAS = {
  // Salud, cuerpo humano, bienestar, psicología.
  salud: { ...base, display: ['baloo', 800], ui: ['rubik', 700],
    colores: { fondo: '#FFF3EA', fondo2: '#FFE1D6', oscuro: '#21173A', acento: '#FF4757', acento2: '#1FB8A6', acento3: '#FFC53D', texto: '#1D1A2F' },
    motivo: 'puntos', host: { forma: 'globulo', cuerpo: '#F2434F', sombra: '#C42A3A', accesorio: null },
    musica: { estilo: 'jugueton', bpm: 112, tonica: 'F', modo: 'mayor' } },
  // Ciencia, datos curiosos generales, química, física.
  ciencia: { ...base, display: ['bricolage', 800], ui: ['rubik', 700],
    colores: { fondo: '#EEF4FF', fondo2: '#DCE6FF', oscuro: '#141B3D', acento: '#3D5AFE', acento2: '#FF6B3D', acento3: '#FFD23F', texto: '#141B3D' },
    motivo: 'cuadricula', host: { forma: 'blob', cuerpo: '#5B7CFF', sombra: '#3D5AFE', accesorio: 'gafas' },
    musica: { estilo: 'pop', bpm: 116, tonica: 'D', modo: 'mayor' } },
  // Animales, naturaleza, océano.
  animales: { ...base, display: ['baloo', 800], ui: ['rubik', 700],
    colores: { fondo: '#EAF8EF', fondo2: '#D2F0DD', oscuro: '#0F2C2A', acento: '#FF7A45', acento2: '#2D9CDB', acento3: '#FFD23F', texto: '#123029' },
    motivo: 'burbujas', host: { forma: 'blob', cuerpo: '#FF8A5B', sombra: '#E5673A', accesorio: 'antena' },
    musica: { estilo: 'jugueton', bpm: 108, tonica: 'G', modo: 'mayor' } },
  // Espacio, astronomía.
  espacio: { ...base, display: ['space', 700], ui: ['rubik', 700],
    colores: { fondo: '#18123A', fondo2: '#251B57', oscuro: '#0B0820', acento: '#FF8A3D', acento2: '#7C5CFF', acento3: '#FFD23F', texto: '#FFFFFF' },
    motivo: 'estrellas', host: { forma: 'circulo', cuerpo: '#FFB14E', sombra: '#E08A3C', accesorio: 'anillo' },
    musica: { estilo: 'tech', bpm: 104, tonica: 'E', modo: 'menor' } },
  // Dinero, finanzas, negocios, emprendimiento.
  dinero: { ...base, display: ['archivo', 400], ui: ['rubik', 700], entrada: 'deslizar',
    colores: { fondo: '#F2F7EE', fondo2: '#DFF0D6', oscuro: '#0E2A1C', acento: '#12A150', acento2: '#1D1A2F', acento3: '#FFC53D', texto: '#0E2A1C' },
    motivo: 'rayas', host: { forma: 'circulo', cuerpo: '#FFC53D', sombra: '#E0A31F', accesorio: 'moneda' },
    transiciones: ['empujar', 'persiana', 'iris'], musica: { estilo: 'pop', bpm: 120, tonica: 'A', modo: 'menor' } },
  // Historia, cultura, misterios, libros.
  historia: { ...base, display: ['fraunces', 900], ui: ['rubik', 600], mayusculas: false, entrada: 'escala', grano: 0.06,
    colores: { fondo: '#F4EAD5', fondo2: '#E8D8B5', oscuro: '#2A1D12', acento: '#B23A2B', acento2: '#2F5D62', acento3: '#D9A441', texto: '#2A1D12' },
    motivo: 'papel', host: { forma: 'caja', cuerpo: '#C8763B', sombra: '#9E5627', accesorio: 'sombrero' },
    transiciones: ['persiana', 'iris', 'empujar'], musica: { estilo: 'epico', bpm: 92, tonica: 'D', modo: 'menor' } },
  // Tecnología, IA, internet, apps.
  tecnologia: { ...base, display: ['space', 700], ui: ['mono', 700], entrada: 'maquina',
    colores: { fondo: '#0F1222', fondo2: '#1A1F38', oscuro: '#070912', acento: '#00E0B8', acento2: '#7C5CFF', acento3: '#FFD23F', texto: '#EAF0FF' },
    motivo: 'circuito', host: { forma: 'caja', cuerpo: '#7C5CFF', sombra: '#5A3DE0', accesorio: 'antena' },
    transiciones: ['persiana', 'empujar', 'iris'], musica: { estilo: 'tech', bpm: 118, tonica: 'C', modo: 'menor' } },
  // Cocina, comida, recetas.
  cocina: { ...base, display: ['fredoka', 700], ui: ['rubik', 700], mayusculas: false,
    colores: { fondo: '#FFF6E5', fondo2: '#FFE7BF', oscuro: '#3A1F10', acento: '#FF6B35', acento2: '#6AB04C', acento3: '#FFD23F', texto: '#3A1F10' },
    motivo: 'puntos', host: { forma: 'circulo', cuerpo: '#FF9F43', sombra: '#E07B22', accesorio: 'gorro' },
    musica: { estilo: 'jugueton', bpm: 104, tonica: 'C', modo: 'mayor' } },
  // Motivación, productividad, deporte, hábitos.
  motivacion: { ...base, display: ['bebas', 400], ui: ['rubik', 700], entrada: 'escala',
    colores: { fondo: '#111111', fondo2: '#1E1E1E', oscuro: '#000000', acento: '#FF3D3D', acento2: '#FFFFFF', acento3: '#FFD23F', texto: '#FFFFFF' },
    motivo: 'rayas', host: { forma: 'blob', cuerpo: '#FF5A4E', sombra: '#D93A30', accesorio: 'cinta' },
    transiciones: ['empujar', 'persiana'], musica: { estilo: 'epico', bpm: 96, tonica: 'A', modo: 'menor' } },
  // General / curiosidades / listas.
  curiosidades: { ...base, display: ['bricolage', 800], ui: ['rubik', 700],
    colores: { fondo: '#FFF1E2', fondo2: '#FFE2C7', oscuro: '#1D1A2F', acento: '#FF5D5D', acento2: '#3D5AFE', acento3: '#FFD23F', texto: '#1D1A2F' },
    motivo: 'formas', host: { forma: 'blob', cuerpo: '#FF7A6B', sombra: '#E85A4E', accesorio: null },
    musica: { estilo: 'pop', bpm: 114, tonica: 'G', modo: 'mayor' } },
};

export function tema(nombre, extra = {}) {
  const T = structuredClone(TEMAS[nombre] || TEMAS.curiosidades);
  for (const [k, v] of Object.entries(extra || {})) T[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(T[k] || {}), ...v } : v;
  T.nombre = nombre;
  return T;
}
