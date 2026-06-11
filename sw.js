// ── Cone Service Worker ───────────────────────────────────────────────────────
// Strategy: Cache First with Network Fallback
// Version this string when you deploy updates — it triggers cache refresh
const CACHE_VERSION = 'cone-v1';

// Files to pre-cache on install (the app shell)
const PRECACHE_URLS = [
  './schedule_builder_pt_V2.html',
  './athletes.html',
  './schedule.html',
  './leaderboard.html',
  './manifest.json',
  './config.json',
];

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()) // activate immediately, don't wait for old SW to die
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION) // delete anything not matching current version
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

// ── Fetch: cache first, network fallback ─────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests — POST/PUT/DELETE always go to network
  if (event.request.method !== 'GET') return;

  // Don't intercept requests to other origins (CDN fonts, icons, etc.)
  // Let those go straight to network with no caching
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          // Serve from cache immediately
          // Also fetch in background to keep cache fresh (stale-while-revalidate)
          const networkFetch = fetch(event.request)
            .then(response => {
              if (response && response.status === 200) {
                const clone = response.clone();
                caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
              }
              return response;
            })
            .catch(() => {}); // swallow network errors — we already have the cached version
          return cached;
        }

        // Not in cache — fetch from network and cache the result
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Network failed and nothing in cache
            // Return offline fallback for HTML pages only
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('./schedule_builder_pt_V2.html');
            }
          });
      })
  );
});
