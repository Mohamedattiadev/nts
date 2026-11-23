'use strict';
/* Nts — app. Depends on db.js (DB, newId, itemsFromInput, saveItems, URL_RE) and vendor/jszip. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = s => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const now = () => Date.now();

const S = {
  items: [], idx: new Map(), view: 'board', q: '', hits: null,
  filter: { type: 'all', tag: null, star: false, list: null, color: null, src: null }, sortPrio: false, tool: 'select', ink: 'ink', attach: [], hitSel: -1,
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
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
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
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
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
// Intl formatters are slow to build: make them once, and remember day labels (thousands of rows ask for the same few days)
const F_TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }), F_SD = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }), F_SDY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
const memoDay = fn => { const m = new Map(); let today = ''; return key => { const t = dayKey(now()); if (t !== today) { m.clear(); today = t; } let v = m.get(key); if (v === undefined) { v = fn(key); m.set(key, v); } return v; }; };
const shortDay = memoDay(key => { const t = fmtDay(key); if (t === 'Bugün' || t === 'Dün') return t; const [y, m, d] = key.split('-').map(Number); return (y !== new Date().getFullYear() ? F_SDY : F_SD).format(new Date(y, m - 1, d)); });
const fmtTime = ts => F_TIME.format(ts);
const fmtDay = memoDay(fmtDay0);
const fmtDay0d = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }); }; // 92: the date behind "Bugün" / "Dün"
function fmtDay0(key) {
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
  if (m.startsWith('text') || /\.(txt|md|markdown|csv|tsv|json|log|toc|ini|conf|cfg|env|sh|bash|zsh|fish|js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|swift|sql|html|htm|css|scss|xml|yml|yaml|toml|tex|ltx|bbl|lof|lot|aux|bib|sty|cls|srt|vtt)$/.test(n)) return 'text';
  return 'file';
}
const KIND_LABEL = { link: 'Link', note: 'Not', image: 'Resim', video: 'Video', audio: 'Ses', pdf: 'PDF', text: 'Metin', file: 'Dosya' };
const extOf = i => ((i.fileName || '').split('.').pop() || '').slice(0, 4).toUpperCase();
function titleOf(i) {
  if (i.conv) return i.title || `${shortDay(dayKey(i.ts))} · ${i.conv.n} mesaj`; // a conversation: Claude's title, else date + count
  if (i.type === 'note' && i.text && !i.userTitle) return i.text.split('\n')[0].slice(0, 140); // the user's own words come first
  if (i.title) return i.title;
  if (i.type === 'link') { if (i.meta?.title) return i.meta.title; try { const u = new URL(i.url); return domain(i.url) + decodeURI(u.pathname).replace(/\/$/, ''); } catch { return i.url; } }
  if (i.type === 'file') return i.fileName;
  return (i.text || '').split('\n')[0].slice(0, 140);
}
function subOf(i) {
  if (i.conv) return i.summary || `${i.conv.who.join(', ')} · ${i.conv.log.find(l => l.text)?.text || ''}`;
  if (i.type === 'link') return i.text || i.summary || i.meta?.description || '';
  if (i.type === 'file') return i.text || i.summary || '';
  const t = i.text || '';
  if (i.userTitle) return t;
  return t.includes('\n') ? t.slice(t.indexOf('\n') + 1) : '';
}
const HIDDEN = new Set(['draw', 'vault', 'bridge', 'ghlink', 'boards', 'summaries', 'saved']); // drawings live only on the board; the vault is its own place; 'bridge' is the phone's Claude address
const alive = () => S.items.filter(i => !i.deleted && !HIDDEN.has(i.type));
// lookups rebuilt only when the item list changes (S.items is always replaced, never mutated in place)
let _bm, _bmOf;
const byId = id => { if (_bmOf !== S.items) { _bm = new Map(S.items.map(i => [i.id, i])); _bmOf = S.items; } return _bm.get(id); };
let _rel, _relOf;
function relIndex() {
  if (_relOf === S.items) return _rel;
  const groups = new Map(), links = new Map(), add = (a, b) => { if (a === b) return; (links.get(a) || links.set(a, new Set()).get(a)).add(b); (links.get(b) || links.set(b, new Set()).get(b)).add(a); };
  for (const i of S.items) {
    if (i.deleted) continue;
    if (i.group) (groups.get(i.group) || groups.set(i.group, []).get(i.group)).push(i.id);
    for (const r of [...(i.related || []), ...(i.links || []), ...(i.explain?.related || [])]) add(i.id, r);
  }
  _rel = { groups, links }; _relOf = S.items; return _rel;
}
function relatedOf(i) {
  const { groups, links } = relIndex(), ids = new Set([...(i.group ? groups.get(i.group) || [] : []), ...(links.get(i.id) || [])]); ids.delete(i.id);
  return [...ids].map(byId).filter(x => x && !x.deleted);
}

// ---------- search ----------
const rawText = i => [i.title, i.meta?.title, i.meta?.description, i.meta?.site, i.text, i.url, i.url && domain(i.url),
  i.fileName, i.content, i.ocr, i.summary, (i.tags || []).join(' '), i.todo?.text, i.project, i.chat, (i.highlights || []).map(h => h.text).join(' ')].filter(Boolean).join(' ');
const idxEntry = h => ({ h, w: [...new Set(h.split(/[^a-z0-9]+/).filter(Boolean))] });
function indexItem(i) {
  if (HIDDEN.has(i.type) && i.type !== 'draw') return; // never searchable
  S.idx.set(i.id, idxEntry(norm(rawText(i))));
}
// the search index for big batches is built in a Web Worker, so the page never freezes; search indexes on demand meanwhile
const Indexer = {
  w: null,
  worker() {
    if (this.w !== null) return this.w;
    try {
      const src = `const norm = ${norm.toString()}; onmessage = e => postMessage(e.data.map(([id, t]) => { const h = norm(t); return [id, h, [...new Set(h.split(/[^a-z0-9]+/).filter(Boolean))]]; }));`;
      this.w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      this.w.onmessage = e => { for (const [id, h, w] of e.data) if (!S.idx.has(id)) S.idx.set(id, { h, w }); };
    } catch { this.w = false; }
    return this.w;
  },
  add(items) { const w = this.worker(), list = items.filter(i => i.type !== 'vault' && i.type !== 'bridge'); if (!w) return list.forEach(indexItem); w.postMessage(list.map(i => [i.id, rawText(i)])); },
};
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
  let x = S.idx.get(i.id); if (!x) { indexItem(i); x = S.idx.get(i.id); if (!x) return 0; } // not indexed yet (worker busy): do it now
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
// several boards: "Genel" (main) and project boards; a card has its own place on each board
const onMain = () => !S.board || S.board === 'main';
const posOf = i => onMain() ? i.pos : i.posBy?.[S.board];
const setPos = (i, p) => { const t = Date.now(); if (onMain()) { i.pos = p; i.posAt = t; } else { i.posBy = { ...(i.posBy || {}), [S.board]: p }; i.posByAt = { ...(i.posByAt || {}), [S.board]: t }; } };
// 109b: a card's place has its own time, so an edit made elsewhere with an older place never moves the card back
function keepPos(m, l, r) {
  const la = l.posAt || 0, ra = r.posAt || 0;
  if (la !== ra) { const w = la > ra ? l : r; if (w.pos) m.pos = w.pos; else delete m.pos; m.posAt = w.posAt; }
  const ks = new Set([...Object.keys(l.posByAt || {}), ...Object.keys(r.posByAt || {})]);
  if (ks.size) {
    const pb = { ...(m.posBy || {}) }, pa = { ...(m.posByAt || {}) };
    for (const k of ks) { const x = l.posByAt?.[k] || 0, y = r.posByAt?.[k] || 0; if (x === y) continue; const w = x > y ? l : r; if (w.posBy?.[k]) pb[k] = w.posBy[k]; else delete pb[k]; pa[k] = Math.max(x, y); }
    m.posBy = pb; m.posByAt = pa;
  }
  return m;
}
const onBoard = i => onMain() ? true : i.project === S.board || (i.boards || []).includes(S.board) || !!posOf(i);
const boardNames = () => { const b = byId('boards'), own = b && !b.deleted ? b.names || [] : []; const proj = [...new Set(S.items.filter(i => i.project && !i.deleted).map(i => i.project))]; return [...new Set([...proj, ...own])].sort((a, b) => a.localeCompare(b, 'tr')); };
// board time range: 'week' | '30' (default) | 'month' | 'y2024' … | 'all'
const RANGES = () => { const ys = [...new Set(S.items.filter(i => !i.deleted).map(i => new Date(i.ts).getFullYear()))].sort((a, b) => b - a);
  return [['week', 'Bu hafta'], ['30', 'Son 30 gün'], ['month', 'Bu ay'], ...ys.map(y => ['y' + y, String(y)]), ['all', 'Tümü']]; };
function rangeStart(r = S.boardRange || '30') {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === 'week') { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d.getTime(), Infinity]; }
  if (r === 'month') { d.setDate(1); return [d.getTime(), Infinity]; }
  if (r === '30') return [now() - 30 * 864e5, Infinity];
  if (r[0] === 'y') { const y = +r.slice(1); return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()]; }
  return [-Infinity, Infinity];
}
let _rs; const inRange = ts => { const [a, b] = _rs || (_rs = rangeStart()); return ts >= a && ts < b; };
const rangeLabel = () => (RANGES().find(r => r[0] === (S.boardRange || '30')) || [0, 'Son 30 gün'])[1];
let _vis = {};
function visible(keepAll = false) { // same list, same filter → same answer (render runs often)
  const f = S.filter, key = [S.items, JSON.stringify(f), S.sortPrio, keepAll || S.searchOn, keepAll || S.hits, S.view, S.boardRange, S.board].map(String).join('|') + (keepAll ? 'k' : '');
  if (_vis.items === S.items && _vis.hits === S.hits && _vis.key === key) return _vis.out;
  const out = visible0(keepAll); _vis = { items: S.items, hits: S.hits, key, out }; return out;
}
function visible0(keepAll) {
  const f = S.filter;
  return S.items.filter(i => !i.deleted
    && (f.type === 'all' || groupOf(i) === f.type)
    && (!f.tag || (i.tags || []).includes(f.tag))
    && (!f.star || i.starred)
    && (!f.list || inList(i, f.list))
    && (!f.color || i.color === f.color)
    && (!f.src || srcMatch(i, f.src))
    && !HIDDEN.has(i.type)
    && (keepAll || !S.searchOn || !S.hits || S.hits.has(i.id))
    // photos inside a conversation: in the gallery and in search results, not as their own rows/cards
    && (!i.parent || ((S.view === 'gallery' || (S.searchOn && S.hits?.has(i.id))) && !byId(i.parent)?.deleted))
    // imported archives (WhatsApp, bookmarks) don't fill the board; a card you put there or moved stays
    && (S.view !== 'board' || onBoard(i))
    && (S.view !== 'board' || !onMain() || !i.archive || i.pos || i.onBoard)
    // the main board is a workspace: the chosen time range, plus whatever you put or moved there (a project board shows all of its cards)
    && (S.view !== 'board' || !onMain() || i.pos || i.onBoard || i.sticky || inRange(i.ts))
  ).sort((a, b) => (S.sortPrio ? prioRank(a) - prioRank(b) : 0) || b.ts - a.ts);
}
const prioRank = i => i.prio === 'high' ? 0 : i.prio === 'low' ? 2 : 1;

// ---------- files + previews ----------
async function blobFor(i) {
  if (S.urls.has(i.id)) return S.urls.get(i.id);
  let rec = await DB.get('files', i.id);
  if (!rec && i.ghPath && Repo.on()) { try { const blob = await Repo.get(i.ghRepo, i.ghPath, i.mime || ''); rec = { id: i.id, blob }; await DB.put('files', rec); } catch (e) { console.warn('repo get', e.message); } }
  if (!rec && !i.ghPath && (i.sbPath ? Cloud.on() : i.fileSynced && GH.ready())) {
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
  // small previews (~320 px webp, 10-20 KB) for gallery and board: made once on this device and kept (files store, id:t),
  // uploaded next to the file (thumbs/); another device downloads only these until an item is opened (Cache Storage)
  async thumb(i) { // url of a small image for any item, or null
    if (i.cover && byId(i.cover)) return this.thumb(byId(i.cover)); // a conversation shows its first photo
    if (this.thumbs.has(i.id)) return this.thumbs.get(i.id);
    if (i.type === 'link') { const u = i.meta?.image || null; this.thumbs.set(i.id, u); return u; }
    const blob = await this.thumbBlob(i), url = blob ? URL.createObjectURL(blob) : null;
    this.thumbs.set(i.id, url); return url;
  },
  async thumbBlob(i, make = true) {
    const k = fileKind(i); if (!['image', 'pdf', 'video'].includes(k)) return null;
    const cached = await DB.get('files', i.id + ':t'); if (cached) return cached.blob;
    if (!(await DB.get('files', i.id))) { // the file isn't on this device: the small preview from the cloud
      const remote = await this.remoteThumb(i); if (remote) return remote;
      if (k !== 'image') return null;
    }
    if (!make) return null;
    try {
      let c = null;
      if (k === 'pdf') { const doc = await this.pdfDoc(i); if (doc) { c = await this.renderPage(doc, 1, 480); doc.destroy(); } }
      else if (k === 'video') c = await this.videoFrame(i);
      else { const u = await blobFor(i); if (!u) return null; const bmp = await createImageBitmap(await (await fetch(u)).blob()), r = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
        c = new OffscreenCanvas(Math.round(bmp.width * r), Math.round(bmp.height * r)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); }
      if (!c) return null;
      const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/webp', quality: .72 }) : await new Promise(r => c.toBlob(r, 'image/webp', .72));
      await DB.put('files', { id: i.id + ':t', blob }); return blob;
    } catch (e) { console.warn('thumb', e); return null; }
  },
  async remoteThumb(i) {
    if (!(i.ghThumb && Repo.on()) && !(i.sbThumb && Cloud.on())) return null;
    try {
      const cache = await caches.open('nts-thumbs'), key = '/t/' + i.id, hit = await cache.match(key);
      if (hit) return await hit.blob();
      const blob = i.ghThumb && Repo.on() ? await Repo.get(i.ghRepo, i.ghThumb, 'image/webp')
        : new Blob([await Crypt.open(new Uint8Array(await (await Cloud.req('/storage/v1/object/authenticated/nts-files/' + i.sbThumb)).arrayBuffer()))], { type: 'image/webp' });
      await cache.put(key, new Response(blob)); return blob;
    } catch { return null; }
  },
};
// YouTube links play right in the panel (no-cookie embed)
const ytId = i => { if (i.type !== 'link') return null; try { const u = new URL(i.url), h = u.hostname.replace(/^www\.|^m\./, '');
  const id = h === 'youtu.be' ? u.pathname.slice(1) : h === 'youtube.com' ? (u.searchParams.get('v') || (u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/) || [])[2]) : null;
  return /^[\w-]{6,20}$/.test(id || '') ? id : null; } catch { return null; } };
const hasVisual = i => ['image', 'pdf', 'video'].includes(fileKind(i)) || (i.type === 'link' && i.meta?.image) || !!(i.cover && byId(i.cover));
const thumbIO = new IntersectionObserver(es => es.forEach(async e => {
  if (!e.isIntersecting) return;
  thumbIO.unobserve(e.target);
  const i = byId(e.target.dataset.tid); if (!i) return;
  e.target.classList.add('loading'); // 94d: skeleton shimmer while the thumbnail is made/fetched
  const u = await Prev.thumb(i).catch(() => null); if (!u) return e.target.classList.remove('loading');
  const img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
  img.onerror = () => img.remove(); img.src = u;
  (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; })) // 94d: decoded first, then one soft fade (no half-painted image)
    .then(() => { e.target.appendChild(img); requestAnimationFrame(() => img.classList.add('ok')); }, () => img.remove()).finally(() => e.target.classList.remove('loading'));
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
    ${Read.readable(i) && (i.type !== 'link' || i.read) ? `<button class="act" data-a="read" title="Okuma sayfasında aç">${ic('book', 'sm')}Oku</button>` : ''}
    <button class="act ai" data-a="explain" title="${aiName()} anlatsın">${ic('spark', 'sm')}Anlat</button>
    <button class="act" data-a="copy" title="Kopyala">${ic('copy', 'sm')}</button>
    <button class="act" data-a="star" title="Yıldızla">${ic('star', 'sm' + (i.starred ? ' fill star-on' : ''))}</button>
    ${i.type === 'link' ? `<button class="act" data-a="open" title="Linki aç">${ic('ext', 'sm')}</button>` : ''}
    ${i.type === 'file' ? `<button class="act" data-a="download" title="İndir">${ic('down', 'sm')}</button>` : ''}
  </div>`;
}
// 114: a tag is a small coloured chip with a fitting icon; the colour comes from the tag's name, so one tag looks the same everywhere
const TAG_ICONS = [[/kod|code|yaz[ıi]l[ıi]m|dev|program|github|cpu/, 'cpu'], [/yapay ?zek|ai\b|claude|gpt|llm|model/, 'spark'], [/kitap|book|okuma|oku|makale/, 'book'],
  [/video|youtube|film|dizi/, 'video'], [/m[üu]zik|music|şark|podcast/, 'audio'], [/aile|^ev$|anne|baba|family|ki[şs]isel/, 'heart'], [/^i[şs]$|proje|work|toplant|müşteri/, 'folder'],
  [/foto|resim|image|tasar[ıi]m|design/, 'image'], [/g[öo]rev|todo|yap[ıi]lacak/, 'todo'], [/link|site|web/, 'link'], [/fikir|idea/, 'spark'], [/ders|okul|[üu]niversite|tez|doktora/, 'book']];
const TAG_COLS = ['blue', 'purple', 'green', 'orange', 'red', 'yellow'];
function tagChip(t) {
  const k = t.toLocaleLowerCase('tr'), icn = (TAG_ICONS.find(([re]) => re.test(k)) || [, 'hash'])[1];
  let h = 0; for (const ch of k) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `<span class="tg" style="--tc:var(--c-${TAG_COLS[h % TAG_COLS.length]})" dir="auto">${ic(icn, 'sm')}${esc(t)}</span>`;
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
    ${(i.tags || []).slice(0, tags).map(tagChip).join('')}
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

function renderList(items, append = false) {
  const el = $('#list'), from = S.listFrom ? items.findIndex(i => i.ts <= S.listFrom) : 0, start = Math.max(0, from);
  const shown = items.slice(start, start + S.limit), counts = {};
  items.forEach(i => { const k = dayKey(i.ts); counts[k] = (counts[k] || 0) + 1; }); // counts over the whole filtered list
  const rows = (list, lastDay, lastGroup) => {
    let html = '', open = false;
    for (const i of list) {
      const dk = dayKey(i.ts);
      if (dk !== lastDay) { if (open) html += '</div>'; open = false; html += `<div class="day">${fmtDay(dk)}<span class="cnt">${counts[dk]}</span>${Summ.day(dk) ? `<span class="d-sum" title="${aiOf()} özeti">${esc(Summ.day(dk))}</span>` : ''}</div>`; lastDay = dk; lastGroup = null; }
      if (i.group !== lastGroup || !open) { if (open) html += '</div>'; html += '<div class="group">'; open = true; lastGroup = i.group; }
      html += itemRow(i);
    }
    return html + (open ? '</div>' : '');
  };
  const more = () => start + S.limit < items.length ? `<div id="more" class="empty" style="padding:24px">Yükleniyor…</div>` : '';
  if (append && el._shown && el._items === items && el._start === start) { // only the new rows: the ones already on screen stay
    const add = shown.slice(el._shown), prev = shown[el._shown - 1];
    $('#more')?.remove(); el.insertAdjacentHTML('beforeend', rows(add, prev ? dayKey(prev.ts) : '', null) + more());
  } else {
    const head = S.listFrom ? `<div class="l-from">${ic('clock', 'sm')}<span>${fromLabel(S.listFrom)} ve öncesi</span><button class="link-btn" data-lnow>En yeniye dön</button></div>` : '';
    el.innerHTML = topBtns() + head + otdHtml() + rows(shown, '', null) + more();
  }
  el._shown = shown.length; el._items = items; el._start = start;
  hookThumbs(el);
  const m = $('#more');
  if (m) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); S.limit += 300; render(); } }, { rootMargin: '600px' }).observe(m);
}
const topBtns = (cls = '') => `<div class="l-top ${cls}">${Saved.active() ? `<button class="l-jump" data-lpin title="Bu aramayı/filtreyi sol çubuğa sabitle">${ic('pin', 'sm')}<span>Sabitle</span></button>` : ''}<button class="l-jump" data-ljump title="Tarihe git">${ic('clock', 'sm')}<span>Tarihe git</span></button></div>`;
// "Tarihe git": every month that has items, newest first, with counts; picking one shows the list from there
function monthJump(anchor) {
  const by = new Map(); visible().forEach(i => { const k = dayKey(i.ts).slice(0, 7); by.set(k, (by.get(k) || 0) + 1); });
  const years = new Map(); [...by].forEach(([k, n]) => { const y = k.slice(0, 4); (years.get(y) || years.set(y, []).get(y)).push([k, n]); });
  let p = $('#jumpPop'); if (!p) { p = document.createElement('div'); p.id = 'jumpPop'; p.className = 'pop jump-pop'; p.hidden = true; document.body.appendChild(p);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') p.hidden = true; });
    p.addEventListener('click', e => {
      const hy = e.target.closest('[data-hyear]'); if (hy) { Heat.year = +hy.dataset.hyear; return monthJump(p._anchor); }
      const hd = e.target.closest('[data-hday]'); if (hd) { p.hidden = true; return showFrom(dayEnd(hd.dataset.hday)); }
      const b = e.target.closest('[data-month]'); if (!b) return; const [y, m] = b.dataset.month.split('-').map(Number); S.listFrom = new Date(y, m, 1).getTime() - 1; S.limit = 300; p.hidden = true; render(); scrollTo(0, 0); });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#jumpPop,[data-ljump]')) p.hidden = true; }); }
  const M = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  p._anchor = anchor;
  p.innerHTML = Heat.html(visible()) + [...years].map(([y, ms]) => `<div class="side-label">${y}</div><div class="jm">${M.map((l, n) => { const k = `${y}-${String(n + 1).padStart(2, '0')}`, c = by.get(k); return `<button class="jm-b${c ? '' : ' none'}" ${c ? `data-month="${k}"` : 'disabled'} title="${c ? c + ' kayıt' : ''}">${l}${c ? `<small>${c}</small>` : ''}</button>`; }).join('')}</div>`).join('') || '<p class="hint">Kayıt yok.</p>';
  p.hidden = false; const hs = p.querySelector('.heat-scroll'); if (hs) hs.scrollLeft = Heat.year === new Date().getFullYear() ? hs.scrollWidth : 0;
  const r = anchor.getBoundingClientRect(); p.style.top = r.bottom + 6 + 'px'; p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.right - p.offsetWidth)) + 'px';
}
function renderGallery(items) { // month headers stick to the top while scrolling; "Tarihe git" jumps
  const el = $('#gallery'), from = S.listFrom ? Math.max(0, items.findIndex(i => i.ts <= S.listFrom)) : 0;
  const media = items.filter(i => i.type === 'file' || (i.type === 'link' && i.meta?.image)).slice(0, from + S.limit).filter(i => !S.listFrom || i.ts <= S.listFrom).slice(0, S.limit);
  let last = '', html = '';
  for (const i of media) {
    const m = dayKey(i.ts).slice(0, 7);
    if (m !== last) { const [y, mo] = m.split('-').map(Number); html += `<div class="g-month">${new Date(y, mo - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>`; last = m; }
    html += `<div class="tile${S.hits?.has(i.id) ? ' hit' : ''}${markCls(i)}" data-id="${i.id}">
    ${thumbBox(i)}<div class="tile-cap"><div class="t">${esc(titleOf(i))}</div><div class="s">${KIND_LABEL[fileKind(i)]} · ${fmtDay(dayKey(i.ts))}</div></div></div>`;
  }
  el.innerHTML = media.length ? `${topBtns('g-jump')}${S.listFrom ? `<div class="l-from g-from">${ic('clock', 'sm')}<span>${fromLabel(S.listFrom)} ve öncesi</span><button class="link-btn" data-lnow>En yeniye dön</button></div>` : ''}` + html
    : emptyHtml('grid', 'Galeri boş', 'Resimler, PDF\'ler, videolar ve görseli olan linkler burada görünür.');
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
    || emptyHtml('hash', 'Henüz konu yok', '' + aiName() + ' kayıtları düzenledikçe konular burada toplanır.');
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
  $('#filterLbl').textContent = S.view === 'todo' ? 'Yapılacaklar' : f.src ? srcName(f.src) : f.list ? listName(f.list) : f.tag ? '#' + f.tag : f.star ? 'Yıldızlı' : types.find(t => t[0] === f.type)[2];
  const stars = live.filter(i => i.starred).length;
  // the rail stays short: the 5 kinds, starred, to-dos; lists, vault, colours and topics live under "Daha fazla"
  const moreOn = !!(f.tag || f.color || f.src || (f.list && S.view !== 'todo'));
  const board = S.view === 'board' && alive().length;
  $('#rail').innerHTML = `<button class="r-fold" data-fold data-tip="Kenar çubuğunu gizle ( [ )" aria-label="Kenar çubuğunu gizle">${ic('chev', 'sm')}</button>`
    + types.map(([t, icn, l, n]) => `<button class="${typeOn(t) ? 'on' : ''}" data-type="${t}" data-tip="${l} · ${n}" aria-label="${l}">${ic(icn)}</button>`).join('')
    + `<hr><button class="${f.star && S.view !== 'todo' ? 'on' : ''}" data-star data-tip="Yıldızlı · ${stars}" aria-label="Yıldızlı">${ic('star')}</button>`
    + `<button class="${S.view === 'todo' ? 'on' : ''}" data-todo data-tip="Yapılacaklar · ${todos}" aria-label="Yapılacaklar">${ic('todo')}${todos ? `<span class="cnt">${todos}</span>` : ''}</button>`
    + Saved.list().slice(0, 4).map(v => `<button class="${Saved.same(v) ? 'on' : ''}" data-saved="${v.id}" data-tip="${esc(v.name)}" aria-label="Kayıtlı arama: ${esc(v.name)}"><span class="sv-ab">${esc([...v.name.replace(/^[#\s]+/, '')].slice(0, 2).join(''))}</span></button>`).join('')
    + `<button class="${moreOn ? 'on' : ''}" data-tags data-tip="${f.list && S.view !== 'todo' ? esc(listName(f.list)) : f.tag ? '#' + esc(f.tag) : 'Daha fazla: listeler, konular, şifrelerim'}" aria-label="Daha fazla">${ic('dots')}</button>`
    + (board ? `<button class="pal-tab${S.palOpen ? ' on' : ''}" data-paltab data-tip="${S.palOpen ? 'Çizim araçlarını kapat' : 'Çizim araçları'}" aria-label="Çizim araçları" aria-expanded="${!!S.palOpen}">${ic('pen', 'sm')}</button>` : '');
  $('#railTab').innerHTML = `<button data-fold data-tip="Kenar çubuğunu aç ( [ )" aria-label="Kenar çubuğunu aç">${ic('chev', 'sm')}</button>`; // 88b: only >, where < was; the palette stays
  const nTrash = S.items.filter(i => i.deleted && !i.purged && i.deletedAt).length, nRead = live.filter(i => Read.readable(i) && !i.seenAt && (i.type !== 'link' || i.read)).length;
  $('#popLists').innerHTML = `<button class="side-row" data-readq>${ic('book')}<span class="lbl">Okuma listesi</span><span class="n">${nRead || ''}</span></button>` + lists.map(([k, icn, l, n]) => `<button class="side-row${listOn(k) ? ' on' : ''}" data-list="${k}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row" data-trash>${ic('trash')}<span class="lbl">Çöp kutusu</span><span class="n">${nTrash || ''}</span></button><button class="side-row" data-vault>${ic('lock')}<span class="lbl">Şifrelerim</span><span class="n"></span></button>`;
  $('#popTypes').innerHTML = types.map(([t, icn, l, n]) => `<button class="side-row${typeOn(t) ? ' on' : ''}" data-type="${t}">${ic(icn)}<span class="lbl">${l}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row${f.star ? ' on' : ''}" data-star>${ic('star')}<span class="lbl">Yıldızlı</span><span class="n">${stars || ''}</span></button>`
    + `<button class="side-row${S.view === 'todo' ? ' on' : ''}" data-todo>${ic('todo')}<span class="lbl">Yapılacaklar</span><span class="n">${todos || ''}</span></button>`
    + lists.map(([k, icn, l, n]) => `<button class="side-row${listOn(k) ? ' on' : ''}" data-list="${k}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row" data-readq>${ic('book')}<span class="lbl">Okuma listesi</span><span class="n">${nRead || ''}</span></button><button class="side-row" data-trash>${ic('trash')}<span class="lbl">Çöp kutusu</span><span class="n">${nTrash || ''}</span></button><button class="side-row" data-vault>${ic('lock')}<span class="lbl">Şifrelerim</span><span class="n"></span></button>`;
  const sv = Saved.rows(); $('#popSaved').innerHTML = sv; $('#savedLabel').hidden = !sv;
  const sr = srcRows(live, f.src); $('#popSrc').innerHTML = sr; $('#srcLabel').hidden = !sr;
  const projs = new Map(); live.forEach(i => i.project && projs.set(i.project, (projs.get(i.project) || 0) + 1));
  $('#projLabel').hidden = !projs.size;
  $('#sideProjects').innerHTML = [...projs].sort((a, b) => b[1] - a[1]).map(([p, n]) => `<button class="side-row${f.list === 'p:' + p ? ' on' : ''}" data-list="p:${esc(p)}">${ic('folder', 'sm')}<span class="lbl">${esc(p)}</span><span class="n">${n || ''}</span></button>`).join('');
  const counts = new Map(); live.forEach(i => (i.tags || []).forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  const all = [...counts].sort((a, b) => b[1] - a[1]), tags = S.allTags ? all : all.slice(0, 10);
  if (f.tag && !tags.some(([t]) => t === f.tag)) tags.push([f.tag, counts.get(f.tag) || 0]);
  const used = new Set(live.map(i => i.color).filter(Boolean));
  $('#sideMarks').innerHTML = `<div class="mark-dots">${COLORS.filter(([c]) => used.has(c) || f.color === c).map(([c, n]) => `<button class="cdot c-${c}${f.color === c ? ' on' : ''}" data-color="${c}" title="${n}" aria-label="${n}"></button>`).join('') || '<span class="hint">Kayıtlara renk verince burada çıkar.</span>'}</div>
    <button class="side-row${S.sortPrio ? ' on' : ''}" data-sortprio>${ic('flag')}<span class="lbl">Önce yüksek öncelik</span><span class="n">${S.sortPrio ? ic('check', 'sm') : ''}</span></button>`;
  $('#sideTags').innerHTML = tags.map(([t, n]) => `<button class="side-row${f.tag === t ? ' on' : ''}" data-tag="${esc(t)}"><span class="hash">${ic('hash', 'sm')}</span><span class="lbl">${esc(t)}</span><span class="n">${n || ''}</span></button>`).join('')
    + (all.length > 10 ? `<button class="side-row" data-alltags><span class="hash">${ic('chev', 'sm')}</span><span class="lbl">${S.allTags ? 'Daha az göster' : `Tümünü göster (${all.length})`}</span></button>` : '')
    || '<div class="hint" style="padding:0 10px 8px">' + aiName() + ' düzenledikçe konular burada çıkar.</div>';
}
function emptyHtml(icn, h, p, actions = '') {
  return `<div class="empty"><div class="e-ico">${ic(icn, 'lg')}</div><h3>${h}</h3><p>${p}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}

let renderQueued = false;
function render(force) {
  if (force) S._vkey = null;
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    // typing only changes the dropdown: views and chrome redraw when data, filters, a real search or the view change
    const vkey = [S.items, JSON.stringify(S.filter), S.sortPrio, S.searchOn, S.searchOn && S.hits, S.limit, S.view + (S.listFrom || '') + (S.boardRange || '') + (S.board || ''), S.bridgeOk, S.palOpen, aiKey(), S.allTags, JSON.stringify(S.settings?.lists || {})];
    const same = !!S._vkey && vkey.every((x, k) => x === S._vkey[k]), onlyMore = !!S._vkey && S.view === 'list' && vkey[5] > S._vkey[5] && vkey.every((x, k) => k === 5 || x === S._vkey[k]); S._vkey = vkey;
    renderHits(); if (same && S.view !== 'todo') return;
    const items = visible(), none = !alive().length;
    renderChrome();
    for (const v of ['list', 'board', 'gallery', 'topics', 'todo']) $('#' + v).hidden = (none && v !== 'todo') || S.view !== v;
    document.body.classList.toggle('board-view', S.view === 'board' && !none);
    document.body.classList.toggle('gallery-view', S.view === 'gallery' && !none); Peek.dock();
    $('#boardTools').hidden = none || S.view !== 'board';
    $('#pal').hidden = none || S.view !== 'board' || !S.palOpen; // desktop: slides out of the rail; phone: opens from the pen button (98)
    Rail.place();
    $('#empty').hidden = !none || S.view === 'todo';
    if (S.view === 'todo') Todo.render();
    else if (none) $('#empty').innerHTML = emptyHtml('inbox', 'Kendine not at', 'WhatsApp\'ta kendine attığın gibi: kutuya yaz ya da link, resim, dosya yapıştır. Sonra aynı kutuya yazarak bul. <b>Tab</b> ile ' + aiTo() + ' sorma moduna geçersin.',
      `<button class="btn secondary" data-do="wa">${ic('chat', 'sm')}WhatsApp'tan içe aktar</button><button class="btn secondary" data-do="settings">${ic('settings', 'sm')}Ayarlar</button>`);
    else if (S.view === 'list') items.length ? renderList(items, onlyMore) : ($('#list').innerHTML = emptyHtml('search', 'Benzer kayıt yok', 'Enter\'a basarsan bunu yeni not olarak kaydeder. ' + aiTo() + ' sormak için <b>Tab</b>\'a bas.'));
    else if (S.view === 'board') { // typing in the box doesn't rebuild the board: only data, filters or a real search do
      const key = [S.items, JSON.stringify(S.filter), S.sortPrio, S.searchOn && S.q, S.searchOn && S.hits, S.linkFrom];
      if (!S.cam || !Board._key || key.some((x, k) => x !== Board._key[k])) { Board._key = key; Board.render(visible(true)); }
    }
    else if (S.view === 'gallery') renderGallery(items);
    else renderTopics(items);
    Scrub.draw(none || S.view === 'todo' ? [] : items);
    $('#splash').classList.add('gone');
  });
}

// ---------- data changes ----------
async function upsert(list, { sync = true } = {}) {
  const t = now(), base = new Map(list.map(i => [i.id, byId(i.id)?.updatedAt || 0])); // the version this edit started from (84)
  for (const i of list) { i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1); indexItem(i); }
  const map = new Map(S.items.map(i => [i.id, i]));
  list.forEach(i => map.set(i.id, i));
  S.items = [...map.values()];
  await DB.putMany('items', list.map(({ ...i }) => i));
  await Sync.markDirty(list, base);
  runSearch(); render(); AI.dot();
  if (sync) Sync.schedule();
  Snapshot.schedule();
}
async function addFromInput(input) {
  const made = itemsFromInput(input);
  if (!made.length) return [];
  made.forEach(m => { m.createdAt = now(); if (!m.source || m.source === 'manual') m.dev = deviceNow(); });
  if (made.length === 1 && made[0].type === 'link' && input.source !== 'pc') {
    const dup = S.items.find(i => !i.deleted && i.type === 'link' && i.url.replace(/\/$/, '') === made[0].url.replace(/\/$/, ''));
    if (dup) { toast(`Bu link zaten kayıtlı (${fmtDay(dayKey(dup.ts))})`, 3500, 'link'); openItem(dup.id); return 'dup'; }
  }
  const saved = await saveItems(made);
  await upsert(saved);
  AI.kick(); setTimeout(() => LinkMeta.run(), 1500);
  return saved;
}
async function removeItem(i) { // to the trash for 30 days (whole item + file kept), then gone for good
  S.undo = { ...i }; haptic(14);
  await upsert([{ ...i, deleted: true, deletedAt: now() }]);
  toast('Çöp kutusuna taşındı', 6000, 'trash', { label: 'Geri al', fn: undoDelete });
}
async function undoDelete() {
  const u = S.undo; if (!u) return; S.undo = null;
  await upsert([{ ...u, deleted: false, deletedAt: undefined }]); toast('Geri alındı', 1800, 'check');
}
const Trash = {
  DAYS: 30,
  list: () => S.items.filter(i => i.deleted && !i.purged && i.deletedAt && i.type !== 'vault' && i.type !== 'bridge').sort((a, b) => b.deletedAt - a.deletedAt),
  async purge(items) { // tombstone only: other devices learn it is gone; the file goes too
    items = [...items, ...items.flatMap(i => (i.conv?.kids || []).map(byId).filter(Boolean))];
    for (const i of items) { DB.del('files', i.id); DB.del('files', i.id + ':t'); }
    await upsert(items.map(i => ({ id: i.id, deleted: true, purged: true, ts: i.ts, type: i.type })));
  },
  async sweep() { const old = this.list().filter(i => now() - i.deletedAt > this.DAYS * 864e5); if (old.length) await this.purge(old); },
  open() {
    let d = $('#trash');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'trash'; d.className = 'drawer modal narrow'; document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; });
      d.addEventListener('click', async e => {
        if (e.target === d || e.target.closest('[data-x]')) return d.close();
        const r = e.target.closest('[data-restore]'), k = e.target.closest('[data-kill]');
        if (r) { const i = byId(r.dataset.restore); await upsert([{ ...i, deleted: false, deletedAt: undefined }]); toast('Geri getirildi', 1800, 'check'); return this.draw(); }
        if (k) { await this.purge([byId(k.dataset.kill)]); return this.draw(); }
        if (e.target.closest('[data-empty]')) { const all = this.list(); if (!all.length) return; if (e.target.closest('[data-empty]').dataset.sure !== '1') { const b = e.target.closest('[data-empty]'); b.dataset.sure = '1'; b.textContent = `Emin misin? ${all.length} kayıt kalıcı silinir`; return; } await this.purge(all); toast('Çöp kutusu boşaldı', 2000, 'trash'); this.draw(); }
      });
    }
    this.draw(); Back.open(d);
  },
  draw() {
    const d = $('#trash'), all = this.list(), left = i => Math.max(1, this.DAYS - Math.floor((now() - i.deletedAt) / 864e5));
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type">${ic('trash', 'sm')}Çöp kutusu</span><span class="sp"></span><button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      <p class="hint">Silinenler ${this.DAYS} gün burada durur, sonra kendiliğinden kalıcı silinir.</p>
      ${all.length ? `<div class="v-list">${all.map(i => { const k = i.type === 'draw' ? 'pen' : fileKind(i); return `<div class="v-row"><span class="v-av ${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}</span>
          <span class="v-t" style="flex:1"><b>${esc(i.type === 'draw' ? 'Çizim' : titleOf(i))}</b><small>${fmtDay(dayKey(i.deletedAt))} silindi · ${left(i)} gün kaldı</small></span>
          <button class="btn secondary sm" data-restore="${i.id}">Geri getir</button><button class="icon-btn sm danger" data-kill="${i.id}" title="Kalıcı sil" aria-label="Kalıcı sil">${ic('x', 'sm')}</button></div>`; }).join('')}</div>
        <div class="row" style="justify-content:flex-end"><button class="btn danger" data-empty>Çöpü boşalt</button></div>`
        : `<p class="hint v-empty">Çöp kutusu boş.</p>`}</div>`;
  },
};
async function toggleStar(id) { const i = byId(id); if (i) await upsert([{ ...i, starred: !i.starred }]); }
async function itemAction(a, id) {
  const i = byId(id); if (!i) return;
  if (a === 'star') return toggleStar(id);
  if (a === 'copy') return copyItem(i);
  if (a === 'open') return window.open(i.url, '_blank', 'noopener');
  if (a === 'download') { const u = await blobFor(i); if (!u) return toast('Dosya bu cihazda yok'); const l = document.createElement('a'); l.href = u; l.download = i.fileName; l.click(); return; }
  if (a === 'explain') { openItem(id); AI.explain(id); }
  if (a === 'read') Read.open(id);
}

// ---------- composer ----------
const isQuestion = t => { URL_RE.lastIndex = 0; const u = URL_RE.test(t); URL_RE.lastIndex = 0; return /\?\s*$/.test(t.trim()) && !u; };
function clearBox() { const inp = $('#input'); inp.value = ''; S.q = ''; S.searchOn = false; runSearch(); autoGrow(); render(); closeAnswer(); }
function hideHits() { S.hitsOff = true; S.hitSel = -1; renderHits(); }
function closeAnswer() { $('#answer').hidden = true; document.body.classList.remove('answering'); }
function renderHits() {
  const el = $('#hits'), q = S.q.trim();
  // smooth: only touch the DOM when the content really changed; open/close with a short animation
  const show = (cls, html) => {
    clearTimeout(el._ht); el.classList.remove('closing');
    if (el._cls !== cls) { el.className = cls; el._cls = cls; }
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
    el.hidden = false;
  };
  if (S.searchOn && q) return show('qchip', `${ic('search', 'sm')}<span>“${esc(q.slice(0, 40))}” · ${S.hits?.size || 0} kayıt</span><button data-clear title="Aramayı kapat">${ic('x', 'sm')}</button>`);
  if (!q || !S.hits?.size || S.hitsOff) { // 103a: hitsOff = the page changed; the text stays, the list comes back on typing/focus
    if (el.hidden || el.classList.contains('closing')) return;
    el.classList.add('closing'); el._ht = setTimeout(() => { el.hidden = true; el.classList.remove('closing'); el._html = ''; }, 140); return;
  }
  const top = [...S.hits].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => byId(id)).filter(Boolean);
  if (S.hitSel >= top.length) S.hitSel = top.length - 1;
  const hint = S.hitSel >= 0 ? '<kbd>↑</kbd><kbd>↓</kbd> seç · <kbd>Enter</kbd> aç · <kbd>Esc</kbd> kapat'
    : askMode() ? '<kbd>Enter</kbd> ' + aiTo() + ' sor · <kbd>Tab</kbd> not moduna dön · <kbd>↓</kbd> sonuçlara in' : '<kbd>Enter</kbd> not olarak kaydet · <kbd>Tab</kbd> ' + aiTo() + ' sor · <kbd>↓</kbd> sonuçlara in';
  show('hits', `<div class="h-label">Kayıtlar</div>` + top.map((i, n) => {
    const k = fileKind(i), logo = i.type === 'link' && i.meta?.logo;
    return `<button class="h-row${n === S.hitSel ? ' sel' : ''}" data-open="${i.id}"><span class="h-ico ${i.type}-c">${logo ? `<img src="${esc(logo)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ic(k === 'text' ? 'note' : k, 'sm')}</span>
      <span class="h-t">${hl(titleOf(i))}</span><span class="h-s">${i.type === 'link' ? esc(domain(i.url)) : fmtDay(dayKey(i.ts))}</span></button>`;
  }).join('') + `<div class="h-foot"><span class="d-only">${hint}</span>${S.hits.size > 0 ? `<button class="link-btn" data-all>${S.hits.size} sonucun hepsini göster</button>` : ''}</div>`);
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
// two modes: "Not" (Enter saves) and "Sor" (Enter asks Claude); Tab switches. A text ending in ? only shows a hint.
const askMode = () => S.mode === 'ask' && !S.attach.length;
function setMode(m) { S.mode = m; updateSend(); if (S.q) renderHits(); }
const updateSend = () => {
  const v = $('#input').value.trim(), ask = askMode(), b = $('#saveBtn'), phone = innerWidth < 700;
  b.disabled = !ask && !v && !S.attach.length;
  const key = ask ? 'a' : 'n';
  if (b.dataset.k !== key) {
    b.dataset.k = key; b.classList.toggle('ask', ask);
    b.innerHTML = ask ? `${ic('spark', 'sm')}<span>Sor</span>` : ic('up', 'sm'); b.classList.toggle('round', !ask);
    b.setAttribute('aria-label', ask ? '' + aiTo() + ' sor' : 'Kaydet');
    b.title = ask ? '' + aiTo() + ' sor (Enter) · Tab: not moduna dön' : 'Kaydet (Enter) · Tab: ' + aiTo() + ' sor';
    $('#composer').classList.toggle('ask-mode', ask);
    $('#input').placeholder = ask ? '' + aiTo() + ' sor: "geçen hafta ne kaydettim?"' : 'Not, link ya da soru yaz…';
  }
  const touch = matchMedia('(hover: none)').matches, h = $('#cHint'), tip = ask ? 'not' : ((touch ? v : isQuestion(v)) && !S.attach.length ? 'ask' : ''); // no Tab key on a phone: the chip is the way in
  if (h.dataset.k !== tip) {
    h.dataset.k = tip; h.hidden = !tip;
    h.innerHTML = tip === 'ask' ? `<button data-mode="ask">${phone ? '' : '<kbd>Tab</kbd>'}${ic('spark', 'sm')}${aiTo()} sor</button>`
      : tip === 'not' ? `<span class="m-on">${ic('spark', 'sm')}${aiTo()} soruyorsun</span><button data-mode="note">${phone ? '' : '<kbd>Tab</kbd>'}Not olarak kaydet</button>` : '';
  }
};
const submitBox = () => { const v = $('#input').value; if (askMode()) { const q = v.trim(); q ? AI.ask(q) : AI.suggest(); } else save(); };
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
  let r; try { r = await addFromInput({ text, files }); }
  catch (e) { console.warn('save', e); if (!inp.value.trim()) inp.value = text; S.attach = [...files, ...S.attach]; renderAttach(); autoGrow(); return toast('Kaydedilemedi: ' + e.message, 5000, 'x'); } // 109c: nothing typed is lost
  render();
  if (r !== 'dup') { haptic(); toast(files.length ? `${files.length} dosya kaydedildi` : 'Kaydedildi', 1600, 'check'); }
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, innerHeight * .4) + 'px'; updateSend(); }

// ---------- 94: native feel - the item window grows out of the tapped card and shrinks back; short haptic ticks ----------
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const haptic = (ms = 8) => { try { if (matchMedia('(pointer: coarse)').matches) navigator.vibrate?.(ms); } catch { } };
const Morph = {
  tap: null, // the element the last pointerdown landed on, so the window opens from the card actually tapped
  init() { document.addEventListener('pointerdown', e => { this.tap = e.target.closest?.('[data-id],[data-open],[data-topen]') || null; }, true); },
  src(id) {
    const ok = el => { if (!el?.isConnected || el.closest('dialog')) return false; const r = el.getBoundingClientRect(); return r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
    const t = this.tap, tid = t && (t.dataset.id || t.dataset.open || t.dataset.topen);
    if (tid === id && ok(t)) return t;
    return [...document.querySelectorAll(`[data-id="${CSS.escape(id)}"],[data-open="${CSS.escape(id)}"]`)].find(ok) || null;
  },
  frames(dlg, el) { // transform that puts the window on top of the card
    const r = dlg.getBoundingClientRect(), s = el.getBoundingClientRect();
    const dx = s.left + s.width / 2 - (r.left + r.width / 2), dy = s.top + s.height / 2 - (r.top + r.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${Math.max(.08, s.width / r.width)}, ${Math.max(.08, s.height / r.height)})`;
  },
  open(dlg, id) {
    if (reduced() || !dlg.animate) return;
    const el = this.src(id); dlg._src = el ? id : null; if (!el) return;
    dlg.classList.add('morph'); dlg.addEventListener('close', () => dlg.classList.remove('morph'), { once: true }); // stays on while open, or the CSS entry animation would replay
    dlg.animate([{ transform: this.frames(dlg, el), opacity: .5 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
  },
  close(dlg) { // back into the card if it is still on screen, else down/out; then the real close
    if (dlg._closing || !dlg.open) return;
    if (reduced() || !dlg.animate) return dlg.close();
    const el = dlg._src && this.src(dlg._src); dlg._closing = true; dlg.classList.add('morph', 'shut');
    const to = el ? { transform: this.frames(dlg, el), opacity: 0 } : { transform: 'translateY(24px)', opacity: 0 };
    dlg.animate([{ transform: 'none', opacity: 1 }, to], { duration: el ? 200 : 160, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' })
      .finished.catch(() => { }).finally(() => { dlg._closing = false; dlg.close(); dlg.getAnimations().forEach(a => a.cancel()); dlg.classList.remove('morph', 'shut'); });
  },
};

// ---------- Android back button closes panels instead of leaving the app ----------
const Back = {
  open(dlg) { hideHits(); if (!dlg.open) { dlg.showModal(); history.pushState({ nts: dlg.id }, ''); } dlg.querySelector('.d-body')?.focus({ preventScroll: true }); },
  init() {
    addEventListener('popstate', () => { if (this._skip) { this._skip = false; return; } for (const d of document.querySelectorAll('dialog[open]')) { d._fromBack = true; d.close(); } if (!$('#answer').hidden) closeAnswer(); Pop.close(); const j = $('#jumpPop'); if (j) j.hidden = true; });
    // 101: menus and the AI answer are not dialogs but get a history entry too, so Android's back closes them instead of leaving the app
    const LAYERS = new Set(['filterPop', 'jumpPop', 'answer']);
    new MutationObserver(ms => { for (const m of ms) { const id = m.target.id; if (!LAYERS.has(id)) continue;
      if (!m.target.hidden) { if (history.state?.nts !== id) history.pushState({ nts: id }, ''); }
      else if (history.state?.nts === id) { Back._skip = true; history.back(); } } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    for (const d of document.querySelectorAll('dialog')) d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; });
  },
};

// ---------- detail drawer ----------
function explainHtml(i) {
  if (S.explaining.has(i.id)) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">${aiName()} inceliyor…</div><div class="skel" style="width:92%"></div><div class="skel" style="width:70%"></div></div></div>`;
  if (i.explain?.text) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">${aiOf()} açıklaması</div>${esc(i.explain.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div></div>`;
  if (i.summary) return `<div class="callout">${ic('spark')}<div class="c-b"><div class="c-t">Özet</div>${esc(i.summary)}</div></div>`;
  return '';
}
// one "Etiketle" row: what the item already has as small chips, the rest (colour, priority, task, lists) folds open
function tagRowHtml(i) {
  const col = COLORS.find(([c]) => c === i.color), pr = PRIOS.find(([v]) => v && v === i.prio), d = i.todo?.due && dueInfo(i.todo.due);
  const chips = [col && `<span class="tchip"><span class="cdot sm c-${col[0]}"></span>${col[1]}</span>`,
    pr && `<span class="tchip">${ic('flag', 'sm')}${pr[1]} öncelik</span>`,
    i.todo && `<span class="tchip${i.todo.done ? ' done' : ''}">${ic('todo', 'sm')}Görev${i.todo.done ? ' · bitti' : d ? ' · ' + esc(d.label) : ''}</span>`,
    ...(i.lists || []).filter(k => LISTS.some(l => l[0] === k)).map(k => `<span class="tchip">${ic(LISTS.find(l => l[0] === k)[1], 'sm')}${esc(listName(k))}</span>`)].filter(Boolean);
  const open = S.tagOpen;
  return `<div class="d-tagrow"><button class="lchip${open ? ' on' : ''}" data-act="tagfold" aria-expanded="${!!open}">${ic('layers', 'sm')}Etiketle${ic('chev', 'sm fold')}</button>${chips.join('')}</div>
    ${open ? `<div class="d-tagpanel">
      <div class="tp-row"><span class="tp-l">Renk</span><div class="mark-dots">${COLORS.map(([c, n]) => `<button class="cdot c-${c}${i.color === c ? ' on' : ''}" data-setcolor="${c}" title="${n}" aria-label="${n}"></button>`).join('')}</div></div>
      <div class="tp-row"><span class="tp-l">Öncelik</span><div class="seg sm prio">${PRIOS.map(([v, n]) => `<button class="${(i.prio || '') === v ? 'on' : ''}" data-setprio="${v}">${n}</button>`).join('')}</div></div>
      <div class="tp-row"><span class="tp-l">Görev</span>${i.todo ? `<label class="t-line"><input type="checkbox" data-tdone ${i.todo.done ? 'checked' : ''}><span>${i.todo.done ? 'Bitti' : 'Yapılacak'}</span></label>
        <input type="datetime-local" class="t-due-in" aria-label="Tarih" value="${i.todo.due ? (i.todo.due.includes('T') ? i.todo.due : i.todo.due + 'T09:00') : ''}">
        <button class="link-btn" data-act="untodo">Çıkar</button>` : `<button class="lchip" data-act="mktodo">${ic('plus', 'sm')}Görev yap</button>`}</div>
      ${boardNames().length ? `<div class="tp-row"><span class="tp-l">Panolar</span><div class="tp-chips">${boardNames().map(n => `<button class="lchip${(i.boards || []).includes(n) || i.project === n ? ' on' : ''}" data-tboard="${esc(n)}"${i.project === n ? ` title="${aiName()} bu projeye koydu"` : ''}>${ic('folder', 'sm')}${esc(n)}</button>`).join('')}</div></div>` : ''}
      <div class="tp-row"><span class="tp-l">Listeler</span><div class="tp-chips">${LISTS.filter(([k]) => !listHidden(k)).map(([k, icn]) => `<button class="lchip${(i.lists || []).includes(k) ? ' on' : ''}" data-tlist="${k}">${ic(icn, 'sm')}${esc(listName(k))}</button>`).join('')}</div></div>
    </div>` : ''}`;
}
// a WhatsApp conversation inside one item: its photos as a gallery, then the messages
function convHtml(i) {
  const kids = (i.conv.kids || []).map(byId).filter(Boolean), pics = kids.filter(k => hasVisual(k)), files = kids.filter(k => !hasVisual(k)), many = i.conv.who.length > 1;
  return `${pics.length ? `<div class="conv-pics">${pics.slice(0, 24).map(k => `<button class="conv-pic" data-kid="${k.id}" aria-label="${esc(k.fileName)}">${thumbBox(k)}</button>`).join('')}${pics.length > 24 ? `<span class="hint">+${pics.length - 24}</span>` : ''}</div>` : ''}
    ${files.length ? `<div class="rel-chips">${files.map(k => `<button class="rel-chip" data-kid="${k.id}">${ic(fileKind(k) === 'text' ? 'note' : fileKind(k), 'sm')}<span class="t">${esc(k.fileName)}</span></button>`).join('')}</div>` : ''}
    <div class="conv-log">${i.conv.log.map(l => `<div class="cl"><span class="cl-t">${fmtTime(l.ts)}</span>${many ? `<b>${esc(l.who)}</b>` : ''}<span>${l.att ? `<span class="cl-att">${ic('clip', 'sm')}${esc(byId(l.att)?.fileName || 'dosya')}</span> ` : ''}${esc(l.text).replace(URL_RE, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)}</span></div>`).join('')}</div>`;
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
    <div class="d-head"><span class="type ${i.type}-c">${ic(i.conv ? 'chat' : k === 'text' ? 'note' : k, 'sm')}${i.conv ? 'Sohbet' : KIND_LABEL[k]}</span><span>·</span><span>${fmtDay(dayKey(i.ts))}, ${fmtTime(i.ts)}</span>
      ${i.source === 'whatsapp' ? '<span>· WhatsApp</span>' : i.source === 'pc' ? '<span>· Bilgisayar</span>' : i.source === 'share' ? '<span>· Paylaşım</span>' : ''}
      <span class="sp"></span>
      <div class="d-acts d-only">
        <button class="btn ghost sm" data-act="share" title="Başka bir uygulamaya ya da kişiye gönder">${ic('share', 'sm')}Paylaş</button>
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
    ${i.conv ? convHtml(i) : ''}
    ${i.archive && !i.onBoard && !i.pos ? `<div class="d-arch">${ic('inbox', 'sm')}<span>Arşivde${i.chat ? ` · WhatsApp: ${esc(i.chat)}` : ''}. Listede, galeride ve aramada var, panoda yok.</span><button class="btn secondary sm" data-act="toboard">${ic('board', 'sm')}Panoya koy</button></div>` : ''}
    ${i.ocr ? `<details class="d-ocr"><summary>${ic('text', 'sm')}${fileKind(i) === 'pdf' ? 'Sayfadaki yazı' : 'Resimdeki yazı'}<button class="link-btn" data-act="copyocr">Kopyala</button></summary><pre>${esc(i.ocr)}</pre></details>` : ''}
    ${media ? '' : lcard}
    <div class="field-label">Not</div>
    <textarea class="d-text" placeholder="Bir şey ekle…">${esc(i.text || '')}</textarea>
    <div class="tags-edit">${(i.tags || []).map(t => `<span class="tagpill">${esc(t)}<button data-untag="${esc(t)}" title="Kaldır">${ic('x', 'sm')}</button></span>`).join('')}
      <input class="tag-in" placeholder="+ konu" enterkeyhint="done"></div>
    ${tagRowHtml(i)}
    ${rel.length ? `<div class="field-label">Bağlantılı · ${rel.length}</div><div class="rel-chips">${rel.slice(0, 12).map(r => { const rk = fileKind(r);
      return `<button class="rel-chip" data-rel="${r.id}" title="${esc(titleOf(r))}"><span class="${r.type}-c">${ic(rk === 'text' ? 'note' : rk, 'sm')}</span><span class="t">${esc(titleOf(r))}</span></button>`; }).join('')}</div>` : ''}
    ${Read.readable(i) ? `<button class="btn secondary wide" data-act="read">${ic('book', 'sm')}${i.type !== 'link' ? 'Okuma sayfasında aç' : i.read ? `Oku · ${Reader.minutes(i)} dk` : 'Okunur kopyasını al ve oku'}</button>` : ''}
    ${(i.highlights || []).length ? `<div class="field-label">İşaretlediklerin · ${i.highlights.length}</div><div class="hl-list">${i.highlights.map(h => `<blockquote>${esc(h.text)}</blockquote>`).join('')}</div>` : ''}
    <button class="btn ai wide" data-act="explain">${ic('spark', 'sm')}${i.explain ? '' + aiName() + ': yeniden anlat' : '' + aiName() + ' anlatsın: bu ne, neyle bağlantılı?'}</button>
    </div>${media ? '</div>' : ''}
    <div class="d-foot m-only-b">
      <button class="fbtn" data-act="share">${ic('share')}<span>Paylaş</span></button>
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
    if (e.target === dlg || act === 'close') { await commit(); Morph.close(dlg); }
    else if (act === 'star') { await commit(); await toggleStar(i.id); openItem(i.id); }
    else if (act === 'del') { Morph.close(dlg); await removeItem(i); }
    else if (act === 'share') shareItem(byId(i.id));
    else if (act === 'explain') { await commit(); AI.explain(i.id); }
    else if (act === 'download') itemAction('download', i.id);
    else if (act === 'copy') { await commit(); copyItem(byId(i.id)); }
    else if (e.target.closest('[data-untag]')) { const t = e.target.closest('[data-untag]').dataset.untag; await upsert([{ ...byId(i.id), tags: byId(i.id).tags.filter(x => x !== t) }]); openItem(i.id); }
    else if (act === 'read') { await commit(); Reader.open(i.id); }
    else if (act === 'toboard') { await upsert([{ ...byId(i.id), onBoard: true }]); toast('Panoya kondu', 2000, 'board', { label: 'Panoya git', fn: () => { $('#sheet').close(); setView('board'); } }); openItem(i.id); }
    else if (e.target.closest('[data-kid]')) { await commit(); openItem(e.target.closest('[data-kid]').dataset.kid); }
    else if (act === 'copyocr') { e.preventDefault(); copyText(byId(i.id).ocr || ''); }
    else if (act === 'tagfold') { await commit(); S.tagOpen = !S.tagOpen; openItem(i.id); }
    else if (act === 'mktodo') { await commit(); const c = byId(i.id); await upsert([{ ...c, noTodo: false, todo: { text: titleOf(c), done: false, user: true } }]); openItem(i.id); }
    else if (act === 'untodo') { await commit(); await upsert([{ ...byId(i.id), todo: null, noTodo: true }]); openItem(i.id); }
    else if (e.target.closest('[data-setcolor]')) { await commit(); const c = e.target.closest('[data-setcolor]').dataset.setcolor, cur = byId(i.id); await upsert([{ ...cur, color: cur.color === c ? undefined : c }]); openItem(i.id); }
    else if (e.target.closest('[data-setprio]')) { await commit(); await upsert([{ ...byId(i.id), prio: e.target.closest('[data-setprio]').dataset.setprio || undefined }]); openItem(i.id); }
    else if (e.target.closest('[data-tboard]')) { await commit(); const n = e.target.closest('[data-tboard]').dataset.tboard, c = byId(i.id), bs = new Set(c.boards || []); bs.has(n) ? bs.delete(n) : bs.add(n); await upsert([{ ...c, boards: [...bs] }]); openItem(i.id); }
    else if (e.target.closest('[data-tlist]')) { await commit(); const k = e.target.closest('[data-tlist]').dataset.tlist, c = byId(i.id), ls = new Set(c.lists || []); ls.has(k) ? ls.delete(k) : ls.add(k); await upsert([{ ...c, lists: [...ls], userLists: true }]); openItem(i.id); }
    else if (e.target.closest('[data-rel]')) { await commit(); openItem(e.target.closest('[data-rel]').dataset.rel); }
    else if (row) { await commit(); openItem(row.dataset.id); }
  };
  dlg.querySelector('[data-tdone]')?.addEventListener('change', async () => { await commit(); await Todo.toggle(i.id); openItem(i.id); });
  dlg.querySelector('.t-due-in')?.addEventListener('change', async e => { await commit(); const c = byId(i.id); await upsert([{ ...c, todo: { ...c.todo, due: validDue(e.target.value) || undefined, user: true } }]); });
  dlg.querySelector('.tag-in').onkeydown = async e => { if (e.key === 'Enter') { e.preventDefault(); await commit(); openItem(i.id); } };
  dlg.oncancel = e => { commit(); e.preventDefault(); Morph.close(dlg); };
  const was = dlg.open; Back.open(dlg); if (!was) Morph.open(dlg, id);
  requestAnimationFrame(fit);
  if (i.type === 'file') showPreview(i);
}
async function showPreview(i, box = $('#filePrev')) {
  if (!box) return;
  const u = await blobFor(i), k = fileKind(i);
  if (!u) { box.innerHTML = `<div class="prev-empty">${ic('cloud', 'xl')}<span>Dosya bu cihazda yok${i.fileSynced ? ', senkron ayarlarını kontrol et' : ''}.</span></div>`; return; }
  if (k === 'image') box.innerHTML = `<img src="${u}" alt="">`;
  else if (k === 'video') box.innerHTML = `<video src="${u}" controls playsinline preload="metadata"></video>`;
  else if (k === 'audio') box.innerHTML = `<audio src="${u}" controls></audio>`;
  else if (k === 'text' || Docs.can(i)) { try { box.innerHTML = await Docs.render(i, await (await fetch(u)).blob()); Tex.math(box); } catch (e) { box.innerHTML = `<div class="prev-empty">${ic('file', 'xl')}<span>Önizleme açılamadı: ${esc(e.message)}</span></div>`; } }
  else if (k === 'pdf') {
    try {
      const doc = await Prev.pdfDoc(i), max = Math.min(doc.numPages, 40);
      box.innerHTML = `<div class="pdf-bar">${ic('pdf', 'sm')}<span>${doc.numPages} sayfa</span></div><div class="pdf-pages"></div>`;
      const pages = box.querySelector('.pdf-pages'), w = Math.min(1400, (pages.clientWidth || 440) * (devicePixelRatio || 1));
      pages.innerHTML = '<div class="skel" style="height:320px;margin:0;border-radius:6px"></div>';
      for (let n = 1; n <= max; n++) { if (!document.body.contains(pages)) break; const c = await Prev.renderPage(doc, n, w); if (n === 1) pages.innerHTML = ''; pages.appendChild(c); }
      if (doc.numPages > max) pages.insertAdjacentHTML('beforeend', `<div class="prev-empty">+${doc.numPages - max} sayfa daha · indirip aç</div>`);
    } catch (e) { box.innerHTML = `<div class="prev-empty">${ic('pdf', 'xl')}<span>PDF açılamadı</span></div>`; }
  } else {
    const t = await Docs.sniff(await (await fetch(u)).blob()); // unknown type: show it as text if it looks like text
    box.innerHTML = t != null ? `<div class="pdf-bar">${ic('note', 'sm')}<span>Metin olarak gösteriliyor</span></div><pre>${esc(t)}</pre>`
      : `<div class="prev-empty">${ic('file', 'xl')}<span>${esc(i.fileName)} · ${fmtSize(i.size)}</span><span>Bu dosya türü için önizleme yok, indirip açabilirsin.</span></div>`;
  }
}

// ---------- LaTeX: .toc → numbered contents with page numbers, .tex/.bbl → readable page; maths with KaTeX, loaded only when opened (79) ----------
const Tex = {
  can: i => /^(tex|ltx|toc|lof|lot|bbl)$/.test(Docs.ext(i)),
  ACC: { '"': '̈', "'": '́', '`': '̀', '^': '̂', '~': '̃', c: '̧', u: '̆', v: '̌', H: '̋', '.': '̇', '=': '̄', k: '̨', r: '̊' },
  SYM: { i: 'ı', j: 'ȷ', o: 'ø', O: 'Ø', ss: 'ß', ae: 'æ', AE: 'Æ', oe: 'œ', OE: 'Œ', l: 'ł', L: 'Ł', aa: 'å', AA: 'Å', ldots: '…', dots: '…', textellipsis: '…', LaTeX: 'LaTeX', TeX: 'TeX', LaTeXe: 'LaTeX2ε', textendash: '–', textemdash: '—', textbullet: '•', S: '§', P: '¶', copyright: '©', textregistered: '®', texttrademark: '™', textdegree: '°', euro: '€', pounds: '£', quad: ' ', qquad: '  ', enspace: ' ', ' ': ' ', ',': ' ', ';': ' ', '!': '', '/': '', '-': '­', '@': '', textbackslash: '\\', textasciitilde: '~', textasciicircum: '^', textless: '<', textgreater: '>', textbar: '|', guillemotleft: '«', guillemotright: '»', today: '' },
  WRAP: { textbf: 'b', bfseries: 'b', textit: 'i', emph: 'em', textsl: 'i', texttt: 'code', underline: 'u', uline: 'u', textsc: 'span class="sc"', textsuperscript: 'sup', textsubscript: 'sub', textup: 'span', textrm: 'span', textsf: 'span', textnormal: 'span', mbox: 'span', hbox: 'span', text: 'span', makebox: 'span', fbox: 'span class="tex-box"', framebox: 'span class="tex-box"', textcolor: 'span', colorbox: 'span', small: 'span', footnotesize: 'span', large: 'span', Large: 'span', LARGE: 'span', huge: 'span' },
  DROP: /^(label|index|hspace|vspace|addvspace|setlength|addtolength|setcounter|addtocounter|pagestyle|thispagestyle|pagenumbering|bibliographystyle|bibliography|addcontentsline|usepackage|documentclass|newcommand|renewcommand|providecommand|newenvironment|renewenvironment|def|let|input|include|includeonly|graphicspath|hypersetup|geometry|newpage|clearpage|cleardoublepage|pagebreak|linebreak|nopagebreak|noindent|indent|centering|raggedright|raggedleft|tableofcontents|listoffigures|listoftables|medskip|smallskip|bigskip|vfill|hfill|null|protect|relax|ignorespaces|nobreak|newline|par|appendix|frontmatter|mainmatter|backmatter|selectlanguage|color|normalsize|itshape|upshape|mdseries|rmfamily|sffamily|ttfamily|scshape|normalfont|em|bf|it|rm|tt|sc|sf|sl|maketitle|printbibliography|toprule|midrule|bottomrule|hline|cline|cmidrule|footnotemark|phantomsection|FloatBarrier|captionsetup|definecolor|newtheorem|lstset|onehalfspacing|doublespacing|singlespacing)$/,
  grp(s, i) { // s[i] === '{' → [inside, index after the closing brace]
    let d = 0; for (let k = i; k < s.length; k++) { const c = s[k]; if (c === '\\') { k++; continue; } if (c === '{') d++; else if (c === '}' && --d === 0) return [s.slice(i + 1, k), k + 1]; }
    return [s.slice(i + 1), s.length];
  },
  opt(s, i) { let j = i; while (s[j] === ' ') j++; if (s[j] !== '[') return [null, i]; let d = 0; for (let k = j; k < s.length; k++) { const c = s[k]; if (c === '{') d++; else if (c === '}') d--; else if (c === ']' && !d) return [s.slice(j + 1, k), k + 1]; } return [null, i]; },
  arg(s, i) { let j = i; while (s[j] === ' ' || s[j] === '\n') j++; if (s[j] === '{') return this.grp(s, j); if (s[j] === '\\') { const m = s.slice(j).match(/^\\([a-zA-Z]+|.)/); return [m[0], j + m[0].length]; } return [s[j] || '', j + 1]; },
  strip: s => s.replace(/(^|[^\\])%.*$/gm, '$1').replace(/\\iffalse[\s\S]*?\\fi\b/g, ''),
  // inline text → HTML (bold, italic, accents, quotes, links, refs); \x00…\x00 placeholders pass through untouched
  inl(s) {
    let o = '', i = 0;
    const put = t => { o += esc(t); };
    while (i < s.length) {
      const c = s[i];
      if (c === '\x00') { const e = s.indexOf('\x00', i + 1); o += s.slice(i, e + 1); i = e + 1; continue; }
      if (c === '{') { const [g, n] = this.grp(s, i); const m = g.match(/^\s*\\(bf|bfseries|it|itshape|em|tt|ttfamily|sc|scshape)\b\s*/); o += m ? `<${{ bf: 'b', bfseries: 'b', it: 'i', itshape: 'i', em: 'em', tt: 'code', ttfamily: 'code', sc: 'span class="sc"', scshape: 'span class="sc"' }[m[1]]}>${this.inl(g.slice(m[0].length))}</${{ bf: 'b', bfseries: 'b', it: 'i', itshape: 'i', em: 'em', tt: 'code', ttfamily: 'code', sc: 'span', scshape: 'span' }[m[1]]}>` : this.inl(g); i = n; continue; }
      if (c === '}') { i++; continue; }
      if (c === '~') { o += '&nbsp;'; i++; continue; }
      if (c === '-' && s.startsWith('---', i)) { o += '—'; i += 3; continue; }
      if (c === '-' && s.startsWith('--', i)) { o += '–'; i += 2; continue; }
      if (c === '`' && s[i + 1] === '`') { o += '“'; i += 2; continue; }
      if (c === "'" && s[i + 1] === "'") { o += '”'; i += 2; continue; }
      if (c === '\\') {
        const m = s.slice(i).match(/^\\([a-zA-Z]+|.)\*?/); if (!m) { i++; continue; }
        const name = m[1]; let j = i + m[0].length;
        if (name === '\\') { const [, n] = this.opt(s, j); o += '<br>'; i = n; continue; }
        if (this.ACC[name] && !/^[a-zA-Z]{2,}$/.test(name)) { const [a, n] = this.arg(s, j); const base = a === '\\i' ? 'i' : a === '\\j' ? 'j' : a; o += esc((base + this.ACC[name]).normalize('NFC')); i = n; continue; }
        if (/^[%&#$_{}]$/.test(name)) { put(name); i = j; continue; }
        if (name in this.SYM) { put(name === 'today' ? new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : this.SYM[name]); if (/^[a-zA-Z]+$/.test(name) && s[j] === '{' && s[j + 1] === '}') j += 2; else if (/^[a-zA-Z]+$/.test(name) && s[j] === ' ') j++; i = j; continue; }
        if (name === 'IeC' || name === 'texorpdfstring') { const [a, n] = this.arg(s, j); let k = n; if (name === 'texorpdfstring') k = this.arg(s, n)[1]; o += this.inl(a); i = k; continue; }
        if (name === 'textcolor' || name === 'colorbox') { j = this.arg(s, j)[1]; }
        if (name === 'makebox' || name === 'framebox') { j = this.opt(s, j)[1]; j = this.opt(s, j)[1]; }
        if (this.WRAP[name]) { const [a, n] = this.arg(s, j), t = this.WRAP[name]; o += `<${t}>${this.inl(a)}</${t.split(' ')[0]}>`; i = n; continue; }
        if (name === 'url' || name === 'path') { const [a, n] = this.arg(s, j); o += `<a href="${esc(a)}" target="_blank" rel="noopener">${esc(a)}</a>`; i = n; continue; }
        if (name === 'href') { const [u, n] = this.arg(s, j), [t, n2] = this.arg(s, n); o += `<a href="${esc(u)}" target="_blank" rel="noopener">${this.inl(t)}</a>`; i = n2; continue; }
        if (name === 'footnote') { const [, n0] = this.opt(s, j), [a, n] = this.arg(s, n0); this.notes.push(this.inl(a)); const k = this.notes.length; o += `<sup class="tex-fn"><a href="#tex-fn-${k}">${k}</a></sup>`; i = n; continue; }
        if (/^(cite|citep|citet|citealp|parencite|textcite|autocite|nocite)$/.test(name)) { const [, n0] = this.opt(s, j), [, n1] = this.opt(s, n0), [a, n] = this.arg(s, n1); if (name !== 'nocite') o += `<span class="tex-cite">[${esc(a.split(',').map(x => this.bib[x.trim()] || x.trim()).join(', '))}]</span>`; i = n; continue; }
        if (/^(ref|eqref|autoref|cref|Cref|pageref|nameref)$/.test(name)) { const [a, n] = this.arg(s, j), v = this.labels[a.trim()]; o += `<span class="tex-ref">${esc(name === 'eqref' ? `(${v || '?'})` : v || '?')}</span>`; i = n; continue; }
        if (name === 'includegraphics') { const [, n0] = this.opt(s, j), [a, n] = this.arg(s, n0); o += `<span class="tex-img">${ic('image', 'sm')}${esc(a.split('/').pop())}</span>`; i = n; continue; }
        if (name === 'item') { const [a, n] = this.opt(s, j); if (a != null) o += `<b>${this.inl(a)}</b> `; i = n; continue; }
        if (this.DROP.test(name)) { // skip the command and its arguments
          if (/^(newcommand|renewcommand|providecommand)$/.test(name)) { j = this.arg(s, j)[1]; j = this.opt(s, j)[1]; j = this.opt(s, j)[1]; j = this.arg(s, j)[1]; }
          else if (name === 'def') { const mm = s.slice(j).match(/^\s*\\[a-zA-Z]+[^{]*/); j += mm ? mm[0].length : 0; j = this.arg(s, j)[1]; }
          else if (/^(newenvironment|renewenvironment)$/.test(name)) { j = this.arg(s, j)[1]; j = this.opt(s, j)[1]; j = this.opt(s, j)[1]; j = this.arg(s, j)[1]; j = this.arg(s, j)[1]; }
          else if (/^(label|index|hspace|vspace|addvspace|pagestyle|thispagestyle|pagenumbering|bibliographystyle|bibliography|usepackage|documentclass|input|include|includeonly|graphicspath|hypersetup|geometry|selectlanguage|color|cline|cmidrule|captionsetup|lstset|newtheorem|definecolor|setcounter|addtocounter|setlength|addtolength|addcontentsline)$/.test(name)) {
            j = this.opt(s, j)[1]; const many = { setcounter: 2, addtocounter: 2, setlength: 2, addtolength: 2, definecolor: 3, newtheorem: 2, addcontentsline: 3 }[name] || 1; for (let q = 0; q < many; q++) j = this.arg(s, j)[1]; j = this.opt(s, j)[1];
          }
          i = j; while (s[i] === ' ') i++; continue;
        }
        // an unknown command: keep what it wraps
        const [, n0] = this.opt(s, j); if (s[n0] === '{') { const [a, n] = this.grp(s, n0); o += this.inl(a); i = n; } else { i = n0; if (s[i] === ' ') i++; }
        continue;
      }
      put(c); i++;
    }
    return o;
  },
  // maths: kept as TeX in a placeholder, KaTeX renders it after the page is on screen
  mathPh(tex, disp) { this.blocks.push(`<span class="tex-m${disp ? ' disp' : ''}" data-tex="${esc(tex.trim())}">${esc(tex.trim())}</span>`); return `\x00${this.blocks.length - 1}\x00`; },
  ph(html) { this.blocks.push(html); return `\x00${this.blocks.length - 1}\x00`; },
  paras(s) { // blank lines → paragraphs; block placeholders stand on their own
    return s.split(/\n\s*\n/).map(ch => ch.trim()).filter(Boolean).map(ch => ch.split(/(\x00\d+\x00)/).map(p => {
      if (/^\x00\d+\x00$/.test(p)) return this.blockSet.has(+p.slice(1, -1)) ? p : this.inl(p);
      return p;
    }).reduce((acc, p) => { // glue inline pieces into <p>…</p>, block pieces stay outside
      if (/^\x00\d+\x00$/.test(p) && this.blockSet.has(+p.slice(1, -1))) acc.push({ b: p }); else { const last = acc.at(-1); if (last && 't' in last) last.t += p; else acc.push({ t: p }); }
      return acc;
    }, []).map(x => x.b || (x.t.trim() ? `<p>${this.inl(x.t)}</p>` : '')).join('')).join('');
  },
  block(html) { const k = this.blocks.push(html) - 1; this.blockSet.add(k); return `\n\n\x00${k}\x00\n\n`; },
  table(body) {
    const rows = body.replace(/\\(toprule|midrule|bottomrule|hline|endhead|endfirsthead|endfoot|endlastfoot)\b/g, '').replace(/\\cline\{[^}]*\}|\\cmidrule(\([^)]*\))?\{[^}]*\}/g, '').split(/\\\\(?:\[[^\]]*\])?/).map(r => r.trim()).filter(Boolean);
    return `<div class="tex-tbl"><table>${rows.map((r, n) => `<tr>${r.split(/(?<!\\)&/).map(c => { const mc = c.trim().match(/^\\multicolumn\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}$/); const T = n === 0 && /\\textbf|\\bf/.test(r) ? 'th' : 'td'; return mc ? `<${T} colspan="${mc[1]}">${this.inl(mc[2])}</${T}>` : `<${T}>${this.inl(c.trim())}</${T}>`; }).join('')}</tr>`).join('')}</table></div>`;
  },
  env(name, body, optArg) {
    const n = name.replace('*', '');
    if (/^(itemize|enumerate|description|compactitem|compactenum|inparaenum|asparaenum)$/.test(n)) {
      const parts = body.split(/\\item\b/).slice(1), tag = /enum/.test(n) ? 'ol' : 'ul';
      return this.block(`<${tag} class="tex-${n}">${parts.map(p => { const [lab, k] = this.opt(p, 0); return `<li>${lab != null ? `<b>${this.inl(lab)}</b> ` : ''}${this.paras(p.slice(lab != null ? k : 0)).replace(/^<p>([\s\S]*?)<\/p>$/, '$1')}</li>`; }).join('')}</${tag}>`);
    }
    if (n === 'thebibliography') {
      const parts = body.split(/\\bibitem\b/).slice(1);
      return this.block(`<h2 class="tex-h">Kaynaklar</h2><ol class="tex-bib">${parts.map(p => { const [lab, k0] = this.opt(p, 0), [key, k] = this.arg(p, k0); return `<li id="bib-${esc(key)}">${this.inl(p.slice(k).replace(/\\newblock\b/g, ' '))}</li>`; }).join('')}</ol>`);
    }
    if (/^(tabular|tabularx|tabulary|longtable|array|tabu)$/.test(n)) { let b = body; if (n === 'tabularx' || n === 'tabulary') b = b.replace(/^\s*\{[^}]*\}/, ''); b = b.replace(/^\s*\{([^{}]|\{[^{}]*\})*\}/, ''); return this.block(this.table(b)); }
    if (/^(equation|align|gather|multline|eqnarray|flalign|alignat|math|displaymath)$/.test(n)) return body; // already handled as maths
    if (/^(verbatim|lstlisting|minted|Verbatim|comment)$/.test(n)) return n === 'comment' ? '' : this.block(`<pre class="tex-code">${esc(body.replace(/^\n|\n$/g, ''))}</pre>`);
    if (n === 'abstract') return this.block(`<div class="tex-abs"><div class="tex-abs-h">Özet</div>${this.paras(body)}</div>`);
    if (/^(quote|quotation|verse)$/.test(n)) return this.block(`<blockquote>${this.paras(body)}</blockquote>`);
    if (/^(figure|table|wrapfigure|sidewaystable|sidewaysfigure)$/.test(n)) {
      let cap = ''; const b = body.replace(/\\caption(\[[^\]]*\])?\s*\{/, (m, _o, off) => { const [c] = this.grp(body, off + m.length - 1); cap = c; return '\\captiondone{'; }).replace(/\\captiondone\{/, () => ''), rest = cap ? b.replace(cap + '}', '') : b;
      const num = cap ? ++this.cnt[n === 'table' || /table/.test(n) ? 'tab' : 'fig'] : 0;
      return this.block(`<figure class="tex-fig">${this.paras(rest)}${cap ? `<figcaption><b>${/table/.test(n) ? 'Tablo' : 'Şekil'} ${num}:</b> ${this.inl(cap)}</figcaption>` : ''}</figure>`);
    }
    if (/^(theorem|lemma|proof|definition|corollary|proposition|remark|example|note)$/.test(n)) {
      const lab = { theorem: 'Teorem', lemma: 'Lemma', proof: 'Kanıt', definition: 'Tanım', corollary: 'Sonuç', proposition: 'Önerme', remark: 'Not', example: 'Örnek', note: 'Not' }[n];
      return this.block(`<div class="tex-thm"><b>${lab}${n !== 'proof' ? ' ' + (++this.cnt.thm) : ''}${optArg ? ` (${this.inl(optArg)})` : ''}.</b> ${this.paras(body).replace(/^<p>/, '').replace(/<\/p>$/, '')}</div>`);
    }
    if (n === 'center') return this.block(`<div class="tex-center">${this.paras(body)}</div>`);
    if (n === 'document') return body;
    return this.block(`<div class="tex-env">${this.paras(body)}</div>`);
  },
  tex(src) {
    this.blocks = []; this.blockSet = new Set(); this.labels = {}; this.notes = []; this.bib = {}; this.cnt = { fig: 0, tab: 0, eq: 0, thm: 0 }; this.macros = {};
    let s = this.strip(src.replace(/\r\n?/g, '\n'));
    // verbatim first: nothing inside it is LaTeX
    s = s.replace(/\\begin\{(verbatim|lstlisting|minted|Verbatim)\}(\[[^\]]*\]|\{[^}]*\})*([\s\S]*?)\\end\{\1\}/g, (m, e, _a, b) => this.block(`<pre class="tex-code">${esc(b.replace(/^\n|\n$/g, ''))}</pre>`));
    s = s.replace(/\\verb([^a-zA-Z\s])([\s\S]*?)\1/g, (m, d, b) => this.ph(`<code>${esc(b)}</code>`));
    // simple macros (\newcommand{\R}{\mathbb{R}}): KaTeX gets them, zero-argument ones expand in text too
    s.replace(/\\(?:re)?newcommand\*?\s*\{?\\([a-zA-Z]+)\}?\s*(?:\[(\d)\])?\s*\{/g, (m, nm, na, off) => { const [d] = this.grp(s, off + m.length - 1); this.macros['\\' + nm] = d; if (!na) this.zero = { ...(this.zero || {}), [nm]: d }; return m; });
    const zero = this.zero || {}; this.zero = null;
    const title = (re => { const m = s.match(re); return m ? this.grp(s, m.index + m[0].length - 1)[0] : ''; });
    const T = title(/\\title\s*(\[[^\]]*\])?\s*\{/), A = title(/\\author\s*\{/), D = title(/\\date\s*\{/);
    const bd = s.match(/\\begin\{document\}([\s\S]*?)(\\end\{document\}|$)/); if (bd) s = bd[1];
    for (const [nm, d] of Object.entries(zero)) s = s.replace(new RegExp('\\\\' + nm + '(?![a-zA-Z])\\s?', 'g'), d.replace(/\$/g, '$$$$') + ' ');
    // bibliography keys → numbers for \cite
    let bn = 0; s.replace(/\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g, (m, k) => { this.bib[k.trim()] = String(++bn); return m; });
    // display maths (numbered environments get (n) and their \label)
    s = s.replace(/\\begin\{(equation|align|gather|multline|eqnarray|flalign|alignat|displaymath|math)(\*?)\}(\{\d+\})?([\s\S]*?)\\end\{\1\2\}/g, (m, e, star, _a, b) => {
      const numbered = !star && !/math/.test(e); let tag = '';
      if (numbered) { tag = String(++this.cnt.eq); b.replace(/\\label\{([^}]+)\}/g, (x, l) => { this.labels[l] = tag; }); }
      b = b.replace(/\\label\{[^}]*\}/g, '').replace(/\\nonumber|\\notag/g, '');
      const body = e === 'equation' || /math/.test(e) ? b : `\\begin{${e === 'eqnarray' ? 'aligned' : e === 'multline' ? 'gathered' : e === 'gather' ? 'gathered' : e === 'alignat' ? 'aligned' : 'aligned'}}${b}\\end{${e === 'eqnarray' || e === 'alignat' || e === 'align' || e === 'flalign' ? 'aligned' : 'gathered'}}`;
      return this.block(this.mathPh(body, true).replace(/\x00(\d+)\x00/, (x, k) => this.blocks[k]) + (tag ? `<span class="tex-eqn">(${tag})</span>` : '')).replace(/\x00(\d+)\x00/, (x, k) => { this.blocks[k] = `<div class="tex-eq">${this.blocks[k]}</div>`; return x; });
    });
    s = s.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (m, a, b) => this.block(`<div class="tex-eq">${this.blocks[+this.mathPh(a ?? b, true).slice(1, -1)]}</div>`));
    s = s.replace(/\\\(([\s\S]+?)\\\)|(?<!\\)\$((?:\\\$|[^$])+?)\$/g, (m, a, b) => this.mathPh(a ?? b, false));
    // sections, numbered like LaTeX, with their labels
    const lv = { part: 0, chapter: 1, section: 2, subsection: 3, subsubsection: 4, paragraph: 5, subparagraph: 6 }, num = [0, 0, 0, 0, 0, 0, 0], hasCh = /\\chapter\b/.test(s);
    let out = '', i = 0; const re = /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)(\*?)\s*(?:\[[^\]]*\])?\s*\{/g; let m;
    while ((m = re.exec(s))) {
      const [t, end] = this.grp(s, m.index + m[0].length - 1), L = lv[m[1]]; out += s.slice(i, m.index); i = end; re.lastIndex = end;
      let n = '';
      if (!m[2] && L <= 4) { num[L]++; for (let k = L + 1; k < 7; k++) num[k] = 0; n = L === 0 ? '' : num.slice(hasCh ? 1 : 2, L + 1).join('.'); }
      const lab = s.slice(end).match(/^\s*\\label\{([^}]+)\}/); if (lab && n) this.labels[lab[1]] = n;
      const h = L <= 1 ? 'h2' : L === 2 ? (hasCh ? 'h3' : 'h2') : L === 3 ? (hasCh ? 'h4' : 'h3') : L === 4 ? 'h4' : 'h5';
      out += L >= 5 ? `\n\n\\textbf{${t}} ` : this.block(`<${h} class="tex-h">${n ? `<span class="tex-n">${n}</span>` : ''}${this.inl(t)}</${h}>`);
    }
    s = out + s.slice(i);
    // other labels (figures, theorems) at least don't break \ref
    // environments, innermost first
    const er = /\\begin\{([a-zA-Z]+\*?)\}((?:(?!\\begin\{)[\s\S])*?)\\end\{\1\}/;
    for (let guard = 0; guard < 2000; guard++) {
      const e = s.match(er); if (!e) break;
      let body = e[2], oa = null; const o = this.opt(body, 0); if (o[0] != null && /^(theorem|lemma|definition|corollary|proposition|remark|example|note|proof)$/.test(e[1])) { oa = o[0]; body = body.slice(o[1]); }
      else if (o[0] != null && /^(figure|table|wrapfigure|sidewaystable|sidewaysfigure|minipage)\*?$/.test(e[1])) body = body.slice(o[1]);
      s = s.slice(0, e.index) + this.env(e[1], body, oa) + s.slice(e.index + e[0].length);
    }
    s = s.replace(/\\(begin|end)\{[^}]*\}/g, '');
    if (/\\maketitle/.test(s) || T) { const tt = `<header class="tex-title">${T ? `<h1>${this.inl(T)}</h1>` : ''}${A ? `<div class="tex-auth">${this.inl(A.replace(/\\and\b/g, ' · '))}</div>` : ''}${D ? `<div class="tex-date">${this.inl(D)}</div>` : ''}</header>`; s = /\\maketitle/.test(s) ? s.replace(/\\maketitle/, this.block(tt)) : this.block(tt) + s; }
    let html = this.paras(s);
    for (let k = 0; k < 20 && html.includes('\x00'); k++) html = html.replace(/\x00(\d+)\x00/g, (x, n) => this.blocks[n] ?? '');
    if (this.notes.length) html += `<ol class="tex-notes">${this.notes.map((t, k) => `<li id="tex-fn-${k + 1}">${t}</li>`).join('')}</ol>`;
    return html;
  },
  toc(src) { // \contentsline {section}{\numberline {1.2}Title}{5}{section.1.2}
    const lv = { part: 0, chapter: 1, section: 1, subsection: 2, subsubsection: 3, paragraph: 4, subparagraph: 5, figure: 1, table: 1 }, s = src.replace(/\r\n?/g, '\n'), rows = [];
    const hasCh = /\\contentsline\s*\{chapter\}/.test(s); this.blocks = []; this.blockSet = new Set(); this.labels = {}; this.notes = []; this.bib = {};
    const re = /\\contentsline\s*\{(\w+)\}\s*\{/g; let m;
    while ((m = re.exec(s))) {
      const [t, e1] = this.grp(s, m.index + m[0].length - 1), [pg, e2] = this.arg(s, e1); re.lastIndex = e2;
      let num = '', title = t; const nl = t.match(/\\numberline\s*\{/); if (nl) { const [n, e] = this.grp(t, nl.index + nl[0].length - 1); num = n; title = t.slice(0, nl.index) + t.slice(e); }
      title = title.replace(/\\ignorespaces\s*|\\relax\s*/g, '');
      let L = lv[m[1]] ?? 2; if (!hasCh && m[1] !== 'part' && L > 0 && !/figure|table/.test(m[1])) L = Math.max(1, L - (m[1] === 'section' ? 0 : 0));
      if (hasCh && m[1] !== 'chapter' && m[1] !== 'part' && !/figure|table/.test(m[1])) L += 1;
      const tx = title.replace(/\$([^$]+)\$/g, (x, a) => this.mathPh(a, false));
      rows.push(`<a class="toc-row l${L}${m[1] === 'part' || m[1] === 'chapter' || (!hasCh && m[1] === 'section') ? ' top' : ''}"><span class="toc-n">${esc(num)}</span><span class="toc-t">${this.inl(tx)}</span><span class="toc-dots"></span><span class="toc-p">${esc(this.inl(pg).replace(/<[^>]+>/g, ''))}</span></a>`);
    }
    let html = rows.length ? `<nav class="tex-toc"><h2 class="tex-h">İçindekiler</h2>${rows.join('')}</nav>` : '<p class="hint">Bu dosyada içindekiler satırı yok.</p>';
    html = html.replace(/\x00(\d+)\x00/g, (x, n) => this.blocks[n] ?? '');
    return html;
  },
  render(t, ext) {
    let body; try { body = /^(toc|lof|lot)$/.test(ext) ? this.toc(t) : this.tex(t); } catch (e) { console.warn('tex', e); body = null; }
    const label = { toc: 'İçindekiler (.toc)', lof: 'Şekil listesi', lot: 'Tablo listesi', bbl: 'Kaynakça (.bbl)' }[ext] || 'LaTeX belgesi';
    return `<div class="tex-view${body == null ? ' raw' : ''}"><div class="pdf-bar tex-bar">${ic('note', 'sm')}<span>${label}</span><span class="sp"></span><button class="btn secondary sm" data-texraw aria-pressed="${body == null}">${ic('text', 'sm')}<span>${body == null ? 'Biçimli' : 'Ham metin'}</span></button></div>`
      + `<div class="doc tex">${body ?? ''}</div><pre class="tex-raw">${esc(t.slice(0, 200000))}</pre></div>`;
  },
  katex: null,
  load() {
    if (this.katex) return this.katex;
    const V = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/';
    return this.katex = new Promise((ok, bad) => {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = V + 'katex.min.css'; l.crossOrigin = 'anonymous'; document.head.appendChild(l);
      const sc = document.createElement('script'); sc.src = V + 'katex.min.js'; sc.crossOrigin = 'anonymous'; sc.onload = () => ok(window.katex); sc.onerror = () => { this.katex = null; bad(new Error('KaTeX yüklenemedi')); }; document.head.appendChild(sc);
    });
  },
  async math(root) { // only when a page with maths is actually opened
    const els = [...root.querySelectorAll('.tex-m:not(.done)')]; if (!els.length) return;
    let k; try { k = await this.load(); } catch { els.forEach(e => e.classList.add('fail')); return; }
    for (const e of els) { try { k.render(e.dataset.tex, e, { displayMode: e.classList.contains('disp'), throwOnError: false, macros: { ...(this.macros || {}) }, strict: 'ignore', trust: false }); e.classList.add('done'); } catch { e.classList.add('fail'); } }
  },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-texraw]'); if (!b) return;
  const v = b.closest('.tex-view'), raw = v.classList.toggle('raw'); b.setAttribute('aria-pressed', raw); b.querySelector('span').textContent = raw ? 'Biçimli' : 'Ham metin';
});

