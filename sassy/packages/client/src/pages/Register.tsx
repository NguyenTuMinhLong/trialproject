import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AxiosError } from 'axios';
import api from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await api.post('/auth/register', { name, email, password });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setMessage(error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-3xl">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">Tạo tài khoản</h2>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <input 
            type="text" 
            placeholder="Họ tên" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500"
            required
          />
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
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        {message && <p className="text-center mt-4 text-green-400">{message}</p>}

        <p className="text-center text-gray-400 mt-6">
          Đã có tài khoản? <Link to="/login" className="text-blue-500 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}