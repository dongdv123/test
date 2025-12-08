/**
 * Distributed rate limiting using Redis (with in-memory fallback)
 * Supports multiple server instances
 */

let redisClient = null;

// Try to initialize Redis (optional - falls back to in-memory if not available)
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
        console.warn('[RateLimit] Redis error (falling back to in-memory):', err.message);
        redisClient = null;
      });
      
      console.log('[RateLimit] ✅ Redis connected for distributed rate limiting');
      return redisClient;
    } catch (error) {
      console.warn('[RateLimit] Redis not available, using in-memory rate limiting:', error.message);
      redisClient = null;
    }
  }
  
  return null;
}

// Initialize Redis on module load (non-blocking)
if (typeof window === 'undefined') {
  initRedis().catch(() => {
    // Silent fail - will use in-memory rate limiting
  });
}

// Fallback in-memory rate limiting (from original rateLimit.js)
const buckets = new Map();

const getIpFromReq = (req) => {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) {
    return xff.split(",")[0].trim();
  }
  return (
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

/**
 * Check rate limit using Redis (distributed) or in-memory fallback
 */
export async function checkRateLimit({ key, windowMs = 60_000, max = 60 }) {
  const now = Date.now();
  
  // Try Redis first for distributed rate limiting
  if (redisClient) {
    try {
      const redisKey = `ratelimit:${key}`;
      
      // Get current count
      const count = await redisClient.incr(redisKey);
      
      // Set expiration on first increment
      if (count === 1) {
        await redisClient.pexpire(redisKey, windowMs);
      }
      
      // Check if limit exceeded
      if (count > max) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('[RateLimit] Redis error, falling back to in-memory:', error.message);
      redisClient = null;
      // Fall through to in-memory rate limiting
    }
  }
  
  // Fallback to in-memory rate limiting
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= max;
}

/**
 * Get client IP from request
 */
export function getClientIp(req) {
  return getIpFromReq(req);
}

/**
 * Initialize rate limiting (call this on server startup)
 */
export async function initRateLimit() {
  await initRedis();
}

/**
 * Clear rate limit for a key (useful for testing or manual reset)
 */
export async function clearRateLimit(key) {
  if (redisClient) {
    try {
      await redisClient.del(`ratelimit:${key}`);
      return;
    } catch (error) {
      console.warn('[RateLimit] Redis clear error:', error.message);
      redisClient = null;
    }
  }
  
  // Fallback: clear from memory
  buckets.delete(key);
}

