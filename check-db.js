
const { pool } = require('./server/db.js');

async function checkDatabase() {
  console.log('📊 Checking database status...\n');
  
  try {
    // Check connection
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log('   Current time:', result.rows[0].current_time);
    
    // Check if users table exists
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check users table structure
    if (tablesResult.rows.some(row => row.table_name === 'users')) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n👥 Users table structure:');
      columnsResult.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
      
      // Count users
      const countResult = await pool.query('SELECT COUNT(*) as user_count FROM users');
      console.log(`\n📊 Total users: ${countResult.rows[0].user_count}`);
      
      // List admin users
      const adminResult = await pool.query('SELECT username, email, is_admin FROM users WHERE is_admin = true');
      console.log('\n👑 Admin users:');
      if (adminResult.rows.length > 0) {
        adminResult.rows.forEach(admin => {
          console.log(`   - ${admin.username} (${admin.email})`);
        });
      } else {
        console.log('   No admin users found');
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
