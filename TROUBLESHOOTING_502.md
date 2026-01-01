# Troubleshooting 502 Bad Gateway

## Nguyên nhân phổ biến

### 1. Backend không chạy
Kiểm tra backend có đang chạy không:
```bash
# Kiểm tra process
ps aux | grep node

# Hoặc với Docker
docker-compose ps
docker-compose logs backend
```

### 2. Backend chưa khởi động xong
Backend cần thời gian để kết nối database. Đợi vài giây sau khi start.

### 3. Port conflict
Kiểm tra port 5000 có bị chiếm không:
```bash
netstat -tulpn | grep 5000
# Hoặc
lsof -i :5000
```

### 4. Database connection failed
Backend không thể kết nối database:
```bash
# Kiểm tra database
docker-compose logs postgres
docker-compose exec postgres pg_isready -U postgres

# Kiểm tra backend logs
docker-compose logs backend
```

## Cách sửa

### 1. Khởi động lại services
```bash
# Dừng tất cả
docker-compose down

# Khởi động lại
docker-compose up -d

# Xem logs
docker-compose logs -f backend
```

### 2. Kiểm tra backend health
```bash
# Test backend trực tiếp
curl http://localhost:5000/api/health

# Hoặc từ container
docker-compose exec backend node scripts/check-backend.js
```

### 3. Kiểm tra nginx config
```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
# Hoặc
sudo nginx -s reload
```

### 4. Kiểm tra firewall
```bash
# Kiểm tra firewall rules
sudo ufw status
sudo iptables -L -n | grep 5000
```

### 5. Kiểm tra backend logs
```bash
# Xem logs real-time
docker-compose logs -f backend

# Hoặc nếu chạy trực tiếp
cd backend
npm start
```

## Cấu hình nginx đúng

Nginx config phải có:
```nginx
location /api {
    proxy_pass http://localhost:5000;  # KHÔNG có /api ở cuối
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

## Quick Fix

1. **Kiểm tra backend:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Nếu backend không chạy:**
   ```bash
   docker-compose up -d backend
   # Hoặc
   cd backend && npm start
   ```

3. **Reload nginx:**
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. **Kiểm tra lại:**
   ```bash
   curl https://sale.thuanchay.vn/api/health
   ```

## Debug Commands

```bash
# Check backend status
docker-compose ps backend

# Check backend logs
docker-compose logs --tail=100 backend

# Check nginx error logs
sudo tail -f /var/log/nginx/sale.thuanchay.vn.error.log

# Test backend connection
telnet localhost 5000
# Hoặc
nc -zv localhost 5000
```

