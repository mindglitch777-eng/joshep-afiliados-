import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {Camara} from './camara';

// Video de fondo (o placeholder) movido solo con translate + scale desde el centro.
export const Fondo: React.FC<{video?: string | null; cam: Camara; punch: number}> = ({video, cam, punch}) => (
  <AbsoluteFill style={{background: '#111', overflow: 'hidden'}}>
    <AbsoluteFill style={{transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s * punch})`}}>
      {video ? <OffthreadVideo src={staticFile(video)} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Placeholder />}
    </AbsoluteFill>
    {/* scrim: degradé oscuro en el 40% inferior */}
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.5))'}} />
  </AbsoluteFill>
);

// Sin video real: fondo animado + silueta (cara en x=50%, y=35%).
const Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(${frame / 2}deg, #1d2b64, #f8cdda)`}}>
      <div style={{position: 'absolute', left: 340, top: 422, width: 400, height: 500, borderRadius: '50%', background: '#e0ac69', boxShadow: 'inset 0 -30px 60px rgba(0,0,0,.3)'}} />
      <div style={{position: 'absolute', left: 190, top: 900, width: 700, height: 1100, borderRadius: '45% 45% 0 0', background: '#222'}} />
    </AbsoluteFill>
  );
};
