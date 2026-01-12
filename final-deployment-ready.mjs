#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 FINAL DEPLOYMENT BUILD - Creating complete React app');

// Create a comprehensive main.tsx that forces all component inclusion
const mainTsxContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { TutorialProvider } from './contexts/TutorialContext';
import TopNavigation from './components/TopNavigation';
import BottomNavigation from './components/BottomNavigation';
import FloatingActionButton from './components/FloatingActionButton';
import AuthenticationModal from './components/AuthenticationModal';
import InteractiveTutorial from './components/InteractiveTutorial';
import MealsScreen from './screens/MealsScreen';
import IngredientsScreen from './screens/IngredientsScreen';
import ProfileScreen from './screens/ProfileScreen';
import MasteryScreen from './screens/MasteryScreen';
import PodsScreen from './screens/PodsScreen';
import AIMealGeneratorScreen from './screens/AIMealGeneratorScreen';
import AiChefChatScreen from './screens/AiChefChatScreen';
import UploadMealScreen from './screens/UploadMealScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import './index.css';

// Force all components into bundle
const allComponents = {
  MealsScreen,
  IngredientsScreen,
  ProfileScreen,
  MasteryScreen,
  PodsScreen,
  AIMealGeneratorScreen,
  AiChefChatScreen,
  UploadMealScreen,
  ShoppingListScreen,
  TopNavigation,
  BottomNavigation,
  FloatingActionButton,
  AuthenticationModal,
  InteractiveTutorial
};

// Set up QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);
        return response.json();
      },
    },
  },
});

function App() {
  console.log('📱 WIMP Kitchen Companion loaded with', Object.keys(allComponents).length, 'components');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <TutorialProvider>
          <Router>
            <div className="bg-gray-50 min-h-screen">
              <TopNavigation />
              <div className="pb-20" style={{ paddingTop: 'calc(60px + env(safe-area-inset-top))' }}>
                <Switch>
                  <Route path="/" component={MealsScreen} />
                  <Route path="/meals" component={MealsScreen} />
                  <Route path="/ingredients" component={IngredientsScreen} />
                  <Route path="/profile" component={ProfileScreen} />
                  <Route path="/mastery" component={MasteryScreen} />
                  <Route path="/pods" component={PodsScreen} />
                  <Route path="/ai-meal-generator" component={AIMealGeneratorScreen} />
                  <Route path="/ai-chat" component={AiChefChatScreen} />
                  <Route path="/upload-meal" component={UploadMealScreen} />
                  <Route path="/shopping-list" component={ShoppingListScreen} />
                </Switch>
              </div>
              <BottomNavigation />
              <FloatingActionButton />
            </div>
          </Router>
        </TutorialProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

const mainTsxPath = path.join(__dirname, 'client', 'src', 'main.tsx');
fs.writeFileSync(mainTsxPath, mainTsxContent);
console.log('✅ Created comprehensive main.tsx with all components');

// Update vite config for single bundle
const viteConfigContent = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: './index.html',
      output: {
        entryFileNames: 'assets/index-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: undefined,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})`;

const viteConfigPath = path.join(__dirname, 'client', 'vite.config.ts');
fs.writeFileSync(viteConfigPath, viteConfigContent);
console.log('✅ Updated vite.config.ts for comprehensive build');

console.log('\n🚀 DEPLOYMENT READY BUILD CONFIGURATION COMPLETE!');
console.log('Next steps:');
console.log('1. cd client && npm run build');
console.log('2. Check that bundle includes all components');
console.log('3. Test authentication with Ross Pinnock account');
console.log('4. Verify profile shows real user data');

module.exports = { allComponents };