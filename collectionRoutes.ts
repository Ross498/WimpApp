import { Router, Request, Response } from 'express';
import { db } from './db.js';
import { recipeCollections, collectionRecipes as recipeCollectionItems, userFavorites, masteryCourses, masteryIngredients, userMastery } from '../shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { authenticateToken } from './authMiddleware';

const router = Router();

/**
 * Create a new recipe collection
 * POST /api/collections
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, description, emoji } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Collection name is required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Insert collection record
    const insertResult = await db
      .insert(recipeCollections)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        emoji: emoji?.trim() || '📚',
        userId: Number(userId)
      })
      .returning();

    const collection = insertResult[0];

    res.status(201).json({
      message: 'Collection created successfully',
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        emoji: collection.emoji,
        createdAt: collection.createdAt,
        userId: collection.userId
      }
    });

  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

/**
 * Add recipe to collection
 * POST /api/collections/:id/recipes
 */
router.post('/:id/recipes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const collectionId = parseInt(req.params.id);
    let { recipeId, recipeSource } = req.body;
    
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    // UNIVERSAL RECIPE DETECTION: Auto-detect source by checking all tables
    let numericRecipeId: number;
    let finalSource: string;

    if (typeof recipeId === 'string') {
      // Handle prefixed IDs like "shared-152", "ai-438", "mastery-123"
      const match = recipeId.match(/^(shared|ai|mastery|custom)-(\d+)$/);
      if (match) {
        finalSource = match[1] === 'ai' ? 'ai-weekly' : match[1];
        numericRecipeId = parseInt(match[2]);
      } else if (/^\d+$/.test(recipeId)) {
        // Handle plain numeric strings
        numericRecipeId = parseInt(recipeId);
        finalSource = recipeSource || 'auto-detect';
      } else {
        return res.status(400).json({ error: 'Invalid recipe ID format' });
      }
    } else if (typeof recipeId === 'number') {
      numericRecipeId = recipeId;
      finalSource = recipeSource || 'auto-detect';
    } else {
      return res.status(400).json({ error: 'Recipe ID must be string or number' });
    }

    // AUTO-DETECT: If source is 'auto-detect', find which table contains the recipe
    if (finalSource === 'auto-detect') {
      console.log(`🔍 AUTO-DETECT: Searching for recipe ${numericRecipeId} across all tables...`);
      
      // Check each table in order of likelihood
      const tablesToCheck = [
        { table: 'custom_recipes', source: 'custom' },
        { table: 'recipes', source: 'shared' },
        { table: 'user_ai_recipes', source: 'ai-weekly' },
        { table: 'mastery_recipes', source: 'mastery' }
      ];
      
      for (const { table, source } of tablesToCheck) {
        try {
          const result = await db.execute(sql`SELECT id FROM ${sql.raw(table)} WHERE id = ${numericRecipeId} LIMIT 1`);
          if (result.rows && result.rows.length > 0) {
            finalSource = source;
            console.log(`✅ AUTO-DETECT: Found recipe ${numericRecipeId} in ${table} (source: ${source})`);
            break;
          }
        } catch (tableError) {
          console.log(`⚠️ AUTO-DETECT: Error checking ${table}:`, tableError);
          continue;
        }
      }
      
      // If still not found, default to custom
      if (finalSource === 'auto-detect') {
        console.warn(`❌ AUTO-DETECT: Recipe ${numericRecipeId} not found in any table, defaulting to custom`);
        finalSource = 'custom';
      }
    }

    console.log(`📚 COLLECTION: Adding recipe ${numericRecipeId} (source: ${finalSource}) to collection ${collectionId} for user ${userId}`);

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify collection belongs to user
    const collection = await db
      .select()
      .from(recipeCollections)
      .where(and(
        eq(recipeCollections.id, collectionId),
        eq(recipeCollections.userId, Number(userId))
      ))
      .limit(1);

    if (!collection.length) {
      return res.status(404).json({ error: 'Collection not found or access denied' });
    }

    // Check if recipe is already in collection
    const existingItem = await db
      .select()
      .from(recipeCollectionItems)
      .where(and(
        eq(recipeCollectionItems.collectionId, collectionId),
        eq(recipeCollectionItems.recipeId, numericRecipeId),
        eq(recipeCollectionItems.recipeSource, finalSource)
      ))
      .limit(1);

    if (existingItem.length > 0) {
      return res.status(409).json({ error: 'Recipe already in collection' });
    }

    // Add recipe to collection
    const result = await db
      .insert(recipeCollectionItems)
      .values({
        collectionId,
        recipeId: numericRecipeId,
        recipeSource: finalSource
      })
      .returning();

    console.log(`✅ COLLECTION: Recipe ${numericRecipeId} added to collection ${collectionId} successfully`);

    res.json({
      success: true,
      message: 'Recipe added to collection successfully',
      item: result[0]
    });

  } catch (error) {
    console.error('Error adding recipe to collection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add recipe to collection' 
    });
  }
});

