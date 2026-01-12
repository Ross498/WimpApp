import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Custom icons
const ArrowLeft = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
);

const Settings = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const RefreshCw = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23,4 23,10 17,10"/>
    <polyline points="1,20 1,14 7,14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const UserMinus = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

// Trash2 icon removed as unused

const Save = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17,21 17,13 7,13 7,21"/>
    <polyline points="7,3 7,8 15,8"/>
  </svg>
);

const HouseholdSettingsScreen: React.FC = () => {
  const params = useParams();
  console.log('Household ID from params:', params.id); // Use params for debugging
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [householdName, setHouseholdName] = useState('');
  const [householdDescription, setHouseholdDescription] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage] = useState(''); // Error handling simplified

  // Fetch household details
  const { data: householdData, isLoading } = useQuery({
    queryKey: ['/api/household/info'],
    queryFn: async () => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/household/info', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch household details');
      return response.json();
    },
    // Use useEffect instead of deprecated onSuccess
  });

  const household = householdData?.data || {};

  // Update household mutation
  const updateHouseholdMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch(`/api/household/${(household as any)?.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update household');
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('Household updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['/api/household/info'] });
    },
    onError: (error: any) => {
      console.error('Failed to update household:', error.message);
    }
  });

  // Regenerate invite code mutation
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch(`/api/household/${(household as any)?.id}/regenerate-code`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) throw new Error('Failed to regenerate invite code');
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('Invite code regenerated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['/api/household/info'] });
    },
    onError: (error: any) => {
      console.error('Failed to regenerate invite code:', error.message);
    }
  });

  // Leave household mutation
  const leaveHouseholdMutation = useMutation({
    mutationFn: async () => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/household/leave', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to leave household');
      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('Successfully left household');
      setTimeout(() => {
        setLocation('/households');
      }, 1500);
      queryClient.invalidateQueries({ queryKey: ['/api/household/info'] });
    },
    onError: (error: any) => {
      console.error('Failed to leave household:', error.message);
    }
  });

  const handleSaveSettings = () => {
    if (householdName.trim()) {
      updateHouseholdMutation.mutate({
        name: householdName.trim(),
        description: householdDescription.trim()
      });
    }
  };

  const handleRegenerateCode = () => {
    if (confirm('Are you sure you want to regenerate the invite code? The old code will no longer work.')) {
      regenerateCodeMutation.mutate();
    }
  };

  const handleLeaveHousehold = () => {
    if (showDeleteConfirm) {
      leaveHouseholdMutation.mutate();
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 5000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Household not found</p>
          <button
            onClick={() => setLocation('/households')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Back to Households
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation('/households')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Household Settings</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-700 text-sm">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{errorMessage}</p>
          </div>
        )}

        {/* Basic Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Settings size={20} />
              <span>Basic Information</span>
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Household Name
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter household name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={householdDescription}
                onChange={(e) => setHouseholdDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Optional description"
              />
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={updateHouseholdMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>
                {updateHouseholdMutation.isPending ? 'Saving...' : 'Save Changes'}
              </span>
            </button>
          </div>
        </div>

        {/* Invite Code Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Invite Code Management</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-500 mb-1">Current Invite Code</div>
              <div className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                {household.inviteCode}
              </div>
            </div>
            <button
              onClick={handleRegenerateCode}
              disabled={regenerateCodeMutation.isPending}
              className="w-full flex items-center justify-center space-x-2 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} />
              <span>
                {regenerateCodeMutation.isPending ? 'Regenerating...' : 'Regenerate Code'}
              </span>
            </button>
            <p className="text-xs text-gray-500">
              Regenerating the code will invalidate the current code. All existing invitations will no longer work.
            </p>
          </div>
        </div>

        {/* Member Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Member Management</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4">
              You have {household.memberCount} members in this household.
            </p>
            <button
              onClick={() => setLocation(`/household/${household.id}/details`)}
              className="w-full bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
            >
              View All Members
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200">
          <div className="p-4 border-b border-red-200">
            <h3 className="font-semibold text-red-700">Danger Zone</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Leave Household</h4>
              <p className="text-sm text-gray-600 mb-3">
                You will lose access to the shared pantry and all household data.
              </p>
              <button
                onClick={handleLeaveHousehold}
                disabled={leaveHouseholdMutation.isPending}
                className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  showDeleteConfirm 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                <UserMinus size={16} />
                <span>
                  {leaveHouseholdMutation.isPending 
                    ? 'Leaving...' 
                    : showDeleteConfirm 
                      ? 'Confirm Leave Household' 
                      : 'Leave Household'
                  }
                </span>
              </button>
              {showDeleteConfirm && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  Click again to confirm leaving the household
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseholdSettingsScreen;