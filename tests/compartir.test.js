// Exportar e importar como texto, compartir como enlace, y datos hostiles o dañados (validación y escape).
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

const STATE = { v: 1, seen: true, li: 0, idx: 0, lists: [
  { n: 'Concierto', f: 'Conciertos', p: [{ n: 'Apertura', b: 126 }, { n: 'Estudio n.º 3', b: 76 }] },
  { n: 'Técnica', f: '', p: [{ n: 'Escalas', b: 60 }] }
] };

suite('compartir', async ({ b, URL }) => {
  const p = await page(b, URL, { ...MOB, state: STATE, permissions: ['clipboard-read', 'clipboard-write'] });

  await test('texto de una lista y de todas', async () => {
    eq(await p.evaluate(() => toText([0])), 'Lista de temas: Concierto\nCarpeta: Conciertos\nApertura: 126\nEstudio n.º 3: 76\n');
    eq(await p.evaluate(() => toText([0, 1])), 'Lista de temas: Concierto\nCarpeta: Conciertos\nApertura: 126\nEstudio n.º 3: 76\n\nLista de temas: Técnica\nEscalas: 60\n');
  });

  await test('el texto exportado se vuelve a leer igual', async () => {
    eq(await p.evaluate(() => JSON.stringify(parseText(toText([0, 1]))) === JSON.stringify(st.lists)), true);
  });

  await test('acepta texto escrito a mano', async () => {
    const L = await p.evaluate(() => parseText('# comentario\nlista: Boda\ncarpeta: Eventos\nVals 84\nEntrada - 72 bpm\n120 Fiesta\nTema 2 = 100 ppm\nsin tempo\nLento 12\nRápido 999\n\nLista de temas: Otra\nX: 90'));
    eq(L, [{ n: 'Boda', f: 'Eventos', p: [{ n: 'Vals', b: 84 }, { n: 'Entrada', b: 72 }, { n: 'Fiesta', b: 120 }, { n: 'Tema 2', b: 100 }] }, { n: 'Otra', f: '', p: [{ n: 'X', b: 90 }] }]);
    eq(await p.evaluate(() => parseText('Vals 84\nBolero 72')), [{ n: 'Lista importada', f: '', p: [{ n: 'Vals', b: 84 }, { n: 'Bolero', b: 72 }] }], 'sin encabezado');
    eq(await p.evaluate(() => parseText('nada que ver\n12 3')), []);
  });

  await test('límites: nombres de 40, 60 temas por lista y 30 listas', async () => {
    const r = await p.evaluate(() => {
      const long = parseText('Lista de temas: ' + 'x'.repeat(80) + '\n' + 'y'.repeat(80) + ' 100');
      const many = parseText(Array.from({ length: 80 }, (_, i) => 'T' + i + ': 100').join('\n'));
      const lists = parseText(Array.from({ length: 40 }, (_, i) => 'Lista de temas: L' + i + '\nA: 100').join('\n'));
      return [long[0].n.length, long[0].p[0].n.length, many[0].p.length, lists.length];
    });
    eq(r, [40, 40, 60, 30]);
  });

  await test('Compartir: texto y enlace, de esta lista o de todas', async () => {
    await p.click('#listShare');
    eq(await p.inputValue('#shTxt'), 'Lista de temas: Concierto\nCarpeta: Conciertos\nApertura: 126\nEstudio n.º 3: 76\n');
    const url = await p.inputValue('#shUrl'); ok(/\/index\.html#temas=[A-Za-z0-9_-]+$/.test(url), url);
    eq(await p.evaluate(u => fromLink(u), url), await p.inputValue('#shTxt'));
    await p.click('#cpTxt'); eq(await p.evaluate(() => navigator.clipboard.readText()), await p.inputValue('#shTxt'));
    await p.click('#cpUrl'); eq(await p.evaluate(() => navigator.clipboard.readText()), url);
    await p.click('#shAll'); ok((await p.inputValue('#shTxt')).includes('Lista de temas: Técnica'));
    await p.click('#sClose'); ok(!(await p.isVisible('#sSheet')));
  });

  await test('abrir un enlace compartido muestra lo que se añadirá y lo importa', async () => {
    const txt = 'Lista de temas: Concierto\nCarpeta: Conciertos\nVals: 84\n';
    const hash = '#temas=' + await p.evaluate(t => b64e(t), txt);
    const q = await page(b, URL, { ...MOB, state: STATE, hash });
    ok(await q.isVisible('#iSheet'));
    eq(await q.textContent('#iTitle'), 'Te compartieron listas de temas');
    eq(await q.textContent('#imInfo'), 'Se añadirán 1 lista de temas con 1 tema: Concierto.');
    await q.click('#imGo');
    eq(await q.evaluate(() => st.lists.map(l => l.n)), ['Concierto', 'Técnica', 'Concierto (2)'], 'no pisa la que ya había');
    eq(await q.evaluate(() => [st.li, st.bpm]), [2, 84]);
    eq(await q.evaluate(() => location.hash), '', 'quita el enlace de la dirección');
    await q.reload(); ok(!(await q.isVisible('#iSheet')), 'al recargar no vuelve a preguntar');
    await clean(q); await q.context().close();
  });

  await test('un primer visitante que llega con un enlace ve la importación (no la guía)', async () => {
    const hash = '#temas=' + await p.evaluate(() => b64e('Vals 84'));
    const q = await page(b, URL, { ...MOB, state: null, hash });
    ok(await q.isVisible('#iSheet')); ok(!(await q.evaluate(() => $('#guide').open)));
    await q.context().close();
  });

  await test('Importar acepta texto o enlace pegado', async () => {
    await p.click('#listImp'); ok(await p.evaluate(() => $('#imGo').disabled));
    await p.fill('#imTxt', 'esto no sirve'); ok((await p.textContent('#imInfo')).startsWith('No encontré temas'));
    const link = 'https://ejemplo.org/x/#temas=' + await p.evaluate(() => b64e('Lista de temas: Pegada\nUno 61'));
    await p.fill('#imTxt', 'Mira: ' + link);
    eq(await p.textContent('#imInfo'), 'Se añadirán 1 lista de temas con 1 tema: Pegada.');
    await p.click('#imGo'); eq(await p.evaluate(() => st.lists[st.li].n), 'Pegada');
  });

  await test('nombres hostiles se muestran como texto', async () => {
    await p.click('#listImp');
    await p.fill('#imTxt', 'Lista de temas: <img src=x onerror="window.__x=1">\nCarpeta: <svg onload="window.__x=2">\n<b onclick=alert(1)>Tema</b> 100');
    await p.click('#imGo');
    await p.click('#ddBtn');
    eq(await p.evaluate(() => [typeof window.__x, document.querySelectorAll('#lists img, #lists svg[onload], #grid b').length]), ['undefined', 0]);
    ok((await p.textContent('#ddBtn')).includes('<img src=x'));
    await p.keyboard.press('Escape');
  });

  await test('enlaces dañados no rompen nada', async () => {
    for (const h of ['#temas=%%%', '#temas=****', '#temas=' + 'A'.repeat(50000), '#temas=']) {
      const q = await page(b, URL, { ...MOB, hash: h });
      eq(q.errors, [], h.slice(0, 20)); await q.context().close();
    }
  });

  await test('datos guardados dañados o malintencionados', async () => {
    const bad = [
      '{"lists":"no"}', 'no es json', '[]', 'null',
      JSON.stringify({ __proto__: { polluted: 1 }, lists: [{ n: 5, f: {}, p: [{ n: '<i>x</i>', b: 'NaN' }, { n: 'ok', b: 9999 }, null] }, null, 7], li: 99, idx: -5, bpm: 'rápido', sound: 'sí', closed: [1, '<x>'] }),
      JSON.stringify({ lists: Array.from({ length: 500 }, (_, i) => ({ n: 'L' + i, p: [] })) })
    ];
    for (const raw of bad) {
      const ctx = await b.newContext(MOB);
      await ctx.addInitScript(s => localStorage.setItem('multimetronomo-v1', s), raw);
      const q = await ctx.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message));
      await q.goto(URL);
      eq(errs, [], raw.slice(0, 30));
      const s = await q.evaluate(() => ({ n: st.lists.length, li: st.li, idx: st.idx, bpm: st.bpm, polluted: ({}).polluted, first: st.lists[0] }));
      ok(s.n >= 1 && s.n <= 100 && s.li >= 0 && s.li < s.n && s.idx >= -1 && s.bpm >= 30 && s.bpm <= 300 && s.polluted === undefined, raw.slice(0, 30) + ' → ' + JSON.stringify(s));
      await ctx.close();
    }
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
