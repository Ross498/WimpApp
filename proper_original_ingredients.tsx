import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, Plus, Trash2, ArrowLeft, Camera, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  // Fetch ingredients using the correct API endpoint
  const { data: ingredientsData, isLoading, error } = useQuery({
    queryKey: ['/api/ingredients'],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/ingredients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ingredients');
      }

      return response.json();
    },
    enabled: !!localStorage.getItem('authToken'),
    staleTime: 0, // Always refetch to avoid stale data
    cacheTime: 0  // Don't cache data to prevent stale ingredient IDs
  });

  const ingredients = ingredientsData?.ingredients || [];

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
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });
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
            <h1 className="text-xl font-bold text-white">My Pantry</h1>
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
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
              />
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient({ ...newIngredient, quantity: parseInt(e.target.value) || 1 })}
                  className="flex-1"
                />
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
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
                onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
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