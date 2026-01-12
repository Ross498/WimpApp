export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  category?: string;
  difficulty?: string;
  cookTime?: string;
  prepTime?: string;
  servings?: number;
  imageUrl?: string;
  nutritionInfo?: NutritionalInfo;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  expiryDate?: string;
  price?: number;
  purchaseDate?: string;
}

export interface Pod {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: string;
}

export interface MasteryIngredient {
  id: string;
  name: string;
  description: string;
  emoji: string;
  keysRequired: number;
  unlocked: boolean;
  recipes?: Recipe[];
  flavorPairings?: string[];
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  subscription?: {
    isPremium: boolean;
    plan: string;
    expiresAt?: string;
  };
}

export interface MealUpload {
  id: string;
  userId: string;
  imageUrl: string;
  description: string;
  ingredients?: string[];
  score?: number;
  approved?: boolean;
  createdAt: string;
}