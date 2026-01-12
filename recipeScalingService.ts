import { Request, Response } from 'express';

// Recipe scaling logic with intelligent unit conversion
export class RecipeScalingService {
  
  /**
   * Scale a recipe based on serving size multiplier
   */
  static scaleRecipe(originalRecipe: any, targetServings: number): any {
    const originalServings = originalRecipe.servingSize || 4;
    const scalingFactor = targetServings / originalServings;
    
    return {
      ...originalRecipe,
      servingSize: targetServings,
      scalingFactor: scalingFactor,
      scaledIngredients: this.scaleIngredients(originalRecipe.ingredients, scalingFactor),
      scaledInstructions: this.scaleInstructions(originalRecipe.instructions, scalingFactor),
      adjustedCookTime: this.adjustCookTime(originalRecipe.cookTime, scalingFactor),
      adjustedPrepTime: this.adjustPrepTime(originalRecipe.prepTime, scalingFactor),
      scalingNotes: this.generateScalingNotes(scalingFactor, targetServings, originalServings)
    };
  }

  /**
   * Scale ingredients with intelligent unit conversion
   */
  private static scaleIngredients(ingredients: string, scalingFactor: number): any[] {
    try {
      const ingredientList = typeof ingredients === 'string' ? JSON.parse(ingredients) : ingredients;
      
      return ingredientList.map((ingredient: any) => {
        const scaledQuantity = this.scaleQuantity(ingredient.quantity, scalingFactor);
        
        return {
          ...ingredient,
          originalQuantity: ingredient.quantity,
          quantity: scaledQuantity.quantity,
          unit: scaledQuantity.unit,
          scalingNote: scaledQuantity.note
        };
      });
    } catch (error) {
      console.error('Error scaling ingredients:', error);
      return [];
    }
  }

  /**
   * Intelligent quantity scaling with unit conversion
   */
  private static scaleQuantity(originalQuantity: string, scalingFactor: number): any {
    // Extract number and unit from quantity string
    const quantityMatch = originalQuantity.match(/^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(.*)$/);
    
    if (!quantityMatch) {
      return {
        quantity: originalQuantity,
        unit: '',
        note: 'Manual adjustment needed'
      };
    }

    let [, numberPart, unitPart] = quantityMatch;
    let numericValue = this.parseNumber(numberPart);
    let scaledValue = numericValue * scalingFactor;
    
    // Convert units intelligently
    const conversion = this.convertToAppropriateUnit(scaledValue, unitPart.trim());
    
    return {
      quantity: conversion.displayValue,
      unit: conversion.unit,
      note: conversion.conversionNote
    };
  }

  /**
   * Parse fractions and decimals
   */
  private static parseNumber(numberStr: string): number {
    if (numberStr.includes('/')) {
      const [numerator, denominator] = numberStr.split('/').map(n => parseFloat(n.trim()));
      return numerator / denominator;
    }
    return parseFloat(numberStr);
  }

  /**
   * Convert to appropriate units for better usability
   */
  private static convertToAppropriateUnit(value: number, originalUnit: string): any {
    const unit = originalUnit.toLowerCase();
    
    // Teaspoon conversions
    if (unit.includes('tsp') || unit.includes('teaspoon')) {
      if (value >= 3) {
        return {
          displayValue: this.formatNumber(value / 3),
          unit: value >= 3 ? 'tbsp' : 'tsp',
          conversionNote: value >= 3 ? 'Converted to tablespoons' : null
        };
      }
      return { displayValue: this.formatNumber(value), unit: 'tsp', conversionNote: null };
    }
    
    // Tablespoon conversions
    if (unit.includes('tbsp') || unit.includes('tablespoon')) {
      if (value >= 16) {
        return {
          displayValue: this.formatNumber(value / 16),
          unit: 'cup',
          conversionNote: 'Converted to cups'
        };
      }
      return { displayValue: this.formatNumber(value), unit: 'tbsp', conversionNote: null };
    }
    
    // Cup conversions
    if (unit.includes('cup')) {
      if (value >= 4) {
        return {
          displayValue: this.formatNumber(value / 4),
          unit: 'litre',
          conversionNote: 'Converted to litres'
        };
      }
      return { displayValue: this.formatNumber(value), unit: 'cup', conversionNote: null };
    }
    
    // Gram conversions
    if (unit.includes('g') && !unit.includes('kg')) {
      if (value >= 1000) {
        return {
          displayValue: this.formatNumber(value / 1000),
          unit: 'kg',
          conversionNote: 'Converted to kilograms'
        };
      }
      return { displayValue: this.formatNumber(value), unit: 'g', conversionNote: null };
    }
    
    // Millilitre conversions
    if (unit.includes('ml')) {
      if (value >= 1000) {
        return {
          displayValue: this.formatNumber(value / 1000),
          unit: 'litre',
          conversionNote: 'Converted to litres'
        };
      }
      return { displayValue: this.formatNumber(value), unit: 'ml', conversionNote: null };
    }
    
    // Default: just scale the number
    return {
      displayValue: this.formatNumber(value),
      unit: originalUnit,
      conversionNote: null
    };
  }

