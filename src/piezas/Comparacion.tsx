import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FUENTE} from '../theme';

const Fila: React.FC<{ok: boolean; texto: string}> = ({ok, texto}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 10, stiffness: 200}});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 30, background: ok ? 'rgba(34,224,122,.18)' : 'rgba(255,59,59,.18)', border: `6px solid ${ok ? C.verde : C.rojo}`, borderRadius: 36, padding: '34px 40px', transform: `scale(${s})`, opacity: s}}>
      <Audio src={staticFile('sfx/pop.mp3')} volume={0.8} />
      <div style={{fontSize: 110, color: ok ? C.verde : C.rojo, fontFamily: FUENTE}}>{ok ? '✓' : '✗'}</div>
      <div style={{fontSize: 60, color: C.blanco, fontFamily: FUENTE, lineHeight: 1.1, textDecoration: ok ? 'none' : 'line-through', textDecorationColor: C.rojo}}>{texto}</div>
    </div>
  );
};

// Pieza 2: tarjeta ✗ vs ✓. La mitad buena entra 0.6s después.
export const Comparacion: React.FC<{mal: string; bien: string}> = ({mal, bien}) => (
  <AbsoluteFill style={{background: 'rgba(0,0,0,.55)', padding: '0 60px', justifyContent: 'center'}}>
    <div style={{display: 'flex', flexDirection: 'column', gap: 50, marginTop: -200}}>
      <Sequence layout="none"><Fila ok={false} texto={mal} /></Sequence>
      <Sequence from={18} layout="none"><Fila ok texto={bien} /></Sequence>
    </div>
  </AbsoluteFill>
);
