# Sales Dashboard - Hệ thống quản lý bán hàng

Dashboard quản lý bán hàng hiện đại với giao diện đẹp và đầy đủ tính năng.

## 🚀 Tính năng

### Core Features
- ✅ Dashboard với thống kê và biểu đồ trực quan
- ✅ Quản lý sản phẩm nâng cao (SKU, barcode, giá vốn, nhà cung cấp)
- ✅ Quản lý đơn hàng với nhiều trạng thái
- ✅ Quản lý khách hàng
- ✅ Xác thực người dùng với JWT
- ✅ Responsive design
- ✅ API RESTful đầy đủ

### Ecommerce Features
- ✅ **Quản lý Danh mục**: Danh mục đa cấp, phân loại sản phẩm
- ✅ **Hệ thống Khuyến mãi**: Giảm giá %, số tiền cố định, miễn phí ship
- ✅ **Quản lý Kho hàng**: Theo dõi tồn kho, cảnh báo, lịch sử giao dịch
- ✅ **Báo cáo & Phân tích**: Doanh thu, sản phẩm bán chạy, khách hàng VIP
- ✅ **Quản lý Vận chuyển**: Phương thức vận chuyển, tính phí tự động
- ✅ **Quản lý Nhà cung cấp**: Thông tin nhà cung cấp, gán cho sản phẩm
- ✅ **Export/Import**: Xuất dữ liệu ra CSV/Excel

Xem chi tiết trong [FEATURES.md](./FEATURES.md)

## 🛠️ Công nghệ

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- RESTful API

### Frontend
- React 18
- Vite
- Tailwind CSS
- Recharts (biểu đồ)
- React Router

### Deployment
- Docker & Docker Compose
- Nginx reverse proxy
- SSL/HTTPS support

## 📦 Cài đặt

### Yêu cầu
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (cho deployment)
- Nginx (cho production)

### Development

1. **Clone repository**
```bash
git clone <repository-url>
cd tcpf
```

2. **Cài đặt dependencies**
```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Cấu hình database**
- Tạo file `backend/.env` từ `backend/.env.example`
- Cập nhật thông tin database:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sales_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
```

4. **Khởi tạo database**
```bash
cd backend
npm run migrate
```

5. **Chạy ứng dụng**
```bash
# Từ root directory
npm run dev
```

- Backend: http://localhost:5000
- Frontend: http://localhost:3000

### Default Login
- Username: `admin`
- Password: `admin123`

## 🐳 Deployment với Docker

### 1. Cấu hình môi trường

Tạo file `.env` ở root directory:
```env
DB_PASSWORD=your_secure_password
JWT_SECRET=your_secure_jwt_secret
```

### 2. Build và chạy với Docker Compose

```bash
docker-compose up -d
```

### 3. Kiểm tra containers

```bash
docker-compose ps
```

## 🌐 Deployment trên VPS Ubuntu

### 1. Cài đặt trên VPS

```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Cài đặt Docker Compose
sudo apt install docker-compose -y

# Cài đặt Nginx
sudo apt install nginx -y

# Cài đặt Certbot (cho SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Clone và cấu hình project

```bash
# Clone project
git clone <repository-url>
cd tcpf

# Tạo file .env
nano .env
# Thêm các biến môi trường cần thiết
```

### 3. Cấu hình Nginx

```bash
# Copy file cấu hình
sudo cp nginx/sale.thuanchay.vn.conf /etc/nginx/sites-available/sale.thuanchay.vn.conf

# Tạo symbolic link
sudo ln -s /etc/nginx/sites-available/sale.thuanchay.vn.conf /etc/nginx/sites-enabled/

# Kiểm tra cấu hình
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Cấu hình DNS

Trỏ domain `sale.thuanchay.vn` về IP của VPS:
- A record: `sale.thuanchay.vn` → `YOUR_VPS_IP`

### 5. Cài đặt SSL Certificate

```bash
sudo certbot --nginx -d sale.thuanchay.vn
```

Certbot sẽ tự động cấu hình SSL cho bạn.

### 6. Chạy ứng dụng

```bash
# Build và chạy containers
docker-compose up -d

# Xem logs
docker-compose logs -f
```

### 7. Cập nhật ứng dụng

```bash
# Pull code mới
git pull

# Rebuild và restart
docker-compose down
docker-compose up -d --build
```

