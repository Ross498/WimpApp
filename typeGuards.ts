// Type guard utilities for better type safety
export interface MealPlanDay {
  day: number;
  meals: Array<{
    type: string;
    name: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: string[];
    instructions: string[];
    prepTime: number;
    cookTime: number;
    imageUrl?: string;
  }>;
  breakfast?: any;
  lunch?: any;
  dinner?: any;
}

export interface GeneratedMealPlan {
  id: string;
  name: string;
  duration: number;
  totalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  bmr: number;
  tdee: number;
  meals?: MealPlanDay[];
  days?: MealPlanDay[];
}

export function isMealPlanDay(obj: any): obj is MealPlanDay {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.day === 'number' &&
    (Array.isArray(obj.meals) || obj.breakfast || obj.lunch || obj.dinner)
  );
}

export function isGeneratedMealPlan(obj: any): obj is GeneratedMealPlan {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.duration === 'number'
  );
}

export function getMealPlanDays(mealPlan: GeneratedMealPlan): MealPlanDay[] {
  if (mealPlan.days && Array.isArray(mealPlan.days)) {
    return mealPlan.days;
  }
  if (mealPlan.meals && Array.isArray(mealPlan.meals)) {
    return mealPlan.meals;
  }
  return [];
}

export function getMealsFromDay(day: any): any[] {
  if (day.meals && Array.isArray(day.meals)) {
    return day.meals;
  }
  // Legacy format support
  const legacyMeals = [day.breakfast, day.lunch, day.dinner].filter(Boolean);
  return legacyMeals;
}