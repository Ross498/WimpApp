// This file is redundant - using shared/schema.ts instead
// Removing to prevent import conflicts
// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);
// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    email: varchar("email").unique().notNull(),
    username: varchar("username").unique().notNull(),
    password: varchar("password").notNull(),
    ingredients: jsonb("ingredients").default('[]').notNull(),
    mealsCompleted: integer("meals_completed").default(0),
    subscriptionTier: text('subscription_tier').default('free'),
    masteryKeys: integer("mastery_keys").default(0).notNull(),
    grainBalance: integer("grain_balance").default(0).notNull(),
    householdId: integer("household_id").references(() => households.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Mastery ingredients table
export const masteryIngredients = pgTable('mastery_ingredients', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    price: integer('price').notNull(),
    difficulty: text('difficulty').notNull(),
    image: text('image'),
    imagePath: text('image_path'),
    position: integer('position').notNull(),
    prerequisites: json('prerequisites').$type(),
    unlockCost: integer('unlock_cost'),
    mealsRequired: integer('meals_required').notNull(),
    releaseDate: timestamp('release_date'),
    status: text('status'),
    createdAt: timestamp('created_at').defaultNow(),
});
// Mastery recipes table
export const masteryRecipes = pgTable('mastery_recipes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    prepTime: integer('prep_time'),
    cookTime: integer('cook_time'),
    servings: integer('servings'),
    difficulty: text('difficulty'),
    ingredients: json('ingredients').$type(),
    instructions: json('instructions').$type(),
    flavorBoosters: json('flavor_boosters').$type(),
    pairingsSuggestions: json('pairing_suggestions').$type(),
    imagePath: text('image_path'),
    imageUrl: text('image_url'),
    masteryIngredientId: integer('mastery_ingredient_id').references(() => masteryIngredients.id),
    createdAt: timestamp('created_at').defaultNow(),
    servingSize: text('serving_size'),
    cuisine: text('cuisine'),
    totalTime: integer('total_time'),
    pairingsWith: json('pairings_with').$type(),
});
// User mastery progress table
export const userMastery = pgTable('user_mastery', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    masteryIngredientId: integer('mastery_ingredient_id').references(() => masteryIngredients.id),
    unlockedAt: timestamp('unlocked_at'),
    completedRecipes: integer('completed_recipes').default(0),
    totalRecipes: integer('total_recipes').default(0),
    isCompleted: boolean('is_completed').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});
