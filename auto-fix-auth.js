// Auto-fix authentication issue by bypassing React Query on login
console.log('🔧 Auto-fixing authentication flow...');

// Override the AuthenticationModal login handler
const originalFetch = window.fetch;
window.fetch = async (url, options) => {
  const result = await originalFetch(url, options);
  
  // Intercept login requests
  if (url.includes('/api/auth/login') && options?.method === 'POST') {
    const data = await result.clone().json();
    if (data.success) {
      console.log('🔧 Login intercepted - forcing immediate app display');
      
      // Store auth data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Force app to show by directly manipulating the screen state
      setTimeout(() => {
        const event = new CustomEvent('forceAppScreen', { detail: data });
        window.dispatchEvent(event);
      }, 100);
    }
  }
  
  return result;
};

// Listen for the force app screen event
window.addEventListener('forceAppScreen', (event) => {
  console.log('🔧 Forcing app screen display');
  // This will be handled by the React component
});

console.log('🔧 Auth auto-fix installed');