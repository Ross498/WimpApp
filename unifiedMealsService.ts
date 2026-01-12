import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { 
  recipes, 
  customRecipes, 
  userScannedRecipes,
  userFavorites,
  type Recipe,
  type CustomRecipe,
  type UserScannedRecipe
} from "../shared/schema.js";
import { RecipeImageMapper } from './utils/recipeImageMapper';
import { calculateMissingIngredients } from './utils/ingredientCalculator';

// Unified recipe interface that normalizes all recipe types
export interface UnifiedRecipe {
  id: string;
  name: string;
  description?: string | null;
  ingredients: Array<{item: string, quantity: string}>;
  instructions: string[];
  imageUrl?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  totalTime?: number | null;
  servings?: number | null;
  difficulty?: string | null;
  category?: string | null;
  cuisine?: string | null;
  source: 'shared' | 'custom' | 'scanned';
  createdAt?: Date | null;
  userId?: number | null; // Only for user-specific recipes
  // Missing ingredient analysis
  missingIngredientsCount?: number;
  availableIngredientsCount?: number;
  totalIngredientsCount?: number;
  missingIngredients?: string[];
  canMakeNow?: boolean;
  // Favorites
  isFavorite?: boolean;
}

/**
 * Unified Meals Service - Aggregates recipes from all 3 sources:
 * 1. Shared recipes (recipes table) - Original 34 recipes shared across all users
 * 2. User custom recipes (custom_recipes) - User-uploaded custom recipes
 * 3. User scanned recipes (user_scanned_recipes) - Recipe book scans
 */
export class UnifiedMealsService {

  /**
   * Get shared recipes only (for guest users)
   * Returns only the 34 shared recipes available to everyone
   */
  static async getSharedRecipesOnly(options: {
    limit?: number;
    offset?: number;
    category?: string;
    search?: string;
  } = {}): Promise<{recipes: UnifiedRecipe[], total: number}> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    const { limit = 50, offset = 0, category, search } = options;

