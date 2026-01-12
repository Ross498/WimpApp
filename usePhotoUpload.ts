import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { useAuthToken } from './useAuthToken';
import { useToast } from '@/components/ui/toast';

// Unified interfaces for photo upload system
export interface PhotoUploadContext {
  type: 'external-meal' | 'app-meal' | 'recipe-completion';
  recipeId?: number;
  mealName?: string;
  userDescription?: string;
  manualIngredients?: string[];
  servings?: number;
  cookingTime?: number;
  flavorBooster?: string;
}

export interface PhotoUploadResult {
  success: boolean;
  overallScore: number;
  confidence: number;
  mealIdentification: {
    name: string;
    confidence: number;
    category: string;
  };
  ingredients: {
    detected: {
      name: string;
      quantity: string;
      unit: string;
      confidence: number;
      inPantry: boolean;
    }[];
    missing: string[];
    confidence: number;
  };
  nutritionalAnalysis: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    confidence: number;
  };
  pantryDeduction: {
    automaticDeduction: boolean;
    deductedIngredients: {
      name: string;
      deductedQuantity: string;
      remainingQuantity: string;
      unit: string;
    }[];
    manualIngredients: string[];
  };
  qualityAssessment: {
    photoQuality: number;
    plating: number;
    cookingTechnique: number;
    overall: number;
  };
  recommendations: string[];
  mealValidation: {
    isCookedMeal: boolean;
    hasMultipleComponents: boolean;
    showsCookingTechnique: boolean;
    isCompleteServing: boolean;
    validationScore: number;
    rejectionReason: string | null;
  };
  mealCompletion?: {
    recorded: boolean;
    totalMeals: number;
    keyAwarded: boolean;
  };
  error?: string;
  // Error handling properties
  partialSuccess?: boolean;
  errorTitle?: string;
  errorActions?: string[];
  retryable?: boolean;
  technicalDetails?: string;
  errorType?: string;
}

export interface PhotoUploadOptions {
  onSuccess?: (result: PhotoUploadResult) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
  retryOnFailure?: boolean;
}

/**
 * Unified Photo Upload Hook
 * 
 * Consolidates all photo upload functionality from:
 * - UploadMealScreen.tsx
 * - ComprehensiveRecipeCard.tsx  
 * - AI Photo Scorer Service
 * 
 * Provides single, consistent interface for all photo upload scenarios
 */
