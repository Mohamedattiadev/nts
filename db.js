// Tiny IndexedDB helper shared by the page and the service worker.
const DB_NAME = 'hizli-note', DB_VER = 1;
let _db;
function openDB() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' }).createIndex('ts', 'ts');
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return _db;
}
async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode), s = t.objectStore(store);
    let out; const req = fn(s);
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
  });
}
const DB = {
  all: store => tx(store, 'readonly', s => s.getAll()),
  get: (store, key) => tx(store, 'readonly', s => s.get(key)),
  put: (store, val, key) => tx(store, 'readwrite', s => s.put(val, key)),
  putMany: (store, vals) => tx(store, 'readwrite', s => { vals.forEach(v => s.put(v)); }),
  del: (store, key) => tx(store, 'readwrite', s => s.delete(key)),
  clear: store => tx(store, 'readwrite', s => s.clear()),
  // items by time (index 'ts'): the recent ones first, the rest in big batches (one round trip per batch)
  since: ts => tx('items', 'readonly', s => s.index('ts').getAll(IDBKeyRange.lowerBound(ts))),
  older: (ts, after, n) => tx('items', 'readonly', s => s.index('ts').getAll(after == null ? IDBKeyRange.upperBound(ts, true) : IDBKeyRange.bound(after, ts, false, true), n)),
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Turn shared/pasted content into items. Used by SW (share target) and the page.
const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;
function itemsFromInput({ title = '', text = '', url = '', files = [], ts = Date.now(), source = 'manual' }) {
  const group = newId(), out = [];
  const body = [title, text, url].filter(Boolean).join('\n').trim();
  const urls = [...new Set(body.match(URL_RE) || [])];
  let rest = body; urls.forEach(u => { rest = rest.split(u).join(''); });
  rest = rest.trim();
  if (urls.length === 1) {
    out.push({ id: newId(), type: 'link', url: urls[0], text: rest, ts, group, source, tags: [] });
  } else {
    urls.forEach(u => out.push({ id: newId(), type: 'link', url: u, text: '', ts, group, source, tags: [] }));
    if (rest) out.push({ id: newId(), type: 'note', text: rest, ts, group, source, tags: [] });
  }
  // text typed together with a file becomes that file's note instead of a separate item
  let caption = '';
  if (files.length && out.length === 1 && out[0].type === 'note') { caption = out.pop().text; }
  files.forEach((f, k) => {
    out.push({ id: newId(), type: 'file', fileName: f.name || 'dosya', mime: f.type || '', size: f.size || 0, text: k === 0 ? caption : '', ts, group, source, tags: [], _blob: f });
  });
  return out;
}
async function saveItems(items) {
  const files = items.filter(i => i._blob).map(i => ({ id: i.id, blob: i._blob }));
  if (files.length) await DB.putMany('files', files);
  const clean = items.map(({ _blob, ...i }) => ({ ...i, pending: true }));
  await DB.putMany('items', clean);
  return clean;
}