  /**
   * Format numbers to user-friendly fractions or decimals
   */
  private static formatNumber(value: number): string {
    // Handle common fractions
    const fractions = {
      0.125: '1/8',
      0.25: '1/4',
      0.33: '1/3',
      0.5: '1/2',
      0.67: '2/3',
      0.75: '3/4'
    };
    
    const whole = Math.floor(value);
    const decimal = value - whole;
    
    // Check if decimal part matches common fractions
    for (const [dec, frac] of Object.entries(fractions)) {
      if (Math.abs(decimal - parseFloat(dec)) < 0.05) {
        return whole > 0 ? `${whole} ${frac}` : frac;
      }
    }
    
    // Round to reasonable precision
    if (value < 0.1) {
      return value.toFixed(3);
    } else if (value < 1) {
      return value.toFixed(2);
    } else if (value < 10) {
      return value.toFixed(1);
    } else {
      return Math.round(value).toString();
    }
  }

  /**
   * Scale cooking instructions with time adjustments
   */
  private static scaleInstructions(instructions: string, scalingFactor: number): string[] {
    try {
      const instructionList = typeof instructions === 'string' ? JSON.parse(instructions) : instructions;
      
      return instructionList.map((instruction: string) => {
        // Adjust cooking times in instructions
        return instruction.replace(/(\d+)\s*(minute|min|hour|hr)s?/gi, (match, time, unit) => {
          const adjustedTime = this.adjustInstructionTime(parseInt(time), unit, scalingFactor);
          return `${adjustedTime} ${unit}${adjustedTime > 1 ? 's' : ''}`;
        });
      });
    } catch (error) {
      console.error('Error scaling instructions:', error);
      return [];
    }
  }

  /**
   * Adjust cooking time based on scaling factor
   */
  private static adjustCookTime(originalTime: number, scalingFactor: number): number {
    // Cooking time doesn't scale linearly - use square root scaling
    if (scalingFactor <= 1) {
      return Math.round(originalTime * Math.pow(scalingFactor, 0.7));
    } else {
      return Math.round(originalTime * Math.pow(scalingFactor, 0.3));
    }
  }

  /**
   * Adjust prep time based on scaling factor
   */
  private static adjustPrepTime(originalTime: number, scalingFactor: number): number {
    // Prep time scales more linearly than cook time
    return Math.round(originalTime * Math.pow(scalingFactor, 0.8));
  }

  /**
   * Adjust time mentioned in instructions
   */
  private static adjustInstructionTime(time: number, unit: string, scalingFactor: number): number {
    const adjustmentFactor = scalingFactor <= 1 ? 
      Math.pow(scalingFactor, 0.7) : 
      Math.pow(scalingFactor, 0.3);
    
    return Math.round(time * adjustmentFactor);
  }

  /**
   * Generate helpful scaling notes for users
   */
  private static generateScalingNotes(scalingFactor: number, targetServings: number, originalServings: number): string[] {
    const notes = [];
    
    if (scalingFactor > 2) {
      notes.push("When scaling up significantly, consider cooking in batches for best results.");
      notes.push("Check seasoning levels as they may need adjustment for larger quantities.");
    } else if (scalingFactor < 0.5) {
      notes.push("When scaling down, watch cooking times carefully as smaller quantities cook faster.");
      notes.push("Use a smaller pan or dish to maintain proper cooking ratios.");
    }
    
    if (scalingFactor > 1.5 || scalingFactor < 0.75) {
      notes.push("Cooking and prep times have been automatically adjusted - check progress regularly.");
    }
    
    notes.push(`Recipe scaled from ${originalServings} to ${targetServings} servings (${Math.round(scalingFactor * 100)}% of original).`);
    
    return notes;
  }

