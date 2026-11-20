'use strict';
/* Nts — app. Depends on db.js (DB, newId, itemsFromInput, saveItems, URL_RE) and vendor/jszip. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const now = () => Date.now();

const S = {
  items: [], idx: new Map(), view: 'list', q: '', hits: null,
  filter: { type: 'all', tag: null, star: false }, attach: [],
  settings: {}, bridgeOk: false, aiBusy: false, limit: 300,
  cam: null, linkFrom: null, urls: new Map(), explaining: new Set(),
};

// ---------- icons (lucide-style line icons) ----------
const I = {
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6M9 18h4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  board: '<rect x="2" y="3" width="8" height="7" rx="1.5"/><rect x="14" y="14" width="8" height="7" rx="1.5"/><path d="M10 6.5h3a2 2 0 0 1 2 2V14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  down: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  rel: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5 15.5 15.5"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  install: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || I.file}</svg>`;

// ---------- utils ----------
function toast(msg, ms = 2600, icon = '', action = null) {
  const t = $('#toast'); t.innerHTML = (icon ? ic(icon, 'sm') : '') + `<span>${esc(msg)}</span>` + (action ? `<button class="t-act">${esc(action.label)}</button>` : ''); t.hidden = false;
  if (action) t.querySelector('.t-act').onclick = () => { t.hidden = true; action.fn(); };
  t.style.animation = 'none'; t.offsetHeight; t.style.animation = '';
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}
const domain = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtTime = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
function fmtDay(key) {
  const today = dayKey(now()), yest = dayKey(now() - 864e5);
  if (key === today) return 'Bugün'; if (key === yest) return 'Dün';
  const [y, m, d] = key.split('-').map(Number), dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', ...(y !== new Date().getFullYear() ? { year: 'numeric' } : {}), weekday: 'long' });
}
const fmtSize = n => n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n > 1e3 ? Math.round(n / 1e3) + ' KB' : n ? n + ' B' : '';
function fileKind(i) {
  if (i.type !== 'file') return i.type;
  const m = i.mime || '', n = (i.fileName || '').toLowerCase();
  if (m.startsWith('image') || /\.(jpe?g|png|gif|webp|heic|avif|bmp|svg)$/.test(n)) return 'image';
  if (m.startsWith('video') || /\.(mp4|mov|3gp|webm|mkv)$/.test(n)) return 'video';
  if (m.startsWith('audio') || /\.(opus|mp3|m4a|ogg|wav|aac|flac)$/.test(n)) return 'audio';
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('text') || /\.(txt|md|csv|json|log|js|ts|py|html|css|xml|yml|yaml)$/.test(n)) return 'text';
  return 'file';
}
const KIND_LABEL = { link: 'Link', note: 'Not', image: 'Resim', video: 'Video', audio: 'Ses', pdf: 'PDF', text: 'Metin', file: 'Dosya' };
const extOf = i => ((i.fileName || '').split('.').pop() || '').slice(0, 4).toUpperCase();
function titleOf(i) {
  if (i.type === 'note' && i.text && !i.userTitle) return i.text.split('\n')[0].slice(0, 140); // the user's own words come first
  if (i.title) return i.title;
  if (i.type === 'link') { if (i.meta?.title) return i.meta.title; try { const u = new URL(i.url); return domain(i.url) + decodeURI(u.pathname).replace(/\/$/, ''); } catch { return i.url; } }
  if (i.type === 'file') return i.fileName;
  return (i.text || '').split('\n')[0].slice(0, 140);
}
function subOf(i) {
  if (i.type === 'link') return i.text || i.summary || i.meta?.description || '';
  if (i.type === 'file') return i.text || i.summary || '';
  const t = i.text || '';
  if (i.userTitle) return t;
  return t.includes('\n') ? t.slice(t.indexOf('\n') + 1) : '';
}
const alive = () => S.items.filter(i => !i.deleted);
const byId = id => S.items.find(x => x.id === id);
function relatedOf(i) {
  return S.items.filter(x => !x.deleted && x.id !== i.id && ((x.group === i.group) || (i.related || []).includes(x.id) || (x.related || []).includes(i.id)
    || (i.links || []).includes(x.id) || (x.links || []).includes(i.id) || (i.explain?.related || []).includes(x.id)));
}

// ---------- search ----------
function indexItem(i) {
  const h = norm([i.title, i.meta?.title, i.meta?.description, i.meta?.site, i.text, i.url, i.url && domain(i.url),
    i.fileName, i.content, i.summary, (i.tags || []).join(' ')].filter(Boolean).join(' '));
  S.idx.set(i.id, { h, w: [...new Set(h.split(/[^a-z0-9]+/).filter(Boolean))] });
}
function near(a, b) {
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
  if (!q || q.startsWith('?') || q.endsWith('?')) { S.hits = null; return; } // a question goes to Claude, it doesn't filter
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

// ---------- files + previews ----------
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
const Prev = {
  thumbs: new Map(),
  pdfLib() {
    return this._pdf ||= new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'vendor/pdf.min.js';
      s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(pdfjsLib); };
      s.onerror = rej; document.head.appendChild(s);
    });
  },
  async pdfDoc(i) { const u = await blobFor(i); if (!u) return null; const lib = await this.pdfLib(); return lib.getDocument({ url: u, isEvalSupported: false }).promise; },
  async renderPage(doc, n, width) {
    const page = await doc.getPage(n), vp = page.getViewport({ scale: 1 }), k = width / vp.width, v = page.getViewport({ scale: k });
    const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise; return c;
  },
  async videoFrame(i) {
    const u = await blobFor(i); if (!u) return null;
    return new Promise(res => {
      const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = u; v.playsInline = true;
      const done = c => { v.src = ''; res(c); };
      v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 3); };
      v.onseeked = () => { const c = document.createElement('canvas'), k = 480 / (v.videoWidth || 480); c.width = 480; c.height = Math.round((v.videoHeight || 270) * k); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); done(c); };
      v.onerror = () => done(null); setTimeout(() => done(null), 8000);
    });
  },
  async thumb(i) { // url of a small image for any item, or null
    if (this.thumbs.has(i.id)) return this.thumbs.get(i.id);
    const k = fileKind(i); let url = null;
    if (k === 'image') url = await blobFor(i);
    else if (i.type === 'link' && i.meta?.image) url = i.meta.image;
    else if (k === 'pdf' || k === 'video') {
      const cached = await DB.get('files', i.id + ':t');
      if (cached) url = URL.createObjectURL(cached.blob);
      else {
        try {
          let c = null;
          if (k === 'pdf') { const doc = await this.pdfDoc(i); if (doc) { c = await this.renderPage(doc, 1, 480); doc.destroy(); } }
          else c = await this.videoFrame(i);
          if (c) { const blob = await new Promise(r => c.toBlob(r, 'image/webp', .82)); await DB.put('files', { id: i.id + ':t', blob }); url = URL.createObjectURL(blob); }
        } catch (e) { console.warn('thumb', e); }
      }
    }
    this.thumbs.set(i.id, url); return url;
  },
};
const hasVisual = i => ['image', 'pdf', 'video'].includes(fileKind(i)) || (i.type === 'link' && i.meta?.image);
const thumbIO = new IntersectionObserver(es => es.forEach(async e => {
  if (!e.isIntersecting) return;
  thumbIO.unobserve(e.target);
  const i = byId(e.target.dataset.tid); if (!i) return;
  const u = await Prev.thumb(i); if (!u) return;
  const img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
  img.onload = () => img.classList.add('ok'); img.onerror = () => img.remove(); img.src = u;
  e.target.appendChild(img);
}), { rootMargin: '400px' });
function thumbBox(i, cls = 'thumb') { // fixed-size box: icon placeholder, image fades in → no layout jumps
  const k = fileKind(i);
  return `<div class="${cls}" data-tid="${i.id}">${ic(k === 'text' ? 'note' : k, 'lg')}${i.type === 'file' && !['image'].includes(k) ? `<span class="badge">${esc(extOf(i))}</span>` : ''}</div>`;
}
const hookThumbs = root => root.querySelectorAll('[data-tid]').forEach(el => thumbIO.observe(el));
const leadOf = i => hasVisual(i) ? thumbBox(i) : `<div class="ico ${i.type}">${ic(fileKind(i) === 'text' ? 'note' : fileKind(i))}</div>`;

// ---------- render ----------
function actsHtml(i) {
  return `<div class="acts">
    <button class="act ai" data-a="explain" title="Claude anlatsın">${ic('spark', 'sm')}Anlat</button>
    <button class="act" data-a="copy" title="Kopyala">${ic('copy', 'sm')}</button>
    <button class="act" data-a="star" title="Yıldızla">${ic('star', 'sm' + (i.starred ? ' fill star-on' : ''))}</button>
    ${i.type === 'link' ? `<button class="act" data-a="open" title="Linki aç">${ic('ext', 'sm')}</button>` : ''}
    ${i.type === 'file' ? `<button class="act" data-a="download" title="İndir">${ic('down', 'sm')}</button>` : ''}
  </div>`;
}
function metaHtml(i, { tags = 3, acts = false } = {}) {
  const rel = relatedOf(i).filter(x => x.group !== i.group).length;
  return `<div class="meta"><span>${fmtTime(i.ts)}</span>
    ${i.type === 'link' ? `<span>${esc(domain(i.url))}</span>` : ''}
    ${i.type === 'file' && i.size ? `<span>${fmtSize(i.size)}</span>` : ''}
    ${i.starred ? ic('star', 'sm fill star-on') : ''}
    ${rel ? `<span class="rel">${ic('rel', 'sm')}${rel}</span>` : ''}
    ${(i.tags || []).slice(0, tags).map(t => `<span class="tg">${esc(t)}</span>`).join('')}
    ${i.pending && S.bridgeOk ? `<span class="pend">${ic('spark', 'sm')}düzenleniyor</span>` : ''}${acts ? actsHtml(i) : ''}</div>`;
}
function itemRow(i, { acts = true } = {}) {
  const sub = subOf(i);
  return `<div class="item${S.hits?.has(i.id) ? ' hit' : ''}${now() - (i.createdAt || 0) < 4000 ? ' new' : ''}" data-id="${i.id}">
    ${leadOf(i)}
    <div class="body">
      <div class="title">${hl(titleOf(i))}</div>
      ${sub ? `<div class="sub">${hl(sub.slice(0, 300))}</div>` : ''}
      ${metaHtml(i, { acts })}
    </div></div>`;
}

function renderList(items) {
  const el = $('#list'); let html = '', lastDay = '', lastGroup = null, open = false;
  const shown = items.slice(0, S.limit), counts = {};
  shown.forEach(i => { const k = dayKey(i.ts); counts[k] = (counts[k] || 0) + 1; });
  for (const i of shown) {
    const dk = dayKey(i.ts);
    if (dk !== lastDay) { if (open) html += '</div>'; open = false; html += `<div class="day">${fmtDay(dk)}<span class="cnt">${counts[dk]}</span></div>`; lastDay = dk; lastGroup = null; }
    if (i.group !== lastGroup || !open) { if (open) html += '</div>'; html += '<div class="group">'; open = true; lastGroup = i.group; }
    html += itemRow(i);
  }
  if (open) html += '</div>';
  if (items.length > S.limit) html += `<div id="more" class="empty" style="padding:24px">Yükleniyor…</div>`;
  el.innerHTML = html; hookThumbs(el);
  const more = $('#more');
  if (more) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); S.limit += 300; render(); } }).observe(more);
}

function renderGallery(items) {
  const el = $('#gallery');
  const media = items.filter(i => i.type === 'file' || (i.type === 'link' && i.meta?.image)).slice(0, S.limit);
  el.innerHTML = media.map(i => `<div class="tile${S.hits?.has(i.id) ? ' hit' : ''}" data-id="${i.id}">
    ${thumbBox(i)}<div class="tile-cap"><div class="t">${esc(titleOf(i))}</div><div class="s">${KIND_LABEL[fileKind(i)]} · ${fmtDay(dayKey(i.ts))}</div></div></div>`).join('')
    || emptyHtml('grid', 'Galeri boş', 'Resimler, PDF\'ler, videolar ve görseli olan linkler burada görünür.');
  hookThumbs(el);
}

function renderTopics(items) {
  const el = $('#topics'), by = new Map();
  for (const i of items) {
    const tags = i.tags?.length ? i.tags : ['(etiketsiz)'];
    for (const t of tags) { if (!by.has(t)) by.set(t, []); by.get(t).push(i); }
  }
  const sorted = [...by].sort((a, b) => (a[0] === '(etiketsiz)') - (b[0] === '(etiketsiz)') || b[1].length - a[1].length);
  el.innerHTML = sorted.slice(0, 80).map(([t, arr]) => `<section class="topic">
    <button class="topic-head" data-tag="${esc(t)}">${t === '(etiketsiz)' ? 'Etiketsiz' : `<span class="muted">#</span>${esc(t)}`}<span class="n">${arr.length}</span><span class="more">Tümü ${ic('chev', 'sm')}</span></button>
    <div class="group">${arr.slice(0, 4).map(i => itemRow(i)).join('')}</div></section>`).join('')
    || emptyHtml('hash', 'Henüz konu yok', 'Claude kayıtları düzenledikçe konular burada toplanır.');
  hookThumbs(el);
}

const VIEWS = [['list', 'list', 'Liste'], ['board', 'board', 'Pano'], ['gallery', 'grid', 'Galeri']];
function renderChrome() {
  const f = S.filter, live = alive(), cnt = t => live.filter(i => i.type === t).length;
  const types = [['all', 'inbox', 'Tümü', live.length], ['link', 'link', 'Linkler', cnt('link')], ['note', 'note', 'Notlar', cnt('note')], ['file', 'file', 'Dosyalar', cnt('file')]];
  const typeOn = t => f.type === t && !f.star && !(t === 'all' && f.tag);
  $('#viewSwitch').innerHTML = VIEWS.map(([v, icn, l]) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}" title="${l}">${ic(icn, 'sm')}<span>${l}</span></button>`).join('');
  $('#sideFilters').innerHTML = types.map(([t, icn, l, n]) => `<button class="side-row${typeOn(t) ? ' on' : ''}" data-type="${t}">${ic(icn)}<span class="lbl">${l}</span><span class="n">${n}</span></button>`).join('')
    + `<button class="side-row${f.star ? ' on' : ''}" data-star>${ic('star')}<span class="lbl">Yıldızlı</span><span class="n">${live.filter(i => i.starred).length}</span></button>`;
  const counts = new Map(); live.forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  const all = [...counts].sort((a, b) => b[1] - a[1]), tags = S.allTags ? all : all.slice(0, 8);
  if (f.tag && !tags.some(([t]) => t === f.tag)) tags.push([f.tag, counts.get(f.tag) || 0]);
  $('#sideTags').innerHTML = tags.map(([t, n]) => `<button class="side-row${f.tag === t ? ' on' : ''}" data-tag="${esc(t)}"><span class="hash">${ic('hash', 'sm')}</span><span class="lbl">${esc(t)}</span><span class="n">${n}</span></button>`).join('')
    + (all.length > 8 ? `<button class="side-row" data-alltags><span class="hash">${ic('chev', 'sm')}</span><span class="lbl">${S.allTags ? 'Daha az göster' : `Tümünü göster (${all.length})`}</span></button>` : '')
    || '<div class="hint" style="padding:0 10px">Claude düzenledikçe konular burada çıkar.</div>';
  $('#tabsM').innerHTML = types.map(([t, , l]) => `<button class="tab${typeOn(t) ? ' on' : ''}" data-type="${t}">${l}</button>`).join('')
    + `<button class="tab${f.star ? ' on' : ''}" data-star>${ic('star', 'sm')}Yıldızlı</button>`
    + (f.tag ? `<button class="tab on" data-tag="${esc(f.tag)}">${esc(f.tag)} ${ic('x', 'sm')}</button>` : '')
    + [...counts].sort((a, b) => b[1] - a[1]).slice(0, 6).filter(([t]) => t !== f.tag).map(([t]) => `<button class="tab" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
  $('#tabbar').innerHTML = VIEWS.filter(v => v[0] !== 'board').map(([v, icn, l]) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}">${ic(icn)}${l}</button>`).join('');
}
function emptyHtml(icn, h, p, actions = '') {
  return `<div class="empty"><div class="e-ico">${ic(icn, 'lg')}</div><h3>${h}</h3><p>${p}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}

let renderQueued = false;
function render() {
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    const items = visible(), none = !alive().length;
    renderChrome(); renderQinfo();
    for (const v of ['list', 'board', 'gallery', 'topics']) $('#' + v).hidden = none || S.view !== v;
    document.body.classList.toggle('board-view', S.view === 'board' && !none);
    $('#empty').hidden = !none;
    if (none) $('#empty').innerHTML = emptyHtml('inbox', 'Kendine not at', 'WhatsApp\'ta kendine attığın gibi: kutuya yaz ya da link, resim, dosya yapıştır. Sonra aynı kutuya yazarak bul, sonu <b>?</b> ile biten sorular Claude\'a gider.',
      `<button class="btn secondary" data-do="wa">${ic('chat', 'sm')}WhatsApp'tan içe aktar</button><button class="btn secondary" data-do="settings">${ic('settings', 'sm')}Ayarlar</button>`);
    else if (S.view === 'list') items.length ? renderList(items) : ($('#list').innerHTML = emptyHtml('search', 'Benzer kayıt yok', 'Enter\'a basarsan bunu yeni not olarak kaydeder. Soru ise sonuna ? koy, Claude\'a sorar.'));
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
  runSearch(); render(); AI.dot();
  if (sync) Sync.schedule();
}
async function addFromInput(input) {
  const made = itemsFromInput(input);
  if (!made.length) return [];
  made.forEach(m => { m.createdAt = now(); });
  if (made.length === 1 && made[0].type === 'link' && input.source !== 'pc') {
    const dup = S.items.find(i => !i.deleted && i.type === 'link' && i.url.replace(/\/$/, '') === made[0].url.replace(/\/$/, ''));
    if (dup) { toast(`Bu link zaten kayıtlı (${fmtDay(dayKey(dup.ts))})`, 3500, 'link'); openItem(dup.id); return 'dup'; }
  }
  const saved = await saveItems(made);
  await upsert(saved);
  AI.kick();
  return saved;
}
async function removeItem(i) { // soft delete; blob kept until undo window passes
  S.undo = { ...i };
  await upsert([{ id: i.id, deleted: true, ts: i.ts, updatedAt: now() }]);
  toast('Silindi', 6000, 'trash', { label: 'Geri al', fn: undoDelete });
  clearTimeout(S._undoT); S._undoT = setTimeout(() => { if (S.undo?.id === i.id) { DB.del('files', i.id); DB.del('files', i.id + ':t'); S.undo = null; } }, 30000);
}
async function undoDelete() {
  const u = S.undo; if (!u) return; S.undo = null;
  await upsert([{ ...u, deleted: false }]); toast('Geri alındı', 1800, 'check');
}
async function toggleStar(id) { const i = byId(id); if (i) await upsert([{ ...i, starred: !i.starred }]); }
async function itemAction(a, id) {
  const i = byId(id); if (!i) return;
  if (a === 'star') return toggleStar(id);
  if (a === 'copy') return copyItem(i);
  if (a === 'open') return window.open(i.url, '_blank', 'noopener');
  if (a === 'download') { const u = await blobFor(i); if (!u) return toast('Dosya bu cihazda yok'); const l = document.createElement('a'); l.href = u; l.download = i.fileName; l.click(); return; }
  if (a === 'explain') { openItem(id); AI.explain(id); }
}

// ---------- composer ----------
const isQuestion = t => { URL_RE.lastIndex = 0; const u = URL_RE.test(t); URL_RE.lastIndex = 0; return /\?\s*$/.test(t.trim()) && !u; };
function clearBox() { const inp = $('#input'); inp.value = ''; S.q = ''; runSearch(); autoGrow(); render(); closeAnswer(); }
function closeAnswer() { $('#answer').hidden = true; }
function renderQinfo() {
  const el = $('#qinfo'), q = S.q.trim();
  if (!q || !S.hits) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span>${S.hits.size ? `<b>${S.hits.size}</b> benzer kayıt` : 'Benzer kayıt yok'}</span><span class="muted">·</span>
    <span class="muted">${isQuestion(q) ? 'Enter: Claude\'a sor' : 'Enter: kaydet'}</span><button class="link-btn" data-clear>Temizle</button>`;
}
function renderAttach() {
  const el = $('#attachList');
  el.innerHTML = S.attach.map((f, k) => {
    const isImg = (f.type || '').startsWith('image');
    return `<div class="att">${isImg ? `<img data-k="${k}" alt="">` : `<span class="att-ico">${ic(fileKind({ type: 'file', mime: f.type, fileName: f.name }), 'sm')}</span>`}
      <div class="att-b"><div class="att-n">${esc(f.name)}</div><div class="att-s">${fmtSize(f.size)}</div></div>
      <button data-rm="${k}" title="Kaldır">${ic('x', 'sm')}</button></div>`;
  }).join('');
  el.querySelectorAll('img[data-k]').forEach(img => { const u = URL.createObjectURL(S.attach[+img.dataset.k]); img.onload = () => URL.revokeObjectURL(u); img.src = u; });
  updateSend();
}
const updateSend = () => {
  const v = $('#input').value.trim(), q = isQuestion(v);
  $('#saveBtn').disabled = !v && !S.attach.length;
  $('#askBtn').classList.toggle('hot', q); $('#saveBtn').classList.toggle('dim', q && !S.attach.length);
};
async function save() {
  const inp = $('#input'), text = inp.value.trim(), files = S.attach;
  if (!text && !files.length) return;
  // clear the box first, so anything added while saving isn't lost
  inp.value = ''; S.attach = []; S.q = ''; runSearch(); renderAttach(); autoGrow();
  const r = await addFromInput({ text, files });
  render();
  if (r !== 'dup') toast(files.length ? `${files.length} dosya kaydedildi` : 'Kaydedildi', 1600, 'check');
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, innerHeight * .4) + 'px'; updateSend(); }

// ---------- Android back button closes panels instead of leaving the app ----------
const Back = {
  open(dlg) { if (!dlg.open) { dlg.showModal(); history.pushState({ nts: dlg.id }, ''); } },
  init() {
    addEventListener('popstate', () => { for (const d of document.querySelectorAll('dialog[open]')) { d._fromBack = true; d.close(); } if (!$('#answer').hidden) closeAnswer(); });
    for (const d of document.querySelectorAll('dialog')) d.addEventListener('close', () => { if (!d._fromBack && history.state?.nts === d.id) history.back(); d._fromBack = false; });
  },
};

// ---------- detail drawer ----------
function explainHtml(i) {
  if (S.explaining.has(i.id)) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">Claude inceliyor…</div><div class="skel" style="width:92%"></div><div class="skel" style="width:70%"></div></div></div>`;
  if (i.explain?.text) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">Claude'un açıklaması</div>${esc(i.explain.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div></div>`;
  if (i.summary) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">Özet</div>${esc(i.summary)}</div></div>`;
  return '';
}
function openItem(id) {
  const i = byId(id); if (!i) return;
  const dlg = $('#sheet'), k = fileKind(i), rel = relatedOf(i);
  dlg.dataset.id = id;
  dlg.innerHTML = `<div class="d-body">
    <div class="d-head"><span class="type ${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}${KIND_LABEL[k]}</span><span>·</span><span>${fmtDay(dayKey(i.ts))}, ${fmtTime(i.ts)}</span>
      ${i.source === 'whatsapp' ? '<span>· WhatsApp</span>' : i.source === 'pc' ? '<span>· Bilgisayar</span>' : i.source === 'share' ? '<span>· Paylaşım</span>' : ''}
      <span class="sp"></span><button class="icon-btn" data-act="star" title="Yıldızla">${ic('star', i.starred ? 'fill star-on' : '')}</button><button class="icon-btn" data-act="close" title="Kapat">${ic('x')}</button></div>
    <textarea class="d-title" rows="1" aria-label="Başlık">${esc(titleOf(i))}</textarea>
    <div id="explainBox">${explainHtml(i)}</div>
    ${i.type === 'link' ? `<a class="linkcard" href="${esc(i.url)}" target="_blank" rel="noopener">
        ${i.meta?.image ? `<img src="${esc(i.meta.image)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ''}
        <div class="lc-b">${i.meta?.title ? `<div class="lc-t">${esc(i.meta.title)}</div>` : ''}${i.meta?.description ? `<div class="lc-d">${esc(i.meta.description)}</div>` : ''}
        <div class="lc-u">${ic('ext', 'sm')}${esc(i.url)}</div></div></a>` : ''}
    ${i.type === 'file' ? `<div class="preview" id="filePrev"><div class="prev-empty">${ic(k === 'text' ? 'note' : k, 'xl')}<span>Önizleme hazırlanıyor…</span></div></div>` : ''}
    <div class="field-label">Not</div>
    <textarea class="d-text" placeholder="Bir şey ekle…">${esc(i.text || '')}</textarea>
    <div class="tags-edit">${(i.tags || []).map(t => `<span class="tagpill">${esc(t)}<button data-untag="${esc(t)}" title="Kaldır">${ic('x', 'sm')}</button></span>`).join('')}
      <input class="tag-in" placeholder="+ konu" enterkeyhint="done"></div>
    ${rel.length ? `<div class="field-label">Bağlantılı · ${rel.length}</div><div class="rel-list">${rel.slice(0, 12).map(r => itemRow(r, { acts: false })).join('')}</div>` : ''}
    <button class="btn ai wide" data-act="explain">${ic('spark', 'sm')}${i.explain ? 'Claude: yeniden anlat' : 'Claude anlatsın: bu ne, neyle bağlantılı?'}</button>
    <div class="d-foot">
      <button class="fbtn" data-act="share">${ic('upload')}<span>Paylaş</span></button>
      <button class="fbtn" data-act="copy">${ic('copy')}<span>Kopyala</span></button>
      ${i.type === 'link' ? `<a class="fbtn" href="${esc(i.url)}" target="_blank" rel="noopener">${ic('ext')}<span>Aç</span></a>` : ''}
      ${i.type === 'file' ? `<button class="fbtn" data-act="download">${ic('down')}<span>İndir</span></button>` : ''}
      <button class="fbtn danger" data-act="del">${ic('trash')}<span>Sil</span></button></div>
  </div>`;
  hookThumbs(dlg);
  const ta = dlg.querySelector('.d-title'); const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('input', fit);
  const commit = async () => {
    const cur = byId(i.id); if (!cur || cur.deleted) return;
    const title = ta.value.trim().replace(/\n/g, ' '), text = dlg.querySelector('.d-text').value;
    const ch = {};
    if (title && title !== titleOf(cur)) { ch.title = title; ch.userTitle = true; }
    if (text !== (cur.text || '')) ch.text = text;
    const nt = dlg.querySelector('.tag-in').value.trim().replace(/^#/, '').toLowerCase();
    if (nt) ch.tags = [...new Set([...(cur.tags || []), nt])];
    if (Object.keys(ch).length) await upsert([{ ...cur, ...ch }]);
  };
  dlg._commit = commit;
  dlg.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act, row = e.target.closest('.item');
    if (e.target === dlg || act === 'close') { await commit(); dlg.close(); }
    else if (act === 'star') { await commit(); await toggleStar(i.id); openItem(i.id); }
    else if (act === 'del') { dlg.close(); await removeItem(i); }
    else if (act === 'share') shareItem(byId(i.id));
    else if (act === 'explain') { await commit(); AI.explain(i.id); }
    else if (act === 'download') itemAction('download', i.id);
    else if (act === 'copy') { await commit(); copyItem(byId(i.id)); }
    else if (e.target.closest('[data-untag]')) { const t = e.target.closest('[data-untag]').dataset.untag; await upsert([{ ...byId(i.id), tags: byId(i.id).tags.filter(x => x !== t) }]); openItem(i.id); }
    else if (row) { await commit(); openItem(row.dataset.id); }
  };
  dlg.querySelector('.tag-in').onkeydown = async e => { if (e.key === 'Enter') { e.preventDefault(); await commit(); openItem(i.id); } };
  dlg.oncancel = () => { commit(); };
  Back.open(dlg);
  requestAnimationFrame(fit);
  if (i.type === 'file') showPreview(i);
}
async function showPreview(i) {
  const box = $('#filePrev'); if (!box) return;
  const u = await blobFor(i), k = fileKind(i);
  if (!u) { box.innerHTML = `<div class="prev-empty">${ic('cloud', 'xl')}<span>Dosya bu cihazda yok${i.fileSynced ? ', senkron ayarlarını kontrol et' : ''}.</span></div>`; return; }
  if (k === 'image') box.innerHTML = `<img src="${u}" alt="">`;
  else if (k === 'video') box.innerHTML = `<video src="${u}" controls playsinline preload="metadata"></video>`;
  else if (k === 'audio') box.innerHTML = `<audio src="${u}" controls></audio>`;
  else if (k === 'text') { const t = await (await fetch(u)).text(); box.innerHTML = `<pre>${esc(t.slice(0, 20000))}</pre>`; }
  else if (k === 'pdf') {
    try {
      const doc = await Prev.pdfDoc(i), max = Math.min(doc.numPages, 40);
      box.innerHTML = `<div class="pdf-bar">${ic('pdf', 'sm')}<span>${doc.numPages} sayfa</span></div><div class="pdf-pages"></div>`;
      const pages = box.querySelector('.pdf-pages'), w = Math.min(1400, (pages.clientWidth || 440) * (devicePixelRatio || 1));
      pages.innerHTML = '<div class="skel" style="height:320px;margin:0;border-radius:6px"></div>';
      for (let n = 1; n <= max; n++) { if (!document.body.contains(pages)) break; const c = await Prev.renderPage(doc, n, w); if (n === 1) pages.innerHTML = ''; pages.appendChild(c); }
      if (doc.numPages > max) pages.insertAdjacentHTML('beforeend', `<div class="prev-empty">+${doc.numPages - max} sayfa daha · indirip aç</div>`);
    } catch (e) { box.innerHTML = `<div class="prev-empty">${ic('pdf', 'xl')}<span>PDF açılamadı</span></div>`; }
  } else box.innerHTML = `<div class="prev-empty">${ic('file', 'xl')}<span>${esc(i.fileName)} · ${fmtSize(i.size)}</span><span>Bu dosya türü için önizleme yok, indirip açabilirsin.</span></div>`;
}

// ---------- board ----------
const Board = {
  COLW: 248, GAP: 72,
  render(items) {
    const plane = $('#plane'), board = $('#board');
    plane.querySelectorAll('.bcard,.col-head').forEach(e => e.remove());
    this.ro?.disconnect();
    const list = items.slice(0, 500).sort((a, b) => a.ts - b.ts);
    const days = []; let last = '';
    for (const i of list) { const k = dayKey(i.ts); if (k !== last) { days.push({ k, items: [] }); last = k; } days.at(-1).items.push(i); }
    const frag = document.createDocumentFragment(); this.cols = [];
    const PER = 4; let cx = 0;
    days.forEach(d => {
      const x = cx; cx += Math.ceil(d.items.length / PER) * (this.COLW + 20) - 20 + this.GAP;
      const h = document.createElement('div'); h.className = 'col-head'; h.innerHTML = `${fmtDay(d.k)}<span class="cnt">${d.items.length}</span>`;
      h.style.left = x + 'px'; h.style.top = '0px'; frag.appendChild(h);
      const cards = d.items.map((i, n) => {
        const c = document.createElement('div'), k = fileKind(i), sub = subOf(i);
        c.className = 'bcard' + (S.hits?.has(i.id) ? ' hit' : '') + (S.linkFrom === i.id ? ' sel' : '');
        const colx = x + Math.floor(n / PER) * (this.COLW + 20);
        c.dataset.id = i.id; c.dataset.colx = colx; c.dataset.sub = Math.floor(n / PER);
        c.innerHTML = `${hasVisual(i) ? thumbBox(i) : ''}<div class="b-in"><div class="b-head"><span class="${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}</span><div class="title">${hl(titleOf(i))}</div></div>
          ${sub ? `<div class="sub">${hl(sub.slice(0, 200))}</div>` : ''}${metaHtml(i, { tags: 3 })}</div>`;
        c.style.left = colx + 'px';
        frag.appendChild(c); return { c, i };
      });
      for (let k = 0; k < cards.length; k += PER) this.cols.push(cards.slice(k, k + PER));
    });
    plane.appendChild(frag); hookThumbs(plane);
    this.layout();
    // cards can grow later (fonts, previews) → re-stack so nothing overlaps
    this.ro = new ResizeObserver(() => { if (!this._lr) this._lr = requestAnimationFrame(() => { this._lr = 0; this.layout(); }); });
    plane.querySelectorAll('.bcard').forEach(c => this.ro.observe(c));
    if (!S.cam) { const w = cx; S.cam = { k: 1, x: Math.min(24, board.clientWidth - w), y: 20 }; }
    this.apply();
  },
  layout() {
    for (const col of this.cols || []) {
      let y = 34;
      for (const { c, i } of col) {
        c.style.top = y + 'px'; y += c.offsetHeight + 16;
      }
    }
    this.wires();
  },
  box(el) { return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; },
  wires() {
    const svg = $('#wires'), cards = new Map([...document.querySelectorAll('.bcard')].map(c => [c.dataset.id, c]));
    const map = new Map(S.items.map(i => [i.id, i])), d = { g: '', rel: '', man: '' };
    const path = (a, b) => {
      const A = this.box(a), B = this.box(b);
      if (Math.abs(A.x - B.x) < 40) { const [p, q] = A.y < B.y ? [A, B] : [B, A]; const x1 = p.x + p.w / 2, y1 = p.y + p.h, x2 = q.x + q.w / 2, y2 = q.y; return `M${x1},${y1} C${x1},${y1 + 18} ${x2},${y2 - 18} ${x2},${y2}`; }
      const [p, q] = A.x < B.x ? [A, B] : [B, A]; const x1 = p.x + p.w, y1 = p.y + Math.min(40, p.h / 2), x2 = q.x, y2 = q.y + Math.min(40, q.h / 2), m = (x2 - x1) / 2;
      return `M${x1},${y1} C${x1 + m},${y1} ${x2 - m},${y2} ${x2},${y2}`;
    };
    const seen = new Set(); let prev = null;
    for (const [id, c] of cards) {
      const i = map.get(id); if (!i) continue;
      if (prev && prev.i.group === i.group) d.g += path(prev.c, c);
      prev = { i, c };
      for (const r of [...(i.related || []), ...(i.explain?.related || [])]) { const k = [id, r].sort().join(); if (cards.has(r) && !seen.has(k)) { seen.add(k); d.rel += path(c, cards.get(r)); } }
      for (const r of i.links || []) if (cards.has(r)) d.man += path(c, cards.get(r));
    }
    svg.innerHTML = `<path d="${d.g}"/><path class="rel" d="${d.rel}"/><path class="man" d="${d.man}"/>`;
  },
  apply() { const c = S.cam; $('#plane').style.transform = `translate3d(${c.x}px,${c.y}px,0) scale(${c.k})`; },
  zoomAt(px, py, f) {
    const c = S.cam, k = Math.min(2, Math.max(.5, c.k * f));
    c.x = px - (px - c.x) * (k / c.k); c.y = py - (py - c.y) * (k / c.k); c.k = k; this.apply();
  },
  fit() {
    const cards = [...document.querySelectorAll('.bcard')]; if (!cards.length) return;
    const b = $('#board'); let x2 = 0, y2 = 0;
    cards.forEach(c => { x2 = Math.max(x2, c.offsetLeft + c.offsetWidth); y2 = Math.max(y2, c.offsetTop + c.offsetHeight); });
    const k = Math.max(.7, Math.min(1, (b.clientWidth - 48) / x2, (b.clientHeight - 90) / y2));
    S.cam = { k, x: Math.max(24, (b.clientWidth - x2 * k) / 2), y: 24 };
    $('#plane').style.transition = 'transform .35s var(--ease)'; this.apply(); setTimeout(() => { $('#plane').style.transition = ''; }, 400);
  },
  init() {
    const b = $('#board'), pts = new Map(); let drag = null, pinch = null;
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.board-tools,.board-legend,.acts')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      b.setPointerCapture(e.pointerId);
      const card = e.target.closest('.bcard');
      if (pts.size === 2) { drag = null; const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y) }; return; }
      drag = { card, sx: e.clientX, sy: e.clientY, moved: false, cx: S.cam.x, cy: S.cam.y };
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
      b.classList.add('panning'); S.cam.x = drag.cx + dx; S.cam.y = drag.cy + dy; this.apply();
    });
    const up = async e => {
      pts.delete(e.pointerId); b.classList.remove('panning');
      if (pts.size < 2) pinch = null;
      const d = drag; drag = null; if (!d) return;
      if (d.card && !d.moved) openItem(d.card.dataset.id);
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('click', e => { const a = e.target.closest('.act'); if (a) { e.stopPropagation(); itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); } });
    b.addEventListener('wheel', e => {
      e.preventDefault(); const r = b.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .01));
      else { S.cam.x -= e.deltaX || (e.shiftKey ? e.deltaY : 0); S.cam.y -= e.shiftKey ? 0 : e.deltaY; this.apply(); }
    }, { passive: false });
    $('#fitBtn').innerHTML = ic('fit', 'sm') + 'Hepsini göster';
    $('#zoomIn').innerHTML = ic('plus', 'sm'); $('#zoomOut').innerHTML = '<svg class="i sm" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
    const zc = f => { const r = b.getBoundingClientRect(); this.zoomAt(r.width / 2, r.height / 2, f); };
    $('#zoomIn').onclick = () => zc(1.2); $('#zoomOut').onclick = () => zc(1 / 1.2);
    $('#fitBtn').onclick = () => this.fit();
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
  dot() {
    const n = S.items.filter(i => i.pending && !i.deleted).length;
    for (const d of document.querySelectorAll('.ai')) { d.classList.toggle('ok', S.bridgeOk && !S.aiBusy); d.classList.toggle('busy', S.aiBusy);
      d.title = S.bridgeOk ? `Claude bağlı${n ? ` · ${n} kayıt sırada` : ''}` : 'Claude köprüsü kapalı'; }
    const ml = document.querySelector('#aiStatus .lbl'); if (ml) ml.textContent = S.bridgeOk ? (S.aiBusy ? 'Düzenliyor' : 'Claude hazır') : 'Claude kapalı';
    const c = $('#aiCount'); if (c) c.textContent = S.bridgeOk ? (S.aiBusy ? 'düzenliyor' : n ? n + ' sırada' : 'bağlı') : 'kapalı';
  },
  kick() { clearTimeout(this._t); this._t = setTimeout(() => this.process(), 800); },
  async pullInbox() {
    if (this._inb) return; this._inb = true;
    try {
      const list = await this.call('/inbox', null, 8000);
      if (list.length) {
        const base = S.settings.bridgeUrl.replace(/\/$/, ''), auth = { authorization: 'Bearer ' + S.settings.bridgeToken };
        for (const e of list) {
          const files = [];
          for (const f of e.files || []) { const r = await fetch(`${base}/inbox/file/${f.fid}`, { headers: auth }); if (r.ok) files.push(new File([await r.blob()], f.name, { type: f.mime })); }
          const made = itemsFromInput({ text: e.text || '', files, ts: e.ts, source: 'pc' });
          made.forEach((m, k) => { m.id = `in${e.id}${k}`; m.group = 'in' + e.id; m.createdAt = now(); });
          await upsert(await saveItems(made));
        }
        await this.call('/inbox/ack', { ids: list.map(e => e.id) }, 8000);
        toast(`Bilgisayardan ${list.length} kayıt geldi`, 2600, 'inbox'); this.kick();
      }
    } catch (err) { console.warn('inbox', err); }
    this._inb = false;
  },
  async process() {
    if (S.aiBusy || !S.bridgeOk) return;
    const pend = S.items.filter(i => i.pending && !i.deleted).sort((a, b) => b.ts - a.ts);
    if (!pend.length) return;
    S.aiBusy = true; this.dot();
    try {
      const needMeta = pend.filter(i => i.type === 'link' && !i.meta).slice(0, 25);
      if (needMeta.length) {
        const m = await this.call('/meta', { urls: needMeta.map(i => i.url) }, 30000);
        await upsert(needMeta.map(i => ({ ...byId(i.id), meta: m[i.url] || { title: '' } })), { sync: false });
      }
      let batch = S.items.filter(i => i.pending && !i.deleted).sort((a, b) => b.ts - a.ts).slice(0, 25);
      batch = await Promise.all(batch.map(async i => { // let Claude see inside files
        const k = fileKind(i);
        try {
          if (k === 'pdf' && i.content == null) {
            const doc = await Prev.pdfDoc(i); let text = '';
            if (doc) { for (let n = 1; n <= Math.min(doc.numPages, 4) && text.length < 4000; n++) text += (await (await doc.getPage(n)).getTextContent()).items.map(x => x.str).join(' ') + '\n'; doc.destroy(); }
            const upd = { ...byId(i.id), content: text.replace(/\s+/g, ' ').trim().slice(0, 4000) };
            await upsert([upd], { sync: false }); return upd;
          }
          if (k === 'image') {
            const u = await blobFor(i); if (!u) return i;
            const bmp = await createImageBitmap(await (await fetch(u)).blob()), r = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
            const c = new OffscreenCanvas(Math.round(bmp.width * r), Math.round(bmp.height * r)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
            const b = await c.convertToBlob({ type: 'image/jpeg', quality: .8 });
            return { ...i, image: b64(new Uint8Array(await b.arrayBuffer())) };
          }
        } catch (e) { console.warn('content', e); }
        return i;
      }));
      const counts = new Map(); S.items.forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
      const tags = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 80).map(x => x[0]);
      const r = await this.call('/organize', { items: batch, tags });
      const ids = new Set(S.items.map(i => i.id)), got = new Map((r.items || []).map(x => [x.id, x]));
      await upsert(batch.map(b => {
        const i = byId(b.id) || b, x = got.get(i.id); if (!x) return { ...i, pending: false };
        return { ...i, pending: false, title: i.userTitle ? i.title : x.title, summary: x.summary,
          tags: [...new Set([...(i.tags || []), ...(x.tags || []).map(t => t.toLowerCase().replace(/^#/, ''))])].slice(0, 6),
          related: [...new Set([...(i.related || []), ...(x.related || []).filter(id => ids.has(id) && id !== i.id)])] };
      }));
      S.aiBusy = false; this.dot();
      if (S.items.some(i => i.pending && !i.deleted)) this.kick();
    } catch (e) { console.warn('AI', e); S.aiBusy = false; this.dot(); this.health(); }
  },
  pick(q, extra = []) {
    const toks = tokens(q), live = alive();
    const scored = live.map(i => [i, scoreItem(i, toks, true)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 50).map(x => x[0]);
    return [...new Map([...extra, ...scored, ...live.sort((a, b) => b.ts - a.ts).slice(0, 30)].map(i => [i.id, i])).values()];
  },
  async ask(q) {
    q = q.replace(/^\?\s*/, '').trim(); if (!q) return this.suggest();
    const box = $('#answer'); box.hidden = false;
    const head = `<div class="a-head">${ic('spark', 'sm')}<span>Claude</span><span class="q">· ${esc(q)}</span><button data-copy title="Cevabı kopyala" style="margin-left:auto">${ic('copy', 'sm')}</button><button data-close title="Kapat" style="margin-left:0">${ic('x', 'sm')}</button></div>`;
    if (!S.bridgeOk && !(await this.health())) { box.innerHTML = head + '<div class="txt">Claude köprüsü kapalı. Bilgisayarda köprü çalışmalı (Ayarlar → Claude).</div>'; return; }
    box.innerHTML = head + '<div class="skel" style="width:90%"></div><div class="skel" style="width:75%"></div><div class="skel" style="width:55%"></div>';
    try {
      const r = await this.call('/ask', { question: q, items: this.pick(q) });
      box.innerHTML = head + `<div class="txt">${esc(r.answer).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>
        <div class="src">${(r.sources || []).map(byId).filter(Boolean).slice(0, 12).map(i => `<button class="src-btn" data-open="${i.id}"><span class="${i.type}-c">${ic(fileKind(i) === 'text' ? 'note' : fileKind(i), 'sm')}</span><span>${esc(titleOf(i))}</span></button>`).join('')}</div>`;
    } catch (e) { box.innerHTML = head + `<div class="txt" style="color:var(--danger)">Hata: ${esc(e.message)}</div>`; }
  },
  suggest() {
    const box = $('#answer'); box.hidden = false;
    box.innerHTML = `<div class="a-head">${ic('spark', 'sm')}<span>Claude'a sor</span><button data-close title="Kapat">${ic('x', 'sm')}</button></div>
      <div class="sugg">${['Bu hafta neler kaydettim?', 'Yapmam gereken işler neler?', 'Bakmadığım önemli linkler hangileri?', 'Hangi konular üzerine en çok şey biriktirmişim?']
        .map(q => `<button data-q="${esc(q)}">${ic('search', 'sm')}${esc(q)}</button>`).join('')}</div>`;
    $('#input').focus();
  },
  async explain(id) {
    const i = byId(id); if (!i || S.explaining.has(id)) return;
    if (!S.bridgeOk && !(await this.health())) return toast('Claude köprüsü kapalı', 2600, 'cpu');
    S.explaining.add(id); this.refreshExplain(id);
    try {
      const q = `Kayıt id=${id} hakkında: Bu nedir, büyük ihtimalle neden kaydedilmiş, ne işe yarar? Diğer kayıtlardan hangileriyle gerçekten bağlantılı (aynı proje, konu ya da iş) ve neden? 2-4 kısa cümle, Türkçe. sources alanına sadece gerçekten bağlantılı DİĞER kayıtların id'lerini yaz.`;
      const extra = [i, ...relatedOf(i)];
      const r = await this.call('/ask', { question: q, items: this.pick([titleOf(i), ...(i.tags || []), i.summary || ''].join(' '), extra) });
      const relIds = (r.sources || []).filter(x => x !== id && byId(x));
      const cur = byId(id);
      await upsert([{ ...cur, explain: { text: r.answer, related: relIds, at: now() } }]);
    } catch (e) { toast('Açıklama alınamadı: ' + e.message, 3500); }
    S.explaining.delete(id); this.refreshExplain(id);
  },
  async cleanTags() {
    if (!S.bridgeOk && !(await this.health())) return toast('Claude köprüsü kapalı', 2600, 'cpu');
    const counts = new Map(); alive().forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
    if (!counts.size) return toast('Henüz etiket yok');
    toast('Claude etiketleri topluyor…', 60000, 'spark');
    try {
      const r = await this.call('/tags', { tags: [...counts] });
      const map = new Map((r.map || []).map(x => [x.from, (x.to || '').toLowerCase().replace(/^#/, '').trim()]));
      const changed = alive().filter(i => (i.tags || []).some(t => map.has(t) && map.get(t) !== t)).map(i => ({
        ...i, tags: [...new Set(i.tags.map(t => map.has(t) ? map.get(t) : t).filter(Boolean))].slice(0, 3) }));
      if (changed.length) await upsert(changed);
      if (S.filter.tag && map.has(S.filter.tag)) S.filter.tag = map.get(S.filter.tag) || null;
      const after = new Set(alive().flatMap(i => i.tags || []));
      toast(changed.length ? `Konular sadeleşti: ${counts.size} → ${after.size}` : 'Konular zaten düzenli', 3500, 'check');
    } catch (e) { toast('Toparlanamadı: ' + e.message, 3500); }
  },
  refreshExplain(id) { const dlg = $('#sheet'); if (dlg.open && dlg.dataset.id === id) { if (!S.explaining.has(id)) openItem(id); else $('#explainBox').innerHTML = explainHtml(byId(id)); } },
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
    bytes = await Crypt.seal(bytes);
    const r = await this.gh('/contents/' + path, { method: 'PUT', body: JSON.stringify({ message, content: b64enc(bytes), ...(sha ? { sha } : {}) }) }, undefined, repo);
    if (!r.ok) { const e = new Error('GitHub ' + r.status + (r.status === 401 ? ' (token geçersiz)' : r.status === 404 || r.status === 403 ? ' (token bu repoya erişemiyor)' : '')); e.status = r.status; throw e; }
    return (await r.json()).content.sha;
  },
  async getJson(path) {
    const r = await this.gh('/contents/' + path);
    if (r.status === 404) return { sha: null, data: [] };
    if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
    const j = await r.json();
    const bytes = j.content ? b64dec(j.content) : new Uint8Array(await (await this.gh('/contents/' + path, {}, 'application/vnd.github.raw')).arrayBuffer());
    const raw = new TextDecoder().decode(await Crypt.open(bytes));
    return { sha: j.sha, data: JSON.parse(raw || '[]') };
  },
  async downloadFile(i) {
    const r = await this.gh('/contents/' + (i.filePath || 'files/' + i.id), {}, 'application/vnd.github.raw', i.fileRepo || this.repos()[0]);
    if (!r.ok) throw new Error('GitHub ' + r.status);
    return new Blob([await Crypt.open(new Uint8Array(await r.arrayBuffer()))], { type: i.mime || '' });
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
      const path = `files/${monthOf(i.ts)}/${i.id}${Crypt.key ? '.enc' : ''}`, bytes = new Uint8Array(await blob.arrayBuffer());
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

// ---------- privacy: app lock + end-to-end encrypted sync ----------
// One passphrase: it unlocks the app and is the AES-GCM key for everything sent to GitHub.
// Only a check value is stored on the device; the key lives in memory while the app is unlocked.
const b64 = u8 => btoa(String.fromCharCode(...u8)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const Crypt = {
  key: null, MAGIC: [72, 78, 69, 49], // "HNE1"
  async derive(pass) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('hizli-note-v1'), iterations: 310000 }, base, 512));
    const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { key, check: b64(bits.slice(32)) };
  },
  async seal(bytes) {
    if (!this.key) return bytes;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, bytes));
    const out = new Uint8Array(4 + 12 + ct.length); out.set(this.MAGIC); out.set(iv, 4); out.set(ct, 16); return out;
  },
  async open(bytes) {
    if (!(bytes.length > 16 && this.MAGIC.every((v, k) => bytes[k] === v))) return bytes;
    if (!this.key) throw new Error('Şifreli veri: önce kilidi aç');
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(4, 16) }, this.key, bytes.slice(16))); }
    catch { throw new Error('Şifre bu repodaki verilerle uyuşmuyor'); }
  },
};
const Lock = {
  conf: null, hiddenAt: 0,
  async load() { this.conf = await DB.get('kv', 'lock'); return !!this.conf; },
  show() {
    return new Promise(resolve => {
      let el = $('#lock');
      if (!el) { el = document.createElement('div'); el.id = 'lock'; el.className = 'lock'; document.body.appendChild(el); }
      el.innerHTML = `<form class="lock-card"><span class="mark lg"></span><h2>Nts kilitli</h2><p>Devam etmek için şifreni gir.</p>
        <input type="password" autocomplete="current-password" placeholder="Şifre" autofocus><div class="lock-err"></div>
        <button class="btn primary">Kilidi aç</button></form>`;
      el.hidden = false; $('#splash').classList.add('gone');
      const f = el.querySelector('form'), inp = f.querySelector('input'), err = f.querySelector('.lock-err');
      setTimeout(() => inp.focus(), 50);
      f.onsubmit = async e => {
        e.preventDefault(); err.textContent = ''; f.querySelector('button').textContent = 'Açılıyor…';
        const { key, check } = await Crypt.derive(inp.value);
        if (check !== this.conf.check) { err.textContent = 'Şifre yanlış'; f.querySelector('button').textContent = 'Kilidi aç'; inp.select(); return; }
        Crypt.key = key; el.hidden = true; el.innerHTML = ''; resolve();
      };
    });
  },
  async enable(pass) {
    const { key, check } = await Crypt.derive(pass);
    this.conf = { check, timeout: 5 }; await DB.put('kv', this.conf, 'lock'); Crypt.key = key;
    await this.reupload();
  },
  async disable() { this.conf = null; await DB.del('kv', 'lock'); Crypt.key = null; await this.reupload(); },
  async reupload() { // rewrite everything in the repo in the new form (encrypted / plain)
    const files = S.items.filter(i => i.type === 'file' && i.fileSynced).map(i => ({ ...i, fileSynced: false }));
    if (files.length) await upsert(files, { sync: false });
    await DB.put('kv', {}, 'shas'); await DB.put('kv', [...new Set(S.items.map(i => monthOf(i.ts)))], 'dirty');
    Sync.schedule();
  },
  watch() {
    document.addEventListener('visibilitychange', async () => {
      if (!this.conf) return;
      if (document.hidden) { this.hiddenAt = now(); return; }
      if (this.hiddenAt && now() - this.hiddenAt > (this.conf.timeout || 5) * 60e3) {
        Crypt.key = null; for (const d of document.querySelectorAll('dialog[open]')) d.close();
        await this.show(); render(); Sync.schedule();
      }
    });
  },
};

