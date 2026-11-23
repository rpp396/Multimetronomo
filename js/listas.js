/* Multimetrónomo · listas.js
   Listas de temas organizadas en carpetas: desplegable propio (las carpetas se abren y cierran),
   crear, cambiar nombre o carpeta y borrar listas. Una lista sin carpeta va al final. */
'use strict';

const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5A1.5 1.5 0 014.5 5H9l2 2.5h8.5A1.5 1.5 0 0121 9v8.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5z"/></svg>';

const listTitle = i => `${st.lists[i].n} · ${st.lists[i].p.length} ${st.lists[i].p.length === 1 ? 'tema' : 'temas'}`;
// [[carpeta, [índices de listas]], …] por orden alfabético; '' (sin carpeta) al final
function folders() {
  const m = new Map();
  st.lists.forEach((l, i) => { const k = l.f || ''; if (!m.has(k)) m.set(k, []); m.get(k).push(i); });
  return [...m.entries()].sort((x, y) => (x[0] === '' ? 1 : y[0] === '' ? -1 : x[0].localeCompare(y[0], 'es')));
}
const folderNames = () => [...new Set(st.lists.map(l => l.f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

function paintLists() {
  const L = st.lists[st.li], closed = new Set(st.closed);
  const panel = ui.ddOpen ? `<div class="dd-panel" id="ddPanel">${folders().map(([fname, ids]) => {
    const items = ids.map(i => `<button type="button" class="dd-item${fname ? '' : ' nofolder'}" data-li="${i}" aria-current="${i === st.li}"><span>${esc(st.lists[i].n)}</span><span class="cnt" aria-label="${st.lists[i].p.length} temas">${st.lists[i].p.length}</span></button>`).join('');
    if (!fname) return items;
    const open = !closed.has(fname);
    return `<button type="button" class="dd-folder" data-f="${esc(fname)}" aria-expanded="${open}"><span class="chev"></span>${FOLDER_ICON}<span>${esc(fname)}</span><span class="cnt" aria-label="${ids.length} listas">${ids.length}</span></button>${open ? items : ''}`;
  }).join('')}</div>` : '';
  $('#lists').innerHTML = `<span class="lbl" id="listsLbl">Lista de temas</span>
    <div class="dd"><button type="button" class="dd-btn" id="ddBtn" aria-expanded="${ui.ddOpen}" aria-controls="ddPanel" aria-describedby="listsLbl">${L.f ? `<small>${esc(L.f)}</small>` : ''}<b>${esc(listTitle(st.li))}</b></button>${panel}</div>
    <div class="acts">${ui.editing
      ? `<button type="button" class="btn" id="listRen">Nombre y carpeta</button>${st.lists.length > 1 ? '<button type="button" class="btn del" id="listDel">Borrar lista</button>' : ''}`
      : '<button type="button" class="btn" id="listNew">+ Nueva</button><button type="button" class="btn" id="listShare">Compartir</button><button type="button" class="btn" id="listImp">Importar</button>'}</div>`;
}

function pickList(i) {
  st.li = i; ui.ddOpen = false; closeSheets();
  st.idx = P().length ? 0 : -1;
  paintLists();
  if (st.idx >= 0) setBpm(P()[0].b, 'preset'); else { paintPresets(); save(); }
  say(`Lista de temas: ${st.lists[i].n}`);
}
function setDd(open, focusSel) {
  ui.ddOpen = open; paintLists();
  if (open) { const c = $('.dd-item[aria-current="true"]') || $('#ddPanel button'); if (c) c.focus(); }
  else if (focusSel !== false) $('#ddBtn').focus();
}

function bindLists() {
  const box = $('#lists');
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'ddBtn') return setDd(!ui.ddOpen);
    if (b.classList.contains('dd-item')) { pickList(+b.dataset.li); $('#ddBtn').focus(); return; }
    if (b.classList.contains('dd-folder')) {
      const k = b.dataset.f, s = new Set(st.closed);
      s.has(k) ? s.delete(k) : s.add(k); st.closed = [...s]; save(); paintLists();
      const nb = $$('.dd-folder').find(x => x.dataset.f === k); if (nb) nb.focus();
      return;
    }
    if (b.id === 'listNew') return listSheet(-1);
    if (b.id === 'listRen') return listSheet(st.li);
    if (b.id === 'listShare') return shareSheet();
    if (b.id === 'listImp') return importSheet('');
    if (b.id === 'listDel') {
      if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = '¿Borrar lista de temas?'; return; }
      const name = st.lists[st.li].n;
      st.lists.splice(st.li, 1);
      pickList(Math.max(0, st.li - 1));
      say(`Borrada la lista «${name}»`); $('#ddBtn').focus();
    }
  });
  // Flechas dentro del desplegable; Esc lo cierra; tocar fuera también
  box.addEventListener('keydown', e => {
    if (!ui.ddOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); setDd(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const bs = $$('#ddPanel button'), i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault(); bs[Math.max(0, Math.min(bs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
    }
  });
  document.addEventListener('pointerdown', e => { if (ui.ddOpen && !e.target.closest('.dd')) setDd(false, false); });
}

// i = −1: lista nueva; si no, cambiar nombre y carpeta de la lista i
function listSheet(i) {
  closeSheets(); ui.ddOpen = false; paintLists();
  if (i < 0 && st.lists.length >= LISTS_MAX) { toast(`Puedes guardar hasta ${LISTS_MAX} listas de temas.`); return; }
  const L = i < 0 ? { n: '', f: '' } : st.lists[i];
  $('#listBox').innerHTML = `<form class="sheet" id="lSheet" aria-labelledby="lTitle"><div class="lbl" id="lTitle">${i < 0 ? 'Nueva lista de temas' : 'Nombre y carpeta'}</div>
    <label>Nombre de la lista de temas<input id="lName" maxlength="${NAME_MAX}" autocomplete="off" placeholder="Ej.: Concierto del sábado" value="${esc(L.n)}"></label>
    <label>Carpeta (opcional)<input id="lFolder" maxlength="${NAME_MAX}" autocomplete="off" list="folderList" placeholder="Ej.: Conciertos, Alumnos…" value="${esc(L.f)}"></label>
    <datalist id="folderList">${folderNames().map(x => `<option value="${esc(x)}"></option>`).join('')}</datalist>
    <p class="hint">Escribe una carpeta nueva o elige una que ya tengas. Si la dejas vacía, la lista queda sin carpeta.</p>
    <div class="acts"><button type="submit" class="btn pri">${i < 0 ? 'Crear' : 'Guardar'}</button><button type="button" class="btn" id="lCancel">Cancelar</button></div></form>`;
  $('#lSheet').addEventListener('submit', e => {
    e.preventDefault();
    const n = cleanName($('#lName').value, 'Lista ' + (st.lists.length + 1)), f = cleanName($('#lFolder').value);
    if (f) st.closed = st.closed.filter(x => x !== f);
    if (i < 0) { st.lists.push({ n, f, p: [] }); closeSheets(); pickList(st.lists.length - 1); say(`Creada la lista «${n}»`); }
    else { st.lists[i].n = n; st.lists[i].f = f; closeSheets(); paintLists(); paintPresets(); save(); say('Cambios guardados'); }
    $('#ddBtn').focus();
  });
  $('#lCancel').addEventListener('click', () => { closeSheets(); $('#ddBtn').focus(); });
  $('#lName').focus();
  $('#lSheet').scrollIntoView({ block: 'nearest', behavior: smooth() });
}
