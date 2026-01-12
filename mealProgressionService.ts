import { db } from "./db";
import { masteryIngredients, users } from "../shared/schema.js";
import { eq, sql } from "drizzle-orm";

interface IngredientUnlockStatus {
  id: number;
  name: string;
  description: string;
  mealsRequired: number;
  unlocked: boolean;
  userMeals: number;
  remaining: number;
  position: number;
  difficulty: string;
  image: string | null;
}

export class MealProgressionService {
  
  /**
   * Get all mastery ingredients with their unlock status for a user
   */
  async getIngredientUnlockStatus(userId: number): Promise<IngredientUnlockStatus[]> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Get all mastery ingredients with their meal requirements and release dates
    const allIngredients = await db.select({
      id: masteryIngredients.id,
      name: masteryIngredients.name,
      description: masteryIngredients.description,
      mealsRequired: masteryIngredients.mealsRequired,
      position: masteryIngredients.position,
      difficulty: masteryIngredients.difficulty,
      image: masteryIngredients.image,
      releaseDate: sql<Date>`release_date`
    }).from(masteryIngredients);

    // Count user's meals uploaded after each ingredient's release date using raw SQL for better control
    const mealCountPromises = allIngredients.map(async (ingredient) => {
      if (!db) {
        throw new Error('Database connection not available');
      }
      const result = await db.execute(sql`
        SELECT COUNT(um.id) as count
        FROM user_meals um 
        WHERE um.user_id = ${userId}
        AND um.uploaded_at >= ${ingredient.releaseDate}
      `);
      
      return {
        ingredientId: ingredient.id,
        count: parseInt(result.rows[0]?.count as string || '0')
      };
    });

    const mealCounts = await Promise.all(mealCountPromises);
    const mealCountMap = new Map(mealCounts.map(mc => [mc.ingredientId, mc.count]));

    // Transform ingredients with release date-based meal counting
    return allIngredients.map(ingredient => {
      const userQualifyingMeals = mealCountMap.get(ingredient.id) || 0;
      const unlocked = userQualifyingMeals >= ingredient.mealsRequired;
      const remaining = Math.max(0, ingredient.mealsRequired - userQualifyingMeals);
      
      return {
        id: ingredient.id,
        name: ingredient.name,
        description: ingredient.description,
        mealsRequired: ingredient.mealsRequired,
        unlocked,
        userMeals: userQualifyingMeals, // Only meals uploaded after release date count
        remaining,
        position: ingredient.position,
        difficulty: ingredient.difficulty,
        image: ingredient.image,
      };
    }).sort((a, b) => a.position - b.position);
  }

  /**
   * Get only the flavor pairing ingredients (pasta, apple, potato, onion, tomato)
   */
  async getFlavorPairingUnlockStatus(userId: number): Promise<IngredientUnlockStatus[]> {
    const allIngredients = await this.getIngredientUnlockStatus(userId);
    
    // Filter for the main flavor pairing ingredients
    const flavorPairingIngredients = ['Onion', 'Tomato', 'Pasta', 'Potato', 'Apple'];
    
    return allIngredients.filter(ingredient => 
      flavorPairingIngredients.includes(ingredient.name)
    );
  }

  /**
   * Update user's meal count after completing a meal with release date tracking
   */
  async incrementUserMeals(userId: number, mealName: string = 'Unknown Meal', difficulty: string = 'medium'): Promise<number> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Insert meal record for release date tracking
    await db.execute(sql`
      INSERT INTO user_meals (user_id, meal_name, difficulty, uploaded_at) 
      VALUES (${userId}, ${mealName}, ${difficulty}, NOW())
    `);

    // Update user's total completed meals counter
    const [updatedUser] = await db.update(users)
      .set({ 
        mealsCompleted: sql`meals_completed + 1`
      })
      .where(eq(users.id, userId))
      .returning({ mealsCompleted: users.mealsCompleted });

    return updatedUser?.mealsCompleted || 0;
  }

  /**
   * Check which ingredients were just unlocked after a meal completion
   */
  async getNewlyUnlockedIngredients(userId: number, previousMealCount: number): Promise<IngredientUnlockStatus[]> {
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Get ingredients that require exactly the current meal count (just unlocked)
    const [user] = await db.select({ mealsCompleted: users.mealsCompleted })
      .from(users)
      .where(eq(users.id, userId));

    const currentMeals = user?.mealsCompleted || 0;

    const ingredients = await db.select({
      id: masteryIngredients.id,
      name: masteryIngredients.name,
      description: masteryIngredients.description,
      mealsRequired: masteryIngredients.mealsRequired,
      position: masteryIngredients.position,
      difficulty: masteryIngredients.difficulty,
      image: masteryIngredients.image,
    })
    .from(masteryIngredients)
    .where(eq(masteryIngredients.mealsRequired, currentMeals));

    return ingredients.map(ingredient => ({
      ...ingredient,
      unlocked: true,
      userMeals: currentMeals,
      remaining: 0
    }));
  }
}

export const mealProgressionService = new MealProgressionService();