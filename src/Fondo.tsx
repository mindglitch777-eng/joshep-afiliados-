import {AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Plan} from './plan';
import {cortesDeRitmo} from './ritmo';

// Video de fondo (o placeholder) con zoom a la cara en énfasis y "punch-ins" de ritmo.
export const Fondo: React.FC<{plan: Plan}> = ({plan}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const enf = plan.piezas.find((p) => p.tipo === 'enfasis' && t >= p.desde && t < p.hasta);
  let escala = 1, ox = 50, oy = 35;
  if (enf && enf.tipo === 'enfasis') {
    const z = enf.zoom ?? {x: 0.5, y: 0.35};
    ox = z.x * 100; oy = z.y * 100;
    escala = interpolate(t - enf.desde, [0, 0.25], [1, z.escala ?? 1.6], {extrapolateRight: 'clamp'});
  } else {
    // regla de ritmo: alterna zoom 1.0 / 1.12 en cada corte automático
    const n = cortesDeRitmo(plan).filter((c) => c <= t).length;
    escala = n % 2 ? 1.12 : 1;
  }
  return (
    <AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${escala})`, transformOrigin: `${ox}% ${oy}%`}}>
        {plan.video ? (
          <OffthreadVideo src={staticFile(plan.video)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        ) : (
          <Placeholder />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Sin video real: fondo animado + silueta para ver el zoom.
const Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(${frame}deg, #1d2b64, #f8cdda)`}}>
      <div style={{position: 'absolute', left: 340, top: 420, width: 400, height: 500, borderRadius: '50%', background: '#e0ac69', boxShadow: 'inset 0 -30px 60px rgba(0,0,0,.3)'}} />
      <div style={{position: 'absolute', left: 190, top: 900, width: 700, height: 1100, borderRadius: '45% 45% 0 0', background: '#222'}} />
    </AbsoluteFill>
  );
};
