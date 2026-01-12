import express, { Request, Response } from 'express';

// Extend Request interface to include session and user properties
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    userId: number;
    username: string;
    email: string;
    name: string;
  };
  session?: {
    user?: {
      id: number;
    };
  };
}
// CRITICAL FIX: Use shared storage singleton instead of creating new instance
import { sharedPgStorage } from './storage.js';
import { authenticateToken } from './authMiddleware';
import multer from 'multer';
import crypto from 'crypto';
// AI Ingredient Analyzer removed - server/ai/ folder deleted
// import { analyzeIngredientsWithAI, findRecipeMatches } from './ai/arIngredientAnalyzer';
import { getSouthAfricanCostStats } from './saReceiptScanner';
import { estimateExpiryDate } from './utils/expiryEstimator';


// CRITICAL FIX: Use shared storage singleton instead of creating new instance
const pgStorage = sharedPgStorage;

const router = express.Router();

// Set up multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store the file in memory
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Get all ingredients for a user with South African cost stats
 * GET /api/ingredients
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.session?.user?.id || 1;
    console.log('🧪 DEBUG: Ingredients route - userId:', userId);
    console.log(`Fetching ingredients for user ${userId}`);

    // Get South African cost statistics
    const saStats = await getSouthAfricanCostStats(userId.toString());

    console.log('🔍 ROUTE DEBUG: About to call pgStorage.getIngredientsByUser with userId:', Number(userId));
    let ingredients = await pgStorage.getIngredientsByUser(Number(userId));
    console.log('🔍 ROUTE DEBUG: Returned ingredients count:', ingredients.length);
    console.log('🔍 ROUTE DEBUG: Sample ingredient:', ingredients[0]);

    // Return ingredients with South African cost statistics
    res.json({
      ingredients,
      saStats: {
        totalPantryValue: saStats.totalPantryValue,
        expiredValueThisWeek: saStats.expiredValueThisWeek,
        mostExpensiveItem: saStats.mostExpensiveItem,
        topStore: saStats.topStore,
        totalReceiptsScanned: saStats.totalReceiptsScanned,
        avgItemPrice: saStats.avgItemPrice
      }
    });
  } catch (error: any) {
    console.error('Error fetching ingredients with SA stats:', error);
    res.status(500).json({
      message: error.message || 'Failed to fetch ingredients',
      ingredients: [],
      saStats: {
        totalPantryValue: 'R0.00',
        expiredValueThisWeek: 'R0.00',
        mostExpensiveItem: { name: 'None', price: 'R0.00' },
        topStore: { name: 'None', totalSpent: 'R0.00' },
        totalReceiptsScanned: 0,
        avgItemPrice: 'R0.00'
      }
    });
  }
});

/**
 * Get ingredients by category
 * GET /api/ingredients/category/:category
 */
router.get('/category/:category', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { category } = req.params;
    const ingredients = await pgStorage.getIngredientsByCategory(Number(userId), category);
    res.json(ingredients);
  } catch (error: any) {
    console.error('Error fetching ingredients by category:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch ingredients by category' });
  }
});

/**
 * Get expiring ingredients
 * GET /api/ingredients/expiring?days=3
 */
router.get('/expiring', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const daysThreshold = parseInt(req.query.days as string) || 3;
    const ingredients = await pgStorage.getExpiringIngredients(Number(userId), daysThreshold);
    res.json(ingredients);
  } catch (error: any) {
    console.error('Error fetching expiring ingredients:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch expiring ingredients' });
  }
});

/**
 * Create a new ingredient
 * POST /api/ingredients
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.session?.user?.id || 1;
    console.log('🧪 DEBUG: Ingredients route - userId:', userId);
    const { category } = req.params;

    const ingredients = await pgStorage.getIngredientsByCategory(Number(userId), category);
    res.json(ingredients);
  } catch (error: any) {
    console.error('Error fetching ingredients by category:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch ingredients by category' });
  }
});

/**
 * Get expiring ingredients
 * GET /api/ingredients/expiring?days=3
 */
router.get('/expiring', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || req.session?.user?.id || 1;
    console.log('🧪 DEBUG: Ingredients route - userId:', userId);
    const daysThreshold = parseInt(req.query.days as string) || 3;

    const ingredients = await pgStorage.getExpiringIngredients(Number(userId), daysThreshold);
    res.json(ingredients);
  } catch (error: any) {
    console.error('Error fetching expiring ingredients:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch expiring ingredients' });
  }
});

