// Create dynamic Make Now category implementation
const fs = require('fs');

const makeDynamicMakeNowComponent = `
// Dynamic Make Now category filter utility
export const calculateIngredientAvailability = (recipeIngredients, userPantry) => {
  if (!Array.isArray(recipeIngredients) || !Array.isArray(userPantry) || recipeIngredients.length === 0) {
    return { availableCount: 0, totalCount: 0, percentage: 0 };
  }

  const availableCount = recipeIngredients.filter(ingredient => {
    const itemName = cleanIngredientName(ingredient.item || ingredient.name || '');
    return userPantry.some(pantryItem => 
      ingredientMatches(itemName, pantryItem.name || pantryItem.ingredient || '')
    );
  }).length;

  const totalCount = recipeIngredients.length;
  const percentage = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;

  return { availableCount, totalCount, percentage };
};

export const cleanIngredientName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\\d+\\s*(g|kg|ml|l|cup|cups|tbsp|tsp|piece|pieces|medium|large|small)/g, '')
    .replace(/^\\d+\\/\\d+\\s+/, '')
    .trim();
};

export const ingredientMatches = (recipeIngredient, pantryIngredient) => {
  if (!recipeIngredient || !pantryIngredient) return false;
  
  const recipe = recipeIngredient.toLowerCase();
  const pantry = pantryIngredient.toLowerCase();
  
  // Direct match
  if (pantry.includes(recipe) || recipe.includes(pantry)) return true;
  
  // Common variations
  const variations = {
    'macaroni': ['pasta', 'noodles'],
    'pasta': ['macaroni', 'spaghetti', 'penne'],
    'cheese': ['cheddar', 'mozzarella', 'parmesan'],
    'milk': ['dairy', 'cream'],
    'butter': ['margarine'],
    'oil': ['olive oil', 'vegetable oil', 'canola oil'],
    'tomato': ['tomatoes', 'roma tomato'],
    'onion': ['onions', 'yellow onion', 'white onion'],
    'garlic': ['garlic clove', 'garlic cloves']
  };
  
  for (const [base, alts] of Object.entries(variations)) {
    if ((recipe.includes(base) && (pantry.includes(base) || alts.some(alt => pantry.includes(alt)))) ||
        (pantry.includes(base) && alts.some(alt => recipe.includes(alt)))) {
      return true;
    }
  }
  
  return false;
};

// Filter recipes that can be made (≥70% ingredients available)
export const filterMakeNowRecipes = (recipes, userPantry, threshold = 70) => {
  return recipes.filter(recipe => {
    const { percentage } = calculateIngredientAvailability(recipe.ingredients || [], userPantry);
    return percentage >= threshold;
  });
};
`;

console.log('📁 Creating dynamic Make Now utility...');

try {
  // Create the utility file
  fs.writeFileSync('client/src/utils/makeNowFilter.ts', makeDynamicMakeNowComponent);
  console.log('✅ Created makeNowFilter.ts utility');
  
  console.log('🔧 Dynamic Make Now implementation ready!');
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('1. Import the utility in IngredientsScreen and other recipe components');
  console.log('2. Replace static "Make Now" category with dynamic filtering');
  console.log('3. Filter recipes in real-time based on user pantry ingredients');
  console.log('4. Show percentage availability for each recipe');
  
} catch (error) {
  console.error('❌ Error creating files:', error.message);
}