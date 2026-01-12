import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set, database features will be disabled");
}

const connectionString = process.env.DATABASE_URL;

// ENHANCED FIX: Optimized connection pool configuration to prevent connection terminations
export const pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,   // INCREASED: 10s timeout to prevent premature failures
  idleTimeoutMillis: 30000,         // INCREASED: 30s idle timeout for better stability  
  max: 8,                           // INCREASED: More connections to handle concurrent requests
  min: 2,                           // INCREASED: More minimum connections for stability
  maxUses: 1000,                    // INCREASED: Reduced rotation frequency for stability
  allowExitOnIdle: true,            // Allow graceful shutdown
  application_name: 'wimp_app',     // For debugging connection sources
  statement_timeout: 15000,         // INCREASED: 15s for complex queries
  query_timeout: 12000,             // INCREASED: 12s maximum query execution time
  // Enhanced connection stability settings
  keepAlive: true,                  // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // TCP keep-alive initial delay
  // Note: Retry logic is handled in verifyConnection() and safeDbOperation() functions
}) : null;

// Create drizzle ORM instance
export const db = pool ? drizzle(pool, { schema }) : null;

// Enhanced connection verification with retry logic and proper cleanup
export async function verifyConnection(retries = 3): Promise<boolean> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (!pool) {
        console.error('No database connection pool available');
        return false;
      }

      // Use pool.query with validation instead of manual client management
      const result = await pool.query('SELECT NOW(), version() as db_version');
      console.log(`PostgreSQL database connected successfully (attempt ${attempt}/${retries})`);
      console.log(`Database version: ${result.rows[0]?.db_version}`);
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Database connection attempt ${attempt}/${retries} failed:`, lastError.message);
      
      if (attempt < retries) {
        const delay = Math.min(1000 * attempt, 5000); // Progressive backoff, max 5s
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('All database connection attempts failed:', lastError?.message);
  return false;
}

// Add transaction helper to prevent partial data corruption
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  return await db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      // Transaction will automatically rollback on error
      console.error('Transaction failed, rolling back:', error);
      throw error;
    }
  });
}

// ENHANCED: Improved connection monitoring with better stability
export function monitorConnectionHealth() {
  if (pool) {
    const healthCheck = setInterval(async () => {
      try {
        const totalCount = pool.totalCount;
        const idleCount = pool.idleCount;
        const waitingCount = pool.waitingCount;

        // Enhanced logging with better thresholds for 8 max connections
        if (totalCount >= 6 || waitingCount > 2 || Math.floor(Date.now() / 60000) % 5 === 0) {
          console.log(`🔍 DB Pool Health: ${totalCount}/${pool.options.max} total, ${idleCount} idle, ${waitingCount} waiting`);
        }

        // Warning at 75% capacity (6/8 connections)
        if (totalCount >= 6) {
          console.warn('⚠️ Database pool at 75% capacity - monitoring for potential issues');
        }

        // Critical warning at 90% capacity (7/8 connections)
        if (totalCount >= 7) {
          console.error('🚨 CRITICAL: Pool at 90% capacity - investigate potential connection leaks');
        }

        // Emergency at max capacity
        if (totalCount >= 8) {
          console.error('🔥 EMERGENCY: Pool at maximum capacity - immediate attention required');
          // Log connection details for debugging
          console.log('Pool config:', {
            max: pool.options.max,
            min: pool.options.min,
            idleTimeoutMillis: pool.options.idleTimeoutMillis,
            connectionTimeoutMillis: pool.options.connectionTimeoutMillis
          });
        }

        // Validate pool health with lightweight query every 5 minutes
        if (Math.floor(Date.now() / 300000) % 1 === 0 && totalCount < 6) {
          await pool.query('SELECT 1'); // Lightweight health check
        }
      } catch (error) {
        console.error('❌ Database health monitoring failed:', error instanceof Error ? error.message : String(error));
        
        // Enhanced error handling for connection issues
        if (error instanceof Error) {
          if (error.message.includes('ECONNREFUSED')) {
            console.error('🔌 Database server connection refused - check server status');
          } else if (error.message.includes('timeout')) {
            console.error('⏰ Database connection timeout - check network and server load');
          } else if (error.message.includes('pool')) {
            console.error('🏊 Pool-related error detected - investigating connection management');
          }
        }
      }
    }, 30000); // Check every 30 seconds for stability

    // Return cleanup function
    return () => clearInterval(healthCheck);
  }
}

// Enhanced safe database operation wrapper with retry logic
export async function safeDbOperation<T>(operation: () => Promise<T>, fallback?: T, retries = 2): Promise<T | null> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check for recoverable errors
      const isRetryable = lastError.message.includes('connection') || 
                         lastError.message.includes('timeout') ||
                         lastError.message.includes('ECONNRESET') ||
                         lastError.message.includes('57P01'); // Connection terminated
      
      if (attempt <= retries && isRetryable) {
        const delay = Math.min(500 * attempt, 2000); // Progressive backoff, max 2s
        console.warn(`⚠️ Database operation failed (attempt ${attempt}/${retries + 1}), retrying in ${delay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  console.error('❌ Database operation failed after all retries:', lastError?.message);
  
  // Enhanced error logging for debugging
  if (lastError) {
    console.error('Error details:', {
      message: lastError.message,
      code: (lastError as any)?.code,
      severity: (lastError as any)?.severity,
      poolStatus: pool ? {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      } : 'No pool available'
    });
  }
  
  // Return fallback if provided, otherwise null
  return fallback !== undefined ? fallback : null;
}

// Add connection pool error recovery
export function setupConnectionErrorRecovery() {
  if (pool) {
    pool.on('error', (err: Error) => {
      console.error('🚨 Unexpected database pool error:', err.message);
      
      // Handle specific connection termination errors
      if (err.message.includes('57P01') || err.message.includes('terminating connection')) {
        console.log('🔄 Connection terminated by administrator - attempting recovery...');
        // The pool will automatically attempt to create new connections
      } else if (err.message.includes('ECONNREFUSED')) {
        console.error('🔌 Database server refused connection - check server status');
      } else if (err.message.includes('timeout')) {
        console.warn('⏰ Database connection timeout - network or server load issue');
      }
    });

    pool.on('connect', (client: any) => {
      console.log('✅ New database connection established');
      // Set session-level timeout overrides for this connection
      client.query(`SET statement_timeout = '15s'`).catch((err: Error) => {
        console.warn('Failed to set statement_timeout:', err.message);
      });
      client.query(`SET idle_in_transaction_session_timeout = '30s'`).catch((err: Error) => {
        console.warn('Failed to set idle_in_transaction_session_timeout:', err.message);
      });
    });

    pool.on('remove', (client: any) => {
      console.log('🗑️ Database connection removed from pool');
    });
  }
}

// Initialize monitoring and error recovery on startup
if (process.env.NODE_ENV === 'development') {
  monitorConnectionHealth();
}
setupConnectionErrorRecovery();

console.log('PostgreSQL database connection initialized with enhanced configuration');