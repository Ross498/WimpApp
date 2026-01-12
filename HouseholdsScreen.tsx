import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { useAuthTrigger } from '../utils/authTriggers';
// Custom icons to replace lucide-react
const Home = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const Plus = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const Crown = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 20h20l-2-6-4 2-4-4-4 4-4-2-2 6z"/>
    <path d="M6 6l4 4 4-4 4 4"/>
  </svg>
);

const Package = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const TrendingUp = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/>
    <polyline points="16,7 22,7 22,13"/>
  </svg>
);

const Settings = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

interface Household {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdBy: string;
  createdDate: string;
  inviteCode: string;
  members: HouseholdMember[];
  sharedPantry: {
    totalItems: number;
    lastUpdated: string;
  };
  recentActivity: Activity[];
}

interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedDate: string;
  lastActive: string;
  mealsShared: number;
  contributions: number;
}

interface Activity {
  id: string;
  type: 'meal_upload' | 'pantry_update' | 'recipe_share' | 'member_join';
  userId: string;
  userName: string;
  description: string;
  timestamp: string;
}

// Error Boundary Component
class HouseholdErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('HouseholdsScreen Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold text-navy-600 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">We're having trouble loading your households. Please try again.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const HouseholdsScreen: React.FC = () => {
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newHousehold, setNewHousehold] = useState({
    name: '',
    description: '',
  });
  const [shareableLink, setShareableLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSettings, setShowSettings] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthTrigger();

  // Fetch households data with guest access support (using proven pattern)
  const { data: householdsData, isLoading, error } = useQuery<{success: boolean, data: Household}>({
    queryKey: ['/api/household/info', isAuthenticated],
    queryFn: async () => {
      console.log('🏠 Fetching household info with guest support...');
      try {
        // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
        const response = await fetch('/api/household/info', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('🏠 Household info response:', data);
        return data;
      } catch (error) {
        console.error('🏠 Household info failed:', error);
        // Return guest-friendly fallback for household info
        return {
          success: true,
          data: {
            isGuest: true,
            message: 'Sign in to create or join households',
            id: null,
            name: null,
            description: null,
            memberCount: 0,
            members: [],
            sharedPantry: { totalItems: 0, lastUpdated: '' },
            recentActivity: []
          }
        };
      }
    },
    retry: false,
    staleTime: 30000,
    gcTime: 60000,
  });

  // Detect guest status from response  
  const isGuest = useMemo(() => {
    if (!householdsData) return !isAuthenticated;
    return householdsData.data?.isGuest || !isAuthenticated;
  }, [householdsData, isAuthenticated]);

  // Memoized households processing with guest support
  const households = useMemo(() => {
    console.log('🏠 Processing household data:', householdsData);
    
    // Handle guest response format
    if (isGuest) {
      console.log('🏠 Guest user - showing empty household list');
      return [];
    }
    
    // Handle authenticated user with household data
    const result = householdsData?.data && !householdsData.data.isGuest ? [householdsData.data] : [];
    console.log('🏠 Processed households:', result.length, 'items');
    return result;
  }, [householdsData, isGuest]);

  // Create household mutation (requires authentication)
  const createHouseholdMutation = useMutation({
    mutationFn: async (household: typeof newHousehold) => {
      try {
        // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
        const response = await fetch('/api/household/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name: household.name,
            description: household.description,
            createFamilyPod: true
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create household');
        }
        return response.json();
      } catch (err) {
        setErrorMessage('Failed to create household. Please check your connection and try again.');
        throw err;
      }
    },
    onSuccess: async (data) => {
      // CRITICAL FIX: Force immediate cache refresh for navigation issues  
      await queryClient.invalidateQueries({ queryKey: ['/api/household/info', isAuthenticated] });
      await queryClient.refetchQueries({ queryKey: ['/api/household/info', isAuthenticated] });
      
      setShowCreateForm(false);
      setNewHousehold({ name: '', description: '' });
      setErrorMessage('');
      setSuccessMessage('Household created successfully!');

      // Generate shareable link
      if (data.data?.inviteCode) {
        const link = `${window.location.origin}/households/join/${data.data.inviteCode}`;
        setShareableLink(link);
      }

      // Clear success message after delay
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      console.error('Create household error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create household');
    }
  });

  // Join household mutation (requires authentication)
  const joinHouseholdMutation = useMutation({
    mutationFn: async (code: string) => {
      try {
        // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
        const response = await fetch('/api/household/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ inviteCode: code }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to join household');
        }
        return response.json();
      } catch (err) {
        setErrorMessage('Failed to join household. Please check the invite code and try again.');
        throw err;
      }
    },
    onSuccess: async () => {
      // CRITICAL FIX: Force immediate cache refresh for navigation issues
      await queryClient.invalidateQueries({ queryKey: ['/api/household/info', isAuthenticated] });
      await queryClient.refetchQueries({ queryKey: ['/api/household/info', isAuthenticated] });
      
      setShowJoinForm(false);
      setInviteCode('');
      setErrorMessage('');
      setSuccessMessage('Successfully joined household!');

      // Clear success message after delay
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      console.error('Join household error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join household');
    }
  });

  // Memoized handlers for performance optimization
  const handleCreateHousehold = useCallback(() => {
    if (!newHousehold.name.trim()) {
      setErrorMessage('Household name is required');
      return;
    }

    // 🔐 AUTHENTICATION TRIGGER: Protect household creation
    if (!requireAuth('HOUSEHOLD_MANAGEMENT', undefined, '🏠 Create your household! Sign up to start a shared cooking space with family and friends.')) {
      return; // Authentication required, exit early
    }
    
    setErrorMessage('');
    createHouseholdMutation.mutate(newHousehold);
  }, [newHousehold, createHouseholdMutation, requireAuth]);

  const handleJoinHousehold = useCallback(() => {
    if (!inviteCode.trim()) {
      setErrorMessage('Invite code is required');
      return;
    }

    // 🔐 AUTHENTICATION TRIGGER: Protect household joining
    if (!requireAuth('HOUSEHOLD_MANAGEMENT', undefined, '🤝 Join the household! Sign up to connect with your family and friends for shared cooking experiences.')) {
      return; // Authentication required, exit early
    }
    
    setErrorMessage('');
    joinHouseholdMutation.mutate(inviteCode.trim());
  }, [inviteCode, joinHouseholdMutation, requireAuth]);

  // Copy link handler with clipboard API
  const handleCopyInviteCode = useCallback(async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        setSuccessMessage('Invite code copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setSuccessMessage('Invite code copied!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setErrorMessage('Failed to copy invite code. Please copy manually.');
    }
  }, []);

  // Replace alert with proper user feedback
  const copyInviteLink = useCallback((household: Household) => {
    const link = `${window.location.origin}/households/join/${household.inviteCode}`;
    handleCopyInviteCode(link);
  }, [handleCopyInviteCode]);

  const copyShareableLink = useCallback(() => {
    if (shareableLink) {
      handleCopyInviteCode(shareableLink);
    }
  }, [shareableLink, handleCopyInviteCode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meal_upload':
        return '🍽️';
      case 'pantry_update':
        return '📦';
      case 'recipe_share':
        return '📝';
      case 'member_join':
        return '👋';
      default:
        return '📱';
    }
  };

  // Demo household completely disabled for all environments
  const demoHousehold = null;

  // CRITICAL: Add a refresh mechanism to fix navigation cache issues

  // Determine which households to display
  const allHouseholds = isAuthenticated
      ? (households || [])
      : (demoHousehold ? [demoHousehold] : []);


  // Conditional rendering for performance optimization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading households">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <span className="sr-only">Loading households...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center" role="alert">
        <h2 className="text-lg font-semibold text-navy-600 mb-2">Failed to load households</h2>
        <p className="text-gray-600 mb-4">Please check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <HouseholdErrorBoundary>
      <div 
        className="households-screen bg-gray-50 relative min-h-screen overflow-y-auto"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
        }}
      >
        {/* Error/Success Messages */}
        <div aria-live="polite" aria-atomic="true">
          {errorMessage && (
            <div className="mx-4 mt-4 p-3 bg-navy-50 border border-navy-200 rounded-lg text-navy-800 text-sm" role="alert">
              <div className="font-medium">Error</div>
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm" role="alert">
              <div className="font-medium">Success</div>
              {successMessage}
            </div>
          )}
        </div>

        {/* Header - ADDED BACK BUTTON - FIXED STICKY HEADER */}
        <div 
          className="bg-white p-4 shadow-sm sticky z-10"
          style={{
            top: 'env(safe-area-inset-top, 0px)'
          }}
        >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"/>
                <path d="M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">My Households</h2>
              <p className="text-sm text-gray-600">Manage your family cooking together</p>
            </div>
          </div>
        </div>

        {/* CENTERED CREATE HOUSEHOLD BUTTON */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setShowJoinForm(true)}
            className="bg-green-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-green-600 transition-colors"
          >
            <Plus size={20} />
            <span>Join Household</span>
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-navy-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-navy-600 transition-colors"
            style={{ backgroundColor: '#f59e0b' }}
          >
            <Home size={20} />
            <span>Create Household</span>
          </button>
        </div>
        </div>

        <div className="p-4">
        {/* Create Household Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Household</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Household name (e.g., Smith Family)"
                value={newHousehold.name}
                onChange={(e) => setNewHousehold({ ...newHousehold, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              <textarea
                placeholder="Description (optional)"
                value={newHousehold.description}
                onChange={(e) => setNewHousehold({ ...newHousehold, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleCreateHousehold}
                  disabled={!newHousehold.name.trim() || createHouseholdMutation.isPending}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Create Household
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Household Form */}
        {showJoinForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Join a Household</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter household invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex space-x-3">
                <button
                  onClick={handleJoinHousehold}
                  disabled={!inviteCode.trim() || joinHouseholdMutation.isPending}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Join Household
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info Removed - Hidden for production */}

        {/* No Households State - Enhanced UI */}
        {!allHouseholds || allHouseholds.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="max-w-md mx-auto">
              {/* Illustration */}
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-blue-100 rounded-full flex items-center justify-center">
                <Home className="w-12 h-12 text-navy-600" />
              </div>
              
              {/* Main Message */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No households yet</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Create a household to start cooking and sharing with your family. 
                Join forces in the kitchen, share recipes, and track meals together!
              </p>

              {/* Action Cards */}
              <div className="space-y-4 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      <Home className="w-4 h-4 text-navy-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Create Household</h4>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Start your own family cooking group. Set up shared pantry, meal planning, and recipe collection.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">Join Household</h4>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Got an invite code? Join an existing household to collaborate on meals and share cooking experiences.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors font-medium"
                >
                  <Home size={20} />
                  <span>Create Household</span>
                </button>
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center space-x-2 hover:bg-green-700 transition-colors font-medium"
                >
                  <Plus size={20} />
                  <span>Join Household</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Existing Households List
          <div className="space-y-6">
            {allHouseholds.map((household) => (
              <div key={household.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Household Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Home className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{household.name}</h3>
                        <p className="text-sm text-gray-600">{household.memberCount} members</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSettings(showSettings === household.id ? null : household.id)}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      title="Household Settings"
                    >
                      <Settings size={20} />
                    </button>
                  </div>

                  {household.description && (
                    <p className="text-gray-600 text-sm mb-3">{household.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Package className="text-green-500" size={16} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {household.sharedPantry.totalItems} items
                        </div>
                        <div className="text-xs text-gray-500">Shared Pantry</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="text-green-500" size={16} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(household.sharedPantry.lastUpdated)}
                        </div>
                        <div className="text-xs text-gray-500">Last Updated</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members */}
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Members</h4>
                  <div className="space-y-2">
                    {household.members.slice(0, 3).map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            {member.avatar ? (
                              <img 
                                src={member.avatar} 
                                alt={member.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-green-600">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                              <span>{member.name}</span>
                              {member.role === 'admin' && <Crown className="text-orange-500" size={12} />}
                            </div>
                            <div className="text-xs text-gray-500">
                              @{member.name?.toLowerCase() || "user"}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {member.role}
                        </div>
                      </div>
                    ))}
                    {household.memberCount > 3 && (
                      <div className="text-sm text-gray-500 text-center pt-2">
                        +{household.memberCount - 3} more members
                      </div>
                    )}
                  </div>
                </div>

                {/* Invite Code and Share Link */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">Invite Others</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Invite Code</div>
                        <div className="text-xs text-gray-600 font-mono">{household.inviteCode}</div>
                      </div>
                      <button
                        onClick={() => copyInviteLink(household)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {household.recentActivity && household.recentActivity.length > 0 ? (
                      household.recentActivity.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-3">
                          <span className="text-lg">{getActivityIcon(activity.type)}</span>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500">
                              {activity.userName} • {formatDate(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No recent activity</div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => {
                        console.log(`🏠 [BUTTON CLICK] Navigating to household details: /household/${household.id}/details`);
                        console.log(`🏠 [BUTTON CLICK] Current household data:`, household);
                        setLocation(`/household/${household.id}/details`);
                      }}
                      className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                      style={{ minHeight: '44px' }}
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => {
                        console.log(`⚙️ [BUTTON CLICK] Navigating to household settings: /household/${household.id}/settings`);
                        console.log(`⚙️ [BUTTON CLICK] Current household data:`, household);
                        setLocation(`/household/${household.id}/settings`);
                      }}
                      className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-semibold"
                      style={{ minHeight: '44px' }}
                    >
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shareable Link Modal */}
        {shareableLink && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Household Created Successfully!</h3>
              <p className="text-gray-600 mb-4">
                Your household has been created. Share this link with family members to invite them:
              </p>
              <div className="bg-gray-100 p-3 rounded-lg mb-4">
                <div className="text-sm text-gray-900 break-all">{shareableLink}</div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={copyShareableLink}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setShareableLink('')}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </HouseholdErrorBoundary>
  );
};

export default HouseholdsScreen;