import punch from '../config/styles/punch.json';
import push from '../config/styles/push.json';
import capas from '../config/styles/capas.json';
import mano from '../config/styles/mano.json';
import rot from '../config/styles/_rotacion.json';
import {Plan} from './plan';
import {Sfx} from './sfx-map';

// Style packs: cambian cámara, transición, variante de SFX y uso del flash. Nunca la marca
// (Montserrat, caja amarilla, colores semánticos, ding de marca).
export type Pack = {
  nombre: string;
  camara: {planos: 'cortes' | 'largos'; push_max: number; abierto: boolean; mano: {amp_px: number; hz: number}; relleno_ritmo: 'corte' | 'pulso'};
  encuadre: 'capas' | null;
  escala_capas?: number;
  transicion: 'zoom-blur' | 'whip' | 'slide';
  sfx: {plano: Sfx[]; pulso: Sfx[]};
  flash: {arranque: boolean; secciones: boolean};
};
export const PACKS = {punch, push, capas, mano} as unknown as Record<string, Pack>;
export const packDe = (plan: Plan): Pack => PACKS[plan.estilo ?? rot.por_defecto] ?? PACKS[rot.por_defecto];
// Encuadre efectivo: el pack "capas" manda; si no, lo que diga el plan.
export const encuadreDe = (plan: Plan) => packDe(plan).encuadre ?? plan.encuadre ?? 'cara';
