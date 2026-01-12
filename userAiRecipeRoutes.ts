import { Router, Response, Request } from 'express';
import { eq, desc, and } from 'drizzle-orm';
import { userAiRecipes, insertUserAiRecipeSchema } from '../shared/schema.js';
import { db } from './db.js';
import { authenticateToken, type AuthenticatedUser } from './authMiddleware.js';

// Extend Express Request with authenticated user
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const router = Router();

/**
 * Get all AI-generated recipes for the authenticated user
 * GET /api/user-ai-recipes
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!db) {
      throw new Error('Database connection not available');
    }

    const userRecipes = await db
      .select()
      .from(userAiRecipes)
      .where(eq(userAiRecipes.userId, parseInt(userId.toString())))
      .orderBy(desc(userAiRecipes.createdAt));

    console.log(`🤖 Found ${userRecipes.length} AI recipes for user ${userId}`);

    res.json({
      success: true,
      recipes: userRecipes
    });
  } catch (error) {
    console.error('Error fetching user AI recipes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI recipes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Save a new AI-generated recipe for the authenticated user
 * POST /api/user-ai-recipes
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!db) {
      throw new Error('Database connection not available');
    }

    // Validate the request body
    const validatedData = insertUserAiRecipeSchema.parse({
      ...req.body,
      userId: parseInt(userId.toString())
    });

    const [newRecipe] = await db
      .insert(userAiRecipes)
      .values(validatedData)
      .returning();

    console.log(`🤖 Saved new AI recipe "${newRecipe.title}" for user ${userId}`);

    res.status(201).json({
      success: true,
      recipe: newRecipe
    });
  } catch (error) {
    console.error('Error saving user AI recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save AI recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete an AI-generated recipe for the authenticated user
 * DELETE /api/user-ai-recipes/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const recipeId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!db) {
      throw new Error('Database connection not available');
    }

    // Only allow users to delete their own AI recipes
    const deletedRecipes = await db
      .delete(userAiRecipes)
      .where(and(
        eq(userAiRecipes.id, recipeId),
        eq(userAiRecipes.userId, parseInt(userId.toString()))
      ))
      .returning();

    if (deletedRecipes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AI recipe not found or access denied'
      });
    }

    console.log(`🤖 Deleted AI recipe ${recipeId} for user ${userId}`);

    res.json({
      success: true,
      message: 'AI recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user AI recipe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete AI recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as userAiRecipeRoutes };