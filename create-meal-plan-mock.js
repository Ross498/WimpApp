// Create comprehensive meal plan mock data for rosspinnock (user 41) directly in database
const { db } = require('./server/db.js');
const { userAiRecipes } = require('./shared/schema.js');

async function createMealPlanMock() {
  console.log('🍽️ Creating comprehensive meal plan mock for rosspinnock (user 41)...');
  
  try {
    // Sample 7-day meal plan data
    const mealPlanData = {
      planName: "Mediterranean Wellness Plan",
      duration: 7,
      totalCaloriesPerDay: 2200,
      bmr: 1650,
      tdee: 2200,
      days: [
        {
          day: 1,
          meals: [
            {
              type: "breakfast",
              name: "Greek Yogurt Berry Bowl",
              description: "Creamy Greek yogurt topped with mixed berries and granola",
              calories: 450,
              protein: 25,
              carbs: 45,
              fat: 18,
              ingredients: ["Greek yogurt", "Mixed berries", "Granola", "Honey"],
              instructions: ["Mix yogurt in bowl", "Top with berries", "Add granola", "Drizzle honey"],
              prepTime: 5,
              cookTime: 0
            },
            {
              type: "lunch", 
              name: "Mediterranean Quinoa Salad",
              description: "Fresh quinoa salad with vegetables and feta cheese",
              calories: 520,
              protein: 22,
              carbs: 65,
              fat: 18,
              ingredients: ["Quinoa", "Cucumber", "Tomatoes", "Feta cheese", "Olive oil"],
              instructions: ["Cook quinoa", "Chop vegetables", "Mix with feta", "Dress with olive oil"],
              prepTime: 15,
              cookTime: 15
            },
            {
              type: "dinner",
              name: "Grilled Salmon with Roasted Vegetables",
              description: "Fresh salmon fillet with colorful roasted seasonal vegetables",
              calories: 650,
              protein: 45,
              carbs: 35,
              fat: 28,
              ingredients: ["Salmon fillet", "Broccoli", "Bell peppers", "Zucchini", "Olive oil"],
              instructions: ["Season salmon", "Chop vegetables", "Roast vegetables", "Grill salmon", "Serve together"],
              prepTime: 10,
              cookTime: 25
            },
            {
              type: "snack",
              name: "Mixed Nuts & Dried Fruit",
              description: "Healthy energy snack with almonds and dried cranberries",
              calories: 180,
              protein: 6,
              carbs: 12,
              fat: 14,
              ingredients: ["Almonds", "Dried cranberries"],
              instructions: ["Mix nuts and fruit"],
              prepTime: 2,
              cookTime: 0
            }
          ]
        },
        {
          day: 2,
          meals: [
            {
              type: "breakfast",
              name: "Avocado Toast with Poached Egg",
              description: "Whole grain toast topped with mashed avocado and poached egg",
              calories: 480,
              protein: 20,
              carbs: 42,
              fat: 26,
              ingredients: ["Whole grain bread", "Avocado", "Eggs", "Lemon", "Salt"],
              instructions: ["Toast bread", "Mash avocado", "Poach egg", "Assemble toast", "Season with lemon"],
              prepTime: 8,
              cookTime: 8
            },
            {
              type: "lunch",
              name: "Italian Minestrone Soup",
              description: "Hearty vegetable soup with beans and pasta",
              calories: 420,
              protein: 18,
              carbs: 58,
              fat: 12,
              ingredients: ["Mixed vegetables", "Kidney beans", "Small pasta", "Vegetable broth", "Italian herbs"],
              instructions: ["Sauté vegetables", "Add broth", "Add beans and pasta", "Simmer until tender", "Season with herbs"],
              prepTime: 15,
              cookTime: 25
            },
            {
              type: "dinner",
              name: "Herb-Crusted Chicken Breast",
              description: "Tender chicken breast with Mediterranean herb crust",
              calories: 580,
              protein: 48,
              carbs: 25,
              fat: 26,
              ingredients: ["Chicken breast", "Fresh herbs", "Breadcrumbs", "Sweet potato", "Green beans"],
              instructions: ["Make herb crust", "Coat chicken", "Roast chicken and vegetables", "Rest before slicing"],
              prepTime: 15,
              cookTime: 30
            },
            {
              type: "snack",
              name: "Apple Slices with Almond Butter",
              description: "Crisp apple slices with creamy almond butter",
              calories: 200,
              protein: 8,
              carbs: 18,
              fat: 12,
              ingredients: ["Apple", "Almond butter"],
              instructions: ["Slice apple", "Serve with almond butter"],
              prepTime: 3,
              cookTime: 0
            }
          ]
        }
      ]
    };

    console.log('💾 Saving meal plan to database...');
    
    let savedMealCount = 0;
    for (const day of mealPlanData.days) {
      for (const meal of day.meals) {
        try {
          const mealRecord = {
            userId: 41, // rosspinnock user ID
            title: meal.name,
            description: meal.description,
            instructions: meal.instructions,
            prepTime: meal.prepTime,
            cookTime: meal.cookTime,
            servings: 1,
            difficulty: 'medium',
            category: meal.type,
            imageUrl: '/api/placeholder/400/300',
            ingredients: meal.ingredients.map(ing => ({ item: ing, quantity: '1 serving' })),
            source: 'ai_meal_plan_mock',
            cuisine: 'Mediterranean',
            dietaryTags: [],
            nutritionInfo: {
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat
            }
          };

          if (db) {
            const [savedMeal] = await db.insert(userAiRecipes)
              .values(mealRecord)
              .returning();
            
            savedMealCount++;
            console.log(`✅ Saved Day ${day.day} ${meal.type}: ${meal.name}`);
          }
        } catch (saveError) {
          console.error(`❌ Failed to save ${meal.name}:`, saveError);
        }
      }
    }

    console.log(`🎉 Successfully created ${savedMealCount} meal plan entries for rosspinnock!`);
    console.log('📊 Mock meal plan summary:');
    console.log(`  - Plan: ${mealPlanData.planName}`);
    console.log(`  - Duration: ${mealPlanData.duration} days`);
    console.log(`  - Daily calories: ${mealPlanData.totalCaloriesPerDay}`);
    console.log(`  - Total meals saved: ${savedMealCount}`);
    
  } catch (error) {
    console.error('❌ Failed to create meal plan mock:', error);
    process.exit(1);
  }
}

createMealPlanMock().then(() => {
  console.log('✅ Meal plan mock creation complete!');
  process.exit(0);
});