import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Palabra} from '../plan';
import {ANCHO_UTIL, C, SEGURA, textoPremium} from '../theme';

// Agrupa en frases de 3-5 palabras: corta en silencio > 0.25s, fin de oración o coma,
// y reparte los tramos largos en partes parejas (7 → 4+3) para no dejar "MIRA A".
export const frases = (ps: Palabra[]) => {
  const tramos: Palabra[][] = [];
  let cur: Palabra[] = [];
  ps.forEach((p, i) => {
    cur.push(p);
    const sig = ps[i + 1];
    const silencio = !sig || sig.desde - p.hasta > 0.25;
    if (silencio || /[.!?…:]$/.test(p.texto) || (/[,;]$/.test(p.texto) && cur.length >= 3)) {
      tramos.push(cur);
      cur = [];
    }
  });
  if (cur.length) tramos.push(cur);
  return tramos.flatMap((t) => {
    const n = Math.ceil(t.length / 5), tam = Math.ceil(t.length / n);
    return Array.from({length: n}, (_, i) => t.slice(i * tam, (i + 1) * tam));
  });
};

// Margen que reserva cada palabra para su pop (escala 1.12 ≈ 6% del ancho por lado + contorno).
const reserva = (texto: string) => Math.ceil(0.06 * texto.length * 0.72 * 80) + 4;

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
    <div style={{position: 'absolute', left: SEGURA.izq, width: ANCHO_UTIL, top: 1230, transform: `translateY(calc(-50% + ${(1 - entra) * 12}px))`, opacity: entra * sale, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 0}}>
      {ps.map((p, i) => {
        const on = i === activa;
        const pop = on ? 1 + 0.12 * spring({frame: frame - (Math.round(p.desde * fps) - 2), fps, config: {damping: 200}, durationInFrames: 4}) : 1;
        return (
          <span key={i} style={{...textoPremium(7), fontSize: 80, textTransform: 'uppercase', color: on ? C.amarillo : C.blanco, display: 'inline-block', margin: `0 ${reserva(p.texto)}px`, transform: `scale(${pop})`}}>
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
