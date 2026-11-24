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

// 95b: the morning brief — what was saved yesterday + today's (and late) tasks. Built the same way by the page and the service worker.
// names=false (app lock on): only counts, no titles, so a notification on the lock screen shows nothing private.
function morningBrief(items, t = Date.now(), names = true) {
  const d = new Date(t), p = n => String(n).padStart(2, '0'), tk = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), yest = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
  const HID = new Set(['draw', 'vault', 'bridge', 'ghlink', 'boards', 'summaries', 'saved']);
  const live = items.filter(i => i && !i.deleted && !HID.has(i.type));
  const name = i => String(i.todo?.text || i.title || i.fileName || (i.text || '').trim().split('\n')[0] || i.url || '').trim().slice(0, 80) || 'Kayıt';
  const kindOf = i => i.todo ? 'todo' : i.type === 'file' ? (/^image\//.test(i.mime || '') ? 'photo' : /^audio\//.test(i.mime || '') || /\.(webm|m4a|mp3|ogg|wav)$/i.test(i.fileName || '') ? 'audio' : 'file') : i.type;
  const saved = live.filter(i => i.ts >= yest && i.ts < today).sort((a, b) => b.ts - a.ts);
  const kinds = {}; saved.forEach(i => { const k = kindOf(i); kinds[k] = (kinds[k] || 0) + 1; });
  const tasks = live.filter(i => i.todo && !i.todo.done && i.todo.due && i.todo.due.slice(0, 10) <= tk).sort((a, b) => a.todo.due < b.todo.due ? -1 : 1);
  if (!saved.length && !tasks.length) return null;
  const KN = { note: 'not', link: 'link', photo: 'resim', file: 'dosya', audio: 'ses', todo: 'görev', chat: 'sohbet' };
  const kindTxt = Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${KN[k] || 'kayıt'}`).join(', ');
  const late = tasks.filter(i => i.todo.due.slice(0, 10) < tk).length;
  const head = [saved.length ? `Dün ${saved.length} kayıt${Object.keys(kinds).length > 1 ? ` (${kindTxt})` : ''}` : 'Dün kayıt yok',
    tasks.length ? `bugün ${tasks.length} görev${late ? ` (${late} gecikmiş)` : ''}` : 'bugün görev yok'].join(' · ');
  return {
    day: tk, head, kindTxt, late, n: saved.length,
    body: names && tasks.length ? head + '\n' + tasks.slice(0, 3).map(i => '• ' + name(i)).join('\n') : head,
    saved: names ? saved.slice(0, 40).map(i => ({ id: i.id, type: kindOf(i), title: name(i), tags: (i.tags || []).slice(0, 3) })) : [],
    tasks: names ? tasks.slice(0, 8).map(i => ({ id: i.id, text: name(i), due: i.todo.due, late: i.todo.due.slice(0, 10) < tk })) : [],
  };
}
