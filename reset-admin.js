
const { Pool } = require('pg');

async function resetAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 Connecting to database...');
    
    // Clear all users
    console.log('🔄 Clearing all users...');
    await pool.query('DELETE FROM users');
    console.log('✅ All users cleared');

    // Create admin user directly
    console.log('🔄 Creating new admin user...');
    const result = await pool.query(`
      INSERT INTO users (username, password, email, is_admin, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, username, email, is_admin
    `, ['admin', 'TempPass123!', 'napadatai@duck.com', true, true]);

    console.log('✅ Admin user created successfully!');
    console.log('📋 User details:', result.rows[0]);
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: TempPass123!');
    console.log('   Email: napadatai@duck.com');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after logging in!');
    
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
    console.error('Error details:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

resetAdmin();
