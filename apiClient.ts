/**
 * UNIFIED API CLIENT - SINGLE SOURCE OF TRUTH FOR AUTHENTICATION
 * 
 * This module provides a unified fetch client that:
 * 1. Uses AuthContext as the ONLY source for authentication tokens
 * 2. Automatically injects Authorization headers for all requests
 * 3. Handles 401 responses globally with logout + toast + redirect
 * 4. Eliminates all conflicting token sources (localStorage, etc.)
 * 5. Provides consistent error handling across the entire application
 * 
 * REPLACES: All direct fetch calls, apiService, unifiedAuth, and manual token handling
 */

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/toast';
import { useCallback } from 'react';

/**
 * Helper function to safely check if headers contain Content-Type
 */
function hasContentType(headers?: HeadersInit): boolean {
  if (!headers) return false;
  
  if (headers instanceof Headers) {
    return headers.has('Content-Type');
  }
  
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'content-type');
  }
  
  // Plain object
  const plainHeaders = headers as Record<string, string>;
  return Object.keys(plainHeaders).some(key => key.toLowerCase() === 'content-type');
}

/**
 * Enhanced RequestInit interface with optional authentication bypass
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  skipAuth?: boolean; // For public endpoints that don't need authentication
  skipAuthRedirect?: boolean; // For auth endpoints themselves to prevent redirect loops
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * UNIFIED API CLIENT HOOK
 * 
 * Provides authenticated API requests with automatic error handling.
 * Use this hook in components that need to make API calls.
 */
