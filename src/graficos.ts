import {Pieza} from './plan';

// NÚMERO GRANDE: alto de cifra ≈ 0.70 em → 460 px de fuente = 322 px de cifra (meta ≥ 300 px).
export const FS_NUMERO = 460;
export const altoEcuacion = (bloques: string[]) => (bloques.length > 3 ? 316 : 172);

// Altura (px a escala 1) de cada gráfico que va debajo de la cara; 0 = pantalla completa o sin tarjeta.
export const PANTALLA_COMPLETA = new Set(['inserto', 'imagen', 'cta']);
export const altoPieza = (p: Pieza): number => {
  switch (p.tipo) {
    case 'comparacion': return p.estilo === 'versus' ? 270 : 150 * 2 + 24;
    case 'pasos': {
      const n = p.pasos.length, tit = p.titulo ? 100 : 0, cierre = p.cierre ? 96 : 0;
      if (p.estilo === 'flujo') return 64 + tit + 190;
      if (p.estilo === 'preguntas') return 64 + tit + n * 112;
      return 64 + tit + n * 84 + cierre;
    }
    case 'curva': return 470;
    case 'numero': return 56 + FS_NUMERO * 0.8;
    case 'escena': return 436;
    case 'ecuacion': return altoEcuacion(p.bloques);
    default: return 0;
  }
};
// Gráficos con tarjeta (los que piden lugar debajo de la cara y ocultan subtítulos)
export const esTarjeta = (p: Pieza) => altoPieza(p) > 0;
