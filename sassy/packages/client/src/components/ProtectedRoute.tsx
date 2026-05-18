/**
 * ============================================
 * PROTECTED ROUTE - BẢO VỆ ROUTES CẦN ĐĂNG NHẬP
 * ============================================
 * 
 * Component này bọc các routes cần đăng nhập mới được truy cập
 * Nếu chưa đăng nhập, redirect về trang login
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Props cho ProtectedRoute
 */
interface ProtectedRouteProps {
  children: React.ReactNode;  // Component con cần bảo vệ
}

/**
 * ProtectedRoute Component
 * 
 * Kiểm tra authentication trước khi cho phép truy cập children
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Đang kiểm tra auth (đang load user data)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập, redirect về login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Đã đăng nhập, hiển thị children
  return <>{children}</>;
}
