// 104d: tests for the search language (query.js). Run: node tools/test/query.test.mjs
import { createRequire } from 'node:module';
const Q = createRequire(import.meta.url)('../../query.js');

const NOW = new Date(2026, 10, 23, 15, 0).getTime(); // Monday 23 Nov 2026, 15:00
const D = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const items = [
  { id: 'a', type: 'note', text: 'Süt al, faturayı öde', ts: D(2026, 11, 23), tags: ['ev', 'alışveriş'], starred: true, todo: { done: false } },
  { id: 'b', type: 'link', url: 'https://github.com/poultry/care', title: 'PoultryCare repo', ts: D(2026, 11, 22), tags: ['iş'], project: 'Kümes', seenAt: 1 },
  { id: 'c', type: 'file', fileName: 'Fatura-Mart.pdf', size: 6e6, ts: D(2024, 3, 15), tags: ['fatura'], ocr: 'invoice total 120' },
  { id: 'd', type: 'file', fileName: 'tatil.jpg', mime: 'image/jpeg', size: 2e6, ts: D(2025, 7, 2), color: 'blue', vtags: ['deniz', 'plaj'] },
  { id: 'e', type: 'note', text: 'اشتريت فَاتُورَة الكهرباء ٢٠٢٤', ts: D(2026, 11, 17), source: 'whatsapp', chat: 'Annem' },
  { id: 'f', type: 'note', text: 'İstanbul toplantısı ISTANBUL notları', ts: D(2026, 10, 5), todo: { done: true }, seenAt: 1 },
  { id: 'g', type: 'link', url: 'https://www.youtube.com/watch?v=1', title: 'Poultry video', ts: D(2023, 1, 1), deleted: true, seenAt: 1 },
  { id: 'h', type: 'note', text: 'kod: a(b) | c "tırnak" -tire e-posta', ts: D(2026, 11, 16), dev: 'pc', seenAt: 1 },
  { id: 'i', type: 'file', fileName: 'notes.txt', size: 900, ts: D(2026, 11, 9), source: 'pc', seenAt: 1, project: 'Kümes' },
  { id: 'j', type: 'note', text: 'Meeting with Ali about the invoice', ts: D(2026, 11, 20, 23), tags: ['work'], seenAt: 1 },
];

