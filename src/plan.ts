// Tipos del plan.json: lo único que cambia de un clip a otro.
type Base = {desde: number; hasta: number};
export type Pieza =
  | (Base & {tipo: 'gancho'; texto: string; clave?: string; variante?: string})
  | (Base & {tipo: 'comparacion'; mal: string; bien: string; estilo?: 'filas' | 'versus'; notaMal?: string; notaBien?: string})
  | (Base & {tipo: 'pasos'; titulo?: string; pasos: string[]; tiempos?: number[]; estilo?: 'lista' | 'check' | 'flujo' | 'preguntas'; cierre?: string; cierreEn?: number})
  // gráficos contextuales nativos
  | (Base & {tipo: 'curva'; alto: string; bajo: string; marcaAlto: number; marcaBajo: number; medio?: string; marcaMedio?: number; numero?: string; unidad?: string; numeroEn?: number})
  | (Base & {tipo: 'numero'; valor: string; unidad?: string; etiqueta?: string})
  // material de Joseph a pantalla completa (la voz sigue de fondo)
  | (Base & {tipo: 'inserto'; archivo: string; inicio?: number; velocidad?: number})
  | (Base & {tipo: 'imagen'; archivo: string})
  | (Base & {tipo: 'cta'; archivo: string; inicio?: number; velocidad?: number})
  | (Base & {tipo: 'enfasis'; palabra: string});

// clave: crece y suena el ding de marca · tono: color semántico · icono: sticker (ver piezas/Iconos.tsx)
export type Palabra = {texto: string; desde: number; hasta: number; clave?: boolean; tono?: 'neg' | 'pos'; icono?: string};
// Muestra de seguimiento de cara (normalizado 0-1 sobre el video).
// Con Face Mesh: además y de frente/ojos/boca/mentón, apertura de ojos, mirada y mano sobre la boca.
export type MuestraCara = {t: number; x: number; y: number; w: number; h: number; frente?: number; ojos?: number; boca?: number; menton?: number; ear?: number; mirada?: number; mano_boca?: boolean};

export type Plan = {
  fps?: number; // 30 por defecto
  video?: string | null; // ruta dentro de public/ (ej. "raw/clip01.mp4"), gitignored
  duracion: number; // segundos
  musica?: {archivo: string} | null; // nivel y ducking en src/audio.ts
  cara?: MuestraCara[]; // face_track; si falta se usa una cara fija centrada
  videoInfo?: {ancho: number; alto: number}; // tamaño del video fuente (para horizontales)
  encuadre?: 'cara' | 'desenfocado' | 'capas'; // horizontal: recorte 9:16 siguiendo la cara o video entero sobre fondo desenfocado
  cortes?: number[]; // jump cuts (segundos, ya en la línea de tiempo cortada): micro-zoom en cada uno
  ganchos?: {formula: string; texto: string; clave: string}[]; // variantes A/B/C (previews)
  ganchoVariante?: string; // fuerza una variante (render de previews)
  recorte?: {carpeta: string; hasta: number; fps?: number; n?: number}; // persona recortada (gancho detrás de Joseph)
  estilo?: string; // style pack (config/styles/*.json); lo elige la rotación de plan.py
  piezas: Pieza[];
  subtitulos: Palabra[];
};

export const f = (s: number, fps: number) => Math.round(s * fps);
