import {AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FUENTE, sombra} from '../theme';

const Paso: React.FC<{n: number; texto: string}> = ({n, texto}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12}});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 28, transform: `translateX(${interpolate(s, [0, 1], [-900, 0])}px)`}}>
      <Audio src={staticFile('sfx/tick.mp3')} volume={0.7} />
      <div style={{minWidth: 100, height: 100, borderRadius: 50, background: C.amarillo, color: C.negro, fontFamily: FUENTE, fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{n}</div>
      <div style={{fontFamily: FUENTE, fontSize: 62, color: C.blanco, textShadow: sombra, lineHeight: 1.1}}>{texto}</div>
    </div>
  );
};

// Pieza 3: lista de pasos que aparecen de a uno, repartidos en la duración.
export const Pasos: React.FC<{titulo?: string; pasos: string[]; dur: number}> = ({titulo, pasos, dur}) => {
  const gap = Math.max(12, Math.floor((dur - 20) / pasos.length));
  return (
    <AbsoluteFill style={{background: 'rgba(0,0,0,.6)', padding: '0 70px', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 46, marginTop: -200}}>
        {titulo && <div style={{fontFamily: FUENTE, fontSize: 76, color: C.amarillo, textShadow: sombra, textTransform: 'uppercase'}}>{titulo}</div>}
        {pasos.map((p, i) => (
          <Sequence key={i} from={8 + i * gap} layout="none"><Paso n={i + 1} texto={p} /></Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
