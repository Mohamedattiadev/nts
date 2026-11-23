// 104f: semantic search on this device (module worker). A small multilingual embedding model (multilingual-e5-small, int8,
// knows Turkish, English and Arabic together: fatura ↔ invoice ↔ فاتورة) turns each item's text into 384 numbers; a search is
// the nearest ones. Nothing leaves the device: the model is downloaded once (the browser keeps it in its cache), the numbers
// live in IndexedDB (nts-sem), 384 bytes per item.
// in:  {t:'init'} · {t:'sync', put:[[id, text]], del:[id]} · {t:'query', n, q, k} · {t:'wipe'}
//      {t:'folders', force} · {t:'fout'|'fin', c, id} · {t:'fmerge', a, b}   (131b: folders by meaning)
// out: {t:'progress', p} · {t:'ready', n} · {t:'indexed', done, left} · {t:'hits', n, q, list:[[id, sim]]} · {t:'error', m}
//      {t:'folders', list:[{c, ids}], ms}
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';
const MODEL = 'Xenova/multilingual-e5-small', DIM = 384;
let ext = null, loading = null, db = null;
const vecs = new Map(); // id -> { h, v: Int8Array }
const queue = new Map(); // id -> text, waiting to be embedded
const post = m => postMessage(m);

const idb = () => db || (db = new Promise((ok, no) => {
  const r = indexedDB.open('nts-sem', 2);
  r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('v')) d.createObjectStore('v'); if (!d.objectStoreNames.contains('c')) d.createObjectStore('c'); };
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
}));
const tx = async (mode, fn, st = 'v') => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction(st, mode), s = t.objectStore(st); const r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => no(t.error); }); };
async function loadVecs() {
  const d = await idb();
  await new Promise(ok => {
    const c = d.transaction('v').objectStore('v').openCursor();
    c.onsuccess = () => { const x = c.result; if (!x) return ok(); vecs.set(x.key, x.value); x.continue(); };
    c.onerror = () => ok();
  });
}
// a short hash of the text: an item is embedded again only when its text changed
const hash = s => { let h = 2166136261; for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619); return (h >>> 0).toString(36) + s.length; };

async function model() {
  if (ext) return ext;
  return loading || (loading = (async () => {
    const { pipeline, env } = await import(LIB);
    env.allowLocalModels = false;
    const seen = new Map();
    ext = await pipeline('feature-extraction', MODEL, {
      dtype: 'q8',
      progress_callback: x => { // the files arrive in parts: one percent for all of them
        if (x.status !== 'progress' || !x.total) return;
        seen.set(x.file, [x.loaded, x.total]); let a = 0, b = 0; for (const [l, t] of seen.values()) { a += l; b += t; }
        post({ t: 'progress', p: Math.round(a / b * 100), mb: Math.round(b / 1e6) });
      },
    });
    return ext;
  })().catch(e => { loading = null; throw e; }));
}
// normalized vector → int8 (cosine stays almost the same, 4× smaller)
async function embed(texts, pre) {
  const m = await model(), out = await m(texts.map(t => pre + t), { pooling: 'mean', normalize: true });
  const f = out.data, r = [];
  for (let k = 0; k < texts.length; k++) { const v = new Int8Array(DIM); for (let d = 0; d < DIM; d++) v[d] = Math.round(f[k * DIM + d] * 127); r.push(v); }
  return r;
}

let working = false;
async function work() {
  if (working) return; working = true;
  try {
    while (queue.size) {
      const batch = [...queue].slice(0, 8); batch.forEach(([id]) => queue.delete(id));
      const vs = await embed(batch.map(b => b[1]), 'passage: ');
      const rows = batch.map(([id, t], k) => [id, { h: hash(t), v: vs[k] }]);
      rows.forEach(([id, x]) => { vecs.set(id, x); join(id, x.v); });
      await tx('readwrite', s => rows.forEach(([id, x]) => s.put(x, id)));
      post({ t: 'indexed', done: vecs.size, left: queue.size });
      await new Promise(r => setTimeout(r, 0)); // a query that arrives meanwhile goes first
    }
    if (joined) { joined = false; await saveFolders(); postFolders(); }
  } catch (e) { post({ t: 'error', m: String(e?.message || e) }); }
  working = false;
}

async function query(q, k) {
  const [v] = await embed([q], 'query: '), list = [];
  for (const [id, x] of vecs) { let s = 0; const w = x.v; for (let d = 0; d < DIM; d++) s += v[d] * w[d]; list.push([id, s / 16129]); }
  // e5 scores sit close together (~.78–.88 for anything), so a fixed line doesn't work: each score is given as how far it stands
  // above this query's own crowd (z = (s − mean) / spread); only the ones that stand out are meaning hits
  const n = list.length || 1, mean = list.reduce((a, x) => a + x[1], 0) / n, sd = Math.sqrt(list.reduce((a, x) => a + (x[1] - mean) ** 2, 0) / n) || 1;
  return list.map(([id, s]) => [id, (s - mean) / sd]).sort((a, b) => b[1] - a[1]).slice(0, k);
}

