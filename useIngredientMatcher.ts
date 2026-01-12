import { useQuery } from '@tanstack/react-query';

export interface IngredientMatchResult {
  isAvailable: boolean;
  matchedIngredient?: {
    id: number;
    name: string;
    quantity: number;
    unit: string;
    expiryDate?: string | null;
  };
}

export interface RecipeIngredientAnalysis {
  totalIngredients: number;
  availableCount: number;
  missingCount: number;
  canMakeNow: boolean;
  availableIngredients: string[];
  missingIngredients: string[];
  ingredientDetails: Map<string, IngredientMatchResult>;
}

/**
 * Unified ingredient matcher hook
 * Provides consistent ingredient availability checking across the entire app
 * Respects household vs individual pantry logic
 */
export function useIngredientMatcher() {
  // Fetch pantry ingredients (already household-aware from backend)
  const { data: pantryData } = useQuery({
    queryKey: ['/api/ingredients'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const pantryIngredients = (pantryData as any)?.ingredients || [];

  /**
   * Check if a single ingredient is available in the pantry
   * Uses enhanced matching logic with variations and partial matches
   */
  const checkIngredient = (recipeIngredient: string): IngredientMatchResult => {
    if (!recipeIngredient || typeof recipeIngredient !== 'string') {
      return { isAvailable: false };
    }

    const normalizedRecipe = recipeIngredient.toLowerCase().trim();

    // Find matching pantry item
    const matchedItem = pantryIngredients.find((pantryItem: any) => {
      const pantryName = (
        pantryItem?.name ||
        pantryItem?.ingredientName ||
        pantryItem?.ingredient ||
        pantryItem?.item ||
        ''
      ).toLowerCase().trim();

      if (!pantryName) return false;

      // Check quantity > 0 (critical for accurate matching)
      const quantity = pantryItem?.quantity || 0;
      if (quantity <= 0) return false;

      // Exact match
      if (pantryName === normalizedRecipe) return true;

      // Partial matches
      if (pantryName.includes(normalizedRecipe) || normalizedRecipe.includes(pantryName)) {
        return true;
      }

      // Common variations
      const variations: Record<string, string[]> = {
        'tomato': ['tomatoes', 'roma tomato', 'cherry tomato', 'canned tomatoes'],
        'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion'],
        'garlic': ['garlic clove', 'garlic cloves', 'minced garlic', 'garlic powder'],
        'cheese': ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'cheddar cheese'],
        'milk': ['whole milk', '2% milk', 'skim milk', 'dairy milk'],
        'butter': ['unsalted butter', 'salted butter', 'dairy butter'],
        'oil': ['olive oil', 'vegetable oil', 'canola oil', 'cooking oil'],
        'salt': ['sea salt', 'table salt', 'kosher salt', 'cooking salt'],
        'pepper': ['black pepper', 'white pepper', 'ground pepper'],
        'egg': ['eggs', 'large eggs', 'chicken eggs'],
        'flour': ['all-purpose flour', 'wheat flour', 'plain flour'],
        'sugar': ['white sugar', 'granulated sugar', 'caster sugar'],
      };

      // Check if recipe ingredient matches any variation
      for (const [base, vars] of Object.entries(variations)) {
        if (normalizedRecipe.includes(base) && vars.some(v => pantryName.includes(v))) {
          return true;
        }
        // Reverse check
        if (pantryName.includes(base) && vars.some(v => normalizedRecipe.includes(v))) {
          return true;
        }
      }

      return false;
    });

    if (matchedItem) {
      return {
        isAvailable: true,
        matchedIngredient: {
          id: matchedItem.id,
          name: matchedItem.name || matchedItem.ingredientName,
          quantity: matchedItem.quantity,
          unit: matchedItem.unit,
          expiryDate: matchedItem.expiryDate,
        },
      };
    }

    return { isAvailable: false };
  };

  /**
   * Analyze all ingredients for a recipe
   * Returns comprehensive analysis including counts and lists
   */
  const analyzeRecipe = (recipeIngredients: Array<{ item: string; quantity?: string }>): RecipeIngredientAnalysis => {
    const ingredientDetails = new Map<string, IngredientMatchResult>();
    const availableIngredients: string[] = [];
    const missingIngredients: string[] = [];

    recipeIngredients.forEach((ingredient) => {
      const result = checkIngredient(ingredient.item);
      ingredientDetails.set(ingredient.item, result);

      if (result.isAvailable) {
        availableIngredients.push(ingredient.item);
      } else {
        missingIngredients.push(ingredient.item);
      }
    });

    return {
      totalIngredients: recipeIngredients.length,
      availableCount: availableIngredients.length,
      missingCount: missingIngredients.length,
      canMakeNow: missingIngredients.length === 0 && recipeIngredients.length > 0,
      availableIngredients,
      missingIngredients,
      ingredientDetails,
    };
  };

  /**
   * Get expiry status for an ingredient
   */
  const getExpiryStatus = (expiryDate: string | null | undefined): {
    isExpiring: boolean;
    daysUntilExpiry: number | null;
    status: 'fresh' | 'expiring-soon' | 'expired' | 'unknown';
  } => {
    if (!expiryDate) {
      return { isExpiring: false, daysUntilExpiry: null, status: 'unknown' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { isExpiring: true, daysUntilExpiry: diffDays, status: 'expired' };
    } else if (diffDays <= 3) {
      return { isExpiring: true, daysUntilExpiry: diffDays, status: 'expiring-soon' };
    } else {
      return { isExpiring: false, daysUntilExpiry: diffDays, status: 'fresh' };
    }
  };

  return {
    checkIngredient,
    analyzeRecipe,
    getExpiryStatus,
    pantryIngredients: pantryIngredients || [],
    isPantryLoaded: pantryIngredients.length > 0,
  };
}
