/**
 * ============================================
 * PROJECT ROUTES - QUẢN LÝ PROJECTS
 * ============================================
 * 
 * Endpoints:
 * - POST /projects - Tạo project mới
 * - GET /projects - List projects của user
 * - GET /projects/:id - Get project details
 * - PUT /projects/:id - Update project
 * - DELETE /projects/:id - Delete project
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Project roles (sử dụng chung với team)
const PROJECT_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
};

/**
 * Check if user has access to team
 */
async function getUserTeamRole(userId: string, teamId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, ownerId: userId },
  });
  if (team) return PROJECT_ROLES.OWNER;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return membership?.role || null;
}

async function canManageProject(role: string | null): Promise<boolean> {
  return role !== null;
}

/**
 * POST /projects
 * Tạo project mới trong team
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, teamId } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ message: 'Tên project không được để trống' });
    }

    if (!teamId) {
      return res.status(400).json({ message: 'Phải chọn team' });
    }

    // Check user has access to team
    const role = await getUserTeamRole(userId, teamId);
    if (!canManageProject(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo project trong team này' });
    }

    // Check team exists
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        teamId,
      },
      include: {
        Team: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      message: 'Tạo project thành công',
      project,
    });
  } catch (error: any) {
    console.error('Lỗi tạo project:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * GET /projects
 * List all projects user can access
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get teams user owns
    const ownedTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const ownedTeamIds = ownedTeams.map((t) => t.id);

    // Get teams user is member of
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const memberTeamIds = memberships.map((m) => m.teamId);

    // Combine all accessible team IDs
    const allTeamIds = [...new Set([...ownedTeamIds, ...memberTeamIds])];

    // Get projects from all accessible teams
    const projects = await prisma.project.findMany({
      where: { teamId: { in: allTeamIds } },
      include: {
        Team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add user's role in each team
    const projectsWithRole = await Promise.all(
      projects.map(async (project) => {
        const role = await getUserTeamRole(userId, project.teamId);
        return { ...project, userRole: role };
      })
    );

    res.json({ projects: projectsWithRole });
  } catch (error: any) {
    console.error('Lỗi lấy projects:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * GET /projects/:id
 * Get project details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Team: {
          select: { id: true, name: true, ownerId: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project không tồn tại' });
    }

    // Check user has access to team
    const role = await getUserTeamRole(userId, project.teamId);
    if (!canManageProject(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập project này' });
    }

    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: project.teamId },
      include: {
        User: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    const owner = await prisma.user.findUnique({
      where: { id: project.Team.ownerId },
      select: { id: true, name: true, email: true, image: true },
    });

    res.json({
      project,
      team: {
        ...project.Team,
        owner,
        members: teamMembers.map((m) => ({ ...m.User, role: m.role })),
      },
      userRole: role,
    });
  } catch (error: any) {
    console.error('Lỗi lấy project:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * PUT /projects/:id
 * Update project
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { name, description } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Team: true },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project không tồn tại' });
    }

    // Check user has access to team
    const role = await getUserTeamRole(userId, project.teamId);
    if (!canManageProject(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật project này' });
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    });

    res.json({ message: 'Cập nhật project thành công', project: updated });
  } catch (error: any) {
    console.error('Lỗi cập nhật project:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * DELETE /projects/:id
 * Delete project
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Team: true },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project không tồn tại' });
    }

    // Only owner or admin can delete
    const role = await getUserTeamRole(userId, project.teamId);
    if (role !== PROJECT_ROLES.OWNER && role !== PROJECT_ROLES.ADMIN) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa project này' });
    }

    await prisma.project.delete({ where: { id: projectId } });

    res.json({ message: 'Xóa project thành công' });
  } catch (error: any) {
    console.error('Lỗi xóa project:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;
