const CACHE_NAME = 'neonwaves-app-shell-v4';
const AUDIO_CACHE = 'musicas-cache';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== AUDIO_CACHE).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache API requests or external requests (except our audio files which are handled manually)
  if (url.pathname.startsWith('/api/') || (url.origin !== self.location.origin && !url.pathname.startsWith('/downloads/'))) {
    return;
  }

  // Network first, fallback to cache for HTML/JS/CSS
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache the latest version
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});
