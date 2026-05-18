/**
 * ============================================
 * SASSY APP - SERVER ENTRY POINT
 * ============================================
 * 
 * File này là điểm khởi đầu của server Express.
 * Nó cấu hình:
 * - Middleware (CORS, Helmet, JSON parsing)
 * - Routes (Auth)
 * - Database connection (Prisma)
 * 
 * Server chạy trên port 3000 (hoặc PORT trong .env)
 */

// Import các thư viện cần thiết
import express from 'express';        // Framework web
import cors from 'cors';             // Cross-Origin Resource Sharing
import helmet from 'helmet';         // Bảo mật HTTP headers
import dotenv from 'dotenv';          // Đọc biến môi trường từ .env
import authRoutes from './routes/auth.js'; // Import routes xác thực

// Load biến môi trường từ file .env
dotenv.config();

// Tạo instance Express
const app = express();

// ============================================
// CẤU HÌNH MIDDLEWARE
// ============================================

// Helmet: Thêm các HTTP headers bảo mật
// Giúp bảo vệ app khỏi các tấn công XSS, clickjacking, v.v.
app.use(helmet());

// CORS: Cho phép frontend (localhost:5173) gọi API
// credentials: true cho phép gửi cookies/authorization headers
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Express JSON: Parse JSON body từ request
app.use(express.json());

console.log('🚀 Server khởi động...');

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
// Endpoint để kiểm tra server có đang chạy không
// VD: Load balancer hoặc monitoring tool có thể gọi endpoint này
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// ============================================
// MOUNT ROUTES
// ============================================
// Tất cả routes xác thực được mount tại /auth
// VD: /auth/login, /auth/register, /auth/logout, v.v.
app.use('/auth', authRoutes);

// ============================================
// KHỞI ĐỘNG SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
  console.log(`✅ PostgreSQL: ${process.env.DATABASE_URL}`);
  console.log('✅ Auth routes: /auth/register, /auth/login, /auth/logout, /auth/refresh, /auth/me');
});
