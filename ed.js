// ---------- 106b: rich note editor. Stored as Markdown (sync, search and the AI keep reading plain text); one line = one block ----------
// "/" or "+" → block menu (list at the caret on desktop, bottom sheet on the phone), Markdown shortcuts turn as you type,
// a small format bar over a selection, a strip above the phone keyboard, its own undo/redo, pasted HTML cleaned to Markdown.
'use strict';
const Ed = {
  ZW: '​',
  BLOCKS: [['p', 'Aa', 'Metin', 'düz paragraf', 'metin yazı paragraf text'], ['h1', 'H1', 'Başlık', 'büyük başlık', 'baslik heading h1'], ['h2', 'H2', 'Alt başlık', 'orta başlık', 'alt baslik heading h2'],
    ['todo', '☐', 'Onay listesi', 'işaretlenen kutular', 'onay yapilacak todo check liste'], ['ul', '•', 'Madde listesi', 'noktalı liste', 'madde liste bullet list'], ['ol', '1.', 'Numaralı liste', '1, 2, 3', 'numara sirali numbered list'],
    ['quote', '❝', 'Alıntı', 'girintili alıntı', 'alinti quote'], ['code', '</>', 'Kod', 'eş aralıklı blok', 'kod code'], ['table', '⊞', 'Tablo', '3 × 3', 'tablo table'],
    ['img', '▣', 'Resim', 'cihazdan seç', 'resim foto gorsel image'], ['hr', '—', 'Ayırıcı', 'ince çizgi', 'ayirici cizgi divider']],
  phone: () => matchMedia('(pointer: coarse)').matches,
  fold: s => s.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c]),

  // ----- Markdown → HTML (inline), shared with the reading page and the card preview -----
  inl(s) { // s is raw text; escaped here
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>')
      .replace(/==(.+?)==/g, '<mark>$1</mark>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  },
  plain: s => String(s || '').replace(/^#{1,6}\s+|^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?|^\s*\[[ xX]\]\s+|^>\s?/, '').replace(/\*\*(.+?)\*\*|==(.+?)==|`([^`]+)`/g, (_, a, b, c) => a ?? b ?? c)
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1$2').replace(/!?\[([^\]]*)\]\([^)\s]+\)/g, '$1'),
  TODO: /^\s*(?:[-*+]\s+)?\[( |x|X)\]\s?(.*)$/,
  IMG: /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/,
  // lines → editor blocks
  toHtml(md) {
    const L = String(md ?? '').split('\n'), out = []; let m;
    for (let k = 0; k < L.length; k++) {
      const l = L[k];
      if (/^```/.test(l)) { const buf = []; while (k + 1 < L.length && !/^```\s*$/.test(L[k + 1])) buf.push(L[++k]); if (k + 1 < L.length) k++; out.push(`<pre>${esc(buf.join('\n')) || '<br>'}</pre>`); continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { out.push(`<h${m[1].length}>${this.inl(m[2]) || '<br>'}</h${m[1].length}>`); continue; }
      if ((m = l.match(this.TODO))) { out.push(this.todoHtml(m[1] !== ' ', this.inl(m[2]))); continue; }
      if (/^\s*[-*+]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
        const ol = /^\s*\d/.test(l), re = ol ? /^\s*\d+[.)]\s+(.*)/ : /^\s*[-*+]\s+(.*)/, items = [];
        k--; while (k + 1 < L.length && re.test(L[k + 1]) && !this.TODO.test(L[k + 1])) items.push(`<li>${this.inl(L[++k].match(re)[1]) || '<br>'}</li>`);
        out.push(`<${ol ? 'ol' : 'ul'}>${items.join('')}</${ol ? 'ol' : 'ul'}>`); continue;
      }
      if ((m = l.match(/^>\s?(.*)/))) { out.push(`<blockquote>${this.inl(m[1]) || '<br>'}</blockquote>`); continue; }
      if (/^\|.*\|\s*$/.test(l) && /^\|?\s*:?-{2,}/.test(L[k + 1] || '')) {
        const cells = r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => this.inl(c.trim()) || '<br>');
        let h = `<table><tr>${cells(l).map(c => `<th>${c}</th>`).join('')}</tr>`; k++;
        while (/^\|.*\|\s*$/.test(L[k + 1] || '')) h += `<tr>${cells(L[++k]).map(c => `<td>${c}</td>`).join('')}</tr>`;
        out.push(h + '</table>'); continue;
      }
      if (/^(-{3,}|\*{3,})$/.test(l.trim())) { out.push('<hr contenteditable="false">'); continue; }
      if ((m = l.match(this.IMG))) { out.push(this.imgHtml(m[2], m[1])); continue; }
      out.push(`<p>${this.inl(l) || '<br>'}</p>`);
    }
    if (!out.length) out.push('<p><br></p>');
    return out.join('');
  },
  todoHtml: (on, inner) => `<div class="etd${on ? ' on' : ''}"><span class="ck" contenteditable="false" role="checkbox" aria-checked="${on}" tabindex="-1"></span><span class="tx">${inner || '<br>'}</span></div>`,
  imgHtml: (src, alt) => `<figure class="ed-img" contenteditable="false" data-src="${esc(src)}" data-alt="${esc(alt || '')}"><img alt="${esc(alt || '')}"${/^https?:/.test(src) ? ` src="${esc(src)}" referrerpolicy="no-referrer"` : ''}><button class="ed-x" type="button" aria-label="Resmi kaldır" tabindex="-1">${ic('x', 'sm')}</button></figure>`,
  async hydrate(root) { // nts:<id> pictures come from the item's own file
    for (const f of root.querySelectorAll('[data-src^="nts:"]')) { const im = f.querySelector('img') || f; if (im.src) continue; const it = byId(f.dataset.src.slice(4)); const u = it && await blobFor(it).catch(() => null); if (u) im.src = u; else f.classList.add('miss'); }
  },

  // ----- editor DOM → Markdown -----
  inMd(node) {
    let s = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { s += n.data; continue; }
      if (n.nodeType !== 1) continue;
      const t = n.tagName, inner = () => this.inMd(n);
      if (t === 'BR') s += '';
      else if (t === 'B' || t === 'STRONG') { const x = inner(); s += x.trim() ? `**${x}**` : x; }
      else if (t === 'I' || t === 'EM') { const x = inner(); s += x.trim() ? `*${x}*` : x; }
      else if (t === 'MARK') { const x = inner(); s += x.trim() ? `==${x}==` : x; }
      else if (t === 'CODE') { const x = n.textContent; s += x ? '`' + x + '`' : ''; }
      else if (t === 'A') { const h = n.getAttribute('href') || '', x = inner(); s += /^https?:/.test(h) && x ? `[${x}](${h})` : x; }
      else s += inner();
    }
    return s.split(this.ZW).join('').replace(/ /g, ' ').replace(/\n/g, ' ');
  },
  toMd(area) {
    const out = [];
    for (const b of area.children) {
      const t = b.tagName, x = () => this.inMd(b);
      if (t === 'H1' || t === 'H2' || t === 'H3') out.push('#'.repeat(+t[1]) + ' ' + x());
      else if (t === 'UL' || t === 'OL') [...b.children].forEach((li, k) => out.push((t === 'OL' ? `${k + 1}. ` : '- ') + this.inMd(li)));
      else if (t === 'BLOCKQUOTE') out.push('> ' + x());
      else if (t === 'PRE') out.push('```', b.textContent.split(this.ZW).join('').replace(/\n$/, ''), '```');
      else if (t === 'HR') out.push('---');
      else if (t === 'TABLE') { const r = [...b.rows].map(row => '| ' + [...row.cells].map(c => this.inMd(c).replace(/\|/g, '/').trim()).join(' | ') + ' |'); r.splice(1, 0, '|' + ' --- |'.repeat(b.rows[0]?.cells.length || 1)); out.push(...r); }
      else if (t === 'FIGURE') out.push(`![${b.dataset.alt || ''}](${b.dataset.src})`);
      else if (b.classList.contains('etd')) out.push((b.classList.contains('on') ? '- [x] ' : '- [ ] ') + this.inMd(b.querySelector('.tx') || b));
      else out.push(x());
    }
    return out.join('\n').replace(/\s+$/, '');
  },
  // pasted / dropped HTML → Markdown (only the parts we know; scripts, styles, classes, colours never come in)
  fromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html'), out = [];
    const il = n => { let s = ''; for (const c of n.childNodes) { if (c.nodeType === 3) s += c.data.replace(/\s+/g, ' '); else if (c.nodeType === 1) { const t = c.tagName;
      if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(t)) continue; const x = il(c);
      if (t === 'B' || t === 'STRONG' || (c.style?.fontWeight >= 600)) s += x.trim() ? `**${x.trim()}** ` : x;
      else if (t === 'I' || t === 'EM') s += x.trim() ? `*${x.trim()}* ` : x;
      else if (t === 'MARK') s += x.trim() ? `==${x.trim()}==` : x;
      else if (t === 'CODE') s += x ? '`' + x + '`' : '';
      else if (t === 'A' && /^https?:/.test(c.getAttribute('href') || '')) s += x.trim() ? `[${x.trim()}](${c.getAttribute('href')})` : '';
      else if (t === 'BR') s += '\n'; else s += x; } } return s; };
    const blk = n => { for (const c of n.childNodes) {
      if (c.nodeType === 3) { if (c.data.trim()) out.push(c.data.trim()); continue; } if (c.nodeType !== 1) continue; const t = c.tagName;
      if (/^(SCRIPT|STYLE|TEMPLATE|HEAD|META|LINK|NOSCRIPT)$/.test(t)) continue;
      if (/^H[1-6]$/.test(t)) out.push('#'.repeat(Math.min(3, +t[1])) + ' ' + il(c).trim());
      else if (t === 'UL' || t === 'OL') [...c.children].filter(li => li.tagName === 'LI').forEach((li, k) => { const cb = li.querySelector('input[type=checkbox]');
        out.push((cb ? (cb.checked ? '- [x] ' : '- [ ] ') : t === 'OL' ? `${k + 1}. ` : '- ') + il(li).trim().replace(/\n+/g, ' ')); });
      else if (t === 'BLOCKQUOTE') il(c).trim().split('\n').forEach(l => l.trim() && out.push('> ' + l.trim()));
      else if (t === 'PRE') out.push('```', c.textContent.replace(/\n$/, ''), '```');
      else if (t === 'HR') out.push('---');
      else if (t === 'TABLE') { const rows = [...c.rows].map(r => '| ' + [...r.cells].map(x => il(x).trim().replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ') + ' |'); if (rows.length) { rows.splice(1, 0, '|' + ' --- |'.repeat(c.rows[0].cells.length)); out.push(...rows); } }
      else if (t === 'IMG') { const s = c.getAttribute('src') || ''; if (/^https?:/.test(s)) out.push(`![${c.alt || ''}](${s})`); }
      else if (/^(P|DIV|SECTION|ARTICLE|MAIN|HEADER|FOOTER|LI|FIGURE|BODY|DD|DT)$/.test(t) && [...c.children].some(k => /^(P|DIV|H[1-6]|UL|OL|TABLE|PRE|BLOCKQUOTE|SECTION|IMG|HR)$/.test(k.tagName))) blk(c);
      else { const x = il(c).trim(); if (x) x.split('\n').forEach(l => out.push(l.trim())); }
    } };
    blk(doc.body);
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  },

  // ----- the editor itself -----
  mount(host, md, { placeholder = 'Yaz ya da "/" ile blok ekle…', onImage } = {}) {
    const self = this, area = document.createElement('div');
    area.className = 'ned'; area.contentEditable = 'true'; area.setAttribute('role', 'textbox'); area.setAttribute('aria-multiline', 'true'); area.setAttribute('aria-label', 'Not'); area.dir = 'auto';
    area.dataset.ph = placeholder; area.innerHTML = this.toHtml(md); host.replaceChildren(area);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { }
    const orig = String(md ?? ''); let dirty = false;
    const ed = { area, get value() { return dirty ? self.toMd(area) : orig; }, focus() { area.focus(); } };
    const empty = () => area.classList.toggle('empty', area.children.length <= 1 && !area.textContent.trim() && !area.querySelector('figure,hr,table,.etd'));
    empty(); this.hydrate(area);

    // --- selection helpers ---
    const blockOf = n => { while (n && n.parentNode !== area) n = n.parentNode; return n && n.parentNode === area ? n : null; };
    const liOf = n => n?.nodeType === 1 ? n.closest('li') : n?.parentElement?.closest('li');
    const cur = () => { const s = getSelection(); return s.rangeCount && area.contains(s.anchorNode) ? s.anchorNode : null; };
    const place = (el, end = true) => { if (document.activeElement !== area) area.focus({ preventScroll: true }); const r = document.createRange(), s = getSelection(); const t = el.matches?.('.etd') ? el.querySelector('.tx') : el; r.selectNodeContents(t); r.collapse(!end ? true : false); s.removeAllRanges(); s.addRange(r); };
    const atStart = el => { const s = getSelection(); if (!s.rangeCount || !s.isCollapsed) return false; const r = document.createRange(); r.selectNodeContents(el); r.setEnd(s.anchorNode, s.anchorOffset); return !r.toString().split(self.ZW).join('').length; };
    const tail = el => { const s = getSelection(), r = document.createRange(); r.selectNodeContents(el); r.setStart(s.anchorNode, s.anchorOffset); const f = r.extractContents(); return f; };
    const mk = (k, inner = '<br>') => { const w = document.createElement('div');
      w.innerHTML = k === 'h1' ? `<h1>${inner}</h1>` : k === 'h2' ? `<h2>${inner}</h2>` : k === 'ul' ? `<ul><li>${inner}</li></ul>` : k === 'ol' ? `<ol><li>${inner}</li></ol>` : k === 'todo' ? self.todoHtml(false, inner)
        : k === 'quote' ? `<blockquote>${inner}</blockquote>` : k === 'code' ? `<pre>${inner}</pre>` : k === 'hr' ? '<hr contenteditable="false">'
        : k === 'table' ? '<table><tr><th><br></th><th><br></th><th><br></th></tr><tr><td><br></td><td><br></td><td><br></td></tr><tr><td><br></td><td><br></td><td><br></td></tr></table>' : `<p>${inner}</p>`;
      return w.firstElementChild; };
    const caretCell = el => el.querySelector('li, .tx, th, td') || el;

    // --- undo / redo: snapshots of the blocks + where the caret was ---
    const hist = [], fut = []; let burst = 0;
    const path = () => { const s = getSelection(); if (!s.rangeCount || !area.contains(s.anchorNode)) return null; const p = []; let n = s.anchorNode; while (n && n !== area) { p.unshift([...n.parentNode.childNodes].indexOf(n)); n = n.parentNode; } return [p, s.anchorOffset]; };
    const snap = () => ({ h: area.innerHTML, c: path() });
    const restore = st => { area.innerHTML = st.h; self.hydrate(area); try { let n = area; for (const k of st.c[0]) n = n.childNodes[k]; const r = document.createRange(); r.setStart(n, Math.min(st.c[1], n.nodeType === 3 ? n.length : n.childNodes.length)); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch { place(area.lastElementChild || area); } changed(); };
    const save = () => { hist.push(snap()); if (hist.length > 200) hist.shift(); fut.length = 0; };
    const typed = () => { const t = Date.now(); if (t - burst > 900) save(); burst = t; };
    const undo = () => { if (!hist.length) return; fut.push(snap()); restore(hist.pop()); burst = 0; haptic(6); };
    const redo = () => { if (!fut.length) return; hist.push(snap()); restore(fut.pop()); burst = 0; haptic(6); };
    ed.undo = undo; ed.redo = redo;
    const changed = () => { dirty = true; empty(); };

    // --- turning blocks into other blocks ---
    const insert = async (k, at) => {
      save(); let b = at || blockOf(cur()) || area.lastElementChild;
      if (k === 'img') { const f = await pickImg(); if (!f) return; return addImg(f, b); }
      const txt = b && b.tagName === 'P' ? b.innerHTML.replace(/^\/[^\s<]*/, '') : '';
      const blank = !txt.replace(/<br>/g, '').trim();
      const n = mk(k, blank || k === 'hr' || k === 'table' ? '<br>' : txt);
      if (b && b.tagName === 'P' && (blank || !['hr', 'table'].includes(k))) b.replaceWith(n); else if (b) b.after(n); else area.append(n);
      let go = n; if (k === 'hr' || !n.nextElementSibling && k === 'table') { const p = mk('p'); n.after(p); if (k === 'hr') go = p; }
      place(caretCell(go)); changed(); hideMenu(); haptic(8);
    };
    const pickImg = () => new Promise(ok => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => ok(i.files[0] || null); i.click(); });
    const addImg = async (file, b) => {
      if (!onImage) return; const ph = document.createElement('figure'); ph.className = 'ed-img loading'; ph.contentEditable = 'false';
      (b && b.parentNode === area ? b : area.lastElementChild)?.after(ph) ?? area.append(ph);
      try { const src = await onImage(file); if (!src) throw new Error('yok'); const w = document.createElement('div'); w.innerHTML = self.imgHtml(src, (file.name || '').replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, '')); const f = w.firstElementChild; ph.replaceWith(f); self.hydrate(f);
        if (!f.nextElementSibling) f.after(mk('p')); place(f.nextElementSibling, false); changed(); }
      catch (e) { ph.remove(); toast('Resim eklenemedi', 2600, 'x'); }
    };
    const toP = b => { const p = document.createElement('p'); const src = b.matches('.etd') ? b.querySelector('.tx') : b; p.innerHTML = src.innerHTML || '<br>'; b.replaceWith(p); return p; };
    const liToP = li => { const list = li.parentNode, p = document.createElement('p'); p.innerHTML = li.innerHTML || '<br>';
      const after = [...list.children].slice([...list.children].indexOf(li) + 1); li.remove();
      if (after.length) { const l2 = document.createElement(list.tagName); after.forEach(x => l2.append(x)); list.after(l2); }
      list.after(p); if (!list.children.length) list.remove(); return p; };

    // --- the "/" menu (desktop list at the caret, phone bottom sheet) and the phone strip ---
    const menu = document.createElement('div'); menu.className = 'ed-menu'; menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'Blok ekle');
    menu.innerHTML = `<div class="ed-in">${this.BLOCKS.map(([k, g, n, d]) => `<button type="button" role="option" data-k="${k}"><span class="gi">${esc(g)}</span><span class="nm">${n}<small>${d}</small></span></button>`).join('')}</div><div class="ed-none">Eşleşen blok yok</div>`;
    const scrim = document.createElement('div'); scrim.className = 'ed-scrim';
    let msel = 0, mfor = null, sheet = false;
    const opts = () => [...menu.querySelectorAll('button:not([hidden])')];
    const hi = () => opts().forEach((b, k) => b.setAttribute('aria-selected', String(k === msel)));
    const dlg = () => host.closest('dialog') || document.body;
    const at = (el, x, y) => { const pr = document.createElement('i'); pr.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0'; el.parentNode.append(pr); const o = pr.getBoundingClientRect(); pr.remove(); // fixed inside a moved dialog
      el.style.left = (x - o.left) + 'px'; el.style.top = (y - o.top) + 'px'; };
    const showMenu = (b, asSheet = self.phone()) => {
      mfor = b; msel = 0; sheet = asSheet; filter(''); dlg().append(scrim, menu); menu.classList.toggle('sheet', sheet); scrim.classList.toggle('on', sheet);
      if (!sheet) { const r = (b || area).getBoundingClientRect(), H = Math.min(300, menu.offsetHeight || 300); at(menu, Math.max(8, Math.min(r.left, innerWidth - 276)), r.bottom + H + 8 < innerHeight ? r.bottom + 4 : Math.max(8, r.top - H - 4)); }
      else { menu.style.left = menu.style.top = ''; area.blur?.(); }
      requestAnimationFrame(() => menu.classList.add('on')); hi();
    };
    const hideMenu = () => { if (!menu.isConnected) return; menu.classList.remove('on'); scrim.classList.remove('on'); mfor = null; setTimeout(() => { if (!menu.classList.contains('on')) { menu.remove(); scrim.remove(); } }, 220); };
    const filter = q => { const f = self.fold(q); let n = 0; menu.querySelectorAll('button').forEach((b, k) => { const B = self.BLOCKS[k], ok = !f || self.fold(B[2] + ' ' + B[4]).includes(f); b.hidden = !ok; n += ok; }); menu.classList.toggle('nil', !n); msel = 0; hi(); return n; };
    menu.addEventListener('mousedown', e => e.preventDefault());
    menu.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const at = mfor; hideMenu(); if (sheet && at) place(at); insert(b.dataset.k, at); });
    scrim.addEventListener('click', () => { const at = mfor; hideMenu(); if (at) place(at); });
    const strip = document.createElement('div'); strip.className = 'ed-strip'; strip.setAttribute('role', 'toolbar'); strip.setAttribute('aria-label', 'Not araçları');
    strip.innerHTML = `<button type="button" data-s="plus" aria-label="Blok ekle">${ic('plus', 'sm')}</button><span class="sep"></span>
      <button type="button" data-s="todo" aria-label="Onay listesi">☐</button><button type="button" data-s="ul" aria-label="Madde listesi">•</button><button type="button" data-s="h1" aria-label="Başlık">H</button>
      <button type="button" data-s="bold" aria-label="Kalın"><b>B</b></button><button type="button" data-s="italic" aria-label="İtalik"><i>I</i></button><span class="sep"></span>
      <button type="button" data-s="undo" aria-label="Geri al">↶</button><button type="button" data-s="redo" aria-label="Yinele">↷</button><button type="button" data-s="done" aria-label="Klavyeyi kapat">${ic('check', 'sm')}</button>`;
    strip.addEventListener('mousedown', e => e.preventDefault());
    strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') e.preventDefault(); });
    strip.addEventListener('click', e => { const s = e.target.closest('[data-s]')?.dataset.s; if (!s) return; haptic(6);
      if (s === 'plus') showMenu(blockOf(cur()) || area.lastElementChild, true); else if (s === 'undo') undo(); else if (s === 'redo') redo(); else if (s === 'done') area.blur();
      else if (s === 'bold' || s === 'italic') { save(); document.execCommand(s); changed(); }
      else { const b = blockOf(cur()); if (!b) return insert(s); const same = s === 'h1' ? b.tagName === 'H1' : s === 'todo' ? b.matches('.etd') : b.tagName === 'UL';
        if (same) { save(); place(b.tagName === 'UL' ? liToP(liOf(cur()) || b.firstElementChild) : toP(b)); changed(); }
        else if (b.tagName === 'P') insert(s, b); else if (/^(H1|H2|H3|BLOCKQUOTE)$/.test(b.tagName) || b.matches('.etd')) { save(); insert(s, toP(b)); } else insert(s, b); } });
    const vv = window.visualViewport, placeStrip = () => { if (!strip.isConnected || !vv) return; strip.style.transform = `translateY(${-(innerHeight - vv.height - vv.offsetTop)}px)`; };
    vv?.addEventListener('resize', placeStrip); vv?.addEventListener('scroll', placeStrip);

    // --- format bar over a selection ---
    const bar = document.createElement('div'); bar.className = 'ed-fmt'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Biçim');
    bar.innerHTML = `<div class="ef-b"><button type="button" data-c="bold" aria-label="Kalın"><b>B</b></button><button type="button" data-c="italic" aria-label="İtalik"><i>I</i></button><button type="button" data-c="mark" aria-label="Vurgula"><span class="mk">A</span></button><button type="button" data-c="code" aria-label="Kod">&lt;/&gt;</button><span class="sep"></span><button type="button" data-c="link" aria-label="Link">${ic('link', 'sm')}</button><button type="button" data-c="h2" aria-label="Başlık yap">H</button></div>
      <form class="ef-l"><input type="url" inputmode="url" placeholder="https://…" aria-label="Link adresi" enterkeyhint="done"><button type="submit" aria-label="Linki ekle">${ic('check', 'sm')}</button></form>`;
    let keep = null;
    const posBar = () => { const s = getSelection(); if (bar.classList.contains('link')) return;
      if (!s.rangeCount || s.isCollapsed || !area.contains(s.anchorNode) || !area.contains(s.focusNode) || menu.classList.contains('on')) { bar.classList.remove('on'); return; }
      const r = s.getRangeAt(0).getBoundingClientRect(); if (!r.width && !r.height) return; if (!bar.isConnected) dlg().append(bar); bar.classList.add('on');
      const below = self.phone(), w = bar.offsetWidth, h = bar.offsetHeight;
      at(bar, Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)), below || r.top - h - 8 < 8 ? r.bottom + (below ? 28 : 8) : r.top - h - 8); };
    const onSel = () => posBar(); document.addEventListener('selectionchange', onSel);
    bar.addEventListener('mousedown', e => { if (!e.target.closest('input')) e.preventDefault(); });
    const wrap = tag => { const s = getSelection(); if (!s.rangeCount) return; const r = s.getRangeAt(0), anc = (r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement).closest(tag);
      if (anc && area.contains(anc)) { anc.replaceWith(...anc.childNodes); return; } const el = document.createElement(tag); el.append(r.extractContents()); r.insertNode(el); s.removeAllRanges(); const r2 = document.createRange(); r2.selectNodeContents(el); s.addRange(r2); };
    bar.addEventListener('click', e => { const c = e.target.closest('[data-c]')?.dataset.c; if (!c) return; haptic(6);
      if (c === 'link') { keep = getSelection().getRangeAt(0).cloneRange(); bar.classList.add('link'); const i = bar.querySelector('input'); i.value = ''; i.focus(); return; }
      save(); if (c === 'bold' || c === 'italic') document.execCommand(c); else if (c === 'mark') wrap('mark'); else if (c === 'code') wrap('code');
      else if (c === 'h2') { const b = blockOf(cur()); if (b) { const h = document.createElement(b.tagName === 'H2' ? 'p' : 'h2'); h.innerHTML = (b.matches('.etd') ? b.querySelector('.tx') : b).innerHTML; b.replaceWith(h); place(h); } }
      changed(); posBar(); });
    bar.querySelector('form').addEventListener('submit', e => { e.preventDefault(); let u = bar.querySelector('input').value.trim(); bar.classList.remove('link', 'on');
      if (!keep) return; area.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(keep); keep = null;
      if (u) { if (!/^https?:\/\//i.test(u)) u = 'https://' + u; save(); document.execCommand('createLink', false, u); area.querySelectorAll('a:not([target])').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; }); changed(); } });
    bar.querySelector('input').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); bar.classList.remove('link', 'on'); if (keep) { area.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(keep); keep = null; } } });

    // --- typing ---
    const RULES = [[/^#\s$/, 'h1'], [/^##\s$/, 'h2'], [/^###\s$/, 'h2'], [/^[-*•]\s$/, 'ul'], [/^1[.)]\s$/, 'ol'], [/^\[\s?\]\s$/, 'todo'], [/^-\s?\[\s?\]\s$/, 'todo'], [/^>\s$/, 'quote'], [/^---$/, 'hr'], [/^```$/, 'code']];
    const INL = [[/\*\*([^*\n]+)\*\*$/, 'b'], [/(?:^|[^*])\*([^*\s][^*\n]*)\*$/, 'i'], [/==([^=\n]+)==$/, 'mark'], [/`([^`\n]+)`$/, 'code']];
    area.addEventListener('beforeinput', e => {
      if (e.inputType === 'historyUndo') { e.preventDefault(); undo(); return; }
      if (e.inputType === 'historyRedo') { e.preventDefault(); redo(); return; }
      typed();
    });
    area.addEventListener('input', e => {
      const n = cur(), b = blockOf(n); changed(); if (!b) return;
      if (b.tagName === 'DIV' && !b.matches('.etd')) { const p = document.createElement('p'); p.innerHTML = b.innerHTML; b.replaceWith(p); place(p); } // a stray <div> from the browser
      const t = b.textContent.split(this.ZW).join('').replace(/ /g, ' ');
      if (b.tagName === 'P') {
        if (/^\/[^\s/]{0,12}$/.test(t)) { if (!menu.classList.contains('on') || mfor !== b) showMenu(b); if (!sheet) filter(t.slice(1)); return; }
        const hit = RULES.find(([re]) => re.test(t)); if (hit && e.inputType !== 'insertFromPaste') { b.innerHTML = '<br>'; insert(hit[1], b); return; }
      }
      if (menu.classList.contains('on') && !sheet && mfor) hideMenu();
      if (b.tagName === 'PRE' || e.inputType !== 'insertText' || !n || n.nodeType !== 3) return;
      const s = getSelection(), before = n.data.slice(0, s.anchorOffset);
      for (const [re, tag] of INL) { const m = before.match(re); if (!m) continue; const whole = tag === 'i' && m[0][0] !== '*' ? m[0].slice(1) : m[0];
        const st = s.anchorOffset - whole.length; const r = document.createRange(); r.setStart(n, st); r.setEnd(n, s.anchorOffset); r.deleteContents();
        const el = document.createElement(tag); el.textContent = m[1]; r.insertNode(el); const z = document.createTextNode(this.ZW); el.after(z);
        const r2 = document.createRange(); r2.setStart(z, 1); r2.collapse(true); s.removeAllRanges(); s.addRange(r2); break; }
    });
    area.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && !e.altKey && (k === 'z' || k === 'y')) { e.preventDefault(); e.stopPropagation(); (k === 'y' || e.shiftKey) ? redo() : undo(); return; }
      if (mod && (k === 'b' || k === 'i')) { e.preventDefault(); e.stopPropagation(); save(); document.execCommand(k === 'b' ? 'bold' : 'italic'); changed(); return; }
      if (mod && e.shiftKey && (e.key === '8' || e.key === '*' || e.key === '7' || e.key === '9')) { e.preventDefault(); e.stopPropagation(); const b = blockOf(cur()); if (b?.tagName === 'P') insert(e.key === '9' ? 'todo' : e.key === '7' ? 'ol' : 'ul', b); return; }
      if (menu.classList.contains('on')) { const o = opts(), n = o.length;
        if (e.key === 'ArrowDown') { msel = (msel + 1) % n; hi(); o[msel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); return; }
        if (e.key === 'ArrowUp') { msel = (msel + n - 1) % n; hi(); o[msel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); return; }
        if (e.key === 'Enter' && n) { e.preventDefault(); const at = mfor; hideMenu(); insert(o[msel].dataset.k, at); return; }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hideMenu(); return; } }
      const n = cur(), b = blockOf(n); if (!b) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        if (b.tagName === 'PRE') { e.preventDefault(); save(); // Enter on an empty last line leaves the code block
          const sl = getSelection(), r = document.createRange(), Z = this.ZW; r.selectNodeContents(b); r.setStart(sl.anchorNode, sl.anchorOffset); const after = r.toString().split(Z).join(''); r.selectNodeContents(b); r.setEnd(sl.anchorNode, sl.anchorOffset); const before = r.toString().split(Z).join('');
          if (/\n$/.test(before) && /^\n?$/.test(after)) { b.textContent = before.replace(/\n+$/, '') || Z; const p = mk('p'); b.after(p); place(p); }
          else { const x = sl.getRangeAt(0); x.deleteContents(); const t = document.createTextNode('\n'); x.insertNode(t); if (!after) t.after(document.createTextNode(Z)); // a last empty line needs something after it to show
            const c = document.createRange(); c.setStartAfter(t); c.collapse(true); sl.removeAllRanges(); sl.addRange(c); }
          changed(); return; }
        if (b.tagName === 'TABLE') { e.preventDefault(); const c = n.nodeType === 1 ? n.closest('td,th') : n.parentElement.closest('td,th'); const row = c?.parentElement; if (!row) return; save();
          const next = row.nextElementSibling || (() => { const r = b.insertRow(); [...row.cells].forEach(() => { const d = r.insertCell(); d.innerHTML = '<br>'; }); return r; })(); place(next.cells[c.cellIndex] || next.cells[0]); changed(); return; }
        if (b.matches('.etd')) { e.preventDefault(); save(); const tx = b.querySelector('.tx');
          if (!tx.textContent.split(this.ZW).join('').trim()) { place(toP(b)); changed(); return; }
          const f = tail(tx), d = document.createElement('div'); d.innerHTML = self.todoHtml(false, ''); const nb = d.firstElementChild; nb.querySelector('.tx').replaceChildren(f); if (!nb.querySelector('.tx').textContent) nb.querySelector('.tx').innerHTML = '<br>'; if (!tx.textContent) tx.innerHTML = '<br>';
          b.after(nb); place(nb, false); changed(); return; }
        const li = liOf(n); if (li && !li.textContent.split(this.ZW).join('').trim()) { e.preventDefault(); save(); place(liToP(li)); changed(); return; }
        if (/^(H1|H2|H3|BLOCKQUOTE)$/.test(b.tagName)) { e.preventDefault(); save(); const f = tail(b), p = document.createElement('p'); p.append(f); if (!p.textContent) p.innerHTML = '<br>'; if (!b.textContent) b.innerHTML = '<br>'; b.after(p); place(p, false); changed(); return; }
        save(); return; // paragraphs and list items: the browser splits them
      }
      if (e.key === 'Backspace' && !e.isComposing && getSelection().isCollapsed) {
        const li = liOf(n); if (li && atStart(li)) { e.preventDefault(); save(); place(liToP(li), false); changed(); return; }
        if (b.matches('.etd') && atStart(b.querySelector('.tx'))) { e.preventDefault(); save(); place(toP(b), false); changed(); return; }
        if (/^(H1|H2|H3|BLOCKQUOTE|PRE)$/.test(b.tagName) && atStart(b)) { e.preventDefault(); save(); const p = document.createElement('p'); p.innerHTML = b.tagName === 'PRE' ? esc(b.textContent).replace(/\n/g, ' ') || '<br>' : b.innerHTML; b.replaceWith(p); place(p, false); changed(); return; }
        const prev = b.previousElementSibling; if (prev && atStart(b) && (prev.tagName === 'HR' || prev.tagName === 'FIGURE')) { e.preventDefault(); save(); prev.remove(); changed(); return; }
      }
      if (e.key === 'Tab' && b.tagName === 'TABLE') { e.preventDefault(); const c = (n.nodeType === 1 ? n : n.parentElement).closest('td,th'); const all = [...b.querySelectorAll('th,td')], k2 = all.indexOf(c) + (e.shiftKey ? -1 : 1);
        if (k2 >= all.length) { save(); const r = b.insertRow(); [...b.rows[0].cells].forEach(() => { const d = r.insertCell(); d.innerHTML = '<br>'; }); place(r.cells[0]); changed(); } else if (k2 >= 0) place(all[k2]); return; }
      if (e.key === 'Tab' && (liOf(n) || b.matches('.etd'))) e.preventDefault(); // stay in the note (no nested lists in the stored text)
    });
    // tick a box / remove a picture
    area.addEventListener('mousedown', e => { if (e.target.closest('.ck,.ed-x')) e.preventDefault(); });
    area.addEventListener('click', e => {
      const ck = e.target.closest('.ck'); if (ck) { save(); const t = ck.closest('.etd'), on = !t.classList.contains('on'); t.classList.toggle('on', on); ck.setAttribute('aria-checked', on); haptic(8); changed(); return; }
      const x = e.target.closest('.ed-x'); if (x) { save(); const f = x.closest('figure'); const nx = f.nextElementSibling || f.previousElementSibling; f.remove(); if (!area.children.length) area.append(mk('p')); place(nx && nx.tagName !== 'HR' && nx.tagName !== 'FIGURE' ? caretCell(nx) : area.lastElementChild); changed(); }
    });
    // paste / drop: files → pictures, HTML → cleaned Markdown, several lines → blocks
    const putMd = md => { save(); const w = document.createElement('div'); w.innerHTML = self.toHtml(md); const blocks = [...w.children];
      const b = blockOf(cur()); if (blocks.length === 1 && blocks[0].tagName === 'P') { document.execCommand('insertHTML', false, blocks[0].innerHTML); changed(); return; }
      const s = getSelection(); if (!s.isCollapsed) s.deleteFromDocument();
      let at = b; if (at && at.tagName === 'P' && !at.textContent.trim()) { at.replaceWith(...blocks); } else if (at) at.after(...blocks); else area.append(...blocks);
      const last = blocks[blocks.length - 1]; self.hydrate(area); place(caretCell(last)); changed(); };
    area.addEventListener('paste', e => {
      const cd = e.clipboardData; if (!cd) return; const files = [...cd.files].filter(f => f.type.startsWith('image/'));
      e.preventDefault(); e.stopPropagation();
      if (files.length && onImage) { const b = blockOf(cur()); files.forEach(f => addImg(f, b)); return; }
      const b = blockOf(cur()), html = cd.getData('text/html'), txt = cd.getData('text/plain');
      if (b?.tagName === 'PRE') { save(); document.execCommand('insertText', false, txt); changed(); return; }
      const md = html && b?.tagName !== 'TABLE' ? this.fromHtml(html) : txt;
      if (!md) return; if (b?.tagName === 'TABLE' || !/\n/.test(md) && !this.IMG.test(md)) { save(); document.execCommand('insertText', false, md.replace(/\n/g, ' ')); changed(); return; }
      putMd(md);
    });
    area.addEventListener('drop', e => { const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/')); if (!files.length || !onImage) return; e.preventDefault(); e.stopPropagation(); const b = blockOf(e.target) || area.lastElementChild; files.forEach(f => addImg(f, b)); });
    area.addEventListener('focus', () => { if (self.phone()) { dlg().append(strip); requestAnimationFrame(() => { strip.classList.add('on'); placeStrip(); }); } });
    area.addEventListener('blur', () => setTimeout(() => { if (area.contains(document.activeElement) || bar.contains(document.activeElement)) return; strip.classList.remove('on'); if (!sheet) hideMenu(); if (!bar.classList.contains('link')) bar.classList.remove('on'); }, 150));
    ed.destroy = () => { document.removeEventListener('selectionchange', onSel); vv?.removeEventListener('resize', placeStrip); vv?.removeEventListener('scroll', placeStrip); [menu, scrim, bar, strip].forEach(x => x.remove()); };
    return ed;
  },
};
