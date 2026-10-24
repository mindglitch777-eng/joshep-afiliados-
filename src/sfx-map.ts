import medidas from '../public/sfx/sfx.json';
import cfg from '../config/sfx.json';

// Mapa evento visual → sonidos. Todos sintetizados (CC0), ver public/sfx/README.md.
export type Sfx = Exclude<keyof typeof medidas, 'bg-loop'>;
// Editable en config/sfx.json (gancho suma además un riser que entra al primer corte).
export const SFX_MAP = cfg.mapa as Record<keyof typeof cfg.mapa, Sfx[]>;

// Niveles respecto de la voz (RMS de voz de referencia ≈ -20 dBFS antes del master).
const N = cfg.niveles_db;
const VOZ_RMS = N.voz_rms_referencia;
const IMPACTOS = cfg.impactos as Sfx[];
const db = (x: number) => Math.pow(10, x / 20);
const POR_SONIDO = N.por_sonido as Partial<Record<Sfx, number>>;
export const volumenSfx = (s: Sfx) => db(VOZ_RMS + (POR_SONIDO[s] ?? (IMPACTOS.includes(s) ? N.impactos : N.sfx_normal)) - medidas[s].rms);
export const durSfx = (s: Sfx) => medidas[s].dur;
// Música 24 dB bajo la voz; sin voz sube 6 dB (ducking).
export const MUSICA = {conVoz: db(VOZ_RMS + N.musica - medidas['bg-loop'].rms), sinVoz: db(VOZ_RMS + N.musica + N.ducking_sin_voz - medidas['bg-loop'].rms)};
export const PRIORIDAD: Partial<Record<Sfx, number>> = {boom: 3, stamp: 3, subhit: 3, ding: 2, exito: 2, golpe: 2};
