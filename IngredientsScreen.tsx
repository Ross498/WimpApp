import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Search, 
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Bell,
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuthTrigger } from '@/utils/authTriggers';
import { apiRequest } from '@/lib/queryClient';
import { ExpandableFAB } from '@/components/ExpandableFAB';
import CameraScanner from '@/components/CameraScanner';
import { notificationService } from '../utils/notificationService';
import { analyzeIngredientExpiry, formatExpiryDate } from '../utils/expiryTracker';
import VoiceAIRecorderScreen from './VoiceAIRecorderScreen';

// Get unified ingredient icon system
const getUnifiedIngredientIcon = (ingredientName: string): string => {
  const DEFAULT_INGREDIENT_ICON = '/attached_assets/u4417433892_minimalist_food_ingredient_icon_line_art_style_gr_28cff3e9-dd20-4f29-94ef-842f8ae7e53a_2%20(1)_1754426383712.png';

  const INGREDIENT_ICON_MAP: Record<string, string> = {
    // Fruits - New Emoji-Style Icons
    'apple': '/attached_assets/apple_fruit_food_icon_218380_1759611717852.png',
    'red apple': '/attached_assets/apple_fruit_food_icon_218380_1759611717852.png',
    'green apple': '/attached_assets/Greenapple_1754125200255.png',
    'orange': '/attached_assets/Orange_1754125200257.png',
    'banana': '/attached_assets/banana_fruit_food_icon_218382_1759611717852.png',
    'bananas': '/attached_assets/banana_fruit_food_icon_218382_1759611717852.png',
    'avocado': '/attached_assets/avocado_fruit_food_icon_218379_1759611717853.png',
    'lemon': '/attached_assets/lemon_fruit_food_icon_218391_1759611717849.png',
    'lemons': '/attached_assets/lemon_fruit_food_icon_218391_1759611717849.png',
    'lime': '/attached_assets/Lime_1754125200256.png',
    'limes': '/attached_assets/Lime_1754125200256.png',
    'grapes': '/attached_assets/grape_fruit_food_icon_218400_1759611717852.png',
    'grape': '/attached_assets/grape_fruit_food_icon_218400_1759611717852.png',
    'blueberries': '/attached_assets/Blueberries_1754125200254.png',
    'cherries': '/attached_assets/Cherries_1754125200255.png',
    'kiwi': '/attached_assets/kiwi_fruit_food_icon_218384_1759611717850.png',
    'kiwis': '/attached_assets/kiwi_fruit_food_icon_218384_1759611717850.png',
    'mango': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
    'mangos': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
    'mangoes': '/attached_assets/mango_fruit_food_icon_218383_1759611717851.png',
    'melon': '/attached_assets/melon_fruit_food_icon_218393_1759611664596.png',
    'watermelon': '/attached_assets/Melon_1754125200258.png',
    'pear': '/attached_assets/pear_fruit_food_icon_218392_1759611717849.png',
    'pears': '/attached_assets/pear_fruit_food_icon_218392_1759611717849.png',
    'peach': '/attached_assets/peach_fruit_food_icon_218397_1759611717849.png',
    'peaches': '/attached_assets/peach_fruit_food_icon_218397_1759611717849.png',
    'papaya': '/attached_assets/papaya_fruit_food_icon_218395_1759611717850.png',
    'papayas': '/attached_assets/papaya_fruit_food_icon_218395_1759611717850.png',
    'raspberry': '/attached_assets/raspberry_fruit_food_icon_218398_1759611717850.png',
    'raspberries': '/attached_assets/raspberry_fruit_food_icon_218398_1759611717850.png',
    'guava': '/attached_assets/guava_fruit_food_icon_218390_1759611717850.png',
    'guavas': '/attached_assets/guava_fruit_food_icon_218390_1759611717850.png',
    'pomegranate': '/attached_assets/pomegranate_fruit_food_icon_218396_1759611717851.png',
    'pomegranates': '/attached_assets/pomegranate_fruit_food_icon_218396_1759611717851.png',
    'pineapple': '/attached_assets/pineapple_fruit_food_icon_218399_1759611717851.png',
    'pineapples': '/attached_assets/pineapple_fruit_food_icon_218399_1759611717851.png',
    'lychee': '/attached_assets/lychee_fruit_food_icon_218381_1759611717851.png',
    'lychees': '/attached_assets/lychee_fruit_food_icon_218381_1759611717851.png',
    'strawberry': '/attached_assets/strawberry_fruit_food_icon_218386_1759611717852.png',
    'strawberries': '/attached_assets/strawberry_fruit_food_icon_218386_1759611717852.png',
    'dates': '/attached_assets/dates_fruit_food_icon_218405_1759611717849.png',
    'date': '/attached_assets/dates_fruit_food_icon_218405_1759611717849.png',

    // Vegetables
    'tomato': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_tomatto_o_b25eb3fd-7ea4-4225-8cb2-1044eaf615b8_2_1752835325559.png',
    'tomatoes': '/attached_assets/tomato_vegetables_vegetable_food_agriculture_fruit_icon_220810_1759611664601.png',
    'onion': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_brown_oni_e648d10a-e8a1-42cb-bb5c-ed09efc29425_2_1752835325558.png',
    'garlic': '/attached_assets/Garlic_1754125435666.png',
    'potato': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_bunch_of__baf4f65f-963b-4bfd-8e91-6305a8243bab_1_1752835325556.png',
    'potatoes': '/attached_assets/potatoes_potato_vegetables_vegetable_food_agriculture_icon_220839_1759611664599.png',
    'carrot': '/attached_assets/Carrot_1754125435667.png',
    'carrots': '/attached_assets/Carrot_1754125435667.png',
    'broccoli': '/attached_assets/Brocolli_1754125435666.png',
    'lettuce': '/attached_assets/Lettuce_1754125435666.png',
    'cucumber': '/attached_assets/Cucmunber_1754125435667.png',
    'cucumbers': '/attached_assets/Cucmunber_1754125435667.png',
    'chili': '/attached_assets/Chilli_1754125435666.png',
    'chilli': '/attached_assets/chilli_vegetables_vegetable_food_agriculture_spicy_icon_220813_1759611664601.png',
    'corn': '/attached_assets/Corn_1754125435667.png',
    'mushroom': '/attached_assets/Mushroom_1754125435663.png',
    'mushrooms': '/attached_assets/mushrooms_champignon_vegetables_vegetable_food_agriculture_icon_220834_1759611664598.png',
    'eggplant': '/attached_assets/Eggplant_1754125435668.png',
    'beans': '/attached_assets/Beans_1754125435664.png',
    'ginger': '/attached_assets/Ginger_1754125435665.png',
    'chestnut': '/attached_assets/Chestnut_1754125435665.png',
    'olive': '/attached_assets/Olive_1754125200253.png',
    'olives': '/attached_assets/Olive_1754125200253.png',
    'mint': '/attached_assets/mint_leaf_plant_agriculture_icon_220825_1759611664598.png',
    'spinach': '/attached_assets/spinach_vegetables_vegetable_food_agriculture_icon_220824_1759611664600.png',
    'pepper': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
    'peppers': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
    'bell pepper': '/attached_assets/pepper_vegetables_vegetable_food_agriculture_icon_220818_1759611664600.png',
    'pea': '/attached_assets/pea_peas_vegetables_vegetable_food_agriculture_icon_220816_1759611664600.png',
    'peas': '/attached_assets/pea_peas_vegetables_vegetable_food_agriculture_icon_220816_1759611664600.png',

    // Dairy & Proteins
    'cheese': '/attached_assets/Cheese_1754125920628.png',
    'butter': '/attached_assets/ingredient_creamy_restaurant_and_food_butter_icon_251526_1759612238807.png',
    'egg': '/attached_assets/egg_organic_protein_boiled_restaurant_and_food_eggs_icon_251538_1759612238807.png',
    'eggs': '/attached_assets/egg_organic_protein_boiled_restaurant_and_food_eggs_icon_251538_1759612238807.png',
    'bacon': '/attached_assets/32381bacon_98873_1759612238804.png',
    'sausage': '/attached_assets/sausage_sausages_fork_food_barbecue_icon_208023_1759612238809.png',
    'sausages': '/attached_assets/sausage_sausages_fork_food_barbecue_icon_208023_1759612238809.png',
    'shrimp': '/attached_assets/Chrimp_1754125751318.png',
    'crab': '/attached_assets/Crab_1754125751321.png',
    'lobster': '/attached_assets/Lobster_1754125751320.png',
    'oyster': '/attached_assets/Oyster_1754125751318.png',
    'steak': '/attached_assets/steak_meat_beefsteak_chop_food_barbecue_icon_208008_1759611956906.png',
    'beef': '/attached_assets/steak_meat_beefsteak_chop_food_barbecue_icon_208008_1759611956906.png',
    'meat': '/attached_assets/steak_meat_beefsteak_chop_food_barbecue_icon_208008_1759611956906.png',

    // Grains & Bakery
    'bread': '/attached_assets/Bread_1754125435661.png',
    'baguette': '/attached_assets/Baguette_1754125920628.png',
    'croissant': '/attached_assets/Croissant_1754125435660.png',
    'pasta': '/attached_assets/u4417433892_generate_an_animated_icon_for_an_actual_pasta_on__1b94745a-468a-4918-b76d-a8b115542c7e_1_1752835325560.png',
    'pizza': '/attached_assets/pizza_food_fast_food_italian_food_icon_208020_1759612238808.png',

    // Sweets & Desserts
    'cake': '/attached_assets/Cake_1754125920627.png',
    'cupcake': '/attached_assets/Cupcake_1754125920626.png',
    'ice cream': '/attached_assets/IceCream_1754125751318.png',
    'chocolate': '/attached_assets/Chocolate_1754125751317.png',
    'cookie': '/attached_assets/Cookie_1754125751317.png',

    // Drinks
    'juice': '/attached_assets/juice_box_orange_juice_fruit_drink_icon_210206_1759612238805.png',
    'orange juice': '/attached_assets/juice_box_orange_juice_fruit_drink_icon_210206_1759612238805.png',
    'soda': '/attached_assets/soda_drink_sparkles_can_bottle_icon_208015_1759612238808.png',
    'soft drink': '/attached_assets/soda_drink_sparkles_can_bottle_icon_208015_1759612238808.png',
    'tea': '/attached_assets/tea_bag_green_beans_coffee_pack_food_restaurant_bags_icon_251548_1759612238806.png',
    'coffee': '/attached_assets/tea_bag_green_beans_coffee_pack_food_restaurant_bags_icon_251548_1759612238806.png',
    'ice': '/attached_assets/Ice_1754125751315.png',

    // Condiments & Sauces
    'sauce': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
    'ketchup': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
    'mustard': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
    'condiment': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',
    'condiments': '/attached_assets/sauce_bottles_food_ketchup_mustard_icon_208025_1759611956906.png',

    // Canned foods
    'canned food': '/attached_assets/Canned food_1754125751322.png'
  };

  const lowerName = ingredientName.toLowerCase();

  // Direct match
  if (INGREDIENT_ICON_MAP[lowerName]) {
    return INGREDIENT_ICON_MAP[lowerName];
  }

  // Partial match
  for (const [key, value] of Object.entries(INGREDIENT_ICON_MAP)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return value;
    }
  }

  return DEFAULT_INGREDIENT_ICON;
};

