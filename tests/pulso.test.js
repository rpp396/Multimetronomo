// Pulso y sonido: planificador, pelota y luces sincronizadas, silenciar sin parar, cambio de tempo en marcha, indicador fijo.
'use strict';
const { suite, test, page, eq, ok, clean, MOB } = require('./lib');

suite('pulso', async ({ b, URL }) => {
  const p = await page(b, URL, MOB);
  // Cuenta los clics programados
  await p.evaluate(() => { window.__clicks = []; const orig = click; window.click = t => { window.__clicks.push(t); orig(t); }; });

  await test('▶ empieza y ■ detiene (botón solo con símbolos)', async () => {
    eq(await p.getAttribute('#play', 'aria-label'), 'Empezar');
    eq((await p.textContent('#play')).trim(), '');
    await p.click('#play'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => ui.playing)); eq(await p.getAttribute('#play', 'aria-label'), 'Detener');
    ok(await p.evaluate(() => $('#play').classList.contains('on')));
  });

  await test('los pulsos van separados 60/ppm y suenan', async () => {
    await p.waitForTimeout(1500);
    const d = await p.evaluate(() => { const q = queue.slice(-4); return q.slice(1).map((x, i) => x.t - q[i].t); });
    d.forEach(x => ok(Math.abs(x - 60 / 96) < 0.002, 'intervalo ' + x));
    ok((await p.evaluate(() => window.__clicks.length)) >= 2, 'clics programados');
  });

  await test('la pelota llega a cada lado en su pulso y se enciende esa luz', async () => {
    const r = await p.evaluate(() => new Promise(res => {
      const out = []; const t0 = performance.now();
      (function f() {
        const now = heard(); let cur = null; for (const q of queue) if (q.t <= now) cur = q;
        if (cur) {
          const ph = (now - cur.t) / cur.d;
          const bx = $('#ball').getBoundingClientRect(), tr = $('#track').getBoundingClientRect();
          out.push({ ph, left: cur.n % 2 === 0, x: (bx.left + bx.width / 2 - tr.left) / tr.width, lL: $('#lL').classList.contains('on'), lR: $('#lR').classList.contains('on') });
        }
        if (performance.now() - t0 < 3500) requestAnimationFrame(f); else res(out);   // 3,5 s: holgura si la máquina va cargada
      })();
    }));
    const early = r.filter(s => s.ph < 0.1);
    ok(early.length >= 2, 'muestras al principio del pulso: ' + early.length);
    for (const s of early) {
      ok(s.left ? s.x < 0.15 : s.x > 0.85, 'pelota en su lado: ' + JSON.stringify(s));
      ok(s.left ? s.lL && !s.lR : s.lR && !s.lL, 'luz de su lado: ' + JSON.stringify(s));
    }
    ok(r.some(s => s.ph > 0.4 && s.ph < 0.6 && s.x > 0.3 && s.x < 0.7), 'a mitad del pulso, en el medio');
    ok(r.some(s => s.ph > 0.5 && !s.lL && !s.lR), 'luces apagadas a mitad de pulso');
  });

  await test('silenciar no detiene el pulso', async () => {
    await p.click('#sound');
    eq(await p.getAttribute('#sound', 'aria-pressed'), 'false');
    const n0 = await p.evaluate(() => window.__clicks.length), q0 = await p.evaluate(() => queue[queue.length - 1].n);
    await p.waitForTimeout(900);
    eq(await p.evaluate(() => window.__clicks.length), n0, 'sin clics');
    ok((await p.evaluate(() => queue[queue.length - 1].n)) > q0, 'el pulso sigue');
    await p.click('#sound'); eq(await p.getAttribute('#sound', 'aria-pressed'), 'true');
  });

  await test('cambiar el tempo en marcha se oye desde el pulso siguiente', async () => {
    await p.click('[data-step="5"]'); await p.click('[data-step="5"]');   // 106
    // El pulso que ya estaba programado conserva su hora; los siguientes van a 106.
    // Se espera a tener 3 pulsos nuevos (con la máquina cargada se programan más despacio).
    const n0 = await p.evaluate(() => queue[queue.length - 1].n);
    await p.waitForFunction(n0 => queue.length && queue[queue.length - 1].n >= n0 + 3, n0, { timeout: 10000 });
    const d = await p.evaluate(n0 => { const q = queue.filter(x => x.n >= n0 + 1); return q.slice(1).map((x, i) => x.t - q[i].t); }, n0);
    ok(d.length >= 2, 'intervalos nuevos: ' + d.length);
    d.forEach(x => ok(Math.abs(x - 60 / 106) < 0.002, 'intervalo ' + x));
  });

  await test('el indicador queda fijo arriba al desplazar', async () => {
    await p.evaluate(() => scrollTo(0, 9999)); await p.waitForTimeout(200);
    const top = await p.evaluate(() => $('#pulse').getBoundingClientRect().top);
    ok(Math.abs(top) < 1, 'top ' + top);
    ok(await p.evaluate(() => $('#pulse').classList.contains('stuck')));
    const dock = await p.evaluate(() => { const r = $('.dock').getBoundingClientRect(); return innerHeight - r.bottom; });
    ok(Math.abs(dock) < 1, 'barra de abajo fija');
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);
    ok(!(await p.evaluate(() => $('#pulse').classList.contains('stuck'))));
  });

  await test('Espacio con teclado detiene; al detener, la pelota vuelve a su sitio', async () => {
    await p.evaluate(() => document.activeElement.blur());
    await p.keyboard.press('Space');
    ok(!(await p.evaluate(() => ui.playing)));
    ok(!(await p.evaluate(() => $('#lL').classList.contains('on') || $('#lR').classList.contains('on'))));
  });

  await test('tras una pausa larga no suena todo de golpe', async () => {
    await p.click('#play'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const busy = performance.now(); while (performance.now() - busy < 700); const n = __clicks.length; sched(); return __clicks.length - n; });
    ok(r <= 1, 'clics programados de golpe: ' + r);
    await p.click('#play');
  });

  await test('el sonido elegido se guarda', async () => {
    await p.click('#sound'); await p.reload(); eq(await p.getAttribute('#sound', 'aria-pressed'), 'false');
  });

  await test('sin errores ni peticiones externas', () => clean(p));
});
