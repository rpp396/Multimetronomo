// Temas prefijados: elegir, anterior/siguiente (con vuelta), tempo libre, guardar con nombre, editar, mover y borrar.
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

const STATE = { v: 1, seen: true, bpm: 96, li: 0, idx: 0, lists: [
  { n: 'Ensayo', f: '', p: [{ n: 'Uno', b: 60 }, { n: 'Dos', b: 90 }, { n: 'Tres', b: 120 }] },
  { n: 'Vacía', f: '', p: [] }
] };
const cur = p => p.evaluate(() => [st.idx, st.bpm, $('#cur b').textContent, $('#cur span').textContent]);

suite('temas', async ({ b, URL }) => {
  const p = await page(b, URL, { ...MOB, state: STATE });

  await test('al abrir carga el tema guardado', async () => {
    eq(await cur(p), [0, 60, 'Uno', '1 de 3']);
    eq(await p.getAttribute('.pre[data-i="0"]', 'aria-pressed'), 'true');
  });

  await test('tocar un tema usa su tempo', async () => {
    await p.click('.pre[data-i="2"]'); eq(await cur(p), [2, 120, 'Tres', '3 de 3']);
    eq(await p.getAttribute('.pre[data-i="0"]', 'aria-pressed'), 'false');
  });

  await test('siguiente después del último vuelve al primero; anterior al revés', async () => {
    await p.click('.dock [data-go="1"]'); eq(await cur(p), [0, 60, 'Uno', '1 de 3']);
    await p.click('.dock [data-go="-1"]'); eq(await cur(p), [2, 120, 'Tres', '3 de 3']);
    await p.click('.dock [data-go="-1"]'); eq(await cur(p), [1, 90, 'Dos', '2 de 3']);
  });

  await test('cambiar el tempo a mano pasa a «Tempo libre» y ‹ › van al más cercano', async () => {
    await p.click('[data-step="5"]');   // 95
    eq(await cur(p), [-1, 95, 'Tempo libre', '3 temas']);
    await p.click('.dock [data-go="1"]'); eq(await cur(p), [2, 120, 'Tres', '3 de 3']);
    await p.evaluate(() => setBpm(100)); await p.click('.dock [data-go="-1"]'); eq(await cur(p), [1, 90, 'Dos', '2 de 3']);
    await p.evaluate(() => setBpm(300)); await p.click('.dock [data-go="1"]'); eq((await cur(p))[0], 0, 'por encima del último: el más lento');
  });

  await test('← → del teclado pasan de tema', async () => {
    await p.evaluate(() => { document.activeElement.blur(); choose(0); });
    await p.keyboard.press('ArrowRight'); eq((await cur(p))[0], 1);
    await p.keyboard.press('ArrowLeft'); eq((await cur(p))[0], 0);
  });

  await test('+ Guardar guarda el tempo actual con su nombre', async () => {
    await p.evaluate(() => setBpm(77));
    eq((await p.innerText('#addPre')).replace(/\s+/g, ' ').trim(), '+ Guardar 77 ppm');
    await p.click('#addPre'); await p.fill('#pName', 'Balada <b>lenta</b>'); await p.click('#pSheet button[type=submit]');
    eq(await cur(p), [3, 77, 'Balada <b>lenta</b>', '4 de 4']);
    eq(await p.locator('#grid b').count(), 0, 'el nombre se escapa');
  });

  await test('sin nombre se llama «Tema N»', async () => {
    await p.click('#addPre'); await p.fill('#pName', '   '); await p.click('#pSheet button[type=submit]');
    eq((await cur(p))[2], 'Tema 5');
  });

  await test('Editar: cambiar nombre y tempo', async () => {
    await p.click('#edit'); eq(await p.textContent('#edit'), 'Listo');
    await p.click('.pre[data-i="1"]'); eq(await p.inputValue('#pName'), 'Dos');
    await p.fill('#pName', 'Dos bis'); await p.fill('#pBpm', '92'); await p.click('#pSheet button[type=submit]');
    eq(await cur(p), [1, 92, 'Dos bis', '2 de 5']);
  });

  await test('Editar: mover antes y después', async () => {
    await p.click('.pre[data-i="1"]'); await p.click('#pUp');
    eq(await p.evaluate(() => P().map(x => x.n)), ['Dos bis', 'Uno', 'Tres', 'Balada <b>lenta</b>', 'Tema 5']);
    eq(await p.evaluate(() => st.idx), 0, 'el tema elegido sigue elegido');
    await p.click('#pDown');
    eq(await p.evaluate(() => P().map(x => x.n)), ['Uno', 'Dos bis', 'Tres', 'Balada <b>lenta</b>', 'Tema 5']);
    await p.click('#pCancel');
  });

  await test('Editar: borrar pide confirmación', async () => {
    await p.click('.pre[data-i="4"]'); await p.click('#pDel');
    eq(await p.evaluate(() => P().length), 5, 'el primer toque no borra');
    await p.click('#pDel'); eq(await p.evaluate(() => P().length), 4);
    await p.click('#edit'); eq(await p.textContent('#edit'), 'Editar');
  });

  await test('los cambios se guardan al recargar', async () => {
    await p.reload();
    eq(await p.evaluate(() => P().map(x => x.n + ' ' + x.b)), ['Uno 60', 'Dos bis 92', 'Tres 120', 'Balada <b>lenta</b> 77']);
  });

  await test('lista vacía: aviso y ‹ › no hacen nada', async () => {
    await p.evaluate(() => pickList(1));
    ok(await p.isVisible('.empty'));
    eq((await cur(p)).filter((_, i) => i !== 1), [-1, 'Tempo libre', '0 temas'], 'conserva el tempo');
    await p.click('.dock [data-go="1"]'); eq((await cur(p))[0], -1);
    ok(await p.isVisible('#toast'));
  });

  await test('una lista admite hasta 60 temas', async () => {
    await p.evaluate(() => { for (let i = 0; i < 60; i++) P().push({ n: 'T' + i, b: 100 }); paintPresets(); });
    await p.click('#addPre'); ok(!(await p.isVisible('#pSheet')), 'no abre el formulario');
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
