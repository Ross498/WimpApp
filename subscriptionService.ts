import { db } from './db';
import { users, aiUsageTracking, subscriptionPlans } from '../shared/schema.js';
import { eq, and, gte, lt } from 'drizzle-orm';

export interface SubscriptionLimits {
  mealGeneration: number;
  freeformAnalysis: number;
  complexSearch: number;
  inventChallengeWeekly: number;
  wasteReduction: number;
  flavorPairing: number;
  mealOfWeek: boolean;
}

export interface UsageStatus {
  canUse: boolean;
  remaining: number;
  limit: number;
  resetDate: Date;
  requiresUpgrade: boolean;
}

/**
 * Check if user can use a specific AI feature
 */
export async function checkAIUsageLimit(
  userId: number,
  featureType: 'meal_generation' | 'freeform_analysis' | 'complex_search' | 'invent_challenge' | 'waste_reduction' | 'flavor_pairing'
): Promise<UsageStatus> {
  if (!db) throw new Error('Database not available');

  // Get user subscription tier
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');

  // Get subscription limits - handle null subscription tier
  const limits = await getSubscriptionLimits(user.subscriptionTier || 'free');

  // Calculate current period boundaries
  const now = new Date();
  const { weekStart, monthStart } = getCurrentPeriods(now);

  // Get current usage for this feature and period
  const periodStart = featureType === 'invent_challenge' ? weekStart : weekStart; // All are weekly for now

  // Simplified usage tracking - temporarily skip until schema is fixed
  const usage = null;

  const currentUsage = usage?.usageCount || 0;
  let featureLimit = 0;

  // Get feature-specific limit
  switch (featureType) {
    case 'meal_generation':
      featureLimit = limits.mealGeneration;
      break;
    case 'freeform_analysis':
      featureLimit = limits.freeformAnalysis;
      break;
    case 'complex_search':
      featureLimit = limits.complexSearch;
      break;
    case 'invent_challenge':
      featureLimit = limits.inventChallengeWeekly;
      break;
    case 'waste_reduction':
      featureLimit = limits.wasteReduction;
      break;
    case 'flavor_pairing':
      featureLimit = limits.flavorPairing;
      break;
  }

  // Premium users have unlimited access (represented by -1)
  const isPremium = user.subscriptionTier === 'premium' || user.subscriptionTier === 'pro';
  const remaining = isPremium ? -1 : Math.max(0, featureLimit - currentUsage);

  // Calculate reset date (next Monday for weekly limits)
  const resetDate = new Date(weekStart);
  resetDate.setDate(resetDate.getDate() + 7);

  return {
    canUse: isPremium || remaining > 0,
    remaining: remaining,
    limit: isPremium ? -1 : featureLimit,
    requiresUpgrade: !isPremium && remaining <= 0,
    resetDate: isPremium ? undefined : resetDate
  };
}

/**
 * Record AI feature usage
 */
export async function recordAIUsage(
  userId: number,
  featureType: 'meal_generation' | 'freeform_analysis' | 'complex_search' | 'invent_challenge' | 'waste_reduction' | 'flavor_pairing'
): Promise<void> {
  if (!db) throw new Error('Database not available');

  const now = new Date();
  const { weekStart, monthStart } = getCurrentPeriods(now);

  // Simplified usage tracking - temporarily skip until schema is fixed
  console.log(`🔢 Would record usage: ${featureType} for user ${userId}`);
}

/**
 * Get subscription limits for a tier
 */
export async function getSubscriptionLimits(tier: string): Promise<SubscriptionLimits> {
  // Default limits for free tier
  const freeLimits: SubscriptionLimits = {
    mealGeneration: 3, // 3 AI meals per week
    freeformAnalysis: 5, // 5 photo analyses per week
    complexSearch: 14, // 2 per day * 7 days
    inventChallengeWeekly: 1, // 1 invent challenge per week
    wasteReduction: 0, // Premium only
    flavorPairing: 2, // 2 flavor pairing queries per week
    mealOfWeek: true // Free but requires 3 meals completion
  };

  const premiumLimits: SubscriptionLimits = {
    mealGeneration: -1, // Unlimited
    freeformAnalysis: -1, // Unlimited
    complexSearch: -1, // Unlimited
    inventChallengeWeekly: -1, // Unlimited
    wasteReduction: -1, // Unlimited
    flavorPairing: -1, // Unlimited
    mealOfWeek: true // Available
  };

  switch (tier) {
    case 'premium':
    case 'pro':
      return premiumLimits;
    case 'free':
    default:
      return freeLimits;
  }
}

