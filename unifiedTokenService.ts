/**
 * UNIFIED TOKEN SERVICE
 * Single source of truth for all JWT token operations across frontend and backend
 * Eliminates conflicts between AuthContext, TokenCache, and Auth.ts systems
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET, TOKEN_EXPIRY, TOKEN_STORAGE } from './authConfig';
import { tokenCache } from './tokenCache';

export interface TokenPayload {
  id: number;
  username: string;
  email: string;
  name: string;
  userId: number; // FIXED: Consistent integer type matching database schema
  subscriptionTier?: string;
  trialEndsAt?: Date | string | null;
  iat?: number;
  exp?: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  user?: TokenPayload;
  error?: string;
  fromCache?: boolean;
}

/**
 * UNIFIED TOKEN GENERATION
 * Single method for creating JWT tokens with consistent payload structure
 */
export function generateUnifiedToken(user: any): string {
  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    name: user.name,
    userId: Number(user.id), // FIXED: Consistent integer type
    subscriptionTier: user.subscriptionTier,
    trialEndsAt: user.trialEndsAt
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: TOKEN_EXPIRY,
    issuer: 'wimp-kitchen-app',
    audience: 'wimp-users'
  });
}

/**
 * UNIFIED TOKEN VALIDATION
 * Single method for validating JWT tokens with caching
 */
export async function validateUnifiedToken(token: string): Promise<TokenValidationResult> {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return { isValid: false, error: 'No token provided' };
  }

  // Remove Bearer prefix if present
  const cleanToken = token.replace(/^Bearer\s+/, '');
  
  // Basic JWT format validation
  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    return { isValid: false, error: 'Invalid token format' };
  }

  try {
    // Use tokenCache for validation with LRU caching
    const result = await tokenCache.verifyToken(cleanToken);
    return {
      isValid: true,
      user: result.user as TokenPayload,
      fromCache: result.fromCache
    };
  } catch (error: any) {
    let errorMessage = 'Token validation failed';
    
    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Invalid token';
    } else if (error.name === 'NotBeforeError') {
      errorMessage = 'Token not active';
    }

    return { 
      isValid: false, 
      error: errorMessage 
    };
  }
}

/**
 * UNIFIED TOKEN INVALIDATION
 * Single method for invalidating tokens across all systems
 */
export function invalidateUnifiedToken(token: string): void {
  if (!token) return;
  
  const cleanToken = token.replace(/^Bearer\s+/, '');
  tokenCache.invalidateToken(cleanToken);
}

/**
 * UNIFIED TOKEN EXTRACTION
 * SECURITY FIX: Prefer cookies over headers for token extraction
 */
export function extractToken(req: any): string | null {
  // 1. Check cookies FIRST (PREFERRED for security - httpOnly)
  const cookieToken = req.cookies?.[TOKEN_STORAGE.COOKIE_NAME];
  if (cookieToken) {
    console.log('🔐 TOKEN EXTRACTED: From httpOnly cookie (preferred)');
    return cookieToken;
  }

  // 2. Check Authorization header (fallback for compatibility)
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('🔐 TOKEN EXTRACTED: From Authorization header (fallback)');
    return authHeader.substring(7);
  }

  // 3. Check other possible locations (legacy compatibility)
  const headerToken = req.headers?.[TOKEN_STORAGE.HEADER_NAME.toLowerCase()];
  if (headerToken && headerToken.startsWith('Bearer ')) {
    console.log('🔐 TOKEN EXTRACTED: From custom header (legacy)');
    return headerToken.substring(7);
  }

  console.log('🔐 TOKEN EXTRACTION: No valid token found');
  return null;
}

/**
 * UNIFIED TOKEN STORAGE HELPERS
 * Consistent token storage patterns for cookies and headers
 */
export const TokenStorageHelpers = {
  setCookie: (res: any, token: string) => {
    const cookieOptions = {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' as any, // Relax for development
      secure: process.env.NODE_ENV === 'production',
      path: '/' // Ensure cookie is available for all paths
    };
    
    console.log('🔐 SETTING COOKIE:', { 
      cookieName: TOKEN_STORAGE.COOKIE_NAME, 
      options: cookieOptions 
    });
    
    res.cookie(TOKEN_STORAGE.COOKIE_NAME, token, cookieOptions);
  },

  clearCookie: (res: any) => {
    res.clearCookie(TOKEN_STORAGE.COOKIE_NAME);
  },

  setAuthHeader: (token: string) => ({
    [TOKEN_STORAGE.HEADER_NAME]: `Bearer ${token}`
  })
};

/**
 * UNIFIED TOKEN CACHE STATS
 * Expose cache statistics for monitoring
 */
export function getTokenCacheStats() {
  return tokenCache.getStats();
}

console.log('🔐 UNIFIED TOKEN SERVICE: Initialized with consolidated token management');