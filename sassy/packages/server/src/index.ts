import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory users
let users: any[] = [];

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

console.log('🚀 Server khởi động...');

// AUTH ROUTES (KHÔNG có /api vì proxy đã rewrite)
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { 
      id: Date.now().toString(), 
      name, 
      email, 
      password: hashedPassword 
    };
    users.push(newUser);

    console.log(`✅ User registered: ${email}`);
    res.status(201).json({ 
      message: 'Đăng ký thành công', 
      user: { id: newUser.id, name, email } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'secretkey-super-long-123456789',
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${email}`);
    res.json({ 
      message: 'Đăng nhập thành công', 
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

app.get('/', (req, res) => res.json({ message: '🚀 Server SaaS đang chạy ngon lành!' }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
  console.log('✅ Auth routes sẵn sàng: /auth/register và /auth/login');
});