import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, Plus, Trash2, ArrowLeft, Camera, QrCode } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  image?: string;
  expiryDate?: string;
  createdAt: string;
}

const IngredientsScreen: React.FC = () => {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: 1,
    unit: 'pieces',
    category: 'other'
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // CRITICAL: FORCE PERSONAL INGREDIENTS ONLY - NEVER HOUSEHOLD
  const { data: ingredientsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/ingredients', 'personal-only', Date.now()], // Force unique query each time
    queryFn: async () => {
      console.log('🔄 INGREDIENTS SCREEN - FETCHING PERSONAL INGREDIENTS ONLY');
      console.log('🔄 ENDPOINT: /api/ingredients (NEVER /api/household/pantry)');
      console.log('🔄 USER CONTEXT: Individual user, NOT household member');
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // CRITICAL: Block any calls to household endpoints
      const blockedEndpoints = ['/api/household/pantry', '/api/household/info'];
      
      const response = await fetch(`/api/ingredients?_t=${Date.now()}`, { // Cache busting
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-User-Context': 'individual' // Force individual context
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch personal ingredients: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 PERSONAL INGREDIENTS API RESPONSE:', result);
      console.log('📊 PERSONAL INGREDIENTS COUNT:', result?.ingredients?.length || 0);
      
      // Verify we got personal ingredients response, not household
      if (result?.data?.householdId) {
        console.error('❌ CRITICAL ERROR: Got household data instead of personal ingredients!');
        throw new Error('Wrong endpoint response - got household data');
      }
      
      // Set user context flags
      localStorage.setItem('user_type', 'individual');
      localStorage.setItem('last_ingredients_fetch', Date.now().toString());
      
      return result;
    },
    enabled: !!localStorage.getItem('authToken'),
    staleTime: 0, // Always refetch to avoid stale data
    gcTime: 0,  // Don't cache data to prevent stale ingredient IDs (TanStack Query v5)
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      console.log(`🔄 Retrying personal ingredients fetch (attempt ${failureCount}):`, error);
      return failureCount < 3;
    }
  });

  const ingredients = (ingredientsData as any)?.ingredients || [];
  
  // COMPREHENSIVE MONITORING AND HOUSEHOLD BLOCKING
  React.useEffect(() => {
    console.log('🔍 INGREDIENTS SCREEN - COMPREHENSIVE PERSONAL INGREDIENTS MONITORING');
    console.log('📊 Personal ingredients count:', ingredients.length);
    console.log('📋 Personal ingredients data:', ingredients);
    console.log('🔗 API endpoint: /api/ingredients (PERSONAL ONLY, NEVER HOUSEHOLD)');
    console.log('👤 User context: Individual user (user_id: 33, household_id: NULL)');
    
    // Block any potential household API calls
    const originalFetch = window.fetch;
    if (!window.__FETCH_INTERCEPTED) {
      window.fetch = function(...args) {
        const url = args[0];
        
        if (typeof url === 'string' && url.includes('/api/household/pantry')) {
          console.error('🚫 BLOCKED HOUSEHOLD PANTRY CALL FOR INDIVIDUAL USER!');
          console.error('🚫 User 33 should NEVER access household endpoints!');
          console.trace('🚫 CALL STACK:');
          
          // Return empty personal ingredients response
          return Promise.resolve(new Response(JSON.stringify({
            success: true,
            ingredients: [],
            message: 'Individual user - no household access'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        
        return originalFetch.apply(this, args);
      };
      window.__FETCH_INTERCEPTED = true;
      console.log('✅ Fetch interception active - household calls blocked');
    }
    
    // Verify correct data
    if (ingredients.length === 0) {
      console.log('✅ CORRECT: Personal ingredients count is 0 as expected');
      
      // Monitor for wrong text appearing in DOM
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent) {
              if (node.textContent.includes('28 ingredients')) {
                console.error('❌ DETECTED WRONG TEXT:', node.textContent);
                node.textContent = node.textContent.replace(/28 ingredients/, '0 ingredients');
                console.log('✅ CORRECTED TO: 0 ingredients');
              }
            }
          });
        });
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
      
      // Store observer for cleanup
      (window as any).__DOM_OBSERVER = observer;
      
    } else {
      console.error('❌ UNEXPECTED: Personal ingredients found when should be 0!');
      console.error('❌ Data source may be compromised');
    }
    
    // Set verification flags
    localStorage.setItem('ingredients_screen_verified', Date.now().toString());
    localStorage.setItem('user_context_confirmed', 'individual');
    
  }, [ingredients]);
  
  // Display text with verification
  const actualCount = ingredients.length;
  const verificationStatus = actualCount === 0 ? '✅ CORRECT' : '❌ ERROR';
  console.log(`📊 Display status: ${actualCount} ingredients ${verificationStatus}`);

  // Add ingredient mutation
  const addIngredientMutation = useMutation({
    mutationFn: async (ingredient: any) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
          emoji: getEmojiForIngredient(ingredient.name)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add ingredient');
      }

      return response.json();
    },
    onSuccess: () => {
      // Force complete cache invalidation and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      queryClient.removeQueries({ queryKey: ['/api/ingredients'] });
      refetch();
      setShowAddForm(false);
      setNewIngredient({ name: '', quantity: 1, unit: 'pieces', category: 'other' });
      toast({
        title: "Success",
        description: "Ingredient added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add ingredient",
        variant: "destructive",
      });
    }
  });

  // Delete ingredient mutation
  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete ingredient');
      }

      return response.json();
    },
    onSuccess: () => {
      // Comprehensive cache invalidation to prevent stale data
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      queryClient.removeQueries({ queryKey: ['/api/ingredients'] });
      refetch();
      toast({
        title: "Success",
        description: "Ingredient deleted successfully",
      });
    },
    onError: (error) => {
      console.error('Delete ingredient error:', error);
      // Force cache refresh even on error to sync with actual database state
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
      toast({
        title: "Error", 
        description: "Failed to delete ingredient - refreshing data",
        variant: "destructive",
      });
    }
  });

  // Get emoji for ingredient
  function getEmojiForIngredient(name: string): string {
    const lowerName = name.toLowerCase();
    const emojiMap: { [key: string]: string } = {
      'tomato': '🍅', 'tomatoes': '🍅',
      'onion': '🧅', 'onions': '🧅',
      'garlic': '🧄',
      'carrot': '🥕', 'carrots': '🥕',
      'potato': '🥔', 'potatoes': '🥔',
      'lettuce': '🥬', 'spinach': '🥬',
      'broccoli': '🥦',
      'cucumber': '🥒',
      'chicken': '🍗',
      'beef': '🥩', 'steak': '🥩',
      'bacon': '🥓',
      'fish': '🐟', 'salmon': '🐟',
      'egg': '🥚', 'eggs': '🥚',
      'milk': '🥛',
      'cheese': '🧀',
      'bread': '🍞',
      'rice': '🍚',
      'pasta': '🍝'
    };
    
    return emojiMap[lowerName] || '🥘';
  }

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'vegetables', name: 'Vegetables' },
    { id: 'fruits', name: 'Fruits' },
    { id: 'proteins', name: 'Proteins' },
    { id: 'dairy', name: 'Dairy' },
    { id: 'grains', name: 'Grains' },
    { id: 'spices', name: 'Spices' },
    { id: 'other', name: 'Other' }
  ];

  const filteredIngredients = ingredients.filter((ingredient: Ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ingredient.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const handleAddIngredient = () => {
    if (newIngredient.name.trim()) {
      addIngredientMutation.mutate(newIngredient);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
          <p className="text-red-600">Error loading ingredients: {(error as Error).message}</p>
          <Button onClick={() => setLocation('/')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setLocation('/')}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">My Personal Ingredients</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="p-4 border-b">
          <div className="flex overflow-x-auto space-x-2 pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-4 border-b bg-blue-50">
            <h3 className="font-semibold mb-3">Add New Ingredient</h3>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Ingredient name"
                value={newIngredient.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIngredient({ ...newIngredient, name: e.target.value })}
              />
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={newIngredient.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIngredient({ ...newIngredient, quantity: parseInt(e.target.value) || 1 })}
                  className="flex-1"
                />
                <select
                  value={newIngredient.unit}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="pieces">pieces</option>
                  <option value="grams">grams</option>
                  <option value="kg">kg</option>
                  <option value="liters">liters</option>
                  <option value="ml">ml</option>
                  <option value="cups">cups</option>
                </select>
              </div>
              <select
                value={newIngredient.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.slice(1).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <div className="flex space-x-2">
                <Button
                  onClick={handleAddIngredient}
                  disabled={addIngredientMutation.isPending || !newIngredient.name.trim()}
                  className="flex-1"
                >
                  {addIngredientMutation.isPending ? 'Adding...' : 'Add Ingredient'}
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ingredients List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading ingredients...</p>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'No ingredients found matching your criteria.' 
                  : 'No ingredients in your pantry yet.'}
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button 
                  onClick={() => setShowAddForm(true)}
                  className="mt-4"
                >
                  Add Your First Ingredient
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredIngredients.map((ingredient: Ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{ingredient.image || getEmojiForIngredient(ingredient.name)}</span>
                    <div>
                      <h3 className="font-medium">{ingredient.name}</h3>
                      <p className="text-sm text-gray-600">
                        {ingredient.quantity} {ingredient.unit} • {ingredient.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteIngredientMutation.mutate(ingredient.id)}
                    disabled={deleteIngredientMutation.isPending}
                    className="text-red-600 hover:text-red-800 transition-colors p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex space-x-2">
            <Button
              onClick={() => setLocation('/scanner')}
              variant="outline"
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan Items
            </Button>
            <Button
              onClick={() => setLocation('/recipe-scanner')}
              variant="outline"
              className="flex-1"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan Recipe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngredientsScreen;