import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Check, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthTrigger } from '@/utils/authTriggers';
import { apiRequest } from '@/lib/queryClient';
import { CACHE_KEYS } from '@/lib/cacheKeys';
import { getUnifiedIngredientIcon } from '@/utils/ingredientIcons';

const Icon = (IconComponent: any) => (props: any) => <IconComponent {...props} />;

interface ShoppingItem {
  id: number;
  userId: number;
  ingredientName: string;
  quantity: string;
  unit: string;
  completed: boolean;
  addedAt: string;
}

const ShoppingListScreen = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('unit');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthTrigger();

  const { data: shoppingData, isLoading } = useQuery({
    queryKey: [...CACHE_KEYS.SHOPPING_LIST, isAuthenticated],
    queryFn: async () => {
      const data = await apiRequest('/api/shopping');
      return data;
    },
    staleTime: 30000,
  });

  const shoppingItems: ShoppingItem[] = (() => {
    if (!shoppingData) return [];
    if (shoppingData.success && shoppingData.data?.items) return shoppingData.data.items;
    if (Array.isArray(shoppingData)) return shoppingData;
    return [];
  })();

  const addItemMutation = useMutation({
    mutationFn: async (newItem: { ingredientName: string; quantity: string; unit: string }) => {
      return await apiRequest('/api/shopping', {
        method: 'POST',
        body: JSON.stringify(newItem)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEYS.SHOPPING_LIST, isAuthenticated] });
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('unit');
      setShowAddModal(false);
      toast({ 
        title: "Item Added", 
        description: "Successfully added to your shopping list"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Add Item", 
        description: error.message || "Unable to add item",
        variant: "destructive"
      });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await apiRequest(`/api/shopping/${itemId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEYS.SHOPPING_LIST, isAuthenticated] });
      toast({ title: "Item Removed" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Remove Item", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: number; completed: boolean }) => {
      return await apiRequest(`/api/shopping/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ completed })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEYS.SHOPPING_LIST, isAuthenticated] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Update Item", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const clearAllCompletedMutation = useMutation({
    mutationFn: async (completedItemIds: number[]) => {
      return await Promise.all(
        completedItemIds.map(id => apiRequest(`/api/shopping/${id}`, { method: 'DELETE' }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CACHE_KEYS.SHOPPING_LIST, isAuthenticated] });
      toast({ 
        title: "Completed Items Cleared", 
        description: "All completed items have been removed"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to Clear Items", 
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter an ingredient name",
        variant: "destructive"
      });
      return;
    }

    if (!requireAuth('SHOPPING_LIST', undefined, '🛒 Create your shopping list! Sign up to save ingredients and track your purchases.')) {
      return;
    }

    addItemMutation.mutate({
      ingredientName: newItemName.trim(),
      quantity: newItemQuantity,
      unit: newItemUnit
    });
  };

  const handleToggleItem = (item: ShoppingItem) => {
    if (!requireAuth('SHOPPING_LIST', undefined, 'Sign in to update your shopping list')) {
      return;
    }
    toggleItemMutation.mutate({ itemId: item.id, completed: !item.completed });
  };

  const handleDeleteItem = (itemId: number) => {
    if (!requireAuth('SHOPPING_LIST', undefined, 'Sign in to manage your shopping list')) {
      return;
    }
    deleteItemMutation.mutate(itemId);
  };

  const activeItems = shoppingItems.filter(item => !item.completed);
  const completedItems = shoppingItems.filter(item => item.completed);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 pb-28 pt-4">
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            {Icon(ShoppingCart)({ className: "h-10 w-10 text-green-500 mr-3" })}
            <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
          </div>
          <p className="text-gray-600">
            {shoppingItems.length === 0 ? 'Start adding items to your list' : `${activeItems.length} active • ${completedItems.length} completed`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
          </div>
        ) : shoppingItems.length === 0 ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 p-12 text-center shadow-lg">
            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
              {Icon(ShoppingCart)({ className: "h-10 w-10 text-green-500" })}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Your list is empty</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start adding ingredients you need to buy. Tap the green button below to get started!
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Click the + button to add your first item</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3">
                  <h2 className="text-white font-semibold text-lg">Active Items ({activeItems.length})</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {activeItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                      data-testid={`item-${item.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => handleToggleItem(item)}
                          className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 transition-colors flex items-center justify-center flex-shrink-0"
                          data-testid={`checkbox-${item.id}`}
                        >
                          {toggleItemMutation.isPending ? (
                            <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : null}
                        </button>
                        <img 
                          src={getUnifiedIngredientIcon(item.ingredientName)} 
                          alt={item.ingredientName}
                          className="w-12 h-12 object-contain flex-shrink-0"
                          data-testid={`icon-${item.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{item.ingredientName}</h3>
                          <p className="text-sm text-gray-500">{item.quantity} {item.unit}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700"
                        data-testid={`delete-${item.id}`}
                      >
                        {Icon(Trash2)({ className: "h-5 w-5" })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <h2 className="text-gray-700 font-semibold text-lg">Completed ({completedItems.length})</h2>
                  <button
                    onClick={() => {
                      if (requireAuth('SHOPPING_LIST', undefined, 'Sign in to manage your shopping list')) {
                        clearAllCompletedMutation.mutate(completedItems.map(item => item.id));
                      }
                    }}
                    disabled={clearAllCompletedMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-clear-all-completed"
                  >
                    {clearAllCompletedMutation.isPending ? 'Clearing...' : 'Clear All'}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group opacity-60"
                      data-testid={`item-${item.id}`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <button
                          onClick={() => handleToggleItem(item)}
                          className="w-6 h-6 rounded-full bg-green-500 border-2 border-green-500 transition-colors flex items-center justify-center flex-shrink-0"
                          data-testid={`checkbox-${item.id}`}
                        >
                          {Icon(Check)({ className: "h-4 w-4 text-white" })}
                        </button>
                        <img 
                          src={getUnifiedIngredientIcon(item.ingredientName)} 
                          alt={item.ingredientName}
                          className="w-12 h-12 object-contain flex-shrink-0 opacity-60"
                          data-testid={`icon-${item.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate line-through">{item.ingredientName}</h3>
                          <p className="text-sm text-gray-500 line-through">{item.quantity} {item.unit}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={deleteItemMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700"
                        data-testid={`delete-${item.id}`}
                      >
                        {Icon(Trash2)({ className: "h-5 w-5" })}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (requireAuth('SHOPPING_LIST', undefined, '🛒 Sign in to create your shopping list')) {
            setShowAddModal(true);
          }
        }}
        className="fixed bottom-20 right-6 w-16 h-16 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group z-40"
        // Changed: bottom-24 to bottom-20
        data-testid="button-add-item"
      >
        {Icon(Plus)({ className: "h-8 w-8 group-hover:scale-110 transition-transform" })}
      </button>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Add Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                data-testid="button-close-modal"
              >
                {Icon(X)({ className: "h-6 w-6" })}
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label htmlFor="ingredient-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredient Name
                </label>
                <input
                  id="ingredient-name"
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Tomatoes, Milk, Bread"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  autoFocus
                  data-testid="input-ingredient-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    id="quantity"
                    type="text"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    placeholder="1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    data-testid="input-quantity"
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    id="unit"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white"
                    data-testid="select-unit"
                  >
                    <option value="unit">unit</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="pack">pack</option>
                    <option value="bunch">bunch</option>
                    <option value="can">can</option>
                    <option value="bottle">bottle</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemMutation.isPending}
                  className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  data-testid="button-submit"
                >
                  {addItemMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      {Icon(Plus)({ className: "h-5 w-5 mr-2" })}
                      Add Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingListScreen;
