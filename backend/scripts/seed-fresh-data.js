const db = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Script để tạo dữ liệu mới cho hệ thống
 * Sử dụng: node backend/scripts/seed-fresh-data.js
 */

const generateFreshData = async () => {
  try {
    console.log('\n🌱 ========================================');
    console.log('   BẮT ĐẦU TẠO DỮ LIỆU MỚI');
    console.log('========================================\n');

    // 1. Tạo users với password đã được trim
    console.log('📝 [1/6] Tạo users...');
    const users = [
      { 
        username: 'admin', 
        email: 'admin@sales.com', 
        password: 'admin123', 
        role: 'admin', 
        full_name: 'Quản trị viên hệ thống',
        phone: '0901234567',
        is_active: true
      },
      { 
        username: 'manager', 
        email: 'manager@sales.com', 
        password: 'manager123', 
        role: 'manager', 
        full_name: 'Quản lý bán hàng',
        phone: '0901234568',
        is_active: true
      },
      { 
        username: 'staff1', 
        email: 'staff1@sales.com', 
        password: 'staff123', 
        role: 'staff', 
        full_name: 'Nhân viên bán hàng 1',
        phone: '0901234569',
        is_active: true
      },
      { 
        username: 'staff2', 
        email: 'staff2@sales.com', 
        password: 'staff123', 
        role: 'staff', 
        full_name: 'Nhân viên bán hàng 2',
        phone: '0901234570',
        is_active: true
      }
    ];

    const userIds = [];
    for (const user of users) {
      const existing = await db.pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      if (existing.rows.length > 0) {
        console.log(`  ⚠️  User "${user.username}" đã tồn tại, bỏ qua...`);
        const existingUser = await db.pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
        userIds.push(existingUser.rows[0].id);
      } else {
        // Trim password trước khi hash
        const trimmedPassword = user.password.trim();
        const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
        
        const result = await db.pool.query(
          `INSERT INTO users (username, email, password, role, full_name, phone, is_active, permissions) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            user.username, 
            user.email, 
            hashedPassword, 
            user.role, 
            user.full_name,
            user.phone,
            user.is_active,
            JSON.stringify([])
          ]
        );
        userIds.push(result.rows[0].id);
        console.log(`  ✅ Tạo user: ${user.username} (${user.role}) - Password: ${user.password}`);
      }
    }

    // 2. Tạo categories
    console.log('\n📁 [2/6] Tạo categories...');
    const categories = [
      { name: 'Điện tử', description: 'Thiết bị điện tử, điện thoại, laptop' },
      { name: 'Thời trang', description: 'Quần áo, giày dép, phụ kiện' },
      { name: 'Thực phẩm', description: 'Đồ ăn, thức uống, thực phẩm tươi sống' },
      { name: 'Gia dụng', description: 'Đồ dùng gia đình, nội thất' },
      { name: 'Sách', description: 'Sách vở, tài liệu, văn phòng phẩm' },
      { name: 'Thể thao', description: 'Dụng cụ thể thao, đồ tập luyện' },
      { name: 'Làm đẹp', description: 'Mỹ phẩm, chăm sóc da, nước hoa' }
    ];

    const categoryIds = [];
    for (const cat of categories) {
      const existing = await db.pool.query('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (existing.rows.length > 0) {
        categoryIds.push(existing.rows[0].id);
        console.log(`  ⚠️  Category "${cat.name}" đã tồn tại, bỏ qua...`);
      } else {
        const result = await db.pool.query(
          'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, true) RETURNING id',
          [cat.name, cat.description]
        );
        categoryIds.push(result.rows[0].id);
        console.log(`  ✅ Tạo category: ${cat.name}`);
      }
    }

    // 3. Tạo suppliers
    console.log('\n🏢 [3/6] Tạo suppliers...');
    const suppliers = [
      { 
        name: 'Công ty Điện tử ABC', 
        contact_name: 'Nguyễn Văn A', 
        phone: '0901234567', 
        email: 'abc@supplier.com', 
        address: '123 Đường ABC, Quận 1, TP.HCM',
        is_active: true
      },
      { 
        name: 'Thời trang XYZ', 
        contact_name: 'Trần Thị B', 
        phone: '0907654321', 
        email: 'xyz@supplier.com', 
        address: '456 Đường XYZ, Quận 3, TP.HCM',
        is_active: true
      },
      { 
        name: 'Thực phẩm Fresh', 
        contact_name: 'Lê Văn C', 
        phone: '0912345678', 
        email: 'fresh@supplier.com', 
        address: '789 Đường Fresh, Quận 5, TP.HCM',
        is_active: true
      },
      { 
        name: 'Nội thất Home', 
        contact_name: 'Phạm Thị D', 
        phone: '0923456789', 
        email: 'home@supplier.com', 
        address: '321 Đường Home, Quận 7, TP.HCM',
        is_active: true
      }
    ];

    const supplierIds = [];
    for (const sup of suppliers) {
      const existing = await db.pool.query('SELECT id FROM suppliers WHERE name = $1', [sup.name]);
      if (existing.rows.length > 0) {
        supplierIds.push(existing.rows[0].id);
        console.log(`  ⚠️  Supplier "${sup.name}" đã tồn tại, bỏ qua...`);
      } else {
        const result = await db.pool.query(
          'INSERT INTO suppliers (name, contact_name, phone, email, address, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [sup.name, sup.contact_name, sup.phone, sup.email, sup.address, sup.is_active]
        );
        supplierIds.push(result.rows[0].id);
        console.log(`  ✅ Tạo supplier: ${sup.name}`);
      }
    }

    // 4. Tạo products
    console.log('\n📦 [4/6] Tạo products...');
    const products = [
      { name: 'iPhone 15 Pro Max', price: 35000000, cost_price: 32000000, stock: 25, category_id: categoryIds[0], supplier_id: supplierIds[0], sku: 'IP15PM001', description: 'iPhone 15 Pro Max 256GB' },
      { name: 'Samsung Galaxy S24 Ultra', price: 28000000, cost_price: 25000000, stock: 20, category_id: categoryIds[0], supplier_id: supplierIds[0], sku: 'SGS24U001', description: 'Samsung Galaxy S24 Ultra 512GB' },
      { name: 'Laptop Dell XPS 15', price: 45000000, cost_price: 40000000, stock: 15, category_id: categoryIds[0], supplier_id: supplierIds[0], sku: 'DELLXPS001', description: 'Laptop Dell XPS 15 i7 16GB RAM' },
      { name: 'Áo thun nam cao cấp', price: 350000, cost_price: 200000, stock: 150, category_id: categoryIds[1], supplier_id: supplierIds[1], sku: 'ATN001', description: 'Áo thun nam chất liệu cotton 100%' },
      { name: 'Quần jean nam', price: 650000, cost_price: 400000, stock: 100, category_id: categoryIds[1], supplier_id: supplierIds[1], sku: 'QJN001', description: 'Quần jean nam form slim fit' },
      { name: 'Giày thể thao Nike', price: 2500000, cost_price: 1800000, stock: 50, category_id: categoryIds[5], supplier_id: supplierIds[1], sku: 'GTN001', description: 'Giày thể thao Nike Air Max' },
      { name: 'Bánh mì thịt nướng', price: 25000, cost_price: 12000, stock: 200, category_id: categoryIds[2], supplier_id: supplierIds[2], sku: 'BMTN001', description: 'Bánh mì thịt nướng đặc biệt' },
      { name: 'Nước ngọt Coca Cola', price: 15000, cost_price: 8000, stock: 300, category_id: categoryIds[2], supplier_id: supplierIds[2], sku: 'NNCC001', description: 'Nước ngọt Coca Cola 1.5L' },
      { name: 'Bàn ăn gỗ tự nhiên', price: 3500000, cost_price: 2500000, stock: 25, category_id: categoryIds[3], supplier_id: supplierIds[3], sku: 'BAG001', description: 'Bàn ăn gỗ tự nhiên 6 chỗ ngồi' },
      { name: 'Ghế sofa da cao cấp', price: 12000000, cost_price: 9000000, stock: 12, category_id: categoryIds[3], supplier_id: supplierIds[3], sku: 'GSD001', description: 'Ghế sofa da cao cấp 3 chỗ' },
      { name: 'Sách "Clean Code"', price: 250000, cost_price: 150000, stock: 80, category_id: categoryIds[4], supplier_id: supplierIds[0], sku: 'SCC001', description: 'Sách lập trình Clean Code bản tiếng Việt' },
      { name: 'Từ điển Anh-Việt Oxford', price: 120000, cost_price: 80000, stock: 60, category_id: categoryIds[4], supplier_id: supplierIds[0], sku: 'TDOX001', description: 'Từ điển Anh-Việt Oxford 2024' },
      { name: 'Kem chống nắng SPF50', price: 450000, cost_price: 300000, stock: 90, category_id: categoryIds[6], supplier_id: supplierIds[1], sku: 'KCN001', description: 'Kem chống nắng SPF50+ PA++++' },
      { name: 'Serum vitamin C', price: 650000, cost_price: 450000, stock: 70, category_id: categoryIds[6], supplier_id: supplierIds[1], sku: 'SVTC001', description: 'Serum vitamin C làm sáng da' }
    ];

    const productIds = [];
    for (const prod of products) {
      const existing = await db.pool.query('SELECT id FROM products WHERE sku = $1', [prod.sku]);
      if (existing.rows.length > 0) {
        productIds.push(existing.rows[0].id);
        console.log(`  ⚠️  Product "${prod.name}" (${prod.sku}) đã tồn tại, bỏ qua...`);
      } else {
        const result = await db.pool.query(
          `INSERT INTO products (name, description, price, cost_price, stock, category_id, supplier_id, sku, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
          [prod.name, prod.description || '', prod.price, prod.cost_price, prod.stock, prod.category_id, prod.supplier_id, prod.sku]
        );
        productIds.push(result.rows[0].id);
        console.log(`  ✅ Tạo product: ${prod.name} - Giá: ${prod.price.toLocaleString('vi-VN')}đ`);
      }
    }

    // 5. Tạo customers
    console.log('\n👥 [5/6] Tạo customers...');
    const customers = [
      { name: 'Nguyễn Văn An', email: 'nguyenvanan@email.com', phone: '0911111111', address: '123 Đường ABC, Quận 1, TP.HCM' },
      { name: 'Trần Thị Bình', email: 'tranthibinh@email.com', phone: '0922222222', address: '456 Đường XYZ, Quận 3, TP.HCM' },
      { name: 'Lê Văn Cường', email: 'levancuong@email.com', phone: '0933333333', address: '789 Đường DEF, Quận 5, TP.HCM' },
      { name: 'Phạm Thị Dung', email: 'phamthidung@email.com', phone: '0944444444', address: '321 Đường GHI, Quận 7, TP.HCM' },
      { name: 'Hoàng Văn Em', email: 'hoangvanem@email.com', phone: '0955555555', address: '654 Đường JKL, Quận 10, TP.HCM' }
    ];

    const customerIds = [];
    for (const cust of customers) {
      const existing = await db.pool.query('SELECT id FROM customers WHERE email = $1', [cust.email]);
      if (existing.rows.length > 0) {
        customerIds.push(existing.rows[0].id);
        console.log(`  ⚠️  Customer "${cust.name}" đã tồn tại, bỏ qua...`);
      } else {
        const result = await db.pool.query(
          'INSERT INTO customers (name, email, phone, address, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id',
          [cust.name, cust.email, cust.phone, cust.address]
        );
        customerIds.push(result.rows[0].id);
        console.log(`  ✅ Tạo customer: ${cust.name}`);
      }
    }

    // 6. Tạo một số orders mẫu
    console.log('\n📋 [6/6] Tạo orders mẫu...');
    const orders = [
      {
        customer_id: customerIds[0],
        seller_id: userIds[2],
        status: 'completed',
        delivery_status: 'delivered',
        total_amount: 35025000,
        payment_method: 'cash',
        shipping_address: '123 Đường ABC, Quận 1, TP.HCM',
        items: [
          { product_id: productIds[0], quantity: 1, price: 35000000, subtotal: 35000000 },
          { product_id: productIds[6], quantity: 1, price: 25000, subtotal: 25000 }
        ]
      },
      {
        customer_id: customerIds[1],
        seller_id: userIds[2],
        status: 'processing',
        delivery_status: 'shipping',
        total_amount: 700000,
        payment_method: 'card',
        shipping_address: '456 Đường XYZ, Quận 3, TP.HCM',
        items: [
          { product_id: productIds[3], quantity: 2, price: 350000, subtotal: 700000 }
        ]
      }
    ];

    for (const order of orders) {
      const daysAgo = Math.floor(Math.random() * 30);
      const orderResult = await db.pool.query(
        `INSERT INTO orders (customer_id, seller_id, status, delivery_status, total_amount, payment_method, shipping_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${daysAgo} days') RETURNING id`,
        [order.customer_id, order.seller_id, order.status, order.delivery_status, order.total_amount, order.payment_method, order.shipping_address]
      );
      const orderId = orderResult.rows[0].id;

      for (const item of order.items) {
        await db.pool.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.product_id, item.quantity, item.price, item.subtotal]
        );
      }
      console.log(`  ✅ Tạo order #${orderId} - Tổng tiền: ${order.total_amount.toLocaleString('vi-VN')}đ`);
    }

    console.log('\n✅ ========================================');
    console.log('   HOÀN THÀNH TẠO DỮ LIỆU');
    console.log('========================================');
    console.log(`\n📊 Tổng kết:`);
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Categories: ${categoryIds.length}`);
    console.log(`   - Suppliers: ${supplierIds.length}`);
    console.log(`   - Products: ${productIds.length}`);
    console.log(`   - Customers: ${customerIds.length}`);
    console.log(`   - Orders: ${orders.length}`);
    console.log(`\n🔑 Thông tin đăng nhập:`);
    console.log(`   - Admin: admin / admin123`);
    console.log(`   - Manager: manager / manager123`);
    console.log(`   - Staff: staff1 / staff123`);
    console.log(`\n⚠️  Lưu ý: Vui lòng đổi mật khẩu sau khi đăng nhập!\n`);

  } catch (error) {
    console.error('\n❌ Lỗi khi tạo dữ liệu:', error);
    throw error;
  }
};

// Chạy script
if (require.main === module) {
  generateFreshData()
    .then(() => {
      console.log('\n✨ Script hoàn thành thành công!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script thất bại:', error);
      process.exit(1);
    });
}

module.exports = { generateFreshData };

