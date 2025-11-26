# Hướng dẫn sửa lỗi Docker Build

## Vấn đề
Lỗi `npm install` trong Docker build do vấn đề kết nối mạng (ECONNRESET).

## Giải pháp đã áp dụng

### 1. Cấu hình npm trong Dockerfile
- Thêm retry mechanism (5 lần)
- Tăng timeout (20s - 120s)
- Sử dụng `npm ci` với fallback

### 2. Nếu vẫn lỗi, thử các cách sau:

#### Cách 1: Build với network mode host (Linux/Mac)
```bash
docker-compose build --network=host
```

#### Cách 2: Sử dụng proxy (nếu đang dùng proxy)
Tạo file `.env` trong thư mục root:
```env
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

Sau đó cập nhật `docker-compose.yml`:
```yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile
    args:
      HTTP_PROXY: ${HTTP_PROXY}
      HTTPS_PROXY: ${HTTPS_PROXY}
  environment:
    HTTP_PROXY: ${HTTP_PROXY}
    HTTPS_PROXY: ${HTTPS_PROXY}
```

#### Cách 3: Sử dụng npm cache từ host
Cập nhật `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy npm cache if exists
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps || npm install --legacy-peer-deps

COPY . .
RUN npm run build
```

#### Cách 4: Build không dùng Docker (development)
```bash
cd frontend
npm install
npm run build
```

Sau đó chỉ chạy backend và database bằng Docker:
```bash
docker-compose up postgres backend
```

## Kiểm tra kết nối
```bash
# Test npm registry
docker run --rm node:18-alpine npm ping

# Test với network
docker run --rm node:18-alpine wget -O- https://registry.npmjs.org/
```

## Lệnh build lại
```bash
# Xóa cache và build lại
docker-compose build --no-cache frontend

# Hoặc build từng service
docker-compose build frontend
```

