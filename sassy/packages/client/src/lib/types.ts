/**
 * ============================================
 * TYPES - SHARED TYPE DEFINITIONS
 * ============================================
 */

import { User } from './api';

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberRole?: string;
  _count?: {
    TeamMember: number;
    Project: number;
  };
}

export interface TeamMember {
  id: string;
  role: string;
  createdAt: string;
  User: User;
}

export interface TeamInvitation {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
  team: {
    id: string;
    name: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  Team?: {
    id: string;
    name: string;
  };
  userRole?: string;
}
