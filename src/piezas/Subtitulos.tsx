import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useMemo} from 'react';
import {Palabra} from '../plan';
import {armarFrases, Caja, Frase, PAD, SUB, textoSub} from '../subs-layout';
import {C, FUENTE} from '../theme';

const COLOR = {neg: C.rojo, pos: C.verde};

// estilo de texto compartido con el test de espaciado
export const estiloPalabra = (c: Caja): React.CSSProperties => ({
  position: 'absolute', left: c.x, top: c.y, height: c.alto, lineHeight: `${c.alto}px`,
  fontFamily: FUENTE, fontWeight: 900, fontSize: c.fs, letterSpacing: `${SUB.ls}em`, whiteSpace: 'pre',
  fontKerning: 'none', fontFeatureSettings: '"kern" 0, "liga" 0',
});

const rect = (c: Caja) => ({x: c.x - PAD.x, y: c.y + (c.alto - c.fs * 1.0) / 2 - PAD.y, w: c.ancho + PAD.x * 2, h: c.fs * 1.0 + PAD.y * 2});

const VistaFrase: React.FC<{fr: Frase; frame: number; fps: number; trazo?: boolean}> = ({fr, frame, fps, trazo}) => {
  const ini = fr.ini * fps - 2, fin = fr.fin * fps;
  const entra = interpolate(frame - ini, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const sale = interpolate(frame, [fin, fin + 3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // una sola activa: la última cuyo inicio (adelantado 2 frames) ya pasó
  let act = -1;
  fr.cajas.forEach((c, i) => { if (frame >= c.w.desde * fps - 2) act = i; });
  // caja de resaltado única que desliza de palabra en palabra
  let caja = null, llego = 1;
  if (act >= 0) {
    const desde = fr.cajas[act].w.desde * fps - 2;
    const k = spring({frame: frame - desde, fps, config: {damping: 200}, durationInFrames: 6});
    const b = rect(fr.cajas[act]), a = act > 0 ? rect(fr.cajas[act - 1]) : b;
    const aparece = act === 0 ? k : 1;
    llego = k;
    const l = (u: number, v: number) => u + (v - u) * k;
    caja = <div style={{position: 'absolute', left: l(a.x, b.x), top: l(a.y, b.y), width: l(a.w, b.w), height: l(a.h, b.h), background: C.amarillo, borderRadius: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', opacity: aparece, transform: `scale(${0.8 + 0.2 * aparece})`}} />;
  }
  return (
    <div style={{position: 'absolute', inset: 0, opacity: entra * sale, transform: `translateY(${(1 - entra) * 12}px)`}}>
      {caja}
      {/* pack "mano": subrayado dibujado a mano bajo cada palabra clave ya dicha */}
      {trazo && fr.cajas.filter((c) => c.w.clave && frame >= c.w.desde * fps).map((c, i) => {
        const k = interpolate(frame - c.w.desde * fps, [0, 9], [0, 1], {extrapolateRight: 'clamp'});
        const y = c.y + c.alto * 0.92, L = c.ancho + 20;
        return (
          <svg key={`t${i}`} style={{position: 'absolute', left: c.x - 10, top: y - 14, overflow: 'visible'}} width={L} height={28}>
            <path d={`M 4 18 Q ${L * 0.3} 6, ${L * 0.55} 14 T ${L - 4} 10`} fill="none" stroke={C.amarillo} strokeWidth={9} strokeLinecap="round"
              strokeDasharray={L * 1.2} strokeDashoffset={L * 1.2 * (1 - k)} />
          </svg>
        );
      })}
      {fr.cajas.map((c, i) => {
        const activa = i === act && llego > 0.97; // negro recién cuando la caja llegó: nunca letras cortadas
        // palabra clave: tamaño final desde el inicio; al decirse hace un pop que no pasa del padding reservado
        const amp = c.w.clave ? Math.min(0.06, (2 * (PAD.x - 4)) / c.ancho) : 0;
        const kPop = spring({frame: frame - (c.w.desde * fps - 2), fps, config: {damping: 200}, durationInFrames: 8});
        const crece = frame >= c.w.desde * fps - 2 ? 1 + amp * (1 - kPop) : 1;
        const color = activa ? C.negro : c.w.tono ? COLOR[c.w.tono] : C.blanco;
        return (
          <span key={i} style={{...estiloPalabra(c), color, transform: `scale(${crece})`,
            WebkitTextStroke: activa ? undefined : '7px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
            textShadow: activa ? 'none' : '0 4px 10px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35)'}}>
            {textoSub(c.w)}
          </span>
        );
      })}
    </div>
  );
};

// Pieza 5: subtítulos con caja deslizante, palabras clave grandes y color semántico.
export const Subtitulos: React.FC<{palabras: Palabra[]; ocultar: (t: number, fr: Frase) => boolean; trazo?: boolean}> = ({palabras, ocultar, trazo}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const frases = useMemo(() => armarFrases(palabras), [palabras]);
  const fr = frases.find((x) => frame >= x.ini * fps - 2 && frame < x.fin * fps + 3);
  if (!fr || ocultar(frame / fps, fr)) return null;
  return <VistaFrase fr={fr} frame={frame} fps={fps} trazo={trazo} />;
};
