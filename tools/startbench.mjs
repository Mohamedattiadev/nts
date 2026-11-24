// 94e: first screen + tap response. masaüstü / telefon (4x CPU), first visit (no SW) and repeat visit (SW + cache)
// run: NTS_URL=http://127.0.0.1:8792/ node tools/startbench.mjs <tag> [N]  → tools/bench-start.log (fcp, dcl, ui = splash gone, tapMax = worst click/pointer Event Timing; phone = 4x CPU)
import { chromium } from '/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
const URL_ = process.env.NTS_URL || 'http://127.0.0.1:8792/', tag = process.argv[2] || 'x', N = +(process.argv[3] || 300);
const b = await chromium.launch(); const out = { tag, N };
const med = a => a.sort((x, y) => x - y)[a.length >> 1];
for (const [dev, vp] of [['masaüstü', { width: 1366, height: 768 }], ['telefon', { width: 390, height: 844 }]]) {
  const c = await b.newContext({ viewport: vp, isMobile: dev === 'telefon', hasTouch: dev === 'telefon' });
  await c.addInitScript(() => { localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); localStorage.setItem('hn-view', 'list'); });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.route(/:8787\/|supabase\.co/, r => r.abort());
  const cdp = await c.newCDPSession(p);
  const reqs = []; p.on('request', r => reqs.push(r.url().replace(URL_, '')));
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await p.evaluate(async N => { const t = Date.now(); const items = Array.from({ length: N }, (_, k) => ({ id: 'p' + k, type: k % 4 ? 'note' : 'link', url: k % 4 ? undefined : 'https://example.com/' + k, text: 'not ' + k + ' market proje', ts: t - k * 36e5, updatedAt: t, tags: ['proje'], source: 'manual', ...(k % 9 === 0 ? { todo: true, done: k % 2 === 0 } : {}) })); await DB.putMany('items', items); }, N);
  await p.waitForTimeout(1500);
  if (dev === 'telefon') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const runs = { first: [], repeat: [] };
  for (const kind of ['repeat', 'repeat', 'repeat']) {
    reqs.length = 0;
    await p.reload({ waitUntil: 'commit' }); await p.waitForFunction(() => document.querySelector('#splash')?.classList.contains('gone'), null, { timeout: 30000 });
    runs.repeat.push(await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], f = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: Math.round(f?.startTime || -1), dcl: Math.round(n.domContentLoadedEventEnd), ui: Math.round(performance.getEntriesByName('nts-ui')[0]?.startTime ?? -1), marks: performance.getEntriesByType('mark').map(m => m.name + ':' + Math.round(m.startTime)).join(' '), res: performance.getEntriesByType('resource').filter(r => r.startTime < 600).map(r => r.name.split('/').pop().slice(0, 20) + ':' + Math.round(r.responseEnd)).join(' ') }; }));
  }
  out[dev + '-loaded'] = reqs.filter(u => !/^data:/.test(u)).map(u => u.split('?')[0]).slice(0, 30);
  // tap response: Event Timing on real clicks
  await p.waitForTimeout(800);
  await p.evaluate(() => { window.__ev = []; new PerformanceObserver(l => l.getEntries().forEach(e => __ev.push([e.name, Math.round(e.duration), Math.round(e.processingEnd - e.processingStart)]))).observe({ type: 'event', durationThreshold: 16, buffered: false }); });
  const taps = dev === 'telefon' ? ['#list .item >> nth=0', '#modes .m-b', '#modes .m-b', '#modes .m-b'] : ['#list .item >> nth=0', '#modes .m-b', '#modes .m-b', '#modes .m-b'];
  for (const s of taps) { try { await p.locator(s).first().click({ timeout: 3000 }); } catch (e) { errs.push('tap ' + s + ' ' + e.message.split('\n')[0]); } await p.waitForTimeout(700); if (s.includes('.item')) { await p.keyboard.press('Escape'); await p.waitForTimeout(700); } }
  const ev = await p.evaluate(() => __ev);
  out[dev] = { fcp: med(runs.repeat.map(r => r.fcp)), marks: runs.repeat.at(-1).marks, res: runs.repeat.at(-1).res, dcl: med(runs.repeat.map(r => r.dcl)), ui: med(runs.repeat.map(r => r.ui)), tapMax: Math.max(0, ...ev.filter(e => /click|pointer|key/.test(e[0])).map(e => e[1])), ev: ev.filter(e => /^(click|pointerup|pointerdown|keydown)$/.test(e[0])), errs };
  await c.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
(await import('fs')).appendFileSync(new URL('./bench-start.log', import.meta.url), JSON.stringify({ ...out, 'masaüstü-loaded': undefined, 'telefon-loaded': undefined, d: new Date().toISOString() }) + '\n');
