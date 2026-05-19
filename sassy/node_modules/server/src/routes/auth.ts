/**
 * ============================================
 * AUTH ROUTES - TẤT CẢ API XÁC THỰC
 * ============================================
 * 
 * File này chứa tất cả routes liên quan đến xác thực:
 * - Đăng ký / Đăng nhập / Đăng xuất
 * - Refresh token / Get user info
 * - OAuth (Google, GitHub)
 * - 2FA (setup, enable, verify, disable)
 * - Email verification / Quên mật khẩu
 * 
 * Tất cả routes đều được prefix với /auth
 * VD: /auth/login, /auth/register, /auth/2fa/setup
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload
} from '../config/jwt.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendEmail, verifyEmailTemplate, resetPasswordTemplate, passwordChangedTemplate, backupCodesTemplate } from '../services/email.js';
import {
  getGoogleAuthUrl,
  exchangeCodeForGoogleTokens,
  getGoogleUserInfo,
  getGitHubAuthUrl,
  exchangeCodeForGitHubToken,
  getGitHubUserInfo,
  getGitHubEmails
} from '../services/oauth.js';
import {
  generateNewSecret,
  generateTOTPURI,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  encryptSecret,
  decryptSecret
} from '../services/twoFactor.js';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimit.js';
import { validatePassword, containsPersonalInfo } from '../utils/password.js';

// Tạo router Express
const router = Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Tạo Access Token và Refresh Token cho user
 * 
 * Luồng hoạt động:
 * 1. Tạo random UUID cho tokenId
 * 2. Lưu RefreshToken vào database (để có thể revoke sau)
 * 3. Tạo JWT access token và refresh token
 * 
 * @param user - User object (id, email, role)
 * @returns { accessToken, refreshToken }
 */
async function generateTokens(user: { id: string; email: string; role: string }) {
  // Tạo unique ID cho refresh token record
  const tokenId = crypto.randomUUID();

  // Thời hạn refresh token: 7 ngày
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Lưu refresh token vào database
  // Việc lưu vào DB cho phép:
  // - Revoke token khi user logout
  // - Revoke tất cả tokens khi đổi password
  // - Track sessions của user
  await prisma.refreshToken.create({
    data: {
      token: tokenId,
      userId: user.id,
      expiresAt,
    }
  });

  // Tạo JWT tokens
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
    tokenId  // Include tokenId để revoke sau
  });

  return { accessToken, refreshToken };
}

/**
 * Thu hồi (revoke) tất cả refresh tokens của một user
 * Dùng khi user đổi password - buộc tất cả sessions phải login lại
 */
async function revokeAllUserTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true }
  });
}

/**
 * Thu hồi một refresh token cụ thể
 * Dùng khi user logout
 */
async function revokeToken(tokenId: string) {
  await prisma.refreshToken.updateMany({
    where: { token: tokenId, revoked: false },
    data: { revoked: true }
  });
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * POST /auth/register
 * 
 * Đăng ký tài khoản mới
 * 
 * Request body:
 * - name: Tên user
 * - email: Email (phải unique)
 * - password: Mật khẩu (sẽ được hash)
 * 
 * Response:
 * - 201: Đăng ký thành công, trả về tokens và user info
 * - 400: Thiếu thông tin hoặc email đã tồn tại
 */
router.post('/register', registerRateLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    // Validate password theo chuẩn bảo mật
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Mật khẩu không đủ mạnh',
        errors: passwordValidation.errors
      });
    }

    // Kiểm tra password có chứa thông tin cá nhân không
    if (containsPersonalInfo(password, name, email)) {
      return res.status(400).json({ 
        message: 'Mật khẩu không được chứa tên hoặc email của bạn'
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Hash password với bcrypt (cost factor = 12)
    // Cost factor cao hơn = bảo mật hơn nhưng chậm hơn
    const hashedPassword = await bcrypt.hash(password, 12);

    // Tạo user mới trong database
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: 'USER'  // Mặc định là USER role
      }
    });

    // Tạo tokens cho user mới (auto login sau đăng ký)
    const { accessToken, refreshToken } = await generateTokens(newUser);

    console.log(`✅ User registered: ${email}`);
    res.status(201).json({
      message: 'Đăng ký thành công',
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Lỗi register:', error.message);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});

/**
 * POST /auth/login
 * 
 * Đăng nhập bằng email và password
 * 
 * Request body:
 * - email: Email
 * - password: Mật khẩu
 * 
 * Response:
 * - 200: Đăng nhập thành công, trả về tokens
 * - 200 + requires2FA: Cần verify 2FA (nếu user bật 2FA)
 * - 400: Email hoặc password sai
 */
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
    }

    // Tìm user theo email
    const user = await prisma.user.findUnique({ where: { email } });

    // Kiểm tra user tồn tại và có password (không phải OAuth-only account)
    if (!user || !user.password) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Nếu user bật 2FA, yêu cầu verify trước
    // Trả về flag requires2FA để frontend hiển thị form 2FA
    if (user.twoFactorEnabled) {
      return res.json({
        requires2FA: true,
        message: 'Vui lòng nhập mã 2FA'
      });
    }

    // Tạo tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    console.log(`✅ User logged in: ${email}`);
    res.json({
      message: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Lỗi login:', error.message);
    res.status(500).json({ message: 'Lỗi server: ' + error.message });
  }
});

