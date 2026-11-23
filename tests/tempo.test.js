// Tempo: número, − / +, −5 / +5, mantener pulsado, tap tempo, deslizante (solo arrastre horizontal) y guardado.
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

// Gesto táctil real (CDP) de (x0,y0) a (x1,y1)
async function swipe(p, x0, y0, x1, y1, steps = 10) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * i / steps, y: y0 + (y1 - y0) * i / steps }] });
    await p.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(150);
}
const bpm = p => p.evaluate(() => st.bpm);

suite('tempo', async ({ b, URL }) => {
  const p = await page(b, URL, MOB);

  await test('empieza en 96 con su término', async () => {
    eq(await p.inputValue('#bpm'), '96'); eq(await p.textContent('#mark'), 'Andante · ppm');
    eq(await p.getAttribute('#slider', 'aria-valuetext'), '96 pulsos por minuto');
  });

  await test('− / + cambian de 1 y −5 / +5 de 5', async () => {
    await p.click('[data-step="1"]'); eq(await bpm(p), 97);
    await p.click('[data-step="-1"]'); await p.click('[data-step="-1"]'); eq(await bpm(p), 95);
    await p.click('[data-step="5"]'); eq(await bpm(p), 100);
    await p.click('[data-step="-5"]'); await p.click('[data-step="-5"]'); eq(await bpm(p), 90);
  });

  await test('mantener pulsado + repite', async () => {
    const box = await p.locator('[data-step="1"]').boundingBox();
    await p.mouse.move(box.x + 10, box.y + 10); await p.mouse.down(); await p.waitForTimeout(1300); await p.mouse.up();
    const v = await bpm(p); ok(v >= 95, 'subió a ' + v);
    await p.waitForTimeout(500); eq(await bpm(p), v, 'deja de repetir al soltar');
  });

  await test('escribir el número; fuera de rango se ajusta a 30–300', async () => {
    await p.fill('#bpm', '144'); await p.press('#bpm', 'Enter'); eq(await bpm(p), 144); eq(await p.textContent('#mark'), 'Allegro · ppm');
    await p.fill('#bpm', '999'); await p.press('#bpm', 'Enter'); eq(await bpm(p), 300); eq(await p.inputValue('#bpm'), '300');
    await p.fill('#bpm', '5'); await p.press('#bpm', 'Enter'); eq(await bpm(p), 30);
    await p.fill('#bpm', ''); await p.press('#bpm', 'Enter'); eq(await bpm(p), 30, 'vacío no cambia');
    await p.click('[data-step="-5"]'); eq(await bpm(p), 30, 'no baja de 30');
  });

  await test('tap tempo: media de los toques y reinicio tras 2 s', async () => {
    await p.evaluate(() => { taps = []; [0, 500, 1000, 1500].forEach(t => tapAt(10000 + t)); });
    eq(await bpm(p), 120); eq(await p.textContent('#tapSub'), '120 ppm · 4');
    await p.evaluate(() => { [4000, 4750].forEach(t => tapAt(10000 + t)); });   // pausa > 2 s: empieza de nuevo
    eq(await bpm(p), 80);
    await p.evaluate(() => { for (let i = 0; i < 12; i++) tapAt(20000 + i * 400); });   // guarda los 8 últimos
    eq(await bpm(p), 150); eq(await p.evaluate(() => taps.length), 8);
  });

  await test('tap tempo con toques reales', async () => {
    await p.waitForTimeout(2100);
    for (let i = 0; i < 4; i++) { await p.tap('#tap'); await p.waitForTimeout(400); }
    const v = await bpm(p); ok(v > 100 && v < 170, 'tempo medido ' + v);
  });

  await test('deslizante: desplazar en vertical o tocar no cambia el tempo', async () => {
    await p.evaluate(() => setBpm(96));
    const r = await p.locator('#sliderHit').boundingBox(), y = r.y + 22;
    await swipe(p, r.x + 250, y, r.x + 258, y - 150);
    eq(await bpm(p), 96, 'gesto vertical');
    const r2 = await p.locator('#sliderHit').boundingBox();
    await swipe(p, r2.x + 280, r2.y + 22, r2.x + 280, r2.y + 22, 1);
    eq(await bpm(p), 96, 'toque suelto');
  });

  await test('deslizante: arrastrar de lado cambia el tempo sin saltar', async () => {
    const r = await p.locator('#sliderHit').boundingBox(), y = r.y + 22;
    await swipe(p, r.x + 100, y, r.x + 160, y + 4);
    const v = await bpm(p); ok(v > 120 && v < 160, 'subió a ' + v);
    await swipe(p, r.x + 200, y, r.x + 140, y);
    const w = await bpm(p); ok(w < v, 'bajó a ' + w);
  });

  await test('deslizante con el teclado', async () => {
    await p.evaluate(() => setBpm(100));
    await p.focus('#slider'); await p.keyboard.press('ArrowRight'); eq(await bpm(p), 101);
  });

  await test('el tempo se guarda al recargar', async () => {
    await p.evaluate(() => setBpm(133)); await p.reload(); eq(await p.inputValue('#bpm'), '133');
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
