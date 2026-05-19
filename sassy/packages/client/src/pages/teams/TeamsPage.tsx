/**
 * ============================================
 * TEAMS PAGE - TRANG QUẢN LÝ TEAMS
 * ============================================
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { teamAPI } from '../../lib/api';
import type { Team } from '../../lib/types';

export default function TeamsPage() {
  const navigate = useNavigate();
  const [ownedTeams, setOwnedTeams] = useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const data = await teamAPI.list();
      setOwnedTeams(data.ownedTeams);
      setJoinedTeams(data.joinedTeams);
    } catch (err: any) {
      console.error('Load teams error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setCreating(true);
    setError('');

    try {
      const result = await teamAPI.create(newTeamName.trim());
      setOwnedTeams([result.team, ...ownedTeams]);
      setShowCreateModal(false);
      setNewTeamName('');
      navigate(`/teams/${result.team.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tạo team thất bại');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const totalTeams = ownedTeams.length + joinedTeams.length;

  return (
    <Layout>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-gray-600 mt-1">
            {totalTeams === 0 ? 'Chưa có team nào' : `${totalTeams} team${totalTeams > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo Team
        </button>
      </div>

      {/* Empty State */}
      {totalTeams === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có team nào</h3>
          <p className="text-gray-500 mb-6">Tạo team đầu tiên để bắt đầu cộng tác với người khác</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Tạo Team Đầu Tiên
          </button>
        </div>
      )}

      {/* Owned Teams */}
      {ownedTeams.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams của bạn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ownedTeams.map((team) => (
              <TeamCard key={team.id} team={team} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Joined Teams */}
      {joinedTeams.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Teams đã tham gia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {joinedTeams.map((team) => (
              <TeamCard key={team.id} team={team} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Tạo Team Mới</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên Team
                </label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Engineering Team"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTeamName('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTeamName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}

function TeamCard({ team, navigate }: { team: Team; navigate: any }) {
  const memberCount = team._count?.TeamMember || 0;
  const projectCount = team._count?.Project || 0;
  const isOwner = team.memberRole === 'OWNER';

  return (
    <div
      onClick={() => navigate(`/teams/${team.id}`)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md cursor-pointer transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">
            {team.name.charAt(0).toUpperCase()}
          </span>
        </div>
        {isOwner && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Chủ sở hữu
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{team.name}</h3>
      <p className="text-sm text-gray-500 mb-4">
        {memberCount} thành viên • {projectCount} dự án
      </p>

      <div className="flex items-center text-blue-600 text-sm font-medium">
        Xem chi tiết
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
