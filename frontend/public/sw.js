// Service Worker personalizado para funcionalidades PWA avanzadas
const CACHE_NAME = 'weather-station-v1';
const STATIC_CACHE = 'weather-station-static-v1';
const DYNAMIC_CACHE = 'weather-station-dynamic-v1';

// URLs que siempre deben estar disponibles offline
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalándose...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activar inmediatamente
  self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activándose...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control de todos los clientes
  self.clients.claim();
});

// Interceptar fetch requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Manejar requests de API
  if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Manejar assets estáticos
  if (event.request.destination === 'image' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style') {
    event.respondWith(handleStaticAsset(event.request));
    return;
  }
  
  // Manejar navegación (HTML)
  if (event.request.destination === 'document') {
    event.respondWith(handleNavigation(event.request));
    return;
  }
  
  // Default: Network first con fallback a cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es exitosa, guardar en cache dinámico
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla, buscar en cache
        return caches.match(event.request);
      })
  );
});

// Manejar requests de API con estrategia inteligente
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Intentar obtener de la red primero
    const response = await fetch(request);
    
    // Si es exitoso y es GET, cachear la respuesta
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      
      // Solo cachear ciertos endpoints
      if (url.pathname.includes('/weather/data') || 
          url.pathname.includes('/alerts')) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Si falla la red, buscar en cache solo para GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        // Agregar header para indicar que es una respuesta offline
        const response = cachedResponse.clone();
        response.headers.set('X-Served-By', 'ServiceWorker');
        return response;
      }
      
      // Si no hay cache, devolver respuesta offline básica
      if (url.pathname.includes('/weather/data')) {
        return new Response(
          JSON.stringify({
            error: 'Offline',
            message: 'No hay datos disponibles offline',
            offline: true,
            timestamp: new Date().toISOString()
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
              'Content-Type': 'application/json',
              'X-Served-By': 'ServiceWorker'
            }
          }
        );
      }
    }
    
    // Para otros casos, devolver error
    return new Response(
      JSON.stringify({
        error: 'Network Error',
        message: 'No hay conexión disponible',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Manejar assets estáticos con cache-first
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Para imágenes, devolver un placeholder si no está en cache
    if (request.destination === 'image') {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#ccc"/><text x="100" y="100" text-anchor="middle" fill="#666">Image Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    throw error;
  }
}

// Manejar navegación con app shell
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    
    // Cachear la respuesta si es exitosa
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Si falla, buscar en cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback a la página principal desde cache
    const fallbackResponse = await caches.match('/');
    
    if (fallbackResponse) {
      return fallbackResponse;
    }
    
    // Última opción: página offline básica
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Weather Station - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; 
              padding: 20px; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              background: #f5f5f5; 
              text-align: center;
            }
            .offline-container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .offline-icon { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #333; margin: 0 0 10px 0; }
            p { color: #666; margin: 0 0 20px 0; }
            button { 
              background: #1976d2; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 4px; 
              cursor: pointer; 
              font-size: 16px;
            }
            button:hover { background: #1565c0; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>Weather Station</h1>
            <p>No hay conexión a internet disponible</p>
            <p>Algunas funciones pueden no estar disponibles en modo offline.</p>
            <button onclick="window.location.reload()">Intentar de nuevo</button>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('Push notification recibida:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nueva notificación de Weather Station',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'weather-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      vibrate: [200, 100, 200],
    };
    
    event.waitUntil(
      self.registration.showNotification(
        data.title || 'Weather Station',
        options
      )
    );
  }
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const action = event.action;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Si hay una ventana abierta, enfocarla
      if (clientList.length > 0) {
        const client = clientList[0];
        client.focus();
        
        // Enviar mensaje a la aplicación
        client.postMessage({
          type: 'notification-click',
          action: action,
          data: data,
          alert: data.alert,
          url: data.url || '/',
        });
        
        return;
      }
      
      // Si no hay ventana abierta, abrir una nueva
      return clients.openWindow(data.url || '/');
    })
  );
});

// Manejar sincronización en background
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'weather-data-sync') {
    event.waitUntil(syncWeatherData());
  }
  
  if (event.tag === 'pending-actions-sync') {
    event.waitUntil(syncPendingActions());
  }
});

// Sincronizar datos meteorológicos en background
async function syncWeatherData() {
  console.log('Sincronizando datos meteorológicos...');
  
  try {
    // Notificar a la aplicación que sincronice
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-request',
        syncType: 'weather-data'
      });
    });
  } catch (error) {
    console.error('Error sincronizando datos:', error);
  }
}

// Sincronizar acciones pendientes en background
async function syncPendingActions() {
  console.log('Sincronizando acciones pendientes...');
  
  try {
    // Notificar a la aplicación que sincronice
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'sync-request',
        syncType: 'pending-actions'
      });
    });
  } catch (error) {
    console.error('Error sincronizando acciones:', error);
  }
}

// Manejar mensajes de la aplicación
self.addEventListener('message', (event) => {
  console.log('SW Message:', event.data);
  
  if (event.data && event.data.type === 'skip-waiting') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'cache-weather-data') {
    // Cachear datos meteorológicos específicos
    const data = event.data.data;
    caches.open(DYNAMIC_CACHE).then(cache => {
      const request = new Request(`/api/weather/data/${data.stationId}/cached`);
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
      cache.put(request, response);
    });
  }
});

console.log('Service Worker personalizado cargado');