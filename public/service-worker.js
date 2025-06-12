// A name for our cache
const CACHE_NAME = 'trainwithme-cache-v1';

// The list of files to cache
// We'll cache the main entry points of the app.
// The browser will automatically cache other files like JS, CSS, and images as you navigate.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Installation
// This event is fired when the service worker is first installed.
self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Fetching
// This event is fired every time the app requests a resource (e.g., a page, a script, an image).
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // Not in cache - fetch it from the network
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});