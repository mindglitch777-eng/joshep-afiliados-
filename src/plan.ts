// Tipos del plan.json: lo único que cambia de un clip a otro.
type Base = {desde: number; hasta: number};
export type Pieza =
  | (Base & {tipo: 'gancho'; texto: string})
  | (Base & {tipo: 'comparacion'; mal: string; bien: string})
  | (Base & {tipo: 'pasos'; titulo?: string; pasos: string[]; tiempos?: number[]})
  | (Base & {tipo: 'enfasis'; palabra: string});

// clave: crece y suena el ding de marca · tono: color semántico · icono: sticker (ver piezas/Iconos.tsx)
export type Palabra = {texto: string; desde: number; hasta: number; clave?: boolean; tono?: 'neg' | 'pos'; icono?: string};
// Muestra de seguimiento de cara (normalizado 0-1 sobre el video).
export type MuestraCara = {t: number; x: number; y: number; w: number; h: number};

export type Plan = {
  fps?: number; // 30 por defecto
  video?: string | null; // ruta dentro de public/ (ej. "raw/clip01.mp4"), gitignored
  duracion: number; // segundos
  musica?: {archivo: string} | null; // nivel y ducking en src/audio.ts
  cara?: MuestraCara[]; // face_track; si falta se usa una cara fija centrada
  piezas: Pieza[];
  subtitulos: Palabra[];
};

export const f = (s: number, fps: number) => Math.round(s * fps);
