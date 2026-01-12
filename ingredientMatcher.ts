import { db } from './db';
import { ingredients, recipes, type Recipe, type Ingredient, type RecipeIngredientItem } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface IngredientMatch {
  recipeIngredient: RecipeIngredientItem;
  userIngredient?: Ingredient;
  isAvailable: boolean;
}

interface RecipeAnalysis {
  recipe: Recipe;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: RecipeIngredientItem[];
  canMakeNow: boolean;
  missingIngredientsCount: number;
  makePriority: number; // 0 = exact match, 1-4 = close matches, 5+ = can't make now
  // Unified field names for consistency
  availableIngredientsCount: number;
  totalIngredientsCount: number;
}

/**
 * Analyze recipes against user's ingredients to determine what they can make
 */
export async function analyzeRecipesForUser(userId: number, recipeList: Recipe[]): Promise<RecipeAnalysis[]> {
  if (!db) {
    throw new Error('Database connection not available');
  }

  // Get user's ingredients
  const userIngredients = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.userId, userId));

  const analyses: RecipeAnalysis[] = [];

  for (const recipe of recipeList) {
    const analysis = await analyzeRecipeIngredients(recipe, userIngredients);
    analyses.push(analysis);
  }

  return analyses;
}

/**
 * Analyze a single recipe against user's available ingredients using unified logic
 */
async function analyzeRecipeIngredients(recipe: Recipe, userIngredients: Ingredient[]): Promise<RecipeAnalysis> {
  // UNIFIED INGREDIENT MATCHING LOGIC (matches shared/ingredientAvailability.ts)
  const recipeIngredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const pantryIngredients = userIngredients.map(ing => ing.name).filter(name => name);
  
  if (recipeIngredients.length === 0) {
    return {
      recipe,
      totalIngredients: 0,
      availableIngredients: 0,
      missingIngredients: [],
      canMakeNow: true,
      missingIngredientsCount: 0,
      makePriority: 0,
      availableIngredientsCount: 0,
      totalIngredientsCount: 0
    };
  }
  
  const matches: IngredientMatch[] = [];
  let availableCount = 0;

  // Match each recipe ingredient with user's ingredients using unified logic
  for (const recipeIngredient of recipeIngredients) {
    if (!recipeIngredient || typeof recipeIngredient !== 'object') continue;
    const userIngredient = findMatchingIngredient(recipeIngredient, userIngredients);
    const isAvailable = !!userIngredient;
    
    matches.push({
      recipeIngredient,
      userIngredient,
      isAvailable,
    });
    
    if (isAvailable) availableCount++;
  }

  const missingIngredientObjects = matches
    .filter(m => !m.isAvailable)
    .map(m => m.recipeIngredient);
    
  const totalCount = recipeIngredients.length;
  const missingCount = totalCount - availableCount;
  const canMakeNow = missingCount <= 4; // Allow up to 4 missing ingredients (UNIFIED RULE)
  
  let makePriority: number;
  if (missingCount === 0) {
    makePriority = 0; // Perfect match
  } else if (missingCount <= 4) {
    makePriority = missingCount; // 1-4 missing
  } else {
    makePriority = 5; // Many missing
  }

  return {
    recipe,
    totalIngredients: totalCount,
    availableIngredients: availableCount,
    missingIngredients: missingIngredientObjects,
    canMakeNow,
    missingIngredientsCount: missingCount,
    makePriority,
    // Unified field names for consistency with frontend
    availableIngredientsCount: availableCount,
    totalIngredientsCount: totalCount,
  };
}

/**
 * Find matching ingredient in user's pantry using fuzzy matching
 */
