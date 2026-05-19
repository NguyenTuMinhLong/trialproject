/**
 * ============================================
 * TEAM DETAIL PAGE - CHI TIẾT TEAM
 * ============================================
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { teamAPI, projectAPI } from '../../lib/api';
import type { Team, Project } from '../../lib/types';

interface TeamDetail extends Team {
  User: any;
  TeamMember: any[];
  Project: Project[];
}

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [teamName, setTeamName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadTeamDetail();
  }, [id]);

  const loadTeamDetail = async () => {
    try {
      const data = await teamAPI.get(id!);
      setTeam(data.team);
      setUserRole(data.userRole);
      setTeamName(data.team.name);
    } catch (err: any) {
      console.error('Load team error:', err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập team này');
      } else if (err.response?.status === 404) {
        setError('Team không tồn tại');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await teamAPI.invite(id!, inviteEmail, inviteRole);
      setInviteLink(result.inviteLink || null);
      if (result.inviteLink) {
        // Dev mode: show link
      } else {
        setShowInviteModal(false);
        setInviteEmail('');
        alert('Đã gửi lời mời!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi lời mời thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await projectAPI.create({ name: projectName, description: projectDesc, teamId: id! });
      setShowCreateProjectModal(false);
      setProjectName('');
      setProjectDesc('');
      loadTeamDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo project thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await teamAPI.update(id!, teamName);
      setShowEditTeamModal(false);
      loadTeamDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirm('Bạn có chắc muốn xóa team này? Tất cả dữ liệu sẽ bị mất.')) return;
    setSubmitting(true);
    try {
      await teamAPI.delete(id!);
      navigate('/teams');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Xóa ${memberName} khỏi team?`)) return;
    try {
      await teamAPI.removeMember(id!, memberId);
      loadTeamDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      await teamAPI.updateMemberRole(id!, memberId, newRole);
      loadTeamDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';
  const isOwner = userRole === 'OWNER';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !team) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Team không tồn tại'}</p>
          <Link to="/teams" className="text-blue-600 hover:underline">Quay lại Teams</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/teams" className="hover:text-blue-600">Teams</Link>
          <span>/</span>
          <span className="text-gray-900">{team.name}</span>
        </div>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-600 font-bold text-2xl">
                {team.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
              <p className="text-gray-500">
                {team.TeamMember?.length || 0} thành viên • {team.Project?.length || 0} dự án
              </p>
            </div>
          </div>
          
          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditTeamModal(true)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Chỉnh sửa
              </button>
              {isOwner && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Xóa Team
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Dự án</h2>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Thêm dự án
              </button>
            </div>

            {team.Project?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Chưa có dự án nào</p>
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="text-blue-600 hover:underline mt-2"
                >
                  Tạo dự án đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {team.Project?.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                      )}
                    </div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Xem
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Members */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Thành viên</h2>
            {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Mời
              </button>
            )}
          </div>

          <div className="space-y-3">
            {/* Owner */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-medium">
                  {team.User?.name?.charAt(0).toUpperCase() || 'O'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{team.User?.name || 'Chủ team'}</p>
                <p className="text-sm text-gray-500">{team.User?.email}</p>
              </div>
              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                Chủ sở hữu
              </span>
            </div>

            {/* Members */}
            {team.TeamMember?.filter(m => m.User?.id !== team.ownerId).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {member.User?.name?.charAt(0).toUpperCase() || 'M'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{member.User?.name || 'Thành viên'}</p>
                  <p className="text-sm text-gray-500">{member.User?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && member.User?.id && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.User.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.User.id, member.User?.name || 'thành viên')}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Xóa khỏi team"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                  {!canManage && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {member.role === 'ADMIN' ? 'Admin' : 'Member'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mời thành viên</h2>
            
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {inviteLink && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">Dev Mode - Copy link để mời:</p>
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="w-full px-2 py-1 text-sm bg-white border rounded"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteLink(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Tạo Dự án Mới</h2>
            
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên dự án</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Website Redesign"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả (tùy chọn)</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả ngắn về dự án..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProjectModal(false);
                    setProjectName('');
                    setProjectDesc('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa Team</h2>
            
            <form onSubmit={handleUpdateTeam}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Team</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditTeamModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Xóa Team</h2>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa team "{team.name}"? Hành động này không thể hoàn tác và tất cả dự án sẽ bị xóa.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Đang xóa...' : 'Xóa Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
