import {interpolate} from 'remotion';
import brand from '../config/brand.json';
import hookCfg from '../config/hook.json';
import {Plano} from './linea';
import {MuestraCara, Plan} from './plan';
import {EASE_ZOOM} from './theme';

const W = 1080, H = 1920;
const CARA_FIJA: MuestraCara = {t: 0, x: 0.5, y: 0.35, w: 0.37, h: 0.26};
const ZOOM_ENFASIS = brand.enfasis.zoom;
const SUBE = 21, BAJA = 13, ANTICIPO = 4; // frames
export const PUNCH = 9; // frames de cada cambio de plano

const NUM = ['x', 'y', 'w', 'h', 'frente', 'ojos', 'boca', 'menton', 'ear', 'mirada'] as const;
const mezclarCara = (a: MuestraCara, b: MuestraCara, k: number, t: number): MuestraCara => {
  const o: MuestraCara = {...a, t};
  for (const n of NUM) if (a[n] !== undefined && b[n] !== undefined) o[n] = a[n]! + (b[n]! - a[n]!) * k;
  return o;
};
const suavizar = (prev: MuestraCara, raw: MuestraCara, t: number) => mezclarCara(prev, raw, 0.15, t);

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
        raw = mezclarCara(a, b, k, t);
      }
    }
    const s = i === 0 ? raw : suavizar(prev, raw, t);
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

export type Rasgos = {frente: number; ojos: number; boca: number; menton: number};
export type Camara = {s: number; tx: number; ty: number; enPunch: boolean; dispW: number; dispH: number; bajada: number; subida: number; cara: {x: number; y: number; w: number; h: number} & Rasgos};

const HC = hookCfg;
// Borde superior del peor subtítulo (2 líneas con palabra clave): el mentón tiene que quedar ≥ 24 px arriba.
export const TOPE_SUBS = HC.subtitulos.borde_inferior - 2 * brand.subtitulos.tam * brand.subtitulos.clave * 1.2;

// Tamaño en pantalla del video a escala 1: cover (llena 9:16) o contain (modo desenfocado).
export const tamVideo = (plan: Plan) => {
  const v = plan.videoInfo ?? {ancho: W, alto: H};
  const k = plan.encuadre === 'desenfocado' && v.ancho > v.alto ? Math.min(W / v.ancho, H / v.alto) : Math.max(W / v.ancho, H / v.alto);
  return {dispW: v.ancho * k, dispH: v.alto * k};
};

// frame puede ser fraccionario (muestras del motion blur): nada se redondea.
export const camaraEn = (plan: Plan, planos: Plano[], pista: MuestraCara[], fps: number, frame: number, bajadaGancho = 0): Camara => {
  const t = frame / fps;
  const i = Math.max(0, planos.findIndex((p) => t >= p.ini && t < p.fin));
  const pl = planos[i] ?? {ini: 0, fin: plan.duracion, tipo: 'push', dir: 1};
  const prog = (x: Plano, tt: number) => (tt - x.ini) / Math.max(x.fin - x.ini, 0.1);
  let {s, dx} = encuadre(pl, prog(pl, t));
  // interrupción de patrón: en el primer plano, punch-in 1.0→1.10 con ease-out en 0.25 s y se sostiene
  if (i === 0) {
    s = 1 + (HC.interrupcion.punch_hasta - 1) * EASE_ZOOM(Math.min(t / HC.interrupcion.punch_segundos, 1));
    dx = 0;
  }
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
  // con tarjeta o lista en pantalla la cámara abre (zoom → 1.0 en 9 frames) para dejarles lugar sin tapar la cara
  for (const p of plan.piezas) {
    if (p.tipo !== 'comparacion' && p.tipo !== 'pasos') continue;
    const a = p.desde * fps - PUNCH, b = p.hasta * fps;
    const k = interpolate(frame, [a, a + PUNCH, b, b + PUNCH], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ZOOM});
    s = s + (1 - s) * k;
    dx *= 1 - k;
  }
  // jump cuts: micro-zoom alternado de 4% en cada corte de silencio
  const nCortes = (plan.cortes ?? []).filter((c) => c <= t).length;
  if (nCortes % 2) s *= 1.04;
  // cara a (50%, 38%) con translate, limitado para que nunca se vean bordes
  const fi = Math.min(Math.max(Math.floor(frame), 0), pista.length - 1);
  const c = pista[fi] ?? CARA_FIJA;
  const {dispW, dispH} = tamVideo(plan);
  const px = (W - dispW) / 2 + c.x * dispW, py = (H - dispH) / 2 + c.y * dispH;
  const aY = (v: number) => (H - dispH) / 2 + v * dispH; // y normalizada → px a escala 1
  const ojos = aY(c.ojos ?? c.y - c.h * 0.12), menton = aY(c.menton ?? c.y + c.h / 2);
  // manda el subtítulo: el zoom no puede bajar el mentón a menos de 24 px del subtítulo (ojos anclados al 28%)
  const ojosY = H * HC.camara.ojos_y;
  const sMax = (TOPE_SUBS - HC.subtitulos.aire_menton - ojosY) / Math.max(menton - ojos, 1);
  s = Math.max(1, Math.min(s, sMax));
  // límite: el video escalado siempre cubre el cuadro (en modo desenfocado no se recentra)
  const lim = (v: number, m: number) => Math.max(-Math.max(m, 0), Math.min(Math.max(m, 0), v));
  const seguir = plan.encuadre !== 'desenfocado' ? 1 : 0;
  const tx = lim(seguir * (W * 0.5 - (W / 2 + s * (px - W / 2))) + dx, (s * dispW - W) / 2);
  // bajada del video durante el gancho si el texto no entra sobre los ojos (vuelve en 9 frames al terminar)
  const finG = (plan.piezas.find((p) => p.tipo === 'gancho')?.hasta ?? 0) * fps;
  const bajada = bajadaGancho * interpolate(frame, [finG, finG + PUNCH], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ZOOM});
  let ty = lim(seguir * (ojosY - (H / 2 + s * (ojos - H / 2))), (s * dispH - H) / 2) + bajada;
  // si ni con zoom 1 el mentón queda a 24 px del subtítulo, el video sube (hasta 8%, abajo va relleno degradado)
  const mentonPx = H / 2 + s * (menton - H / 2) + ty, tope = TOPE_SUBS - HC.subtitulos.aire_menton;
  const subida = seguir ? Math.min(Math.max(0, mentonPx - tope), HC.camara.subir_video_max * H) : 0;
  ty -= subida;
  const sy = (v: number) => H / 2 + s * (v - H / 2) + ty;
  const cx = W / 2 + s * (px - W / 2) + tx, cy = sy(py);
  return {s, tx, ty, enPunch, dispW, dispH, bajada, subida, cara: {x: cx, y: cy, w: c.w * dispW * s, h: c.h * dispH * s,
    frente: sy(aY(c.frente ?? c.y - c.h / 2)), ojos: sy(ojos), boca: sy(aY(c.boca ?? c.y + c.h * 0.25)), menton: sy(menton)}};
};
