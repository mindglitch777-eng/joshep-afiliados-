import {Composition} from 'remotion';
import {Clip} from './Clip';
import {FPS, Plan} from './plan';
import ejemplo from '../plans/ejemplo.json';

export const Root: React.FC = () => (
  <Composition
    id="Clip"
    component={Clip}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={300}
    defaultProps={ejemplo as Plan}
    calculateMetadata={({props}) => ({durationInFrames: Math.round(props.duracion * FPS)})}
  />
);
