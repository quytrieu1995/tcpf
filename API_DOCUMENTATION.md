# API Documentation

## Base URL

```
Production: https://sale.thuanchay.vn/api
Development: http://localhost:5000/api
```

## Authentication

Tất cả các API endpoints (trừ `/auth/login`) đều yêu cầu authentication token.

### Authentication Methods

Hệ thống hỗ trợ 2 phương thức xác thực:

1. **JWT Token** (cho web app users)
   - Lấy từ endpoint `/auth/login`
   - Format: JWT token

2. **API Token** (cho external applications)
   - Tạo từ Settings > API Tokens trong web app
   - Format: `tcpf_xxxxxxxxxxxxx` (64 ký tự hex sau prefix)

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Ví dụ với JWT Token:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ví dụ với API Token:**
```
Authorization: Bearer tcpf_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3
```

### API Token Permissions

Khi tạo API token, bạn có thể chỉ định các quyền (permissions):

- `products:read` - Đọc sản phẩm
- `products:write` - Tạo/cập nhật/xóa sản phẩm
- `orders:read` - Đọc đơn hàng
- `orders:write` - Tạo/cập nhật đơn hàng
- `customers:read` - Đọc khách hàng
- `customers:write` - Tạo/cập nhật khách hàng
- `shipments:read` - Đọc vận đơn
- `shipments:write` - Tạo/cập nhật vận đơn
- `reports:read` - Đọc báo cáo

**Lưu ý:** API tokens có thể được vô hiệu hóa hoặc hết hạn. Kiểm tra trạng thái token trong Settings > API Tokens.

---

## 1. Products API (Sản phẩm)

### 1.1. GET /products

Lấy danh sách sản phẩm với phân trang và tìm kiếm.

**Request:**
```
GET /api/products?page=1&limit=10&search=keyword&category=category_name
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 10): Số lượng sản phẩm mỗi trang
- `search` (optional): Tìm kiếm theo tên hoặc mô tả
- `category` (optional): Lọc theo category hoặc category_id

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Sản phẩm A",
      "description": "Mô tả sản phẩm",
      "price": 100000,
      "stock": 50,
      "category": "Danh mục 1",
      "category_id": 1,
      "image_url": "/uploads/images/product.jpg",
      "images": ["/uploads/images/product1.jpg", "/uploads/images/product2.jpg"],
      "sku": "SKU001",
      "barcode": "1234567890123",
      "cost_price": 80000,
      "weight": 0.5,
      "supplier_id": 1,
      "low_stock_threshold": 10,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error
- `503`: Database connection unavailable

---

### 1.2. GET /products/:id

Lấy thông tin chi tiết một sản phẩm.

**Request:**
```
GET /api/products/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Sản phẩm A",
  "description": "Mô tả sản phẩm",
  "price": 100000,
  "stock": 50,
  "category": "Danh mục 1",
  "category_id": 1,
  "image_url": "/uploads/images/product.jpg",
  "images": ["/uploads/images/product1.jpg", "/uploads/images/product2.jpg"],
  "sku": "SKU001",
  "barcode": "1234567890123",
  "cost_price": 80000,
  "weight": 0.5,
  "supplier_id": 1,
  "low_stock_threshold": 10,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Product not found
- `500`: Server error

---

### 1.3. POST /products

Tạo sản phẩm mới.

**Request:**
```
POST /api/products
```

**Request Body:**
```json
{
  "name": "Sản phẩm mới",
  "description": "Mô tả sản phẩm mới",
  "price": 150000,
  "stock": 100,
  "category": "Danh mục 1",
  "category_id": 1,
  "image_url": "/uploads/images/new-product.jpg",
  "images": ["/uploads/images/new-product1.jpg", "/uploads/images/new-product2.jpg"],
  "sku": "SKU002",
  "barcode": "1234567890124",
  "cost_price": 120000,
  "weight": 0.8,
  "supplier_id": 1,
  "low_stock_threshold": 10
}
```

