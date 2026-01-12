import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/components/ui/toast';
// Import apiRequest for centralized error handling with requiresReauth support
import { apiRequest } from '@/lib/queryClient';
// Removed AccessibilityContext import to fix provider error
import { useAuth } from '@/contexts/AuthContext';
import { useAuthTrigger } from '@/utils/authTriggers';
import { ArrowLeft, Star, Users } from 'lucide-react';
import { notificationService } from '@/utils/notificationService';
// import { getCurrentChef, type WeeklyChef } from '../utils/chefUtils';

// Loading and Error Components
const LoadingState = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading profile...</p>
    </div>
  </div>
);

const ErrorFallback = ({ retry }: { retry: () => void }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center p-6">
      <div className="text-navy-600 mb-4">
        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Profile</h3>
      <p className="text-gray-600 mb-4">Something went wrong while loading your profile.</p>
      <button 
        onClick={retry}
        className="px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Custom icons
const LogOut = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const Camera = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);


const Bell = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const Download = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const Crown = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 6l1.5 7.5L12 9l4.5 4.5L18 6"/>
    <path d="M6 6H2l2 4"/>
    <path d="M18 6h4l-2 4"/>
  </svg>
);

const HelpCircle = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <circle cx="12" cy="17" r="1"/>
  </svg>
);

const MessageSquare = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);


const Eye = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const Lock = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <circle cx="12" cy="16" r="1"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);






