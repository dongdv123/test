/**
 * Caching layer for API responses
 * Supports Redis (if available) or in-memory fallback
 */

let redisClient = null;
let memoryCache = new Map();

// Try to initialize Redis (optional - falls back to memory if not available)
async function initRedis() {
  if (redisClient) return redisClient;
  
  // Only try to use Redis if REDIS_URL is set
  if (process.env.REDIS_URL) {
    try {
      // Dynamic import to avoid errors if ioredis is not installed
      const Redis = (await import('ioredis')).default;
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableOfflineQueue: false,
      });
      
      redisClient.on('error', (err) => {
        console.warn('[Cache] Redis error (falling back to memory):', err.message);
        redisClient = null;
      });
      
      console.log('[Cache] ✅ Redis connected');
      return redisClient;
    } catch (error) {
      console.warn('[Cache] Redis not available, using in-memory cache:', error.message);
      redisClient = null;
    }
  }
  
  return null;
}

// Initialize Redis on module load (non-blocking)
if (typeof window === 'undefined') {
  initRedis().catch(() => {
    // Silent fail - will use memory cache
  });
}

/**
 * Generate cache key from query and variables
 */
function getCacheKey(query, variables = {}) {
  const key = JSON.stringify({ query, variables });
  // Create a hash for shorter keys
  const crypto = require('crypto');
  return `shopify:${crypto.createHash('md5').update(key).digest('hex')}`;
}

/**
 * Get cached value
 */
async function getCached(key) {
  // Try Redis first
  if (redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.warn('[Cache] Redis get error, falling back to memory:', error.message);
      redisClient = null;
    }
  }
  
  // Fallback to memory cache
  const cached = memoryCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  
  // Clean up expired entries
  if (cached) {
    memoryCache.delete(key);
  }
  
  return null;
}

/**
 * Set cached value
 */
async function setCached(key, value, ttlSeconds = 300) {
  const expires = Date.now() + ttlSeconds * 1000;
  
  // Try Redis first
  if (redisClient) {
    try {
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch (error) {
      console.warn('[Cache] Redis set error, falling back to memory:', error.message);
      redisClient = null;
    }
  }
  
  // Fallback to memory cache
  memoryCache.set(key, { value, expires });
  
  // Clean up old entries periodically (keep max 1000 entries)
  if (memoryCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (v.expires < now) {
        memoryCache.delete(k);
      }
    }
  }
}

/**
 * Clear cache by pattern
 */
async function clearCache(pattern) {
  if (redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return;
    } catch (error) {
      console.warn('[Cache] Redis clear error:', error.message);
      redisClient = null;
    }
  }
  
  // Fallback: clear memory cache
  if (pattern === 'shopify:*') {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern.replace('*', ''))) {
        memoryCache.delete(key);
      }
    }
  }
}

/**
 * Cache wrapper for async functions
 */
export async function withCache(fn, options = {}) {
  const {
    key,
    ttl = 300, // 5 minutes default
    query,
    variables = {},
  } = options;
  
  const cacheKey = key || getCacheKey(query || fn.toString(), variables);
  
  // Try to get from cache
  const cached = await getCached(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Execute function and cache result
  const result = await fn();
  
  // Only cache successful results
  if (result !== null && result !== undefined) {
    await setCached(cacheKey, result, ttl);
  }
  
  return result;
}

/**
 * Cache TTL presets
 */
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - for products, collections
  LONG: 1800,       // 30 minutes - for menu, static data
  VERY_LONG: 3600,  // 1 hour - for rarely changing data
};

/**
 * Initialize cache (call this on server startup)
 */
export async function initCache() {
  await initRedis();
}

/**
 * Clear all Shopify cache
 */
export async function clearShopifyCache() {
  await clearCache('shopify:*');
}

// Export for manual cache management (initCache already exported above)
export { getCached, setCached, clearCache };

