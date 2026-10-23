// Mide el ancho de cada carácter de Montserrat 900 en Chromium (kerning apagado) → src/anchos.json.
// Con kerning apagado, ancho de palabra = suma exacta de anchos + letter-spacing.
import {chromium} from 'playwright-core';
import {readFileSync, writeFileSync} from 'node:fs';

export const CHROMIUM = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
export const paginaConFuente = async () => {
  const b = await chromium.launch({executablePath: CHROMIUM});
  const p = await b.newPage();
  const woff = readFileSync('public/fonts/montserrat-latin-900-normal.woff2').toString('base64');
  await p.setContent(`<style>@font-face{font-family:M;font-weight:900;src:url(data:font/woff2;base64,${woff})}
    body{margin:0;font-family:M;font-weight:900;font-kerning:none;font-feature-settings:"kern" 0,"liga" 0;white-space:pre}</style><div id=r></div>`);
  await p.evaluate(() => document.fonts.load('900 100px M'));
  return {b, p};
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const {b, p} = await paginaConFuente();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÜÑ0123456789¿?¡!.,:;-\'"% ';
  const anchos = await p.evaluate((cs) => {
    const s = document.createElement('span');
    s.style.fontSize = '1000px';
    document.body.appendChild(s);
    const out = {};
    for (const c of cs) { s.textContent = c; out[c] = s.getBoundingClientRect().width / 1000; }
    return out;
  }, chars);
  writeFileSync('src/anchos.json', JSON.stringify(anchos));
  console.log('ok', Object.keys(anchos).length, 'caracteres; M =', anchos.M.toFixed(3), 'em');
  await b.close();
}
