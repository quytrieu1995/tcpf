const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sales_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const init = async () => {
  try {
    // Validate required environment variables
    if (!process.env.DB_PASSWORD) {
      console.warn('⚠️  Warning: DB_PASSWORD not set in environment variables');
      console.warn('   Please create backend/.env file with database configuration');
      console.warn('   See DATABASE_CONNECTION_FIX.md for details');
    }
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection established');
    // Create tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        category VARCHAR(100),
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);

    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        image_url VARCHAR(500),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update products table to use category_id
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS sku VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
      ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10
    `);

    // Promotions/Discounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        value DECIMAL(10, 2) NOT NULL,
        min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
        max_discount_amount DECIMAL(10, 2),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product promotions (many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_promotions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        promotion_id INTEGER REFERENCES promotions(id) ON DELETE CASCADE,
        UNIQUE(product_id, promotion_id)
      )
    `);

    // Suppliers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        tax_code VARCHAR(50),
        bank_account VARCHAR(100),
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add supplier_id to products
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL
    `);

    // Shipping methods table (Carriers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipping_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        cost DECIMAL(10, 2) NOT NULL,
        estimated_days INTEGER,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        api_type VARCHAR(50),
        api_endpoint VARCHAR(500),
        api_key VARCHAR(500),
        api_secret VARCHAR(500),
        api_config JSONB,
        is_connected BOOLEAN DEFAULT false,
        last_sync_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shipments table (Vận đơn)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        carrier_id INTEGER REFERENCES shipping_methods(id) ON DELETE SET NULL,
        tracking_number VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        estimated_delivery_date DATE,
        delivered_at TIMESTAMP,
        carrier_status VARCHAR(100),
        carrier_status_message TEXT,
        tracking_events JSONB,
        last_synced_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update orders table
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS shipping_method_id INTEGER REFERENCES shipping_methods(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS promotion_id INTEGER REFERENCES promotions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS shipping_address TEXT,
      ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100)
    `);

    // Inventory transactions (stock movements)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        description TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payment methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update users table for staff management
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb
    `);

    // Customer Groups (Phân loại khách hàng)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Update customers table
    await pool.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES customer_groups(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS debt_amount DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tags TEXT[]
    `);

    // Purchase Orders (Đơn đặt hàng từ nhà cung cấp)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        expected_date DATE,
        received_date DATE,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Purchase Order Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);

    // Stock In (Nhập kho)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_ins (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock In Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_in_items (
        id SERIAL PRIMARY KEY,
        stock_in_id INTEGER REFERENCES stock_ins(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        batch_number VARCHAR(100),
        expiry_date DATE,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);

    // Stock Out (Xuất kho)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_outs (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock Out Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_out_items (
        id SERIAL PRIMARY KEY,
        stock_out_id INTEGER REFERENCES stock_outs(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL
      )
    `);

    // Stocktaking (Kiểm kê kho)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocktakings (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        warehouse_location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'draft',
        counted_at TIMESTAMP,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Stocktaking Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stocktaking_items (
        id SERIAL PRIMARY KEY,
        stocktaking_id INTEGER REFERENCES stocktakings(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        system_quantity INTEGER NOT NULL,
        counted_quantity INTEGER NOT NULL,
        difference INTEGER NOT NULL,
        notes TEXT
      )
    `);

    // Stock Transfers (Chuyển kho)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        from_location VARCHAR(255),
        to_location VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Stock Transfer Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_transfer_items (
        id SERIAL PRIMARY KEY,
        stock_transfer_id INTEGER REFERENCES stock_transfers(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL,
        notes TEXT
      )
    `);

    // Debt Transactions (Công nợ)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS debt_transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        entity_type VARCHAR(20) NOT NULL,
        entity_id INTEGER NOT NULL,
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
        amount DECIMAL(10, 2) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product Variants (Biến thể sản phẩm)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        price DECIMAL(10, 2),
        cost_price DECIMAL(10, 2),
        stock INTEGER DEFAULT 0,
        attributes JSONB,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product Combos (Combo sản phẩm)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_combos (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        cost_price DECIMAL(10, 2),
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product Combo Items
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_combo_items (
        id SERIAL PRIMARY KEY,
        combo_id INTEGER REFERENCES product_combos(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1
      )
    `);

    // Price Policies (Chính sách giá)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_policies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        customer_group_id INTEGER REFERENCES customer_groups(id) ON DELETE SET NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        price DECIMAL(10, 2) NOT NULL,
        min_quantity INTEGER DEFAULT 1,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Serial Numbers / IMEI
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_serials (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        serial_number VARCHAR(100) UNIQUE NOT NULL,
        imei VARCHAR(100),
        status VARCHAR(20) DEFAULT 'available',
        order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create default admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminCheck = await pool.query('SELECT id FROM users WHERE username = $1', ['admin']);
    
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@sale.thuanchay.vn', hashedPassword, 'admin']
      );
      console.log('Default admin user created: admin / admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error(`   Code: ${error.code}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Giải pháp:');
      console.error('   1. Kiểm tra PostgreSQL có đang chạy không');
      console.error('   2. Kiểm tra file backend/.env có đúng cấu hình không');
      console.error('   3. Chạy: npm run test-db để kiểm tra kết nối');
      console.error('   4. Xem DATABASE_CONNECTION_FIX.md để biết thêm chi tiết');
    } else if (error.code === '28P01') {
      console.error('\n💡 Giải pháp:');
      console.error('   - Mật khẩu database không đúng');
      console.error('   - Kiểm tra DB_PASSWORD trong file backend/.env');
    } else if (error.code === '3D000') {
      console.error('\n💡 Giải pháp:');
      console.error('   - Database chưa được tạo');
      console.error('   - Chạy: npm run migrate');
    }
    
    throw error;
  }
};

module.exports = {
  pool,
  init
};