function findMatchingIngredient(recipeIngredient: RecipeIngredientItem, userIngredients: Ingredient[]): Ingredient | undefined {
  // Handle both old and new data formats
  const ingredientName = (recipeIngredient as any)?.name || recipeIngredient?.item;
  if (!ingredientName || !userIngredients) return undefined;
  
  const recipeName = ingredientName.toLowerCase().trim();
  
  // Skip generic ingredients that can't be matched properly
  if (isGenericIngredientName(recipeName)) {
    console.log(`Skipping generic ingredient: "${recipeName}"`);
    return undefined;
  }
  
  console.log(`🔍 REAL-TIME MATCHING: "${recipeName}" against ${userIngredients.length} user ingredients`);
  
  // Direct name match (case insensitive) - CRITICAL: Check quantity > 0
  let match = userIngredients.find(ui => 
    ui?.name && ui.name.toLowerCase().trim() === recipeName && ui.quantity > 0
  );
  
  if (match) {
    console.log(`✅ DIRECT MATCH: "${recipeName}" = "${match.name}" (qty: ${match.quantity})`);
    return match;
  }

  // Exact substring matching (both ways) - CRITICAL: Check quantity > 0
  match = userIngredients.find(ui => {
    if (!ui?.name || ui.quantity <= 0) return false;
    const userName = ui.name.toLowerCase().trim();
    
    // Check if user ingredient contains recipe ingredient
    if (userName.includes(recipeName) && recipeName.length >= 3) {
      console.log(`✅ USER CONTAINS RECIPE: "${userName}" contains "${recipeName}" (qty: ${ui.quantity})`);
      return true;
    }
    
    // Check if recipe ingredient contains user ingredient
    if (recipeName.includes(userName) && userName.length >= 3) {
      console.log(`✅ RECIPE CONTAINS USER: "${recipeName}" contains "${userName}" (qty: ${ui.quantity})`);
      return true;
    }
    
    return false;
  });
  
  if (match) return match;

  // Variation matching for common ingredient synonyms
  const variations: Record<string, string[]> = {
    'tomato': ['tomatoes', 'roma tomato', 'cherry tomato', 'canned tomatoes', 'fresh tomatoes'],
    'onion': ['onions', 'yellow onion', 'white onion', 'red onion', 'sweet onion', 'cooking onion'],
    'garlic': ['garlic clove', 'garlic cloves', 'minced garlic', 'garlic powder', 'fresh garlic'],
    'cheese': ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'cheddar cheese', 'cheese block'],
    'milk': ['whole milk', '2% milk', 'skim milk', 'dairy milk', 'fresh milk'],
    'butter': ['unsalted butter', 'salted butter', 'dairy butter', 'cooking butter'],
    'oil': ['olive oil', 'vegetable oil', 'canola oil', 'cooking oil', 'sunflower oil'],
    'salt': ['sea salt', 'table salt', 'kosher salt', 'cooking salt', 'rock salt'],
    'pepper': ['black pepper', 'white pepper', 'ground pepper', 'pepper powder', 'fresh pepper'],
    'egg': ['eggs', 'chicken eggs', 'fresh eggs', 'large eggs'],
    'flour': ['all-purpose flour', 'wheat flour', 'plain flour', 'white flour'],
    'sugar': ['white sugar', 'cane sugar', 'granulated sugar', 'cooking sugar'],
    'potato': ['potatoes', 'russet potato', 'red potato', 'yukon potato', 'baby potato']
  };

  // Check variation matching
  for (const [baseIngredient, variants] of Object.entries(variations)) {
    // If recipe ingredient matches base or variants
    const recipeMatchesBase = recipeName.includes(baseIngredient) || variants.some(v => recipeName.includes(v.toLowerCase()));
    
    if (recipeMatchesBase) {
      // Look for user ingredients that match the same base or variants - CRITICAL: Check quantity > 0
      match = userIngredients.find(ui => {
        if (!ui?.name || ui.quantity <= 0) return false;
        const userName = ui.name.toLowerCase().trim();
        
        const userMatchesBase = userName.includes(baseIngredient) || variants.some(v => userName.includes(v.toLowerCase()));
        
        if (userMatchesBase) {
          console.log(`✅ VARIATION MATCH: "${recipeName}" <-> "${userName}" via "${baseIngredient}" (qty: ${ui.quantity})`);
          return true;
        }
        return false;
      });
      
      if (match) return match;
    }
  }

  // Clean ingredient name matching as last resort
  const cleanRecipeName = cleanIngredientName(recipeName);
  if (cleanRecipeName && cleanRecipeName.length > 2) {
    match = userIngredients.find(ui => {
      if (!ui?.name || ui.quantity <= 0) return false;
      const cleanUserName = cleanIngredientName(ui.name.toLowerCase());
      
      if (cleanUserName === cleanRecipeName || 
          (cleanUserName.includes(cleanRecipeName) && cleanRecipeName.length >= 3) || 
          (cleanRecipeName.includes(cleanUserName) && cleanUserName.length >= 3)) {
        console.log(`✅ CLEAN MATCH: "${cleanRecipeName}" <-> "${cleanUserName}" (qty: ${ui.quantity})`);
        return true;
      }
      return false;
    });
  }

  if (!match) {
    console.log(`❌ NO MATCH FOUND: "${recipeName}" - Available ingredients: ${userIngredients.map(ui => ui.name).join(', ')}`);
  }

  return match;
}

