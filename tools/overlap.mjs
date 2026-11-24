// 158a: yüzen öğeler üst üste biniyor mu? Liste/galeri × 1366, 1920, 1024, 390 × zaman çizgisini sürüklerken/değilken × "Ekim 2024 ve öncesi"
// şeridi açık/kapalı. Görünen her fixed/sticky yüzey (önizleme, zaman çizgisi balonu + ay/yıl yazıları, şerit, Tarihe git/Seç, görünüm seçici,
// kutu, sol çubuk) çift çift kesişme (≥ 2 px) sayılır; ata/çocuk çiftleri ve aynı kabın parçaları sayılmaz. Hedef: hepsi 0.
// run: NTS_URL=http://127.0.0.1:8791/ node tools/overlap.mjs   (OUT=<klasör> ekran görüntüsü, THEMES=light,dark)
import { chromium } from '/home/ati/Attia-Pro/Projects/Fluent365/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
import { seedYears } from '/home/ati/.claude/skills/nts-playwright-test/seedyears.mjs';
const URL_ = process.env.NTS_URL || 'http://127.0.0.1:8790/', OUT = process.env.OUT || '';
const vps = [[1366, 768], [1920, 1080], [1024, 768], [390, 844]];
const b = await chromium.launch(); let total = 0; const errs = [];
for (const theme of (process.env.THEMES || 'dark').split(',')) for (const [w, h] of vps) {
  const mob = w < 500;
  const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
  await c.addInitScript(th => { localStorage.setItem('hn-tour', '1'); localStorage.setItem('hn-ai', '1'); localStorage.setItem('hn-theme', th); }, theme);
  const p = await c.newPage(); await p.route(/:8787\//, r => r.abort());
  p.on('pageerror', e => errs.push(`${w} ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/8787|Failed to load resource|ERR_|net::|Permissions policy/.test(m.text())) errs.push(`${w} ${m.text()}`); });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await seedYears(p);
  // a few image items so the gallery has tiles and the docked preview shows
  await p.evaluate(async () => { const t = Date.now(), D = 864e5, png = await (await fetch('icons/icon-192.png')).blob();
    const its = []; for (let k = 0; k < 40; k++) its.push({ id: 'ov' + k, type: 'file', fileName: `r${k}.png`, mime: 'image/png', ts: t - k * 21 * D, updatedAt: t, source: 'manual', tags: [] });
    await DB.putMany('files', its.map(i => ({ id: i.id, blob: png }))); await DB.putMany('items', its); await reloadFromDB(); });
  for (const view of ['gallery', 'list']) for (const from of [false, true]) {
    await p.evaluate(([v, f]) => { setView(v); if (f) showFrom(new Date(2024, 10, 1).getTime() - 1); else { S.listFrom = null; render(); } scrollTo(0, 0); }, [view, from]);
    await p.waitForTimeout(500);
    if (view === 'gallery') await p.evaluate(() => scrollBy(0, 200)); await p.waitForTimeout(300);
    for (const drag of [false, true]) {
      if (drag) { const r = await p.evaluate(() => { const s = document.querySelector('.scrub'); if (!s || s.hidden) return null; const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * .12, y2: r.top + r.height * .55 }; });
        if (!r) continue; await p.mouse.move(r.x, r.y); await p.mouse.down(); await p.mouse.move(r.x, (r.y + r.y2) / 2, { steps: 3 }); await p.mouse.move(r.x, r.y, { steps: 3 }); await p.waitForTimeout(250); }
      const hits = await p.evaluate(() => {
        const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; for (let a = e.parentElement; a; a = a.parentElement) { const t = getComputedStyle(a); if (t.display === 'none' || +t.opacity < .05) return false; } const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        const sel = ['.peek', '.sc-bub', '.sc-m', '.sc-now', '.l-from', '.l-top .l-jump', '#viewSwitch', '.dock', '.rail', '.rail-tab', '.chip', '#syncBtn', '.float'];
        const els = [...new Set(sel.flatMap(s => [...document.querySelectorAll(s)]))].filter(vis);
        const name = e => (e.id ? '#' + e.id : '') + '.' + [...e.classList].slice(0, 2).join('.') + (e.textContent.trim() ? ` "${e.textContent.trim().slice(0, 14)}"` : '');
        const out = [];
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
          const A = els[i], B = els[j]; if (A.contains(B) || B.contains(A)) continue;
          if (A.closest('.scrub') && B.closest('.scrub') && !(A.matches('.sc-bub') || B.matches('.sc-bub'))) continue; // the line's own ticks/labels
          if (A.closest('.scrub') && B.closest('.scrub')) { const o = A.matches('.sc-bub') ? B : A; if (o.matches('.sc-now')) continue; } // bubble points at the dot
          const a = A.getBoundingClientRect(), c = B.getBoundingClientRect();
          const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (x >= 2 && y >= 2) out.push(`${name(A)} × ${name(B)} (${x.toFixed(0)}×${y.toFixed(0)})`);
        }
        return out; });
      const tag = `${theme} ${w} ${view}${from ? ' +şerit' : ''}${drag ? ' sürük' : ''}`;
      console.log(`${tag}: ${hits.length}${hits.length ? '\n   ' + hits.join('\n   ') : ''}`); total += hits.length;
      if (OUT) await p.screenshot({ path: `${OUT}/ov-${theme}-${w}-${view}${from ? '-from' : ''}${drag ? '-drag' : ''}.png` });
      if (drag) { await p.mouse.up(); await p.waitForTimeout(300); }
    }
  }
  await c.close();
}
await b.close();
console.log(`TOPLAM kesişme: ${total}`); console.log(errs.length ? 'KONSOL:\n' + errs.join('\n') : 'konsol hatası yok');
process.exit(total ? 1 : 0);
