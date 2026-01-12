// Subscription Test Mode Utility
// This helps test both premium and freemium experiences

export const isTestingFreemium = () => {
  return localStorage.getItem('TEST_FREEMIUM_MODE') === 'true';
};

export const enableFreemiumTestMode = () => {
  localStorage.setItem('TEST_FREEMIUM_MODE', 'true');
  console.log('🧪 FREEMIUM TEST MODE ENABLED - Premium features locked');
  window.location.reload();
};

export const disableFreemiumTestMode = () => {
  localStorage.removeItem('TEST_FREEMIUM_MODE');
  console.log('🏆 PREMIUM MODE RESTORED - All features unlocked');
  window.location.reload();
};