/**
 * Service Worker Dasar SMP PGRI 1 Cikadu
 * Mendukung instalasi PWA & Caching Offline pada perangkat seluler / desktop.
 */

const CACHE_NAME = 'smp-pgri-1-cikadu-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './icon.svg',
  './apple-touch-icon.png'
];

// 1. Install Service Worker & Precache Shell Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Cache pre-add warning (ignored for dynamic assets):', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate Service Worker & Clean Up Stale Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Intercept Fetch Requests (Stale-While-Revalidate for Static Assets, Network-First for API)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan cache request non-GET atau koneksi Firebase / external API
  if (req.method !== 'GET' || url.protocol.startsWith('chrome-extension') || url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('googleapis.com')) {
    return;
  }

  // Handle navigation (HTML page) with network-first and fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./') || caches.match('./index.html');
        })
    );
    return;
  }

  // Handle static assets with Cache-First / Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update
        fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback jika offline
          if (req.destination === 'image') {
            return caches.match('./pwa-192x192.png');
          }
        });
    })
  );
});

// 4. Message Listener for Skip Waiting / Update Prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
