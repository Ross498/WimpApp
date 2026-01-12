
/**
 * WIMP Kitchen Companion - Ultimate Cache Buster
 * Generated: 2025-07-15T15:01:35.067Z
 * Build: 1752591695067
 */

// Force complete cache invalidation
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// Clear all caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
    });
  });
}

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

// Force reload with cache bypass
setTimeout(() => {
  window.location.reload(true);
}, 1000);

console.log('🧹 Ultimate cache clear completed - Build: 1752591695067');
  