/**
 * Clean ingredient name by removing common descriptive words
 */
function cleanIngredientName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  const wordsToRemove = [
    'fresh', 'dried', 'ground', 'whole', 'chopped', 'minced', 'sliced',
    'diced', 'crushed', 'powdered', 'organic', 'raw', 'cooked', 'canned',
    'frozen', 'large', 'small', 'medium', 'extra', 'virgin', 'pure',
    'unsalted', 'salted', 'boneless', 'skinless', 'lean', 'fat-free',
    'low-fat', 'reduced', 'light', 'heavy', 'thick', 'thin', 'fine'
  ];

  let cleaned = name.toLowerCase();
  
  // Remove parenthetical information
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  
  // Remove measurements and common descriptors
  wordsToRemove.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  // Remove extra whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Check if ingredient name is too generic to match properly
 */
function isGenericIngredientName(name: string): boolean {
  if (!name || typeof name !== 'string') return true;
  
  const genericTerms = [
    'ingredient', 'other ingredient', 'other', 'additional ingredient',
    'optional ingredient', 'garnish', 'topping', 'filling', 'base', 
    'mix', 'blend', 'dressing', 'marinade', 'coating', 'batter'
  ];
  
  // Completely generic terms that should be filtered
  const completelyGeneric = [
    'sauce', 'the sauce', 'any sauce', 'seasoning', 'spice', 'herb',
    'the dressing', 'spice', 'seasoning'
  ];
  
  const cleanName = name.toLowerCase().trim();
  
  // Check if the name is exactly a generic term
  if (genericTerms.includes(cleanName) || completelyGeneric.includes(cleanName)) return true;
  
  // Check if name is too short (likely generic)
  if (cleanName.length <= 2) return true;
  
  // Allow specific named sauces, spices, and seasonings
  const specificIngredients = [
    'soy sauce', 'tomato sauce', 'hot sauce', 'fish sauce', 
    'worcestershire sauce', 'bbq sauce', 'teriyaki sauce'
  ];
  
  if (specificIngredients.some(specific => cleanName.includes(specific))) return false;
  
  // Check if name starts with generic terms (but not specific ingredients)
  return genericTerms.some(term => cleanName.startsWith(term + ' ') || cleanName.endsWith(' ' + term));
}

/**
 * Get missing ingredients with amounts for shopping list
 */
export function getMissingIngredientsForShopping(analysis: RecipeAnalysis): Array<{
  name: string;
  amount: string;
}> {
  return analysis.missingIngredients.map(ingredient => ({
    name: (ingredient as any)?.name || ingredient.item,
    amount: (ingredient as any)?.quantity || ingredient.quantity || '1',
  }));
}

/**
 * Enhanced recipe analysis that includes ingredient availability data
 */
export function enhanceRecipeWithIngredientAnalysis(recipe: Recipe, analysis: RecipeAnalysis): any {
  return {
    ...recipe,
    canMakeNow: analysis.canMakeNow,
    missingIngredientsCount: analysis.missingIngredientsCount,
    availableIngredientsCount: analysis.availableIngredients,
    totalIngredientsCount: analysis.totalIngredients,
    missingIngredients: analysis.missingIngredients.map(ing => (ing as any)?.name || ing.item),
    // Ensure required fields exist (commented out as these properties don't exist on Recipe type)
    // healthScore: recipe.healthScore || 50,
    // spoonacularScore: recipe.spoonacularScore || 50,
    // pricePerServing: recipe.pricePerServing || 250,
    // dietaryTags: recipe.dietaryTags || [],
  };
}