// Reporte de ritmo: eventos visuales + sonidos de la línea de tiempo (la misma que usa el render).
// Uso: npx tsx scripts/ritmo.ts plans/ejemplo.json samples/reporte-ritmo.md
import {readFileSync, writeFileSync} from 'node:fs';
import {linea, MAX_SIN_EVENTO} from '../src/linea';
import {Plan} from '../src/plan';

const [planPath, out] = process.argv.slice(2);
const plan: Plan = JSON.parse(readFileSync(planPath, 'utf8'));
const fps = plan.fps ?? 30;
const {eventos, sonidos} = linea(plan, fps);
const s2 = (x: number) => x.toFixed(2);

const ts = [0, ...eventos.map((e) => e.t), plan.duracion].sort((a, b) => a - b);
const tramos = ts.slice(1).map((t, i) => ({desde: ts[i], hasta: t, dur: t - ts[i]}));
const peor = tramos.reduce((a, b) => (b.dur > a.dur ? b : a));
const sinSonido = eventos.filter((e) => !sonidos.some((s) => Math.abs(s.t - Math.max(0, e.t)) < 1e-6 && e.sfx.includes(s.sfx)));
let maxSim = 0;
for (const s of sonidos) maxSim = Math.max(maxSim, sonidos.filter((x) => x.t <= s.t && s.t < x.t + x.dur).length);

const ok = peor.dur <= MAX_SIN_EVENTO + 1e-9 && !sinSonido.length && maxSim <= 2;
const md = [
  `# Reporte de ritmo — ${planPath}`,
  '',
  `- Eventos visuales: **${eventos.length}** · sonidos: **${sonidos.length}** en ${plan.duracion} s`,
  `- Tramo más largo sin evento: **${s2(peor.dur)} s** (${s2(peor.desde)}–${s2(peor.hasta)}) → límite ${MAX_SIN_EVENTO} s: ${peor.dur <= MAX_SIN_EVENTO + 1e-9 ? '✅' : '❌'}`,
  `- Eventos sin sonido: ${sinSonido.length ? '❌ ' + sinSonido.map((e) => e.tipo + '@' + s2(e.t)).join(', ') : '✅ ninguno'}`,
  `- Máx. sonidos simultáneos: **${maxSim}** ${maxSim <= 2 ? '✅' : '❌'}`,
  '',
  '| t (s) | evento | detalle | sonido |',
  '|---|---|---|---|',
  ...eventos.map((e) => `| ${s2(e.t)} | ${e.tipo} | ${e.desc} | ${e.sfx.join(' + ')} |`),
  '',
  '## Sonidos (inicio, duración, volumen)',
  '| t (s) | sfx | dur (s) | vol (dB) |',
  '|---|---|---|---|',
  ...sonidos.map((s) => `| ${s2(s.t)} | ${s.sfx}${s.recortado ? ' (recortado)' : ''} | ${s2(s.dur)} | ${(20 * Math.log10(s.vol)).toFixed(1)} |`),
].join('\n');
writeFileSync(out, md + '\n');
writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({eventos, sonidos}, null, 1));
console.log(md.split('\n').slice(2, 7).join('\n'));
process.exit(ok ? 0 : 1);
