/**
 * UNIFIED RECIPE RESOLVER SERVICE
 * 
 * Solves the critical missing link in collections system:
 * Takes recipe references {recipeId, recipeSource} and returns full recipe data
 */

import { Recipe } from './RecipeService';

export interface RecipeReference {
  recipeId: number;
  recipeSource: 'shared' | 'ai-weekly' | 'custom' | 'mastery';
  id?: string;
  addedAt?: string;
  collectionItemId?: number;
}

export interface ResolvedRecipe extends Recipe {
  originalReference: RecipeReference;
}

export class UnifiedRecipeResolver {
  private static cache = new Map<string, { data: ResolvedRecipe; timestamp: number }>();
  private static CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache TTL

  /**
   * Resolve a single recipe by source and ID
   */
  static async resolveRecipe(reference: RecipeReference): Promise<ResolvedRecipe | null> {
    const cacheKey = `${reference.recipeSource}-${reference.recipeId}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        console.log(`✅ CACHE HIT: ${cacheKey}`);
        return cached.data; // Changed from 'recipe' to 'data' to match cache structure
      } else {
        this.cache.delete(cacheKey);
      }
    }

    console.log(`🔍 RESOLVER: Resolving recipe ${reference.recipeId} from source ${reference.recipeSource}`);

    try {
      // SECURITY FIX: Use httpOnly cookies instead of localStorage tokens
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // FIXED: Use unified meals endpoint with proper unified ID format
      const unifiedId = `${reference.recipeSource}-${reference.recipeId}`;
      const apiUrl = `/api/meals/unified/${unifiedId}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        credentials: 'include', // Use httpOnly cookies for authentication
      });

      if (!response.ok) {
        console.warn(`⚠️ RESOLVER: Failed to fetch ${cacheKey}: ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Handle unified response format
      const recipe = data.recipe || data;

      if (!recipe || !recipe.name) {
        console.warn(`⚠️ RESOLVER: No recipe found for ${cacheKey}`);
        return null;
      }

      // Normalize recipe data
      const resolvedRecipe: ResolvedRecipe = {
        id: recipe.id || `${reference.recipeSource}-${reference.recipeId}`,
        name: recipe.name || recipe.title || 'Unknown Recipe',
        description: recipe.description || '',
        imageUrl: recipe.imageUrl || recipe.imagePath || '/placeholder-recipe.jpg',
        prepTime: recipe.prepTime || 0,
        cookTime: recipe.cookTime || 0,
        servings: recipe.servings || 1,
        difficulty: recipe.difficulty || 'Easy',
        category: recipe.category || 'Other',
        ingredients: UnifiedRecipeResolver.normalizeIngredients(recipe.ingredients || []),
        instructions: UnifiedRecipeResolver.normalizeInstructions(recipe.instructions || []),
        cuisine: recipe.cuisine || 'Unknown',
        dietaryTags: recipe.dietaryTags || [],
        nutritionInfo: recipe.nutritionInfo || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sodium: 0
        },
        source: recipe.source || reference.recipeSource,
        isActive: recipe.isActive !== undefined ? recipe.isActive : true,
        createdAt: recipe.createdAt || new Date().toISOString(),
        updatedAt: recipe.updatedAt || new Date().toISOString(),
        originalReference: reference
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: resolvedRecipe, // Changed from 'recipe' to 'data' to match cache structure
        timestamp: Date.now()
      });

      console.log(`✅ RESOLVER: Successfully resolved ${cacheKey} - ${resolvedRecipe.name}`);
      return resolvedRecipe;

    } catch (error) {
      console.error(`❌ RESOLVER: Error resolving ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Resolve multiple recipe references in parallel with enhanced debugging
   */
  static async resolveRecipes(references: RecipeReference[]): Promise<ResolvedRecipe[]> {
    console.log(`🔍 RESOLVER: Starting resolution for ${references.length} references:`, references);

    const promises = references.map(async (ref, index) => {
      try {
        console.log(`📋 RESOLVER [${index + 1}/${references.length}]: Resolving ${ref.recipeSource}-${ref.recipeId}`);
        const result = await this.resolveRecipe(ref);
        if (result) {
          console.log(`✅ RESOLVER [${index + 1}/${references.length}]: Success - ${result.name}`);
        } else {
          console.warn(`❌ RESOLVER [${index + 1}/${references.length}]: Failed - ${ref.recipeSource}-${ref.recipeId}`);
        }
        return result;
      } catch (error) {
        console.error(`💥 RESOLVER [${index + 1}/${references.length}]: Error resolving ${ref.recipeSource}-${ref.recipeId}:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);

    const resolved = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<ResolvedRecipe>).value);

    // Enhanced logging with detailed failure analysis
    const failed = results.length - resolved.length;
    console.log(`📊 RESOLVER SUMMARY: ${resolved.length}/${results.length} recipes resolved successfully`);

    if (failed > 0) {
      console.warn(`⚠️ RESOLVER: ${failed} recipe references failed to resolve`);

      // Log detailed failure information
      const failures = results
        .map((result, index) => ({ result, reference: references[index] }))
        .filter(({ result }) => result.status === 'rejected' || result.value === null)
        .map(({ reference }) => `${reference.recipeSource}-${reference.recipeId}`);

      console.warn(`❌ RESOLVER FAILURES:`, failures);
    }

    return resolved;
  }

  /**
   * Fetch shared recipe from database using correct endpoint
   * @deprecated - Currently using unified endpoint, keeping for future direct recipe fetching
   */
  private static async fetchSharedRecipe(recipeId: number): Promise<Recipe | null> {
    try {
      console.log(`🔍 SHARED: Fetching shared recipe ${recipeId}`);
      // SECURITY FIX: Removed localStorage token usage - using httpOnly cookies

      // Try multiple endpoints to find the recipe
      const endpoints = [
        `/api/meals/shared/${recipeId}`,
        `/api/meals/unified?source=shared&id=${recipeId}`,
        `/api/meals?source=shared&id=${recipeId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ SHARED: Found data at ${endpoint}:`, data);

            // Handle different response formats
            let recipe = null;
            if (data.recipes && Array.isArray(data.recipes)) {
              recipe = data.recipes.find((r: Recipe) => 
                r.id === recipeId.toString() || r.id === `shared-${recipeId}` || parseInt(r.id as string) === recipeId
              );
            } else if (data.id || data.name) {
              // Direct recipe object
              recipe = data;
            }

            if (recipe) {
              console.log(`✅ SHARED: Recipe ${recipeId} resolved successfully`);
              return recipe;
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ SHARED: Endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }

      console.warn(`❌ SHARED: No recipe found for ID ${recipeId} at any endpoint`);
      return null;
    } catch (error) {
      console.error('Failed to fetch shared recipe:', error);
      return null;
    }
  }

  /**
   * Fetch AI-generated recipe
   * @deprecated - Currently using unified endpoint, keeping for future direct recipe fetching
   */
  private static async fetchAIRecipe(recipeId: number): Promise<Recipe | null> {
    try {
      // SECURITY FIX: Removed localStorage token usage - using httpOnly cookies
      const response = await fetch(`/api/meals/unified?source=ai-weekly&id=${recipeId}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.recipes?.find((r: Recipe) => r.id === recipeId.toString() || r.id === `ai-${recipeId}`) || null;
    } catch (error) {
      console.error('Failed to fetch AI recipe:', error);
      return null;
    }
  }

  /**
   * Fetch custom user recipe using multiple endpoints  
   * @deprecated - Currently using unified endpoint, keeping for future direct recipe fetching
   */
  private static async fetchCustomRecipe(recipeId: number): Promise<Recipe | null> {
    try {
      console.log(`🔍 CUSTOM: Fetching custom recipe ${recipeId}`);
      // SECURITY FIX: Removed localStorage token usage - using httpOnly cookies

      // Try multiple endpoints for custom recipes
      const endpoints = [
        `/api/custom-recipes/${recipeId}`,
        `/api/meals/unified?source=custom&id=${recipeId}`,
        `/api/favorites/${recipeId}`, // Custom recipes might be in favorites
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`✅ CUSTOM: Found data at ${endpoint}:`, data);

            // Handle different response formats
            if (data.data && (data.data.id || data.data.name)) {
              console.log(`✅ CUSTOM: Recipe ${recipeId} resolved successfully from data wrapper`);
              return data.data;
            } else if (data.id || data.name) {
              console.log(`✅ CUSTOM: Recipe ${recipeId} resolved successfully`);
              return data;
            } else if (data.recipe) {
              console.log(`✅ CUSTOM: Recipe ${recipeId} resolved from nested data`);
              return data.recipe;
            }
          } else {
            // Handle 404 and other errors gracefully
            try {
              const errorData = await response.json();
              if (response.status === 404) {
                console.log(`⚠️ CUSTOM: Recipe ${recipeId} not found at ${endpoint} (404): ${errorData.message || 'Not found'}`);
              } else {
                console.log(`⚠️ CUSTOM: Error ${response.status} at ${endpoint}: ${errorData.message || 'Unknown error'}`);
              }
            } catch (jsonError) {
              console.log(`⚠️ CUSTOM: Non-JSON error ${response.status} at ${endpoint}`);
            }
            continue;
          }
        } catch (endpointError) {
          console.log(`⚠️ CUSTOM: Endpoint ${endpoint} failed:`, endpointError);
          continue;
        }
      }

      console.warn(`❌ CUSTOM: No custom recipe found for ID ${recipeId} at any endpoint`);
      return null;
    } catch (error) {
      console.error('Failed to fetch custom recipe:', error);
      return null;
    }
  }

  /**
   * Fetch mastery recipe
   * @deprecated - Currently using unified endpoint, keeping for future direct recipe fetching  
   */
  private static async fetchMasteryRecipe(recipeId: number): Promise<Recipe | null> {
    try {
      // SECURITY FIX: Removed localStorage token usage - using httpOnly cookies
      const response = await fetch(`/api/meals/unified?source=mastery&id=${recipeId}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.recipes?.find((r: Recipe) => r.id === recipeId.toString() || r.id === `mastery-${recipeId}`) || null;
    } catch (error) {
      console.error('Failed to fetch mastery recipe:', error);
      return null;
    }
  }

  /**
   * Normalize ingredients array to match Recipe interface
   */
  private static normalizeIngredients(ingredients: any[]): Recipe['ingredients'] {
    return ingredients.map(ing => ({
      item: ing.name || ing.item || ing.ingredientName || 'Unknown Ingredient',
      quantity: `${ing.quantity || ''} ${ing.unit || ''}`.trim() || '1 serving'
    }));
  }

  /**
   * Normalize instructions array to match Recipe interface (string array)
   */
  private static normalizeInstructions(instructions: any[]): Recipe['instructions'] {
    if (Array.isArray(instructions)) {
      return instructions.map(step => {
        if (typeof step === 'string') {
          return step;
        }
        return step.step || step.instruction || step.description || 'No instruction provided';
      });
    }
    return ['No instructions available'];
  }

  /**
   * Clear cache for testing or when data changes
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🧹 RESOLVER: Cache cleared');
  }
}