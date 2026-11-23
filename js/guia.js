/* Multimetrónomo · guia.js
   Guía de bienvenida (onboarding): sale la primera vez y se vuelve a ver con el botón «?» de la cabecera.
   Pasos con «Anterior» / «Siguiente», flechas del teclado y deslizar el dedo de lado. */
'use strict';

const PDF_URL = 'ayuda/Multimetronomo-ayuda.pdf';
const GUIDE = [
  { t: 'Bienvenido a Multimetrónomo',
    art: '<span class="g-logo"></span>',
    p: '<p>Un metrónomo pensado para el celular: <b>ves el pulso</b>, eliges el tempo de varias formas y guardas tus temas en listas.</p><p>Esta guía dura un minuto. Puedes volver a verla con el botón <b>?</b> de arriba.</p>' },
  { t: 'El pulso',
    art: '<div class="g-track"><span class="light" id="gL"></span><span class="ball"></span><span class="light" id="gR"></span></div>',
    p: '<p>En cada pulso la <b>pelota llega a un lado</b> y se <b>enciende la luz</b> de ese lado.</p><p>El indicador queda <b>fijo arriba</b> aunque deslices la pantalla, para que nunca lo pierdas de vista.</p>' },
  { t: 'Empezar y silenciar',
    art: `<div class="g-row"><span class="g-chip">${ICON.on}</span><span class="g-big">96</span><span class="g-chip dark">${ICON.play}</span></div>`,
    p: '<p>El botón de la derecha <b>empieza ▶</b> y <b>detiene ■</b> el metrónomo.</p><p>El altavoz de la izquierda <b>quita el sonido</b> sin parar: sigues viendo el pulso.</p><p>Mientras suena, la pantalla no se apaga.</p>' },
  { t: 'Elegir el tempo',
    art: '<div class="g-col"><div class="g-row"><span class="g-chip">−5</span><span class="g-chip">−</span><span class="g-chip dash">Tap tempo</span><span class="g-chip">+</span><span class="g-chip">+5</span></div></div>',
    p: '<p>Toca el número para <b>escribirlo</b>, o usa <b>− / +</b> (de 1 en 1) y <b>−5 / +5</b>. Mantenlos pulsados para ir más rápido.</p><p><b>Tap tempo</b>: tócalo al ritmo de la música y calcula el tempo.</p><p>El <b>deslizante</b> solo se mueve si lo arrastras de lado, así no cambias el tempo sin querer al desplazar la pantalla.</p>' },
  { t: 'Temas prefijados',
    art: `<div class="g-col"><div class="g-row"><span class="g-chip acc">96 · Ensayo</span><span class="g-chip">126 · Apertura</span></div><div class="g-row"><span class="g-chip">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'}</span><span class="g-chip">Ensayo · 2 de 6</span><span class="g-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span></div></div>`,
    p: '<p><b>+ Guardar</b> guarda el tempo actual con un nombre. Toca un tema para usarlo.</p><p>Los botones <b>‹ ›</b> de abajo pasan al tema anterior o al siguiente y están siempre a la vista. Después del último vuelve al primero.</p><p>Con <b>Editar</b> cambias nombre, tempo u orden, o borras un tema.</p>' },
  { t: 'Listas de temas y carpetas',
    art: `<div class="g-folder"><div class="f">${FOLDER_ICON}Conciertos</div><div class="sub sel">Concierto del sábado</div><div class="sub">Gira</div><div class="f">${FOLDER_ICON}Alumnos</div><div class="sub">Sofía</div></div>`,
    p: '<p>Agrupa tus temas en <b>listas de temas</b> (un concierto, un alumno, tu rutina) y ordena las listas en <b>carpetas</b>.</p><p>Elige la lista en el desplegable de abajo; las carpetas se abren y cierran con un toque. En <b>Editar</b> cambias el nombre o la carpeta.</p>' },
  { t: 'Compartir y sin conexión',
    art: '<div class="g-text">Lista de temas: Concierto\nCarpeta: Conciertos\nApertura: 126\nVals: 84</div>',
    p: `<p><b>Compartir</b> copia una lista (o todas) como <b>texto</b> o como <b>enlace</b>. <b>Importar</b> acepta los dos.</p><p>Puedes <b>instalar la app</b> en la pantalla de inicio y funciona <b>sin conexión</b>.</p><p><a class="pdf" href="${PDF_URL}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>Ayuda completa en PDF</a></p>` }
];

let gStep = 0, gReturn = null;
function paintGuide() {
  const s = GUIDE[gStep], last = gStep === GUIDE.length - 1;
  $('#guideStep').textContent = `Paso ${gStep + 1} de ${GUIDE.length}`;
  $('#guideArt').innerHTML = s.art;
  $('#guideTitle').textContent = s.t;
  $('#guideText').innerHTML = s.p;
  $('#guideDots').innerHTML = GUIDE.map((_, i) => `<span class="${i === gStep ? 'on' : ''}"></span>`).join('');
  $('#guidePrev').disabled = gStep === 0;
  $('#guideNext').textContent = last ? 'Empezar a usarlo' : 'Siguiente';
  $('#guideSkip').hidden = last;
}
function guideGo(d) {
  const n = gStep + d;
  if (n >= GUIDE.length) return closeGuide();
  if (n < 0) return;
  gStep = n; paintGuide();
  say(`Paso ${gStep + 1} de ${GUIDE.length}: ${GUIDE[gStep].t}`);
}
function openGuide() {
  const dlg = $('#guide');
  gReturn = document.activeElement; gStep = 0; paintGuide();
  if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  $('#guideNext').focus();
}
function markSeen() { if (!st.seen) { st.seen = true; save(); } }
function closeGuide() {
  const dlg = $('#guide');
  markSeen();
  if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
}
function bindGuide() {
  const dlg = $('#guide');
  $('#guideBtn').addEventListener('click', openGuide);
  $('#guideNext').addEventListener('click', () => guideGo(1));
  $('#guidePrev').addEventListener('click', () => guideGo(-1));
  $('#guideSkip').addEventListener('click', closeGuide);
  dlg.addEventListener('close', () => {
    markSeen();   // también al cerrar con Esc
    const r = gReturn && document.contains(gReturn) ? gReturn : $('#play');
    r.focus({ preventScroll: true });
  });
  dlg.addEventListener('keydown', e => {
    if (e.target.closest('a,button') && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); guideGo(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); guideGo(-1); }
  });
  // Deslizar el dedo de lado cambia de paso
  let sx = null, sy = null;
  dlg.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  dlg.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) guideGo(dx < 0 ? 1 : -1);
  });
}
