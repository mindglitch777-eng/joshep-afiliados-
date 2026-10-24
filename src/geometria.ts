import brand from '../config/brand.json';
import hookCfg from '../config/hook.json';
import {Camara} from './camara';

// Geometría compartida por el render y el QA (qa.json): así lo que se mide es lo que se ve.
export type Rect = {x0: number; y0: number; x1: number; y1: number};
export const area = (r: Rect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
export const inter = (a: Rect, b: Rect): Rect => ({x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1)});
export const tocan = (a: Rect, b: Rect) => area(inter(a, b)) > 0;

export const BORDE_INF = hookCfg.subtitulos.borde_inferior; // 1440
export const X_MAX = hookCfg.subtitulos.x_max; // 960
export const CENTRO_X = (64 + X_MAX) / 2;

// Zonas de la cara en pantalla. La caja incluye la cabeza (la malla llega a la frente: se suma 30% arriba).
export const zonasCara = (c: Camara['cara']) => {
  const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2, alto = c.menton - c.frente;
  return {
    cara: {x0, x1, y0: c.frente - 0.3 * alto, y1: c.menton},
    ojos: {x0, x1, y0: c.ojos - 0.035 * alto, y1: c.ojos + 0.035 * alto},
    boca: {x0: c.x - 0.3 * c.w, x1: c.x + 0.3 * c.w, y0: c.boca - 0.09 * alto, y1: c.boca + 0.09 * alto},
    menton: {x0: c.x - 0.25 * c.w, x1: c.x + 0.25 * c.w, y0: c.menton - 0.05 * alto, y1: c.menton + 0.03 * alto},
  };
};

// Sticker: fuera de la caja de la cara (mín. 40 px), en el margen lateral junto a la cabeza. Si no entra ni achicado, no va.
export const rectSticker = (c: Camara['cara'], lado: 1 | -1): (Rect & {t: number}) | null => {
  const S = hookCfg.stickers, z = zonasCara(c).cara;
  const y = Math.max(z.y0 + (c.ojos - z.y0) * 0.5, 170);
  for (const ld of [lado, -lado as 1 | -1]) {
    const libre = ld === 1 ? X_MAX - (z.x1 + S.margen_cara) : z.x0 - S.margen_cara - 64;
    const t = Math.min(S.tam, libre);
    if (t >= S.tam_min) {
      const x0 = ld === 1 ? z.x1 + S.margen_cara : z.x0 - S.margen_cara - t;
      return {x0, x1: x0 + t, y0: y - t / 2, y1: y + t / 2, t};
    }
  }
  return null;
};

// Tarjetas y lista: debajo de la cara, borde inferior ≤ 1440, ancho de marca centrado en el área útil (x ≤ 960).
export const ANCHO_TARJETA = Math.min(brand.tarjetas.ancho, 2 * (X_MAX - CENTRO_X));
// Elige el lugar menos malo: debajo de la cara, arriba de los ojos (franja de la frente) o anclado a 1440.
// Nunca sobre ojos/boca si hay alternativa; la cara entera pesa menos.
export const rectBloque = (c: Camara['cara'], alto: number): Rect => {
  const x0 = CENTRO_X - ANCHO_TARJETA / 2, x1 = CENTRO_X + ANCHO_TARJETA / 2, z = zonasCara(c);
  const ops: Rect[] = [
    {x0, x1, y0: c.menton + 40, y1: c.menton + 40 + alto},
    {x0, x1, y0: z.ojos.y0 - 40 - alto, y1: z.ojos.y0 - 40},
    {x0, x1, y0: BORDE_INF - alto, y1: BORDE_INF},
  ].filter((r) => r.y0 >= 170 && r.y1 <= BORDE_INF);
  const costo = (r: Rect) => 10 * (area(inter(r, z.ojos)) + area(inter(r, z.boca))) + area(inter(r, z.cara));
  return ops.sort((a, b) => costo(a) - costo(b))[0] ?? {x0, x1, y0: BORDE_INF - alto, y1: BORDE_INF};
};
export const altoComparacion = 150 * 2 + 24;
export const altoLista = (n: number, titulo: boolean) => 64 + (titulo ? 100 : 0) + n * 84;
