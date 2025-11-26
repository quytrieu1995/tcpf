const db = require('../config/database');

async function migrate() {
  try {
    console.log('Initializing database...');
    await db.init();
    console.log('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

