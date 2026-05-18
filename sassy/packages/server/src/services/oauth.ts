/**
 * ============================================
 * OAUTH SERVICE - GOOGLE & GITHUB OAUTH
 * ============================================
 * 
 * File này chứa các functions để implement OAuth 2.0
 * Hỗ trợ:
 * - Google OAuth: Đăng nhập bằng tài khoản Google
 * - GitHub OAuth: Đăng nhập bằng tài khoản GitHub
 * 
 * Luồng OAuth 2.0:
 * 1. User click "Login with Google/GitHub"
 * 2. Redirect user đến OAuth provider
 * 3. User authorize app
 * 4. OAuth provider redirect về callback URL với code
 * 5. Exchange code lấy access token
 * 6. Dùng access token lấy user info
 * 7. Tạo/Tìm user trong database và tạo JWT tokens
 * 
 * Cấu hình .env:
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 */

import crypto from 'crypto';

// Lấy credentials từ .env
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Callback URL - server nhận OAuth callback tại đây
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

// ============================================
// GOOGLE OAUTH
// ============================================

/**
 * Tạo Google OAuth URL để redirect user
 * 
 * @returns URL để redirect user đến Google consent screen
 * 
 * Các scopes được yêu cầu:
 * - email: Lấy email
 * - profile: Lấy thông tin profile (name, picture)
 * - access_type=offline: Nhận refresh token (để access khi user offline)
 */
export function getGoogleAuthUrl(): string {
  // Tạo state để prevent CSRF attacks
  const state = crypto.randomBytes(16).toString('hex');
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',      // Yêu cầu authorization code
    scope: 'email profile',     // Scopes cần truy cập
    state,                      // CSRF protection
    access_type: 'offline',     // Nhận refresh token
    prompt: 'consent'           // Luôn hiển thị consent screen
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code lấy tokens từ Google
 * 
 * @param code - Authorization code từ callback
 * @returns Access token, refresh token, và expiry time
 */
export async function exchangeCodeForGoogleTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
} | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      })
    });

    if (!response.ok) {
      console.error('Google token exchange failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Google token exchange error:', error);
    return null;
  }
}

/**
 * Lấy thông tin user từ Google
 * 
 * @param accessToken - Google access token
 * @returns User info: id, email, name, picture
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
} | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (error) {
    console.error('Google user info error:', error);
    return null;
  }
}

// ============================================
// GITHUB OAUTH
// ============================================

/**
 * Tạo GitHub OAuth URL để redirect user
 */
export function getGitHubAuthUrl(): string {
  const state = crypto.randomBytes(16).toString('hex');
  
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID || '',
    redirect_uri: 'http://localhost:3000/auth/github/callback',
    scope: 'user:email',  // Yêu cầu quyền đọc email
    state
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code lấy GitHub access token
 */
export async function exchangeCodeForGitHubToken(code: string): Promise<string | null> {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'  // Yêu cầu JSON response
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: 'http://localhost:3000/auth/github/callback'
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('GitHub token exchange error:', error);
    return null;
  }
}

/**
 * Lấy thông tin user từ GitHub
 */
export async function getGitHubUserInfo(accessToken: string): Promise<{
  id: number;
  login: string;
  name?: string;
  avatar_url: string;
  email?: string;
} | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub user info error:', error);
    return null;
  }
}

/**
 * Lấy danh sách email của GitHub user
 * GitHub API không trả email trong user info nếu user không public email
 */
export async function getGitHubEmails(accessToken: string): Promise<Array<{
  email: string;
  primary: boolean;
  verified: boolean;
}>> {
  try {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('GitHub emails error:', error);
    return [];
  }
}
