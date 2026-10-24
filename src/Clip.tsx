import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CameraMotionBlur} from '@remotion/motion-blur';
import {useMemo} from 'react';
import './fuentes';
import {camaraEn, pistaCara} from './camara';
import {Capas, Fondo} from './Fondo';
import {linea} from './linea';
import {f, Pieza, Plan} from './plan';
import {MUSICA} from './sfx-map';
import {C, SALIDA_FR, SEGURA} from './theme';
import {Gancho} from './piezas/Gancho';
import {Comparacion} from './piezas/Comparacion';
import {Pasos} from './piezas/Pasos';
import {Enfasis} from './piezas/Enfasis';
import {Sticker} from './piezas/Iconos';
import hookCfg from '../config/hook.json';
import {layoutDelPlan} from './gancho-layout';
import {fraseOculta} from './subs-layout';
import {rectSticker} from './geometria';
import {Subtitulos} from './piezas/Subtitulos';


// Salida común: fade + scale 0.97 en los últimos frames de cada pieza.
const Salida: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [dur - SALIDA_FR, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: k, transform: `scale(${0.97 + 0.03 * k}) translateY(${(1 - k) * -10}px)`}}>{children}</AbsoluteFill>;
};

// Barra de progreso fina arriba, por encima de la zona segura.
const Progreso: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  return (
    <div style={{position: 'absolute', left: SEGURA.izq, right: SEGURA.izq, top: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)'}}>
      <div style={{width: `${(frame / (durationInFrames - 1)) * 100}%`, height: '100%', borderRadius: 2, background: C.amarillo}} />
    </div>
  );
};

const aplicarVariante = (p: Plan): Plan => {
  const v = p.ganchoVariante && p.ganchos?.find((x) => x.formula === p.ganchoVariante);
  if (!v) return p;
  return {...p, piezas: p.piezas.map((x) => (x.tipo === 'gancho' ? {...x, texto: v.texto, clave: v.clave, variante: v.formula} : x))};
};

export const Clip: React.FC<Plan> = (planIn) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  // variante del gancho forzada (previews A/B/C)
  const plan = useMemo(() => aplicarVariante(planIn), [planIn]);
  const pista = useMemo(() => pistaCara(plan, fps, durationInFrames), [plan, fps, durationInFrames]);
  const lin = useMemo(() => linea(plan, fps), [plan, fps]);
  // gancho sobre la frente: se mide la y más alta de los ojos durante el gancho (sin bajada) y se ajusta el texto
  const lay = useMemo(() => layoutDelPlan(plan, lin.planos, pista, fps), [plan, lin, pista, fps]);
  const bajada = lay?.bajada ?? 0;
  const cam = camaraEn(plan, lin.planos, pista, fps, frame, bajada);
  const caraArriba = cam.cara.y - cam.cara.h / 2;
  const hayVoz = (s: number) => plan.subtitulos.some((p) => s >= p.desde - 0.15 && s < p.hasta + 0.15);
  const enfasisEn = (t: number) => plan.piezas.find((p) => p.tipo === 'enfasis' && t >= p.desde - 4 / fps && t < p.hasta);
  const ocultarSubs = (t: number, fr: {ini: number; palabras: {texto: string}[]}) => fraseOculta(plan, fps, t, fr);

  const render = (p: Pieza) => {
    switch (p.tipo) {
      case 'gancho': return lay ? <Gancho lay={lay} /> : null;
      case 'comparacion': return <Comparacion mal={p.mal} bien={p.bien} cara={cam.cara} />;
      case 'pasos': return <Pasos titulo={p.titulo} pasos={p.pasos} cara={cam.cara} inicios={p.pasos.map((_, i) => ((p.tiempos?.[i] ?? p.desde + 0.3 + i * 0.5) - p.desde) * fps)} />;
      case 'enfasis': return <Enfasis palabra={p.palabra} caraArriba={caraArriba} />;
    }
  };
  const fondo = <Fondo plan={plan} planos={lin.planos} pista={pista} bajada={bajada} />;
  const I = hookCfg.interrupcion;
  const iconos = lin.eventos.filter((e) => e.tipo === 'ícono');

  return (
    <AbsoluteFill style={{background: '#000'}}>
      {/* motion blur solo durante los punch de cambio de plano */}
      {cam.enPunch ? <CameraMotionBlur samples={4} shutterAngle={180}>{fondo}</CameraMotionBlur> : fondo}
      <Capas />
      {/* voz: pista aparte (el video del fondo va muteado porque el motion blur lo duplica) */}
      {plan.video && <Audio src={staticFile(plan.video)} />}
      {plan.musica && <Audio src={staticFile(plan.musica.archivo)} loop volume={(fr) => (hayVoz(fr / fps) ? MUSICA.conVoz : MUSICA.sinVoz)} />}
      {plan.piezas.map((p, i) => {
        // el énfasis arranca 4 frames antes, junto con el zoom
        const desde = Math.max(0, f(p.desde, fps) - (p.tipo === 'enfasis' ? 4 : 0));
        const dur = f(p.hasta, fps) - desde;
        return <Sequence key={i} from={desde} durationInFrames={dur}><Salida dur={dur}>{render(p)}</Salida></Sequence>;
      })}
      {iconos.map((e, i) => {
        const dur = Math.round(1.4 * fps);
        const r = rectSticker(cam.cara, i % 2 ? -1 : 1);
        if (!r) return null; // no entra fuera de la cara: no se muestra
        return <Sequence key={`i${i}`} from={f(e.t, fps)} durationInFrames={dur}><Salida dur={dur}><Sticker icono={e.desc} lado={i % 2 ? -1 : 1} r={r} /></Salida></Sequence>;
      })}
      <Subtitulos palabras={plan.subtitulos} ocultar={ocultarSubs} />
      {/* interrupción de patrón: destello blanco de 2 frames al 12% (configurable) */}
      {I.destello && frame < I.destello_frames && <AbsoluteFill style={{background: '#fff', opacity: I.destello_opacidad}} />}
      <Progreso />
      {lin.sonidos.map((s, i) => {
        const dur = Math.max(1, Math.round(s.dur * fps));
        // recortados: fade de 3 frames al final para que no hagan click
        const vol = (x: number) => (s.recortado ? s.vol * interpolate(x, [dur - 3, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : s.vol);
        return <Sequence key={`s${i}`} from={f(s.t, fps)} durationInFrames={dur}><Audio src={staticFile(`sfx/${s.sfx}.mp3`)} volume={vol} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
