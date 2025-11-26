# Hướng dẫn sử dụng Sales Dashboard

## 🚀 Khởi động nhanh

### Development (Môi trường phát triển)

1. **Cài đặt dependencies:**
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

2. **Cấu hình database:**
- Tạo file `backend/.env` từ `backend/.env.example`
- Cập nhật thông tin kết nối PostgreSQL

3. **Khởi tạo database:**
```bash
cd backend
npm run migrate
```

4. **Chạy ứng dụng:**
```bash
# Từ thư mục root
npm run dev
```

5. **Truy cập:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production (VPS Ubuntu)

Xem file `DEPLOYMENT.md` để có hướng dẫn chi tiết.

## 🔐 Đăng nhập

**Tài khoản mặc định:**
- Username: `admin`
- Password: `admin123`

⚠️ **VUI LÒNG ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP!**

## 📱 Tính năng chính

### 1. Dashboard
- Tổng quan doanh thu, đơn hàng, khách hàng
- Biểu đồ doanh thu theo ngày
- Biểu đồ đơn hàng theo trạng thái
- Top sản phẩm bán chạy
- Đơn hàng gần đây

### 2. Quản lý Sản phẩm
- Thêm, sửa, xóa sản phẩm
- Quản lý tồn kho
- Phân loại sản phẩm
- Upload hình ảnh (URL)

### 3. Quản lý Đơn hàng
- Xem danh sách đơn hàng
- Chi tiết đơn hàng
- Cập nhật trạng thái đơn hàng:
  - Chờ xử lý
  - Đang xử lý
  - Hoàn thành
  - Đã hủy
- Tìm kiếm đơn hàng

### 4. Quản lý Khách hàng
- Thêm, sửa, xóa khách hàng
- Lưu thông tin liên hệ
- Xem lịch sử đơn hàng của khách hàng

## 🛠️ Cấu trúc API

Tất cả API yêu cầu authentication token (trừ `/api/auth/login`).

### Authentication
```
POST /api/auth/login
Body: { username, password }
```

### Products
```
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
```

### Orders
```
GET    /api/orders
GET    /api/orders/:id
POST   /api/orders
PATCH  /api/orders/:id/status
DELETE /api/orders/:id
```

### Customers
```
GET    /api/customers
GET    /api/customers/:id
POST   /api/customers
PUT    /api/customers/:id
DELETE /api/customers/:id
```

### Dashboard
```
GET /api/dashboard/stats?period=30
```

## 🐳 Docker Commands

### Chạy với Docker
```bash
docker-compose up -d
```

### Xem logs
```bash
docker-compose logs -f
```

### Dừng
```bash
docker-compose down
```

### Rebuild
```bash
docker-compose up -d --build
```

## 🔧 Troubleshooting

### Lỗi kết nối database
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra thông tin trong `backend/.env`
- Kiểm tra port 5432 không bị chặn

### Lỗi CORS
- Đảm bảo backend chạy trên port 5000
- Kiểm tra cấu hình CORS trong `backend/server.js`

### Lỗi build frontend
- Xóa `node_modules` và `dist`
- Chạy lại `npm install`
- Chạy lại `npm run build`

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs: `docker-compose logs`
2. Kiểm tra file `README.md` và `DEPLOYMENT.md`
3. Tạo issue trên repository

## 📝 Ghi chú

- Database tự động tạo tables khi khởi động lần đầu
- User admin mặc định được tạo tự động
- Tất cả API cần JWT token (trừ login)
- Frontend tự động proxy API requests đến backend

