'use strict';
// 119-1: zoomed out, the board draws its clusters the way the owner chose (design/zoomout8.html, box 1 "Gerçek suluboya"):
// cards that stand together and share a topic (project, else first tag) are wrapped in a hand-drawn shape picked at random per
// cluster (bubble / blob / oval / uneven four sides, rough.js), in the topic's colour with a watercolour wash that slips off the
// line; the title in the app's font, bold, in that colour, with "N kayıt · bugün" under it; between clusters a teacher's-pen arrow
// (a little tick at the start, long open head) with the reason beside it. It fades in from 60 % zoom, full at 40 %, gone in the
// month tiles (Board.FAR). Shapes are made only for clusters near the screen and kept; the watercolour grain is off while zooming.
const ZC = {
  PAD: 30, GAP: 84, ON: .6, FULL: .4,
  list: [], els: new Map(), arrows: [],
  NS: 'http://www.w3.org/2000/svg',
  sv(tag, at) { const e = document.createElementNS(this.NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; },
  topic: i => (i.tags || [])[0] || i.project || null, // 119-3: the owner groups by tags ("etiketlere göre"); a project counts when there is no tag
  // --- model: connected cards with the same topic (grid hash, so 10k cards stay cheap) ---
  build() {
    const M = Board.M; this.list = []; this.byCard = new Map(); this._ak = null;
    for (const el of this.els.values()) { el.g.remove(); el.l.remove(); } this.els.clear();
    if (!M || typeof rough === 'undefined') return this.arrowsBuild();
    const cards = [...M.values()].filter(m => !m.i.sticky && this.topic(m.i)), C = 400, grid = new Map(), cell = (x, y) => Math.floor(x / C) + ',' + Math.floor(y / C);
    for (const m of cards) { const k = cell(m.x, m.y); (grid.get(k) || grid.set(k, []).get(k)).push(m); }
    const gx = Board.mode() === 'time' ? 24 : this.GAP; // 119-4: on the day layout a cluster stays inside its day (never across the day lines)
    const near = (a, b) => b.x - (a.x + a.w) < gx && a.x - (b.x + b.w) < gx && b.y - (a.y + a.h) < this.GAP && a.y - (b.y + b.h) < this.GAP;
    const seen = new Set();
    for (const m of cards) {
      if (seen.has(m)) continue; const t = this.topic(m.i), q = [m], mem = []; seen.add(m);
      while (q.length) { const a = q.pop(); mem.push(a); const cx = Math.floor(a.x / C), cy = Math.floor(a.y / C);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const b of grid.get((cx + dx) + ',' + (cy + dy)) || []) if (!seen.has(b) && this.topic(b.i) === t && near(a, b)) { seen.add(b); q.push(b); } }
      if (mem.length < 3) continue; // two cards are not a cluster: from far away they only crowd the board
      const bb = { x: Infinity, y: Infinity, r: -Infinity, b: -Infinity }; let last = 0;
      for (const a of mem) { bb.x = Math.min(bb.x, a.x); bb.y = Math.min(bb.y, a.y); bb.r = Math.max(bb.r, a.x + a.w); bb.b = Math.max(bb.b, a.y + a.h + 24); /* 167: real cards run a bit taller than the estimate */ last = Math.max(last, a.i.ts); }
      const id = t + '|' + Math.round(bb.x) + '|' + Math.round(bb.y), c = { id, t, mem, bb, last, cx: (bb.x + bb.r) / 2, cy: (bb.y + bb.b) / 2, seed: this.seedOf(id) };
      this.list.push(c); for (const a of mem) this.byCard.set(a.i.id, c);
    }
    this.arrowsBuild();
  },
  seedOf: s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 99991; return h + 1; },
  // one arrow per pair of clusters, the strongest reason (own link > AI related > same share), at most 60, never across the whole board
  arrowsBuild() {
    this.arrows = []; if (!this.list.length) return;
    const pair = new Map(), rank = { man: 3, rel: 2, g: 1 };
    for (const [a, b, kind] of Board.edges(new Set(this.byCard.keys()))) {
      const A = this.byCard.get(a), B = this.byCard.get(b); if (!A || !B || A === B) continue;
      const k = A.id < B.id ? A.id + '>' + B.id : B.id + '>' + A.id, p = pair.get(k) || pair.set(k, { A, B, n: 0, kind }).get(k);
      p.n++; if (rank[kind] > rank[p.kind]) p.kind = kind;
    }
    this.arrows = [...pair.values()].filter(p => Math.hypot(p.A.cx - p.B.cx, p.A.cy - p.B.cy) < 3000).slice(0, 60);
  },
  // --- drawing ---
  layer() {
    if (this._L) return this._L;
    const plane = $('#plane'), svg = this.sv('svg', { class: 'zc-svg' }), lb = document.createElement('div'); lb.className = 'zc-lbls';
    const defs = this.sv('defs', {}), f = this.sv('filter', { id: 'zcwc', x: '-10%', y: '-10%', width: '120%', height: '120%' });
    f.append(this.sv('feTurbulence', { type: 'fractalNoise', baseFrequency: '.035', numOctaves: 3, seed: 7, result: 'n' }), this.sv('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 16, xChannelSelector: 'R', yChannelSelector: 'G' }));
    defs.append(f); const gS = this.sv('g', {}), gA = this.sv('g', { class: 'zc-arrows' }); svg.append(defs, gS, gA);
    plane.insertBefore(svg, plane.firstChild); plane.appendChild(lb);
    lb.addEventListener('click', e => { const l = e.target.closest('[data-zc]'); if (!l) return; e.stopPropagation(); const c = this.list.find(x => x.id === l.dataset.zc); if (c) this.fly(c); });
    lb.addEventListener('pointerdown', e => { if (e.target.closest('[data-zc]')) e.stopPropagation(); });
    this.rc = rough.svg(svg);
    return this._L = { svg, lb, gS, gA };
  },
  rnd: s => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646,
  // 169 (sahip: "bu sarı, rastgele ama kare; beğendim, diğerleri de buna benzer rastgele olsun"): every cluster is a hand-drawn square —
  // its corners pushed out a little at random, its sides wobbling softly, each one a bit different (from its seed); never over the cards
  outline(c) {
    const P = this.PAD, b = { x: c.bb.x - P, y: c.bb.y - P, w: c.bb.r - c.bb.x + 2 * P, h: c.bb.b - c.bb.y + 2 * P }, R = this.rnd(c.seed), J = Math.min(28, 8 + c.mem.length * 1.5), o = () => R() * J;
    const C = [[b.x - o(), b.y - o()], [b.x + b.w + o(), b.y - o()], [b.x + b.w + o(), b.y + b.h + o()], [b.x - o(), b.y + b.h + o()]], pts = [];
    for (let k = 0; k < 4; k++) { const a = C[k], z = C[(k + 1) % 4], n = Math.max(2, Math.round(Math.hypot(z[0] - a[0], z[1] - a[1]) / 70)); for (let t = 0; t < n; t++) pts.push([a[0] + (z[0] - a[0]) * t / n, a[1] + (z[1] - a[1]) * t / n]); }
    return this.smooth(this.wob(pts, c.seed, 3 + R() * 4, 60 + R() * 60));
  },
  wob(P, seed, amp, wave) { const R = this.rnd(seed), p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28; let s = 0;
    return P.map((p, i) => { if (i) s += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]); const t = s / wave;
      return [p[0] + amp * (Math.sin(t + p1) + .5 * Math.sin(2.3 * t + p3)), p[1] + amp * (Math.sin(1.3 * t + p2) + .5 * Math.sin(2.9 * t + p1))]; }); },
  smooth(P) { const n = P.length, g = i => P[(i + n) % n], f = v => v.toFixed(1); let d = `M${f(P[0][0])},${f(P[0][1])}`;
    for (let i = 0; i < n; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`; }
    return d + 'Z'; },
  blob(c, r) { const pts = []; for (const m of c.mem) for (const [qx, qy] of [[m.x, m.y], [m.x + m.w, m.y], [m.x, m.y + m.h], [m.x + m.w, m.y + m.h]]) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; pts.push([qx + r * Math.cos(a), qy + r * Math.sin(a)]); }
    const s = pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of s) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const H = lo.slice(0, -1).concat(up.slice(0, -1)), P = []; for (let i = 0; i < H.length; i++) { const a = H[i], b = H[(i + 1) % H.length]; P.push(a); const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let t = 70; t < L; t += 70) P.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); }
    return P; },
  paint(node, prop, col) { node.querySelectorAll('path').forEach(p => { if (prop === 'fill') { p.removeAttribute('fill'); p.style.fill = col; } p.style.stroke = prop === 'fill' ? 'none' : col; }); return node; },
  ago(ts) { const d = Math.round((new Date(dayKey(now())) - new Date(dayKey(ts))) / 864e5); return d <= 0 ? 'bugün' : d === 1 ? 'dün' : d + ' gün önce'; },
  draw(c) {
    const L = this.layer(), col = tagCol(c.t), d = this.outline(c), g = this.sv('g', { class: 'zc-c' });
    // 167: the watercolour is two soft washes slightly off each other (the paper-grain filter cost ~25 ms a frame on a big board)
    const w = this.rc.path(d, { fill: 'F', fillStyle: 'solid', stroke: 'none', roughness: 1.3, seed: c.seed + 3 }); w.setAttribute('transform', 'translate(8 7)');
    const w2 = this.rc.path(d, { fill: 'F', fillStyle: 'solid', stroke: 'none', roughness: 2, seed: c.seed + 9 }); w2.setAttribute('transform', 'translate(-5 4)');
    const ln = this.rc.path(d, { stroke: 'S', strokeWidth: 2.4, roughness: 1, bowing: .6, disableMultiStroke: true, seed: c.seed }); ln.classList.add('zc-line');
    g.append(this.paint(w, 'fill', `color-mix(in srgb, ${col} 13%, transparent)`), this.paint(w2, 'fill', `color-mix(in srgb, ${col} 8%, transparent)`), this.paint(ln, 'stroke', col));
    L.gS.append(g);
    const l = document.createElement('button'); l.type = 'button'; l.className = 'zc-l'; l.dataset.zc = c.id; l.style.left = c.bb.x - this.PAD + 6 + 'px'; const below = Board.mode() === 'time'; if (below) l.classList.add('below'); l.style.top = (below ? c.bb.b + this.PAD + 12 : c.bb.y - this.PAD - 12) + 'px'; // day layout: under the shape, clear of the day heads l.style.setProperty('--c', col);
    const name = c.t.charAt(0).toLocaleUpperCase('tr') + c.t.slice(1);
    l.innerHTML = `<b dir="auto">${esc(name)}</b><small>${c.mem.length} kayıt · ${this.ago(c.last)}</small>`; l.setAttribute('aria-label', `${name}: ${c.mem.length} kayıt — yaklaş`);
    L.lb.append(l); this.els.set(c.id, { g, l });
  },
  edge(c, tx, ty, pad) { const dx = tx - c.cx, dy = ty - c.cy, hw = (c.bb.r - c.bb.x) / 2 + pad, hh = (c.bb.b - c.bb.y) / 2 + pad, t = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)); return [c.cx + dx * t, c.cy + dy * t]; },
  drawArrows(v) {
    const L = this.layer(), key = this.arrows.length + '|' + this.list.length; if (this._ak === key) return; this._ak = key;
    L.gA.replaceChildren(); L.lb.querySelectorAll('.zc-al').forEach(x => x.remove());
    const PX = 1 / .36, rc = this.rc;
    this.arrows.forEach((r, n) => { let { A, B } = r; if (A.last > B.last) [A, B] = [B, A];
      const p = this.edge(A, B.cx, B.cy, this.PAD + 30), q = this.edge(B, A.cx, A.cy, this.PAD + 30), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1];
      const cx = mx - dy * .24, cy = my + dx * .24, bz = t => [(1 - t) ** 2 * p[0] + 2 * (1 - t) * t * cx + t * t * q[0], (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * cy + t * t * q[1]], ang = Math.atan2(q[1] - cy, q[0] - cx);
      const s0 = [p[0] - (cx - p[0]) * .06 + 4, p[1] - (cy - p[1]) * .06 - 5], o = { stroke: 'S', strokeWidth: 2.5, roughness: .7, disableMultiStroke: true, seed: n * 13 + 5 };
      const body = rc.curve([s0, p, bz(.4), bz(.75), q], o), H = 26, h1 = [q[0] - H * Math.cos(ang - .5), q[1] - H * Math.sin(ang - .5)], h2 = [q[0] - H * Math.cos(ang + .38), q[1] - H * Math.sin(ang + .38)];
      const head = rc.curve([h1, [q[0] - 6 * Math.cos(ang - .25), q[1] - 6 * Math.sin(ang - .25)], q, [q[0] - 7 * Math.cos(ang + .3), q[1] - 7 * Math.sin(ang + .3)], h2], { ...o, roughness: .4, seed: o.seed + 1 });
      for (const x of [body, head]) { x.classList.add('zc-arw'); L.gA.append(x); }
      const ap = bz(.5), nl = Math.hypot(ap[0] - mx, ap[1] - my) || 1, lab = document.createElement('span'); lab.className = 'zc-al';
      lab.style.left = ap[0] + (ap[0] - mx) / nl * 17 * PX + 'px'; lab.style.top = ap[1] + (ap[1] - my) / nl * 17 * PX + 'px';
      lab.textContent = r.kind === 'man' ? `${r.n} bağ` : r.kind === 'rel' ? 'benzer' : 'birlikte geldi'; L.lb.append(lab); });
  },
  // --- per frame / per cull ---
  zoom(k) {
    const L = this._L, far = k < Board.FAR, o = far ? 0 : Math.max(0, Math.min(1, (this.ON - k) / (this.ON - this.FULL)));
    if (!L) { if (o > 0 && this.list.length) this.cull(); return; }
    L.svg.style.opacity = L.lb.style.opacity = o; L.svg.style.display = L.lb.style.display = o ? '' : 'none';
    if (!this._zk || Math.abs(k - this._zk) / k > .2) { this._zk = k; L.svg.style.setProperty('--zik', (1 / k).toFixed(3)); } // 167
    L.lb.style.setProperty('--zls', (Math.max(.68, Math.min(1, k / .36)) / k).toFixed(4)); L.lb.style.pointerEvents = o > .5 ? '' : 'none';
    $('#board')?.classList.toggle('zc-on', o > .35);
  },
  cull() {
    const c = S.cam; if (!c || !this.list.length || c.k >= this.ON || c.k < Board.FAR) return this.zoom(c ? c.k : 1);
    const v = Board.view(400); if (!v) return;
    for (const x of this.list) if (!this.els.has(x.id) && x.bb.x < v.x2 && x.bb.r > v.x1 && x.bb.y < v.y2 && x.bb.b > v.y1) this.draw(x);
    this.drawArrows(v); this.zoom(c.k);
    clearTimeout(this._ct); this._ct = setTimeout(() => this.declutter(), 120);
  },
  // titles never sit on each other: the bigger cluster keeps its title, a smaller one that would overlap hides it (checked when the zoom rests)
  declutter() {
    const L = this._L; if (!L || L.svg.style.display === 'none') return;
    const z = parseFloat(L.lb.style.getPropertyValue('--zls')) || 1, placed = [];
    const ls = [...this.els.entries()].map(([id, e]) => [this.list.find(c => c.id === id), e.l]).filter(x => x[0]).sort((a, b) => b[0].mem.length - a[0].mem.length);
    const sz = ls.map(([, l]) => [l.offsetWidth * z, l.offsetHeight * z]); // one read pass, then writes
    ls.forEach(([, l], n) => { const x = parseFloat(l.style.left), y = parseFloat(l.style.top), [w, h] = sz[n], r = l.classList.contains('below') ? { x1: x - 8 * z, x2: x + w + 8 * z, y1: y - 6 * z, y2: y + h + 6 * z } : { x1: x - 8 * z, x2: x + w + 8 * z, y1: y - h - 6 * z, y2: y + 6 * z };
      const hit = placed.some(p => p.x1 < r.x2 && p.x2 > r.x1 && p.y1 < r.y2 && p.y2 > r.y1); l.classList.toggle('zc-hide', hit); if (!hit) placed.push(r); });
  },
  fly(c) {
    const [w, h] = Board.size(), bw = c.bb.r - c.bb.x + 160, bh = c.bb.b - c.bb.y + 160, k = Math.min(1, w / bw, (h - 60) / bh);
    Board.animate(() => { S.cam = { k, x: w / 2 - c.cx * k, y: h / 2 - c.cy * k }; Board.apply(); });
  },
};
