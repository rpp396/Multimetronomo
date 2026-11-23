// Celular: sin desplazamiento horizontal de 320 a 430 px, objetivos táctiles de 44 px, modo oscuro,
// y app instalable que funciona sin conexión (manifiesto, íconos y service worker).
'use strict';
const fs = require('fs');
const path = require('path');
const { suite, test, page, eq, ok, clean, MOB, REPO } = require('./lib');

suite('móvil', async ({ b, URL }) => {
  await test('sin desplazamiento horizontal de 320 a 430 px (también con hojas abiertas)', async () => {
    for (const w of [320, 360, 390, 430]) {
      const p = await page(b, URL, { ...MOB, viewport: { width: w, height: 740 } });
      const check = async what => eq(await p.evaluate(() => document.documentElement.scrollWidth), w, `${w} px ${what}`);
      await check('');
      await p.click('#ddBtn'); await check('desplegable'); await p.keyboard.press('Escape');
      await p.click('#listShare'); await check('compartir');
      await p.click('#edit'); await p.click('.pre[data-i="0"]'); await check('editar tema');
      await p.evaluate(() => openGuide()); await check('guía');
      const title = await p.evaluate(() => { const h = $('h1'); return h.scrollWidth <= h.clientWidth; });
      ok(title, `${w} px: el título cabe`);
      await p.context().close();
    }
  });

  await test('los controles táctiles miden al menos 44 px', async () => {
    const p = await page(b, URL, MOB);
    await p.click('#edit');
    const small = await p.evaluate(() => $$('button, a.icon-btn, #bpm, #sliderHit').filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
      .map(e => [e.id || e.className, e.getBoundingClientRect()]).filter(([, r]) => r.width > 0 && (r.width < 44 || r.height < 44)).map(([n, r]) => `${n} ${Math.round(r.width)}×${Math.round(r.height)}`));
    eq(small, []);
    await p.context().close();
  });

  await test('modo oscuro: fondo y texto del tema oscuro', async () => {
    const p = await page(b, URL, { ...MOB, colorScheme: 'dark' });
    eq(await p.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.body).color]), ['rgb(14, 16, 21)', 'rgb(230, 233, 240)']);
    await p.context().close();
  });

  await test('manifiesto e íconos', async () => {
    const m = JSON.parse(fs.readFileSync(path.join(REPO, 'manifest.webmanifest'), 'utf8'));
    eq([m.name, m.display, m.start_url, m.lang], ['Multimetrónomo', 'standalone', './', 'es']);
    ok(m.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'));
    for (const i of m.icons) ok(fs.existsSync(path.join(REPO, i.src)), i.src);
  });

  await test('el service worker guarda todos los archivos de la app', async () => {
    const sw = fs.readFileSync(path.join(REPO, 'sw.js'), 'utf8');
    const files = [...sw.matchAll(/'([^']+\.(?:html|css|js|png|woff2|pdf|webmanifest))'/g)].map(m => m[1]);
    for (const f of files) ok(fs.existsSync(path.join(REPO, f)), 'falta ' + f);
    const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="((?:js|icons|ayuda)\/[^"]+|styles\.css|manifest\.webmanifest)"/g)) ok(files.includes(m[1]), 'sw.js no guarda ' + m[1]);
    for (const f of fs.readdirSync(path.join(REPO, 'fonts')).filter(f => f.endsWith('.woff2'))) ok(files.includes('fonts/' + f), 'sw.js no guarda fonts/' + f);
  });

  await test('funciona sin conexión tras la primera visita', async () => {
    const p = await page(b, URL, { ...MOB, sw: true });
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.waitForTimeout(300);
    await p.context().setOffline(true);
    await p.reload();
    eq(await p.inputValue('#bpm'), '96');
    ok(await p.evaluate(() => getComputedStyle($('.logo')).maskImage !== 'none' || getComputedStyle($('.logo')).webkitMaskImage !== 'none'));
    ok(await p.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible"')), 'tipografía local');
    await p.click('#play'); await p.waitForTimeout(300); ok(await p.evaluate(() => ui.playing)); await p.click('#play');
    eq(p.errors.filter(e => !/ERR_INTERNET_DISCONNECTED/.test(e)), []);
    await p.context().close();
  });

  await test('la app no hace peticiones externas ni viola la CSP en un recorrido completo', async () => {
    const p = await page(b, URL, { ...MOB, state: null });
    for (let i = 0; i < 7; i++) await p.click('#guideNext');
    await p.click('#play'); await p.click('[data-step="5"]'); await p.tap('#tap'); await p.click('.dock [data-go="1"]');
    await p.click('#ddBtn'); await p.click('.dd-item[data-li="1"]'); await p.click('#listShare'); await p.click('#listImp');
    await p.click('#play');
    await clean(p);
    await p.context().close();
  });
});
