/**
 * Expiry Tracker Utility for Ingredient Expiration Management
 */

export interface IngredientExpiryInfo {
  id: number;
  name: string;
  expiryDate: string;
  daysUntilExpiry: number;
  expiryStatus: 'expired' | 'expiring-today' | 'expiring-soon' | 'fresh';
  urgencyLevel: 'critical' | 'warning' | 'info' | 'normal';
}

export interface ExpiryCategory {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  icon: string;
  ingredients: IngredientExpiryInfo[];
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expiryDate: string): number {
  if (!expiryDate) return Infinity;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  
  // Reset time to start of day for accurate day calculation
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Determine expiry status based on days until expiry
 */
export function getExpiryStatus(daysUntilExpiry: number): IngredientExpiryInfo['expiryStatus'] {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry === 0) return 'expiring-today';
  if (daysUntilExpiry <= 5) return 'expiring-soon';
  return 'fresh';
}

/**
 * Determine urgency level for notifications and UI
 */
export function getUrgencyLevel(expiryStatus: IngredientExpiryInfo['expiryStatus']): IngredientExpiryInfo['urgencyLevel'] {
  switch (expiryStatus) {
    case 'expired':
      return 'critical';
    case 'expiring-today':
      return 'critical';
    case 'expiring-soon':
      return 'warning';
    default:
      return 'normal';
  }
}

/**
 * Get expiry tag display properties
 */
export function getExpiryTagProps(expiryStatus: IngredientExpiryInfo['expiryStatus']) {
  switch (expiryStatus) {
    case 'expired':
      return {
        text: 'Expired',
        className: 'bg-red-600 text-white',
        icon: '🗑️'
      };
    case 'expiring-today':
      return {
        text: 'Expires Today',
        className: 'bg-red-500 text-white animate-pulse',
        icon: '⏰'
      };
    case 'expiring-soon':
      return {
        text: 'Expiring Soon',
        className: 'bg-orange-500 text-white',
        icon: '⚠️'
      };
    default:
      return null;
  }
}

/**
 * Analyze ingredient list and categorize by expiry status
 */
export function analyzeIngredientExpiry(ingredients: any[]): {
  expiryInfo: IngredientExpiryInfo[];
  categories: ExpiryCategory[];
  summary: {
    expired: number;
    expiringToday: number;
    expiringSoon: number;
    fresh: number;
  };
} {
  const expiryInfo: IngredientExpiryInfo[] = [];
  
  // Process each ingredient
  for (const ingredient of ingredients) {
    if (!ingredient.expiryDate) continue;
    
    const daysUntilExpiry = calculateDaysUntilExpiry(ingredient.expiryDate);
    const expiryStatus = getExpiryStatus(daysUntilExpiry);
    const urgencyLevel = getUrgencyLevel(expiryStatus);
    
    expiryInfo.push({
      id: ingredient.id,
      name: ingredient.name,
      expiryDate: ingredient.expiryDate,
      daysUntilExpiry,
      expiryStatus,
      urgencyLevel
    });
  }
  
  // Sort by urgency (most urgent first)
  expiryInfo.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, info: 2, normal: 3 };
    if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
      return urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel];
    }
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });
  
  // Create categories
  const expired = expiryInfo.filter(item => item.expiryStatus === 'expired');
  const expiringToday = expiryInfo.filter(item => item.expiryStatus === 'expiring-today');
  const expiringSoon = expiryInfo.filter(item => item.expiryStatus === 'expiring-soon');
  const fresh = expiryInfo.filter(item => item.expiryStatus === 'fresh');
  
  const categories: ExpiryCategory[] = [
    {
      id: 'expired',
      name: 'Expired',
      color: 'text-red-700',
      backgroundColor: 'bg-red-100',
      icon: '🗑️',
      ingredients: expired
    },
    {
      id: 'expiring-today',
      name: 'Expiring Today',
      color: 'text-red-600',
      backgroundColor: 'bg-red-50',
      icon: '⏰',
      ingredients: expiringToday
    },
    {
      id: 'expiring-soon',
      name: 'Expiring Soon',
      color: 'text-orange-600',
      backgroundColor: 'bg-orange-50',
      icon: '⚠️',
      ingredients: expiringSoon
    }
  ].filter(category => category.ingredients.length > 0);
  
  return {
    expiryInfo,
    categories,
    summary: {
      expired: expired.length,
      expiringToday: expiringToday.length,
      expiringSoon: expiringSoon.length,
      fresh: fresh.length
    }
  };
}

/**
 * Check if ingredient needs expiry attention
 */
export function needsExpiryAttention(ingredient: any): boolean {
  if (!ingredient.expiryDate) return false;
  
  const daysUntilExpiry = calculateDaysUntilExpiry(ingredient.expiryDate);
  return daysUntilExpiry <= 5; // Alert for items expiring within 5 days
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiryDate: string): string {
  if (!expiryDate) return '';
  
  const date = new Date(expiryDate);
  const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
  
  if (daysUntilExpiry < 0) {
    const daysExpired = Math.abs(daysUntilExpiry);
    return `Expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago`;
  }
  
  if (daysUntilExpiry === 0) {
    return 'Expires today';
  }
  
  if (daysUntilExpiry === 1) {
    return 'Expires tomorrow';
  }
  
  if (daysUntilExpiry <= 7) {
    return `Expires in ${daysUntilExpiry} days`;
  }
  
  return date.toLocaleDateString();
}

/**
 * Get ingredients that should trigger notifications
 */
export function getNotificationTargets(ingredients: any[]): IngredientExpiryInfo[] {
  const { expiryInfo } = analyzeIngredientExpiry(ingredients);
  
  return expiryInfo.filter(item => 
    item.urgencyLevel === 'critical' || 
    (item.urgencyLevel === 'warning' && item.daysUntilExpiry <= 2)
  );
}