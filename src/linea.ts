import {Plan} from './plan';
import {durSfx, Sfx, SFX_MAP, volumenSfx} from './sfx-map';
import {packDe} from './estilos';
import flashCfg from '../config/flash.json';

// Línea de tiempo única: de acá salen la cámara, los sonidos y el reporte de ritmo.
export const MAX_SIN_EVENTO = 1.5;
export type Evento = {t: number; tipo: string; desc: string; sfx: Sfx[]};
export type Sonido = {t: number; sfx: Sfx; dur: number; vol: number; recortado?: boolean};
export type Plano = {ini: number; fin: number; tipo: 'push' | 'abierto'; dir: 1 | -1};

const norm = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñü]/g, '');

export const linea = (plan: Plan, fps: number) => {
  const ev: Evento[] = [];
  const pack = packDe(plan);
  const fr = (n: number) => n / fps;
  const piezaEn = (t: number) => plan.piezas.find((p) => t >= p.desde && t < p.hasta);
  const enfasis = plan.piezas.filter((p) => p.tipo === 'enfasis');
  const sonidos: Omit<Sonido, 'vol'>[] = [];

  for (const p of plan.piezas) {
    if (p.tipo === 'gancho') {
      ev.push({t: p.desde, tipo: 'gancho', desc: p.texto, sfx: SFX_MAP.gancho});
      sonidos.push({t: Math.max(0, p.hasta - durSfx('riser')), sfx: 'riser', dur: durSfx('riser')});
      if (p.clave) ev.push({t: 0.2, tipo: 'caja del gancho', desc: p.clave, sfx: SFX_MAP.cajaGancho});
    }
    if (p.tipo === 'comparacion') {
      ev.push({t: p.desde, tipo: 'tarjeta ✗', desc: p.mal, sfx: SFX_MAP.tarjetaMal});
      ev.push({t: p.desde + fr(8), tipo: 'tarjeta ✓', desc: p.bien, sfx: SFX_MAP.tarjetaBien});
      ev.push({t: p.desde + fr(14), tipo: 'tachado', desc: 'se dibuja', sfx: SFX_MAP.tachado});
    }
    if (p.tipo === 'pasos') {
      ev.push({t: p.desde, tipo: 'lista', desc: p.titulo ?? '', sfx: SFX_MAP.lista});
      p.pasos.forEach((x, i) => ev.push({t: p.tiempos?.[i] ?? p.desde + 0.3 + i * 0.5, tipo: 'ítem', desc: x, sfx: SFX_MAP.item}));
      if (p.cierre && p.cierreEn !== undefined) ev.push({t: p.cierreEn, tipo: 'cierre de lista', desc: p.cierre, sfx: SFX_MAP.clave});
    }
    if (p.tipo === 'curva') {
      ev.push({t: p.desde, tipo: 'curva', desc: 'se dibuja', sfx: SFX_MAP.grafico});
      ev.push({t: p.marcaAlto, tipo: 'marca alta', desc: p.alto, sfx: SFX_MAP.clave});
      ev.push({t: p.marcaBajo, tipo: 'marca baja', desc: p.bajo, sfx: SFX_MAP.tarjetaMal});
      if (p.medio && p.marcaMedio !== undefined) ev.push({t: p.marcaMedio, tipo: 'marca media', desc: p.medio, sfx: SFX_MAP.item});
      if (p.numero && p.numeroEn !== undefined) ev.push({t: p.numeroEn, tipo: 'número', desc: `${p.numero} ${p.unidad ?? ''}`, sfx: SFX_MAP.numero});
    }
    if (p.tipo === 'numero') ev.push({t: p.desde, tipo: 'número', desc: `${p.valor} ${p.unidad ?? ''}`, sfx: SFX_MAP.numero});
    if (p.tipo === 'escena') {
      ev.push({t: p.desde, tipo: 'escena', desc: p.escena, sfx: SFX_MAP.grafico});
      (p.tiempos ?? []).forEach((x, i, xs) => ev.push({t: x, tipo: 'escena: paso', desc: `${p.escena} ${i + 1}`,
        sfx: p.escena === 'jarron' ? (i === xs.length - 1 ? SFX_MAP.escenaFinal : SFX_MAP.escenaGolpe) : i === xs.length - 1 ? SFX_MAP.tarjetaBien : SFX_MAP.item}));
    }
    if (p.tipo === 'ecuacion') {
      const terminos = p.bloques.filter((b) => !['+', '=', '≠'].includes(b));
      (p.tiempos ?? [p.desde]).forEach((x, i) => ev.push({t: x, tipo: 'ecuación', desc: terminos[i] ?? '', sfx: i === terminos.length - 1 ? SFX_MAP.clave : SFX_MAP.item}));
    }
    if (p.tipo === 'inserto' || p.tipo === 'imagen') ev.push({t: p.desde, tipo: p.tipo, desc: p.archivo.split('/').pop() ?? '', sfx: SFX_MAP.inserto});
    if (p.tipo === 'cta') ev.push({t: p.desde, tipo: 'CTA', desc: p.archivo.split('/').pop() ?? '', sfx: SFX_MAP.cta});
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

  // flash de exposición: en el cuadro 0 y (opcional) en cambios de sección; seguridad: ≥ 4 s entre flashes, ≤ 3 por segundo
  const flashes: number[] = [];
  const F = flashCfg;
  if (F.activo) {
    const cand = [...(pack.flash.arranque ? [0] : []),
      ...((F.secciones.activo && pack.flash.secciones) ? plan.piezas.filter((p) => p.tipo === 'comparacion' || p.tipo === 'pasos').map((p) => p.desde).slice(0, F.secciones.max_por_clip) : [])];
    for (const t of cand) {
      if (flashes.every((x) => Math.abs(t - x) >= F.seguridad.min_intervalo_s) && flashes.filter((x) => Math.abs(t - x) < 1).length < F.seguridad.max_por_segundo) flashes.push(t);
    }
  }
  for (const t of flashes) ev.push({t, tipo: 'flash', desc: 'exposición', sfx: SFX_MAP.flash});

  // cortes de plano: cada ~2.5–3.2 s (pack "largos": cada ~5.5 s), pegados a un jump cut cercano si hay, fuera de las ventanas de énfasis
  const enVentana = (t: number) => enfasis.some((e) => t > e.desde - 0.4 && t < e.hasta + 0.5);
  const cortes: number[] = [];
  const largos = pack.camara.planos === 'largos';
  for (let t = largos ? 5.5 : 2, k = 0; t < plan.duracion - 1; t += largos ? 5.5 : k++ % 2 ? 3.2 : 2.5) {
    const cerca = jumps.filter((j) => Math.abs(j - t) <= 0.6).sort((a, b) => Math.abs(a - t) - Math.abs(b - t))[0];
    let c = cerca ?? t;
    while (enVentana(c)) c += 0.1;
    if (c < plan.duracion - 1) cortes.push(c);
    t = c;
  }
  // relleno: ningún tramo > 1.5 s sin evento visual (corte de plano, o "pulso" de zoom en los packs sin cortes)
  const pulsos: number[] = [];
  const tiempos = () => [...ev.map((e) => e.t), ...cortes, ...pulsos, 0, plan.duracion].sort((a, b) => a - b);
  for (let guard = 0; guard < 100; guard++) {
    const ts = tiempos();
    const i = ts.findIndex((t, j) => j > 0 && t - ts[j - 1] > MAX_SIN_EVENTO);
    if (i < 0) break;
    const a = ts[i - 1], gap = ts[i] - a;
    const t = gap <= 2 * MAX_SIN_EVENTO ? a + gap / 2 : a + MAX_SIN_EVENTO * 0.95;
    (pack.camara.relleno_ritmo === 'pulso' ? pulsos : cortes).push(t);
  }
  for (const t of pulsos) ev.push({t, tipo: 'pulso', desc: 'zoom +2%', sfx: [pack.sfx.pulso[0]]});
  cortes.sort((a, b) => a - b);
  const abierto = (i: number) => pack.camara.abierto && i % 2 === 1;
  cortes.forEach((c, i) => ev.push({t: c, tipo: 'plano', desc: `${abierto(i + 1) ? 'abierto' : 'push-in'} · ${pack.transicion}`, sfx: [pack.sfx.plano[i % pack.sfx.plano.length]]}));
  ev.sort((a, b) => a.t - b.t);

  const bordes = [0, ...cortes, plan.duracion];
  const planos: Plano[] = bordes.slice(0, -1).map((ini, i) => ({ini, fin: bordes[i + 1], tipo: abierto(i) ? 'abierto' : 'push', dir: (i % 4 < 2 ? 1 : -1) as 1 | -1}));

  // sonidos: máx. 2 simultáneos; si entra un tercero se recorta el más viejo
  // el sonido de cámara va ~60 ms después del cuadro 0 (config/flash.json → retraso_sonido)
  for (const e of ev) for (const s of e.sfx) sonidos.push({t: Math.max(0, e.t + (e.tipo === 'flash' ? F.retraso_sonido ?? 0 : 0)), sfx: s, dur: durSfx(s)});
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
  return {eventos: ev, planos, flashes, pulsos, sonidos: finales.filter((x) => x.dur > 0)};
};
export type Linea = ReturnType<typeof linea>;
