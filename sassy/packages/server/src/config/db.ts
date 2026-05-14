import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL không tìm thấy trong .env');
}

export const sql = postgres(connectionString, {
  ssl: false,           // vì dùng local
  max: 10,              // tối đa 10 connection
  idle_timeout: 20,
  connect_timeout: 10,
});

console.log('🔌 Đã kết nối PostgreSQL thành công!');