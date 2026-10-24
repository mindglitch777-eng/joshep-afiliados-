import {AbsoluteFill, Img, interpolate, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {Camara} from '../camara';
import {rectBloque} from '../geometria';
import {acento, C, ENTRADA, FUENTE} from '../theme';
import {ANCHO_TARJETA, Insignia, tarjetaClara} from './Comparacion';
import anchosJson from '../anchos.json';
import {FS_NUMERO} from '../graficos';

const ANCHOS = anchosJson as Record<string, number>;
const anchoTxt = (t: string, fs: number) => [...t].reduce((s, c) => s + ((ANCHOS[c] ?? ANCHOS.M) - 0.01) * fs, 0);

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
        <div style={{...titulo, fontSize: txt.length > 10 ? 40 : txt.length > 8 ? 46 : 56, color: C.negro, textAlign: 'center', padding: '0 8px'}}>{txt}</div>
        {nota && <div style={{fontFamily: FUENTE, fontWeight: 800, fontSize: 34, color: 'rgba(11,11,15,0.65)'}}>{nota}</div>}
      </div>
    );
  };
  return (
    <Bloque caras={caras} alto={270} fondo={false}>
      <div style={{...tarjetaClara, display: 'flex', gap: 76, alignItems: 'center', padding: 24, height: 270, boxSizing: 'border-box', position: 'relative'}}>
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
export const Curva: React.FC<{alto: string; bajo: string; marcaAlto: number; marcaBajo: number; medio?: string; marcaMedio?: number; numero?: string; unidad?: string; numeroEn?: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const d = 'M 20 300 C 160 300, 200 110, 300 110 C 400 110, 470 260, 600 300 C 680 325, 740 320, 788 320';
  const k = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  const ev = evolvePath(k, d);
  // etiqueta con ancho según el texto (≈ 0.68 em por letra a 40 px), sin salirse del gráfico
  const marca = (en: number, x: number, y: number, color: string, txt: string, claro = false) => {
    const s = acento(frame - en, fps);
    const w = txt.length * 27 + 36, lx = Math.min(Math.max(x - w / 2, 0), 808 - w);
    return (
      <>
        <circle cx={x} cy={y} r={16 * s} fill={color} />
        <g opacity={Math.min(1, s * 2)} transform={`translate(${lx}, ${y - 52})`}>
          <rect x={0} y={-44} width={w} height={64} rx={16} fill={color} />
          <text x={w / 2} y={0} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={40} fill={claro ? C.negro : '#fff'}>{txt}</text>
        </g>
      </>
    );
  };
  const n = p.numeroEn !== undefined ? spring({frame: frame - p.numeroEn, fps, config: {damping: 14}, durationInFrames: 12}) : 0;
  return (
    <Bloque caras={p.caras} alto={470}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', height: 70}}>
        <div style={{...titulo, fontSize: 36, color: 'rgba(11,11,15,0.55)'}}>Energía de la charla</div>
        {p.numero && (
          <div style={{display: 'flex', alignItems: 'baseline', gap: 8, opacity: n, transform: `scale(${0.6 + 0.4 * n})`, transformOrigin: 'right center'}}>
            <span style={{...titulo, fontSize: 84, color: C.rojo}}>{p.numero}</span>
            <span style={{...titulo, fontSize: 40, color: C.negro}}>{p.unidad}</span>
          </div>
        )}
      </div>
      <svg viewBox="0 0 808 340" width={808} height={340} style={{overflow: 'visible'}}>
        <line x1={20} y1={320} x2={788} y2={320} stroke="#E3E3E8" strokeWidth={4} />
        <path d={d} fill="none" stroke={C.negro} strokeWidth={10} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        {marca(p.marcaAlto, 300, 110, C.verde, p.alto, true)}
        {p.medio && p.marcaMedio !== undefined && marca(p.marcaMedio, 470, 210, '#FF9F0A', p.medio, true)}
        {marca(p.marcaBajo, 690, 318, C.rojo, p.bajo)}
      </svg>
    </Bloque>
  );
};

// NÚMERO GRANDE: cifra de ≥ 300 px de alto (Montserrat 900: alto de cifra ≈ 0.70 em) que entra con spring + etiqueta corta.
export const Numero: React.FC<{valor: string; unidad?: string; etiqueta?: string; alto: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12, stiffness: 160}, durationInFrames: 18});
  const e = ENTRADA(frame - 8, fps);
  // la etiqueta va al costado, una palabra por línea, con el tamaño que entre (≤ 64 px)
  const anchoNum = anchoTxt(p.valor, FS_NUMERO) + (p.unidad ? 20 + anchoTxt(p.unidad, 110) : 0);
  const pal = (p.etiqueta ?? '').split(/\s+/).filter(Boolean);
  const fsE = pal.length ? Math.min(64, Math.floor((808 - anchoNum - 28) / Math.max(...pal.map((w) => anchoTxt(w, 1))))) : 0;
  return (
    <Bloque caras={p.caras} alto={p.alto}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, height: '100%'}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20, transform: `scale(${0.55 + 0.45 * Math.min(s, 1.05)})`, opacity: Math.min(1, s * 2)}}>
          <span style={{...titulo, fontSize: FS_NUMERO, lineHeight: 0.8, color: C.negro}}>{p.valor}</span>
          {p.unidad && <span style={{...titulo, fontSize: 110, lineHeight: 0.8, color: C.rojo}}>{p.unidad}</span>}
        </div>
        {pal.length > 0 && <div style={{...titulo, fontSize: fsE, lineHeight: 1.05, color: C.negro, opacity: e, transform: `translateX(${(1 - e) * 24}px)`}}>
          {pal.map((w, i) => <div key={i} style={{color: i === 0 ? C.rojo : C.negro}}>{w}</div>)}
        </div>}
      </div>
    </Bloque>
  );
};

