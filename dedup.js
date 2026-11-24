// 152: no copies. One set of rules for "is this the same thing?" used by the app's own imports, the box, Ayarlar → "Kopyaları birleştir"
// and the PC's `nts import` (bridge/import.mjs). Links: one key for every spelling of the same address (http/https, www., m./mobile.,
// a trailing /, tracking params, youtu.be ↔ youtube.com/watch?v=, upper/lower-case host, %-encoding). Files: the content's sha1;
// pictures also by their 64-bit dHash (≤ 4 bits apart = the same photo, other size or compression). Nothing is deleted here: callers
// get groups and a merge plan, the copies go to the trash so "Geri al" brings them back.
// Works in the page (window.NtsDedup) and in node (tools/test/dedup.test.mjs, bridge/import.mjs).
(function (root) {
  'use strict';
  const TRACK = /^(utm_\w+|si|igsh|igshid|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|yclid|_hsenc|_hsmi|ref_src|ref_url|feature|pp|share_id|from_share|wt_mc|spm|vero_id|_ga|mkt_tok|trk|trkCampaign|rcm|xmt|mibextid|sfnsn|cmpid)$/i;
  const YT = /^(?:youtube\.com|youtube-nocookie\.com|music\.youtube\.com)$/;
  const dec = s => { try { return decodeURIComponent(s); } catch { return s; } };
  // the same address however it was written → "host/path?sorted-query" (lower-case host, no scheme, no www/m, no tracking, no #)
  function urlKey(raw) {
    let s = String(raw || '').trim(); if (!s) return '';
    if (!/^[a-z][\w+.-]*:\/\//i.test(s)) s = 'https://' + s;
    let u; try { u = new URL(s); } catch { return s.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, ''); }
    let host = u.hostname.toLowerCase().replace(/\.$/, '').replace(/^(www\d?|m|mobile|amp)\./, '');
    let path = dec(u.pathname).normalize('NFC').replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '';
    const q = [];
    for (const [k, v] of u.searchParams) if (!TRACK.test(k)) q.push([k, v]);
    // YouTube: every form of one video → youtube.com/watch?v=ID (youtu.be/ID, /shorts/ID, /embed/ID, /live/ID, /v/ID)
    if (host === 'youtu.be' && path.length > 1) { q.splice(0, q.length, ['v', path.slice(1).split('/')[0]]); host = 'youtube.com'; path = '/watch'; }
    else if (YT.test(host)) {
      host = 'youtube.com';
      const m = path.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/); if (m) { path = '/watch'; q.splice(0, q.length, ['v', m[1]]); }
      if (path === '/watch') { const v = q.find(([k]) => k === 'v'); q.splice(0, q.length, ...(v ? [v] : [])); } // t=, list=, index= : the same video
    }
    q.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1);
    const port = u.port && !['80', '443'].includes(u.port) ? ':' + u.port : '';
    return host + port + path + (q.length ? '?' + q.map(([k, v]) => k + '=' + v).join('&') : '');
  }
  const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;
  const HID = new Set(['draw', 'vault', 'bridge', 'ghlink', 'boards', 'summaries', 'saved']);
  const isImg = i => /^image\//.test(i.mime || '') || /\.(jpe?g|png|webp|gif|heic|avif)$/i.test(i.fileName || '');
  // what makes an item "the same" as another: a link's address, a file's bytes. Notes and conversations are never merged.
  const keyOf = i => i.type === 'link' && i.url ? 'u:' + urlKey(i.url) : i.type === 'file' && i.sha ? 'h:' + i.sha : null;

  // 64-bit dHash as 16 hex letters; 5 bands of hex letters: two hashes ≤ 4 bits apart share at least one whole band (pigeonhole)
  const POP = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
  const hamming = (a, b) => { if (!a || !b || a.length !== b.length) return 64; let d = 0; for (let k = 0; k < a.length; k++) d += POP[parseInt(a[k], 16) ^ parseInt(b[k], 16)]; return d; };
  const BANDS = [[0, 3], [3, 6], [6, 9], [9, 12], [12, 16]];
  const PH_MAX = 4;

  // groups of copies among items. ph: Map id → dHash (pictures seen on this device). Returns [{ key, kind:'link'|'file'|'photo', ids:[keep, …copies] }]
  function groups(items, ph) {
    const live = items.filter(i => i && !i.deleted && !HID.has(i.type) && !i.parent); // a photo inside a WhatsApp talk stays there (the import links it instead)
    const by = new Map(), seen = new Set(), out = [];
    for (const i of live) { const k = keyOf(i); if (!k) continue; let g = by.get(k); if (!g) by.set(k, g = []); g.push(i); }
    for (const [k, g] of by) if (g.length > 1) { const s = order(g); out.push({ key: k, kind: k[0] === 'u' ? 'link' : 'file', ids: s.map(i => i.id) }); s.forEach(i => seen.add(i.id)); }
    if (ph && ph.size) { // near-same photos: union-find over band buckets
      const imgs = live.filter(i => i.type === 'file' && isImg(i) && ph.get(i.id) && !seen.has(i.id)), par = new Map(imgs.map(i => [i.id, i.id]));
      const find = x => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
      const bucket = new Map();
      for (const i of imgs) { const h = ph.get(i.id); BANDS.forEach(([a, b], n) => { const bk = n + ':' + h.slice(a, b); let l = bucket.get(bk); if (!l) bucket.set(bk, l = []); l.push(i.id); }); }
      for (const l of bucket.values()) if (l.length > 1) for (let x = 0; x < l.length; x++) for (let y = x + 1; y < l.length; y++)
        if (find(l[x]) !== find(l[y]) && hamming(ph.get(l[x]), ph.get(l[y])) <= PH_MAX) par.set(find(l[y]), find(l[x]));
      const sets = new Map(); for (const i of imgs) { const r = find(i.id); let s = sets.get(r); if (!s) sets.set(r, s = []); s.push(i); }
      for (const s of sets.values()) if (s.length > 1) out.push({ key: 'p:' + ph.get(s[0].id), kind: 'photo', ids: order(s).map(i => i.id) });
    }
    return out;
  }
  // 107f: the same note written twice (case, spaces, punctuation, Arabic marks and Turkish İ/ı don't count); ≥ 12 letters, not a chat
  const noteKey = t => (t || '').replace(/[İI]/g, 'i').replace(/ı/g, 'i').normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}]+/gu, '');
  function noteGroups(items) {
    const by = new Map(), out = [];
    for (const i of items) {
      if (!i || i.deleted || i.type !== 'note' || i.parent || i.conv || i.sticky || HID.has(i.type)) continue;
      const k = noteKey(i.text); if (k.length < 12) continue;
      let g = by.get(k); if (!g) by.set(k, g = []); g.push(i);
    }
    for (const [k, g] of by) if (g.length > 1) out.push({ key: 'n:' + k.slice(0, 40), kind: 'note', ids: order(g).map(i => i.id) });
    return out;
  }
  // which one stays: the one you saved yourself (not an archive), then the one on a board, then the one with more (tags, note, size), then the oldest
  const score = i => (i.archive ? 0 : 8) + (i.onBoard || i.pos ? 4 : 0) + (i.starred ? 2 : 0) + ((i.tags || []).length ? 1 : 0);
  const order = g => [...g].sort((a, b) => score(b) - score(a) || (b.size || 0) - (a.size || 0) || a.ts - b.ts);

  // one save of the same thing: when, from where (kept inside the item that stays, newest last)
  const saveOf = i => ({ ts: i.ts, src: i.source || 'manual', ...(i.chat ? { chat: i.chat } : {}), id: i.id });
  // merge copies into keep: tags, note, project, board place, star, to-do and highlights come along; returns { keep, gone }
  // keep gets saves:[…] (every time it was saved, the first one first; its own ts and place stay); gone = the copies, marked deleted (→ trash, Geri al works)
  function merge(keep, copies, t = Date.now()) {
    const k = { ...keep }, saves = new Map((k.saves || [saveOf(keep)]).map(s => [s.id, s]));
    saves.has(keep.id) || saves.set(keep.id, saveOf(keep));
    const gone = [];
    for (const c of copies) {
      if (!c || c.id === keep.id) continue;
      for (const s of c.saves || [saveOf(c)]) saves.set(s.id, s);
      k.tags = [...new Set([...(k.tags || []), ...(c.tags || [])])];
      if (c.text && c.text.trim() && !(k.text || '').includes(c.text.trim())) k.text = [k.text, c.text].filter(x => x && x.trim()).join('\n\n');
      for (const f of ['project', 'title', 'summary', 'todo', 'color', 'pos', 'board']) if (k[f] == null && c[f] != null) k[f] = c[f];
      if (c.onBoard && !k.onBoard) { k.onBoard = true; if (k.archive && !c.archive) k.archive = false; }
      if (c.starred) k.starred = true;
      if (c.highlights?.length) k.highlights = [...(k.highlights || []), ...c.highlights];
      if (c.lists?.length) k.lists = [...new Set([...(k.lists || []), ...c.lists])];
      if (c.links?.length) k.links = [...new Set([...(k.links || []), ...c.links.filter(x => x !== keep.id)])];
      gone.push({ ...c, deleted: true, deletedAt: t, dupOf: keep.id });
    }
    k.saves = [...saves.values()].sort((a, b) => a.ts - b.ts);
    k.tags ||= [];
    return { keep: k, gone };
  }
  // add one more save (a WhatsApp message with the same link/photo) to an item that is already there
  function addSave(keep, s) {
    const saves = new Map((keep.saves || [saveOf(keep)]).map(x => [x.id, x])); saves.set(s.id, s);
    const l = [...saves.values()].sort((a, b) => a.ts - b.ts);
    return { ...keep, saves: l }; // ts stays: the item keeps its place in the list and on the board
  }
  const MON = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  // "3 kez kaydedildi · ilk Mar 2024 · WhatsApp'ta da var" (null when saved once)
  function savesLine(i) {
    const s = i.saves || []; if (s.length < 2) return null;
    const d = new Date(s[0].ts), wa = s.some(x => x.src === 'whatsapp') && s.some(x => x.src !== 'whatsapp');
    return `${s.length} kez kaydedildi · ilk ${MON[d.getMonth()]} ${d.getFullYear()}${wa ? ' · WhatsApp\'ta da var' : ''}`;
  }
  // index of what is already there, for an import: url key → item, sha → item (+ ph list for near-same photos)
  function index(items, ph) {
    const u = new Map(), h = new Map(), p = [];
    for (const i of items) {
      if (!i || i.deleted || HID.has(i.type)) continue;
      if (i.type === 'link' && i.url) { const k = urlKey(i.url); if (!u.has(k) || (u.get(k).archive && !i.archive)) u.set(k, i); }
      if (i.type === 'file' && i.sha && !h.has(i.sha)) h.set(i.sha, i);
      if (ph && i.type === 'file' && ph.get(i.id)) p.push([ph.get(i.id), i]);
    }
    return { url: k => u.get(urlKey(k)), sha: s => s && h.get(s), photo: d => { if (!d) return null; for (const [x, i] of p) if (hamming(x, d) <= PH_MAX) return i; return null; },
      add(i, d) { if (i.type === 'link' && i.url) { const k = urlKey(i.url); if (!u.has(k)) u.set(k, i); } if (i.sha && !h.has(i.sha)) h.set(i.sha, i); if (d) p.push([d, i]); } };
  }

  const api = { urlKey, keyOf, groups, noteGroups, noteKey, merge, addSave, saveOf, savesLine, index, hamming, isImg, PH_MAX, URL_RE };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.NtsDedup = api;
})(typeof self !== 'undefined' ? self : this);
