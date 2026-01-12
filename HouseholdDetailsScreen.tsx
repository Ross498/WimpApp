import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

// Custom icons
const ArrowLeft = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12,19 5,12 12,5"/>
  </svg>
);

const Home = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const Users = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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

const Calendar = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const Crown = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 20h20l-2-6-4 2-4-4-4 4-4-2-2 6z"/>
    <path d="M6 6l4 4 4-4 4 4"/>
  </svg>
);

const HouseholdDetailsScreen: React.FC = () => {
  const params = useParams();
  console.log('Household ID from params:', params.id); // Use params for debugging
  const [, setLocation] = useLocation();

  // Fetch household details
  const { data: householdData, isLoading, error } = useQuery({
    queryKey: ['/api/household/info'],
    queryFn: async () => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/household/info', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch household details');
      return response.json();
    },
  });

  const household = householdData?.data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meal_upload': return '🍽️';
      case 'pantry_update': return '📦';
      case 'recipe_share': return '📝';
      case 'member_join': return '👋';
      default: return '📝';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading household details...</p>
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load household details</p>
          <button
            onClick={() => setLocation('/households')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
            <h1 className="text-lg font-semibold text-gray-900">Household Details</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Household Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Home className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{household.name}</h2>
                <p className="text-gray-600">{household.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Created {formatDate(household.createdDate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Users className="text-blue-500" size={16} />
                  <span className="text-sm font-medium text-gray-900">Members</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{household.memberCount}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Package className="text-green-500" size={16} />
                  <span className="text-sm font-medium text-gray-900">Pantry Items</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{household.sharedPantry.totalItems}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Members Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Members</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {household.members?.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      {member.avatar ? (
                        <img 
                          src={member.avatar} 
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{member.name}</span>
                        {member.role === 'owner' && <Crown className="text-orange-500" size={14} />}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="text-xs text-gray-400">
                        {member.mealsShared} meals shared • {member.contributions} contributions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{member.role}</div>
                    <div className="text-xs text-gray-400">
                      Last active: {formatDate(member.lastActive)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {household.recentActivity && household.recentActivity.length > 0 ? (
                household.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <span className="text-lg mt-0.5">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">{activity.userName}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">{formatDate(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Calendar className="text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shared Pantry Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Shared Pantry</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Total Items</div>
                <div className="text-lg font-semibold text-gray-900">{household.sharedPantry.totalItems}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Last Updated</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatDate(household.sharedPantry.lastUpdated)}
                </div>
              </div>
            </div>
            <button
              onClick={() => setLocation('/ingredients')}
              className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Shared Pantry
            </button>
          </div>
        </div>

        {/* Invite Code */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Invite Code</h3>
          </div>
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="text-sm text-gray-500 mb-1">Current Invite Code</div>
              <div className="text-2xl font-mono font-bold text-gray-900 tracking-wider">
                {household.inviteCode}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Share this code with family members to invite them to your household
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseholdDetailsScreen;