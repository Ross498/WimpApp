import { Request, Response, NextFunction, RequestHandler } from "express";
import { extractToken, validateUnifiedToken, TokenPayload } from './unifiedTokenService';

/**
 * UNIFIED AUTHENTICATION MIDDLEWARE
 * Uses unified token service to eliminate architectural conflicts
 * Single source of truth for all backend authentication
 */

// Standardized user interface for consistent req.user shape
export interface AuthenticatedUser {
  id: number;
  userId: number;
  username: string;
  email: string;
  name: string;
}

// Authenticated request interface
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * UNIFIED AUTHENTICATION MIDDLEWARE
 * Single middleware for all protected routes
 * Eliminates demo token conflicts and normalizes user object shape
 */
export const authenticateToken: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Use unified token extraction
    const token = extractToken(req);
    
    if (!token) {
      console.log('🔐 AUTH: No token found in request');
      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    console.log('🔐 AUTH: Processing token for', req.method, req.url);

    // Use unified token validation
    const validation = await validateUnifiedToken(token);
    
    if (!validation.isValid || !validation.user) {
      console.log('🔐 AUTH: Token validation failed:', validation.error);
      res.status(403).json({
        success: false,
        message: validation.error || 'Token verification failed',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Normalize user object to consistent shape
    const normalizedUser: AuthenticatedUser = {
      id: Number(validation.user.id),
      userId: Number(validation.user.id),
      username: validation.user.username || validation.user.email?.split('@')[0] || 'user',
      email: validation.user.email || '',
      name: validation.user.name || validation.user.username || 'User'
    };

    // Attach normalized user to request
    req.user = normalizedUser;

    if (validation.fromCache) {
      console.log('🚀 AUTH: Cached verification for user', normalizedUser.id);
    } else {
      console.log('🔐 AUTH: Fresh verification for user', normalizedUser.id);
    }

    next();

  } catch (error) {
    console.error('🔐 AUTH ERROR:', error instanceof Error ? error.message : 'Unknown error');
    
    res.status(403).json({
      success: false,
      message: 'Token verification failed',
      code: 'VERIFICATION_FAILED',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
};

/**
 * OPTIONAL AUTHENTICATION MIDDLEWARE
 * Allows requests without tokens to pass through
 * Consistent with main middleware when token is present
 */
export const optionalAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Use unified token extraction
    const token = extractToken(req);
    
    // Continue without user if no token
    if (!token) {
      next();
      return;
    }

    try {
      // Use unified token validation
      const validation = await validateUnifiedToken(token);
      
      if (validation.isValid && validation.user) {
        // Normalize user object consistently with main middleware
        const normalizedUser: AuthenticatedUser = {
          id: Number(validation.user.id),
          userId: Number(validation.user.id),
          username: validation.user.username || validation.user.email?.split('@')[0] || 'user',
          email: validation.user.email || '',
          name: validation.user.name || validation.user.username || 'User'
        };

        req.user = normalizedUser;
        console.log('🔐 OPTIONAL AUTH: User authenticated', normalizedUser.id);
      }
    } catch (tokenError) {
      // Silently continue without user if token verification fails
      console.log('🔐 OPTIONAL AUTH: Token verification failed, continuing without user');
    }

    next();

  } catch (error) {
    // Never block requests in optional auth
    console.log('🔐 OPTIONAL AUTH ERROR: Continuing without user');
    next();
  }
};