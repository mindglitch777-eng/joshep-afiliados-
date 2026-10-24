import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {acento, BRAND, C, ENTRADA, FUENTE} from '../theme';
import {altoComparacion, ANCHO_TARJETA as ANCHO, rectBloque} from '../geometria';
import {Camara} from '../camara';

export const ANCHO_TARJETA = ANCHO;
export const tarjetaClara: React.CSSProperties = {background: 'rgba(255,255,255,0.96)', borderRadius: 30, boxShadow: '0 12px 40px rgba(0,0,0,.35)'};
const ALTO = 150, GAP = 24;

export const Insignia: React.FC<{ok: boolean}> = ({ok}) => (
  <div style={{minWidth: 64, height: 64, borderRadius: 32, background: ok ? C.verde : C.rojo, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <svg viewBox="0 0 100 100" width={34} height={34}><path d={ok ? 'M20 52 L42 74 L82 28' : 'M26 26 L74 74 M74 26 L26 74'} fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" /></svg>
  </div>
);

const Tarjeta: React.FC<{ok: boolean; texto: string; frame: number}> = ({ok, texto, frame}) => {
  const {fps} = useVideoConfig();
  const s = ok ? acento(frame, fps) : ENTRADA(frame, fps);
  const tachado = interpolate(frame, [14, 24], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{...tarjetaClara, minHeight: ALTO, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 26, padding: '18px 36px', opacity: Math.min(1, s * 1.5), transform: ok ? `translateX(${(1 - s) * 60}px) scale(${0.92 + 0.08 * s})` : `translateX(${(1 - s) * -60}px)`}}>
      <Insignia ok={ok} />
      <div style={{position: 'relative'}}>
        <span style={{fontFamily: FUENTE, fontWeight: 800, fontSize: BRAND.tarjetas.texto, lineHeight: 1.1, letterSpacing: '-0.01em', color: ok ? C.negro : 'rgba(11,11,15,0.6)'}}>{texto}</span>
        {!ok && <div style={{position: 'absolute', left: 0, top: '50%', height: 6, borderRadius: 3, background: C.rojo, width: `${tachado * 100}%`}} />}
      </div>
    </div>
  );
};

// Pieza 2: ✗ vs ✓ claras, debajo de la cara (top = borde inferior de la cara + 40 px).
export const Comparacion: React.FC<{mal: string; bien: string; caras: Camara['cara'][]}> = ({mal, bien, caras}) => {
  // el lugar se decide con la cara del primer cuadro de la pieza (no salta)
  const frame = useCurrentFrame();
  const r = rectBloque(caras, altoComparacion);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: r.x0, width: ANCHO_TARJETA, top: r.y0, display: 'flex', flexDirection: 'column', gap: GAP, transform: `scale(${r.k})`, transformOrigin: 'top left'}}>
        <Tarjeta ok={false} texto={mal} frame={frame} />
        <Tarjeta ok texto={bien} frame={frame - 8} />
      </div>
    </AbsoluteFill>
  );
};