// ---------- copy / paste ----------
async function copyItem(i) {
  try {
    if (fileKind(i) === 'image' && window.ClipboardItem) {
      const u = await blobFor(i);
      if (u) {
        const bmp = await createImageBitmap(await (await fetch(u)).blob());
        const c = new OffscreenCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': await c.convertToBlob({ type: 'image/png' }) })]);
        return toast('Resim kopyalandı', 1800, 'check');
      }
    }
    const text = i.type === 'link' ? (i.text ? `${i.url}\n${i.text}` : i.url) : i.type === 'note' ? (i.text || titleOf(i)) : (i.text || i.fileName);
    await navigator.clipboard.writeText(text);
    toast(i.type === 'link' ? 'Link kopyalandı' : 'Kopyalandı', 1800, 'check');
  } catch { toast('Kopyalanamadı'); }
}
async function shareItem(i) {
  try {
    const data = { title: titleOf(i) };
    if (i.type === 'link') data.url = i.url; else if (i.type === 'note') data.text = i.text || titleOf(i);
    else { const u = await blobFor(i); if (u) { const f = new File([await (await fetch(u)).blob()], i.fileName, { type: i.mime || '' }); if (navigator.canShare?.({ files: [f] })) data.files = [f]; } if (i.text) data.text = i.text; }
    if (navigator.share) await navigator.share(data); else copyItem(i);
  } catch (e) { if (e.name !== 'AbortError') copyItem(i); }
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Kopyalandı', 1800, 'check'); } catch { toast('Kopyalanamadı'); } }

// ---------- settings drawer ----------
async function loadSettings() {
  S.settings = (await DB.get('kv', 'settings')) || {};
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port === '8787') {
    // served by the bridge itself: same origin, token comes from the bridge
    S.settings.bridgeUrl = location.origin;
    try { const c = await (await fetch('/config')).json(); if (c.token) S.settings.bridgeToken = c.token; } catch { }
  } else if (!S.settings.bridgeUrl && !/Android|iPhone|iPad/.test(navigator.userAgent)) S.settings.bridgeUrl = 'http://localhost:8787';
}
async function saveSettings() {
  for (const k of ['bridgeUrl', 'bridgeToken', 'ghRepo', 'ghToken']) { const el = $('#set-' + k); if (el) S.settings[k] = el.value.trim(); }
  await DB.put('kv', S.settings, 'settings');
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hn-theme', t); } catch { }
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = bg);
}
function openSettings() {
  const m = $('#menu'), st = S.settings, locked = !!Lock.conf;
  m.innerHTML = `<div class="d-body">
    <div class="d-head"><span class="type">${ic('settings', 'sm')}Ayarlar</span><span class="sp"></span><button class="icon-btn sm" data-act="close">${ic('x')}</button></div>

    <div class="set-sec"><h4>Kayıtlar</h4>
      <button class="set-row" data-do="wa">${ic('chat')}<span>WhatsApp sohbetini içe aktar<small>WhatsApp'ta sohbet → ⋮ → Dışa aktar → Medya dahil. Çıkan dosyayı seç.</small></span></button>
      <button class="set-row" data-do="export">${ic('down')}<span>Yedek indir<small>Her şeyi tek dosya olarak indir</small></span></button>
      <button class="set-row" data-do="import">${ic('upload')}<span>Yedekten geri yükle</span></button>
    </div>

    <div class="set-sec"><h4>Şifre</h4>
      ${locked ? `<div class="callout">${ic('check')}<div class="c-b"><div class="c-t">Şifre açık</div>Uygulama açılırken şifre sorulur. Yedekler de bu şifreyle kilitli, şifresiz kimse okuyamaz. Şifreyi unutursan yedek açılamaz.</div></div>
        <button class="set-row" data-do="unlock-off">${ic('x')}<span>Şifreyi kaldır</span></button>`
      : `<p class="hint">Şifre koyarsan uygulama açılırken sorar ve yedeklerin şifreli saklanır.</p>
        <label class="set-field">Şifre<input id="set-pass" type="password" autocomplete="new-password" placeholder="en az 6 karakter"></label>
        <label class="set-field">Şifre tekrar<input id="set-pass2" type="password" autocomplete="new-password"></label>
        <div class="row"><button class="btn primary" data-do="lock-on">Şifre koy</button></div>`}
    </div>

    <div class="set-sec"><h4>Görünüm</h4>
      <button class="set-row" data-do="theme">${ic('moon')}<span>Açık / koyu tema</span></button>
      ${S.installEvt ? `<button class="set-row" data-do="install">${ic('install')}<span>Uygulamayı yükle<small>Ana ekrana ekle, Paylaş menüsünde çıksın</small></span></button>` : ''}
    </div>

    <details class="adv"><summary>${ic('chev', 'sm')}Gelişmiş</summary>
      <div class="set-sec">
        <button class="set-row" data-do="tags">${ic('hash')}<span>Konuları sadeleştir<small>Claude benzer konuları birleştirir</small></span></button>
        <button class="set-row" data-do="organize">${ic('spark')}<span>Bekleyenleri şimdi düzenle</span></button>
      </div>
      <div class="set-sec"><h4>Claude bağlantısı</h4>
        <p class="hint">Bilgisayardaki Nts köprüsü açıkken Claude aboneliğinle çalışır. Telefonda Tailscale adresini gir. Bilgisayarda kayıt göndermek için: <code>nts "not"</code>, <code>nts dosya.pdf</code>, <code>nts --clip</code>.</p>
        <label class="set-field">Köprü adresi<input id="set-bridgeUrl" value="${esc(st.bridgeUrl || '')}" placeholder="https://pc.xxx.ts.net:8788"></label>
        <label class="set-field">Köprü anahtarı<input id="set-bridgeToken" type="password" value="${esc(st.bridgeToken || '')}"></label>
        <div class="row"><button class="btn secondary" data-do="test">${ic('cpu', 'sm')}Dene</button><span class="status" id="bridgeMsg">${S.bridgeOk ? `<span class="dot" style="background:var(--ok)"></span>Bağlı` : 'Bağlı değil'}</span></div>
      </div>
      <div class="set-sec"><h4>Cihazlar arası senkron (GitHub)</h4>
        <p class="hint">Kayıtlar senin private GitHub reponda yedeklenir, telefon ve bilgisayar aynı şeyi görür.
          <a href="https://github.com/settings/personal-access-tokens/new?name=nts-sync&description=Nts%20sync&contents=write" target="_blank" rel="noopener">Anahtar oluştur</a> (sadece nts-data reposu, Contents: Read and write).</p>
        <label class="set-field">Repo<input id="set-ghRepo" value="${esc(st.ghRepo || '')}" placeholder="kullanici/nts-data"></label>
        <label class="set-field">GitHub anahtarı<input id="set-ghToken" type="password" value="${esc(st.ghToken || '')}" placeholder="github_pat_…"></label>
        <div class="row"><button class="btn secondary" data-do="sync">${ic('cloud', 'sm')}Şimdi senkronla</button><span class="status" id="syncMsg">${esc(S.syncMsg || (Sync.ready() ? '' : 'Kapalı'))}</span></div>
      </div>
    </details>
  </div>`;
  m.onclick = async e => {
    const d = e.target.closest('[data-do]')?.dataset.do;
    if (e.target === m || e.target.closest('[data-act="close"]')) return m.close();
    if (!d) return;
    if (d === 'wa') $('#waInput').click();
    else if (d === 'import') $('#backupInput').click();
    else if (d === 'export') { m.close(); exportBackup(); }
    else if (d === 'organize') { m.close(); if (await AI.health()) { AI.process(); toast('Claude düzenliyor', 2000, 'spark'); } else toast('Claude köprüsü kapalı'); }
    else if (d === 'tags') { m.close(); AI.cleanTags(); }
    else if (d === 'theme') setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    else if (d === 'install') { S.installEvt.prompt(); S.installEvt = null; }
    else if (d === 'test') { await saveSettings(); $('#bridgeMsg').textContent = 'Deneniyor…'; const ok = await AI.health(); $('#bridgeMsg').innerHTML = ok ? '<span class="dot" style="background:var(--ok)"></span>Bağlandı' : 'Ulaşılamadı: köprü açık mı, adres ve token doğru mu?'; }
    else if (d === 'sync') { await saveSettings(); Sync.run(); }
    else if (d === 'lock-on') {
      const p = $('#set-pass').value, p2 = $('#set-pass2').value;
      if (p.length < 6) return toast('Şifre en az 6 karakter olmalı');
      if (p !== p2) return toast('Şifreler aynı değil');
      await Lock.enable(p); toast('Şifre kondu', 2500, 'check'); openSettings();
    } else if (d === 'unlock-off') { await Lock.disable(); toast('Şifre kaldırıldı'); openSettings(); }
  };
  m.onclose = async () => { await saveSettings(); AI.health(); Sync.schedule(); };
  Back.open(m);
}

