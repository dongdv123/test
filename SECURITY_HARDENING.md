# Security Hardening Guide

## Tình trạng hiện tại

### Phiên bản đang sử dụng
- ✅ Next.js 14.1.0 (Pages Router - KHÔNG phải App Router)
- ✅ React 18.2.0 (KHÔNG phải React 19)
- ✅ Không sử dụng Server Actions
- ✅ Không sử dụng React Server Components (RSC) endpoints

**Kết luận**: Dự án này KHÔNG bị ảnh hưởng bởi CVE-2025-55182 (React2Shell) vì:
- Không sử dụng React 19
- Không sử dụng App Router với RSC
- Không có Server Actions được expose

## Các vấn đề bảo mật cần khắc phục

### 1. Content Security Policy (CSP) - MỨC ĐỘ CAO

**Vấn đề**: CSP hiện tại cho phép `'unsafe-inline'` và `'unsafe-eval'`

**Rủi ro**: 
- Cho phép XSS attacks
- Cho phép code injection

**Giải pháp**:
```javascript
// next.config.js - Cải thiện CSP
Content-Security-Policy: 
  "default-src 'self'; 
   script-src 'self' 'nonce-{random}' https://fonts.googleapis.com; 
   style-src 'self' 'nonce-{random}' https://fonts.googleapis.com; 
   img-src 'self' data: https:; 
   font-src 'self' data: https://fonts.gstatic.com; 
   connect-src 'self' https:; 
   frame-ancestors 'self'; 
   object-src 'none';"
```

### 2. API Routes Security

**Kiểm tra các endpoint**:
- `/api/build-bundle.js` - Cần xác thực
- `/api/auth/*` - Cần rate limiting
- `/api/newsletter/*` - Cần validation

### 3. Environment Variables

**Hành động cần thiết**:
- ✅ Đảm bảo `.env` không được commit vào git
- ✅ Xoay các API keys nếu bị lộ
- ✅ Sử dụng secrets management (Vercel, AWS Secrets Manager)

### 4. Input Validation

**Cần thêm validation cho**:
- User inputs trong forms
- API request parameters
- URL parameters (handle, query strings)

## Biện pháp giảm thiểu ngay lập tức

### 1. Cập nhật dependencies
```bash
npm audit
npm audit fix
npm update next react react-dom
```

### 2. Thêm rate limiting
```javascript
// middleware.js hoặc API routes
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 3. Thêm request validation
```javascript
// lib/validation.js
export function validateInput(input, schema) {
  // Validate against schema
  // Reject malicious inputs
}
```

### 4. Logging và monitoring
- Thêm logging cho tất cả API requests
- Monitor CPU usage
- Alert khi có suspicious activity

### 5. Backup strategy
- ✅ Đảm bảo có automated backups
- ✅ Test restore process
- ✅ Store backups off-site

## Checklist bảo mật

- [ ] Cập nhật tất cả dependencies
- [ ] Xoay API keys và secrets
- [ ] Thêm rate limiting
- [ ] Cải thiện CSP (loại bỏ unsafe-inline/eval)
- [ ] Thêm input validation
- [ ] Kiểm tra logs cho suspicious activity
- [ ] Xác nhận backups hoạt động
- [ ] Thêm monitoring alerts
- [ ] Review tất cả API endpoints
- [ ] Kiểm tra file permissions trên server

## Monitoring

### Các dấu hiệu tấn công cần theo dõi:
1. CPU usage tăng đột ngột (>400%)
2. Unusual network traffic
3. File modifications không được authorize
4. New processes không mong đợi
5. Encrypted files (ransomware)

### Tools đề xuất:
- Vercel Analytics (nếu deploy trên Vercel)
- Sentry (error tracking)
- LogRocket (session replay)
- CloudWatch (nếu dùng AWS)

## Liên hệ khẩn cấp

Nếu phát hiện tấn công:
1. **Ngay lập tức**: Disconnect server khỏi network
2. **Backup**: Restore từ backup sạch
3. **Investigation**: Review logs để tìm attack vector
4. **Patch**: Apply security patches
5. **Rotate**: Xoay tất cả secrets và keys

## Tài liệu tham khảo

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security](https://react.dev/learn/escape-hatches)

