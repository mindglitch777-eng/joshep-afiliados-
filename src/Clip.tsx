import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {f, Plan} from './plan';
import {Fondo} from './Fondo';
import {cortesDeRitmo} from './ritmo';
import {Gancho} from './piezas/Gancho';
import {Comparacion} from './piezas/Comparacion';
import {Pasos} from './piezas/Pasos';
import {Enfasis} from './piezas/Enfasis';
import {Subtitulos} from './piezas/Subtitulos';

// Transición: barrido blanco de 6 frames + whoosh.
const Barrido: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 6], [-110, 110]);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <Audio src={staticFile('sfx/whoosh.mp3')} volume={0.5} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)', transform: `translateX(${x}%) skewX(-15deg)`}} />
    </AbsoluteFill>
  );
};

export const Clip: React.FC<Plan> = (plan) => {
  const ocultarSubs = (t: number) => plan.piezas.some((p) => p.tipo !== 'enfasis' && t >= p.desde && t < p.hasta);
  return (
    <AbsoluteFill style={{background: '#000', fontWeight: 900}}>
      <Fondo plan={plan} />
      {plan.musica && <Audio src={staticFile(plan.musica.archivo)} volume={plan.musica.volumen} loop />}
      {plan.piezas.map((p, i) => {
        const dur = f(p.hasta) - f(p.desde);
        return (
          <Sequence key={i} from={f(p.desde)} durationInFrames={dur}>
            {p.tipo === 'gancho' && <Gancho texto={p.texto} />}
            {p.tipo === 'comparacion' && <Comparacion mal={p.mal} bien={p.bien} />}
            {p.tipo === 'pasos' && <Pasos titulo={p.titulo} pasos={p.pasos} dur={dur} />}
            {p.tipo === 'enfasis' && <Enfasis palabra={p.palabra} />}
          </Sequence>
        );
      })}
      <SubsCondicionales plan={plan} ocultar={ocultarSubs} />
      {plan.piezas.filter((p) => p.desde > 0).map((p, i) => (
        <Sequence key={`t${i}`} from={f(p.desde) - 3} durationInFrames={8}><Barrido /></Sequence>
      ))}
      {cortesDeRitmo(plan).map((c, i) => (
        <Sequence key={`r${i}`} from={f(c)} durationInFrames={6}><Audio src={staticFile('sfx/whoosh.mp3')} volume={0.2} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SubsCondicionales: React.FC<{plan: Plan; ocultar: (t: number) => boolean}> = ({plan, ocultar}) => {
  const t = useCurrentFrame() / 30;
  return ocultar(t) ? null : <Subtitulos palabras={plan.subtitulos} />;
};