/**
 * Get user's recipe collections
 * GET /api/collections
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!db) {
      console.error('❌ Database not available in collections route');
      return res.status(500).json({ error: 'Database not available' });
    }

    // Use Drizzle ORM with proper column names
    const result = await db
      .select()
      .from(recipeCollections)
      .where(eq(recipeCollections.userId, Number(userId)))
      .orderBy(sql`${recipeCollections.createdAt} DESC`);

    // Get recipe counts for each collection with proper array handling
    const collectionsWithCounts = await Promise.all(result.map(async (collection: any) => {
      if (!db) return { ...collection, recipeCount: 0, recipeIds: [] };
      
      try {
        // Get both count and actual recipe IDs for frontend
        const [countResult, recipeItems] = await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(recipeCollectionItems)
            .where(eq(recipeCollectionItems.collectionId, collection.id)),
          db
            .select({
              recipeId: recipeCollectionItems.recipeId,
              recipeSource: recipeCollectionItems.recipeSource,
              addedAt: recipeCollectionItems.addedAt,
              id: recipeCollectionItems.id
            })
            .from(recipeCollectionItems)
            .where(eq(recipeCollectionItems.collectionId, collection.id))
            .orderBy(desc(recipeCollectionItems.addedAt))
        ]);
        
        const recipeCount = countResult[0]?.count || 0;
        const recipeIds = recipeItems.map(item => item.recipeId);
        
        console.log(`📚 COLLECTION ${collection.id} (${collection.name}): ${recipeCount} recipes, IDs: [${recipeIds.join(', ')}]`);
        
        return {
          id: collection.id,
          name: collection.name,
          description: collection.description,
          emoji: collection.emoji,
          createdAt: collection.createdAt,
          userId: collection.userId,
          recipeCount: Number(recipeCount),
          recipeIds: recipeIds, // Include recipe IDs for frontend display
          recipes: recipeItems.map(item => ({
            id: item.recipeId,
            recipeId: item.recipeId,
            recipeSource: item.recipeSource,
            addedAt: item.addedAt,
            collectionItemId: item.id
          }))
        };
      } catch (error) {
        console.error(`❌ Error getting recipes for collection ${collection.id}:`, error);
        return { ...collection, recipeCount: 0, recipeIds: [] };
      }
    }));

    const collections = collectionsWithCounts;

    res.json(collections);

  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

/**
 * Add mastery recipe to collection
 * POST /api/collections/:collectionId/mastery-recipe
 */
