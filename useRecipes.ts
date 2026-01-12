import { useQuery } from '@tanstack/react-query';

export interface BackendRecipe {
  id: string;
  _id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: Array<{
    item: string;
    quantity: string;
  }>;
  instructions: string[];
  image: string;
  imageUrl: string;
  isFavorite: boolean;
  isAiGenerated: boolean;
  source: string;
  cuisine: string;
  dietaryTags: string[];
  nutritionInfo: any;
  flavorBoosters: string[];
  maxGrain: number;
  grainReward: number;
  healthScore: number;
}

export interface RecipesResponse {
  success: boolean;
  recipes: BackendRecipe[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const useRecipes = () => {
  return useQuery<RecipesResponse>({
    queryKey: ['/api/meals/unified'],
    queryFn: async () => {

      const response = await fetch('/api/meals/unified', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      
      const data = await response.json();

      
      return data;
    },
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });
};