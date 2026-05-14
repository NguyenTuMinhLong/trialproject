import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// In-memory users (sau này thay bằng database)
let users: any[] = [];

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Kiểm tra email tồn tại
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

    res.status(201).json({ 
      message: 'Đăng ký thành công', 
      user: { id: newUser.id, name, email } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu sai' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      'secretkey-super-long-123456789', // sau này dùng env
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Đăng nhập thành công', 
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;