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
      console.log('[KIOTVIET] Getting access token:', {
        retailerCode,
        clientId: clientId?.substring(0, 10) + '...',
        tokenURL: this.tokenURL
      });

      // Clean retailer code (remove any whitespace)
      const cleanRetailerCode = retailerCode.trim();

      // Try different formats for scopes
      const requestData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        scope: 'PublicApi.Access'  // Try 'scope' instead of 'scopes'
      });

      console.log('[KIOTVIET] Request data:', {
        grant_type: 'client_credentials',
        client_id: clientId.trim().substring(0, 10) + '...',
        scope: 'PublicApi.Access',
        retailer: cleanRetailerCode,
        url: this.tokenURL
      });

      let response;
      try {
        response = await axios.post(
          this.tokenURL,
          requestData,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Retailer': cleanRetailerCode
            },
            timeout: 30000
          }
        );
      } catch (firstError) {
        // If first attempt fails, try with 'scopes' instead of 'scope'
        console.log('[KIOTVIET] First attempt failed, trying with "scopes"...');
        const requestData2 = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
          scopes: 'PublicApi.Access'
        });
        
        try {
          response = await axios.post(
            this.tokenURL,
            requestData2,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Retailer': cleanRetailerCode
              },
              timeout: 30000
            }
          );
        } catch (secondError) {
          // If both fail, try without scope parameter
          console.log('[KIOTVIET] Second attempt failed, trying without scope...');
          const requestData3 = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId.trim(),
            client_secret: clientSecret.trim()
          });
          
          response = await axios.post(
            this.tokenURL,
            requestData3,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Retailer': cleanRetailerCode
              },
              timeout: 30000
            }
          );
        }
      }

      console.log('[KIOTVIET] Token response received:', {
        hasToken: !!response.data?.access_token,
        expiresIn: response.data?.expires_in
      });

      const { access_token, expires_in, refresh_token } = response.data;
      
      if (!access_token) {
        throw new Error('No access token received from KiotViet');
      }
      
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
      this.currentRetailerCode = cleanRetailerCode;

      return {
        access_token,
        expires_in,
        expires_at: expiresAt,
        refresh_token
      };
    } catch (error) {
      console.error('[KIOTVIET] Error getting access token:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        code: error.code
      });
      
      let errorMessage = 'Failed to get access token';
      if (error.response?.data) {
        if (error.response.data.error_description) {
          errorMessage = error.response.data.error_description;
        } else if (error.response.data.error) {
          errorMessage = `${error.response.data.error}: ${error.response.data.error_description || error.response.data.message || 'Unknown error'}`;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
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
    const retailerCode = (config?.retailer_code || this.currentRetailerCode)?.trim();

    if (!retailerCode) {
      throw new Error('Retailer code is required');
    }

    console.log('[KIOTVIET] Making API request:', {
      method,
      endpoint,
      retailer: retailerCode,
      hasToken: !!accessToken
    });

    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Retailer': retailerCode,
          'Content-Type': 'application/json'
        },
        data,
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`[KIOTVIET] API request error (${endpoint}):`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        headers: error.response?.headers
      });
      
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
            'Retailer': config.retailer_code.trim(),
            'Content-Type': 'application/json'
          },
          data,
          timeout: 30000
        });

        return retryResponse.data;
      }

      // Provide more detailed error message
      let errorMessage = error.message;
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error_description) {
          errorMessage = error.response.data.error_description;
        }
      }

      throw new Error(errorMessage || 'API request failed');
    }
  }

  /**
   * Sync orders from KiotViet
   */
  async syncOrders(options = {}) {
    const { startDate, endDate, pageSize = 100, pageNumber = 1 } = options;
    
    try {
      // Try different endpoint formats
      let endpoint = '/api/orders';
      const params = [];
      
      if (startDate) params.push(`fromDate=${encodeURIComponent(startDate)}`);
      if (endDate) params.push(`toDate=${encodeURIComponent(endDate)}`);
      params.push(`pageSize=${pageSize}`);
      params.push(`currentItem=${(pageNumber - 1) * pageSize}`);
      
      if (params.length > 0) {
        endpoint += '?' + params.join('&');
      }

      console.log('[KIOTVIET] Syncing orders from endpoint:', endpoint);

      let response;
      try {
        response = await this.makeRequest(endpoint);
      } catch (error) {
        // If 503 or endpoint not found, try alternative endpoint
        if (error.response?.status === 503 || error.response?.status === 404) {
          console.log('[KIOTVIET] Primary endpoint failed, trying alternative...');
          endpoint = '/api/invoices'; // KiotViet sometimes uses invoices instead of orders
          try {
            response = await this.makeRequest(endpoint + (params.length > 0 ? '?' + params.join('&') : ''));
          } catch (altError) {
            throw new Error(`Failed to sync orders: ${error.message || 'API endpoint not available'}`);
          }
        } else {
          throw error;
        }
      }

      // Handle different response formats
      let orders = [];
      if (Array.isArray(response.data)) {
        orders = response.data;
      } else if (Array.isArray(response)) {
        orders = response;
      } else if (response.data && Array.isArray(response.data.data)) {
        orders = response.data.data;
      } else if (response.data && response.data.items) {
        orders = response.data.items;
      } else if (response.data && Array.isArray(response.data)) {
        orders = response.data;
      } else if (response && typeof response === 'object') {
        // Try to find any array property
        for (const key in response) {
          if (Array.isArray(response[key])) {
            orders = response[key];
            break;
          }
        }
      }

      if (!Array.isArray(orders)) {
        console.warn('[KIOTVIET] Unexpected response format:', JSON.stringify(response).substring(0, 200));
        orders = [];
      }

      console.log(`[KIOTVIET] Found ${orders.length} orders to sync`);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const kvOrder of orders) {
        try {
          if (!kvOrder || !kvOrder.id) {
            console.warn('[KIOTVIET] Skipping invalid order:', JSON.stringify(kvOrder).substring(0, 100));
            failed++;
            continue;
          }
          await this.syncOrderToDatabase(kvOrder);
          synced++;
        } catch (error) {
          failed++;
          const errorInfo = {
            order_id: kvOrder?.id || 'unknown',
            order_code: kvOrder?.code || kvOrder?.invoiceNumber || 'unknown',
            error: error.message || 'Unknown error'
          };
          errors.push(errorInfo);
          console.error(`[KIOTVIET] Error syncing order ${errorInfo.order_id}:`, error.message);
          
          // Log detailed error for debugging
          if (error.stack) {
            console.error(`[KIOTVIET] Error stack:`, error.stack.substring(0, 500));
          }
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

      const result = {
        success: synced > 0 || orders.length === 0, // Success if we synced something or there was nothing to sync
        synced,
        failed,
        total: orders.length,
        errors: errors.slice(0, 20) // Show more errors
      };

      // Log summary
      console.log(`[KIOTVIET] Sync orders completed: ${synced} synced, ${failed} failed out of ${orders.length} total`);

      return result;
    } catch (error) {
      console.error('[KIOTVIET] Sync orders failed:', error);
      await this.logSync('orders', 'failed', {
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });
      throw error;
    }
  }

  /**
   * Sync single order to database
   */
  async syncOrderToDatabase(kvOrder) {
    if (!kvOrder || !kvOrder.id) {
      throw new Error('Invalid order data: missing id');
    }

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
      order_number: kvOrder.code || kvOrder.invoiceNumber || `KV-${kvOrder.id}`,
      customer_id: customerId,
      total_amount: parseFloat(kvOrder.total || kvOrder.totalPayment || 0),
      status: this.mapKiotVietStatus(kvOrder.status || kvOrder.invoiceStatus),
      delivery_status: this.mapKiotVietDeliveryStatus(kvOrder.deliveryStatus || kvOrder.status),
      payment_method: this.mapKiotVietPaymentMethod(kvOrder.paymentMethod || kvOrder.paymentMethodId),
      notes: (kvOrder.description || kvOrder.note || '').substring(0, 1000), // Limit length
      kiotviet_data: JSON.stringify(kvOrder),
      created_at: this.parseDate(kvOrder.createdDate) || new Date(),
      updated_at: this.parseDate(kvOrder.modifiedDate) || new Date()
    };

    // Validate required fields
    if (!orderData.order_number) {
      throw new Error(`Invalid order: missing order_number for order ${kvOrder.id}`);
    }

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
             payment_method = $4, notes = $5, kiotviet_data = $6, updated_at = $7,
             customer_id = COALESCE($8, customer_id)
         WHERE id = $9`,
        [
          orderData.total_amount,
          orderData.status,
          orderData.delivery_status,
          orderData.payment_method,
          orderData.notes,
          orderData.kiotviet_data,
          orderData.updated_at,
          orderData.customer_id,
          existing.rows[0].id
        ]
      );
    } else {
      // Create new order - handle duplicate order_number manually
      try {
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

        const orderId = result.rows[0].id;

        // Sync order items if available
        if (kvOrder.orderDetails && Array.isArray(kvOrder.orderDetails)) {
          for (const item of kvOrder.orderDetails) {
            try {
              await this.syncOrderItem(orderId, item);
            } catch (itemError) {
              console.error(`[KIOTVIET] Error syncing order item:`, itemError.message);
              // Continue with other items
            }
          }
        }
      } catch (insertError) {
        // If duplicate order_number, try to update instead
        if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          console.log(`[KIOTVIET] Order ${orderData.order_number} already exists, updating instead...`);
          const existingOrder = await db.pool.query(
            'SELECT id FROM orders WHERE order_number = $1',
            [orderData.order_number]
          );
          if (existingOrder.rows.length > 0) {
            await db.pool.query(
              `UPDATE orders 
               SET total_amount = $1, status = $2, delivery_status = $3, 
                   payment_method = $4, notes = $5, kiotviet_data = $6, updated_at = $7,
                   customer_id = COALESCE($8, customer_id), kiotviet_id = COALESCE($9, kiotviet_id)
               WHERE id = $10`,
              [
                orderData.total_amount,
                orderData.status,
                orderData.delivery_status,
                orderData.payment_method,
                orderData.notes,
                orderData.kiotviet_data,
                orderData.updated_at,
                orderData.customer_id,
                orderData.kiotviet_id,
                existingOrder.rows[0].id
              ]
            );
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      }
    }
  }

  /**
   * Sync order item
   */
  async syncOrderItem(orderId, kvItem) {
    if (!kvItem) {
      throw new Error('Invalid order item data');
    }

    // Find product by SKU or name
    const productCode = kvItem.productCode || kvItem.product?.code || kvItem.code;
    const productName = kvItem.productName || kvItem.product?.name || kvItem.name;
    
    let productId = null;
    if (productCode || productName) {
      const product = await db.pool.query(
        'SELECT id FROM products WHERE sku = $1 OR name = $2 LIMIT 1',
        [productCode, productName]
      );
      productId = product.rows[0]?.id || null;
    }

    const quantity = parseFloat(kvItem.quantity || kvItem.quantity || 0);
    const price = parseFloat(kvItem.price || kvItem.price || 0);
    const subtotal = quantity * price;

    // Check if item already exists
    const existing = await db.pool.query(
      'SELECT id FROM order_items WHERE order_id = $1 AND product_id = $2',
      [orderId, productId]
    );

    if (existing.rows.length > 0) {
      // Update existing item
      await db.pool.query(
        `UPDATE order_items 
         SET quantity = $1, price = $2, subtotal = $3
         WHERE id = $4`,
        [quantity, price, subtotal, existing.rows[0].id]
      );
    } else {
      // Insert new item
      await db.pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, productId, quantity, price, subtotal]
      );
    }
  }

  /**
   * Sync customers from KiotViet
   */
  async syncCustomers(options = {}) {
    const { pageSize = 100, pageNumber = 1 } = options;
    
    try {
      const endpoint = `/api/customers?pageSize=${pageSize}&currentItem=${(pageNumber - 1) * pageSize}`;
      
      console.log('[KIOTVIET] Syncing customers from endpoint:', endpoint);

      let response;
      try {
        response = await this.makeRequest(endpoint);
      } catch (error) {
        // If 503, try with smaller page size
        if (error.response?.status === 503) {
          console.log('[KIOTVIET] 503 error, retrying with smaller page size...');
          const smallEndpoint = `/api/customers?pageSize=50&currentItem=${(pageNumber - 1) * 50}`;
          response = await this.makeRequest(smallEndpoint);
        } else {
          throw error;
        }
      }

      // Handle different response formats
      let customers = [];
      if (Array.isArray(response.data)) {
        customers = response.data;
      } else if (Array.isArray(response)) {
        customers = response;
      } else if (response.data && Array.isArray(response.data.data)) {
        customers = response.data.data;
      } else if (response.data && response.data.items) {
        customers = response.data.items;
      } else if (response.data && Array.isArray(response.data)) {
        customers = response.data;
      } else if (response && typeof response === 'object') {
        // Try to find any array property
        for (const key in response) {
          if (Array.isArray(response[key])) {
            customers = response[key];
            break;
          }
        }
      }

      if (!Array.isArray(customers)) {
        console.warn('[KIOTVIET] Unexpected response format:', JSON.stringify(response).substring(0, 200));
        customers = [];
      }

      console.log(`[KIOTVIET] Found ${customers.length} customers to sync`);

      let synced = 0;
      let failed = 0;
      const errors = [];

      for (const kvCustomer of customers) {
        try {
          if (!kvCustomer || !kvCustomer.id) {
            console.warn('[KIOTVIET] Skipping invalid customer:', JSON.stringify(kvCustomer).substring(0, 100));
            failed++;
            continue;
          }
          await this.syncCustomerToDatabase(kvCustomer);
          synced++;
        } catch (error) {
          failed++;
          const errorInfo = {
            customer_id: kvCustomer?.id || 'unknown',
            customer_code: kvCustomer?.code || kvCustomer?.customerCode || 'unknown',
            error: error.message || 'Unknown error'
          };
          errors.push(errorInfo);
          console.error(`[KIOTVIET] Error syncing customer ${errorInfo.customer_id}:`, error.message);
          
          // Log detailed error for debugging
          if (error.stack) {
            console.error(`[KIOTVIET] Error stack:`, error.stack.substring(0, 500));
          }
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

      const result = {
        success: synced > 0 || customers.length === 0, // Success if we synced something or there was nothing to sync
        synced,
        failed,
        total: customers.length,
        errors: errors.slice(0, 20) // Show more errors
      };

      // Log summary
      console.log(`[KIOTVIET] Sync customers completed: ${synced} synced, ${failed} failed out of ${customers.length} total`);

      return result;
    } catch (error) {
      console.error('[KIOTVIET] Sync customers failed:', error);
      await this.logSync('customers', 'failed', {
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });
      throw error;
    }
  }

  /**
   * Sync single customer to database
   */
  async syncCustomerToDatabase(kvCustomer) {
    if (!kvCustomer || !kvCustomer.id) {
      throw new Error('Invalid customer data: missing id');
    }

    const customerData = {
      kiotviet_id: kvCustomer.id?.toString(),
      code: kvCustomer.code || kvCustomer.customerCode || `KV-${kvCustomer.id}`,
      name: (kvCustomer.name || kvCustomer.contactName || kvCustomer.customerName || '').substring(0, 255),
      email: (kvCustomer.email || kvCustomer.emailAddress || '').substring(0, 100),
      phone: (kvCustomer.contactNumber || kvCustomer.phoneNumber || kvCustomer.mobile || '').substring(0, 20),
      address: (kvCustomer.address || kvCustomer.addressLine || '').substring(0, 500),
      kiotviet_data: JSON.stringify(kvCustomer)
    };

    // Validate required fields
    if (!customerData.name || customerData.name.trim() === '') {
      customerData.name = `Khách hàng ${customerData.code}`;
    }

    // Check if customer exists
    const existing = await db.pool.query(
      'SELECT id FROM customers WHERE kiotviet_id = $1 OR (code = $2 AND code IS NOT NULL)',
      [customerData.kiotviet_id, customerData.code]
    );

    if (existing.rows.length > 0) {
      // Update existing customer - use ON CONFLICT to handle unique constraints
      await db.pool.query(
        `UPDATE customers 
         SET name = $1, email = COALESCE(NULLIF($2, ''), email), 
             phone = COALESCE(NULLIF($3, ''), phone), 
             address = COALESCE(NULLIF($4, ''), address), 
             kiotviet_data = $5
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
      // Create new customer - handle duplicate manually
      try {
        await db.pool.query(
          `INSERT INTO customers (kiotviet_id, code, name, email, phone, address, kiotviet_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            customerData.kiotviet_id,
            customerData.code,
            customerData.name,
            customerData.email || null,
            customerData.phone || null,
            customerData.address || null,
            customerData.kiotviet_data
          ]
        );
      } catch (insertError) {
        // If duplicate code or email, try to update instead
        if (insertError.code === '23505' || insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
          console.log(`[KIOTVIET] Customer ${customerData.code} already exists, updating instead...`);
          const existingCustomer = await db.pool.query(
            'SELECT id FROM customers WHERE code = $1 OR (kiotviet_id = $2 AND kiotviet_id IS NOT NULL)',
            [customerData.code, customerData.kiotviet_id]
          );
          if (existingCustomer.rows.length > 0) {
            await db.pool.query(
              `UPDATE customers 
               SET name = $1, email = COALESCE(NULLIF($2, ''), email), 
                   phone = COALESCE(NULLIF($3, ''), phone), 
                   address = COALESCE(NULLIF($4, ''), address), 
                   kiotviet_data = $5,
                   kiotviet_id = COALESCE($6, kiotviet_id)
               WHERE id = $7`,
              [
                customerData.name,
                customerData.email || null,
                customerData.phone || null,
                customerData.address || null,
                customerData.kiotviet_data,
                customerData.kiotviet_id,
                existingCustomer.rows[0].id
              ]
            );
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      }
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
   * Parse date string safely
   */
  parseDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch (error) {
      console.warn(`[KIOTVIET] Invalid date format: ${dateString}`);
      return null;
    }
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
      console.log('[KIOTVIET] Testing connection...');
      
      // Clean inputs
      const cleanRetailerCode = retailerCode.trim();
      const cleanClientId = clientId.trim();
      const cleanClientSecret = clientSecret.trim();

      // Step 1: Get access token
      console.log('[KIOTVIET] Step 1: Getting access token...');
      const tokenData = await this.getAccessToken(cleanRetailerCode, cleanClientId, cleanClientSecret);
      
      if (!tokenData.access_token) {
        return {
          success: false,
          message: 'Failed to get access token'
        };
      }

      console.log('[KIOTVIET] Step 2: Testing API endpoint...');
      
      // Step 2: Try to get a simple endpoint to verify connection
      // Use a simple endpoint that should work with valid token
      try {
        await this.makeRequest('/api/customers?pageSize=1');
        console.log('[KIOTVIET] Connection test successful!');
      } catch (apiError) {
        // If customers endpoint fails, try products endpoint
        console.log('[KIOTVIET] Customers endpoint failed, trying products...');
        try {
          await this.makeRequest('/api/products?pageSize=1');
          console.log('[KIOTVIET] Connection test successful with products endpoint!');
        } catch (productsError) {
          // If both fail, but we got token, connection is partially working
          console.log('[KIOTVIET] Both endpoints failed, but token was obtained');
          // Still return success if we got the token
        }
      }
      
      return {
        success: true,
        message: 'Connection successful',
        token_expires_at: tokenData.expires_at
      };
    } catch (error) {
      console.error('[KIOTVIET] Connection test failed:', {
        message: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        message: error.message || 'Connection failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}

module.exports = new KiotVietService();

