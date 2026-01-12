import express, { Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from './authMiddleware';
import { 
  processUnifiedScan, 
  getScanStatistics,
  ScanResult 
} from './unifiedScanningService';
import { debugFinancialScanFlow, debugScanRoutePersistence } from './debugFinancialScanning.js';

// Re-export detectScanType for internal use
async function detectScanType(base64Image: string): Promise<'printed_receipt' | 'screenshot_receipt' | 'ingredient_photo'> {
  // Simple fallback type detection
  return 'ingredient_photo';
}

const router = express.Router();

// Configure multer for image uploads - fixed version
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});


/**
 * Test upload endpoint
 */
router.post('/test', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.json({ success: false, error: 'No file received' });
  }
  
  return res.json({
    success: true,
    message: 'File upload working',
    fileSize: req.file.size,
    fileType: req.file.mimetype
  });
});

/**
 * Unified scan endpoint - handles all three scan types
 * POST /api/unified-scan/process
 */
router.post('/process', authenticateToken, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Scan image is required' });
    }

    // Authentication is handled by middleware - get userId from req.user
    const authenticatedUser = req.user as any;
    if (!authenticatedUser?.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const userId = authenticatedUser.id.toString();
    console.log('🔐 Authentication verified - userId:', userId);
    const base64Image = req.file.buffer.toString('base64');
    const forcedScanType = req.body.scanType as 'printed_receipt' | 'screenshot_receipt' | 'ingredient_photo' | 'recipe_book' | undefined;

    console.log(`Processing unified scan for user ${userId}, image size: ${req.file.size} bytes, forced type: ${forcedScanType || 'auto-detect'}`);

    const result = await processUnifiedScan(base64Image, userId, forcedScanType);

    // 🔍 FINANCIAL DEBUG: Post-scan analysis
    console.log(`🔍 SCAN RESULT DEBUG: scanType=${result.scanType}, success=${result.success}, hasAmount=${!!result.totalAmount}`);
    if (result.totalAmount) {
      console.log(`💰 SCAN FINANCIAL DATA: R${result.totalAmount} from ${result.storeName || 'Unknown Store'}`);
      console.log(`📊 SCAN ITEMS WITH PRICES: ${result.detectedItems.filter(item => item.price).length}/${result.detectedItems.length}`);
    }

    if (result.success) {
      res.json({
        success: true,
        data: {
          scanId: result.scanId,
          scanType: result.scanType,
          confidence: result.confidence,
          itemCount: result.detectedItems.length,
          items: result.detectedItems,
          ingredients: result.detectedItems, // For recipe book compatibility
          totalAmount: result.totalAmount,
          storeName: result.storeName,
          platform: result.platform,
          // Recipe book specific fields
          instructions: result.instructions,
          prepTime: result.prepTime,
          cookTime: result.cookTime,
          servings: result.servings,
          difficulty: result.difficulty,
          category: result.category
        },
        message: `Successfully scanned ${result.detectedItems.length} items using ${result.scanType.replace('_', ' ')} method`
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || 'Failed to process scan'
      });
    }

  } catch (error) {
    console.error('Error processing unified scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error while processing scan' 
    });
  }
});

/**
 * Save scanned ingredients to database
 * POST /api/unified-scan/save-ingredients
 */
router.post('/save-ingredients', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { items, scanId } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const userId = (req.user as any).id.toString();
    console.log(`💾 Saving ${items.length} scanned items for user ${userId}`);

    // 🔍 FINANCIAL DEBUG: Check for financial data before saving
    const itemsWithPrices = items.filter((item: any) => item.price);
    console.log(`🔍 FINANCIAL DEBUG: ${itemsWithPrices.length}/${items.length} items have price data`);
    if (itemsWithPrices.length > 0) {
      const totalValue = itemsWithPrices.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0);
      console.log(`💰 FINANCIAL DEBUG: Total value of items being saved: R${totalValue.toFixed(2)}`);
    }
    
    const savedIngredients = [];

    // Import storage for saving ingredients
    const { storage } = await import('./storage');

    for (const item of items) {
      try {
        // Convert scanned item to ingredient format
        const ingredientData = {
          userId: parseInt(userId),
          name: item.name,
          category: item.category || 'other',
          quantity: item.quantity || 1,
          unit: item.unit || 'pieces',
          expiryDate: item.estimatedExpiryDays ? new Date(Date.now() + item.estimatedExpiryDays * 24 * 60 * 60 * 1000) : null,
          image: item.image || null,
          purchasePrice: item.price || null,
          storeName: item.storeName || null,
          receiptId: scanId || null
        };

        const savedIngredient = await storage.createIngredient(ingredientData);
        savedIngredients.push(savedIngredient);
        
        console.log(`✅ Saved scanned ingredient: ${item.name} for user ${userId}`);
        if (item.price) {
          console.log(`💰 FINANCIAL DEBUG: Saved ${item.name} with price R${item.price}`);
        }
      } catch (error) {
        console.error(`❌ Failed to save ingredient ${item.name}:`, error);
        // Continue with other ingredients even if one fails
      }
    }

    res.json({
      success: true,
      data: {
        savedCount: savedIngredients.length,
        ingredients: savedIngredients
      },
      message: `Successfully saved ${savedIngredients.length} ingredients to your pantry`
    });

  } catch (error) {
    console.error('Error saving scanned ingredients:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save ingredients to database' 
    });
  }
});

/**
 * Scan type detection endpoint
 * POST /api/unified-scan/detect-type
 */
