import { Router, type Request, type Response } from "express";
import { CustomRecipeService } from "./customRecipeService";
import { authenticateToken } from "./authMiddleware";

const router = Router();

/**
 * Custom Recipe Routes - API endpoints for Pantrii recipe system
 */

/**
 * GET /api/custom-recipes
 * Get all custom recipes with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, page = '0', limit = '100' } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = pageNum * limitNum;

    const result = await CustomRecipeService.getAllRecipes(pageNum, limitNum, category as string);

    // Transform recipes to match Flutter Recipe model format
    const transformedRecipes = result.recipes.map(recipe => {
      // Convert image path to full URL for Flutter app
      const imageUrl = recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl;
      
      // Also provide the filename for relative path access
      const imageFilename = recipe.imageUrl?.replace('/attached_assets/', '') || null;

      return {
        id: recipe.id.toString(),
        _id: recipe.id.toString(), // Alternative ID field that Recipe model checks
        name: recipe.name,
        description: recipe.description,
        category: recipe.category,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime?.toString(),
        cookTime: recipe.cookTime?.toString(),
        servings: recipe.servings,
        ingredients: recipe.ingredients?.map((ing: any) => ({
          item: ing.item || ing.name || ing.id,
          quantity: ing.quantity,
        })),
        instructions: recipe.instructions,
        image: imageFilename,
        imageUrl: imageUrl,
        isFavorite: false, // Will be determined by user's favorites
        isAiGenerated: false, // Custom recipes are user-generated
        source: recipe.source || 'pantrii',
        cuisine: recipe.cuisine,
        dietaryTags: recipe.dietaryTags,
        nutritionInfo: recipe.nutritionInfo,
        flavorBoosters: [
          "Fresh herbs (basil, thyme, or rosemary)",
          "Garlic powder for extra depth",
          "Lemon zest for brightness",
          "Smoked paprika for warmth",
          "Parmesan cheese for richness"
        ],
        maxGrain: 75, // Default grain reward for custom recipes
        grainReward: 75,
        healthScore: 85, // Default health score for custom recipes
      };
    });

    res.json({
      success: true,
      recipes: transformedRecipes, // Flutter expects 'recipes' field
      data: transformedRecipes,
      total: result.total,
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('Error fetching custom recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes'
    });
  }
});

/**
 * GET /api/custom-recipes/categories
 * Get all available categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await CustomRecipeService.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

/**
 * GET /api/custom-recipes/:id
 * Get a single recipe by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recipe ID'
      });
    }

    const recipe = await CustomRecipeService.getRecipeById(id);
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Convert image path to full URL for Flutter app
    const transformedRecipe = {
      ...recipe,
      image: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
      imageUrl: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
    };

    res.json({
      success: true,
      data: transformedRecipe
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe'
    });
  }
});

/**
 * GET /api/custom-recipes/search/:term
 * Search recipes by name or ingredients
 */
router.get('/search/:term', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.params.term;
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }

    const recipes = await CustomRecipeService.searchRecipes(searchTerm);
    
    // Transform recipes with proper image URLs
    const transformedRecipes = recipes.map(recipe => ({
      ...recipe,
      image: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
      imageUrl: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
    }));
    
    res.json({
      success: true,
      data: transformedRecipes,
      total: transformedRecipes.length
    });
  } catch (error) {
    console.error('Error searching recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search recipes'
    });
  }
});

/**
 * GET /api/custom-recipes/category/:category
 * Get recipes by category
 */
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const category = req.params.category;
    const recipes = await CustomRecipeService.getRecipesByCategory(category);
    
    // Transform recipes with proper image URLs
    const transformedRecipes = recipes.map(recipe => ({
      ...recipe,
      image: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
      imageUrl: recipe.imageUrl?.startsWith('/attached_assets/') 
        ? `http://localhost:5000${recipe.imageUrl}`
        : recipe.imageUrl,
    }));
    
    res.json({
      success: true,
      data: transformedRecipes,
      total: transformedRecipes.length
    });
  } catch (error) {
    console.error('Error fetching recipes by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipes by category'
    });
  }
});

/**
 * POST /api/custom-recipes
 * Add a new custom recipe (authenticated users only)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const recipeData = req.body;
    
    // Basic validation
    if (!recipeData.name || !recipeData.ingredients || !recipeData.instructions) {
      return res.status(400).json({
        success: false,
        message: 'Recipe name, ingredients, and instructions are required'
      });
    }

    const newRecipe = await CustomRecipeService.addRecipe(recipeData);
    res.status(201).json({
      success: true,
      data: newRecipe,
      message: 'Recipe created successfully'
    });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create recipe'
    });
  }
});

/**
 * POST /api/custom-recipes/reseed
 * Force reseed all recipes (development only)
 */
router.post('/reseed', async (req: Request, res: Response) => {
  try {
    await CustomRecipeService.forceReseedRecipes();
    res.json({
      success: true,
      message: 'Recipes reseeded successfully'
    });
  } catch (error) {
    console.error('Error reseeding recipes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reseed recipes'
    });
  }
});

export default router;