/**
 * ============================================
 * RBAC MIDDLEWARE - ROLE-BASED ACCESS CONTROL
 * ============================================
 * 
 * Middleware để kiểm tra quyền truy cập dựa trên role
 * 
 * Roles:
 * - OWNER: Chủ team, có tất cả quyền
 * - ADMIN: Quản trị viên, có quyền quản lý thành viên
 * - MEMBER: Thành viên thường
 */

import { Response } from 'express';
import { AuthRequest, authenticate } from './auth.js';
import { prisma } from '../lib/prisma.js';

// Role hierarchy
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

export type TeamRole = (typeof ROLES)[keyof typeof ROLES];

// Permission mapping
const PERMISSIONS = {
  [ROLES.OWNER]: ['read', 'write', 'delete', 'manage_members', 'manage_team'],
  [ROLES.ADMIN]: ['read', 'write', 'delete', 'manage_members'],
  [ROLES.MEMBER]: ['read', 'write'],
} as const;

export type Permission = 'read' | 'write' | 'delete' | 'manage_members' | 'manage_team';

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get user's role in a team
 */
export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  // Check if owner
  const team = await prisma.team.findFirst({
    where: { id: teamId, ownerId: userId },
  });
  if (team) return ROLES.OWNER;

  // Check membership
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return membership?.role as TeamRole || null;
}

/**
 * Middleware factory to require specific permission
 */
export function requirePermission(permission: Permission) {
  return async (req: AuthRequest, res: Response, next: Function) => {
    try {
      const userId = req.user?.id;
      const teamId = req.params.teamId || req.body.teamId;

      if (!userId) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
      }

      if (!teamId) {
        return res.status(400).json({ message: 'Thiếu team ID' });
      }

      const role = await getUserTeamRole(userId, teamId);

      if (!role) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập team này' });
      }

      if (!hasPermission(role, permission)) {
        return res.status(403).json({ 
          message: `Bạn không có quyền "${permission}" trong team này` 
        });
      }

      // Attach role to request for later use
      (req as any).teamRole = role;
      next();
    } catch (error) {
      console.error('RBAC error:', error);
      res.status(500).json({ message: 'Lỗi kiểm tra quyền' });
    }
  };
}

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: TeamRole[]) {
  return async (req: AuthRequest, res: Response, next: Function) => {
    try {
      const userId = req.user?.id;
      const teamId = req.params.teamId || req.body.teamId;

      if (!userId) {
        return res.status(401).json({ message: 'Chưa đăng nhập' });
      }

      if (!teamId) {
        return res.status(400).json({ message: 'Thiếu team ID' });
      }

      const role = await getUserTeamRole(userId, teamId);

      if (!role) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập team này' });
      }

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ 
          message: `Chỉ ${allowedRoles.join(' hoặc ')} mới được thực hiện thao tác này` 
        });
      }

      (req as any).teamRole = role;
      next();
    } catch (error) {
      console.error('RBAC error:', error);
      res.status(500).json({ message: 'Lỗi kiểm tra quyền' });
    }
  };
}

/**
 * Require owner only
 */
export const requireOwner = requireRole(ROLES.OWNER);

/**
 * Require owner or admin
 */
export const requireOwnerOrAdmin = requireRole(ROLES.OWNER, ROLES.ADMIN);

/**
 * Require any team member
 */
export const requireMember = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.user?.id;
    const teamId = req.params.teamId || req.body.teamId;

    if (!userId || !teamId) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }

    const role = await getUserTeamRole(userId, teamId);

    if (!role) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập team này' });
    }

    (req as any).teamRole = role;
    next();
  } catch (error) {
    console.error('RBAC error:', error);
    res.status(500).json({ message: 'Lỗi kiểm tra quyền' });
  }
};
