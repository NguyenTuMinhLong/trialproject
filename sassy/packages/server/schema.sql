-- Tạo database nếu chưa có
-- Chạy trong database postgres mặc định trước
-- Kết nối vào PostgreSQL và chạy:

-- 1. Tạo database sassy (nếu chưa có)
-- CREATE DATABASE sassy;

-- 2. Chạy trong database sassy:

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255),
  password      VARCHAR(255),
  image         TEXT,
  emailVerified TIMESTAMPTZ,
  githubId      VARCHAR(255) UNIQUE,
  googleId      VARCHAR(255) UNIQUE,
  role          VARCHAR(50) DEFAULT 'USER',
  createdAt     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(255) NOT NULL,
  ownerId   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamId UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role   VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teamId, userId)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  teamId      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  createdAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updatedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamId    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email     VARCHAR(255) NOT NULL,
  role      VARCHAR(20) DEFAULT 'MEMBER',
  token     VARCHAR(255) UNIQUE NOT NULL,
  expiresAt TIMESTAMPTZ NOT NULL,
  createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Trigger cập nhật updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedAt = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Áp dụng trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at 
  BEFORE UPDATE ON teams 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tạo database sassy (chạy riêng lệnh này trước)
-- CREATE DATABASE sassy;
