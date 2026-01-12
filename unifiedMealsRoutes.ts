import type { Express, Request } from "express";
import { UnifiedMealsService } from "./unifiedMealsService.js";
import { authenticateToken, optionalAuth, AuthenticatedUser } from "./authMiddleware";

// Extend Request type with proper user interface from auth middleware
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Unified Meals Routes - Provides aggregated access to all recipe sources
 * Replaces the confusing custom-recipes endpoint with proper data separation
 */
export function registerUnifiedMealsRoutes(app: Express) {
  
  /**
   * GET /api/meals/unified
   * Returns aggregated recipes from all sources available to the user
   * - Shared recipes (original 56)
   * - User AI recipes  
   * - User custom recipes
   * - User scanned recipes
   * - User mastery recipes
   */
  app.get('/api/meals/unified', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Extract user ID from request (optional for guests)
      const userId = req.user?.id;
      const isGuest = !userId;
      
      if (isGuest) {
        console.log('🔓 GUEST ACCESS: Serving shared recipes only');
      }

      // Parse query parameters
      const page = parseInt(req.query.page as string) || 0;
      // Allow guests to see all shared recipes (up to 100), authenticated users get their full recipe set
      const requestedLimit = parseInt(req.query.limit as string) || (isGuest ? 50 : 100);
      const limit = isGuest ? Math.min(requestedLimit, 50) : Math.min(requestedLimit, 200);
      const offset = page * limit;
      const category = req.query.category as string;
      const search = req.query.search as string;

      console.log(`🍽️ UNIFIED MEALS: Getting meals for ${isGuest ? 'guest' : `user ${userId}`}, page ${page}, limit ${limit}`);

      // Get unified meals (shared only for guests, full access for authenticated users)
      const result = isGuest 
        ? await UnifiedMealsService.getSharedRecipesOnly({ limit, offset, category, search })
        : await UnifiedMealsService.getAllUserMeals(userId, { limit, offset, category, search });

      console.log(`🍽️ UNIFIED MEALS: Found ${result.total} total recipes, returning ${result.recipes.length} ${isGuest ? '(guest - shared only)' : '(authenticated - full access)'}`);

      res.json({
        success: true,
        recipes: result.recipes,
        total: result.total,
        page,
        limit,
        hasMore: (offset + result.recipes.length) < result.total,
        sources: {
          shared: result.recipes.filter(r => r.source === 'shared').length,
          ai: result.recipes.filter(r => r.source === 'ai').length,
          custom: result.recipes.filter(r => r.source === 'custom').length,
          scanned: result.recipes.filter(r => r.source === 'scanned').length,
          mastery: result.recipes.filter(r => r.source === 'mastery').length
        },
        isGuest
      });

    } catch (error) {
      console.error('Error in unified meals endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch meals',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/meals/unified/:id
   * Get a specific recipe by unified ID
   */
  app.get('/api/meals/unified/:id', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const unifiedId = req.params.id;
      const isGuest = !userId;

      console.log(`🍽️ UNIFIED MEALS: Getting recipe ${unifiedId} for ${isGuest ? 'guest' : `user ${userId}`}`);
      
      // For guests, only allow access to shared recipes
      if (isGuest && !unifiedId.startsWith('shared-')) {
        return res.status(404).json({ 
          success: false, 
          error: 'Recipe not found' 
        });
      }

      const recipe = await UnifiedMealsService.getRecipeById(unifiedId, userId);

      if (!recipe) {
        return res.status(404).json({ 
          success: false, 
          error: 'Recipe not found' 
        });
      }

      res.json({
        success: true,
        recipe
      });

    } catch (error) {
      console.error('Error fetching unified recipe:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch recipe' 
      });
    }
  });

  /**
   * GET /api/meals/stats
   * Get recipe statistics by source
   */
  app.get('/api/meals/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      const result = await UnifiedMealsService.getAllUserMeals(userId, { limit: 1000 });

      const stats = {
        total: result.total,
        bySource: {
          shared: result.recipes.filter(r => r.source === 'shared').length,
          ai: result.recipes.filter(r => r.source === 'ai').length,
          custom: result.recipes.filter(r => r.source === 'custom').length,
          scanned: result.recipes.filter(r => r.source === 'scanned').length,
          mastery: result.recipes.filter(r => r.source === 'mastery').length
        }
      };

      console.log(`🍽️ UNIFIED MEALS STATS: User ${userId}:`, stats);

      res.json({
        success: true,
        stats
      });

    } catch (error) {
      console.error('Error fetching meal stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch stats' 
      });
    }
  });
}