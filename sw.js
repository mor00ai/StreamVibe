const CACHE_NAME = 'streamvibe-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installazione Service Worker e Caching assets base
self.addEventListener('install', event => {
  self.skipWaiting(); // Forza l'aggiornamento immediato
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

// Attivazione e pulizia vecchie cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Intercettazione richieste di rete
self.addEventListener('fetch', event => {
  // Non cachiamo le chiamate API (la musica serve online)
  if (event.request.url.includes('itunes.apple.com') || event.request.url.includes('pipedapi')) return;

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
