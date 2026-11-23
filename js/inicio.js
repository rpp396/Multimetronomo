/* Multimetrónomo · inicio.js (debe ser el último script)
   Conecta los controles, pinta el estado guardado, abre la guía la primera vez o un enlace compartido,
   y registra el service worker para que la app funcione sin conexión. */
'use strict';

$('#play').addEventListener('click', toggle);
$('#sound').addEventListener('click', toggleSound);
bindSteps(); bindInput(); bindTap(); bindSlider();
bindPresets(); bindLists(); bindGuide();

// Atajos con teclado físico: Espacio empieza/detiene, ← → tema anterior/siguiente (no mientras se escribe)
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || $('#guide').open) return;
  const t = e.target;
  if (t.closest('input,textarea,select,[contenteditable]') || ui.ddOpen) return;
  if (e.key === ' ' && !t.closest('button,a')) { e.preventDefault(); toggle(); }
  else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !t.closest('#guide')) { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
});

/* ---------- Arranque ---------- */
paintSound(); paintPlay(); paintLists();
setBpm(st.idx >= 0 ? P()[st.idx].b : st.bpm, 'preset');
draw(); markStuck();
if (!openSharedFromHash() && !st.seen) openGuide();

/* ---------- Sin conexión ---------- */
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
