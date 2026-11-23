// Guía de bienvenida (primera vez y botón «?») y ayuda en PDF.
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

const step = p => p.evaluate(() => [$('#guideStep').textContent, $('#guideTitle').textContent]);

suite('guía', async ({ b, URL }) => {
  const p = await page(b, URL, { ...MOB, state: null });

  await test('sale la primera vez, como diálogo modal', async () => {
    ok(await p.evaluate(() => $('#guide').open));
    eq(await step(p), ['Paso 1 de 7', 'Bienvenido a Multimetrónomo']);
    eq(await p.evaluate(() => document.activeElement.id), 'guideNext');
    ok(await p.evaluate(() => $('#guidePrev').disabled));
  });

  await test('Siguiente, Anterior, flechas y deslizar el dedo', async () => {
    await p.click('#guideNext'); eq((await step(p))[1], 'El pulso');
    await p.keyboard.press('ArrowRight'); eq((await step(p))[1], 'Empezar y silenciar');
    await p.keyboard.press('ArrowLeft'); eq((await step(p))[1], 'El pulso');
    await p.click('#guidePrev'); eq((await step(p))[1], 'Bienvenido a Multimetrónomo');
    const box = await p.locator('#guideArt').boundingBox();
    await p.mouse.move(box.x + 250, box.y + 50); await p.mouse.down(); await p.mouse.move(box.x + 40, box.y + 60, { steps: 5 }); await p.mouse.up();
    eq((await step(p))[1], 'El pulso', 'deslizar a la izquierda avanza');
  });

  await test('el último paso enlaza la ayuda en PDF y termina la guía', async () => {
    for (let i = 0; i < 5; i++) await p.click('#guideNext');
    eq(await step(p), ['Paso 7 de 7', 'Compartir y sin conexión']);
    eq(await p.textContent('#guideNext'), 'Empezar a usarlo');
    ok(!(await p.isVisible('#guideSkip')));
    eq(await p.getAttribute('#guideText a.pdf', 'href'), 'ayuda/Multimetronomo-ayuda.pdf');
    await p.click('#guideNext');
    ok(!(await p.evaluate(() => $('#guide').open)));
    ok(await p.evaluate(() => st.seen));
  });

  await test('no vuelve a salir al recargar', async () => {
    await p.reload(); ok(!(await p.evaluate(() => $('#guide').open)));
  });

  await test('el botón «?» la vuelve a abrir desde el principio; Saltar y Esc la cierran', async () => {
    await p.click('#guideBtn'); ok(await p.evaluate(() => $('#guide').open)); eq((await step(p))[0], 'Paso 1 de 7');
    await p.click('#guideSkip'); ok(!(await p.evaluate(() => $('#guide').open)));
    eq(await p.evaluate(() => document.activeElement.id), 'guideBtn', 'el foco vuelve al botón');
    await p.click('#guideBtn'); await p.keyboard.press('Escape'); ok(!(await p.evaluate(() => $('#guide').open)));
  });

  await test('Saltar la primera vez también la marca como vista', async () => {
    const q = await page(b, URL, { ...MOB, state: null });
    await q.click('#guideSkip'); await q.waitForTimeout(50); ok(await q.evaluate(() => st.seen));
    await q.reload(); ok(!(await q.evaluate(() => $('#guide').open)));
    await q.context().close();
  });

  await test('la ayuda en PDF existe y se enlaza desde la cabecera', async () => {
    eq(await p.getAttribute('#pdfBtn', 'href'), 'ayuda/Multimetronomo-ayuda.pdf');
    const r = await p.evaluate(async () => { const x = await fetch('ayuda/Multimetronomo-ayuda.pdf'); const buf = new Uint8Array(await x.arrayBuffer()); return [x.status, String.fromCharCode(...buf.slice(0, 5)), buf.length]; });
    eq(r.slice(0, 2), [200, '%PDF-']); ok(r[2] > 50000, 'tamaño ' + r[2]);
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
