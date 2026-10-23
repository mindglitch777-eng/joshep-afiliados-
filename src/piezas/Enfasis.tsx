import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FUENTE} from '../theme';

// Pieza 4: palabra clave gigante (el zoom a la cara lo hace Fondo.tsx).
export const Enfasis: React.FC<{palabra: string}> = ({palabra}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 8, stiffness: 160}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: 260}}>
      <Audio src={staticFile('sfx/impact.mp3')} volume={0.6} />
      <div style={{fontFamily: FUENTE, fontSize: 150, color: C.negro, background: C.amarillo, padding: '10px 40px', borderRadius: 20, textTransform: 'uppercase', transform: `scale(${interpolate(s, [0, 1], [0.3, 1])}) rotate(${interpolate(s, [0, 1], [-12, -3])}deg)`, boxShadow: '0 14px 0 #000'}}>
        {palabra}
      </div>
    </AbsoluteFill>
  );
};
