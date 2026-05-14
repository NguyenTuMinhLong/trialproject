import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await api.post('/auth/login', { email, password });
      
      // Lưu token vào localStorage (y chang saasy)
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      setMessage('Đăng nhập thành công!');
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-3xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Đăng nhập</h2>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500"
            required
          />
          <input 
            type="password" 
            placeholder="Mật khẩu" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500"
            required
          />
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-semibold text-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        {message && <p className={`text-center mt-4 ${message.includes('thành công') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}

        <p className="text-center text-gray-400 mt-6">
          Chưa có tài khoản? <Link to="/register" className="text-blue-500 hover:underline">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}