/**
 * POST /auth/logout
 * 
 * Đăng xuất - revoke refresh token
 * 
 * Request body:
 * - refreshToken: Refresh token hiện tại
 * 
 * Response:
 * - 200: Đăng xuất thành công
 * - 401: Refresh token không hợp lệ
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Thiếu refresh token' });
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ' });
    }

    // Revoke token trong database
    await revokeToken(payload.tokenId);

    res.json({ message: 'Đăng xuất thành công' });
  } catch (error: any) {
    console.error('Lỗi logout:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/refresh
 * 
 * Làm mới access token bằng refresh token
 * Dùng khi access token hết hạn (15 phút)
 * 
 * Request body:
 * - refreshToken: Refresh token còn hạn
 * 
 * Response:
 * - 200: Trả về access token và refresh token mới
 * - 401: Refresh token không hợp lệ hoặc đã bị revoke
 * 
 * Lưu ý: Dùng token rotation - revoke token cũ và tạo token mới
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Thiếu refresh token' });
    }

    // Verify refresh token JWT
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ message: 'Refresh token không hợp lệ hoặc đã hết hạn' });
    }

    // Kiểm tra token trong database (chưa bị revoke?)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: payload.tokenId }
    });

    // Token không tồn tại, đã bị revoke, hoặc đã hết hạn
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token đã bị thu hồi hoặc hết hạn' });
    }

    // Lấy user info
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User không tồn tại' });
    }

    // REVOKE token cũ (token rotation - bảo mật hơn)
    await revokeToken(payload.tokenId);

    // Tạo tokens mới
    const tokens = await generateTokens(user);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error: any) {
    console.error('Lỗi refresh:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

/**
 * GET /auth/me
 * 
 * Lấy thông tin user hiện tại
 * Cần gửi Access Token trong Authorization header
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 * 
 * Response:
 * - 200: Trả về user info
 * - 401: Token không hợp lệ
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Lỗi get me:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * PUT /auth/me
 * 
 * Cập nhật thông tin profile (name, image)
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 * 
 * Request body:
 * - name?: string
 * - image?: string (URL)
 */
