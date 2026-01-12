// Centralized error handling utilities

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication', 
  VALIDATION = 'validation',
  API = 'api',
  UPLOAD = 'upload',
  SCAN = 'scan'
}

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  retry?: boolean;
  details?: any;
}

export class ErrorHandler {
  static createError(type: ErrorType, message: string, userMessage?: string, details?: any): AppError {
    return {
      type,
      message,
      userMessage: userMessage || message,
      retry: type === ErrorType.NETWORK,
      details
    };
  }

  static handleApiError(error: any, context: string): AppError {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return this.createError(
        ErrorType.NETWORK,
        `Network error in ${context}`,
        'Please check your internet connection and try again.',
        error
      );
    }

    if (error.status === 401) {
      return this.createError(
        ErrorType.AUTHENTICATION,
        'Authentication failed',
        'Your session has expired. Please log in again.',
        error
      );
    }

    if (error.status === 400) {
      return this.createError(
        ErrorType.VALIDATION,
        'Invalid request data',
        'Please check your input and try again.',
        error
      );
    }

    return this.createError(
      ErrorType.API,
      `API error in ${context}: ${error.message}`,
      'Something went wrong. Please try again.',
      error
    );
  }

  static handleScanError(error: any): AppError {
    if (error.message?.includes('file type')) {
      return this.createError(
        ErrorType.SCAN,
        'Invalid file type',
        'Please upload a valid image file (JPG, PNG, or WEBP).',
        error
      );
    }

    if (error.message?.includes('size')) {
      return this.createError(
        ErrorType.SCAN,
        'File too large',
        'Image file is too large. Please use a smaller image.',
        error
      );
    }

    if (error.message?.includes('No ingredients')) {
      return this.createError(
        ErrorType.SCAN,
        'No items detected',
        'No ingredients were detected in the image. Please ensure the image is clear and well-lit.',
        error
      );
    }

    return this.createError(
      ErrorType.SCAN,
      'Scan failed',
      'Failed to scan the image. Please try again with a clearer photo.',
      error
    );
  }

  static handleUploadError(error: any): AppError {
    if (error.message?.includes('network')) {
      return this.createError(
        ErrorType.NETWORK,
        'Upload failed due to network',
        'Upload failed. Please check your connection and try again.',
        error
      );
    }

    return this.createError(
      ErrorType.UPLOAD,
      'Upload failed',
      'Failed to upload file. Please try again.',
      error
    );
  }

  static getRetryMessage(errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.NETWORK:
        return 'Check your connection and retry';
      case ErrorType.SCAN:
        return 'Take a clearer photo and try again';
      case ErrorType.UPLOAD:
        return 'Try uploading again';
      default:
        return 'Try again';
    }
  }
}