'use strict';
/* Hızlı Not — app. Depends on db.js (DB, newId, itemsFromInput, saveItems, URL_RE) and vendor/jszip. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const now = () => Date.now();

const S = {
  items: [], idx: new Map(), view: 'list', q: '', hits: null,
  filter: { type: 'all', tag: null, star: false }, attach: [],
  settings: {}, bridgeOk: false, aiBusy: false, limit: 300,
  cam: null, linkFrom: null, urls: new Map(),
};

// ---------- utils ----------
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}
const domain = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtTime = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
function fmtDay(key) {
  const today = dayKey(now()), yest = dayKey(now() - 864e5);
  if (key === today) return 'Bugün'; if (key === yest) return 'Dün';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'short' });
}
const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n > 1e3 ? Math.round(n / 1e3) + ' KB' : n ? n + ' B' : '';
function kindIcon(i) {
  if (i.type === 'link') return '🔗'; if (i.type === 'note') return '📝';
  const m = i.mime || '', n = (i.fileName || '').toLowerCase();
  if (m.startsWith('image') || /\.(jpe?g|png|gif|webp|heic)$/.test(n)) return '🖼️';
  if (m.startsWith('video') || /\.(mp4|mov|3gp|webm)$/.test(n)) return '🎬';
  if (m.startsWith('audio') || /\.(opus|mp3|m4a|ogg|wav|aac)$/.test(n)) return '🎵';
  if (m.includes('pdf') || n.endsWith('.pdf')) return '📄';
  return '📦';
}
const isImage = i => i.type === 'file' && kindIcon(i) === '🖼️';
function titleOf(i) {
  if (i.title) return i.title;
  if (i.type === 'link') return i.meta?.title || (domain(i.url) + decodeURI(new URL(i.url).pathname).replace(/\/$/, ''));
  if (i.type === 'file') return i.fileName;
  return (i.text || '').split('\n')[0].slice(0, 140);
}
function subOf(i) {
  if (i.type === 'link') return i.summary || i.meta?.description || i.text || '';
  if (i.type === 'file') return i.summary || i.text || '';
  const t = i.text || '';
  return i.title ? (i.summary || t) : (t.includes('\n') ? t.slice(t.indexOf('\n') + 1) : (i.summary || ''));
}
const alive = () => S.items.filter(i => !i.deleted);

// ---------- search ----------
function indexItem(i) {
  const h = norm([i.title, i.meta?.title, i.meta?.description, i.meta?.site, i.text, i.url, i.url && domain(i.url),
    i.fileName, i.summary, (i.tags || []).join(' ')].filter(Boolean).join(' '));
  S.idx.set(i.id, { h, w: [...new Set(h.split(/[^a-z0-9]+/).filter(Boolean))] });
}
function near(a, b) { // edit distance <= 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++e > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
}
function scoreItem(i, toks, any) {
  const x = S.idx.get(i.id); if (!x) return 0;
  let score = 0, hit = 0;
  for (const t of toks) {
    let s = 0;
    if (x.h.includes(t)) s = x.w.some(w => w.startsWith(t)) ? 3 : 2;
    else if (t.length >= 4 && x.w.some(w => near(w.slice(0, t.length), t) || near(w, t))) s = 1;
    if (s) { hit++; score += s; } else if (!any) return 0;
  }
  return hit ? score + (i.starred ? .5 : 0) : 0;
}
const tokens = q => norm(q).split(/\s+/).filter(t => t.length > 1 || /\d/.test(t));
function runSearch() {
  const q = S.q.trim();
  if (!q || q.startsWith('?')) { S.hits = null; return; }
  const toks = tokens(q); S.hits = new Map();
  for (const i of S.items) { if (i.deleted) continue; const s = scoreItem(i, toks); if (s) S.hits.set(i.id, s); }
}
const CH = { i: '[iıİI]', s: '[sşŞ]', g: '[gğĞ]', u: '[uüÜ]', o: '[oöÖ]', c: '[cçÇ]' };
function hl(text) {
  const out = esc(text);
  if (!S.hits || !S.q.trim()) return out;
  const toks = tokens(S.q).filter(t => t.length > 1);
  if (!toks.length) return out;
  const re = new RegExp('(' + toks.map(t => [...t].map(c => CH[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')).join('|') + ')', 'gi');
  return out.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(re, '<mark>$1</mark>'));
}

function visible() {
  const f = S.filter;
  return S.items.filter(i => !i.deleted
    && (f.type === 'all' || i.type === f.type)
    && (!f.tag || (i.tags || []).includes(f.tag))
    && (!f.star || i.starred)
    && (!S.hits || S.hits.has(i.id))
  ).sort((a, b) => b.ts - a.ts);
}

// ---------- file blobs ----------
async function blobFor(i) {
  if (S.urls.has(i.id)) return S.urls.get(i.id);
  let rec = await DB.get('files', i.id);
  if (!rec && i.fileSynced && Sync.ready()) {
    try { const blob = await Sync.downloadFile(i); rec = { id: i.id, blob }; await DB.put('files', rec); } catch { }
  }
  if (!rec) return null;
  const blob = rec.blob.type || !i.mime ? rec.blob : new Blob([rec.blob], { type: i.mime });
  const url = URL.createObjectURL(blob); S.urls.set(i.id, url); return url;
}
const thumbIO = new IntersectionObserver(es => es.forEach(async e => {
  if (!e.isIntersecting) return;
  thumbIO.unobserve(e.target);
  const i = S.items.find(x => x.id === e.target.dataset.fid);
  const u = i && await blobFor(i); if (u) e.target.src = u;
}), { rootMargin: '300px' });
function thumbHtml(i, cls = 'thumb') {
  if (isImage(i)) return `<img class="${cls}" data-fid="${i.id}" alt="">`;
  if (i.type === 'link' && i.meta?.image) return `<img class="${cls}" src="${esc(i.meta.image)}" referrerpolicy="no-referrer" loading="lazy" alt="" onerror="this.remove()">`;
  return '';
}
const hookThumbs = root => root.querySelectorAll('img[data-fid]').forEach(el => thumbIO.observe(el));

// ---------- render ----------
function itemRow(i, tag = 'div', cls = 'item') {
  const th = thumbHtml(i);
  return `<${tag} class="${cls}${S.hits?.has(i.id) ? ' hit' : ''}" data-id="${i.id}">
    ${th || `<div class="kind ${i.type}">${kindIcon(i)}</div>`}
    <div class="body">
      <div class="title">${i.starred ? '⭐ ' : ''}${hl(titleOf(i))}</div>
      ${subOf(i) ? `<div class="sub">${hl(subOf(i).slice(0, 400))}</div>` : ''}
      <div class="meta"><span class="time">${fmtTime(i.ts)}</span>
        ${i.type === 'link' ? `<span class="time">${esc(domain(i.url))}</span>` : ''}
        ${i.type === 'file' && i.size ? `<span class="time">${fmtSize(i.size)}</span>` : ''}
        ${(i.tags || []).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}
        ${i.pending && S.bridgeOk ? '<span class="pending">• düzenlenecek</span>' : ''}</div>
    </div></${tag}>`;
}

function renderList(items) {
  const el = $('#list'); let html = '', lastDay = '', lastGroup = null, open = false;
  for (const i of items.slice(0, S.limit)) {
    const dk = dayKey(i.ts);
    if (dk !== lastDay) { if (open) html += '</div>'; open = false; html += `<div class="day">${fmtDay(dk)}</div>`; lastDay = dk; lastGroup = null; }
    if (i.group !== lastGroup || !open) { if (open) html += '</div>'; html += '<div class="group">'; open = true; lastGroup = i.group; }
    html += itemRow(i);
  }
  if (open) html += '</div>';
  if (items.length > S.limit) html += `<div id="more" class="empty">Daha fazla yükleniyor… (${items.length - S.limit})</div>`;
  el.innerHTML = html; hookThumbs(el);
  const more = $('#more');
  if (more) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); S.limit += 300; render(); } }).observe(more);
}

function renderGallery(items) {
  const el = $('#gallery');
  const media = items.filter(i => i.type === 'file' || (i.type === 'link' && i.meta?.image)).slice(0, S.limit);
  el.innerHTML = media.map(i => `<div class="tile${S.hits?.has(i.id) ? ' hit' : ''}" data-id="${i.id}">
    ${thumbHtml(i, 'tile-img') || `<div class="tile-ico">${kindIcon(i)}</div>`}
    <div class="tile-cap">${esc(titleOf(i))}</div></div>`).join('') || '<div class="empty">Burada resim, dosya ve görselli linkler görünür.</div>';
  hookThumbs(el);
}

function renderTopics(items) {
  const el = $('#topics'), by = new Map();
  for (const i of items) {
    const tags = i.tags?.length ? i.tags : [i.type === 'link' ? '@' + domain(i.url) : '(etiketsiz)'];
    for (const t of tags) { if (!by.has(t)) by.set(t, []); by.get(t).push(i); }
  }
  const sorted = [...by].sort((a, b) => (a[0][0] === '@' || a[0][0] === '(') - (b[0][0] === '@' || b[0][0] === '(') || b[1].length - a[1].length);
  el.innerHTML = sorted.slice(0, 80).map(([t, arr]) => `<section class="topic">
    <button class="topic-head" data-tag="${esc(t)}"><b>${t[0] === '@' || t[0] === '(' ? esc(t) : '#' + esc(t)}</b><span class="muted">${arr.length} ›</span></button>
    <div class="group">${arr.slice(0, 4).map(i => itemRow(i)).join('')}</div></section>`).join('')
    || '<div class="empty">AI düzenledikçe konular burada toplanır.</div>';
  hookThumbs(el);
}

function renderFilters() {
  const f = S.filter, counts = new Map();
  for (const i of S.items) if (!i.deleted) for (const t of i.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 14).map(x => x[0]);
  if (f.tag && !top.includes(f.tag)) top.unshift(f.tag);
  const c = (on, attr, label) => `<button class="chip${on ? ' on' : ''}" ${attr}>${label}</button>`;
  $('#filters').innerHTML =
    c(f.type === 'all' && !f.star && !f.tag, 'data-type="all"', 'Tümü') +
    c(f.type === 'link', 'data-type="link"', '🔗 Link') + c(f.type === 'note', 'data-type="note"', '📝 Not') +
    c(f.type === 'file', 'data-type="file"', '📎 Dosya') + c(f.star, 'data-star', '⭐') +
    top.map(t => c(f.tag === t, `data-tag="${esc(t)}"`, '#' + esc(t))).join('') +
    (S.bridgeOk ? ['Bu hafta ne attım?', 'Yapmam gereken şeyler neler?', 'Unuttuğum önemli linkler?']
      .map(q => `<button class="chip ask" data-ask="${esc(q)}">✨ ${esc(q)}</button>`).join('') : '');
}

let renderQueued = false;
function render() {
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const items = visible();
    renderFilters();
    for (const v of ['list', 'board', 'gallery', 'topics']) $('#' + v).hidden = S.view !== v;
    document.body.classList.toggle('board-view', S.view === 'board');
    $('#empty').hidden = alive().length > 0;
    if (S.view === 'list') renderList(items);
    else if (S.view === 'board') Board.render(items);
    else if (S.view === 'gallery') renderGallery(items);
    else renderTopics(items);
    $('#splash').classList.add('gone');
  });
}

// ---------- data changes ----------
async function upsert(list, { sync = true } = {}) {
  const t = now();
  for (const i of list) { i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1); indexItem(i); }
  const map = new Map(S.items.map(i => [i.id, i]));
  list.forEach(i => map.set(i.id, i));
  S.items = [...map.values()];
  await DB.putMany('items', list.map(({ ...i }) => i));
  await Sync.markDirty(list.map(i => monthOf(i.ts)));
  runSearch(); render();
  if (sync) Sync.schedule();
}
async function addFromInput(input) {
  const made = itemsFromInput(input);
  if (!made.length) return [];
  for (const m of made) if (m.type === 'link') {
    const dup = S.items.find(i => !i.deleted && i.url === m.url);
    if (dup) toast(`Bu link zaten var: ${fmtDay(dayKey(dup.ts))}`, 3500);
  }
  const saved = await saveItems(made);
  await upsert(saved);
  AI.kick();
  return saved;
}
async function removeItem(i) {
  await DB.del('files', i.id);
  const t = { id: i.id, deleted: true, ts: i.ts, updatedAt: now() };
  await upsert([t]);
}

// ---------- composer ----------
function renderAttach() {
  $('#attachList').innerHTML = S.attach.map((f, k) => `<span class="chip">📎 ${esc(f.name)} <button class="x" data-k="${k}">✕</button></span>`).join('');
}
async function save() {
  const text = $('#input').value.trim();
  if (!text && !S.attach.length) return;
  await addFromInput({ text, files: S.attach });
  $('#input').value = ''; S.attach = []; renderAttach(); autoGrow();
  toast('Kaydedildi ✓', 1500);
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, innerHeight * .4) + 'px'; }

// ---------- detail sheet ----------
function openItem(id) {
  const i = S.items.find(x => x.id === id); if (!i) return;
  const dlg = $('#sheet');
  const related = S.items.filter(x => !x.deleted && x.id !== i.id &&
    (x.group === i.group || (i.related || []).includes(x.id) || (x.related || []).includes(i.id) || (i.links || []).includes(x.id) || (x.links || []).includes(i.id)));
  const ico = kindIcon(i);
  dlg.innerHTML = `<div class="sheet-body">
    <div class="row"><span class="kind ${i.type}">${ico}</span><span class="muted small">${fmtDay(dayKey(i.ts))} · ${fmtTime(i.ts)}${i.source === 'whatsapp' ? ' · WhatsApp' : ''}</span>
      <span style="margin-left:auto"></span><button class="icon-btn" data-act="star">${i.starred ? '⭐' : '☆'}</button><button class="icon-btn" data-act="close">✕</button></div>
    <input class="title-edit" value="${esc(titleOf(i))}" aria-label="Başlık">
    ${i.summary ? `<div class="muted">✨ ${esc(i.summary)}</div>` : ''}
    ${i.type === 'link' ? `<a class="primary btn-link" href="${esc(i.url)}" target="_blank" rel="noopener">Aç: ${esc(domain(i.url))} ↗</a>
      ${i.meta?.image ? `<img src="${esc(i.meta.image)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ''}
      ${i.meta?.description ? `<div class="muted small">${esc(i.meta.description)}</div>` : ''}<div class="muted small break">${esc(i.url)}</div>` : ''}
    ${i.type === 'file' ? `<div id="filePrev" class="muted small">Dosya yükleniyor…</div>` : ''}
    <textarea class="text-edit" rows="4" placeholder="Not ekle…">${esc(i.text || '')}</textarea>
    <div class="tags-edit">${(i.tags || []).map(t => `<span class="chip">#${esc(t)} <button class="x" data-untag="${esc(t)}">✕</button></span>`).join('')}
      <input class="tag-in" placeholder="+ etiket"></div>
    ${related.length ? `<div class="muted small">Bağlantılı</div><div class="group">${related.slice(0, 12).map(r => itemRow(r)).join('')}</div>` : ''}
    <div class="row"><button class="ghost danger" data-act="del">Sil</button><span style="flex:1"></span><button class="primary" data-act="close">Tamam</button></div>
  </div>`;
  hookThumbs(dlg);
  const commit = async () => {
    const title = dlg.querySelector('.title-edit').value.trim(), text = dlg.querySelector('.text-edit').value;
    const ch = {};
    if (title && title !== titleOf(i)) ch.title = title;
    if (text !== (i.text || '')) ch.text = text;
    const nt = dlg.querySelector('.tag-in').value.trim().replace(/^#/, '').toLowerCase();
    if (nt) ch.tags = [...new Set([...(i.tags || []), nt])];
    if (Object.keys(ch).length) await upsert([{ ...i, ...ch }]);
  };
  dlg.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act, row = e.target.closest('.item');
    if (e.target === dlg || act === 'close') { await commit(); dlg.close(); }
    else if (act === 'star') { await commit(); const cur = S.items.find(x => x.id === i.id); await upsert([{ ...cur, starred: !cur.starred }]); openItem(i.id); }
    else if (act === 'del') { await removeItem(i); dlg.close(); toast('Silindi'); }
    else if (e.target.dataset.untag) { await upsert([{ ...i, tags: i.tags.filter(t => t !== e.target.dataset.untag) }]); openItem(i.id); }
    else if (row) { await commit(); openItem(row.dataset.id); }
  };
  dlg.querySelector('.tag-in').onkeydown = async e => { if (e.key === 'Enter') { e.preventDefault(); await commit(); openItem(i.id); } };
  dlg.oncancel = () => { commit(); };
  if (!dlg.open) dlg.showModal();
  if (i.type === 'file') blobFor(i).then(u => {
    const p = $('#filePrev'); if (!p) return;
    if (!u) { p.textContent = `${i.fileName} — dosya bu cihazda yok${i.fileSynced ? '' : ' (senkron edilmemiş)'}.`; return; }
    const ic = kindIcon(i), dl = `<a class="ghost btn-link" href="${u}" download="${esc(i.fileName)}">İndir · ${esc(i.fileName)} ${fmtSize(i.size)}</a>`;
    p.outerHTML = (ic === '🖼️' ? `<img src="${u}" alt="">` : ic === '🎬' ? `<video src="${u}" controls playsinline></video>` :
      ic === '🎵' ? `<audio src="${u}" controls></audio>` : ic === '📄' ? `<iframe src="${u}"></iframe>` : '') + dl;
  });
}

// ---------- board ----------
const Board = {
  COLW: 250, GAP: 70,
  render(items) {
    const plane = $('#plane'), board = $('#board');
    plane.querySelectorAll('.bcard,.col-head').forEach(e => e.remove());
    const list = items.slice(0, 500).sort((a, b) => a.ts - b.ts);
    const days = []; let last = '';
    for (const i of list) { const k = dayKey(i.ts); if (k !== last) { days.push({ k, items: [] }); last = k; } days.at(-1).items.push(i); }
    const frag = document.createDocumentFragment(); const cols = [];
    days.forEach((d, ci) => {
      const x = ci * (this.COLW + this.GAP);
      const h = document.createElement('div'); h.className = 'col-head'; h.textContent = fmtDay(d.k);
      h.style.left = x + 'px'; h.style.top = '0px'; frag.appendChild(h);
      const els = d.items.map(i => {
        const c = document.createElement('div');
        c.className = 'bcard' + (S.hits?.has(i.id) ? ' hit' : '') + (S.linkFrom === i.id ? ' sel' : '');
        c.dataset.id = i.id; c.dataset.colx = x;
        c.innerHTML = `${thumbHtml(i)}<div class="row" style="gap:6px;flex-wrap:nowrap"><span>${kindIcon(i)}</span><div class="title">${i.starred ? '⭐ ' : ''}${hl(titleOf(i))}</div></div>
          ${subOf(i) ? `<div class="sub">${hl(subOf(i).slice(0, 160))}</div>` : ''}
          <div class="meta"><span class="time">${fmtTime(i.ts)}</span>${(i.tags || []).slice(0, 3).map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>`;
        c.style.left = (x + (i.pos?.x || 0)) + 'px';
        frag.appendChild(c); return { c, i };
      });
      cols.push(els);
    });
    plane.appendChild(frag); hookThumbs(plane);
    for (const els of cols) { let y = 34; for (const { c, i } of els) { if (i.pos) c.style.top = i.pos.y + 'px'; else { c.style.top = y + 'px'; y += c.offsetHeight + 16; } } }
    this.wires();
    if (!S.cam) { // start at newest (right side)
      const w = days.length * (this.COLW + this.GAP);
      S.cam = { k: 1, x: Math.min(20, board.clientWidth - w), y: 16 };
    }
    this.apply();
  },
  center(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; },
  wires() {
    const svg = $('#wires'), cards = new Map([...document.querySelectorAll('.bcard')].map(c => [c.dataset.id, c]));
    const byId = new Map(S.items.map(i => [i.id, i])); let d = { g: '', rel: '', man: '' };
    const path = (a, b) => {
      const A = this.center(a), B = this.center(b);
      if (Math.abs(A.x - B.x) < 30) { const [p, q] = A.y < B.y ? [A, B] : [B, A]; const x = p.x + p.w / 2, y1 = p.y + p.h, y2 = q.y; return `M${x},${y1} C${x},${y1 + 20} ${q.x + q.w / 2},${y2 - 20} ${q.x + q.w / 2},${y2}`; }
      const [p, q] = A.x < B.x ? [A, B] : [B, A]; const x1 = p.x + p.w, y1 = p.y + p.h / 2, x2 = q.x, y2 = q.y + q.h / 2, m = (x2 - x1) / 2;
      return `M${x1},${y1} C${x1 + m},${y1} ${x2 - m},${y2} ${x2},${y2}`;
    };
    const seen = new Set(); let prev = null;
    for (const [id, c] of cards) {
      const i = byId.get(id); if (!i) continue;
      if (prev && prev.i.group === i.group) d.g += path(prev.c, c);
      prev = { i, c };
      for (const r of i.related || []) { const k = [id, r].sort().join(); if (cards.has(r) && !seen.has(k)) { seen.add(k); d.rel += path(c, cards.get(r)); } }
      for (const r of i.links || []) if (cards.has(r)) d.man += path(c, cards.get(r));
    }
    svg.innerHTML = `<path d="${d.g}"/><path class="rel" d="${d.rel}"/><path class="man" d="${d.man}"/>`;
  },
  apply() { const c = S.cam; $('#plane').style.transform = `translate(${c.x}px,${c.y}px) scale(${c.k})`; },
  zoomAt(px, py, f) {
    const c = S.cam, k = Math.min(2.5, Math.max(.15, c.k * f));
    c.x = px - (px - c.x) * (k / c.k); c.y = py - (py - c.y) * (k / c.k); c.k = k; this.apply();
  },
  fit() {
    const cards = [...document.querySelectorAll('.bcard')]; if (!cards.length) return;
    const b = $('#board'); let x2 = 0, y2 = 0;
    cards.forEach(c => { x2 = Math.max(x2, c.offsetLeft + c.offsetWidth); y2 = Math.max(y2, c.offsetTop + c.offsetHeight); });
    const k = Math.min(1, (b.clientWidth - 40) / x2, (b.clientHeight - 40) / y2);
    S.cam = { k, x: 20, y: 20 }; this.apply();
  },
  init() {
    const b = $('#board'), pts = new Map(); let drag = null, pinch = null;
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.board-tools')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      b.setPointerCapture(e.pointerId);
      const card = e.target.closest('.bcard');
      if (pts.size === 2) { drag = null; const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) }; return; }
      drag = { card, sx: e.clientX, sy: e.clientY, moved: false, ox: card?.offsetLeft, oy: card?.offsetTop, cx: S.cam.x, cy: S.cam.y };
    });
    b.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) {
        const [p, q] = [...pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y), r = b.getBoundingClientRect();
        this.zoomAt((p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top, d / pinch.d); pinch.d = d; return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      if (drag.card) {
        drag.card.style.left = drag.ox + dx / S.cam.k + 'px'; drag.card.style.top = drag.oy + dy / S.cam.k + 'px';
        if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = 0; this.wires(); });
      } else { b.classList.add('panning'); S.cam.x = drag.cx + dx; S.cam.y = drag.cy + dy; this.apply(); }
    });
    const up = async e => {
      pts.delete(e.pointerId); b.classList.remove('panning');
      if (pts.size < 2) pinch = null;
      const d = drag; drag = null; if (!d) return;
      if (d.card && d.moved) {
        const i = S.items.find(x => x.id === d.card.dataset.id);
        if (i) await upsert([{ ...i, pos: { x: d.card.offsetLeft - +d.card.dataset.colx, y: d.card.offsetTop } }]);
      } else if (d.card && !d.moved) {
        const id = d.card.dataset.id;
        if (S.linkMode) {
          if (!S.linkFrom) { S.linkFrom = id; d.card.classList.add('sel'); toast('Şimdi bağlanacak kartı seç'); }
          else if (S.linkFrom !== id) {
            const a = S.items.find(x => x.id === S.linkFrom);
            const links = (a.links || []).includes(id) ? a.links.filter(x => x !== id) : [...(a.links || []), id];
            S.linkFrom = null; await upsert([{ ...a, links }]);
          }
        } else openItem(id);
      }
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('wheel', e => {
      e.preventDefault(); const r = b.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .01));
      else { S.cam.x -= e.deltaX || (e.shiftKey ? e.deltaY : 0); S.cam.y -= e.shiftKey ? 0 : e.deltaY; this.apply(); }
    }, { passive: false });
    $('#fitBtn').onclick = () => this.fit();
    $('#linkMode').onclick = e => { S.linkMode = !S.linkMode; S.linkFrom = null; e.currentTarget.classList.toggle('on', S.linkMode);
      document.querySelectorAll('.bcard.sel').forEach(c => c.classList.remove('sel')); if (S.linkMode) toast('İki kartı sırayla seç (tekrar seçersen ok silinir)'); };
  },
};

// ---------- Claude bridge ----------
const AI = {
  async call(path, body, ms = 200000) {
    const { bridgeUrl, bridgeToken } = S.settings;
    if (!bridgeUrl) throw new Error('Köprü adresi yok');
    const r = await fetch(bridgeUrl.replace(/\/$/, '') + path, {
      method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(ms),
      headers: { authorization: 'Bearer ' + (bridgeToken || ''), 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
    return j;
  },
  async health() {
    try { await this.call('/health', null, 4000); this.setOk(true); } catch { this.setOk(false); }
    return S.bridgeOk;
  },
  setOk(ok) { const ch = ok !== S.bridgeOk; S.bridgeOk = ok; this.dot(); if (ch) render(); if (ok) { this.kick(); this.pullInbox(); } },
  async pullInbox() { // things sent from the PC with `hn` / file manager / hotkey
    if (this._inb) return; this._inb = true;
    try {
      const list = await this.call('/inbox', null, 8000);
      if (list.length) {
        const base = S.settings.bridgeUrl.replace(/\/$/, ''), auth = { authorization: 'Bearer ' + S.settings.bridgeToken };
        for (const e of list) {
          const files = [];
          for (const f of e.files || []) { const r = await fetch(`${base}/inbox/file/${f.fid}`, { headers: auth }); if (r.ok) files.push(new File([await r.blob()], f.name, { type: f.mime })); }
          const made = itemsFromInput({ text: e.text || '', files, ts: e.ts, source: 'pc' });
          made.forEach((m, k) => { m.id = `in${e.id}${k}`; m.group = 'in' + e.id; });
          await upsert(await saveItems(made));
        }
        await this.call('/inbox/ack', { ids: list.map(e => e.id) }, 8000);
        toast(`Bilgisayardan ${list.length} kayıt geldi ✓`); this.kick();
      }
    } catch (err) { console.warn('inbox', err); }
    this._inb = false;
  },
  dot() { const d = $('#aiStatus'); d.classList.toggle('ok', S.bridgeOk && !S.aiBusy); d.classList.toggle('busy', S.aiBusy);
    const n = S.items.filter(i => i.pending && !i.deleted).length;
    d.title = S.bridgeOk ? `Claude bağlı${n ? ` · ${n} kayıt sırada` : ''}` : 'Claude köprüsü kapalı (Menü → Claude köprüsü)'; },
  kick() { clearTimeout(this._t); this._t = setTimeout(() => this.process(), 800); },
  async process() {
    if (S.aiBusy || !S.bridgeOk) return;
    const pend = S.items.filter(i => i.pending && !i.deleted).sort((a, b) => b.ts - a.ts);
    if (!pend.length) return;
    S.aiBusy = true; this.dot();
    try {
      const needMeta = pend.filter(i => i.type === 'link' && !i.meta).slice(0, 25);
      if (needMeta.length) {
        const m = await this.call('/meta', { urls: needMeta.map(i => i.url) }, 30000);
        await upsert(needMeta.map(i => ({ ...i, meta: m[i.url] || { title: '' } })), { sync: false });
      }
      const batch = S.items.filter(i => i.pending && !i.deleted).sort((a, b) => b.ts - a.ts).slice(0, 25);
      const counts = new Map(); S.items.forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
      const tags = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 80).map(x => x[0]);
      const r = await this.call('/organize', { items: batch, tags });
      const ids = new Set(S.items.map(i => i.id)), got = new Map((r.items || []).map(x => [x.id, x]));
      await upsert(batch.map(i => {
        const x = got.get(i.id); if (!x) return { ...i, pending: false };
        return { ...i, pending: false, title: i.title || x.title, summary: x.summary,
          tags: [...new Set([...(i.tags || []), ...(x.tags || []).map(t => t.toLowerCase().replace(/^#/, ''))])].slice(0, 6),
          related: [...new Set([...(i.related || []), ...(x.related || []).filter(id => ids.has(id) && id !== i.id)])] };
      }));
      S.aiBusy = false; this.dot();
      if (S.items.some(i => i.pending && !i.deleted)) this.kick();
    } catch (e) { console.warn('AI', e); S.aiBusy = false; this.dot(); this.health(); }
  },
  async ask(q) {
    q = q.replace(/^\?\s*/, '').trim(); if (!q) return;
    const box = $('#answer'); box.hidden = false;
    if (!S.bridgeOk && !(await this.health())) { box.innerHTML = '<b>Claude köprüsü kapalı.</b> Bilgisayarda <code>node bridge/server.mjs</code> çalıştır, Menü → Claude köprüsü.'; return; }
    box.innerHTML = '<span class="muted">✨ Claude düşünüyor…</span>';
    const toks = tokens(q), live = alive();
    const scored = live.map(i => [i, scoreItem(i, toks, true)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 50).map(x => x[0]);
    const pick = [...new Map([...scored, ...live.sort((a, b) => b.ts - a.ts).slice(0, 30)].map(i => [i.id, i])).values()];
    try {
      const r = await this.call('/ask', { question: q, items: pick });
      const byId = new Map(S.items.map(i => [i.id, i]));
      box.innerHTML = `<div class="txt">${esc(r.answer).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>
        <div class="src">${(r.sources || []).filter(id => byId.has(id)).slice(0, 12).map(id => `<button class="chip" data-open="${id}">${kindIcon(byId.get(id))} ${esc(titleOf(byId.get(id)).slice(0, 50))}</button>`).join('')}
        <button class="chip" data-close>✕ kapat</button></div>`;
    } catch (e) { box.innerHTML = `<span class="danger">Hata: ${esc(e.message)}</span>`; }
  },
};

