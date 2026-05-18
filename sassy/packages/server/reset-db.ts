import postgres from 'postgres';

async function resetTables() {
  console.log('🔧 Reset tables...\n');
  
  const sql = postgres({
    host: "localhost",
    port: 5000,
    database: "sassy",
    user: "postgres",
    password: "123"
  });

  try {
    // Drop các bảng cũ (thứ tự quan trọng vì có foreign keys)
    console.log('→ Dropping old tables...');
    
    await sql.unsafe('DROP TABLE IF EXISTS "Account" CASCADE');
    console.log('  ✅ Account dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "Session" CASCADE');
    console.log('  ✅ Session dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "Project" CASCADE');
    console.log('  ✅ Project dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "Invitation" CASCADE');
    console.log('  ✅ Invitation dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "TeamMember" CASCADE');
    console.log('  ✅ TeamMember dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "Team" CASCADE');
    console.log('  ✅ Team dropped');
    
    await sql.unsafe('DROP TABLE IF EXISTS "User" CASCADE');
    console.log('  ✅ User dropped');
    
    // Giữ nguyên bảng users, teams, projects, invitations, team_members nếu muốn
    // Hoặc drop luôn:
    await sql.unsafe('DROP TABLE IF EXISTS team_members CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS projects CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS invitations CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS teams CASCADE');
    await sql.unsafe('DROP TABLE IF EXISTS users CASCADE');
    
    // Drop migrations table
    await sql.unsafe('DROP TABLE IF EXISTS "_prisma_migrations" CASCADE');
    console.log('  ✅ _prisma_migrations dropped');
    
    console.log('\n✅ All old tables dropped!');
    console.log('Bây giờ chạy: npx prisma db push');
    
  } catch (e) {
    console.error('Lỗi:', e.message);
  }
  
  await sql.end();
}

resetTables();
