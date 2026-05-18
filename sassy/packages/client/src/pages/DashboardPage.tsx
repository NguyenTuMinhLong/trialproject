/**
 * ============================================
 * DASHBOARD PAGE - TRANG CHỦ SAU ĐĂNG NHẬP
 * ============================================
 */

import { useAuth } from '../context/AuthContext';

/**
 * DashboardPage Component
 */
export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sassy App</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Xin chào, <strong>{user?.name || user?.email}</strong>
            </span>
            <a
              href="/profile"
              className="text-blue-600 hover:underline"
            >
              Hồ sơ
            </a>
            <button
              onClick={logout}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Chào mừng!</h2>
          <p className="text-gray-600 mb-4">
            Bạn đã đăng nhập thành công vào hệ thống.
          </p>
          
          {/* User Info Card */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Thông tin tài khoản:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><strong>Email:</strong> {user?.email}</li>
              <li><strong>Tên:</strong> {user?.name || 'Chưa cập nhật'}</li>
              <li><strong>Vai trò:</strong> {user?.role || 'USER'}</li>
              <li><strong>2FA:</strong> {user?.twoFactorEnabled ? 'Đã bật' : 'Chưa bật'}</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
