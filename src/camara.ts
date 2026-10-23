import {interpolate} from 'remotion';
import {MuestraCara, Plan} from './plan';
import {cortesDeRitmo, cambiosDelPlan} from './ritmo';
import {EASE_ZOOM} from './theme';

const W = 1080, H = 1920;
const CARA_FIJA: MuestraCara = {t: 0, x: 0.5, y: 0.35, w: 0.37, h: 0.26};
const ZOOM_ENFASIS = 1.18, PUSH = 0.06;
const SUBE = 21, BAJA = 13, ANTICIPO = 4; // frames

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

// Escala: push-in continuo 1.00→1.06 por plano + énfasis 1.18 con bezier.
const escalaEn = (plan: Plan, fps: number, frame: number) => {
  const t = frame / fps;
  const cortes = [...cambiosDelPlan(plan), ...cortesDeRitmo(plan), ...(plan.transiciones ?? [])].sort((a, b) => a - b);
  const ini = cortes.filter((c) => c <= t).pop() ?? 0;
  const fin = cortes.find((c) => c > t) ?? plan.duracion;
  const push = 1 + PUSH * ((t - ini) / Math.max(fin - ini, 0.1));
  let k = 0;
  for (const p of plan.piezas) {
    if (p.tipo !== 'enfasis') continue;
    const a = Math.round(p.desde * fps) - ANTICIPO, b = Math.round(p.hasta * fps);
    if (frame < a || frame > b + BAJA) continue;
    k = frame <= b
      ? interpolate(frame, [a, a + SUBE], [0, 1], {easing: EASE_ZOOM, extrapolateRight: 'clamp'})
      : interpolate(frame, [b, b + BAJA], [1, 0], {easing: EASE_ZOOM, extrapolateLeft: 'clamp'});
  }
  return push + (ZOOM_ENFASIS - push) * k;
};

export type Camara = {s: number; tx: number; ty: number; cara: {x: number; y: number; w: number; h: number}};

// Centra la cara en (50%, 38%) con translate, limitado para que nunca se vean bordes.
export const camaraEn = (plan: Plan, pista: MuestraCara[], fps: number, frame: number): Camara => {
  const s = escalaEn(plan, fps, frame);
  const c = pista[Math.min(frame, pista.length - 1)] ?? CARA_FIJA;
  const px = c.x * W, py = c.y * H;
  const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));
  const tx = lim(W * 0.5 - (W / 2 + s * (px - W / 2)), ((s - 1) * W) / 2);
  const ty = lim(H * 0.38 - (H / 2 + s * (py - H / 2)), ((s - 1) * H) / 2);
  // caja de la cara en pantalla (px), para ubicar tarjetas y etiquetas
  const cx = W / 2 + s * (px - W / 2) + tx, cy = H / 2 + s * (py - H / 2) + ty;
  return {s, tx, ty, cara: {x: cx, y: cy, w: c.w * W * s, h: c.h * H * s}};
};
