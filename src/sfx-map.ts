import medidas from '../public/sfx/sfx.json';

// Mapa evento visual → sonidos. Todos sintetizados (CC0), ver public/sfx/README.md.
export type Sfx = Exclude<keyof typeof medidas, 'bg-loop'>;
export const SFX_MAP = {
  gancho: ['boom'], // + riser que entra al primer corte
  plano: ['whoosh-a', 'whoosh-b'], // alterna variantes
  clave: ['ding'], // motivo de marca
  tarjetaMal: ['golpe'],
  tachado: ['swipe'],
  tarjetaBien: ['exito'],
  lista: ['swipe'],
  item: ['tick', 'pop'],
  enfasis: ['stamp', 'subhit'],
  icono: ['burbuja'],
} satisfies Record<string, Sfx[]>;

// Niveles respecto de la voz (RMS de voz de referencia ≈ -20 dBFS antes del master).
const VOZ_RMS = -20;
const IMPACTOS: Sfx[] = ['boom', 'subhit', 'stamp'];
const db = (x: number) => Math.pow(10, x / 20);
export const volumenSfx = (s: Sfx) => db(VOZ_RMS + (IMPACTOS.includes(s) ? -8 : -14) - medidas[s].rms);
export const durSfx = (s: Sfx) => medidas[s].dur;
// Música 24 dB bajo la voz; sin voz sube 6 dB (ducking).
export const MUSICA = {conVoz: db(VOZ_RMS - 24 - medidas['bg-loop'].rms), sinVoz: db(VOZ_RMS - 18 - medidas['bg-loop'].rms)};
export const PRIORIDAD: Partial<Record<Sfx, number>> = {boom: 3, stamp: 3, subhit: 3, ding: 2, exito: 2, golpe: 2};
