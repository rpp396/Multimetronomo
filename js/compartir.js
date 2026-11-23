/* Multimetrónomo · compartir.js
   Exportar e importar listas de temas como texto, y compartirlas como enlace (#temas= + el texto en base64url).
   Formato de texto (también vale escrito a mano):
     Lista de temas: Concierto
     Carpeta: Conciertos
     Apertura: 126
     Vals 84
   Cada línea con un número entre 30 y 300 es un tema: el último número es el tempo y el resto, el nombre. */
'use strict';

function toText(ids) {
  return ids.map(i => {
    const l = st.lists[i];
    return ['Lista de temas: ' + l.n].concat(l.f ? ['Carpeta: ' + l.f] : [], l.p.map(p => `${p.n}: ${p.b}`)).join('\n');
  }).join('\n\n') + '\n';
}

function parseText(txt) {
  txt = String(txt).slice(0, TEXT_MAX).replace(/\r/g, '');
  const out = []; let cur = null;
  const begin = n => { cur = { n: cleanName(n, 'Lista importada'), f: '', p: [] }; out.push(cur); };
  for (let line of txt.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    let m = line.match(/^lista(?:\s+de\s+temas)?\s*:\s*(.*)$/i);
    if (m) { begin(m[1]); continue; }
    m = line.match(/^carpeta\s*:\s*(.*)$/i);
    if (m) { if (!cur) begin(''); cur.f = cleanName(m[1]); continue; }
    const nums = [...line.matchAll(/\d+/g)].filter(x => x[0].length <= 3 && +x[0] >= MIN && +x[0] <= MAX);
    if (!nums.length) continue;
    const last = nums[nums.length - 1];
    const rest = (line.slice(0, last.index) + line.slice(last.index + last[0].length))
      .replace(/\b(ppm|bpm)\b/gi, '').replace(/^[\s:=,;·\-–—|]+|[\s:=,;·\-–—|]+$/g, '');
    if (!cur) begin('');
    if (cur.p.length < ITEMS_MAX) cur.p.push({ n: cleanName(rest, 'Tema ' + (cur.p.length + 1)), b: +last[0] });
  }
  return out.filter(l => l.p.length).slice(0, IMPORT_MAX);
}

