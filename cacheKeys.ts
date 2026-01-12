/**
 * UNIFIED CACHE KEY CONSTANTS
 * 
 * Standardized cache keys to prevent inconsistencies and race conditions
 */

export const CACHE_KEYS = {
  // Favorites
  FAVORITES: ['/api/favorites'] as const,
  
  // Collections
  COLLECTIONS: ['/api/collections'] as const,
  COLLECTION_RECIPES: (collectionId: number) => ['/api/collections', collectionId, 'recipes'] as const,
  
  // Meals
  MEALS_UNIFIED: ['/api/meals', 'unified'] as const,
  MEAL_PLANS: ['/api/meal-plans'] as const,
  MEAL_PROGRESS: ['/api/meal-completion', 'progress'] as const,
  
  // Custom Recipes
  CUSTOM_RECIPES: ['/api/custom-recipes'] as const,
  
  // All Recipes (consolidated)
  ALL_RECIPES: ['/api/meal-persistence', 'all-recipes'] as const,
  
  // Pantry
  PANTRY: ['/api/pantry'] as const,
  
  // Shopping
  SHOPPING_LIST: ['/api/shopping', 'list'] as const,
  SHOPPING_INSIGHTS: ['/api/ai', 'shopping-insights'] as const,
  
  // Meal Plan Tracking
  MEAL_PLAN_TRACKING_ACTIVE: ['/api/meal-plan-tracking', 'active'] as const,
  MEAL_PLAN_TRACKING_SESSIONS: ['/api/meal-plan-tracking', 'sessions'] as const,
} as const;

/**
 * Safely invalidate multiple cache keys with proper error handling
 */
export async function invalidateCaches(queryClient: any, keys: any[][]) {
  const promises = keys.map(key => 
    queryClient.invalidateQueries({ queryKey: key }).catch((error: any) => {
      console.warn(`Failed to invalidate cache for ${JSON.stringify(key)}:`, error);
    })
  );
  
  await Promise.allSettled(promises);
}

/**
 * Specific cache invalidation helpers
 */
export const cacheHelpers = {
  invalidateFavorites: (queryClient: any) => 
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.FAVORITES }),
    
  invalidateCollections: (queryClient: any) => 
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.COLLECTIONS }),
    
  invalidateCollectionRecipes: (queryClient: any, collectionId: number) => 
    queryClient.invalidateQueries({ queryKey: CACHE_KEYS.COLLECTION_RECIPES(collectionId) }),
    
  invalidateAllRecipeData: async (queryClient: any) => {
    await invalidateCaches(queryClient, [
      CACHE_KEYS.FAVORITES as unknown as any[],
      CACHE_KEYS.COLLECTIONS as unknown as any[],
      CACHE_KEYS.MEALS_UNIFIED as unknown as any[],
      CACHE_KEYS.CUSTOM_RECIPES as unknown as any[],
      CACHE_KEYS.ALL_RECIPES as unknown as any[]
    ]);
  }
};