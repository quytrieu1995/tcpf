const axios = require('axios');
const db = require('../config/database');

class KiotVietService {
  constructor() {
    this.baseURL = 'https://public.kiotviet.vn';
    this.tokenURL = 'https://id.kiotviet.vn/connect/token';
  }

  /**
   * Get KiotViet configuration from database
   */
  async getConfig() {
    const result = await db.pool.query(
      'SELECT * FROM kiotviet_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  }

  /**
   * Save or update KiotViet configuration
   */
  async saveConfig(retailerCode, clientId, clientSecret) {
    const existing = await this.getConfig();
    
    if (existing) {
      const result = await db.pool.query(
        `UPDATE kiotviet_config 
         SET retailer_code = $1, client_id = $2, client_secret = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [retailerCode, clientId, clientSecret, existing.id]
      );
      return result.rows[0];
    } else {
      const result = await db.pool.query(
        `INSERT INTO kiotviet_config (retailer_code, client_id, client_secret, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
        [retailerCode, clientId, clientSecret]
      );
      return result.rows[0];
    }
  }

  /**
   * Get access token from KiotViet using OAuth2
   */
  async getAccessToken(retailerCode, clientId, clientSecret) {
    try {
      const response = await axios.post(
        this.tokenURL,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scopes: 'PublicApi.Access'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Retailer': retailerCode
          }
        }
      );

      const { access_token, expires_in, refresh_token } = response.data;
      
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in - 300); // 5 minutes buffer

      // Save token to database
      const config = await this.getConfig();
      if (config) {
        await db.pool.query(
          `UPDATE kiotviet_config 
           SET access_token = $1, refresh_token = $2, token_expires_at = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [access_token, refresh_token || null, expiresAt, config.id]
        );
      }
      
      // Store retailer code for API requests
      this.currentRetailerCode = retailerCode;

      return {
        access_token,
        expires_in,
        expires_at: expiresAt,
        refresh_token
      };
    } catch (error) {
      console.error('[KIOTVIET] Error getting access token:', error.response?.data || error.message);
      throw new Error(`Failed to get access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidToken() {
    const config = await this.getConfig();
    if (!config) {
      throw new Error('KiotViet configuration not found');
    }

    // Check if token is expired or will expire soon
    const now = new Date();
    const expiresAt = config.token_expires_at ? new Date(config.token_expires_at) : null;
    
    if (!config.access_token || !expiresAt || expiresAt <= now) {
      console.log('[KIOTVIET] Token expired or missing, refreshing...');
      return await this.getAccessToken(config.retailer_code, config.client_id, config.client_secret);
    }
    
    // Store retailer code for API requests
    this.currentRetailerCode = config.retailer_code;

    return {
      access_token: config.access_token,
      expires_at: expiresAt
    };
  }

  /**
   * Make authenticated request to KiotViet API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    const tokenData = await this.getValidToken();
    const accessToken = tokenData.access_token;
    const config = await this.getConfig();
    const retailerCode = config?.retailer_code || this.currentRetailerCode;

    if (!retailerCode) {
      throw new Error('Retailer code is required');
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Retailer': retailerCode,
          'Content-Type': 'application/json'
        },
        data
      });

      return response.data;
    } catch (error) {
      console.error(`[KIOTVIET] API request error (${endpoint}):`, error.response?.data || error.message);
      
      // If token expired, try once more with new token
      if (error.response?.status === 401) {
        console.log('[KIOTVIET] Token invalid, refreshing and retrying...');
        const config = await this.getConfig();
        const newTokenData = await this.getAccessToken(
          config.retailer_code,
          config.client_id,
          config.client_secret
        );
        
        const retryResponse = await axios({
          method,
          url: `${this.baseURL}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${newTokenData.access_token}`,
            'Retailer': config.retailer_code,
            'Content-Type': 'application/json'
          },
          data
        });

        return retryResponse.data;
      }

      throw error;
    }
  }

  /**
   * Sync orders from KiotViet
   */
  async syncOrders(options = {}) {
    const { startDate, endDate, pageSize = 100, pageNumber = 1 } = options;
    
    try {
      let endpoint = '/api/orders?';
      if (startDate) endpoint += `fromDate=${startDate}&`;
      if (endDate) endpoint += `toDate=${endDate}&`;
      endpoint += `pageSize=${pageSize}&currentItem=${(pageNumber - 1) * pageSize}`;

      const response = await this.makeRequest(endpoint);
      const orders = response.data || [];

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const kvOrder of orders) {
        try {
          await this.syncOrderToDatabase(kvOrder);
          synced++;
        } catch (error) {
          failed++;
          errors.push({
            order_id: kvOrder.id,
            error: error.message
          });
          console.error(`[KIOTVIET] Error syncing order ${kvOrder.id}:`, error.message);
        }
      }

      // Log sync result
      await this.logSync('orders', synced > 0 ? 'success' : 'failed', {
        synced,
        failed,
        errors: errors.slice(0, 10) // Limit error log
      });

      // Update last sync time
      const config = await this.getConfig();
      if (config) {
        await db.pool.query(
          'UPDATE kiotviet_config SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
          [config.id]
        );
      }

      return {
        success: true,
        synced,
        failed,
        total: orders.length,
        errors: errors.slice(0, 10)
      };
    } catch (error) {
      await this.logSync('orders', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync single order to database
   */
  async syncOrderToDatabase(kvOrder) {
    // Find or create customer if exists in order
    let customerId = null;
    if (kvOrder.customerId || kvOrder.customer?.id) {
      const customerResult = await db.pool.query(
        'SELECT id FROM customers WHERE kiotviet_id = $1',
        [kvOrder.customerId?.toString() || kvOrder.customer?.id?.toString()]
      );
      customerId = customerResult.rows[0]?.id || null;
    }

    // Map KiotViet order to our order format
    const orderData = {
      kiotviet_id: kvOrder.id?.toString(),
      order_number: kvOrder.code || `KV-${kvOrder.id}`,
      customer_id: customerId,
      total_amount: kvOrder.total || 0,
      status: this.mapKiotVietStatus(kvOrder.status),
      delivery_status: this.mapKiotVietDeliveryStatus(kvOrder.deliveryStatus),
      payment_method: this.mapKiotVietPaymentMethod(kvOrder.paymentMethod),
      notes: kvOrder.description || '',
      kiotviet_data: JSON.stringify(kvOrder),
      created_at: kvOrder.createdDate ? new Date(kvOrder.createdDate) : new Date(),
      updated_at: kvOrder.modifiedDate ? new Date(kvOrder.modifiedDate) : new Date()
    };

    // Check if order already exists
    const existing = await db.pool.query(
      'SELECT id FROM orders WHERE kiotviet_id = $1 OR order_number = $2',
      [orderData.kiotviet_id, orderData.order_number]
    );

    if (existing.rows.length > 0) {
      // Update existing order
      await db.pool.query(
        `UPDATE orders 
         SET total_amount = $1, status = $2, delivery_status = $3, 
             payment_method = $4, notes = $5, kiotviet_data = $6, updated_at = $7
         WHERE id = $8`,
        [
          orderData.total_amount,
          orderData.status,
          orderData.delivery_status,
          orderData.payment_method,
          orderData.notes,
          orderData.kiotviet_data,
          orderData.updated_at,
          existing.rows[0].id
        ]
      );
    } else {
      // Create new order
      const result = await db.pool.query(
        `INSERT INTO orders (
          kiotviet_id, order_number, customer_id, total_amount, status, 
          delivery_status, payment_method, notes, kiotviet_data, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          orderData.kiotviet_id,
          orderData.order_number,
          orderData.customer_id,
          orderData.total_amount,
          orderData.status,
          orderData.delivery_status,
          orderData.payment_method,
          orderData.notes,
          orderData.kiotviet_data,
          orderData.created_at,
          orderData.updated_at
        ]
      );

      // Sync order items if available
      if (kvOrder.orderDetails && Array.isArray(kvOrder.orderDetails)) {
        for (const item of kvOrder.orderDetails) {
          await this.syncOrderItem(result.rows[0].id, item);
        }
      }
    }
  }

  /**
   * Sync order item
   */
  async syncOrderItem(orderId, kvItem) {
    // Find product by SKU or name
    const product = await db.pool.query(
      'SELECT id FROM products WHERE sku = $1 OR name = $2 LIMIT 1',
      [kvItem.productCode || kvItem.product?.code, kvItem.productName || kvItem.product?.name]
    );

    const productId = product.rows[0]?.id || null;

    await db.pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        orderId,
        productId,
        kvItem.quantity || 0,
        kvItem.price || 0,
        (kvItem.quantity || 0) * (kvItem.price || 0)
      ]
    );
  }

  /**
   * Sync customers from KiotViet
   */
  async syncCustomers(options = {}) {
    const { pageSize = 100, pageNumber = 1 } = options;
    
    try {
      const endpoint = `/api/customers?pageSize=${pageSize}&currentItem=${(pageNumber - 1) * pageSize}`;
      const response = await this.makeRequest(endpoint);
      const customers = response.data || [];

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const kvCustomer of customers) {
        try {
          await this.syncCustomerToDatabase(kvCustomer);
          synced++;
        } catch (error) {
          failed++;
          errors.push({
            customer_id: kvCustomer.id,
            error: error.message
          });
          console.error(`[KIOTVIET] Error syncing customer ${kvCustomer.id}:`, error.message);
        }
      }

      await this.logSync('customers', synced > 0 ? 'success' : 'failed', {
        synced,
        failed,
        errors: errors.slice(0, 10)
      });

      const config = await this.getConfig();
      if (config) {
        await db.pool.query(
          'UPDATE kiotviet_config SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1',
          [config.id]
        );
      }

      return {
        success: true,
        synced,
        failed,
        total: customers.length,
        errors: errors.slice(0, 10)
      };
    } catch (error) {
      await this.logSync('customers', 'failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync single customer to database
   */
  async syncCustomerToDatabase(kvCustomer) {
    const customerData = {
      kiotviet_id: kvCustomer.id?.toString(),
      code: kvCustomer.code || `KV-${kvCustomer.id}`,
      name: kvCustomer.name || kvCustomer.contactName || '',
      email: kvCustomer.email || '',
      phone: kvCustomer.contactNumber || kvCustomer.phoneNumber || '',
      address: kvCustomer.address || '',
      kiotviet_data: JSON.stringify(kvCustomer)
    };

    // Check if customer exists
    const existing = await db.pool.query(
      'SELECT id FROM customers WHERE kiotviet_id = $1 OR code = $2 OR email = $3',
      [customerData.kiotviet_id, customerData.code, customerData.email]
    );

    if (existing.rows.length > 0) {
      // Update existing customer
      await db.pool.query(
        `UPDATE customers 
         SET name = $1, email = $2, phone = $3, address = $4, kiotviet_data = $5
         WHERE id = $6`,
        [
          customerData.name,
          customerData.email,
          customerData.phone,
          customerData.address,
          customerData.kiotviet_data,
          existing.rows[0].id
        ]
      );
    } else {
      // Create new customer
      await db.pool.query(
        `INSERT INTO customers (kiotviet_id, code, name, email, phone, address, kiotviet_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customerData.kiotviet_id,
          customerData.code,
          customerData.name,
          customerData.email,
          customerData.phone,
          customerData.address,
          customerData.kiotviet_data
        ]
      );
    }
  }

  /**
   * Log sync operation
   */
  async logSync(syncType, status, data = {}) {
    await db.pool.query(
      `INSERT INTO kiotviet_sync_logs (sync_type, status, records_synced, records_failed, error_message, sync_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        syncType,
        status,
        data.synced || 0,
        data.failed || 0,
        data.error || null,
        JSON.stringify(data)
      ]
    );
  }

  /**
   * Map KiotViet order status to our status
   */
  mapKiotVietStatus(kvStatus) {
    const statusMap = {
      1: 'pending',      // Chờ xử lý
      2: 'processing',   // Đang xử lý
      3: 'completed',    // Hoàn thành
      4: 'cancelled'     // Đã hủy
    };
    return statusMap[kvStatus] || 'pending';
  }

  /**
   * Map KiotViet delivery status
   */
  mapKiotVietDeliveryStatus(kvStatus) {
    const statusMap = {
      1: 'pending',
      2: 'shipping',
      3: 'delivered',
      4: 'returned',
      5: 'cancelled'
    };
    return statusMap[kvStatus] || 'pending';
  }

  /**
   * Map KiotViet payment method
   */
  mapKiotVietPaymentMethod(kvMethod) {
    const methodMap = {
      1: 'cash',
      2: 'card',
      3: 'bank_transfer',
      4: 'credit'
    };
    return methodMap[kvMethod] || 'cash';
  }

  /**
   * Test connection
   */
  async testConnection(retailerCode, clientId, clientSecret) {
    try {
      const tokenData = await this.getAccessToken(retailerCode, clientId, clientSecret);
      
      // Try to get a simple endpoint to verify connection
      await this.makeRequest('/api/customers?pageSize=1');
      
      return {
        success: true,
        message: 'Connection successful',
        token_expires_at: tokenData.expires_at
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  }
}

module.exports = new KiotVietService();

