const VERSION = 'v4';
const CACHE = 'hizli-note-' + VERSION;
const ASSETS = ['./', './index.html', './style.css', './app.js', './db.js', './manifest.webmanifest',
  './vendor/jszip.min.js', './icons/icon-192.png', './icons/icon-512.png', './icons/icon.svg'];
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
  // cache first for app shell, network fallback; refresh in background
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
