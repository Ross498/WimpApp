/**
 * Authentication Trigger Utilities
 * Provides contextual authentication prompts throughout the app
 */

import { useAuth } from '@/contexts/AuthContext';

// Define authentication contexts with their messages
export const AUTH_CONTEXTS = {
  MEAL_COMPLETION: {
    action: 'meal_completion',
    title: 'Track Your Cooking Progress!',
    message: 'Sign up to track completed meals, earn mastery keys, and unlock advanced cooking challenges. Your culinary journey awaits!',
    benefits: ['Track cooking progress', 'Earn mastery keys', 'Unlock achievements', 'Sync across devices'],
  },
  RECIPE_SAVE: {
    action: 'recipe_save',
    title: 'Save Your Favorite Recipes!',
    message: 'Create an account to save recipes, build collections, and access them anywhere. Never lose a great recipe again!',
    benefits: ['Save unlimited recipes', 'Create custom collections', 'Access across devices', 'Share with friends'],
  },
  MEAL_PLANS: {
    action: 'meal_planning',
    title: 'Personalized Meal Planning!',
    message: 'Sign up to create custom meal plans, track nutrition, and get AI-powered recommendations tailored to your preferences.',
    benefits: ['Custom meal plans', 'Nutrition tracking', 'AI recommendations', 'Shopping list generation'],
  },
  AI_FEATURES: {
    action: 'ai_features',
    title: 'Unlimited AI Chef Assistance!',
    message: 'Get unlimited access to our AI chefs for cooking advice, recipe suggestions, and personalized guidance.',
    benefits: ['Unlimited AI chat', 'Recipe suggestions', 'Cooking guidance', 'Nutrition advice'],
  },
  SHOPPING_LIST: {
    action: 'shopping_list',
    title: 'Smart Shopping Lists!',
    message: 'Create an account to save shopping lists, get price comparisons, and receive smart buying recommendations.',
    benefits: ['Save shopping lists', 'Price comparisons', 'Smart recommendations', 'Pantry management'],
  },
  COLLECTIONS: {
    action: 'collections',
    title: 'Organize Your Recipe Collection!',
    message: 'Sign up to create custom recipe collections, organize by cuisine, and share with the cooking community.',
    benefits: ['Custom collections', 'Recipe organization', 'Community sharing', 'Advanced search'],
  },
  PROFILE_ACCESS: {
    action: 'profile_access',
    title: 'Access Your Cooking Profile!',
    message: 'Create your cooking profile to track progress, set preferences, and get personalized recommendations.',
    benefits: ['Cooking profile', 'Progress tracking', 'Personal preferences', 'Achievement badges'],
  },
  PREMIUM_FEATURES: {
    action: 'premium_features',
    title: 'Unlock Premium Features!',
    message: 'Upgrade to premium for advanced analytics, unlimited AI features, and exclusive chef content.',
    benefits: ['Advanced analytics', 'Unlimited AI access', 'Exclusive content', 'Priority support'],
  },
  DATA_EXPORT: {
    action: 'data_export',
    title: 'Export Your Cooking Data!',
    message: 'Create an account to export all your recipes, meal plans, cooking statistics, and personal data securely.',
    benefits: ['Complete data export', 'Secure backup', 'Data portability', 'Privacy control'],
  },
  FEEDBACK: {
    action: 'feedback_submission',
    title: 'Share Your Feedback!',
    message: 'Sign up to send feedback, suggestions, and feature requests to help us improve your cooking experience.',
    benefits: ['Direct developer feedback', 'Feature requests', 'Product improvement', 'Community voice'],
  },
  SETTINGS: {
    action: 'settings_access',
    title: 'Customize Your Settings!',
    message: 'Create an account to manage notification preferences, privacy settings, and personalize your cooking experience.',
    benefits: ['Personal preferences', 'Notification control', 'Privacy settings', 'Custom experience'],
  },
} as const;

export type AuthContextKey = keyof typeof AUTH_CONTEXTS;

/**
 * Hook for triggering contextual authentication
 */
