export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export type Role = 'owner' | 'admin' | 'member';