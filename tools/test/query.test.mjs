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
// --- 132: picture colours (palette from pixels) + renk:/color:/لون: on hues ---
{
  const px = (...cols) => { const a = []; for (const [rgb, n] of cols) for (let k = 0; k < n; k++) a.push(...rgb, 255); return new Uint8ClampedArray(a); };
  eq('pal sky', Q.palette(px([[40, 110, 220], 70], [[250, 250, 250], 30])), ['blue', 'white']);
  eq('pal forest', Q.palette(px([[40, 140, 50], 60], [[110, 70, 30], 40])), ['green', 'brown']);
  eq('pal sunset', Q.palette(px([[240, 130, 20], 50], [[230, 30, 40], 30], [[250, 220, 40], 20])), ['orange', 'red', 'yellow']);
  eq('pal bw photo', Q.palette(px([[20, 20, 20], 40], [[128, 128, 128], 30], [[235, 235, 235], 30])), ['black', 'gray', 'white', 'bw']);
  eq('pal pink purple', Q.palette(px([[240, 140, 190], 50], [[130, 50, 200], 50])), ['pink', 'purple']);
  eq('pal small bits ignored', Q.palette(px([[40, 110, 220], 95], [[230, 30, 40], 5])), ['blue']);
  eq('pal transparent', Q.palette(px([[0, 0, 0], 0])), []);
  eq('pal sepia not bw', Q.palette(px([[112, 66, 20], 100])).includes('bw'), false);
  eq('COLOR_OF ar', Q.COLOR_OF('أزرق'), 'blue');
  eq('COLOR_OF tr fold', Q.COLOR_OF('KIRMIZI'), 'red');
  const pics = [
    { id: 'p', type: 'file', fileName: 'deniz.jpg', mime: 'image/jpeg', ts: NOW, hues: ['blue', 'white'] },
    { id: 'q', type: 'file', fileName: 'eski.jpg', mime: 'image/jpeg', ts: NOW, hues: ['gray', 'black', 'bw'] },
    { id: 'r', type: 'file', fileName: 'orman.png', mime: 'image/png', ts: NOW, hues: ['green', 'brown'] },
    { id: 's', type: 'note', text: 'mavi etiketli not', ts: NOW, color: 'blue' },
  ];
  const pt = (q, want) => { const r = Q.compile(q, { now: NOW }); eq('hues ' + q, pics.filter(r.test).map(i => i.id).join(''), want); };
  pt('renk:mavi', 'ps'); pt('color:blue', 'ps'); pt('لون:أزرق', 'ps'); pt('renk:yeşil', 'r'); pt('renk:kahverengi', 'r');
  pt('renk:siyah-beyaz', 'q'); pt('color:bw', 'q'); pt('renk:gri tür:resim', 'q'); pt('renk:mavi -renk:beyaz', 's');
  pt('renk:yeşil | renk:gri', 'qr'); pt('"siyah beyaz"', 'q'); pt('mavi has:resim', 'p'); pt('أخضر tür:resim', 'r');
}
// 104a: plain sentence → filter chips (tr/en/ar); each chip runs through compile() like typed syntax
{
  const nl = (q, chats) => Q.natural(q, { chats });
  const ids = q => { const n = nl(q, ['Annem', 'İş grubu']); return items.filter(Q.compile(n.filter || '', { now: NOW }).test).map(i => i.id).join(''); };
  const c = (q, labels, rest) => { const n = nl(q, ['Annem', 'İş grubu']); eq('nl ' + q, [n.chips.map(x => x.label), n.rest], [labels, rest]); };
  c('geçen hafta fatura', ['Geçen hafta'], 'fatura');
  c('fatura dün', ['Dün'], 'fatura');
  c('mart 2024 fatura', ['Mart 2024'], 'fatura');
  c('2024 mart', ['Mart 2024'], '');
  c("mart'ta 2024", ['Mart 2024'], '');
  c('march 2024 invoice', ['Mart 2024'], 'invoice');
  c('مارس 2024', ['Mart 2024'], '');
  c('pdf', ['PDF'], '');
  c('fotoğraflar deniz', ['Resim'], 'deniz');
  c('telefondan resimler', ['Telefon', 'Resim'], '');
  c("whatsapp'tan annem", ['WhatsApp', 'Annem'], '');
  c('whatsapp annem kahvaltı', ['WhatsApp', 'Annem'], 'kahvaltı');
  c('whatsapp ahmet', ['WhatsApp'], 'ahmet');
  c('son 7 gün', ['Son 7 gün'], '');
  c('last 2 weeks links', ['Son 2 hafta', 'Link'], '');
  c('صور الاسبوع الماضي', ['Resim', 'Geçen hafta'], '');
  c('أمس', ['Dün'], '');
  c('videolar', ['Video'], '');
  c('linkedin profili', [], 'linkedin profili');  // "link" inside a word is not a chip
  c('süt al', [], 'süt al');
  c('pdf ve resim', ['PDF', 'Resim'], ''); // 105a: "ve" is a filler word
  // 105a: chats anywhere, a month without a year, filler words; 105d: questions
  const nn = q => Q.natural(q, { chats: ['Annem', 'Ali Veli'], now: NOW }), c2 = (q, labels, rest) => { const n = nn(q); eq('nl ' + q, [n.chips.map(x => x.label), n.rest], [labels, rest]); };
  c2('geçen ay annemin attığı fotoğraflar', ['Geçen ay', 'Annem', 'Resim'], '');
  c2("Ali'den gelen pdf", ['Ali Veli', 'PDF'], 'gelen');
  c2('annemden tarif', ['Annem'], 'tarif');
  c2('ekimde fatura', ['Ekim 2026'], 'fatura');
  c2('geçen ekim fatura', ['Ekim 2026'], 'fatura'); // in November: the October just gone
  c2('geçen kasım', ['Kasım 2025'], '');
  c2('martta fatura', ['Mart 2026'], 'fatura');
  c2('aralık', [], 'aralık'); // "gap": a bare ambiguous month is a word
  c2('ocak tamiri', [], 'ocak tamiri');
  c2('in march invoice', ['Mart 2026'], 'invoice');
  c2('show me the invoices from last week', ['Geçen hafta'], 'invoices');
  c2('kümeste kaç sensör var', [], 'kümeste sensör');
  c2('ne var', [], 'ne var'); // never every word
  c2('dünkü notlar', ['Dün', 'Not'], '');
  c2('الصور التي ارسلتها امي', ['Resim'], 'ارسلتها امي');
  c2('صور في مارس', ['Resim', 'Mart 2026'], '');
  c2('annem', ['Annem'], '');
  c2('ann', [], 'ann');
  eq('nl chat filter', nn('annemin fotoğrafları').filter, 'tür:image sohbet:"Annem"');
  eq('nl chat ids', items.filter(Q.compile(nn('annemden').filter, { now: NOW }).test).map(i => i.id).join(''), 'e');
  const it = (q, want) => eq('intent ' + q, Q.intent(q), want);
  it('kümeste kaç sensör var', 'ask'); it('fatura ödendi mi', 'ask'); it('faturayı ödedim mü', 'ask'); it('fatura?', 'ask'); it('what is my wifi password', 'ask');
  it('كم عدد الحساسات', 'ask'); it('هل دفعت الفاتورة؟', 'ask'); it('fatura', null); it('iş toplantısı', null); it('mi', null); it('ne', null); it('etiket:x?', null);
  it('nasıl', null); it('sensör sayısı kaç', 'ask'); it('fatura ne zaman', 'ask'); it('poultry care notes', null); it('kim', null);
  eq('nl span', (({ chips }) => chips.map(x => [x.a, x.b]))(nl('fatura geçen hafta pdf')), [[7, 18], [19, 22]]);
  eq('nl kinds OR', nl('pdf resim').filter, '(tür:pdf | tür:image)');
  eq('nl ids pdf', ids('pdf'), 'c');
  eq('nl ids mart 2024', ids('mart 2024'), 'c');
  eq('nl ids geçen hafta', ids('geçen hafta'), 'behj');
  eq('nl ids whatsapp annem', ids('whatsapp annem'), 'e');
  eq('nl ids resim', ids('foto'), 'd');
  eq('nl ids son 3 gün', ids('son 3 gün'), 'abj');
}
// 104b: typo tolerance
{
  const ok = (a, b, want) => eq(`near ${a}~${b}`, Q.near(Q.fold(a), Q.fold(b)), want);
  ok('fatura', 'faturra', true); ok('fatura', 'ftaura', true); ok('fatura', 'fatur', true); ok('fatura', 'fatira', true);
  ok('fatura', 'fxtxra', false); ok('toplantı', 'toplnati', true); ok('toplantısı', 'toplanitsi', true); ok('görev', 'gorev', true);
  ok('kahvaltı', 'kahvalt', true); ok('kahvaltı', 'kavhalti', true); ok('ev', 'iş', false);
}
// 105b: direct answer from the best results (on the device), 105g: similar searches
{
  eq('content tr', Q.content('Kümeste kaç sensör var?'), ['kumeste', 'sensor']);
  eq('content en', Q.content('How many sensors are in the coop?'), ['sensors', 'in', 'coop']);
  eq('content ar', Q.content('كم حساس في الحظيرة؟'), ['حساس', 'حظيره']);
  eq('wantsNum tr', Q.wantsNum('kümeste kaç sensör var'), true);
  eq('wantsNum ne kadar', Q.wantsNum('fatura ne kadar?'), true);
  eq('wantsNum en', Q.wantsNum('how much was the invoice'), true);
  eq('wantsNum ar', Q.wantsNum('كم حساس'), true);
  eq('wantsNum no', Q.wantsNum('wifi şifresi ne?'), false);
  const docs = [
    { id: 'n1', texts: ['Kümes notları', 'Bugün kümese gittim. Kümeste 12 sensör var, ikisi bozuk. Yarın tamir.'] },
    { id: 'n2', texts: ['Sensör fiyatları', 'Sensör başına 40 TL.'] },
    { id: 'n3', texts: ['Wifi', 'Ev wifi şifresi: kartal1923'] },
    { id: 'n4', texts: ['Invoice', 'The March invoice total was 120 USD. Paid on time.'] },
    { id: 'n5', texts: ['حظيرة', 'في الحظيرة 8 حساسات تعمل.'] },
  ];
  const an = (q, id, has) => { const r = Q.answer(q, docs); eq('answer ' + q, r ? [r.id, r.text.includes(has)] : null, id ? [id, true] : null); };
  an('Kümeste kaç sensör var?', 'n1', '12 sensör');
  an('wifi şifresi ne?', 'n3', 'kartal1923');
  an('how much was the invoice?', 'n4', '120');
  an('كم حساس في الحظيرة؟', 'n5', '8');
  an('kümeste kaç tavuk var?', null); // a number is asked but no sentence has both words
  an('ne?', null);
  eq('answer long cut', Q.answer('uzun cümle', [{ id: 'x', texts: ['uzun cümle ' + 'çok '.repeat(120)] }]).text.length <= 241, true);
  eq('qsim same', Q.qsim('fatura', 'faturalar'), 1);
  eq('qsim sentence', Q.qsim('mart faturası', 'fatura mart'), 1);
  eq('qsim half', Q.qsim('mart faturası', 'nisan faturası'), .5);
  eq('qsim none', Q.qsim('wifi', 'fatura'), 0);
  eq('qsim filler', Q.qsim('bana faturaları göster', 'fatura'), 1);
  eq('qsim ar', Q.qsim('الفاتورة', 'فاتورة'), 1);
  // 105h: Arabic-Indic digits are a number too
  eq('answer ar digits', Q.answer('كم فاتورة الكهرباء؟', [{ id: 'c3', texts: ['فاتورة الكهرباء ٢٠٠ ريال لهذا الشهر'] }])?.id, 'c3');
}
// 105f: picture fingerprints and the words read in a picture
{
  const px = f => { const a = new Uint8ClampedArray(72 * 4); for (let k = 0; k < 72; k++) { const v = f(k % 9, k / 9 | 0); a[k * 4] = a[k * 4 + 1] = a[k * 4 + 2] = v; a[k * 4 + 3] = 255; } return a; };
  const grad = Q.dhash(px(x => 255 - x * 28)), grad2 = Q.dhash(px(x => 250 - x * 27)), flip = Q.dhash(px(x => x * 28)), checker = Q.dhash(px((x, y) => ((x + y) % 2) * 200));
  eq('dhash 16 hex', /^[0-9a-f]{16}$/.test(grad), true);
  eq('dhash gradient', grad, 'ffffffffffffffff');
  eq('dhash flipped', flip, '0000000000000000');
  eq('dhash same picture darker', Q.hamming(grad, grad2), 0);
  eq('hamming opposite', Q.hamming(grad, flip), 64);
  eq('hamming missing', Q.hamming(grad, undefined), 64);
  eq('hamming one bit', Q.hamming('ffff0000ffff0000', 'ffff0000ffff0001'), 1);
  eq('imgSim same', Q.imgSim({ ph: grad, hues: ['blue'] }, { ph: grad2, hues: ['blue'] }) > .9, true);
  eq('imgSim close', Q.imgSim({ ph: 'ffff0000ffff0000' }, { ph: 'ffff0000ffff00ff' }) >= .75, true); // 8 bits off = the same screenshot
  eq('imgSim other', Q.imgSim({ ph: grad, hues: ['blue'] }, { ph: flip, hues: ['red'] }), 0);
  eq('imgSim colour only', Q.imgSim({ ph: grad, hues: ['blue', 'white'] }, { ph: checker, hues: ['blue', 'white'] }) < .42, true); // colours alone never make a hit
  eq('imgSim no hash', Q.imgSim({ ph: grad }, { hues: [] }), 0);
  eq('ocrWords', Q.ocrWords('Fatura No: 12345 — Türk Telekom fatura tutarı 249,90 TL'), 'Fatura Türk Telekom tutarı');
  eq('ocrWords ar', Q.ocrWords('فاتورة الكهرباء ٢٠٠ ريال'), 'فاتورة الكهرباء ريال');
  eq('ocrWords en max', Q.ocrWords('one two three four five six seven eight nine', 3).split(' ').length, 3);
  eq('ocrWords empty', Q.ocrWords(''), '');
}
// speed: 10k items, a busy query, < 50 ms
{
  const many = Array.from({ length: 10000 }, (_, k) => ({ id: 'x' + k, type: k % 3 ? 'note' : 'link', text: `kayıt ${k} süt fatura ${k % 7 ? 'ev' : 'iş'} poultry`, url: k % 3 ? '' : 'https://ex.com/' + k, ts: NOW - k * 36e5, tags: [k % 2 ? 'ev' : 'iş'] }));
  const r = Q.compile('(süt | invoice) -#iş poul* tarih:>2026-01 has:link', { now: NOW });
  many.forEach(r.test); // warm the text cache like the app's index does
  let ms = Infinity, n = 0; // best of 5: other work on the machine (a second session) shouldn't fail the test
  for (let k = 0; k < 5; k++) { const t0 = performance.now(); n = many.filter(r.test).length; ms = Math.min(ms, performance.now() - t0); }
  if (ms < 50 && n > 0) pass++; else { fail++; console.log(`✗ 10k süre ${ms.toFixed(1)} ms, ${n} sonuç`); }
  console.log(`10k kayıt: ${ms.toFixed(1)} ms, ${n} sonuç`);
}

