tags to enclose the entire modified code.
   b. Ensure that the indentation and formatting of the code are preserved.
   c. Do not use ellipsis (...) or any other placeholders to indicate omitted parts."

And the thinking section:
"Based on the attached file analysis, NO, the issues are NOT resolved. The previous agent claimed to fix the critical issues but left fundamental problems unaddressed. Let me fix the actual root causes now:

## 1. AI CHEF CHAT TEXT VISIBILITY - Fix white text issue
## 2. INGREDIENT SUBTRACTION SYSTEM - Fix actual database updates
## 3. CLEAR ALL BUTTON - Fix clear all ingredients functionality
## 4. DEMO DATA CONTAMINATION - Filter demo households from authentication
## 5. FRONTEND CACHE INVALIDATION - Fix UI refresh after operations"

The `<changes>` only directly address "CLEAR ALL BUTTON" and "FRONTEND CACHE INVALIDATION" in a very specific way (replacing a non-existent function). The other points are not addressed by the provided `<changes>`.

Since I must apply the provided `<changes>` *exactly* as they are, and they refer to a `clearAllIngredients` function that doesn't exist, I will have to assume the intent was to *add* this function, or to replace the *existing* `handleDeleteAllIngredients` with the logic from the provided `<new_str>`. The instruction "Add clear all functionality with proper cache invalidation" combined with the "Replacing" statement suggests the latter.

I will replace the *entire* `handleDeleteAllIngredients` function with the *logic* contained within the `<new_str>` of the provided changes, renaming it to `handleDeleteAllIngredients` to match the original function name, and adjusting the API endpoint if necessary to match the original function's likely intent. The `<new_str>` uses `/api/ingredients/clear-all` which is different from the original `handleDeleteAllIngredients` which uses `/api/ingredients` with `method: 'DELETE'`. I will use the endpoint from the `<new_str>` as it's part of the provided change.

I will *not* address points 1, 2, 4, or the cache invalidation parts of point 5 that are not covered by the provided snippet. I must strictly adhere to applying *only* the provided `<changes>`.

```typescript
// Applying the provided changes to the handleDeleteAllIngredients function
// The provided changes describe replacing a non-existent 'clearAllIngredients' function
// with a new implementation. The original code has 'handleDeleteAllIngredients'.
// I will adapt the logic from the <new_str> into the existing 'handleDeleteAllIngredients' function.
// The provided <new_str> uses '/api/ingredients/clear-all', which is a new endpoint.
// I will use this new endpoint as specified in the changes.
// The 'setIsClearing' and 'setShowClearSuccess' are not defined in the original scope.
// I will assume these are internal states for the original context and omit them,
// focusing on the API call and cache invalidation logic as the core change.
// The original function also used `refetch()`, which I will retain if it's part of the new logic, or omit if not.
// The provided <new_str> does not contain `refetch()`.
// It also mentions `queryClient.invalidateQueries({ queryKey: ['ingredients'] });` which is similar to the original's
// `queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });`.
// I will use the query keys provided in the <new_str>.

// Original `handleDeleteAllIngredients` starts here:
/*
  const handleDeleteAllIngredients = async () => {
    try {
      console.log('🗑️ CRITICAL CLEAR ALL: Starting comprehensive ingredient clearing');

      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};

      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        console.log('🗑️ CLEAR ALL: Using auth token');
      }

      const response = await fetch('/api/ingredients', {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });

      console.log('🗑️ CLEAR ALL: Response status:', response.status);
      const responseData = await response.json();
      console.log('🗑️ CLEAR ALL: Response data:', responseData);

      if (response.ok) {
        console.log('✅ CRITICAL CLEAR ALL SUCCESS: All ingredients deleted successfully');

        // COMPREHENSIVE CACHE INVALIDATION - invalidate ALL possible queries
        console.log('🔄 CRITICAL CACHE CLEAR: Invalidating ALL ingredient-related caches');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/household'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/pantry'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/meals/unified'] })
        ]);

        // Force immediate refresh of critical data
        await queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });

        // Dispatch custom event to notify all listening components
        window.dispatchEvent(new CustomEvent('ingredientsCleared', {
          detail: { success: true, message: responseData.message }
        }));

        // Additional forced refresh after delay to ensure UI updates
        setTimeout(async () => {
          console.log('🔄 SECONDARY REFRESH: Forcing additional data refresh');
          await refetch();
          await queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });
          console.log('✅ CLEAR ALL COMPLETE: All caches refreshed');
        }, 500);

        alert('All ingredients cleared successfully!');
      } else {
        console.error('❌ CLEAR ALL FAILED:', responseData);
        alert(`Failed to clear ingredients: ${responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🚨 CLEAR ALL CRITICAL ERROR:', error);
      alert(`Critical error clearing ingredients: ${error.message}`);
    }
  };
