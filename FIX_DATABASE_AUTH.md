# Sửa lỗi Database Authentication

## 🔴 Lỗi: "password authentication failed for user postgres"

Lỗi này xảy ra khi mật khẩu trong file `.env` không khớp với mật khẩu PostgreSQL.

## ✅ Cách sửa

### Bước 1: Kiểm tra file .env

Đảm bảo bạn đã tạo file `backend/.env`:

```bash
cd backend
ls -la .env
```

Nếu chưa có, tạo từ file mẫu:

```bash
cp .env.example .env
```

### Bước 2: Kiểm tra mật khẩu PostgreSQL

#### Trên VPS/Server:

```bash
# Kiểm tra mật khẩu PostgreSQL hiện tại
sudo -u postgres psql -c "\password postgres"
```

Hoặc kiểm tra trong file cấu hình PostgreSQL:

```bash
# Xem file pg_hba.conf
sudo cat /etc/postgresql/*/main/pg_hba.conf
```

#### Với Docker:

Nếu dùng Docker Compose, mật khẩu được set trong file `.env` ở root:

```bash
# Kiểm tra file .env ở root
cat .env
```

Mật khẩu trong `.env` phải khớp với `POSTGRES_PASSWORD` trong `docker-compose.yml`.

### Bước 3: Cập nhật file backend/.env

Chỉnh sửa file `backend/.env`:

```bash
cd backend
nano .env
```

Cập nhật mật khẩu đúng:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_db
DB_USER=postgres
DB_PASSWORD=your_actual_postgres_password_here  # ← Sửa mật khẩu này
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
```

### Bước 4: Test kết nối database

```bash
# Test kết nối trực tiếp
psql -U postgres -d sales_db -h localhost

# Hoặc
psql -U postgres -h localhost
```

Nếu kết nối thành công, bạn sẽ thấy prompt `postgres=#`

### Bước 5: Reset mật khẩu PostgreSQL (nếu cần)

#### Trên Linux:

```bash
# Đăng nhập với quyền root
sudo -u postgres psql

# Trong psql prompt:
ALTER USER postgres WITH PASSWORD 'new_password_here';
\q

# Sau đó cập nhật file backend/.env với mật khẩu mới
```

#### Với Docker:

```bash
# Dừng container
docker-compose down

# Xóa volume (⚠️ XÓA DỮ LIỆU)
docker-compose down -v

# Cập nhật mật khẩu trong file .env ở root
nano .env
# Thay đổi DB_PASSWORD=your_new_password

# Khởi động lại
docker-compose up -d
```

### Bước 6: Khởi động lại Backend

```bash
cd backend
npm run dev
```

## 🔧 Các trường hợp khác

### Trường hợp 1: Database chưa được tạo

```bash
# Tạo database
sudo -u postgres createdb sales_db

# Hoặc với psql
sudo -u postgres psql
CREATE DATABASE sales_db;
\q
```

### Trường hợp 2: User postgres không tồn tại

```bash
sudo -u postgres psql
CREATE USER postgres WITH PASSWORD 'your_password';
ALTER USER postgres WITH SUPERUSER;
\q
```

### Trường hợp 3: Với Docker Compose

Đảm bảo mật khẩu trong các file khớp nhau:

**File `.env` ở root:**
```env
DB_PASSWORD=my_secure_password
```

**File `docker-compose.yml`:**
```yaml
environment:
  POSTGRES_PASSWORD: ${DB_PASSWORD:-change_this_password}
```

**File `backend/.env`:**
```env
DB_PASSWORD=my_secure_password
```

### Trường hợp 4: PostgreSQL chưa chạy

```bash
# Kiểm tra service
sudo systemctl status postgresql

# Khởi động nếu chưa chạy
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 🧪 Test kết nối

### Test từ command line:

```bash
# Test với psql
psql -U postgres -h localhost -d sales_db

# Nếu thành công, bạn sẽ thấy:
# sales_db=#
```

### Test từ Node.js:

Tạo file test `backend/test-db.js`:

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connection successful!', res.rows[0]);
  }
  pool.end();
});
```

Chạy test:

```bash
cd backend
node test-db.js
```

## 📝 Checklist

- [ ] File `backend/.env` đã được tạo
- [ ] Mật khẩu trong `.env` khớp với mật khẩu PostgreSQL
- [ ] PostgreSQL đang chạy
- [ ] Database `sales_db` đã được tạo
- [ ] User `postgres` có quyền truy cập
- [ ] Port 5432 không bị chặn bởi firewall

## 🔒 Bảo mật

**Lưu ý quan trọng:**
- Không commit file `.env` lên Git
- Sử dụng mật khẩu mạnh cho production
- File `.env` đã được thêm vào `.gitignore`

## 🆘 Vẫn không được?

1. **Kiểm tra logs PostgreSQL:**
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

2. **Kiểm tra pg_hba.conf:**
   ```bash
   sudo cat /etc/postgresql/*/main/pg_hba.conf
   ```
   
   Đảm bảo có dòng:
   ```
   local   all             postgres                                md5
   host    all             postgres        127.0.0.1/32            md5
   ```

3. **Restart PostgreSQL:**
   ```bash
   sudo systemctl restart postgresql
   ```

4. **Kiểm tra firewall:**
   ```bash
   sudo ufw status
   # Nếu cần, mở port 5432
   sudo ufw allow 5432/tcp
   ```

