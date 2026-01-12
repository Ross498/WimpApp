// Simple tutorial reset script - can run in browser console
console.log('🔧 TUTORIAL RESET SCRIPT');

// Clear all tutorial-related localStorage
const tutorialKeys = [
  'hasVisitedWIMP',
  'tutorialCompleted', 
  'hasSeenWelcome',
  'authToken',
  'user',
  'tutorial_started',
  'contextual_tutorial_completed'
];

console.log('Clearing tutorial localStorage keys...');
tutorialKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✓ Removed: ${key}`);
});

console.log('✅ Tutorial state cleared - reloading page...');
window.location.reload();