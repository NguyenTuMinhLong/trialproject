/**
 * ============================================
 * EMAIL SERVICE - GỬI EMAIL XÁC THỰC
 * ============================================
 * 
 * File này chịu trách nhiệm:
 * - Gửi email cho user (xác thực email, đặt lại mật khẩu, v.v.)
 * - Chứa các email templates HTML đẹp mắt
 * 
 * Cấu hình SMTP:
 * - Sử dụng Gmail SMTP để gửi email (có thể thay bằng SMTP provider khác)
 * - Cần App Password từ Google Account (bật 2FA trước)
 * 
 * Các templates có sẵn:
 * - welcomeEmailTemplate: Email chào mừng khi đăng ký
 * - verifyEmailTemplate: Mã xác thực 6 số
 * - resetPasswordTemplate: Link đặt lại mật khẩu
 * - passwordChangedTemplate: Thông báo mật khẩu đã đổi
 * - backupCodesTemplate: Mã dự phòng 2FA
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load biến môi trường
dotenv.config();

// Interface cho options khi gửi email
interface EmailOptions {
  to: string;      // Email người nhận
  subject: string; // Tiêu đề email
  html: string;    // Nội dung HTML của email
}

/**
 * Tạo SMTP Transporter
 * 
 * Cấu hình kết nối đến SMTP server
 * Hiện tại dùng Gmail SMTP
 * 
 * Cách lấy App Password Gmail:
 * 1. Bật 2-Factor Authentication trên Google Account
 * 2. Vào https://myaccount.google.com/security → App passwords
 * 3. Tạo App password mới
 * 4. Dùng App password này cho SMTP_PASS trong .env
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',  // SMTP server
  port: parseInt(process.env.SMTP_PORT || '587'),   // Port (587 cho TLS)
  secure: false, // true cho port 465, false cho port 587
  auth: {
    user: process.env.SMTP_USER,  // Email gửi
    pass: process.env.SMTP_PASS    // App Password (không phải email password)
  }
});

// Verify kết nối SMTP khi server khởi động
// Nếu credentials sai, sẽ hiển thị lỗi trong console
transporter.verify((error, success) => {
  if (error) {
    console.log('⚠️ SMTP connection failed:', error.message);
  } else {
    console.log('✅ SMTP server ready');
  }
});

/**
 * Gửi email
 * 
 * @param options - { to, subject, html }
 * @returns true nếu gửi thành công, false nếu thất bại
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Sassy App" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    });
    return true;
  } catch (error: any) {
    console.error('Email send failed:', error.message);
    return false;
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================
// Các function trả về HTML template cho email
// Mỗi template đều responsive và đẹp trên mobile

/**
 * Template email chào mừng (hiện tại chưa dùng)
 */
export function welcomeEmailTemplate(name: string, verifyUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Chào mừng ${name || 'bạn'}!</h1>
      <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
      <p>Vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Xác thực Email
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Sassy App.
      </p>
    </div>
  `;
}

/**
 * Template mã xác thực email (6 số)
 * @param name - Tên user để personalize email
 * @param code - Mã 6 số
 */
export function verifyEmailTemplate(name: string, code: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Xác thực Email</h1>
      <p>Xin chào ${name || 'bạn'},</p>
      <p>Mã xác thực của bạn là:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background-color: #f5f5f5; padding: 20px; font-size: 32px; letter-spacing: 8px; font-family: monospace; border-radius: 8px;">
          ${code}
        </div>
      </div>
      <p style="color: #666; font-size: 14px;">
        Mã này sẽ hết hạn sau 1 giờ.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Sassy App.
      </p>
    </div>
  `;
}

/**
 * Template đặt lại mật khẩu
 * @param name - Tên user
 * @param resetUrl - Link đặt lại mật khẩu
 */
export function resetPasswordTemplate(name: string, resetUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Đặt lại mật khẩu</h1>
      <p>Xin chào ${name || 'bạn'},</p>
      <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Đặt lại mật khẩu
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Link này sẽ hết hạn sau 1 giờ.
      </p>
      <p style="color: #666; font-size: 14px;">
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Sassy App.
      </p>
    </div>
  `;
}

/**
 * Template thông báo mật khẩu đã thay đổi
 */
export function passwordChangedTemplate(name: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Mật khẩu đã được thay đổi</h1>
      <p>Xin chào ${name || 'bạn'},</p>
      <p>Mật khẩu của bạn đã được thay đổi thành công.</p>
      <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Sassy App.
      </p>
    </div>
  `;
}

/**
 * Template mã dự phòng 2FA
 * @param codes - Array các mã dự phòng
 */
export function backupCodesTemplate(name: string, codes: string[]) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Mã dự phòng 2FA</h1>
      <p>Xin chào ${name || 'bạn'},</p>
      <p>Đây là các mã dự phòng cho xác thực hai yếu tố (2FA). Mỗi mã chỉ có thể sử dụng một lần.</p>
      <div style="background-color: #f5f5f5; padding: 20px; font-size: 20px; letter-spacing: 4px; font-family: monospace; border-radius: 8px; margin: 20px 0;">
        ${codes.join('<br>')}
      </div>
      <p style="color: #ff5722; font-weight: bold;">
        ⚠️ Lưu giữ các mã này ở nơi an toàn!
      </p>
      <p style="color: #666; font-size: 14px;">
        Nếu bạn mất quyền truy cập vào ứng dụng xác thực, bạn có thể sử dụng một trong các mã trên để đăng nhập.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">
        Email này được gửi tự động từ Sassy App.
      </p>
    </div>
  `;
}

// Export default object cho tiện import
export default {
  sendEmail,
  welcomeEmailTemplate,
  verifyEmailTemplate,
  resetPasswordTemplate,
  passwordChangedTemplate,
  backupCodesTemplate
};
