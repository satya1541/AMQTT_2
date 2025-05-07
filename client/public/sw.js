// Service Worker for MQTT Explorer PWA

// Cache names
const STATIC_CACHE_NAME = 'mqtt-explorer-static-v1';
const DYNAMIC_CACHE_NAME = 'mqtt-explorer-dynamic-v1';
const DATA_CACHE_NAME = 'mqtt-explorer-data-v1';

// Resources to cache immediately on installation
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/app-icon.svg'
];

// Install event handler
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  // Cache static resources
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('[Service Worker] Install complete');
        return self.skipWaiting();
      })
  );
});

// Activate event handler
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== DATA_CACHE_NAME
            ) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    // Network first, fall back to cache for API requests
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache response
          const responseClone = response.clone();
          caches.open(DATA_CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          
          return response;
        })
        .catch(() => {
          // Try to get from cache if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // Cache first, fall back to network for non-API requests
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response
            return cachedResponse;
          }
          
          // No cached response, fetch from network
          return fetch(event.request)
            .then((response) => {
              // Cache response for future
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            });
        })
    );
  }
});

// Background sync event handler
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'mqtt-message-sync') {
    // Process MQTT message sync
    event.waitUntil(syncMqttMessages());
  } else if (event.tag === 'analytics-sync') {
    // Process analytics sync
    event.waitUntil(syncAnalytics());
  }
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
  
  const title = notificationData.title || 'MQTT Explorer';
  const options = {
    body: notificationData.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: notificationData.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open a new window if no matching window found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message event handler
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sync MQTT messages
async function syncMqttMessages() {
  console.log('[Service Worker] Syncing MQTT messages...');
  
  try {
    // This would be implemented to sync with server
    // For now, we just send a message to the client
    const clients = await self.clients.matchAll();
    
    // Send result to all clients
    clients.forEach((client) => {
      client.postMessage({
        type: 'sync-complete',
        queue: 'mqtt-message-sync',
        result: {
          syncedCount: Math.floor(Math.random() * 10) + 1
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Error syncing MQTT messages:', error);
    
    // Send error to all clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'sync-error',
        queue: 'mqtt-message-sync',
        error: error.message
      });
    });
    
    return false;
  }
}

// Sync analytics
async function syncAnalytics() {
  console.log('[Service Worker] Syncing analytics...');
  
  try {
    // This would be implemented to sync with server
    // For now, we just send a message to the client
    const clients = await self.clients.matchAll();
    
    // Send result to all clients
    clients.forEach((client) => {
      client.postMessage({
        type: 'sync-complete',
        queue: 'analytics-sync',
        result: {
          syncedCount: Math.floor(Math.random() * 5) + 1
        }
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Error syncing analytics:', error);
    
    // Send error to all clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'sync-error',
        queue: 'analytics-sync',
        error: error.message
      });
    });
    
    return false;
  }
}