export const useApiClient = () => {
  const { token, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();

  /**
   * Unified API request function
   * 
   * @param path - API endpoint path (e.g., '/api/recipes' or full URL)
   * @param options - Fetch options with enhanced authentication controls
   * @returns Promise<Response> - Raw fetch response for flexibility
   */
  const apiRequest = useCallback(async (
    path: string, 
    options: ApiRequestOptions = {}
  ): Promise<Response> => {
    try {
      // Validate path
      if (!path || typeof path !== 'string') {
        throw new Error('Invalid API path provided');
      }

      // Build complete URL if path is relative
      const url = path.startsWith('http') ? path : path;

      // Create headers object
      const headers = new Headers();
      
      // Set default headers
      headers.set('Accept', 'application/json');
      
      // Add Content-Type for requests with body (unless explicitly skipped)
      if (options.body && !hasContentType(options.headers)) {
        headers.set('Content-Type', 'application/json');
      }

      // Add any existing headers with proper error handling
      if (options.headers) {
        try {
          const existingHeaders = new Headers(options.headers);
          if (existingHeaders && existingHeaders.entries) {
            for (const [key, value] of existingHeaders.entries()) {
              headers.set(key, value);
            }
          }
        } catch (error) {
          console.warn('⚠️ API CLIENT: Failed to process headers, using defaults', error);
        }
      }

      // 🔐 CRITICAL: Using httpOnly cookies for authentication - no Authorization headers needed
      console.log('🔐 API CLIENT: Using httpOnly cookie authentication', {
        isAuthenticated,
        path,
        skipAuth: options.skipAuth
      });

      // Build request options
      const requestOptions: RequestInit = {
        method: 'GET',
        ...options,
        headers,
        credentials: 'include', // Include cookies for session-based fallback
      };

      console.log('🌐 API CLIENT: Making request', {
        method: requestOptions.method,
        url,
        hasAuth: headers.has('Authorization'),
        skipAuth: options.skipAuth
      });

      // Make the request
      const response = await fetch(url, requestOptions);

      // 🚨 GLOBAL 401 HANDLING - CRITICAL SECURITY BOUNDARY
      if (response.status === 401) {
        console.log('🚨 API CLIENT: 401 Unauthorized detected', {
          url,
          method: requestOptions.method,
          skipAuthRedirect: options.skipAuthRedirect
        });

        // Don't handle 401s for auth endpoints themselves (prevent loops)
        if (options.skipAuthRedirect) {
          console.log('🔐 API CLIENT: Skipping auto-logout for auth endpoint');
          return response;
        }

        // Show user-friendly error message
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue',
          variant: 'destructive',
          duration: 5000
        });

        // 🔐 CRITICAL: Trigger complete logout from AuthContext
        console.log('🔐 API CLIENT: Triggering automatic logout due to 401');
        logout();

        // Let the AuthContext handle routing - don't force navigation here
        
        return response; // Return response to allow caller to handle if needed
      }

      // Handle other error statuses (but don't auto-logout)
      if (!response.ok) {
        console.log('❌ API CLIENT: Request failed', {
          status: response.status,
          statusText: response.statusText,
          url
        });

        // For non-401 errors, show generic error toast
        if (response.status >= 500) {
          toast({
            title: 'Server Error',
            description: 'Something went wrong. Please try again later.',
            variant: 'destructive'
          });
        } else if (response.status >= 400 && response.status < 500) {
          // Try to get error message from response
          try {
            const errorData = await response.clone().json();
            toast({
              title: 'Request Failed',
              description: errorData.message || `Error ${response.status}: ${response.statusText}`,
              variant: 'destructive'
            });
          } catch {
            toast({
              title: 'Request Failed',
              description: `Error ${response.status}: ${response.statusText}`,
              variant: 'destructive'
            });
          }
        }
      }

      return response;

    } catch (error) {
      console.error('❌ API CLIENT: Network or request error', error);
      
      // Show network error toast
      toast({
        title: 'Network Error',
        description: 'Unable to connect to server. Please check your connection.',
        variant: 'destructive'
      });
      
      throw error;
    }
  }, [token, isAuthenticated, logout, toast]);

  /**
   * Convenience method for JSON API requests
   * Automatically parses JSON response and handles common patterns
   */
  const apiJson = useCallback(async <T = any>(
    path: string, 
    options: ApiRequestOptions = {}
  ): Promise<T> => {
    const response = await apiRequest(path, options);
    
    if (!response.ok) {
      // For JSON requests, throw detailed error
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // Ignore JSON parsing errors for error responses
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }, [apiRequest]);

  /**
   * Convenience methods for common HTTP verbs
   */
  const get = useCallback(<T = any>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return apiJson<T>(path, { ...options, method: 'GET' });
  }, [apiJson]);

  const post = useCallback(<T = any>(path: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => {
    return apiJson<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [apiJson]);

  const put = useCallback(<T = any>(path: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => {
    return apiJson<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [apiJson]);

  const patch = useCallback(<T = any>(path: string, data?: any, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}) => {
    return apiJson<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [apiJson]);

  const del = useCallback(<T = any>(path: string, options: Omit<ApiRequestOptions, 'method'> = {}) => {
    return apiJson<T>(path, { ...options, method: 'DELETE' });
  }, [apiJson]);

  /**
   * File upload method with proper multipart handling
   */
  const upload = useCallback(async <T = any>(
    path: string, 
    formData: FormData, 
    options: Omit<ApiRequestOptions, 'method' | 'body' | 'headers'> = {}
  ): Promise<T> => {
    // Don't set Content-Type for FormData - let browser set it with boundary
    const response = await apiRequest(path, {
      ...options,
      method: 'POST',
      body: formData,
      headers: {} // Let browser set multipart headers
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, [apiRequest]);

  return {
    // Core methods
    apiRequest,
    apiJson,
    
    // Convenience methods
    get,
    post,
    put,
    patch,
    delete: del,
    upload,
    
    // Authentication state (read-only)
    isAuthenticated,
    hasToken: !!token
  };
};

/**
 * LEGACY COMPATIBILITY: Export standalone function for non-hook usage
 * 
 * ⚠️ WARNING: This is for migration purposes only. New code should use useApiClient hook.
 * This function cannot access AuthContext and will need token passed explicitly.
 */
export async function standaloneApiRequest(
  path: string, 
  options: ApiRequestOptions & { token?: string } = {}
): Promise<Response> {
  const { token: explicitToken, ...fetchOptions } = options;
  
  const headers = new Headers();
  headers.set('Accept', 'application/json');
  
  if (fetchOptions.body && !hasContentType(fetchOptions.headers)) {
    headers.set('Content-Type', 'application/json');
  }

  if (fetchOptions.headers) {
    try {
      const existingHeaders = new Headers(fetchOptions.headers);
      if (existingHeaders && existingHeaders.entries) {
        for (const [key, value] of existingHeaders.entries()) {
          headers.set(key, value);
        }
      }
    } catch (error) {
      console.warn('⚠️ API CLIENT (unifiedApiRequest): Failed to process headers, using defaults', error);
    }
  }

  // Using httpOnly cookies for authentication - no Authorization headers needed

  const requestOptions: RequestInit = {
    method: 'GET',
    ...fetchOptions,
    headers,
    credentials: 'include',
  };

  return fetch(path, requestOptions);
}