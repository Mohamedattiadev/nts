'use strict';
// 107j: export — Markdown (zip, and a live Obsidian folder on the PC through the bridge) and the board as a PDF.
// Uses app.js globals at call time (alive, titleOf, DB, AI, Board …); loaded after it.

// ---------- one item → Markdown (front matter: date, type, tags, link…), shared by the zip and the folder sync ----------
const MdOut = {
  slug: t => (t || 'kayit').replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'kayit',
  items: () => alive().filter(i => i.type !== 'draw').sort((a, b) => a.ts - b.ts),
  // stable file names for the whole list (same day + title → "… 2"), so a sync and a zip name things the same way
  names(items) {
    const used = new Set(), out = new Map();
    for (const i of items) {
      const day = dayKey(i.ts), base = `${day} ${this.slug(titleOf(i))}`; let name = base, n = 2;
      while (used.has(name.toLocaleLowerCase('tr'))) name = `${base} ${n++}`;
      used.add(name.toLocaleLowerCase('tr')); out.set(i.id, `Nts/${day.slice(0, 7)}/${name}.md`);
    }
    return out;
  },
  attName: i => `${dayKey(i.ts)}-${i.id}-${MdOut.slug(i.fileName).replace(/ /g, '-')}`,
  // text of the .md; hasFile: is the attachment here (else a note says it is not on this device)
  text(i, hasFile) {
    const yq = v => JSON.stringify(String(v)); // YAML-safe quoted string
    const fm = ['---', `title: ${yq(titleOf(i))}`, `date: ${new Date(i.ts).toISOString()}`, `type: ${groupOf(i)}`, `nts: ${i.id}`];
    if (i.tags?.length) fm.push(`tags: [${i.tags.map(yq).join(', ')}]`);
    if (i.url) fm.push(`link: ${yq(i.url)}`);
    if (i.project) fm.push(`project: ${yq(i.project)}`);
    if (i.lists?.length) fm.push(`lists: [${i.lists.map(k => yq(listName(k))).join(', ')}]`);
    if (i.starred) fm.push('starred: true');
    if (i.todo) fm.push(`todo: ${i.todo.done ? 'done' : 'open'}`, ...(i.todo.due ? [`due: ${i.todo.due}`] : []));
    if (i.source && i.source !== 'manual') fm.push(`source: ${i.source}`);
    fm.push('---', '');
    const body = [`# ${titleOf(i)}`, ''];
    if (i.summary) body.push(`> ${i.summary}`, '');
    if (i.url) body.push(`[${i.meta?.title || domain(i.url)}](${i.url})`, '');
    if (i.text) body.push(i.text, '');
    if (i.type === 'file') {
      const n = this.attName(i);
      body.push(hasFile ? (fileKind(i) === 'image' ? `![[${n}]]` : `[[${n}]]`) : `*(dosya bu cihazda yok: ${i.fileName})*`, '');
    }
    if (i.ocr) body.push('## Resimdeki yazı', '', i.ocr, '');
    if (i.highlights?.length) body.push('## İşaretlediklerim', '', ...i.highlights.map(h => `> ${h.text}\n`), '');
    if (i.todo?.subs?.length) body.push('## Alt görevler', '', ...i.todo.subs.map(x => `- [${x.done ? 'x' : ' '}] ${x.t}`), '');
    if (i.explain?.text) body.push('## ' + aiName(), '', i.explain.text, '');
    if (i.read?.blocks?.length) body.push('## Okunur kopya', '', ...i.read.blocks.map(b => b.t === 'h' ? `### ${b.x}` : b.t === 'li' ? `- ${b.x}` : b.t === 'q' ? `> ${b.x}` : b.x).join('\n\n').split('\n'), '');
    return fm.concat(body).join('\n');
  },
};

