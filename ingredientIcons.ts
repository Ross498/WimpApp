// UNIFIED INGREDIENT ICON SYSTEM - SINGLE SOURCE OF TRUTH
// Import unified icon system - this replaces all other icon functions
import { getUnifiedIngredientIcon } from './unifiedIconSystem';

/**
 * @deprecated Use getUnifiedIngredientIcon from unifiedIconSystem.ts instead
 */
export function getIngredientIcon(name: string): string {
  console.warn('getIngredientIcon is deprecated. Use getUnifiedIngredientIcon instead.');
  return getUnifiedIngredientIcon(name);
}

/**
 * @deprecated Use getUnifiedIngredientIcon for consistent icon system
 */
export function getIngredientEmojiFromName(name: string): string {
  // Basic emoji mapping
  const emojiMap: { [key: string]: string } = {
    'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'tomato': '🍅',
    'carrot': '🥕', 'onion': '🧅', 'lettuce': '🥬', 'cheese': '🧀',
    'milk': '🥛', 'bread': '🍞', 'chicken': '🍗', 'beef': '🥩'
  };
  
  const lowerName = name.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerName.includes(key)) return emoji;
  }
  return '🍽'; // Default icon
}

export const getIngredientEmoji = getIngredientEmojiFromName;

// Re-export unified system for convenience
export { getUnifiedIngredientIcon } from './unifiedIconSystem';