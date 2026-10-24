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
    menton: {x0: c.x - 0.25 * c.w, x1: c.x + 0.25 * c.w, y0: c.menton - 0.05 * alto, y1: c.menton + 0.02 * alto},
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
// Elige el lugar menos malo: debajo del mentón, en la franja de la frente, entre boca y 1440 o anclado a 1440. Puede achicarse
// hasta 75% para entrar en una zona libre. Nunca sobre ojos/boca si hay alternativa; la cara entera pesa menos.
export type RectBloque = Rect & {k: number};
// `caras`: la cara a lo largo de toda la pieza (el lugar se elige para el peor caso y no salta).
export const rectBloque = (caras: Camara['cara'][], alto: number): RectBloque => {
  const zs = caras.map(zonasCara), kMin = hookCfg.tarjetas.escala_min;
  const ojosTop = Math.min(...zs.map((z) => z.ojos.y0)), mentonMax = Math.max(...caras.map((c) => c.menton));
  const caja = (y0: number, k: number): RectBloque => ({x0: CENTRO_X - (ANCHO_TARJETA * k) / 2, x1: CENTRO_X + (ANCHO_TARJETA * k) / 2, y0, y1: y0 + alto * k, k});
  const abajo = BORDE_INF - (mentonMax + 40), arriba = ojosTop - 40 - 170;
  const ops: RectBloque[] = [caja(BORDE_INF - alto, 1)];
  const kAb = Math.min(1, abajo / alto), kAr = Math.min(1, arriba / alto);
  if (kAb >= kMin) ops.push(caja(mentonMax + 40, kAb));
  if (kAr >= kMin) ops.push(caja(ojosTop - 40 - alto * kAr, kAr));
  // entre la boca y 1440 (sobre mentón/barba, nunca sobre la boca)
  const bocaMax = Math.max(...zs.map((z) => z.boca.y1)) + 16, kBo = Math.min(1, (BORDE_INF - bocaMax) / alto);
  if (kBo >= kMin) ops.push(caja(BORDE_INF - alto * kBo, kBo));
  const costo = (r: RectBloque) => zs.reduce((s, z) => s + 1e9 * +(tocan(r, z.ojos) || tocan(r, z.boca)) + area(inter(r, z.cara)), 0) / zs.length + (1 - r.k) * 20000;
  return ops.sort((p, q) => costo(p) - costo(q))[0];
};
export const altoComparacion = 150 * 2 + 24;
export const altoLista = (n: number, titulo: boolean) => 64 + (titulo ? 100 : 0) + n * 84;
