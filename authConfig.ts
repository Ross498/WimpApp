/**
 * UNIFIED AUTHENTICATION CONFIGURATION
 * Single source of truth for all authentication settings across the application
 * Eliminates dual JWT secret sources and token management conflicts
 */

// UNIFIED JWT Configuration - Single source across all systems
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-that-should-be-at-least-32-characters-long';
export const TOKEN_EXPIRY = '7d';

// Token storage configuration - Unified across frontend/backend
export const TOKEN_STORAGE = {
  COOKIE_NAME: 'authToken',
  LOCAL_STORAGE_KEY: 'authToken',
  HEADER_NAME: 'Authorization',
  CACHE_TTL_SECONDS: 300 // 5 minutes for LRU cache
} as const;

// Authentication endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register', 
  LOGOUT: '/api/auth/logout',
  ME: '/api/auth/me'
  // STATUS: Removed - use /api/auth/me for authentication status
} as const;

// Token validation settings
export const TOKEN_CONFIG = {
  ALGORITHM: 'HS256' as const,
  ISSUER: 'wimp-kitchen-app',
  AUDIENCE: 'wimp-users'
} as const;

console.log('🔐 AUTH CONFIG: Unified authentication configuration loaded');
console.log('🔐 JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');
console.log('🔐 TOKEN_EXPIRY:', TOKEN_EXPIRY);
console.log('🔐 TOKEN_STORAGE:', TOKEN_STORAGE);