export const usePhotoUpload = (options: PhotoUploadOptions = {}) => {
  const { showToast = true, retryOnFailure = true } = options;
  // const authToken = useAuthToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Main photo upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ image, context }: { image: File | string; context: PhotoUploadContext }) => {
      console.log('📸 UNIFIED UPLOAD HOOK: Starting upload', { 
        type: context.type, 
        hasImage: !!image,
        mealName: context.mealName,
        recipeId: context.recipeId 
      });

      // Validate input
      if (!image) {
        throw new Error('Image is required');
      }

      // Use httpOnly cookies for authentication - no token needed
      console.log('🔐 PHOTO UPLOAD: Using httpOnly cookies for authentication');

      // Create FormData for upload
      const formData = new FormData();
      
      // Handle image input (File object or base64 string)
      if (image instanceof File) {
        formData.append('image', image);
      } else if (typeof image === 'string') {
        // Convert base64 to Blob for unified API
        const base64Response = await fetch(`data:image/jpeg;base64,${image}`);
        const blob = await base64Response.blob();
        formData.append('image', blob, 'meal.jpg');
      } else {
        throw new Error('Invalid image format');
      }

      // Add context data
      formData.append('type', context.type);
      
      if (context.recipeId) {
        formData.append('recipeId', context.recipeId.toString());
      }
      
      if (context.mealName) {
        formData.append('mealName', context.mealName);
      }
      
      if (context.userDescription) {
        formData.append('userDescription', context.userDescription);
      }
      
      if (context.manualIngredients && context.manualIngredients.length > 0) {
        formData.append('manualIngredients', JSON.stringify(context.manualIngredients));
      }
      
      if (context.servings) {
        formData.append('servings', context.servings.toString());
      }
      
      if (context.cookingTime) {
        formData.append('cookingTime', context.cookingTime.toString());
      }
      
      if (context.flavorBooster) {
        formData.append('flavorBooster', context.flavorBooster);
      }

      // Set upload progress to indicate processing
      setUploadProgress(50);

      // Make API call to unified endpoint
      const response = await fetch('/api/photo/upload', {
        method: 'POST',
        credentials: 'include', // Use httpOnly cookies for authentication
        body: formData
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      setUploadProgress(100);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload analysis failed');
      }

      // COMPREHENSIVE CACHE INVALIDATION - Ensure UI immediately reflects meal completion progress
      // Critical: Invalidate all queries related to meal progress, mastery, and ingredient tracking
      try {
        console.log('🔄 CACHE INVALIDATION: Starting comprehensive query invalidation after meal upload');
        
        // Core ingredient and pantry queries
        queryClient.invalidateQueries({ queryKey: ['/api/ingredients'] });
        queryClient.invalidateQueries({ queryKey: ['/api/household/pantry'] });
        queryClient.invalidateQueries({ queryKey: ['/api/household'] });
        
        // Mastery system queries - CRITICAL for immediate progress updates
        queryClient.invalidateQueries({ queryKey: ['/api/mastery/progress'] });
        queryClient.invalidateQueries({ queryKey: ['/api/mastery/ingredients'] });
        
        // Meal completion tracking queries - CRITICAL for Meal of the Week progress
        queryClient.invalidateQueries({ queryKey: ['/api/meal-completion/progress'] });
        
        // Meal plan tracking queries - for active tracking and session updates
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plan-tracking/active'] });
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plan-tracking/sessions'] });
        
        // Unified meals query - for recipe availability updates based on new ingredients
        queryClient.invalidateQueries({ queryKey: ['/api/meals/unified'] });
        
        // Meal plans - for generated meal plan updates
        queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
        
        console.log('✅ CACHE INVALIDATION: All meal completion queries invalidated successfully');
      } catch (invalidationError) {
        console.error('⚠️ CACHE INVALIDATION WARNING: Failed to invalidate some queries:', invalidationError);
        // Don't throw - successful upload shouldn't fail due to cache issues
      }

      console.log('✅ UNIFIED UPLOAD SUCCESS:', {
        score: result.data.overallScore,
        mealName: result.data.mealIdentification.name,
        deductedIngredients: result.data.pantryDeduction.deductedIngredients.length
      });

      return result.data as PhotoUploadResult;
    },
    onSuccess: (result) => {
      setUploadProgress(0); // Reset progress
      
      if (showToast) {
        const isSuccess = result.overallScore >= 70;
        toast({
          title: isSuccess ? "🎉 Great meal!" : "📸 Photo analyzed",
          description: isSuccess 
            ? `Scored ${result.overallScore}/100. ${result.pantryDeduction.deductedIngredients.length} ingredients deducted from pantry.`
            : `Scored ${result.overallScore}/100. ${result.mealValidation.rejectionReason || 'Try cooking a complete meal next time!'}`,
          variant: isSuccess ? "default" : "destructive"
        });
      }
      
      options.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setUploadProgress(0); // Reset progress
      
      console.error('❌ UNIFIED UPLOAD ERROR:', error);
      
      if (showToast) {
        toast({
          title: "Upload failed",
          description: error.message || 'Failed to analyze photo. Please try again.',
          variant: "destructive"
        });
      }
      
      options.onError?.(error);
    },
    retry: retryOnFailure ? 1 : false, // Retry once on failure
    retryDelay: 2000 // Wait 2 seconds before retry
  });

  // Convenience methods for different upload types
  const uploadExternalMeal = useCallback(
    (image: File | string, mealName: string, userDescription?: string, manualIngredients?: string[]) => {
      return uploadMutation.mutateAsync({
        image,
        context: {
          type: 'external-meal',
          mealName,
          userDescription,
          manualIngredients
        }
      });
    },
    [uploadMutation]
  );

  const uploadAppMeal = useCallback(
    (image: File | string, recipeId: number, servings?: number, cookingTime?: number, flavorBooster?: string) => {
      return uploadMutation.mutateAsync({
        image,
        context: {
          type: 'app-meal',
          recipeId,
          servings,
          cookingTime,
          flavorBooster
        }
      });
    },
    [uploadMutation]
  );

  const uploadRecipeCompletion = useCallback(
    (image: File | string, recipeId: number, mealName?: string, cookingTime?: number, flavorBooster?: string) => {
      return uploadMutation.mutateAsync({
        image,
        context: {
          type: 'recipe-completion',
          recipeId,
          mealName,
          cookingTime,
          flavorBooster
        }
      });
    },
    [uploadMutation]
  );

  // Generic upload method for maximum flexibility
  const uploadPhoto = useCallback(
    (image: File | string, context: PhotoUploadContext) => {
      return uploadMutation.mutateAsync({ image, context });
    },
    [uploadMutation]
  );

  return {
    // Primary methods
    uploadPhoto,
    uploadExternalMeal,
    uploadAppMeal,
    uploadRecipeCompletion,
    
    // State
    isUploading: uploadMutation.isPending,
    uploadProgress,
    error: uploadMutation.error,
    data: uploadMutation.data,
    
    // Control
    reset: uploadMutation.reset,
    
    // Status checks
    isSuccess: uploadMutation.isSuccess,
    isError: uploadMutation.isError,
    isIdle: uploadMutation.isIdle
  };
};

