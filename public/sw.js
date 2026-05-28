const CACHE_NAME = 'helpriderss-v3';

// Cache only static fallback elements, never source code scripts in development
const ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Network-First then Cache-Fallback strategy to ensure Vite updates are immediately reflected
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Bypass cache for development scripts (Vite hot reload files)
  if (e.request.url.includes('/src/') || e.request.url.includes('node_modules') || e.request.url.includes('@vite')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful requests dynamically
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache if network is offline
        return caches.match(e.request);
      })
  );
});
