import { Router, Request, Response } from "express";
import multer from "multer";
import { authenticateToken, AuthenticatedRequest } from "./authMiddleware";
import { 
  scanSouthAfricanReceipt, 
  calculateExpiryLoss, 
  markIngredientExpired,
  getSouthAfricanCostStats 
} from "./saReceiptScanner";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Scan South African grocery receipt
 * POST /api/sa-receipts/scan
 */
router.post('/scan', authenticateToken, upload.single('receiptImage'), async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Receipt image is required' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const userId = req.user.id.toString();

    const scanResult = await scanSouthAfricanReceipt(base64Image, userId);

    if (!scanResult.success) {
      return res.status(400).json({ 
        success: false, 
        error: scanResult.error || 'Failed to scan receipt' 
      });
    }

    res.json({
      success: true,
      message: `Successfully scanned receipt from ${scanResult.storeName}`,
      data: {
        scanId: scanResult.receiptId,
        receiptId: scanResult.receiptId,
        scanType: 'receipt',
        confidence: 0.95, // High confidence for successful receipt scans
        storeName: scanResult.storeName,
        storeLocation: scanResult.storeLocation,
        totalAmount: scanResult.totalAmount,
        receiptDate: scanResult.receiptDate,
        itemsFound: scanResult.items.length,
        items: scanResult.items,
        detectedItems: scanResult.items // Alias for CameraScanner compatibility
      }
    });

  } catch (error) {
    console.error('Error scanning receipt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while scanning receipt' 
    });
  }
});

/**
 * Get South African cost statistics for dashboard
 * GET /api/sa-receipts/cost-stats
 */
router.get('/cost-stats', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = req.user.id.toString();
    const stats = await getSouthAfricanCostStats(userId);

    res.json({
      success: true,
      data: {
        ...stats,
        currency: 'ZAR'
      }
    });

  } catch (error) {
    console.error('Error getting cost stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve cost statistics' 
    });
  }
});

/**
 * Get expiry loss details
 * GET /api/sa-receipts/expiry-loss
 */
router.get('/expiry-loss', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = req.user.id.toString();
    const expiryData = await calculateExpiryLoss(userId);

    res.json({
      success: true,
      data: {
        weeklyLoss: expiryData.weeklyLoss,
        monthlyLoss: expiryData.monthlyLoss,
        expiredItems: expiryData.expiredItems,
        currency: 'ZAR'
      }
    });

  } catch (error) {
    console.error('Error getting expiry loss:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve expiry loss data' 
    });
  }
});

/**
 * Mark ingredient as expired
 * POST /api/sa-receipts/mark-expired/:ingredientId
 */
router.post('/mark-expired/:ingredientId', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const ingredientId = parseInt(req.params.ingredientId);
    if (isNaN(ingredientId)) {
      return res.status(400).json({ success: false, error: 'Invalid ingredient ID' });
    }

    await markIngredientExpired(ingredientId);

    res.json({
      success: true,
      message: 'Ingredient marked as expired and ZAR loss recorded'
    });

  } catch (error) {
    console.error('Error marking ingredient expired:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark ingredient as expired' 
    });
  }
});

/**
 * Get receipt scan history
 * GET /api/sa-receipts/history
 */
router.get('/history', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // This would query the receiptScans table for user's history
    // Implementation depends on specific requirements
    
    res.json({
      success: true,
      data: {
        receipts: [],
        message: 'Receipt history feature coming soon'
      }
    });

  } catch (error) {
    console.error('Error getting receipt history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve receipt history' 
    });
  }
});

/**
 * Get store price comparison data
 * GET /api/sa-receipts/store-comparison
 */
router.get('/store-comparison', authenticateToken, async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // This would analyze price differences across SA stores
    // Implementation would require aggregating price data by store
    
    res.json({
      success: true,
      data: {
        stores: {
          'Woolworths': { avgPricePerItem: 0, totalSpent: 0, itemCount: 0 },
          'Pick n Pay': { avgPricePerItem: 0, totalSpent: 0, itemCount: 0 },
          'Checkers': { avgPricePerItem: 0, totalSpent: 0, itemCount: 0 },
          'Shoprite': { avgPricePerItem: 0, totalSpent: 0, itemCount: 0 }
        },
        message: 'Store comparison feature coming soon'
      }
    });

  } catch (error) {
    console.error('Error getting store comparison:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve store comparison data' 
    });
  }
});

export default router;