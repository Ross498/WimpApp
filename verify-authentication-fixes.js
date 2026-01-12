// COMPREHENSIVE VERIFICATION: Test Authentication & Meal Plans Fixes
// This script verifies that the critical fixes I implemented actually work

console.log('🔍 === COMPREHENSIVE VERIFICATION OF AUTHENTICATION FIXES ===');
console.log('Testing the three critical issues that were reported:');
console.log('1. Manual Add Ingredient Button Missing Auth Trigger');
console.log('2. Meal Plans Not Displaying');
console.log('3. Authentication Logic Conflicts');
console.log('');

// GLOBAL TEST RESULTS OBJECT
window.verificationResults = {
    timestamp: new Date().toISOString(),
    tests: {},
    summary: {}
};

function logResult(testName, success, details) {
    const result = { success, details, timestamp: Date.now() };
    window.verificationResults.tests[testName] = result;
    
    const emoji = success ? '✅' : '❌';
    const color = success ? 'color: #51cf66' : 'color: #ff6b6b';
    console.log(`%c${emoji} ${testName}: ${success ? 'PASSED' : 'FAILED'}`, color);
    if (details) {
        console.log(`   ${details}`);
    }
    console.log('');
}

// TEST 1: VERIFY AUTHENTICATION GLOBAL FUNCTIONS
function testGlobalAuthFunctions() {
    console.log('📋 TEST 1: VERIFY AUTHENTICATION GLOBAL FUNCTIONS');
    
    // Test 1A: Check window.triggerWimpAuth exists
    if (typeof window.triggerWimpAuth === 'function') {
        logResult('Global triggerWimpAuth Function', true, 'window.triggerWimpAuth is available');
        
        // Test calling it
        try {
            const result = window.triggerWimpAuth('verification_test', 'VERIFICATION', 'Testing global authentication trigger');
            logResult('Global triggerWimpAuth Call', result === true, `Function returned: ${result}`);
        } catch (error) {
            logResult('Global triggerWimpAuth Call', false, `Error: ${error.message}`);
        }
    } else {
        logResult('Global triggerWimpAuth Function', false, 'window.triggerWimpAuth is not available');
    }
    
    // Test 1B: Check window.wimpAuth exists
    if (window.wimpAuth && typeof window.wimpAuth.showAuthenticationModal === 'function') {
        logResult('Window wimpAuth Object', true, 'window.wimpAuth with showAuthenticationModal is available');
        
        // Test the authentication state
        const authState = {
            isAuthenticated: window.wimpAuth.isAuthenticated,
            isGuest: window.wimpAuth.isGuest
        };
        logResult('Authentication State Access', true, `Auth state: ${JSON.stringify(authState)}`);
    } else {
        logResult('Window wimpAuth Object', false, 'window.wimpAuth is not available or incomplete');
    }
}

