import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';

// Montserrat local (OFL): espera a que cargue antes de renderizar cualquier frame.
const h = delayRender('Cargando Montserrat');
Promise.all([
  loadFont({family: 'Montserrat', url: staticFile('fonts/montserrat-latin-800-normal.woff2'), weight: '800'}),
  loadFont({family: 'Montserrat', url: staticFile('fonts/montserrat-latin-900-normal.woff2'), weight: '900'}),
]).then(() => continueRender(h));
