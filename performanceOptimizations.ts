// PERFORMANCE FIX: Global performance optimizations and monitoring

// Request deduplication cache
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();

// Debounced API call helper
export const debouncedApiCall = (fn: () => Promise<any>, delay: number = 300) => {
  let timeoutId: NodeJS.Timeout;
  return () => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          console.error('Debounced API call failed:', error);
          reject(error);
        }
      }, delay);
    });
  };
};

// Request deduplication wrapper
export const deduplicateRequest = async <T>(
  key: string, 
  requestFn: () => Promise<T>, 
  ttl: number = 5000
): Promise<T> => {
  const now = Date.now();
  
  // Clean expired entries
  for (const [reqKey, { timestamp }] of requestCache.entries()) {
    if (now - timestamp > ttl) {
      requestCache.delete(reqKey);
    }
  }
  
  // Check for existing request
  const existing = requestCache.get(key);
  if (existing && now - existing.timestamp < ttl) {
    console.log('🔄 REQUEST DEDUPLICATION: Reusing pending request for', key);
    return existing.promise as Promise<T>;
  }
  
  // Create new request
  const promise = requestFn();
  requestCache.set(key, { promise, timestamp: now });
  
  // Clean up after completion
  promise.finally(() => {
    setTimeout(() => requestCache.delete(key), ttl);
  });
  
  return promise;
};

// Image loading optimization
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

// Memory usage monitoring
export const monitorMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('📊 MEMORY USAGE:', {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    });
  }
};

// Performance observer for long tasks
export const observeLongTasks = () => {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⚠️ LONG TASK DETECTED:', {
              duration: Math.round(entry.duration) + 'ms',
              startTime: Math.round(entry.startTime),
              name: entry.name
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.log('Long task observer not supported');
    }
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  observeLongTasks();
  
  // Monitor memory every 5 minutes instead of 30 seconds to reduce background noise
  setInterval(monitorMemoryUsage, 300000);
  
  // Log performance metrics on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      console.log('📈 PAGE LOAD PERFORMANCE:', {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart) + 'ms',
        loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart) + 'ms',
        totalTime: Math.round(navigation.loadEventEnd - navigation.fetchStart) + 'ms'
      });
    }, 0);
  });
};