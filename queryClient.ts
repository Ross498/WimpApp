import { QueryClient } from '@tanstack/react-query';

// GLOBAL 401 HANDLER REGISTRATION - Pluggable AuthError Handler System
let authErrorHandler: ((error: { status: number; endpoint: string; message: string }) => void) | null = null;

/**
 * Register a global authentication error handler
 * This allows AuthContext to be notified of 401/403 errors from QueryClient queries
 */
export const setAuthErrorHandler = (handler: typeof authErrorHandler) => {
  authErrorHandler = handler;
  console.log('🔐 QUERY CLIENT: Auth error handler registered', { hasHandler: !!handler });
};

/**
 * Clear the global authentication error handler
 */
export const clearAuthErrorHandler = () => {
  authErrorHandler = null;
  console.log('🔐 QUERY CLIENT: Auth error handler cleared');
};

// ANTI-POLLING RATE LIMITER - Defense against performance-killing requests
const rateLimitCache = new Map<string, { data: any; lastFetch: number; ttl: number }>();

// Enhanced API request function with proper authentication and rate limiting defense
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Invalid endpoint provided to apiRequest');
  }
  
  // CRITICAL PERFORMANCE FIX: Rate limit meal progress endpoint to prevent 30-second polling
  if (endpoint.includes('/api/meal-completion/progress') && (!options.method || options.method === 'GET')) {
    const now = Date.now();
    const rateLimitKey = endpoint;
    const cached = rateLimitCache.get(rateLimitKey);
    
    // Use 5-minute TTL for meal progress to prevent performance abuse
    const TTL = 5 * 60 * 1000; // 5 minutes
    
    if (cached && (now - cached.lastFetch) < TTL) {
      console.log('🛡️ RATE LIMITER: Blocking excessive meal progress request, using cached data', {
        endpoint,
        timeSinceLastFetch: Math.round((now - cached.lastFetch) / 1000) + 's',
        ttlRemaining: Math.round((TTL - (now - cached.lastFetch)) / 1000) + 's'
      });
      return cached.data;
    }
  }
  
  // HTTPONLY COOKIE AUTH: No token handling needed - cookies sent automatically
  // Global 401 handler ensures AuthContext.logout() is called on authentication failures
  console.log('🔐 QUERY CLIENT: Using httpOnly cookies for authentication', { endpoint });

  // CRITICAL FIX: Use Headers constructor for proper header handling
  const headers = new Headers();
  
  // IMPORTANT: Don't set Content-Type for FormData - browser will set it automatically with boundary
  const isFormData = options.body instanceof FormData;
  
  if (!isFormData) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  
  // Add any existing headers with proper error handling
  if (options.headers) {
    try {
      const existingHeaders = new Headers(options.headers);
      if (existingHeaders && existingHeaders.entries) {
        for (const [key, value] of existingHeaders.entries()) {
          // Skip Content-Type if we're sending FormData
          if (isFormData && key.toLowerCase() === 'content-type') {
            continue;
          }
          headers.set(key, value);
        }
      }
    } catch (error) {
      console.warn('⚠️ QUERY CLIENT: Failed to process headers, using defaults', error);
    }
  }

  // No Authorization headers needed - httpOnly cookies handle authentication
  console.log('🔐 QUERY CLIENT: Headers prepared (no auth header needed)', { endpoint });

  // Ensure credentials are included for cookie-based auth fallback
  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers: headers,
    cache: 'no-cache',
    ...options,
    // CRITICAL: Override credentials after spread to prevent bypass
    credentials: 'include'
  };

  try {
    const response = await fetch(endpoint, requestOptions);

    if (!response.ok) {
      // ENHANCED ERROR PARSING: Try to parse structured error response
      let errorData: any = null;
      let errorText = '';
      
      try {
        // First try to parse as JSON for structured error responses
        const responseText = await response.text();
        errorText = responseText;
        
        if (responseText && responseText.trim().startsWith('{')) {
          errorData = JSON.parse(responseText);
          console.log('📋 STRUCTURED ERROR RESPONSE:', {
            status: response.status,
            endpoint,
            errorData,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('📋 PLAIN TEXT ERROR RESPONSE:', {
            status: response.status,
            endpoint,
            errorText: responseText,
            timestamp: new Date().toISOString()
          });
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse error response:', parseError);
        errorData = null;
      }

      // ENHANCED AUTHENTICATION ERROR DETECTION
      // Check for requiresReauth field first (takes precedence over status codes)
      const shouldLogout = errorData?.requiresReauth === true || 
                          (!errorData && (response.status === 401 || response.status === 403));

      if (shouldLogout) {
        console.log('🔐 QUERY CLIENT: Authentication error detected', {
          status: response.status,
          requiresReauth: errorData?.requiresReauth,
          endpoint,
          errorCode: errorData?.code
        });
        
        const authErrorDetails = {
          status: response.status,
          endpoint,
          message: errorData?.error || `Authentication required (${response.status})`,
          code: errorData?.code,
          timestamp: new Date().toISOString()
        };
        
        // CRITICAL: Notify the registered authentication error handler (AuthContext)
        if (authErrorHandler) {
          console.log('🔐 QUERY CLIENT: Calling registered auth error handler');
          try {
            authErrorHandler({
              status: response.status,
              endpoint,
              message: authErrorDetails.message
            });
          } catch (handlerError) {
            console.error('🔐 QUERY CLIENT: Auth error handler failed:', handlerError);
          }
        } else {
          console.warn('🔐 QUERY CLIENT: No auth error handler registered - logout will not be triggered');
        }
        
        throw new Error(authErrorDetails.message);
      }

      // NON-AUTH ERRORS: Database, network, and other service errors
      // CRITICAL FIX: Always provide safe defaults for error construction
      const safeStatus = response?.status ?? 0;
      const safeMessage = errorData?.message || errorData?.error || errorText || 'Request failed';
      
      if (errorData) {
        // Handle structured error responses
        const isRetryable = errorData.retryable === true;
        const isDatabaseError = errorData.code?.includes('DB_') || 
                               errorData.code?.includes('DATABASE_') ||
                               response.status === 503;
        
        console.log('🔄 NON-AUTH ERROR DETECTED:', {
          status: safeStatus,
          code: errorData.code,
          isRetryable,
          isDatabaseError,
          requiresReauth: errorData.requiresReauth,
          endpoint
        });

        // Create enhanced error with additional context using safe defaults
        const enhancedError = new Error(safeMessage);
        (enhancedError as any).status = safeStatus;
        (enhancedError as any).code = errorData.code;
        (enhancedError as any).retryable = isRetryable;
        (enhancedError as any).isDatabaseError = isDatabaseError;
        (enhancedError as any).requiresReauth = errorData.requiresReauth;
        (enhancedError as any).endpoint = endpoint;
        
        throw enhancedError;
      }

      // FALLBACK: Legacy error handling for non-structured responses with safe defaults
      const fallbackError = new Error(`HTTP ${safeStatus}: ${safeMessage}`);
      (fallbackError as any).status = safeStatus;
      (fallbackError as any).endpoint = endpoint;
      throw fallbackError;
    }

    const data = await response.json();
    
    // Cache successful meal progress responses to prevent future polling abuse
    if (endpoint.includes('/api/meal-completion/progress') && (!options.method || options.method === 'GET')) {
      const rateLimitKey = endpoint;
      rateLimitCache.set(rateLimitKey, {
        data: await data,
        lastFetch: Date.now(),
        ttl: 5 * 60 * 1000
      });
      console.log('🛡️ RATE LIMITER: Cached meal progress response for 5 minutes');
      return rateLimitCache.get(rateLimitKey)!.data;
    }
    
    return data;

  } catch (error) {
    throw error;
  }
}

// PERFORMANCE FIX: Aggressive caching and request deduplication
export const queryClient = new QueryClient({
  // Set default query function for all queries to use unified authentication
  defaultOptions: {
    queries: {
      // CRITICAL: Set default query function to use apiRequest with auth
      queryFn: ({ queryKey }: { queryKey: readonly unknown[] }) => {
        const [endpoint] = queryKey as [string];
        return apiRequest(endpoint);
      },
      // CRITICAL: Enable aggressive caching to reduce API calls
      staleTime: 5 * 60 * 1000,        // Data stays fresh for 5 minutes
      gcTime: 10 * 60 * 1000,          // Cache for 10 minutes in memory
      refetchOnWindowFocus: false,      // Don't refetch on window focus
      refetchOnMount: false,            // Don't refetch on component mount
      refetchOnReconnect: true,         // Only refetch on network reconnect
      retry: (failureCount, error: any) => {
        // Don't retry authentication errors (when requiresReauth is true)
        if (error?.message?.includes('Authentication required') || 
            error?.requiresReauth === true ||
            (!error?.isDatabaseError && (error?.status === 401 || error?.status === 403))) {
          console.log('🔐 QUERY CLIENT: Not retrying authentication failure', {
            requiresReauth: error?.requiresReauth,
            status: error?.status,
            isDatabaseError: error?.isDatabaseError
          });
          return false;
        }
        
        // Retry database errors and other retryable errors
        if (error?.retryable === true || error?.isDatabaseError) {
          console.log('🔄 QUERY CLIENT: Retrying retryable/database error', {
            failureCount,
            retryable: error?.retryable,
            isDatabaseError: error?.isDatabaseError,
            code: error?.code
          });
          return failureCount < 2; // Allow more retries for database issues
        }
        
        return failureCount < 1;
      },                         // Enhanced retry logic for different error types
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
      networkMode: 'online',            // Only run when online
      notifyOnChangeProps: 'all',       // Optimize re-renders
      // CRITICAL: Request deduplication
      structuralSharing: true,          // Prevent unnecessary re-renders
    },
    mutations: {
      retry: 0,                         // Don't retry mutations
      networkMode: 'online',
    }
  },
});