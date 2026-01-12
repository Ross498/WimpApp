import React from 'react';
import { X } from 'lucide-react';

// Type helper for Lucide React icons to resolve ForwardRefExoticComponent issues
const Icon = (IconComponent: any) => IconComponent as React.FC<any>;

interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export const UnifiedModal: React.FC<UnifiedModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true,
  className = ''
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto ${className}`}>
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-close-modal"
              >
                {Icon(X)({ size: 24 })}
              </button>
            )}
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Specialized modal types for common use cases
export const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false
}) => (
  <UnifiedModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
    <div className="space-y-4">
      <p className="text-gray-600">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          data-testid="button-cancel"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          data-testid="button-confirm"
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </div>
  </UnifiedModal>
);

// Recipe detail modal type
export const RecipeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  recipe: any;
}> = ({ isOpen, onClose, recipe }) => (
  <UnifiedModal isOpen={isOpen} onClose={onClose} title={recipe?.name} size="lg">
    {recipe && (
      <div className="space-y-4">
        {recipe.imageUrl && (
          <img 
            src={recipe.imageUrl} 
            alt={recipe.name}
            className="w-full h-48 object-cover rounded-lg"
          />
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Prep Time:</span> {recipe.prepTime || 0} min
          </div>
          <div>
            <span className="font-medium">Cook Time:</span> {recipe.cookTime || 0} min
          </div>
          <div>
            <span className="font-medium">Calories:</span> {recipe.calories || 0}
          </div>
          <div>
            <span className="font-medium">Difficulty:</span> {recipe.difficulty || 'Easy'}
          </div>
        </div>
        {recipe.ingredients && (
          <div>
            <h4 className="font-semibold mb-2">Ingredients:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {recipe.ingredients.map((ingredient: string, index: number) => (
                <li key={index}>• {ingredient}</li>
              ))}
            </ul>
          </div>
        )}
        {recipe.instructions && (
          <div>
            <h4 className="font-semibold mb-2">Instructions:</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              {recipe.instructions.map((instruction: string, index: number) => (
                <li key={index} className="flex">
                  <span className="font-medium mr-2 text-blue-600">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    )}
  </UnifiedModal>
);