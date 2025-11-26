# Tính năng KiotViet đã bổ sung

## 📋 Tổng quan

Đã phân tích và bổ sung các tính năng quan trọng từ KiotViet vào hệ thống quản lý bán hàng.

## ✅ Tính năng đã bổ sung

### 1. Đơn đặt hàng từ Nhà cung cấp (Purchase Orders) ✅

**Database:**
- `purchase_orders` - Đơn đặt hàng
- `purchase_order_items` - Chi tiết đơn đặt hàng

**Tính năng:**
- ✅ Tạo đơn đặt hàng từ nhà cung cấp
- ✅ Theo dõi trạng thái: pending, confirmed, partial, received, cancelled
- ✅ Nhận hàng từ đơn đặt (receive purchase order)
- ✅ Tự động tạo Stock In khi nhận hàng
- ✅ Tự động cập nhật công nợ nhà cung cấp
- ✅ Lịch sử đơn đặt hàng

**API Endpoints:**
- `GET /api/purchase-orders` - Danh sách đơn đặt hàng
- `GET /api/purchase-orders/:id` - Chi tiết đơn đặt hàng
- `POST /api/purchase-orders` - Tạo đơn đặt hàng
- `POST /api/purchase-orders/:id/receive` - Nhận hàng từ đơn đặt
- `PATCH /api/purchase-orders/:id/status` - Cập nhật trạng thái

### 2. Quản lý Kho Nâng cao ✅

#### Stock In (Nhập kho)
**Database:**
- `stock_ins` - Phiếu nhập kho
- `stock_in_items` - Chi tiết nhập kho

**Tính năng:**
- ✅ Nhập kho từ mua hàng
- ✅ Nhập kho từ trả hàng
- ✅ Nhập kho điều chỉnh
- ✅ Nhập kho từ chuyển kho
- ✅ Quản lý batch number và expiry date
- ✅ Tự động cập nhật tồn kho
- ✅ Lịch sử nhập kho

#### Stock Out (Xuất kho)
**Database:**
- `stock_outs` - Phiếu xuất kho
- `stock_out_items` - Chi tiết xuất kho

**Tính năng:**
- ✅ Xuất kho bán hàng
- ✅ Xuất kho trả hàng
- ✅ Xuất kho hỏng hóc
- ✅ Xuất kho chuyển kho
- ✅ Kiểm tra tồn kho trước khi xuất
- ✅ Tự động cập nhật tồn kho
- ✅ Lịch sử xuất kho

#### Stocktaking (Kiểm kê kho)
**Database:**
- `stocktakings` - Phiếu kiểm kê
- `stocktaking_items` - Chi tiết kiểm kê

**Tính năng:**
- ✅ Tạo phiếu kiểm kê
- ✅ So sánh số lượng hệ thống vs thực tế
- ✅ Tính toán chênh lệch
- ✅ Hoàn thành kiểm kê và tự động điều chỉnh kho
- ✅ Lịch sử kiểm kê

**API Endpoints:**
- `POST /api/stock/stock-in` - Tạo phiếu nhập kho
- `POST /api/stock/stock-out` - Tạo phiếu xuất kho
- `POST /api/stock/stocktaking` - Tạo phiếu kiểm kê
- `POST /api/stock/stocktaking/:id/complete` - Hoàn thành kiểm kê
- `GET /api/stock/stock-ins` - Danh sách nhập kho
- `GET /api/stock/stock-outs` - Danh sách xuất kho
- `GET /api/stock/stocktakings` - Danh sách kiểm kê

### 3. Quản lý Công nợ (Debt Management) ✅

**Database:**
- `debt_transactions` - Giao dịch công nợ

**Tính năng:**
- ✅ Công nợ khách hàng
- ✅ Công nợ nhà cung cấp
- ✅ Tự động tạo công nợ khi bán hàng trả chậm
- ✅ Tự động tạo công nợ khi đặt hàng từ nhà cung cấp
- ✅ Thanh toán công nợ
- ✅ Lịch sử công nợ
- ✅ Báo cáo công nợ

**API Endpoints:**
- `GET /api/debt/customers` - Danh sách công nợ khách hàng
- `GET /api/debt/suppliers` - Danh sách công nợ nhà cung cấp
- `POST /api/debt/customers/:id/pay` - Thanh toán công nợ khách hàng
- `POST /api/debt/suppliers/:id/pay` - Thanh toán công nợ nhà cung cấp
- `GET /api/debt/history` - Lịch sử công nợ

### 4. Phân loại Khách hàng (Customer Groups) ✅

**Database:**
- `customer_groups` - Nhóm khách hàng

**Tính năng:**
- ✅ Tạo nhóm khách hàng (VIP, Thường, Doanh nghiệp)
- ✅ Gán khách hàng vào nhóm
- ✅ Giảm giá theo nhóm
- ✅ Xem danh sách khách hàng theo nhóm
- ✅ Thống kê theo nhóm

**API Endpoints:**
- `GET /api/customer-groups` - Danh sách nhóm khách hàng
- `GET /api/customer-groups/:id` - Chi tiết nhóm
- `POST /api/customer-groups` - Tạo nhóm
- `PUT /api/customer-groups/:id` - Cập nhật nhóm
- `DELETE /api/customer-groups/:id` - Xóa nhóm

