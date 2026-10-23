import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useMemo} from 'react';
import './fuentes';
import {NIVEL} from './audio';
import {camaraEn, pistaCara} from './camara';
import {Fondo} from './Fondo';
import {f, Pieza, Plan} from './plan';
import {cortesDeRitmo} from './ritmo';
import {SALIDA_FR} from './theme';
import {Gancho} from './piezas/Gancho';
import {Comparacion} from './piezas/Comparacion';
import {Pasos} from './piezas/Pasos';
import {Enfasis} from './piezas/Enfasis';
import {Subtitulos} from './piezas/Subtitulos';

// Salida común: fade + scale 0.97 en los últimos frames de cada pieza.
const Salida: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [dur - SALIDA_FR, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: k, transform: `scale(${0.97 + 0.03 * k}) translateY(${(1 - k) * -10}px)`}}>{children}</AbsoluteFill>;
};

// Transición de sección: brillo sutil en los bordes (sin tapar la cara), máx. 0.25, blend screen.
const Brillo: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 3, 8], [0, 0.25, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{mixBlendMode: 'screen', opacity: o, background: 'radial-gradient(ellipse 45% 30% at 50% 36%, rgba(255,255,255,0) 60%, rgba(255,255,255,1) 100%)'}} />;
};

const SFX: React.FC<{src: string; vol: number}> = ({src, vol}) => <Audio src={staticFile(`sfx/${src}.mp3`)} volume={vol} />;

export const Clip: React.FC<Plan> = (plan) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const pista = useMemo(() => pistaCara(plan, fps, durationInFrames), [plan, fps, durationInFrames]);
  const transiciones = plan.transiciones ?? [];
  // punch del whip: +4% en 8 frames en cada transición
  const punch = 1 + transiciones.reduce((a, s) => a + interpolate(frame - f(s, fps), [-2, 2, 8], [0, 0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), 0);
  const cam = camaraEn(plan, pista, fps, frame);
  const caraAbajo = cam.cara.y + cam.cara.h / 2, caraArriba = cam.cara.y - cam.cara.h / 2;
  const hayVoz = (s: number) => plan.subtitulos.some((p) => s >= p.desde - 0.15 && s < p.hasta + 0.15);
  const ocultarSubs = (s: number) => plan.piezas.some((p) => p.tipo !== 'enfasis' && s >= p.desde && s < p.hasta);

  const render = (p: Pieza) => {
    switch (p.tipo) {
      case 'gancho': return <Gancho texto={p.texto} />;
      case 'comparacion': return <Comparacion mal={p.mal} bien={p.bien} caraAbajo={caraAbajo} />;
      case 'pasos': return <Pasos titulo={p.titulo} pasos={p.pasos} caraAbajo={caraAbajo} inicios={p.pasos.map((_, i) => p.tiempos?.[i] !== undefined ? f(p.tiempos[i] - p.desde, fps) : 6 + i * 12)} />;
      case 'enfasis': return <Enfasis palabra={p.palabra} caraArriba={caraArriba} />;
    }
  };
  const sonidos = (p: Pieza) => {
    switch (p.tipo) {
      case 'gancho': return <SFX src="impact" vol={NIVEL.impact} />;
      case 'comparacion': return <><SFX src="pop" vol={NIVEL.pop} /><Sequence from={8}><SFX src="pop" vol={NIVEL.pop} /></Sequence></>;
      case 'pasos': return p.pasos.map((_, i) => <Sequence key={i} from={p.tiempos?.[i] !== undefined ? f(p.tiempos[i] - p.desde, fps) : 6 + i * 12}><SFX src="tick" vol={NIVEL.tick} /></Sequence>);
      case 'enfasis': return <SFX src="impact" vol={NIVEL.impact} />;
    }
  };

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Fondo video={plan.video} cam={cam} punch={punch} />
      {plan.musica && <Audio src={staticFile(plan.musica.archivo)} loop volume={(fr) => (hayVoz(fr / fps) ? NIVEL.musicaConVoz : NIVEL.musicaSinVoz)} />}
      {plan.piezas.map((p, i) => {
        // el énfasis arranca 4 frames antes, junto con el zoom
        const desde = Math.max(0, f(p.desde, fps) - (p.tipo === 'enfasis' ? 4 : 0));
        const dur = f(p.hasta, fps) - desde;
        return (
          <Sequence key={i} from={desde} durationInFrames={dur}>
            <Salida dur={dur}>{render(p)}</Salida>
            {sonidos(p)}
          </Sequence>
        );
      })}
      <Subtitulos palabras={plan.subtitulos} ocultar={ocultarSubs} />
      {transiciones.map((s, i) => (
        <Sequence key={`t${i}`} from={Math.max(0, f(s, fps) - 2)} durationInFrames={10}>
          <Brillo />
          <SFX src="whoosh" vol={NIVEL.whoosh} />
        </Sequence>
      ))}
      {cortesDeRitmo(plan).map((c, i) => (
        <Sequence key={`r${i}`} from={f(c, fps)} durationInFrames={10}><SFX src="whoosh" vol={NIVEL.whoosh * 0.5} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