*/

// The provided <new_str> logic to be integrated into handleDeleteAllIngredients:
/*
const clearAllIngredients = async () => {
    try {
      setIsClearing(true); // State not defined in original context, will be omitted.

      const response = await fetch('/api/ingredients/clear-all', { // New endpoint
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate all ingredient-related queries
        queryClient.invalidateQueries({ queryKey: ['ingredients'] }); // New query keys
        queryClient.invalidateQueries({ queryKey: ['household', 'pantry'] }); // New query keys
        queryClient.invalidateQueries({ queryKey: ['mastery', 'progress'] }); // New query keys

        setShowClearSuccess(true); // State not defined in original context, will be omitted.
        setTimeout(() => setShowClearSuccess(false), 3000); // State not defined in original context, will be omitted.
      } else {
        throw new Error(result.message || 'Failed to clear ingredients');
      }
    } catch (error) {
      console.error('Error clearing ingredients:', error);
      // You could add an error toast here
    } finally {
      setIsClearing(false); // State not defined in original context, will be omitted.
    }
  };
*/
```
The provided changes only include a replacement for a function `clearAllIngredients`, which does not exist in the original code. The original code has a function `handleDeleteAllIngredients` that performs a similar action. I will apply the logic from the provided `<new_str>` to the existing `handleDeleteAllIngredients` function, adapting it to fit. I will also ensure that the query keys and endpoint mentioned in the `<new_str>` are used, and that any state variables not defined in the original scope (like `setIsClearing`, `setShowClearSuccess`) are omitted. The provided changes are specifically for the "Clear All" functionality, and other points in the thinking section are not addressed by the provided changes.

<replit_final_file>
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Camera, Plus, DollarSign } from 'lucide-react';
import { useLocation } from 'wouter';
import { getUnifiedIngredientIcon } from '@/utils/unifiedIconSystem';
import { getIngredientEmoji } from '@/utils/ingredientIcons';
import { useSubscription } from '@/hooks/useSubscription';
import CameraScanner from '@/components/CameraScanner';

export default function IngredientsScreen() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Import subscription hook
  const { isPremium } = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [newIngredientQuantity, setNewIngredientQuantity] = useState('1');
  const [newIngredientUnit, setNewIngredientUnit] = useState('kg');
  const [newIngredientCategory, setNewIngredientCategory] = useState('Vegetables');

  // Helper function to get category from ingredient name
  const getCategoryFromName = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('tomato') || lowerName.includes('onion') || lowerName.includes('carrot') || lowerName.includes('lettuce')) return 'Vegetables';
    if (lowerName.includes('apple') || lowerName.includes('banana') || lowerName.includes('orange')) return 'Fruits';
    if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('fish') || lowerName.includes('egg')) return 'Proteins';
    if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('butter')) return 'Dairy';
    if (lowerName.includes('bread') || lowerName.includes('rice') || lowerName.includes('pasta')) return 'Grains';
    return 'Other';
  };

  // Camera scanner state - simplified
  const [showScanModal, setShowScanModal] = useState(false);

  // Check for scan parameter from Smart Scan button
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('scan') === 'true') {
      console.log('📸 Opening scanner from URL parameter');
      setShowScanModal(true);
      window.history.replaceState({}, '', '/ingredients');
    }
  }, []);

  // Handle scan completion from CameraScanner
  const handleScanComplete = async (result: any) => {
    console.log('✅ INGREDIENTS SCREEN: Scan completed, refreshing ingredients:', result);

    // Force refresh ingredients data - invalidate both sources since we use smart detection
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] }),
      queryClient.refetchQueries({ queryKey: ['/api/ingredients'] })
    ]);

    // Additional forced refetch after short delay
    setTimeout(async () => {
      console.log('🔄 Secondary refetch for smart detection...');
      await queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });
      console.log('🔄 Secondary refetch completed');
    }, 500);

    console.log('🔄 Individual ingredients data refreshed after scan completion');

    // Close scanner after data refresh
    setShowScanModal(false);
  };





  // Fetch ingredients with smart detection (household first, fallback to individual)
  const { data: ingredientsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/ingredients'],
    queryFn: async () => {
      console.log('🔄 FETCHING: Getting ingredients with smart detection...');

      // Get auth token - use fresh token if needed
      let token = localStorage.getItem('authToken');

      // Generate fresh token if missing or invalid
      if (!token) {
        const freshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzMsInVzZXJuYW1lIjoidGVzdEBuZXd3aW1wLmFwcCIsImVtYWlsIjoidGVzdEBuZXd3aW1wLmFwcCIsIm5hbWUiOiJUZXN0IFVzZXIiLCJ1c2VySWQiOiIzMyIsImlhdCI6MTc1NDY2NTIyOCwiZXhwIjoxNzU0NzUxNjI4fQ.P5kUQFzMyI4YWcinbhlwVuHlwWxwHK15CI4qU7jE2Lo';
        localStorage.setItem('authToken', freshToken);
        token = freshToken;
        console.log('🔐 Auto-set fresh authentication token');
      }

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
      };

      // Try household pantry first
      let response = await fetch('/api/household/pantry', {
        headers,
        credentials: 'include',
      });

      let result;

      if (response.ok) {
        result = await response.json();
        console.log('🏠 FETCHING: Using household pantry data:', result);

        // Handle household pantry format
        if (result.success && result.data?.ingredients && Array.isArray(result.data.ingredients)) {
          const processed = {
            ingredients: result.data.ingredients.map((item: any) => ({
              id: item.id,
              name: item.ingredientName || item.name,
              quantity: item.quantity || 1,
              unit: item.unit || 'pieces',
              emoji: item.emoji || getIngredientEmoji(item.ingredientName || item.name || 'Unknown'),
              category: item.category || getCategoryFromName(item.ingredientName || item.name || 'Other')
            }))
          };
          console.log('🏠 FETCHING: Processed household ingredients:', processed.ingredients.length);
          return processed;
        }
      } else {
        // Fallback to individual ingredients
        console.log('👤 FETCHING: Household failed, trying individual ingredients...');
        response = await fetch('/api/ingredients', {
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch ingredients from both sources');
        }

        result = await response.json();
        console.log('👤 FETCHING: Individual ingredients response:', result);

        // Handle individual ingredients format
        if (result.ingredients && Array.isArray(result.ingredients)) {
          const processed = {
            ingredients: result.ingredients.map((item: any) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit || 'pieces',
              emoji: item.emoji || getIngredientEmoji(item.name || 'Unknown'),
              category: item.category || getCategoryFromName(item.name || 'Other')
            }))
          };
          console.log('👤 FETCHING: Processed individual ingredients:', processed.ingredients.length);
          return processed;
        }
      }

      console.log('🔄 FETCHING: No ingredients found, returning empty');
      return { ingredients: [] };
    },
    retry: true,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnMount: true // Always refetch on component mount
  });

  // Fetch financial overview data with authentication
  const { data: financialData } = useQuery({
    queryKey: ['/api/financial/overview'],
    queryFn: async () => {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};

      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/financial/overview', {
        headers,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch financial data');
      return response.json();
    },
    retry: 1
  });

  const ingredients = (ingredientsData as any)?.ingredients || [];
  const financialOverview = (financialData as any)?.data || {};

  // DEBUG: Log the actual ingredients data structure
  console.log('🔍 INGREDIENTS DEBUG: Raw data from API:', ingredientsData);
  console.log('🔍 INGREDIENTS DEBUG: Ingredients array:', ingredients);
  console.log('🔍 INGREDIENTS DEBUG: Ingredients count:', ingredients.length);
  console.log('🔍 INGREDIENTS DEBUG: First ingredient structure:', ingredients[0]);
  // FIXED: Add null check before mapping
  console.log('🔍 INGREDIENTS DEBUG: Sample ingredient names:', ingredients && ingredients.length > 0 ? ingredients.slice(0, 3).map((ing: any) => ing.name) : 'No ingredients');

  const filteredIngredients = ingredients.filter((ingredient: any) => {
    const matchesCategory = selectedCategory === 'All' || ingredient.category === selectedCategory;
    return matchesCategory;
  });

  // DEBUG: Log filtered ingredients
  console.log('🔍 FILTER DEBUG: Selected category:', selectedCategory);
  console.log('🔍 FILTER DEBUG: Filtered ingredients count:', filteredIngredients.length);
  // FIXED: Add null check before mapping
  console.log('🔍 FILTER DEBUG: Filtered ingredients:', filteredIngredients && filteredIngredients.length > 0 ? filteredIngredients.map((ing: any) => ({ id: ing.id, name: ing.name, category: ing.category })) : 'No filtered ingredients');

  // Calculate pantry stats
  const totalIngredients = ingredients.length;

  // Mutation to delete an ingredient
  const deleteIngredientMutation = useMutation({
    mutationFn: async (ingredientId: string) => {
      console.log('🗑️ Deleting ingredient:', ingredientId);
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};

      if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/ingredients/${ingredientId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to delete ingredient:', errorData);
        throw new Error(errorData.message || 'Failed to delete ingredient');
      }

      const result = await response.json();
      console.log('✅ Ingredient deleted successfully:', result);
      return result;
    },
    onSuccess: () => {
      console.log('🔄 Invalidating ingredients query after deletion');
      queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
    },
    onError: (error) => {
      console.error('❌ Delete ingredient mutation error:', error);
    }
  });

  // Delete all ingredients function - ENHANCED WITH COMPREHENSIVE CACHE INVALIDATION
  const handleDeleteAllIngredients = async () => {
    try {
      // The following state variables were not defined in the original component scope and are omitted:
      // setIsClearing(true); 
      // setShowClearSuccess(true);

      const response = await fetch('/api/ingredients/clear-all', { // Using endpoint from provided changes
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        // Invalidate all ingredient-related queries using query keys from provided changes
        console.log('🔄 CACHE INVALIDATION: Clearing related caches...');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['ingredients'] }), // New query key
          queryClient.invalidateQueries({ queryKey: ['household', 'pantry'] }), // New query key
          queryClient.invalidateQueries({ queryKey: ['mastery', 'progress'] }) // New query key
        ]);
        console.log('✅ CACHE INVALIDATION: Complete.');

        // The original function had additional refetches and event dispatching,
        // but the provided changes do not include them, so they are omitted here
        // to adhere strictly to the provided changes.
        // For example:
        // await queryClient.refetchQueries({ queryKey: ['/api/ingredients'] });
        // window.dispatchEvent(new CustomEvent('ingredientsCleared', { ... }));
        // setTimeout(async () => { await refetch(); await queryClient.refetchQueries({ queryKey: ['/api/ingredients'] }); ... });

        alert('All ingredients cleared successfully!');
      } else {
        console.error('❌ Failed to clear ingredients:', result.message || 'Unknown error');
        alert(`Failed to clear ingredients: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🚨 Error clearing ingredients:', error);
      alert(`Critical error clearing ingredients: ${error.message}`);
    } finally {
      // The following state variable was not defined in the original component scope and is omitted:
      // setIsClearing(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!newIngredientName.trim()) {
      console.error('❌ ADD DEBUG: Ingredient name is required');
      return;
    }

    const newIngredient = {
      name: newIngredientName,
      quantity: parseFloat(newIngredientQuantity) || 1,
      unit: newIngredientUnit || 'units',
      category: newIngredientCategory,
      emoji: getIngredientEmoji(newIngredientName)
    };

    console.log('🍯 MANUAL ADD: Starting ingredient addition process');
    console.log('🍯 MANUAL ADD: Ingredient data:', newIngredient);

    try {
      // Enhanced token management with multiple fallback strategies
      let token = localStorage.getItem('authToken');
      console.log('🔐 TOKEN CHECK: Initial token from localStorage:', token ? `exists (${token.length} chars)` : 'missing');

      // Check if token exists and is properly formatted (JWT has 3 parts separated by dots)
      if (!token || !token.includes('.')) {
        console.log('🔐 TOKEN CHECK: Invalid or missing token, trying fallbacks...');

        // Try to get token from authService
        try {
          const authService = (await import('../services/authService')).default.getInstance();
          const serviceToken = authService.getToken();
          if (serviceToken) {
            token = serviceToken;
            localStorage.setItem('authToken', token);
            console.log('🔐 TOKEN CHECK: Got token from authService');
          }
        } catch (serviceError) {
          console.log('🔐 TOKEN CHECK: AuthService unavailable');
        }

        // Final fallback - use demo token for tutorial mode
        if (!token) {
          token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzMsInVzZXJuYW1lIjoidGVzdEBuZXd3aW1wLmFwcCIsImVtYWlsIjoidGVzdEBuZXd3aW1wLmFwcCIsIm5hbWUiOiJUZXN0IFVzZXIiLCJ1c2VySWQiOiIzMyIsImlhdCI6MTc1NDY2NTIyOCwiZXhwIjoxNzU0NzUxNjI4fQ.P5kUQFzMyI4YWcinbhlwVuHlwWxwHK15CI4qU7jE2Lo';
          localStorage.setItem('authToken', token);
          console.log('🔐 TOKEN CHECK: Using demo token for tutorial mode');
        }
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      console.log('🔗 REQUEST SETUP: Headers prepared with token authentication');

      // SMART ROUTING: Try household first, then individual
      console.log('🏠 SMART ROUTING: Step 1 - Attempting household pantry addition...');

      let response = await fetch('/api/household/pantry/add', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(newIngredient)
      });

      let responseData;
      let usedEndpoint = 'unknown';

      console.log('🏠 HOUSEHOLD RESPONSE: Status:', response.status);

      if (response.ok) {
        responseData = await response.json();
        usedEndpoint = 'household';
        console.log('✅ HOUSEHOLD SUCCESS: Ingredient added to household pantry');
        console.log('✅ HOUSEHOLD DATA:', responseData);
      } else {
        console.log('🏠 HOUSEHOLD FAILED: User not in household, trying individual endpoint...');

        // Fallback to individual ingredients endpoint
        response = await fetch('/api/ingredients', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(newIngredient)
        });

        console.log('👤 INDIVIDUAL RESPONSE: Status:', response.status);
        responseData = await response.json();
        usedEndpoint = 'individual';

        if (response.ok) {
          console.log('✅ INDIVIDUAL SUCCESS: Ingredient added to individual pantry');
          console.log('✅ INDIVIDUAL DATA:', responseData);
        } else {
          console.log('❌ INDIVIDUAL FAILED:', responseData);
        }
      }

      // Handle successful addition
      if (response.ok) {
        console.log(`🎉 SUCCESS: Ingredient "${newIngredientName}" added via ${usedEndpoint} endpoint`);

        // Reset form
        setShowAddModal(false);
        setNewIngredientName('');
        setNewIngredientQuantity('1');
        setNewIngredientUnit('kg');
        setNewIngredientCategory('Vegetables');

        // Force cache refresh for both endpoints to ensure UI updates
        console.log('🔄 CACHE REFRESH: Invalidating all ingredient queries...');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] }),
          queryClient.refetchQueries({ queryKey: ['/api/ingredients'] }),
          refetch()
        ]);

        console.log('✅ CACHE REFRESH: Complete - UI should update now');
      } else {
        console.error('❌ TOTAL FAILURE: Both household and individual endpoints failed');
        console.error('❌ FINAL STATUS:', response.status);
        console.error('❌ FINAL DATA:', responseData);
        console.error('❌ DEBUGGING INFO:', {
          token: token ? 'present' : 'missing',
          tokenLength: token?.length,
          tokenFormat: token?.includes('.') ? 'JWT-like' : 'invalid',
          ingredient: newIngredient,
          headers: headers
        });
      }

    } catch (error) {
      console.error('💥 EXCEPTION: Unexpected error in handleAddIngredient:', error);
      console.error('💥 ERROR DETAILS:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        ingredient: newIngredient
      });
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '16px'
    }}>
      <div className="max-w-md mx-auto">

        {/* My Pantry Header with Delete All Button */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-800">
              My Pantry
            </h1>
            {totalIngredients > 0 && (
              <button
                onClick={handleDeleteAllIngredients}
                className="flex items-center px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
                title="Delete all ingredients"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                </svg>
                Clear All
              </button>
            )}
          </div>
          <p className="text-center text-sm text-gray-600">
            {totalIngredients} ingredients • 0 expiring soon
          </p>
        </div>

        {/* Add Manually and Smart Scan Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center py-3 px-4 border-2 border-navy-300 rounded-xl text-navy-700 bg-navy-50 hover:bg-navy-100 transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            <Plus size={20} className="mr-2" />
            Add Manually
          </button>
          <button
            onClick={() => {
              console.log('🚀 SMART SCAN: Button clicked - opening scan modal');
              setShowScanModal(true);
            }}
            className="flex items-center justify-center py-3 px-4 border-2 border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg"
          >
            <Camera size={20} className="mr-2" />
            <div>
              <div>Smart Scan</div>
              <div className="text-xs opacity-90">Receipts & Ingredients</div>
            </div>
          </button>
        </div>

        {/* Remove the separate scanning modal - now handled by button click */}

        {/* Financial Overview with Premium Gating */}
        <div className="relative bg-white rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Financial Overview</h2>
            <button
              onClick={() => setLocation('/financial')}
              className="flex items-center px-3 py-1 bg-slate-800 text-white text-sm rounded-lg transition-all font-medium shadow-md hover:bg-slate-900 border-0 outline-none"
            >
              <DollarSign size={20} />
              <span>AI Finance</span>
            </button>
          </div>

          {/* Blurred preview content for freemium users */}
          <div className={`grid grid-cols-2 gap-4 mb-4 ${!isPremium ? 'blur-sm opacity-40' : ''}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                R{financialOverview.monthlySpending || '608.50'}
              </div>
              <div className="text-sm text-gray-600">Monthly Spending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                R{financialOverview.totalSavings || '45.20'}
              </div>
              <div className="text-sm text-gray-600">Savings</div>
            </div>
          </div>

          <div className={`grid grid-cols-2 gap-4 ${!isPremium ? 'blur-sm opacity-40' : ''}`}>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {financialOverview.receiptsScanned || 12}
              </div>
              <div className="text-sm text-gray-600">Receipts Scanned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 mb-1">
                {financialOverview.budgetUsed || 76}%
              </div>
              <div className="text-sm text-gray-600">Budget Used</div>
            </div>
          </div>

          {/* Prominent Subscribe Button for freemium users */}
          {!isPremium && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
              <div className="text-center p-4">
                <div className="text-2xl mb-2">🔒</div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Premium Feature</h3>
                <p className="text-sm text-gray-600 mb-3">Unlock advanced ingredient analysis</p>
                <button
                  onClick={() => setLocation('/subscription')}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {['All', 'Vegetables', 'Fruits', 'Proteins', 'Dairy'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Ingredients List */}
        <div className="bg-white rounded-lg" style={{
          border: '1px solid #e5e7eb'
        }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-green-500 mb-4"></div>
              <span className="text-lg font-medium">Loading your pantry...</span>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍯</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                No Ingredients Found
              </h4>
              <p className="text-gray-600 mb-6">
                Add your first ingredient to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {filteredIngredients.map((ingredient: any) => {
                console.log('🎨 RENDER DEBUG: Rendering ingredient:', { id: ingredient.id, name: ingredient.name, emoji: ingredient.emoji });
                return (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-center flex-1">
                      <div className="w-12 h-12 flex items-center justify-center">
                        {(() => {
                          // Always try to get the best icon (custom or emoji)
                          const iconResult = getUnifiedIngredientIcon(ingredient.name);

                          if (typeof iconResult === 'string' && iconResult.startsWith('/')) {
                            return (
                              <img
                                src={iconResult}
                                alt={ingredient.name}
                                className="w-10 h-10 object-contain rounded-lg"
                                style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))' }}
                                onError={(e) => {
                                  console.log(`❌ Failed to load icon for ${ingredient.name}: ${iconResult}`);
                                  // Replace with emoji on error
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-3xl">🍽️</span>`;
                                  }
                                }}
                              />
                            );
                          } else {
                            // Use emoji - prioritize API emoji or generated emoji
                            const displayEmoji = ingredient.emoji && ingredient.emoji !== '🍽️'
                              ? ingredient.emoji
                              : iconResult;
                            return <span className="text-3xl">{displayEmoji}</span>;
                          }
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-lg" title={`Ingredient: ${ingredient.name}`}>
                          {ingredient.name || 'Unknown Ingredient'}
                        </div>
                        <div className="text-gray-600 font-medium">
                          {ingredient.quantity || 0} {ingredient.unit || 'units'} • {ingredient.category || 'Uncategorized'}
                        </div>
                        {ingredient.quantity && parseInt(ingredient.quantity.toString()) <= 1 && parseInt(ingredient.quantity.toString()) > 0 && (
                          <div className="text-sm text-red-600 font-medium mt-1">⚠️ Low Stock</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        console.log('🗑️ DELETE CLICK: Deleting ingredient:', ingredient.id, ingredient.name);
                        // Use the mutation here instead of the direct function call
                        deleteIngredientMutation.mutate(String(ingredient.id));
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors ml-3"
                      title={`Delete ${ingredient.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {showScanModal && (
        <CameraScanner
          isOpen={showScanModal}
          onClose={() => {
            console.log('🔄 INGREDIENTS SCREEN: Closing camera scanner modal');
            setShowScanModal(false);
          }}
          onItemsDetected={handleScanComplete}
          scanType="ingredient_photo"
        />
      )}

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">Add Ingredient</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  placeholder="e.g., Tomato, Milk, Bread"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="text"
                  value={newIngredientQuantity}
                  onChange={(e) => setNewIngredientQuantity(e.target.value)}
                  placeholder="e.g., 5, 1, 500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit
                </label>
                <input
                  type="text"
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  placeholder="e.g., kg, pieces, ml"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newIngredientCategory}
                  onChange={(e) => setNewIngredientCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                >
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Proteins">Proteins</option>
                  <option value="Grains">Grains</option>
                  <option value="Spices">Spices</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIngredient}
                className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Add Ingredient
              </button>
            </div>
          </div>
        </div>
      )}





    </div>
  );
}