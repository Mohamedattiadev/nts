// 104d: the search language. One parser for the search box (and saved searches): words, "exact phrase", /regex/i,
// wildcards poul* f?tura, OR / VEYA / أو / |, -exclude, (groups), fields (title: url: site: file: ext: tag:/# project: chat:
// source: type: color: — a hand label or a picture's own colours, 132), dates (tarih:2024-03, 2024-01..2024-03, >2025-06, son:7g, dün, "geçen hafta"), is:/has:, size:>5mb,
// sort:new/old/rel. Keywords in Turkish, English and Arabic. Never throws: a bad piece becomes plain text plus a warning.
// Works in the page (window.NtsQuery) and in node (tools/test/query.test.mjs).
(function (root) {
  'use strict';
  // folding used on both sides: Turkish İ/ı, accents (ş→s, ü→u …), Arabic harakat/tatweel, أإآ→ا, ة→ه, ى→ي, Arabic/Persian digits
  const fold = s => String(s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟـ]/g, '').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ٱ/g, 'ا')
    .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6f0);
  // 104g: field values (tags, project, chat, title, url, file name) repeat across thousands of items and every key; fold each once
  let FC = new Map();
  const ffold = s => { if (!s) return ''; if (s.length > 300) return fold(s); let f = FC.get(s); if (f === undefined) { if (FC.size > 1e5) FC = new Map(); FC.set(s, f = fold(s)); } return f; };

  const words = o => { const m = new Map(); for (const [k, l] of Object.entries(o)) for (const w of l) m.set(fold(w), k); return m; };
  const FIELDS = words({
    title: ['başlık', 'title', 'عنوان'], text: ['metin', 'içerik', 'text', 'content', 'نص'], url: ['url', 'link', 'bağlantı', 'رابط'],
    site: ['site', 'domain', 'موقع'], file: ['dosya', 'file', 'ملف'], ext: ['uzantı', 'ext', 'extension', 'امتداد'],
    tag: ['etiket', 'tag', 'وسم'], project: ['proje', 'project', 'مشروع'], chat: ['sohbet', 'chat', 'محادثة'],
    source: ['kaynak', 'source', 'from', 'مصدر'], date: ['tarih', 'date', 'تاريخ'], last: ['son', 'last', 'آخر'],
    is: ['is', 'durum', 'حالة'], has: ['has', 'var', 'فيه'], size: ['boyut', 'size', 'حجم'], sort: ['sırala', 'sort', 'ترتيب'],
    type: ['tür', 'type', 'نوع'], color: ['renk', 'color', 'colour', 'لون'],
  });
  const IS = words({
    starred: ['yıldızlı', 'yildiz', 'starred', 'star', 'مميز'], todo: ['görev', 'todo', 'task', 'مهمة'], done: ['bitti', 'done', 'منجز'],
    open: ['açık', 'yapılacak', 'open', 'مفتوح'], unseen: ['bakılmadı', 'okunmadı', 'unseen', 'unread', 'جديد'],
    deleted: ['silindi', 'silinmiş', 'deleted', 'trash', 'محذوف'], pinned: ['sabit', 'pinned', 'مثبت'],
  });
  const KINDS = words({
    image: ['resim', 'foto', 'fotoğraf', 'image', 'photo', 'img', 'صورة'], note: ['not', 'note', 'ملاحظة'], link: ['link', 'bağlantı', 'url', 'رابط'],
    pdf: ['pdf'], video: ['video', 'فيديو'], audio: ['ses', 'audio', 'sound', 'صوت'], text: ['metin', 'text', 'نص'],
    file: ['dosya', 'file', 'ملف'], tag: ['etiket', 'tag', 'وسم'], todo: ['görev', 'todo', 'مهمة'],
  });
  const SOURCES = words({
    whatsapp: ['whatsapp', 'wa', 'واتساب'], pc: ['pc', 'bilgisayar', 'computer', 'حاسوب'], phone: ['telefon', 'phone', 'هاتف'],
    bookmarks: ['yerimleri', 'yer imleri', 'bookmarks', 'إشارات'], share: ['paylaşım', 'share', 'مشاركة'],
  });
  const COLORS = words({
    red: ['kırmızı', 'red', 'أحمر'], orange: ['turuncu', 'orange', 'برتقالي'], yellow: ['sarı', 'yellow', 'أصفر'],
    green: ['yeşil', 'green', 'أخضر'], blue: ['mavi', 'blue', 'أزرق'], purple: ['mor', 'purple', 'بنفسجي'],
    pink: ['pembe', 'pink', 'وردي'], brown: ['kahverengi', 'kahve', 'brown', 'بني'], black: ['siyah', 'kara', 'black', 'أسود'],
    white: ['beyaz', 'white', 'أبيض'], gray: ['gri', 'gray', 'grey', 'رمادي'],
    bw: ['siyah-beyaz', 'siyahbeyaz', 'sb', 'bw', 'b&w', 'black-and-white', 'monochrome', 'أبيض-وأسود'],
  });
  // 132: names shown and indexed for a picture's colours (plain search "mavi" finds blue pictures in any of the 3 languages)
  const HUE_NAMES = { red: 'kırmızı red أحمر', orange: 'turuncu orange برتقالي', yellow: 'sarı yellow أصفر', green: 'yeşil green أخضر',
    blue: 'mavi blue أزرق', purple: 'mor purple بنفسجي', pink: 'pembe pink وردي', brown: 'kahverengi brown بني', black: 'siyah black أسود',
    white: 'beyaz white أبيض', gray: 'gri gray grey رمادي', bw: 'siyah-beyaz siyah beyaz black-and-white أبيض-وأسود' };
  const hueWords = i => (i.hues || []).map(h => HUE_NAMES[h] || '').join(' ');
  // 132: the 1-3 main colours of a picture, no AI: RGBA pixels of a small copy (~32x32) → colour names, + 'bw' when there is
  // (almost) no colour at all. Each pixel goes to one bucket by hue / lightness; a bucket needs ≥ 12% of the picture.
  function palette(px) {
    const n = Math.floor(px.length / 4), cnt = {}; let seen = 0, vivid = 0;
    for (let p = 0; p < n; p++) {
      if (px[p * 4 + 3] < 128) continue; // transparent
      const r = px[p * 4] / 255, g = px[p * 4 + 1] / 255, b = px[p * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)); seen++;
      let k;
      if (l < .13 || (l < .22 && s < .45)) k = 'black';
      else if (s < .16 || d < .08) k = l > .84 ? 'white' : l < .28 ? 'black' : 'gray';
      else if (l > .93) k = 'white';
      else {
        vivid++;
        let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
        if ((h < 45 || h >= 345) && l < .42 && ((h >= 10 && h < 45) || s < .5)) k = 'brown'; // dark warm = brown, dark vivid red stays red
        else if (h < 12 || h >= 345) k = l > .72 ? 'pink' : 'red';
        else if (h < 42) k = l < .4 ? 'brown' : 'orange';
        else if (h < 68) k = 'yellow';
        else if (h < 165) k = 'green';
        else if (h < 255) k = 'blue';
        else if (h < 290) k = 'purple';
        else k = 'pink';
      }
      cnt[k] = (cnt[k] || 0) + 1;
    }
    if (!seen) return [];
    const out = Object.entries(cnt).filter(([, c]) => c / seen >= .12).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    if (vivid / seen < .04) out.push('bw');
    return out;
  }
  const SORTS = words({ new: ['yeni', 'new', 'newest', 'الأحدث'], old: ['eski', 'old', 'oldest', 'الأقدم'], rel: ['alaka', 'ilgili', 'relevance', 'صلة'] });
  const OR = new Set(['OR', 'VEYA', 'veya', 'أو', '||']), AND = new Set(['AND', 'VE', 'و']), NOT = new Set(['NOT', 'DEĞİL', 'ليس']);
  const REL = words({
    today: ['bugün', 'today', 'اليوم'], yesterday: ['dün', 'yesterday', 'أمس'], week: ['bu hafta', 'this week', 'هذا الأسبوع'],
    lastweek: ['geçen hafta', 'last week', 'الأسبوع الماضي'], month: ['bu ay', 'this month', 'هذا الشهر'],
    lastmonth: ['geçen ay', 'last month', 'الشهر الماضي'], year: ['bu yıl', 'this year', 'هذه السنة'], lastyear: ['geçen yıl', 'last year', 'السنة الماضية'],
  });
  const UNIT = words({ d: ['g', 'gün', 'd', 'day', 'days', 'ي', 'يوم', 'أيام'], w: ['h', 'hafta', 'w', 'week', 'weeks', 'أسبوع', 'أ'],
    m: ['a', 'ay', 'm', 'month', 'months', 'شهر', 'ش'], y: ['y', 'yıl', 'year', 'years', 'سنة', 'س'] });

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const W = '[\\p{L}\\p{N}_]'; // a word character in any script

  // ---------- lexer ----------
  function lex(q, warn) {
    const T = [], n = q.length; let i = 0;
    const ws = c => /\s/.test(c);
    const quoted = () => { // i is on an opening quote; returns the text inside
      const close = q[i] === '“' ? '”' : '"'; let j = q.indexOf(close, i + 1);
      if (j < 0 && close === '”') j = q.indexOf('"', i + 1);
      if (j < 0) { warn('Kapanmayan tırnak: sona kadar alındı'); j = n; }
      const s = q.slice(i + 1, j); i = Math.min(n, j + 1); return s;
    };
    const regex = () => { // i is on '/'; returns {src, flags} or null when it isn't a closed regex
      let j = i + 1, cls = false;
      for (; j < n; j++) { const c = q[j]; if (c === '\\') { j++; continue; } if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break; }
      if (j >= n || j === i + 1) return null;
      let k = j + 1; while (k < n && /[a-z]/.test(q[k])) k++;
      if (k < n && !ws(q[k]) && q[k] !== ')') return null;
      const r = { src: q.slice(i + 1, j), flags: q.slice(j + 1, k) }; i = k; return r;
    };
    while (i < n) {
      const c = q[i];
      if (ws(c)) { i++; continue; }
      if (c === '(' || c === ')') { T.push({ t: c }); i++; continue; }
      if (c === '|') { T.push({ t: 'OR' }); i += q[i + 1] === '|' ? 2 : 1; continue; }
      if (c === '-' && i + 1 < n && !ws(q[i + 1]) && q[i + 1] !== '-') { T.push({ t: 'NOT' }); i++; continue; }
      if (c === '"' || c === '“') { T.push({ t: 'P', v: quoted() }); continue; }
      if (c === '/') { const r = regex(); if (r) { T.push({ t: 'R', ...r }); continue; } }
      if (c === '#' && i + 1 < n && !ws(q[i + 1])) { // #tag
        let j = i + 1; while (j < n && !ws(q[j]) && q[j] !== ')' && q[j] !== '(') j++;
        T.push({ t: 'F', k: 'tag', v: q.slice(i + 1, j), kind: 'w' }); i = j; continue;
      }
      let j = i; while (j < n && !ws(q[j]) && q[j] !== '(' && q[j] !== ')' && q[j] !== '"' && q[j] !== '“') j++;
      const w = q.slice(i, j), ci = w.indexOf(':'), key = ci > 0 ? FIELDS.get(fold(w.slice(0, ci))) : null;
      i = j;
      if (key) {
        let v = w.slice(ci + 1), kind = 'w';
        if (!v && (q[i] === '"' || q[i] === '“')) { v = quoted(); kind = 'p'; }
        else if (v[0] === '/' ) { i -= v.length; const r = regex(); if (r) { v = r; kind = 'r'; } else { i += v.length; } }
        if (kind === 'w' && !v) { warn(`"${w}" boş: yok sayıldı`); continue; }
        T.push({ t: 'F', k: key, v, kind }); continue;
      }
      if (OR.has(w)) T.push({ t: 'OR' }); else if (AND.has(w)) { /* implicit anyway */ } else if (NOT.has(w)) T.push({ t: 'NOT' });
      else if (w) T.push({ t: 'W', v: w });
    }
    return T;
  }

  // ---------- parser: or := and (OR and)* ; and := unary+ ; unary := NOT unary | ( or ) | term ----------
  function parseTokens(T, warn) {
    let p = 0;
    const or = () => {
      const c = [and()];
      while (T[p]?.t === 'OR') { p++; const x = and(); if (x) c.push(x); else warn('VEYA\'dan sonra bir şey yok'); }
      const k = c.filter(Boolean); return k.length > 1 ? { op: 'or', c: k } : k[0] || null;
    };
    const and = () => {
      const c = [];
      while (p < T.length && T[p].t !== 'OR' && T[p].t !== ')') { const x = unary(); if (x) c.push(x); }
      return c.length > 1 ? { op: 'and', c } : c[0] || null;
    };
    const unary = () => {
      const t = T[p++];
      if (t.t === 'NOT') { if (p >= T.length || T[p].t === ')' || T[p].t === 'OR') { warn('"-" tek başına: yok sayıldı'); return null; } const x = unary(); return x && { op: 'not', c: x }; }
      if (t.t === '(') { const x = or(); if (T[p]?.t === ')') p++; else warn('Kapanmayan parantez'); return x; }
      return t;
    };
    let out = [];
    while (p < T.length) { const x = or(); if (x) out.push(x); if (T[p]?.t === ')') { warn('Fazla ")" yok sayıldı'); p++; } }
    return out.length > 1 ? { op: 'and', c: out } : out[0] || null;
  }

  // ---------- dates ----------
  const day0 = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  // one date value → [start, end) or null
  function span(v, now) {
    const s = fold(v).replace(/_/g, ' ').trim(); let m;
    if ((m = s.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/))) {
      const y = +m[1], mo = m[2] ? +m[2] - 1 : null, d = m[3] ? +m[3] : null;
      if (mo !== null && (mo < 0 || mo > 11)) return null;
      if (d !== null) { const a = new Date(y, mo, d).getTime(); return [a, new Date(y, mo, d + 1).getTime()]; }
      if (mo !== null) return [new Date(y, mo, 1).getTime(), new Date(y, mo + 1, 1).getTime()];
      return [new Date(y, 0, 1).getTime(), new Date(y + 1, 0, 1).getTime()];
    }
    const r = REL.get(s); if (!r) return null;
    const t = new Date(day0(now)), dow = (t.getDay() + 6) % 7, D = (y, mo, d) => new Date(y, mo, d).getTime();
    const Y = t.getFullYear(), M = t.getMonth(), d = t.getDate();
    return {
      today: [D(Y, M, d), D(Y, M, d + 1)], yesterday: [D(Y, M, d - 1), D(Y, M, d)],
      week: [D(Y, M, d - dow), D(Y, M, d - dow + 7)], lastweek: [D(Y, M, d - dow - 7), D(Y, M, d - dow)],
      month: [D(Y, M, 1), D(Y, M + 1, 1)], lastmonth: [D(Y, M - 1, 1), D(Y, M, 1)],
      year: [D(Y, 0, 1), D(Y + 1, 0, 1)], lastyear: [D(Y - 1, 0, 1), D(Y, 0, 1)],
    }[r];
  }
  function dateRange(v, now) { // "2024-03", "2024-01..2024-03", ">2025-06", ">=…", "<…", "<=…", "dün"
    let m = v.match(/^(>=|<=|>|<)(.+)$/);
    if (m) { const s = span(m[2], now); if (!s) return null; return { '>': [s[1], Infinity], '>=': [s[0], Infinity], '<': [-Infinity, s[0]], '<=': [-Infinity, s[1]] }[m[1]]; }
    if ((m = v.match(/^(.*?)\.\.(.*)$/))) {
      const a = m[1] ? span(m[1], now) : [-Infinity], b = m[2] ? span(m[2], now) : [0, Infinity];
      return a && b ? [a[0], b[1]] : null;
    }
    return span(v, now);
  }
  function lastRange(v, now) { // son:7g / last:2w / آخر:3ش
    const m = fold(v).match(/^(\d+)\s*(\D*)$/); if (!m) return null;
    const u = m[2] ? UNIT.get(m[2]) : 'd'; if (!u) return null;
    const k = +m[1], d = new Date(now);
    if (u === 'd') d.setDate(d.getDate() - k); else if (u === 'w') d.setDate(d.getDate() - 7 * k); else if (u === 'm') d.setMonth(d.getMonth() - k); else d.setFullYear(d.getFullYear() - k);
    return [d.getTime(), Infinity];
  }
  function sizeRange(v) { // ">5mb", "<100kb", "1mb..10mb", "2mb"
    const num = s => { const m = fold(s).match(/^(\d+(?:[.,]\d+)?)\s*(b|k|kb|m|mb|g|gb)?$/); if (!m) return null; return parseFloat(m[1].replace(',', '.')) * ({ k: 1e3, kb: 1e3, m: 1e6, mb: 1e6, g: 1e9, gb: 1e9 }[m[2]] || 1); };
    let m = v.match(/^(>=|<=|>|<)(.+)$/);
    if (m) { const x = num(m[2]); return x === null ? null : { '>': [x + 1e-9, Infinity], '>=': [x, Infinity], '<': [-Infinity, x - 1e-9], '<=': [-Infinity, x] }[m[1]]; }
    if ((m = v.match(/^(.*)\.\.(.*)$/))) { const a = m[1] ? num(m[1]) : 0, b = m[2] ? num(m[2]) : Infinity; return a === null || b === null ? null : [a, b]; }
    const x = num(v); return x === null ? null : [x * 0.95, x * 1.05]; // "2mb" ≈ about 2 MB
  }

  // ---------- regex safety ----------
  const MAXRE = 200;
  function safeRe(src, flags, warn) {
    if (src.length > MAXRE) { warn('Regex çok uzun (en çok 200): düz yazı olarak arandı'); return null; }
    // nested quantifiers like (a+)+ (a*)* (a|aa)+ can freeze the page (ReDoS)
    if (/\([^)]*[+*}][^)]*\)\s*[+*{]/.test(src) || /\\\d/.test(src)) { warn('Bu regex sayfayı dondurabilir: düz yazı olarak arandı'); return null; }
    try { return new RegExp(src, [...new Set(('iu' + flags.replace(/[^imsu]/g, '')).split(''))].join('')); }
    catch { try { return new RegExp(src, 'i'); } catch (e) { warn('Geçersiz regex: düz yazı olarak arandı'); return null; } }
  }

  // ---------- compile ----------
  const wild = (v, whole) => { // poul*  f?tura  → regex on folded text
    const body = [...fold(v)].map(c => c === '*' ? W + '*' : c === '?' ? W : esc(c)).join('');
    return new RegExp((whole ? '^' : '(?:^|[^\\p{L}\\p{N}_])') + body + (whole ? '$' : ''), 'u');
  };
  const textOf = (fn, i) => ffold(fn(i) || '');
  // node + item accessors → predicate. Accessors (ctx) let the app give its own title/kind/source logic.
  function build(node, ctx, warn, out) {
    if (!node) return () => true;
    const neg = out.neg;
    switch (node.op || node.t) {
      case 'and': { const f = node.c.map(x => build(x, ctx, warn, out)); return i => f.every(g => g(i)); }
      case 'or': { const f = node.c.map(x => build(x, ctx, warn, out)); return i => f.some(g => g(i)); }
      case 'not': { out.neg = !neg; const f = build(node.c, ctx, warn, out); out.neg = neg; return i => !f(i); }
      case 'W': {
        const v = node.v;
        if (/[*?]/.test(v) && v.replace(/[*?]/g, '').length) { const re = wild(v); if (!neg) out.terms.push(v.replace(/[*?]/g, '')); return i => re.test(ctx.hay(i)); }
        const f = fold(v); if (!neg) out.terms.push(v);
        return i => ctx.hay(i).includes(f);
      }
      case 'P': { const f = fold(node.v); if (!f.trim()) return () => true; if (!neg) out.terms.push(node.v); return i => ctx.hay(i).includes(f); }
      case 'R': {
        const re = safeRe(node.src, node.flags, warn);
        if (!re) { const f = fold(node.src); return i => ctx.hay(i).includes(f); }
        if (!neg) out.res.push(re);
        return i => re.test(ctx.raw(i).slice(0, 20000));
      }
      case 'F': return field(node, ctx, warn, out);
    }
    return () => true;
  }
  function matcher(node, warn) { // a field's value → fn(string) on the folded field text
    if (node.kind === 'r') { const re = safeRe(node.v.src, node.v.flags, warn); if (re) return s => re.test(s); const f = fold(node.v.src); return s => s.includes(f); }
    const v = node.v;
    if (node.kind !== 'p' && /[*?]/.test(v)) { const re = wild(v); return s => re.test(s); }
    const f = fold(v); return s => s.includes(f);
  }
  function field(node, ctx, warn, out) {
    const { k, v } = node, fv = node.kind === 'w' ? fold(v) : '';
    const bad = what => { warn(`${what}: "${v}" anlaşılmadı, yok sayıldı`); return () => true; };
    const inR = (x, r) => x >= r[0] && x < r[1];
    switch (k) {
      case 'title': { const m = matcher(node, warn); if (!out.neg && node.kind !== 'r') out.terms.push(typeof v === 'string' ? v : ''); return i => m(textOf(ctx.title, i)); }
      case 'text': { const m = matcher(node, warn); if (!out.neg && node.kind !== 'r') out.terms.push(typeof v === 'string' ? v : ''); return i => m(ctx.hay(i)); }
      case 'url': { const m = matcher(node, warn); return i => m(ffold(i.url || '')); }
      case 'site': { const m = matcher(node, warn); return i => m(ffold(ctx.site(i))); }
      case 'file': { const m = matcher(node, warn); return i => m(ffold(i.fileName || '')); }
      case 'ext': { const e = fv.replace(/^\./, ''), m = /[*?]/.test(e) ? wild(e, true) : null; return i => { const x = ffold(((i.fileName || '').match(/\.([^./]+)$/) || [])[1] || ''); return m ? m.test(x) : x === e; }; }
      case 'tag': {
        const re = node.kind === 'w' && /[*?]/.test(fv) ? wild(fv, true) : null;
        const m = node.kind === 'w' ? (re ? (s => re.test(s)) : (s => s === fv)) : matcher(node, warn);
        return i => ctx.tags(i).some(m);
      }
      case 'project': { const m = matcher(node, warn); return i => !!i.project && m(ffold(i.project)); }
      case 'chat': { const m = matcher(node, warn); return i => !!i.chat && m(ffold(i.chat)); }
      case 'source': { const s = SOURCES.get(fv); if (!s) { const m = matcher(node, warn); return i => m(ffold(i.source || '')); } return i => ctx.src(i, s); }
      case 'type': { const kd = KINDS.get(fv); if (!kd) return bad('Tür'); return i => ctx.has(i, kd, true); }
      case 'has': { const kd = KINDS.get(fv); if (!kd) return bad('has'); return i => ctx.has(i, kd, false); }
      case 'is': {
        const s = IS.get(fv); if (!s) return bad('is');
        if (s === 'deleted') out.deleted = true;
        return {
          starred: i => !!i.starred, todo: i => !!i.todo, done: i => !!i.todo?.done, open: i => !!i.todo && !i.todo.done,
          unseen: i => !i.seenAt, deleted: i => !!i.deleted, pinned: i => !!(i.sticky || i.pinned),
        }[s];
      }
      case 'color': { const c = COLORS.get(fv); if (!c) return bad('Renk'); return i => i.color === c || !!i.hues?.includes(c); } // label or picture colour (132)
      case 'date': { const r = dateRange(String(v), ctx.now); if (!r) return bad('Tarih'); return i => inR(i.ts, r); }
      case 'last': { const r = lastRange(String(v), ctx.now); if (!r) return bad('Son'); return i => inR(i.ts, r); }
      case 'size': { const r = sizeRange(String(v)); if (!r) return bad('Boyut'); return i => typeof i.size === 'number' && i.size >= r[0] && i.size <= r[1]; }
      case 'sort': { const s = SORTS.get(fv); if (!s) return bad('Sırala'); out.sort = s; return () => true; }
    }
    return () => true;
  }

  // default accessors (the app passes better ones: its own title, kind and source logic and cached search text)
  const KIND = i => { if (i.type !== 'file') return i.type; const m = i.mime || '', n = (i.fileName || '').toLowerCase();
    return m.startsWith('image') || /\.(jpe?g|png|gif|webp|heic|avif|bmp|svg)$/.test(n) ? 'image' : m.startsWith('video') || /\.(mp4|mov|webm|mkv|3gp)$/.test(n) ? 'video'
      : m.startsWith('audio') || /\.(mp3|m4a|ogg|opus|wav|aac|flac)$/.test(n) ? 'audio' : m.includes('pdf') || n.endsWith('.pdf') ? 'pdf' : 'file'; };
  const RAW = i => [i.title, i.meta?.title, i.meta?.description, i.text, i.url, i.fileName, i.content, i.ocr, i.summary, (i.tags || []).join(' '), (i.vtags || []).join(' '), hueWords(i), i.project, i.chat].filter(Boolean).join(' ');
  function defaults(c = {}) {
    const kind = c.kind || KIND, raw = c.raw || RAW, cache = new WeakMap(), tcache = new WeakMap();
    return {
      now: c.now ?? Date.now(), raw, kind,
      hay: c.hay || (i => { let h = cache.get(i); if (h === undefined) cache.set(i, h = fold(raw(i))); return h; }),
      tags: i => { let t = tcache.get(i); if (!t) tcache.set(i, t = [...(i.tags || []), ...(i.vtags || [])].map(ffold)); return t; },
      title: c.title || (i => i.title || i.meta?.title || i.fileName || (i.text || '').split('\n')[0]),
      site: c.site || (i => { try { return i.meta?.site || new URL(i.url).hostname.replace(/^www\./, ''); } catch { return ''; } }),
      src: c.src || ((i, s) => s === 'whatsapp' ? i.source === 'whatsapp' : i.source === s || (s !== 'bookmarks' && i.dev === s && i.source !== 'whatsapp' && i.source !== 'bookmarks')),
      has: c.has || ((i, k, exact) => {
        const kd = kind(i);
        if (k === 'tag') return !!(i.tags?.length);
        if (k === 'todo') return !!i.todo;
        if (k === 'link') return exact ? i.type === 'link' : !!i.url;
        if (k === 'note') return exact ? i.type === 'note' : i.type === 'note' || !!(i.text && i.text.trim());
        if (k === 'text') return kd === 'text';
        if (k === 'file') return i.type === 'file';
        if (!exact && kd !== k && Array.isArray(i.files)) return i.files.some(f => kind({ type: 'file', ...f }) === k);
        return kd === k;
      }),
    };
  }

  // a query without any syntax keeps the app's fast fuzzy word search
  const PLAIN = /["“/()|#:]|(^|\s)-\S|(^|\s)(OR|VEYA|أو|NOT|DEĞİL|ليس)(\s|$)|\S[*?]|[*?]\S/;
  const isPlain = q => !PLAIN.test(q);

  // parse once → { test(item), sort, terms, warnings, deleted }
  function compile(q, c) {
    const warnings = [], warn = m => { if (!warnings.includes(m)) warnings.push(m); };
    const ctx = defaults(c), out = { terms: [], res: [], sort: null, deleted: false, neg: false };
    let test = () => true;
    try { const ast = parseTokens(lex(String(q || ''), warn), warn); test = build(ast, ctx, warn, out); out.ast = ast; }
    catch (e) { warn('Arama anlaşılmadı: düz yazı olarak arandı'); const f = fold(q); test = i => ctx.hay(i).includes(f); }
    return { test, sort: out.sort, terms: out.terms.filter(Boolean), res: out.res, deleted: out.deleted, warnings, ast: out.ast };
  }

  // ---------- 104b: typo tolerance (one wrong / missing / extra / swapped letter; two in long words) ----------
  function near(a, b) { // a: a word of the item (or its start), b: what was typed; both folded
    const max = b.length >= 8 ? 2 : 1;
    if (Math.abs(a.length - b.length) > max) return false;
    let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, k) => k);
    for (let x = 1; x <= a.length; x++) {
      const cur = [x]; let low = x;
      for (let y = 1; y <= b.length; y++) {
        let v = Math.min(prev[y] + 1, cur[y - 1] + 1, prev[y - 1] + (a[x - 1] === b[y - 1] ? 0 : 1));
        if (prev2 && x > 1 && y > 1 && a[x - 1] === b[y - 2] && a[x - 2] === b[y - 1]) v = Math.min(v, prev2[y - 2] + 1); // swapped pair
        cur.push(v); if (v < low) low = v;
      }
      if (low > max) return false;
      prev2 = prev; prev = cur;
    }
    return prev[b.length] <= max;
  }

  // ---------- 104a: plain sentence → filter chips ("geçen hafta pdf", "mart 2024 fatura", "whatsapp annem", "telefondan foto") ----------
  // Only for a query without syntax. Each chip knows the words it came from (a..b in the typed text), so × removes exactly them.
  const SUF = ['', 'lar', 'ler', 'dan', 'den', 'tan', 'ten', 'da', 'de', 'ta', 'te', 'daki', 'deki', 'taki', 'teki', 'lari', 'leri', 'lardan', 'lerden', 'larda', 'lerde', 'ndan', 'nden', 's', 'es', 'ki', 'ku', 'in', 'un', 'nin', 'nun'];
  const NL_KIND = [['pdf', 'PDF', ['pdf']], ['image', 'Resim', ['foto', 'fotograf', 'resim', 'gorsel', 'photo', 'image', 'picture', 'pic', 'صوره', 'صور', 'الصور', 'الصوره']],
    ['link', 'Link', ['link', 'baglanti', 'رابط', 'روابط']], ['video', 'Video', ['video', 'فيديو', 'فيديوهات']],
    ['audio', 'Ses', ['ses kaydi', 'sesli not', 'audio', 'voice', 'تسجيل']], ['note', 'Not', ['notlar', 'notes', 'ملاحظات', 'ملاحظه']]];
  const NL_SRC = [['whatsapp', 'WhatsApp', ['whatsapp', 'wp', 'واتساب', 'واتس']], ['phone', 'Telefon', ['telefon', 'phone', 'mobile', 'هاتف', 'الهاتف', 'موبايل']],
    ['pc', 'Bilgisayar', ['bilgisayar', 'pc', 'computer', 'laptop', 'حاسوب', 'الحاسوب', 'كمبيوتر']], ['bookmarks', 'Yer imleri', ['yer imleri', 'yerimleri', 'bookmarks', 'المفضله']]];
  const NL_REL = [['today', 'Bugün', ['bugun', 'today', 'اليوم']], ['yesterday', 'Dün', ['dun', 'yesterday', 'امس', 'البارحه']],
    ['lastweek', 'Geçen hafta', ['gecen hafta', 'last week', 'الاسبوع الماضي']], ['week', 'Bu hafta', ['bu hafta', 'this week', 'هذا الاسبوع']],
    ['lastmonth', 'Geçen ay', ['gecen ay', 'last month', 'الشهر الماضي']], ['month', 'Bu ay', ['bu ay', 'this month', 'هذا الشهر']],
    ['lastyear', 'Geçen yıl', ['gecen yil', 'gecen sene', 'last year', 'السنه الماضيه', 'العام الماضي']], ['year', 'Bu yıl', ['bu yil', 'bu sene', 'this year', 'هذه السنه', 'هذا العام']]];
  const REL_Q = { today: 'today', yesterday: 'yesterday', lastweek: 'last_week', week: 'this_week', lastmonth: 'last_month', month: 'this_month', lastyear: 'last_year', year: 'this_year' };
  const MONTHS = ['ocak subat mart nisan mayis haziran temmuz agustos eylul ekim kasim aralik', 'january february march april may june july august september october november december',
    'يناير فبراير مارس ابريل مايو يونيو يوليو اغسطس سبتمبر اكتوبر نوفمبر ديسمبر'].map(l => l.split(' '));
  const AYLAR = 'Ocak Şubat Mart Nisan Mayıs Haziran Temmuz Ağustos Eylül Ekim Kasım Aralık'.split(' ');
  const monthOf = w => { for (const l of MONTHS) { const k = l.findIndex(m => w === m || (w.startsWith(m) && SUF.includes(w.slice(m.length)))); if (k >= 0) return k; } return -1; };
  const LAST = new Set(['son', 'last', 'past', 'اخر']), UNITS = [['d', 'gün', ['gun', 'day', 'days', 'يوم', 'ايام']], ['w', 'hafta', ['hafta', 'week', 'weeks', 'اسبوع', 'اسابيع']],
    ['m', 'ay', ['ay', 'month', 'months', 'شهر', 'اشهر', 'شهور']], ['y', 'yıl', ['yil', 'sene', 'year', 'years', 'سنه', 'سنوات']]];
  // 105a: words that only make the sentence a sentence ("annemin ATTIĞI fotoğraflar", "SHOW ME the invoices") are dropped, never all of them;
  // question words too (105d says "ask?" separately). A chat's name counts anywhere with Turkish endings ("annemin", "Ali'den")
  const FILL = new Set(('ve ile icin bana beni benim bunu sunu tum butun hepsi olan olanlar goster gosterir bul getir attigi attigim attiklari gonderdigi gonderdigim '
    + 'yolladigi yolladigim paylastigi kaydettigim ekledigim aldigim cektigim ne neler nasil kac neden niye nerede nerde kim kimin hangi hangisi var mi mu '
    + 'the an my me show find all from of that which sent by with for what how where when who whose is are was did do does any some about '
    + 'في من الى التي الذي اللي كل عن لي اعرض ابحث ارسل ارسلها ارسلته ما ماذا كيف اين متى هل كم').split(' '));
  const CHAT_SUF = ['in', 'nin', 'un', 'nun', 'e', 'a', 'ye', 'ya', 'i', 'u', 'yi', 'yu', 'le', 'la', 'yle', 'yla', 'im', 'um', 'ler', 'lar', 's'];
  // a bare month is a month only when it can't be a common word ("ocak" ocak/stove, "ekim" sowing, "aralık" gap, "may", "Kasım" a name)
  const BARE_NO = new Set(['ocak', 'ekim', 'aralik', 'kasim', 'may']);
  const monthChip = (mo, y) => ({ k: 'date', label: `${AYLAR[mo]} ${y}`, q: `tarih:${y}-${String(mo + 1).padStart(2, '0')}` });
  // 105d: the sentence is a question (to the AI, not a filter): "?" at the end, or it starts with a question word
  const QW = new Set('ne neden niye nasil kac kim kimin nerede nerde hangi hangisi what why how when where who which whose does did are can should ماذا لماذا كيف كم متى اين هل ما'.split(' '));
  function intent(q) {
    const t = String(q || '').trim(); if (!t || !isPlain(t.replace(/\?+$/, ''))) return null;
    if (/[?؟]$/.test(t)) return 'ask';
    const w = t.split(/\s+/).map(x => fold(x).replace(/[.,;!?؟]+$/, ''));
    return w.length >= 2 && (QW.has(w[0]) || QW.has(w[1]) || QW.has(w[w.length - 1]) || w[w.length - 1] === 'mi' || w[w.length - 1] === 'mu') ? 'ask' : null; // "kaç sensör var", "fatura ödendi mi" (ı/ü fold to i/u)
  }
  function natural(q, opt = {}) {
    const toks = []; let m; const re = /\S+/g;
    while ((m = re.exec(q))) { const raw = m[0], f = fold(raw.split(/['’]/)[0]).replace(/[.,;!?]+$/, ''); toks.push({ a: m.index, b: m.index + raw.length, f }); }
    const used = new Set(), chips = [];
    const take = (k, n, chip) => { for (let x = k; x < k + n; x++) used.add(x); chips.push({ ...chip, a: toks[k].a, b: toks[k + n - 1].b }); };
    const is = (w, base) => w === base || (w.startsWith(base) && SUF.includes(w.slice(base.length)));
    const phrase = (k, p) => { const ps = p.split(' '); if (k + ps.length > toks.length) return 0; for (let x = 0; x < ps.length; x++) { if (used.has(k + x)) return 0; const w = toks[k + x].f; if (x === ps.length - 1 ? !is(w, ps[x]) : w !== ps[x]) return 0; } return ps.length; };
    const chats = (opt.chats || []).filter(Boolean).map(c => [c, fold(c)]);
    for (let k = 0; k < toks.length; k++) {
      if (used.has(k)) continue;
      const w = toks[k].f; let n;
      // son 7 gün / last 3 weeks / آخر 7 أيام
      if (LAST.has(w) && toks[k + 1] && /^\d{1,3}$/.test(toks[k + 1].f) && toks[k + 2]) {
        const u = UNITS.find(([, , l]) => l.some(x => is(toks[k + 2].f, x)));
        if (u) { const v = toks[k + 1].f; take(k, 3, { k: 'date', label: `Son ${v} ${u[1]}`, q: `son:${v}${u[0] === 'm' ? 'a' : u[0] === 'w' ? 'h' : u[0] === 'y' ? 'y' : 'g'}` }); continue; }
      }
      // mart 2024 / 2024 mart / march 2024 / مارس 2024
      const mo = monthOf(w), yr = /^(19|20)\d\d$/.test(w);
      if (mo >= 0 && toks[k + 1] && /^(19|20)\d\d$/.test(toks[k + 1].f)) { const y = toks[k + 1].f; take(k, 2, { k: 'date', label: `${AYLAR[mo]} ${y}`, q: `tarih:${y}-${String(mo + 1).padStart(2, '0')}` }); continue; }
      if (yr && toks[k + 1] && monthOf(toks[k + 1].f) >= 0) { const x = monthOf(toks[k + 1].f); take(k, 2, { k: 'date', label: `${AYLAR[x]} ${w}`, q: `tarih:${w}-${String(x + 1).padStart(2, '0')}` }); continue; }
      // 105a: "geçen ekim", "martta", "in march", "في مارس": the last such month (this one if we're in it)
      if (mo >= 0) {
        const pre = k > 0 && !used.has(k - 1) ? toks[k - 1].f : '', bare = MONTHS.some(l => l[mo] === w), last = pre === 'gecen' || pre === 'last';
        if (!bare || last || pre === 'in' || pre === 'bu' || pre === 'this' || pre === 'في' || !BARE_NO.has(w)) {
          const d = new Date(opt.now || Date.now()); let y = d.getFullYear(); if (mo > d.getMonth() || (last && mo === d.getMonth())) y--;
          const lead = last || pre === 'in' || pre === 'bu' || pre === 'this' || pre === 'في' ? 1 : 0; take(k - lead, 1 + lead, monthChip(mo, y)); continue;
        }
      }
      let hit = false;
      for (const [key, label, list] of NL_REL) { for (const p of list) if ((n = phrase(k, p))) { take(k, n, { k: 'date', label, q: `tarih:${REL_Q[key]}` }); hit = true; break; } if (hit) break; }
      if (hit) continue;
      for (const [key, label, list] of NL_KIND) { for (const p of list) if ((n = phrase(k, p))) { take(k, n, { k: 'kind', v: key, label, q: `tür:${key}` }); hit = true; break; } if (hit) break; }
      if (hit) continue;
      for (const [key, label, list] of NL_SRC) {
        for (const p of list) if ((n = phrase(k, p))) {
          take(k, n, { k: 'src', v: key, label, q: `kaynak:${key}` }); hit = true;
          // "whatsapp annem": the next word is one of the chats → that chat
          const nx = toks[k + n];
          if (key === 'whatsapp' && nx && !used.has(k + n) && nx.f.length > 1) {
            const c = chats.find(([, fc]) => fc === nx.f || fc.split(/\s+/).some(p2 => p2.length > 1 && (p2 === nx.f || is(nx.f, p2) || (nx.f.length >= 3 && p2.startsWith(nx.f)))));
            if (c) take(k + n, 1, { k: 'chat', label: c[0], q: `sohbet:"${c[0].replace(/"/g, '')}"` });
          }
          break;
        }
        if (hit) break;
      }
      if (hit) continue;
      // 105a: a chat's name anywhere ("annemin attığı", "Ali'den", "ahmet ile"), at least 3 letters so short words don't turn into chats
      if (w.length >= 3) {
        const c = chats.find(([, fc]) => fc.split(/\s+/).some(p2 => p2.length >= 3 && (w === p2 || (w.startsWith(p2) && (SUF.includes(w.slice(p2.length)) || CHAT_SUF.includes(w.slice(p2.length)))))));
        if (c && !chips.some(x => x.k === 'chat' && x.label === c[0])) { take(k, 1, { k: 'chat', label: c[0], q: `sohbet:"${c[0].replace(/"/g, '')}"` }); continue; }
      }
    }
    // the filler words go, but never every word: "ne var" stays a search for "ne var"
    const fill = toks.map((t, k) => !used.has(k) && FILL.has(t.f) ? k : -1).filter(k => k >= 0);
    if (fill.length && (chips.length || fill.length < toks.length - used.size)) fill.forEach(k => used.add(k));
    if (!chips.length && !fill.some(k => used.has(k))) return { chips, rest: q, q };
    const rest = toks.filter((_, k) => !used.has(k)).map(t => q.slice(t.a, t.b)).join(' ');
    const filt = chipFilter(chips);
    return { chips, rest, filter: filt, q: (filt + ' ' + rest).trim() };
  }
  // several kinds or sources are "any of them"; different groups are "all of them"
  function chipFilter(chips) {
    const grp = k => { const l = chips.filter(c => c.k === k).map(c => c.q); return l.length > 1 ? `(${l.join(' | ')})` : l[0] || ''; };
    return ['date', 'kind', 'src', 'chat'].map(grp).filter(Boolean).join(' ');
  }

  // 105b + 105g: the words that carry the meaning of a plain question or search (filler and question words out, "?" off)
  const stripAl = w => w.length > 4 && /^(ال|وال|بال|لل)/.test(w) ? w.replace(/^(و?ال|بال|لل)/, '') : w; // Arabic "the" (الفاتورة ~ فاتورة)
  const QX = new Set(['kadar', 'tane', 'adet', 'many', 'much', 'mi', 'mu', 'mı', 'mü']);
  const content = q => String(q || '').split(/\s+/).map(x => stripAl(fold(x.split(/['’]/)[0]).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))).filter(w => w && !FILL.has(w) && !QW.has(w) && !QX.has(w) && (w.length > 1 || /\d/.test(w)));
  const NUMQ = /(^|\s)(kac|kaca|ne kadar|nekadar|how (many|much)|كم)(\s|$|\?)/;
  const wantsNum = q => NUMQ.test(fold(q).replace(/[?؟]/g, ' '));
  // the same word with another ending: "kümeste" ~ "kümes", "sensörler" ~ "sensör", "sensors" ~ "sensor"; short words must be equal
  const stemOf = w => w.length <= 3 ? w : w.slice(0, Math.max(4, Math.min(w.length - 1, 5)));
  const same = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(stemOf(b)) || b.startsWith(stemOf(a))));
  // 105b: the direct answer of a question from the best results, on the device: the one sentence that holds most of the question's
  // words (a number when it asks "kaç / how many / كم"). docs are in result order: [{ id, texts: [...] }]. → { id, text } or null
  function answer(q, docs) {
    const cw = [...new Set(content(q))]; if (!cw.length) return null;
    const num = wantsNum(q), need = Math.max(1, Math.ceil(cw.length * .6)); let best = null;
    docs.slice(0, 8).forEach((d, r) => {
      for (const t of d.texts || []) {
        if (!t) continue;
        for (let s of String(t).split(/(?<=[.!?؟。])\s+|\n+/)) {
          s = s.trim(); if (s.length < 3) continue;
          const sw = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(w => stripAl(fold(w)));
          const hit = cw.filter(c => sw.some(w => same(w, c))).length; if (hit < need) continue;
          const dig = /\d/.test(s), sc = hit / cw.length + (num ? (dig ? .6 : -.4) : 0) + .25 * (1 - r / 8) - Math.min(.3, s.length / 1200);
          if (!best || sc > best.sc) best = { id: d.id, text: s.length > 240 ? s.slice(0, 237).replace(/\s+\S*$/, '') + '…' : s, sc };
        }
      }
    });
    return best && (!num || /\d/.test(best.text)) ? { id: best.id, text: best.text } : null;
  }
  // 105g: how alike two searches are (0..1): the share of their words that are the same word ("faturalar" ~ "fatura")
  function qsim(a, b) {
    const x = content(a), y = content(b); if (!x.length || !y.length) return 0;
    const m = x.filter(w => y.some(v => same(w, v))).length;
    return m / Math.max(x.length, y.length);
  }

  const api = { fold, compile, isPlain, natural, chipFilter, intent, near, content, wantsNum, answer, qsim, lex: q => lex(q, () => {}), parse: q => { const w = []; return { ast: parseTokens(lex(q, m => w.push(m)), m => w.push(m)), warnings: w }; }, dateRange, sizeRange, palette, hueWords, COLOR_OF: w => COLORS.get(fold(w)) || null, field: w => FIELDS.get(fold(w)) || null };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.NtsQuery = api;
})(typeof self !== 'undefined' ? self : this);
