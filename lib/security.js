/**
 * Security utilities for API routes
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Sanitize error message to prevent information leakage
 */
export function sanitizeErrorMessage(error, defaultMessage = 'An error occurred') {
  if (!error) return defaultMessage;
  
  // In production, never expose internal error details
  if (process.env.NODE_ENV === 'production') {
    return defaultMessage;
  }
  
  // In development, show more details
  return error.message || defaultMessage;
}

/**
 * Validate request body size (prevent DoS)
 */
export function validateBodySize(req, maxSize = 1024 * 1024) { // 1MB default
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > maxSize) {
    return false;
  }
  return true;
}

/**
 * CORS headers for API routes
 */
export function getCorsHeaders(origin) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];
  
  const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCors(req, res) {
  const headers = getCorsHeaders(req.headers.origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}