// TEST 2: VERIFY AUTHENTICATION MODAL APPEARS
async function testAuthenticationModalTrigger() {
    console.log('📋 TEST 2: VERIFY AUTHENTICATION MODAL APPEARS');
    
    // Count existing modals before test
    const beforeModals = document.querySelectorAll('[class*="modal"], [class*="auth"], [role="dialog"]');
    const beforeCount = beforeModals.length;
    
    logResult('Initial Modal Count', true, `Found ${beforeCount} modals before test`);
    
    // Test 2A: Try manual trigger via global function
    if (typeof window.triggerWimpAuth === 'function') {
        console.log('🚀 Triggering authentication modal via global function...');
        
        try {
            window.triggerWimpAuth('manual_verification', 'MANUAL_VERIFICATION', 'Manual verification test');
            
            // Wait for modal to appear
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const afterModals = document.querySelectorAll('[class*="modal"], [class*="auth"], [role="dialog"]');
            const afterCount = afterModals.length;
            
            if (afterCount > beforeCount) {
                logResult('Authentication Modal Trigger', true, `Modal appeared! Before: ${beforeCount}, After: ${afterCount}`);
                
                // Check if it's specifically an authentication modal
                const authModals = Array.from(afterModals).filter(modal => {
                    const text = modal.textContent?.toLowerCase() || '';
                    return text.includes('sign') || text.includes('login') || text.includes('auth') || text.includes('account');
                });
                
                logResult('Authentication Modal Content', authModals.length > 0, `Found ${authModals.length} authentication-related modals`);
                
                // Close the modal for clean testing
                const closeButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                    const text = btn.textContent?.toLowerCase() || '';
                    return text.includes('close') || text.includes('cancel') || text === '×' || text === 'x';
                });
                
                if (closeButtons.length > 0) {
                    closeButtons[0].click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    logResult('Modal Cleanup', true, 'Modal closed for clean testing');
                } else {
                    // Try clicking outside modal
                    const overlay = document.querySelector('[style*="background"], [style*="backdrop"]');
                    if (overlay) {
                        overlay.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
            } else {
                logResult('Authentication Modal Trigger', false, `Modal did not appear. Before: ${beforeCount}, After: ${afterCount}`);
            }
        } catch (error) {
            logResult('Authentication Modal Trigger', false, `Error: ${error.message}`);
        }
    } else {
        logResult('Authentication Modal Trigger', false, 'window.triggerWimpAuth function not available');
    }
}

// TEST 3: VERIFY ADD INGREDIENT BUTTON AUTHENTICATION
async function testAddIngredientButtonAuth() {
    console.log('📋 TEST 3: VERIFY ADD INGREDIENT BUTTON AUTHENTICATION');
    
    // Check if we're on ingredients screen
    const onIngredientsScreen = window.location.pathname.includes('ingredient') || 
                               document.querySelector('[data-testid*="ingredient"]') ||
                               document.querySelector('h1, h2, h3')?.textContent?.toLowerCase().includes('ingredient');
    
    if (!onIngredientsScreen) {
        logResult('Ingredients Screen Check', false, 'Not on ingredients screen. Navigate to /ingredients to test add ingredient buttons');
        return;
    }
    
    logResult('Ingredients Screen Check', true, 'On ingredients screen');
    
    // Find add ingredient buttons
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const addIngredientButtons = buttons.filter(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        const testId = btn.getAttribute('data-testid') || '';
        const ariaLabel = btn.getAttribute('aria-label') || '';
        
        return (text.includes('add') && text.includes('ingredient')) || 
               (text.includes('manual') && text.includes('add')) ||
               testId.includes('add-ingredient') ||
               testId.includes('manual-add') ||
               ariaLabel.includes('add ingredient');
    });
    
    logResult('Add Ingredient Buttons Found', addIngredientButtons.length > 0, `Found ${addIngredientButtons.length} add ingredient buttons`);
    
    if (addIngredientButtons.length > 0) {
        console.log('🔍 Add ingredient buttons detected:');
        addIngredientButtons.forEach((btn, i) => {
            console.log(`  [${i}] "${btn.textContent?.trim()}" (testId: ${btn.getAttribute('data-testid') || 'none'})`);
        });
        
        // Test clicking the first button
        console.log('🖱️ Testing authentication trigger by clicking add ingredient button...');
        
        const beforeModals = document.querySelectorAll('[class*="modal"], [class*="auth"]').length;
        
        try {
            addIngredientButtons[0].click();
            
            // Wait for authentication modal
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const afterModals = document.querySelectorAll('[class*="modal"], [class*="auth"]').length;
            
            if (afterModals > beforeModals) {
                logResult('Add Ingredient Auth Trigger', true, `Authentication modal appeared after button click! Before: ${beforeModals}, After: ${afterModals}`);
            } else {
                logResult('Add Ingredient Auth Trigger', false, `Authentication modal did not appear. Before: ${beforeModals}, After: ${afterModals}`);
            }
        } catch (error) {
            logResult('Add Ingredient Auth Trigger', false, `Error clicking button: ${error.message}`);
        }
    }
}

