/**
 * ============================================
 * PROJECT DETAIL PAGE - CHI TIẾT PROJECT
 * ============================================
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { projectAPI } from '../../lib/api';
import type { Project } from '../../lib/types';

interface ProjectDetail extends Project {
  team: any;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadProjectDetail();
  }, [id]);

  const loadProjectDetail = async () => {
    try {
      const data = await projectAPI.get(id!);
      setProject(data.project);
      setUserRole(data.userRole);
      setProjectName(data.project.name);
      setProjectDesc(data.project.description || '');
    } catch (err: any) {
      console.error('Load project error:', err);
      if (err.response?.status === 403) {
        setError('Bạn không có quyền truy cập project này');
      } else if (err.response?.status === 404) {
        setError('Project không tồn tại');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await projectAPI.update(id!, { name: projectName, description: projectDesc });
      setShowEditModal(false);
      loadProjectDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Bạn có chắc muốn xóa project này?')) return;
    setSubmitting(true);
    try {
      await projectAPI.delete(id!);
      navigate('/projects');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Project không tồn tại'}</p>
          <Link to="/projects" className="text-blue-600 hover:underline">Quay lại Projects</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/projects" className="hover:text-blue-600">Projects</Link>
          <span>/</span>
          <span className="text-gray-900">{project.name}</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500">
                Team: {project.team?.name}
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Chỉnh sửa
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Thông tin Project</h2>
        
        {project.description ? (
          <p className="text-gray-700">{project.description}</p>
        ) : (
          <p className="text-gray-400 italic">Chưa có mô tả</p>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Team</p>
              <p className="font-medium">{project.team?.name}</p>
            </div>
            <div>
              <p className="text-gray-500">Ngày tạo</p>
              <p className="font-medium">
                {new Date(project.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Thành viên Team</h2>
        
        <div className="space-y-3">
          {project.team?.owner && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                <span className="text-purple-700 font-medium">
                  {project.team.owner.name?.charAt(0).toUpperCase() || 'O'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{project.team.owner.name || 'Chủ team'}</p>
                <p className="text-sm text-gray-500">{project.team.owner.email}</p>
              </div>
              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                Chủ sở hữu
              </span>
            </div>
          )}

          {project.team?.members?.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {member.name?.charAt(0).toUpperCase() || 'M'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{member.name || 'Thành viên'}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                {member.role === 'ADMIN' ? 'Admin' : 'Member'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Chỉnh sửa Project</h2>

            <form onSubmit={handleUpdateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên Project</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Xóa Project</h2>
            <p className="text-gray-600 mb-6">
              Bạn có chắc muốn xóa project "{project.name}"? Hành động này không thể hoàn tác.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
