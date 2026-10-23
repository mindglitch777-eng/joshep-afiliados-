import {interpolate} from 'remotion';
import {Plano} from './linea';
import {MuestraCara, Plan} from './plan';
import {EASE_ZOOM} from './theme';

const W = 1080, H = 1920;
const CARA_FIJA: MuestraCara = {t: 0, x: 0.5, y: 0.35, w: 0.37, h: 0.26};
const ZOOM_ENFASIS = 1.18;
const SUBE = 21, BAJA = 13, ANTICIPO = 4; // frames
export const PUNCH = 9; // frames de cada cambio de plano

// face_track: interpola entre muestras, suaviza con EMA (alpha 0.15) y mantiene la última posición válida.
export const pistaCara = (plan: Plan, fps: number, frames: number): MuestraCara[] => {
  const m = (plan.cara ?? []).filter((c) => c.w > 0).sort((a, b) => a.t - b.t);
  const out: MuestraCara[] = [];
  let prev = m[0] ?? CARA_FIJA;
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    let raw = prev;
    if (m.length) {
      const j = m.findIndex((c) => c.t > t);
      if (j === 0) raw = m[0];
      else if (j < 0) raw = m[m.length - 1];
      else {
        const a = m[j - 1], b = m[j], k = (t - a.t) / (b.t - a.t);
        raw = {t, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k};
      }
    }
    const s = i === 0 ? raw : {t, x: prev.x + 0.15 * (raw.x - prev.x), y: prev.y + 0.15 * (raw.y - prev.y), w: prev.w + 0.15 * (raw.w - prev.w), h: prev.h + 0.15 * (raw.h - prev.h)};
    out.push(s);
    prev = s;
  }
  return out;
};

// Encuadre de un plano en su progreso p (0-1): push-in 1.00→1.10 o abierto con reencuadre lateral ±3%.
const encuadre = (pl: Plano, p: number) => {
  const e = EASE_ZOOM(Math.min(Math.max(p, 0), 1));
  return pl.tipo === 'push' ? {s: 1 + 0.1 * e, dx: 0} : {s: 1.06, dx: pl.dir * (-0.03 + 0.06 * e) * W};
};

export type Camara = {s: number; tx: number; ty: number; enPunch: boolean; cara: {x: number; y: number; w: number; h: number}};

// frame puede ser fraccionario (muestras del motion blur): nada se redondea.
export const camaraEn = (plan: Plan, planos: Plano[], pista: MuestraCara[], fps: number, frame: number): Camara => {
  const t = frame / fps;
  const i = Math.max(0, planos.findIndex((p) => t >= p.ini && t < p.fin));
  const pl = planos[i] ?? {ini: 0, fin: plan.duracion, tipo: 'push', dir: 1};
  const prog = (x: Plano, tt: number) => (tt - x.ini) / Math.max(x.fin - x.ini, 0.1);
  let {s, dx} = encuadre(pl, prog(pl, t));
  // punch: 9 frames de transición con bezier desde el final del plano anterior + golpe de escala de 3%
  const local = frame - pl.ini * fps;
  const enPunch = i > 0 && local < PUNCH;
  if (enPunch) {
    const a = encuadre(planos[i - 1], 1), k = EASE_ZOOM(local / PUNCH);
    s = a.s + (s - a.s) * k;
    dx = a.dx + (dx - a.dx) * k;
    s *= 1 + 0.03 * Math.sin(Math.PI * k);
  }
  // énfasis: zoom 1.18 que arranca 4 frames antes de la palabra
  for (const p of plan.piezas) {
    if (p.tipo !== 'enfasis') continue;
    const a = p.desde * fps - ANTICIPO, b = p.hasta * fps;
    if (frame < a || frame > b + BAJA) continue;
    const k = frame <= b
      ? interpolate(frame, [a, a + SUBE], [0, 1], {easing: EASE_ZOOM, extrapolateRight: 'clamp'})
      : interpolate(frame, [b, b + BAJA], [1, 0], {easing: EASE_ZOOM, extrapolateLeft: 'clamp'});
    s = s + (ZOOM_ENFASIS - s) * k;
    dx *= 1 - k;
  }
  // cara a (50%, 38%) con translate, limitado para que nunca se vean bordes
  const fi = Math.min(Math.max(Math.floor(frame), 0), pista.length - 1);
  const c = pista[fi] ?? CARA_FIJA;
  const px = c.x * W, py = c.y * H;
  const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const tx = lim(W * 0.5 - (W / 2 + s * (px - W / 2)) + dx, ((s - 1) * W) / 2);
  const ty = lim(H * 0.38 - (H / 2 + s * (py - H / 2)), ((s - 1) * H) / 2);
  const cx = W / 2 + s * (px - W / 2) + tx, cy = H / 2 + s * (py - H / 2) + ty;
  return {s, tx, ty, enPunch, cara: {x: cx, y: cy, w: c.w * W * s, h: c.h * H * s}};
};
