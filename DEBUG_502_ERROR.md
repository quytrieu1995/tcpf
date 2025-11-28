# Hướng dẫn Debug Lỗi 502 Bad Gateway

## 🔴 Lỗi: 502 Bad Gateway khi lưu sản phẩm

Lỗi này xảy ra khi frontend không thể kết nối đến backend hoặc backend gặp lỗi.

## 🔍 Các bước kiểm tra

### Bước 1: Kiểm tra Backend có đang chạy không

```bash
# Kiểm tra process
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
# hoặc
ps aux | grep node
```

**Nếu backend không chạy:**
```bash
cd backend
npm run dev
```

### Bước 2: Kiểm tra Database Connection

```bash
cd backend
npm run test-db
```

**Nếu database không kết nối được:**
- Kiểm tra PostgreSQL có đang chạy không
- Kiểm tra file `backend/.env` có đúng cấu hình không
- Xem `DATABASE_CONNECTION_FIX.md` để biết thêm chi tiết

### Bước 3: Kiểm tra Backend Logs

Xem console output của backend để tìm lỗi cụ thể:

```bash
cd backend
npm run dev
```

Tìm các lỗi như:
- `Database connection failed`
- `ECONNREFUSED`
- `ETIMEDOUT`
- `SyntaxError`
- `ReferenceError`

### Bước 4: Test API trực tiếp

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test create product (cần token)
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"Test Product","price":100000,"stock":10}'
```

### Bước 5: Kiểm tra Browser Console

Mở Developer Tools (F12) và xem:
- **Console tab:** Có lỗi JavaScript không?
- **Network tab:** 
  - Request có được gửi không?
  - Status code là gì?
  - Response là gì?

## 🛠️ Các nguyên nhân thường gặp

### 1. Backend không chạy
**Triệu chứng:** Tất cả API calls trả về 502

**Giải pháp:**
```bash
cd backend
npm run dev
```

### 2. Database Connection Issue
**Triệu chứng:** Backend chạy nhưng API trả về 503 hoặc 502

**Giải pháp:**
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra `.env` file
- Chạy `npm run test-db`

### 3. Port bị chiếm
**Triệu chứng:** Backend không khởi động được

**Giải pháp:**
```bash
# Windows
netstat -ano | findstr :5000
# Tìm PID và kill process

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### 4. CORS Issue
**Triệu chứng:** Request bị block trong browser console

**Giải pháp:**
Kiểm tra `backend/server.js` có cấu hình CORS đúng không:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 5. Syntax Error trong Backend
**Triệu chứng:** Backend crash ngay khi khởi động

**Giải pháp:**
- Kiểm tra console logs
- Tìm lỗi syntax trong code
- Sửa lỗi và restart backend

## 📝 Logging đã được cải thiện

Sau khi cập nhật, backend sẽ log chi tiết hơn:
- Error message
- Error code
- Error detail
- Stack trace
- Request details

Xem logs trong console của backend để biết lỗi cụ thể.

## ✅ Checklist Debug

- [ ] Backend đang chạy trên port 5000
- [ ] Database đã kết nối thành công
- [ ] File `.env` có đúng cấu hình
- [ ] Không có lỗi syntax trong backend code
- [ ] CORS đã được cấu hình đúng
- [ ] Frontend có thể gọi `/api/health` thành công
- [ ] Browser console không có lỗi CORS
- [ ] Network tab cho thấy request được gửi

## 🆘 Nếu vẫn không được

1. **Restart cả backend và frontend**
2. **Clear browser cache**
3. **Kiểm tra firewall/antivirus**
4. **Thử browser khác**
5. **Kiểm tra backend logs chi tiết**

## 📞 Thông tin Debug

Khi báo lỗi, cung cấp:
1. Backend console logs
2. Browser console errors
3. Network tab request/response
4. Database connection status
5. Backend version và Node version

