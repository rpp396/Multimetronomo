/* Multimetrónomo · datos.js
   Ayudas comunes, límites, estado guardado (localStorage) y su validación.
   Scripts clásicos (no módulos): lo declarado aquí se ve desde los archivos que se cargan después. */
'use strict';

/* ---------- Ayudas ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const smooth = () => (reduceMotion() ? 'auto' : 'smooth');

/* ---------- Límites ---------- */
const MIN = 30, MAX = 300;          // tempo, en pulsos por minuto
const NAME_MAX = 40;                // nombres de temas, listas y carpetas
const ITEMS_MAX = 60;               // temas por lista
const LISTS_MAX = 100;              // listas de temas guardadas
const IMPORT_MAX = 30;              // listas por importación
const TEXT_MAX = 20000;             // caracteres de un texto o enlace importado
const LINK_WARN = 2000;             // a partir de aquí, avisar de que el enlace es largo
const KEY = 'multimetronomo-v1';

const clamp = b => Math.min(MAX, Math.max(MIN, Math.round(b)));
const cleanName = (s, def = '') => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, NAME_MAX) : '') || def;

/* Término italiano aproximado del tempo */
function tempoMark(b) {
  return b < 40 ? 'Grave' : b < 60 ? 'Largo' : b < 66 ? 'Larghetto' : b < 76 ? 'Adagio' : b < 108 ? 'Andante'
    : b < 120 ? 'Moderato' : b < 156 ? 'Allegro' : b < 176 ? 'Vivace' : b < 200 ? 'Presto' : 'Prestissimo';
}

/* ---------- Estado ---------- */
// Listas de ejemplo para la primera vez
function demoLists() {
  return [
    { n: 'Ensayo', f: 'Banda', p: [{ n: 'Calentamiento', b: 72 }, { n: 'Ensayo', b: 96 }, { n: 'Estudio lento', b: 60 }, { n: 'Balada', b: 66 }, { n: 'Tema 2', b: 112 }, { n: 'Rápido', b: 160 }] },
    { n: 'Concierto', f: 'Conciertos', p: [{ n: 'Apertura', b: 126 }, { n: 'Vals', b: 84 }, { n: 'Bolero', b: 72 }, { n: 'Final', b: 150 }] },
    { n: 'Técnica diaria', f: '', p: [{ n: 'Escalas', b: 60 }, { n: 'Arpegios', b: 80 }] }
  ];
}
function freshState() {
  return { v: 1, bpm: 96, sound: true, li: 0, idx: 1, lists: demoLists(), closed: [], seen: false };
}
// Todo lo que viene de fuera (localStorage, texto o enlace importado) se copia campo a campo, con tipo y rango.
function cleanItems(a) {
  return Array.isArray(a) ? a.filter(p => isObj(p) && Number.isFinite(p.b)).slice(0, ITEMS_MAX)
    .map((p, i) => ({ n: cleanName(p.n, 'Tema ' + (i + 1)), b: clamp(p.b) })) : [];
}
function cleanList(l, i) {
  return isObj(l) ? { n: cleanName(l.n, 'Lista ' + (i + 1)), f: cleanName(l.f), p: cleanItems(l.p) } : null;
}
function cleanState(s) {
  const d = freshState();
  if (!isObj(s)) return d;
  if (Array.isArray(s.lists)) {
    const L = s.lists.slice(0, LISTS_MAX).map(cleanList).filter(Boolean);
    d.lists = L.length ? L : [{ n: 'Mis temas', f: '', p: [] }];
  }
  if (Number.isFinite(s.bpm)) d.bpm = clamp(s.bpm);
  if (typeof s.sound === 'boolean') d.sound = s.sound;
  if (typeof s.seen === 'boolean') d.seen = s.seen;
  d.li = Number.isInteger(s.li) && s.li >= 0 && s.li < d.lists.length ? s.li : 0;
  d.idx = Number.isInteger(s.idx) && s.idx >= -1 && s.idx < d.lists[d.li].p.length ? s.idx : -1;
  if (Array.isArray(s.closed)) d.closed = s.closed.filter(x => typeof x === 'string').map(x => cleanName(x)).filter(Boolean).slice(0, LISTS_MAX);
  return d;
}
function load() {
  try { return cleanState(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (e) { return freshState(); }
}
let saveFailed = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(st)); saveFailed = false; }
  catch (e) { if (!saveFailed) toast('No se pudo guardar: el navegador no deja usar el almacenamiento.'); saveFailed = true; }
}

let st = load();
const P = () => st.lists[st.li].p;      // temas de la lista actual
// Estado de la pantalla, que no se guarda
const ui = { playing: false, editing: false, ddOpen: false };

/* ---------- Avisos ---------- */
function say(text) {             // para lectores de pantalla
  const el = $('#srLive'); if (!el) return;
  el.textContent = ''; setTimeout(() => { el.textContent = text; }, 30);
}
let toastT = null;
function toast(text, ms) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 3500 + text.length * 30);
}
