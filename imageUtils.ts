// Image utilities for cache-busting and loading optimization

export const createCacheBustImageUrl = (baseUrl: string, recipeId: string): string => {
  if (!baseUrl) return '';
  
  // Generate unique cache-busting parameters
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  const versionId = 'v3'; // Increment this to force global cache refresh
  
  // Check if URL already has query parameters
  const separator = baseUrl.includes('?') ? '&' : '?';
  
  return `${baseUrl}${separator}recipe_id=${recipeId}&t=${timestamp}&cache_bust=${randomId}&version=${versionId}`;
};

export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
};

export const validateImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a valid URL format
  try {
    new URL(url, window.location.origin);
    return true;
  } catch {
    return false;
  }
};