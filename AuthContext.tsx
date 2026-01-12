import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { setAuthErrorHandler, clearAuthErrorHandler } from '../lib/queryClient';

/**
 * HTTPONLY COOKIE AUTH HELPERS
 * Pure cookie-based authentication - no localStorage token storage
 */

// REMOVED: All localStorage token logic - using httpOnly cookies exclusively
// Authentication is now handled server-side via /api/auth/me endpoint

const safeClearAuthData = (): void => {
  // Clear only UI state data, not authentication tokens (handled by logout API)
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('guestMode');
  } catch (error) {
    console.warn('⚠️ AUTH: localStorage cleanup failed (non-critical):', error);
  }
};

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  subscriptionTier: string;
  masteryKeys: number;
  grainBalance: number;
  householdId?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestMode: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  hasInitialized: boolean;
  error: string | null;
  showAuthModal: boolean;
  authPromptReason: string | null;
  lastValidationTime: number | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: (reason?: string) => void;
  clearError: () => void;
  enableGuestMode: () => void;
  promptLogin: (reason?: string) => Promise<boolean>;
  exitGuestMode: () => void;
  showAuthenticationModal: (reason?: string) => void;
  hideAuthenticationModal: () => void;
  refreshAuth: () => Promise<boolean>;
  validateToken: () => Promise<boolean>;
  getStoredToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 🪝 HOOK ORDER DEBUGGING
  const hookCalls = useRef<string[]>([]);
  const renderCount = useRef(0);
  renderCount.current++;

  // Initialize toast for user feedback
  const { toast } = useToast();
  hookCalls.current.push('useToast');

  // ENHANCED AUTHENTICATION STATE with initialization tracking
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isGuest: false,
    guestMode: false,
    isLoading: false,
    isInitializing: true, // Track initialization state
    hasInitialized: false,
    error: null,
    showAuthModal: false,
    authPromptReason: null,
    lastValidationTime: null,
  });
  hookCalls.current.push('useState-authState');

  // MUTEX PROTECTION - Prevent concurrent initialization
  const initializationMutex = useRef(false);
  const validateTokenMutex = useRef(false);

  // SINGLE INITIALIZATION PROMISE - Prevent race conditions
  const initializationPromise = useRef<Promise<void> | null>(null);

  // 🛡️ BULLETPROOF ERROR BOUNDARY - Prevent ANY crashes from breaking UI
  const [hasInitError, setHasInitError] = useState(false);
  hookCalls.current.push('useState-hasInitError');

  useEffect(() => {
    console.log('🪝 AUTH CONTEXT - Render #', renderCount.current, 'Hook Order:', hookCalls.current);
    hookCalls.current = [];
  });

  // ENHANCED ERROR HANDLING with user feedback (with defensive programming)
  const handleAuthError = useCallback((error: any, context: string) => {
    // FIX: Proper error serialization to prevent empty {} logging
    const errorDetails = {
      message: error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error'),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
      status: error?.status || undefined,
      context,
      timestamp: new Date().toISOString()
    };
    console.error(`🔐 AUTH ERROR (${context}):`, errorDetails);

    // Clear invalid tokens on auth errors
    if (error && (error.status === 401 || error.status === 403)) {
      safeClearAuthData();
      setAuthState(prev => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        isGuest: false,
        error: 'Session expired'
      }));
    }

    // Only show toast if toast is available and context is not initialization
    if (toast && context !== 'initialization') {
      toast({
        title: "Authentication Error",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // CRITICAL FIX: Enhanced global authentication trigger functions - FIXED RENDER LOOP
  useEffect(() => {
    // Install enhanced global authentication trigger function
    (window as any).triggerWimpAuth = (action: string, contextKey: string, message: string) => {
      console.log('🌐 GLOBAL AUTH TRIGGER (ENHANCED):', { action, contextKey, message, currentAuth: authState.isAuthenticated });

      // FIX: Only call showAuthenticationModal, don't duplicate setAuthState
      showAuthenticationModal(message);
      return true;
    };

    // Enhanced window.wimpAuth for comprehensive access
    (window as any).wimpAuth = {
      showAuthenticationModal,
      hideAuthenticationModal,
      isAuthenticated: authState.isAuthenticated,
      isGuest: authState.isGuest,
      guestMode: authState.guestMode,
      showAuthModal: authState.showAuthModal,
      // ENHANCED: Add direct state setters for emergency authentication fixes
      forceShowAuthModal: (reason?: string) => {
        console.log('🔐 FORCE AUTH MODAL:', reason);
        showAuthenticationModal(reason);
      },
      getCurrentAuthState: () => ({
        isAuthenticated: authState.isAuthenticated,
        isGuest: authState.isGuest,
        showAuthModal: authState.showAuthModal,
        hasToken: false // Always false with httpOnly cookies - server validates
      })
    };

    console.log('🔐 AUTH: Enhanced global authentication functions installed with state:', {
      isAuthenticated: authState.isAuthenticated,
      isGuest: authState.isGuest,
      guestMode: authState.guestMode
    });
  // CRITICAL: Removed authState.showAuthModal from deps to prevent render loop during login
  }, [authState.isAuthenticated, authState.isGuest, authState.guestMode]);

  // CROSS-TAB SYNCHRONIZATION - Sync authentication across browser tabs (httpOnly cookies)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle UI state changes (not tokens - those are in httpOnly cookies)
      if (e.key === 'isAuthenticated' && e.storageArea === localStorage) {
        console.log('🔄 AUTH: Cross-tab authentication state change detected', {
          newValue: e.newValue,
          oldValue: e.oldValue
        });

        if (e.newValue === 'true') {
          // Login detected in another tab - refresh auth state from server
          console.log('🔄 AUTH: Login detected in another tab, refreshing from server');
          // Use validateToken directly since refreshAuth may not be available yet
          validateToken();
        } else if (e.newValue === null || e.newValue === 'false') {
          // Logout detected in another tab
          console.log('🔄 AUTH: Logout detected from another tab');
          setAuthState(prev => ({
            ...prev,
            user: null,
            token: null,
            isAuthenticated: false,
            isGuest: false,
            guestMode: false,
            error: null,
            lastValidationTime: null
          }));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // MUTEX-PROTECTED INITIALIZATION - Prevent concurrent initialization
  useEffect(() => {
    let isMounted = true;

    const initializeAsync = async () => {
      // RACE CONDITION FIX: Use single initialization promise
      if (initializationPromise.current) {
        console.log('🔐 AUTH: Waiting for existing initialization to complete');
        try {
          await initializationPromise.current;
        } catch (error) {
          console.log('🔐 AUTH: Previous initialization failed, continuing with new attempt');
        }
        return;
      }

      // Check mutex to prevent concurrent initialization
      if (initializationMutex.current) {
        console.log('🔐 AUTH: Initialization already in progress, skipping');
        return;
      }

      initializationMutex.current = true;

      // Create single initialization promise
      initializationPromise.current = (async () => {
        try {
          // Small delay to ensure React has mounted first
          await new Promise(resolve => setTimeout(resolve, 100));

          if (!isMounted) return; // Prevent double execution

          console.log('🔐 AUTH: Starting single-promise auth initialization...');
          await safeInitializeAuthState();
        } catch (error) {
          if (isMounted) {
            console.error('❌ AUTH: Single-promise initialization failed');
            setHasInitError(true);
            handleAuthError(error, 'initialization');
          }
          throw error; // Re-throw for promise rejection
        } finally {
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              isInitializing: false,
              hasInitialized: true
            }));
          }
        }
      })();

      try {
        await initializationPromise.current;
      } catch (error) {
        // Error already handled above, just ensure cleanup
      } finally {
        initializationMutex.current = false;
        initializationPromise.current = null;
      }
    };

    initializeAsync();

    // CRITICAL: Cleanup to prevent double execution
    return () => {
      isMounted = false;
      initializationMutex.current = false;
    };
  }, [handleAuthError]);

  // Define logout function with stable reference
  const logoutRef = useRef<((reason?: string) => void) | null>(null);

  const logout = useCallback((reason?: string) => {
    console.log('🔐 AUTH: Enhanced logout user with reason:', reason || 'manual');

    safeClearAuthData();

    setAuthState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,
      guestMode: false,
      isLoading: false,
      error: null,
      showAuthModal: false,
      authPromptReason: null,
      lastValidationTime: null
    }));

    if (reason !== 'session-expired') {
      toast({
        title: "Logged Out",
        description: reason || "You have been successfully logged out.",
        variant: "default",
      });
    }
  }, [toast]);

  // Store logout in ref for stable access
  logoutRef.current = logout;

  // ✅ FIXED: Use ref to ensure logout is always available
  useEffect(() => {
    console.log('🔐 AUTH: Registering global 401 handler for QueryClient queries');

    // Register AuthContext as the global 401 error handler
    setAuthErrorHandler(({ status, endpoint }) => {
      console.log('🔐 AUTH: Global 401 handler triggered', { status, endpoint });

      // Show user-friendly error message
      if (toast) {
        toast({
          title: 'Session Expired',
          description: 'Please log in again to continue',
          variant: 'destructive',
          duration: 5000
        });
      }

      // ✅ FIXED: Use ref to ensure logout is always defined
      console.log('🔐 AUTH: Triggering automatic logout due to global 401');
      logoutRef.current?.('Session expired');
    });

    // Cleanup: Clear the global handler when AuthContext unmounts
    return () => {
      console.log('🔐 AUTH: Clearing global 401 handler');
      clearAuthErrorHandler();
    };
  }, [toast]);

  const safeInitializeAuthState = async () => {
    console.log('🔐 AUTH: Starting streamlined authentication initialization...');

    try {
      let guestModeEnabled: string | null = null;

      // Check localStorage for guest mode setting only (keep this for UX)
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          guestModeEnabled = localStorage.getItem('guestMode');
        }
      } catch (storageError) {
        console.warn('⚠️ AUTH: localStorage access failed, continuing without guest mode', storageError);
        guestModeEnabled = null;
      }

      // 🔐 SECURITY: Token storage disabled on frontend - using httpOnly cookies only
      console.warn('🔐 SECURITY: Token storage disabled on frontend - using httpOnly cookies only');

      console.log('🔐 AUTH: Stored credentials check:', {
        hasToken: false,
        tokenLength: 0,
        hasUserData: false,
        userDataLength: 0,
        guestModeEnabled: guestModeEnabled === 'true'
      });

      // Check for guest mode first
      if (guestModeEnabled === 'true') {
        console.log('🔐 GUEST: Guest mode enabled, setting enhanced guest state');
        setAuthState(prev => ({
          ...prev,
          user: null,
          token: null,
          isAuthenticated: false,
          isGuest: true,
          guestMode: true,
          isLoading: false,
          error: null,
          showAuthModal: false,
          authPromptReason: null,
          lastValidationTime: null
        }));
        return;
      }

      // OPTIMIZATION: Only check backend if there's indication of a session
      // Check for authToken cookie OR stored user data
      const hasAuthCookie = document.cookie.split(';').some(c => c.trim().startsWith('authToken='));
      const hasStoredUser = localStorage.getItem('user') !== null;

      if (!hasAuthCookie && !hasStoredUser) {
        console.log('🔐 AUTH: No session indicators found, skipping backend check');
        setAuthState(prev => ({
          ...prev,
          user: null,
          token: null,
          isAuthenticated: false,
          isGuest: false,
          guestMode: false,
          isLoading: false,
          error: null,
          showAuthModal: false,
          authPromptReason: null,
          lastValidationTime: null
        }));
        return;
      }

      // Only check backend auth status if we have session indicators
      try {
        console.log('🔐 AUTH: Session indicators found, validating with backend');
        const response = await Promise.race([
          fetch('/api/auth/me', {
            credentials: 'include'
          }),
          // Production timeout - give slow networks time to respond
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Token validation timeout')), 15000)
          )
        ]);

        if (response.ok) {
          const freshUserData = await response.json();
          // Update stored user data with fresh data from server
          try {
            localStorage.setItem('user', JSON.stringify(freshUserData));
          } catch (error) {
            console.warn('⚠️ AUTH: localStorage write failed (non-critical):', error);
          }

          console.log('✅ AUTH: httpOnly cookie authentication successful:', freshUserData.email);

          setAuthState(prev => ({
            ...prev,
            user: freshUserData,
            token: null, // No token needed with httpOnly cookies
            isAuthenticated: true,
            isGuest: false,
            guestMode: false,
            isLoading: false,
            error: null,
            showAuthModal: false,
            authPromptReason: null,
            lastValidationTime: Date.now()
          }));
          return;
        } else {
          console.log('❌ AUTH: httpOnly cookie validation failed (status:', response.status, ')');
          console.log('🔐 AUTH: Setting unauthenticated state');
        }
      } catch (error) {
        const isTimeout = error && (error as any).message === 'Token validation timeout';
        if (isTimeout) {
          console.warn('🔐 AUTH: Backend timeout during initialization - setting unauthenticated state');
        } else {
          console.log('❌ AUTH: Backend auth check error during initialization:', error);
        }
      }

      // Set enhanced unauthenticated state
      console.log('🔐 AUTH: Setting enhanced unauthenticated state');
      setAuthState(prev => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        isGuest: false,
        guestMode: false,
        isLoading: false,
        error: null,
        showAuthModal: false,
        authPromptReason: null,
        lastValidationTime: null
      }));
    } catch (error) {
      // FIX: Use proper error serialization instead of direct logging
      handleAuthError(error, 'initialization-critical');
      // Set safe state after proper error handling
      setAuthState(prev => ({
        ...prev,
        user: null,
        token: null,
        isAuthenticated: false,
        isGuest: false,
        guestMode: false,
        isLoading: false,
        error: null, // Clear error to prevent UI issues
        showAuthModal: false,
        authPromptReason: null,
        lastValidationTime: null
      }));
    }
  };

  // ENHANCED TOKEN VALIDATION with mutex protection
  const validateToken = useCallback(async (): Promise<boolean> => {
    // Check mutex to prevent concurrent validation
    if (validateTokenMutex.current) {
      console.log('🔐 AUTH: Token validation already in progress');
      return false;
    }

    validateTokenMutex.current = true;

    try {
      // With httpOnly cookies, no token needed in headers - cookies are sent automatically
      console.log('🔐 AUTH: Validating authentication with /api/auth/me');
      const response = await Promise.race([
        fetch('/api/auth/me', {
          credentials: 'include' // Automatically includes httpOnly cookies
        }),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Token validation timeout')), 15000)
        )
      ]);

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ AUTH: Token validation successful');

        // Update authentication state with validated data
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.warn('⚠️ AUTH: localStorage write failed (non-critical):', error);
        }
        setAuthState(prev => ({
          ...prev,
          user: userData,
          token: null, // No token needed with httpOnly cookies
          isAuthenticated: true,
          isGuest: false,
          guestMode: false,
          error: null,
          lastValidationTime: Date.now()
        }));

        return true;
      } else {
        console.log('❌ AUTH: Token validation failed (status:', response.status, ')');
        handleAuthError({ status: response.status }, 'token-validation');
        return false;
      }
    } catch (error) {
      const isTimeout = error && (error as any).message === 'Token validation timeout';
      if (isTimeout) {
        console.warn('🔐 AUTH: Token validation timeout - keeping existing authentication state');
        // Don't clear authentication state on timeout - just return false
        return false;
      } else {
        console.error('❌ AUTH: Token validation error (not timeout):', error);
        handleAuthError(error, 'token-validation');
        return false;
      }
    } finally {
      validateTokenMutex.current = false;
    }
  }, [handleAuthError]);

  // ENHANCED REFRESH AUTH with proper error handling
  const refreshAuth = useCallback(async (): Promise<boolean> => {
    console.log('🔐 AUTH: Refreshing authentication state');
    return await validateToken();
  }, [validateToken]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 🔐 SECURITY: Guard JWT logging to dev mode only
    if ((import.meta as any).env?.DEV) {
      console.log('🔐 AUTH: Enhanced login attempt for:', email, 'password length:', password?.length || 0);
    }

    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      console.log('🔐 AUTH: Making unified API request to /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      console.log('🔐 AUTH: Unified request completed, response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Login failed');
        handleAuthError({ ...error, status: response.status }, 'login');
        throw error;
      }

      const data = await response.json();

      if (data.user) {
        // Store user data only for UI state - authentication handled via httpOnly cookies
        try {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('isAuthenticated', 'true');
        } catch (error) {
          console.warn('⚠️ AUTH: localStorage write failed (non-critical):', error);
        }

        console.log('✅ AUTH: Enhanced login successful with httpOnly cookies for:', data.user.email);

        setAuthState(prev => ({
          ...prev,
          user: data.user,
          token: null, // No token needed with httpOnly cookies
          isAuthenticated: true,
          isGuest: false,
          guestMode: false,
          isLoading: false,
          error: null,
          showAuthModal: false,
          authPromptReason: null,
          lastValidationTime: Date.now()
        }));

        // Success toast notification
        toast({
          title: "Login Successful",
          description: `Welcome back, ${data.user.name}!`,
          variant: "default",
        });

        console.log('🔐 AUTH RESULT:', { success: true });

        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('❌ AUTH: Enhanced login failed:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Error is already handled by handleAuthError above
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🔐 AUTH: Enhanced registration attempt for:', email);

    setAuthState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || 'Registration failed');
        handleAuthError({ ...error, status: response.status }, 'registration');
        throw error;
      }

      const data = await response.json();

      if (data.user) {
        // Store user data only for UI state - authentication managed via httpOnly cookies
        try {
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('isAuthenticated', 'true');
        } catch (error) {
          console.warn('⚠️ AUTH: localStorage write failed (non-critical):', error);
        }

        console.log('✅ AUTH: Enhanced registration successful with httpOnly cookies for:', data.user.email);

        setAuthState(prev => ({
          ...prev,
          user: data.user,
          token: null, // No token needed with httpOnly cookies
          isAuthenticated: true,
          isGuest: false,
          guestMode: false,
          isLoading: false,
          error: null,
          showAuthModal: false,
          authPromptReason: null,
          lastValidationTime: Date.now()
        }));

        // Success toast notification with trial info
        toast({
          title: "Welcome to WIMP! 🎉",
          description: `${data.user.name}, you have 3 days of premium access! After trial, continue for only R30/month.`,
          variant: "default",
          duration: 8000,
        });

        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      console.error('❌ AUTH: Enhanced registration failed:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setAuthState(prev => ({
      ...prev,
      error: null,
    }));
  };

  // Guest Mode Functions
  const enableGuestMode = useCallback(() => {
    console.log('🔐 GUEST: Enabling enhanced guest mode');

    try {
      localStorage.setItem('guestMode', 'true');
      localStorage.setItem('guestSessionStart', new Date().toISOString());
    } catch (error) {
      console.warn('⚠️ GUEST: Failed to store guest session in localStorage', error);
      handleAuthError(error, 'guest-mode-enable');
    }

    setAuthState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: true,
      guestMode: true,
      isLoading: false,
      error: null,
      showAuthModal: false,
      authPromptReason: null,
      lastValidationTime: null
    }));

    // Guest mode feedback
    toast({
      title: "Guest Mode Enabled",
      description: "You're browsing as a guest. Sign up to save your preferences!",
      variant: "default",
    });
  }, [handleAuthError, toast]);

  const promptLogin = async (reason?: string): Promise<boolean> => {
    console.log('🔐 GUEST: Prompting login with reason:', reason);

    // Show authentication modal with reason
    setAuthState(prev => ({
      ...prev,
      showAuthModal: true,
      authPromptReason: reason || 'Please log in to continue'
    }));

    return new Promise((resolve) => {
      // This will be resolved when modal closes with result
      // For now, return false to indicate no immediate login
      resolve(false);
    });
  };

  // CRITICAL FIX: useCallback to prevent stale closures in global auth functions
  const showAuthenticationModal = useCallback((reason?: string) => {
    console.log('🔐 AUTH: Showing authentication modal with reason:', reason);

    setAuthState(prev => {
      const newState = {
        ...prev,
        showAuthModal: true,
        authPromptReason: reason || null
      };

      console.log('🔐 AUTH: Setting showAuthModal to true, new state:', {
        showAuthModal: newState.showAuthModal,
        authPromptReason: newState.authPromptReason
      });

      return newState;
    });

    // CRITICAL FIX: Force DOM update by dispatching custom event
    setTimeout(() => {
      const modalEvent = new CustomEvent('authModalTriggered', {
        detail: { reason: reason || null, timestamp: Date.now() }
      });
      document.dispatchEvent(modalEvent);
      console.log('🔐 AUTH: Dispatched authModalTriggered event');
    }, 100);
  }, []);

  const hideAuthenticationModal = useCallback(() => {
    console.log('🔐 AUTH: Hiding authentication modal');
    setAuthState(prev => ({
      ...prev,
      showAuthModal: false,
      authPromptReason: null
    }));
  }, []);

  const exitGuestMode = useCallback(() => {
    console.log('🔐 GUEST: Exiting enhanced guest mode');

    try {
      localStorage.removeItem('guestMode');
      localStorage.removeItem('guestSessionStart');
    } catch (error) {
      console.warn('⚠️ GUEST: Failed to clear guest session from localStorage', error);
      handleAuthError(error, 'guest-mode-exit');
    }

    setAuthState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false,
      isGuest: false,
      guestMode: false,
      isLoading: false,
      error: null,
      showAuthModal: false,
      authPromptReason: null,
      lastValidationTime: null
    }));
  }, [handleAuthError]);

  // PRODUCTION-READY COMPLETE CONTEXT VALUE with all required methods and state
  const contextValue: AuthContextType = {
    // Authentication state - All required fields from AuthState interface
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    isGuest: authState.isGuest,
    guestMode: authState.guestMode,
    isLoading: authState.isLoading,
    isInitializing: authState.isInitializing,
    hasInitialized: authState.hasInitialized,
    error: authState.error,
    showAuthModal: authState.showAuthModal,
    authPromptReason: authState.authPromptReason,
    lastValidationTime: authState.lastValidationTime,

    // Core authentication methods - Required by AuthContextType interface
    login,
    register,
    logout,
    clearError,

    // Enhanced authentication methods - Additional security features
    validateToken,
    refreshAuth,

    // Guest mode methods - Guest session management
    enableGuestMode,
    promptLogin,
    exitGuestMode,

    // UI methods - Modal and authentication UX
    showAuthenticationModal,
    hideAuthenticationModal,

    // Utility methods - HttpOnly cookie compatible (no direct token access)
    getStoredToken: () => null, // Always null with httpOnly cookies for security
  };

  // 🛡️ BULLETPROOF UI RENDER - Show safe fallback if initialization fails
  if (hasInitError) {
    return (
      <AuthContext.Provider value={contextValue}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
            <p className="text-gray-600">Please refresh the page to try again.</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // PRODUCTION-READY PROVIDER RETURN with proper structure
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};