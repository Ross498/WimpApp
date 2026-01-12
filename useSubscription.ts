import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/queryClient';
import { isTestingFreemium } from '../utils/subscriptionTestMode';

export interface SubscriptionLimits {
  aiMealGeneration: {
    weekly: number;
    used: number;
  };
  aiChefChat: {
    weekly: number;
    used: number;
  };
  masteryKeys: {
    monthly: number;
    used: number;
  };
  financialTracking: boolean;
  imageUploads: boolean;
  wasteReduction: boolean;
  multiStoreComparison: boolean;
}

export interface SubscriptionData {
  isPremium: boolean;
  currentPlan: 'free' | 'premium';
  renewalDate: string | null;
  limits: SubscriptionLimits;
  tier?: string;
  success?: boolean;
}

export const useSubscription = () => {
  const { isAuthenticated } = useAuth();
  
  const { data: subscriptionData, isLoading, error } = useQuery<SubscriptionData>({
    queryKey: ['/api/subscription/status', isAuthenticated],
    // IMMEDIATE UPDATE: Reduced caching for subscription changes
    staleTime: 30 * 1000,              // 30 seconds - allow rapid subscription updates
    gcTime: 2 * 60 * 1000,             // Keep in cache for 2 minutes
    refetchOnMount: true,               // Refetch on mount to catch subscription changes
    refetchOnWindowFocus: true,         // Refetch on focus to catch external subscription changes
    queryFn: async () => {
      // SECURITY FIX: Use apiRequest for consistent httpOnly cookie authentication
      const data = await apiRequest('/api/subscription/status', {
        method: 'GET'
      });
      console.log('🔐 SUBSCRIPTION API RAW RESPONSE:', data);

      // NORMALIZE RESPONSE FORMAT - Handle both endpoint response formats
      const normalizedData: SubscriptionData = {
        isPremium: data.isPremium || data.tier === 'premium',
        currentPlan: data.currentPlan || (data.isPremium || data.tier === 'premium' ? 'premium' : 'free'),
        renewalDate: data.renewalDate || null,
        limits: data.limits || {
          // Use actual usage data from API instead of hardcoded values
          aiMealGeneration: {
            weekly: 3,
            used: data.limits?.aiMealGeneration?.used || 0
          },
          aiChefChat: {
            weekly: 5,
            used: data.limits?.aiChefChat?.used || 0
          },
          masteryKeys: {
            monthly: 1,
            used: 0
          },
          financialTracking: data.features?.financialTracking || false,
          imageUploads: data.features?.imageUploads || false,
          wasteReduction: data.features?.wasteReduction || false,
          multiStoreComparison: data.features?.multiStoreComparison || false
        },
        // Support both response formats
        tier: data.tier || data.currentPlan,
        success: data.success
      };

      console.log('🔐 SUBSCRIPTION NORMALIZED DATA:', normalizedData);
      return normalizedData;
    },
  });

  // GUARANTEED PREMIUM CHECK - Single source of truth - MEMOIZED
  const isPremium = useMemo(() => {
    // Allow testing freemium mode even for authenticated users
    if (isTestingFreemium()) {
      return false;
    }

    // SIMPLIFIED PREMIUM DETECTION: Direct check of subscription data
    if (subscriptionData) {
      // Check all possible premium indicators
      const hasPremiumFlag = subscriptionData.isPremium === true;
      const hasPremiumTier = subscriptionData.tier === 'premium';
      const hasPremiumPlan = subscriptionData.currentPlan === 'premium';

      return hasPremiumFlag || hasPremiumTier || hasPremiumPlan;
    }

    // If data is loading or failed, default to FREE (safe fallback)
    return false;
  }, [subscriptionData?.isPremium, subscriptionData?.tier, subscriptionData?.currentPlan, isLoading]);

  // GUARANTEED FEATURE ACCESS CHECK
  const canUseFeature = (feature: keyof SubscriptionLimits): boolean => {
    console.log('🔒 FEATURE CHECK:', feature, 'isPremium:', isPremium);

    // Premium users have full access
    if (isPremium) {
      console.log('🔒 FEATURE: Premium user - ALLOWED');
      return true;
    }

    // Free users need limit checking
    if (!subscriptionData) {
      console.log('🔒 FEATURE: No subscription data - BLOCKED');
      return false;
    }

    const limit = subscriptionData.limits[feature];
    console.log('🔒 FEATURE: Free user limit for', feature, ':', limit);

    if (typeof limit === 'boolean') {
      return limit;
    }

    if (typeof limit === 'object' && 'weekly' in limit) {
      return limit.used < limit.weekly;
    }

    if (typeof limit === 'object' && 'monthly' in limit) {
      return limit.used < limit.monthly;
    }

    console.log('🔒 FEATURE: Unknown limit type - BLOCKED');
    return false;
  };

  const getRemainingUsage = (feature: 'aiMealGeneration' | 'aiChefChat' | 'masteryKeys'): number => {
    if (isPremium) return Infinity;
    if (!subscriptionData) return 0;

    const limit = subscriptionData.limits[feature];
    if (typeof limit === 'object') {
      if ('weekly' in limit) return limit.weekly - limit.used;
      if ('monthly' in limit) return limit.monthly - limit.used;
    }

    return 0;
  };

  const incrementUsage = async (feature: 'aiMealGeneration' | 'aiChefChat' | 'masteryKeys') => {
    if (isPremium) return; // Premium users have unlimited usage

    try {
      // SECURITY FIX: Use apiRequest for consistent httpOnly cookie authentication
      await apiRequest('/api/subscription/increment-usage', {
        method: 'POST',
        body: JSON.stringify({ feature })
      });
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  };

  return {
    subscriptionData, // Export for UI display purposes
    isLoading,
    error,
    canUseFeature,
    getRemainingUsage,
    incrementUsage,
    isPremium, // SINGLE SOURCE OF TRUTH
    isTestingFreemium: isTestingFreemium(),
  };
};