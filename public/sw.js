// Self-unregistering Service Worker untuk membersihkan Service Worker lama dari browser
// Tanpa listener fetch agar koneksi streaming real-time Firebase Firestore berjalan langsung 100%

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => {
          // Lepaskan kendali service worker tanpa mengganggu halaman
          if (client && 'navigate' in client) {
            // Biarkan halaman berjalan langsung tanpa intervensi SW
          }
        });
      })
  );
});
