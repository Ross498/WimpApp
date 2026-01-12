/**
 * Enhanced Size Detection - Improves ingredient quantity/size parsing from receipt scans
 */

interface EnhancedIngredient {
  name: string;
  quantity: string;
  unit?: string;
  [key: string]: any;
}

export function enhanceIngredientSizes(ingredients: any[]): EnhancedIngredient[] {
  return ingredients.map(ing => ({
    name: ing.name || ing.ingredientName || 'Unknown',
    quantity: ing.quantity?.toString() || '1',
    unit: ing.unit || '',
    ...ing
  }));
}
