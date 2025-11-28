# Hướng dẫn sửa lỗi kết nối Database

## 🔴 Lỗi thường gặp

### 1. ECONNREFUSED (Connection Refused)
**Lỗi:** `Error: connect ECONNREFUSED ::1:5432` hoặc `ECONNREFUSED 127.0.0.1:5432`

**Nguyên nhân:** PostgreSQL chưa chạy hoặc không lắng nghe trên port 5432

**Giải pháp:**

#### A. Nếu dùng Docker:
```bash
# Kiểm tra containers
docker-compose ps

# Khởi động PostgreSQL
docker-compose up -d postgres

# Kiểm tra logs
docker-compose logs postgres
```

#### B. Nếu chạy local (Windows):
```powershell
# Kiểm tra service
Get-Service -Name postgresql*

# Khởi động service
Start-Service postgresql-x64-15  # Thay số version phù hợp
```

#### C. Nếu chạy local (Linux):
```bash
# Kiểm tra status
sudo systemctl status postgresql

# Khởi động
sudo systemctl start postgresql

# Hoặc
sudo service postgresql start
```

### 2. 502 Bad Gateway
**Lỗi:** Frontend không kết nối được với backend

**Nguyên nhân:** Backend không chạy hoặc lỗi kết nối database

**Giải pháp:**

1. **Kiểm tra backend có chạy không:**
```bash
cd backend
npm run dev
```

2. **Kiểm tra kết nối database:**
```bash
npm run test-db
```

3. **Kiểm tra file .env:**
```bash
# Tạo file .env nếu chưa có
cp .env.example .env

# Chỉnh sửa với thông tin đúng
nano .env
```

### 3. Password Authentication Failed
**Lỗi:** `password authentication failed for user postgres`

**Giải pháp:**

1. **Kiểm tra mật khẩu trong .env:**
```env
DB_PASSWORD=your_actual_password
```

2. **Reset mật khẩu PostgreSQL:**
```bash
# Với Docker
docker-compose exec postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new_password';"

# Với local PostgreSQL
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

### 4. Database does not exist
**Lỗi:** `database "sales_db" does not exist`

**Giải pháp:**
```bash
# Tạo database
cd backend
npm run migrate
```

## 🔧 Các bước kiểm tra

### Bước 1: Kiểm tra file .env
```bash
cd backend
cat .env
```

Đảm bảo có các biến:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### Bước 2: Test kết nối database
```bash
cd backend
npm run test-db
```

### Bước 3: Kiểm tra PostgreSQL đang chạy
```bash
# Windows
netstat -an | findstr 5432

# Linux/Mac
netstat -an | grep 5432
# hoặc
ss -tulpn | grep 5432
```

### Bước 4: Kiểm tra backend logs
```bash
cd backend
npm run dev
```

Xem có lỗi gì trong console.

## 📝 Tạo file .env

Nếu chưa có file `.env`:

```bash
cd backend
cp .env.example .env
```

Sau đó chỉnh sửa với thông tin database của bạn.

## 🐳 Với Docker

Nếu dùng Docker, đảm bảo:

1. **Tạo file .env ở root:**
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret
```

2. **Khởi động services:**
```bash
docker-compose up -d postgres
# Đợi vài giây để PostgreSQL khởi động
docker-compose up -d backend
```

3. **Kiểm tra logs:**
```bash
docker-compose logs postgres
docker-compose logs backend
```

## ✅ Checklist

- [ ] File `backend/.env` đã được tạo
- [ ] PostgreSQL đang chạy (port 5432)
- [ ] Mật khẩu trong .env đúng
- [ ] Database `sales_db` đã được tạo
- [ ] Backend có thể kết nối database (npm run test-db)
- [ ] Backend server đang chạy (npm run dev)