// --- 95d: a date in a picture's text ---
const di = x => Q.dateIn(x, NOW)?.due ?? null;
eq('dateIn dd.mm.yyyy + saat', di('Konser 28.11.2026 saat 20:00'), '2026-11-28T20:00');
eq('dateIn dd/mm/yy', di('Son ödeme tarihi: 05/12/26'), '2026-12-05');
eq('dateIn iso', di('2026-12-01'), '2026-12-01');
eq('dateIn tr ay', di('Toplantı 3 Aralık 14:30'), '2026-12-03T14:30');
eq('dateIn en', di('Nov 28, 2026 at 7:30'), '2026-11-28T07:30');
eq('dateIn ar', di('موعد ٢٨ نوفمبر ٢٠٢٦'), '2026-11-28');
eq('dateIn yılsız yakın', di('Ocak 5'), '2027-01-05');
eq('dateIn yılsız geçmiş', di('10 Kasım'), null);
eq('dateIn geçmiş', di('geçmiş 01.01.2020'), null);
eq('dateIn sürüm/fiyat', di('v1.2.3 price 12.50 sürüm 12.05'), null);
eq('dateIn en yakını', di('Fatura 15.01.2027\nkonser 30.11.2026'), '2026-11-30');
eq('dateIn satır', Q.dateIn('Bilet\nKonser 28.11.2026', NOW)?.line, 'Konser 28.11.2026');

console.log(`${pass} geçti, ${fail} kaldı`);
process.exit(fail ? 1 : 0);
