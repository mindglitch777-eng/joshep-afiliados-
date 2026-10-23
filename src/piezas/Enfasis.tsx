import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FUENTE, SEGURA} from '../theme';

// Pieza 4: etiqueta amarilla sólida con "stamp" (1.15→1.0) sobre la frente, máx. 900 px.
export const Enfasis: React.FC<{palabra: string; caraArriba: number}> = ({palabra, caraArriba}) => {
  const frame = useCurrentFrame();
  const k = spring({frame, fps: useVideoConfig().fps, config: {damping: 200}, durationInFrames: 8});
  const top = Math.max(SEGURA.arriba, caraArriba - 30);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center'}}>
        <div style={{maxWidth: 900 / 1.15, boxSizing: 'border-box', fontFamily: FUENTE, fontWeight: 900, fontSize: 104, letterSpacing: '-0.01em', lineHeight: 1.05, color: C.negro, background: C.amarillo, padding: '14px 40px', borderRadius: 22, textTransform: 'uppercase', boxShadow: '0 12px 40px rgba(0,0,0,.35)', opacity: interpolate(k, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'}), transform: `scale(${1.15 - 0.15 * k}) rotate(-3deg)`}}>
          {palabra}
        </div>
      </div>
    </AbsoluteFill>
  );
};
