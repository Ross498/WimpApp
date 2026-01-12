
// UNIFIED Make Now filter using shared ingredient availability logic
import { computeAvailability, getMissingText } from '../../../shared/ingredientAvailability';

/**
 * Enhanced Make Now filter with unified ingredient matching
 * Replaces old split-brain implementation with shared logic
 */
export const filterMakeNowRecipes = (recipes: any[], userPantry: any[], options: any = {}) => {
  const {
    prioritizeExactMatches = true,
    includeCloseMatches = true
  } = options;

  // Convert userPantry to ingredient names array
  const pantryIngredients = userPantry.map(item => 
    item.name || item.ingredient || item.toString()
  ).filter(name => name && typeof name === 'string');

  // Enrich recipes with unified availability data
  const enrichedRecipes = recipes.map(recipe => {
    const availability = computeAvailability(recipe, pantryIngredients);
    
    return {
      ...recipe,
      // Unified field names (replaces old conflicting names)
      availableIngredientsCount: availability.availableIngredientsCount,
      totalIngredientsCount: availability.totalIngredientsCount, 
      missingIngredientsCount: availability.missingIngredientsCount,
      missingIngredients: availability.missingIngredients,
      canMakeNow: availability.canMakeNow,
      makePriority: availability.makePriority,
      
      // Legacy compatibility fields (for components not yet updated)
      missingCount: availability.missingIngredientsCount,
      availableCount: availability.availableIngredientsCount,
      totalCount: availability.totalIngredientsCount,
      isExactMatch: availability.makePriority === 0,
      isCloseMatch: availability.makePriority > 0 && availability.makePriority <= 4,
      makeNowPriority: availability.makePriority,
      
      // UI display helper
      missingText: getMissingText(availability.missingIngredientsCount)
    };
  });

  // Filter recipes that qualify for "Make Now"
  const makeNowRecipes = enrichedRecipes.filter(recipe => 
    recipe.canMakeNow && (
      (prioritizeExactMatches && recipe.isExactMatch) ||
      (includeCloseMatches && recipe.isCloseMatch) ||
      recipe.isExactMatch
    )
  );

  // Sort by priority: exact matches first, then by missing ingredient count
  return makeNowRecipes.sort((a, b) => {
    if (prioritizeExactMatches) {
      // Exact matches first
      if (a.isExactMatch && !b.isExactMatch) return -1;
      if (!a.isExactMatch && b.isExactMatch) return 1;
    }
    
    // Then sort by missing count (fewer missing = higher priority)
    return a.makePriority - b.makePriority;
  });
};

/**
 * Enhanced function to check if a single recipe qualifies for "Make Now"
 */
export const canMakeNowEnhanced = (recipe: any, userPantry: any[]) => {
  // Convert userPantry to ingredient names array
  const pantryIngredients = userPantry.map(item => 
    item.name || item.ingredient || item.toString()
  ).filter(name => name && typeof name === 'string');

  const availability = computeAvailability(recipe, pantryIngredients);
  
  return {
    // New unified field names
    canMakeNow: availability.canMakeNow,
    availableIngredientsCount: availability.availableIngredientsCount,
    totalIngredientsCount: availability.totalIngredientsCount,
    missingIngredientsCount: availability.missingIngredientsCount,
    missingIngredients: availability.missingIngredients,
    makePriority: availability.makePriority,
    
    // Legacy compatibility
    canMake: availability.canMakeNow,
    isExactMatch: availability.makePriority === 0,
    missingCount: availability.missingIngredientsCount,
    availableCount: availability.availableIngredientsCount,
    totalCount: availability.totalIngredientsCount,
    priority: availability.makePriority,
    
    // UI helper
    missingText: getMissingText(availability.missingIngredientsCount)
  };
};

/**
 * Legacy compatibility function - use computeAvailability directly instead
 * @deprecated Use computeAvailability from shared/ingredientAvailability.ts
 */
export const calculateIngredientAvailability = (recipeIngredients: any[], userPantry: any[]) => {
  console.warn('calculateIngredientAvailability is deprecated. Use computeAvailability from shared/ingredientAvailability.ts');
  
  const pantryIngredients = userPantry.map(item => 
    item.name || item.ingredient || item.toString()
  ).filter(name => name && typeof name === 'string');

  const recipe = { ingredients: recipeIngredients };
  const availability = computeAvailability(recipe, pantryIngredients);
  
  return {
    availableCount: availability.availableIngredientsCount,
    totalCount: availability.totalIngredientsCount,
    percentage: availability.totalIngredientsCount > 0 ? 
      (availability.availableIngredientsCount / availability.totalIngredientsCount) * 100 : 0
  };
};
