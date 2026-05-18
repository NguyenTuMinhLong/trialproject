/**
 * ============================================
 * JWT CONFIGURATION
 * ============================================
 * 
 * File này chịu trách nhiệm:
 * - Tạo Access Token (JWT ngắn hạn, 15 phút)
 * - Tạo Refresh Token (JWT dài hạn, 7 ngày)
 * - Xác thực (verify) tokens
 * 
 * Access Token: Dùng để xác thực API requests
 * Refresh Token: Dùng để lấy Access Token mới khi hết hạn
 */

import jwt from 'jsonwebtoken';

// Lấy secrets từ biến môi trường
// IMPORTANT: Trong production, phải set JWT_SECRET và REFRESH_SECRET trong .env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'fallback-refresh-secret';

// Thời hạn tokens
// Access token: 15 phút (đủ ngắn để hạn chế rủi ro nếu bị lộ)
export const ACCESS_TOKEN_EXPIRY = '15m';
// Refresh token: 7 ngày (cho phép user đăng nhập lâu hơn)
export const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Interface cho payload của Access Token
 * Chứa thông tin cơ bản của user
 */
export interface TokenPayload {
  id: string;       // User ID từ database
  email: string;    // Email của user
  role: string;     // Vai trò (USER, ADMIN, v.v.)
}

/**
 * Interface cho payload của Refresh Token
 * Chỉ chứa id và tokenId (để track token trong DB)
 */
export interface RefreshTokenPayload {
  id: string;       // User ID
  tokenId: string;  // ID của refresh token record trong database
}

/**
 * Tạo Access Token (JWT)
 * @param payload - Thông tin user (id, email, role)
 * @returns JWT string
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Tạo Refresh Token (JWT)
 * @param payload - Thông tin user + tokenId (để revoke token trong DB)
 * @returns JWT string
 */
export function generateRefreshToken(payload: TokenPayload & { tokenId: string }): string {
  return jwt.sign(
    { id: payload.id, tokenId: payload.tokenId },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Xác thực (verify) Access Token
 * @param token - JWT string
 * @returns TokenPayload nếu hợp lệ, null nếu không
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    // Token không hợp lệ hoặc đã hết hạn
    return null;
  }
}

/**
 * Xác thực (verify) Refresh Token
 * @param token - JWT string
 * @returns RefreshTokenPayload nếu hợp lệ, null nếu không
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    // Token không hợp lệ hoặc đã hết hạn
    return null;
  }
}
