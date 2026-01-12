// Demo Data Cleaner Utility
// Ensures comprehensive demo data cleanup

export const clearDemoData = () => {
  console.log('🧹 Clearing all demo data from storage...');
  
  // Clear all demo-related localStorage items
  const demoKeys = [
    'demo_household_id',
    'demo_household_data',
    'demo_ingredients', 
    'demo_user_data',
    'household_ingredients',
    'household_members',
    'demo_session',
    'tutorial_state',
    'ai_chef_chat_history'
  ];
  
  demoKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared demo data: ${key}`);
    }
  });
  
  // Clear all demo-related sessionStorage items
  demoKeys.forEach(key => {
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Cleared demo session data: ${key}`);
    }
  });
  
  console.log('✅ Demo data cleanup completed');
};

export const isDemoUser = (user: any): boolean => {
  return user?.isDemo || user?.email === 'demo@wimp.app' || user?.id === 999;
};

export const handleDemoUserAuth = (userData: any) => {
  if (userData?.clearDemoData || isDemoUser(userData)) {
    clearDemoData();
  }
};