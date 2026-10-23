import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {acento, BRAND, C, textoPremium} from '../theme';

// Pieza 1: gancho. Palabra por palabra (stagger 3 frames), máx. 880 px incluso en el pico.
// Arranca 6 frames adelantado para que el frame 0 (miniatura) ya muestre texto.
export const Gancho: React.FC<{texto: string}> = ({texto}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{width: 880, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 22, rowGap: 6, marginTop: -120}}>
        {texto.split(' ').map((w, i) => {
          const s = acento(frame + 6 - i * 3, fps);
          const clave = w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3,}/.test(w);
          return (
            <span key={i} style={{...textoPremium(8), fontSize: BRAND.gancho.tam, textTransform: 'uppercase', color: clave ? C.amarillo : C.blanco, display: 'inline-block', opacity: interpolate(s, [0, 0.4], [0, 1], {extrapolateRight: 'clamp'}), transform: `translateY(${(1 - s) * 30}px) scale(${0.85 + 0.15 * s})`}}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