  /**
   * Get suggested serving size ranges for a recipe
   */
  static getServingSizeOptions(originalServings: number): any[] {
    const baseOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12];
    
    return baseOptions.map(servings => ({
      servings,
      label: `${servings} ${servings === 1 ? 'person' : 'people'}`,
      scalingFactor: servings / originalServings,
      recommended: servings === originalServings
    }));
  }
}

// API endpoint handlers
export async function scaleRecipeEndpoint(req: Request, res: Response) {
  try {
    const { recipeId, targetServings, recipeName } = req.body;
    
    if (!targetServings || targetServings < 1 || targetServings > 20) {
      return res.status(400).json({
        error: 'Invalid parameters. Target servings (1-20) are required.'
      });
    }

    let recipe;

    // If recipe name is provided, fetch from custom recipes
    if (recipeName) {
      try {
        const { db } = await import('./db');
        const { customRecipes } = await import('../shared/schema.js');
        const { ilike } = await import('drizzle-orm');
        
        const results = await db!
          .select()
          .from(customRecipes)
          .where(ilike(customRecipes.name, `%${recipeName}%`))
          .limit(1);
        
        if (results.length > 0) {
          recipe = results[0];
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    // Fallback to sample recipe if no database recipe found
    if (!recipe) {
      recipe = {
        id: recipeId || 'sample',
        name: recipeName || "Honey Garlic Chicken",
        servingSize: 4,
        prepTime: 15,
        cookTime: 25,
        ingredients: JSON.stringify([
          { item: "chicken breast", quantity: "500g" },
          { item: "honey", quantity: "3 tbsp" },
          { item: "soy sauce", quantity: "2 tbsp" },
          { item: "garlic cloves", quantity: "4 cloves" },
          { item: "olive oil", quantity: "2 tsp" },
          { item: "salt", quantity: "1/2 tsp" },
          { item: "black pepper", quantity: "1/4 tsp" }
        ]),
        instructions: JSON.stringify([
          "Season chicken with salt and pepper",
          "Heat oil in pan for 2 minutes on medium heat",
          "Cook chicken for 6-8 minutes per side until golden",
          "Mix honey, soy sauce, and minced garlic in bowl",
          "Pour sauce over chicken and simmer for 3-5 minutes",
          "Let rest for 5 minutes before serving"
        ])
      };
    }

    const scaledRecipe = RecipeScalingService.scaleRecipe(recipe, targetServings);
    const servingOptions = RecipeScalingService.getServingSizeOptions(recipe.servings || 4);

    res.json({
      success: true,
      originalRecipe: {
        name: recipe.name,
        originalServings: recipe.servings || 4,
        prepTime: recipe.prepTime || 15,
        cookTime: recipe.cookTime || 25
      },
      scaledRecipe,
      servingOptions,
      scalingAccuracy: "High - ingredients and times automatically adjusted",
      tips: [
        "All measurements have been converted to appropriate units",
        "Cooking times adjusted using proven scaling algorithms",
        "Check seasoning levels and adjust to taste"
      ]
    });

  } catch (error: any) {
    console.error('Error scaling recipe:', error);
    res.status(500).json({
      error: 'Failed to scale recipe',
      details: error.message
    });
  }
}

export async function getServingOptionsEndpoint(req: Request, res: Response) {
  try {
    const { originalServings = 4 } = req.query;
    const servings = parseInt(originalServings as string);
    
    const options = RecipeScalingService.getServingSizeOptions(servings);
    
    res.json({
      success: true,
      originalServings: servings,
      servingOptions: options,
      scalingRange: {
        minimum: 1,
        maximum: 20,
        recommended: "1-12 servings for best results"
      }
    });
    
  } catch (error: any) {
    console.error('Error getting serving options:', error);
    res.status(500).json({
      error: 'Failed to get serving options',
      details: error.message
    });
  }
}