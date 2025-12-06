/**
 * Service Worker para cache de recursos estáticos
 * Versão do cache - atualizar quando necessário invalidar cache
 */
const CACHE_VERSION = 'v3-' + Date.now(); // Dynamic version to force update
const CACHE_NAME = `pecuaria-cache-${CACHE_VERSION}`;

// Recursos estáticos para cache
// Reduced to minimal entry point to avoid 404s on hashed assets (index.css etc)
// Dynamic caching in 'fetch' will handle the rest
const STATIC_ASSETS = [
  '/', // Root
];

// ... (install/activate handlers remain, but let's replace fetch to be safe)

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force waiting service worker to become active
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições para APIs externas (exceto fontes)
  if (url.origin !== self.location.origin && !url.href.includes('fonts.googleapis.com')) {
    return;
  }

  // ESTRATÉGIA PARA HTML (Navegação): Network First -> Fallback Cache
  // Garante que o usuário sempre receba o index.html mais recente se estiver online
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/index.html' || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Salva a nova versão no cache para uso offline futuro
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Se offline, usa o cache
          return caches.match('/index.html');
        })
    );
    return;
  }

  // ESTRATÉGIA PARA OUTROS RECURSOS: Cache First -> Network Fallback
  // CSS, JS, Imagens com hash no nome podem ser cacheados agressivamente
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          // Fallback opcional para imagens ou outros recursos
          return null;
        });
    })
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

