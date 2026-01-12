
import { pgTable, text, integer, timestamp, boolean, decimal, serial, json, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  avatar: varchar("avatar"), // Profile image URL
  ingredients: jsonb("ingredients").default('[]').notNull(),
  mealsCompleted: integer("meals_completed").default(0),
  subscriptionStatus: text('subscription_status').$type<'trial' | 'active' | 'expired'>().default('trial'),
  trialStartDate: timestamp('trial_start_date'),
  trialEndsAt: timestamp('trial_ends_at'),
  hasSeenWelcome: boolean('has_seen_welcome').default(false),
  householdId: integer("household_id").references(() => households.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;

// Recipes table
export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  instructions: text('instructions').array(),
  ingredients: json('ingredients').$type<Array<{item: string, quantity: string}>>(),
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

// Custom recipes table (FIXED: added missing userId column with FK constraint)
export const customRecipes = pgTable('custom_recipes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  instructions: json('instructions').$type<string[]>(),
  prepTime: integer('prep_time'),
  cookTime: integer('cook_time'),
  servings: integer('servings'),
  difficulty: text('difficulty'),
  category: text('category'),
  imageUrl: text('image_url').default(''),
  ingredients: json('ingredients').$type<Array<{item: string, quantity: string}>>(),
  isActive: boolean('is_active').default(true),
  source: text('source').default('database'),
  cuisine: text('cuisine'),
  dietaryTags: json('dietary_tags').$type<string[]>(),
  nutritionInfo: json('nutrition_info').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Ingredients table (FIXED: proper user_id FK constraint and type consistency)
export const ingredients = pgTable('ingredients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(),
  image: text('image'),
  imageFallback: text('image_fallback'),
  expiryDate: timestamp('expiry_date'),
  createdAt: timestamp('created_at').defaultNow(),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  pricePerUnit: decimal('price_per_unit', { precision: 10, scale: 2 }),
  storeName: text('store_name'),
  purchaseDate: timestamp('purchase_date'),
  receiptId: text('receipt_id'),
  isExpired: boolean('is_expired'),
  expiredValue: decimal('expired_value', { precision: 10, scale: 2 }),
});

// User favorites table (FIXED: proper FK constraints)
export const userFavorites = pgTable('user_favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recipeId: integer('recipe_id').notNull(),
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
  price: decimal('price', { precision: 10, scale: 2 }),
  estimatedPrice: decimal('estimated_price', { precision: 10, scale: 2 }),
  category: text('category'),
  notes: text('notes'),
  savedAmount: decimal('saved_amount').default('0.00'),
  selectedPackageSize: text('selected_package_size'),
  storeLocation: text('store_location'),
  // Enhanced shopping history fields
  purchasedAt: timestamp('purchased_at'),
  actualPrice: decimal('actual_price', { precision: 10, scale: 2 }),
  actualStore: text('actual_store'),
});

// Shopping History Analytics Table
export const shoppingHistoryAnalytics = pgTable('shopping_history_analytics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  month: text('month').notNull(), // YYYY-MM format
  totalSpent: decimal('total_spent', { precision: 12, scale: 2 }).notNull(),
  totalItems: integer('total_items').notNull(),
  categoryBreakdown: json('category_breakdown').$type<Record<string, number>>().notNull(),
  averageItemPrice: decimal('average_item_price', { precision: 10, scale: 2 }).notNull(),
  shoppingPatterns: json('shopping_patterns').$type<{
    mostShoppedDay: string;
    averageItemsPerTrip: number;
    categoryPreferences: Array<{ category: string; percentage: number }>;
    behavioralInsights: string[];
  }>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeSchema = createInsertSchema(recipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomRecipeSchema = createInsertSchema(customRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIngredientSchema = createInsertSchema(ingredients).omit({ id: true, createdAt: true });
export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({ id: true, createdAt: true });
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true });
export const insertShoppingListSchema = createInsertSchema(shoppingLists).omit({ id: true, createdAt: true });
export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({ id: true, addedAt: true });
export const insertUserShoppingItemSchema = createInsertSchema(userShoppingItems).omit({ id: true, addedAt: true });
export const insertShoppingHistoryAnalyticsSchema = createInsertSchema(shoppingHistoryAnalytics).omit({ id: true, createdAt: true });

// Type definitions
export type User = typeof users.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
export type CustomRecipe = typeof customRecipes.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type ShoppingList = typeof shoppingLists.$inferSelect;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;
export type UserShoppingItem = typeof userShoppingItems.$inferSelect;
export type ShoppingHistoryAnalytics = typeof shoppingHistoryAnalytics.$inferSelect;
export type UserMeal = typeof userMeals.$inferSelect;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type InsertCustomRecipe = z.infer<typeof insertCustomRecipeSchema>;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type InsertShoppingList = z.infer<typeof insertShoppingListSchema>;
export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type InsertUserShoppingItem = z.infer<typeof insertUserShoppingItemSchema>;
export type InsertShoppingHistoryAnalytics = z.infer<typeof insertShoppingHistoryAnalyticsSchema>;

// Core social tables (simplified)












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
  completionDate: timestamp('completion_date').defaultNow(),
  completedAt: timestamp('completed_at').defaultNow(),
});

