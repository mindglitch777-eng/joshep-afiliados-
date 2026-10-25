// Stories de CTA (1080x1920) con Joseph + el libro. Uso: node stories.js <dir_fotos> <salida>
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , fotos, out] = process.argv;
const FONT = '/home/user/joshep-afiliados-/public/fonts';
const P = {
  urgencia: ['#120708', '#3A0A10', '#FF3B4E', '#fff'], energia: ['#0E0E10', '#2A2405', '#FFD60A', '#0B0B0F'],
  confianza: ['#061224', '#0E3160', '#4CC9F0', '#06121F'], misterio: ['#12061E', '#341062', '#B388FF', '#12061E'],
  calidez: ['#170B04', '#452006', '#FF8A00', '#170B04'], deseo: ['#16040D', '#4A0C27', '#FF4D6D', '#fff'],
  crecimiento: ['#03130C', '#0C3A24', '#2DE38B', '#03130C'],
};
// pregunta que duele → promesa → libro → acción
const S = [
  {pal: 'urgencia', foto: 'r21_4.jpg', t: '¿Otra cita que se <b>enfrió</b> sin saber por qué?', p: 'Hay errores que ella nota en los primeros minutos.'},
  {pal: 'energia', foto: 'r22_5.jpg', t: '¿Te quedás <b>en blanco</b> cuando te gusta alguien?', p: 'Qué decir, cuándo avanzar y cuándo callar.'},
  {pal: 'misterio', foto: 'r30_5.jpg', t: 'Chateás hace semanas y <b>nunca</b> la invitás', p: 'Pasá del chat a una cita real.'},
  {pal: 'deseo', foto: 'r13_1.jpg', t: '¿Le gustás o es <b>amable</b>?', p: 'Aprendé a leer el interés real.'},
  {pal: 'confianza', foto: 'r05_5.jpg', t: 'La seguridad <b>no se finge</b>: se practica', p: 'Pasos concretos para empezar hoy.'},
  {pal: 'calidez', foto: 'r16_1.jpg', t: 'Dejá de ser <b>el amigo</b> que la ayuda en todo', p: 'Conectá sin perder atracción.'},
  {pal: 'crecimiento', foto: 'r20_1.jpg', t: 'Menos videos. <b>Más acción.</b>', p: 'Una guía para pasar de la teoría a la práctica.'},
  {pal: 'urgencia', foto: 'r24_1.jpg', t: 'Ella decide en la <b>primera cita</b> si quiere otra', p: 'Sabé qué comunicar en cada momento.'},
  {pal: 'misterio', foto: 'r10_1.jpg', t: 'No te conformes con <b>cualquiera</b>', p: 'Elegí con criterio y atraé a quien te gusta.'},
  {pal: 'energia', foto: 'r12_4.jpg', t: 'Empezá de cero. <b>Avanzá a tu ritmo.</b>', p: 'Leé · probá · ajustá.'},
];
const html = (s) => {
  const [b1, b2, ac, ink] = P[s.pal];
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:M;font-weight:800;src:url(file://${FONT}/montserrat-latin-800-normal.woff2)}
@font-face{font-family:M;font-weight:900;src:url(file://${FONT}/montserrat-latin-900-normal.woff2)}
*{margin:0;padding:0;box-sizing:border-box}body{width:1080px;height:1920px;overflow:hidden;font-family:M,sans-serif;color:#fff;background:${b1};position:relative}
.ph{position:absolute;left:0;top:0;width:1080px;height:1150px;object-fit:cover;object-position:50% 40%}
.sh{position:absolute;left:0;top:0;width:1080px;height:1160px;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 25%,${b1}00 55%,${b1} 100%)}
.bg{position:absolute;left:0;right:0;top:1150px;bottom:0;background:radial-gradient(120% 80% at 80% 0%,${b2} 0%,${b1} 70%)}
.t{position:absolute;left:72px;right:72px;top:250px;font-weight:900;font-size:92px;line-height:1.08;text-transform:uppercase;text-shadow:0 6px 30px rgba(0,0,0,.6)}
.t b{background:${ac};color:${ink};padding:0 14px;border-radius:16px;-webkit-box-decoration-break:clone;box-decoration-break:clone;text-shadow:none}
.row{position:absolute;left:72px;right:72px;top:1010px;display:flex;gap:40px;align-items:center}
.bk{width:360px;height:560px;object-fit:contain;filter:drop-shadow(0 30px 50px rgba(0,0,0,.7)) drop-shadow(0 0 50px ${ac}66)}
.r{flex:1}.ti{font-weight:900;font-size:62px;line-height:1;color:${ac};margin-bottom:22px}.p{font-weight:800;font-size:40px;line-height:1.25}
.bt{position:absolute;left:72px;right:72px;top:1640px;height:150px;border-radius:999px;background:${ac};color:${ink};font-weight:900;font-size:60px;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px ${ac}66}
.af{position:absolute;left:72px;right:72px;top:1810px;text-align:center;font-weight:800;font-size:24px;color:rgba(255,255,255,.55)}
</style></head><body><div class="bg"></div><img class="ph" src="file://${path.resolve(fotos, s.foto)}"><div class="sh"></div>
<div class="t">${s.t}</div>
<div class="row"><img class="bk" src="file://${path.resolve(fotos, 'libro.png')}"><div class="r"><div class="ti">SEDUCTOR<br>DESDE CERO</div><div class="p">${s.p}</div></div></div>
<div class="bt">LINK EN MI PERFIL ↗</div><div class="af">Enlace de afiliado</div></body></html>`;
};
(async () => {
  fs.mkdirSync(out, {recursive: true});
  const b = await chromium.launch();
  const pg = await b.newPage({viewport: {width: 1080, height: 1920}});
  for (let i = 0; i < S.length; i++) {
    const f = path.resolve(out, 'tmp.html');
    fs.writeFileSync(f, html(S[i]));
    await pg.goto('file://' + f);
    await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(80);
    await pg.screenshot({path: path.join(out, `story-${String(i + 1).padStart(2, '0')}.png`)});
  }
  fs.unlinkSync(path.resolve(out, 'tmp.html'));
  await b.close();
  console.log(S.length, 'stories');
})();
