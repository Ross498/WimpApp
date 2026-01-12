// Centralized API utilities
interface ApiTestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
}

// Generic API request function with httpOnly cookie authentication
export async function makeApiRequest(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  // Use httpOnly cookies - no localStorage token handling needed
  console.log('🔐 APIUTILS: Making request to', url, 'with httpOnly cookies');
  
  const defaultHeaders: HeadersInit = {
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    ...options.headers
  };

  // No Authorization headers needed - httpOnly cookies handle authentication
  return fetch(url, {
    ...options,
    headers: defaultHeaders,
    credentials: 'include' // Include httpOnly cookies
  });
}

// Create API test with standardized error handling
export function createApiTest(
  name: string,
  testFn: () => Promise<{ success: boolean; message: string }>
): () => Promise<ApiTestResult> {
  return async () => {
    try {
      const result = await testFn();
      return {
        name,
        status: result.success ? 'pass' : 'fail',
        message: result.message
      };
    } catch (error) {
      return {
        name,
        status: 'fail',
        message: `${name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  };
}

// Specific test creators
export const createConnectivityTest = () => createApiTest(
  'API Connectivity',
  async () => {
    const response = await makeApiRequest('/api/health');
    return {
      success: response.ok,
      message: response.ok ? 'API is responding' : `API failed with status ${response.status}`
    };
  }
);

export const createRecipeDataTest = () => createApiTest(
  'Recipe Data Loading',
  async () => {
    const response = await makeApiRequest('/api/custom-recipes');
    const data = await response.json();
    const hasRecipes = data.recipes?.length > 0;
    return {
      success: hasRecipes,
      message: hasRecipes ? `${data.recipes.length} recipes loaded` : 'No recipes found'
    };
  }
);

export const createImageValidationTest = () => createApiTest(
  'Image URL Validation',
  async () => {
    const response = await makeApiRequest('/api/custom-recipes');
    const data = await response.json();
    const recipe = data.recipes?.[0];
    
    if (!recipe?.imageUrl) {
      return { success: false, message: 'No image URLs found' };
    }

    const imageResponse = await makeApiRequest(recipe.imageUrl);
    return {
      success: imageResponse.ok,
      message: imageResponse.ok ? 'Images loading correctly' : 'Image URLs not accessible'
    };
  }
);

export const createAuthTest = () => createApiTest(
  'Authentication System',
  async () => {
    const response = await makeApiRequest('/api/auth/me');
    return {
      success: response.ok,
      message: response.ok ? 'Auth system working' : 'Auth system in development mode'
    };
  }
);

export const createAiChefTest = () => createApiTest(
  'AI Chef System',
  async () => {
    const response = await makeApiRequest('/api/weekly-chef/current');
    const data = await response.json();
    return {
      success: data.success,
      message: data.success ? 'AI chef system working' : 'AI chef system failed'
    };
  }
);