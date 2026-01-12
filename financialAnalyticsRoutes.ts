import express from 'express';
import { authenticateToken as authenticateUser } from './authMiddleware';

const router = express.Router();

// Enhanced Financial Analytics - Store Performance Tracking
router.get('/store-performance', authenticateUser, async (req, res) => {
  try {
    console.log('📊 Getting store performance analytics for user:', req.user?.id);
    
    // Mock comprehensive store analytics - would integrate with real receipt/shopping data
    const storePerformance = {
      stores: [
        {
          name: 'Checkers',
          totalSpent: 450.75,
          percentage: 35,
          averageSavings: 12.50,
          recommendationFollowRate: 78,
          bestCategories: ['Vegetables', 'Dairy']
        },
        {
          name: 'Woolworths',
          totalSpent: 320.25,
          percentage: 25,
          averageSavings: 8.75,
          recommendationFollowRate: 65,
          bestCategories: ['Proteins', 'Organic']
        },
        {
          name: 'Pick n Pay',
          totalSpent: 280.50,
          percentage: 22,
          averageSavings: 15.20,
          recommendationFollowRate: 82,
          bestCategories: ['Snacks', 'Beverages']
        },
        {
          name: 'SPAR',
          totalSpent: 230.80,
          percentage: 18,
          averageSavings: 9.30,
          recommendationFollowRate: 71,
          bestCategories: ['Grains', 'Household']
        }
      ],
      totalPotentialSavings: 45.75,
      actualSavingsAchieved: 28.90,
      optimizationEfficiency: 63
    };

    console.log('📊 STORE PERFORMANCE:', storePerformance);
    res.json({ success: true, data: storePerformance });

  } catch (error) {
    console.error('Store performance analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store performance' });
  }
});

// Category Breakdown Analytics
router.get('/category-breakdown', authenticateUser, async (req, res) => {
  try {
    console.log('📊 Getting category breakdown for user:', req.user?.id);
    
    const categoryBreakdown = {
      categories: [
        { name: 'Vegetables', amount: 125.40, percentage: 25, trend: 'down', budgetStatus: 'within' },
        { name: 'Proteins', amount: 185.75, percentage: 35, trend: 'up', budgetStatus: 'over' },
        { name: 'Dairy', amount: 89.25, percentage: 18, trend: 'stable', budgetStatus: 'within' },
        { name: 'Grains', amount: 67.50, percentage: 13, trend: 'down', budgetStatus: 'under' },
        { name: 'Snacks', amount: 45.30, percentage: 9, trend: 'up', budgetStatus: 'within' }
      ],
      totalSpending: 513.20,
    };

    res.json({ success: true, data: categoryBreakdown });

  } catch (error) {
    console.error('Category breakdown error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch category breakdown' });
  }
});

// Advanced Trend Analysis
router.get('/trend-analysis', authenticateUser, async (req, res) => {
  try {
    console.log('📊 Getting trend analysis for user:', req.user?.id);
    
    const trendAnalysis = {
      weeklyTrends: [
        { week: 'Week 1', amount: 165.40, variance: -8.5 },
        { week: 'Week 2', amount: 178.25, variance: 2.1 },
        { week: 'Week 3', amount: 195.80, variance: 15.3 },
        { week: 'Week 4', amount: 172.15, variance: -1.2 }
      ],
      monthlyComparison: {
        thisMonth: 711.60,
        lastMonth: 678.30,
        change: 4.9,
        trend: 'increasing'
      },
      predictiveAlerts: [
        'Based on current trends, you may exceed budget by R85 this month',
        'Protein spending is 25% higher than usual - consider meal planning',
        'Great job! Vegetable spending is down 12% from last month'
      ],
      budgetVelocity: {
        daysIntoMonth: 15,
        budgetUsedPercentage: 65,
        projectedOverrun: 18.5
      }
    };

    res.json({ success: true, data: trendAnalysis });

  } catch (error) {
    console.error('Trend analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trend analysis' });
  }
});

// Shopping Optimization Metrics
router.get('/optimization-metrics', authenticateUser, async (req, res) => {
  try {
    console.log('📊 Getting optimization metrics for user:', req.user?.id);
    
    const optimizationMetrics = {
      shoppingListSavings: {
        actualSavings: 28.45,
        potentialSavings: 52.80,
        optimizationRate: 54
      },
      recipeCostOptimization: {
        totalSaved: 15.75,
        substitutionsSuggested: 12,
        substitutionsAccepted: 8,
        averageSavingPerSubstitution: 1.97
      },
      bulkBuyingRecommendations: {
        opportunitiesIdentified: 6,
        opportunitiesActioned: 3,
        totalSavings: 22.30
      },
      wasteReductionImpact: {
        estimatedWastePrevented: '2.1kg',
        monetaryValue: 18.95,
        environmentalImpact: 'Excellent'
      },
      overallEfficiencyScore: 72
    };

    res.json({ success: true, data: optimizationMetrics });

  } catch (error) {
    console.error('Optimization metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch optimization metrics' });
  }
});

export default router;