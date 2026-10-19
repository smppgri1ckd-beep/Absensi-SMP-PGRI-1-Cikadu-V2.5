// Service Worker ringan untuk Aplikasi Android (PWA) SMP PGRI 1 Cikidang
// Mode: Online-Only / Network Pass-Through (Memastikan data selalu real-time dari server)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Hanya tangani request GET dan selalu teruskan langsung ke jaringan (Network-Only / Online)
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request));
});
