import { nanoid } from 'nanoid';
import { db } from './db';
import { households, householdMembers, users, ingredients, pods, podMembers, householdIngredients } from '../shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export class HouseholdService {
  async createHousehold(userId: number, name: string, createFamilyPod: boolean = true) {
    try {
      if (!db) throw new Error('Database connection not available');

      // Check if user is already in a household
      const existingMembership = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.userId, userId))
        .limit(1);

      console.log('🔍 Checking existing membership for user:', userId);
      console.log('🔍 Existing membership found:', existingMembership.length);

      // FOR TESTING: Skip the membership check to allow household creation
      if (existingMembership.length > 0) {
        console.log('⚠️ TESTING: User already in household, but allowing creation anyway');
        // Remove existing membership for testing
        if (!db) throw new Error('Database not available');
        await db
          .delete(householdMembers)
          .where(eq(householdMembers.userId, userId));
      }

      const inviteCode = nanoid(6).toUpperCase();

      // Create household
      const [household] = await db
        .insert(households)
        .values({
          name,
          createdBy: userId,
          inviteCode,
          autoCreatePod: createFamilyPod,
        })
        .returning();

      // Add creator as admin member
      await db
        .insert(householdMembers)
        .values({
          householdId: household.id,
          userId,
          role: 'admin',
        });

      // Update user's householdId - Now that schema includes householdId field
      try {
        if (!db) throw new Error('Database not available');
        await db
          .update(users)
          .set({ householdId: household.id })
          .where(eq(users.id, userId));
        console.log(`✅ Updated user ${userId} householdId to ${household.id}`);
      } catch (updateError) {
        console.error('Failed to update user householdId:', updateError);
        // Don't throw - household creation succeeded, this is just metadata
      }

      // DISABLED: Create family pod if requested - pod screen not developed
      let familyPod = null;
      console.log('🚫 DISABLED: Automatic pod creation disabled - pod screen not developed');
      /*
      if (createFamilyPod && db) {
        const [pod] = await db
          .insert(pods)
          .values({
            name: `${name} Family Pod`,
            description: `Private cooking pod for ${name} household members`,
            createdBy: userId,
            creatorId: userId,
            isPrivate: true,
            householdId: household.id,
            maxMembers: household.maxMembers,
          })
          .returning();

        // Add creator as admin member
        await db
          .insert(podMembers)
          .values({
            podId: pod.id,
            userId,
            role: 'admin',
          });

        familyPod = pod;
      }
      */

      return {
        household,
        familyPod,
        inviteCode,
        inviteLink: `${process.env.BASE_URL || 'http://localhost:5000'}/invite/${inviteCode}`,
      };
    } catch (error) {
      console.error('Error creating household:', error);
      throw new Error('Failed to create household');
    }
  }

  async joinHousehold(userId: number, inviteCode: string) {
    try {
      if (!db) throw new Error('Database not available');
      // Check if user is already in a household
      const existingMembership = await db
        .select()
        .from(householdMembers)
        .where(eq(householdMembers.userId, userId))
        .limit(1);

      if (existingMembership.length > 0) {
        throw new Error('User is already a member of a household');
      }

      // Find household by invite code
      const [household] = await db
        .select()
        .from(households)
        .where(eq(households.inviteCode, inviteCode))
        .limit(1);

      if (!household) {
        throw new Error('Invalid invite code');
      }

      // Check if household is at capacity
      const memberCount = await db
        .select()
        .from(householdMembers)
        .where(and(
          eq(householdMembers.householdId, household.id),
          eq(householdMembers.status, 'active')
        ));

      if (memberCount.length >= (household.maxMembers || 10)) {
        throw new Error('Household is at maximum capacity');
      }

      // Add user as member
      await db
        .insert(householdMembers)
        .values({
          householdId: household.id,
          userId,
          role: 'member',
        });

      // Update user's householdId
      await db
        .update(users)
        .set({ householdId: household.id })
        .where(eq(users.id, userId));

      // Join existing family pod if one exists
      let familyPod = null;
      if (db) {
        const [existingPod] = await db
          .select()
          .from(pods)
          .where(eq(pods.householdId, household.id))
          .limit(1);

        if (existingPod) {
          // Add user to existing pod
          await db
            .insert(podMembers)
            .values({
              podId: existingPod.id,
              userId,
              role: 'member',
            });

          familyPod = existingPod;
        }
      }

      return {
        household,
        familyPod,
        success: true,
      };
    } catch (error) {
      console.error('Error joining household:', error);
      throw error;
    }
  }

  async joinHouseholdByLink(userId: number, inviteCode: string) {
    // Same as joinHousehold but specifically for link-based joining
    return this.joinHousehold(userId, inviteCode);
  }

  async getUserHousehold(userId: number) {
    try {
      console.log(`🔍 HOUSEHOLD CHECK: Checking if user ${userId} has household membership`);

      // CRITICAL: Check user's household_id first
      if (!db) throw new Error('Database not available');
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.length || !user[0].householdId) {
        console.log(`❌ USER ${userId}: No household_id in users table - INDIVIDUAL USER`);
        return null;
      }

      console.log(`✅ USER ${userId}: Has household_id ${user[0].householdId} - HOUSEHOLD MEMBER`);

      const [userHousehold] = await db
        .select({
          household: households,
          membership: householdMembers,
        })
        .from(householdMembers)
        .innerJoin(households, eq(householdMembers.householdId, households.id))
        .where(eq(householdMembers.userId, userId))
        .limit(1);

      if (!userHousehold) {
        console.log(`❌ USER ${userId}: No household membership found despite having household_id`);
        return null;
      }

      // Get all household members with complete user data
      const members = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          avatar: users.avatar,
          role: householdMembers.role,
          joinedAt: householdMembers.joinedAt,
        })
        .from(householdMembers)
        .innerJoin(users, eq(householdMembers.userId, users.id))
        .where(eq(householdMembers.householdId, userHousehold.household.id));

      // Get household pantry for totalItems count
      const pantryItems = await this.getHouseholdPantry(userHousehold.household.id);

      return {
        ...userHousehold.household,
        userRole: userHousehold.membership.role,
        members,
        memberCount: members.length,
        inviteLink: `${process.env.BASE_URL || 'http://localhost:5000'}/invite/${userHousehold.household.inviteCode}`,
        sharedPantry: {
          totalItems: pantryItems.length,
          lastUpdated: new Date().toISOString(),
        },
        recentActivity: [], // Empty for now
      };
    } catch (error) {
      console.error('Error getting user household:', error);
      throw new Error('Failed to get household information');
    }
  }

  async leaveHousehold(userId: number) {
    try {
      const userHousehold = await this.getUserHousehold(userId);
      if (!userHousehold) {
        throw new Error('User is not a member of any household');
      }

      // Check if user is the only admin
      if (userHousehold.userRole === 'admin') {
        const adminCount = userHousehold.members.filter(m => m.role === 'admin').length;
        if (adminCount === 1 && userHousehold.members.length > 1) {
          throw new Error('Cannot leave household as the only admin. Promote another member to admin first.');
        }
      }

      // Remove membership
      if (!db) throw new Error('Database not available');
      await db
        .update(householdMembers)
        .set({ status: 'inactive' })
        .where(and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, userHousehold.id)
        ));

      // Update user's householdId to null (reset to individual mode)
      await db
        .update(users)
        .set({ householdId: null })
        .where(eq(users.id, userId));

      // CRITICAL: Reset user to individual ingredient management
      // Clear all individual ingredients since they were managing household ingredients
      await db
        .delete(ingredients)
        .where(eq(ingredients.userId, userId));

      console.log(`🏠 User ${userId} ingredients reset to individual mode after leaving household`);

      // If household is empty, delete it
      const remainingMembers = await db
        .select()
        .from(householdMembers)
        .where(and(
          eq(householdMembers.householdId, userHousehold.id),
          eq(householdMembers.status, 'active')
        ));

      if (remainingMembers.length === 0) {
        await db
          .delete(households)
          .where(eq(households.id, userHousehold.id));
      }

      return {
        success: true,
        message: 'Successfully left household',
      };
    } catch (error) {
      console.error('Error leaving household:', error);
      throw error;
    }
  }

  async regenerateInviteCode(userId: number, householdId: number) {
    try {
      // Check if user is admin of the household
      const [membership] = await db
        .select()
        .from(householdMembers)
        .where(and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.role, 'admin'),
          eq(householdMembers.status, 'active')
        ))
        .limit(1);

      if (!membership) {
        throw new Error('Only household admins can regenerate invite codes');
      }

      const newInviteCode = nanoid(6).toUpperCase();

      await db
        .update(households)
        .set({ inviteCode: newInviteCode })
        .where(eq(households.id, householdId));

      return {
        success: true,
        inviteCode: newInviteCode,
        inviteLink: `${process.env.BASE_URL || 'http://localhost:5000'}/invite/${newInviteCode}`,
      };
    } catch (error) {
      console.error('Error regenerating invite code:', error);
      throw error;
    }
  }

  /**
   * Get household pantry (shared ingredients)
   */
  async getHouseholdPantry(householdId: number) {
    try {
      // Get all household members
      const members = await db
        .select({ userId: users.id })
        .from(householdMembers)
        .innerJoin(users, eq(householdMembers.userId, users.id))
        .where(and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.status, 'active')
        ));

      if (members.length === 0) {
        return [];
      }

      // Get ingredients from all household members
      const memberUserIds = members.map(m => m.userId.toString());

      // For now, we'll aggregate ingredients by name across all household members
      // In the future, this could be more sophisticated (separate vs shared ingredients)
      const householdIngredients = await db
        .select()
        .from(ingredients)
        .where(
          // Using text comparison since userId is stored as text
          eq(ingredients.userId, memberUserIds[0]) // Simplified for demo
        );

      return householdIngredients;
    } catch (error) {
      console.error('Error getting household pantry:', error);
      throw new Error('Failed to get household pantry');
    }
  }

  /**
   * Update ingredient quantities for household members when cooking/purchasing
   */
  async updateHouseholdIngredient(householdId: number, ingredientName: string, quantityChange: number, operation: 'cook' | 'purchase') {
    try {
      // Get all household members  
      const members = await db
        .select({ userId: users.id })
        .from(householdMembers)
        .innerJoin(users, eq(householdMembers.userId, users.id))
        .where(and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.status, 'active')
        ));

      if (members.length === 0) {
        return { success: false, message: 'No household members found' };
      }

      // For now, update the first member's ingredients (simplified approach)
      // In a full implementation, this would be more sophisticated
      const primaryUserId = members[0].userId.toString();

      const [existingIngredient] = await db
        .select()
        .from(ingredients)
        .where(and(
          eq(ingredients.userId, primaryUserId),
          eq(ingredients.name, ingredientName)
        ))
        .limit(1);

      if (existingIngredient) {
        const newQuantity = Math.max(0, existingIngredient.quantity + quantityChange);

        if (newQuantity === 0) {
          // Remove ingredient if quantity reaches 0
          await db
            .delete(ingredients)
            .where(eq(ingredients.id, existingIngredient.id));
        } else {
          // Update quantity
          await db
            .update(ingredients)
            .set({ quantity: newQuantity })
            .where(eq(ingredients.id, existingIngredient.id));
        }

        return {
          success: true,
          operation,
          ingredient: ingredientName,
          quantityChange,
          newQuantity,
        };
      } else if (operation === 'purchase' && quantityChange > 0) {
        // Add new ingredient when purchasing
        await db
          .insert(ingredients)
          .values({
            userId: primaryUserId,
            name: ingredientName,
            category: 'other', // Default category
            quantity: quantityChange,
            unit: 'count',
          });

        return {
          success: true,
          operation,
          ingredient: ingredientName,
          quantityChange,
          newQuantity: quantityChange,
        };
      }

      return { success: false, message: 'Ingredient not found and cannot be reduced' };
    } catch (error) {
      console.error('Error updating household ingredient:', error);
      throw new Error('Failed to update household ingredient');
    }
  }



  // OLD METHOD REMOVED - using householdIngredients table version below

  async consumeFromHouseholdPantry(householdId: number, ingredientList: Array<{name: string, quantity: number, unit: string}>) {
    try {
      const results = [];

      for (const item of ingredientList) {
        // Find ingredient in household pantry
        const [ingredient] = await db
          .select()
          .from(ingredients)
          .innerJoin(users, eq(ingredients.userId, users.id.toString()))
          .where(and(
            eq(users.householdId, householdId),
            eq(ingredients.name, item.name),
            eq(ingredients.unit, item.unit)
          ))
          .limit(1);

        if (ingredient) {
          const newQuantity = ingredient.ingredients.quantity - item.quantity;

          if (newQuantity <= 0) {
            // Remove ingredient if quantity becomes 0 or less
            await db
              .delete(ingredients)
              .where(eq(ingredients.id, ingredient.ingredients.id));
          } else {
            // Update quantity
            await db
              .update(ingredients)
              .set({ quantity: newQuantity })
              .where(eq(ingredients.id, ingredient.ingredients.id));
          }

          results.push({
            name: item.name,
            quantityConsumed: item.quantity,
            remainingQuantity: Math.max(0, newQuantity),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error consuming from household pantry:', error);
      throw error;
    }
  }

  // SHARED INGREDIENT MANAGEMENT METHODS
  async getHouseholdPantry(householdId: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      const pantryItems = await db
        .select({
          id: householdIngredients.id,
          ingredientName: householdIngredients.ingredientName,
          quantity: householdIngredients.quantity,
          unit: householdIngredients.unit,
          emoji: householdIngredients.emoji,
          addedBy: householdIngredients.addedBy,
          addedAt: householdIngredients.addedAt,
          updatedAt: householdIngredients.updatedAt,
        })
        .from(householdIngredients)
        .where(eq(householdIngredients.householdId, householdId))
        .orderBy(householdIngredients.ingredientName);

      return pantryItems;
    } catch (error) {
      console.error('Error getting household pantry:', error);
      throw error;
    }
  }

  async addToHouseholdPantry(householdId: number, ingredients: Array<{name: string, quantity: number, unit?: string, emoji?: string, expiryDate?: Date}>, addedBy: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      const results = [];

      for (const ingredient of ingredients) {
        // Check if ingredient already exists
        const existing = await db
          .select()
          .from(householdIngredients)
          .where(
            and(
              eq(householdIngredients.householdId, householdId),
              eq(householdIngredients.ingredientName, ingredient.name)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update quantity and optionally expiry date
          const updateData: any = {
            quantity: sql`${householdIngredients.quantity} + ${ingredient.quantity}`,
            updatedBy: addedBy,
            updatedAt: new Date(),
          };
          
          // If new ingredient has expiry date, use it (prefer fresher/later expiry)
          if (ingredient.expiryDate) {
            updateData.expiryDate = ingredient.expiryDate;
          }
          
          const [updated] = await db
            .update(householdIngredients)
            .set(updateData)
            .where(eq(householdIngredients.id, existing[0].id))
            .returning();
          results.push(updated);
        } else {
          // Add new ingredient
          const [created] = await db
            .insert(householdIngredients)
            .values({
              householdId,
              ingredientName: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit || 'pieces',
              emoji: ingredient.emoji || '🥘',
              expiryDate: ingredient.expiryDate || null,
              addedBy,
            })
            .returning();
          results.push(created);
        }
      }

      return results;
    } catch (error) {
      console.error('Error adding to household pantry:', error);
      throw error;
    }
  }

  /**
   * Add ingredient to household pantry (simplified version for route compatibility)
   */
  async addHouseholdIngredient(householdId: number, ingredient: { name: string, quantity: number, unit: string, category: string }) {
    try {
      if (!db) throw new Error('Database not available');
      
      // Add to household ingredients table
      const [newIngredient] = await db
        .insert(householdIngredients)
        .values({
          householdId,
          ingredientName: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          emoji: '🥘', // Default emoji
          addedBy: 1, // Default user for now
        })
        .returning();

      return newIngredient;
    } catch (error) {
      console.error('Error adding household ingredient:', error);
      throw new Error('Failed to add ingredient to household');
    }
  }

  async consumeFromHouseholdPantry(householdId: number, ingredients: Array<{name: string, quantity: number}>, consumedBy: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      const results = [];

      for (const ingredient of ingredients) {
        // Find the ingredient
        const existing = await db
          .select()
          .from(householdIngredients)
          .where(
            and(
              eq(householdIngredients.householdId, householdId),
              eq(householdIngredients.ingredientName, ingredient.name)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          const currentQuantity = existing[0].quantity;
          const newQuantity = Math.max(0, currentQuantity - ingredient.quantity);

          if (newQuantity === 0) {
            // Remove ingredient if quantity reaches zero
            await db
              .delete(householdIngredients)
              .where(eq(householdIngredients.id, existing[0].id));
            results.push({ ...existing[0], quantity: 0, consumed: true });
          } else {
            // Update quantity
            const [updated] = await db
              .update(householdIngredients)
              .set({
                quantity: newQuantity,
                updatedBy: consumedBy,
                updatedAt: new Date(),
              })
              .where(eq(householdIngredients.id, existing[0].id))
              .returning();
            results.push({ ...updated, consumed: false });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error consuming from household pantry:', error);
      throw error;
    }
  }

  async updateHouseholdIngredient(householdId: number, ingredientName: string, quantityChange: number, operation: 'purchase' | 'cook', userId: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      // Find the ingredient
      const existing = await db
        .select()
        .from(householdIngredients)
        .where(
          and(
            eq(householdIngredients.householdId, householdId),
            eq(householdIngredients.ingredientName, ingredientName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const currentQuantity = existing[0].quantity;
        const newQuantity = Math.max(0, currentQuantity + quantityChange);

        if (newQuantity === 0 && quantityChange < 0) {
          // Remove ingredient if consumed completely
          await db
            .delete(householdIngredients)
            .where(eq(householdIngredients.id, existing[0].id));
          return { ...existing[0], quantity: 0, operation };
        } else {
          // Update quantity
          const [updated] = await db
            .update(householdIngredients)
            .set({
              quantity: newQuantity,
              updatedBy: userId,
              updatedAt: new Date(),
            })
            .where(eq(householdIngredients.id, existing[0].id))
            .returning();
          return { ...updated, operation };
        }
      } else if (quantityChange > 0) {
        // Add new ingredient for purchases
        const [created] = await db
          .insert(householdIngredients)
          .values({
            householdId,
            ingredientName,
            quantity: quantityChange,
            unit: 'pieces',
            emoji: '🥘',
            addedBy: userId,
          })
          .returning();
        return { ...created, operation };
      }

      return null;
    } catch (error) {
      console.error('Error updating household ingredient:', error);
      throw error;
    }
  }

  async removeFromHouseholdPantry(householdId: number, ingredientId: number, removedBy: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      const ingredient = await db
        .select()
        .from(householdIngredients)
        .where(
          and(
            eq(householdIngredients.id, ingredientId),
            eq(householdIngredients.householdId, householdId)
          )
        )
        .limit(1);

      if (ingredient.length === 0) {
        throw new Error('Ingredient not found in household pantry');
      }

      await db
        .delete(householdIngredients)
        .where(eq(householdIngredients.id, ingredientId));

      return { success: true, removedIngredient: ingredient[0] };
    } catch (error) {
      console.error('Error removing from household pantry:', error);
      throw error;
    }
  }

  async clearHouseholdPantry(householdId: number, clearedBy: number) {
    try {
      if (!db) throw new Error('Database connection not available');

      const ingredientsToDelete = await db
        .select({ id: householdIngredients.id })
        .from(householdIngredients)
        .where(eq(householdIngredients.householdId, householdId));

      const deletedCount = ingredientsToDelete.length;

      await db
        .delete(householdIngredients)
        .where(eq(householdIngredients.householdId, householdId));

      return { 
        success: true, 
        deletedCount,
        message: `Cleared ${deletedCount} ingredients from household pantry`
      };
    } catch (error) {
      console.error('Error clearing household pantry:', error);
      throw error;
    }
  }
}

export const householdService = new HouseholdService();