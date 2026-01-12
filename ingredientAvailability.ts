// Shared ingredient availability logic to resolve conflicts between frontend/backend
// Replaces split-brain implementations in makeNowFilter.ts and ingredientMatcher.ts

export interface NormalizedIngredient {
  name: string;
  quantity?: string;
}

export interface IngredientAvailability {
  availableIngredientsCount: number;
  totalIngredientsCount: number;
  missingIngredientsCount: number;
  missingIngredients: string[];
  canMakeNow: boolean; // true if <= 4 ingredients missing
  makePriority: number; // 0 = exact match, 1-4 = missing count, 5+ = many missing
}

// Generic ingredients to skip in matching (common cooking staples)
const GENERIC_INGREDIENTS = new Set([
  'salt', 'pepper', 'water', 'oil', 'olive oil', 'vegetable oil',
  'black pepper', 'white pepper', 'sea salt', 'kosher salt',
  'canola oil', 'coconut oil', 'butter', 'margarine'
]);

// Ingredient name synonyms for better matching
const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  'tomato': ['tomatoes', 'roma tomato', 'cherry tomato'],
  'onion': ['onions', 'yellow onion', 'white onion', 'red onion'],
  'potato': ['potatoes', 'russet potato', 'red potato', 'yukon potato'],
  'garlic': ['garlic clove', 'garlic cloves', 'minced garlic'],
  'egg': ['eggs', 'large egg', 'chicken egg'],
  'milk': ['whole milk', '2% milk', 'skim milk', '1% milk'],
  'cheese': ['cheddar cheese', 'american cheese', 'swiss cheese'],
  'chicken': ['chicken breast', 'chicken thigh', 'chicken drumstick'],
  'beef': ['ground beef', 'beef chuck', 'beef sirloin'],
  'flour': ['all-purpose flour', 'wheat flour', 'white flour'],
  'sugar': ['granulated sugar', 'white sugar', 'cane sugar'],
  'rice': ['white rice', 'brown rice', 'jasmine rice', 'basmati rice']
};

/**
 * Normalize ingredients to consistent shape regardless of input format
 */
export function normalizeIngredients(recipe: any): NormalizedIngredient[] {
  if (!recipe?.ingredients) return [];
  
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  
  return ingredients.map((ingredient: any): NormalizedIngredient => {
    // Handle string format
    if (typeof ingredient === 'string') {
      return { name: ingredient.toLowerCase().trim() };
    }
    
    // Handle object formats
    if (typeof ingredient === 'object' && ingredient !== null) {
      const name = ingredient.name || ingredient.item || ingredient.ingredient || '';
      const quantity = ingredient.quantity || ingredient.amount || '';
      
      return {
        name: name.toLowerCase().trim(),
        quantity: quantity.toString().trim()
      };
    }
    
    return { name: '' };
  }).filter((ing: NormalizedIngredient) => ing.name.length > 0);
}

/**
 * Check if two ingredients match using synonyms and fuzzy matching
 */
export function ingredientMatches(recipeIngredient: string, pantryIngredient: string): boolean {
  const recipe = recipeIngredient.toLowerCase().trim();
  const pantry = pantryIngredient.toLowerCase().trim();
  
  // Skip generic ingredients
  if (GENERIC_INGREDIENTS.has(recipe) || GENERIC_INGREDIENTS.has(pantry)) {
    return true;
  }
  
  // Exact match
  if (recipe === pantry) return true;
  
  // Partial match (contains)
  if (recipe.includes(pantry) || pantry.includes(recipe)) return true;
  
  // Synonym matching
  for (const [base, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    const recipeMatchesBase = recipe === base || synonyms.some(syn => recipe.includes(syn));
    const pantryMatchesBase = pantry === base || synonyms.some(syn => pantry.includes(syn));
    
    if (recipeMatchesBase && pantryMatchesBase) return true;
  }
  
  return false;
}

/**
 * Compute ingredient availability for a recipe against user's pantry
 */
export function computeAvailability(recipe: any, pantryIngredients: string[]): IngredientAvailability {
  const normalizedRecipeIngredients = normalizeIngredients(recipe);
  const normalizedPantry = pantryIngredients.map(ing => ing.toLowerCase().trim());
  
  if (normalizedRecipeIngredients.length === 0) {
    return {
      availableIngredientsCount: 0,
      totalIngredientsCount: 0,
      missingIngredientsCount: 0,
      missingIngredients: [],
      canMakeNow: true,
      makePriority: 0
    };
  }
  
  let availableCount = 0;
  const missingIngredients: string[] = [];
  
  for (const recipeIng of normalizedRecipeIngredients) {
    const isAvailable = normalizedPantry.some(pantryIng => 
      ingredientMatches(recipeIng.name, pantryIng)
    );
    
    if (isAvailable) {
      availableCount++;
    } else {
      missingIngredients.push(recipeIng.name);
    }
  }
  
  const totalCount = normalizedRecipeIngredients.length;
  const missingCount = totalCount - availableCount;
  const canMakeNow = missingCount <= 4; // Allow up to 4 missing ingredients
  
  let makePriority: number;
  if (missingCount === 0) {
    makePriority = 0; // Perfect match
  } else if (missingCount <= 4) {
    makePriority = missingCount; // 1-4 missing
  } else {
    makePriority = 5; // Many missing
  }
  
  return {
    availableIngredientsCount: availableCount,
    totalIngredientsCount: totalCount,
    missingIngredientsCount: missingCount,
    missingIngredients,
    canMakeNow,
    makePriority
  };
}

/**
 * Get display text for missing ingredient count
 */
export function getMissingText(missingCount: number): string {
  if (missingCount === 0) return 'Ready to make!';
  if (missingCount === 1) return '1 missing';
  if (missingCount <= 4) return `${missingCount} missing`;
  return 'Many missing';
}