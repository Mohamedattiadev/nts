const VERSION = 'v21';
const CACHE = 'hizli-note-' + VERSION;
const ASSETS = ['./', './index.html', './style.css', './app.js', './db.js', './manifest.webmanifest',
  './vendor/jszip.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg', './icons/sc-note.png', './icons/sc-todo.png', './icons/sc-lock.png'];
importScripts('./db.js');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
// a reminder tapped on the phone opens the app on the to-dos
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => 'focus' in x); if (c) { c.postMessage({ view: 'todo' }); return c.focus(); }
    return self.clients.openWindow('./?view=todo');
  }));
});
