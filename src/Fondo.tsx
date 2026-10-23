import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {camaraEn} from './camara';
import {Plano} from './linea';
import {MuestraCara, Plan} from './plan';

// Video de fondo (o placeholder): calcula su cámara con el frame actual (también en las muestras del motion blur).
export const Fondo: React.FC<{plan: Plan; planos: Plano[]; pista: MuestraCara[]}> = ({plan, planos, pista}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = camaraEn(plan, planos, pista, fps, frame);
  return (
    <AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
      {/* corrección de color: contraste +8%, saturación +10% */}
      <AbsoluteFill style={{transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`, filter: 'contrast(1.08) saturate(1.1)'}}>
        {plan.video ? <OffthreadVideo src={staticFile(plan.video)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Placeholder />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Viñeta suave + scrim del 40% inferior (fuera del motion blur).
export const Capas: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5))'}} />
  </AbsoluteFill>
);

// Sin video real: fondo animado + silueta (cara en x=50%, y=35%).
const Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(${frame / 4}deg, #1d2b64, #f8cdda)`}}>
      <div style={{position: 'absolute', left: 340, top: 422, width: 400, height: 500, borderRadius: '50%', background: '#e0ac69', boxShadow: 'inset 0 -30px 60px rgba(0,0,0,.3)'}} />
      <div style={{position: 'absolute', left: 190, top: 900, width: 700, height: 1100, borderRadius: '45% 45% 0 0', background: '#222'}} />
    </AbsoluteFill>
  );
};
