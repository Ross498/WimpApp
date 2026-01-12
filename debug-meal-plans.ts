import { db } from './server/db';
import { aiMealPlans } from './shared/schema';
import { eq, desc } from 'drizzle-orm';

async function testMealPlans() {
  console.log('Testing meal plans query...');
  
  if (!db) {
    console.error('Database not initialized');
    return;
  }
  
  try {
    const result = await db
      .select()
      .from(aiMealPlans)
      .where(eq(aiMealPlans.userId, 1))
      .orderBy(desc(aiMealPlans.createdAt));
    
    console.log('Found meal plans:', result.length);
    console.log('Meal plans:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error querying meal plans:', error);
  }
}

testMealPlans();