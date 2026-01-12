import { Router, Request, Response } from 'express';
import { authenticateToken } from './authMiddleware';
import multer from 'multer';
import OpenAI, { toFile } from 'openai';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post('/process', authenticateToken, upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No audio file provided' 
      });
    }

    console.log('🎤 VOICE: Processing audio file', { size: req.file.size, type: req.file.mimetype });

    const audioFile = await toFile(req.file.buffer, 'recording.webm', { type: req.file.mimetype });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en'
    });

    const transcript = transcription.text;
    console.log('🎤 VOICE: Transcription:', transcript);

    if (!transcript || transcript.trim().length === 0) {
      return res.json({
        success: false,
        error: 'No speech detected in audio'
      });
    }

    const detectedItems = parseIngredients(transcript);

    console.log('🎤 VOICE: Detected items:', detectedItems);

    return res.json({
      success: true,
      transcript,
      detectedItems,
      message: `Detected ${detectedItems.length} ingredient(s) from voice input`
    });

  } catch (error) {
    console.error('❌ Voice recognition error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to process voice input',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

function parseIngredients(transcript: string): Array<{ name: string; quantity: number; unit: string; category: string }> {
  const items = transcript
    .toLowerCase()
    .split(/,|and|\n/)
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0);

  return items.map((item: string) => {
    // STEP 1: Strip conversational phrases
    let cleanedItem = item
      .replace(/^(?:i have|i've got|i got|there (?:is|are)|we have|we've got)\s+/i, '')
      .replace(/^(?:some|a|an)\s+/i, '')
      .trim();

    // STEP 2: Pattern matching with "of" support
    // Pattern 1: "200 grams of cheddar cheese" or "2 kg of chicken" or "500 ml milk"
    const withUnitOfMatch = cleanedItem.match(/^(\d+(?:\.\d+)?)\s*(kg|g|kilograms?|grams?|l|ml|liters?|litres?|milliliters?|millilitres?|cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?)\s+(?:of\s+)?(.+)$/i);
    
    if (withUnitOfMatch) {
      const [, quantity, rawUnit, name] = withUnitOfMatch;
      // Normalize units
      let unit = rawUnit.toLowerCase();
      if (unit.startsWith('kilogram')) unit = 'kg';
      if (unit.startsWith('gram') && !unit.startsWith('grams of')) unit = 'g';
      if (unit.startsWith('liter') || unit.startsWith('litre')) unit = 'L';
      if (unit.startsWith('milli')) unit = 'ml';
      if (unit.startsWith('tablespoon')) unit = 'tbsp';
      if (unit.startsWith('teaspoon')) unit = 'tsp';
      if (unit.startsWith('ounce')) unit = 'oz';
      if (unit.startsWith('pound') || unit === 'lbs') unit = 'lb';
      if (unit === 'cups') unit = 'cup';
      
      return {
        name: name.trim(),
        quantity: parseFloat(quantity),
        unit,
        category: categorizIngredient(name.trim())
      };
    }
    
    // Pattern 2: "3 tomatoes" or "5 apples" (count without explicit unit)
    const countMatch = cleanedItem.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
    
    if (countMatch) {
      const [, quantity, name] = countMatch;
      return {
        name: name.trim(),
        quantity: parseFloat(quantity),
        unit: 'pieces',
        category: categorizIngredient(name.trim())
      };
    }
    
    // Pattern 3: "bunch of bananas" or "head of lettuce"
    const bunchMatch = cleanedItem.match(/^(?:a\s+)?(?:bunch|head)\s+(?:of\s+)?(.+)$/i);
    
    if (bunchMatch) {
      const [, name] = bunchMatch;
      return {
        name: name.trim(),
        quantity: 1,
        unit: 'bunch',
        category: categorizIngredient(name.trim())
      };
    }
    
    // Default: no quantity detected, use cleaned item as name
    return {
      name: cleanedItem,
      quantity: 1,
      unit: 'pieces',
      category: categorizIngredient(cleanedItem)
    };
  });
}

function categorizIngredient(name: string): string {
  const lowerName = name.toLowerCase();
  
  // Vegetables
  if (/tomato|onion|carrot|potato|lettuce|spinach|broccoli|pepper|cucumber|celery/.test(lowerName)) {
    return 'vegetables';
  }
  
  // Fruits
  if (/apple|banana|orange|grape|berry|mango|pear|peach|lemon|lime/.test(lowerName)) {
    return 'fruits';
  }
  
  // Meat & Poultry
  if (/chicken|beef|pork|lamb|meat|steak|mince/.test(lowerName)) {
    return 'meat';
  }
  
  // Dairy
  if (/milk|cheese|yogurt|cream|butter/.test(lowerName)) {
    return 'dairy';
  }
  
  // Grains & Bakery
  if (/bread|flour|rice|pasta|cereal/.test(lowerName)) {
    return 'grains';
  }
  
  // Default
  return 'other';
}

export default router;