/**
 * Create a new ingredient
 * POST /api/ingredients
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('🍯 INDIVIDUAL POST: Starting ingredient creation');
    console.log('🍯 USER CHECK: req.user =', req.user);

    if (!req.user) {
      console.log('❌ AUTH FAILED: No user in request');
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create ingredients'
      });
    }

    const userId = req.user.userId;
    console.log('🍯 USER ID: Extracted userId =', userId);

    const { name, category, quantity, unit, emoji } = req.body;
    console.log('🍯 REQUEST BODY:', { name, category, quantity, unit, emoji });

    // Validate required fields
    if (!name || !category) {
      console.log('❌ VALIDATION FAILED: Missing name or category');
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }

    try {
      console.log('🍯 CREATION: Building ingredient object...');

      // AI-powered expiry date estimation
      const expiryEstimate = estimateExpiryDate(name, category);
      console.log('📅 EXPIRY ESTIMATE:', {
        ingredient: name,
        category,
        estimatedDays: expiryEstimate.days,
        expiryDate: expiryEstimate.expiryDate,
        confidence: expiryEstimate.confidence
      });

      // Create ingredient object for PostgreSQL
      const ingredient = {
        userId: Number(userId),
        name: name.trim(),
        category: category || 'Other',
        quantity: quantity || 1,
        unit: unit || 'pieces',
        emoji: emoji || '🍽️',
        expiryDate: expiryEstimate.expiryDate
      };

      console.log('🍯 INGREDIENT OBJECT:', ingredient);
      console.log('🍯 STORAGE: Calling pgStorage.createIngredient...');

      const createdIngredient = await pgStorage.createIngredient(ingredient);

      console.log('✅ CREATION SUCCESS:', createdIngredient);

      res.status(201).json({
        success: true,
        message: 'Ingredient added to individual pantry successfully',
        data: createdIngredient,
        cacheInvalidate: ['ingredients'] // Signal frontend to invalidate cache
      });
    } catch (storageError) {
      console.error('💥 STORAGE ERROR:', storageError);
      throw storageError;
    }

  } catch (error: any) {
    console.error('💥 INGREDIENT CREATION ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create ingredient',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Bulk add ingredients (from receipt scanning)
 * POST /api/ingredients/bulk
 */
router.post('/bulk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to add ingredients'
      });
    }

    const userId = req.user.userId;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ message: 'Ingredients array is required' });
    }

    // Process each ingredient
    const processedIngredients = [];

    // Format ingredients properly for PostgreSQL and save them
    for (const ing of ingredients) {
      // AI-powered expiry date estimation if not provided
      let expiryDate: Date;
      if (ing.expiryDate) {
        expiryDate = new Date(ing.expiryDate);
      } else {
        const expiryEstimate = estimateExpiryDate(ing.name, ing.category);
        expiryDate = expiryEstimate.expiryDate;
        console.log('📅 BULK EXPIRY ESTIMATE:', {
          ingredient: ing.name,
          category: ing.category,
          estimatedDays: expiryEstimate.days,
          confidence: expiryEstimate.confidence
        });
      }

      const newIngredient = {
        userId: Number(userId),
        name: ing.name,
        category: ing.category || 'Other',
        quantity: typeof ing.quantity === 'string' ? parseInt(ing.quantity) || 1 : (ing.quantity || 1),
        unit: ing.unit || '',
        expiryDate,
        image: ing.image || `https://cdn-icons-png.flaticon.com/512/1147/1147805.png`,
        imageFallback: ing.imageFallback || `https://img.icons8.com/color/96/${encodeURIComponent(ing.name.toLowerCase())}`,
      };

      const createdIngredient = await pgStorage.createIngredient(newIngredient);
      processedIngredients.push(createdIngredient);
    }

    res.status(201).json({
      success: true,
      data: processedIngredients,
      cacheInvalidate: ['ingredients'] // Signal frontend to invalidate cache
    });
  } catch (error: any) {
    console.error('Error adding bulk ingredients:', error);
    res.status(500).json({ message: error.message || 'Failed to add bulk ingredients' });
  }
});

/**
 * Update an ingredient
 * PUT /api/ingredients/:id
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, quantity, expiryDate, imageUrl } = req.body;

    // Create the updates object
    const updates: any = {};
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (quantity !== undefined) updates.quantity = quantity;
    if (expiryDate !== undefined) {
      updates.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;

    const success = await pgStorage.updateIngredient(Number(id), updates);

    if (success) {
      res.json({ message: 'Ingredient updated successfully' });
    } else {
      res.status(404).json({ message: 'Ingredient not found or no changes made' });
    }
  } catch (error: any) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ message: error.message || 'Failed to update ingredient' });
  }
});

/**
 * Delete an ingredient
 * DELETE /api/ingredients/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await pgStorage.deleteIngredient(Number(id), String(userId));
    res.json({ message: 'Ingredient deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ message: error.message || 'Failed to delete ingredient' });
  }
});

/**
 * Scan receipt and extract ingredients
 * POST /api/ingredients/scan-receipt
 */
