# Hướng dẫn Deployment lên VPS Ubuntu

## Bước 1: Chuẩn bị VPS

### Yêu cầu hệ thống
- Ubuntu 20.04+ hoặc 22.04
- Tối thiểu 2GB RAM
- Tối thiểu 20GB dung lượng
- Quyền root hoặc sudo

### Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

## Bước 2: Cài đặt Docker và Docker Compose

```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào group docker (không cần sudo)
sudo usermod -aG docker $USER

# Cài đặt Docker Compose
sudo apt install docker-compose -y

# Khởi động lại để áp dụng thay đổi
newgrp docker
```

## Bước 3: Cài đặt Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Bước 4: Clone project

```bash
# Clone repository
git clone <your-repo-url> tcpf
cd tcpf
```

## Bước 5: Cấu hình môi trường

```bash
# Tạo file .env
nano .env
```

Thêm nội dung:
```env
DB_PASSWORD=your_secure_database_password_here
JWT_SECRET=your_secure_jwt_secret_key_here
```

**Lưu ý:** Sử dụng mật khẩu mạnh, có thể dùng lệnh sau để tạo:
```bash
openssl rand -base64 32
```

## Bước 6: Cấu hình Nginx

```bash
# Copy file cấu hình
sudo cp nginx/sale.thuanchay.vn.conf /etc/nginx/sites-available/sale.thuanchay.vn.conf

# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/sale.thuanchay.vn.conf /etc/nginx/sites-enabled/

# Xóa cấu hình mặc định (nếu cần)
sudo rm /etc/nginx/sites-enabled/default

# Kiểm tra cấu hình
sudo nginx -t
```

## Bước 7: Cấu hình DNS

Trỏ domain `sale.thuanchay.vn` về IP của VPS:
- Loại: A Record
- Tên: sale (hoặc @)
- Giá trị: IP của VPS
- TTL: 3600 (hoặc mặc định)

Đợi DNS propagate (có thể mất vài phút đến vài giờ).

## Bước 8: Cài đặt SSL Certificate

```bash
# Cài đặt Certbot
sudo apt install certbot python3-certbot-nginx -y

# Lấy SSL certificate
sudo certbot --nginx -d sale.thuanchay.vn

# Certbot sẽ tự động cấu hình SSL và redirect HTTP -> HTTPS
```

## Bước 9: Chạy ứng dụng

### Cách 1: Sử dụng script tự động
```bash
chmod +x deploy.sh
bash deploy.sh
```

### Cách 2: Chạy thủ công
```bash
# Build và chạy containers
docker-compose up -d --build

# Xem logs
docker-compose logs -f
```

## Bước 10: Kiểm tra

1. Truy cập: `https://sale.thuanchay.vn`
2. Đăng nhập với:
   - Username: `admin`
   - Password: `admin123`
3. **QUAN TRỌNG:** Đổi mật khẩu ngay sau khi đăng nhập!

## Các lệnh hữu ích

### Xem logs
```bash
# Tất cả services
docker-compose logs -f

# Chỉ backend
docker-compose logs -f backend

# Chỉ frontend
docker-compose logs -f frontend

# Chỉ database
docker-compose logs -f postgres
```

### Dừng ứng dụng
```bash
docker-compose down
```

### Khởi động lại
```bash
docker-compose restart
```

### Cập nhật ứng dụng
```bash
# Pull code mới
git pull

# Rebuild và restart
docker-compose down
docker-compose up -d --build
```

### Backup database
```bash
docker-compose exec postgres pg_dump -U postgres sales_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore database
```bash
docker-compose exec -T postgres psql -U postgres sales_db < backup_file.sql
```

## Cấu hình Firewall

```bash
# Cài đặt UFW (nếu chưa có)
sudo apt install ufw -y

# Cho phép SSH
sudo ufw allow 22/tcp

# Cho phép HTTP và HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bật firewall
sudo ufw enable

# Kiểm tra trạng thái
sudo ufw status
```

## Troubleshooting

### Lỗi kết nối database
```bash
# Kiểm tra container database
docker-compose ps postgres

# Xem logs database
docker-compose logs postgres

# Kiểm tra kết nối
docker-compose exec postgres psql -U postgres -d sales_db
```

### Lỗi SSL certificate
- Đảm bảo DNS đã trỏ đúng về VPS
- Kiểm tra port 80 và 443 đã mở
- Chạy lại: `sudo certbot --nginx -d sale.thuanchay.vn --force-renewal`

### Lỗi Nginx
```bash
# Kiểm tra cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Xem logs
sudo tail -f /var/log/nginx/error.log
```

### Container không khởi động
```bash
# Xem logs chi tiết
docker-compose logs

# Kiểm tra trạng thái
docker-compose ps

# Xóa và tạo lại containers
docker-compose down -v
docker-compose up -d --build
```

## Bảo mật

1. **Đổi mật khẩu mặc định** ngay sau khi deploy
2. **Cập nhật JWT_SECRET** trong file `.env`
3. **Cập nhật DB_PASSWORD** mạnh
4. **Bật firewall** và chỉ mở các port cần thiết
5. **Cập nhật hệ thống** thường xuyên:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
6. **Backup database** định kỳ
7. **Giám sát logs** để phát hiện bất thường

## Monitoring

### Xem tài nguyên sử dụng
```bash
docker stats
```

### Xem dung lượng
```bash
docker system df
```

### Dọn dẹp
```bash
# Xóa images không dùng
docker image prune -a

# Xóa volumes không dùng
docker volume prune
```

## Support

Nếu gặp vấn đề, kiểm tra:
1. Logs của containers
2. Logs của Nginx
3. Trạng thái services
4. Cấu hình firewall
5. DNS settings

