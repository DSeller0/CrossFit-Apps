const CACHE_VERSION = 'cone-v8';

// Only precache HTML and manifest. CSS/JS assets (themes.css, cone-client.js,
// cone-utils.js) are fingerprinted by the Vite build, so their filenames change
// on each deploy. They're cached on first use by the stale-while-revalidate handler.
const PRECACHE_URLS = [
  './index.html',
  './schedule.html',
  './leaderboard.html',
  './me.html',
  './results.html',
  './athletes.html',
  './timer.html',
  './tema.html',
  './recover.html',
  './manifest.json',
];

// ⚠️ Every URL above must be a page that vite.public.config.js actually BUILDS.
// cache.addAll rejects ATOMICALLY on a single 404, so one unbuilt entry here stops the
// service worker installing for every user, on every page — which is why the retired
// athletes.html stub is still in the repo rather than deleted. Add the build input and
// the line here in the same change, and bump CACHE_VERSION above so the new list ships.

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML pages: network-first so navigations always get the latest version.
  // Falls back to cache only when offline.
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Other assets (JS, CSS, images): stale-while-revalidate.
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});
