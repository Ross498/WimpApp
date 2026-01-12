import express from 'express';
import { Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware';

const router = express.Router();

// Submit feedback
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rating, category, message, improvementSuggestions, features } = req.body;
    
    // Mock feedback submission - in production would save to database
    console.log('Feedback submission:', {
      rating,
      category,
      message,
      improvementSuggestions,
      features,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: "Thank you for your feedback! We appreciate your input."
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback'
    });
  }
});

// Get feedback categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      'general',
      'ui_design',
      'functionality',
      'performance',
      'bug_report',
      'feature_request'
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching feedback categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

export default router;