// Markdown for Obsidian & co.: one .md per item, files in attachments/, one zip
async function exportMarkdown() {
  toast('Markdown hazırlanıyor…', 60000, 'down');
  const zip = new (await needZip())(), items = MdOut.items(), names = MdOut.names(items);
  for (const i of items) {
    let has = false;
    if (i.type === 'file') { const f = await DB.get('files', i.id); if (f?.blob) { zip.file(`attachments/${MdOut.attName(i)}`, f.blob); has = true; } }
    zip.file(names.get(i.id), MdOut.text(i, has));
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nts-markdown-${dayKey(now())}.zip`; a.click();
  toast(`${items.length} kayıt Markdown olarak indirildi`, 3000, 'check');
}

// ---------- live folder on the PC (Obsidian vault): the bridge writes the files, one way, never over a hand edit ----------
const ObsVault = {
  K: 'hn-vault', last: null, busy: false, st: null,
  on() { try { return localStorage.getItem(this.K) === '1'; } catch { return false; } },
  set(v) { try { v ? localStorage.setItem(this.K, '1') : localStorage.removeItem(this.K); } catch { } },
  ok: () => !!S.bridgeOk && S.via !== 'relay' && !!S.settings.bridgeUrl, // big files: only straight to the bridge (this PC or Tailscale), not via Supabase
  get: path => AI.raw(S.settings.bridgeUrl, S.settings.bridgeToken, path, null, 15000),
  post: (path, body) => AI.raw(S.settings.bridgeUrl, S.settings.bridgeToken, path, body, 120000),
  b64: blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(blob); }),
  sig: () => { let m = 0; for (const i of S.items) m = Math.max(m, i.updatedAt || i.ts || 0); return S.items.length + ':' + m; },
  // what changed since the folder last saw it (the folder's own list is the truth: a second PC/browser does not confuse it)
  async sync({ force = [] } = {}) {
    if (this.busy || !this.ok()) return null;
    this.busy = true; const sig = this.sig();
    try {
      const st = await this.get('/vault'), items = MdOut.items(), names = MdOut.names(items), live = new Set(items.map(i => i.id)), fset = new Set(force);
      const send = items.filter(i => st.u[i.id] !== (i.updatedAt || i.ts) || fset.has(i.id));
      const remove = Object.keys(st.u).filter(id => !live.has(id));
      const tot = { dir: st.dir, written: 0, same: 0, removed: 0, conflicts: [] };
      const add = r => { tot.dir = r.dir; tot.written += r.written; tot.same += r.same; tot.removed += r.removed; tot.conflicts.push(...r.conflicts); };
      let batch = [], size = 0;
      const flush = async () => { if (!batch.length) return; add(await this.post('/vault', { files: batch, force })); batch = []; size = 0; };
      for (const i of send) {
        const x = { id: i.id, p: names.get(i.id), u: i.updatedAt || i.ts }; let has = false;
        if (i.type === 'file') {
          const f = await DB.get('files', i.id);
          if (f?.blob) { has = true; if (!(i.id in st.u) && f.blob.size < 60e6) { x.att = { p: `attachments/${MdOut.attName(i)}`, b64: await this.b64(f.blob) }; size += x.att.b64.length; } }
        }
        x.text = MdOut.text(i, has); size += x.text.length; batch.push(x);
        if (size > 8e6 || batch.length >= 400) await flush();
      }
      await flush();
      if (remove.length || !send.length) add(await this.post('/vault', { files: [], remove, force }));
      this.last = { ...tot, at: Date.now(), n: items.length }; this._sig = sig;
      try { localStorage.setItem(this.K + '-last', JSON.stringify({ ...this.last, conflicts: this.last.conflicts.slice(0, 50) })); } catch { }
      return this.last;
    } finally { this.busy = false; }
  },
  // turned on: every 20 s look whether anything changed (no network when nothing did)
  tick() {
    clearTimeout(this._t); this._t = setTimeout(() => this.tick(), 20000);
    if (!this.on() || document.hidden || !this.ok() || this._sig === this.sig()) return;
    this.sync().then(r => r && this.paint()).catch(e => console.warn('vault', e));
  },
  start() { if (!this._t) this.tick(); },
  lastSaved() { if (this.last) return this.last; try { return JSON.parse(localStorage.getItem(this.K + '-last') || 'null'); } catch { return null; } },
  page(head) {
    const l = this.lastSaved(), ok = this.ok(), on = this.on();
    const when = l ? new Intl.DateTimeFormat('tr', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(l.at) : '';
    return `${head('Obsidian klasörü', true)}
      <p class="hint">Her kayıt bilgisayarındaki bir klasöre <b>.md</b> dosyası olarak yazılır, fotoğraf ve dosyalar <b>attachments/</b> içinde.
        Obsidian'da bu klasörü kasa olarak aç. Nts'te değişen kayıt birkaç saniyede güncellenir; klasörde elle değiştirdiğin dosyanın üstüne yazılmaz.</p>
      ${ok ? '' : `<p class="hint vault-off">${ic('cpu', 'sm')} Köprü kapalı. Bu özellik bilgisayardaki Nts köprüsüyle çalışır (Ayarlar → ${aiName()}). Şimdilik zip olarak indirebilirsin.</p>`}
      <div class="set-sec">
        <label class="set-line"><span>Otomatik eşitle<small>Bu cihaz açıkken değişiklikler klasöre yazılır</small></span><span class="switch"><input type="checkbox" data-von ${on ? 'checked' : ''} ${ok ? '' : 'disabled'}><span></span></span></label>
        <form class="set-field vault-dir" data-vdir><span>Klasör</span><input id="vaultDir" value="${esc(this.st?.dir || '')}" placeholder="~/Documents/Nts" spellcheck="false" autocomplete="off" ${ok ? '' : 'disabled'}><button class="btn secondary" ${ok ? '' : 'disabled'}>Kaydet</button></form>
        <p class="hint" id="vaultMsg" aria-live="polite">${l ? `${l.n} kayıt · son eşitleme ${when}` : 'Henüz eşitlenmedi'}</p>
        ${l?.conflicts?.length ? `<div class="vault-conf"><p class="hint"><b>${l.conflicts.length} dosya</b> klasörde elle değiştirilmiş, üstüne yazılmadı:</p>
          <ul>${l.conflicts.slice(0, 6).map(p => `<li>${esc(p.replace(/^Nts\//, ''))}</li>`).join('')}${l.conflicts.length > 6 ? `<li>+${l.conflicts.length - 6} dosya</li>` : ''}</ul>
          <button class="btn secondary" data-vforce>Nts'tekini yaz</button></div>` : ''}
      </div>
      <div class="mig-btns"><button class="btn primary" data-vnow ${ok ? '' : 'disabled'}>${ic('cloud', 'sm')}Şimdi eşitle</button><button class="btn secondary" data-vzip>${ic('down', 'sm')}Zip olarak indir</button></div>`;
  },
  paint() { const m = $('#menu'); if (m?.open && m.querySelector('[data-vnow]') && !m.contains(document.activeElement?.closest('input'))) openSettings('obsidian'); },
  bind(m) {
    const msg = () => m.querySelector('#vaultMsg');
    if (this.ok() && !this.st) this.get('/vault').then(st => { this.st = st; const i = m.querySelector('#vaultDir'); if (i && !i.value) i.value = st.dir; }).catch(() => { });
    const run = async (force) => {
      const b = m.querySelector('[data-vnow]'); if (b) b.disabled = true; if (msg()) msg().textContent = 'Eşitleniyor…';
      try { const r = await this.sync({ force }); if (!r) { if (msg()) msg().textContent = this.busy ? 'Zaten eşitleniyor…' : 'Köprüye ulaşılamadı'; return; }
        toast(`${r.written} dosya yazıldı${r.removed ? ` · ${r.removed} silindi` : ''}${r.conflicts.length ? ` · ${r.conflicts.length} çakışma` : ''}`, 2600, 'check'); this.paint(); }
      catch (e) { if (msg()) msg().textContent = 'Olmadı: ' + e.message; } finally { if (b) b.disabled = false; }
    };
    const on = m.querySelector('[data-von]'); if (on) on.onchange = () => { this.set(on.checked); if (on.checked) { this.start(); run(); } };
    m.querySelector('[data-vnow]')?.addEventListener('click', () => run());
    m.querySelector('[data-vzip]')?.addEventListener('click', () => { m.close(); exportMarkdown(); });
    m.querySelector('[data-vforce]')?.addEventListener('click', () => {
      const ps = new Set(this.lastSaved()?.conflicts || []), names = MdOut.names(MdOut.items()), ids = [...names].filter(([, p]) => ps.has(p)).map(([id]) => id);
      run(ids);
    });
    const f = m.querySelector('[data-vdir]'); if (f) f.onsubmit = async e => {
      e.preventDefault(); const v = f.querySelector('input').value.trim();
      try { this.st = await this.post('/vault-conf', { dir: v || null }); this.last = null; try { localStorage.removeItem(this.K + '-last'); } catch { } this._sig = null;
        toast('Klasör: ' + this.st.dir, 2400, 'check'); openSettings('obsidian'); }
      catch (err) { if (msg()) msg().textContent = err.message; }
    };
  },
};

// ---------- the board as a PDF: every card where it stands (light theme), one page the size of the board ----------
const BoardPdf = {
  MAX: 600, // more cards than this: only what is on screen
  async save() {
    if (S.view !== 'board') { setView('board'); await new Promise(r => setTimeout(r, 400)); }
    if (!Board.M?.size || !S.cam) return toast('Panoda kart yok', 2000);
    toast('PDF hazırlanıyor…', 60000, 'down');
    const all = [...Board.M.values()], vis = Board.view(0), inV = m => m.x < vis.x2 && m.x + m.w > vis.x1 && m.y < vis.y2 && m.y + m.h > vis.y1;
    const part = all.length > this.MAX, list = part ? all.filter(inV) : all, keep = new Set(list.map(m => m.i.id));
    if (!list.length) return toast('Ekranda kart yok', 2000);
    const P = 48, b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
    for (const m of list) { b.x1 = Math.min(b.x1, m.x); b.y1 = Math.min(b.y1, m.y - 40); b.x2 = Math.max(b.x2, m.x + m.w); b.y2 = Math.max(b.y2, m.y + (m.auto ? m.h : Board.est(m.i))); }
    if (part) Object.assign(b, { x1: Math.max(b.x1, vis.x1), y1: Math.max(b.y1, vis.y1), x2: Math.min(b.x2, vis.x2), y2: Math.min(b.y2, vis.y2) });
    b.x1 -= P; b.y1 -= P; b.x2 += P; b.y2 += P;
    const W = Math.ceil(b.x2 - b.x1), H = Math.ceil(b.y2 - b.y1);
    // let the board's own code mount every card, day band and wire (same look as on screen), copy it, then put the camera back
    const cam = S.cam, view = Board.view, plane = $('#plane');
    let html;
    try {
      S.cam = { x: -b.x1, y: -b.y1, k: 1 }; Board.view = () => b; Board.cull();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); Board.fades([...plane.querySelectorAll('.bcard')]);
      const cl = plane.cloneNode(true); cl.style.transform = `translate(${-b.x1}px, ${-b.y1}px)`; cl.classList.remove('moving');
      cl.querySelectorAll('.bcard').forEach(c => { const m = Board.M.get(c.dataset.id); if (!m || !keep.has(m.i.id)) c.remove(); c.classList.remove('born', 'sel', 'hit', 'dim'); });
      await Promise.all([...cl.querySelectorAll('[data-tid]')].filter(t => !t.querySelector('img')).map(async t => { // thumbnails not loaded yet on screen
        const i = byId(t.dataset.tid), u = i && await Prev.thumb(i).catch(() => null); if (!u) return;
        const img = document.createElement('img'); img.alt = ''; img.src = u; img.className = 'ok'; t.appendChild(img); }));
      cl.querySelectorAll('.thumb img, [data-tid] img').forEach(i => i.classList.add('ok'));
      html = cl.outerHTML;
    } finally { S.cam = cam; Board.view = view; Board.apply(); Board.cull(); }
    const s = Math.min(1, 18000 / W, 18000 / H), title = `Nts pano — ${onMain() ? 'Genel' : S.board} — ${dayKey(now())}`; // PDF pages stop at 200 in
    const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    document.body.appendChild(f);
    const d = f.contentDocument, css = new URL('style.css', location.href).href, ac = document.documentElement.dataset.accent || '';
    d.open(); d.write(`<!doctype html><html lang="tr" data-theme="light"${ac ? ` data-accent="${esc(ac)}"` : ''}><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="${css}">
      <style>@page { size: ${Math.ceil(W * s)}px ${Math.ceil(H * s)}px; margin: 0 } html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #board { position: relative; inset: auto; width: ${W}px; height: ${H}px; transform: scale(${s}); transform-origin: 0 0; background-image: none; }
      .bcard, .day-band { animation: none !important; transition: none !important; } .wires path { opacity: .35; } .wires path.man { opacity: .5; }</style></head>
      <body><div id="board" class="board">${html}</div></body></html>`);
    d.close();
    await new Promise(r => { const l = d.querySelector('link'); if (l.sheet) r(); else { l.onload = l.onerror = r; setTimeout(r, 3000); } });
    await Promise.all([...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; setTimeout(r, 4000); })));
    toast(`${list.length} kart${part ? ' (görünen alan)' : ''} · yazdır penceresinde “PDF olarak kaydet”i seç`, 4000, 'down');
    const done = () => setTimeout(() => f.remove(), 500);
    f.contentWindow.addEventListener('afterprint', done); setTimeout(done, 600000);
    f.contentWindow.focus(); f.contentWindow.print();
  },
};

setTimeout(() => ObsVault.start(), 5000); // does nothing until the folder sync is turned on on this device
