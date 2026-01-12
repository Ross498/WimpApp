/**
 * RecipeService - Robust database recipe fetching with error handling
 */

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  imageUrl: string;
  ingredients: Array<{
    item: string;
    quantity: string;
  }>;
  instructions: string[];
  cuisine: string;
  dietaryTags: string[];
  nutritionInfo: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };
  source: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeResponse {
  success: boolean;
  recipes: Recipe[];
  message?: string;
}

export class RecipeService {
  private static BASE_URL = '/api/meals/unified';
  private static FALLBACK_URL = '/api/custom-recipes';
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all recipes from unified meals API
   */
  static async getAllRecipes(): Promise<RecipeResponse> {
    const cacheKey = 'all-recipes';
    
    try {
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('🔄 RecipeService: Using cached data');
        return cached.data;
      }

      console.log('🔍 RecipeService: Fetching all recipes from unified meals API...');
      
      let response;
      let data;
      
      try {
        // Try unified meals API first
        response = await fetch(this.BASE_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Unified API failed: ${response.status}`);
        }

        data = await response.json();
        console.log('🔍 RecipeService: Using unified meals API');
        
      } catch (unifiedError) {
        console.log('🔄 RecipeService: Falling back to custom recipes API');
        
        // Fallback to custom recipes API
        response = await fetch(this.FALLBACK_URL, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      }
      console.log('🔍 RecipeService: Raw response structure:', {
        hasSuccess: 'success' in data,
        hasRecipes: 'recipes' in data,
        recipesCount: data.recipes?.length || 0,
        keys: Object.keys(data)
      });

      // Validate response structure
      if (!data.success || !Array.isArray(data.recipes)) {
        throw new Error('Invalid response format from server');
      }

      // Transform and validate recipes
      const validRecipes = data.recipes.map((recipe: any) => {
        // Ensure all required fields exist
        if (!recipe.id || !recipe.name) {
          throw new Error(`Invalid recipe data: missing required fields`);
        }

        // Transform image URL to full path
        const imageUrl = recipe.imageUrl?.startsWith('/attached_assets/') 
          ? `${window.location.origin}${recipe.imageUrl}`
          : recipe.imageUrl || '/placeholder-recipe.jpg';

        return {
          id: String(recipe.id),
          name: recipe.name,
          description: recipe.description || '',
          category: recipe.category || 'main',
          difficulty: recipe.difficulty || 'Easy',
          prepTime: Number(recipe.prepTime) || 0,
          cookTime: Number(recipe.cookTime) || 0,
          servings: Number(recipe.servings) || 4,
          imageUrl,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          cuisine: recipe.cuisine || 'International',
          dietaryTags: Array.isArray(recipe.dietaryTags) ? recipe.dietaryTags : [],
          nutritionInfo: recipe.nutritionInfo || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0
          },
          source: recipe.source || 'custom',
          isActive: recipe.isActive !== false,
          createdAt: recipe.createdAt || new Date().toISOString(),
          updatedAt: recipe.updatedAt || new Date().toISOString()
        };
      });

      const result: RecipeResponse = {
        success: true,
        recipes: validRecipes,
        message: `Successfully loaded ${validRecipes.length} recipes`
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      console.log('✅ RecipeService: Successfully processed recipes:', result.recipes.length);
      return result;

    } catch (error) {
      console.error('❌ RecipeService: Error fetching recipes:', error);
      
      return {
        success: false,
        recipes: [],
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get recipe by ID
   */
  static async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.data) {
        return null;
      }

      return data.data;
    } catch (error) {
      console.error('❌ RecipeService: Error fetching recipe by ID:', error);
      return null;
    }
  }

  /**
   * Search recipes
   */
  static async searchRecipes(searchTerm: string): Promise<Recipe[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/search/${encodeURIComponent(searchTerm)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.data)) {
        return [];
      }

      return data.data;
    } catch (error) {
      console.error('❌ RecipeService: Error searching recipes:', error);
      return [];
    }
  }

  /**
   * Get available categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !Array.isArray(data.data)) {
        return ['main', 'side', 'dessert', 'breakfast', 'appetizer'];
      }

      return data.data;
    } catch (error) {
      console.error('❌ RecipeService: Error fetching categories:', error);
      return ['main', 'side', 'dessert', 'breakfast', 'appetizer'];
    }
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.clear();
    console.log('🗑️ RecipeService: Cache cleared');
  }
}