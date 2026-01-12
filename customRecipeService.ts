import { eq, and, ilike, sql } from "drizzle-orm";
import { db } from "./db";
import { recipes, type Recipe, customRecipes, type CustomRecipe, type InsertCustomRecipe } from "../shared/schema.js";

/**
 * Custom Recipe Service - Manages user-uploaded recipes replacing Spoonacular
 */
export class CustomRecipeService {
  /**
   * Get all recipes with pagination and filtering - PRIORITIZES UPLOADED RECIPES
   */
  static async getAllRecipes(page: number = 0, limit: number = 20, category?: string): Promise<{
    recipes: Recipe[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const offset = page * limit;
      
      // PRIORITY: Query custom_recipes table first for uploaded recipes with images
      let customWhereClause = undefined;
      let systemWhereClause = undefined;
      
      if (category && category !== 'all') {
        customWhereClause = eq(customRecipes.category, category);
        systemWhereClause = eq(recipes.category, category);
      }

      // Get uploaded recipes from custom_recipes table (with images)
      const [uploadedRecipeList, uploadedCount, systemRecipeList, systemCount] = await Promise.all([
        db
          .select()
          .from(customRecipes)
          .where(customWhereClause)
          .orderBy(customRecipes.id)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)` })
          .from(customRecipes)
          .where(customWhereClause),
        // Also get system recipes if we need more to fill the page
        db
          .select()
          .from(recipes)
          .where(systemWhereClause)
          .orderBy(recipes.id)
          .limit(Math.max(0, limit - 0))
          .offset(0),
        db
          .select({ count: sql`count(*)` })
          .from(recipes)
          .where(systemWhereClause)
      ]);

      const uploadedTotal = Number(uploadedCount[0]?.count || 0);
      const systemTotal = Number(systemCount[0]?.count || 0);
      const total = uploadedTotal + systemTotal;

      // Prioritize uploaded recipes, then fill with system recipes if needed
      const remainingSlots = Math.max(0, limit - uploadedRecipeList.length);
      const systemRecipesToInclude = systemRecipeList.slice(0, remainingSlots);
      
      const combinedRecipes = [
        ...uploadedRecipeList.map(recipe => ({
          ...recipe,
          // Ensure uploaded recipes display their proper images
          imageUrl: recipe.imageUrl || recipe.image_url || '/placeholder-recipe.jpg',
          image: recipe.image_url || recipe.imageUrl,
          isActive: recipe.isActive ?? true,
          createdAt: recipe.createdAt || new Date(),
          updatedAt: recipe.updatedAt || recipe.createdAt || new Date(),
          flavorBoosters: recipe.flavorBoosters || [
            "Fresh herbs (basil, thyme, or rosemary)",
            "Garlic powder for extra depth", 
            "Lemon zest for brightness",
            "Smoked paprika for warmth",
            "Parmesan cheese for richness"
          ],
          source: 'uploaded' // Mark as uploaded recipe
        })),
        ...systemRecipesToInclude.map(recipe => ({
          ...recipe,
          imageUrl: recipe.imageUrl || recipe.image || '/placeholder-recipe.jpg',
          image: recipe.image || recipe.imageUrl,
          isActive: true,
          createdAt: recipe.createdAt || new Date(),
          updatedAt: recipe.updatedAt || recipe.createdAt || new Date(),
          flavorBoosters: [
            "Fresh herbs (basil, thyme, or rosemary)",
            "Garlic powder for extra depth", 
            "Lemon zest for brightness",
            "Smoked paprika for warmth",
            "Parmesan cheese for richness"
          ],
          source: 'system' // Mark as system recipe
        }))
      ];

      const hasMore = offset + combinedRecipes.length < total;

      return {
        recipes: combinedRecipes,
        total,
        page,
        limit,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching recipes:', error);
      
      // Comprehensive fallback system when database is unavailable
      console.log('Database connection failed, using fallback recipe system');
      
      const fallbackRecipes = [
        {
          id: 1,
          name: "Spaghetti Carbonara",
          description: "Classic Italian pasta dish with eggs, cheese, and pancetta",
          category: "Dinner",
          imageUrl: "/attached_assets/u4417433892_pasta_ingredient_string_luinguine_illustration_ha_d54ab72d-1a38-49a0-8c25-bca39c22a668_1_1752657007866.png",
          prepTime: 10,
          cookTime: 15,
          servings: 4,
          ingredients: ["400g spaghetti", "200g pancetta", "4 large eggs", "100g Pecorino Romano", "Black pepper", "Salt"],
          instructions: ["Cook pasta in salted water", "Fry pancetta until crispy", "Whisk eggs with cheese", "Combine pasta with pancetta", "Add egg mixture off heat", "Serve immediately"],
          flavorBoosters: ["Fresh herbs (basil, thyme, or rosemary)", "Garlic powder for extra depth", "Lemon zest for brightness", "Smoked paprika for warmth", "Parmesan cheese for richness"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          name: "Chicken Tikka Masala",
          description: "Creamy and flavorful Indian curry with tender chicken",
          category: "Dinner",
          imageUrl: "/attached_assets/u4417433892_tomatto_ingredient_illustration_hand-drawn_style__2f7cc25e-34b7-4689-9606-b1c2e31fe9e5_0_1752654646114.png",
          prepTime: 20,
          cookTime: 30,
          servings: 6,
          ingredients: ["600g chicken breast", "400ml coconut milk", "400g canned tomatoes", "2 onions", "Garlic", "Ginger", "Spices"],
          instructions: ["Marinate chicken in yogurt and spices", "Cook chicken until browned", "Sauté onions, garlic, ginger", "Add tomatoes and coconut milk", "Simmer with chicken", "Serve with rice"],
          flavorBoosters: ["Fresh herbs (basil, thyme, or rosemary)", "Garlic powder for extra depth", "Lemon zest for brightness", "Smoked paprika for warmth", "Parmesan cheese for richness"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 3,
          name: "Beef Stir Fry",
          description: "Quick and healthy stir-fry with fresh vegetables",
          category: "Quick",
          imageUrl: "/attached_assets/u4417433892_Onion_ingredient_illustration_hand-drawn_style_sl_1577e0d8-0a83-435c-9f03-85d04d51718b_2_1752654652929.png",
          prepTime: 15,
          cookTime: 10,
          servings: 4,
          ingredients: ["500g beef strips", "Mixed vegetables", "Soy sauce", "Garlic", "Ginger", "Sesame oil"],
          instructions: ["Heat wok on high heat", "Cook beef until browned", "Add vegetables", "Stir-fry for 3-4 minutes", "Add sauce", "Serve immediately"],
          flavorBoosters: ["Fresh herbs (basil, thyme, or rosemary)", "Garlic powder for extra depth", "Lemon zest for brightness", "Smoked paprika for warmth", "Parmesan cheese for richness"],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      return {
        recipes: fallbackRecipes,
        total: fallbackRecipes.length,
        page: 0,
        limit: 20,
        hasMore: false
      };
    }
  }

  /**
   * Get a single recipe by ID
   */
  static async getRecipeById(id: number): Promise<CustomRecipe | null> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const [recipe] = await db
        .select()
        .from(customRecipes)
        .where(and(eq(customRecipes.id, id), eq(customRecipes.isActive, true)));

      return recipe ? { 
        ...recipe, 
        flavorBoosters: recipe.flavorBoosters || [
          "Fresh herbs (basil, thyme, or rosemary)",
          "Garlic powder for extra depth",
          "Lemon zest for brightness",
          "Smoked paprika for warmth",
          "Parmesan cheese for richness"
        ]
      } : null;
    } catch (error) {
      console.error('Error fetching recipe by ID:', error);
      return null;
    }
  }

  /**
   * Search recipes by name (case-insensitive)
   */
  static async searchRecipes(searchTerm: string): Promise<CustomRecipe[]> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      const results = await db
        .select()
        .from(customRecipes)
        .where(
          and(
            eq(customRecipes.isActive, true),
            ilike(customRecipes.name, searchPattern)
          )
        )
        .orderBy(customRecipes.createdAt);
      
      return results.map(recipe => ({
        ...recipe,
        flavorBoosters: recipe.flavorBoosters || [
          "Fresh herbs (basil, thyme, or rosemary)",
          "Garlic powder for extra depth",
          "Lemon zest for brightness",
          "Smoked paprika for warmth",
          "Parmesan cheese for richness"
        ]
      }));
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  }

  /**
   * Get all unique categories
   */
  static async getCategories(): Promise<string[]> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const results = await db
        .selectDistinct({ category: customRecipes.category })
        .from(customRecipes)
        .where(eq(customRecipes.isActive, true));

      return results
        .map(r => r.category)
        .filter((category): category is string => category !== null)
        .sort();
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get recipes by category
   */
  static async getRecipesByCategory(category: string): Promise<CustomRecipe[]> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const results = await db
        .select()
        .from(customRecipes)
        .where(
          and(
            eq(customRecipes.isActive, true),
            eq(customRecipes.category, category)
          )
        )
        .orderBy(customRecipes.createdAt);

      return results.map(recipe => ({
        ...recipe,
        flavorBoosters: recipe.flavorBoosters || [
          "Fresh herbs (basil, thyme, or rosemary)",
          "Garlic powder for extra depth",
          "Lemon zest for brightness",
          "Smoked paprika for warmth",
          "Parmesan cheese for richness"
        ]
      }));
    } catch (error) {
      console.error('Error fetching recipes by category:', error);
      return [];
    }
  }

  /**
   * Create a new custom recipe (instance method)
   */
  async createCustomRecipe(recipeData: InsertCustomRecipe): Promise<CustomRecipe> {
    return await CustomRecipeService.addRecipe(recipeData);
  }

  /**
   * Add a new custom recipe (static method)
   */
  static async addRecipe(recipeData: InsertCustomRecipe): Promise<CustomRecipe> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Properly format data for PostgreSQL JSONB fields
      const sanitizedData = {
        ...recipeData,
        // Instructions as string array for PostgreSQL JSONB field
        instructions: Array.isArray(recipeData.instructions)
          ? recipeData.instructions.map(inst => String(inst || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()).filter(Boolean)
          : [],
        // Ingredients as structured objects for JSONB field
        ingredients: Array.isArray(recipeData.ingredients) 
          ? recipeData.ingredients.map((ing: any) => {
              if (typeof ing === 'string') {
                return { item: ing.trim(), quantity: '' };
              }
              return {
                item: String(ing.item || ing.name || ing || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim(),
                quantity: String(ing.quantity || ing.amount || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
              };
            }).filter(ing => ing.item)
          : [],
        // Dietary tags as string array for JSONB
        dietaryTags: Array.isArray(recipeData.dietaryTags) 
          ? recipeData.dietaryTags.map(tag => String(tag || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()).filter(Boolean)
          : [],
        // Nutrition info as object for JSONB
        nutritionInfo: typeof recipeData.nutritionInfo === 'object' && recipeData.nutritionInfo !== null
          ? recipeData.nutritionInfo
          : {}
      };



      // Use Drizzle ORM insert method with proper handling
      const [recipe] = await db
        .insert(customRecipes)
        .values({
          userId: sanitizedData.userId,
          name: sanitizedData.name,
          description: sanitizedData.description,
          instructions: sanitizedData.instructions,
          prepTime: sanitizedData.prepTime,
          cookTime: sanitizedData.cookTime,
          servings: sanitizedData.servings,
          difficulty: sanitizedData.difficulty,
          category: sanitizedData.category,
          imageUrl: sanitizedData.imageUrl || '',
          ingredients: sanitizedData.ingredients,
          source: sanitizedData.source || 'user',
          cuisine: sanitizedData.cuisine,
          dietaryTags: sanitizedData.dietaryTags,
          nutritionInfo: sanitizedData.nutritionInfo,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return { 
        ...recipe, 
        flavorBoosters: recipe.flavorBoosters || [
          "Fresh herbs (basil, thyme, or rosemary)",
          "Garlic powder for extra depth",
          "Lemon zest for brightness",
          "Smoked paprika for warmth",
          "Parmesan cheese for richness"
        ]
      };
    } catch (error) {
      console.error('Error adding recipe:', error);
      throw new Error('Failed to add recipe');
    }
  }

  /**
   * Check if recipes are already seeded
   */
  static async areRecipesSeeded(): Promise<boolean> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const [result] = await db
        .select({ count: customRecipes.id })
        .from(customRecipes);

      return result !== undefined;
    } catch (error) {
      console.error('Error checking if recipes are seeded:', error);
      return false;
    }
  }

  /**
   * Force reseed all recipes (clears existing ones)
   */
  static async forceReseedRecipes(): Promise<void> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      console.log('🧹 Clearing existing custom recipes...');
      await db.delete(customRecipes);
      await this.seedInitialRecipes(true);
      console.log('✅ Force reseed completed successfully');
    } catch (error) {
      console.error('❌ Error during force reseed:', error);
      throw new Error('Failed to force reseed recipes');
    }
  }

  /**
   * Seed initial recipes from the comprehensive collection
   */
  static async seedInitialRecipes(force: boolean = false): Promise<void> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      // Check if already seeded (unless forcing)
      if (!force) {
        const existingRecipes = await db.select().from(customRecipes).limit(1);
        if (existingRecipes.length > 0) {
          console.log('Custom recipes already seeded');
          return;
        }
      }

      // Complete 56 recipes with full instructions and ingredients restored
      const { completeRecipes } = require('../../restore-56-recipes-complete.js');
      const sampleRecipes = completeRecipes;

      await db.insert(customRecipes).values(sampleRecipes);
      console.log(`✅ Seeded ${sampleRecipes.length} custom recipes`);
    } catch (error) {
      console.error('❌ Error seeding recipes:', error);
      throw new Error('Failed to seed initial recipes');
    }
  }
}