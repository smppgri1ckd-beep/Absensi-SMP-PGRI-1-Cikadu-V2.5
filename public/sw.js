// Service Worker ringan untuk Aplikasi Android (PWA) SMP PGRI 1 Cikidang
// Mode: Online-Only / Network Pass-Through (Memastikan data selalu real-time dari server)

self.addEventListener('install', () => {
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
  // Abaikan request non-GET, HMR Vite (@vite), atau ekstensi browser agar tidak mengganggu koneksi
  if (event.request.method !== 'GET') return;
  const url = event.request.url || '';
  if (
    url.includes('/@vite/') ||
    url.includes('/@react-refresh') ||
    url.includes('/node_modules/') ||
    url.includes('?t=') ||
    !url.startsWith('http')
  ) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline - Periksa koneksi internet Anda', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    })
  );
});
