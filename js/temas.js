/* Multimetrónomo · temas.js
   Temas prefijados de la lista actual: grilla, anterior/siguiente (barra fija de abajo) y edición
   (guardar el tempo actual con nombre, cambiar nombre o tempo, mover y borrar). */
'use strict';

// Elegir el tema i de la lista actual (con vuelta: después del último viene el primero)
function choose(i) {
  const n = P().length; if (!n) return;
  st.idx = ((i % n) + n) % n;
  setBpm(P()[st.idx].b, 'preset');
  say(`${P()[st.idx].n}, ${P()[st.idx].b}`);
}
// d = +1 siguiente, −1 anterior. Con un tempo libre (ningún tema elegido) va al tema de tempo más cercano en ese sentido.
function go(d) {
  const L = P(); if (!L.length) { toast('Esta lista de temas está vacía.'); return; }
  if (st.idx >= 0) return choose(st.idx + d);
  const order = L.map((p, i) => [p.b, i]).sort((a, c) => a[0] - c[0]);
  const f = d > 0 ? order.find(x => x[0] > st.bpm) : [...order].reverse().find(x => x[0] < st.bpm);
  choose(f ? f[1] : (d > 0 ? order[0][1] : order[order.length - 1][1]));
}

function paintCur() {
  const p = P()[st.idx];
  $('#cur').innerHTML = p ? `<b>${esc(p.n)}</b><span>${st.idx + 1} de ${P().length}</span>`
    : `<b>Tempo libre</b><span>${P().length} ${P().length === 1 ? 'tema' : 'temas'}</span>`;
}
function paintPresets() {
  paintCur();
  const db = $('#ddBtn b'); if (db) db.textContent = listTitle(st.li);
  const g = $('#grid');
  g.classList.toggle('editing', ui.editing);
  g.innerHTML = P().map((q, i) => `<button type="button" class="pre" data-i="${i}" aria-pressed="${i === st.idx}" aria-label="${esc(q.n)}, ${q.b} ppm${ui.editing ? ', editar' : ''}"><span class="n">${q.b}</span><span class="t">${esc(q.n)}</span></button>`).join('')
    + (P().length ? '' : '<p class="empty">Esta lista de temas está vacía. Ajusta un tempo y guárdalo aquí.</p>')
    + `<button type="button" class="pre add" id="addPre">+ Guardar<br>${st.bpm} ppm</button>`;
}
function bindPresets() {
  // Delegación: la grilla se repinta a menudo
  $('#grid').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'addPre') return presetSheet(-1);
    const i = +b.dataset.i;
    if (ui.editing) presetSheet(i); else choose(i);
  });
  $$('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
  $('#edit').addEventListener('click', () => setEditing(!ui.editing));
}
function setEditing(on) {
  ui.editing = on;
  const b = $('#edit'); b.textContent = on ? 'Listo' : 'Editar'; b.setAttribute('aria-pressed', on);
  closeSheets(); paintLists(); paintPresets();
}

function closeSheets() { $('#sheetBox').innerHTML = ''; $('#listBox').innerHTML = ''; }

// i = −1: guardar el tempo actual como tema nuevo; si no, editar el tema i
function presetSheet(i) {
  closeSheets();
  const L = P(), p = i < 0 ? { n: '', b: st.bpm } : L[i];
  if (i < 0 && L.length >= ITEMS_MAX) { toast(`Una lista de temas admite hasta ${ITEMS_MAX} temas.`); return; }
  $('#sheetBox').innerHTML = `<form class="sheet" id="pSheet" aria-labelledby="pTitle">
    <div class="lbl" id="pTitle">${i < 0 ? 'Guardar el tempo actual' : 'Editar tema'}</div>
    <div class="two"><label>Nombre<input id="pName" maxlength="${NAME_MAX}" autocomplete="off" enterkeyhint="done" placeholder="Ej.: Tema 4, Escalas…" value="${esc(p.n)}"></label>
    <label>Tempo<input id="pBpm" type="number" inputmode="numeric" min="${MIN}" max="${MAX}" value="${p.b}"></label></div>
    <div class="acts">${i > 0 ? '<button type="button" class="btn" id="pUp">↑ Antes</button>' : ''}${i >= 0 && i < L.length - 1 ? '<button type="button" class="btn" id="pDown">↓ Después</button>' : ''}</div>
    <div class="acts"><button type="submit" class="btn pri">Guardar</button><button type="button" class="btn" id="pCancel">Cancelar</button>${i >= 0 ? '<button type="button" class="btn del" id="pDel">Borrar</button>' : ''}</div></form>`;
  $('#pSheet').addEventListener('submit', e => {
    e.preventDefault();
    const n = cleanName($('#pName').value, 'Tema ' + (i < 0 ? L.length + 1 : i + 1));
    const b = clamp(+$('#pBpm').value || st.bpm);
    if (i < 0) { L.push({ n, b }); st.idx = L.length - 1; } else { L[i] = { n, b }; st.idx = i; }
    closeSheets(); setBpm(b, 'preset'); paintLists();
    say(i < 0 ? `Guardado «${n}»` : `Cambios guardados en «${n}»`);
    focusPreset(st.idx);
  });
  $('#pCancel').addEventListener('click', () => { closeSheets(); if (i >= 0) focusPreset(i); else $('#addPre').focus(); });
  const del = $('#pDel');
  if (del) del.addEventListener('click', () => {
    if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = '¿Borrar? Toca otra vez'; return; }
    const name = L[i].n;
    L.splice(i, 1);
    if (st.idx === i) st.idx = -1; else if (st.idx > i) st.idx--;
    closeSheets(); paintPresets(); paintLists(); save(); say(`Borrado «${name}»`);
    (L.length ? focusPreset(Math.min(i, L.length - 1)) : $('#addPre').focus());
  });
  const move = d => {
    const j = i + d;
    [L[i], L[j]] = [L[j], L[i]];
    if (st.idx === i) st.idx = j; else if (st.idx === j) st.idx = i;
    save(); paintPresets(); presetSheet(j);
    const k = $(d < 0 ? '#pUp' : '#pDown') || $(d < 0 ? '#pDown' : '#pUp'); if (k) k.focus();
  };
  const up = $('#pUp'); if (up) up.addEventListener('click', () => move(-1));
  const dn = $('#pDown'); if (dn) dn.addEventListener('click', () => move(1));
  // En el celular no se abre el teclado al editar (solo al crear)
  if (i < 0 || !matchMedia('(any-pointer: coarse)').matches) $('#pName').focus();
  $('#pSheet').scrollIntoView({ block: 'nearest', behavior: smooth() });
}
function focusPreset(i) { const b = $(`.pre[data-i="${i}"]`); if (b) b.focus({ preventScroll: true }); }