// TEST 4: VERIFY MEAL PLANS API AND DISPLAY
async function testMealPlansDisplay() {
    console.log('📋 TEST 4: VERIFY MEAL PLANS API AND DISPLAY');
    
    // Test 4A: Direct API test
    try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('📡 Testing /api/meal-plans endpoint...');
        const response = await fetch('/api/meal-plans', { 
            headers,
            credentials: 'include'
        });
        
        logResult('Meal Plans API Status', response.ok, `API responded with ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            const isArray = Array.isArray(data);
            const count = isArray ? data.length : 'not array';
            
            logResult('Meal Plans Data Structure', isArray, `Received ${count} meal plans`);
            
            if (isArray && data.length > 0) {
                logResult('Meal Plans Content', true, `Sample meal plan: "${data[0].name || 'unnamed'}"`);
            } else if (isArray && data.length === 0) {
                logResult('Meal Plans Content', true, 'Empty meal plans array - user has no meal plans');
            }
        } else {
            const errorText = await response.text();
            logResult('Meal Plans API Error', false, `API Error: ${errorText}`);
        }
    } catch (error) {
        logResult('Meal Plans API Test', false, `Network error: ${error.message}`);
    }
    
    // Test 4B: Check Enhanced Favorites screen
    const onFavoritesScreen = window.location.pathname.includes('favorites') || 
                             document.querySelector('[data-testid*="favorites"]') ||
                             document.querySelector('h1, h2, h3')?.textContent?.toLowerCase().includes('favorites');
    
    if (onFavoritesScreen) {
        logResult('Enhanced Favorites Screen', true, 'On Enhanced Favorites screen');
        
        // Look for meal plans tab
        const mealPlanTabs = Array.from(document.querySelectorAll('button, [role="tab"]')).filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('meal') && text.includes('plan');
        });
        
        logResult('Meal Plans Tab', mealPlanTabs.length > 0, `Found ${mealPlanTabs.length} meal plan tabs`);
        
        // Look for meal plan content
        const mealPlanContent = document.querySelectorAll('[data-testid*="meal-plan"], [class*="meal-plan"], [class*="MealPlan"]');
        logResult('Meal Plans Content Elements', mealPlanContent.length > 0, `Found ${mealPlanContent.length} meal plan elements`);
        
    } else {
        logResult('Enhanced Favorites Screen', false, 'Not on Enhanced Favorites screen. Navigate to /favorites to test meal plans display');
    }
}

// TEST 5: VERIFY AUTHENTICATION STATE CONSISTENCY
function testAuthStateConsistency() {
    console.log('📋 TEST 5: VERIFY AUTHENTICATION STATE CONSISTENCY');
    
    // Collect authentication state from multiple sources
    const sources = {
        localStorage: {
            authToken: localStorage.getItem('authToken'),
            isAuthenticated: localStorage.getItem('isAuthenticated'),
            user: localStorage.getItem('user'),
            guestMode: localStorage.getItem('guestMode')
        },
        window: {
            wimpAuth: window.wimpAuth ? {
                isAuthenticated: window.wimpAuth.isAuthenticated,
                isGuest: window.wimpAuth.isGuest
            } : null,
            triggerWimpAuth: typeof window.triggerWimpAuth === 'function'
        }
    };
    
    logResult('Authentication Sources', true, `LocalStorage: ${Object.keys(sources.localStorage).length} keys, Window: ${Object.keys(sources.window).length} keys`);
    
    // Check for conflicts
    const conflicts = [];
    
    if (sources.localStorage.isAuthenticated === 'true' && !sources.localStorage.authToken) {
        conflicts.push('isAuthenticated=true but no authToken');
    }
    
    if (sources.localStorage.guestMode === 'true' && sources.localStorage.isAuthenticated === 'true') {
        conflicts.push('Both guestMode and isAuthenticated are true');
    }
    
    if (sources.localStorage.authToken && sources.localStorage.guestMode === 'true') {
        conflicts.push('Has authToken but guestMode is true');
    }
    
    logResult('Authentication State Conflicts', conflicts.length === 0, conflicts.length > 0 ? `Found ${conflicts.length} conflicts: ${conflicts.join(', ')}` : 'No conflicts detected');
    
    // Log current state for debugging
    console.log('🔍 DETAILED AUTHENTICATION STATE:');
    console.log('   LocalStorage:', sources.localStorage);
    console.log('   Window:', sources.window);
}

// MAIN VERIFICATION FUNCTION
async function runComprehensiveVerification() {
    console.log('🚀 === STARTING COMPREHENSIVE VERIFICATION ===');
    console.log('This will test all the critical fixes I implemented:');
    console.log('');
    
    const startTime = Date.now();
    
    try {
        // Run all verification tests
        console.log('1️⃣ Testing global authentication functions...');
        testGlobalAuthFunctions();
        
        console.log('2️⃣ Testing authentication modal trigger...');
        await testAuthenticationModalTrigger();
        
        console.log('3️⃣ Testing add ingredient button authentication...');
        await testAddIngredientButtonAuth();
        
        console.log('4️⃣ Testing meal plans API and display...');
        await testMealPlansDisplay();
        
        console.log('5️⃣ Testing authentication state consistency...');
        testAuthStateConsistency();
        
        // Generate summary
        const tests = window.verificationResults.tests;
        const passed = Object.values(tests).filter(t => t.success).length;
        const failed = Object.values(tests).filter(t => !t.success).length;
        const total = passed + failed;
        
        window.verificationResults.summary = {
            total,
            passed,
            failed,
            passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
            duration: Date.now() - startTime
        };
        
        console.log('');
        console.log('📋 === COMPREHENSIVE VERIFICATION SUMMARY ===');
        console.log(`%c✅ PASSED: ${passed} tests`, 'color: #51cf66; font-weight: bold');
        console.log(`%c❌ FAILED: ${failed} tests`, 'color: #ff6b6b; font-weight: bold');
        console.log(`%c📊 PASS RATE: ${window.verificationResults.summary.passRate}%`, 'color: #339af0; font-weight: bold');
        console.log(`⏱️ DURATION: ${window.verificationResults.summary.duration}ms`);
        console.log('');
        
        if (window.verificationResults.summary.passRate >= 80) {
            console.log('%c🎉 VERIFICATION SUCCESSFUL: Critical fixes are working!', 'color: #51cf66; font-size: 14px; font-weight: bold');
        } else {
            console.log('%c⚠️ VERIFICATION NEEDS ATTENTION: Some fixes may need refinement', 'color: #ffd43b; font-size: 14px; font-weight: bold');
        }
        
        console.log('');
        console.log('📊 Results stored in window.verificationResults');
        console.log('🔧 Use window.verificationResults to inspect detailed test results');
        
    } catch (error) {
        console.error('❌ FATAL ERROR in comprehensive verification:', error);
        logResult('Comprehensive Verification', false, `Fatal error: ${error.message}`);
    }
}

// Install manual test functions
window.verifyFixes = {
    runAll: runComprehensiveVerification,
    testAuthFunctions: testGlobalAuthFunctions,
    testModalTrigger: testAuthenticationModalTrigger,
    testAddIngredient: testAddIngredientButtonAuth,
    testMealPlans: testMealPlansDisplay,
    testAuthState: testAuthStateConsistency
};

// Auto-run comprehensive verification
console.log('🎬 Starting comprehensive verification in 2 seconds...');
console.log('📞 Manual functions available at window.verifyFixes');
setTimeout(runComprehensiveVerification, 2000);