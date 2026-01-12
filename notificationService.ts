/**
 * Notification Service for Expiry Date Alerts and Low Stock Warnings
 * 
 * LIMITATIONS:
 * - Notifications only work when the app is open or active in the browser
 * - setInterval-based checks stop when browser tab is inactive
 * - iOS Safari does not support Web Notifications API
 * - Android Chrome supports notifications but only when app is active
 * 
 * FOR TRUE BACKGROUND NOTIFICATIONS, IMPLEMENT:
 * 1. Service Worker with Push API support
 * 2. Push notification service (Firebase Cloud Messaging or OneSignal)
 * 3. Backend infrastructure to send push messages
 * 4. Push subscription management and storage
 * 5. Periodic Background Sync API (where supported)
 * 
 * RECOMMENDED ARCHITECTURE:
 * - Register service worker in public/sw.js
 * - Subscribe to push notifications via Push API
 * - Store push subscriptions in database
 * - Create backend cron job to check expiring items and send push notifications
 * - Service worker listens for push events and displays notifications
 */

interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface ExpiryNotification {
  id: string;
  ingredientName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  message: string;
}

class NotificationService {
  private hasRequestedPermission = false;
  private permissionState: NotificationPermissionState = {
    granted: false,
    denied: false,
    default: true
  };

  constructor() {
    this.checkPermissionState();
  }

  /**
   * Check current browser notification permission state
   */
  private checkPermissionState() {
    if (!('Notification' in window)) {
      console.warn('🔔 Browser does not support notifications');
      return;
    }

    const permission = Notification.permission;
    this.permissionState = {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default'
    };

    console.log('🔔 Notification permission state:', permission);
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('🔔 Notifications not supported in this browser');
      return false;
    }

    if (this.permissionState.granted) {
      return true;
    }

    if (this.permissionState.denied) {
      console.warn('🔔 Notifications previously denied by user');
      return false;
    }

    this.hasRequestedPermission = true;

    try {
      const permission = await Notification.requestPermission();
      this.checkPermissionState();
      
      console.log('🔔 Permission request result:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('🔔 Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if we should show permission request prompt
   */
  shouldShowPermissionPrompt(): boolean {
    return (
      'Notification' in window &&
      this.permissionState.default &&
      !this.hasRequestedPermission
    );
  }

  /**
   * Show notification for expiring ingredient
   */
  async showExpiryNotification(ingredient: {
    name: string;
    expiryDate: string;
    quantity?: number;
  }): Promise<void> {
    if (!this.permissionState.granted) {
      console.warn('🔔 Cannot show notification - permission not granted');
      return;
    }

    const expiryDate = new Date(ingredient.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let message: string;
    let icon = '⚠️';

    if (daysUntilExpiry <= 0) {
      message = `${ingredient.name} has expired! Consider removing it from your pantry.`;
      icon = '🗑️';
    } else if (daysUntilExpiry === 1) {
      message = `${ingredient.name} expires tomorrow! Use it soon or add to shopping list.`;
      icon = '⏰';
    } else if (daysUntilExpiry <= 3) {
      message = `${ingredient.name} expires in ${daysUntilExpiry} days. Plan to use it soon!`;
      icon = '⚠️';
    } else {
      return; // Don't notify for ingredients expiring more than 3 days away
    }

    try {
      const notification = new Notification(`${icon} Ingredient Expiry Alert`, {
        body: message,
        icon: '/app-icon-pan-egg.png',
        tag: `expiry-${ingredient.name}`, // Prevents duplicate notifications
        requireInteraction: daysUntilExpiry <= 0, // Keep expired notifications visible
      });

      // Auto-close after 5 seconds for non-expired items
      if (daysUntilExpiry > 0) {
        setTimeout(() => notification.close(), 5000);
      }

      console.log('🔔 Expiry notification shown:', ingredient.name, daysUntilExpiry, 'days');
    } catch (error) {
      console.error('🔔 Error showing expiry notification:', error);
    }
  }

  /**
   * Show notification for low stock ingredient
   */
  async showLowStockNotification(ingredient: {
    name: string;
    quantity: number;
    unit?: string;
  }): Promise<void> {
    if (!this.permissionState.granted) {
      console.warn('🔔 Cannot show notification - permission not granted');
      return;
    }

    const quantityText = ingredient.unit 
      ? `${ingredient.quantity} ${ingredient.unit}` 
      : `${ingredient.quantity}`;

    const message = `${ingredient.name} is running low (${quantityText} remaining). Add to shopping list?`;

    try {
      const notification = new Notification('📦 Low Stock Alert', {
        body: message,
        icon: '/app-icon-pan-egg.png',
        tag: `low-stock-${ingredient.name}`,
      });

      setTimeout(() => notification.close(), 5000);
      console.log('🔔 Low stock notification shown:', ingredient.name);
    } catch (error) {
      console.error('🔔 Error showing low stock notification:', error);
    }
  }

  /**
   * Fetch expiring ingredients from backend
   */
  async fetchExpiringIngredients(days: number = 3): Promise<any[]> {
    try {
      console.log('🔔 Fetching expiring ingredients with httpOnly cookies');

      const response = await fetch(`/api/notifications/expiring-ingredients?days=${days}`, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Use httpOnly cookies for authentication
      });

      if (!response.ok) {
        console.warn('🔔 Failed to fetch expiring ingredients:', response.status);
        return [];
      }

      const expiringIngredients = await response.json();
      console.log('🔔 Fetched expiring ingredients:', expiringIngredients.length);
      return expiringIngredients;
    } catch (error) {
      console.error('🔔 Error fetching expiring ingredients:', error);
      return [];
    }
  }

  /**
   * Check for expiring ingredients and show notifications
   */
  async checkAndNotifyExpiring(): Promise<void> {
    if (!this.permissionState.granted) {
      console.log('🔔 Skipping expiry check - notifications not enabled');
      return;
    }

    const expiringIngredients = await this.fetchExpiringIngredients(3);
    
    for (const ingredient of expiringIngredients) {
      await this.showExpiryNotification(ingredient);
    }
  }

  /**
   * Initialize periodic expiry checks (daily)
   */
  startPeriodicChecks(): void {
    // Check immediately
    this.checkAndNotifyExpiring();

    // Check every 24 hours
    const dailyCheck = setInterval(() => {
      this.checkAndNotifyExpiring();
    }, 24 * 60 * 60 * 1000);

    console.log('🔔 Started daily expiry checks');

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(dailyCheck);
    });
  }

  /**
   * Get permission state for UI display
   */
  getPermissionState(): NotificationPermissionState {
    return { ...this.permissionState };
  }
}

// Create singleton instance
export const notificationService = new NotificationService();
export default notificationService;