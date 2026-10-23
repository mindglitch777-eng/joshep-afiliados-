import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FUENTE, sombra} from '../theme';

// Pieza 1: gancho de apertura. Texto gigante que entra con golpe + impacto.
export const Gancho: React.FC<{texto: string}> = ({texto}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 9, stiffness: 180}});
  const shake = frame < 8 ? Math.sin(frame * 3) * (8 - frame) * 2 : 0;
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: `rgba(0,0,0,${interpolate(frame, [0, 6], [0.55, 0.35], {extrapolateRight: 'clamp'})})`}}>
      <Audio src={staticFile('sfx/impact.mp3')} volume={0.9} />
      <div style={{fontFamily: FUENTE, fontSize: 118, lineHeight: 1.05, color: C.blanco, textAlign: 'center', padding: '0 70px', textTransform: 'uppercase', textShadow: sombra, transform: `scale(${interpolate(s, [0, 1], [2.2, 1])}) translateX(${shake}px)`, opacity: s}}>
        {texto.split(' ').map((w, i) => (
          <span key={i} style={{color: i % 3 === 1 ? C.amarillo : C.blanco}}>{w} </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
