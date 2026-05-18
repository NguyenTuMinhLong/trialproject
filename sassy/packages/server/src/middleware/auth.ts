/**
 * ============================================
 * AUTH MIDDLEWARE
 * ============================================
 * 
 * File này chứa các middleware để xác thực requests:
 * - authenticate: Kiểm tra Access Token trong Authorization header
 * - requireRole: Kiểm tra quyền của user
 * 
 * Cách hoạt động:
 * 1. Client gửi request với Header: Authorization: Bearer <access_token>
 * 2. Middleware authenticate() extract và verify token
 * 3. Nếu hợp lệ, gắn thông tin user vào req.user
 * 4. Nếu không hợp lệ, trả về 401 Unauthorized
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../config/jwt.js';

/**
 * Extend Request interface để thêm thông tin user
 * Sau khi authenticate thành công, req.user sẽ chứa TokenPayload
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware authenticate
 * 
 * Extract Access Token từ Authorization header và verify
 * Nếu token hợp lệ, gắn thông tin user vào req.user
 * 
 * @example
 * // Sử dụng trong route
 * router.get('/profile', authenticate, (req, res) => {
 *   const userId = req.user!.id;
 *   // ...
 * });
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  // Lấy Authorization header
  const authHeader = req.headers.authorization;

  // Kiểm tra header có định dạng "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token' });
  }

  // Extract token từ "Bearer <token>"
  const token = authHeader.split(' ')[1];
  
  // Verify token
  const payload = verifyAccessToken(token);

  // Token không hợp lệ hoặc đã hết hạn
  if (!payload) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  // Gắn thông tin user vào request
  req.user = payload;
  next();
}

/**
 * Middleware requireRole
 * 
 * Kiểm tra user có quyền (role) cần thiết hay không
 * Có thể require nhiều roles, user chỉ cần có 1 trong số đó là được
 * 
 * @param roles - Danh sách roles được phép (VD: ['ADMIN', 'MODERATOR'])
 * 
 * @example
 * // Chỉ ADMIN mới được truy cập
 * router.delete('/users/:id', authenticate, requireRole('ADMIN'), handler);
 * 
 * // ADMIN hoặc MODERATOR được truy cập
 * router.patch('/posts/:id', authenticate, requireRole('ADMIN', 'MODERATOR'), handler);
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Kiểm tra đã authenticate chưa
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // Kiểm tra user có role được phép không
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }

    next();
  };
}
