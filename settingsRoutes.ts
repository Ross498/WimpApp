import express from 'express';
// CRITICAL FIX: Use shared storage singleton instead of creating new instance
import { sharedPgStorage } from './storage.js';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware';

const router = express.Router();
// CRITICAL FIX: Use shared storage singleton instead of creating new instance
const storage = sharedPgStorage;

// Update notification settings  
router.put('/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = req.body;
    const userId = 'test-user-id'; // Would get from auth
    
    // In a real app, save to user_settings table
    console.log('🔔 Notification settings updated for user:', userId, settings);
    
    // Mock successful update
    res.json({ 
      success: true, 
      message: 'Notification settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notification settings' 
    });
  }
});

// Update privacy settings
router.put('/privacy', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const settings = req.body;
    const userId = 'test-user-id'; // Would get from auth
    
    // In a real app, save to user_settings table
    console.log('🔒 Privacy settings updated for user:', userId, settings);
    
    // Mock successful update
    res.json({ 
      success: true, 
      message: 'Privacy settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update privacy settings' 
    });
  }
});

// Update accessibility settings
router.put('/settings/accessibility', async (req, res) => {
  try {
    const settings = req.body;
    const userId = 'test-user-id'; // Would get from auth
    
    // In a real app, save to user_settings table
    console.log('♿ Accessibility settings updated for user:', userId, settings);
    
    // Mock successful update
    res.json({ 
      success: true, 
      message: 'Accessibility settings updated successfully',
      settings 
    });
  } catch (error) {
    console.error('Error updating accessibility settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update accessibility settings' 
    });
  }
});

// Get all user settings
router.get('/settings', async (req, res) => {
  try {
    const userId = 'test-user-id'; // Would get from auth
    
    // Mock user settings - in real app would query database
    const settings = {
      notifications: {
        mealReminders: true,
        ingredientExpiry: true,
        podActivity: true,
        challengeUpdates: true,
        weeklyReports: true,
        premiumOffers: false,
        marketingEmails: false
      },
      privacy: {
        profileVisibility: 'friends',
        shareRecipes: true,
        allowDataAnalytics: true,
        shareUsageData: false
      },
      accessibility: {
        textSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        voiceInstructions: false,
        largeTouchTargets: false
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        measurementSystem: 'metric'
      }
    };
    
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user settings' 
    });
  }
});

// Reset settings to default
router.post('/settings/reset', async (req, res) => {
  try {
    const userId = 'test-user-id'; // Would get from auth
    
    console.log('🔄 Resetting settings to default for user:', userId);
    
    const defaultSettings = {
      notifications: {
        mealReminders: true,
        ingredientExpiry: true,
        podActivity: true,
        challengeUpdates: true,
        weeklyReports: true,
        premiumOffers: false,
        marketingEmails: false
      },
      privacy: {
        profileVisibility: 'friends',
        shareRecipes: true,
        allowDataAnalytics: true,
        shareUsageData: false
      },
      accessibility: {
        textSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        voiceInstructions: false,
        largeTouchTargets: false
      }
    };
    
    res.json({ 
      success: true, 
      message: 'Settings reset to default values',
      settings: defaultSettings 
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset settings' 
    });
  }
});

export default router;