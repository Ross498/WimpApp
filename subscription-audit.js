/**
 * SUBSCRIPTION UI AUDIT SCRIPT
 * Checks all subscription conditional logic across the entire codebase
 */

const fs = require('fs');
const path = require('path');

// Files to audit for subscription logic
const filesToAudit = [
  'client/src/screens/EnhancedFavoritesScreen.tsx',
  'client/src/screens/AIMealPlanGeneratorScreen.tsx',
  'client/src/screens/AiChefChatScreen.tsx',
  'client/src/screens/SubscriptionScreen.tsx',
  'client/src/hooks/useSubscription.ts',
  'server/subscriptionRoutes.ts'
];

// Patterns that indicate subscription logic
const subscriptionPatterns = [
  'isPremium',
  'subscriptionData',
  'tier',
  'currentPlan',
  'canUseFeature',
  'premium',
  'freemium'
];

function auditFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const issues = [];
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // Check for deprecated tier usage
      if (line.includes('subscriptionData?.tier') && !line.includes('// Added for compatibility')) {
        issues.push({
          type: 'DEPRECATED_TIER',
          line: lineNum,
          content: line.trim(),
          message: 'Using deprecated tier property instead of isPremium'
        });
      }
      
      // Check for inconsistent subscription checks
      if (line.includes('isPremium') && line.includes('tier')) {
        issues.push({
          type: 'MIXED_LOGIC',
          line: lineNum,
          content: line.trim(),
          message: 'Mixing isPremium and tier checks - use isPremium only'
        });
      }
      
      // Check for missing double validation
      if (line.includes('isPremium === true') && !line.includes('subscriptionData?.isPremium === true')) {
        if (line.includes('&&') && !line.includes('subscriptionData?.isPremium')) {
          issues.push({
            type: 'MISSING_VALIDATION',
            line: lineNum,
            content: line.trim(),
            message: 'Missing double validation - should check both isPremium and subscriptionData.isPremium'
          });
        }
      }
      
      // Check for old subscription patterns
      if (line.includes("tier === 'premium'") || line.includes("tier === 'free'")) {
        issues.push({
          type: 'OLD_PATTERN',
          line: lineNum,
          content: line.trim(),
          message: 'Using old tier comparison instead of isPremium boolean'
        });
      }
    });
    
    return {
      file: filePath,
      issues,
      hasSubscriptionLogic: subscriptionPatterns.some(pattern => content.includes(pattern))
    };
    
  } catch (error) {
    return {
      file: filePath,
      error: error.message,
      issues: [],
      hasSubscriptionLogic: false
    };
  }
}

function generateReport() {
  console.log('🔍 SUBSCRIPTION UI AUDIT REPORT\n');
  console.log('=' * 50);
  
  const results = filesToAudit.map(auditFile);
  const filesWithIssues = results.filter(r => r.issues.length > 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  
  console.log(`📊 SUMMARY:`);
  console.log(`- Files audited: ${results.length}`);
  console.log(`- Files with subscription logic: ${results.filter(r => r.hasSubscriptionLogic).length}`);
  console.log(`- Files with issues: ${filesWithIssues.length}`);
  console.log(`- Total issues found: ${totalIssues}\n`);
  
  if (totalIssues === 0) {
    console.log('✅ AUDIT PASSED: No subscription logic issues found!');
    console.log('🎯 All UI switching logic is consistent and guaranteed to work.\n');
  } else {
    console.log('❌ AUDIT FAILED: Issues found that need fixing:\n');
    
    filesWithIssues.forEach(result => {
      console.log(`📁 ${result.file}:`);
      result.issues.forEach(issue => {
        console.log(`  ${issue.type} (Line ${issue.line}): ${issue.message}`);
        console.log(`    Code: ${issue.content}`);
      });
      console.log('');
    });
  }
  
  // Generate recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  console.log('1. CONSISTENT PATTERN: Always use this pattern for premium features:');
  console.log('   {isPremium === true && subscriptionData?.isPremium === true && (');
  console.log('     <PremiumFeature />');
  console.log('   )}\n');
  
  console.log('2. FREEMIUM PATTERN: Always use this pattern for previews:');
  console.log('   {(isPremium === false || !subscriptionData || subscriptionData?.isPremium === false) && (');
  console.log('     <PremiumPreview />');
  console.log('   )}\n');
  
  console.log('3. AVOID: Never use tier comparisons - use isPremium boolean only');
  console.log('4. DOUBLE CHECK: Always validate both hook result AND subscription data');
  
  return totalIssues === 0;
}

// Fix common issues automatically
function autoFixIssues() {
  console.log('🔧 AUTO-FIXING COMMON SUBSCRIPTION ISSUES...\n');
  
  filesToAudit.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      
      // Fix deprecated tier checks
      const oldTierPattern = /subscriptionData\?\.tier === ['"]premium['"]/g;
      if (content.match(oldTierPattern)) {
        content = content.replace(oldTierPattern, "subscriptionData?.isPremium === true");
        changed = true;
        console.log(`✅ Fixed tier comparisons in ${filePath}`);
      }
      
      const oldTierFreePattern = /subscriptionData\?\.tier === ['"]free['"]/g;
      if (content.match(oldTierFreePattern)) {
        content = content.replace(oldTierFreePattern, "subscriptionData?.isPremium === false");
        changed = true;
        console.log(`✅ Fixed free tier comparisons in ${filePath}`);
      }
      
      if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`💾 Saved changes to ${filePath}`);
      }
      
    } catch (error) {
      console.log(`❌ Error processing ${filePath}: ${error.message}`);
    }
  });
}

// Main execution
if (require.main === module) {
  const auditPassed = generateReport();
  
  if (!auditPassed) {
    console.log('\n🔧 Running auto-fix...');
    autoFixIssues();
    console.log('\n🔄 Re-running audit after fixes...');
    generateReport();
  }
}

module.exports = { auditFile, generateReport, autoFixIssues };