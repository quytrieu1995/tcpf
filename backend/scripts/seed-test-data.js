const db = require('../config/database');
const bcrypt = require('bcryptjs');

const generateTestData = async () => {
  try {
    console.log('🌱 Bắt đầu tạo dữ liệu test...');

    // 1. Tạo users
    console.log('📝 Tạo users...');
    const users = [
      { username: 'admin', email: 'admin@test.com', password: 'admin123', role: 'admin', full_name: 'Quản trị viên' },
      { username: 'manager', email: 'manager@test.com', password: 'manager123', role: 'manager', full_name: 'Quản lý' },
      { username: 'staff1', email: 'staff1@test.com', password: 'staff123', role: 'staff', full_name: 'Nhân viên 1' },
      { username: 'staff2', email: 'staff2@test.com', password: 'staff123', role: 'staff', full_name: 'Nhân viên 2' }
    ];

    for (const user of users) {
      const existing = await db.pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      if (existing.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await db.pool.query(
          'INSERT INTO users (username, email, password, role, full_name, is_active) VALUES ($1, $2, $3, $4, $5, true)',
          [user.username, user.email, hashedPassword, user.role, user.full_name]
        );
        console.log(`  ✓ Tạo user: ${user.username}`);
      }
    }

    // 2. Tạo categories
    console.log('📁 Tạo categories...');
    const categories = [
      { name: 'Điện tử', description: 'Thiết bị điện tử' },
      { name: 'Thời trang', description: 'Quần áo, giày dép' },
      { name: 'Thực phẩm', description: 'Đồ ăn, thức uống' },
      { name: 'Gia dụng', description: 'Đồ dùng gia đình' },
      { name: 'Sách', description: 'Sách vở, tài liệu' }
    ];

    const categoryIds = [];
    for (const cat of categories) {
      const existing = await db.pool.query('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (existing.rows.length === 0) {
        const result = await db.pool.query(
          'INSERT INTO categories (name, description, is_active) VALUES ($1, $2, true) RETURNING id',
          [cat.name, cat.description]
        );
        categoryIds.push(result.rows[0].id);
        console.log(`  ✓ Tạo category: ${cat.name}`);
      } else {
        categoryIds.push(existing.rows[0].id);
      }
    }

    // 3. Tạo suppliers
    console.log('🏢 Tạo suppliers...');
    const suppliers = [
      { name: 'Công ty Điện tử ABC', contact_name: 'Nguyễn Văn A', phone: '0901234567', email: 'abc@supplier.com', address: '123 Đường ABC, Hà Nội' },
      { name: 'Thời trang XYZ', contact_name: 'Trần Thị B', phone: '0907654321', email: 'xyz@supplier.com', address: '456 Đường XYZ, TP.HCM' },
      { name: 'Thực phẩm Fresh', contact_name: 'Lê Văn C', phone: '0912345678', email: 'fresh@supplier.com', address: '789 Đường Fresh, Đà Nẵng' }
    ];

    const supplierIds = [];
    for (const sup of suppliers) {
      const existing = await db.pool.query('SELECT id FROM suppliers WHERE name = $1', [sup.name]);
      if (existing.rows.length === 0) {
        const result = await db.pool.query(
          'INSERT INTO suppliers (name, contact_name, phone, email, address, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id',
          [sup.name, sup.contact_name, sup.phone, sup.email, sup.address]
        );
        supplierIds.push(result.rows[0].id);
        console.log(`  ✓ Tạo supplier: ${sup.name}`);
      } else {
        supplierIds.push(existing.rows[0].id);
      }
    }

    // 4. Tạo products
    console.log('📦 Tạo products...');
    const products = [
      { name: 'iPhone 15 Pro', price: 25000000, cost_price: 22000000, stock: 50, category_id: categoryIds[0], supplier_id: supplierIds[0], sku: 'IP15PRO001' },
      { name: 'Samsung Galaxy S24', price: 20000000, cost_price: 18000000, stock: 30, category_id: categoryIds[0], supplier_id: supplierIds[0], sku: 'SGS24001' },
      { name: 'Áo thun nam', price: 200000, cost_price: 120000, stock: 100, category_id: categoryIds[1], supplier_id: supplierIds[1], sku: 'ATN001' },
      { name: 'Quần jean', price: 500000, cost_price: 300000, stock: 80, category_id: categoryIds[1], supplier_id: supplierIds[1], sku: 'QJ001' },
      { name: 'Bánh mì', price: 15000, cost_price: 8000, stock: 200, category_id: categoryIds[2], supplier_id: supplierIds[2], sku: 'BM001' },
      { name: 'Nước ngọt', price: 10000, cost_price: 6000, stock: 150, category_id: categoryIds[2], supplier_id: supplierIds[2], sku: 'NN001' },
      { name: 'Bàn ăn', price: 2000000, cost_price: 1500000, stock: 20, category_id: categoryIds[3], supplier_id: supplierIds[0], sku: 'BA001' },
      { name: 'Ghế sofa', price: 5000000, cost_price: 4000000, stock: 10, category_id: categoryIds[3], supplier_id: supplierIds[0], sku: 'GS001' },
      { name: 'Sách lập trình', price: 150000, cost_price: 100000, stock: 60, category_id: categoryIds[4], supplier_id: supplierIds[0], sku: 'SLT001' },
      { name: 'Từ điển Anh-Việt', price: 80000, cost_price: 50000, stock: 40, category_id: categoryIds[4], supplier_id: supplierIds[0], sku: 'TD001' }
    ];

    const productIds = [];
    for (const prod of products) {
      const existing = await db.pool.query('SELECT id FROM products WHERE sku = $1', [prod.sku]);
      if (existing.rows.length === 0) {
        const result = await db.pool.query(
          'INSERT INTO products (name, price, cost_price, stock, category_id, supplier_id, sku, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id',
          [prod.name, prod.price, prod.cost_price, prod.stock, prod.category_id, prod.supplier_id, prod.sku]
        );
        productIds.push(result.rows[0].id);
        console.log(`  ✓ Tạo product: ${prod.name}`);
      } else {
        productIds.push(existing.rows[0].id);
      }
    }

    // 5. Tạo customers
    console.log('👥 Tạo customers...');
    const customers = [
      { name: 'Nguyễn Văn Khách', email: 'khach1@test.com', phone: '0901111111', address: '123 Đường Khách, Hà Nội' },
      { name: 'Trần Thị Mua', email: 'khach2@test.com', phone: '0902222222', address: '456 Đường Mua, TP.HCM' },
      { name: 'Lê Văn Hàng', email: 'khach3@test.com', phone: '0903333333', address: '789 Đường Hàng, Đà Nẵng' },
      { name: 'Phạm Thị Đơn', email: 'khach4@test.com', phone: '0904444444', address: '321 Đường Đơn, Cần Thơ' },
      { name: 'Hoàng Văn VIP', email: 'vip@test.com', phone: '0905555555', address: '654 Đường VIP, Hải Phòng' }
    ];

    const customerIds = [];
    for (const cust of customers) {
      const existing = await db.pool.query('SELECT id FROM customers WHERE email = $1', [cust.email]);
      if (existing.rows.length === 0) {
        const result = await db.pool.query(
          'INSERT INTO customers (name, email, phone, address) VALUES ($1, $2, $3, $4) RETURNING id',
          [cust.name, cust.email, cust.phone, cust.address]
        );
        customerIds.push(result.rows[0].id);
        console.log(`  ✓ Tạo customer: ${cust.name}`);
      } else {
        customerIds.push(existing.rows[0].id);
      }
    }

    // 6. Tạo shipping methods
    console.log('🚚 Tạo shipping methods...');
    const shippingMethods = [
      { name: 'Giao Hàng Nhanh (GHN)', cost: 30000, estimated_days: 2, api_type: 'ghn', api_endpoint: 'https://dev-online-gateway.ghn.vn', is_active: true },
      { name: 'Viettel Post', cost: 25000, estimated_days: 3, api_type: 'viettel_post', api_endpoint: 'https://api.viettelpost.vn', is_active: true },
      { name: 'Giao Hàng Tiết Kiệm', cost: 20000, estimated_days: 4, api_type: 'ghtk', api_endpoint: 'https://services.giaohangtietkiem.vn', is_active: true },
      { name: 'J&T Express', cost: 28000, estimated_days: 2, api_type: 'jnt', api_endpoint: 'https://api.jtexpress.vn', is_active: true },
      { name: 'Vận chuyển thủ công', cost: 15000, estimated_days: 5, api_type: 'manual', is_active: true }
    ];

    const shippingMethodIds = [];
    for (const sm of shippingMethods) {
      const existing = await db.pool.query('SELECT id FROM shipping_methods WHERE name = $1', [sm.name]);
      if (existing.rows.length === 0) {
        const result = await db.pool.query(
          'INSERT INTO shipping_methods (name, cost, estimated_days, api_type, api_endpoint, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [sm.name, sm.cost, sm.estimated_days, sm.api_type, sm.api_endpoint, sm.is_active]
        );
        shippingMethodIds.push(result.rows[0].id);
        console.log(`  ✓ Tạo shipping method: ${sm.name}`);
      } else {
        shippingMethodIds.push(existing.rows[0].id);
      }
    }

    // 7. Tạo orders
    console.log('📋 Tạo orders...');
    const orderStatuses = ['pending', 'processing', 'completed', 'completed', 'completed'];
    const paymentMethods = ['cash', 'bank_transfer', 'credit', 'card', 'cash'];

    for (let i = 0; i < 20; i++) {
      const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
      const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const shippingMethodId = shippingMethodIds[Math.floor(Math.random() * shippingMethodIds.length)];
      
      const orderNumber = `ORD-${Date.now()}-${i}`;
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      // Select random products
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      for (let j = 0; j < numItems; j++) {
        const productId = productIds[Math.floor(Math.random() * productIds.length)];
        if (!selectedProducts.find(p => p.id === productId)) {
          selectedProducts.push({
            id: productId,
            quantity: Math.floor(Math.random() * 3) + 1
          });
        }
      }

      // Calculate total
      let totalAmount = 0;
      for (const item of selectedProducts) {
        const product = await db.pool.query('SELECT price FROM products WHERE id = $1', [item.id]);
        totalAmount += parseFloat(product.rows[0].price) * item.quantity;
      }

      const shippingCost = shippingMethodId ? parseFloat((await db.pool.query('SELECT cost FROM shipping_methods WHERE id = $1', [shippingMethodId])).rows[0].cost) : 0;
      totalAmount += shippingCost;

      const orderResult = await db.pool.query(
        `INSERT INTO orders (customer_id, order_number, total_amount, status, payment_method, shipping_method_id, shipping_cost, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [customerId, orderNumber, totalAmount, status, paymentMethod, shippingMethodId, shippingCost, createdAt]
      );

      const orderId = orderResult.rows[0].id;

      // Create order items
      for (const item of selectedProducts) {
        const product = await db.pool.query('SELECT price FROM products WHERE id = $1', [item.id]);
        const price = parseFloat(product.rows[0].price);
        const subtotal = price * item.quantity;

        await db.pool.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [orderId, item.id, item.quantity, price, subtotal]
        );
      }

      console.log(`  ✓ Tạo order: ${orderNumber}`);
    }

    // 8. Tạo shipments cho một số orders
    console.log('📦 Tạo shipments...');
    const completedOrders = await db.pool.query(
      "SELECT id, order_number, shipping_method_id FROM orders WHERE status = 'completed' OR status = 'processing' LIMIT 10"
    );

    for (const order of completedOrders.rows) {
      if (order.shipping_method_id) {
        const trackingNumber = `JNT${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const shipmentStatuses = ['pending', 'in_transit', 'delivered'];
        const status = shipmentStatuses[Math.floor(Math.random() * shipmentStatuses.length)];

        await db.pool.query(
          `INSERT INTO shipments (order_id, carrier_id, tracking_number, status, estimated_delivery_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            order.id,
            order.shipping_method_id,
            trackingNumber,
            status,
            new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
          ]
        );

        // Update order tracking number
        await db.pool.query(
          'UPDATE orders SET tracking_number = $1 WHERE id = $2',
          [trackingNumber, order.id]
        );

        console.log(`  ✓ Tạo shipment: ${trackingNumber} cho order ${order.order_number}`);
      }
    }

    // 9. Tạo promotions
    console.log('🎁 Tạo promotions...');
    const promotions = [
      { name: 'Giảm 10%', type: 'percentage', value: 10, min_purchase_amount: 100000, start_date: new Date(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { name: 'Giảm 50k', type: 'fixed', value: 50000, min_purchase_amount: 200000, start_date: new Date(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { name: 'Giảm 20% đơn trên 500k', type: 'percentage', value: 20, min_purchase_amount: 500000, max_discount_amount: 200000, start_date: new Date(), end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    ];

    for (const promo of promotions) {
      const existing = await db.pool.query('SELECT id FROM promotions WHERE name = $1', [promo.name]);
      if (existing.rows.length === 0) {
        await db.pool.query(
          'INSERT INTO promotions (name, type, value, min_purchase_amount, max_discount_amount, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, true)',
          [promo.name, promo.type, promo.value, promo.min_purchase_amount, promo.max_discount_amount || null, promo.start_date, promo.end_date]
        );
        console.log(`  ✓ Tạo promotion: ${promo.name}`);
      }
    }

    // 10. Tạo purchase orders
    console.log('📝 Tạo purchase orders...');
    for (let i = 0; i < 5; i++) {
      const supplierId = supplierIds[Math.floor(Math.random() * supplierIds.length)];
      const poNumber = `PO-${Date.now()}-${i}`;
      const statuses = ['pending', 'confirmed', 'received'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const numItems = Math.floor(Math.random() * 3) + 1;
      let totalAmount = 0;
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const productId = productIds[Math.floor(Math.random() * productIds.length)];
        const quantity = Math.floor(Math.random() * 20) + 10;
        const unitPrice = parseFloat((await db.pool.query('SELECT cost_price FROM products WHERE id = $1', [productId])).rows[0].cost_price);
        const subtotal = unitPrice * quantity;
        totalAmount += subtotal;
        items.push({ product_id: productId, quantity, unit_price: unitPrice, subtotal });
      }

      const poResult = await db.pool.query(
        'INSERT INTO purchase_orders (order_number, supplier_id, total_amount, status, expected_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [poNumber, supplierId, totalAmount, status, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      for (const item of items) {
        await db.pool.query(
          'INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_price, subtotal) VALUES ($1, $2, $3, $4, $5)',
          [poResult.rows[0].id, item.product_id, item.quantity, item.unit_price, item.subtotal]
        );
      }

      console.log(`  ✓ Tạo purchase order: ${poNumber}`);
    }

    // 11. Tạo stock transactions
    console.log('📊 Tạo stock transactions...');
    for (let i = 0; i < 10; i++) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      const types = ['in', 'out', 'adjustment'];
      const type = types[Math.floor(Math.random() * types.length)];
      const quantity = Math.floor(Math.random() * 20) + 1;

      await db.pool.query(
        'INSERT INTO inventory_transactions (product_id, type, quantity, reference_type, notes) VALUES ($1, $2, $3, $4, $5)',
        [productId, type, quantity, 'manual', `Giao dịch test ${i + 1}`]
      );
    }

    console.log('✅ Hoàn thành tạo dữ liệu test!');
    console.log('\n📊 Tóm tắt:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Categories: ${categories.length}`);
    console.log(`  - Suppliers: ${suppliers.length}`);
    console.log(`  - Products: ${products.length}`);
    console.log(`  - Customers: ${customers.length}`);
    console.log(`  - Shipping Methods: ${shippingMethods.length}`);
    console.log(`  - Orders: 20`);
    console.log(`  - Shipments: ${completedOrders.rows.length}`);
    console.log(`  - Promotions: ${promotions.length}`);
    console.log(`  - Purchase Orders: 5`);
    console.log('\n🔑 Thông tin đăng nhập:');
    console.log('  - admin / admin123 (Quản trị viên)');
    console.log('  - manager / manager123 (Quản lý)');
    console.log('  - staff1 / staff123 (Nhân viên)');

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu test:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  db.init()
    .then(() => generateTestData())
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = generateTestData;

