/**
 * JWT SANITIZER - CRITICAL SECURITY COMPONENT
 * Prevents JWT tokens from being logged anywhere in the application
 * This is a security-critical component that must prevent token exposure
 */

interface SanitizedTokenInfo {
  hasToken: boolean;
  tokenLength: number;
  isValidFormat: boolean;
  // SECURITY: Never include tokenStart or any actual token data
}

export class JWTSanitizer {
  /**
   * SECURITY CRITICAL: Sanitize token for safe logging
   * Returns only safe metadata, never actual token content
   */
  static sanitizeToken(token: string | null): SanitizedTokenInfo {
    if (!token || token === 'null' || token === 'undefined') {
      return {
        hasToken: false,
        tokenLength: 0,
        isValidFormat: false
      };
    }

    // SECURITY: Only return metadata, never token content
    return {
      hasToken: true,
      tokenLength: token.length,
      isValidFormat: this.isValidJWTFormat(token)
      // CRITICAL: NEVER include tokenStart, tokenContent, or any actual token data
    };
  }

  /**
   * SECURITY: Validate JWT format without exposing content
   */
  private static isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // JWT format validation without content exposure
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * SECURITY CRITICAL: Replace console methods to prevent JWT logging
   * This should be called early in app initialization
   */
  static installJWTSanitizer(): void {
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    // Override console.log to sanitize JWT tokens
    console.log = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => this.sanitizeLogArg(arg));
      originalConsoleLog.apply(console, sanitizedArgs);
    };

    // Override console.warn to sanitize JWT tokens
    console.warn = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => this.sanitizeLogArg(arg));
      originalConsoleWarn.apply(console, sanitizedArgs);
    };

    // Override console.error to sanitize JWT tokens
    console.error = (...args: any[]) => {
      const sanitizedArgs = args.map(arg => this.sanitizeLogArg(arg));
      originalConsoleError.apply(console, sanitizedArgs);
    };

    console.log('🔐 JWT SANITIZER: Installed successfully');
  }

  /**
   * SECURITY: Sanitize individual log arguments
   */
  private static sanitizeLogArg(arg: any): any {
    if (typeof arg === 'string') {
      return this.sanitizeString(arg);
    }

    if (typeof arg === 'object' && arg !== null) {
      return this.sanitizeObject(arg);
    }

    return arg;
  }

  /**
   * SECURITY: Sanitize strings to remove JWT tokens
   */
  private static sanitizeString(str: string): string {
    // Pattern to match JWT tokens (3 base64 parts separated by dots)
    const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
    
    return str.replace(jwtPattern, '[JWT_TOKEN_SANITIZED]');
  }

  /**
   * SECURITY: Sanitize objects to remove JWT token properties
   */
  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeLogArg(item));
    }

    // CRITICAL FIX: Preserve Error objects and essential error properties
    if (obj instanceof Error) {
      return {
        name: obj.name,
        message: obj.message,
        stack: obj.stack,
        // Preserve any additional error properties
        ...(obj as any),
        // Still sanitize any token properties that might be in the error
        ...(obj.hasOwnProperty('token') ? { token: '[JWT_TOKEN_SANITIZED]' } : {}),
        ...(obj.hasOwnProperty('authToken') ? { authToken: '[JWT_TOKEN_SANITIZED]' } : {})
      };
    }

    // CRITICAL FIX: Handle plain objects that look like errors
    const isErrorLike = obj.message || obj.stack || obj.name || obj.error;
    
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // CRITICAL FIX: Always preserve essential error properties
      if (isErrorLike && (key === 'message' || key === 'stack' || key === 'name' || key === 'status' || key === 'code' || key === 'error')) {
        sanitized[key] = value; // Preserve error info as-is
      }
      // SECURITY: Remove sensitive JWT properties
      else if (this.isSensitiveProperty(key)) {
        if (key === 'tokenStart') {
          sanitized[key] = '[SANITIZED]';
        } else if (key === 'token' || key === 'authToken') {
          sanitized[key] = value ? '[JWT_TOKEN_PRESENT]' : '[NO_TOKEN]';
        } else {
          sanitized[key] = this.sanitizeLogArg(value);
        }
      } else {
        sanitized[key] = this.sanitizeLogArg(value);
      }
    }

    return sanitized;
  }

  /**
   * SECURITY: Check if property contains sensitive JWT data
   */
  private static isSensitiveProperty(key: string): boolean {
    const sensitiveKeys = [
      'token',
      'authToken',
      'jwt',
      'bearer',
      'authorization',
      'tokenStart',
      'tokenEnd',
      'tokenContent'
    ];

    return sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    );
  }

  /**
   * SECURITY: Create safe auth logging object
   */
  static createSafeAuthLog(token: string | null, context: string = 'AUTH'): object {
    const sanitized = this.sanitizeToken(token);
    
    return {
      context,
      hasValidToken: sanitized.hasToken && sanitized.isValidFormat,
      tokenPresent: sanitized.hasToken,
      timestamp: new Date().toISOString()
      // SECURITY: Never include actual token data
    };
  }
}

// Export the static method as a named export for convenience
export const installJWTSanitizer = JWTSanitizer.installJWTSanitizer.bind(JWTSanitizer);