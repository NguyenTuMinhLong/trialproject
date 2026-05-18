/**
 * ============================================
 * 2FA SETUP PAGE - TRANG CÀI ĐẶT 2FA
 * ============================================
 * 
 * Trang này cho phép user:
 * - Setup 2FA: Quét QR code bằng authenticator app
 * - Enable 2FA: Nhập mã để xác nhận và bật 2FA
 * - Disable 2FA: Tắt 2FA (cần verify password và mã 2FA)
 * 
 * Cách hoạt động:
 * 1. User click "Bật 2FA" → Setup → Quét QR → Nhập mã → Enable
 * 2. User click "Tắt 2FA" → Nhập password + mã 2FA → Disable
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { twoFactorAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

/**
 * TwoFAPage Component
 */
export default function TwoFAPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Setup state
  const [setupData, setSetupData] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);

  // Enable state
  const [code, setCode] = useState('');

  // Disable state
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [password, setPassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  // Backup codes (chỉ hiển thị khi enable thành công)
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Load setup data khi mount
  useEffect(() => {
    if (!user?.twoFactorEnabled) {
      handleSetup();
    }
  }, []);

  /**
   * Setup 2FA - lấy QR code
   */
  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await twoFactorAPI.setup();
      setSetupData({ qrCode: data.qrCode, secret: data.secret });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải QR code');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enable 2FA - verify mã và bật
   */
  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await twoFactorAPI.enable(code);
      setBackupCodes(response.backupCodes);
      setSuccess('2FA đã được bật thành công!');
      setSetupData(null);
      
      // Reload user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Mã xác thực không đúng');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable 2FA
   */
  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await twoFactorAPI.disable(disableCode, password);
      setSuccess('2FA đã được tắt thành công!');
      setShowDisableForm(false);
      setPassword('');
      setDisableCode('');
      
      // Reload user data
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tắt 2FA thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/profile')}
          className="mb-6 text-blue-600 hover:underline flex items-center gap-2"
        >
          ← Quay lại Profile
        </button>

        <h1 className="text-3xl font-bold mb-8">
          {user?.twoFactorEnabled ? 'Quản lý 2FA' : 'Bật 2FA'}
        </h1>

        {/* Error/Success Messages */}
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

        {/* === BACKUP CODES (CHỈ HIỂN THỊ 1 LẦN) === */}
        {backupCodes.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-yellow-800 mb-4">
              ⚠️ Lưu giữ các mã dự phòng này!
            </h2>
            <p className="text-yellow-700 mb-4">
              Đây là các mã dự phòng để đăng nhập khi bạn mất quyền truy cập vào ứng dụng xác thực. Mỗi mã chỉ sử dụng được một lần.
            </p>
            <div className="bg-white p-4 rounded border border-yellow-300 font-mono text-lg tracking-wider">
              {backupCodes.map((code, i) => (
                <div key={i} className="py-1">
                  <span className="text-gray-500 mr-4">{i + 1}.</span>
                  {code}
                </div>
              ))}
            </div>
            <p className="text-red-600 font-semibold mt-4">
              Lưu lại những mã này ở nơi an toàn! Bạn sẽ không thể xem lại chúng.
            </p>
            <button
              onClick={() => setBackupCodes([])}
              className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Đã lưu, đóng cảnh báo
            </button>
          </div>
        )}

        {/* === NẾU ĐÃ BẬT 2FA === */}
        {user?.twoFactorEnabled && !showDisableForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔐</span>
              <div>
                <h2 className="text-xl font-semibold">2FA đang bật</h2>
                <p className="text-gray-500">Tài khoản của bạn được bảo vệ bằng xác thực hai yếu tố</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-blue-700">
                Khi đăng nhập, bạn cần nhập mã 6 số từ ứng dụng Google Authenticator hoặc Authy.
              </p>
            </div>

            <button
              onClick={() => setShowDisableForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Tắt 2FA
            </button>
          </div>
        )}

        {/* === FORM TẮT 2FA === */}
        {user?.twoFactorEnabled && showDisableForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Tắt 2FA</h2>
            <p className="text-gray-600 mb-4">
              Để tắt 2FA, bạn cần xác minh danh tính bằng mật khẩu và mã 2FA.
            </p>

            <form onSubmit={handleDisable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã 2FA từ ứng dụng
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Mã 6 số"
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Tắt 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDisableForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {/* === SETUP 2FA (CHƯA BẬT) === */}
        {!user?.twoFactorEnabled && setupData && (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">Bước 1: Quét mã QR</h2>
              <p className="text-gray-600 mb-4">
                Sử dụng ứng dụng Google Authenticator hoặc Authy để quét mã bên dưới:
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <img
                    src={setupData.qrCode}
                    alt="QR Code"
                    className="mx-auto mb-4 border rounded"
                  />

                  {/* Manual Secret */}
                  <div className="bg-gray-50 p-4 rounded text-left">
                    <p className="text-sm text-gray-600 mb-2">
                      Nếu không quét được QR code, nhập secret này thủ công:
                    </p>
                    <code className="block bg-gray-200 p-2 rounded text-sm break-all">
                      {setupData.secret}
                    </code>
                  </div>
                </>
              )}
            </div>

            {/* Verify Code */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Bước 2: Xác nhận mã</h2>
              <p className="text-gray-600 mb-4">
                Sau khi quét QR code, nhập mã 6 số từ ứng dụng để xác nhận:
              </p>

              <form onSubmit={handleEnable} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã từ Authenticator
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Đang xác thực...' : 'Bật 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