const ProfileScreen = () => {
  // 1. ALL HOOKS DECLARED FIRST (NO CONDITIONS) - CRITICAL FOR REACT RULES OF HOOKS
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Removed accessibility settings dependency to fix provider error
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UNIFIED AUTH - Single source of truth
  const { user: authUser, isAuthenticated, isLoading: authLoading, logout, showAuthenticationModal } = useAuth();
  const { requireAuth } = useAuthTrigger();

  // 2. ALL STATE HOOKS - DECLARED UNCONDITIONALLY
  const [isEditing, setIsEditing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Form state - initialized with defaults
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    bio: '',
    location: '',
    dietaryPreferences: [] as string[],
    cookingSkillLevel: 'intermediate',
    favoritesCuisines: [] as string[]
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    category: 'general',
    message: '',
    improvementSuggestions: '',
    features: [] as string[]
  });

  const [notificationSettings, setNotificationSettings] = useState({
    mealReminders: true,
    ingredientExpiry: true,
    podActivity: true,
    challengeUpdates: true,
    weeklyReports: true,
    premiumOffers: false,
    marketingEmails: false
  });


  // 3. QUERY HOOKS - ENHANCED ERROR HANDLING with requiresReauth support
  const { data: profileData, isLoading: profileLoading, error, refetch } = useQuery({
    queryKey: ['/api/profile', isAuthenticated], // Include isAuthenticated for seamless transitions
    // Use centralized apiRequest for enhanced error handling with requiresReauth support
    // No custom queryFn needed - default queryFn uses apiRequest with enhanced structured error handling
    enabled: true, // Always enabled for guest access
    retry: (failureCount, error: any) => {
      // Enhanced retry logic: don't retry only when requiresReauth is true
      if (error?.requiresReauth === true || error?.message?.includes('Authentication required')) {
        console.log('🔓 PROFILE: Not retrying authentication error', {
          requiresReauth: error?.requiresReauth,
          isAuthenticated,
          failureCount
        });
        return false;
      }
      
      // Retry database errors and other retryable errors for better UX
      if (error?.retryable === true || error?.isDatabaseError) {
        console.log('🔄 PROFILE: Retrying retryable/database error', {
          retryable: error?.retryable,
          isDatabaseError: error?.isDatabaseError,
          failureCount
        });
        return failureCount < 2;
      }
      
      // Allow one retry for other errors
      return failureCount < 1;
    },
    staleTime: 30000
  });

  // ENHANCED ERROR HANDLING with different messages for different error types
  useEffect(() => {
    if (error) {
      console.error('Profile query error:', error);
      
      // Enhanced error messaging based on error type
      let title = "Error loading profile";
      let description = "Please try refreshing the page";
      
      if ((error as any)?.isDatabaseError || (error as any)?.code?.includes('DB_')) {
        title = "Service temporarily unavailable";
        description = "We're experiencing database connectivity issues. Please try again in a moment.";
      } else if ((error as any)?.requiresReauth === true) {
        title = "Session expired";
        description = "Please log in again to continue.";
      } else if ((error as any)?.retryable === true) {
        title = "Temporary service issue";
        description = "This appears to be a temporary issue. Please try again.";
      } else if ((error as any)?.status === 503) {
        title = "Service temporarily unavailable";
        description = "The service is temporarily down for maintenance. Please try again later.";
      }
      
      toast({
        title,
        description,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // AUTH GUARD: Redirect unauthenticated users to auth modal
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log('🔐 PROFILE: Unauthenticated access detected, showing auth modal');
      showAuthenticationModal('👤 Sign in to view and edit your profile! Access your personal settings, dietary preferences, and cooking data.');
    }
  }, [authLoading, isAuthenticated, showAuthenticationModal]);

  // 4. MUTATION HOOKS - ENHANCED with centralized error handling
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully!" });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profile', isAuthenticated] });
    },
    onError: () => {
      toast({ 
        title: "Update failed", 
        description: "Please try again",
        variant: "destructive" 
      });
    }
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload avatar');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Avatar updated!" });
      queryClient.invalidateQueries({ queryKey: ['/api/profile', isAuthenticated] });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (passwords: typeof passwordForm) => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/password/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(passwords)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Password change failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: typeof feedbackForm) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feedback)
      });
      if (!response.ok) throw new Error('Failed to submit feedback');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Feedback submitted! Thank you." });
      setShowFeedbackModal(false);
    }
  });

  const updateNotificationsMutation = useMutation({
    mutationFn: async (settings: typeof notificationSettings) => {
      const response = await fetch('/api/profile/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update notifications');
      return response.json();
    },
    onSuccess: async (_data, settings) => {
      toast({ title: "Notification settings updated!" });
      
      // If ingredient expiry notifications are enabled, request permission and start checks
      if (settings.ingredientExpiry) {
        const granted = await notificationService.requestPermission();
        if (granted) {
          notificationService.startPeriodicChecks();
          toast({ 
            title: "Expiry notifications enabled!", 
            description: "You'll be notified when ingredients are about to expire." 
          });
        } else {
          toast({ 
            title: "Permission required", 
            description: "Please enable notifications in your browser settings.",
            variant: "destructive"
          });
        }
      }
    }
  });


  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/profile/export-data', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to export data');
      const data = await response.json();

      const exportMessage = `WIMP Kitchen Companion - My Data Export

Profile Information:
• Name: ${data.data?.profile?.name || userData.name || 'Not set'}
• Email: ${data.data?.profile?.email || userData.email || 'Not set'}
• Username: ${userData.username || 'Not set'}
• Cooking Level: ${data.data?.profile?.cookingSkillLevel || 'Not set'}

Cooking Statistics:
• Meals Cooked: ${data.data?.statistics?.mealsCooked || 0}
• Recipes Mastered: ${data.data?.statistics?.recipesMastered || 0}
• Cooking Streak: ${data.data?.statistics?.cookingStreak || 0}

Exported on: ${new Date().toLocaleDateString()}

This data was exported from WIMP Kitchen Companion app.`;

      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'My WIMP Kitchen Data',
          text: exportMessage
        });
      } else {
        await navigator.clipboard.writeText(exportMessage);
        toast({ title: "Data copied to clipboard! You can now paste it anywhere." });
      }
    },
    onSuccess: () => {
      if (typeof navigator.share === 'function') {
        toast({ title: "Data shared successfully!" });
      }
    }
  });

  // 5. MINIMAL AUTHENTICATION CHECK - Use same system as other screens
  // Remove auth check useEffect - using unified auth

  // Use auth user data or profile data - CRITICAL: Use useMemo to prevent object recreation on every render
  // This prevents React Error #300 caused by changing hook dependencies
  const userData = useMemo(() => {
    return authUser || (profileData as any)?.user || profileData || {};
  }, [authUser, profileData]);

  // ALL EFFECTS MUST BE DECLARED BEFORE ANY EARLY RETURNS - CRITICAL FIX FOR REACT #310
  // Initialize form data when profile data loads
  useEffect(() => {
    if (userData && Object.keys(userData).length > 0) {
      console.log('🔍 PROFILE: Updating form data with:', userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || '',
        bio: userData.bio || '',
        location: userData.location || '',
        dietaryPreferences: userData.dietaryPreferences || [],
        cookingSkillLevel: userData.cookingSkillLevel || 'intermediate',
        favoritesCuisines: userData.favoritesCuisines || []
      });
    }
  }, [userData]);

  // GUEST ACCESS: Remove auth blocking - Allow all users to view profile screen
  // Guests will see default profile data, authenticated users see their personal data
  
  // CRITICAL FIX FOR REACT ERROR #300: Removed early returns to prevent hook count mismatch
  // During first render after sign-in, early returns would cause different hook execution
  // Convert to conditional rendering inside return block instead

  // Event handlers
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 🔐 AUTHENTICATION TRIGGER: Protect avatar upload
      if (!requireAuth('PROFILE_ACCESS', undefined, '📸 Upload your profile photo! Sign up to personalize your cooking profile with a custom avatar.')) {
        return; // Authentication required, exit early
      }
      
      uploadAvatarMutation.mutate(file);
    }
  };

  const handleProfileSave = () => {
    // 🔐 AUTHENTICATION TRIGGER: Protect profile modifications
    if (!requireAuth('PROFILE_ACCESS', undefined, '👤 Complete your profile! Sign up to save your personal information, dietary preferences, and cooking settings.')) {
      return; // Authentication required, exit early
    }
    
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ 
        title: "Passwords don't match",
        variant: "destructive" 
      });
      return;
    }
    changePasswordMutation.mutate(passwordForm);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Conditional rendering - handle loading and error states without early returns
  if (authLoading || (profileLoading && !profileData)) {
    return <LoadingState />;
  }

  if (error || (!profileData && !profileLoading)) {
    return <ErrorFallback retry={() => refetch()} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Fixed Header */}
      <div 
        className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b z-50"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="w-full max-w-full mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation('/meals')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Profile</h1>
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={20} className="text-gray-600" />
            </button>
          ) : (
            <button
              onClick={() => setLocation('/')}
              className="bg-[#22c55e] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#16a34a] transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Profile Content - Add pt-20 to account for fixed header */}
      <div className="w-full max-w-full mx-auto p-4 pt-20 space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                {userData.avatar ? (
                  <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="relative">
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-white">
                      <ellipse cx="16" cy="20" rx="10" ry="6" fill="currentColor" stroke="currentColor" strokeWidth="1"/>
                      <rect x="24" y="17" width="6" height="2" rx="1" fill="currentColor"/>
                      <ellipse cx="16" cy="18" rx="4" ry="5" fill="#FFA500" stroke="currentColor" strokeWidth="0.5"/>
                      <ellipse cx="16" cy="17" rx="2" ry="2.5" fill="#FFD700"/>
                    </svg>
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-navy-500 text-white p-2 rounded-full hover:bg-navy-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-110 border-2 border-white"
                  title="Upload Profile Photo"
                >
                  <Camera size={18} className="text-white" />
                </button>
              )}
              {!isEditing && (
                <div className="absolute -bottom-1 -right-1 bg-gray-200 text-gray-500 p-2 rounded-full border-2 border-white">
                  <Camera size={16} className="text-gray-400" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{userData.name || formData.name || 'User'}</h2>
              <p className="text-gray-500">{userData.email || formData.email || 'user@wimp.app'}</p>
              <div className="mt-2 text-sm text-gray-600">
                <span className="bg-navy-100 text-navy-800 px-2 py-1 rounded-full text-xs">
                  {formData.cookingSkillLevel}
                </span>
              </div>
            </div>
            {isAuthenticated ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900 transition-colors text-xs font-medium whitespace-nowrap"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            ) : (
              <button
                onClick={() => requireAuth('PROFILE_ACCESS', undefined, '👤 Edit your profile! Sign up to customize your cooking preferences, dietary restrictions, and personal information.')}
                className="bg-[#22c55e] text-white px-3 py-2 rounded-lg hover:bg-[#16a34a] transition-colors text-xs font-medium whitespace-nowrap"
              >
                Sign In to Edit
              </button>
            )}
          </div>

          {isEditing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={handleProfileSave}
                disabled={updateProfileMutation.isPending}
                className="w-full bg-[#22c55e] text-white py-2 rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#16a34a] to-[#22c55e] rounded-full flex items-center justify-center">
                <Crown size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Subscription</h3>
                <p className="text-sm text-gray-600">
                  Current Plan: {userData.subscriptionTier === 'premium' ? 'WIMP Premium' : 'Free Tier'}
                </p>
              </div>
              <button
                onClick={() => setTimeout(() => setLocation('/subscription'), 0)}
                className="bg-[#22c55e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#22c55e] transition-colors"
              >
                {userData.subscriptionTier === 'premium' ? 'Manage' : 'Upgrade'}
              </button>
            </div>
            {userData.subscriptionTier === 'premium' && (
              <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Active</span>
                </span>
                <span>Unlimited AI features</span>
                <span>Advanced analytics</span>
              </div>
            )}
            {userData.subscriptionTier !== 'premium' && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Upgrade to Premium</strong> for unlimited AI meal generation, image uploads, and advanced features!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Options */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            onClick={() => setLocation('/households')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Users size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">Households</span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <Lock size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">Change Password</span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">Notifications</span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <MessageSquare size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">Send Feedback</span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button
            onClick={() => {
              // 🔐 AUTHENTICATION TRIGGER: Protect data export
              if (!requireAuth('DATA_EXPORT', undefined, '📤 Export your data! Sign up to download all your recipes, meal plans, and cooking data securely.')) {
                return; // Authentication required, exit early
              }
              exportDataMutation.mutate();
            }}
            disabled={exportDataMutation.isPending}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <Download size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">
                {exportDataMutation.isPending ? 'Exporting...' : 'Export My Data'}
              </span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>
        </div>

        {/* Help & Support Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <HelpCircle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Help & Support</h3>
                <p className="text-sm text-gray-600">Get help and find answers</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setLocation('/help')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <MessageSquare size={20} className="text-gray-600" />
              <span className="text-gray-900 font-medium">FAQ & Help Center</span>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          <button
            onClick={() => window.location.href = 'mailto:ross@wimp.co.za?subject=WIMP Kitchen Companion Support'}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 rounded-full bg-navy-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">@</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-gray-900 font-medium block">Email Support</span>
                <span className="text-gray-500 text-sm block">ross@wimp.co.za</span>
              </div>
            </div>
            <ArrowLeft size={16} className="text-gray-400 rotate-180" />
          </button>

          {/* Quick Help Bubbles */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Help Topics:</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-[#22c55e]/10 text-[#22c55e] px-3 py-1 rounded-full text-xs font-medium">
                📸 Photo Scoring
              </span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                ⭐ Mastery System
              </span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                🤖 AI Chef Chat
              </span>
              <span className="bg-navy-100 text-navy-800 px-3 py-1 rounded-full text-xs font-medium">
                👥 Cooking Pods
              </span>
              <span className="bg-navy-100 text-navy-800 px-3 py-1 rounded-full text-xs font-medium">
                📱 App Issues
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Tap FAQ & Help Center above to get detailed answers to these topics and more!
            </p>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  />
                  <button
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={changePasswordMutation.isPending}
                className="flex-1 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? 'Changing...' : 'Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Send Feedback</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFeedbackForm(prev => ({ ...prev, rating }))}
                      className={`${
                        rating <= feedbackForm.rating ? 'text-yellow-400' : 'text-gray-300'
                      } hover:text-yellow-400 transition-colors`}
                    >
                      <Star size={24} fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about your experience..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // 🔐 AUTHENTICATION TRIGGER: Protect feedback submission
                  if (!requireAuth('FEEDBACK', undefined, '💬 Send us feedback! Sign up to share your suggestions and help us improve your cooking experience.')) {
                    return; // Authentication required, exit early
                  }
                  submitFeedbackMutation.mutate(feedbackForm);
                }}
                disabled={submitFeedbackMutation.isPending}
                className="flex-1 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors disabled:opacity-50"
              >
                {submitFeedbackMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <button
                    onClick={() => {
                      // 🔐 AUTHENTICATION TRIGGER: Protect notification settings
                      if (!requireAuth('SETTINGS', undefined, '🔔 Customize your notifications! Sign up to manage your personal notification preferences.')) {
                        return; // Authentication required, exit early
                      }
                      
                      const newSettings = { ...notificationSettings, [key]: !value };
                      setNotificationSettings(newSettings);
                      updateNotificationsMutation.mutate(newSettings);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-[#22c55e]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full mt-6 px-4 py-2 bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;