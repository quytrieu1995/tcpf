/**
 * Query Optimization Guide
 * Các best practices để tối ưu queries
 */

// ============================================
// 1. SỬ DỤNG PREPARED STATEMENTS
// ============================================
// ✅ TỐT - Sử dụng parameterized queries
const getProductsOptimized = async (search, category, page = 1, limit = 10) => {
  const query = `
    SELECT 
      p.*,
      c.name as category_name,
      s.name as supplier_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    WHERE 1=1
      ${search ? 'AND (p.name ILIKE $1 OR p.description ILIKE $1)' : ''}
      ${category ? 'AND p.category_id = $2' : ''}
      AND p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT $${search && category ? 3 : search || category ? 2 : 1}
    OFFSET $${search && category ? 4 : search || category ? 3 : 2}
  `;
  
  const params = [];
  if (search) params.push(`%${search}%`);
  if (category) params.push(category);
  params.push(limit, (page - 1) * limit);
  
  return await db.pool.query(query, params);
};

// ============================================
// 2. SỬ DỤNG SELECT CỤ THỂ THAY VÌ SELECT *
// ============================================
// ❌ XẤU
// SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id

// ✅ TỐT - Chỉ select các cột cần thiết
const getOrdersOptimized = async () => {
  return await db.pool.query(`
    SELECT 
      o.id,
      o.order_number,
      o.total_amount,
      o.status,
      o.created_at,
      c.name as customer_name,
      c.phone as customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 100
  `);
};

// ============================================
// 3. SỬ DỤNG EXISTS THAY VÌ COUNT
// ============================================
// ❌ XẤU
// SELECT * FROM products WHERE (SELECT COUNT(*) FROM order_items WHERE product_id = products.id) > 0

// ✅ TỐT
const getProductsWithOrders = async () => {
  return await db.pool.query(`
    SELECT p.*
    FROM products p
    WHERE EXISTS (
      SELECT 1 FROM order_items oi WHERE oi.product_id = p.id
    )
  `);
};

// ============================================
// 4. SỬ DỤNG LIMIT VÀ OFFSET ĐÚNG CÁCH
// ============================================
// ✅ TỐT - Sử dụng cursor-based pagination cho dữ liệu lớn
const getOrdersCursorBased = async (lastId = 0, limit = 50) => {
  return await db.pool.query(`
    SELECT *
    FROM orders
    WHERE id > $1
    ORDER BY id ASC
    LIMIT $2
  `, [lastId, limit]);
};

// ============================================
// 5. SỬ DỤNG MATERIALIZED VIEWS CHO REPORTS
// ============================================
const getDailySalesReport = async (startDate, endDate) => {
  // Sử dụng materialized view thay vì query trực tiếp
  return await db.pool.query(`
    SELECT *
    FROM mv_daily_sales
    WHERE sale_date BETWEEN $1 AND $2
    ORDER BY sale_date DESC
  `, [startDate, endDate]);
};

// ============================================
// 6. SỬ DỤNG BATCH OPERATIONS
// ============================================
const insertOrderItemsBatch = async (orderId, items) => {
  const values = items.map((item, index) => 
    `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`
  ).join(', ');
  
  const params = [orderId];
  items.forEach(item => {
    params.push(item.product_id, item.quantity, item.price, item.subtotal);
  });
  
  return await db.pool.query(`
    INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
    VALUES ${values}
  `, params);
};

// ============================================
// 7. SỬ DỤNG TRANSACTIONS ĐÚNG CÁCH
// ============================================
const createOrderWithItems = async (orderData, items) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert order
    const orderResult = await client.query(`
      INSERT INTO orders (customer_id, order_number, total_amount, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [orderData.customer_id, orderData.order_number, orderData.total_amount, 'pending']);
    
    const orderId = orderResult.rows[0].id;
    
    // Insert items
    for (const item of items) {
      await client.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `, [orderId, item.product_id, item.quantity, item.price, item.subtotal]);
      
      // Update stock
      await client.query(`
        UPDATE products
        SET stock = stock - $1
        WHERE id = $2
      `, [item.quantity, item.product_id]);
    }
    
    await client.query('COMMIT');
    return orderId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================
// 8. SỬ DỤNG EXPLAIN ANALYZE ĐỂ DEBUG
// ============================================
const analyzeQuery = async (query, params = []) => {
  const result = await db.pool.query(`EXPLAIN ANALYZE ${query}`, params);
  console.log('Query Plan:', result.rows);
  return result;
};

module.exports = {
  getProductsOptimized,
  getOrdersOptimized,
  getProductsWithOrders,
  getOrdersCursorBased,
  getDailySalesReport,
  insertOrderItemsBatch,
  createOrderWithItems,
  analyzeQuery
};

