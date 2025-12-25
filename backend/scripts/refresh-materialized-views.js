/**
 * Refresh Materialized Views
 * Script để refresh các materialized views định kỳ
 */

const db = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

const refreshViews = async () => {
  const client = await db.pool.connect();
  
  try {
    console.log('🔄 Đang refresh materialized views...\n');

    // Refresh với CONCURRENTLY để không block reads
    try {
      console.log('  Refreshing mv_daily_sales...');
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales');
      console.log('  ✓ mv_daily_sales refreshed');
    } catch (error) {
      console.warn('  ⚠️  mv_daily_sales:', error.message);
      // Fallback to non-concurrent if unique index doesn't exist
      await client.query('REFRESH MATERIALIZED VIEW mv_daily_sales');
    }

    try {
      console.log('  Refreshing mv_product_sales...');
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_sales');
      console.log('  ✓ mv_product_sales refreshed');
    } catch (error) {
      console.warn('  ⚠️  mv_product_sales:', error.message);
      await client.query('REFRESH MATERIALIZED VIEW mv_product_sales');
    }

    try {
      console.log('  Refreshing mv_customer_summary...');
      await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_summary');
      console.log('  ✓ mv_customer_summary refreshed');
    } catch (error) {
      console.warn('  ⚠️  mv_customer_summary:', error.message);
      await client.query('REFRESH MATERIALIZED VIEW mv_customer_summary');
    }

    console.log('\n✅ Đã refresh tất cả materialized views!');
    
  } catch (error) {
    console.error('❌ Lỗi khi refresh views:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  refreshViews()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { refreshViews };