### 5. Chính sách Giá (Price Policies) ✅

**Database:**
- `price_policies` - Chính sách giá

**Tính năng:**
- ✅ Giá theo nhóm khách hàng
- ✅ Giá theo số lượng (volume pricing)
- ✅ Giá theo thời gian (start_date, end_date)
- ✅ Tự động tính giá khi tạo đơn hàng
- ✅ Ưu tiên chính sách giá cao hơn

**API Endpoints:**
- `GET /api/price-policies` - Danh sách chính sách giá
- `GET /api/price-policies/price` - Lấy giá cho khách hàng và sản phẩm
- `POST /api/price-policies` - Tạo chính sách giá
- `PUT /api/price-policies/:id` - Cập nhật chính sách giá
- `DELETE /api/price-policies/:id` - Xóa chính sách giá

### 6. Cập nhật Orders ✅

**Tính năng mới:**
- ✅ Hỗ trợ thanh toán trả chậm (credit)
- ✅ Tự động tạo công nợ khi thanh toán credit
- ✅ Cập nhật thống kê khách hàng (total_purchases, total_orders)

### 7. Cập nhật Customers ✅

**Tính năng mới:**
- ✅ Phân loại khách hàng (group_id)
- ✅ Công nợ khách hàng (debt_amount)
- ✅ Hạn mức tín dụng (credit_limit)
- ✅ Thống kê mua hàng (total_purchases, total_orders)
- ✅ Tags cho khách hàng

## 🔄 Workflow

### Workflow Đặt hàng từ Nhà cung cấp:
1. Tạo Purchase Order → Trạng thái: pending
2. Xác nhận đơn → Trạng thái: confirmed
3. Nhận hàng → Tạo Stock In → Cập nhật tồn kho → Trạng thái: received/partial
4. Tự động tạo công nợ nhà cung cấp

### Workflow Bán hàng trả chậm:
1. Tạo Order với payment_method = 'credit'
2. Tự động tạo công nợ khách hàng
3. Cập nhật debt_amount của khách hàng
4. Thanh toán công nợ → Giảm debt_amount

### Workflow Kiểm kê kho:
1. Tạo Stocktaking → Trạng thái: draft
2. Đếm hàng thực tế → Nhập counted_quantity
3. Hệ thống tính difference (chênh lệch)
4. Hoàn thành kiểm kê → Tự động điều chỉnh kho → Trạng thái: completed

## 📊 Database Schema Mới

### Tables mới:
1. `purchase_orders` - Đơn đặt hàng
2. `purchase_order_items` - Chi tiết đơn đặt
3. `stock_ins` - Phiếu nhập kho
4. `stock_in_items` - Chi tiết nhập kho
5. `stock_outs` - Phiếu xuất kho
6. `stock_out_items` - Chi tiết xuất kho
7. `stocktakings` - Phiếu kiểm kê
8. `stocktaking_items` - Chi tiết kiểm kê
9. `stock_transfers` - Chuyển kho (chuẩn bị)
10. `stock_transfer_items` - Chi tiết chuyển kho (chuẩn bị)
11. `debt_transactions` - Giao dịch công nợ
12. `customer_groups` - Nhóm khách hàng
13. `price_policies` - Chính sách giá
14. `product_variants` - Biến thể sản phẩm (chuẩn bị)
15. `product_combos` - Combo sản phẩm (chuẩn bị)
16. `product_combo_items` - Chi tiết combo (chuẩn bị)
17. `product_serials` - Serial number (chuẩn bị)

### Columns mới:
- `customers`: group_id, debt_amount, credit_limit, total_purchases, total_orders, tags
- `orders`: Hỗ trợ payment_method = 'credit'

## 🎯 Tính năng sắp tới

### Phase 2:
- [ ] Stock Transfers (Chuyển kho)
- [ ] Product Variants (Biến thể sản phẩm)
- [ ] Product Combos (Combo sản phẩm)
- [ ] Serial Numbers / IMEI
- [ ] In hóa đơn, phiếu
- [ ] Barcode scanning
- [ ] Multi-warehouse support

## 📝 Lưu ý

1. **Migration**: Chạy lại backend để tự động tạo các bảng mới
2. **Công nợ**: Tự động tạo khi:
   - Tạo order với payment_method = 'credit'
   - Tạo purchase_order
3. **Tồn kho**: Tự động cập nhật khi:
   - Nhập kho (stock in)
   - Xuất kho (stock out)
   - Kiểm kê (stocktaking)
   - Nhận hàng từ purchase order

## 🚀 Sử dụng

### Tạo đơn đặt hàng:
```javascript
POST /api/purchase-orders
{
  "supplier_id": 1,
  "items": [
    { "product_id": 1, "quantity": 10, "unit_price": 100000 }
  ],
  "expected_date": "2024-12-31",
  "notes": "Giao hàng sớm"
}
```

### Nhận hàng:
```javascript
POST /api/purchase-orders/1/receive
{
  "received_items": [
    { "product_id": 1, "quantity": 10, "unit_price": 100000, "batch_number": "BATCH001" }
  ]
}
```

### Thanh toán công nợ:
```javascript
POST /api/debt/customers/1/pay
{
  "amount": 500000,
  "payment_method": "cash",
  "notes": "Thanh toán công nợ"
}
```