    try {
      console.log('🔓 GUEST ACCESS: Fetching shared recipes only');
      
      // Get only shared recipes for guests
      const sharedRecipes = await this.getSharedRecipes({ category, search });
      
      // Apply pagination
      const total = sharedRecipes.length;
      const paginatedRecipes = sharedRecipes.slice(offset, offset + limit);
      
      // Add ingredient analysis for guest users (all ingredients will be marked as missing)
      const guestRecipesWithAnalysis = paginatedRecipes.map(recipe => ({
        ...recipe,
        missingIngredientsCount: recipe.ingredients.length,
        availableIngredientsCount: 0,
        totalIngredientsCount: recipe.ingredients.length,
        missingIngredients: recipe.ingredients.map(ing => ing.item),
        canMakeNow: false
      }));

      console.log(`🔓 GUEST RECIPES: Found ${total} shared recipes, returning ${guestRecipesWithAnalysis.length} with ingredient analysis (limit: ${limit})`);

      return {
        recipes: guestRecipesWithAnalysis,
        total
      };

    } catch (error) {
      console.error('Error fetching shared recipes for guest:', error);
      throw error;
    }
  }

  /**
   * Get all recipes available to a user (shared + user-specific)
   * For new users: Only show shared recipes (default 34)
   */
  static async getAllUserMeals(userId: number, options: {
    limit?: number;
    offset?: number;
    category?: string;
    search?: string;
  } = {}): Promise<{recipes: UnifiedRecipe[], total: number}> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    const { limit = 50, offset = 0, category, search } = options;

    try {
      // Check if user has any scanned recipes (user-generated content)
      const userScannedCount = await db.select().from(userScannedRecipes).where(eq(userScannedRecipes.userId, userId)).limit(1);

      const isNewUser = !userScannedCount.length;

      if (isNewUser) {
        console.log(`🔰 NEW USER ${userId}: Showing shared recipes first, but still unified system`);
        // New users see shared recipes prominently but unified system still works
      }

      console.log(`👤 EXPERIENCED USER ${userId}: Showing unified meals from all sources`);
      // Execute all queries in parallel for experienced users
      const [
        sharedRecipes,
        userCustomRecipes, 
        userScannedRecipesList
      ] = await Promise.all([
        this.getSharedRecipes({ category, search }),
        this.getUserCustomRecipes(userId, { category, search }),
        this.getUserScannedRecipes(userId, { category, search })
      ]);

      // Combine and normalize all recipes
      let allRecipes: UnifiedRecipe[] = [
        ...sharedRecipes,
        ...userCustomRecipes,
        ...userScannedRecipesList
      ];

      // Apply pagination with higher limit for experienced users too
      const total = allRecipes.length;
      const effectiveLimit = Math.max(limit, 100); // Show more recipes for experienced users
      const paginatedRecipes = allRecipes.slice(offset, offset + effectiveLimit);
      
      // Enhance recipes with missing ingredient calculations
      const enhancedRecipes = await this.enhanceRecipesWithIngredientAnalysis(paginatedRecipes, userId);
      
      console.log(`🍽️ EXPERIENCED USER UNIFIED MEALS: Found ${total} total recipes, returning ${enhancedRecipes.length} (limit: ${effectiveLimit})`);

      return {
        recipes: enhancedRecipes,
        total
      };

    } catch (error) {
      console.error('Error fetching unified meals:', error);
      throw error;
    }
  }

  /**
   * Get shared recipes (confirmed 34 recipes in database)
   */
  private static async getSharedRecipes(filters: {category?: string, search?: string}): Promise<UnifiedRecipe[]> {
    if (!db) {
      return [];
    }

    try {
      // FIXED: Query the recipes table which contains the 34 specified recipes
      const sharedRecipesFromDb = await db
        .select()
        .from(recipes)
        .orderBy(recipes.id)
        .limit(100);


      console.log(`🍽️ UNIFIED MEALS: Found ${sharedRecipesFromDb.length} shared recipes`);

      const formattedSharedRecipes = sharedRecipesFromDb.map(sharedRecipe => ({
        id: `shared-${sharedRecipe.id}`,
        name: sharedRecipe.name || 'Unknown Recipe',
        description: sharedRecipe.description,
        ingredients: this.parseIngredients(sharedRecipe.ingredients || []),
        instructions: Array.isArray(sharedRecipe.instructions) ? sharedRecipe.instructions : [sharedRecipe.instructions || 'No instructions provided'],
        imageUrl: sharedRecipe.imageUrl || '/default-ingredient-icon.png',
        prepTime: sharedRecipe.prepTime,
        cookTime: sharedRecipe.cookTime,
        servings: sharedRecipe.servings || 4,
        difficulty: sharedRecipe.difficulty,
        category: sharedRecipe.category,
        source: 'shared' as const,
        createdAt: sharedRecipe.createdAt,
        userId: null
      }));

      return formattedSharedRecipes;
    } catch (error) {
      console.error('Error fetching shared recipes:', error);
      return [];
    }
  }


  /**
   * Get user custom uploaded recipes
   * CRITICAL FIX: CustomRecipes table DOES have userId column - enable it!
   */
  private static async getUserCustomRecipes(userId: number, filters: {category?: string, search?: string}): Promise<UnifiedRecipe[]> {
    if (!db) {
      return [];
    }

    try {
      console.log(`🔧 CUSTOM RECIPES: Loading custom recipes for user ${userId}`);
      
      let whereCondition = and(
        eq(customRecipes.isActive, true),
        eq(customRecipes.userId, userId)
      );

      // Add category filter if provided
      if (filters.category) {
        whereCondition = and(
          whereCondition,
          eq(customRecipes.category, filters.category)
        );
      }

      const results = await db
        .select()
        .from(customRecipes)
        .where(whereCondition)
        .limit(100);

      console.log(`🔧 CUSTOM RECIPES: Found ${results.length} custom recipes for user ${userId}`);
      return results.map(recipe => this.normalizeCustomRecipe(recipe));
    } catch (error) {
      console.error('Error fetching custom recipes:', error);
      return [];
    }
  }

  /**
   * Get user scanned recipes
   */
  private static async getUserScannedRecipes(userId: number, filters: {category?: string, search?: string}): Promise<UnifiedRecipe[]> {
    if (!db) {
      return [];
    }

    try {
      const results = await db
        .select()
        .from(userScannedRecipes)
        .where(eq(userScannedRecipes.userId, userId))
        .limit(100);

      return results.map(recipe => this.normalizeUserScannedRecipe(recipe));
    } catch (error) {
      // Table might not exist yet
      console.log('user_scanned_recipes table not available yet');
      return [];
    }
  }


  /**
   * Normalize shared recipe to unified format
   */
  private static normalizeSharedRecipe(recipe: any): UnifiedRecipe {
    return {
      id: `shared-${recipe.id}`,
      name: recipe.name || 'Unknown Recipe',
      description: recipe.description,
      ingredients: this.parseIngredients(recipe.ingredients || []),
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [recipe.instructions || 'No instructions provided'],
      imageUrl: recipe.imageUrl || recipe.image || '/placeholder-recipe.jpg',
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings || 4,
      difficulty: recipe.difficulty,
      category: recipe.category,
      source: 'shared',
      createdAt: recipe.createdAt,
      userId: null
    };
  }


  /**
   * Normalize custom recipe to unified format
   * FIXED: Respects actual database source field
   */
  private static normalizeCustomRecipe(recipe: CustomRecipe): UnifiedRecipe {
    // Determine actual source - database is now standardized to 'scanned'
    const actualSource = recipe.source === 'scanned' ? 'scanned' : 'custom';
    
    return {
      id: `${actualSource}-${recipe.id}`,
      name: recipe.name,
      description: recipe.description,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [String(recipe.instructions || '')],
      imageUrl: recipe.imageUrl,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      category: recipe.category,
      cuisine: recipe.cuisine,
      source: actualSource,
      createdAt: recipe.createdAt,
      userId: recipe.userId
    };
  }

  /**
   * Normalize user scanned recipe to unified format
   */
  private static normalizeUserScannedRecipe(recipe: UserScannedRecipe): UnifiedRecipe {
    return {
      id: `scanned-${recipe.id}`,
      name: recipe.name,
      description: recipe.description,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      imageUrl: recipe.imageUrl,
      source: 'scanned',
      createdAt: recipe.createdAt,
      userId: recipe.userId
    };
  }


  /**
   * Helper to parse ingredients from various formats
   */
  private static parseIngredients(ingredients: any): Array<{item: string, quantity: string}> {
    if (Array.isArray(ingredients)) {
      return ingredients.map(ing => {
        if (typeof ing === 'string') {
          // Parse "2 cups flour" format
          const parts = ing.split(' ');
          const quantity = parts.slice(0, 2).join(' ');
          const item = parts.slice(2).join(' ');
          return { item: item || ing, quantity: quantity || '1' };
        }
        if (ing && typeof ing === 'object') {
          // Handle both {item, quantity} and {name, amount} formats
          return {
            item: ing.item || ing.name || 'Unknown ingredient',
            quantity: ing.quantity || ing.amount || '1'
          };
        }
        return { item: String(ing), quantity: '1' };
      });
    }
    return [];
  }

  /**
   * Helper to parse instructions from various formats
   */
  private static parseInstructions(instructions: any): string[] {
    if (Array.isArray(instructions)) {
      return instructions.map(inst => String(inst || ''));
    }
    if (typeof instructions === 'string') {
      return [instructions];
    }
    return [];
  }

  /**
   * Get recipe by unified ID
   */
  static async getRecipeById(unifiedId: string, userId?: number): Promise<UnifiedRecipe | null> {
    const [source, id] = unifiedId.split('-');
    const numericId = parseInt(id);

    try {
      switch (source) {
        case 'shared':
          if (!db) return null;
          const sharedRecipe = await db.select().from(recipes).where(eq(recipes.id, numericId)).limit(1);
          return sharedRecipe[0] ? this.normalizeSharedRecipe(sharedRecipe[0]) : null;

        case 'custom':
          if (!db) return null;
          const customRecipe = await db.select().from(customRecipes)
            .where(eq(customRecipes.id, numericId))
            .limit(1);
          return customRecipe[0] ? this.normalizeCustomRecipe(customRecipe[0]) : null;

        case 'scanned':
          if (!userId || !db) return null;
          const scannedRecipe = await db.select().from(userScannedRecipes)
            .where(and(eq(userScannedRecipes.id, numericId), eq(userScannedRecipes.userId, userId)))
            .limit(1);
          return scannedRecipe[0] ? this.normalizeUserScannedRecipe(scannedRecipe[0]) : null;

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error fetching recipe ${unifiedId}:`, error);
      return null;
    }
  }

  /**
   * Enhance recipes with missing ingredient analysis and favorites for authenticated users
   */
  static async enhanceRecipesWithIngredientAnalysis(
    recipes: UnifiedRecipe[], 
    userId: number,
    householdId?: number
  ): Promise<UnifiedRecipe[]> {
    console.log(`🔍 INGREDIENT ANALYSIS: Calculating missing ingredients for ${recipes.length} recipes for user ${userId}`);
    
    // Fetch user favorites
    let favoriteRecipeIds: number[] = [];
    if (db) {
      try {
        const favorites = await db
          .select()
          .from(userFavorites)
          .where(eq(userFavorites.userId, userId));
        favoriteRecipeIds = favorites.map(fav => fav.recipeId);
        console.log(`🔖 FAVORITES: Found ${favoriteRecipeIds.length} favorites for user ${userId}`);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    }
    
    const enhancedRecipes = [];
    
    for (const recipe of recipes) {
      try {
        // Calculate missing ingredients using our utility
        const analysis = await calculateMissingIngredients(
          recipe.ingredients, 
          userId, 
          householdId
        );
        
        // Extract numeric recipe ID from unified ID (e.g., "shared-152" -> 152)
        const numericId = parseInt(recipe.id.split('-')[1]);
        const isFavorite = favoriteRecipeIds.includes(numericId);
        
        // Enhance the recipe with missing ingredient data and favorite status
        const enhancedRecipe: UnifiedRecipe = {
          ...recipe,
          missingIngredientsCount: analysis.missingCount,
          availableIngredientsCount: analysis.availableCount,
          totalIngredientsCount: analysis.total,
          missingIngredients: analysis.missing,
          canMakeNow: analysis.missingCount === 0,
          isFavorite
        };
        
        enhancedRecipes.push(enhancedRecipe);
      } catch (error) {
        console.error(`Error analyzing ingredients for recipe ${recipe.id}:`, error);
        // Fall back to default values if analysis fails
        enhancedRecipes.push({
          ...recipe,
          missingIngredientsCount: recipe.ingredients.length,
          availableIngredientsCount: 0,
          totalIngredientsCount: recipe.ingredients.length,
          missingIngredients: recipe.ingredients.map(ing => ing.item),
          canMakeNow: false,
          isFavorite: false
        });
      }
    }
    
    console.log(`🔍 INGREDIENT ANALYSIS: Enhanced ${enhancedRecipes.length} recipes with missing ingredient data and favorites`);
    return enhancedRecipes;
  }
}