import {Plan} from './plan';
import {durSfx, Sfx, SFX_MAP, volumenSfx} from './sfx-map';

// Línea de tiempo única: de acá salen la cámara, los sonidos y el reporte de ritmo.
export const MAX_SIN_EVENTO = 1.5;
export type Evento = {t: number; tipo: string; desc: string; sfx: Sfx[]};
export type Sonido = {t: number; sfx: Sfx; dur: number; vol: number; recortado?: boolean};
export type Plano = {ini: number; fin: number; tipo: 'push' | 'abierto'; dir: 1 | -1};

const norm = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñü]/g, '');

export const linea = (plan: Plan, fps: number) => {
  const ev: Evento[] = [];
  const fr = (n: number) => n / fps;
  const piezaEn = (t: number) => plan.piezas.find((p) => t >= p.desde && t < p.hasta);
  const enfasis = plan.piezas.filter((p) => p.tipo === 'enfasis');
  const sonidos: Omit<Sonido, 'vol'>[] = [];

  for (const p of plan.piezas) {
    if (p.tipo === 'gancho') {
      ev.push({t: p.desde, tipo: 'gancho', desc: p.texto, sfx: SFX_MAP.gancho});
      sonidos.push({t: Math.max(0, p.hasta - durSfx('riser')), sfx: 'riser', dur: durSfx('riser')});
    }
    if (p.tipo === 'comparacion') {
      ev.push({t: p.desde, tipo: 'tarjeta ✗', desc: p.mal, sfx: SFX_MAP.tarjetaMal});
      ev.push({t: p.desde + fr(8), tipo: 'tarjeta ✓', desc: p.bien, sfx: SFX_MAP.tarjetaBien});
      ev.push({t: p.desde + fr(14), tipo: 'tachado', desc: 'se dibuja', sfx: SFX_MAP.tachado});
    }
    if (p.tipo === 'pasos') {
      ev.push({t: p.desde, tipo: 'lista', desc: p.titulo ?? '', sfx: SFX_MAP.lista});
      p.pasos.forEach((x, i) => ev.push({t: p.tiempos?.[i] ?? p.desde + 0.3 + i * 0.5, tipo: 'ítem', desc: x, sfx: SFX_MAP.item}));
    }
    if (p.tipo === 'enfasis') ev.push({t: p.desde - fr(4), tipo: 'énfasis', desc: p.palabra, sfx: SFX_MAP.enfasis});
  }

  // palabras clave e íconos (solo si el subtítulo está visible; íconos cada ≥3 s)
  let ultimoIcono = -99;
  for (const w of plan.subtitulos) {
    const pz = piezaEn(w.desde);
    if (pz && pz.tipo !== 'enfasis') continue;
    if (enfasis.some((e) => e.tipo === 'enfasis' && norm(e.palabra) === norm(w.texto))) continue;
    if (w.clave) ev.push({t: w.desde, tipo: 'palabra clave', desc: w.texto, sfx: SFX_MAP.clave});
    if (w.icono && w.desde - ultimoIcono >= 3) {
      ev.push({t: w.desde, tipo: 'ícono', desc: w.icono, sfx: SFX_MAP.icono});
      ultimoIcono = w.desde;
    }
  }

  // jump cuts de silencios: evento visual (micro-zoom); el corte de la voz es su sonido
  const jumps = plan.cortes ?? [];
  for (const j of jumps) ev.push({t: j, tipo: 'jump cut', desc: 'micro-zoom', sfx: []});

  // cortes de plano: cada ~2.5–3.2 s, pegados a un jump cut cercano si hay, fuera de las ventanas de énfasis
  const enVentana = (t: number) => enfasis.some((e) => t > e.desde - 0.4 && t < e.hasta + 0.5);
  const cortes: number[] = [];
  for (let t = 2, k = 0; t < plan.duracion - 1; t += k++ % 2 ? 3.2 : 2.5) {
    const cerca = jumps.filter((j) => Math.abs(j - t) <= 0.6).sort((a, b) => Math.abs(a - t) - Math.abs(b - t))[0];
    let c = cerca ?? t;
    while (enVentana(c)) c += 0.1;
    if (c < plan.duracion - 1) cortes.push(c);
    t = c;
  }
  // relleno: ningún tramo > 1.5 s sin evento visual
  const tiempos = () => [...ev.map((e) => e.t), ...cortes, 0, plan.duracion].sort((a, b) => a - b);
  for (let guard = 0; guard < 100; guard++) {
    const ts = tiempos();
    const i = ts.findIndex((t, j) => j > 0 && t - ts[j - 1] > MAX_SIN_EVENTO);
    if (i < 0) break;
    const a = ts[i - 1], gap = ts[i] - a;
    cortes.push(gap <= 2 * MAX_SIN_EVENTO ? a + gap / 2 : a + MAX_SIN_EVENTO * 0.95);
  }
  cortes.sort((a, b) => a - b);
  cortes.forEach((c, i) => ev.push({t: c, tipo: 'plano', desc: i % 2 ? 'abierto' : 'push-in', sfx: [SFX_MAP.plano[i % 2] as Sfx]}));
  ev.sort((a, b) => a.t - b.t);

  const bordes = [0, ...cortes, plan.duracion];
  const planos: Plano[] = bordes.slice(0, -1).map((ini, i) => ({ini, fin: bordes[i + 1], tipo: i % 2 ? 'abierto' : 'push', dir: (i % 4 < 2 ? 1 : -1) as 1 | -1}));

  // sonidos: máx. 2 simultáneos; si entra un tercero se recorta el más viejo
  for (const e of ev) for (const s of e.sfx) sonidos.push({t: Math.max(0, e.t), sfx: s, dur: durSfx(s)});
  sonidos.sort((a, b) => a.t - b.t);
  const finales: Sonido[] = [];
  for (const s of sonidos) {
    const activos = finales.filter((x) => x.t <= s.t && s.t < x.t + x.dur).sort((a, b) => a.t - b.t);
    while (activos.length >= 2) {
      const viejo = activos.shift()!;
      viejo.dur = s.t - viejo.t;
      viejo.recortado = true;
    }
    finales.push({...s, vol: volumenSfx(s.sfx)});
  }
  return {eventos: ev, planos, sonidos: finales.filter((x) => x.dur > 0)};
};
export type Linea = ReturnType<typeof linea>;
