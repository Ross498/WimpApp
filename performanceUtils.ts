// Performance optimization utilities
import { useCallback, useRef } from 'react';

// Debounce hook for performance
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<number>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// Throttle hook for performance
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        return callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

// Image optimization utilities
export class ImageOptimizer {
  static async compressImage(
    file: File, 
    maxWidth: number = 800, 
    maxHeight: number = 600, 
    quality: number = 0.8
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  static async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Form data optimization
export class FormDataOptimizer {
  static appendFormData(formData: FormData, data: Record<string, any>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof File || value instanceof Blob) {
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
  }
}

// Memory cleanup utilities
export class MemoryManager {
  static cleanupImageUrls(urls: string[]): void {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  static createCleanupCallback(urls: string[]) {
    return () => this.cleanupImageUrls(urls);
  }
}