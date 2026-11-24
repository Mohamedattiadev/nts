// 147: akıcılık ölçümü. N kayıt (+IMG resim), masaüstü 1366x768 ve telefon 390x844 (4x CPU yavaşlatma).
// run: NTS_URL=http://127.0.0.1:8792/ node tools/perf.mjs <tag> [N=10000] [IMG=300]  → tools/perf.log (bir satır JSON)
// Her senaryo: süre (ms), uzun görevler (>50 ms: adet / en uzun / toplam), kare süreleri (p95, >33 ms kare sayısı, fps).
// Ölçü sayfanın içinde: PerformanceObserver('longtask') + requestAnimationFrame aralıkları. DEV=m yalnız telefon, DEV=d yalnız masaüstü.
import { chromium } from '/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
const URL_ = process.env.NTS_URL || 'http://127.0.0.1:8792/', tag = process.argv[2] || 'x', N = +(process.argv[3] || 10000), IMG = +(process.argv[4] ?? 300);
const b = await chromium.launch(); const out = { tag, N, IMG, d: new Date().toISOString() };
const devs = [['d', { width: 1366, height: 768 }], ['m', { width: 390, height: 844 }]].filter(([k]) => !process.env.DEV || process.env.DEV === k);
for (const [dev, vp] of devs) {
  const c = await b.newContext({ viewport: vp, isMobile: dev === 'm', hasTouch: dev === 'm', deviceScaleFactor: dev === 'm' ? 2 : 1 });
  await c.addInitScript(() => {
    localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); localStorage.setItem('hn-view', 'list'); localStorage.setItem('hn-mode', 'note');
    window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => __lt.push([e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true }); } catch { }
  });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/8787|Failed to load|ERR_|net::/.test(m.text()) && errs.push(m.text()));
  await p.route(/:8787\/|supabase\.co|fonts\.g/, r => r.abort());
  const cdp = await c.newCDPSession(p);
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.evaluate(async ([N, IMG]) => { // tohum: WhatsApp benzeri notlar, linkler, yapılacaklar, resimler; son 3 yıla yayılmış
    const t = Date.now(), start = t - 3 * 365 * 864e5, w = ['market', 'toplantı', 'poultrycare', 'fatura', 'kitap', 'annem', 'spor', 'proje', 'fikir', 'link'];
    const items = Array.from({ length: N }, (_, k) => ({ id: 'p' + k, type: k % 4 ? 'note' : 'link', url: k % 4 ? undefined : 'https://example.com/' + k, text: `${w[k % 10]} mesaj ${k} ${w[(k * 7) % 10]} ` + 'uzun bir metin '.repeat(k % 7), ts: start + ((k * 7919) % N) / N * (t - start), updatedAt: t, tags: [w[k % 10]], source: k % 3 ? 'whatsapp' : 'manual', ...(k % 11 === 0 ? { todo: { done: k % 2 === 0 } } : {}) }));
    for (let i = 0; i < N; i += 2000) await DB.putMany('items', items.slice(i, i + 2000));
    const cv = new OffscreenCanvas(1600, 1200), g = cv.getContext('2d'), its = [], files = [];
    for (let k = 0; k < IMG; k++) {
      g.fillStyle = `hsl(${k * 37 % 360} 60% 55%)`; g.fillRect(0, 0, 1600, 1200); for (let j = 0; j < 30; j++) { g.fillStyle = `hsl(${(k * 37 + j * 11) % 360} 70% ${30 + j}%)`; g.fillRect((j * 97) % 1500, (j * 53) % 1100, 200, 150); }
      const blob = await cv.convertToBlob({ type: 'image/jpeg', quality: .85 }), id = 'img' + k;
      files.push({ id, blob }); its.push({ id, type: 'file', fileName: `IMG-${k}.jpg`, mime: 'image/jpeg', size: blob.size, ts: t - k * 3 * 36e5, updatedAt: t, source: 'whatsapp', tags: [] });
    }
    for (let i = 0; i < its.length; i += 100) { await DB.putMany('files', files.slice(i, i + 100)); await DB.putMany('items', its.slice(i, i + 100)); }
  }, [N, IMG]);
  if (dev === 'm') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // açılış: splash gidene kadar + bütün kayıtlar yüklenene kadar (S.loaded)
  const t0 = Date.now(); await p.reload({ waitUntil: 'commit' });
  await p.waitForFunction(() => document.querySelector('#splash')?.classList.contains('gone'), null, { timeout: 90000 }); const ui = Date.now() - t0;
  await p.waitForFunction(() => typeof S !== 'undefined' && S.loaded, null, { timeout: 120000, polling: 200 }); const all = Date.now() - t0;
  const openLT = await p.evaluate(() => { const a = __lt.map(x => x[1]); return { n: a.length, max: Math.round(Math.max(0, ...a)), sum: Math.round(a.reduce((s, x) => s + x, 0)) }; });
  out[dev] = { open: { ui, all, lt: openLT } };
  await p.waitForTimeout(2500); // açılıştan sonra gelen boşta işler (LinkMeta, Sem, Hues...) ölçüme karışmasın
  // sayfa içi ölçüm aracı
  await p.evaluate(() => {
    window.__m = {
      start() { this.t = performance.now(); this.f = []; this.lt0 = __lt.length; let last = performance.now(); const loop = n => { this.f.push(n - last); last = n; if (this.on) requestAnimationFrame(loop); }; this.on = true; requestAnimationFrame(loop); },
      stop() {
        this.on = false; const dur = performance.now() - this.t, lt = __lt.slice(this.lt0).map(x => x[1]), f = this.f.slice(1).sort((a, b) => a - b);
        const p95 = f.length ? f[Math.floor(f.length * .95)] : 0, jank = f.filter(x => x > 33).length, fps = f.length ? 1000 / (f.reduce((s, x) => s + x, 0) / f.length) : 0;
        return { dur: Math.round(dur), lt: lt.length, ltMax: Math.round(Math.max(0, ...lt)), ltSum: Math.round(lt.reduce((s, x) => s + x, 0)), p95: Math.round(p95), jank, fps: Math.round(fps) };
      },
    };
  });
  const prof = !!process.env.PROF; if (prof) await cdp.send('Profiler.enable');
  const top = pr => { // en çok kendi süresi olan 8 fonksiyon (dosya:satır)
    const dt = new Map(), by = new Map(pr.nodes.map(n => [n.id, n])); pr.samples.forEach((id, k) => dt.set(id, (dt.get(id) || 0) + (pr.timeDeltas[k] || 0)));
    const par = new Map(); pr.nodes.forEach(n => (n.children || []).forEach(ch => par.set(ch, n.id)));
    const caller = id => { for (let p = par.get(id); p; p = par.get(p)) { const f = by.get(p).callFrame; if (f.url) return ' ← ' + (f.functionName || '(anon)') + ':' + (f.lineNumber + 1); } return ''; };
    const agg = new Map(); for (const [id, us] of dt) { const f = by.get(id).callFrame; if (/^\((idle|program|root)\)$/.test(f.functionName)) continue; const key = (f.functionName || '(anon)') + (f.url ? ' ' + f.url.split('/').pop() + ':' + (f.lineNumber + 1) : caller(id)); agg.set(key, (agg.get(key) || 0) + us); }
    return [...agg].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, us]) => k + ' ' + Math.round(us / 1000));
  };
  // 147b: TRACE=1 → senaryo başına ana iş parçacığında olay türü toplamları (stil, yerleşim, boyama, betik…; ms) — "nereye gidiyor" sorusu
  const trace = !!process.env.TRACE, tStart = async () => { if (!trace) return; cdp._ev = []; cdp.on('Tracing.dataCollected', d => cdp._ev.push(...d.value)); await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' }); };
  const tStop = async () => { if (!trace) return; const done = new Promise(r => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); await done; cdp.removeAllListeners('Tracing.dataCollected');
    const ev = cdp._ev, main = ev.find(e => e.name === 'thread_name' && e.args?.name === 'CrRendererMain'), agg = {};
    for (const e of ev) if (e.ph === 'X' && main && e.tid === main.tid && e.pid === main.pid && /^(UpdateLayoutTree|Layout|Paint|PrePaint|Layerize|FunctionCall|EvaluateScript|ParseHTML|HitTest|RunMicrotasks|TimerFire|FireAnimationFrame|EventDispatch|MajorGC|MinorGC|V8.GC_SCAVENGER|Commit)$/.test(e.name)) agg[e.name] = (agg[e.name] || 0) + e.dur / 1000;
    return Object.fromEntries(Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v)])); };
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; // 147c: ONLY=todo,trash … yalnız bunlar
  const sc = async (name, fn, wait = 400) => { if (ONLY && !ONLY.includes(name)) return; try { if (prof) await cdp.send('Profiler.start'); await tStart(); await p.evaluate(() => __m.start()); await fn(); await p.waitForTimeout(wait); out[dev][name] = await p.evaluate(() => __m.stop()); if (trace) out[dev][name].tr = await tStop(); if (prof) out[dev][name].top = top((await cdp.send('Profiler.stop')).profile); } catch (e) { out[dev][name] = 'HATA ' + e.message.split('\n')[0]; await p.evaluate(() => __m.stop()).catch(() => { }); } };
  const view = async v => { const r = await p.evaluate(async v => { const a = performance.now(); setView(v); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - a); }, v); return r; };
  const vt = {}; await sc('view', async () => { for (const v of ['board', 'gallery', 'list', 'board', 'list']) { const ms = await view(v); vt[v] = Math.max(vt[v] || 0, ms); await p.waitForTimeout(500); } });
  if (out[dev].view) out[dev].view.ms = vt;
  // liste kaydırma
  await sc('listScroll', async () => { for (let k = 0; k < 20; k++) { await p.mouse.move(vp.width / 2, vp.height / 2); await p.mouse.wheel(0, 400); await p.waitForTimeout(50); } });
  await p.evaluate(() => scrollTo(0, 0));
  // galeri kaydırma (resimler çözülürken)
  await view('gallery'); await p.waitForTimeout(800);
  await sc('galleryScroll', async () => { for (let k = 0; k < 20; k++) { await p.mouse.move(vp.width / 2, vp.height / 2); await p.mouse.wheel(0, 500); await p.waitForTimeout(50); } }, 800);
  // pano: kaydırma, yakınlaştırma, kart sürükleme
  await view('board'); await p.waitForTimeout(1200); await p.evaluate(() => Board.zoomTo(1)); await p.waitForTimeout(800); // kartların göründüğü yakınlık (3 yıl sığdırınca ay karoları çıkar)
  const bx = vp.width / 2, by = vp.height / 2;
  await sc('cardDrag', async () => {
    const card = await p.evaluate(() => { for (const e of document.querySelectorAll('#plane > .bcard')) { const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + 10; if (x > 20 && x < innerWidth - 140 && y > 20 && y < innerHeight - 200 && document.elementFromPoint(x, y)?.closest('.bcard') === e) return { x, y }; } return null; });
    if (!card) throw new Error('kart yok');
    await p.mouse.move(card.x, card.y); await p.mouse.down(); for (let k = 1; k <= 30; k++) { await p.mouse.move(card.x + k * 4, card.y + k * 2); await p.waitForTimeout(16); } await p.mouse.up();
  });
  await sc('boardPan', async () => { for (let k = 0; k < 30; k++) { await p.mouse.move(bx, by); await p.mouse.wheel(k % 10 < 5 ? 120 : -120, 60); await p.waitForTimeout(16); } });
  await sc('boardZoom', async () => { await p.keyboard.down('Control'); for (let k = 0; k < 24; k++) { await p.mouse.move(bx, by); await p.mouse.wheel(0, k < 12 ? 100 : -100); await p.waitForTimeout(16); } await p.keyboard.up('Control'); });
  await view('list'); await p.waitForTimeout(600);
  // kutuya yazma (Not modu) ve Ara modunda tuş
  await sc('typeNote', async () => { await p.click('#input'); await p.keyboard.type('market listesi yarın', { delay: 90 }); }, 500);
  await p.evaluate(() => { const i = $('#input'); i.value = ''; i.dispatchEvent(new Event('input')); i.blur(); }); await p.waitForTimeout(400);
  await sc('typeFind', async () => { await p.evaluate(() => setMode('find')); await p.click('#input'); await p.keyboard.type('fatura proje', { delay: 130 }); }, 700);
  await p.evaluate(() => { const i = $('#input'); i.value = ''; i.dispatchEvent(new Event('input')); setMode('note'); i.blur(); }); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  // kayıt penceresi aç/kapa (3 kez)
  await sc('itemOpen', async () => { for (let k = 0; k < 3; k++) { await p.locator('#list .item').nth(k + 1).click(); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(600); } });
  // sol çubuk aç/kapa (masaüstü: [ tuşu; telefon: süzgeç düğmesi)
  await sc('rail', async () => { for (let k = 0; k < 4; k++) { if (dev === 'd') await p.keyboard.press('BracketLeft'); else { await p.locator('#filterBtn').click(); await p.waitForTimeout(500); await p.keyboard.press('Escape'); } await p.waitForTimeout(500); } });
  // 147c: ölçülmemiş ekranlar (her biri aç → çizilene kadar → kapat)
  const esc = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(400); };
  const paint = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await sc('todo', async () => { for (let k = 0; k < 2; k++) { await view('todo'); await p.waitForTimeout(500); await view('list'); await p.waitForTimeout(500); } });
  await sc('more', async () => { for (let k = 0; k < 2; k++) { if (dev === 'm') await p.locator('#filterBtn').click(); else await p.locator('#rail [data-tags]').first().click(); await p.waitForTimeout(500); await esc(); } });
  await sc('jump', async () => { for (let k = 0; k < 2; k++) { await p.evaluate(() => monthJump($('#filterBtn') || document.body)); await paint(); await p.waitForTimeout(400); await esc(); } });
  await sc('findEnter', async () => { await p.evaluate(() => setMode('find')); await p.click('#input'); await p.keyboard.type('kitap', { delay: 120 }); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(700); await esc(); });
  await p.evaluate(() => { const i = $('#input'); i.value = ''; i.dispatchEvent(new Event('input')); setMode('note'); i.blur(); }); await esc();
  await sc('ask', async () => { await p.evaluate(() => setMode('ask')); await p.click('#input'); await p.keyboard.type('market ne zaman', { delay: 60 }); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); }, 600);
  await p.evaluate(() => { const i = $('#input'); i.value = ''; i.dispatchEvent(new Event('input')); setMode('note'); i.blur(); }); await esc(); await esc();
  await sc('reader', async () => { for (const id of ['p6', 'p13']) { await p.evaluate(id => Read.open(id), id); await p.waitForTimeout(700); await esc(); } });
  await sc('settings', async () => { for (const pg of ['main', 'lists', 'main']) { await p.evaluate(pg => openSettings(pg), pg); await paint(); await p.waitForTimeout(500); } await esc(); });
  await sc('vault', async () => { for (let k = 0; k < 2; k++) { await p.evaluate(() => Vault.open()); await p.waitForTimeout(500); await esc(); } });
  if (!ONLY || ONLY.includes('trash')) { await p.evaluate(() => upsert(S.items.filter(i => i.type === 'note').slice(0, 400).map(i => ({ ...i, deleted: true, deletedAt: Date.now() - 864e5 })), { sync: false })); await p.waitForTimeout(800); }
  await sc('trash', async () => { for (let k = 0; k < 2; k++) { await p.evaluate(() => Trash.open()); await p.waitForTimeout(600); await esc(); } });
  if (!ONLY || ONLY.includes('boardPick')) { await view('board'); await p.waitForTimeout(1200); } // pano seçici yalnız panoda görünür
  await sc('boardPick', async () => { for (let k = 0; k < 2; k++) { await p.locator('#boardBtn').click(); await p.waitForTimeout(500); await esc(); } });
  if (!ONLY || ONLY.includes('boardPick')) { await view('list'); await p.waitForTimeout(600); }
  await sc('import', async () => { // WhatsApp .txt, 1000 mesaj (zip yok: aynı ayrıştırma + kayıt yolu)
    await p.evaluate(async () => { const t0 = Date.UTC(2025, 0, 1), L = []; for (let k = 0; k < 1000; k++) { const d = new Date(t0 + k * 47 * 60e3), z = n => String(n).padStart(2, '0'); L.push(`${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()} ${z(d.getHours())}:${z(d.getMinutes())} - Ali: mesaj ${k} ${k % 5 ? 'market' : 'https://ornek.com/' + k}`); }
      await importWhatsApp(new File([L.join('\n')], 'WhatsApp Chat with Perf.txt', { type: 'text/plain' })); });
  }, 1200);
  await sc('syncIn', async () => { // 300 kayıt başka cihazdan değişmiş gelir (Cloud.pull'un sonu)
    await p.evaluate(async () => { const all = S.items.filter(i => i.type === 'note' && !i.deleted).slice(500, 800).map(i => ({ ...i, text: i.text + ' (öteki cihaz)', updatedAt: Date.now() + 1000 }));
      const changed = GH.merge(all, { dirty: new Set(), base: {} }); if (changed.length) { await DB.putMany('items', changed); runSearch(); render(); } });
  }, 800);
  out[dev].dom = await p.evaluate(() => document.querySelectorAll('*').length);
  out[dev].errs = errs.slice(0, 5);
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
(await import('fs')).appendFileSync(new URL('./perf.log', import.meta.url), JSON.stringify(out) + '\n');
