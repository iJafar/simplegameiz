const CACHE_NAME = 'neon-runner-v2';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './icon.svg',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network first, fallback to cache.
  // This ensures the user always gets the latest version when online,
  // but can still play the game offline!
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