/* ---------- Enlaces ---------- */
const b64e = t => { let s = ''; for (const c of new TextEncoder().encode(t)) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64d = t => new TextDecoder().decode(Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
const linkFor = txt => location.href.split('#')[0] + '#temas=' + b64e(txt);
// Devuelve el texto que lleva un enlace (o un hash) de Multimetrónomo, o null
function fromLink(v) {
  const m = String(v).slice(0, TEXT_MAX * 2).match(/#temas=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try { return b64d(m[1]); } catch (e) { return null; }
}

async function copy(text, btn, field) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copiado ✓'; say('Copiado'); }
  catch (e) { if (field) { field.focus(); field.select(); } btn.textContent = 'Selecciónalo y copia'; }
  setTimeout(() => { btn.textContent = old; }, 1800);
}

function shareSheet() {
  closeSheets(); ui.ddOpen = false; paintLists();
  let all = false;
  const render = () => {
    const ids = all ? st.lists.map((_, i) => i) : [st.li];
    const txt = toText(ids), url = linkFor(txt);
    $('#listBox').innerHTML = `<div class="sheet" id="sSheet" role="group" aria-labelledby="sTitle"><div class="lbl" id="sTitle">Compartir</div>
      <div class="seg2" role="group" aria-label="Qué compartir"><button type="button" id="shOne" aria-pressed="${!all}">Esta lista</button><button type="button" id="shAll" aria-pressed="${all}">Todas (${st.lists.length})</button></div>
      <label>Como texto<textarea id="shTxt" readonly>${esc(txt)}</textarea></label>
      <div class="acts"><button type="button" class="btn pri" id="cpTxt">Copiar texto</button><button type="button" class="btn" id="cpUrl">Copiar enlace</button>${navigator.share ? '<button type="button" class="btn" id="shNative">Enviar…</button>' : ''}</div>
      <label>Enlace<input id="shUrl" readonly value="${esc(url)}"></label>
      <p class="hint">Quien abra el enlace verá qué contiene y podrá añadirlo a sus listas.${url.length > LINK_WARN ? ' <b>El enlace es largo: algunas apps de mensajería lo cortan; si pasa, comparte el texto.</b>' : ''}</p>
      <div class="acts"><button type="button" class="btn" id="sClose">Cerrar</button></div></div>`;
    $('#shOne').addEventListener('click', () => { all = false; render(); $('#shOne').focus(); });
    $('#shAll').addEventListener('click', () => { all = true; render(); $('#shAll').focus(); });
    $('#cpTxt').addEventListener('click', e => copy(txt, e.target, $('#shTxt')));
    $('#cpUrl').addEventListener('click', e => copy(url, e.target, $('#shUrl')));
    const nat = $('#shNative');
    if (nat) nat.addEventListener('click', () => navigator.share({ title: 'Multimetrónomo', text: txt, url }).catch(() => {}));
    $('#sClose').addEventListener('click', () => { closeSheets(); $('#listShare').focus(); });
  };
  render(); $('#cpTxt').focus({ preventScroll: true });
  $('#sSheet').scrollIntoView({ block: 'nearest', behavior: smooth() });
}

function addImported(L) {
  const names = new Set(st.lists.map(l => l.n));
  const room = LISTS_MAX - st.lists.length;
  const take = L.slice(0, Math.max(0, room));
  take.forEach(l => {
    let n = l.n, k = 2;
    while (names.has(n)) n = cleanName(`${l.n.slice(0, NAME_MAX - 5)} (${k++})`);
    names.add(n); st.lists.push({ n, f: l.f, p: l.p });
  });
  return take.length;
}

// pre: texto o enlace para rellenar (al abrir un enlace compartido)
function importSheet(pre) {
  closeSheets(); ui.ddOpen = false; paintLists();
  $('#listBox').innerHTML = `<form class="sheet" id="iSheet" aria-labelledby="iTitle"><div class="lbl" id="iTitle">${pre ? 'Te compartieron listas de temas' : 'Importar listas de temas'}</div>
    <label>Pega aquí el texto o el enlace<textarea id="imTxt" spellcheck="false" placeholder="Lista de temas: Concierto&#10;Carpeta: Conciertos&#10;Apertura: 126&#10;Vals: 84"></textarea></label>
    <p class="hint" id="imInfo" role="status"></p>
    <div class="acts"><button type="submit" class="btn pri" id="imGo" disabled>Importar</button><button type="button" class="btn" id="iCancel">Cancelar</button></div></form>`;
  const ta = $('#imTxt'), info = $('#imInfo'), HELP = 'Una línea por tema con su nombre y su tempo, por ejemplo «Vals 84» o «Vals: 84».';
  ta.value = pre || '';
  const check = () => {
    const L = parseText(fromLink(ta.value) ?? ta.value), n = L.reduce((a, l) => a + l.p.length, 0);
    $('#imGo').disabled = !L.length;
    info.className = L.length ? 'ok' : 'hint';
    info.textContent = L.length
      ? `Se añadirán ${L.length} ${L.length > 1 ? 'listas de temas' : 'lista de temas'} con ${n} ${n === 1 ? 'tema' : 'temas'}: ${L.map(l => l.n).join(', ')}.`
      : (ta.value.trim() ? `No encontré temas con un tempo entre ${MIN} y ${MAX}. ${HELP}` : HELP);
    return L;
  };
  ta.addEventListener('input', check); check();
  $('#iSheet').addEventListener('submit', e => {
    e.preventDefault();
    const L = check(); if (!L.length) return;
    const first = st.lists.length, added = addImported(L);
    if (!added) { toast(`Ya tienes ${LISTS_MAX} listas de temas: borra alguna para importar.`); return; }
    clearShareHash(); closeSheets(); pickList(first);
    toast(added < L.length ? `Importadas ${added} de ${L.length} listas: no caben más.` : `Importada${added > 1 ? 's' : ''} ${added} ${added > 1 ? 'listas de temas' : 'lista de temas'}.`);
    $('#ddBtn').focus();
  });
  $('#iCancel').addEventListener('click', () => { clearShareHash(); closeSheets(); $('#ddBtn').focus(); });
  if (pre) $('#imGo').focus({ preventScroll: true }); else ta.focus({ preventScroll: true });
  $('#iSheet').scrollIntoView({ block: pre ? 'center' : 'nearest', behavior: pre ? 'auto' : smooth() });
}
function clearShareHash() {
  if (location.hash.startsWith('#temas=')) history.replaceState(null, '', location.href.split('#')[0]);
}
// Abrir un enlace compartido: al cargar (inicio.js) y si cambia el hash con la app abierta
function openSharedFromHash() {
  const t = fromLink(location.hash);
  if (t !== null) importSheet(t);
  return t !== null;
}
addEventListener('hashchange', openSharedFromHash);