interface Ingredient {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  image?: string;
  imageFallback?: string;
  expiryDate?: string | null;
  isExpired?: boolean;
  purchasePrice?: number | null;
  pricePerUnit?: number | null;
  storeName?: string | null;
  purchaseDate?: string | null;
}

// Category grouping configuration
const CATEGORY_GROUPS = {
  'Protein': ['proteins', 'dairy', 'meat', 'fish', 'seafood'],
  'Vegetables & Fruits': ['vegetables', 'fruits'],
  'Dairy': ['dairy', 'cheese', 'milk'],
  'Pantry Staples': ['grains', 'spices', 'condiments', 'canned', 'other']
};

export default function IngredientsScreen() {
  console.log('🔍 INGREDIENTS SCREEN: Starting component render');
  const [, setLocation] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    useSubscription();
    const { requireAuth } = useAuthTrigger();

    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'low' | 'expiring'>('all');
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [scannerConfig, setScannerConfig] = useState<{ isOpen: boolean; scanType: 'ingredient_photo' | 'receipt' }>({ 
      isOpen: false, 
      scanType: 'ingredient_photo' 
    });
    const [showAddForm, setShowAddForm] = useState(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [editingQuantities, setEditingQuantities] = useState<Record<number, { quantity: number; unit: string; expiryDate?: string | null }>>({});

    // iOS Notes-style swipe state
    const [swipedItem, setSwipedItem] = useState<number | null>(null);
    const [touchStart, setTouchStart] = useState<{ x: number; y: number; initialOffset: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Notification permission state
    const [notificationPermission, setNotificationPermission] = useState(notificationService.getPermissionState());
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

    // New ingredient form state
    const [newIngredient, setNewIngredient] = useState({
      name: '',
      quantity: 1,
      unit: 'pieces',
      category: 'vegetables',
      expiryDate: ''
    });

    // Prevent zoom on mobile
    useEffect(() => {
      const preventZoom = (e: Event) => {
        e.preventDefault();
      };

      // Disable double-tap to zoom
      document.addEventListener('dblclick', preventZoom, { passive: false });

      // Disable pinch-to-zoom
      document.addEventListener('gesturestart', preventZoom);
      document.addEventListener('gesturechange', preventZoom);
      document.addEventListener('gestureend', preventZoom);

      // Set viewport to prevent zoom
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      return () => {
        document.removeEventListener('dblclick', preventZoom);
        document.removeEventListener('gesturestart', preventZoom);
        document.removeEventListener('gesturechange', preventZoom);
        document.removeEventListener('gestureend', preventZoom);
      };
    }, []);

    // Fetch ingredients with unified API service
    const { data: ingredientsData, isLoading: ingredientsLoading, refetch: refetchIngredients } = useQuery({
      queryKey: ['/api/ingredients'],
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    });

    // Safe ingredients parsing with comprehensive error handling
    const ingredients: Ingredient[] = (() => {
      try {
        console.log('🥘 INGREDIENTS DATA STRUCTURE:', { 
          hasIngredients: !!(ingredientsData as any)?.ingredients,
          dataType: typeof ingredientsData,
          directProps: ingredientsData ? Object.keys(ingredientsData) : [],
          raw: ingredientsData
        });

        const ingredientsList = (ingredientsData as any)?.ingredients;
        if (Array.isArray(ingredientsList)) {
          return ingredientsList;
        }
        console.warn('🥘 INGREDIENTS: Not an array, returning empty list');
        return [];
      } catch (error) {
        console.error('🥘 INGREDIENTS PARSING ERROR:', error);
        return [];
      }
    })();

    // Unit-aware low stock logic - considers units when determining if an ingredient is low stock
    const isLowStock = (ingredient: Ingredient): boolean => {
      const { quantity, unit } = ingredient;

      if (!unit) {
        return quantity <= 2; // Fallback for items without units
      }

      const unitLower = unit.toLowerCase();

      // Weight-based thresholds
      if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
        return quantity <= 0.3; // Less than 300g
      }
      if (unitLower === 'g' || unitLower === 'gram' || unitLower === 'grams') {
        return quantity <= 50; // Less than 50g
      }

      // Volume-based thresholds
      if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters' || unitLower === 'litre' || unitLower === 'litres') {
        return quantity <= 0.2; // Less than 200ml
      }
      if (unitLower === 'ml' || unitLower === 'milliliter' || unitLower === 'milliliters' || unitLower === 'millilitre' || unitLower === 'millilitres') {
        return quantity <= 100; // Less than 100ml
      }
      if (unitLower === 'cup' || unitLower === 'cups') {
        return quantity <= 0.5; // Less than half cup
      }

      // Count-based thresholds
      if (unitLower === 'pieces' || unitLower === 'piece' || unitLower === 'items' || unitLower === 'item') {
        return quantity <= 2;
      }

      // Special cases
      if (unitLower === 'cloves' || unitLower === 'clove') {
        return quantity <= 1;
      }
      if (unitLower === 'slices' || unitLower === 'slice') {
        return quantity <= 2;
      }

      // Default fallback
      return quantity <= 2;
    };

    // Expiry warning logic - shows warning if ingredient expires within 3 days OR is already expired
    const isExpiringSoon = (ingredient: Ingredient): boolean => {
      if (!ingredient.expiryDate) return false;

      const today = new Date();
      const expiry = new Date(ingredient.expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 3; // Include expired (< 0), today (0), and expiring soon (1-3)
    };

    // Add ingredient mutation
    const addIngredientMutation = useMutation({
      mutationFn: async (ingredient: typeof newIngredient) => {
        const response = await apiRequest('/api/ingredients', {
          method: 'POST',
          body: JSON.stringify(ingredient)
        });

        const result = response;
        console.log('✅ Added ingredient via unified endpoint:', result);
        return result;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
        refetchIngredients();
        setNewIngredient({ name: '', quantity: 1, unit: 'pieces', category: 'vegetables', expiryDate: '' });
        setShowAddForm(false);
        toast({ title: 'Success', description: 'Ingredient added successfully' });
      },
      onError: (error: unknown) => {
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('Authentication'))) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          localStorage.removeItem('authToken');
          setTimeout(() => {
            window.location.href = '/auth-fix.html';
          }, 2000);
        } else {
          toast({
            title: 'Error',
            description: `Failed to add ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      }
    });

    // Update ingredient mutation
    const updateIngredientMutation = useMutation({
      mutationFn: async ({ id, quantity, unit, expiryDate }: { id: number; quantity: number; unit: string; expiryDate?: string }) => {
        const response = await apiRequest(`/api/ingredients/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity, unit, expiryDate })
        });
        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
        refetchIngredients();
        toast({ title: 'Success', description: 'Ingredient updated successfully' });
      },
      onError: (_error: unknown) => {
        toast({
          title: 'Update Failed',
          description: 'Failed to update ingredient. Please try again.',
          variant: 'destructive',
        });
      }
    });

    // Delete ingredient mutation
    const deleteIngredientMutation = useMutation({
      mutationFn: async (id: number) => {
        const response = await apiRequest(`/api/ingredients/${id}`, {
          method: 'DELETE'
        });

        return response;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
        refetchIngredients();
        toast({ title: 'Success', description: 'Ingredient deleted successfully' });
        setSwipedItem(null); // Reset swipe state after delete
        setSwipeOffset(0);
      },
      onError: (error: unknown) => {
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('Authentication'))) {
          toast({
            title: 'Authentication Error',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
          localStorage.removeItem('authToken');
          setTimeout(() => {
            window.location.href = '/auth-fix.html';
          }, 2000);
        } else {
          toast({
            title: 'Error',
            description: `Failed to delete ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      }
    });

    // Notification permission effect
    useEffect(() => {
      const shouldShow = notificationService.shouldShowPermissionPrompt();
      setShowNotificationPrompt(shouldShow);

      if (notificationPermission.granted) {
        notificationService.startPeriodicChecks();
      }
    }, [notificationPermission.granted]);

    // Handle scan completion - process scanned items
    const handleScanComplete = async (scannedItems: any[]) => {
      console.log('✅ INGREDIENTS SCREEN: Processing scanned items:', scannedItems);

      if (!scannedItems || scannedItems.length === 0) {
        console.log('⚠️ No items received from scanner');
        setScannerConfig({ ...scannerConfig, isOpen: false });
        return;
      }

      try {
        let addedCount = 0;
        let householdMode = false;

        for (const item of scannedItems) {
          const ingredientData = {
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'pieces',
            category: item.category || 'other',
            // Preserve provided expiryDate, or use estimated days if available, otherwise default to 7 days
            expiryDate: item.expiryDate || (item.estimatedExpiryDays ? new Date(Date.now() + item.estimatedExpiryDays * 24 * 60 * 60 * 1000).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
          };

          try {
            const householdResponse = await fetch('/api/household/pantry/add', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify(ingredientData)
            });

            if (householdResponse.ok) {
              console.log(`✅ Added ${item.name} to household pantry`);
              addedCount++;
              householdMode = true;
              continue;
            }
          } catch (error) {
            console.log(`⚠️ Household add failed for ${item.name}, trying individual...`);
          }

          try {
            const response = await fetch('/api/ingredients', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json'
              },
              credentials: 'include',
              body: JSON.stringify(ingredientData)
            });

            if (response.ok) {
              console.log(`✅ Added ${item.name} to individual pantry`);
              addedCount++;
            } else {
              const errorData = await response.json();
              console.error(`❌ Failed to add ${item.name}:`, errorData.error);
            }
          } catch (error) {
            console.error(`❌ Individual add failed for ${item.name}:`, error);
          }
        }

        if (addedCount > 0) {
          console.log('🔄 Refreshing ingredients list...');
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] }),
            queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] })
          ]);

          await refetchIngredients();

          toast({
            title: "Scan Complete",
            description: `Successfully added ${addedCount} ingredient${addedCount === 1 ? '' : 's'} to your ${householdMode ? 'household' : 'personal'} pantry.`,
          });
        } else {
          toast({
            title: "Scan Issue",
            description: "No ingredients could be added. Please try again or add manually.",
            variant: "destructive"
          });
        }

      } catch (error: any) {
        console.error('❌ Error processing scanned items:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to process scanned ingredients. Please try again.",
          variant: "destructive"
        });
      }

      setScannerConfig({ ...scannerConfig, isOpen: false });
    };

    // Handle add ingredient
    const handleAddIngredient = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '🥕 Add ingredients to your pantry! Sign up to track your ingredients, manage expiry dates, and get personalized cooking suggestions.')) {
        return;
      }

      if (newIngredient.name.trim()) {
        addIngredientMutation.mutate(newIngredient);
      }
    };

    // Handle save edited quantities and expiry dates
    const handleSaveQuantities = async () => {
      if (Object.keys(editingQuantities).length === 0) {
        setIsEditMode(false);
        setSelectedItems(new Set());
        return;
      }

      try {
        await Promise.all(
          Object.entries(editingQuantities).map(([id, { quantity, unit, expiryDate }]) =>
            updateIngredientMutation.mutateAsync({ 
              id: parseInt(id), 
              quantity, 
              unit, 
              expiryDate: expiryDate || undefined 
            })
          )
        );
        setEditingQuantities({});
        setSelectedItems(new Set());
        setIsEditMode(false);
      } catch (error) {
        console.error('Error updating quantities:', error);
      }
    };

    // Handle delete selected items
    const handleDeleteSelected = async () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '🗑️ Delete ingredients from your pantry! Sign up to manage and organize your personal ingredient collection.')) {
        return;
      }

      if (selectedItems.size === 0) return;

      if (confirm(`Are you sure you want to delete ${selectedItems.size} ingredient(s)?`)) {
        try {
          await Promise.all(
            Array.from(selectedItems).map(id => 
              deleteIngredientMutation.mutateAsync(id)
            )
          );
          setSelectedItems(new Set());
          setEditingQuantities({});
          setIsEditMode(false);
        } catch (error) {
          console.error('Error deleting ingredients:', error);
        }
      }
    };

    // Toggle item selection
    const toggleItemSelection = (id: number) => {
      const newSelection = new Set(selectedItems);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      setSelectedItems(newSelection);
    };

    // Toggle section collapse
    const toggleSection = (section: string) => {
      const newCollapsed = new Set(collapsedSections);
      if (newCollapsed.has(section)) {
        newCollapsed.delete(section);
      } else {
        newCollapsed.add(section);
      }
      setCollapsedSections(newCollapsed);
    };

    const handleNotificationPermission = async () => {
      const granted = await notificationService.requestPermission();
      setNotificationPermission(notificationService.getPermissionState());
      setShowNotificationPrompt(false);

      if (granted) {
        toast({
          title: "Notifications Enabled! 🔔",
          description: "You'll now receive alerts for expiring ingredients and low stock items.",
        });
        notificationService.startPeriodicChecks();
      }
    };

    // iOS Notes-style swipe handlers
    const handleTouchStart = (e: React.TouchEvent, ingredientId: number) => {
      if (isEditMode) return; // Disable swipe in edit mode
      const touch = e.touches[0];
      
      // If starting a swipe on a different item, reset the previous one
      if (swipedItem !== null && swipedItem !== ingredientId) {
        setSwipeOffset(0);
      }
      
      // Store initial state for this gesture
      const currentOffset = swipedItem === ingredientId ? swipeOffset : 0;
      setTouchStart({ 
        x: touch.clientX, 
        y: touch.clientY,
        initialOffset: currentOffset
      });
      setSwipedItem(ingredientId);
      if (swipedItem !== ingredientId) {
        setSwipeOffset(0);
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStart || isEditMode) return;
      const touch = e.touches[0];
      const deltaX = touchStart.x - touch.clientX;
      const deltaY = Math.abs(touchStart.y - touch.clientY);
      
      // Only swipe if horizontal movement is greater than vertical
      if (deltaY < 30) {
        // Calculate new offset relative to initial offset
        const newOffset = touchStart.initialOffset + deltaX;
        // Clamp between 0 and 150
        const clampedOffset = Math.max(0, Math.min(newOffset, 150));
        setSwipeOffset(clampedOffset);
      }
    };

    const handleTouchEnd = () => {
      if (!touchStart || isEditMode) return;
      
      // If swiped more than 75px, keep it open, otherwise close
      if (swipeOffset > 75) {
        setSwipeOffset(150); // Snap to open position
      } else {
        setSwipeOffset(0);
        setSwipedItem(null);
      }
      setTouchStart(null);
    };

    const handleEditIngredient = (ingredient: Ingredient) => {
      // Close swipe and enable edit mode for this item
      setSwipedItem(null);
      setSwipeOffset(0);
      setSelectedItems(new Set([ingredient.id]));
      setIsEditMode(true);
      setEditingQuantities({
        [ingredient.id]: {
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          expiryDate: ingredient.expiryDate || null
        }
      });
    };

    const handleDeleteIngredient = async (ingredientId: number) => {
      if (!requireAuth('SHOPPING_LIST', undefined, '🗑️ Delete ingredients from your pantry! Sign up to manage and organize your personal ingredient collection.')) {
        return;
      }
      
      if (confirm('Are you sure you want to delete this ingredient?')) {
        await deleteIngredientMutation.mutateAsync(ingredientId);
      }
    };

    // Analyze ingredients for expiry information
    const expiryAnalysis = analyzeIngredientExpiry(ingredients || []);
    const expiringCount = expiryAnalysis.summary.expired + expiryAnalysis.summary.expiringToday + expiryAnalysis.summary.expiringSoon;
    const lowStockCount = ingredients.filter(ingredient => isLowStock(ingredient)).length;

    // Filter ingredients based on mode
    const filteredIngredients = useMemo(() => {
      let filtered = ingredients.filter((ingredient: Ingredient) => {
        const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      });

      // Apply filter mode
      if (filterMode === 'low') {
        filtered = filtered.filter(isLowStock);
      } else if (filterMode === 'expiring') {
        filtered = filtered.filter(isExpiringSoon);
      }

      return filtered;
    }, [ingredients, searchTerm, filterMode]);

    // Group ingredients by category
    const groupedIngredients = useMemo(() => {
      const groups: Record<string, Ingredient[]> = {};

      Object.keys(CATEGORY_GROUPS).forEach(groupName => {
        groups[groupName] = [];
      });

      filteredIngredients.forEach(ingredient => {
        let assigned = false;

        for (const [groupName, categories] of Object.entries(CATEGORY_GROUPS)) {
          if (categories.some(cat => ingredient.category.toLowerCase().includes(cat))) {
            groups[groupName].push(ingredient);
            assigned = true;
            break;
          }
        }

        if (!assigned) {
          groups['Pantry Staples'].push(ingredient);
        }
      });

      return groups;
    }, [filteredIngredients]);

    // Get expiry badge
    const getExpiryBadge = (ingredient: Ingredient) => {
      if (!ingredient.expiryDate) return null;

      const today = new Date();
      const expiry = new Date(ingredient.expiryDate);
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Expired
          </span>
        );
      } else if (diffDays === 0) {
        return (
          <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Today
          </span>
        );
      } else if (diffDays <= 3) {
        return (
          <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {diffDays}d
          </span>
        );
      }

      return null;
    };

    // FAB handlers
    const handleReceiptClick = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '🧾 Scan receipts and track spending! Sign up to access AI-powered financial tracking.')) {
        return;
      }
      setScannerConfig({ isOpen: true, scanType: 'receipt' });
    };

    const handleIngredientScanClick = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '📷 Scan ingredients with your camera! Sign up to quickly add ingredients using AI vision.')) {
        return;
      }
      setScannerConfig({ isOpen: true, scanType: 'ingredient_photo' });
    };

    const handleManualAddClick = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '➕ Add ingredients manually! Sign up to build and manage your personal pantry.')) {
        return;
      }
      setShowAddForm(true);
    };

    const handleFinanceClick = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '💰 Access AI Finance Dashboard! Sign up to track spending, analyze trends, and save money.')) {
        return;
      }
      setLocation('/financial');
    };

    const handleVoiceRecordClick = () => {
      if (!requireAuth('SHOPPING_LIST', undefined, '🎤 Use Voice Recognition! Sign up to add ingredients by voice.')) {
        return;
      }
      setShowVoiceRecorder(true);
    };

    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden" style={{ touchAction: 'pan-y' }}>
        <div className="w-full max-w-full mx-auto bg-white overflow-x-hidden pb-24">
          {/* Edit Mode Bar - Shows when items are selected */}
          {isEditMode && selectedItems.size > 0 && (
            <div className="sticky top-0 z-30 bg-green-500 text-white p-4 flex items-center justify-between shadow-md">
              <span className="font-medium">{selectedItems.size} item(s) selected</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveQuantities}
                  className="flex items-center gap-2 bg-white text-green-600 px-4 py-2 rounded-lg hover:bg-green-50 transition-colors font-medium"
                  data-testid="button-save-quantities"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 bg-white text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  data-testid="button-delete-selected"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="bg-white p-4 border-b border-gray-200">
            {/* Notification Permission Prompt - Only render when needed */}
            {showNotificationPrompt && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Enable expiry alerts?</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleNotificationPermission}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      Allow
                    </button>
                    <button
                      onClick={() => setShowNotificationPrompt(false)}
                      className="px-3 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50 transition-colors"
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Status Indicator - Only render when needed */}
            {!showNotificationPrompt && notificationPermission.granted && (
              <div className="mb-4 flex items-center justify-center text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Bell className="w-3 h-3 text-green-600" />
                  <span>Notifications enabled</span>
                </div>
              </div>
            )}

            {/* Search Bar with Edit Icon */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white shadow-sm"
                style={{ touchAction: 'manipulation' }}
              />
              <button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) {
                    setSelectedItems(new Set());
                  }
                }}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors flex items-center justify-center ${
                  isEditMode ? 'bg-green-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                data-testid="button-edit-mode"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mt-3 justify-center">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="filter-all"
              >
                All ({ingredients.length})
              </button>
              <button
                onClick={() => setFilterMode('low')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterMode === 'low'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="filter-low"
              >
                Low Stock ({lowStockCount})
              </button>
              <button
                onClick={() => setFilterMode('expiring')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterMode === 'expiring'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                data-testid="filter-expiring"
              >
                Expiring ({expiringCount})
              </button>
            </div>
          </div>

          {/* Ingredients List - Grouped by Category */}
          <div className="pb-4">
            {ingredientsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading ingredients...</p>
              </div>
            ) : filteredIngredients.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No ingredients found</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting your filters or add some ingredients</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {Object.entries(groupedIngredients).map(([groupName, items]) => {
                  if (items.length === 0) return null;

                  const isCollapsed = collapsedSections.has(groupName);

                  return (
                    <div key={groupName} className="bg-white">
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(groupName)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{groupName}</h3>
                          <span className="text-sm text-gray-500">({items.length})</span>
                        </div>
                        {isCollapsed ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {/* Section Items */}
                      {!isCollapsed && (
                        <div className="divide-y divide-gray-100">
                          {items.map((ingredient) => {
                            const isLow = isLowStock(ingredient);
                            const isExpiring = isExpiringSoon(ingredient);
                            const isSwiped = swipedItem === ingredient.id;
                            const currentSwipeOffset = isSwiped ? swipeOffset : 0;

                            return (
                            <div
                              key={ingredient.id}
                              className="relative overflow-hidden"
                            >
                              {/* Swipe Action Buttons (Behind) */}
                              <div className="absolute right-0 top-0 bottom-0 flex items-center">
                                <button
                                  onClick={() => handleEditIngredient(ingredient)}
                                  className="bg-blue-500 text-white h-full px-6 flex items-center justify-center"
                                  data-testid={`button-edit-${ingredient.id}`}
                                >
                                  <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteIngredient(ingredient.id)}
                                  className="bg-red-500 text-white h-full px-6 flex items-center justify-center"
                                  data-testid={`button-delete-${ingredient.id}`}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>

                              {/* Main Content (Slides on swipe) */}
                              <div
                                className={`p-4 flex items-center gap-3 bg-white transition-transform ${
                                  isExpiring ? 'border-l-4 border-red-500 bg-red-50/30' : 
                                  isLow ? 'border-l-4 border-orange-500 bg-orange-50/30' : ''
                                }`}
                                style={{
                                  transform: `translateX(-${currentSwipeOffset}px)`,
                                  transition: touchStart ? 'none' : 'transform 0.3s ease'
                                }}
                                onTouchStart={(e) => handleTouchStart(e, ingredient.id)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                              >
                              {/* Checkbox in Edit Mode */}
                              {isEditMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedItems.has(ingredient.id)}
                                  onChange={() => toggleItemSelection(ingredient.id)}
                                  className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                                />
                              )}

                              {/* Ingredient Icon */}
                              <div className={`${
                                isExpiring ? 'ring-2 ring-red-400 rounded-lg' : 
                                isLow ? 'ring-2 ring-orange-400 rounded-lg' : ''
                              }`}>
                                <img
                                  src={getUnifiedIngredientIcon(ingredient.name)}
                                  alt={ingredient.name}
                                  className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                  onError={(e) => {
                                    e.currentTarget.src = getUnifiedIngredientIcon('default');
                                  }}
                                />
                              </div>

                              {/* Ingredient Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-800 truncate">
                                  {ingredient.name}
                                </h4>
                                {isEditMode && selectedItems.has(ingredient.id) ? (
                                  <div className="space-y-1 mt-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        value={editingQuantities[ingredient.id]?.quantity ?? ingredient.quantity}
                                        onChange={(e) => {
                                          const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                                          const finalValue = isNaN(newValue) ? 1 : Math.max(0, newValue);
                                          setEditingQuantities({
                                            ...editingQuantities,
                                            [ingredient.id]: {
                                              ...editingQuantities[ingredient.id],
                                              quantity: finalValue,
                                              unit: editingQuantities[ingredient.id]?.unit ?? ingredient.unit
                                            }
                                          });
                                        }}
                                        className="w-20 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                        min="0"
                                      />
                                      <select
                                        value={editingQuantities[ingredient.id]?.unit ?? ingredient.unit}
                                        onChange={(e) => {
                                          setEditingQuantities({
                                            ...editingQuantities,
                                            [ingredient.id]: {
                                              ...editingQuantities[ingredient.id],
                                              quantity: editingQuantities[ingredient.id]?.quantity ?? ingredient.quantity,
                                              unit: e.target.value
                                            }
                                          });
                                        }}
                                        className="px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                      >
                                        <option value="pieces">pieces</option>
                                        <option value="kg">kg</option>
                                        <option value="g">g</option>
                                        <option value="l">l</option>
                                        <option value="ml">ml</option>
                                      </select>
                                    </div>
                                    <input
                                      type="date"
                                      value={
                                        editingQuantities[ingredient.id]?.expiryDate 
                                          ? new Date(editingQuantities[ingredient.id].expiryDate!).toISOString().split('T')[0]
                                          : ingredient.expiryDate 
                                            ? new Date(ingredient.expiryDate).toISOString().split('T')[0]
                                            : ''
                                      }
                                      onChange={(e) => {
                                        setEditingQuantities({
                                          ...editingQuantities,
                                          [ingredient.id]: {
                                            ...editingQuantities[ingredient.id],
                                            quantity: editingQuantities[ingredient.id]?.quantity ?? ingredient.quantity,
                                            unit: editingQuantities[ingredient.id]?.unit ?? ingredient.unit,
                                            expiryDate: e.target.value ? new Date(e.target.value).toISOString() : null
                                          }
                                        });
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                      placeholder="Expiry date"
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      {ingredient.quantity} {ingredient.unit}
                                    </p>
                                    {ingredient.expiryDate && (
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {formatExpiryDate(ingredient.expiryDate)}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Expiry Badge */}
                              {getExpiryBadge(ingredient)}

                              {/* Low Stock Indicator */}
                              {isLow && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                                  Low
                                </span>
                              )}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expandable FAB */}
          <ExpandableFAB
            onVoiceClick={handleVoiceRecordClick}
            onReceiptClick={handleReceiptClick}
            onIngredientScanClick={handleIngredientScanClick}
            onManualAddClick={handleManualAddClick}
            onFinanceClick={handleFinanceClick}
          />

          {/* Unified Camera Scanner Modal */}
          <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center"><div className="text-white">Loading scanner...</div></div>}>
            <CameraScanner
              isOpen={scannerConfig.isOpen}
              onClose={() => setScannerConfig({ ...scannerConfig, isOpen: false })}
              scanType={scannerConfig.scanType}
              householdId={null}
              onItemsDetected={handleScanComplete}
            />
          </React.Suspense>

          {/* Voice AI Recorder Modal */}
          <VoiceAIRecorderScreen
            isOpen={showVoiceRecorder}
            onClose={() => setShowVoiceRecorder(false)}
            onItemsDetected={handleScanComplete}
          />

          {/* Add Ingredient Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Add Ingredient</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newIngredient.name}
                      onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Tomatoes"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={newIngredient.quantity}
                        onChange={(e) => {
                          const newValue = e.target.value === '' ? 0 : parseInt(e.target.value);
                          const finalValue = isNaN(newValue) ? 1 : Math.max(0, newValue);
                          setNewIngredient({ ...newIngredient, quantity: finalValue });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        value={newIngredient.unit}
                        onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="pieces">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="g">Grams</option>
                        <option value="l">Liters</option>
                        <option value="ml">Milliliters</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={newIngredient.category}
                      onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="proteins">Proteins</option>
                      <option value="dairy">Dairy</option>
                      <option value="grains">Grains</option>
                      <option value="spices">Spices</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newIngredient.expiryDate}
                      onChange={(e) => setNewIngredient({ ...newIngredient, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddIngredient}
                      disabled={addIngredientMutation.isPending}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {addIngredientMutation.isPending ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
}