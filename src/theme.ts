import {Easing, spring} from 'remotion';
import brand from '../config/brand.json';

export const BRAND = brand;

const K = brand.colores;
export const C = {amarillo: K.acento, rojo: K.negativo, verde: K.positivo, blanco: K.texto, negro: K.oscuro, vidrio: 'rgba(14,14,18,0.88)'};
export const FUENTE = 'Montserrat, sans-serif';

// Zonas seguras TikTok (aprox.) en px sobre 1080x1920.
export const SEGURA = {izq: 64, der: 160, arriba: 160, abajo: 440};
export const ANCHO_UTIL = 1080 - SEGURA.izq - SEGURA.der; // 856

// Texto legible sobre cualquier fondo: contorno + sombra de 2 capas.
export const textoPremium = (contorno = 7): React.CSSProperties => ({
  fontFamily: FUENTE,
  fontWeight: 900,
  letterSpacing: '-0.01em',
  lineHeight: 1.05,
  WebkitTextStroke: `${contorno}px rgba(0,0,0,0.85)`,
  paintOrder: 'stroke fill',
  textShadow: '0 4px 10px rgba(0,0,0,0.45), 0 12px 32px rgba(0,0,0,0.35)',
});

// Las dos únicas curvas de movimiento del proyecto.
export const ENTRADA = (frame: number, fps: number) => spring({frame, fps, config: {damping: 200}});
export const ACENTO = (frame: number, fps: number) => spring({frame, fps, config: {damping: 14, stiffness: 170, overshootClamping: false}});
// Recorta el rebote del ACENTO a 4% máx.
export const acento = (frame: number, fps: number) => Math.min(ACENTO(frame, fps), 1.04);
export const EASE_ZOOM = Easing.bezier(0.22, 1, 0.36, 1);
export const SALIDA_FR = 7;
