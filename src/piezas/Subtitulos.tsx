import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Palabra} from '../plan';
import {C, FUENTE, sombra} from '../theme';

// Pieza 5: subtítulos palabra por palabra, en grupos de 3, con la activa resaltada.
export const Subtitulos: React.FC<{palabras: Palabra[]}> = ({palabras}) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const idx = palabras.findIndex((p) => t >= p.desde && t < p.hasta);
  if (idx < 0) return null;
  const ini = idx - (idx % 3);
  const grupo = palabras.slice(ini, ini + 3);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 380}}>
      <div style={{display: 'flex', gap: 22, flexWrap: 'wrap', justifyContent: 'center', padding: '0 60px'}}>
        {grupo.map((p, i) => {
          const activa = ini + i === idx;
          return (
            <span key={i} style={{fontFamily: FUENTE, fontSize: 84, textTransform: 'uppercase', textShadow: sombra, color: activa ? C.amarillo : C.blanco, transform: `scale(${activa ? 1.15 : 1})`, display: 'inline-block', margin: '0 14px'}}>{p.texto}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
