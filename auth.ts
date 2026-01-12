import { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users, type User } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import cookieParser from "cookie-parser";

// Extended user interface for request objects
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  name: string;
  userId: number; // FIXED: Consistent integer type matching database schema
}

// Add AuthUser to Express namespace
declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: User;
    }
  }
}

const scryptAsync = promisify(scrypt);
import { JWT_SECRET, AUTH_ENDPOINTS } from './authConfig';
import { authenticateToken } from './authMiddleware';
import { generateUnifiedToken, TokenStorageHelpers, invalidateUnifiedToken } from './unifiedTokenService';

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || !stored.includes('.')) {
      console.error('Invalid password format in database:', stored?.substring(0, 20));
      return false;
    }

    const parts = stored.split(".");
    if (parts.length !== 2) {
      console.error('Password should have exactly 2 parts (hash.salt)');
      return false;
    }

    const [hashed, salt] = parts;
    if (!hashed || !salt) {
      console.error('Missing hash or salt part');
      return false;
    }

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;

    if (hashedBuf.length !== suppliedBuf.length) {
      console.error('Buffer length mismatch:', hashedBuf.length, 'vs', suppliedBuf.length);
      return false;
    }

    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function generateToken(user: any) {
  // Ensure consistent user ID type in token
  const normalizedUser = {
    ...user,
    id: Number(user.id),
    userId: Number(user.id)
  };
  return generateUnifiedToken(normalizedUser);
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

// Import consolidated middleware
import { authenticateToken as authMiddleware } from './authMiddleware';

export function setupAuth(app: Express) {
  console.log('🔐 Setting up authentication routes...');

  // Register a new user
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ 
          success: false,
          error: "Name, email and password are required" 
        });
      }

      if (!db) {
        return res.status(500).json({ 
          success: false,
          error: "Database connection error" 
        });
      }

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: "User already exists with this email" 
        });
      }

      const hashedPassword = await hashPassword(password);

      const trialStart = new Date();
      const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

      const [newUser] = await db.insert(users).values({
        name,
        email,
        username: email.split('@')[0],
        password: hashedPassword,
        subscriptionStatus: 'trial',
        trialStartDate: trialStart,
        trialEndsAt: trialEnd,
        hasSeenWelcome: false
      }).returning();

      const token = generateToken(newUser);

      // Use unified token storage
      TokenStorageHelpers.setCookie(res, token);

      // Return full user data for auto-login after registration
      const userResponse = {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        subscriptionStatus: newUser.subscriptionStatus,
        trialStartDate: newUser.trialStartDate,
        trialEndsAt: newUser.trialEndsAt
      };

      res.json({
        success: true,
        message: 'Account created successfully! Welcome to WIMP!',
        user: userResponse,
        token: token
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error" 
      });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      console.log('🔐 DETAILED LOGIN DEBUG:', {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
          'user-agent': req.headers['user-agent']?.substring(0, 50)
        },
        body: req.body,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : 'NO_KEYS',
        rawBody: req.body ? JSON.stringify(req.body) : 'NO_BODY'
      });

      const { email, password, username } = req.body || {};
      const loginField = email || username;

      console.log('🔐 EXTRACTED FIELDS:', {
        email: email || 'MISSING',
        username: username || 'NOT_PROVIDED',
        password: password ? 'PRESENT' : 'MISSING',
        loginField: loginField || 'MISSING'
      });

      if (!loginField || !password) {
        console.log('❌ LOGIN FAILED: Missing credentials');
        return res.status(400).json({ 
          success: false,
          error: "Email and password are required" 
        });
      }

      if (!db) {
        console.error('❌ LOGIN FAILED: Database connection error');
        return res.status(500).json({ 
          success: false,
          error: "Database connection error" 
        });
      }

      console.log('🔍 SEARCHING FOR USER:', loginField);
      const [user] = await db.select().from(users).where(
        eq(users.email, loginField)
      ).limit(1);

      if (!user) {
        console.log('❌ LOGIN FAILED: User not found');
        return res.status(401).json({ 
          success: false,
          error: "Invalid email or password" 
        });
      }

      console.log('🔍 VERIFYING PASSWORD for user:', user.email);
      const isMatch = await comparePasswords(password, user.password);

      if (!isMatch) {
        console.log('❌ LOGIN FAILED: Password mismatch');
        return res.status(401).json({ 
          success: false,
          error: "Invalid email or password" 
        });
      }

      let updatedUser = user;

      // Check if trial has expired and update status
      if (user.trialEndsAt && user.subscriptionStatus === 'trial') {
        const trialEndDate = new Date(user.trialEndsAt);
        const now = new Date();
        
        if (trialEndDate < now) {
          console.log('⏰ TRIAL EXPIRED: Marking user as expired:', user.email);
          
          const [expired] = await db.update(users)
            .set({ subscriptionStatus: 'expired' })
            .where(eq(users.id, user.id))
            .returning();
          
          updatedUser = expired;
          console.log('✅ USER STATUS UPDATED: Trial expired, marked as expired');
        }
      }

      console.log('✅ LOGIN SUCCESS: Generating token for user:', updatedUser.email);
      const token = generateToken(updatedUser);

      // Use unified token storage
      TokenStorageHelpers.setCookie(res, token);

      const response = {
        success: true,
        token,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          username: updatedUser.username,
          subscriptionStatus: updatedUser.subscriptionStatus || 'trial',
          trialStartDate: updatedUser.trialStartDate,
          trialEndsAt: updatedUser.trialEndsAt,
          hasSeenWelcome: updatedUser.hasSeenWelcome || false,
          masteryKeys: 0,
          grainBalance: 0
        }
      };

      console.log('✅ LOGIN RESPONSE:', { 
        success: response.success, 
        hasToken: !!response.token,
        userEmail: response.user.email 
      });

      res.json(response);
    } catch (error) {
      console.error('❌ LOGIN CRITICAL ERROR:', error);
      res.status(500).json({ 
        success: false,
        error: "Internal server error - please try again" 
      });
    }
  });

  // REMOVED: Signin alias - use /api/auth/login directly

  // Get current user (unified endpoint)
  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // PRODUCTION: Demo users completely isolated - this check should never hit

      // Handle real authenticated user
      const userId = req.user.id;
      if (!db) {
        return res.status(500).json({ message: "Database not available" });
      }

      const [fullUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!fullUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = fullUser;
      res.status(200).json({
        ...userWithoutPassword,
        userId: Number(fullUser.id) // FIXED: Consistent integer type
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: "Server error getting user data" });
    }
  });

  // REMOVED: Duplicate user endpoint - use /api/auth/me directly

  // Mark welcome message as seen
  app.post("/api/auth/welcome-seen", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user.id;
      if (!db) {
        return res.status(500).json({ message: "Database not available" });
      }

      await db.update(users)
        .set({ hasSeenWelcome: true })
        .where(eq(users.id, userId));

      console.log(`✅ USER ${userId}: Welcome message marked as seen`);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Mark welcome seen error:', error);
      res.status(500).json({ message: "Server error marking welcome seen" });
    }
  });

  // Logout user
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    try {
      // Invalidate token in cache if present
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
      if (token) {
        invalidateUnifiedToken(token);
      }

      // Clear all possible cookie tokens using unified storage
      TokenStorageHelpers.clearCookie(res);
      res.clearCookie('token'); // Legacy support
      res.clearCookie('session'); // Legacy support
      
      res.status(200).json({ 
        success: true, 
        message: "Logout successful - all tokens cleared" 
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ 
        success: false, 
        message: "Server error during logout" 
      });
    }
  });

  // CONSOLIDATION: Add redirect routes for legacy endpoints to ensure backward compatibility
  app.get("/api/auth/user", (req: Request, res: Response) => {
    console.log('⚠️ LEGACY ENDPOINT: /api/auth/user called - redirecting to /api/auth/me');
    // Preserve original request headers and redirect internally
    req.url = '/api/auth/me';
    app._router.handle(req, res);
  });

  app.get("/api/auth/status", (req: Request, res: Response) => {
    console.log('⚠️ LEGACY ENDPOINT: /api/auth/status called - redirecting to /api/auth/me');
    req.url = '/api/auth/me';
    app._router.handle(req, res);
  });

  app.get("/api/auth/check", (req: Request, res: Response) => {
    console.log('⚠️ LEGACY ENDPOINT: /api/auth/check called - redirecting to /api/auth/me');
    req.url = '/api/auth/me';
    app._router.handle(req, res);
  });

  console.log('✅ Unified authentication routes registered successfully');
  console.log('✅ Legacy authentication endpoint redirects configured');
}