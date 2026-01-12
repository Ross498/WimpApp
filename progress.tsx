import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className,
  ...props
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'lg':
        return 'h-4';
      default:
        return 'h-3';
    }
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div 
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          getSizeStyles()
        )}
        data-testid="progress-container"
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            getVariantStyles(),
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
          data-testid="progress-bar"
        />
      </div>
    </div>
  );
};

// Circular Progress Component
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  variant = 'default',
  showLabel = true,
  className
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return '#10b981'; // green-500
      case 'warning':
        return '#f59e0b'; // yellow-500
      case 'danger':
        return '#ef4444'; // red-500
      default:
        return '#3b82f6'; // blue-500
    }
  };

  return (
    <div 
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getVariantColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Step Progress Component
interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  labels = [],
  variant = 'default',
  className
}) => {
  const getVariantColor = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500 border-green-500 text-green-600';
      case 'warning':
        return 'bg-yellow-500 border-yellow-500 text-yellow-600';
      case 'danger':
        return 'bg-red-500 border-red-500 text-red-600';
      default:
        return 'bg-blue-500 border-blue-500 text-blue-600';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber <= currentStep;
          const isActive = stepNumber === currentStep;
          
          return (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all duration-200',
                    isCompleted || isActive
                      ? getVariantColor()
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  )}
                >
                  {stepNumber}
                </div>
                {labels[index] && (
                  <span className="mt-2 text-xs text-gray-600 text-center">
                    {labels[index]}
                  </span>
                )}
              </div>
              
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors duration-200',
                    stepNumber < currentStep ? getVariantColor() : 'bg-gray-300'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};