// ---------- GitHub private repo sync ----------
// Layout in the private repo: items/YYYY-MM.json (one small file per month, so each commit stays tiny)
// and files/YYYY-MM/<id> (images shrunk before upload). Files roll over to repo-2, repo-3… when one gets big.
const b64enc = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = s => Uint8Array.from(atob(s.replace(/\n/g, '')), c => c.charCodeAt(0));
const monthOf = ts => dayKey(ts).slice(0, 7);
const REPO_LIMIT_KB = 3.5e6; // GitHub is happiest under ~5 GB per repo; roll over at 3.5 GB
async function shrinkImage(blob, mime) {
  if (!/^image\/(jpeg|png|webp|heic|heif)/.test(mime || blob.type) || blob.size < 700e3) return blob;
  try {
    const bmp = await createImageBitmap(blob), k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const out = await c.convertToBlob({ type: 'image/webp', quality: .82 });
    return out.size < blob.size ? out : blob;
  } catch { return blob; }
}
const Sync = {
  repos() { return (S.settings.ghRepo || '').split(/[\s,]+/).filter(Boolean); },
  ready() { return !!(this.repos().length && S.settings.ghToken); },
  async gh(path, opt = {}, accept = 'application/vnd.github+json', repo = this.repos()[0]) {
    return fetch(`https://api.github.com/repos/${repo}${path}`, {
      cache: 'no-store', ...opt,
      headers: { authorization: 'Bearer ' + S.settings.ghToken, accept, 'x-github-api-version': '2022-11-28', ...(opt.headers || {}) },
    });
  },
  status(msg) { S.syncMsg = msg; const el = $('#syncMsg'); if (el) el.textContent = msg; },
  schedule() { if (!this.ready()) return; clearTimeout(this._t); this._t = setTimeout(() => this.run(), 2500); },
  async put(path, bytes, sha, message, repo) {
    const r = await this.gh('/contents/' + path, { method: 'PUT', body: JSON.stringify({ message, content: b64enc(bytes), ...(sha ? { sha } : {}) }) }, undefined, repo);
    if (!r.ok) { const e = new Error('GitHub ' + r.status + (r.status === 401 ? ' (token geçersiz)' : r.status === 404 || r.status === 403 ? ' (token bu repoya erişemiyor)' : '')); e.status = r.status; throw e; }
    return (await r.json()).content.sha;
  },
  async getJson(path) {
    const r = await this.gh('/contents/' + path);
    if (r.status === 404) return { sha: null, data: [] };
    if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
    const j = await r.json();
    const raw = j.content ? new TextDecoder().decode(b64dec(j.content)) : await (await this.gh('/contents/' + path, {}, 'application/vnd.github.raw')).text();
    return { sha: j.sha, data: JSON.parse(raw || '[]') };
  },
  async downloadFile(i) {
    const r = await this.gh('/contents/' + (i.filePath || 'files/' + i.id), {}, 'application/vnd.github.raw', i.fileRepo || this.repos()[0]);
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return r.blob();
  },
  async markDirty(months) {
    const d = new Set((await DB.get('kv', 'dirty')) || []); months.forEach(m => d.add(m)); await DB.put('kv', [...d], 'dirty');
  },
  merge(remote) {
    const local = new Map(S.items.map(i => [i.id, i])), changed = [];
    for (const x of remote) { const l = local.get(x.id); if (!l || (x.updatedAt || 0) > (l.updatedAt || 0)) { changed.push(x); local.set(x.id, x); } }
    if (changed.length) { changed.forEach(x => { indexItem(x); if (x.deleted) DB.del('files', x.id); }); S.items = [...local.values()]; }
    return changed;
  },
  async uploadFiles() {
    const repos = this.repos();
    for (const i of S.items.filter(i => i.type === 'file' && !i.fileSynced && !i.deleted && !i.fileSkip)) {
      const rec = await DB.get('files', i.id); if (!rec) continue;
      const blob = await shrinkImage(rec.blob, i.mime);
      if (blob.size > 45e6) { await upsert([{ ...i, fileSkip: true }], { sync: false }); continue; }
      const path = `files/${monthOf(i.ts)}/${i.id}`, bytes = new Uint8Array(await blob.arrayBuffer());
      let done = null;
      for (let k = repos.length - 1; k >= 0 && !done; k--) { // newest repo first; fall back if the token can't reach it yet
        try { await this.put(path, bytes, null, 'file ' + (i.fileName || i.id), repos[k]); done = repos[k]; }
        catch (e) { if (e.status === 422) done = repos[k]; else if (!(e.status === 403 || e.status === 404) || k === 0) throw e; else this.warnToken(repos[k]); }
      }
      await upsert([{ ...i, fileSynced: true, fileRepo: done, filePath: path }], { sync: false });
    }
  },
  warnToken(repo) { if (this._warned === repo) return; this._warned = repo; toast(`Yeni repo ${repo} hazır: token ayarlarından bu repoya erişim ver`, 8000); },
  async checkSize() {
    const last = (await DB.get('kv', 'sizeCheck')) || 0; if (now() - last < 6 * 3600e3) return;
    await DB.put('kv', now(), 'sizeCheck');
    const repos = this.repos(), active = repos.at(-1);
    const r = await this.gh('', {}, undefined, active); if (!r.ok) return;
    const kb = (await r.json()).size; S.repoKB = kb;
    if (kb > REPO_LIMIT_KB && S.bridgeOk) {
      const base = repos[0].replace(/-\d+$/, ''), next = `${base}-${repos.length + 1}`;
      try { await AI.call('/new-repo', { name: next }, 30000); S.settings.ghRepo = [...repos, next].join(', '); await DB.put('kv', S.settings, 'settings'); this.warnToken(next); } catch (e) { console.warn(e); }
    }
  },
  async run(retry = true) {
    if (!this.ready() || this.busy) { if (this.busy) this.again = true; return; }
    if (!navigator.onLine) return;
    this.busy = true; this.status('Senkronlanıyor…');
    try {
      await this.uploadFiles();
      // pull months that changed remotely
      const shas = (await DB.get('kv', 'shas')) || {};
      const r = await this.gh('/contents/items');
      const list = r.ok ? (await r.json()).filter(f => /^\d{4}-\d{2}\.json$/.test(f.name)) : [];
      if (!r.ok && r.status !== 404) { const e = new Error('GitHub ' + r.status + (r.status === 401 ? ' (token geçersiz)' : '')); throw e; }
      const remoteSha = Object.fromEntries(list.map(f => [f.name.slice(0, 7), f.sha]));
      const changed = [];
      for (const [m, sha] of Object.entries(remoteSha)) if (shas[m] !== sha) {
        const { data } = await this.getJson(`items/${m}.json`); changed.push(...this.merge(data)); shas[m] = sha;
      }
      if (changed.length) { await DB.putMany('items', changed); runSearch(); render(); AI.dot(); }
      // push dirty months (first sync: every month)
      let dirty = new Set((await DB.get('kv', 'dirty')) || []);
      if (!Object.keys(shas).length) S.items.forEach(i => dirty.add(monthOf(i.ts)));
      for (const m of dirty) {
        const body = () => new TextEncoder().encode(JSON.stringify(S.items.filter(i => monthOf(i.ts) === m)));
        try { shas[m] = await this.put(`items/${m}.json`, body(), remoteSha[m], `sync ${m}`); }
        catch (e) {
          if (e.status !== 409 && e.status !== 422) throw e;
          const { sha, data } = await this.getJson(`items/${m}.json`); const ch = this.merge(data); if (ch.length) await DB.putMany('items', ch);
          shas[m] = await this.put(`items/${m}.json`, body(), sha, `sync ${m}`);
        }
        dirty.delete(m); await DB.put('kv', shas, 'shas'); await DB.put('kv', [...dirty], 'dirty');
      }
      await DB.put('kv', shas, 'shas');
      this.status(`✓ ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · ${alive().length} kayıt${S.repoKB ? ` · repo ${Math.round(S.repoKB / 1024)} MB` : ''}`);
      this.checkSize().catch(() => { });
    } catch (e) { console.warn('sync', e); this.status('Hata: ' + e.message); }
    this.busy = false;
    if (this.again) { this.again = false; this.schedule(); }
  },
};

