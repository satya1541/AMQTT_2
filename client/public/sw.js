// Service Worker for MQTT Explorer PWA

const CACHE_VERSION = 2;
const STATIC_CACHE_NAME = `mqtt-explorer-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `mqtt-explorer-dynamic-v${CACHE_VERSION}`;
const OFFLINE_ANALYTICS_CACHE_NAME = `mqtt-explorer-analytics-v${CACHE_VERSION}`;

// Queue names for background sync
const PUBLISH_QUEUE = 'mqtt-publish-queue';
const MESSAGE_SYNC_QUEUE = 'mqtt-message-sync-queue';
const ANALYTICS_SYNC_QUEUE = 'mqtt-analytics-sync-queue';

// Assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // Add built assets based on your build process
  // These will typically be found in the /assets directory
  // If using Vite, check the dist folder after building
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete, skipping waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new service worker...');
  
  const cacheAllowlist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, OFFLINE_ANALYTICS_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return !cacheAllowlist.includes(cacheName);
        }).map((cacheName) => {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Helper to determine if a request is an API call
const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/') || 
         url.pathname.includes('graphql') ||
         url.hostname.includes('api.');
};

// Helper to determine if a request is a navigation
const isNavigationRequest = (request) => {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && 
          request.headers.get('accept').includes('text/html'));
};

// Helper function to determine if a request is for a static asset
const isStaticAsset = (url) => {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
};

// Helper function to determine caching strategy based on request
const getCacheStrategy = (request) => {
  const url = new URL(request.url);
  
  // For API requests - Network first, fallback to cache
  if (isApiRequest(url)) {
    return 'network-first';
  }
  
  // For navigation requests - Cache first, fallback to network
  if (isNavigationRequest(request)) {
    return 'cache-first';
  }
  
  // For static assets - Cache first, fallback to network
  if (isStaticAsset(url)) {
    return 'cache-first';
  }
  
  // Default - Network first
  return 'network-first';
};

// Network-first strategy implementation
const networkFirst = async (request) => {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache the response for future
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, falling back to cache', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request and we can't find it in cache, 
    // return the offline page
    if (isNavigationRequest(request)) {
      return caches.match('/index.html');
    }
    
    throw error; // Nothing in cache, propagate the error
  }
};

// Cache-first strategy implementation
const cacheFirst = async (request) => {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache for future (only for static cache)
    if (isStaticAsset(new URL(request.url))) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Both cache and network failed', request.url);
    
    // For navigation, return the offline page
    if (isNavigationRequest(request)) {
      return caches.match('/index.html');
    }
    
    throw error;
  }
};

// Stale-while-revalidate implementation
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  // Check the cache first
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in the background regardless
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(error => {
      console.log('[Service Worker] Network request failed in stale-while-revalidate', error);
      // Still throw the error so we know fetch failed
      throw error;
    });
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for the network response
  return fetchPromise;
};

// Fetch event - apply appropriate caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip browser extension requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Determine which strategy to use for this request
  const strategy = getCacheStrategy(event.request);
  
  if (strategy === 'network-first') {
    event.respondWith(networkFirst(event.request));
  } else if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(event.request));
  } else if (strategy === 'stale-while-revalidate') {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

// Background sync for handling offline message publishing
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered', event.tag);
  
  if (event.tag === PUBLISH_QUEUE) {
    console.log('[Service Worker] Processing MQTT publish queue');
    // This would normally connect to MQTT client and publish queued messages
    // For now, we'll just log the event
    event.waitUntil(
      // This would normally call a function to process the queue
      // For example, import { processPublishQueue } from './background-sync.js';
      // But since service workers can't directly import ES modules, we would
      // typically handle this via messaging to the client
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'PROCESS_PUBLISH_QUEUE'
          });
        }
      })
    );
  } else if (event.tag === MESSAGE_SYNC_QUEUE) {
    console.log('[Service Worker] Processing message sync queue');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'PROCESS_MESSAGE_SYNC_QUEUE'
          });
        }
      })
    );
  } else if (event.tag === ANALYTICS_SYNC_QUEUE) {
    console.log('[Service Worker] Processing analytics sync queue');
    // We would normally sync analytics data here
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients.length > 0) {
          clients[0].postMessage({
            type: 'PROCESS_ANALYTICS_SYNC'
          });
        }
      })
    );
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Add other message handling here as needed
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[Service Worker] Push received but no data');
    return;
  }
  
  try {
    const data = event.data.json();
    console.log('[Service Worker] Push data received', data);
    
    const title = data.title || 'MQTT Explorer';
    const options = {
      body: data.body || 'New message received',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error processing push notification', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked', event);
  
  event.notification.close();
  
  // Try to focus an existing window or open a new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data.url || '/';
      
      // Check if there is already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});