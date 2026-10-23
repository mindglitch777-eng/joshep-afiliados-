// Test de espaciado de subtítulos en Chromium real: para cada frase y cada posición del resaltado,
// mide el ancho de cada palabra y de cada línea. Falla si algo varía > 1 px o si el layout difiere del navegador.
// Uso: npx tsx scripts/test-subs.ts plans/ejemplo.json samples/test-espaciado.md
import {readFileSync, writeFileSync} from 'node:fs';
import {paginaConFuente} from './medir-fuente.mjs';
import {armarFrases, SUB, textoSub} from '../src/subs-layout';
import {estiloPalabra} from '../src/piezas/Subtitulos';

const [planPath, out] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const frases = armarFrases(plan.subtitulos);
const css = (o: Record<string, unknown>) => Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${typeof v === 'number' && !/^(opacity|zIndex)$/.test(k) ? v + 'px' : v}`).join(';');

const {b, p} = await paginaConFuente();
const filas: string[] = [];
let peorPalabra = 0, peorLinea = 0, peorTabla = 0, solapes = 0;
for (const fr of frases) {
  const medidas: {anchos: number[]; lineas: number[]}[] = [];
  for (let act = 0; act < fr.cajas.length; act++) {
    const spans = fr.cajas.map((c, i) => {
      const st = {...estiloPalabra(c), fontFamily: 'M', color: i === act ? '#000' : '#fff', transform: `scale(${c.w.clave && i > act ? 0.8 : 1})`};
      return `<span style="${css(st as Record<string, unknown>)}">${textoSub(c.w)}</span>`;
    }).join('');
    const r = await p.evaluate((html) => {
      const d = document.getElementById('r')!;
      d.style.cssText = 'position:relative;width:1080px;height:1920px';
      d.innerHTML = html;
      return [...d.children].map((e) => {
        const el = e as HTMLElement, bb = el.getBoundingClientRect();
        return {x: el.offsetLeft, w: el.offsetWidth, y: el.offsetTop, vx: bb.left, vw: bb.width};
      });
    }, spans);
    // líneas: agrupa por y; ancho de línea = derecha de la última − izquierda de la primera
    const ys = [...new Set(r.map((s) => s.y))];
    const lineas = ys.map((y) => { const l = r.filter((s) => s.y === y); return l[l.length - 1].x + l[l.length - 1].w - l[0].x; });
    for (let i = 1; i < r.length; i++) if (r[i].y === r[i - 1].y && r[i].vx < r[i - 1].vx + r[i - 1].vw) solapes++;
    r.forEach((s, i) => (peorTabla = Math.max(peorTabla, Math.abs(s.w - fr.cajas[i].ancho))));
    medidas.push({anchos: r.map((s) => s.w), lineas});
  }
  const dPal = Math.max(...fr.cajas.map((_, i) => Math.max(...medidas.map((m) => m.anchos[i])) - Math.min(...medidas.map((m) => m.anchos[i]))));
  const dLin = Math.max(...medidas[0].lineas.map((_, i) => Math.max(...medidas.map((m) => m.lineas[i])) - Math.min(...medidas.map((m) => m.lineas[i]))));
  peorPalabra = Math.max(peorPalabra, dPal);
  peorLinea = Math.max(peorLinea, dLin);
  filas.push(`| ${fr.palabras.map(textoSub).join(' ')} | ${fr.cajas.length} | ${medidas[0].lineas.map((x) => x.toFixed(1)).join(' / ')} | ${dPal.toFixed(2)} | ${dLin.toFixed(2)} |`);
}
await b.close();
const ok = peorPalabra <= 1 && peorLinea <= 1 && peorTabla <= 1 && !solapes;
const md = [
  '# Test de espaciado de subtítulos',
  '',
  `Fuente Montserrat 900 en Chromium, ${SUB.fs} px (claves ×${SUB.clave}), gap ${SUB.gap}em, letter-spacing +${SUB.ls}em. Se probó el resaltado en cada posición de cada frase.`,
  '',
  `- Variación máx. de ancho de palabra: **${peorPalabra.toFixed(2)} px** ${peorPalabra <= 1 ? '✅' : '❌'}`,
  `- Variación máx. de ancho de línea: **${peorLinea.toFixed(2)} px** ${peorLinea <= 1 ? '✅' : '❌'}`,
  `- Diferencia máx. layout calculado vs navegador: **${peorTabla.toFixed(2)} px** ${peorTabla <= 1 ? '✅' : '❌'}`,
  `- Palabras que se pisan: **${solapes}** ${solapes ? '❌' : '✅'}`,
  '',
  '| frase | posiciones | ancho de línea(s) px | Δ palabra | Δ línea |',
  '|---|---|---|---|---|',
  ...filas,
].join('\n');
writeFileSync(out, md + '\n');
console.log(md.split('\n').slice(4, 8).join('\n'));
process.exit(ok ? 0 : 1);