**Required Fields:**
- `name` (string): Tên sản phẩm
- `price` (number): Giá bán (phải >= 0)

**Optional Fields:**
- `description` (string): Mô tả sản phẩm
- `stock` (integer): Số lượng tồn kho (default: 0)
- `category` (string): Tên danh mục
- `category_id` (integer): ID danh mục
- `image_url` (string): URL ảnh chính
- `images` (array): Mảng các URL ảnh
- `sku` (string): Mã SKU
- `barcode` (string): Mã vạch
- `cost_price` (number): Giá vốn
- `weight` (number): Trọng lượng
- `supplier_id` (integer): ID nhà cung cấp
- `low_stock_threshold` (integer): Ngưỡng cảnh báo tồn kho thấp (default: 10)

**Response:**
```json
{
  "id": 2,
  "name": "Sản phẩm mới",
  "description": "Mô tả sản phẩm mới",
  "price": 150000,
  "stock": 100,
  "category": "Danh mục 1",
  "category_id": 1,
  "image_url": "/uploads/images/new-product.jpg",
  "images": ["/uploads/images/new-product1.jpg", "/uploads/images/new-product2.jpg"],
  "sku": "SKU002",
  "barcode": "1234567890124",
  "cost_price": 120000,
  "weight": 0.8,
  "supplier_id": 1,
  "low_stock_threshold": 10,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201`: Created successfully
- `400`: Bad request (validation error, duplicate SKU/barcode, invalid category/supplier ID)
- `401`: Unauthorized
- `500`: Server error
- `503`: Database connection unavailable

**Error Response:**
```json
{
  "message": "Name and price are required"
}
```

hoặc

```json
{
  "errors": [
    {
      "msg": "Price must be a positive number",
      "param": "price",
      "location": "body"
    }
  ]
}
```

---

## 2. Orders API (Hóa đơn/Đơn hàng)

### 2.1. GET /orders

Lấy danh sách đơn hàng với phân trang và lọc.

