// 148: how many AI tokens does organizing cost? Before/after on the same data, with a stand-in `claude` (tools/tokbench/fake-claude.mjs)
// that reports usage from the real prompt sizes — no model is called, nothing leaves the PC, the owner's bridge/config are not touched.
// Data: a 1000-record WhatsApp archive (as bridge/import.mjs makes it) + 20 pictures (10 text-heavy, 10 photos).
// run: node tools/tokbench.mjs [old-git-ref=2604a46]
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), REF = process.argv[2] || '2604a46';
const T = join(tmpdir(), 'nts-tokbench-' + process.pid); mkdirSync(T, { recursive: true });

// ---------- data ----------
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
const NOISE = ['ok', 'Tamam', '👍', '😂😂', 'tmm', '<Medya dahil edilmedi>', 'Bu mesaj silindi', 'evet', 'haha', 'Teşekkürler', 'شكرا', '❤️', 'Günaydın', 'peki', 'Selam'];
const SHORT = ['yarın 10da toplantı var unutma', 'Ekmek ve süt al eve gelirken', 'Kümes 3 sensör arızalı, Ahmet bakacak', 'Fatura 1.240 TL cuma son gün', 'Dişçi randevusu salı 14:30',
  'call the bank about the card', 'موعد الطبيب يوم الأحد', 'Arabanın sigortası mart ayında bitiyor', 'Annemin doğum günü 12 Aralık', 'Poultrycare demo perşembe saat 3'];
const LINKS = ['https://www.youtube.com/watch?v=dQw4w9', 'https://github.com/mohamed/nts', 'https://www.nefisyemektarifleri.com/mercimek', 'https://news.ycombinator.com/item?id=4242', 'https://www.trendyol.com/urun/123',
  'https://medium.com/@x/how-to-sqlite', 'https://www.instagram.com/p/Cx12', 'https://maps.app.goo.gl/abc'];
const LINES = ['Ne zaman geliyorsun?', 'Akşam 7 gibi', 'Tamam bekliyorum', 'Kümesteki fanlar yine durdu', 'Elektrikçi yarın gelecek', 'Fiyat ne kadar dedi?', '3.500 TL istiyor', 'Pahalı ama yapalım',
  'Faturayı attım sana', 'Toplantı notlarını paylaşır mısın', 'Bu hafta hasat var', 'Yemi siparişini verdim', 'Okuldan aradılar', 'Hafta sonu pikniğe gidelim mi', 'Hava yağmurlu görünüyor'];
const t0 = new Date(2026, 9, 1).getTime(), items = [];
for (let n = 0; n < 1000; n++) {
  const ts = t0 + n * 3.1e6, r = rnd(), id = 'wa' + n;
  if (r < .30) items.push({ id, type: 'note', text: pick(NOISE), ts });
  else if (r < .55) items.push({ id, type: 'note', text: pick(SHORT) + (rnd() < .5 ? '' : ' ' + n), ts });
  else if (r < .65) items.push({ id, type: 'link', url: pick(LINKS), text: '', ts });
  else if (r < .90) { const k = 3 + Math.floor(rnd() * 10), log = Array.from({ length: k }, () => pick(['Ali: ', 'Ben: ']) + pick(LINES)); items.push({ id, type: 'note', title: `${k} mesaj`, text: log.join('\n'), conv: { n: k }, ts }); }
  else { const src = items[Math.floor(rnd() * items.length)] || { type: 'note', text: 'iletildi' }; items.push({ ...src, id, ts }); } // forwarded again
}
for (const it of items) Object.assign(it, { source: 'whatsapp', chat: 'Aile', archive: true, tags: [], pending: true });
// pictures: 10 screenshots / receipts with text, 10 photos (no text)
const pics = [];
for (let n = 0; n < 20; n++) {
  const f = join(T, `p${n}.jpg`);
  if (n < 10) execFileSync('magick', ['-size', '1000x700', 'xc:white', '-fill', 'black', '-pointsize', '30', '-annotate', '+40+80',
    `INVOICE No ${1000 + n}\nCustomer: Mohamed Farm Ltd\nDate: 2026-11-${10 + n}\nChicken feed 20 bags 4,800 TL\nVaccine set 1,250 TL\nDelivery to Kumes 3 tomorrow morning\nTotal amount due 6,050 TL\nPlease pay before Friday`, f]);
  else execFileSync('magick', ['-size', '1000x700', `plasma:${['green-blue', 'orange-yellow', 'gray-white', 'red-brown', 'blue-cyan'][n % 5]}`, '-blur', '0x2', f]);
  pics.push({ id: 'img' + n, type: 'file', fileName: `IMG_${n}.jpg`, mime: 'image/jpeg', ts: t0 + n * 9e5, tags: [], pending: true, image: readFileSync(f).toString('base64') });
}

