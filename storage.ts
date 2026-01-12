import {
  users,
  type User,
  type UpsertUser,
  ingredients,
  type Ingredient,
  type InsertIngredient,
  customRecipes,
  type Recipe,
  type InsertRecipe,
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
} from "../shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Other WIMP operations
  getIngredients(userId: string): Promise<Ingredient[]>;
  addIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: number, updates: Partial<Ingredient>): Promise<Ingredient>;
  deleteIngredient(id: number, userId: string): Promise<void>;
  deleteAllIngredients(userId: string): Promise<void>;
  getRecipes(): Promise<Recipe[]>;
  getRecipeById(id: number): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertCustomRecipe): Promise<Recipe>;
  getUserFavorites(userId: string): Promise<UserFavorite[]>;
  addToFavorites(userId: string, recipeId: number): Promise<UserFavorite>;
  removeFromFavorites(userId: string, recipeId: number): Promise<void>;
  getMealPlans(userId: string): Promise<MealPlan[]>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  createAiMealPlan(mealPlan: any): Promise<any>;
  addRecipeToMealPlan(mealPlanRecipe: InsertMealPlanRecipe): Promise<MealPlanRecipe>;
}

// Import PgStorage for singleton pattern
import { PgStorage } from './pgStorage.js';

// CRITICAL FIX: Single shared PgStorage instance to prevent connection duplication
export const sharedPgStorage = new PgStorage();