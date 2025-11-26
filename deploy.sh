#!/bin/bash

# Script deployment cho VPS Ubuntu
# Sử dụng: bash deploy.sh

echo "🚀 Bắt đầu deployment Sales Dashboard..."

# Kiểm tra Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được cài đặt. Vui lòng cài đặt Docker trước."
    exit 1
fi

# Kiểm tra Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose chưa được cài đặt. Vui lòng cài đặt Docker Compose trước."
    exit 1
fi

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo "⚠️  File .env không tồn tại. Tạo file .env mới..."
    cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
EOF
    echo "✅ Đã tạo file .env với mật khẩu ngẫu nhiên"
    echo "⚠️  VUI LÒNG LƯU LẠI CÁC GIÁ TRỊ TRONG FILE .env"
fi

# Build và chạy containers
echo "📦 Đang build và khởi động containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Đợi database sẵn sàng
echo "⏳ Đang đợi database khởi động..."
sleep 10

# Kiểm tra containers
echo "🔍 Kiểm tra trạng thái containers..."
docker-compose ps

echo ""
echo "✅ Deployment hoàn tất!"
echo ""
echo "📋 Thông tin truy cập:"
echo "   - Backend API: http://localhost:5000"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "📝 Đăng nhập mặc định:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo "⚠️  VUI LÒNG ĐỔI MẬT KHẨU SAU KHI ĐĂNG NHẬP!"
echo ""
echo "📊 Xem logs: docker-compose logs -f"
echo "🛑 Dừng ứng dụng: docker-compose down"

