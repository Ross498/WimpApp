// WIMP Kitchen Companion - Service Worker
// Comprehensive offline support with intelligent caching strategies

const CACHE_NAME = 'wimp-kitchen-v3.0.0-bundle-fix';
const STATIC_CACHE = 'wimp-static-v3.0.0-bundle-fix';
const API_CACHE = 'wimp-api-v3.0.0-bundle-fix';
const IMAGE_CACHE = 'wimp-images-v3.0.0-bundle-fix';

// CRITICAL FIX: Remove bundle caching to prevent stale JavaScript
const CRITICAL_ASSETS = [
  '/',
  '/meals',
  '/ingredients',
  '/mastery',
  '/profile',
  '/manifest.json',
  '/attached_assets/ChefOtterCorrect.png',
  '/attached_assets/ChefCat_1749984413841.png',
  '/attached_assets/ChefBuffalo_1749984735804.png'
  // REMOVED: /app, /assets/index.css, /assets/index.js to prevent stale bundle caching
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = [
  '/api/meals/unified',
  '/api/ingredients',
  '/api/mastery/progress',
  '/api/mastery/ingredients',
  '/api/subscription/status',
  '/api/meal-completion/progress'
];

// Install event - cache critical assets
self.addEventListener('install', event => {
  console.log('🔧 SW: Installing service worker with offline support');
  
  event.waitUntil(
    Promise.all([
      // Cache critical static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 SW: Caching critical static assets');
        return cache.addAll(CRITICAL_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ SW: Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('🗑️ SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/assets/')) {
    // 🔧 CRITICAL FIX: Assets must use Network First to prevent HTML caching
    event.respondWith(handleAssetRequest(request));
  } else if (url.pathname.startsWith('/attached_assets/') || 
             url.pathname.includes('.png') || 
             url.pathname.includes('.jpg') || 
             url.pathname.includes('.jpeg') || 
             url.pathname.includes('.webp')) {
    // Images - Cache First with network fallback
    event.respondWith(handleImageRequest(request));
  } else {
    // App routes and static assets - Cache First with network fallback
    event.respondWith(handleStaticRequest(request));
  }
});

// 🔧 CRITICAL FIX: Network First strategy for CSS/JS assets with MIME validation
async function handleAssetRequest(request) {
  const url = new URL(request.url);
  console.log('🎯 SW: Handling asset request:', url.pathname);
  
  try {
    // Always try network first for assets to get fresh content
    const networkResponse = await fetch(request.clone());
    
    if (networkResponse.ok) {
      const contentType = networkResponse.headers.get('content-type');
      console.log('📋 SW: Asset content-type:', contentType);
      
      // 🔧 CRITICAL: Validate MIME type before caching
      const isCSS = url.pathname.endsWith('.css') && contentType?.includes('text/css');
      const isJS = url.pathname.endsWith('.js') && contentType?.includes('javascript');
      
      if (isCSS || isJS) {
        console.log('✅ SW: Valid asset MIME type, caching');
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } else {
        console.log('❌ SW: Invalid MIME type for asset - NOT caching');
        console.log('❌ SW: Expected CSS/JS but got:', contentType);
        return networkResponse;
      }
    } else {
      console.log('❌ SW: Asset network request failed with status:', networkResponse.status);
      throw new Error(`Asset request failed: ${networkResponse.status}`);
    }
  } catch (error) {
    console.log('🌐 SW: Asset network failed, trying cache:', url.pathname);
    
    // Network failed, try cache but only serve if MIME type was previously validated
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      const cachedContentType = cachedResponse.headers.get('content-type');
      const isValidCachedCSS = url.pathname.endsWith('.css') && cachedContentType?.includes('text/css');
      const isValidCachedJS = url.pathname.endsWith('.js') && cachedContentType?.includes('javascript');
      
      if (isValidCachedCSS || isValidCachedJS) {
        console.log('📱 SW: Serving valid cached asset:', url.pathname);
        return cachedResponse;
      } else {
        console.log('❌ SW: Cached asset has wrong MIME type, clearing cache');
        const cache = await caches.open(STATIC_CACHE);
        cache.delete(request);
      }
    }
    
    // Return 404 instead of serving wrong content
    console.log('❌ SW: Asset unavailable, returning 404');
    return new Response('Asset not available', { 
      status: 404, 
      statusText: 'Asset not found or invalid MIME type' 
    });
  }
}

// Network First strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // CRITICAL FIX: Never cache financial data for real-time updates
  if (url.pathname.includes('/api/financial/')) {
    console.log('💰 SW: Bypassing cache for financial data - always fetch fresh');
    return fetch(request.clone(), {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful API responses (excluding financial endpoints)
    if (networkResponse.ok && CACHEABLE_API_ROUTES.some(route => url.pathname.includes(route))) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      console.log('💾 SW: Cached API response:', url.pathname);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 SW: Network failed for API, trying cache:', url.pathname);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('📱 SW: Serving cached API response:', url.pathname);
      return cachedResponse;
    }
    
    // Return offline fallback for critical endpoints
    return generateOfflineFallback(url.pathname);
  }
}

// Cache First strategy for images
async function handleImageRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Cache miss, try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🖼️ SW: Image request failed:', request.url);
    // Return placeholder image for failed requests
    return new Response('', { status: 204 });
  }
}

// Cache First strategy for static assets and app routes
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Cache miss, try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📱 SW: Static request failed, serving offline page:', request.url);
    
    // For app routes, serve the main app with offline indicator
    const url = new URL(request.url);
    if (url.pathname.startsWith('/app') || 
        url.pathname === '/meals' || 
        url.pathname === '/ingredients' || 
        url.pathname === '/mastery' || 
        url.pathname === '/profile') {
      
      const cachedApp = await caches.match('/');
      if (cachedApp) {
        return cachedApp;
      }
    }
    
    // Return offline page
    return generateOfflinePage();
  }
}

