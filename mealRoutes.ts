import { Router, Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import { db } from './db';
import { AuthUser } from './auth';
import { mealCompletions, insertMealCompletionSchema } from '../shared/schema.js';
import OpenAI from 'openai';
import { PodService } from './podService';
import { calculateEstimatedUsage, isLowStock } from './utils/smartSubtraction';

const router = Router();

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/**
 * Submit meal photo for AI analysis and automatic pod sharing
 * POST /api/meals/submit-photo
 */
router.post('/submit-photo', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { recipeId, imageBase64, recipeName, maxBucks } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!recipeId || !imageBase64 || !recipeName || !maxBucks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's ingredients for validation
    const userIngredients = await getUserIngredients(userId);

    // Check grain spending first
    const grainCheck = await grainEconomyService.spendGrains(userId.toString(), 'mealPhotoScore');
    if (!grainCheck.success) {
      return res.status(402).json({
        error: 'Insufficient grains',
        message: grainCheck.reason,
        grainCost: grainCheck.cost
      });
    }

    // Analyze with AI and anti-cheating measures
    const aiAnalysis = await scoreMealPhoto(
      Buffer.from(imageBase64, 'base64'),
      recipeName,
      [], // Expected ingredients would come from recipe
      userId.toString(),
      userIngredients.map(i => i.name)
    );

    if (!aiAnalysis.success) {
      return res.status(400).json({
        error: 'Photo analysis failed',
        message: aiAnalysis.analysis,
        flagged: aiAnalysis.flagged,
        reason: aiAnalysis.reason
      });
    }

    // Check for suspicious activity
    const suspiciousActivity = grainEconomyService.detectSuspiciousActivity(userId.toString());
    if (suspiciousActivity.isSuspicious) {
      // Log suspicious activity but don't block (for now)
      console.warn(`Suspicious activity detected for user ${userId}:`, suspiciousActivity.reasons);
    }

    // Award grains with anti-farming protection
    const grainAward = await grainEconomyService.awardGrains(
      userId.toString(),
      aiAnalysis.bucksEarned,
      'photoScoring',
      { score: aiAnalysis.score, recipeName }
    );

    const earnedBucks = grainAward.actualAmount;

    // Store the meal completion in database
    if (db) {
      await db.insert(mealCompletions).values({
        userId: parseInt(userId.toString()),
        recipeId: parseInt(recipeId),
        recipeName,
        mealPhotoBase64: imageBase64,
        bucksEarned: earnedBucks,
        maxBucks,
        aiScore: aiAnalysis.score,
        aiAnalysis: aiAnalysis.analysis,
      });
    }

    // Get user's pods and share the meal with humorous AI commentary


/**
 * POST /api/meals/log-meal-with-ingredients
 * User manually selects which ingredients were used in their meal
 */
router.post('/log-meal-with-ingredients', authMiddleware, async (req, res) => {
  try {
    const { mealName, imageBase64, selectedIngredients } = req.body;
    const userId = req.user?.id;

    if (!userId || !mealName || !Array.isArray(selectedIngredients)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user's available ingredients
    const userIngredients = await db.select()
      .from(ingredients)
      .where(and(
        eq(ingredients.userId, userId),
        gt(ingredients.quantity, 0)
      ));

    const deductionResults = [];
    
    // Process each selected ingredient
    for (const selection of selectedIngredients) {
      const { ingredientId, quantityUsed } = selection;
      
      const ingredient = userIngredients.find(ing => ing.id === ingredientId);
      
      if (ingredient && ingredient.quantity >= quantityUsed) {
        const newQuantity = Math.max(0, ingredient.quantity - quantityUsed);
        
        await db.update(ingredients)
          .set({ quantity: newQuantity })
          .where(eq(ingredients.id, ingredientId));

        deductionResults.push({
          name: ingredient.name,
          quantityUsed,
          remainingQuantity: newQuantity
        });
      }
    }

    // Score the meal photo if provided
    let mealScore = null;
    if (imageBase64) {
      // Use your existing photo scoring logic here
      mealScore = await scoreMealPhoto(
        Buffer.from(imageBase64.split(',')[1], 'base64'),
        mealName,
        selectedIngredients.map(s => s.name || ''),
        userId,
        userIngredients.map(ing => ing.name)
      );
    }

    res.json({
      success: true,
      mealName,
      ingredientsUsed: deductionResults,
      mealScore: mealScore?.score || null,
      bucksEarned: mealScore?.bucksEarned || 0
    });

  } catch (error) {
    console.error('Error logging meal with ingredients:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

    const userPods = await PodService.getUserPods(parseInt(userId.toString()));

    if (userPods.length > 0) {
      // Share to the first pod (or most active pod)
      const podId = userPods[0].id;

      // Generate humorous pod sharing comment based on score
      const podComment = generatePodSharingComment(aiAnalysis.score, earnedBucks, recipeName);

      await PodService.createPost(
        parseInt(userId.toString()),
        parseInt(podId.toString()),
        'meal_completion',
        podComment,
        imageBase64,
        {
          recipeId: parseInt(recipeId),
          recipeName,
          earnedBucks,
          maxBucks,
          score: aiAnalysis.score,
          analysis: aiAnalysis.analysis
        }
      );
    }

    res.json({
      success: true,
      earnedBucks,
      maxBucks,
      score: aiAnalysis.score,
      analysis: aiAnalysis.analysis,
      sharedToPod: userPods.length > 0
    });

  } catch (error) {
    console.error('Error submitting meal photo:', error);
    res.status(500).json({ 
      error: 'Failed to submit meal photo',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze meal photo using AI with anti-cheating measures
 */
async function scoreMealPhoto(
  imageBuffer: Buffer,
  recipeName: string,
  expectedIngredients: string[],
  userId: string,
  userIngredients: string[]
): Promise<{
  success: boolean;
  score: number;
  analysis: string;
  flagged: boolean;
  reason?: string;
  bucksEarned: number;
}> {
  try {
    // 1. Real-time Photo Check (Simulated)
    // In a real app, you'd check if the photo was taken live.
    const isLivePhoto = true; // Simulate live photo check
    if (!isLivePhoto) {
      return {
        success: false,
        score: 0,
        analysis: "Photo must be taken in real-time.",
        flagged: true,
        reason: "Not a real-time photo",
        bucksEarned: 0
      };
    }

    // 2. Reverse Image Search Detection (Simulated)
    // Check if the image is found elsewhere online
    const isOriginal = await simulateReverseImageSearch(imageBuffer);
    if (!isOriginal) {
      return {
        success: false,
        score: 0,
        analysis: "Image found online. Please submit original photos.",
        flagged: true,
        reason: "Reverse image search fail",
        bucksEarned: 0
      };
    }

    // 3. Ingredient Validation (Simulated)
    const hasAllIngredients = await validateIngredients(recipeName, userIngredients);
    if (!hasAllIngredients) {
      return {
        success: false,
        score: 0,
        analysis: "Missing some ingredients in the photo or pantry.",
        flagged: true,
        reason: "Ingredient validation fail",
        bucksEarned: 0
      };
    }

    // If all checks pass, proceed with AI analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are a witty AI chef assistant analyzing meal photos with humor and personality. Your job is to score how well the user executed the recipe based on presentation, color, texture, and overall appearance, while providing entertaining commentary.

Rate the meal on a scale of 0-100 where:
- 90-100: Restaurant quality, perfect execution - be amazed and humorous
- 80-89: Very good, minor imperfections - be encouraging with light humor
- 70-79: Good, some noticeable issues - be constructive but witty
- 60-69: Acceptable, several issues - be gently sarcastic but supportive
- 50-59: Poor, major problems - be funny but not cruel
- Below 50: Needs significant improvement - be hilariously dramatic

Provide detailed analysis that's both informative and entertaining. Be encouraging while adding personality and humor. Think like a friendly roast comedian who loves cooking.

Respond in JSON format: {"score": number, "analysis": "detailed feedback with humor and personality"}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze this photo of "${recipeName}" and provide a score with humorous but constructive feedback.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 75, "analysis": "Your culinary creation has been analyzed! It\'s looking quite appetizing - I\'d say you\'ve got some solid kitchen skills brewing. Keep up the great work, chef!"}');

    const score = Math.max(0, Math.min(100, result.score || 75));
    const analysis = result.analysis || "Your culinary creation has been analyzed! It's looking quite appetizing - I'd say you've got some solid kitchen skills brewing. Keep up the great work, chef!";
    const bucksEarned = calculateBucksFromScore(score, 100); // Assume maxBucks is 100 for now

    return {
      success: true,
      score: score,
      analysis: analysis,
      flagged: false,
      bucksEarned: bucksEarned
    };

  } catch (error) {
    console.error('Error analyzing meal photo:', error);
    // Return a humorous fallback response if AI analysis fails
    return {
      success: false,
      score: 75,
      analysis: "My AI circuits are having a moment, but from what I can process, this looks like a solid effort! Sometimes even us digital chefs need a coffee break. Keep cooking, you're doing great!",
      flagged: false,
      bucksEarned: 0
    };
  }
}

/**
 * Calculate earned bucks based on AI score
 */
function calculateBucksFromScore(score: number, maxBucks: number): number {
  // Convert score (0-100) to buck percentage
  // Minimum 20% of bucks for completion, up to 100% for perfect execution
  const minPercentage = 0.2; // 20% minimum
  const scorePercentage = score / 100;
  const earnedPercentage = minPercentage + (scorePercentage * (1 - minPercentage));

  return Math.round(maxBucks * earnedPercentage);
}

/**
 * Generate humorous pod sharing comments based on AI score
 */
function generatePodSharingComment(score: number, earnedBucks: number, mealName: string): string {
  if (score >= 90) {
    const comments = [
      `🤖 ATTENTION POD: Feast your eyes on this MASTERPIECE! ${mealName} scored big and earned ${earnedBucks}⭐!`,
      `🤖 Breaking news: Someone in your pod actually knows how to cook! ${mealName} = perfection + ${earnedBucks}⭐!`,
      `🤖 Pod alert! This ${mealName} is so good, I'm considering upgrading to taste sensors. ${earnedBucks}⭐ earned!`,
      `🤖 Calling all pod members! Witness this culinary miracle called ${mealName}. ${earnedBucks}⭐ well deserved!`,
      `🤖 Emergency broadcast: This ${mealName} is dangerously delicious! Awarding ${earnedBucks}⭐ immediately!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  } else if (score >= 80) {
    const comments = [
      `🤖 Pod update: Decent ${mealName} spotted! Not bad for a human. ${earnedBucks}⭐ awarded!`,
      `🤖 Hey pod! Someone made an actually edible ${mealName}. ${earnedBucks}⭐ for not burning it!`,
      `🤖 Pod notification: This ${mealName} looks pretty good! ${earnedBucks}⭐ for solid effort!`,
      `🤖 Attention pod: Acceptable ${mealName} detected. My sensors approve! ${earnedBucks}⭐!`,
      `🤖 Pod alert! This ${mealName} passes my quality check. ${earnedBucks}⭐ earned fair and square!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  } else if (score >= 70) {
    const comments = [
      `🤖 Pod members, behold: an... attempt at ${mealName}. ${earnedBucks}⭐ for trying!`,
      `🤖 Pod update: ${mealName} status = edible (probably). ${earnedBucks}⭐ for courage!`,
      `🤖 Hey pod! This ${mealName} exists and that's... something. ${earnedBucks}⭐ awarded!`,
      `🤖 Pod notification: Average ${mealName} detected. Nothing to write home about. ${earnedBucks}⭐!`,
      `🤖 Attention pod: This ${mealName} won't win awards, but it's food-shaped! ${earnedBucks}⭐!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  } else if (score >= 60) {
    const comments = [
      `🤖 Pod alert: Questionable ${mealName} spotted. Proceed with caution. ${earnedBucks}⭐ for bravery!`,
      `🤖 Hey pod... um... someone made a ${mealName}? I think? ${earnedBucks}⭐ for the mystery!`,
      `🤖 Pod update: My visual sensors are confused by this ${mealName}. ${earnedBucks}⭐ for creativity!`,
      `🤖 Attention pod: This ${mealName} defies my food classification system. ${earnedBucks}⭐!`,
      `🤖 Pod notification: I'm not sure what this ${mealName} is, but ${earnedBucks}⭐ for effort!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  } else if (score >= 50) {
    const comments = [
      `🤖 Pod emergency: Someone needs cooking lessons. This ${mealName} is... concerning. ${earnedBucks}⭐ for trying!`,
      `🤖 Hey pod, group hug needed! This ${mealName} didn't go as planned. ${earnedBucks}⭐ for effort!`,
      `🤖 Pod alert: Culinary disaster detected! This ${mealName} needs help. ${earnedBucks}⭐ for surviving!`,
      `🤖 Attention pod: Maybe order pizza? This ${mealName} is struggling. ${earnedBucks}⭐ for courage!`,
      `🤖 Pod update: I'm concerned about this ${mealName}. Send backup! ${earnedBucks}⭐ awarded!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  } else {
    const comments = [
      `🤖 POD RED ALERT! This ${mealName} has broken my analysis system! ${earnedBucks}⭐ for chaos!`,
      `🤖 MAYDAY MAYDAY! Pod member needs immediate takeout assistance! ${mealName} = ??? ${earnedBucks}⭐!`,
      `🤖 Pod emergency! I can't identify this ${mealName}. Is it even food? ${earnedBucks}⭐ for mystery!`,
      `🤖 URGENT: Pod intervention required! This ${mealName} has confused my circuits! ${earnedBucks}⭐!`,
      `🤖 Pod crisis! Someone call a cooking hotline! This ${mealName} needs help! ${earnedBucks}⭐!`,
      `🤖 Breaking: Local AI has trust issues after seeing this ${mealName}. ${earnedBucks}⭐ for trauma!`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
}

/**
 * Get user ingredients (mock implementation for demonstration)
 */
async function getUserIngredients(userId: string): Promise<{ id: number; name: string; }[]> {
  // In real app, fetch from the user's pantry in the database
  const ingredients = [
    { id: 1, name: 'Tomato' },
    { id: 2, name: 'Onion' },
    { id: 3, name: 'Garlic' },
    { id: 4, name: 'Pasta' },
  ];
  return ingredients;
}

/**
 * Simulate reverse image search
 */
async function simulateReverseImageSearch(imageBuffer: Buffer): Promise<boolean> {
  // Implement actual reverse image search using APIs like Google Cloud Vision or TinEye
  // For now, simulate the check by returning a random boolean
  return Math.random() < 0.8; // 80% chance of being original
}

/**
 * Simulate ingredient validation based on recipe and user pantry
 */
async function validateIngredients(recipeName: string, userIngredients: string[]): Promise<boolean> {
  // Implement actual ingredient validation logic based on the recipe
  // For now, simulate the check by ensuring at least 3 common ingredients are present
  const requiredIngredients = ['Tomato', 'Onion', 'Garlic'];
  let hasRequired = 0;
  for (const ingredient of requiredIngredients) {
    if (userIngredients.includes(ingredient)) {
      hasRequired++;
    }
  }
  return hasRequired >= 2; // Require at least 2 of the 3 ingredients
}

// Mock GrainEconomyService for demonstration
const grainEconomyService = {
  spendGrains: async (userId: string, action: string): Promise<{ success: boolean; cost?: number; reason?: string }> => {
    // Simulate grain spending logic
    const grainCost = 5; // Example grain cost for meal photo scoring
    if (Math.random() < 0.9) {
      return { success: true, cost: grainCost };
    } else {
      return { success: false, reason: 'Not enough grains' };
    }
  },
  awardGrains: async (userId: string, amount: number, reason: string, details: any): Promise<{ actualAmount: number }> => {
    // Simulate grain awarding logic with anti-farming protection
    const actualAmount = Math.min(amount, 20); // Limit grain awarding to prevent farming
    return { actualAmount: actualAmount };
  },
  detectSuspiciousActivity: (userId: string): { isSuspicious: boolean; reasons: string[] } => {
    // Simulate suspicious activity detection
    const reasons: string[] = [];
    if (Math.random() < 0.1) {
      reasons.push('High frequency of submissions');
    }
    if (Math.random() < 0.05) {
      reasons.push('Consistently high scores');
    }
    return { isSuspicious: reasons.length > 0, reasons: reasons };
  }
};

export default router;