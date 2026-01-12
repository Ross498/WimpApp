import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './authConfig';

/**
 * BOUNDED LRU TOKEN CACHE
 * Enterprise-level authentication cache with 5k entry limit, TTL management,
 * in-flight verification deduplication, and comprehensive performance monitoring
 */

interface CacheEntry {
  user: any;
  expiresAt: number;
  createdAt: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
  averageEntryAge: number;
}

interface TokenCacheOptions {
  maxEntries: number;
  ttlSeconds: number;
  cleanupIntervalMs: number;
  enablePerformanceLogging: boolean;
}

/**
 * HIGH-PERFORMANCE BOUNDED LRU TOKEN CACHE
 * - 5k entry limit with LRU eviction strategy
 * - In-flight verification deduplication
 * - TTL management with automatic cleanup
 * - Comprehensive performance monitoring
 */
class BoundedLRUTokenCache {
  private cache: Map<string, CacheEntry> = new Map();
  private usageOrder: string[] = []; // Track LRU order
  private inFlightVerifications = new Map<string, Promise<{ user: any; fromCache: boolean }>>();
  
  // Configuration
  private readonly options: TokenCacheOptions;
  
  // Performance tracking
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalVerifications: 0,
    inFlightDeduplications: 0
  };
  
  // Cleanup timer
  private cleanupTimer: NodeJS.Timeout;

  constructor(options: Partial<TokenCacheOptions> = {}) {
    this.options = {
      maxEntries: 5000, // 5k bounded cache
      ttlSeconds: 300, // 5 minutes
      cleanupIntervalMs: 60000, // 1 minute cleanup
      enablePerformanceLogging: process.env.NODE_ENV === 'development',
      ...options
    };

    // Start automatic cleanup
    this.cleanupTimer = setInterval(() => {
      this.performMaintenance();
    }, this.options.cleanupIntervalMs);

    console.log(`🚀 LRU TOKEN CACHE: Initialized with ${this.options.maxEntries} entry limit, ${this.options.ttlSeconds}s TTL`);
  }

  /**
   * CORE CACHE METHOD: Verify token with intelligent LRU caching
   * Features in-flight deduplication and TTL management
   */
  async verifyToken(token: string): Promise<{ user: any; fromCache: boolean }> {
    const now = Date.now();
    
    // Step 1: Check for in-flight verification to prevent duplicate JWT.verify()
    const inFlightPromise = this.inFlightVerifications.get(token);
    if (inFlightPromise) {
      this.stats.inFlightDeduplications++;
      this.log('🔄 IN-FLIGHT: Deduplicating concurrent verification');
      return await inFlightPromise;
    }

    // Step 2: Check cache for valid entry
    const cached = this.cache.get(token);
    if (cached && now < cached.expiresAt) {
      // Cache hit - update access time and usage order
      cached.lastAccessed = now;
      this.updateUsageOrder(token);
      this.stats.hits++;
      
      this.log(`✅ CACHE HIT: Retrieved user ${cached.user?.id} (age: ${(now - cached.createdAt) / 1000}s)`);
      return { user: cached.user, fromCache: true };
    }

    // Step 3: Cache miss - perform JWT verification with deduplication
    this.stats.misses++;
    this.log('❌ CACHE MISS: Performing JWT verification');

    const verificationPromise = this.performJWTVerification(token);
    this.inFlightVerifications.set(token, verificationPromise);

    try {
      const result = await verificationPromise;
      return result;
    } finally {
      // Always clean up in-flight promise
      this.inFlightVerifications.delete(token);
    }
  }

  /**
   * PRIVATE: Perform actual JWT verification with caching
   */
  private async performJWTVerification(token: string): Promise<{ user: any; fromCache: boolean }> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          this.log(`🚫 JWT FAILED: ${err.message}`);
          reject(err);
          return;
        }

        const user = decoded as any;
        const now = Date.now();
        
        // Calculate expiration based on JWT exp claim with safety buffer
        const jwtExpiry = user.exp ? user.exp * 1000 : (now + 24 * 60 * 60 * 1000);
        const cacheExpiry = Math.min(jwtExpiry, now + (this.options.ttlSeconds * 1000));
        
        // Create cache entry
        const entry: CacheEntry = {
          user,
          expiresAt: cacheExpiry,
          createdAt: now,
          lastAccessed: now
        };

        // Store in cache with LRU management
        this.setWithLRU(token, entry);
        
        this.stats.totalVerifications++;
        this.log(`🔐 JWT SUCCESS: Cached user ${user.id} until ${new Date(cacheExpiry).toISOString()}`);
        
        resolve({ user, fromCache: false });
      });
    });
  }

  /**
   * PRIVATE: Set entry in cache with LRU eviction management
   */
  private setWithLRU(token: string, entry: CacheEntry): void {
    // If cache is at capacity and this is a new entry, evict LRU
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(token)) {
      this.evictLRUEntries(1);
    }

    // Set the entry
    this.cache.set(token, entry);
    this.updateUsageOrder(token);
  }

  /**
   * PRIVATE: Update usage order for LRU tracking
   */
  private updateUsageOrder(token: string): void {
    // Remove from current position if exists
    const currentIndex = this.usageOrder.indexOf(token);
    if (currentIndex !== -1) {
      this.usageOrder.splice(currentIndex, 1);
    }
    
    // Add to end (most recently used)
    this.usageOrder.push(token);
  }

  /**
   * PRIVATE: Evict least recently used entries
   */
  private evictLRUEntries(count: number): void {
    let evicted = 0;
    
    while (evicted < count && this.usageOrder.length > 0) {
      const lruToken = this.usageOrder.shift(); // Remove least recently used
      if (lruToken && this.cache.has(lruToken)) {
        this.cache.delete(lruToken);
        evicted++;
        this.stats.evictions++;
        this.log(`🗑️ LRU EVICTION: Removed token (cache size: ${this.cache.size})`);
      }
    }
  }

  /**
   * PRIVATE: Clean up expired entries and sync usage order
   */
  private cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean expired entries from cache
    for (const [token, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(token);
        cleaned++;
      }
    }

    // Sync usage order with cache (remove tokens no longer in cache)
    this.usageOrder = this.usageOrder.filter(token => this.cache.has(token));

    if (cleaned > 0) {
      this.log(`🧹 CLEANUP: Removed ${cleaned} expired entries, ${this.cache.size} remaining`);
    }

    return cleaned;
  }

  /**
   * PRIVATE: Perform comprehensive maintenance
   */
  private performMaintenance(): void {
    const sizeBefore = this.cache.size;
    
    // Clean expired entries
    const expiredCleaned = this.cleanupExpiredEntries();
    
    // If still over capacity after cleanup, evict LRU entries
    const overCapacity = this.cache.size - this.options.maxEntries;
    if (overCapacity > 0) {
      this.evictLRUEntries(overCapacity);
    }

    // Clean up stale in-flight verifications (safety measure)
    const inFlightSize = this.inFlightVerifications.size;
    if (inFlightSize > 10) { // Threshold for cleanup
      this.log(`⚠️ MAINTENANCE: ${inFlightSize} in-flight verifications detected`);
    }

    const sizeAfter = this.cache.size;
    if (sizeBefore !== sizeAfter || expiredCleaned > 0) {
      this.log(`🔧 MAINTENANCE: ${sizeBefore} → ${sizeAfter} entries (cleaned: ${expiredCleaned}, evicted: ${sizeBefore - sizeAfter - expiredCleaned})`);
    }
  }

  /**
   * PUBLIC API: Invalidate specific token (for logout, etc.)
   */
  invalidateToken(token: string): void {
    const wasDeleted = this.cache.delete(token);
    
    // Remove from usage order
    const orderIndex = this.usageOrder.indexOf(token);
    if (orderIndex !== -1) {
      this.usageOrder.splice(orderIndex, 1);
    }

    // Cancel any in-flight verification
    this.inFlightVerifications.delete(token);

    if (wasDeleted) {
      this.log('🚫 INVALIDATED: Token removed from cache');
    }
  }

  /**
   * PUBLIC API: Clear all cached tokens
   */
  clearAll(): void {
    const size = this.cache.size;
    const inFlightSize = this.inFlightVerifications.size;
    
    this.cache.clear();
    this.usageOrder = [];
    this.inFlightVerifications.clear();
    
    // Reset stats except historical counters
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    
    this.log(`🧽 CLEARED: Removed ${size} cached tokens and ${inFlightSize} in-flight verifications`);
  }

  /**
   * PUBLIC API: Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    // Calculate average entry age
    const now = Date.now();
    let totalAge = 0;
    let entryCount = 0;
    
    for (const entry of this.cache.values()) {
      totalAge += (now - entry.createdAt);
      entryCount++;
    }
    
    const averageEntryAge = entryCount > 0 ? totalAge / entryCount / 1000 : 0; // Convert to seconds
    
    // Estimate memory usage (rough calculation)
    const estimatedMemoryPerEntry = 1024; // ~1KB per entry (conservative estimate)
    const memoryUsage = this.cache.size * estimatedMemoryPerEntry;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      size: this.cache.size,
      maxSize: this.options.maxEntries,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
      averageEntryAge: Math.round(averageEntryAge * 100) / 100
    };
  }

  /**
   * PUBLIC API: Get detailed cache information for debugging
   */
  getDebugInfo() {
    return {
      cacheSize: this.cache.size,
      usageOrderLength: this.usageOrder.length,
      inFlightVerifications: this.inFlightVerifications.size,
      options: this.options,
      stats: {
        ...this.stats,
        totalRequests: this.stats.hits + this.stats.misses,
        hitRate: this.stats.hits + this.stats.misses > 0 
          ? Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 10000) / 100 
          : 0
      }
    };
  }

  /**
   * PRIVATE: Conditional logging based on configuration
   */
  private log(message: string): void {
    if (this.options.enablePerformanceLogging) {
      console.log(`🚀 LRU CACHE: ${message}`);
    }
  }

  /**
   * Cleanup on process shutdown
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clearAll();
    console.log('🚀 LRU TOKEN CACHE: Destroyed and cleaned up');
  }
}

// Export singleton instance with production-optimized configuration
export const tokenCache = new BoundedLRUTokenCache({
  maxEntries: 5000,
  ttlSeconds: 300, // 5 minutes
  cleanupIntervalMs: 60000, // 1 minute
  enablePerformanceLogging: process.env.NODE_ENV === 'development'
});

// Graceful shutdown cleanup
process.on('beforeExit', () => {
  tokenCache.destroy();
});

process.on('SIGTERM', () => {
  tokenCache.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  tokenCache.destroy();
  process.exit(0);
});