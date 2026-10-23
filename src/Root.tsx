import {Composition} from 'remotion';
import {Clip} from './Clip';
import {Plan} from './plan';
import ejemplo from '../plans/ejemplo.json';
import brand from '../config/brand.json';

export const Root: React.FC = () => (
  <Composition
    id="Clip"
    component={Clip}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={600}
    defaultProps={ejemplo as Plan}
    calculateMetadata={({props}) => {
      const fps = props.fps ?? brand.fps;
      return {fps, durationInFrames: Math.round(props.duracion * fps)};
    }}
  />
);
