/**
 * ============================================
 * LOGIN PAGE - TRANG ĐĂNG NHẬP
 * ============================================
 * 
 * Trang này cho phép user đăng nhập bằng:
 * - Email và password
 * - Google OAuth
 * - GitHub OAuth
 * 
 * Nếu user bật 2FA, sẽ hiển thị form nhập mã 2FA
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, googleOAuth, githubOAuth } from '../../lib/api';

/**
 * LoginPage Component
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state (nếu user bật 2FA)
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  /**
   * Xử lý submit form đăng nhập
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Nếu đang ở bước 2FA
      if (requires2FA) {
        await handle2FAVerify();
        return;
      }

      // Gọi API login
      const response = await login(email, password);

      // Nếu cần 2FA, hiển thị form 2FA
      if (response.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      // Đăng nhập thành công, redirect về dashboard
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý verify 2FA
   */
  const handle2FAVerify = async () => {
    setError('');
    setLoading(true);

    try {
      // Gọi API verify 2FA
      await authAPI.verify2FA(
        email,
        password,
        useBackupCode ? undefined : twoFactorCode,
        useBackupCode ? backupCode : undefined
      );

      // 2FA thành công, lấy user info và redirect
      const response = await authAPI.me();
      
      // Lưu tokens (từ bước login trước đó)
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (accessToken && refreshToken) {
        navigate('/dashboard');
      }

    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Xử lý đăng nhập Google OAuth
   */
  const handleGoogleLogin = () => {
    googleOAuth();
  };

  /**
   * Xử lý đăng nhập GitHub OAuth
   */
  const handleGithubLogin = () => {
    githubOAuth();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-2">Đăng nhập</h1>
        <p className="text-gray-600 text-center mb-6">
          Chào mừng bạn quay trở lại!
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              required
            />
          </div>

          {/* 2FA Section - Hiển thị khi cần xác thực 2FA */}
          {requires2FA && (
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Vui lòng nhập mã từ ứng dụng xác thực:
              </p>
              
              {/* Toggle between TOTP and Backup Code */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useBackupCode}
                    onChange={() => setUseBackupCode(false)}
                    className="mr-2"
                  />
                  Mã từ app
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useBackupCode}
                    onChange={() => setUseBackupCode(true)}
                    className="mr-2"
                  />
                  Mã dự phòng
                </label>
              </div>

              {useBackupCode ? (
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mã dự phòng (VD: A1B2C3D4E5)"
                />
              ) : (
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mã 6 số"
                  maxLength={6}
                />
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : requires2FA ? 'Xác thực' : 'Đăng nhập'}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-4 text-center">
          <Link to="/auth/forgot-password" className="text-blue-600 hover:underline text-sm">
            Quên mật khẩu?
          </Link>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Hoặc đăng nhập với</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-2 px-4 rounded-md hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </button>

          {/* GitHub */}
          <button
            onClick={handleGithubLogin}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-900"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
                clipRule="evenodd"
              />
            </svg>
            Đăng nhập với GitHub
          </button>
        </div>

        {/* Register Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/auth/register" className="text-blue-600 hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