// 133: items close in meaning to one item (its own stored numbers, no model run): the same crowd rule as query()
function like(id, k) {
  const v = vecs.get(id)?.v; if (!v) return [];
  const list = [];
  for (const [j, x] of vecs) { if (j === id) continue; let s = 0; const w = x.v; for (let d = 0; d < DIM; d++) s += v[d] * w[d]; list.push([j, s / 16129]); }
  const n = list.length || 1, mean = list.reduce((a, x) => a + x[1], 0) / n, sd = Math.sqrt(list.reduce((a, x) => a + (x[1] - mean) ** 2, 0) / n) || 1;
  return list.map(([j, s]) => [j, (s - mean) / sd]).sort((a, b) => b[1] - a[1]).slice(0, k);
}

// 131b: folders by meaning. Spherical k-means over the stored numbers (a sample of ≤3000 learns the centres, then every item goes to
// its nearest one); a member far below its folder's own crowd (mean − 1.5 sd) is left out, that line is also the bar a NEW item must
// clear to join on its own. Folders keep their id (c) across a regroup when most of the members are the same, so a name, a pin or
// "bu kayıt buraya ait değil" (out) survive. Saved in nts-sem 'c'. 10k items ≈ 0.5 s here, off the page.
let F = null, joined = false; // { n, list:[{ c, cen: Float32Array, th, ids:Set, out:Set }] }
const f32 = v => { const r = new Float32Array(DIM); for (let d = 0; d < DIM; d++) r[d] = v[d] / 127; return r; };
const dot = (a, b) => { let s = 0; for (let d = 0; d < DIM; d++) s += a[d] * b[d]; return s; };
const unit = a => { let s = 0; for (let d = 0; d < DIM; d++) s += a[d] * a[d]; s = Math.sqrt(s) || 1; for (let d = 0; d < DIM; d++) a[d] /= s; return a; };
function rnd(seed) { return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296; }
function kmeans(X, K, R) { // X: Float32Array[] (unit), → centres
  const n = X.length, C = [X[Math.floor(R() * n)].slice()], best = new Float32Array(n).fill(-2);
  while (C.length < K) { // k-means++: far from every centre so far is likelier
    const c = C[C.length - 1]; let tot = 0;
    for (let k = 0; k < n; k++) { const s = dot(X[k], c); if (s > best[k]) best[k] = s; tot += 1 - best[k]; }
    let r = R() * tot, k = 0; for (; k < n - 1; k++) { r -= 1 - best[k]; if (r <= 0) break; } C.push(X[k].slice());
  }
  const a = new Int32Array(n);
  for (let it = 0; it < 14; it++) {
    let moved = 0;
    for (let k = 0; k < n; k++) { let bj = 0, bs = -2; for (let j = 0; j < K; j++) { const s = dot(X[k], C[j]); if (s > bs) { bs = s; bj = j; } } if (a[k] !== bj) { a[k] = bj; moved++; } }
    const S = C.map(() => new Float32Array(DIM));
    for (let k = 0; k < n; k++) { const s = S[a[k]], x = X[k]; for (let d = 0; d < DIM; d++) s[d] += x[d]; }
    S.forEach((s, j) => { if (s.some(Boolean)) C[j] = unit(s); });
    if (it && moved < n / 200) break;
  }
  return C;
}
function regroup() {
  const t0 = Date.now(), ids = [...vecs.keys()], N = ids.length;
  if (N < 40) { F = { n: N, list: [] }; return; }
  const X = ids.map(id => f32(vecs.get(id).v)), R = rnd(N * 7919 + 17);
  const K = Math.min(24, Math.max(3, Math.round(Math.sqrt(N) / 3)));
  const samp = N <= 3000 ? X : Array.from({ length: 3000 }, () => X[Math.floor(R() * N)]);
  const C = kmeans(samp, K, R), mem = C.map(() => []);
  for (let k = 0; k < N; k++) { let bj = 0, bs = -2; for (let j = 0; j < K; j++) { const s = dot(X[k], C[j]); if (s > bs) { bs = s; bj = j; } } mem[bj].push([ids[k], bs]); }
  const old = F?.list || [], used = new Set(), list = [];
  mem.forEach((m, j) => {
    if (m.length < 4) return;
    const mean = m.reduce((a, x) => a + x[1], 0) / m.length, sd = Math.sqrt(m.reduce((a, x) => a + (x[1] - mean) ** 2, 0) / m.length);
    const th = mean - 1.5 * sd, keep = new Set(m.filter(x => x[1] >= th).map(x => x[0]));
    if (keep.size < 4 || keep.size > N * .35) return;
    let mate = null, bj = .3; // the old folder with most of the same members keeps its id
    for (const o of old) { if (used.has(o.c)) continue; let both = 0; for (const id of keep) if (o.ids.has(id)) both++; const jac = both / (keep.size + o.ids.size - both); if (jac > bj) { bj = jac; mate = o; } }
    if (mate) used.add(mate.c);
    const out = new Set(mate?.out || []); out.forEach(id => keep.delete(id));
    list.push({ c: mate?.c || 'k' + Math.floor(R() * 2 ** 31).toString(36), cen: C[j], th, ids: keep, out });
  });
  F = { n: N, list, ms: Date.now() - t0 };
}
function join(id, v) { // a new item goes into the nearest folder when it is as close as that folder's own members
  if (!F?.list.length) return; const x = f32(v); let b = null, bs = -2;
  for (const f of F.list) { const s = dot(x, f.cen); if (s > bs) { bs = s; b = f; } }
  if (b && bs >= b.th && !b.out.has(id) && !b.ids.has(id)) { b.ids.add(id); joined = true; }
}
const saveFolders = () => tx('readwrite', s => s.put({ n: F.n, list: F.list.map(f => ({ c: f.c, cen: f.cen, th: f.th, ids: [...f.ids], out: [...f.out] })) }, 'f'), 'c');
async function loadFolders() {
  const x = await tx('readonly', s => s.get('f'), 'c').catch(() => null);
  if (x?.list) F = { n: x.n, list: x.list.map(f => ({ ...f, ids: new Set(f.ids), out: new Set(f.out) })) };
}
const postFolders = () => post({ t: 'folders', ms: F?.ms, list: (F?.list || []).map(f => ({ c: f.c, ids: [...f.ids].filter(id => vecs.has(id)) })) });
async function folders(force) {
  const N = vecs.size; // a regroup only when asked or when the items grew a lot since the last one (new ones join on their own)
  if (force || !F || (N >= 40 && (N > F.n * 1.5 || N - F.n > 2000 || F.n < 40))) { regroup(); await saveFolders(); }
  postFolders();
}
function merge(a, b) {
  const A = F?.list.find(f => f.c === a), B = F?.list.find(f => f.c === b); if (!A || !B || A === B) return;
  const w = A.ids.size, u = B.ids.size; for (let d = 0; d < DIM; d++) A.cen[d] = A.cen[d] * w + B.cen[d] * u; unit(A.cen);
  B.ids.forEach(id => A.ids.add(id)); B.out.forEach(id => A.out.add(id)); A.th = Math.min(A.th, B.th); F.list = F.list.filter(f => f !== B);
}

