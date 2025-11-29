require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

/**
 * Script to reset user password
 * Usage: node scripts/reset-password.js <username> <new_password>
 * Example: node scripts/reset-password.js admin newpassword123
 */

async function resetPassword() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('❌ Usage: node scripts/reset-password.js <username> <new_password>');
      console.error('Example: node scripts/reset-password.js admin newpassword123');
      process.exit(1);
    }

    const [username, newPassword] = args;

    if (newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      process.exit(1);
    }

    // Initialize database
    await db.init();

    // Check if user exists
    const userResult = await db.pool.query(
      'SELECT id, username, email, role FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${username}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`📋 Found user: ${user.username} (${user.email}, ${user.role})`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    console.log(`✅ Password reset successfully for user: ${username}`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log('⚠️  Please change this password after logging in!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetPassword();

