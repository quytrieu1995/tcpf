const db = require('../config/database');

async function testConnection() {
  try {
    console.log('🔍 Đang kiểm tra kết nối database...');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'sales_db'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}`);
    console.log('');

    const result = await db.pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Kết nối database thành công!');
    console.log(`   Thời gian server: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    
    // Test query tables
    const tables = await db.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`\n📊 Số bảng trong database: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      console.log('   Các bảng:');
      tables.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi kết nối database:');
    console.error(`   Code: ${error.code}`);
    console.error(`   Message: ${error.message}`);
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Giải pháp:');
      console.error('   1. Kiểm tra PostgreSQL có đang chạy không:');
      console.error('      - Windows: Services > PostgreSQL');
      console.error('      - Linux: sudo systemctl status postgresql');
      console.error('      - Docker: docker-compose ps');
      console.error('');
      console.error('   2. Kiểm tra file backend/.env có đúng cấu hình không');
      console.error('   3. Nếu dùng Docker, chạy: docker-compose up -d postgres');
      console.error('   4. Nếu chạy local, đảm bảo PostgreSQL đang chạy trên port 5432');
    } else if (error.code === '28P01') {
      console.error('💡 Giải pháp:');
      console.error('   - Mật khẩu database không đúng');
      console.error('   - Kiểm tra DB_PASSWORD trong file backend/.env');
    } else if (error.code === '3D000') {
      console.error('💡 Giải pháp:');
      console.error('   - Database chưa được tạo');
      console.error('   - Chạy: npm run migrate');
    }
    
    process.exit(1);
  }
}

testConnection();

