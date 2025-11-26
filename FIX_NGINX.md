# Sửa lỗi Nginx SSL Certificate

## Vấn đề
Nginx báo lỗi không tìm thấy SSL certificate:
```
cannot load certificate "/etc/letsencrypt/live/sale.thuanchay.vn/fullchain.pem": No such file or directory
```

## Nguyên nhân
File cấu hình Nginx đang tham chiếu đến SSL certificate chưa được tạo.

## Giải pháp

### Bước 1: Sử dụng cấu hình HTTP tạm thời

```bash
# Copy lại file cấu hình không có SSL
sudo cp nginx/sale.thuanchay.vn.conf /etc/nginx/sites-available/sale.thuanchay.vn.conf

# Kiểm tra cấu hình
sudo nginx -t

# Nếu OK, reload Nginx
sudo systemctl reload nginx
```

### Bước 2: Đảm bảo ứng dụng đang chạy

```bash
# Kiểm tra Docker containers
docker-compose ps

# Nếu chưa chạy, khởi động
docker-compose up -d
```

### Bước 3: Kiểm tra DNS đã trỏ đúng

```bash
# Kiểm tra DNS
dig sale.thuanchay.vn
# hoặc
nslookup sale.thuanchay.vn
```

Đảm bảo domain trỏ về IP của VPS.

### Bước 4: Cài đặt SSL Certificate

```bash
# Cài đặt Certbot (nếu chưa có)
sudo apt install certbot python3-certbot-nginx -y

# Lấy SSL certificate
sudo certbot --nginx -d sale.thuanchay.vn
```

Certbot sẽ:
- Tạo SSL certificate
- Tự động cập nhật cấu hình Nginx
- Thêm redirect HTTP -> HTTPS
- Reload Nginx

### Bước 5: Kiểm tra lại

```bash
# Kiểm tra cấu hình
sudo nginx -t

# Xem cấu hình đã được cập nhật
sudo cat /etc/nginx/sites-available/sale.thuanchay.vn.conf
```

## Lưu ý

1. **Không chỉnh sửa thủ công** file cấu hình sau khi Certbot chạy
2. **Đảm bảo DNS đã propagate** trước khi chạy Certbot (có thể mất vài phút đến vài giờ)
3. **Mở port 80 và 443** trên firewall:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## Renewal SSL Certificate

SSL certificate tự động hết hạn sau 90 ngày. Certbot tự động renew, nhưng bạn có thể test:

```bash
# Test renewal
sudo certbot renew --dry-run

# Renew thủ công (nếu cần)
sudo certbot renew
```

## Troubleshooting

### Lỗi: Domain không resolve
- Kiểm tra DNS settings
- Đợi DNS propagate
- Kiểm tra firewall

### Lỗi: Port 80 bị chặn
```bash
# Kiểm tra port
sudo netstat -tulpn | grep :80

# Mở port trên firewall
sudo ufw allow 80/tcp
```

### Lỗi: Nginx không reload
```bash
# Xem logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

