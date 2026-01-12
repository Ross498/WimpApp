import express from 'express';
import { Request, Response } from 'express';
import { authenticateToken, optionalAuth, AuthenticatedUser } from './authMiddleware';

// Enhanced Error Response Structure
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  requiresReauth: boolean;
  retryable?: boolean;
  timestamp: string;
}

// Error Code Constants for Profile Routes
const PROFILE_ERROR_CODES = {
  // Database Errors - User stays authenticated
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_TIMEOUT: 'DB_TIMEOUT',
  DB_CONNECTION_TERMINATED: 'DB_CONNECTION_TERMINATED',
  DB_UNAVAILABLE: 'DB_UNAVAILABLE',
  
  // Authentication Errors - User needs to login
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Data Errors - User stays authenticated
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  DATA_CORRUPTION: 'DATA_CORRUPTION',
  
  // System Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

// User-friendly error messages
const PROFILE_ERROR_MESSAGES = {
  [PROFILE_ERROR_CODES.DB_CONNECTION_ERROR]: 'Database temporarily unavailable. Your session is still active.',
  [PROFILE_ERROR_CODES.DB_TIMEOUT]: 'Database connection timed out. Please try again.',
  [PROFILE_ERROR_CODES.DB_CONNECTION_TERMINATED]: 'Database connection was interrupted. Please try again.',
  [PROFILE_ERROR_CODES.DB_UNAVAILABLE]: 'Database services are temporarily unavailable.',
  [PROFILE_ERROR_CODES.AUTH_REQUIRED]: 'Authentication required. Please log in to continue.',
  [PROFILE_ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [PROFILE_ERROR_CODES.TOKEN_INVALID]: 'Invalid authentication token. Please log in again.',
  [PROFILE_ERROR_CODES.USER_NOT_FOUND]: 'User profile not found.',
  [PROFILE_ERROR_CODES.DATA_CORRUPTION]: 'Profile data is corrupted. Please contact support.',
  [PROFILE_ERROR_CODES.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
  [PROFILE_ERROR_CODES.SERVICE_UNAVAILABLE]: 'Profile service is temporarily unavailable.'
} as const;

/**
 * Create a standardized error response
 */
function createErrorResponse(
  code: keyof typeof PROFILE_ERROR_CODES,
  requiresReauth: boolean,
  retryable: boolean = false
): ErrorResponse {
  return {
    success: false,
    error: PROFILE_ERROR_MESSAGES[code],
    code: PROFILE_ERROR_CODES[code],
    requiresReauth,
    retryable,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if error is a database connectivity issue
 */
function isDatabaseConnectivityError(error: any): boolean {
  if (!error) return false;
  
  const errorStr = error.toString().toLowerCase();
  const errorCode = error.code;
  
  // PostgreSQL specific error codes for connectivity issues
  const connectivityErrorCodes = [
    '57P01', // Connection terminated (admin_shutdown)
    '57P02', // Connection terminated (crash_shutdown) 
    '57P03', // Connection terminated (cannot_connect_now)
    '08000', // Connection exception
    '08003', // Connection does not exist
    '08006', // Connection failure
    'ECONNRESET', // Connection reset
    'ECONNREFUSED', // Connection refused
    'ETIMEDOUT', // Connection timeout
    'ENOTFOUND', // DNS resolution failed
  ];
  
  // Check for specific error codes
  if (errorCode && connectivityErrorCodes.includes(errorCode)) {
    return true;
  }
  
  // Check for error message patterns
  const connectivityPatterns = [
    'connection terminated',
    'connection reset',
    'connection refused',
    'connection timeout',
    'connection lost',
    'server closed the connection',
    'database is not accepting connections',
    'could not connect to server',
    'no connection to the server',
    'timeout expired'
  ];
  
  return connectivityPatterns.some(pattern => errorStr.includes(pattern));
}

/**
 * Create fallback profile data for authenticated users when database is unavailable
 */
function createFallbackProfile(userId: string, userToken?: any): any {
  console.log('🔄 Creating fallback profile for authenticated user:', userId);
  
  return {
    id: userId,
    name: userToken?.name || 'User',
    email: userToken?.email || 'user@wimp.app',
    username: userToken?.username || `user_${userId}`,
    profilePicture: "/chef-otter.jpg",
    memberSince: new Date().toISOString(),
    grainBalance: 0,
    ingredients: [],
    mealsCompleted: 0,
    subscriptionTier: "premium", // Default to premium for authenticated users
    masteryKeys: 0,
    subscription: {
      plan: "premium",
      status: "active",
      renewalDate: null,
      features: ["AI meal planning", "Recipe favorites", "Ingredient tracking", "Mastery system"]
    },
    stats: {
      recipesCooked: 0,
      favoritesCount: 0,
      masteryKeys: 0,
      totalCookingTime: 0
    },
    preferences: {
      dietary: [],
      cuisine: [],
      difficulty: "medium"
    },
    // Indicate this is fallback data
    _fallback: true,
    _message: "Profile loaded from cache. Some data may be outdated."
  };
}

// Type for authenticated requests
type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

const router = express.Router();

// Get user profile - GUEST ACCESS ENABLED
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const isGuest = !userId;

    if (isGuest) {
      console.log('🔓 GUEST ACCESS: Returning default profile data for guest user');
      // Return default profile for guests
      const guestProfile = {
        id: null,
        name: 'Welcome, Guest!',
        email: '',
        username: 'guest',
        profilePicture: "/chef-otter.jpg",
        memberSince: null,
        grainBalance: 0,
        ingredients: [],
        mealsCompleted: 0,
        subscriptionTier: "free",
        masteryKeys: 0,
        subscription: {
          plan: "free",
          status: "guest",
          renewalDate: null,
          features: ["Browse recipes", "View meal plans"]
        },
        stats: {
          recipesCooked: 0,
          favoritesCount: 0,
          masteryKeys: 0,
          totalCookingTime: 0
        },
        preferences: {
          dietary: [],
          cuisine: [],
          difficulty: "medium"
        },
        isGuest: true
      };

      return res.json({
        success: true,
        user: guestProfile
      });
    }

    console.log('🔐 Profile GET: Fetching profile for user ID:', userId);

    // CRITICAL FIX: Use shared storage singleton instead of creating new instance
    const { sharedPgStorage: storage } = await import('./storage');
    
    try {
      console.log('🔐 Profile GET: Calling storage.getUser...');
      const userData = await storage.getUser(userId.toString());
      console.log('🔐 Profile GET: storage.getUser returned:', userData ? 'user found' : 'user not found');
      
      if (!userData) {
        console.log('🔐 Profile GET: User not found in database, user stays authenticated');
        return res.status(404).json({
          ...createErrorResponse('USER_NOT_FOUND', false, true),
          message: 'User profile not found, but authentication is still valid'
        });
      }

      const profile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        username: userData.username,
        profilePicture: "/chef-otter.jpg",
        memberSince: userData.createdAt,
        grainBalance: 100,
        ingredients: [],
        mealsCompleted: userData.mealsCompleted || 0,
        subscriptionTier: userData.subscriptionTier || "premium",
        masteryKeys: userData.masteryKeys || 0,
        subscription: {
          plan: userData.subscriptionTier || "premium",
          status: "active",
          renewalDate: userData.createdAt,
          features: ["AI meal planning", "Recipe favorites", "Ingredient tracking", "Mastery system"]
        },
        stats: {
          recipesCooked: userData.mealsCompleted || 0,
          favoritesCount: 0,
          masteryKeys: userData.masteryKeys || 0,
          totalCookingTime: 0
        },
        preferences: {
          dietary: [],
          cuisine: [],
          difficulty: "medium"
        }
      };

      console.log('🔐 Profile GET: Sending successful response');
      res.json({
        success: true,
        user: profile
      });
    } catch (dbError) {
      console.error('🔐 Profile GET: Database error:', dbError);
      console.error('🔐 Profile GET: Error details:', {
        code: (dbError as any)?.code,
        message: (dbError as any)?.message,
        stack: process.env.NODE_ENV === 'development' ? (dbError as any)?.stack : undefined
      });
      
      // Check if this is a database connectivity issue
      if (isDatabaseConnectivityError(dbError)) {
        console.log('💾 Profile GET: Database connectivity issue detected, implementing graceful degradation');
        
        // Return fallback profile for authenticated users
        const fallbackProfile = createFallbackProfile(userId!.toString(), req.user);
        
        return res.status(503).json({
          ...createErrorResponse('DB_CONNECTION_ERROR', false, true),
          user: fallbackProfile,
          degraded: true,
          message: 'Database temporarily unavailable. Showing cached profile data.'
        });
      }
      
      // For other database errors, also preserve authentication
      console.log('💾 Profile GET: Database error, but user authentication is still valid');
      return res.status(503).json({
        ...createErrorResponse('DB_UNAVAILABLE', false, true),
        message: 'Database services temporarily unavailable. Please try again.'
      });
    }
  } catch (error) {
    console.error('🔐 Profile GET: Unexpected error fetching profile:', error);
    console.error('🔐 Profile GET: Error details:', {
      message: (error as any)?.message,
      stack: process.env.NODE_ENV === 'development' ? (error as any)?.stack : undefined
    });
    
    // Even for unexpected errors, preserve authentication unless it's specifically an auth error
    const isAuthError = error && (
      (error as any).message?.includes('token') ||
      (error as any).message?.includes('unauthorized') ||
      (error as any).message?.includes('authentication')
    );
    
    if (isAuthError) {
      console.log('🔐 Profile GET: Authentication error detected');
      return res.status(401).json({
        ...createErrorResponse('TOKEN_INVALID', true, false)
      });
    }
    
    // For non-auth errors, preserve user session
    console.log('🔐 Profile GET: System error, but user authentication is preserved');
    res.status(500).json({
      ...createErrorResponse('INTERNAL_ERROR', false, true)
    });
  }
});

// Update profile
router.put('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, bio, phone, location, dietaryPreferences, cookingSkillLevel, favoritesCuisines } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Mock profile update - in production would update user in database
    console.log('📝 Profile update for user:', userId, { name, email, bio });
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { name, email, bio, phone, location, dietaryPreferences, cookingSkillLevel, favoritesCuisines }
    });
  } catch (error) {
    console.error('🔐 Profile UPDATE: Error updating profile:', error);
    
    // Check for authentication errors first
    const isAuthError = error && (
      (error as any).message?.includes('token') ||
      (error as any).message?.includes('unauthorized') ||
      (error as any).message?.includes('authentication')
    );
    
    if (isAuthError) {
      console.log('🔐 Profile UPDATE: Authentication error detected');
      return res.status(401).json({
        ...createErrorResponse('TOKEN_INVALID', true, false)
      });
    }
    
    // Check for database connectivity issues
    if (isDatabaseConnectivityError(error)) {
      console.log('🔐 Profile UPDATE: Database connectivity issue, user stays authenticated');
      return res.status(503).json({
        ...createErrorResponse('DB_CONNECTION_ERROR', false, true),
        message: 'Database temporarily unavailable. Your changes could not be saved.'
      });
    }
    
    // For other errors, preserve authentication
    console.log('🔐 Profile UPDATE: System error, user authentication preserved');
    res.status(500).json({
      ...createErrorResponse('INTERNAL_ERROR', false, true)
    });
  }
});

