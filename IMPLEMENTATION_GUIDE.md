# Hướng dẫn Triển khai Tính năng KiotViet

## 🚀 Các bước triển khai

### Bước 1: Cập nhật Database Schema

Database sẽ tự động tạo các bảng mới khi backend khởi động. Không cần migration thủ công.

```bash
cd backend
npm run dev
```

### Bước 2: Kiểm tra API mới

#### Purchase Orders (Đơn đặt hàng)
```bash
# Tạo đơn đặt hàng
POST /api/purchase-orders
{
  "supplier_id": 1,
  "items": [
    { "product_id": 1, "quantity": 10, "unit_price": 100000 }
  ],
  "expected_date": "2024-12-31"
}

# Nhận hàng
POST /api/purchase-orders/1/receive
{
  "received_items": [
    { "product_id": 1, "quantity": 10, "unit_price": 100000 }
  ]
}
```

#### Stock Management (Quản lý kho)
```bash
# Nhập kho
POST /api/stock/stock-in
{
  "type": "purchase",
  "supplier_id": 1,
  "items": [
    { "product_id": 1, "quantity": 10, "unit_price": 100000 }
  ]
}

# Xuất kho
POST /api/stock/stock-out
{
  "type": "sale",
  "order_id": 1,
  "items": [
    { "product_id": 1, "quantity": 5, "unit_price": 150000 }
  ]
}

# Kiểm kê kho
POST /api/stock/stocktaking
{
  "warehouse_location": "Kho chính",
  "items": [
    { "product_id": 1, "counted_quantity": 100 }
  ]
}
```

#### Debt Management (Công nợ)
```bash
# Xem công nợ khách hàng
GET /api/debt/customers

# Thanh toán công nợ
POST /api/debt/customers/1/pay
{
  "amount": 500000,
  "payment_method": "cash"
}
```

#### Customer Groups
```bash
# Tạo nhóm khách hàng
POST /api/customer-groups
{
  "name": "VIP",
  "discount_percentage": 10
}
```

#### Price Policies
```bash
# Tạo chính sách giá
POST /api/price-policies
{
  "name": "Giá VIP",
  "customer_group_id": 1,
  "product_id": 1,
  "price": 90000,
  "min_quantity": 1
}
```

## 📋 Workflow Chi tiết

### 1. Đặt hàng từ Nhà cung cấp

```
1. Tạo Purchase Order
   → Status: pending
   → Tạo công nợ nhà cung cấp

2. Xác nhận đơn
   → Status: confirmed

3. Nhận hàng
   → POST /api/purchase-orders/:id/receive
   → Tạo Stock In tự động
   → Cập nhật tồn kho
   → Status: received/partial
```

### 2. Bán hàng trả chậm

```
1. Tạo Order với payment_method = 'credit'
   → Tự động tạo công nợ khách hàng
   → Cập nhật debt_amount

2. Khách hàng thanh toán
   → POST /api/debt/customers/:id/pay
   → Giảm debt_amount
```

### 3. Kiểm kê kho

```
1. Tạo Stocktaking
   → Status: draft
   → Nhập số lượng thực tế

2. Hoàn thành kiểm kê
   → POST /api/stock/stocktaking/:id/complete
   → Tự động điều chỉnh kho
   → Status: completed
```

## 🔧 Cấu hình

### Payment Methods
Thêm vào bảng `payment_methods`:
- cash (Tiền mặt)
- bank_transfer (Chuyển khoản)
- credit (Trả chậm)
- card (Thẻ)

### Order Status
- pending (Chờ xử lý)
- processing (Đang xử lý)
- completed (Hoàn thành)
- cancelled (Đã hủy)

### Purchase Order Status
- pending (Chờ xác nhận)
- confirmed (Đã xác nhận)
- partial (Nhận một phần)
- received (Đã nhận đủ)
- cancelled (Đã hủy)

## 📊 Báo cáo mới

### Công nợ
- Tổng công nợ khách hàng
- Tổng công nợ nhà cung cấp
- Top khách hàng nợ nhiều
- Lịch sử thanh toán

### Tồn kho
- Lịch sử nhập/xuất kho
- Báo cáo kiểm kê
- Chênh lệch tồn kho

### Đặt hàng
- Đơn đặt hàng theo nhà cung cấp
- Tỷ lệ nhận hàng đúng hạn
- Chi phí đặt hàng

## 🎯 Next Steps

1. **Frontend Pages**: Tạo UI cho các tính năng mới
2. **Reports**: Bổ sung báo cáo công nợ, tồn kho
3. **Notifications**: Cảnh báo công nợ quá hạn
4. **Printing**: In phiếu nhập/xuất kho, hóa đơn

