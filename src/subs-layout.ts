import anchos from './anchos.json';
import brand from '../config/brand.json';
import {Palabra} from './plan';

// Layout de subtítulos calculado con los anchos reales de Montserrat 900 (kerning apagado):
// las posiciones son fijas por frase, así que el resaltado nunca cambia el ancho de nada.
const B = brand.subtitulos;
export const SUB = {fs: B.tam, clave: B.clave, ls: 0.015, gap: 0.32, lh: 1.2, maxW: 856, porLinea: B.porLinea, lineas: B.lineas, centroX: 64 + 856 / 2, centroY: B.y};
const A = anchos as Record<string, number>;

export const textoSub = (w: Palabra) => w.texto.replace(/[.,;:!?…]+$/, '').toUpperCase();
export const tam = (w: Palabra) => SUB.fs * (w.clave ? SUB.clave : 1);
// ancho de layout de una palabra (lo mismo que mide el navegador: incluye letter-spacing por carácter)
export const anchoPalabra = (w: Palabra) => {
  const t = textoSub(w), fs = tam(w);
  return [...t].reduce((s, c) => s + (A[c] ?? A.M) * fs + SUB.ls * fs, 0);
};

export type Caja = {w: Palabra; x: number; y: number; ancho: number; alto: number; fs: number};
export type Frase = {palabras: Palabra[]; cajas: Caja[]; ini: number; fin: number};

// 1) tramos por silencio > 0.25 s o puntuación; 2) líneas de ≤3 palabras y ≤856 px; 3) frases de ≤2 líneas.
export const armarFrases = (ps: Palabra[]): Frase[] => {
  const tramos: Palabra[][] = [];
  let cur: Palabra[] = [];
  ps.forEach((p, i) => {
    cur.push(p);
    const sig = ps[i + 1];
    if (!sig || sig.desde - p.hasta > 0.25 || /[.!?…:]$/.test(p.texto) || (/[,;]$/.test(p.texto) && cur.length >= 2)) {
      tramos.push(cur);
      cur = [];
    }
  });
  const gap = SUB.gap * SUB.fs;
  const frases: Frase[] = [];
  for (const tr of tramos) {
    const lineas: Palabra[][] = [];
    for (const w of tr) {
      const l = lineas[lineas.length - 1];
      const ancho = l ? l.reduce((s, x) => s + anchoPalabra(x) + gap, 0) + anchoPalabra(w) : 0;
      if (!l || l.length >= SUB.porLinea || ancho > SUB.maxW) lineas.push([w]);
      else l.push(w);
    }
    // evita una palabra sola en la última línea si se puede pasar una de la anterior
    const u = lineas[lineas.length - 1], pen = lineas[lineas.length - 2];
    if (u && pen && u.length === 1 && pen.length === 3) u.unshift(pen.pop()!);
    for (let i = 0; i < lineas.length; i += SUB.lineas) frases.push(ubicar(lineas.slice(i, i + SUB.lineas)));
  }
  return frases;
};

const ubicar = (lineas: Palabra[][]): Frase => {
  const gap = SUB.gap * SUB.fs;
  const altos = lineas.map((l) => Math.max(...l.map(tam)) * SUB.lh);
  let y = SUB.centroY - altos.reduce((a, b) => a + b, 0) / 2;
  const cajas: Caja[] = [];
  lineas.forEach((l, li) => {
    const total = l.reduce((s, w) => s + anchoPalabra(w), 0) + gap * (l.length - 1);
    let x = SUB.centroX - total / 2;
    for (const w of l) {
      const ancho = anchoPalabra(w);
      cajas.push({w, x, y, ancho, alto: altos[li], fs: tam(w)});
      x += ancho + gap;
    }
    y += altos[li];
  });
  const ps = lineas.flat();
  return {palabras: ps, cajas, ini: ps[0].desde, fin: ps[ps.length - 1].hasta};
};
