# Sửa lỗi 502 Bad Gateway

## 🔴 Lỗi: 502 Bad Gateway

Lỗi này xảy ra khi frontend không thể kết nối đến backend hoặc backend crash.

## ⚡ Giải pháp nhanh (3 bước)

### Bước 1: Kiểm tra Backend có chạy không

Mở terminal và chạy:
```bash
cd backend
npm run dev
```

Bạn sẽ thấy:
```
✅ Server running on port 5000
✅ Database connection established
```

**Nếu không thấy:** Backend chưa chạy → Khởi động backend

### Bước 2: Kiểm tra Health Check

Mở browser hoặc dùng curl:
```bash
curl http://localhost:5000/api/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "message": "Server is running",
  "database": "connected"
}
```

**Nếu lỗi:** Xem logs để tìm nguyên nhân

### Bước 3: Kiểm tra Logs

Xem console của backend để tìm lỗi:
- ❌ Unhandled error
- ❌ Database connection failed
- ❌ Uncaught Exception

## 🔍 Nguyên nhân thường gặp

### 1. Backend không chạy
**Triệu chứng:** Không thấy "Server running on port 5000"
**Giải pháp:** 
```bash
cd backend
npm run dev
```

### 2. Database không kết nối
**Triệu chứng:** "Database connection failed"
**Giải pháp:** 
- Kiểm tra file `backend/.env`
- Kiểm tra PostgreSQL đang chạy
- Xem `DATABASE_CONNECTION_FIX.md`

### 3. Backend crash do lỗi code
**Triệu chứng:** "Uncaught Exception" trong logs
**Giải pháp:**
- Xem stack trace để tìm lỗi
- Kiểm tra syntax errors
- Kiểm tra missing dependencies

### 4. Port bị chiếm
**Triệu chứng:** "EADDRINUSE: address already in use"
**Giải pháp:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9
```

### 5. Thiếu dependencies
**Triệu chứng:** "Cannot find module"
**Giải pháp:**
```bash
cd backend
npm install
```

## 🛠️ Debug Steps

### 1. Kiểm tra Backend Status
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test root endpoint
curl http://localhost:5000/
```

### 2. Kiểm tra Database
```bash
cd backend
npm run test-db
```

### 3. Xem Backend Logs
Trong terminal chạy backend, tìm:
- ✅ Success messages
- ❌ Error messages
- ⚠️ Warning messages

### 4. Kiểm tra Network
```bash
# Test if port is open
telnet localhost 5000

# Or
netstat -an | grep 5000
```

## 📋 Checklist

- [ ] Backend đang chạy (port 5000)
- [ ] Database đã kết nối
- [ ] Không có lỗi trong console
- [ ] `/api/health` trả về "ok"
- [ ] Frontend có thể gọi API
- [ ] Browser console không có lỗi CORS

## 🆘 Nếu vẫn lỗi

### 1. Restart Backend
```bash
# Stop backend (Ctrl+C)
# Start lại
cd backend
npm run dev
```

### 2. Clear và Reinstall
```bash
cd backend
rm -rf node_modules
npm install
npm run dev
```

### 3. Kiểm tra Environment Variables
```bash
cd backend
cat .env
```

Đảm bảo có:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

### 4. Xem Detailed Logs
Backend sẽ log:
- Request/Response
- Database queries
- Errors với stack trace

## 🔧 Cải thiện đã thêm

1. **Better Error Handling**: Server không crash khi có lỗi
2. **Database Check**: Kiểm tra connection trước khi xử lý
3. **Detailed Logging**: Log chi tiết để debug
4. **Graceful Degradation**: Server vẫn chạy khi DB lỗi (degraded mode)

## 📝 Logs cần kiểm tra

### Backend Console:
```
✅ Server running on port 5000
✅ Database connection established
❌ Create order error: ...
❌ Database pool not initialized
```

### Browser Console (F12):
- Network tab → Xem request status
- Console tab → Xem error messages

