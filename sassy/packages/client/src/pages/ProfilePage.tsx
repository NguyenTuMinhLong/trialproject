/**
 * ============================================
 * PROFILE PAGE - TRANG THÔNG TIN CÁ NHÂN
 * ============================================
 * 
 * Trang này cho phép user:
 * - Xem thông tin profile
 * - Cập nhật tên và avatar
 * - Đổi mật khẩu
 * - Bật/tắt 2FA
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';

/**
 * ProfilePage Component
 */
export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [image, setImage] = useState(user?.image || '');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Cập nhật profile
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.updateProfile({ name, image });
      updateUser(response.user);
      setSuccess('Cập nhật thành công!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Đổi mật khẩu
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setSuccess('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect về login sau 2 giây
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Hồ sơ cá nhân</h1>

        {/* Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Thông tin tài khoản</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:underline"
              >
                Chỉnh sửa
              </button>
            )}
          </div>

          {isEditing ? (
            // Edit Form
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Avatar Preview */}
              {image && (
                <div className="flex justify-center">
                  <img
                    src={image}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Avatar
                </label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(user?.name || '');
                    setImage(user?.image || '');
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            // View Mode
            <div className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name || 'User'}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">{user?.name || 'Chưa có tên'}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
              </div>

              {/* Info */}
              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Vai trò</span>
                  <span className="font-medium">{user?.role || 'USER'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email đã xác thực</span>
                  <span className={user?.emailVerified ? 'text-green-600' : 'text-yellow-600'}>
                    {user?.emailVerified ? '✓ Đã xác thực' : '⚠ Chưa xác thực'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">2FA</span>
                  <span className={user?.twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}>
                    {user?.twoFactorEnabled ? '✓ Đã bật' : 'Chưa bật'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ngày tạo</span>
                  <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-xl font-semibold">Đổi mật khẩu</h2>
            <span className="text-gray-500">{showPasswordForm ? '▲' : '▼'}</span>
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </button>
            </form>
          )}
        </div>

        {/* 2FA Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Xác thực hai yếu tố (2FA)</h2>
          <p className="text-gray-600 mb-4">
            Bật 2FA để tăng cường bảo mật tài khoản. Bạn sẽ cần nhập mã từ ứng dụng Google Authenticator hoặc Authy mỗi khi đăng nhập.
          </p>
          <a
            href="/auth/2fa"
            className={`inline-block px-4 py-2 rounded-md ${
              user?.twoFactorEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {user?.twoFactorEnabled ? 'Quản lý 2FA' : 'Bật 2FA'}
          </a>
        </div>
      </div>
    </div>
  );
}
