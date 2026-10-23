import anchos from './anchos.json';
import brand from '../config/brand.json';
import kw from '../config/keywords.json';
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

// Palabras con las que nunca termina una línea ni un bloque (config/keywords.json → no_terminar_en).
const DEBIL = new Set(kw.no_terminar_en);
export const esDebil = (w: Palabra) => DEBIL.has(w.texto.toLowerCase().replace(/[^a-záéíóúñü]/g, ''));

// 1) tramos por pausa ≥ 0.25 s o puntuación; 2) líneas de 2–3 palabras y ≤856 px que no terminen en
// artículo/preposición/conjunción; 3) bloques de ≤2 líneas.
export const armarFrases = (ps: Palabra[]): Frase[] => {
  const tramos: Palabra[][] = [];
  let cur: Palabra[] = [];
  ps.forEach((p, i) => {
    cur.push(p);
    const sig = ps[i + 1];
    if (!sig || sig.desde - p.hasta >= 0.25 || /[.!?…:]$/.test(p.texto) || (/[,;]$/.test(p.texto) && cur.length >= 2)) {
      tramos.push(cur);
      cur = [];
    }
  });
  const frases: Frase[] = [];
  for (const tr of tramos) {
    const lineas = partirLineas(tr);
    for (let i = 0; i < lineas.length; i += SUB.lineas) frases.push(ubicar(lineas.slice(i, i + SUB.lineas)));
  }
  return frases;
};

const anchoLinea = (l: Palabra[]) => l.reduce((s, x) => s + anchoPalabra(x), 0) + SUB.gap * SUB.fs * (l.length - 1);
// hasta 20% de exceso permitido: esa línea se achica para entrar en 856 px (ver ubicar)
const entra = (l: Palabra[], tolerancia = 1) => l.length <= SUB.porLinea && anchoLinea(l) <= SUB.maxW * tolerancia;

const partirLineas = (tr: Palabra[]) => {
  const lineas: Palabra[][] = [];
  let l: Palabra[] = [];
  for (const w of tr) {
    // si la línea terminaría en palabra débil, se acepta un poco de exceso (se achica) antes que cortarla mal
    const debilAlFinal = l.length > 0 && esDebil(l[l.length - 1]);
    if (l.length && !entra([...l, w], debilAlFinal ? 1.2 : 1)) {
      // si igual no entra, la palabra débil pasa a la línea siguiente
      const pasa: Palabra[] = [];
      while (l.length > 1 && esDebil(l[l.length - 1])) pasa.unshift(l.pop()!);
      lineas.push(l);
      l = pasa;
    }
    l.push(w);
  }
  if (l.length) lineas.push(l);
  // evita una palabra sola al final si la anterior puede cederle una sin quedar terminando en débil
  const u = lineas[lineas.length - 1], pen = lineas[lineas.length - 2];
  if (u && pen && u.length === 1 && pen.length >= 3 && !esDebil(pen[pen.length - 2]) && entra([pen[pen.length - 1], ...u])) u.unshift(pen.pop()!);
  return lineas;
};


const ubicar = (lineas: Palabra[][]): Frase => {
  // cada línea que excede 856 px se achica entera (tamaño y gap) para entrar
  const esc = lineas.map((l) => Math.min(1, SUB.maxW / anchoLinea(l)));
  const altos = lineas.map((l, i) => Math.max(...l.map(tam)) * esc[i] * SUB.lh);
  let y = SUB.centroY - altos.reduce((a, b) => a + b, 0) / 2;
  const cajas: Caja[] = [];
  lineas.forEach((l, li) => {
    const k = esc[li], gap = SUB.gap * SUB.fs * k;
    let x = SUB.centroX - anchoLinea(l) * k / 2;
    for (const w of l) {
      const ancho = anchoPalabra(w) * k;
      cajas.push({w, x, y, ancho, alto: altos[li], fs: tam(w) * k});
      x += ancho + gap;
    }
    y += altos[li];
  });
  const ps = lineas.flat();
  return {palabras: ps, cajas, ini: ps[0].desde, fin: ps[ps.length - 1].hasta};
};
