/**
 * AGGRESSIVE SERVICE WORKER AND CACHE ELIMINATION SYSTEM
 * 
 * This utility completely unregisters all Service Workers and clears all caches
 * to force the browser to load fresh JavaScript bundles, eliminating cached
 * code that contains performance-killing API polling.
 */

export interface ServiceWorkerKillResult {
  serviceWorkersUnregistered: number;
  cachesCleared: number;
  storageCleared: boolean;
  success: boolean;
  errors: string[];
}

/**
 * Aggressively eliminate all Service Workers and caches to force fresh code load
 */
export const killServiceWorkersAndCache = async (): Promise<ServiceWorkerKillResult> => {
  const result: ServiceWorkerKillResult = {
    serviceWorkersUnregistered: 0,
    cachesCleared: 0,
    storageCleared: false,
    success: false,
    errors: []
  };

  console.log('🔥 SERVICE WORKER KILLER: Starting aggressive cache elimination');

  try {
    // 1. UNREGISTER ALL SERVICE WORKERS
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`🔥 SW KILLER: Found ${registrations.length} service worker registrations`);
        
        await Promise.all(registrations.map(async (registration) => {
          try {
            await registration.unregister();
            result.serviceWorkersUnregistered++;
            console.log('🔥 SW KILLER: Unregistered service worker:', registration.scope);
          } catch (error) {
            const errorMsg = `Failed to unregister SW ${registration.scope}: ${(error as Error).message}`;
            result.errors.push(errorMsg);
            console.error('🔥 SW KILLER ERROR:', errorMsg);
          }
        }));
      } catch (error) {
        const errorMsg = `Failed to get SW registrations: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error('🔥 SW KILLER ERROR:', errorMsg);
      }
    }

    // 2. CLEAR ALL BROWSER CACHES
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        console.log(`🔥 CACHE KILLER: Found ${cacheNames.length} caches to clear`);
        
        await Promise.all(cacheNames.map(async (cacheName) => {
          try {
            await caches.delete(cacheName);
            result.cachesCleared++;
            console.log('🔥 CACHE KILLER: Cleared cache:', cacheName);
          } catch (error) {
            const errorMsg = `Failed to clear cache ${cacheName}: ${(error as Error).message}`;
            result.errors.push(errorMsg);
            console.error('🔥 CACHE KILLER ERROR:', errorMsg);
          }
        }));
      } catch (error) {
        const errorMsg = `Failed to get cache names: ${(error as Error).message}`;
        result.errors.push(errorMsg);
        console.error('🔥 CACHE KILLER ERROR:', errorMsg);
      }
    }

    // 3. CLEAR STORAGE ENTRIES THAT MIGHT CACHE STALE CODE
    try {
      // Clear any cache-related localStorage entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('Cache') || key.includes('smart-cache'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🔥 STORAGE KILLER: Removed localStorage key:', key);
      });
      
      // Clear sessionStorage cache entries
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('cache') || key.includes('Cache'))) {
          sessionKeysToRemove.push(key);
        }
      }
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log('🔥 STORAGE KILLER: Removed sessionStorage key:', key);
      });
      
      result.storageCleared = true;
      
    } catch (error) {
      const errorMsg = `Failed to clear storage: ${(error as Error).message}`;
      result.errors.push(errorMsg);
      console.error('🔥 STORAGE KILLER ERROR:', errorMsg);
    }

    // 4. SUCCESS CHECK
    result.success = result.errors.length === 0;
    
    console.log('🔥 SERVICE WORKER KILLER: Completed', result);
    
    if (result.success) {
      console.log('✅ SUCCESS: All Service Workers unregistered and caches cleared');
      console.log('🔄 RELOAD REQUIRED: Browser will now use fresh JavaScript bundle');
    } else {
      console.warn('⚠️ PARTIAL SUCCESS: Some operations failed', result.errors);
    }
    
    return result;
    
  } catch (error) {
    result.errors.push(`Unexpected error: ${(error as Error).message}`);
    result.success = false;
    console.error('🔥 SERVICE WORKER KILLER: Unexpected error', error);
    return result;
  }
};

/**
 * Execute the Service Worker killer and optionally reload the page
 */
export const executeServiceWorkerKill = async (autoReload: boolean = false): Promise<ServiceWorkerKillResult> => {
  const result = await killServiceWorkersAndCache();
  
  if (result.success && autoReload) {
    console.log('🔄 AUTO-RELOAD: Refreshing page to load fresh bundle...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
  
  return result;
};