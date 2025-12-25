# Database Optimization Guide

## Tổng quan

Tài liệu này mô tả các tối ưu hóa database đã được thực hiện để xử lý dữ liệu lớn hiệu quả.

## Các tối ưu hóa đã thực hiện

### 1. Indexes

#### Products Table
- `idx_products_name` - Full-text search trên tên sản phẩm
- `idx_products_category_id` - Filter theo category
- `idx_products_supplier_id` - Filter theo supplier
- `idx_products_sku` - Lookup theo SKU
- `idx_products_barcode` - Lookup theo barcode
- `idx_products_stock` - Tìm sản phẩm sắp hết hàng
- `idx_products_is_active` - Filter sản phẩm active
- `idx_products_created_at` - Sort theo ngày tạo
- `idx_products_price` - Sort/filter theo giá

#### Orders Table
- `idx_orders_customer_id` - Join với customers
- `idx_orders_status` - Filter theo status
- `idx_orders_delivery_status` - Filter theo delivery status
- `idx_orders_created_at` - Sort theo ngày (DESC và ASC)
- `idx_orders_order_number` - Lookup theo order number
- `idx_orders_tracking_number` - Lookup theo tracking
- `idx_orders_sales_channel` - Filter theo sales channel
- `idx_orders_seller_id` - Filter theo seller
- `idx_orders_branch_id` - Filter theo branch
- `idx_orders_status_created` - Composite index cho common query

#### Composite Indexes
- `idx_orders_date_status` - Filter theo date và status
- `idx_products_category_active` - Filter category + active
- `idx_orders_customer_status` - Filter customer + status

### 2. Materialized Views

#### mv_daily_sales
Tổng hợp doanh số theo ngày:
```sql
SELECT * FROM mv_daily_sales 
WHERE sale_date BETWEEN '2024-01-01' AND '2024-01-31';
```

#### mv_product_sales
Thống kê bán hàng theo sản phẩm:
```sql
SELECT * FROM mv_product_sales 
ORDER BY total_quantity_sold DESC 
LIMIT 10;
```

#### mv_customer_summary
Tổng hợp thông tin khách hàng:
```sql
SELECT * FROM mv_customer_summary 
ORDER BY total_spent DESC;
```

### 3. Connection Pooling

Đã tối ưu connection pool:
- **Max connections**: 50 (có thể config qua `DB_POOL_MAX`)
- **Min connections**: 5 (có thể config qua `DB_POOL_MIN`)
- **Connection timeout**: 5s
- **Statement timeout**: 30s
- **Query timeout**: 30s

### 4. Table Settings

- **Fillfactor**: 90% cho các bảng có nhiều updates
- **Autovacuum**: Tối ưu cho orders và order_items

## Cách sử dụng

### Chạy tối ưu hóa database

```bash
cd backend
npm run optimize-db
```

Script này sẽ:
1. Tạo tất cả indexes cần thiết
2. Cập nhật statistics
3. Tạo materialized views
4. Tối ưu table settings
5. Chạy VACUUM và ANALYZE

### Refresh Materialized Views

Materialized views cần được refresh định kỳ để cập nhật dữ liệu:

```bash
npm run refresh-views
```

**Khuyến nghị**: Chạy hàng ngày vào lúc 2-3 giờ sáng (khi traffic thấp)

#### Cấu hình Cron Job

Thêm vào crontab:
```bash
# Refresh materialized views hàng ngày lúc 2:30 AM
30 2 * * * cd /path/to/backend && npm run refresh-views
```

Hoặc sử dụng pg_cron extension (nếu có):
```sql
SELECT cron.schedule('refresh-views', '30 2 * * *', 
  'SELECT refresh_materialized_views();');
```

## Best Practices

### 1. Query Optimization

#### ✅ Sử dụng SELECT cụ thể
```sql
-- Tốt
SELECT id, name, price FROM products;

-- Xấu
SELECT * FROM products;
```

#### ✅ Sử dụng EXISTS thay vì COUNT
```sql
-- Tốt
SELECT * FROM products p
WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);

-- Xấu
SELECT * FROM products p
WHERE (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) > 0;
```

#### ✅ Sử dụng LIMIT cho pagination
```sql
SELECT * FROM orders
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

#### ✅ Sử dụng Indexes trong WHERE clause
```sql
-- Tốt - sử dụng index
SELECT * FROM orders WHERE status = 'completed' AND created_at >= '2024-01-01';

-- Xấu - không sử dụng index
SELECT * FROM orders WHERE LOWER(status) = 'completed';
```

### 2. Transaction Management

Luôn sử dụng transactions cho các operations phức tạp:
```javascript
const client = await db.pool.connect();
try {
  await client.query('BEGIN');
  // ... operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### 3. Batch Operations

Sử dụng batch inserts thay vì multiple single inserts:
```javascript
// Tốt - Batch insert
await db.pool.query(`
  INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
  VALUES ($1, $2, $3, $4, $5), ($1, $6, $7, $8, $9)
`, [orderId, ...items]);

// Xấu - Multiple inserts
for (const item of items) {
  await db.pool.query('INSERT INTO order_items ...', [orderId, ...item]);
}
```

## Monitoring

### Kiểm tra query performance

```sql
-- Xem queries chậm nhất
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Kiểm tra index usage

```sql
-- Xem indexes không được sử dụng
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

### Kiểm tra table size

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Performance Tuning

### PostgreSQL Configuration

Thêm vào `postgresql.conf`:

```ini
# Memory settings
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 50-75% of RAM
work_mem = 16MB                 # Per operation
maintenance_work_mem = 128MB

# Query planner
random_page_cost = 1.1          # For SSD
effective_io_concurrency = 200  # For SSD

# Connections
max_connections = 100
```

### Monitoring Tools

1. **pg_stat_statements** - Track slow queries
2. **pgAdmin** - GUI tool để monitor
3. **EXPLAIN ANALYZE** - Analyze query plans

## Troubleshooting

### Query chậm

1. Chạy `EXPLAIN ANALYZE` để xem query plan
2. Kiểm tra indexes có được sử dụng không
3. Kiểm tra statistics có cũ không: `ANALYZE table_name;`

### Connection pool exhausted

1. Tăng `max` connections trong pool config
2. Kiểm tra có connection leaks không
3. Giảm `idleTimeoutMillis` để release connections sớm hơn

### Materialized views không cập nhật

1. Chạy `npm run refresh-views` thủ công
2. Kiểm tra cron job có chạy không
3. Xem logs để tìm lỗi

## Kế hoạch tương lai

- [ ] Implement Redis cache cho hot queries
- [ ] Table partitioning cho orders (nếu > 10M rows)
- [ ] Read replicas cho reporting queries
- [ ] Archive old data vào separate tables
- [ ] Implement query result caching

## Tài liệu tham khảo

- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)

