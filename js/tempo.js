/* Multimetrónomo · tempo.js
   Cambiar el tempo: número, − / + (de 1), −5 / +5, mantener pulsado, tap tempo y deslizante.
   El deslizante solo responde a un arrastre horizontal, para que desplazar la página con el dedo no cambie el tempo. */
'use strict';

// from: 'preset' (al elegir un tema; conserva el tema elegido), 'input', 'slider' o nada
function setBpm(b, from) {
  st.bpm = clamp(b);
  if (from !== 'input') $('#bpm').value = st.bpm;
  $('#slider').value = st.bpm;
  $('#slider').setAttribute('aria-valuetext', st.bpm + ' pulsos por minuto');
  $('#mark').textContent = tempoMark(st.bpm) + ' · ppm';
  if (from !== 'preset') { const p = P()[st.idx]; if (!p || p.b !== st.bpm) st.idx = -1; }
  paintPresets(); save();
}

/* ---------- − / + y −5 / +5: un toque cambia una vez; mantenido, repite cada vez más rápido ---------- */
let repT = null;
function stepBy(d) { setBpm(st.bpm + d); }
function bindSteps() {
  $$('.step').forEach(b => {
    const d = +b.dataset.step;
    b.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); stepBy(d);
      let delay = 420;
      const go = () => { repT = setTimeout(() => { stepBy(d * (delay < 110 && Math.abs(d) === 1 ? 5 : 1)); delay = Math.max(60, delay * 0.75); go(); }, delay); };
      go();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => clearTimeout(repT)));
    b.addEventListener('click', e => { if (e.detail === 0) stepBy(d); });   // teclado o lector de pantalla
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
}

/* ---------- Número ---------- */
function bindInput() {
  const inp = $('#bpm');
  inp.addEventListener('change', () => { const v = parseInt(inp.value, 10); setBpm(Number.isNaN(v) ? st.bpm : v); inp.value = st.bpm; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  inp.addEventListener('focus', () => inp.select());
}

/* ---------- Tap tempo: media de los últimos 8 toques; tras 2 s sin tocar empieza de nuevo ---------- */
const TAP_RESET = 2000, TAP_KEEP = 8;
let taps = [], tapResetT = null;
function tapAt(t) {
  const b = $('#tap'), sub = $('#tapSub');
  if (taps.length && t - taps[taps.length - 1] > TAP_RESET) taps = [];
  taps.push(t); if (taps.length > TAP_KEEP) taps.shift();
  b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 90);
  const n = taps.length;
  if (n >= 2) setBpm(60000 / ((taps[n - 1] - taps[0]) / (n - 1)));
  sub.textContent = n < 2 ? 'Sigue tocando…' : `${st.bpm} ppm · ${n}`;
  clearTimeout(tapResetT);
  tapResetT = setTimeout(() => { taps = []; sub.textContent = 'Toca al ritmo'; if (n >= 2) say('Tempo ' + st.bpm); }, TAP_RESET);
}
function bindTap() {
  const b = $('#tap');
  b.addEventListener('pointerdown', e => { if (e.button > 0) return; e.preventDefault(); tapAt(e.timeStamp); });
  b.addEventListener('click', e => { if (e.detail === 0) tapAt(performance.now()); });
  b.addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------- Deslizante ---------- */
// La capa #sliderHit (touch-action: pan-y) recibe el puntero: un gesto vertical desplaza la página y no toca el tempo;
// un toque suelto tampoco; solo un arrastre horizontal de más de 10 px lo cambia, desde el valor que tenía (sin saltar).
const DRAG_START = 10, SCROLL_FIRST = 8;
function bindSlider() {
  const hit = $('#sliderHit'), sl = $('#slider');
  let g = null;
  hit.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    g = { x: e.clientX, y: e.clientY, v: st.bpm, id: e.pointerId, on: false };
  });
  hit.addEventListener('pointermove', e => {
    if (!g || e.pointerId !== g.id) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > SCROLL_FIRST && Math.abs(dy) > Math.abs(dx)) { g = null; return; }
      if (Math.abs(dx) < DRAG_START) return;
      g.on = true; g.x = e.clientX;
      try { hit.setPointerCapture(e.pointerId); } catch (err) {}
      hit.classList.add('drag');
      return;
    }
    const w = Math.max(1, sl.getBoundingClientRect().width - 20);
    setBpm(g.v + (e.clientX - g.x) / w * (MAX - MIN), 'slider');
  });
  const end = () => { g = null; hit.classList.remove('drag'); };
  hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
  // Con el teclado (flechas, Inicio, Fin) el deslizante funciona como siempre
  sl.addEventListener('input', () => setBpm(+sl.value, 'slider'));
}
