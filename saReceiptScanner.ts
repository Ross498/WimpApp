import OpenAI from "openai";
import { db } from "./db";
import { receiptScans, ingredients, costTracking, insertReceiptScanSchema } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { estimateExpiryDate } from "./utils/expiryEstimator";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Safely parse receipt date to avoid "invalid time value" errors
 */
function parseReceiptDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Try different date formats common in SA receipts
  const formats = [
    // ISO format
    /^\d{4}-\d{2}-\d{2}$/,
    // DD/MM/YYYY format
    /^\d{2}\/\d{2}\/\d{4}$/,
    // DD-MM-YYYY format
    /^\d{2}-\d{2}-\d{4}$/
  ];
  
  try {
    // First try direct parsing
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    // Try DD/MM/YYYY format (common in SA)
    if (formats[1].test(dateString)) {
      const [day, month, year] = dateString.split('/');
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    // Try DD-MM-YYYY format
    if (formats[2].test(dateString)) {
      const [day, month, year] = dateString.split('-');
      const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    console.warn('Could not parse receipt date:', dateString, 'using current date');
    return new Date();
  } catch (error) {
    console.error('Error parsing receipt date:', dateString, error);
    return new Date();
  }
}

interface ScannedReceiptItem {
  name: string;
  price: number; // ZAR price
  quantity: number;
  unit: string;
  category: string;
  pricePerUnit: number;
}

interface ReceiptScanResult {
  receiptId: string;
  storeName: string;
  storeLocation?: string;
  totalAmount: number;
  receiptDate: Date;
  items: ScannedReceiptItem[];
  success: boolean;
  error?: string;
}

/**
 * Scan South African grocery receipt using OpenAI Vision API
 * Specialized for SA stores: Woolworths, Pick n Pay, Checkers, Shoprite, SPAR
 */
export async function scanSouthAfricanReceipt(
  base64Image: string,
  userId: string
): Promise<ReceiptScanResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: `You are an expert at reading South African grocery receipts with specialized focus on ACCURATE QUANTITY EXTRACTION and PRECISE INGREDIENT RECOGNITION.

SOUTH AFRICAN STORE FORMATS TO RECOGNIZE:
- Woolworths Food / Woolworths / WW
- Pick n Pay / Pick n Pay Express / PnP
- Checkers / Checkers Hyper / Checkers Express
- Shoprite / Shoprite Usave / Shoprite Express
- SPAR / SUPERSPAR / KWIKSPAR / TOPS at SPAR
- Food Lover's Market / FLM
- Fruit & Veg City / F&V
- Cambridge Food / Fresh Stop / OK Foods

CRITICAL QUANTITY EXTRACTION - PARSE THESE PATTERNS:
- Volume: "5L milk" = quantity: 5, unit: "L"
- Weight: "2kg chicken" = quantity: 2, unit: "kg" 
- Weight: "500g butter" = quantity: 500, unit: "g"
- Volume: "1.5L juice" = quantity: 1.5, unit: "L"
- Volume: "330ml coke" = quantity: 330, unit: "ml"
- Count: "6 eggs" = quantity: 6, unit: "pieces"
- Weight: "1.2kg beef" = quantity: 1.2, unit: "kg"

ENHANCED INGREDIENT RECOGNITION:
- Standardize names: "FULL CRM MLK 2L" → "Full Cream Milk"
- Handle brands: "COCA COLA 330ML" → "Coca Cola"
- Clean duplicates: "BANANAS BANANAS" → "Bananas"
- Meat cuts: "BEEF MINCE 500G" → "Beef Mince"
- Dairy: "CHEDDAR CHEESE 200G" → "Cheddar Cheese"

EXTRACT THE FOLLOWING:
1. Store name and location (look at header/footer of receipt)
2. Receipt date (DD/MM/YYYY format common in SA)
3. Total amount in ZAR (look for "TOTAL" or "AMOUNT DUE")
4. Individual food items with:
   - Item name (clean, standardized, remove abbreviations)
   - Price in ZAR (convert cents if needed)
   - EXACT quantity and unit extracted from item description
   - Appropriate food category

FOOD CATEGORIES:
- Vegetables, Fruits, Meat, Poultry, Seafood, Dairy, Grains, Spices, Pantry, Frozen, Bakery

PRICE HANDLING:
- Convert all prices to ZAR (if shown in cents, divide by 100)
- Handle bulk pricing (e.g., "2 for R10.00")
- Calculate per-unit pricing when possible

RESPOND WITH JSON:
{
  "storeName": "store name",
  "storeLocation": "branch location if visible",
  "totalAmount": 123.45,
  "receiptDate": "2024-01-15",
  "items": [
    {
      "name": "standardized ingredient name",
      "price": 12.99,
      "quantity": 1,
      "unit": "kg/g/L/ml/pieces",
      "category": "category",
      "pricePerUnit": 12.99
    }
  ]
}

QUANTITY EXTRACTION EXAMPLES:
- "5L MILK FULL CREAM" → quantity: 5, unit: "L", name: "Full Cream Milk"
- "BANANAS 1KG" → quantity: 1, unit: "kg", name: "Bananas"
- "EGG DOZEN" → quantity: 12, unit: "pieces", name: "Eggs"
- "BREAD WHITE 700G" → quantity: 700, unit: "g", name: "White Bread"

ONLY include actual food ingredients, exclude:
- Household items, toiletries, cleaning products
- Plastic bags, till slips, magazines, airtime
- Non-food items, cigarettes, alcohol

Be precise with South African product names and pricing formats. ALWAYS extract quantities and units when visible on receipt.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this South African grocery receipt and extract all food ingredients with their ZAR prices."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI Vision API");
    }

    const receiptData = JSON.parse(content);
    const receiptId = nanoid();

    // Validate required fields
    if (!receiptData.storeName || !receiptData.totalAmount || !receiptData.items) {
      throw new Error("Invalid receipt data extracted");
    }

    const result: ReceiptScanResult = {
      receiptId,
      storeName: receiptData.storeName,
      storeLocation: receiptData.storeLocation,
      totalAmount: parseFloat(receiptData.totalAmount),
      receiptDate: receiptData.receiptDate ? parseReceiptDate(receiptData.receiptDate) : new Date(),
      items: receiptData.items.map((item: any) => {
        // Smart unit defaulting based on item name patterns
        let defaultUnit = 'pieces';
        const nameLower = (item.name || '').toLowerCase();
        
        // Check if quantity/unit might be embedded in the name
        if (!item.unit || item.unit === 'piece' || item.unit === 'pieces') {
          if (/\d+\s*(kg|kilogram)/i.test(nameLower)) defaultUnit = 'kg';
          else if (/\d+\s*(g|gram)/i.test(nameLower)) defaultUnit = 'g';
          else if (/\d+\s*(l|liter|litre)/i.test(nameLower)) defaultUnit = 'L';
          else if (/\d+\s*(ml|milliliter|millilitre)/i.test(nameLower)) defaultUnit = 'ml';
          else if (/milk|juice|oil|sauce|liquid/i.test(nameLower)) defaultUnit = 'L';
          else if (/butter|cheese|meat|flour|sugar|salt/i.test(nameLower)) defaultUnit = 'kg';
        }
        
        return {
          name: item.name,
          price: parseFloat(item.price),
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || defaultUnit,
          category: item.category || "Other",
          pricePerUnit: parseFloat(item.pricePerUnit || item.price)
        };
      }),
      success: true
    };

    // 🔍 FINANCIAL DEBUG: Log extracted amounts before saving
    console.log(`🔍 FINANCIAL EXTRACTION DEBUG: Total Amount R${result.totalAmount}, Items: ${result.items.length}`);
    result.items.forEach((item, index) => {
      console.log(`🔍 ITEM ${index + 1}: ${item.name} - R${item.price} (qty: ${item.quantity})`);
    });

    // 🔍 FINANCIAL DEBUG: About to save financial data
    console.log(`🔍 SAVING FINANCIAL DATA: userId=${userId}, totalAmount=R${result.totalAmount}, receiptId=${receiptId}`);
    
    // Save receipt scan to database
    await saveReceiptScan(userId, result, base64Image, receiptData);
    
    // 🔍 FINANCIAL DEBUG: Confirm save completion
    console.log(`✅ FINANCIAL SAVE COMPLETE: Receipt ${receiptId} with R${result.totalAmount} saved for user ${userId}`);

    return result;

  } catch (error) {
    console.error('Error scanning South African receipt:', error);
    return {
      receiptId: '',
      storeName: '',
      totalAmount: 0,
      receiptDate: new Date(),
      items: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Save receipt scan data to database
 */
async function saveReceiptScan(
  userId: string,
  scanResult: ReceiptScanResult,
  originalImage: string,
  extractedData: any
): Promise<void> {
  if (!db) throw new Error('Database not available');

  try {
    // Save receipt scan record
    await db.insert(receiptScans).values({
      userId: parseInt(userId),
      receiptId: scanResult.receiptId,
      storeName: scanResult.storeName,
      storeLocation: scanResult.storeLocation || null,
      totalAmount: scanResult.totalAmount.toString(),
      receiptDate: scanResult.receiptDate,
      scannedImage: originalImage,
      extractedData: extractedData,
      processedItems: scanResult.items,
      scanStatus: scanResult.success ? 'completed' : 'error',
      errorMessage: scanResult.error || null,
      currency: 'ZAR'
    });

    // Add ingredients to user's pantry with pricing data
    if (scanResult.success && scanResult.items.length > 0) {
      await addIngredientsFromReceipt(userId, scanResult);
    }

  } catch (error) {
    console.error('Error saving receipt scan:', error);
    throw error;
  }
}

/**
 * Add scanned ingredients to user's pantry with ZAR pricing
 */
async function addIngredientsFromReceipt(
  userId: string,
  scanResult: ReceiptScanResult
): Promise<void> {
  if (!db) throw new Error('Database not available');

  for (const item of scanResult.items) {
    try {
      // Check if ingredient already exists
      const existingIngredient = await db
        .select()
        .from(ingredients)
        .where(and(
          eq(ingredients.userId, parseInt(userId)),
          eq(ingredients.name, item.name)
        ))
        .limit(1);

      if (existingIngredient.length > 0) {
        // AI-powered expiry date estimation for newly purchased item
        const expiryEstimate = estimateExpiryDate(item.name, item.category);
        
        // Update existing ingredient quantity, pricing, and refresh expiry date
        await db
          .update(ingredients)
          .set({
            quantity: existingIngredient[0].quantity + item.quantity,
            purchasePrice: item.price.toString(),
            pricePerUnit: item.pricePerUnit.toString(),
            storeName: scanResult.storeName,
            purchaseDate: scanResult.receiptDate,
            receiptId: scanResult.receiptId,
            expiryDate: expiryEstimate.expiryDate
          })
          .where(eq(ingredients.id, existingIngredient[0].id));
        
        console.log('📅 UPDATED EXPIRY for existing ingredient:', {
          ingredient: item.name,
          newExpiryDate: expiryEstimate.expiryDate,
          estimatedDays: expiryEstimate.days
        });
      } else {
        // AI-powered expiry date estimation
        const expiryEstimate = estimateExpiryDate(item.name, item.category);
        console.log('📅 RECEIPT EXPIRY ESTIMATE:', {
          ingredient: item.name,
          category: item.category,
          estimatedDays: expiryEstimate.days,
          expiryDate: expiryEstimate.expiryDate,
          confidence: expiryEstimate.confidence
        });

        // Add new ingredient with pricing data and expiry date
        await db.insert(ingredients).values({
          userId: parseInt(userId),
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          purchasePrice: item.price.toString(),
          pricePerUnit: item.pricePerUnit.toString(),
          storeName: scanResult.storeName,
          purchaseDate: scanResult.receiptDate,
          receiptId: scanResult.receiptId,
          expiryDate: expiryEstimate.expiryDate,
          isExpired: false
        });
      }

      // CRITICAL FIX: Save cost tracking data for financial analysis with ZAR currency
      try {
        await db.insert(costTracking).values({
          userId: parseInt(userId),
          ingredientName: item.name,
          price: item.price.toString(),
          quantity: `${item.quantity} ${item.unit}`,
          store: scanResult.storeName || 'Unknown Store',
          currency: 'ZAR'
        });
        console.log(`💰 COST TRACKING SUCCESS: ${item.name} - R${item.price} saved to costTracking table for userId ${userId}`);
      } catch (costError) {
        console.error(`💰 COST TRACKING ERROR for ${item.name}:`, costError);
      }
    } catch (error) {
      console.error(`Error adding ingredient ${item.name}:`, error);
      // Continue with other ingredients even if one fails
    }
  }
}

/**
 * Calculate money lost to expired ingredients
 */
export async function calculateExpiryLoss(userId: string): Promise<{
  weeklyLoss: number;
  monthlyLoss: number;
  expiredItems: Array<{
    name: string;
    expiredValue: number;
    expiredDate: Date;
    storeName?: string;
  }>;
}> {
  if (!db) throw new Error('Database not available');

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Get expired ingredients with their ZAR values
  const expiredIngredients = await db
    .select()
    .from(ingredients)
    .where(and(
      eq(ingredients.userId, parseInt(userId)),
      eq(ingredients.isExpired, true)
    ));

  const expiredItems = expiredIngredients.map(item => ({
    name: item.name,
    expiredValue: parseFloat(item.expiredValue || '0'),
    expiredDate: item.expiryDate || new Date(),
    storeName: item.storeName || undefined
  }));

  const weeklyLoss = expiredItems
    .filter(item => item.expiredDate >= oneWeekAgo)
    .reduce((sum, item) => sum + item.expiredValue, 0);

  const monthlyLoss = expiredItems
    .filter(item => item.expiredDate >= oneMonthAgo)
    .reduce((sum, item) => sum + item.expiredValue, 0);

  return {
    weeklyLoss,
    monthlyLoss,
    expiredItems
  };
}

/**
 * Mark ingredient as expired and calculate ZAR loss
 */
export async function markIngredientExpired(ingredientId: number): Promise<void> {
  if (!db) throw new Error('Database not available');

  const ingredient = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.id, ingredientId))
    .limit(1);

  if (ingredient.length === 0) {
    throw new Error('Ingredient not found');
  }

  const item = ingredient[0];
  const expiredValue = parseFloat(item.purchasePrice || '0');

  // Mark as expired and record the ZAR loss
  await db
    .update(ingredients)
    .set({
      isExpired: true,
      expiredValue: expiredValue.toString()
    })
    .where(eq(ingredients.id, ingredientId));

  // Track the financial loss
  await db.insert(costTracking).values({
    userId: item.userId,
    ingredientName: `${item.name} (expired)`,
    price: expiredValue.toString(),
    quantity: `1 expired`,
    store: item.storeName || 'Unknown Store',
    currency: 'ZAR'
  });
}

/**
 * Get South African cost statistics for dashboard
 */
export async function getSouthAfricanCostStats(userId: string): Promise<{
  totalPantryValue: string;
  expiredValueThisWeek: string;
  mostExpensiveItem: { name: string; price: string };
  topStore: { name: string; totalSpent: string };
  totalReceiptsScanned: number;
  avgItemPrice: string;
}> {
  if (!db) throw new Error('Database not available');

  const { weeklyLoss } = await calculateExpiryLoss(userId);

  // Calculate total pantry value
  const pantryItems = await db
    .select()
    .from(ingredients)
    .where(and(
      eq(ingredients.userId, parseInt(userId)),
      eq(ingredients.isExpired, false)
    ));

  const totalPantryValue = pantryItems.reduce((sum, item) => {
    return sum + parseFloat(item.purchasePrice || '0');
  }, 0);

  // Find most expensive item
  const mostExpensive = pantryItems.reduce((max, item) => {
    const price = parseFloat(item.purchasePrice || '0');
    return price > parseFloat(max.purchasePrice || '0') ? item : max;
  }, pantryItems[0] || { name: 'None', purchasePrice: '0' });

  // Find top store by total spending (THIS IS HOW TOP STORE IS DETERMINED)
  // The system aggregates all purchases by store name and finds the highest total
  const storeSpending: { [key: string]: number } = {};
  pantryItems.forEach(item => {
    if (item.storeName) {
      storeSpending[item.storeName] = (storeSpending[item.storeName] || 0) + parseFloat(item.purchasePrice || '0');
    }
  });

  // Find the store with the highest total spending
  let topStoreName = 'None';
  let topStoreAmount = 0;
  Object.entries(storeSpending).forEach(([store, amount]) => {
    if (amount > topStoreAmount) {
      topStoreName = store;
      topStoreAmount = amount;
    }
  });

  // Count total receipts scanned
  const receipts = await db
    .select()
    .from(receiptScans)
    .where(eq(receiptScans.userId, parseInt(userId)));

  // Calculate average item price
  const totalItems = pantryItems.length;
  const avgPrice = totalItems > 0 ? totalPantryValue / totalItems : 0;

  return {
    totalPantryValue: `R${totalPantryValue.toFixed(2)}`,
    expiredValueThisWeek: `R${weeklyLoss.toFixed(2)}`,
    mostExpensiveItem: {
      name: mostExpensive.name,
      price: `R${parseFloat(mostExpensive.purchasePrice || '0').toFixed(2)}`
    },
    topStore: {
      name: topStoreName,
      totalSpent: `R${topStoreAmount.toFixed(2)}`
    },
    totalReceiptsScanned: receipts.length,
    avgItemPrice: `R${avgPrice.toFixed(2)}`
  };
}