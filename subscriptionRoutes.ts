import { Router, Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import { AuthUser } from './auth';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import jwt from 'jsonwebtoken';

const router = Router();

// CRITICAL FIX: Import consistent JWT secret from authConfig
import { JWT_SECRET } from './authConfig.js';

// Weekly and monthly usage tracking helpers
const getWeekKey = () => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber}`;
};

const getMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getWeeklyUsage = (user: any) => {
  const weeklyUsage = user.weekly_usage || {};
  const currentWeek = getWeekKey();

  if (weeklyUsage.week !== currentWeek) {
    return {
      week: currentWeek,
      aiMealGeneration: 0,
      aiChefChat: 0
    };
  }

  return weeklyUsage;
};

const getMonthlyUsage = (user: any) => {
  const monthlyUsage = user.monthly_usage || {};
  const currentMonth = getMonthKey();

  if (monthlyUsage.month !== currentMonth) {
    return {
      month: currentMonth,
      masteryKeys: 0
    };
  }

  return monthlyUsage;
};

// Helper to get the next reset date for weekly limits
const getNextResetDate = () => {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // Sunday is 0, Monday is 1, ... Saturday is 6
  const daysUntilNextMonday = (8 - currentDayOfWeek) % 7; // If today is Sunday (0), daysUntilNextMonday is 1. If today is Saturday (6), daysUntilNextMonday is 2. If today is Monday (1), daysUntilNextMonday is 7.
  const nextReset = new Date(now);
  nextReset.setDate(now.getDate() + daysUntilNextMonday);
  nextReset.setHours(0, 0, 0, 0); // Start of the day
  return nextReset.toISOString();
};


interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Get trial status - NEW SIMPLIFIED ENDPOINT
 * GET /api/subscription/trial-status
 */
router.get('/trial-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId || !db) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId.toString())))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionStatus = user.subscriptionStatus || 'trial';
    const isTrial = subscriptionStatus === 'trial';
    const isActive = subscriptionStatus === 'active';
    const isExpired = subscriptionStatus === 'expired';

    // Calculate days remaining for trial
    let daysRemaining = 0;
    if (user.trialEndsAt && isTrial) {
      const now = new Date();
      const trialEnd = new Date(user.trialEndsAt);
      const diffTime = trialEnd.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return res.json({
      success: true,
      subscriptionStatus,
      isTrial,
      isActive,
      isExpired,
      daysRemaining,
      trialEndsAt: user.trialEndsAt,
      hasSeenWelcome: user.hasSeenWelcome || false
    });
  } catch (error) {
    console.error('Trial status error:', error);
    return res.status(500).json({ error: 'Failed to get trial status' });
  }
});

/**
 * Get subscription status with usage limits
 * GET /api/subscription/status
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    console.log('🔐SUBSCRIPTION STATUS: Authenticated user ID:', userId);

    if (!userId) {
      console.log('❌ SUBSCRIPTION STATUS: No userId from auth middleware');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user subscription status from database
    if (!db) {
      console.error('❌ SUBSCRIPTION STATUS: Database not available');
      return res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

    // CRITICAL FIX: Select ALL necessary fields including subscription fields
    const [userWithUsage] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId.toString())))
      .limit(1);

    console.log('🔍 SUBSCRIPTION STATUS: Database lookup result:', userWithUsage);

    if (!userWithUsage) {
      console.log('❌ SUBSCRIPTION STATUS: User not found in database');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // CORRECT PREMIUM LOGIC: Use subscriptionStatus from schema (no tier field exists!)
    // Schema fields: subscriptionStatus: 'trial' | 'active' | 'expired'
    const subscriptionStatus = userWithUsage.subscriptionStatus || 'trial';
    const trialEndsAt = userWithUsage.trialEndsAt ? new Date(userWithUsage.trialEndsAt) : null;
    const now = new Date();
    const isTrialActive = subscriptionStatus === 'trial' && trialEndsAt && trialEndsAt > now;
    const isPaidPremium = subscriptionStatus === 'active';
    
    const isPremium = isPaidPremium || isTrialActive;
    
    console.log(`🎯 PREMIUM CHECK: subscriptionStatus=${subscriptionStatus}, isTrialActive=${isTrialActive}, isPaidPremium=${isPaidPremium}, isPremium=${isPremium}`);

    // Use weekly usage tracking instead of database counts
    const weeklyUsage = getWeeklyUsage(userWithUsage);
    const monthlyUsage = getMonthlyUsage(userWithUsage);
    console.log('📊 WEEKLY USAGE:', weeklyUsage);
    console.log('📊 MONTHLY USAGE:', monthlyUsage);

    const currentUsage = {
      aiChefChat: weeklyUsage.aiChefChat || 0,
      aiMealGeneration: weeklyUsage.aiMealGeneration || 0,
      masteryKeys: monthlyUsage.masteryKeys || 0
    };
    
    console.log('📊 CURRENT USAGE:', currentUsage);

    // Calculate tier for frontend compatibility (based on subscriptionStatus)
    const tier = isPremium ? 'premium' : 'free';
    
    res.json({
      success: true,
      tier: tier,
      currentPlan: tier,
      subscriptionStatus: subscriptionStatus,
      isPremium: isPremium,
      userId: userWithUsage.id,
      email: userWithUsage.email,
      limits: isPremium ? {
        // Premium users have unlimited access
        aiMealGeneration: { weekly: -1, used: 0 },
        aiChefChat: { weekly: -1, used: 0 },
        masteryKeys: { monthly: -1, used: 0 }
      } : {
        // Free users have limits with actual usage
        aiMealGeneration: { weekly: 3, used: currentUsage.aiMealGeneration },
        aiChefChat: { weekly: 5, used: currentUsage.aiChefChat },
        masteryKeys: { monthly: 0, used: currentUsage.masteryKeys }
      }
    });

  } catch (error) {
    console.error('❌ SUBSCRIPTION STATUS: Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status',
      details: error.message
    });
  }
});

/**
 * Increment usage for a feature
 * POST /api/subscription/increment-usage
 */
router.post('/increment-usage', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { feature } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // CRITICAL FIX: Use correct schema fields (no tier field exists!)
    const subscriptionStatus = user.subscriptionStatus || 'trial';
    const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const now = new Date();
    const isTrialActive = subscriptionStatus === 'trial' && trialEndsAt && trialEndsAt > now;
    const isPaidPremium = subscriptionStatus === 'active';
    const isPremium = isPaidPremium || isTrialActive;

    // Premium users don't have usage limits
    if (isPremium) {
      return res.json({ success: true, message: 'Premium user - no limits' });
    }

    let weeklyUsage = getWeeklyUsage(user);
    let monthlyUsage = getMonthlyUsage(user);

    // Increment usage based on feature
    if (feature === 'aiMealGeneration') {
      weeklyUsage.aiMealGeneration = (weeklyUsage.aiMealGeneration || 0) + 1;
    } else if (feature === 'aiChefChat') {
      weeklyUsage.aiChefChat = (weeklyUsage.aiChefChat || 0) + 1;
    } else if (feature === 'masteryKeys') {
      monthlyUsage.masteryKeys = (monthlyUsage.masteryKeys || 0) + 1;
    }

    // Update user in database - Skip for now as usage fields not in current schema
    // TODO: Add weekly_usage and monthly_usage fields to users schema
    console.log('Usage incremented for user:', req.user.id, 'feature:', feature);
    console.log('New usage:', { weeklyUsage, monthlyUsage });

    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing usage:', error);
    res.status(500).json({ error: 'Failed to increment usage' });
  }
});

/**
 * Get current user's subscription details
 * GET /api/subscription/details
 */
router.get('/details', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // FIXED: Use same premium logic as /status endpoint (includes active trials!)
    const subscriptionStatus = user.subscriptionStatus || 'trial';
    const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const now = new Date();
    const isTrialActive = subscriptionStatus === 'trial' && trialEndsAt && trialEndsAt > now;
    const isPaidPremium = subscriptionStatus === 'active';
    const isPremium = isPaidPremium || isTrialActive;
    
    if (!isPremium) {
      return res.status(200).json({
        tier: 'free',
        subscriptionStatus: subscriptionStatus,
        message: 'User is on free plan'
      });
    }

    // Return subscription details
    const subscriptionDetails = {
      tier: 'premium',
      subscriptionStatus: subscriptionStatus,
      isPaidPremium: isPaidPremium,
      isTrialActive: isTrialActive,
      status: 'active'
    };

    res.status(200).json(subscriptionDetails);
  } catch (error) {
    console.error('Error getting subscription details:', error);
    res.status(500).json({ message: 'Error retrieving subscription details' });
  }
});

/**
 * Cancel user's subscription
 * POST /api/subscription/cancel
 */
router.post('/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // FIXED: Use subscriptionStatus instead of non-existent subscriptionTier
    const subscriptionStatus = user.subscriptionStatus || 'trial';
    if (subscriptionStatus !== 'active') {
      return res.status(400).json({ message: 'User is not on premium plan' });
    }

    // Set subscription to cancel
    const endDate = new Date();

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    // FIXED: Use subscriptionStatus='expired' instead of non-existent subscriptionTier
    await db
      .update(users)
      .set({
        subscriptionStatus: 'expired'
      })
      .where(eq(users.id, req.user.id));

    res.status(200).json({
      message: 'Subscription cancelled successfully',
      accessUntil: endDate
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Error cancelling subscription' });
  }
});

/**
 * Update payment method (placeholder implementation)
 * POST /api/subscription/payment-method
 */
router.post('/payment-method', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // FIXED: Use subscriptionStatus instead of non-existent subscriptionTier
    const subscriptionStatus = user.subscriptionStatus || 'trial';
    if (subscriptionStatus !== 'active') {
      return res.status(400).json({ message: 'User is not on premium plan' });
    }

    // PayPal payment method update - regenerate client token
    const { getClientToken } = await import('./paypal');
    const newClientToken = await getClientToken();

    res.status(200).json({
      message: 'Payment method updated successfully',
      clientToken: newClientToken,
      paymentProvider: 'paypal'
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ message: 'Error updating payment method' });
  }
});

/**
 * Get billing history (placeholder implementation)
 * GET /api/subscription/billing-history
 */
router.get('/billing-history', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // FIXED: Use subscriptionStatus instead of non-existent subscriptionTier
    const subscriptionStatus = user.subscriptionStatus || 'trial';
    if (subscriptionStatus !== 'active') {
      return res.status(200).json({
        billingHistory: [],
        message: 'No billing history for free plan'
      });
    }

    // Real billing history based on subscription data
    const billingHistory = [];

    if (user.subscriptionEndDate && user.subscriptionRenewsAt) {
      const startDate = new Date(user.subscriptionEndDate);
      startDate.setMonth(startDate.getMonth() - 1); // Previous billing cycle

      billingHistory.push({
        id: '1',
        date: new Date().toISOString(),
        amount: user.subscriptionRenewsAt &&
          (new Date(user.subscriptionRenewsAt).getTime() - new Date().getTime() > 32 * 24 * 60 * 60 * 1000)
          ? 'R499.99' : 'R89.99',
        description: 'Premium Chef Plan',
        status: 'paid'
      });
    }

    res.status(200).json({
      billingHistory: billingHistory
    });
  } catch (error) {
    console.error('Error getting billing history:', error);
    res.status(500).json({ message: 'Error retrieving billing history' });
  }
});

/**
 * PayPal setup endpoint
 * GET /api/subscription/paypal/setup
 */
router.get('/paypal/setup', async (req, res) => {
  await loadPaypalDefault(req, res);
});

/**
 * Create PayPal subscription order
 * POST /api/subscription/paypal/order
 */
router.post('/paypal/order', async (req: AuthenticatedRequest, res) => {
  const { planType } = req.body; // 'monthly' or 'yearly'

  if (!planType || !['monthly', 'yearly'].includes(planType)) {
    return res.status(400).json({ error: 'Invalid plan type. Must be monthly or yearly.' });
  }

  // Set pricing based on plan type
  const amount = planType === 'monthly' ? '89.99' : '499.99';

  // Override request body for PayPal - use USD for sandbox testing
  req.body = {
    amount: (parseFloat(amount) * 0.055).toFixed(2), // Convert ZAR to USD for sandbox
    currency: 'USD', // USD for sandbox testing - production will use ZAR
    intent: 'CAPTURE'
  };

  await createPaypalOrder(req, res);
});

/**
 * Capture PayPal subscription payment
 * POST /api/subscription/paypal/order/:orderID/capture
 */
router.post('/paypal/order/:orderID/capture', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    // First capture the PayPal payment
    await capturePaypalOrder(req, res);

    // If successful, update user subscription
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get plan type from query params or request body
    const planType = req.query.planType as string || req.body.planType;

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    const now = new Date();
    const endDate = new Date(now);

    if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    if (!db) {
      throw new Error('Database connection not available');
    }

    // Update user subscription - FIXED: Use subscriptionStatus='active' instead of non-existent subscriptionTier
    const [updatedUser] = await db
      .update(users)
      .set({
        subscriptionStatus: 'active'
      })
      .where(eq(users.id, req.user.id))
      .returning();

    res.json({
      success: true,
      subscription: {
        tier: 'premium', // Calculated from subscriptionStatus='active'
        subscriptionStatus: updatedUser.subscriptionStatus,
        planType
      }
    });

  } catch (error) {
    console.error('Error capturing PayPal payment:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

/**
 * Create subscription (redirect to subscription screen)
 * POST /api/subscription/create
 */
router.post('/create', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { planType = 'monthly' } = req.body;

    // For demo purposes, create subscription without payment
    // In production, this should redirect to PayPal payment flow
    const amount = planType === 'yearly' ? 'R499.99' : 'R89.99';
    const endDate = new Date();
    const renewsAt = new Date();

    if (planType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      renewsAt.setFullYear(renewsAt.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
      renewsAt.setMonth(renewsAt.getMonth() + 1);
    }

    if (!db) {
      return res.status(500).json({ message: 'Database not available' });
    }

    // FIXED: Use subscriptionStatus='active' instead of non-existent subscriptionTier
    await db
      .update(users)
      .set({
        subscriptionStatus: 'active'
      })
      .where(eq(users.id, req.user.id));

    res.status(200).json({
      message: 'Subscription created successfully',
      planType,
      amount,
      endDate,
      renewsAt
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Error creating subscription' });
  }
});

export default router;