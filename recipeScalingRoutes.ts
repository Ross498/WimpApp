import { Router } from 'express';
import { scaleRecipeEndpoint, getServingOptionsEndpoint } from './recipeScalingService';

const router = Router();

// Scale a recipe to target serving size
router.post('/scale', scaleRecipeEndpoint);

// Get available serving size options for a recipe
router.get('/serving-options', getServingOptionsEndpoint);

export default router;