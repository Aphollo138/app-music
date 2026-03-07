const CACHE_NAME = 'neonwaves-v3-killer';

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      // Unregister itself
      self.registration.unregister().then(() => {
        console.log('Service Worker self-destructed');
      });
    })
  );
});

// No fetch handler - let network handle everything
