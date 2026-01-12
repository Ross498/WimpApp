import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { CACHE_KEYS } from '@/lib/cacheKeys';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/components/ui/toast';
import { MealCard } from '@/components/MealCard';
import { CategoryGrid } from '@/components/CategoryGrid';
import ComprehensiveRecipeCard from '../components/ComprehensiveRecipeCard';
import RecipeBookScannerScreen from './RecipeBookScannerScreen';

const carrotIcon = '/attached_assets/Carrot_icon-icons.com_68773 (1)_1759598144077.png';
const bowlIcon = '/attached_assets/_meal_89750 (2)_1759598153214.png';

interface Recipe { 
  id: string | number;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty?: string;
  category: string;
  imageUrl?: string;
  ingredients: Array<{ item: string; quantity: string }> | string[];
  instructions: string[];
  canMakeNow?: boolean;
  missingIngredientsCount?: number;
  availableIngredientsCount?: number;
  totalIngredientsCount?: number;
  missingIngredients?: string[];
  isFavorite?: boolean;
  source?: string;
}

const MealsScreen = () => {
  // 🪝 HOOK ORDER DEBUGGING
  const hookCalls = useRef<string[]>([]);
  const renderCount = useRef(0);
  renderCount.current++;

  const [activeTab, setActiveTab] = useState<'fyp' | 'all'>('fyp');
  hookCalls.current.push('useState-activeTab');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  hookCalls.current.push('useState-currentCardIndex');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  hookCalls.current.push('useState-selectedRecipe');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  hookCalls.current.push('useState-showRecipeModal');
  const [showRecipeScanner, setShowRecipeScanner] = useState(false);
  hookCalls.current.push('useState-showRecipeScanner');
  const [selectedCategory, setSelectedCategory] = useState<{id: string; name: string; recipes: Recipe[]} | null>(null);
  hookCalls.current.push('useState-selectedCategory');
  const [showCategoryView, setShowCategoryView] = useState(false);
  hookCalls.current.push('useState-showCategoryView');
  const autoAdvanceEnabled = false;

  const { isAuthenticated } = useAuth();
  hookCalls.current.push('useAuth');
  const { toast } = useToast();
  hookCalls.current.push('useToast');
  
  useEffect(() => {
    console.log('🪝 MEALS SCREEN - Render #', renderCount.current, 'Hook Order:', hookCalls.current);
    hookCalls.current = [];
  });

  useEffect(() => {
    const handleOpenRecipeScanner = () => {
      setShowRecipeScanner(true);
    };
    window.addEventListener('openRecipeScanner', handleOpenRecipeScanner);
    return () => window.removeEventListener('openRecipeScanner', handleOpenRecipeScanner);
  }, []);

  // Query pantry ingredients to check if user has any
  const { data: ingredientsData } = useQuery({
    queryKey: ['/api/ingredients'],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const pantryIngredients = (ingredientsData as any)?.ingredients || [];
  const hasPantryIngredients = pantryIngredients.length > 0;

  const { data: recipesData, isLoading } = useQuery({
    queryKey: [...CACHE_KEYS.MEALS_UNIFIED, isAuthenticated],
    queryFn: async () => {
      try {
        const response = await fetch('/api/meals/unified?limit=100', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          return [];
        }

        const data = await response.json();
        return data.success && Array.isArray(data.recipes) ? data.recipes : [];
      } catch (error) {
        console.error('Failed to fetch meals:', error);
        return [];
      }
    },
    select: (data) => Array.isArray(data) ? data : [],
    retry: 2,
  });

  const recipes = recipesData || [];

  const forYouRecipes = useMemo(() => {
    const recipesWithPantryIngredients: Recipe[] = [];
    const recipesWithoutPantryIngredients: Recipe[] = [];

    recipes.forEach((recipe: Recipe) => {
      const totalCount = recipe.totalIngredientsCount || 0;
      const availableCount = recipe.availableIngredientsCount || 0;

      if (totalCount === 0) return;

      if (availableCount > 0) {
        recipesWithPantryIngredients.push(recipe);
      } else {
        recipesWithoutPantryIngredients.push(recipe);
      }
    });

    recipesWithPantryIngredients.sort((a: Recipe, b: Recipe) => {
      const aAvailable = a.availableIngredientsCount || 0;
      const bAvailable = b.availableIngredientsCount || 0;
      const aMissing = a.missingIngredientsCount || 0;
      const bMissing = b.missingIngredientsCount || 0;

      if (bAvailable !== aAvailable) return bAvailable - aAvailable;
      return aMissing - bMissing;
    });

    recipesWithoutPantryIngredients.sort((a: Recipe, b: Recipe) => {
      const aMissing = a.missingIngredientsCount || 0;
      const bMissing = b.missingIngredientsCount || 0;
      return aMissing - bMissing;
    });

    return [...recipesWithPantryIngredients, ...recipesWithoutPantryIngredients];
  }, [recipes]);

  const currentRecipe = forYouRecipes[currentCardIndex];

  useEffect(() => {
    if (activeTab === 'fyp' && autoAdvanceEnabled && forYouRecipes.length > 1) {
      const timer = setInterval(() => {
        setCurrentCardIndex((prevIndex) => {
          if (prevIndex < forYouRecipes.length - 1) {
            return prevIndex + 1;
          }
          return 0;
        });
      }, 5000);

      return () => clearInterval(timer);
    }
  }, [activeTab, autoAdvanceEnabled, forYouRecipes.length, currentCardIndex]);


  const trackPreferenceMutation = useMutation({
    mutationFn: async (data: { recipeId: string | number; preference: 'like' | 'dislike' }) => {
      try {
        const response = await apiRequest('/api/meal-preferences', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        return response;
      } catch {
        throw new Error('Failed to track preference');
      }
    },
    onSuccess: (_data, variables) => {
      if (variables.preference === 'like') {
        toast({
          title: "Great choice! ❤️",
          description: "We'll suggest more recipes like this",
        });
      }

      setTimeout(() => {
        if (currentCardIndex < forYouRecipes.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
        } else {
          setCurrentCardIndex(0);
        }
      }, 300);

      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.MEALS_UNIFIED });
    },
    onError: (error) => {
      console.error('Failed to track preference:', error);
    },
  });

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentRecipe) return;

    trackPreferenceMutation.mutate({
      recipeId: currentRecipe.id,
      preference: direction === 'right' ? 'like' : 'dislike'
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    const filteredRecipes = categoryId === 'favorites' 
      ? recipes.filter((recipe: Recipe) => recipe.isFavorite)
      : categoryId === 'scanned recipes'
      ? recipes.filter((recipe: Recipe) => recipe.source === 'scan' || recipe.source === 'scanned' || (recipe.category || '').toLowerCase() === 'scanned recipes')
      : recipes.filter((recipe: Recipe) => {
          const recipeCategory = (recipe.category || '').toLowerCase();
          return recipeCategory === categoryId.toLowerCase();
        });

    if (filteredRecipes.length > 0) {
      setSelectedCategory({
        id: categoryId,
        name: categoryId === 'favorites' ? 'Favorites' : categoryId === 'scanned' ? 'Scanned Recipes' : categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        recipes: filteredRecipes
      });
      setShowCategoryView(true);
    } else {
      toast({
        title: "No recipes found",
        description: `No recipes available in the ${categoryId} category yet.`,
        variant: "destructive"
      });
    }
  };

  const formatMealCardData = (recipe: Recipe) => {
    const imageUrl = recipe.imageUrl || '';
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

    return {
      id: String(recipe.id),
      name: recipe.name,
      image: imageUrl,
      cookTime: `${totalTime} min`,
      servings: recipe.servings,
      difficulty: recipe.difficulty || 'Easy',
      missingIngredients: recipe.missingIngredientsCount || 0
    };
  };

  const formatScrollableMealData = (recipe: Recipe) => {
    const imageUrl = recipe.imageUrl || '';
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

    return {
      id: String(recipe.id),
      title: recipe.name,
      image: imageUrl,
      cookTime: `${totalTime}min`,
      servings: recipe.servings,
      difficulty: recipe.difficulty || 'Easy',
      description: recipe.description || recipe.name,
      rating: 0
    };
  };

  const scrollableMeals = recipes.slice(0, 10).map(formatScrollableMealData);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden touch-pan-y">
      {/* FIXED: Navigation Tabs - Fixed position, won't scroll */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex justify-center items-center">
          <div className="inline-flex gap-8 px-4">
            <button 
              onClick={() => setActiveTab('fyp')}
              className={`flex items-center gap-2.5 py-3 px-1 ${
                activeTab === 'fyp' ? 'text-black' : 'text-gray-500'
              } bg-transparent border-b-2 ${
                activeTab === 'fyp' ? 'border-green-500' : 'border-transparent'
              } rounded-none outline-none whitespace-nowrap text-xl transition-colors relative`}
              data-testid="tab-for-you"
            >
              <img src={carrotIcon} alt="" className="h-7 object-contain" />
              <span className="font-medium">For You</span>
            </button>
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2.5 py-3 px-1 ${
                activeTab === 'all' ? 'text-black' : 'text-gray-500'
              } bg-transparent border-b-2 ${
                activeTab === 'all' ? 'border-green-500' : 'border-transparent'
              } rounded-none outline-none whitespace-nowrap text-xl transition-colors relative`}
              data-testid="tab-all"
            >
              <img src={bowlIcon} alt="" className="h-7 object-contain" />
              <span className="font-medium">ALL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content - FIXED: Vertical scroll only, no horizontal scroll */}
      <div className="flex-1 overflow-hidden">

        {/* For You Tab - Fixed container, no scrolling */}
        {activeTab === 'fyp' && (
          <div className="h-full flex flex-col items-center justify-center px-4 py-2 overflow-hidden touch-pan-y">
            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading meals...</p>
              </div>
            ) : !hasPantryIngredients ? (
              <div className="text-center px-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🥬</span>
                </div>
                <p className="text-gray-800 text-xl font-semibold mb-2">Your pantry is empty</p>
                <p className="text-gray-600 text-base">Add ingredients to your pantry to get personalized meal recommendations!</p>
              </div>
            ) : forYouRecipes.length > 0 && currentRecipe ? (
              <>
                <MealCard 
                  meal={formatMealCardData(currentRecipe)}
                  onSwipe={handleSwipe}
                  onTap={() => {
                    setSelectedRecipe(currentRecipe);
                    setShowRecipeModal(true);
                  }}
                />

                {/* Small progress indicator - non-interactive */}
                {forYouRecipes.length > 1 && (
                  <div className="flex justify-center mt-4">
                    <div className="flex gap-1">
                      {forYouRecipes.map((_, index) => (
                        <div
                          key={index}
                          className={`w-1 h-1 rounded-full transition-colors duration-300 ${
                            index === currentCardIndex ? 'bg-green-500' : 'bg-green-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-600 text-lg">No meals available yet</p>
                <p className="text-gray-500 text-sm mt-2">Add some ingredients to get personalized recommendations!</p>
              </div>
            )}
          </div>
        )}

        {/* All Tab - Vertical scroll only, no horizontal scroll */}
        {activeTab === 'all' && (
          <div className="h-full overflow-y-auto overflow-x-hidden pb-20 touch-pan-y">
            <CategoryGrid 
              meals={scrollableMeals}
              recipes={recipes}
              onCategorySelect={handleCategorySelect}
              onMealClick={(mealId) => {
                const recipe = recipes.find(r => String(r.id) === mealId);
                if (recipe) {
                  setSelectedRecipe({
                    ...recipe,
                    difficulty: recipe.difficulty || 'Easy'
                  });
                  setShowRecipeModal(true);
                }
              }}
            />
          </div>
        )}

        {/* Comprehensive Recipe Modal */}
        {showRecipeModal && selectedRecipe && (
          <ComprehensiveRecipeCard
            recipe={{
              ...selectedRecipe,
              difficulty: selectedRecipe.difficulty || 'Easy'
            } as any}
            onClose={() => {
              setShowRecipeModal(false);
              setSelectedRecipe(null);
            }}
          />
        )}

        {/* Recipe Scanner Modal */}
        {showRecipeScanner && (
          <div className="fixed inset-0 z-50">
            <RecipeBookScannerScreen />
            <button 
              onClick={() => setShowRecipeScanner(false)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-lg z-10"
            >
              ✕
            </button>
          </div>
        )}

        {/* Category View Modal - Shows ALL recipes in category */}
        {showCategoryView && selectedCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
            <div className="bg-white w-full max-h-[90vh] rounded-t-3xl overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h2>
                <button
                  onClick={() => {
                    setShowCategoryView(false);
                    setSelectedCategory(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  data-testid="close-category-view"
                >
                  ✕
                </button>
              </div>

              {/* Recipe Grid - FIXED: Added bottom padding for navigation */}
              <div className="overflow-y-auto max-h-[calc(90vh-64px)] p-4 pb-20"> {/* ADDED: pb-20 */}
                <p className="text-sm text-gray-600 mb-4">{selectedCategory.recipes.length} recipes</p>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCategory.recipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        setShowRecipeModal(true);
                        setShowCategoryView(false);
                      }}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      data-testid={`category-recipe-${recipe.id}`}
                    >
                      <img
                        src={
                          recipe.imageUrl 
                            ? (recipe.imageUrl.startsWith('/attached_assets') || recipe.imageUrl.startsWith('/api/proxy-image')
                              ? recipe.imageUrl
                              : recipe.imageUrl.startsWith('http')
                              ? `/api/proxy-image?url=${encodeURIComponent(recipe.imageUrl)}`
                              : `/attached_assets/${recipe.imageUrl}`)
                            : '/api/placeholder/400/300'
                        }
                        alt={recipe.name}
                        className="w-full h-32 object-cover bg-gray-100"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== '/api/placeholder/400/300') {
                            target.src = '/api/placeholder/400/300';
                          }
                        }}
                      />
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{recipe.name}</h3>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>{(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                          <span>•</span>
                          <span>{recipe.servings} servings</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealsScreen;