/**
 * ============================================
 * APP COMPONENT - ROUTING CHÍNH
 * ============================================
 * 
 * Cấu hình routes cho ứng dụng:
 * - /auth/login - Trang đăng nhập
 * - /auth/register - Trang đăng ký
 * - /auth/forgot-password - Quên mật khẩu
 * - /auth/reset-password - Đặt lại mật khẩu
 * - /auth/2fa - Cài đặt 2FA
 * - /dashboard - Trang chủ (cần đăng nhập)
 * - /profile - Hồ sơ (cần đăng nhập)
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { authAPI } from './lib/api';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import TwoFAPage from './pages/auth/TwoFAPage';

// Main Pages
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';

/**
 * App Component
 * 
 * Bọc toàn bộ app trong AuthProvider để cung cấp auth state
 * Thiết lập routing với React Router
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* === PUBLIC ROUTES === */}
          
          {/* Trang đăng nhập */}
          <Route path="/auth/login" element={<LoginPage />} />
          
          {/* Trang đăng ký */}
          <Route path="/auth/register" element={<RegisterPage />} />
          
          {/* Trang quên mật khẩu */}
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Trang đặt lại mật khẩu (có token từ email) */}
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          
          {/* Trang setup 2FA */}
          <Route path="/auth/2fa" element={<TwoFAPage />} />

          {/* OAuth Success - xử lý tokens từ OAuth redirect */}
          <Route path="/auth/success" element={<OAuthSuccessPage />} />

          {/* OAuth Error */}
          <Route path="/auth/error" element={<OAuthErrorPage />} />

          {/* Trang chủ - redirect về dashboard nếu đã login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Fallback - redirect về dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

          {/* === PROTECTED ROUTES === */}
          {/* Cần đăng nhập mới truy cập được */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// ============================================
// ADDITIONAL PAGES
// ============================================

/**
 * ForgotPasswordPage - Trang quên mật khẩu
 * 
 * User nhập email → Server gửi email với link reset
 */
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gửi thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Đã gửi email thành công
  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-4">Kiểm tra email!</h1>
          <p className="text-gray-600 mb-6">
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến email {email}.
          </p>
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Quay lại đăng nhập
          </a>
        </div>
      </div>
    );
  }

  // Form nhập email
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Quên mật khẩu?</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang gửi...' : 'Gửi email đặt lại'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Quay lại đăng nhập
          </a>
        </p>
      </div>
    </div>
  );
}

/**
 * ResetPasswordPage - Trang đặt lại mật khẩu
 * 
 * User click link trong email → Nhập mật khẩu mới
 */
function ResetPasswordPage() {
  // Lấy token từ URL query params
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải ít nhất 8 ký tự');
      return;
    }

    if (!token) {
      setError('Token không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  // Token không hợp lệ
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Token không hợp lệ</h1>
          <p className="text-gray-600 mb-6">
            Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
          </p>
          <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
            Yêu cầu link mới
          </a>
        </div>
      </div>
    );
  }

  // Đặt lại thành công
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4">Thành công!</h1>
          <p className="text-gray-600 mb-6">
            Mật khẩu của bạn đã được đặt lại thành công.
          </p>
          <a href="/auth/login" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Đăng nhập ngay
          </a>
        </div>
      </div>
    );
  }

  // Form nhập mật khẩu mới
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Đặt lại mật khẩu</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Ít nhất 8 ký tự"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Nhập lại mật khẩu"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * OAuthSuccessPage - Xử lý khi OAuth thành công
 * 
 * OAuth provider redirect về đây với tokens trong URL
 * Lưu tokens vào localStorage, redirect về dashboard
 */
function OAuthSuccessPage() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');

  // Lưu tokens và redirect
  if (accessToken && refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    window.location.href = '/dashboard';
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Đang đăng nhập...</p>
      </div>
    </div>
  );
}

/**
 * OAuthErrorPage - Xử lý khi OAuth thất bại
 */
function OAuthErrorPage() {
  const params = new URLSearchParams(window.location.search);
  const message = params.get('message');

  // Mapping error messages
  const errorMessages: Record<string, string> = {
    google_denied: 'Bạn đã hủy đăng nhập Google',
    github_denied: 'Bạn đã hủy đăng nhập GitHub',
    missing_code: 'Không nhận được mã xác thực',
    token_exchange_failed: 'Không thể lấy token từ OAuth provider',
    user_info_failed: 'Không thể lấy thông tin user',
    email_required: 'GitHub yêu cầu email công khai để đăng nhập',
    server_error: 'Đã xảy ra lỗi server',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold mb-4">Đăng nhập thất bại</h1>
        <p className="text-gray-600 mb-6">
          {errorMessages[message || ''] || 'Đã xảy ra lỗi không xác định'}
        </p>
        <a
          href="/auth/login"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Thử lại
        </a>
      </div>
    </div>
  );
}
