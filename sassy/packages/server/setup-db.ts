import postgres from 'postgres';

async function setup() {
  console.log('🔧 Setup Database...\n');

  // 1. Kết nối vào postgres (database mặc định) để tạo sassy
  console.log('1. Kết nối vào postgres...');
  const adminSql = postgres({
    host: "localhost",
    port: 5000,
    database: "postgres",  // Kết nối vào database mặc định
    user: "postgres",
    password: "123"
  });

  // 2. Kiểm tra database sassy đã có chưa
  console.log('2. Kiểm tra database sassy...');
  const dbExists = await adminSql`
    SELECT 1 FROM pg_database WHERE datname = 'sassy'
  `;

  if (dbExists.length === 0) {
    console.log('   → Tạo database sassy...');
    await adminSql.unsafe('CREATE DATABASE sassy');
    console.log('   ✅ Database sassy đã được tạo!\n');
  } else {
    console.log('   ✅ Database sassy đã tồn tại!\n');
  }

  await adminSql.end();

  // 3. Kết nối vào database sassy để tạo bảng
  console.log('3. Kết nối vào database sassy...');
  const appSql = postgres({
    host: "localhost",
    port: 5000,
    database: "sassy",
    user: "postgres",
    password: "123"
  });

  console.log('4. Tạo tables...\n');

  // Users
  console.log('   → Tạo bảng users...');
  await appSql.unsafe(`
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
    )
  `);
  console.log('   ✅ users created!\n');

  // Teams
  console.log('   → Tạo bảng teams...');
  await appSql.unsafe(`
    CREATE TABLE IF NOT EXISTS teams (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name      VARCHAR(255) NOT NULL,
      ownerId   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ teams created!\n');

  // Team Members
  console.log('   → Tạo bảng team_members...');
  await appSql.unsafe(`
    CREATE TABLE IF NOT EXISTS team_members (
      id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teamId UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role   VARCHAR(20) DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
      createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(teamId, userId)
    )
  `);
  console.log('   ✅ team_members created!\n');

  // Projects
  console.log('   → Tạo bảng projects...');
  await appSql.unsafe(`
    CREATE TABLE IF NOT EXISTS projects (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        VARCHAR(255) NOT NULL,
      description TEXT,
      teamId      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      createdAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updatedAt   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ projects created!\n');

  // Invitations
  console.log('   → Tạo bảng invitations...');
  await appSql.unsafe(`
    CREATE TABLE IF NOT EXISTS invitations (
      id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teamId    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      email     VARCHAR(255) NOT NULL,
      role      VARCHAR(20) DEFAULT 'MEMBER',
      token     VARCHAR(255) UNIQUE NOT NULL,
      expiresAt TIMESTAMPTZ NOT NULL,
      createdAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('   ✅ invitations created!\n');

  // Indexes
  console.log('   → Tạo indexes...');
  await appSql.unsafe(`CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email)`);
  await appSql.unsafe(`CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)`);
  console.log('   ✅ indexes created!\n');

  // Trigger function
  console.log('   → Tạo trigger function...');
  await appSql.unsafe(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updatedAt = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `);

  // Apply triggers
  console.log('   → Áp dụng triggers...');
  await appSql.unsafe(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
  await appSql.unsafe(`
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  await appSql.unsafe(`DROP TRIGGER IF EXISTS update_teams_updated_at ON teams`);
  await appSql.unsafe(`
    CREATE TRIGGER update_teams_updated_at 
    BEFORE UPDATE ON teams 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);

  await appSql.unsafe(`DROP TRIGGER IF EXISTS update_projects_updated_at ON projects`);
  await appSql.unsafe(`
    CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `);
  console.log('   ✅ triggers created!\n');

  // 5. Verify
  console.log('5. Verify tables...');
  const tables = await appSql.unsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('\n📋 Tables đã tạo:');
  tables.forEach(t => console.log('   - ' + t.table_name));

  await appSql.end();

  console.log('\n🎉 Setup hoàn tất! Database sassy sẵn sàng sử dụng!');
}

setup().catch(e => {
  console.error('❌ Lỗi:', e.message);
  process.exit(1);
});
