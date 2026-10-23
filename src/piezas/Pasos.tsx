import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ANCHO_UTIL, C, ENTRADA, SEGURA, textoPremium} from '../theme';

// Pieza 3: lista dentro de una tarjeta de vidrio debajo de la cara; cada ítem aparece cuando se dice.
export const Pasos: React.FC<{titulo?: string; pasos: string[]; inicios: number[]; caraAbajo: number}> = ({titulo, pasos, inicios, caraAbajo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const alto = 60 + (titulo ? 90 : 0) + pasos.length * 86;
  const top = Math.min(caraAbajo + 40, 1920 - SEGURA.abajo - alto);
  const caja = ENTRADA(frame, fps);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: SEGURA.izq, width: ANCHO_UTIL, top, boxSizing: 'border-box', padding: '30px 40px', background: C.vidrio, borderRadius: 32, border: '1.5px solid rgba(255,255,255,0.10)', boxShadow: '0 18px 40px rgba(0,0,0,0.45)', opacity: caja, transform: `translateY(${(1 - caja) * 20}px)`}}>
        {titulo && <div style={{...textoPremium(0), textShadow: 'none', fontSize: 64, color: C.amarillo, textTransform: 'uppercase', marginBottom: 26}}>{titulo}</div>}
        {pasos.map((p, i) => {
          const s = ENTRADA(frame - inicios[i], fps);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', height: 86, opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateX(${(1 - s) * -40}px)`}}>
              <div style={{width: 72, flexShrink: 0, ...textoPremium(0), textShadow: 'none', fontSize: 50, color: C.amarillo}}>{i + 1}.</div>
              <div style={{...textoPremium(0), textShadow: 'none', fontWeight: 800, fontSize: 50, color: C.blanco, whiteSpace: 'nowrap'}}>{p}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
