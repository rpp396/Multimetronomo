#!/usr/bin/env node
// Rehace las capturas de docs/capturas/ y la ayuda en PDF (ayuda/Multimetronomo-ayuda.pdf, desde ayuda/ayuda.html).
// Uso: node tools/ayuda.js        (necesita Playwright con Chromium, ver README)
// Si cambia la interfaz, conviene volver a ejecutarlo.
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const OUT = path.join(REPO, 'docs', 'capturas');
function loadPlaywright() {
  try { return require('playwright'); } catch (e) {}
  return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'));
}
const { chromium } = loadPlaywright();

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf' };
function serve() {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(REPO, name);
    if (name.includes('..') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(f));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

// Estado de ejemplo para las capturas (se guarda antes de cargar la app)
const DEMO = {
  v: 1, bpm: 96, sound: true, li: 1, idx: 1, seen: true, closed: [],
  lists: [
    { n: 'Ensayo', f: 'Banda', p: [{ n: 'Calentamiento', b: 72 }, { n: 'Ensayo', b: 96 }, { n: 'Estudio lento', b: 60 }, { n: 'Balada', b: 66 }, { n: 'Tema 2', b: 112 }, { n: 'Rápido', b: 160 }] },
    { n: 'Concierto del sábado', f: 'Conciertos', p: [{ n: 'Apertura', b: 126 }, { n: 'Vals', b: 84 }, { n: 'Bolero', b: 72 }, { n: 'Cumbia', b: 94 }, { n: 'Rock', b: 138 }, { n: 'Final', b: 150 }] },
    { n: 'Gira', f: 'Conciertos', p: [{ n: 'Intro', b: 100 }, { n: 'Balada', b: 70 }] },
    { n: 'Sofía', f: 'Alumnos', p: [{ n: 'Escalas', b: 60 }, { n: 'Estudio n.º 3', b: 76 }] },
    { n: 'Tomás', f: 'Alumnos', p: [{ n: 'Lectura', b: 70 }, { n: 'Paradiddle', b: 88 }] },
    { n: 'Técnica diaria', f: '', p: [{ n: 'Arpegios', b: 80 }] }
  ]
};

// Marcadores numerados sobre la captura (solo en el DOM de la captura)
async function markers(p, list) {
  await p.evaluate(list => {
    const st = document.createElement('style');
    st.textContent = '.mk{position:absolute;z-index:99;width:26px;height:26px;border-radius:50%;background:#C23049;color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff}.mk.fx{position:fixed}';
    document.head.appendChild(st);
    for (const [sel, n, dx = 0, dy = 0, fixed] of list) {
      const el = document.querySelector(sel); if (!el) continue;
      const r = el.getBoundingClientRect(), m = document.createElement('span');
      m.className = 'mk' + (fixed ? ' fx' : ''); m.textContent = n;
      m.style.left = (r.left + dx + (fixed ? 0 : scrollX)) + 'px';
      m.style.top = (r.top + dy + (fixed ? 0 : scrollY)) + 'px';
      document.body.appendChild(m);
    }
  }, list);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const URL = `http://127.0.0.1:${server.address().port}/index.html`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'es-ES', colorScheme: 'light', bypassCSP: true });  // bypassCSP: solo para poder añadir los marcadores
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('multimetronomo-v1', s); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, JSON.stringify(DEMO));
  const p = await ctx.newPage();
  const shot = async (name, full) => { await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, name), fullPage: !!full }); console.log('  ' + name); };
  const fresh = async () => { await p.evaluate(s => localStorage.setItem('multimetronomo-v1', s), JSON.stringify(DEMO)); await p.goto(URL); await p.evaluate(() => document.fonts.ready); };

  await p.goto(URL); await fresh();

  // 1. Pantalla principal, sonando, con marcadores
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  await p.setViewportSize({ width: 390, height: H });   // toda la página a la vista, con la barra de abajo en su sitio
  await p.click('#play'); await p.waitForTimeout(1300);
  await p.evaluate(() => {   // congela la pelota a un 40 % del recorrido, con la luz izquierda encendida
    ui.playing = false;
    const ball = $('#ball'), W = $('#track').clientWidth - 10;
    ball.style.transform = `translateX(${5 - ball.offsetWidth / 2 + 0.4 * W}px)`;
    $('#lL').classList.add('on'); $('#lR').classList.remove('on');
  });
  await markers(p, [
    ['#track', 1, 150, -24], ['#sound', 2, -10, -10], ['#bpm', 3, -14, -8], ['#play', 4, 48, -10],
    ['.tempo', 5, -10, -12], ['#slider', 6, -10, -4], ['#grid', 7, -10, -14], ['#ddBtn', 8, -10, -14],
    ['.dock [data-go="1"]', 9, 52, -10, true], ['#guideBtn', 10, -10, -10], ['#pdfBtn', 11, 28, -10]
  ]);
  await shot('1-pantalla-principal.png');
  await p.evaluate(() => { ui.playing = true; stop(); });
  await p.setViewportSize({ width: 390, height: 844 });

  // 2. Guía de bienvenida
  await fresh(); await p.evaluate(() => openGuide()); await p.click('#guideNext'); await p.waitForTimeout(650);
  await shot('2-guia.png');
  await p.evaluate(() => closeGuide());

  // 3. Desplazada: el pulso queda arriba y ‹ › abajo
  await p.click('#play'); await p.evaluate(() => scrollTo(0, 360)); await p.waitForTimeout(1100);
  await p.evaluate(() => { ui.playing = false; }); await shot('3-desplazada.png');
  await p.evaluate(() => { ui.playing = true; stop(); scrollTo(0, 0); });

  // 4. Guardar el tempo actual con nombre
  await fresh(); await p.evaluate(() => setBpm(108)); await p.click('#addPre'); await p.fill('#pName', 'Tema nuevo');
  await p.evaluate(() => document.activeElement.blur()); await p.evaluate(() => $('#pSheet').scrollIntoView({ block: 'center' }));
  await shot('4-guardar-tema.png');

  // 5. Editar
  await fresh(); await p.click('#edit'); await p.click('.pre[data-i="1"]'); await p.evaluate(() => $('#pSheet').scrollIntoView({ block: 'center' }));
  await shot('5-editar-tema.png');

  // 6. Listas de temas en carpetas
  await fresh(); await p.click('#ddBtn'); await p.evaluate(() => { document.activeElement.blur(); $('#lists').scrollIntoView({ block: 'start' }); scrollBy(0, -80); });
  await shot('6-listas-carpetas.png');

  // 7. Nombre y carpeta
  await fresh(); await p.click('#edit'); await p.click('#listRen'); await p.evaluate(() => { document.activeElement.blur(); $('#lSheet').scrollIntoView({ block: 'center' }); });
  await shot('7-nombre-carpeta.png');

  // 8. Compartir
  await fresh(); await p.click('#listShare'); await p.evaluate(() => {
    const u = $('#shUrl'); u.value = u.value.replace(/^https?:\/\/[^#]*/, 'https://rpp396.github.io/Multimetronomo/');  // dirección pública en vez de la local
    document.activeElement.blur(); $('#sSheet').scrollIntoView({ block: 'start' }); scrollBy(0, -70); });
  await shot('8-compartir.png');

  // 9. Importar
  await fresh(); await p.click('#listImp');
  await p.fill('#imTxt', 'Lista de temas: Boda\nCarpeta: Eventos\nEntrada 72\nVals: 84\nFiesta - 128 bpm');
  await p.evaluate(() => { document.activeElement.blur(); $('#iSheet').scrollIntoView({ block: 'start' }); scrollBy(0, -70); });
  await shot('9-importar.png');

  // README: oscuro
  const dctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', locale: 'es-ES' });
  await dctx.addInitScript(s => { localStorage.setItem('multimetronomo-v1', s); }, JSON.stringify(DEMO));
  const d = await dctx.newPage(); await d.goto(URL); await d.evaluate(() => document.fonts.ready);
  await d.waitForTimeout(150); await d.screenshot({ path: path.join(OUT, 'oscuro.png') }); console.log('  oscuro.png');

  // PDF
  const h = await b.newPage();
  await h.goto(`http://127.0.0.1:${server.address().port}/ayuda/ayuda.html`, { waitUntil: 'networkidle' });
  await h.evaluate(() => document.fonts.ready);
  await h.pdf({ path: path.join(REPO, 'ayuda', 'Multimetronomo-ayuda.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font:9px system-ui,sans-serif;color:#586173;padding:0 16mm;display:flex;justify-content:space-between"><span>Multimetrónomo · Ayuda</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  console.log('  ayuda/Multimetronomo-ayuda.pdf');
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
