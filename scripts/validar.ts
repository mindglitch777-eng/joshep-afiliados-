// Validador del plan: ritmo (ningún tramo > 1.5 s sin evento), largo de textos y zona segura.
// Uso: npx tsx scripts/validar.ts work/plan.json work/validacion.json   (avisa; no corta el render)
import {readFileSync, writeFileSync} from 'node:fs';
import brand from '../config/brand.json';
import {linea, MAX_SIN_EVENTO} from '../src/linea';
import {Plan} from '../src/plan';
import {armarFrases, fraseOculta, textoSub} from '../src/subs-layout';
import {camaraEn, pistaCara} from '../src/camara';
import {layoutDelPlan, LH_GANCHO} from '../src/gancho-layout';
import {area, inter, Rect, rectBloque, rectSticker, tocan, zonasCara, altoComparacion, altoLista, BORDE_INF, X_MAX} from '../src/geometria';
import hookCfg from '../config/hook.json';
import flashCfg from '../config/flash.json';
import {packDe} from '../src/estilos';
import {SEGURA} from '../src/theme';

const [planPath, out] = process.argv.slice(2);
const plan: Plan = JSON.parse(readFileSync(planPath, 'utf8'));
const fps = plan.fps ?? brand.fps;
const {eventos, sonidos} = linea(plan, fps);
const L = brand.limites_caracteres;
const avisos: string[] = [];

const ts = [0, ...eventos.map((e) => e.t), plan.duracion].sort((a, b) => a - b);
const huecos = ts.slice(1).map((t, i) => ({desde: +ts[i].toFixed(2), hasta: +t.toFixed(2)})).filter((h) => h.hasta - h.desde > MAX_SIN_EVENTO + 1e-9);
huecos.forEach((h) => avisos.push(`Ritmo: ${h.desde}–${h.hasta} s sin evento visual`));

const largo = (tipo: string, txt: string, max: number) => txt.length > max && avisos.push(`Texto largo (${tipo}, ${txt.length}/${max}): «${txt}»`);
for (const p of plan.piezas) {
  if (p.tipo === 'gancho') largo('gancho', p.texto, L.gancho);
  if (p.tipo === 'comparacion') { largo('tarjeta', p.mal, L.tarjeta); largo('tarjeta', p.bien, L.tarjeta); }
  if (p.tipo === 'pasos') { p.pasos.forEach((x) => largo('ítem', x, L.item)); if (p.titulo) largo('título', p.titulo, L.titulo); }
  if (p.tipo === 'enfasis') largo('énfasis', p.palabra, L.enfasis);
}
// zona segura de subtítulos: cada palabra dentro de los márgenes y con tamaño legible
const fuera: string[] = [];
for (const fr of armarFrases(plan.subtitulos)) {
  for (const c of fr.cajas) {
    if (c.x < SEGURA.izq - 0.5 || c.x + c.ancho > X_MAX + 0.5 || c.y < SEGURA.arriba || c.y + c.alto > BORDE_INF + 0.5) fuera.push(textoSub(c.w));
    if (c.fs < 70) avisos.push(`Subtítulo achicado a ${c.fs.toFixed(0)} px para entrar: «${fr.palabras.map(textoSub).join(' ')}»`);
  }
}
if (fuera.length) avisos.push(`Fuera de zona segura: ${fuera.join(', ')}`);

