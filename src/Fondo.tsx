import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {camaraEn} from './camara';
import {encuadreDe} from './estilos';
import flashCfg from '../config/flash.json';
import {Plano} from './linea';
import {MuestraCara, Plan} from './plan';

// Video de fondo (o placeholder): calcula su cámara con el frame actual (también en las muestras del motion blur).
// rampa del flash en este cuadro (0 = sin flash) y filtro de color correspondiente (video y persona recortada iguales)
export const rampaFlash = (flashes: number[], frame: number, fps: number) => flashes.reduce((m, t0) => {
  const k = Math.floor(frame - t0 * fps);
  return k >= 0 && k < flashCfg.frames ? Math.max(m, flashCfg.rampa[k]) : m;
}, 0);
export const filtroFlash = (r: number) => `contrast(1.08) saturate(${(1.1 * (1 - (1 - flashCfg.saturacion) * r)).toFixed(3)}) brightness(${(1 + (flashCfg.brillo - 1) * r).toFixed(3)})`;

export const Fondo: React.FC<{plan: Plan; planos: Plano[]; pista: MuestraCara[]; bajada: number; lin: {pulsos: number[]; flashes: number[]}}> = ({plan, planos, pista, bajada, lin}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = camaraEn(plan, planos, pista, fps, frame, bajada, lin);
  // flash de exposición sobre el video (no overlay): brillo 1.45 / saturación 0.85 con rampa 100→70→35→0%
  const F = flashCfg;
  const r = rampaFlash(lin.flashes, frame, fps);
  const color = filtroFlash(r);
  const enc = encuadreDe(plan);
  return (
    <AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
      {/* corrección de color: contraste +8%, saturación +10% */}
      {plan.video && (enc === 'desenfocado' || enc === 'capas') && (
        <AbsoluteFill style={{filter: `blur(40px) brightness(${0.55 * (1 + (F.brillo - 1) * r)}) saturate(1.2)`, transform: 'scale(1.15)'}}>
          <OffthreadVideo src={staticFile(plan.video)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, filter: color}}>
        {plan.video ? (
          <OffthreadVideo src={staticFile(plan.video)} muted style={{position: 'absolute', left: (1080 - cam.dispW) / 2, top: (1920 - cam.dispH) / 2, width: cam.dispW, height: cam.dispH, borderRadius: enc === 'capas' ? 36 : 0, boxShadow: enc === 'capas' ? '0 24px 60px rgba(0,0,0,0.5)' : 'none'}} />
        ) : <Placeholder />}
      </AbsoluteFill>
      {/* rellenos degradados cuando el video sube (subtítulos/tarjetas) o baja (gancho): después del video, sin zIndex */}
      {cam.subida > 0 && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: cam.subida + 220, background: 'linear-gradient(rgba(11,11,15,0) 0px, rgba(11,11,15,0.85) 160px, #0B0B0F 220px)'}} />}
      {cam.bajada > 0 && <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: cam.bajada + 120, background: 'linear-gradient(#0B0B0F, #2a2a33 60%, rgba(0,0,0,0))'}} />}
    </AbsoluteFill>
  );
};

// Viñeta suave + scrim del 40% inferior (fuera del motion blur).
export const Capas: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5))'}} />
  </AbsoluteFill>
);

// Sin video real: fondo animado + silueta (cara en x=50%, y=35%).
const Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(${frame / 4}deg, #1d2b64, #f8cdda)`}}>
      <div style={{position: 'absolute', left: 340, top: 422, width: 400, height: 500, borderRadius: '50%', background: '#e0ac69', boxShadow: 'inset 0 -30px 60px rgba(0,0,0,.3)'}} />
      <div style={{position: 'absolute', left: 190, top: 900, width: 700, height: 1100, borderRadius: '45% 45% 0 0', background: '#222'}} />
    </AbsoluteFill>
  );
};

// Persona recortada (segmentación) encima del gancho: misma cámara que el video, así calza exacto.
export const RecortePersona: React.FC<{plan: Plan; planos: Plano[]; pista: MuestraCara[]; bajada: number; lin: {pulsos: number[]; flashes: number[]}}> = ({plan, planos, pista, bajada, lin}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const R = plan.recorte;
  if (!R || !R.n || frame >= R.hasta * fps) return null;
  const cam = camaraEn(plan, planos, pista, fps, frame, bajada, lin);
  const i = Math.min(R.n - 1, Math.floor((frame / fps) * (R.fps ?? 30)));
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, filter: filtroFlash(rampaFlash(lin.flashes, frame, fps))}}>
        <Img src={staticFile(`${R.carpeta}/${String(i).padStart(4, '0')}.png`)} style={{position: 'absolute', left: (1080 - cam.dispW) / 2, top: (1920 - cam.dispH) / 2, width: cam.dispW, height: cam.dispH}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
