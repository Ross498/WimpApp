import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);

  // Check if headers were already sent
  if (res.headersSent) {
    return next(error);
  }

  // Authentication errors - MUST come first for proper auth handling
  if (error.message.includes('token') || error.message.includes('authentication') || error.message.includes('unauthorized')) {
    console.log('🔐 AUTH ERROR HANDLER: Authentication failure detected', error.message);
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to continue.',
      code: 'AUTHENTICATION_FAILED',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Database connection errors - use 500 instead of 503 for meal progress stability
  if (error.message.includes('database') || error.message.includes('connection')) {
    console.log('💾 DATABASE ERROR HANDLER: Database issue detected', error.message);
    return res.status(500).json({
      success: false,
      message: 'Database error occurred. Please try again.',
      code: 'DATABASE_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // File upload errors
  if (error.message.includes('upload') || error.message.includes('file')) {
    return res.status(400).json({
      success: false,
      message: 'File upload failed. Please check file format and size.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // OpenAI/AI service errors - only use 503 for true service unavailability
  if (error.message.includes('OpenAI') || error.message.includes('API key')) {
    console.log('🤖 AI SERVICE ERROR HANDLER: AI service issue detected', error.message);
    // For missing API keys, return 500 (configuration issue)
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact support.',
        code: 'AI_CONFIG_ERROR',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    // For actual OpenAI service issues, return 503
    return res.status(503).json({
      success: false,
      message: 'AI services temporarily unavailable. Please try again later.',
      code: 'AI_SERVICE_UNAVAILABLE',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Validation errors
  if (error.message.includes('validation') || error.message.includes('required')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data. Please check your input and try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Default server error
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * 404 handler for unmatched API routes ONLY
 */
export const notFoundHandler = (req: Request, res: Response) => {
  // Only handle API routes - let other routes pass through
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`,
      availableEndpoints: [
        'GET /api/ingredients',
        'POST /api/ingredients',
        'POST /api/unified-scan/process',
        'GET /api/custom-recipes',
        'GET /api/mastery-ingredients',
        'GET /health'
      ]
    });
  } else {
    // For non-API routes, pass to next handler (don't interfere with PWA routes)
    res.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>Page Not Found</title></head>
      <body style="font-family:Arial;text-align:center;padding:2rem;">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/kitchen" style="color:#1e293b;">Go to Kitchen App</a> | 
        <a href="/" style="color:#1e293b;">Go to Home</a>
      </body></html>
    `);
  }
};

/**
 * Async error wrapper to catch async errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * User-friendly error messages for common issues
 */
export const USER_ERROR_MESSAGES = {
  SCAN_FAILED: 'Unable to scan the image. Please ensure the image is clear and try again.',
  SCAN_NO_ITEMS: 'No grocery items detected in the image. Please try a different image or add items manually.',
  SCAN_LOW_CONFIDENCE: 'Image quality is low. For better results, ensure good lighting and clear focus.',
  AUTH_REQUIRED: 'Please log in to access this feature.',
  INVALID_IMAGE: 'Invalid image format. Please upload a JPG, PNG, or WEBP image.',
  FILE_TOO_LARGE: 'Image file is too large. Please choose a smaller image (max 10MB).',
  MISSING_OPENAI_KEY: 'AI features are not configured. Please contact support.',
  DATABASE_ERROR: 'Unable to save data. Please try again.',
  NETWORK_ERROR: 'Connection issue. Please check your internet and try again.'
};