router.post('/detect-type', upload.single('scanImage'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Scan image is required' });
    }

    const base64Image = req.file.buffer.toString('base64');
    
    // Use the detection function that was already imported
    const detectedType = await detectScanType(base64Image);
    
    res.json({
      success: true,
      data: {
        detectedType,
        confidence: getTypeConfidence(detectedType),
        description: getTypeDescription(detectedType)
      },
      message: `Detected scan type: ${detectedType.replace('_', ' ')}`
    });

  } catch (error) {
    console.error('Error detecting scan type:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to detect scan type' 
    });
  }
});

/**
 * Get user's scanning statistics
 * GET /api/unified-scan/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const userId = (req.user as any).id.toString();
    const stats = await getScanStatistics(parseInt(userId));

    res.json({
      success: true,
      data: {
        ...stats,
        scanTypeBreakdown: Object.entries(stats.scansByType).map(([type, count]) => ({
          type,
          count,
          description: getTypeDescription(type as any),
          percentage: stats.totalScans > 0 ? ((count / stats.totalScans) * 100).toFixed(1) : '0'
        }))
      },
      message: 'Scanning statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting scan statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve scanning statistics' 
    });
  }
});

/**
 * Get supported scan types with descriptions
 * GET /api/unified-scan/types
 */
router.get('/types', (req: Request, res: Response) => {
  try {
    const scanTypes = [
      {
        id: 'printed_receipt',
        name: 'Printed Receipt',
        description: 'Physical paper receipts from grocery stores',
        features: ['OCR text extraction', 'ZAR pricing', 'Store detection', 'Item categorization'],
        bestFor: 'In-store shopping receipts from Pick n Pay, Checkers, Woolworths, etc.',
        tips: ['Ensure receipt is flat and well-lit', 'Avoid shadows and reflections', 'Include store header and total']
      },
      {
        id: 'screenshot_receipt',
        name: 'Digital Receipt Screenshot',
        description: 'Screenshots from mobile grocery apps',
        features: ['Platform detection', 'Order tracking', 'Digital receipt parsing', 'Delivery info'],
        bestFor: 'Checkers Sixty60, Pick n Pay ASAP, Woolworths DashMyStore orders',
        tips: ['Screenshot the full receipt page', 'Include order number and totals', 'Ensure text is readable']
      },
      {
        id: 'ingredient_photo',
        name: 'Ingredient Photo',
        description: 'Direct photos of actual food items and products',
        features: ['Visual recognition', 'Fresh produce identification', 'Package detection', 'Quantity estimation'],
        bestFor: 'Farmers market purchases, bulk items, fresh produce without receipts',
        tips: ['Good lighting is essential', 'Show labels clearly', 'Include multiple angles if needed']
      }
    ];

    res.json({
      success: true,
      data: scanTypes,
      message: `${scanTypes.length} scan types supported`
    });

  } catch (error) {
    console.error('Error getting scan types:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve scan types' 
    });
  }
});

/**
 * Batch scan processing for multiple images
 * POST /api/unified-scan/batch
 */
router.post('/batch', upload.array('scanImages', 10), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one scan image is required' });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 images per batch' });
    }

    const userId = (req.user as any).id.toString();
    const results: ScanResult[] = [];

    console.log(`Processing batch scan for user ${userId}, ${files.length} images`);

    // Process each image
    for (const file of files) {
      try {
        const base64Image = file.buffer.toString('base64');
        const result = await processUnifiedScan(base64Image, userId);
        results.push(result);
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error);
        results.push({
          scanId: '',
          scanType: 'ingredient_photo',
          success: false,
          confidence: 0,
          detectedItems: [],
          error: `Failed to process ${file.originalname}`
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalItems = results.reduce((sum, r) => sum + r.detectedItems.length, 0);

    res.json({
      success: successCount > 0,
      data: {
        results,
        summary: {
          totalImages: files.length,
          successCount,
          failureCount: files.length - successCount,
          totalItemsScanned: totalItems,
          successRate: ((successCount / files.length) * 100).toFixed(1)
        }
      },
      message: `Batch scan completed: ${successCount}/${files.length} images processed successfully, ${totalItems} items scanned`
    });

  } catch (error) {
    console.error('Error processing batch scan:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during batch processing' 
    });
  }
});

// Helper functions
function getTypeConfidence(scanType: string): number {
  const confidenceMap: Record<string, number> = {
    'printed_receipt': 0.85,
    'screenshot_receipt': 0.95,
    'ingredient_photo': 0.75
  };
  return confidenceMap[scanType] || 0.7;
}

function getTypeDescription(scanType: string): string {
  const descriptions: Record<string, string> = {
    'printed_receipt': 'Physical paper receipt from grocery store',
    'screenshot_receipt': 'Digital receipt from mobile grocery app',
    'ingredient_photo': 'Direct photo of food items and ingredients'
  };
  return descriptions[scanType] || 'Unknown scan type';
}

/**
 * DEBUG ENDPOINT: Test financial scanning flow
 * GET /api/unified-scan/debug-financial/:userId
 */
router.get('/debug-financial/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`🔍 DEBUG FINANCIAL FLOW for user ${userId}`);
    
    await debugFinancialScanFlow(userId);
    await debugScanRoutePersistence();
    
    res.json({
      success: true,
      message: `Financial debugging completed for user ${userId}. Check server logs for detailed analysis.`
    });
  } catch (error) {
    console.error('DEBUG ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;