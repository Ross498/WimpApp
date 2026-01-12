// Emergency script to clear expired authentication
console.log('🔐 CLEARING EXPIRED AUTHENTICATION...');

// Clear all authentication data
localStorage.removeItem('authToken');
localStorage.removeItem('user');
localStorage.removeItem('isAuthenticated');
localStorage.clear();
sessionStorage.clear();

// Trigger storage events to update auth context
window.dispatchEvent(new StorageEvent('storage', {
  key: 'authToken',
  newValue: null,
  oldValue: null
}));

console.log('✅ Authentication cleared - page will reload');

// Force reload to reset all state
setTimeout(() => {
  window.location.reload();
}, 1000);