import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Palabra} from '../plan';
import {ANCHO_UTIL, C, SEGURA, textoPremium} from '../theme';

// Agrupa en frases de 3-5 palabras cortando en puntuación o silencio > 0.25s.
export const frases = (ps: Palabra[]) => {
  const out: Palabra[][] = [];
  let cur: Palabra[] = [];
  ps.forEach((p, i) => {
    cur.push(p);
    const sig = ps[i + 1];
    const silencio = !sig || sig.desde - p.hasta > 0.25;
    const fin = /[.!?…:]$/.test(p.texto);
    const coma = /[,;]$/.test(p.texto);
    if (silencio || fin || cur.length >= 5 || (coma && cur.length >= 3)) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
};

const Frase: React.FC<{ps: Palabra[]; frame: number; fps: number}> = ({ps, frame, fps}) => {
  const ini = Math.round(ps[0].desde * fps) - 2;
  const fin = Math.round(ps[ps.length - 1].hasta * fps);
  const local = frame - ini;
  const entra = interpolate(local, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sale = interpolate(frame, [fin, fin + 3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // una sola activa: la última cuyo inicio (adelantado 2 frames) ya pasó
  let activa = -1;
  ps.forEach((p, i) => { if (frame >= Math.round(p.desde * fps) - 2) activa = i; });
  return (
    <div style={{position: 'absolute', left: SEGURA.izq, width: ANCHO_UTIL, top: 1230, transform: `translateY(calc(-50% + ${(1 - entra) * 12}px))`, opacity: entra * sale, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 24, rowGap: 0}}>
      {ps.map((p, i) => {
        const on = i === activa;
        const pop = on ? 1 + 0.1 * spring({frame: frame - (Math.round(p.desde * fps) - 2), fps, config: {damping: 200}, durationInFrames: 4}) : 1;
        return (
          <span key={i} style={{...textoPremium(7), fontSize: 80, textTransform: 'uppercase', color: on ? C.amarillo : C.blanco, display: 'inline-block', transform: `scale(${pop})`}}>
            {p.texto.replace(/[.,;:]$/, '')}
          </span>
        );
      })}
    </div>
  );
};

// Pieza 5: subtítulos por frase, con la palabra activa resaltada.
export const Subtitulos: React.FC<{palabras: Palabra[]; ocultar: (t: number) => boolean}> = ({palabras, ocultar}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (ocultar(frame / fps)) return null;
  const g = frases(palabras).find((ps) => frame >= Math.round(ps[0].desde * fps) - 2 && frame < Math.round(ps[ps.length - 1].hasta * fps) + 3);
  return g ? <Frase ps={g} frame={frame} fps={fps} /> : null;
};
