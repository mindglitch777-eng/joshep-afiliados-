import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {acento, ANCHO_UTIL, C, ENTRADA, SEGURA, textoPremium} from '../theme';

const ALTO = 150, GAP = 24;

const Tarjeta: React.FC<{ok: boolean; texto: string; frame: number}> = ({ok, texto, frame}) => {
  const {fps} = useVideoConfig();
  const s = ok ? acento(frame, fps) : ENTRADA(frame, fps);
  const tachado = interpolate(frame, [10, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{height: ALTO, display: 'flex', alignItems: 'center', gap: 26, padding: '0 34px', background: C.vidrio, borderRadius: 28, border: '1.5px solid rgba(255,255,255,0.10)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', opacity: Math.min(1, s * 1.5), transform: ok ? `translateX(${(1 - s) * 60}px) scale(${0.92 + 0.08 * s})` : `translateX(${(1 - s) * -60}px)`}}>
      <div style={{minWidth: 64, height: 64, borderRadius: 32, background: ok ? C.verde : C.rojo, color: C.negro, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{ok ? '✓' : '✕'}</div>
      <div style={{position: 'relative'}}>
        <span style={{...textoPremium(0), fontSize: 46, textShadow: 'none', color: ok ? C.blanco : 'rgba(255,255,255,0.75)'}}>{texto}</span>
        {!ok && <div style={{position: 'absolute', left: 0, top: '52%', height: 5, borderRadius: 3, background: C.rojo, width: `${tachado * 100}%`}} />}
      </div>
    </div>
  );
};

// Pieza 2: ✗ vs ✓ debajo de la cara (top = borde inferior de la cara + 40 px).
export const Comparacion: React.FC<{mal: string; bien: string; caraAbajo: number}> = ({mal, bien, caraAbajo}) => {
  const frame = useCurrentFrame();
  const top = Math.min(caraAbajo + 40, 1920 - SEGURA.abajo - (ALTO * 2 + GAP));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: SEGURA.izq, width: ANCHO_UTIL, top, display: 'flex', flexDirection: 'column', gap: GAP}}>
        <Tarjeta ok={false} texto={mal} frame={frame} />
        <Tarjeta ok texto={bien} frame={frame - 8} />
      </div>
    </AbsoluteFill>
  );
};
