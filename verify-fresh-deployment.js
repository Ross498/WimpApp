
#!/usr/bin/env node

console.log('🔍 VERIFYING FRESH DEPLOYMENT BUILD');
console.log('===================================');

const fs = require('fs');
const path = require('path');

// Check if client/dist exists and when it was last modified
const distPath = path.join(__dirname, 'client/dist');
const distExists = fs.existsSync(distPath);

console.log('📦 CLIENT DIST STATUS:');
console.log(`   Exists: ${distExists}`);

if (distExists) {
  const distStats = fs.statSync(distPath);
  const distAge = Date.now() - distStats.mtime.getTime();
  const ageInMinutes = Math.floor(distAge / (1000 * 60));
  
  console.log(`   Last Modified: ${distStats.mtime.toISOString()}`);
  console.log(`   Age: ${ageInMinutes} minutes ago`);
  
  // Check if build is recent (within last 10 minutes)
  if (ageInMinutes > 10) {
    console.log('⚠️  WARNING: Build is older than 10 minutes - may be stale');
    console.log('🔧 SOLUTION: Run "rm -rf client/dist && npm run build"');
  } else {
    console.log('✅ BUILD IS FRESH');
  }
  
  // Check key files in dist
  const indexHtml = path.join(distPath, 'index.html');
  const assetsDir = path.join(distPath, 'assets');
  
  if (fs.existsSync(indexHtml)) {
    const htmlStats = fs.statSync(indexHtml);
    console.log(`   index.html: ${htmlStats.mtime.toISOString()}`);
  }
  
  if (fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    console.log(`   Assets count: ${assets.length} files`);
    console.log(`   Assets: ${assets.slice(0, 3).join(', ')}...`);
  }
} else {
  console.log('❌ CLIENT DIST MISSING - Build required');
  console.log('🔧 SOLUTION: Run "npm run build"');
}

// Check package.json build script
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log('\n📋 BUILD SCRIPTS:');
  console.log(`   build: ${pkg.scripts?.build || 'NOT DEFINED'}`);
  console.log(`   dev: ${pkg.scripts?.dev || 'NOT DEFINED'}`);
}
