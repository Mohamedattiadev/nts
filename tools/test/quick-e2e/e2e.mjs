// 156b end-to-end, app side: the app at 8791 talks to a TEMP bridge on 8793 (8787 requests are rewritten; AI routes refused).
// PLAYWRIGHT env var can point at another playwright index.mjs
const { chromium } = await import(process.env.PLAYWRIGHT || '/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs');
import { readFileSync, existsSync } from 'fs';
const [snapFile, text, outPrefix] = process.argv.slice(2), errs = [];
const b = await chromium.launch(), c = await b.newContext({ viewport: { width: 1366, height: 768 } });
await c.addInitScript(() => { localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); localStorage.setItem('hn-theme', 'dark'); });
const p = await c.newPage();
await p.route(/:8787\//, async r => {
  const u = new URL(r.request().url());
  if (!/^\/(config|health|inbox|snapshot)(\/|$)/.test(u.pathname)) return r.abort(); // never organize/ask with the real AI
  r.fulfill({ response: await r.fetch({ url: u.href.replace(':8787', ':8793') }) });
});
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle' });
const t0 = Date.now();
const id = await p.waitForFunction(t => (S.items || []).find(i => !i.deleted && (i.text || '').startsWith(t))?.id, text, { timeout: 30000 }).then(h => h.jsonValue());
console.log(`app: inbox note arrived as ${id} in ${Date.now() - t0} ms`);
await p.screenshot({ path: outPrefix + '-app.png' });
let snapOk = false; for (let k = 0; k < 40 && !snapOk; k++) { await p.waitForTimeout(500); snapOk = existsSync(snapFile) && JSON.parse(readFileSync(snapFile, 'utf8')).items.some(i => i.id === id); }
console.log('bridge snapshot has it:', snapOk);
await p.goto('http://127.0.0.1:8791/?open=' + id, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
const shown = await p.evaluate(t => { const d = document.querySelector('#sheet'); return !!(d?.open && d.textContent.includes(t)); }, text);
console.log('?open shows the record:', shown);
await p.screenshot({ path: outPrefix + '-open.png' });
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no console errors');
await b.close();
process.exit(snapOk && shown && !errs.length ? 0 : 1);
