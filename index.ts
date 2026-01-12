import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authenticateToken, optionalAuth } from './authMiddleware.js';
import { registerRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize server
async function initializeServer() {
  try {
    // Database connection
    console.log('PostgreSQL database connection initialized');

    // CORS configuration - FIXED: More permissive origin handling for Replit domains
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000', // CRITICAL: Add 127.0.0.1 for local testing
      'https://15677428-a221-47f2-a3bc-10b72050d5ae-00-p4z71.picard.replit.dev',
      'https://wimpapp.co.za', // CRITICAL: Add production domain
      'http://wimpapp.co.za',  // Support both HTTP and HTTPS
      process.env.REPLIT_DEV_DOMAIN,
      // Add current Replit domain patterns
      /https:\/\/.*\.picard\.replit\.dev$/,
      /https:\/\/.*\.picard\.prod\.repl\.run$/,
      /https:\/\/.*\.repl\.run$/
    ].filter(Boolean);

    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(allowed => {
          if (typeof allowed === 'string') return allowed === origin;
          if (allowed instanceof RegExp) return allowed.test(origin);
          return false;
        });

        if (isAllowed) {
          console.log('✅ CORS: Allowed origin:', origin);
          return callback(null, true);
        } else {
          console.log('❌ CORS: Blocked origin:', origin);
          return callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie']
    }));

    // Request logging for assets
    app.use((req, res, next) => {
      if (req.url.includes('/assets/')) {
        console.log(`🎯 ASSET REQUEST: ${req.url}`);
      }
      next();
    });

    // Middleware
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(cookieParser());

    // Auth config
    console.log('🔐 AUTH CONFIG: Unified authentication configuration loaded');
    console.log('🔐 JWT_SECRET: your-super...');
    console.log('🔐 DEMO MODE: DISABLED');
    console.log('Missing PAYPAL_CLIENT_ID - PayPal functionality will be limited');
    console.log('Missing PAYPAL_CLIENT_SECRET - PayPal functionality will be limited');

    console.log('🚀 WIMP Kitchen Companion Server Starting...');

    // 🔧 CRITICAL: Static middleware for client/dist MUST be first for assets
    const clientDistPath = path.join(__dirname, '../client/dist');
    console.log('📦 CRITICAL STATIC MIDDLEWARE: Registering client/dist FIRST');
    console.log('📦 CLIENT DIST PATH:', clientDistPath);
    console.log('📦 CLIENT DIST EXISTS:', require('fs').existsSync(clientDistPath));
    
    app.use(express.static(clientDistPath, {
      maxAge: 31536000000, // 1 year cache for assets
      etag: true,
      index: false, // Don't serve index.html for directory requests
      setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        console.log('📦 SERVING STATIC ASSET:', fileName);
        
        // Set correct MIME types to fix the critical issue
        if (fileName.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (fileName.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (fileName.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }
    }));
    console.log('✅ CRITICAL FIX: Static middleware registered BEFORE routes');

    // SECONDARY: Serve manifest.json and other public files
    app.use(express.static(path.join(__dirname, '../public'), {
      maxAge: 0,
      etag: false,
      index: false,
      setHeaders: (res, filePath) => {
        const fileName = path.basename(filePath);
        console.log('🖼️ SERVING PUBLIC ASSET:', fileName);

        if (fileName.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
          res.setHeader('Content-Type', 'image/' + fileName.split('.').pop());
        } else if (fileName.endsWith('.svg')) {
          res.setHeader('Content-Type', 'image/svg+xml');
        }

        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    // ATTACHED ASSETS SERVING 
    app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets'), {
      maxAge: 31536000000,
      etag: true,
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        console.log('🖼️ SERVING ASSET:', path.basename(filePath));
      }
    }));

    // Simplified: All HTML debug tools served by static middleware - no need for explicit routes

    // FALLBACK FOR MISSING IMAGES
    app.get('/default-ingredient-icon.png', (req, res) => {
      console.log('🖼️ FALLBACK: Serving default ingredient icon');
      const fallbackSvg = `<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
        <circle cx="25" cy="25" r="20" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
        <text x="25" y="30" text-anchor="middle" font-size="20">🥄</text>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(fallbackSvg);
    });

    // PLACEHOLDER IMAGE API
    app.get('/api/placeholder/:width/:height', (req, res) => {
      const { width, height } = req.params;
      console.log(`🖼️ PLACEHOLDER: Generating ${width}x${height} image`);
      const placeholderSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f1f5f9"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14" fill="#64748b">
          ${width}×${height}
        </text>
      </svg>`;
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(placeholderSvg);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Register authentication routes
    console.log('✅ Registering authentication routes...');
    const { setupAuth } = await import('./auth.js');
    setupAuth(app);
    console.log('✅ Authentication routes registered');

    // Register all other API routes
    console.log('✅ Registering API routes...');
    await registerRoutes(app);
    console.log('✅ Routes registered successfully');

    // SERVE SERVICE WORKER WITH CORRECT MIME TYPE
    app.get('/sw.js', (req, res) => {
      console.log('🔧 SW: Serving service worker with correct MIME type');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(path.join(__dirname, '../public/sw.js'));
    });

    // ALIEXPRESS-STYLE PWA: Root route now serves React app directly
    // Landing page moved to /landing route handled by React routing
    app.get('/', (req, res) => {
      console.log('🏠 ROOT: Serving React app for AliExpress-style PWA entry');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    // Legacy /app route - redirect to root for consistency
    app.get('/app*', (req, res) => {
      console.log(`📱 LEGACY APP ROUTE: Redirecting ${req.url} to root`);
      res.redirect(301, '/');
    });

    // Landing page route - serve React app and let client-side routing handle /landing
    app.get('/landing', (req, res) => {
      console.log('🏠 LANDING: Serving React app for /landing route');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    // CRITICAL: Catch-all route MUST be LAST to prevent asset interception
    app.get('*', (req, res) => {
      // Log if assets reach here but don't block them - serve React app instead
      if (req.url.includes('/assets/') || req.url.includes('/icons/')) {
        console.log(`⚠️ ROUTING WARNING: Asset ${req.url} reached catch-all - static middleware may have missed it`);
        // Fall through to serve React app - this will trigger proper 404 handling
      }

      // Serve React app for all routes (including missed assets)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    // Start server
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log('✅ Server initialization process completed successfully.');
      console.log(`Backend API server running on port ${PORT}`);
      console.log(`✅ WIMP Kitchen Companion PWA: http://localhost:${PORT}/app`);
      console.log(`🏠 Landing page: http://localhost:${PORT}/`);
      console.log(`🌐 Server accessible externally on 0.0.0.0:${PORT}`);
      console.log(`🔧 Replit Preview: Assets available at preview URL without :${PORT} suffix`);
      console.log(`🔧 Debug Tools Working: /route-test.html, /clear-cache-and-test.html`);
    });

  } catch (error) {
    console.error('❌ Server initialization failed:', error);
    process.exit(1);
  }
}

// Initialize server
initializeServer();