import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import PayPalCardEntry from '../components/PayPalCardEntry';
import { useAuthTrigger } from '@/utils/authTriggers';

// Custom icons
const Crown = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 5l7 7-7 7h18l-7-7 7-7z"/>
  </svg>
);

const ArrowLeft = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

// Check icon removed as unused

const Bot = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" y1="16" x2="8" y2="16"/>
    <line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);

const Camera = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const BarChart = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
);

const Key = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="8" r="6"/>
    <path d="M18.09 10.37a6 6 0 1 1-10.37 0"/>
    <path d="M12 2a6 6 0 0 0-6 6c0 1 0 3 1.5 3S9 8 12 8s4.5 1 4.5 0a6 6 0 0 0-4.5-6"/>
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

// HeadPhones icon removed as unused

const Infinity = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4z"/>
    <path d="M12 12c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4z"/>
  </svg>
);

const SubscriptionScreen: React.FC = () => {
  const [, setLocation] = useLocation();
  const { requireAuth } = useAuthTrigger();
  // Subscription status management simplified
  const [showPayPalCardEntry, setShowPayPalCardEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Renamed from setLoading to setIsLoading for clarity
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly'); // New state for billing toggle

  const { data, isLoading: isQueryLoading, error } = useQuery({ // subscriptionStatus simplified to data
    queryKey: ['/api/subscription/status'],
    queryFn: async () => {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const response = await fetch('/api/subscription/status', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Handle potential errors from the API directly
        const errorData = await response.text(); // or response.json() if the API returns JSON errors
        throw new Error(`Failed to fetch subscription status: ${response.status} ${response.statusText} - ${errorData}`);
      }
      return response.json();
    },
    // Added refetchOnWindowFocus to false to prevent unexpected reloads
    refetchOnWindowFocus: false,
  });

  // Check if user is currently premium (unused - keeping for potential future use)
  /* const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/subscription/status', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          return await response.json();
        }
        return { tier: 'free' };
      } catch (error) {
        console.error('Failed to fetch subscription status:', error);
        return { tier: 'free' };
      }
    }
  }); */

  // Check if user is currently premium
  // const isCurrentlyPremium = subscriptionData?.tier === 'premium'; // Removed unused variable

  // Updated handleSubscribe function to reflect the new flow
  const handleSubscribe = async (planType: 'monthly' | 'yearly') => {
    // CRITICAL: Protect subscription setup with authentication
    if (!requireAuth('PREMIUM_FEATURES', undefined, '💳 Upgrade to Premium! Sign up to unlock unlimited AI features, advanced meal planning, and premium cooking tools.')) {
      return;
    }

    try {
      setIsLoading(true);
      setSelectedPlan(planType);

      // Fetch PayPal setup for card entry - SECURITY FIX: Add credentials for session auth
      const setupResponse = await fetch('/api/subscription/paypal/setup', {
        credentials: 'include'
      });
      if (setupResponse.ok) {
        const setupData = await setupResponse.json();

        // Show PayPal card entry UI
        setShowPayPalCardEntry(true);
        console.log('PayPal setup successful:', setupData);
      } else {
        throw new Error('Failed to initialize PayPal');
      }

    } catch (error) {
      console.error('Subscription initialization error:', error);
      alert('Failed to initialize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayPalSuccess = (paymentData: any) => {
    console.log('Payment successful:', paymentData);
    setShowPayPalCardEntry(false);
    // In a real app, you'd update the user's subscription status
    alert('Subscription activated successfully! Welcome to WIMP Premium!');
    // Optionally, refetch subscription status here or navigate to a success page
  };

  const handlePayPalClose = () => {
    setShowPayPalCardEntry(false);
    setSelectedPlan(null); // Reset selected plan when modal is closed
  };

  const premiumFeatures = [
    {
      category: 'AI Features',
      icon: Bot,
      color: 'from-blue-500 to-purple-500',
      features: [
        {
          name: 'Unlimited AI Chef Chat',
          description: 'Chat with weekly rotating AI chefs for cooking tips and recipe suggestions',
          icon: Bot,
          highlight: true
        },
        {
          name: 'AI Image Uploads',
          description: 'Upload ingredient photos for identification and recipe ideas',
          icon: Camera,
          highlight: true
        },
        {
          name: 'Voice Recognition',
          description: 'Use OpenAI Whisper voice commands for hands-free cooking',
          icon: Bot,
          highlight: false
        }
      ]
    },
    {
      category: 'Recipe Features',
      icon: Camera,
      color: 'from-green-500 to-teal-500',
      features: [
        {
          name: 'Unlimited Recipe Scanning',
          description: 'Scan unlimited recipes from cookbooks, magazines, and photos',
          icon: Camera,
          highlight: true
        },
        {
          name: 'Personalized Recommendations',
          description: 'Get recipes matched to your pantry ingredients',
          icon: BarChart,
          highlight: false
        },
        {
          name: 'Unlimited Favorites',
          description: 'Save unlimited recipes to your favorites collection',
          icon: Key,
          highlight: false
        }
      ]
    },
    {
      category: 'Pantry Management',
      icon: Key,
      color: 'from-orange-500 to-red-500',
      features: [
        {
          name: 'Unlimited Ingredients',
          description: 'Track unlimited ingredients with expiry dates and quantities',
          icon: Infinity,
          highlight: true
        },
        {
          name: 'Expiry Notifications',
          description: 'Get alerts 1-3 days before ingredients expire',
          icon: Calendar,
          highlight: false
        },
        {
          name: 'Smart Categories',
          description: 'Auto-categorize ingredients by type (dairy, meat, vegetables, etc.)',
          icon: Key,
          highlight: false
        }
      ]
    },
    {
      category: 'Shopping & Planning',
      icon: Calendar,
      color: 'from-purple-500 to-pink-500',
      features: [
        {
          name: 'Smart Shopping Lists',
          description: 'Unlimited shopping list items with auto-categorization',
          icon: Calendar,
          highlight: true
        },
        {
          name: 'Recipe Integration',
          description: 'Add missing ingredients from recipes directly to shopping list',
          icon: BarChart,
          highlight: false
        },
        {
          name: 'Ingredient Matching',
          description: 'See which recipes you can make with current pantry items',
          icon: Camera,
          highlight: false
        }
      ]
    }
  ];

  // Determine if the user is currently premium based on fetched data
  const isPremium = data?.isPremium ?? false; // Default to false if data is not yet available or doesn't have isPremium

  // Conditionally render based on loading, error, or premium status
  if (isQueryLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-lg text-gray-700">Loading subscription status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-4">
        <p className="text-lg text-navy-600 mb-2">Error loading subscription status.</p>
        <p className="text-sm text-gray-600 text-center mb-4">{error.message}</p>
        <button
          onClick={() => setLocation('/profile')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  // Render the main subscription screen content
  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLocation('/profile')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Premium Subscription</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Premium Hero Section - Professional Blue Design */}
        <div className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 border-2 border-blue-200 rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>

          {/* Glass effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

          <div className="relative p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown size={32} className="text-white" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">WIMP Premium</h2>
            <p className="text-gray-600 mb-4">
              Unlock the full potential of your kitchen companion
            </p>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    billingCycle === 'yearly'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Dynamic Pricing Display */}
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="text-4xl font-bold text-blue-600">
                {billingCycle === 'monthly' ? 'R89.99' : 'R899.99'}
              </div>
              <div className="text-gray-600">
                <div className="text-sm">
                  per {billingCycle === 'monthly' ? 'month' : 'year'}
                </div>
                <div className="text-xs">
                  {billingCycle === 'yearly' ? 'Save 17% annually' : 'Cancel anytime'}
                </div>
              </div>
            </div>

            {!isPremium ? (
              <button
                onClick={() => handleSubscribe(billingCycle)} // Use dynamic billing cycle
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(45deg, #2563eb, #1d4ed8)',
                  boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                }}
              >
                {isLoading ? 'Processing...' : `Subscribe ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'} with PayPal`}
              </button>
            ) : (
              <div className="bg-green-100 text-green-800 px-4 py-3 rounded-lg font-medium text-center">
                You are currently a Premium Member!
              </div>
            )}
          </div>
        </div>

        {/* Feature Categories */}
        <div className="space-y-6">
          {premiumFeatures.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Category Header */}
              <div className={`bg-gradient-to-r ${category.color} p-4`}>
                <div className="flex items-center space-x-3">
                  <category.icon size={24} className="text-white" />
                  <h3 className="text-lg font-semibold text-white">{category.category}</h3>
                </div>
              </div>

              {/* Features List */}
              <div className="p-4 space-y-4">
                {category.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      feature.highlight ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <feature.icon size={16} className={feature.highlight ? 'text-blue-500' : 'text-gray-500'} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{feature.name}</h4>
                        {feature.highlight && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Free vs Premium</h3>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
              <div>Feature</div>
              <div className="text-center">Free</div>
              <div className="text-center">Premium</div>
            </div>

            {[
              { feature: 'AI Meal Generation', free: '5 per month', premium: 'Unlimited' },
              { feature: 'Image Uploads', free: '5 per month', premium: 'Unlimited' },
              { feature: 'Financial Tracker', free: 'Basic', premium: 'Advanced' },
              { feature: 'Mastery Keys', free: 'Earn by cooking', premium: '4 free monthly' },
              { feature: 'Meal Plans', free: '1 saved', premium: 'Unlimited' }
            ].map((item, index) => (
              <div key={index} className="grid grid-cols-3 gap-4 text-sm py-2">
                <div className="font-medium text-gray-900">{item.feature}</div>
                <div className="text-center text-gray-600">{item.free}</div>
                <div className="text-center text-blue-600 font-medium">{item.premium}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Can I cancel anytime?</h4>
              <p className="text-sm text-gray-600">Yes, you can cancel your subscription at any time. Your premium features will remain active until the end of your billing period.</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-1">What payment methods do you accept?</h4>
              <p className="text-sm text-gray-600">We accept all major credit cards and PayPal through our secure PayPal integration.</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-1">Do you offer refunds?</h4>
              <p className="text-sm text-gray-600">We offer a 30-day money-back guarantee. If you're not satisfied, contact support for a full refund.</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-1">Will my data be safe?</h4>
              <p className="text-sm text-gray-600">Absolutely. We use industry-standard encryption and never share your personal information with third parties.</p>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-8 text-center">
          {!isPremium ? (
            <button
              onClick={() => handleSubscribe(billingCycle)} // Use dynamic billing cycle
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
              style={{
                background: 'linear-gradient(45deg, #2563eb, #1d4ed8)',
                boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              {isLoading ? 'Processing...' : `Start Premium Subscription (${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'})`}
            </button>
          ) : null}

          <p className="text-xs text-gray-500 mt-2">
            By subscribing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* PayPal Card Entry Modal - Conditionally rendered */}
      {showPayPalCardEntry && (
        <PayPalCardEntry
          onClose={handlePayPalClose}
          onSuccess={handlePayPalSuccess}
          amount={selectedPlan === 'monthly' ? "89.99" : "899.99"} // Updated yearly price to R899.99
          currency="ZAR"
        />
      )}
    </div>
  );
};

export default SubscriptionScreen;