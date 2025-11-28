# Hướng dẫn sửa lỗi Frontend không kết nối được Backend

## 🔴 Lỗi thường gặp

### 1. 502 Bad Gateway
**Lỗi:** `Failed to load resource: the server responded with a status of 502 (Bad Gateway)`

**Nguyên nhân:** Backend không chạy hoặc không thể truy cập

**Giải pháp:**

#### A. Kiểm tra Backend có đang chạy không:
```bash
cd backend
npm run dev
```

Backend phải chạy trên port 5000 (mặc định).

#### B. Kiểm tra kết nối:
```bash
# Test backend health endpoint
curl http://localhost:5000/api/health

# Hoặc mở browser
# http://localhost:5000/api/health
```

#### C. Kiểm tra port 5000 có bị chiếm không:
```bash
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

### 2. CORS Error
**Lỗi:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Giải pháp:**

Đảm bảo trong `backend/server.js` có cấu hình CORS:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 3. Network Error / Connection Refused
**Lỗi:** `Network Error` hoặc `ECONNREFUSED`

**Giải pháp:**

1. **Kiểm tra backend đang chạy:**
```bash
cd backend
npm run dev
```

2. **Kiểm tra file .env trong backend:**
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_db
DB_USER=postgres
DB_PASSWORD=your_password
```

3. **Kiểm tra database connection:**
```bash
cd backend
npm run test-db
```

### 4. Proxy không hoạt động (Development)
**Lỗi:** Frontend không thể gọi API trong dev mode

**Giải pháp:**

Đảm bảo `frontend/vite.config.js` có cấu hình proxy:
```javascript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
```

## 🔧 Các bước kiểm tra

### Bước 1: Kiểm tra Backend
```bash
# Terminal 1: Chạy backend
cd backend
npm install  # Nếu chưa cài
npm run dev
```

Bạn sẽ thấy:
```
Server running on port 5000
✅ Database connection established
```

### Bước 2: Kiểm tra Frontend
```bash
# Terminal 2: Chạy frontend
cd frontend
npm install  # Nếu chưa cài
npm run dev
```

Frontend sẽ chạy trên `http://localhost:3000`

### Bước 3: Test kết nối
Mở browser và truy cập:
- Frontend: http://localhost:3000
- Backend Health: http://localhost:5000/api/health
- Backend Root: http://localhost:5000/

### Bước 4: Kiểm tra Console
Mở Developer Tools (F12) và xem:
- **Console tab:** Có lỗi gì không?
- **Network tab:** API calls có thành công không?

## 📝 Cấu hình môi trường

### Development
Frontend tự động proxy `/api` → `http://localhost:5000` qua Vite config.

### Production
Cần set biến môi trường:
```bash
# frontend/.env
VITE_API_URL=http://your-backend-url:5000
```

Hoặc cấu hình nginx để proxy `/api` đến backend.

## 🐳 Với Docker

Nếu dùng Docker Compose:

1. **Khởi động tất cả services:**
```bash
docker-compose up -d
```

2. **Kiểm tra containers:**
```bash
docker-compose ps
```

3. **Xem logs:**
```bash
docker-compose logs backend
docker-compose logs frontend
```

4. **Kiểm tra network:**
```bash
docker network ls
docker network inspect tcpf_default
```

## ✅ Checklist

- [ ] Backend đang chạy trên port 5000
- [ ] Database đã được kết nối (npm run test-db)
- [ ] Frontend đang chạy trên port 3000
- [ ] CORS đã được cấu hình đúng
- [ ] Vite proxy config đúng (dev mode)
- [ ] Không có firewall block port 5000
- [ ] Backend health endpoint trả về OK

## 🆘 Debug Tips

### 1. Kiểm tra Backend logs
Xem console output của backend để biết lỗi cụ thể.

### 2. Kiểm tra Network tab
Trong Developer Tools > Network:
- Xem request có được gửi không?
- Status code là gì?
- Response là gì?

### 3. Test API trực tiếp
```bash
# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test health
curl http://localhost:5000/api/health
```

### 4. Kiểm tra file api.js
Đảm bảo `frontend/src/config/api.js` có baseURL đúng:
- Development: `http://localhost:5000`
- Production: `/api` (nếu dùng nginx proxy)

## 📞 Nếu vẫn không được

1. **Restart cả backend và frontend**
2. **Clear browser cache**
3. **Kiểm tra firewall/antivirus**
4. **Thử browser khác**
5. **Kiểm tra port không bị conflict**

