// Service Worker for PWA
const CACHE_NAME = 'hr-system-pro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.svg',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Функция для проверки, можно ли кэшировать запрос
function shouldHandleRequest(request) {
  const url = new URL(request.url);
  
  // Не обрабатываем:
  // 1. chrome-extension:// запросы
  // 2. chrome:// запросы
  // 3. Не HTTP/HTTPS запросы
  // 4. Не-GET запросы (Cache API поддерживает только GET)
  return request.method === 'GET' && 
         (url.protocol === 'http:' || url.protocol === 'https:');
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы, которые не должны обрабатываться Service Worker
  if (!shouldHandleRequest(event.request)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          (response) => {
            // Check if valid response
            if (!response || 
                response.status !== 200 || 
                response.type !== 'basic' ||
                !shouldHandleRequest(event.request)) {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Cache put failed:', error);
              });

            return response;
          }
        ).catch((error) => {
          console.error('Fetch failed:', error);
          // Можно вернуть fallback страницу
          // return caches.match('/offline.html');
          throw error;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
