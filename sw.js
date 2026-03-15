const CACHE_NAME = 'fitone-v6';
const ASSETS = [
  './',
  './index.html',
  './styles/brand-assets.css',
  './styles/main.css',
  './src/dataStore.js',
  './src/syncService.js',
  './src/wearableIntegration.js',
  './src/ui.js',
  './src/main.js',
  './src/views/todayView.js',
  './src/views/logView.js',
  './src/views/settingsView.js',
  './src/views/protocolsView.js',
  './src/views/analyticsView.js',
  './src/views/exportView.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
