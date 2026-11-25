'use strict';
// 168 (sahip: "uzaklaşınca kalite düşse, fotoğraf gibi olsun, zaten uzaktan anlaşılmıyor"): below LITE zoom the board stops keeping
// hundreds of real cards in the page and paints them on ONE canvas instead — a plain card box, its picture when there is one,
// two grey lines for the words. Drawn per frame from Board.M (a few ms for thousands of cards); the real cards come back when you
// zoom in. Day heads, cluster shapes and titles stay as they are.
const BoardLite = {
  LITE: .4, // below 40 % the words are not readable anyway
  imgs: new Map(), asked: new Set(), // id → Image (thumbnails already made on this device)
  on() { const c = S.cam; return S.view === 'board' && !!c && c.k < this.LITE && (c.k >= Board.FAR || Board.mode() === 'topic'); },
  cv() {
    if (this._cv) return this._cv;
    const c = document.createElement('canvas'); c.className = 'board-lite'; c.setAttribute('aria-hidden', 'true');
    $('#board').insertBefore(c, $('#plane').nextSibling); return this._cv = c;
  },
  colors() {
    if (this._col && this._th === document.documentElement.dataset.theme) return this._col;
    const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
    this._th = document.documentElement.dataset.theme;
    return this._col = { card: v('--surface') || '#fff', line: v('--line') || '#ddd', ink: v('--line-2') || '#ccc', pic: v('--surface-2') || '#eee' };
  },
  draw() {
    const on = this.on(), c = this._cv;
    if (!on) { if (c && !c.hidden) { c.hidden = true; } return; }
    const cv = this.cv(), [w, h] = Board.size(), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
    cv.hidden = false;
    const g = cv.getContext('2d'), { k, x: ox, y: oy } = S.cam, col = this.colors(), want = [];
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const x1 = -ox / k - 300, y1 = -oy / k - 300, x2 = (w - ox) / k + 300, y2 = (h - oy) / k + 300, r = Math.max(2, 10 * k);
    for (const m of Board.M.values()) {
      if (m.x > x2 || m.x + m.w < x1 || m.y > y2 || m.y + m.h < y1) continue;
      const X = m.x * k + ox, Y = m.y * k + oy, W = m.w * k, H = (m.auto ? m.h : Board.est(m.i)) * k;
      if (m.i.sticky) { g.fillStyle = m.i.sticky === 'text' ? 'transparent' : '#fde68a'; g.fillRect(X, Y, W, H); continue; }
      g.fillStyle = col.card; g.beginPath(); g.roundRect(X, Y, W, H, r); g.fill();
      g.strokeStyle = col.line; g.lineWidth = 1; g.stroke();
      let ty = Y + 8 * k;
      if (hasVisual(m.i)) {
        const ph = (BoardPic.h ? BoardPic.h(m.i) : 132) * k, im = this.imgs.get(m.i.id);
        g.save(); g.beginPath(); g.roundRect(X, Y, W, ph, [r, r, 0, 0]); g.clip();
        if (im?.complete && im.naturalWidth) { const s = Math.max(W / im.naturalWidth, ph / im.naturalHeight); g.drawImage(im, X + (W - im.naturalWidth * s) / 2, Y, im.naturalWidth * s, im.naturalHeight * s); }
        else { g.fillStyle = col.pic; g.fillRect(X, Y, W, ph); if (!this.asked.has(m.i.id)) want.push(m.i); }
        g.restore(); ty = Y + ph + 8 * k;
      }
      if (k > .06) { g.fillStyle = col.ink; const lh = Math.max(1, 7 * k); g.fillRect(X + 12 * k, ty + 4 * k, W * .7, lh); g.fillRect(X + 12 * k, ty + 16 * k, W * .45, lh); }
    }
    for (const i of want.slice(0, 12)) this.load(i);
  },
  load(i) {
    this.asked.add(i.id); // asked once
    Prev.thumb(i).then(u => { if (!u) return; const im = new Image(); im.decoding = 'async'; im.referrerPolicy = 'no-referrer'; im.onload = () => { this.imgs.set(i.id, im); this.soon(); }; im.src = u; }, () => { });
  },
  soon() { if (this._q) return; this._q = requestAnimationFrame(() => { this._q = 0; this.draw(); }); },
};
