/**
 * ============================================
 * PROJECTS PAGE - TRANG QUẢN LÝ PROJECTS
 * ============================================
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { projectAPI, teamAPI } from '../../lib/api';
import type { Project, Team } from '../../lib/types';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, teamsData] = await Promise.all([
        projectAPI.list(),
        teamAPI.list(),
      ]);
      setProjects(projectsData.projects);
      
      // Get all accessible teams for project creation
      const allTeams = [...teamsData.ownedTeams, ...teamsData.joinedTeams];
      setTeams(allTeams);
      
      if (allTeams.length > 0) {
        setSelectedTeamId(allTeams[0].id);
      }
    } catch (err: any) {
      console.error('Load projects error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedTeamId) return;

    setCreating(true);
    setError('');

    try {
      const result = await projectAPI.create({
        name: projectName.trim(),
        description: projectDesc.trim() || undefined,
        teamId: selectedTeamId,
      });
      setProjects([result.project, ...projects]);
      setShowCreateModal(false);
      setProjectName('');
      setProjectDesc('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Tạo project thất bại');
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

  return (
    <Layout>
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            {projects.length === 0 ? 'Chưa có project nào' : `${projects.length} project${projects.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={teams.length === 0}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tạo Project
        </button>
      </div>

      {/* No Teams Notice */}
      {teams.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            Bạn cần tạo hoặc tham gia một team trước khi tạo project.{' '}
            <Link to="/teams" className="font-medium underline">Tạo team ngay</Link>
          </p>
        </div>
      )}

      {/* Empty State */}
      {projects.length === 0 && teams.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có project nào</h3>
          <p className="text-gray-500 mb-6">Tạo project đầu tiên trong team của bạn</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Tạo Project Đầu Tiên
          </button>
        </div>
      )}

      {/* Projects Grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Tạo Project Mới</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.memberRole === 'OWNER' ? '(của bạn)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên Project
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Website Redesign"
                  autoFocus
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả ngắn về project..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setProjectName('');
                    setProjectDesc('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating || !projectName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo Project'}
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

function ProjectCard({ project, navigate }: { project: Project; navigate: any }) {
  const canManage = project.userRole === 'OWNER' || project.userRole === 'ADMIN';

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md cursor-pointer transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        {canManage && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            Quản trị
          </span>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
      {project.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="text-xs text-gray-400">
        {project.Team?.name}
      </div>

      <div className="flex items-center text-blue-600 text-sm font-medium mt-3">
        Xem chi tiết
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
