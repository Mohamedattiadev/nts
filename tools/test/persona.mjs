// 105: "teknolojiden anlamayan biri ilk denemede bulmalı" — 3 personas × 5 everyday search sentences (tr / en / ar) on a seeded set
// of ~20 items; each must bring its item into the first 3 of Ara. Also 105h: the same with the network cut (service worker cache).
// run: NTS_URL=http://127.0.0.1:8792/ node tools/test/persona.mjs   (OFFLINE=0 skips the offline round)
import { chromium } from '/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
const URL0 = process.env.NTS_URL || 'http://127.0.0.1:8790/', d = 864e5;
const items = t => {
  const lm = new Date(t); lm.setDate(15); lm.setMonth(lm.getMonth() - 1); // the middle of last month
  return [
    { id: 'a1', type: 'note', text: "Kümes 3'te 12 sensör var, ikisi arızalı", ts: t - 2 * d },
    { id: 'a2', type: 'note', text: 'Ev wifi şifresi: kus-kanadi-42', ts: t - 40 * d },
    { id: 'a3', type: 'file', fileName: 'IMG-20261015-WA0003.jpg', mime: 'image/jpeg', title: 'Bayramda bahçede', chat: 'Annem', source: 'whatsapp', ts: +lm },
    { id: 'a4', type: 'note', text: 'Diş randevusu Salı 14:30, Dr. Yılmaz', ts: t - 3 * d },
    { id: 'a5', type: 'link', url: 'https://www.nefisyemektarifleri.com/mercimek-corbasi', title: 'Mercimek çorbası tarifi', ts: t - 20 * d },
    { id: 'b1', type: 'note', text: 'Flight to Berlin on Dec 3, booking ref XK29Q, gate opens 06:10', ts: t - 5 * d },
    { id: 'b2', type: 'link', url: 'https://www.youtube.com/watch?v=abc123', title: 'How to fix a leaking faucet in 5 minutes', ts: t - 9 * d },
    { id: 'b3', type: 'note', text: 'Invoice from Acme: $1,200 due Friday', ts: t - 4 * d },
    { id: 'b4', type: 'note', title: 'Meeting notes', text: 'Q4 roadmap meeting: ship search v2, hire one designer', ts: t - 6 * d },
    { id: 'b5', type: 'note', text: 'Car insurance renews in March, policy number 55-221-09', ts: t - 30 * d },
    { id: 'c1', type: 'note', text: 'موعد طبيب الأسنان يوم الأحد الساعة ٥', ts: t - 2 * d },
    { id: 'c2', type: 'note', text: 'وصفة كبسة الدجاج: أرز بسمتي، دجاج، بهارات', ts: t - 12 * d },
    { id: 'c3', type: 'note', text: 'فاتورة الكهرباء ٢٠٠ ريال لهذا الشهر', ts: t - 7 * d },
    { id: 'c4', type: 'note', text: 'رقم جواز السفر A1234567 ينتهي ٢٠٢٩', ts: t - 60 * d },
    { id: 'c5', type: 'file', fileName: 'family.jpg', mime: 'image/jpeg', title: 'صورة العائلة في العيد', chat: 'أمي', source: 'whatsapp', ts: t - 15 * d },
    // look-alikes that must not win
    { id: 'x1', type: 'note', text: 'Kümes temizliği cumartesi', ts: t - d },
    { id: 'x2', type: 'note', text: 'Elektrik faturası 340 TL ödendi', ts: t - 8 * d },
    { id: 'x3', type: 'note', text: 'Berlin trip ideas: museums, Tempelhof', ts: t - 50 * d },
    { id: 'x4', type: 'note', text: 'Invoice template for clients', ts: t - 70 * d },
    { id: 'x5', type: 'note', text: 'موعد اجتماع العمل يوم الاثنين', ts: t - d },
  ].map(i => ({ updatedAt: t, source: 'manual', ...i }));
};
const CASES = [
  ['Ayşe (65, tr)', 'kümeste kaç sensör var?', 'a1'], ['Ayşe (65, tr)', 'wifi şifresi neydi', 'a2'], ['Ayşe (65, tr)', 'geçen ay annemin attığı fotoğraflar', 'a3'],
  ['Ayşe (65, tr)', 'diş randevum ne zaman', 'a4'], ['Ayşe (65, tr)', 'mercimek çorbası nasıl yapılır', 'a5'],
  ['John (40, en)', 'when is my flight to berlin', 'b1'], ['John (40, en)', 'leaking faucet video', 'b2'], ['John (40, en)', 'how much was the acme invoice?', 'b3'],
  ['John (40, en)', 'notes from the roadmap meeting', 'b4'], ['John (40, en)', 'car insurance policy number', 'b5'],
  ['Fatima (30, ar)', 'متى موعد الأسنان', 'c1'], ['Fatima (30, ar)', 'وصفة الكبسة', 'c2'], ['Fatima (30, ar)', 'كم فاتورة الكهرباء؟', 'c3'],
  ['Fatima (30, ar)', 'رقم الجواز', 'c4'], ['Fatima (30, ar)', 'صور العيد من أمي', 'c5'],
];
const b = await chromium.launch(); let fail = 0;
for (const off of process.env.OFFLINE === '0' ? [false] : [false, true]) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), p = await c.newPage(), errs = [];
  await c.addInitScript(() => { localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); });
  await p.route(/:8787\//, r => r.abort());
  p.on('console', m => { if (m.type() === 'error' && !/8787|Failed to load resource|ERR_|net::/.test(m.text())) errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL0, { waitUntil: 'networkidle' });
  if (off) { // the app from the service worker's cache, no network at all
    await p.evaluate(() => navigator.serviceWorker.ready); await p.reload({ waitUntil: 'networkidle' });
    await c.setOffline(true); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
  }
  await p.evaluate(async its => { await DB.putMany('items', its); await reloadFromDB(); setMode('find'); }, items(Date.now()));
  console.log(off ? '\n— ÇEVRİMDIŞI (ağ kapalı, uygulama SW önbelleğinden) —' : '— ÇEVRİMİÇİ —', 'online:', await p.evaluate(() => navigator.onLine));
  let ok = 0;
  for (const [who, q, want] of CASES) {
    const r = await p.evaluate(async q => { const i = $('#input'); i.value = q; i.dispatchEvent(new Event('input')); await new Promise(r => setTimeout(r, 160));
      return { top: Find.top.slice(0, 3), chips: (S.nl?.chips || []).map(c => c.label), ans: !$('#hits .f-ans').hidden ? $('#hits .f-ans-t')?.innerText : '' }; }, q);
    const k = r.top.indexOf(want), pass = k >= 0; ok += pass;
    console.log(`${pass ? '✓' : '✗'} ${who.padEnd(16)} "${q}" → ${pass ? '#' + (k + 1) : 'YOK ' + r.top.join(',')}${r.chips.length ? ' [' + r.chips.join('][') + ']' : ''}${r.ans ? ' · cevap: ' + r.ans.slice(0, 50) : ''}`);
  }
  if (off) { // what needs the network says so instead of failing silently
    const m = await p.evaluate(async () => { Mic.SR ||= class { }; Mic.start(); await new Promise(r => setTimeout(r, 50)); return $('#toast').innerText; });
    console.log('mikrofon (çevrimdışı):', m);
  }
  console.log(`${ok}/${CASES.length} ilk 3'te`, errs.length ? '\nKONSOL: ' + errs.join('\n') : '· konsol hatası yok');
  fail += CASES.length - ok + errs.length; await c.close();
}
await b.close(); process.exit(fail ? 1 : 0);
