// Enhanced error tracking system for UI debugging
import React from 'react';

export interface ErrorInfo {
  id: string;
  timestamp: number;
  type: 'js-error' | 'promise-rejection' | 'resource-error' | 'network-error' | 'react-error';
  message: string;
  stack?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  componentStack?: string;
  userAgent: string;
  viewport: string;
  additionalInfo?: any;
}

class ErrorTracker {
  private errors: ErrorInfo[] = [];
  private maxErrors = 100;
  private listeners: ((error: ErrorInfo) => void)[] = [];

  constructor() {
    this.setupGlobalErrorHandling();
  }

  private setupGlobalErrorHandling() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'js-error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        additionalInfo: {
          eventType: event.type,
          target: (event.target as any)?.tagName
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'promise-rejection',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        additionalInfo: {
          reason: event.reason,
          promise: event.promise
        }
      });
    });

    // Resource loading errors (images, scripts, etc.)
    window.addEventListener('error', (event) => {
      const target = event.target as HTMLElement;
      if (target && target !== (window as any) && target.tagName) {
        this.logError({
          type: 'resource-error',
          message: `Resource failed to load: ${target.tagName}`,
          url: (target as any).src || (target as any).href,
          additionalInfo: {
            tagName: target.tagName,
            src: (target as any).src,
            href: (target as any).href,
            id: target.id,
            className: target.className
          }
        });
      }
    }, true);

    // REMOVED: Network fetch hijacking was blocking React startup
    // Don't override window.fetch as it interferes with React initialization
  }

  public logError(errorData: Partial<ErrorInfo>) {
    const error: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ...errorData
    } as ErrorInfo;

    this.errors.push(error);
    
    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(error));

    // Console log for debugging
    console.error('Error tracked:', error);
  }

  public getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  public getErrorsByType(type: ErrorInfo['type']): ErrorInfo[] {
    return this.errors.filter(error => error.type === type);
  }

  public getRecentErrors(minutes: number = 5): ErrorInfo[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.errors.filter(error => error.timestamp > cutoff);
  }

  public addListener(listener: (error: ErrorInfo) => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: (error: ErrorInfo) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public clearErrors() {
    this.errors = [];
  }

  public exportErrors(): string {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      errors: this.errors,
      summary: {
        total: this.errors.length,
        byType: this.getErrorSummary(),
        recent: this.getRecentErrors(1).length
      }
    };

    return JSON.stringify(report, null, 2);
  }

  private getErrorSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.errors.forEach(error => {
      summary[error.type] = (summary[error.type] || 0) + 1;
    });
    return summary;
  }

  // React error boundary integration
  public logReactError(error: Error, errorInfo: { componentStack: string }) {
    this.logError({
      type: 'react-error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      additionalInfo: {
        name: error.name,
        componentStack: errorInfo.componentStack
      }
    });
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// React Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    errorTracker.logReactError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement('div', 
        { className: 'p-4 bg-red-50 border border-red-200 rounded-lg' },
        React.createElement('h3', 
          { className: 'text-red-800 font-bold mb-2' }, 
          'Something went wrong'
        ),
        React.createElement('p', 
          { className: 'text-red-700 text-sm' }, 
          this.state.error?.message
        ),
        React.createElement('button', 
          { 
            onClick: () => this.setState({ hasError: false, error: undefined }),
            className: 'mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700'
          }, 
          'Try Again'
        )
      );
    }

    return this.props.children;
  }
}

// Performance monitoring utilities
export const performanceMonitor = {
  measurePageLoad: () => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        totalLoadTime: navigation?.loadEventEnd - navigation?.navigationStart
      };
    }
    return null;
  },

  measureMemory: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  }
};