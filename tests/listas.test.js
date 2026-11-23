// Listas de temas en carpetas: desplegable, carpetas que se abren y cierran, crear, cambiar nombre y carpeta, borrar.
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

const STATE = { v: 1, seen: true, li: 0, idx: 0, lists: [
  { n: 'Ensayo', f: 'Banda', p: [{ n: 'A', b: 100 }] },
  { n: 'Concierto', f: 'Conciertos', p: [{ n: 'Apertura', b: 126 }, { n: 'Vals', b: 84 }] },
  { n: 'Sofía', f: 'Alumnos', p: [{ n: 'Escalas', b: 60 }] },
  { n: 'Suelta', f: '', p: [{ n: 'X', b: 70 }] }
] };
const panel = p => p.$$eval('#ddPanel button', bs => bs.map(b => (b.classList.contains('dd-folder') ? '▸' : '') + b.querySelector('span:not(.cnt):not(.chev)').textContent));

suite('listas', async ({ b, URL }) => {
  const p = await page(b, URL, { ...MOB, state: STATE });

  await test('se llama «Lista de temas» y muestra lista y carpeta', async () => {
    eq(await p.textContent('#listsLbl'), 'Lista de temas');
    eq(await p.textContent('#ddBtn small'), 'Banda');
    eq(await p.textContent('#ddBtn b'), 'Ensayo · 1 tema');
    eq(await p.getAttribute('#ddBtn', 'aria-expanded'), 'false');
  });

  await test('el desplegable agrupa por carpetas (A–Z, sin carpeta al final)', async () => {
    await p.click('#ddBtn');
    eq(await p.getAttribute('#ddBtn', 'aria-expanded'), 'true');
    eq(await panel(p), ['▸Alumnos', 'Sofía', '▸Banda', 'Ensayo', '▸Conciertos', 'Concierto', 'Suelta']);
    eq(await p.evaluate(() => document.activeElement.textContent), 'Ensayo1', 'el foco va a la lista actual');
  });

  await test('una carpeta se cierra y se abre, y se recuerda', async () => {
    await p.click('.dd-folder[data-f="Banda"]');
    eq(await panel(p), ['▸Alumnos', 'Sofía', '▸Banda', '▸Conciertos', 'Concierto', 'Suelta']);
    eq(await p.getAttribute('.dd-folder[data-f="Banda"]', 'aria-expanded'), 'false');
    eq(await p.evaluate(() => st.closed), ['Banda']);
    await p.click('.dd-folder[data-f="Banda"]'); eq(await p.evaluate(() => st.closed), []);
  });

  await test('elegir una lista carga su primer tema y cierra el desplegable', async () => {
    await p.click('.dd-item[data-li="1"]');
    eq(await p.evaluate(() => [st.li, st.idx, st.bpm]), [1, 0, 126]);
    eq(await p.textContent('#ddBtn b'), 'Concierto · 2 temas');
    ok(!(await p.isVisible('#ddPanel')));
    eq(await p.textContent('#cur b'), 'Apertura');
  });

  await test('flechas, Esc y tocar fuera', async () => {
    await p.click('#ddBtn'); await p.keyboard.press('ArrowDown');
    eq(await p.evaluate(() => document.activeElement.className), 'dd-item nofolder');
    await p.keyboard.press('Escape'); ok(!(await p.isVisible('#ddPanel')));
    eq(await p.evaluate(() => document.activeElement.id), 'ddBtn');
    await p.click('#ddBtn'); await p.tap('.mainrow .bpmbox'); ok(!(await p.isVisible('#ddPanel')), 'tocar fuera');
  });

  await test('+ Nueva crea una lista vacía en una carpeta (sugiere las existentes)', async () => {
    await p.click('#listNew');
    eq(await p.$$eval('#folderList option', o => o.map(x => x.value)), ['Alumnos', 'Banda', 'Conciertos']);
    await p.fill('#lName', 'Gira'); await p.fill('#lFolder', 'Conciertos'); await p.click('#lSheet button[type=submit]');
    eq(await p.evaluate(() => [st.li, st.lists[st.li].n, st.lists[st.li].f, st.idx]), [4, 'Gira', 'Conciertos', -1]);
    eq(await p.textContent('#ddBtn b'), 'Gira · 0 temas');
    await p.click('#ddBtn');
    eq(await panel(p), ['▸Alumnos', 'Sofía', '▸Banda', 'Ensayo', '▸Conciertos', 'Concierto', 'Gira', 'Suelta']);
    await p.keyboard.press('Escape');
  });

  await test('una carpeta nueva aparece al escribirla', async () => {
    await p.click('#listNew'); await p.fill('#lName', 'Boda'); await p.fill('#lFolder', 'Eventos'); await p.click('#lSheet button[type=submit]');
    await p.click('#ddBtn'); ok((await panel(p)).includes('▸Eventos')); await p.keyboard.press('Escape');
  });

  await test('Editar → Nombre y carpeta: renombrar y quitar de la carpeta', async () => {
    await p.click('#edit'); ok(await p.isVisible('#listRen')); ok(!(await p.isVisible('#listNew')));
    await p.click('#listRen'); eq(await p.inputValue('#lName'), 'Boda'); eq(await p.inputValue('#lFolder'), 'Eventos');
    await p.fill('#lName', 'Boda de Ana'); await p.fill('#lFolder', ''); await p.click('#lSheet button[type=submit]');
    eq(await p.evaluate(() => [st.lists[st.li].n, st.lists[st.li].f]), ['Boda de Ana', '']);
    ok(!(await p.isVisible('#ddBtn small')), 'sin carpeta');
    await p.click('#ddBtn'); ok(!(await panel(p)).includes('▸Eventos'), 'la carpeta vacía desaparece'); await p.keyboard.press('Escape');
  });

  await test('Borrar lista pide confirmación; la última no se puede borrar', async () => {
    const n0 = await p.evaluate(() => st.lists.length);
    await p.click('#listDel'); eq(await p.evaluate(() => st.lists.length), n0);
    await p.click('#listDel'); eq(await p.evaluate(() => st.lists.length), n0 - 1);
    await p.evaluate(() => { st.lists = st.lists.slice(0, 1); st.li = 0; paintLists(); });
    ok(!(await p.isVisible('#listDel')));
    await p.click('#edit');
  });

  await test('se guarda al recargar', async () => {
    await p.evaluate(() => { st.lists.push({ n: 'Otra', f: 'Z', p: [] }); save(); });
    await p.reload(); eq(await p.evaluate(() => st.lists.map(l => l.n + '/' + l.f)), ['Ensayo/Banda', 'Otra/Z']);
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
