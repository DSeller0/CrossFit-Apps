const CACHE_VERSION = 'cone-v7';

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
  './recover.html',
  './manifest.json',
];

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