// ---------- WhatsApp import ----------
const WA_LINE = [
  /^‎?\[(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]\s*([^:]+?):\s?([\s\S]*)$/,
  /^‎?(\d{1,4})[./-](\d{1,2})[./-](\d{1,4}),?\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\s+-\s+([^:]+?):\s?([\s\S]*)$/,
];
const WA_SKIP = /^(<Medya dahil edilmedi>|<Media omitted>|Bu mesaj silindi|Bu mesajı sildiniz|This message was deleted|You deleted this message|null|<Bu mesaj düzenlendi>|‎?image omitted|‎?video omitted)$/i;
const WA_ATTACH = [/^‎?<(?:attached|ekli):\s*([^>]+)>/i, /^‎?(.+?\.\w{2,5})\s+\((?:dosya ekli|file attached)\)/i];
function parseWhatsApp(txt) {
  const lines = txt.replace(/\r/g, '').split('\n'), msgs = [];
  for (const raw of lines) {
    const line = raw.replace(/[‎ ]/g, m => m === ' ' ? ' ' : '');
    let m = null; for (const re of WA_LINE) { m = line.match(re); if (m) break; }
    if (m) msgs.push({ a: +m[1], b: +m[2], y: +m[3], h: +m[4], mi: +m[5], s: +(m[6] || 0), ap: m[7], who: m[8], text: m[9] });
    else if (msgs.length) msgs.at(-1).text += '\n' + line;
  }
  // date order: day-first unless a value proves month-first; year may come first (2026-11-20)
  const mdy = !msgs.some(x => x.a > 12) && msgs.some(x => x.b > 12);
  return msgs.map(x => {
    let d, mo, y;
    if (x.a > 31) [y, mo, d] = [x.a, x.b, x.y]; else if (mdy) [mo, d, y] = [x.a, x.b, x.y]; else [d, mo, y] = [x.a, x.b, x.y];
    if (y < 100) y += 2000;
    let h = x.h; if (x.ap) { const pm = /p/i.test(x.ap); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    return { ts: new Date(y, mo - 1, d, h, x.mi, x.s).getTime(), who: x.who.trim(), text: x.text.trim() };
  }).filter(x => !isNaN(x.ts));
}
async function importWhatsApp(file) {
  toast('Okunuyor…', 60000);
  let txt, zip = null;
  if (/\.zip$/i.test(file.name) || file.type.includes('zip')) {
    zip = await JSZip.loadAsync(file);
    const txts = Object.values(zip.files).filter(f => !f.dir && /\.txt$/i.test(f.name));
    const main = txts.find(f => /chat|sohbet/i.test(f.name)) || txts[0];
    if (!main) return toast('Zip içinde sohbet .txt dosyası yok');
    txt = await main.async('string');
  } else txt = await file.text();
  const msgs = parseWhatsApp(txt);
  if (!msgs.length) return toast('Bu dosyada WhatsApp mesajı bulunamadı');
  const zfiles = zip ? new Map(Object.values(zip.files).filter(f => !f.dir).map(f => [f.name.split('/').pop(), f])) : new Map();
  const keyOf = i => `${i.ts}|${i.url || i.fileName || (i.text || '').slice(0, 80)}`;
  const have = new Set(S.items.filter(i => !i.deleted).map(keyOf));
  const out = []; let group = null, lastTs = 0, lastWho = '';
  for (const m of msgs) {
    if (WA_SKIP.test(m.text) || !m.text) continue;
    if (!group || m.ts - lastTs > 3 * 60e3 || m.who !== lastWho) group = newId();
    lastTs = m.ts; lastWho = m.who;
    let att = null, text = m.text;
    for (const re of WA_ATTACH) { const a = text.match(re); if (a) { att = a[1].trim(); text = text.slice(a[0].length).trim(); break; } }
    const made = [];
    if (att) {
      const zf = zfiles.get(att); let blob = null;
      if (zf) blob = await zf.async('blob');
      made.push({ id: newId(), type: 'file', fileName: att, mime: blob?.type || mimeOf(att), size: blob?.size || 0, text, _blob: blob });
    } else made.push(...itemsFromInput({ text }).map(({ ts, group, source, ...r }) => r));
    for (const it of made) {
      Object.assign(it, { ts: m.ts, group, source: 'whatsapp', tags: it.tags || [] });
      const k = keyOf(it); if (have.has(k)) continue; have.add(k);
      if (!it._blob) delete it._blob;
      out.push(it);
    }
  }
  if (!out.length) return toast('Hepsi zaten içeride ✓');
  for (let k = 0; k < out.length; k += 200) {
    const saved = await saveItems(out.slice(k, k + 200));
    await upsert(saved, { sync: false });
    toast(`İçeri alınıyor… ${Math.min(k + 200, out.length)}/${out.length}`, 60000);
  }
  toast(`${out.length} kayıt içeri alındı ✓${S.bridgeOk ? ' — Claude düzenliyor' : ''}`, 4000);
  Sync.schedule(); AI.kick();
}
function mimeOf(n) {
  const e = n.split('.').pop().toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', '3gp': 'video/3gpp',
    opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', pdf: 'application/pdf', txt: 'text/plain' })[e] || '';
}

// ---------- backup ----------
async function exportBackup() {
  toast('Yedek hazırlanıyor…', 60000);
  const zip = new JSZip(); zip.file('items.json', JSON.stringify(S.items));
  for (const f of await DB.all('files')) zip.file('files/' + f.id, f.blob);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hizli-not-${dayKey(now())}.zip`; a.click();
  toast('Yedek indirildi ✓');
}
async function importBackup(file) {
  const zip = await JSZip.loadAsync(file);
  const items = JSON.parse(await zip.file('items.json').async('string'));
  const local = new Map(S.items.map(i => [i.id, i]));
  const take = items.filter(x => !local.has(x.id) || (x.updatedAt || 0) > (local.get(x.id).updatedAt || 0));
  for (const x of take) { const f = zip.file('files/' + x.id); if (f) await DB.put('files', { id: x.id, blob: await f.async('blob') }); }
  await upsert(take); toast(`${take.length} kayıt geri yüklendi ✓`);
}

// ---------- settings ----------
async function loadSettings() {
  S.settings = (await DB.get('kv', 'settings')) || {};
  if (!S.settings.bridgeUrl && !/Android|iPhone|iPad/.test(navigator.userAgent)) S.settings.bridgeUrl = 'http://localhost:8787';
}
async function saveSettings() {
  for (const k of ['bridgeUrl', 'bridgeToken', 'ghRepo', 'ghToken']) S.settings[k] = $('#' + k).value.trim();
  await DB.put('kv', S.settings, 'settings');
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hn-theme', t); } catch { }
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = bg);
}

// ---------- wiring ----------
function wire() {
  $('#saveBtn').onclick = save;
  const inp = $('#input');
  inp.addEventListener('input', autoGrow);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!e.shiftKey && !/Android|iPhone/.test(navigator.userAgent) && !inp.value.includes('\n')))) { e.preventDefault(); save(); } });
  inp.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); S.attach.push(...fs); renderAttach(); } });
  $('#fileInput').onchange = e => { S.attach.push(...e.target.files); e.target.value = ''; renderAttach(); };
  $('#attachList').onclick = e => { if (e.target.dataset.k) { S.attach.splice(+e.target.dataset.k, 1); renderAttach(); } };
  const comp = $('#composer');
  addEventListener('dragover', e => { e.preventDefault(); comp.classList.add('drag'); });
  addEventListener('dragleave', e => { if (!e.relatedTarget) comp.classList.remove('drag'); });
  addEventListener('drop', e => {
    e.preventDefault(); comp.classList.remove('drag');
    const fs = [...e.dataTransfer.files];
    if (fs.length === 1 && /\.zip$/i.test(fs[0].name) && confirmWa(fs[0])) return;
    if (fs.length) { S.attach.push(...fs); renderAttach(); }
    else { const t = e.dataTransfer.getData('text'); if (t) { inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); } }
  });

  let st;
  $('#search').addEventListener('input', e => {
    S.q = e.target.value; clearTimeout(st);
    st = setTimeout(() => { S.limit = 300; runSearch(); render(); if (!S.q) $('#answer').hidden = true; }, 60);
  });
  $('#search').addEventListener('keydown', e => { if (e.key === 'Enter' && (S.q.startsWith('?') || e.ctrlKey)) AI.ask(S.q); if (e.key === 'Escape') { e.target.value = ''; S.q = ''; runSearch(); render(); $('#answer').hidden = true; } });
  $('#askBtn').onclick = () => { const q = $('#search').value.trim(); if (q) AI.ask(q); else { $('#search').value = '? '; $('#search').focus(); } };
  $('#answer').onclick = e => { if (e.target.dataset.open) openItem(e.target.dataset.open); if (e.target.closest('[data-close]')) $('#answer').hidden = true; };

  $('#filters').onclick = e => {
    const b = e.target.closest('button'); if (!b) return; const f = S.filter;
    if (b.dataset.ask) { $('#search').value = '? ' + b.dataset.ask; AI.ask(b.dataset.ask); return; }
    if (b.dataset.type) { f.type = b.dataset.type; if (b.dataset.type === 'all') { f.tag = null; f.star = false; } }
    else if ('star' in b.dataset) f.star = !f.star;
    else if (b.dataset.tag) f.tag = f.tag === b.dataset.tag ? null : b.dataset.tag;
    S.limit = 300; render();
  };
  document.querySelector('.seg').onclick = e => {
    const v = e.target.dataset.view; if (!v) return;
    S.view = v; document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    try { localStorage.setItem('hn-view', v); } catch { }
    render();
  };
  for (const id of ['list', 'gallery', 'topics']) $('#' + id).addEventListener('click', e => {
    const th = e.target.closest('.topic-head');
    if (th) { const t = th.dataset.tag; if (t[0] !== '@' && t[0] !== '(') S.filter.tag = t; else { $('#search').value = S.q = t.replace(/^@|\(etiketsiz\)/g, ''); runSearch(); } S.view = 'list';
      document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === 'list')); render(); scrollTo(0, 0); return; }
    const it = e.target.closest('[data-id]'); if (it) openItem(it.dataset.id);
  });

  // menu
  const menu = $('#menu');
  const openMenu = () => {
    for (const k of ['bridgeUrl', 'bridgeToken', 'ghRepo', 'ghToken']) $('#' + k).value = S.settings[k] || '';
    Sync.status(S.syncMsg || (Sync.ready() ? '' : 'Kapalı')); menu.showModal();
  };
  $('#menuBtn').onclick = openMenu; $('#aiStatus').onclick = openMenu;
  menu.addEventListener('close', async () => { await saveSettings(); AI.health(); Sync.schedule(); });
  menu.addEventListener('click', e => { if (e.target === menu) menu.close(); });
  $('#bridgeTest').onclick = async () => { await saveSettings(); $('#bridgeMsg').textContent = '…'; $('#bridgeMsg').textContent = (await AI.health()) ? '✓ Bağlandı' : '✕ Ulaşılamadı (köprü açık mı, adres/token doğru mu?)'; };
  $('#syncNow').onclick = async () => { await saveSettings(); Sync.run(); };
  $('#importWa').onclick = () => $('#waInput').click();
  $('#emptyImport').onclick = e => { e.preventDefault(); $('#waInput').click(); };
  $('#waInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { menu.close(); importWhatsApp(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#organizeNow').onclick = async () => { menu.close(); if (await AI.health()) { AI.process(); toast('Claude düzenliyor…'); } else toast('Claude köprüsü kapalı'); };
  $('#exportBtn').onclick = () => { menu.close(); exportBackup(); };
  $('#importBackup').onclick = () => $('#backupInput').click();
  $('#backupInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { menu.close(); importBackup(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#themeBtn').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  let deferred;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').onclick = async () => { if (deferred) { deferred.prompt(); deferred = null; $('#installBtn').hidden = true; } };
  addEventListener('appinstalled', () => toast('Yüklendi ✓ Artık Paylaş menüsünde var'));

  document.addEventListener('visibilitychange', () => { if (!document.hidden) { reloadFromDB(); AI.health(); Sync.schedule(); } });
  addEventListener('online', () => Sync.schedule());
  Board.init();
}
function confirmWa(f) { importWhatsApp(f).catch(err => toast('Hata: ' + err.message)); return true; }

async function reloadFromDB() {
  const items = await DB.all('items');
  if (items.length === S.items.length && items.every(i => S.idx.has(i.id))) return;
  S.items = items; S.idx.clear(); items.forEach(indexItem); runSearch(); render(); AI.kick(); Sync.schedule();
}

(async function main() {
  setTheme(document.documentElement.dataset.theme);
  try { const v = localStorage.getItem('hn-view'); if (v) { S.view = v; document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.view === v)); } } catch { }
  await loadSettings();
  S.items = await DB.all('items'); S.items.forEach(indexItem);
  wire(); render();
  const p = new URLSearchParams(location.search);
  if (p.has('shared')) { toast('Kaydedildi ✓'); history.replaceState(null, '', location.pathname); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  AI.health(); setInterval(() => { if (!document.hidden) AI.health(); }, 20000);
  Sync.run(); setInterval(() => Sync.schedule(), 120000);
})();
