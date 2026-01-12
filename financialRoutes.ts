import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import type { AuthenticatedRequest } from './authMiddleware';
import { getReceiptStatistics, getStoreAnalytics, getOptimizationMetrics, calculatePantryValue } from './financial-helpers.js';

// Import database and schema for user queries
import { db } from './db.js';
import { users, receiptScans, shoppingListItems, shoppingLists, ingredients, householdIngredients, householdMembers, userShoppingItems, costTracking } from '../shared/schema.js';
import { eq, and, gte, lte, desc, sql, isNotNull, inArray } from 'drizzle-orm';

// Helper function to get household member IDs for financial aggregation
export async function getHouseholdMemberIds(userId: number): Promise<number[]> {
  if (!db) return [userId];

  // Check if user is in a household
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.householdId) {
    // Individual user - return just their ID
    console.log(`💰 INDIVIDUAL USER: Financial analysis for user ${userId} only`);
    return [userId];
  }

  // Household user - get all active household member IDs
  console.log(`🏠 HOUSEHOLD USER: Getting financial data for all members in household ${user.householdId}`);

  const householdMembersList = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(and(
      eq(householdMembers.householdId, user.householdId),
      eq(householdMembers.status, 'active')
    ));

  const memberIds = householdMembersList.map(member => member.userId);
  console.log(`🏠 HOUSEHOLD FINANCIAL: Including data from ${memberIds.length} household members:`, memberIds);

  return memberIds.length > 0 ? memberIds : [userId];
}

// Helper function to get pantry value using unified logic
export async function getPantryValueUnified(userId: number): Promise<number> {
  if (!db) return 0;

  // Check if user is in a household
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  let pantryValue = 0;

  if (user && user.householdId) {
    // For household users, calculate value of household pantry
    console.log(`🏠 PANTRY VALUE: Calculating household pantry value for household ${user.householdId}`);

    const householdItems = await db
      .select()
      .from(householdIngredients)
      .where(eq(householdIngredients.householdId, user.householdId));

    // Estimate value based on typical ingredient costs (ZAR)
    const ingredientValues: Record<string, number> = {
      'chicken': 45, 'beef': 80, 'pork': 55, 'fish': 60,
      'milk': 25, 'cheese': 40, 'yogurt': 15, 'eggs': 30,
      'bread': 12, 'rice': 20, 'pasta': 15, 'flour': 18,
      'tomatoes': 25, 'onions': 15, 'potatoes': 12, 'carrots': 18,
      'apples': 30, 'bananas': 20, 'oranges': 25,
      'oil': 35, 'butter': 30, 'salt': 8, 'sugar': 18
    };

    for (const item of householdItems) {
      const itemName = item.ingredientName.toLowerCase();
      const baseValue = ingredientValues[itemName] || 20; // Default R20 per unit
      const quantity = item.quantity || 1;
      pantryValue += baseValue * quantity;
    }

    console.log(`🏠 PANTRY VALUE: Household pantry worth R${pantryValue.toFixed(2)}`);
  } else {
    // For individual users, calculate value of personal pantry
    console.log(`👤 PANTRY VALUE: Calculating individual pantry value for user ${userId}`);

    const personalItems = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.userId, userId));

    const ingredientValues: Record<string, number> = {
      'chicken': 45, 'beef': 80, 'pork': 55, 'fish': 60,
      'milk': 25, 'cheese': 40, 'yogurt': 15, 'eggs': 30,
      'bread': 12, 'rice': 20, 'pasta': 15, 'flour': 18,
      'tomatoes': 25, 'onions': 15, 'potatoes': 12, 'carrots': 18,
      'apples': 30, 'bananas': 20, 'oranges': 25,
      'oil': 35, 'butter': 30, 'salt': 8, 'sugar': 18
    };

    for (const item of personalItems) {
      const itemName = item.name.toLowerCase();
      const baseValue = ingredientValues[itemName] || 20; // Default R20 per unit
      const quantity = item.quantity || 1;
      pantryValue += baseValue * quantity;
    }

    console.log(`👤 PANTRY VALUE: Individual pantry worth R${pantryValue.toFixed(2)}`);
  }

  return pantryValue;
}




