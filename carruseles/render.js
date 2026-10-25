// Renderiza los 15 carruseles (7 placas de 1080x1350 cada uno) con Chromium.
// Uso: node render.js <carruseles.json> <dir_fotos> <salida> [solo_id]
const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , jsonPath, fotos, out, solo] = process.argv;
const FONT = '/home/user/joshep-afiliados-/public/fonts';

const PAL = {
  urgencia: {bg1: '#120708', bg2: '#3A0A10', ac: '#FF3B4E', ink: '#fff'},
  energia: {bg1: '#0E0E10', bg2: '#2A2405', ac: '#FFD60A', ink: '#0B0B0F'},
  confianza: {bg1: '#061224', bg2: '#0E3160', ac: '#4CC9F0', ink: '#06121F'},
  misterio: {bg1: '#12061E', bg2: '#341062', ac: '#B388FF', ink: '#12061E'},
  calidez: {bg1: '#170B04', bg2: '#452006', ac: '#FF8A00', ink: '#170B04'},
  deseo: {bg1: '#16040D', bg2: '#4A0C27', ac: '#FF4D6D', ink: '#fff'},
  crecimiento: {bg1: '#03130C', bg2: '#0C3A24', ac: '#2DE38B', ink: '#03130C'},
};

const css = (p) => `
@font-face{font-family:M;font-weight:800;src:url(file://${FONT}/montserrat-latin-800-normal.woff2)}
@font-face{font-family:M;font-weight:900;src:url(file://${FONT}/montserrat-latin-900-normal.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;overflow:hidden;font-family:M,sans-serif;color:#fff;
 background:radial-gradient(120% 90% at 85% 0%, ${p.bg2} 0%, ${p.bg1} 62%);position:relative}
.top{position:absolute;top:56px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:26px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.7)}
.pill{background:${p.ac};color:${p.ink};padding:10px 22px;border-radius:999px;letter-spacing:.1em}
.foot{position:absolute;bottom:56px;left:72px;right:72px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:26px;color:rgba(255,255,255,.65)}
.dots{display:flex;gap:10px}.dots i{width:14px;height:14px;border-radius:7px;background:rgba(255,255,255,.25)}.dots i.on{background:${p.ac};width:40px}
b{color:${p.ac}}
.hl b{background:${p.ac};color:${p.ink};padding:0 14px;border-radius:14px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.wrap{position:absolute;left:72px;right:72px;top:170px;bottom:150px;display:flex;flex-direction:column;justify-content:center}
.kicker{font-weight:900;font-size:34px;letter-spacing:.14em;text-transform:uppercase;color:${p.ac};margin-bottom:36px}
`;