router.put('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, image } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(image && { image })  // Chỉ update nếu có giá trị
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true
      }
    });

    res.json({ user: updatedUser, message: 'Cập nhật thành công' });
  } catch (error: any) {
    console.error('Lỗi update me:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * PUT /auth/me/password
 * 
 * Đổi mật khẩu
 * Sau khi đổi, tất cả refresh tokens bị revoke (force re-login)
 * 
 * Headers:
 * - Authorization: Bearer <access_token>
 * 
 * Request body:
 * - currentPassword: Mật khẩu hiện tại
 * - newPassword: Mật khẩu mới (tối thiểu 8 ký tự)
 */
router.put('/me/password', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Validate
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Thiếu mật khẩu' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 8 ký tự' });
    }

    // Lấy user với password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'User không có mật khẩu' });
    }

    // Verify mật khẩu hiện tại
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại sai' });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke tất cả sessions - user phải login lại
    await revokeAllUserTokens(userId);

    res.json({ message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error: any) {
    console.error('Lỗi change password:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============================================
// EMAIL VERIFICATION ROUTES
// ============================================

/**
 * POST /auth/verify-email/send
 * 
 * Gửi mã xác thực email
 * 
 * Request body:
 * - email: Email cần xác thực
 */
router.post('/verify-email/send', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Thiếu email' });
    }

    // Tìm user
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Luôn return success để prevent email enumeration
    // (Không tiết lộ email có tồn tại hay không)
    if (!user) {
      return res.json({ message: 'Nếu email tồn tại, mã xác thực đã được gửi' });
    }

    // Đã verify rồi
    if (user.emailVerified) {
      return res.json({ message: 'Email đã được xác thực trước đó' });
    }

    // Tạo mã 6 số ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Tạo token 64 ký tự hex
    const token = crypto.randomBytes(32).toString('hex');

    // Xóa tokens cũ cho email này
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, type: 'EMAIL_VERIFICATION' }
    });

    // Lưu token mới (hết hạn sau 1 giờ)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        type: 'EMAIL_VERIFICATION',
        expires
      }
    });

    // Gửi email
    const html = verifyEmailTemplate(user.name || '', code);
    await sendEmail({
      to: email,
      subject: 'Mã xác thực email - Sassy App',
      html
    });

    // Development mode: trả về code để test không cần email
    const isDev = process.env.NODE_ENV === 'development';
    
    res.json({
      message: 'Mã xác thực đã được gửi',
      ...(isDev && { devCode: code })  // Chỉ trả về trong dev!
    });
  } catch (error: any) {
    console.error('Lỗi send verification:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/verify-email
 * 
 * Xác thực email bằng token
 * 
 * Request body:
 * - token: Token từ email verification
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Thiếu token' });
    }

    // Tìm token trong database
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken) {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }

    if (verificationToken.type !== 'EMAIL_VERIFICATION') {
      return res.status(400).json({ message: 'Token không đúng loại' });
    }

    if (verificationToken.expires < new Date()) {
      return res.status(400).json({ message: 'Token đã hết hạn' });
    }

    // Update user - đánh dấu email đã verify
    await prisma.user.update({
      where: { email: verificationToken.identifier },
      data: { emailVerified: new Date() }
    });

    // Xóa token sau khi dùng (one-time use)
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    });

    res.json({ message: 'Xác thực email thành công!' });
  } catch (error: any) {
    console.error('Lỗi verify email:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============================================
// PASSWORD RESET ROUTES
// ============================================

/**
 * POST /auth/forgot-password
 * 
 * Gửi email đặt lại mật khẩu
 * 
 * Request body:
 * - email: Email tài khoản
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Thiếu email' });
    }

    // Tìm user
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Luôn return success để prevent email enumeration
    if (!user) {
      return res.json({ message: 'Nếu email tồn tại, email đặt lại mật khẩu đã được gửi' });
    }

    // Tạo reset token
    const token = crypto.randomBytes(32).toString('hex');

    // Xóa tokens cũ
    await prisma.verificationToken.deleteMany({
      where: { identifier: email, type: 'PASSWORD_RESET' }
    });

    // Lưu token mới
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        type: 'PASSWORD_RESET',
        expires
      }
    });

    // Gửi email
    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;
    const html = resetPasswordTemplate(user.name || '', resetUrl);
    await sendEmail({
      to: user.email,
      subject: 'Đặt lại mật khẩu - Sassy App',
      html
    });

    // Development mode: trả về token
    const isDev = process.env.NODE_ENV === 'development';

    res.json({
      message: 'Email đặt lại mật khẩu đã được gửi',
      ...(isDev && { devToken: token })
    });
  } catch (error: any) {
    console.error('Lỗi forgot password:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/reset-password
 * 
 * Đặt lại mật khẩu bằng token
 * 
 * Request body:
 * - token: Token từ email
 * - newPassword: Mật khẩu mới (tối thiểu 8 ký tự)
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Thiếu token hoặc mật khẩu mới' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu mới phải ít nhất 8 ký tự' });
    }

    // Tìm token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken) {
      return res.status(400).json({ message: 'Token không hợp lệ' });
    }

    if (verificationToken.type !== 'PASSWORD_RESET') {
      return res.status(400).json({ message: 'Token không đúng loại' });
    }

    if (verificationToken.expires < new Date()) {
      return res.status(400).json({ message: 'Token đã hết hạn' });
    }

    // Lấy user
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier }
    });

    if (!user) {
      return res.status(400).json({ message: 'User không tồn tại' });
    }

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Xóa token
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id }
    });

    // Revoke tất cả sessions
    await revokeAllUserTokens(user.id);

    // Gửi email thông báo
    const html = passwordChangedTemplate(user.name || '');
    await sendEmail({
      to: user.email,
      subject: 'Mật khẩu đã được thay đổi - Sassy App',
      html
    });

    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (error: any) {
    console.error('Lỗi reset password:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

/**
 * GET /auth/google
 * 
 * Redirect user đến Google OAuth consent screen
 * User sẽ authorize app, sau đó redirect về /auth/google/callback
 */
router.get('/google', (req, res) => {
  const authUrl = getGoogleAuthUrl();
  res.redirect(authUrl);
});

/**
 * GET /auth/google/callback
 * 
 * Xử lý OAuth callback từ Google
 * 
 * Luồng:
 * 1. Nhận authorization code từ Google
 * 2. Exchange code lấy access token
 * 3. Lấy user info từ Google
 * 4. Tạo hoặc update user trong database
 * 5. Tạo JWT tokens
 * 6. Redirect về frontend với tokens
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // User deny consent
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=google_denied`);
    }

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=missing_code`);
    }

    // Exchange code lấy tokens
    const tokens = await exchangeCodeForGoogleTokens(code as string);
    if (!tokens) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=token_exchange_failed`);
    }

    // Lấy user info từ Google
    const googleUser = await getGoogleUserInfo(tokens.access_token);
    if (!googleUser) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=user_info_failed`);
    }

    // Tìm hoặc tạo user trong database
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email }
    });

    if (!user) {
      // Tạo user mới
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          image: googleUser.picture,
          googleId: googleUser.id,
          emailVerified: new Date(), // Auto-verify vì Google đã verify
          role: 'USER'
        }
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.id,
          ...(googleUser.picture && { image: googleUser.picture })
        }
      });
    }

    // Tạo JWT tokens
    const authTokens = await generateTokens(user);

    // Redirect về frontend với tokens
    const params = new URLSearchParams({
      accessToken: authTokens.accessToken,
      refreshToken: authTokens.refreshToken
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/success?${params.toString()}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error?message=server_error`);
  }
});

// ============================================
// GITHUB OAUTH ROUTES
// ============================================

/**
 * GET /auth/github
 * 
 * Redirect user đến GitHub OAuth consent screen
 */
router.get('/github', (req, res) => {
  const authUrl = getGitHubAuthUrl();
  res.redirect(authUrl);
});

/**
 * GET /auth/github/callback
 * 
 * Xử lý OAuth callback từ GitHub
 * Tương tự Google OAuth nhưng cần handle trường hợp email private
 */
router.get('/github/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('GitHub OAuth error:', error);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=github_denied`);
    }

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=missing_code`);
    }

    // Exchange code lấy token
    const accessToken = await exchangeCodeForGitHubToken(code as string);
    if (!accessToken) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=token_exchange_failed`);
    }

    // Lấy user info
    const githubUser = await getGitHubUserInfo(accessToken);
    if (!githubUser) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=user_info_failed`);
    }

    // GitHub không trả email trong user info nếu là private
    // Phải gọi API riêng để lấy emails
    let email = githubUser.email;
    if (!email) {
      const emails = await getGitHubEmails(accessToken);
      // Tìm email primary và verified
      const primaryEmail = emails.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=email_required`);
    }

    // Tìm hoặc tạo user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: githubUser.name || githubUser.login,
          image: githubUser.avatar_url,
          githubId: githubUser.id.toString(),
          emailVerified: new Date(),
          role: 'USER'
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubId: githubUser.id.toString(),
          ...(githubUser.avatar_url && { image: githubUser.avatar_url })
        }
      });
    }

    // Tạo tokens
    const authTokens = await generateTokens(user);

    // Redirect về frontend
    const params = new URLSearchParams({
      accessToken: authTokens.accessToken,
      refreshToken: authTokens.refreshToken
    });

    res.redirect(`${process.env.CLIENT_URL}/auth/success?${params.toString()}`);
  } catch (error: any) {
    console.error('GitHub OAuth callback error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error?message=server_error`);
  }
});

