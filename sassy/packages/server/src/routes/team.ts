/**
 * ============================================
 * TEAM ROUTES - QUẢN LÝ TEAMS
 * ============================================
 * 
 * Endpoints:
 * - POST /teams - Tạo team mới
 * - GET /teams - List teams của user
 * - GET /teams/:id - Get team details
 * - PUT /teams/:id - Update team
 * - DELETE /teams/:id - Delete team
 * - POST /teams/:id/invite - Mời thành viên
 * - POST /teams/:id/accept - Chấp nhận invitation
 * - GET /teams/invitations - List pending invitations
 * - DELETE /teams/:id/members/:userId - Xóa thành viên
 * - PUT /teams/:id/members/:userId - Thay đổi role
 */

import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';

const router = Router();

// Team roles
const TEAM_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
};

// Permission check helper
async function getUserTeamRole(userId: string, teamId: string): Promise<string | null> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, ownerId: userId },
  });
  if (team) return TEAM_ROLES.OWNER;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return membership?.role || null;
}

async function canManageTeam(role: string | null): Promise<boolean> {
  return role === TEAM_ROLES.OWNER || role === TEAM_ROLES.ADMIN;
}

async function canManageMembers(role: string | null): Promise<boolean> {
  return role === TEAM_ROLES.OWNER;
}

