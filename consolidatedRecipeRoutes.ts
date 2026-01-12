import type { Express, Request, Response } from "express";
import { optionalAuth, AuthenticatedUser } from "./authMiddleware";

// Extend Request type with proper user interface from auth middleware
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * CONSOLIDATED RECIPE ROUTES - Eliminates duplicates while preserving functionality
 * 
 * CANONICAL ENDPOINTS:
 * - /api/meals/unified - Browse all recipes (aggregated from all sources)
 * - /api/meals/unified/:id - Get single recipe by unified ID
 * 
 * REDIRECTED ENDPOINTS (for backward compatibility):
 * - /api/recipes → /api/meals/unified (with filter for shared recipes only)
 * - /api/custom-recipes → /api/meals/unified (with filter for custom recipes only)
 * - /api/custom-recipes/:id → /api/meals/unified/custom-:id
 * 
 * PRESERVED DISTINCT BUSINESS FUNCTIONS:
 * - /api/meal-completion/* - Meal completion tracking
 * - /api/meal-plans/* - Meal plan management  
 * - /api/meals/submit-photo - Meal photo scoring
 * - /api/user-ai-recipes/* - User AI recipes management
 */

export function registerConsolidatedRecipeRoutes(app: Express) {
  
  /**
   * BACKWARD COMPATIBILITY REDIRECT: /api/recipes → /api/meals/unified
   * Redirects legacy recipe browsing to canonical unified endpoint
   * Filters to shared recipes only to maintain expected behavior
   */
  app.get('/api/recipes', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🔄 REDIRECT: /api/recipes → /api/meals/unified (shared recipes only)');
      
      // Build query parameters for unified endpoint
      const queryParams = new URLSearchParams();
      
      // Add original query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          queryParams.append(key, value);
        }
      });
      
      // For guest users, unified endpoint already filters to shared recipes
      // For authenticated users, add source filter to show only shared recipes
      if (req.user) {
        queryParams.append('source', 'shared');
      }
      
      // Forward to unified endpoint
      const unifiedUrl = `/api/meals/unified?${queryParams.toString()}`;
      console.log(`🔄 REDIRECT: Forwarding to ${unifiedUrl}`);
      
      // Internal redirect - call the unified endpoint handler directly
      req.url = unifiedUrl;
      req.originalUrl = unifiedUrl;
      
      // Forward the request to unified meals handler
      const unifiedHandler = app._router.stack.find((layer: any) => 
        layer.route && layer.route.path === '/api/meals/unified' && layer.route.methods.get
      );
      
      if (unifiedHandler) {
        return unifiedHandler.route.stack[0].handle(req, res);
      } else {
        // Fallback: External redirect if internal routing fails
        return res.redirect(302, unifiedUrl);
      }
      
    } catch (error) {
      console.error('❌ REDIRECT ERROR in /api/recipes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to redirect to unified recipes endpoint',
        redirectedFrom: '/api/recipes',
        redirectedTo: '/api/meals/unified'
      });
    }
  });

  /**
   * BACKWARD COMPATIBILITY REDIRECT: /api/custom-recipes → /api/meals/unified  
   * Redirects custom recipe browsing to canonical unified endpoint
   * Maintains custom recipe filtering behavior
   */
  app.get('/api/custom-recipes', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🔄 REDIRECT: /api/custom-recipes → /api/meals/unified (custom recipes filtered)');
      
      // Build query parameters for unified endpoint
      const queryParams = new URLSearchParams();
      
      // Add original query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        if (typeof value === 'string') {
          queryParams.append(key, value);
        }
      });
      
      // Add source filter to show custom recipes
      queryParams.append('source', 'custom');
      
      // Forward to unified endpoint  
      const unifiedUrl = `/api/meals/unified?${queryParams.toString()}`;
      console.log(`🔄 REDIRECT: Forwarding to ${unifiedUrl}`);
      
      // Internal redirect - call the unified endpoint handler directly
      req.url = unifiedUrl;
      req.originalUrl = unifiedUrl;
      
      // Forward the request to unified meals handler
      const unifiedHandler = app._router.stack.find((layer: any) => 
        layer.route && layer.route.path === '/api/meals/unified' && layer.route.methods.get
      );
      
      if (unifiedHandler) {
        return unifiedHandler.route.stack[0].handle(req, res);
      } else {
        // Fallback: External redirect if internal routing fails
        return res.redirect(302, unifiedUrl);
      }
      
    } catch (error) {
      console.error('❌ REDIRECT ERROR in /api/custom-recipes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to redirect to unified recipes endpoint',
        redirectedFrom: '/api/custom-recipes', 
        redirectedTo: '/api/meals/unified'
      });
    }
  });

  /**
   * BACKWARD COMPATIBILITY REDIRECT: /api/custom-recipes/:id → /api/meals/unified/custom-:id
   * Redirects single custom recipe access to unified endpoint with proper ID format
   */
  app.get('/api/custom-recipes/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recipeId = req.params.id;
      const unifiedId = `custom-${recipeId}`;
      
      console.log(`🔄 REDIRECT: /api/custom-recipes/${recipeId} → /api/meals/unified/${unifiedId}`);
      
      // Forward to unified endpoint with proper unified ID format
      const unifiedUrl = `/api/meals/unified/${unifiedId}`;
      
      // Internal redirect
      req.url = unifiedUrl;
      req.originalUrl = unifiedUrl;
      req.params.id = unifiedId;
      
      // Forward the request to unified meals single recipe handler
      const unifiedHandler = app._router.stack.find((layer: any) => 
        layer.route && layer.route.path === '/api/meals/unified/:id' && layer.route.methods.get
      );
      
      if (unifiedHandler) {
        return unifiedHandler.route.stack[0].handle(req, res);
      } else {
        // Fallback: External redirect if internal routing fails
        return res.redirect(302, unifiedUrl);
      }
      
    } catch (error) {
      console.error('❌ REDIRECT ERROR in /api/custom-recipes/:id:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to redirect to unified recipe endpoint',
        redirectedFrom: `/api/custom-recipes/${req.params.id}`,
        redirectedTo: `/api/meals/unified/custom-${req.params.id}`
      });
    }
  });

  /**
   * REMOVED: POST /api/custom-recipes forwarding - broken mini-app pattern
   * The actual POST handler is in customRecipeRoutes.ts (registered later in routes.ts)
   * Removing this broken forwarding allows the proper handler to work
   */
  // Post endpoint removed - let customRecipeRoutes.ts handle it directly

  /**
   * LEGACY ENDPOINT INFO: Provide information about deprecated endpoints
   */
  app.get('/api/_deprecated/recipes-info', (req: Request, res: Response) => {
    res.json({
      message: 'Recipe/Meal Routes Consolidation Info',
      status: 'consolidated',
      canonicalEndpoints: {
        browsing: '/api/meals/unified',
        singleRecipe: '/api/meals/unified/:id',
        customRecipeCreation: '/api/custom-recipes (POST)',
      },
      redirectedEndpoints: {
        '/api/recipes': '/api/meals/unified?source=shared',
        '/api/custom-recipes (GET)': '/api/meals/unified?source=custom',
        '/api/custom-recipes/:id': '/api/meals/unified/custom-:id'
      },
      preservedDistinctFunctions: [
        '/api/meal-completion/* - Meal completion tracking',
        '/api/meal-plans/* - Meal plan management',  
        '/api/meals/submit-photo - Meal photo scoring',
        '/api/user-ai-recipes/* - User AI recipes management'
      ],
      migration: {
        frontend: 'Update to use /api/meals/unified for recipe browsing',
        backend: 'Legacy endpoints redirected for backward compatibility'
      }
    });
  });

  console.log('✅ CONSOLIDATED RECIPE ROUTES: Registered redirect handlers for backward compatibility');
  console.log('📋 CANONICAL ENDPOINT: /api/meals/unified (aggregates all recipe sources)');
  console.log('🔄 REDIRECTS: /api/recipes → /api/meals/unified, /api/custom-recipes → /api/meals/unified');
  console.log('🔒 PRESERVED: meal-completion, meal-plans, meal photo scoring, user-ai-recipes');
}