**Request:**
```
GET /api/orders?page=1&limit=10&status=pending&delivery_status=shipped&start_date=2024-01-01&end_date=2024-12-31&search=keyword
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 10): Số lượng đơn hàng mỗi trang
- `status` (optional): Lọc theo trạng thái đơn hàng (pending, confirmed, processing, shipped, delivered, cancelled, returned)
- `delivery_status` (optional): Lọc theo trạng thái giao hàng
- `start_date` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `end_date` (optional): Ngày kết thúc (YYYY-MM-DD)
- `search` (optional): Tìm kiếm theo mã đơn, tracking number, return code, reconciliation code, tên/email/phone khách hàng
- `return_code` (optional): Lọc theo mã trả hàng
- `reconciliation_code` (optional): Lọc theo mã đối soát
- `tracking_number` (optional): Lọc theo mã vận đơn

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "order_number": "ORD-2024-001",
      "customer_id": 1,
      "customer_name": "Nguyễn Văn A",
      "customer_code": "CUS001",
      "customer_email": "customer@example.com",
      "customer_phone": "0123456789",
      "customer_address": "123 Đường ABC",
      "seller_id": 1,
      "seller_name": "Nguyễn Văn Bán",
      "created_by": 1,
      "creator_name": "Admin",
      "branch_id": 1,
      "branch_code": "BR001",
      "branch_name": "Chi nhánh 1",
      "status": "confirmed",
      "delivery_status": "shipped",
      "payment_status": "paid",
      "payment_method": "cash",
      "total_amount": 500000,
      "discount_amount": 50000,
      "shipping_fee": 30000,
      "final_amount": 480000,
      "shipping_method_id": 1,
      "shipping_method_name": "Giao hàng nhanh",
      "shipping_address": "123 Đường ABC",
      "shipping_phone": "0123456789",
      "tracking_number": "VN123456789",
      "return_code": null,
      "reconciliation_code": null,
      "notes": "Giao hàng trong giờ hành chính",
      "sales_channel": "online",
      "total_quantity": 5,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 2.2. GET /orders/:id

Lấy thông tin chi tiết một đơn hàng kèm danh sách sản phẩm.

**Request:**
```
GET /api/orders/1
```

**Response:**
```json
{
  "id": 1,
  "order_number": "ORD-2024-001",
  "customer_id": 1,
  "customer_name": "Nguyễn Văn A",
  "customer_code": "CUS001",
  "customer_email": "customer@example.com",
  "customer_phone": "0123456789",
  "customer_address": "123 Đường ABC",
  "seller_id": 1,
  "seller_name": "Nguyễn Văn Bán",
  "created_by": 1,
  "creator_name": "Admin",
  "branch_id": 1,
  "branch_code": "BR001",
  "branch_name": "Chi nhánh 1",
  "status": "confirmed",
  "delivery_status": "shipped",
  "payment_status": "paid",
  "payment_method": "cash",
  "total_amount": 500000,
  "discount_amount": 50000,
  "shipping_fee": 30000,
  "final_amount": 480000,
  "shipping_method_id": 1,
  "shipping_method_name": "Giao hàng nhanh",
  "shipping_address": "123 Đường ABC",
  "shipping_phone": "0123456789",
  "tracking_number": "VN123456789",
  "return_code": null,
  "reconciliation_code": null,
  "notes": "Giao hàng trong giờ hành chính",
  "sales_channel": "online",
  "items": [
    {
      "id": 1,
      "order_id": 1,
      "product_id": 1,
      "product_name": "Sản phẩm A",
      "product_image": "/uploads/images/product.jpg",
      "quantity": 2,
      "price": 100000,
      "subtotal": 200000
    },
    {
      "id": 2,
      "order_id": 1,
      "product_id": 2,
      "product_name": "Sản phẩm B",
      "product_image": "/uploads/images/product2.jpg",
      "quantity": 3,
      "price": 100000,
      "subtotal": 300000
    }
  ],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Order not found
- `500`: Server error

---

### 2.3. POST /orders

Tạo đơn hàng mới.

**Request:**
```
POST /api/orders
```

**Request Body:**
```json
{
  "customer_id": 1,
  "seller_id": 1,
  "branch_id": 1,
  "status": "pending",
  "payment_status": "unpaid",
  "payment_method": "cash",
  "total_amount": 500000,
  "discount_amount": 50000,
  "shipping_fee": 30000,
  "final_amount": 480000,
  "shipping_method_id": 1,
  "shipping_address": "123 Đường ABC",
  "shipping_phone": "0123456789",
  "notes": "Giao hàng trong giờ hành chính",
  "sales_channel": "online",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 100000
    },
    {
      "product_id": 2,
      "quantity": 3,
      "price": 100000
    }
  ]
}
```

**Required Fields:**
- `items` (array): Danh sách sản phẩm trong đơn hàng
  - `product_id` (integer): ID sản phẩm
  - `quantity` (integer): Số lượng
  - `price` (number): Giá bán

**Optional Fields:**
- `customer_id` (integer): ID khách hàng (null nếu khách lẻ)
- `seller_id` (integer): ID người bán
- `branch_id` (integer): ID chi nhánh
- `status` (string): Trạng thái đơn hàng (default: "pending")
- `payment_status` (string): Trạng thái thanh toán (default: "unpaid")
- `payment_method` (string): Phương thức thanh toán
- `total_amount` (number): Tổng tiền
- `discount_amount` (number): Số tiền giảm giá (default: 0)
- `shipping_fee` (number): Phí vận chuyển (default: 0)
- `final_amount` (number): Tổng tiền cuối cùng
- `shipping_method_id` (integer): ID phương thức vận chuyển
- `shipping_address` (string): Địa chỉ giao hàng
- `shipping_phone` (string): Số điện thoại giao hàng
- `notes` (string): Ghi chú
- `sales_channel` (string): Kênh bán hàng

**Response:**
```json
{
  "id": 1,
  "order_number": "ORD-2024-001",
  "customer_id": 1,
  "seller_id": 1,
  "branch_id": 1,
  "status": "pending",
  "payment_status": "unpaid",
  "payment_method": "cash",
  "total_amount": 500000,
  "discount_amount": 50000,
  "shipping_fee": 30000,
  "final_amount": 480000,
  "shipping_method_id": 1,
  "shipping_address": "123 Đường ABC",
  "shipping_phone": "0123456789",
  "notes": "Giao hàng trong giờ hành chính",
  "sales_channel": "online",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201`: Created successfully
- `400`: Bad request (validation error, insufficient stock, invalid product/customer/seller/branch ID)
- `401`: Unauthorized
- `500`: Server error

**Error Response:**
```json
{
  "message": "Items are required"
}
```

hoặc

```json
{
  "message": "Insufficient stock for product: Sản phẩm A"
}
```

---

## 3. Customers API (Khách hàng)

### 3.1. GET /customers

Lấy danh sách khách hàng với phân trang và tìm kiếm.

**Request:**
```
GET /api/customers?page=1&limit=10&search=keyword
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 10): Số lượng khách hàng mỗi trang
- `search` (optional): Tìm kiếm theo tên, email hoặc số điện thoại

**Response:**
```json
{
  "customers": [
    {
      "id": 1,
      "code": "CUS001",
      "name": "Nguyễn Văn A",
      "email": "customer@example.com",
      "phone": "0123456789",
      "address": "123 Đường ABC",
      "group_id": 1,
      "group_name": "Khách hàng VIP",
      "group_discount": 10,
      "credit_limit": 1000000,
      "tags": ["VIP", "Thân thiết"],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 3.2. GET /customers/:id

Lấy thông tin chi tiết một khách hàng.

**Request:**
```
GET /api/customers/1
```

**Response:**
```json
{
  "id": 1,
  "code": "CUS001",
  "name": "Nguyễn Văn A",
  "email": "customer@example.com",
  "phone": "0123456789",
  "address": "123 Đường ABC",
  "group_id": 1,
  "credit_limit": 1000000,
  "tags": ["VIP", "Thân thiết"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Customer not found
- `500`: Server error

---

### 3.3. GET /customers/:id/orders

Lấy danh sách đơn hàng của một khách hàng.

**Request:**
```
GET /api/customers/1/orders
```

**Response:**
```json
[
  {
    "id": 1,
    "order_number": "ORD-2024-001",
    "status": "confirmed",
    "total_amount": 500000,
    "final_amount": 480000,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 3.4. POST /customers

Tạo khách hàng mới.

**Request:**
```
POST /api/customers
```

**Request Body:**
```json
{
  "name": "Nguyễn Văn A",
  "email": "customer@example.com",
  "phone": "0123456789",
  "address": "123 Đường ABC",
  "group_id": 1,
  "credit_limit": 1000000,
  "tags": ["VIP", "Thân thiết"]
}
```

**Required Fields:**
- `name` (string): Tên khách hàng

**Optional Fields:**
- `email` (string): Email (phải là email hợp lệ nếu có)
- `phone` (string): Số điện thoại
- `address` (string): Địa chỉ
- `group_id` (integer): ID nhóm khách hàng
- `credit_limit` (number): Hạn mức tín dụng (default: 0)
- `tags` (array): Mảng các tag

**Response:**
```json
{
  "id": 1,
  "code": "CUS001",
  "name": "Nguyễn Văn A",
  "email": "customer@example.com",
  "phone": "0123456789",
  "address": "123 Đường ABC",
  "group_id": 1,
  "credit_limit": 1000000,
  "tags": ["VIP", "Thân thiết"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201`: Created successfully
- `400`: Bad request (validation error, duplicate email/phone)
- `401`: Unauthorized
- `500`: Server error
- `503`: Database connection unavailable

**Error Response:**
```json
{
  "errors": [
    {
      "msg": "Name is required",
      "param": "name",
      "location": "body"
    }
  ]
}
```

hoặc

```json
{
  "message": "Khách hàng với email hoặc số điện thoại này đã tồn tại"
}
```

---

## 4. Shipments API (Vận đơn)

### 4.1. GET /shipments

Lấy danh sách vận đơn với phân trang và lọc.

**Request:**
```
GET /api/shipments?page=1&limit=20&status=pending&carrier_id=1
```

**Query Parameters:**
- `page` (optional, default: 1): Số trang
- `limit` (optional, default: 20): Số lượng vận đơn mỗi trang
- `status` (optional): Lọc theo trạng thái vận đơn
- `carrier_id` (optional): Lọc theo ID đơn vị vận chuyển

**Response:**
```json
{
  "shipments": [
    {
      "id": 1,
      "order_id": 1,
      "order_number": "ORD-2024-001",
      "customer_id": 1,
      "customer_name": "Nguyễn Văn A",
      "customer_phone": "0123456789",
      "carrier_id": 1,
      "carrier_name": "GHN",
      "tracking_number": "VN123456789",
      "status": "pending",
      "estimated_delivery_date": "2024-01-05",
      "actual_delivery_date": null,
      "notes": "Giao hàng trong giờ hành chính",
      "sales_channel": "online",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `500`: Server error

---

### 4.2. GET /shipments/:id

Lấy thông tin chi tiết một vận đơn.

**Request:**
```
GET /api/shipments/1
```

**Response:**
```json
{
  "id": 1,
  "order_id": 1,
  "order_number": "ORD-2024-001",
  "customer_id": 1,
  "customer_name": "Nguyễn Văn A",
  "customer_phone": "0123456789",
  "customer_address": "123 Đường ABC",
  "total_amount": 480000,
  "carrier_id": 1,
  "carrier_name": "GHN",
  "carrier_description": "Giao hàng nhanh",
  "tracking_number": "VN123456789",
  "status": "pending",
  "estimated_delivery_date": "2024-01-05",
  "actual_delivery_date": null,
  "notes": "Giao hàng trong giờ hành chính",
  "sales_channel": "online",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `200`: Success
- `401`: Unauthorized
- `404`: Shipment not found
- `500`: Server error

---

### 4.3. POST /shipments

Tạo vận đơn mới.

**Request:**
```
POST /api/shipments
```

**Request Body:**
```json
{
  "order_id": 1,
  "carrier_id": 1,
  "tracking_number": "VN123456789",
  "notes": "Giao hàng trong giờ hành chính",
  "estimated_delivery_date": "2024-01-05",
  "sales_channel": "online"
}
```

**Required Fields:**
- `order_id` (integer): ID đơn hàng
- `carrier_id` (integer): ID đơn vị vận chuyển
- `tracking_number` (string): Mã vận đơn

**Optional Fields:**
- `notes` (string): Ghi chú
- `estimated_delivery_date` (string): Ngày dự kiến giao hàng (YYYY-MM-DD)
- `sales_channel` (string): Kênh bán hàng

**Response:**
```json
{
  "id": 1,
  "order_id": 1,
  "carrier_id": 1,
  "tracking_number": "VN123456789",
  "status": "pending",
  "estimated_delivery_date": "2024-01-05",
  "actual_delivery_date": null,
  "notes": "Giao hàng trong giờ hành chính",
  "sales_channel": "online",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Status Codes:**
- `201`: Created successfully
- `400`: Bad request (validation error, order not found, order already has shipment)
- `401`: Unauthorized
- `500`: Server error

**Error Response:**
```json
{
  "errors": [
    {
      "msg": "Order ID is required",
      "param": "order_id",
      "location": "body"
    }
  ]
}
```

hoặc

```json
{
  "message": "Order not found"
}
```

---

## Error Handling

Tất cả các API endpoints đều trả về lỗi theo format chuẩn:

### Error Response Format

```json
{
  "message": "Error message",
  "error": "Detailed error (only in development mode)"
}
```

hoặc cho validation errors:

```json
{
  "errors": [
    {
      "msg": "Validation error message",
      "param": "field_name",
      "location": "body"
    }
  ]
}
```

### Common Status Codes

- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation error, invalid data)
- `401`: Unauthorized (missing or invalid token)
- `404`: Resource not found
- `500`: Internal server error
- `503`: Service unavailable (database connection issue)

---

## Rate Limiting

Hiện tại chưa có rate limiting. Có thể được thêm vào trong tương lai.

---

## Pagination

Các endpoints hỗ trợ pagination sử dụng query parameters:
- `page`: Số trang (bắt đầu từ 1)
- `limit`: Số lượng items mỗi trang

Response sẽ bao gồm:
- `total`: Tổng số items
- `page`: Trang hiện tại
- `limit`: Số lượng items mỗi trang

---

## Notes

1. Tất cả các timestamps đều ở định dạng ISO 8601 (UTC).
2. Tất cả các số tiền đều tính bằng VND (không có đơn vị tiền tệ trong response).
3. Images array trong products có thể chứa URLs tuyệt đối hoặc tương đối.
4. Khi tạo order, hệ thống sẽ tự động trừ stock của sản phẩm.
5. Khi tạo shipment, hệ thống sẽ kiểm tra xem order đã có shipment chưa.

---

## API Tokens Management

### Create API Token

**Endpoint:** `POST /api/api-tokens`

**Request Body:**
```json
{
  "name": "Mobile App Token",
  "expires_at": "2024-12-31T23:59:59Z",
  "permissions": ["products:read", "orders:read", "orders:write"]
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Mobile App Token",
  "token": "tcpf_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3",
  "expires_at": "2024-12-31T23:59:59.000Z",
  "permissions": ["products:read", "orders:read", "orders:write"],
  "created_at": "2024-01-01T00:00:00.000Z",
  "warning": "Save this token now. You will not be able to see it again."
}
```

**⚠️ Important:** Token chỉ được trả về một lần khi tạo. Hãy lưu lại ngay.

### Get All API Tokens

**Endpoint:** `GET /api/api-tokens`

**Response:**
```json
{
  "tokens": [
    {
      "id": 1,
      "name": "Mobile App Token",
      "token_preview": "$2a$10$...",
      "last_used_at": "2024-01-15T10:30:00.000Z",
      "expires_at": "2024-12-31T23:59:59.000Z",
      "is_active": true,
      "is_expired": false,
      "permissions": ["products:read", "orders:read"],
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Single API Token

**Endpoint:** `GET /api/api-tokens/:id`

### Update API Token

**Endpoint:** `PUT /api/api-tokens/:id`

**Request Body:**
```json
{
  "name": "Updated Token Name",
  "expires_at": "2025-12-31T23:59:59Z",
  "permissions": ["products:read", "products:write"],
  "is_active": true
}
```

### Revoke API Token

**Endpoint:** `POST /api/api-tokens/:id/revoke`

Vô hiệu hóa token (set `is_active = false`).

### Activate API Token

**Endpoint:** `POST /api/api-tokens/:id/activate`

Kích hoạt lại token đã bị vô hiệu hóa.

### Delete API Token

**Endpoint:** `DELETE /api/api-tokens/:id`

Xóa vĩnh viễn token khỏi hệ thống.

---

## Changelog

### Version 1.1.0 (2024-01-15)
- Added API Tokens management
- Support API token authentication alongside JWT
- API token permissions system

### Version 1.0.0 (2024-01-01)
- Initial API documentation
- Products, Orders, Customers, Shipments endpoints
