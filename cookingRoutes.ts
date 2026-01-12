import type { Express, Request, Response } from 'express';

export default function registerCookingRoutes(app: Express) {
  // Get cooking modes
  app.get('/api/cooking/modes', (req: Request, res: Response) => {
    const modes = [
      {
        id: 'guided',
        name: 'Guided Cooking',
        description: 'Step-by-step instructions with timing',
        icon: '👨‍🍳',
        features: ['Timer assistance', 'Voice guidance', 'Step-by-step photos']
      },
      {
        id: 'freestyle',
        name: 'Freestyle Mode',
        description: 'Cook at your own pace with tips',
        icon: '🎨',
        features: ['Flexible timing', 'Quick tips', 'Ingredient substitutions']
      },
      {
        id: 'challenge',
        name: 'Challenge Mode',
        description: 'Timed cooking challenges',
        icon: '⚡',
        features: ['Time limits', 'Skill points', 'Leaderboards']
      }
    ];

    res.json({ success: true, modes });
  });

  // Start cooking session
  app.post('/api/cooking/start', (req: Request, res: Response) => {
    const { recipeId, mode } = req.body;
    
    const session = {
      sessionId: `cooking_${Date.now()}`,
      recipeId,
      mode,
      startTime: new Date().toISOString(),
      currentStep: 1,
      totalSteps: 8,
      status: 'active'
    };

    res.json({ success: true, session });
  });

  // Get cooking tips
  app.get('/api/cooking/tips', (req: Request, res: Response) => {
    const tips = [
      {
        id: 1,
        category: 'Preparation',
        title: 'Mise en Place',
        content: 'Prepare and organize all ingredients before you start cooking',
        difficulty: 'beginner'
      },
      {
        id: 2,
        category: 'Temperature',
        title: 'Preheat Your Pan',
        content: 'Let your pan heat up for 2-3 minutes before adding oil',
        difficulty: 'beginner'
      },
      {
        id: 3,
        category: 'Seasoning',
        title: 'Season in Layers',
        content: 'Add salt and seasoning at different stages for better flavor',
        difficulty: 'intermediate'
      }
    ];

    res.json({ success: true, tips });
  });

  // Complete cooking session
  app.post('/api/cooking/complete', (req: Request, res: Response) => {
    const { sessionId, rating, notes } = req.body;
    
    res.json({
      success: true,
      message: 'Cooking session completed',
      points: 50,
      achievements: ['First Cook', 'Recipe Master']
    });
  });
}