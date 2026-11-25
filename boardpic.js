'use strict';
// 159: a photo on a board card is big enough to see what is in it: the card's full width, its own shape (height from the picture's
// ratio, 110–360 px; a very tall screenshot shows its top), and sharp: a 960 px preview made once from the original on this device
// (files store id:m, never synced). The small 320 px thumbnail still comes first, the sharp one replaces it when decoded.
const BoardPic = {
  W: 240, MIN: 110, MAX: 360, DEF: 180, SIZE: 960,
  urls: new Map(),
  isPic: i => fileKind(i) === 'image' || (!!i.cover && fileKind(byId(i.cover) || {}) === 'image') || !!noteCover(i),
  ratio(i) { const id = i.cover || noteCover(i)?.id || i.id; return GAR.get(id) || GAR.get(i.id); },
  // the picture box height on the board (Board.est uses it, so the layout is right before the picture arrives)
  h(i) {
    if (!this.isPic(i)) return 132;
    const r = this.ratio(i); return r ? Math.max(this.MIN, Math.min(this.MAX, Math.round(this.W / r))) : this.DEF;
  },
  card(c, i) { const t = c.querySelector(':scope > .thumb'); if (!t || !this.isPic(i)) return; t.style.height = this.h(i) + 'px'; t.classList.add('pic'); },
  // a picture's shape just became known: the board lays its cards out again once (batched)
  learned(el) { if (!el.closest('#plane')) return; clearTimeout(this._t); this._t = setTimeout(() => { if (S.view === 'board' && !Board.busy) { Board._key = null; render(true); } }, 350); },
  async mid(i) {
    if (this.urls.has(i.id)) return this.urls.get(i.id);
    let b = (await DB.get('files', i.id + ':m'))?.blob;
    if (!b) {
      const rec = await DB.get('files', i.id); if (!rec?.blob || !/^image\//.test(rec.blob.type || i.mime || 'image/')) return null;
      const bmp = await createImageBitmap(rec.blob), r = Math.min(1, this.SIZE / Math.max(bmp.width, bmp.height));
      if (r === 1 && rec.blob.size < 400e3) { bmp.close(); b = rec.blob; } // small already: use it as it is
      else { const c = new OffscreenCanvas(Math.round(bmp.width * r), Math.round(bmp.height * r)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
        b = await c.convertToBlob({ type: 'image/webp', quality: .82 }); await DB.put('files', { id: i.id + ':m', blob: b }); }
    }
    const u = URL.createObjectURL(b); this.urls.set(i.id, u); return u;
  },
  // after the small thumbnail: swap in the sharp one (board cards of photos only)
  sharp(box, i) {
    if (!(box.closest('#plane') || box.classList.contains('lpic')) || fileKind(i) !== 'image' || typeof OffscreenCanvas === 'undefined') return;
    this.mid(i).then(u => { if (!u || !box.isConnected) return; const img = box.querySelector('img'); if (!img || img.src === u) return;
      const n = new Image(); n.src = u; (n.decode ? n.decode() : Promise.resolve()).then(() => { if (box.isConnected) img.src = u; }, () => { }); }).catch(() => { });
  },
};