// ============================================
// 2FA ROUTES
// ============================================

/**
 * POST /auth/2fa/setup
 * 
 * Bắt đầu setup 2FA - tạo secret và QR code
 * Cần đã đăng nhập (có access token)
 * 
 * Response:
 * - qrCode: Base64 image của QR code
 * - secret: Secret key (để backup nếu không quét được QR)
 * 
 * Frontend hiển thị QR code để user quét bằng authenticator app
 */
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Kiểm tra 2FA đã bật chưa
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user?.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA đã được bật' });
    }

    // Tạo secret mới
    const secret = generateNewSecret();
    // Mã hóa secret trước khi lưu
    const encryptedSecret = encryptSecret(secret);

    // Tạo QR code URI
    const otpauthUri = generateTOTPURI(user!.email, secret);
    // Generate QR code image
    const qrCode = await generateQRCode(otpauthUri);

    // Lưu secret đã mã hóa vào database (chưa bật 2FA)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encryptedSecret }
    });

    res.json({
      qrCode,
      secret,
      message: 'Quét mã QR bằng ứng dụng Google Authenticator hoặc Authy'
    });
  } catch (error: any) {
    console.error('Lỗi 2FA setup:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/2fa/enable
 * 
 * Bật 2FA sau khi user đã quét QR code
 * Cần verify mã 2FA trước khi bật
 * 
 * Request body:
 * - code: Mã 6 số từ authenticator app
 */
router.post('/2fa/enable', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Thiếu mã xác thực' });
    }

    // Lấy user với secret đã lưu
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Chưa thiết lập 2FA' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA đã được bật' });
    }

    // Giải mã secret và verify
    let secret;
    try {
      secret = decryptSecret(user.twoFactorSecret);
    } catch {
      return res.status(400).json({ message: 'Lỗi giải mã secret' });
    }

    // Verify mã 2FA
    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      return res.status(400).json({ message: 'Mã xác thực không đúng' });
    }

    // Tạo 10 backup codes
    const backupCodes = generateBackupCodes();
    // Hash backup codes trước khi lưu
    const hashedBackupCodes = JSON.stringify(
      backupCodes.map(code => bcrypt.hashSync(code, 10))
    );

    // Bật 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes
      }
    });

    res.json({
      message: '2FA đã được bật thành công',
      backupCodes // Trả về plain codes - CHỈ HIỂN THỊ 1 LẦN
    });
  } catch (error: any) {
    console.error('Lỗi 2FA enable:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/2fa/verify
 * 
 * Verify 2FA khi đăng nhập
 * Dùng khi user có bật 2FA và cần nhập mã sau khi login
 * 
 * Request body:
 * - email: Email đăng nhập
 * - password: Mật khẩu
 * - code?: Mã 6 số từ authenticator
 * - backupCode?: Mã dự phòng
 */
router.post('/2fa/verify', async (req, res) => {
  try {
    const { email, password, code, backupCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng nhập' });
    }

    if (!code && !backupCode) {
      return res.status(400).json({ message: 'Thiếu mã 2FA' });
    }

    // Tìm user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    // Nếu không bật 2FA, trả về tokens luôn
    if (!user.twoFactorEnabled) {
      const tokens = await generateTokens(user);
      return res.json({
        message: 'Đăng nhập thành công',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }

    // === Đã bật 2FA ===

    if (code) {
      // Verify bằng TOTP code
      if (!user.twoFactorSecret) {
        return res.status(400).json({ message: '2FA chưa được thiết lập' });
      }

      let secret;
      try {
        secret = decryptSecret(user.twoFactorSecret);
      } catch {
        return res.status(400).json({ message: 'Lỗi giải mã secret' });
      }

      const isValid = verifyTOTP(code, secret);
      if (!isValid) {
        return res.status(400).json({ message: 'Mã 2FA không đúng' });
      }
    } else if (backupCode) {
      // Verify bằng backup code
      const storedBackupCodes = JSON.parse(user.twoFactorBackupCodes || '[]');
      let foundIndex = -1;

      // So sánh với từng hashed backup code
      for (let i = 0; i < storedBackupCodes.length; i++) {
        if (bcrypt.compareSync(backupCode, storedBackupCodes[i])) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex === -1) {
        return res.status(400).json({ message: 'Mã dự phòng không đúng' });
      }

      // Xóa backup code đã dùng (one-time use)
      storedBackupCodes.splice(foundIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: JSON.stringify(storedBackupCodes) }
      });
    }

    // Tạo tokens
    const tokens = await generateTokens(user);

    res.json({
      message: 'Đăng nhập thành công',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error: any) {
    console.error('Lỗi 2FA verify:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /auth/2fa/disable
 * 
 * Tắt 2FA
 * Cần verify password và mã 2FA trước khi tắt
 * Sau khi tắt, tất cả sessions bị revoke
 * 
 * Request body:
 * - code: Mã 2FA hiện tại
 * - password: Mật khẩu để xác nhận
 */
router.post('/2fa/disable', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { code, password } = req.body;

    if (!code || !password) {
      return res.status(400).json({ message: 'Thiếu mã 2FA hoặc mật khẩu' });
    }

    // Lấy user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: 'User không tồn tại' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA chưa được bật' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'User không có mật khẩu' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Mật khẩu không đúng' });
    }

    // Verify 2FA code
    if (user.twoFactorSecret) {
      let secret;
      try {
        secret = decryptSecret(user.twoFactorSecret);
      } catch {
        return res.status(400).json({ message: 'Lỗi giải mã secret' });
      }

      const isValid = verifyTOTP(code, secret);
      if (!isValid) {
        return res.status(400).json({ message: 'Mã 2FA không đúng' });
      }
    }

    // Tắt 2FA - xóa secret và backup codes
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      }
    });

    // Revoke tất cả sessions
    await revokeAllUserTokens(userId);

    res.json({ message: '2FA đã được tắt thành công' });
  } catch (error: any) {
    console.error('Lỗi 2FA disable:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Export router để use trong index.ts
export default router;
