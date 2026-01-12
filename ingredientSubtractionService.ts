import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { ingredients, customRecipes, users, householdIngredients } from "../shared/schema.js";
import { calculateEstimatedUsage, isLowStock } from "./utils/smartSubtraction";
import { findIngredientMatches } from "./utils/intelligentIngredientMatcher";

// Type definition for subtracted ingredient items
interface SubtractedIngredient {
  name: string;
  subtracted: number;
  remaining: number;
  isLowStock: boolean;
  wasSmartEstimated: boolean;
}

/**
 * Ingredient Subtraction Service - Handles automatic pantry updates from meal uploads
 */
export class IngredientSubtractionService {
  /**
   * Subtract ingredients from pantry based on uploaded meal analysis
   */
  static async subtractIngredientsFromMeal(
    userId: string, 
    detectedIngredients: string[], 
    servings: number = 1,
    useSmartEstimation: boolean = true
  ) {
    if (!db) {
      throw new Error('Database connection not available');
    }

    try {
      const subtractedIngredients: SubtractedIngredient[] = [];

      // First check if user is in a household
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (user && user.householdId) {
        // User is in household - subtract from household pantry
        const pantryIngredientsRaw = await db
          .select()
          .from(householdIngredients)
          .where(eq(householdIngredients.householdId, user.householdId));

        // Filter out items with null quantities and map to expected format
        const pantryIngredients = pantryIngredientsRaw
          .filter(item => item.quantity !== null && item.quantity > 0)
          .map(item => ({
            id: item.id,
            quantity: item.quantity as number, // Safe cast since we filtered out nulls
            unit: item.unit || undefined, // Convert null to undefined for compatibility
            ingredientName: item.ingredientName,
            name: item.ingredientName // Add name field for compatibility
          }));

        // Use intelligent ingredient matching for all detected ingredients
        const matchingResults = findIngredientMatches(detectedIngredients, pantryIngredients);

        for (const result of matchingResults) {
          if (!result.match) {
            console.log(`❌ NO INTELLIGENT MATCH: "${result.detectedIngredient}" - no pantry item found with sufficient confidence`);
            continue;
          }

          const matchingItem = result.match.item;
          const confidence = result.match.confidence;
          console.log(`✅ INTELLIGENT MATCH: "${result.detectedIngredient}" -> "${matchingItem.ingredientName}" (confidence: ${confidence.toFixed(2)})`);

          if (matchingItem.quantity !== null && matchingItem.quantity > 0) {
            let totalSubtraction: number;

            if (useSmartEstimation) {
              // Use smart estimation for realistic ingredient usage
              const estimate = calculateEstimatedUsage(
                matchingItem.ingredientName,
                matchingItem.quantity,
                matchingItem.unit || 'units',
                servings,
                'dinner'
              );
              totalSubtraction = Math.min(estimate.estimatedQuantity, matchingItem.quantity);
            } else {
              // Fallback to simple subtraction
              const baseSubtraction = 1;
              totalSubtraction = Math.min(baseSubtraction * servings, matchingItem.quantity);
            }

            const newQuantity = Math.max(0, matchingItem.quantity - totalSubtraction);

            if (newQuantity <= 0) {
              await db
                .delete(householdIngredients)
                .where(eq(householdIngredients.id, matchingItem.id));
            } else {
              await db
                .update(householdIngredients)
                .set({ 
                  quantity: newQuantity,
                  updatedBy: parseInt(userId),
                  updatedAt: new Date()
                })
                .where(eq(householdIngredients.id, matchingItem.id));
            }

            // Check if ingredient is now low stock
            const isNowLowStock = isLowStock({
              quantity: newQuantity,
              unit: matchingItem.unit || 'units',
              name: matchingItem.ingredientName,
              originalQuantity: matchingItem.quantity + totalSubtraction
            });

            subtractedIngredients.push({
              name: matchingItem.ingredientName,
              subtracted: totalSubtraction,
              remaining: newQuantity,
              isLowStock: isNowLowStock,
              wasSmartEstimated: useSmartEstimation
            });
          }
        }
      } else {
        // Individual user - subtract from personal pantry
        const pantryIngredientsRaw = await db
          .select()
          .from(ingredients)
          .where(eq(ingredients.userId, parseInt(userId)));

        // Filter out items with null quantities and map to expected format
        const pantryIngredients = pantryIngredientsRaw
          .filter(item => item.quantity !== null && item.quantity > 0)
          .map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity as number, // Safe cast since we filtered out nulls
            unit: item.unit || undefined // Convert null to undefined for compatibility
          }));