// User mastery unlocks table
export const userMasteryUnlocks = pgTable('user_mastery_unlocks', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    masteryIngredientId: integer('mastery_ingredient_id').references(() => masteryIngredients.id),
    unlockedAt: timestamp('unlocked_at').defaultNow(),
    keysSpent: integer('keys_spent').notNull(),
});
// Recipes table
export const recipes = pgTable('recipes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    instructions: text('instructions').array(),
    ingredients: json('ingredients').$type(),
    prepTime: integer('prep_time'),
    cookTime: integer('cook_time'),
    servings: integer('servings'),
    difficulty: text('difficulty'),
    category: text('category'),
    imageUrl: text('image_url'),
    source: text('source').default('database'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Custom recipes table  
export const customRecipes = pgTable('custom_recipes', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    instructions: json('instructions').$type(),
    prepTime: integer('prep_time'),
    cookTime: integer('cook_time'),
    servings: integer('servings'),
    difficulty: text('difficulty'),
    category: text('category'),
    imageUrl: text('image_url').default(''),
    ingredients: json('ingredients').$type(),
    isActive: boolean('is_active').default(true),
    source: text('source').default('database'),
    cuisine: text('cuisine'),
    dietaryTags: json('dietary_tags').$type(),
    nutritionInfo: json('nutrition_info').$type(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Ingredients table
export const ingredients = pgTable('ingredients', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    quantity: integer('quantity').notNull(),
    unit: text('unit').notNull(),
    image: text('image'),
    imageFallback: text('image_fallback'),
    expiryDate: timestamp('expiry_date'),
    createdAt: timestamp('created_at').defaultNow(),
    purchasePrice: decimal('purchase_price'),
    pricePerUnit: decimal('price_per_unit'),
    storeName: text('store_name'),
    purchaseDate: timestamp('purchase_date'),
    receiptId: text('receipt_id'),
    isExpired: boolean('is_expired'),
    expiredValue: decimal('expired_value'),
});
// User favorites table
export const userFavorites = pgTable('user_favorites', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    recipeId: integer('recipe_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
// Meal plans table
export const mealPlans = pgTable('meal_plans', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: text('name').notNull(),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').defaultNow(),
});
// AI-generated meal plans with complete data
export const aiMealPlans = pgTable('ai_meal_plans', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: text('name').notNull(),
    days: integer('days').notNull(),
    totalCalories: integer('total_calories').notNull(),
    macros: json('macros').notNull(), // {protein: number, carbs: number, fat: number}
    meals: json('meals').notNull(), // Array of meal data by day
    createdAt: timestamp('created_at').defaultNow(),
});
// Meal plan recipes table
export const mealPlanRecipes = pgTable('meal_plan_recipes', {
    id: serial('id').primaryKey(),
    mealPlanId: integer('meal_plan_id').notNull(),
    recipeId: integer('recipe_id').notNull(),
    dayOfWeek: integer('day_of_week'),
    mealType: text('meal_type'),
});
// AI Cache table
export const aiCache = pgTable('ai_cache', {
    id: serial('id').primaryKey(),
    cacheKey: text('cache_key').unique().notNull(),
    response: json('response').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
// Recipe ingredients table
export const recipeIngredients = pgTable('recipe_ingredients', {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id').notNull(),
    ingredientId: integer('ingredient_id').notNull(),
    quantity: text('quantity'),
    unit: text('unit'),
});
// LEGACY SHOPPING LIST SYSTEM (for backward compatibility)
export const shoppingLists = pgTable('shopping_lists', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const shoppingListItems = pgTable('shopping_list_items', {
    id: serial('id').primaryKey(),
    shoppingListId: integer('shopping_list_id').notNull().references(() => shoppingLists.id),
    ingredientName: text('ingredient_name').notNull(),
    quantity: text('quantity').default('1'),
    unit: text('unit').default('pieces'),
    completed: boolean('completed').default(false),
    addedAt: timestamp('added_at').defaultNow(),
});
// SIMPLIFIED SHOPPING SYSTEM: Direct user shopping items 
export const userShoppingItems = pgTable('user_shopping_items', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    ingredientName: text('ingredient_name').notNull(),
    quantity: text('quantity').default('1'),
    unit: text('unit').default('pieces'),
    completed: boolean('completed').default(false),
    addedAt: timestamp('added_at').defaultNow(),
    price: decimal('price'),
    category: text('category'),
    notes: text('notes'),
    savedAmount: decimal('saved_amount').default('0.00'),
    selectedPackageSize: text('selected_package_size'),
    storeLocation: text('store_location'),
    // Enhanced shopping history fields
    purchasedAt: timestamp('purchased_at'),
    actualPrice: decimal('actual_price', { precision: 10, scale: 2 }),
    actualStore: text('actual_store'),
    seasonalData: json('seasonal_data').$type(),
});
// Shopping History Analytics Table
export const shoppingHistoryAnalytics = pgTable('shopping_history_analytics', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    month: text('month').notNull(), // YYYY-MM format
    totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).notNull(),
    totalItems: integer('total_items').notNull(),
    categoryBreakdown: json('category_breakdown').$type().notNull(),
    averageItemPrice: decimal('average_item_price', { precision: 10, scale: 2 }).notNull(),
    shoppingPatterns: json('shopping_patterns').$type().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
// Seasonal Price Predictions Table
export const seasonalPricePredictions = pgTable('seasonal_price_predictions', {
    id: serial('id').primaryKey(),
    ingredientName: text('ingredient_name').notNull(),
    currentPrice: decimal('current_price', { precision: 10, scale: 2 }).notNull(),
    predictedPrice: decimal('predicted_price', { precision: 10, scale: 2 }).notNull(),
    priceChangePercent: decimal('price_change_percent', { precision: 5, scale: 2 }).notNull(),
    seasonalWindow: text('seasonal_window').notNull(), // e.g., "2-3 weeks", "1 month"
    optimalBuyingWeeks: json('optimal_buying_weeks').$type().notNull(), // Week numbers
    region: text('region').default('south_africa').notNull(),
    confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(), // 0.0-1.0
    lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});
// Insert schemas for mastery system
export const insertMasteryIngredientSchema = createInsertSchema(masteryIngredients).omit({ id: true });
export const insertMasteryRecipeSchema = createInsertSchema(masteryRecipes).omit({ id: true });
export const insertUserMasterySchema = createInsertSchema(userMastery).omit({ id: true });
export const insertUserMasteryUnlockSchema = createInsertSchema(userMasteryUnlocks).omit({ id: true });
// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomRecipeSchema = createInsertSchema(customRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIngredientSchema = createInsertSchema(ingredients).omit({ id: true, createdAt: true });
export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({ id: true, createdAt: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true, createdAt: true });
export const insertAiMealPlanSchema = createInsertSchema(aiMealPlans).omit({ id: true, createdAt: true });
export const insertMealPlanRecipeSchema = createInsertSchema(mealPlanRecipes).omit({ id: true });
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true });
export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({ id: true, createdAt: true });
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({ id: true, addedAt: true });
export const insertUserShoppingItemSchema = createInsertSchema(userShoppingItems).omit({ id: true, addedAt: true });
export const insertShoppingHistoryAnalyticsSchema = createInsertSchema(shoppingHistoryAnalytics).omit({ id: true, createdAt: true });
export const insertSeasonalPricePredictionsSchema = createInsertSchema(seasonalPricePredictions).omit({ id: true, lastUpdated: true });
// REMOVED: userMasteryProgress alias to avoid confusion - use userMastery directly
// Core social tables (simplified)
export const pods = pgTable('pods', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    inviteCode: text('invite_code').unique(),
    createdBy: integer('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const podMembers = pgTable('pod_members', {
    id: serial('id').primaryKey(),
    podId: integer('pod_id').notNull(),
    userId: integer('user_id').notNull(),
    role: text('role').default('member'),
    joinedAt: timestamp('joined_at').defaultNow(),
});
export const podPosts = pgTable('pod_posts', {
    id: serial('id').primaryKey(),
    podId: integer('pod_id').notNull(),
    userId: integer('user_id').notNull(),
    content: text('content'),
    imageUrl: text('image_url').default('/api/placeholder/300/200'),
    createdAt: timestamp('created_at').defaultNow(),
});
export const podComments = pgTable('pod_comments', {
    id: serial('id').primaryKey(),
    podPostId: integer('pod_post_id').notNull(),
    userId: integer('user_id').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const podLikes = pgTable('pod_likes', {
    id: serial('id').primaryKey(),
    podPostId: integer('pod_post_id').notNull(),
    userId: integer('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const podMessages = pgTable('pod_messages', {
    id: serial('id').primaryKey(),
    podId: integer('pod_id').notNull(),
    userId: integer('user_id').notNull(),
    content: text('content').notNull(),
    messageType: text('message_type').default('text'),
    createdAt: timestamp('created_at').defaultNow(),
});
export const mealCompletions = pgTable('meal_completions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    recipeId: integer('recipe_id'), // Allow null for manual meal completions
    bucksEarned: integer('bucks_earned').notNull().default(0),
    xpEarned: integer('xp_earned').notNull().default(0),
    notes: text('notes'),
    recipeName: varchar('recipe_name'),
    aiScore: integer('ai_score'),
    aiAnalysis: json('ai_analysis'),
    completedAt: timestamp('completed_at').defaultNow(),
});
// User-specific AI generated recipes (separate from shared 56 recipes)
export const userAiRecipes = pgTable('user_ai_recipes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    title: text('title').notNull(),
    description: text('description'),
    ingredients: json('ingredients').notNull(),
    instructions: json('instructions').notNull(),
    prepTime: integer('prep_time'),
    cookTime: integer('cook_time'),
    totalTime: integer('total_time'),
    servings: integer('servings'),
    difficulty: text('difficulty'),
    cuisine: text('cuisine'),
    mealType: text('meal_type'),
    imageUrl: text('image_url'),
    aiGeneratedBy: text('ai_generated_by').default('openai'),
    nutritionInfo: json('nutrition_info'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// User-specific scanned recipes table
export const userScannedRecipes = pgTable('user_scanned_recipes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    ingredients: json('ingredients').$type(),
    instructions: json('instructions').$type(),
    imageUrl: text('image_url'),
    source: text('source').default('scan'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// User-specific mastery recipes table  
export const userMasteryRecipes = pgTable('user_mastery_recipes', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    masteryIngredientId: integer('mastery_ingredient_id').references(() => masteryIngredients.id),
    name: text('name').notNull(),
    description: text('description'),
    ingredients: json('ingredients').$type(),
    instructions: json('instructions').$type(),
    imageUrl: text('image_url'),
    source: text('source').default('mastery'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Insert schema for userAiRecipes 
export const insertUserAiRecipeSchema = createInsertSchema(userAiRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserScannedRecipeSchema = createInsertSchema(userScannedRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserMasteryRecipeSchema = createInsertSchema(userMasteryRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const messageReadStatus = pgTable('message_read_status', {
    id: serial('id').primaryKey(),
    messageId: integer('message_id').notNull(),
    userId: integer('user_id').notNull(),
    readAt: timestamp('read_at').defaultNow(),
});
export const podChampions = pgTable('pod_champions', {
    id: serial('id').primaryKey(),
    podId: integer('pod_id').notNull(),
    userId: integer('user_id').notNull(),
    championSince: timestamp('champion_since').defaultNow(),
    totalWins: integer('total_wins').default(0),
});
// Additional household-related tables
export const households = pgTable('households', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    inviteCode: text('invite_code').unique(),
    createdBy: integer('created_by').notNull(),
    maxMembers: integer('max_members').default(6),
    autoCreatePod: boolean('auto_create_pod').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});
export const householdMembers = pgTable('household_members', {
    id: serial('id').primaryKey(),
    householdId: integer('household_id').notNull(),
    userId: integer('user_id').notNull(),
    role: text('role').default('member'),
    status: text('status').default('active'),
    joinedAt: timestamp('joined_at').defaultNow(),
});
// Household shared ingredients table for tracking shared pantry
export const householdIngredients = pgTable('household_ingredients', {
    id: serial('id').primaryKey(),
    householdId: integer('household_id').notNull(),
    ingredientName: text('ingredient_name').notNull(),
    quantity: integer('quantity').default(1),
    unit: text('unit').default('pieces'),
    emoji: text('emoji'),
    addedBy: integer('added_by').notNull(),
    updatedBy: integer('updated_by'),
    addedAt: timestamp('added_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Additional challenge-related tables
export const cookingChallenges = pgTable('cooking_challenges', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    createdBy: integer('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const challengeSubmissions = pgTable('challenge_submissions', {
    id: serial('id').primaryKey(),
    challengeId: integer('challenge_id').notNull(),
    userId: integer('user_id').notNull(),
    recipeId: integer('recipe_id'),
    imageUrl: text('image_url'),
    description: text('description'),
    score: integer('score'),
    submittedAt: timestamp('submitted_at').defaultNow(),
});
export const challenges = pgTable('challenges', {
    id: serial('id').primaryKey(),
    podId: integer('pod_id').notNull(),
    creatorId: integer('creator_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    selectedIngredients: json('selected_ingredients').$type(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const challengeParticipants = pgTable('challenge_participants', {
    id: serial('id').primaryKey(),
    challengeId: integer('challenge_id').notNull(),
    userId: integer('user_id').notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
});
export const userIngredients = pgTable('user_ingredients', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    ingredientName: text('ingredient_name').notNull(),
    quantity: integer('quantity').default(1),
    unit: text('unit'),
    addedAt: timestamp('added_at').defaultNow(),
});
export const userMeals = pgTable('user_meals', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    recipeId: integer('recipe_id'),
    mealName: text('meal_name').notNull(),
    imageUrl: text('image_url'),
    score: integer('score'),
    completedAt: timestamp('completed_at').defaultNow(),
});
// Additional collection and mastery tables
export const recipeCollections = pgTable('recipe_collections', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    emoji: text('emoji'),
    createdAt: timestamp('created_at').defaultNow(),
});
export const masteryCourses = pgTable('mastery_courses', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    difficulty: text('difficulty'),
    estimatedTime: integer('estimated_time'),
    createdAt: timestamp('created_at').defaultNow(),
});
// Receipt scans table (matching actual database structure)
export const receiptScans = pgTable('receipt_scans', {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    receiptId: text('receipt_id').notNull(),
    store: text('store'),
    storeName: text('store_name'),
    storeLocation: text('store_location'),
    totalAmount: text('total_amount'),
    currency: text('currency').default('ZAR'),
    scannedImage: text('scanned_image'),
    scanStatus: text('scan_status'),
    errorMessage: text('error_message'),
    receiptDate: timestamp('receipt_date'),
    extractedData: json('extracted_data'),
    processedItems: json('processed_items'),
    createdAt: timestamp('created_at').defaultNow(),
});
export const costTracking = pgTable('cost_tracking', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    ingredientName: text('ingredient_name').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }),
    quantity: text('quantity'),
    store: text('store'),
    currency: text('currency').default('ZAR'),
    recordedAt: timestamp('recorded_at').defaultNow(),
});
// Insert schemas for receipt scanning
export const insertReceiptScanSchema = createInsertSchema(receiptScans).omit({ id: true, createdAt: true });
export const insertCostTrackingSchema = createInsertSchema(costTracking).omit({ id: true, recordedAt: true });
// Premium skip table
export const premiumSkips = pgTable('premium_skips', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    featureType: text('feature_type').notNull(),
    usedAt: timestamp('used_at').defaultNow(),
});
// Ingredient scan table
export const ingredientScans = pgTable('ingredient_scans', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    ingredientName: text('ingredient_name').notNull(),
    imageUrl: text('image_url'),
    confidence: decimal('confidence', { precision: 5, scale: 2 }),
    scannedAt: timestamp('scanned_at').defaultNow(),
});
// Freeform meal analysis table
export const freeformMealAnalysis = pgTable('freeform_meal_analysis', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    mealName: text('meal_name').notNull(),
    analysisData: json('analysis_data'),
    score: integer('score'),
    createdAt: timestamp('created_at').defaultNow(),
});
export const mealProgressions = pgTable('meal_progressions', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    level: integer('level').default(1),
    experience: integer('experience').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
});
// Subscription-related tables
export const subscriptionPlans = pgTable('subscription_plans', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    priceZAR: decimal('price_zar', { precision: 10, scale: 2 }).notNull(),
    features: json('features').$type(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});
export const aiUsageTracking = pgTable('ai_usage_tracking', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    featureType: text('feature_type').notNull(),
    usageCount: integer('usage_count').default(0),
    lastUsed: timestamp('last_used').defaultNow(),
    monthYear: text('month_year').notNull(),
});
// Badge-related tables
export const badges = pgTable('badges', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    category: text('category'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});
export const userBadges = pgTable('user_badges', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    badgeId: integer('badge_id').notNull(),
    earnedAt: timestamp('earned_at').defaultNow(),
    progress: integer('progress').default(0),
});
// AI Chef Chat Messages table for chat history
export const aiChefChats = pgTable('ai_chef_chats', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    messageId: text('message_id').notNull(),
    role: text('role').notNull(), // 'user' or 'assistant'
    content: text('content').notNull(),
    chef: text('chef'),
    chefId: text('chef_id'),
    imageUrl: text('image_url'),
    timestamp: timestamp('timestamp').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
});
export const insertAiChefChatSchema = createInsertSchema(aiChefChats).omit({ id: true, createdAt: true });
