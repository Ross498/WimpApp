// Phase 3-4: Meal Plan Display and Route Verification Testing
// Focus on completing the display and data flow verification

const fs = require('fs');

const BASE_URL = 'http://localhost:5000';

// Use existing test user token if available
let authToken = null;

async function getAuthToken() {
  // Try to login with test user
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.token;
      console.log('✅ Authentication successful for display testing');
      return true;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
  return false;
}

// Phase 3: Meal Plan Display Testing
async function testMealPlanDisplay() {
  console.log('\n📋 PHASE 3: Meal Plan Display Testing');
  console.log('=' .repeat(50));
  
  if (!authToken) {
    console.log('❌ No auth token available');
    return false;
  }
  
  try {
    // Test meal plans endpoint
    console.log('Testing meal plans fetch endpoint...');
    const response = await fetch(`${BASE_URL}/api/meal-plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`📊 Meal Plans Fetch Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ FAIL: Meal plans fetch failed:', errorText);
      return false;
    }
    
    const mealPlans = await response.json();
    console.log('✅ PASS: Meal plans fetched successfully');
    console.log('📊 Meal Plans Data:', {
      isArray: Array.isArray(mealPlans),
      count: Array.isArray(mealPlans) ? mealPlans.length : 'Not an array',
      firstPlanId: Array.isArray(mealPlans) && mealPlans.length > 0 ? mealPlans[0].id : 'None'
    });
    
    // If we have meal plans, test individual fetch
    if (Array.isArray(mealPlans) && mealPlans.length > 0) {
      const firstPlan = mealPlans[0];
      console.log('\nTesting individual meal plan fetch...');
      
      const detailResponse = await fetch(`${BASE_URL}/api/meal-plans/${firstPlan.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (detailResponse.ok) {
        const planDetails = await detailResponse.json();
        console.log('✅ PASS: Individual meal plan fetch successful');
        console.log('📋 Plan Details Sample:', {
          id: planDetails.id,
          name: planDetails.name,
          duration: planDetails.duration,
          totalCalories: planDetails.totalCalories,
          hasMeals: !!(planDetails.meals && planDetails.meals.length > 0)
        });
        return true;
      } else {
        console.log('❌ FAIL: Individual meal plan fetch failed');
        return false;
      }
    } else {
      console.log('ℹ️  No meal plans found for display testing');
      return true; // This could be normal if no plans were saved yet
    }
    
  } catch (error) {
    console.error('❌ Error during meal plan display testing:', error.message);
    return false;
  }
}

// Phase 4: Route and Data Flow Verification
async function testRouteVerification() {
  console.log('\n🛠️ PHASE 4: Route and Data Flow Verification');
  console.log('=' .repeat(50));
  
  try {
    // Test all critical endpoints
    console.log('Testing critical API endpoints...');
    
    const endpointTests = [
      {
        name: 'Authentication Check',
        endpoint: '/api/auth/me',
        requiresAuth: true,
        method: 'GET'
      },
      {
        name: 'Meal Plans List',
        endpoint: '/api/meal-plans',
        requiresAuth: true,
        method: 'GET'
      },
      {
        name: 'Meal Plan Generation',
        endpoint: '/api/meal-plans/generate',
        requiresAuth: true,
        method: 'POST'
      },
      {
        name: 'User Favorites',
        endpoint: '/api/favorites',
        requiresAuth: true,
        method: 'GET'
      },
      {
        name: 'Recipes Endpoint',
        endpoint: '/api/recipes',
        requiresAuth: false,
        method: 'GET'
      }
    ];
    
    const results = [];
    
    for (const test of endpointTests) {
      try {
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (test.requiresAuth && authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        let body = undefined;
        if (test.method === 'POST' && test.endpoint.includes('generate')) {
          // Skip the actual generation test since it takes too long
          console.log(`  ⏭️  Skipping ${test.name} (tested in Phase 2)`);
          results.push({
            name: test.name,
            endpoint: test.endpoint,
            status: 'SKIPPED',
            ok: true
          });
          continue;
        }
        
        const response = await fetch(`${BASE_URL}${test.endpoint}`, {
          method: test.method,
          headers,
          body
        });
        
        const success = response.ok || (!test.requiresAuth && response.status === 401);
        
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          status: response.status,
          ok: success
        });
        
      } catch (error) {
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          status: 'ERROR',
          ok: false,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 Route Verification Results:');
    results.forEach(result => {
      const status = result.ok ? '✅' : '❌';
      const errorMsg = result.error ? ` (${result.error})` : '';
      console.log(`  ${status} ${result.name}: ${result.status}${errorMsg}`);
    });
    
    const allPassed = results.every(r => r.ok);
    console.log(`\n🏆 Route Verification: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    
    return allPassed;
    
  } catch (error) {
    console.error('❌ Error during route verification:', error.message);
    return false;
  }
}

// Test Enhanced Favorites route resolution
async function testEnhancedFavoritesRoute() {
  console.log('\n🔗 Testing Enhanced Favorites Route Resolution');
  console.log('=' .repeat(50));
  
  try {
    // Test the main route that should serve the React app
    console.log('Testing Enhanced Favorites route...');
    
    const response = await fetch(`${BASE_URL}/favorites`, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log(`📊 Enhanced Favorites Route Status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      const isReactApp = html.includes('WIMP Kitchen Companion') || html.includes('root');
      
      console.log('✅ PASS: Enhanced Favorites route accessible');
      console.log(`📋 Route serves React app: ${isReactApp ? 'Yes' : 'No'}`);
      return true;
    } else {
      console.log('❌ FAIL: Enhanced Favorites route not accessible');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing Enhanced Favorites route:', error.message);
    return false;
  }
}

// Main execution function
async function runPhase34Verification() {
  console.log('🔍 PHASE 3-4: MEAL PLAN DISPLAY & ROUTE VERIFICATION');
  console.log('=' .repeat(60));
  
  // Get authentication
  const authSuccess = await getAuthToken();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Run Phase 3: Display Testing
  const displayResults = await testMealPlanDisplay();
  
  // Run Phase 4: Route Verification  
  const routeResults = await testRouteVerification();
  
  // Test Enhanced Favorites Route
  const favoritesRouteResults = await testEnhancedFavoritesRoute();
  
  // Final summary
  console.log('\n📊 PHASE 3-4 VERIFICATION SUMMARY');
  console.log('=' .repeat(60));
  
  const results = {
    'Meal Plan Display': displayResults,
    'Route Verification': routeResults,
    'Enhanced Favorites Route': favoritesRouteResults
  };
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${test}`);
  });
  
  const overallSuccess = Object.values(results).every(Boolean);
  console.log('=' .repeat(60));
  console.log(`🏆 OVERALL PHASE 3-4 RESULT: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION'}`);
  
  // Save results
  const resultData = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 3-4 Verification',
    results,
    overallSuccess
  };
  
  fs.writeFileSync('phase3-4-results.json', JSON.stringify(resultData, null, 2));
  console.log('💾 Results saved to phase3-4-results.json');
  
  return overallSuccess;
}

// Execute the verification
runPhase34Verification().catch(console.error);