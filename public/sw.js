// Service Worker for PWA
const CACHE_NAME = 'hr-system-pro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
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
  // 5. Не кэшируем JS/CSS/Sourcemap файлы чтобы избежать ситуации со старыми бандлами
  const isStaticAsset = url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.map');

  return request.method === 'GET' && 
         (url.protocol === 'http:' || url.protocol === 'https:') &&
         !isStaticAsset;
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

            // Only cache http(s) responses (avoid extension/internal schemes)
            try {
              const respUrl = new URL(responseToCache.url);
              if (respUrl.protocol === 'http:' || respUrl.protocol === 'https:') {
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    return cache.put(event.request, responseToCache);
                  })
                  .catch((error) => {
                    console.warn('Cache put failed:', error);
                  });
              } else {
                // Skip caching responses with unsupported schemes
                console.debug('Skipping cache.put for unsupported scheme:', respUrl.protocol, responseToCache.url);
              }
            } catch (e) {
              console.warn('Skipping cache.put due to invalid URL:', e);
            }

            return response;
          }
        ).catch((error) => {
          console.error('Fetch failed:', error);
          // Возвращаем offline страницу для навигационных запросов
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          // Для других запросов возвращаем ошибку
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
