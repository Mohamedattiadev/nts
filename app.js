'use strict';
/* Nts — app. Depends on db.js (DB, newId, itemsFromInput, saveItems, URL_RE) and vendor/jszip. */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// same folding as query.js (104d): Turkish İ/ı, accents, Arabic harakat/tatweel, أإآ→ا, ة→ه, ى→ي, Arabic/Persian digits
const norm = s => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ٱ/g, 'ا').replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x660).replace(/[\u06f0-\u06f9]/g, d => d.charCodeAt(0) - 0x6f0);
const now = () => Date.now();
// 104g: the window width read on every key (send button, result window) forces a layout on phones: kept from resize events
let _vw = innerWidth; addEventListener('resize', () => { _vw = innerWidth; });
const narrow = () => _vw < 700;

const S = {
  items: [], idx: new Map(), view: 'board', q: '', hits: null, searchOn: false, // 147: false from the start (undefined → false on the first key redrew the whole list)
  filter: { type: 'all', tag: null, star: false, list: null, color: null, src: null }, sortPrio: false, tool: 'select', ink: 'ink', attach: [], hitSel: -1,
  settings: {}, bridgeOk: false, aiBusy: false, limit: 300,
  cam: null, linkFrom: null, urls: new Map(), explaining: new Set(),
};

// ---------- icons (lucide-style line icons) ----------
const I = {
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
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
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>', // 106d
  chev: '<path d="m9 18 6-6-6-6"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', // 99b
  rel: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5 15.5 15.5"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>', // 145
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>', // 145
  play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>',
  mappin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  kbd: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M8 16h8"/>', // 141
  install: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  // 158c: the editor's block / strip marks (were font glyphs ☐ • ❝ ⊞ ▣ — ↶ ↷)
  ul: '<path d="M10 6h10M10 12h10M10 18h10"/><circle cx="5" cy="6" r="1.2" fill="currentColor"/><circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="5" cy="18" r="1.2" fill="currentColor"/>',
  quote: '<path d="M10 7H6a2 2 0 0 0-2 2v3h5v5H4v-5M20 7h-4a2 2 0 0 0-2 2v3h5v5h-5v-5"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  hr: '<path d="M4 12h16"/><path d="M8 6h8M8 18h8" opacity=".45"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
};
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || I.file}</svg>`;

// ---------- utils ----------
function toast(msg, ms = 2600, icon = '', action = null) {
  const t = $('#toast'); t.innerHTML = (icon === 'mark' ? `<span class="mark t-mark">${$('header .mark svg, .mark svg')?.outerHTML || ''}</span>` : icon ? ic(icon, 'sm') : '') + `<span>${esc(msg)}</span>` + [].concat(action || []).map((a, k) => `<button class="t-act" data-k="${k}">${esc(a.label)}</button>`).join(''); t.hidden = false;
  if (t.showPopover) try { if (t.matches(':popover-open')) t.hidePopover(); t.showPopover(); } catch { } // top layer: above an open window (reading page, item window), so "Geri al" is seen
  t.querySelectorAll('.t-act').forEach(b => { b.onclick = () => { t.hidden = true; [].concat(action)[+b.dataset.k].fn(); }; }); // 107e: a reminder has two (1 saat ertele · Yarın)
  t.style.animation = 'none'; t.offsetHeight; t.style.animation = '';
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, ms);
}
const kTok = n => n >= 1e6 ? (n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' milyon' : n >= 1000 ? Math.round(n / 1000).toLocaleString('tr-TR') + ' bin' : String(Math.round(n)); // 148
const domain = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
// 147b: asked for every item on many redraws (10k items: ~60 ms a view change on a phone) → remembered per timestamp
const _dk = new Map(), dayKey = ts => { let k = _dk.get(ts); if (k) return k; const d = new Date(ts); k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; if (_dk.size > 60000) _dk.clear(); _dk.set(ts, k); return k; };
// Intl formatters are slow to build: make them once, and remember day labels (thousands of rows ask for the same few days)
const F_TIME = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }), F_SD = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }), F_SDY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: '2-digit' });
const memoDay = fn => { const m = new Map(); let today = ''; return key => { const t = dayKey(now()); if (t !== today) { m.clear(); today = t; } let v = m.get(key); if (v === undefined) { v = fn(key); m.set(key, v); } return v; }; };
const shortDay = memoDay(key => { const t = fmtDay(key); if (t === 'Bugün' || t === 'Dün') return t; const [y, m, d] = key.split('-').map(Number); return (y !== new Date().getFullYear() ? F_SDY : F_SD).format(new Date(y, m - 1, d)); });
const fmtTime = ts => F_TIME.format(ts);
const fmtDay = memoDay(fmtDay0);
const F_WD = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }); // 155
const F_DLW = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }), F_DMY = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); // 147c
const fmtDay0d = key => { const [y, m, d] = key.split('-').map(Number); return F_DLW.format(new Date(y, m - 1, d)); }; // 92: the date behind "Bugün" / "Dün"
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
  if (i.voice || m.startsWith('audio')) return 'audio'; // 95a: a voice note in .webm is sound, not a video
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
  if (i.type === 'note' && i.text && !i.userTitle) return (i.sticky ? stPlain(i.text) : Ed.plain(i.text.split('\n').find(l => l.trim() && !/^```|^\|?\s*:?-{2,}|^(-{3,}|\*{3,})$/.test(l.trim())) || i.text.split('\n')[0])).slice(0, 140); // the user's own words come first
  if (i.title && !(i.type === 'file' && !i.userTitle && i.title === i.fileName)) return i.title;
  if (i.voice) return `Sesli not · ${Math.floor(i.voice / 60)}:${String(i.voice % 60).padStart(2, '0')}`; // 95a
  if (i.type === 'file') { const a = autoTitle(i); if (a) return a; }
  if (i.type === 'link') { if (i.meta?.title) return i.meta.title; try { const u = new URL(i.url); return domain(i.url) + decodeURI(u.pathname).replace(/\/$/, ''); } catch { return i.url; } }
  if (i.type === 'file') return i.fileName;
  return (i.text || '').split('\n')[0].slice(0, 140);
}
// 135: a camera/WhatsApp/screenshot name says nothing ("IMG-20251216-WA0014.jpg") -> the first real line of the text read from the
// picture (or the start of the AI's short description) becomes the title; the file name moves to the line under it. Derived, never
// stored, so the user's own title (userTitle) always wins and a later OCR simply improves it.
const NOISE_HEAD = /^(img|vid|pxl|dsc|mvimg|photo|screenshot|screen ?shot|scr|ekran görüntüsü|whatsapp (image|video)|signal-|telegram|snapchat|capture)[\s_\-.0-9]/i;
const NOISE_NAME = /(?<!\p{L})(img|image|imag|photo|foto|fotoğraf|pic|picture|pxl|dsc[fn]?|dcim|mvimg|wa|whatsapp|signal|telegram|screenshot|screen|shot|scr|ekran|görüntüsü|resim|capture|snap|snapshot|scan|scanned|tarama|camera|cam|file|dosya|document|download|untitled|adsız|at|from|copy|kopya|edited|burst|cover|portrait|pano|vid|video)(?!\p{L})/giu;
function noiseName(n) {
  if (!n) return true;
  if (NOISE_HEAD.test(n)) return true; // a camera / screenshot name, whatever app name follows ("Screenshot_…_Chrome")
  const b = n.replace(/\.[\w]{1,5}$/, '').replace(/[_\-.()[\]]+/g, ' ').replace(NOISE_NAME, ' ').replace(/[0-9a-f]{8,}/gi, ' ');
  return !(b.match(/\p{L}{3,}/gu) || []).some(w => !/^(am|pm|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i.test(w));
}
function ocrLine(t) {
  for (let l of (t || '').split(/\n+/).slice(0, 25)) {
    l = l.replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[\s\-–—|:•·.,]+$/gu, '').trim();
    const letters = (l.match(/\p{L}/gu) || []).length;
    if (letters < 4 || letters / l.length < .55 || !/\p{L}{3,}/u.test(l)) continue; // status bar ("10:42 4G 85%"), page numbers, stray marks
    if (/^(https?:|www\.)/i.test(l) || /^(lte|volte|wi-?fi|\d+g)\b/i.test(l)) continue;
    return l.length > 70 ? l.slice(0, 68).replace(/\s+\S*$/, '') + '…' : l;
  }
  return '';
}
const _at = new WeakMap();
function autoTitle(i) {
  if (i.userTitle || (i.title && i.title !== i.fileName)) return '';
  const k = fileKind(i); if (k !== 'image' && k !== 'pdf') return '';
  if (_at.has(i)) return _at.get(i);
  let a = '';
  if (noiseName(i.fileName)) a = ocrLine(i.ocr) || (i.summary ? ocrLine(i.summary.split(/(?<=[.!?])\s/)[0]) : '');
  _at.set(i, a); return a;
}
function subOf(i) {
  if (i.conv) return i.summary || `${i.conv.who.join(', ')} · ${i.conv.log.find(l => l.text)?.text || ''}`;
  if (i.type === 'link') return mdPlain(i.text || '') || i.summary || i.meta?.description || '';
  if (i.type === 'file') { if (autoTitle(i)) return [i.fileName, i.text].filter(Boolean).join(' · '); return mdPlain(i.text || '') || i.summary || ''; }
  const t = i.text || '';
  if (i.userTitle) return mdPlain(t);
  return t.includes('\n') ? mdPlain(t.slice(t.indexOf('\n') + 1)) : '';
}
const mdPlain = t => !/[*=`#>|!\[]|^\s*[-+\d]/m.test(t) ? t : t.split('\n').filter(l => !/^```|^\|?\s*:?-{2,}[-|: ]*$|^(-{3,}|\*{3,})$/.test(l.trim())).filter(l => !Ed.IMG.test(l.trim())).map(Ed.plain).join('\n'); // 106b (106c: picture lines never show as "![](nts:…)"): no Markdown marks in one-line previews
const HIDDEN = new Set(['draw', 'vault', 'bridge', 'ghlink', 'boards', 'summaries', 'saved']); // drawings live only on the board; the vault is its own place; 'bridge' is the phone's Claude address
const hid = i => HIDDEN.has(i.type) || !!i.priv && !S.privOn; // 107l: hidden records (priv.js) stay out of every list until 'Gizli kayıtlar' is opened
const alive = () => S.items.filter(i => !i.deleted && !hid(i));
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
  i.fileName, i.content, i.ocr, i.summary, (i.tags || []).join(' '), (i.vtags || []).join(' '), i.hues && window.NtsQuery?.hueWords(i), i.todo?.text, i.project, i.chat, (i.highlights || []).map(h => h.text).join(' '), readText(i)].filter(Boolean).join(' ');
// 104c: the readable copy of a link (bridge /article) is searched like the item's own text
const readText = i => i.read?.blocks?.length ? i.read.blocks.map(b => b.x || '').join(' ').slice(0, 20000) : '';
const idxEntry = h => ({ h, w: [...new Set(h.split(/[^\p{L}\p{N}]+/u).filter(Boolean))] });
function indexItem(i) {
  if (HIDDEN.has(i.type) && i.type !== 'draw') return; // never searchable
  S.idx.set(i.id, { ...idxEntry(norm(rawText(i))), t: norm(titleOf(i)) }); // t: the folded title, for the order of results (104g)
}
// the search index for big batches is built in a Web Worker, so the page never freezes; search indexes on demand meanwhile
const Indexer = {
  w: null,
  worker() {
    if (this.w !== null) return this.w;
    try {
      const src = `const norm = ${norm.toString()}; onmessage = e => postMessage(e.data.map(([id, t, ti]) => { const h = norm(t); return [id, h, [...new Set(h.split(/[^\\p{L}\\p{N}]+/u).filter(Boolean))], norm(ti)]; }));`;
      this.w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      this.w.onmessage = e => { for (const [id, h, w, t] of e.data) if (!S.idx.has(id)) S.idx.set(id, { h, w, t }); };
    } catch { this.w = false; }
    return this.w;
  },
  add(items) { const w = this.worker(), list = items.filter(i => i.type !== 'vault' && i.type !== 'bridge'); if (!w) return list.forEach(indexItem); w.postMessage(list.map(i => [i.id, rawText(i), titleOf(i)])); },
};
// 147: a picture's small preview (≤320 px webp) is made in a Worker: decoding a 12 MP photo and drawing it on the page cost 50–200 ms a picture
// (a long task while scrolling the gallery or typing). null → the caller makes it on the page as before
const ThumbW = {
  w: null, n: 0, cb: new Map(),
  make(blob) {
    if (this.w === null) try {
      const src = `onmessage = async e => { const { id, blob } = e.data; try { const b = await createImageBitmap(blob), r = Math.min(1, 320 / Math.max(b.width, b.height)), c = new OffscreenCanvas(Math.max(1, Math.round(b.width * r)), Math.max(1, Math.round(b.height * r)));
        c.getContext('2d').drawImage(b, 0, 0, c.width, c.height); b.close(); postMessage({ id, blob: await c.convertToBlob({ type: 'image/webp', quality: .72 }) }); } catch { postMessage({ id, blob: null }); } };`;
      this.w = typeof OffscreenCanvas === 'undefined' ? false : new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      if (this.w) this.w.onmessage = e => { const f = this.cb.get(e.data.id); this.cb.delete(e.data.id); f?.(e.data.blob); };
    } catch { this.w = false; }
    if (!this.w) return Promise.resolve(null);
    const id = ++this.n; return new Promise(r => { this.cb.set(id, r); this.w.postMessage({ id, blob }); setTimeout(() => { if (this.cb.delete(id)) r(null); }, 20000); });
  },
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
    else if (t.length >= 4 && x.w.some(w => (w[0] === t[0] || w[0] === t[1]) && typoHit(w, t))) s = 1; // "faturra" → faturası
    if (s) { hit++; score += s; } else if (!any) return 0;
  }
  return hit ? score + (i.starred ? .5 : 0) : 0;
}
// the same words repeat in thousands of items: each (word, typed word) pair is checked once per search
let _typo = new Map();
function typoHit(w, t) {
  const k = t + '\u0001' + w; let r = _typo.get(k);
  if (r === undefined) { r = typo(w, t) || [0, -1, 1].some(d => w.length > t.length + d && typo(w.slice(0, t.length + d), t)); if (_typo.size > 2e5) _typo = new Map(); _typo.set(k, r); }
  return r;
}
const typo = (a, b) => window.NtsQuery ? NtsQuery.near(a, b) : near(a, b); // 104b: one wrong/missing/extra/swapped letter, two in long words
const tokens = q => norm(q).split(/\s+/).filter(t => t.length > 1 || /\d/.test(t));
// 104d: a query with syntax (fields, "phrase", /regex/, OR, -word, poul*, tarih:, is:, sırala: …) goes through query.js
const qHay = i => { let x = S.idx.get(i.id); if (!x) { indexItem(i); x = S.idx.get(i.id); } return x ? x.h : ''; };
const qSrc = (i, s) => s === 'whatsapp' ? i.source === 'whatsapp' : s === 'share' ? i.source === 'share' : srcMatch(i, s);
let qWarnT;
function runSearch() {
  const q = S.q.trim(); S.qx = null; S.nl = null; S.semIds = null; S.loose = null; S.dym = null; clearTimeout(qWarnT);
  if (!q || S.mode === 'ask' || (S.mode !== 'find' && (q.startsWith('?') || q.endsWith('?')))) { S.hits = null; if (!q) ImgFind.drop(); return; } // a question goes to the AI, it doesn't filter (in Ara mode it does)
  // 105b: in Ara the "?" closing a question is not a wildcard ("kaç sensör var?" searched "var" + one more letter and found nothing)
  if (window.NtsQuery && /[?؟]$/.test(q) && NtsQuery.intent(q) === 'ask') return runSearch0(q.replace(/\s*[?؟]+$/, ''));
  if (S.imgFind && !ImgFind.on()) ImgFind.drop(); // 105f: the words were changed → a normal search again
  if (S.imgFind) { if (S.imgFind.ocr) runSearch0(q); else S.hits = new Map(); ImgFind.merge(); return; }
  runSearch0(q);
}
function runSearch0(q) {
  if (window.NtsQuery && !NtsQuery.isPlain(q)) {
    const x = S.qx = NtsQuery.compile(q, { hay: qHay, raw: rawText, title: titleOf, kind: fileKind, site: i => i.meta?.site || domain(i.url || ''), src: qSrc });
    const toks = tokens(x.terms.join(' ')); S.hits = new Map();
    for (const i of S.items) {
      if (i.deleted || hid(i) || !x.test(i)) continue;
      S.hits.set(i.id, x.sort === 'old' ? -i.ts : x.sort === 'new' ? i.ts : (toks.length && scoreItem(i, toks, true)) || 1 + (i.starred ? .5 : 0));
    }
    // a broken piece never breaks the search: it's searched as text and the warning shows once the typing stops
    if (x.warnings.length) qWarnT = setTimeout(() => { if (S.qx === x) toast(x.warnings[0], 2600); }, 1200);
    return;
  }
  // 104a: in Ara mode a plain sentence gives filter chips: "geçen hafta pdf fatura" → [Geçen hafta] [PDF] + "fatura"
  const nl = findMode() && window.NtsQuery ? NtsQuery.natural(q, { chats: chatNames() }) : null;
  if (nl && (nl.chips.length || nl.rest !== q)) { // 105a: chips, or only filler words dropped ("bana faturaları göster" → "faturaları")
    S.nl = nl; const f = nl.filter ? NtsQuery.compile(nl.filter, { hay: qHay, raw: rawText, title: titleOf, kind: fileKind, site: i => i.meta?.site || domain(i.url || ''), src: qSrc }) : null;
    const toks = tokens(nl.rest); S.hits = new Map();
    for (const i of S.items) {
      if (i.deleted || hid(i) || (f && !f.test(i))) continue;
      const s = toks.length ? scoreItem(i, toks) : 1 + (i.starred ? .5 : 0); if (s) S.hits.set(i.id, s);
    }
    if (!S.hits.size) loose(toks, f, nl.chips);
    semMerge(nl.rest.trim(), f);
    return;
  }
  const toks = tokens(q); S.hits = new Map();
  for (const i of S.items) { if (i.deleted) continue; const s = scoreItem(i, toks); if (s) S.hits.set(i.id, s); }
  if (findMode()) { if (!S.hits.size) loose(toks); semMerge(q); }
}
// 105c: never an empty result. No item has every word → the ones with the most of them ("en yakınlar"); a sentence's chips found
// nothing → the words without the chips; and a word nobody wrote → "Bunu mu demek istedin: fatura" from the words that are in the notes
function loose(toks, f, chips = []) {
  const fill = g => { for (const i of S.items) { if (i.deleted || hid(i) || (g && !g.test(i))) continue; const s = toks.length ? scoreItem(i, toks, true) : 1; if (s) S.hits.set(i.id, s / 10); } };
  if (toks.length > 1) { fill(f); if (S.hits.size) S.loose = 'any'; }
  // only chips ("geçen ay annem resim") and nothing has all of them → without one of them (the kind goes first, the person last)
  if (!S.hits.size && chips.length > 1) {
    const order = ['kind', 'src', 'date', 'chat'];
    for (const c of [...chips].sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k))) {
      const g = NtsQuery.compile(NtsQuery.chipFilter(chips.filter(x => x !== c)), { hay: qHay, raw: rawText, title: titleOf, kind: fileKind, site: i => i.meta?.site || domain(i.url || ''), src: qSrc });
      fill(g); if (S.hits.size) { S.loose = 'drop'; S.looseLabel = c.label; break; }
    }
  }
  if (!S.hits.size && f && toks.length) { fill(null); if (S.hits.size) S.loose = 'nofilter'; }
  if (!S.hits.size || S.loose === 'any') S.dym = didYouMean(toks);
}
let _voc, _vocOf, _dymC = new Map(); // a typed word's correction is found once per item list (it runs on every key while nothing matches)
function didYouMean(toks) { // the closest word that is really in the notes (2 letters off; 3 in long words), the most used one wins
  if (_vocOf !== S.items) { _voc = new Map(); _vocOf = S.items; _dymC = new Map(); for (const i of S.items) { if (i.deleted) continue; const x = S.idx.get(i.id); if (x) for (const w of x.w) if (w.length > 2 && w.length < 24) _voc.set(w, (_voc.get(w) || 0) + 1); } }
  let fixed = false;
  const out = toks.map(t => {
    if (t.length < 3 || _voc.has(t) || /\d/.test(t)) return t;
    if (_dymC.has(t)) { const c = _dymC.get(t); if (c !== t) fixed = true; return c; }
    const max = t.length >= 8 ? 3 : 2; let best = null, bd = 9, bn = 0;
    for (const [w, n] of _voc) { if (Math.abs(w.length - t.length) > max) continue; const d = editDist(w, t, max); if (d <= max && (d < bd || (d === bd && n > bn))) { best = w; bd = d; bn = n; } }
    _dymC.set(t, best || t); if (best) { fixed = true; return best; } return t;
  });
  return fixed ? out.join(' ') : null;
}
function editDist(a, b, max) { // Damerau-Levenshtein, stops once every cell of a row is over max
  let p2 = null, p = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let x = 1; x <= a.length; x++) {
    const c = [x]; let low = x;
    for (let y = 1; y <= b.length; y++) {
      let v = Math.min(p[y] + 1, c[y - 1] + 1, p[y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
      if (p2 && x > 1 && y > 1 && a[x - 1] === b[y - 2] && a[x - 2] === b[y - 1]) v = Math.min(v, p2[y - 2] + 1);
      c.push(v); if (v < low) low = v;
    }
    if (low > max) return max + 1; p2 = p; p = c;
  }
  return p[b.length];
}
// 104f: what the meaning search (Sem) and "Yapay zekâ ile ara" found that the words didn't: added under the word results
// (score < 1, word hits are >= 1), marked ✦; a sentence's chips (dates, kinds …) still filter them
// sem.js gives z scores (how far above this query's crowd). Measured with the real model (14 tr/en/ar items): right answers 1.9–3.2
// (fatura→fatura 2.5, فاتورة→Arabic bill 2.3, bill payment→invoice 1.9), nonsense "xqzv" tops at 1.8 → the best must reach 1.9,
// the next ones 1.5, at most 12 (a big archive has many items above any line)
const SEM_TOP = 1.9, SEM_NEXT = 1.5, SEM_MAX = 12;
function semMerge(q, f) {
  Sem.ask(q);
  const add = (id, s) => { if (S.hits.has(id)) return; const i = byId(id); if (!i || i.deleted || hid(i) || (f && !f.test(i))) return; S.hits.set(id, s); (S.semIds ||= new Set()).add(id); };
  const h = Sem.hits;
  if (h && h.q === q && (h.list[0]?.[1] || 0) >= SEM_TOP) { let k = 0; for (const [id, z] of h.list) { if (z < SEM_NEXT || k++ >= SEM_MAX) break; add(id, .5 + z / 10); } }
  if (S.aiFind?.ids && S.aiFind.q === S.q) S.aiFind.ids.forEach((id, k) => add(id, .85 - k * .001));
  for (const [id, b] of Learn.boost(S.q)) if (b >= 2 && !S.hits.has(id)) { const i = byId(id); if (i && !i.deleted && !hid(i) && (!f || f.test(i))) S.hits.set(id, .9); } // 105g
}
let _chats, _chatsOf;
const chatNames = () => { if (_chatsOf !== S.items) { _chats = [...new Set(S.items.filter(i => i.chat && !i.deleted).map(i => i.chat))]; _chatsOf = S.items; } return _chats; };
// 104a: × on a chip takes exactly its words out of the box
function dropChip(k) {
  const c = S.nl?.chips[k], inp = $('#input'); if (!c) return;
  const q = S.q.trim(), v = (q.slice(0, c.a) + q.slice(c.b)).replace(/\s{2,}/g, ' ').trim();
  inp.value = v; S.q = v; S.searchOn = !!v; runSearch(); autoGrow(); render();
}
const nlIc = c => c.k === 'date' ? 'clock' : c.k === 'kind' ? (c.v === 'image' ? 'image' : c.v === 'note' ? 'note' : c.v) : c.k === 'chat' || c.v === 'whatsapp' ? 'chat' : c.v === 'pc' ? 'cpu' : 'inbox';
const nlChips = () => (S.nl?.chips || []).map((c, k) => `<button class="f-nl" data-nlx="${k}" title="Süzgeci kaldır" aria-label="${esc(c.label)} süzgecini kaldır">${ic(nlIc(c), 'sm')}<span dir="auto">${esc(c.label)}</span>${ic('x', 'sm')}</button>`).join('');
const CH = { i: '[iıİI]', s: '[sşŞ]', g: '[gğĞ]', u: '[uüÜ]', o: '[oöÖ]', c: '[cçÇ]' };
function hl(text) {
  const out = esc(text);
  if (!S.hits || !S.q.trim()) return out;
  const re = hlRe(); if (!re) return out;
  return out.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, txt) => tag || txt.replace(re, '<mark>$1</mark>'));
}
// 104c: where the words were found: when the title / first lines don't show it, a short piece around the first match
// (picture text, PDF or file text, readable copy, conversation, summary) with a small label of where it came from
function snip(i, n, lead = 48) {
  const sub = subOf(i), re = S.hits && S.q.trim() ? hlRe() : null;
  if (!re) return { sub: sub.slice(0, n) };
  const at = t => { re.lastIndex = 0; return re.exec(t); };
  if (at(titleOf(i) + ' \n ' + sub.slice(0, n))) return { sub: sub.slice(0, n) };
  const src = [['', i.text], ['Resimdeki yazı', i.ocr], [fileKind(i) === 'pdf' ? 'PDF' : 'Dosyanın içi', i.content], ['Okunur kopya', readText(i)],
    ['Özet', i.summary], ['', i.meta?.description], ['Altı çizili', (i.highlights || []).map(h => h.text).join(' … ')]];
  for (const [label, t] of src) {
    if (!t) continue; const m = at(t); if (!m) continue;
    let a = Math.max(0, m.index - lead); if (a) { const sp = t.indexOf(' ', a); if (sp > 0 && sp < m.index) a = sp + 1; }
    const b = Math.min(t.length, m.index + n - lead);
    return { sub: (a ? '…' : '') + t.slice(a, b).replace(/\s+/g, ' ') + (b < t.length ? '…' : ''), label };
  }
  return { sub: sub.slice(0, n) };
}
const snipHtml = (i, n, lead) => { const x = snip(i, n, lead); return x.sub ? (x.label ? `<span class="snip-src">${x.label}</span>` : '') + hl(x.sub) : ''; };
function hlRe() {
  const toks = tokens(S.qx ? S.qx.terms.join(' ') : S.nl ? S.nl.rest : S.q).filter(t => t.length > 1);
  if (!toks.length) return null;
  return new RegExp('(' + toks.map(t => [...t].map(c => CH[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')).join('|') + ')', 'gi');
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
// 150c: a board name matches whatever its case or spaces ("Finential" = "finential " = "finential")
const bfold = n => String(n || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr');
let _bf = ['', '']; const curFold = () => _bf[0] === S.board ? _bf[1] : (_bf = [S.board, bfold(S.board)])[1];
const inBoard = (i, n) => { const b = n === undefined ? curFold() : bfold(n); return !!i.project && bfold(i.project) === b || (i.boards || []).some(x => bfold(x) === b); };
const onBoard = i => onMain() ? true : inBoard(i) || !!posOf(i);
const boardNames = () => { const b = byId('boards'), own = b && !b.deleted ? b.names || [] : [], seen = new Map();
  for (const n of [...S.items.filter(i => i.project && !i.deleted).map(i => i.project), ...own]) { const k = bfold(n); if (k && !seen.has(k)) seen.set(k, n); }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'tr')); };
// board time range: '30' (main default) | '90' | '180' | '365' | 'y2024' … | 'all' (project default); 'week' / 'month' still read.
// 153: each board keeps its own (hn-range-<board>) and the main board can also show the imported archive (hn-arch-main)
const RANGES = () => { const ys = [...new Set(S.items.filter(i => !i.deleted).map(i => new Date(i.ts).getFullYear()))].sort((a, b) => b - a);
  return [['30', 'Son 30 gün'], ['90', 'Son 3 ay'], ['180', 'Son 6 ay'], ['365', 'Son 1 yıl'], ['all', 'Tümü'], ...ys.map(y => ['y' + y, String(y)])]; };
const RSHORT = { '30': '30 gün', '90': '3 ay', '180': '6 ay', '365': '1 yıl', all: 'Tümü', week: 'Bu hafta', month: 'Bu ay' };
const Range = {
  c: {},
  key: () => onMain() ? 'main' : S.board,
  ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { } return null; },
  get() { const k = this.key(); return this.c[k] ??= this.ls('hn-range-' + k) || (k === 'main' ? this.ls('hn-range') || '30' : 'all'); },
  arch() { const k = 'a|' + this.key(); return this.c[k] ??= this.ls('hn-arch-' + this.key()) === '1'; },
  def() { return onMain() ? '30' : 'all'; },
  set(v) { const k = this.key(); this.c[k] = v; this.ls('hn-range-' + k, v); this.changed(); },
  setArch(on) { const k = this.key(); this.c['a|' + k] = on; this.ls('hn-arch-' + k, on ? '1' : '0'); this.changed(); },
  changed() { S.cam = null; render(); if (S.view === 'board' && !reduced()) $('#plane')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' }); }, // the camera fits the new set (Hepsini gör), the cards fade in
};
function rangeStart(r = Range.get()) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (r === 'week') { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d.getTime(), Infinity]; }
  if (r === 'month') { d.setDate(1); return [d.getTime(), Infinity]; }
  if (/^\d+$/.test(r)) return [now() - +r * 864e5, Infinity];
  if (r[0] === 'y') { const y = +r.slice(1); return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()]; }
  return [-Infinity, Infinity];
}
let _rs; const inRange = ts => { const r = Range.get(); if (r === 'all') return true; if (_rs?.[0] !== r) _rs = [r, ...rangeStart(r)]; return ts >= _rs[1] && ts < _rs[2]; };
const rangeLabel = () => (RANGES().find(r => r[0] === Range.get()) || [0, RSHORT[Range.get()] || 'Son 30 gün'])[1];
const rangeShort = () => RSHORT[Range.get()] || rangeLabel();
let _vis = {};
function visible(keepAll = false) { // same list, same filter → same answer (render runs often)
  const f = S.filter, key = [S.items, JSON.stringify(f), S.sortPrio, keepAll || S.searchOn, keepAll || S.hits, S.view, S.view === 'board' ? Range.get() + Range.arch() : '', S.board, S.folder, S.folder?.startsWith('ai:') ? AIF.ver : '', S.privOn].map(String).join('|') + (keepAll ? 'k' : '');
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
    && (!inFolder() || Folders.test(i, S.folder))
    && !hid(i)
    && (keepAll || !S.searchOn || !S.hits || S.hits.has(i.id))
    // photos inside a conversation: in the gallery and in search results, not as their own rows/cards
    && (!i.parent || ((S.view === 'gallery' || (S.searchOn && S.hits?.has(i.id))) && !byId(i.parent)?.deleted))
    // imported archives (WhatsApp, bookmarks) don't fill the board; a card you put there or moved stays
    && (S.view !== 'board' || onBoard(i))
    && (S.view !== 'board' || !onMain() || !i.archive || i.pos || i.onBoard || Range.arch())
    // a board is a workspace: its time range (153: every board has its own; a project board starts with Tümü), plus whatever you put or moved there
    && (S.view !== 'board' || posOf(i) || i.onBoard || i.sticky || inRange(i.ts))
  ).sort((a, b) => (S.sortPrio ? prioRank(a) - prioRank(b) : 0) || (S.searchOn && S.qx?.sort === 'old' ? a.ts - b.ts : b.ts - a.ts));
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
// 94e: zip library only when a zip/docx/backup is touched (not at start); pdf.js / KaTeX load the same way
function needZip() {
  return window.JSZip ? Promise.resolve(window.JSZip) : (needZip.p ||= new Promise((ok, bad) => {
    const s = document.createElement('script'); s.src = 'vendor/jszip.min.js';
    s.onload = () => ok(window.JSZip); s.onerror = () => { needZip.p = null; bad(new Error('zip yüklenemedi')); }; document.head.appendChild(s);
  }));
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
    const nc = noteCover(i); if (nc) return nc.id ? this.thumb(byId(nc.id)) : nc.url; // 106c
    if (this.thumbs.has(i.id)) return this.thumbs.get(i.id);
    if (i.type === 'link') { const y = ytId(i), u = i.meta?.image || (y ? `https://i.ytimg.com/vi/${y}/mqdefault.jpg` : null); this.thumbs.set(i.id, u); return u; }
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
      else { const rec = await DB.get('files', i.id), u = !rec && await blobFor(i); if (!rec && !u) return null; const src = rec ? rec.blob : await (await fetch(u)).blob(), tb = await ThumbW.make(src); // 147: decode + shrink + webp off the main thread
        if (tb) { await DB.put('files', { id: i.id + ':t', blob: tb }); Hues.from(i, tb); PH.from(i, tb); return tb; }
        const bmp = await createImageBitmap(src), r = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
        c = new OffscreenCanvas(Math.round(bmp.width * r), Math.round(bmp.height * r)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); }
      if (!c) return null;
      const blob = c.convertToBlob ? await c.convertToBlob({ type: 'image/webp', quality: .72 }) : await new Promise(r => c.toBlob(r, 'image/webp', .72));
      await DB.put('files', { id: i.id + ':t', blob }); Hues.from(i, blob); PH.from(i, blob); return blob;
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
const _yt = new WeakMap(), ytId = i => { if (i.type !== 'link') return null; let y = _yt.get(i); if (y === undefined || y[0] !== i.url) _yt.set(i, y = [i.url, ytId0(i)]); return y[1]; }; // 104g: once per link, not per row draw
const ytId0 = i => { try { const u = new URL(i.url), h = u.hostname.replace(/^www\.|^m\./, '');
  const id = h === 'youtu.be' ? u.pathname.slice(1) : h === 'youtube.com' ? (u.searchParams.get('v') || (u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/) || [])[2]) : null;
  return /^[\w-]{6,20}$/.test(id || '') ? id : null; } catch { return null; } };
// 106c: a note's first picture is its cover (board card, list, gallery) — only a picture the note really holds (nts:<id> file or https)
const NCOV = new WeakMap();
function noteCover(i) {
  if (i.type !== 'note' || i.sticky || !i.text || !i.text.includes('![')) return null;
  if (NCOV.has(i)) return NCOV.get(i);
  let r = null; const m = i.text.match(/^!\[[^\]]*\]\(((?:https?:|nts:)[^)\s]+)\)\s*$/m);
  if (m) { const s = m[1]; if (s.startsWith('nts:')) { const f = byId(s.slice(4)); if (f && !f.deleted && fileKind(f) === 'image') r = { id: f.id, src: s }; } else r = { url: s, src: s }; }
  NCOV.set(i, r); return r;
}
const hasVisual = i => ['image', 'pdf', 'video'].includes(fileKind(i)) || (i.type === 'link' && (i.meta?.image || ytId(i))) || !!(i.cover && byId(i.cover)) || !!noteCover(i);
// 102: image shapes (id → w/h) so the item window keeps the image's room from the first frame; growTo animates a box to its new height
const AR = new Map();
// 99a: the gallery keeps each picture's shape (justified rows): thumbnail shapes are remembered on this device so a tile is the
// right size from the first frame (no rows jumping when the pictures arrive). id → w/h, kept small (2 decimals, last 20k).
const GAR = { m: null, T: 0,
  map() { if (!this.m) { try { this.m = new Map(Object.entries(JSON.parse(localStorage.getItem('hn-gar') || '{}'))); } catch { this.m = new Map(); } } return this.m; },
  get(id) { return this.map().get(id) || AR.get(id); },
  fit: r => Math.min(2.2, Math.max(.62, r || 4 / 3)),
  set(id, r) { r = Math.round(r * 100) / 100; const m = this.map(); if (!r || m.get(id) === r) return false; m.delete(id); m.set(id, r);
    clearTimeout(this.T); this.T = setTimeout(() => { try { const e = [...m]; localStorage.setItem('hn-gar', JSON.stringify(Object.fromEntries(e.slice(-20000)))); } catch { } }, 800); return true; },
};
function growTo(box, change) {
  const h0 = box.offsetHeight; change(); const h1 = box.offsetHeight;
  if (Math.abs(h1 - h0) > 4 && !reduced()) box.animate([{ height: h0 + 'px', overflow: 'hidden' }, { height: h1 + 'px', overflow: 'hidden' }], { duration: 200, easing: 'cubic-bezier(.2, .8, .2, 1)' });
}
// 102: FLIP - before a view is rebuilt, note where each card on screen was; after, cards that moved slide from the old place
// (transform only, 200 ms), new ones fade in where they belong. Off for reduced motion, view changes and big lists.
const Flip = {
  SEL: '[data-id],[data-tid]',
  key: el => el.dataset.id || el.dataset.tid,
  // 104g: list rows sit in content-visibility:auto groups; measuring a row of an off-screen group lays that group out
  // (10k items: 0.2–1.5 s per key in Ara). A group's own box is cheap, so its rows are measured only when it is near the screen.
  els(root, pad) {
    const near = new Map(), vh = innerHeight;
    return [...root.querySelectorAll(this.SEL)].filter(el => {
      const g = el.parentElement?.closest('.group'); if (!g || !root.contains(g)) return true;
      let ok = near.get(g); if (ok === undefined) { const r = g.getBoundingClientRect(); near.set(g, ok = r.bottom > -pad && r.top < vh + pad); }
      return ok;
    });
  },
  snap(root) {
    if (!root || root.hidden || reduced()) return null;
    const m = new Map(); let n = 0;
    for (const el of this.els(root, 200)) {
      const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200 || !r.height) continue;
      if (++n > 150) return null; m.set(this.key(el), r);
    }
    return m.size ? m : null;
  },
  play(root, before) {
    if (!before || !root || root.hidden) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    for (const el of this.els(root, 0)) {
      const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || !r.height) continue;
      const b = before.get(this.key(el));
      if (b) { const dx = b.left - r.left, dy = b.top - r.top; if (Math.abs(dx) > 1 || Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 200, easing: ease }); }
      else if (!el.matches('.new') && !el.querySelector('.fresh')) el.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: ease });
    }
  },
};
// 132: a picture's 1-3 main colours (+ 'bw'), read once from its small preview, no AI; saved on the item (hues) so search finds
// renk:mavi / color:blue / لون:أزرق and plain "mavi". Shown pictures are done as they load, the rest a few at a time when idle.
const Hues = {
  q: new Map(), tried: new Set(), t: 0,
  need: i => !!i && fileKind(i) === 'image' && i.hues === undefined && !i.deleted,
  async from(i, blob) {
    if (!this.need(i) || this.tried.has(i.id) || !window.NtsQuery || typeof OffscreenCanvas === 'undefined') return;
    this.tried.add(i.id);
    try {
      const bmp = await createImageBitmap(blob, { resizeWidth: 32, resizeHeight: 32, resizeQuality: 'low' }), c = new OffscreenCanvas(32, 32), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bmp, 0, 0); bmp.close?.(); this.q.set(i.id, NtsQuery.palette(g.getImageData(0, 0, 32, 32).data));
      clearTimeout(this.t); this.t = setTimeout(() => this.save(), 1500);
    } catch (e) { console.warn('hues', e.message); }
  },
  async save() { // quiet save: colours don't change how a card looks, so no re-render (only the open search is re-run)
    const list = [...this.q].map(([id, h]) => { const i = byId(id); if (i) i.hues = h; return i; }).filter(Boolean); this.q.clear();
    if (!list.length) return;
    const t = now(), base = new Map(list.map(i => [i.id, i.updatedAt || 0]));
    for (const i of list) { i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1); indexItem(i); }
    await DB.putMany('items', list.map(({ ...i }) => i)); await Sync.markDirty(list, base); Sync.schedule();
    if (S.q.trim()) { runSearch(); render(); }
  },
  async backfill() { // pictures never shown on this device: newest first, 6 at a time, only while the page is idle and visible
    if (this._run) return; this._run = true;
    try {
      for (;;) {
        await new Promise(r => setTimeout(r, 1200)); await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 3000 }));
        if (document.hidden) continue;
        const todo = S.items.filter(i => this.need(i) && !this.tried.has(i.id) && !i.pending).sort((a, b) => b.ts - a.ts).slice(0, 6);
        if (!todo.length) break;
        for (const i of todo) { // never pulls a whole picture from the cloud just for this: a local file or a cloud preview only
          const ok = i.ghThumb || i.sbThumb || await DB.get('files', i.id + ':t') || await DB.get('files', i.id), b = ok && await Prev.thumbBlob(i).catch(() => null); if (b) await this.from(i, b); else this.tried.add(i.id); }
      }
    } finally { this._run = false; }
  },
};
// 105f: picture fingerprints for "resimle ara": a 64-bit dHash of each image's small preview, made on this device and kept only
// here (IndexedDB kv 'ph', never synced; it is cheap to make again)
const PH = {
  m: null, t: 0,
  async load() { if (!this.m) { const v = await DB.get('kv', 'ph').catch(() => null); this.m = new Map(Object.entries(v || {})); } return this.m; },
  async of(blob) { // the fingerprint + the main colours of any picture
    // 72x64 first, then the mean of each 8x8 block: a straight 9x8 resize picks single pixels and flat areas (a white page) flip bits
    const bm = await createImageBitmap(blob, { resizeWidth: 72, resizeHeight: 64, resizeQuality: 'high' }), c = new OffscreenCanvas(72, 64), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bm, 0, 0); bm.close?.(); const d = g.getImageData(0, 0, 72, 64).data, px = new Float32Array(72 * 4);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 72; x++) { const o = (y * 72 + x) * 4, k = ((y >> 3) * 9 + (x >> 3)) * 4; px[k] += d[o] / 64; px[k + 1] += d[o + 1] / 64; px[k + 2] += d[o + 2] / 64; }
    return NtsQuery.dhash(px);
  },
  async from(i, blob) {
    if (!window.NtsQuery || typeof OffscreenCanvas === 'undefined') return; await this.load(); if (this.m.has(i.id)) return;
    try { this.m.set(i.id, await this.of(blob)); clearTimeout(this.t); this.t = setTimeout(() => DB.put('kv', Object.fromEntries(this.m), 'ph'), 1500); } catch (e) { console.warn('ph', e.message); }
  },
};
// 105f: search with a picture: in Ara, paste / drop a screenshot or photo (or "+" → pick one). On the device: the same or a close
// picture by its fingerprint, then pictures with the same colours; the text in it (read on the device with TextDetector, else by the
// bridge's /ocr when it is on) becomes the search words, so a screenshot of a bill finds the note about that bill too.
const IMG_KEY = 'Bu resme benzeyenler';
const ImgFind = {
  ok: () => !!window.NtsQuery && typeof OffscreenCanvas !== 'undefined',
  isImg: f => /^image\//.test(f?.type || ''),
  async run(file) {
    if (!this.ok()) return toast('Bu tarayıcı resimle aramayı desteklemiyor', 2600);
    this.drop(); const url = URL.createObjectURL(file), me = S.imgFind = { key: IMG_KEY, url, hits: new Map(), busy: true, ocr: '' };
    if (!findMode()) setMode('find');
    this.show();
    let q;
    try { const sm = await createImageBitmap(file, { resizeWidth: 32, resizeHeight: 32, resizeQuality: 'low' }), c = new OffscreenCanvas(32, 32), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(sm, 0, 0); sm.close?.(); q = { ph: await PH.of(file), hues: NtsQuery.palette(g.getImageData(0, 0, 32, 32).data) }; }
    catch (e) { console.warn('imgfind', e); if (S.imgFind === me) { this.drop(); clearBox(); } return toast('Resim okunamadı', 2400, 'x'); }
    this.read(file, me); // the text in it, in parallel
    await PH.load();
    const imgs = S.items.filter(i => !i.deleted && !hid(i) && fileKind(i) === 'image').sort((a, b) => b.ts - a.ts);
    const todo = imgs.filter(i => !PH.m.has(i.id));
    for (let k = 0; k < todo.length && S.imgFind === me; k += 8) { // previews not seen here yet: made once (a cloud preview only when online)
      await Promise.all(todo.slice(k, k + 8).map(async i => { const b = await Prev.thumbBlob(i).catch(() => null); if (b) await PH.from(i, b); }));
      if (todo.length > 24 && k % 48 === 0) toast(`Resimler taranıyor… ${Math.min(k + 8, todo.length)}/${todo.length}`, 1200, 'image');
    }
    if (S.imgFind !== me) return;
    for (const i of imgs) { const s = NtsQuery.imgSim(q, { ph: PH.m.get(i.id), hues: i.hues }); if (s >= .42) me.hits.set(i.id, s); }
    me.busy = false; this.show();
  },
  async read(file, me) {
    let text = '';
    try {
      if ('TextDetector' in window) { const bmp = await createImageBitmap(file); text = (await new TextDetector().detect(bmp)).map(x => x.rawValue).join(' '); bmp.close?.(); }
      else if (S.bridgeOk || (navigator.onLine && await AI.health().catch(() => false))) {
        me.reading = true; this.show();
        const bmp = await createImageBitmap(file), r = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = new OffscreenCanvas(Math.round(bmp.width * r), Math.round(bmp.height * r));
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
        const res = await AI.call('/ocr', { items: [{ id: 'q', image: b64(new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: .82 })).arrayBuffer())) }] }, 90000);
        text = res.items?.[0]?.text || '';
      }
    } catch (e) { console.warn('imgfind ocr', e.message); }
    me.reading = false; if (S.imgFind !== me) return;
    const w = NtsQuery.ocrWords(text); if (w) { me.ocr = w; me.key = w; }
    this.show();
  },
  show() { const me = S.imgFind; if (!me) return; const inp = $('#input'); inp.value = me.key; S.q = me.key; S.searchOn = true; S.hitsOff = false; S.hitSel = -1; runSearch(); autoGrow(); render(); renderHits(); },
  on: () => !!S.imgFind && findMode() && S.q.trim() === S.imgFind.key,
  drop() { if (S.imgFind) { URL.revokeObjectURL(S.imgFind.url); S.imgFind = null; } },
  merge() { // visual matches into the hits: the same picture on top, alike ones under the word results
    for (const [id, s] of S.imgFind.hits) { const i = byId(id); if (!i) continue; S.hits.set(id, s >= .75 ? 20 + s : (S.hits.get(id) || 0) + 1 + s); }
  },
};
// 105e: search by voice: the mic (Web Speech) next to the box in Ara, only where the browser has it; tr / en / ar (a tap on the
// language chip under the box while listening changes it, remembered). The words appear as they are heard and search live.
const MIC_L = [['tr-TR', 'TR'], ['en-US', 'EN'], ['ar-SA', 'AR']];
const Mic = {
  SR: window.SpeechRecognition || window.webkitSpeechRecognition, on: false, r: null,
  lang() { let l = null; try { l = localStorage.getItem('nts-mic'); } catch { } if (MIC_L.some(x => x[0] === l)) return l; const n = (navigator.language || 'tr').slice(0, 2); return n === 'en' ? 'en-US' : n === 'ar' ? 'ar-SA' : 'tr-TR'; },
  setLang(l) { try { localStorage.setItem('nts-mic', l); } catch { } if (this.on) { this.stop(); setTimeout(() => this.start(), 250); } else updateSend(); },
  toggle() { this.on ? this.stop() : this.start(); },
  start() {
    if (!this.SR) return;
    if (!navigator.onLine) return toast('Çevrimdışı: sesle arama internet ister (sesi tarayıcı yazıya çevirir). Yazarak arama çalışır.', 3600, 'mic');
    const inp = $('#input'), base = inp.value.trim(), r = this.r = new this.SR();
    r.lang = this.lang(); r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    r.onresult = e => { let t = ''; for (const x of e.results) t += x[0].transcript; inp.value = (base ? base + ' ' : '') + t.trim(); inp.dispatchEvent(new Event('input')); };
    r.onerror = e => { const m = { 'not-allowed': 'Mikrofon izni yok (adres çubuğundan izin ver)', 'service-not-allowed': 'Mikrofon izni yok', network: 'Sesle arama internet ister', 'no-speech': 'Ses duyulmadı, tekrar dene', 'audio-capture': 'Mikrofon bulunamadı', 'language-not-supported': 'Bu dil sesle desteklenmiyor' }[e.error];
      if (m) toast(m, 2800, 'mic'); };
    r.onend = () => { if (this.r === r) { this.on = false; this.r = null; updateSend(); } };
    try { r.start(); this.on = true; haptic(8); } catch (e) { console.warn('mic', e); this.on = false; }
    if (!findMode()) setMode('find'); else updateSend();
  },
  stop() { const r = this.r; this.on = false; this.r = null; try { r?.stop(); } catch { } updateSend(); },
};
// 95a: voice note. In Not with an empty box the mic records: hold it = record while held, release saves; a short tap = start, tap
// again = save; İptal / Esc throws it away. The sound is saved at once as an audio file (works offline, without the bridge); the bridge
// writes it out as text on the PC (whisper.cpp, no cloud), also later for notes recorded while it was off. Language = the mic chip.
const Voice = {
  can: () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
  here: () => S.mode === 'note' && Voice.can(),
  on: false, rec: null, t0: 0, tick: 0, dn: 0, cancel: false, MAX: 300e3,
  mime: () => ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported?.(m)) || '',
  async start() {
    if (this.rec || this._asking) return;
    let st; this._asking = true;
    try { st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { return toast(e.name === 'NotAllowedError' ? 'Mikrofon izni yok (adres çubuğundan izin ver)' : 'Mikrofon açılamadı', 3000, 'mic'); }
    finally { this._asking = false; }
    const m = this.mime(), parts = [];
    let r; try { r = new MediaRecorder(st, m ? { mimeType: m, audioBitsPerSecond: 32000 } : undefined); } catch (e) { st.getTracks().forEach(t => t.stop()); return toast('Ses kaydı bu tarayıcıda açılamadı', 3000, 'mic'); }
    this.rec = r;
    r.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    r.onstop = () => {
      st.getTracks().forEach(t => t.stop()); clearInterval(this.tick);
      const dur = (performance.now() - this.t0) / 1000, cancel = this.cancel;
      this.rec = null; this.on = false; this.cancel = false; updateSend();
      if (cancel) return toast('Sesli not silindi', 1600, 'x');
      if (dur < .7) return toast('Çok kısa: basılı tutup konuş ya da dokun, konuş, tekrar dokun', 2800, 'mic');
      this.save(new Blob(parts, { type: (r.mimeType || m || 'audio/webm').split(';')[0] }), dur);
    };
    r.start(1000); this.on = true; this.t0 = performance.now(); haptic(10);
    this.tick = setInterval(() => { this.time(); if (performance.now() - this.t0 > this.MAX) this.stop(); }, 250);
    updateSend();
  },
  stop(cancel) { if (!this.rec || this.rec.state === 'inactive') return; this.cancel = !!cancel; try { this.rec.stop(); } catch { } haptic(8); },
  time() { const el = $('#vTime'); if (!el) return; const s = Math.floor((performance.now() - this.t0) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; },
  async save(blob, dur) {
    const d = new Date(), p = n => String(n).padStart(2, '0'), ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
    const f = new File([blob], `sesli-not-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`, { type: blob.type });
    const [it] = itemsFromInput({ files: [f] }); it.voice = Math.round(dur); it.createdAt = now(); it.dev = deviceNow();
    const [saved] = await saveItems([it]); await upsert([saved]); render(); Motion.hop();
    toast(S.bridgeOk ? 'Sesli not kaydedildi · yazıya dökülüyor…' : 'Sesli not kaydedildi (köprü açılınca yazıya dökülür)', 2600, 'mic');
    if (S.bridgeOk) this.write(saved.id, blob);
  },
  async write(id, blob) { // → i.text (only if the user wrote nothing there meanwhile); tx: 1 done, 0 = the bridge can't (no whisper)
    try {
      const r = await AI.call('/transcribe', { audio: b64enc(new Uint8Array(await blob.arrayBuffer())), mime: blob.type, lang: Mic.lang().slice(0, 2) }, 600000);
      const i = byId(id); if (!i || i.deleted) return;
      if (!r.ok) { await upsert([{ ...i, tx: 0 }]); if (r.error === 'no-whisper') toast('Köprüde whisper yok: ses kaydı duruyor, yazıya dökülmedi', 4000, 'mic'); return; }
      await upsert([{ ...i, text: i.text?.trim() ? i.text : r.text, tx: 1, txLang: r.lang || undefined }]);
      if (r.text) toast('Sesli not yazıya döküldü', 2000, 'check');
    } catch (e) { console.warn('transcribe', e); }
  },
  async backfill() { // voice notes saved while the bridge was off (this device has the sound)
    if (this._bf || !S.bridgeOk) return; this._bf = true;
    try {
      for (const i of S.items.filter(i => i.voice && i.tx === undefined && !i.deleted).sort((a, b) => b.ts - a.ts).slice(0, 6)) {
        const u = await blobFor(i).catch(() => null); if (!u) continue;
        await this.write(i.id, await (await fetch(u)).blob());
      }
    } finally { this._bf = false; }
  },
};
// 132: colour words in the search (renk:mavi, color:blue, لون:أزرق, or just "mavi") get a small dot in the search chip
const HUE_DOT = { red: 'var(--c-red)', orange: 'var(--c-orange)', yellow: 'var(--c-yellow)', green: 'var(--c-green)', blue: 'var(--c-blue)', purple: 'var(--c-purple)',
  pink: '#ec4899', brown: '#92400e', black: '#111', white: '#fff', gray: '#9ca3af', bw: 'linear-gradient(90deg, #111 50%, #fff 50%)' };
const hueDots = q => { if (!window.NtsQuery) return '';
  const hs = [...new Set(q.split(/\s+/).map(w => NtsQuery.COLOR_OF(w.replace(/^-?[^:]*:/, '').replace(/^-/, ''))).filter(Boolean))].slice(0, 4);
  return hs.length ? `<span class="hue-dots" aria-hidden="true">${hs.map(h => `<i style="background:${HUE_DOT[h]}"></i>`).join('')}</span>` : ''; };
const thumbIO = new IntersectionObserver(es => es.forEach(async e => {
  if (!e.isIntersecting) return;
  thumbIO.unobserve(e.target);
  const i = byId(e.target.dataset.tid); if (!i) return;
  e.target.classList.add('loading'); // 94d: skeleton shimmer while the thumbnail is made/fetched
  const u = await Prev.thumb(i).catch(() => null); if (!u) return e.target.classList.remove('loading');
  if (Hues.need(i)) Prev.thumbBlob(i, false).then(b => b && Hues.from(i, b), () => { });
  const img = document.createElement('img'); img.alt = ''; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
  img.onerror = () => img.remove(); img.src = u;
  (img.decode ? img.decode() : new Promise((ok, no) => { img.onload = ok; img.onerror = no; })) // 94d: decoded first, then one soft fade (no half-painted image)
    .then(() => { if (img.naturalWidth && fileKind(i) === 'image') AR.set(i.id, img.naturalWidth / img.naturalHeight);
      if (img.naturalWidth) { GAR.set(i.id, img.naturalWidth / img.naturalHeight); if (e.target.classList.contains('pic') && parseInt(e.target.style.height) !== BoardPic.h(i)) BoardPic.learned(e.target); const t = e.target.closest('#gallery .tile'), a = GAR.fit(GAR.get(i.id)).toFixed(3); if (t && t.style.getPropertyValue('--ar') !== a) t.style.setProperty('--ar', a);  if (e.target.classList.contains('lpic')) { const a = Math.max(.6, Math.min(2, GAR.get(i.id))).toFixed(3); if (e.target.style.getPropertyValue('--ar') !== a) e.target.style.setProperty('--ar', a); } } // 99a: changes only the first time
      e.target.appendChild(img); requestAnimationFrame(() => img.classList.add('ok')); BoardPic.sharp(e.target, i); }, () => img.remove()).finally(() => e.target.classList.remove('loading'));
}), { rootMargin: '400px' });
function thumbBox(i, cls = 'thumb') { // fixed-size box: icon placeholder, image fades in → no layout jumps
  const k = fileKind(i);
  return `<div class="${cls}" data-tid="${i.id}">${ic(k === 'text' ? 'note' : k, 'lg')}${i.type === 'file' && !['image'].includes(k) ? `<span class="badge">${esc(extOf(i))}</span>` : ''}</div>`;
}
const hookThumbs = root => root.querySelectorAll('[data-tid]').forEach(el => thumbIO.observe(el));
// 158c (feedback-41): a link shows its OWN mark: the logo the bridge found, else the site's favicon straight from the site (no third party);
// the SVG chain under it shows when neither loads. Never an emoji, never a font glyph.
const linkFav = i => { if (i.type !== 'link') return ''; let s = i.meta?.logo; if (!s) try { const u = new URL(i.url); if (u.protocol === 'https:') s = u.origin + '/favicon.ico'; } catch { }
  return s ? `<img class="lfav" src="${esc(s)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ''; };
const leadOf = i => hasVisual(i) ? thumbBox(i) : `<div class="ico ${i.type}">${linkFav(i)}${ic(fileKind(i) === 'text' ? 'note' : fileKind(i))}</div>`;

// 106a (+130e): rich card previews on the board. Only what the item really holds (PLAN 106s): a video/music/map link plays inside the
// card (a picture first, the player only after a tap), a WhatsApp talk shows its last messages as bubbles, a note with a check list is a
// small document whose boxes tick without opening it, a code file shows its first lines coloured. Nothing made up: no picture → plain + icon.
const Rich = {
  on: new Set(), // ids whose player was started (kept across board redraws)
  more: new Set(), // 154: WhatsApp talks opened past their first lines on the card
  BUB: 8, BUBMAX: 1500, // a bubble shows up to 8 lines, then "devamı"
  chatLog: i => i.conv.log.filter(l => l.text).slice(-3),
  // 154: how many lines a bubble's text takes on a 240 px card, wrapped like the browser (greedy at spaces, a long word broken
  // anywhere), measured on a canvas so Board.est knows the card's height without the DOM. Bubble text box: (214 × .86) − 18 px.
  bubN(s) {
    const c = this._bc ||= new Map(), k = s.length > 200 ? s.slice(0, 200) + s.length : s; if (c.has(k)) return c.get(k);
    const g = this._g ||= document.createElement('canvas').getContext('2d'), W = 214 * .86 - 18;
    g.font = '400 12.5px ' + getComputedStyle(document.body).fontFamily;
    let n = 0;
    for (const para of s.slice(0, this.BUBMAX).split('\n')) { n++; let x = 0;
      for (const t of para.match(/\S+\s*|\s+/g) || []) { const w = g.measureText(t.trimEnd()).width;
        if (x > 0 && x + w > W) { n++; x = 0; }
        if (w > W) { n += Math.floor(w / W); x = w % W; } else x += w;
        x += t.length > t.trimEnd().length ? g.measureText(t.slice(t.trimEnd().length)).width : 0; } }
    if (document.fonts?.status === 'loaded') { if (c.size > 4000) c.clear(); c.set(k, n); }
    return n;
  },
  embed(i) {
    if (i.type !== 'link') return null;
    const yt = ytId(i); if (yt) return { k: 'yt', src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`, h: 135, label: 'YouTube' };
    let u; try { u = new URL(i.url); } catch { return null; }
    const h = u.hostname.replace(/^www\.|^m\./, ''), p = u.pathname;
    if (h === 'vimeo.com' || h === 'player.vimeo.com') { const v = p.match(/(?:^|\/)(\d{6,12})(?:\/|$)/); if (v) return { k: 'vimeo', src: `https://player.vimeo.com/video/${v[1]}?autoplay=1&dnt=1`, h: 135, label: 'Vimeo' }; }
    if (h === 'open.spotify.com') { const s = p.match(/^\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})/); if (s) return { k: 'spotify', src: `https://open.spotify.com/embed/${s[1]}/${s[2]}`, h: s[1] === 'track' || s[1] === 'episode' ? 80 : 152, label: 'Spotify' }; }
    if (/^(google\.[a-z.]+|maps\.google\.[a-z.]+)$/.test(h) && (h.startsWith('maps.') || p.startsWith('/maps'))) {
      const place = p.match(/\/place\/([^/]+)/)?.[1], at = p.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/), q = u.searchParams.get('q') || u.searchParams.get('query') || (place && decodeURIComponent(place.replace(/\+/g, ' '))) || (at && at[1] + ',' + at[2]);
      if (q) return { k: 'map', src: `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`, h: 150, label: 'Harita', q };
    }
    return null;
  },
  // the block under the picture; '' = the card stays as it was
  html(i) {
    const e = this.embed(i);
    if (e) {
      if (this.on.has(i.id)) return `<div class="r-emb on ${e.k}" style="height:${e.h}px"><iframe src="${esc(e.src)}" title="${e.label}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
      const lab = e.k === 'map' ? 'Haritayı kartta aç' : 'Kartta oynat';
      if (!hasVisual(i)) return `<div class="r-emb ${e.k}"><button class="r-plain" data-rich="play" aria-label="${lab}">${ic(e.k === 'map' ? 'mappin' : e.k === 'spotify' ? 'audio' : 'video', 'lg')}${e.q && !titleOf(i).includes(e.q) ? `<span class="q" dir="auto">${esc(e.q)}</span>` : ''}<span class="go">${ic(e.k === 'map' ? 'mappin' : 'play', 'sm')}${lab}</span></button></div>`;
      return `<div class="r-emb ${e.k}">${thumbBox(i)}<button class="r-play" data-rich="play" aria-label="${lab}" title="${lab}">${ic('play')}</button></div>`;
    }
    return '';
  },
  // replaces the grey sub line when the item has a better shape for it
  body(i) {
    if (i.conv?.log?.length) {
      const first = i.conv.who[0], many = i.conv.who.length > 2, log = this.chatLog(i), open = this.more.has(i.id);
      return log.length ? `<div class="r-chat">${log.map(l => { const lng = this.bubN(l.text) > this.BUB; // 154: whole messages; a long one ends on a full line with "devamı"
        return `<div class="r-b${l.who === first ? '' : ' me'}">${many && l.who !== first ? `<b dir="auto">${esc(l.who)}</b>` : ''}<span class="t${lng && !open ? ' cl' : ''}" dir="auto">${esc(l.text.slice(0, this.BUBMAX))}</span>${lng ? `<button class="r-bm" data-rich="more" aria-expanded="${open}">${open ? 'daha az' : 'devamı'}</button>` : ''}</div>`; }).join('')}</div>` : '';
    }
    const dd = this.due(i); if (dd) return this.cdHtml(i, dd); // 106d
    const pg = this.prog(i); if (pg) return this.progHtml(i, pg);
    if (this.isDoc(i)) { // 106b: a note with structure is a small document (same look as the editor), boxes tick right here
      const lines = i.text.split('\n'), first = !i.userTitle ? lines.findIndex(l => l.trim()) : -1, cv = this.covLn(i), tb = this.tbl(i), out = []; let n = 0, code = false, ch = false;
      lines.forEach((l, k) => { const c = l.match(/^\s*(?:[-*+]\s*)?\[( |x|X)\]\s+(.*)/);
        if (/^```/.test(l)) { code = !code; return; } if (k === first || k === cv || !l.trim() || /^\|?\s*:?-{2,}[-|: ]*$/.test(l.trim()) || /^(-{3,}|\*{3,})$/.test(l.trim())) return;
        if (tb && !code && /^\|.*\|\s*$/.test(l.trim())) { if (!ch) { ch = true; out.push(this.chartHtml(tb)); } return; } // 106d: a table of numbers is drawn as a chart
        if (n >= 6) { n++; return; } n++;
        if (code) out.push(`<div class="r-cd" dir="ltr">${esc(l)}</div>`);
        else if (c) out.push(`<button class="r-ck${c[1] !== ' ' ? ' on' : ''}" data-rich="tick" data-ln="${k}" role="checkbox" aria-checked="${c[1] !== ' '}"><span class="bx">${ic('check', 'sm')}</span><span dir="auto">${Ed.inl(c[2])}</span></button>`);
        else if (/^#{1,3}\s/.test(l)) out.push(`<div class="r-h" dir="auto">${Ed.inl(l.replace(/^#+\s*/, ''))}</div>`);
        else if (/^\s*(?:[-*•+]|\d+[.)])\s/.test(l)) out.push(`<div class="r-li${/^\s*\d/.test(l) ? ' ol' : ''}" dir="auto"${/^\s*\d/.test(l) ? ` data-n="${l.match(/\d+/)[0]}."` : ''}>${Ed.inl(l.replace(/^\s*(?:[-*•+]|\d+[.)])\s*/, ''))}</div>`);
        else if (/^>\s?/.test(l)) out.push(`<div class="r-q" dir="auto">${Ed.inl(l.replace(/^>\s?/, ''))}</div>`);
        else if (/^\|.*\|\s*$/.test(l)) out.push(`<div class="r-tr">${l.trim().replace(/^\||\|$/g, '').split('|').map(x => `<span dir="auto">${Ed.inl(x.trim())}</span>`).join('')}</div>`);
        else if (Ed.IMG.test(l)) out.push(`<div class="r-p r-im">${ic('image', 'sm')}${esc(l.match(Ed.IMG)[1] || 'Resim')}</div>`);
        else out.push(`<div class="r-p" dir="auto">${Ed.inl(l)}</div>`); });
      if (!out.length) return null;
      return `<div class="r-doc">${out.join('')}${n > 6 ? `<div class="r-more">+${n - 6} satır</div>` : ''}</div>`; // 106d: the "3/7" count is a ring next to the title
    }
    if (this.code(i)) return `<pre class="r-code" data-cid="${i.id}" dir="ltr"></pre>`;
    if (this.csv(i)) return `<div class="r-chart r-csv" data-cid="${i.id}"></div>`;
    return null;
  },
  isDoc: i => i.type === 'note' && !i.sticky && !!i.text && /^\s*(?:[-*+]\s*)?\[( |x|X)\]\s|^#{1,3}\s|^\s*(?:[-*+]|\d+[.)])\s+\S|^>\s|^```|^\|.*\|\s*$|^!\[[^\]]*\]\(/m.test(i.text),
  covLn(i) { const c = noteCover(i); return c ? i.text.split('\n').findIndex(l => Ed.IMG.test(l) && l.includes(c.src)) : -1; }, // 106c: the cover picture is not listed again
  code: i => i.type === 'file' && /\.(js|mjs|cjs|ts|tsx|jsx|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|swift|sql|sh|bash|zsh|css|scss|json|ya?ml|toml|html?|xml)$/i.test(i.fileName || ''),
  // heights for Board.est (rough, like the rest): the picture/player box, and the body when it replaces the sub line (null = it does not)
  embH(i) { const e = this.embed(i); return !e ? 0 : this.on.has(i.id) ? e.h - (hasVisual(i) ? 132 : 0) : hasVisual(i) ? 0 : 132; },
  bodyH(i) {
    if (i.conv?.log?.length) { const log = this.chatLog(i); if (!log.length) return null;
      const many = i.conv.who.length > 2, first = i.conv.who[0], open = this.more.has(i.id), LH = 16.875;
      return Math.round(8 + 4 * (log.length - 1) + log.reduce((h, l) => { const n = this.bubN(l.text);
        return h + 10 + (many && l.who !== first ? 14.85 : 0) + Math.min(n, open ? 1e9 : this.BUB) * LH + (n > this.BUB ? 24 : 0); }, 0)); }
    const dd = this.due(i); if (dd) return dd.at - now() < 864e5 ? 63 : 54; // 106d
    if (this.prog(i)) return matchMedia('(pointer: coarse)').matches ? 57 : 50;
    if (this.isDoc(i)) {
      const row = matchMedia('(pointer: coarse)').matches ? 32 : 24, L = i.text.split('\n'), first = !i.userTitle ? L.findIndex(l => l.trim()) : -1, cv = this.covLn(i);
      const tb = this.tbl(i); let ch = false;
      const ls = L.filter((l, k) => k !== first && k !== cv && l.trim() && !/^```|^\|?\s*:?-{2,}[-|: ]*$|^(-{3,}|\*{3,})$/.test(l.trim())).filter(l => !tb || !/^\|.*\|\s*$/.test(l.trim()) || !ch && (ch = l));
      if (!ls.length) return null;
      return 6 + ls.slice(0, 6).reduce((h, l) => h + 1 + (l === ch ? this.CH : /^\s*(?:[-*+]\s*)?\[( |x|X)\]\s/.test(l) ? row : /^#{1,3}\s/.test(l) ? 21 : 18), 0) + (ls.length > 6 ? 20 : 0);
    }
    return this.code(i) ? 152 : this.csv(i) ? this.CH : null;
  },
  // a tap inside a card: true when it was meant for a rich part (play, tick), so the card does not open
  tap(card, t) {
    const b = t?.closest?.('[data-rich]'); if (!b || !card.contains(b)) return false;
    const i = byId(card.dataset.id); if (!i) return true;
    if (b.dataset.rich === 'play') { this.on.add(i.id); const box = b.closest('.r-emb'); box.outerHTML = this.html(i); haptic(8); S.items = [...S.items]; render(); return true; } // the card grows: the board lays out again
    if (b.dataset.rich === 'more') { this.more.has(i.id) ? this.more.delete(i.id) : this.more.add(i.id); haptic(6); S.items = [...S.items]; render(); return true; } // 154: the card grows, the board lays out again
    if (b.dataset.rich === 'tick') {
      const n = +b.dataset.ln, lines = (i.text || '').split('\n'); if (!/\[( |x|X)\]/.test(lines[n] || '')) return true;
      const on = !b.classList.contains('on'); lines[n] = lines[n].replace(/\[( |x|X)\]/, on ? '[x]' : '[ ]');
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on); haptic(8);
      const nx = { ...i, text: lines.join('\n') }, pl = card.querySelector('.r-pill'); if (pl) pl.outerHTML = this.pill(nx); // 106d: the ring moves at once
      upsert([nx]); return true;
    }
    if (b.dataset.rich === 'pg') { const p = this.prog(i); if (!p || b.disabled) return true; const v = Math.max(0, Math.min(p.max, p.n + +b.dataset.d)), src = i.todo?.text ?? i.text;
      const txt = src.slice(0, p.at) + v + src.slice(p.at + String(p.n).length); haptic(8);
      const nx = i.todo ? { ...i, todo: { ...i.todo, text: txt }, ...(i.text === i.todo.text ? { text: txt } : {}) } : { ...i, text: txt };
      b.closest('.r-pg').outerHTML = this.progHtml(nx); card.querySelector(`.r-pg [data-d="${b.dataset.d}"]`)?.focus({ preventScroll: true }); upsert([nx]); return true; }
    if (b.dataset.rich === 'bar') { this.chartTip(b, +b.dataset.k); haptic(6); return true; }
    return false;
  },
  // code: first lines of the file on this device, coloured by a tiny tokenizer (keywords, strings, comments, numbers); no file here → nothing
  io: new IntersectionObserver(es => es.forEach(async e => {
    if (!e.isIntersecting) return; Rich.io.unobserve(e.target);
    const f = await DB.get('files', e.target.dataset.cid).catch(() => null); if (!f?.blob) return e.target.remove();
    if (e.target.classList.contains('r-csv')) { const s = Rich.parseCsv(await f.blob.slice(0, 20000).text()); if (!s) return e.target.remove(); e.target.outerHTML = Rich.chartHtml(s).replace('class="r-chart"', 'class="r-chart r-csv ok"'); return; } // 106d
    const txt = (await f.blob.slice(0, 4000).text()).split('\n').slice(0, 8).map(l => l.slice(0, 60)).join('\n');
    e.target.innerHTML = Rich.hl(txt); e.target.classList.add('ok');
  }), { rootMargin: '300px' }),
  hl(s) {
    const re = /(\/\/.*|#(?!include).*|\/\*[\s\S]*?\*\/|--.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|class|import|from|export|def|async|await|new|true|false|null|None|True|False|fn|pub|struct|impl|use|func|package|public|private|static|void|int|string|select|from|where|insert|update|and|or|not|in|of|type|interface)\b/g;
    let out = '', k = 0;
    for (const m of s.matchAll(re)) { out += esc(s.slice(k, m.index)); out += `<span class="${m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k'}">${esc(m[0])}</span>`; k = m.index + m[0].length; }
    return out + esc(s.slice(k));
  },
  hook(root) { root.querySelectorAll('.r-code:not(.ok), .r-csv:not(.ok)').forEach(el => this.io.observe(el)); if (root.querySelector?.('.r-cdC')) this.live(); },
  // ---------- 106d: interactive parts, only from what the record really holds ----------
  // a ring (fraction f of it drawn); r is the radius in a 24 box
  ring: (f, r = 9) => { const c = 2 * Math.PI * r; return `<svg class="r-ring" viewBox="0 0 24 24" aria-hidden="true"><circle class="bg" cx="12" cy="12" r="${r}"/><circle class="fg" cx="12" cy="12" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.max(0, Math.min(1, f)))).toFixed(1)}" transform="rotate(-90 12 12)"/></svg>`; },
  // check list "3/7" ring next to the title (d-check-A)
  checks(i) { if (!this.isDoc(i)) return null; let d = 0, a = 0; for (const m of i.text.matchAll(/^\s*(?:[-*+]\s*)?\[( |x|X)\]\s+\S/gm)) { a++; if (m[1] !== ' ') d++; } return a ? { d, a } : null; },
  pill(i) { const c = this.checks(i); return c ? `<span class="r-pill${c.d === c.a ? ' all' : ''}" title="${c.d}/${c.a} bitti">${this.ring(c.d / c.a)}<span>${c.d}/${c.a}</span></span>` : ''; },
  // countdown (d-count-A/B/C): an open task with a date ahead. A day or more: ring (time gone since it was written) + days; under a day: live hours/minutes/seconds
  due(i) { const t = i.todo; if (!t || t.done || !t.due) return null; const d = dueInfo(t.due); return d && d.ms > 0 && d.ms < 400 * 864e5 ? d : null; },
  cdHtml(i, d = this.due(i)) {
    const ms = d.at - now();
    if (ms < 864e5) { const s = Math.floor(ms / 1e3), p = n => String(n).padStart(2, '0');
      return `<div class="r-cdC" data-at="${d.at}" role="timer" aria-label="${Math.floor(s / 3600)} saat ${Math.floor(s / 60) % 60} dakika kaldı">${[[Math.floor(s / 3600), 'saat'], [Math.floor(s / 60) % 60, 'dk'], [s % 60, 'sn']].map(([n, l]) => `<div><b>${p(n)}</b><small>${l}</small></div>`).join('')}</div>`; }
    const days = Math.ceil((d.at - new Date(new Date().toDateString()).getTime() - 864e5) / 864e5) || 1, from = i.todo.createdAt || i.createdAt || i.ts, f = d.at > from ? (d.at - now()) / (d.at - from) : 1;
    const when = new Date(d.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) + (i.todo.due.includes('T') ? ' · ' + i.todo.due.slice(11, 16) : '');
    return `<div class="r-cd2">${this.ring(f, 10)}<div><div class="big">${days}<small>gün</small></div><div class="s">${esc(when)}</div></div></div>`;
  },
  // stepped progress (d-prog-B): "Sapiens 4/10 bölüm", "ders 3/12", "صفحة 20/300"; a unit word must stand by the numbers (so 4/10 as a date is not taken)
  PROG: /(?:^|[\s(:·-])(\d{1,3})\s?\/\s?(\d{1,3})(?![\d/.,])/,
  UNIT: /bölüm|sayfa|ders|ünite|kısım|adım|gün|hafta|ay\b|bölümü|sezon|kitap|seri|ilerleme|chapter|\bch\b|page|lesson|part|episode|\bep\b|unit|step|day|week|module|progress|فصل|صفحة|درس|حلقة|جزء|يوم|أسبوع|وحدة/i,
  prog(i) {
    if (i.sticky || i.conv || !['note'].includes(i.type) && !i.todo || this.isDoc(i)) return null;
    const s = i.todo?.text || i.text || ''; if (!s || (s.match(/\d+\s?\/\s?\d+/g) || []).length !== 1) return null;
    const m = s.match(this.PROG); if (!m) return null; const n = +m[1], max = +m[2];
    if (max < 2 || max > 400 || n > max || !this.UNIT.test(s)) return null;
    return { n, max, at: m.index + m[0].indexOf(m[1]), len: m[0].length - m[0].indexOf(m[1]) };
  },
  progHtml(i, p = this.prog(i)) {
    const seg = p.max <= 30 ? Array.from({ length: p.max }, (_, k) => `<i${k < p.n ? ' class="on"' : ''}></i>`).join('') : `<i class="on" style="flex:${p.n}"></i><i style="flex:${p.max - p.n}"></i>`;
    return `<div class="r-pg"${/^[^A-Za-zÀ-ž]*[\u0590-\u08ff]/.test(i.todo?.text || i.text || '') ? ' dir="rtl"' : ''}><div class="st${p.max > 30 ? ' bar' : ''}">${seg}</div><div class="rw"><span class="lb">${p.n}/${p.max}</span>
      <button class="r-sb" data-rich="pg" data-d="-1" aria-label="Bir geri" title="Bir geri"${p.n ? '' : ' disabled'}>${ic('minus', 'sm')}</button><button class="r-sb" data-rich="pg" data-d="1" aria-label="Bir ileri" title="Bir ileri"${p.n < p.max ? '' : ' disabled'}>${ic('plus', 'sm')}</button></div></div>`;
  },
  // a chart from a Markdown table in a note (label column + a number column, 3+ rows) or from a .csv file on this device (d-chart-A bars ≤12, d-chart-B line)
  num(s) { s = String(s).replace(/[\s₺$€£%]|TL|USD|EUR/gi, ''); if (!/^-?[\d.,]+$/.test(s) || !/\d/.test(s)) return NaN;
    const d = s.lastIndexOf(','), p = s.lastIndexOf('.');
    if (d >= 0 && p >= 0) s = d > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    else if (d >= 0) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // Turkish thousands: 11.240
    return +s; },
  series(rows) { // rows: arrays of cells, first may be the header
    rows = rows.filter(r => r.some(c => c.trim())); if (rows.length < 3) return null;
    const head = rows[0].some(c => c.trim() && isNaN(this.num(c))) && rows.slice(1).some(r => r.some(c => !isNaN(this.num(c)))) ? rows.shift() : null;
    const w = Math.max(...rows.map(r => r.length)), ok = k => rows.every(r => !isNaN(this.num(r[k] ?? '')));
    let v = -1; for (let k = w - 1; k >= 0; k--) if (ok(k) && k > 0) { v = k; break; } if (v < 0) return null;
    const lab = rows[0].findIndex((c, k) => k !== v && isNaN(this.num(c))), pts = rows.slice(0, 60).map((r, k) => ({ l: (lab >= 0 ? r[lab] : String(k + 1)).trim().slice(0, 16), v: this.num(r[v]) }));
    return pts.length >= 3 ? { name: head ? head[v].trim() : '', pts } : null;
  },
  tbl(i) { if (i.type !== 'note' || !i.text || !/^\|.*\|\s*$/m.test(i.text)) return null;
    const L = i.text.split('\n').filter(l => /^\|.*\|\s*$/.test(l.trim()) && !/^\|?\s*:?-{2,}[-|: ]*$/.test(l.trim()));
    return this.series(L.map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => Ed.plain(c.trim())))); },
  csv: i => i.type === 'file' && /\.(csv|tsv)$/i.test(i.fileName || ''),
  parseCsv(t) { const L = t.split(/\r?\n/).filter(l => l.trim()).slice(0, 62), d = [';', '\t', ','].sort((a, b) => L[0].split(b).length - L[0].split(a).length)[0];
    return this.series(L.map(l => l.split(d).map(c => c.replace(/^"|"$/g, '')))); },
  fmtN: v => v.toLocaleString('tr-TR', { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 0 }),
  chartSvg(s) {
    const W = 216, H = 78, B = 14, n = s.pts.length, vs = s.pts.map(p => p.v), lo = Math.min(0, ...vs), hi = Math.max(...vs, lo + 1), y = v => 4 + (H - 4) * (1 - (v - lo) / (hi - lo)), bar = n <= 12;
    const cw = W / n, hit = s.pts.map((p, k) => `<rect class="h" data-rich="bar" data-k="${k}" data-l="${esc(p.l)}" data-v="${this.fmtN(p.v)}" x="${(k * cw).toFixed(1)}" y="0" width="${cw.toFixed(1)}" height="${H + B}"/>`).join('');
    const lab = k => `<text x="${((k + .5) * cw).toFixed(1)}" y="${H + B - 2}" text-anchor="${k === 0 && !bar ? 'start' : k === n - 1 && !bar ? 'end' : 'middle'}">${esc(s.pts[k].l.slice(0, bar && n > 6 ? 3 : 8))}</text>`;
    const ticks = bar && n <= 6 ? s.pts.map((_, k) => lab(k)) : [lab(0), lab(n - 1)];
    let marks;
    if (bar) { const bw = Math.min(26, cw * .64); marks = s.pts.map((p, k) => `<rect class="b" data-k="${k}" x="${((k + .5) * cw - bw / 2).toFixed(1)}" y="${Math.min(y(p.v), y(0)).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(y(0) - y(p.v))).toFixed(1)}" rx="3"/>`).join(''); }
    else { const P = s.pts.map((p, k) => `${((k + .5) * cw).toFixed(1)},${y(p.v).toFixed(1)}`); marks = `<path class="ar" d="M${P[0]} L${P.join(' L')} L${((n - .5) * cw).toFixed(1)},${y(lo)} L${(cw / 2).toFixed(1)},${y(lo)} Z"/><polyline class="ln" points="${P.join(' ')}"/>` + s.pts.map((p, k) => `<circle class="dt" data-k="${k}" cx="${((k + .5) * cw).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3"/>`).join(''); }
    return `<svg viewBox="0 0 ${W} ${H + B}" role="img" aria-label="${esc((s.name ? s.name + ': ' : '') + s.pts.map(p => p.l + ' ' + this.fmtN(p.v)).join(', '))}"><line class="ax" x1="0" x2="${W}" y1="${y(lo === 0 ? 0 : lo)}" y2="${y(lo === 0 ? 0 : lo)}"/>${marks}${ticks.join('')}${hit}</svg>`;
  },
  chartHtml(s) { const mx = s.pts.reduce((a, p) => p.v > a.v ? p : a); return `<div class="r-chart" data-n="${esc(s.name)}">${this.chartSvg(s)}<div class="r-tip"><span>${esc(s.name || 'En yüksek')}</span> <b>${esc(mx.l)} · ${this.fmtN(mx.v)}</b></div></div>`; },
  chartTip(el, k) { const c = el.closest('.r-chart'); if (!c) return; c.querySelectorAll('.sel').forEach(x => x.classList.remove('sel')); c.querySelectorAll(`[data-k="${k}"]:not(.h)`).forEach(x => x.classList.add('sel'));
    c.querySelector('.r-tip').innerHTML = `${c.dataset.n ? `<span>${esc(c.dataset.n)}</span> ` : ''}<b>${esc(el.dataset.l)} · ${el.dataset.v}</b>`; },
  CH: 116, // chart block height (svg 92 + tip) for Board.est
  // live seconds for every countdown under a day that is on screen (one timer, stops when none is left)
  live() { if (this.lt) return; this.lt = setInterval(() => { const els = document.querySelectorAll('.r-cdC'); if (!els.length) { clearInterval(this.lt); this.lt = 0; return; }
    for (const el of els) { const s = Math.max(0, Math.floor((+el.dataset.at - now()) / 1e3)), b = el.querySelectorAll('b'), p = n => String(n).padStart(2, '0'); b[0].textContent = p(Math.floor(s / 3600)); b[1].textContent = p(Math.floor(s / 60) % 60); b[2].textContent = p(s % 60); } }, 1000); },

};
// 145: a board card that holds a PDF, a sound, a video or a picture works right on the board. A tap (no drag) makes it live: PDF pages
// turn in the card (‹ ›, the wheel scrolls the page), a sound plays with its wave line and place, a video plays, a picture zooms where
// tapped. One live card at a time (one playing medium); a tap outside or Esc ends it. Far away a tap first comes close to the card.
// The corner button (and "Pencerede aç" in the menu) opens the record window instead. Only the live card has a player, so 10k cards stay light.
const OnBoard = {
  id: null, el: null, a: null, pdf: null,
  NEAR: .55, // below this zoom a tap comes closer first
  can(i) { return !!i && !i.sticky && (!!Rich.embed(i) || i.type === 'file' && ['pdf', 'audio', 'video', 'image'].includes(fileKind(i))); },
  // a tap on a card: true when it was taken here (the card did not open)
  tap(card) {
    const i = byId(card.dataset.id); if (!this.can(i)) return false;
    if (S.cam && S.cam.k < this.NEAR) { this.near(card); return true; }
    if (this.id === i.id) return true;
    if (Rich.embed(i)) { const b = card.querySelector('[data-rich="play"]'); if (b) Rich.tap(card, b); return !!b; }
    this.open(card, i); return true;
  },
  near(card) { // the card comes to the middle at a readable size
    const b = $('#board'), k = innerWidth < 900 ? 1 : Math.max(1, S.cam.k), x = card.offsetLeft + card.offsetWidth / 2, y = card.offsetTop;
    Board.animate(() => { S.cam = { k, x: b.clientWidth / 2 - x * k, y: Math.max(72, b.clientHeight * .18) - y * k }; Board.apply(); }); haptic(8);
  },
  async open(card, i) {
    this.close(); const k = fileKind(i), u = await blobFor(i).catch(() => null);
    if (!card.isConnected) return;
    if (!u) return toast('Dosya bu cihazda yok' + (i.fileSynced ? ', önce indiriliyor olabilir' : ''), 2600, 'cloud');
    this.id = i.id; this.el = card; haptic(8);
    const old = card.querySelector(':scope > .thumb, :scope > .r-emb'), box = document.createElement('div'); box.className = 'r-live ' + k; this.old = old;
    this.h = card.style.height; card.style.height = ''; card.classList.add('live');
    old ? old.replaceWith(box) : card.querySelector('.b-in').before(box);
    if (k === 'image') { box.innerHTML = `<div class="lv-img"><img src="${u}" alt="" draggable="false"></div><div class="lv-tip">Dokun: yakınlaş</div>`; }
    else if (k === 'video') { box.innerHTML = `<video src="${u}" controls playsinline autoplay preload="metadata"></video>`; this.a = box.querySelector('video'); }
    else if (k === 'audio') {
      box.innerHTML = `<div class="lv-au"><button class="lv-pp" data-lv="pp" aria-label="Oynat">${ic('play')}</button><div class="lv-wave" data-lv="seek" role="slider" tabindex="0" aria-label="Konum" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${'<i></i>'.repeat(40)}</div><span class="lv-t">0:00</span></div>`;
      const a = this.a = new Audio(u); a.preload = 'auto';
      const t = box.querySelector('.lv-t'), w = box.querySelector('.lv-wave'), bars = [...w.children], pp = box.querySelector('.lv-pp'), mm = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      const tick = () => { const d = a.duration || i.voice || 0, f = d ? a.currentTime / d : 0; t.textContent = mm(a.paused && !a.currentTime ? d : a.currentTime);
        const n = Math.round(f * bars.length); bars.forEach((b, x) => b.classList.toggle('on', x < n)); w.setAttribute('aria-valuenow', Math.round(f * 100)); };
      a.ontimeupdate = a.onloadedmetadata = tick; a.onplay = a.onpause = a.onended = () => { pp.innerHTML = ic(a.paused ? 'play' : 'pause'); pp.ariaLabel = a.paused ? 'Oynat' : 'Duraklat'; tick(); };
      this.wave(u, bars); a.play().catch(() => {});
    } else if (k === 'pdf') {
      box.innerHTML = `<div class="lv-pg lv-scroll"><div class="skel"></div></div><div class="lv-bar"><button data-lv="prev" aria-label="Önceki sayfa" disabled>${ic('chev', 'sm')}</button><span class="lv-n">1 / …</span><button data-lv="next" aria-label="Sonraki sayfa">${ic('chev', 'sm')}</button></div>`;
      try { this.pdf = { doc: await Prev.pdfDoc(i), n: 1, id: i.id }; if (this.id !== i.id) return this.pdf?.doc?.destroy(); await this.page(0); }
      catch { box.querySelector('.lv-pg').innerHTML = `<div class="prev-empty">${ic('pdf', 'lg')}<span>PDF açılamadı</span></div>`; }
    }
    Board.wires?.();
  },
  async page(d) {
    const p = this.pdf, box = this.el?.querySelector('.r-live'); if (!p?.doc || !box) return;
    const n = Math.max(1, Math.min(p.doc.numPages, p.n + d)); if (d && n === p.n) return; p.n = n;
    const pg = box.querySelector('.lv-pg'), c = await Prev.renderPage(p.doc, n, Math.min(1400, Math.round(236 * (devicePixelRatio || 1) * Math.max(1.5, S.cam?.k || 1))));
    if (this.pdf !== p) return; pg.replaceChildren(c); pg.scrollTop = d < 0 ? pg.scrollHeight : 0;
    box.querySelector('.lv-n').textContent = `${n} / ${p.doc.numPages}`; box.querySelector('[data-lv="prev"]').disabled = n < 2; box.querySelector('[data-lv="next"]').disabled = n >= p.doc.numPages;
  },
  async wave(u, bars) { // real loudness of the sound in 40 bars (no made-up shape); if it cannot be read the bars stay even
    try { const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = await ac.decodeAudioData(await (await fetch(u)).arrayBuffer()); ac.close?.();
      const ch = buf.getChannelData(0), step = Math.floor(ch.length / bars.length), v = bars.map((_, k) => { let m = 0; for (let j = k * step; j < (k + 1) * step; j += 32) m = Math.max(m, Math.abs(ch[j])); return m; }), mx = Math.max(...v, .01);
      bars.forEach((b, k) => b.style.height = Math.max(12, Math.round(v[k] / mx * 100)) + '%');
    } catch { }
  },
  close() {
    if (!this.id) return; const c = this.el, box = c?.querySelector('.r-live');
    if (this.a) { this.a.pause(); this.a.removeAttribute?.('src'); this.a = null; } this.pdf?.doc?.destroy?.(); this.pdf = null;
    if (box) this.old ? box.replaceWith(this.old) : box.remove();
    if (c) { c.classList.remove('live'); c.style.height = this.h || ''; }
    this.id = this.el = this.old = null; Board.wires?.();
  },
  click(e) { // controls inside the live card
    const b = e.target.closest('[data-lv]'), box = e.target.closest('.r-live'); if (!box) return;
    if (b?.dataset.lv === 'prev') this.page(-1); else if (b?.dataset.lv === 'next') this.page(1);
    else if (b?.dataset.lv === 'pp' && this.a) this.a.paused ? this.a.play() : this.a.pause();
    else if (b?.dataset.lv === 'seek' && this.a) { const r = b.getBoundingClientRect(), f = (e.clientX - r.left) / r.width; if (this.a.duration) this.a.currentTime = Math.max(0, Math.min(1, f)) * this.a.duration; if (this.a.paused) this.a.play(); }
    else if (box.classList.contains('image')) { const w = box.querySelector('.lv-img'), im = w.querySelector('img'), r = w.getBoundingClientRect(), on = !w.classList.contains('z');
      im.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; w.classList.toggle('z', on); box.querySelector('.lv-tip').textContent = on ? 'Dokun: geri' : 'Dokun: yakınlaş'; }
  },
  init() {
    document.addEventListener('click', e => { if (e.target.closest('.bcard.live .r-live')) this.click(e); });
    document.addEventListener('pointermove', e => { const w = e.target.closest?.('.bcard.live .lv-img.z'); if (!w || e.pointerType !== 'mouse') return; const r = w.getBoundingClientRect(); w.firstChild.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; });
    document.addEventListener('pointerdown', e => { if (this.id && !e.target.closest('.bcard.live, .ctx, dialog')) this.close(); }, true);
    addEventListener('keydown', e => { if (!this.id) return;
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { this.close(); }
      else if (this.pdf && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowLeft' || e.key === 'PageUp') && !e.target.closest('input,textarea,[contenteditable]')) { e.preventDefault(); this.page(/Right|Down/.test(e.key) ? 1 : -1); }
      else if (e.key === ' ' && this.a && !(this.a instanceof HTMLVideoElement) && !e.target.closest('input,textarea,[contenteditable],button')) { e.preventDefault(); this.a.paused ? this.a.play() : this.a.pause(); } });
  },
};
// keyboard: Enter / Space on a play button or a check box inside a board card (a pointer tap goes through Board's own handler)
document.addEventListener('click', e => { if (e.detail) return; const c = e.target.closest?.('.bcard'), b = e.target.closest?.('[data-rich]'); if (c && b && Rich.tap(c, b)) e.preventDefault(); });
document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest?.('.r-chart [data-rich="bar"]'); if (b) Rich.chartTip(b, +b.dataset.k); }); // 106d: hover shows a bar's value

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
// 130b: labels the AI saw in a picture (kedi, mavi, siyah-beyaz): short, lowercase, no '#', at most 6, never a copy of a user tag
const cleanVtags = a => [...new Set(a.map(t => String(t).toLocaleLowerCase('tr').replace(/^#/, '').trim().replace(/\s+/g, '-')).filter(t => t && t.length <= 24))].slice(0, 6);
const tagCol = t => { let h = 0; for (const ch of t.toLocaleLowerCase('tr')) h = (h * 31 + ch.codePointAt(0)) >>> 0; return `var(--c-${TAG_COLS[h % TAG_COLS.length]})`; };
function tagChip(t) {
  const k = t.toLocaleLowerCase('tr'), icn = (TAG_ICONS.find(([re]) => re.test(k)) || [, 'hash'])[1];
  return `<span class="tg" style="--tc:${tagCol(t)}" dir="auto">${ic(icn, 'sm')}${esc(t)}</span>`;
}
function metaHtml(i, { tags = 2, acts = false, day = false, due = true } = {}) {
  const rel = relatedOf(i).filter(x => x.group !== i.group).length;
  return `<div class="meta"><span>${day ? fmtDay(dayKey(i.ts)) + ' ' : ''}${fmtTime(i.ts)}</span>
    ${i.type === 'link' ? `<span>${esc(domain(i.url))}</span>${i.dead ? `<span class="m-dead" title="Bu link artık açılmıyor">açılmıyor</span>` : ''}` : ''}
    ${i.type === 'file' && i.size ? `<span>${fmtSize(i.size)}</span>` : ''}
    ${i.starred ? ic('star', 'sm fill star-on') : ''}
    ${i.prio === 'high' ? `<span class="m-prio">${ic('flag', 'sm')}Yüksek</span>` : ''}
    ${i.todo && due ? (() => { const d = dueInfo(i.todo.due); return `<span class="m-todo ${i.todo.done ? 'done' : i.todo.doing ? 'doing' : d?.cls || ''}">${ic('todo', 'sm')}${i.todo.done ? 'Bitti' : i.todo.doing ? 'Yapılıyor' : d ? d.label : 'Görev'}</span>`; })() : ''}
    ${rel ? `<span class="rel">${ic('rel', 'sm')}${rel}</span>` : ''}
    ${(i.tags || []).slice(0, tags).map(tagChip).join('')}
    ${(i.tags || []).length > tags ? `<span class="tg more" title="${i.tags.length - tags} etiket daha">+${i.tags.length - tags}</span>` : ''}
    ${i.pending && S.bridgeOk ? `<span class="pend">${ic('spark', 'sm')}düzenleniyor</span>` : ''}${acts ? actsHtml(i) : ''}</div>`;
}
// 162: a photo row shows the photo big enough to read (its own shape, 112 px wide, 96 on a phone; sharp like the board's, 159)
const listPic = i => { const r = BoardPic.ratio(i); return thumbBox(i, 'thumb lpic').replace('class="thumb lpic"', `class="thumb lpic" style="--ar:${(r ? Math.max(.6, Math.min(2, r)) : 4 / 3).toFixed(3)}"`); };
function itemRow(i, { acts = true } = {}) {
  const sub = snipHtml(i, 300);
  return `<div class="item${S.hits?.has(i.id) && !findMode() ? ' hit' : ''}${now() - (i.createdAt || 0) < 4000 ? ' new' : ''}${markCls(i)}" data-id="${i.id}" tabindex="0">
    ${BoardPic.isPic(i) && hasVisual(i) ? listPic(i) : leadOf(i)}
    <div class="body">
      <div class="title">${hl(titleOf(i))}</div>
      ${sub ? `<div class="sub" dir="auto">${sub}</div>` : ''}
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
    // 157a: while "… ve öncesi" shows, the "Tarihe git" pill sits INSIDE that sticky strip (it used to float over its corner)
    const head = S.listFrom ? `<div class="l-from">${ic('clock', 'sm')}<span class="l-from-t">${fromLabel(S.listFrom)} ve öncesi</span><button class="link-btn" data-lnow>En yeniye dön</button>${topBtns('in-from')}</div>` : topBtns();
    el.innerHTML = Folders.head() + head + Folders.html(items) + otdHtml() + rows(shown, '', null) + more();
  }
  el._shown = shown.length; el._items = items; el._start = start;
  hookThumbs(el);
  const m = $('#more');
  if (m) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); S.limit += 300; render(); } }, { rootMargin: '600px' }).observe(m);
}
const topBtns = (cls = '', pre = '') => `<div class="l-top ${cls}">${pre}${Saved.active() ? `<button class="l-jump" data-lpin title="Bu aramayı/filtreyi sol çubuğa sabitle">${ic('pin', 'sm')}<span>Sabitle</span></button>` : ''}<button class="l-jump" data-ljump title="Tarihe git" aria-label="Tarihe git">${ic('clock', 'sm')}<span>Tarihe git</span></button></div>`;
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
  p.innerHTML = '<div class="ddial"></div>' + Heat.html(visible()) + [...years].map(([y, ms]) => `<div class="side-label">${y}</div><div class="jm">${M.map((l, n) => { const k = `${y}-${String(n + 1).padStart(2, '0')}`, c = by.get(k); return `<button class="jm-b${c ? '' : ' none'}" ${c ? `data-month="${k}"` : 'disabled'} title="${c ? c + ' kayıt' : ''}">${l}${c ? `<small>${c}</small>` : ''}</button>`; }).join('')}</div>`).join('') || '<p class="hint">Kayıt yok.</p>';
  p.hidden = false; DateDial.mount(p.querySelector('.ddial'), k => { p.hidden = true; showFrom(dayEnd(k)); }); // 123-2: the date dial on top
  const hs = p.querySelector('.heat-scroll'); if (hs) hs.scrollLeft = Heat.year === new Date().getFullYear() ? hs.scrollWidth : 0;
  const r = anchor.getBoundingClientRect(); p.style.top = r.bottom + 6 + 'px'; p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.right - p.offsetWidth)) + 'px';
}
const galleryMedia = items => { const from = S.listFrom ? Math.max(0, items.findIndex(i => i.ts <= S.listFrom)) : 0;
  return items.filter(i => i.type === 'file' || (i.type === 'link' && i.meta?.image)).slice(0, from + S.limit).filter(i => !S.listFrom || i.ts <= S.listFrom).slice(0, S.limit); };
const listShown = items => { const from = Math.max(0, S.listFrom ? items.findIndex(i => i.ts <= S.listFrom) : 0); return items.slice(from, from + S.limit); };
function renderGallery(items) { // month headers stick to the top while scrolling; "Tarihe git" jumps
  const el = $('#gallery'), media = galleryMedia(items);
  let last = '', html = '';
  for (const i of media) {
    const m = dayKey(i.ts).slice(0, 7);
    if (m !== last) { const [y, mo] = m.split('-').map(Number); html += `${last ? '<i class="g-fill"></i>' : ''}<div class="g-month">${new Date(y, mo - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</div>`; last = m; }
    const t = titleOf(i); // 99a: picture only; the name shows on hover / focus (and is the tile's label for screen readers)
    html += `<div class="tile${S.hits?.has(i.id) && !findMode() ? ' hit' : ''}${Sel.ids.has(i.id) ? ' sel' : ''}${markCls(i)}" data-id="${i.id}" tabindex="0" style="--ar:${GAR.fit(GAR.get(i.id)).toFixed(3)}" aria-label="${esc(t)}">
    ${thumbBox(i)}<div class="tile-cap" aria-hidden="true"><div class="t">${esc(t)}</div><div class="s">${KIND_LABEL[fileKind(i)]} · ${fmtDay(dayKey(i.ts))}</div></div></div>`;
  }
  if (last) html += '<i class="g-fill"></i>'; // the last row of a month keeps its height instead of stretching across
  // 158a: with the "… ve öncesi" strip, Seç / Tarihe git sit inside it (both are sticky at the same top: the buttons peeked out from behind it)
  const selB = `<button class="l-jump" data-selmode aria-pressed="${Sel.mode}" title="Birden çok seç (uzun bas, Ctrl+tık ya da boş yerde sürükle)">${ic('check', 'sm')}<span>Seç</span></button>`;
  el.innerHTML = Folders.head() + (media.length ? (S.listFrom ? `<div class="l-from g-from">${ic('clock', 'sm')}<span class="l-from-t">${fromLabel(S.listFrom)} ve öncesi</span><button class="link-btn" data-lnow>En yeniye dön</button>${topBtns('in-from', selB)}</div>` : topBtns('g-jump', selB)) + Folders.html(media) + html
    : filtered() ? emptyHtml('filter', 'Bu süzgeçte görsel yok', 'Resim, PDF, video ya da görseli olan link bu süzgeçte yok.', unfilterBtn()) : emptyHtml('grid', 'Galeri boş', 'Resimler, PDF\'ler, videolar ve görseli olan linkler burada görünür.'));
  hookThumbs(el);
  Peek.dock(); // no tiles → no docked "hover a card" panel Sel.paint();
}
// 99b: calendar view — a month grid (the year heatmap, large): each day shows how many items it holds, its tint follows that count,
// and up to 3 small pictures (else 2 titles). A day opens the list at that day. ‹ › / swipe / PageUp-PageDown change the month,
// the arrow keys walk the days (crossing into the next month), Home = today. Follows the filters and the search like the other views.
// 157c (feedback-35): zoom layers — Ay (the month grid) → Yıl (12 small months, days tinted by how much they hold) → Yıllar (one row per
// year, 12 month squares). Out: the title, the Ay/Yıl/Yıllar switch, "−", Ctrl+wheel or a pinch; in: a month/year, "+", Enter, the
// same gestures over it. The new layer grows out of (or back into) the place it came from (FLIP, 200 ms). Shift+PageUp/PageDown = a year.
const Cal = {
  WD: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  Z: ['Ay', 'Yıl', 'Yıllar'],
  MS: Array.from({ length: 12 }, (_, k) => new Date(2000, k, 1).toLocaleDateString('tr-TR', { month: 'short' })),
  ML: Array.from({ length: 12 }, (_, k) => new Date(2000, k, 1).toLocaleDateString('tr-TR', { month: 'long' })),
  month() { return S.calMonth || (S.calMonth = dayKey(now()).slice(0, 7)); },
  zoom() { return S.calZoom || 0; },
  key() { return this.month() + '|' + this.zoom(); }, // render's cache key
  go(m, focusDay) { S.calMonth = m; this._focus = focusDay || null; this._kb = !!document.activeElement?.closest?.('#cal'); render(); renderNow(); },
  step(n) { const [y, mo] = this.month().split('-').map(Number), d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; },
  // counts per day and per month, one pass over the items, kept while the list is the same (10k items: a few ms, once)
  counts(items) {
    if (this._cn?.items === items) return this._cn;
    const day = new Map(), mon = new Map(); let lo = Infinity, hi = -Infinity;
    for (const i of items) if (i.type !== 'draw' && i.ts === +i.ts) { if (i.ts < lo) lo = i.ts; if (i.ts > hi) hi = i.ts; }
    const add = k => { day.set(k, (day.get(k) || 0) + 1); const m = k.slice(0, 7); mon.set(m, (mon.get(m) || 0) + 1); };
    if (hi - lo < 80 * 365 * 864e5) { // no Date per item: the local day starts of the whole span once, then each item finds its day by index (DST-safe ±1)
      const d0 = new Date(lo), st = [], ks = [], cnt = [];
      for (let k = 0, t; (t = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + k)).getTime() <= hi; k++) { st.push(t.getTime()); ks.push(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`); cnt.push(0); }
      const base = st[0], L = st.length;
      for (const i of items) { if (i.type === 'draw' || i.ts !== +i.ts) continue; let k = Math.min(L - 1, Math.max(0, Math.floor((i.ts - base) / 864e5)));
        while (k + 1 < L && st[k + 1] <= i.ts) k++; while (k > 0 && st[k] > i.ts) k--; cnt[k]++; }
      for (let k = 0; k < L; k++) if (cnt[k]) { day.set(ks[k], cnt[k]); const m = ks[k].slice(0, 7); mon.set(m, (mon.get(m) || 0) + cnt[k]); }
    } else for (const i of items) if (i.type !== 'draw' && i.ts === +i.ts) add(dayKey(i.ts));
    const ys = [...mon.keys()].map(m => +m.slice(0, 4));
    return this._cn = { items, day, mon, y0: ys.length ? Math.min(...ys) : Infinity, y1: ys.length ? Math.max(...ys) : -Infinity };
  },
  lvl: (n, max) => !n ? 0 : Math.min(4, 1 + Math.floor(3 * Math.log(n) / Math.log(max + 1) + .0001)), // log scale: one busy day doesn't wash out the rest
  head(title, sum, nav, up) {
    const z = this.zoom();
    return `<div class="c-head"><h2 class="c-title">${up ? `<button class="c-up" data-cz="${z + 1}" title="Uzaklaş (−)" aria-label="${esc(title)} — uzaklaş">${esc(title)}</button>` : esc(title)}</h2><span class="c-sum">${sum}</span>
      <span class="c-nav"><span class="c-zoom" role="group" aria-label="Yakınlık">${this.Z.map((n, k) => `<button class="c-z" data-cz="${k}" aria-pressed="${k === z}">${n}</button>`).join('')}</span>${nav}</span></div>`;
  },
  navBtns(unit, isNow) {
    const keys = unit === 'ay' ? ['PageUp', 'PageDown'] : ['Shift+PageUp', 'Shift+PageDown'];
    return `<button class="c-btn" data-cgo="-1" aria-label="Önceki ${unit}" title="Önceki ${unit} (${keys[0]})">${ic('chev', 'sm')}</button>${isNow ? '' : '<button class="c-btn c-today" data-cgo="0">Bugün</button>'}<button class="c-btn" data-cgo="1" aria-label="Sonraki ${unit}" title="Sonraki ${unit} (${keys[1]})">${ic('chev', 'sm')}</button>`;
  },
  render(items) {
    const el = $('#cal'), z = this.zoom();
    el.dataset.z = z;
    if (z === 2) this.renderYears(el, items); else if (z === 1) this.renderYear(el, items); else this.renderMonth(el, items);
    const want = this._focus; this._focus = null;
    const sel = z ? '[data-cmo]' : '[data-cday]', tgt = (want && el.querySelector(`[data-cday="${want}"],[data-cmo="${want}"]`)) || el.querySelector(sel + '.today,' + sel + '.cur') || el.querySelector(sel);
    if (tgt) tgt.tabIndex = 0;
    if (want && this._kb) tgt?.focus({ preventScroll: true }); this._kb = false; // the keys keep walking after a month change
    if (!this.wired) this.wire(el);
    if (!z) hookThumbs(el);
    this.fly();
  },
  renderMonth(el, items) {
    const m = this.month(), [y, mo] = m.split('-').map(Number), first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
    const lo = first.getTime(), hi = new Date(y, mo, 1).getTime(), by = new Map(); let total = 0;
    for (const i of items) { if (i.ts < lo || i.ts >= hi || i.type === 'draw') continue; const k = dayKey(i.ts); (by.get(k) || by.set(k, []).get(k)).push(i); total++; }
    const max = Math.max(1, ...[...by.values()].map(a => a.length)), today = dayKey(now()), lead = (first.getDay() + 6) % 7;
    let cells = '';
    for (let k = 0; k < lead; k++) cells += '<span class="c-day out" aria-hidden="true"></span>';
    for (let d = 1; d <= days; d++) {
      const key = `${m}-${String(d).padStart(2, '0')}`, its = by.get(key) || [], n = its.length, media = its.filter(i => i.type === 'file' && ['image', 'video', 'pdf'].includes(fileKind(i)) || (i.type === 'link' && i.meta?.image)).slice(0, 3);
      const body = media.length ? `<span class="c-th">${media.map(i => thumbBox(i, 'thumb c-pic')).join('')}</span>`
        : n ? `<span class="c-tt">${its.slice(0, 2).map(i => `<span dir="auto">${esc(titleOf(i))}</span>`).join('')}</span>` : '';
      const lbl = `${F_DLW.format(new Date(y, mo - 1, d))}: ${n ? n + ' kayıt' : 'kayıt yok'}`;
      cells += `<button class="c-day l${this.lvl(n, max)}${key === today ? ' today' : ''}${key > today ? ' fut' : ''}" data-cday="${key}" tabindex="-1" aria-label="${esc(lbl)}"${n ? '' : ' aria-disabled="true"'}>
        <span class="c-n">${d}</span>${n ? `<span class="c-c">${n}</span>` : ''}${body}</button>`;
    }
    const tail = (7 - (lead + days) % 7) % 7; for (let k = 0; k < tail; k++) cells += '<span class="c-day out" aria-hidden="true"></span>';
    const name = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    el.innerHTML = this.head(name, total ? total + ' kayıt' : 'Bu ayda kayıt yok', this.navBtns('ay', m === today.slice(0, 7)), true) + `
      <div class="c-wd" aria-hidden="true">${this.WD.map(w => `<span>${w}</span>`).join('')}</div>
      <div class="c-grid c-body" role="grid" aria-label="${esc(name)}">${cells}</div>`;
  },
  renderYear(el, items) {
    const { day, mon } = this.counts(items), y = +this.month().slice(0, 4), today = dayKey(now()), tm = today.slice(0, 7), cur = this.month();
    let dmax = 1, total = 0; for (let k = 1; k <= 12; k++) { const m = `${y}-${String(k).padStart(2, '0')}`; total += mon.get(m) || 0; }
    for (const [k, n] of day) if (k.startsWith(y + '-') && n > dmax) dmax = n;
    let out = '';
    for (let k = 0; k < 12; k++) {
      const m = `${y}-${String(k + 1).padStart(2, '0')}`, n = mon.get(m) || 0, lead = (new Date(y, k, 1).getDay() + 6) % 7, dn = new Date(y, k + 1, 0).getDate();
      let g = '<i class="o"></i>'.repeat(lead);
      for (let d = 1; d <= dn; d++) { const dk = `${m}-${String(d).padStart(2, '0')}`; g += `<i class="l${this.lvl(day.get(dk) || 0, dmax)}${dk === today ? ' t' : ''}"></i>`; }
      out += `<button class="c-mo${m === tm ? ' today' : ''}${m === cur ? ' cur' : ''}${m > tm ? ' fut' : ''}" data-cmo="${m}" tabindex="-1" aria-label="${esc(`${this.ML[k]} ${y}: ${n ? n + ' kayıt' : 'kayıt yok'}`)}">
        <span class="c-mh"><b>${this.ML[k]}</b>${n ? `<span class="c-c">${n}</span>` : ''}</span><span class="c-mg" aria-hidden="true">${g}</span></button>`;
    }
    el.innerHTML = this.head(String(y), total ? total + ' kayıt' : 'Bu yılda kayıt yok', this.navBtns('yıl', y === +tm.slice(0, 4)), true) + `
      <div class="c-year c-body" role="grid" aria-label="${y}">${out}</div>`;
  },
  renderYears(el, items) {
    const { mon, y0, y1 } = this.counts(items), tm = dayKey(now()).slice(0, 7), ty = +tm.slice(0, 4), cur = this.month();
    const hiY = Math.max(ty, y1 > -Infinity ? y1 : ty, +cur.slice(0, 4)), loY = Math.min(y0 < Infinity ? y0 : ty, +cur.slice(0, 4)); // only the years that hold items (and this one)
    let mmax = 1, total = 0; for (const n of mon.values()) { if (n > mmax) mmax = n; total += n; }
    let rows = '';
    for (let y = hiY; y >= loY; y--) { // the newest year on top: going back in time = going down
      let yn = 0, ms = '';
      for (let k = 0; k < 12; k++) { const m = `${y}-${String(k + 1).padStart(2, '0')}`, n = mon.get(m) || 0; yn += n;
        ms += `<button class="c-m l${this.lvl(n, mmax)}${m === tm ? ' today' : ''}${m === cur ? ' cur' : ''}${m > tm ? ' fut' : ''}" data-cmo="${m}" tabindex="-1" aria-label="${esc(`${this.ML[k]} ${y}: ${n ? n + ' kayıt' : 'kayıt yok'}`)}"><span>${this.MS[k]}</span>${n ? `<b>${n}</b>` : ''}</button>`; }
      rows += `<div class="c-yrow" role="row"><button class="c-yl${y === ty ? ' today' : ''}" data-cyear="${y}" aria-label="${y}: ${yn ? yn + ' kayıt' : 'kayıt yok'} — yıla yakınlaş"><b>${y}</b><small>${yn || '–'}</small></button><div class="c-ms">${ms}</div></div>`;
    }
    el.innerHTML = this.head('Yıllar', total ? `${total} kayıt · ${hiY - loY + 1} yıl` : 'Kayıt yok', '', false) + `
      <div class="c-years c-body" role="grid" aria-label="Yıllar">${rows}</div>`;
  },
  // change the layer; from = the element it was asked on (a month square, a year) so the new layer grows out of it / shrinks back into it
  setZoom(z, m, from) {
    z = Math.max(0, Math.min(2, z)); if (z === this.zoom() && (!m || m === this.month())) return;
    const r = from?.getBoundingClientRect?.(), dir = z < this.zoom() ? 'in' : 'out';
    this._fly = { dir, r, m: m || this.month() };
    S.calZoom = z; if (m) S.calMonth = m;
    this._focus = z ? (m || this.month()) : null; this._kb = !!document.activeElement?.closest?.('#cal');
    render(); renderNow(); scrollTo(0, 0);
  },
  fly() {
    const f = this._fly; this._fly = null; const b = $('#cal .c-body'); if (!f || !b || reduced()) return;
    const B = b.getBoundingClientRect(); if (!B.width) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    if (f.dir === 'in' && f.r?.width) { // the small square becomes the whole grid
      const sx = f.r.width / B.width, sy = f.r.height / B.height;
      b.style.transformOrigin = '0 0';
      b.animate([{ transform: `translate(${f.r.left - B.left}px,${f.r.top - B.top}px) scale(${sx},${sy})`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: ease })
        .finished.then(() => { b.style.transformOrigin = ''; }, () => { });
      return;
    }
    // out: the grid we left shrinks into its place on the new layer (the month/year it was)
    const t = b.querySelector(`[data-cmo="${f.m}"]`) || b.querySelector(`[data-cyear="${f.m.slice(0, 4)}"]`), T = t?.getBoundingClientRect();
    const ox = T ? T.left + T.width / 2 - B.left : B.width / 2, oy = T ? T.top + T.height / 2 - B.top : B.height / 2;
    b.style.transformOrigin = `${ox}px ${oy}px`;
    b.animate([{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: ease })
      .finished.then(() => { b.style.transformOrigin = ''; }, () => { });
    t?.animate([{ boxShadow: '0 0 0 3px var(--accent)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 700, delay: 150, easing: 'ease-out' });
  },
  // one zoom step at a point: in → the month / year under it (else the current one), out → one layer up
  zoomAt(dir, x, y) {
    const z = this.zoom();
    if (dir < 0) return z < 2 && this.setZoom(z + 1);
    if (!z) return;
    const h = document.elementFromPoint(x, y)?.closest?.('#cal [data-cmo], #cal [data-cyear]');
    if (h?.dataset.cyear) return this.setZoom(1, `${h.dataset.cyear}${this.month().slice(4)}`, h);
    if (h) return this.setZoom(z === 2 ? 1 : 0, h.dataset.cmo, z === 2 ? h.closest('.c-yrow') : h);
    this.setZoom(z - 1, null, $(`#cal [data-cmo="${this.month()}"]`));
  },
  clampDay: (m, d) => `${m}-${String(Math.min(d, new Date(+m.slice(0, 4), +m.slice(5), 0).getDate())).padStart(2, '0')}`,
  open(key) { const [y, mo, d] = key.split('-').map(Number); S.listFrom = new Date(y, mo - 1, d + 1).getTime() - 1; S.limit = 300; setView('list'); scrollTo(0, 0); },
  key2(e) { // keys that work anywhere in the calendar (and when nothing has focus): layers and years
    const z = this.zoom();
    if (e.shiftKey && (e.key === 'PageUp' || e.key === 'PageDown')) { e.preventDefault(); const nm = this.step(e.key === 'PageUp' ? -12 : 12), c = e.target.closest?.('[data-cday]');
      return this.go(nm, c ? this.clampDay(nm, +c.dataset.cday.slice(8)) : z ? nm : null); }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); return this.setZoom(z + 1); }
    if ((e.key === '+' || e.key === '=') && z) { e.preventDefault(); const t = e.target.closest?.('[data-cmo]') || $(`#cal [data-cmo="${this.month()}"]`);
      return this.setZoom(z - 1, t?.dataset.cmo, z === 2 ? t?.closest('.c-yrow') : t); }
    return false;
  },
  wire(el) {
    this.wired = true;
    el.addEventListener('click', e => {
      const zb = e.target.closest('[data-cz]'); if (zb) { const k = +zb.dataset.cz; return this.setZoom(k, null, k < this.zoom() ? $(`#cal [data-cmo="${this.month()}"]`) : null); }
      const g = e.target.closest('[data-cgo]'); if (g) { const n = +g.dataset.cgo, u = this.zoom() ? 12 : 1; this.go(n ? this.step(n * u) : dayKey(now()).slice(0, 7), this.zoom() && !n ? dayKey(now()).slice(0, 7) : null); return; }
      const yb = e.target.closest('[data-cyear]'); if (yb) return this.setZoom(1, `${yb.dataset.cyear}${this.month().slice(4)}`, yb.closest('.c-yrow'));
      const mb = e.target.closest('[data-cmo]'); if (mb) return this.setZoom(this.zoom() === 2 ? 1 : 0, mb.dataset.cmo, this.zoom() === 2 ? mb.closest('.c-yrow') : mb);
      const c = e.target.closest('[data-cday]'); if (c && c.getAttribute('aria-disabled') !== 'true') this.open(c.dataset.cday);
    });
    document.addEventListener('keydown', e => { // nothing focused (body) and the calendar is on: the layer keys still work
      if (S.view !== 'cal' || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || document.activeElement !== document.body || document.querySelector('dialog[open], .modal:not([hidden])')) return;
      this.key2(e);
    });
    el.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (this.key2(e) !== false) return;
      const z = this.zoom();
      if (z) { // year / years: arrows walk the months, Enter goes in, PageUp/PageDown a year
        const c = e.target.closest('[data-cmo]'); if (!c) return;
        if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); const nm = this.step(e.key === 'PageUp' ? -12 : 12); return this.go(nm, nm); }
        if (e.key === 'Home') { e.preventDefault(); const t = dayKey(now()).slice(0, 7); return this.go(t, t); }
        const cols = z === 2 ? -12 : getComputedStyle(c.parentElement).gridTemplateColumns.split(' ').length; // years: the newest row on top
        const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key]; if (!mv) return; e.preventDefault();
        const [y, mo] = c.dataset.cmo.split('-').map(Number), d = new Date(y, mo - 1 + mv, 1), k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, nx = el.querySelector(`[data-cmo="${k}"]`);
        if (nx) { c.tabIndex = -1; nx.tabIndex = 0; nx.focus(); S.calMonth = k; } else if (z === 1) this.go(k, k);
        return;
      }
      const c = e.target.closest('[data-cday]'); if (!c) return;
      const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); const [, , d] = c.dataset.cday.split('-').map(Number), nm = this.step(e.key === 'PageUp' ? -1 : 1), [y, mo] = nm.split('-').map(Number);
        return this.go(nm, `${nm}-${String(Math.min(d, new Date(y, mo, 0).getDate())).padStart(2, '0')}`); }
      if (e.key === 'Home') { e.preventDefault(); return this.go(dayKey(now()).slice(0, 7), dayKey(now())); }
      if (!mv) return; e.preventDefault();
      const [y, mo, d] = c.dataset.cday.split('-').map(Number), k = dayKey(new Date(y, mo - 1, d + mv).getTime()), nx = el.querySelector(`[data-cday="${k}"]`);
      if (nx) { c.tabIndex = -1; nx.tabIndex = 0; nx.focus(); } else this.go(k.slice(0, 7), k);
    });
    // Ctrl+wheel (a trackpad pinch arrives as this too): one layer per gesture
    let acc = 0, last = 0;
    el.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); const t = performance.now(); if (t - last > 250) acc = 0; last = t; acc += e.deltaY;
      if (Math.abs(acc) > 40 && t - (this._zt || 0) > 350) { this._zt = t; this.zoomAt(acc > 0 ? -1 : 1, e.clientX, e.clientY); acc = 0; } }, { passive: false });
    // phone: two-finger pinch = a layer, one-finger sideways swipe = the next / previous month (year on the Yıl layer)
    const pts = new Map(); let pinch = null, sx = null, sy = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: dist(), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; sx = null; } else if (pts.size === 1) { sx = e.clientX; sy = e.clientY; } });
    el.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { const r = dist() / pinch.d; if (r < .72 || r > 1.4) { this._swiped = Date.now(); const p = pinch; pinch = null; this.zoomAt(r < 1 ? -1 : 1, p.x, p.y); } } });
    const up = e => { if (!pts.delete(e.pointerId)) return; if (pts.size < 2 && pinch) { pinch = null; this._swiped = Date.now(); }
      if (sx == null || e.type !== 'pointerup') { sx = null; return; } const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (this.zoom() < 2 && Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) { this._swiped = Date.now(); this.slide(dx < 0 ? 1 : -1); } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', e => { if (Date.now() - (this._swiped || 0) < 400) { e.stopPropagation(); e.preventDefault(); } }, true); // a swipe / pinch is not a tap
  },
  slide(n) { this.go(this.step(n * (this.zoom() ? 12 : 1))); const g2 = $('#cal .c-body'); if (!g2 || reduced()) return;
    g2.animate([{ transform: `translateX(${n * 24}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); },
};
// 131: automatic folders at the top of the list and the gallery ("5000 things = 5000 scrolls" → ~20-40 folders). Virtual: an item is
// never moved and can sit in several folders. Made without AI from what items already carry: tag, project, WhatsApp chat, bookmarks,
// site, kind, year. Styles A Cep · B Yığın · C Albüm · D Dosya (default, glass front: 131-1) · E Ayraç, picked in Settings.
const Folders = {
  STYLES: [['D', 'Dosya (cam)'], ['E', 'Ayraç'], ['A', 'Cep'], ['B', 'Yığın'], ['C', 'Albüm']],
  COLS: ['#c2410c', '#4f5fd6', '#15803d', '#c2255c', '#0b6bcb', '#7c3aed', '#b45309', '#0f766e'],
  KINDS: { image: 'Resimler', video: 'Videolar', pdf: "PDF'ler", audio: 'Sesler' },
  cfg() { return (S.settings ||= {}).folders ||= {}; },
  style() { const s = this.cfg().style; return this.STYLES.some(x => x[0] === s) ? s : 'D'; },
  host: i => i.type === 'link' && i.url ? (/^https?:\/\/(?:www\.|m\.)?([^/:?#]+)/i.exec(i.url)?.[1] || '').toLowerCase() : '',
  test(i, k) {
    const c = k.indexOf(':'), t = k.slice(0, c), v = k.slice(c + 1);
    if (t === 'tag') return (i.tags || []).includes(v);
    if (t === 'proj') return i.project === v;
    if (t === 'src') return srcMatch(i, v);
    if (t === 'site') return this.host(i) === v;
    if (t === 'kind') return fileKind(i) === v;
    if (t === 'year') return new Date(i.ts).getFullYear() === +v;
    if (t === 'ai') return AIF.has(v, i.id); // 131b
    return false;
  },
  label(k) {
    const n = this.cfg().names?.[k]; if (n) return n;
    const c = k.indexOf(':'), t = k.slice(0, c), v = k.slice(c + 1);
    return t === 'ai' ? AIF.label(v) : t === 'tag' ? '#' + v : t === 'src' ? (v.startsWith('wa:') ? (v.slice(3) || 'WhatsApp') + ' · WhatsApp' : srcName(v)) : t === 'kind' ? this.KINDS[v] || v : v;
  },
  color(k) {
    const t = k.slice(0, k.indexOf(':'));
    if (t === 'src') return k.startsWith('src:wa:') ? '#15803d' : '#b45309';
    if (t === 'site') return '#6e7781'; if (t === 'year') return '#0b6bcb'; if (t === 'kind') return '#7c3aed';
    let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) | 0; return this.COLS[Math.abs(h) % this.COLS.length];
  },
  // the strip is for browsing everything: a filter, a search, "from date" or an open folder hide it
  shown: () => !S.folder && !filtered() && !(S.searchOn && S.q.trim()) && !S.listFrom,
  _c: null,
  build(items) { // one pass over the items; same list → same folders (render runs often)
    const cf = this.cfg(), key = JSON.stringify([cf.pin, cf.hide, cf.names, cf.ai]) + (AIF.on() ? AIF.ver : '-');
    if (this._c?.items === items && this._c.key === key) return this._c.out;
    const m = new Map(), add = (k, i) => { let f = m.get(k); if (!f) m.set(k, f = { k, n: 0, top: [], kinds: {} }); f.n++; if (f.top.length < 3) f.top.push(i); const fk = fileKind(i); f.kinds[fk] = (f.kinds[fk] || 0) + 1; };
    const years = new Set(), ai = AIF.on();
    for (const i of items) {
      for (const t of i.tags || []) add('tag:' + t, i);
      if (i.project) add('proj:' + i.project, i);
      if (i.source === 'whatsapp') add('src:wa:' + (i.chat || ''), i); else if (i.source === 'bookmarks') add('src:bookmarks', i);
      const h = this.host(i); if (h) add('site:' + h, i);
      const fk = fileKind(i); if (this.KINDS[fk]) add('kind:' + fk, i);
      const y = new Date(i.ts).getFullYear(); years.add(y); add('year:' + y, i);
      if (ai) for (const c of AIF.of(i.id)) add('ai:' + c, i);
    }
    const hide = new Set(cf.hide || []), pin = cf.pin || [], min = { tag: 3, proj: 2, src: 3, site: 4, kind: 5, year: 5, ai: 4 }, rank = k => ({ kind: 1, year: 2 })[k.slice(0, k.indexOf(':'))] || 0;
    const out = [...m.values()].filter(f => { const t = f.k.slice(0, f.k.indexOf(':'));
      return !hide.has(f.k) && f.n >= min[t] && f.n < items.length && (t !== 'year' || years.size > 1); })
      .sort((a, b) => (pin.includes(b.k) - pin.includes(a.k)) || rank(a.k) - rank(b.k) || b.n - a.n).slice(0, 40); // what you made (tag, project, chat, site) before kind and year
    this._c = { items, key, out }; return out;
  },
  meta(f) { // "13 resim · 2 not"
    const L = { image: 'resim', video: 'video', pdf: 'PDF', audio: 'ses', link: 'bağlantı', note: 'not', text: 'metin', file: 'dosya' };
    return Object.entries(f.kinds).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => n + ' ' + (L[k] || k)).join(' · ');
  },
  // 131-1 (feedback-25): never an empty grey picture box. Until (or unless) the real picture comes, the item shows what it really is:
  // the site's icon or a small mark in the kind's colour + its title; a note shows its first line and the words under it.
  fav(i) { const k = fileKind(i), h = this.host(i);
    return `<em class="${i.type}-c">${linkFav(i)}${i.type === 'link' ? esc(([...h][0] || '·').toUpperCase()) : ic(k === 'text' ? 'note' : k, 'sm')}</em>`; },
  mini(i) { // a small item that peeks out of the folder: the real picture, else a little paper note / link card
    const t0 = titleOf(i), t = esc(i.type === 'file' && t0 === i.fileName && noiseName(i.fileName) ? KIND_LABEL[fileKind(i)] + ' · ' + shortDay(dayKey(i.ts)) : t0); // a camera name says nothing
    if (hasVisual(i)) return `<div class="f-it img" data-tid="${i.id}" dir="auto"><span class="f-fb">${this.fav(i)}<b>${t}</b></span></div>`;
    if (i.type === 'link') return `<div class="f-it link" dir="auto">${this.fav(i)}<b>${t}</b><small>${esc(this.host(i))}</small></div>`;
    const ls = i.type === 'note' && i.text && !i.sticky ? i.text.split('\n').filter(l => l.trim() && !/^```|^\|?\s*:?-{2,}|^(-{3,}|\*{3,})$/.test(l.trim())).map(Ed.plain) : [],
      rest = (i.userTitle ? ls : ls.slice(1)).join(' ').replace(/\s+/g, ' ').trim();
    return `<div class="f-it note" dir="auto"><b>${t}</b>${rest ? `<p>${esc(rest.slice(0, 120))}</p>` : ''}</div>`;
  },
  card(f, st) {
    const name = esc(this.label(f.k)), meta = this.meta(f), c = this.color(f.k), top = f.top, fill = n => Array.from({ length: n }, (_, k) => top[k % top.length]);
    const aim = f.k.startsWith('ai:') ? `<span class="f-ai" title="Anlamca gruplandı">${ic('spark', 'sm')}</span>` : ''; // 131b
    // 131-1: a plain count ("122 kayıt"); the kind mix stays in the hint
    const cnt = `<div class="f-cnt" title="${esc(meta)}"><b>${f.n}</b> kayıt</div>`, cap = `<div class="f-name" dir="auto">${aim}${name}</div>${cnt}`, pin = (this.cfg().pin || []).includes(f.k) ? ` <span class="f-pin">${ic('pin', 'sm')}</span>` : '';
    const a = `class="fold f${st.toLowerCase()}" data-fold="${esc(f.k)}" style="--c:${c}" aria-label="${name}, ${f.n} kayıt"`;
    if (st === 'A') return `<button ${a}><div class="f-back"></div><div class="f-pk">${top.map(i => this.mini(i)).join('')}</div><div class="f-front">${cap}</div></button>`;
    if (st === 'B') return `<button ${a}><div class="f-st">${top.slice().reverse().map(i => this.mini(i)).join('')}</div><div class="f-cap">${cap}</div></button>`;
    if (st === 'C') { const tiles = fill(3).map((i, k) => k === 2 && f.n > 3 ? this.mini(i).replace('class="f-it', 'class="f-it more').replace(/<\/div>$/, `<span>+${f.n - 2}</span></div>`) : this.mini(i));
      return `<button ${a}><div class="f-mos">${tiles.join('')}</div><div class="f-cap"><span class="f-ic"></span><div>${cap}</div></div></button>`; }
    if (st === 'D') return `<button ${a}><div class="f-ico"><div class="f-bk"></div><div class="f-pk">${top.slice(0, 3).map(i => this.mini(i)).join('')}</div><div class="f-fr"><span>${esc([...this.label(f.k).replace(/^#/, '')][0] || '·')}</span></div></div>${cap}</button>`;
    return `<button ${a}><div class="f-tab" dir="auto">${aim}${name}${pin}</div><div class="f-pg"></div><div class="f-pg"></div><div class="f-body"><div class="f-row">${fill(3).map(i => this.mini(i)).join('')}</div>${cnt}</div></button>`;
  },
  html(items) {
    if (!this.shown() || items.length < 24) return '';
    const all = this.build(items); if (all.length < 2) return '';
    const st = this.style(), cap = innerWidth < 600 ? 4 : innerWidth < 1100 ? 6 : 8, list = S.foldAll ? all : all.slice(0, cap);
    return `<section class="folders fs-${st}" aria-label="Klasörler"><div class="f-top"><h2>Klasörler</h2><span class="n">${all.length}</span><span class="sp"></span>${Sem.on() ? '' : `<button class="link-btn f-aion" data-faion title="${esc(Sem.say())}" aria-label="Anlamca grupla">${ic('spark', 'sm')}<span>Anlamca grupla</span></button>`}${all.length > cap ? `<button class="link-btn" data-foldall>${S.foldAll ? 'Daha az' : `Tümü (${all.length})`}</button>` : ''}</div>`
      + `<div class="f-grid">${list.map(f => this.card(f, st)).join('')}</div></section>`;
  },
  head() { // inside a folder: back, name, count, pin / rename / hide
    if (!inFolder()) return '';
    const k = S.folder, pinned = (this.cfg().pin || []).includes(k), n = visible().length;
    return `<div class="f-head" style="--c:${this.color(k)}"><button class="icon-btn" data-fback title="Klasörlerden çık (Esc)" aria-label="Klasörlerden çık">${ic('chev')}</button>`
      + `<span class="f-ic"></span><div class="f-t"><b dir="auto">${esc(this.label(k))}</b><small>${n} kayıt${k.startsWith('ai:') ? ' · anlamca gruplandı' : ''}</small></div><span class="sp"></span>`
      + (k.startsWith('ai:') ? `<button class="icon-btn" data-fmerge aria-haspopup="menu" title="Başka bir anlam klasörünü buraya kat" aria-label="Birleştir">${ic('layers', 'sm')}</button>` : '')
      + `<button class="icon-btn${pinned ? ' on' : ''}" data-fpin aria-pressed="${pinned}" title="${pinned ? 'Sabitlemeyi kaldır' : 'Başa sabitle'}" aria-label="Başa sabitle">${ic('pin', 'sm')}</button>`
      + `<button class="icon-btn" data-fname title="Yeniden adlandır" aria-label="Yeniden adlandır">${ic('pen', 'sm')}</button>`
      + `<button class="icon-btn" data-fhide title="Bu klasörü gizle" aria-label="Bu klasörü gizle">${ic('eye', 'sm')}</button></div>`;
  },
  open(k, el) {
    const r = el?.getBoundingClientRect();
    S.folder = k; S.limit = 300; history.pushState({ nts: 'folder' }, ''); scrollTo(0, 0); render();
    const box = $('#' + (S.view === 'gallery' ? 'gallery' : 'list'));
    if (r && box && !reduced()) { const b = box.getBoundingClientRect(); // 102: the folder grows into the page
      box.animate([{ transformOrigin: `${r.left + r.width / 2 - b.left}px ${r.top + r.height / 2 - b.top}px`, transform: `scale(${Math.max(.3, r.width / b.width)})`, opacity: 0 }, { transformOrigin: `${r.left + r.width / 2 - b.left}px ${r.top + r.height / 2 - b.top}px`, transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' }); }
    $('.f-head [data-fback]')?.focus({ preventScroll: true });
  },
  close(fromPop) {
    if (!S.folder) return; const k = S.folder; S.folder = null;
    if (!fromPop && history.state?.nts === 'folder') { Back._skip = true; history.back(); }
    render(); const c = document.querySelector(`[data-fold="${CSS.escape(k)}"]`); c?.focus({ preventScroll: true }); c?.scrollIntoView({ block: 'nearest' });
  },
  async set(fn) { fn(this.cfg()); this._c = null; await saveSettings(); render(); },
  click(e) { // true = handled
    const t = e.target;
    const f = t.closest('[data-fold]'); if (f) { this.open(f.dataset.fold, f); return true; }
    if (t.closest('[data-foldall]')) { S.foldAll = !S.foldAll; render(); return true; }
    if (t.closest('[data-faion]')) { Sem.enable(); toast('Anlam modeli iniyor (bir kez). Hazır olunca klasörler burada anlamca da gruplanır.', 5000, 'spark'); render(); return true; }
    const fm = t.closest('[data-fmerge]'); if (fm) { AIF.mergePop(fm); return true; }
    if (t.closest('[data-fback]')) { this.close(); return true; }
    const k = S.folder; if (!k) return false;
    if (t.closest('[data-fpin]')) { this.set(c => { const p = c.pin ||= []; const at = p.indexOf(k); at < 0 ? p.unshift(k) : p.splice(at, 1); }); return true; }
    if (t.closest('[data-fhide]')) { this.set(c => (c.hide ||= []).push(k)); this.close(); toast('Klasör gizlendi', 6000, 'eye', { label: 'Geri al', fn: () => this.set(c => c.hide = (c.hide || []).filter(x => x !== k)) }); return true; }
    if (t.closest('[data-fname]')) { const b = $('.f-head .f-t b'); if (!b) return true;
      const inp = document.createElement('input'); inp.className = 'f-rename'; inp.value = this.label(k); inp.setAttribute('aria-label', 'Klasör adı'); b.replaceWith(inp); inp.focus(); inp.select();
      const done = ok => { inp.onblur = null; const v = inp.value.trim(); if (ok && v && v !== this.label(k)) this.set(c => (c.names ||= {})[k] = v); else render(); };
      inp.onkeydown = ev => { if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') { ev.stopPropagation(); done(false); } }; inp.onblur = () => done(true); return true; }
    return false;
  },
  init() {
    addEventListener('popstate', () => { if (S.folder && history.state?.nts !== 'folder') this.close(true); });
    document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !S.folder || e.defaultPrevented || document.querySelector('dialog[open]') || e.target.closest?.('input,textarea,[contenteditable="true"]')) return; this.close(); });
  },
};
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

const VIEWS = [['board', 'board', 'Pano'], ['list', 'list', 'Liste'], ['gallery', 'grid', 'Galeri'], ['cal', 'cal', 'Takvim']];
// 147: every count the rail and the side lists show, in one pass over the items, kept until the items change (a view change
// counted 10k items ~15 times: 100–300 ms on a phone). Unseen / reading-list counts depend on the time: a new pass each minute.
function chromeCounts(live) {
  const key = [S.items, live.length, Math.floor(now() / 6e4)], c0 = chromeCounts.c;
  if (c0 && key.every((x, k) => x === c0.key[k])) return c0;
  const c = { key, grp: new Map(), todos: 0, lists: new Map(), unseen: 0, stars: 0, read: 0, projs: new Map(), tags: new Map(), vtags: new Set(), colors: new Set(), trash: 0, clean: 0 };
  const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const i of live) {
    inc(c.grp, groupOf(i));
    if (i.todo && !i.todo.done) c.todos++;
    for (const l of i.lists || []) inc(c.lists, l);
    if (unseen(i)) c.unseen++;
    if (i.starred) c.stars++;
    if (Read.readable(i) && (i.again ? i.again <= now() : !i.seenAt) && (i.type !== 'link' || i.read)) c.read++;
    if (i.project) inc(c.projs, i.project);
    for (const t of i.tags || []) inc(c.tags, t);
    for (const t of i.vtags || []) c.vtags.add(t);
    if (i.color) c.colors.add(i.color);
    if (Clean.of(i)) c.clean++;
  }
  for (const i of S.items) if (i.deleted && !i.purged && i.deletedAt) c.trash++;
  return chromeCounts.c = c;
}
function renderChrome() {
  const f = S.filter, live = alive(), C = chromeCounts(live), cnt = t => C.grp.get(t) || 0;
  const types = [['all', 'inbox', 'Tümü', live.length], ['link', 'link', 'Linkler', cnt('link')], ['note', 'note', 'Notlar', cnt('note')],
    ['photo', 'image', 'Fotoğraflar', cnt('photo')], ['file', 'file', 'Dosyalar', cnt('file')]];
  const typeOn = t => S.view !== 'todo' && f.type === t && !f.star && !f.list && !(t === 'all' && f.tag);
  const todos = C.todos;
  const lists = LISTS.filter(([k]) => !listHidden(k)).map(([k, icn]) => [k, icn, listName(k), k === 'unseen' ? C.unseen : k.startsWith('p:') ? C.projs.get(k.slice(2)) || 0 : C.lists.get(k) || 0]);
  const nUnseen = C.unseen; if (nUnseen || f.list === 'unseen') lists.push(['unseen', 'clock', listName('unseen'), nUnseen]);
  const listOn = k => S.view !== 'todo' && f.list === k;
  $('#viewSwitch').innerHTML = VIEWS.map(([v, icn, l]) => `<button class="${S.view === v ? 'on' : ''}" data-view="${v}" title="${l}">${ic(icn, 'sm')}<span>${l}</span></button>`).join('');
  $('#filterLbl').textContent = S.view === 'todo' ? 'Yapılacaklar' : f.src ? srcName(f.src) : f.list ? listName(f.list) : f.tag ? '#' + f.tag : f.star ? 'Yıldızlı' : types.find(t => t[0] === f.type)[2];
  fitHud();
  const stars = C.stars;
  // the rail stays short: the 5 kinds, starred, to-dos; lists, vault, colours and topics live under "Daha fazla"
  const board = S.view === 'board' && alive().length;
  $('#rail').innerHTML = `<button class="r-fold" data-fold data-tip="Kenar çubuğunu gizle ( [ )" aria-label="Kenar çubuğunu gizle">${ic('chev', 'sm')}</button>`
    + types.map(([t, icn, l, n]) => `<button class="${typeOn(t) ? 'on' : ''}" data-type="${t}" data-tip="${l} · ${n}" aria-label="${l}">${ic(icn)}</button>`).join('')
    + `<hr><button class="${f.star && S.view !== 'todo' ? 'on' : ''}" data-star data-tip="Yıldızlı · ${stars}" aria-label="Yıldızlı">${ic('star')}</button>`
    + `<button class="${S.view === 'todo' ? 'on' : ''}" data-todo data-tip="Yapılacaklar · ${todos}" aria-label="Yapılacaklar">${ic('todo')}${todos ? `<span class="cnt">${todos}</span>` : ''}</button>`
    + Saved.list().slice(0, 4).map(v => `<button class="${Saved.same(v) ? 'on' : ''}" data-saved="${v.id}" data-tip="${esc(v.name)}" aria-label="Kayıtlı arama: ${esc(v.name)}"><span class="sv-ab">${esc([...v.name.replace(/^[#\s]+/, '')].slice(0, 2).join(''))}</span></button>`).join('')
    + `<button data-tags data-tip="Daha fazla: listeler, kaynak, konular, şifrelerim" aria-label="Daha fazla">${ic('dots')}</button>`
    + (board ? palTab() : '');
  // 137: a filter picked under ⋯ shows on the rail at once, as its own button; a tap takes it off
  const act = activeFilters(), was = renderChrome.act || new Set(); renderChrome.act = new Set(act.map(a => a.k + a.v));
  if (act.length) $('#rail [data-tags]').insertAdjacentHTML('afterend', act.map(a => `<button class="r-act${was.has(a.k + a.v) ? '' : ' new'}" data-unf="${a.k}" data-tip="${esc(a.l)} · kaldır" aria-label="${esc(a.l)} süzgecini kaldır">${a.k === 'color' ? `<span class="cdot c-${a.v}"></span>` : ic(a.i, 'sm')}<span class="r-x">${ic('x', 'sm')}</span></button>`).join(''));
  $('#railTab').innerHTML = `<button data-fold data-tip="${act.length ? 'Süzgeç açık: ' + esc(act.map(a => a.l).join(', ')) + ' · ' : ''}Kenar çubuğunu aç ( [ )" aria-label="Kenar çubuğunu aç">${ic('chev', 'sm')}${act.length ? '<span class="rt-dot"></span>' : ''}</button>`; // 88b: only >, where < was; the palette stays
  $('#filterBtn').classList.toggle('on', S.view !== 'todo' && (act.length > 0 || f.type !== 'all' || f.star));
  const nTrash = C.trash, nRead = C.read;
  $('#popLists').innerHTML = `<button class="side-row" data-clean>${ic('inbox')}<span class="lbl">Gelen kutusunu temizle</span><span class="n">${C.clean || ''}</span></button><button class="side-row" data-tidy>${ic('spark')}<span class="lbl">Toparla</span><span class="n">${Tidy.n || ''}</span></button>` + `<button class="side-row" data-readq>${ic('book')}<span class="lbl">Okuma listesi</span><span class="n">${nRead || ''}</span></button>` + lists.map(([k, icn, l, n]) => `<button class="side-row${listOn(k) ? ' on' : ''}" data-list="${k}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row" data-trash>${ic('trash')}<span class="lbl">Çöp kutusu</span><span class="n">${nTrash || ''}</span></button><button class="side-row" data-vault>${ic('lock')}<span class="lbl">Şifrelerim</span><span class="n"></span></button>${typeof Priv !== 'undefined' ? Priv.row() : ''}`;
  $('#popTypes').innerHTML = types.map(([t, icn, l, n]) => `<button class="side-row${typeOn(t) ? ' on' : ''}" data-type="${t}">${ic(icn)}<span class="lbl">${l}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row${f.star ? ' on' : ''}" data-star>${ic('star')}<span class="lbl">Yıldızlı</span><span class="n">${stars || ''}</span></button>`
    + `<button class="side-row${S.view === 'todo' ? ' on' : ''}" data-todo>${ic('todo')}<span class="lbl">Yapılacaklar</span><span class="n">${todos || ''}</span></button>`
    + lists.map(([k, icn, l, n]) => `<button class="side-row${listOn(k) ? ' on' : ''}" data-list="${k}">${ic(icn)}<span class="lbl">${esc(l)}</span><span class="n">${n || ''}</span></button>`).join('')
    + `<button class="side-row" data-clean>${ic('inbox')}<span class="lbl">Gelen kutusunu temizle</span><span class="n">${C.clean || ''}</span></button><button class="side-row" data-tidy>${ic('spark')}<span class="lbl">Toparla</span><span class="n">${Tidy.n || ''}</span></button><button class="side-row" data-readq>${ic('book')}<span class="lbl">Okuma listesi</span><span class="n">${nRead || ''}</span></button><button class="side-row" data-trash>${ic('trash')}<span class="lbl">Çöp kutusu</span><span class="n">${nTrash || ''}</span></button><button class="side-row" data-vault>${ic('lock')}<span class="lbl">Şifrelerim</span><span class="n"></span></button>${typeof Priv !== 'undefined' ? Priv.row() : ''}`;
  const sv = Saved.rows(); $('#popSaved').innerHTML = sv; $('#savedLabel').hidden = !sv;
  const sr = srcRows(live, f.src); $('#popSrc').innerHTML = sr; $('#srcLabel').hidden = !sr;
  const projs = C.projs;
  $('#projLabel').hidden = !projs.size;
  $('#sideProjects').innerHTML = [...projs].sort((a, b) => b[1] - a[1]).map(([p, n]) => `<button class="side-row${f.list === 'p:' + p ? ' on' : ''}" data-list="p:${esc(p)}">${ic('folder', 'sm')}<span class="lbl">${esc(p)}</span><span class="n">${n || ''}</span></button>`).join('');
  const counts = C.tags;
  const all = [...counts].sort((a, b) => b[1] - a[1]), tags = S.allTags ? all : all.slice(0, 10);
  const seen = C.vtags; // 130b
  if (f.tag && !tags.some(([t]) => t === f.tag)) tags.push([f.tag, counts.get(f.tag) || 0]);
  const used = C.colors;
  $('#sideMarks').innerHTML = `<div class="mark-dots">${COLORS.filter(([c]) => used.has(c) || f.color === c).map(([c, n]) => `<button class="cdot c-${c}${f.color === c ? ' on' : ''}" data-color="${c}" title="${n}" aria-label="${n}"></button>`).join('') || '<span class="hint">Kayıtlara renk verince burada çıkar.</span>'}</div>
    <button class="side-row${S.sortPrio ? ' on' : ''}" data-sortprio>${ic('flag')}<span class="lbl">Önce yüksek öncelik</span><span class="n">${S.sortPrio ? ic('check', 'sm') : ''}</span></button>`;
  TagArc.sync(all, f.tag); // 123-1
  $('#sideTags').innerHTML = tags.map(([t, n]) => `<button class="side-row${f.tag === t ? ' on' : ''}" data-tag="${esc(t)}"><span class="hash">${ic('hash', 'sm')}</span><span class="lbl">${esc(t)}</span><span class="n">${n || ''}</span></button>`).join('')
    + (all.length > 10 ? `<button class="side-row" data-alltags><span class="hash">${ic('chev', 'sm')}</span><span class="lbl">${S.allTags ? 'Daha az göster' : `Tümünü göster (${all.length})`}</span></button>` : '')
    || '<div class="hint" style="padding:0 10px 8px">' + aiName() + ' düzenledikçe konular burada çıkar.</div>';
  if (seen.size) $('#sideTags').insertAdjacentHTML('beforeend', `<div class="side-row vt-count" title="${aiName()} resimlere bakıp bulduğu etiketler; aramada bunlar da bulunur"><span class="hash">${ic('spark', 'sm')}</span><span class="lbl">Resimlerde bulunan etiketler</span><span class="n">${seen.size}</span></div>`);
}
const palTab = () => `<button class="pal-tab${S.palOpen ? ' on' : ''}" data-paltab data-tip="${S.palOpen ? 'Çizim araçlarını kapat' : 'Çizim araçları'}" aria-label="Çizim araçları" aria-expanded="${!!S.palOpen}">${ic('pen', 'sm')}</button>`;
// 147b2: only the view changed between list / board / gallery: the rail, side lists and counts are the same → just move the "on"
// mark and add / take away the board's pen tab (rebuilding all of it cost 30–300 ms a switch at 10k items on a phone)
function chromeView() {
  for (const b of $('#viewSwitch').children) b.classList.toggle('on', b.dataset.view === S.view);
  const pt = $('#rail .pal-tab'), want = S.view === 'board';
  if (want && !pt) $('#rail').insertAdjacentHTML('beforeend', palTab()); else if (!want && pt) pt.remove();
}
// 137: filters that live under ⋯ (not the rail's own buttons): source, project / list, topic, colour
function activeFilters() {
  const f = S.filter, out = []; if (S.view === 'todo') return out;
  if (f.src) out.push({ k: 'src', v: f.src, i: f.src.startsWith('wa:') ? 'chat' : { pc: 'cpu', web: 'link', phone: 'share', bookmarks: 'book' }[f.src] || (NtsMigrate.NAMES[f.src] ? Mig.icon(f.src) : 'inbox'), l: srcName(f.src) });
  if (f.list) out.push({ k: 'list', v: f.list, i: f.list.startsWith('p:') ? 'folder' : (LISTS.find(l => l[0] === f.list) || [0, f.list === 'unseen' ? 'clock' : 'flag'])[1], l: listName(f.list) });
  if (f.tag) out.push({ k: 'tag', v: f.tag, i: 'hash', l: '#' + f.tag });
  if (f.color) out.push({ k: 'color', v: f.color, l: (COLORS.find(c => c[0] === f.color) || [0, f.color])[1] });
  return out;
}
// 106c: small line drawings for empty states (the app's own stroke icons grown up: grey lines, one accent stroke, no fill colour)
const EMPTY_ART = {
  inbox: '<rect x="20" y="44" width="80" height="34" rx="7"/><path d="M20 58h22l5 8h26l5-8h22"/><rect x="40" y="10" width="40" height="40" rx="5" fill="var(--bg)"/><path d="M48 21h24M48 29h18M48 37h12"/><path d="M60 50v12m-5-5 5 5 5-5" class="a"/>',
  search: '<rect x="22" y="22" width="56" height="50" rx="6"/><path d="M32 36h36M32 46h28M32 56h18"/><rect x="58" y="12" width="40" height="46" rx="6" fill="var(--bg)"/><path d="M66 26h24M66 35h16"/><circle cx="84" cy="64" r="9" fill="var(--bg)" class="a"/><path d="M91 71l7 7" class="a"/>',
  filter: '<rect x="18" y="30" width="50" height="44" rx="6"/><path d="M27 43h32M27 52h24M27 61h14"/><path d="M56 12h46l-17 21v17l-12 7V33z" fill="var(--bg)" class="a"/>',
  grid: '<rect x="18" y="12" width="38" height="30" rx="5"/><rect x="64" y="12" width="38" height="30" rx="5"/><rect x="18" y="50" width="38" height="30" rx="5"/><rect x="64" y="50" width="38" height="30" rx="5" stroke-dasharray="4 4"/><path d="M24 36l9-10 7 7 4-4 7 7"/><circle cx="90" cy="22" r="4" class="a"/><path d="M70 36l9-9 7 6 4-4 7 7"/>',
  hash: '<path d="M30 14h40l14 14-30 30-24-24z" transform="translate(0 6)"/><circle cx="42" cy="32" r="3"/><path d="M56 40h40l14 14-30 30-24-24z" transform="translate(-14 -8)" fill="var(--bg)"/><path d="M62 50l-3 18M72 50l-3 18M56 56h20M55 63h20" class="a"/>',
  todo: '<rect x="28" y="10" width="64" height="72" rx="7"/><rect x="38" y="24" width="10" height="10" rx="3"/><path d="M40 29l2 2 4-4" class="a"/><path d="M54 29h28"/><rect x="38" y="42" width="10" height="10" rx="3"/><path d="M54 47h22"/><rect x="38" y="60" width="10" height="10" rx="3" stroke-dasharray="3 3"/><path d="M54 65h16" stroke-dasharray="3 3"/>',
};
function emptyHtml(icn, h, p, actions = '') {
  const art = EMPTY_ART[icn] ? `<svg class="e-art" viewBox="0 0 120 90" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EMPTY_ART[icn]}</svg>` : `<div class="e-ico">${ic(icn, 'lg')}</div>`;
  return `<div class="empty">${art}<h3>${h}</h3><p>${p}</p>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
}
const filtered = () => { const f = S.filter; return f.type !== 'all' || f.star || !!(f.list || f.tag || f.color || f.src || inFolder()); };
const inFolder = () => !!S.folder && (S.view === 'list' || S.view === 'gallery'); // 131: a folder holds in the list and the gallery, not on the board
// 150: a board with no card on screen says why, instead of a blank dotted plane: no cards on it / hidden by a filter / not in this
// time range / all out of view → one small card with the way out (Genel'e dön, Süzgeci kaldır, Tümü, Hepsini gör)
const BoardHint = {
  el() {
    let e = $('#boardHint'); if (e) return e;
    e = document.createElement('div'); e.id = 'boardHint'; e.className = 'board-hint'; e.hidden = true; e.setAttribute('role', 'status'); $('main').appendChild(e);
    e.addEventListener('click', ev => { const b = ev.target.closest('[data-bh]'); if (!b) return; const a = b.dataset.bh;
      if (a === 'main') return Board.go('main');
      if (a === 'unfilter') { if (S.folder) Folders.close(); Object.assign(S.filter, { type: 'all', tag: null, star: false, list: null, color: null, src: null }); S.cam = null; return render(); }
      if (a === 'all') return Range.set('all');
      if (a === 'arch') return Range.setArch(true);
      if (a === 'fit') Board.fit(); });
    return e;
  },
  why() { // what the board would hold with no filter, and why it shows nothing
    const mine = alive().filter(i => !i.parent && onBoard(i)), name = onMain() ? 'Genel' : S.board, F = S.filter;
    const btn = (a, icn, l, sec) => `<button class="btn${sec ? ' secondary' : ''}" data-bh="${a}">${ic(icn, 'sm')}${l}</button>`;
    const back = onMain() ? '' : btn('main', 'board', "Genel'e dön", false);
    if (Board.M?.size) return { k: 'out', t: 'Kartlar görüş alanının dışında', p: `${Board.M.size} kart var, şu an ekranda değil.`, a: btn('fit', 'fit', 'Hepsini gör', true) };
    if (!mine.length) return { k: 'none', t: `“${esc(name)}” panosunda kart yok`, p: onMain() ? 'Kutuya yaz ya da bir dosya bırak: kart buraya gelir.' : `Kaydı aç → <b>Panolar</b> → “${esc(name)}”, ya da listede seç → <b>Panoya koy</b>.`, a: back };
    const f = filtered() ? mine.filter(i => (F.type === 'all' || groupOf(i) === F.type) && (!F.tag || (i.tags || []).includes(F.tag)) && (!F.star || i.starred) && (!F.list || inList(i, F.list)) && (!F.color || i.color === F.color) && (!F.src || srcMatch(i, F.src))).length : mine.length;
    if (f < mine.length) return { k: 'filter', t: `${mine.length - f} kart süzgeçte gizli`, p: `“${esc(name)}” panosunda ${mine.length} kart var; seçili süzgeç hepsini saklıyor.`, a: btn('unfilter', 'x', 'Süzgeci kaldır', true) + back };
    // 153: what the range / the archive switch hides, with the way out
    const ar = onMain() && !Range.arch() ? mine.filter(i => i.archive && !i.pos && !i.onBoard).length : 0;
    if (Range.get() !== 'all' || ar) return { k: 'range', t: `${mine.length.toLocaleString('tr')} kayıt ${Range.get() !== 'all' ? 'bu aralığın dışında' : 'arşivde'}`, p: `${esc(rangeLabel())} içinde kart yok${ar ? ` · ${ar.toLocaleString('tr')} tanesi arşivden (WhatsApp, yer imleri)` : ''}. Boş yere sağ tıkla (telefonda basılı tut) ve aralığı seç.`,
      a: (Range.get() !== 'all' ? btn('all', 'clock', 'Tümünü göster', true) : '') + (ar ? btn('arch', 'inbox', 'Arşivi de göster', Range.get() !== 'all') : '') + back };
    return { k: 'none', t: `“${esc(name)}” panosunda kart yok`, p: '', a: back };
  },
  update() {
    const e = $('#boardHint') || (S.view === 'board' ? this.el() : null); if (!e) return;
    const on = S.view === 'board' && !$('#board').hidden && !$('#board').classList.contains('months') && !(Board.mounted?.size) && !OnBoard.el?.isConnected;
    if (!on) { if (!e.hidden) e.hidden = true; return; }
    const w = this.why(), key = w.k + w.t + w.a; e.dataset.k = w.k;
    if (e._key !== key) { e._key = key; e.innerHTML = `<div class="bh-ic">${ic(w.k === 'filter' ? 'eye' : w.k === 'out' ? 'fit' : w.k === 'range' ? 'clock' : 'board', 'sm')}</div><div class="bh-t"><b>${w.t}</b>${w.p ? `<span>${w.p}</span>` : ''}</div>${w.a ? `<div class="bh-a">${w.a}</div>` : ''}`; }
    e.hidden = false;
  },
};
const unfilterBtn = () => `<button class="btn secondary" data-do="unfilter">${ic('x', 'sm')}Süzgeci kaldır</button>`;

let renderQueued = false;
// 157d: a project board shows only the items tied to the project (i.project / i.boards). Items that name it (a #tag, the title, the text,
// the address, the chat) but were never put there are offered by a chip under the board picker: "N ilgili kayıt" → a list, add one or all
// (Geri al). An added item goes to i.boards, never i.project, so another project is never touched. With the meaning search on, the
// items close in meaning to the project's name come too (✦). Worked out once per (items, board), after the board is drawn.
const Rel = {
  key: null, list: [], sem: null, semKey: null,
  fit: s => norm(s).replace(/[\s._#-]+/g, ''),
  calc() {
    const name = S.board, k = norm(name).trim(), kj = this.fit(name);
    if (kj.length < 3) return [];
    const out = [];
    for (const i of S.items) {
      if (i.deleted || hid(i) || i.sticky || i.parent || inBoard(i)) continue;
      let why = (i.tags || []).some(t => this.fit(t) === kj) ? 'tag' : '';
      if (!why) { const h = S.idx.get(i.id)?.h ?? norm(rawText(i));
        if (h.includes(k) || (h.includes(kj.slice(0, 4)) && h.replace(/[\s._#-]+/g, '').includes(kj))) why = this.fit(titleOf(i)).includes(kj) ? 'title' : 'text'; }
      if (why) out.push({ i, why });
    }
    const r = { tag: 0, title: 1, text: 2 };
    return out.sort((a, b) => r[a.why] - r[b.why] || b.i.ts - a.i.ts);
  },
  // the meaning search (sem.js) asked with the board's name; its own number so a search running in the box keeps its answer
  askSem(name) {
    if (!Sem.w || Sem.st !== 'ready' || this.semKey === name) return;
    this.semKey = name; const n = -(Sem._rn = (Sem._rn || 0) + 1);
    (Sem._lk ||= new Map()).set(n, list => { if (S.board !== name) return; this.sem = (list || []).filter(x => x[1] >= SEM_NEXT).slice(0, SEM_MAX).map(x => x[0]); this.key = null; this.update(); });
    Sem.w.postMessage({ t: 'query', n, q: name, k: 40 });
  },
  items() {
    if (onMain() || S.view !== 'board') return [];
    const key = S.items.length + '|' + S.board + '|' + (this.sem || []).join(',');
    if (this.key !== key || this._of !== S.items) {
      this.key = key; this._of = S.items; this.list = this.calc();
      const have = new Set(this.list.map(x => x.i.id));
      for (const id of this.sem || []) { const i = byId(id); if (i && !have.has(id) && !i.deleted && !hid(i) && !i.parent && !inBoard(i)) this.list.push({ i, why: 'sem' }); }
    }
    return this.list;
  },
  shut: () => { try { return +localStorage.getItem('hn-relx-' + bfold(S.board)) || 0; } catch { return 0; } },
  update() {
    const c = $('#relChip'); if (!c) return;
    if (this._b !== S.board) { this._b = S.board; this.sem = null; this.semKey = null; this.key = null; this.close(); }
    const on = S.view === 'board' && !onMain() && document.body.classList.contains('board-view');
    if (!on) { c.hidden = true; this.close(); return; }
    clearTimeout(this._t); // counted when the board is still; 10k items ~10–30 ms
    this._t = setTimeout(() => {
      this.askSem(S.board);
      const n = this.items().length, shown = n > 0 && n > this.shut();
      c.hidden = !shown; if (!shown) { this.close(); return; }
      c.querySelector('.rc-n').textContent = innerWidth < 380 ? `${n} ilgili` : `${n} ilgili kayıt`; // 320 px: the board tools share the row
      c.querySelector('.rc-go').ariaLabel = `Bu projeyle ilgili ${n} kayıt daha var: göster`;
      if (!$('#relPop').hidden) this.paint();
    }, 120);
  },
  WHY: { tag: ['hash', 'etiket'], title: ['note', 'başlıkta'], text: ['search', 'içinde geçiyor'], sem: ['spark', 'anlamca yakın'] },
  paint() {
    const p = $('#relPop'), l = this.items(), max = 60;
    p.innerHTML = `<div class="rp-top"><div><b>${esc(S.board)}</b> ile ilgili</div><div class="rp-sub">${l.length} kayıt bu panoda değil. Eklenen kayıt başka projeden çıkmaz.</div></div>
      <div class="rp-list">${l.slice(0, max).map(({ i, why }) => `<div class="rp-row" data-id="${esc(i.id)}"><button class="rp-open" data-ropen title="Aç"><span class="b-ico ${i.type}-c">${linkFav(i)}${ic(i.conv ? 'chat' : fileKind(i) === 'text' ? 'note' : fileKind(i), 'sm')}</span><span class="rp-t" dir="auto">${esc(titleOf(i).slice(0, 90))}</span><span class="rp-why">${ic(this.WHY[why][0], 'sm')}${this.WHY[why][1]} · ${shortDay(dayKey(i.ts))}</span></button><button class="rp-add" data-radd aria-label="Panoya ekle" title="Panoya ekle">${ic('plus', 'sm')}</button></div>`).join('')}</div>
      <div class="rp-foot">${l.length > max ? `<span class="rp-more">İlk ${max} gösteriliyor</span>` : ''}<button class="btn primary rp-all" data-rall>${ic('plus', 'sm')}Hepsini ekle (${l.length})</button></div>`;
  },
  open() {
    const p = $('#relPop'), c = $('#relChip'); this.paint(); p.hidden = false; c.querySelector('.rc-go').setAttribute('aria-expanded', 'true');
    const r = c.getBoundingClientRect(); // desktop: under the chip; phone: the chip sits low, so the list opens above it
    if (innerWidth >= 900) { p.style.top = (r.bottom + 8) + 'px'; p.style.bottom = ''; p.style.left = r.left + 'px'; }
    else { p.style.top = 'auto'; p.style.bottom = (innerHeight - r.top + 8) + 'px'; p.style.left = ''; }
  },
  close() { const p = $('#relPop'); if (p && !p.hidden) { p.hidden = true; $('#relChip .rc-go')?.setAttribute('aria-expanded', 'false'); } },
  async add(list) {
    const name = S.board, before = new Map(list.map(i => [i.id, i.boards]));
    await upsert(list.map(i => ({ ...i, boards: [...new Set([...(i.boards || []), name])] })));
    toast(list.length === 1 ? `“${titleOf(list[0]).slice(0, 40)}” panoya kondu` : `${list.length} kayıt “${name}” panosuna kondu`, 5000, 'board', { label: 'Geri al', fn: async () => {
      await upsert([...before.keys()].map(byId).filter(Boolean).map(i => ({ ...i, boards: before.get(i.id) || [] })));
    } });
  },
  init() {
    const c = $('#relChip'), p = $('#relPop');
    c.addEventListener('click', e => {
      if (e.target.closest('.rc-x')) { try { localStorage.setItem('hn-relx-' + bfold(S.board), String(this.items().length)); } catch { } c.hidden = true; this.close(); toast('Gizlendi. Yeni ilgili kayıt gelirse yine görünür.', 2600, 'check'); return; }
      p.hidden ? this.open() : this.close();
    });
    p.addEventListener('click', async e => {
      const row = e.target.closest('.rp-row'), i = row && byId(row.dataset.id);
      if (e.target.closest('[data-radd]') && i) { row.classList.add('gone'); await this.add([i]); return; }
      if (e.target.closest('[data-ropen]') && i) { openItem(i.id); return; }
      if (e.target.closest('[data-rall]')) { const l = this.items().map(x => x.i); this.close(); if (l.length) await this.add(l); }
    });
    document.addEventListener('pointerdown', e => { if (!p.hidden && !e.target.closest('#relPop,#relChip')) this.close(); }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden && !document.querySelector('dialog[open]')) { e.stopPropagation(); this.close(); c.querySelector('.rc-go').focus(); } }, true);
  },
};
function render(force) {
  if (force) { S._vkey = S._lkey = null; chromeCounts.c = null; }
  if (renderQueued) return; renderQueued = true;
  requestAnimationFrame(renderNow);
}
// the frame's drawing; also called right away when a view transition needs the new view now (130c: no frame runs inside its update)
function renderNow() {
    if (!renderQueued) return; renderQueued = false;
    // typing only changes the dropdown: views and chrome redraw when data, filters, a real search or the view change
    const live = findMode(); // 103b: in Ara mode typing filters the page with classes (Live), the views are not redrawn
    const vkey = [S.items, JSON.stringify(S.filter), S.sortPrio, live ? 'L' : S.searchOn, live ? 'L' : S.searchOn && S.hits, S.limit, S.view + (S.listFrom || '') + (S.view === 'board' ? Range.get() + Range.arch() : '') + (S.board || '') + (S.view === 'cal' ? Cal.key() : ''), S.bridgeOk, S.palOpen, aiKey(), S.allTags, JSON.stringify(S.settings?.lists || {}), S.folder + '|' + S.foldAll + '|' + AIF.ver + '|' + JSON.stringify(S.settings?.folders || {})];
    const pv = S._vview, viewOnly = !!S._vkey && pv !== S.view && pv !== 'todo' && S.view !== 'todo' && vkey.every((x, k) => k === 6 || x === S._vkey[k]); S._vview = S.view;
    const same = !!S._vkey && vkey.every((x, k) => x === S._vkey[k]), onlyMore = !!S._vkey && S.view === 'list' && vkey[5] > S._vkey[5] && vkey.every((x, k) => k === 5 || x === S._vkey[k]); S._vkey = vkey;
    if (Sem.w && Sem._of !== S.items) { Sem._of = S.items; Sem.sync(); } // 104f: changed items get new meaning numbers
    renderHits();
    if (same && S.view !== 'todo') {
      if (!live) return;
      // 104g: with a big archive the page under the result window follows once the typing rests (280 ms), not on every key:
      // filtering / redrawing hundreds of rows costs 50–300 ms a key at 10k items, the result window alone ~10–40 ms
      const later = () => { clearTimeout(S._lqT); S._lqT = setTimeout(() => { S._lqNow = true; render(); }, 280); };
      if (!S._lqNow && S.items.length > 2000) return later();
      if (LiveQ.apply()) { S._lqNow = false; return; }
      // rows the search needs aren't on the page: the rows there are filtered now, the page is drawn when the typing rests
      if (!S._lqNow) { LiveQ.apply(true); return later(); }
    }
    S._lqNow = false; clearTimeout(S._lqT);
    const items = visible(), none = !alive().length;
    const fv = S.view === 'todo' ? 'todo' : S.view === 'gallery' ? 'gallery' : S.view === 'list' ? 'list' : null; // 102: same view redrawn → FLIP
    const fr = fv && S._fv === fv && !onlyMore && $('#' + fv), fb = fr && Flip.snap(fr); S._fv = fv;
    if (viewOnly && !none) chromeView(); else if (!same) renderChrome(); // 104g: a live search that only needs other rows drawn doesn't change the rail / side lists
    for (const v of ['list', 'board', 'gallery', 'topics', 'todo', 'cal']) $('#' + v).hidden = (none && v !== 'todo') || S.view !== v;
    document.body.classList.toggle('board-view', S.view === 'board' && !none);
    { const bp = $('#boardBtn'), on = S.view === 'board' && !none; bp.tabIndex = on ? 0 : -1; const pp = $('#boardPop'); if (!on && pp) pp.hidden = true; bp.setAttribute('aria-expanded', String(!!pp && !pp.hidden)); } // 146: a redraw keeps the open list's state (the tip checks it) // 116: outside the board the logo is just the logo
    document.body.classList.toggle('gallery-view', S.view === 'gallery' && !none); Peek.dock();
    $('#boardTools').hidden = none || S.view !== 'board';
    if (S.view !== 'board' || none) BoardHint.update();
    $('#pal').hidden = none || S.view !== 'board' || !S.palOpen; // desktop: slides out of the rail; phone: opens from the pen button (98)
    Rail.place();
    $('#empty').hidden = !none || S.view === 'todo';
    if (S.view === 'todo') Todo.render();
    else if (none) $('#empty').innerHTML = emptyHtml('inbox', 'Kendine not at', 'WhatsApp\'ta kendine attığın gibi: kutuya yaz ya da link, resim, dosya yapıştır. Kutunun solunda üç mod var: <b>Not</b> kaydeder, <b>Ara</b> yazdıkça bulur, <b>Sor</b> ' + aiTo() + ' sorar (<b>Tab</b> ile değişir).',
      `<button class="btn primary" data-do="sample">${ic('spark', 'sm')}Örnek verilerle dene</button><button class="btn secondary" data-do="wa">${ic('chat', 'sm')}WhatsApp'tan içe aktar</button><button class="btn secondary" data-do="settings">${ic('settings', 'sm')}Ayarlar</button>`);
    // 147b: back to the list from another view with nothing else changed → the rows drawn last time are still right (10k items, phone: ~0.3 s saved)
    else if (S.view === 'list' && !live && !onlyMore && S._lkey && vkey.every((x, k) => x === S._lkey[k]) && $('#list').firstElementChild) { }
    else if (S.view === 'list') items.length ? renderList(items, onlyMore) : ($('#list').innerHTML = live ? emptyHtml('search', 'Bulunamadı', 'Başka bir kelime dene ya da <b>Tab</b> ile ' + aiTo() + ' sor.') : !S.q && filtered() ? emptyHtml('filter', 'Bu süzgeçte kayıt yok', 'Süzgeci kaldır ya da kutuya yeni bir şey yaz.', unfilterBtn()) : emptyHtml('search', 'Benzer kayıt yok', 'Enter\'a basarsan bunu yeni not olarak kaydeder. ' + aiTo() + ' sormak için <b>Tab</b>\'a bas.'));
    else if (S.view === 'board') { // typing in the box doesn't rebuild the board: only data, filters or a real search do
      // 150: which board (and range) is part of the key: another board is always redrawn, from its own fit (an old camera kept its cards off screen)
      const key = [S.items, JSON.stringify(S.filter), S.sortPrio, live ? 'L' : S.searchOn && S.q, live ? 'L' : S.searchOn && S.hits, S.linkFrom, Board.id()];
      if (Board._key && Board._key[6] !== key[6]) S.cam = null;
      if (!Board._key || !Board.M || key.some((x, k) => x !== Board._key[k])) { Board._key = key; Board.render(visible(true)); }
      else if (!S.cam) { Board.fit(false); Board.cull(); } // 147b2: back on the board with nothing changed: the same cards from the fit, no rebuild (phone 4x: 70–540 ms)
    }
    else if (S.view === 'gallery') renderGallery(items);
    else if (S.view === 'cal') Cal.render(items);
    else renderTopics(items);
    if (S.view !== 'gallery' && Sel.mode) Sel.clear(); if (S.view !== 'board') Link.end();
    S._lkey = S.view === 'list' && !live && items.length ? vkey : S.view === 'list' ? null : S._lkey;
    Flip.play(fr, fb);
    Scrub.draw(none || S.view === 'todo' || S.view === 'cal' ? [] : items);
    if (!$('#splash').classList.contains('gone')) { $('#splash').classList.add('gone'); performance.mark?.('nts-ui'); } // 94e: first screen time (tools/bench-start.log)
    Badge.set(); Sample.bar(); Rel.update();
}

// ---------- data changes ----------
async function upsert(list, { sync = true, quiet = false } = {}) {
  const t = now(), base = new Map(list.map(i => [i.id, byId(i.id)?.updatedAt || 0])); // the version this edit started from (84)
  for (const i of list) { i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1); indexItem(i); }
  if (quiet && list.length === 1 && S.items.some((x, k) => x.id === list[0].id && (S.items[k] = list[0]))) {
    if (_bmOf === S.items) _bm.set(list[0].id, list[0]); chromeCounts.c = null; // 147: same list, one item swapped in place → views don't redraw
    await DB.putMany('items', list.map(({ ...i }) => i)); await Sync.markDirty(list, base);
    clearTimeout(upsert._q); upsert._q = setTimeout(() => (window.requestIdleCallback || setTimeout)(() => renderChrome(), { timeout: 2000 }), 600);
    if (sync) Sync.schedule(); Snapshot.schedule(); return;
  }
  const map = new Map(S.items.map(i => [i.id, i]));
  list.forEach(i => map.set(i.id, i));
  S.items = [...map.values()];
  await DB.putMany('items', list.map(({ ...i }) => i));
  await Sync.markDirty(list, base);
  runSearch(); render(); AI.dot();
  if (sync) Sync.schedule();
  Snapshot.schedule();
  if (list.some(Inside.need)) setTimeout(() => Inside.run(), 1500);
}
// 104c: text files (LaTeX .tex/.bbl, Markdown, .txt, code, csv …) are searched by what is inside them: the first 20k characters
// are read once from the file on this device (no AI, no network), newest first, while the page is idle
const Inside = {
  tried: new Set(),
  need: i => i.type === 'file' && !i.deleted && i.content == null && fileKind(i) === 'text' && (i.size || 0) < 5e6,
  async run() {
    if (this._run) return; this._run = true;
    try {
      for (;;) {
        await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 3000 }));
        const todo = S.items.filter(i => this.need(i) && !this.tried.has(i.id)).sort((a, b) => b.ts - a.ts).slice(0, 8);
        if (!todo.length) break;
        const upd = [];
        for (const i of todo) {
          this.tried.add(i.id);
          const rec = await DB.get('files', i.id).catch(() => null); if (!rec?.blob) continue;
          const t = (await rec.blob.slice(0, 60000).text()).replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 20000);
          upd.push({ ...byId(i.id), content: t });
        }
        if (upd.length) await upsert(upd, { sync: false });
      }
    } finally { this._run = false; }
  },
};
async function addFromInput(input) {
  const made = itemsFromInput(input);
  if (!made.length) return [];
  made.forEach(m => { m.createdAt = now(); if (!m.source || m.source === 'manual') m.dev = deviceNow(); });
  // 152: the same link (any spelling: www, m., utm_, youtu.be …) or the same file bytes → no second item; the old one gets one more save
  if (window.NtsDedup && input.source !== 'pc') {
    for (const m of made) if (m._blob) m.sha = await sha1Hex(m._blob);
    const ix = NtsDedup.index(S.items), dups = [], upd = new Map(), same = new Set();
    for (const m of made) {
      const old = m.type === 'link' ? ix.url(m.url) : m.type === 'file' ? ix.sha(m.sha) : null; if (!old) continue;
      dups.push(old); same.add(m);
      const u = NtsDedup.addSave(upd.get(old.id) || old, NtsDedup.saveOf({ ...m, ts: now() })), t = (m.text || '').trim();
      if (t && !(u.text || '').includes(t)) u.text = [u.text, t].filter(Boolean).join('\n\n'); // what was typed with it is kept
      upd.set(old.id, u);
    }
    if (dups.length) {
      await upsert([...upd.values()], { quiet: true });
      const rest = made.filter(m => !same.has(m));
      const what = dups[0].type === 'link' ? 'link' : 'dosya';
      if (!rest.length) { toast(`Bu ${what} zaten kayıtlı (${fmtDay(dayKey(dups[0].ts))})`, 3500, dups[0].type === 'link' ? 'link' : 'file'); openItem(dups[0].id); return 'dup'; }
      toast(`${dups.length} tanesi zaten kayıtlıydı, kopyası açılmadı`, 3500, 'check');
      made.splice(0, made.length, ...rest);
    }
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
// 107m: first run → "Örnek verilerle dene": a dozen sample items (notes, links, tasks, a picture, two linked cards) marked `sample`,
// spread over the last three days so every view has something to show; a strip on top says so and deletes them all in one tap
// (tombstones, like the trash's "delete for good": signed-in devices drop them too). Nothing is sent to the AI (pending: false).
const Sample = {
  _of: null, _n: 0,
  n() { if (this._of !== S.items) { this._of = S.items; this._n = S.items.reduce((n, i) => n + (i.sample && !i.deleted ? 1 : 0), 0); } return this._n; },
  async pic() { // a small drawn "photo" (sunset over hills): the gallery and image search have something real to show
    try {
      const c = new OffscreenCanvas(640, 420), g = c.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, 420);
      sky.addColorStop(0, '#2b4c7e'); sky.addColorStop(.55, '#f08a5d'); sky.addColorStop(1, '#f9d56e'); g.fillStyle = sky; g.fillRect(0, 0, 640, 420);
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(420, 250, 56, 0, 7); g.fill();
      g.fillStyle = '#3d5a40'; g.beginPath(); g.moveTo(0, 330); g.quadraticCurveTo(160, 230, 330, 320); g.quadraticCurveTo(480, 390, 640, 300); g.lineTo(640, 420); g.lineTo(0, 420); g.fill();
      g.fillStyle = '#2a3f2c'; g.beginPath(); g.moveTo(0, 380); g.quadraticCurveTo(250, 320, 640, 400); g.lineTo(640, 420); g.lineTo(0, 420); g.fill();
      const b = await c.convertToBlob({ type: 'image/png' }); return new File([b], 'kapadokya-gun-batimi.png', { type: 'image/png' });
    } catch { return null; }
  },
  async add() {
    if (this.busy || this.n()) return; this.busy = true;
    try {
      const t = now(), h = 36e5, day = k => dayKey(t + k * 864e5), id = () => newId(), [a, b] = [id(), id()];
      const L = (url, title, description, x) => ({ type: 'link', url, text: '', meta: { title, description }, ...x });
      const T = (text, x = {}) => ({ type: 'note', text, todo: { text, done: false, user: true, ...x } });
      const list = [
        { type: 'note', text: 'Kendine not at: yaz, Enter. Link, resim, dosya da olur.\nBu bir örnek; üstteki şeritten hepsini tek dokunuşla silersin.', starred: true, ts: t - .02 * h },
        T('Süt, ekmek, yumurta al', { due: day(0) }),
        T('Diş randevusu için ara', { due: day(1) }),
        { ...T('Elektrik faturasını öde'), todo: { text: 'Elektrik faturasını öde', done: true, doneAt: t - 2 * h, user: true } },
        L('https://tr.wikipedia.org/wiki/Pomodoro_tekni%C4%9Fi', 'Pomodoro Tekniği — Vikipedi', '25 dakika çalış, 5 dakika ara ver: dikkat dağılmadan iş bitirmenin basit yolu.', { tags: ['verimlilik'], ts: t - 5 * h }),
        { id: a, type: 'note', text: 'Toplantı notları\n- bütçe onaylandı\n- sunum cuma\n- Ayşe tasarımı gönderecek', tags: ['iş'], color: 'blue', links: [b], ts: t - 7 * h },
        { id: b, type: 'note', text: 'Sunum taslağı: sorun → çözüm → demo (10 dk)', tags: ['iş'], ts: t - 6.5 * h },
        { type: 'note', text: 'Kitap önerisi: Küçük Prens — bu yaz tekrar oku', tags: ['kitap'], color: 'yellow', ts: t - 26 * h },
        { type: 'note', text: 'Tatil fikri: Kapadokya, balon turu sabah 5\'te. Ekim en iyi ay.', tags: ['seyahat'], color: 'green', ts: t - 27 * h },
        L('https://developer.mozilla.org/tr/docs/Web/Progressive_web_apps', 'Progresif web uygulamaları — MDN', 'Telefona kurulan, çevrimdışı çalışan web uygulamaları.', { tags: ['iş'], ts: t - 29 * h }),
        L('https://tr.wikipedia.org/wiki/Mercimek_%C3%A7orbas%C4%B1', 'Mercimek çorbası — Vikipedi', 'Kırmızı mercimek, soğan, havuç; üstüne nane ve pul biber.', { tags: ['yemek'], ts: t - 50 * h }),
        { type: 'note', text: '"Basit tut." — bugünün notu', ts: t - 52 * h },
      ];
      const img = await this.pic();
      if (img) list.push({ type: 'file', fileName: img.name, mime: img.type, size: img.size, text: 'Kapadokya, gün batımı', tags: ['seyahat'], _blob: img, ts: t - 28 * h });
      const made = list.map((x, k) => ({ id: id(), ts: t - k * 60e3, group: id(), source: 'manual', tags: [], ...x, createdAt: t, sample: true, dev: deviceNow() }));
      const saved = (await saveItems(made)).map(i => ({ ...i, pending: false }));
      await upsert(saved, { sync: false });
      haptic(); toast(`${saved.length} örnek kayıt eklendi`, 3000, 'mark');
    } catch (e) { console.warn('sample', e); toast('Örnekler eklenemedi: ' + e.message, 4000, 'x'); }
    finally { this.busy = false; }
  },
  async clear() {
    const list = S.items.filter(i => i.sample && !i.deleted); if (!list.length) return;
    await Trash.purge(list); haptic(14); toast('Örnekler silindi', 2400, 'check');
  },
  bar() { // the strip on top while samples are there
    const n = this.n(); let el = $('#sampleBar'); document.body.classList.toggle('has-sample', !!n);
    if (!n) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'sampleBar'; el.setAttribute('role', 'status');
      el.addEventListener('click', e => { if (e.target.closest('[data-sdel]')) this.clear(); });
    }
    const home = innerWidth >= 900 ? $('.hud-l') : document.body; // desktop: in the top bar next to the board name; phone: above the box
    if (el.parentNode !== home) home.appendChild(el);
    const txt = `<span>${ic('spark', 'sm')}${n} örnek kayıt</span><button class="btn secondary" data-sdel>${ic('trash', 'sm')}Örnekleri sil</button>`;
    if (el._t !== txt) el.innerHTML = el._t = txt;
    el.hidden = false;
  },
};

const Trash = {
  DAYS: 30,
  list: () => S.items.filter(i => i.deleted && !i.purged && i.deletedAt && i.type !== 'vault' && i.type !== 'bridge').sort((a, b) => b.deletedAt - a.deletedAt),
  async purge(items) { // tombstone only: other devices learn it is gone; the file goes too
    items = [...items, ...items.flatMap(i => (i.conv?.kids || []).map(byId).filter(Boolean))];
    for (const i of items) { DB.del('files', i.id); DB.del('files', i.id + ':t'); DB.del('files', i.id + ':m'); }
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
        if (e.target.closest('[data-tmore]')) { this.lim += 300; return this.draw(); }
        if (e.target.closest('[data-empty]')) { const all = this.list(); if (!all.length) return; if (e.target.closest('[data-empty]').dataset.sure !== '1') { const b = e.target.closest('[data-empty]'); b.dataset.sure = '1'; b.textContent = `Emin misin? ${all.length} kayıt kalıcı silinir`; return; } await this.purge(all); toast('Çöp kutusu boşaldı', 2000, 'trash'); this.draw(); }
      });
    }
    this.lim = 100; this.draw(); Back.open(d); // 147c: a big trash (hundreds after a cleanup) draws 100 rows, the rest on request
  },
  draw() {
    const d = $('#trash'), all = this.list(), lim = this.lim || 100, left = i => Math.max(1, this.DAYS - Math.floor((now() - i.deletedAt) / 864e5));
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type">${ic('trash', 'sm')}Çöp kutusu</span><span class="sp"></span><button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      <p class="hint">Silinenler ${this.DAYS} gün burada durur, sonra kendiliğinden kalıcı silinir.</p>
      ${all.length ? `<div class="v-list">${all.slice(0, lim).map(i => { const k = i.type === 'draw' ? 'pen' : fileKind(i); return `<div class="v-row"><span class="v-av ${i.type}-c">${ic(k === 'text' ? 'note' : k, 'sm')}</span>
          <span class="v-t" style="flex:1"><b>${esc(i.type === 'draw' ? 'Çizim' : titleOf(i))}</b><small>${fmtDay(dayKey(i.deletedAt))} silindi · ${left(i)} gün kaldı</small></span>
          <button class="btn secondary sm" data-restore="${i.id}">Geri getir</button><button class="icon-btn sm danger" data-kill="${i.id}" title="Kalıcı sil" aria-label="Kalıcı sil">${ic('x', 'sm')}</button></div>`; }).join('')}</div>${all.length > lim ? `<button class="btn secondary sm t-more" data-tmore>${all.length - lim} kayıt daha göster</button>` : ''}
        <div class="row" style="justify-content:flex-end"><button class="btn danger" data-empty>Çöpü boşalt</button></div>`
        : `<p class="hint v-empty">Çöp kutusu boş.</p>`}</div>`;
  },
};
async function toggleStar(id) { const i = byId(id); if (i) { haptic(); await upsert([{ ...i, starred: !i.starred }]); } } // 141: a small tick on the phone
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
  if (findMode() && !q && S.sugOn && !S.attach.length) { if (Find.top.length) { Find.top = []; updateSend(); } return show('hits find sug', sugHtml()); } // 104e: empty box → suggestions
  if (!findMode() || !q) { // 103b: only Ara mode opens results; Not shows a "N benzer kayıt" chip, Sor asks
    if (Find.top.length) { Find.top = []; updateSend(); }
    if (el.hidden || el.classList.contains('closing')) return;
    el.classList.add('closing'); el._ht = setTimeout(() => { el.hidden = true; el.classList.remove('closing'); el._html = ''; el._cls = ''; }, 140); return;
  }
  // 103a: hitsOff = the page changed (or "Sayfada gör"); the filter stays, a small chip says so, typing/focus brings the window back
  if (S.hitsOff) return show('qchip', `${ic('search', 'sm')}${hueDots(q)}<span dir="auto">${esc(S.nl ? [S.nl.rest, ...S.nl.chips.map(c => c.label)].filter(Boolean).join(' · ').slice(0, 48) : q.slice(0, 40))} · ${S.hits?.size || 0} kayıt</span><button data-clear title="Aramayı temizle" aria-label="Aramayı temizle">${ic('x', 'sm')}</button>`);
  show('hits find', '<div class="f-head"></div><div class="f-ac" hidden></div><div class="f-hlp"></div><div class="f-ans" hidden></div><div class="f-chips"></div><div class="f-grid"></div><div class="f-sem"></div><div class="h-foot"></div>');
  Find.draw(el, q);
}
// 104g2: the m-th smallest number of a typed array (quickselect, the array is reordered): ~2 passes instead of a full sort
function kth(a, m) {
  let lo = 0, hi = a.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1, x = a[lo], y = a[mid], z = a[hi], piv = x < y ? (y < z ? y : x < z ? z : x) : (x < z ? x : y < z ? z : y);
    let i = lo, j = hi;
    while (i <= j) { while (a[i] < piv) i++; while (a[j] > piv) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
    if (m <= j) hi = j; else if (m >= i) lo = i; else return a[m];
  }
  return a[m];
}
// 103b + 130a: the Ara window is a small visual grid: pictures big, notes as little document cards; type counts and the
// most common tags on top (a tap narrows); it is updated in place (tiles are kept by id and slide to their new place), never rebuilt
const Find = {
  top: [],
  list() { // 104g: the same hits are asked for more than once per key (window, send button): scored once
    const k = this._k, f = S.filter;
    if (k && k[0] === S.hits && k[1] === f.tag && k[2] === S.items && k[3] === S.q && k[4] === S.hits?.size) return this._l;
    this._k = [S.hits, f.tag, S.items, S.q, S.hits?.size]; this._bk = null; return this._l = this.list0();
  },
  list0() { // 104g2: { it: items, sc: their scores }, NOT sorted (8k hits on a phone: sorting them all was most of a key), no per-hit arrays
    const f = S.filter, it = [], sc = [];
    const rel = !S.qx || !S.qx.sort || S.qx.sort === 'rel', ph = rel ? norm((S.nl ? S.nl.rest : S.qx ? S.qx.terms.join(' ') : S.q).trim()) : '';
    byId(''); Opens.load(); const bm = _bm, nt = ntMap(), om = Opens.mm, idx = S.idx, long = ph.length > 1, lm = Learn.boost(S.q);
    S.hits?.forEach((s, id) => {
      const i = bm.get(id); if (!i || i.deleted || hid(i) || (f.tag && !(i.tags || []).includes(f.tag))) return;
      if (rel) { // 104e: the whole words in the title > starred (in the score) > often opened here > newer
        if (long) { let t = nt.get(id); if (t === undefined) nt.set(id, t = idx.get(id)?.t ?? norm(titleOf(i))); const at = t.indexOf(ph); if (at >= 0) s += at ? 2 : t.length === ph.length ? 4 : 3; }
        const o = om.get(id); if (o) s += Math.min(1.5, Math.log2(1 + o) * .5);
        const lb = lm.get(id); if (lb) s += lb; // 105g
      }
      it.push(i); sc.push(s);
    });
    return { it, sc };
  },
  // 104g2: the best k of the hits (by score, then newest) as indexes, in no order, without sorting all of them: the k-th best score
  // is found by quickselect (kth), a tie at that line is cut by date the same way; only the few shown are then really sorted
  pick(L, ids, k) {
    const n = ids.length; if (n <= k) return ids;
    const a = new Float64Array(n); for (let j = 0; j < n; j++) a[j] = L.sc[ids[j]];
    const t = kth(a, n - k), above = [], ties = [];
    for (const j of ids) { const v = L.sc[j]; if (v > t) above.push(j); else if (v === t) ties.push(j); }
    const need = k - above.length; if (ties.length <= need) return above.concat(ties);
    const ts = new Float64Array(ties.length); ties.forEach((j, x) => ts[x] = L.it[j].ts); const tt = kth(ts, ties.length - need);
    for (const j of ties) if (L.it[j].ts > tt) above.push(j);
    for (const j of ties) if (above.length < k && L.it[j].ts === tt) above.push(j);
    return above;
  },
  best(L, ids, k) { return this.pick(L, ids, k).sort((a, b) => L.sc[b] - L.sc[a] || L.it[b].ts - L.it[a].ts).slice(0, k).map(j => L.it[j]); },
  ranked(type) { // a kind's best 24 in order + its best 500 (for the tag chips), kept until the hits or the kind change
    const L = this.list(), b = this._bk;
    if (b && b[0] === L && b[1] === type) return b[2];
    const ids = []; L.it.forEach((i, j) => { if (type === 'all' || groupOf(i) === type) ids.push(j); });
    const pool = this.pick(L, ids, 500);
    return (this._bk = [L, type, { n: ids.length, pool: pool.map(j => L.it[j]), top: this.best(L, pool, 24) }])[2];
  },
  set(el, sel, html) { const n = el.querySelector(sel); if (n._h !== html) { n.innerHTML = html; n._h = html; } return n; },
  draw(el, q) {
    const all = this.list(), f = S.filter, cnt = new Map();
    for (const i of all.it) { const g = groupOf(i); cnt.set(g, (cnt.get(g) || 0) + 1); }
    const { n: nItems, pool, top: items } = this.ranked(f.type);
    const tags = new Map(); for (const i of pool) for (const t of i.tags || []) tags.set(t, (tags.get(t) || 0) + 1);
    if (f.tag && !tags.has(f.tag)) tags.set(f.tag, nItems);
    const top = [...tags].sort((a, b) => (b[0] === f.tag) - (a[0] === f.tag) || b[1] - a[1]).slice(0, narrow() ? 4 : 6);
    const rest = S.nl ? S.nl.rest : q; // 104a: a plain sentence's dates / kinds / sources are chips (× takes the words out of the box)
    const im = ImgFind.on() ? S.imgFind : null; // 105f
    this.set(el, '.f-head', `<span class="f-q">${im ? `<img class="f-qimg" src="${im.url}" alt="Aranan resim">${im.ocr ? '' : `<b>${IMG_KEY}</b>`}${im.busy ? '<span class="f-n">· karşılaştırılıyor…</span>' : im.reading ? '<span class="f-n">· yazısı okunuyor…</span>' : ''}` : ic('search', 'sm')}${S.nl?.chips.length ? '<span class="f-und">Anladığım:</span>' : ''}${hueDots(rest)}${rest && !(im && !im.ocr) ? `<b dir="auto">${esc(rest.slice(0, 40))}</b>` : ''}${nlChips()}<span class="f-n">· ${nItems} kayıt</span></span><button data-qhelp class="${S.qHelp ? 'on' : ''}" title="Arama dili" aria-label="Arama dili örnekleri" aria-expanded="${!!S.qHelp}">?</button><button data-clear title="Aramayı temizle (Esc)" aria-label="Aramayı temizle">${ic('x', 'sm')}</button>`);
    Suggest.cur = Suggest.of(S.q); el.querySelector('.f-ac').hidden = !Suggest.cur; this.set(el, '.f-ac', Suggest.html()); // 104e
    this.set(el, '.f-hlp', S.qHelp ? qHelpHtml() : '');
    const ah = ansHtml(items), ae = el.querySelector('.f-ans'); ae.hidden = !ah; this.ans = !!ah; this.set(el, '.f-ans', ah); // 105b
    const T = [['all', 'Hepsi', all.it.length], ['photo', 'Resim'], ['note', 'Not'], ['link', 'Link'], ['file', 'Dosya']].map(([t, l, n]) => [t, l, n ?? cnt.get(t) ?? 0]);
    this.set(el, '.f-chips', T.filter(([t, , n]) => n || t === f.type).map(([t, l, n]) => `<button class="f-ty${f.type === t ? ' on' : ''}" data-ftype="${t}">${l}<small>${n}</small></button>`).join('')
      + (top.length ? '<span class="f-sep"></span>' + top.map(([t, n]) => `<button class="f-tag${f.tag === t ? ' on' : ''}" data-ftag="${esc(t)}" title="${f.tag === t ? 'Etiketi kaldır' : 'Bu etikete daralt'}"><span class="muted">#</span><span dir="auto">${esc(t)}</span><small>${f.tag === t ? ic('x', 'sm') : n}</small></button>`).join('') : ''));
    const g = el.querySelector('.f-grid'), want = items.slice(0, narrow() ? 12 : 24), old = new Map([...g.children].filter(n => n.dataset.open).map(n => [n.dataset.open, n]));
    this.top = want.map(i => i.id);
    if (S.hitSel >= want.length) S.hitSel = want.length - 1;
    // 104g2: only tiles that change their place in the grid are measured (and slide); a key that keeps the order reads no layout
    const anim = !reduced() && !el.classList.contains('closing'), before = new Map(), was = new Map([...g.children].map((n, k) => [n, k]));
    if (anim) want.forEach((i, k) => { const n = old.get(i.id); if (n && was.get(n) !== k) before.set(n, n.getBoundingClientRect()); });
    const fresh = [];
    want.forEach((i, k) => {
      let t = old.get(i.id); if (t) old.delete(i.id); else { t = this.tile(i); fresh.push(t); }
      if (g.children[k] !== t) g.insertBefore(t, g.children[k] || null);
      t.classList.toggle('sel', k === S.hitSel); t.classList.toggle('sem', !!S.semIds?.has(i.id)); t.classList.toggle('learn', Learn.boost(S.q).has(i.id));
      const sn = t.classList.contains('vis') && snip(i, 90, 8), tt = sn?.label ? hl(sn.sub) : hl(titleOf(i)); if (t._t !== tt) { t.querySelector('.f-t').innerHTML = tt; t._t = tt; t.title = sn?.label ? titleOf(i) : ''; }
      const s = t.querySelector('.f-s'); if (s) { const ss = snipHtml(i, 160, 14); t.classList.toggle('has-snip', ss.includes('snip-src')); if (t._s !== ss) { s.innerHTML = ss; t._s = ss; } }
    });
    old.forEach(n => n.remove()); g.querySelector('.f-none')?.remove();
    // 105c: what to try when nothing (or only the closest) came back
    const dym = S.dym ? `<button class="btn secondary sm f-dym" data-dym="${esc(S.dym)}">Bunu mu demek istedin: <b dir="auto">${esc(S.dym)}</b></button>` : '';
    el.querySelector('.f-loose')?.remove(); const askq = window.NtsQuery && NtsQuery.intent(S.q) === 'ask'; // the "Soru gibi" button is below then
    if (want.length && (S.loose || dym)) g.insertAdjacentHTML('beforebegin', `<div class="f-loose">${S.loose === 'nofilter' ? 'Süzgeçlerle bir şey yok; süzgeçsiz bulunanlar' : S.loose === 'drop' ? `Hepsine uyan yok; “${esc(S.looseLabel)}” olmadan` : S.loose ? 'Hepsini içeren kayıt yok; en yakınlar' : ''}${dym}</div>`);
    if (!want.length) g.insertAdjacentHTML('beforeend', `<div class="f-none">${dym || 'Bulunamadı.'}<button class="btn secondary sm" data-mode="note">${ic('pen', 'sm')}Not olarak kaydet</button>${askq ? '' : `<button class="btn secondary sm" data-mode="ask">${ic('spark', 'sm')}${aiTo()} sor</button>`}</div>`);
    if (anim) {
      const moves = []; for (const [n, a] of before) { if (!n.isConnected) continue; const b = n.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if (dx || dy) moves.push([n, dx, dy]); }
      for (const [n, dx, dy] of moves) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 190, easing: 'cubic-bezier(.2,.8,.2,1)' });
      for (const n of fresh) n.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 170, easing: 'ease-out' });
    }
    const sb = im && !im.ocr ? '' : semBar(nItems, (S.nl ? S.nl.rest : q).trim()), se = el.querySelector('.f-sem'); se.hidden = !sb; this.set(el, '.f-sem', sb);
    fresh.forEach(hookThumbs); updateSend(); // the send button opens the first result: on only when there is one
    const phone = narrow();
    this.set(el, '.h-foot', `<span class="d-only">${S.hitSel >= 0 ? '<kbd>↑</kbd><kbd>↓</kbd> seç · <kbd>Enter</kbd> aç' : '<kbd>Enter</kbd> ilk sonucu aç · <kbd>↓</kbd> gez'} · <kbd>Tab</kbd> mod · <kbd>Esc</kbd> temizle</span>`
      + (nItems ? `<button class="link-btn" data-lpin>${ic('pin', 'sm')}${phone ? 'Sabitle' : 'Aramayı sabitle'}</button><button class="link-btn" data-all>Sayfada gör</button>` : ''));
  },
  tile(i) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.open = i.id;
    const vis = hasVisual(i), k = fileKind(i);
    b.className = 'h-row f-tile ' + (vis ? 'vis' : 'doc');
    b.innerHTML = vis ? `${thumbBox(i, 'f-th')}<span class="f-t" dir="auto"></span>`
      : `<span class="f-ic ${i.type}-c">${linkFav(i)}${i.type === 'link' ? `<b class="f-l">${esc(([...domain(i.url)][0] || '·').toLocaleUpperCase('tr'))}</b>` : ic(k === 'text' ? 'note' : k, 'sm')}</span><span class="f-t" dir="auto"></span><span class="f-s" dir="auto"></span><span class="f-d">${i.type === 'link' ? esc(domain(i.url)) : fmtDay(dayKey(i.ts))}</span>`;
    return b;
  },
  open(n = 0) { const id = this.top[n]; if (id) { if (!ImgFind.on()) { Recent.add(S.q); Learn.add(S.q, id); } openItem(id); } },
};
let _nt = new Map(), _ntOf;
const ntMap = () => { if (_ntOf !== S.items) { _nt = new Map(); _ntOf = S.items; } return _nt; }; // folded titles, filled as asked
// how often an item was opened on this device (only for the order; never synced)
const Opens = {
  m: null,
  load() { if (!this.m) { try { this.m = JSON.parse(localStorage.getItem('nts-opens') || '{}'); } catch { this.m = {}; } this.mm = new Map(Object.entries(this.m)); } return this.m; },
  n(id) { this.load(); return this.mm.get(id) || 0; }, // 104g2: a Map (a missing key on a big plain object was slow, once per hit)
  bump(id) {
    const m = this.load(); m[id] = (m[id] || 0) + 1; const ks = Object.keys(m);
    if (ks.length > 3000) for (const k of ks.sort((a, b) => m[a] - m[b]).slice(0, 1000)) delete m[k];
    this.mm = new Map(Object.entries(m));
    try { localStorage.setItem('nts-opens', JSON.stringify(m)); } catch { }
  },
};
// 104e: recent searches (this device): kept when a result is opened or the typing rests 2.5 s with results
const Recent = {
  list() { try { return JSON.parse(localStorage.getItem('nts-recentq') || '[]'); } catch { return []; } },
  add(q) {
    q = (q || '').trim(); if (q.length < 2 || q.length > 120) return;
    const l = this.list().filter(x => x !== q && !q.startsWith(x)); l.unshift(q);
    try { localStorage.setItem('nts-recentq', JSON.stringify(l.slice(0, 8))); } catch { }
  },
  clear() { try { localStorage.removeItem('nts-recentq'); localStorage.removeItem('nts-learn'); } catch { } Learn.l = null; Learn._b = null; },
};
// 105g: learns while used (this device only, never synced): the items opened from a search come first in a similar search later
// ("fatura" → opened "Mart faturası"; "faturalar" or "mart fatura" next week shows it first). [words, {id: times}, last time], ≤ 300
const Learn = {
  l: null,
  list() { if (!this.l) { try { this.l = JSON.parse(localStorage.getItem('nts-learn') || '[]'); } catch { this.l = []; } } return this.l; },
  add(q, id) {
    if (!window.NtsQuery || !id) return; const k = NtsQuery.content(q).join(' '); if (!k || k.length > 120) return;
    const l = this.list(), at = l.findIndex(e => e[0] === k), e = at >= 0 ? l.splice(at, 1)[0] : [k, {}, 0];
    e[1][id] = (e[1][id] || 0) + 1; e[2] = Date.now(); l.unshift(e); l.length = Math.min(l.length, 300); this._b = null;
    try { localStorage.setItem('nts-learn', JSON.stringify(l)); } catch { }
  },
  boost(q) { // id → extra score (word hits are ~3 per word): the more alike the search and the more often opened, the more
    if (this._b && this._b.q === q) return this._b.m;
    const m = new Map();
    if (window.NtsQuery) for (const [k, ids] of this.list()) {
      const sim = NtsQuery.qsim(q, k); if (sim < .6) continue;
      for (const id in ids) { const b = sim * (2.5 + Math.min(2, Math.log2(1 + ids[id]))); if (b > (m.get(id) || 0)) m.set(id, b); }
    }
    this._b = { q, m }; return m;
  },
};
// 104e: autocomplete for the search language: the word at the end of the box ("etiket:fa", "#fa", "proje:", "sohbet:an", "is:", "renk:")
// offers its values (tags / projects / chats with counts, most used first); Tab or a tap completes it
const AC_FIX = { is: 'yıldızlı görev açık bitti bakılmadı sabit', has: 'resim not link pdf video ses', type: 'resim not link pdf video ses dosya',
  source: 'whatsapp telefon bilgisayar yerimleri paylaşım', sort: 'yeni eski alaka', last: '1g 7g 30g 3a 1y',
  color: 'kırmızı turuncu sarı yeşil mavi mor pembe kahverengi siyah beyaz gri siyah-beyaz' };
const AC_NAME = { tag: 'Etiket', project: 'Proje', chat: 'Sohbet', is: 'Durum', has: 'İçinde', type: 'Tür', source: 'Kaynak', sort: 'Sırala', last: 'Son', color: 'Renk', date: 'Tarih' };
let _fc, _fcOf;
function facets() { // tag / project / chat counts, counted once per items array
  if (_fcOf === S.items) return _fc;
  const tag = new Map(), project = new Map(), chat = new Map(), add = (m, k) => k && m.set(k, (m.get(k) || 0) + 1);
  for (const i of S.items) { if (i.deleted || hid(i)) continue; for (const t of i.tags || []) add(tag, t); add(project, i.project); add(chat, i.chat); }
  _fcOf = S.items; return _fc = { tag, project, chat };
}
const Suggest = {
  cur: null,
  of(q) {
    if (!window.NtsQuery?.field) return null;
    const m = q.match(/(^|[\s(])(-?)(#|[^\s:"()#\-][^\s:"()]*:)("?)([^\s"()]*)$/u); if (!m) return null;
    const f = m[3] === '#' ? 'tag' : NtsQuery.field(m[3].slice(0, -1)); if (!f) return null;
    const fold = NtsQuery.fold, pre = fold(m[5]), fc = facets(), d = new Date(), ym = (y, k) => y + '-' + String(k + 1).padStart(2, '0');
    let list = fc[f] ? [...fc[f]].sort((a, b) => b[1] - a[1]) : AC_FIX[f] ? AC_FIX[f].split(' ').map(v => [v])
      : f === 'date' ? [['dün'], ['bugün'], [ym(d.getFullYear(), d.getMonth())], [d.getMonth() ? ym(d.getFullYear(), d.getMonth() - 1) : ym(d.getFullYear() - 1, 11)], [String(d.getFullYear())]] : null;
    if (!list) return null;
    if (m[3] === '#') list = list.filter(([v]) => !/\s/.test(v));
    const a = [], b = []; for (const x of list) { const v = fold(x[0]); if (v === pre) continue; if (v.startsWith(pre)) a.push(x); else if (pre && v.includes(pre)) b.push(x); }
    list = [...a, ...b].slice(0, innerWidth < 700 ? 6 : 8);
    return list.length ? { at: q.length - m[4].length - m[5].length, name: AC_NAME[f] || f, list } : null;
  },
  pick(k) {
    const c = this.cur, v = c?.list[k]?.[0], inp = $('#input'); if (v == null) return;
    inp.value = inp.value.slice(0, c.at) + (/[\s()"]/.test(v) ? `"${v}"` : v) + ' '; S.q = inp.value; S.searchOn = true; S.hitSel = -1;
    runSearch(); autoGrow(); render(); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length);
  },
  html() {
    const c = this.cur; if (!c) return '';
    return `<span class="f-ac-l">${c.name}</span>` + c.list.map(([v, n], k) => `<button class="f-acv" data-ac="${k}"><span dir="auto">${esc(v)}</span>${n ? `<small>${n}</small>` : ''}</button>`).join('') + '<span class="f-ac-k d-only"><kbd>Tab</kbd> tamamla</span>';
  },
};
// 104e: the "?" card: the search language in short, each example a button that puts it in the box
const Q_HELP = [['#iş', 'etiket'], ['"tam ifade"', 'aynen bu sözler'], ['fatura -su', '"su" olmasın'], ['fatura VEYA makbuz', 'biri yeter'], ['poul*', 'ile başlayan'],
  ['/fa.+ra/', 'düzenli ifade'], ['tarih:2024-03', 'ay, yıl, aralık ..'], ['son:7g', 'son 7 gün (h, a, y)'], ['is:yıldızlı', 'görev, bitti, bakılmadı'], ['has:pdf', 'resim, link, not'],
  ['site:youtube.com', 'link adresi'], ['proje:', 'proje adı'], ['sohbet:', 'WhatsApp sohbeti'], ['renk:mavi', 'resmin rengi'], ['boyut:>5mb', 'dosya boyu'], ['sırala:eski', 'yeni, eski, alaka']];
const qHelpHtml = () => `<div class="f-help"><div class="f-help-h">Arama dili <span class="muted">· tr / en / ar: etiket: tag: وسم:</span></div><div class="f-help-g">`
  + Q_HELP.map(([x, d]) => `<button class="f-hx" data-qex="${esc(x)}"><code dir="auto">${esc(x)}</code><span>${d}</span></button>`).join('') + '</div></div>';
// 104e: Ara with an empty box: recent searches, saved searches and the most used tags / projects, so a search starts with a tap
function sugHtml() {
  const rec = Recent.list(), saved = Saved.list(), fc = facets(), phone = innerWidth < 700;
  const tags = [...fc.tag].sort((a, b) => b[1] - a[1]).slice(0, phone ? 5 : 8), projs = [...fc.project].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const q1 = v => /[\s()"]/.test(v) ? `"${v}"` : v, sec = (t, body, more = '') => body ? `<div class="s-sec"><div class="s-h">${t}${more}</div><div class="s-row">${body}</div></div>` : '';
  const body = sec('Son aramalar', rec.map(q => `<button class="f-tag" data-qex="${esc(q)}">${ic('clock', 'sm')}<span dir="auto">${esc(q.slice(0, 40))}</span></button>`).join(''), rec.length ? '<button class="link-btn" data-qclr>Temizle</button>' : '')
    + sec('Kayıtlı aramalar', saved.map(s => `<button class="f-tag" data-saved="${s.id}">${ic('pin', 'sm')}<span dir="auto">${esc(s.name)}</span></button>`).join(''))
    + sec('Sık konular', tags.map(([t, n]) => `<button class="f-tag" data-qex="#${esc(q1(t))}"><span class="muted">#</span><span dir="auto">${esc(t)}</span><small>${n}</small></button>`).join('')
      + projs.map(([p, n]) => `<button class="f-tag" data-qex="proje:${esc(q1(p))}">${ic('folder', 'sm')}<span dir="auto">${esc(p)}</span><small>${n}</small></button>`).join(''));
  return `<div class="f-head"><span class="f-q">${ic('search', 'sm')}<span class="muted">Yazdıkça bulur${Mic.SR ? ' · sesle' : ''} · resim yapıştır</span></span><button data-qhelp class="${S.qHelp || !body ? 'on' : ''}" title="Arama dili" aria-label="Arama dili örnekleri" aria-expanded="${!!(S.qHelp || !body)}">?</button></div>`
    + `<div class="s-body">${body}${S.qHelp || !body ? qHelpHtml() : ''}</div>`;
}
// 104f: meaning search on this device (sem.js worker, multilingual-e5-small): turned on once in Settings or from the Ara window
// (the model is downloaded once, ~140 MB, and stays in the browser cache; the items never leave the device). It runs ~220 ms after
// the word search and what it adds comes in softly under the word results. Only changed items are sent to be embedded again.
const fnv = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return h >>> 0; };
const Sem = {
  w: null, st: 'off', p: 0, mb: 0, done: 0, left: 0, sent: new Map(), hits: null, n: 0, _of: null,
  on() { try { return localStorage.getItem('nts-sem') === '1'; } catch { return false; } },
  start() {
    if (this.w || !this.on()) return;
    try { this.w = new Worker('./sem.js', { type: 'module' }); } catch { this.st = 'err'; return this.ui(); }
    this.st = 'load'; this.p = 0; this.w.onmessage = e => this.msg(e.data);
    this.w.onerror = e => { e.preventDefault?.(); console.warn('Sem worker', e.message); this.st = 'err'; this.ui(); };
    this.w.postMessage({ t: 'init' }); this._of = S.items; this.sync();
  },
  enable() { try { localStorage.setItem('nts-sem', '1'); } catch { } if (this.st === 'err') { this.w?.terminate(); this.w = null; } this.start(); this.ui(); },
  disable() { // the numbers are deleted; the model stays in the browser cache (turning it on again doesn't download it again)
    try { localStorage.removeItem('nts-sem'); } catch { }
    const w = this.w; this.w = null; w?.postMessage({ t: 'wipe' }); setTimeout(() => w?.terminate(), 800);
    this.st = 'off'; this.hits = null; AIF.list = null; AIF.by = new Map(); AIF.ver++; Folders._c = null; this.sent.clear(); this.done = this.left = 0; runSearch(); render(); this.ui();
  },
  text: i => [titleOf(i), subOf(i), (i.tags || []).join(' '), (i.vtags || []).join(' '), i.summary, i.ocr, i.chat].filter(Boolean).join(' · ').replace(/\s+/g, ' ').slice(0, 700),
  sync() {
    if (!this.w) return; clearTimeout(this._s);
    this._s = setTimeout(() => {
      const put = [], seen = new Set();
      for (const i of S.items) {
        if (i.deleted || hid(i)) continue; const t = this.text(i); if (t.length < 3) continue;
        seen.add(i.id); const h = fnv(t); if (this.sent.get(i.id) !== h) { this.sent.set(i.id, h); put.push([i.id, t]); }
      }
      const del = [...this.sent.keys()].filter(id => !seen.has(id)); del.forEach(id => this.sent.delete(id));
      if (put.length || del.length) this.w?.postMessage({ t: 'sync', put, del });
    }, 1500);
  },
  ask(q) { // the newest query wins; a short word is left to the word search
    clearTimeout(this._q);
    if (!this.w || q.length < 3 || this.hits?.q === q) return;
    this._q = setTimeout(() => this.w?.postMessage({ t: 'query', n: ++this.n, q, k: 60 }), 220);
  },
  like(id) { // 133: the stored numbers of one item → the closest others (z over the crowd); null when there are none to compare
    if (!this.w || this.st !== 'ready' || !this.sent.has(id)) return Promise.resolve(null);
    const n = ++this.n; (this._lk ||= new Map());
    return new Promise(ok => { this._lk.set(n, ok); this.w.postMessage({ t: 'like', n, id, k: 12 }); setTimeout(() => { if (this._lk.delete(n)) ok(null); }, 2500); });
  },
  msg(d) {
    if (d.t === 'progress') { this.p = d.p; this.mb = d.mb; }
    else if (d.t === 'ready') { this.st = 'ready'; this.done = d.n; if (S.q.trim()) { runSearch(); render(); } AIF.ask(); }
    else if (d.t === 'indexed') { this.done = d.done; this.left = d.left; if (!d.left) AIF.ask(); }
    else if (d.t === 'folders') { AIF.got(d.list); return; }
    else if (d.t === 'like') { const f = this._lk?.get(d.n); if (f) { this._lk.delete(d.n); f(d.list); } return; }
    else if (d.t === 'hits' && d.n < 0) { const f = this._lk?.get(d.n); if (f) { this._lk.delete(d.n); f(d.list); } return; } // 157d: Rel's own question
    else if (d.t === 'hits') { if (d.n === this.n) { this.hits = { q: d.q, list: d.list }; if (S.q.trim() && findMode()) { runSearch(); render(); } } return; }
    else if (d.t === 'error') { console.warn('Sem', d.m); if (this.st === 'load') this.st = 'err'; }
    this.ui();
  },
  ui() { // settings line + the Ara window's line, at most ~3 times a second
    if (this._u) return; this._u = setTimeout(() => { this._u = 0; const m = $('#semMsg'); if (m) m.textContent = this.say(); if (findMode() && S.q.trim() && !$('#hits').hidden) renderHits(); }, 300);
  },
  say() {
    return this.st === 'load' ? `Model iniyor… %${this.p}${this.mb ? ` / ${this.mb} MB` : ''} (bir kez)`
      : this.st === 'err' ? 'Model inmedi (bağlantı?). Dokun: tekrar dene.'
      : this.st === 'ready' ? `${this.done} kayıt anlamca aranıyor${this.left ? `, ${this.left} sırada` : ''}. Kayıtların cihazdan çıkmaz.`
      : 'fatura ↔ invoice ↔ فاتورة: anlamca yakın kayıtları da bulur. Model bu cihaza bir kez iner (~140 MB), kayıtların cihazdan çıkmaz.';
  },
};
// 131b: folders by meaning (needs the meaning search on): sem.js groups the stored numbers (k-means, off the page) and keeps the groups;
// a new item joins the nearest one by itself. Here the groups become folders 'ai:<c>' next to the tag / chat / site ones. Name: the
// chosen AI's short name through the bridge (/folders, saved in settings.folders.ai) — without it two telling words from the titles.
// "Birleştir" (folder head) and "Bu klasöre ait değil" (item menu) go back to the worker, so a regroup keeps them.
const AIF = {
  list: null, by: new Map(), ver: 0, _asked: 0, _nm: false,
  STOP: new Set('ve ile için bir bu şu da de ki mi gibi daha çok en ne ya veya ama olan olarak var yok ben sen biz the and for with from this that you are was how what why your our its not new http https www com org net html pdf png jpg jpeg img image resim dosya not link video'.split(' ')),
  on: () => Sem.on() && Sem.st === 'ready' && !!AIF.list,
  ask(force) { // the worker answers from what it kept; a regroup only when forced or the items grew a lot
    if (!Sem.w || Sem.st !== 'ready' || Sem.done < 40) return;
    if (!force && Date.now() - this._asked < 4000) return; this._asked = Date.now();
    Sem.w.postMessage({ t: 'folders', force: !!force });
  },
  got(list) {
    this.list = list; this.by = new Map(list.map(f => [f.c, new Set(f.ids)])); this.ver++; Folders._c = null;
    if (S.view === 'list' || S.view === 'gallery') render();
    this.name();
  },
  has(c, id) { return !!this.by.get(c)?.has(id); },
  of(id) { // id → its meaning folders (one map per membership version, so 10k items × 24 folders is one lookup each)
    if (this._ofv !== this.ver) { this._ofv = this.ver; const m = this._of = new Map(); for (const [c, ids] of this.by) for (const x of ids) { const l = m.get(x); l ? l.push(c) : m.set(x, [c]); } }
    return this._of.get(id) || [];
  },
  words(c) { // the words that tell this group apart: often here, rare elsewhere (cached per membership version)
    const ids = this.by.get(c); if (!ids) return '';
    const memo = (this._w ||= new Map()), mk = c + '|' + ids.size; if (memo.has(mk)) return memo.get(mk);
    const live = S.items.length; if (!this._df || Math.abs(live - this._dfl) > live * .05) { // how many items carry each word; again only when the items grew or shrank by 5%
      this._dfl = live; const df = this._df = new Map(), step = Math.max(1, Math.ceil(live / 2000)); this._dfn = 0; // a sample of ≤2000 is enough for "rare"
      for (let k = 0; k < live; k += step) { const i = S.items[k]; if (i.deleted) continue; this._dfn++; for (const w of new Map(this.toks(i)).keys()) df.set(w, (df.get(w) || 0) + 1); }
    }
    const tf = new Map(), show = new Map();
    let seen = 0; for (const id of ids) { if (++seen > 150) break; const i = byId(id); if (!i) continue; for (const [w, o] of new Map(this.toks(i))) { tf.set(w, (tf.get(w) || 0) + 1); if (!show.has(w)) show.set(w, o); } }
    const n = Math.min(ids.size, 150), best = [...tf].filter(([w, k]) => k >= Math.max(2, n * .2)).map(([w, k]) => [w, k / n * Math.log((this._dfn + 1) / ((this._df.get(w) || 0) + 1))]).sort((a, b) => b[1] - a[1]);
    const pick = best.slice(0, 2).map(([w]) => show.get(w)).map(o => o[0].toLocaleUpperCase('tr') + o.slice(1));
    const r = pick.join(' · ') || 'Benzer kayıtlar'; memo.set(mk, r); return r;
  },
  toks(i) { // [normalized, as written] for the title and tags; kept per item object (a changed item is a new object)
    const tc = (this._tk ||= new WeakMap()); let out = tc.get(i); if (out) return out; tc.set(i, out = []); for (const raw of `${titleOf(i)} ${(i.tags || []).join(' ')}`.split(/[^\p{L}\p{N}]+/u)) { if (raw.length < 3 || /^\d+$/.test(raw)) continue; const w = norm(raw); if (!this.STOP.has(w)) out.push([w, raw.toLocaleLowerCase('tr')]); }
    return out;
  },
  label(c) { return Folders.cfg().ai?.[c] || this.words(c); },
  async name() { // the AI names the groups that have no name yet, a few at a time; no bridge → the words stay
    if (this._nm || !this.list?.length || !S.bridgeOk) return; const named = Folders.cfg().ai || {};
    const todo = this.list.filter(f => !named[f.c] && f.ids.length >= 4).slice(0, 24); if (!todo.length) return;
    this._nm = true;
    try {
      const groups = todo.map(f => ({ key: f.c, items: f.ids.slice(0, 14).map(byId).filter(Boolean).map(i => ({ type: i.type, title: titleOf(i).slice(0, 100), tags: i.tags })) }));
      const r = await AI.call('/folders', { groups }, 180000), got = (r.items || []).filter(x => todo.some(f => f.c === x.key) && typeof x.name === 'string' && x.name.trim());
      if (got.length) await Folders.set(c => { c.ai ||= {}; for (const x of got) c.ai[x.key] = x.name.trim().replace(/^["'#]+|["']+$/g, '').slice(0, 32); });
    } catch (e) { console.warn('folders', e); }
    this._nm = false;
  },
  out(c, id) { // "Bu klasöre ait değil": out at once here, kept out by the worker even after a regroup; Geri al puts it back
    this.by.get(c)?.delete(id); this.ver++; Folders._c = null; Sem.w?.postMessage({ t: 'fout', c, id }); render();
    toast('Klasörden çıkarıldı', 5000, 'folder', { label: 'Geri al', fn: () => { this.by.get(c)?.add(id); this.ver++; Folders._c = null; Sem.w?.postMessage({ t: 'fin', c, id }); render(); } });
  },
  merge(a, b) { // b goes into a (a keeps its name); b's name / pin / hide are dropped
    const A = this.by.get(a), B = this.by.get(b); if (!A || !B) return; B.forEach(id => A.add(id)); this.by.delete(b); this.list = this.list.filter(f => f.c !== b); this.ver++;
    Sem.w?.postMessage({ t: 'fmerge', a, b });
    Folders.set(c => { const k = 'ai:' + b; if (c.ai) delete c.ai[b]; if (c.names) delete c.names[k]; c.pin = (c.pin || []).filter(x => x !== k); c.hide = (c.hide || []).filter(x => x !== k); });
  },
  mergePop(btn) { // the other meaning folders, biggest first; a tap pulls that one into this one
    const k = S.folder, c = k.slice(3); let p = $('#fMerge');
    if (p && !p.hidden) { p.hidden = true; return; }
    if (!p) { p = document.createElement('div'); p.id = 'fMerge'; p.className = 'pop f-merge'; p.setAttribute('role', 'menu'); document.body.appendChild(p);
      p.addEventListener('click', e => { const b = e.target.closest('[data-fm]'); if (!b) return; p.hidden = true; const from = b.dataset.fm, n = this.by.get(from)?.size || 0, nm = Folders.label('ai:' + from); this.merge(S.folder.slice(3), from); toast(`“${nm}” bu klasöre katıldı (${n} kayıt)`, 4000, 'folder'); });
      document.addEventListener('pointerdown', e => { if (!e.target.closest('#fMerge,[data-fmerge]')) p.hidden = true; }, true);
      addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) { e.stopPropagation(); p.hidden = true; btn.focus(); } }, true); }
    const others = this.list.filter(f => f.c !== c && this.by.get(f.c)?.size).sort((x, y) => this.by.get(y.c).size - this.by.get(x.c).size);
    p.innerHTML = `<div class="side-label">Hangisi buraya katılsın?</div>` + (others.length ? others.map(f => `<button class="side-row" data-fm="${esc(f.c)}" role="menuitem"><span class="f-dot" style="--c:${Folders.color('ai:' + f.c)}"></span><span class="lbl" dir="auto">${esc(Folders.label('ai:' + f.c))}</span><span class="n">${this.by.get(f.c).size}</span></button>`).join('') : '<p class="muted f-none">Başka anlam klasörü yok</p>');
    p.hidden = false; const r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'; p.style.top = (r.bottom + 6 + h < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
    p.querySelector('button')?.focus({ preventScroll: true });
  },
};
// 104f: few results → ask the chosen AI to look by meaning (it sees the word + meaning candidates and the newest items)
async function aiFind() {
  const q = (S.nl ? S.nl.rest : S.q).trim(), key = S.q; if (!q || S.aiFind?.busy) return;
  if (!S.bridgeOk && !(await AI.health())) return toast(claudeOff(), 3200, 'cpu');
  S.aiFind = { q: key, busy: true }; renderHits();
  try {
    const extra = [...(S.hits?.keys() || []), ...(Sem.hits?.q === q ? Sem.hits.list.slice(0, 40).map(x => x[0]) : [])].map(byId).filter(Boolean);
    const r = await AI.call('/ask', { question: `Kayıtlarımda şunu arıyorum: "${q}". Anlamca uyan kayıtları bul (eş anlamlı, başka dilde yazılmış ya da ima edilen dahil). sources alanına uyanların id'lerini yaz, en iyisi önce, en çok 20. answer alanına tek kısa Türkçe cümle.`, items: AI.pick(q, extra) });
    S.aiFind = { q: key, ids: (r.sources || []).filter(id => byId(id)), text: r.answer || '' };
    if (S.q === key && !S.aiFind.ids.length) toast(`${aiName()} da bulamadı`, 2400, 'spark');
  } catch (e) { S.aiFind = null; toast('Hata: ' + e.message, 3200); }
  if (S.q === key) { runSearch(); render(); }
}
// 105b: a question in Ara ("kümeste kaç sensör var?") gets a short answer on top: the sentence of the best results that holds the
// question's words (a number for "kaç"), on the device and offline, with the item it came from; the AI's answer only on a tap
const ansTexts = i => [titleOf(i), i.text, i.todo?.text, i.ocr, i.summary, i.meta?.description, i.content, (i.highlights || []).map(h => h.text).join('\n'), readText(i)];
let _ans = { k: null };
function ansHtml(items) {
  if (!window.NtsQuery || NtsQuery.intent(S.q) !== 'ask') return '';
  const ai = S.aiAns?.q === S.q ? S.aiAns : null, k = S.q + '\u0001' + items.slice(0, 8).map(i => i.id + (i.updatedAt || i.ts)).join(',');
  if (_ans.k !== k) _ans = { k, a: NtsQuery.answer(S.q, items.slice(0, 8).map(i => ({ id: i.id, texts: ansTexts(i) }))) };
  const a = _ans.a, src = id => { const i = byId(id); return i ? `<button class="f-ans-src" data-open="${esc(id)}" title="Kayda git">${ic(i.type === 'link' ? 'link' : hasVisual(i) ? 'image' : 'note', 'sm')}<span dir="auto">${esc(titleOf(i).slice(0, 48))}</span>${ic('chev', 'sm')}</button>` : ''; };
  if (!a && !ai) return '';
  const aiBtn = ai?.busy ? `<button class="btn secondary sm" disabled>${ic('spark', 'sm')}${aiName()} bakıyor…</button>`
    : ai ? '' : `<button class="btn secondary sm" data-aians title="Bulunan kayıtlarla ${esc(aiName())} cevaplasın">${ic('spark', 'sm')}${aiName()} cevaplasın</button>`;
  return `<div class="f-ans-h">${ic('check', 'sm')}<span>Cevap</span><small>${a ? 'kayıtlarından, cihazda' : ''}</small></div>`
    + (a ? `<p class="f-ans-t" dir="auto">${hl(a.text)}</p><div class="f-ans-f">${src(a.id)}${aiBtn}</div>` : `<div class="f-ans-f">${aiBtn}</div>`)
    + (ai && !ai.busy ? `<div class="f-ans-ai"><p class="f-ans-t" dir="auto">${ic('spark', 'sm')}${esc(ai.text || 'Kayıtlarında cevap yok.')}</p><div class="f-ans-f">${(ai.ids || []).slice(0, 3).map(src).join('')}</div></div>` : '');
}
async function aiAnswer() {
  const key = S.q, q = key.trim(); if (!q || S.aiAns?.busy) return;
  if (!S.bridgeOk && !(await AI.health())) return toast(claudeOff(), 3200, 'cpu');
  S.aiAns = { q: key, busy: true }; renderHits();
  try {
    const top = Find.ranked('all').top.slice(0, 12);
    const r = await AI.call('/ask', { question: `${q}\nKayıtlarıma bakarak sorunun dilinde en çok 2 kısa cümleyle cevap ver; bilmiyorsan söyle. sources alanına cevabın geldiği kayıtların id'leri, en iyisi önce.`, items: AI.pick(q, top) });
    S.aiAns = { q: key, text: (r.answer || '').trim(), ids: (r.sources || []).filter(id => byId(id)) };
  } catch (e) { S.aiAns = null; toast('Hata: ' + e.message, 3200); }
  if (S.q === key) renderHits();
}
// the Ara window's line under the results: meaning search state, and with few results the two "look by meaning" buttons
function semBar(n, q) {
  const few = (n < 5 || !!S.loose) && q.length >= 3, ai = S.aiFind?.q === S.q ? S.aiFind : null, sem = S.semIds?.size || 0;
  // 105d: it reads like a question → offer Sor (the search still runs, nothing is forced)
  const ask = !Find.ans && window.NtsQuery && NtsQuery.intent(S.q) === 'ask' ? `<button class="btn secondary sm f-askq" data-mode="ask" title="Sor moduna geç (Tab)">${ic('spark', 'sm')}Soru gibi: ${aiTo()} sor</button>` : '';
  const st = Sem.st === 'load' ? `<span class="f-sem-st">${ic('spark', 'sm')}Anlam modeli iniyor %${Sem.p}</span>`
    : Sem.st === 'ready' && Sem.left ? `<span class="f-sem-st">${ic('spark', 'sm')}Anlam dizini ${Sem.done}/${Sem.done + Sem.left}</span>`
    : sem ? `<span class="f-sem-st">${ic('spark', 'sm')}${sem} anlamca yakın</span>` : '';
  const b = few ? (Sem.on() ? '' : `<button class="btn secondary sm" data-semon title="${esc(Sem.say())}">${ic('search', 'sm')}Anlamca da ara</button>`)
    + `<button class="btn secondary sm" data-aifind${ai?.busy ? ' disabled' : ''}>${ic('spark', 'sm')}${ai?.busy ? `${aiName()} bakıyor…` : `${aiName()} ile ara`}</button>` : '';
  return st || b || ask ? st + ask + b : '';
}
// 103b: live search without redrawing the page: rows/tiles that don't match get a class and leave, the rest slide up (FLIP);
// scroll, images and everything else stay. Only when a match is not on the page yet is the view drawn once (then narrowing is classes again)
const LiveQ = {
  apply(part) { // part: hide what doesn't match even when some wanted rows are missing (they come with the redraw)
    if (S.view === 'board') return this.board();
    if (S.view === 'list') return this.page($('#list'), '.item[data-id]', listShown(visible()), part);
    if (S.view === 'gallery') return this.page($('#gallery'), '.tile[data-id]', galleryMedia(visible()), part);
    return false;
  },
  board() {
    const on = !!(S.searchOn && S.hits);
    for (const c of document.querySelectorAll('#board .bcard[data-id]:not(.sticky)')) { const h = on && S.hits.has(c.dataset.id); c.classList.toggle('hit', h); c.classList.toggle('dim', on && !h); }
    return true;
  },
  page(el, sel, want, part) {
    if (!el || (!want.length && !part)) return false; // the empty message is drawn once
    const have = new Map(); for (const n of el.querySelectorAll(sel)) have.set(n.dataset.id, n);
    const ids = new Set(); for (const i of want) { if (!have.has(i.id) && !part) return false; ids.add(i.id); }
    const anim = !reduced(), vh = innerHeight, near = r => r.bottom > -80 && r.top < vh + 80, before = new Map();
    // rows sit in content-visibility:auto groups: measuring a row of an off-screen group costs a layout each, so only rows of groups on screen
    const onScreen = () => { const out = [];
      if (el.querySelector('.group')) { for (const g of el.querySelectorAll('.group:not(.q-out)')) if (near(g.getBoundingClientRect())) out.push(...g.querySelectorAll(sel + ':not(.q-out)')); }
      else for (const n of have.values()) if (!n.classList.contains('q-out')) out.push(n);
      return out; };
    if (anim) for (const n of onScreen()) { const r = n.getBoundingClientRect(); if (near(r)) before.set(n, r); }
    const back = [];
    for (const [id, n] of have) { const out = !ids.has(id); if (!out && n.classList.contains('q-out')) back.push(n); n.classList.toggle('q-out', out); }
    for (const g of el.querySelectorAll('.group')) g.classList.toggle('q-out', !g.querySelector(sel + ':not(.q-out)'));
    let head = null, n0 = 0; // a day / month heading with nothing left under it goes too
    for (const c of el.children) {
      if (c.matches('.day,.g-month')) { if (head) head.classList.toggle('q-out', !n0); head = c; n0 = 0; }
      else if (c.matches(sel + ',.group') && !c.classList.contains('q-out')) n0++;
    }
    if (head) head.classList.toggle('q-out', !n0);
    el.classList.toggle('q-live', !!S.searchOn);
    if (anim) { // all reads first, then all writes: an animate() between two reads would force a layout per row
      const moves = [], fades = [];
      for (const [n, a] of before) { if (n.classList.contains('q-out')) continue; const b = n.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; if ((dx || dy) && near(b)) moves.push([n, dx, dy]); }
      const bk = new Set(back); for (const n of onScreen()) { if (fades.length >= 40) break; if (bk.has(n) && near(n.getBoundingClientRect())) fades.push(n); }
      for (const [n, dx, dy] of moves) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
      for (const n of fades) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    }
    return true;
  },
};
function renderAttach() {
  const el = $('#attachList');
  el.innerHTML = S.attach.map((f, k) => {
    const isImg = (f.type || '').startsWith('image');
    return `<div class="att">${isImg ? `<img data-k="${k}" alt="">` : `<span class="att-ico">${ic(fileKind({ type: 'file', mime: f.type, fileName: f.name }), 'sm')}</span>`}
      <div class="att-b"><div class="att-n">${esc(f.name)}</div><div class="att-s">${fmtSize(f.size)}</div></div>
      <button data-rm="${k}" title="Kaldır">${ic('x', 'sm')}</button></div>`;
  }).join('');
  el.querySelectorAll('img[data-k]').forEach(img => { const u = URL.createObjectURL(S.attach[+img.dataset.k]); img.onload = () => URL.revokeObjectURL(u); img.src = u; });
  if (S.attach.length && findMode()) return setMode('note'); // a file is saved, not searched for
  updateSend();
}
// 103b + 136: three modes in the one box. Left of the text: "+" (attach), then ONE mode button showing the current mode
// (icon + name); Tab (or a tap on it) moves to the next mode, the name slides in (≈180 ms). The last mode is remembered:
// ✎ Not (Enter saves; only a "N benzer kayıt" chip), 🔍 Ara (live: the page filters as you type, Enter opens the first), ✦ Sor (Enter asks the AI).
// Typing "/" or "?" first in an empty Not box switches to Ara / Sor (118); a "- " line shows the task icon on the send button.
const MODES = [['note', 'pen', 'Not'], ['find', 'search', 'Ara'], ['ask', 'spark', 'Sor']];
const findMode = () => S.mode === 'find';
const askMode = () => S.mode === 'ask' && !S.attach.length;
function renderModes(dir = 0) {
  const el = $('#modes'); if (!el) return;
  const tip = { note: 'Not: Enter kaydeder', find: 'Ara: yazdıkça bulur (/)', ask: 'Sor: ' + aiTo() + ' sorar (?)' };
  const [m, icn, l] = MODES.find(x => x[0] === S.mode) || MODES[0], nx = MODES.find(x => x[0] === nextMode());
  let b = el.querySelector('.m-b');
  if (!b) { el.innerHTML = '<button type="button" class="m-b"></button>'; b = el.firstChild; }
  const w0 = b.offsetWidth;
  b.dataset.m = m; b.title = `${tip[m]} · Tab ya da dokun: ${nx[2]}`; b.setAttribute('aria-label', `Mod: ${l}. Değiştir: ${nx[2]}`);
  b.innerHTML = `<span class="m-in">${ic(icn, 'sm')}<span>${l}</span></span>`;
  if (!dir || reduced() || !b.animate) return;
  const w1 = b.offsetWidth, ease = 'cubic-bezier(.2,.8,.2,1)'; // the button grows/shrinks to the new name, the name slides up into place
  if (w0 && w0 !== w1) b.animate([{ width: w0 + 'px' }, { width: w1 + 'px' }], { duration: 180, easing: ease });
  b.firstChild.animate([{ transform: `translateY(${dir > 0 ? 70 : -70}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: ease });
}
function setMode(m) {
  if (!MODES.some(x => x[0] === m)) m = 'note';
  const was = S.mode, inp = $('#input'); S.mode = m; try { localStorage.setItem('hn-mode', m); } catch { }
  const d = (MODES.findIndex(x => x[0] === m) - MODES.findIndex(x => x[0] === was) + 3) % 3;
  renderModes(was === m ? 0 : d === 2 ? -1 : 1); S.hitSel = -1; S.hitsOff = false;
  if (m === 'find' && document.activeElement === inp) S.sugOn = true; // 104e: suggestions when the box is empty
  if (was !== m) { S.q = inp.value.length < 200 ? inp.value : ''; S.searchOn = findMode() && !!S.q.trim(); runSearch(); render(); }
  updateSend();
}
const nextMode = (d = 1) => MODES[(MODES.findIndex(x => x[0] === S.mode) + d + MODES.length) % MODES.length][0];
const updateSend = () => {
  const v = $('#input').value.trim(), ask = askMode(), find = findMode(), b = $('#saveBtn'), phone = narrow();
  // 105e: in Ara with an empty box (or while listening) the mic takes the send button's place; 105f: "+" in Ara picks a picture to search with
  // 95a: in Not with an empty box the same mic records a voice note
  const vo = Voice.on, vn = !find && !ask && Voice.here() && !v && !S.attach.length;
  const mic = $('#micBtn'), useMic = vo || vn || (!!Mic.SR && find && (!v || Mic.on)), lg = Mic.lang();
  if (mic.hidden === useMic) { mic.hidden = !useMic; b.hidden = useMic; }
  mic.classList.toggle('on', Mic.on || vo); mic.classList.toggle('rec', vo); const mt = vo ? 'Sesli notu kaydet' : vn ? 'Sesli not: basılı tut ya da dokun' : Mic.on ? 'Dinlemeyi durdur' : `Sesle ara (${MIC_L.find(x => x[0] === lg)[1]})`; if (mic.title !== mt) { mic.title = mt; mic.setAttribute('aria-label', mt); mic.setAttribute('aria-pressed', Mic.on || vo); }
  const fi = $('#fileInput'), cl = fi.closest('label'), ct = find ? 'Resimle ara' : 'Dosya ekle'; if (cl.title !== ct) { cl.title = ct; cl.setAttribute('aria-label', ct); fi.accept = find ? 'image/*' : ''; fi.multiple = !find; }
  b.disabled = find ? !Find.top.length : !ask && !v && !S.attach.length;
  const icn = ask ? 'spark' : find ? 'search' : !S.attach.length && TODO_LINE.test(v) ? 'todo' : 'up'; // 118: the button says what Enter will do
  const key = icn + phone;
  if (b.dataset.k !== key) {
    b.dataset.k = key; b.classList.toggle('ask', ask);
    b.innerHTML = ic(icn, 'sm'); b.classList.add('round'); // 136: the mode button already says "Sor"
    const lbl = ask ? aiTo() + ' sor' : find ? 'İlk sonucu aç' : icn === 'todo' ? 'Görev olarak kaydet' : 'Kaydet';
    b.setAttribute('aria-label', lbl); b.title = lbl + ' (Enter) · Tab: sonraki mod';
    $('#composer').classList.toggle('ask-mode', ask); $('#composer').classList.toggle('find-mode', find);
    $('#input').placeholder = ask ? 'Sor…' : find ? 'Ara…' : 'Not yaz…'; // 136: short, only the current mode
  }
  // Not mode: a chip "4 benzer kayıt" (so the same thing isn't saved twice) → Ara; on a phone (no Tab key) also the way to Sor
  // 136: the mode button already says the mode, so no "soruyorsun" line and no Tab/Esc key hints here
  const h = $('#cHint'), n = S.mode === 'note' && v && !S.attach.length ? S.hits?.size || 0 : 0;
  const tip = vo ? 'voice' + lg : Mic.on ? 'mic' + lg : S.mode !== 'note' || S.attach.length ? '' : [n ? 'sim' + n : '', isQuestion(v) ? 'ask' : ''].filter(Boolean).join(' ');
  if (h.dataset.k !== tip) {
    h.dataset.k = tip; h.hidden = !tip;
    const chips = MIC_L.map(([l, t]) => `<button data-mic="${l}" class="${l === lg ? 'on' : ''}" aria-pressed="${l === lg}" title="Konuşma dili">${t}</button>`).join('');
    h.innerHTML = vo ? `<span class="mic-live rec" role="status"><i></i><span class="vl">Kaydediyorum</span> <b id="vTime">0:00</b></span>${chips}<button data-vx class="vx">İptal</button>` : Mic.on ? `<span class="mic-live" role="status"><i></i>Dinliyorum…</span>${MIC_L.map(([l, t]) => `<button data-mic="${l}" class="${l === lg ? 'on' : ''}" aria-pressed="${l === lg}" title="Konuşma dili">${t}</button>`).join('')}` : (n ? `<button data-mode="find" class="sim">${ic('search', 'sm')}${n} benzer kayıt</button>` : '') + (tip.includes('ask') ? `<button data-mode="ask">${ic('spark', 'sm')}${aiTo()} sor</button>` : '');
  }
};
const submitBox = () => { const v = $('#input').value; if (findMode()) return Find.open(Math.max(0, S.hitSel)); if (askMode()) { const q = v.trim(); q ? AI.ask(q) : AI.suggest(); } else save(); };
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
  const rem = !files.length && NtsWhen.remindOf(text); // 107e: "yarın 9'da annemi ara" → a task with a reminder
  if (rem) return Remind.make(text, rem);
  let r; try { r = await addFromInput({ text, files }); }
  catch (e) { console.warn('save', e); if (!inp.value.trim()) inp.value = text; S.attach = [...files, ...S.attach]; renderAttach(); autoGrow(); return toast('Kaydedilemedi: ' + e.message, 5000, 'x'); } // 109c: nothing typed is lost
  render();
  if (r !== 'dup') { haptic(); toast(files.length ? `${files.length} dosya kaydedildi` : 'Kaydedildi', 1600, 'mark'); Motion.hop(); } // 142 m6-A
}
function autoGrow() { const t = $('#input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, innerHeight * .4) + 'px'; updateSend(); }

// ---------- 94: native feel - the item window grows out of the tapped card and shrinks back; short haptic ticks ----------
function reduced() { return document.documentElement.hasAttribute('data-rm') || matchMedia('(prefers-reduced-motion: reduce)').matches; } // 107k: the app's own switch too
const haptic = (ms = 8) => { try { if (matchMedia('(pointer: coarse)').matches && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(ms); } catch { } }; // 107b: opened from the widget (?do=voice) there is no tap yet → Chrome blocks vibrate with a console error
// ---------- 142: signature motion (owner's picks, design/motion-choices.json). transform / opacity only; reduced motion → none ----------
const Motion = {
  off: () => reduced() || !document.body.animate,
  EASE: 'cubic-bezier(.2,.8,.2,1)', SPR: 'linear(0, .45 12%, .86 25%, 1.03 38%, 1.04 46%, 1.01 60%, 1)',
  // m1-A (+ a soft m1-B): a held board card grows 4 %, leans with the pointer's speed (≤ 6°) from where it was grabbed and,
  // when the hand stops, swings back once (about half as far as the old pendulum sample) and rests
  hold(card, gx, gy) {
    this.drop(); if (this.off()) return;
    const h = this.h = { card, ang: 0, av: 0, vx: 0, lx: null, lt: 0, on: true, raf: 0 };
    card.style.transformOrigin = `${Math.round(gx)}px ${Math.round(gy)}px`;
    const tick = () => { h.vx *= .86; const target = h.on ? Math.max(-6, Math.min(6, h.vx * 9)) : 0;
      h.av = (h.av + (target - h.ang) * .1) * .74; h.ang += h.av; card.style.setProperty('--tilt', h.ang.toFixed(2) + 'deg');
      if (h.on || Math.abs(h.ang) > .05 || Math.abs(h.av) > .05) h.raf = requestAnimationFrame(tick); else card.style.removeProperty('--tilt'); };
    h.raf = requestAnimationFrame(tick);
  },
  move(x) { const h = this.h; if (!h) return; const t = performance.now(); if (h.lx != null) h.vx = h.vx * .5 + (x - h.lx) / Math.max(8, t - h.lt) * .5; h.lx = x; h.lt = t; },
  // m3-D, calm: the card settles from its lean, one accent light runs over it, three small sparks (300 ms)
  drop(card) {
    const h = this.h; this.h = null; if (h) { cancelAnimationFrame(h.raf); h.card.style.removeProperty('--tilt'); }
    if (!card || this.off()) return;
    const ang = h?.card === card ? h.ang : 0;
    card.animate([{ transform: `rotate(${ang}deg) scale(1.04)` }, { transform: 'none' }], { duration: 380, easing: this.SPR });
    const sh = document.createElement('i'); sh.className = 'mo-sheen'; card.appendChild(sh); setTimeout(() => sh.remove(), 520);
    const w = card.offsetWidth, x0 = card.offsetLeft, y0 = card.offsetTop;
    [[w, 0, 1, -1], [0, 0, -1, -1], [w * .5, card.offsetHeight, 0, 1]].forEach(([x, y, sx, sy], n) => {
      const p = document.createElement('i'); p.className = 'mo-spark'; p.style.left = x0 + x - 3 + 'px'; p.style.top = y0 + y - 3 + 'px'; card.parentNode.appendChild(p);
      p.animate([{ transform: 'none', opacity: .9 }, { transform: `translate(${sx * 10}px,${sy * 10}px) scale(.2)`, opacity: 0 }], { duration: 300, delay: 90 + n * 20, easing: this.EASE, fill: 'backwards' }).onfinish = () => p.remove(); });
  },
  // m2-A + m2-B for lists sorted by hand (to-dos): the row floats with the finger, a faint dashed ghost marks where it will land and
  // breathes slowly in the accent (1.6 s); the other rows make room in 240 ms; on release the row glides into the gap
  sort(row, e, done) {
    const list = row.parentElement, r0 = row.getBoundingClientRect(), y0 = e.clientY, off = this.off();
    const slot = document.createElement('div'); slot.className = 'mo-slot' + (off ? ' still' : ''); slot.style.height = r0.height + 'px';
    const ghost = row.cloneNode(true); ghost.removeAttribute('data-tid'); ghost.className += ' mo-ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true; slot.appendChild(ghost);
    if (getComputedStyle(list).position === 'static') list.style.position = 'relative';
    row.before(slot); row.classList.add('dragging', 'mo-float'); row.style.width = r0.width + 'px'; row.style.top = (r0.top - list.getBoundingClientRect().top) + 'px';
    let moved = false;
    const flip = fn => { const kids = [...list.children].filter(k => k !== row), a = new Map(kids.map(k => [k, k.getBoundingClientRect().top])); fn();
      if (!off) kids.forEach(k => { const d = a.get(k) - k.getBoundingClientRect().top; if (d) k.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 240, easing: this.EASE }); }); };
    const mv = ev => { const dy = ev.clientY - y0; if (!moved && Math.abs(dy) < 3) return; moved = true; row.style.transform = `translateY(${dy}px)` + (off ? '' : ' scale(1.02)');
      const cy = r0.top + r0.height / 2 + dy, rows = [...list.children].filter(k => k !== row && k !== slot);
      const after = rows.find(k => { const b = k.getBoundingClientRect(); return cy < b.top + b.height / 2; }) || null;
      let nx = slot.nextElementSibling; if (nx === row) nx = nx.nextElementSibling; if (nx === after) return;
      flip(() => list.insertBefore(slot, after)); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      const a = row.getBoundingClientRect(); slot.replaceWith(row); row.classList.remove('mo-float'); row.style.cssText = '';
      const b = row.getBoundingClientRect(); if (!off && moved) row.animate([{ transform: `translateY(${a.top - b.top}px) scale(1.02)` }, { transform: 'none' }], { duration: 240, easing: this.EASE });
      setTimeout(() => row.classList.remove('dragging'), off || !moved ? 0 : 240); done(moved); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  // m3-C: things put somewhere shrink into the target, the target gulps and its count ticks
  eat(els, target, n) {
    if (!target?.offsetParent) return; const t = target.getBoundingClientRect(), tx = t.left + t.width / 2, ty = t.top + t.height / 2;
    if (!this.off()) els.filter(el => el?.isConnected && el.getBoundingClientRect().bottom > 0).slice(0, 6).forEach((el, k) => {
      const r = el.getBoundingClientRect(), c = el.cloneNode(true); c.inert = true; c.className += ' mo-fly'; Object.assign(c.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      document.body.appendChild(c); c.animate([{ transform: 'none', opacity: .95 }, { transform: `translate(${tx - r.left - r.width / 2}px,${ty - r.top - r.height / 2}px) scale(.1)`, opacity: 0 }], { duration: 320, delay: k * 40, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'both' }).onfinish = () => c.remove(); });
    const gulp = () => { if (!this.off()) target.animate([{ transform: 'none' }, { transform: 'scale(1.12)', offset: .35 }, { transform: 'scale(.97)', offset: .7 }, { transform: 'none' }], 380);
      if (n) { target.querySelector('.mo-n')?.remove(); const b = document.createElement('b'); b.className = 'mo-n'; b.textContent = '+' + n; target.appendChild(b); setTimeout(() => b.remove(), 1400); }
      haptic(10); };
    this.off() ? gulp() : setTimeout(gulp, 330);
  },
  // m4-B: files dropped from outside fly from the drop point on an arc into the box, each becomes its chip as it lands
  fly(x, y, chips) {
    if (this.off() || !chips.length) return;
    chips.forEach((c, k) => { const r = c.getBoundingClientRect(), tx = r.left + 18 - x, ty = r.top + r.height / 2 - y, mx = tx / 2, my = Math.min(ty, 0) / 2 - 60;
      const f = document.createElement('div'); f.className = 'mo-file'; f.innerHTML = c.querySelector('.att-ico')?.innerHTML || ic('image', 'sm'); f.style.left = x + 'px'; f.style.top = y + 'px'; document.body.appendChild(f);
      c.style.opacity = 0;
      f.animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: `translate(${mx * .5}px,${my * .6}px) scale(1.1)`, opacity: 1, offset: .2 }, { transform: `translate(${mx}px,${my}px)`, offset: .5 }, { transform: `translate(${tx}px,${ty}px) scale(.9)`, opacity: 1 }],
        { duration: 520, delay: k * 90, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'both' }).onfinish = () => { f.remove(); c.style.opacity = ''; c.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: this.SPR }); }; });
  },
  // m6-A: saved → the logo's dot hops (the mark squashes under it), the toast's little mark pops its dot
  hop() {
    if (this.off()) return;
    for (const m of document.querySelectorAll('.mark')) { if (!m.offsetParent) continue; const d = m.querySelector('.mk-d'), s = m.querySelector('svg'); if (!d || !s) continue;
      d.style.transformBox = 'fill-box'; d.style.transformOrigin = '50% 100%'; s.style.transformOrigin = '50% 90%';
      d.animate([{ transform: 'none' }, { transform: 'translateY(4px) scale(1.1,.85)', offset: .12 }, { transform: 'translateY(-26px) scale(.95,1.08)', offset: .45 }, { transform: 'translateY(0) scale(1.15,.85)', offset: .78 }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.3,0,.3,1)' });
      s.animate([{ transform: 'none' }, { transform: 'scale(1.04,.94)', offset: .12 }, { transform: 'scale(.98,1.02)', offset: .4 }, { transform: 'scale(1.03,.97)', offset: .8 }, { transform: 'none' }], 620); }
  },
  // m6-C, redone: a new link → a dot slides from card to card along the link's own curve (108), then one calm ring on the far card
  linked(a, b, tries = 12) {
    if (this.off() || S.view !== 'board') return;
    const p = $('#wires')?.querySelector(`path[data-a="${CSS.escape(a)}"][data-b="${CSS.escape(b)}"],path[data-a="${CSS.escape(b)}"][data-b="${CSS.escape(a)}"]`);
    if (!p) { if (tries) setTimeout(() => this.linked(a, b, tries - 1), 60); return; }
    const rev = p.dataset.a !== a, d = p.getAttribute('d'), plane = $('#plane'), dot = document.createElement('i'); dot.className = 'mo-dot'; dot.style.offsetPath = `path("${d}")`; plane.appendChild(dot);
    const k = rev ? ['100%', '0%'] : ['0%', '100%'];
    dot.animate([{ offsetDistance: k[0], opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none', offset: .15 }, { opacity: 1, offset: .85 }, { offsetDistance: k[1], opacity: 0, transform: 'scale(.6)' }], { duration: 640, easing: 'cubic-bezier(.45,0,.25,1)' }).onfinish = () => {
      dot.remove(); const c = plane.querySelector(`.bcard[data-id="${CSS.escape(b)}"]`); if (!c) return; haptic(12);
      const r = document.createElement('i'); r.className = 'mo-ring'; Object.assign(r.style, { left: c.offsetLeft - 3 + 'px', top: c.offsetTop - 3 + 'px', width: c.offsetWidth + 6 + 'px', height: c.offsetHeight + 6 + 'px' }); plane.appendChild(r);
      r.animate([{ transform: 'scale(1)', opacity: .7 }, { transform: 'scale(1.06)', opacity: 0 }], { duration: 560, easing: this.EASE }).onfinish = () => r.remove(); };
  },
};
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
    if (dlg._dragged) return dlg.close(); // 141: already swiped off the screen by the finger
    if (reduced() || !dlg.animate) return dlg.close();
    const el = dlg._src && this.src(dlg._src); dlg._closing = true; dlg.classList.add('morph', 'shut');
    const to = el ? { transform: this.frames(dlg, el), opacity: 0 } : { transform: 'translateY(24px)', opacity: 0 };
    const a = dlg._shut = dlg.animate([{ transform: 'none', opacity: 1 }, to], { duration: el ? 200 : 160, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    a.finished.catch(() => { }).finally(() => { if (dlg._shut !== a) return; dlg._shut = null; dlg._closing = false; dlg.close(); dlg.getAnimations().forEach(x => x.cancel()); dlg.classList.remove('morph', 'shut'); });
  },
  revive(dlg) { // 102: opened again while it was shrinking away → stop the shrink, stay open (the old close must not shut the new window)
    const a = dlg._shut; if (!a) return; dlg._shut = null; dlg._closing = false; a.cancel(); dlg.classList.remove('shut');
  },
};

// ---------- 141: native feel: one tooltip for every button, swipe a sheet down to close, "?" lists the keys ----------
const Native = {
  init() { this.tips(); this.sheets(); this.keys(); },
  // Tooltip: the browser's own title tip is slow, plain and never on the keyboard. Every [title] becomes data-ti (aria-label kept),
  // shows after 450 ms, moves instantly to the next button while one is up, and hides on press / scroll / typing. Mouse only.
  tips() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const tip = this.tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
    let timer = 0, cur = null, lastHide = 0;
    const adopt = el => { const t = el.getAttribute('title'); if (!t) return; el.removeAttribute('title'); el.dataset.ti = t;
      if (!el.hasAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', t); };
    const place = el => { const r = el.getBoundingClientRect(); tip.textContent = el.dataset.ti; tip.hidden = false; tip.classList.remove('in');
      const w = tip.offsetWidth, h = tip.offsetHeight, below = r.bottom + h + 10 < innerHeight;
      tip.style.left = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 6)) + 'px'; tip.style.top = (below ? r.bottom + 7 : r.top - h - 7) + 'px';
      tip.dataset.side = below ? 'b' : 't'; tip.style.translate = ''; tip.style.setProperty('--ax', Math.round(r.left + r.width / 2 - tip.offsetLeft) + 'px'); requestAnimationFrame(() => tip.classList.add('in')); };
    const hide = () => { clearTimeout(timer); if (!tip.hidden) lastHide = performance.now(); cur = null; tip.hidden = true; tip.classList.remove('in'); };
    const show = (el, fast) => { clearTimeout(timer); cur = el; const go = () => { if (cur === el && el.isConnected && el.dataset.ti && el.getAttribute('aria-expanded') !== 'true') place(el); }; // 146: no tip over its own open list
      fast || performance.now() - lastHide < 300 ? go() : (timer = setTimeout(go, 450)); };
    document.addEventListener('pointerover', e => {
      const el = e.target.closest?.('[title],[data-ti]'); if (el?.hasAttribute('title')) adopt(el);
      if (!el?.dataset.ti || el.closest('.rail,.rail-tab')) { if (cur && !cur.contains(e.target)) hide(); return; } // the rail has its own side tips
      if (el !== cur) { const wasUp = !tip.hidden; hide(); show(el, wasUp); }
    });
    // 142 m5-B: the little arrow follows the pointer inside the button and the bubble leans a few px toward it
    document.addEventListener('pointermove', e => { if (!cur || tip.hidden || !cur.contains(e.target) || reduced()) return; const w = tip.offsetWidth, r = cur.getBoundingClientRect();
      const lean = Math.max(-6, Math.min(6, (e.clientX - (r.left + r.width / 2)) * .25)), x0 = tip.offsetLeft + lean;
      tip.style.translate = lean.toFixed(1) + 'px 0'; tip.style.setProperty('--ax', Math.round(Math.max(10, Math.min(w - 10, e.clientX - x0))) + 'px'); }, { passive: true });
    document.addEventListener('focusin', e => { const el = e.target.closest?.('[title],[data-ti]'); if (!el || !el.matches(':focus-visible')) return; if (el.hasAttribute('title')) adopt(el); if (el.dataset.ti && !el.closest('.rail,.rail-tab')) show(el, true); });
    document.addEventListener('focusout', () => { if (!cur?.matches(':hover')) hide(); });
    for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, hide, { capture: true, passive: true });
    addEventListener('scroll', hide, true);
  },
  // Phone sheets: a grab bar on top; pull the sheet down (from the bar, or anywhere once its content is scrolled to the top) and let go
  // past a third of it, or flick it, to close, exactly like Esc / the back button. Less than that springs back.
  sheets() {
    let d = null, y0 = 0, t0 = 0, dy = 0, on = false;
    const scrolledIn = (el, dlg) => { for (let n = el; n && n !== dlg.parentNode; n = n.parentElement) if (n.scrollTop > 0) return true; return false; };
    document.addEventListener('touchstart', e => {
      const dlg = e.target.closest?.('dialog.drawer[open]'); d = null; on = false;
      if (!dlg || innerWidth >= 900 || e.touches.length > 1 || dlg._closing || e.target.closest('input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"],.sim-row,.rp-pages,canvas')) return;
      const top = e.touches[0].clientY - dlg.getBoundingClientRect().top;
      if (top > 44 && scrolledIn(e.target, dlg)) return; d = dlg; y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (!d) return; dy = e.touches[0].clientY - y0;
      if (!on) { if (dy < -4) { d = null; return; } if (dy < 10) return; on = true; d.style.transition = 'none'; }
      if (e.cancelable) e.preventDefault(); d.style.transform = `translateY(${Math.max(0, dy - 10)}px)`;
    }, { passive: false });
    document.addEventListener('touchend', () => {
      const dlg = d; d = null; if (!dlg || !on) return; on = false;
      const h = dlg.offsetHeight, v = dy / Math.max(1, performance.now() - t0), shut = dy > h / 3 || (v > .6 && dy > 40);
      dlg.style.transition = ''; dlg.style.transform = '';
      if (!shut) { if (!reduced()) dlg.animate([{ transform: `translateY(${Math.max(0, dy - 10)}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
      haptic(8); dlg._dragged = true;
      const out = reduced() ? null : dlg.animate([{ transform: `translateY(${Math.max(0, dy - 10)}px)` }, { transform: `translateY(${h + 40}px)` }], { duration: 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
      const fin = () => { const ev = new Event('cancel', { cancelable: true }); if (dlg.dispatchEvent(ev) && dlg.open) dlg.close(); dlg._dragged = false; out?.cancel(); };
      out ? out.finished.then(fin, fin) : fin();
    });
  },
  // "?" (or the settings row): every keyboard shortcut in one short list
  keys() {
    addEventListener('keydown', e => { if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') || document.querySelector('dialog[open]')) return; e.preventDefault(); this.keysOpen(); });
  },
  keysOpen() {
    let d = $('#keys');
    if (!d) { d = document.createElement('dialog'); d.id = 'keys'; d.className = 'drawer modal narrow'; d.setAttribute('aria-label', 'Klavye kısayolları'); document.body.appendChild(d);
      d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-x]')) d.close(); });
      d.addEventListener('close', () => { if (!d._fromBack && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; }); }
    const k = (...a) => a.map(x => `<kbd>${x}</kbd>`).join(' '), mod = /Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl';
    const G = [['Genel', [[k('/'), 'Ara'], [k('N'), 'Kutuya yaz'], [k(mod, 'K'), 'Komut paleti'], [k('Tab'), 'Kutuda mod: Not · Ara · Sor'], [k('['), 'Kenar çubuğunu aç / kapat'], [k(mod, 'Z'), 'Geri al'], [k('Shift', 'F10'), 'Seçili kaydın menüsü'], [k('Esc'), 'Kapat / vazgeç'], [k('?'), 'Bu liste']]],
      ['Arama sonuçları', [[k('↑') + ' ' + k('↓'), 'Sonuçlarda gez'], [k('Enter'), 'Aç'], [k('Tab'), 'Tamamla']]],
      ['Pano', TOOLS.map(t => [k(t[3].toUpperCase()), t[2].replace(/ \(.\)$/, '')]).concat([[k('Boşluk') + ' + sürükle', 'Kaydır'], [k('Shift', '1'), 'Hepsini sığdır'], [k('Shift', '0'), '%100'], [k(mod, 'A'), 'Hepsini seç'], [k('Delete'), 'Seçilenleri sil'], [k(mod, 'Z') + ' / ' + k(mod, 'Y'), 'Çizimi geri al / yinele']])],
      ['Pencereler', [[k('←') + ' ' + k('→'), 'Önceki / sonraki sayfa'], [k('Esc'), 'Pencereyi kapat']]]];
    d.innerHTML = `<div class="d-body keys" tabindex="-1"><div class="d-head"><span class="type">${ic('kbd', 'sm')}Klavye kısayolları</span><span class="sp"></span><button class="icon-btn sm" data-x title="Kapat (Esc)" aria-label="Kapat">${ic('x', 'sm')}</button></div>`
      + G.map(([h, rows]) => `<section><h3>${h}</h3><dl>${rows.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl></section>`).join('') + '</div>';
    Back.open(d);
  },
};


// ---------- 95e: Ctrl+K command palette — every action, board, tag and item from one box ----------
const Cmd = {
  sel: 0, rows: [], RK: 'hn-cmd-recent',
  // [id, icon, label, extra words to match (en/tr), run, shortcut hint, shown only when]
  base() {
    const mod = /Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl', dark = document.documentElement.dataset.theme !== 'light', bd = S.view === 'board';
    const later = f => () => setTimeout(f, 260); // another window opens: let this one's history entry go first
    return [
      ['v-board', 'board', 'Pano görünümü', 'board canvas view', () => setView('board'), '', S.view !== 'board'],
      ['v-list', 'list', 'Liste görünümü', 'list view', () => setView('list'), '', S.view !== 'list'],
      ['v-gallery', 'grid', 'Galeri görünümü', 'gallery images resimler view', () => setView('gallery'), '', S.view !== 'gallery'],
      ['v-cal', 'cal', 'Takvim görünümü', 'calendar month ay takvim view تقويم', () => setView('cal'), '', S.view !== 'cal'],
      ['v-todo', 'todo', 'Yapılacaklar', 'todo tasks görevler', () => setView('todo'), '', S.view !== 'todo'],
      ['m-note', 'pen', 'Yeni not yaz', 'new note ekle kaydet', () => { setMode('note'); $('#input').focus(); }, 'N'],
      ['m-find', 'search', 'Ara', 'search find bul', () => { setMode('find'); $('#input').focus(); }, '/'],
      ['m-ask', 'spark', 'Yapay zekâya sor', 'ask ai claude soru', () => { setMode('ask'); $('#input').focus(); }],
      ['rail', 'layers', 'Kenar çubuğunu aç / kapat', 'sidebar rail', () => Rail.fold(), '['],
      ['fit', 'fit', 'Panoda hepsini sığdır', 'fit all zoom', () => Board.fit(), 'Shift 1', bd],
      ['z100', 'search', 'Panoda %100 yakınlık', 'zoom reset 100', () => Board.zoomTo(1), 'Shift 0', bd],
      ['newboard', 'plus', 'Yeni pano…', 'new board', later(() => { if (S.view !== 'board') setView('board'); const b = $('#boardBtn'); Board.boardMenu(b); setTimeout(() => $('#boardPop .new-board input')?.focus(), 50); })],
      ['unfilter', 'x', 'Süzgeçleri temizle', 'clear filters reset', () => { if (S.folder) return Folders.close(); Object.assign(S.filter, { type: 'all', tag: null, star: false, list: null, color: null, src: null }); render(); }, '', !!(S.folder || S.filter.tag || S.filter.star || S.filter.list || S.filter.color || S.filter.src || S.filter.type !== 'all')],
      ['star', 'star', 'Yıldızlılar', 'starred favorites', () => { Object.assign(S.filter, { star: true }); if (S.view === 'todo') setView('list'); else render(); }],
      ['theme', dark ? 'sun' : 'moon', dark ? 'Açık temaya geç' : 'Koyu temaya geç', 'theme dark light tema', () => setTheme(dark ? 'light' : 'dark')],
      ['settings', 'settings', 'Ayarlar', 'settings preferences', later(() => openSettings())],
      ['a11y', 'eye', 'Erişilebilirlik', 'accessibility yazı boyutu kontrast font size contrast hareket motion إمكانية الوصول', later(() => openSettings('a11y'))],
      ['keys', 'kbd', 'Klavye kısayolları', 'keyboard shortcuts', later(() => Native.keysOpen()), '?'],
      ['sync', 'cloud', 'Şimdi eşitle', 'sync now senkron', () => { Sync.run(); toast('Eşitleniyor…', 1500, 'cloud'); }],
      ['export', 'down', 'Yedeği indir', 'export backup download json', () => exportBackup()],
      ['exportmd', 'down', 'Markdown olarak dışa aktar', 'export markdown obsidian', () => exportMarkdown()],
      ['obsidian', 'layers', 'Obsidian klasörüyle eşitle', 'obsidian vault markdown klasör folder sync eşitle', later(() => openSettings('obsidian'))],
      ['boardpdf', 'down', 'Panoyu PDF olarak kaydet', 'pdf board pano yazdır print export', () => BoardPdf.save()],
      ['import', 'upload', 'Yedekten geri yükle…', 'import restore backup', () => $('#backupInput').click()],
      ['wa', 'chat', 'WhatsApp sohbeti içe aktar…', 'import whatsapp zip', () => $('#waInput').click()],
      ['bm', 'book', 'Yer imlerini içe aktar…', 'import bookmarks html', () => $('#bmInput').click()],
      ['mig', 'layers', 'Başka uygulamadan taşı…', 'import google keep apple notes notion evernote telegram enex taşı', later(() => Mig.open())],
      ['organize', 'spark', 'Yapay zekâ ile düzenle', 'organize ai tidy', async () => { if (await AI.health()) { AI.process(); toast(aiName() + ' düzenliyor', 2000, 'spark'); } else toast(claudeOff(), 3000, 'cpu'); }],
      ['tags', 'hash', 'Etiketleri toparla', 'clean tags merge', () => AI.cleanTags()],
      ['tour', 'eye', 'Tanıtımı yeniden göster', 'tour onboarding help yardım', later(() => Tour.start())],
    ].filter(c => c[6] === undefined || c[6]).map(([id, icn, label, kw, run, key]) => ({ id, icn, label, kw, run, key: key ? key.split(' ').map(k => `<kbd>${k}</kbd>`).join('') : '', grp: 'Komutlar' }));
  },
  // 0 = no match; higher is better: start of the label > start of a word > inside > letters in order
  score(f, q) {
    if (!q) return 1; const i = f.indexOf(q);
    if (i === 0) return 100 - f.length / 100; if (i > 0) return (/[\s#/·-]/.test(f[i - 1]) ? 80 : 50) - f.length / 100;
    let j = 0, gaps = 0, last = -1; for (let k = 0; k < f.length && j < q.length; k++) if (f[k] === q[j]) { if (last >= 0 && k - last > 1) gaps++; last = k; j++; }
    return j === q.length && q.length >= 3 && gaps <= 1 ? 20 - gaps * 8 : 0; // a typo-ish jump at most once
  },
  fold: s => NtsQuery.fold(s),
  _tf: new WeakMap(),
  build(q) {
    const fq = this.fold(q.trim()), rec = this.recent(), out = [];
    const cmds = this.base().map(c => ({ ...c, s: Math.max(this.score(this.fold(c.label), fq), fq && this.fold(c.kw).includes(fq) ? this.score(this.fold(c.kw), fq) * .8 : 0) })).map(c => (c.s && rec.includes(c.id) && (c.s += fq ? 3 : 40 - rec.indexOf(c.id)), c)).filter(c => c.s > 0);
    cmds.sort((a, b) => b.s - a.s); if (!fq) return cmds.slice(0, 9);
    out.push(...cmds.slice(0, 8));
    const boards = [['main', 'Genel'], ...boardNames().map(n => [n, n])].map(([n, l]) => ({ id: 'b:' + n, icn: n === 'main' ? 'board' : 'folder', label: 'Pano: ' + l, grp: 'Panolar', s: Math.max(this.score(this.fold(l), fq), this.score(this.fold('pano board ' + l), fq) * .7), run: () => { Board.go(n); if (S.view !== 'board') setView('board'); } })).filter(c => c.s > 0);
    out.push(...boards.sort((a, b) => b.s - a.s).slice(0, 4));
    const tags = [...facets().tag].map(([t, n]) => ({ id: 't:' + t, icn: 'hash', label: '#' + t, note: n, grp: 'Etiketler', s: this.score(this.fold(t), fq.replace(/^#/, '')), run: () => { S.filter.tag = t; if (S.view === 'todo') setView('list'); else render(); } })).filter(c => c.s > 0);
    out.push(...tags.sort((a, b) => b.s - a.s || b.note - a.note).slice(0, 4));
    if (fq.length >= 2) { // items by title: kept to the best 6, titles folded once per item object
      const best = [];
      for (const i of S.items) { if (i.deleted || hid(i)) continue;
        let f = this._tf.get(i); if (f === undefined) { f = this.fold(titleOf(i)).slice(0, 200); this._tf.set(i, f); }
        const s = f && f.includes(fq) ? this.score(f, fq) + (i.ts || 0) / 1e15 : 0; if (!s) continue;
        if (best.length < 6 || s > best[5].s) { best.push({ i, s }); best.sort((a, b) => b.s - a.s); if (best.length > 6) best.pop(); } }
      out.push(...best.map(({ i, s }) => ({ s, id: 'i:' + i.id, icn: I[i.type] ? i.type : 'note', label: titleOf(i), grp: 'Kayıtlar', note: i.ts ? shortDay(dayKey(i.ts)) : undefined, run: () => openItem(i.id), noRec: true })));
      out.push({ id: 'q', icn: 'search', label: `“${q.trim()}” için her yerde ara`, grp: 'Ara', noRec: true, run: () => { setMode('find'); const inp = $('#input'); inp.value = q.trim(); inp.dispatchEvent(new Event('input', { bubbles: true })); inp.focus(); } });
    }
    const top = new Map(); for (const r of out) if (r.grp !== 'Ara') top.set(r.grp, Math.max(top.get(r.grp) || 0, r.s || 0)); // groups follow their best match
    return out.map((r, k) => [r, k]).sort(([a, x], [b, y]) => (a.grp === 'Ara') - (b.grp === 'Ara') || (top.get(b.grp) || 0) - (top.get(a.grp) || 0) || x - y).map(([r]) => r);
  },
  recent() { try { return JSON.parse(localStorage.getItem(this.RK) || '[]'); } catch { return []; } },
  remember(id) { try { localStorage.setItem(this.RK, JSON.stringify([id, ...this.recent().filter(x => x !== id)].slice(0, 6))); } catch { } },
  paint() {
    const d = $('#cmdk'), q = d.querySelector('input').value; this.rows = this.build(q); this.sel = Math.min(this.sel, Math.max(0, this.rows.length - 1));
    let g = ''; const L = d.querySelector('.ck-list');
    L.innerHTML = this.rows.length ? this.rows.map((r, k) => { const h = r.grp !== g ? `<li class="ck-h" role="presentation">${r.grp}</li>` : ''; g = r.grp;
      return h + `<li role="option" id="ck${k}" data-k="${k}" aria-selected="${k === this.sel}" class="${k === this.sel ? 'on' : ''}">${ic(r.icn, 'sm')}<span class="lbl">${esc(r.label)}</span>${r.note !== undefined ? `<span class="n">${esc(r.note)}</span>` : ''}${r.key ? `<span class="k">${r.key}</span>` : ''}</li>`; }).join('')
      : `<li class="ck-empty" role="presentation">Bir şey bulunamadı</li>`;
    d.querySelector('input').setAttribute('aria-activedescendant', this.rows.length ? 'ck' + this.sel : '');
  },
  move(n) { if (!this.rows.length) return; this.sel = (this.sel + n + this.rows.length) % this.rows.length; const L = $('#cmdk .ck-list');
    L.querySelectorAll('[aria-selected]').forEach(e => { const on = +e.dataset.k === this.sel; e.classList.toggle('on', on); e.setAttribute('aria-selected', on); });
    $('#cmdk input').setAttribute('aria-activedescendant', 'ck' + this.sel); L.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); },
  run(k) {
    const r = this.rows[k], d = $('#cmdk'); if (!r) return; if (!r.noRec) this.remember(r.id);
    d.close(); const go = () => Back._skip ? setTimeout(go, 16) : r.run(); go(); // wait until the palette's history entry is gone
  },
  open() {
    let d = $('#cmdk');
    if (!d) { d = document.createElement('dialog'); d.id = 'cmdk'; d.className = 'cmdk'; d.setAttribute('aria-label', 'Komut paleti'); document.body.appendChild(d);
      d.innerHTML = `<div class="d-body" tabindex="-1"><div class="ck-in">${ic('search', 'sm')}<input type="text" role="combobox" aria-expanded="true" aria-controls="ckList" aria-autocomplete="list" aria-label="Komut, pano, etiket ya da kayıt ara" placeholder="Ne yapmak istersin?" autocomplete="off" spellcheck="false" enterkeyhint="go"><kbd class="d-only">Esc</kbd></div><ul class="ck-list" id="ckList" role="listbox" aria-label="Sonuçlar"></ul><div class="ck-foot d-only"><span><kbd>↑</kbd><kbd>↓</kbd> gez</span><span><kbd>↵</kbd> çalıştır</span><span><kbd>Esc</kbd> kapat</span></div></div>`;
      const inp = d.querySelector('input');
      inp.addEventListener('input', () => { this.sel = 0; this.paint(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) { e.preventDefault(); this.move(1); }
        else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) { e.preventDefault(); this.move(-1); }
        else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.run(this.sel); }
      });
      const L = d.querySelector('.ck-list');
      L.addEventListener('pointermove', e => { const li = e.target.closest('[data-k]'); if (li && +li.dataset.k !== this.sel && e.pointerType === 'mouse') this.move(+li.dataset.k - this.sel); });
      L.addEventListener('click', e => { const li = e.target.closest('[data-k]'); if (li) this.run(+li.dataset.k); });
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
      d.addEventListener('close', () => { if (!d._fromBack && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; }); }
    if (d.open) return d.close();
    const inp = d.querySelector('input'); inp.value = ''; this.sel = 0; this.paint(); Back.open(d); inp.focus();
    (window.requestIdleCallback || setTimeout)(() => { for (const i of S.items) if (!this._tf.has(i)) this._tf.set(i, this.fold(titleOf(i)).slice(0, 200)); }); // titles folded before the first letter, not on it
  },
  init() {
    addEventListener('keydown', e => { // Ctrl+K / ⌘K anywhere, also while typing (the browser's own Ctrl+K is the address bar)
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'k') return;
      e.preventDefault(); if (document.querySelector('dialog[open]:not(#cmdk)')) return; // another window is up: it keeps the keyboard (and the browser's address bar stays shut)
      this.open();
    }, true);
  },
};
// ---------- Android back button closes panels instead of leaving the app ----------
const Back = {
  open(dlg) { hideHits(); if (!dlg.open) { dlg.showModal(); history.pushState({ nts: dlg.id }, ''); } dlg.querySelector('.d-body')?.focus({ preventScroll: true }); },
  init() {
    addEventListener('popstate', () => { if (this._skip) { this._skip = false; return; } for (const d of document.querySelectorAll('dialog[open]')) { d._fromBack = true; d.close(); } if (!$('#answer').hidden) closeAnswer(); Pop.close(); for (const id of ['#jumpPop', '#rangePop']) { const j = $(id); if (j) j.hidden = true; } });
    // 101: menus and the AI answer are not dialogs but get a history entry too, so Android's back closes them instead of leaving the app
    const LAYERS = new Set(['filterPop', 'jumpPop', 'rangePop', 'answer']);
    new MutationObserver(ms => { for (const m of ms) { const id = m.target.id; if (!LAYERS.has(id)) continue;
      if (!m.target.hidden) { if (history.state?.nts !== id) history.pushState({ nts: id }, ''); }
      else if (history.state?.nts === id) { Back._skip = true; history.back(); } } }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    for (const d of document.querySelectorAll('dialog')) d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; });
  },
};

// ---------- detail drawer ----------
// 155 (A "Belge"): the summary is plain text with a small ✦, no coloured box
function explainHtml(i) {
  if (S.explaining.has(i.id)) return `<div class="d-ai" aria-busy="true">${ic('spark', 'sm')}<div class="c-b"><span class="d-ai-l">${aiName()} inceliyor…</span><div class="skel" style="width:92%"></div><div class="skel" style="width:70%"></div></div></div>`;
  if (i.explain?.text) return `<div class="d-ai" title="${esc(aiOf())} açıklaması">${ic('spark', 'sm')}<div class="c-b" dir="auto">${esc(i.explain.text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div></div>`;
  if (i.summary) return `<div class="d-ai" title="Özet">${ic('spark', 'sm')}<div class="c-b" dir="auto">${esc(i.summary)}</div></div>`;
  return '';
}
// 155: where the item came from, in words ("WhatsApp'tan"); a WhatsApp file name (20261120-WA0008) is never shown as a chat name
const srcLabel = i => ({ whatsapp: "WhatsApp'tan", pc: 'Bilgisayardan', web: 'Tarayıcıdan', share: 'Paylaşımdan', note: '' })[i.source] ?? (i.type === 'note' && !i.source ? 'Elle yazıldı' : '');
const chatName = i => i.chat && !/^(?:IMG|VID|AUD|PTT|DOC|STK)?-?\d{8}-WA\d+/i.test(i.chat) && !/^WA\d+/i.test(i.chat) ? i.chat : '';
// one "Etiketle" row: what the item already has as small chips, the rest (colour, priority, task, lists) folds open
function tagRowHtml(i) {
  const col = COLORS.find(([c]) => c === i.color), pr = PRIOS.find(([v]) => v && v === i.prio), d = i.todo?.due && dueInfo(i.todo.due);
  const chips = [col && `<span class="tchip"><span class="cdot sm c-${col[0]}"></span>${col[1]}</span>`,
    pr && `<span class="tchip">${ic('flag', 'sm')}${pr[1]} öncelik</span>`,
    i.todo && `<span class="tchip${i.todo.done ? ' done' : ''}">${ic('todo', 'sm')}Görev${i.todo.done ? ' · bitti' : i.todo.doing ? ' · yapılıyor' : d ? ' · ' + esc(d.label) : ''}</span>`,
    ...(i.lists || []).filter(k => LISTS.some(l => l[0] === k)).map(k => `<span class="tchip">${ic(LISTS.find(l => l[0] === k)[1], 'sm')}${esc(listName(k))}</span>`)].filter(Boolean);
  const open = S.tagOpen; // 155: "#etiket" words + one "+"; the "+" opens the input and the rest (colour, priority, task, boards, lists)
  return `<div class="d-tags">${(i.tags || []).map(t => `<span class="d-tg" dir="auto">${esc(t)}<button data-untag="${esc(t)}" title="Kaldır" aria-label="${esc(t)} etiketini kaldır">${ic('x', 'sm')}</button></span>`).join('')}${(i.vtags || []).map(t => `<span class="d-tg ai" title="${aiName()} resme bakıp buldu; aramada bulunur">${esc(t)}</span>`).join('')}${chips.join('')}${open ? '<input class="tag-in" placeholder="etiket" aria-label="Yeni etiket" enterkeyhint="done" autocomplete="off">' : ''}<button class="d-addtag${open ? ' on' : ''}" data-act="tagfold" aria-expanded="${!!open}" aria-label="${open ? 'Etiket panelini kapat' : 'Etiket ekle'}" title="${open ? 'Kapat' : 'Etiket, renk, öncelik, görev, liste'}">${ic(open ? 'x' : 'plus', 'sm')}</button></div>
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
// 133: "Benzerleri" under the item window. Without the meaning model: shared topics, same site / chat / colour, close in time.
// With it (104f), the meaning neighbours come first and these fill in; the strip keeps its height when they arrive (no jump).
function simOf(i, n = 12) {
  const tags = new Set(i.tags || []), vt = new Set(i.vtags || []), host = i.url && domain(i.url), hs = new Set(i.hues || []),
    k = fileKind(i), skip = new Set([i.id, ...relatedOf(i).map(r => r.id)]), out = [];
  for (const j of S.items) {
    if (j.deleted || skip.has(j.id) || hid(j)) continue;
    let s = 0;
    for (const t of j.tags || []) if (tags.has(t)) s += 3;
    for (const t of j.vtags || []) if (vt.has(t)) s += 1;
    if (host && j.url?.includes(host) && domain(j.url) === host) s += 2.5;
    if (i.chat && j.chat === i.chat) s += 1;
    if (i.project && j.project === i.project) s += 1.5;
    if (s < 1 && !hs.size) continue; // time alone doesn't make two items alike
    for (const h of j.hues || []) if (hs.has(h) && h !== 'bw') s += .7;
    const dt = Math.abs((j.ts || 0) - (i.ts || 0));
    if (dt < 36e5) s += 1.5; else if (dt < 864e5) s += .8; else if (dt < 7 * 864e5) s += .3;
    if (fileKind(j) === k) s += .4;
    if (s >= 2.5) out.push([j, s]);
  }
  return out.sort((a, b) => b[1] - a[1] || (b[0].ts || 0) - (a[0].ts || 0)).slice(0, n).map(x => x[0]);
}
const simCard = (j, sem) => `<button class="sim-card" data-rel="${j.id}" title="${esc(titleOf(j))}">${hasVisual(j) ? thumbBox(j, 'thumb sim-th') : `<div class="sim-th ico ${j.type}">${ic(fileKind(j) === 'text' ? 'note' : fileKind(j))}</div>`}<span class="t" dir="auto">${sem ? `<b class="sim-sem" aria-label="anlamca">${ic('spark', 'sm')}</b>` : ''}${esc(titleOf(j))}</span></button>`;
function simHtml(list, sem = new Set()) {
  return list.length ? `<div class="field-label">Benzerleri · ${list.length}</div><div class="sim-row">${list.map(j => simCard(j, sem.has(j.id))).join('')}</div>` : '';
}
async function simFill(i, box) {
  const base = simOf(i); box.innerHTML = simHtml(base); hookThumbs(box);
  const near = await Sem.like(i.id); if (!near || !box.isConnected || $('#sheet').dataset.id !== i.id) return;
  const skip = new Set(relatedOf(i).map(r => r.id)), sem = near.filter(([id, z]) => z >= 2.2 && !skip.has(id)).map(([id]) => byId(id)).filter(j => j && !j.deleted).slice(0, 8);
  if (!sem.length) return;
  const ids = new Set(sem.map(j => j.id)), list = [...sem, ...base.filter(j => !ids.has(j.id))].slice(0, 12);
  const row = box.querySelector('.sim-row'), x = row?.scrollLeft || 0;
  box.innerHTML = simHtml(list, ids); hookThumbs(box); if (box.querySelector('.sim-row')) box.querySelector('.sim-row').scrollLeft = x;
}
async function noteImage(i, f) { // 106b: a picture in a note is its own file item (synced like any file), linked from the text as nts:<id>
  const [it] = itemsFromInput({ files: [f], source: 'note' }); if (!it) return null;
  Object.assign(it, { parent: i.id, archive: true, createdAt: now(), dev: deviceNow() });
  const saved = await saveItems([it]); await upsert(saved); AI.kick(); return 'nts:' + it.id;
}
// 155: the item window's "⋯" menu (Paylaş · Kopyala · Aç · Panoya koy · Sil); on the phone it rises from the bottom
const Menu155 = {
  toggle(dlg) { const m = dlg.querySelector('.d-menu'); m.hidden ? this.open(dlg) : this.close(dlg); },
  open(dlg) { const m = dlg.querySelector('.d-menu'), b = dlg.querySelector('[data-act="more"]'); m.hidden = false; b.setAttribute('aria-expanded', 'true'); m.querySelector('.side-row')?.focus({ preventScroll: true }); },
  close(dlg, refocus = true) { const m = dlg.querySelector('.d-menu'), b = dlg.querySelector('[data-act="more"]'); if (!m || m.hidden) return; m.hidden = true; b?.setAttribute('aria-expanded', 'false'); if (refocus) b?.focus({ preventScroll: true }); },
  key(dlg, e) {
    const bs = [...dlg.querySelectorAll('.d-menu .side-row')], k = bs.indexOf(document.activeElement);
    const to = e.key === 'ArrowDown' ? k + 1 : e.key === 'ArrowUp' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? -1 : null;
    if (to !== null) { e.preventDefault(); bs.at(to % bs.length)?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(dlg); }
    else if (e.key === 'Tab') this.close(dlg, false);
  },
};
function openItem(id) {
  const i = byId(id); if (!i) return; Peek.hide?.(); markSeen(i); Opens.bump(id); Tidy.touch(id);
  const dlg = $('#sheet'), k = fileKind(i), rel = relatedOf(i);
  if (!dlg.open || dlg.dataset.id !== id) S.tagOpen = false; // 155: the "+" panel starts closed on every newly opened item
  dlg.dataset.id = id;
  const yt = ytId(i), emb = !yt && Rich.embed(i), media = yt || emb || i.type === 'file' || (i.type === 'link' && i.meta?.image); // 106a: Vimeo / Spotify / map play here too
  dlg.classList.toggle('wide', !!media);
  const lcard = i.type === 'link' ? `<a class="linkcard" href="${esc(i.url)}" target="_blank" rel="noopener">
        ${i.meta?.image && !ytId(i) ? `<img src="${esc(i.meta.image)}" referrerpolicy="no-referrer" alt="" onerror="this.remove()">` : ''}
        <div class="lc-b">${i.meta?.title ? `<div class="lc-t">${esc(i.meta.title)}</div>` : ''}${i.meta?.description ? `<div class="lc-d">${esc(i.meta.description)}</div>` : ''}
        <div class="lc-u">${ic('ext', 'sm')}${esc(i.url)}</div></div></a>` : '';
  const onB = !i.archive || i.onBoard || i.pos, chatN = chatName(i), src = srcLabel(i), isNote = i.type === 'note';
  const full = `${F_DMY.format(i.ts)} ${F_WD.format(i.ts)}, ${fmtTime(i.ts)}`, host = i.type === 'link' && domain(i.url);
  dlg.innerHTML = `<div class="d-body" tabindex="-1">
    <div class="d-head"><span class="type ${i.type}-c">${ic(i.conv ? 'chat' : k === 'text' ? 'note' : k, 'sm')}${i.conv ? 'Sohbet' : KIND_LABEL[k]}</span><span class="sp"></span>
      <button class="icon-btn" data-act="star" title="${i.starred ? 'Yıldızı kaldır' : 'Yıldızla'}" aria-pressed="${!!i.starred}">${ic('star', i.starred ? 'fill star-on' : '')}</button>
      <button class="icon-btn" data-act="more" title="Diğer işlemler" aria-label="Diğer işlemler" aria-haspopup="menu" aria-expanded="false">${ic('dots')}</button>
      <button class="icon-btn" data-act="close" title="Kapat (Esc)" aria-label="Kapat">${ic('x')}</button>
      <div class="d-menu pop" role="menu" aria-label="Kayıt işlemleri" hidden>
        <button class="side-row" role="menuitem" data-act="share">${ic('share', 'sm')}<span class="lbl">Paylaş</span></button>
        <button class="side-row" role="menuitem" data-act="copy">${ic('copy', 'sm')}<span class="lbl">Kopyala</span></button>
        ${i.type === 'link' ? `<a class="side-row" role="menuitem" href="${esc(i.url)}" target="_blank" rel="noopener">${ic('ext', 'sm')}<span class="lbl">Tarayıcıda aç</span></a>` : ''}
        ${i.type === 'file' ? `<button class="side-row" role="menuitem" data-act="download">${ic('down', 'sm')}<span class="lbl">İndir</span></button>` : ''}
        ${onB ? '' : `<button class="side-row" role="menuitem" data-act="toboard">${ic('board', 'sm')}<span class="lbl">Panoya koy</span></button>`}
        <button class="side-row" role="menuitem" data-act="explain">${ic('spark', 'sm')}<span class="lbl">${aiName()} anlatsın</span></button>
        <button class="side-row" role="menuitem" data-act="priv">${ic('lock', 'sm')}<span class="lbl">${i.priv ? 'Gizlemeyi kaldır' : 'Gizle'}</span></button><hr><button class="side-row danger" role="menuitem" data-act="del">${ic('trash', 'sm')}<span class="lbl">Sil</span></button></div></div>
    <div class="${media ? 'd-split' : 'd-info'}">${media ? '<div class="d-media">' : ''}
    ${yt ? `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(i)}" title="YouTube" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
    ${emb ? `<div class="d-emb ${emb.k}" style="${emb.k === 'vimeo' ? 'aspect-ratio:16/9' : `height:${emb.k === 'spotify' ? emb.h : 320}px`}"><iframe src="${esc(emb.src.replace(/[?&]autoplay=1/, ''))}" title="${emb.label}" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>` : ''}
    ${media ? lcard : ''}
    ${i.type === 'file' ? `<div class="preview" id="filePrev"${k === 'image' && AR.has(i.id) ? ` style="aspect-ratio:${AR.get(i.id).toFixed(4)};max-height:70vh"` : ''}><div class="prev-empty">${ic(k === 'text' ? 'note' : k, 'xl')}<span>Önizleme hazırlanıyor…</span></div></div>` : ''}
    ${media ? '</div><div class="d-info">' : ''}
    <div class="d-top"><textarea class="d-title" rows="1" aria-label="Başlık" dir="auto">${esc(titleOf(i))}</textarea>
      <div class="d-meta"><span title="${esc(full)}">${shortDay(dayKey(i.ts))}</span>${src ? `<span class="d-dot" aria-hidden="true">·</span><span>${src}</span>` : ''}</div>
      ${host ? `<a class="d-dom" href="${esc(i.url)}" target="_blank" rel="noopener" title="${esc(i.url)}">${ic('ext', 'sm')}${esc(host)}<span>${esc(i.url.replace(/^https?:\/\/(www\.)?[^/]+/, ''))}</span></a>` : ''}
      ${host && i.dead ? `<div class="d-dead">${ic('link', 'sm')}<span>Bu link artık açılmıyor${i.meta?.title ? '; başlık ve özet sende duruyor' : ''}.</span></div>` : ''}
      ${autoTitle(i) ? `<div class="d-fn" title="Başlık resimdeki yazıdan alındı; değiştirebilirsin">${ic('file', 'sm')}<span>${esc(i.fileName)}</span></div>` : ''}</div>
    <div id="explainBox">${explainHtml(i)}</div>
    ${!media && !i.summary && !i.explain?.text && i.meta?.description ? `<p class="d-desc" dir="auto">${esc(i.meta.description)}</p>` : ''}
    ${i.conv ? convHtml(i) : ''}
    ${window.NtsDedup?.savesLine(i) ? `<div class="d-saves" title="${esc(i.saves.map(x => F_DMY.format(x.ts) + (x.src === 'whatsapp' ? ' · WhatsApp' + (x.chat ? ': ' + x.chat : '') : '')).join('\n'))}">${ic('copy', 'sm')}<span>${esc(NtsDedup.savesLine(i))}</span></div>` : ''}
    ${i.ocr ? `<details class="d-ocr"><summary>${ic('text', 'sm')}${fileKind(i) === 'pdf' ? 'Sayfadaki yazı' : 'Resimdeki yazı'}<button class="link-btn" data-act="copyocr">Kopyala</button></summary><pre>${esc(i.ocr)}</pre></details>` : ''}
    ${DateAsk.html(i)}
    <div class="d-text" data-ed${isNote || i.text ? '' : ' hidden'}></div>
    ${isNote || i.text ? '' : `<button class="d-addnote" data-act="addnote">${ic('plus', 'sm')}<span>Not ekle…</span></button>`}
    ${tagRowHtml(i)}
    ${rel.length ? `<div class="field-label">Bağlantılı · ${rel.length}</div><div class="rel-chips">${rel.slice(0, 12).map(r => { const rk = fileKind(r);
      return `<button class="rel-chip" data-rel="${r.id}" title="${esc(titleOf(r))}"><span class="${r.type}-c">${ic(rk === 'text' ? 'note' : rk, 'sm')}</span><span class="t">${esc(titleOf(r))}</span></button>`; }).join('')}</div>` : ''}
    ${Read.readable(i) ? `<button class="d-quiet" data-act="read">${ic('book', 'sm')}<span>${i.type !== 'link' ? 'Okuma sayfasında aç' : i.read ? `Oku · ${Reader.minutes(i)} dk` : 'Okunur kopyasını al ve oku'}</span></button>` : ''}
    ${(i.highlights || []).length ? `<div class="field-label">İşaretlediklerin · ${i.highlights.length}</div><div class="hl-list">${i.highlights.map(h => `<blockquote>${esc(h.text)}</blockquote>`).join('')}</div>` : ''}
    <hr class="d-hr"><p class="d-arch">${ic(onB ? 'board' : 'inbox', 'sm')}${chatN ? `<span dir="auto">${esc(chatN)} sohbetinden</span><span class="d-dot" aria-hidden="true">·</span>` : ''}<span>${onB ? 'Panoda' : 'Arşivde'}</span>${onB ? '' : `<span class="d-dot" aria-hidden="true">·</span><button class="d-tob" data-act="toboard" title="Listede, galeride ve aramada var; panoda da görünsün">Panoya koy</button>`}</p>
    <div id="simBox" class="sim"></div>
    </div>${media ? '</div>' : ''}
  </div>`;
  simFill(i, dlg.querySelector('#simBox'));
  hookThumbs(dlg);
  dlg._ed?.destroy(); // 106b: the note is a rich editor, stored as Markdown
  const ned = dlg._ed = Ed.mount(dlg.querySelector('[data-ed]'), i.text || '', { placeholder: i.type === 'note' ? 'Yaz ya da "/" ile blok ekle…' : 'Bir şey ekle… ("/" ile blok)', onImage: f => noteImage(i, f) });
  // 147b: the editor writes some texts back a little differently (trailing spaces, Markdown form): only a real edit counts, or just
  // opening + closing a note saved it, synced it and redrew the whole list behind the window (10k items, phone: ~0.5–1 s)
  const ed0 = ned.value, ta = dlg.querySelector('.d-title'), ti0 = ta.value; // same for the title: "metin " shown, "metin" read back
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
  ta.addEventListener('input', fit);
  const commit = async () => {
    const cur = byId(i.id); if (!cur || cur.deleted) return;
    const title = ta.value.trim().replace(/\n/g, ' '), text = ned.value;
    const ch = {};
    if (title && ta.value !== ti0 && title !== titleOf(cur)) { ch.title = title; ch.userTitle = true; }
    if (text !== ed0 && text !== (cur.text || '')) ch.text = text;
    const nt = (dlg.querySelector('.tag-in')?.value || '').trim().replace(/^#/, '').toLowerCase();
    if (nt) ch.tags = [...new Set([...(cur.tags || []), nt])];
    if (Object.keys(ch).length) await upsert([{ ...cur, ...ch }]);
  };
  dlg._commit = commit;
  dlg.onclick = async e => {
    const act = e.target.closest('[data-act]')?.dataset.act, row = e.target.closest('.item'), menu = dlg.querySelector('.d-menu');
    if (act === 'more') return Menu155.toggle(dlg);
    if (menu && !menu.hidden) { Menu155.close(dlg, act ? false : true); if (!act && !e.target.closest('a')) return; }
    if (act === 'addnote') { e.target.closest('[data-act]').remove(); const h = dlg.querySelector('[data-ed]'); h.hidden = false; ned.focus(); return; }
    if (e.target === dlg || act === 'close') { await commit(); Morph.close(dlg); }
    else if (act === 'star') { await commit(); await toggleStar(i.id); openItem(i.id); }
    else if (act === 'del') { Morph.close(dlg); await removeItem(i); }
    else if (act === 'priv') { await commit(); Morph.close(dlg); Priv.toggle(i.id); }
    else if (act === 'share') shareItem(byId(i.id));
    else if (act === 'explain') { await commit(); AI.explain(i.id); }
    else if (act === 'download') itemAction('download', i.id);
    else if (act === 'copy') { await commit(); copyItem(byId(i.id)); }
    else if (e.target.closest('[data-untag]')) { const t = e.target.closest('[data-untag]').dataset.untag; await upsert([{ ...byId(i.id), tags: byId(i.id).tags.filter(x => x !== t) }]); openItem(i.id); }
    else if (act === 'read') { await commit(); Reader.open(i.id); }
    else if (act === 'toboard') { await upsert([{ ...byId(i.id), onBoard: true }]); toast('Panoya kondu', 2000, 'board', { label: 'Panoya git', fn: () => { $('#sheet').close(); setView('board'); } }); openItem(i.id); }
    else if (e.target.closest('[data-kid]')) { await commit(); openItem(e.target.closest('[data-kid]').dataset.kid); }
    else if (act === 'datetodo') { await commit(); await DateAsk.make(i.id); openItem(i.id); }
    else if (act === 'datenot') { await commit(); await upsert([{ ...byId(i.id), noDateAsk: true }]); openItem(i.id); }
    else if (act === 'copyocr') { e.preventDefault(); copyText(byId(i.id).ocr || ''); }
    else if (act === 'tagfold') { await commit(); S.tagOpen = !S.tagOpen; S.tagFocus = S.tagOpen; openItem(i.id); }
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
  const tin = dlg.querySelector('.tag-in');
  if (tin) { tin.onkeydown = async e => { if (e.key === 'Enter') { e.preventDefault(); await commit(); openItem(i.id); requestAnimationFrame(() => $('#sheet .tag-in')?.focus()); } }; if (S.tagFocus) { S.tagFocus = false; requestAnimationFrame(() => tin.focus({ preventScroll: true })); } }
  dlg.querySelector('.d-menu').addEventListener('keydown', e => Menu155.key(dlg, e));
  dlg.oncancel = e => { e.preventDefault(); if (!dlg.querySelector('.d-menu')?.hidden) return Menu155.close(dlg); commit(); Morph.close(dlg); };
  Morph.revive(dlg); const was = dlg.open; Back.open(dlg); if (!was) Morph.open(dlg, id);
  requestAnimationFrame(fit);
  if (i.type === 'file') showPreview(i);
}
async function showPreview(i, box = $('#filePrev')) {
  if (!box) return;
  const u = await blobFor(i), k = fileKind(i);
  if (!u) { box.innerHTML = `<div class="prev-empty">${ic('cloud', 'xl')}<span>Dosya bu cihazda yok${i.fileSynced ? ', senkron ayarlarını kontrol et' : ''}.</span></div>`; return; }
  if (k === 'image') { // decoded first, then one smooth grow (no jump when the picture arrives)
    const im = new Image(); im.alt = ''; im.src = u; await (im.decode ? im.decode() : new Promise(ok => { im.onload = im.onerror = ok; })).catch(() => {});
    if (im.naturalWidth) AR.set(i.id, im.naturalWidth / im.naturalHeight);
    growTo(box, () => { box.style.aspectRatio = ''; box.replaceChildren(im); });
  }
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
    if (e === 'docx') return this.docx(await (await needZip()).loadAsync(blob));
    if (e === 'xlsx') return this.xlsx(await (await needZip()).loadAsync(blob));
    if (e === 'pptx') return this.pptx(await (await needZip()).loadAsync(blob));
    if (/^od[tsp]$/.test(e)) return this.odf(await (await needZip()).loadAsync(blob));
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
    const inl = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/==(.+?)==/g, '<mark>$1</mark>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const L = esc(t).split('\n'), out = []; let list = null, code = false, buf = [];
    const flush = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (let k = 0; k < L.length; k++) {
      const l = L[k];
      if (/^```/.test(l)) { if (code) { out.push(`<pre>${buf.join('\n')}</pre>`); buf = []; code = false; } else { flush(); code = true; } continue; }
      if (code) { buf.push(l); continue; }
      let m;
      if ((m = l.match(/^(#{1,6})\s+(.*)/))) { flush(); const n = Math.min(4, m[1].length + 1); out.push(`<h${n}>${inl(m[2])}</h${n}>`); }
      else if ((m = l.match(/^\s*[-*+]\s+(\[[ xX]\]\s+)?(.*)/))) { if (list !== 'ul') { flush(); out.push('<ul>'); list = 'ul'; } out.push(m[1] ? `<li class="md-todo${/x/i.test(m[1]) ? ' on' : ''}"><span class="ck" aria-hidden="true"></span>${inl(m[2])}</li>` : `<li>${inl(m[2])}</li>`); } // 106b: the same boxes as the editor
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
      else if ((m = l.match(/^!\[([^\]]*)\]\(((?:https?:|nts:)[^)\s]+)\)\s*$/))) { flush(); out.push(`<img class="md-img" alt="${m[1]}" data-src="${m[2]}"${m[2].startsWith('nts:') ? '' : ` src="${m[2]}" referrerpolicy="no-referrer"`}>`); }
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
    const q = alive().filter(i => this.readable(i) && !(i.again > now()) && (i.type !== 'link' || i.read || Reader.wanted(i))); // 95c: "3 gün sonra" ones wait
    if (!q.length) return toast('Okunacak bir şey yok. Link, PDF ya da uzun not kaydedince burada çıkar.', 3200, 'book');
    const ready = i => i.type !== 'link' || i.read; // 112: readable without the bridge
    if (!S.bridgeOk) { const r = q.filter(ready); if (!r.length) return toast(`Okuma listesinde ${q.length} link var. Okunur kopya için bilgisayardaki Nts köprüsü açık olmalı.`, 4200, 'book'); q.splice(0, q.length, ...r); }
    const back = q.filter(i => i.again), un = q.filter(i => !i.again && !i.seenAt), first = (back[0] || un[0] || q[0]);
    this.open(first.id, [...back, ...un, ...q.filter(i => !i.again && i.seenAt)].map(i => i.id));
  },
  async open(id, ids) {
    let i = byId(id); if (!i) return;
    if (i.again && i.again <= now()) { i = { ...i, again: undefined, seenAt: i.seenAt || now() }; upsert([i]); } else markSeen(i); // 95c: came back, read now
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
    if (i.type === 'note') { let h = Docs.md(i.text); for (const hl of hs) { const t = esc(hl.text); if (t.length > 2 && h.includes(t)) h = h.split(t).join(`<mark data-h="${hl.id}">${t}</mark>`); } return `<div class="doc md">${h}</div>`; } // 106b
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
        <button class="btn ghost sm rp-later" data-rp="later" title="Okuma listesinden çıkar, 3 gün sonra yeniden göster" aria-label="3 gün sonra tekrar göster">${ic('clock', 'sm')}<span>3 gün sonra</span></button>
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
    Ed.hydrate(d); const f = d.querySelector('.rp-file'); if (f) Docs.can(i) || fileKind(i) !== 'pdf' ? showPreview(i, f) : this.pdf(i, f);
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
  // 95c: "3 gün sonra tekrar": out of the reading list for three days, then first in it again with a reminder (Remind.tick)
  async later() {
    const id = this.id, i = byId(id); if (!i) return; haptic();
    await upsert([{ ...i, again: now() + 3 * 864e5 }]);
    const at = new Date(now() + 3 * 864e5).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
    toast(`${at} okuma listesinde yeniden çıkacak`, 5000, 'clock', { label: 'Geri al', fn: () => { const c = byId(id); if (c) upsert([{ ...c, again: undefined }]); } });
    const rest = this.ids.filter(x => x !== id && !(byId(x)?.again > now())), n = this.ids.indexOf(id);
    if (!rest.length) return $('#reading').close();
    this.ids = rest; this.id = rest[Math.min(n, rest.length - 1)]; markSeen(byId(this.id)); this.draw(); $('#reading .rp-main').scrollTop = 0;
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
      if (a === 'later') return this.later();
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
      seen.add(key); ch = true; const txt = d.text || titleOf(i), id = i.id;
      toast('Hatırlatma: ' + txt, 15000, 'clock', [{ label: '1 saat ertele', fn: () => this.snooze(id, '1h') }, { label: 'Yarın', fn: () => this.snooze(id, 'tomorrow') }]);
      if (!BridgeLink.local() && 'Notification' in window && Notification.permission === 'granted') // 107e: snooze right from the notification (sw.js)
        navigator.serviceWorker?.ready.then(r => r.showNotification('Nts · hatırlatma', { body: txt, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key, renotify: true, data: { view: 'todo', id },
          actions: [{ action: 'snooze1h', title: '1 saat ertele' }, { action: 'tomorrow', title: 'Yarın' }] })).catch(() => { try { new Notification('Nts · hatırlatma', { body: txt }); } catch { } });
    }
    for (const i of S.items) { // 95c: a "3 gün sonra" item is back in the reading list
      if (!i.again || i.deleted || i.again > t || t - i.again > 7 * 864e5) continue;
      const key = 'again:' + i.id + '@' + i.again; if (seen.has(key)) continue; seen.add(key); ch = true;
      toast('Okuma listesinde yeniden: ' + titleOf(i), 8000, 'book', { label: 'Oku', fn: () => Read.queue() });
      if (!BridgeLink.local() && 'Notification' in window && Notification.permission === 'granted')
        navigator.serviceWorker?.ready.then(r => r.showNotification('Nts · okuma listesi', { body: titleOf(i), icon: 'icons/icon-192.png', tag: key, data: { read: 1 } })).catch(() => { });
    }
    if (ch) try { localStorage.setItem('hn-reminded', JSON.stringify([...seen].slice(-500))); } catch { }
  },
  init() { setInterval(() => this.tick(), 30e3); setTimeout(() => { this.picked(); this.tick(); }, 3000); },
  // 107e: a line typed as a reminder becomes a task with that time; "Not olsun" keeps it a plain note
  async make(text, p) {
    const [it, ...rest] = itemsFromInput({ text: p.text, ts: now() }); if (!it) return;
    it.todo = { text: p.text, done: false, due: p.due, user: true }; it.createdAt = now();
    const saved = await saveItems([it, ...rest]); await upsert(saved); this.ask(); haptic(); Motion.hop?.();
    toast(`Hatırlatma · ${dueInfo(p.due)?.label || p.due} · ${p.text}`, 6000, 'clock', { label: 'Not olsun', fn: async () => { const c = byId(it.id); if (c) await upsert([{ ...c, text, title: undefined, todo: null, noTodo: true }]); } });
  },
  async snooze(id, kind) {
    const i = byId(id); if (!i?.todo || i.deleted) return; const due = NtsWhen.snoozeDue(kind);
    await upsert([{ ...i, todo: { ...i.todo, due, done: false, user: true } }]);
    toast('Ertelendi · ' + (dueInfo(due)?.label || due), 3000, 'clock');
  },
  // snoozed from a notification while the app was closed: the service worker wrote the new time; send it to the other devices
  async picked() {
    const ids = await DB.get('kv', 'snoozed').catch(() => null); if (!ids?.length) return;
    const list = ids.map(byId).filter(Boolean); await DB.del('kv', 'snoozed');
    if (list.length) { await Sync.markDirty(list); Sync.schedule(); }
  },
};

// 95d: a picture (or scanned page) whose text holds a date still ahead → "göreve çevir?" in its window, and once as a toast
// when the text of a just-saved picture arrives (older pictures read by the backfill stay quiet)
const DateAsk = {
  find(i) { return i && !i.deleted && !i.todo && !i.noTodo && !i.noDateAsk && i.ocr && ['image', 'pdf'].includes(fileKind(i)) ? NtsQuery.dateIn(i.ocr, now()) : null; },
  html(i) {
    const f = this.find(i); if (!f) return '';
    return `<div class="d-date">${ic('clock', 'sm')}<span>Resimde tarih var: <b>${esc(dueInfo(f.due)?.label || f.due)}</b><small dir="auto">${esc(f.line)}</small></span><div class="d-date-b"><button class="link-btn" data-act="datenot">Hayır</button><button class="btn secondary sm" data-act="datetodo">${ic('todo', 'sm')}Göreve çevir</button></div></div>`;
  },
  async make(id) {
    const i = byId(id), f = this.find(i); if (!f) return; haptic(12);
    await upsert([{ ...i, todo: { text: titleOf(i), done: false, due: f.due, user: true } }]); if (f.due.includes('T')) Remind.ask();
    toast(`Görev oldu · ${dueInfo(f.due)?.label || f.due}`, 5000, 'todo', { label: 'Geri al', fn: () => { const c = byId(id); if (c) upsert([{ ...c, todo: null }]); } });
  },
  after(ids) {
    const hit = ids.map(byId).filter(i => i && now() - (i.createdAt || i.ts) < 3600e3).map(i => [i, this.find(i)]).find(x => x[1]); if (!hit) return;
    const [i, f] = hit;
    toast(`Resimde tarih var (${dueInfo(f.due)?.label || f.due}). Göreve çevireyim mi?`, 10000, 'clock', { label: 'Göreve çevir', fn: () => this.make(i.id) });
  },
};

// ---------- 95b: morning brief — once a day after the chosen time (default 08:00): what you saved yesterday + today's tasks ----------
// Shown as a card the first time the app is open in the 6 hours after that time; with the app closed the installed phone app
// gets a notification from the service worker (periodic sync), on the PC the bridge sends it (snapshot carries the time).
// The AI's one-line summary of yesterday comes from the bridge (/brief) when it is reachable; without it the card is plain counts.
const Morning = {
  at() { const v = S.settings.morning; return v === undefined ? '08:00' : v; }, // '' = off
  async set(v) {
    S.settings.morning = v; await DB.put('kv', S.settings, 'settings');
    const m = (await DB.get('kv', 'morning')) || {}; await DB.put('kv', { ...m, at: v }, 'morning'); this.reg(); Snapshot.schedule();
  },
  async reg() { // periodic sync: installed app on the phone only (on the PC the bridge notifies)
    try {
      const r = await navigator.serviceWorker?.ready; if (!r?.periodicSync) return;
      if (!this.at() || BridgeLink.local()) return void r.periodicSync.unregister('nts-morning').catch(() => { });
      const p = await navigator.permissions?.query({ name: 'periodic-background-sync' }).catch(() => null); if (p && p.state !== 'granted') return;
      await r.periodicSync.register('nts-morning', { minInterval: 12 * 3600e3 });
    } catch { }
  },
  async tick() {
    const at = this.at(); if (!at) return;
    const d = new Date(now()), [h, mi] = at.split(':').map(Number), min = d.getHours() * 60 + d.getMinutes();
    if (min < h * 60 + mi || min > h * 60 + mi + 360) return;
    if (document.querySelector('dialog[open], .tour, #lock:not([hidden])')) return; // the tour, the lock or an open window first; the card waits
    const m = (await DB.get('kv', 'morning')) || {}, day = dayKey(now()); if (m.last === day) return;
    await DB.put('kv', { ...m, at, last: day }, 'morning');
    const b = morningBrief(S.items, now()); if (!b) return;
    this.open(b);
    if (document.hidden && !BridgeLink.local() && 'Notification' in window && Notification.permission === 'granted')
      navigator.serviceWorker?.ready.then(r => r.showNotification('Günaydın · Nts', { body: b.body, icon: 'icons/icon-192.png', tag: 'nts-morning', data: { view: 'morning' } })).catch(() => { });
  },
  open(b = morningBrief(S.items, now())) {
    this.close(true);
    const el = document.createElement('section'); el.id = 'morn'; el.className = 'morn'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Sabah özeti');
    const day = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now());
    const row = (id, t, sub, cls = '') => `<li><button class="m-it ${cls}" data-mopen="${esc(id)}"><span dir="auto">${esc(t)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</button></li>`;
    el.innerHTML = !b ? `<header><span><b>Günaydın</b><small>${esc(day)}</small></span><button class="m-x" aria-label="Kapat">${ic('x', 'sm')}</button></header><p class="m-empty">Dün kayıt yok, bugüne görev yok. Sakin bir gün.</p>`
      : `<header><span><b>Günaydın</b><small>${esc(day)}</small></span><button class="m-x" aria-label="Kapat">${ic('x', 'sm')}</button></header>
      ${b.n && S.bridgeOk ? `<p class="m-ai loading" aria-live="polite">${aiMark()}<span>${esc(aiName())} dünü özetliyor…</span></p>` : ''}
      <div class="m-sec"><h5>Bugün <span>${b.tasks.length ? `${b.tasks.length} görev${b.late ? ` · ${b.late} gecikmiş` : ''}` : 'görev yok'}</span></h5>
        ${b.tasks.length ? `<ul>${b.tasks.slice(0, 4).map(t => row(t.id, t.text, t.late ? 'gecikmiş · ' + dueInfo(t.due)?.label : t.due.includes('T') ? t.due.slice(11, 16) : '', t.late ? 'late' : '')).join('')}</ul>` : ''}</div>
      <div class="m-sec"><h5>Dün <span>${b.n ? `${b.n} kayıt${b.kindTxt.includes(',') ? ' · ' + esc(b.kindTxt) : ''}` : 'kayıt yok'}</span></h5>
        ${b.n ? `<ul>${b.saved.slice(0, 3).map(i => row(i.id, i.title, i.tags.length ? '#' + i.tags[0] : '')).join('')}</ul>` : ''}</div>
      <footer>${b.tasks.length ? `<button class="btn secondary" data-mgo="todo">${ic('todo', 'sm')}Görevler</button>` : ''}${b.n > 3 ? `<button class="btn secondary" data-mgo="yday">Dünküler (${b.n})</button>` : ''}</footer>`;
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
    el.addEventListener('click', e => {
      if (e.target.closest('.m-x')) return this.close();
      const o = e.target.closest('[data-mopen]'); if (o) { this.close(); return openItem(o.dataset.mopen); }
      const g = e.target.closest('[data-mgo]'); if (!g) return; this.close();
      if (g.dataset.mgo === 'todo') setView('todo');
      else { setMode('find'); const inp = $('#input'); inp.value = 'dün'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    this.esc = e => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) this.close(); }; addEventListener('keydown', this.esc);
    if (b?.n && S.bridgeOk) this.ai(b, el);
  },
  async ai(b, el) {
    const p = el.querySelector('.m-ai'), m = (await DB.get('kv', 'morning')) || {};
    let line = m.aiDay === b.day ? m.ai : '';
    if (!line) try {
      const r = await AI.call('/brief', { saved: b.saved, tasks: b.tasks.map(t => ({ text: t.text, late: t.late })) }, 60000); line = String(r?.line || '').trim().slice(0, 400);
      if (line) await DB.put('kv', { ...((await DB.get('kv', 'morning')) || {}), aiDay: b.day, ai: line }, 'morning');
    } catch { }
    if (!p.isConnected) return; if (!line) return p.remove();
    p.classList.remove('loading'); p.innerHTML = `${aiMark()}<span>${esc(line)}</span>`;
  },
  close(now) {
    const el = $('#morn'); if (!el) return; removeEventListener('keydown', this.esc);
    if (now || reduced()) return el.remove();
    el.classList.remove('in'); setTimeout(() => el.remove(), 200);
  },
  init() { setTimeout(() => this.tick(), 4000); setInterval(() => { if (!document.hidden) this.tick(); }, 60e3); document.addEventListener('visibilitychange', () => { if (!document.hidden) this.tick(); }); this.reg(); },
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
    if (k === '/folders') return 'klasörlere ad veriyor'; // 131b
    if (k === '/board-plan') return 'pano hazırlıyor'; // 93
    if (k === '/ocr') return 'resimlerdeki yazıyı okuyor';
    if (k === '/transcribe') return 'sesli notu yazıya döküyor'; // 95a
    if (k === '/brief') return 'sabah özetini yazıyor'; // 95b
    return null; // health, inbox, snapshot, meta: not Claude
  },
  start(label) { const id = ++this.n; this.jobs.set(id, label); this.draw(); return id; },
  end(id) { this.jobs.delete(id); clearTimeout(this.t); this.t = setTimeout(() => this.draw(), 400); },
  draw() {
    let el = $('#busy');
    if (!el) { el = document.createElement('div'); el.id = 'busy'; el.className = 'busy'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
    const all = [...this.jobs.values()], on = all.length > 0;
    el.classList.toggle('on', on);
    if (on) el.innerHTML = `${aiMark()}<b>${esc(aiName())}</b><span class="b-t">${esc(all[0])}${all.length > 1 ? ` · +${all.length - 1}` : ''}</span>`;
    el.title = on ? '' + aiName() + ' arka planda çalışıyor: ' + all.join(', ') : '';
  },
};

// the working AI's own mark, moving its own way: Claude's spark turns and breathes ray by ray, Codex's blossom spins, Gemini's star twinkles
function aiMark(k = aiKey()) {
  if (k === 'codex') return `<svg class="b-mk mk-codex" viewBox="-12 -12 24 24" aria-hidden="true">${[0, 60, 120, 180, 240, 300].map(a => `<rect x="-2.6" y="-10" width="5.2" height="10" rx="2.6" transform="rotate(${a})"/>`).join('')}<circle r="3" class="mk-hole"/></svg>`;
  if (k === 'gemini') return `<svg class="b-mk mk-gemini" viewBox="-12 -12 24 24" aria-hidden="true"><defs><linearGradient id="mkG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#4285f4"/><stop offset=".55" stop-color="#9b72cb"/><stop offset="1" stop-color="#d96570"/></linearGradient></defs><path fill="url(#mkG)" d="M0-11C0.8-5 5-0.8 11 0 5 0.8 0.8 5 0 11-0.8 5-5 0.8-11 0-5-0.8-0.8-5 0-11Z"/></svg>`;
  const L = [10, 8, 9.5, 7.5, 10, 8.5, 9, 7.5, 10, 8, 9.5, 8]; // uneven rays, like the hand-drawn spark
  return `<svg class="b-mk mk-claude" viewBox="-12 -12 24 24" aria-hidden="true">${L.map((l, i) => `<line x1="0" y1="-1.6" x2="0" y2="${-l}" transform="rotate(${i * 30 + (i % 2 ? 4 : 0)})" style="--i:${i}"/>`).join('')}</svg>`;
}

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

// ---------- 123-1: topic arc in the filter popover (owner chose "Alt yay" from design/dial.html, t-B + p-filter) ----------
// The top arc of a big ring holding "Hepsi" + every topic. Drag sideways (fling: it keeps turning, then springs onto the nearest topic),
// ← → / ↑ ↓ / Home End / PageUp PageDown, mouse wheel, tap a topic to turn there, tap the one in the window (or the button, or Enter) to filter.
// The plain topic list stays under it: the arc is never the only way.
const TagArc = {
  W: 236, R: 230, Y: 31, STEP: 78, // viewBox width, ring radius, label line, px between topics on the arc
  list: [], key: null, cur: undefined, pos: 0, vel: 0, target: 0, raf: 0, last: 0, wheel: 0,
  get n() { return this.list.length + 1; },
  get step() { return this.STEP / this.R; }, // radians per topic
  label(i) { return i ? '#' + this.list[i - 1][0] : 'Hepsi'; },
  build() {
    const el = $('#tagArc'), { W, R, Y } = this, cy = Y + R, A = Math.asin((W / 2 + 8) / R), x = s => (W / 2 + R * Math.sin(s)).toFixed(1), y = s => (cy - R * Math.cos(s)).toFixed(1);
    el.innerHTML = `<div class="tarc-dial" tabindex="0" role="slider" aria-label="Konu çarkı: çevir, Enter ile süz" aria-valuemin="0"><svg viewBox="0 0 ${W} 60" aria-hidden="true">
      <path class="tarc-band" d="M${x(-A)} ${y(-A)}A${R} ${R} 0 0 1 ${x(A)} ${y(A)}"/>
      <rect class="tarc-win" x="${W / 2 - 46}" y="${Y - 18}" width="92" height="36" rx="11"/>
      <g transform="translate(${W / 2} ${cy})"><g class="tarc-ticks"></g><g class="tarc-txt"></g></g>
      <path class="tarc-ptr" d="M${W / 2 - 5} ${Y + 27}L${W / 2 + 5} ${Y + 27}L${W / 2} ${Y + 21}Z"/></svg></div>
      <button class="tarc-go" type="button"></button>`;
    this.dial = $('.tarc-dial', el); this.go = $('.tarc-go', el); this.rot = $('.tarc-ticks', el).parentNode;
    this.wire();
  },
  draw() { // labels + detents for the current list
    const deg = this.step * 180 / Math.PI, R = this.R, cut = s => s.length > 11 ? s.slice(0, 10) + '…' : s;
    $('.tarc-txt', this.dial).innerHTML = Array.from({ length: this.n }, (_, i) => `<text transform="rotate(${(i * deg).toFixed(2)}) translate(0 ${-R})">${esc(cut(this.label(i)))}</text>`).join('')
      + Array.from({ length: this.n - 1 }, (_, i) => `<circle class="tarc-dot" r="3.2" transform="rotate(${((i + 1) * deg).toFixed(2)}) translate(0 ${-R + 13})" style="fill:${tagCol(this.list[i][0])}"/>`).join(''); // 123-2 (t-B3): each topic its colour
    $('.tarc-ticks', this.dial).innerHTML = Array.from({ length: this.n * 2 - 1 }, (_, k) => `<line class="${k % 2 ? '' : 'm'}" transform="rotate(${(k * deg / 2).toFixed(2)})" x1="0" x2="0" y1="${-R + 21}" y2="${-R + (k % 2 ? 24 : 26)}"/>`).join('');
    this.T = [...this.dial.querySelectorAll('text')]; this.on = -1; this.sel = -1;
    this.dial.setAttribute('aria-valuemax', this.n - 1);
  },
  sync(tags, cur) {
    const el = $('#tagArc'); if (!el) return;
    el.hidden = tags.length < 2; if (el.hidden) return;
    if (!this.dial) this.build();
    const key = tags.map(t => t[0]).join('\u0001'), counts = tags.map(t => t[1]).join();
    this.list = tags;
    if (key !== this.key) { this.key = key; this.draw(); this.cur = undefined; }
    this.counts = counts;
    const idx = cur ? tags.findIndex(t => t[0] === cur) + 1 : 0;
    if (cur !== this.cur && !this.busy) { this.cur = cur; this.stop(); this.pos = this.target = Math.max(0, idx); this.vel = 0; }
    this.cur = cur; this.paint();
  },
  i() { return Math.max(0, Math.min(this.n - 1, Math.round(this.pos))); },
  paint(feel) {
    const deg = this.step * 180 / Math.PI, n = this.n;
    let p = this.pos; if (p < 0) p = p * .35; else if (p > n - 1) p = n - 1 + (p - n + 1) * .35; // rubber band past the ends
    this.rot.setAttribute('transform', `translate(${this.W / 2} ${this.Y + this.R}) rotate(${(-p * deg).toFixed(3)})`);
    const i = this.i(), sel = this.cur ? this.list.findIndex(t => t[0] === this.cur) + 1 : 0;
    if (i !== this.on) { this.dial.parentNode.style.setProperty('--tc', i ? tagCol(this.list[i - 1][0]) : 'var(--muted)'); this.T[this.on]?.classList.remove('on'); this.T[i]?.classList.add('on'); if (feel && this.on >= 0) haptic(3); this.on = i; this.button(); }
    if (sel !== this.sel) { this.T[this.sel]?.classList.remove('sel'); if (sel) this.T[sel]?.classList.add('sel'); this.sel = sel; this.button(); }
  },
  button() {
    const i = this.on, t = i ? this.list[i - 1] : null, b = this.go; if (!b) return;
    this.dial.setAttribute('aria-valuenow', i); this.dial.setAttribute('aria-valuetext', this.label(i));
    if (!t) { b.innerHTML = this.cur ? `${ic('x', 'sm')}Süzgeci kaldır` : 'Bütün konular görünüyor'; b.disabled = !this.cur; b.classList.toggle('off', !!this.cur); return; }
    b.disabled = false; const off = t[0] === this.cur; b.classList.toggle('off', off);
    b.innerHTML = off ? `${ic('x', 'sm')}<span class="lbl">#${esc(t[0])}</span><span>süzgecini kaldır</span>` : `${ic('hash', 'sm')}<span class="lbl">${esc(t[0])}</span><span>ile süz</span><span class="n">· ${t[1] || 0}</span>`;
  },
  apply() {
    const i = this.i(), t = i ? this.list[i - 1][0] : null, f = S.filter;
    if (!t && !f.tag) return;
    haptic(10); f.tag = t && f.tag !== t ? t : null;
    S.limit = 300; S.listFrom = null; S.cam = null; Pop.close(); render(); scrollTo({ top: 0, behavior: 'smooth' });
  },
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; },
  // spring onto `to` (slightly under-damped: it settles with a soft give, keeps the fling's speed); reduced motion jumps
  spring(to) {
    this.target = Math.max(0, Math.min(this.n - 1, to));
    if (reduced()) { this.stop(); this.pos = this.target; this.vel = 0; return this.paint(true); }
    if (this.raf) return;
    let t0 = performance.now();
    const f = t => { const dt = Math.min(.032, (t - t0) / 1000); t0 = t;
      const k = 190, c = 2 * Math.sqrt(k) * .82, a = -k * (this.pos - this.target) - c * this.vel;
      this.vel += a * dt; this.pos += this.vel * dt;
      if (Math.abs(this.pos - this.target) < .002 && Math.abs(this.vel) < .02) { this.pos = this.target; this.vel = 0; this.raf = 0; this.paint(true); return; }
      this.paint(true); this.raf = requestAnimationFrame(f); };
    this.raf = requestAnimationFrame(f);
  },
  by(k) { this.spring(Math.round(this.target) + k); },
  wire() {
    const d = this.dial, scale = () => this.W / d.getBoundingClientRect().width;
    let sx = 0, lx = 0, moved = false, id = null, v = 0;
    d.addEventListener('pointerdown', e => { if (e.button > 0) return; id = e.pointerId; sx = lx = e.clientX; moved = false; v = 0; this.last = performance.now(); this.stop(); this.busy = true; });
    d.addEventListener('pointermove', e => { if (e.pointerId !== id) return;
      if (!moved && Math.abs(e.clientX - sx) > 5) { moved = true; try { d.setPointerCapture(id); } catch { } d.classList.add('grab'); }
      if (!moved) return;
      const now = performance.now(), dt = Math.max(1, now - this.last), dp = -(e.clientX - lx) * scale() / this.STEP; // px → topics
      lx = e.clientX; this.last = now; v = v * .5 + (dp / dt * 1000) * .5; this.vel = v; this.pos += dp; this.target = this.pos; this.paint(true); });
    const up = e => { if (e.pointerId !== id) return; id = null; d.classList.remove('grab'); this.busy = false;
      if (!moved) { // tap: the topic under the finger
        const r = d.getBoundingClientRect(), dx = (e.clientX - r.left - r.width / 2) * scale(), j = Math.round(this.pos + Math.asin(Math.max(-1, Math.min(1, dx / this.R))) / this.step);
        if (e.type === 'pointerup') { if (j === this.i() && Math.abs(dx) < 46) this.apply(); else this.spring(j); }
        return; }
      if (performance.now() - this.last > 90) this.vel = 0;
      this.spring(Math.round(this.pos + Math.max(-14, Math.min(14, this.vel)) * .16)); };
    d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
    d.addEventListener('keydown', e => {
      const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
      if (k) { e.preventDefault(); e.stopPropagation(); return this.by(k); }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); return this.spring(e.key === 'Home' ? 0 : this.n - 1); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.apply(); }
    });
    d.addEventListener('wheel', e => { const dl = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!dl) return;
      e.preventDefault(); this.wheel += e.deltaMode ? dl * 30 : dl;
      const k = Math.trunc(this.wheel / 36); if (k) { this.wheel -= k * 36; this.by(k); } }, { passive: false });
    this.go.onclick = () => this.apply();
  },
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
    if (reduced()) { p.hidden = true; return; }
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
    try { await clip(text); } catch { return toast('Kopyalanamadı'); }
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

// 115: the view switch (Pano · Liste · Galeri) slides up out of the way after 10 s without a hover; the mouse near the top edge,
// scrolling up, a tap on the top strip (phone) or keyboard focus brings it back (reduced-motion: the global rule makes it instant)
const ViewHide = {
  ms: 10000,
  init() {
    const hc = this.el = $('.hud-c'); if (!hc) return;
    hc.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; this.over = true; this.show(); }); // a finger leaves no hover behind
    hc.addEventListener('pointerleave', () => { this.over = false; this.arm(); });
    hc.addEventListener('focusin', () => { if (hc.querySelector(':focus-visible')) this.show(); }); hc.addEventListener('focusout', () => this.arm());
    const top = () => 80; // the HUD row plus a little margin (safe area included on phones with a notch)
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && e.clientY < top()) this.show(); }, { passive: true });
    addEventListener('touchstart', e => { if (e.touches[0]?.clientY < top()) this.show(); }, { passive: true });
    let y = scrollY; addEventListener('scroll', () => { if (scrollY < y - 6 || scrollY < 40) this.show(); y = scrollY; }, { passive: true });
    this.arm();
  },
  show() { if (!this.el) return; this.el.classList.remove('vs-hid'); this.arm(); },
  arm() { clearTimeout(this.t); this.t = setTimeout(() => this.hide(), this.ms); },
  hide() {
    const hc = this.el; if (!hc || this.over || hc.querySelector(':focus-visible')) return; // a tap leaves focus on the button: only keyboard focus keeps it
    if (document.querySelector('.tour')) return this.arm(); // the tour points at it
    hc.classList.add('vs-hid');
  },
};

// 117: floating chrome steps aside when a board card is under it: the card under the mouse (or the one being dragged, any pointer)
// overlaps a HUD piece → that piece fades (.ul); pointing at the piece itself brings it back. The box only fades a little and never
// while it is focused or holds text, so it stays readable.
const Underlap = {
  sels: ['.hud-l', '.hud-c', '.hud-r', '#rail', '#railTab', '#pal', '#boardTools', '#composer'],
  init() {
    let ev = null, raf = 0;
    const run = () => { raf = 0; this.check(ev); };
    addEventListener('pointermove', e => { ev = e; if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
    addEventListener('pointerup', () => setTimeout(() => this.check(null), 0), { passive: true });
    document.documentElement.addEventListener('pointerleave', () => this.check(null));
    addEventListener('resize', () => { this.rt = 0; });
  },
  rects() { // the HUD hardly moves: re-measure at most every 400 ms
    const now = performance.now(); if (this.r && now - this.rt < 400) return this.r;
    this.rt = now;
    return this.r = this.sels.map(s => $(s)).filter(Boolean).map(el => { const r = el.getBoundingClientRect(); return { el, r: r.width ? r : null }; });
  },
  check(e) {
    let card = null;
    if (S.view === 'board' && !document.querySelector('.tour')) {
      card = document.querySelector('#plane > .bcard.dragging');
      if (!card && e && e.pointerType === 'mouse' && !e.buttons) card = e.target.closest?.('#plane > .bcard') || null;
    }
    if (!card) { for (const s of this.sels) { const el = $(s); if (el?.classList.contains('ul')) el.classList.remove('ul'); } return; } // 147: nothing to step aside from → no measuring (it forced a layout while scrolling the list)
    const cr = card.getBoundingClientRect(), inp = $('#input');
    for (const { el, r } of this.rects()) {
      let on = !!(cr && r && cr.left < r.right + 4 && cr.right > r.left - 4 && cr.top < r.bottom + 4 && cr.bottom > r.top - 4);
      if (on && el.id === 'composer' && (el.contains(document.activeElement) || inp?.value)) on = false;
      if (el.classList.contains('ul') !== on) el.classList.toggle('ul', on);
    }
  },
};

const G_SVG = '<svg class="i" viewBox="0 0 24 24"><path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" stroke="none"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" stroke="none"/><path d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2z" fill="#FBBC05" stroke="none"/><path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.4 3-4.1 5.6-4.1z" fill="#EA4335" stroke="none"/></svg>';

const Tour = {
  steps() {
    const phone = innerWidth < 900;
    return [
      ['#composer', 'Tek kutu, üç mod', 'Solda modu seç' + (phone ? ' (simgeye dokun)' : ', <b>Tab</b> ile değiştir') + '. <b>Not</b>: yaz, link ya da resim yapıştır, <b>Enter</b> kaydeder. <b>Ara</b>: yazdıkça sayfa süzülür, Enter ilk sonucu açar (başa <b>/</b> yaz).'],
      ['#composer', '' + aiTo() + ' sor', '<b>Sor</b> modunda (başa <b>?</b> yaz) sor: "geçen hafta kaydettiğim PDF neydi?" ' + aiName() + ' kayıtlarını da kendisi düzenler.'],
      [phone ? '#filterBtn' : '#rail', 'Neye bakmak istersin', 'Linkler, notlar, fotoğraflar ve <b>Yapılacaklar</b>. Listeler, konular ve Şifrelerim <b>⋯</b> altında; çubuğu <b>[</b> ile gizlersin.'],
      ['#viewSwitch', 'Pano, liste, galeri', 'Panoda kartları sürükleyip istediğin yere koy, boş yere çift tıklayıp not yaz, kalemle çiz.'],
      Cloud.on() ? ['#settingsBtn', 'Telefon ve bilgisayar', 'Girişlisin (<b>' + esc(Cloud.email()) + '</b>): telefon ve bilgisayar aynı kayıtları görür. ' + aiName() + ' bağlantısı Ayarlar\'da.']
        : [null, 'Nasıl devam edelim?', 'Google ile girersen telefon ve bilgisayar aynı kayıtları görür. Misafir kalırsan kayıtlar yalnız bu cihazda durur; sonra Ayarlar\'dan girebilirsin.', 'auth'],
      [null, 'Hazırsın', 'Kendine bir not at, gerisini Nts ve ' + aiName() + ' halleder. Son olarak görünümü seç; sonra Ayarlar → Görünüm\'den değiştirebilirsin.'],
    ];
  },
  // 122: Google sign-in leaves the page; come back to the step after it (hn-tour-at), the tour is not done yet
  google() { try { localStorage.setItem('hn-tour-at', String(this.n + 1)); localStorage.removeItem('hn-guest'); } catch { } this.end(); Cloud.signIn(); },
  start(at = 0) {
    this.end(); this.n = at; Pop.close(); document.querySelectorAll('dialog[open]').forEach(d => d.close());
    const el = this.el = document.createElement('div'); el.className = 'tour';
    el.innerHTML = '<div class="tour-hole"></div><div class="tour-card" role="dialog" aria-live="polite"></div>';
    document.body.appendChild(el);
    el.addEventListener('click', e => { const lk = e.target.closest('[data-look]'); if (lk) { Glass.set(lk.dataset.look === '1'); return this.show(); } const a = e.target.closest('[data-tour]')?.dataset.tour;
      if (a === 'google') return this.google(); if (a === 'guest') { try { localStorage.setItem('hn-guest', '1'); } catch { } return this.go(1); }
      if (a === 'next') this.go(1); else if (a === 'back') this.go(-1); else if (a === 'skip') this.end(true); });
    this.key = e => { if (e.key === 'Enter' && document.activeElement?.closest?.('.tour-card button')) return; if (e.key === 'Escape') this.end(true); else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); this.go(1); } else if (e.key === 'ArrowLeft') this.go(-1); };
    addEventListener('keydown', this.key, true); this.rs = () => this.show(); addEventListener('resize', this.rs);
    this.show();
  },
  go(d) { const all = this.steps(); this.n += d; if (this.n >= all.length) return this.end(true); this.n = Math.max(0, this.n); this.show(); },
  show() {
    const all = this.steps(), [sel, h, p, kind] = all[this.n], el = this.el, hole = el.querySelector('.tour-hole'), card = el.querySelector('.tour-card');
    const t = sel && document.querySelector(sel), r = t?.getBoundingClientRect(), pad = 8;
    card.innerHTML = `<div class="tour-n">${this.n + 1} / ${all.length}</div><h3>${h}</h3><p>${p}</p>${this.n === all.length - 1 ? Glass.pick() : ''}${kind === 'auth' ? `<div class="tour-auth">
        <button class="btn primary g-btn" data-tour="google">${G_SVG}<span>Google ile giriş yap<small>Önerilen · iki cihazda aynı kayıtlar</small></span></button>
        <button class="btn secondary" data-tour="guest">${ic('user')}<span>Misafir olarak devam et<small>Bu cihazda kalır, senkron yok</small></span></button></div>` : ''}
      <div class="tour-acts${kind === 'auth' ? ' no-next' : ''}">${this.n < all.length - 1 ? '<button class="link-btn" data-tour="skip">Atla</button>' : ''}<span class="sp"></span>
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
    card.querySelector(kind === 'auth' ? '[data-tour="google"]' : '[data-tour="next"]').focus({ preventScroll: true });
  },
  end(done) {
    if (this.el) { this.el.remove(); this.el = null; removeEventListener('keydown', this.key, true); removeEventListener('resize', this.rs); }
    if (done) try { localStorage.setItem('hn-tour', '1'); localStorage.removeItem('hn-tour-at'); } catch { }
  },
  maybe() {
    let at = 0; try { if (localStorage.getItem('hn-tour')) return; at = Math.min(+localStorage.getItem('hn-tour-at') || 0, this.steps().length - 1); } catch { return; }
    setTimeout(() => { if (!document.querySelector('dialog[open]') && !$('#lock:not([hidden])')) this.start(at); }, 900);
  },
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
      // 149: the free area ends left of the time line and its month/year labels
      const R = document.body.classList.contains('scrub-on') ? parseFloat(getComputedStyle(document.body).getPropertyValue('--tl-col')) || 108 : 0, W = innerWidth - R;
      const l = $('#list'), lr = l.getBoundingClientRect(), base = lr.left - (this.dx || 0), w = Math.min(360, W - rail - lr.width - 56);
      if (w < 260) { this.hide(); return; }
      const total = lr.width + 16 + w, want = rail + (W - rail - total) / 2;
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
    const on = S.view === 'gallery' && document.body.classList.contains('gallery-view') && !!document.querySelector('#gallery .tile') && matchMedia('(hover: hover) and (min-width: 1100px)').matches;
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
        ${metaHtml(i, { day: true })}</div>
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
    if (a.todo && b.todo && (a.todo.done || b.todo.done)) { m.todo = { ...b.todo, ...a.todo, done: true, doneAt: a.todo.doneAt || b.todo.doneAt }; delete m.todo.doing; }
    else if (a.todo && b.todo && (a.todo.doing || b.todo.doing)) { // 100: done > doing > open; an explicit un-mark only wins when it is newer
      const [x, y] = (a.todo.doingAt || 0) >= (b.todo.doingAt || 0) ? [a.todo, b.todo] : [b.todo, a.todo];
      m.todo = { ...m.todo, doing: x.doingAt && x.doingAt > (y.doingAt || 0) ? x.doing : true, doingAt: x.doingAt || y.doingAt }; if (!m.todo.doing) delete m.todo.doing;
    }
    if (a.starred || b.starred) m.starred = a.starred ?? b.starred;
    if (a.lk || b.lk || a.links || b.links) { // 138: hand-made links combine; a later "Bağlantıyı kaldır" (-time in lk) beats an older add
      const lk = { ...(b.lk || {}) }; for (const [k, v] of Object.entries(a.lk || {})) if (!(k in lk) || Math.abs(v) >= Math.abs(lk[k])) lk[k] = v;
      const u = [...new Set([...(a.links || []), ...(b.links || [])])].filter(r => !(lk[r] < 0));
      if (Object.keys(lk).length) m.lk = lk; if (u.length) m.links = u; else delete m.links;
    }
  }
  if (!a.deleted) keepPos(m, l, r);
  m.updatedAt = Math.max(l.updatedAt || 0, r.updatedAt || 0) + 1;
  return m;
}
function markSeen(i) { // 147: no row shows "seen": saved without redrawing the page (a full redraw made opening an item stutter), the rail count follows when idle
  if (i.seenAt || (i.type !== 'link' && i.type !== 'file')) return;
  if (S.filter.list === 'unseen') return upsert([{ ...i, seenAt: now() }]);
  upsert([{ ...i, seenAt: now() }], { quiet: true });
}
// once a week: a gentle reminder of what was saved and never opened
function weeklyUnseen() {
  const n = alive().filter(unseen).length, d = new Date(), wk = `${d.getFullYear()}-${Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 6048e5)}`;
  try { if (n < 3 || localStorage.getItem('hn-unseen-week') === wk) return; localStorage.setItem('hn-unseen-week', wk); } catch { return; }
  toast(`Bakmadığın ${n} kayıt var`, 8000, 'clock', { label: 'Göster', fn: () => { S.filter.list = 'unseen'; S.filter.type = 'all'; S.filter.star = false; if (S.view === 'todo' || S.view === 'board') setView('list'); else render(); } });
}

// 107a: "Gelen kutusunu temizle" — the last two weeks' unsorted saves as a deck of cards, one at a time:
// → / swipe right = keep, ← / left = trash (undo), ↑ / up = to-do, ↓ / down = archive (off the board). Once a day a gentle nudge.
const Clean = {
  DAYS: 14,
  of: i => !i.parent && !i.sorted && !i.archive && !i.todo && !i.starred && !i.sticky && !i.pending && now() - i.ts < Clean.DAYS * 864e5,
  list() { return alive().filter(this.of).sort((a, b) => b.ts - a.ts); },
  ACTS: { keep: ['Sakla', 'check', 'right'], del: ['Sil', 'trash', 'left'], todo: ['Görev', 'todo', 'up'], arch: ['Arşiv', 'inbox', 'down'] },
  KEYS: { ArrowRight: 'keep', ArrowLeft: 'del', ArrowUp: 'todo', ArrowDown: 'arch' },
  open() {
    let d = $('#clean');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'clean'; d.className = 'drawer modal narrow clean'; document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; this.done(); });
      d.addEventListener('click', e => {
        if (e.target === d || e.target.closest('[data-x]')) return d.close();
        const a = e.target.closest('[data-ca]'); if (a) return this.act(a.dataset.ca);
        if (e.target.closest('[data-cundo]')) return this.undo();
        const o = e.target.closest('[data-copen]'); if (o) { const i = byId(o.dataset.copen); if (i?.url) window.open(i.url, '_blank', 'noopener'); else if (i) { d.close(); openItem(i.id); } }
      });
      d.addEventListener('keydown', e => {
        if (e.altKey || e.ctrlKey || e.metaKey) { if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); this.undo(); } return; }
        const k = this.KEYS[e.key]; if (k) { e.preventDefault(); this.act(k); }
        else if (e.key === 'Backspace' || e.key === 'u') { e.preventDefault(); this.undo(); }
        else if (e.key === 'Enter' && this.q[0]) { e.preventDefault(); d.querySelector('[data-copen]')?.click(); }
      });
      d.addEventListener('pointerdown', e => this.drag(e));
    }
    this.q = this.list(); this.total = this.q.length; this.hist = []; this.changed = false; this.busy = false;
    this.draw(); Back.open(d);
  },
  card(i, n) {
    const sub = subOf(i), when = fmtDay(dayKey(i.ts)), src = i.type === 'link' ? domain(i.url) : i.src ? srcName(i.src) : '';
    return `<div class="cl-card${n ? ' back b' + n : ''}" data-cid="${i.id}"${n ? ' aria-hidden="true"' : ''}>
      ${hasVisual(i) ? thumbBox(i, 'thumb cl-th') : `<div class="cl-ico">${leadOf(i)}</div>`}
      <div class="cl-txt"><b dir="auto">${esc(titleOf(i))}</b>${sub ? `<p dir="auto">${esc(sub.slice(0, 260))}</p>` : ''}</div>
      <div class="cl-meta">${ic(i.type === 'link' ? 'link' : fileKind(i) === 'text' ? 'note' : fileKind(i), 'sm')}<span>${esc([when, src].filter(Boolean).join(' · '))}</span>
        ${n ? '' : `<button class="link-btn cl-open" data-copen="${i.id}">${i.url ? 'Linki aç' : 'Kaydı aç'}</button>`}</div>
      ${n ? '' : Object.entries(this.ACTS).map(([k, [l, icn, dir]]) => `<span class="cl-stamp s-${dir}" data-st="${k}">${ic(icn, 'sm')}${l}</span>`).join('')}
    </div>`;
  },
  draw() {
    const d = $('#clean'), q = this.q, left = q.length, did = this.total - left;
    const deck = left ? q.slice(0, 3).map((i, n) => this.card(i, n)).reverse().join('')
      : `<div class="cl-empty">${ic('check', 'lg')}<b>Gelen kutusu temiz</b><p>${this.total ? `${this.total} kaydın hepsine baktın.` : `Son ${this.DAYS} günde ayıklanacak kayıt yok.`}</p><button class="btn primary" data-x>Kapat</button></div>`;
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type">${ic('inbox', 'sm')}Gelen kutusunu temizle</span><span class="sp"></span>
        <span class="cl-n" aria-live="polite">${left ? `${left} kaldı` : ''}</span><button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      <div class="cl-bar" aria-hidden="true"><i style="width:${this.total ? (did / this.total * 100).toFixed(1) : 100}%"></i></div>
      <div class="cl-deck">${deck}</div>
      ${left ? `<div class="cl-acts">${['del', 'arch', 'todo', 'keep'].map(k => { const [l, icn, dir] = this.ACTS[k]; return `<button class="cl-b cl-${k}" data-ca="${k}" aria-label="${l}"><span class="cl-bi">${ic(icn)}</span><span>${l}</span><kbd class="d-only">${{ left: '←', right: '→', up: '↑', down: '↓' }[dir]}</kbd></button>`; }).join('')}</div>` : ''}
      <div class="cl-foot"><button class="btn ghost sm" data-cundo${this.hist.length ? '' : ' disabled'}>${ic('repeat', 'sm')}Geri al</button><span class="sp"></span><small class="d-only">Ok tuşları · Geri al: Ctrl+Z</small><small class="m-only">Kartı kaydır</small></div></div>`;
    hookThumbs(d); if (d.open) d.querySelector(".d-body").focus({ preventScroll: true }); // the keys keep working after each card
  },
  async act(k, fly = true) {
    const i = this.q[0]; if (!i || this.busy) return; this.busy = true;
    const c = $('#clean .cl-card:not(.back)'), dir = this.ACTS[k][2];
    if (c && fly && !reduced()) { c.classList.add('go', 'go-' + dir); await new Promise(r => setTimeout(r, 200)); }
    const nx = k === 'keep' ? { ...i, sorted: now() } : k === 'del' ? { ...i, deleted: true, deletedAt: now() }
      : k === 'todo' ? { ...i, sorted: now(), noTodo: false, todo: { text: titleOf(i), done: false, user: true } } : { ...i, sorted: now(), archive: true };
    this.hist.push(i); this.q.shift(); this.changed = true; haptic(k === 'del' ? 14 : 8);
    await upsert([nx], { quiet: true });
    this.busy = false; this.draw();
  },
  async undo() {
    const i = this.hist.pop(); if (!i || this.busy) return;
    await upsert([{ ...i, sorted: i.sorted || 0, deleted: !!i.deleted, deletedAt: i.deletedAt || undefined, todo: i.todo || null, archive: !!i.archive }], { quiet: true }); // the whole item as it was
    this.q.unshift(byId(i.id)); this.draw();
  },
  done() { if (!this.changed) return; this.changed = false; S.items = [...S.items]; runSearch(); render(); renderChrome(); }, // quiet saves → one redraw when the window closes
  drag(e) { // swipe: the dominant axis past ~28% of the card (or a quick flick) picks the action; otherwise it springs back
    const c = e.target.closest('.cl-card:not(.back)'); if (!c || e.button || e.target.closest('button, a') || this.busy) return;
    const x0 = e.clientX, y0 = e.clientY, t0 = performance.now(), W = c.offsetWidth, H = c.offsetHeight; let dx = 0, dy = 0, on = false;
    const pick = () => { const ax = Math.abs(dx) >= Math.abs(dy); return ax ? (dx > 0 ? 'keep' : 'del') : (dy < 0 ? 'todo' : 'arch'); };
    const move = ev => { dx = ev.clientX - x0; dy = ev.clientY - y0;
      if (!on) { if (Math.hypot(dx, dy) < 6) return; on = true; c.setPointerCapture?.(e.pointerId); c.classList.add('drag'); }
      const p = Math.min(1, Math.max(Math.abs(dx) / (W * .28), Math.abs(dy) / (H * .28)));
      c.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / W * 10}deg)`;
      const k = pick(); for (const s of c.querySelectorAll('.cl-stamp')) s.style.opacity = s.dataset.st === k ? p : 0; };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      if (!on) return; c.classList.remove('drag');
      const v = Math.hypot(dx, dy) / Math.max(1, performance.now() - t0), far = Math.abs(dx) > W * .28 || Math.abs(dy) > H * .28 || (v > .6 && Math.hypot(dx, dy) > 40);
      if (far) { const k = pick(), m = 1.6; c.style.transition = 'transform .2s ease-in, opacity .2s'; c.style.transform = `translate(${dx * m + Math.sign(dx) * W * (Math.abs(dx) >= Math.abs(dy) ? .6 : 0)}px, ${dy * m + Math.sign(dy) * H * (Math.abs(dy) > Math.abs(dx) ? .6 : 0)}px) rotate(${dx / W * 16}deg)`; c.style.opacity = 0;
        setTimeout(() => this.act(k, false), 180); }
      else { c.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1.2)'; c.style.transform = ''; for (const s of c.querySelectorAll('.cl-stamp')) s.style.opacity = 0; setTimeout(() => { c.style.transition = ''; }, 240); } };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  },
  nudge() { // once a day, only when there is something worth a minute
    const n = this.list().length, day = dayKey(now());
    try { if (n < 5 || localStorage.getItem('hn-clean-day') === day) return; localStorage.setItem('hn-clean-day', day); } catch { return; }
    if (document.querySelector('dialog[open]')) return;
    toast(`Gelen kutunda ${n} kayıt var`, 8000, 'inbox', { label: 'Temizle', fn: () => this.open() });
  },
};
// 107f: "Toparla" — Nts tidies itself, but always asks first: the same link/file/photo or the same note saved twice → "Birleştireyim mi?",
// links that no longer open (the bridge checks a few a day, each link once a month; only 404/410 or a vanished site counts) → marked
// "açılmıyor", things nobody opened for 4 months → "Arşivleyeyim mi?". Every action has "Geri al"; "Kalsın" hides that suggestion (this device).
const Tidy = {
  OLD: 120 * 864e5, n: 0,
  skips() { if (!this._sk) { try { this._sk = new Set(JSON.parse(localStorage.getItem('hn-tidy-skip') || '[]')); } catch { this._sk = new Set(); } } return this._sk; },
  skip(k) { const s = this.skips(); s.add(k); try { localStorage.setItem('hn-tidy-skip', JSON.stringify([...s].slice(-3000))); } catch { } },
  last: i => Math.max(i.openedAt || 0, i.seenAt || 0, i.sorted || 0, i.ts || 0),
  oldOf(i) { return !i.parent && !i.archive && !i.starred && !i.todo && !i.sticky && !i.pending && !i.project && !(i.links || []).length && now() - this.last(i) > this.OLD; },
  scan() {
    const sk = this.skips(), live = alive();
    const dups = [...NtsDedup.groups(S.items, PH.m), ...NtsDedup.noteGroups(S.items)].filter(g => !sk.has('d:' + g.ids.join(',')));
    const dead = live.filter(i => i.type === 'link' && i.dead && !i.parent && !sk.has('x:' + i.id)).sort((a, b) => b.ts - a.ts);
    const old = live.filter(i => this.oldOf(i) && !sk.has('o:' + i.id)).sort((a, b) => this.last(a) - this.last(b));
    this.n = dups.length + dead.length + (old.length >= 5 ? 1 : 0); // a pile of old things counts as one suggestion
    return { dups, dead, old };
  },
  touch(id) { // when an item was last opened (synced, at most once a week per item)
    const i = byId(id); if (!i || (i.openedAt && now() - i.openedAt < 7 * 864e5)) return;
    upsert([{ ...i, openedAt: now() }], { quiet: true });
  },
  async check() { // a few links a run; each link once a month; this device keeps when (no sync noise)
    if (!S.bridgeOk || this._chk || document.hidden) return; this._chk = true;
    try {
      let seen = {}; try { seen = JSON.parse(localStorage.getItem('hn-linkcheck') || '{}'); } catch { }
      const due = alive().filter(i => i.type === 'link' && i.url && /^https?:/.test(i.url) && !i.parent && now() - (seen[i.id] || 0) > 30 * 864e5)
        .sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0) || a.ts - b.ts).slice(0, 25);
      if (!due.length) return;
      const r = await AI.call('/check', { urls: due.map(i => i.url) }, 60000);
      const res = due.map(i => r?.[i.url]).filter(Boolean);
      if (res.length && res.every(x => x.status === 0)) return; // no network → no verdict
      const upd = [];
      for (const i of due) { const x = r?.[i.url]; if (!x) continue; seen[i.id] = now(); const cur = byId(i.id); if (!cur) continue;
        if (x.dead && !cur.dead) upd.push({ ...cur, dead: now() }); else if (!x.dead && cur.dead && x.status) upd.push({ ...cur, dead: 0 }); }
      const ks = Object.keys(seen); if (ks.length > 20000) for (const k of ks.sort((a, b) => seen[a] - seen[b]).slice(0, 5000)) delete seen[k];
      try { localStorage.setItem('hn-linkcheck', JSON.stringify(seen)); } catch { }
      if (upd.length) await upsert(upd);
    } catch (e) { console.warn('linkcheck', e.message); } finally { this._chk = false; }
  },
  boot() {
    this.check(); setInterval(() => this.check(), 30 * 60e3);
    setTimeout(() => { // once a week, only when there is something real
      this.scan(); const d = new Date(), wk = `${d.getFullYear()}-${Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 6048e5)}`;
      renderChrome();
      try { if (this.n < 3 || localStorage.getItem('hn-tidy-week') === wk) return; localStorage.setItem('hn-tidy-week', wk); } catch { return; }
      if (document.querySelector('dialog[open]')) return;
      toast(`Toparlanacak ${this.n} şey var`, 8000, 'spark', { label: 'Toparla', fn: () => this.open() });
    }, 4000);
  },
  open() {
    let d = $('#tidy');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'tidy'; d.className = 'drawer modal narrow tidy'; document.body.appendChild(d);
      d.addEventListener('close', () => { if (!d._fromBack && !Back._skip && history.state?.nts === d.id) { Back._skip = true; history.back(); } d._fromBack = false; this.done(); });
      d.addEventListener('click', e => {
        if (e.target === d || e.target.closest('[data-x]')) return d.close();
        if (e.target.closest('[data-tundo]')) return this.undo();
        const b = e.target.closest('[data-ta]'); if (b) return this.act(b.dataset.ta, b.dataset.k);
        const o = e.target.closest('[data-topen]'); if (o) { d.close(); openItem(o.dataset.topen); }
      });
    }
    this.changed = false; this.last1 = null; this.draw(); Back.open(d);
  },
  row(i, sub, acts, k) {
    return `<div class="td-row" data-k="${esc(k)}"><button class="td-go" data-topen="${i.id}">${hasVisual(i) ? thumbBox(i, 'thumb td-th') : `<span class="td-ic ${i.type}-c">${leadOf(i)}</span>`}
      <span class="td-t"><b dir="auto">${esc(titleOf(i))}</b><small dir="auto">${sub}</small></span></button>
      <span class="td-acts">${acts.map(([a, l, cls]) => `<button class="btn sm ${cls || 'ghost'}" data-ta="${a}" data-k="${esc(k)}">${l}</button>`).join('')}</span></div>`;
  },
  draw() {
    const d = $('#tidy'); if (!d) return; const { dups, dead, old } = this.scan(), more = (n, l) => n > l ? `<p class="hint td-more">…ve ${n - l} tane daha</p>` : '';
    const KIND = { link: 'aynı link', file: 'aynı dosya', photo: 'benzer foto', note: 'aynı not' };
    const sec = (icn, h, n, body, extra = '') => n ? `<section class="td-sec"><h3>${ic(icn, 'sm')}<span>${h}</span><span class="td-n">${n}</span>${extra}</h3>${body}</section>` : '';
    const body = sec('copy', 'Kopyalar', dups.length, dups.slice(0, 20).map(g => { const [k, ...c] = g.ids.map(byId); return k ? this.row(k, `${c.length + 1} kez · ${KIND[g.kind]} · ilk ${esc(fmtDay(dayKey(Math.min(k.ts, ...c.map(x => x.ts)))))}`, [['merge', 'Birleştir', 'primary'], ['skip', 'Kalsın']], 'd:' + g.ids.join(',')) : ''; }).join('') + more(dups.length, 20))
      + sec('link', 'Açılmayan linkler', dead.length, dead.slice(0, 20).map(i => this.row(i, `${esc(domain(i.url))} · artık açılmıyor`, [['del', 'Sil', 'danger'], ['skip', 'Kalsın']], 'x:' + i.id)).join('') + more(dead.length, 20))
      + sec('inbox', 'Aylardır açılmadı', old.length, old.slice(0, 20).map(i => this.row(i, `son ${esc(fmtDay(dayKey(this.last(i))))}`, [['arch', 'Arşivle'], ['skip', 'Kalsın']], 'o:' + i.id)).join('') + more(old.length, 20),
        old.length > 1 ? `<button class="link-btn td-all" data-ta="archall" data-k="">Hepsini arşivle</button>` : '');
    d.innerHTML = `<div class="d-body" tabindex="-1"><div class="d-head"><span class="type">${ic('spark', 'sm')}Toparla</span><span class="sp"></span>
      <button class="icon-btn sm" data-x title="Kapat" aria-label="Kapat">${ic('x')}</button></div>
      ${this.last1 ? `<div class="td-undo" role="status">${ic('check', 'sm')}<span>${esc(this.last1.msg)}</span><button class="btn ghost sm" data-tundo>${ic('repeat', 'sm')}Geri al</button></div>`
        : '<p class="hint td-lead">Nts kendi bakar, sen karar verirsin. Her adım geri alınır; arşivlenenler aramada durur.</p>'}
      ${body || `<div class="cl-empty td-empty">${ic('check', 'lg')}<b>Her şey toparlı</b><p>Kopya, açılmayan link ya da unutulmuş kayıt yok.</p><button class="btn primary" data-x>Kapat</button></div>`}</div>`;
    hookThumbs(d);
  },
  async act(a, k) {
    if (this.busy) return; this.busy = true;
    try {
      const { dups, dead, old } = this.scan(); let before = [], upd = [], msg = '';
      if (a === 'skip') { this.skip(k); return this.draw(); }
      if (a === 'merge') { const g = dups.find(g => 'd:' + g.ids.join(',') === k); const [kp, ...c] = (g?.ids || []).map(byId).filter(Boolean); if (!kp || !c.length) return;
        before = [kp, ...c].map(x => ({ ...x })); const r = NtsDedup.merge(kp, c, now()); upd = [r.keep, ...r.gone]; msg = `${c.length} kopya birleşti`; }
      if (a === 'del') { const i = dead.find(i => 'x:' + i.id === k); if (!i) return; before = [{ ...i }]; upd = [{ ...i, deleted: true, deletedAt: now() }]; msg = 'Çöp kutusuna gitti'; }
      if (a === 'arch' || a === 'archall') { const l = a === 'arch' ? old.filter(i => 'o:' + i.id === k) : old; if (!l.length) return;
        before = l.map(x => ({ ...x })); upd = l.map(i => ({ ...i, archive: true, onBoard: false, sorted: now() })); msg = `${l.length} kayıt arşivlendi`; }
      if (!upd.length) return;
      for (let x = 0; x < upd.length; x += 500) await upsert(upd.slice(x, x + 500), { quiet: upd.length === 1 });
      this.changed = true; haptic(8);
      const r = $(`#tidy .td-row[data-k="${CSS.escape(k)}"]`);
      if (r && a !== 'archall' && !reduced()) { r.classList.add('gone'); await new Promise(res => setTimeout(res, 180)); }
      this.last1 = { msg, before }; this.draw(); // the undo sits inside the window (a toast would be under the modal)
    } finally { this.busy = false; }
  },
  async undo() {
    const u = this.last1; if (!u || this.busy) return; this.busy = true; this.last1 = null;
    try { for (let x = 0; x < u.before.length; x += 500) await upsert(u.before.slice(x, x + 500).map(i => ({ ...i, deleted: !!i.deleted, deletedAt: i.deletedAt, archive: !!i.archive, onBoard: i.onBoard, dupOf: i.dupOf })), { quiet: u.before.length === 1 }); }
    finally { this.busy = false; } this.changed = true; this.draw();
  },
  done() { if (!this.changed) return; this.changed = false; S.items = [...S.items]; runSearch(); render(); renderChrome(); },
};
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
  if (NtsMigrate.NAMES[s]) return i.source === s; // 107d
  if (s === 'web') return i.source === 'web'; // 95g: sent with the browser extension
  if (s === 'pc') return i.source === 'pc' || (i.dev === 'pc' && i.source !== 'whatsapp' && i.source !== 'bookmarks');
  if (s === 'phone') return i.source === 'share' || (i.dev === 'phone' && i.source !== 'whatsapp' && i.source !== 'bookmarks');
  return true;
}
const MIG_SRC = ['keep', 'apple', 'notion', 'evernote', 'telegram']; // 107d
const srcName = s => s.startsWith('wa:') ? s.slice(3) || 'WhatsApp' : { bookmarks: 'Yer imleri', pc: 'Bilgisayar', web: 'Tarayıcı', phone: 'Telefon', ...NtsMigrate.NAMES }[s] || s;
function srcRows(live, cur) {
  const n = {}, chats = new Map();
  for (const i of live) { if (i.source === 'whatsapp') chats.set(i.chat || '', (chats.get(i.chat || '') || 0) + 1); for (const s of ['bookmarks', 'pc', 'web', 'phone', ...MIG_SRC]) if (srcMatch(i, s)) n[s] = (n[s] || 0) + 1; }
  const rows = [...[...chats].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c, k]) => ['wa:' + c, 'chat', c || 'WhatsApp', k]), ['pc', 'cpu', 'Bilgisayar', n.pc], ['web', 'link', 'Tarayıcı', n.web], ['phone', 'share', 'Telefon', n.phone], ['bookmarks', 'book', 'Yer imleri', n.bookmarks], ...MIG_SRC.map(k => [k, Mig.icon(k), NtsMigrate.NAMES[k], n[k]])].filter(r => r[3] || r[0] === cur);
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
    const inp = $('#input'); inp.value = s.q; S.q = s.q; if (s.q) { S.mode = 'find'; renderModes(); S.hitsOff = true; } S.searchOn = !!s.q && findMode(); runSearch(); autoGrow();
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
      cells += c ? `<button class="hc l${lv(c)}${key === today ? ' today' : ''}" data-hday="${key}" title="${F_DLW.format(d)} · ${c} kayıt${Summ.day(key) ? '\n' + esc(Summ.day(key)) : ''}" aria-label="${d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}, ${c} kayıt"></button>` : `<i class="hc${key === today ? ' today' : ''}${key > today ? ' fut' : ''}"></i>`;
    }
    return `<div class="heat"><div class="heat-top"><div class="heat-ys">${years.slice(0, 6).map(v => `<button class="${v === y ? 'on' : ''}" data-hyear="${v}">${v}</button>`).join('')}</div><span class="muted">${total} kayıt</span></div>
      <div class="heat-scroll"><div class="heat-ms">${months}</div><div class="heat-g">${cells}</div></div>
      <div class="heat-leg"><span>Az</span><i class="hc"></i><i class="hc l1"></i><i class="hc l2"></i><i class="hc l3"></i><i class="hc l4"></i><span>Çok</span></div></div>`;
  },
};
// 60: thin bar on the right edge of the list / gallery: drag from today down to the oldest month
// 149: every month has a tick (empty months too, so the line reads like a calendar); months with more items get a stronger tick, the year a
// long one. The dot glides (transform, springy) and snaps to a month; month names show next to the dot and wherever the pointer is, the far
// ones fade. Dragging follows the finger with a "Mar 2025" bubble and a light tick on every new month. ↑↓ month, PgUp/PgDn year, Home/End.
const Scrub = {
  el: null, months: [], H: 0, lit: [],
  init() {
    const el = this.el = document.createElement('div'); el.className = 'scrub'; el.hidden = true; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', 'Zamanda git'); el.tabIndex = 0; document.body.appendChild(el);
    // 149b: the strip's box is read once per gesture (no layout read per move) and moves are drawn once a frame (rAF, translate only)
    let drag = false, last = -1, R = null, qe = null, raf = 0;
    const box = () => (R = el.getBoundingClientRect());
    const fy = e => { const r = R || box(); return Math.max(0, Math.min(r.height, e.clientY - r.top)); };
    const queue = (e, follow) => { qe = [e.clientY, follow]; if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (qe) show({ clientY: qe[0] }, qe[1]); qe = null; }); };
    const at = y => Math.min(this.months.length - 1, Math.max(0, Math.floor(y / (this.H || 1) * this.months.length)));
    const show = (e, follow) => { const y = fy(e), k = at(y); if (!this.months[k]) return k;
      const b = this._bub || (this._bub = el.querySelector('.sc-bub'));
      if (k !== this._shown) { const [yr, mo] = this.months[k].split('-').map(Number); b.firstChild ? (b.firstChild.data = `${MS_TR[mo - 1]} ${yr}`) : (b.textContent = `${MS_TR[mo - 1]} ${yr}`); this.focus(k); this._shown = k; } // text/labels only when the month changes (a text node edit, no child list change)
      b.style.translate = `0 ${(follow ? y : this.y(k)).toFixed(1)}px`; if (!el.classList.contains('drag')) el.classList.add('drag');
      if (follow) { (this._dot || (this._dot = el.querySelector('.sc-now'))).style.translate = `0 ${y.toFixed(1)}px`; if (k !== last && last >= 0) haptic(4); }
      last = k; return k; };
    const go = k => { const m = this.months[k]; if (!m) return; const [y, mo] = m.split('-').map(Number), was = this.cur(); showFrom(k === 0 ? null : new Date(y, mo, 1).getTime() - 1);
      // the list arrives with a short spring from where the dot moved (up/down), instead of a hard cut
      const L = S.view === 'gallery' ? $('#gallery') : $('#list'); if (!L || reduced()) return; const d = k > was ? 18 : k < was ? -18 : 0;
      if (d) L.animate([{ translate: `0 ${d}px`, opacity: .55 }, { translate: '0 0', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.34,1.3,.5,1)' }); };
    const grab = on => { el.classList.toggle('held', on); document.body.classList.toggle('scrubbing', on); };
    el.addEventListener('pointerenter', box);
    el.addEventListener('pointerdown', e => { drag = true; last = -1; this._shown = -1; box(); el.setPointerCapture(e.pointerId); grab(true); show(e, true); e.preventDefault(); });
    el.addEventListener('pointermove', e => { if (drag) queue(e, true); else if (e.pointerType === 'mouse') queue(e, false); });
    const rest = () => { qe = null; this._shown = -1; grab(false); el.classList.remove('drag'); this.focus(this.cur()); this.place(); };
    el.addEventListener('pointerleave', () => { if (!drag) rest(); });
    el.addEventListener('pointerup', e => { if (!drag) return; drag = false; qe = null; const k = at(fy(e)); grab(false); this.place(k); el.classList.remove('drag'); go(k); R = null; });
    el.addEventListener('pointercancel', () => { drag = false; R = null; rest(); });
    el.addEventListener('lostpointercapture', () => { if (drag) { drag = false; rest(); } });
    // phones: only shows while scrolling (a thumb near the edge must still scroll the list)
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches; if (touch) el.classList.add('idle');
    addEventListener('scroll', () => { if (!touch || el.hidden) return; el.classList.remove('idle'); clearTimeout(this._it); this._it = setTimeout(() => el.classList.add('idle'), 1800); }, { passive: true });
    el.addEventListener('pointerup', () => { if (touch) { clearTimeout(this._it); this._it = setTimeout(() => el.classList.add('idle'), 1800); } });
    el.addEventListener('keydown', e => {
      const n = this.months.length, cur = this.cur(), d = { ArrowDown: 1, ArrowUp: -1, PageDown: 12, PageUp: -12, Home: -n, End: n }[e.key];
      if (d == null) return; e.preventDefault(); const k = Math.max(0, Math.min(n - 1, cur + d)); if (k !== cur) { this.place(k); go(k); }
    });
    new ResizeObserver(() => { R = null; const h = el.clientHeight; if (h && h !== this.H) { this.H = h; this.place(); } }).observe(el);
    addEventListener('scroll', () => { if (!drag) R = null; }, { passive: true });
  },
  y(k) { return (k + .5) / this.months.length * this.H; },
  place(k = this.cur()) { const d = this.el?.querySelector('.sc-now'); if (d && this.H) d.style.translate = `0 ${this.y(k).toFixed(1)}px`; },
  // month names near k: every `step`-th month so they never touch, fading with distance; year slots keep their year label
  focus(k) {
    const ls = this.el.querySelectorAll('.sc-m'), n = this.months.length, step = Math.max(1, Math.ceil(15 / ((this.H || 400) / n)));
    for (const x of this.lit) { x.style.opacity = ''; } this.lit = [];
    const k0 = k - k % step;
    for (let j = -3; j <= 3; j++) { const m = k0 + j * step, x = ls[m]; if (!x || x.classList.contains('yr')) continue; x.style.opacity = [1, .7, .42, .2][Math.abs(j)]; this.lit.push(x); }
  },
  cur() { if (!S.listFrom) return 0; const k = dayKey(S.listFrom).slice(0, 7); const n = this.months.indexOf(k); return n < 0 ? 0 : n; },
  draw(items) {
    if (!this.el) return;
    const on = (S.view === 'list' || S.view === 'gallery') && !(S.searchOn && S.q.trim()) && items.length > 20;
    const cnt = new Map(); if (on) for (const i of items) { const m = dayKey(i.ts).slice(0, 7); cnt.set(m, (cnt.get(m) || 0) + 1); }
    let ms = [];
    if (cnt.size >= 3) { // every month from the newest to the oldest, empty ones included (capped at 50 years)
      const ks = [...cnt.keys()].sort(), [y0, m0] = ks[0].split('-').map(Number); let [y, m] = ks.at(-1).split('-').map(Number);
      while ((y > y0 || (y === y0 && m >= m0)) && ms.length < 600) { ms.push(`${y}-${String(m).padStart(2, '0')}`); if (--m < 1) { m = 12; y--; } }
    }
    this.el.hidden = !on || ms.length < 3; document.body.classList.toggle('scrub-on', !this.el.hidden); if (this.el.hidden) return;
    const max = Math.max(...cnt.values()), key = ms.map(m => m + ':' + Math.ceil((cnt.get(m) || 0) / max * 3)).join(','); this.months = ms;
    const cur = this.cur(); this.el.setAttribute('aria-valuetext', `${MS_TR[+ms[cur].slice(5) - 1]} ${ms[cur].slice(0, 4)}`); this.el.setAttribute('aria-valuemin', 0); this.el.setAttribute('aria-valuemax', ms.length - 1); this.el.setAttribute('aria-valuenow', cur);
    if (this._key !== key) {
      this._key = key; this.lit = []; this.H = this.el.clientHeight;
      const n = ms.length, pc = k => ((k + .5) / n * 100).toFixed(3) + '%';
      let h = '<div class="sc-track"></div>';
      ms.forEach((m, k) => { const yr = k === 0 || ms[k - 1].slice(0, 4) !== m.slice(0, 4), c = cnt.get(m) || 0, lv = c ? Math.ceil(c / max * 3) : 0;
        h += `<i class="sc-t l${lv}${yr ? ' yt' : ''}" style="top:${pc(k)}"></i><span class="sc-m${yr ? ' yr' : ''}" style="top:${pc(k)}">${yr ? m.slice(0, 4) : MS_TR[+m.slice(5) - 1]}</span>`; });
      this.el.innerHTML = h + '<span class="sc-now"></span><span class="sc-bub"></span>'; this._bub = this._dot = null; this._shown = -1;
    }
    if (!this.el.classList.contains('drag')) { this.place(cur); this.focus(cur); }
  },
};

// ---------- right-click / long-press menu on any item ----------
// 134: gallery multi-select — phone: long press a tile, then taps add/remove; desktop: drag a box on empty space, Ctrl/Shift-click,
// or "Seç". A bar at the bottom ("12 seçili") tags, puts on a board or deletes them all at once (undo restores every one).
const Sel = {
  ids: new Set(), mode: false, last: null, bar: null, pop: null, eat: false,
  tiles: () => [...document.querySelectorAll('#gallery .tile[data-id]')],
  start(id) { this.mode = true; if (id) { this.ids.add(id); this.last = id; } haptic(10); this.paint(); },
  toggle(id, range) {
    if (range && this.last) { const t = this.tiles().map(x => x.dataset.id), a = t.indexOf(this.last), b = t.indexOf(id);
      if (a >= 0 && b >= 0) { t.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => this.ids.add(x)); this.paint(); return; } }
    this.mode = true; this.ids.has(id) ? this.ids.delete(id) : this.ids.add(id); this.last = id; this.paint();
  },
  clear() { if (!this.mode && !this.ids.size) return; this.ids.clear(); this.mode = false; this.last = null; this.hidePop(); this.paint(); },
  click(e) { // the gallery's click: true = handled here (no open)
    const t = e.target.closest('.tile[data-id]');
    if (this.eat) { this.eat = false; return true; }
    if (e.target.closest('[data-selmode]')) { this.mode ? this.clear() : this.start(); return true; }
    if (!t) return false;
    if (e.ctrlKey || e.metaKey || e.shiftKey) { e.preventDefault(); this.toggle(t.dataset.id, e.shiftKey); return true; }
    if (this.mode) { this.toggle(t.dataset.id); return true; }
    return false;
  },
  paint() {
    if (S.view !== 'gallery') { this.ids.clear(); this.mode = false; }
    const on = this.mode; document.body.classList.toggle('selecting', on);
    for (const t of this.tiles()) { const s = this.ids.has(t.dataset.id); t.classList.toggle('sel', s); t.setAttribute('aria-selected', s); }
    $('#gallery [data-selmode]')?.setAttribute('aria-pressed', on);
    const sb = $('#gallery [data-selmode]'); if (sb) { sb.classList.toggle('on', on); sb.querySelector('span').textContent = on ? 'Bitti' : 'Seç'; }
    let b = this.bar;
    if (!on) { if (b) b.hidden = true; return; }
    if (!b) { b = this.bar = document.createElement('div'); b.id = 'selBar'; b.className = 'sel-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Seçilenler'); document.body.appendChild(b);
      b.addEventListener('click', e => { const a = e.target.closest('[data-sa]')?.dataset.sa; if (a) this.act(a, e.target.closest('[data-sa]')); }); }
    const n = this.ids.size, all = this.tiles().length;
    b.innerHTML = `<button class="icon-btn sm" data-sa="x" title="Seçimi bitir (Esc)" aria-label="Seçimi bitir">${ic('x', 'sm')}</button>
      <span class="sel-n" aria-live="polite">${n ? `<b>${n}</b> seçili` : 'Seçmek için dokun'}</span>
      <button class="sel-b" data-sa="all">${n && n === all ? 'Hiçbiri' : 'Tümü'}</button>
      <button class="sel-b" data-sa="tag"${n ? '' : ' disabled'}>${ic('hash', 'sm')}<span>Etiket</span></button>
      <button class="sel-b" data-sa="board"${n ? '' : ' disabled'}>${ic('board', 'sm')}<span>Panoya</span></button>
      <button class="sel-b danger" data-sa="del"${n ? '' : ' disabled'}>${ic('trash', 'sm')}<span>Sil</span></button>`;
    b.hidden = false;
  },
  picked: () => S.view === 'board' ? Link.items().filter(i => i.type !== 'draw') : [...Sel.ids].map(byId).filter(i => i && !i.deleted), // 139: the board's selection tags too
  async act(a, btn) {
    if (a === 'x') return this.clear();
    if (a === 'all') { const t = this.tiles(); if (this.ids.size === t.length) this.ids.clear(); else t.forEach(x => this.ids.add(x.dataset.id)); return this.paint(); }
    const list = this.picked(); if (!list.length) return;
    if (a === 'del') {
      const old = list.map(i => ({ ...i })); S.undo = null; haptic(14); this.clear();
      await upsert(list.map(i => ({ ...i, deleted: true, deletedAt: now() })));
      toast(`${old.length} kayıt çöp kutusuna taşındı`, 6000, 'trash', { label: 'Geri al', fn: async () => { await upsert(old.map(i => ({ ...i, deleted: false, deletedAt: undefined }))); toast('Geri alındı', 1800, 'check'); } });
      return;
    }
    if (this.pop && !this.pop.hidden && this.pop._a === a) return this.hidePop();
    this.showPop(a, btn);
  },
  hidePop() { if (this.pop) this.pop.hidden = true; },
  showPop(a, btn) {
    let p = this.pop; if (!p) { p = this.pop = document.createElement('div'); p.className = 'pop sel-pop'; p.hidden = true; document.body.appendChild(p);
      p.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.stag) this.addTag(b.dataset.stag); else if (b.dataset.sboard !== undefined) this.toBoard(b.dataset.sboard); });
      p.addEventListener('submit', e => { e.preventDefault(); const v = p.querySelector('input').value; if (v.trim()) this.addTag(v); });
      document.addEventListener('pointerdown', e => { if (!e.target.closest('.sel-pop,[data-sa],[data-la="tag"]')) this.hidePop(); }, true); }
    p._a = a; const list = this.picked();
    if (a === 'tag') {
      const cnt = new Map(); S.items.forEach(i => !i.deleted && (i.tags || []).forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1)));
      const every = t => list.every(i => (i.tags || []).includes(t));
      const top = [...cnt].sort((x, y) => y[1] - x[1]).map(x => x[0]).filter(t => !every(t)).slice(0, 10);
      p.innerHTML = `<form class="sel-form"><input dir="auto" placeholder="Etiket yaz, Enter" aria-label="Etiket" autocomplete="off" enterkeyhint="done"><button class="btn sm">Ekle</button></form>
        ${top.length ? `<div class="side-label">Sık kullanılan</div><div class="tp-chips">${top.map(t => `<button class="lchip" data-stag="${esc(t)}" dir="auto">#${esc(t)}</button>`).join('')}</div>` : ''}`;
    } else {
      const has = n => list.every(i => n ? inBoard(i, n) : i.onBoard || i.pos);
      p.innerHTML = `<div class="side-label">${list.length} kaydı panoya koy</div>
        ${['', ...boardNames()].map(n => `<button class="side-row" data-sboard="${esc(n)}">${ic(n ? 'folder' : 'board', 'sm')}<span class="lbl" dir="auto">${n ? esc(n) : 'Ana pano'}</span>${has(n) ? ic('check', 'sm') : ''}</button>`).join('')}`;
    }
    p.hidden = false;
    const r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; p.style.top = Math.max(8, r.top - h - 8) + 'px';
    if (a === 'tag' && matchMedia('(hover: hover)').matches) p.querySelector('input').focus();
  },
  async addTag(v) {
    const t = v.trim().toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-'); if (!t) return;
    const list = this.picked().filter(i => !(i.tags || []).includes(t)); this.hidePop();
    if (list.length) await upsert(list.map(i => ({ ...i, tags: [...(i.tags || []), t] })));
    toast(`#${t} · ${this.picked().length} kayıt`, 2200, 'hash'); S.view === 'board' ? Link.paint() : this.paint();
  },
  async toBoard(n) {
    const list = this.picked(); this.hidePop();
    if (S.view !== 'board') Motion.eat(list.map(i => document.querySelector(`.gallery [data-id="${CSS.escape(i.id)}"],#list [data-id="${CSS.escape(i.id)}"]`)), $('#viewSwitch [data-view="board"]'), list.length); // 142 m3-C
    await upsert(list.map(i => n ? { ...i, boards: [...new Set([...(i.boards || []), n])] } : { ...i, onBoard: true }));
    toast(`${list.length} kayıt ${n ? `“${n}” panosuna` : 'panoya'} kondu`, 3000, 'board', { label: 'Panoya git', fn: () => { this.clear(); if (n) S.board = n; setView('board'); } });
    this.paint();
  },
  init() {
    const g = $('#gallery'); let d = null;
    // desktop: press on empty space and drag → a box; tiles it touches get selected (Ctrl/Shift keeps the earlier ones)
    g.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('.tile,button,a,input,.l-top')) return;
      d = { x: e.clientX, y: e.clientY + scrollY, base: e.ctrlKey || e.metaKey || e.shiftKey ? new Set(this.ids) : new Set(), box: null };
    });
    addEventListener('pointermove', e => {
      if (!d) return; const y = e.clientY + scrollY;
      if (!d.box) { if (Math.hypot(e.clientX - d.x, y - d.y) < 6) return; d.box = document.createElement('div'); d.box.className = 'sel-box'; document.body.appendChild(d.box); this.mode = true; getSelection()?.removeAllRanges(); }
      const l = Math.min(d.x, e.clientX), r = Math.max(d.x, e.clientX), t = Math.min(d.y, y), b = Math.max(d.y, y);
      Object.assign(d.box.style, { left: l + 'px', top: t - scrollY + 'px', width: r - l + 'px', height: b - t + 'px' });
      this.ids = new Set(d.base);
      for (const el of this.tiles()) { const q = el.getBoundingClientRect(); if (q.right > l && q.left < r && q.bottom + scrollY > t && q.top + scrollY < b) this.ids.add(el.dataset.id); }
      if (e.clientY > innerHeight - 40) scrollBy(0, 14); else if (e.clientY < 70) scrollBy(0, -14);
      this.paint();
    });
    addEventListener('pointerup', () => { if (!d) return; if (d.box) { d.box.remove(); this.eat = true; setTimeout(() => this.eat = false, 0); } d = null; });
    addEventListener('keydown', e => {
      if (!this.mode || e.target.closest('input,textarea,[contenteditable]') || document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') { if (this.pop && !this.pop.hidden) this.hidePop(); else this.clear(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); this.tiles().forEach(x => this.ids.add(x.dataset.id)); this.paint(); }
      else if (e.key === 'Delete' && this.ids.size) this.act('del');
    });
  },
};
// 138: link cards by hand. Board card: right click (phone: long press) → "Bağla…" → click / tap the other card (Esc cancels);
// or Shift-click 2+ cards → "Bağla" (a chain in time order). Linked: "Bağlantıyı kaldır" in the same menu. Stored as i.links (drawn as
// 'man' wires, 108) + i.lk {otherId: +time added / -time removed} so two devices merge adds and removals (mergeItem).
const Link = {
  sel: new Set(), bar: null,
  mine: i => [...new Set([...(i.links || []), ...S.items.filter(x => !x.deleted && (x.links || []).includes(i.id)).map(x => x.id)])].map(byId).filter(x => x && !x.deleted),
  async set(a, b, on, say) {
    const A = byId(a), B = byId(b); if (!A || !B || a === b) return; const t = now(), out = [];
    for (const [x, y] of [[A, b], [B, a]]) {
      const has = (x.links || []).includes(y);
      if (on ? x === A && !has && !(B.links || []).includes(a) : has) { const l = on ? [...(x.links || []), y] : x.links.filter(r => r !== y); out.push({ ...x, links: l.length ? l : undefined, lk: { ...(x.lk || {}), [y]: on ? t : -t } }); }
    }
    if (!out.length) return; await upsert(out); haptic(12); if (on) Motion.linked(a, b); // 142 m6-C
    if (say) toast(on ? 'Bağlandı' : 'Bağlantı kaldırıldı', 4000, 'link', { label: 'Geri al', fn: () => this.set(a, b, !on) });
  },
  menu(i) {
    const lk = this.mine(i), board = S.view === 'board' && !i.sticky, n = this.sel.size;
    if (board && n >= 2 && this.sel.has(i.id)) { const nl = this.linkable().length, nc = [...this.sel].filter(id => Board.M?.has(id)).length; // 139
      return (nl >= 2 ? `<button class="side-row" data-a="linksel">${ic('link', 'sm')}<span class="lbl">Seçilen ${nl} kartı bağla</span></button>` : '')
        + `<button class="side-row" data-a="seltag">${ic('hash', 'sm')}<span class="lbl">Seçilenleri etiketle</span></button>`
        + (nc >= 2 ? `<button class="side-row" data-a="selalign">${ic('grid', 'sm')}<span class="lbl">Hizala / düzenli diz</span></button>` : ''); }
    return (board ? (n >= 2 && this.sel.has(i.id) ? `<button class="side-row" data-a="linksel">${ic('link', 'sm')}<span class="lbl">Seçilen ${n} kartı bağla</span></button>`
        : `<button class="side-row" data-a="link">${ic('link', 'sm')}<span class="lbl">Bağla…</span></button>`)
      + (n && !this.sel.has(i.id) || !n ? `<button class="side-row" data-a="pick">${ic('check', 'sm')}<span class="lbl">${n ? 'Seçime ekle' : 'Seç (çoklu bağla)'}</span></button>` : '') : '')
      + lk.slice(0, 5).map(r => `<button class="side-row" data-unlink="${esc(r.id)}" title="${esc(titleOf(r))}">${ic('x', 'sm')}<span class="lbl" dir="auto">Bağlantıyı kaldır: ${esc(titleOf(r).slice(0, 28))}</span></button>`).join('');
  },
  start(id) { this.sel.clear(); S.linkFrom = id; this.paint(); },
  async pick(id) { const a = S.linkFrom; this.end(); if (a && id !== a) await this.set(a, id, true, true); },
  end() { if (!S.linkFrom && !this.sel.size) return; S.linkFrom = null; this.sel.clear(); this.paint(); },
  // 139: the same set is the board's selection (cards, notes written on the board, strokes); only real cards get linked
  toggle(id) { this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id); haptic(8); this.paint(); },
  linkable() { return [...this.sel].map(byId).filter(i => i && !i.deleted && !i.sticky && i.type !== 'draw'); },
  items() { return [...this.sel].map(byId).filter(i => i && !i.deleted); },
  // every card / note / stroke on this board (Ctrl+A)
  everything() { return [...(Board.M?.keys() || []), ...S.items.filter(i => i.type === 'draw' && !i.deleted && i.pts?.length > 1).map(i => i.id)]; },
  // plane box of a stroke / a card (the mounted card's real size when it is on screen)
  rect(id) {
    const m = Board.M?.get(id);
    if (m) { const el = Board.mounted?.get(id); return el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : { x: m.x, y: m.y, w: m.w, h: m.i.sticky ? Board.est(m.i) : m.h - (m.auto ? 0 : 40) }; }
    const i = byId(id); if (i?.type !== 'draw' || !i.pts?.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; for (const [x, y] of i.pts) { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  },
  hit(r) { // ids whose box touches the plane rect r
    const out = [], on = q => q && q.x < r.x2 && q.x + q.w > r.x1 && q.y < r.y2 && q.y + q.h > r.y1;
    for (const id of this.everything()) if (on(this.rect(id))) out.push(id);
    return out;
  },
  bounds() { let b = null; for (const id of this.sel) { const q = this.rect(id); if (!q) continue; b = b ? { x1: Math.min(b.x1, q.x), y1: Math.min(b.y1, q.y), x2: Math.max(b.x2, q.x + q.w), y2: Math.max(b.y2, q.y + q.h) } : { x1: q.x, y1: q.y, x2: q.x + q.w, y2: q.y + q.h }; } return b; },
  frame() { // a soft dashed frame around 2+ picked things: dragging inside it moves them all
    let f = $('#selFrame'); const b = this.sel.size > 1 && S.view === 'board' && this.bounds();
    if (!b) { if (f) f.hidden = true; return; }
    if (!f) { f = document.createElement('div'); f.id = 'selFrame'; f.className = 'sel-frame'; $('#plane').appendChild(f); }
    Object.assign(f.style, { left: b.x1 - 8 + 'px', top: b.y1 - 8 + 'px', width: b.x2 - b.x1 + 16 + 'px', height: b.y2 - b.y1 + 16 + 'px' }); f.hidden = false;
  },
  async del() {
    const list = this.items(); if (!list.length) return; const old = list.map(i => ({ ...i })); S.undo = null; haptic(14); this.end();
    for (const i of list) document.querySelector(`[data-did="${i.id}"]`)?.remove();
    await upsert(list.map(i => ({ ...i, deleted: true, deletedAt: now() })));
    toast(`${old.length} öğe silindi`, 6000, 'trash', { label: 'Geri al', fn: async () => { await upsert(old.map(i => ({ ...i, deleted: false, deletedAt: undefined }))); toast('Geri alındı', 1800, 'check'); } });
  },
  // Hizala: left edges, top edges, or a neat grid in reading order; one undo puts every card back
  async align(kind) {
    const ids = [...this.sel].filter(id => Board.M?.has(id)); if (ids.length < 2) return;
    const rs = ids.map(id => ({ id, ...this.rect(id) })), i0 = ids.map(byId), before = i0.map(i => ({ id: i.id, pos: posOf(i) }));
    const x1 = Math.min(...rs.map(r => r.x)), y1 = Math.min(...rs.map(r => r.y)), at = new Map();
    if (kind === 'left') { let y = y1; for (const r of rs.slice().sort((a, b) => a.y - b.y)) { at.set(r.id, { x: x1, y }); y += r.h + 24; } }
    else if (kind === 'top') { let x = x1; for (const r of rs.slice().sort((a, b) => a.x - b.x)) { at.set(r.id, { x, y: y1 }); x += r.w + 24; } }
    else { const n = Math.ceil(Math.sqrt(rs.length)), cw = Math.max(...rs.map(r => r.w)) + 24, row = rs.slice().sort((a, b) => a.y - b.y || a.x - b.x); let y = y1;
      for (let k = 0; k < row.length; k += n) { const part = row.slice(k, k + n).sort((a, b) => a.x - b.x); part.forEach((r, c) => at.set(r.id, { x: x1 + c * cw, y })); y += Math.max(...part.map(r => r.h)) + 24; } }
    const list = i0.map(i => { setPos(i, { x: Math.round(at.get(i.id).x), y: Math.round(at.get(i.id).y) }); return i; });
    await Board.savePos(list); S.items = [...S.items]; render(); haptic(10);
    toast(kind === 'grid' ? `${list.length} kart dizildi` : `${list.length} kart hizalandı`, 5000, 'layers', { label: 'Geri al', fn: async () => {
      const back = before.map(b => { const i = byId(b.id); if (i) setPos(i, b.pos); return i; }).filter(Boolean); await Board.savePos(back); S.items = [...S.items]; render(); } });
  },
  alignPop(btn) {
    let p = this.pop; if (!p) { p = this.pop = document.createElement('div'); p.className = 'pop sel-pop al-pop'; p.hidden = true; document.body.appendChild(p);
      p.addEventListener('click', e => { const b = e.target.closest('[data-al]'); if (b) { p.hidden = true; this.align(b.dataset.al); } });
      document.addEventListener('pointerdown', e => { if (!e.target.closest('.al-pop,[data-la="align"]')) p.hidden = true; }, true); }
    if (!p.hidden) { p.hidden = true; return; }
    p.innerHTML = `<div class="side-label">Hizala</div>
      <button class="side-row" data-al="left">${ic('list', 'sm')}<span class="lbl">Sola hizala (alt alta)</span></button>
      <button class="side-row" data-al="top">${ic('layers', 'sm')}<span class="lbl">Üste hizala (yan yana)</span></button>
      <button class="side-row" data-al="grid">${ic('grid', 'sm')}<span class="lbl">Düzenli diz</span></button>`;
    p.hidden = false; const r = btn.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px'; p.style.top = Math.max(8, r.top - h - 8) + 'px';
  },
  async many(ids) {
    const l = ids.map(byId).filter(Boolean).sort((x, y) => x.ts - y.ts); this.end(); if (l.length < 2) return;
    const before = new Map(l.map(i => [i.id, { links: i.links, lk: i.lk }])), t = now(), out = [];
    for (let n = 1; n < l.length; n++) { const x = byId(l[n - 1].id), y = l[n].id; if ((x.links || []).includes(y) || (byId(y).links || []).includes(x.id)) continue; out.push(x.id); const c = { ...x, links: [...(x.links || []), y], lk: { ...(x.lk || {}), [y]: t } }; S.items = S.items.map(i => i.id === c.id ? c : i); }
    const changed = [...new Set(out)].map(byId); if (changed.length) await upsert(changed); haptic(12);
    toast(`${l.length} kart bağlandı`, 4000, 'link', { label: 'Geri al', fn: async () => { const t2 = now(); await upsert(changed.map(c => { const b = before.get(c.id), cur = byId(c.id); const lk = { ...(cur.lk || {}) }; for (const r of cur.links || []) if (!(b.links || []).includes(r)) lk[r] = -t2; return { ...cur, links: b.links, lk }; })); } });
  },
  paint() {
    if (S.view !== 'board') { S.linkFrom = null; this.sel.clear(); }
    for (const c of document.querySelectorAll('#plane > .bcard')) c.classList.toggle('sel', c.dataset.id === S.linkFrom || this.sel.has(c.dataset.id));
    for (const p of document.querySelectorAll('#ink path[data-did]')) p.classList.toggle('sel', this.sel.has(p.dataset.did));
    this.frame();
    $('#board')?.classList.toggle('linking', !!S.linkFrom);
    let b = this.bar; const on = !!S.linkFrom || this.sel.size > 0; document.body.classList.toggle('linking', on); // the bar stands where the box is: the box steps aside
    if (!on) { if (b) b.hidden = true; if (this.pop) this.pop.hidden = true; Sel.hidePop(); return; }
    if (!b) { b = this.bar = document.createElement('div'); b.id = 'linkBar'; b.className = 'sel-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Seçilenler'); document.body.appendChild(b);
      b.addEventListener('click', e => { const t = e.target.closest('[data-la]'), a = t?.dataset.la; if (!a || t.disabled) return;
        if (a === 'x') this.end(); else if (a === 'go') this.many(this.linkable().map(i => i.id)); else if (a === 'del') this.del();
        else if (a === 'align') this.alignPop(t); else if (a === 'tag') { if (Sel.pop && !Sel.pop.hidden && Sel.pop._a === 'tag') Sel.hidePop(); else Sel.showPop('tag', t); } }); }
    const n = this.sel.size, nl = this.linkable().length, nc = [...this.sel].filter(id => Board.M?.has(id)).length, nt = this.items().filter(i => i.type !== 'draw').length;
    b.innerHTML = `<button class="icon-btn sm" data-la="x" title="Vazgeç (Esc)" aria-label="Vazgeç">${ic('x', 'sm')}</button>`
      + (S.linkFrom ? `<span class="sel-n" aria-live="polite">${ic('link', 'sm')} Bağlanacak kartı seç</span>`
        : `<span class="sel-n" aria-live="polite"><b>${n}</b> seçili</span><button class="sel-b" data-la="go"${nl >= 2 ? '' : ' disabled'} title="Seçilen kartları bağla">${ic('link', 'sm')}<span>Bağla</span></button>`
          + `<button class="sel-b" data-la="tag"${nt ? '' : ' disabled'} title="Etiket ekle">${ic('hash', 'sm')}<span>Etiket</span></button>`
          + `<button class="sel-b" data-la="align"${nc >= 2 ? '' : ' disabled'} title="Hizala / düzenli diz">${ic('grid', 'sm')}<span>Hizala</span></button>`
          + `<button class="sel-b danger" data-la="del" title="Sil (Delete)">${ic('trash', 'sm')}<span>Sil</span></button>`);
    b.hidden = false;
  },
};
addEventListener('keydown', e => { if (e.key === 'Escape' && (S.linkFrom || Link.sel.size) && !document.querySelector('dialog[open]')) Link.end(); });
addEventListener('keydown', e => { // 139: Ctrl/Cmd+A picks everything on the board, Delete / Backspace removes the picked ones (Geri al)
  if (S.view !== 'board' || $('#board').hidden || e.altKey || e.target.closest('input,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]') || document.querySelector('dialog[open]')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); S.linkFrom = null; Link.sel = new Set(Link.everything()); Link.paint(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && Link.sel.size && !S.linkFrom) { e.preventDefault(); Link.del(); }
});
const Ctx = {
  el: null, id: null,
  init() {
    const el = this.el = document.createElement('div'); el.className = 'ctx pop'; el.hidden = true; document.body.appendChild(el);
    const target = e => !e.target.closest('dialog,.dock,input,textarea') && e.target.closest('[data-id],[data-tid]');
    document.addEventListener('contextmenu', e => { const t = target(e); if (!t) return; e.preventDefault(); if (t.closest('#gallery .tile') && (Sel.mode || e.pointerType === 'touch' || matchMedia('(pointer: coarse)').matches)) return; /* 134: on the phone a long press selects */ this.show(t.dataset.id || t.dataset.tid, e.clientX, e.clientY); });
    let lp = null; // long press on touch
    document.addEventListener('touchstart', e => { if (lp && lp !== 'fired') clearTimeout(lp); lp = null; if (e.touches.length > 1) return; // 109a: a 2nd finger is a pinch, not a long press (the old timer opened the menu mid-zoom)
      const t = target(e); if (!t) return; const p = e.touches[0]; lp = setTimeout(() => { lp = 'fired'; const gt = t.closest('#gallery .tile'); if (gt) return Sel.toggle(gt.dataset.id); navigator.vibrate?.(10); this.show(t.dataset.id || t.dataset.tid, p.clientX, p.clientY); }, 520); }, { passive: true });
    const cancel = () => { if (lp && lp !== 'fired') clearTimeout(lp); };
    document.addEventListener('touchmove', cancel, { passive: true });
    document.addEventListener('touchend', e => { if (lp === 'fired' && e.cancelable) e.preventDefault(); cancel(); lp = null; });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('.ctx')) this.hide(); }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape') this.hide(); });
    addEventListener('keydown', e => { // 141: the menu key or Shift+F10 opens the same menu for the focused card / row
      if (!(e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return; const t = document.activeElement?.closest?.('[data-id],[data-tid]');
      if (!t || t.closest('dialog,.dock')) return; e.preventDefault(); const r = t.getBoundingClientRect(); this.show(t.dataset.id || t.dataset.tid, r.left + 12, r.top + Math.min(r.height, 40), t); });
    el.addEventListener('keydown', e => { // 141: arrows / Home / End move through the menu, Tab stays inside, Esc goes back to the card
      const bs = [...el.querySelectorAll('button:not(:disabled)')], k = bs.indexOf(document.activeElement);
      const to = e.key === 'ArrowDown' ? k + 1 : e.key === 'ArrowUp' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? -1 : e.key === 'Tab' ? k + (e.shiftKey ? -1 : 1) : null;
      if (to !== null) { e.preventDefault(); bs.at(to % bs.length)?.focus(); }
      else if (e.key === 'Escape') { e.stopPropagation(); this.hide(); (this.from?.isConnected ? this.from : document.querySelector(`[data-id="${CSS.escape(this.id)}"]`))?.focus?.({ preventScroll: true }); }
    });
    addEventListener('scroll', () => this.hide(), true);
    document.addEventListener('keydown', e => { // 141: list rows and gallery tiles are reachable with Tab; Enter opens, ↑ ↓ (← → in the gallery) move
      const r = e.target; if (!r.matches?.('.item[data-id],.tile[data-id]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); return openItem(r.dataset.id); }
      const tile = r.classList.contains('tile'), step = { ArrowDown: 1, ArrowUp: -1, ...(tile ? { ArrowRight: 1, ArrowLeft: -1 } : {}) }[e.key]; if (!step) return;
      const all = [...document.querySelectorAll(tile ? '#gallery .tile[data-id]' : '.item[data-id]')].filter(x => x.offsetParent), k = all.indexOf(r);
      let n = all[k + step];
      if (tile && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { const y = r.getBoundingClientRect(), x0 = y.left + y.width / 2; // the tile straight below / above
        n = all.filter(x => { const b = x.getBoundingClientRect(); return e.key === 'ArrowDown' ? b.top > y.bottom - 2 : b.bottom < y.top + 2; })
          .sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return Math.abs(A.top - y.top) - Math.abs(B.top - y.top) || Math.abs(A.left + A.width / 2 - x0) - Math.abs(B.left + B.width / 2 - x0); })[0]; }
      if (n) { e.preventDefault(); n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }
    });
    el.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return; const i = byId(this.id); if (!i) return this.hide();
      const many = S.view === 'board' && Link.sel.size > 1 && Link.sel.has(i.id), all = many ? Link.items().filter(x => x.type !== 'draw') : [i]; // 139: colour / priority / delete reach every picked card
      if (b.dataset.c !== undefined) { const c = i.color === b.dataset.c ? undefined : b.dataset.c || undefined; await upsert(all.map(x => ({ ...x, color: c }))); }
      else if (b.dataset.p !== undefined) await upsert(all.map(x => ({ ...x, prio: b.dataset.p || undefined })));
      else if (b.dataset.a === 'open') openItem(i.id);
      else if (b.dataset.a === 'star') await toggleStar(i.id);
      else if (b.dataset.a === 'doing') await Todo.doing(i.id);
      else if (b.dataset.a === 'todo') await upsert([{ ...i, ...(i.todo ? { todo: null, noTodo: true } : { todo: { text: titleOf(i), done: false, user: true }, noTodo: false }) }]);
      else if (b.dataset.a === 'del') { if (many) { this.hide(); return Link.del(); } await removeItem(i); }
      else if (b.dataset.a === 'seltag' || b.dataset.a === 'selalign') { this.hide(); const t = Link.bar?.querySelector(`[data-la="${b.dataset.a === 'seltag' ? 'tag' : 'align'}"]`); if (t) b.dataset.a === 'seltag' ? Sel.showPop('tag', t) : Link.alignPop(t); return; }
      else if (b.dataset.a === 'link') { this.hide(); return Link.start(i.id); }
      else if (b.dataset.a === 'fout') { this.hide(); return AIF.out(S.folder.slice(3), i.id); }
      else if (b.dataset.a === 'linksel') { this.hide(); return Link.many(Link.linkable().map(x => x.id)); }
      else if (b.dataset.a === 'pick') { this.hide(); return Link.toggle(i.id); }
      else if (b.dataset.unlink) await Link.set(i.id, b.dataset.unlink, false, true);
      this.hide();
    });
  },
  show(id, x, y, from) {
    const i = byId(id); if (!i) return; this.id = id; this.from = from || null; const el = this.el; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', 'Kayıt menüsü');
    el.innerHTML = `<div class="side-label">Renk</div><div class="mark-dots">${COLORS.map(([c, n]) => `<button class="cdot c-${c}${i.color === c ? ' on' : ''}" data-c="${c}" title="${n}" aria-label="${n}"></button>`).join('')}<button class="cdot none" data-c="" title="Renk yok" aria-label="Renk yok">${ic('x', 'sm')}</button></div>
      <div class="side-label">Öncelik</div><div class="seg sm prio">${PRIOS.map(([v, n]) => `<button class="${(i.prio || '') === v ? 'on' : ''}" data-p="${v}">${n}</button>`).join('')}</div>
      <hr><button class="side-row" data-a="open">${ic('ext', 'sm')}<span class="lbl">${S.view === 'board' ? 'Pencerede aç' : 'Aç'}</span></button>
      <button class="side-row" data-a="star">${ic('star', 'sm' + (i.starred ? ' fill star-on' : ''))}<span class="lbl">${i.starred ? 'Yıldızı kaldır' : 'Yıldızla'}</span></button>
      ${i.todo && !i.todo.done ? `<button class="side-row" data-a="doing">${ic('clock', 'sm')}<span class="lbl">${i.todo.doing ? 'Yapılıyor işaretini kaldır' : 'Yapılıyor olarak işaretle'}</span></button>` : ''}
      <button class="side-row" data-a="todo">${ic('todo', 'sm')}<span class="lbl">${i.todo ? 'Görevden çıkar' : 'Görev yap'}</span></button>
      ${S.folder?.startsWith('ai:') && inFolder() && AIF.has(S.folder.slice(3), i.id) ? `<button class="side-row" data-a="fout">${ic('folder', 'sm')}<span class="lbl">Bu klasöre ait değil</span></button>` : ''}
      ${Link.menu(i)}<button class="side-row danger" data-a="del">${ic('trash', 'sm')}<span class="lbl">${S.view === 'board' && Link.sel.size > 1 && Link.sel.has(i.id) ? `Seçilenleri sil (${Link.sel.size})` : 'Sil'}</span></button>`;
    el.hidden = false;
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px'; el.style.top = Math.max(8, Math.min(y, innerHeight - h - 8)) + 'px';
    if (from) el.querySelector('.side-row')?.focus({ preventScroll: true }); // 141: opened from the keyboard → keep going with the keyboard
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
// Turkish dates in a task line: "yarın 10:30 diş", "cuma toplantı", "haftaya rapor", "12 mart" → { text, due } (107e: when.js, also "9'da", "2 saat sonra", "akşam 8")
const parseDue = t => NtsWhen.parseDue(t);
const REPEATS = [['', 'Tekrar yok'], ['daily', 'Her gün'], ['weekly', 'Her hafta'], ['monthly', 'Her ay']];
// 94f: the installed app's icon shows how many to-dos are open (Badging API; nothing where unsupported)
const Badge = {
  n: -1,
  set() {
    if (!navigator.setAppBadge) return;
    let n = 0; for (const i of S.items) if (i.todo && !i.todo.done && !i.deleted) n++;
    if (n === this.n) return; this.n = n;
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => { });
  },
};
const Todo = {
  open() {
    const open = S.items.filter(i => i.todo && !i.todo.done && !i.deleted);
    const k = i => [i.todo.order ?? Infinity, dueInfo(i.todo.due)?.at ?? Infinity, -i.ts];
    return open.sort((a, b) => { const x = k(a), y = k(b); return x[0] - y[0] || (a.prio === 'high' ? 0 : 1) - (b.prio === 'high' ? 0 : 1) || x[1] - y[1] || x[2] - y[2]; });
  },
  group(i) {
    if (i.todo.doing) return 'doing'; // 100: "Yapılıyor" sits on top, dates and groups below stay as they were
    const d = dueInfo(i.todo.due); if (!d) return 'none';
    if (d.cls === 'late') return 'late';
    const key = i.todo.due.slice(0, 10), t = now();
    if (key === dayKey(t)) return 'today'; if (key === dayKey(t + 864e5)) return 'tomorrow';
    return d.at - t < 7 * 864e5 ? 'week' : 'later';
  },
  GROUPS: [['doing', 'Yapılıyor'], ['late', 'Gecikmiş'], ['today', 'Bugün'], ['tomorrow', 'Yarın'], ['week', 'Bu hafta'], ['later', 'Sonra'], ['none', 'Tarihsiz']],
  row(i, n) {
    const t = i.todo, d = dueInfo(t.due), done = !!t.done, subs = t.subs || [], sd = subs.filter(x => x.done).length, open = this.exp === i.id;
    return `<div class="todo-item${open ? ' open' : ''}" data-tid="${i.id}"><div class="todo-row${done ? ' done' : ''}${t.doing && !done ? ' doing' : ''}${d ? ' ' + d.cls : ''}${this.fresh?.has(i.id) ? ' fresh' : ''}">
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
      <div class="tp-row"><span class="tp-l">Durum</span><div class="seg sm">${[['', 'Yapılacak'], ['1', 'Yapılıyor']].map(([v, l]) => `<button class="${(t.doing ? '1' : '') === v ? 'on' : ''}" data-tdoing="${v}">${l}</button>`).join('')}</div></div>
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
    let n = 0; const lim = this.lim || 120; // 147c: hundreds of open tasks (WhatsApp import) → draw the first 120, the rest on request
    el.innerHTML = `<div class="todo-head"><h2>Yapılacaklar</h2><span class="n">${open.length}</span><span class="sp"></span>
        ${by.get('late').length ? `<span class="t-due late">${by.get('late').length} gecikmiş</span>` : ''}</div>
      <form class="t-add"><span class="t-add-ic">${ic('plus', 'sm')}</span><input placeholder="${innerWidth < 600 ? 'Görev ekle… (yarın 10:30 dişçi)' : 'Görev ekle… (ör. yarın 10:30 dişçi, cuma rapor)'}" enterkeyhint="done" aria-label="Görev ekle"><span class="t-add-due" hidden></span></form>
      ${open.length ? this.GROUPS.filter(([g]) => by.get(g).length).map(([g, l]) => n >= lim ? '' : `<div class="t-group ${g}"><div class="t-gh">${l}<span>${by.get(g).length}</span></div>
          <div class="todo-list">${by.get(g).slice(0, Math.max(0, lim - n)).map(i => this.row(i, ++n)).join('')}</div></div>`).join('')
          + (open.length > lim ? `<button class="btn secondary sm t-more" data-tmore>${open.length - lim} görev daha göster</button>` : '')
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
    const done = !i.todo.done, list = [{ ...i, todo: { ...i.todo, done, doneAt: done ? now() : undefined, doing: undefined } }];
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
    if (done) haptic(12); // 141
    if (done) toast(i.todo.repeat ? 'Bitti · sıradaki eklendi' : 'Bitti', 4000, 'check', { label: 'Geri al', fn: () => this.undo(id) });
  },
  async doing(id, on) { // 100: a small "Yapılıyor" mark; doingAt lets a later un-mark on another device win the merge
    const i = byId(id); if (!i?.todo || i.todo.done) return; on ??= !i.todo.doing; if (!!i.todo.doing === on) return;
    await this.patch(id, c => { c.todo.doing = on || undefined; c.todo.doingAt = now(); }); haptic(8);
  },
  async undo(id) { const i = byId(id); if (!i) return; const nx = i.todo.next && byId(i.todo.next); await upsert([{ ...i, todo: { ...i.todo, done: false, doneAt: undefined, next: undefined } }, ...(nx ? [{ id: nx.id, deleted: true, ts: nx.ts, updatedAt: now() }] : [])]); },
  init() {
    const el = $('#todo');
    el.addEventListener('click', async e => {
      const g = k => e.target.closest(`[${k}]`);
      if (g('data-tmore')) { this.lim = (this.lim || 120) + 400; return this.render(); }
      if (g('data-tclear')) { e.preventDefault(); const ds = S.items.filter(i => i.todo?.done && !i.deleted); await upsert(ds.map(i => ({ ...i, todo: null, noTodo: true }))); return toast(`${ds.length} biten görev listeden kaldırıldı`, 3000, 'check'); }
      if (e.target.closest('.todo-done summary')) { this.showDone = !e.target.closest('details').open; return; }
      const item = e.target.closest('[data-tid]'); if (!item) return; const id = item.dataset.tid;
      if (g('data-check')) { item.querySelector('.todo-row').classList.add('ticking'); setTimeout(() => this.toggle(id), 180); }
      else if (g('data-texp')) { this.exp = this.exp === id ? null : id; this.render(); }
      else if (g('data-topen')) openItem(id);
      else if (g('data-tq')) { const n = +g('data-tq').dataset.tq; await this.patch(id, c => { c.todo.due = dayKey(now() + n * 864e5); c.todo.user = true; }); }
      else if (g('data-tnodue')) await this.patch(id, c => { c.todo.due = undefined; c.todo.user = true; });
      else if (g('data-tdoing')) await this.doing(id, !!g('data-tdoing').dataset.tdoing);
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
      const row = g.closest('.todo-item'), list = row.parentElement;
      Motion.sort(row, e, async moved => { // 142: ghost + breathing gap, rows make room (FLIP)
        [...list.children].forEach((r, n) => { const t = r.querySelector('.t-num'); if (t) t.textContent = n + 1 + '.'; }); if (!moved) return;
        const ids = [...list.children].map(r => r.dataset.tid).filter(Boolean);
        await upsert(ids.map((id, n) => { const i = byId(id); return { ...i, todo: { ...i.todo, order: n } }; }));
      });
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
    if (t === 'note' || t === 'text') { if (e.target.closest('.bcard')) return null; e.preventDefault(); this.sticky(t, e); this.use('select'); return { ink: 'done' }; } // 140: preventDefault - no mouse/focus events after the tap, the new note keeps the caret
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
      el.setAttribute('class', 'k-' + i.shape + (Link.sel.has(id) ? ' sel' : '')); el.style.stroke = INK_COLORS[i.color] || INK_COLORS.ink; el.setAttribute('d', this.path(i.shape, i.pts)); el._k = k;
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
  // 140: a board note is picked by the first tap, written in by the second (or a double click); a checkbox ticks without opening it
  tap(card, e, t) {
    const ln = t?.closest?.('.ln.ck');
    if (ln) { const r = ln.getBoundingClientRect(), fs = parseFloat(getComputedStyle(ln).fontSize) * S.cam.k, rtl = getComputedStyle(ln).direction === 'rtl';
      if ((rtl ? r.right - e.clientX : e.clientX - r.left) < fs * 1.7) return this.tick(card, ln); }
    const id = card.dataset.id;
    if (Link.sel.size === 1 && Link.sel.has(id)) return this.edit(card, e);
    Link.sel.clear(); Link.toggle(id);
  },
  async tick(card, ln) {
    const i = byId(card.dataset.id); if (!i) return;
    const n = [...ln.parentNode.children].indexOf(ln), lines = (i.text || '').split('\n');
    if (!/^\[( |x|X)\]/.test(lines[n] || '')) return;
    lines[n] = (lines[n][1] === ' ' ? '[x]' : '[ ]') + lines[n].slice(3); ln.classList.toggle('on'); haptic(8);
    await upsert([{ ...i, text: lines.join('\n') }]);
  },
  line() { const b = this.cur?.body; let n = getSelection().anchorNode; while (n && n.parentNode !== b) n = n.parentNode; return n?.nodeType === 1 ? n : null; },
  edit(card, e) {
    const body = card.querySelector('.st-body'), id = card.dataset.id; if (!body || body.isContentEditable) return;
    if (this.cur) this.cur.body.blur();
    if (Link.sel.size) Link.end();
    body.contentEditable = 'true'; card.classList.add('editing');
    if (!body.firstElementChild) body.innerHTML = '<div class="ln"><br></div>';
    body.focus({ preventScroll: true });
    const at = e && document.caretRangeFromPoint?.(e.clientX, e.clientY), sel = getSelection();
    let r = at && body.contains(at.startContainer) ? at : null;
    if (!r) { r = document.createRange(); r.selectNodeContents(body.lastElementChild || body); r.collapse(false); }
    sel.removeAllRanges(); sel.addRange(r);
    const cur = this.cur = { card, body, id, props: {} };
    this.bar(); this.place(); this.reveal();
    const done = async () => {
      body.removeEventListener('blur', done); body.removeAttribute('contenteditable'); card.classList.remove('editing');
      if (this.cur === cur) { this.cur = null; if (this.barEl) this.barEl.hidden = true; }
      const text = stDom(body), i = byId(id); if (!i) return;
      if (!stPlain(text).trim()) { await upsert([{ id, deleted: true, ts: i.ts, updatedAt: now() }]); return; } // empty note: gone
      const changed = text !== (i.text || ''), props = Object.entries(cur.props).some(([k, v]) => v !== i[k]);
      if (changed || props) await upsert([{ ...i, ...cur.props, text, ...(changed ? { title: undefined, pending: true } : {}) }]);
      if (changed) AI.kick();
    };
    body.addEventListener('blur', done);
    body.onkeydown = ev => {
      if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); body.blur(); return; }
      const ln = this.line(), kind = ln && ['h', 'li', 'ck'].find(c => ln.classList.contains(c));
      if (ev.key === 'Enter' && !ev.shiftKey) {
        if (kind && kind !== 'h' && !ln.textContent.trim()) { ev.preventDefault(); ln.className = 'ln'; return; } // Enter on an empty bullet ends the list
      }
      if (ev.key === 'Backspace' && kind) { const s = getSelection(); if (s.isCollapsed) { const rr = document.createRange(); rr.selectNodeContents(ln); rr.setEnd(s.anchorNode, s.anchorOffset);
        if (!rr.toString()) { ev.preventDefault(); ln.className = 'ln'; } } }
    };
    body.oninput = ev => {
      const ln = this.line(); if (!ln) return;
      if (ev.inputType === 'insertParagraph') ln.classList.remove('h', 'on'); // a new line after a heading is plain text, after a ticked box an empty box
      if (ln.className === 'ln' || !ln.className) {
        const m = ln.textContent.match(/^(#{1,3}|[-*•]|\[\s?\]|\[[xX]\])[\s ]/);
        if (m) {
          const tn = document.createTreeWalker(ln, NodeFilter.SHOW_TEXT).nextNode();
          if (tn && tn.data.length >= m[0].length) { // the editor's own delete keeps Ctrl+Z right; the caret goes back to where it was
            const s = getSelection(), pre = document.createRange(); pre.selectNodeContents(ln); pre.setEnd(s.anchorNode, s.anchorOffset); const at = Math.max(0, pre.toString().length - m[0].length);
            const rr = document.createRange(); rr.setStart(tn, 0); rr.setEnd(tn, m[0].length); s.removeAllRanges(); s.addRange(rr); document.execCommand('delete');
            const w = document.createTreeWalker(this.line() || ln, NodeFilter.SHOW_TEXT); let left = at, t2;
            while ((t2 = w.nextNode())) { if (left <= t2.data.length) { s.collapse(t2, left); break; } left -= t2.data.length; } }
          const now1 = this.line() || ln; now1.className = 'ln ' + (m[1][0] === '#' ? 'h' : m[1][0] === '[' ? 'ck' + (/x/i.test(m[1]) ? ' on' : '') : 'li');
        }
      }
      this.place(); this.reveal(); this.mark();
    };
    body.onpaste = ev => { ev.preventDefault(); document.execCommand('insertText', false, ev.clipboardData.getData('text/plain')); }; // pasted pages come in as plain words
  },
  // the small floating bar over the note being written: bold, italic, heading, list, checkbox, alignment, size, colour
  bar() {
    let b = this.barEl;
    if (!b) {
      b = this.barEl = document.createElement('div'); b.id = 'stBar'; b.className = 'st-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Yazı biçimi'); document.body.appendChild(b);
      b.addEventListener('pointerdown', e => e.preventDefault()); // the note keeps the caret
      b.addEventListener('click', e => this.fmt(e.target.closest('button')));
      document.addEventListener('selectionchange', () => this.cur && this.mark());
      visualViewport?.addEventListener('resize', () => { this.place(); this.reveal(); });
    }
    const text = this.cur.card.classList.contains('text'), cols = text ? ['', 'red', 'orange', 'green', 'blue', 'purple'] : ['yellow', 'orange', 'green', 'blue', 'purple', 'red'];
    const B = (f, label, inner) => `<button type="button" class="st-b" data-f="${f}" title="${label}" aria-label="${label}">${inner}</button>`;
    b.innerHTML = B('b', 'Kalın (Ctrl+B)', '<b>B</b>') + B('i', 'İtalik (Ctrl+I)', '<i>I</i>') + B('h', 'Başlık (# )', '<b>H</b>')
      + B('li', 'Madde (- )', '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="3" cy="4" r="1.4"/><circle cx="3" cy="8" r="1.4"/><circle cx="3" cy="12" r="1.4"/><path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>')
      + B('ck', 'Onay kutusu ([] )', '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="3"/><path d="M5 8l2 2 4-4"/></svg>')
      + '<span class="st-sep"></span>' + B('al', 'Hizala', '<svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path class="al-a" d="M2 4h12M2 8h8M2 12h10"/></svg>')
      + B('s-', 'Küçült', '<span class="st-a sm">A</span>') + B('s+', 'Büyüt', '<span class="st-a">A</span>') + '<span class="st-sep"></span>'
      + cols.map(c => `<button type="button" class="st-c${c ? ' c-' + c : ' none'}" data-c="${c}" title="${c ? KIND_COLOR_TR[c] : 'Yazı rengi'}" aria-label="Renk: ${c ? KIND_COLOR_TR[c] : 'varsayılan'}"></button>`).join('');
    b.hidden = false; this.mark();
  },
  fmt(btn) {
    const c = this.cur; if (!btn || !c) return;
    const f = btn.dataset.f, i = byId(c.id) || {}, card = c.card, body = c.body;
    if (f === 'b' || f === 'i') document.execCommand(f === 'b' ? 'bold' : 'italic');
    else if (f === 'h' || f === 'li' || f === 'ck') { const ln = this.line(); if (ln) { const on = ln.classList.contains(f); ln.className = 'ln' + (on ? '' : ' ' + f); } }
    else if (f === 'al') { const order = [undefined, 'center', 'right'], now0 = c.props.align !== undefined ? c.props.align : i.align; c.props.align = order[(order.indexOf(now0 || undefined) + 1) % 3]; body.style.textAlign = c.props.align || ''; }
    else if (f === 's-' || f === 's+') { const text = card.classList.contains('text'), cur = parseFloat(getComputedStyle(body).fontSize), st = text ? 4 : 1.5;
      c.props.fs = Math.round(Math.max(10, Math.min(120, cur + (f === 's+' ? st : -st))) * 2) / 2; body.style.fontSize = c.props.fs + 'px'; }
    else if ('c' in btn.dataset) { const v = btn.dataset.c || undefined; c.props.color = v; card.className = card.className.replace(/ c-\w+/g, '') + (v ? ' c-' + v : ''); haptic(6); }
    this.mark(); this.place();
  },
  mark() {
    const b = this.barEl, c = this.cur; if (!b || !c) return;
    const ln = this.line(), i = byId(c.id) || {}, col = 'color' in c.props ? c.props.color : i.color, al = 'align' in c.props ? c.props.align : i.align;
    for (const x of b.querySelectorAll('[data-f]')) { const f = x.dataset.f;
      const on = f === 'b' ? document.queryCommandState('bold') : f === 'i' ? document.queryCommandState('italic') : ['h', 'li', 'ck'].includes(f) ? !!ln?.classList.contains(f) : f === 'al' ? !!al : false;
      x.setAttribute('aria-pressed', String(on)); }
    b.querySelector('.al-a')?.setAttribute('d', al === 'center' ? 'M2 4h12M4 8h8M3 12h10' : al === 'right' ? 'M2 4h12M6 8h8M4 12h10' : 'M2 4h12M2 8h8M2 12h10');
    const def = c.card.classList.contains('text') ? '' : 'yellow';
    for (const x of b.querySelectorAll('[data-c]')) x.setAttribute('aria-pressed', String(x.dataset.c === (col || def)));
  },
  place() {
    const c = this.cur, b = this.barEl; if (!c || !b || b.hidden) return;
    const r = c.card.getBoundingClientRect(), vv = visualViewport, vt = vv ? vv.offsetTop : 0, vh = vv ? vv.height : innerHeight, bw = b.offsetWidth, bh = b.offsetHeight;
    let top = r.top - bh - 10; if (top < vt + 60) top = Math.min(r.bottom + 10, vt + vh - bh - 8);
    const left = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2));
    b.style.transform = `translate(${Math.round(left)}px, ${Math.round(Math.max(vt + 8, top))}px)`;
  },
  // the phone keyboard must not cover the line being written: the board slides up under it
  reveal() {
    const c = this.cur; if (!c || !S.cam) return;
    const s = getSelection(); if (!s.rangeCount) return;
    let r = s.getRangeAt(0).getBoundingClientRect(); if (!r.height) r = (this.line() || c.body).getBoundingClientRect();
    const vv = visualViewport, vb = vv ? vv.offsetTop + vv.height : innerHeight, top = (vv ? vv.offsetTop : 0) + 70, box = $('#input')?.parentNode?.getBoundingClientRect();
    const bottom = Math.min(vb, box && box.top > vb / 2 ? box.top : vb) - 16 - (this.barEl?.offsetHeight || 0); // above the keyboard, the bottom box and the format bar
    const dy = r.bottom > bottom ? bottom - r.bottom : r.top < top ? top - r.top : 0;
    if (Math.abs(dy) > 2) { S.cam.y += dy; Board.apply(); }
  },
};

// 140: board notes keep Markdown (sync, search and Claude read it as before); on the board each line is a block
const KIND_COLOR_TR = { red: 'Kırmızı', orange: 'Turuncu', yellow: 'Sarı', green: 'Yeşil', blue: 'Mavi', purple: 'Mor' };
function stInline(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, '$1<i>$2</i>'); }
function stHtml(md) {
  return md.split('\n').map(l => {
    let c = '', m;
    if ((m = l.match(/^#{1,3}\s+/))) { c = 'h'; l = l.slice(m[0].length); }
    else if ((m = l.match(/^[-*•]\s+/))) { c = 'li'; l = l.slice(m[0].length); }
    else if ((m = l.match(/^\[( |x|X)\]\s?/))) { c = m[1] === ' ' ? 'ck' : 'ck on'; l = l.slice(m[0].length); }
    return `<div class="ln${c ? ' ' + c : ''}" dir="auto">${stInline(l) || '<br>'}</div>`;
  }).join('');
}
function stDom(body) {
  const inl = n => n.nodeType === 3 ? n.data.replace(/ /g, ' ').replace(/​/g, '') : n.nodeType !== 1 ? '' : n.tagName === 'BR' ? (n.nextSibling ? '\n' : '')
    : (() => { const x = [...n.childNodes].map(inl).join(''); if (!x.trim()) return x;
      const B = n.tagName === 'B' || n.tagName === 'STRONG' || +getComputedStyle(n).fontWeight >= 600 && n.tagName === 'SPAN', I = n.tagName === 'I' || n.tagName === 'EM';
      return B ? '**' + x + '**' : I ? '*' + x + '*' : /^(DIV|P|LI)$/.test(n.tagName) ? '\n' + x : x; })();
  const lines = []; let loose = '';
  for (const n of body.childNodes) {
    if (n.nodeType === 1 && /^(DIV|P|H\d|LI|UL)$/.test(n.tagName)) {
      if (loose) { lines.push(loose); loose = ''; }
      const k = n.classList, pre = k.contains('h') ? '# ' : k.contains('li') ? '- ' : k.contains('ck') ? (k.contains('on') ? '[x] ' : '[ ] ') : '';
      const t = [...n.childNodes].map(inl).join('').replace(/^\n/, '');
      lines.push(...(pre + t).split('\n'));
    } else loose += inl(n);
  }
  if (loose) lines.push(loose);
  return lines.join('\n').replace(/\s+$/, '');
}
function stPlain(md) { return md.replace(/^(#{1,3}\s+|[-*•]\s+|\[( |x|X)\]\s?)/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*\w])\*([^*]+?)\*(?!\w)/g, '$1$2'); }

// ---------- board ----------
const Board = {
  COLW: 240, GAP: 76, PER: 4, IN: 12, // IN: between a day's own columns (small), GAP: between days (big) - 92
  // Free canvas, like Figma: cards you have moved keep their place (i.pos, synced);
  // cards you never moved are stacked in day columns to the right of the placed ones.
  // card height without the DOM (title ≤ 2 lines, text ≤ 3 lines, meta 1 line): 10,000 cards are laid out in memory
  est(i) {
    if (i.sticky) return i.sticky === 'text' ? 40 : Math.max(140, i.h || 0);
    const t = titleOf(i).length, sub = subOf(i), tl = Math.min(2, Math.max(1, Math.ceil(t / (Rich.checks(i) ? 19 : 24)))), sl = sub ? Math.min(3, Math.ceil(Math.min(sub.length, 200) / 31)) : 0;
    const rh = Rich.bodyH(i); // 106a
    return 2 + (hasVisual(i) ? BoardPic.h(i) : 0) + Rich.embH(i) + 21 + tl * 19 + (rh != null ? rh : sl ? 2 + sl * 18 : 0) + 6 + 18 + (this.metaLines(i) > 1 ? 23 : 0);
  },
  // 128: a rough width of the card's meta row (time, site, flags, tag chips); over one line → the card keeps room for a second
  metaLines(i) {
    const cw = 6.3, chip = t => 26 + t.length * cw;
    let w = 46 + (i.type === 'link' ? 6 + domain(i.url).length * cw : 0) + (i.type === 'file' && i.size ? 50 : 0) + (i.starred ? 20 : 0) + (i.prio === 'high' ? 70 : 0) + (i.todo && !Rich.due(i) ? 70 : 0) + (relatedOf(i).length ? 34 : 0);
    for (const t of (i.tags || []).slice(0, 2)) w += 6 + chip(t);
    if ((i.tags || []).length > 2) w += 36; // 130f: the "+N" chip
    return w > this.COLW - 26 ? 2 : 1;
  },
  // no "…": text that does not fit fades out at the end of its last line (one batched read, then one write)
  fades(all) {
    // 147: a card that comes back into view (panning, zooming) takes what was measured last time: measuring every new card forced
    // a layout each frame (phone 4x: 0.5–1.2 s while panning). Keyed by the item's version and the card's height.
    const fc = this._fc ||= new Map(), keyOf = c => (byId(c.dataset.id)?.updatedAt || 0) + '|' + c.style.height + '|' + c.className.includes('sticky');
    const cards = all.filter(c => { const m = fc.get(c.dataset.id); if (!m || m.k !== keyOf(c)) return true; c.querySelectorAll('.title, .sub').forEach((e, k) => e.classList.toggle('ov', !!m.ov[k])); return !m.fit; });
    const els = cards.flatMap(c => [...c.querySelectorAll('.title, .sub')]), ov = els.map(e => e.scrollHeight > e.clientHeight + 1);
    els.forEach((e, k) => e.classList.toggle('ov', ov[k]));
    { let n = 0; for (const c of cards) { const m = c.querySelector('.meta'), len = c.querySelectorAll('.title, .sub').length; fc.set(c.dataset.id, { k: keyOf(c), ov: ov.slice(n, n + len), fit: !m || m.scrollHeight <= m.clientHeight + 1 }); n += len; } }
    // 128: tag chips wrap to a second line; those that still don't fit give way to one "+N" chip (never half a chip)
    for (const m of cards.map(c => c.querySelector('.meta')).filter(Boolean)) {
      if (m.scrollHeight <= m.clientHeight + 1) continue;
      const tg = [...m.querySelectorAll('.tg:not(.more)')], more = m.querySelector('.tg.more') || m.appendChild(Object.assign(document.createElement('span'), { className: 'tg more' }));
      let n = +more.textContent.slice(1) || 0; // 130f: the card may already carry "+N" for tags past the first two
      for (const t of tg.filter(t => t.offsetWidth > m.clientWidth - 40)) { tg.splice(tg.indexOf(t), 1); t.remove(); more.textContent = '+' + ++n; } // a chip wider than the row never fits
      while (tg.length && m.scrollHeight > m.clientHeight + 1) { tg.pop().remove(); more.textContent = '+' + ++n; }
      more.title = n + ' etiket daha';
    }
  },
  card(i) {
    const c = document.createElement('div'); c.dataset.id = i.id;
    if (i.sticky) { // a note written right on the board
      c.className = 'bcard sticky' + (i.sticky === 'text' ? ' text' : '') + (Link.sel.has(i.id) ? ' sel' : '') + markCls(i);
      const st = [i.fs ? `font-size:${i.fs}px` : '', i.align ? `text-align:${i.align}` : ''].filter(Boolean).join(';');
      if (i.sticky === 'note' && i.w) c.style.width = i.w + 'px';
      if (i.sticky === 'note' && i.h) c.style.minHeight = i.h + 'px';
      c.innerHTML = `<div class="st-body" data-ph="${i.sticky === 'text' ? 'Yazı' : 'Not yaz…'}"${st ? ` style="${st}"` : ''}>${stHtml(i.text || '')}</div><span class="st-size" title="${i.sticky === 'text' ? 'Sürükle: yazıyı büyüt / küçült' : 'Sürükle: notu boyutlandır'}"></span>`;
      return c;
    }
    const k = fileKind(i), sub = subOf(i), H = S.searchOn ? hl : esc;
    c.className = 'bcard' + (S.hits && S.searchOn ? (S.hits.has(i.id) ? ' hit' : ' dim') : '') + (S.linkFrom === i.id || Link.sel.has(i.id) ? ' sel' : '') + markCls(i);
    const rich = Rich.html(i), rb = Rich.body(i); // 106a
    c.innerHTML = `<span class="b-date">${shortDay(dayKey(i.ts))}</span>${rich || (hasVisual(i) ? thumbBox(i) : '')}<div class="b-in"><div class="b-head"><span class="b-ico ${i.type}-c">${linkFav(i)}${ic(i.conv ? 'chat' : k === 'text' ? 'note' : k, 'sm')}</span><div class="title">${H(titleOf(i))}</div>${Rich.pill(i)}</div>
      ${rb != null ? rb : sub ? `<div class="sub">${H(sub.slice(0, 200))}</div>` : ''}${metaHtml(i, { day: !!posOf(i), due: !Rich.due(i) }).replace('class="meta"', `class="meta${this.metaLines(i) > 1 ? ' m2' : ''}"`)}</div>${OnBoard.can(i) ? `<button class="b-open" title="Pencerede aç" aria-label="Pencerede aç">${ic('expand', 'sm')}</button>` : ''}${this.deg?.get(i.id) ? `<span class="b-lk" title="${this.deg.get(i.id)} bağlantı">${ic('link', 'sm')}${this.deg.get(i.id)}</span>` : ''}`;
    if (!rich) BoardPic.card(c, i); // 159: a photo as big as its shape
    return c;
  },
  // Free canvas, like Figma: cards you moved keep their place (i.pos, synced); the rest stand in day columns
  // right of the placed ones. Only the cards on screen (+ a margin) are in the DOM.
  render(items) {
    // 126: while a card is dragged (or a line drawn / a text resized) a synced update waits; rebuilding would detach the held card and drop it at x=0
    if (this.busy) { this.pending = items; return; }
    this.pending = null;
    const plane = $('#plane');
    plane.querySelectorAll('.bcard,.col-head,.day-band').forEach(e => e !== OnBoard.el && e.remove()); // 145: a live card keeps playing through a redraw
    const list = items.slice().sort((a, b) => a.ts - b.ts);
    const placed = list.filter(posOf), free = list.filter(i => !posOf(i) && !i.sticky);
    Ink.render();
    let x0 = 0, y0 = 0;
    if (placed.length) { let mx = -Infinity, my = Infinity; for (const i of placed) { const p = posOf(i); mx = Math.max(mx, p.x + this.COLW); my = Math.min(my, p.y); } x0 = mx + this.GAP * 1.5; y0 = my; }
    this.M = new Map(); this.heads = []; this.mounted = new Map(); this.mountedHeads = new Map(); this.mountedMonths = new Map(); this.y0 = y0;
    const rb = $('#rangeBtn'); if (rb) { const lab = rangeShort() + (onMain() && Range.arch() ? ' + arşiv' : ''), off = Range.get() !== Range.def() || (onMain() && Range.arch()); // 153: the chosen range is a chip by the zoom box ("6 ay ×")
      rb.innerHTML = `${ic('clock', 'sm')}<span>${lab}</span>`; rb.ariaLabel = `Panoda göster: ${rangeLabel()}${onMain() && Range.arch() ? ', arşiv dahil' : ''}`; rb.hidden = false; rb.classList.toggle('set', off);
      const rx = $('#rangeX'); rx.hidden = !off; rx.title = `${RSHORT[Range.def()]} aralığına dön`; }
    const bn = $('#boardName'), bnm = onMain() ? 'Genel' : S.board; if (bn) { bn.textContent = bnm; const bp = $('#boardBtn'); bp.title = bp.ariaLabel = `Pano: ${bnm} — değiştir`; bp.classList.toggle('bp-other', !onMain()); } // 116: the logo is the board picker (151: not 'sub' — that is the 2-line clamped subtitle class and stacked logo/name/⌄)
    for (const i of placed) this.M.set(i.id, { i, x: posOf(i).x, y: posOf(i).y, w: i.sticky ? (i.sticky === 'text' ? 420 : i.w || 180) : this.COLW, h: i.sticky ? this.est(i) + 200 : this.est(i) + 40 });
    const days = []; let last = '';
    for (const i of free) { const k = dayKey(i.ts); if (k !== last) { days.push({ k, items: [] }); last = k; } days.at(-1).items.push(i); }
    let cx = x0; const today = dayKey(now()), { links: rl } = relIndex();
    // 129: linked cards (same group / related / own links) stand one under the other with a 48 px gap, so the wire between them shows;
    // a linked run is not split across columns (a column may grow by 2 for it)
    const tied = (a, b) => !!a && ((a.group && a.group === b.group) || !!rl.get(a.id)?.has(b.id));
    for (const [n0, d] of days.entries()) {
      const left = new Set(d.items), seq = [];
      for (const i of d.items) { if (!left.has(i)) continue; const q = [i]; left.delete(i);
        while (q.length) { const c = q.shift(); seq.push(c); for (const o of d.items) if (left.has(o) && tied(c, o)) { left.delete(o); q.push(o); } } }
      const pos = []; let col = 0, n = 0, y = y0 + 30, prev = null;
      for (const i of seq) {
        const t = tied(prev, i);
        if (n >= this.PER && !(t && n < this.PER + 2)) { col++; n = 0; y = y0 + 30; prev = null; }
        else if (prev) y += t ? 48 : 14;
        const h = this.est(i); pos.push({ i, col, y, h }); y += h; n++; prev = i;
      }
      const x = cx, cw = (col + 1) * (this.COLW + this.IN) - this.IN; cx += cw + this.GAP;
      for (const p of pos) this.M.set(p.i.id, { i: p.i, x: x + p.col * (this.COLW + this.IN), y: p.y, w: this.COLW, h: p.h, auto: true });
      this.heads.push({ k: d.k, n: d.items.length, x, y: y0, w: cw, h: Math.max(...pos.map(p => p.y + p.h + 14)) - y0, alt: n0 % 2, today: d.k === today });
    }
    plane.style.setProperty('--dayh', Math.max(320, ...this.heads.map(h => h.h + 20)) + 'px'); // 109d: the line between days runs as tall as the tallest day, not a stub next to a 1-card day
    // months for the far-out view: each spans its days' columns
    this.months = []; for (const h of this.heads) { const k = h.k.slice(0, 7), m = this.months.at(-1); if (m && m.k === k) { m.x2 = h.x + h.w; m.n += h.n; m.days.push(h.k); } else this.months.push({ k, x: h.x, x2: h.x + h.w, n: h.n, days: [h.k], y: y0 }); }
    const vis = new Map(); for (const d of days) for (const i of d.items) { const k = d.k.slice(0, 7); if (hasVisual(i)) { const a = vis.get(k) || vis.set(k, []).get(k); if (a.length < 4) a.push(i); } }
    this.months.forEach(m => { m.pics = vis.get(m.k) || []; });
    this.deg = this.degrees();
    this.cull(); Link.frame();
    if (S.cam) this.apply();
    requestAnimationFrame(() => { if (!S.cam) this.fit(false); }); // 109a: a synced item must not throw the camera back (only a new board/range/view starts from fit)
  },
  FAR: .14, // below this zoom the days fold into month tiles
  view(pad = 360) { // the visible part of the plane, in plane coordinates
    const c = S.cam; if (!c) return null; const p = pad / c.k, [w, h] = this.size();
    return { x1: -c.x / c.k - p, y1: -c.y / c.k - p, x2: (w - c.x) / c.k + p, y2: (h - c.y) / c.k + p };
  },
  size() { // 147: the board's size from a ResizeObserver: reading clientWidth right after a camera move forced a layout of every card, each wheel step
    const b = $('#board');
    if (!this._ro) { this._ro = new ResizeObserver(() => { this._wh = null; }); this._ro.observe(b); }
    if (!this._wh || !this._wh[0]) this._wh = [b.clientWidth, b.clientHeight];
    return this._wh;
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
      mg.hidden = false; BoardHint.update(); return;
    }
    mg.hidden = true;
    for (const [k, el] of this.mountedMonths || []) { el.remove(); this.mountedMonths.delete(k); }
    const inside = m => m.x < v.x2 && m.x + m.w > v.x1 && m.y < v.y2 && m.y + m.h > v.y1;
    for (const [id, m] of this.M) {
      const el = this.mounted.get(id);
      if (inside(m)) { if (!el && OnBoard.id === id && OnBoard.el?.isConnected) { Object.assign(OnBoard.el.style, { left: m.x + 'px', top: m.y + 'px' }); this.mounted.set(id, OnBoard.el); }
        else if (!el) { const c = this.card(m.i); if (m.auto) { c.classList.add('auto'); c.style.height = m.h + 'px'; } if (now() - (m.i.createdAt || 0) < 1500) c.classList.add('born'); c.style.left = m.x + 'px'; c.style.top = m.y + 'px'; frag.appendChild(c); this.mounted.set(id, c); fresh.push(c); } }
      else if (el && !el.classList.contains('dragging') && !(OnBoard.id === id && OnBoard.el?.isConnected) && !el.querySelector('[contenteditable="true"],[contenteditable="plaintext-only"]')) { el.remove(); this.mounted.delete(id); }
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
    if (fresh.length || frag.childNodes.length) { plane.appendChild(frag); fresh.forEach(c => { c.querySelectorAll('[data-tid]').forEach(t => thumbIO.observe(t)); Rich.hook(c); });
      // 147b: while a zoom is moving, measuring the new cards forced a layout every frame (phone 4x: ~15 fps) → measure them once it rests
      if (plane.classList.contains('moving')) (this._fq ||= []).push(...fresh); else this.fades(fresh); }
    this.fitHeads();
    this.wires();
    BoardHint.update();
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
  // 108: one path per link, out of the facing sides in a soft curve, under the cards (never across a body); faint until its card is hovered / tapped,
  // then strong + coloured with dots at both ends; zoomed out (<40%) no lines, the card says "🔗 3" instead. Only the mounted (visible) cards.
  WIREK: .4,
  edges(ids) { // [a, b, kind] for the given ids: same group (in time order), related (AI), links (drawn by hand)
    const out = [], seen = new Set(), grp = new Map();
    for (const id of ids) {
      const i = byId(id); if (!i) continue;
      if (i.group) { const g = grp.get(i.group); if (g) g.push(i); else grp.set(i.group, [i]); }
      for (const [r, kind] of [...(i.related || []), ...(i.explain?.related || [])].map(r => [r, 'rel']).concat((i.links || []).map(r => [r, 'man']))) {
        const k = [id, r].sort().join(); if (r !== id && ids.has(r) && !seen.has(k)) { seen.add(k); out.push([id, r, kind]); }
      }
    }
    for (const g of grp.values()) { g.sort((a, b) => a.ts - b.ts); for (let n = 1; n < g.length; n++) { const k = [g[n - 1].id, g[n].id].sort().join(); if (!seen.has(k)) { seen.add(k); out.push([g[n - 1].id, g[n].id, 'g']); } } }
    return out;
  },
  degrees() { const d = new Map(); for (const [a, b] of this.edges(new Set(this.M.keys()))) { d.set(a, (d.get(a) || 0) + 1); d.set(b, (d.get(b) || 0) + 1); } return d; },
  wires() {
    const svg = $('#wires');
    if (!S.cam || S.cam.k < this.WIREK) { if (svg.firstChild) svg.innerHTML = ''; return; }
    const cards = new Map([...document.querySelectorAll('#plane > .bcard')].map(c => [c.dataset.id, c]));
    const r1 = v => Math.round(v * 10) / 10;
    const path = (a, b) => { // the nearest sides face each other; the curve leaves them at a right angle
      const A = this.box(a), B = this.box(b);
      const gx = Math.max(B.x - (A.x + A.w), A.x - (B.x + B.w)), gy = Math.max(B.y - (A.y + A.h), A.y - (B.y + B.h));
      let x1, y1, x2, y2, c1, c2;
      if (gx > 0 || gx >= gy) { // side by side (other column): right edge → left edge, never down through the cards between: right edge → left edge, at the height where they overlap (else near the top)
        const [p, q] = A.x < B.x ? [A, B] : [B, A], lo = Math.max(p.y, q.y), hi = Math.min(p.y + p.h, q.y + q.h);
        const y = hi - lo > 24 ? (lo + Math.min(hi, lo + 80)) / 2 : null;
        x1 = p.x + p.w; y1 = y ?? p.y + Math.min(40, p.h / 2); x2 = q.x; y2 = y ?? q.y + Math.min(40, q.h / 2);
        const m = Math.max(24, (x2 - x1) / 2); c1 = [x1 + m, y1]; c2 = [x2 - m, y2];
      } else { // one under the other: bottom edge → top edge, at the middle of the overlap
        const [p, q] = A.y < B.y ? [A, B] : [B, A], lo = Math.max(p.x, q.x), hi = Math.min(p.x + p.w, q.x + q.w);
        x1 = hi - lo > 24 ? (lo + hi) / 2 : p.x + p.w / 2; x2 = hi - lo > 24 ? x1 : q.x + q.w / 2; y1 = p.y + p.h; y2 = q.y;
        const m = Math.max(16, (y2 - y1) / 2); c1 = [x1, y1 + m]; c2 = [x2, y2 - m];
      }
      return { d: `M${r1(x1)},${r1(y1)} C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(x2)},${r1(y2)}`, e: `${r1(x1)},${r1(y1)},${r1(x2)},${r1(y2)}` };
    };
    let h = '';
    for (const [a, b, kind] of this.edges(new Set(cards.keys()))) { const p = path(cards.get(a), cards.get(b)); h += `<path class="${kind}" data-a="${a}" data-b="${b}" data-e="${p.e}" d="${p.d}"/>`; }
    if (svg._h !== h) { svg.innerHTML = h; svg._h = h; }
    this.hot(this._hot, true);
  },
  hot(id, force) { // light up one card's links (hover with a mouse, tap on a phone)
    const svg = $('#wires'); if (id === this._hot && !force) return; this._hot = id;
    svg.querySelectorAll('.on').forEach(p => p.classList.remove('on')); svg.querySelectorAll('circle').forEach(c => c.remove());
    svg.classList.toggle('lit', !!id); if (!id) return;
    let dots = '';
    for (const p of svg.querySelectorAll(`path[data-a="${CSS.escape(id)}"],path[data-b="${CSS.escape(id)}"]`)) {
      p.classList.add('on'); svg.appendChild(p); const [x1, y1, x2, y2] = p.dataset.e.split(',');
      dots += `<circle class="${p.getAttribute('class')}" cx="${x1}" cy="${y1}" r="3.5"/><circle class="${p.getAttribute('class')}" cx="${x2}" cy="${y2}" r="3.5"/>`;
    }
    if (dots) svg.insertAdjacentHTML('beforeend', dots); else svg.classList.remove('lit');
  },
  apply() {
    const c = S.cam, pl = $('#plane'); pl.style.transform = `translate3d(${c.x}px,${c.y}px,0) scale(${c.k})`;
    if (c.k !== this._lk) { this._lk = c.k; pl.classList.add('moving'); clearTimeout(this._sharp); this._sharp = setTimeout(() => { pl.classList.remove('moving'); const q = (this._fq || []).filter(c => c.isConnected); this._fq = null; if (q.length) this.fades(q); }, 180); } // 140: crisp letters once the zoom rests
    Ink.place();
    // day labels keep a readable size at any zoom. 147b: the two zoom numbers live in one rule for the few elements that use them; set on
    // #plane every zoom step restyled every card (phone 4x: style recalc was most of the frame)
    const zr = this._zr ||= (() => { const st = document.head.appendChild(document.createElement('style')); st.textContent = '.day-band, .b-date, .b-lk { --hs: 1; --ik: 1 }'; return st.sheet.cssRules[0].style; })();
    zr.setProperty('--hs', Math.max(1, 1 / c.k)); zr.setProperty('--ik', 1 / c.k);
    const b = $('#board'); b.classList.toggle('far', c.k < .7); b.classList.toggle('nowire', c.k < this.WIREK); const g = 24 * c.k * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (24 * c.k)))); b.style.backgroundSize = `${g}px ${g}px`; b.style.backgroundPosition = `${c.x}px ${c.y}px`;
    const p = $('#zoomPct'); if (p) p.textContent = (c.k < .1 ? (c.k * 100).toFixed(1) : Math.round(c.k * 100)) + '%';
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
  boardMenu(anchor) { // 116: opens from the logo (top left): boards, new board, rename the current own board
    let p = $('#boardPop'); if (!p) { p = document.createElement('div'); p.id = 'boardPop'; p.className = 'pop range-pop'; p.setAttribute('role', 'menu'); p.hidden = true; document.body.appendChild(p);
      p.addEventListener('click', e => { if (e.target.closest('[data-brename]')) { p.querySelector('.ren-board').hidden = false; p.querySelector('[data-brename]').hidden = true; const i = p.querySelector('.ren-board input'); i.focus(); i.select(); return; }
        if (e.target.closest('[data-bpdf]')) { this.closeBoardMenu(); BoardPdf.save(); return; } // 107j
        const b = e.target.closest('[data-board]'); if (!b) return; this.go(b.dataset.board); this.closeBoardMenu(); });
      p.addEventListener('submit', async e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim().toLocaleLowerCase('tr').slice(0, 40); if (!v) return;
        if (e.target.classList.contains('ren-board')) { await this.renameBoard(S.board, v); this.closeBoardMenu(); return; }
        const cur = byId('boards'), t = now(); await upsert([{ id: 'boards', type: 'boards', names: [...new Set([...(cur?.names || []), v])], ts: cur?.ts || t, tags: [] }]); this.closeBoardMenu(); this.go(v); });
      p.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.closeBoardMenu(); $('#boardBtn').focus(); } });
      document.addEventListener('pointerdown', e => { if (!p.hidden && !e.target.closest('#boardPop,#boardBtn')) this.closeBoardMenu(); }); }
    if (!p.hidden) return this.closeBoardMenu();
    const cur = S.board || 'main', count = n => S.items.filter(i => !i.deleted && !hid(i) && !i.parent && inBoard(i, n)).length;
    const own = !onMain() && (byId('boards')?.names || []).includes(S.board) && !S.items.some(i => !i.deleted && i.project === S.board);
    p.innerHTML = `<div class="side-label">Panolar</div><button class="side-row${cur === 'main' ? ' on' : ''}" data-board="main" role="menuitemradio" aria-checked="${cur === 'main'}">${ic('board', 'sm')}<span class="lbl">Genel</span>${cur === 'main' ? ic('check', 'sm') : ''}</button>`
      + boardNames().map(n => `<button class="side-row${cur === n ? ' on' : ''}" data-board="${esc(n)}" role="menuitemradio" aria-checked="${cur === n}">${ic('folder', 'sm')}<span class="lbl">${esc(n)}</span><span class="n">${count(n)}</span></button>`).join('')
      + `<form class="new-board"><input placeholder="+ Yeni pano (ör. ev)" aria-label="Yeni pano adı" maxlength="40"></form>`
      + (own ? `<button class="side-row" data-brename>${ic('pen', 'sm')}<span class="lbl">“${esc(S.board)}” adını değiştir</span></button><form class="new-board ren-board" hidden><input value="${esc(S.board)}" aria-label="Panonun yeni adı" maxlength="40"></form>` : '')
      + `<button class="side-row" data-bpdf>${ic('down', 'sm')}<span class="lbl">Bu panoyu PDF olarak kaydet</span></button>`
      + `<p class="hint" style="padding:4px 9px">${aiName()} bir kaydı bir projeye koyunca o projenin panosunda da görünür.</p>`;
    p.hidden = false; anchor.setAttribute('aria-expanded', 'true'); const r = anchor.getBoundingClientRect();
    if (r.top < innerHeight / 2) { // 146: never over the left rail (or its ">" tab): open to its right when they would meet
      let x = Math.max(8, Math.min(r.left, innerWidth - p.offsetWidth - 8)); const y = r.bottom + 8;
      for (const el of document.querySelectorAll('.rail, .rail-tab')) { const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!b.width || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
        if (b.left < x + p.offsetWidth && b.right > x && b.top < y + p.offsetHeight && b.bottom > y) x = Math.max(x, b.right + 8); }
      p.style.left = Math.min(x, innerWidth - p.offsetWidth - 8) + 'px'; p.style.top = y + 'px'; }
    else { p.style.left = Math.max(8, r.right - p.offsetWidth) + 'px'; p.style.top = Math.max(8, r.top - p.offsetHeight - 8) + 'px'; }
    p.classList.remove('bp-in'); void p.offsetWidth; p.classList.add('bp-in');
  },
  closeBoardMenu() { const p = $('#boardPop'); if (p) p.hidden = true; $('#boardBtn')?.setAttribute('aria-expanded', 'false'); },
  async renameBoard(from, to) { // own boards only (project boards follow the project name); cards keep their place on the board
    if (!from || from === to || boardNames().includes(to)) { if (from !== to && boardNames().includes(to)) toast('Bu adda bir pano zaten var', 3000, 'x'); return; }
    const cur = byId('boards'), t = now(), ch = [{ ...cur, names: [...new Set((cur.names || []).map(n => n === from ? to : n))], ts: cur.ts || t }];
    for (const i of S.items) {
      if (i.deleted || !((i.boards || []).includes(from) || i.posBy?.[from])) continue;
      const c = { ...i, boards: (i.boards || []).map(n => n === from ? to : n) };
      if (i.posBy?.[from]) { const pb = { ...i.posBy }, pa = { ...(i.posByAt || {}) }; pb[to] = pb[from]; delete pb[from]; pa[to] = t; pa[from] = t; c.posBy = pb; c.posByAt = pa; }
      ch.push(c);
    }
    await upsert(ch); this.go(to); toast(`Pano adı: ${to}`, 2500, 'check');
  },
  go(name) { S.board = name === 'main' ? null : name; try { localStorage.setItem('hn-board', S.board || ''); } catch { } S.cam = null; render(); },
  // 153: one menu for the clock button and for a right click (phone: hold still, then lift) on the board's empty space:
  // Göster → Son 30 gün · 3 ay · 6 ay · 1 yıl · Tümü (+ years), and on Genel "Arşivi de göster" (WhatsApp, yer imleri · N kayıt)
  rangeMenu(anchor, x, y) {
    let p = $('#rangePop'); if (!p) { p = document.createElement('div'); p.id = 'rangePop'; p.className = 'pop range-pop'; p.hidden = true; p.setAttribute('role', 'menu'); p.setAttribute('aria-label', 'Panoda göster'); document.body.appendChild(p);
      const close = (back = true) => { p.hidden = true; if (back && p._from?.isConnected) p._from.focus({ preventScroll: true }); };
      p.addEventListener('click', e => { const b = e.target.closest('[data-range],[data-rarch]'); if (!b || performance.now() - p._at < 350) return; close(false); // the lifting finger's own click does not pick
        if (b.dataset.range) { if (b.dataset.range !== Range.get()) Range.set(b.dataset.range); } else Range.setArch(!Range.arch()); });
      p.addEventListener('keydown', e => { const bs = [...p.querySelectorAll('button')], k = bs.indexOf(document.activeElement);
        const to = e.key === 'ArrowDown' ? k + 1 : e.key === 'ArrowUp' ? (k < 0 ? -1 : k - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? -1 : e.key === 'Tab' ? k + (e.shiftKey ? -1 : 1) : null;
        if (to !== null) { e.preventDefault(); bs.at(to % bs.length)?.focus(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
      document.addEventListener('pointerdown', e => { if (!p.hidden && !e.target.closest('#rangePop,#rangeBtn')) close(false); });
      addEventListener('resize', () => close(false)); }
    const cur = Range.get(), main = onMain(), arch = Range.arch(), row = (v, l) => `<button class="side-row${v === cur ? ' on' : ''}" role="menuitemradio" aria-checked="${v === cur}" data-range="${v}">${ic(v === 'all' ? 'layers' : 'clock', 'sm')}<span class="lbl">${l}</span>${v === cur ? ic('check', 'sm') : ''}</button>`;
    const all = RANGES(), base = all.filter(r => r[0][0] !== 'y'), ys = all.filter(r => r[0][0] === 'y');
    const na = main ? alive().filter(i => i.archive && !i.parent && !i.pos && !i.onBoard && !hid(i) && inRange(i.ts)).length : 0;
    p.innerHTML = `<div class="side-label">Göster</div>` + base.map(r => row(...r)).join('')
      + (ys.length > 1 ? `<div class="rp-years">${ys.map(([v, l]) => `<button class="rp-y${v === cur ? ' on' : ''}" role="menuitemradio" aria-checked="${v === cur}" data-range="${v}">${l}</button>`).join('')}</div>` : '')
      + (main ? `<div class="rp-sep"></div><button class="side-row rp-arch" role="menuitemcheckbox" aria-checked="${arch}" data-rarch>${ic('inbox', 'sm')}<span class="lbl">Arşivi de göster<small>${na.toLocaleString('tr')} kayıt · WhatsApp, yer imleri</small></span><span class="switch" aria-hidden="true"><input type="checkbox" tabindex="-1"${arch ? ' checked' : ''}><span></span></span></button>` : '')
      + `<p class="hint rp-hint">Panoya koyduğun ya da taşıdığın kartlar her zaman görünür.</p>`;
    p._from = anchor; p._at = performance.now(); p.hidden = false;
    const W = innerWidth, H = innerHeight, pw = p.offsetWidth, ph = p.offsetHeight;
    if (x != null) { p.style.left = Math.max(8, Math.min(W - pw - 8, x)) + 'px'; p.style.top = Math.max(8, Math.min(H - ph - 8, y + ph > H - 8 ? y - ph : y)) + 'px'; }
    else { const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, Math.min(W - pw - 8, r.right - pw)) + 'px'; p.style.top = (r.top - ph - 8 >= 8 ? r.top - ph - 8 : Math.min(H - ph - 8, r.bottom + 8)) + 'px'; }
    (p.querySelector('.on') || p.querySelector('button'))?.focus({ preventScroll: true });
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
  id: () => (S.board || 'main') + '|' + Range.get() + Range.arch(), // 150: the board on screen (a fit for another board's cards is never used)
  fit(anim = true) {
    if (this._key && this._key[6] !== this.id()) return; // the cards in M belong to the board we just left: the redraw fits
    const ms = [...(this.M?.values() || [])], b = $('#board');
    if (!b.clientWidth) { if (!b.hidden) requestAnimationFrame(() => this.fit(anim)); return; } // not laid out yet
    if (!ms.length) { S.cam = { k: 1, x: 24, y: 72 }; return this.apply(); }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    ms.forEach(m => { x1 = Math.min(x1, m.x); y1 = Math.min(y1, m.y - 30); x2 = Math.max(x2, m.x + m.w); y2 = Math.max(y2, m.y + (m.auto ? m.h : Math.min(m.h, 300))); });
    const top = 64, bot = 110, W = b.clientWidth - 48, H = b.clientHeight - top - bot;
    const phone = innerWidth < 900;
    let k = phone ? 1 : Math.max(.35, Math.min(1, W / (x2 - x1), H / (y2 - y1))); // 98 phone: full size, the days scroll sideways from the newest
    if (phone && (x2 - x1) <= W) k = Math.max(.7, Math.min(1, W / (x2 - x1)));
    if (!phone && (x2 - x1) * k > W * 3 && (Range.get() === 'all' || +Range.get() >= 180 || Range.get()[0] === 'y')) k = Math.max(this.minK(), Math.min(this.FAR * .9, W / (x2 - x1))); // a long range: months on one screen
    // if it doesn't fit even small, start at the newest (right) end
    const x = (x2 - x1) * k <= W ? (b.clientWidth - (x2 - x1) * k) / 2 - x1 * k : b.clientWidth - 24 - x2 * k;
    S.cam = { k, x, y: top - y1 * k };
    anim ? this.animate(() => this.apply()) : this.apply();
  },
  // save where cards were dropped, without re-rendering the board
  // 139: the selection box, in plane coordinates (it stays right while the camera does not move)
  boxAt(d, cx, cy) {
    const b = $('#board').getBoundingClientRect();
    if (!d.boxEl) { d.boxEl = document.createElement('div'); d.boxEl.className = 'sel-box'; document.body.appendChild(d.boxEl); d.base = d.mods ? new Set(Link.sel) : new Set(); getSelection()?.removeAllRanges(); Ctx.hide(); }
    const l = Math.max(b.left, Math.min(d.sx, cx)), r = Math.min(b.right, Math.max(d.sx, cx)), t = Math.max(b.top, Math.min(d.sy, cy)), bt = Math.min(b.bottom, Math.max(d.sy, cy));
    Object.assign(d.boxEl.style, { left: l + 'px', top: t + 'px', width: r - l + 'px', height: bt - t + 'px' });
    d.last = [l - b.left, t - b.top, r - b.left, bt - b.top]; if (!d.raf) d.raf = requestAnimationFrame(() => { d.raf = 0; this.boxHit(d); });
  },
  boxHit(d) { // Shift adds to what was picked, Ctrl/Cmd flips it, a plain box starts over
    const [l, t, r, bt] = d.last, k = S.cam.k, s = new Set(d.base);
    for (const id of Link.hit({ x1: (l - S.cam.x) / k, y1: (t - S.cam.y) / k, x2: (r - S.cam.x) / k, y2: (bt - S.cam.y) / k })) d.mods === 'flip' && d.base.has(id) ? s.delete(id) : s.add(id);
    if (s.size !== Link.sel.size || [...s].some(id => !Link.sel.has(id))) { Link.sel = s; S.linkFrom = null; Link.paint(); }
  },
  boxEnd(d) {
    if (!d.boxEl) { if (!d.mods && Link.sel.size && !S.linkFrom) Link.end(); return; } // a plain click on empty space lets the selection go
    if (d.raf) cancelAnimationFrame(d.raf); d.raf = 0; d.boxEl.remove(); if (d.last) this.boxHit(d); if (Link.sel.size) haptic(8);
  },
  grab(d) { // what moves together: mounted cards (their element), cards off screen (their layout box), strokes (their path)
    d.grp = { cards: [], draws: [] };
    for (const id of Link.sel) {
      const i = byId(id); if (!i || i.deleted) continue;
      if (i.type === 'draw') { const el = document.querySelector(`#ink path[data-did="${id}"]`); d.grp.draws.push({ i, el }); continue; }
      const m = this.M?.get(id); if (!m) continue; const el = this.mounted?.get(id);
      if (el) el.classList.add('dragging');
      d.grp.cards.push({ i, m, el, x: el ? el.offsetLeft : m.x, y: el ? el.offsetTop : m.y });
    }
  },
  groupMove(d, dx, dy) {
    for (const c of d.grp.cards) if (c.el) { c.el.style.left = c.x + dx + 'px'; c.el.style.top = c.y + dy + 'px'; }
    for (const s of d.grp.draws) s.el?.setAttribute('transform', `translate(${dx} ${dy})`);
    const f = $('#selFrame'); if (f && !f.hidden) { f.style.translate = `${dx}px ${dy}px`; }
  },
  async groupDrop(d, dx, dy) {
    const f = $('#selFrame'); if (f) f.style.translate = '';
    dx = Math.round(dx); dy = Math.round(dy); const cards = [];
    for (const c of d.grp.cards) {
      c.el?.classList.remove('dragging', 'auto'); if (c.el) c.el.style.height = '';
      const i = byId(c.i.id); if (!i) continue; setPos(i, { x: Math.round(c.x + dx), y: Math.round(c.y + dy) });
      const p = posOf(i); Object.assign(c.m, { x: p.x, y: p.y, auto: false, h: c.m.auto ? c.m.h + 40 : c.m.h }); cards.push(i);
    }
    const draws = d.grp.draws.map(s => { const i = { ...byId(s.i.id), pts: s.i.pts.map(([x, y]) => [x + dx, y + dy]) }; if (s.el) { s.el.removeAttribute('transform'); s.el.setAttribute('d', Ink.path(i.shape, i.pts)); s.el._k = Ink.key(i); } return i; });
    if (cards.length) await this.savePos(cards);
    if (draws.length) await upsert(draws);
    Link.frame(); this.wires();
  },
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
    // 108: a mouse lights a card's links while over it; a finger (or pen) lights them with a tap, until a tap elsewhere
    let tt = 0; const mouse = e => e.pointerType === 'mouse' && performance.now() - tt > 1500 && matchMedia('(hover: hover)').matches; // a phone also sends a mouse leave when a window opens
    b.addEventListener('pointerover', e => { if (mouse(e) && !drag) this.hot(e.target.closest?.('.bcard')?.dataset.id || null); });
    b.addEventListener('pointerleave', e => { if (mouse(e)) this.hot(null); });
    b.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') { tt = performance.now(); this.hot(e.target.closest?.('.bcard')?.dataset.id || null); }
      if (e.target.closest('.acts, .r-live, .b-open') || e.button === 2 || !S.cam) return; // 145: the live card's own controls
      if (e.target.closest('#months')) { // 109a: the month grid keeps its own taps and scrolling (no capture), but two fingers still zoom
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = null;
        if (pts.size === 2) { const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; }
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      b.setPointerCapture(e.pointerId);
      if (pts.size === 2) {
        if (drag?.card && drag.moved) return; // keep dragging the card, ignore the 2nd finger
        drag?.card?.classList.remove('dragging'); drag = null; Motion.drop();
        const [p, q] = [...pts.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 }; return;
      }
      if (S.tool !== 'select' && !space && e.button !== 1 && !e.target.closest('.st-body[contenteditable="true"]')) { drag = Ink.start(e); if (drag) { this.busy = true; return; } }
      if (e.target.closest('.st-body[contenteditable="true"]')) return;
      const sz = e.target.closest('.st-size');
      if (sz) { const card = sz.parentNode, body = card.querySelector('.st-body'); e.preventDefault(); // 140: a text grows its letters, a note its box
        drag = { resize: card, body, note: !card.classList.contains('text'), sx: e.clientX, sy: e.clientY, fs0: parseFloat(getComputedStyle(body).fontSize), w0: card.offsetWidth, h0: card.offsetHeight }; this.busy = true; return; }
      const card = space || e.button === 1 ? null : e.target.closest('.bcard');
      drag = { card, t: e.target, tile: null, sx: e.clientX, sy: e.clientY, moved: false, cx: S.cam.x, cy: S.cam.y, ox: card?.offsetLeft, oy: card?.offsetTop, mods: e.shiftKey ? 'add' : e.ctrlKey || e.metaKey ? 'flip' : '' };
      // 139: on empty space a mouse draws a selection box (Space / middle button still pan); inside the frame of 2+ picked things it moves them all.
      // A finger pans; held still for a moment it draws the box instead
      if (!card && !space && e.button === 0 && !e.target.closest('#months') && S.tool === 'select' && !S.linkFrom) {
        const [px, py] = Ink.at(e), bb = Link.sel.size > 1 && Link.bounds();
        if (bb && px > bb.x1 - 8 && px < bb.x2 + 8 && py > bb.y1 - 8 && py < bb.y2 + 8) drag.grab = true;
        else if (e.pointerType === 'mouse') drag.box = true;
        else { const d0 = drag; drag.lp = setTimeout(() => { if (drag === d0 && !d0.moved && pts.size === 1) { d0.box = true; haptic(12); this.boxAt(d0, e.clientX, e.clientY); } }, 420); }
      } else if (card && Link.sel.has(card.dataset.id) && Link.sel.size > 1) drag.grab = true;
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
      if (drag.resize && drag.note) { drag.w = Math.round(Math.max(120, Math.min(640, drag.w0 + (e.clientX - drag.sx) / S.cam.k))); drag.h = Math.round(Math.max(80, Math.min(900, drag.h0 + (e.clientY - drag.sy) / S.cam.k)));
        drag.resize.style.width = drag.w + 'px'; drag.resize.style.minHeight = drag.h + 'px'; Ink.place(); return; }
      if (drag.resize) { // text size follows the corner handle
        drag.fs = Math.round(Math.max(10, Math.min(160, drag.fs0 + ((e.clientX - drag.sx) + (e.clientY - drag.sy)) / 2 / S.cam.k * .6)));
        drag.body.style.fontSize = drag.fs + 'px'; return;
      }
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < (drag.lp && !drag.box ? 8 : 5)) return;
      if (drag.lp && !drag.box) { clearTimeout(drag.lp); drag.lp = 0; }
      if (drag.box) { drag.moved = true; return this.boxAt(drag, e.clientX, e.clientY); }
      if (drag.grab) { if (!drag.moved) { this.grab(drag); this.busy = true; } drag.moved = true; return this.groupMove(drag, dx / S.cam.k, dy / S.cam.k), redraw(); }
      if (!drag.moved && drag.card) {
        const r = drag.card.getBoundingClientRect(); Motion.hold(drag.card, (drag.sx - r.left) / S.cam.k, (drag.sy - r.top) / S.cam.k); // 142: lean from the grab point
        drag.card.classList.add('dragging'); drag.card.parentNode.appendChild(drag.card); // on top
        this.busy = true;
      }
      if (drag.card) Motion.move(e.clientX);
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
      if (d.lp) clearTimeout(d.lp);
      if (d.ink) return Ink.end(d, e);
      if (d.box && !d.moved && e.pointerType !== 'mouse' && e.type === 'pointerup' && !d.mods) { if (d.raf) cancelAnimationFrame(d.raf); d.boxEl?.remove(); return this.rangeMenu($('#rangeBtn'), e.clientX, e.clientY); } // 153: held still and lifted → the range menu; held and dragged → the selection box (139)
      if (d.box) return this.boxEnd(d);
      if (d.grp) return this.groupDrop(d, (e.clientX - d.sx) / S.cam.k, (e.clientY - d.sy) / S.cam.k);
      if (!d.card && !d.moved && !d.grab && e.type === 'pointerup' && !d.mods && Link.sel.size && !S.linkFrom) return Link.end(); // a click on empty space lets the selection go
      if (d.tile && !d.moved) return this.zoomMonth(d.tile);
      if (d.resize) { const i = byId(d.resize.dataset.id); if (!i) return;
        if (d.note) { if (d.w && (d.w !== i.w || d.h !== i.h)) { const m = this.M?.get(i.id); if (m) m.w = d.w; await upsert([{ ...i, w: d.w, h: d.h }]); } return; }
        if (d.fs && d.fs !== i.fs) await upsert([{ ...i, fs: d.fs }]); return; }
      if (!d.card || !d.card.isConnected) return Motion.drop();
      if (!d.moved) { if (e.type !== 'pointerup' || Ctx.el && !Ctx.el.hidden) return; // 138: a long press opened the card menu, the finger lifting must not open the card too
        if (S.linkFrom) return Link.pick(d.card.dataset.id); // 138: "Bağla…" is waiting for the other card
        if (!(e.shiftKey || e.ctrlKey || e.metaKey) && byId(d.card.dataset.id)?.sticky) return Ink.tap(d.card, e, d.t); // 140: pick, then write
        if (e.shiftKey || e.ctrlKey || e.metaKey || Link.sel.size) return Link.toggle(d.card.dataset.id); // 138/139: Shift / Ctrl-click picks (then taps add/remove)
        if (Rich.tap(d.card, d.t)) return; // 106a: play / tick inside the card
        if (OnBoard.tap(d.card)) return; // 145: a PDF / sound / video / picture works right on the board
        return openItem(d.card.dataset.id); }
      d.card.classList.remove('dragging'); Motion.drop(d.card); // 142: settle + a calm sheen
      const i = byId(d.card.dataset.id); if (!i) return;
      setPos(i, { x: Math.round(d.card.offsetLeft), y: Math.round(d.card.offsetTop) });
      d.card.classList.remove('auto'); d.card.style.height = '';
      const m = this.M?.get(i.id), p = posOf(i); if (m) Object.assign(m, { x: p.x, y: p.y, auto: false, h: m.h + 40 });
      await this.savePos([i]); // only this card moves; the day columns stay where they are
    };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('dblclick', e => { const c = e.target.closest('.bcard.sticky'); if (c) return Ink.edit(c, e); if (S.tool === 'select' && !e.target.closest('.bcard')) Ink.sticky('note', e); });
    Ink.init();
    b.addEventListener('click', e => { const o = e.target.closest('.b-open'); if (o) { e.stopPropagation(); OnBoard.close(); return openItem(o.closest('[data-id]').dataset.id); } // 145: the corner button opens the record window
      const a = e.target.closest('.act'); if (a) { e.stopPropagation(); itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); } });
    b.addEventListener('wheel', e => {
      if (!S.cam) return;
      const zoom = e.ctrlKey || e.metaKey;
      if (!zoom && e.target.closest('#months, .bcard.live .lv-scroll')) return; // the month grid (and a live PDF page, 145) scrolls by itself
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
    $('#rangeX').innerHTML = ic('x', 'sm'); $('#rangeX').onclick = () => { const k = Range.key(); Range.c['a|' + k] = false; Range.ls('hn-arch-' + k, '0'); Range.set(Range.def()); };
    // 153: right click on the board's empty space opens the same menu where the mouse is (a long press on the phone: see drop)
    b.addEventListener('contextmenu', e => { if (e.target.closest('.bcard,#months,.st-body,input,textarea')) return; e.preventDefault();
      if (e.pointerType === 'touch' || e.sourceCapabilities?.firesTouchEvents) return; this.rangeMenu($('#rangeBtn'), e.clientX, e.clientY); });
    $('#boardBtn').onclick = e => this.boardMenu(e.currentTarget);
    try { S.board = localStorage.getItem('hn-board') || null; } catch { }
    addEventListener('resize', () => { if (S.view === 'board' && !Ink.cur && !$('#board').hidden && !this.anyVisible()) this.fit(false); });
    $('#tidyBtn').onclick = () => this.tidy();
    $('#months').addEventListener('click', e => { const t = e.target.closest('[data-month]'); if (t) this.zoomMonth(t.dataset.month); });
  },
};

// ---------- 120: the AI's own cursor (like Figma's): when Claude / Codex / Gemini changes cards, a pointer in its logo colour with its
// name glides from card to card on the board and touches each one; the user's own pointer can wear the same design (Settings → Görünüm) ----------
const AICOL = { claude: '#d97757', gemini: '#4285f4', codex: '#10a37f' };
const curSvg = (c, w = 22) => `<svg width="${w}" height="${w}" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 2.2 19 9.6l-6.9 1.9-3.2 6.6Z" fill="${c}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
// 144: one small spring (semi-implicit Euler, per frame): k stiffness, d damping; returns true while still moving
const spring = (s, tx, ty, k, d, dt) => {
  s.vx += ((tx - s.x) * k - s.vx * d) * dt; s.vy += ((ty - s.y) * k - s.vy * d) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  return Math.abs(tx - s.x) > .3 || Math.abs(ty - s.y) > .3 || Math.abs(s.vx) > 4 || Math.abs(s.vy) > 4;
};
const AICur = {
  q: [], run: false,
  tour(ids, what = 'düzenledi') { // ids: the cards it just changed (only the ones on screen are visited, up to 8)
    if (S.view !== 'board' || reduced() || document.hidden) return;
    this.q.push([ids, what]); if (!this.run) this.next();
  },
  async next() {
    const job = this.q.shift(); if (!job) { this.run = false; return this.hide(); }
    this.run = true; const [ids, what] = job, b = $('#board'), br = b.getBoundingClientRect(), k = aiKey();
    const cards = ids.map(id => b.querySelector(`#plane > .bcard[data-id="${CSS.escape(id)}"]`)).filter(c => {
      const r = c?.getBoundingClientRect(); return r && r.right > br.left + 20 && r.left < br.right - 60 && r.bottom > br.top + 20 && r.top < br.bottom - 40;
    }).slice(0, 8);
    if (!cards.length) return this.next();
    let el = $('#aicur');
    if (!el) {
      el = document.createElement('div'); el.id = 'aicur'; el.setAttribute('aria-hidden', 'true'); b.append(el);
      this.p = { x: br.width - 80, y: br.height - 90, vx: 0, vy: 0 }; this.t = { ...this.p }; this.put(el, 0);
    }
    el.style.setProperty('--ai', AICOL[k]); el.className = 'k-' + k;
    el.innerHTML = `<span class="ac-p">${curSvg(AICOL[k])}</span><span class="ai-tag">${esc(aiName())}<i class="ac-dots"><b></b><b></b><b></b></i></span>`;
    clearTimeout(this._h); el.offsetWidth; el.classList.add('on', 'idle');
    let first = true;
    for (const c of cards) {
      if (!c.isConnected) continue; const r = c.getBoundingClientRect();
      const x = Math.max(Math.max(r.left, br.left) - br.left + Math.min(r.width * .3, 60), 8), y = Math.max(Math.max(r.top, br.top) - br.top + Math.min(r.height * .45, 40), 8); // a half-hidden card: touch its visible part
      await this.fly(el, Math.round(Math.min(x, br.width - 130)), Math.round(Math.min(y, br.height - 120)));
      if (!c.isConnected) continue;
      el.classList.remove('tap'); el.offsetWidth; el.classList.add('tap'); // the "click": the arrow dips, a ring opens at its tip
      c.style.setProperty('--ai', AICOL[k]); c.classList.remove('ai-touch'); c.offsetWidth; c.classList.add('ai-touch');
      setTimeout(() => c.classList.remove('ai-touch'), 900);
      if (first) { first = false; this.type(el, what); }
      await new Promise(f => setTimeout(f, 300));
    }
    this.next();
  },
  // the pill types the verb letter by letter (after "…" while it travels to the first card)
  type(el, what) {
    const i = el.querySelector('.ai-tag i'); if (!i) return; i.className = ''; i.textContent = '';
    let n = 0; const step = () => { if (!i.isConnected || n > what.length) return; i.textContent = what.slice(0, n++); setTimeout(step, 34); }; step();
  },
  put(el, tilt) {
    const p = this.p, t = this.tg || p;
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    el.style.setProperty('--tilt', tilt.toFixed(1) + 'deg');
    const cl = v => Math.max(-26, Math.min(26, v)).toFixed(1) + 'px'; el.style.setProperty('--lx', cl(t.x - p.x)); el.style.setProperty('--ly', cl(t.y - p.y));
  },
  // a springy, slightly curved flight: the goal slides along a bent path for ~340 ms and the cursor chases it (speeds up, eases in, small overshoot);
  // the arrow leans into the motion and the name pill follows on a looser spring, like it hangs on a string
  fly(el, tx, ty) {
    return new Promise(done => {
      const p = this.p, sx = p.x, sy = p.y, dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1;
      const bend = Math.min(len * .18, 70) * (dx > 0 ? -1 : 1), cx = sx + dx / 2 - dy / len * bend, cy = sy + dy / 2 + dx / len * bend;
      this.tg = this.tg || { ...p, vx: 0, vy: 0 };
      const t0 = performance.now(), T = Math.min(420, 220 + len * .35); let last = t0;
      el.classList.remove('idle');
      const tick = now => {
        const dt = Math.min(.034, (now - last) / 1000); last = now;
        const u = Math.min(1, (now - t0) / T), e = u * u * (3 - 2 * u), a = 1 - e; // smoothstep along the quadratic curve
        const gx = a * a * sx + 2 * a * e * cx + e * e * tx, gy = a * a * sy + 2 * a * e * cy + e * e * ty;
        const moving = spring(p, gx, gy, 210, 19, dt);
        spring(this.tg, p.x, p.y, 170, 18, dt);
        this.put(el, Math.max(-12, Math.min(12, p.vx * .011 + p.vy * .004)));
        if (u < 1 || moving || now - t0 < T + 120) { if (now - t0 < 1600) return requestAnimationFrame(tick); }
        p.x = tx; p.y = ty; p.vx = p.vy = 0; this.tg = { ...p }; this.put(el, 0); el.classList.add('idle'); done();
      };
      requestAnimationFrame(tick);
    });
  },
  hide() { this._h = setTimeout(() => { const el = $('#aicur'); if (!el) return; el.classList.remove('on'); setTimeout(() => { if (!this.run) el.remove(); }, 320); }, 1100); },
  // 144b: the user's own cursor in the same family: the OS still draws the arrow (a CSS cursor, so it never lags), a name pill in the accent colour
  // follows it on a spring and shows what the hand is doing (taşıyor / çiziyor); buttons and text fields get the normal cursor and no pill; desktop only
  mine() {
    const on = !!S.settings?.myCursor && matchMedia('(hover: hover) and (pointer: fine)').matches, b = $('#board'); if (!b) return;
    const ac = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#c2410c';
    if (!on) { b.style.removeProperty('--my-cur'); $('#mycur')?.remove(); return; }
    b.style.setProperty('--my-cur', `url("data:image/svg+xml,${encodeURIComponent(curSvg(ac).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}") 3 2, default`);
    let el = $('#mycur');
    if (!el) { el = document.createElement('div'); el.id = 'mycur'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<span class="mc-s"></span><b></b>'; b.append(el); }
    el.querySelector('b').textContent = Cloud.name() || 'Sen';
    if (this._mine) return; this._mine = true;
    const s = { x: 0, y: 0, vx: 0, vy: 0 }, t = { x: 0, y: 0 }; let raf = 0, shown = false, state = '';
    const loop = now => {
      raf = 0; const dt = Math.min(.034, (now - (loop.l || now - 16)) / 1000); loop.l = now;
      const m = reduced() ? (s.x = t.x, s.y = t.y, false) : spring(s, t.x, t.y, 520, 30, dt);
      const e = $('#mycur'); if (e) e.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      if (m) raf = requestAnimationFrame(loop); else loop.l = 0;
    };
    const HOT = 'button, a, input, textarea, select, [contenteditable="true"], .seg, .tool, #pal, .menu, .ctx, [role="menu"], dialog';
    const move = ev => {
      const e = $('#mycur'); if (!e || ev.pointerType !== 'mouse') return;
      const plain = !ev.target.closest(HOT) && !b.classList.contains('panning') && !b.classList.contains('space');
      if (plain !== shown) { shown = plain; e.classList.toggle('on', plain); if (plain) { s.x = ev.clientX + 18; s.y = ev.clientY + 16; s.vx = s.vy = 0; } }
      const drag = b.querySelector('#plane > .bcard.dragging'), draw = ev.buttons && /^(pen|arrow|rect)$/.test(S.tool);
      const st = drag ? 'taşıyor' : draw ? 'çiziyor' : '';
      if (st !== state) { state = st; const x = e.querySelector('.mc-s'); x.innerHTML = st ? (st === 'çiziyor' ? ic('pen', 'sm') : '') + `<i>${st}</i>` : ''; e.classList.toggle('act', !!st); }
      t.x = ev.clientX + 18; t.y = ev.clientY + 16; if (!raf) raf = requestAnimationFrame(loop);
    };
    b.addEventListener('pointermove', move, { passive: true });
    b.addEventListener('pointerleave', () => { shown = false; $('#mycur')?.classList.remove('on'); });
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
    if (this._imp) return; this._imp = true; let total = 0;
    try {
      for (let round = 0; round < 40; round++) {
        const list = await this.call('/import-items', null, 30000); if (!list.length) break;
        // 152: `nts import` sends "seen again" notes for what is already in Nts; a link that came in meanwhile is caught here too
        const ix = NtsDedup.index(S.items), upd = new Map(), again = (oid, sv) => { const o = upd.get(oid) || byId(oid); if (o && !o.deleted) upd.set(oid, NtsDedup.addSave(o, sv)); };
        const add = [];
        for (const i of list) {
          if (i.saveOf) { again(i.saveOf, i.save); continue; }
          if (byId(i.id)) continue;
          const old = i.type === 'link' && !i.parent && ix.url(i.url); if (old) { again(old.id, NtsDedup.saveOf(i)); continue; }
          ix.add(i); add.push(i);
        }
        if (upd.size) await upsert([...upd.values()], { quiet: true });
        total += add.filter(i => i.pending).length;
        if (add.length) { if (total >= 100 && !S.settings.importHold) { S.settings.importHold = true; await DB.put('kv', S.settings, 'settings'); } await upsert(add); }
        await this.call('/import-items/ack', { ids: list.map(i => i.id) });
        toast(`İçe aktarılanlar alınıyor… ${add.length} kayıt`, 2500, 'inbox');
      }
      if (S.settings.importHold) this.holdAsk();
    } catch (e) { console.warn('imports', e); } finally { this._imp = false; }
  },
  // 148: a big import is organized only after a yes: "~N token tutar, başlatayım mı?" (also in Settings until started)
  held() { return S.settings.importHold ? S.items.filter(i => i.pending && !i.deleted && i.archive) : []; },
  estTok(list) { return list.reduce((n, i) => n + 70 + Math.ceil(((i.archive ? (i.text || '').slice(0, 500) : (i.text || '').slice(0, 900)).length + (i.title || '').length + (i.url || '').length) / 3.6), 0) + Math.ceil(list.length / 60) * 2000; },
  holdAsk() { const h = this.held(); if (!h.length) return this.holdGo();
    toast(`${h.length} içe aktarılan kayıt bekliyor · düzenlemek ~${kTok(this.estTok(h))} token tutar`, 20000, 'spark', { label: 'Başlat', fn: () => this.holdGo() }); },
  async holdGo() { if (!S.settings.importHold) return; S.settings.importHold = false; await DB.put('kv', S.settings, 'settings'); this.kick(); },
  async usage() { try { return S.bridgeOk ? await this.call('/usage', null, 8000) : null; } catch { return null; } },
  async ocrBackfill() { // images saved before text reading existed: a few at a time, newest first, only when idle
    if (this._ocr || S.aiBusy || !S.bridgeOk) return; this._ocr = true;
    try {
      // 130b: images also get 3-6 "seen" labels (vtags: objects, colours, style) for search; an older bridge without labels → only text
      // 160: a photo with a little text used to get only "yazı" (no objects → "çanta" did not find it): asked again once (vrel)
      const reV = i => !i.vrel && i.vtags?.length === 1 && i.vtags[0] === 'yazı' && (i.ocr || '').split(/\s+/).length < 60;
      const needV = i => fileKind(i) === 'image' && (i.vtags === undefined || reV(i)) && !this._noLabels;
      const todo = S.items.filter(i => !i.deleted && !i.pending && ((i.ocr === undefined && (fileKind(i) === 'image' || (fileKind(i) === 'pdf' && i.content != null && i.content.length < 40))) || needV(i))).sort((a, b) => b.ts - a.ts).slice(0, 4);
      const batch = (await Promise.all(todo.map(async i => ({ id: i.id, image: await this.ocrImage(i) })))).filter(x => x.image);
      const skip = todo.filter(i => !batch.some(b => b.id === i.id)); if (skip.length) await upsert(skip.map(i => ({ ...byId(i.id), ocr: byId(i.id).ocr ?? '', ...(fileKind(i) === 'image' ? { vtags: [] } : {}) })), { sync: false });
      if (!batch.length) return;
      const r = await this.call('/ocr', { items: batch }, 180000), got = new Map((r.items || []).map(x => [x.id, x]));
      if ((r.items || []).length && !(r.items || []).some(x => Array.isArray(x.labels))) this._noLabels = true;
      await upsert(batch.map(b => { const x = got.get(b.id) || {}, i = byId(b.id);
        return { ...i, ocr: i.ocr ?? (x.text || '').slice(0, 3000), ...(Array.isArray(x.labels) && fileKind(i) === 'image' ? { vtags: cleanVtags(x.labels), ...(reV(i) ? { vrel: 1 } : {}) } : {}) }; }));
      DateAsk.after(batch.map(b => b.id));
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
  setOk(ok) { const ch = ok !== S.bridgeOk; S.bridgeOk = ok; this.dot(); if (ch) render(); if (ok) { this.kick(); this.pullInbox(); setTimeout(() => Reader.background(), 8000); setTimeout(() => this.ocrBackfill(), 20000); setTimeout(() => Voice.backfill(), 12000); setTimeout(() => Summ.run(), 45000); setTimeout(() => AIF.name(), 25000); this.pullImports(); if (ch) { Snapshot.schedule(); BridgeLink.publish(); RelayConf.publish(); } } },
  dot() {
    const n = S.items.filter(i => i.pending && !i.deleted).length;
    for (const d of document.querySelectorAll('.ai')) { d.classList.toggle('ok', S.bridgeOk && !S.aiBusy); d.classList.toggle('busy', S.aiBusy);
      if (d.id === 'settingsBtn') d.title = `Ayarlar · ${S.bridgeOk ? `${aiName()} bağlı${n ? `, ${n} kayıt sırada` : ''}` : `${aiName()} köprüsü kapalı`}${Cloud.on() ? ' · senkron açık' : ''}`; }
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
          const made = itemsFromInput({ text: e.text || '', files, ts: e.ts, source: e.source === 'web' ? 'web' : 'pc' });
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
    if (S.aiBusy || !S.bridgeOk || Date.now() < (this._limitTill || 0)) return;
    const hold = S.settings.importHold, pend = S.items.filter(i => i.pending && !i.deleted && !(hold && i.archive)).sort((a, b) => b.ts - a.ts);
    if (!pend.length) return;
    S.aiBusy = true; this.dot();
    try {
      const needMeta = pend.filter(i => i.type === 'link' && !i.meta).slice(0, 25);
      if (needMeta.length) {
        const m = await this.call('/meta', { urls: needMeta.map(i => i.url) }, 30000);
        await upsert(needMeta.map(i => ({ ...byId(i.id), meta: m[i.url] || { title: '' } })), { sync: false });
      }
      // 148: up to 60 a call (one system prompt for many), at most 6 pictures (each picture is ~1.6k tokens and a tool turn)
      let batch = [], pics = 0;
      for (const i of S.items.filter(i => i.pending && !i.deleted && !(hold && i.archive)).sort((a, b) => b.ts - a.ts)) {
        if (batch.length >= 60) break; const k = fileKind(i), pic = k === 'image' || (k === 'pdf' && (i.content == null || i.content.length < 40));
        if (pic && pics >= 6) continue; if (pic) pics++; batch.push(i);
      }
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
        return { ...i, pending: false, title: i.userTitle ? i.title : x.title, summary: x.summary, ...(typeof x.ocr === 'string' && b.image ? { ocr: x.ocr.slice(0, 3000) } : {}), ...(Array.isArray(x.labels) && b.image && fileKind(i) === 'image' ? { vtags: cleanVtags(x.labels) } : {}),
          tags: [...new Set([...(i.tags || []), ...(x.tags || []).map(t => t.toLowerCase().replace(/^#/, ''))])].slice(0, 6),
          related: [...new Set([...(i.related || []), ...(x.related || []).filter(id => ids.has(id) && id !== i.id)])],
          ...(x.todo?.text && !i.todo && !i.noTodo ? { todo: { text: x.todo.text, due: validDue(x.todo.due), done: false } } : {}),
          ...(i.todo && !i.todo.user && !i.todo.due && validDue(x.todo?.due) ? { todo: { ...i.todo, due: validDue(x.todo.due) } } : {}),
          ...(i.userLists ? {} : { lists: (x.lists || []).filter(k => LISTS.some(l => l[0] === k)), project: x.project ? x.project.toLowerCase().trim() : undefined }) };
      }));
      S.aiBusy = false; this.dot(); setTimeout(() => AICur.tour(batch.map(b => b.id), 'düzenledi'), 350); setTimeout(() => DateAsk.after(batch.filter(b => b.image).map(b => b.id)), 1500); // 120: after the board redrew
      if (S.items.some(i => i.pending && !i.deleted && !(S.settings.importHold && i.archive))) this.kick();
    } catch (e) {
      S.aiBusy = false; this.dot();
      if (e.message === 'limit') { this._limitTill = Date.now() + 30 * 60e3; if (!this._limitSaid) { this._limitSaid = true; toast('Bugünkü yapay zekâ sınırı doldu · kalanlar yarın düzenlenir (Ayarlar)', 6000, 'spark'); } return; } // 148
      console.warn('AI', e); this.health();
    }
  },
  pick(q, extra = []) {
    const toks = tokens(q), live = alive();
    const scored = live.map(i => [i, scoreItem(i, toks, true)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 50).map(x => x[0]);
    return [...new Map([...extra, ...scored, ...live.sort((a, b) => b.ts - a.ts).slice(0, 30)].map(i => [i.id, i])).values()];
  },
  async ask(q) {
    q = q.replace(/^\?\s*/, '').trim(); if (!q) return this.suggest();
    if (Plan.is(q)) return Plan.make(q); // 93: "… için pano hazırla"
    const box = $('#answer'); box.hidden = false; document.body.classList.add('answering');
    const head = `<div class="a-head">${ic('spark', 'sm')}<span>${aiName()}</span><span class="q">· ${esc(q)}</span><button data-copy title="Cevabı kopyala" style="margin-left:auto">${ic('copy', 'sm')}</button><button data-close title="Kapat" style="margin-left:0">${ic('x', 'sm')}</button></div>`;
    if (!S.bridgeOk && !(await this.health())) { box.innerHTML = head + `<div class="txt">${claudeOff()}</div>`; return; }
    box.innerHTML = head + '<div class="skel" style="width:90%"></div><div class="skel" style="width:75%"></div><div class="skel" style="width:55%"></div>';
    const tok = this._askTok = {};
    try {
      const r = await this.call('/ask', { question: q, items: this.pick(q) });
      if (this._askTok !== tok) return; // a newer question is on screen
      Parts.show(box, head, q, r);
    } catch (e) { if (this._askTok === tok) box.innerHTML = head + `<div class="txt" style="color:var(--danger)">Hata: ${esc(e.message)}</div>`; }
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

// ---------- 93: the AI makes a board ("poultrycare için pano hazırla") ----------
// The bridge gets the likely items and returns only ids in titled groups + a name and a short summary. Here the board is made: a new
// own board, a summary note at the top, one column per group under a title, the cards placed with posBy. One "Geri al" removes it all.
const Plan = {
  RE: /(pano|board|لوحة)\S*\s.*(hazırla|yap|oluştur|kur|aç|topla|make|build|create|أنشئ|اصنع|جهز)|(hazırla|oluştur|make|build|create|أنشئ|اصنع|جهز)\S*\s.*(pano|board|لوحة)|\S\s+(topla|toparla)\s*[.!]?$/i,
  is(q) { return this.RE.test(q); },
  topic: q => q.replace(/(?<!\p{L})(için|icin|hakkında|ile ilgili|ilgili|about|for|on|عن|حول|pano\p{L}*|board\p{L}*|لوحة|hazırla|yap|oluştur|kur|aç|topla|toparla|make|build|create|a|an|the|أنشئ|اصنع|جهز)(?!\p{L})/giu, ' ').replace(/\s+/g, ' ').trim(),
  name(n) {
    let v = String(n || '').toLocaleLowerCase('tr').replace(/[#/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30) || 'yeni pano';
    const have = new Set(boardNames()); if (!have.has(v)) return v;
    for (let k = 2; ; k++) if (!have.has(`${v} ${k}`)) return `${v} ${k}`;
  },
  async make(q, extra = []) {
    q = q.trim(); if (!q) return;
    if (!S.bridgeOk && !(await AI.health())) return toast(claudeOff(), 3200, 'cpu');
    const topic = this.topic(q) || q;
    toast(`${aiName()} pano hazırlıyor…`, 120000, 'spark');
    let r; try { r = await AI.call('/board-plan', { request: q, items: AI.pick(topic, extra.map(byId).filter(Boolean)).slice(0, 110), boards: boardNames() }); }
    catch (e) { return toast('Pano hazırlanamadı: ' + e.message, 3500, 'x'); }
    const seen = new Set(), groups = (Array.isArray(r?.groups) ? r.groups : []).slice(0, 6).map(g => ({ title: Parts.str(g?.title, 28),
      ids: Parts.ids(g?.ids).filter(id => !seen.has(id) && !byId(id).sticky && !hid(byId(id)) && seen.add(id)).slice(0, 12) })).filter(g => g.ids.length);
    if (!groups.length) return toast('Bu isteğe uyan kayıt bulamadım', 3500, 'search');
    closeAnswer(); const inp = $('#input'); if (inp.value.trim() === q) { inp.value = ''; inp.dispatchEvent(new Event('input')); }
    await this.build(this.name(r.name || topic), Parts.str(r.summary, 400), groups);
  },
  async build(name, summary, groups) {
    const t = now(), at = Date.now(), COL = Board.COLW + 56, before = new Map(), ch = [], made = [];
    const cur = byId('boards'), cols = groups.length;
    ch.push({ ...(cur || { id: 'boards', type: 'boards', tags: [], ts: t }), names: [...new Set([...(cur?.names || []), name])] });
    const sticky = (kind, text, pos, more = {}) => { const i = { id: newId(), type: 'note', text, sticky: kind, posBy: { [name]: pos }, posByAt: { [name]: at }, boards: [name], ts: t, createdAt: t, tags: [], pending: false, ...more }; made.push(i.id); ch.push(i); };
    if (summary) sticky('note', summary, { x: 0, y: 0 }, { color: 'yellow', w: Math.max(260, Math.min(cols, 2) * COL - 56) });
    const y0 = summary ? 190 : 0;
    groups.forEach((g, k) => {
      const x = k * COL; sticky('text', '## ' + g.title, { x, y: y0 }, { fs: 22 });
      let y = y0 + 56;
      for (const id of g.ids) {
        const i = byId(id); before.set(id, { boards: i.boards, posBy: i.posBy?.[name] });
        ch.push({ ...i, boards: [...new Set([...(i.boards || []), name])], posBy: { ...(i.posBy || {}), [name]: { x, y } }, posByAt: { ...(i.posByAt || {}), [name]: at } });
        y += Board.est(i) + 18;
      }
    });
    await upsert(ch);
    if (S.view !== 'board') setView('board');
    Board.go(name);
    if (innerWidth < 900) requestAnimationFrame(() => { S.cam = { k: .9, x: 16, y: 80 }; Board.apply(); }); // phone: start at the summary and the first group, not at the right end
    const ids = groups.flatMap(g => g.ids);
    setTimeout(() => AICur.tour(ids, 'yerleştirdi'), 450); // 120
    toast(`“${name}” panosu: ${ids.length} kayıt, ${groups.length} grup`, 8000, 'board', { label: 'Geri al', fn: () => this.undo(name, before, made, !(cur?.names || []).includes(name)) });
  },
  async undo(name, before, made, newName) {
    const t = now(), at = Date.now(), ch = made.map(id => byId(id)).filter(Boolean).map(i => ({ id: i.id, deleted: true, ts: i.ts, updatedAt: t }));
    for (const [id, b] of before) {
      const i = byId(id); if (!i) continue;
      const pb = { ...(i.posBy || {}) }; if (b.posBy) pb[name] = b.posBy; else delete pb[name];
      ch.push({ ...i, boards: b.boards, posBy: pb, posByAt: { ...(i.posByAt || {}), [name]: at } });
    }
    const cur = byId('boards'); if (newName && cur) ch.push({ ...cur, names: (cur.names || []).filter(n => n !== name) });
    await upsert(ch); if (S.board === name) Board.go('main');
    toast('Pano geri alındı', 2500, 'check');
  },
};

// ---------- 106e: rich AI answers (OpenUI idea, vanilla) ----------
// The bridge answer may carry parts from a fixed list; Parts.clean keeps only known types with sane sizes and real ids, anything else
// becomes plain text (or is dropped). 106s: a plain sentence first, at most a few parts, source line "Nts · N kayıt", no made-up values.
const Parts = {
  TYPES: new Set(['records', 'table', 'timeline', 'checklist', 'chart', 'actions', 'text']),
  str: (v, n = 200) => typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\s+/g, ' ').trim().slice(0, n) : '',
  ids: v => [...new Set((Array.isArray(v) ? v : []).filter(x => typeof x === 'string' && byId(x) && !byId(x).deleted))],
  clean(parts) {
    const out = [];
    for (const p of (Array.isArray(parts) ? parts : []).slice(0, 4)) {
      if (!p || typeof p !== 'object') continue;
      const title = this.str(p.title, 60), t = p.type;
      if (!this.TYPES.has(t)) { const x = this.str(p.text ?? p.content ?? p.title, 600); if (x) out.push({ type: 'text', text: x }); continue; } // unknown part → plain text
      if (t === 'text') { const x = this.str(p.text, 600); if (x) out.push({ type: 'text', text: x }); }
      else if (t === 'records') { const ids = this.ids(p.ids).slice(0, 8); if (ids.length) out.push({ type: t, title, ids }); }
      else if (t === 'table') {
        const cols = (Array.isArray(p.cols) ? p.cols : []).slice(0, 5).map(c => this.str(c, 40));
        const w = cols.length || 0, rows = (Array.isArray(p.rows) ? p.rows : []).filter(Array.isArray).slice(0, 12).map(r => r.slice(0, w || 5).map(c => this.str(c, 80)));
        if (rows.length && rows.some(r => r.some(Boolean))) out.push({ type: t, title, cols, rows });
      } else if (t === 'timeline' || t === 'checklist') {
        const rows = (Array.isArray(p.rows) ? p.rows : []).slice(0, 10).map(r => typeof r === 'string' ? { text: this.str(r) } : r && typeof r === 'object' ? { text: this.str(r.text, 160), date: this.str(r.date, 30), id: this.ids([r.id])[0], done: r.done === true } : null).filter(r => r?.text);
        if (rows.length) out.push({ type: t, title, rows });
      } else if (t === 'chart') {
        const L = Array.isArray(p.labels) ? p.labels : [], V = Array.isArray(p.values) ? p.values : [];
        const pts = L.slice(0, 24).map((l, k) => ({ l: this.str(l, 16), v: typeof V[k] === 'number' ? V[k] : Rich.num(V[k] ?? '') })).filter(x => x.l && isFinite(x.v));
        if (pts.length >= 2) out.push({ type: t, title, pts });
      } else if (t === 'actions') {
        const acts = (Array.isArray(p.acts) ? p.acts : []).slice(0, 2).map(a => a && ({ do: a.do, label: this.str(a.label, 30), ids: this.ids(a.ids), text: this.str(a.text, 160) }))
          .filter(a => a && (a.do === 'board' ? a.ids.length : a.do === 'todo' ? a.text : a.do === 'open' ? a.ids.length : false));
        if (acts.length) out.push({ type: t, acts });
      }
    }
    return out;
  },
  md: t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'),
  dt(i) { const d = fmtDay(dayKey(i.ts)), s = i.type === 'link' ? domain(i.url) : fileKind(i) === 'text' ? '' : (i.fileName || '').split('.').pop(); return [s, d].filter(Boolean).join(' · '); },
  card(i) {
    const k = fileKind(i) === 'text' ? 'note' : fileKind(i);
    return `<button class="ap-rec" data-open="${i.id}">${hasVisual(i) ? `<span class="ap-im" data-tid="${i.id}"></span>` : `<span class="ap-im ap-ic ${i.type}-c">${ic(k)}</span>`}<span class="ap-t" dir="auto">${esc(titleOf(i))}</span><small>${esc(this.dt(i))}</small></button>`;
  },
  html(p, n) {
    const h = p.title ? `<div class="ap-hd" dir="auto">${esc(p.title)}</div>` : '', st = ` style="--d:${n * 70}ms"`;
    if (p.type === 'text') return `<div class="ap txt"${st} dir="auto">${this.md(p.text)}</div>`;
    if (p.type === 'records') return `<div class="ap"${st}>${h}<div class="ap-recs">${p.ids.map(byId).map(i => this.card(i)).join('')}</div></div>`;
    if (p.type === 'table') {
      const w = Math.max(p.cols.length, ...p.rows.map(r => r.length)), num = k => p.rows.filter(r => r[k]).length && p.rows.every(r => !r[k] || !isNaN(Rich.num(r[k])));
      const cls = [...Array(w)].map((_, k) => k && num(k) ? ' class="num"' : '');
      const sum = r => /^(toplam|total|المجموع|الإجمالي)$/i.test(r[0] || '');
      return `<div class="ap"${st}>${h}<div class="ap-tw"><table class="ap-tb">${p.cols.length ? `<thead><tr>${p.cols.map((c, k) => `<th${cls[k]} dir="auto">${esc(c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${p.rows.map(r => `<tr${sum(r) ? ' class="sum"' : ''}>${[...Array(w)].map((_, k) => `<td${cls[k]} dir="auto">${esc(r[k] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    }
    if (p.type === 'timeline') return `<div class="ap"${st}>${h}<ol class="ap-tl">${p.rows.map(r => `<li${r.id ? ` data-open="${r.id}" tabindex="0"` : ''}><time dir="auto">${esc(r.date || (r.id ? fmtDay(dayKey(byId(r.id).ts)) : ''))}</time><span dir="auto">${esc(r.text)}</span></li>`).join('')}</ol></div>`;
    if (p.type === 'checklist') return `<div class="ap"${st}>${h}<div class="ap-ck">${p.rows.map((r, k) => { const it = r.id && byId(r.id), on = it?.todo ? !!it.todo.done : r.done;
      return `<label dir="auto"><input type="checkbox" data-apck="${k}"${it?.todo ? ` data-tid2="${it.id}"` : ''}${on ? ' checked' : ''}><span>${esc(r.text)}</span></label>`; }).join('')}</div></div>`;
    if (p.type === 'chart') return `<div class="ap"${st}>${Rich.chartHtml({ name: p.title, pts: p.pts })}</div>`;
    return '';
  },
  ACT: { plan: ['board', 'Pano yap'], board: ['board', 'Panoya koy'], todo: ['todo', 'Göreve çevir'], open: ['ext', 'Aç'], save: ['note', 'Not olarak kaydet'] },
  show(box, head, q, r) {
    const parts = this.clean(r.parts), src = this.ids(r.sources), acts = parts.filter(p => p.type === 'actions').flatMap(p => p.acts);
    // 106s one focus: the found items become cards only when the answer has no part of its own; otherwise they stay small source chips
    if (src.length >= 2 && !parts.some(p => p.type !== 'actions')) parts.unshift({ type: 'records', title: '', ids: src.slice(0, 6), auto: true });
    if (src.length >= 2 && !acts.some(a => a.do === 'board')) acts.unshift({ do: 'plan' }); // 93: build a board from this question
    acts.push({ do: 'save' });
    const next = (Array.isArray(r.next) ? r.next : []).map(x => this.str(x, 90)).filter(Boolean).slice(0, 3);
    this.cur = { q, answer: this.str(r.answer, 4000), parts, acts, src };
    const body = parts.filter(p => p.type !== 'actions'), shown = new Set(body.filter(p => p.type === 'records').flatMap(p => p.ids)), rest = src.filter(id => !shown.has(id)).slice(0, 12);
    box.innerHTML = head + `<div class="ap-who">${ic('spark', 'sm')}Nts · ${src.length} kayıt</div><div class="txt" dir="auto">${this.md(this.cur.answer)}</div>`
      + body.map((p, n) => this.html(p, n + 1)).join('')
      + (rest.length ? `<div class="src">${rest.map(byId).map(i => `<button class="src-btn" data-open="${i.id}"><span class="${i.type}-c">${ic(fileKind(i) === 'text' ? 'note' : fileKind(i), 'sm')}</span><span dir="auto">${esc(titleOf(i))}</span></button>`).join('')}</div>` : '')
      + `<div class="ap-acts">${acts.map((a, k) => { const [g, l] = this.ACT[a.do]; return `<button class="chip${k === 0 && a.do !== 'save' ? ' pri' : ''}" data-apact="${k}">${ic(g, 'sm')}${esc(a.label || l)}</button>`; }).join('')}</div>`
      + (next.length ? `<div class="ap-next">${next.map(x => `<button data-q="${esc(x)}" dir="auto">${ic('search', 'sm')}${esc(x)}</button>`).join('')}</div>` : '');
    box.querySelectorAll('.ap-im[data-tid]').forEach(el => thumbIO.observe(el));
  },
  text() { // the whole answer as Markdown: for copy and "Not olarak kaydet"
    const c = this.cur; if (!c) return '';
    const md = p => p.type === 'text' ? p.text : p.type === 'records' ? p.ids.map(byId).filter(Boolean).map(i => `- ${titleOf(i)}${i.url ? ' ' + i.url : ''}`).join('\n')
      : p.type === 'table' ? [p.cols.length ? p.cols : p.rows[0].map(() => ''), null, ...p.rows].map(r => r ? `| ${r.join(' | ')} |` : `|${(p.cols.length ? p.cols : p.rows[0]).map(() => ' --- ').join('|')}|`).join('\n')
      : p.type === 'timeline' ? p.rows.map(r => `- ${r.date ? r.date + ' — ' : ''}${r.text}`).join('\n')
      : p.type === 'checklist' ? p.rows.map(r => `- [${r.done ? 'x' : ' '}] ${r.text}`).join('\n')
      : p.type === 'chart' ? `| ${p.title || ''} | |\n| --- | --- |\n` + p.pts.map(x => `| ${x.l} | ${x.v} |`).join('\n') : '';
    return [`## ${c.q}`, c.answer, ...c.parts.filter(p => p.type !== 'actions' && !p.auto).map(p => (p.title ? `**${p.title}**\n` : '') + md(p))].filter(Boolean).join('\n\n');
  },
  async act(k) {
    const a = this.cur?.acts[k]; if (!a) return;
    if (a.do === 'open') return openItem(a.ids[0]);
    if (a.do === 'todo') return Todo.add([a.text]);
    if (a.do === 'plan') return Plan.make(this.cur.q, this.ids(this.cur.src));
    if (a.do === 'board') { const list = a.ids.map(byId).filter(Boolean); await upsert(list.map(i => ({ ...i, onBoard: true })));
      return toast(`${list.length} kayıt panoya kondu`, 3000, 'board', { label: 'Panoya git', fn: () => { closeAnswer(); S.board = 'main'; setView('board'); } }); }
    if (a.do === 'save') { const t = this.text(); const r = await addFromInput({ text: t, source: 'note' }); if (Array.isArray(r) && r[0]) toast('Cevap not olarak kaydedildi', 3000, 'note', { label: 'Aç', fn: () => openItem(r[0].id) }); }
  },
  async check(el) { // a ticked row: a real task flips its todo, a loose row only changes on screen
    const p = this.cur?.parts.find(x => x.type === 'checklist' && el.closest('.ap-ck')); const r = p?.rows[+el.dataset.apck]; if (r) r.done = el.checked;
    const id = el.dataset.tid2; if (id) await Todo.patch(id, c => { c.todo.done = el.checked; c.todo.doneAt = el.checked ? now() : undefined; });
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
const GH = { // old way: a private GitHub repo + token (kept under Advanced)
  repos() { return (S.settings.ghRepo || '').split(/[\s,]+/).filter(Boolean); },
  ready() { return !!(this.repos().length && S.settings.ghToken); },
  async gh(path, opt = {}, accept = 'application/vnd.github+json', repo = this.repos()[0]) {
    return fetch(`https://api.github.com/repos/${repo}${path}`, {
      cache: 'no-store', ...opt,
      headers: { authorization: 'Bearer ' + S.settings.ghToken, accept, 'x-github-api-version': '2022-11-28', ...(opt.headers || {}) },
    });
  },
  status(msg) { S.syncMsg = msg; const el = $('#syncMsg'); if (el) el.textContent = msg; }, // 110: only Sync.set calls this now
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
    this.busy = true; Sync.set({ phase: 'busy' });
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
      Sync.set({ phase: 'ok', at: now(), err: '' });
      this.checkSize().catch(() => { });
    } catch (e) { console.warn('sync', e); Sync.set({ phase: 'err', err: e.message }); }
    this.busy = false; Sync.count();
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
      url: i.url, file: i.fileName, sha: i.sha, summary: i.summary, tags: i.tags?.length ? i.tags : undefined, project: i.project, lists: i.lists?.length ? i.lists : undefined,
      todo: i.todo ? { text: i.todo.text, due: i.todo.due, done: !!i.todo.done } : undefined, starred: i.starred || undefined,
      highlights: i.highlights?.length ? i.highlights.map(h => h.text) : undefined }));
    try { await AI.call('/snapshot', { items, morning: Morning.at(), app: location.origin + location.pathname }, 20000); } /* app: where the PC quick box (156) opens a record */ catch (e) { console.warn('snapshot', e); }
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
      // 2) otherwise microlink.io (only the link address is sent); saved together at the end: one redraw, not one per link (147b2)
      const got = new Map();
      try { for (const i of todo) {
        if (S.bridgeOk) break; // the bridge does it (and Claude writes the summary)
        let meta = null, r;
        try { r = await fetch('https://api.microlink.io/?url=' + encodeURIComponent(i.url), { signal: AbortSignal.timeout(12000) }); } catch { break; }
        if (r.status === 429) break; // daily limit: try again later
        const j = await r.json().catch(() => ({}));
        if (j.status === 'success') { const d = j.data || {}; meta = { title: d.title || '', description: d.description || '', image: d.image?.url, logo: d.logo?.url, site: d.publisher }; }
        got.set(i.id, meta ? { meta } : { metaTry: now() });
      } } finally { const l = [...got].map(([id, x]) => byId(id) && { ...byId(id), ...x }).filter(Boolean); if (l.length) await upsert(l); }
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
  name() { return (this.s?.user?.name || '').split(/\s+/)[0]; }, // 144b: the Google first name for the user's cursor pill
  async load() { this.s = (await DB.get('kv', 'sb-session')) || null; },
  async keep(s) { this.s = s ? { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(now() / 1000) + (s.expires_in || 3600), user: { id: s.user?.id, email: s.user?.email, name: s.user?.user_metadata?.full_name || s.user?.user_metadata?.name || this.s?.user?.name || '' } } : null; this.s ? await DB.put('kv', this.s, 'sb-session') : await DB.del('kv', 'sb-session'); },
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
    Live.stop(); await this.keep(null); Sync.set({ phase: 'idle', err: '', at: 0, n: 0 });
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
    this.busy = true; Sync.set({ phase: 'busy' });
    try {
      await this.pull();
      if (await this.uploadFiles()) this.again = true;
      if (await this.push()) Live.ping();
      Sync.set({ phase: 'ok', at: now(), err: '' });
      (window.requestIdleCallback || setTimeout)(() => this.pullHeavy(), { timeout: 4000 }); // readable copies, PDF text, OCR: after, in the background
    } catch (e) { console.warn('cloud', e); Sync.set({ phase: 'err', err: e.message }); }
    this.busy = false; Sync.count();
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
  async markDirty(list, base) { await GH.markDirty([...new Set(list.map(i => monthOf(i.ts)))]); await Cloud.markDirty(list.map(i => i.id), base); this.count(); },
  // 110: ONE sync state, one place that shows it (the cloud button top right) and one sentence that explains it.
  // phase: idle (never ran) · busy · ok · err; n = changes on this device not yet sent; at = last good sync
  st: { phase: 'idle', err: '', at: 0, n: 0 },
  set(p) { Object.assign(this.st, p); this.paint(); },
  async count() { const n = Cloud.on() ? ((await DB.get('kv', 'sb-dirty')) || []).length : GH.ready() ? ((await DB.get('kv', 'dirty')) || []).length : 0; if (n !== this.st.n) this.set({ n }); },
  view() { // → { k: ok|busy|wait|off|err, t: short label, d: the sentence }
    const s = this.st, n = s.n, ch = `${n} değişiklik`, when = s.at ? new Date(s.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    if (!this.ready()) return null;
    if (!navigator.onLine) return { k: 'off', t: 'Çevrimdışı', d: n ? `İnternet yok. ${ch} bu cihazda güvende, bağlanınca kendiliğinden gider.` : 'İnternet yok. Yazdıkların bu cihazda güvende, bağlanınca gider.' };
    if (s.phase === 'busy') return { k: 'busy', t: 'Gönderiyor', d: n ? `${ch} gönderiliyor…` : 'Öteki cihazlarla eşitleniyor…' };
    if (s.phase === 'err') { const e = s.err || '', why = /40[13]|token|oturum|giriş/i.test(e) ? 'Oturumun düşmüş olabilir; Ayarlar\'dan yeniden Google ile gir.' : /GitHub/.test(e) ? e + '.' : /50\d|Failed to fetch|NetworkError|network|zaman/i.test(e) ? 'Sunucuya şu an ulaşılamıyor.' : e + '.';
      return { k: 'err', t: 'Sorun', d: `${why} Kayıtların bu cihazda güvende${n ? ` (${ch} bekliyor)` : ''}; biraz sonra kendiliğinden yeniden denenecek.` }; }
    if (n) return { k: 'wait', t: 'Sırada', d: `${ch} birazdan gönderilecek.` };
    if (s.phase === 'ok') return { k: 'ok', t: 'Eşit', d: `Her şey eşit: telefon ve bilgisayar aynı kayıtları görüyor.${when ? ` Son eşitleme ${when}.` : ''}` };
    return { k: 'busy', t: 'Bağlanıyor', d: 'İlk eşitleme bekleniyor…' };
  },
  paint() {
    const v = this.view(), b = $('#syncBtn');
    const msg = v ? (v.k === 'ok' ? `Eşit · ${new Date(this.st.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} · ${alive().length} kayıt${S.repoKB && !Cloud.on() ? ` · repo ${Math.round(S.repoKB / 1024)} MB` : ''}` : v.d) : '';
    GH.status(msg);
    if (b) { b.hidden = !v; if (v) { if (b.dataset.k !== v.k) { b.dataset.k = v.k; b.innerHTML = (v.k === 'busy' || v.k === 'wait' ? `<span class="sy-r">${ic('repeat')}</span>` : ic('cloud') + `<span class="sy-g" aria-hidden="true">${v.k === 'ok' ? ic('check', 'sm') : v.k === 'err' ? '!' : ''}</span>`) + '<span class="sy-n"></span>'; }
      b.querySelector('.sy-n').textContent = (v.k === 'off' || v.k === 'wait') && this.st.n ? (this.st.n > 99 ? '99+' : this.st.n) : '';
      b.title = b.ariaLabel = `Senkron: ${v.t}`; } }
    const p = $('#syncPop'); if (p && !p.hidden) this.pop(true);
  },
  pop(redraw) { // tap the cloud: what is happening, in one sentence, + Şimdi eşitle
    let p = $('#syncPop'); const b = $('#syncBtn'), v = this.view();
    if (!redraw && p && !p.hidden) { p.hidden = true; return; }
    if (!v) { if (p) p.hidden = true; return; }
    if (!p) { p = document.createElement('div'); p.id = 'syncPop'; p.className = 'pop sync-pop'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Senkron durumu'); document.body.appendChild(p);
      document.addEventListener('pointerdown', e => { if (!p.hidden && !e.target.closest('#syncPop,#syncBtn')) p.hidden = true; });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && !p.hidden) p.hidden = true; });
      p.addEventListener('click', e => { const d = e.target.closest('[data-sy]')?.dataset.sy; if (d === 'now') { this.set({ err: '' }); this.run(); } else if (d === 'set') { p.hidden = true; openSettings(); } }); }
    p.dataset.k = v.k;
    p.innerHTML = `<div class="sy-h"><span class="sy-dot"></span><b>${esc(v.t)}</b>${Cloud.on() ? `<small>${esc(Cloud.email())}</small>` : '<small>GitHub</small>'}</div><p class="sy-d" dir="auto">${esc(v.d)}</p>
      <div class="sy-a">${v.k === 'busy' || v.k === 'off' ? '' : `<button class="btn secondary sm" data-sy="now">${ic('repeat', 'sm')}Şimdi eşitle</button>`}<button class="btn ghost sm" data-sy="set">Ayarlar</button></div>`;
    if (!redraw) { const r = b.getBoundingClientRect(); p.hidden = false; p.style.top = r.bottom + 8 + 'px'; p.style.right = Math.max(8, innerWidth - r.right) + 'px'; p.style.left = 'auto'; }
  },
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
    zip = await (await needZip()).loadAsync(file);
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
  // 152: what is already in Nts (a link in any spelling, a file's bytes, a photo's fingerprint) is not made again: the old item
  // gets one more save ("WhatsApp'ta da var") and the conversation points at it
  await PH.load().catch(() => null);
  const ix = NtsDedup.index(S.items, PH.m), upd = new Map(), dupN = { link: 0, photo: 0, file: 0 };
  const fresh = new Set(), seenAgain = (old, it) => { if (fresh.has(old.id)) return; upd.set(old.id, NtsDedup.addSave(upd.get(old.id) || byId(old.id) || old, NtsDedup.saveOf(it))); };
  for (const g of groups) {
    const id = 'wa' + hash(chat + g[0].ts + g[0].text.slice(0, 60)); if (byId(id)) continue; // already imported
    const log = [], kids = [], have = [];
    for (const m of g) {
      let att = null, text = m.text;
      for (const re of WA_ATTACH) { const a = text.match(re); if (a) { att = a[1].trim(); text = text.slice(a[0].length).trim(); break; } }
      if (att) {
        const zf = zfiles.get(att), blob = zf ? await zf.async('blob') : null, kid = 'wf' + hash(id + att);
        const k = { id: kid, type: 'file', fileName: att, mime: blob?.type || mimeOf(att), size: blob?.size || 0, text, ts: m.ts, parent: id, archive: true, source: 'whatsapp', chat, tags: [], ...(blob ? { _blob: blob } : {}) };
        let old = null, dh = null;
        if (blob) {
          k.sha = await sha1Hex(blob); old = ix.sha(k.sha);
          if (!old && fileKind(k) === 'image' && typeof OffscreenCanvas !== 'undefined') { dh = await PH.of(blob).catch(() => null); old = ix.photo(dh); }
        }
        if (old) { seenAgain(old, k); have.push(old.id); dupN[fileKind(k) === 'image' ? 'photo' : 'file']++; log.push({ ts: m.ts, who: m.who, text, att: old.id }); continue; }
        kids.push(k); fresh.add(kid); ix.add(k, dh); if (dh) PH.m?.set(kid, dh);
        log.push({ ts: m.ts, who: m.who, text, att: kid });
      } else log.push({ ts: m.ts, who: m.who, text });
    }
    const all = [...kids, ...[...new Set(have)].map(x => byId(x) || out.find(o => o.id === x)).filter(Boolean)], photos = all.filter(k => fileKind(k) === 'image'), who = [...new Set(g.map(m => m.who))];
    const label = F_DMY.format(g[0].ts);
    const text = log.map(l => (who.length > 1 ? l.who + ': ' : '') + (l.att ? `[${byIdIn(all, l.att)?.fileName}] ` : '') + l.text).join('\n').trim();
    if (g.length === 1 && !kids.length && !have.length) { // a lone message stays a plain note/link
      const [it] = itemsFromInput({ text: g[0].text }); if (!it) continue;
      const one = { ...it, id, ts: g[0].ts, group: undefined, source: 'whatsapp', chat, archive: true, tags: [] };
      const old = one.type === 'link' && ix.url(one.url);
      if (old) { seenAgain(old, one); dupN.link++; continue; }
      ix.add(one); fresh.add(one.id); out.push(one); continue;
    }
    out.push({ id, type: 'note', title: `${label} · ${g.length} mesaj`, text, ts: g[0].ts, source: 'whatsapp', chat, archive: true, tags: [],
      conv: { n: g.length, who, end: g.at(-1).ts, log, kids: [...new Set([...kids.map(k => k.id), ...have])] }, ...(photos[0] ? { cover: photos[0].id } : {}) });
    out.push(...kids);
  }
  if (upd.size) await upsert([...upd.values()], { sync: true, quiet: true });
  if (PH.m?.size) DB.put('kv', Object.fromEntries(PH.m), 'ph').catch(() => null);
  const dupTxt = [dupN.link && dupN.link + ' link', dupN.photo && dupN.photo + ' foto', dupN.file && dupN.file + ' dosya'].filter(Boolean).join(', ');
  if (!out.length) return toast(dupTxt ? `Hepsi zaten içeride · Zaten Nts'te: ${dupTxt}` : 'Hepsi zaten içeride', 4000, 'check');
  const all = []; // 147c: files are written 200 at a time (progress shows), the list is merged and redrawn ONCE at the end
  for (let k = 0; k < out.length; k += 200) {
    all.push(...await saveItems(out.slice(k, k + 200)));
    if (out.length > 200) toast(`İçeri alınıyor… ${Math.min(k + 200, out.length)}/${out.length}`, 60000);
  }
  await upsert(all.map(i => i.parent ? { ...i, pending: false } : i), { sync: false }); // Claude organizes the conversation, not each photo
  const nConv = out.filter(i => !i.parent).length;
  if (nConv >= 100 && !S.settings.importHold) { S.settings.importHold = true; await DB.put('kv', S.settings, 'settings'); } // 148: a big chat waits for a yes
  toast(`${live.length} mesaj → ${nConv} kayıt içeri alındı (Arşiv)${dupTxt ? ` · Zaten Nts'te: ${dupTxt}` : ''}${S.bridgeOk && !S.settings.importHold ? ' · ' + aiName() + ' düzenliyor' : ''}`, 5000, 'check');
  Sync.schedule(); if (S.settings.importHold) setTimeout(() => AI.holdAsk(), 5200); else AI.kick();
}
const byIdIn = (list, id) => list.find(x => x.id === id);
function mimeOf(n) {
  const e = n.split('.').pop().toLowerCase();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', '3gp': 'video/3gpp',
    opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', pdf: 'application/pdf', txt: 'text/plain' })[e] || '';
}

// ---------- 152: Ayarlar → Kopyaları birleştir ----------
// Finds copies (dedup.js: same link in any spelling, same bytes, near-same photo), shows the list and the count first; one tap
// merges each group into the item that stays (yours over an archive one; tags, note, board place come along) and puts the
// copies in the trash. "Geri al" brings everything back as it was.
const Dups = {
  async scan(say) {
    const files = S.items.filter(i => !i.deleted && i.type === 'file' && !i.sha && !i.parent);
    for (let k = 0; k < files.length; k++) { // a fingerprint for files saved before 152 (only those on this device)
      const rec = await DB.get('files', files[k].id).catch(() => null); if (!rec?.blob) continue;
      const sha = await sha1Hex(rec.blob); if (sha) { const c = byId(files[k].id); if (c) c.sha = sha; this.shaUpd.set(c.id, c); }
      if (k % 40 === 0) say?.(`Dosyalar taranıyor… ${k}/${files.length}`);
    }
    await PH.load().catch(() => null);
    return NtsDedup.groups(S.items, PH.m);
  },
  shaUpd: new Map(),
  open() { openSettings('dups'); },
  page: head => `${head('Kopyaları birleştir', true)}<div class="set-sec"><p class="hint" id="dupMsg" aria-live="polite">Aranıyor…</p><div id="dupList" class="dup-list"></div></div>`,
  run() { const say = t => { const el = $('#dupMsg'); if (el) el.textContent = t; }; this.scan(say).then(gs => this.show(gs)).catch(e => say('Hata: ' + e.message)); },
  show(gs) {
    const msg = $('#dupMsg'), box = $('#dupList'); if (!msg || !box) return;
    if (this.shaUpd.size) { upsert([...this.shaUpd.values()], { quiet: true }); this.shaUpd.clear(); }
    const n = gs.reduce((a, g) => a + g.ids.length - 1, 0), by = k => gs.filter(g => g.kind === k).reduce((a, g) => a + g.ids.length - 1, 0);
    if (!n) { msg.textContent = 'Kopya yok: her link, dosya ve foto bir kez kayıtlı.'; box.innerHTML = ''; return; }
    msg.innerHTML = `<b>${n} kopya</b> bulundu (${[by('link') && by('link') + ' link', by('file') && by('file') + ' dosya', by('photo') && by('photo') + ' benzer foto'].filter(Boolean).join(', ')}). Birleşince etiketler, not ve pano yeri kalan kayda geçer; kopyalar çöp kutusuna gider.`;
    box.innerHTML = gs.slice(0, 60).map(g => { const [k, ...c] = g.ids.map(byId); return `<div class="dup-row">${ic(g.kind === 'link' ? 'link' : g.kind === 'photo' ? 'image' : 'file', 'sm')}<span><b>${esc(titleOf(k))}</b><small>${c.length + 1} kez · ilk ${esc(fmtDay(dayKey(Math.min(k.ts, ...c.map(x => x.ts)))))}${g.kind === 'photo' ? ' · benzer foto' : ''}</small></span></div>`; }).join('')
      + (gs.length > 60 ? `<p class="hint">…ve ${gs.length - 60} grup daha</p>` : '')
      + `<button class="btn primary" data-dupgo>${ic('check', 'sm')}${n} kopyayı birleştir</button>`;
    box.querySelector('[data-dupgo]').onclick = () => this.go(gs);
  },
  async go(gs) {
    const before = [], upd = [];
    for (const g of gs) {
      const [k, ...c] = g.ids.map(byId).filter(Boolean); if (!k || !c.length) continue;
      before.push({ ...k }, ...c.map(x => ({ ...x })));
      const r = NtsDedup.merge(k, c, now()); upd.push(r.keep, ...r.gone);
    }
    for (let k = 0; k < upd.length; k += 500) await upsert(upd.slice(k, k + 500));
    const n = upd.filter(i => i.dupOf).length;
    $('#menu').close();
    toast(`${n} kopya birleştirildi`, 8000, 'check', { label: 'Geri al', fn: async () => { for (let k = 0; k < before.length; k += 500) await upsert(before.slice(k, k + 500).map(i => ({ ...i, deleted: i.deleted || false, deletedAt: i.deletedAt }))); toast('Geri alındı', 1800, 'check'); } });
  },
};

// ---------- 107d: Ayarlar → Kayıtları taşı → Başka uygulamadan taşı ----------
// Google Keep, Apple Notes, Notion, Evernote, Telegram. migrate.js reads each export; here: open the zip (and a Notion Part-N.zip
// inside it), a preview first (how many notes / photos / links, which tags they become, what is already in Nts), then one tap makes
// the items: a note's photos/files become their own items in the same group, a short note that is only a link becomes a link,
// Telegram "Kaydedilen Mesajlar" stays one item per save (an album = one). Ids come from the source, so importing twice adds nothing;
// links, files and photos already in Nts are skipped (dedup.js, 152). Like WhatsApp: into the Archive by default, "Geri al" undoes it.
const Mig = {
  APPS: [['keep', 'note', 'Google Keep', 'takeout.google.com → yalnız Keep → zip'], ['apple', 'note', 'Apple Notes', 'Notlar\'ı HTML olarak dışa aktar (ör. Exporter) → klasörü zip yap'],
    ['notion', 'layers', 'Notion', 'Ayarlar → Dışa aktar → Markdown & CSV → zip'], ['evernote', 'book', 'Evernote', 'Defter → Dışa aktar → .enex'],
    ['telegram', 'chat', 'Telegram', 'Masaüstü: Kaydedilen Mesajlar → ⋮ → Sohbeti dışa aktar → JSON (klasörü zip yap)']],
  st: null, arch: true,
  icon: k => Mig.APPS.find(a => a[0] === k)?.[1] || 'inbox',
  // a dropped zip: WhatsApp's (a chat .txt) or another app's export?
  async other(f) { const z = await (await needZip()).loadAsync(f), ps = Object.keys(z.files); return !ps.some(p => /\.txt$/i.test(p)) && !!NtsMigrate.detect(ps); },
  open() { this.st = null; openSettings('mig'); },
  page(head) {
    const s = this.st;
    if (!s) return `${head('Başka uygulamadan taşı', true)}
      <p class="hint mig-hint">Dışa aktardığın dosyayı seç; önce ne geleceğini gösteririm, sonra tek dokunuşla içeri alırım. Aynı şey iki kez gelmez.</p>
      <div class="set-sec mig-apps">${this.APPS.map(([k, icn, n, how]) => `<div class="set-row static">${ic(icn)}<span>${n}<small>${how}</small></span></div>`).join('')}</div>
      <button class="btn primary mig-go" data-migpick>${ic('upload', 'sm')}Dosya seç</button>
      <p class="hint mig-hint" id="migMsg" aria-live="polite">.zip, .json, .enex, .html ya da .md · birden çok dosya seçebilirsin</p>`;
    const N = s.counts, span = s.from && s.to ? `${F_DMY.format(s.from)} – ${F_DMY.format(s.to)}` : '';
    const parts = [N.note && N.note + ' not', N.link && N.link + ' link', N.photo && N.photo + ' foto', N.file && N.file + ' dosya'].filter(Boolean).join(' · ');
    const tags = [...s.tagN].sort((a, b) => b[1] - a[1]);
    return `${head(NtsMigrate.NAMES[s.kind] + { keep: '\'ten', apple: '\'tan', notion: '\'dan', evernote: '\'tan', telegram: '\'dan' }[s.kind] + ' taşı', true)}
      <div class="set-sec mig-sum">${s.make.length ? `<p class="mig-big"><b>${s.make.length} kayıt</b> gelecek</p><p class="hint">${parts}${span ? ' · ' + span : ''}</p>
        ${s.dup ? `<p class="hint">${s.dup} tanesi zaten Nts'te, tekrar eklenmez.</p>` : ''}` : `<p class="mig-big">${ic('check', 'sm')}<b>Hepsi zaten Nts'te</b></p><p class="hint">${s.dup} kayıt daha önce alınmış; yeni bir şey yok.</p>`}
        ${s.miss ? `<p class="hint">${s.miss} ek dosya dışa aktarımda yok (yalnız yazısı gelir).</p>` : ''}</div>
      ${tags.length ? `<div class="set-sec"><h4>Gruplar → etiket</h4><div class="mig-tags">${tags.slice(0, 14).map(([t, n]) => `<span class="mig-tag">#${esc(t)} <small>${n}</small></span>`).join('')}${tags.length > 14 ? `<span class="mig-tag"><small>+${tags.length - 14}</small></span>` : ''}</div></div>` : ''}
      <div class="set-sec"><h4>Örnek</h4><div class="dup-list">${s.make.filter(i => !i._kid).slice(0, 5).map(i => `<div class="dup-row">${ic(i.type === 'link' ? 'link' : i.type === 'file' ? (/^image\//.test(i.mime) ? 'image' : 'file') : 'note', 'sm')}<span><b>${esc(i.title || (i.type === 'file' && i.text) || i.fileName || (i.text || '').split('\n')[0] || i.url || 'Kayıt')}</b><small>${esc(shortDay(dayKey(i.ts)))}${(i.tags || []).length ? ' · #' + esc(i.tags.join(' #')) : ''}${i.text && i.title ? ' · ' + esc(i.text.slice(0, 60)) : ''}</small></span></div>`).join('')}</div></div>
      <div class="set-sec"><label class="set-line"><span>Arşive koy<small>Ana sayfayı ve panoyu doldurmaz; sol çubukta Kaynak → ${NtsMigrate.NAMES[s.kind]}</small></span><span class="switch"><input type="checkbox" data-migarch ${this.arch ? 'checked' : ''}><span></span></span></label></div>
      <div class="mig-btns"><button class="btn primary" data-miggo ${s.make.length ? '' : 'disabled'}>${ic('check', 'sm')}${s.make.length ? s.make.length + ' kaydı içe aktar' : 'Yeni kayıt yok'}</button><button class="btn secondary" data-migpick>Başka dosya</button></div>`;
  },
  bind(m) {
    m.querySelectorAll('[data-migpick]').forEach(b => b.onclick = () => $('#migInput').click());
    const a = m.querySelector('[data-migarch]'); if (a) a.onchange = () => { this.arch = a.checked; };
    const g = m.querySelector('[data-miggo]'); if (g) g.onclick = () => { g.disabled = true; this.go().catch(e => toast('Hata: ' + e.message)); };
  },
  // every file of what was picked: zips opened (one zip inside a zip too: Notion's Part-1.zip), plain files as they are
  async entries(files) {
    const out = [], add = async (f, pre = '') => {
      if (/\.zip$/i.test(f.name)) {
        const z = await (await needZip()).loadAsync(f);
        for (const e of Object.values(z.files)) {
          if (e.dir || /(^|\/)(__MACOSX|\.DS_Store)/.test(e.name)) continue;
          if (/\.zip$/i.test(e.name) && !pre) { const b = await e.async('blob'); await add(Object.assign(b, { name: e.name }), e.name + '/'); continue; }
          out.push({ path: pre + e.name, date: +e.date || 0, text: () => e.async('string'), blob: () => e.async('blob') });
        }
      } else out.push({ path: pre + f.name, date: f.lastModified || 0, text: () => f.text(), blob: async () => f });
    };
    for (const f of files) await add(f);
    return out;
  },
  async read(files) {
    const say = t => { const el = $('#migMsg'); if (el) el.textContent = t; else toast(t, 60000); };
    say('Okunuyor…');
    const ents = await this.entries(files), paths = ents.map(e => e.path);
    const js = ents.find(e => /\.json$/i.test(e.path)), peek = js ? (await js.text()).slice(0, 4000) : '';
    const kind = NtsMigrate.detect(paths, peek);
    if (!kind) { say('Bu dosyayı tanıyamadım: Keep (zip/json), Apple Notes (html), Notion (md/zip), Evernote (.enex) ya da Telegram (result.json) olmalı'); return; }
    const byPath = new Map(ents.map(e => [e.path, e])), byName = new Map(ents.map(e => [e.path.split('/').pop(), e]));
    const find = p => byPath.get(p) || [...byPath.keys()].find(k => k.endsWith('/' + p)) && byPath.get([...byPath.keys()].find(k => k.endsWith('/' + p))) || byName.get(p.split('/').pop());
    let notes = [];
    if (kind === 'telegram') {
      const r = ents.find(e => /(^|\/)result\.json$/i.test(e.path)) || js, tg = NtsMigrate.telegram(await r.text());
      if (!tg?.msgs.length) { say('Bu Telegram dosyasında mesaj yok'); return; }
      const root = r.path.split('/').slice(0, -1).join('/');
      notes = NtsMigrate.tgGroups(tg.msgs).map(g => ({ key: 'tg:' + tg.name + g[0].id, title: '', text: g.map(m => m.text).filter(Boolean).join('\n'), ts: g[0].ts, tags: [], chat: tg.name,
        who: g[0].who && !tg.saved ? g[0].who : '', atts: g.filter(m => m.att).map(m => ({ ...m.att, path: (root ? root + '/' : '') + m.att.path })) }));
    } else {
      let k = 0;
      for (const e of ents) {
        if (kind === 'keep' && /\.json$/i.test(e.path)) { const n = NtsMigrate.keep(await e.text(), e.path); if (n) notes.push(n); }
        else if (kind === 'apple' && /\.html?$/i.test(e.path)) { const n = NtsMigrate.apple(await e.text(), e.path, e.date); if (n) notes.push(n); }
        else if (kind === 'notion' && /\.md$/i.test(e.path)) { const n = NtsMigrate.notion(await e.text(), e.path, e.date); if (n) notes.push(n); }
        else if (kind === 'evernote' && /\.enex$/i.test(e.path)) notes.push(...NtsMigrate.enex(await e.text(), e.path));
        if (++k % 100 === 0) say(`Okunuyor… ${k}/${ents.length}`);
      }
    }
    if (!notes.length) { say('Dosyada not bulunamadı'); return; }
    await PH.load().catch(() => null);
    const ix = NtsDedup.index(S.items, PH.m), make = [], counts = { note: 0, link: 0, photo: 0, file: 0 }, tagN = new Map();
    const hash = t => { let h = 2166136261; for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    let dup = 0, miss = 0, from = 0, to = 0;
    for (const n of notes) {
      const id = 'mg' + hash(kind + n.key), ts = n.ts || now();
      if (byId(id)) { dup++; continue; } // imported before
      const base = { ts, createdAt: now(), source: kind, tags: n.tags || [], group: id, ...(n.starred ? { starred: true } : {}), ...(n.chat ? { chat: n.chat } : {}) };
      const kids = [];
      for (const [k, a] of (n.atts || []).entries()) {
        let blob = null;
        if (a.b64) { try { const bin = atob(a.b64), u = new Uint8Array(bin.length); for (let x = 0; x < bin.length; x++) u[x] = bin.charCodeAt(x); blob = new Blob([u], { type: a.mime }); } catch { } }
        else { const e = find(a.path); if (e) blob = await e.blob(); }
        if (!blob?.size) { miss++; continue; }
        const f = { ...base, id: id + 'f' + k, type: 'file', fileName: a.name, mime: a.mime || blob.type || mimeOf(a.name), size: blob.size, text: '', _blob: blob, _kid: true };
        f.sha = await sha1Hex(blob); if (ix.sha(f.sha)) { dup++; continue; }
        ix.add(f); kids.push(f);
      }
      const body = [n.text, n.url && !(n.text || '').includes(n.url) ? n.url : ''].filter(Boolean).join('\n').trim();
      const urls = body.match(URL_RE) || [], rest = urls.reduce((t, u) => t.split(u).join(''), body).trim();
      let main = null;
      if (urls.length === 1 && rest.length < 280 && !kids.length) { // a saved link (+ a line about it) is a link
        if (ix.url(urls[0])) { dup++; continue; }
        main = { ...base, id, type: 'link', url: urls[0], title: n.title || n.urlTitle || undefined, text: rest };
      } else if (kids.length && !n.title && body && body.length < 280 && !urls.length) kids[0].text = body, delete kids[0]._kid; // a photo + its caption = one save
      else if (body || n.title && !kids.length) main = { ...base, id, type: 'note', title: n.title || undefined, text: body };
      else if (kids[0]) { kids[0].text = n.title || ''; delete kids[0]._kid; }
      if (n.who && main) main.text = n.who + ': ' + main.text;
      if (main && kids.length && n.title) kids.forEach(k => k.text ||= n.title);
      for (const it of [main, ...kids].filter(Boolean)) {
        make.push(it); counts[it.type === 'link' ? 'link' : it.type === 'note' ? 'note' : /^image\//.test(it.mime) ? 'photo' : 'file']++;
        if (it === main || !main && it === kids[0]) { (it.tags || []).forEach(t => tagN.set(t, (tagN.get(t) || 0) + 1)); from = from ? Math.min(from, ts) : ts; to = Math.max(to, ts); }
      }
    }
    this.st = { kind, make, counts, tagN, dup, miss, from, to };
    openSettings('mig');
  },
  async go() {
    const s = this.st; if (!s?.make.length) return;
    const list = s.make.map(({ _kid, ...i }) => ({ ...i, archive: this.arch || undefined, seenAt: this.arch ? i.ts : undefined }));
    const all = [];
    for (let k = 0; k < list.length; k += 200) {
      all.push(...await saveItems(list.slice(k, k + 200)));
      if (list.length > 200) toast(`İçeri alınıyor… ${Math.min(k + 200, list.length)}/${list.length}`, 60000);
    }
    await upsert(all.map(i => i.type === 'file' && i.group !== i.id && all.some(x => x.id === i.group) ? { ...i, pending: false } : i), { sync: false });
    if (all.length >= 100 && !S.settings.importHold) { S.settings.importHold = true; await DB.put('kv', S.settings, 'settings'); } // 148: a big import waits for a yes
    const kind = s.kind, ids = all.map(i => i.id); this.st = null;
    $('#menu').close();
    toast(`${NtsMigrate.NAMES[kind]}: ${all.length} kayıt içeri alındı${this.arch ? ' (Arşiv)' : ''}`, 8000, 'check', [
      { label: 'Göster', fn: () => { Object.assign(S.filter, { type: 'all', tag: null, star: false, list: null, color: null, src: kind }); if (!['list', 'gallery'].includes(S.view)) setView('list'); render(); } },
      { label: 'Geri al', fn: async () => { await upsert(ids.map(byId).filter(Boolean).map(i => ({ ...i, deleted: true, deletedAt: now() }))); toast('Geri alındı', 1800, 'check'); } }]);
    Sync.schedule(); if (S.settings.importHold) setTimeout(() => AI.holdAsk(), 8200); else AI.kick();
  },
};

// ---------- backup ----------
async function exportBackup() {
  toast('Yedek hazırlanıyor…', 60000);
  const zip = new (await needZip())(); zip.file('items.json', JSON.stringify(S.items));
  for (const f of await DB.all('files')) zip.file('files/' + f.id, f.blob);
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hizli-not-${dayKey(now())}.zip`; a.click();
  toast('Yedek indirildi', 2600, 'check');
}
// Markdown zip + Obsidian folder sync + board PDF: export.js (107j)
// browser bookmarks (Chrome / Firefox / Safari "export bookmarks" = Netscape HTML): each link becomes an item, folder → topic
async function importBookmarks(file) {
  const doc = new DOMParser().parseFromString(await file.text(), 'text/html');
  const uk = NtsDedup.urlKey, have = new Set(S.items.filter(i => i.type === 'link' && !i.deleted).map(i => uk(i.url))); // 152: same key as everywhere
  const skipFolder = /^(bookmarks bar|bookmarks toolbar|yer işareti çubuğu|yer imleri çubuğu|other bookmarks|diğer yer işaretleri|diğer yer imleri|mobile bookmarks|menu|bookmarks menu)$/i;
  const made = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    const url = a.getAttribute('href'); if (!/^https?:\/\//i.test(url) || have.has(uk(url))) continue;
    have.add(uk(url));
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
  const zip = await (await needZip()).loadAsync(file);
  const items = JSON.parse(await zip.file('items.json').async('string'));
  const local = new Map(S.items.map(i => [i.id, i]));
  const take = items.filter(x => !local.has(x.id) || (x.updatedAt || 0) > (local.get(x.id).updatedAt || 0));
  for (const x of take) { const f = zip.file('files/' + x.id); if (f) await DB.put('files', { id: x.id, blob: await f.async('blob') }); }
  await upsert(take); toast(`${take.length} kayıt geri yüklendi`, 2600, 'check');
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
      if (typeof Bio !== 'undefined') Bio.offer(f, key => { Crypt.key = key; el.hidden = true; el.innerHTML = ''; resolve(); }); // 107l
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
  async disable() { this.conf = null; await DB.del('kv', 'lock'); await DB.del('kv', 'lock-bio'); Crypt.key = null; await this.reupload(); },
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
    await clip(text);
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
async function copyText(t) { try { await clip(t); toast('Kopyalandı', 1800, 'check'); } catch { toast('Kopyalanamadı'); } }
// 112: the async clipboard can be missing or refused (no permission, not focused, http) → the old selection copy still works
async function clip(t) {
  try { await navigator.clipboard.writeText(t); return; } catch { }
  const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  (document.querySelector('dialog[open]') || document.body).append(a); a.select();
  const ok = document.execCommand('copy'); a.remove(); if (!ok) throw new Error('copy');
}

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
    } catch (e) { console.warn('repo', e); Sync.set({ phase: 'err', err: 'GitHub: ' + e.message }); } finally { this.busy = false; }
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
// 107k: on the phone the filter chip ends before the view switch, whatever the text size / touch size (label gets "…")
function fitHud() {
  const b = $('#filterBtn'), l = $('#filterLbl'), c = document.querySelector('.hud-c'); if (!b || !l || !c) return;
  l.style.maxWidth = ''; if (!b.offsetWidth) return;
  const over = b.getBoundingClientRect().right + 8 - c.getBoundingClientRect().left;
  if (over > 0) l.style.maxWidth = Math.max(24, l.offsetWidth - over) + 'px';
}
addEventListener('resize', () => requestAnimationFrame(fitHud));
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('hn-theme', t); } catch { }
  const bg = getComputedStyle(document.body).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.content = bg);
  AICur.mine();
}
// 121: glass look. Stored per device (hn-glass = 1/0); off on slow phones, without backdrop-filter, or with "reduce transparency"
const Glass = {
  slow() {
    const n = navigator, mm = q => { try { return matchMedia(q).matches; } catch { return false; } };
    if (mm('(prefers-reduced-transparency: reduce)')) return 'Sistem saydamlığı azalt açık';
    if (!(CSS.supports?.('backdrop-filter', 'blur(1px)') || CSS.supports?.('-webkit-backdrop-filter', 'blur(1px)'))) return 'Bu tarayıcı desteklemiyor';
    if (onPhone() && ((n.deviceMemory || 8) <= 3 || (n.hardwareConcurrency || 8) <= 4)) return 'Bu telefon yavaş, düz görünüm kalır';
    return '';
  },
  want() { try { return localStorage.getItem('hn-glass') === '1'; } catch { return false; } },
  on() { return document.documentElement.hasAttribute('data-glass'); },
  apply() { const slow = !!this.slow(); document.documentElement.toggleAttribute('data-glass', this.want() && !slow); document.documentElement.toggleAttribute('data-gslow', slow); }, // data-gslow: the folder glass (131-1) turns solid too
  set(v) { try { localStorage.setItem('hn-glass', v ? '1' : '0'); } catch { } this.apply(); },
  // two tiny previews (Düz / Cam); data-look="0|1"
  pick() {
    const no = this.slow(), g = this.want() && !no, b = (v, l, s) => `<button type="button" data-look="${v}" aria-pressed="${g === !!v}"${v && no ? ' disabled' : ''}><span class="lk-art${v ? ' glass' : ''}"><i></i><i></i><i></i><b></b></span><span>${l} <small>${s}</small></span></button>`;
    return `<div class="look-pick" role="group" aria-label="Görünüm">${b(0, 'Düz', 'sade, hızlı')}${b(1, 'Cam', 'buzlu, saydam')}</div>${no ? `<p class="look-note">Cam kapalı: ${no}.</p>` : ''}`;
  },
};
// 107k: accessibility, per device (hn-a11y = {fs 0-3, hc, big, rm}); index.html applies it before the first paint
const A11y = {
  SIZES: [['Normal', '100%'], ['Büyük', '112%'], ['Daha büyük', '125%'], ['En büyük', '140%']],
  get() { try { return JSON.parse(localStorage.getItem('hn-a11y')) || {}; } catch { return {}; } },
  apply(c = this.get()) {
    const r = document.documentElement;
    if (c.fs > 0) r.dataset.fs = c.fs; else delete r.dataset.fs;
    r.toggleAttribute('data-hc', !!c.hc); r.toggleAttribute('data-big', !!c.big); r.toggleAttribute('data-rm', !!c.rm);
  },
  set(ch) { const c = { ...this.get(), ...ch }; try { localStorage.setItem('hn-a11y', JSON.stringify(c)); } catch { } this.apply(c); },
  sysRm() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } },
  sw(k, label, note, on, dis) { return `<button class="set-row" role="switch" data-a11y="${k}" aria-checked="${on}"${dis ? ' disabled' : ''}><span>${label}<small>${note}</small></span><i class="a11y-sw" aria-hidden="true"></i></button>`; },
  page(head) {
    const c = this.get(), fs = c.fs || 0, sys = this.sysRm();
    return `${head('Erişilebilirlik', true)}
    <div class="set-sec"><h4>Yazı boyutu</h4>
      <div class="a11y-fs" role="radiogroup" aria-label="Yazı boyutu">${this.SIZES.map(([l, p], k) => `<button type="button" role="radio" data-a11yfs="${k}" aria-checked="${fs === k}" aria-pressed="${fs === k}"><b style="font-size:${[14, 16, 18, 20][k]}px">Aa</b><small>${l}</small></button>`).join('')}</div>
      <div class="a11y-prev" dir="auto">Yarın 9'da annemi ara<small>Kayıtlar, menüler ve pencereler büyür; pano kartları aynı kalır (panoda yakınlaştır).</small></div>
    </div>
    <div class="set-sec">
      ${this.sw('hc', 'Yüksek kontrast', 'Daha koyu yazı, belirgin çizgiler ve odak halkası', !!c.hc)}
      ${this.sw('big', 'Büyük dokunma alanları', `Düğmeler ve satırlar en az ${onPhone() ? 48 : 44} px`, !!c.big)}
      ${this.sw('rm', 'Hareketi azalt', sys ? 'Cihazın ayarında açık, Nts de hareketsiz' : 'Geçişler ve kayan animasyonlar kapanır', sys || !!c.rm, sys)}
      <p class="hint">Bu ayarlar yalnız bu cihazda.</p>
    </div>`;
  },
};
const ACCENTS = [['orange', 'Turuncu', '#c2410c', '#ff9a4d'], ['indigo', 'Çivit', '#4f5fd6', '#8b9cff'], ['green', 'Yeşil', '#15803d', '#5fd68a'],
  ['blue', 'Mavi', '#0b6bcb', '#6cb6ff'], ['pink', 'Pembe', '#c2255c', '#ff85b0'], ['teal', 'Turkuaz', '#0f766e', '#4fd1c5']];
function setAccent(a) {
  const r = document.documentElement;
  if (a?.startsWith('#')) { r.dataset.accent = 'custom'; r.style.setProperty('--accent', a); r.style.setProperty('--accent-soft', `color-mix(in srgb, ${a} 14%, transparent)`); r.style.setProperty('--accent-text', contrastText(a)); }
  else { ['--accent', '--accent-soft', '--accent-text'].forEach(k => r.style.removeProperty(k)); if (a && a !== 'orange') r.dataset.accent = a; else delete r.dataset.accent; }
  try { localStorage.setItem('hn-accent', a || ''); } catch { }
  AICur.mine();
}
const contrastText = hex => { const n = parseInt(hex.slice(1), 16), l = (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255; return l > .6 ? '#0c0c0e' : '#fff'; };
const onPhone = () => /Android|iPhone|iPad/.test(navigator.userAgent);
const BRIDGE_CMD = 'systemctl --user start hizli-note-bridge';
// one plain sentence for "Claude is off", depending on the device
const claudeOff = () => onPhone() ? 'Bilgisayar kapalı ya da köprü çalışmıyor.' : '' + aiName() + ' bağlı değil: bilgisayardaki Nts köprüsü kapalı. Ayarlar → ' + aiName() + '.';
function claudeBlock() {
  const n = S.items.filter(i => i.pending && !i.deleted && !(S.settings.importHold && i.archive)).length; // 148: held imports are not "in the queue"
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
  const gBtn = `<button class="btn primary g-btn" data-do="signin">${G_SVG}Google ile giriş yap</button>`;
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
      <div class="set-line look-line"><span>Yüzeyler</span></div>${Glass.pick()}
      <div class="set-line d-only"><span>Pano imleci</span><div class="seg sm"><button data-mycur="0" class="${S.settings.myCursor ? '' : 'on'}" aria-pressed="${!S.settings.myCursor}">Sistem</button><button data-mycur="1" class="${S.settings.myCursor ? 'on' : ''}" aria-pressed="${!!S.settings.myCursor}">${curSvg('currentColor', 14)}Nts</button></div></div>
      <div class="set-line f-set"><span>Klasör stili</span><div class="seg sm">${Folders.STYLES.map(([k, l]) => `<button data-fstyle="${k}" class="${Folders.style() === k ? 'on' : ''}" aria-pressed="${Folders.style() === k}">${l}</button>`).join('')}</div></div>
      ${AIF.on() ? `<button class="set-row" data-fregroup>${ic('spark')}<span>Anlam klasörlerini yeniden grupla<small>${AIF.list.length} klasör, kayıtlarına bakarak cihazında gruplanır; adları ${aiName()} verir</small></span></button>` : ''}
      ${(Folders.cfg().hide || []).length ? `<button class="set-row" data-fshow>${ic('eye')}<span>Gizli klasörleri geri getir (${Folders.cfg().hide.length})<small>${esc(Folders.cfg().hide.map(k => Folders.label(k)).slice(0, 4).join(', '))}</small></span></button>` : ''}
      <button class="set-row" data-do="a11y">${ic('eye')}<span>Erişilebilirlik<small>Yazı boyutu, yüksek kontrast, büyük dokunma, hareketi azalt</small></span>${ic('chev', 'sm')}</button>
      ${S.installEvt ? `<button class="set-row" data-do="install">${ic('install')}<span>Uygulamayı yükle<small>Ana ekrana ekle, Paylaş menüsünde çıksın</small></span></button>` : ''}
    </div>
    <div class="set-sec"><h4>Yapay zekâ</h4>
      <button class="set-row" data-do="aipick">${ic('spark')}<span>Kullanılan: ${aiName()}<small>Claude, Codex ya da Gemini: kayıtları düzenleyen ve soruları cevaplayan</small></span>${ic('chev', 'sm')}</button>
      <div class="set-line tok-line"><span>Token harcaması<small id="tokMsg">${S.bridgeOk ? 'ölçülüyor…' : 'Köprü kapalıyken ölçülmez'}</small></span><div class="seg sm" role="group" aria-label="Günlük sınır">${[[200000, '200 bin'], [1000000, '1 milyon'], [0, 'Sınırsız']].map(([v, l]) => `<button data-tokcap="${v}" aria-pressed="false">${l}</button>`).join('')}</div></div>
      ${AI.held().length ? `<button class="set-row" data-do="imphold">${ic('spark')}<span>${AI.held().length} içe aktarılan kayıt bekliyor<small>Düzenlemek ~${kTok(AI.estTok(AI.held()))} token tutar · başlat</small></span>${ic('chev', 'sm')}</button>` : ''}
      <button class="set-row" data-do="sem">${ic('search')}<span>Anlamsal arama: ${Sem.on() ? 'açık' : 'kapalı'}<small id="semMsg">${esc(Sem.say())}</small></span></button>
      <div id="claudeBox">${claudeBlock()}</div>
    </div>
    <div class="set-sec">
      <div class="set-line morn-line"><span>Sabah özeti<small>Dünkü kayıtlar + bugünün görevleri, günde bir kez</small></span><div class="seg sm"><button data-morn="off" class="${Morning.at() ? '' : 'on'}" aria-pressed="${!Morning.at()}">Kapalı</button><label class="m-at${Morning.at() ? ' on' : ''}"><input type="time" id="mornAt" aria-label="Sabah özeti saati" value="${esc(Morning.at() || '08:00')}"></label></div></div>
      <button class="set-row" data-do="morning">${ic('sun')}<span>Sabah özetini şimdi göster<small>${Morning.at() ? `Her gün ${esc(Morning.at())}'den sonra ilk açılışta${onPhone() ? '; yüklü uygulamada kapalıyken bildirim' : '; bilgisayarda köprü bildirir'}` : 'Kapalı'}</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="cmdk">${ic('search')}<span>Komut paleti<small>Her şey tek yerden: görünüm, pano, etiket, kayıt${onPhone() ? '' : ' · <kbd>Ctrl</kbd> <kbd>K</kbd>'}</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row d-only" data-do="keys">${ic('kbd')}<span>Klavye kısayolları<small>Her yerde <kbd>?</kbd> tuşu da açar</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="tour">${ic('spark')}<span>Nasıl kullanılır?<small>6 adımlık kısa tur</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="lists">${ic('flag')}<span>Listeler<small>${aiOf()} doldurduğu listelerin adı ve görünürlüğü</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="move">${ic('upload')}<span>Kayıtları taşı<small>WhatsApp, Keep, Notion, Evernote… içe aktar, yedek indir, geri yükle</small></span>${ic('chev', 'sm')}</button>
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
      <button class="set-row" data-do="obsidian">${ic('layers')}<span>Obsidian klasörüyle eşitle<small>Bilgisayarda bir klasör: her kayıt bir .md, değişince güncellenir${ObsVault.on() ? ' · açık' : ''}</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="exportmd">${ic('note')}<span>Markdown olarak indir<small>Obsidian ve benzerleri için: her kayıt bir .md, dosyalar attachments/ içinde</small></span></button>
      <button class="set-row" data-do="export">${ic('down')}<span>Yedek indir<small>Her şeyi tek dosya olarak indir${locked ? ' (şifreli)' : ''}</small></span></button>
      <button class="set-row" data-do="import">${ic('upload')}<span>Yedekten geri yükle</span></button>
      <button class="set-row" data-do="dups">${ic('copy')}<span>Kopyaları birleştir<small>Aynı link, aynı dosya ya da aynı foto birden çok kayıtsa tek kayıt olur; hiçbir şey silinmez</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="mig">${ic('layers')}<span>Başka uygulamadan taşı<small>Google Keep, Apple Notes, Notion, Evernote, Telegram · önce ne geleceğini gösterir</small></span>${ic('chev', 'sm')}</button>
      <button class="set-row" data-do="bookmarks">${ic('star')}<span>Tarayıcı yer imlerini içe aktar<small>Chrome/Firefox: Yer imleri → Dışa aktar (HTML). Klasörler konu olur, aynı link iki kez eklenmez.</small></span></button>
    </div>`;
  const listsPage = `${head('Listeler', true)}
    <p class="hint">${aiName()} her kaydı uygun listeye koyar. Bir kaydı elle taşırsan ${aiName()} o kayda dokunmaz. Yapılacaklar her zaman açık.</p>
    <div class="set-sec">${LISTS.map(([k, icn, def]) => `<div class="set-line">${ic(icn)}<input class="list-name" data-lname="${k}" value="${esc(listName(k))}" placeholder="${def}" aria-label="${def} adı">
      <label class="switch" title="Sol çubukta göster"><input type="checkbox" data-lshow="${k}" ${listHidden(k) ? '' : 'checked'}><span></span></label></div>`).join('')}</div>`;
  const wasOpen = m.open;
  if (wasOpen) saveSettings(); // keep what was typed before redrawing
  m.innerHTML = `<div class="d-body" tabindex="-1">${page === 'move' ? move : page === 'mig' ? Mig.page(head) : page === 'obsidian' ? ObsVault.page(head) : page === 'a11y' ? A11y.page(head) : page === 'lists' ? listsPage : page === 'dups' ? Dups.page(head) : main}</div>`;
  if (page === 'dups') Dups.run();
  if (page === 'mig') Mig.bind(m); // 107d
  if (page === 'obsidian') ObsVault.bind(m); // 107j
  const setList = (k, ch) => { st.lists = { ...(st.lists || {}) }; st.lists[k] = { ...(st.lists[k] || {}), ...ch }; DB.put('kv', S.settings, 'settings'); render(); };
  if (page === 'main') AI.usage().then(u => { // 148: this month's AI spend, measured by the bridge
    const msg = m.querySelector('#tokMsg'); if (!msg || !u) return;
    msg.textContent = `Bu ay ~${kTok(u.month)} · bugün ~${kTok(u.today)}${u.saved ? ` · ~${kTok(u.saved)} tasarruf` : ''}${u.cap ? ` · günlük sınır ${kTok(u.cap)}` : ''}`;
    m.querySelectorAll('[data-tokcap]').forEach(b => { const on = +b.dataset.tokcap === (u.cap || 0); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  });
  const ma = m.querySelector('#mornAt'); if (ma) ma.onchange = () => { if (/^\d\d:\d\d$/.test(ma.value)) Morning.set(ma.value).then(() => { Remind.ask(); openSettings(); }); }; // 95b
  const pick = m.querySelector('#accentPick'); if (pick) { pick.oninput = () => setAccent(pick.value); pick.onchange = () => openSettings(); }
  m.querySelectorAll('[data-lname]').forEach(el => el.onchange = () => setList(el.dataset.lname, { name: el.value.trim() || undefined }));
  m.querySelectorAll('[data-lshow]').forEach(el => el.onchange = () => setList(el.dataset.lshow, { hidden: !el.checked }));
  m.onclick = async e => {
    const d = e.target.closest('[data-do]')?.dataset.do, acc = e.target.closest('[data-accent]')?.dataset.accent;
    if (e.target === m || e.target.closest('[data-act="close"]')) return m.close();
    if (acc) { setAccent(acc); return openSettings(); }
    const af = e.target.closest('[data-a11yfs]'); if (af) { A11y.set({ fs: +af.dataset.a11yfs }); render(); fitHud(); return openSettings('a11y'); } // 107k
    const at = e.target.closest('[data-a11y]'); if (at && !at.disabled) { const k = at.dataset.a11y; A11y.set({ [k]: !A11y.get()[k] }); fitHud(); return openSettings('a11y'); }
    const lk = e.target.closest('[data-look]'); if (lk) { Glass.set(lk.dataset.look === '1'); return openSettings(); }
    if (e.target.closest('[data-morn="off"]')) { Morning.set('').then(openSettings); return; } // 95b
    const mc = e.target.closest('[data-mycur]'); if (mc) { S.settings.myCursor = mc.dataset.mycur === '1'; DB.put('kv', S.settings, 'settings').then(() => { AICur.mine(); openSettings(); }); return; }
    const tc = e.target.closest('[data-tokcap]'); if (tc) { try { await AI.call('/usage-conf', { cap: +tc.dataset.tokcap }, 8000); AI._limitTill = 0; AI._limitSaid = false; AI.kick(); } catch { toast(claudeOff(), 3000, 'cpu'); } return openSettings(); } // 148
    const fs = e.target.closest('[data-fstyle]'); if (fs) { Folders.set(c => c.style = fs.dataset.fstyle).then(openSettings); return; }
    if (e.target.closest('[data-fregroup]')) { AIF.ask(true); toast('Klasörler yeniden gruplanıyor…', 2500, 'spark'); return; }
    if (e.target.closest('[data-fshow]')) { Folders.set(c => c.hide = []).then(openSettings); return; }
    if (!d) return;
    if (d === 'wa') $('#waInput').click();
    else if (d === 'move') openSettings('move');
    else if (d === 'a11y') openSettings('a11y');
    else if (d === 'dups') Dups.open();
    else if (d === 'mig') Mig.open();
    else if (d === 'imphold') { await AI.holdGo(); toast(`${aiName()} içe aktarılanları düzenliyor`, 2500, 'spark'); openSettings(); } // 148
    else if (d === 'lists') openSettings('lists');
    else if (d === 'aipick') { m.close(); setTimeout(() => AiPick.open(() => openSettings()), 250); }
    else if (d === 'tour') { m.close(); setTimeout(() => Tour.start(), 250); }
    else if (d === 'cmdk') { m.close(); setTimeout(() => Cmd.open(), 250); }
    else if (d === 'morning') { m.close(); Remind.ask(); setTimeout(() => Morning.open(), 250); }
    else if (d === 'keys') { m.close(); setTimeout(() => Native.keysOpen(), 250); }
    else if (d === 'back') openSettings(page === 'mig' || page === 'obsidian' ? 'move' : 'main');
    else if (d === 'import') $('#backupInput').click();
    else if (d === 'bookmarks') $('#bmInput').click();
    else if (d === 'export') { m.close(); exportBackup(); }
    else if (d === 'wipe') { m.close(); setTimeout(() => Wipe.open(), 250); }
    else if (d === 'exportmd') { m.close(); exportMarkdown(); }
    else if (d === 'obsidian') openSettings('obsidian');
    else if (d === 'organize') { m.close(); if (await AI.health()) { AI.process(); toast('' + aiName() + ' düzenliyor', 2000, 'spark'); } else toast(claudeOff(), 3000, 'cpu'); }
    else if (d === 'tags') { m.close(); AI.cleanTags(); }
    else if (d === 'light' || d === 'dark') { setTheme(d); openSettings(); }
    else if (d === 'install') { S.installEvt.prompt(); S.installEvt = null; }
    else if (d === 'ghconnect') { if (await Repo.connect()) openSettings(); }
    else if (d === 'lockform') { const f = $('#lockForm'); f.hidden = !f.hidden; if (!f.hidden) $('#set-pass').focus(); }
    else if (d === 'copycmd') { try { await clip(BRIDGE_CMD); toast('Kopyalandı. Terminale yapıştır.', 2200, 'check'); } catch { toast(BRIDGE_CMD, 5000); } }
    else if (d === 'test') {
      await saveSettings(); const msg = $('#bridgeMsg'); if (msg) msg.textContent = 'Bağlanıyor…';
      const ok = await AI.health();
      if (ok) $('#claudeBox').innerHTML = claudeBlock(); else if ($('#bridgeMsg')) $('#bridgeMsg').textContent = onPhone() ? 'Ulaşılamadı. Bilgisayar açık ve köprü çalışıyor mu? İki cihazda aynı Google hesabı olmalı.' : 'Hâlâ kapalı. Komutu çalıştırdın mı?';
    }
    else if (d === 'sync') { await saveSettings(); Sync.run(); }
    else if (d === 'sem') { Sem.on() && Sem.st !== 'err' ? Sem.disable() : Sem.enable(); openSettings(); }
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
  for (const [id, icn] of [['#clipIco', 'plus'], ['#micIco', 'mic'], ['#setIco', 'settings']]) $(id).innerHTML = ic(icn, 'sm');
  try { S.mode = localStorage.getItem('hn-mode') || 'note'; } catch { S.mode = 'note'; } // 103b: the last mode is remembered
  if (!MODES.some(x => x[0] === S.mode)) S.mode = 'note';
  renderModes(); updateSend(); addEventListener('resize', updateSend);
  $('#modes').onclick = e => { if (!e.target.closest('.m-b')) return; setMode(nextMode()); if (matchMedia('(hover: hover)').matches) $('#input').focus(); }; // 136: a tap = next mode (phone: no keyboard pops up)
  $('#saveBtn').onclick = submitBox;
  new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', $('#composer').offsetHeight + 'px')).observe($('#composer'));
  { const dk = $('#composer').closest('.dock'); if (dk) new ResizeObserver(() => document.documentElement.style.setProperty('--dock-full', dk.offsetHeight + 'px')).observe(dk); } // 101: the toast sits above the open search list / answer
  new ResizeObserver(() => { const w = $('#boardTools').offsetWidth; if (w) document.documentElement.style.setProperty('--bt-w', w + 'px'); }).observe($('#boardTools'));
  { const mb = $('#micBtn'); // 95a: Not → voice note (hold, or tap / tap); Ara → search by voice
    mb.addEventListener('pointerdown', e => { if (!Voice.here() && !Voice.on) return; if (e.button) return; e.preventDefault();
      if (Voice.on) { Voice.dn = 0; return Voice.stop(); } Voice.dn = performance.now(); try { mb.setPointerCapture(e.pointerId); } catch { } Voice.start(); }); // capture: the box grows (time row) under the finger
    const up = () => { if (Voice.dn && Voice.on && performance.now() - Voice.dn > 450) Voice.stop(); Voice.dn = 0; };
    mb.addEventListener('pointerup', up); mb.addEventListener('lostpointercapture', up);
    mb.addEventListener('contextmenu', e => { if (Voice.here()) e.preventDefault(); });
    mb.onclick = e => { if (Voice.here() || Voice.on) { if (!e.detail) Voice.on ? Voice.stop() : Voice.start(); return; } Mic.toggle(); }; // keyboard: Enter/Space toggles
    addEventListener('keydown', e => { if (e.key === 'Escape' && Voice.on) { e.preventDefault(); e.stopPropagation(); Voice.stop(true); } }, true); }
  $('#cHint').onclick = e => { if (e.target.closest('[data-vx]')) return Voice.stop(true); const m = e.target.closest('[data-mic]'); if (m) return Mic.setLang(m.dataset.mic); const b = e.target.closest('[data-mode]'); if (b) { setMode(b.dataset.mode); $('#input').focus(); } };
  const inp = $('#input');
  // one box: typing filters the list live, Enter saves, a question (ends with ?) goes to Claude
  let st, rt;
  inp.addEventListener('input', e => {
    if (/^insert(Text|CompositionText)$/.test(e.inputType || '') && S.mode === 'note' && !S.attach.length && (inp.value === '/' || inp.value === '?')) { // 118: "/" Ara, "?" Sor
      const m = inp.value === '/' ? 'find' : 'ask'; inp.value = ''; setMode(m);
    }
    autoGrow(); clearTimeout(st); S.hitSel = -1; S.hitsOff = false;
    st = setTimeout(() => { S.q = inp.value.length < 200 ? inp.value : ''; S.searchOn = findMode() && !!S.q.trim(); if (findMode()) S.limit = 100; runSearch(); /* 147: in Not the list keeps its length (60→300 redrew 240 rows on the first key) */ /* 104g: a live search draws 100 rows (scrolling adds 300), so a redraw per key stays small */ updateSend(); render(); }, findMode() || !inp.value.trim() ? 80 : S.items.length > 2000 ? 320 : 120); // 147: in Not the "N benzer kayıt" chip waits for a pause (scoring 10k items each key was 20–80 ms)
    clearTimeout(rt); rt = setTimeout(() => { if (findMode() && S.hits?.size && S.q.trim()) Recent.add(S.q); }, 2500); // 104e: a search that rested with results is remembered
  });
  let sugT;
  inp.addEventListener('focus', () => { document.body.classList.add('typing'); clearTimeout(sugT); S.sugOn = true; if (!document.querySelector('dialog[open]') && (S.hitsOff || (findMode() && !S.q.trim()))) { S.hitsOff = false; renderHits(); } });
  inp.addEventListener('blur', () => { document.body.classList.remove('typing'); clearTimeout(sugT); sugT = setTimeout(() => { if (document.activeElement === inp || $('#hits').contains(document.activeElement)) return; S.sugOn = false; S.qHelp = false; if (!S.q.trim()) renderHits(); }, 150); });
  inp.addEventListener('keydown', e => {
    const rows = $('#hits').classList.contains('hits') && !$('#hits').hidden ? [...$('#hits').querySelectorAll('.h-row')] : [];
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {
      e.preventDefault();
      S.hitSel = Math.max(-1, Math.min(rows.length - 1, (S.hitSel ?? -1) + (e.key === 'ArrowDown' ? 1 : -1)));
      renderHits(); $('#hits .h-row.sel')?.scrollIntoView({ block: 'nearest' }); return;
    }
    if (e.key === 'Enter' && !e.shiftKey && S.hitSel >= 0 && rows[S.hitSel]) { e.preventDefault(); const id = rows[S.hitSel].dataset.open; S.hitSel = -1; if (!ImgFind.on()) { Recent.add(S.q); Learn.add(S.q, id); } openItem(id); return; }
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && findMode() && Suggest.cur && Suggest.of(inp.value)) { e.preventDefault(); Suggest.cur = Suggest.of(inp.value); Suggest.pick(0); return; } // 104e
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitBox(); }
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); setMode(nextMode(e.shiftKey ? -1 : 1)); } // 136: Tab / Shift+Tab always change the mode here; Esc leaves the box
    if (e.key === 'Escape') { if (S.mode !== 'note' && !inp.value) setMode('note'); clearBox(); inp.blur(); }
  });
  const clip = $('#fileInput').closest('label'); clip.tabIndex = 0; clip.setAttribute('role', 'button'); clip.setAttribute('aria-label', 'Dosya ekle'); // 109c: reachable by keyboard
  clip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); } });
  $('#fileInput').onchange = e => { const fs = [...e.target.files]; if (findMode() && fs.length === 1 && ImgFind.isImg(fs[0])) { e.target.value = ''; return ImgFind.run(fs[0]); } // 105f
    if (findMode()) setMode('note'); S.attach.push(...e.target.files); e.target.value = ''; renderAttach(); };
  $('#attachList').onclick = e => { const b = e.target.closest('[data-rm]'); if (b) { S.attach.splice(+b.dataset.rm, 1); renderAttach(); } };
  // paste anywhere: files become attachments, text goes into the composer
  const ownField = el => el?.closest?.('dialog,[contenteditable="true"],[contenteditable="plaintext-only"]') || (el?.closest?.('input,textarea') && el !== inp); // 109c: a sticky note, an item window or another field keeps its own paste/drop
  document.addEventListener('paste', e => {
    if (ownField(e.target)) return;
    const fs = [...(e.clipboardData?.files || [])];
    if (fs.length === 1 && findMode() && ImgFind.isImg(fs[0])) { e.preventDefault(); ImgFind.run(fs[0]); return; } // 105f: a screenshot pasted in Ara searches with it
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
    if (e.key === '/') { e.preventDefault(); if (!findMode()) setMode('find'); inp.focus(); }
    else if (e.key === 'n' && S.view !== 'board') { e.preventDefault(); inp.focus(); }
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
    if (fs.length && fs.every(f => /\.(enex)$/i.test(f.name))) { Mig.read(fs).catch(err => toast('Hata: ' + err.message)); return; } // 107d
    if (fs.length === 1 && /\.zip$/i.test(fs[0].name)) { Mig.other(fs[0]).then(o => o ? Mig.read(fs) : importWhatsApp(fs[0])).catch(err => toast('Hata: ' + err.message)); return; }
    if (fs.length === 1 && findMode() && ImgFind.isImg(fs[0])) return ImgFind.run(fs[0]); // 105f
    if (fs.length) { S.attach.push(...fs); renderAttach(); Motion.fly(e.clientX, e.clientY, [...$('#attachList').children].slice(-fs.length)); } // 142 m4-B
    else { const t = e.dataTransfer.getData('text'); if (t) { inp.value = (inp.value ? inp.value + '\n' : '') + t; autoGrow(); } }
  });

  $('#answer').addEventListener('change', e => { if (e.target.matches('[data-apck]')) Parts.check(e.target); });
  $('#answer').addEventListener('keydown', e => { const o = e.key === 'Enter' && e.target.closest('li[data-open]'); if (o) openItem(o.dataset.open); });
  $('#answer').onclick = e => {
    const o = e.target.closest('[data-open]'); if (o) return openItem(o.dataset.open);
    const q = e.target.closest('[data-q]'); if (q) { inp.value = q.dataset.q; AI.ask(q.dataset.q); return; }
    const pa = e.target.closest('[data-apact]'); if (pa) return Parts.act(+pa.dataset.apact);
    const bar = e.target.closest('.r-chart [data-rich="bar"]'); if (bar) return Rich.chartTip(bar, +bar.dataset.k);
    if (e.target.closest('[data-copy]')) return copyText(Parts.cur && $('#answer .ap-who') ? Parts.text() : $('#answer .txt')?.innerText || '');
    if (e.target.closest('[data-close]')) closeAnswer();
  };
  $('#hits').onclick = e => {
    if (e.target.closest('[data-clear]')) { clearBox(); return inp.focus(); }
    const nx = e.target.closest('[data-nlx]'); if (nx) { dropChip(+nx.dataset.nlx); return inp.focus(); }
    const dy = e.target.closest('[data-dym]'); if (dy) { // 105c: the fixed words replace the typed ones, the chips stay
      const v = S.nl ? (S.nl.chips.map(c => S.q.trim().slice(c.a, c.b)).join(' ') + ' ' + dy.dataset.dym).trim() : dy.dataset.dym;
      inp.value = v; S.q = v; S.searchOn = true; S.hitSel = -1; runSearch(); autoGrow(); render(); return inp.focus();
    }
    if (e.target.closest('[data-semon]')) { Sem.enable(); renderHits(); return inp.focus(); }
    if (e.target.closest('[data-aifind]')) { aiFind(); return inp.focus(); }
    if (e.target.closest('[data-all]')) { S.cam = null; return hideHits(); } // the page is already filtered: just put the window away
    if (e.target.closest('[data-lpin]')) return Saved.save();
    const m = e.target.closest('[data-mode]'); if (m) { setMode(m.dataset.mode); return inp.focus(); }
    const ft = e.target.closest('[data-ftype]'); if (ft) { Object.assign(S.filter, { type: ft.dataset.ftype, star: false, list: null }); render(); return inp.focus(); }
    const fg = e.target.closest('[data-ftag]'); if (fg) { S.filter.tag = S.filter.tag === fg.dataset.ftag ? null : fg.dataset.ftag; render(); return inp.focus(); }
    const ac = e.target.closest('[data-ac]'); if (ac) return Suggest.pick(+ac.dataset.ac);
    if (e.target.closest('[data-qhelp]')) { S.qHelp = !S.qHelp; S.hitsOff = false; renderHits(); return inp.focus(); }
    const qx = e.target.closest('[data-qex]'); if (qx) { // 104e: an example / recent search / topic goes into the box
      const v = qx.dataset.qex, end = /:$/.test(v); inp.value = v + (end ? '' : ' '); S.q = inp.value; S.searchOn = true; S.hitSel = -1; S.hitsOff = false;
      if (!end) S.qHelp = false; runSearch(); autoGrow(); render(); inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); return;
    }
    if (e.target.closest('[data-qclr]')) { Recent.clear(); renderHits(); return inp.focus(); }
    if (e.target.closest('[data-aians]')) return aiAnswer(); // 105b
    const sv = e.target.closest('[data-saved]'); if (sv) return Saved.apply(sv.dataset.saved);
    const o = e.target.closest('[data-open]'); if (o) { if (!ImgFind.on()) { Recent.add(S.q); Learn.add(S.q, o.dataset.open); } openItem(o.dataset.open); }
  };
  $('#hits').addEventListener('pointerdown', e => { if (e.target.closest('button') && e.pointerType === 'mouse') e.preventDefault(); }); // the box keeps the focus

  const onFilter = e => {
    const b = e.target.closest('button'); if (!b) return; const f = S.filter;
    if (b.dataset.view) { setView(b.dataset.view); return; }
    if ('readq' in b.dataset) { Pop.close(); Read.queue(); return; }
    if ('trash' in b.dataset) { Pop.close(); Trash.open(); return; }
    if ('clean' in b.dataset) { Pop.close(); Clean.open(); return; }
    if ('tidy' in b.dataset) { Pop.close(); Tidy.open(); return; }
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
    else if (b.dataset.unf) f[b.dataset.unf] = null; // 137: the rail's filter button takes it off
    else if (b.dataset.saved) return Saved.apply(b.dataset.saved);
    else if (b.dataset.unsave) return Saved.remove(b.dataset.unsave);
    else if ('sortprio' in b.dataset) { S.sortPrio = !S.sortPrio; try { localStorage.setItem('hn-sortprio', S.sortPrio ? '1' : ''); } catch { } }
    else return;
    S.limit = 300; S.listFrom = null; S.cam = null; Pop.close(); render(); scrollTo({ top: 0, behavior: 'smooth' });
  };
  for (const id of ['#viewSwitch', '#rail', '#railTab', '#popTypes', '#popLists', '#sideTags', '#sideProjects', '#sideMarks', '#popSaved', '#popSrc']) $(id).onclick = onFilter;
  Scrub.init();
  Rail.init();
  ViewHide.init();
  Underlap.init();
  try { S.sortPrio = !!localStorage.getItem('hn-sortprio'); } catch { }
  Ctx.init(); OnBoard.init(); Sel.init(); Rel.init(); Peek.init(); Read.init(); Remind.init(); Morning.init();
  Todo.init();
  Pop.init();
  for (const id of ['#list', '#gallery', '#topics', '#empty']) $(id).addEventListener('click', e => {
    if ((id === '#list' || id === '#gallery') && Folders.click(e)) return;
    if (id === '#gallery' && Sel.click(e)) return;
    const a = e.target.closest('.act'); if (a) { e.stopPropagation(); return itemAction(a.dataset.a, a.closest('[data-id]').dataset.id); }
    if (e.target.closest('[data-ljump]')) return monthJump(e.target.closest('[data-ljump]'));
    if (e.target.closest('[data-lpin]')) return Saved.save();
    const od = e.target.closest('[data-otd]'); if (od) return showFrom(dayEnd(od.dataset.otd));
    if (e.target.closest('[data-otdx]')) { try { localStorage.setItem('hn-otd-hide', dayKey(now())); } catch { } return render(true); }
    if (e.target.closest('[data-lnow]')) { S.listFrom = null; S.limit = 300; render(); return scrollTo(0, 0); }
    const dd = e.target.closest('[data-do]'); if (dd) { if (dd.dataset.do === 'unfilter') { if (S.folder) return Folders.close(); Object.assign(S.filter, { type: 'all', tag: null, star: false, list: null, color: null, src: null }); return render(); } if (dd.dataset.do === 'sample') return Sample.add(); if (dd.dataset.do === 'wa') $('#waInput').click(); else openSettings(); return; }
    const th = e.target.closest('.topic-head');
    if (th) { const t = th.dataset.tag; S.filter.tag = t === '(etiketsiz)' ? null : t; setView('list'); scrollTo(0, 0); return; }
    const it = e.target.closest('[data-id]'); if (it) openItem(it.dataset.id);
  });

  $('#settingsBtn').onclick = openSettings;
  $('#syncBtn').onclick = e => { e.stopPropagation(); Sync.pop(); };
  addEventListener('offline', () => Sync.paint());
  $('#waInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importWhatsApp(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#migInput').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) Mig.read(fs).catch(err => toast('Hata: ' + err.message)); }; // 107d
  $('#bmInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importBookmarks(f).catch(err => toast('Hata: ' + err.message)); } };
  $('#backupInput').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $('#menu').close(); importBackup(f).catch(err => toast('Hata: ' + err.message)); } };

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; });
  addEventListener('appinstalled', () => toast('Yüklendi. Artık Paylaş menüsünde var.', 3000, 'check'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!Lock.conf || Crypt.key)) { reloadFromDB(); AI.health(); Sync.schedule(); Live.check(); } });
  // 82: going to the background / closing sends what is waiting now; 83: coming back to the window pulls (at most every 10 s)
  document.addEventListener('visibilitychange', () => { if (document.hidden) Cloud.flush(); });
  addEventListener('pagehide', () => Cloud.flush());
  addEventListener('focus', () => { if (!Cloud.on() || document.hidden || (Lock.conf && !Crypt.key)) return; if (now() - (Cloud._focusAt || 0) > 10e3) { Cloud._focusAt = now(); Cloud.schedule(); } Live.check(); });
  addEventListener('online', () => { Sync.paint(); Sync.schedule(); Live.check(); });
  Board.init(); AICur.mine(); Back.init(); Folders.init(); Morph.init(); Native.init(); Cmd.init();
}
// 130c: gallery ↔ board with the same cards: a picture on screen in both views flies from its old place to its new one
// (one shared view-transition-name per card, at most 40 on screen), the rest cross-fade with the view as before.
const Fly = {
  SEL: { gallery: '#gallery .tile[data-id]:not(.q-out)', board: '#board .bcard[data-id]:not(.sticky)' },
  on(els) { const out = new Map(), vw = innerWidth, vh = innerHeight;
    for (const el of els) { const r = el.getBoundingClientRect(); if (r.width && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw) out.set(el.dataset.id, el); if (out.size >= 40) break; }
    return out; },
  from(a, b) {
    if (!a || a === b || !this.SEL[a] || !this.SEL[b]) return null;
    const old = this.on(document.querySelectorAll(this.SEL[a])); if (!old.size) return null;
    const names = new Map(); let k = 0; for (const [id, el] of old) { const n = 'fly' + k++; names.set(id, n); el.style.viewTransitionName = n; el.classList.add('fly'); }
    const used = [...old.values()];
    return { to: () => { // after the new view is drawn: the same cards get the same names; a card not on the new screen just fades out
        if (b === 'board') { if (!S.cam) Board.fit(false); Board.cull(); } // camera and mounted cards now (not a frame later), so the cards' new places are known
        for (const [id, el] of this.on(document.querySelectorAll(this.SEL[b]))) { const n = names.get(id); if (!n) continue; el.style.viewTransitionName = n; el.classList.add('fly'); used.push(el); }
        for (const el of old.values()) if (!used.includes(el) || el.closest('[hidden]')) el.style.viewTransitionName = ''; },
      done: () => { for (const el of used) { el.style.viewTransitionName = ''; el.classList.remove('fly'); } } };
  },
};
function setView(v) {
  if (v === 'todo' && S.view !== 'todo') S.prevView = S.view;
  const ch = v !== S.view;
  S._vfrom = S.view; if (ch) { S.cam = null; hideHits(); } S.view = v; try { localStorage.setItem('hn-view', v); } catch { } // same view again: keep the camera (render would skip and leave it empty)
  if (ch && document.startViewTransition && !reduced()) { // 94a: the old view cross-fades into the new one, the floating chrome stays still
    const h = document.documentElement, fly = Fly.from(S._vfrom, v); h.classList.add('vt');
    try { const vt = document.startViewTransition(() => { render(); renderNow(); try { fly?.to(); } catch { } }); vt.ready.catch(() => { }); vt.finished.catch(() => { }).finally(() => { h.classList.remove('vt'); fly?.done(); }); return; } catch { // a 2nd quick switch skips the 1st: not an error
    h.classList.remove('vt'); fly?.done(); }
  }
  render();
  if (ch) { const el = $('#' + (v === 'board' ? 'board' : v === 'gallery' ? 'gallery' : v === 'todo' ? 'todo' : v === 'cal' ? 'cal' : 'list')); if (el) { el.classList.remove('vin'); void el.offsetWidth; el.classList.add('vin'); el.addEventListener('animationend', () => el.classList.remove('vin'), { once: true }); } } // 90: soft view change
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
  setTheme(document.documentElement.dataset.theme); Glass.apply();
  try { const a = localStorage.getItem('hn-accent'); if (a?.startsWith('#')) setAccent(a); } catch { }
  try { const v = localStorage.getItem('hn-view'); if (['list', 'board', 'gallery', 'todo', 'cal'].includes(v)) S.view = v; else if (innerWidth < 900) S.view = 'list'; } catch { } // phone: first screen is the readable list
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
  S.limit = 60; // 94e: the first screen draws 60 rows (fast on a phone); scrolling adds 300 at a time as before
  wire(); render();
  await Boot.rest(cutoff);
  // back from Google: draw first, then trade the ?code for a session (never a blank screen while it waits)
  Cloud.finish().then(() => { if (Cloud.on()) { render(); Sync.run(); Live.start(); BridgeLink.publish(); } });
  BridgeLink.adopt();
  navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.snooze) Remind.snooze(e.data.snooze.id, e.data.snooze.kind); else if (e.data?.read) Read.queue(); else if (e.data?.view === 'morning') Morning.open(); else if (e.data?.view) setView(e.data.view); });
  { // home-screen shortcuts (long-press the icon): new note, to-dos, vault
    const q = new URLSearchParams(location.search), v = q.get('view'), d = q.get('do');
    if (v === 'todo') setView('todo');
    if (d === 'read') setTimeout(() => Read.queue(), 400); // 95c: tapped the "okuma listesi" notification
    if (v === 'morning') setTimeout(() => Morning.open(), 400); // 95b: the morning notification tapped with the app closed
    const qt = (q.get('text') || '').trim().slice(0, 20000), qu = (q.get('url') || '').trim(); // 96: Android "Nts'e kaydet" (selected text) and links
    if (d === 'new' && (qt || qu)) addFromInput({ text: qt, url: qu, source: 'share' }).then(r => { if (r && r !== 'dup' && r.length) { toast('Kaydedildi', 3000, 'check', { label: 'Aç', fn: () => openItem(r[0].id) }); } });
    else if (d === 'new') setTimeout(() => $('#input').focus(), 300);
    if (d === 'vault') setTimeout(() => Vault.open(), 300);
    if (d === 'find') setTimeout(() => { setMode('find'); $('#input').focus(); }, 300); // 141: "Ara" home-screen shortcut
    if (d === 'voice') setTimeout(() => { setMode('note'); if (Voice.can()) Voice.start(); else $('#input').focus(); }, 400); // 107b: Android widget "Sesli not" → recording starts, tap the mic to finish
    const op = q.get('open'); // 156: the PC quick box (bridge/quick) opens a search result here
    if (op) { let n = 0; const t = setInterval(() => { const ok = byId(op); if (ok || ++n > 20) { clearInterval(t); ok ? openItem(op) : toast('Kayıt bulunamadı'); } }, 250); } // items may still be loading
    if (v || d || op) history.replaceState(null, '', location.pathname);
  }
  if (new URLSearchParams(location.search).has('shared')) { toast('Kaydedildi', 2000, 'check'); history.replaceState(null, '', location.pathname); }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  AI.health(); setInterval(() => { if (!document.hidden) AI.health(); }, 20000);
  setTimeout(() => LinkMeta.run(), 4000); setTimeout(() => Sem.start(), 3000); /* 104f */ setInterval(() => { if (!document.hidden) LinkMeta.run(); }, 5 * 60e3);
  Sync.paint(); Sync.count(); Sync.run(); Live.start(); let tick = 0; setInterval(() => { if (!document.hidden && (Cloud.on() || ++tick % 4 === 0)) Sync.schedule(); }, 30000);
  AiPick.maybe(() => Tour.maybe()); setTimeout(weeklyUnseen, 6000); setTimeout(() => Clean.nudge(), 15000); setTimeout(() => Tidy.boot(), 25000); setTimeout(() => Trash.sweep(), 8000); setTimeout(() => Hues.backfill(), 12000); setTimeout(() => Inside.run(), 9000);
  if (S.items.some(i => fileKind(i) === 'pdf')) (window.requestIdleCallback || setTimeout)(() => Prev.pdfLib());
})();
