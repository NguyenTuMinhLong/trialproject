/**
 * ============================================
 * PRISMA CLIENT - DATABASE CONNECTION
 * ============================================
 * 
 * File này khởi tạo và export Prisma Client
 * Prisma Client là ORM dùng để tương tác với PostgreSQL database
 * 
 * Cách hoạt động:
 * 1. Đọc DATABASE_URL từ .env
 * 2. Tạo Prisma Adapter cho PostgreSQL (dùng PrismaPg)
 * 3. Khởi tạo PrismaClient với adapter
 * 4. Lưu vào global để tránh tạo nhiều instances (hot reload issue)
 */

// Load biến môi trường từ .env
import "dotenv/config";

// Import Prisma Client và PostgreSQL adapter
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Lấy connection string từ .env
const connectionString = process.env.DATABASE_URL;

// Kiểm tra DATABASE_URL có tồn tại không
if (!connectionString) {
  throw new Error('DATABASE_URL không tìm thấy trong .env');
}

// Tạo Prisma Adapter cho PostgreSQL
// PrismaPg giúp Prisma làm việc với PostgreSQL driver
const adapter = new PrismaPg({
  connectionString,
});

// Type cho global object (để lưu trữ Prisma instance)
// Tránh tạo nhiều instances khi hot reload trong development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Tạo và export Prisma Client instance
 * 
 * - Nếu đã có instance trong global (development), reuse nó
 * - Nếu chưa có, tạo instance mới
 * 
 * log: Hiển thị queries trong development để debug
 *       Chỉ hiển thị errors trong production
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter,
  // Query logging: chỉ show queries + errors trong dev, chỉ errors trong prod
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

// Lưu instance vào global trong development
// Để tránh tạo multiple connections khi hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export default để import thuận tiện hơn
export default prisma;