// User meals table - tracks individual meal completions from AI photo scorer
export const userMeals = pgTable('user_meals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  recipeId: integer('recipe_id'), // Allow null for manual meal completions  
  mealName: text('meal_name').notNull(),
  difficulty: text('difficulty'),
  imageUrl: text('image_url'),
  score: integer('score'), // AI analysis score
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  completedAt: timestamp('completed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Insert schemas for meal completion system
export const insertMealCompletionSchema = createInsertSchema(mealCompletions).omit({ id: true, completionDate: true, completedAt: true });
export const insertUserMealSchema = createInsertSchema(userMeals).omit({ id: true, uploadedAt: true, completedAt: true, createdAt: true });
export type MealCompletion = typeof mealCompletions.$inferSelect;
export type InsertMealCompletion = z.infer<typeof insertMealCompletionSchema>;
export type InsertUserMeal = z.infer<typeof insertUserMealSchema>;

// User-specific scanned recipes table
export const userScannedRecipes = pgTable('user_scanned_recipes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  ingredients: json('ingredients').$type<Array<{item: string, quantity: string}>>(),
  instructions: json('instructions').$type<string[]>(),
  imageUrl: text('image_url'),
  source: text('source').default('scan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Recipe Collections - organize recipes into user-created collections
export const recipeCollections = pgTable('recipe_collections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isDefault: boolean('is_default').default(false), // For 'Favorites', 'Scanned Recipes', etc.
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Collection Recipes - tracks which recipes are in which collections
export const collectionRecipes = pgTable('collection_recipes', {
  id: serial('id').primaryKey(),
  collectionId: integer('collection_id').references(() => recipeCollections.id, { onDelete: 'cascade' }).notNull(),
  recipeId: integer('recipe_id').notNull(), // Can reference recipes or userScannedRecipes
  recipeType: text('recipe_type').notNull(), // 'database', 'scanned', 'custom'
  addedAt: timestamp('added_at').defaultNow(),
});

// Insert schemas
export const insertUserScannedRecipeSchema = createInsertSchema(userScannedRecipes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecipeCollectionSchema = createInsertSchema(recipeCollections).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCollectionRecipeSchema = createInsertSchema(collectionRecipes).omit({ id: true, addedAt: true });

export type UserScannedRecipe = typeof userScannedRecipes.$inferSelect;
export type InsertUserScannedRecipe = z.infer<typeof insertUserScannedRecipeSchema>;
export type RecipeCollection = typeof recipeCollections.$inferSelect;
export type InsertRecipeCollection = z.infer<typeof insertRecipeCollectionSchema>;
export type CollectionRecipe = typeof collectionRecipes.$inferSelect;
export type InsertCollectionRecipe = z.infer<typeof insertCollectionRecipeSchema>;

export const messageReadStatus = pgTable('message_read_status', {
  id: serial('id').primaryKey(),
  messageId: integer('message_id').notNull(),
  userId: integer('user_id').notNull(),
  readAt: timestamp('read_at').defaultNow(),
});



export type MessageReadStatus = typeof messageReadStatus.$inferSelect;


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
  expiryDate: timestamp('expiry_date'),
  addedBy: integer('added_by').notNull(),
  updatedBy: integer('updated_by'),
  addedAt: timestamp('added_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Additional types for household system
export type Household = typeof households.$inferSelect;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type HouseholdIngredient = typeof householdIngredients.$inferSelect;

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
  selectedIngredients: json('selected_ingredients').$type<string[]>(),
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

// Additional types for challenge system
export type CookingChallenge = typeof cookingChallenges.$inferSelect;
export type ChallengeSubmission = typeof challengeSubmissions.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type UserIngredient = typeof userIngredients.$inferSelect;

// Recipe ingredient item type (standardized)
export interface RecipeIngredientItem {
  item: string;
  quantity: string;
  preparation?: string;
}

// Receipt scans table (FIXED: user_id type and foreign key constraint)
export const receiptScans = pgTable('receipt_scans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiptId: text('receipt_id').notNull(),
  store: text('store'),
  storeName: text('store_name'),
  storeLocation: text('store_location'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  totalSavings: decimal('total_savings', { precision: 10, scale: 2 }),
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
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
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

// Additional types for receipt scanning system
export type ReceiptScan = typeof receiptScans.$inferSelect;
export type CostTracking = typeof costTracking.$inferSelect;
export type InsertReceiptScan = z.infer<typeof insertReceiptScanSchema>;
export type InsertCostTracking = z.infer<typeof insertCostTrackingSchema>;

// Premium skip table (FIXED: added missing FK constraint)
export const premiumSkips = pgTable('premium_skips', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  featureType: text('feature_type').notNull(),
  usedAt: timestamp('used_at').defaultNow(),
});

// Additional types for premium system
export type PremiumSkip = typeof premiumSkips.$inferSelect;

// Ingredient scan table (FIXED: user_id type consistency)
export const ingredientScans = pgTable('ingredient_scans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  scanId: text('scan_id').unique().notNull(),
  storeName: text('store_name').notNull(),
  scannedImage: text('scanned_image'),
  scanResults: json('scan_results'),
  extractedIngredients: json('extracted_ingredients'),
  totalEstimatedCost: decimal('total_estimated_cost', { precision: 10, scale: 2 }),
  scanStatus: text('scan_status').default('processing').notNull(),
  errorMessage: text('error_message'),
  scanDate: timestamp('scan_date').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Additional types for ingredient scan system
export type IngredientScan = typeof ingredientScans.$inferSelect;

// Freeform meal analysis table (FIXED: added missing FK constraint)
export const freeformMealAnalysis = pgTable('freeform_meal_analysis', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
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

// Additional types for freeform meal system
export type FreeformMealAnalysis = typeof freeformMealAnalysis.$inferSelect;
export type MealProgression = typeof mealProgressions.$inferSelect;

// Subscription-related tables
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priceZAR: decimal('price_zar', { precision: 10, scale: 2 }).notNull(),
  features: json('features').$type<string[]>(),
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

// Additional types for subscription system
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type AiUsageTracking = typeof aiUsageTracking.$inferSelect;

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

// Additional types for badge system
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;

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

// Additional types for AI Chef Chat system
export type AiChefChat = typeof aiChefChats.$inferSelect;
export const insertAiChefChatSchema = createInsertSchema(aiChefChats).omit({ id: true, createdAt: true });
export type InsertAiChefChat = z.infer<typeof insertAiChefChatSchema>;
