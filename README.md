# TrialProject - SaaS Monorepo (y chang saasy)

## Giới thiệu
Project này là **SaaS boilerplate** được xây dựng theo đúng phong cách **monorepo Yarn workspaces** giống repo `pilotpirxie/saasy`.

Mục tiêu: Học từ A-Z cách xây dựng một SaaS đầy đủ (Auth, Protected Route, UI đẹp, API kết nối mượt).

**Hiện tại đã hoàn thành:**
- Monorepo Yarn workspaces
- Backend (Express + TypeScript)
- Frontend (React + Vite + TypeScript + Tailwind)
- Authentication (Register + Login + JWT + localStorage)
- Protected Route
- Proxy API (không CORS)
- UI đẹp theo phong cách SaaS

---

## Cấu trúc thư mục
D:\boi\sassy
├── packages/
│   ├── client/          ← React + Vite + Tailwind + Router
│   │   ├── src/
│   │   │   ├── pages/ (Home, Login, Register)
│   │   │   ├── components/ (ProtectedRoute)
│   │   │   ├── services/ (api.ts)
│   │   │   └── ...
│   │   └── vite.config.ts
│   │
│   └── server/          ← Node.js + Express
│       ├── src/
│       │   ├── index.ts
│       │   └── routes/ (auth)
│       └── ...
│
├── tsconfig.json
├── package.json (root)
└── README.md

Tính năng đã có

 Monorepo Yarn Workspaces
 TypeScript toàn bộ
 Tailwind CSS + thiết kế SaaS đẹp
 React Router
 Axios + Proxy API
 Auth Register / Login (JWT)
 Lưu token + user vào localStorage
 Protected Route (trang Home chỉ vào được khi đã login)
 Logout
 In-memory user (dễ test, restart server sẽ mất dữ liệu)

 Muốn tiếp tục sau này?
Các tính năng có thể thêm tiếp:

Thêm Prisma + SQLite/Postgres (lưu user vĩnh viễn)
Team + Invitation + RBAC (giống saasy)
Forgot Password + Email verification
Dashboard + Profile
Billing (Stripe)
Deploy lên Vercel + Railway