onmessage = async e => {
  const m = e.data;
  try {
    if (m.t === 'init') { await loadVecs(); await loadFolders(); await model(); post({ t: 'ready', n: vecs.size }); work(); }
    else if (m.t === 'sync') {
      const del = m.del || [];
      for (const id of del) { vecs.delete(id); queue.delete(id); }
      if (del.length) await tx('readwrite', s => del.forEach(id => s.delete(id)));
      for (const [id, t] of m.put || []) { const x = vecs.get(id); if (!x || x.h !== hash(t)) queue.set(id, t); }
      post({ t: 'indexed', done: vecs.size, left: queue.size });
      if (ext) work();
    } else if (m.t === 'query') post({ t: 'hits', n: m.n, q: m.q, list: await query(m.q, m.k || 60) });
    else if (m.t === 'like') post({ t: 'like', n: m.n, id: m.id, list: like(m.id, m.k || 12) });
    else if (m.t === 'folders') await folders(m.force);
    else if (m.t === 'fout' || m.t === 'fin') { const f = F?.list.find(x => x.c === m.c); if (f) { if (m.t === 'fout') { f.ids.delete(m.id); f.out.add(m.id); } else { f.out.delete(m.id); f.ids.add(m.id); } await saveFolders(); } postFolders(); }
    else if (m.t === 'fmerge') { merge(m.a, m.b); if (F) await saveFolders(); postFolders(); }
    else if (m.t === 'wipe') { queue.clear(); vecs.clear(); F = null; await tx('readwrite', s => s.clear()); await tx('readwrite', s => s.clear(), 'c'); post({ t: 'indexed', done: 0, left: 0 }); }
  } catch (err) { post({ t: 'error', m: String(err?.message || err), n: m.n }); }
};