/**
 * Specialized hook for external meal uploads (UploadMealScreen)
 */
export const useExternalMealUpload = (options?: PhotoUploadOptions) => {
  const photoUpload = usePhotoUpload(options);
  
  return {
    upload: photoUpload.uploadExternalMeal,
    isUploading: photoUpload.isUploading,
    uploadProgress: photoUpload.uploadProgress,
    result: photoUpload.data,
    error: photoUpload.error,
    reset: photoUpload.reset,
    isSuccess: photoUpload.isSuccess,
    isError: photoUpload.isError
  };
};

/**
 * Specialized hook for recipe completion uploads (ComprehensiveRecipeCard)
 */
export const useRecipeCompletionUpload = (options?: PhotoUploadOptions) => {
  const photoUpload = usePhotoUpload(options);
  
  return {
    upload: photoUpload.uploadRecipeCompletion,
    isUploading: photoUpload.isUploading,
    uploadProgress: photoUpload.uploadProgress,
    result: photoUpload.data,
    error: photoUpload.error,
    reset: photoUpload.reset,
    isSuccess: photoUpload.isSuccess,
    isError: photoUpload.isError
  };
};

/**
 * Specialized hook for app meal uploads
 */
export const useAppMealUpload = (options?: PhotoUploadOptions) => {
  const photoUpload = usePhotoUpload(options);
  
  return {
    upload: photoUpload.uploadAppMeal,
    isUploading: photoUpload.isUploading,
    uploadProgress: photoUpload.uploadProgress,
    result: photoUpload.data,
    error: photoUpload.error,
    reset: photoUpload.reset,
    isSuccess: photoUpload.isSuccess,
    isError: photoUpload.isError
  };
};

/**
 * Hook for retrieving upload history and statistics
 */
export const usePhotoUploadHistory = () => {
  // const authToken = useAuthToken();
  
  // This would be implemented with actual API calls to the unified endpoints
  // For now, return placeholder structure
  return {
    history: [],
    stats: {
      totalUploads: 0,
      averageScore: 0,
      bestScore: 0,
      improvementTrend: 0
    },
    isLoading: false,
    error: null
  };
};

/**
 * Migration utility for existing components
 * Helps transition from old photo upload patterns to unified system
 */
export const createPhotoUploadAdapter = (legacyUploadFunction: Function) => {
  console.warn('📸 PHOTO UPLOAD ADAPTER: Using legacy upload function. Please migrate to usePhotoUpload hook.');
  
  return {
    upload: legacyUploadFunction,
    isUploading: false,
    uploadProgress: 0,
    result: null,
    error: null,
    reset: () => {},
    isSuccess: false,
    isError: false
  };
};

export default usePhotoUpload;