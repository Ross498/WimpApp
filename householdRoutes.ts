import { Router } from 'express';
import { authenticateToken, optionalAuth, AuthenticatedUser } from './authMiddleware';
import { householdService } from './householdService';

const router = Router();

/**
 * Create a new household
 * POST /api/household/create
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, createFamilyPod = true } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Household name is required',
      });
    }

    const result = await householdService.createHousehold(userId, name.trim(), createFamilyPod);

    res.json({
      success: true,
      message: 'Household created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating household:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create household',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Join a household using invite code
 * POST /api/household/join
 */
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { inviteCode } = req.body;

    if (!inviteCode || inviteCode.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-character invite code is required',
      });
    }

    const result = await householdService.joinHousehold(userId, inviteCode.trim().toUpperCase());

    res.json({
      success: true,
      message: 'Successfully joined household',
      data: result,
    });
  } catch (error) {
    console.error('Error joining household:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join household',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});



/**
 * Join household via link with authentication
 * POST /api/household/join-by-link
 */
router.post('/join-by-link', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { inviteCode } = req.body;

    if (!inviteCode || inviteCode.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Valid 6-character invite code is required',
      });
    }

    const result = await householdService.joinHouseholdByLink(userId, inviteCode.trim().toUpperCase());

    res.json({
      success: true,
      message: 'Successfully joined household via invitation link',
      data: result,
    });
  } catch (error) {
    console.error('Error joining household via link:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join household',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get user's household information - GUEST ACCESS ENABLED
 * GET /api/household/info
 */
router.get('/info', optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const isGuest = !userId;
    
    if (isGuest) {
      console.log('🔓 GUEST ACCESS: Returning no household info for guest user');
      // Return guest-friendly response
      return res.json({
        success: true,
        message: 'Sign in to create or join a household',
        data: null,
        isGuest: true,
        guestTip: 'Households let you share pantry items and meal plans with family members'
      });
    }
    
    console.log('🏠 Getting household info for user:', userId);
    
    const userHousehold = await householdService.getUserHousehold(userId);
    
    if (!userHousehold) {
      console.log('🏠 No household found for user:', userId);
      return res.json({
        success: true,
        message: 'No household found',
        data: null,
        isGuest: false
      });
    }
    
    console.log('🏠 Found household data for user:', userId, 'household:', userHousehold.id);
    res.json({
      success: true,
      data: userHousehold,
      isGuest: false
    });
  } catch (error) {
    console.error('Error getting household info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get household info',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get household pantry (shared ingredients) - GUEST ACCESS ENABLED
 * GET /api/household/pantry
 */
router.get('/pantry', optionalAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const isGuest = !userId;
    
    if (isGuest) {
      console.log('🔓 GUEST ACCESS: Returning empty household pantry for guest user');
      // Return empty pantry for guests with helpful messaging
      return res.json({
        success: true,
        message: 'Sign in to access household pantry features',
        data: {
          householdId: null,
          householdName: null,
          ingredients: [],
          memberCount: 0,
        },
        isGuest: true,
        guestTip: 'Join or create a household to share pantry items with family members'
      });
    }
    
    console.log(`🏠 HOUSEHOLD PANTRY ACCESS ATTEMPT by user ${userId}`);
    
    const userHousehold = await householdService.getUserHousehold(userId);

    if (!userHousehold) {
      console.log(`❌ USER NOT IN HOUSEHOLD: User ${userId} is not a household member - should use personal ingredients`);
      return res.json({
        success: true,
        message: 'You are not in a household. Create or join one to access shared pantry.',
        data: {
          householdId: null,
          householdName: null,
          ingredients: [],
          memberCount: 0,
        },
        redirect: '/api/ingredients',
        userType: 'individual',
        isGuest: false
      });
    }

    console.log(`✅ ALLOWED: User ${userId} is household member of ${userHousehold.id}`);
    const pantry = await householdService.getHouseholdPantry(userHousehold.id);

    res.json({
      success: true,
      message: 'Household pantry retrieved successfully',
      data: {
        householdId: userHousehold.id,
        householdName: userHousehold.name,
        ingredients: pantry,
        memberCount: userHousehold.memberCount || 0,
      },
      isGuest: false
    });
  } catch (error) {
    console.error('Error getting household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update household ingredient when cooking
 * POST /api/household/cook-meal
 */
router.post('/cook-meal', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { ingredients } = req.body; // Array of {name, quantity} objects

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients array is required',
      });
    }

    const userHousehold = await householdService.getUserHousehold(userId);
    if (!userHousehold) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const results = [];
    for (const ingredient of ingredients) {
      if (ingredient.name && ingredient.quantity > 0) {
        const result = await householdService.updateHouseholdIngredient(
          userHousehold.id,
          ingredient.name,
          -ingredient.quantity, // Negative for cooking (reduction)
          'cook'
        );
        results.push(result);
      }
    }

    res.json({
      success: true,
      message: 'Household pantry updated after cooking',
      data: {
        householdId: userHousehold.id,
        updatedIngredients: results,
      },
    });
  } catch (error) {
    console.error('Error updating household pantry after cooking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update household ingredient when purchasing
 * POST /api/household/purchase-ingredients
 */
router.post('/purchase-ingredients', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { ingredients } = req.body; // Array of {name, quantity} objects

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Ingredients array is required',
      });
    }

    const userHousehold = await householdService.getUserHousehold(userId);
    if (!userHousehold) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const results = [];
    for (const ingredient of ingredients) {
      if (ingredient.name && ingredient.quantity > 0) {
        const result = await householdService.updateHouseholdIngredient(
          userHousehold.id,
          ingredient.name,
          ingredient.quantity, // Positive for purchasing (addition)
          'purchase'
        );
        results.push(result);
      }
    }

    res.json({
      success: true,
      message: 'Household pantry updated after purchase',
      data: {
        householdId: userHousehold.id,
        updatedIngredients: results,
      },
    });
  } catch (error) {
    console.error('Error updating household pantry after purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Leave current household
 * POST /api/household/leave
 */
router.post('/leave', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const result = await householdService.leaveHousehold(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error leaving household:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave household',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Regenerate household invite code (admin only)
 * POST /api/household/:id/regenerate-code
 */
router.post('/:id/regenerate-code', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const householdId = parseInt(req.params.id);

    if (isNaN(householdId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid household ID',
      });
    }

    const result = await householdService.regenerateInviteCode(userId, householdId);

    res.json({
      success: true,
      message: 'Invite code regenerated successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error regenerating invite code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate invite code',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get household pantry (joint pantry for all household members)
router.get('/pantry', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const pantry = await householdService.getHouseholdPantry(household.id);

    res.json({
      success: true,
      data: pantry,
    });
  } catch (error) {
    console.error('Error getting household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Add ingredients to household pantry
router.post('/pantry/ingredients', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Valid ingredients array is required',
      });
    }

    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const result = await householdService.addToHouseholdPantry(household.id, ingredients, userId);

    res.json({
      success: true,
      message: 'Ingredients added to household pantry',
      data: result,
    });
  } catch (error) {
    console.error('Error adding ingredients to household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add ingredients to household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Remove ingredients from household pantry after cooking
router.post('/pantry/consume', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({
        success: false,
        message: 'Valid ingredients array is required',
      });
    }

    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const result = await householdService.consumeFromHouseholdPantry(household.id, ingredients, userId);

    res.json({
      success: true,
      message: 'Ingredients consumed from household pantry',
      data: result,
    });
  } catch (error) {
    console.error('Error consuming ingredients from household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to consume ingredients from household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Add single ingredient to household pantry
router.post('/pantry/add', authenticateToken, async (req, res) => {
  try {
    console.log('🏠 HOUSEHOLD ADD: Starting household pantry addition');

    const userId = (req as any).user.userId || (req as any).user.id;
    const ingredient = req.body;

    console.log('🏠 USER ID:', userId);
    console.log('🏠 INGREDIENT:', ingredient);

    if (!ingredient || !ingredient.name) {
      console.log('❌ HOUSEHOLD VALIDATION: Missing ingredient data');
      return res.status(400).json({
        success: false,
        message: 'Valid ingredient object with name is required',
      });
    }

    console.log('🏠 CHECKING: Getting user household membership...');
    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      console.log('🏠 NOT IN HOUSEHOLD: User is not a member of any household');
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
        fallback: 'try_individual',
      });
    }

    console.log('🏠 HOUSEHOLD FOUND:', household.id, household.name);
    console.log('🏠 ADDING: Adding ingredient to household pantry...');

    const result = await householdService.addToHouseholdPantry(household.id, [ingredient], userId);

    console.log('✅ HOUSEHOLD SUCCESS: Ingredient added to household pantry');
    console.log('✅ RESULT:', result);

    res.json({
      success: true,
      message: 'Ingredient added to household pantry',
      data: result,
    });
  } catch (error) {
    console.error('💥 HOUSEHOLD ERROR: Failed to add ingredient to household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add ingredient to household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete ingredient from household pantry
router.delete('/pantry/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const ingredientId = parseInt(req.params.id);

    if (isNaN(ingredientId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid ingredient ID is required',
      });
    }

    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const result = await householdService.removeFromHouseholdPantry(household.id, ingredientId, userId);

    res.json({
      success: true,
      message: 'Ingredient removed from household pantry',
      data: result,
    });
  } catch (error) {
    console.error('Error removing ingredient from household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove ingredient from household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Clear all ingredients from household pantry
router.delete('/pantry', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const household = await householdService.getUserHousehold(userId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: 'User is not a member of any household',
      });
    }

    const result = await householdService.clearHouseholdPantry(household.id, userId);

    res.json({
      success: true,
      message: 'All ingredients removed from household pantry',
      data: result,
    });
  } catch (error) {
    console.error('Error clearing household pantry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear household pantry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Add ingredient to household pantry
 * POST /api/household/add-ingredient
 */
router.post('/add-ingredient', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, quantity, unit, category, householdId } = req.body;

    console.log('➕ Adding ingredient to pantry:', { name, quantity, unit, category, householdId });

    if (!name || !quantity || !unit) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, quantity, unit',
      });
    }

    const result = await householdService.addHouseholdIngredient(householdId || 1, {
      name: name.trim(),
      quantity: parseFloat(quantity),
      unit: unit.trim(),
      category: category || 'other'
    });

    console.log('✅ Ingredient added successfully:', result);

    res.json({
      success: true,
      message: 'Ingredient added successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Error adding ingredient:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add ingredient',
    });
  }
});

export default router;