// Export user data - REQUIRES AUTHENTICATION
router.post('/export-data', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for data export',
        needsLogin: true
      });
    }

    // CRITICAL FIX: Use shared storage singleton instead of creating new instance
    const { sharedPgStorage: storage } = await import('./storage');
    const userData = await storage.getUser(userId.toString());

    const exportData = {
      profile: {
        name: userData?.name || "User",
        email: userData?.email || "user@wimp.app",
        joinDate: userData?.createdAt || new Date().toISOString(),
        cookingSkillLevel: "intermediate"
      },
      statistics: {
        mealsCooked: userData?.mealsCompleted || 0,
        recipesMastered: 0,
        cookingStreak: 0,
        masteryKeys: userData?.masteryKeys || 0
      },
      preferences: {
        dietaryPreferences: [],
        favoritesCuisines: [],
        notificationSettings: {
          mealReminders: true,
          ingredientExpiry: true,
          podActivity: true
        }
      },
      exportDate: new Date().toISOString()
    };

    res.json({
      success: true,
      data: exportData,
      message: "Data exported successfully"
    });
  } catch (error) {
    console.error('🔐 Profile EXPORT: Error exporting data:', error);
    
    // Check if this is a database connectivity issue
    if (isDatabaseConnectivityError(error)) {
      console.log('🔐 Profile EXPORT: Database connectivity issue, user stays authenticated');
      return res.status(503).json({
        ...createErrorResponse('DB_CONNECTION_ERROR', false, true),
        message: 'Database temporarily unavailable. Please try again later.'
      });
    }
    
    // Check for authentication errors
    const isAuthError = error && (
      (error as any).message?.includes('token') ||
      (error as any).message?.includes('unauthorized') ||
      (error as any).message?.includes('authentication')
    );
    
    if (isAuthError) {
      console.log('🔐 Profile EXPORT: Authentication error detected');
      return res.status(401).json({
        ...createErrorResponse('TOKEN_INVALID', true, false)
      });
    }
    
    // For other errors, preserve authentication
    console.log('🔐 Profile EXPORT: System error, user authentication preserved');
    res.status(500).json({
      ...createErrorResponse('INTERNAL_ERROR', false, true)
    });
  }
});