/**
 * POST /teams
 * Tạo team mới
 */
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tên team phải có ít nhất 2 ký tự' });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        ownerId: userId,
      },
    });

    // Auto-add owner as ADMIN member
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        role: TEAM_ROLES.ADMIN,
      },
    });

    res.status(201).json({
      message: 'Tạo team thành công',
      team,
    });
  } catch (error: any) {
    console.error('Lỗi tạo team:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * GET /teams
 * List teams của user (owned + joined)
 */
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get teams owned by user
    const ownedTeams = await prisma.team.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: { TeamMember: true, Project: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get teams user is member of
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        Team: {
          include: {
            _count: {
              select: { TeamMember: true, Project: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const joinedTeams = memberships.map((m) => ({
      ...m.Team,
      memberRole: m.role,
    }));

    // Filter out duplicates (owned teams shouldn't appear in joined)
    const joinedTeamIds = new Set(joinedTeams.map((t) => t.id));
    const uniqueJoinedTeams = joinedTeams.filter((t) => !joinedTeamIds.has(t.ownerId));

    res.json({
      ownedTeams: ownedTeams.map((t) => ({ ...t, memberRole: TEAM_ROLES.OWNER })),
      joinedTeams: uniqueJoinedTeams,
    });
  } catch (error: any) {
    console.error('Lỗi lấy teams:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * GET /teams/invitations
 * List pending invitations của user
 */
router.get('/invitations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user!.email;
    const userId = req.user!.id;

    // Get pending invitations for user's email that haven't expired
    const invitations = await prisma.invitation.findMany({
      where: {
        email: userEmail,
        expiresAt: { gt: new Date() },
      },
      include: {
        Team: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also check if user is already a member
    const teamIds = invitations.map((i) => i.teamId);
    const memberships = await prisma.teamMember.findMany({
      where: { userId, teamId: { in: teamIds } },
      select: { teamId: true },
    });
    const memberTeamIds = new Set(memberships.map((m) => m.teamId));

    // Also get owned teams
    const ownedTeamIds = new Set(
      (
        await prisma.team.findMany({
          where: { ownerId: userId },
          select: { id: true },
        })
      ).map((t) => t.id)
    );

    const validInvitations = invitations
      .filter((i) => !memberTeamIds.has(i.teamId) && !ownedTeamIds.has(i.teamId))
      .map((i) => ({
        id: i.id,
        token: i.token,
        role: i.role,
        expiresAt: i.expiresAt,
        team: i.Team,
      }));

    res.json({ invitations: validInvitations });
  } catch (error: any) {
    console.error('Lỗi lấy invitations:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * GET /teams/:id
 * Get team details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;

    const role = await getUserTeamRole(userId, teamId);
    if (!role) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập team này' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        User: {
          select: { id: true, name: true, email: true, image: true },
        },
        TeamMember: {
          include: {
            User: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        Project: {
          select: { id: true, name: true, description: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { TeamMember: true, Project: true },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    res.json({ team, userRole: role });
  } catch (error: any) {
    console.error('Lỗi lấy team:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * PUT /teams/:id
 * Update team (name)
 */
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;
    const { name } = req.body;

    const role = await getUserTeamRole(userId, teamId);
    if (!canManageTeam(role)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật team này' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ message: 'Tên team phải có ít nhất 2 ký tự' });
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { name: name.trim() },
    });

    res.json({ message: 'Cập nhật team thành công', team });
  } catch (error: any) {
    console.error('Lỗi cập nhật team:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * DELETE /teams/:id
 * Delete team (chỉ owner mới được xóa)
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    if (team.ownerId !== userId) {
      return res.status(403).json({ message: 'Chỉ chủ team mới được xóa team' });
    }

    // Delete team (cascades to members, projects, invitations)
    await prisma.team.delete({ where: { id: teamId } });

    res.json({ message: 'Xóa team thành công' });
  } catch (error: any) {
    console.error('Lỗi xóa team:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /teams/:id/invite
 * Mời thành viên qua email
 */
router.post('/:id/invite', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;
    const { email, role = 'MEMBER' } = req.body;

    const role2 = await getUserTeamRole(userId, teamId);
    if (!canManageTeam(role2)) {
      return res.status(403).json({ message: 'Bạn không có quyền mời thành viên' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    // Check if user already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (existingMember || team.ownerId === existingUser.id) {
        return res.status(400).json({ message: 'Người dùng đã là thành viên của team' });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.invitation.findFirst({
      where: { email, teamId, expiresAt: { gt: new Date() } },
    });
    if (existingInvite) {
      return res.status(400).json({ message: 'Đã có lời mời đang chờ cho email này' });
    }

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        teamId,
        role,
        expiresAt,
      },
    });

    // Send email
    const inviteLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/teams/invite?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: `Lời mời tham gia team ${team.name}`,
        html: `
          <h2>Bạn được mời tham gia team ${team.name}</h2>
          <p>Nhấn vào link để chấp nhận lời mời:</p>
          <a href="${inviteLink}">${inviteLink}</a>
          <p>Link sẽ hết hạn sau 7 ngày.</p>
        `,
      });
    } catch (emailError) {
      console.log('Không gửi được email (có thể SMTP chưa config):', emailError);
    }

    res.status(201).json({
      message: 'Đã gửi lời mời',
      invitation: { id: invitation.id, email, role, expiresAt },
      inviteLink: process.env.NODE_ENV === 'development' ? inviteLink : undefined, // Dev mode: show link
    });
  } catch (error: any) {
    console.error('Lỗi mời thành viên:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * POST /teams/:id/accept
 * Chấp nhận invitation bằng token
 */
router.post('/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Thiếu token' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { Team: true },
    });

    if (!invitation) {
      return res.status(404).json({ message: 'Lời mời không tồn tại' });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Lời mời đã hết hạn' });
    }

    // Get current user email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ 
        message: 'Lời mời này dành cho email khác. Vui lòng đăng nhập bằng email đã nhận lời mời.' 
      });
    }

    // Check if already owner
    if (invitation.Team.ownerId === userId) {
      return res.status(400).json({ message: 'Bạn là chủ team này' });
    }

    // Check if already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitation.teamId, userId } },
    });
    if (existingMember) {
      return res.status(400).json({ message: 'Bạn đã là thành viên của team' });
    }

    // Add user as member
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
      },
    });

    // Delete invitation
    await prisma.invitation.delete({ where: { id: invitation.id } });

    res.json({
      message: 'Tham gia team thành công',
      team: {
        id: invitation.Team.id,
        name: invitation.Team.name,
        role: invitation.role,
      },
    });
  } catch (error: any) {
    console.error('Lỗi chấp nhận invitation:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * DELETE /teams/:id/members/:userId
 * Xóa thành viên khỏi team
 */
router.delete('/:id/members/:memberId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;
    const memberId = req.params.memberId;

    const role = await getUserTeamRole(userId, teamId);
    if (!canManageMembers(role)) {
      return res.status(403).json({ message: 'Chỉ chủ team mới được xóa thành viên' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    // Can't remove owner
    if (memberId === team.ownerId) {
      return res.status(400).json({ message: 'Không thể xóa chủ team' });
    }

    await prisma.teamMember.deleteMany({
      where: { teamId, userId: memberId },
    });

    res.json({ message: 'Đã xóa thành viên' });
  } catch (error: any) {
    console.error('Lỗi xóa thành viên:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

/**
 * PUT /teams/:id/members/:userId
 * Thay đổi role của thành viên
 */
router.put('/:id/members/:memberId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const teamId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body;

    const currentRole = await getUserTeamRole(userId, teamId);
    if (!canManageMembers(currentRole)) {
      return res.status(403).json({ message: 'Chỉ chủ team mới được thay đổi role' });
    }

    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      return res.status(400).json({ message: 'Role không hợp lệ' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: 'Team không tồn tại' });
    }

    // Can't change owner
    if (memberId === team.ownerId) {
      return res.status(400).json({ message: 'Không thể thay đổi role của chủ team' });
    }

    const updated = await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: memberId } },
      data: { role },
    });

    res.json({ message: 'Đã cập nhật role', member: updated });
  } catch (error: any) {
    console.error('Lỗi cập nhật role:', error.message);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;
