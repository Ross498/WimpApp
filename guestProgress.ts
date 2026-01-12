/**
 * Guest Progress Tracking Utility
 * Handles local progress tracking for unauthenticated users
 */

const GUEST_PROGRESS_KEY = 'guest_meal_progress';

export interface GuestProgress {
  completedMeals: number;
  mealsRequired: number;
  unlocked: boolean;
  lastUpdated: string;
}

export function getGuestProgress(): GuestProgress {
  try {
    const stored = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to parse guest progress from localStorage:', error);
  }
  
  // Default guest progress
  return {
    completedMeals: 0,
    mealsRequired: 3,
    unlocked: false,
    lastUpdated: new Date().toISOString()
  };
}

export function incrementGuestProgress(): GuestProgress {
  const current = getGuestProgress();
  const updated = {
    ...current,
    completedMeals: Math.min(current.completedMeals + 1, current.mealsRequired),
    lastUpdated: new Date().toISOString()
  };
  
  updated.unlocked = updated.completedMeals >= updated.mealsRequired;
  
  try {
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(updated));
    console.log('🔓 GUEST PROGRESS: Updated local progress:', updated);
  } catch (error) {
    console.warn('Failed to save guest progress to localStorage:', error);
  }
  
  return updated;
}

export function resetGuestProgress(): void {
  try {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
    console.log('🔓 GUEST PROGRESS: Reset local progress');
  } catch (error) {
    console.warn('Failed to reset guest progress:', error);
  }
}