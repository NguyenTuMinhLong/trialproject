/**
 * ============================================
 * REGISTER PAGE - TRANG ĐĂNG KÝ
 * ============================================
 * 
 * Trang này cho phép user tạo tài khoản mới
 * Sau khi đăng ký thành công, tự động đăng nhập
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * RegisterPage Component
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Xử lý submit form đăng ký
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      // Gọi API register (tự động login sau khi đăng ký)
      await register(name, email, password);

      // Đăng ký thành công, redirect về dashboard
      navigate('/dashboard');

    } catch (err: any) {
      // Hiển thị validation errors từ backend nếu có
      const errors = err.response?.data?.errors;
      if (errors && Array.isArray(errors)) {
        setError(errors.join('\n'));
      } else {
        setError(err.response?.data?.message || 'Đăng ký thất bại');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-2">Đăng ký</h1>
        <p className="text-gray-600 text-center mb-6">
          Tạo tài khoản mới để bắt đầu!
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Họ và tên
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nguyen Van A"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ít nhất 8 ký tự"
              required
              minLength={8}
            />
            {/* Password requirements */}
            <div className="mt-1 text-xs text-gray-500 space-y-0.5">
              <p className={password.length >= 8 ? 'text-green-600' : ''}>✓ Ít nhất 8 ký tự</p>
              <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>✓ Ít nhất 1 chữ hoa (A-Z)</p>
              <p className={/[a-z]/.test(password) ? 'text-green-600' : ''}>✓ Ít nhất 1 chữ thường (a-z)</p>
              <p className={/[0-9]/.test(password) ? 'text-green-600' : ''}>✓ Ít nhất 1 số (0-9)</p>
              <p className={/[!@#$%^&*]/.test(password) ? 'text-green-600' : ''}>✓ Ít nhất 1 ký tự đặc biệt (!@#$%^&*)</p>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500">
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <a href="#" className="text-blue-600 hover:underline">Điều khoản sử dụng</a>
            {' '}và{' '}
            <a href="#" className="text-blue-600 hover:underline">Chính sách bảo mật</a>
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>

        {/* Login Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Đã có tài khoản?{' '}
          <Link to="/auth/login" className="text-blue-600 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
