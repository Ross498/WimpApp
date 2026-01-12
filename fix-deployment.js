#!/usr/bin/env node

/**
 * Fix Deployment Script
 * This script ensures the application is properly built and ready for deployment
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 WIMP Kitchen Companion - Deployment Build Script');
console.log('==================================================');

try {
  // 1. Clean any existing build artifacts
  console.log('🧹 Cleaning previous build artifacts...');
  const clientDistPath = path.join(__dirname, 'client', 'dist');
  if (fs.existsSync(clientDistPath)) {
    console.log('   Removing existing client/dist directory...');
    fs.rmSync(clientDistPath, { recursive: true, force: true });
  }

  // 2. Ensure client directory exists and has package.json
  console.log('📦 Checking client directory structure...');
  const clientPath = path.join(__dirname, 'client');
  const clientPackageJson = path.join(clientPath, 'package.json');
  
  if (!fs.existsSync(clientPath)) {
    console.error('❌ Client directory not found');
    process.exit(1);
  }
  
  if (!fs.existsSync(clientPackageJson)) {
    console.error('❌ Client package.json not found');
    process.exit(1);
  }
  
  console.log('✅ Client directory structure verified');

  // 3. Install client dependencies if node_modules doesn't exist
  const clientNodeModules = path.join(clientPath, 'node_modules');
  if (!fs.existsSync(clientNodeModules)) {
    console.log('📦 Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Client dependencies already installed');
  }

  // 4. Run the build process
  console.log('🔨 Building the client application...');
  execSync('cd client && npm run build', { stdio: 'inherit' });

  // 5. Verify build output
  console.log('🔍 Verifying build output...');
  
  if (!fs.existsSync(clientDistPath)) {
    console.error('❌ Build failed - client/dist directory not created');
    process.exit(1);
  }

  const indexHtmlPath = path.join(clientDistPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ Build failed - index.html not found');
    process.exit(1);
  }

  const assetsPath = path.join(clientDistPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    console.error('❌ Build failed - assets directory not found');
    process.exit(1);
  }

  // 6. Check for critical asset files
  const assetFiles = fs.readdirSync(assetsPath);
  const hasCssFiles = assetFiles.some(file => file.endsWith('.css'));
  const hasJsFiles = assetFiles.some(file => file.endsWith('.js'));

  if (!hasCssFiles || !hasJsFiles) {
    console.error('❌ Build incomplete - missing CSS or JS files');
    console.log('   Available files:', assetFiles);
    process.exit(1);
  }

  console.log('✅ Build output verified successfully');
  console.log(`   Assets generated: ${assetFiles.length} files`);
  console.log(`   CSS files: ${assetFiles.filter(f => f.endsWith('.css')).length}`);
  console.log(`   JS files: ${assetFiles.filter(f => f.endsWith('.js')).length}`);

  // 7. Check server dependencies
  console.log('🔍 Checking server configuration...');
  const serverIndexPath = path.join(__dirname, 'server', 'index.ts');
  if (!fs.existsSync(serverIndexPath)) {
    console.error('❌ Server entry point not found');
    process.exit(1);
  }

  // 8. Verify package.json scripts
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.scripts || !packageJson.scripts.start) {
    console.error('❌ No start script found in package.json');
    process.exit(1);
  }

  console.log('✅ Server configuration verified');
  console.log(`   Start command: ${packageJson.scripts.start}`);

  // 9. Success summary
  console.log('\n🎉 DEPLOYMENT BUILD SUCCESSFUL');
  console.log('==============================');
  console.log('✅ Client application built successfully');
  console.log('✅ All assets generated and verified');
  console.log('✅ Server configuration validated');
  console.log('✅ Ready for production deployment');
  
  console.log('\n📋 Build Summary:');
  console.log(`   Client build: ${clientDistPath}`);
  console.log(`   Asset files: ${assetFiles.length}`);
  console.log(`   Build size: ${getDirectorySize(clientDistPath)} KB`);
  
  process.exit(0);

} catch (error) {
  console.error('\n❌ DEPLOYMENT BUILD FAILED');
  console.error('===========================');
  console.error('Error:', error.message);
  
  if (error.stdout) {
    console.error('stdout:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('stderr:', error.stderr.toString());
  }
  
  process.exit(1);
}

/**
 * Get directory size in KB
 */
function getDirectorySize(dirPath) {
  let size = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    }
  }
  
  try {
    calculateSize(dirPath);
    return Math.round(size / 1024);
  } catch (error) {
    return 0;
  }
}