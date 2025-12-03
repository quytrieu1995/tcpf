# API Documentation

Tài liệu API cho hệ thống quản lý bán hàng (Sales Management System)

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Xác thực (Authentication)](#xác-thực-authentication)
3. [Base URL](#base-url)
4. [Quản lý API Keys](#quản-lý-api-keys)
5. [Đơn hàng (Orders)](#đơn-hàng-orders)
6. [Hàng hóa (Products)](#hàng-hóa-products)
7. [Khách hàng (Customers)](#khách-hàng-customers)
8. [Vận đơn (Shipments)](#vận-đơn-shipments)
9. [Mã lỗi (Error Codes)](#mã-lỗi-error-codes)

---

## Tổng quan

API này cung cấp các endpoint để quản lý:
- **Đơn hàng**: Tạo, cập nhật, xóa và theo dõi đơn hàng
- **Hàng hóa**: Quản lý sản phẩm, tồn kho, giá cả
- **Khách hàng**: Quản lý thông tin khách hàng và nhóm khách hàng
- **Vận đơn**: Quản lý vận chuyển và theo dõi đơn hàng

### Định dạng dữ liệu

- **Request**: JSON
- **Response**: JSON
- **Content-Type**: `application/json`

---

## Xác thực (Authentication)

Hệ thống hỗ trợ 2 phương thức xác thực:

### 1. JWT Token (Cho ứng dụng web)

Tất cả các API endpoints (trừ login) đều yêu cầu xác thực bằng JWT token.

#### Cách sử dụng

Gửi token trong header `Authorization`:

```
Authorization: Bearer <your_jwt_token>
```

#### Ví dụ

```bash
curl -X GET "https://api.example.com/api/orders" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. API Key Authentication (Cho tích hợp bên thứ ba)

Hệ thống hỗ trợ xác thực bằng API key với 2 cách:

#### Cách 1: Sử dụng API Token

Gửi token trong header `Authorization`:

```
Authorization: Bearer <api_token>
```

hoặc

```
Authorization: ApiKey <api_token>
```

#### Cách 2: Sử dụng Client ID + Key Secret

Gửi trong headers:

```
X-Client-ID: <client_id>
X-Key-Secret: <key_secret>
```

hoặc trong query parameters:

```
?client_id=<client_id>&key_secret=<key_secret>
```

#### Ví dụ với API Token

```bash
curl -X GET "https://api.example.com/api/orders" \
  -H "Authorization: Bearer your_api_token_here"
```

#### Ví dụ với Client ID + Key Secret

```bash
curl -X GET "https://api.example.com/api/orders" \
  -H "X-Client-ID: client_abc123" \
  -H "X-Key-Secret: your_key_secret_here"
```

hoặc

```bash
curl -X GET "https://api.example.com/api/orders?client_id=client_abc123&key_secret=your_key_secret_here"
```

#### Lưu ý

- API token được tạo tự động khi tạo API key mới
- Key secret chỉ hiển thị một lần khi tạo, hãy lưu lại ngay
- API key có thể được set thời gian hết hạn (expires_at)
- API key có thể bị vô hiệu hóa (revoke) mà không cần xóa

---

## Base URL

```
Production: https://sale.thuanchay.vn/api
Development: http://localhost:5000/api
```

---

## Đơn hàng (Orders)

### 1. Lấy danh sách đơn hàng

**GET** `/api/orders`

Lấy danh sách đơn hàng với các tùy chọn lọc và phân trang.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Lọc theo trạng thái: `pending`, `processing`, `completed`, `cancelled` |
| `delivery_status` | string | No | Lọc theo trạng thái giao hàng: `pending`, `shipping`, `delivered`, `returned`, `cancelled` |
| `page` | integer | No | Số trang (mặc định: 1) |
| `limit` | integer | No | Số bản ghi mỗi trang (mặc định: 10) |
| `start_date` | string | No | Ngày bắt đầu (format: YYYY-MM-DD) |
| `end_date` | string | No | Ngày kết thúc (format: YYYY-MM-DD) |
| `search` | string | No | Tìm kiếm theo số đơn, mã vận đơn, tên/email/phone khách hàng |
| `return_code` | string | No | Lọc theo mã trả hàng |
| `reconciliation_code` | string | No | Lọc theo mã đối soát |
| `tracking_number` | string | No | Lọc theo mã vận đơn |

#### Response 200 OK

```json
{
  "orders": [
    {
      "id": 1,
      "order_number": "ORD-1234567890-123",
      "customer_id": 5,
      "customer_name": "Nguyễn Văn A",
      "customer_code": "KH001",
      "customer_email": "nguyenvana@example.com",
      "customer_phone": "0901234567",
      "status": "processing",
      "delivery_status": "shipping",
      "total_amount": 1500000.00,
      "total_after_tax": 1650000.00,
      "payment_method": "cod",
      "shipping_method_id": 1,
      "shipping_method_name": "Giao hàng nhanh",
      "tracking_number": "VN123456789",
      "sales_channel": "shopee",
      "branch_id": 1,
      "branch_code": "CN001",
      "branch_name": "Chi nhánh Hà Nội",
      "seller_id": 2,
      "seller_name": "Nguyễn Thị B",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T11:00:00.000Z",
      "total_quantity": 3
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

### 2. Lấy chi tiết đơn hàng

**GET** `/api/orders/:id`

Lấy thông tin chi tiết của một đơn hàng bao gồm các sản phẩm trong đơn.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của đơn hàng |

#### Response 200 OK

```json
{
  "id": 1,
  "order_number": "ORD-1234567890-123",
  "customer_id": 5,
  "customer_name": "Nguyễn Văn A",
  "status": "processing",
  "delivery_status": "shipping",
  "total_amount": 1500000.00,
  "total_after_tax": 1650000.00,
  "payment_method": "cod",
  "shipping_address": "123 Đường ABC, Quận 1, TP.HCM",
  "shipping_phone": "0901234567",
  "tracking_number": "VN123456789",
  "sales_channel": "shopee",
  "items": [
    {
      "id": 1,
      "product_id": 10,
      "product_name": "Áo thun nam",
      "quantity": 2,
      "unit_price": 500000.00,
      "subtotal": 1000000.00
    },
    {
      "id": 2,
      "product_id": 15,
      "product_name": "Quần jean",
      "quantity": 1,
      "unit_price": 500000.00,
      "subtotal": 500000.00
    }
  ],
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T11:00:00.000Z"
}
```

#### Response 404 Not Found

```json
{
  "message": "Order not found"
}
```

---

### 3. Tạo đơn hàng mới

**POST** `/api/orders`

Tạo một đơn hàng mới với các sản phẩm và thông tin khách hàng.

#### Request Body

```json
{
  "customer_id": 5,
  "shipping_method_id": 1,
  "payment_method": "cod",
  "notes": "Giao hàng vào buổi sáng",
  "shipping_address": "123 Đường ABC, Quận 1, TP.HCM",
  "shipping_phone": "0901234567",
  "sales_channel": "shopee",
  "promotion_code": "SALE2024",
  "items": [
    {
      "product_id": 10,
      "quantity": 2
    },
    {
      "product_id": 15,
      "quantity": 1
    }
  ]
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | integer | No | ID khách hàng (có thể để null cho khách vãng lai) |
| `shipping_method_id` | integer | No | ID phương thức vận chuyển |
| `payment_method` | string | No | Phương thức thanh toán: `cod`, `bank_transfer`, `credit_card`, `cash` |
| `notes` | string | No | Ghi chú đơn hàng |
| `shipping_address` | string | No | Địa chỉ giao hàng |
| `shipping_phone` | string | No | Số điện thoại người nhận |
| `sales_channel` | string | No | Kênh bán hàng: `tiktok`, `shopee`, `lazada`, `facebook`, `other` |
| `promotion_code` | string | No | Mã khuyến mãi |
| `items` | array | **Yes** | Danh sách sản phẩm (tối thiểu 1 sản phẩm) |
| `items[].product_id` | integer | **Yes** | ID sản phẩm |
| `items[].quantity` | integer | **Yes** | Số lượng (tối thiểu: 1) |

#### Response 201 Created

```json
{
  "id": 1,
  "order_number": "ORD-1234567890-123",
  "customer_id": 5,
  "status": "pending",
  "delivery_status": "pending",
  "total_amount": 1500000.00,
  "total_after_tax": 1650000.00,
  "payment_method": "cod",
  "sales_channel": "shopee",
  "items": [
    {
      "id": 1,
      "product_id": 10,
      "quantity": 2,
      "unit_price": 500000.00,
      "subtotal": 1000000.00
    }
  ],
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

#### Response 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "At least one item is required",
      "param": "items",
      "location": "body"
    }
  ]
}
```

---

### 4. Cập nhật đơn hàng

**PUT** `/api/orders/:id`

Cập nhật thông tin đơn hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của đơn hàng |

#### Request Body

```json
{
  "customer_id": 5,
  "shipping_method_id": 1,
  "payment_method": "bank_transfer",
  "status": "processing",
  "delivery_status": "shipping",
  "notes": "Đã xác nhận thanh toán",
  "shipping_address": "456 Đường XYZ, Quận 2, TP.HCM",
  "shipping_phone": "0907654321",
  "tracking_number": "VN987654321",
  "sales_channel": "lazada",
  "total_amount": 1500000.00,
  "total_after_tax": 1650000.00,
  "discount_amount": 100000.00,
  "vat": 150000.00,
  "customer_paid": 1650000.00
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | integer | No | ID khách hàng |
| `shipping_method_id` | integer | No | ID phương thức vận chuyển |
| `payment_method` | string | No | Phương thức thanh toán |
| `status` | string | No | Trạng thái: `pending`, `processing`, `completed`, `cancelled` |
| `delivery_status` | string | No | Trạng thái giao hàng: `pending`, `shipping`, `delivered`, `returned`, `cancelled` |
| `notes` | string | No | Ghi chú |
| `shipping_address` | string | No | Địa chỉ giao hàng |
| `shipping_phone` | string | No | Số điện thoại người nhận |
| `tracking_number` | string | No | Mã vận đơn |
| `sales_channel` | string | No | Kênh bán hàng |
| `total_amount` | number | No | Tổng tiền |
| `total_after_tax` | number | No | Tổng tiền sau thuế |
| `discount_amount` | number | No | Số tiền giảm giá |
| `vat` | number | No | Thuế VAT |
| `customer_paid` | number | No | Số tiền khách đã thanh toán |

#### Response 200 OK

```json
{
  "id": 1,
  "order_number": "ORD-1234567890-123",
  "customer_id": 5,
  "status": "processing",
  "delivery_status": "shipping",
  "total_amount": 1500000.00,
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### 5. Cập nhật trạng thái đơn hàng

**PATCH** `/api/orders/:id/status`

Cập nhật trạng thái đơn hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của đơn hàng |

#### Request Body

```json
{
  "status": "completed"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | **Yes** | Trạng thái: `pending`, `processing`, `completed`, `cancelled` |

#### Response 200 OK

```json
{
  "id": 1,
  "order_number": "ORD-1234567890-123",
  "status": "completed",
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### 6. Xóa đơn hàng

**DELETE** `/api/orders/:id`

Xóa một đơn hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của đơn hàng |

#### Response 200 OK

```json
{
  "message": "Order deleted successfully"
}
```

#### Response 404 Not Found

```json
{
  "message": "Order not found"
}
```

---

## Hàng hóa (Products)

### 1. Lấy danh sách sản phẩm

**GET** `/api/products`

Lấy danh sách sản phẩm với tùy chọn tìm kiếm và phân trang.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Tìm kiếm theo tên hoặc mô tả |
| `category` | string | No | Lọc theo danh mục |
| `page` | integer | No | Số trang (mặc định: 1) |
| `limit` | integer | No | Số bản ghi mỗi trang (mặc định: 10) |

#### Response 200 OK

```json
{
  "products": [
    {
      "id": 1,
      "name": "Áo thun nam",
      "description": "Áo thun cotton 100%, chất lượng cao",
      "price": 500000.00,
      "stock": 100,
      "category": "Áo",
      "category_id": 1,
      "image_url": "https://example.com/images/ao-thun.jpg",
      "sku": "SP001",
      "barcode": "1234567890123",
      "cost_price": 300000.00,
      "weight": 0.2,
      "supplier_id": 1,
      "low_stock_threshold": 10,
      "is_active": true,
      "kiotviet_id": "KV123456",
      "kiotviet_data": {},
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

---

### 2. Lấy chi tiết sản phẩm

**GET** `/api/products/:id`

Lấy thông tin chi tiết của một sản phẩm.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của sản phẩm |

#### Response 200 OK

```json
{
  "id": 1,
  "name": "Áo thun nam",
  "description": "Áo thun cotton 100%, chất lượng cao",
  "price": 500000.00,
  "stock": 100,
  "category": "Áo",
  "category_id": 1,
  "image_url": "https://example.com/images/ao-thun.jpg",
  "sku": "SP001",
  "barcode": "1234567890123",
  "cost_price": 300000.00,
  "weight": 0.2,
  "supplier_id": 1,
  "low_stock_threshold": 10,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z"
}
```

---

### 3. Tạo sản phẩm mới

**POST** `/api/products`

Tạo một sản phẩm mới.

#### Request Body

```json
{
  "name": "Áo thun nam",
  "description": "Áo thun cotton 100%, chất lượng cao",
  "price": 500000.00,
  "stock": 100,
  "category": "Áo",
  "category_id": 1,
  "image_url": "https://example.com/images/ao-thun.jpg",
  "sku": "SP001",
  "barcode": "1234567890123",
  "cost_price": 300000.00,
  "weight": 0.2,
  "supplier_id": 1,
  "low_stock_threshold": 10
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Tên sản phẩm |
| `description` | string | No | Mô tả sản phẩm |
| `price` | number | **Yes** | Giá bán (phải >= 0) |
| `stock` | integer | No | Số lượng tồn kho (mặc định: 0) |
| `category` | string | No | Tên danh mục |
| `category_id` | integer | No | ID danh mục |
| `image_url` | string | No | URL hình ảnh |
| `sku` | string | No | Mã SKU (phải unique) |
| `barcode` | string | No | Mã vạch (phải unique) |
| `cost_price` | number | No | Giá vốn |
| `weight` | number | No | Trọng lượng (kg) |
| `supplier_id` | integer | No | ID nhà cung cấp |
| `low_stock_threshold` | integer | No | Ngưỡng cảnh báo tồn kho thấp (mặc định: 10) |

#### Response 201 Created

```json
{
  "id": 1,
  "name": "Áo thun nam",
  "description": "Áo thun cotton 100%, chất lượng cao",
  "price": 500000.00,
  "stock": 100,
  "category": "Áo",
  "sku": "SP001",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

#### Response 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "Name is required",
      "param": "name",
      "location": "body"
    },
    {
      "msg": "Price must be a positive number",
      "param": "price",
      "location": "body"
    }
  ]
}
```

---

### 4. Cập nhật sản phẩm

**PUT** `/api/products/:id`

Cập nhật thông tin sản phẩm.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của sản phẩm |

#### Request Body

```json
{
  "name": "Áo thun nam (Cập nhật)",
  "description": "Áo thun cotton 100%, chất lượng cao - Phiên bản mới",
  "price": 550000.00,
  "stock": 150,
  "category": "Áo",
  "category_id": 1,
  "image_url": "https://example.com/images/ao-thun-v2.jpg",
  "sku": "SP001",
  "barcode": "1234567890123",
  "cost_price": 350000.00,
  "weight": 0.25,
  "supplier_id": 1,
  "low_stock_threshold": 15,
  "is_active": true
}
```

#### Response 200 OK

```json
{
  "id": 1,
  "name": "Áo thun nam (Cập nhật)",
  "price": 550000.00,
  "stock": 150,
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

#### Response 400 Bad Request

```json
{
  "message": "SKU or barcode already exists"
}
```

---

### 5. Xóa sản phẩm

**DELETE** `/api/products/:id`

Xóa một sản phẩm.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của sản phẩm |

#### Response 200 OK

```json
{
  "message": "Product deleted successfully"
}
```

#### Response 404 Not Found

```json
{
  "message": "Product not found"
}
```

---

## Khách hàng (Customers)

### 1. Lấy danh sách khách hàng

**GET** `/api/customers`

Lấy danh sách khách hàng với tùy chọn tìm kiếm và phân trang.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Tìm kiếm theo tên, email hoặc số điện thoại |
| `page` | integer | No | Số trang (mặc định: 1) |
| `limit` | integer | No | Số bản ghi mỗi trang (mặc định: 10) |

#### Response 200 OK

```json
{
  "customers": [
    {
      "id": 1,
      "code": "KH001",
      "name": "Nguyễn Văn A",
      "email": "nguyenvana@example.com",
      "phone": "0901234567",
      "address": "123 Đường ABC, Quận 1, TP.HCM",
      "group_id": 1,
      "group_name": "Khách hàng VIP",
      "group_discount": 10.00,
      "credit_limit": 5000000.00,
      "tags": "vip,regular",
      "kiotviet_id": "KV789",
      "kiotviet_data": {},
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 200,
  "page": 1,
  "limit": 10
}
```

---

### 2. Lấy chi tiết khách hàng

**GET** `/api/customers/:id`

Lấy thông tin chi tiết của một khách hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của khách hàng |

#### Response 200 OK

```json
{
  "id": 1,
  "code": "KH001",
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0901234567",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "group_id": 1,
  "credit_limit": 5000000.00,
  "tags": "vip,regular",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-15T10:00:00.000Z"
}
```

---

### 3. Lấy danh sách đơn hàng của khách hàng

**GET** `/api/customers/:id/orders`

Lấy tất cả đơn hàng của một khách hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của khách hàng |

#### Response 200 OK

```json
[
  {
    "id": 1,
    "order_number": "ORD-1234567890-123",
    "customer_id": 1,
    "status": "completed",
    "total_amount": 1500000.00,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 2,
    "order_number": "ORD-1234567890-456",
    "customer_id": 1,
    "status": "processing",
    "total_amount": 2000000.00,
    "created_at": "2024-01-16T14:20:00.000Z"
  }
]
```

---

### 4. Tạo khách hàng mới

**POST** `/api/customers`

Tạo một khách hàng mới.

#### Request Body

```json
{
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0901234567",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "group_id": 1,
  "credit_limit": 5000000.00,
  "tags": "vip,regular"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Tên khách hàng |
| `email` | string | No | Email (phải là email hợp lệ nếu có) |
| `phone` | string | No | Số điện thoại |
| `address` | string | No | Địa chỉ |
| `group_id` | integer | No | ID nhóm khách hàng |
| `credit_limit` | number | No | Hạn mức tín dụng |
| `tags` | string | No | Tags (phân cách bằng dấu phẩy) |

#### Response 201 Created

```json
{
  "id": 1,
  "code": "KH001",
  "name": "Nguyễn Văn A",
  "email": "nguyenvana@example.com",
  "phone": "0901234567",
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "group_id": 1,
  "credit_limit": 5000000.00,
  "tags": "vip,regular",
  "created_at": "2024-01-15T10:00:00.000Z"
}
```

#### Response 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "Name is required",
      "param": "name",
      "location": "body"
    },
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

---

### 5. Cập nhật khách hàng

**PUT** `/api/customers/:id`

Cập nhật thông tin khách hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của khách hàng |

#### Request Body

```json
{
  "name": "Nguyễn Văn A (Cập nhật)",
  "email": "nguyenvana.new@example.com",
  "phone": "0907654321",
  "address": "456 Đường XYZ, Quận 2, TP.HCM",
  "group_id": 2,
  "credit_limit": 10000000.00,
  "tags": "vip,premium"
}
```

#### Response 200 OK

```json
{
  "id": 1,
  "code": "KH001",
  "name": "Nguyễn Văn A (Cập nhật)",
  "email": "nguyenvana.new@example.com",
  "phone": "0907654321",
  "updated_at": "2024-01-15T12:00:00.000Z"
}
```

---

### 6. Xóa khách hàng

**DELETE** `/api/customers/:id`

Xóa một khách hàng.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của khách hàng |

#### Response 200 OK

```json
{
  "message": "Customer deleted successfully"
}
```

#### Response 404 Not Found

```json
{
  "message": "Customer not found"
}
```

#### Response 400 Bad Request

```json
{
  "message": "Cannot delete customer with associated orders"
}
```

---

## Vận đơn (Shipments)

### 1. Lấy danh sách vận đơn

**GET** `/api/shipments`

Lấy danh sách vận đơn với tùy chọn lọc và phân trang.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Lọc theo trạng thái: `pending`, `in_transit`, `delivered`, `cancelled` |
| `carrier_id` | integer | No | Lọc theo ID đơn vị vận chuyển |
| `page` | integer | No | Số trang (mặc định: 1) |
| `limit` | integer | No | Số bản ghi mỗi trang (mặc định: 20) |

#### Response 200 OK

```json
{
  "shipments": [
    {
      "id": 1,
      "order_id": 1,
      "order_number": "ORD-1234567890-123",
      "customer_id": 5,
      "customer_name": "Nguyễn Văn A",
      "customer_phone": "0901234567",
      "carrier_id": 1,
      "carrier_name": "Giao hàng nhanh",
      "tracking_number": "VN123456789",
      "status": "in_transit",
      "sales_channel": "shopee",
      "estimated_delivery_date": "2024-01-20T00:00:00.000Z",
      "delivered_at": null,
      "notes": "Giao hàng vào buổi sáng",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-16T08:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

### 2. Lấy chi tiết vận đơn

**GET** `/api/shipments/:id`

Lấy thông tin chi tiết của một vận đơn.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của vận đơn |

#### Response 200 OK

```json
{
  "id": 1,
  "order_id": 1,
  "order_number": "ORD-1234567890-123",
  "customer_id": 5,
  "customer_name": "Nguyễn Văn A",
  "customer_phone": "0901234567",
  "customer_address": "123 Đường ABC, Quận 1, TP.HCM",
  "carrier_id": 1,
  "carrier_name": "Giao hàng nhanh",
  "carrier_description": "Dịch vụ giao hàng nhanh trong 24h",
  "tracking_number": "VN123456789",
  "status": "in_transit",
  "sales_channel": "shopee",
  "estimated_delivery_date": "2024-01-20T00:00:00.000Z",
  "delivered_at": null,
  "notes": "Giao hàng vào buổi sáng",
  "total_amount": 1500000.00,
  "created_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-16T08:00:00.000Z"
}
```

---

### 3. Tạo vận đơn mới

**POST** `/api/shipments`

Tạo một vận đơn mới cho đơn hàng.

#### Request Body

```json
{
  "order_id": 1,
  "carrier_id": 1,
  "tracking_number": "VN123456789",
  "notes": "Giao hàng vào buổi sáng",
  "estimated_delivery_date": "2024-01-20T00:00:00.000Z",
  "sales_channel": "shopee"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | integer | **Yes** | ID đơn hàng |
| `carrier_id` | integer | **Yes** | ID đơn vị vận chuyển |
| `tracking_number` | string | **Yes** | Mã vận đơn |
| `notes` | string | No | Ghi chú |
| `estimated_delivery_date` | string | No | Ngày dự kiến giao hàng (ISO 8601) |
| `sales_channel` | string | No | Kênh bán hàng |

#### Response 201 Created

```json
{
  "id": 1,
  "order_id": 1,
  "carrier_id": 1,
  "tracking_number": "VN123456789",
  "status": "pending",
  "sales_channel": "shopee",
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

#### Response 400 Bad Request

```json
{
  "errors": [
    {
      "msg": "Order ID is required",
      "param": "order_id",
      "location": "body"
    },
    {
      "msg": "Tracking number is required",
      "param": "tracking_number",
      "location": "body"
    }
  ]
}
```

---

### 4. Cập nhật trạng thái vận đơn

**PATCH** `/api/shipments/:id/status`

Cập nhật trạng thái vận đơn. Khi trạng thái là `delivered`, đơn hàng sẽ tự động được cập nhật thành `completed`.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của vận đơn |

#### Request Body

```json
{
  "status": "delivered",
  "delivered_at": "2024-01-20T10:00:00.000Z"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | **Yes** | Trạng thái: `pending`, `in_transit`, `delivered`, `cancelled` |
| `delivered_at` | string | No | Thời gian giao hàng (ISO 8601) |

#### Response 200 OK

```json
{
  "id": 1,
  "order_id": 1,
  "status": "delivered",
  "delivered_at": "2024-01-20T10:00:00.000Z",
  "updated_at": "2024-01-20T10:00:00.000Z"
}
```

---

### 5. Cập nhật vận đơn

**PUT** `/api/shipments/:id`

Cập nhật thông tin vận đơn.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của vận đơn |

#### Request Body

```json
{
  "carrier_id": 2,
  "tracking_number": "VN987654321",
  "notes": "Đã cập nhật đơn vị vận chuyển",
  "estimated_delivery_date": "2024-01-22T00:00:00.000Z"
}
```

#### Request Body Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `carrier_id` | integer | No | ID đơn vị vận chuyển |
| `tracking_number` | string | No | Mã vận đơn |
| `notes` | string | No | Ghi chú |
| `estimated_delivery_date` | string | No | Ngày dự kiến giao hàng (ISO 8601) |

#### Response 200 OK

```json
{
  "id": 1,
  "order_id": 1,
  "carrier_id": 2,
  "tracking_number": "VN987654321",
  "notes": "Đã cập nhật đơn vị vận chuyển",
  "updated_at": "2024-01-16T12:00:00.000Z"
}
```

---

### 6. Đồng bộ vận đơn với đơn vị vận chuyển

**POST** `/api/shipments/:id/sync`

Đồng bộ thông tin vận đơn từ đơn vị vận chuyển.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | ID của vận đơn |

#### Response 200 OK

```json
{
  "success": true,
  "message": "Shipment synced successfully",
  "data": {
    "status": "in_transit",
    "location": "Đang tại kho trung chuyển",
    "updated_at": "2024-01-16T08:00:00.000Z"
  }
}
```

---

### 7. Đồng bộ tất cả vận đơn của đơn vị vận chuyển

**POST** `/api/shipments/carrier/:carrierId/sync`

Đồng bộ tất cả vận đơn của một đơn vị vận chuyển.

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `carrierId` | integer | Yes | ID của đơn vị vận chuyển |

#### Response 200 OK

```json
{
  "success": true,
  "message": "Synced 10 shipments",
  "synced": 10,
  "failed": 0
}
```

---

## Mã lỗi (Error Codes)

### HTTP Status Codes

| Code | Mô tả |
|------|-------|
| `200` | Thành công |
| `201` | Đã tạo thành công |
| `400` | Yêu cầu không hợp lệ (thiếu thông tin, dữ liệu không đúng format) |
| `401` | Chưa xác thực (thiếu hoặc token không hợp lệ) |
| `403` | Không có quyền truy cập |
| `404` | Không tìm thấy tài nguyên |
| `500` | Lỗi server |
| `503` | Service unavailable (thường là lỗi kết nối database) |

### Error Response Format

```json
{
  "message": "Error message",
  "error": "Detailed error message (only in development)",
  "errors": [
    {
      "msg": "Validation error message",
      "param": "field_name",
      "location": "body"
    }
  ]
}
```

### Ví dụ Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "errors": [
    {
      "msg": "Name is required",
      "param": "name",
      "location": "body"
    },
    {
      "msg": "Price must be a positive number",
      "param": "price",
      "location": "body"
    }
  ]
}
```

#### 401 Unauthorized

```json
{
  "message": "Unauthorized"
}
```

#### 404 Not Found

```json
{
  "message": "Order not found"
}
```

#### 500 Internal Server Error

```json
{
  "message": "Server error",
  "error": "Detailed error message (only in development mode)"
}
```

---

## Ghi chú

### Trạng thái đơn hàng (Order Status)

- `pending`: Chờ xử lý
- `processing`: Đang xử lý
- `completed`: Hoàn thành
- `cancelled`: Đã hủy

### Trạng thái giao hàng (Delivery Status)

- `pending`: Chờ giao hàng
- `shipping`: Đang giao hàng
- `delivered`: Đã giao hàng
- `returned`: Đã trả hàng
- `cancelled`: Đã hủy

### Trạng thái vận đơn (Shipment Status)

- `pending`: Chờ xử lý
- `in_transit`: Đang vận chuyển
- `delivered`: Đã giao hàng
- `cancelled`: Đã hủy

### Kênh bán hàng (Sales Channel)

- `tiktok`: TikTok Shop
- `shopee`: Shopee
- `lazada`: Lazada
- `facebook`: Facebook
- `other`: Kênh khác

### Phương thức thanh toán (Payment Method)

- `cod`: Thanh toán khi nhận hàng (COD)
- `bank_transfer`: Chuyển khoản ngân hàng
- `credit_card`: Thẻ tín dụng
- `cash`: Tiền mặt

---

## Liên hệ

Nếu có thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ:
- Email: support@example.com
- Website: https://sale.thuanchay.vn

---

**Phiên bản tài liệu**: 1.0.0  
**Cập nhật lần cuối**: 2024-01-15