// ---------- the app's batching ----------
const old = list => { const out = []; for (let i = 0; i < list.length; i += 25) out.push(list.slice(i, i + 25)); return out; };
const now = list => { const out = []; let b = [], im = 0; // 148: up to 60 a call, at most 6 pictures
  for (const i of list) { if (b.length >= 60 || (i.image && im >= 6)) { out.push(b); b = []; im = 0; } b.push(i); if (i.image) im++; }
  if (b.length) out.push(b); return out; };

// ---------- run one bridge ----------
async function run(name, serverSrc, withThrift, batcher, port) {
  const home = join(T, name), bin = join(home, 'bin'), br = join(home, 'app', 'bridge');
  for (const d of [bin, br, join(home, '.config', 'hizli-note'), join(home, 'tmp')]) mkdirSync(d, { recursive: true });
  writeFileSync(join(br, 'server.mjs'), serverSrc);
  if (withThrift) copyFileSync(join(ROOT, 'bridge', 'thrift.mjs'), join(br, 'thrift.mjs'));
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nexec node ${join(ROOT, 'tools', 'tokbench', 'fake-claude.mjs')} "$@"\n`, { mode: 0o755 });
  writeFileSync(join(home, '.config', 'hizli-note', 'bridge.json'), JSON.stringify({ port, token: 'bench', origins: [], ai: 'claude', dailyTokens: 0 }));
  const log = join(home, 'fake.jsonl');
  const p = spawn('node', [join(br, 'server.mjs')], { env: { ...process.env, HOME: home, TMPDIR: join(home, 'tmp'), PATH: `${bin}:${process.env.PATH}`, FAKE_LOG: log, NTS_DATA_DIR: join(home, 'data') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let errs = ''; p.stderr.on('data', d => errs += d);
  for (let k = 0; k < 50; k++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 100)); } }
  const call = async (path, body) => { const r = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { authorization: 'Bearer bench', 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(path + ' ' + JSON.stringify(j) + errs); return j; };
  const res = {};
  for (const [label, list] of [['wa', items], ['pics', pics]]) {
    const before = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0; let got = 0;
    for (const b of batcher(list)) got += (await call('/organize', { items: structuredClone(b), tags: ['iş', 'ev', 'sağlık'], projects: ['poultrycare'] })).items.length;
    const rows = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).slice(before).map(JSON.parse) : [];
    res[label] = { calls: rows.length, tok: rows.reduce((s, u) => s + u.input_tokens + u.cache_creation_input_tokens + u.output_tokens + Math.round(u.cache_read_input_tokens / 10), 0), answered: got, of: list.length };
  }
  // the same archive again (a second device, or "organize again"): only the new bridge remembers
  const before = readFileSync(log, 'utf8').split('\n').filter(Boolean).length;
  for (const b of batcher(items)) await call('/organize', { items: structuredClone(b), tags: ['iş'], projects: [] });
  const rows = readFileSync(log, 'utf8').split('\n').filter(Boolean).slice(before).map(JSON.parse);
  res.again = { calls: rows.length, tok: rows.reduce((s, u) => s + u.input_tokens + u.cache_creation_input_tokens + u.output_tokens + Math.round(u.cache_read_input_tokens / 10), 0) };
  if (withThrift) res.usage = await (await fetch(`http://127.0.0.1:${port}/usage`, { headers: { authorization: 'Bearer bench' } })).json();
  p.kill(); return res;
}

const oldSrc = execFileSync('git', ['-C', ROOT, 'show', `${REF}:bridge/server.mjs`], { encoding: 'utf8' });
const A = await run('old', oldSrc, false, old, 8794), B = await run('new', readFileSync(join(ROOT, 'bridge', 'server.mjs'), 'utf8'), true, now, 8795);
const f = n => n.toLocaleString('tr-TR'), pct = (a, b) => `-%${Math.round((1 - b / a) * 100)}`;
console.log(`\n148 · token tezgâhı (sahte claude, gerçek istem boyları; ${REF} → çalışma ağacı)\n`);
console.log('durum                         önce (çağrı / token)     sonra (çağrı / token)    fark');
for (const [k, l] of [['wa', '1000 WhatsApp kaydı'], ['pics', '20 resim (10 yazılı)'], ['again', 'aynı arşiv 2. kez']])
  console.log(`${l.padEnd(29)} ${(A[k].calls + ' / ' + f(A[k].tok)).padEnd(24)} ${(B[k].calls + ' / ' + f(B[k].tok)).padEnd(24)} ${pct(A[k].tok, B[k].tok)}`);
console.log(`\ncevaplanan kayıt: önce ${A.wa.answered}/${A.wa.of}, sonra ${B.wa.answered}/${B.wa.of}; resim ${A.pics.answered}/${B.pics.answered} of ${pics.length}`);
console.log('yeni köprünün /usage özeti:', JSON.stringify({ month: B.usage.month, calls: B.usage.calls, saved: B.usage.saved, kinds: B.usage.kinds }));
rmSync(T, { recursive: true, force: true });