// ESCENA / METÁFORA: ilustración vectorial animada (≤ 4 s). `marcas`: cuadros (relativos) de cada golpe / paso.
const ESC_W = 808, ESC_H = 380;
const Jarron: React.FC<{frame: number; marcas: number[]}> = ({frame, marcas}) => {
  const {fps} = useVideoConfig();
  const [g1 = 30, g2 = 60, rompe = 90] = marcas;
  const vaso = 'M 344 70 C 344 110, 300 130, 300 200 C 300 290, 340 340, 404 340 C 468 340, 508 290, 508 200 C 508 130, 464 110, 464 70 Z';
  const grieta = (d: string, en: number) => {
    const k = interpolate(frame, [en, en + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const ev = evolvePath(k, d);
    return <path d={d} fill="none" stroke={C.negro} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />;
  };
  // golpe: sacudida de 6 cuadros en cada marca
  const sac = [g1, g2].reduce((m, en) => m + (frame >= en && frame < en + 6 ? Math.sin((frame - en) * 2.6) * 8 * (1 - (frame - en) / 6) : 0), 0);
  const r = spring({frame: frame - rompe, fps, config: {damping: 30, stiffness: 90}});
  const roto = frame >= rompe;
  const trozo = (clip: string, dx: number, rot: number) => (
    <g transform={`translate(${dx * r * 90}, ${r * r * 60}) rotate(${rot * r * 22}, 404, 340)`} opacity={1 - 0.3 * r}>
      <path d={vaso} fill="rgba(140,200,255,0.25)" stroke={C.negro} strokeWidth={7} clipPath={`url(#${clip})`} />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${ESC_W} ${ESC_H}`} width={ESC_W} height={ESC_H} style={{overflow: 'visible'}}>
      <defs>
        <clipPath id="jIzq"><path d="M 0 0 L 410 0 L 380 160 L 430 250 L 390 400 L 0 400 Z" /></clipPath>
        <clipPath id="jDer"><path d="M 410 0 L 808 0 L 808 400 L 390 400 L 430 250 L 380 160 Z" /></clipPath>
      </defs>
      <line x1={200} y1={350} x2={608} y2={350} stroke="#E3E3E8" strokeWidth={6} strokeLinecap="round" />
      {!roto ? (
        <g transform={`translate(${sac}, 0)`}>
          <path d={vaso} fill="rgba(140,200,255,0.25)" stroke={C.negro} strokeWidth={7} strokeLinejoin="round" />
          <path d="M 360 120 C 330 160, 324 220, 336 270" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
          {grieta('M 420 150 L 400 190 L 430 215 L 410 250', g1)}
          {grieta('M 470 230 L 445 255 L 465 285 L 440 320', g2)}
        </g>
      ) : (
        <>
          {trozo('jIzq', -1, -1)}
          {trozo('jDer', 1, 1)}
          {[[-1.6, 0.5], [1.4, 0.8], [-0.6, 1.2], [0.9, 1.4]].map(([dx, v], i) => (
            <path key={i} d="M 0 0 L 18 6 L 6 20 Z" fill={C.negro} transform={`translate(${404 + dx * r * 160}, ${250 + r * v * 90}) rotate(${r * 200 * dx})`} opacity={Math.min(1, r * 3)} />
          ))}
        </>
      )}
    </svg>
  );
};
const Taza: React.FC<{frame: number; marcas: number[]}> = ({frame, marcas}) => {
  const {fps} = useVideoConfig();
  const cartel = spring({frame: frame - (marcas[1] ?? 40), fps, config: {damping: 9, stiffness: 120}});
  const gotas = Array.from({length: 22}, (_, i) => {
    const x = (i * 97) % ESC_W, v = 9 + (i % 5) * 2, y = ((frame * v + i * 53) % (ESC_H + 60)) - 40;
    return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 26} stroke="#7FA7D9" strokeWidth={4} strokeLinecap="round" opacity={0.75} />;
  });
  return (
    <svg viewBox={`0 0 ${ESC_W} ${ESC_H}`} width={ESC_W} height={ESC_H} style={{overflow: 'visible'}}>
      {gotas}
      <path d="M 300 170 L 500 170 L 482 320 C 478 340, 462 350, 440 350 L 360 350 C 338 350, 322 340, 318 320 Z" fill="#fff" stroke={C.negro} strokeWidth={8} strokeLinejoin="round" />
      <path d="M 498 200 C 560 200, 560 290, 488 290" fill="none" stroke={C.negro} strokeWidth={8} />
      <g transform={`translate(400, 60) rotate(${(1 - Math.min(cartel, 1.1)) * -24 + Math.sin(frame / 7) * 2})`} opacity={Math.min(1, cartel * 3)}>
        <line x1={-70} y1={-40} x2={0} y2={-70} stroke={C.negro} strokeWidth={4} />
        <line x1={70} y1={-40} x2={0} y2={-70} stroke={C.negro} strokeWidth={4} />
        <rect x={-150} y={-40} width={300} height={84} rx={14} fill={C.rojo} />
        <text x={0} y={16} textAnchor="middle" fontFamily="Montserrat" fontWeight={900} fontSize={48} fill="#fff">CERRADO</text>
      </g>
    </svg>
  );
};
const Grupo: React.FC<{frame: number; marcas: number[]}> = ({frame, marcas}) => {
  const {fps} = useVideoConfig();
  const afuera = spring({frame: frame - (marcas[0] ?? 20), fps, config: {damping: 200}});
  const vuelve = spring({frame: frame - (marcas[1] ?? 70), fps, config: {damping: 14, stiffness: 140}});
  const persona = (x: number, color: string, dx = 0, op = 1) => (
    <g transform={`translate(${x + dx}, 0)`} opacity={op}>
      <circle cx={0} cy={150} r={42} fill={color} />
      <path d="M -70 330 C -70 240, -40 210, 0 210 C 40 210, 70 240, 70 330 Z" fill={color} />
    </g>
  );
  const dx = 150 * afuera * (1 - vuelve);
  const col = vuelve > 0.5 ? C.verde : afuera > 0.5 ? '#B9B9C2' : C.negro;
  return (
    <svg viewBox={`0 0 ${ESC_W} ${ESC_H}`} width={ESC_W} height={ESC_H} style={{overflow: 'visible'}}>
      {persona(150, C.negro)}
      {persona(310, C.negro)}
      {persona(470, C.negro)}
      {persona(630, col, dx)}
      {/* el que lo incluye: brazo que se estira hacia el que quedó afuera */}
      <path d={`M 520 260 Q ${560 + dx / 2} 220 ${600 + dx * 0.8} 250`} fill="none" stroke={C.verde} strokeWidth={14} strokeLinecap="round" opacity={vuelve > 0.05 ? Math.min(1, vuelve * 2) * (1 - Math.max(0, vuelve - 0.9) * 10) : 0} />
      <circle cx={630} cy={60} r={30 * Math.min(vuelve, 1)} fill={C.verde} />
      <path d="M 616 60 L 627 71 L 646 50" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={vuelve > 0.6 ? 1 : 0} />
    </svg>
  );
};
export const Escena: React.FC<{escena: 'jarron' | 'taza' | 'grupo'; marcas: number[]; alto: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const E = p.escena === 'jarron' ? Jarron : p.escena === 'taza' ? Taza : Grupo;
  return <Bloque caras={p.caras} alto={p.alto}><E frame={frame} marcas={p.marcas} /></Bloque>;
};

// ECUACIÓN: bloques A (op) B (= C) que entran en secuencia. Operadores dibujados en SVG (no dependen de la fuente).
const Operador: React.FC<{op: string; s: number}> = ({op, s}) => {
  const col = op === '≠' ? C.rojo : C.negro;
  return (
    <svg viewBox="0 0 60 60" width={60} height={60} style={{flex: 'none', transform: `scale(${s})`, opacity: Math.min(1, s * 2)}}>
      {op === '+' && <path d="M 30 10 L 30 50 M 10 30 L 50 30" stroke={col} strokeWidth={9} strokeLinecap="round" />}
      {(op === '=' || op === '≠') && <path d="M 10 22 L 50 22 M 10 40 L 50 40" stroke={col} strokeWidth={9} strokeLinecap="round" />}
      {op === '≠' && <path d="M 40 6 L 20 54" stroke={col} strokeWidth={9} strokeLinecap="round" />}
    </svg>
  );
};
export const Ecuacion: React.FC<{bloques: string[]; inicios: number[]; alto: number; caras: Camara['cara'][]}> = (p) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ops = new Set(['+', '=', '≠']);
  // cada término entra en su cuadro; el operador que lo precede entra 6 cuadros antes
  let k = -1;
  const items = p.bloques.map((b, i) => {
    if (!ops.has(b)) k++;
    const en = ops.has(b) ? (p.inicios[k + 1] ?? p.inicios[k] ?? 0) - 6 : p.inicios[k] ?? 0;
    return {b, op: ops.has(b), s: acento(frame - en, fps), ultimo: i === p.bloques.length - 1 && p.bloques.length > 3};
  });
  const fila1 = items.slice(0, 3), fila2 = items.slice(3);
  const fs = Math.min(60, Math.floor((808 - 60 - 2 * 16 - 2 * 2 * 22) / ((anchoTxt(fila1[0].b, 1) + anchoTxt(fila1[2]?.b ?? '', 1)) || 1)));
  const pill = (x: (typeof items)[number]) => x.op ? <Operador key={x.b + x.s} op={x.b} s={x.s} /> : (
    <div key={x.b} style={{...titulo, fontSize: fs, padding: '18px 22px', borderRadius: 22, whiteSpace: 'nowrap', background: x.ultimo ? C.verde : '#F1F1F4', color: C.negro,
      border: `4px solid ${x.ultimo ? C.verde : C.negro}`, opacity: Math.min(1, x.s * 2), transform: `scale(${0.7 + 0.3 * x.s})`}}>{x.b}</div>
  );
  const fila = (xs: typeof items) => <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16}}>{xs.map(pill)}</div>;
  return (
    <Bloque caras={p.caras} alto={p.alto}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center', height: '100%'}}>
        {fila(fila1)}
        {fila2.length > 0 && fila(fila2)}
      </div>
    </Bloque>
  );
};

// Botón del CTA: "LINK EN MI PERFIL" en la franja de arriba (la animación de Joseph tiene texto en el centro y su botón abajo, bajo la UI de TikTok).
export const BotonCTA: React.FC<{texto?: string}> = ({texto = 'LINK EN MI PERFIL'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = acento(frame - 6, fps);
  const pulso = 1 + 0.03 * Math.sin((frame / fps) * Math.PI * 2 * 1.2);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start'}}>
      <div style={{position: 'absolute', top: 166, left: 64, width: 896, display: 'flex', justifyContent: 'center', opacity: Math.min(1, s * 2), transform: `translateY(${(1 - s) * 40}px) scale(${pulso})`}}>
        <div style={{...titulo, display: 'flex', alignItems: 'center', gap: 18, fontSize: 46, padding: '16px 34px', borderRadius: 999, background: C.amarillo, color: C.negro, boxShadow: '0 16px 50px rgba(0,0,0,0.5)'}}>
          <svg viewBox="0 0 60 60" width={44} height={44}><path d="M 30 50 L 30 12 M 14 27 L 30 11 L 46 27" fill="none" stroke={C.negro} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" /></svg>
          {texto}
        </div>
      </div>
    </AbsoluteFill>
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
