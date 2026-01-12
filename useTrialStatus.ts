import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';

export interface TrialStatusData {
  subscriptionStatus: 'trial' | 'active' | 'expired';
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  trialEndsAt: string | null;
  hasSeenWelcome: boolean;
}

export const useTrialStatus = () => {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<TrialStatusData>({
    queryKey: ['/api/subscription/trial-status'],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated, // Only fetch when authenticated
    queryFn: async () => {
      const response = await apiRequest('/api/subscription/trial-status', {
        method: 'GET'
      });
      return response as TrialStatusData;
    }
  });

  // FIX: Only treat actual expiration as expired, not network errors
  // Network/HTTPS errors should NOT block access - they're temporary issues
  const hasError = isAuthenticated && !!error;
  const isActuallyExpired = data?.isExpired === true;

  return {
    trialStatus: data,
    isLoading,
    error,
    refetch,
    // Convenience flags - only block on actual expiration, not errors
    isTrialExpired: isAuthenticated ? isActuallyExpired : false,
    showWelcomeModal: isAuthenticated && data ? !data.hasSeenWelcome && data.isTrial : false,
    showTrialExpiredModal: isAuthenticated && isActuallyExpired,
    daysRemaining: data?.daysRemaining || 0,
    hasError // Expose error state for UI feedback (but don't block features)
  };
};
