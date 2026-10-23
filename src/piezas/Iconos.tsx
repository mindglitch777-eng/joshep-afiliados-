import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {acento, C, SEGURA} from '../theme';

// Biblioteca de íconos propios (CC0, dibujados para este repo). viewBox 0 0 100 100.
const k = {fill: 'none', stroke: C.negro, strokeWidth: 7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
export const ICONOS: Record<string, React.ReactNode> = {
  ojo: <><path d="M10 50 Q50 15 90 50 Q50 85 10 50Z" {...k} /><circle cx="50" cy="50" r="12" fill={C.negro} /></>,
  corazon: <path d="M50 82 L18 50 A16 16 0 0 1 50 26 A16 16 0 0 1 82 50 Z" fill="#FF3B4E" stroke={C.negro} strokeWidth={6} strokeLinejoin="round" />,
  fuego: <path d="M50 88 C28 88 20 70 26 54 C30 44 38 40 38 26 C50 34 52 44 52 50 C56 44 60 40 60 32 C74 44 80 58 74 72 C70 82 62 88 50 88Z" fill="#FF8A00" stroke={C.negro} strokeWidth={6} strokeLinejoin="round" />,
  rayo: <path d="M56 10 L24 56 H48 L42 90 L76 42 H52 Z" fill={C.amarillo} stroke={C.negro} strokeWidth={6} strokeLinejoin="round" />,
  estrella: <path d="M50 10 L61 38 L91 39 L67 57 L76 87 L50 70 L24 87 L33 57 L9 39 L39 38 Z" fill={C.amarillo} stroke={C.negro} strokeWidth={6} strokeLinejoin="round" />,
  sonrisa: <><circle cx="50" cy="50" r="38" {...k} /><circle cx="37" cy="42" r="5" fill={C.negro} /><circle cx="63" cy="42" r="5" fill={C.negro} /><path d="M33 60 Q50 76 67 60" {...k} /></>,
  reloj: <><circle cx="50" cy="52" r="36" {...k} /><path d="M50 32 V52 L64 62" {...k} /></>,
  chat: <><path d="M14 22 H86 V66 H44 L26 82 V66 H14 Z" {...k} /><circle cx="36" cy="44" r="4" fill={C.negro} /><circle cx="50" cy="44" r="4" fill={C.negro} /><circle cx="64" cy="44" r="4" fill={C.negro} /></>,
  candado: <><rect x="22" y="44" width="56" height="42" rx="8" {...k} /><path d="M34 44 V32 A16 16 0 0 1 66 32 V44" {...k} /></>,
  trofeo: <><path d="M30 14 H70 V40 A20 20 0 0 1 30 40 Z" fill={C.amarillo} stroke={C.negro} strokeWidth={6} /><path d="M30 22 H16 A14 14 0 0 0 30 46 M70 22 H84 A14 14 0 0 1 70 46 M50 60 V74 M34 86 H66" {...k} /></>,
};

// Sticker con pop al lado de la cara (alterna lado), ~160 px, sin taparla.
export const Sticker: React.FC<{icono: string; lado: 1 | -1; cara: {x: number; y: number; w: number; h: number}}> = ({icono, lado, cara}) => {
  const frame = useCurrentFrame();
  const s = acento(frame, useVideoConfig().fps);
  const T = 160;
  const x = Math.min(Math.max(cara.x + lado * (cara.w / 2 + 20 + T / 2), SEGURA.izq + T / 2), 1080 - SEGURA.der - T / 2);
  const y = Math.max(cara.y - cara.h * 0.3, SEGURA.arriba + T / 2);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: x - T / 2, top: y - T / 2, width: T, height: T, borderRadius: T / 2, background: 'rgba(255,255,255,0.96)', boxShadow: '0 12px 40px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(s, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}), transform: `scale(${s}) rotate(${lado * -8 * (1 - s) + lado * 6}deg)`}}>
        <svg viewBox="0 0 100 100" width={T * 0.66} height={T * 0.66}>{ICONOS[icono] ?? ICONOS.estrella}</svg>
      </div>
    </AbsoluteFill>
  );
};
