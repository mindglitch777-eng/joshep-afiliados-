import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND, C, ENTRADA, FUENTE, SEGURA} from '../theme';
import {ANCHO_TARJETA, tarjetaClara} from './Comparacion';

// Pieza 3: lista en tarjeta clara debajo de la cara; cada ítem entra cuando se dice.
export const Pasos: React.FC<{titulo?: string; pasos: string[]; inicios: number[]; caraAbajo: number}> = ({titulo, pasos, inicios, caraAbajo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const alto = 64 + (titulo ? 100 : 0) + pasos.length * 84;
  const top = Math.min(caraAbajo + 40, 1920 - SEGURA.abajo - alto);
  const caja = ENTRADA(frame, fps);
  return (
    <AbsoluteFill>
      <div style={{...tarjetaClara, position: 'absolute', left: (1080 - ANCHO_TARJETA) / 2, width: ANCHO_TARJETA, top, boxSizing: 'border-box', padding: '32px 44px', opacity: caja, transform: `translateY(${(1 - caja) * 20}px)`}}>
        {titulo && <div style={{fontFamily: FUENTE, fontWeight: 900, fontSize: BRAND.lista.titulo, lineHeight: 1.05, letterSpacing: '-0.01em', color: C.negro, textTransform: 'uppercase', marginBottom: 28}}>{titulo}</div>}
        {pasos.map((p, i) => {
          const s = ENTRADA(frame - inicios[i], fps);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', height: 84, opacity: s, transform: `translateX(${(1 - s) * -40}px)`}}>
              <div style={{width: 72, flexShrink: 0}}>
                <div style={{width: 52, height: 52, borderRadius: 26, background: C.amarillo, fontFamily: FUENTE, fontWeight: 900, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.negro}}>{i + 1}</div>
              </div>
              <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: BRAND.lista.texto, letterSpacing: '-0.01em', color: C.negro, whiteSpace: 'nowrap'}}>{p}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
