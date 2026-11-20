'use strict';
/* Nts — app. Depends on db.js (DB, newId, itemsFromInput, saveItems, URL_RE) and vendor/jszip. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const now = () => Date.now();

const S = {
  items: [], idx: new Map(), view: 'board', q: '', hits: null,
  filter: { type: 'all', tag: null, star: false, list: null, color: null }, sortPrio: false, tool: 'select', ink: 'ink', attach: [], hitSel: -1,
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
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  todo: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cursor: '<path d="m5 3 14 8-6 2-2 6z"/>',
  sticky: '<path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9l-6 6H5a1 1 0 0 1-1-1z"/><path d="M14 20v-5a1 1 0 0 1 1-1h5"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="m14 7 3 3"/>',
  arrowr: '<path d="M5 19 19 5M9 5h10v10"/>',
  rect: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>',
  text: '<path d="M5 6V5h14v1M12 5v14M9 19h6"/>',
  eraser: '<path d="m7 21-4-4 10-10 7 7-7 7zM13 21h8"/><path d="m9 11 6 6"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
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
const shortDay = key => { const t = fmtDay(key); if (t === 'Bugün' || t === 'Dün') return t; const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', ...(y !== new Date().getFullYear() ? { year: '2-digit' } : {}) }); };
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
const alive = () => S.items.filter(i => !i.deleted && i.type !== 'draw' && i.type !== 'vault'); // drawings live only on the board; the vault is its own place
const byId = id => S.items.find(x => x.id === id);
function relatedOf(i) {
  return S.items.filter(x => !x.deleted && x.id !== i.id && ((x.group === i.group) || (i.related || []).includes(x.id) || (x.related || []).includes(i.id)
    || (i.links || []).includes(x.id) || (x.links || []).includes(i.id) || (i.explain?.related || []).includes(x.id)));
}

// ---------- search ----------
function indexItem(i) {
  if (i.type === 'vault') return; // never searchable
  const h = norm([i.title, i.meta?.title, i.meta?.description, i.meta?.site, i.text, i.url, i.url && domain(i.url),
    i.fileName, i.content, i.summary, (i.tags || []).join(' '), i.todo?.text, i.project, (i.highlights || []).map(h => h.text).join(' ')].filter(Boolean).join(' '));
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
// colour labels and priority (set by hand: window, right-click / long-press menu)
const COLORS = [['red', 'Kırmızı'], ['orange', 'Turuncu'], ['yellow', 'Sarı'], ['green', 'Yeşil'], ['blue', 'Mavi'], ['purple', 'Mor']];
const PRIOS = [['high', 'Yüksek'], ['', 'Normal'], ['low', 'Düşük']];
const markCls = i => (i.color ? ' c-' + i.color : '') + (i.prio ? ' p-' + i.prio : '');
// smart lists (Claude fills them; the owner can move items by hand, then Claude leaves that item alone)
const LISTS = [['bakilacak', 'eye', 'Bakılacaklar'], ['begendim', 'heart', 'Beğendiklerim'], ['onemli', 'flag', 'Önemli']];
const listName = k => k === 'unseen' ? 'Bakmadıkların' : k.startsWith('p:') ? k.slice(2) : S.settings?.lists?.[k]?.name || LISTS.find(l => l[0] === k)?.[2] || k;
const listHidden = k => !!S.settings?.lists?.[k]?.hidden;
// "saved but never opened": links and files from 3-30 days ago that were never opened
const unseen = i => (i.type === 'link' || i.type === 'file') && !i.seenAt && !i.todo && !i.sticky && now() - i.ts > 3 * 864e5 && now() - i.ts < 30 * 864e5;
const inList = (i, k) => k === 'unseen' ? unseen(i) : k.startsWith('p:') ? i.project === k.slice(2) : (i.lists || []).includes(k);
// filter group of an item: photos get their own button, "Dosyalar" is every other file
const groupOf = i => i.type === 'file' && fileKind(i) === 'image' ? 'photo' : i.type;
function visible(keepAll = false) {
  const f = S.filter;
  return S.items.filter(i => !i.deleted
    && (f.type === 'all' || groupOf(i) === f.type)
    && (!f.tag || (i.tags || []).includes(f.tag))
    && (!f.star || i.starred)
    && (!f.list || inList(i, f.list))
    && (!f.color || i.color === f.color)
    && i.type !== 'draw' && i.type !== 'vault'
    && (keepAll || !S.searchOn || !S.hits || S.hits.has(i.id))
  ).sort((a, b) => (S.sortPrio ? prioRank(a) - prioRank(b) : 0) || b.ts - a.ts);
}
const prioRank = i => i.prio === 'high' ? 0 : i.prio === 'low' ? 2 : 1;

// ---------- files + previews ----------
async function blobFor(i) {
  if (S.urls.has(i.id)) return S.urls.get(i.id);
  let rec = await DB.get('files', i.id);
  if (!rec && (i.sbPath ? Cloud.on() : i.fileSynced && GH.ready())) {
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
// YouTube links play right in the panel (no-cookie embed)
const ytId = i => { if (i.type !== 'link') return null; try { const u = new URL(i.url), h = u.hostname.replace(/^www\.|^m\./, '');
  const id = h === 'youtu.be' ? u.pathname.slice(1) : h === 'youtube.com' ? (u.searchParams.get('v') || (u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/) || [])[2]) : null;
  return /^[\w-]{6,20}$/.test(id || '') ? id : null; } catch { return null; } };
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
const leadOf = i => hasVisual(i) ? thumbBox(i) : `<div class="ico ${i.type}">${i.type === 'link' && i.meta?.logo ? `<img class="fav" src="${esc(i.meta.logo)}" referrerpolicy="no-referrer" alt="" onerror="this.replaceWith(document.createRange().createContextualFragment(ic('link')))">` : ic(fileKind(i) === 'text' ? 'note' : fileKind(i))}</div>`;

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
function metaHtml(i, { tags = 3, acts = false, day = false } = {}) {
  const rel = relatedOf(i).filter(x => x.group !== i.group).length;
  return `<div class="meta"><span>${day ? fmtDay(dayKey(i.ts)) + ' ' : ''}${fmtTime(i.ts)}</span>
    ${i.type === 'link' ? `<span>${esc(domain(i.url))}</span>` : ''}
    ${i.type === 'file' && i.size ? `<span>${fmtSize(i.size)}</span>` : ''}
    ${i.starred ? ic('star', 'sm fill star-on') : ''}
    ${i.prio === 'high' ? `<span class="m-prio">${ic('flag', 'sm')}Yüksek</span>` : ''}
    ${i.todo ? (() => { const d = dueInfo(i.todo.due); return `<span class="m-todo ${i.todo.done ? 'done' : d?.cls || ''}">${ic('todo', 'sm')}${i.todo.done ? 'Bitti' : d ? d.label : 'Görev'}</span>`; })() : ''}
    ${rel ? `<span class="rel">${ic('rel', 'sm')}${rel}</span>` : ''}
    ${(i.tags || []).slice(0, tags).map(t => `<span class="tg">${esc(t)}</span>`).join('')}
    ${i.pending && S.bridgeOk ? `<span class="pend">${ic('spark', 'sm')}düzenleniyor</span>` : ''}${acts ? actsHtml(i) : ''}</div>`;
}
function itemRow(i, { acts = true } = {}) {
  const sub = subOf(i);
  return `<div class="item${S.hits?.has(i.id) ? ' hit' : ''}${now() - (i.createdAt || 0) < 4000 ? ' new' : ''}${markCls(i)}" data-id="${i.id}">
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
  el.innerHTML = media.map(i => `<div class="tile${S.hits?.has(i.id) ? ' hit' : ''}${markCls(i)}" data-id="${i.id}">
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

const VIEWS = [['board', 'board', 'Pano'], ['list', 'list', 'Liste'], ['gallery', 'grid', 'Galeri']];
function renderChrome() {
  const f = S.filter, live = alive(), cnt = t => live.filter(i => groupOf(i) === t).length;
  const types = [['all', 'inbox', 'Tümü', live.length], ['link', 'link', 'Linkler', cnt('link')], ['note', 'note', 'Notlar', cnt('note')],
    ['photo', 'image', 'Fotoğraflar', cnt('photo')], ['file', 'file', 'Dosyalar', cnt('file')]];
  const typeOn = t => S.view !== 'todo' && f.type === t && !f.star && !f.list && !(t === 'all' && f.tag);
  const todos = live.filter(i => i.todo && !i.todo.done).length;
  const lists = LISTS.filter(([k]) => !listHidden(k)).map(([k, icn]) => [k, icn, listName(k), live.filter(i => inList(i, k)).length]);
  const nUnseen = live.filter(unseen).length; if (nUnseen || f.list === 'unseen') lists.push(['unseen', 'clock', listName('unseen'), nUnseen]);
  const listOn = k => S.view !== 'todo' && f.list === k;
  $('#viewSwitch').innerHTML = VIEWS.map(([v, icn, l]) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}" title="${l}">${ic(icn, 'sm')}<span>${l}</span></button>`).join('');
  $('#rail [data-tags]')?.classList.toggle('on', !!(f.tag || f.color));
  $('#filterLbl').textContent = S.view === 'todo' ? 'Yapılacaklar' : f.list ? listName(f.list) : f.tag ? '#' + f.tag : f.star ? 'Yıldızlı' : types.find(t => t[0] === f.type)[2];
  const stars = live.filter(i => i.starred).length;
  $('#rail').innerHTML = types.map(([t, icn, l, n]) => `<button class="${typeOn(t) ? 'on' : ''}" data-type="${t}" data-tip="${l} · ${n}" aria-label="${l}">${ic(icn)}</button>`).join('')
    + `<button class="${f.star && S.view !== 'todo' ? 'on' : ''}" data-star data-tip="Yıldızlı · ${stars}" aria-label="Yıldızlı">${ic('star')}</button><hr>`
    + `<button class="${S.view === 'todo' ? 'on' : ''}" data-todo data-tip="Yapılacaklar · ${todos}" aria-label="Yapılacaklar">${ic('todo')}${todos ? `<span class="cnt">${todos}</span>` : ''}</button>`
    + lists.map(([k, icn, l, n]) => `<button class="${listOn(k) ? 'on' : ''}" data-list="${k}" data-tip="${esc(l)} · ${n}" aria-label="${esc(l)}">${ic(icn)}</button>`).join('') + '<hr>'
    + `<button class="${f.tag ? 'on' : ''}" data-tags data-tip="${f.tag ? '#' + esc(f.tag) : 'Konular'}" aria-label="Konular">${ic('hash')}</button>`
    + `<button data-vault data-tip="Şifrelerim" aria-label="Şifrelerim">${ic('lock')}</button>`;
  $('#popTypes').innerHTML = types.map(([t, icn, l, n]) => `<button class="side-row${typeOn(t) ? ' on' : ''}" data-type="${t}">${ic(icn)}<span class="lbl">${l}</span><span class="n">${n}</span></button>`).join('')
    + `<button class="side-row${f.star ? ' on' : ''}" data-star>${ic('star')}<span class="lbl">Yıldızlı</span><span class="n">${stars}</span></button>`
    + `<button class="side-row${S.view === 'todo' ? ' on' : ''}" data-todo>${ic('todo')}<span class="lbl">Yapılacaklar</span><span class="n">${todos}</span></button>`
    + lists.map(([k, icn, l, n]) => `<button class="side-row${listOn(k) ? ' on' : ''}" data-list="${k}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${n}</span></button>`).join('')
    + `<button class="side-row" data-vault>${ic('lock')}<span class="lbl">Şifrelerim</span></button>`;
  const projs = new Map(); live.forEach(i => i.project && projs.set(i.project, (projs.get(i.project) || 0) + 1));
  $('#projLabel').hidden = !projs.size;
  $('#sideProjects').innerHTML = [...projs].sort((a, b) => b[1] - a[1]).map(([p, n]) => `<button class="side-row${f.list === 'p:' + p ? ' on' : ''}" data-list="p:${esc(p)}">${ic('folder', 'sm')}<span class="lbl">${esc(p)}</span><span class="n">${n}</span></button>`).join('');
  const counts = new Map(); live.forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  const all = [...counts].sort((a, b) => b[1] - a[1]), tags = S.allTags ? all : all.slice(0, 10);
  if (f.tag && !tags.some(([t]) => t === f.tag)) tags.push([f.tag, counts.get(f.tag) || 0]);
  const used = new Set(live.map(i => i.color).filter(Boolean));
  $('#sideMarks').innerHTML = `<div class="mark-dots">${COLORS.filter(([c]) => used.has(c) || f.color === c).map(([c, n]) => `<button class="cdot c-${c}${f.color === c ? ' on' : ''}" data-color="${c}" title="${n}" aria-label="${n}"></button>`).join('') || '<span class="hint">Kayıtlara renk verince burada çıkar.</span>'}</div>
    <button class="side-row${S.sortPrio ? ' on' : ''}" data-sortprio>${ic('flag', 'sm')}<span class="lbl">Önce yüksek öncelik</span>${S.sortPrio ? ic('check', 'sm') : ''}</button>`;
  $('#sideTags').innerHTML = tags.map(([t, n]) => `<button class="side-row${f.tag === t ? ' on' : ''}" data-tag="${esc(t)}"><span class="hash">${ic('hash', 'sm')}</span><span class="lbl">${esc(t)}</span><span class="n">${n}</span></button>`).join('')
    + (all.length > 10 ? `<button class="side-row" data-alltags><span class="hash">${ic('chev', 'sm')}</span><span class="lbl">${S.allTags ? 'Daha az göster' : `Tümünü göster (${all.length})`}</span></button>` : '')
    || '<div class="hint" style="padding:0 10px 8px">Claude düzenledikçe konular burada çıkar.</div>';
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
    renderChrome(); renderHits();
    for (const v of ['list', 'board', 'gallery', 'topics', 'todo']) $('#' + v).hidden = (none && v !== 'todo') || S.view !== v;
    document.body.classList.toggle('board-view', S.view === 'board' && !none);
    $('#boardTools').hidden = none || S.view !== 'board';
    $('#pal').hidden = none || S.view !== 'board';
    $('#empty').hidden = !none || S.view === 'todo';
    if (S.view === 'todo') Todo.render();
    else if (none) $('#empty').innerHTML = emptyHtml('inbox', 'Kendine not at', 'WhatsApp\'ta kendine attığın gibi: kutuya yaz ya da link, resim, dosya yapıştır. Sonra aynı kutuya yazarak bul, sonu <b>?</b> ile biten sorular Claude\'a gider.',
      `<button class="btn secondary" data-do="wa">${ic('chat', 'sm')}WhatsApp'tan içe aktar</button><button class="btn secondary" data-do="settings">${ic('settings', 'sm')}Ayarlar</button>`);
    else if (S.view === 'list') items.length ? renderList(items) : ($('#list').innerHTML = emptyHtml('search', 'Benzer kayıt yok', 'Enter\'a basarsan bunu yeni not olarak kaydeder. Soru ise sonuna ? koy, Claude\'a sorar.'));
    else if (S.view === 'board') Board.render(visible(true));
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
  await Sync.markDirty(list);
  runSearch(); render(); AI.dot();
  if (sync) Sync.schedule();
  Snapshot.schedule();
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
  AI.kick(); setTimeout(() => LinkMeta.run(), 1500);
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
function clearBox() { const inp = $('#input'); inp.value = ''; S.q = ''; S.searchOn = false; runSearch(); autoGrow(); render(); closeAnswer(); }
function closeAnswer() { $('#answer').hidden = true; }
function renderHits() {
  const el = $('#hits'), q = S.q.trim();
  if (S.searchOn && q) {
    el.hidden = false; el.className = 'qchip';
    el.innerHTML = `${ic('search', 'sm')}<span>“${esc(q.slice(0, 40))}” · ${S.hits?.size || 0} kayıt</span><button data-clear title="Aramayı kapat">${ic('x', 'sm')}</button>`;
    return;
  }
  if (!q || !S.hits?.size) { el.hidden = true; return; }
  el.className = 'hits'; el.hidden = false;
  const top = [...S.hits].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => byId(id)).filter(Boolean);
  if (S.hitSel >= top.length) S.hitSel = top.length - 1;
  const hint = S.hitSel >= 0 ? '<kbd>↑</kbd><kbd>↓</kbd> seç · <kbd>Enter</kbd> aç · <kbd>Esc</kbd> kapat'
    : isQuestion(q) ? '<kbd>Enter</kbd> Claude\'a sor · <kbd>↓</kbd> sonuçlara in' : '<kbd>Enter</kbd> yeni not olarak kaydet · <kbd>↓</kbd> sonuçlara in';
  el.innerHTML = `<div class="h-label">Kayıtlar</div>` + top.map((i, n) => {
    const k = fileKind(i), logo = i.type === 'link' && i.meta?.logo;
    return `<button class="h-row${n === S.hitSel ? ' sel' : ''}" data-open="${i.id}"><span class="h-ico ${i.type}-c">${logo ? `<img src="${esc(logo)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ic(k === 'text' ? 'note' : k, 'sm')}</span>
      <span class="h-t">${hl(titleOf(i))}</span><span class="h-s">${i.type === 'link' ? esc(domain(i.url)) : fmtDay(dayKey(i.ts))}</span></button>`;
  }).join('') + `<div class="h-foot d-only"><span>${hint}</span>${S.hits.size > 0 ? `<button class="link-btn" data-all>${S.hits.size} sonucun hepsini göster</button>` : ''}</div>`;
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
  const ask = q && !S.attach.length, b = $('#saveBtn');
  if (b.classList.contains('ask') !== ask) { b.classList.toggle('ask', ask); b.innerHTML = ic(ask ? 'spark' : 'up', 'sm'); b.title = ask ? 'Claude\'a sor (Enter)' : 'Kaydet (Enter)'; }
  $('#askBtn').classList.toggle('hot', ask);
};
async function save() {
  const inp = $('#input'), text = inp.value.trim(), files = S.attach;
  if (!text && !files.length) return;
  // clear the box first, so anything added while saving isn't lost
  inp.value = ''; S.attach = []; S.q = ''; S.searchOn = false; runSearch(); renderAttach(); autoGrow();
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!files.length && lines.length && lines.every(l => TODO_LINE.test(l))) { // "- süt al" / "1. ara" → one task per line
    await Todo.add(lines.map(l => l.replace(TODO_LINE, '').trim()));
    return;
  }
  const r = await addFromInput({ text, files });
  render();
  if (r !== 'dup') toast(files.length ? `${files.length} dosya kaydedildi` : 'Kaydedildi', 1600, 'check');
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, innerHeight * .4) + 'px'; updateSend(); }

// ---------- Android back button closes panels instead of leaving the app ----------
const Back = {
  open(dlg) { if (!dlg.open) { dlg.showModal(); history.pushState({ nts: dlg.id }, ''); } dlg.querySelector('.d-body')?.focus({ preventScroll: true }); },
  init() {
    addEventListener('popstate', () => { for (const d of document.querySelectorAll('dialog[open]')) { d._fromBack = true; d.close(); } if (!$('#answer').hidden) closeAnswer(); Pop.close(); });
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
  const i = byId(id); if (!i) return; Peek.hide?.(); markSeen(i);
  const dlg = $('#sheet'), k = fileKind(i), rel = relatedOf(i);
  dlg.dataset.id = id;
  const yt = ytId(i), media = yt || i.type === 'file' || (i.type === 'link' && i.meta?.image);
  dlg.classList.toggle('wide', !!media);
  const lcard = i.type === 'link' ? `<a class="linkcard" href="${esc(i.url)}" target="_blank" rel="noopener">
        ${i.meta?.image && !ytId(i) ? `<img src="${esc(i.meta.image)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ''}
        <div class="lc-b">${i.meta?.title ? `<div class="lc-t">${esc(i.meta.title)}</div>` : ''}${i.meta?.description ? `<div class="lc-d">${esc(i.meta.description)}</div>` : ''}
        <div class="lc-u">${ic('ext', 'sm')}${esc(i.url)}</div></div></a>` : '';
  dlg.innerHTML = `<div class="d-body" tabindex="-1">
    <div class="d-head"><span class="type ${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}${KIND_LABEL[k]}</span><span>·</span><span>${fmtDay(dayKey(i.ts))}, ${fmtTime(i.ts)}</span>
      ${i.source === 'whatsapp' ? '<span>· WhatsApp</span>' : i.source === 'pc' ? '<span>· Bilgisayar</span>' : i.source === 'share' ? '<span>· Paylaşım</span>' : ''}
      <span class="sp"></span>
      <div class="d-acts d-only">
        <button class="icon-btn" data-act="share" title="Paylaş">${ic('upload')}</button>
        <button class="icon-btn" data-act="copy" title="Kopyala">${ic('copy')}</button>
        ${i.type === 'link' ? `<a class="icon-btn" href="${esc(i.url)}" target="_blank" rel="noopener" title="Aç">${ic('ext')}</a>` : ''}
        ${i.type === 'file' ? `<button class="icon-btn" data-act="download" title="İndir">${ic('down')}</button>` : ''}
        <button class="icon-btn danger" data-act="del" title="Sil">${ic('trash')}</button><span class="d-sep"></span></div>
      <button class="icon-btn" data-act="star" title="Yıldızla">${ic('star', i.starred ? 'fill star-on' : '')}</button><button class="icon-btn" data-act="close" title="Kapat">${ic('x')}</button></div>
    <div class="${media ? 'd-split' : 'd-info'}">${media ? '<div class="d-media">' : ''}
    ${yt ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(i)}" title="YouTube" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
    ${media ? lcard : ''}
    ${i.type === 'file' ? `<div class="preview" id="filePrev"><div class="prev-empty">${ic(k === 'text' ? 'note' : k, 'xl')}<span>Önizleme hazırlanıyor…</span></div></div>` : ''}
    ${media ? '</div><div class="d-info">' : ''}
    <textarea class="d-title" rows="1" aria-label="Başlık">${esc(titleOf(i))}</textarea>
    <div id="explainBox">${explainHtml(i)}</div>
    ${media ? '' : lcard}
    <div class="field-label">Not</div>
    <textarea class="d-text" placeholder="Bir şey ekle…">${esc(i.text || '')}</textarea>
    <div class="tags-edit">${(i.tags || []).map(t => `<span class="tagpill">${esc(t)}<button data-untag="${esc(t)}" title="Kaldır">${ic('x', 'sm')}</button></span>`).join('')}
      <input class="tag-in" placeholder="+ konu" enterkeyhint="done"></div>
    <div class="d-marks"><div class="mark-dots">${COLORS.map(([c, n]) => `<button class="cdot c-${c}${i.color === c ? ' on' : ''}" data-setcolor="${c}" title="${n}" aria-label="${n}"></button>`).join('')}</div>
      <div class="seg sm prio">${PRIOS.map(([v, n]) => `<button class="${(i.prio || '') === v ? 'on' : ''}" data-setprio="${v}">${v === 'high' ? ic('flag', 'sm') : ''}${n}</button>`).join('')}</div></div>
    <div class="d-task">${i.todo ? `<label class="t-line"><input type="checkbox" data-tdone ${i.todo.done ? 'checked' : ''}><span>Görev${i.todo.done ? ' · bitti' : ''}</span></label>
        <input type="datetime-local" class="t-due-in" aria-label="Tarih" value="${i.todo.due ? (i.todo.due.includes('T') ? i.todo.due : i.todo.due + 'T09:00') : ''}">
        <button class="link-btn" data-act="untodo">Görevden çıkar</button>`
      : `<button class="lchip" data-act="mktodo">${ic('todo', 'sm')}Görev yap</button>`}
      <span class="d-break"></span>${LISTS.filter(([k]) => !listHidden(k)).map(([k, icn]) => `<button class="lchip${(i.lists || []).includes(k) ? ' on' : ''}" data-tlist="${k}">${ic(icn, 'sm')}${esc(listName(k))}</button>`).join('')}</div>
    ${rel.length ? `<div class="field-label">Bağlantılı · ${rel.length}</div><div class="rel-chips">${rel.slice(0, 12).map(r => { const rk = fileKind(r);
      return `<button class="rel-chip" data-rel="${r.id}" title="${esc(titleOf(r))}"><span class="${r.type}-c">${ic(rk === 'text' ? 'note' : rk, 'sm')}</span><span class="t">${esc(titleOf(r))}</span></button>`; }).join('')}</div>` : ''}
    ${i.type === 'link' && (i.read || Reader.wanted(i)) ? `<button class="btn secondary wide" data-act="read">${ic('note', 'sm')}${i.read ? `Okuma görünümü · ${Reader.minutes(i)} dk` : 'Okunur kopyasını al ve oku'}</button>` : ''}
    ${(i.highlights || []).length ? `<div class="field-label">İşaretlediklerin · ${i.highlights.length}</div><div class="hl-list">${i.highlights.map(h => `<blockquote>${esc(h.text)}</blockquote>`).join('')}</div>` : ''}
    <button class="btn ai wide" data-act="explain">${ic('spark', 'sm')}${i.explain ? 'Claude: yeniden anlat' : 'Claude anlatsın: bu ne, neyle bağlantılı?'}</button>
    </div>${media ? '</div>' : ''}
    <div class="d-foot m-only-b">
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
    else if (act === 'read') { await commit(); Reader.open(i.id); }
    else if (act === 'mktodo') { await commit(); const c = byId(i.id); await upsert([{ ...c, noTodo: false, todo: { text: titleOf(c), done: false, user: true } }]); openItem(i.id); }
    else if (act === 'untodo') { await commit(); await upsert([{ ...byId(i.id), todo: null, noTodo: true }]); openItem(i.id); }
    else if (e.target.closest('[data-setcolor]')) { await commit(); const c = e.target.closest('[data-setcolor]').dataset.setcolor, cur = byId(i.id); await upsert([{ ...cur, color: cur.color === c ? undefined : c }]); openItem(i.id); }
    else if (e.target.closest('[data-setprio]')) { await commit(); await upsert([{ ...byId(i.id), prio: e.target.closest('[data-setprio]').dataset.setprio || undefined }]); openItem(i.id); }
    else if (e.target.closest('[data-tlist]')) { await commit(); const k = e.target.closest('[data-tlist]').dataset.tlist, c = byId(i.id), ls = new Set(c.lists || []); ls.has(k) ? ls.delete(k) : ls.add(k); await upsert([{ ...c, lists: [...ls], userLists: true }]); openItem(i.id); }
    else if (e.target.closest('[data-rel]')) { await commit(); openItem(e.target.closest('[data-rel]').dataset.rel); }
    else if (row) { await commit(); openItem(row.dataset.id); }
  };
  dlg.querySelector('[data-tdone]')?.addEventListener('change', async () => { await commit(); await Todo.toggle(i.id); openItem(i.id); });
  dlg.querySelector('.t-due-in')?.addEventListener('change', async e => { await commit(); const c = byId(i.id); await upsert([{ ...c, todo: { ...c.todo, due: validDue(e.target.value) || undefined, user: true } }]); });
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

// ---------- filter popover (top left) ----------
const Pop = {
  init() {
    $('#filterBtn').onclick = e => { e.stopPropagation(); this.toggle(e.currentTarget); };
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#filterPop,#filterBtn,[data-tags]')) this.close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });
  },
  toggle(anchor) {
    const p = $('#filterPop'); if (!p.hidden) return this.close();
    const r = anchor.getBoundingClientRect(); p.hidden = false;
    if (innerWidth < 900) { p.style.left = r.left + 'px'; p.style.top = r.bottom + 8 + 'px'; }
    else { p.style.left = r.right + 12 + 'px'; p.style.top = Math.max(12, Math.min(innerHeight - p.offsetHeight - 12, r.top + r.height / 2 - p.offsetHeight / 2)) + 'px'; }
  },
  close() { const p = $('#filterPop'); if (p) p.hidden = true; },
};

// ---------- Şifrelerim: a private vault with its own master password ----------
// Everything is encrypted here (PBKDF2 600k → AES-GCM). Only the ciphertext is stored and synced (one item, type 'vault');
// it is never searched, shown in lists, sent to Claude or put in the MCP snapshot. Locks itself after 3 idle minutes.
const Vault = {
  key: null, list: null, q: '', edit: null, idle: 0,
  item: () => S.items.find(i => i.type === 'vault' && !i.deleted),
  async derive(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async save() {
    const v = this.item(), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(JSON.stringify(this.list))));
    await upsert([{ ...v, iv: b64enc(iv), data: b64enc(ct) }]);
  },
  lock() { this.key = null; this.list = null; this.edit = null; clearTimeout(this.idle); if ($('#vault')?.open) this.draw(); },
  touch() { clearTimeout(this.idle); this.idle = setTimeout(() => { this.lock(); }, 3 * 60e3); },
  open() {
    let d = $('#vault');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'vault'; d.className = 'drawer modal narrow vault'; document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && history.state?.nts === d.id) history.back(); d._fromBack = false; this.lock(); });
      d.addEventListener('click', e => this.click(e)); d.addEventListener('input', () => this.touch());
      d.addEventListener('submit', e => { e.preventDefault(); this.submit(e.target); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.lock(); });
    }
    this.draw(); Back.open(d); setTimeout(() => d.querySelector('input')?.focus(), 60);
  },
  head: t => `<div class="d-head"><span class="type">${ic('lock', 'sm')}${t}</span><span class="sp"></span><button class="icon-btn sm" data-v="close" title="Kapat">${ic('x')}</button></div>`,
  draw() {
    const d = $('#vault'), v = this.item(); if (!d) return;
    if (!v) d.innerHTML = `<div class="d-body" tabindex="-1">${this.head('Şifrelerim')}
      <p class="hint">Şifrelerin, kart ve kapı kodların için ayrı bir kasa. Kendi ana şifresiyle açılır, bu cihazda şifrelenir; sunucuya sadece şifreli hali gider. Claude ve arama içini hiç görmez.</p>
      <form class="v-form" data-f="setup"><label class="set-field">Ana şifre<input name="p1" type="password" autocomplete="new-password" placeholder="en az 8 karakter" required minlength="8"></label>
        <label class="set-field">Ana şifre tekrar<input name="p2" type="password" autocomplete="new-password" required></label>
        <div class="callout warn">${ic('lock')}<div class="c-b">Bu şifreyi unutursan kasadaki bilgiler geri gelmez. Kimse (biz dahil) açamaz.</div></div>
        <button class="btn primary wide">Kasayı oluştur</button></form></div>`;
    else if (!this.key) d.innerHTML = `<div class="d-body" tabindex="-1">${this.head('Şifrelerim')}
      <form class="v-form" data-f="unlock"><div class="v-lock">${ic('lock', 'xl')}<p>Kasa kilitli</p></div>
        <label class="set-field">Ana şifre<input name="p" type="password" autocomplete="current-password" required></label><div class="lock-err" id="vErr"></div>
        <button class="btn primary wide">Aç</button></form></div>`;
    else if (this.edit) {
      const e = this.edit;
      d.innerHTML = `<div class="d-body" tabindex="-1">${this.head(e.id ? 'Düzenle' : 'Yeni kayıt')}
        <form class="v-form" data-f="entry"><label class="set-field">Ad<input name="name" value="${esc(e.name || '')}" placeholder="ör. Gmail, banka, kapı kodu" required></label>
          <label class="set-field">Kullanıcı adı / e-posta<input name="user" value="${esc(e.user || '')}" autocomplete="off"></label>
          <label class="set-field">Şifre<span class="v-pw"><input name="pass" type="password" value="${esc(e.pass || '')}" autocomplete="new-password"><button type="button" class="icon-btn sm" data-v="peek" title="Göster">${ic('eye', 'sm')}</button><button type="button" class="btn secondary" data-v="gen">Üret</button></span></label>
          <label class="set-field">Site<input name="url" value="${esc(e.url || '')}" placeholder="https://"></label>
          <label class="set-field">Not<textarea name="note" rows="3">${esc(e.note || '')}</textarea></label>
          <div class="row">${e.id ? `<button type="button" class="btn danger" data-v="del">${ic('trash', 'sm')}Sil</button>` : ''}<span class="sp"></span><button type="button" class="btn secondary" data-v="cancel">Vazgeç</button><button class="btn primary">Kaydet</button></div></form></div>`;
    } else {
      const q = norm(this.q), list = this.list.filter(e => !q || norm(`${e.name} ${e.user} ${e.url}`).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
      d.innerHTML = `<div class="d-body" tabindex="-1">${this.head('Şifrelerim')}
        <div class="v-bar"><input class="v-search" placeholder="Ara" value="${esc(this.q)}" aria-label="Ara"><button class="btn primary" data-v="new">${ic('plus', 'sm')}Yeni</button><button class="icon-btn" data-v="lock" title="Kilitle">${ic('lock', 'sm')}</button></div>
        ${list.length ? `<div class="v-list">${list.map(e => `<div class="v-row" data-e="${e.id}">
            <button class="v-main" data-v="open"><span class="v-av">${esc((e.name || '?')[0].toLocaleUpperCase('tr'))}</span><span class="v-t"><b>${esc(e.name)}</b><small>${esc(e.user || (e.url ? domain(e.url) : ''))}</small></span></button>
            ${e.user ? `<button class="icon-btn sm" data-v="cuser" title="Kullanıcı adını kopyala">${ic('copy', 'sm')}</button>` : ''}
            ${e.pass ? `<button class="btn secondary sm" data-v="cpass" title="Şifreyi kopyala">${ic('lock', 'sm')}Kopyala</button>` : ''}</div>`).join('')}</div>`
          : `<p class="hint v-empty">${this.list.length ? 'Eşleşen kayıt yok.' : 'Henüz kayıt yok. "Yeni" ile ilk şifreni ekle.'}</p>`}
        <p class="hint">3 dakika dokunmazsan ya da pencereyi kapatınca kendini kilitler. Kopyalanan şifre 30 saniye sonra panodan silinir.</p></div>`;
      d.querySelector('.v-search').oninput = e => { this.q = e.target.value; const pos = e.target.selectionStart; this.draw(); const s2 = $('#vault .v-search'); s2.focus(); s2.setSelectionRange(pos, pos); };
    }
  },
  async submit(f) {
    const kind = f.dataset.f, val = n => f.elements[n]?.value || '';
    if (kind === 'setup') {
      if (val('p1').length < 8) return toast('Ana şifre en az 8 karakter olmalı');
      if (val('p1') !== val('p2')) return toast('Şifreler aynı değil');
      const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 600000;
      this.key = await this.derive(val('p1'), salt, iter); this.list = [];
      const t = now(); await upsert([{ id: 'vault', type: 'vault', salt: b64enc(salt), iter, ts: t, createdAt: t, tags: [], pending: false }]);
      await this.save(); this.touch(); this.draw(); toast('Kasa hazır', 2000, 'check');
    } else if (kind === 'unlock') {
      const v = this.item(), btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Açılıyor…';
      try {
        const key = await this.derive(val('p'), b64dec(v.salt), v.iter || 600000);
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64dec(v.iv) }, key, b64dec(v.data));
        this.key = key; this.list = JSON.parse(new TextDecoder().decode(pt)); this.touch(); this.draw();
      } catch { btn.disabled = false; btn.textContent = 'Aç'; $('#vErr').textContent = 'Şifre yanlış'; f.elements.p.select(); }
    } else if (kind === 'entry') {
      const e = { ...this.edit, id: this.edit.id || newId(), name: val('name').trim(), user: val('user').trim(), pass: val('pass'), url: val('url').trim(), note: val('note'), updatedAt: now() };
      this.list = [...this.list.filter(x => x.id !== e.id), e]; this.edit = null; await this.save(); this.draw(); toast('Kaydedildi', 1500, 'check');
    }
  },
  async copy(text, what) {
    try { await navigator.clipboard.writeText(text); } catch { return toast('Kopyalanamadı'); }
    toast(`${what} kopyalandı`, 1800, 'check');
    clearTimeout(this.clr); this.clr = setTimeout(() => navigator.clipboard.writeText('').catch(() => { }), 30e3);
  },
  async click(ev) {
    const a = ev.target.closest('[data-v]')?.dataset.v, d = $('#vault'); if (ev.target === d) return d.close(); if (!a) return;
    this.touch();
    const e = this.list?.find(x => x.id === ev.target.closest('[data-e]')?.dataset.e);
    if (a === 'close') d.close();
    else if (a === 'lock') this.lock();
    else if (a === 'new') { this.edit = {}; this.draw(); d.querySelector('input[name=name]').focus(); }
    else if (a === 'open') { this.edit = { ...e }; this.draw(); }
    else if (a === 'cancel') { this.edit = null; this.draw(); }
    else if (a === 'cuser') this.copy(e.user, 'Kullanıcı adı');
    else if (a === 'cpass') this.copy(e.pass, 'Şifre');
    else if (a === 'peek') { const i = d.querySelector('input[name=pass]'); i.type = i.type === 'password' ? 'text' : 'password'; }
    else if (a === 'gen') { // 20 chars, no look-alikes
      const cs = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*-_+=?', r = crypto.getRandomValues(new Uint32Array(20));
      const i = d.querySelector('input[name=pass]'); i.value = [...r].map(x => cs[x % cs.length]).join(''); i.type = 'text';
    }
    else if (a === 'del') { this.list = this.list.filter(x => x.id !== this.edit.id); this.edit = null; await this.save(); this.draw(); toast('Silindi', 1500, 'trash'); }
  },
};

// ---------- first-run tour: 6 short steps, each one lights up a part of the screen ----------
const Tour = {
  steps() {
    const phone = innerWidth < 900;
    return [
      ['#composer', 'Tek kutu', 'Yaz, link ya da resim yapıştır, dosya bırak. <b>Enter</b> kaydeder. Yazarken kayıtların arasında da arar.'],
      ['#composer', 'Claude\'a sor', 'Sonu <b>?</b> ile biterse Claude\'a gider: "geçen hafta kaydettiğim PDF neydi?" Claude kayıtlarını da kendisi düzenler.'],
      [phone ? '#filterBtn' : '#rail', 'Neye bakmak istersin', 'Linkler, notlar, fotoğraflar, <b>Yapılacaklar</b> ve Claude\'un doldurduğu listeler burada.'],
      ['#viewSwitch', 'Pano, liste, galeri', 'Panoda kartları sürükleyip istediğin yere koy, boş yere çift tıklayıp not yaz, kalemle çiz.'],
      ['#settingsBtn', 'Telefon ve bilgisayar', 'Ayarlar\'dan <b>Google ile gir</b>: iki cihaz da aynı kayıtları görür. Claude bağlantısı da burada.'],
      [null, 'Hazırsın', 'Kendine bir not at, gerisini Nts ve Claude halleder. Bu turu Ayarlar → "Nasıl kullanılır?"dan tekrar açabilirsin.'],
    ];
  },
  start() {
    this.end(); this.n = 0; Pop.close(); document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const el = this.el = document.createElement('div'); el.className = 'tour';
    el.innerHTML = '<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => { const a = e.target.closest('[data-tour]')?.dataset.tour; if (a === 'next') this.go(1); else if (a === 'back') this.go(-1); else if (a === 'skip') this.end(true); });
    this.key = e => { if (e.key === 'Escape') this.end(true); else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); this.go(1); } else if (e.key === 'ArrowLeft') this.go(-1); };
    addEventListener('keydown', this.key, true); this.rs = () => this.show(); addEventListener('resize', this.rs);
    this.show();
  },
  go(d) { const all = this.steps(); this.n += d; if (this.n >= all.length) return this.end(true); this.n = Math.max(0, this.n); this.show(); },
  show() {
    const all = this.steps(), [sel, h, p] = all[this.n], el = this.el, hole = el.querySelector('.tour-hole'), card = el.querySelector('.tour-card');
    const t = sel && document.querySelector(sel), r = t?.getBoundingClientRect(), pad = 8;
    card.innerHTML = `<div class="tour-n">${this.n + 1} / ${all.length}</div><h3>${h}</h3><p>${p}</p>
      <div class="tour-acts">${this.n < all.length - 1 ? '<button class="link-btn" data-tour="skip">Atla</button>' : ''}<span class="sp"></span>
        ${this.n ? '<button class="btn secondary" data-tour="back">Geri</button>' : ''}<button class="btn primary" data-tour="next">${this.n < all.length - 1 ? 'İleri' : 'Başla'}</button></div>`;
    if (r && r.width) {
      Object.assign(hole.style, { display: '', left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const cw = Math.min(340, innerWidth - 24), ch = card.offsetHeight, below = r.bottom + pad + 14, above = r.top - pad - 14 - ch;
      let x = r.left + r.width / 2 - cw / 2, y = below + ch < innerHeight - 8 ? below : above;
      if (r.width < 120 && r.left < innerWidth / 2 && r.height > 120) { x = r.right + pad + 14; y = r.top + r.height / 2 - ch / 2; } // tall thin rail: card to its right
      card.style.left = Math.max(12, Math.min(innerWidth - cw - 12, x)) + 'px'; card.style.top = Math.max(12, Math.min(innerHeight - ch - 12, y)) + 'px'; card.style.width = cw + 'px';
    } else {
      hole.style.display = 'none'; el.classList.add('dim');
      const cw = Math.min(360, innerWidth - 24); card.style.width = cw + 'px'; card.style.left = (innerWidth - cw) / 2 + 'px'; card.style.top = (innerHeight - card.offsetHeight) / 2 + 'px';
    }
    el.classList.toggle('dim', !(r && r.width));
    card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  },
  end(done) {
    if (this.el) { this.el.remove(); this.el = null; removeEventListener('keydown', this.key, true); removeEventListener('resize', this.rs); }
    if (done) try { localStorage.setItem('hn-tour', '1'); } catch { }
  },
  maybe() { try { if (localStorage.getItem('hn-tour')) return; } catch { return; } setTimeout(() => { if (!document.querySelector('dialog[open]') && !$('#lock:not([hidden])')) this.start(); }, 900); },
};

// ---------- hover preview (desktop list + gallery): a big card on the free side, click opens the item ----------
const Peek = {
  el: null, id: null, t: 0,
  init() {
    const el = this.el = document.createElement('aside'); el.className = 'peek'; el.hidden = true; document.body.appendChild(el);
    const ok = () => matchMedia('(hover: hover) and (min-width: 1100px)').matches && (S.view === 'list' || S.view === 'gallery') && !document.querySelector('dialog[open]');
    for (const id of ['#list', '#gallery']) {
      $(id).addEventListener('mouseover', e => {
        const it = e.target.closest('.item,.tile'); if (!it || !ok()) return;
        if (it.dataset.id === this.id && !el.hidden) { clearTimeout(this.t); return; }
        clearTimeout(this.t); this.t = setTimeout(() => this.show(it), el.hidden ? 350 : 80);
      });
      $(id).addEventListener('mouseout', e => { if (!e.relatedTarget?.closest?.('.item,.tile,.peek')) this.later(); });
    }
    el.addEventListener('mouseleave', () => this.later());
    el.addEventListener('mouseenter', () => clearTimeout(this.t));
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-pa]')?.dataset.pa, i = byId(this.id); if (!i) return;
      if (a === 'copy') return copyItem(i);
      if (a === 'star') { await toggleStar(i.id); return this.fill(byId(i.id)); }
      if (a === 'link') return markSeen(i);
      this.hide(); openItem(i.id);
    });
    addEventListener('scroll', () => this.hide(), { passive: true });
  },
  later() { clearTimeout(this.t); this.t = setTimeout(() => this.hide(), 220); },
  hide() { clearTimeout(this.t); if (this.el) this.el.hidden = true; this.id = null; },
  async show(row) {
    const i = byId(row.dataset.id); if (!i) return;
    this.id = i.id; this.fill(i);
    // the free side next to the row (the left rail takes ~70px); too narrow → no preview
    const r = row.getBoundingClientRect(), el = this.el, roomR = innerWidth - r.right - 28, roomL = r.left - 90;
    const left = roomL > roomR, w = Math.min(360, left ? roomL : roomR);
    if (w < 260) { this.hide(); return; }
    el.style.width = w + 'px';
    el.style.left = (left ? r.left - w - 16 : r.right + 16) + 'px';
    el.hidden = false;
    el.style.top = Math.max(64, Math.min(innerHeight - el.offsetHeight - 96, r.top + r.height / 2 - el.offsetHeight / 2)) + 'px';
    const url = await Prev.thumb(i); if (url && this.id === i.id) { const box = el.querySelector('.pk-media'); if (box) box.innerHTML = `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">`; }
  },
  fill(i) {
    const k = fileKind(i), sub = i.summary || subOf(i) || i.meta?.description || '';
    this.el.innerHTML = `${hasVisual(i) ? `<div class="pk-media">${ic(k === 'text' ? 'note' : k, 'xl')}</div>` : ''}
      <div class="pk-b"><div class="pk-t">${esc(titleOf(i))}</div>
        ${i.type === 'note' && i.text ? `<div class="pk-text">${esc(i.text.slice(0, 600))}</div>` : sub ? `<div class="pk-s">${esc(sub.slice(0, 300))}</div>` : ''}
        ${metaHtml(i, { tags: 4, day: true })}</div>
      <div class="pk-acts"><button class="btn secondary" data-pa="open">${ic('ext', 'sm')}Aç</button>
        ${i.type === 'link' ? `<a class="btn secondary" data-pa="link" href="${esc(i.url)}" target="_blank" rel="noopener">${ic('link', 'sm')}Siteye git</a>` : ''}
        <span class="sp"></span><button class="icon-btn" data-pa="copy" title="Kopyala">${ic('copy', 'sm')}</button>
        <button class="icon-btn" data-pa="star" title="Yıldızla">${ic('star', 'sm' + (i.starred ? ' fill star-on' : ''))}</button></div>`;
  },
};

function markSeen(i) { if (!i.seenAt && (i.type === 'link' || i.type === 'file')) upsert([{ ...i, seenAt: now() }]); }
// once a week: a gentle reminder of what was saved and never opened
function weeklyUnseen() {
  const n = alive().filter(unseen).length, d = new Date(), wk = `${d.getFullYear()}-${Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 6048e5)}`;
  try { if (n < 3 || localStorage.getItem('hn-unseen-week') === wk) return; localStorage.setItem('hn-unseen-week', wk); } catch { return; }
  toast(`Bakmadığın ${n} kayıt var`, 8000, 'clock', { label: 'Göster', fn: () => { S.filter.list = 'unseen'; S.filter.type = 'all'; S.filter.star = false; if (S.view === 'todo' || S.view === 'board') setView('list'); else render(); } });
}

// ---------- right-click / long-press menu on any item ----------
const Ctx = {
  el: null, id: null,
  init() {
    const el = this.el = document.createElement('div'); el.className = 'ctx pop'; el.hidden = true; document.body.appendChild(el);
    const target = e => !e.target.closest('dialog,.dock,input,textarea') && e.target.closest('[data-id],[data-tid]');
    document.addEventListener('contextmenu', e => { const t = target(e); if (!t) return; e.preventDefault(); this.show(t.dataset.id || t.dataset.tid, e.clientX, e.clientY); });
    let lp = null; // long press on touch
    document.addEventListener('touchstart', e => { const t = target(e); if (!t) return; const p = e.touches[0]; lp = setTimeout(() => { lp = 'fired'; navigator.vibrate?.(10); this.show(t.dataset.id || t.dataset.tid, p.clientX, p.clientY); }, 520); }, { passive: true });
    const cancel = () => { if (lp && lp !== 'fired') clearTimeout(lp); };
    document.addEventListener('touchmove', cancel, { passive: true });
    document.addEventListener('touchend', e => { if (lp === 'fired') e.preventDefault(); cancel(); lp = null; });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('.ctx')) this.hide(); }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape') this.hide(); });
    addEventListener('scroll', () => this.hide(), true);
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return; const i = byId(this.id); if (!i) return this.hide();
      if (b.dataset.c !== undefined) await upsert([{ ...i, color: i.color === b.dataset.c ? undefined : b.dataset.c || undefined }]);
      else if (b.dataset.p !== undefined) await upsert([{ ...i, prio: b.dataset.p || undefined }]);
      else if (b.dataset.a === 'open') openItem(i.id);
      else if (b.dataset.a === 'star') await toggleStar(i.id);
      else if (b.dataset.a === 'todo') await upsert([{ ...i, ...(i.todo ? { todo: null, noTodo: true } : { todo: { text: titleOf(i), done: false, user: true }, noTodo: false }) }]);
      else if (b.dataset.a === 'del') await removeItem(i);
      this.hide();
    });
  },
  show(id, x, y) {
    const i = byId(id); if (!i) return; this.id = id; const el = this.el;
    el.innerHTML = `<div class="side-label">Renk</div><div class="mark-dots">${COLORS.map(([c, n]) => `<button class="cdot c-${c}${i.color === c ? ' on' : ''}" data-c="${c}" title="${n}" aria-label="${n}"></button>`).join('')}<button class="cdot none" data-c="" title="Renk yok" aria-label="Renk yok">${ic('x', 'sm')}</button></div>
      <div class="side-label">Öncelik</div><div class="seg sm prio">${PRIOS.map(([v, n]) => `<button class="${(i.prio || '') === v ? 'on' : ''}" data-p="${v}">${n}</button>`).join('')}</div>
      <hr><button class="side-row" data-a="open">${ic('ext', 'sm')}<span class="lbl">Aç</span></button>
      <button class="side-row" data-a="star">${ic('star', 'sm' + (i.starred ? ' fill star-on' : ''))}<span class="lbl">${i.starred ? 'Yıldızı kaldır' : 'Yıldızla'}</span></button>
      <button class="side-row" data-a="todo">${ic('todo', 'sm')}<span class="lbl">${i.todo ? 'Görevden çıkar' : 'Görev yap'}</span></button>
      <button class="side-row danger" data-a="del">${ic('trash', 'sm')}<span class="lbl">Sil</span></button>`;
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px'; el.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
  },
  hide() { if (this.el) this.el.hidden = true; },
};

// ---------- to-do list (numbered; Claude marks tasks, the owner can add "- " lines) ----------
const TODO_LINE = /^(?:[-*•]|\d+[.)])\s+(?=\S)/;
const validDue = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(d) ? d : undefined;
function dueInfo(d) {
  if (!validDue(d)) return null;
  const hasT = d.includes('T'), key = d.slice(0, 10), at = new Date(hasT ? d : d + 'T23:59').getTime(), ms = at - now();
  const day = key === dayKey(now()) ? 'Bugün' : key === dayKey(now() + 864e5) ? 'Yarın' : shortDay(key);
  return { ms, at, label: day + (hasT ? ' ' + d.slice(11, 16) : ''), cls: ms < 0 ? 'late' : key === dayKey(now()) ? 'today' : ms < 3 * 864e5 ? 'soon' : '' };
}
const Todo = {
  open() {
    const open = S.items.filter(i => i.todo && !i.todo.done && !i.deleted);
    const k = i => [i.todo.order ?? Infinity, dueInfo(i.todo.due)?.at ?? Infinity, -i.ts];
    return open.sort((a, b) => { const x = k(a), y = k(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  },
  row(i, n) {
    const d = dueInfo(i.todo.due), done = !!i.todo.done;
    return `<div class="todo-row${done ? ' done' : ''}${d ? ' ' + d.cls : ''}" data-tid="${i.id}">
      <span class="t-num">${n}.</span>
      <button class="t-check" data-check aria-label="${done ? 'Geri al' : 'Bitti'}" title="${done ? 'Geri al' : 'Bitti'}">${ic('check', 'sm')}</button>
      <button class="t-text" data-topen>${hl(i.todo.text || titleOf(i))}${i.project ? `<span class="t-proj">${esc(i.project)}</span>` : ''}</button>
      ${d && !done ? `<span class="t-due ${d.cls}">${d.cls === 'late' ? 'Geçti · ' : ''}${d.label}</span>` : ''}
      ${done ? '' : `<span class="t-grip" data-grip title="Sürükle">${ic('grip', 'sm')}</span>`}</div>`;
  },
  render() {
    const el = $('#todo'), open = this.open();
    const done = S.items.filter(i => i.todo?.done && !i.deleted).sort((a, b) => (b.todo.doneAt || 0) - (a.todo.doneAt || 0)).slice(0, 50);
    const ordered = open.some(i => i.todo.order != null);
    el.innerHTML = `<div class="todo-head"><h2>Yapılacaklar</h2><span class="n">${open.length}</span><span class="sp"></span>
        ${ordered ? `<button class="link-btn" data-tsort>Tarihe göre diz</button>` : ''}</div>
      ${open.length ? `<div class="todo-list" id="todoOpen">${open.map((i, n) => this.row(i, n + 1)).join('')}</div>`
        : emptyHtml('todo', 'Yapılacak bir şey yok', 'Kutuya <b>- süt al</b> ya da <b>1. bankayı ara</b> gibi satırlar yaz, her satır bir görev olur. Claude da "yarın 10:30 diş randevusu" gibi notları kendisi görev yapar.')}
      ${open.length ? '' : '<!--'}<p class="hint todo-tip">Kutuya <code>- </code> ya da <code>1. </code> ile başlayan satırlar yaz: her satır bir görev. Sırayı tutup sürükleyerek değiştir.</p>${open.length ? '' : '-->'}
      ${done.length ? `<details class="todo-done"><summary>${ic('chev', 'sm')}Bitenler · ${done.length}</summary><div class="todo-list">${done.map((i, n) => this.row(i, n + 1)).join('')}</div></details>` : ''}`;
  },
  async add(texts) {
    const ts = now(), made = [];
    texts.forEach((t, k) => { const [it, ...rest] = itemsFromInput({ text: t, ts: ts + k }); if (!it) return; it.todo = { text: t, done: false }; it.createdAt = now(); made.push(it, ...rest); });
    const saved = await saveItems(made); await upsert(saved); AI.kick();
    toast(texts.length > 1 ? `${texts.length} görev eklendi` : 'Görev eklendi', 1800, 'check');
  },
  async toggle(id) {
    const i = byId(id); if (!i?.todo) return;
    const done = !i.todo.done;
    await upsert([{ ...i, todo: { ...i.todo, done, doneAt: done ? now() : undefined } }]);
    if (done) toast('Bitti', 4000, 'check', { label: 'Geri al', fn: () => this.toggle(id) });
  },
  init() {
    const el = $('#todo');
    el.addEventListener('click', async e => {
      const row = e.target.closest('[data-tid]');
      if (e.target.closest('[data-tsort]')) { await upsert(this.open().map(i => ({ ...i, todo: { ...i.todo, order: undefined } }))); return; }
      if (!row) return;
      if (e.target.closest('[data-check]')) { row.classList.add('ticking'); setTimeout(() => this.toggle(row.dataset.tid), 180); }
      else if (e.target.closest('[data-topen]')) openItem(row.dataset.tid);
    });
    // drag by the handle (pointer events: works with mouse and touch)
    el.addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-grip]'); if (!g) return;
      e.preventDefault();
      const row = g.closest('.todo-row'), list = row.parentElement; let moved = false;
      row.classList.add('dragging'); // window listeners: moving the row in the DOM would drop a pointer capture
      const move = ev => {
        moved = true;
        const rows = [...list.children].filter(r => r !== row);
        const after = rows.find(r => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
        list.insertBefore(row, after || null);
        [...list.children].forEach((r, n) => { r.querySelector('.t-num').textContent = n + 1 + '.'; });
      };
      const up = async () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
        row.classList.remove('dragging'); if (!moved) return;
        const ids = [...list.children].map(r => r.dataset.tid);
        await upsert(ids.map((id, n) => { const i = byId(id); return { ...i, todo: { ...i.todo, order: n } }; }));
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
    });
  },
};

// ---------- notes and drawing on the board (own light layer: SVG paths in board coordinates, works with touch) ----------
const INK_COLORS = { ink: 'var(--text)', red: 'var(--c-red)', blue: 'var(--c-blue)', green: 'var(--c-green)' };
const TOOLS = [['select', 'cursor', 'Seç (V)', 'v'], ['note', 'sticky', 'Not (N)', 'n'], ['pen', 'pen', 'Kalem (P)', 'p'], ['arrow', 'arrowr', 'Ok (A)', 'a'],
  ['rect', 'rect', 'Dikdörtgen (R)', 'r'], ['text', 'text', 'Yazı (T)', 't'], ['eraser', 'eraser', 'Silgi (E)', 'e']];
const Ink = {
  init() {
    const pal = $('#pal');
    pal.innerHTML = TOOLS.map(([t, icn, l]) => `<button class="tool" data-tool="${t}" title="${l}" aria-label="${l}">${ic(icn, 'sm')}</button>`).join('')
      + `<button class="tool inkc" data-inkc title="Renk" aria-label="Renk"><span></span></button>`;
    pal.onclick = e => { const b = e.target.closest('button'); if (!b) return; if ('inkc' in b.dataset) { const ks = Object.keys(INK_COLORS); S.ink = ks[(ks.indexOf(S.ink) + 1) % ks.length]; } else this.use(b.dataset.tool); this.chrome(); };
    addEventListener('keydown', e => {
      if (S.view !== 'board' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') || document.querySelector('dialog[open]')) return;
      const t = TOOLS.find(x => x[3] === e.key.toLowerCase()); if (t && !e.shiftKey) { e.preventDefault(); this.use(t[0]); }
      if (e.key === 'Escape') this.use('select');
    });
    this.chrome();
  },
  use(t) { S.tool = t; this.chrome(); },
  chrome() {
    const b = $('#board'); b.dataset.tool = S.tool;
    $('#pal').querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === S.tool));
    $('#pal .inkc span').style.background = INK_COLORS[S.ink];
  },
  at(e) { const r = $('#board').getBoundingClientRect(); return [Math.round((e.clientX - r.left - S.cam.x) / S.cam.k), Math.round((e.clientY - r.top - S.cam.y) / S.cam.k)]; },
  start(e) {
    const t = S.tool;
    if (t === 'note' || t === 'text') { if (e.target.closest('.bcard')) return null; this.sticky(t, e); this.use('select'); return { ink: 'done' }; }
    if (t === 'eraser') { this.erase(e); return { ink: 'erase' }; }
    const p = this.at(e), live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    live.setAttribute('class', 'k-' + t); live.style.stroke = INK_COLORS[S.ink]; $('#ink').appendChild(live);
    return { ink: t, pts: [p], live };
  },
  move(d, e) {
    if (d.ink === 'erase') return this.erase(e);
    if (!d.pts) return;
    const p = this.at(e), last = d.pts.at(-1);
    if (d.ink === 'pen') { if (Math.hypot(p[0] - last[0], p[1] - last[1]) * S.cam.k < 2) return; d.pts.push(p); }
    else d.pts[1] = p;
    d.live.setAttribute('d', this.path(d.ink, d.pts));
  },
  async end(d) {
    if (!d.pts) return;
    d.live.remove();
    const [a, b2] = [d.pts[0], d.pts.at(-1)];
    if (d.pts.length < 2 || (d.ink !== 'pen' && Math.hypot(b2[0] - a[0], b2[1] - a[1]) < 6)) return;
    const t = now();
    await upsert([{ id: newId(), type: 'draw', shape: d.ink, pts: d.pts, color: S.ink, ts: t, createdAt: t, tags: [], pending: false }]);
  },
  erase(e) {
    // geometry, not pixels: a thin line is easy to hit at any zoom, even under a card
    const [x, y] = this.at(e), tol = 10 / S.cam.k;
    const seg = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
    const lines = i => { const [a, b] = [i.pts[0], i.pts.at(-1)]; return i.shape === 'rect' ? [[a, [b[0], a[1]]], [[b[0], a[1]], b], [b, [a[0], b[1]]], [[a[0], b[1]], a]] : i.shape === 'arrow' ? [[a, b]] : i.pts.slice(1).map((p, n) => [i.pts[n], p]); };
    const hit = S.items.find(i => i.type === 'draw' && !i.deleted && i.pts?.length > 1 && lines(i).some(([a, b]) => seg(a, b) < tol));
    if (hit) { document.querySelector(`[data-did="${hit.id}"]`)?.remove(); removeItem(hit); }
  },
  path(shape, pts) {
    const [a, b] = [pts[0], pts.at(-1)];
    if (shape === 'rect') { const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]); return `M${x},${y}h${w}v${h}h${-w}z`; }
    if (shape === 'arrow') {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 14, s1 = ang + Math.PI * .85, s2 = ang - Math.PI * .85;
      return `M${a[0]},${a[1]}L${b[0]},${b[1]}M${b[0] + L * Math.cos(s1)},${b[1] + L * Math.sin(s1)}L${b[0]},${b[1]}L${b[0] + L * Math.cos(s2)},${b[1] + L * Math.sin(s2)}`;
    }
    if (pts.length < 3) return `M${pts.map(p => p.join(',')).join('L')}`;
    let d = `M${a[0]},${a[1]}`; // smooth pen: quadratic curves through midpoints
    for (let n = 1; n < pts.length - 1; n++) { const [x, y] = pts[n], [x2, y2] = pts[n + 1]; d += `Q${x},${y} ${(x + x2) / 2},${(y + y2) / 2}`; }
    return d + `L${b[0]},${b[1]}`;
  },
  render() {
    const svg = $('#ink'); if (!svg) return;
    svg.innerHTML = S.items.filter(i => i.type === 'draw' && !i.deleted && i.pts?.length > 1)
      .map(i => `<path data-did="${i.id}" class="k-${i.shape}" style="stroke:${INK_COLORS[i.color] || INK_COLORS.ink}" d="${this.path(i.shape, i.pts)}"/>`).join('');
  },
  async sticky(kind, e) {
    const [x, y] = this.at(e), t = now();
    const i = { id: newId(), type: 'note', text: '', sticky: kind, pos: { x: x - (kind === 'text' ? 4 : 90), y: y - (kind === 'text' ? 14 : 40) }, ts: t, createdAt: t, tags: [], pending: false, ...(kind === 'note' ? { color: 'yellow' } : {}) };
    await upsert([i], { sync: false });
    requestAnimationFrame(() => { const c = document.querySelector(`.bcard[data-id="${i.id}"]`); if (c) this.edit(c); });
  },
  edit(card) {
    const body = card.querySelector('.st-body'), id = card.dataset.id; if (!body || body.isContentEditable) return;
    body.contentEditable = 'plaintext-only'; if (!body.isContentEditable) body.contentEditable = 'true';
    body.focus(); const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const done = async () => {
      body.removeEventListener('blur', done); body.contentEditable = 'false';
      const text = body.innerText.trim(), i = byId(id); if (!i) return;
      if (!text) { await upsert([{ id, deleted: true, ts: i.ts, updatedAt: now() }]); return; } // empty note: gone
      if (text !== (i.text || '')) await upsert([{ ...i, text, title: undefined, pending: true }]);
      AI.kick();
    };
    body.addEventListener('blur', done);
    body.onkeydown = e => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); body.blur(); } };
  },
};

// ---------- board ----------
const Board = {
  COLW: 240, GAP: 64, PER: 4,
  // Free canvas, like Figma: cards you have moved keep their place (i.pos, synced);
  // cards you never moved are stacked in day columns to the right of the placed ones.
  render(items) {
    const plane = $('#plane'), board = $('#board');
    plane.querySelectorAll('.bcard,.col-head').forEach(e => e.remove());
    this.ro?.disconnect();
    const list = items.slice(0, 600).sort((a, b) => a.ts - b.ts);
    const placed = list.filter(i => i.pos), free = list.filter(i => !i.pos && !i.sticky);
    Ink.render();
    let x0 = 0, y0 = 0;
    if (placed.length) { x0 = Math.max(...placed.map(i => i.pos.x + this.COLW)) + this.GAP * 1.5; y0 = Math.min(...placed.map(i => i.pos.y)); }
    const frag = document.createDocumentFragment(); this.cols = [];
    const card = i => {
      if (i.sticky) { // a note written right on the board
        const c = document.createElement('div'); c.className = 'bcard sticky' + (i.sticky === 'text' ? ' text' : '') + markCls(i); c.dataset.id = i.id;
        c.innerHTML = `<div class="st-body" data-ph="${i.sticky === 'text' ? 'Yazı' : 'Not yaz…'}">${esc(i.text || '')}</div>`; frag.appendChild(c); return c;
      }
      const c = document.createElement('div'), k = fileKind(i), sub = subOf(i);
      c.className = 'bcard' + (S.hits && S.searchOn ? (S.hits.has(i.id) ? ' hit' : ' dim') : '') + (S.linkFrom === i.id ? ' sel' : '') + markCls(i);
      c.dataset.id = i.id;
      c.innerHTML = `<span class="b-date">${shortDay(dayKey(i.ts))}</span>${hasVisual(i) ? thumbBox(i) : ''}<div class="b-in"><div class="b-head"><span class="${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}</span><div class="title">${hl(titleOf(i))}</div></div>
        ${sub ? `<div class="sub">${hl(sub.slice(0, 200))}</div>` : ''}${metaHtml(i, { tags: 2, day: !!i.pos })}</div>`;
      frag.appendChild(c); return c;
    };
    for (const i of placed) { const c = card(i); c.style.left = i.pos.x + 'px'; c.style.top = i.pos.y + 'px'; }
    const days = []; let last = '';
    for (const i of free) { const k = dayKey(i.ts); if (k !== last) { days.push({ k, items: [] }); last = k; } days.at(-1).items.push(i); }
    let cx = x0;
    for (const d of days) {
      const x = cx; cx += Math.ceil(d.items.length / this.PER) * (this.COLW + 20) - 20 + this.GAP;
      const h = document.createElement('div'); h.className = 'col-head';
      h.innerHTML = `<span class="l">${fmtDay(d.k)}</span><span class="s">${shortDay(d.k)}</span><span class="cnt">${d.items.length}</span>`;
      h.style.left = x + 'px'; h.style.top = y0 + 'px'; h.style.setProperty('--w', (cx - x - this.GAP / 2) + 'px'); frag.appendChild(h);
      const cs = d.items.map((i, n) => { const c = card(i); c.classList.add('auto'); c.style.left = x + Math.floor(n / this.PER) * (this.COLW + 20) + 'px'; return c; });
      for (let k = 0; k < cs.length; k += this.PER) this.cols.push(cs.slice(k, k + this.PER));
    }
    this.y0 = y0;
    plane.appendChild(frag); hookThumbs(plane);
    this.layout();
    // auto cards can grow later (fonts, previews) → re-stack so nothing overlaps
    this.ro = new ResizeObserver(() => { if (!this._lr) this._lr = requestAnimationFrame(() => { this._lr = 0; this.layout(); }); });
    plane.querySelectorAll('.bcard').forEach(c => this.ro.observe(c));
    // keep the camera only if it still shows something (new items, filter, theme or view change can leave it on empty space)
    if (S.cam) this.apply();
    requestAnimationFrame(() => { if (!S.cam || !this.anyVisible()) this.fit(false); });
  },
  layout() {
    for (const col of this.cols || []) {
      let y = this.y0 + 30;
      for (const c of col) { if (!c.classList.contains('auto')) continue; c.style.top = y + 'px'; y += c.offsetHeight + 14; }
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
      if (prev && i.group && prev.i.group === i.group) d.g += path(prev.c, c);
      prev = { i, c };
      for (const r of [...(i.related || []), ...(i.explain?.related || [])]) { const k = [id, r].sort().join(); if (cards.has(r) && !seen.has(k)) { seen.add(k); d.rel += path(c, cards.get(r)); } }
      for (const r of i.links || []) if (cards.has(r)) d.man += path(c, cards.get(r));
    }
    svg.innerHTML = `<path d="${d.g}"/><path class="rel" d="${d.rel}"/><path class="man" d="${d.man}"/>`;
  },
  apply() {
    const c = S.cam, pl = $('#plane'); pl.style.transform = `translate3d(${c.x}px,${c.y}px,0) scale(${c.k})`;
    pl.style.setProperty('--hs', Math.max(1, 1 / c.k)); // day labels keep a readable size at any zoom
    const b = $('#board'); b.classList.toggle('far', c.k < .7); b.style.backgroundSize = `${24 * c.k}px ${24 * c.k}px`; b.style.backgroundPosition = `${c.x}px ${c.y}px`;
    const p = $('#zoomPct'); if (p) p.textContent = Math.round(c.k * 100) + '%';
  },
  zoomAt(px, py, f) {
    const c = S.cam, k = Math.min(2.5, Math.max(.2, c.k * f));
    c.x = px - (px - c.x) * (k / c.k); c.y = py - (py - c.y) * (k / c.k); c.k = k; this.apply();
  },
  zoomTo(k) { const b = $('#board'); this.animate(() => this.zoomAt(b.clientWidth / 2, b.clientHeight / 2, k / S.cam.k)); },
  animate(fn) { const p = $('#plane'); p.style.transition = 'transform .3s var(--ease)'; fn(); setTimeout(() => { p.style.transition = ''; }, 320); },
  anyVisible() {
    const b = $('#board'), c = S.cam; if (!c) return false;
    const W = b.clientWidth, H = b.clientHeight;
    return [...document.querySelectorAll('.bcard')].some(el => {
      const x = c.x + el.offsetLeft * c.k, y = c.y + el.offsetTop * c.k;
      return x + el.offsetWidth * c.k > 0 && x < W && y + el.offsetHeight * c.k > 0 && y < H;
    });
  },
  fit(anim = true) {
    const cards = [...document.querySelectorAll('.bcard')], b = $('#board');
    if (!b.clientWidth) { if (!b.hidden) requestAnimationFrame(() => this.fit(anim)); return; } // not laid out yet
    if (!cards.length) { S.cam = { k: 1, x: 24, y: 72 }; return this.apply(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    cards.forEach(c => { x1 = Math.min(x1, c.offsetLeft); y1 = Math.min(y1, c.offsetTop - 30); x2 = Math.max(x2, c.offsetLeft + c.offsetWidth); y2 = Math.max(y2, c.offsetTop + c.offsetHeight); });
    const top = 64, bot = 110, W = b.clientWidth - 48, H = b.clientHeight - top - bot;
    const k = Math.max(.35, Math.min(1, W / (x2 - x1), H / (y2 - y1)));
    // if it doesn't fit even small, start at the newest (right) end
    const x = (x2 - x1) * k <= W ? (b.clientWidth - (x2 - x1) * k) / 2 - x1 * k : b.clientWidth - 24 - x2 * k;
    S.cam = { k, x, y: top - y1 * k };
    anim ? this.animate(() => this.apply()) : this.apply();
  },
  // save where cards were dropped, without re-rendering the board
  async savePos(list) {
    const t = now();
    for (const i of list) i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1);
    await DB.putMany('items', list.map(({ ...i }) => i));
    await Sync.markDirty(list); Sync.schedule();
  },
  async tidy() {
    const list = S.items.filter(i => i.pos);
    if (!list.length) { this.fit(); return toast('Zaten düzenli', 1500, 'check'); }
    const before = list.map(i => ({ id: i.id, pos: i.pos }));
    list.forEach(i => { delete i.pos; });
    await this.savePos(list); S.cam = null; render();
    toast('Günlere göre dizildi', 5000, 'layers', { label: 'Geri al', fn: async () => {
      const back = before.map(b => { const i = byId(b.id); if (i) i.pos = b.pos; return i; }).filter(Boolean);
      await this.savePos(back); render();
    } });
  },
  // first time a card is moved: pin every card where it is now, so nothing else jumps
  pinAll() {
    const moved = [];
    for (const c of document.querySelectorAll('.bcard.auto')) {
      const i = byId(c.dataset.id); if (!i) continue;
      i.pos = { x: c.offsetLeft, y: c.offsetTop }; c.classList.remove('auto'); moved.push(i);
    }
    document.querySelectorAll('.col-head').forEach(h => h.remove());
    return moved;
  },
  init() {
    const b = $('#board'), pts = new Map(); let drag = null, pinch = null, space = false, wr = 0;
    const redraw = () => { if (!wr) wr = requestAnimationFrame(() => { wr = 0; this.wires(); }); };
    addEventListener('keydown', e => { if (e.code === 'Space' && S.view === 'board' && !e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') && !document.querySelector('dialog[open]')) { e.preventDefault(); space = true; b.classList.add('space'); } });
    addEventListener('keyup', e => { if (e.code === 'Space') { space = false; b.classList.remove('space'); } });
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.acts') || e.button === 2) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      b.setPointerCapture(e.pointerId);
      if (pts.size === 2) {
        if (drag?.card && drag.moved) return; // keep dragging the card, ignore the 2nd finger
        drag?.card?.classList.remove('dragging'); drag = null;
        const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; return;
      }
      if (S.tool !== 'select' && !space && e.button !== 1 && !e.target.closest('.st-body[contenteditable]')) { drag = Ink.start(e); if (drag) return; }
      if (e.target.closest('.st-body[contenteditable]')) return;
      const card = space || e.button === 1 ? null : e.target.closest('.bcard');
      drag = { card, sx: e.clientX, sy: e.clientY, moved: false, cx: S.cam.x, cy: S.cam.y, ox: card?.offsetLeft, oy: card?.offsetTop };
    });
    b.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { // two fingers: zoom and pan together
        const [p, q] = [...pts.values()], d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, r = b.getBoundingClientRect();
        S.cam.x += mx - pinch.mx; S.cam.y += my - pinch.my;
        this.zoomAt(mx - r.left, my - r.top, d / pinch.d); Object.assign(pinch, { d, mx, my }); return;
      }
      if (!drag) return;
      if (drag.ink) return Ink.move(drag, e);
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved && drag.card) {
        drag.pinned = this.pinAll(); this.ro?.disconnect();
        drag.card.classList.add('dragging'); drag.card.parentNode.appendChild(drag.card); // on top
      }
      drag.moved = true;
      if (drag.card) {
        drag.card.style.left = drag.ox + dx / S.cam.k + 'px'; drag.card.style.top = drag.oy + dy / S.cam.k + 'px'; redraw();
      } else { b.classList.add('panning'); S.cam.x = drag.cx + dx; S.cam.y = drag.cy + dy; this.apply(); }
    });
    const up = async e => {
      pts.delete(e.pointerId); b.classList.remove('panning');
      if (pts.size < 2) pinch = null;
      if (pts.size) return;
      const d = drag; drag = null; if (!d) return;
      if (d.ink) return Ink.end(d, e);
      if (!d.card) return;
      if (!d.moved) { if (e.type !== 'pointerup') return; return byId(d.card.dataset.id)?.sticky ? Ink.edit(d.card) : openItem(d.card.dataset.id); }
      d.card.classList.remove('dragging');
      const i = byId(d.card.dataset.id); if (!i) return;
      i.pos = { x: Math.round(d.card.offsetLeft), y: Math.round(d.card.offsetTop) };
      const list = [...(d.pinned || []).filter(x => x.id !== i.id), i];
      await this.savePos(list);
      if (d.pinned?.length) toast('Kartlar artık serbest. "Otomatik diz" ile günlere göre geri dizersin.', 4000, 'board');
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('dblclick', e => { if (S.tool === 'select' && !e.target.closest('.bcard')) Ink.sticky('note', e); });
    Ink.init();
    b.addEventListener('click', e => { const a = e.target.closest('.act'); if (a) { e.stopPropagation(); itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); } });
    b.addEventListener('wheel', e => {
      e.preventDefault(); const r = b.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .01));
      else { S.cam.x -= e.deltaX || (e.shiftKey ? e.deltaY : 0); S.cam.y -= e.shiftKey ? 0 : e.deltaY; this.apply(); }
    }, { passive: false });
    $('#fitBtn').innerHTML = ic('fit', 'sm');
    $('#tidyBtn').innerHTML = ic('layers', 'sm');
    $('#zoomIn').innerHTML = ic('plus', 'sm'); $('#zoomOut').innerHTML = '<svg class="i sm" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
    const zc = f => { const r = b.getBoundingClientRect(); this.animate(() => this.zoomAt(r.width / 2, r.height / 2, f)); };
    $('#zoomIn').onclick = () => zc(1.25); $('#zoomOut').onclick = () => zc(1 / 1.25);
    $('#zoomPct').onclick = () => this.zoomTo(1);
    $('#fitBtn').onclick = () => this.fit();
    addEventListener('resize', () => { if (S.view === 'board' && !$('#board').hidden && !this.anyVisible()) this.fit(false); });
    $('#tidyBtn').onclick = () => this.tidy();
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
  setOk(ok) { const ch = ok !== S.bridgeOk; S.bridgeOk = ok; this.dot(); if (ch) render(); if (ok) { this.kick(); this.pullInbox(); setTimeout(() => Reader.background(), 8000); if (ch) Snapshot.schedule(); } },
  dot() {
    const n = S.items.filter(i => i.pending && !i.deleted).length;
    for (const d of document.querySelectorAll('.ai')) { d.classList.toggle('ok', S.bridgeOk && !S.aiBusy); d.classList.toggle('busy', S.aiBusy);
      d.title = `Ayarlar · ${S.bridgeOk ? `Claude bağlı${n ? `, ${n} kayıt sırada` : ''}` : 'Claude köprüsü kapalı'}${Cloud.on() ? ' · senkron açık' : ''}`; }
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
      const projects = [...new Set(S.items.filter(i => i.project && !i.deleted).map(i => i.project))];
      const r = await this.call('/organize', { items: batch, tags, projects });
      const ids = new Set(S.items.map(i => i.id)), got = new Map((r.items || []).map(x => [x.id, x]));
      await upsert(batch.map(b => {
        const i = byId(b.id) || b, x = got.get(i.id); if (!x) return { ...i, pending: false };
        return { ...i, pending: false, title: i.userTitle ? i.title : x.title, summary: x.summary,
          tags: [...new Set([...(i.tags || []), ...(x.tags || []).map(t => t.toLowerCase().replace(/^#/, ''))])].slice(0, 6),
          related: [...new Set([...(i.related || []), ...(x.related || []).filter(id => ids.has(id) && id !== i.id)])],
          ...(x.todo?.text && !i.todo && !i.noTodo ? { todo: { text: x.todo.text, due: validDue(x.todo.due), done: false } } : {}),
          ...(i.todo && !i.todo.user && !i.todo.due && validDue(x.todo?.due) ? { todo: { ...i.todo, due: validDue(x.todo.due) } } : {}),
          ...(i.userLists ? {} : { lists: (x.lists || []).filter(k => LISTS.some(l => l[0] === k)), project: x.project ? x.project.toLowerCase().trim() : undefined }) };
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
    if (!S.bridgeOk && !(await this.health())) { box.innerHTML = head + `<div class="txt">${claudeOff()}</div>`; return; }
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
    if (!S.bridgeOk && !(await this.health())) return toast(claudeOff(), 3200, 'cpu');
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
    if (!S.bridgeOk && !(await this.health())) return toast(claudeOff(), 3200, 'cpu');
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
const GH = { // old way: a private GitHub repo + token (kept under Advanced)
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

// ---------- link preview without the PC bridge ----------
// Title, short description, logo and image for a saved link, even when Claude's bridge is off.
// Uses microlink.io's free API (only the link address is sent; ~50 links a day). Can be turned off in Settings.
// ---------- copy for Claude Code (MCP): on the PC, the bridge keeps a plain snapshot so `nts` tools can search it ----------
const Snapshot = {
  schedule() { if (!S.bridgeOk || Lock.conf) return; clearTimeout(this.t); this.t = setTimeout(() => this.send(), 8000); }, // never with the app lock on
  async send() {
    if (!S.bridgeOk || Lock.conf) return;
    const items = alive().map(i => ({ id: i.id, type: groupOf(i), date: new Date(i.ts).toISOString(), title: titleOf(i), text: (i.text || '').slice(0, 2000) || undefined,
      url: i.url, file: i.fileName, summary: i.summary, tags: i.tags?.length ? i.tags : undefined, project: i.project, lists: i.lists?.length ? i.lists : undefined,
      todo: i.todo ? { text: i.todo.text, due: i.todo.due, done: !!i.todo.done } : undefined, starred: i.starred || undefined,
      highlights: i.highlights?.length ? i.highlights.map(h => h.text) : undefined }));
    try { await AI.call('/snapshot', { items }, 20000); } catch (e) { console.warn('snapshot', e); }
  },
};

// ---------- readable copy of links (the bridge pulls the article text) + reading view with highlights ----------
const NOT_ARTICLE = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|x\.com|twitter\.com|instagram\.com|tiktok\.com|facebook\.com|maps\.google\.|drive\.google\.com|docs\.google\.com)$/;
const Reader = {
  wanted: i => i.type === 'link' && !i.deleted && !i.read && !i.readFail && (() => { try { return !NOT_ARTICLE.test(new URL(i.url).hostname); } catch { return false; } })(),
  async fetch(i) {
    try { const r = await AI.call('/article', { url: i.url }, 30000); await upsert([{ ...byId(i.id), read: r, readFail: undefined }]); return true; }
    catch (e) { await upsert([{ ...byId(i.id), readFail: now() }], { sync: false }); return false; }
  },
  async background() { // a few at a time, newest first, only while the bridge is up
    if (this.busy || !S.bridgeOk) return; this.busy = true;
    try { for (const i of S.items.filter(this.wanted).sort((a, b) => b.ts - a.ts).slice(0, 3)) await this.fetch(i); } finally { this.busy = false; }
  },
  minutes: i => Math.max(1, Math.round((i.read?.words || 0) / 220)),
  async open(id) {
    let i = byId(id); if (!i) return; markSeen(i);
    if (!i.read) {
      if (!S.bridgeOk && !(await AI.health())) return toast(claudeOff(), 3200, 'cpu');
      toast('Okunur kopya alınıyor…', 8000, 'spark');
      if (!(await this.fetch(i))) return toast('Bu sayfadan okunur metin çıkmadı', 3000);
      $('#toast').hidden = true; i = byId(id);
    }
    let d = $('#reader');
    if (!d) { d = document.createElement('dialog'); d.id = 'reader'; d.className = 'drawer modal reader'; document.body.appendChild(d); d.addEventListener('close', () => { if (!d._fromBack && history.state?.nts === d.id) history.back(); d._fromBack = false; this.tip(); }); }
    $('#sheet').open && $('#sheet').close();
    this.id = id; this.draw();
    Back.open(d);
    d.onclick = e => {
      if (e.target === d || e.target.closest('[data-rclose]')) return d.close();
      const mk = e.target.closest('mark[data-h]'); if (mk) return this.tip(mk, mk.dataset.h);
      if (e.target.closest('[data-hl]')) return this.addHighlight();
      if (e.target.closest('[data-hrm]')) return this.removeHighlight(e.target.closest('[data-hrm]').dataset.hrm);
    };
    d.querySelector('.r-body').addEventListener('mouseup', () => setTimeout(() => this.selTip(), 0));
    d.querySelector('.r-body').addEventListener('touchend', () => setTimeout(() => this.selTip(), 250));
  },
  draw() {
    const i = byId(this.id), r = i.read, d = $('#reader'), hs = i.highlights || [];
    const mark = x => { let h = esc(x); for (const hl of hs) { const t = esc(hl.text); if (t.length > 2 && h.includes(t)) h = h.split(t).join(`<mark data-h="${hl.id}">${t}</mark>`); } return h; };
    const tag = { h: 'h3', p: 'p', li: 'li', q: 'blockquote', code: 'pre' };
    d.innerHTML = `<div class="d-body r-wrap" tabindex="-1">
      <div class="d-head"><span class="type link-c">${ic('note', 'sm')}Okuma</span><span>·</span><span>${esc(r.site || domain(i.url))}</span><span>·</span><span>${this.minutes(i)} dk</span>
        <span class="sp"></span><a class="icon-btn" href="${esc(i.url)}" target="_blank" rel="noopener" title="Sayfayı aç">${ic('ext')}</a><button class="icon-btn" data-rclose title="Kapat">${ic('x')}</button></div>
      <article class="r-body"><h1>${esc(r.title || titleOf(i))}</h1>${r.byline ? `<div class="r-by">${esc(r.byline)}</div>` : ''}
        ${r.image ? `<img class="r-img" src="${esc(r.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
        ${r.blocks.map(b => `<${tag[b.t] || 'p'}>${mark(b.x)}</${tag[b.t] || 'p'}>`).join('')}</article>
      <p class="hint r-foot">Yazının bir yerini seç, "İşaretle"ye bas. İşaretlediklerin kaydın penceresinde ve aramada çıkar.</p></div>`;
  },
  sel() { const s = getSelection(); const t = s && !s.isCollapsed ? s.toString().replace(/\s+/g, ' ').trim() : ''; return t.length > 2 && s.anchorNode && $('#reader .r-body')?.contains(s.anchorNode) ? { t, r: s.getRangeAt(0).getBoundingClientRect() } : null; },
  selTip() { const x = this.sel(); if (!x) return; this.picked = x.t; this.tip(null, null, x.r, `<button class="btn primary" data-hl>${ic('pen', 'sm')}İşaretle</button>`); },
  tip(anchor, hid, rect, html) {
    $('#rtip')?.remove(); if (!anchor && !rect) return;
    const d = $('#reader'), el = document.createElement('div'); el.id = 'rtip'; el.className = 'rtip';
    el.innerHTML = html || `<button class="btn secondary" data-hrm="${hid}">${ic('trash', 'sm')}İşareti kaldır</button>`;
    // the dialog is the positioning box (its open animation uses transform), so place the tip in its coordinates
    el.addEventListener('mousedown', e => e.preventDefault()); // keep the text selected
    d.appendChild(el); const r = rect || anchor.getBoundingClientRect(), D = d.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(D.width - el.offsetWidth - 8, r.left - D.left + r.width / 2 - el.offsetWidth / 2)) + 'px';
    el.style.top = Math.max(8 + d.scrollTop, r.top - D.top + d.scrollTop - el.offsetHeight - 8) + 'px';
  },
  async addHighlight() {
    const t = this.sel()?.t || this.picked; this.picked = null; if (!t) return; const i = byId(this.id); // clicking the button can clear the selection
    await upsert([{ ...i, highlights: [...(i.highlights || []), { id: newId(), text: t.slice(0, 2000), at: now() }] }]);
    getSelection().removeAllRanges(); this.tip(); this.redraw();
  },
  async removeHighlight(hid) { const i = byId(this.id); await upsert([{ ...i, highlights: (i.highlights || []).filter(h => h.id !== hid) }]); this.tip(); this.redraw(); },
  redraw() { const b = $('#reader .d-body'), y = b?.parentElement.scrollTop; this.draw(); if (b) $('#reader').scrollTop = y; $('#reader .r-body').addEventListener('mouseup', () => setTimeout(() => this.selTip(), 0)); $('#reader .r-body').addEventListener('touchend', () => setTimeout(() => this.selTip(), 250)); },
};

const LinkMeta = {
  async run() {
    if (this.busy || S.settings.noLinkPreview || !navigator.onLine) return; this.busy = true;
    try {
      const todo = S.items.filter(i => i.type === 'link' && !i.deleted && !i.meta && (!i.metaTry || now() - i.metaTry > 864e5)).sort((a, b) => b.ts - a.ts).slice(0, 6);
      // 1) signed in: our own Supabase function (links stay with us, no daily limit)
      if (todo.length && !S.bridgeOk && Cloud.on() && !this.noFn) {
        try {
          const r = await Cloud.req('/functions/v1/link-preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ urls: todo.map(i => i.url) }) });
          const j = await r.json();
          await upsert(todo.map(i => byId(i.id)).filter(Boolean).map(i => j[i.url] ? { ...i, meta: j[i.url] } : { ...i, metaTry: now() }));
          return;
        } catch (e) { if (/ 404 /.test(e.message)) this.noFn = true; console.warn('link-preview', e.message); } // not deployed yet → microlink below
      }
      // 2) otherwise microlink.io (only the link address is sent)
      for (const i of todo) {
        if (S.bridgeOk) break; // the bridge does it (and Claude writes the summary)
        let meta = null, r;
        try { r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(i.url), { signal: AbortSignal.timeout(12000) }); } catch { break; }
        if (r.status === 429) break; // daily limit: try again later
        const j = await r.json().catch(() => ({}));
        if (j.status === 'success') { const d = j.data || {}; meta = { title: d.title || '', description: d.description || '', image: d.image?.url, logo: d.logo?.url, site: d.publisher }; }
        const cur = byId(i.id); if (cur) await upsert([{ ...cur, ...(meta ? { meta } : { metaTry: now() }) }]);
      }
    } finally { this.busy = false; }
  },
};

// ---------- Cloud: Sign in with Google + sync (Supabase, shared project with Gym/Fluent365) ----------
// Plain fetch, no SDK: PKCE sign-in, REST for items (table nts_items), Storage for files (bucket nts-files).
// Row Level Security: each account only reads/writes its own rows (supabase/schema.sql).
// With the app lock on, items and files are encrypted here before they leave the device.
const SB = { url: 'https://tsnlhzuhbteqgjvxobbx.supabase.co', key: 'sb_publishable_YCxHNSqoyvr40NvFyK2hpQ_VtkaLOwU' };
const b64url = u8 => b64enc(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const Cloud = {
  s: null,
  on() { return !!this.s; },
  email() { return this.s?.user?.email || ''; },
  async load() { this.s = (await DB.get('kv', 'sb-session')) || null; },
  async keep(s) { this.s = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(now() / 1000) + (s.expires_in || 3600), user: { id: s.user?.id, email: s.user?.email } } : null; this.s ? await DB.put('kv', this.s, 'sb-session') : await DB.del('kv', 'sb-session'); },
  async auth(path, body) {
    const r = await fetch(SB.url + '/auth/v1/' + path, { method: 'POST', headers: { apikey: SB.key, 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error_description || j.msg || j.message || 'Giriş hatası ' + r.status); e.status = r.status; throw e; }
    return j;
  },
  async signIn() {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
    try { localStorage.setItem('nts-pkce', JSON.stringify({ verifier, at: now() })); localStorage.removeItem('gym-pkce'); } catch { }
    const back = location.origin + location.pathname; // never the hash; Supabase must allow-list this
    location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back)}&code_challenge=${challenge}&code_challenge_method=s256`;
  },
  // back from Google with ?code=… → trade it for a session
  async finish() {
    const q = new URLSearchParams(location.search), code = q.get('code'), err = q.get('error_description') || q.get('error');
    if (!code && !err) return;
    history.replaceState(null, '', location.pathname + location.hash);
    if (err) return toast('Giriş olmadı: ' + err, 5000);
    let p = null; try { p = JSON.parse(localStorage.getItem('nts-pkce')); localStorage.removeItem('nts-pkce'); } catch { }
    if (!p?.verifier) return;
    try {
      await this.keep(await this.auth('token?grant_type=pkce', { auth_code: code, code_verifier: p.verifier }));
      const prev = await DB.get('kv', 'sb-uid');
      if (prev !== this.s.user.id) { await DB.put('kv', this.s.user.id, 'sb-uid'); await DB.del('kv', 'sb-since'); await DB.put('kv', (await DB.all('items')).map(i => i.id), 'sb-dirty'); }
      setTimeout(() => toast(`Giriş yapıldı: ${this.email()}`, 3000, 'check'), 400);
    } catch (e) { toast('Giriş tamamlanamadı: ' + e.message, 6000); }
  },
  async signOut() {
    try { await fetch(SB.url + '/auth/v1/logout?scope=local', { method: 'POST', headers: { apikey: SB.key, authorization: 'Bearer ' + this.s?.access_token } }); } catch { }
    Live.stop(); await this.keep(null); GH.status('');
  },
  async token() {
    if (!this.s) throw new Error('Giriş yapılmadı');
    if (this.s.expires_at * 1000 - 60e3 < now()) {
      try { await this.keep(await this.auth('token?grant_type=refresh_token', { refresh_token: this.s.refresh_token })); }
      catch (e) { if (e.status >= 400 && e.status < 500) { await this.keep(null); toast('Oturum bitti, Ayarlar\'dan tekrar giriş yap', 6000); } throw e; }
    }
    return this.s.access_token;
  },
  async req(path, opt = {}) {
    const r = await fetch(SB.url + path, { ...opt, headers: { apikey: SB.key, authorization: 'Bearer ' + await this.token(), ...(opt.headers || {}) } });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(/nts_items|PGRST205|Bucket not found/.test(t) ? 'Supabase\'de Nts tablosu yok (schema.sql çalıştırılmalı)' : `Sunucu ${r.status} ${t.slice(0, 120)}`);
    }
    return r;
  },
  schedule() { clearTimeout(this._t); this._t = setTimeout(() => this.run(), 1500); },
  async markDirty(ids) { const d = new Set((await DB.get('kv', 'sb-dirty')) || []); ids.forEach(x => d.add(x)); await DB.put('kv', [...d], 'sb-dirty'); },
  async pack(i) {
    if (!Crypt.key) return { data: i, enc: null };
    return { data: null, enc: b64enc(await Crypt.seal(new TextEncoder().encode(JSON.stringify(i)))) };
  },
  async unpack(row) { return row.data || JSON.parse(new TextDecoder().decode(await Crypt.open(b64dec(row.enc)))); },
  async pull() {
    const last = (await DB.get('kv', 'sb-since')) || '1970-01-01T00:00:00Z', all = [];
    let since = new Date(Math.max(0, Date.parse(last) - 120e3)).toISOString(); // small overlap: a slow write from another device isn't skipped
    for (;;) {
      const rows = await (await this.req(`/rest/v1/nts_items?select=data,enc,synced_at&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=500`)).json();
      for (const r of rows) all.push(await this.unpack(r));
      if (rows.length) since = rows.at(-1).synced_at;
      if (rows.length < 500) break;
    }
    const changed = GH.merge(all);
    if (changed.length) { await DB.putMany('items', changed); runSearch(); render(); AI.dot(); }
    await DB.put('kv', since, 'sb-since');
  },
  async push() {
    const dirty = new Set((await DB.get('kv', 'sb-dirty')) || []); if (!dirty.size) return false;
    const map = new Map(S.items.map(i => [i.id, i])), ids = [...dirty].filter(id => map.has(id));
    for (let k = 0; k < ids.length; k += 200) {
      const part = ids.slice(k, k + 200);
      const rows = await Promise.all(part.map(async id => { const i = map.get(id); return { user_id: this.s.user.id, id, updated_at: i.updatedAt || 0, ...(await this.pack(i)) }; }));
      await this.req('/rest/v1/nts_items?on_conflict=user_id,id', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
      // re-read: edits made while this was uploading must stay dirty
      const left = new Set((await DB.get('kv', 'sb-dirty')) || []); part.forEach(id => left.delete(id)); await DB.put('kv', [...left], 'sb-dirty');
    }
    const left = ((await DB.get('kv', 'sb-dirty')) || []).filter(id => map.has(id) || !dirty.has(id)); await DB.put('kv', left, 'sb-dirty');
    return ids.length > 0;
  },
  async uploadFiles() {
    let n = 0;
    for (const i of S.items.filter(i => i.type === 'file' && !i.sbPath && !i.deleted && !i.fileSkip)) {
      const rec = await DB.get('files', i.id); if (!rec) continue;
      const blob = await shrinkImage(rec.blob, i.mime);
      if (blob.size > 50e6) { await upsert([{ ...i, fileSkip: true }], { sync: false }); continue; }
      const path = `${this.s.user.id}/${monthOf(i.ts)}/${i.id}${Crypt.key ? '.enc' : ''}`;
      const body = Crypt.key ? await Crypt.seal(new Uint8Array(await blob.arrayBuffer())) : blob;
      await this.req('/storage/v1/object/nts-files/' + path, { method: 'POST', headers: { 'x-upsert': 'true', 'content-type': Crypt.key ? 'application/octet-stream' : (i.mime || 'application/octet-stream') }, body });
      await upsert([{ ...i, sbPath: path, fileSynced: true }], { sync: false }); n++;
    }
    return n;
  },
  async downloadFile(i) {
    const r = await this.req('/storage/v1/object/authenticated/nts-files/' + i.sbPath);
    return new Blob([await Crypt.open(new Uint8Array(await r.arrayBuffer()))], { type: i.mime || '' });
  },
  async run() {
    if (!this.on() || !navigator.onLine) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; GH.status('Senkronlanıyor…');
    try {
      await this.pull();
      if (await this.uploadFiles()) this.again = true;
      if (await this.push()) Live.ping();
      GH.status(`✓ ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · ${alive().length} kayıt`);
    } catch (e) { console.warn('cloud', e); GH.status('Hata: ' + e.message); }
    this.busy = false;
    if (this.again) { this.again = false; this.schedule(); }
  },
};
// Instant sync: every device of one account listens on a Supabase Realtime broadcast channel. After a device
// uploads, it says "changed" (no data, just a nudge) and the others pull right away. Polling stays as the fallback.
const Live = {
  ws: null, ref: 0, hb: null, retry: 0, stopped: true,
  topic() { return 'realtime:nts-' + Cloud.s.user.id; },
  send(topic, event, payload) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify({ topic, event, payload, ref: String(++this.ref), join_ref: '1' })); },
  start() {
    if (!Cloud.on() || this.ws || !('WebSocket' in window)) return;
    this.stopped = false;
    const ws = this.ws = new WebSocket(SB.url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + SB.key + '&vsn=1.0.0');
    ws.onopen = () => {
      this.retry = 0;
      this.send(this.topic(), 'phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, private: false } });
      clearInterval(this.hb); this.hb = setInterval(() => this.send('phoenix', 'heartbeat', {}), 25e3);
    };
    ws.onmessage = e => { try { const m = JSON.parse(e.data); if (m.event === 'broadcast' && m.payload?.event === 'changed') Cloud.schedule(); } catch { } };
    ws.onclose = () => {
      clearInterval(this.hb); if (this.ws === ws) this.ws = null;
      if (!this.stopped && Cloud.on()) setTimeout(() => this.start(), Math.min(30e3, 1e3 * 2 ** this.retry++));
    };
  },
  stop() { this.stopped = true; clearInterval(this.hb); const ws = this.ws; this.ws = null; try { ws?.close(); } catch { } },
  ping() { this.send(this.topic(), 'broadcast', { type: 'broadcast', event: 'changed', payload: {} }); },
};
// One front door: signed in → Supabase; else the old GitHub repo if set up.
const Sync = {
  ready() { return Cloud.on() || GH.ready(); },
  schedule() { Cloud.on() ? Cloud.schedule() : GH.schedule(); },
  run() { return Cloud.on() ? Cloud.run() : GH.run(); },
  async markDirty(list) { await GH.markDirty([...new Set(list.map(i => monthOf(i.ts)))]); await Cloud.markDirty(list.map(i => i.id)); },
  downloadFile(i) { return i.sbPath ? Cloud.downloadFile(i) : GH.downloadFile(i); },
};

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
// browser bookmarks (Chrome / Firefox / Safari "export bookmarks" = Netscape HTML): each link becomes an item, folder → topic
async function importBookmarks(file) {
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html');
  const have = new Set(S.items.filter(i => i.type === 'link' && !i.deleted).map(i => i.url.replace(/\/$/, '')));
  const skipFolder = /^(bookmarks bar|bookmarks toolbar|yer işareti çubuğu|yer imleri çubuğu|other bookmarks|diğer yer işaretleri|diğer yer imleri|mobile bookmarks|menu|bookmarks menu)$/i;
  const made = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    const url = a.getAttribute('href'); if (!/^https?:\/\//i.test(url) || have.has(url.replace(/\/$/, ''))) continue;
    have.add(url.replace(/\/$/, ''));
    // nearest folder name: <DT><H3>Folder</H3><DL> … <DT><A>
    let folder = ''; for (let el = a.closest('dl'); el && !folder; el = el.parentElement?.closest('dl')) { const h = el.previousElementSibling?.tagName === 'H3' ? el.previousElementSibling : el.parentElement?.querySelector(':scope > h3'); const t = h?.textContent.trim() || ''; if (t && !skipFolder.test(t)) folder = t; }
    const added = +a.getAttribute('add_date'), ts = added > 1e9 ? added * 1000 : now() - made.length;
    const tag = folder.toLocaleLowerCase('tr').replace(/\s+/g, '-').slice(0, 30);
    made.push({ id: newId(), type: 'link', url, text: '', title: a.textContent.trim() || undefined, ts, createdAt: now(), source: 'bookmarks', tags: tag ? [tag] : [], pending: false, seenAt: ts,
      meta: a.textContent.trim() ? { title: a.textContent.trim(), logo: a.getAttribute('icon') || undefined } : undefined });
  }
  if (!made.length) return toast('Yeni yer imi bulunamadı (hepsi zaten kayıtlı ya da dosya boş)', 3500);
  for (let k = 0; k < made.length; k += 500) await upsert(made.slice(k, k + 500));
  toast(`${made.length} yer imi içe aktarıldı`, 3500, 'check');
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
    const files = S.items.filter(i => i.type === 'file' && (i.fileSynced || i.sbPath)).map(i => ({ ...i, fileSynced: false, sbPath: null }));
    if (files.length) await upsert(files, { sync: false });
    await DB.put('kv', {}, 'shas'); await DB.put('kv', [...new Set(S.items.map(i => monthOf(i.ts)))], 'dirty');
    await DB.put('kv', S.items.map(i => i.id), 'sb-dirty');
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
  } else if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    // another localhost port (e.g. a dev server) has its own storage and no token: ask the bridge on this computer
    try {
      const c = await (await fetch('http://127.0.0.1:8787/config', { signal: AbortSignal.timeout(2500) })).json();
      if (c.token) { S.settings.bridgeToken = c.token; if (!S.settings.bridgeUrl || /^http:\/\/(localhost|127\.0\.0\.1):8787$/.test(S.settings.bridgeUrl)) S.settings.bridgeUrl = 'http://127.0.0.1:8787'; }
    } catch { }
    S.settings.bridgeUrl ||= 'http://127.0.0.1:8787';
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
const ACCENTS = [['orange', 'Turuncu', '#d9480f', '#ff9a4d'], ['indigo', 'Çivit', '#4f5fd6', '#8b9cff'], ['green', 'Yeşil', '#15803d', '#5fd68a'],
  ['blue', 'Mavi', '#0b6bcb', '#6cb6ff'], ['pink', 'Pembe', '#c2255c', '#ff85b0'], ['teal', 'Turkuaz', '#0f766e', '#4fd1c5']];
function setAccent(a) {
  const r = document.documentElement;
  if (a?.startsWith('#')) { r.dataset.accent = 'custom'; r.style.setProperty('--accent', a); r.style.setProperty('--accent-soft', `color-mix(in srgb, ${a} 14%, transparent)`); r.style.setProperty('--accent-text', contrastText(a)); }
  else { ['--accent', '--accent-soft', '--accent-text'].forEach(k => r.style.removeProperty(k)); if (a && a !== 'orange') r.dataset.accent = a; else delete r.dataset.accent; }
  try { localStorage.setItem('hn-accent', a || ''); } catch { }
}
const contrastText = hex => { const n = parseInt(hex.slice(1), 16), l = (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; return l > .6 ? '#0c0c0e' : '#fff'; };
const onPhone = () => /Android|iPhone|iPad/.test(navigator.userAgent);
const BRIDGE_CMD = 'systemctl --user start hizli-note-bridge';
// one plain sentence for "Claude is off", depending on the device
const claudeOff = () => onPhone() ? 'Bilgisayar kapalı ya da Tailscale bağlı değil.' : 'Claude köprüsü kapalı. Ayarlar → Claude → Köprüyü başlat.';
function claudeBlock() {
  const n = S.items.filter(i => i.pending && !i.deleted).length;
  if (S.bridgeOk) return `<div class="set-row static">${ic('cpu')}<span><span class="dot ok"></span>Claude bağlı<small>${n ? `${n} kayıt sırada, arka planda düzenleniyor` : 'Kayıtları düzenler, ? ile biten sorulara cevap verir'}</small></span></div>`;
  return `<div class="set-row static">${ic('cpu')}<span><span class="dot off"></span>Claude bağlı değil<small>${onPhone() ? 'Bilgisayar kapalı ya da Tailscale bağlı değil. Bilgisayar açılınca kendiliğinden bağlanır.' : 'Bilgisayardaki Nts köprüsü çalışmıyor.'}</small></span></div>
    ${onPhone() ? `<div class="row"><button class="btn secondary" data-do="test">${ic('cpu', 'sm')}Tekrar dene</button><span class="status" id="bridgeMsg"></span></div>`
    : `<div class="cmd"><code>${BRIDGE_CMD}</code><button class="btn secondary" data-do="copycmd">${ic('copy', 'sm')}Kopyala</button></div>
      <p class="hint">Köprüyü başlatmak için bunu terminale yapıştır. Sonra "Bağlan"a bas.</p>
      <div class="row"><button class="btn primary" data-do="test">${ic('cpu', 'sm')}Bağlan</button><span class="status" id="bridgeMsg"></span></div>`}`;
}
function openSettings(page = 'main') {
  const m = $('#menu'), st = S.settings, locked = !!Lock.conf;
  const head = (title, back) => `<div class="d-head">${back ? `<button class="icon-btn sm" data-do="back" title="Geri">${ic('chev', 'sm flip')}</button>` : ''}<span class="type">${title}</span><span class="sp"></span><button class="icon-btn sm" data-act="close" title="Kapat">${ic('x')}</button></div>`;
  const gBtn = `<button class="btn primary wide g-btn" data-do="signin"><svg class="i" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05" stroke="none"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" stroke="none"/></svg>Google ile giriş yap</button>`;
  const lockHtml = locked
    ? `<div class="set-row static">${ic('lock')}<span>Şifre açık<small>Açılışta sorulur, yedekler ve senkron şifreli. Unutursan açılamaz.</small></span></div>
       <button class="set-row" data-do="unlock-off">${ic('x')}<span>Şifreyi kaldır</span></button>`
    : `<details class="sub"><summary class="set-row">${ic('lock')}<span>Şifre koy<small>Uygulama açılırken sorar, yedekler şifreli saklanır</small></span></summary>
        <label class="set-field">Şifre<input id="set-pass" type="password" autocomplete="new-password" placeholder="en az 6 karakter"></label>
        <label class="set-field">Şifre tekrar<input id="set-pass2" type="password" autocomplete="new-password"></label>
        <div class="row"><button class="btn primary" data-do="lock-on">Şifre koy</button></div></details>`;
  const cur = document.documentElement.dataset.accent || 'orange', dark = document.documentElement.dataset.theme === 'dark';
  const main = `${head(`${ic('settings', 'sm')}Ayarlar`)}
    <div class="set-sec"><h4>Hesap</h4>
      ${Cloud.on() ? `<div class="set-row static">${ic('cloud')}<span>${esc(Cloud.email())}<small id="syncMsg">${esc(S.syncMsg || 'Telefon ve bilgisayar aynı kayıtları görür')}</small></span></div>
        <div class="row"><button class="btn secondary" data-do="sync">${ic('cloud', 'sm')}Şimdi senkronla</button><button class="btn danger" data-do="signout">Çıkış yap</button></div>`
      : `<p class="hint">Telefonda ve bilgisayarda aynı Google hesabıyla gir, kayıtlar ikisinde de görünsün.${locked ? ' Şifre açık olduğu için sunucuya şifreli gider.' : ''}</p>${gBtn}`}
      ${lockHtml}
    </div>
    <div class="set-sec"><h4>Görünüm</h4>
      <div class="set-line"><span>Tema</span><div class="seg sm"><button data-do="light" class="${dark ? '' : 'on'}">${ic('sun', 'sm')}Açık</button><button data-do="dark" class="${dark ? 'on' : ''}">${ic('moon', 'sm')}Koyu</button></div></div>
      <div class="set-line"><span>Ana renk</span><div class="swatches">${ACCENTS.map(([k, n, l, d]) => `<button class="sw${k === cur ? ' on' : ''}" data-accent="${k}" title="${n}" style="--c:${dark ? d : l}"></button>`).join('')}
        <label class="sw custom${cur === 'custom' ? ' on' : ''}" title="Özel renk" style="--c:${cur === 'custom' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)'}"><input type="color" id="accentPick" value="${(() => { try { const v = localStorage.getItem('hn-accent'); return v?.startsWith('#') ? v : '#e8590c'; } catch { return '#e8590c'; } })()}"></label></div></div>
      ${S.installEvt ? `<button class="set-row" data-do="install">${ic('install')}<span>Uygulamayı yükle<small>Ana ekrana ekle, Paylaş menüsünde çıksın</small></span></button>` : ''}
    </div>
    <div class="set-sec"><h4>Claude</h4>
      <div id="claudeBox">${claudeBlock()}</div>
      <details class="sub"><summary class="set-row">${ic('chev', 'sm')}<span>Elle ayarla</span></summary>
        <p class="hint">Telefonda bilgisayarın Tailscale adresini gir. Bilgisayarda kayıt göndermek için: <code>nts "not"</code>, <code>nts dosya.pdf</code>, <code>nts --clip</code>.</p>
        <label class="set-field">Köprü adresi<input id="set-bridgeUrl" value="${esc(st.bridgeUrl || '')}" placeholder="https://pc.xxx.ts.net:8788"></label>
        <label class="set-field">Köprü anahtarı<input id="set-bridgeToken" type="password" value="${esc(st.bridgeToken || '')}"></label>
      </details>
    </div>
    <div class="set-sec">
      <button class="set-row" data-do="tour">${ic('spark')}<span>Nasıl kullanılır?<small>6 adımlık kısa tur</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="lists">${ic('flag')}<span>Listeler<small>Claude'un doldurduğu listelerin adı ve görünürlüğü</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="move">${ic('upload')}<span>Kayıtları taşı<small>WhatsApp'tan içe aktar, yedek indir, yedekten geri yükle</small></span>${ic('chev', 'sm')}</button>
    </div>
    <details class="adv"><summary>${ic('chev', 'sm')}Gelişmiş</summary>
      <div class="set-sec">
        <button class="set-row" data-do="tags">${ic('hash')}<span>Konuları sadeleştir<small>Claude benzer konuları birleştirir</small></span></button>
        <button class="set-row" data-do="organize">${ic('spark')}<span>Bekleyenleri şimdi düzenle</span></button>
        <button class="set-row" data-do="linkprev">${ic('link')}<span>Link önizlemesi: ${st.noLinkPreview ? 'kapalı' : 'açık'}<small>Claude köprüsü kapalıyken link başlığı Nts'nin kendi servisinden gelir (giriş yaptıysan), yoksa microlink.io'dan (sadece link adresi gider)</small></span></button>
      </div>
      <div class="set-sec"><h4>Eski senkron: GitHub reposu</h4>
        <p class="hint">Kayıtlar senin private GitHub reponda yedeklenir.
          <a href="https://github.com/settings/personal-access-tokens/new?name=nts-sync&description=Nts%20sync&contents=write" target="_blank" rel="noopener">Anahtar oluştur</a> (sadece nts-data reposu, Contents: Read and write).</p>
        <label class="set-field">Repo<input id="set-ghRepo" value="${esc(st.ghRepo || '')}" placeholder="kullanici/nts-data"></label>
        <label class="set-field">GitHub anahtarı<input id="set-ghToken" type="password" value="${esc(st.ghToken || '')}" placeholder="github_pat_…"></label>
        ${Cloud.on() ? '<p class="hint">Google ile giriş yaptığın için bu kullanılmıyor.</p>' : `<div class="row"><button class="btn secondary" data-do="sync">${ic('cloud', 'sm')}Şimdi senkronla</button><span class="status" id="syncMsg">${esc(S.syncMsg || (GH.ready() ? '' : 'Kapalı'))}</span></div>`}
      </div>
    </details>`;
  const move = `${head('Kayıtları taşı', true)}
    <div class="set-sec">
      <button class="set-row" data-do="wa">${ic('chat')}<span>WhatsApp sohbetini içe aktar<small>WhatsApp'ta sohbet → ⋮ → Dışa aktar → Medya dahil. Çıkan dosyayı seç.</small></span></button>
      <button class="set-row" data-do="export">${ic('down')}<span>Yedek indir<small>Her şeyi tek dosya olarak indir${locked ? ' (şifreli)' : ''}</small></span></button>
      <button class="set-row" data-do="import">${ic('upload')}<span>Yedekten geri yükle</span></button>
      <button class="set-row" data-do="bookmarks">${ic('star')}<span>Tarayıcı yer imlerini içe aktar<small>Chrome/Firefox: Yer imleri → Dışa aktar (HTML). Klasörler konu olur, aynı link iki kez eklenmez.</small></span></button>
    </div>`;
  const listsPage = `${head('Listeler', true)}
    <p class="hint">Claude her kaydı uygun listeye koyar. Bir kaydı elle taşırsan Claude o kayda dokunmaz. Yapılacaklar her zaman açık.</p>
    <div class="set-sec">${LISTS.map(([k, icn, def]) => `<div class="set-line">${ic(icn)}<input class="list-name" data-lname="${k}" value="${esc(listName(k))}" placeholder="${def}" aria-label="${def} adı">
      <label class="switch" title="Sol çubukta göster"><input type="checkbox" data-lshow="${k}" ${listHidden(k) ? '' : 'checked'}><span></span></label></div>`).join('')}</div>`;
  const wasOpen = m.open;
  if (wasOpen) saveSettings(); // keep what was typed before redrawing
  m.innerHTML = `<div class="d-body" tabindex="-1">${page === 'move' ? move : page === 'lists' ? listsPage : main}</div>`;
  const setList = (k, ch) => { st.lists = { ...(st.lists || {}) }; st.lists[k] = { ...(st.lists[k] || {}), ...ch }; DB.put('kv', S.settings, 'settings'); render(); };
  const pick = m.querySelector('#accentPick'); if (pick) { pick.oninput = () => setAccent(pick.value); pick.onchange = () => openSettings(); }
  m.querySelectorAll('[data-lname]').forEach(el => el.onchange = () => setList(el.dataset.lname, { name: el.value.trim() || undefined }));
  m.querySelectorAll('[data-lshow]').forEach(el => el.onchange = () => setList(el.dataset.lshow, { hidden: !el.checked }));
  m.onclick = async e => {
    const d = e.target.closest('[data-do]')?.dataset.do, acc = e.target.closest('[data-accent]')?.dataset.accent;
    if (e.target === m || e.target.closest('[data-act="close"]')) return m.close();
    if (acc) { setAccent(acc); return openSettings(); }
    if (!d) return;
    if (d === 'wa') $('#waInput').click();
    else if (d === 'move') openSettings('move');
    else if (d === 'lists') openSettings('lists');
    else if (d === 'tour') { m.close(); setTimeout(() => Tour.start(), 250); }
    else if (d === 'back') openSettings();
    else if (d === 'import') $('#backupInput').click();
    else if (d === 'bookmarks') $('#bmInput').click();
    else if (d === 'export') { m.close(); exportBackup(); }
    else if (d === 'organize') { m.close(); if (await AI.health()) { AI.process(); toast('Claude düzenliyor', 2000, 'spark'); } else toast(claudeOff(), 3000, 'cpu'); }
    else if (d === 'tags') { m.close(); AI.cleanTags(); }
    else if (d === 'light' || d === 'dark') { setTheme(d); openSettings(); }
    else if (d === 'install') { S.installEvt.prompt(); S.installEvt = null; }
    else if (d === 'copycmd') { try { await navigator.clipboard.writeText(BRIDGE_CMD); toast('Kopyalandı. Terminale yapıştır.', 2200, 'check'); } catch { toast(BRIDGE_CMD, 5000); } }
    else if (d === 'test') {
      await saveSettings(); const msg = $('#bridgeMsg'); if (msg) msg.textContent = 'Bağlanıyor…';
      const ok = await AI.health();
      if (ok) $('#claudeBox').innerHTML = claudeBlock(); else if ($('#bridgeMsg')) $('#bridgeMsg').textContent = onPhone() ? 'Ulaşılamadı. Bilgisayar açık ve Tailscale bağlı mı?' : 'Hâlâ kapalı. Komutu çalıştırdın mı?';
    }
    else if (d === 'sync') { await saveSettings(); Sync.run(); }
    else if (d === 'linkprev') { st.noLinkPreview = !st.noLinkPreview; await DB.put('kv', S.settings, 'settings'); openSettings(); if (!st.noLinkPreview) LinkMeta.run(); }
    else if (d === 'signin') { await saveSettings(); Cloud.signIn(); }
    else if (d === 'signout') { await Cloud.signOut(); toast('Çıkış yapıldı. Kayıtlar bu cihazda duruyor.', 3000); openSettings(); }
    else if (d === 'lock-on') {
      const p = $('#set-pass').value, p2 = $('#set-pass2').value;
      if (p.length < 6) return toast('Şifre en az 6 karakter olmalı');
      if (p !== p2) return toast('Şifreler aynı değil');
      await Lock.enable(p); toast('Şifre kondu', 2500, 'check'); openSettings();
    } else if (d === 'unlock-off') { await Lock.disable(); toast('Şifre kaldırıldı'); openSettings(); }
  };
  m.onclose = async () => { await saveSettings(); AI.health(); Sync.schedule(); };
  if (!wasOpen) Back.open(m);
}

// ---------- wiring ----------
function wire() {
  for (const [id, icn] of [['#askBtn', 'spark'], ['#saveBtn', 'up'], ['#clipIco', 'plus'], ['#setIco', 'settings']]) $(id).innerHTML = ic(icn, 'sm');

  $('#saveBtn').onclick = () => { const v = $('#input').value; isQuestion(v) && !S.attach.length ? AI.ask(v) : save(); };
  const inp = $('#input');
  // one box: typing filters the list live, Enter saves, a question (ends with ?) goes to Claude
  let st;
  inp.addEventListener('input', () => {
    autoGrow(); clearTimeout(st); S.hitSel = -1;
    st = setTimeout(() => { S.q = inp.value.length < 200 ? inp.value : ''; S.limit = 300; runSearch(); render(); }, 80);
  });
  inp.addEventListener('keydown', e => {
    const rows = $('#hits').classList.contains('hits') && !$('#hits').hidden ? [...$('#hits').querySelectorAll('.h-row')] : [];
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
      e.preventDefault();
      S.hitSel = Math.max(-1, Math.min(rows.length - 1, (S.hitSel ?? -1) + (e.key === 'ArrowDown' ? 1 : -1)));
      renderHits(); $('#hits .h-row.sel')?.scrollIntoView({ block: 'nearest' }); return;
    }
    if (e.key === 'Enter' && !e.shiftKey && S.hitSel >= 0 && rows[S.hitSel]) { e.preventDefault(); const id = rows[S.hitSel].dataset.open; S.hitSel = -1; openItem(id); return; }
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
    if (e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.key === '/' || (e.key === 'n' && S.view !== 'board')) { e.preventDefault(); inp.focus(); }
    else if (S.view === 'board' && e.shiftKey && e.code === 'Digit1') Board.fit();
    else if (S.view === 'board' && e.shiftKey && e.code === 'Digit0') Board.zoomTo(1);
  });
  // drops from outside the page (files, text from another app) go into the box; a drag that starts inside the page
  // (a thumbnail, selected text) is not a new item: images don't drag at all, anything else keeps the browser's own behaviour
  const comp = $('#composer'); let dragN = 0, inner = false;
  addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') return e.preventDefault(); inner = true; });
  addEventListener('dragend', () => { inner = false; });
  addEventListener('dragenter', e => { if (!inner && e.dataTransfer?.types?.includes('Files')) { dragN++; comp.classList.add('drag'); } });
  addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; comp.classList.remove('drag'); } });
  addEventListener('dragover', e => { if (!inner) e.preventDefault(); });
  addEventListener('drop', e => {
    dragN = 0; comp.classList.remove('drag');
    if (inner) { inner = false; return; }
    e.preventDefault();
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
  $('#hits').onclick = e => {
    if (e.target.closest('[data-clear]')) return clearBox();
    if (e.target.closest('[data-all]')) { S.searchOn = true; S.cam = null; return render(); }
    const o = e.target.closest('[data-open]'); if (o) openItem(o.dataset.open);
  };

  const onFilter = e => {
    const b = e.target.closest('button'); if (!b) return; const f = S.filter;
    if (b.dataset.view) { setView(b.dataset.view); return; }
    if ('tags' in b.dataset) { Pop.toggle(b); return; }
    if ('vault' in b.dataset) { Pop.close(); Vault.open(); return; }
    if ('todo' in b.dataset) { Pop.close(); setView(S.view === 'todo' ? S.prevView || 'list' : 'todo'); scrollTo(0, 0); return; }
    const leaveTodo = () => { if (S.view === 'todo') { S.view = S.prevView || 'list'; S.cam = null; } };
    if (b.dataset.type) { f.type = b.dataset.type; f.star = false; f.list = null; if (b.dataset.type === 'all') f.tag = null; leaveTodo(); }
    else if ('star' in b.dataset) { f.star = !f.star; f.list = null; leaveTodo(); }
    else if (b.dataset.list) { f.list = f.list === b.dataset.list ? null : b.dataset.list; f.type = 'all'; f.star = false; leaveTodo(); }
    else if (b.dataset.tag) f.tag = f.tag === b.dataset.tag ? null : b.dataset.tag;
    else if ('alltags' in b.dataset) { S.allTags = !S.allTags; return render(); }
    else if (b.dataset.color) f.color = f.color === b.dataset.color ? null : b.dataset.color;
    else if ('sortprio' in b.dataset) { S.sortPrio = !S.sortPrio; try { localStorage.setItem('hn-sortprio', S.sortPrio ? '1' : ''); } catch { } }
    else return;
    S.limit = 300; S.cam = null; Pop.close(); render(); scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const id of ['#viewSwitch', '#rail', '#popTypes', '#sideTags', '#sideProjects', '#sideMarks']) $(id).onclick = onFilter;
  try { S.sortPrio = !!localStorage.getItem('hn-sortprio'); } catch { }
  Ctx.init(); Peek.init();
  Todo.init();
  Pop.init();
  for (const id of ['#list', '#gallery', '#topics', '#empty']) $(id).addEventListener('click', e => {
    const a = e.target.closest('.act'); if (a) { e.stopPropagation(); return itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); }
    const dd = e.target.closest('[data-do]'); if (dd) { if (dd.dataset.do === 'wa') $('#waInput').click(); else openSettings(); return; }
    const th = e.target.closest('.topic-head');
    if (th) { const t = th.dataset.tag; S.filter.tag = t === '(etiketsiz)' ? null : t; setView('list'); scrollTo(0, 0); return; }
    const it = e.target.closest('[data-id]'); if (it) openItem(it.dataset.id);
  });

  $('#settingsBtn').onclick = openSettings;
  $('#waInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importWhatsApp(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#bmInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importBookmarks(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#backupInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importBackup(f).catch(err => toast('Hata: ' + err.message)); } };

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
  addEventListener('appinstalled', () => toast('Yüklendi. Artık Paylaş menüsünde var.', 3000, 'check'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!Lock.conf || Crypt.key)) { reloadFromDB(); AI.health(); Sync.schedule(); Live.start(); } });
  addEventListener('online', () => { Sync.schedule(); Live.start(); });
  Board.init(); Back.init();
}
function setView(v) {
  if (v === 'todo' && S.view !== 'todo') S.prevView = S.view;
  S.view = v; S.cam = null; try { localStorage.setItem('hn-view', v); } catch { }
  render();
}
async function reloadFromDB() {
  const items = await DB.all('items');
  if (items.length === S.items.length && items.every(i => S.idx.has(i.id))) return;
  S.items = items; S.idx.clear(); items.forEach(indexItem); runSearch(); render(); AI.kick(); Sync.schedule();
}

(async function main() {
  setTheme(document.documentElement.dataset.theme);
  try { const a = localStorage.getItem('hn-accent'); if (a?.startsWith('#')) setAccent(a); } catch { }
  try { const v = localStorage.getItem('hn-view'); if (['list', 'board', 'gallery', 'todo'].includes(v)) S.view = v; } catch { }
  await loadSettings();
  const hp = new URLSearchParams(location.hash.slice(1)); // one-tap setup: #bridge=<token>&url=<bridgeUrl>
  if (hp.get('bridge')) {
    S.settings.bridgeToken = hp.get('bridge'); if (hp.get('url')) S.settings.bridgeUrl = hp.get('url');
    await DB.put('kv', S.settings, 'settings'); history.replaceState(null, '', location.pathname);
    setTimeout(() => toast('Claude köprüsü ayarlandı', 2500, 'check'), 500);
  }
  await Cloud.load();
  if (await Lock.load()) await Lock.show();
  Lock.watch();
  S.items = await DB.all('items'); S.items.forEach(indexItem);
  wire(); render();
  // back from Google: draw first, then trade the ?code for a session (never a blank screen while it waits)
  Cloud.finish().then(() => { if (Cloud.on()) { render(); Sync.run(); Live.start(); } });
  if (new URLSearchParams(location.search).has('shared')) { toast('Kaydedildi', 2000, 'check'); history.replaceState(null, '', location.pathname); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  AI.health(); setInterval(() => { if (!document.hidden) AI.health(); }, 20000);
  setTimeout(() => LinkMeta.run(), 4000); setInterval(() => { if (!document.hidden) LinkMeta.run(); }, 5 * 60e3);
  Sync.run(); Live.start(); let tick = 0; setInterval(() => { if (!document.hidden && (Cloud.on() || ++tick % 4 === 0)) Sync.schedule(); }, 30000);
  Tour.maybe(); setTimeout(weeklyUnseen, 6000);
  if (S.items.some(i => fileKind(i) === 'pdf')) (window.requestIdleCallback || setTimeout)(() => Prev.pdfLib());
})();
