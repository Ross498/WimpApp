// UI DEBUG SCRIPT - Add comprehensive debugging for meal planner and app issues
console.log('🔧 UI DEBUG SCRIPT: Starting comprehensive debugging...');

// 1. Check for app cache issues
function checkAppCache() {
  console.log('📱 CACHE DEBUG: Checking for cache issues...');
  
  // Check if service worker is present
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('🔧 CACHE: Service worker registrations:', registrations.length);
      registrations.forEach((registration, index) => {
        console.log(`SW ${index}:`, registration.scope);
      });
    });
  }
  
  // Check localStorage for stale data
  const keys = Object.keys(localStorage);
  console.log('💾 CACHE: LocalStorage keys:', keys);
  keys.forEach(key => {
    if (key.includes('auth') || key.includes('subscription') || key.includes('meal')) {
      const value = localStorage.getItem(key);
      console.log(`🔑 CACHE KEY "${key}":`, value?.substring(0, 100) + (value?.length > 100 ? '...' : ''));
    }
  });
}

// 2. Check for JavaScript errors
function setupErrorHandling() {
  console.log('⚠️ ERROR DEBUG: Setting up error handlers...');
  
  window.addEventListener('error', (event) => {
    console.error('🚨 GLOBAL ERROR:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
  });
}

// 3. Check React mounting issues
function checkReactMounting() {
  console.log('⚛️ REACT DEBUG: Checking React mounting...');
  
  // Check if React root exists
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ REACT: Root element not found!');
    return;
  }
  
  console.log('✅ REACT: Root element found:', rootElement);
  console.log('🎯 REACT: Root children count:', rootElement.children.length);
  
  // Check for React components
  setTimeout(() => {
    const reactElements = document.querySelectorAll('[data-reactroot], [data-react-app]');
    console.log('⚛️ REACT: React elements found:', reactElements.length);
    
    // Check for specific meal planner elements
    const mealPlannerElements = document.querySelectorAll('[data-testid*="meal"], [class*="meal"], [id*="meal"]');
    console.log('🍽️ MEAL PLANNER: Related elements found:', mealPlannerElements.length);
    
    mealPlannerElements.forEach((el, i) => {
      console.log(`🍽️ MEAL ELEMENT ${i}:`, {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent?.substring(0, 50)
      });
    });
  }, 2000);
}

// 4. Check API connectivity and authentication
function checkAPIConnectivity() {
  console.log('🌐 API DEBUG: Checking API connectivity...');
  
  // Check authentication status
  fetch('/api/auth/status', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('🔐 AUTH STATUS:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('🔐 AUTH DATA:', data);
    })
    .catch(error => {
      console.error('❌ AUTH ERROR:', error);
    });
  
  // Check subscription status
  fetch('/api/subscription/status', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('💳 SUBSCRIPTION STATUS:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('💳 SUBSCRIPTION DATA:', data);
    })
    .catch(error => {
      console.error('❌ SUBSCRIPTION ERROR:', error);
    });
  
  // Check meal plans API
  fetch('/api/meal-plans', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(response => {
      console.log('🍽️ MEAL PLANS STATUS:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('🍽️ MEAL PLANS DATA:', data);
    })
    .catch(error => {
      console.error('❌ MEAL PLANS ERROR:', error);
    });
}

// 5. Check CSS and styling issues
function checkStyling() {
  console.log('🎨 STYLE DEBUG: Checking CSS and styling...');
  
  // Check if Tailwind CSS is loaded
  const bodyClasses = document.body.className;
  console.log('🎨 BODY CLASSES:', bodyClasses);
  
  // Check for common CSS frameworks
  const stylesheets = Array.from(document.styleSheets);
  console.log('📋 STYLESHEETS COUNT:', stylesheets.length);
  
  stylesheets.forEach((sheet, i) => {
    try {
      if (sheet.href) {
        console.log(`📋 STYLESHEET ${i}:`, sheet.href);
      }
    } catch (e) {
      console.log(`📋 STYLESHEET ${i}: (cross-origin or protected)`);
    }
  });
  
  // Check for broken images
  const images = document.querySelectorAll('img');
  console.log('🖼️ IMAGES COUNT:', images.length);
  
  images.forEach((img, i) => {
    if (!img.complete || img.naturalHeight === 0) {
      console.error(`❌ BROKEN IMAGE ${i}:`, img.src);
    }
  });
}

// 6. Monitor network requests
function monitorNetworkRequests() {
  console.log('🌐 NETWORK DEBUG: Setting up network monitoring...');
  
  // Intercept fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options] = args;
    console.log('🌐 FETCH REQUEST:', url, options?.method || 'GET');
    
    return originalFetch.apply(this, args)
      .then(response => {
        console.log('✅ FETCH SUCCESS:', url, response.status);
        return response;
      })
      .catch(error => {
        console.error('❌ FETCH ERROR:', url, error);
        throw error;
      });
  };
}

// 7. Check for memory leaks and performance issues
function checkPerformance() {
  console.log('⚡ PERFORMANCE DEBUG: Checking performance metrics...');
  
  if (window.performance) {
    const navigation = performance.getEntriesByType('navigation')[0];
    console.log('⚡ NAVIGATION TIMING:', {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      totalLoad: navigation.loadEventEnd - navigation.fetchStart
    });
    
    // Check memory usage (Chrome only)
    if (performance.memory) {
      console.log('💾 MEMORY USAGE:', {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
      });
    }
  }
}

// Run all debugging functions
function runAllDebugChecks() {
  console.log('🚀 RUNNING ALL DEBUG CHECKS...');
  
  setupErrorHandling();
  checkAppCache();
  checkReactMounting();
  checkAPIConnectivity();
  checkStyling();
  monitorNetworkRequests();
  checkPerformance();
  
  console.log('✅ DEBUG SETUP COMPLETE - Check console for ongoing logs');
}

// Auto-run when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runAllDebugChecks);
} else {
  runAllDebugChecks();
}

// Make functions globally available for manual testing
window.debugUI = {
  checkAppCache,
  checkReactMounting,
  checkAPIConnectivity,
  checkStyling,
  checkPerformance,
  runAllDebugChecks
};

console.log('🔧 UI DEBUG: Script loaded. Use window.debugUI for manual checks.');