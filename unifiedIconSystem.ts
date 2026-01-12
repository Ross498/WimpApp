// Unified Ingredient Icon System
// This is the ONLY icon system - all other icon functions should be removed

const DEFAULT_INGREDIENT_ICON = '🥬'; // Default emoji fallback

// Ingredient icon mapping - PNG files from attached_assets
const INGREDIENT_ICON_MAP: Record<string, string> = {
  // Fruits - Updated with new emoji-style icons
  'apple': '/attached_assets/apple_fruit_food_icon_218380_1759611717852.png',
  'red apple': '/attached_assets/apple_fruit_food_icon_218380_1759611717852.png',
  'green apple': '/attached_assets/Greenapple_1754125200255.png',
  'orange': '/attached_assets/Orange_1754125200257.png',
  'banana': '/attached_assets/banana_fruit_food_icon_218382_1759611717852.png',
  'bananas': '/attached_assets/banana_fruit_food_icon_218382_1759611717852.png',
  'avocado': '/attached_assets/avocado_fruit_food_icon_218379_1759611717853.png',
  'lemon': '/attached_assets/lemon_fruit_food_icon_218391_1759611717849.png',
  'lemons': '/attached_assets/lemon_fruit_food_icon_218391_1759611717849.png',
  'lime': '/attached_assets/Lime_1754125200256.png',
  'limes': '/attached_assets/Lime_1754125200256.png',
  'grapes': '/attached_assets/grape_fruit_food_icon_218400_1759611717852.png',
  'grape': '/attached_assets/grape_fruit_food_icon_218400_1759611717852.png',
  'strawberries': '/attached_assets/strawberry_fruit_food_icon_218386_1759611717852.png',
  'strawberry': '/attached_assets/strawberry_fruit_food_icon_218386_1759611717852.png',
  'blueberries': '/attached_assets/Blueberries_1754125200254.png',
  'cherries': '/attached_assets/Cherries_1754125200255.png',
  'peach': '/attached_assets/peach_fruit_food_icon_218397_1759611717849.png',
  'peaches': '/attached_assets/peach_fruit_food_icon_218397_1759611717849.png',
  'pear': '/attached_assets/pear_fruit_food_icon_218392_1759611717849.png',
  'pears': '/attached_assets/pear_fruit_food_icon_218392_1759611717849.png',
  'pineapple': '/attached_assets/pineapple_fruit_food_icon_218399_1759611717851.png',
  'pineapples': '/attached_assets/pineapple_fruit_food_icon_218399_1759611717851.png',
  'coconut': '/attached_assets/Cocunut_1754125200252.png',
  'kiwi': '/attached_assets/kiwi_fruit_food_icon_218384_1759611717850.png',
  'kiwis': '/attached_assets/kiwi_fruit_food_icon_218384_1759611717850.png',
  'mango': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
  'mangos': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
  'mangoes': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
  'melon': '/attached_assets/melon_fruit_food_icon_218393_1759611664596.png',
  'watermelon': '/attached_assets/Melon_1754125200258.png',
  'papaya': '/attached_assets/papaya_fruit_food_icon_218395_1759611717850.png',
  'papayas': '/attached_assets/papaya_fruit_food_icon_218395_1759611717850.png',
  'raspberry': '/attached_assets/raspberry_fruit_food_icon_218398_1759611717850.png',
  'raspberries': '/attached_assets/raspberry_fruit_food_icon_218398_1759611717850.png',
  'guava': '/attached_assets/guava_fruit_food_icon_218390_1759611717850.png',
  'guavas': '/attached_assets/guava_fruit_food_icon_218390_1759611717850.png',
  'pomegranate': '/attached_assets/pomegranate_fruit_food_icon_218396_1759611717851.png',
  'pomegranates': '/attached_assets/pomegranate_fruit_food_icon_218396_1759611717851.png',
  'lychee': '/attached_assets/lychee_fruit_food_icon_218381_1759611717851.png',
  'lychees': '/attached_assets/lychee_fruit_food_icon_218381_1759611717851.png',
  'dates': '/attached_assets/dates_fruit_food_icon_218405_1759611717849.png',
  'date': '/attached_assets/dates_fruit_food_icon_218405_1759611717849.png',

  // Vegetables - Updated with new icons
  'tomato': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_tomatto_o_b25eb3fd-7ea4-4225-8cb2-1044eaf615b8_2_1752835325559.png',
  'tomatoes': '/attached_assets/tomato_vegetables_vegetable_food_agriculture_fruit_icon_220810_1759611664601.png',
  'onion': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_brown_oni_e648d10a-e8a1-42cb-bb5c-ed09efc29425_2_1752835325558.png',
  'garlic': '/attached_assets/Garlic_1754125435666.png',
  'potato': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_bunch_of__baf4f65f-963b-4bfd-8e91-6305a8243bab_1_1752835325556.png',
  'potatoes': '/attached_assets/potatoes_potato_vegetables_vegetable_food_agriculture_icon_220839_1759611664599.png',
  'carrot': '/attached_assets/Carrot_1754125435667.png',
  'carrots': '/attached_assets/Carrot_1754125435667.png',
  'broccoli': '/attached_assets/Brocolli_1754125435666.png',
  'lettuce': '/attached_assets/Lettuce_1754125435666.png',
  'cucumber': '/attached_assets/Cucmunber_1754125435667.png',
  'cucumbers': '/attached_assets/Cucmunber_1754125435667.png',
  'pepper': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
  'peppers': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
  'bell pepper': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
  'chili': '/attached_assets/Chilli_1754125435666.png',
  'chilli': '/attached_assets/chilli_vegetables_vegetable_food_agriculture_spicy_icon_220813_1759611664601.png',
  'corn': '/attached_assets/Corn_1754125435667.png',
  'mushroom': '/attached_assets/Mushroom_1754125435663.png',
  'mushrooms': '/attached_assets/mushrooms_champignon_vegetables_vegetable_food_agriculture_icon_220834_1759611664598.png',
  'eggplant': '/attached_assets/Eggplant_1754125435668.png',
  'beans': '/attached_assets/Beans_1754125435664.png',
  'peas': '/attached_assets/pea_peas_vegetables_vegetable_food_agriculture_icon_220816_1759611664600.png',
  'pea': '/attached_assets/pea_peas_vegetables_vegetable_food_agriculture_icon_220816_1759611664600.png',
  'ginger': '/attached_assets/Ginger_1754125435665.png',
  'chestnut': '/attached_assets/Chestnut_1754125435665.png',
  'peanut': '/attached_assets/Peanut_1754125435664.png',
  'olive': '/attached_assets/Olive_1754125200253.png',
  'olives': '/attached_assets/Olive_1754125200253.png',
  'mint': '/attached_assets/mint_leaf_plant_agriculture_icon_220825_1759611664598.png',
  'spinach': '/attached_assets/spinach_vegetables_vegetable_food_agriculture_icon_220824_1759611664600.png',

  // Dairy & Proteins
  'cheese': '/attached_assets/Cheese_1754125920628.png',
  'butter': '/attached_assets/ingredient_creamy_restaurant_and_food_butter_icon_251526_1759612238807.png',
  'milk': '/attached_assets/milk_869664_1759673068436.png',
  'dairy': '/attached_assets/milk_869664_1759673068436.png',
  'egg': '/attached_assets/egg_organic_protein_boiled_restaurant_and_food_eggs_icon_251538_1759612238807.png',
  'eggs': '/attached_assets/egg_organic_protein_boiled_restaurant_and_food_eggs_icon_251538_1759612238807.png',
  'bacon': '/attached_assets/barbecue_1718484_1759673068435.png',
  'sausage': '/attached_assets/barbecue_1718484_1759673068435.png',
  'sausages': '/attached_assets/barbecue_1718484_1759673068435.png',
  'chicken': '/attached_assets/barbecue_1718484_1759673068435.png',
  'poultry': '/attached_assets/barbecue_1718484_1759673068435.png',
  'meat': '/attached_assets/barbecue_1718484_1759673068435.png',
  'steak': '/attached_assets/barbecue_1718484_1759673068435.png',
  'beef': '/attached_assets/barbecue_1718484_1759673068435.png',
  'pork': '/attached_assets/barbecue_1718484_1759673068435.png',
  'lamb': '/attached_assets/barbecue_1718484_1759673068435.png',
  'turkey': '/attached_assets/barbecue_1718484_1759673068435.png',
  'duck': '/attached_assets/barbecue_1718484_1759673068435.png',
  'ham': '/attached_assets/barbecue_1718484_1759673068435.png',
  'ribs': '/attached_assets/barbecue_1718484_1759673068435.png',
  'mince': '/attached_assets/barbecue_1718484_1759673068435.png',
  'ground beef': '/attached_assets/barbecue_1718484_1759673068435.png',

  // Seafood
  'shrimp': '/attached_assets/Chrimp_1754125751318.png',
  'crab': '/attached_assets/Crab_1754125751321.png',
  'lobster': '/attached_assets/Lobster_1754125751320.png',
  'oyster': '/attached_assets/Oyster_1754125751318.png',
  'squid': '/attached_assets/Squid_1754125751318.png',

  // Grains & Bakery
  'bread': '/attached_assets/Bread_1754125435661.png',
  'baguette': '/attached_assets/Baguette_1754125920628.png',
  'croissant': '/attached_assets/Croissant_1754125435660.png',
  'pasta': '/attached_assets/spaghetti_12482700_1759673068435.png',
  'spaghetti': '/attached_assets/spaghetti_12482700_1759673068435.png',
  'noodles': '/attached_assets/spaghetti_12482700_1759673068435.png',
  'pretzel': '/attached_assets/Pretzel_1754125920628.png',
  'pizza': '/attached_assets/pizza_food_fast_food_italian_food_icon_208020_1759612238808.png',

  // Sweets & Desserts
  'cake': '/attached_assets/Cake_1754125920627.png',
  'cupcake': '/attached_assets/Cupcake_1754125920626.png',
  'pancake': '/attached_assets/Pancake_1754125920628.png',
  'cookie': '/attached_assets/Cookie_1754125751317.png',
  'donut': '/attached_assets/Dounut_1754125751317.png',
  'chocolate': '/attached_assets/Chocolate_1754125751317.png',
  'ice cream': '/attached_assets/IceCream_1754125751318.png',
  'sweets': '/attached_assets/Sweetes_1754125751316.png',

  // Beverages
  'juice': '/attached_assets/juice_box_orange_juice_fruit_drink_icon_210206_1759612238805.png',
  'orange juice': '/attached_assets/juice_box_orange_juice_fruit_drink_icon_210206_1759612238805.png',
  'soda': '/attached_assets/soda_drink_sparkles_can_bottle_icon_208015_1759612238808.png',
  'soft drink': '/attached_assets/soda_drink_sparkles_can_bottle_icon_208015_1759612238808.png',
  'tea': '/attached_assets/tea_bag_green_beans_coffee_pack_food_restaurant_bags_icon_251548_1759612238806.png',
  'coffee': '/attached_assets/tea_bag_green_beans_coffee_pack_food_restaurant_bags_icon_251548_1759612238806.png',
  'wine': '/attached_assets/Wine_1754125751316.png',
  'other drink': '/attached_assets/OtherDrink_1754125920627.png',
  'other alcohol': '/attached_assets/OtherAlcohol_1754125751316.png',

  // Condiments & Sauces
  'sauce': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
  'ketchup': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
  'mustard': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
  'condiment': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
  'condiments': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',

  // Pantry Items
  'salt': '/attached_assets/Salt_1754125751322.png',
  'ice': '/attached_assets/Ice_1754125751315.png',
  'canned food': '/attached_assets/Canned%20food_1754125751322.png',
  'salad': '/attached_assets/Salad_1754125751323.png'
};