## 📁 Cấu trúc project

```
tcpf/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── customers.js
│   │   └── dashboard.js
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── nginx/
│   └── sale.thuanchay.vn.conf
├── docker-compose.yml
└── README.md
```

## 🔒 Bảo mật

- Đổi mật khẩu mặc định sau khi deploy
- Sử dụng JWT_SECRET mạnh
- Bật HTTPS với SSL certificate
- Cấu hình firewall trên VPS
- Thường xuyên cập nhật dependencies

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập

### Products
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm mới
- `PUT /api/products/:id` - Cập nhật sản phẩm
- `DELETE /api/products/:id` - Xóa sản phẩm

### Categories
- `GET /api/categories` - Lấy danh sách danh mục (tree structure)
- `GET /api/categories/:id` - Lấy chi tiết danh mục
- `POST /api/categories` - Tạo danh mục
- `PUT /api/categories/:id` - Cập nhật danh mục
- `DELETE /api/categories/:id` - Xóa danh mục

### Promotions
- `GET /api/promotions` - Lấy danh sách khuyến mãi
- `GET /api/promotions/:id` - Lấy chi tiết khuyến mãi
- `POST /api/promotions` - Tạo khuyến mãi
- `POST /api/promotions/calculate` - Tính toán giảm giá
- `PUT /api/promotions/:id` - Cập nhật khuyến mãi
- `DELETE /api/promotions/:id` - Xóa khuyến mãi

### Inventory
- `GET /api/inventory/transactions` - Lịch sử giao dịch kho
- `GET /api/inventory/low-stock` - Hàng sắp hết
- `GET /api/inventory/summary` - Tổng hợp kho
- `POST /api/inventory/adjust` - Điều chỉnh kho

### Reports
- `GET /api/reports/sales` - Báo cáo bán hàng
- `GET /api/reports/revenue` - Báo cáo doanh thu
- `GET /api/reports/products` - Báo cáo sản phẩm
- `GET /api/reports/export` - Xuất dữ liệu (CSV)

### Suppliers
- `GET /api/suppliers` - Lấy danh sách nhà cung cấp
- `GET /api/suppliers/:id` - Lấy chi tiết nhà cung cấp
- `POST /api/suppliers` - Tạo nhà cung cấp
- `PUT /api/suppliers/:id` - Cập nhật nhà cung cấp
- `DELETE /api/suppliers/:id` - Xóa nhà cung cấp

### Shipping
- `GET /api/shipping` - Lấy phương thức vận chuyển
- `GET /api/shipping/:id` - Lấy chi tiết phương thức vận chuyển
- `POST /api/shipping` - Tạo phương thức vận chuyển
- `PUT /api/shipping/:id` - Cập nhật phương thức vận chuyển
- `DELETE /api/shipping/:id` - Xóa phương thức vận chuyển

### Orders
- `GET /api/orders` - Lấy danh sách đơn hàng
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `POST /api/orders` - Tạo đơn hàng mới (hỗ trợ khuyến mãi, vận chuyển)
- `PATCH /api/orders/:id/status` - Cập nhật trạng thái đơn hàng
- `DELETE /api/orders/:id` - Xóa đơn hàng

### Customers
- `GET /api/customers` - Lấy danh sách khách hàng
- `GET /api/customers/:id` - Lấy chi tiết khách hàng
- `GET /api/customers/:id/orders` - Lấy đơn hàng của khách hàng
- `POST /api/customers` - Tạo khách hàng mới
- `PUT /api/customers/:id` - Cập nhật khách hàng
- `DELETE /api/customers/:id` - Xóa khách hàng

### Dashboard
- `GET /api/dashboard/stats` - Lấy thống kê dashboard

## 🐛 Troubleshooting

### Database connection error
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra thông tin kết nối trong `.env`
- Kiểm tra firewall cho port 5432

### Port already in use
- Thay đổi port trong `docker-compose.yml` hoặc `.env`
- Hoặc dừng service đang sử dụng port đó

### SSL certificate error
- Đảm bảo DNS đã trỏ đúng về VPS
- Chờ DNS propagate (có thể mất vài phút đến vài giờ)
- Kiểm tra firewall cho port 80 và 443

## 📄 License

MIT

## 👨‍💻 Support

Nếu có vấn đề, vui lòng tạo issue trên repository.

