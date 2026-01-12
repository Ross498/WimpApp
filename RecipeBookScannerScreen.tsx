import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuthTrigger } from '@/utils/authTriggers';
import { useScrollLock } from '@/hooks/useScrollLock';

// Custom icons
const CameraIcon = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ArrowLeft = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5"/>
    <path d="M12 19l-7-7 7-7"/>
  </svg>
);

const BookOpen = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const CheckCircle = ({ size = 24, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22,4 12,14.01 9,11.01"/>
  </svg>
);

interface ScannedRecipe {
  name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  imageUrl?: string;
}

const RecipeBookScannerScreen: React.FC = () => {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { requireAuth } = useAuthTrigger();
  useScrollLock(true);
  const isTutorialActive = false;

  const [step, setStep] = useState<'name' | 'scan-ingredients' | 'scan-instructions' | 'time-input' | 'review'>('name');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [ingredientsImage, setIngredientsImage] = useState<string | null>(null);
  const [instructionsImage, setInstructionsImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scannedRecipe, setScannedRecipe] = useState<ScannedRecipe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [isAddingToPantry, setIsAddingToPantry] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll('input, textarea, select');
      const currentInput = e.target as HTMLElement;
      const currentIndex = Array.from(inputs).indexOf(currentInput);

      if (currentIndex < inputs.length - 1) {
        (inputs[currentIndex + 1] as HTMLElement).focus();
      }
    }
  };

  // Scroll input into view when focused to prevent screen jumping
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300); // Delay to wait for keyboard animation
  };

  const scanIngredientsMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const formData = new FormData();

      try {
        const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        formData.append('image', blob, 'ingredients.jpg');
        formData.append('scanType', 'recipe_book');

        const response = await fetch('/api/unified-scan/process', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to scan ingredients: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Scan processing failed');
        }

        return result;
      } catch (error) {
        console.error('Error in scanIngredientsMutation:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log('🥕 Ingredients scan success:', data);
      const detectedItems = data.data?.detectedItems || data.data?.ingredients || [];
      
      const ingredients = detectedItems.map((item: any) => {
        if (typeof item === 'string') {
          return item;
        }
        const quantity = item.quantity || item.amount || '';
        const unit = item.unit || '';
        const name = item.name || item.item || item;
        
        if (quantity && unit) {
          return `${quantity} ${unit} ${name}`.trim();
        } else if (quantity) {
          return `${quantity} ${name}`.trim();
        } else {
          return name;
        }
      });
      
      console.log('📦 Processed ingredients with quantities:', ingredients);
      setScannedRecipe(prev => ({
        ...prev!,
        ingredients
      }));
      setStep('scan-instructions');
      setIsProcessing(false);
      setErrorMessage('');
    },
    onError: (error: any) => {
      console.error('Ingredients scan error:', error);
      setErrorMessage('Failed to scan ingredients. Please try again or enter manually.');
      setIsProcessing(false);
    }
  });

  const scanInstructionsMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const formData = new FormData();

      try {
        const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        formData.append('image', blob, 'instructions.jpg');
        formData.append('scanType', 'recipe_book');

        const response = await fetch('/api/unified-scan/process', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to scan instructions: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Scan processing failed');
        }

        return result;
      } catch (error) {
        console.error('Error in scanInstructionsMutation:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log('📋 Instructions scan success:', data);
      setScannedRecipe(prev => ({
        ...prev!,
        instructions: data.data?.instructions || [],
        prepTime: data.data?.prepTime || prev!.prepTime || 15,
        cookTime: data.data?.cookTime || prev!.cookTime || 30,
        servings: data.data?.servings || prev!.servings || 4,
        difficulty: data.data?.difficulty || prev!.difficulty || 'medium',
        category: data.data?.category || prev!.category || 'Scanned Recipes'
      }));
      setStep('review');
      setIsProcessing(false);
      setErrorMessage('');
    },
    onError: (error: any) => {
      console.error('Instructions scan error:', error);
      setErrorMessage('Failed to scan instructions. Please try again or enter manually.');
      setIsProcessing(false);
    }
  });

  const validateRecipe = (recipe: ScannedRecipe): boolean => {
    return !!(
      recipe.name.trim() &&
      recipe.ingredients.length > 0 &&
      recipe.instructions.length > 0
    );
  };

  const saveRecipeMutation = useMutation({
    mutationFn: async (recipe: ScannedRecipe) => {
      if (!validateRecipe(recipe)) {
        throw new Error('Recipe is incomplete. Please ensure you have added ingredients and instructions.');
      }

      // GUARANTEED TO WORK: Use dedicated recipe scanner endpoint
      // Add source field so it appears in "Scanned Recipes" category
      const response = await fetch('/api/recipe-scanner/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...recipe,
          source: 'scanned',
          category: 'Scanned Recipes' // CRITICAL: Ensure consistent category
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Recipe save failed:', response.status, errorText);
        throw new Error(`Failed to save recipe: ${response.status}`);
      }
      
      const customRecipeData = await response.json();
      console.log('✅ Recipe saved successfully:', customRecipeData);

      // Recipe is now saved - customRecipeData contains the saved recipe
      return customRecipeData;
    },
    onSuccess: () => {
      setIsProcessing(false);
      setScannedRecipe(null);
      setStep('name');
      setRecipeName('');
      setRecipeDescription('');
      setIngredientsImage(null);
      setInstructionsImage(null);
      setErrorMessage('');

      setSuccessMessage('Recipe saved successfully!');

      // Invalidate queries to refresh recipe lists
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meal-persistence/all-recipes'] });

      setTimeout(() => setSuccessMessage(''), 3000);

      // Navigate to meals screen to see the scanned recipe
      setLocation('/meals');
    },
    onError: (error: any) => {
      console.error('Save recipe error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save recipe. Please try again.');
      setIsProcessing(false);
    }
  });

  const addToPantryMutation = useMutation({
    mutationFn: async (ingredients: string[]) => {
      const ingredientItems = ingredients.map(ingredient => {
        const parts = ingredient.match(/^([\d\s./]+\s*[a-zA-Z]*)\s+(.+)$/) || ['', '', ingredient];
        const quantity = parts[1]?.trim() || '1';
        const name = parts[2]?.trim() || ingredient;

        return {
          name: name,
          quantity: quantity,
          category: 'Scanned Recipe Ingredient'
        };
      });

      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ingredients: ingredientItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add ingredients to pantry');
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccessMessage('Ingredients added to pantry successfully!');
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsAddingToPantry(false);
    },
    onError: (error: any) => {
      console.error('Add to pantry error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add ingredients to pantry.');
      setTimeout(() => setErrorMessage(''), 3000);
      setIsAddingToPantry(false);
    }
  });

  const handleAddToPantry = () => {
    if (!scannedRecipe || scannedRecipe.ingredients.length === 0) return;

    if (!requireAuth('SHOPPING_LIST', undefined, '🛒 Add to pantry! Sign up to manage your ingredients and build shopping lists.')) {
      return;
    }

    setIsAddingToPantry(true);
    addToPantryMutation.mutate(scannedRecipe.ingredients);
  };

  const handleImageCapture = (file: File, type: 'ingredients' | 'instructions' | 'recipeImage' | undefined = undefined) => {
    if (!requireAuth('RECIPE_SAVE', undefined, '📸 Scan recipe books! Sign up to digitize your favorite recipes with AI-powered scanning and save them to your personal collection.')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;

      if (type === 'ingredients') {
        setIngredientsImage(imageData);
        setIsProcessing(true);
        scanIngredientsMutation.mutate(imageData);
      } else if (type === 'instructions') {
        setInstructionsImage(imageData);
        setIsProcessing(true);
        scanInstructionsMutation.mutate(imageData);
      } else if (type === 'recipeImage') {
        setRecipeImage(imageData);
        setScannedRecipe(prev => ({
          ...prev!,
          imageUrl: imageData
        }));
      } else {
        setIngredientsImage(imageData);
        setIsProcessing(true);
        scanIngredientsMutation.mutate(imageData);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNameSubmit = () => {
    if (!recipeName.trim()) return;

    if (!requireAuth('RECIPE_SAVE', undefined, '📝 Create your recipe! Sign up to save and organize your scanned recipes in your personal collection.')) {
      return;
    }

    setScannedRecipe({
      name: recipeName,
      description: recipeDescription,
      ingredients: [],
      instructions: [],
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      difficulty: 'medium',
      category: 'Scanned Recipes'
    });

    setStep('scan-ingredients');
  };

  const handleSaveRecipe = () => {
    if (!scannedRecipe) return;

    if (!requireAuth('RECIPE_SAVE', undefined, '💾 Save your scanned recipe! Sign up to build your personal digital recipe collection and access it anywhere.')) {
      return;
    }

    if (isTutorialActive) {
      console.log('📚 Tutorial mode - recipe save button clicked but not functional');
      setSuccessMessage('Recipe would be saved after completing tutorial!');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);
    saveRecipeMutation.mutate(scannedRecipe);
  };

  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showInfoModal) {
          setShowInfoModal(false);
        } else {
          setLocation('/favorites');
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [setLocation, showInfoModal]);

  const InfoModal = () => (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
      style={{ zIndex: 'calc(var(--z-modal, 200) + 50)' }}
      onClick={() => setShowInfoModal(false)}
      data-testid="info-modal-backdrop"
    >
      <div 
        className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="info-modal-content"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900" data-testid="info-modal-title">
              📖 Recipe Scanning Tips
            </h3>
            <button
              onClick={() => setShowInfoModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors h-12 w-12 flex items-center justify-center"
              data-testid="button-close-info"
              aria-label="Close modal"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📸 Photo Quality Tips:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Ensure good lighting and clear text</li>
                <li>• Hold camera steady and close enough to read</li>
                <li>• Avoid shadows and reflections</li>
                <li>• Include the complete ingredients list</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🔍 What We Scan:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Recipe ingredients and quantities</li>
                <li>• Cooking instructions and steps</li>
                <li>• Prep and cook times (when visible)</li>
                <li>• Difficulty level and serving size</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">✅ Best Results:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Scan cookbook pages or printed recipes</li>
                <li>• Take separate photos for ingredients and instructions</li>
                <li>• Review and edit before saving</li>
                <li>• Save to your favorites for easy access</li>
              </ul>
            </div>
          </div>
          <button
            onClick={() => setShowInfoModal(false)}
            className="w-full mt-6 h-12 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            data-testid="button-close-info-action"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-[55]" 
        onClick={() => setLocation('/favorites')}
        data-testid="modal-backdrop"
      />

      <div className="fixed inset-0 z-[60] overflow-y-auto" data-testid="recipe-scanner-modal" style={{ height: '100dvh' }}>
        <div className="bg-slate-50 pb-32" style={{ minHeight: '100%' }} onClick={(e) => e.stopPropagation()}>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto w-full max-w-lg px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLocation('/favorites')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors h-12 w-12 flex items-center justify-center"
              data-testid="button-back"
            >
              <ArrowLeft size={24} className="text-slate-800" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <BookOpen size={24} className="text-green-600" />
              Recipe Scanner
            </h1>
            <button
              onClick={() => setShowInfoModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors h-12 w-12 flex items-center justify-center"
              data-testid="button-info"
              title="Scanning Tips"
              aria-label="Show scanning tips"
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9,9h0a3,3,0,0,1,6,0c0,2-3,3-3,3"/>
                <path d="M12,17h.01"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg px-4 py-4">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm" data-testid="error-message">
            <div className="font-medium">Error</div>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm" data-testid="success-message">
            <div className="font-medium">Success</div>
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Step {step === 'name' ? 1 : step === 'scan-ingredients' ? 2 : step === 'scan-instructions' ? 3 : step === 'time-input' ? 4 : 5} of 5</span>
            <span className="text-sm text-slate-500">
              {step === 'name' ? 'Recipe Details' : 
               step === 'scan-ingredients' ? 'Scan Ingredients' :
               step === 'scan-instructions' ? 'Scan Instructions' : 
               step === 'time-input' ? 'Time Input' : 'Review & Save'}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${step === 'name' ? 20 : step === 'scan-ingredients' ? 40 : step === 'scan-instructions' ? 60 : step === 'time-input' ? 80 : 100}%` }}
            />
          </div>
        </div>

        {step === 'name' && (
          <div className="space-y-6">
            <div className="text-center">
              <BookOpen size={64} className="mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Recipe Details</h2>
              <p className="text-slate-600">Upload screenshots of online recipes or scan physical cookbooks</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipe Name *</label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder="e.g., Grandma's Chocolate Chip Cookies"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{ fontSize: '16px' }}
                  data-testid="input-recipe-name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description (Optional)</label>
                <textarea
                  value={recipeDescription}
                  onChange={(e) => setRecipeDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  placeholder="Brief description of the recipe..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  style={{ fontSize: '16px' }}
                  data-testid="input-recipe-description"
                />
              </div>

              <button
                onClick={handleNameSubmit}
                disabled={!recipeName.trim()}
                className="w-full bg-green-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-continue-to-scan"
              >
                Continue to Scanning
              </button>
            </div>
          </div>
        )}

        {step === 'scan-ingredients' && (
          <div className="space-y-6">
            <div className="text-center">
              <CameraIcon size={64} className="mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Ingredients</h2>
              <p className="text-slate-600">Take a photo of the ingredients list from your recipe book</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              {ingredientsImage ? (
                <div className="space-y-4">
                  <img 
                    src={ingredientsImage} 
                    alt="Ingredients scan" 
                    className="w-full max-w-xs mx-auto rounded-lg"
                    data-testid="image-ingredients-preview"
                  />
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span>Processing ingredients...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageCapture(file, 'ingredients');
                    }}
                    style={{ display: 'none' }}
                    id="scan-ingredients-camera"
                    data-testid="input-camera-ingredients"
                  />
                  <button 
                    onClick={() => document.getElementById('scan-ingredients-camera')?.click()}
                    className="w-full bg-green-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    data-testid="button-camera-ingredients"
                  >
                    📸 Take Photo
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageCapture(file, 'ingredients');
                    }}
                    style={{ display: 'none' }}
                    id="upload-ingredients"
                    data-testid="input-upload-ingredients"
                  />
                  <button 
                    onClick={() => document.getElementById('upload-ingredients')?.click()}
                    className="w-full bg-slate-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                    data-testid="button-upload-ingredients"
                  >
                    📁 Upload Photo
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('scan-instructions')}
              className="w-full bg-slate-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors"
              data-testid="button-skip-ingredients"
            >
              Skip & Enter Manually
            </button>
          </div>
        )}

        {step === 'scan-instructions' && (
          <div className="space-y-6">
            <div className="text-center">
              <CameraIcon size={64} className="mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Scan Instructions</h2>
              <p className="text-slate-600">Take a photo of the cooking instructions</p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              {instructionsImage ? (
                <div className="space-y-4">
                  <img 
                    src={instructionsImage} 
                    alt="Instructions scan" 
                    className="w-full max-w-xs mx-auto rounded-lg"
                    data-testid="image-instructions-preview"
                  />
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span>Processing instructions...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageCapture(file, 'instructions');
                    }}
                    style={{ display: 'none' }}
                    id="scan-instructions-camera"
                    data-testid="input-camera-instructions"
                  />
                  <button 
                    onClick={() => document.getElementById('scan-instructions-camera')?.click()}
                    className="w-full bg-green-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    data-testid="button-camera-instructions"
                  >
                    📸 Take Photo
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageCapture(file, 'instructions');
                    }}
                    style={{ display: 'none' }}
                    id="upload-instructions"
                    data-testid="input-upload-instructions"
                  />
                  <button 
                    onClick={() => document.getElementById('upload-instructions')?.click()}
                    className="w-full bg-slate-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                    data-testid="button-upload-instructions"
                  >
                    📁 Upload Photo
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setStep('review')}
              className="w-full bg-slate-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors"
              data-testid="button-skip-instructions"
            >
              Skip & Enter Manually
            </button>
          </div>
        )}

        {step === 'review' && scannedRecipe && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Review Recipe</h2>
              <p className="text-slate-600">Check the scanned information and save your scanned recipe</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={scannedRecipe.name}
                  onChange={(e) => setScannedRecipe(prev => ({ ...prev!, name: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-xl font-bold"
                  style={{ fontSize: '16px' }}
                  data-testid="input-edit-recipe-name"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={scannedRecipe.description || ''}
                  onChange={(e) => setScannedRecipe(prev => ({ ...prev!, description: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a description for this recipe..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] resize-none"
                  rows={2}
                  style={{ fontSize: '16px' }}
                  data-testid="input-edit-recipe-description"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Recipe Photo (Optional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                  {recipeImage ? (
                    <div className="space-y-2">
                      <img 
                        src={recipeImage} 
                        alt="Recipe" 
                        className="w-full max-w-xs mx-auto rounded-lg"
                        data-testid="image-recipe-preview"
                      />
                      <button
                        onClick={() => setRecipeImage(null)}
                        className="text-sm text-[#22c55e] hover:text-[#16a34a] h-12"
                        data-testid="button-remove-recipe-photo"
                      >
                        Remove photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageCapture(file, 'recipeImage');
                        }}
                        style={{ display: 'none' }}
                        id="recipe-photo-camera"
                        data-testid="input-camera-recipe-photo"
                      />
                      <button 
                        onClick={() => document.getElementById('recipe-photo-camera')?.click()}
                        className="w-full bg-green-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                        data-testid="button-camera-recipe-photo"
                      >
                        📸 Take Photo
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageCapture(file, 'recipeImage');
                        }}
                        style={{ display: 'none' }}
                        id="recipe-photo-upload"
                        data-testid="input-upload-recipe-photo"
                      />
                      <button 
                        onClick={() => document.getElementById('recipe-photo-upload')?.click()}
                        className="w-full bg-slate-600 text-white h-12 px-4 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                        data-testid="button-upload-recipe-photo"
                      >
                        📁 Upload Photo
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 text-center">Prep Time (min)</label>
                  <input
                    type="number"
                    value={scannedRecipe.prepTime}
                    onChange={(e) => setScannedRecipe(prev => ({ ...prev!, prepTime: parseInt(e.target.value) || 0 }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-center text-lg font-bold text-[#22c55e]"
                    style={{ fontSize: '16px' }}
                    min="0"
                    data-testid="input-prep-time"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 text-center">Cook Time (min)</label>
                  <input
                    type="number"
                    value={scannedRecipe.cookTime}
                    onChange={(e) => setScannedRecipe(prev => ({ ...prev!, cookTime: parseInt(e.target.value) || 0 }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-center text-lg font-bold text-[#22c55e]"
                    style={{ fontSize: '16px' }}
                    min="0"
                    data-testid="input-cook-time"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 text-center">Servings</label>
                  <input
                    type="number"
                    value={scannedRecipe.servings}
                    onChange={(e) => setScannedRecipe(prev => ({ ...prev!, servings: parseInt(e.target.value) || 1 }))}
                    onKeyDown={handleKeyDown}
                    className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-center text-lg font-bold text-[#22c55e]"
                    style={{ fontSize: '16px' }}
                    min="1"
                    data-testid="input-servings"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Ingredients</label>
                <div className="space-y-3">
                  {scannedRecipe.ingredients.map((ingredient, index) => {
                    const parts = ingredient.match(/^([\d\s./]+\s*[a-zA-Z]*)\s+(.+)$/) || ['', '', ingredient];
                    const quantity = parts[1]?.trim() || '';
                    const name = parts[2]?.trim() || ingredient;

                    return (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                          <input
                            type="text"
                            value={quantity}
                            onChange={(e) => {
                              const newIngredients = [...scannedRecipe.ingredients];
                              newIngredients[index] = e.target.value ? `${e.target.value} ${name}` : name;
                              setScannedRecipe(prev => ({ ...prev!, ingredients: newIngredients }));
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full sm:w-24 sm:min-w-[6rem] px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-sm"
                            style={{ fontSize: '16px' }}
                            placeholder="2 cups"
                            data-testid={`input-ingredient-quantity-${index}`}
                          />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              const newIngredients = [...scannedRecipe.ingredients];
                              newIngredients[index] = quantity ? `${quantity} ${e.target.value}` : e.target.value;
                              setScannedRecipe(prev => ({ ...prev!, ingredients: newIngredients }));
                            }}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-sm"
                            style={{ fontSize: '16px' }}
                            placeholder="flour"
                            data-testid={`input-ingredient-name-${index}`}
                          />
                          <button
                            onClick={() => {
                              const newIngredients = scannedRecipe.ingredients.filter((_, i) => i !== index);
                              setScannedRecipe(prev => ({ ...prev!, ingredients: newIngredients }));
                            }}
                            className="h-12 px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
                            data-testid={`button-remove-ingredient-${index}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      setScannedRecipe(prev => ({ 
                        ...prev!, 
                        ingredients: [...prev!.ingredients, '']
                      }));
                    }}
                    className="text-[#22c55e] hover:text-[#16a34a] text-sm font-medium h-12"
                    data-testid="button-add-ingredient"
                  >
                    + Add Ingredient
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToPantry}
                disabled={isAddingToPantry || scannedRecipe.ingredients.length === 0}
                className="w-full bg-[#22c55e] text-white h-12 px-4 rounded-lg font-medium hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-4"
                data-testid="button-add-pantry"
              >
                {isAddingToPantry ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding to Pantry...
                  </>
                ) : (
                  <>
                    🛒 Add Ingredients to Pantry
                  </>
                )}
              </button>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Instructions</label>
                <div className="space-y-3">
                  {scannedRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex flex-col sm:flex-row gap-2 items-start">
                        <span className="text-sm text-slate-500 mt-2 min-w-[20px] flex-shrink-0">{index + 1}.</span>
                        <textarea
                          value={instruction}
                          onChange={(e) => {
                            const newInstructions = [...scannedRecipe.instructions];
                            newInstructions[index] = e.target.value;
                            setScannedRecipe(prev => ({ ...prev!, instructions: newInstructions }));
                          }}
                          onKeyDown={handleKeyDown}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#22c55e] text-sm resize-none"
                          style={{ fontSize: '16px' }}
                          rows={2}
                          placeholder="Instruction step"
                          data-testid={`input-instruction-${index}`}
                        />
                        <button
                          onClick={() => {
                            const newInstructions = scannedRecipe.instructions.filter((_, i) => i !== index);
                            setScannedRecipe(prev => ({ ...prev!, instructions: newInstructions }));
                          }}
                          className="h-12 px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium whitespace-nowrap"
                          data-testid={`button-remove-instruction-${index}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setScannedRecipe(prev => ({ 
                        ...prev!, 
                        instructions: [...prev!.instructions, '']
                      }));
                    }}
                    className="text-[#22c55e] hover:text-[#16a34a] text-sm font-medium h-12"
                    data-testid="button-add-instruction"
                  >
                    + Add Step
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <button
                  onClick={handleSaveRecipe}
                  disabled={isProcessing || (isTutorialActive && !scannedRecipe)}
                  className="w-full bg-[#22c55e] text-white h-12 px-4 rounded-lg font-medium hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  data-testid="button-save-recipe"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving Recipe...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Save Scanned Recipe
                    </>
                  )}
                </button>

                {isTutorialActive && (
                  <div className="text-xs text-gray-500 text-center">
                    📚 Tutorial mode - Recipe will be saved when you complete the tutorial
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
        </div>
      </div>

      {showInfoModal && <InfoModal />}
    </>
  );
};

export default RecipeBookScannerScreen;