/**
 * Get the appropriate icon for any ingredient
 * This is the SINGLE source of truth for ingredient icons
 */
export function getUnifiedIngredientIcon(ingredientName: string): string {
  if (!ingredientName) return DEFAULT_INGREDIENT_ICON;
  
  const normalizedName = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (INGREDIENT_ICON_MAP[normalizedName]) {
    return INGREDIENT_ICON_MAP[normalizedName];
  }
  
  // Partial match - check if ingredient name contains any mapped ingredient
  for (const [key, iconPath] of Object.entries(INGREDIENT_ICON_MAP)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return iconPath;
    }
  }
  
  // Category-based fallback matching for better coverage
  if (normalizedName.includes('apple')) return INGREDIENT_ICON_MAP['apple'];
  if (normalizedName.includes('tomato')) return INGREDIENT_ICON_MAP['tomato'];
  if (normalizedName.includes('onion')) return INGREDIENT_ICON_MAP['onion'];
  // All meats use barbecue icon
  if (normalizedName.includes('meat') || normalizedName.includes('chicken') || normalizedName.includes('beef') || 
      normalizedName.includes('pork') || normalizedName.includes('lamb') || normalizedName.includes('turkey') || 
      normalizedName.includes('duck') || normalizedName.includes('bacon') || normalizedName.includes('sausage') ||
      normalizedName.includes('steak') || normalizedName.includes('ribs') || normalizedName.includes('ham') ||
      normalizedName.includes('mince') || normalizedName.includes('ground') || normalizedName.includes('poultry')) {
    return INGREDIENT_ICON_MAP['meat']; // barbecue icon
  }
  if (normalizedName.includes('pasta') || normalizedName.includes('spaghetti') || normalizedName.includes('noodle')) return INGREDIENT_ICON_MAP['pasta'];
  if (normalizedName.includes('milk') || normalizedName.includes('dairy')) return INGREDIENT_ICON_MAP['milk'];
  if (normalizedName.includes('cheese')) return INGREDIENT_ICON_MAP['cheese'];
  if (normalizedName.includes('bread')) return INGREDIENT_ICON_MAP['bread'];
  if (normalizedName.includes('juice') || normalizedName.includes('drink')) return INGREDIENT_ICON_MAP['juice'];
  if (normalizedName.includes('sauce') || normalizedName.includes('ketchup') || normalizedName.includes('mustard')) return INGREDIENT_ICON_MAP['sauce'];
  
  // Return default icon if no match found
  return DEFAULT_INGREDIENT_ICON;
}

