// Tipos del plan.json: lo único que cambia de un clip a otro.
export type Pieza =
  | {tipo: 'gancho'; desde: number; hasta: number; texto: string}
  | {tipo: 'comparacion'; desde: number; hasta: number; mal: string; bien: string}
  | {tipo: 'pasos'; desde: number; hasta: number; titulo?: string; pasos: string[]}
  | {tipo: 'enfasis'; desde: number; hasta: number; palabra: string; zoom?: {x: number; y: number; escala?: number}};

export type Palabra = {texto: string; desde: number; hasta: number};

export type Plan = {
  video?: string | null; // ruta dentro de public/ (ej. "raw/clip01.mp4"), gitignored
  duracion: number; // segundos
  musica?: {archivo: string; volumen: number} | null;
  piezas: Pieza[];
  subtitulos: Palabra[];
};

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);
