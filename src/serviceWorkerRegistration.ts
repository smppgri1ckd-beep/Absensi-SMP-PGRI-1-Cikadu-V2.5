/**
 * Helper to register Service Worker for PWA compliance and offline caching.
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // In Vite development and production, register service worker
      const swUrl = './service-worker.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA] Konten baru tersedia; silakan refresh untuk memperbarui.');
                } else {
                  console.log('[PWA] Konten telah di-cache untuk penggunaan offline.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration warning (normal in iframe/dev sandbox):', error);
        });
    });
  }
}