// ── Solape con la cara, cuadro por cuadro ──
const tieneCara = (plan.cara ?? []).length > 0;
const N = Math.round(plan.duracion * fps);
const pista = pistaCara(plan, fps, N);
const lin = linea(plan, fps), {planos} = lin;
const lay = layoutDelPlan(plan, planos, pista, fps);
const g = plan.piezas.find((p) => p.tipo === 'gancho');
const frases = armarFrases(plan.subtitulos);
const iconos = eventos.filter((e) => e.tipo === 'ícono');
const cnt = {gancho: [0, 0, 0], subs: [0, 0], iconos: [0, 0, 0], tarjetas: [0, 0]};
let mentonMin = Infinity, mentonMal = 0; // [cuadros activos, solapes...]
const A = hookCfg.asentamiento;
for (let fr = 0; fr < N; fr++) {
  const t = fr / fps;
  const cam = camaraEn(plan, planos, pista, fps, fr, lay?.bajada ?? 0, lin);
  const z = zonasCara(cam.cara);
  if (lay && g && t < g.hasta) {
    const k = fr < A.frames ? A.escala_desde + (1 - A.escala_desde) * (fr / A.frames) : 1, oy = lay.top + lay.alto / 2, ox = 512;
    const rs: Rect[] = lay.palabras.map((p) => ({x0: ox + (p.x - ox) * k, x1: ox + (p.x + p.ancho - ox) * k, y0: oy + (p.y - oy) * k, y1: oy + (p.y + lay.fs * LH_GANCHO - oy) * k}));
    cnt.gancho[0]++;
    if (rs.some((r) => tocan(r, z.ojos))) cnt.gancho[1]++;
    if (rs.some((r) => tocan(r, z.boca))) cnt.gancho[2]++;
  }
  const fz = frases.find((x) => fr >= x.ini * fps - 2 && fr < x.fin * fps + 3);
  if (fz && !fraseOculta(plan, fps, t, fz)) {
    cnt.subs[0]++;
    // mentón (con barba) ≥ 24 px sobre el borde superior del subtítulo
    const gapM = Math.min(...fz.cajas.map((c) => c.y)) - cam.cara.menton;
    mentonMin = Math.min(mentonMin, gapM);
    if (gapM < hookCfg.subtitulos.aire_menton) mentonMal++;
    if (fz.cajas.some((c) => tocan({x0: c.x, x1: c.x + c.ancho, y0: c.y, y1: c.y + c.alto}, z.boca) || tocan({x0: c.x, x1: c.x + c.ancho, y0: c.y, y1: c.y + c.alto}, z.menton))) cnt.subs[1]++;
  }
  iconos.forEach((e, i) => {
    if (t < e.t || t >= e.t + 1.4) return;
    cnt.iconos[0]++;
    const r = rectSticker(cam.cara, i % 2 ? -1 : 1);
    if (!r) cnt.iconos[2]++;
    else if (tocan(r, z.cara)) cnt.iconos[1]++;
  });
  for (const p of plan.piezas) {
    if ((p.tipo !== 'comparacion' && p.tipo !== 'pasos') || t < p.desde || t >= p.hasta) continue;
    cnt.tarjetas[0]++;
    const caras = Array.from({length: Math.ceil(((p.hasta - p.desde) * fps) / 6)}, (_, i) => camaraEn(plan, planos, pista, fps, p.desde * fps + i * 6, lay?.bajada ?? 0, lin).cara);
    const r = rectBloque(caras, p.tipo === 'comparacion' ? altoComparacion : altoLista(p.pasos.length, !!p.titulo));
    if (tocan(r, z.ojos) || tocan(r, z.boca)) cnt.tarjetas[1]++;
    if (r.y1 > BORDE_INF + 0.5 || r.x1 > X_MAX + 0.5) avisos.push(`Tarjeta fuera del límite (y ${r.y1.toFixed(0)}, x ${r.x1.toFixed(0)})`);
  }
}
const pct = (a: number, b: number) => (b ? +((100 * a) / b).toFixed(1) : 0);
const solape = {
  medido_con_cara: tieneCara,
  gancho_sobre_ojos_pct: pct(cnt.gancho[1], cnt.gancho[0]), gancho_sobre_boca_pct: pct(cnt.gancho[2], cnt.gancho[0]),
  subtitulos_sobre_boca_o_menton_pct: pct(cnt.subs[1], cnt.subs[0]),
  iconos_sobre_cara_pct: pct(cnt.iconos[1], cnt.iconos[0]), iconos_omitidos_por_falta_de_lugar: iconos.length ? pct(cnt.iconos[2], cnt.iconos[0]) : 0,
  tarjetas_sobre_ojos_o_boca_pct: pct(cnt.tarjetas[1], cnt.tarjetas[0]),
};
const mentonSub = {aire_min_px: Number.isFinite(mentonMin) ? +mentonMin.toFixed(0) : null, cuadros_con_menos_de_24px: mentonMal, ok: mentonMal === 0};
// flashes: seguridad (≥ 4 s entre flashes, ≤ 3 por segundo)
const fl = lin.flashes;
const flash = {tiempos_s: fl, ok: fl.every((t, i) => i === 0 || t - fl[i - 1] >= flashCfg.seguridad.min_intervalo_s), cuadro0: fl.includes(0)};
const meta = mentonSub.ok && solape.gancho_sobre_ojos_pct === 0 && solape.gancho_sobre_boca_pct === 0 && solape.iconos_sobre_cara_pct === 0 && solape.subtitulos_sobre_boca_o_menton_pct === 0;
// "sin sonido": cuadro 0 con el gancho completo visible y legible
const cuadro0 = !!(lay && g && g.desde === 0 && lay.entra && lay.palabras.every((p) => p.x >= 0 && p.x + p.ancho <= 1080 && p.y >= 0));
const primerSonido = sonidos.length ? +sonidos[0].t.toFixed(3) : null;
const gancho = lay && g && g.tipo === 'gancho' ? {texto: g.texto, variante: g.variante, tam_px: lay.fs, lineas: new Set(lay.palabras.map((p) => p.y)).size, top: +lay.top.toFixed(0),
  borde_inferior: +(lay.top + lay.alto).toFixed(0), bajada_video_px: +lay.bajada.toFixed(0), relacion_vs_subtitulo: +(lay.fs / brand.subtitulos.tam).toFixed(2)} : null;
if (gancho && gancho.relacion_vs_subtitulo < hookCfg.texto.relacion_min_subtitulo) avisos.push(`Gancho ${gancho.tam_px} px = ${gancho.relacion_vs_subtitulo}x del subtítulo (meta ≥ ${hookCfg.texto.relacion_min_subtitulo}x)`);
if (!cuadro0) avisos.push('Cuadro 0: el gancho no entra completo');

const res = {duracion: plan.duracion, eventos: eventos.length, sonidos: sonidos.length, huecos_mayores_1_5s: huecos, textos_fuera_zona_segura: fuera, solape_cara: solape, menton_vs_subtitulo: mentonSub, metas_solape_ok: meta, flash, style_pack: packDe(plan).nombre, cuadro0_gancho_completo: cuadro0, primer_sonido_s: primerSonido, gancho,
  avisos: [...new Set(avisos)], linea_de_tiempo: eventos.map((e) => ({t: +e.t.toFixed(2), tipo: e.tipo, detalle: e.desc, sonido: e.sfx}))};
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(`eventos ${eventos.length}, huecos > 1.5 s: ${huecos.length}, avisos: ${res.avisos.length}`);
res.avisos.forEach((a) => console.log(' ⚠', a));