/**
 * Get current week and month start dates
 */
function getCurrentPeriods(date: Date) {
  // Get Monday of current week (week start)
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  // Get first day of current month
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  return { weekStart, monthStart };
}

/**
 * Get user's current subscription status and usage summary
 */
export async function getUserSubscriptionStatus(userId: number): Promise<{
  tier: string;
  isActive: boolean;
  endDate?: Date;
  usageSummary: {
    mealGeneration: UsageStatus;
    freeformAnalysis: UsageStatus;
    complexSearch: UsageStatus;
    inventChallenge: UsageStatus;
    wasteReduction: UsageStatus;
    flavorPairing: UsageStatus;
  };
}> {
  if (!db) throw new Error('Database not available');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');

  const isActive = user.subscriptionTier !== 'free' &&
    (!user.subscriptionEndDate || user.subscriptionEndDate > new Date());

  // Get usage status for all AI features
  const [mealGeneration, freeformAnalysis, complexSearch, inventChallenge, wasteReduction, flavorPairing] = await Promise.all([
    checkAIUsageLimit(userId, 'meal_generation'),
    checkAIUsageLimit(userId, 'freeform_analysis'),
    checkAIUsageLimit(userId, 'complex_search'),
    checkAIUsageLimit(userId, 'invent_challenge'),
    checkAIUsageLimit(userId, 'waste_reduction'),
    checkAIUsageLimit(userId, 'flavor_pairing')
  ]);

  return {
    tier: user.subscriptionTier,
    isActive,
    endDate: user.subscriptionEndDate || undefined,
    usageSummary: {
      mealGeneration,
      freeformAnalysis,
      complexSearch,
      inventChallenge,
      wasteReduction,
      flavorPairing
    }
  };
}

/**
 * Upgrade user subscription
 */
export async function upgradeUserSubscription(
  userId: number,
  newTier: 'premium' | 'pro',
  duration: 'monthly' | 'yearly'
): Promise<void> {
  if (!db) throw new Error('Database not available');

  const now = new Date();
  const endDate = new Date(now);

  // Calculate subscription end date
  if (duration === 'monthly') {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const renewsAt = new Date(endDate);
  renewsAt.setDate(renewsAt.getDate() - 3); // Renew 3 days before expiry

  await db
    .update(users)
    .set({
      subscriptionTier: newTier,
      subscriptionEndDate: endDate,
      subscriptionRenewsAt: renewsAt
    })
    .where(eq(users.id, userId));
}

/**
 * Initialize subscription plans in database
 */
export async function seedSubscriptionPlans(): Promise<void> {
  if (!db) throw new Error('Database not available');

  const plans = [
    {
      planName: 'free',
      displayName: 'Free Chef',
      monthlyPrice: '0.00',
      yearlyPrice: '0.00',
      features: [
        '3 AI meal generations per week',
        '5 meal photo analyses per week',
        '2 AI searches per day',
        '1 invent challenge per week',
        '2 flavor pairing queries per week',
        'Meal of the Week (requires 3 meals)',
        'Unlimited 1v1 challenges',
        'Basic ingredient management'
      ],
      aiLimits: {
        mealGeneration: 3,
        freeformAnalysis: 5,
        complexSearch: 14,
        inventChallengeWeekly: 1,
        mealOfWeek: false
      }
    },
    {
      planName: 'premium',
      displayName: 'Premium Chef',
      monthlyPrice: '49.99', // ZAR
      yearlyPrice: '499.99', // ZAR (2 months free)
      features: [
        'Unlimited AI meal generations',
        'Unlimited meal photo analyses',
        'Unlimited AI searches',
        'Unlimited invent challenges',
        'Unlimited flavor pairing queries',
        'Waste Reduction AI (smart expiry alerts)',
        'Premium mastery ingredients',
        'Weekly Meal of the Week feature',
        'Priority AI processing',
        'Advanced recipe customization',
        'Export recipes to PDF'
      ],
      aiLimits: {
        mealGeneration: -1,
        freeformAnalysis: -1,
        complexSearch: -1,
        inventChallengeWeekly: -1,
        mealOfWeek: true
      }
    }
  ];

  for (const plan of plans) {
    try {
      await db
        .insert(subscriptionPlans)
        .values(plan)
        .onConflictDoNothing();
    } catch (error) {
      // Plan might already exist, continue
      console.log(`Subscription plan ${plan.planName} already exists`);
    }
  }

  console.log('Subscription plans seeded successfully');
}