router.post('/scan-receipt', upload.single('receiptImage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to scan receipts'
      });
    }

    const userId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({ message: 'Receipt image is required' });
    }

    // Call Open AI to analyze the receipt image
    console.log('Scanning receipt image, buffer size:', req.file.buffer.length);
    // Receipt scanning functionality - placeholder for storage interface implementation
    const ingredients: any[] = [];
    console.log('Receipt scan results:', JSON.stringify(ingredients));

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      console.log('No ingredients detected in the receipt');
      return res.json([]);
    }

    // Import the TheMealDB helper for ingredient images
    const { getMealDBImageURLs, hasTheMealDBImage } = require('./utils/themealdbIngredientHelper');

    // Add user ID and images to ingredients, using TheMealDB as primary source
    const processedIngredients = ingredients.map(ingredient => {
      // Format the ingredient name
      const name = ingredient.name.trim();
      const formattedName = name.toLowerCase().replace(/\s+/g, '_');

      // Check if we should use TheMealDB images
      const useTheMealDB = hasTheMealDBImage(name);

      // Get image URLs based on source
      let image, imageFallback;

      if (useTheMealDB) {
        // Use TheMealDB images
        const mealDbImages = getMealDBImageURLs(name);
        image = mealDbImages.large;
        imageFallback = mealDbImages.medium;
      } else {
        // Fallback to other image sources
        image = `https://www.themealdb.com/images/ingredients/${formattedName}.png`;
        imageFallback = `https://cdn-icons-png.flaticon.com/512/1147/1147805.png`;
      }

      return {
        ...ingredient,
        userId,
        _id: crypto.randomUUID(), // Ensure each ingredient has a unique ID
        image,
        imageFallback,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0] // 14 days from now
      };
    });

    console.log('Sending processed ingredients:', JSON.stringify(processedIngredients));

    // Store the ingredients in the database and return them
    try {
      // Create each ingredient in the database
      for (const ingredient of processedIngredients) {
        await pgStorage.createIngredient(ingredient);
      }
      // Return the processed ingredients
      res.json(processedIngredients);
    } catch (dbError) {
      console.error('Error saving ingredients to database:', dbError);
      // Still return the ingredients even if saving fails
      res.json(processedIngredients);
    }
  } catch (error: any) {
    console.error('Error scanning receipt:', error);
    res.status(500).json({ message: error.message || 'Failed to scan receipt' });
  }
});

/**
 * AR ingredient scanning with computer vision
 * POST /api/ingredients/ar-scan
 */
router.post('/ar-scan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { image, mode = 'realtime' } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // AR scanning temporarily disabled - AI folder deleted
    // TODO: Re-implement AR scanning without AI dependency
    
    res.status(501).json({
      message: 'AR ingredient scanning temporarily unavailable',
      error: 'Feature under maintenance',
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AR scanning error:', error);
    res.status(500).json({
      message: 'Failed to analyze ingredients',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Ingredient subtraction endpoint
 * POST /api/ingredients/subtract
 */
router.post('/subtract', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔧 INGREDIENT SUBTRACTION REQUEST:', req.body);
    const { ingredientName, amount } = req.body;
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // TODO: Implement ingredient subtraction logic with pgStorage
    // For now, return a placeholder response
    const result = { success: true, message: 'Ingredient subtraction feature coming soon' };
    res.json(result);
  } catch (error: any) {
    console.error('❌ SUBTRACTION ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to subtract ingredient'
    });
  }
});

/**
 * Clear all ingredients endpoint
 * DELETE /api/ingredients/clear-all
 */
router.delete('/clear-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🗑️ CLEARING ALL INGREDIENTS for user:', req.user?.userId || req.user?.id);
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Delete all ingredients for the user using pgStorage
    await pgStorage.deleteAllIngredients(String(userId));

    console.log(`✅ CLEARED all ingredients for user ${userId}`);

    res.json({
      success: true,
      message: 'Successfully cleared all ingredients'
    });
  } catch (error: any) {
    console.error('❌ CLEAR ALL ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear ingredients'
    });
  }
});

export default router;