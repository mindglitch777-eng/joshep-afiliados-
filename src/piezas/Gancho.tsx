import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import hookCfg from '../../config/hook.json';
import {LayoutGancho, LH_GANCHO, LS_GANCHO, PAD_GANCHO} from '../gancho-layout';
import {C, EASE_ZOOM, FUENTE} from '../theme';

// Pieza 1: HookIntro. Cuadro 0 con el gancho COMPLETO (opacidad 1); solo se asienta: escala 1.12→1.0 en 6 frames.
// Palabra clave en la caja amarilla de marca; el resto blanco con contorno. Ubicado sobre la frente.
export const Gancho: React.FC<{lay: LayoutGancho}> = ({lay}) => {
  const frame = useCurrentFrame();
  const A = hookCfg.asentamiento;
  const k = interpolate(frame, [0, A.frames], [A.escala_desde, 1], {extrapolateRight: 'clamp', easing: EASE_ZOOM});
  const origenY = lay.top + lay.alto / 2;
  return (
    <AbsoluteFill style={{transform: `scale(${k})`, transformOrigin: `512px ${origenY}px`}}>
      {lay.palabras.map((p, i) => (
        <div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: p.ancho, height: lay.fs * LH_GANCHO}}>
          {p.clave && <div style={{position: 'absolute', left: -PAD_GANCHO.x, top: (lay.fs * LH_GANCHO - lay.fs) / 2 - PAD_GANCHO.y, width: p.ancho + 2 * PAD_GANCHO.x, height: lay.fs + 2 * PAD_GANCHO.y, background: C.amarillo, borderRadius: 18, boxShadow: '0 8px 24px rgba(0,0,0,0.35)'}} />}
          <span style={{position: 'relative', fontFamily: FUENTE, fontWeight: 900, fontSize: lay.fs, lineHeight: `${lay.fs * LH_GANCHO}px`, letterSpacing: `${LS_GANCHO}em`, whiteSpace: 'pre',
            fontKerning: 'none', fontFeatureSettings: '"kern" 0, "liga" 0', color: p.clave ? C.negro : C.blanco,
            WebkitTextStroke: p.clave ? undefined : '8px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
            textShadow: p.clave ? 'none' : '0 4px 10px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35)'}}>{p.t}</span>
        </div>
      ))}
    </AbsoluteFill>
  );
};
