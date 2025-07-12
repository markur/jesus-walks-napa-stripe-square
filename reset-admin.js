
import { storage } from './server/storage.js';
import { db } from './server/db.js';
import { users } from './shared/schema.js';

async function resetAdmin() {
  try {
    console.log('🔄 Clearing all users...');
    // Delete all users
    await db.delete(users);
    console.log('✅ All users cleared');

    console.log('🔄 Creating new admin user...');
    // Create fresh admin user
    const adminUser = await storage.createUser({
      username: "admin",
      password: "TempPass123!",
      email: "napadatai@duck.com",
      isAdmin: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: TempPass123!');
    console.log('   Email: napadatai@duck.com');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password immediately after logging in!');
    
  } catch (error) {
    console.error('❌ Error resetting admin:', error);
  } finally {
    process.exit(0);
  }
}

resetAdmin();
