/**
 * ============================================
 * INVITE ACCEPT PAGE - TRANG CHẤP NHẬN LỜI MỜI
 * ============================================
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { teamAPI } from '../../lib/api';

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{ team?: { name: string }; role?: string } | null>(null);

  useEffect(() => {
    if (token) {
      // Just validate the token, don't auto-accept
      setLoading(false);
    } else {
      setError('Token không hợp lệ');
      setLoading(false);
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    setError('');

    try {
      const result = await teamAPI.acceptInvite(token);
      setSuccess(true);
      setTeamInfo(result.team);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/teams/${result.team.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể chấp nhận lời mời');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang xử lý...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tham gia thành công!</h1>
          <p className="text-gray-600 mb-4">
            Bạn đã tham gia team <strong>{teamInfo?.team?.name}</strong>
          </p>
          <p className="text-sm text-gray-500">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lời mời tham gia Team</h1>
        
        {error ? (
          <div>
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
            <Link
              to="/dashboard"
              className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Quay lại Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">
              Bạn được mời tham gia một team. Nhấn nút bên dưới để chấp nhận lời mời.
            </p>

            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-3"
            >
              {accepting ? 'Đang xử lý...' : 'Chấp nhận lời mời'}
            </button>

            <Link
              to="/dashboard"
              className="block w-full text-center text-gray-600 py-2 hover:text-gray-800"
            >
              Từ chối
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
