
import { SubscriptionData } from '../hooks/useSubscription';

/**
 * GUARANTEED SUBSCRIPTION UI PATTERNS
 * Use these helpers to ensure consistent premium/freemium UI behavior
 */

export interface SubscriptionUIState {
  isPremium: boolean;
  showPremiumFeatures: boolean;
  showFreemiumPreviews: boolean;
  subscriptionData: SubscriptionData | undefined;
}

/**
 * Get guaranteed UI state for subscription-based components
 * SINGLE SOURCE OF TRUTH for all subscription UI decisions
 */
export const getSubscriptionUIState = (
  isPremium: boolean, 
  subscriptionData: SubscriptionData | undefined,
  isLoading: boolean = false
): SubscriptionUIState => {
  
  // GUARANTEED LOGIC: Loading or no data = Freemium mode (safe default)
  if (isLoading || !subscriptionData) {
    console.log('🎨 UI STATE: Loading/No data - showing freemium previews');
    return {
      isPremium: false,
      showPremiumFeatures: false,
      showFreemiumPreviews: true,
      subscriptionData
    };
  }
  
  // GUARANTEED LOGIC: Premium users see features, no previews  
  if (isPremium === true) {
    console.log('🎨 UI STATE: Premium user detected - showing features');
    console.log('🎨 UI STATE: isPremium =', isPremium);
    console.log('🎨 UI STATE: subscriptionData =', subscriptionData);
    return {
      isPremium: true,
      showPremiumFeatures: true,
      showFreemiumPreviews: false,
      subscriptionData
    };
  }
  
  // GUARANTEED LOGIC: Free users see previews, no features
  console.log('🎨 UI STATE: Free user - showing previews');
  return {
    isPremium: false,
    showPremiumFeatures: false,
    showFreemiumPreviews: true,
    subscriptionData
  };
};

/**
 * Premium Feature Gate Component Props
 * Use this pattern in ALL subscription-gated components
 */
export interface PremiumGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureType: 'aiMealGeneration' | 'aiChefChat' | 'masteryKeys' | 'financialTracking' | 'multiStoreComparison';
}

/**
 * Get usage display text for UI
 */
export const getUsageDisplayText = (
  feature: 'aiMealGeneration' | 'aiChefChat' | 'masteryKeys',
  subscriptionData: SubscriptionData | undefined,
  isPremium: boolean
): string => {
  
  if (isPremium) {
    return 'Unlimited';
  }
  
  if (!subscriptionData) {
    return 'Loading...';
  }
  
  const limit = subscriptionData.limits[feature];
  if (typeof limit === 'object') {
    if ('weekly' in limit) {
      const remaining = limit.weekly - limit.used;
      return `Free: ${remaining} of ${limit.weekly} remaining this week`;
    }
    if ('monthly' in limit) {
      const remaining = limit.monthly - limit.used;
      return `Free: ${remaining} of ${limit.monthly} remaining this month`;
    }
  }
  
  return 'Free: 0 remaining';
};
