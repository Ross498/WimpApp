CREATE TABLE "ai_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cache_key" text NOT NULL,
	"response" json NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"feature_type" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"week_start" timestamp NOT NULL,
	"month_start" timestamp NOT NULL,
	"last_used" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_feature_week_unique" UNIQUE("user_id","feature_type","week_start")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"category" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'joined' NOT NULL,
	"submission_photo" text,
	"dish_name" text,
	"score" integer,
	"completion_status" text DEFAULT 'pending',
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"started_cooking_at" timestamp,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"meal_image_url" text NOT NULL,
	"ai_score" integer,
	"ai_feedback" text,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"creator_id" integer NOT NULL,
	"recipe_id" integer,
	"type" text NOT NULL,
	"title" text,
	"description" text,
	"ingredients" json,
	"time_limit" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"completion_reward" text DEFAULT 'community_recognition' NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cooking_challenges" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"challenger_id" integer NOT NULL,
	"challenged_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"meal_name" text,
	"winner_id" integer,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "cost_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tracking_type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text NOT NULL,
	"related_ingredient_id" integer,
	"related_recipe_id" integer,
	"tracking_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'main',
	"difficulty" text NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer NOT NULL,
	"image_url" text NOT NULL,
	"ingredients" json NOT NULL,
	"instructions" json NOT NULL,
	"source" text DEFAULT 'pantrii',
	"is_active" boolean DEFAULT true,
	"cuisine" text,
	"dietary_tags" json DEFAULT '[]'::json,
	"flavor_boosters" json DEFAULT '[]'::json,
	"nutrition_info" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "freeform_meal_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dish_name" text NOT NULL,
	"meal_photo" text,
	"user_cooked_meal" boolean DEFAULT true NOT NULL,
	"meal_source" text DEFAULT 'home_cooked' NOT NULL,
	"ai_rating" integer,
	"ai_analysis" text,
	"identified_ingredients" json,
	"estimated_difficulty" text,
	"presentation_score" integer,
	"cooking_techniques" json,
	"cuisine_style" text,
	"feedback" text,
	"encouragement" text,
	"improvement_tips" json,
	"counts_toward_progression" boolean DEFAULT false,
	"shared_to_pod" boolean DEFAULT false NOT NULL,
	"user_description" text,
	"user_ingredients" text,
	"confidence_score" numeric(3, 2),
	"photo_quality_data" json,
	"ingredient_confidence_data" json,
	"context_analysis_data" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"household_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "household_user_unique" UNIQUE("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by" integer NOT NULL,
	"auto_create_pod" boolean DEFAULT true NOT NULL,
	"max_members" integer DEFAULT 6 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "households_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "ingredient_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scan_id" text NOT NULL,
	"store_name" text NOT NULL,
	"scanned_image" text,
	"scan_results" json,
	"extracted_ingredients" json,
	"total_estimated_cost" numeric(10, 2),
	"scan_status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"scan_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ingredient_scans_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'count' NOT NULL,
	"image" text,
	"image_fallback" text,
	"expiry_date" timestamp,
	"purchase_price" numeric(10, 2),
	"price_per_unit" numeric(10, 2),
	"store_name" text,
	"purchase_date" timestamp,
	"receipt_id" text,
	"is_expired" boolean DEFAULT false,
	"expired_value" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mastery_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"ingredient_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"content_type" text NOT NULL,
	"content" text NOT NULL,
	"position" integer NOT NULL,
	"xp_reward" integer DEFAULT 10 NOT NULL,
	"bucks_reward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mastery_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"unlock_cost" integer DEFAULT 500 NOT NULL,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"image" text,
	"image_path" text,
	"position" integer DEFAULT 1 NOT NULL,
	"prerequisites" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mastery_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"mastery_ingredient_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_path" text,
	"prep_time" integer NOT NULL,
	"cook_time" integer NOT NULL,
	"serving_size" integer NOT NULL,
	"difficulty" text NOT NULL,
	"max_grain" integer NOT NULL,
	"ingredients" text NOT NULL,
	"instructions" text NOT NULL,
	"flavor_boosters" text,
	"pairings_with" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_name" text NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"bucks_earned" integer DEFAULT 0,
	"max_bucks" integer NOT NULL,
	"meal_photo_base64" text,
	"ai_score" integer,
	"ai_analysis" text
);
--> statement-breakpoint
CREATE TABLE "meal_plan_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_plan_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"day" integer NOT NULL,
	"meal_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meal_progressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"meal_name" text NOT NULL,
	"meal_photo" text,
	"ai_photo_score" integer,
	"counts_toward_progression" boolean DEFAULT false,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'recipes' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_read_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now(),
	CONSTRAINT "message_read_status_message_id_user_id_unique" UNIQUE("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pod_champions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"champion_since" timestamp DEFAULT now(),
	"total_wins" integer DEFAULT 0,
	CONSTRAINT "pod_champions_pod_id_unique" UNIQUE("pod_id")
);
--> statement-breakpoint
CREATE TABLE "pod_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pod_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pod_likes_post_id_user_id_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pod_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"can_upload" boolean DEFAULT true,
	"is_champion" boolean DEFAULT false,
	"champion_expiry" timestamp,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pod_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pod_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"pod_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"meal_completion_id" integer,
	"recipe_name" text NOT NULL,
	"meal_image_url" text NOT NULL,
	"presentation_score" integer,
	"caption" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"access_code" text NOT NULL,
	"creator_id" integer NOT NULL,
	"settings" json DEFAULT '{"allowUploads":"all","requireApproval":false,"allowComments":true,"allowLikes":true}'::json,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pods_access_code_unique" UNIQUE("access_code")
);
--> statement-breakpoint
CREATE TABLE "premium_skips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"mastery_type" text NOT NULL,
	"month_year" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_ingredient_month_unique" UNIQUE("user_id","ingredient_id","month_year")
);
--> statement-breakpoint
CREATE TABLE "receipt_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"receipt_id" text NOT NULL,
	"store_name" text NOT NULL,
	"store_location" text,
	"total_amount" numeric(10, 2) NOT NULL,
	"receipt_date" timestamp NOT NULL,
	"scanned_image" text,
	"extracted_data" json,
	"processed_items" json,
	"scan_status" text DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "receipt_scans_receipt_id_unique" UNIQUE("receipt_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"ingredient_name" text NOT NULL,
	"amount" text
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"difficulty" text DEFAULT 'medium',
	"prep_time" integer DEFAULT 20,
	"cook_time" integer DEFAULT 40,
	"servings" integer DEFAULT 4,
	"image_url" text,
	"ingredients" json,
	"instructions" json,
	"source" text DEFAULT 'database',
	"is_ai_generated" boolean DEFAULT false,
	"spoonacular_id" integer,
	"cuisine" text,
	"dietary_tags" json,
	"nutrition_info" json,
	"max_grain" integer DEFAULT 100,
	"source_url" text,
	"spoonacular_score" integer,
	"health_score" integer,
	"price_per_serving" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"shopping_list_id" integer NOT NULL,
	"ingredient_name" text NOT NULL,
	"amount" text NOT NULL,
	"unit" text,
	"recipe_id" integer,
	"recipe_name" text,
	"is_completed" boolean DEFAULT false NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'My Shopping List' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spoonacular_recipe_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"spoonacular_id" integer NOT NULL,
	"title" text NOT NULL,
	"image" text,
	"full_data" json,
	"full_data_fetched_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "spoonacular_recipe_cache_spoonacular_id_unique" UNIQUE("spoonacular_id")
);
--> statement-breakpoint
CREATE TABLE "spoonacular_search_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"query_hash" text NOT NULL,
	"results" json NOT NULL,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "spoonacular_search_cache_query_hash_unique" UNIQUE("query_hash")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_name" text NOT NULL,
	"display_name" text NOT NULL,
	"monthly_price" numeric(10, 2) NOT NULL,
	"yearly_price" numeric(10, 2),
	"features" json NOT NULL,
	"ai_limits" json NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_plans_plan_name_unique" UNIQUE("plan_name")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"badge_id" integer NOT NULL,
	"date_earned" timestamp DEFAULT now(),
	"displayed" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"collection_id" integer,
	"mastery_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_grain" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'count' NOT NULL,
	"expiry_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_mastery" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"unlocked" boolean DEFAULT false NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"completed_courses" json,
	"date_unlocked" timestamp,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"meals_completed" integer DEFAULT 0 NOT NULL,
	"last_progression_meal_date" timestamp,
	"ingredients" json DEFAULT '[]'::json,
	"subscription_tier" text DEFAULT 'free' NOT NULL,
	"subscription_end_date" timestamp,
	"subscription_renews_at" timestamp,
	"auto_share_meals_to_pod" boolean DEFAULT false NOT NULL,
	"household_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "ai_usage_tracking" ADD CONSTRAINT "ai_usage_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_challenge_id_cooking_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."cooking_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_submissions" ADD CONSTRAINT "challenge_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooking_challenges" ADD CONSTRAINT "cooking_challenges_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooking_challenges" ADD CONSTRAINT "cooking_challenges_challenger_id_users_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooking_challenges" ADD CONSTRAINT "cooking_challenges_challenged_id_users_id_fk" FOREIGN KEY ("challenged_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cooking_challenges" ADD CONSTRAINT "cooking_challenges_winner_id_users_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freeform_meal_analysis" ADD CONSTRAINT "freeform_meal_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_progressions" ADD CONSTRAINT "meal_progressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_read_status" ADD CONSTRAINT "message_read_status_message_id_pod_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."pod_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_champions" ADD CONSTRAINT "pod_champions_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_champions" ADD CONSTRAINT "pod_champions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_comments" ADD CONSTRAINT "pod_comments_post_id_pod_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pod_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_likes" ADD CONSTRAINT "pod_likes_post_id_pod_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pod_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_members" ADD CONSTRAINT "pod_members_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_messages" ADD CONSTRAINT "pod_messages_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_posts" ADD CONSTRAINT "pod_posts_pod_id_pods_id_fk" FOREIGN KEY ("pod_id") REFERENCES "public"."pods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pod_posts" ADD CONSTRAINT "pod_posts_meal_completion_id_meal_completions_id_fk" FOREIGN KEY ("meal_completion_id") REFERENCES "public"."meal_completions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_skips" ADD CONSTRAINT "premium_skips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shopping_list_id_shopping_lists_id_fk" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_collection_id_recipe_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."recipe_collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_user_id_idx" ON "ingredients" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_expiry_date_idx" ON "ingredients" USING btree ("expiry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_category_idx" ON "ingredients" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_name_idx" ON "ingredients" USING btree ("name");