import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {acento, C, FUENTE, SEGURA} from '../theme';

// Pieza 4: etiqueta sobre la frente (sin tapar los ojos), máx. 900 px en el pico.
export const Enfasis: React.FC<{palabra: string; caraArriba: number}> = ({palabra, caraArriba}) => {
  const frame = useCurrentFrame();
  const s = acento(frame, useVideoConfig().fps);
  const top = Math.max(SEGURA.arriba, caraArriba - 30);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center'}}>
        <div style={{maxWidth: 900 / 1.04, boxSizing: 'border-box', fontFamily: FUENTE, fontWeight: 900, fontSize: 104, letterSpacing: '-0.01em', lineHeight: 1.05, color: C.negro, background: C.amarillo, padding: '14px 40px', borderRadius: 22, textTransform: 'uppercase', boxShadow: '0 16px 40px rgba(0,0,0,0.45)', opacity: Math.min(1, s * 2), transform: `scale(${0.6 + 0.4 * s}) rotate(-3deg)`}}>
          {palabra}
        </div>
      </div>
    </AbsoluteFill>
  );
};
