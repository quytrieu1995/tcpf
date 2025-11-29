# Quick Fix: Lỗi 502 Bad Gateway

## 🚨 Lỗi: 502 Bad Gateway khi fetch products/categories

## ⚡ Giải pháp nhanh (3 bước)

### Bước 1: Kiểm tra Backend có chạy không

Mở terminal và chạy:
```bash
cd backend
npm run dev
```

Bạn sẽ thấy:
```
Server running on port 5000
✅ Database connection established
```

**Nếu không thấy:** Backend chưa chạy → Khởi động backend

### Bước 2: Kiểm tra Database

Trong terminal backend, nếu thấy lỗi database:
```bash
cd backend
npm run test-db
```

**Nếu lỗi:** Xem `DATABASE_CONNECTION_FIX.md`

### Bước 3: Refresh Frontend

Sau khi backend chạy, refresh browser (F5)

## 🔍 Kiểm tra nhanh

### Test Backend Health:
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

### Test Products API:
```bash
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## ✅ Checklist

- [ ] Backend đang chạy (port 5000)
- [ ] Database đã kết nối
- [ ] Frontend có thể gọi `/api/health`
- [ ] Browser console không có lỗi CORS

## 🆘 Nếu vẫn lỗi

1. **Xem backend logs** - Tìm lỗi cụ thể
2. **Kiểm tra port 5000** - Có bị chiếm không?
3. **Restart cả backend và frontend**
4. **Clear browser cache**

## 📝 Logs cần kiểm tra

### Backend Console:
- `Server running on port 5000` ✅
- `Database connection established` ✅
- `Get products error:` ❌ (nếu có)

### Browser Console (F12):
- Network tab → Xem request status
- Console tab → Xem error messages