// Generate offline fallback responses
function generateOfflineFallback(pathname) {
  if (pathname.includes('/api/meals')) {
    return new Response(JSON.stringify({
      success: true,
      recipes: [],
      total: 0,
      offline: true,
      message: "You're offline. Cached recipes will appear when connection is restored."
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname.includes('/api/ingredients')) {
    return new Response(JSON.stringify({
      success: true,
      ingredients: [],
      offline: true,
      message: "You're offline. Your pantry will sync when connection is restored."
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (pathname.includes('/api/mastery')) {
    return new Response(JSON.stringify({
      success: true,
      data: { available: [], unlocked: [] },
      offline: true,
      message: "You're offline. Mastery progress will sync when connection is restored."
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Default offline API response
  return new Response(JSON.stringify({
    success: false,
    error: "You're offline. Please check your connection.",
    offline: true
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Generate offline page
function generateOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>WIMP Kitchen Companion - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .offline-container {
          text-align: center;
          padding: 2rem;
          max-width: 400px;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        .offline-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .offline-message {
          font-size: 1rem;
          opacity: 0.9;
          line-height: 1.6;
        }
        .retry-button {
          background: rgba(255,255,255,0.2);
          border: 2px solid rgba(255,255,255,0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          margin-top: 1.5rem;
          transition: all 0.3s ease;
        }
        .retry-button:hover {
          background: rgba(255,255,255,0.3);
          border-color: rgba(255,255,255,0.5);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">🍳</div>
        <div class="offline-title">You're Offline</div>
        <div class="offline-message">
          WIMP Kitchen Companion is currently offline. 
          Check your internet connection and try again.
        </div>
        <button class="retry-button" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Background sync for when connection returns
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 SW: Background sync triggered');
    event.waitUntil(syncDataWhenOnline());
  }
});

// Sync data when connection returns
async function syncDataWhenOnline() {
  try {
    // Refresh critical data when back online
    const criticalEndpoints = [
      '/api/meals/unified',
      '/api/ingredients', 
      '/api/mastery/progress',
      '/api/subscription/status'
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          const cache = await caches.open(API_CACHE);
          cache.put(endpoint, response.clone());
          console.log('🔄 SW: Synced data for:', endpoint);
        }
      } catch (error) {
        console.log('❌ SW: Failed to sync:', endpoint);
      }
    }
    
    // Notify clients that data has been synced
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'DATA_SYNCED' });
    });
    
  } catch (error) {
    console.error('❌ SW: Background sync failed:', error);
  }
}

// Handle messages from main app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🚀 SW: WIMP Kitchen Companion Service Worker loaded successfully');