let pass = 0, fail = 0;
const run = (q, c) => { const r = Q.compile(q, { now: NOW, ...c }); return { ...r, ids: items.filter(r.test).map(i => i.id).join('') }; };
function t(q, want, opts = {}) {
  const r = run(q);
  const ok = r.ids === want && (opts.warn === undefined || (opts.warn ? r.warnings.length > 0 : r.warnings.length === 0)) && (!opts.sort || r.sort === opts.sort);
  if (ok) pass++; else { fail++; console.log(`✗ ${JSON.stringify(q)} → ${r.ids || '∅'} (beklenen ${want || '∅'})${r.warnings.length ? ' uyarı: ' + r.warnings.join('; ') : ''}${opts.sort ? ' sort=' + r.sort : ''}`); }
}
const eq = (name, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log(`✗ ${name}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); } };

// --- folding: Turkish + Arabic ---
eq('fold İ', Q.fold('İSTANBUL'), 'istanbul');
eq('fold ı', Q.fold('ılık'), 'ilik');
eq('fold şğüöç', Q.fold('şğüöç'), 'sguoc');
eq('fold harakat', Q.fold('فَاتُورَة'), 'فاتوره');
eq('fold tatweel', Q.fold('فـــاتورة'), 'فاتوره');
eq('fold alef', Q.fold('أإآ'), 'ااا');
eq('fold ى', Q.fold('على'), 'علي');
eq('fold digits', Q.fold('٢٠٢٤ ۱۲'), '2024 12');
// --- plain words ---
t('süt', 'a');
t('sut', 'a');                      // ü typed as u
t('FATURA', 'ac');                  // plain substring, case-insensitive (fatura in "faturayı" too)
t('istanbul', 'f');
t('İstanbul', 'f');
t('ISTANBUL toplantı', 'f');
t('poultry', 'bg');                 // deleted items are filtered by the app, not by the parser
t('فاتورة', 'e');                    // Arabic, harakat in the item ignored
t('فاتوره', 'e');                    // ة typed as ه
t('الكهرباء ٢٠٢٤', 'e');
t('invoice', 'cj');
// --- phrases ---
t('"faturayı öde"', 'a');
t('"öde faturayı"', '');
t('“with ali”', 'j');               // smart quotes
t('"tırnak', 'h', { warn: true });  // unclosed quote → to the end, warns
// --- OR / NOT / groups ---
t('süt OR invoice', 'acj');
t('süt VEYA plaj', 'ad');
t('süt | plaj', 'ad');
t('süt أو plaj', 'ad');
t('invoice -ali', 'c');
t('invoice NOT ali', 'c');
t('-poultry -invoice -süt', 'defhi');
t('(süt | plaj) -deniz', 'a');
t('(invoice | poultry) (ali | repo)', 'bj');
t('((süt', 'a', { warn: true });    // unclosed parenthesis
t('süt)', 'a', { warn: true });     // stray ")"
t('e-posta', 'h');                  // "-" inside a word is not NOT
t('süt OR', 'a', { warn: true });
// --- wildcards ---
t('poul*', 'bg');
t('f?tura', 'ac');
t('*bul', 'f', {});
t('fat*ra', 'ac');
// --- regex ---
t('/fatura-?mart/i', 'c');
t('/^süt/', 'a');
t('/inv(oice)? total \\d+/', 'c');
t('/[/', '');                       // not a closed regex → plain text "/[/"
t('/(a+)+$/', '', { warn: true });  // ReDoS shape → literal, warns, no freeze
t('/' + 'a'.repeat(250) + '/', '', { warn: true });
// --- fields ---
t('başlık:poultry', 'bg');
t('baslik:repo', 'b');
t('title:"poultrycare repo"', 'b');
t('عنوان:poultry', 'bg');
t('url:github', 'b');
t('url:/github\\.com\\/poul/', 'b');
t('site:youtube.com', 'g');
t('dosya:fatura', 'c');
t('uzantı:pdf', 'c');
t('ext:.txt', 'i');
t('ext:jp*', 'd');
t('etiket:ev', 'a');
t('#fatura', 'c');
t('tag:deniz', 'd');               // tags found in images count too
t('وسم:work', 'j');
t('#is', 'b');                      // # iş typed without ş
t('proje:kümes', 'bi');
t('project:kumes -dosya:notes', 'b');
t('sohbet:annem', 'e');
t('chat:Annem فاتورة', 'e');
t('kaynak:whatsapp', 'e');
t('source:pc', 'hi');
t('مصدر:واتساب', 'e');
t('tür:resim', 'd');
t('type:pdf', 'c');
t('renk:mavi', 'd');
t('color:blue', 'd');
t('لون:أزرق', 'd');
// --- is: / has: ---
t('is:yıldızlı', 'a');
t('is:starred', 'a');
t('is:görev', 'af');
t('is:bitti', 'f');
t('is:açık', 'a');
t('is:task -is:done', 'a');
t('is:bakılmadı', 'acde');
t('is:unread', 'acde');
t('is:silindi', 'g');
t('حالة:مميز', 'a');
t('has:resim', 'd');
t('has:link', 'bg');
t('has:pdf', 'c');
t('has:etiket', 'abcj');
t('has:gizem', 'abcdefghij', { warn: true }); // unknown → ignored with a warning
// --- dates ---
t('tarih:2024', 'c');
t('tarih:2024-03', 'c');
t('date:2025-07-02', 'd');
t('tarih:2024-01..2024-03', 'c');
t('tarih:2024..2025', 'cd');
t('tarih:>2026-10', 'abehij');
t('tarih:>=2026-10', 'abefhij');
t('tarih:<2024', 'g');
t('tarih:<=2024-03', 'cg');
t('tarih:dün', 'b');
t('date:yesterday', 'b');
t('تاريخ:أمس', 'b');
t('tarih:bugün', 'a');
t('tarih:"geçen hafta"', 'behj');   // Mon 16 – Sun 22 Nov
t('date:last_week', 'behj');
t('tarih:"bu ay"', 'abehij');
t('tarih:"geçen ay"', 'f');
t('son:7g', 'abej');                 // since 16 Nov 15:00
t('last:2w', 'abehj');
t('son:1a', 'abehij');
t('آخر:٧ي', 'abej');
t('tarih:2024-13', 'abcdefghij', { warn: true });
// --- size ---
t('boyut:>5mb', 'c');
t('size:<1kb', 'i');
t('boyut:1mb..3mb', 'd');
t('boyut:2mb', 'd');
t('حجم:>1MB', 'cd');
t('boyut:çok', 'abcdefghij', { warn: true });
// --- sort ---
t('süt sırala:eski', 'a', { sort: 'old' });
t('sort:new', 'abcdefghij', { sort: 'new' });
t('ترتيب:الأقدم invoice', 'cj', { sort: 'old' });
// --- combos ---
t('#fatura OR فاتورة', 'ce');
t('(proje:kümes | kaynak:whatsapp) tarih:>2026-11-10', 'be');
t('is:yıldızlı "faturayı öde" son:1g', 'a');
t('invoice -tarih:2024', 'j');
t('unknownfield:x', '');            // not a field → plain text "unknownfield:x"
t('https://github.com/poultry', 'b');
t('kod: a(b)', 'h', {});            // "kod" is not a field
t('', 'abcdefghij');

// unknown-value fields don't hide everything: they're ignored
{ const r = run('has:gizem süt'); eq('unknown has ignored', r.ids, 'a'); eq('unknown has warns', r.warnings.length > 0, true); }
// terms for highlighting skip excluded words
eq('terms', run('süt -fatura "tam ifade" poul*').terms, ['süt', 'tam ifade', 'poul']);
eq('deleted flag', run('is:silindi').deleted, true);
// isPlain: only syntax goes through the parser
eq('plain words', Q.isPlain('süt fatura 2024'), true);
eq('plain e-posta', Q.isPlain('e-posta adresi'), true);
eq('plain arabic', Q.isPlain('فاتورة الكهرباء'), true);
eq('not plain field', Q.isPlain('etiket:ev'), false);
eq('not plain neg', Q.isPlain('süt -fatura'), false);
eq('not plain OR', Q.isPlain('a OR b'), false);
eq('not plain wildcard', Q.isPlain('poul*'), false);
eq('not plain tag', Q.isPlain('#ev'), false);
// never throws on junk
for (const junk of ['(((', ')))', '-', '--', '|||', '"', '/', '#', ':', 'tarih:', '/\\/', '-(', 'OR OR', '"" -""', '\u0000'])
  try { Q.compile(junk, { now: NOW }).test(items[0]); pass++; } catch (e) { fail++; console.log('✗ threw on', JSON.stringify(junk), e.message); }
// speed: 10k items, a busy query, < 50 ms
{
  const many = Array.from({ length: 10000 }, (_, k) => ({ id: 'x' + k, type: k % 3 ? 'note' : 'link', text: `kayıt ${k} süt fatura ${k % 7 ? 'ev' : 'iş'} poultry`, url: k % 3 ? '' : 'https://ex.com/' + k, ts: NOW - k * 36e5, tags: [k % 2 ? 'ev' : 'iş'] }));
  const r = Q.compile('(süt | invoice) -#iş poul* tarih:>2026-01 has:link', { now: NOW });
  many.forEach(r.test); // warm the text cache like the app's index does
  const t0 = performance.now(); const n = many.filter(r.test).length; const ms = performance.now() - t0;
  if (ms < 50 && n > 0) pass++; else { fail++; console.log(`✗ 10k süre ${ms.toFixed(1)} ms, ${n} sonuç`); }
  console.log(`10k kayıt: ${ms.toFixed(1)} ms, ${n} sonuç`);
}

console.log(`${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
