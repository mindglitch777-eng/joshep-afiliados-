import {AbsoluteFill, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {Camara} from '../camara';
import {rectBloque} from '../geometria';
import {acento, C, ENTRADA, FUENTE} from '../theme';
import {ANCHO_TARJETA, Insignia, tarjetaClara} from './Comparacion';

// Contenedor común: ubica la tarjeta debajo de la cara (rectBloque) y la escala si hace falta.
export const Bloque: React.FC<{caras: Camara['cara'][]; alto: number; children: React.ReactNode; fondo?: boolean}> = ({caras, alto, children, fondo = true}) => {
  const r = rectBloque(caras, alto);
  const frame = useCurrentFrame();
  const e = ENTRADA(frame, useVideoConfig().fps);
  return (
    <AbsoluteFill>
      <div style={{...(fondo ? tarjetaClara : {}), position: 'absolute', left: r.x0, top: r.y0, width: ANCHO_TARJETA, height: alto, boxSizing: 'border-box', padding: fondo ? '28px 36px' : 0,
        transform: `translateY(${(1 - e) * 24}px) scale(${r.k})`, transformOrigin: 'top left', opacity: e}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const titulo: React.CSSProperties = {fontFamily: FUENTE, fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.05, textTransform: 'uppercase'};

// VERSUS: dos columnas (negativa ✕ / positiva ✓) con "VS" al medio.
export const Versus: React.FC<{mal: string; bien: string; notaMal?: string; notaBien?: string; caras: Camara['cara'][]}> = ({mal, bien, notaMal, notaBien, caras}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const col = (ok: boolean, txt: string, nota: string | undefined, d: number) => {
    const s = acento(frame - d, fps);
    return (
      <div style={{flex: 1, height: 214, borderRadius: 26, background: ok ? 'rgba(45,227,139,0.12)' : 'rgba(255,59,78,0.10)', border: `4px solid ${ok ? C.verde : C.rojo}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: Math.min(1, s * 1.5), transform: `scale(${0.85 + 0.15 * s})`}}>
        <Insignia ok={ok} />
        <div style={{...titulo, fontSize: 56, color: C.negro, textAlign: 'center', padding: '0 10px'}}>{txt}</div>
        {nota && <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 34, color: 'rgba(11,11,15,0.65)'}}>{nota}</div>}
      </div>
    );
  };
  return (
    <Bloque caras={caras} alto={270} fondo={false}>
      <div style={{...tarjetaClara, display: 'flex', gap: 20, alignItems: 'center', padding: 24, height: 270, boxSizing: 'border-box', position: 'relative'}}>
        {col(false, mal, notaMal, 0)}
        {col(true, bien, notaBien, 8)}
        <div style={{position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: 32, background: C.negro, color: C.amarillo,
          ...titulo, fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>VS</div>
      </div>
    </Bloque>
  );
};

// LISTA con estilos: check (✓ al decirse + cierre), flujo (A→B→C→D, el paso actual grande), preguntas.
export const ListaPro: React.FC<{titulo?: string; pasos: string[]; inicios: number[]; estilo: 'check' | 'flujo' | 'preguntas'; cierre?: string; cierreEn?: number; alto: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const actual = p.inicios.filter((i) => frame >= i).length - 1;
  return (
    <Bloque caras={p.caras} alto={p.alto}>
      {p.titulo && <div style={{...titulo, fontSize: 64, color: C.negro, marginBottom: 24}}>{p.titulo}</div>}
      {p.estilo === 'flujo' ? (
        <div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22}}>
            {p.pasos.map((_, i) => {
              const s = spring({frame: frame - p.inicios[i], fps, config: {damping: 14}, durationInFrames: 10});
              const on = i <= actual;
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center'}}>
                  <div style={{width: 92, height: 92, borderRadius: 46, background: on ? C.amarillo : '#E8E8EC', ...titulo, fontSize: 48, color: C.negro, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${on ? 0.8 + 0.2 * s : 0.8})`}}>{'ABCD'[i]}</div>
                  {i < p.pasos.length - 1 && <div style={{width: 96, height: 8, borderRadius: 4, marginLeft: 14, background: i < actual ? C.negro : '#E8E8EC'}} />}
                </div>
              );
            })}
          </div>
          <div style={{...titulo, fontSize: 60, color: C.negro, textAlign: 'center', opacity: actual >= 0 ? 1 : 0}}>{actual >= 0 ? p.pasos[actual] : ''}</div>
        </div>
      ) : (
        p.pasos.map((t, i) => {
          const s = ENTRADA(frame - p.inicios[i], fps);
          const ok = spring({frame: frame - p.inicios[i] - 6, fps, config: {damping: 12}, durationInFrames: 10});
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, height: p.estilo === 'preguntas' ? 112 : 84, opacity: s, transform: `translateX(${(1 - s) * -40}px)`}}>
              <div style={{width: 56, height: 56, borderRadius: 14, border: `4px solid ${C.negro}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: p.estilo === 'check' ? (ok > 0.5 ? C.verde : 'transparent') : C.amarillo}}>
                {p.estilo === 'check' ? <svg viewBox="0 0 100 100" width={36}><path d="M18 52 L42 74 L84 26" fill="none" stroke={C.negro} strokeWidth={16} strokeLinecap="round" strokeDasharray={120} strokeDashoffset={120 * (1 - ok)} /></svg>
                  : <span style={{...titulo, fontSize: 34}}>?</span>}
              </div>
              <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 52, letterSpacing: '-0.01em', color: C.negro, lineHeight: 1.05}}>{t}</div>
            </div>
          );
        })
      )}
      {p.cierre && p.cierreEn !== undefined && (
        <div style={{marginTop: 16, display: 'inline-block', background: C.amarillo, borderRadius: 18, padding: '10px 22px', ...titulo, fontSize: 52, color: C.negro,
          opacity: interpolate(frame - p.cierreEn, [0, 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: `scale(${1.15 - 0.15 * spring({frame: frame - p.cierreEn, fps, config: {damping: 200}, durationInFrames: 8})})`}}>{p.cierre}</div>
      )}
    </Bloque>
  );
};

// CURVA DE EMOCIÓN: pico → caída. Marca "ACÁ TE FUISTE" (verde, en el pico) y "ACÁ TE QUEDASTE" (rojo, en el piso); número grande opcional.
export const Curva: React.FC<{alto: string; bajo: string; marcaAlto: number; marcaBajo: number; numero?: string; unidad?: string; numeroEn?: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = 'M 20 300 C 160 300, 200 40, 300 40 C 400 40, 470 250, 600 300 C 680 330, 740 320, 788 320';
  const k = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  const ev = evolvePath(k, d);
  const marca = (en: number, x: number, y: number, ok: boolean, txt: string) => {
    const s = acento(frame - en, fps);
    return (
      <>
        <circle cx={x} cy={y} r={16 * s} fill={ok ? C.verde : C.rojo} />
        <g opacity={Math.min(1, s * 2)} transform={`translate(${x}, ${ok ? y - 46 : y - 46})`}>
          <rect x={ok ? -150 : -330} y={-44} width={ok ? 300 : 360} height={64} rx={16} fill={ok ? C.verde : C.rojo} />
          <text x={ok ? 0 : -150} y={0} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} fill={ok ? C.negro : '#fff'}>{txt}</text>
        </g>
      </>
    );
  };
  const n = p.numeroEn !== undefined ? spring({frame: frame - p.numeroEn, fps, config: {damping: 14}, durationInFrames: 12}) : 0;
  return (
    <Bloque caras={p.caras} alto={470}>
      <div style={{...titulo, fontSize: 40, color: 'rgba(11,11,15,0.55)'}}>Energía de la charla</div>
      <svg viewBox="0 0 808 340" width={808} height={340} style={{overflow: 'visible'}}>
        <line x1={20} y1={320} x2={788} y2={320} stroke="#E3E3E8" strokeWidth={4} />
        <path d={d} fill="none" stroke={C.negro} strokeWidth={10} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        {marca(p.marcaAlto, 300, 40, true, p.alto)}
        {marca(p.marcaBajo, 690, 318, false, p.bajo)}
      </svg>
      {p.numero && (
        <div style={{position: 'absolute', right: 36, top: 22, display: 'flex', alignItems: 'baseline', gap: 8, opacity: n, transform: `scale(${0.6 + 0.4 * n})`, transformOrigin: 'right top'}}>
          <span style={{...titulo, fontSize: 96, color: C.rojo}}>{p.numero}</span>
          <span style={{...titulo, fontSize: 44, color: C.negro}}>{p.unidad}</span>
        </div>
      )}
    </Bloque>
  );
};

// NÚMERO GRANDE con etiqueta.
export const Numero: React.FC<{valor: string; unidad?: string; etiqueta?: string; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const s = acento(frame, useVideoConfig().fps);
  return (
    <Bloque caras={p.caras} alto={300}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 16, transform: `scale(${0.7 + 0.3 * s})`}}>
        <span style={{...titulo, fontSize: 170, color: C.negro}}>{p.valor}</span>
        {p.unidad && <span style={{...titulo, fontSize: 72, color: C.rojo}}>{p.unidad}</span>}
      </div>
      {p.etiqueta && <div style={{...titulo, fontSize: 52, color: C.negro, textAlign: 'center'}}>{p.etiqueta}</div>}
    </Bloque>
  );
};

// A pantalla completa: animación de Joseph (inserto / CTA) o imagen como tarjeta al 65% sobre el video desenfocado.
export const PantallaVideo: React.FC<{archivo: string; inicio?: number; velocidad?: number}> = ({archivo, inicio = 0, velocidad = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const e = spring({frame, fps, config: {damping: 200}, durationInFrames: 8});
  return (
    <AbsoluteFill style={{background: '#0B0B0F', opacity: e, transform: `scale(${1.04 - 0.04 * e})`}}>
      <OffthreadVideo src={staticFile(archivo)} startFrom={Math.round(inicio * fps)} playbackRate={velocidad} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    </AbsoluteFill>
  );
};
export const PantallaImagen: React.FC<{archivo: string}> = ({archivo}) => {
  const frame = useCurrentFrame();
  const s = acento(frame, useVideoConfig().fps);
  return (
    <AbsoluteFill style={{background: 'rgba(11,11,15,0.82)', backdropFilter: 'blur(30px)', alignItems: 'center', justifyContent: 'center', opacity: Math.min(1, s * 2)}}>
      <Img src={staticFile(archivo)} style={{width: '65%', borderRadius: 40, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', transform: `scale(${0.85 + 0.15 * s}) rotate(${(1 - s) * -3}deg)`}} />
    </AbsoluteFill>
  );
};
