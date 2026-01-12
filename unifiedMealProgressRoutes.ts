import { Router, Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import { IngredientSubtractionService } from './ingredientSubtractionService';
import { db } from './db';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Complete a meal - subtracts ingredients from pantry
 * POST /api/unified/meal-progress/complete - AUTHENTICATED ONLY
 */
router.post('/meal-progress/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { recipeId, recipeName, ingredients, servings = 1 } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log(`🎯 MEAL COMPLETE: User ${userId} completing meal ${recipeId} - ${recipeName}`);
    
    // Extract ingredient names from recipe ingredients
    const ingredientNames = ingredients?.map((ing: any) => ing.item || ing.name) || [];
    
    if (ingredientNames.length === 0) {
      console.log(`⚠️ MEAL COMPLETE: No ingredients to subtract for ${recipeName}`);
      return res.json({
        success: true,
        message: 'Meal marked as complete (no ingredients to subtract)',
        subtractedIngredients: []
      });
    }

    // Subtract ingredients from pantry
    console.log(`📦 SUBTRACTING: ${ingredientNames.length} ingredients for ${servings} servings`);
    const result = await IngredientSubtractionService.subtractIngredientsFromMeal(
      userId.toString(),
      ingredientNames,
      servings,
      true // Use smart estimation
    );

    console.log(`✅ MEAL COMPLETE: Subtracted ${result.subtractedIngredients.length} ingredients for ${recipeName}`);
    
    return res.json({
      success: true,
      message: `Meal completed! ${result.subtractedIngredients.length} ingredients subtracted from your pantry.`,
      subtractedIngredients: result.subtractedIngredients,
      totalItemsSubtracted: result.totalItemsSubtracted,
      recipeId,
      recipeName
    });

  } catch (error: any) {
    console.error('❌ MEAL COMPLETE: Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete meal',
      message: error.message
    });
  }
});

export default router;
