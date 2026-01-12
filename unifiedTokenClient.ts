/**
 * UNIFIED TOKEN CLIENT
 * Frontend companion to the unified token service
 * Eliminates conflicts between AuthContext localStorage and backend token systems
 */

// Client-side token storage configuration (mirrors server configuration)
const TOKEN_STORAGE = {
  COOKIE_NAME: 'authToken',
  LOCAL_STORAGE_KEY: 'authToken',
  HEADER_NAME: 'Authorization',
  CACHE_TTL_SECONDS: 300
} as const;

export interface TokenValidationResult {
  isValid: boolean;
  user?: any;
  error?: string;
}

/**
 * FRONTEND TOKEN VALIDATION
 * Validates JWT tokens using proper base64url decoding
 */
const base64urlDecode = (str: string): string => {
  // Replace base64url chars with base64 chars
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (str.length % 4) {
    str += '=';
  }
  
  return atob(str);
};

/**
 * UNIFIED JWT FORMAT VALIDATION
 * Validates JWT structure and payload format
 */
export function isValidJWTFormat(token: string | null | undefined): token is string {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return false;
  }
  
  // JWT regex validation: Only alphanumeric, hyphens, underscores, and dots
  const jwtPattern = /^[A-Za-z0-9-_.]+$/;
  
  // Basic JWT structure: header.payload.signature
  const parts = token.split('.');
  
  if (!jwtPattern.test(token) || parts.length !== 3 || !parts.every(part => part.length > 0)) {
    return false;
  }

  // Additional JWT payload validation with proper base64url decoding
  try {
    const payload = JSON.parse(base64urlDecode(parts[1]));
    // Check for required JWT fields
    return payload && typeof payload === 'object' && (payload.exp || payload.iat);
  } catch {
    return false;
  }
}

/**
 * LEGACY TOKEN STORAGE (DEPRECATED)
 * Kept only for cleanup - httpOnly cookies are used exclusively now
 */
export const UnifiedTokenStorage = {
  store: (_token: string): boolean => {
    console.warn('🔐 DEPRECATED: Token storage disabled - using httpOnly cookies exclusively');
    return false;
  },

  retrieve: (): string | null => {
    console.warn('🔐 DEPRECATED: Token retrieval disabled - using httpOnly cookies exclusively');
    return null;
  },

  clear: (): void => {
    try {
      // Only clear UI state data, not authentication tokens (handled by logout API)
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('guestMode');
      localStorage.removeItem('guestSessionStart');
      console.log('🔐 UI STATE CLEARED: Frontend UI state cleared (tokens handled by httpOnly cookies)');
    } catch (error) {
      console.warn('🔐 UI CLEAR: Failed to clear UI state data', error);
    }
  },

  createAuthHeaders: (_token?: string): Record<string, string> => {
    console.warn('🔐 DEPRECATED: Auth headers disabled - using httpOnly cookies exclusively');
    return {};
  }
};

/**
 * UNIFIED TOKEN VALIDATION (CLIENT-SIDE)
 * Basic client-side validation before sending to server
 */
export function validateTokenFormat(token: string): TokenValidationResult {
  if (!isValidJWTFormat(token)) {
    return { isValid: false, error: 'Invalid token format' };
  }

  try {
    const parts = token.split('.');
    const payload = JSON.parse(base64urlDecode(parts[1]));
    
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { isValid: false, error: 'Token expired' };
    }

    return { isValid: true, user: payload };
  } catch (error) {
    return { isValid: false, error: 'Token decode failed' };
  }
}

/**
 * UNIFIED API REQUEST HELPER
 * Creates API requests with cookie-based authentication (no headers needed)
 */
export async function unifiedApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  // SECURITY FIX: Use credentials for cookie-based auth, no Authorization headers
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include httpOnly cookies for all requests
    headers: {
      'Content-Type': 'application/json',
      ...options.headers, // Allow custom headers but no auth headers
    },
  });

  // Handle authentication errors consistently
  if (response.status === 401 || response.status === 403) {
    // Clear user data (tokens are managed by server cookies)
    UnifiedTokenStorage.clear();
    
    // Emit global auth error event for AuthContext to handle
    window.dispatchEvent(new CustomEvent('authError', {
      detail: { status: response.status, url }
    }));
  }

  return response;
}

console.log('🔐 UNIFIED TOKEN CLIENT: Initialized with configuration:', {
  storageKey: TOKEN_STORAGE.LOCAL_STORAGE_KEY,
  headerName: TOKEN_STORAGE.HEADER_NAME
});