// ---------- documents: markdown, csv/tsv, json, Word, Excel, PowerPoint, OpenDocument → readable HTML, in the browser ----------
const Docs = {
  ext: i => ((i.fileName || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '',
  can(i) { return /^(docx|xlsx|pptx|odt|ods|odp)$/.test(this.ext(i)); },
  async sniff(blob) { // null when it looks binary
    const b = new Uint8Array(await blob.slice(0, 65536).arrayBuffer()); if (!b.length) return null;
    let bad = 0; for (const c of b) { if (c === 0) return null; if (c < 9 || (c > 13 && c < 32)) bad++; }
    return bad / b.length > .05 ? null : new TextDecoder().decode(b);
  },
  async render(i, blob) {
    const e = this.ext(i);
    if (e === 'docx') return this.docx(await JSZip.loadAsync(blob));
    if (e === 'xlsx') return this.xlsx(await JSZip.loadAsync(blob));
    if (e === 'pptx') return this.pptx(await JSZip.loadAsync(blob));
    if (/^od[tsp]$/.test(e)) return this.odf(await JSZip.loadAsync(blob));
    const t = (await blob.slice(0, 400000).text());
    if (Tex.can(i)) return Tex.render(t, e);
    if (e === 'md' || e === 'markdown') return `<div class="doc md">${this.md(t)}</div>`;
    if (e === 'csv' || e === 'tsv') return this.table([this.csv(t, e === 'tsv' ? '\t' : null)], ['']);
    if (e === 'json') { try { return `<pre>${esc(JSON.stringify(JSON.parse(t), null, 2).slice(0, 60000))}</pre>`; } catch { } }
    return `<pre>${esc(t.slice(0, 60000))}</pre>`;
  },
  xml: s => new DOMParser().parseFromString(s, 'application/xml'),
  tags: (doc, name) => [...doc.getElementsByTagName(name)],
  async docx(z) {
    const f = z.file('word/document.xml'); if (!f) throw new Error('Word belgesi okunamadı');
    const doc = this.xml(await f.async('string'));
    const out = this.tags(doc, 'w:p').map(p => {
      const t = this.tags(p, 'w:t').map(x => x.textContent).join(''); if (!t.trim()) return '';
      const st = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') || '', h = st.match(/^(?:Heading|Başlık)(\d)/i), li = p.getElementsByTagName('w:numPr').length;
      return h ? `<h${Math.min(4, +h[1] + 1)}>${esc(t)}</h${Math.min(4, +h[1] + 1)}>` : li ? `<li>${esc(t)}</li>` : st === 'Title' ? `<h2>${esc(t)}</h2>` : `<p>${esc(t)}</p>`;
    }).join('');
    return `<div class="doc">${out.replace(/(<li>.*?<\/li>)+/g, m => `<ul>${m}</ul>`) || '<p class="hint">Belgede metin yok.</p>'}</div>`;
  },
  async xlsx(z) {
    const ss = z.file('xl/sharedStrings.xml') ? this.tags(this.xml(await z.file('xl/sharedStrings.xml').async('string')), 'si').map(si => this.tags(si, 't').map(t => t.textContent).join('')) : [];
    const wb = z.file('xl/workbook.xml') ? this.tags(this.xml(await z.file('xl/workbook.xml').async('string')), 'sheet').map(s => s.getAttribute('name')) : [];
    const files = Object.keys(z.files).filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/))).slice(0, 8);
    const col = r => { let n = 0; for (const ch of r.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    const sheets = [];
    for (const f of files) {
      const rows = [];
      for (const r of this.tags(this.xml(await z.file(f).async('string')), 'row').slice(0, 500)) {
        const row = [];
        for (const c of this.tags(r, 'c')) {
          const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '', k = col(c.getAttribute('r') || 'A');
          row[k] = t === 's' ? ss[+v] ?? '' : t === 'inlineStr' ? this.tags(c, 't').map(x => x.textContent).join('') : v;
        }
        rows.push([...row].map(x => x ?? ''));
      }
      sheets.push(rows);
    }
    return this.table(sheets, wb);
  },
  async pptx(z) {
    const files = Object.keys(z.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    let out = '';
    for (const [n, f] of files.entries()) {
      const ps = this.tags(this.xml(await z.file(f).async('string')), 'a:p').map(p => this.tags(p, 'a:t').map(t => t.textContent).join('')).filter(t => t.trim());
      out += `<section class="slide"><div class="slide-n">Slayt ${n + 1}</div>${ps.length ? `<h3>${esc(ps[0])}</h3>${ps.slice(1).map(t => `<p>${esc(t)}</p>`).join('')}` : '<p class="hint">Metin yok</p>'}</section>`;
    }
    return `<div class="doc slides">${out || '<p class="hint">Sunumda metin yok.</p>'}</div>`;
  },
  async odf(z) {
    const doc = this.xml(await z.file('content.xml').async('string'));
    const out = this.tags(doc, 'text:h').length + this.tags(doc, 'text:p').length ? [...doc.querySelectorAll('*')].filter(n => n.tagName === 'text:h' || n.tagName === 'text:p')
      .map(n => n.textContent.trim() ? (n.tagName === 'text:h' ? `<h3>${esc(n.textContent)}</h3>` : `<p>${esc(n.textContent)}</p>`) : '').join('') : '';
    return `<div class="doc">${out || '<p class="hint">Belgede metin yok.</p>'}</div>`;
  },
  csv(t, sep) {
    sep ||= (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let k = 0; k < t.length && rows.length < 500; k++) {
      const ch = t[k];
      if (q) { if (ch === '"') { if (t[k + 1] === '"') { cur += '"'; k++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[k + 1] === '\n') k++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  },
  table(sheets, names) {
    return `<div class="doc sheet">${sheets.map((rows, n) => `${sheets.length > 1 ? `<div class="sheet-n">${esc(names[n] || 'Sayfa ' + (n + 1))}</div>` : ''}
      <div class="tbl-wrap"><table>${rows.map((r, k) => `<tr>${r.map(c => k ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</table></div>`).join('') || '<p class="hint">Tablo boş.</p>'}</div>`;
  },
  md(t) { // small, safe markdown: escape first, then headings, lists, quotes, code, bold/italic, links, tables
    const inl = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const L = esc(t).split('\n'), out = []; let list = null, code = false, buf = [];
    const flush = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (let k = 0; k < L.length; k++) {
      const l = L[k];
      if (/^```/.test(l)) { if (code) { out.push(`<pre>${buf.join('\n')}</pre>`); buf = []; code = false; } else { flush(); code = true; } continue; }
      if (code) { buf.push(l); continue; }
      let m;
      if ((m = l.match(/^(#{1,6})\s+(.*)/))) { flush(); const n = Math.min(4, m[1].length + 1); out.push(`<h${n}>${inl(m[2])}</h${n}>`); }
      else if ((m = l.match(/^\s*[-*+]\s+(\[[ xX]\]\s+)?(.*)/))) { if (list !== 'ul') { flush(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${m[1] ? (/x/i.test(m[1]) ? '☑ ' : '☐ ') : ''}${inl(m[2])}</li>`); }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { flush(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inl(m[1])}</li>`); }
      else if ((m = l.match(/^&gt;\s?(.*)/))) { flush(); out.push(`<blockquote>${inl(m[1])}</blockquote>`); }
      else if (/^\|.*\|\s*$/.test(l) && /^\|?\s*:?-{2,}/.test(L[k + 1] || '')) {
        flush(); const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => inl(c.trim()));
        let h = `<div class="tbl-wrap"><table><tr>${cells(l).map(c => `<th>${c}</th>`).join('')}</tr>`; k++;
        while (/^\|.*\|\s*$/.test(L[k + 1] || '')) h += `<tr>${cells(L[++k]).map(c => `<td>${c}</td>`).join('')}</tr>`;
        out.push(h + '</table></div>');
      }
      else if (/^(-{3,}|\*{3,})$/.test(l.trim())) { flush(); out.push('<hr>'); }
      else if (!l.trim()) flush();
      else { flush(); out.push(`<p>${inl(l)}</p>`); }
    }
    if (code) out.push(`<pre>${buf.join('\n')}</pre>`); flush();
    return out.join('');
  },
};

// ---------- reading page: one calm column, for articles, PDFs, documents and long notes ----------
// opened from the item window, the list ("Oku") or ⋯ → Okuma listesi; ← → walk through the same list; Claude in a side panel
const Read = {
  readable: i => !!i && !i.deleted && ((i.type === 'link' && !ytId(i)) || (i.type === 'note' && !i.sticky && (i.text || '').length > 280) || ['pdf', 'text'].includes(fileKind(i)) || (i.type === 'file' && Docs.can(i))),
  answers: {},
  list() { return visible().filter(this.readable); },
  queue() { // the reading list: unread articles and documents first, newest first
    const q = alive().filter(i => this.readable(i) && (i.type !== 'link' || i.read || Reader.wanted(i)));
    const un = q.filter(i => !i.seenAt), first = (un[0] || q[0]);
    if (!first) return toast('Okunacak bir şey yok. Link, PDF ya da uzun not kaydedince burada çıkar.', 3200, 'book');
    this.open(first.id, [...un, ...q.filter(i => i.seenAt)].map(i => i.id));
  },
  async open(id, ids) {
    let i = byId(id); if (!i) return; markSeen(i);
    if (i.type === 'link' && !i.read) {
      if (!S.bridgeOk && !(await AI.health())) return toast(claudeOff(), 3200, 'cpu');
      toast('Okunur kopya alınıyor…', 8000, 'spark');
      if (!(await Reader.fetch(i))) return toast('Bu sayfadan okunur metin çıkmadı', 3000);
      $('#toast').hidden = true; i = byId(id);
    }
    this.ids = ids || this.ids?.includes(id) && this.ids || this.list().map(x => x.id);
    if (!this.ids.includes(id)) this.ids.unshift(id);
    this.id = id; $('#sheet').open && $('#sheet').close();
    const d = $('#reading'); this.draw(); if (!d.open) Back.open(d); d.querySelector('.rp-main').scrollTop = 0;
  },
  body(i) {
    const hs = i.highlights || [];
    const mark = x => { let h = esc(x); for (const hl of hs) { const t = esc(hl.text); if (t.length > 2 && h.includes(t)) h = h.split(t).join(`<mark data-h="${hl.id}">${t}</mark>`); } return h; };
    if (i.type === 'link') { const tag = { h: 'h3', p: 'p', li: 'li', q: 'blockquote', code: 'pre' }, r = i.read;
      return `${r.byline ? `<div class="r-by">${esc(r.byline)}</div>` : ''}${r.image ? `<img class="r-img" src="${esc(r.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}${r.blocks.map(b => `<${tag[b.t] || 'p'}>${mark(b.x)}</${tag[b.t] || 'p'}>`).join('')}`; }
    if (i.type === 'note') return i.text.split(/\n{2,}/).map(p => `<p>${mark(p).replace(/\n/g, '<br>')}</p>`).join('');
    return '<div class="rp-file"><div class="prev-empty">Açılıyor…</div></div>';
  },
  draw() {
    const i = byId(this.id), d = $('#reading'), n = this.ids.indexOf(this.id), hs = i.highlights || [], a = this.answers[i.id];
    const meta = i.type === 'link' ? `${esc(i.read?.site || domain(i.url))} · ${Reader.minutes(i)} dk` : i.type === 'note' ? `Not · ${Math.max(1, Math.round(i.text.split(/\s+/).length / 220))} dk` : `${esc(extOf(i))} · ${fmtSize(i.size)}`;
    d.innerHTML = `<div class="rp-bar"><button class="icon-btn" data-rp="close" title="Kapat (Esc)" aria-label="Kapat">${ic('x')}</button>
        <span class="rp-meta">${meta}</span><span class="sp"></span>
        <span class="rp-pos">${n + 1} / ${this.ids.length}</span>
        <button class="icon-btn" data-rp="prev" title="Önceki (←)" aria-label="Önceki" ${n <= 0 ? 'disabled' : ''}>${ic('chev', 'flip')}</button>
        <button class="icon-btn" data-rp="next" title="Sonraki (→)" aria-label="Sonraki" ${n >= this.ids.length - 1 ? 'disabled' : ''}>${ic('chev')}</button>
        ${i.type === 'link' ? `<a class="icon-btn" href="${esc(i.url)}" target="_blank" rel="noopener" title="Sayfayı aç" aria-label="Sayfayı aç">${ic('ext')}</a>` : ''}
        <button class="btn ${this.side ? 'ai' : 'ghost'} sm" data-rp="side" aria-expanded="${!!this.side}">${ic('spark', 'sm')}${aiTo()} sor${hs.length ? ` · ${hs.length} işaret` : ''}</button></div>
      <div class="rp-wrap${this.side ? ' side' : ''}"><div class="rp-main"><article class="rp-doc r-body"><h1>${esc(i.read?.title || titleOf(i))}</h1>${this.body(i)}</article>
        <p class="hint rp-tip">Bir yeri seç → <b>İşaretle</b>. İşaretlediklerin aramada da çıkar.</p></div>
      ${this.side ? `<aside class="rp-side">
        <form class="rp-ask"><input placeholder="Bu kaynağa sor: özetle, ana fikir ne?" aria-label="Bu kaynağa sor" enterkeyhint="send"><button class="btn ai sm">Sor</button></form>
        <div class="rp-sugg">${['Kısaca özetle', 'Ana fikir ne?', 'Benim için neden önemli olabilir?'].map(q => `<button class="lchip" data-rq="${q}">${q}</button>`).join('')}</div>
        ${a ? `<div class="rp-ans">${a.busy ? '<div class="skel" style="width:90%"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:50%"></div>' : `<div class="a-q">${esc(a.q)}</div>${esc(a.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}`}</div>` : ''}
        <div class="field-label">İşaretlediklerin · ${hs.length}</div>
        ${hs.length ? hs.map(h => `<blockquote data-goto="${h.id}">${esc(h.text)}<button class="link-btn" data-hrm="${h.id}">Kaldır</button></blockquote>`).join('') : '<p class="hint">Henüz yok.</p>'}
      </aside>` : ''}</div>`;
    const f = d.querySelector('.rp-file'); if (f) Docs.can(i) || fileKind(i) !== 'pdf' ? showPreview(i, f) : this.pdf(i, f);
  },
  async pdf(i, box) { // pages fill the reading column
    try {
      const doc = await Prev.pdfDoc(i), w = Math.min(1600, box.clientWidth * (devicePixelRatio || 1)); box.innerHTML = '';
      for (let n = 1; n <= Math.min(doc.numPages, 60); n++) { if (!document.body.contains(box)) break; const c = await Prev.renderPage(doc, n, w); c.className = 'rp-page'; box.appendChild(c); }
    } catch { box.innerHTML = '<div class="prev-empty">PDF açılamadı</div>'; }
  },
  go(d) { const n = this.ids.indexOf(this.id) + d; if (n >= 0 && n < this.ids.length) this.open(this.ids[n]); },
  async ask(q) {
    const i = byId(this.id); if (!q.trim()) return;
    if (!S.bridgeOk && !(await AI.health())) { this.answers[i.id] = { q, text: claudeOff() }; return this.draw(); }
    this.answers[i.id] = { q, busy: true }; this.draw();
    try { const r = await AI.call('/ask', { question: `Kaynak id=${i.id} hakkında: ${q}. Kısa ve Türkçe cevap ver.`, items: AI.pick(q, [i]) }); this.answers[i.id] = { q, text: r.answer }; }
    catch (e) { this.answers[i.id] = { q, text: 'Hata: ' + e.message }; }
    if (this.id === i.id) this.draw();
  },
  selTip() {
    $('#stip')?.remove();
    const s = getSelection(), t = s && !s.isCollapsed ? s.toString().replace(/\s+/g, ' ').trim() : '';
    if (t.length < 3 || !$('#reading .rp-doc')?.contains(s.anchorNode)) return;
    const r = s.getRangeAt(0).getBoundingClientRect(), el = document.createElement('div'); el.id = 'stip'; el.className = 'rtip';
    el.innerHTML = `<button class="btn primary sm">${ic('pen', 'sm')}İşaretle</button>`;
    el.addEventListener('mousedown', e => e.preventDefault());
    el.onclick = async () => { const i = byId(this.id); el.remove(); getSelection().removeAllRanges(); await upsert([{ ...i, highlights: [...(i.highlights || []), { id: newId(), text: t.slice(0, 2000), at: now() }] }]); this.keep(() => this.draw()); };
    $('#reading').appendChild(el); el.style.left = Math.max(8, r.left + r.width / 2 - el.offsetWidth / 2) + 'px'; el.style.top = Math.max(56, r.top - el.offsetHeight - 8) + 'px';
  },
  keep(fn) { const m = $('#reading .rp-main'), y = m?.scrollTop; fn(); const m2 = $('#reading .rp-main'); if (m2) m2.scrollTop = y; },
  init() {
    const d = document.createElement('dialog'); d.id = 'reading'; d.className = 'readpage'; d.setAttribute('aria-label', 'Okuma'); document.body.appendChild(d);
    d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; $('#stip')?.remove(); });
    d.addEventListener('click', async e => {
      const a = e.target.closest('[data-rp]')?.dataset.rp;
      if (a === 'close') return d.close();
      if (a === 'prev') return this.go(-1);
      if (a === 'next') return this.go(1);
      if (a === 'side') { this.side = !this.side; try { localStorage.setItem('hn-rside', this.side ? '1' : ''); } catch { } return this.keep(() => this.draw()); }
      const rq = e.target.closest('[data-rq]'); if (rq) return this.ask(rq.dataset.rq);
      const rm = e.target.closest('[data-hrm]'); if (rm) { const i = byId(this.id); await upsert([{ ...i, highlights: (i.highlights || []).filter(h => h.id !== rm.dataset.hrm) }]); return this.keep(() => this.draw()); }
      const g = e.target.closest('[data-goto]'); if (g) return d.querySelector(`mark[data-h="${g.dataset.goto}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    d.addEventListener('submit', e => { e.preventDefault(); const inp = e.target.querySelector('input'); const q = inp.value; inp.value = ''; this.ask(q); });
    d.addEventListener('mouseup', () => setTimeout(() => this.selTip(), 0));
    d.addEventListener('touchend', () => setTimeout(() => this.selTip(), 250));
    d.addEventListener('keydown', e => { if (e.target.closest('input')) return; if (e.key === 'ArrowRight') this.go(1); else if (e.key === 'ArrowLeft') this.go(-1); });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('#stip')) $('#stip')?.remove(); });
    try { this.side = localStorage.getItem('hn-rside') === '1'; } catch { }
  },
};

// ---------- reminders while the app is open: a due task shows up (system notification on the phone; on the PC the bridge notifies) ----------
const Remind = {
  seen() { try { return new Set(JSON.parse(localStorage.getItem('hn-reminded') || '[]')); } catch { return new Set(); } },
  async ask() { // ask once, when the first task gets a time
    if (!('Notification' in window) || Notification.permission !== 'default' || this.asked) return; this.asked = true;
    try { await Notification.requestPermission(); } catch { }
  },
  tick() {
    const t = now(), seen = this.seen(); let ch = false;
    for (const i of S.items) {
      const d = i.todo; if (!d || d.done || i.deleted || !d.due) continue;
      const at = new Date(d.due.includes('T') ? d.due : d.due + 'T09:00').getTime(), key = i.id + '@' + d.due;
      if (at > t || t - at > 6 * 3600e3 || seen.has(key)) continue;
      seen.add(key); ch = true; const txt = d.text || titleOf(i);
      toast('Görev zamanı: ' + txt, 8000, 'clock', { label: 'Göster', fn: () => setView('todo') });
      if (!BridgeLink.local() && 'Notification' in window && Notification.permission === 'granted')
        navigator.serviceWorker?.ready.then(r => r.showNotification('Nts · görev zamanı', { body: txt, icon: 'icons/icon-192.png', tag: key, data: { view: 'todo' } })).catch(() => { try { new Notification('Nts · görev zamanı', { body: txt }); } catch { } });
    }
    if (ch) try { localStorage.setItem('hn-reminded', JSON.stringify([...seen].slice(-500))); } catch { }
  },
  init() { setInterval(() => this.tick(), 30e3); setTimeout(() => this.tick(), 3000); },
};

// ---------- "Claude çalışıyor": a calm pill while Claude does something in the background ----------
const Busy = {
  jobs: new Map(), n: 0,
  label(path, body) {
    const k = path.split('?')[0];
    if (k === '/organize') { const n = body?.items?.length || 0; return n > 1 ? `${n} kaydı düzenliyor` : 'yeni kaydı düzenliyor'; }
    if (k === '/ask') return /^Kayıt id=/.test(body?.question || '') ? 'kaydı inceliyor' : 'soruna bakıyor';
    if (k === '/article') return 'okunur kopya alıyor';
    if (k === '/tags') return 'konuları topluyor';
    if (k === '/ocr') return 'resimlerdeki yazıyı okuyor';
    return null; // health, inbox, snapshot, meta: not Claude
  },
  start(label) { const id = ++this.n; this.jobs.set(id, label); this.draw(); return id; },
  end(id) { this.jobs.delete(id); clearTimeout(this.t); this.t = setTimeout(() => this.draw(), 400); },
  draw() {
    let el = $('#busy');
    if (!el) { el = document.createElement('div'); el.id = 'busy'; el.className = 'busy'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    const all = [...this.jobs.values()], on = all.length > 0;
    el.classList.toggle('on', on);
    if (on) el.innerHTML = `<span class="b-dot"></span><b>${esc(aiName())}</b><span class="b-t">${esc(all[0])}${all.length > 1 ? ` · +${all.length - 1}` : ''}</span>`;
    el.title = on ? '' + aiName() + ' arka planda çalışıyor: ' + all.join(', ') : '';
  },
};

// ---------- left rail: fold away, and the drawing palette slides out of it ----------
const Rail = {
  init() {
    try { S.railOff = localStorage.getItem('hn-rail') === 'off'; S.palOpen = localStorage.getItem('hn-pal') === '1'; } catch { }
    this.apply();
    addEventListener('keydown', e => { if (e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') && !document.querySelector('dialog[open]')) { e.preventDefault(); this.fold(); } });
  },
  apply() {
    document.body.classList.toggle('rail-off', !!S.railOff); $('#railTab').hidden = !S.railOff;
    document.body.classList.toggle('pal-open', !!S.palOpen); this.place();
  },
  // 88b/88c: rail folded + palette open → the > is an ear on the palette's right edge (same surface, no seam);
  // palette closed → the > alone where the rail's < was
  place() {
    requestAnimationFrame(() => {
      const r = $('#rail').getBoundingClientRect(), p = $('#pal'), pr = !p.hidden && p.getBoundingClientRect(), bs = document.body.style;
      const ear = !!(S.railOff && pr && pr.height && innerWidth >= 900); $('#railTab').classList.toggle('ear', ear);
      const th = $('#railTab').offsetHeight || 32; // 113: the > sits on the vertical middle of what it opens (rail, or the palette it hangs on)
      if (ear) { bs.setProperty('--rt-left', 16 + Math.round(pr.width) - 1 + 'px'); bs.setProperty('--rt-top', Math.round(pr.top + pr.height / 2 - th / 2) + 'px'); return; } // 16: the palette's folded left (70 - 54), not mid-slide
      bs.removeProperty('--rt-left');
      bs.setProperty('--rt-top', Math.max(8, Math.round(r.height ? r.top + r.height / 2 - th / 2 : innerHeight / 2 - th / 2)) + 'px');
    });
  },
  fold() { S.railOff = !S.railOff; Pop.close(); try { localStorage.setItem('hn-rail', S.railOff ? 'off' : ''); } catch { } this.apply(); render(); },
  pal(open = !S.palOpen) { S.palOpen = open; if (!open) Ink.use('select'); try { localStorage.setItem('hn-pal', open ? '1' : ''); } catch { } this.apply(); render(); },
};

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
    else { // beside the rail, the whole menu on screen: as tall as the screen allows, bottom-aligned with the button when that fits better
      p.style.maxHeight = Math.min(560, innerHeight - 24) + 'px';
      const h = p.offsetHeight, top = Math.min(r.top - 8, innerHeight - h - 12);
      p.style.left = r.right + 12 + 'px'; p.style.top = Math.max(12, top) + 'px'; p.style.transformOrigin = 'left top';
      if (r.top - 8 > innerHeight - h - 12) { p.style.top = Math.max(12, r.bottom - h + 8) + 'px'; p.style.transformOrigin = 'left bottom'; }
    }
  },
  close() { // 90: fade out instead of vanishing
    const p = $('#filterPop'); if (!p || p.hidden || p.classList.contains('closing')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { p.hidden = true; return; }
    p.classList.add('closing'); setTimeout(() => { p.classList.remove('closing'); p.hidden = true; }, 120);
  },
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
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; this.lock(); });
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
      <p class="hint">Şifrelerin, kart ve kapı kodların için ayrı bir kasa. Kendi ana şifresiyle açılır, bu cihazda şifrelenir; sunucuya sadece şifreli hali gider. ${aiName()} ve arama içini hiç görmez.</p>
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
        <form class="v-form v-entry" data-f="entry"><label class="set-field">Ad<input name="name" value="${esc(e.name || '')}" placeholder="ör. Gmail, banka, kapı kodu" required></label>
          <label class="set-field">Site<input name="url" value="${esc(e.url || '')}" placeholder="https://" inputmode="url"></label>
          <label class="set-field">Kullanıcı adı / e-posta<input name="user" value="${esc(e.user || '')}" autocomplete="off"></label>
          <label class="set-field">Şifre<span class="v-pw"><input name="pass" type="password" value="${esc(e.pass || '')}" autocomplete="new-password"><button type="button" class="icon-btn sm" data-v="peek" title="Göster" aria-label="Şifreyi göster">${ic('eye', 'sm')}</button><button type="button" class="btn secondary sm" data-v="gen" title="Güçlü şifre üret">Üret</button></span></label>
          <label class="set-field v-wide">Not<textarea name="note" rows="2">${esc(e.note || '')}</textarea></label>
          <div class="row v-foot">${e.id ? `<button type="button" class="btn danger" data-v="del">${ic('trash', 'sm')}Sil</button>` : ''}<span class="sp"></span><button type="button" class="btn secondary" data-v="cancel">Vazgeç</button><button class="btn primary">Kaydet</button></div></form></div>`;
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
// ---------- 87: which AI answers (Claude / Codex / Gemini): asked once, changeable in Settings; the bridge runs that CLI ----------
const AIS = { claude: ['Claude', "Claude'a", "Claude'un", 'Anthropic · Claude Code', 'claude -p'], codex: ['Codex', "Codex'e", "Codex'in", 'OpenAI · Codex CLI', 'codex exec'], gemini: ['Gemini', "Gemini'ye", "Gemini'nin", 'Google · Gemini CLI', 'gemini -p'] };
function aiKey() { return AIS[S.settings?.ai] ? S.settings.ai : 'claude'; }
function aiName() { return AIS[aiKey()][0]; }
function aiTo() { return AIS[aiKey()][1]; } // "Claude'a sor"
function aiOf() { return AIS[aiKey()][2]; } // "Claude'un özeti"
const AiPick = {
  asked() { try { return !!localStorage.getItem('hn-ai'); } catch { return true; } },
  maybe(then) { if (this.asked()) return then?.(); setTimeout(() => { if (document.querySelector('dialog[open]') || $('#lock:not([hidden])')) return then?.(); this.open(then); }, 700); },
  open(then) {
    let d = $('#aipick');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'aipick'; d.className = 'drawer modal narrow'; d.setAttribute('aria-label', 'Yapay zekâ seç'); document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; try { localStorage.setItem('hn-ai', '1'); } catch { } const f = this.then; this.then = null; f && setTimeout(f, 300); });
      d.addEventListener('click', async e => {
        if (e.target === d || e.target.closest('[data-x]')) return d.close();
        const b = e.target.closest('[data-ai]'); if (b) { await this.set(b.dataset.ai); this.draw(); }
        if (e.target.closest('[data-ok]')) d.close();
      });
    }
    this.then = then; this.draw(); Back.open(d);
  },
  draw() {
    const d = $('#aipick'), cur = aiKey(), have = S.aiHave;
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type">${ic('spark', 'sm')}Yapay zekâ</span><span class="sp"></span><button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      <h3 class="ap-h">Hangi yapay zekâyı kullanıyorsun?</h3>
      <p class="hint">Kayıtlarını o düzenler, sorularını o cevaplar. Bilgisayarındaki aboneliğinle çalışır; sonra Ayarlar'dan değiştirebilirsin.</p>
      <div class="ap-list" role="radiogroup">${Object.entries(AIS).map(([k, [n, , , who, cmd]]) => `<button class="ap-row${k === cur ? ' on' : ''}" data-ai="${k}" role="radio" aria-checked="${k === cur}">
        <span class="ap-dot"></span><span class="ap-t"><b>${n}</b><small>${who}${have ? (have[k] ? ' · bu bilgisayarda kurulu' : ' · <span class="ap-no">kurulu değil</span>') : ''}</small></span><code>${cmd}</code></button>`).join('')}</div>
      ${have && !have[cur] ? `<p class="hint ap-warn">${aiName()} bu bilgisayarda kurulu değil. Kurana kadar cevap veremez; istersen başka birini seç.</p>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn primary" data-ok>Tamam</button></div></div>`;
  },
  async set(k) {
    if (!AIS[k]) return;
    S.settings.ai = k; S.settings.aiChosen = true; await DB.put('kv', S.settings, 'settings');
    render(); updateSend(); AI.dot(); AI.pushAi();
  },
};

// ---------- 97: delete everything (our own confirm window: type SİL; this device only, or also the cloud) ----------
const Wipe = {
  open() {
    let d = $('#wipe');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'wipe'; d.className = 'drawer modal narrow'; d.setAttribute('aria-label', 'Tüm verileri sil'); document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; });
      d.addEventListener('input', () => this.check());
      d.addEventListener('change', () => this.check());
      d.addEventListener('click', e => {
        if (e.target === d || e.target.closest('[data-x]')) return d.close();
        if (e.target.closest('[data-backup]')) return exportBackup();
        if (e.target.closest('[data-go]')) this.run(d.querySelector('[name=wscope]:checked')?.value === 'all');
      });
    }
    const n = alive().length, cloud = Cloud.on(), gh = Repo.link();
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type wp-t">${ic('trash', 'sm')}Tüm verileri sil</span><span class="sp"></span><button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      <p class="hint">${n} kayıt, dosyalar ve ayarlar silinir. <b>Geri alınamaz.</b></p>
      <button class="btn secondary wp-bk" data-backup>${ic('down', 'sm')}Önce yedek indir</button>
      <div class="wp-opts" role="radiogroup">
        <label class="wp-o"><input type="radio" name="wscope" value="here" checked><span><b>Sadece bu cihazdan</b><small>Bu tarayıcıdaki kayıtlar, dosyalar, önbellek ve ayarlar. ${cloud ? 'Google oturumu kapanır; buluttaki kayıtlar durur.' : ''}</small></span></label>
        <label class="wp-o${cloud ? '' : ' off'}"><input type="radio" name="wscope" value="all" ${cloud ? '' : 'disabled'}><span><b>Her yerden</b><small>${cloud ? `Bu cihaz + buluttaki (${esc(Cloud.email())}) kayıtlar ve dosyalar. Başka cihazda açık kalan kopyalar orada durur; orada da sil.` : 'Google ile giriş yapınca seçilebilir.'}</small></span></label>
      </div>
      ${gh ? `<p class="hint">GitHub repolarındaki dosyalar silinmez (nts-files-…). İstersen <a href="https://github.com/${esc(gh.login || '')}?tab=repositories&q=nts-files" target="_blank" rel="noopener">GitHub'da</a> kendin sil.</p>` : ''}
      <label class="set-field"><span>Onaylamak için <b>SİL</b> yaz</span><input id="wipeTxt" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="SİL"></label>
      <p class="hint wp-msg" id="wipeMsg" hidden></p>
      <div class="row" style="justify-content:flex-end"><button class="btn secondary" data-x>Vazgeç</button><button class="btn wp-go" data-go disabled>Sil</button></div></div>`;
    Back.open(d); setTimeout(() => $('#wipeTxt')?.focus(), 50);
  },
  ok: v => v.trim().toLocaleUpperCase('tr') === 'SİL',
  check() { const d = $('#wipe'), all = d.querySelector('[name=wscope]:checked')?.value === 'all', b = d.querySelector('[data-go]'); b.disabled = !this.ok($('#wipeTxt').value) || this.busy; b.textContent = all ? 'Her yerden sil' : 'Bu cihazdan sil'; },
  async run(all) {
    if (this.busy || !this.ok($('#wipeTxt').value)) return;
    this.busy = true; this.check(); const msg = $('#wipeMsg'); msg.hidden = false;
    try {
      if (all && Cloud.on()) {
        const uid = Cloud.s.user.id, del = { method: 'DELETE', headers: { prefer: 'return=minimal' } };
        msg.textContent = 'Buluttaki dosyalar siliniyor…'; await this.rmFiles(uid + '/');
        msg.textContent = 'Buluttaki kayıtlar siliniyor…';
        try { await Cloud.req(`/rest/v1/nts_heavy?user_id=eq.${uid}`, del); } catch { } // the table may not exist
        await Cloud.req(`/rest/v1/nts_items?user_id=eq.${uid}`, del);
      }
      msg.textContent = 'Bu cihaz temizleniyor…';
      if (Cloud.on()) await Cloud.signOut();
      clearTimeout(Cloud._t); S.items = [];
      for (const st of ['items', 'files', 'kv']) await DB.clear(st);
      try { for (const k of await caches.keys()) await caches.delete(k); } catch { }
      try { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); } catch { } // no tour / AI question again right after
      msg.textContent = 'Silindi. Yeniden açılıyor…'; setTimeout(() => location.replace(location.pathname), 700);
    } catch (e) { this.busy = false; msg.textContent = 'Silinemedi: ' + e.message + '. Bu cihazdakilere dokunulmadı.'; this.check(); }
  },
  async rmFiles(prefix) { // storage has no "delete folder": list it (folders recursively) and remove in batches
    const files = [], dirs = [];
    for (let off = 0; ; off += 1000) {
      const r = await (await Cloud.req('/storage/v1/object/list/nts-files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, offset: off }) })).json();
      for (const o of r) (o.id ? files : dirs).push(prefix + o.name);
      if (r.length < 1000) break;
    }
    for (const d of dirs) await this.rmFiles(d + '/');
    for (let i = 0; i < files.length; i += 500) await Cloud.req('/storage/v1/object/nts-files', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: files.slice(i, i + 500) }) });
  },
};

const Tour = {
  steps() {
    const phone = innerWidth < 900;
    return [
      ['#composer', 'Tek kutu', 'Yaz, link ya da resim yapıştır, dosya bırak. <b>Enter</b> kaydeder. Yazarken kayıtların arasında da arar.'],
      ['#composer', '' + aiTo() + ' sor', '<b>Tab</b> ile "Sor" moduna geç (telefonda kutunun altındaki "' + aiTo() + ' sor"): "geçen hafta kaydettiğim PDF neydi?" ' + aiName() + ' kayıtlarını da kendisi düzenler.'],
      [phone ? '#filterBtn' : '#rail', 'Neye bakmak istersin', 'Linkler, notlar, fotoğraflar ve <b>Yapılacaklar</b>. Listeler, konular ve Şifrelerim <b>⋯</b> altında; çubuğu <b>[</b> ile gizlersin.'],
      ['#viewSwitch', 'Pano, liste, galeri', 'Panoda kartları sürükleyip istediğin yere koy, boş yere çift tıklayıp not yaz, kalemle çiz.'],
      ['#settingsBtn', 'Telefon ve bilgisayar', 'Ayarlar\'dan <b>Google ile gir</b>: iki cihaz da aynı kayıtları görür. ' + aiName() + ' bağlantısı da burada.'],
      [null, 'Hazırsın', 'Kendine bir not at, gerisini Nts ve ' + aiName() + ' halleder. Bu turu Ayarlar → "Nasıl kullanılır?"dan tekrar açabilirsin.'],
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
      $(id).addEventListener('mouseout', e => { if (!e.relatedTarget?.closest?.('.item,.tile,.peek,.list')) this.later(); });
    }
    el.addEventListener('mouseleave', () => this.later());
    el.addEventListener('mouseenter', () => clearTimeout(this.t));
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-pa]')?.dataset.pa, i = byId(this.id); if (!i) return;
      if (this.docked && !a) { openItem(i.id); return; }
      if (a === 'copy') return copyItem(i);
      if (a === 'star') { await toggleStar(i.id); return this.fill(byId(i.id)); }
      if (a === 'link') return markSeen(i);
      this.hide(); openItem(i.id);
    });
    addEventListener('scroll', () => this.hide(), { passive: true });
    addEventListener('resize', () => this.dock());
  },
  later() { clearTimeout(this.t); this.t = setTimeout(() => this.hide(), 220); },
  hide() { clearTimeout(this.t); if (this.docked) return; if (this.el) this.el.hidden = true; this.id = null; clearTimeout(this.ut); this.ut = setTimeout(() => this.unshift(), 260); },
  unshift() { const l = $('#list'); if (l.style.transform) { l.style.transform = ''; this.dx = 0; } },
  async show(row) {
    const i = byId(row.dataset.id); if (!i) return;
    clearTimeout(this.ut); this.id = i.id; this.fill(i);
    const el = this.el, rail = 76;
    if (S.view === 'list') {
      // list + card move together to the middle of the free area: the list slides left, the card sits right next to it
      const l = $('#list'), lr = l.getBoundingClientRect(), base = lr.left - (this.dx || 0), w = Math.min(360, innerWidth - rail - lr.width - 56);
      if (w < 260) { this.hide(); return; }
      const total = lr.width + 16 + w, want = rail + (innerWidth - rail - total) / 2;
      this.dx = Math.min(0, Math.round(want - base)); l.style.transform = this.dx ? `translateX(${this.dx}px)` : '';
      el.style.width = w + 'px'; el.style.left = (base + this.dx + lr.width + 16) + 'px';
    } else {
      // gallery: a fixed panel on the right that the grid leaves room for, so it never covers a neighbouring tile (77)
      if (!this.docked) { this.hide(); return; }
      el.hidden = false; this.mark(row); return this.media(i);
    }
    // 127: the card ends above the box (dock) when they share columns; a tall card scrolls inside instead of running under it
    const d = $('.dock')?.getBoundingClientRect(), x1 = parseFloat(el.style.left), x2 = x1 + parseFloat(el.style.width);
    const bottom = d && d.height && d.left < x2 && d.right > x1 ? d.top - 12 : innerHeight - 16;
    el.style.maxHeight = Math.max(160, bottom - 64) + 'px'; el.style.overflowY = 'auto';
    el.hidden = false;
    const r = row.getBoundingClientRect();
    el.style.top = Math.max(64, Math.min(bottom - el.offsetHeight, r.top + r.height / 2 - el.offsetHeight / 2)) + 'px';
    return this.media(i);
  },
  async media(i) { const url = await Prev.thumb(i); if (url && this.id === i.id) { const box = this.el.querySelector('.pk-media'); if (box) { const im = new Image(); im.alt = ''; im.referrerPolicy = 'no-referrer'; im.className = 'fadein'; im.src = url; im.decode().catch(() => { }).then(() => { box.replaceChildren(im); requestAnimationFrame(() => im.classList.add('ok')); }); } } },
  mark(row) { document.querySelectorAll('.tile.peeked').forEach(t => t !== row && t.classList.remove('peeked')); row?.classList.add('peeked'); },
  // gallery on a wide screen with a mouse: the panel stays docked on the right and shows the last tile you pointed at
  dock() {
    if (!this.el) return;
    const on = S.view === 'gallery' && document.body.classList.contains('gallery-view') && matchMedia('(hover: hover) and (min-width: 1100px)').matches;
    if (on === this.docked) return; this.docked = on;
    this.el.classList.toggle('docked', on); document.body.classList.toggle('peek-dock', on);
    if (on && !this.id) this.empty(); else if (!on) this.hide();
  },
  empty() { this.id = null; this.mark(null); this.el.innerHTML = `<div class="pk-empty">${ic('image', 'xl')}<span>Bir kartın üzerine gel, burada büyük görünür. Tıklayınca açılır.</span></div>`; this.el.hidden = false; },
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

// the same item changed on two devices: the newer side's text/fields, sets combine, "done" wins, a newer delete stays deleted
function mergeItem(l, r) {
  const [a, b] = (r.updatedAt || 0) >= (l.updatedAt || 0) ? [r, l] : [l, r], m = { ...b, ...a };
  if (!a.deleted) {
    for (const k of ['tags', 'boards', 'lists']) { const u = [...new Set([...(a[k] || []), ...(b[k] || [])])]; if (u.length) m[k] = u; }
    if (a.posBy || b.posBy) m.posBy = { ...(b.posBy || {}), ...(a.posBy || {}) };
    if (a.highlights || b.highlights) { const h = new Map(); [...(b.highlights || []), ...(a.highlights || [])].forEach(x => h.set(x.id, x)); m.highlights = [...h.values()]; }
    if (a.todo && b.todo && (a.todo.done || b.todo.done)) m.todo = { ...b.todo, ...a.todo, done: true, doneAt: a.todo.doneAt || b.todo.doneAt };
    if (a.starred || b.starred) m.starred = a.starred ?? b.starred;
  }
  if (!a.deleted) keepPos(m, l, r);
  m.updatedAt = Math.max(l.updatedAt || 0, r.updatedAt || 0) + 1;
  return m;
}
function markSeen(i) { if (!i.seenAt && (i.type === 'link' || i.type === 'file')) upsert([{ ...i, seenAt: now() }]); }
// once a week: a gentle reminder of what was saved and never opened
function weeklyUnseen() {
  const n = alive().filter(unseen).length, d = new Date(), wk = `${d.getFullYear()}-${Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 6048e5)}`;
  try { if (n < 3 || localStorage.getItem('hn-unseen-week') === wk) return; localStorage.setItem('hn-unseen-week', wk); } catch { return; }
  toast(`Bakmadığın ${n} kayıt var`, 8000, 'clock', { label: 'Göster', fn: () => { S.filter.list = 'unseen'; S.filter.type = 'all'; S.filter.star = false; if (S.view === 'todo' || S.view === 'board') setView('list'); else render(); } });
}

// ---------- finding things in years of data (60-64): year heatmap, time scrubber, day/month summaries, "on this day", sources, saved searches ----------
const MS_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const showFrom = ts => { S.listFrom = ts; S.limit = 300; if (S.view !== 'list' && S.view !== 'gallery') { S.view = 'list'; S.cam = null; } render(); scrollTo(0, 0); };
const fromLabel = ts => { const d = new Date(ts), monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate() && d.getHours() === 23; return d.toLocaleDateString('tr-TR', monthEnd ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }); };
const dayEnd = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d + 1).getTime() - 1; };
// 61: Claude writes one line per past day / month; kept in one hidden, synced record
const Summ = {
  rec: () => { const r = byId('summaries'); return r && !r.deleted ? r : null; },
  day(k) { return this.rec()?.days?.[k]?.t || ''; },
  month(k) { return this.rec()?.months?.[k]?.t || ''; },
  async run() {
    if (this._busy || !S.bridgeOk || S.aiBusy || Lock.conf && !Crypt.key) return; this._busy = true;
    try {
      const r = this.rec() || {}, days = r.days || {}, months = r.months || {}, today = dayKey(now()), thisMonth = today.slice(0, 7);
      const byDay = new Map(), byMonth = new Map();
      for (const i of alive()) { if (i.parent || i.sticky) continue; const d = dayKey(i.ts); if (d >= today) continue; (byDay.get(d) || byDay.set(d, []).get(d)).push(i); const m = d.slice(0, 7); if (m < thisMonth) (byMonth.get(m) || byMonth.set(m, []).get(m)).push(i); }
      const stale = (have, n) => !have || (n >= have.n * 1.5 && n - have.n >= 2);
      const groups = [...byDay].filter(([k, l]) => l.length >= 2 && stale(days[k], l.length)).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 16).map(([key, items]) => ({ key, items }))
        .concat([...byMonth].filter(([k, l]) => l.length >= 5 && stale(months[k], l.length)).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4).map(([key, items]) => ({ key, items: items.sort((a, b) => (b.starred - a.starred) || ((b.tags?.length || 0) - (a.tags?.length || 0))) })));
      if (!groups.length) return;
      const out = await AI.call('/summaries', { groups: groups.map(g => ({ key: g.key, items: g.items.slice(0, 40).map(i => ({ type: i.type, title: titleOf(i), text: i.type === 'note' ? (i.text || '').slice(0, 200) : undefined, tags: i.tags, chat: i.chat })) })) }, 180000);
      const cur = this.rec() || { id: 'summaries', type: 'summaries', ts: now(), tags: [], days: {}, months: {} }, nd = { ...(cur.days || {}) }, nm = { ...(cur.months || {}) };
      for (const x of out.items || []) { const g = groups.find(g => g.key === x.key); if (!g || !x.line) continue; (x.key.length === 7 ? nm : nd)[x.key] = { t: String(x.line).slice(0, 140), n: g.items.length }; }
      await upsert([{ ...cur, days: nd, months: nm }]);
    } catch (e) { console.warn('summaries', e); } finally { this._busy = false; }
  },
};
// 63: where an item came from: a WhatsApp chat, bookmarks, this PC, the phone
const deviceNow = () => /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ? 'phone' : 'pc';
function srcMatch(i, s) {
  if (s.startsWith('wa:')) return i.source === 'whatsapp' && (i.chat || '') === s.slice(3);
  if (s === 'bookmarks') return i.source === 'bookmarks';
  if (s === 'pc') return i.source === 'pc' || (i.dev === 'pc' && i.source !== 'whatsapp' && i.source !== 'bookmarks');
  if (s === 'phone') return i.source === 'share' || (i.dev === 'phone' && i.source !== 'whatsapp' && i.source !== 'bookmarks');
  return true;
}
const srcName = s => s.startsWith('wa:') ? s.slice(3) || 'WhatsApp' : { bookmarks: 'Yer imleri', pc: 'Bilgisayar', phone: 'Telefon' }[s] || s;
function srcRows(live, cur) {
  const n = {}, chats = new Map();
  for (const i of live) { if (i.source === 'whatsapp') chats.set(i.chat || '', (chats.get(i.chat || '') || 0) + 1); for (const s of ['bookmarks', 'pc', 'phone']) if (srcMatch(i, s)) n[s] = (n[s] || 0) + 1; }
  const rows = [...[...chats].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, k]) => ['wa:' + c, 'chat', c || 'WhatsApp', k]), ['pc', 'cpu', 'Bilgisayar', n.pc], ['phone', 'share', 'Telefon', n.phone], ['bookmarks', 'book', 'Yer imleri', n.bookmarks]].filter(r => r[3] || r[0] === cur);
  return rows.map(([k, icn, l, c]) => `<button class="side-row${cur === k ? ' on' : ''}" data-src="${esc(k)}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${c || ''}</span></button>`).join('');
}
// 64: a search or filter pinned to the side bar; one hidden, synced record
const Saved = {
  rec: () => { const r = byId('saved'); return r && !r.deleted ? r : null; },
  list() { return this.rec()?.list || []; },
  active() { const f = S.filter; return !!((S.searchOn && S.q.trim()) || f.type !== 'all' || f.tag || f.star || f.list || f.color || f.src); },
  name() {
    const f = S.filter, parts = [];
    if (S.searchOn && S.q.trim()) parts.push(S.q.trim());
    if (f.type !== 'all') parts.push({ link: 'linkler', note: 'notlar', photo: 'fotoğraflar', file: 'dosyalar' }[f.type] || f.type);
    if (f.list) parts.push(listName(f.list)); if (f.tag) parts.push('#' + f.tag); if (f.star) parts.push('yıldızlı'); if (f.src) parts.push(srcName(f.src));
    if (f.color) parts.push((COLORS.find(c => c[0] === f.color) || [0, f.color])[1].toLowerCase());
    return parts.join(' · ').slice(0, 60) || 'Arama';
  },
  same(s) { return s.q === (S.searchOn ? S.q.trim() : '') && JSON.stringify(s.f) === JSON.stringify(S.filter); },
  async save() {
    if (!this.active()) return; if (this.list().some(s => this.same(s))) return toast('Zaten kayıtlı', 1500, 'check');
    const cur = this.rec() || { id: 'saved', type: 'saved', ts: now(), tags: [], list: [] };
    await upsert([{ ...cur, list: [...(cur.list || []), { id: newId(), name: this.name(), q: S.searchOn ? S.q.trim() : '', f: { ...S.filter } }] }]);
    toast('Sol çubuğa sabitlendi', 2200, 'check');
  },
  async remove(id) { const cur = this.rec(); if (cur) await upsert([{ ...cur, list: cur.list.filter(s => s.id !== id) }]); },
  apply(id) {
    const s = this.list().find(x => x.id === id); if (!s) return;
    S.filter = { type: 'all', tag: null, star: false, list: null, color: null, src: null, ...s.f };
    const inp = $('#input'); inp.value = s.q; S.q = s.q; S.searchOn = !!s.q; runSearch(); autoGrow();
    if (S.view === 'todo') S.view = S.prevView || 'list';
    S.limit = 300; S.listFrom = null; S.cam = null; Pop.close(); render(); scrollTo(0, 0);
  },
  rows() { const l = this.list(); return l.length ? l.map(s => `<div class="side-row saved-row${this.same(s) ? ' on' : ''}"><button class="sv-go" data-saved="${s.id}">${ic('pin')}<span class="lbl">${esc(s.name)}</span></button><button class="icon-btn sm sv-x" data-unsave="${s.id}" title="Kaldır" aria-label="${esc(s.name)} aramasını kaldır">${ic('x', 'sm')}</button></div>`).join('') : ''; },
};
// 62: what you saved on this day in earlier years
function onThisDay() {
  const d = new Date(), md = dayKey(now()).slice(5), y = d.getFullYear(), by = new Map();
  for (const i of alive()) { if (i.parent) continue; const k = dayKey(i.ts); if (k.slice(5) === md && +k.slice(0, 4) < y) (by.get(k) || by.set(k, []).get(k)).push(i); }
  if (!by.size) return null;
  const [k, list] = [...by].sort((a, b) => b[0].localeCompare(a[0]))[0], yrs = y - +k.slice(0, 4);
  return { k, list, label: yrs === 1 ? 'Geçen yıl bugün' : `${yrs} yıl önce bugün` };
}
function otdHtml() {
  const f = S.filter; if (S.listFrom || (S.searchOn && S.q.trim()) || f.type !== 'all' || f.tag || f.list || f.star || f.color || f.src) return '';
  const o = onThisDay(); if (!o) return '';
  try { if (localStorage.getItem('hn-otd-hide') === dayKey(now())) return ''; } catch { }
  const t = o.list.slice(0, 3).map(i => esc(titleOf(i))).join(' · ');
  return `<div class="otd">${ic('clock', 'sm')}<div class="otd-b"><b>${o.label}</b><span>${o.list.length} kayıt${Summ.day(o.k) ? ' · ' + esc(Summ.day(o.k)) : ''}</span><small>${t}</small></div><button class="btn secondary sm" data-otd="${o.k}">Göster</button><button class="icon-btn sm" data-otdx title="Bugün gizle" aria-label="Bugün gizle">${ic('x', 'sm')}</button></div>`;
}
// 60: a GitHub-style year of days; tap a day to see it
const Heat = {
  year: null,
  html(items) {
    const by = new Map(); for (const i of items) { const k = dayKey(i.ts); by.set(k, (by.get(k) || 0) + 1); }
    const years = [...new Set([...by.keys()].map(k => +k.slice(0, 4)))].sort((a, b) => b - a); if (!years.length) return '';
    const y = years.includes(this.year) ? this.year : years[0]; this.year = y;
    const max = Math.max(1, ...[...by].filter(([k]) => +k.slice(0, 4) === y).map(([, n]) => n)), lv = n => !n ? 0 : n >= max * .75 ? 4 : n >= max * .45 ? 3 : n >= max * .2 ? 2 : 1;
    const start = new Date(y, 0, 1), off = (start.getDay() + 6) % 7, days = Math.round((new Date(y + 1, 0, 1) - start) / 864e5), today = dayKey(now());
    let cells = '', months = ''; let total = 0;
    for (let k = 0; k < off; k++) cells += '<i class="hc pad"></i>';
    for (let n = 0; n < days; n++) {
      const d = new Date(y, 0, 1 + n), key = dayKey(d.getTime()), c = by.get(key) || 0; total += c;
      if (d.getDate() === 1) months += `<span style="grid-column:${Math.floor((n + off) / 7) + 1}">${MS_TR[d.getMonth()]}</span>`;
      cells += c ? `<button class="hc l${lv(c)}${key === today ? ' today' : ''}" data-hday="${key}" title="${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })} · ${c} kayıt${Summ.day(key) ? '\n' + esc(Summ.day(key)) : ''}" aria-label="${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}, ${c} kayıt"></button>` : `<i class="hc${key === today ? ' today' : ''}${key > today ? ' fut' : ''}"></i>`;
    }
    return `<div class="heat"><div class="heat-top"><div class="heat-ys">${years.slice(0, 6).map(v => `<button class="${v === y ? 'on' : ''}" data-hyear="${v}">${v}</button>`).join('')}</div><span class="muted">${total} kayıt</span></div>
      <div class="heat-scroll"><div class="heat-ms">${months}</div><div class="heat-g">${cells}</div></div>
      <div class="heat-leg"><span>Az</span><i class="hc"></i><i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><i class="hc l4"></i><span>Çok</span></div></div>`;
  },
};
// 60: thin bar on the right edge of the list / gallery: drag from today down to the oldest month
const Scrub = {
  el: null, months: [],
  init() {
    const el = this.el = document.createElement('div'); el.className = 'scrub'; el.hidden = true; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', 'Zamanda git'); el.tabIndex = 0; document.body.appendChild(el);
    let drag = false;
    const at = e => { const r = el.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); return Math.min(this.months.length - 1, Math.floor(f * this.months.length)); };
    const show = k => { const m = this.months[k]; if (!m) return; const [y, mo] = m.split('-').map(Number); const b = el.querySelector('.sc-bub'); b.textContent = `${MS_TR[mo - 1]} ${y}`; b.style.top = ((k + .5) / this.months.length * 100) + '%'; el.classList.add('drag'); };
    const go = k => { const m = this.months[k]; if (!m) return; const [y, mo] = m.split('-').map(Number); showFrom(k === 0 ? null : new Date(y, mo, 1).getTime() - 1); };
    el.addEventListener('pointerdown', e => { drag = true; el.setPointerCapture(e.pointerId); show(at(e)); e.preventDefault(); });
    el.addEventListener('pointermove', e => { if (drag) show(at(e)); else if (e.pointerType === 'mouse') { show(at(e)); } });
    el.addEventListener('pointerleave', () => { if (!drag) el.classList.remove('drag'); });
    el.addEventListener('pointerup', e => { if (!drag) return; drag = false; el.classList.remove('drag'); go(at(e)); });
    el.addEventListener('pointercancel', () => { drag = false; el.classList.remove('drag'); });
    // phones: only shows while scrolling (a thumb near the edge must still scroll the list)
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches; if (touch) el.classList.add('idle');
    addEventListener('scroll', () => { if (!touch || el.hidden) return; el.classList.remove('idle'); clearTimeout(this._it); this._it = setTimeout(() => el.classList.add('idle'), 1800); }, { passive: true });
    el.addEventListener('pointerup', () => { if (touch) { clearTimeout(this._it); this._it = setTimeout(() => el.classList.add('idle'), 1800); } });
    el.addEventListener('keydown', e => { const cur = this.cur(); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); go(Math.max(0, Math.min(this.months.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)))); } });
  },
  cur() { if (!S.listFrom) return 0; const k = dayKey(S.listFrom).slice(0, 7); const n = this.months.indexOf(k); return n < 0 ? 0 : n; },
  draw(items) {
    if (!this.el) return;
    const on = (S.view === 'list' || S.view === 'gallery') && !(S.searchOn && S.q.trim()) && items.length > 20;
    const ms = on ? [...new Set(items.map(i => dayKey(i.ts).slice(0, 7)))].sort((a, b) => b.localeCompare(a)) : [];
    this.el.hidden = !on || ms.length < 3; if (this.el.hidden) return;
    const key = ms.join(','); this.months = ms;
    const cur = this.cur(); this.el.setAttribute('aria-valuetext', ms[cur]); this.el.setAttribute('aria-valuemin', 0); this.el.setAttribute('aria-valuemax', ms.length - 1); this.el.setAttribute('aria-valuenow', cur);
    if (this._key !== key) {
      this._key = key;
      const ys = []; ms.forEach((m, k) => { const y = m.slice(0, 4); if (!ys.length || ys.at(-1)[0] !== y) ys.push([y, k]); });
      this.el.innerHTML = `<div class="sc-track"></div>${ys.map(([y, k]) => `<span class="sc-y" style="top:${k / ms.length * 100}%">${y}</span>`).join('')}<span class="sc-now"></span><span class="sc-bub"></span>`;
    }
    this.el.querySelector('.sc-now').style.top = ((cur + .5) / ms.length * 100) + '%';
    this.el.classList.toggle('gal', S.view === 'gallery' && document.body.classList.contains('peek-dock'));
  },
};

// ---------- right-click / long-press menu on any item ----------
const Ctx = {
  el: null, id: null,
  init() {
    const el = this.el = document.createElement('div'); el.className = 'ctx pop'; el.hidden = true; document.body.appendChild(el);
    const target = e => !e.target.closest('dialog,.dock,input,textarea') && e.target.closest('[data-id],[data-tid]');
    document.addEventListener('contextmenu', e => { const t = target(e); if (!t) return; e.preventDefault(); this.show(t.dataset.id || t.dataset.tid, e.clientX, e.clientY); });
    let lp = null; // long press on touch
    document.addEventListener('touchstart', e => { if (lp && lp !== 'fired') clearTimeout(lp); lp = null; if (e.touches.length > 1) return; // 109a: a 2nd finger is a pinch, not a long press (the old timer opened the menu mid-zoom)
      const t = target(e); if (!t) return; const p = e.touches[0]; lp = setTimeout(() => { lp = 'fired'; navigator.vibrate?.(10); this.show(t.dataset.id || t.dataset.tid, p.clientX, p.clientY); }, 520); }, { passive: true });
    const cancel = () => { if (lp && lp !== 'fired') clearTimeout(lp); };
    document.addEventListener('touchmove', cancel, { passive: true });
    document.addEventListener('touchend', e => { if (lp === 'fired' && e.cancelable) e.preventDefault(); cancel(); lp = null; });
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
// Turkish dates in a task line: "yarın 10:30 diş", "cuma toplantı", "haftaya rapor", "12 mart" → { text, due }
const TR_DAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
const TR_MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
function parseDue(t) {
  let text = t, day = null, time = null; const lo = () => text.toLocaleLowerCase('tr');
  const cut = re => { const m = lo().match(re); if (!m) return null; text = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim(); return m; };
  const tm = cut(/(?:^|\s)(?:saat\s*)?([01]?\d|2[0-3])[:.]([0-5]\d)(?=\s|$)/); if (tm) time = `${tm[1].padStart(2, '0')}:${tm[2]}`;
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const add = n => { const d = new Date(d0); d.setDate(d.getDate() + n); return d; };
  let m;
  if (cut(/(?:^|\s)bugün(?=\s|$)/)) day = add(0);
  else if (cut(/(?:^|\s)yarın(?=\s|$)/)) day = add(1);
  else if (cut(/(?:^|\s)haftaya(?=\s|$)/)) day = add(7);
  else if ((m = cut(new RegExp(`(?:^|\\s)(\\d{1,2})\\s+(${TR_MONTHS.join('|')})(?=\\s|$)`)))) { const d = new Date(d0.getFullYear(), TR_MONTHS.indexOf(m[2]), +m[1]); if (d < d0) d.setFullYear(d.getFullYear() + 1); day = d; }
  else if ((m = cut(new RegExp(`(?:^|\\s)(${TR_DAYS.join('|')})(?:\\s+günü)?(?=\\s|$)`)))) { const w = TR_DAYS.indexOf(m[1]); day = add(((w - d0.getDay()) + 7) % 7 || 7); }
  if (!day && time) day = add(0);
  if (!day) return { text: t };
  return { text: text || t, due: dayKey(day.getTime()) + (time ? 'T' + time : '') };
}
const REPEATS = [['', 'Tekrar yok'], ['daily', 'Her gün'], ['weekly', 'Her hafta'], ['monthly', 'Her ay']];
const Todo = {
  open() {
    const open = S.items.filter(i => i.todo && !i.todo.done && !i.deleted);
    const k = i => [i.todo.order ?? Infinity, dueInfo(i.todo.due)?.at ?? Infinity, -i.ts];
    return open.sort((a, b) => { const x = k(a), y = k(b); return x[0] - y[0] || (a.prio === 'high' ? 0 : 1) - (b.prio === 'high' ? 0 : 1) || x[1] - y[1] || x[2] - y[2]; });
  },
  group(i) {
    const d = dueInfo(i.todo.due); if (!d) return 'none';
    if (d.cls === 'late') return 'late';
    const key = i.todo.due.slice(0, 10), t = now();
    if (key === dayKey(t)) return 'today'; if (key === dayKey(t + 864e5)) return 'tomorrow';
    return d.at - t < 7 * 864e5 ? 'week' : 'later';
  },
  GROUPS: [['late', 'Gecikmiş'], ['today', 'Bugün'], ['tomorrow', 'Yarın'], ['week', 'Bu hafta'], ['later', 'Sonra'], ['none', 'Tarihsiz']],
  row(i, n) {
    const t = i.todo, d = dueInfo(t.due), done = !!t.done, subs = t.subs || [], sd = subs.filter(x => x.done).length, open = this.exp === i.id;
    return `<div class="todo-item${open ? ' open' : ''}" data-tid="${i.id}"><div class="todo-row${done ? ' done' : ''}${d ? ' ' + d.cls : ''}${this.fresh?.has(i.id) ? ' fresh' : ''}">
      <span class="t-num">${n}.</span>
      <button class="t-check" data-check aria-label="${done ? 'Geri al' : 'Bitti'}" title="${done ? 'Geri al' : 'Bitti'}">${ic('check', 'sm')}</button>
      <button class="t-text" data-texp aria-expanded="${open}">${i.prio === 'high' ? `<span class="t-flag" title="Yüksek öncelik">${ic('flag', 'sm')}</span>` : ''}${hl(t.text || titleOf(i))}
        ${subs.length ? `<span class="t-sub">${ic('todo', 'sm')}${sd}/${subs.length}</span>` : ''}${t.repeat ? `<span class="t-sub" title="${REPEATS.find(r => r[0] === t.repeat)?.[1]}">${ic('repeat', 'sm')}</span>` : ''}${i.project ? `<span class="t-proj">${esc(i.project)}</span>` : ''}</button>
      ${d && !done ? `<span class="t-due ${d.cls}">${d.cls === 'late' ? 'Geçti · ' : ''}${d.label}</span>` : done && t.doneAt ? `<span class="t-due">${fmtDay(dayKey(t.doneAt))}</span>` : ''}
      ${done ? '' : `<span class="t-grip" data-grip title="Sürükle">${ic('grip', 'sm')}</span>`}</div>
      ${open ? this.detail(i) : ''}</div>`;
  },
  detail(i) {
    const t = i.todo, subs = t.subs || [];
    return `<div class="t-detail">
      <div class="tp-row"><span class="tp-l">Tarih</span><input type="datetime-local" class="t-due-in" data-tdue value="${t.due ? (t.due.includes('T') ? t.due : t.due + 'T09:00') : ''}" aria-label="Tarih">
        ${t.due ? '<button class="link-btn" data-tnodue>Tarihi kaldır</button>' : `<span class="t-quick">${[['Bugün', 0], ['Yarın', 1], ['Haftaya', 7]].map(([l, n]) => `<button class="lchip" data-tq="${n}">${l}</button>`).join('')}</span>`}</div>
      <div class="tp-row"><span class="tp-l">Tekrar</span><div class="seg sm">${REPEATS.map(([v, l]) => `<button class="${(t.repeat || '') === v ? 'on' : ''}" data-trep="${v}">${l}</button>`).join('')}</div></div>
      <div class="tp-row"><span class="tp-l">Öncelik</span><div class="seg sm">${[['high', 'Yüksek'], ['', 'Normal']].map(([v, l]) => `<button class="${(i.prio === 'high' ? 'high' : '') === v ? 'on' : ''}" data-tprio="${v}">${l}</button>`).join('')}</div></div>
      <div class="tp-row top"><span class="tp-l">Alt görev</span><div class="t-subs">${subs.map((x, k) => `<label class="t-subrow${x.done ? ' done' : ''}"><input type="checkbox" data-tsub="${k}" ${x.done ? 'checked' : ''}><span>${esc(x.t)}</span><button class="icon-btn sm" data-tsubrm="${k}" title="Sil" aria-label="Alt görevi sil">${ic('x', 'sm')}</button></label>`).join('')}
        <input class="t-subadd" data-tsubadd placeholder="+ alt görev ekle" enterkeyhint="done"></div></div>
      <div class="t-dacts"><button class="btn ghost sm" data-topen>${ic('layers', 'sm')}Kaydı aç</button><span class="sp"></span><button class="btn danger sm" data-tdel>${ic('trash', 'sm')}Sil</button></div>
    </div>`;
  },
  render() {
    const el = $('#todo'), open = this.open();
    const done = S.items.filter(i => i.todo?.done && !i.deleted).sort((a, b) => (b.todo.doneAt || 0) - (a.todo.doneAt || 0)).slice(0, 50);
    const by = new Map(this.GROUPS.map(([g]) => [g, []])); open.forEach(i => by.get(this.group(i)).push(i));
    const focus = document.activeElement?.matches?.('.t-add input') ? document.activeElement.value : null;
    let n = 0;
    el.innerHTML = `<div class="todo-head"><h2>Yapılacaklar</h2><span class="n">${open.length}</span><span class="sp"></span>
        ${by.get('late').length ? `<span class="t-due late">${by.get('late').length} gecikmiş</span>` : ''}</div>
      <form class="t-add"><span class="t-add-ic">${ic('plus', 'sm')}</span><input placeholder="${innerWidth < 600 ? 'Görev ekle… (yarın 10:30 dişçi)' : 'Görev ekle… (ör. yarın 10:30 dişçi, cuma rapor)'}" enterkeyhint="done" aria-label="Görev ekle"><span class="t-add-due" hidden></span></form>
      ${open.length ? this.GROUPS.filter(([g]) => by.get(g).length).map(([g, l]) => `<div class="t-group ${g}"><div class="t-gh">${l}<span>${by.get(g).length}</span></div>
          <div class="todo-list">${by.get(g).map(i => this.row(i, ++n)).join('')}</div></div>`).join('')
        : emptyHtml('todo', 'Yapılacak bir şey yok', 'Yukarıya bir görev yaz ya da ana kutuya <b>- süt al</b> gibi satırlar gir. ' + aiName() + ' da "yarın 10:30 diş randevusu" gibi notları kendisi görev yapar.')}
      ${done.length ? `<details class="todo-done"${this.showDone ? ' open' : ''}><summary>${ic('chev', 'sm')}Bitenler · ${done.length}<span class="sp"></span><button class="link-btn" data-tclear>Bitenleri temizle</button></summary><div class="todo-list">${done.map((i, k) => this.row(i, k + 1)).join('')}</div></details>` : ''}`;
    if (focus != null) { const inp = el.querySelector('.t-add input'); inp.value = focus; inp.focus(); this.preview(inp); }
  },
  preview(inp) { const p = parseDue(inp.value.trim()), b = inp.parentElement.querySelector('.t-add-due'), d = p.due && dueInfo(p.due); b.hidden = !d; if (d) b.textContent = d.label; },
  async patch(id, fn) { const i = byId(id); if (!i?.todo) return; const c = { ...i, todo: { ...i.todo } }; fn(c); await upsert([c]); },
  async add(texts) {
    // feels instant: the tasks are on screen and counted before anything is written; saving runs right after
    const ts = now(), made = [];
    texts.forEach((t, k) => { const [it, ...rest] = itemsFromInput({ text: t, ts: ts - k }); if (!it) return; const p = parseDue(t); it.todo = { text: p.text, done: false, ...(p.due ? { due: p.due, user: true } : {}) }; if (p.due?.includes('T')) Remind.ask(); it.createdAt = now(); it.pending = true; made.push(it, ...rest); });
    made.forEach(indexItem); S.items = [...S.items, ...made]; this.fresh = new Set(made.map(i => i.id)); render();
    const b = document.querySelector('#rail [data-todo]'); b?.classList.remove('bump'); void b?.offsetWidth; b?.classList.add('bump');
    toast(texts.length > 1 ? `${texts.length} görev yapılacaklara eklendi` : 'Yapılacaklara eklendi', 3000, 'todo', S.view === 'todo' ? null : { label: 'Göster', fn: () => setView('todo') });
    setTimeout(() => { this.fresh = null; }, 1500);
    const saved = await saveItems(made); await upsert(saved); AI.kick();
  },
  async toggle(id) {
    const i = byId(id); if (!i?.todo) return;
    const done = !i.todo.done, list = [{ ...i, todo: { ...i.todo, done, doneAt: done ? now() : undefined } }];
    if (done) haptic(12);
    if (done && i.todo.repeat && !i.todo.next) { // a repeating task: the next one appears right away
      const base = new Date(i.todo.due ? (i.todo.due.includes('T') ? i.todo.due : i.todo.due + 'T09:00') : now()), r = i.todo.repeat;
      r === 'daily' ? base.setDate(base.getDate() + 1) : r === 'weekly' ? base.setDate(base.getDate() + 7) : base.setMonth(base.getMonth() + 1);
      const t = now(), hasT = i.todo.due?.includes('T'), due = dayKey(base.getTime()) + (hasT ? i.todo.due.slice(10) : '');
      const nx = { id: newId(), type: 'note', text: i.text, title: i.title, ts: t, createdAt: t, tags: i.tags || [], project: i.project, prio: i.prio, pending: false,
        todo: { text: i.todo.text, done: false, due, repeat: r, user: true, subs: (i.todo.subs || []).map(x => ({ ...x, done: false })) } };
      list[0].todo.next = nx.id; list.push(nx);
    }
    await upsert(list);
    if (done) toast(i.todo.repeat ? 'Bitti · sıradaki eklendi' : 'Bitti', 4000, 'check', { label: 'Geri al', fn: () => this.undo(id) });
  },
  async undo(id) { const i = byId(id); if (!i) return; const nx = i.todo.next && byId(i.todo.next); await upsert([{ ...i, todo: { ...i.todo, done: false, doneAt: undefined, next: undefined } }, ...(nx ? [{ id: nx.id, deleted: true, ts: nx.ts, updatedAt: now() }] : [])]); },
  init() {
    const el = $('#todo');
    el.addEventListener('click', async e => {
      const g = k => e.target.closest(`[${k}]`);
      if (g('data-tclear')) { e.preventDefault(); const ds = S.items.filter(i => i.todo?.done && !i.deleted); await upsert(ds.map(i => ({ ...i, todo: null, noTodo: true }))); return toast(`${ds.length} biten görev listeden kaldırıldı`, 3000, 'check'); }
      if (e.target.closest('.todo-done summary')) { this.showDone = !e.target.closest('details').open; return; }
      const item = e.target.closest('[data-tid]'); if (!item) return; const id = item.dataset.tid;
      if (g('data-check')) { item.querySelector('.todo-row').classList.add('ticking'); setTimeout(() => this.toggle(id), 180); }
      else if (g('data-texp')) { this.exp = this.exp === id ? null : id; this.render(); }
      else if (g('data-topen')) openItem(id);
      else if (g('data-tq')) { const n = +g('data-tq').dataset.tq; await this.patch(id, c => { c.todo.due = dayKey(now() + n * 864e5); c.todo.user = true; }); }
      else if (g('data-tnodue')) await this.patch(id, c => { c.todo.due = undefined; c.todo.user = true; });
      else if (g('data-trep')) await this.patch(id, c => { c.todo.repeat = g('data-trep').dataset.trep || undefined; });
      else if (g('data-tprio')) { const i = byId(id); await upsert([{ ...i, prio: g('data-tprio').dataset.tprio || undefined }]); }
      else if (g('data-tsubrm')) { e.preventDefault(); const k = +g('data-tsubrm').dataset.tsubrm; await this.patch(id, c => { c.todo.subs = (c.todo.subs || []).filter((_, n) => n !== k); }); }
      else if (g('data-tdel')) { this.exp = null; await removeItem(byId(id)); }
    });
    el.addEventListener('change', async e => {
      const id = e.target.closest('[data-tid]')?.dataset.tid; if (!id) return;
      if (e.target.matches('[data-tdue]')) { await this.patch(id, c => { c.todo.due = validDue(e.target.value) || undefined; c.todo.user = true; }); Remind.ask(); }
      if (e.target.matches('[data-tsub]')) { const k = +e.target.dataset.tsub; await this.patch(id, c => { c.todo.subs = (c.todo.subs || []).map((x, n) => n === k ? { ...x, done: e.target.checked } : x); }); }
    });
    el.addEventListener('keydown', async e => {
      if (e.key !== 'Enter' || !e.target.matches('[data-tsubadd]')) return; e.preventDefault();
      const v = e.target.value.trim(), id = e.target.closest('[data-tid]').dataset.tid; if (!v) return;
      await this.patch(id, c => { c.todo.subs = [...(c.todo.subs || []), { t: v, done: false }]; });
      requestAnimationFrame(() => el.querySelector(`[data-tid="${id}"] [data-tsubadd]`)?.focus());
    });
    el.addEventListener('input', e => { if (e.target.matches('.t-add input')) this.preview(e.target); });
    el.addEventListener('submit', async e => { e.preventDefault(); const inp = e.target.querySelector('input'), v = inp.value.trim(); if (!v) return; inp.value = ''; this.preview(inp); await this.add([v]); requestAnimationFrame(() => el.querySelector('.t-add input')?.focus()); });
    // drag by the handle (pointer events: works with mouse and touch)
    el.addEventListener('pointerdown', e => {
      const g = e.target.closest('[data-grip]'); if (!g) return;
      e.preventDefault();
      const row = g.closest('.todo-item'), list = row.parentElement; let moved = false;
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
    $('#boardTools').insertAdjacentHTML('afterbegin', `<button id="penBtn" class="tool m-only" title="Çizim araçları" aria-label="Çizim araçları">${ic('pen', 'sm')}</button>`);
    $('#penBtn').onclick = () => { const o = !S.palOpen; if (o) S.tool = 'pen'; Rail.pal(o); this.chrome(); }; // 98: phone palette only from here
    pal.onclick = e => { const b = e.target.closest('button'); if (!b) return; if ('inkc' in b.dataset) { const ks = Object.keys(INK_COLORS); S.ink = ks[(ks.indexOf(S.ink) + 1) % ks.length]; } else this.use(b.dataset.tool); this.chrome(); };
    addEventListener('keydown', e => {
      if (S.view !== 'board' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') || document.querySelector('dialog[open]')) return;
      const t = TOOLS.find(x => x[3] === e.key.toLowerCase()); if (t && !e.shiftKey) { e.preventDefault(); this.use(t[0]); if (t[0] !== 'select' && !S.palOpen && innerWidth >= 900) Rail.pal(true); }
      if (e.key === 'Escape') this.use('select');
    });
    this.chrome();
  },
  use(t) { S.tool = t; this.chrome(); },
  chrome() {
    const b = $('#board'); b.dataset.tool = S.tool;
    $('#pal').querySelectorAll('[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === S.tool));
    $('#pal .inkc span').style.background = INK_COLORS[S.ink];
    const pb = $('#penBtn'); if (pb) { pb.classList.toggle('on', !!S.palOpen); pb.setAttribute('aria-pressed', S.palOpen ? 'true' : 'false'); }
  },
  at(e, r = $('#board').getBoundingClientRect()) { return [Math.round((e.clientX - r.left - S.cam.x) / S.cam.k), Math.round((e.clientY - r.top - S.cam.y) / S.cam.k)]; },
  start(e) {
    const t = S.tool;
    if (t === 'note' || t === 'text') { if (e.target.closest('.bcard')) return null; this.sticky(t, e); this.use('select'); return { ink: 'done' }; }
    if (t === 'eraser') { this._gone = new Set(); this.erase(e); return { ink: 'erase' }; }
    const p = this.at(e), live = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    live.setAttribute('class', 'k-' + t); live.style.stroke = INK_COLORS[S.ink]; $('#ink').appendChild(live);
    return { ink: t, pts: [p], live };
  },
  move(d, e) {
    if (d.ink === 'erase') return this.erase(e);
    if (!d.pts) return;
    const r = d.r || (d.r = $('#board').getBoundingClientRect());
    if (d.ink === 'pen') { // 94c: every point the pen sent between frames (coalesced), drawn once per frame
      let n = 0;
      for (const ce of (e.getCoalescedEvents?.() || []).concat(e)) { const p = this.at(ce, r), last = d.pts.at(-1); if (Math.hypot(p[0] - last[0], p[1] - last[1]) * S.cam.k < 1.5) continue; d.pts.push(p); n++; }
      if (!n) return;
    } else d.pts[1] = this.at(e, r);
    if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; if (d.live.isConnected) d.live.setAttribute('d', this.path(d.ink, d.pts)); });
  },
  async end(d) {
    if (!d.pts) return;
    if (d.raf) { cancelAnimationFrame(d.raf); d.raf = 0; }
    const [a, b2] = [d.pts[0], d.pts.at(-1)];
    if (d.pts.length < 2 || (d.ink !== 'pen' && Math.hypot(b2[0] - a[0], b2[1] - a[1]) < 6)) { d.live.remove(); return; }
    const t = now();
    const it = { id: newId(), type: 'draw', shape: d.ink, pts: d.pts, color: S.ink, ts: t, createdAt: t, tags: [], pending: false };
    // 90: the live path becomes the saved one in place (no remove + rebuild = no flash)
    d.live.dataset.did = it.id; d.live.setAttribute('d', this.path(it.shape, it.pts)); d.live._k = this.key(it);
    this.rec({ add: it.id }); await upsert([it]);
  },
  // 81: Ctrl+Z / Ctrl+Shift+Z (Ctrl+Y) on the board: strokes, erased strokes and sticky notes
  hist: [], fut: [],
  rec(a) { this.hist.push(a); if (this.hist.length > 200) this.hist.shift(); this.fut = []; },
  async step(back) {
    const a = (back ? this.hist : this.fut).pop(); if (!a) return false;
    (back ? this.fut : this.hist).push(a);
    const add = back ? a.add : a.del, del = back ? a.del : a.add; // undoing an add removes it; undoing an erase brings it back
    if (add) { const i = byId(add); if (i && !i.deleted) { document.querySelector(`[data-did="${i.id}"]`)?.remove(); await upsert([{ ...i, deleted: true, deletedAt: now() }]); } }
    if (del) { const i = S.items.find(x => x.id === del); if (i) { if (S.undo?.id === i.id) S.undo = null; await upsert([{ ...i, deleted: false, deletedAt: undefined }]); if (back) toast('Geri alındı', 1500, 'check'); } }
    this.render?.(); return true;
  },
  erase(e) {
    // geometry, not pixels: a thin line is easy to hit at any zoom, even under a card
    const [x, y] = this.at(e), tol = 10 / S.cam.k;
    const seg = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
    const lines = i => { const [a, b] = [i.pts[0], i.pts.at(-1)]; return i.shape === 'rect' ? [[a, [b[0], a[1]]], [[b[0], a[1]], b], [b, [a[0], b[1]]], [[a[0], b[1]], a]] : i.shape === 'arrow' ? [[a, b]] : i.pts.slice(1).map((p, n) => [i.pts[n], p]); };
    const hit = S.items.find(i => i.type === 'draw' && !i.deleted && i.pts?.length > 1 && lines(i).some(([a, b]) => seg(a, b) < tol));
    if (hit) { document.querySelector(`[data-did="${hit.id}"]`)?.remove(); this.rec({ del: hit.id }); removeItem(hit); return; }
    const card = document.elementsFromPoint(e.clientX, e.clientY).map(el => el.closest?.('.bcard.sticky')).find(Boolean), it = card && byId(card.dataset.id);
    if (it && !it.deleted && !this._gone?.has(it.id)) { (this._gone ||= new Set()).add(it.id); card.classList.add('gone'); setTimeout(() => card.remove(), 160); this.rec({ del: it.id }); removeItem(it); } // written on the board: the eraser takes it
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
    // 90: diff by id instead of rebuilding innerHTML, so existing strokes never blink
    const svg = $('#ink'); if (!svg) return;
    const want = new Map();
    for (const i of S.items) if (i.type === 'draw' && !i.deleted && i.pts?.length > 1) want.set(i.id, i);
    const have = new Map();
    for (const el of [...svg.children]) { const id = el.dataset.did; if (!id) continue; if (!want.has(id) || have.has(id)) el.remove(); else have.set(id, el); }
    for (const [id, i] of want) {
      let el = have.get(id); const k = this.key(i);
      if (el && el._k === k) continue;
      if (!el) { el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.dataset.did = id; svg.appendChild(el); }
      el.setAttribute('class', 'k-' + i.shape); el.style.stroke = INK_COLORS[i.color] || INK_COLORS.ink; el.setAttribute('d', this.path(i.shape, i.pts)); el._k = k;
    }
  },
  key(i) { return i.shape + '|' + i.color + '|' + i.pts.length + '|' + i.pts.at(-1); },
  async sticky(kind, e) {
    const [x, y] = this.at(e), t = now();
    const at = { x: x - (kind === 'text' ? 4 : 90), y: y - (kind === 'text' ? 14 : 40) };
    const i = { id: newId(), type: 'note', text: '', sticky: kind, ...(onMain() ? { pos: at } : { posBy: { [S.board]: at }, boards: [S.board] }), ts: t, createdAt: t, tags: [], pending: false, ...(kind === 'note' ? { color: 'yellow' } : {}) };
    this.rec({ add: i.id }); await upsert([i], { sync: false });
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
  COLW: 240, GAP: 76, PER: 4, IN: 12, // IN: between a day's own columns (small), GAP: between days (big) - 92
  // Free canvas, like Figma: cards you have moved keep their place (i.pos, synced);
  // cards you never moved are stacked in day columns to the right of the placed ones.
  // card height without the DOM (title ≤ 2 lines, text ≤ 3 lines, meta 1 line): 10,000 cards are laid out in memory
  est(i) {
    if (i.sticky) return i.sticky === 'text' ? 40 : 140;
    const t = titleOf(i).length, sub = subOf(i), tl = Math.min(2, Math.max(1, Math.ceil(t / 24))), sl = sub ? Math.min(3, Math.ceil(Math.min(sub.length, 200) / 31)) : 0;
    return 2 + (hasVisual(i) ? 132 : 0) + 21 + tl * 19 + (sl ? 2 + sl * 18 : 0) + 6 + 18 + (this.metaLines(i) > 1 ? 23 : 0);
  },
  // 128: a rough width of the card's meta row (time, site, flags, tag chips); over one line → the card keeps room for a second
  metaLines(i) {
    const cw = 6.3, chip = t => 26 + t.length * cw;
    let w = 46 + (i.type === 'link' ? 6 + domain(i.url).length * cw : 0) + (i.type === 'file' && i.size ? 50 : 0) + (i.starred ? 20 : 0) + (i.prio === 'high' ? 70 : 0) + (i.todo ? 70 : 0) + (relatedOf(i).length ? 34 : 0);
    for (const t of i.tags || []) w += 6 + chip(t);
    return w > this.COLW - 26 ? 2 : 1;
  },
  // no "…": text that does not fit fades out at the end of its last line (one batched read, then one write)
  fades(cards) {
    const els = cards.flatMap(c => [...c.querySelectorAll('.title, .sub')]), ov = els.map(e => e.scrollHeight > e.clientHeight + 1);
    els.forEach((e, k) => e.classList.toggle('ov', ov[k]));
    // 128: tag chips wrap to a second line; those that still don't fit give way to one "+N" chip (never half a chip)
    for (const m of cards.map(c => c.querySelector('.meta')).filter(Boolean)) {
      if (m.scrollHeight <= m.clientHeight + 1) continue;
      const tg = [...m.querySelectorAll('.tg')], more = document.createElement('span'); more.className = 'tg more';
      let n = 0; m.appendChild(more);
      for (const t of tg.filter(t => t.offsetWidth > m.clientWidth - 40)) { tg.splice(tg.indexOf(t), 1); t.remove(); more.textContent = '+' + ++n; } // a chip wider than the row never fits
      while (tg.length && m.scrollHeight > m.clientHeight + 1) { tg.pop().remove(); more.textContent = '+' + ++n; }
      more.title = n + ' etiket daha';
    }
  },
  card(i) {
    const c = document.createElement('div'); c.dataset.id = i.id;
    if (i.sticky) { // a note written right on the board
      c.className = 'bcard sticky' + (i.sticky === 'text' ? ' text' : '') + markCls(i);
      c.innerHTML = `<div class="st-body" data-ph="${i.sticky === 'text' ? 'Yazı' : 'Not yaz…'}"${i.fs ? ` style="font-size:${i.fs}px"` : ''}>${esc(i.text || '')}</div>${i.sticky === 'text' ? '<span class="st-size" title="Sürükle: büyüt / küçült"></span>' : ''}`;
      return c;
    }
    const k = fileKind(i), sub = subOf(i), H = S.searchOn ? hl : esc;
    c.className = 'bcard' + (S.hits && S.searchOn ? (S.hits.has(i.id) ? ' hit' : ' dim') : '') + (S.linkFrom === i.id ? ' sel' : '') + markCls(i);
    c.innerHTML = `<span class="b-date">${shortDay(dayKey(i.ts))}</span>${hasVisual(i) ? thumbBox(i) : ''}<div class="b-in"><div class="b-head"><span class="b-ico ${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}</span><div class="title">${H(titleOf(i))}</div></div>
      ${sub ? `<div class="sub">${H(sub.slice(0, 200))}</div>` : ''}${metaHtml(i, { tags: 99, day: !!posOf(i) }).replace('class="meta"', `class="meta${this.metaLines(i) > 1 ? ' m2' : ''}"`)}</div>`;
    return c;
  },
  // Free canvas, like Figma: cards you moved keep their place (i.pos, synced); the rest stand in day columns
  // right of the placed ones. Only the cards on screen (+ a margin) are in the DOM.
  render(items) {
    // 126: while a card is dragged (or a line drawn / a text resized) a synced update waits; rebuilding would detach the held card and drop it at x=0
    if (this.busy) { this.pending = items; return; }
    this.pending = null;
    const plane = $('#plane');
    plane.querySelectorAll('.bcard,.col-head,.day-band').forEach(e => e.remove());
    const list = items.slice().sort((a, b) => a.ts - b.ts);
    const placed = list.filter(posOf), free = list.filter(i => !posOf(i) && !i.sticky);
    Ink.render();
    let x0 = 0, y0 = 0;
    if (placed.length) { let mx = -Infinity, my = Infinity; for (const i of placed) { const p = posOf(i); mx = Math.max(mx, p.x + this.COLW); my = Math.min(my, p.y); } x0 = mx + this.GAP * 1.5; y0 = my; }
    this.M = new Map(); this.heads = []; this.mounted = new Map(); this.mountedHeads = new Map(); this.mountedMonths = new Map(); this.y0 = y0;
    const rb = $('#rangeBtn'); if (rb) { rb.innerHTML = `${ic('clock', 'sm')}<span>${rangeLabel()}</span>`; rb.hidden = !onMain(); }
    const bb = $('#boardBtn'); if (bb) bb.innerHTML = `${ic('board', 'sm')}<span>${onMain() ? 'Genel' : esc(S.board)}</span>${ic('chev', 'sm rot')}`;
    for (const i of placed) this.M.set(i.id, { i, x: posOf(i).x, y: posOf(i).y, w: i.sticky ? (i.sticky === 'text' ? 420 : 180) : this.COLW, h: i.sticky ? this.est(i) + 200 : this.est(i) + 40 });
    const days = []; let last = '';
    for (const i of free) { const k = dayKey(i.ts); if (k !== last) { days.push({ k, items: [] }); last = k; } days.at(-1).items.push(i); }
    let cx = x0; const today = dayKey(now());
    for (const [n0, d] of days.entries()) {
      const x = cx, cw = Math.ceil(d.items.length / this.PER) * (this.COLW + this.IN) - this.IN; cx += cw + this.GAP;
      const ys = [];
      d.items.forEach((i, n) => { const col = Math.floor(n / this.PER), h = this.est(i), y = ys[col] ?? y0 + 30; ys[col] = y + h + 14; this.M.set(i.id, { i, x: x + col * (this.COLW + this.IN), y, w: this.COLW, h, auto: true }); });
      this.heads.push({ k: d.k, n: d.items.length, x, y: y0, w: cw, h: Math.max(...ys) - y0, alt: n0 % 2, today: d.k === today });
    }
    plane.style.setProperty('--dayh', Math.max(320, ...this.heads.map(h => h.h + 20)) + 'px'); // 109d: the line between days runs as tall as the tallest day, not a stub next to a 1-card day
    // months for the far-out view: each spans its days' columns
    this.months = []; for (const h of this.heads) { const k = h.k.slice(0, 7), m = this.months.at(-1); if (m && m.k === k) { m.x2 = h.x + h.w; m.n += h.n; m.days.push(h.k); } else this.months.push({ k, x: h.x, x2: h.x + h.w, n: h.n, days: [h.k], y: y0 }); }
    const vis = new Map(); for (const d of days) for (const i of d.items) { const k = d.k.slice(0, 7); if (hasVisual(i)) { const a = vis.get(k) || vis.set(k, []).get(k); if (a.length < 4) a.push(i); } }
    this.months.forEach(m => { m.pics = vis.get(m.k) || []; });
    this.cull();
    if (S.cam) this.apply();
    requestAnimationFrame(() => { if (!S.cam) this.fit(false); }); // 109a: a synced item must not throw the camera back (only a new board/range/view starts from fit)
  },
  FAR: .14, // below this zoom the days fold into month tiles
  view(pad = 360) { // the visible part of the plane, in plane coordinates
    const b = $('#board'), c = S.cam; if (!c) return null; const p = pad / c.k;
    return { x1: -c.x / c.k - p, y1: -c.y / c.k - p, x2: (b.clientWidth - c.x) / c.k + p, y2: (b.clientHeight - c.y) / c.k + p };
  },
  cull() {
    if (!this.M) return; const v = this.view(); if (!v) return;
    const plane = $('#plane'), frag = document.createDocumentFragment(), fresh = [], far = S.cam.k < this.FAR;
    $('#board').classList.toggle('months', far);
    const mg = $('#months');
    if (far) { // semantic zoom: the days fold into months, a year per row ("Mart 2024 · 312 kayıt" + pictures), readable at any distance
      for (const [id, el] of this.mounted) { el.remove(); this.mounted.delete(id); }
      for (const [k, el] of this.mountedHeads) { el.remove(); this.mountedHeads.delete(k); }
      $('#wires').innerHTML = '';
      const key = (this.months || []).map(m => m.k + m.n).join();
      if (mg.hidden || mg._key !== key) {
        const by = new Map(); (this.months || []).forEach(m => by.set(m.k, m));
        const years = [...new Set((this.months || []).map(m => m.k.slice(0, 4)))].sort().reverse(), MS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        mg.innerHTML = years.map(y => `<div class="my-row"><div class="my-y">${y}</div><div class="my-ms">${MS.map((l, n) => { const k = `${y}-${String(n + 1).padStart(2, '0')}`, m = by.get(k);
          return m ? `<button class="m-tile" data-month="${k}"><span class="m-name">${l}</span><span class="m-n">${m.n} kayıt</span>${Summ.month(k) ? `<span class="m-sum">${esc(Summ.month(k))}</span>` : ''}${m.pics.length ? `<span class="m-pics">${m.pics.map(i => thumbBox(i, 'thumb m-pic')).join('')}</span>` : ''}</button>`
            : `<span class="m-tile empty"><span class="m-name">${l}</span></span>`; }).join('')}</div></div>`).join('') + '<p class="hint my-tip">Bir aya dokun: o günlere yaklaşır. Yakınlaşınca kartlar geri gelir.</p>';
        mg._key = key; hookThumbs(mg);
      }
      mg.hidden = false; return;
    }
    mg.hidden = true;
    for (const [k, el] of this.mountedMonths || []) { el.remove(); this.mountedMonths.delete(k); }
    const inside = m => m.x < v.x2 && m.x + m.w > v.x1 && m.y < v.y2 && m.y + m.h > v.y1;
    for (const [id, m] of this.M) {
      const el = this.mounted.get(id);
      if (inside(m)) { if (!el) { const c = this.card(m.i); if (m.auto) { c.classList.add('auto'); c.style.height = m.h + 'px'; } if (now() - (m.i.createdAt || 0) < 1500) c.classList.add('born'); c.style.left = m.x + 'px'; c.style.top = m.y + 'px'; frag.appendChild(c); this.mounted.set(id, c); fresh.push(c); } }
      else if (el && !el.classList.contains('dragging') && !el.querySelector('[contenteditable="true"],[contenteditable="plaintext-only"]')) { el.remove(); this.mounted.delete(id); }
    }
    for (const h of this.heads) {
      const el = this.mountedHeads.get(h.k), inn = h.x < v.x2 && h.x + h.w > v.x1;
      if (inn && !el) { // 92: each day is one soft band (alternating tone, today in the accent) with its head on top: "Dün · 20 Kasım Cuma"
        const e = document.createElement('div'), l = fmtDay(h.k), rel = l === 'Bugün' || l === 'Dün';
        e.className = 'day-band' + (h.alt ? ' alt' : '') + (h.today ? ' today' : '');
        e.innerHTML = `<div class="col-head"><span class="l">${l}${rel ? `<span class="dt"> · ${fmtDay0d(h.k)}</span>` : ''}</span><span class="s">${shortDay(h.k)}</span><span class="cnt">${h.n}</span></div>`;
        Object.assign(e.style, { left: h.x - 12 + 'px', top: h.y - 12 + 'px', width: h.w + 24 + 'px', height: h.h + 20 + 'px' }); e.style.setProperty('--w', h.w + 'px');
        frag.appendChild(e); this.mountedHeads.set(h.k, e); }
      else if (!inn && el) { el.remove(); this.mountedHeads.delete(h.k); }
    }
    if (fresh.length || frag.childNodes.length) { plane.appendChild(frag); fresh.forEach(c => c.querySelectorAll('[data-tid]').forEach(t => thumbIO.observe(t))); this.fades(fresh); }
    this.fitHeads();
    this.wires();
  },
  // 92b: a day head is never cut. Full label if it fits its band on screen, else the short one ("20 Kas 3"), else it stands vertically in the band
  fitHeads() {
    const k = S.cam?.k || 1, far = k < .7, s = Math.max(k, 1);
    for (const h of this.heads) {
      const e = this.mountedHeads.get(h.k), hd = e?.firstChild; if (!hd) continue;
      if (hd._lf == null) { hd.classList.remove('sh', 'vert'); hd._lf = hd.offsetWidth; hd.classList.add('sh'); hd._ls = hd.offsetWidth; hd.classList.remove('sh'); hd._m = ''; }
      const room = h.w * k, m = !far && hd._lf * s <= room ? '' : hd._ls * s <= room ? 'sh' : 'vert';
      if (m !== hd._m) { hd._m = m; hd.classList.toggle('sh', !!m); hd.classList.toggle('vert', m === 'vert'); }
    }
  },
  layout() { this.wires(); },
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
    const b = $('#board'); b.classList.toggle('far', c.k < .7); const g = 24 * c.k * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (24 * c.k)))); b.style.backgroundSize = `${g}px ${g}px`; b.style.backgroundPosition = `${c.x}px ${c.y}px`;
    const p = $('#zoomPct'); if (p) p.textContent = (c.k < .1 ? (c.k * 100).toFixed(1) : Math.round(c.k * 100)) + '%';
    $('#plane').style.setProperty('--ik', 1 / c.k);
    if (!this._cq) this._cq = requestAnimationFrame(() => { this._cq = 0; this.cull(); });
  },
  zoomAt(px, py, f) {
    const c = S.cam; if (!c) return; const k = Math.min(2.5, Math.max(this.minK(), c.k * f));
    c.x = px - (px - c.x) * (k / c.k); c.y = py - (py - c.y) * (k / c.k); c.k = k; this.apply();
  },
  zoomMonth(k) { // a month tile was tapped: come close to its days
    const m = this.months?.find(x => x.k === k), b = $('#board'); if (!m) return;
    const z = Math.max(.35, Math.min(.8, (b.clientWidth - 140) / (m.x2 - m.x)));
    this.animate(() => { S.cam = { k: z, x: (b.clientWidth - (m.x2 - m.x) * z) / 2 - m.x * z, y: 72 - m.y * z }; this.apply(); });
  },
  boardMenu(anchor) {
    let p = $('#boardPop'); if (!p) { p = document.createElement('div'); p.id = 'boardPop'; p.className = 'pop range-pop'; document.body.appendChild(p);
      p.addEventListener('click', e => { const b = e.target.closest('[data-board]'); if (!b) return; this.go(b.dataset.board); p.hidden = true; });
      p.addEventListener('submit', async e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim().toLocaleLowerCase('tr').slice(0, 40); if (!v) return;
        const cur = byId('boards'), t = now(); await upsert([{ id: 'boards', type: 'boards', names: [...new Set([...(cur?.names || []), v])], ts: cur?.ts || t, tags: [] }]); p.hidden = true; this.go(v); });
      document.addEventListener('pointerdown', e => { if (!e.target.closest('#boardPop,#boardBtn')) p.hidden = true; }); }
    const cur = S.board || 'main', count = n => S.items.filter(i => !i.deleted && !HIDDEN.has(i.type) && (i.project === n || (i.boards || []).includes(n))).length;
    p.innerHTML = `<div class="side-label">Panolar</div><button class="side-row${cur === 'main' ? ' on' : ''}" data-board="main">${ic('board', 'sm')}<span class="lbl">Genel</span></button>`
      + boardNames().map(n => `<button class="side-row${cur === n ? ' on' : ''}" data-board="${esc(n)}">${ic('folder', 'sm')}<span class="lbl">${esc(n)}</span><span class="n">${count(n)}</span></button>`).join('')
      + `<form class="new-board"><input placeholder="+ Yeni pano (ör. ev)" aria-label="Yeni pano adı" maxlength="40"></form><p class="hint" style="padding:4px 9px">${aiName()} bir kaydı bir projeye koyunca o projenin panosunda da görünür.</p>`;
    p.hidden = false; const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, r.right - p.offsetWidth) + 'px'; p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
  },
  go(name) { S.board = name === 'main' ? null : name; try { localStorage.setItem('hn-board', S.board || ''); } catch { } S.cam = null; render(); },
  rangeMenu(anchor) {
    let p = $('#rangePop'); if (!p) { p = document.createElement('div'); p.id = 'rangePop'; p.className = 'pop range-pop'; document.body.appendChild(p);
      p.addEventListener('click', e => { const b = e.target.closest('[data-range]'); if (!b) return; S.boardRange = b.dataset.range; _rs = null; try { localStorage.setItem('hn-range', S.boardRange); } catch { } p.hidden = true; S.cam = null; render(); });
      document.addEventListener('pointerdown', e => { if (!e.target.closest('#rangePop,#rangeBtn')) p.hidden = true; }); }
    const cur = S.boardRange || '30';
    p.innerHTML = `<div class="side-label">Panoda göster</div>` + RANGES().map(([v, l]) => `<button class="side-row${v === cur ? ' on' : ''}" data-range="${v}">${ic(v === 'all' ? 'layers' : 'clock', 'sm')}<span class="lbl">${l}</span>${v === cur ? ic('check', 'sm') : ''}</button>`).join('')
      + `<p class="hint" style="padding:6px 9px 4px">Panoya koyduğun ya da taşıdığın kartlar her zaman görünür.</p>`;
    p.hidden = false; const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, r.right - p.offsetWidth) + 'px'; p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px';
  },
  minK() { // far enough to see every month of the range on one screen
    const b = $('#board'), w = this.months?.length ? this.months.at(-1).x2 - this.months[0].x : 0;
    return Math.max(.002, Math.min(.2, w ? (b.clientWidth - 120) / w : .2));
  },
  zoomTo(k) { // around the middle, but never below the cards (they stand in a band at the top)
    const b = $('#board'), top = S.cam.y + (this.y0 || 0) * S.cam.k; this.animate(() => this.zoomAt(b.clientWidth / 2, Math.max(64, Math.min(b.clientHeight / 2, top + 60)), k / S.cam.k));
  },
  animate(fn) { const p = $('#plane'); p.style.transition = 'transform .3s var(--ease)'; fn(); clearTimeout(this._at); this._at = setTimeout(() => { p.style.transition = ''; }, 320); }, // 109a: a fast 2nd click must not cut the 1st one's slide
  anyVisible() {
    const v = this.view(0); if (!v || !this.M) return false;
    for (const m of this.M.values()) if (m.x < v.x2 && m.x + m.w > v.x1 && m.y < v.y2 && m.y + Math.min(m.h, 400) > v.y1) return true;
    return false;
  },
  fit(anim = true) {
    const ms = [...(this.M?.values() || [])], b = $('#board');
    if (!b.clientWidth) { if (!b.hidden) requestAnimationFrame(() => this.fit(anim)); return; } // not laid out yet
    if (!ms.length) { S.cam = { k: 1, x: 24, y: 72 }; return this.apply(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ms.forEach(m => { x1 = Math.min(x1, m.x); y1 = Math.min(y1, m.y - 30); x2 = Math.max(x2, m.x + m.w); y2 = Math.max(y2, m.y + (m.auto ? m.h : Math.min(m.h, 300))); });
    const top = 64, bot = 110, W = b.clientWidth - 48, H = b.clientHeight - top - bot;
    const phone = innerWidth < 900;
    let k = phone ? 1 : Math.max(.35, Math.min(1, W / (x2 - x1), H / (y2 - y1))); // 98 phone: full size, the days scroll sideways from the newest
    if (phone && (x2 - x1) <= W) k = Math.max(.7, Math.min(1, W / (x2 - x1)));
    if (!phone && (x2 - x1) * k > W * 3 && (S.boardRange === 'all' || S.boardRange?.[0] === 'y')) k = Math.max(this.minK(), Math.min(this.FAR * .9, W / (x2 - x1))); // a long range: months on one screen
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
    const list = S.items.filter(i => posOf(i) && !i.sticky);
    if (!list.length) { this.fit(); return toast('Zaten düzenli', 1500, 'check'); }
    const before = list.map(i => ({ id: i.id, pos: posOf(i) }));
    list.forEach(i => setPos(i, undefined));
    await this.savePos(list); S.items = [...S.items]; S.cam = null; render(); // 91: a new array, or render() sees "same items" and keeps the old board
    toast('Günlere göre dizildi', 5000, 'layers', { label: 'Geri al', fn: async () => {
      const back = before.map(b => { const i = byId(b.id); if (i) setPos(i, b.pos); return i; }).filter(Boolean);
      await this.savePos(back); S.items = [...S.items]; render();
    } });
  },
  init() {
    const b = $('#board'), pts = new Map(); let drag = null, pinch = null, space = false, wr = 0;
    const redraw = () => { if (!wr) wr = requestAnimationFrame(() => { wr = 0; this.wires(); }); };
    addEventListener('keydown', e => { if (e.code === 'Space' && S.view === 'board' && !e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') && !document.querySelector('dialog[open]')) { e.preventDefault(); space = true; b.classList.add('space'); } });
    addEventListener('keyup', e => { if (e.code === 'Space') { space = false; b.classList.remove('space'); } });
    b.addEventListener('pointerdown', e => {
      if (e.target.closest('.acts') || e.button === 2 || !S.cam) return;
      if (e.target.closest('#months')) { // 109a: the month grid keeps its own taps and scrolling (no capture), but two fingers still zoom
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = null;
        if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      b.setPointerCapture(e.pointerId);
      if (pts.size === 2) {
        if (drag?.card && drag.moved) return; // keep dragging the card, ignore the 2nd finger
        drag?.card?.classList.remove('dragging'); drag = null;
        const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; return;
      }
      if (S.tool !== 'select' && !space && e.button !== 1 && !e.target.closest('.st-body[contenteditable]')) { drag = Ink.start(e); if (drag) { this.busy = true; return; } }
      if (e.target.closest('.st-body[contenteditable]')) return;
      const sz = e.target.closest('.st-size');
      if (sz) { const body = sz.parentNode.querySelector('.st-body'); drag = { resize: sz.parentNode, body, sx: e.clientX, sy: e.clientY, fs0: parseFloat(getComputedStyle(body).fontSize) }; this.busy = true; return; }
      const card = space || e.button === 1 ? null : e.target.closest('.bcard');
      drag = { card, tile: null, sx: e.clientX, sy: e.clientY, moved: false, cx: S.cam.x, cy: S.cam.y, ox: card?.offsetLeft, oy: card?.offsetTop };
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
      if (drag.resize) { // text size follows the corner handle
        drag.fs = Math.round(Math.max(10, Math.min(160, drag.fs0 + ((e.clientX - drag.sx) + (e.clientY - drag.sy)) / 2 / S.cam.k * .6)));
        drag.body.style.fontSize = drag.fs + 'px'; return;
      }
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!drag.moved && drag.card) {
        drag.card.classList.add('dragging'); drag.card.parentNode.appendChild(drag.card); // on top
        this.busy = true;
      }
      drag.moved = true;
      if (drag.card) {
        drag.card.style.left = drag.ox + dx / S.cam.k + 'px'; drag.card.style.top = drag.oy + dy / S.cam.k + 'px'; redraw();
      } else { b.classList.add('panning'); S.cam.x = drag.cx + dx; S.cam.y = drag.cy + dy; this.apply(); }
    });
    const flush = () => { this.busy = false; if (this.pending) this.render(visible(true)); }; // 126: apply what came in during the drag
    const up = async e => {
      pts.delete(e.pointerId); b.classList.remove('panning');
      if (pts.size < 2) pinch = null;
      if (pts.size) return;
      const d = drag; drag = null; if (!d) return flush();
      try { await this.drop(d, e); } finally { flush(); }
    };
    this.drop = async (d, e) => {
      if (d.ink) return Ink.end(d, e);
      if (d.tile && !d.moved) return this.zoomMonth(d.tile);
      if (d.resize) { const i = byId(d.resize.dataset.id); if (i && d.fs && d.fs !== i.fs) await upsert([{ ...i, fs: d.fs }]); return; }
      if (!d.card || !d.card.isConnected) return;
      if (!d.moved) { if (e.type !== 'pointerup') return; return byId(d.card.dataset.id)?.sticky ? Ink.edit(d.card) : openItem(d.card.dataset.id); }
      d.card.classList.remove('dragging');
      const i = byId(d.card.dataset.id); if (!i) return;
      setPos(i, { x: Math.round(d.card.offsetLeft), y: Math.round(d.card.offsetTop) });
      d.card.classList.remove('auto'); d.card.style.height = '';
      const m = this.M?.get(i.id), p = posOf(i); if (m) Object.assign(m, { x: p.x, y: p.y, auto: false, h: m.h + 40 });
      await this.savePos([i]); // only this card moves; the day columns stay where they are
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('dblclick', e => { if (S.tool === 'select' && !e.target.closest('.bcard')) Ink.sticky('note', e); });
    Ink.init();
    b.addEventListener('click', e => { const a = e.target.closest('.act'); if (a) { e.stopPropagation(); itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); } });
    b.addEventListener('wheel', e => {
      if (!S.cam) return;
      const zoom = e.ctrlKey || e.metaKey;
      if (!zoom && e.target.closest('#months')) return; // the month grid scrolls by itself
      e.preventDefault(); const r = b.getBoundingClientRect();
      // 109a: a mouse notch (100-120 px, or lines) was e^1.2 = 3.3x per click and hit the limit at once; now 1.2x a notch, a trackpad pinch stays smooth
      if (zoom) this.zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaMode || Math.abs(e.deltaY) >= 50 ? (e.deltaY < 0 ? 1.2 : 1 / 1.2) : Math.exp(-Math.max(-30, Math.min(30, e.deltaY)) * .01));
      else { S.cam.x -= e.deltaX || (e.shiftKey ? e.deltaY : 0); S.cam.y -= e.shiftKey ? 0 : e.deltaY; this.apply(); }
    }, { passive: false });
    $('#fitBtn').innerHTML = ic('fit', 'sm');
    $('#tidyBtn').innerHTML = ic('layers', 'sm');
    $('#zoomIn').innerHTML = ic('plus', 'sm'); $('#zoomOut').innerHTML = '<svg class="i sm" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>';
    const zc = f => { if (!S.cam) this.fit(false); if (!S.cam) return; const r = b.getBoundingClientRect(); this.animate(() => this.zoomAt(r.width / 2, r.height / 2, f)); };
    $('#zoomIn').onclick = () => zc(1.25); $('#zoomOut').onclick = () => zc(1 / 1.25);
    $('#zoomPct').onclick = () => { if (!S.cam) this.fit(false); if (S.cam) this.zoomTo(1); };
    $('#fitBtn').onclick = () => this.fit();
    $('#rangeBtn').onclick = e => this.rangeMenu(e.currentTarget);
    $('#boardBtn').onclick = e => this.boardMenu(e.currentTarget);
    try { S.board = localStorage.getItem('hn-board') || null; } catch { }
    try { S.boardRange = localStorage.getItem('hn-range') || '30'; } catch { S.boardRange = '30'; }
    addEventListener('resize', () => { if (S.view === 'board' && !$('#board').hidden && !this.anyVisible()) this.fit(false); });
    $('#tidyBtn').onclick = () => this.tidy();
    $('#months').addEventListener('click', e => { const t = e.target.closest('[data-month]'); if (t) this.zoomMonth(t.dataset.month); });
  },
};

// ---------- Claude bridge ----------
const AI = {
  async ocrImage(i) { // a ~1280 px JPEG (base64) of an image or page 1 of a PDF
    try {
      let src;
      if (fileKind(i) === 'pdf') { const doc = await Prev.pdfDoc(i); if (!doc) return null; src = await Prev.renderPage(doc, 1, 1280); doc.destroy(); }
      else { const u = await blobFor(i); if (!u) return null; src = await createImageBitmap(await (await fetch(u)).blob()); }
      const r = Math.min(1, 1280 / Math.max(src.width, src.height)), c = new OffscreenCanvas(Math.round(src.width * r), Math.round(src.height * r));
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      return b64(new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: .82 })).arrayBuffer()));
    } catch (e) { console.warn('ocr image', e); return null; }
  },
  async pullImports() { // items made by "nts import" on the PC (files already in the GitHub repos)
    if (this._imp) return; this._imp = true;
    try {
      for (let round = 0; round < 40; round++) {
        const list = await this.call('/import-items', null, 30000); if (!list.length) break;
        const add = list.filter(i => !byId(i.id));
        if (add.length) await upsert(add);
        await this.call('/import-items/ack', { ids: list.map(i => i.id) });
        toast(`İçe aktarılanlar alınıyor… ${add.length} kayıt`, 2500, 'inbox');
      }
    } catch (e) { console.warn('imports', e); } finally { this._imp = false; }
  },
  async ocrBackfill() { // images saved before text reading existed: a few at a time, newest first, only when idle
    if (this._ocr || S.aiBusy || !S.bridgeOk) return; this._ocr = true;
    try {
      const todo = S.items.filter(i => !i.deleted && !i.pending && i.ocr === undefined && (fileKind(i) === 'image' || (fileKind(i) === 'pdf' && i.content != null && i.content.length < 40))).sort((a, b) => b.ts - a.ts).slice(0, 4);
      const batch = (await Promise.all(todo.map(async i => ({ id: i.id, image: await this.ocrImage(i) })))).filter(x => x.image);
      const skip = todo.filter(i => !batch.some(b => b.id === i.id)); if (skip.length) await upsert(skip.map(i => ({ ...byId(i.id), ocr: '' })), { sync: false });
      if (!batch.length) return;
      const r = await this.call('/ocr', { items: batch }, 180000), got = new Map((r.items || []).map(x => [x.id, x.text || '']));
      await upsert(batch.map(b => ({ ...byId(b.id), ocr: (got.get(b.id) || '').slice(0, 3000) })));
    } catch (e) { console.warn('ocr', e); } finally { this._ocr = false; }
  },
  async call(path, body, ms = 200000) {
    const { bridgeUrl, bridgeToken } = S.settings;
    if (!bridgeUrl && S.via !== 'relay') throw new Error('Köprü adresi yok');
    const job = Busy.label(path, body), jid = job && Busy.start(job);
    try { return S.via === 'relay' ? await Relay.call(path, body, ms) : await this.raw(bridgeUrl, bridgeToken, path, body, ms); } finally { if (jid) Busy.end(jid); }
  },
  async raw(bridgeUrl, bridgeToken, path, body, ms) {
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
    const { bridgeUrl, bridgeToken } = S.settings; // a direct address first (this PC, Tailscale), else through Supabase
    if (bridgeUrl) try { this.aiSeen(await this.raw(bridgeUrl, bridgeToken, '/health', null, 4000)); S.via = 'direct'; this.setOk(true); return true; } catch { }
    if (Relay.can()) try { this.aiSeen(await Relay.call('/health', null, 7000)); S.via = 'relay'; this.setOk(true); return true; } catch { }
    S.via = null; this.setOk(false); return false;
  },
  // 87: the bridge says which CLIs it has and which one it runs; a device that never chose follows the bridge, a chosen one sets it
  aiSeen(h) {
    if (!h || !h.have) return; S.aiHave = h.have;
    if (!S.settings.aiChosen && AIS[h.ai] && h.ai !== aiKey()) { S.settings.ai = h.ai; DB.put('kv', S.settings, 'settings'); render(); }
    else if (S.settings.aiChosen && h.ai !== aiKey()) setTimeout(() => this.pushAi(), 0);
  },
  async pushAi() { if (!S.bridgeOk && !S.via) return; try { const r = await this.call('/ai-conf', { ai: aiKey() }, 8000); if (r && r.installed === false) toast(`${aiName()} bu bilgisayarda kurulu değil`, 4000, 'cpu'); } catch { } },
  setOk(ok) { const ch = ok !== S.bridgeOk; S.bridgeOk = ok; this.dot(); if (ch) render(); if (ok) { this.kick(); this.pullInbox(); setTimeout(() => Reader.background(), 8000); setTimeout(() => this.ocrBackfill(), 20000); setTimeout(() => Summ.run(), 45000); this.pullImports(); if (ch) { Snapshot.schedule(); BridgeLink.publish(); RelayConf.publish(); } } },
  dot() {
    const n = S.items.filter(i => i.pending && !i.deleted).length;
    for (const d of document.querySelectorAll('.ai')) { d.classList.toggle('ok', S.bridgeOk && !S.aiBusy); d.classList.toggle('busy', S.aiBusy);
      d.title = `Ayarlar · ${S.bridgeOk ? `${aiName()} bağlı${n ? `, ${n} kayıt sırada` : ''}` : `${aiName()} köprüsü kapalı`}${Cloud.on() ? ' · senkron açık' : ''}`; }
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
            await upsert([upd], { sync: false });
            if (upd.content.length < 40) { const image = await AI.ocrImage(upd); if (image) return { ...upd, image }; } // a scanned PDF: Claude reads page 1 as a picture
            return upd;
          }
          if (k === 'image' || (k === 'pdf' && (i.content || '').length < 40)) { const image = await AI.ocrImage(i); return image ? { ...i, image } : i; } // big enough to read the text in it
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
        return { ...i, pending: false, title: i.userTitle ? i.title : x.title, summary: x.summary, ...(typeof x.ocr === 'string' && b.image ? { ocr: x.ocr.slice(0, 3000) } : {}),
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
    const box = $('#answer'); box.hidden = false; document.body.classList.add('answering');
    const head = `<div class="a-head">${ic('spark', 'sm')}<span>${aiName()}</span><span class="q">· ${esc(q)}</span><button data-copy title="Cevabı kopyala" style="margin-left:auto">${ic('copy', 'sm')}</button><button data-close title="Kapat" style="margin-left:0">${ic('x', 'sm')}</button></div>`;
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
    box.innerHTML = `<div class="a-head">${ic('spark', 'sm')}<span>${aiTo()} sor</span><button data-close title="Kapat">${ic('x', 'sm')}</button></div>
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
    toast('' + aiName() + ' etiketleri topluyor…', 60000, 'spark');
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
  merge(remote, { dirty, base } = {}) {
    const local = new Map(S.items.map(i => [i.id, i])), changed = [];
    for (let x of remote) {
      const l = local.get(x.id);
      if (l && dirty?.has(x.id)) { // changed here and not sent yet (84): never ask, decide
        const b = base?.[x.id];
        if (b != null && (x.updatedAt || 0) <= b) continue; // the server still has what this edit started from (or our own echo)
        if (JSON.stringify(x) === JSON.stringify(l)) continue;
        Cloud.keepHeavy(x, l); const m = mergeItem(l, x); if (base) base[x.id] = x.updatedAt || 0; // merged: the server's copy is the new start
        (Cloud._lost ||= []).push({ at: now(), id: x.id, local: l, remote: x });
        changed.push(m); local.set(x.id, m); continue; // stays dirty: the merged version goes up on this run's push
      }
      if (!l || (x.updatedAt || 0) > (l.updatedAt || 0)) {
        Cloud.keepHeavy(x, l);
        if (l && !x.deleted && ((l.posAt || 0) > (x.posAt || 0) || Object.entries(l.posByAt || {}).some(([k, t]) => t > (x.posByAt?.[k] || 0)))) { // newer text, older place: keep our place and send it back
          x = keepPos({ ...x }, l, x); x.updatedAt = (x.updatedAt || 0) + 1; (this._repush ||= []).push(x.id);
        }
        changed.push(x); local.set(x.id, x);
      }
    }
    if (changed.length) { changed.forEach(x => { indexItem(x); if (x.purged) DB.del('files', x.id); }); S.items = [...local.values()]; } // trash keeps the file until it is purged
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
      if (changed.length) { await DB.putMany('items', changed); runSearch(); render(); AI.dot(); if (changed.some(i => i.id === 'bridge')) BridgeLink.adopt(); }
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
  open(id) { return Read.open(id); },
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
    const ka = this._ka && typeof opt.body === 'string' && opt.body.length < 60000;
    const r = await fetch(SB.url + path, { ...opt, ...(ka ? { keepalive: true } : {}), headers: { apikey: SB.key, authorization: 'Bearer ' + await this.token(), ...(opt.headers || {}) } });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(/nts_items|PGRST205|Bucket not found/.test(t) ? 'Supabase\'de Nts tablosu yok (schema.sql çalıştırılmalı)' : `Sunucu ${r.status} ${t.slice(0, 120)}`);
    }
    return r;
  },
  schedule() { clearTimeout(this._t); this._t = setTimeout(() => { this._t = null; this.run(); }, 1500); },
  async markDirty(ids, base) {
    const d = new Set((await DB.get('kv', 'sb-dirty')) || []), b = (await DB.get('kv', 'sb-base')) || {};
    for (const x of ids) { if (!d.has(x) && base?.has(x)) b[x] = base.get(x); d.add(x); } // first unsynced edit: remember where it started
    await DB.put('kv', [...d], 'sb-dirty'); await DB.put('kv', b, 'sb-base');
  },
  // 82: leaving the app (phone to background, tab closed) sends what is waiting right away, keepalive so it survives the close
  async flush() {
    if (!this.on()) return; const waiting = !!this._t; clearTimeout(this._t); this._t = null;
    if (!waiting && !((await DB.get('kv', 'sb-dirty')) || []).length) return; // nothing to send
    this._ka = true; try { await this.run(); } finally { this._ka = false; }
  },
  // heavy parts go to nts_heavy (if the table exists): item rows stay small, the phone's first sync is fast
  HEAVY: ['read', 'content', 'ocr', 'explain'],
  split(i) {
    if (this.noHeavy) return { light: i, heavy: null };
    const h = {}; let any = false;
    for (const k of this.HEAVY) if (i[k] != null && i[k] !== '') { h[k] = i[k]; any = true; }
    if (i.conv?.log?.length) { h.convLog = i.conv.log; any = true; }
    if (!any) return { light: i, heavy: null };
    const light = { ...i, heavy: true }; this.HEAVY.forEach(k => delete light[k]); if (h.convLog) light.conv = { ...i.conv, log: undefined };
    return { light, heavy: h };
  },
  keepHeavy(x, l) { // a light row from the server must not wipe heavy parts this device already has
    if (!x.heavy || !l) return x;
    for (const k of this.HEAVY) if (x[k] === undefined && l[k] !== undefined) x[k] = l[k];
    if (x.conv && !x.conv.log && l.conv?.log) x.conv = { ...x.conv, log: l.conv.log };
    return x;
  },
  async pullHeavy() { // in the background, after the light rows
    if (this.noHeavy || this._ph) return; this._ph = true;
    try {
      let since = (await DB.get('kv', 'sb-hsince')) || '1970-01-01T00:00:00Z';
      for (;;) {
        let res; try { res = await this.req(`/rest/v1/nts_heavy?select=id,data,enc,updated_at,synced_at&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=200`); }
        catch (e) { this.noHeavy = true; return; } // no table yet
        const rows = await res.json(), upd = [];
        for (const r of rows) { const h = await this.unpack(r), i = byId(r.id); if (!i) continue; const m = { ...i, ...h }; delete m.convLog; if (h.convLog) m.conv = { ...(i.conv || {}), log: h.convLog }; upd.push(m); }
        if (upd.length) { upd.forEach(indexItem); const map = new Map(S.items.map(i => [i.id, i])); upd.forEach(i => map.set(i.id, i)); S.items = [...map.values()]; await DB.putMany('items', upd); }
        if (rows.length) { since = rows.at(-1).synced_at; await DB.put('kv', since, 'sb-hsince'); }
        if (rows.length < 200) break;
        await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 2000 }));
      }
      render();
    } catch (e) { console.warn('heavy', e); } finally { this._ph = false; }
  },
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
    const dirty = new Set((await DB.get('kv', 'sb-dirty')) || []), base = (await DB.get('kv', 'sb-base')) || {};
    const changed = GH.merge(all, { dirty, base }); await DB.put('kv', base, 'sb-base');
    if (GH._repush?.length) { await this.markDirty(GH._repush); GH._repush = []; }
    if (this._lost?.length) { const l = ((await DB.get('kv', 'sb-lost')) || []).concat(this._lost).slice(-50); this._lost = []; await DB.put('kv', l, 'sb-lost'); }
    if (changed.length) { await DB.putMany('items', changed); runSearch(); render(); AI.dot(); if (changed.some(i => i.id === 'bridge')) BridgeLink.adopt(); }
    await DB.put('kv', since, 'sb-since');
  },
  async push() {
    const dirty = new Set((await DB.get('kv', 'sb-dirty')) || []); if (!dirty.size) return false;
    const map = new Map(S.items.map(i => [i.id, i])), ids = [...dirty].filter(id => map.has(id));
    for (let k = 0; k < ids.length; k += 200) {
      const part = ids.slice(k, k + 200);
      const parts = part.map(id => { const i = map.get(id); return { i, ...this.split(i) }; });
      const heavy = await Promise.all(parts.filter(p => p.heavy).map(async p => ({ user_id: this.s.user.id, id: p.i.id, updated_at: p.i.updatedAt || 0, ...(await this.pack(p.heavy)) })));
      if (heavy.length) { // first, so a light row never points at heavy parts that aren't there yet
        try { await this.req('/rest/v1/nts_heavy?on_conflict=user_id,id', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(heavy) }); }
        catch (e) { console.warn('nts_heavy', e.message); this.noHeavy = true; parts.forEach(p => { p.light = p.i; }); } // table not created yet: everything in one row, as before
      }
      const rows = await Promise.all(parts.map(async p => ({ user_id: this.s.user.id, id: p.i.id, updated_at: p.i.updatedAt || 0, ...(await this.pack(p.light)) })));
      await this.req('/rest/v1/nts_items?on_conflict=user_id,id', { method: 'POST', headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
      // re-read: edits made while this was uploading must stay dirty
      const left = new Set((await DB.get('kv', 'sb-dirty')) || []), b = (await DB.get('kv', 'sb-base')) || {};
      part.forEach(id => { left.delete(id); if (map.get(id)?.updatedAt === byId(id)?.updatedAt) delete b[id]; }); // edited again meanwhile: keep its start
      await DB.put('kv', [...left], 'sb-dirty'); await DB.put('kv', b, 'sb-base');
    }
    const left = ((await DB.get('kv', 'sb-dirty')) || []).filter(id => map.has(id) || !dirty.has(id)); await DB.put('kv', left, 'sb-dirty');
    return ids.length > 0;
  },
  async uploadFiles() {
    if (Repo.on()) return Repo.uploadFiles(); // files go to the GitHub repos once GitHub is connected
    let n = 0;
    for (const i of S.items.filter(i => i.type === 'file' && !i.sbPath && !i.ghPath && !i.deleted && !i.fileSkip)) {
      const rec = await DB.get('files', i.id); if (!rec) continue;
      const blob = await shrinkImage(rec.blob, i.mime);
      if (blob.size > 50e6) { await upsert([{ ...i, fileSkip: true }], { sync: false }); continue; }
      const path = `${this.s.user.id}/${monthOf(i.ts)}/${i.id}${Crypt.key ? '.enc' : ''}`;
      const body = Crypt.key ? await Crypt.seal(new Uint8Array(await blob.arrayBuffer())) : blob;
      await this.req('/storage/v1/object/nts-files/' + path, { method: 'POST', headers: { 'x-upsert': 'true', 'content-type': Crypt.key ? 'application/octet-stream' : (i.mime || 'application/octet-stream') }, body });
      await upsert([{ ...i, sbPath: path, fileSynced: true }], { sync: false }); n++;
    }
    // small previews next to the files, so other devices show galleries without downloading originals
    for (const i of S.items.filter(i => i.type === 'file' && i.sbPath && !i.sbThumb && !i.deleted && ['image', 'pdf', 'video'].includes(fileKind(i))).slice(0, 40)) {
      const t = await Prev.thumbBlob(i); if (!t) continue;
      const path = `${this.s.user.id}/thumbs/${monthOf(i.ts)}/${i.id}.webp${Crypt.key ? '.enc' : ''}`, body = Crypt.key ? await Crypt.seal(new Uint8Array(await t.arrayBuffer())) : t;
      try { await this.req('/storage/v1/object/nts-files/' + path, { method: 'POST', headers: { 'x-upsert': 'true', 'content-type': Crypt.key ? 'application/octet-stream' : 'image/webp' }, body }); await upsert([{ ...byId(i.id), sbThumb: path }]); n++; }
      catch (e) { console.warn('thumb upload', e.message); break; }
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
      (window.requestIdleCallback || setTimeout)(() => this.pullHeavy(), { timeout: 4000 }); // readable copies, PDF text, OCR: after, in the background
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
    ws.onmessage = e => { this.last = now(); try { const m = JSON.parse(e.data);
      if (m.event === 'phx_reply' && m.topic === this.topic()) this.joined = m.payload?.status === 'ok';
      else if (m.event === 'broadcast' && m.payload?.event === 'changed') Cloud.schedule();
      else if (m.event === 'broadcast' && m.payload?.event === 'relay-res') Relay.onRes(m.payload.payload); } catch { } };
    ws.onclose = () => {
      clearInterval(this.hb); this.joined = false; if (this.ws === ws) this.ws = null;
      if (!this.stopped && Cloud.on()) setTimeout(() => this.start(), Math.min(30e3, 1e3 * 2 ** this.retry++));
    };
  },
  stop() { this.stopped = true; clearInterval(this.hb); const ws = this.ws; this.ws = null; try { ws?.close(); } catch { } },
  ping() { this.send(this.topic(), 'broadcast', { type: 'broadcast', event: 'changed', payload: {} }); },
  // 83: after sleep or a network change the socket can look open but be dead (no heartbeat replies): reconnect
  check() {
    if (!Cloud.on() || this.stopped && this.ws) return;
    if (!this.ws || this.ws.readyState > 1) { this.ws = null; return this.start(); }
    if (this.ws.readyState === 1 && now() - (this.last || now()) > 60e3) { try { this.ws.close(); } catch { } }
  },
  async ready(ms = 5000) { this.start(); for (let t = 0; t < ms && !(this.ws?.readyState === 1 && this.joined); t += 100) await new Promise(r => setTimeout(r, 100)); return this.ws?.readyState === 1 && this.joined; },
};
// 74: the phone reaches the PC's bridge through the same Realtime channel when there is no direct address (no Tailscale).
// Sealed with a key made from the bridge token (AES-GCM): Supabase only passes it on, nothing is stored.
const Relay = {
  CH: 180000, wait: new Map(), parts: new Map(),
  token() { const b = byId('bridge'); return (b && !b.deleted && b.token) || S.settings.bridgeToken || ''; },
  can() { return Cloud.on() && !BridgeLink.local() && !!this.token() && 'WebSocket' in window; },
  async key() { const t = this.token(); if (this._kt !== t) { this._kt = t; this._k = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nts-relay:' + t)), 'AES-GCM', false, ['encrypt', 'decrypt']); } return this._k; },
  async seal(o) { const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await this.key(), new TextEncoder().encode(JSON.stringify(o)))), b = new Uint8Array(12 + ct.length); b.set(iv); b.set(ct, 12); let s = ''; for (let k = 0; k < b.length; k += 32768) s += String.fromCharCode(...b.subarray(k, k + 32768)); return btoa(s); },
  async open(s) { const b = Uint8Array.from(atob(s), c => c.charCodeAt(0)); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, await this.key(), b.subarray(12)))); },
  async call(path, body, ms = 200000) {
    if (!await Live.ready()) throw new Error('Senkron kanalı açılamadı');
    const id = newId(), s = await this.seal({ path, body: body || null }), n = Math.max(1, Math.ceil(s.length / this.CH));
    const got = new Promise((res, rej) => this.wait.set(id, { res, rej, t: setTimeout(() => { this.wait.delete(id); rej(new Error('Bilgisayar cevap vermedi')); }, ms) }));
    for (let k = 0; k < n; k++) Live.send(Live.topic(), 'broadcast', { type: 'broadcast', event: 'relay-req', payload: { id, k, n, d: s.slice(k * this.CH, (k + 1) * this.CH) } });
    const r = await got; if (r.status >= 400) throw new Error(r.body?.error || 'HTTP ' + r.status); return r.body;
  },
  async onRes(m) {
    const w = m && this.wait.get(m.id); if (!w) return;
    let e = this.parts.get(m.id); if (!e) this.parts.set(m.id, e = []); e[m.k] = m.d;
    if (e.filter(x => x != null).length < m.n) return; this.parts.delete(m.id); this.wait.delete(m.id); clearTimeout(w.t);
    try { w.res(await this.open(e.join(''))); } catch (err) { w.rej(err); }
  },
};
// the PC app tells its bridge which channel to listen on (only the app on this computer, signed in)
const RelayConf = { async publish() { if (!BridgeLink.local() || !Cloud.on() || !S.bridgeOk) return; const k = SB.url + Cloud.s.user.id; if (this._k === k) return; try { await AI.raw(S.settings.bridgeUrl, S.settings.bridgeToken, '/relay-conf', { url: SB.url, key: SB.key, uid: Cloud.s.user.id }, 8000); this._k = k; } catch (e) { console.warn('relay-conf', e); } } };
// One front door: signed in → Supabase; else the old GitHub repo if set up.
const Sync = {
  ready() { return Cloud.on() || GH.ready(); },
  schedule() { Cloud.on() ? Cloud.schedule() : Repo.on() ? (clearTimeout(this._r), this._r = setTimeout(() => Repo.uploadFiles(), 2500)) : GH.schedule(); },
  run() { return Cloud.on() ? Cloud.run() : Repo.on() ? Repo.uploadFiles() : GH.run(); },
  async markDirty(list, base) { await GH.markDirty([...new Set(list.map(i => monthOf(i.ts)))]); await Cloud.markDirty(list.map(i => i.id), base); },
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
  // chat name from the export's file name ("WhatsApp Chat with Ali.zip", "WhatsApp Sohbeti - Ali.zip")
  const chat = (file.name.replace(/\.(zip|txt)$/i, '').match(/(?:chat with|sohbeti?\s*-|ile sohbet|-)\s*(.+)$/i)?.[1] || file.name.replace(/\.(zip|txt)$/i, '')).trim().slice(0, 60);
  // messages close together (same day, < 30 min apart) become ONE item; its photos/files live inside it
  const live = msgs.filter(m => m.text && !WA_SKIP.test(m.text)), groups = [];
  for (const m of live) { const g = groups.at(-1); if (g && dayKey(g.at(-1).ts) === dayKey(m.ts) && m.ts - g.at(-1).ts < 30 * 60e3) g.push(m); else groups.push([m]); }
  const hash = t => { let h = 2166136261; for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const out = [];
  for (const g of groups) {
    const id = 'wa' + hash(chat + g[0].ts + g[0].text.slice(0, 60)); if (byId(id)) continue; // already imported
    const log = [], kids = [];
    for (const m of g) {
      let att = null, text = m.text;
      for (const re of WA_ATTACH) { const a = text.match(re); if (a) { att = a[1].trim(); text = text.slice(a[0].length).trim(); break; } }
      if (att) {
        const zf = zfiles.get(att), blob = zf ? await zf.async('blob') : null, kid = 'wf' + hash(id + att);
        kids.push({ id: kid, type: 'file', fileName: att, mime: blob?.type || mimeOf(att), size: blob?.size || 0, text, ts: m.ts, parent: id, archive: true, source: 'whatsapp', chat, tags: [], ...(blob ? { _blob: blob } : {}) });
        log.push({ ts: m.ts, who: m.who, text, att: kid });
      } else log.push({ ts: m.ts, who: m.who, text });
    }
    const photos = kids.filter(k => fileKind(k) === 'image'), who = [...new Set(g.map(m => m.who))];
    const label = new Date(g[0].ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const text = log.map(l => (who.length > 1 ? l.who + ': ' : '') + (l.att ? `[${byIdIn(kids, l.att)?.fileName}] ` : '') + l.text).join('\n').trim();
    if (g.length === 1 && !kids.length) { // a lone message stays a plain note/link
      const [it] = itemsFromInput({ text: g[0].text }); if (!it) continue;
      out.push({ ...it, id, ts: g[0].ts, group: undefined, source: 'whatsapp', chat, archive: true, tags: [] }); continue;
    }
    out.push({ id, type: 'note', title: `${label} · ${g.length} mesaj`, text, ts: g[0].ts, source: 'whatsapp', chat, archive: true, tags: [],
      conv: { n: g.length, who, end: g.at(-1).ts, log, kids: kids.map(k => k.id) }, ...(photos[0] ? { cover: photos[0].id } : {}) });
    out.push(...kids);
  }
  if (!out.length) return toast('Hepsi zaten içeride ✓');
  for (let k = 0; k < out.length; k += 200) {
    const saved = await saveItems(out.slice(k, k + 200));
    await upsert(saved.map(i => i.parent ? { ...i, pending: false } : i), { sync: false }); // Claude organizes the conversation, not each photo
    toast(`İçeri alınıyor… ${Math.min(k + 200, out.length)}/${out.length}`, 60000);
  }
  const nConv = out.filter(i => !i.parent).length;
  toast(`${live.length} mesaj → ${nConv} kayıt içeri alındı (Arşiv)${S.bridgeOk ? ' · ' + aiName() + ' düzenliyor' : ''}`, 5000, 'check');
  Sync.schedule(); AI.kick();
}
const byIdIn = (list, id) => list.find(x => x.id === id);
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
// Markdown for Obsidian & co.: one .md per item (front matter: date, type, tags, link…), files in attachments/, one zip
async function exportMarkdown() {
  toast('Markdown hazırlanıyor…', 60000, 'down');
  const zip = new JSZip(), used = new Set(), items = alive().filter(i => i.type !== 'draw').sort((a, b) => a.ts - b.ts);
  const slug = t => (t || 'kayit').replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'kayit';
  const yq = v => JSON.stringify(String(v)); // YAML-safe quoted string
  for (const i of items) {
    const d = new Date(i.ts), day = dayKey(i.ts), base = `${day} ${slug(titleOf(i))}`;
    let name = base, n = 2; while (used.has(name.toLocaleLowerCase('tr'))) name = `${base} ${n++}`; used.add(name.toLocaleLowerCase('tr'));
    const fm = ['---', `title: ${yq(titleOf(i))}`, `date: ${d.toISOString()}`, `type: ${groupOf(i)}`];
    if (i.tags?.length) fm.push(`tags: [${i.tags.map(yq).join(', ')}]`);
    if (i.url) fm.push(`link: ${yq(i.url)}`);
    if (i.project) fm.push(`project: ${yq(i.project)}`);
    if (i.lists?.length) fm.push(`lists: [${i.lists.map(k => yq(listName(k))).join(', ')}]`);
    if (i.starred) fm.push('starred: true');
    if (i.todo) fm.push(`todo: ${i.todo.done ? 'done' : 'open'}`, ...(i.todo.due ? [`due: ${i.todo.due}`] : []));
    if (i.source && i.source !== 'manual') fm.push(`source: ${i.source}`);
    fm.push('---', '');
    const body = [`# ${titleOf(i)}`, ''];
    if (i.summary) body.push(`> ${i.summary}`, '');
    if (i.url) body.push(`[${i.meta?.title || domain(i.url)}](${i.url})`, '');
    if (i.text) body.push(i.text, '');
    if (i.type === 'file') {
      const f = await DB.get('files', i.id), fname = `${day}-${i.id}-${slug(i.fileName).replace(/ /g, '-')}`;
      if (f?.blob) { zip.file(`attachments/${fname}`, f.blob); body.push(fileKind(i) === 'image' ? `![[${fname}]]` : `[[${fname}]]`, ''); }
      else body.push(`*(dosya bu cihazda yok: ${i.fileName})*`, '');
    }
    if (i.ocr) body.push('## Resimdeki yazı', '', i.ocr, '');
    if (i.highlights?.length) body.push('## İşaretlediklerim', '', ...i.highlights.map(h => `> ${h.text}\n`), '');
    if (i.todo?.subs?.length) body.push('## Alt görevler', '', ...i.todo.subs.map(x => `- [${x.done ? 'x' : ' '}] ${x.t}`), '');
    if (i.explain?.text) body.push('## ' + aiName(), '', i.explain.text, '');
    if (i.read?.blocks?.length) body.push('## Okunur kopya', '', ...i.read.blocks.map(b => b.t === 'h' ? `### ${b.x}` : b.t === 'li' ? `- ${b.x}` : b.t === 'q' ? `> ${b.x}` : b.x).join('\n\n').split('\n'), '');
    zip.file(`Nts/${day.slice(0, 7)}/${name}.md`, fm.concat(body).join('\n'));
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nts-markdown-${dayKey(now())}.zip`; a.click();
  toast(`${items.length} kayıt Markdown olarak indirildi`, 3000, 'check');
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
    made.push({ id: newId(), type: 'link', url, text: '', title: a.textContent.trim() || undefined, ts, createdAt: now(), source: 'bookmarks', archive: true, tags: tag ? [tag] : [], pending: false, seenAt: ts,
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
      el.innerHTML = `<form class="lock-card"><span class="mark lg">${$('.hud-l .mark')?.innerHTML || ''}</span><h2>Nts kilitli</h2><p>Devam etmek için şifreni gir.</p>
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

// ---------- Claude on the phone, no setup: the PC writes the bridge key (+ a Tailscale address if there is one) into a synced (hidden) item,
// the phone signs in with the same Google account and picks it up. With the app lock on, it travels encrypted like every item.
const BridgeLink = {
  local: () => /^(localhost|127\.0\.0\.1)$/.test(location.hostname),
  async publish() {
    if (!this.local() || !Cloud.on() || !S.bridgeOk || !S.settings.bridgeToken) return;
    const cur = byId('bridge'), url = S.bridgeRemote || null, token = S.settings.bridgeToken;
    if (cur && !cur.deleted && cur.url === url && cur.token === token) return;
    const t = now(); await upsert([{ id: 'bridge', type: 'bridge', url, token, ts: t, createdAt: cur?.createdAt || t, tags: [] }]);
  },
  async adopt() {
    if (this.local()) return;
    const b = byId('bridge'); if (!b || b.deleted || !b.token) return;
    if (S.settings.bridgeToken === b.token && (!b.url || S.settings.bridgeUrl === b.url) && S.bridgeOk) return;
    if (b.url) S.settings.bridgeUrl = b.url; S.settings.bridgeToken = b.token; await DB.put('kv', S.settings, 'settings');
    if (await AI.health()) toast('' + aiName() + ' bağlandı', 2200, 'check');
  },
};

// ---------- files in the owner's private GitHub repos: nts-files-1, -2, … (opened by the app, ~900 MB each) ----------
// Connected once: on the PC the bridge hands over the local `gh` login; it is kept in a hidden synced item (encrypted with the
// app lock), so the phone signed in with the same Google account uploads to the same repos without any setup.
const Repo = {
  LIMIT_KB: 900 * 1024,
  link: () => { const l = byId('ghlink'); return l && !l.deleted && l.token ? l : null; },
  on() { return !!this.link(); },
  active() { return this.link()?.repos?.at(-1) || null; },
  async api(path, opt = {}, accept = 'application/vnd.github+json') {
    const r = await fetch('https://api.github.com' + path, { cache: 'no-store', ...opt, headers: { authorization: 'Bearer ' + this.link().token, accept, 'x-github-api-version': '2022-11-28', ...(opt.headers || {}) } });
    if (!r.ok && !(opt.ok404 && r.status === 404)) { const e = new Error(`GitHub ${r.status}${r.status === 401 ? ' (bağlantı süresi dolmuş, yeniden bağla)' : ''}`); e.status = r.status; throw e; }
    return r;
  },
  async connect() { // PC: take the gh login from the bridge
    try {
      const base = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port === '8787' ? '' : 'http://127.0.0.1:8787';
      const r = await fetch(base + '/gh-token', { signal: AbortSignal.timeout(9000) }), j = await r.json();
      if (!r.ok) throw new Error(j.error || 'köprü cevap vermedi');
      const cur = this.link(), t = now();
      await upsert([{ id: 'ghlink', type: 'ghlink', token: j.token, login: j.login, repos: cur?.repos || [], ts: cur?.ts || t, createdAt: cur?.createdAt || t, tags: [] }]);
      await this.ensure(); toast(`GitHub bağlandı: ${j.login}`, 2500, 'check'); return true;
    } catch (e) { toast('GitHub bağlanamadı: ' + e.message, 4000); return false; }
  },
  async ensure() { // a repo to write to; roll over to the next one when full
    const l = this.link(); if (!l) return null;
    let repos = l.repos || [], act = repos.at(-1);
    if (act && now() - (this.checked || 0) < 6 * 3600e3) return act;
    try { // repos opened elsewhere (the PC importer) count too
      const mine = (await (await this.api('/user/repos?per_page=100&affiliation=owner&sort=created')).json()).filter(r => /^nts-files-\d+$/.test(r.name)).sort((a, b) => +a.name.split('-').pop() - +b.name.split('-').pop());
      const names = mine.map(r => r.full_name); if (names.join() !== repos.join() && names.length >= repos.length) { repos = names; act = repos.at(-1); await upsert([{ ...this.link(), repos }]); }
    } catch { }
    if (act) { const r = await this.api(`/repos/${act}`, { ok404: true }); if (r.ok) { const j = await r.json(); S.repoKB = j.size; this.checked = now(); if (j.size < this.LIMIT_KB) return act; } }
    const n = (+(repos.at(-1) || '').split('-').pop() || 0) + 1, name = `nts-files-${n}`;
    const r = await this.api('/user/repos', { method: 'POST', body: JSON.stringify({ name, private: true, auto_init: true, description: 'Nts dosyaları (otomatik)' }), ok404: true });
    if (!r.ok && r.status !== 422) throw new Error('GitHub repo açılamadı: ' + r.status);
    const full = `${l.login}/${name}`; repos = [...repos.filter(x => x !== full), full]; this.checked = now(); S.repoKB = 0;
    await upsert([{ ...this.link(), repos }]); return full;
  },
  async put(repo, path, blob, msg) {
    const bytes = await Crypt.seal(new Uint8Array(await blob.arrayBuffer()));
    const r = await this.api(`/repos/${repo}/contents/${path}`, { method: 'PUT', body: JSON.stringify({ message: msg, content: b64enc(bytes) }), ok404: true });
    if (!r.ok && r.status !== 422) throw new Error('GitHub ' + r.status); // 422: already there (same path)
  },
  async get(repo, path, type = '') {
    const r = await this.api(`/repos/${repo}/contents/${path}`, {}, 'application/vnd.github.raw');
    return new Blob([await Crypt.open(new Uint8Array(await r.arrayBuffer()))], { type });
  },
  async uploadFiles() { // new files (and their small previews) go to the active repo
    if (!this.on() || this.busy) return 0; this.busy = true; let n = 0;
    try {
      for (const i of S.items.filter(i => i.type === 'file' && !i.ghPath && !i.sbPath && !i.fileSynced && !i.deleted && !i.fileSkip).slice(0, 30)) {
        const rec = await DB.get('files', i.id); if (!rec) continue;
        const blob = await shrinkImage(rec.blob, i.mime);
        if (blob.size > 45e6) { await upsert([{ ...byId(i.id), fileSkip: true }], { sync: false }); toast(`${i.fileName}: 45 MB'tan büyük, bilgisayarda "nts import" ile yükle`, 5000); continue; }
        const repo = await this.ensure(), ext = (i.fileName || '').match(/\.[\w]{1,5}$/)?.[0] || '', path = `files/${monthOf(i.ts)}/${i.id}${ext}${Crypt.key ? '.enc' : ''}`;
        await this.put(repo, path, blob, 'nts ' + (i.fileName || i.id));
        const t = await Prev.thumbBlob(i); let ghThumb;
        if (t) { ghThumb = `thumbs/${monthOf(i.ts)}/${i.id}.webp${Crypt.key ? '.enc' : ''}`; await this.put(repo, ghThumb, t, 'nts thumb'); }
        await upsert([{ ...byId(i.id), ghRepo: repo, ghPath: path, ...(ghThumb ? { ghThumb } : {}), fileSynced: true }]); n++;
        S.repoKB = (S.repoKB || 0) + blob.size / 1024; if (S.repoKB > this.LIMIT_KB) this.checked = 0;
      }
    } catch (e) { console.warn('repo', e); GH.status('GitHub: ' + e.message); } finally { this.busy = false; }
    return n;
  },
};

// ---------- settings drawer ----------
async function loadSettings() {
  S.settings = (await DB.get('kv', 'settings')) || {};
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port === '8787') {
    // served by the bridge itself: same origin, token comes from the bridge
    S.settings.bridgeUrl = location.origin;
    try { const c = await (await fetch('/config')).json(); if (c.token) S.settings.bridgeToken = c.token; S.bridgeRemote = c.remote || null; } catch { }
  } else if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    // another localhost port (e.g. a dev server) has its own storage and no token: ask the bridge on this computer
    try {
      const c = await (await fetch('http://127.0.0.1:8787/config', { signal: AbortSignal.timeout(2500) })).json();
      S.bridgeRemote = c.remote || null;
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
const ACCENTS = [['orange', 'Turuncu', '#c2410c', '#ff9a4d'], ['indigo', 'Çivit', '#4f5fd6', '#8b9cff'], ['green', 'Yeşil', '#15803d', '#5fd68a'],
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
const claudeOff = () => onPhone() ? 'Bilgisayar kapalı ya da köprü çalışmıyor.' : '' + aiName() + ' bağlı değil: bilgisayardaki Nts köprüsü kapalı. Ayarlar → ' + aiName() + '.';
function claudeBlock() {
  const n = S.items.filter(i => i.pending && !i.deleted).length;
  if (S.bridgeOk) return `<div class="set-row static">${ic('cpu')}<span><span class="dot ok"></span>${aiName()} bağlı<small>${n ? `${n} kayıt sırada, arka planda düzenleniyor` : 'Kayıtları düzenler, sorularına cevap verir (kutuda Tab)'}${S.via === 'relay' ? ' · bilgisayar üzerinden, şifreli' : ''}</small></span></div>`
    + (BridgeLink.local() && Cloud.on() ? '<p class="hint">Telefonda aynı Google hesabıyla gir: bilgisayar açıkken ' + aiName() + ' telefonda da çalışır, ek kurulum yok.</p>'
      : BridgeLink.local() && !Cloud.on() ? '<p class="hint">Telefonun da bağlanması için burada Google ile gir; telefon aynı hesapla girince ' + aiName() + ' kendiliğinden bağlanır.</p>' : '');
  return `<div class="set-row static">${ic('cpu')}<span><span class="dot off"></span>${aiName()} bağlı değil<small>${onPhone() ? (byId('bridge') ? 'Bilgisayar kapalı ya da köprü çalışmıyor. Bilgisayar açılınca kendiliğinden bağlanır.' : 'Bilgisayardaki Nts\'yi bir kez aynı Google hesabıyla aç; telefon kendiliğinden bağlanır.') : 'Bilgisayardaki Nts köprüsü çalışmıyor.'}</small></span></div>
    ${onPhone() ? `<div class="row"><button class="btn secondary" data-do="test">${ic('cpu', 'sm')}Tekrar dene</button><span class="status" id="bridgeMsg"></span></div>`
    : `<div class="cmd"><code>${BRIDGE_CMD}</code><button class="btn secondary" data-do="copycmd">${ic('copy', 'sm')}Kopyala</button></div>
      <p class="hint">Köprüyü başlatmak için bunu terminale yapıştır. Sonra "Bağlan"a bas.</p>
      <div class="row"><button class="btn primary" data-do="test">${ic('cpu', 'sm')}Bağlan</button><span class="status" id="bridgeMsg"></span></div>`}`;
}
function openSettings(page = 'main') {
  const m = $('#menu'), st = S.settings, locked = !!Lock.conf;
  const head = (title, back) => `<div class="d-head">${back ? `<button class="icon-btn sm" data-do="back" title="Geri">${ic('chev', 'sm flip')}</button>` : ''}<span class="type">${title}</span><span class="sp"></span><button class="icon-btn sm" data-act="close" title="Kapat">${ic('x')}</button></div>`;
  const gBtn = `<button class="btn primary g-btn" data-do="signin"><svg class="i" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05" stroke="none"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" stroke="none"/></svg>Google ile giriş yap</button>`;
  const lockHtml = locked
    ? `<div class="set-row static">${ic('lock')}<span>Şifre açık<small>Açılışta sorulur, yedekler ve senkron şifreli. Unutursan açılamaz.</small></span></div>
       <button class="set-row" data-do="unlock-off">${ic('x')}<span>Şifreyi kaldır</span></button>`
    : `<div class="lock-form" id="lockForm" hidden><p class="hint">Uygulama açılırken sorar; yedekler ve senkron şifreli gider. Unutursan açılamaz.</p>
        <label class="set-field">Şifre<input id="set-pass" type="password" autocomplete="new-password" placeholder="en az 6 karakter"></label>
        <label class="set-field">Şifre tekrar<input id="set-pass2" type="password" autocomplete="new-password"></label>
        <div class="row"><button class="btn primary" data-do="lock-on">Şifreyi kaydet</button></div></div>`;
  const lockBtn = locked ? '' : `<button class="btn secondary" data-do="lockform">${ic('lock', 'sm')}Şifre koy</button>`;
  const cur = document.documentElement.dataset.accent || 'orange', dark = document.documentElement.dataset.theme === 'dark';
  const main = `${head(`${ic('settings', 'sm')}Ayarlar`)}
    <div class="set-sec"><h4>Hesap</h4>
      ${Cloud.on() ? `<div class="set-row static">${ic('cloud')}<span>${esc(Cloud.email())}<small id="syncMsg">${esc(S.syncMsg || 'Telefon ve bilgisayar aynı kayıtları görür')}</small></span></div>
        <div class="acct-btns"><button class="btn secondary" data-do="sync">${ic('cloud', 'sm')}Şimdi senkronla</button>${lockBtn}<button class="btn danger" data-do="signout">Çıkış yap</button></div>`
      : `<p class="hint">Telefonda ve bilgisayarda aynı Google hesabıyla gir, kayıtlar ikisinde de görünsün.${locked ? ' Şifre açık olduğu için sunucuya şifreli gider.' : ''}</p><div class="acct-btns">${gBtn}${lockBtn}</div>`}
      ${lockHtml}
      ${(() => { const l = Repo.link(), pc = BridgeLink.local();
        return l ? `<div class="set-row static">${ic('folder')}<span>Dosyalar: GitHub · ${esc(l.login)}<small>${(l.repos || []).map(r => esc(r.split('/')[1])).join(', ') || 'ilk dosyada repo açılır'}${S.repoKB ? ` · ${Math.round(S.repoKB / 1024)} MB / 900 MB` : ''}. Dolunca yenisi kendiliğinden açılır.</small></span></div>`
          : `<div class="set-row static">${ic('folder')}<span>Dosyalar<small>${pc ? 'Fotoğraf, video ve PDF\'ler senin private GitHub repolarında dursun (nts-files-1, -2…). Bir kez bağla, telefon da Google ile girince kendiliğinden kullanır.' : 'Bilgisayarda GitHub bağlanınca telefon da kendiliğinden kullanır.'}</small></span></div>${pc ? `<div class="row"><button class="btn secondary" data-do="ghconnect">${ic('folder', 'sm')}GitHub'ı bağla</button></div>` : ''}`; })()}
    </div>
    <div class="set-sec"><h4>Görünüm</h4>
      <div class="set-line"><span>Tema</span><div class="seg sm"><button data-do="light" class="${dark ? '' : 'on'}">${ic('sun', 'sm')}Açık</button><button data-do="dark" class="${dark ? 'on' : ''}">${ic('moon', 'sm')}Koyu</button></div></div>
      <div class="set-line"><span>Ana renk</span><div class="swatches">${ACCENTS.map(([k, n, l, d]) => `<button class="sw${k === cur ? ' on' : ''}" data-accent="${k}" title="${n}" style="--c:${dark ? d : l}"></button>`).join('')}
        <label class="sw custom${cur === 'custom' ? ' on' : ''}" title="Özel renk" style="--c:${cur === 'custom' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)'}"><input type="color" id="accentPick" value="${(() => { try { const v = localStorage.getItem('hn-accent'); return v?.startsWith('#') ? v : '#e8590c'; } catch { return '#e8590c'; } })()}"></label></div></div>
      ${S.installEvt ? `<button class="set-row" data-do="install">${ic('install')}<span>Uygulamayı yükle<small>Ana ekrana ekle, Paylaş menüsünde çıksın</small></span></button>` : ''}
    </div>
    <div class="set-sec"><h4>Yapay zekâ</h4>
      <button class="set-row" data-do="aipick">${ic('spark')}<span>Kullanılan: ${aiName()}<small>Claude, Codex ya da Gemini: kayıtları düzenleyen ve soruları cevaplayan</small></span>${ic('chev', 'sm')}</button>
      <div id="claudeBox">${claudeBlock()}</div>
    </div>
    <div class="set-sec">
      <button class="set-row" data-do="tour">${ic('spark')}<span>Nasıl kullanılır?<small>6 adımlık kısa tur</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="lists">${ic('flag')}<span>Listeler<small>${aiOf()} doldurduğu listelerin adı ve görünürlüğü</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="move">${ic('upload')}<span>Kayıtları taşı<small>WhatsApp'tan içe aktar, yedek indir, yedekten geri yükle</small></span>${ic('chev', 'sm')}</button>
    </div>
    <details class="adv"><summary>${ic('chev', 'sm')}Gelişmiş</summary>
      <div class="set-sec">
        <button class="set-row" data-do="tags">${ic('hash')}<span>Konuları sadeleştir<small>${aiName()} benzer konuları birleştirir</small></span></button>
        <button class="set-row" data-do="organize">${ic('spark')}<span>Bekleyenleri şimdi düzenle</span></button>
        <button class="set-row" data-do="linkprev">${ic('link')}<span>Link önizlemesi: ${st.noLinkPreview ? 'kapalı' : 'açık'}<small>${aiName()} köprüsü kapalıyken link başlığı Nts'nin kendi servisinden gelir (giriş yaptıysan), yoksa microlink.io'dan (sadece link adresi gider)</small></span></button>
      </div>
      <div class="set-sec"><h4>Eski senkron: GitHub reposu</h4>
        <p class="hint">Kayıtlar senin private GitHub reponda yedeklenir.
          <a href="https://github.com/settings/personal-access-tokens/new?name=nts-sync&description=Nts%20sync&contents=write" target="_blank" rel="noopener">Anahtar oluştur</a> (sadece nts-data reposu, Contents: Read and write).</p>
        <label class="set-field">Repo<input id="set-ghRepo" value="${esc(st.ghRepo || '')}" placeholder="kullanici/nts-data"></label>
        <label class="set-field">GitHub anahtarı<input id="set-ghToken" type="password" value="${esc(st.ghToken || '')}" placeholder="github_pat_…"></label>
        ${Cloud.on() ? '<p class="hint">Google ile giriş yaptığın için bu kullanılmıyor.</p>' : `<div class="row"><button class="btn secondary" data-do="sync">${ic('cloud', 'sm')}Şimdi senkronla</button><span class="status" id="syncMsg">${esc(S.syncMsg || (GH.ready() ? '' : 'Kapalı'))}</span></div>`}
      </div>
      <div class="set-sec"><button class="set-row wp-row" data-do="wipe">${ic('trash')}<span>Tüm verileri sil<small>Bu cihazdan ya da her yerden; önce yedek indirmeni önerir</small></span></button></div>
    </details>`;
  const move = `${head('Kayıtları taşı', true)}
    <div class="set-sec">
      <button class="set-row" data-do="wa">${ic('chat')}<span>WhatsApp sohbetini içe aktar<small>WhatsApp'ta sohbet → ⋮ → Dışa aktar → Medya dahil. Çıkan dosyayı seç.</small></span></button>
      <button class="set-row" data-do="exportmd">${ic('note')}<span>Markdown olarak indir<small>Obsidian ve benzerleri için: her kayıt bir .md, dosyalar attachments/ içinde</small></span></button>
      <button class="set-row" data-do="export">${ic('down')}<span>Yedek indir<small>Her şeyi tek dosya olarak indir${locked ? ' (şifreli)' : ''}</small></span></button>
      <button class="set-row" data-do="import">${ic('upload')}<span>Yedekten geri yükle</span></button>
      <button class="set-row" data-do="bookmarks">${ic('star')}<span>Tarayıcı yer imlerini içe aktar<small>Chrome/Firefox: Yer imleri → Dışa aktar (HTML). Klasörler konu olur, aynı link iki kez eklenmez.</small></span></button>
    </div>`;
  const listsPage = `${head('Listeler', true)}
    <p class="hint">${aiName()} her kaydı uygun listeye koyar. Bir kaydı elle taşırsan ${aiName()} o kayda dokunmaz. Yapılacaklar her zaman açık.</p>
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
    else if (d === 'aipick') { m.close(); setTimeout(() => AiPick.open(() => openSettings()), 250); }
    else if (d === 'tour') { m.close(); setTimeout(() => Tour.start(), 250); }
    else if (d === 'back') openSettings();
    else if (d === 'import') $('#backupInput').click();
    else if (d === 'bookmarks') $('#bmInput').click();
    else if (d === 'export') { m.close(); exportBackup(); }
    else if (d === 'wipe') { m.close(); setTimeout(() => Wipe.open(), 250); }
    else if (d === 'exportmd') { m.close(); exportMarkdown(); }
    else if (d === 'organize') { m.close(); if (await AI.health()) { AI.process(); toast('' + aiName() + ' düzenliyor', 2000, 'spark'); } else toast(claudeOff(), 3000, 'cpu'); }
    else if (d === 'tags') { m.close(); AI.cleanTags(); }
    else if (d === 'light' || d === 'dark') { setTheme(d); openSettings(); }
    else if (d === 'install') { S.installEvt.prompt(); S.installEvt = null; }
    else if (d === 'ghconnect') { if (await Repo.connect()) openSettings(); }
    else if (d === 'lockform') { const f = $('#lockForm'); f.hidden = !f.hidden; if (!f.hidden) $('#set-pass').focus(); }
    else if (d === 'copycmd') { try { await navigator.clipboard.writeText(BRIDGE_CMD); toast('Kopyalandı. Terminale yapıştır.', 2200, 'check'); } catch { toast(BRIDGE_CMD, 5000); } }
    else if (d === 'test') {
      await saveSettings(); const msg = $('#bridgeMsg'); if (msg) msg.textContent = 'Bağlanıyor…';
      const ok = await AI.health();
      if (ok) $('#claudeBox').innerHTML = claudeBlock(); else if ($('#bridgeMsg')) $('#bridgeMsg').textContent = onPhone() ? 'Ulaşılamadı. Bilgisayar açık ve köprü çalışıyor mu? İki cihazda aynı Google hesabı olmalı.' : 'Hâlâ kapalı. Komutu çalıştırdın mı?';
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
  for (const [id, icn] of [['#clipIco', 'plus'], ['#setIco', 'settings']]) $(id).innerHTML = ic(icn, 'sm');
  S.mode = 'note'; updateSend(); addEventListener('resize', updateSend);
  $('#saveBtn').onclick = submitBox;
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', $('#composer').offsetHeight + 'px')).observe($('#composer'));
  { const dk = $('#composer').closest('.dock'); if (dk) new ResizeObserver(() => document.documentElement.style.setProperty('--dock-full', dk.offsetHeight + 'px')).observe(dk); } // 101: the toast sits above the open search list / answer
  new ResizeObserver(() => { const w = $('#boardTools').offsetWidth; if (w) document.documentElement.style.setProperty('--bt-w', w + 'px'); }).observe($('#boardTools'));
  $('#cHint').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) { setMode(b.dataset.mode); $('#input').focus(); } };
  const inp = $('#input');
  // one box: typing filters the list live, Enter saves, a question (ends with ?) goes to Claude
  let st;
  inp.addEventListener('input', () => {
    autoGrow(); clearTimeout(st); S.hitSel = -1; S.hitsOff = false;
    st = setTimeout(() => { S.q = inp.value.length < 200 ? inp.value : ''; S.limit = 300; runSearch(); render(); }, 80);
  });
  inp.addEventListener('focus', () => { document.body.classList.add('typing'); if (S.hitsOff && !document.querySelector('dialog[open]')) { S.hitsOff = false; renderHits(); } });
  inp.addEventListener('blur', () => document.body.classList.remove('typing'));
  inp.addEventListener('keydown', e => {
    const rows = $('#hits').classList.contains('hits') && !$('#hits').hidden ? [...$('#hits').querySelectorAll('.h-row')] : [];
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
      e.preventDefault();
      S.hitSel = Math.max(-1, Math.min(rows.length - 1, (S.hitSel ?? -1) + (e.key === 'ArrowDown' ? 1 : -1)));
      renderHits(); $('#hits .h-row.sel')?.scrollIntoView({ block: 'nearest' }); return;
    }
    if (e.key === 'Enter' && !e.shiftKey && S.hitSel >= 0 && rows[S.hitSel]) { e.preventDefault(); const id = rows[S.hitSel].dataset.open; S.hitSel = -1; openItem(id); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBox(); }
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && (inp.value.trim() || S.mode === 'ask')) { e.preventDefault(); setMode(S.mode === 'ask' ? 'note' : 'ask'); } // empty box: Tab moves on (no keyboard trap)
    if (e.key === 'Escape') { if (S.mode === 'ask' && !inp.value) setMode('note'); clearBox(); inp.blur(); }
  });
  const clip = $('#fileInput').closest('label'); clip.tabIndex = 0; clip.setAttribute('role', 'button'); clip.setAttribute('aria-label', 'Dosya ekle'); // 109c: reachable by keyboard
  clip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); } });
  $('#fileInput').onchange = e => { S.attach.push(...e.target.files); e.target.value = ''; renderAttach(); };
  $('#attachList').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { S.attach.splice(+b.dataset.rm, 1); renderAttach(); } };
  // paste anywhere: files become attachments, text goes into the composer
  const ownField = el => el?.closest?.('dialog,[contenteditable="true"],[contenteditable="plaintext-only"]') || (el?.closest?.('input,textarea') && el !== inp); // 109c: a sticky note, an item window or another field keeps its own paste/drop
  document.addEventListener('paste', e => {
    if (ownField(e.target)) return;
    const fs = [...(e.clipboardData?.files || [])];
    if (fs.length) { e.preventDefault(); S.attach.push(...fs); renderAttach(); inp.focus(); return; }
    if (e.target.closest('input,textarea')) return;
    const t = e.clipboardData?.getData('text'); if (!t) return;
    e.preventDefault(); inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); inp.focus();
  });
  document.addEventListener('keydown', e => {
    const zk = (e.ctrlKey || e.metaKey) && !e.altKey && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y'), typing = e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]');
    if (zk && !typing && S.view === 'board' && !document.querySelector('dialog[open]')) { // board: drawing history first
      const redo = e.key.toLowerCase() === 'y' || e.shiftKey;
      if (redo ? Ink.fut.length : Ink.hist.length) { e.preventDefault(); Ink.step(!redo); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && S.undo && !e.target.closest('input,textarea')) { e.preventDefault(); undoDelete(); return; }
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
    if (ownField(e.target)) return;
    e.preventDefault();
    const fs = [...e.dataTransfer.files];
    if (fs.length === 1 && /\.zip$/i.test(fs[0].name)) { importWhatsApp(fs[0]).catch(err => toast('Hata: ' + err.message)); return; }
    if (fs.length) { S.attach.push(...fs); renderAttach(); }
    else { const t = e.dataTransfer.getData('text'); if (t) { inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); } }
  });

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
    if ('readq' in b.dataset) { Pop.close(); Read.queue(); return; }
    if ('trash' in b.dataset) { Pop.close(); Trash.open(); return; }
    if ('tags' in b.dataset) { Pop.toggle(b); return; }
    if ('fold' in b.dataset) { Rail.fold(); return; }
    if ('paltab' in b.dataset) { Rail.pal(); return; }
    if ('vault' in b.dataset) { Pop.close(); Vault.open(); return; }
    if ('todo' in b.dataset) { Pop.close(); setView(S.view === 'todo' ? S.prevView || 'list' : 'todo'); scrollTo(0, 0); return; }
    const leaveTodo = () => { if (S.view === 'todo') { S.view = S.prevView || 'list'; S.cam = null; } };
    if (b.dataset.type) { f.type = b.dataset.type; f.star = false; f.list = null; if (b.dataset.type === 'all') f.tag = null; leaveTodo(); }
    else if ('star' in b.dataset) { f.star = !f.star; f.list = null; leaveTodo(); }
    else if (b.dataset.list) { f.list = f.list === b.dataset.list ? null : b.dataset.list; f.type = 'all'; f.star = false; leaveTodo(); }
    else if (b.dataset.tag) f.tag = f.tag === b.dataset.tag ? null : b.dataset.tag;
    else if ('alltags' in b.dataset) { S.allTags = !S.allTags; return render(); }
    else if (b.dataset.color) f.color = f.color === b.dataset.color ? null : b.dataset.color;
    else if (b.dataset.src) { f.src = f.src === b.dataset.src ? null : b.dataset.src; leaveTodo(); }
    else if (b.dataset.saved) return Saved.apply(b.dataset.saved);
    else if (b.dataset.unsave) return Saved.remove(b.dataset.unsave);
    else if ('sortprio' in b.dataset) { S.sortPrio = !S.sortPrio; try { localStorage.setItem('hn-sortprio', S.sortPrio ? '1' : ''); } catch { } }
    else return;
    S.limit = 300; S.listFrom = null; S.cam = null; Pop.close(); render(); scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const id of ['#viewSwitch', '#rail', '#railTab', '#popTypes', '#popLists', '#sideTags', '#sideProjects', '#sideMarks', '#popSaved', '#popSrc']) $(id).onclick = onFilter;
  Scrub.init();
  Rail.init();
  try { S.sortPrio = !!localStorage.getItem('hn-sortprio'); } catch { }
  Ctx.init(); Peek.init(); Read.init(); Remind.init();
  Todo.init();
  Pop.init();
  for (const id of ['#list', '#gallery', '#topics', '#empty']) $(id).addEventListener('click', e => {
    const a = e.target.closest('.act'); if (a) { e.stopPropagation(); return itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); }
    if (e.target.closest('[data-ljump]')) return monthJump(e.target.closest('[data-ljump]'));
    if (e.target.closest('[data-lpin]')) return Saved.save();
    const od = e.target.closest('[data-otd]'); if (od) return showFrom(dayEnd(od.dataset.otd));
    if (e.target.closest('[data-otdx]')) { try { localStorage.setItem('hn-otd-hide', dayKey(now())); } catch { } return render(true); }
    if (e.target.closest('[data-lnow]')) { S.listFrom = null; S.limit = 300; render(); return scrollTo(0, 0); }
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
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!Lock.conf || Crypt.key)) { reloadFromDB(); AI.health(); Sync.schedule(); Live.check(); } });
  // 82: going to the background / closing sends what is waiting now; 83: coming back to the window pulls (at most every 10 s)
  document.addEventListener('visibilitychange', () => { if (document.hidden) Cloud.flush(); });
  addEventListener('pagehide', () => Cloud.flush());
  addEventListener('focus', () => { if (!Cloud.on() || document.hidden || (Lock.conf && !Crypt.key)) return; if (now() - (Cloud._focusAt || 0) > 10e3) { Cloud._focusAt = now(); Cloud.schedule(); } Live.check(); });
  addEventListener('online', () => { Sync.schedule(); Live.check(); });
  Board.init(); Back.init(); Morph.init();
}
function setView(v) {
  if (v === 'todo' && S.view !== 'todo') S.prevView = S.view;
  const ch = v !== S.view;
  if (ch) { S.cam = null; hideHits(); } S.view = v; try { localStorage.setItem('hn-view', v); } catch { } // same view again: keep the camera (render would skip and leave it empty)
  if (ch && document.startViewTransition && !reduced()) { // 94a: the old view cross-fades into the new one, the floating chrome stays still
    const h = document.documentElement; h.classList.add('vt');
    try { document.startViewTransition(() => render()).finished.finally(() => h.classList.remove('vt')); return; } catch { h.classList.remove('vt'); }
  }
  render();
  if (ch) { const el = $('#' + (v === 'board' ? 'board' : v === 'gallery' ? 'gallery' : v === 'todo' ? 'todo' : 'list')); if (el) { el.classList.remove('vin'); void el.offsetWidth; el.classList.add('vin'); el.addEventListener('animationend', () => el.classList.remove('vin'), { once: true }); } } // 90: soft view change
}
async function reloadFromDB() {
  const items = await DB.all('items');
  if (items.length === S.items.length && items.every(i => S.idx.has(i.id))) return;
  S.items = items; S.idx.clear(); items.forEach(indexItem); runSearch(); render(); AI.kick(); Sync.schedule();
}

const Boot = {
  async rest(cutoff) {
    let after = null, n = 0;
    for (;;) {
      const batch = await DB.older(cutoff, after, 2000); if (!batch.length) break;
      const have = new Set(S.items.map(i => i.id)), add = batch.filter(i => !have.has(i.id)); // an edit made meanwhile wins
      if (add.length) { S.items = [...S.items, ...add]; Indexer.add(add); }
      n += batch.length; const last = batch.at(-1).ts; if (batch.length < 2000 || last === after) break; after = last;
      render(); await new Promise(r => setTimeout(r, 0));
    }
    S.loaded = true; render();
  },
};
(async function main() {
  setTheme(document.documentElement.dataset.theme);
  try { const a = localStorage.getItem('hn-accent'); if (a?.startsWith('#')) setAccent(a); } catch { }
  try { const v = localStorage.getItem('hn-view'); if (['list', 'board', 'gallery', 'todo'].includes(v)) S.view = v; else if (innerWidth < 900) S.view = 'list'; } catch { } // phone: first screen is the readable list
  await loadSettings();
  const hp = new URLSearchParams(location.hash.slice(1)); // one-tap setup: #bridge=<token>&url=<bridgeUrl>
  if (hp.get('bridge')) {
    S.settings.bridgeToken = hp.get('bridge'); if (hp.get('url')) S.settings.bridgeUrl = hp.get('url');
    await DB.put('kv', S.settings, 'settings'); history.replaceState(null, '', location.pathname);
    setTimeout(() => toast('' + aiName() + ' köprüsü ayarlandı', 2500, 'check'), 500);
  }
  await Cloud.load();
  if (await Lock.load()) await Lock.show();
  Lock.watch();
  // open fast with thousands of items: the last 60 days first, the rest right after in big batches (search index in a worker)
  const cutoff = now() - 60 * 864e5;
  S.items = await DB.since(cutoff); S.items.forEach(indexItem);
  wire(); render();
  await Boot.rest(cutoff);
  // back from Google: draw first, then trade the ?code for a session (never a blank screen while it waits)
  Cloud.finish().then(() => { if (Cloud.on()) { render(); Sync.run(); Live.start(); BridgeLink.publish(); } });
  BridgeLink.adopt();
  navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.view) setView(e.data.view); });
  { // home-screen shortcuts (long-press the icon): new note, to-dos, vault
    const q = new URLSearchParams(location.search), v = q.get('view'), d = q.get('do');
    if (v === 'todo') setView('todo');
    if (d === 'new') setTimeout(() => $('#input').focus(), 300);
    if (d === 'vault') setTimeout(() => Vault.open(), 300);
    if (v || d) history.replaceState(null, '', location.pathname);
  }
  if (new URLSearchParams(location.search).has('shared')) { toast('Kaydedildi', 2000, 'check'); history.replaceState(null, '', location.pathname); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  AI.health(); setInterval(() => { if (!document.hidden) AI.health(); }, 20000);
  setTimeout(() => LinkMeta.run(), 4000); setInterval(() => { if (!document.hidden) LinkMeta.run(); }, 5 * 60e3);
  Sync.run(); Live.start(); let tick = 0; setInterval(() => { if (!document.hidden && (Cloud.on() || ++tick % 4 === 0)) Sync.schedule(); }, 30000);
  AiPick.maybe(() => Tour.maybe()); setTimeout(weeklyUnseen, 6000); setTimeout(() => Trash.sweep(), 8000);
  if (S.items.some(i => fileKind(i) === 'pdf')) (window.requestIdleCallback || setTimeout)(() => Prev.pdfLib());
})();
