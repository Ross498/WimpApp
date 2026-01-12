import { eq, and } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  type User,
  type UpsertUser,
  ingredients,
  type Ingredient,
  type InsertIngredient,
  customRecipes,
  type Recipe,
  type InsertCustomRecipe,
  userFavorites,
  type UserFavorite,
  type InsertUserFavorite,
  mealPlans,
  type MealPlan,
  type InsertMealPlan,
  aiMealPlans,
  mealPlanRecipes,
  type MealPlanRecipe,
  type InsertMealPlanRecipe,
} from '../shared/schema';
import type { IStorage } from './storage.js';

export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1);
    return result[0];
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    if (!db) throw new Error('Database not available');
    
    const existing = await this.getUser(user.id.toString());
    if (existing) {
      const updated = await db
        .update(users)
        .set({ ...user, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      return updated[0];
    } else {
      const inserted = await db.insert(users).values(user).returning();
      return inserted[0];
    }
  }

  async getIngredients(userId: string): Promise<Ingredient[]> {
    if (!db) return [];
    return await db.select().from(ingredients).where(eq(ingredients.userId, parseInt(userId)));
  }

  async addIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(ingredients).values(ingredient).returning();
    return result[0];
  }

  async createIngredient(ingredient: InsertIngredient): Promise<Ingredient> {
    return this.addIngredient(ingredient);
  }

  async updateIngredient(id: number, updates: Partial<Ingredient>): Promise<Ingredient> {
    if (!db) throw new Error('Database not available');
    const result = await db
      .update(ingredients)
      .set(updates)
      .where(eq(ingredients.id, id))
      .returning();
    return result[0];
  }

  async deleteIngredient(id: number, userId: string): Promise<void> {
    if (!db) throw new Error('Database not available');
    await db
      .delete(ingredients)
      .where(and(eq(ingredients.id, id), eq(ingredients.userId, parseInt(userId))));
  }

  async deleteAllIngredients(userId: string): Promise<void> {
    if (!db) throw new Error('Database not available');
    await db.delete(ingredients).where(eq(ingredients.userId, parseInt(userId)));
  }

  async getRecipes(): Promise<Recipe[]> {
    if (!db) return [];
    return await db.select().from(customRecipes);
  }

  async getRecipeById(id: number): Promise<Recipe | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(customRecipes).where(eq(customRecipes.id, id)).limit(1);
    return result[0];
  }

  async createRecipe(recipe: InsertCustomRecipe): Promise<Recipe> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(customRecipes).values(recipe).returning();
    return result[0];
  }

  async getUserFavorites(userId: string): Promise<UserFavorite[]> {
    if (!db) return [];
    return await db.select().from(userFavorites).where(eq(userFavorites.userId, parseInt(userId)));
  }

  async addToFavorites(userId: string, recipeId: number): Promise<UserFavorite> {
    if (!db) throw new Error('Database not available');
    const result = await db
      .insert(userFavorites)
      .values({ userId: parseInt(userId), recipeId })
      .returning();
    return result[0];
  }

  async removeFromFavorites(userId: string, recipeId: number): Promise<void> {
    if (!db) throw new Error('Database not available');
    await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, parseInt(userId)),
        eq(userFavorites.recipeId, recipeId)
      ));
  }

  async getMealPlans(userId: string): Promise<MealPlan[]> {
    if (!db) return [];
    return await db.select().from(mealPlans).where(eq(mealPlans.userId, parseInt(userId)));
  }

  async createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(mealPlans).values(mealPlan).returning();
    return result[0];
  }

  async createAiMealPlan(mealPlan: any): Promise<any> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(aiMealPlans).values(mealPlan).returning();
    return result[0];
  }

  async addRecipeToMealPlan(mealPlanRecipe: InsertMealPlanRecipe): Promise<MealPlanRecipe> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(mealPlanRecipes).values(mealPlanRecipe).returning();
    return result[0];
  }
}