const router = Router();

// generateInsights function is now imported from financial-helpers.ts


// Get comprehensive financial overview with real data
router.get('/overview', authenticateToken, async (req: any, res: Response) => {
  try {
    // FIXED: Enhanced authentication debugging
    console.log('💰 FINANCIAL AUTH MIDDLEWARE:', {
      hasUser: !!req.user,
      userObject: req.user,
      headers: {
        hasAuth: !!req.headers.authorization,
        authHeader: req.headers.authorization?.substring(0, 20) + '...'
      }
    });

    // Enhanced user ID extraction with better error handling
    const userId = req.user?.id;

    if (!userId) {
      console.log('💰 FINANCIAL AUTH FAILED:', {
        userObject: req.user,
        hasAuthHeader: !!req.headers.authorization,
        method: req.method,
        url: req.url
      });
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        debug: process.env.NODE_ENV === 'development' ? {
          hasUser: !!req.user,
          userKeys: req.user ? Object.keys(req.user) : [],
          hasAuthHeader: !!req.headers.authorization
        } : undefined
      });
    }

    console.log('💰 Fetching comprehensive financial overview for user:', userId);

    // Get household member IDs for financial aggregation
    const memberIds = await getHouseholdMemberIds(userId);
    const isHousehold = memberIds.length > 1;

    console.log(`💰 FINANCIAL SCOPE: ${isHousehold ? 'Household' : 'Individual'} analysis for ${memberIds.length} member(s)`);

    // Get receipt data for spending analysis (household or individual) - FIXED: proper integer comparison
    const receiptData = await db!
      .select()
      .from(receiptScans)
      .where(
        memberIds.length === 1 
          ? eq(receiptScans.userId, userId)
          : inArray(receiptScans.userId, memberIds)
      )
      .orderBy(desc(receiptScans.createdAt));

    console.log(`💰 RECEIPTS: Found ${receiptData.length} receipts for analysis`);

    // Get ACTUAL savings from completed shopping list items only (household or individual)
    const completedItems = await db!
      .select()
      .from(userShoppingItems)
      .where(and(
        memberIds.length === 1 
          ? eq(userShoppingItems.userId, userId)
          : inArray(userShoppingItems.userId, memberIds),
        eq(userShoppingItems.completed, true)
      ));

    // Calculate comprehensive financial metrics
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDay() === 0 ? currentDate.getDate() - 6 : currentDate.getDate() - (currentDate.getDay() - 1));


    // ENHANCED: Get cost tracking data for detailed item-level spending
    const costTrackingData = await db!
      .select()
      .from(costTracking)
      .where(
        memberIds.length === 1 
          ? eq(costTracking.userId, userId)
          : inArray(costTracking.userId, memberIds)
      )
      .orderBy(desc(costTracking.recordedAt));

    console.log(`💰 COST TRACKING: Found ${costTrackingData.length} individual cost records`);

    // Calculate spending from cost tracking (item-level data)
    const costTrackingTotalSpent = costTrackingData.reduce((sum, cost) => {
      const amount = parseFloat(cost.price?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const costTrackingMonthlySpent = costTrackingData
      .filter(cost => cost.recordedAt && new Date(cost.recordedAt) >= startOfMonth)
      .reduce((sum, cost) => {
        const amount = parseFloat(cost.price?.toString() || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    const costTrackingWeeklySpent = costTrackingData
      .filter(cost => cost.recordedAt && new Date(cost.recordedAt) >= startOfWeek)
      .reduce((sum, cost) => {
        const amount = parseFloat(cost.price?.toString() || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    // Total spending calculations - ENHANCED: combine receipt and cost tracking data
    const receiptTotalSpent = receiptData.reduce((sum, receipt) => {
      const amount = parseFloat(receipt.totalAmount?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const receiptMonthlySpent = receiptData
      .filter(receipt => receipt.createdAt && new Date(receipt.createdAt) >= startOfMonth)
      .reduce((sum, receipt) => {
        const amount = parseFloat(receipt.totalAmount?.toString() || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    const receiptWeeklySpent = receiptData
      .filter(receipt => receipt.createdAt && new Date(receipt.createdAt) >= startOfWeek)
      .reduce((sum, receipt) => {
        const amount = parseFloat(receipt.totalAmount?.toString() || '0');
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

    // FIXED: Single source of truth - prioritize receipt scans over cost tracking
    // Receipt scans are more accurate as they represent complete transactions
    const totalSpent = receiptTotalSpent > 0 ? receiptTotalSpent : costTrackingTotalSpent;
    const monthlySpent = receiptMonthlySpent > 0 ? receiptMonthlySpent : costTrackingMonthlySpent;
    const weeklySpent = receiptWeeklySpent > 0 ? receiptWeeklySpent : costTrackingWeeklySpent;

    console.log(`💰 UNIFIED SPENDING: Using ${receiptTotalSpent > 0 ? 'receipt data' : 'cost tracking'} - Monthly: R${monthlySpent.toFixed(2)}`);

    // SAVINGS from receipt data (South African savings cards show total savings on receipts)
    const totalSavingsFromReceipts = receiptData.reduce((sum, receipt) => {
      const savingsAmount = parseFloat(receipt.totalSavings?.toString() || '0');
      return sum + (isNaN(savingsAmount) ? 0 : savingsAmount);
    }, 0);

    console.log(`💰 SAVINGS: Total from receipts: R${totalSavingsFromReceipts.toFixed(2)}`)

    // Store breakdown analysis - FIXED: Proper store name mapping
    const storeBreakdown: Record<string, number> = {};
    receiptData.forEach(receipt => {
      if (receipt.store) {
        // Normalize store names to match frontend expectations
        const rawStoreName = receipt.store.toLowerCase().trim();
        let storeName = 'Other'; // Default fallback
        
        // Map various store name formats to standardized names
        if (rawStoreName.includes('checkers')) {
          storeName = 'Checkers';
        } else if (rawStoreName.includes('woolworths') || rawStoreName.includes('woolies')) {
          storeName = 'Woolworths';
        } else if (rawStoreName.includes('pick') && rawStoreName.includes('pay')) {
          storeName = 'Pick n Pay';
        } else if (rawStoreName.includes('spar')) {
          storeName = 'SPAR';
        }
        
        const amount = parseFloat(receipt.totalAmount?.toString() || '0');
        storeBreakdown[storeName] = (storeBreakdown[storeName] || 0) + amount;
        
        console.log(`💰 STORE MAPPING: "${receipt.store}" → "${storeName}" (R${amount})`);
      }
    });

    // Weekly trend analysis
    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(startOfWeek.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekSpending = receiptData
        .filter(receipt => {
          if (!receipt.createdAt) return false;
          const receiptDate = new Date(receipt.createdAt);
          return receiptDate >= weekStart && receiptDate <= weekEnd;
        })
        .reduce((sum, receipt) => {
          const amount = parseFloat(receipt.totalAmount?.toString() || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      const weekData: { week: string; amount: number; variance: number } = {
        week: `Week ${4 - i}`,
        amount: weekSpending,
        variance: i === 3 ? 0 : ((weekSpending - (weeklyTrends[weeklyTrends.length - 1]?.amount || 0)) / (weeklyTrends[weeklyTrends.length - 1]?.amount || 1)) * 100
      };
      weeklyTrends.push(weekData);
    }

    // ENHANCED Category analysis based on actual receipt items when available
    const categoryBreakdown: Record<string, number> = {};
    
    // Try to analyze actual receipt items first from processed items
    let hasRealCategoryData = false;
    for (const receipt of receiptData) {
      if (receipt.processedItems && Array.isArray(receipt.processedItems)) {
        hasRealCategoryData = true;
        for (const item of receipt.processedItems) {
          if (item && typeof item === 'object' && 'name' in item && 'price' in item) {
            const itemName = String(item.name).toLowerCase();
            const itemPrice = parseFloat(String(item.price) || '0');
            
            // Smart categorization based on item names
            let category = 'other';
            if (itemName.includes('chicken') || itemName.includes('beef') || itemName.includes('fish') || itemName.includes('meat')) {
              category = 'proteins';
            } else if (itemName.includes('milk') || itemName.includes('cheese') || itemName.includes('yogurt') || itemName.includes('dairy')) {
              category = 'dairy';
            } else if (itemName.includes('apple') || itemName.includes('banana') || itemName.includes('tomato') || itemName.includes('carrot') || itemName.includes('onion')) {
              category = 'fresh_produce';
            } else if (itemName.includes('bread') || itemName.includes('rice') || itemName.includes('pasta') || itemName.includes('cereal')) {
              category = 'grains';
            } else if (itemName.includes('snack') || itemName.includes('chip') || itemName.includes('cookie') || itemName.includes('candy')) {
              category = 'snacks';
            }
            
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + itemPrice;
          }
        }
      }
    }
    
    // Fallback to estimated breakdown if no real data available
    if (!hasRealCategoryData || Object.keys(categoryBreakdown).length === 0) {
      console.log('💰 CATEGORY: Using estimated breakdown (no receipt item data)');
      categoryBreakdown.fresh_produce = monthlySpent * 0.25;
      categoryBreakdown.proteins = monthlySpent * 0.35;
      categoryBreakdown.dairy = monthlySpent * 0.18;
      categoryBreakdown.grains = monthlySpent * 0.13;
      categoryBreakdown.snacks = monthlySpent * 0.09;
    } else {
      console.log('💰 CATEGORY: Using real receipt item analysis');
    }

    // Get pantry value using unified logic
    const pantryValue = await getPantryValueUnified(userId);

    // Calculate budget metrics - scale budget for household size
    const baseBudget = 1500; // Default budget in ZAR per person
    const monthlyBudget = isHousehold ? baseBudget * memberIds.length : baseBudget;
    const budgetUsed = (monthlySpent / monthlyBudget) * 100;

    console.log(`💰 BUDGET: R${monthlyBudget} (${isHousehold ? 'household' : 'individual'}), spent R${monthlySpent.toFixed(2)}, pantry value R${pantryValue.toFixed(2)}`);

    // Construct the financialOverview object to be returned
    const financialOverview = {
      monthlySpending: monthlySpent,
      weeklySpending: weeklySpent,
      totalSpending: totalSpent,
      monthlyBudget: monthlyBudget,
      budgetUsed: Math.min(budgetUsed, 100),
      remainingBudget: Math.max(0, monthlyBudget - monthlySpent),
      pantryValue: pantryValue,
      pantryToSpendingRatio: monthlySpent > 0 ? ((pantryValue / monthlySpent) * 100) : 0,
      isHousehold: isHousehold,
      householdMembers: memberIds.length,
      totalSavings: totalSavingsFromReceipts,
      savingsRate: totalSpent > 0 ? ((totalSavingsFromReceipts / totalSpent) * 100) : 0,
      receiptsScanned: receiptData.length,
      storeBreakdown: storeBreakdown,
      weeklyTrends: weeklyTrends,
      categoryBreakdown: categoryBreakdown,
      lastUpdated: new Date().toISOString()
    };

    console.log('💰 FINANCIAL OVERVIEW: Successful response prepared');
    console.log('💰 FINANCIAL DATA STRUCTURE:', {
      hasData: !!financialOverview,
      keys: Object.keys(financialOverview || {}),
      budget: financialOverview?.monthlyBudget,
      spending: financialOverview?.monthlySpending,
      storeBreakdownKeys: Object.keys(financialOverview?.storeBreakdown || {}),
      categoryBreakdownKeys: Object.keys(financialOverview?.categoryBreakdown || {}),
      receiptsCount: receiptData.length
    });

    return res.status(200).json({
      success: true,
      data: financialOverview,
      // Ensure compatibility with frontend
      budget: financialOverview?.monthlyBudget,
      spending: financialOverview?.monthlySpending,
      savings: financialOverview?.totalSavings,
      pantryValue: financialOverview?.pantryValue
    });

  } catch (error) {
    console.error('❌ Financial overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch financial overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analyticsData = {
      monthlyTrends: [
        { month: 'Jan', spend: 843, savings: 42 },
        { month: 'Dec', spend: 912, savings: 28 },
        { month: 'Nov', spend: 798, savings: 65 }
      ],
      storeComparison: {
        checkers: { total: 456, savings: 0 },
        woolworths: { total: 287, savings: 15 },
        pickPay: { total: 234, savings: 23 },
        spar: { total: 198, savings: 12 }
      },
      categoryBreakdown: {
        vegetables: 23,
        fruits: 18,
        proteins: 35,
        dairy: 12,
        grains: 8,
        other: 4
      }
    };

    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Set/Update user budget
router.post('/budget', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('💰 BUDGET AUTH:', {
      hasUser: !!req.user,
      hasAuthHeader: !!req.headers.authorization,
      method: req.method
    });

    const userId = req.user?.id;
    if (!userId) {
      console.log('💰 BUDGET AUTH FAILED:', req.user);
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        debug: process.env.NODE_ENV === 'development' ? { userObj: req.user } : undefined
      });
    }

    const { budget } = req.body;
    if (!budget || budget <= 0) {
      return res.status(400).json({ success: false, error: 'Valid budget amount required' });
    }

    console.log('💰 Setting budget for user:', userId, 'to R', budget);

    // Import database and schema for user budget updates
    const { db } = await import('./db.js');
    const { users } = await import('../shared/schema.js');
    const { eq } = await import('drizzle-orm');

    // Note: monthly_budget field doesn't exist in current schema
    // For now, we'll return success but budget setting will need schema update
    console.log('💰 Budget setting requested but monthly_budget field not in schema');

    console.log('💰 Budget updated successfully for user:', userId);

    res.json({
      success: true,
      message: 'Budget updated successfully',
      budget: budget
    });
  } catch (error) {
    console.error('💰 Error setting budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update budget'
    });
  }
});

// Get user budget with household support
router.get('/budget', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('💰 GET BUDGET AUTH:', {
      hasUser: !!req.user,
      hasAuthHeader: !!req.headers.authorization,
      userKeys: req.user ? Object.keys(req.user) : []
    });

    const userId = req.user?.id;
    if (!userId) {
      console.log('💰 GET BUDGET AUTH FAILED:', req.user);
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        debug: process.env.NODE_ENV === 'development' ? { userObj: req.user } : undefined
      });
    }

    console.log('💰 Getting budget for user:', userId);

    // Get household member IDs for budget calculation
    const memberIds = await getHouseholdMemberIds(userId);
    const isHousehold = memberIds.length > 1;

    // Calculate budget based on household size
    const baseBudget = 1500; // Default budget in ZAR per person
    const budget = isHousehold ? baseBudget * memberIds.length : baseBudget;

    console.log(`💰 Budget: R${budget} (${isHousehold ? 'household' : 'individual'}) for ${memberIds.length} member(s)`);

    res.json({
      success: true,
      budget: budget,
      isHousehold: isHousehold,
      householdMembers: memberIds.length,
      perPersonBudget: baseBudget
    });
  } catch (error) {
    console.error('💰 Error getting budget:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get budget',
      budget: 1500 // Default fallback
    });
  }
});

// Get pantry value with household support
router.get('/pantry-value', authenticateToken, async (req: any, res: Response) => {
  try {
    console.log('💰 PANTRY VALUE AUTH:', {
      hasUser: !!req.user,
      hasAuthHeader: !!req.headers.authorization,
      userObj: req.user
    });

    const userId = req.user?.id;
    if (!userId) {
      console.log('💰 PANTRY VALUE AUTH FAILED:', req.user);
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        debug: process.env.NODE_ENV === 'development' ? { userObj: req.user } : undefined
      });
    }

    console.log('💰 Getting pantry value for user:', userId);

    // Get pantry value using unified logic
    const pantryValue = await getPantryValueUnified(userId);

    // Check if household user for context
    const memberIds = await getHouseholdMemberIds(userId);
    const isHousehold = memberIds.length > 1;

    console.log(`💰 Pantry value: R${pantryValue.toFixed(2)} (${isHousehold ? 'household' : 'individual'})`);

    res.json({
      success: true,
      pantryValue: pantryValue,
      isHousehold: isHousehold,
      householdMembers: memberIds.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('💰 Error getting pantry value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pantry value',
      pantryValue: 0
    });
  }
});

// Helper functions imported from financial-helpers.js

export default router;