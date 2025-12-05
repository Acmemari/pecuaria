/**
 * Service Worker para cache de recursos estáticos
 * Versão do cache - atualizar quando necessário invalidar cache
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `pecuaria-cache-${CACHE_VERSION}`;

// Recursos estáticos para cache (cache-first strategy)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/index.tsx',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
  
  // Forçar ativação imediata
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
  );
  
  // Tomar controle imediato de todas as páginas
  return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições para APIs externas e CDNs
  if (
    url.origin !== self.location.origin &&
    !url.href.includes('fonts.googleapis.com')
  ) {
    return; // Deixar passar sem cache
  }

  // Estratégia: Cache-first para recursos estáticos
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Se encontrou no cache, retornar
          if (cachedResponse) {
            return cachedResponse;
          }

          // Se não encontrou, buscar na rede
          return fetch(request)
            .then((response) => {
              // Verificar se a resposta é válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clonar a resposta para cache
              const responseToCache = response.clone();

              // Adicionar ao cache
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            })
            .catch((error) => {
              console.error('[SW] Fetch failed:', error);
              // Em caso de erro, tentar retornar do cache mesmo assim
              return caches.match(request);
            });
        })
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

