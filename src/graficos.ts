import {Pieza} from './plan';

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
    case 'numero': return 300;
    default: return 0;
  }
};
// Gráficos con tarjeta (los que piden lugar debajo de la cara y ocultan subtítulos)
export const esTarjeta = (p: Pieza) => altoPieza(p) > 0;
