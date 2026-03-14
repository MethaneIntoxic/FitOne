// FitOne Service Worker – offline-first caching strategy
const CACHE_NAME = "fitone-cache-v1";

// App shell: all static assets needed for the app to work offline
const APP_SHELL = [
  "../",
  "../index.html",
  "../styles/main.css",
  "../src/main.js",
  "../src/ui.js",
  "../src/dataStore.js",
  "../src/views/todayView.js",
  "../src/views/logView.js",
  "../src/views/analyticsView.js",
  "../src/views/protocolsView.js",
  "../src/views/exportView.js",
  "../src/views/settingsView.js",
  "../pwa/manifest.webmanifest",
  "../icons/icon-192.png",
  "../icons/icon-512.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

// Activate: clean up old caches when the cache version changes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch: cache-first for same-origin GET requests
self.addEventListener("fetch", (event) => {
  // Only handle GET requests from the same origin
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Not in cache — fetch from network and optionally cache the response
      return fetch(event.request).then((networkResponse) => {
        // Only cache successful responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
