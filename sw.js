const VERSION = 'v127';
const CACHE = 'hizli-note-' + VERSION;
const ASSETS = ['./', './index.html', './style.css', './app.js', './query.js', './when.js', './dedup.js', './migrate.js', './ed.js', './sem.js', './db.js', './manifest.webmanifest',
  './vendor/jszip.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg', './icons/sc-note.png', './icons/sc-todo.png', './icons/sc-lock.png', './icons/sc-find.png'];
importScripts('./db.js', './when.js');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'hizli-note-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const items = itemsFromInput({
          title: fd.get('title') || '', text: fd.get('text') || '', url: fd.get('url') || '',
          files: fd.getAll('files').filter(f => f && f.size), source: 'share',
        });
        await saveItems(items);
      } catch (err) { console.error(err); }
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  // 94e: Google Fonts from the cache (the font file never changes; the css is refreshed in the background) → no network wait, works offline
  if (e.request.method === 'GET' && /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open('hizli-note-fonts'), hit = await c.match(e.request);
      const net = fetch(e.request).then(res => { if (res.ok || res.type === 'opaque') c.put(e.request, res.clone()); return res; });
      if (hit) { if (url.hostname.startsWith('fonts.googleapis')) e.waitUntil(net.catch(() => { })); return hit; }
      return net;
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // network first (a new release never mixes with old cached files), cache when offline or the network is slow
  const nav = e.request.mode === 'navigate';
  e.respondWith((async () => {
    const cached = () => caches.match(nav ? './index.html' : e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(res => {
      if (res.ok && !url.search) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    });
    const slow = new Promise(r => setTimeout(r, 4000)).then(cached);
    try { return (await Promise.race([net, slow.then(h => h || net)])) || await net; }
    catch { return (await cached()) || Response.error(); }
  })());
});
// 95b: morning brief while the app is closed (installed app on the phone: Chrome wakes us about once a day). The page shows it too, once per day (kv 'morning'.last).
async function morning() {
  if (self.Notification && Notification.permission !== 'granted') return;
  const m = (await DB.get('kv', 'morning')) || {}, at = m.at === undefined ? '08:00' : m.at; if (!at) return;
  const d = new Date(), [h, mi] = at.split(':').map(Number), min = d.getHours() * 60 + d.getMinutes();
  if (min < h * 60 + mi || min > h * 60 + mi + 360) return; // only in the 6 hours after the chosen time
  const wins = await self.clients.matchAll({ type: 'window' }); if (wins.some(c => c.visibilityState === 'visible')) return; // the open app shows its own card
  const b = morningBrief(await DB.all('items'), d.getTime(), !(await DB.get('kv', 'lock')));
  if (!b || m.last === b.day) return; // nothing to say, or already said today
  await DB.put('kv', { ...m, last: b.day }, 'morning');
  await self.registration.showNotification('Günaydın · Nts', { body: b.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'nts-morning', data: { view: 'morning' } });
}
self.addEventListener('periodicsync', e => { if (e.tag === 'nts-morning') e.waitUntil(morning().catch(() => { })); });
// a reminder tapped on the phone opens the app on the to-dos (the morning brief opens its card)
// 107e: "1 saat ertele" / "Yarın" on a reminder: the open app does it (and syncs); with the app closed the new time is written here
// and the app sends it on to the other devices when it opens next (kv 'snoozed')
async function snooze(id, kind) {
  const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (cs.length) { cs[0].postMessage({ snooze: { id, kind } }); return; }
  const i = await DB.get('items', id); if (!i?.todo) return;
  const t = Date.now(); i.todo = { ...i.todo, due: NtsWhen.snoozeDue(kind, t), done: false, user: true }; i.updatedAt = Math.max(t, (i.updatedAt || 0) + 1);
  await DB.put('items', i);
  const ids = (await DB.get('kv', 'snoozed')) || []; await DB.put('kv', [...new Set([...ids, id])].slice(-200), 'snoozed');
}
self.addEventListener('notificationclick', e => {
  e.notification.close(); const view = e.notification.data?.view || 'todo';
  if ((e.action === 'snooze1h' || e.action === 'tomorrow') && e.notification.data?.id) { e.waitUntil(snooze(e.notification.data.id, e.action === 'tomorrow' ? 'tomorrow' : '1h').catch(() => { })); return; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const rd = e.notification.data?.read, c = cs.find(x => 'focus' in x); if (c) { c.postMessage(rd ? { read: 1 } : { view }); return c.focus(); }
    return self.clients.openWindow(rd ? './?do=read' : './?view=' + view);
  }));
});
