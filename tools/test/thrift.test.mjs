// 148: tests for bridge/thrift.mjs (noise, same content, tesseract text check, usage sums, daily cap, cache). Run: node tools/test/thrift.test.mjs
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = mkdtempSync(join(tmpdir(), 'thrift-')); process.env.NTS_DATA_DIR = dir;
const T = await import('../../bridge/thrift.mjs');
let ok = 0, bad = 0; const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('✗', name, 'got', got, 'want', want); } };
const note = text => ({ id: 'x', type: 'note', text });
for (const t of ['ok', 'Tamam.', '👍', '😂😂😂', '<Medya dahil edilmedi>', 'Bu mesaj silindi', 'شكرا', 'تم حذف هذه الرسالة', 'haha', '  ', 'Teşekkürler!', '❤️', 'evet', 'This message was deleted'])
  eq('noise ' + t, !!T.noiseOf(note(t)), true);
for (const t of ['süt al', 'yarın 10da toplantı', 'ok google ayarı bozuk', 'Fatura 1240 TL', 'موعد الطبيب يوم الأحد', 'evet ama cuma olmaz', '12:30'])
  eq('real ' + t, !!T.noiseOf(note(t)), t === '12:30'); // a bare time is symbols+digits: noise
eq('link never noise', T.noiseOf({ id: 'l', type: 'link', url: 'https://x.y', text: 'ok' }), null);
eq('conv never noise', T.noiseOf({ id: 'c', type: 'note', text: 'ok', conv: { n: 3 } }), null);
eq('noise answer', T.noiseOf(note('Tamam')), { id: 'x', title: 'Tamam', summary: '', tags: [], local: true });
eq('same text', T.sameKey(note('Merhaba  Dünya')) === T.sameKey(note('merhaba dünya')), true);
eq('same url w/o query', T.sameKey({ type: 'link', url: 'https://a.b/c?utm=1' }) === T.sameKey({ type: 'link', url: 'https://a.b/c' }), true);
eq('image no same key', T.sameKey({ type: 'file', image: 'abc' }), null);
eq('goodText receipt', !!T.goodText('INVOICE No 1001\nCustomer: Mohamed Farm Ltd\nDate: 2026-11-10\nChicken feed 20 bags 4,800 TL\nVaccine set 1,250 TL\nTotal 6,050 TL'), true);
eq('goodText junk', T.goodText('~ | :: ,, ; ` ^^ ## %% ~ | ;; ` a b c d e f g h i j k l m'), null);
eq('goodText short', T.goodText('Hello world'), null);
eq('weight', T.weight({ in: 10, cw: 100, cr: 1000, out: 50 }), 260);
eq('fromClaude', T.fromClaude({ usage: { input_tokens: 2, cache_creation_input_tokens: 644, cache_read_input_tokens: 0, output_tokens: 4 }, total_cost_usd: .0001, num_turns: 1 }), { in: 2, cw: 644, cr: 0, out: 4, usd: .0001, turns: 1 });
eq('fromGemini', T.fromGemini({ stats: { models: { a: { tokens: { prompt: 100, candidates: 20, cached: 40 } } } } }), { in: 60, cr: 40, out: 20 });
const t0 = new Date(2026, 10, 24, 12).getTime();
T.logUsage({ kind: 'organize', in: 1000, out: 200, n: 25 });
T.logUsage({ kind: 'organize', local: true, n: 10, saved: 900 });
T.logUsage({ kind: 'ask', in: 300, out: 100, n: 5 });
const u = T.usageSummary();
eq('month', u.month, 1600); eq('calls', u.calls, 2); eq('saved', u.saved, 900); eq('kinds', u.kinds.organize, { tok: 1200, calls: 1, items: 35 });
let threw = null; try { T.checkCap('organize', 1000); } catch (e) { threw = e.code; } eq('cap stops background', threw, 'limit');
threw = null; try { T.checkCap('ask', 1000); } catch (e) { threw = e.code; } eq('cap lets ask through', threw, null);
threw = null; try { T.checkCap('organize', 0); } catch (e) { threw = e.code; } eq('cap 0 = none', threw, null);
threw = null; try { T.checkCap('organize', 5000); } catch (e) { threw = e.code; } eq('under cap', threw, null);
const k = T.hash('org', 'a', { b: 1 }); T.cput(k, { title: 'x' }); eq('cache', T.cget(k), { title: 'x' }); eq('cache miss', T.cget(T.hash('nope')), undefined);
eq('hash stable', T.hash('a', 'b') === T.hash('a', 'b') && T.hash('a', 'b') !== T.hash('ab'), true);
console.log(`thrift: ${ok} geçti, ${bad} kaldı`); rmSync(dir, { recursive: true, force: true }); process.exit(bad ? 1 : 0);
