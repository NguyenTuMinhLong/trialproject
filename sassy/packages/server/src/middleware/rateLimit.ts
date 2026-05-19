/**
 * ============================================
 * RATE LIMITING - CHỐNG BRUTE FORCE
 * ============================================
 * 
 * Rate limiting giới hạn số request trong một khoảng thời gian
 * Giúp chống brute force attack (thử password nhiều lần)
 */

import rateLimit from 'express-rate-limit';

/**
 * Rate limiter cho đăng nhập
 * - 5 lần thử tối đa trong 5 phút
 * - Sau đó block 5 phút
 */
export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 5, // 5 lần thử
  message: {
    message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 5 phút.',
    retryAfter: 5 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Đếm cả request thành công
  keyGenerator: (req) => {
    // Dùng IP + email để track riêng cho từng account
    const email = req.body?.email || '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}:${email}`;
  }
});

/**
 * Rate limiter cho đăng ký
 * - 5 lần thử tối đa trong 5 phút
 */
export const registerRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 5, // 5 lần thử
  message: {
    message: 'Quá nhiều lần thử đăng ký. Vui lòng thử lại sau 5 phút.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Dùng IP + email để track
    const email = req.body?.email || '';
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `${ip}:${email}`;
  }
});

/**
 * Rate limiter chung cho API
 * - 100 requests trong 1 phút (cho các endpoint khác)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100, // 100 requests
  message: {
    message: 'Quá nhiều request. Vui lòng thử lại sau.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});
