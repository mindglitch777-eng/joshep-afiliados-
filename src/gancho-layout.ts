import anchos from './anchos.json';
import hookCfg from '../config/hook.json';
import {camaraEn} from './camara';
import {Plano} from './linea';
import {MuestraCara, Plan} from './plan';

// Layout del gancho con anchos reales de Montserrat 900 (kerning apagado), igual que los subtítulos.
const A = anchos as Record<string, number>;
const T = hookCfg.texto, U = hookCfg.ubicacion;
export const LS_GANCHO = -0.01, LH_GANCHO = 1.12, PAD_GANCHO = {x: 16, y: 6};
export const CENTRO_X = (64 + hookCfg.subtitulos.x_max) / 2; // 512: nada a la derecha de x=960

const limpia = (w: string) => w.replace(/[¿?¡!.,]/g, '');
const ancho = (w: string, fs: number) => [...w].reduce((s, c) => s + ((A[c] ?? A.M) + LS_GANCHO) * fs, 0);

export type PalabraGancho = {t: string; x: number; y: number; ancho: number; clave: boolean};
export type LayoutGancho = {fs: number; palabras: PalabraGancho[]; top: number; alto: number; bajada: number; entra: boolean};

// gap normal 0.3em; al lado de la palabra clave se suma el padding de su caja
let CLAVE = '';
const gapEntre = (a: string, b: string, fs: number) => 0.3 * fs + (limpia(a) === CLAVE || limpia(b) === CLAVE ? PAD_GANCHO.x : 0);
const anchoL = (l: string[], fs: number) => l.reduce((s, x, i) => s + ancho(x, fs) + (i ? gapEntre(l[i - 1], x, fs) : 0), 0);
const lineas = (ws: string[], fs: number) => {
  const out: string[][] = [];
  for (const w of ws) {
    const l = out[out.length - 1];
    if (l && anchoL([...l, w], fs) <= T.ancho) l.push(w);
    else out.push([w]);
  }
  return out;
};

// ojosMin: la y más alta de los ojos en pantalla durante el gancho (peor caso). El texto termina ≥ 40 px arriba.
export const layoutGancho = (texto: string, clave: string | undefined, ojosMin: number): LayoutGancho => {
  const ws = texto.toUpperCase().split(/\s+/).filter(Boolean);
  CLAVE = limpia((clave ?? '').toUpperCase());
  const limite = ojosMin - U.margen_ojos;
  let fs = T.tam_max, ls = lineas(ws, fs);
  const alto = (n: number, f: number) => n * f * LH_GANCHO + 2 * PAD_GANCHO.y;
  while (fs > T.tam_min && (ls.length > T.max_lineas || U.y_top_min + alto(ls.length, fs) > limite)) {
    fs -= 2;
    ls = lineas(ws, fs);
  }
  const h = alto(ls.length, fs);
  // si ni a 72 px entra, se baja el video hasta 6% (con relleno degradado arriba)
  const falta = Math.max(0, U.y_top_min + h - limite);
  const bajada = Math.min(falta, U.bajar_video_max * 1920);
  const top = Math.max(U.y_top_min, limite + bajada - h);
  const palabras: PalabraGancho[] = [];
  ls.forEach((l, i) => {
    let x = CENTRO_X - anchoL(l, fs) / 2;
    l.forEach((w, j) => {
      if (j) x += gapEntre(l[j - 1], w, fs);
      const a = ancho(w, fs);
      palabras.push({t: w, x, y: top + PAD_GANCHO.y + i * fs * LH_GANCHO, ancho: a, clave: !!clave && limpia(w) === CLAVE});
      x += a;
    });
  });
  return {fs, palabras, top, alto: h, bajada, entra: falta <= bajada && ls.length <= T.max_lineas};
};

// Desde el plan: y más alta de los ojos durante el gancho (sin bajada) → layout.
export const layoutDelPlan = (plan: Plan, planos: Plano[], pista: MuestraCara[], fps: number): LayoutGancho | null => {
  const g = plan.piezas.find((p) => p.tipo === 'gancho');
  if (!g || g.tipo !== 'gancho') return null;
  let ojosMin = Infinity;
  for (let fr = 0; fr <= g.hasta * fps; fr += 2) ojosMin = Math.min(ojosMin, camaraEn(plan, planos, pista, fps, fr).cara.ojos);
  return layoutGancho(g.texto, g.clave, ojosMin);
};