        // Use intelligent ingredient matching for all detected ingredients
        const matchingResults = findIngredientMatches(detectedIngredients, pantryIngredients);

        for (const result of matchingResults) {
          if (!result.match) {
            console.log(`❌ NO INTELLIGENT MATCH: "${result.detectedIngredient}" - no pantry item found with sufficient confidence`);
            continue;
          }

          const matchingItem = result.match.item;
          const confidence = result.match.confidence;
          console.log(`✅ INTELLIGENT MATCH: "${result.detectedIngredient}" -> "${matchingItem.name}" (confidence: ${confidence.toFixed(2)})`);

          if (matchingItem.quantity !== null && matchingItem.quantity > 0) {
            let totalSubtraction: number;

            if (useSmartEstimation) {
              // Use smart estimation for realistic ingredient usage
              const estimate = calculateEstimatedUsage(
                matchingItem.name,
                matchingItem.quantity,
                matchingItem.unit || 'units',
                servings,
                'dinner'
              );
              totalSubtraction = Math.min(estimate.estimatedQuantity, matchingItem.quantity);
            } else {
              // Fallback to simple subtraction
              const baseSubtraction = 1;
              totalSubtraction = Math.min(baseSubtraction * servings, matchingItem.quantity);
            }

            const newQuantity = Math.max(0, matchingItem.quantity - totalSubtraction);

            console.log(`🔥 UPDATING INGREDIENT: ${matchingItem.name} from ${matchingItem.quantity} to ${newQuantity} (-${totalSubtraction})`);

            if (newQuantity <= 0) {
              console.log(`🗑️ DELETING INGREDIENT: ${matchingItem.name} (quantity reached 0)`);
              const deleteResult = await db
                .delete(ingredients)
                .where(eq(ingredients.id, matchingItem.id));
              console.log(`✅ DELETED INGREDIENT: ${matchingItem.name}, rows affected: ${deleteResult.rowCount}`);
            } else {
              console.log(`📝 UPDATING INGREDIENT: ${matchingItem.name} to quantity ${newQuantity}`);
              const updateResult = await db
                .update(ingredients)
                .set({ 
                  quantity: newQuantity
                })
                .where(eq(ingredients.id, matchingItem.id));
              console.log(`✅ UPDATED ingredient ${matchingItem.name} to quantity ${newQuantity}, rows affected: ${updateResult.rowCount}`);
            }

            // Check if ingredient is now low stock
            const isNowLowStock = isLowStock({
              quantity: newQuantity,
              unit: matchingItem.unit || 'units',
              name: matchingItem.name,
              originalQuantity: matchingItem.quantity + totalSubtraction
            });

            subtractedIngredients.push({
              name: matchingItem.name,
              subtracted: totalSubtraction,
              remaining: newQuantity,
              isLowStock: isNowLowStock,
              wasSmartEstimated: useSmartEstimation
            });
          }
        }
      }

      return {
        success: true,
        subtractedIngredients,
        totalItemsSubtracted: subtractedIngredients.length
      };

    } catch (error) {
      console.error('Error subtracting ingredients:', error);
      throw new Error('Failed to subtract ingredients from pantry');
    }
  }

  /**
   * Get smart expiry alerts for premium users
   */
  static async getExpiryAlerts(userId: string) {
    try {
      // For test users, return mock expiry alerts
      if (userId === 'test-user-id') {
        return {
          success: false,
          message: 'Upgrade to Premium to get smart expiry alerts and recipe suggestions!'
        };
      }

      if (!db) {
        throw new Error('Database connection not available');
      }

      // Check if user has premium subscription
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      const isPremium = user.length > 0 && user[0].subscriptionTier === 'premium';

      if (!isPremium) {
        return {
          success: false,
          message: 'Premium subscription required for expiry alerts'
        };
      }

      // Get expiring items (within 3 days)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const expiringItems = await db
        .select()
        .from(ingredients)
        .where(eq(ingredients.userId, parseInt(userId)));

      // Generate recipe suggestions based on expiring ingredients
      const recipeSuggestions = await this.getRecipeSuggestionsForIngredients(
        expiringItems.map(item => item.name)
      );

      return {
        success: true,
        expiringItems,
        recipeSuggestions,
        alertType: 'expiry_warning'
      };

    } catch (error) {
      console.error('Error getting expiry alerts:', error);
      throw new Error('Failed to get expiry alerts');
    }
  }

  /**
   * Get recipe suggestions for specific ingredients
   */
  private static async getRecipeSuggestionsForIngredients(ingredients: string[]) {
    if (!db || ingredients.length === 0) {
      return [];
    }

    try {
      const recipes = await db
        .select()
        .from(customRecipes)
        .where(eq(customRecipes.isActive, true))
        .limit(20);

      // Filter recipes that use the expiring ingredients
      const matchingRecipes = recipes.filter(recipe => {
        const recipeIngredients = recipe.ingredients || [];
        return ingredients.some(ingredient => 
          recipeIngredients.some((recipeIng: any) => 
            recipeIng.item?.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(recipeIng.item?.toLowerCase())
          )
        );
      });

      return matchingRecipes.slice(0, 5).map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        matchingIngredients: ingredients.filter(ingredient => 
          recipe.ingredients?.some((recipeIng: any) => 
            recipeIng.item?.toLowerCase().includes(ingredient.toLowerCase())
          )
        )
      }));

    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      return [];
    }
  }

  /**
   * Check upload limits for free users
   */
  static async checkUploadLimits(userId: string) {
    try {
      // For development/test mode, always allow uploads
      if (userId === 'test-user-id') {
        return {
          canUpload: true,
          unlimited: false,
          uploadsRemaining: 3,
          uploadsThisWeek: 2,
          maxUploads: 5,
          message: '3 uploads remaining this week'
        };
      }

      // For real users, check their subscription status
      if (db) {
        try {
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, parseInt(userId)))
            .limit(1);

          const isPremium = user.length > 0 && user[0].subscriptionTier === 'premium';

          if (isPremium) {
            return {
              canUpload: true,
              unlimited: true,
              uploadsRemaining: 999,
              message: 'Premium user - unlimited uploads'
            };
          }
        } catch (dbError) {
          console.log('Database not available, using default limits');
        }
      }

      // Default free user limits
      const uploadsThisWeek = 2;
      const maxUploads = 5;

      return {
        canUpload: uploadsThisWeek < maxUploads,
        unlimited: false,
        uploadsRemaining: maxUploads - uploadsThisWeek,
        uploadsThisWeek,
        maxUploads,
        message: uploadsThisWeek >= maxUploads ? 
          'Weekly upload limit reached. Upgrade to Premium for unlimited uploads!' :
          `${maxUploads - uploadsThisWeek} uploads remaining this week`
      };

    } catch (error) {
      console.error('Error checking upload limits:', error);
      // Return default limits on error
      return {
        canUpload: true,
        unlimited: false,
        uploadsRemaining: 3,
        uploadsThisWeek: 2,
        maxUploads: 5,
        message: '3 uploads remaining this week'
      };
    }
  }
}