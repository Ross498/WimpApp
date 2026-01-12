import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, Wallet, Target, Receipt, Banknote, BarChart3, PieChart, Store, Settings } from 'lucide-react';
import { useLocation } from 'wouter';
import { useSubscription } from '../hooks/useSubscription';
import { PremiumGate } from '../components/PremiumGate';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

export default function FinancialScreen() {
  const [, setLocation] = useLocation();
  useSubscription(); // Used by PremiumGate component
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const queryClient = useQueryClient();

  const { data: overviewData, isLoading, error } = useQuery({
    queryKey: ['/api/financial/overview'],
    retry: 3,
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0
  });

  // FIXED: Safe data access with fallback (matching IngredientsScreen pattern)
  const overview = (() => {
    try {
      const data = (overviewData as any)?.data || overviewData || {};
      return {
        monthlySpending: Number(data.monthlySpending) || 0,
        weeklySpending: Number(data.weeklySpending) || 0,
        totalSpending: Number(data.totalSpending) || 0,
        monthlyBudget: Number(data.monthlyBudget) || 1500,
        budgetUsed: Number(data.budgetUsed) || 0,
        remainingBudget: Number(data.remainingBudget) || 0,
        pantryValue: Number(data.pantryValue) || 0,
        totalSavings: Number(data.totalSavings) || 0,
        receiptsScanned: Number(data.receiptsScanned) || 0,
        isHousehold: Boolean(data.isHousehold),
        householdMembers: Number(data.householdMembers) || 1,
        storeBreakdown: data.storeBreakdown || {},
        categoryBreakdown: data.categoryBreakdown || {},
        weeklyTrends: Array.isArray(data.weeklyTrends) ? data.weeklyTrends : [],
        optimizationEfficiency: Number(data.optimizationEfficiency) || 0,
        potentialSavings: Number(data.potentialSavings) || 0
      };
    } catch (error) {
      console.error('💰 FINANCIAL DATA PARSING ERROR:', error);
      return {
        monthlySpending: 0, weeklySpending: 0, totalSpending: 0,
        monthlyBudget: 1500, budgetUsed: 0, remainingBudget: 1500,
        pantryValue: 0, totalSavings: 0, receiptsScanned: 0,
        isHousehold: false, householdMembers: 1,
        storeBreakdown: {}, categoryBreakdown: {}, weeklyTrends: [],
        optimizationEfficiency: 0, potentialSavings: 0
      };
    }
  })();
  
  // Enhanced error handling and logging
  if (error) {
    console.error('💰 FINANCIAL API ERROR:', error);
  }
  
  if (!isLoading && !overview) {
    console.error('💰 CRITICAL: Financial API failed - authentication or data issue');
    console.log('💰 DEBUG INFO:', {
      isLoading,
      hasOverviewData: !!overviewData,
      hasOverviewDataData: !!overviewData?.data,
      error: error?.message,
      // SECURITY FIX: Removed localStorage token debug - using httpOnly cookies
    });
  }

  // Get user budget from API
  const { data: budgetData } = useQuery({
    queryKey: ['/api/financial/budget']
  });

  // FIXED: Handle missing data properly
  if (!overview) {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center z-50" style={{ paddingTop: 'env(safe-area-inset-top)', height: 'calc(64px + env(safe-area-inset-top))' }}>
          <button onClick={() => setLocation('/profile')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Financial Overview</h1>
        </div>
        
        <div className="pt-20 px-4 flex flex-col items-center justify-center min-h-[50vh]">
          {isLoading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading financial data...</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Financial Data Unavailable</h2>
              <p className="text-gray-600 mb-4">Unable to load financial overview. Please check your connection and authentication.</p>
              <button 
                onClick={() => {
                  console.log('🔄 Manual refresh triggered');
                  queryClient.invalidateQueries({ queryKey: ['/api/financial/overview'] });
                }}
                className="bg-navy-500 text-white px-4 py-2 rounded-lg hover:bg-navy-600 transition-colors"
              >
                Retry Loading
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentBudget = (budgetData as any)?.budget || 800;
  const remainingBudget = Math.max(0, currentBudget - (overview.monthlySpending || 0));
  const budgetProgress = Math.min(100, ((overview.monthlySpending || 0) / currentBudget) * 100);

  // Set budget mutation
  const setBudgetMutation = useMutation({
    mutationFn: async (budget: number) => {
      return await apiRequest('/api/financial/budget', { 
        method: 'POST',
        body: JSON.stringify({ budget })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/financial/budget'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial/overview'] });
      setShowBudgetModal(false);
      setBudgetAmount('');
    }
  });

  const handleSetBudget = () => {
    const amount = parseFloat(budgetAmount);
    if (amount > 0) {
      setBudgetMutation.mutate(amount);
    }
  };

  return (
    <div className="financial-screen bg-slate-50 min-h-screen pb-20">
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation('/')}
              className="flex items-center text-slate-600 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-medium">Back</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-800">Financial Dashboard</h1>
              <p className="text-sm text-slate-500">Comprehensive spending analytics</p>
            </div>
            <button
              onClick={() => setShowBudgetModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Settings size={16} />
              Set Budget
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <PremiumGate featureType="financialTracking">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-800">Monthly Overview</h2>
              <span className="text-sm text-slate-500">Current Period</span>
            </div>

            {/* 4-Metric Dashboard */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* 1. Monthly Spending */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="text-emerald-600" size={20} />
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-200 px-2 py-1 rounded-full">SPENT</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  R{isLoading ? '...' : (overview?.monthlySpending || 0).toFixed(2)}
                </div>
                <div className="text-sm text-emerald-600">Monthly Spending</div>
              </div>

              {/* 2. Budget Progress */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <Target className="text-blue-600" size={20} />
                  <span className="text-xs font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">BUDGET</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {isLoading ? '...' : (budgetProgress || 0).toFixed(0)}%
                </div>
                <div className="text-sm text-blue-600">Budget Progress</div>
              </div>

              {/* 3. Total Savings Achieved */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <Banknote className="text-purple-600" size={20} />
                  <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-full">SAVED</span>
                </div>
                <div className="text-2xl font-bold text-purple-700">
                  R{isLoading ? '...' : (overview?.totalSavings || 0).toFixed(2)}
                </div>
                <div className="text-sm text-purple-600">Total Savings</div>
              </div>

              {/* 4. Receipts Scanned */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <Receipt className="text-navy-600" size={20} />
                  <span className="text-xs font-medium text-navy-700 bg-navy-200 px-2 py-1 rounded-full">ACTIVITY</span>
                </div>
                <div className="text-2xl font-bold text-navy-700">
                  {isLoading ? '...' : overview.receiptsScanned}
                </div>
                <div className="text-sm text-navy-600">Receipts Scanned</div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Budget Progress</span>
                <span className="text-sm text-slate-600">R{remainingBudget.toFixed(2)} remaining</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Store Performance Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <Store className="mr-2 text-slate-600" size={20} />
                Store Performance
              </h2>
              <span className="text-sm text-slate-500">Spending breakdown</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Predefined stores plus Other category */}
              {['Checkers', 'Woolworths', 'Pick n Pay', 'SPAR', 'Other'].map((storeName) => {
                const storeSpending = overview.storeBreakdown?.[storeName] || 0;
                const percentage = overview.monthlySpending > 0 ? (storeSpending / overview.monthlySpending * 100) : 0;
                const storeColors = {
                  'Checkers': 'bg-navy-100 text-navy-700 border-navy-200',
                  'Woolworths': 'bg-green-100 text-green-700 border-green-200',
                  'Pick n Pay': 'bg-blue-100 text-blue-700 border-blue-200',
                  'SPAR': 'bg-yellow-100 text-yellow-700 border-yellow-200',
                  'Other': 'bg-gray-100 text-gray-700 border-gray-200'
                };
                
                return (
                  <div key={storeName} className={`p-3 rounded-lg border ${storeColors[storeName as keyof typeof storeColors]}`}>
                    <div className="text-sm font-medium">{storeName}</div>
                    <div className="text-lg font-bold">R{storeSpending.toFixed(2)}</div>
                    <div className="text-xs">{percentage.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <PieChart className="mr-2 text-slate-600" size={20} />
                Category Breakdown
              </h2>
              <span className="text-sm text-slate-500">Spending by category</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(overview.categoryBreakdown || {}).map(([category, amount]) => {
                const percentage = overview.monthlySpending > 0 ? ((amount as number) / overview.monthlySpending * 100) : 0;
                return (
                  <div key={category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="font-medium text-slate-700 capitalize">{category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">R{(amount as number).toFixed(2)}</div>
                      <div className="text-sm text-slate-500">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Trends */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <BarChart3 className="mr-2 text-slate-600" size={20} />
                Weekly Trends
              </h2>
              <span className="text-sm text-slate-500">4-week analysis</span>
            </div>
            
            <div className="space-y-3">
              {(overview.weeklyTrends || []).map((week: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">Week {index + 1}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-lg font-semibold text-slate-800">R{week.amount?.toFixed(2) || '0.00'}</span>
                    <div className={`text-sm px-2 py-1 rounded-full ${
                      week.variance > 0 
                        ? 'bg-navy-100 text-navy-700' 
                        : week.variance < 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {week.variance > 0 ? '+' : ''}{week.variance?.toFixed(1) || '0'}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PremiumGate>

        {/* 🎯 GUEST ACCESS: No premium banner - all users can see financial features */}
      </div>

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Set Monthly Budget</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Budget: R{currentBudget.toFixed(2)}
              </label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter new budget amount"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setBudgetAmount('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetBudget}
                disabled={setBudgetMutation.isPending || !budgetAmount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {setBudgetMutation.isPending ? 'Setting...' : 'Set Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}