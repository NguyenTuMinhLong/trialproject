# Sassy App - Tài Liệu Logic

## Mục Lục
1. [Database Schema](#database-schema)
2. [Authentication Flow](#authentication-flow)
3. [Team Management](#team-management)
4. [Project Management](#project-management)
5. [RBAC (Role-Based Access Control)](#rbac-role-based-access-control)
6. [Email Service](#email-service)
7. [API Endpoints](#api-endpoints)

---

## Database Schema

### User Model
```prisma
model User {
  id            String       @id @default(uuid())
  email         String       @unique
  name          String?
  password      String?      // Null nếu login bằng OAuth
  emailVerified DateTime?
  image         String?
  githubId      String?      @unique
  googleId      String?      @unique
  role          String       @default("USER")  // USER, ADMIN
  twoFactorEnabled  Boolean  @default(false)
  twoFactorSecret  String?
  twoFactorBackupCodes String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}
```

### Team Model
```prisma
model Team {
  id         String       @id @default(uuid())
  name       String
  ownerId    String       // User ID của chủ team
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
}
```

### TeamMember Model
```prisma
model TeamMember {
  id        String   @id @default(uuid())
  teamId    String
  userId    String
  role      String   @default("MEMBER")  // ADMIN, MEMBER
  createdAt DateTime @default(now())
  
  @@unique([teamId, userId])  // Mỗi user chỉ có 1 record trong 1 team
}
```

### Project Model
```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  teamId      String   // Foreign key to Team
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Invitation Model
```prisma
model Invitation {
  id        String   @id @default(uuid())
  email     String
  token     String   @unique  // Token để accept invitation
  teamId    String
  role      String   @default("MEMBER")
  expiresAt DateTime  // Hết hạn sau 7 ngày
  createdAt DateTime @default(now())
}
```

---

## Authentication Flow

### 1. Register
```
User nhập name, email, password
  ↓
Server tạo user mới (password được hash)
  ↓
Tạo accessToken (15 phút) + refreshToken (7 ngày)
  ↓
Trả về tokens + user info
```

### 2. Login
```
User nhập email, password
  ↓
Server verify password
  ↓
Nếu bật 2FA → Trả về requires2FA: true
  ↓
Tạo tokens
  ↓
Trả về tokens + user info
```

### 3. 2FA Flow
```
Setup:
  User request setup 2FA
    ↓
  Server tạo secret (base32)
    ↓
  Trả về QR code + secret để user scan

Enable:
  User nhập code từ authenticator app
    ↓
  Server verify code
    ↓
  Bật twoFactorEnabled = true
    ↓
  Trả về backup codes

Login with 2FA:
  User nhập email, password
    ↓
  Server verify password
    ↓
  User nhập code từ authenticator
    ↓
  Server verify code
    ↓
  Tạo tokens
```

### 4. Token Refresh
```
AccessToken hết hạn (15 phút)
  ↓
Frontend gửi refreshToken lên /auth/refresh
  ↓
Server verify refreshToken
  ↓
Tạo tokens mới
  ↓
Trả về tokens mới
```

---

## Team Management

### 1. Tạo Team
```
User click "Tạo Team"
  ↓
Nhập tên team → Submit
  ↓
Server tạo Team record
  ↓
Server tự động thêm user làm ADMIN member
  ↓
Trả về team info
```

### 2. Invite Member
```
Team owner/admin nhập email + role (ADMIN/MEMBER)
  ↓
Server tạo Invitation record với token ngẫu nhiên
  ↓
Token hết hạn sau 7 ngày
  ↓
Gửi email với invite link (hoặc hiển thị link trong dev mode)
  ↓
Link format: /teams/invite?token={token}
```

### 3. Accept Invitation
```
User mở link invite
  ↓
Frontend gọi /teams/accept với token
  ↓
Server verify:
  - Token tồn tại?
  - Chưa hết hạn?
  - Email invitation khớp với email user đang login?
  ↓
Tạo TeamMember record
  ↓
Xóa Invitation
  ↓
Redirect user đến team page
```

### 4. Remove Member
```
Team owner click "Xóa" member
  ↓
Server verify: User hiện tại là owner?
  ↓
Xóa TeamMember record
  ↓
Không thể xóa owner
```

### 5. Update Member Role
```
Team owner chọn role mới cho member
  ↓
Server verify: User hiện tại là owner?
  ↓
Update TeamMember.role
  ↓
Chỉ OWNER mới được thay đổi role
```

### 6. Delete Team
```
Team owner click "Xóa Team"
  ↓
Confirm dialog
  ↓
Xóa Team (cascade xóa members, projects, invitations)
  ↓
Redirect về /teams
```

---

## Project Management

### 1. Tạo Project
```
User click "Tạo Project"
  ↓
Chọn team + nhập tên + mô tả (optional)
  ↓
Server verify: User có quyền trong team?
  ↓
Tạo Project record
  ↓
Trả về project info
```

### 2. Update/Delete Project
```
User click edit/delete
  ↓
Server verify permission:
  - OWNER hoặc ADMIN: full access
  - MEMBER: chỉ đọc
  ↓
Thực hiện update/delete
```

---

## RBAC (Role-Based Access Control)

### Role Hierarchy
```
OWNER > ADMIN > MEMBER
```

### Permissions

| Action | OWNER | ADMIN | MEMBER |
|--------|-------|-------|--------|
| Xem team | ✓ | ✓ | ✓ |
| Tạo project | ✓ | ✓ | ✓ |
| Xóa team | ✓ | ✗ | ✗ |
| Mời member | ✓ | ✓ | ✗ |
| Xóa member | ✓ | ✗ | ✗ |
| Đổi role member | ✓ | ✗ | ✗ |
| Xóa project | ✓ | ✓ | ✗ |
| Sửa project | ✓ | ✓ | ✓ |

### Implementation
```typescript
// middleware/rbac.ts
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
} as const;

// Check permission
function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission);
}

// Get user role in team
async function getUserTeamRole(userId, teamId) {
  // Check if owner
  const team = await prisma.team.findFirst({
    where: { id: teamId, ownerId: userId }
  });
  if (team) return 'OWNER';

  // Check membership
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } }
  });
  return membership?.role || null;
}
```

---

## Email Service

### SMTP Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Email Templates

1. **Team Invitation**
   - Subject: "Lời mời tham gia team {teamName}"
   - Body: Link invite với expiration notice

2. **Email Verification** (6-digit code)
3. **Password Reset** (link)
4. **Password Changed Notification**
5. **2FA Backup Codes**

---

## API Endpoints

### Auth Routes (`/auth`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | /auth/register | Đăng ký |
| POST | /auth/login | Đăng nhập |
| POST | /auth/logout | Đăng xuất |
| POST | /auth/refresh | Refresh token |
| GET | /auth/me | Lấy user info |
| PUT | /auth/me | Update profile |
| PUT | /auth/me/password | Đổi mật khẩu |
| POST | /auth/verify-email/send | Gửi mã verify |
| POST | /auth/verify-email | Verify email |
| POST | /auth/forgot-password | Quên mật khẩu |
| POST | /auth/reset-password | Reset mật khẩu |
| POST | /auth/2fa/setup | Setup 2FA |
| POST | /auth/2fa/enable | Bật 2FA |
| POST | /auth/2fa/disable | Tắt 2FA |
| POST | /auth/2fa/verify | Verify 2FA code |

### Team Routes (`/teams`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | /teams | Tạo team | Required |
| GET | /teams | List teams | Required |
| GET | /teams/invitations | List invitations | Required |
| GET | /teams/:id | Team details | Required |
| PUT | /teams/:id | Update team | OWNER/ADMIN |
| DELETE | /teams/:id | Delete team | OWNER |
| POST | /teams/:id/invite | Invite member | OWNER/ADMIN |
| POST | /teams/accept | Accept invite | Required |
| PUT | /teams/:id/members/:userId | Update role | OWNER |
| DELETE | /teams/:id/members/:userId | Remove member | OWNER |

### Project Routes (`/projects`)

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | /projects | Tạo project | Team member |
| GET | /projects | List projects | Required |
| GET | /projects/:id | Project details | Team member |
| PUT | /projects/:id | Update project | ADMIN/OWNER |
| DELETE | /projects/:id | Delete project | ADMIN/OWNER |

---

## Frontend Pages

### Auth Pages (`/auth/*`)
- `/auth/login` - Đăng nhập
- `/auth/register` - Đăng ký
- `/auth/forgot-password` - Quên mật khẩu
- `/auth/reset-password?token=xxx` - Reset mật khẩu
- `/auth/2fa` - Setup 2FA

### Main Pages
- `/dashboard` - Dashboard (cần login)
- `/profile` - Hồ sơ user
- `/teams` - Danh sách teams
- `/teams/:id` - Chi tiết team
- `/teams/invite?token=xxx` - Chấp nhận lời mời
- `/projects` - Danh sách projects
- `/projects/:id` - Chi tiết project

---

## Security Notes

1. **Password Hashing**: bcrypt với salt rounds = 10
2. **JWT Access Token**: 15 phút expiration
3. **Refresh Token**: 7 ngày expiration, stored in DB để có thể revoke
4. **2FA**: TOTP (Time-based One-Time Password)
5. **OAuth**: Google & GitHub OAuth 2.0
6. **CORS**: Chỉ cho phép frontend domain
7. **Helmet**: Security HTTP headers

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key
REFRESH_SECRET=your-refresh-secret

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# App
PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## Dependencies

### Server
- express, cors, helmet
- @prisma/client, prisma
- bcryptjs, jsonwebtoken
- nodemailer
- passport (Google, GitHub)

### Client
- react, react-dom
- react-router-dom
- axios
- tailwindcss
