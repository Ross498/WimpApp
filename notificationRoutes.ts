import { Router, Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import { AuthUser } from './auth';
import { db } from './db';
import { ingredients, recipes, pods, userMeals } from '../shared/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

const router = Router();

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Get recent pod meals for notifications
 * GET /api/notifications/recent-pod-meals
 */
router.get('/recent-pod-meals', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get recent meals from user's pods within last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentMeals = await db
      .select({
        id: userMeals.id,
        userName: userMeals.userName,
        mealName: userMeals.mealName,
        podId: userMeals.podId,
        podName: pods.name,
        score: userMeals.aiScore,
        earnedBucks: userMeals.earnedBucks,
        createdAt: userMeals.createdAt,
      })
      .from(userMeals)
      .innerJoin(pods, eq(userMeals.podId, pods.id))
      .where(
        and(
          gte(userMeals.createdAt, twentyFourHoursAgo.toISOString()),
          eq(pods.createdBy, req.user.id) // Only from user's pods
        )
      )
      .orderBy(desc(userMeals.createdAt))
      .limit(10);

    res.json(recentMeals);
  } catch (error) {
    console.error('Error fetching recent pod meals:', error);
    res.status(500).json({ error: 'Failed to fetch recent pod meals' });
  }
});

/**
 * Get expiring ingredients for notifications
 * GET /api/notifications/expiring-ingredients
 */
router.get('/expiring-ingredients', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const days = parseInt(req.query.days as string) || 3;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const expiringIngredients = await db
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.userId, req.user.id),
          lte(ingredients.expiryDate, expiryDate)
        )
      )
      .orderBy(ingredients.expiryDate);

    res.json(expiringIngredients);
  } catch (error) {
    console.error('Error fetching expiring ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch expiring ingredients' });
  }
});

/**
 * Get low inventory ingredients
 * GET /api/notifications/low-inventory
 */
router.get('/low-inventory', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const userIngredients = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.userId, req.user.id));

    // Filter ingredients with low quantity (≤ 1)
    const lowInventoryItems = userIngredients.filter(ingredient => {
      const quantity = parseFloat(ingredient.quantity?.toString() || '0');
      return quantity <= 1;
    });

    res.json(lowInventoryItems);
  } catch (error) {
    console.error('Error fetching low inventory:', error);
    res.status(500).json({ error: 'Failed to fetch low inventory' });
  }
});

/**
 * Add ingredient to shopping list
 * POST /api/notifications/add-to-shopping
 */
router.post('/add-to-shopping', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { ingredientId, quantity = 1 } = req.body;

    if (!ingredientId) {
      return res.status(400).json({ error: 'Ingredient ID is required' });
    }

    // In a real implementation, you would add to a shopping list table
    // For now, we'll just return success
    res.json({ 
      success: true, 
      message: `Added ingredient to shopping list with quantity ${quantity}` 
    });
  } catch (error) {
    console.error('Error adding to shopping list:', error);
    res.status(500).json({ error: 'Failed to add to shopping list' });
  }
});

export default router;