router.post('/:collectionId/mastery-recipe', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { collectionId } = req.params;
    const { masteryRecipeId, masteryType } = req.body;

    if (!masteryRecipeId || !masteryType) {
      return res.status(400).json({ error: 'Mastery recipe ID and type are required' });
    }
    
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify collection belongs to user
    const collection = await db
      .select()
      .from(recipeCollections)
      .where(and(
        eq(recipeCollections.id, parseInt(collectionId)),
        eq(recipeCollections.userId, Number(userId))
      ))
      .limit(1);

    if (!collection.length) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Check if already in collection
    const existing = await db
      .select()
      .from(recipeCollectionItems)
      .where(and(
        eq(recipeCollectionItems.collectionId, parseInt(collectionId)),
        eq(recipeCollectionItems.recipeId, parseInt(masteryRecipeId)),
        eq(recipeCollectionItems.recipeSource, 'mastery')
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Recipe already in collection' });
    }

    // Add mastery recipe to collection
    const collectionItem = await db
      .insert(recipeCollectionItems)
      .values({
        collectionId: parseInt(collectionId),
        recipeId: parseInt(masteryRecipeId),
        recipeSource: 'mastery'
      })
      .returning();

    res.status(201).json({
      message: 'Mastery recipe added to collection',
      item: collectionItem[0]
    });

  } catch (error) {
    console.error('Error adding mastery recipe to collection:', error);
    res.status(500).json({ error: 'Failed to add mastery recipe to collection' });
  }
});

/**
 * Get recipes in a collection
 * GET /api/collections/:collectionId/recipes
 */
router.get('/:collectionId/recipes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { collectionId } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify collection belongs to user
    const collection = await db
      .select()
      .from(recipeCollections)
      .where(and(
        eq(recipeCollections.id, parseInt(collectionId)),
        eq(recipeCollections.userId, Number(userId))
      ))
      .limit(1);

    if (!collection.length) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    // Get all recipes in collection using the junction table
    const collectionItems = await db
      .select()
      .from(recipeCollectionItems)
      .where(eq(recipeCollectionItems.collectionId, parseInt(collectionId)))
      .orderBy(desc(recipeCollectionItems.addedAt));

    // Return the collection items with basic details
    const recipes = collectionItems.map(item => ({
      id: `${item.recipeSource}-${item.recipeId}`,
      recipeId: item.recipeId,
      recipeSource: item.recipeSource,
      addedAt: item.addedAt,
      collectionItemId: item.id
    }));

    console.log(`📚 COLLECTION RECIPES: Found ${recipes.length} recipes in collection ${collectionId}`);
    res.json({
      collection: collection[0],
      recipes: recipes
    });

  } catch (error) {
    console.error('Error fetching collection recipes:', error);
    res.status(500).json({ error: 'Failed to fetch collection recipes' });
  }
});

/**
 * Remove recipe from collection
 * DELETE /api/collections/:collectionId/recipes/:itemId
 */
router.delete('/:collectionId/recipes/:itemId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { collectionId, itemId } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Verify collection belongs to user first
    const collection = await db
      .select()
      .from(recipeCollections)
      .where(and(
        eq(recipeCollections.id, parseInt(collectionId)),
        eq(recipeCollections.userId, Number(userId))
      ))
      .limit(1);

    if (!collection.length) {
      return res.status(404).json({ error: 'Collection not found or access denied' });
    }

    // Remove from junction table using correct table
    const deleted = await db
      .delete(recipeCollectionItems)
      .where(and(
        eq(recipeCollectionItems.id, parseInt(itemId)),
        eq(recipeCollectionItems.collectionId, parseInt(collectionId))
      ))
      .returning();

    if (!deleted.length) {
      return res.status(404).json({ error: 'Recipe not found in collection' });
    }

    console.log(`📚 COLLECTION: Removed recipe item ${itemId} from collection ${collectionId}`);
    res.json({ 
      success: true, 
      message: 'Recipe removed from collection',
      removedItem: deleted[0]
    });

  } catch (error) {
    console.error('Error removing recipe from collection:', error);
    res.status(500).json({ error: 'Failed to remove recipe from collection' });
  }
});

/**
 * Delete collection
 * DELETE /api/collections/:collectionId
 */
router.delete('/:collectionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { collectionId } = req.params;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Delete collection (cascade will handle collection items)
    const result = await db
      .delete(recipeCollections)
      .where(and(
        eq(recipeCollections.id, parseInt(collectionId)),
        eq(recipeCollections.userId, Number(userId))
      ))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({ message: 'Collection deleted successfully' });

  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

export default router;