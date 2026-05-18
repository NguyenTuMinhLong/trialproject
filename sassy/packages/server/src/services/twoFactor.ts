/**
 * ============================================
 * TWO FACTOR AUTHENTICATION (2FA) SERVICE
 * ============================================
 * 
 * File này chứa các functions để implement TOTP (Time-based OTP)
 * TOTP là chuẩn RFC 6238 - dùng để tạo và verify mã 2FA
 * 
 * Cách hoạt động:
 * 1. Setup: Tạo secret, generate QR code để user quét bằng authenticator app
 * 2. Verify: Khi đăng nhập, user nhập mã 6 số từ app (thay đổi mỗi 30 giây)
 * 3. Backup codes: Các mã dự phòng để đăng nhập khi mất điện thoại
 * 
 * Bảo mật:
 * - Secret được mã hóa AES-256 trước khi lưu vào database
 * - Mỗi user có secret riêng
 * - Backup codes được hash trước khi lưu
 */

import { OTP } from 'otplib/class';  // OTP class từ otplib v13
import QRCode from 'qrcode';         // Thư viện generate QR code
import crypto from 'crypto';          // Để mã hóa secret

/**
 * Tạo OTP instance với cấu hình TOTP
 * TOTP: Time-based One-Time Password
 * - 6 chữ số
 * - Thay đổi mỗi 30 giây
 * - Window: cho phép +/- 1 step để handle clock drift
 */
const otp = new OTP({
  strategy: 'totp',  // Time-based OTP (khác với HOTP là counter-based)
});

/**
 * Tạo secret mới cho 2FA
 * 
 * @returns Base32-encoded secret string
 * 
 * Secret này sẽ được:
 * 1. Encode thành QR code để user quét bằng Google Authenticator/Authy
 * 2. Mã hóa và lưu vào database
 */
export function generateNewSecret(): string {
  return otp.generateSecret();
}

/**
 * Tạo TOTP URI cho QR code
 * 
 * @param email - Email của user (dùng làm label trong authenticator app)
 * @param secret - Secret key đã tạo ở trên
 * @returns otpauth:// URI (chuẩn RFC 6030)
 * 
 * URI format: otpauth://totp/Sassy%20App:user@example.com?secret=XXX&issuer=Sassy%20App
 */
export function generateTOTPURI(email: string, secret: string): string {
  return otp.generateURI({
    issuer: 'Sassy App',   // Tên app hiển thị trong authenticator
    label: email,          // Label (thường là email)
    secret,                // Secret key
  });
}

/**
 * Generate QR code dưới dạng data URL (base64 image)
 * 
 * @param otpauthUri - URI từ generateTOTPURI()
 * @returns Data URL của QR code image (VD: data:image/png;base64,...)
 * 
 * Frontend có thể dùng data URL này làm src của thẻ <img>
 */
export async function generateQRCode(otpauthUri: string): Promise<string> {
  return await QRCode.toDataURL(otpauthUri);
}

/**
 * Verify mã TOTP
 * 
 * @param token - Mã 6 số từ authenticator app
 * @param secret - Secret key (đã giải mã từ database)
 * @returns true nếu mã hợp lệ, false nếu không
 * 
 * Verify bằng cách:
 * 1. Tính toán TOTP dựa trên secret + current timestamp
 * 2. So sánh với token user nhập vào
 * 3. Cho phép window = 1 để handle clock drift nhẹ
 */
export function verifyTOTP(token: string, secret: string): boolean {
  try {
    const result = otp.verifySync({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Tạo 10 mã dự phòng (backup codes)
 * 
 * @returns Array 10 mã, mỗi mã 10 ký tự hex (VD: A1B2C3D4E5)
 * 
 * Đặc điểm:
 * - Mỗi mã chỉ có thể dùng 1 lần
 * - Khi dùng, mã sẽ bị xóa khỏi danh sách
 * - User nên lưu lại khi enable 2FA (chỉ hiển thị 1 lần)
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    // Tạo 5 random bytes = 10 hex characters
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

// ============================================
// MÃ HÓA SECRET (BẢO MẬT)
// ============================================

/**
 * Mã hóa 2FA secret trước khi lưu vào database
 * 
 * Dùng AES-256-CBC:
 * - AES-256: Độ dài key 256 bits (32 bytes), rất an toàn
 * - CBC: Cipher Block Chaining mode
 * - IV: Initial Vector ngẫu nhiên cho mỗi lần mã hóa
 * 
 * @param secret - Secret key thuần (Base32 string)
 * @returns IV:encryptedData (hex format)
 */
export function encryptSecret(secret: string): string {
  // Key cho AES-256 phải đúng 32 bytes
  // Nếu env var không đủ 32 chars, pad thêm '!'
  const keyBase = process.env.TWO_FACTOR_SECRET_KEY || 'default-encryption-key-32chars!!';
  const key = keyBase.padEnd(32, '!').slice(0, 32);
  
  // Tạo IV ngẫu nhiên (16 bytes)
  const iv = crypto.randomBytes(16);
  
  // Tạo cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  // Mã hóa
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Format: IV (32 hex chars) : encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Giải mã 2FA secret khi verify
 * 
 * @param encrypted - Chuỗi đã mã hóa (IV:encryptedData)
 * @returns Secret key thuần (Base32 string)
 */
export function decryptSecret(encrypted: string): string {
  const keyBase = process.env.TWO_FACTOR_SECRET_KEY || 'default-encryption-key-32chars!!';
  const key = keyBase.padEnd(32, '!').slice(0, 32);
  
  // Tách IV và encrypted data
  const [ivHex, encryptedHex] = encrypted.split(':');
  
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted secret format');
  }
  
  // Tái tạo IV từ hex
  const iv = Buffer.from(ivHex, 'hex');
  
  // Tạo decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  
  // Giải mã
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