const dots = (n) => `<div class="dots">${Array.from({length: 7}, (_, i) => `<i class="${i === n ? 'on' : ''}"></i>`).join('')}</div>`;
const marco = (p, n, body, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${css(p)}${extra}</style></head><body>${body}
<div class="foot">${dots(n)}<span>${n < 6 ? 'Deslizá →' : 'Seductor desde Cero'}</span></div></body></html>`;
const img = (f) => 'file://' + path.resolve(fotos, f);

const placas = (c) => {
  const p = PAL[c.paleta];
  let n = 0;
  const top = (t) => `<div class="top"><span class="pill">${t}</span><span>${++n}/7</span></div>`;
  return [
    // 1 portada: Joseph a sangre + gancho
    marco(p, 0, `<img class="ph" src="${img(c.foto1)}"><div class="sh"></div>${top('Situación real')}
      <div class="hook hl">${c.gancho}</div>`,
      `.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 46%}
       .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 38%,${p.bg1}EE 66%,${p.bg1} 100%)}
       .hook{position:absolute;left:72px;right:72px;bottom:150px;font-weight:900;font-size:84px;line-height:1.12;text-transform:uppercase;letter-spacing:-.01em;text-shadow:0 6px 24px rgba(0,0,0,.5)}`),
    // 2 la escena
    marco(p, 1, `${top('La escena')}<div class="wrap">${c.situacion.map((s, i) => `<div class="ln ${i === c.situacion.length - 1 ? 'last' : ''}">${s}</div>`).join('')}</div>`,
      `.ln{font-weight:800;font-size:54px;line-height:1.22;padding:28px 34px;margin:12px 0;border-radius:28px;background:rgba(255,255,255,.07);border-left:10px solid rgba(255,255,255,.25)}
       .ln.last{background:${p.ac}22;border-left-color:${p.ac};font-weight:900}`),
    // 3 el error
    marco(p, 2, `${top('El error')}<div class="wrap"><div class="x">✕</div><div class="t">${c.error.titulo}</div>
      ${c.error.items.map((s) => `<div class="it"><span>✕</span>${s}</div>`).join('')}</div>`,
      `.x{width:150px;height:150px;border-radius:75px;background:#FF3B4E;color:#fff;font-weight:900;font-size:96px;display:flex;align-items:center;justify-content:center;margin-bottom:40px}
       .t{font-weight:900;font-size:76px;text-transform:uppercase;line-height:1.05;margin-bottom:44px}
       .it{display:flex;gap:26px;align-items:flex-start;font-weight:800;font-size:50px;line-height:1.2;margin:18px 0;color:rgba(255,255,255,.92)}
       .it span{flex:none;color:#FF3B4E;font-weight:900}`),
    // 4 por qué pasa
    marco(p, 3, `${top('Por qué pasa')}<div class="wrap"><div class="q">“</div><div class="tx">${c.porque}</div></div>`,
      `.q{font-weight:900;font-size:260px;line-height:.6;color:${p.ac};margin-bottom:10px}
       .tx{font-weight:800;font-size:66px;line-height:1.2}`),
    // 5 qué hacer
    marco(p, 4, `${top('Qué hacer')}<div class="wrap"><div class="t">${c.pasos.titulo}</div>
      ${c.pasos.items.map((s, i) => `<div class="st"><span>${i + 1}</span><div>${s}</div></div>`).join('')}</div>`,
      `.t{font-weight:900;font-size:80px;text-transform:uppercase;line-height:1.05;margin-bottom:50px}
       .st{display:flex;gap:30px;align-items:center;font-weight:800;font-size:52px;line-height:1.18;margin:20px 0;padding:26px 30px;border-radius:30px;background:rgba(255,255,255,.07)}
       .st span{flex:none;width:96px;height:96px;border-radius:48px;background:${p.ac};color:${p.ink};font-weight:900;font-size:54px;display:flex;align-items:center;justify-content:center}`),
    // 6 frase de Joseph
    marco(p, 5, `${top('Joseph lo dice así')}<div class="wrap"><img class="av" src="${img(c.foto2)}"><div class="fr hl">«${c.frase}»</div>
      <div class="sv">🔖 Guardalo y mandáselo a un amigo que lo necesita</div></div>`,
      `.av{width:300px;height:300px;border-radius:150px;object-fit:cover;object-position:50% 36%;border:10px solid ${p.ac};margin-bottom:50px}
       .fr{font-weight:900;font-size:70px;line-height:1.15}
       .sv{margin-top:60px;font-weight:800;font-size:36px;color:rgba(255,255,255,.75)}`),
    // 7 CTA: el libro
    marco(p, 6, `${top('Tu próximo paso')}<div class="cta"><img class="bk" src="${img(c.libro)}">
      <div class="r"><div class="ti">SEDUCTOR<br>DESDE CERO</div><div class="tx">${c.cta}</div>
      <div class="li">✓ Guía paso a paso<br>✓ Para empezar de cero<br>✓ Leé · probá · ajustá</div></div></div>
      <div class="bt">LINK EN MI PERFIL ↗</div><div class="af">Enlace de afiliado: si comprás, recibo una comisión sin costo extra para vos.</div>`,
      `.cta{position:absolute;left:72px;right:72px;top:200px;display:flex;gap:44px;align-items:center}
       .bk{width:430px;height:660px;object-fit:contain;filter:drop-shadow(0 30px 50px rgba(0,0,0,.6)) drop-shadow(0 0 40px ${p.ac}55)}
       .r{flex:1}.ti{font-weight:900;font-size:66px;line-height:1;color:${p.ac};margin-bottom:24px}
       .tx{font-weight:800;font-size:38px;line-height:1.25;margin-bottom:26px}
       .li{font-weight:800;font-size:32px;line-height:1.55;color:rgba(255,255,255,.85)}
       .bt{position:absolute;left:72px;right:72px;top:930px;height:150px;border-radius:999px;background:${p.ac};color:${p.ink};font-weight:900;font-size:62px;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px ${p.ac}55}
       .af{position:absolute;left:72px;right:72px;top:1110px;text-align:center;font-weight:800;font-size:24px;color:rgba(255,255,255,.55)}`),
  ];
};

(async () => {
  const cs = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).filter((c) => !solo || String(c.id) === solo);
  const b = await chromium.launch();
  const pg = await b.newPage({viewport: {width: 1080, height: 1350}});
  for (const c of cs) {
    const d = path.join(out, `carrusel-${String(c.id).padStart(2, '0')}`);
    fs.mkdirSync(d, {recursive: true});
    const ps = placas(c);
    for (let i = 0; i < ps.length; i++) {
      const f = path.join(d, `placa-${i + 1}.html`);
      fs.writeFileSync(f, ps[i]);
      await pg.goto('file://' + path.resolve(f));
      await pg.evaluate(() => document.fonts.ready);
      await pg.waitForTimeout(80);
      await pg.screenshot({path: path.join(d, `${String(c.id).padStart(2, '0')}-${i + 1}.png`)});
      fs.unlinkSync(f);
    }
    console.log('carrusel', c.id, 'ok');
  }
  await b.close();
})();
