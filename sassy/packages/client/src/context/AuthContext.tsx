/**
 * ============================================
 * AUTH CONTEXT - QUẢN LÝ TRẠNG THÁI ĐĂNG NHẬP
 * ============================================
 * 
 * File này tạo React Context để quản lý trạng thái authentication
 * Giúp các components truy cập thông tin user và auth functions từ bất kỳ đâu
 * 
 * Cung cấp:
 * - user: Thông tin user hiện tại
 * - loading: Trạng thái loading khi kiểm tra auth
 * - isAuthenticated: Boolean - đã đăng nhập chưa
 * - login, logout, register: Auth functions
 * 
 * Sử dụng:
 * ```tsx
 * // Trong component
 * const { user, logout } = useAuth();
 * 
 * // Trong App.tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../lib/api';
import type { User, LoginResponse } from '../lib/api';

// ============================================
// TYPES
// ============================================

/**
 * Interface cho AuthContext
 */
interface AuthContextType {
  user: User | null;                    // Thông tin user hiện tại
  loading: boolean;                     // Đang kiểm tra auth
  isAuthenticated: boolean;            // Đã đăng nhập chưa
  login: (email: string, password: string) => Promise<LoginResponse>;  // Đăng nhập
  logout: () => Promise<void>;         // Đăng xuất
  register: (name: string, email: string, password: string) => Promise<any>; // Đăng ký
  updateUser: (user: User) => void;    // Cập nhật user state
}

// Tạo Context với default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// AUTH PROVIDER
// ============================================

/**
 * AuthProvider Component
 * 
 * Bọc app để cung cấp auth state cho tất cả components
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Ban đầu là true để kiểm tra auth

  // ===========================================
  // EFFECTS
  // ===========================================

  /**
   * Kiểm tra authentication khi app load
   * 
   * - Kiểm tra xem có tokens trong localStorage không
   * - Nếu có, gọi API /auth/me để lấy thông tin user
   * - Nếu không, set user = null
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Có token, lấy thông tin user
        const response = await authAPI.me();
        setUser(response.user);
        
      } catch (error) {
        // Token không hợp lệ hoặc hết hạn
        console.log('Auth check failed:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // ===========================================
  // AUTH FUNCTIONS
  // ===========================================

  /**
   * Đăng nhập
   */
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    // Gọi API login
    const response = await authAPI.login(email, password);
    
    // Nếu cần 2FA, trả về response (frontend sẽ hiển thị form 2FA)
    if (response.requires2FA) {
      return response;
    }
    
    // Đăng nhập thành công, lưu tokens và set user
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
    
    return response;
  };

  /**
   * Đăng xuất
   */
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      // Vẫn tiếp tục logout ngay cả khi API fail
      console.error('Logout API failed:', error);
    } finally {
      // Xóa tokens dù API có lỗi hay không
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  /**
   * Đăng ký
   */
  const register = async (name: string, email: string, password: string) => {
    // Gọi API register
    const response = await authAPI.register(name, email, password);
    
    // Lưu tokens và set user
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    setUser(response.user);
    
    return response;
  };

  /**
   * Cập nhật user state (sau khi update profile)
   */
  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // ===========================================
  // RENDER
  // ===========================================

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * useAuth Hook
 * 
 * Dùng để truy cập auth context từ bất kỳ component nào
 * 
 * @example
 * ```tsx
 * function ProfileButton() {
 *   const { user, logout } = useAuth();
 *   
 *   return (
 *     <button onClick={logout}>
 *       Đăng xuất ({user?.name})
 *     </button>
 *   );
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
