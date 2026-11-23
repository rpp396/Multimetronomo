/* Multimetrónomo · pulso.js
   Indicador del pulso: en cada pulso la pelota llega a un extremo y se enciende la luz de ese lado.
   El indicador queda fijo arriba al desplazar la página. También los botones de sonido y de empezar/detener. */
'use strict';

const LIT = 0.35;     // fracción del pulso durante la que la luz queda encendida

function draw() {
  const ball = $('#ball'), track = $('#track');
  const x0 = 5 - ball.offsetWidth / 2, W = track.clientWidth - 10;   // del centro de una luz al de la otra
  let cur = null;
  if (ui.playing) { const now = heard(); for (const q of queue) if (q.t <= now) cur = q; }
  if (!cur) {
    ball.style.transform = `translateX(${x0}px)`;
    $('#lL').classList.remove('on'); $('#lR').classList.remove('on');
    return;
  }
  const p = Math.min(1, (heard() - cur.t) / cur.d), left = cur.n % 2 === 0;
  ball.style.transform = `translateX(${x0 + (left ? p : 1 - p) * W}px)`;
  const lit = p < LIT;
  $('#lL').classList.toggle('on', lit && left);
  $('#lR').classList.toggle('on', lit && !left);
}
(function loop() { if (ui.playing) draw(); requestAnimationFrame(loop); })();
addEventListener('resize', () => draw());

/* Sombra del indicador cuando se despega de la tarjeta */
function markStuck() { $('#pulse').classList.toggle('stuck', $('#app').getBoundingClientRect().top < 0); }
addEventListener('scroll', markStuck, { passive: true });

/* ---------- Sonido y empezar/detener ---------- */
const ICON = {
  on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="2"/></svg>'
};
function paintSound() {
  const b = $('#sound');
  b.innerHTML = st.sound ? ICON.on : ICON.off;
  b.setAttribute('aria-pressed', st.sound);
  b.setAttribute('aria-label', 'Sonido');
  b.title = st.sound ? 'Silenciar' : 'Activar el sonido';
}
function paintPlay() {
  const b = $('#play');
  b.classList.toggle('on', ui.playing);
  b.innerHTML = ui.playing ? ICON.stop : ICON.play;
  b.setAttribute('aria-label', ui.playing ? 'Detener' : 'Empezar');
  b.title = ui.playing ? 'Detener' : 'Empezar';
}
function toggleSound() {
  st.sound = !st.sound; paintSound(); save();
  say(st.sound ? 'Sonido activado' : 'Sonido desactivado');
}
