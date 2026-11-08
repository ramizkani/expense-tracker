// Bump VERSION whenever you upload new app files, so devices pick up the update.
const VERSION = 'ledger-v38';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
const FONTS = 'fonts-v1';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ledger-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then(c =>
        fetch(r).then(res => {
          if (res && res.ok) c.put(r, res.clone());
          return res;
        }).catch(() => c.match(r, { ignoreSearch: true }) || caches.match(r, { ignoreSearch: true }))
      )
    );
  } else if (/(^|\.)(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(hit => {
      const net = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});