// ---------- wiring ----------
function wire() {
  for (const [id, icn] of [['#askBtn', 'spark'], ['#saveBtn', 'up'], ['#clipIco', 'clip'], ['#settingsBtn', 'settings']]) $(id).innerHTML = ic(icn, id === '#askBtn' ? 'sm' : '');
  $('#askBtn').insertAdjacentHTML('beforeend', '<span>Sor</span>');
  $('#saveBtn').insertAdjacentHTML('beforeend', '<span class="d-lbl">Kaydet</span>');
  $('#settingsSide').innerHTML = ic('settings') + '<span class="lbl">Ayarlar</span>';

  $('#saveBtn').onclick = save;
  const inp = $('#input');
  // one box: typing filters the list live, Enter saves, a question (ends with ?) goes to Claude
  let st;
  inp.addEventListener('input', () => {
    autoGrow(); clearTimeout(st);
    st = setTimeout(() => { S.q = inp.value.length < 200 ? inp.value : ''; S.limit = 300; runSearch(); render(); }, 80);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); isQuestion(inp.value) ? AI.ask(inp.value) : save(); }
    if (e.key === 'Escape') { clearBox(); inp.blur(); }
  });
  $('#fileInput').onchange = e => { S.attach.push(...e.target.files); e.target.value = ''; renderAttach(); };
  $('#attachList').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { S.attach.splice(+b.dataset.rm, 1); renderAttach(); } };
  // paste anywhere: files become attachments, text goes into the composer
  document.addEventListener('paste', e => {
    const fs = [...(e.clipboardData?.files || [])];
    if (fs.length) { e.preventDefault(); S.attach.push(...fs); renderAttach(); inp.focus(); return; }
    if (e.target.closest('input,textarea')) return;
    const t = e.clipboardData?.getData('text'); if (!t) return;
    e.preventDefault(); inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); inp.focus();
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && S.undo && !e.target.closest('input,textarea')) { e.preventDefault(); undoDelete(); return; }
    if (e.target.closest('input,textarea') || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === '/' || e.key === 'n') { e.preventDefault(); inp.focus(); }
    else if (e.key === 'z' && false) { }
  });
  const comp = $('#composer'); let dragN = 0;
  addEventListener('dragenter', e => { if (e.dataTransfer?.types?.includes('Files')) { dragN++; comp.classList.add('drag'); } });
  addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; comp.classList.remove('drag'); } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => {
    e.preventDefault(); dragN = 0; comp.classList.remove('drag');
    const fs = [...e.dataTransfer.files];
    if (fs.length === 1 && /\.zip$/i.test(fs[0].name)) { importWhatsApp(fs[0]).catch(err => toast('Hata: ' + err.message)); return; }
    if (fs.length) { S.attach.push(...fs); renderAttach(); }
    else { const t = e.dataTransfer.getData('text'); if (t) { inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); } }
  });

  $('#askBtn').onclick = () => { const q = inp.value.trim(); q ? AI.ask(q) : AI.suggest(); };
  $('#answer').onclick = e => {
    const o = e.target.closest('[data-open]'); if (o) return openItem(o.dataset.open);
    const q = e.target.closest('[data-q]'); if (q) { inp.value = q.dataset.q; AI.ask(q.dataset.q); return; }
    if (e.target.closest('[data-copy]')) return copyText($('#answer .txt')?.innerText || '');
    if (e.target.closest('[data-close]')) closeAnswer();
  };
  $('#qinfo').onclick = e => { if (e.target.closest('[data-clear]')) clearBox(); };

  const onFilter = e => {
    const b = e.target.closest('button'); if (!b) return; const f = S.filter;
    if (b.dataset.view) { setView(b.dataset.view); return; }
    if (b.dataset.type) { f.type = b.dataset.type; f.star = false; if (b.dataset.type === 'all') f.tag = null; }
    else if ('star' in b.dataset) f.star = !f.star;
    else if (b.dataset.tag) f.tag = f.tag === b.dataset.tag ? null : b.dataset.tag;
    else if ('alltags' in b.dataset) { S.allTags = !S.allTags; return render(); }
    else return;
    S.limit = 300; render(); scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const id of ['#viewSwitch', '#sideFilters', '#sideTags', '#tabsM', '#tabbar']) $(id).onclick = onFilter;
  for (const id of ['#list', '#gallery', '#topics', '#empty']) $(id).addEventListener('click', e => {
    const a = e.target.closest('.act'); if (a) { e.stopPropagation(); return itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); }
    const dd = e.target.closest('[data-do]'); if (dd) { if (dd.dataset.do === 'wa') $('#waInput').click(); else openSettings(); return; }
    const th = e.target.closest('.topic-head');
    if (th) { const t = th.dataset.tag; S.filter.tag = t === '(etiketsiz)' ? null : t; setView('list'); scrollTo(0, 0); return; }
    const it = e.target.closest('[data-id]'); if (it) openItem(it.dataset.id);
  });

  $('#settingsBtn').onclick = openSettings; $('#settingsSide').onclick = openSettings;
  $('#aiStatus').onclick = openSettings; $('#aiStatusSide').onclick = openSettings;
  $('#waInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importWhatsApp(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#backupInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importBackup(f).catch(err => toast('Hata: ' + err.message)); } };

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
  addEventListener('appinstalled', () => toast('Yüklendi. Artık Paylaş menüsünde var.', 3000, 'check'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!Lock.conf || Crypt.key)) { reloadFromDB(); AI.health(); Sync.schedule(); } });
  addEventListener('online', () => Sync.schedule());
  Board.init(); Back.init();
}
function setView(v) {
  S.view = v; try { localStorage.setItem('hn-view', v); } catch { }
  render();
}
async function reloadFromDB() {
  const items = await DB.all('items');
  if (items.length === S.items.length && items.every(i => S.idx.has(i.id))) return;
  S.items = items; S.idx.clear(); items.forEach(indexItem); runSearch(); render(); AI.kick(); Sync.schedule();
}

