
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

// Create database connection using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/your_db_name',
});

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database reset...');
    
    // Check if migrations table exists
    const migrationCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '__drizzle_migrations'
      );
    `);
    
    console.log('📋 Migration table exists:', migrationCheck.rows[0].exists);
    
    // Check current users table structure
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current users table columns:', columnCheck.rows.map(r => r.column_name));
    
    // Clear all users
    await client.query('DELETE FROM users CASCADE');
    console.log('✅ All users cleared');
    
    // Create admin user with proper password hashing
    const hashedPassword = await bcrypt.hash('TempPass123!', 10);
    
    const adminResult = await client.query(`
      INSERT INTO users (username, password, email, is_admin, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, username, email, is_admin
    `, ['admin', hashedPassword, 'admin@jesuswalks.com', true, true]);
    
    console.log('✅ Admin user created:', adminResult.rows[0]);
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: TempPass123!');
    console.log('   Email: admin@jesuswalks.com');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after logging in!');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase()
  .then(() => {
    console.log('🎉 Database reset complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  });
