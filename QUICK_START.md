# Hướng dẫn Chạy Lại Project

## 🚀 Chạy lại Project sau khi cập nhật

### Bước 1: Cài đặt Dependencies (nếu chưa có)

```bash
# Từ thư mục root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Bước 2: Cấu hình Database

Tạo file `backend/.env` nếu chưa có:

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin database của bạn:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_db
DB_USER=postgres
DB_PASSWORD=your_password  # ⚠️ QUAN TRỌNG: Phải khớp với mật khẩu PostgreSQL
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=7d
```

**⚠️ LƯU Ý:** Nếu gặp lỗi "password authentication failed", xem file `FIX_DATABASE_AUTH.md` để sửa.

### Bước 3: Khởi động Database

Đảm bảo PostgreSQL đang chạy:

```bash
# Windows (nếu dùng PostgreSQL service)
# Kiểm tra trong Services hoặc chạy:
pg_ctl start

# Linux/Mac
sudo service postgresql start
# hoặc
brew services start postgresql
```

### Bước 4: Chạy Migration (Áp dụng Schema mới)

```bash
cd backend
npm run migrate
```

Lệnh này sẽ:
- Tạo các bảng mới (categories, promotions, suppliers, shipping_methods, inventory_transactions, activity_logs)
- Thêm các cột mới vào bảng hiện có (products, orders, users)
- Tạo user admin mặc định nếu chưa có

**Lưu ý:** Nếu database đã có dữ liệu, các cột mới sẽ được thêm với giá trị NULL hoặc mặc định. Dữ liệu cũ không bị mất.

### Bước 5: Khởi động Backend

```bash
# Từ thư mục backend
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

### Bước 6: Khởi động Frontend (Terminal mới)

Mở terminal mới:

```bash
cd frontend
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3000`

### Bước 7: Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:3000`

**Đăng nhập:**
- Username: `admin`
- Password: `admin123`

## 🐳 Chạy với Docker

### Cách 1: Chạy tất cả với Docker Compose

```bash
# Từ thư mục root
docker-compose up -d
```

### Cách 2: Chạy từng service

```bash
# Database
docker-compose up -d postgres

# Đợi database sẵn sàng, sau đó:
docker-compose up -d backend

# Frontend
docker-compose up -d frontend
```

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend

# Chỉ frontend
docker-compose logs -f frontend
```

### Rebuild sau khi thay đổi code

```bash
docker-compose down
docker-compose up -d --build
```

## 🔄 Cập nhật Database Schema

Nếu bạn đã chạy project trước đó và muốn áp dụng schema mới:

### Option 1: Tự động (Khuyến nghị)

Chỉ cần khởi động lại backend. Database sẽ tự động:
- Tạo các bảng mới nếu chưa có
- Thêm các cột mới vào bảng hiện có (nếu chưa có)

```bash
cd backend
npm run dev
```

### Option 2: Chạy migration thủ công

```bash
cd backend
npm run migrate
```

### Option 3: Reset database (⚠️ XÓA TẤT CẢ DỮ LIỆU)

Nếu muốn bắt đầu lại từ đầu:

```bash
# Với Docker
docker-compose down -v
docker-compose up -d

# Hoặc xóa database và tạo lại
psql -U postgres -c "DROP DATABASE sales_db;"
psql -U postgres -c "CREATE DATABASE sales_db;"
cd backend
npm run migrate
```

## ✅ Kiểm tra Project đã chạy đúng

### 1. Kiểm tra Backend

```bash
# Health check
curl http://localhost:5000/api/health

# Hoặc mở trình duyệt: http://localhost:5000/api/health
```

Kết quả mong đợi:
```json
{"status":"ok","message":"Server is running"}
```

### 2. Kiểm tra Database

```bash
# Kết nối database
psql -U postgres -d sales_db

# Kiểm tra các bảng mới
\dt

# Bạn sẽ thấy các bảng:
# - categories
# - promotions
# - product_promotions
# - suppliers
# - shipping_methods
# - inventory_transactions
# - activity_logs
```

### 3. Kiểm tra Frontend

Mở trình duyệt: `http://localhost:3000`

Kiểm tra:
- ✅ Đăng nhập được
- ✅ Thấy menu mới (Danh mục, Khuyến mãi, Kho hàng, Báo cáo)
- ✅ Có thể truy cập các trang mới

## 🐛 Troubleshooting

### Lỗi: "password authentication failed for user postgres"

**Đây là lỗi phổ biến nhất!** Xem file `FIX_DATABASE_AUTH.md` để biết cách sửa chi tiết.

**Cách nhanh:**
1. Kiểm tra mật khẩu PostgreSQL thực tế
2. Cập nhật `DB_PASSWORD` trong `backend/.env` cho đúng
3. Khởi động lại backend

### Lỗi: "Cannot connect to database"

```bash
# Kiểm tra PostgreSQL đang chạy
# Windows
pg_ctl status

# Linux
sudo service postgresql status

# Kiểm tra thông tin trong backend/.env
```

### Lỗi: "Table already exists"

Đây không phải lỗi. Database đã có bảng, chỉ cần tiếp tục.

### Lỗi: "Column already exists"

Đây không phải lỗi. Cột đã được thêm trước đó.

### Lỗi: Port đã được sử dụng

```bash
# Thay đổi port trong backend/.env hoặc frontend/vite.config.js
# Hoặc dừng process đang dùng port đó

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill
```

### Lỗi: Module not found

```bash
# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

## 📝 Lưu ý quan trọng

1. **Database Schema**: Các bảng mới sẽ được tạo tự động khi backend khởi động
2. **Dữ liệu cũ**: Dữ liệu hiện có sẽ được giữ nguyên
3. **Cột mới**: Các cột mới được thêm với giá trị NULL hoặc mặc định
4. **Migration**: Chạy `npm run migrate` nếu muốn đảm bảo schema đã được áp dụng

## 🎯 Quick Commands

```bash
# Chạy tất cả (development)
npm run dev

# Chỉ backend
cd backend && npm run dev

# Chỉ frontend
cd frontend && npm run dev

# Migration
cd backend && npm run migrate

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## 📞 Cần giúp đỡ?

Nếu gặp vấn đề:
1. Kiểm tra logs: `docker-compose logs` hoặc console output
2. Kiểm tra file `.env` đã cấu hình đúng
3. Kiểm tra PostgreSQL đang chạy
4. Xem file `README.md` và `DEPLOYMENT.md` để biết thêm chi tiết

