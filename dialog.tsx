import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="dialog-overlay"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 animate-fade-in"
        onClick={() => onOpenChange(false)}
        data-testid="dialog-backdrop"
      />
      
      {/* Content */}
      <div className="relative z-10 animate-scale-in">
        {children}
      </div>
    </div>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({ className, children }) => {
  return (
    <div 
      className={cn(
        'bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto',
        className
      )}
      data-testid="dialog-content"
    >
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return (
    <div className="border-b border-gray-200 p-4" data-testid="dialog-header">
      {children}
    </div>
  );
};

export const DialogTitle: React.FC<DialogTitleProps> = ({ children }) => {
  return (
    <h2 className="text-lg font-semibold text-gray-900" data-testid="dialog-title">
      {children}
    </h2>
  );
};

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children }) => {
  return (
    <p className="text-sm text-gray-600 mt-1" data-testid="dialog-description">
      {children}
    </p>
  );
};

export const DialogFooter: React.FC<DialogFooterProps> = ({ children }) => {
  return (
    <div className="border-t border-gray-200 p-4 flex gap-2 justify-end" data-testid="dialog-footer">
      {children}
    </div>
  );
};

// Confirmation Dialog Hook
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const confirm = (options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfig(options);
    setIsOpen(true);
  };

  const handleConfirm = () => {
    config?.onConfirm();
    setIsOpen(false);
    setConfig(null);
  };

  const handleCancel = () => {
    config?.onCancel?.();
    setIsOpen(false);
    setConfig(null);
  };

  const ConfirmDialog = () => {
    if (!config) return null;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancel}
              data-testid="confirm-dialog-cancel"
            >
              {config.cancelText || 'Cancel'}
            </Button>
            <Button
              variant={config.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              data-testid="confirm-dialog-confirm"
            >
              {config.confirmText || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return { confirm, ConfirmDialog };
};

// Animation styles
const dialogStyles = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = dialogStyles;
  document.head.appendChild(styleSheet);
}