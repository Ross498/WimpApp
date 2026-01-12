/**
 * HIGH-PERFORMANCE TOKEN UTILITIES
 * Reduces unnecessary API calls through intelligent token management
 */

interface TokenInfo {
  token: string;
  expiry: number;
  isValid: boolean;
}

export class TokenManager {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly USER_KEY = 'user';
  private static readonly TOKEN_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry

  /**
   * Get token with expiry validation
   * Returns null if token is expired or invalid
   */
  static getValidToken(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token || token === 'null' || token === 'undefined') {
        console.log('🔐 TOKEN: No valid token found');
        return null;
      }

      // Check if token is expired using JWT payload
      const tokenInfo = this.parseTokenInfo(token);
      if (!tokenInfo.isValid) {
        console.log('🔐 TOKEN: Token validation failed, removing');
        this.clearToken();
        return null;
      }

      const timeUntilExpiry = tokenInfo.expiry - Date.now();
      if (timeUntilExpiry > 0) {
        console.log('🔐 TOKEN: Valid token found');
      }

      return token;
    } catch (error) {
      console.warn('🔐 TOKEN: Error checking token validity:', error);
      return localStorage.getItem(this.TOKEN_KEY);
    }
  }

  /**
   * Check if token needs refresh soon
   */
  static needsRefresh(): boolean {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (!token) return true;

      const tokenInfo = this.parseTokenInfo(token);
      if (!tokenInfo.isValid) return true;

      const timeUntilExpiry = tokenInfo.expiry - Date.now();
      return timeUntilExpiry < this.TOKEN_BUFFER;
    } catch {
      return true;
    }
  }

  /**
   * Parse JWT token to get expiry information
   */
  private static parseTokenInfo(token: string): TokenInfo {
    try {
      // Parse JWT payload (second part after first dot)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { token, expiry: 0, isValid: false };
      }

      // Decode base64 payload
      const payload = JSON.parse(atob(parts[1]));
      const expiry = payload.exp ? payload.exp * 1000 : 0;
      const isValid = expiry > Date.now();

      return { token, expiry, isValid };
    } catch (error) {
      console.warn('🔐 TOKEN: Failed to parse token:', error);
      return { token, expiry: 0, isValid: false };
    }
  }

  /**
   * Store token securely
   */
  static storeToken(token: string, user: any): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    console.log('🔐 TOKEN: Stored new token and user data');
  }

  /**
   * Clear token and user data
   */
  static clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('isAuthenticated');
    console.log('🔐 TOKEN: Cleared token and user data');
  }

  /**
   * Check if we're in authenticated state
   */
  static isAuthenticated(): boolean {
    const token = this.getValidToken();
    return !!token;
  }
}

/**
 * SMART CACHE UTILITIES
 * Implements intelligent caching with TTL and conditional updates
 */
export class SmartCache {
  private static readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes default TTL

  /**
   * Get cached data if still valid
   */
  static get<T>(key: string, customTTL?: number): T | null {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp, ttl } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const maxAge = customTTL || ttl || this.DEFAULT_TTL;

      if (age < maxAge) {
        console.log(`CACHE HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
        return data;
      } else {
        console.log(`CACHE EXPIRED: ${key} (age: ${Math.round(age / 1000)}s, max: ${Math.round(maxAge / 1000)}s)`);
        sessionStorage.removeItem(key);
        return null;
      }
    } catch (error) {
      console.warn(`CACHE ERROR: Failed to read ${key}:`, error);
      sessionStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Store data in cache with TTL
   */
  static set<T>(key: string, data: T, customTTL?: number): void {
    try {
      const ttl = customTTL || this.DEFAULT_TTL;
      const cached = {
        data,
        timestamp: Date.now(),
        ttl
      };
      sessionStorage.setItem(key, JSON.stringify(cached));
      console.log(`CACHE SET: ${key} (TTL: ${Math.round(ttl / 1000)}s)`);
    } catch (error) {
      console.warn(`CACHE ERROR: Failed to store ${key}:`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  static clear(key: string): void {
    sessionStorage.removeItem(key);
    console.log(`CACHE CLEAR: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    const keys = Object.keys(sessionStorage).filter(key => 
      key.startsWith('meal-progress') || 
      key.startsWith('api-cache') ||
      key.startsWith('smart-cache')
    );
    keys.forEach(key => sessionStorage.removeItem(key));
    console.log(`CACHE CLEAR ALL: Removed ${keys.length} entries`);
  }
}

/**
 * Conditional request utilities for 304 Not Modified responses
 */
export class ConditionalRequests {
  /**
   * Add conditional headers to request if we have cached ETag/Last-Modified
   */
  static addConditionalHeaders(url: string, headers: Record<string, string> = {}): Record<string, string> {
    const cacheKey = `etag-${url}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { etag, lastModified } = JSON.parse(cached);
        if (etag) {
          headers['If-None-Match'] = etag;
        }
        if (lastModified) {
          headers['If-Modified-Since'] = lastModified;
        }
        console.log(`CONDITIONAL: Added headers for ${url}`);
      } catch (error) {
        console.warn('CONDITIONAL: Failed to parse cached headers:', error);
      }
    }

    return headers;
  }

  /**
   * Store ETag/Last-Modified from response headers
   */
  static storeResponseHeaders(url: string, response: Response): void {
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');

    if (etag || lastModified) {
      const cacheKey = `etag-${url}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({ etag, lastModified }));
      console.log(`CONDITIONAL: Stored headers for ${url}`);
    }
  }
}