// 104f: semantic search on this device (module worker). A small multilingual embedding model (multilingual-e5-small, int8,
// knows Turkish, English and Arabic together: fatura ↔ invoice ↔ فاتورة) turns each item's text into 384 numbers; a search is
// the nearest ones. Nothing leaves the device: the model is downloaded once (the browser keeps it in its cache), the numbers
// live in IndexedDB (nts-sem), 384 bytes per item.
// in:  {t:'init'} · {t:'sync', put:[[id, text]], del:[id]} · {t:'query', n, q, k} · {t:'wipe'}
// out: {t:'progress', p} · {t:'ready', n} · {t:'indexed', done, left} · {t:'hits', n, q, list:[[id, sim]]} · {t:'error', m}
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';
const MODEL = 'Xenova/multilingual-e5-small', DIM = 384;
let ext = null, loading = null, db = null;
const vecs = new Map(); // id -> { h, v: Int8Array }
const queue = new Map(); // id -> text, waiting to be embedded
const post = m => postMessage(m);

const idb = () => db || (db = new Promise((ok, no) => {
  const r = indexedDB.open('nts-sem', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('v');
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
}));
const tx = async (mode, fn) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('v', mode), s = t.objectStore('v'); const r = fn(s); t.oncomplete = () => ok(r?.result); t.onerror = () => no(t.error); }); };
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
      rows.forEach(([id, x]) => vecs.set(id, x));
      await tx('readwrite', s => rows.forEach(([id, x]) => s.put(x, id)));
      post({ t: 'indexed', done: vecs.size, left: queue.size });
      await new Promise(r => setTimeout(r, 0)); // a query that arrives meanwhile goes first
    }
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

onmessage = async e => {
  const m = e.data;
  try {
    if (m.t === 'init') { await loadVecs(); await model(); post({ t: 'ready', n: vecs.size }); work(); }
    else if (m.t === 'sync') {
      const del = m.del || [];
      for (const id of del) { vecs.delete(id); queue.delete(id); }
      if (del.length) await tx('readwrite', s => del.forEach(id => s.delete(id)));
      for (const [id, t] of m.put || []) { const x = vecs.get(id); if (!x || x.h !== hash(t)) queue.set(id, t); }
      post({ t: 'indexed', done: vecs.size, left: queue.size });
      if (ext) work();
    } else if (m.t === 'query') post({ t: 'hits', n: m.n, q: m.q, list: await query(m.q, m.k || 60) });
    else if (m.t === 'like') post({ t: 'like', n: m.n, id: m.id, list: like(m.id, m.k || 12) });
    else if (m.t === 'wipe') { queue.clear(); vecs.clear(); await tx('readwrite', s => s.clear()); post({ t: 'indexed', done: 0, left: 0 }); }
  } catch (err) { post({ t: 'error', m: String(err?.message || err), n: m.n }); }
};
