// ENDPOINT TO VERIFY LATEST FIXES ARE DEPLOYED
// Returns status of all three critical UI fixes

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/verify-fixes', (req, res) => {
  try {
    // Check if files contain the latest fixes
    const recipePath = path.join(__dirname, 'client/src/components/ComprehensiveRecipeCard.tsx');
    const masteryPath = path.join(__dirname, 'client/src/screens/MasteryScreen.tsx');
    
    let status = {
      timestamp: new Date().toISOString(),
      fixes: {
        removeFavorites: false,
        collectionsModal: false,
        victoryMessage: false
      }
    };
    
    // Check ComprehensiveRecipeCard for fixes
    if (fs.existsSync(recipePath)) {
      const recipeContent = fs.readFileSync(recipePath, 'utf8');
      status.fixes.removeFavorites = recipeContent.includes('handleRemoveFromFavorites');
      status.fixes.collectionsModal = recipeContent.includes('showCollectionModal');
    }
    
    // Check MasteryScreen for victory message fix  
    if (fs.existsSync(masteryPath)) {
      const masteryContent = fs.readFileSync(masteryPath, 'utf8');
      status.fixes.victoryMessage = masteryContent.includes('mastery_key_') && masteryContent.includes('keyLevel');
    }
    
    status.allFixesDeployed = Object.values(status.fixes).every(fix => fix === true);
    
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Could not verify fixes', details: error.message });
  }
});

module.exports = router;