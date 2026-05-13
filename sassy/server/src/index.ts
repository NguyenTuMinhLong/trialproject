import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { sql } from './config/db';
import { register, login } from './controllers/auth.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.json({ message: '🚀 Server Saasy đang chạy!' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await sql`SELECT NOW() as time`;
    res.json({ message: '✅ DB OK', time: result[0].time });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auth routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});