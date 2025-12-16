# Hướng dẫn sử dụng Webhook KiotViet và n8n để đồng bộ dữ liệu

Tài liệu này hướng dẫn cách sử dụng webhook từ KiotViet và n8n để đồng bộ dữ liệu (đơn hàng, khách hàng, hàng hóa) về hệ thống qua API.

---

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Webhook KiotViet](#webhook-kiotviet)
3. [Sử dụng n8n để đồng bộ dữ liệu](#sử-dụng-n8n-để-đồng-bộ-dữ-liệu)
4. [API Endpoints](#api-endpoints)
5. [Ví dụ Workflow n8n](#ví-dụ-workflow-n8n)

---

## Tổng quan

Hệ thống hỗ trợ 2 cách để đồng bộ dữ liệu từ KiotViet:

1. **Webhook từ KiotViet**: KiotViet tự động gửi dữ liệu khi có sự kiện mới
2. **n8n Workflow**: Tự động hóa việc đồng bộ dữ liệu theo lịch trình hoặc trigger

---

## Webhook KiotViet

### 1. Cấu hình Webhook trong KiotViet

#### Bước 1: Lấy Webhook URL

Webhook URL của hệ thống:
```
https://sale.thuanchay.vn/api/webhooks/kiotviet
```

hoặc cho môi trường development:
```
http://localhost:5000/api/webhooks/kiotviet
```

#### Bước 2: Cấu hình trong KiotViet

1. Đăng nhập vào KiotViet Admin
2. Vào **Cài đặt** → **Tích hợp** → **Webhook**
3. Thêm webhook mới với các thông tin:
   - **URL**: `https://sale.thuanchay.vn/api/webhooks/kiotviet`
   - **Sự kiện**: Chọn các sự kiện cần đồng bộ:
     - `order.created` - Đơn hàng mới được tạo
     - `order.updated` - Đơn hàng được cập nhật
     - `customer.created` - Khách hàng mới được tạo
     - `customer.updated` - Khách hàng được cập nhật
     - `product.created` - Sản phẩm mới được tạo
     - `product.updated` - Sản phẩm được cập nhật
   - **Method**: `POST`
   - **Headers**: (Tùy chọn) Có thể thêm header xác thực nếu cần

#### Bước 3: Kiểm tra Webhook

Sau khi cấu hình, KiotViet sẽ gửi webhook với format:

```json
{
  "event": "order.created",
  "data": {
    "id": 12345,
    "code": "ORD-20240115-001",
    "customerId": 67890,
    "total": 500000,
    "status": 1,
    "createdDate": "2024-01-15T10:30:00Z",
    ...
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Xem Webhook Logs

Để xem logs của các webhook đã nhận:

```bash
GET /api/webhooks/logs?limit=50&event_type=order.created&status=success
```

Response:
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "event_type": "order.created",
      "payload": {...},
      "status": "success",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Sử dụng n8n để đồng bộ dữ liệu

### 1. Tạo API Key

Trước tiên, bạn cần tạo API key trong hệ thống:

1. Đăng nhập vào hệ thống
2. Vào **API Keys** → **Tạo API Key**
3. Lưu lại:
   - `client_id`
   - `key_secret`
   - `token` (hoặc tạo token từ client_id + key_secret)

### 2. Cài đặt n8n

#### Option 1: Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

#### Option 2: npm

```bash
npm install n8n -g
n8n start
```

Truy cập: `http://localhost:5678`

### 3. Tạo Workflow trong n8n

#### Workflow 1: Đồng bộ đơn hàng theo lịch trình

**Mục đích**: Tự động đồng bộ đơn hàng mới mỗi 5 phút

**Các node cần thiết**:

1. **Schedule Trigger**
   - **Cron Expression**: `*/5 * * * *` (mỗi 5 phút)
   - Hoặc sử dụng **Interval**: 5 minutes

2. **HTTP Request** (Đồng bộ đơn hàng)
   - **Method**: `POST`
   - **URL**: `https://sale.thuanchay.vn/api/webhooks/n8n/sync/orders`
   - **Headers**:
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer YOUR_API_TOKEN"
     }
     ```
   - **Body**:
     ```json
     {
       "api_key": "YOUR_API_TOKEN",
       "limit": 100,
       "from_date": "2024-01-15T00:00:00Z",
       "to_date": "2024-01-15T23:59:59Z"
     }
     ```

3. **IF** (Kiểm tra kết quả)
   - **Condition**: `{{ $json.success }} === true`

4. **Send Email** (Tùy chọn - thông báo khi có lỗi)
   - Chỉ gửi email khi `success === false`

#### Workflow 2: Đồng bộ khi có webhook từ KiotViet

**Mục đích**: Đồng bộ ngay khi nhận webhook từ KiotViet

**Các node cần thiết**:

1. **Webhook** (Nhận webhook từ KiotViet)
   - **Path**: `kiotviet-webhook`
   - **Method**: `POST`
   - **Response Mode**: `Response Node`

2. **Switch** (Phân loại sự kiện)
   - **Mode**: `Rules`
   - **Rules**:
     - `{{ $json.event }} === "order.created"` → Route to Order Sync
     - `{{ $json.event }} === "customer.created"` → Route to Customer Sync
     - `{{ $json.event }} === "product.created"` → Route to Product Sync

3. **HTTP Request** (Đồng bộ dữ liệu)
   - Tùy theo loại sự kiện, gọi endpoint tương ứng:
     - Orders: `/api/webhooks/n8n/sync/orders`
     - Customers: `/api/webhooks/n8n/sync/customers`
     - Products: `/api/webhooks/n8n/sync/products`

4. **Respond to Webhook**
   - **Response Code**: `200`
   - **Response Body**: `{ "success": true }`

---

## API Endpoints

### 1. Đồng bộ đơn hàng

**POST** `/api/webhooks/n8n/sync/orders`

**Headers**:
```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "api_key": "YOUR_API_TOKEN",  // Optional nếu đã có trong header
  "limit": 100,                  // Optional, default: 100
  "from_date": "2024-01-15T00:00:00Z",  // Optional
  "to_date": "2024-01-15T23:59:59Z"     // Optional
}
```

**Response**:
```json
{
  "success": true,
  "synced": 50,
  "failed": 0,
  "total": 50,
  "errors": []
}
```

### 2. Đồng bộ khách hàng

**POST** `/api/webhooks/n8n/sync/customers`

**Headers**:
```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "api_key": "YOUR_API_TOKEN",
  "limit": 100,
  "from_date": "2024-01-15T00:00:00Z",
  "to_date": "2024-01-15T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "synced": 30,
  "failed": 0,
  "total": 30,
  "errors": []
}
```

### 3. Đồng bộ sản phẩm

**POST** `/api/webhooks/n8n/sync/products`

**Headers**:
```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

**Body**:
```json
{
  "api_key": "YOUR_API_TOKEN",
  "limit": 100,
  "from_date": "2024-01-15T00:00:00Z",
  "to_date": "2024-01-15T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "synced": 25,
  "failed": 0,
  "total": 25,
  "errors": []
}
```

### 4. Xem Webhook Logs

**GET** `/api/webhooks/logs`

**Query Parameters**:
- `limit`: Số lượng logs (default: 50)
- `event_type`: Lọc theo loại sự kiện (order.created, customer.created, ...)
- `status`: Lọc theo trạng thái (success, error, pending)

**Example**:
```
GET /api/webhooks/logs?limit=100&event_type=order.created&status=success
```

---

## Ví dụ Workflow n8n

### Workflow 1: Đồng bộ đơn hàng mỗi 10 phút

```json
{
  "name": "Sync Orders Every 10 Minutes",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "minutesInterval": 10
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://sale.thuanchay.vn/api/webhooks/n8n/sync/orders",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_API_TOKEN"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "limit",
              "value": "100"
            }
          ]
        },
        "options": {}
      },
      "name": "Sync Orders",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition1",
              "leftValue": "={{ $json.success }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "name": "Check Success",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "Sync Orders", "type": "main", "index": 0 }]]
    },
    "Sync Orders": {
      "main": [[{ "node": "Check Success", "type": "main", "index": 0 }]]
    }
  }
}
```

### Workflow 2: Đồng bộ khi nhận webhook từ KiotViet

```json
{
  "name": "Sync on KiotViet Webhook",
  "nodes": [
    {
      "parameters": {
        "path": "kiotviet-webhook",
        "httpMethod": "POST",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1.1,
      "position": [250, 300],
      "webhookId": "kiotviet-webhook"
    },
    {
      "parameters": {
        "mode": "rules",
        "rules": {
          "values": [
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "condition1",
                    "leftValue": "={{ $json.event }}",
                    "rightValue": "order.created",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "order"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "condition1",
                    "leftValue": "={{ $json.event }}",
                    "rightValue": "customer.created",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "customer"
            },
            {
              "conditions": {
                "options": {
                  "caseSensitive": true,
                  "leftValue": "",
                  "typeValidation": "strict"
                },
                "conditions": [
                  {
                    "id": "condition1",
                    "leftValue": "={{ $json.event }}",
                    "rightValue": "product.created",
                    "operator": {
                      "type": "string",
                      "operation": "equals"
                    }
                  }
                ],
                "combinator": "and"
              },
              "renameOutput": true,
              "outputKey": "product"
            }
          ]
        },
        "options": {}
      },
      "name": "Route by Event",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://sale.thuanchay.vn/api/webhooks/n8n/sync/orders",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_API_TOKEN"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "api_key",
              "value": "YOUR_API_TOKEN"
            }
          ]
        }
      },
      "name": "Sync Order",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [650, 200]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { \"success\": true } }}",
        "options": {}
      },
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [850, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{ "node": "Route by Event", "type": "main", "index": 0 }]]
    },
    "Route by Event": {
      "main": [
        [{ "node": "Sync Order", "type": "main", "index": 0 }],
        [],
        []
      ]
    },
    "Sync Order": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

---

## Lưu ý quan trọng

1. **Bảo mật API Key**: 
   - Không chia sẻ API key công khai
   - Sử dụng biến môi trường trong n8n để lưu API key
   - Rotate API key định kỳ

2. **Rate Limiting**:
   - Không gọi API quá thường xuyên (tối thiểu 1 phút/lần)
   - Sử dụng limit hợp lý (không quá 1000 records/lần)

3. **Error Handling**:
   - Luôn kiểm tra `success` trong response
   - Log lỗi để debug
   - Có cơ chế retry khi thất bại

4. **Testing**:
   - Test workflow trong môi trường development trước
   - Kiểm tra webhook logs để đảm bảo dữ liệu được xử lý đúng

---

## Troubleshooting

### Webhook không nhận được dữ liệu

1. Kiểm tra webhook URL có đúng không
2. Kiểm tra firewall/network có chặn request không
3. Xem logs: `GET /api/webhooks/logs`

### n8n workflow không chạy

1. Kiểm tra API key có đúng không
2. Kiểm tra URL endpoint có đúng không
3. Xem logs trong n8n để debug

### Dữ liệu không được đồng bộ

1. Kiểm tra KiotViet config có đúng không
2. Kiểm tra access token có còn hạn không
3. Xem error logs trong response

---

## Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs trong hệ thống
2. Kiểm tra webhook logs: `/api/webhooks/logs`
3. Liên hệ admin để được hỗ trợ

