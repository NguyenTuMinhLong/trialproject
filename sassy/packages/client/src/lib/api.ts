import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/auth/login';
          return Promise.reject(error);
        }
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  image?: string;
  emailVerified?: string;
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
  requires2FA?: boolean;
}

export interface RegisterResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authAPI = {
  register: async (name: string, email: string, password: string): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  me: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; image?: string }): Promise<{ user: User; message: string }> => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.put('/auth/me/password', { currentPassword, newPassword });
    return response.data;
  },

  sendEmailVerification: async (email: string): Promise<{ message: string; devCode?: string }> => {
    const response = await api.post('/auth/verify-email/send', { email });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string; devToken?: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  verify2FA: async (email: string, password: string, code?: string, backupCode?: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/2fa/verify', { email, password, code, backupCode });
    return response.data;
  },
};

export interface TwoFASetupResponse {
  qrCode: string;
  secret: string;
  message: string;
}

export interface TwoFAEnableResponse {
  message: string;
  backupCodes: string[];
}

export const twoFactorAPI = {
  setup: async (): Promise<TwoFASetupResponse> => {
    const response = await api.post('/auth/2fa/setup');
    return response.data;
  },

  enable: async (code: string): Promise<TwoFAEnableResponse> => {
    const response = await api.post('/auth/2fa/enable', { code });
    return response.data;
  },

  disable: async (code: string, password: string): Promise<{ message: string }> => {
    const response = await api.post('/auth/2fa/disable', { code, password });
    return response.data;
  },
};

export const googleOAuth = () => {
  window.location.href = `${API_BASE_URL}/auth/google`;
};

export const githubOAuth = () => {
  window.location.href = `${API_BASE_URL}/auth/github`;
};

// ============================================
// TEAM API
// ============================================

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

export const teamAPI = {
  // Create team
  create: async (name: string): Promise<{ message: string; team: Team }> => {
    const response = await api.post('/teams', { name });
    return response.data;
  },

  // List all teams (owned + joined)
  list: async (): Promise<{ ownedTeams: Team[]; joinedTeams: Team[] }> => {
    const response = await api.get('/teams');
    return response.data;
  },

  // Get team details
  get: async (teamId: string): Promise<{ team: any; userRole: string }> => {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  },

  // Update team
  update: async (teamId: string, name: string): Promise<{ message: string; team: Team }> => {
    const response = await api.put(`/teams/${teamId}`, { name });
    return response.data;
  },

  // Delete team
  delete: async (teamId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/teams/${teamId}`);
    return response.data;
  },

  // Invite member
  invite: async (teamId: string, email: string, role?: string): Promise<any> => {
    const response = await api.post(`/teams/${teamId}/invite`, { email, role });
    return response.data;
  },

  // Accept invitation
  acceptInvite: async (token: string): Promise<{ message: string; team: { id: string; name: string; role: string } }> => {
    const response = await api.post('/teams/accept', { token });
    return response.data;
  },

  // List pending invitations
  getInvitations: async (): Promise<{ invitations: TeamInvitation[] }> => {
    const response = await api.get('/teams/invitations');
    return response.data;
  },

  // Remove member
  removeMember: async (teamId: string, memberId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/teams/${teamId}/members/${memberId}`);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (teamId: string, memberId: string, role: string): Promise<any> => {
    const response = await api.put(`/teams/${teamId}/members/${memberId}`, { role });
    return response.data;
  },
};

// ============================================
// PROJECT API
// ============================================

export const projectAPI = {
  // Create project
  create: async (data: { name: string; description?: string; teamId: string }): Promise<{ message: string; project: Project }> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  // List all accessible projects
  list: async (): Promise<{ projects: Project[] }> => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Get project details
  get: async (projectId: string): Promise<any> => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  // Update project
  update: async (projectId: string, data: { name?: string; description?: string }): Promise<{ message: string; project: Project }> => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },

  // Delete project
  delete: async (projectId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },
};

export default api;
