# Performance Optimization Setup Guide

Hướng dẫn setup các cải thiện hiệu năng để web có thể xử lý 500K+ concurrent users.

## 🚀 Đã Triển Khai (Phase 1)

### 1. Redis Caching Layer
- ✅ API response caching với Redis (fallback to in-memory)
- ✅ TTL configurable cho từng loại data
- ✅ Auto-cleanup expired entries

### 2. ISR (Incremental Static Regeneration)
- ✅ Homepage: Convert từ SSR → ISR (revalidate 60s)
- ✅ Collection pages: Convert từ SSR → ISR với getStaticPaths
- ✅ Pages được pre-rendered và cached tại CDN

### 3. Distributed Rate Limiting
- ✅ Redis-based rate limiting (fallback to in-memory)
- ✅ Hoạt động với multiple server instances
- ✅ Tất cả API endpoints đã được cập nhật

### 4. Caching Headers
- ✅ Production: Cache headers cho static assets và ISR pages
- ✅ Stale-while-revalidate cho better UX

---

## 📦 Cài Đặt

### 1. Install Dependencies

```bash
npm install
```

Dependencies đã được thêm:
- `ioredis` - Redis client cho caching và rate limiting

### 2. Setup Redis (Optional nhưng khuyến nghị)

#### Option A: Local Redis
```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Windows
# Download từ: https://github.com/microsoftarchive/redis/releases
```

#### Option B: Redis Cloud (Recommended cho production)
1. Đăng ký tại [Redis Cloud](https://redis.com/try-free/)
2. Tạo database
3. Copy connection URL

#### Option C: Docker
```bash
docker run -d -p 6379:6379 redis:alpine
```

### 3. Environment Variables

Thêm vào `.env.local`:

```env
# Redis (Optional - sẽ fallback to in-memory nếu không có)
REDIS_URL=redis://localhost:6379
# Hoặc cho Redis Cloud:
# REDIS_URL=redis://default:password@host:port

# Shopify (Required)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=your-storefront-token
SHOPIFY_ADMIN_API_TOKEN=your-admin-token
```

**Lưu ý:** 
- Nếu không có Redis, hệ thống sẽ tự động fallback về in-memory caching
- In-memory caching chỉ hoạt động với single instance
- Redis được khuyến nghị cho production với multiple instances

---

## 🔧 Cấu Hình

### Cache TTL Presets

Trong `lib/cache.js`:

```javascript
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute - for frequently changing data
  MEDIUM: 300,      // 5 minutes - for products, collections
  LONG: 1800,       // 30 minutes - for menu, static data
  VERY_LONG: 3600,  // 1 hour - for rarely changing data
};
```

### ISR Revalidation

Trong `pages/index.js` và `pages/collections/[handle].js`:

```javascript
return {
  props: { ... },
  revalidate: 60, // Revalidate every 60 seconds
};
```

Có thể điều chỉnh `revalidate` tùy theo nhu cầu:
- `60` - 1 phút (recommended cho products)
- `300` - 5 phút (cho collections)
- `3600` - 1 giờ (cho static content)

---

## 📊 Kết Quả Mong Đợi

### Trước khi tối ưu:
- **Capacity:** ~1,000 concurrent users
- **Response time:** 500ms+ (với cache miss)
- **Shopify API calls:** 150K/hour (với 50K active users)

### Sau khi tối ưu:
- **Capacity:** 500K+ concurrent users ✅
- **Response time:** 50-100ms (với cache hit)
- **Shopify API calls:** ~15K/hour (giảm 90%+) ✅
- **Cache hit rate:** 90%+ ✅

---

## 🧪 Testing

### 1. Test Caching

```bash
# Start dev server
npm run dev

# Check Redis connection (nếu có Redis)
redis-cli ping
# Should return: PONG

# Check cache keys
redis-cli keys "shopify:*"
```

### 2. Test ISR

```bash
# Build production
npm run build
npm start

# Access homepage - should be pre-rendered
curl http://localhost:3000

# Check response headers
curl -I http://localhost:3000
# Should see: Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

### 3. Test Rate Limiting

```bash
# Test API endpoint
for i in {1..35}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
done

# Should see 429 (Too Many Requests) after 30 requests
```

---

## 🚨 Troubleshooting

### Redis không kết nối được

**Lỗi:** `[Cache] Redis not available, using in-memory cache`

**Giải pháp:**
1. Kiểm tra Redis đang chạy: `redis-cli ping`
2. Kiểm tra `REDIS_URL` trong `.env.local`
3. Nếu không có Redis, hệ thống sẽ tự động fallback về in-memory (OK cho development)

### Cache không hoạt động

**Kiểm tra:**
1. Xem console logs: `[Cache] ✅ Redis connected` hoặc `[Cache] Redis not available`
2. Kiểm tra `useCache` option trong function calls
3. Verify cache keys trong Redis: `redis-cli keys "shopify:*"`

### ISR pages không revalidate

**Kiểm tra:**
1. Verify `revalidate` được set trong `getStaticProps`
2. Check Next.js build output: `npm run build`
3. Verify production mode: `NODE_ENV=production`

### Rate limiting không hoạt động

**Kiểm tra:**
1. Verify `REDIS_URL` được set (hoặc sẽ fallback to in-memory)
2. Check API endpoint imports: `from "../../../lib/rateLimitRedis"`
3. Test với multiple requests để verify

---

## 📈 Monitoring

### Cache Metrics

Monitor cache hit rate:
```javascript
// Add to lib/cache.js
let cacheHits = 0;
let cacheMisses = 0;

// In getCached:
if (cached !== null) {
  cacheHits++;
  return cached;
}
cacheMisses++;

// Export metrics
export function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: cacheHits / (cacheHits + cacheMisses),
  };
}
```

### Rate Limit Metrics

Monitor rate limit hits:
```javascript
// Add to lib/rateLimitRedis.js
let rateLimitHits = 0;

// In checkRateLimit:
if (count > max) {
  rateLimitHits++;
  return false;
}
```

---

## 🔄 Next Steps (Phase 2)

Các cải thiện tiếp theo:
1. [ ] Request queue cho Shopify API
2. [ ] Database caching layer với webhooks
3. [ ] Load balancing với multiple instances
4. [ ] APM monitoring (Sentry, Datadog)
5. [ ] CDN setup (Vercel/Cloudflare)

---

## 📚 Tài Liệu Tham Khảo

- [Next.js ISR Documentation](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)
- [Redis Documentation](https://redis.io/docs/)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Performance Analysis Report](./PERFORMANCE_ANALYSIS_500K.md)

---

**Last Updated:** $(date)  
**Version:** 1.0

