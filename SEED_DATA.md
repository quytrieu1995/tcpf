# Hướng dẫn tạo dữ liệu test

## Cách chạy

### 1. Cài đặt dependencies (nếu chưa có)
```bash
cd backend
npm install
```

### 2. Chạy script tạo dữ liệu test
```bash
npm run seed
```

Hoặc:
```bash
node scripts/seed-test-data.js
```

## Dữ liệu sẽ được tạo

### Users (4 users)
- **admin** / admin123 (Quản trị viên)
- **manager** / manager123 (Quản lý)
- **staff1** / staff123 (Nhân viên)
- **staff2** / staff123 (Nhân viên)

### Categories (5 categories)
- Điện tử
- Thời trang
- Thực phẩm
- Gia dụng
- Sách

### Suppliers (3 suppliers)
- Công ty Điện tử ABC
- Thời trang XYZ
- Thực phẩm Fresh

### Products (10 products)
- iPhone 15 Pro - 25,000,000₫
- Samsung Galaxy S24 - 20,000,000₫
- Áo thun nam - 200,000₫
- Quần jean - 500,000₫
- Bánh mì - 15,000₫
- Nước ngọt - 10,000₫
- Bàn ăn - 2,000,000₫
- Ghế sofa - 5,000,000₫
- Sách lập trình - 150,000₫
- Từ điển Anh-Việt - 80,000₫

### Customers (5 customers)
- Nguyễn Văn Khách
- Trần Thị Mua
- Lê Văn Hàng
- Phạm Thị Đơn
- Hoàng Văn VIP

### Shipping Methods (5 methods)
- Giao Hàng Nhanh (GHN) - 30,000₫
- Viettel Post - 25,000₫
- Giao Hàng Tiết Kiệm - 20,000₫
- J&T Express - 28,000₫
- Vận chuyển thủ công - 15,000₫

### Orders (20 orders)
- Các trạng thái: pending, processing, completed
- Các phương thức thanh toán: cash, bank_transfer, credit, card
- Tạo trong 30 ngày qua

### Shipments (10 shipments)
- Tạo cho các orders đã completed/processing
- Các trạng thái: pending, in_transit, delivered

### Promotions (3 promotions)
- Giảm 10% (đơn trên 100k)
- Giảm 50k (đơn trên 200k)
- Giảm 20% đơn trên 500k (tối đa 200k)

### Purchase Orders (5 orders)
- Các trạng thái: pending, confirmed, received
- Liên kết với suppliers

### Inventory Transactions (10 transactions)
- Các loại: in, out, adjustment

## Lưu ý

- Script sẽ kiểm tra và không tạo trùng dữ liệu
- Có thể chạy nhiều lần an toàn
- Dữ liệu được tạo ngẫu nhiên nhưng hợp lý
- Mật khẩu mặc định cho tất cả users là: `admin123`, `manager123`, `staff123`

## Xóa dữ liệu test

Nếu muốn xóa dữ liệu test, có thể chạy SQL:
```sql
-- Xóa tất cả dữ liệu (cẩn thận!)
TRUNCATE TABLE order_items, orders, shipments, purchase_order_items, purchase_orders, inventory_transactions, stock_ins, stock_outs CASCADE;
DELETE FROM products WHERE sku LIKE 'IP%' OR sku LIKE 'SG%' OR sku LIKE 'AT%' OR sku LIKE 'QJ%' OR sku LIKE 'BM%' OR sku LIKE 'NN%' OR sku LIKE 'BA%' OR sku LIKE 'GS%' OR sku LIKE 'SL%' OR sku LIKE 'TD%';
DELETE FROM customers WHERE email LIKE '%@test.com';
DELETE FROM suppliers WHERE email LIKE '%@supplier.com';
DELETE FROM users WHERE username IN ('manager', 'staff1', 'staff2');
DELETE FROM categories WHERE name IN ('Điện tử', 'Thời trang', 'Thực phẩm', 'Gia dụng', 'Sách');
DELETE FROM shipping_methods WHERE name LIKE '%GHN%' OR name LIKE '%Viettel%' OR name LIKE '%GHTK%' OR name LIKE '%J&T%' OR name LIKE '%thủ công%';
DELETE FROM promotions WHERE name LIKE 'Giảm%';
```