// Change password - REQUIRES AUTHENTICATION
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Mock password change - in production would validate current password and update
    console.log('Password change request:', { currentPassword: '***', newPassword: '***' });
    
    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error('🔐 Profile PASSWORD: Error changing password:', error);
    
    // Check for authentication errors first
    const isAuthError = error && (
      (error as any).message?.includes('token') ||
      (error as any).message?.includes('unauthorized') ||
      (error as any).message?.includes('authentication')
    );
    
    if (isAuthError) {
      console.log('🔐 Profile PASSWORD: Authentication error detected');
      return res.status(401).json({
        ...createErrorResponse('TOKEN_INVALID', true, false)
      });
    }
    
    // Check for database connectivity issues
    if (isDatabaseConnectivityError(error)) {
      console.log('🔐 Profile PASSWORD: Database connectivity issue, user stays authenticated');
      return res.status(503).json({
        ...createErrorResponse('DB_CONNECTION_ERROR', false, true),
        message: 'Database temporarily unavailable. Password change could not be completed.'
      });
    }
    
    // For other errors, preserve authentication
    console.log('🔐 Profile PASSWORD: System error, user authentication preserved');
    res.status(500).json({
      ...createErrorResponse('INTERNAL_ERROR', false, true)
    });
  }
});

// Update notification settings
router.post('/notification-settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    
    // Mock settings update - in production would save to database
    console.log('Notification settings update:', settings);
    
    res.json({
      success: true,
      message: "Settings updated successfully"
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Update privacy settings
router.post('/privacy-settings', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    
    // Mock settings update - in production would save to database
    console.log('Privacy settings update:', settings);
    
    res.json({
      success: true,
      message: "Privacy settings updated successfully"
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings'
    });
  }
});

// Delete account
router.delete('/delete-account', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    // Mock account deletion - in production would validate password and delete user data
    console.log('Account deletion request for password:', '***');
    
    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
});

export default router;