const CACHE_NAME = 'fitone-v11';
const ASSETS = [
  './',
  './index.html',
  './styles/brand-assets.css',
  './styles/main.css',
  './src/dataStore.js',
  './src/syncService.js',
  './src/wearableIntegration.js',
  './src/foodDatabase.js',
  './src/foodVision.js',
  './src/barcodeScanner.js',
  './src/exerciseDatabase.js',
  './src/exerciseGuide.js',
  './src/starterRoutines.js',
  './src/prTracker.js',
  './src/achievements.js',
  './src/shareCard.js',
  './src/workoutIntelligence.js',
  './src/virtualScroller.js',
  './src/ui.js',
  './src/onboarding.js',
  './src/planGenerator.js',
  './src/main.js',
  './src/views/todayView.js',
  './src/views/logView.js',
  './src/views/exerciseDetailView.js',
  './src/views/deepDiveView.js',
  './src/views/activityFeedView.js',
  './src/views/workoutDetailView.js',
  './src/views/pulseCenterView.js',
  './src/views/settingsView.js',
  './src/views/protocolsView.js',
  './src/views/analyticsView.js',
  './src/views/exportView.js',
  './src/views/postWorkoutView.js',
  './src/views/photosView.js',
  './src/workers/analyticsWorker.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './pwa/manifest.webmanifest',
  './assets/body-outline.svg'
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

self.addEventListener('message', event => {
  if (!event || !event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const route = event.notification && event.notification.data && event.notification.data.route
    ? String(event.notification.data.route)
    : '#today';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const targetUrl = new URL('./', self.location.origin).toString() + route;
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_ROUTE', route: route });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
