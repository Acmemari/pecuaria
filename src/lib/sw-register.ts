/**
 * Utilitário para registrar o Service Worker
 */

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then(registration => {
          console.log('[SW] Service Worker registered successfully:', registration.scope);

          // Verificar atualizações periodicamente
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log('[SW] New service worker available');
                  // Opcional: mostrar notificação para o usuário atualizar
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const key = 'sw-reload-guard';
        const lastReload = sessionStorage.getItem(key);
        const now = Date.now();
        if (!lastReload || now - Number(lastReload) > 10000) {
          console.log('[SW] Service Worker controller changed - reloading page');
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        } else {
          console.log('[SW] Service Worker controller changed - reload skipped (guard active)');
        }
      });
    });
  } else {
    console.warn('[SW] Service Workers are not supported in this browser');
  }
}

/**
 * Desregistrar service worker (útil para desenvolvimento)
 */
export function unregisterServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
        console.log('[SW] Service Worker unregistered');
      })
      .catch(error => {
        console.error('[SW] Error unregistering service worker:', error);
      });
  }
}
