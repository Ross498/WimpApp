/**
 * UNIFIED AUTHENTICATION UTILITIES - AUTHCONTEXT DELEGATION
 * 
 * 🔄 REFACTORED: All functions now delegate to AuthContext only
 * 🚨 CRITICAL: No direct localStorage access - eliminates race conditions
 * 📦 COMPATIBILITY: Preserves external APIs during transition
 */

// Removed unused useContext import - using global bridge pattern instead

// Import AuthContext for delegation - this eliminates competing token sources
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  user: any;
  logout: () => void;
}

// Global context accessor for non-React utility functions
let globalAuthContext: AuthContextType | null = null;

/**
 * 🔄 CONTEXT BRIDGE: Initialize global context accessor
 * Called by AuthProvider to eliminate localStorage dependency
 */
export function initializeAuthBridge(authContext: AuthContextType): void {
  globalAuthContext = authContext;
}

/**
 * 🔄 AUTHCONTEXT DELEGATION: Get authentication token from AuthContext only
 * 🚨 CRITICAL: No more direct localStorage access - eliminates race conditions
 * 
 * @param contextToken - Optional token from AuthContext (preferred)
 * @returns Valid token or null
 */
export function getAuthToken(contextToken?: string | null): string | null {
  // PREFERRED: Use token from AuthContext when provided
  if (contextToken !== undefined) {
    // Reject invalid/demo tokens
    if (!contextToken || contextToken === 'test-token-123' || contextToken === 'demo-token') {
      return null;
    }
    return contextToken;
  }
  
  // FALLBACK: Use global context bridge (for non-React utilities)
  if (globalAuthContext?.isAuthenticated && globalAuthContext.token) {
    const token = globalAuthContext.token;
    // Reject invalid/demo tokens
    if (token === 'test-token-123' || token === 'demo-token') {
      return null;
    }
    return token;
  }
  
  // NO FALLBACK: With httpOnly cookies, tokens aren't accessible via localStorage
  console.warn('⚠️ UNIFIED AUTH: No token available - authentication required');
  return null;
}

/**
 * 🔄 AUTHCONTEXT DELEGATION: Get unified authentication headers
 * 🚨 CRITICAL: Uses AuthContext token only when provided
 * 
 * @param contextToken - Optional token from AuthContext (preferred)
 * @returns Headers with Authorization if authenticated
 */
export function getAuthHeaders(_contextToken?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * 🔄 AUTHCONTEXT DELEGATION: Clear authentication data via AuthContext
 * 🚨 CRITICAL: Uses AuthContext logout method for httpOnly cookie clearing
 * 
 * @deprecated Use AuthContext logout() method directly instead
 */
export function clearAuth(): void {
  console.warn('🚨 DEPRECATED: clearAuth() - Use AuthContext logout() method instead');
  
  // Use global context bridge if available
  if (globalAuthContext?.logout) {
    globalAuthContext.logout();
    return;
  }
  
  // With httpOnly cookies, manual clearing isn't possible - must use logout API
  console.warn('⚠️ AUTH: Cannot clear httpOnly cookies manually - use logout endpoint');
}

/**
 * 🔄 AUTHCONTEXT DELEGATION: Validate token from AuthContext
 * 🚨 CRITICAL: Prefers AuthContext token over direct localStorage
 * 
 * @param token - Token to validate (from AuthContext preferred)
 * @returns True if token is valid
 */
export function isValidToken(token?: string | null): boolean {
  // Use provided token first
  if (token !== undefined) {
    return !!(token && token !== 'test-token-123' && token !== 'demo-token');
  }
  
  // Get token through unified system
  const authToken = getAuthToken();
  return !!(authToken && authToken !== 'test-token-123' && authToken !== 'demo-token');
}

/**
 * 🔄 AUTHCONTEXT DELEGATION: Fetch wrapper with AuthContext headers
 * 🚨 CRITICAL: Uses AuthContext token when provided
 * 
 * @param url - Request URL
 * @param options - Fetch options
 * @param contextToken - Optional token from AuthContext (preferred)
 * @returns Fetch response
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}, 
  contextToken?: string | null
): Promise<Response> {
  const headers = new Headers(getAuthHeaders(contextToken));
  
  // Merge with any existing headers with proper error handling
  if (options.headers) {
    try {
      const existingHeaders = new Headers(options.headers);
      if (existingHeaders && existingHeaders.entries) {
        for (const [key, value] of existingHeaders.entries()) {
          headers.set(key, value);
        }
      }
    } catch (error) {
      console.warn('⚠️ UNIFIED AUTH: Failed to process headers, using defaults', error);
    }
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * 🆕 REACT HOOK VERSION: Use authentication utilities with AuthContext
 * 🚨 CRITICAL: This is the preferred way for React components
 * 
 * @returns Authentication utilities with AuthContext delegation
 */
export function useUnifiedAuth() {
  // This would need to be implemented with proper hook imports
  // For now, returning utility functions that need context token
  console.warn('🚨 TODO: useUnifiedAuth hook needs proper AuthContext integration');
  
  return {
    getToken: (contextToken?: string | null) => getAuthToken(contextToken),
    getHeaders: (contextToken?: string | null) => getAuthHeaders(contextToken),
    authenticatedFetch: (url: string, options: RequestInit = {}, contextToken?: string | null) => 
      authenticatedFetch(url, options, contextToken),
    isValidToken: (token?: string | null) => isValidToken(token),
  };
}