export const useAuthTrigger = () => {
  const { isAuthenticated, isGuest, showAuthenticationModal } = useAuth();

  const triggerAuth = (contextKey: AuthContextKey, customMessage?: string) => {
    if (isAuthenticated) {
      console.log('AUTH TRIGGER SKIPPED: User already authenticated', { contextKey, isAuthenticated });
      return false; // User is authenticated, no trigger needed
    }

    const context = AUTH_CONTEXTS[contextKey];
    const message = customMessage || `${context.title}\n\n${context.message}\n\n✨ ${context.benefits.join(' • ')}`;
    
    // 🔥 COMPREHENSIVE LOGGING: Track all authentication triggers
    console.log('AUTH TRIGGER FIRED:', { 
      contextKey, 
      context: context.action, 
      isGuest, 
      isAuthenticated,
      title: context.title,
      timestamp: new Date().toISOString(),
      location: window.location.pathname
    });
    
    // Analytics tracking for authentication triggers
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'auth_trigger', {
        event_category: 'authentication',
        event_label: contextKey,
        value: 1
      });
    }
    
    // Use the global trigger function if available, otherwise fallback to direct modal
    if ((window as any).triggerWimpAuth) {
      console.log('🔐 AUTH TRIGGER: Using global trigger function');
      return (window as any).triggerWimpAuth(context.action, contextKey, message);
    } else {
      console.log('🔐 AUTH TRIGGER: Using direct modal fallback');
      showAuthenticationModal(message);
      return true;
    }
  };

  const requireAuth = (contextKey: AuthContextKey, callback?: () => void, customMessage?: string) => {
    // 🚨 CRITICAL FIX: Enhanced authentication check that works with both guest and authenticated states
    console.log('🔐 REQUIREAUTH: Checking auth state:', { 
      isAuthenticated, 
      isGuest, 
      contextKey,
      timestamp: new Date().toISOString()
    });
    
    if (isAuthenticated) {
      console.log('🔐 REQUIREAUTH: User authenticated, proceeding with action:', contextKey);
      callback?.();
      return true;
    }

    // 🔥 CRITICAL FIX: Force authentication modal regardless of current state - This ensures modal appears
    console.log('🔐 REQUIREAUTH: User NOT authenticated, FORCING auth modal:', { contextKey, isGuest, isAuthenticated });
    console.log('🔐 REQUIREAUTH: About to trigger authentication modal...');
    
    const context = AUTH_CONTEXTS[contextKey];
    const message = customMessage || `${context.title}\n\n${context.message}\n\n✨ ${context.benefits.join(' • ')}`;
    
    // 🚨 CRITICAL FIX: Direct modal trigger with comprehensive logging
    console.log('🔐 REQUIREAUTH: Calling showAuthenticationModal with message length:', message.length);
    try {
      showAuthenticationModal(message);
      console.log('✅ REQUIREAUTH: showAuthenticationModal called successfully');
    } catch (error) {
      console.error('❌ REQUIREAUTH: Failed to call showAuthenticationModal:', error);
    }
    
    // Also call triggerAuth for double coverage
    try {
      triggerAuth(contextKey, customMessage);
      console.log('✅ REQUIREAUTH: triggerAuth called successfully');
    } catch (error) {
      console.error('❌ REQUIREAUTH: Failed to call triggerAuth:', error);
    }
    
    return false;
  };

  // Enhanced helper for inline usage
  const requireAuthAction = (contextKey: AuthContextKey, action: () => void, customMessage?: string) => {
    return requireAuth(contextKey, action, customMessage);
  };

  // Helper for component-level protection
  const createProtectedHandler = (contextKey: AuthContextKey, handler: (...args: any[]) => void, customMessage?: string) => {
    return (...args: any[]) => {
      requireAuth(contextKey, () => handler(...args), customMessage);
    };
  };

  return {
    isAuthenticated,
    isGuest,
    triggerAuth,
    requireAuth,
    requireAuthAction,
    createProtectedHandler,
  };
};


/**
 * Utility function for non-hook contexts
 */
export const triggerAuthenticationGlobally = (contextKey: AuthContextKey, customMessage?: string) => {
  const context = AUTH_CONTEXTS[contextKey];
  const message = customMessage || `${context.title}\n\n${context.message}\n\n✨ ${context.benefits.join(' • ')}`;
  
  if ((window as any).triggerWimpAuth) {
    return (window as any).triggerWimpAuth(context.action, contextKey, message);
  }
  
  console.warn('Global auth trigger not available');
  return false;
};