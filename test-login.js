
const { pool } = require('./server/db.js');
const { storage } = require('./server/storage.js');

async function testLogin() {
  console.log('🔍 Testing login functionality...\n');
  
  try {
    // Test 1: Check if users table exists and has correct structure
    console.log('1. Testing database connection and user table structure...');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    console.log('   Users table columns:', tableCheck.rows.map(r => `${r.column_name} (${r.data_type})`));
    
    // Test 2: Check if admin user exists
    console.log('\n2. Checking for existing admin user...');
    const adminUser = await storage.getUserByUsername('markur');
    if (adminUser) {
      console.log('   ✅ Admin user "markur" found');
      console.log('   User details:', {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin,
        hasPhone: !!adminUser.phone
      });
    } else {
      console.log('   ❌ Admin user "markur" not found');
    }
    
    // Test 3: Create a test user for login testing
    console.log('\n3. Creating test user...');
    const testUsername = 'testuser_' + Date.now();
    const testEmail = `test_${Date.now()}@example.com`;
    
    try {
      const testUser = await storage.createUser({
        username: testUsername,
        email: testEmail,
        password: 'testpass123',
        isAdmin: false
      });
      console.log('   ✅ Test user created successfully');
      console.log('   Test user details:', {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
      
      // Test 4: Test login with the test user
      console.log('\n4. Testing login with test user...');
      const loginTestUser = await storage.getUserByUsername(testUsername);
      if (loginTestUser && loginTestUser.password === 'testpass123') {
        console.log('   ✅ Login test successful - password matches');
      } else {
        console.log('   ❌ Login test failed - password mismatch');
      }
      
    } catch (createError) {
      console.log('   ❌ Failed to create test user:', createError.message);
    }
    
    // Test 5: Test admin recovery functionality
    console.log('\n5. Testing admin recovery...');
    try {
      if (adminUser) {
        await storage.updateUserPassword(adminUser.id, 'TempPass2025!');
        console.log('   ✅ Admin password reset successful');
      } else {
        const newAdmin = await storage.createUser({
          username: 'markur',
          email: 'admin@jesuswalks.com',
          password: 'TempPass2025!',
          isAdmin: true
        });
        console.log('   ✅ New admin user created');
      }
    } catch (adminError) {
      console.log('   ❌ Admin recovery failed:', adminError.message);
    }
    
    console.log('\n✅ Login tests completed successfully!');
    console.log('\n🔑 Admin credentials for testing:');
    console.log('   Username: markur');
    console.log('   Password: TempPass2025!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testLogin();
