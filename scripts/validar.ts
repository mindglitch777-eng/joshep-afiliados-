// Validador del plan: ritmo (ningún tramo > 1.5 s sin evento), largo de textos y zona segura.
// Uso: npx tsx scripts/validar.ts work/plan.json work/validacion.json   (avisa; no corta el render)
import {readFileSync, writeFileSync} from 'node:fs';
import brand from '../config/brand.json';
import {linea, MAX_SIN_EVENTO} from '../src/linea';
import {Plan} from '../src/plan';
import {armarFrases, textoSub} from '../src/subs-layout';
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
    if (c.x < SEGURA.izq - 0.5 || c.x + c.ancho > 1080 - SEGURA.der + 0.5 || c.y < SEGURA.arriba || c.y + c.alto > 1920 - SEGURA.abajo) fuera.push(textoSub(c.w));
    if (c.fs < 70) avisos.push(`Subtítulo achicado a ${c.fs.toFixed(0)} px para entrar: «${fr.palabras.map(textoSub).join(' ')}»`);
  }
}
if (fuera.length) avisos.push(`Fuera de zona segura: ${fuera.join(', ')}`);

const res = {duracion: plan.duracion, eventos: eventos.length, sonidos: sonidos.length, huecos_mayores_1_5s: huecos, textos_fuera_zona_segura: fuera,
  avisos: [...new Set(avisos)], linea_de_tiempo: eventos.map((e) => ({t: +e.t.toFixed(2), tipo: e.tipo, detalle: e.desc, sonido: e.sfx}))};
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(`eventos ${eventos.length}, huecos > 1.5 s: ${huecos.length}, avisos: ${res.avisos.length}`);
res.avisos.forEach((a) => console.log(' ⚠', a));