/**
 * Get ingredient category based on name
 */
export function getIngredientCategory(ingredientName: string): string {
  const normalizedName = ingredientName.toLowerCase();
  
  // Fruits
  if (['apple', 'orange', 'banana', 'avocado', 'lemon', 'lime', 'grapes', 'strawberries', 
       'blueberries', 'cherries', 'peach', 'pear', 'pineapple', 'coconut', 'kiwi', 
       'mango', 'melon', 'watermelon', 'papaya', 'raspberry', 'guava', 'pomegranate',
       'lychee', 'dates'].some(fruit => normalizedName.includes(fruit))) {
    return 'fruits';
  }
  
  // Vegetables
  if (['tomato', 'onion', 'garlic', 'potato', 'carrot', 'broccoli', 'lettuce', 'cucumber', 
       'pepper', 'chili', 'corn', 'mushroom', 'eggplant', 'beans', 'peas', 'ginger', 
       'olive', 'mint', 'spinach'].some(veg => normalizedName.includes(veg))) {
    return 'vegetables';
  }
  
  // Proteins
  if (['meat', 'beef', 'chicken', 'poultry', 'bacon', 'egg', 'shrimp', 'crab', 'lobster', 
       'fish', 'seafood'].some(protein => normalizedName.includes(protein))) {
    return 'proteins';
  }
  
  // Dairy
  if (['cheese', 'butter', 'milk', 'yogurt', 'cream'].some(dairy => normalizedName.includes(dairy))) {
    return 'dairy';
  }
  
  // Grains
  if (['bread', 'pasta', 'rice', 'flour', 'oats', 'grain'].some(grain => normalizedName.includes(grain))) {
    return 'grains';
  }
  
  // Beverages
  if (['juice', 'wine', 'beer', 'water', 'soda', 'drink'].some(bev => normalizedName.includes(bev))) {
    return 'beverages';
  }
  
  return 'other';
}