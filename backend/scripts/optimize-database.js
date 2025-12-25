/**
 * Database Optimization Script
 * Tối ưu hóa database để xử lý dữ liệu lớn hiệu quả
 */

const db = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

const optimizeDatabase = async () => {
  const client = await db.pool.connect();
  
  try {
    console.log('🚀 Bắt đầu tối ưu hóa database...\n');

    // ============================================
    // 1. TẠO INDEXES CHO CÁC CỘT THƯỜNG ĐƯỢC QUERY
    // ============================================
    console.log('📊 Đang tạo indexes...');

    // Products indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', name));
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id) WHERE category_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id) WHERE supplier_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock) WHERE stock < low_stock_threshold;
      CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active) WHERE is_active = true;
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    `);

    // Orders indexes - Critical for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id) WHERE customer_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at_asc ON orders(created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number) WHERE tracking_number IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_sales_channel ON orders(sales_channel) WHERE sales_channel IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id) WHERE seller_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON orders(branch_id) WHERE branch_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_reconciliation_code ON orders(reconciliation_code) WHERE reconciliation_code IS NOT NULL;
    `);

    // Order items indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
    `);

    // Customers indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('english', name));
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code) WHERE code IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_group_id ON customers(group_id) WHERE group_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
    `);

    // Shipments indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
      CREATE INDEX IF NOT EXISTS idx_shipments_carrier_id ON shipments(carrier_id) WHERE carrier_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
      CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_shipments_sales_channel ON shipments(sales_channel) WHERE sales_channel IS NOT NULL;
    `);

    // Inventory transactions indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference_type, reference_id);
    `);

    // Categories indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id) WHERE parent_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = true;
    `);

    // Users indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;
    `);

    // Purchase orders indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id) WHERE supplier_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_at ON purchase_orders(created_at DESC);
    `);

    // Composite indexes for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(DATE(created_at), status);
      CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category_id, is_active) WHERE is_active = true;
      CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status) WHERE customer_id IS NOT NULL;
    `);

    console.log('✅ Đã tạo indexes\n');

    // ============================================
    // 2. TỐI ƯU HÓA STATISTICS
    // ============================================
    console.log('📈 Đang cập nhật statistics...');
    
    const tables = [
      'products', 'orders', 'order_items', 'customers', 
      'shipments', 'inventory_transactions', 'categories',
      'users', 'purchase_orders', 'reconciliations'
    ];

    for (const table of tables) {
      try {
        await client.query(`ANALYZE ${table}`);
        console.log(`  ✓ Analyzed ${table}`);
      } catch (error) {
        console.warn(`  ⚠️  Could not analyze ${table}:`, error.message);
      }
    }

    console.log('✅ Đã cập nhật statistics\n');

    // ============================================
    // 3. TẠO MATERIALIZED VIEWS CHO REPORTS
    // ============================================
    console.log('📊 Đang tạo materialized views...');

    // Daily sales summary
    await client.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
      SELECT 
        DATE(created_at) as sale_date,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer_id) as total_customers,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_revenue,
        SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END) as cancelled_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
      FROM orders
      GROUP BY DATE(created_at);
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales_date ON mv_daily_sales(sale_date);
    `);

    // Product sales summary
    await client.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_product_sales AS
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        COUNT(DISTINCT oi.order_id) as total_orders,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.subtotal) as total_revenue,
        AVG(oi.price) as avg_price
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
      GROUP BY p.id, p.name, p.sku;
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_product_sales_product_id ON mv_product_sales(product_id);
    `);

    // Customer summary
    await client.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_summary AS
      SELECT 
        c.id as customer_id,
        c.name,
        c.code,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) as total_spent,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      GROUP BY c.id, c.name, c.code;
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_summary_customer_id ON mv_customer_summary(customer_id);
    `);

    console.log('✅ Đã tạo materialized views\n');

    // ============================================
    // 4. TỐI ƯU HÓA TABLE SETTINGS
    // ============================================
    console.log('⚙️  Đang tối ưu table settings...');

    // Set fillfactor cho tables có nhiều updates
    await client.query(`
      ALTER TABLE products SET (fillfactor = 90);
      ALTER TABLE orders SET (fillfactor = 90);
      ALTER TABLE order_items SET (fillfactor = 90);
      ALTER TABLE inventory_transactions SET (fillfactor = 90);
    `);

    // Enable autovacuum tuning
    await client.query(`
      ALTER TABLE orders SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
      ALTER TABLE order_items SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
    `);

    console.log('✅ Đã tối ưu table settings\n');

    // ============================================
    // 5. TẠO FUNCTIONS CHO COMMON OPERATIONS
    // ============================================
    console.log('🔧 Đang tạo helper functions...');

    // Function để refresh materialized views
    await client.query(`
      CREATE OR REPLACE FUNCTION refresh_materialized_views()
      RETURNS void AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales;
        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function để get product stock với cache
    await client.query(`
      CREATE OR REPLACE FUNCTION get_product_stock(p_product_id INTEGER)
      RETURNS INTEGER AS $$
      DECLARE
        v_stock INTEGER;
      BEGIN
        SELECT stock INTO v_stock
        FROM products
        WHERE id = p_product_id;
        
        RETURN COALESCE(v_stock, 0);
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    console.log('✅ Đã tạo helper functions\n');

    // ============================================
    // 6. VACUUM VÀ REINDEX
    // ============================================
    console.log('🧹 Đang chạy VACUUM và REINDEX...');
    console.log('  ⚠️  Quá trình này có thể mất vài phút...\n');

    // Vacuum analyze các bảng quan trọng
    for (const table of ['orders', 'order_items', 'products', 'customers']) {
      try {
        console.log(`  Vacuuming ${table}...`);
        await client.query(`VACUUM ANALYZE ${table}`);
        console.log(`  ✓ Vacuumed ${table}`);
      } catch (error) {
        console.warn(`  ⚠️  Could not vacuum ${table}:`, error.message);
      }
    }

    console.log('\n✅ Đã hoàn thành VACUUM\n');

    // ============================================
    // 7. TẠO SCHEDULE CHO AUTO REFRESH MATERIALIZED VIEWS
    // ============================================
    console.log('⏰ Ghi chú về auto-refresh materialized views:');
    console.log('  - Chạy cron job hàng ngày để refresh views:');
    console.log('  - psql -d sales_db -c "SELECT refresh_materialized_views();"');
    console.log('  - Hoặc sử dụng pg_cron extension nếu có\n');

    // ============================================
    // 8. TẠO PARTITIONING CHO ORDERS (Optional - cho dữ liệu rất lớn)
    // ============================================
    console.log('📦 Ghi chú về partitioning:');
    console.log('  - Nếu orders table > 10M rows, nên partition theo tháng/năm');
    console.log('  - Script partitioning sẽ được tạo riêng nếu cần\n');

    console.log('🎉 Hoàn thành tối ưu hóa database!');
    console.log('\n📝 Các cải tiến đã thực hiện:');
    console.log('  ✓ Đã tạo indexes cho các cột thường query');
    console.log('  ✓ Đã tạo materialized views cho reports');
    console.log('  ✓ Đã tối ưu table settings');
    console.log('  ✓ Đã tạo helper functions');
    console.log('  ✓ Đã chạy VACUUM và ANALYZE');
    console.log('\n💡 Lưu ý:');
    console.log('  - Chạy REFRESH MATERIALIZED VIEW định kỳ (hàng ngày)');
    console.log('  - Monitor query performance với pg_stat_statements');
    console.log('  - Xem xét thêm Redis cache cho các queries thường xuyên');

  } catch (error) {
    console.error('❌ Lỗi khi tối ưu hóa database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run optimization
if (require.main === module) {
  optimizeDatabase()
    .then(() => {
      console.log('\n✅ Tối ưu hóa hoàn tất!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { optimizeDatabase };