(async function main() {
  setTheme(document.documentElement.dataset.theme);
  try { const v = localStorage.getItem('hn-view'); if (['list', 'board', 'gallery'].includes(v)) S.view = v; } catch { }
  await loadSettings();
  const hp = new URLSearchParams(location.hash.slice(1)); // one-tap setup: #bridge=<token>&url=<bridgeUrl>
  if (hp.get('bridge')) {
    S.settings.bridgeToken = hp.get('bridge'); if (hp.get('url')) S.settings.bridgeUrl = hp.get('url');
    await DB.put('kv', S.settings, 'settings'); history.replaceState(null, '', location.pathname);
    setTimeout(() => toast('Claude köprüsü ayarlandı', 2500, 'check'), 500);
  }
  if (await Lock.load()) await Lock.show();
  Lock.watch();
  S.items = await DB.all('items'); S.items.forEach(indexItem);
  wire(); render();
  if (new URLSearchParams(location.search).has('shared')) { toast('Kaydedildi', 2000, 'check'); history.replaceState(null, '', location.pathname); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  AI.health(); setInterval(() => { if (!document.hidden) AI.health(); }, 20000);
  Sync.run(); setInterval(() => Sync.schedule(), 120000);
  if (S.items.some(i => fileKind(i) === 'pdf')) (window.requestIdleCallback || setTimeout)(() => Prev.pdfLib());
})();
