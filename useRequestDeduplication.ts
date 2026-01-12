// PERFORMANCE FIX: Request deduplication hook to prevent duplicate API calls
import { useRef, useCallback } from 'react';

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest>();

export const useRequestDeduplication = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const deduplicatedRequest = useCallback(async (
    key: string, 
    requestFn: () => Promise<any>,
    maxAge: number = 5000 // 5 seconds
  ) => {
    // Clean up old requests
    const now = Date.now();
    for (const [reqKey, request] of pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        pendingRequests.delete(reqKey);
      }
    }

    // Check if request is already pending
    const pending = pendingRequests.get(key);
    if (pending && now - pending.timestamp < maxAge) {
      console.log('🔄 DEDUPLICATION: Reusing pending request for', key);
      return pending.promise;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new request
    abortControllerRef.current = new AbortController();
    
    const promise = requestFn().finally(() => {
      pendingRequests.delete(key);
      abortControllerRef.current = null;
    });

    // Store pending request
    pendingRequests.set(key, {
      promise,
      timestamp: now
    });

    console.log('🚀 NEW REQUEST: Starting fresh request for', key);
    return promise;
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { deduplicatedRequest, cleanup };
};

// Global request cache for frequently accessed data
export const globalRequestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const getCachedData = (key: string): any | null => {
  const cached = globalRequestCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log('📦 CACHE HIT: Using cached data for', key);
    return cached.data;
  }
  return null;
};

export const setCachedData = (key: string, data: any, ttl: number = 30000): void => {
  globalRequestCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  console.log('💾 CACHE SET: Cached data for', key, 'TTL:', ttl + 'ms');
};