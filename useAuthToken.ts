import { useAuth } from '../contexts/AuthContext';

/**
 * React hook that provides authentication headers for API requests
 * Integrates with AuthContext to get the current user's token
 * 
 * @returns Object with Authorization header if user is authenticated, empty object otherwise
 */
export function useAuthHeaders(): Record<string, never> {
  // httpOnly cookie authentication - no Authorization headers needed
  return {};
}

/**
 * React hook that provides the raw authentication token
 * Integrates with AuthContext to get the current user's token
 * 
 * @returns The authentication token if available, null otherwise
 */
export function useAuthToken(): string | null {
  const { token, isAuthenticated } = useAuth();
  
  // Return token only if authenticated
  if (isAuthenticated && token) {
    return token;
  }
  
  return null;
}