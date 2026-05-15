// packages/server/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey-super-long-123456789';

// ====================== MIDDLEWARE ======================
interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Không có token, vui lòng đăng nhập' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true 
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Token không hợp lệ' });
    }

    req.user   = user;
    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// ====================== ROUTES ======================

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Thiếu thông tin đăng ký' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true }
    });

    const token = jwt.sign(
      { userId: newUser.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Đăng ký thành công',
      user: newUser,
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Thiếu email hoặc mật khẩu' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
      }
    });

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET CURRENT USER
router.get('/me', protect, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;