const axios = require('axios');
const db = require('../config/database');

class CarrierService {
  /**
   * Sync shipment status from carrier API
   */
  async syncShipmentStatus(shipmentId) {
    try {
      const shipment = await db.pool.query(
        `SELECT s.*, sm.api_type, sm.api_endpoint, sm.api_key, sm.api_secret, sm.api_config
         FROM shipments s
         JOIN shipping_methods sm ON s.carrier_id = sm.id
         WHERE s.id = $1`,
        [shipmentId]
      );

      if (shipment.rows.length === 0) {
        throw new Error('Shipment not found');
      }

      const shipmentData = shipment.rows[0];
      
      if (!shipmentData.api_type || !shipmentData.is_connected) {
        throw new Error('Carrier API not configured or not connected');
      }

      let statusData;
      switch (shipmentData.api_type) {
        case 'ghn':
          statusData = await this.syncGHN(shipmentData);
          break;
        case 'viettel_post':
          statusData = await this.syncViettelPost(shipmentData);
          break;
        case 'ghtk':
          statusData = await this.syncGHTK(shipmentData);
          break;
        case 'jnt':
          statusData = await this.syncJNT(shipmentData);
          break;
        case 'shopee_express':
          statusData = await this.syncShopeeExpress(shipmentData);
          break;
        case 'vnpost':
          statusData = await this.syncVnPost(shipmentData);
          break;
        case 'manual':
        default:
          throw new Error('Manual tracking - no API sync available');
      }

      // Update shipment with carrier status
      await db.pool.query(
        `UPDATE shipments 
         SET status = $1, 
             carrier_status = $2,
             carrier_status_message = $3,
             tracking_events = $4,
             last_synced_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          this.mapCarrierStatusToInternal(statusData.status, shipmentData.api_type),
          statusData.status,
          statusData.message || null,
          JSON.stringify(statusData.events || []),
          shipmentId
        ]
      );

      // Update order status if delivered
      if (statusData.status === 'delivered' || statusData.status === 'Đã giao hàng') {
        await db.pool.query(
          `UPDATE shipments SET delivered_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [shipmentId]
        );
        await db.pool.query(
          `UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
           WHERE id = $1`,
          [shipmentData.order_id]
        );
      }

      return statusData;
    } catch (error) {
      console.error('Error syncing shipment status:', error);
      throw error;
    }
  }

  /**
   * Sync all pending/in_transit shipments for a carrier
   */
  async syncCarrierShipments(carrierId) {
    try {
      const shipments = await db.pool.query(
        `SELECT id FROM shipments 
         WHERE carrier_id = $1 
         AND status IN ('pending', 'in_transit')
         AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '1 hour')`,
        [carrierId]
      );

      const results = [];
      for (const shipment of shipments.rows) {
        try {
          const status = await this.syncShipmentStatus(shipment.id);
          results.push({ shipmentId: shipment.id, success: true, status });
        } catch (error) {
          results.push({ shipmentId: shipment.id, success: false, error: error.message });
        }
      }

      // Update carrier last_sync_at
      await db.pool.query(
        `UPDATE shipping_methods SET last_sync_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [carrierId]
      );

      return results;
    } catch (error) {
      console.error('Error syncing carrier shipments:', error);
      throw error;
    }
  }

  /**
   * Test carrier API connection
   */
  async testConnection(carrierId) {
    try {
      const carrier = await db.pool.query(
        `SELECT * FROM shipping_methods WHERE id = $1`,
        [carrierId]
      );

      if (carrier.rows.length === 0) {
        throw new Error('Carrier not found');
      }

      const carrierData = carrier.rows[0];

      if (!carrierData.api_type || !carrierData.api_endpoint) {
        throw new Error('API not configured');
      }

      let result;
      switch (carrierData.api_type) {
        case 'ghn':
          result = await this.testGHN(carrierData);
          break;
        case 'viettel_post':
          result = await this.testViettelPost(carrierData);
          break;
        case 'ghtk':
          result = await this.testGHTK(carrierData);
          break;
        case 'jnt':
          result = await this.testJNT(carrierData);
          break;
        case 'shopee_express':
          result = await this.testShopeeExpress(carrierData);
          break;
        case 'vnpost':
          result = await this.testVnPost(carrierData);
          break;
        default:
          throw new Error('Unsupported API type');
      }

      // Update connection status
      await db.pool.query(
        `UPDATE shipping_methods SET is_connected = $1, last_sync_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [result.success, carrierId]
      );

      return result;
    } catch (error) {
      console.error('Error testing connection:', error);
      await db.pool.query(
        `UPDATE shipping_methods SET is_connected = false WHERE id = $1`,
        [carrierId]
      );
      throw error;
    }
  }

  // Giao Hàng Nhanh (GHN) Integration
  async syncGHN(shipmentData) {
    try {
      const config = typeof shipmentData.api_config === 'string' 
        ? JSON.parse(shipmentData.api_config || '{}') 
        : (shipmentData.api_config || {});
      
      const response = await axios.get(
        `${shipmentData.api_endpoint}/v2/shipping-order/detail`,
        {
          params: {
            order_code: shipmentData.tracking_number,
            shop_id: config.shop_id
          },
          headers: {
            'Token': shipmentData.api_key,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data?.data;
      if (!data) {
        throw new Error('Invalid response from GHN API');
      }

      return {
        status: data.status || 'unknown',
        message: data.status_name || '',
        events: data.tracking_events || []
      };
    } catch (error) {
      console.error('GHN sync error:', error);
      throw new Error(`GHN API error: ${error.message}`);
    }
  }

  async testGHN(carrierData) {
    try {
      const response = await axios.get(
        `${carrierData.api_endpoint}/v2/shop/all`,
        {
          headers: {
            'Token': carrierData.api_key,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Viettel Post Integration
  async syncViettelPost(shipmentData) {
    try {
      const response = await axios.get(
        `${shipmentData.api_endpoint}/api/v1/tracking`,
        {
          params: {
            tracking_number: shipmentData.tracking_number
          },
          headers: {
            'Authorization': `Bearer ${shipmentData.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data?.data;
      if (!data) {
        throw new Error('Invalid response from Viettel Post API');
      }

      return {
        status: data.status || 'unknown',
        message: data.status_description || '',
        events: data.tracking_history || []
      };
    } catch (error) {
      console.error('Viettel Post sync error:', error);
      throw new Error(`Viettel Post API error: ${error.message}`);
    }
  }

  async testViettelPost(carrierData) {
    try {
      const response = await axios.get(
        `${carrierData.api_endpoint}/api/v1/auth/test`,
        {
          headers: {
            'Authorization': `Bearer ${carrierData.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Giao Hàng Tiết Kiệm (GHTK) Integration
  async syncGHTK(shipmentData) {
    try {
      const config = typeof shipmentData.api_config === 'string' 
        ? JSON.parse(shipmentData.api_config || '{}') 
        : (shipmentData.api_config || {});
      
      const response = await axios.get(
        `${shipmentData.api_endpoint}/services/shipment/v2/${shipmentData.tracking_number}`,
        {
          headers: {
            'Token': shipmentData.api_key,
            'Content-Type': 'application/json'
          },
          params: config.shop_id ? { shop_id: config.shop_id } : {}
        }
      );

      const data = response.data;
      if (!data || !data.success) {
        throw new Error('Invalid response from GHTK API');
      }

      return {
        status: data.label?.status || 'unknown',
        message: data.label?.status_text || '',
        events: data.label?.tracking || []
      };
    } catch (error) {
      console.error('GHTK sync error:', error);
      throw new Error(`GHTK API error: ${error.message}`);
    }
  }

  async testGHTK(carrierData) {
    try {
      const response = await axios.get(
        `${carrierData.api_endpoint}/services/shipment/fee`,
        {
          headers: {
            'Token': carrierData.api_key,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // J&T Express Integration
  async syncJNT(shipmentData) {
    try {
      const config = typeof shipmentData.api_config === 'string' 
        ? JSON.parse(shipmentData.api_config || '{}') 
        : (shipmentData.api_config || {});
      
      const apiEndpoint = shipmentData.api_endpoint || 'https://api.jtexpress.vn';
      
      // J&T API thường sử dụng POST với body
      const response = await axios.post(
        `${apiEndpoint}/api/v1/tracking`,
        {
          waybill_no: shipmentData.tracking_number
        },
        {
          headers: {
            'Authorization': `Bearer ${shipmentData.api_key}`,
            'Content-Type': 'application/json',
            'X-API-Key': shipmentData.api_key
          }
        }
      );

      const data = response.data?.data || response.data;
      if (!data) {
        throw new Error('Invalid response from J&T API');
      }

      // Parse J&T status format
      let status = 'unknown';
      let message = '';
      let events = [];

      if (data.status) {
        status = data.status;
        message = data.status_description || data.status_name || '';
      }

      if (data.tracking_details || data.tracking_events || data.details) {
        events = data.tracking_details || data.tracking_events || data.details || [];
        // Format events to standard format
        events = events.map(event => ({
          status: event.status || event.status_code,
          description: event.description || event.remark || event.note,
          time: event.time || event.datetime || event.created_at,
          location: event.location || event.station || event.warehouse
        }));
      }

      return {
        status: status,
        message: message,
        events: events
      };
    } catch (error) {
      console.error('J&T sync error:', error);
      // Fallback: try alternative endpoint format
      try {
        const altResponse = await axios.get(
          `${shipmentData.api_endpoint}/tracking/${shipmentData.tracking_number}`,
          {
            headers: {
              'Authorization': `Bearer ${shipmentData.api_key}`,
              'Content-Type': 'application/json'
            }
          }
        );
        const altData = altResponse.data?.data || altResponse.data;
        return {
          status: altData?.status || 'unknown',
          message: altData?.status_description || '',
          events: altData?.tracking_details || []
        };
      } catch (altError) {
        throw new Error(`J&T API error: ${error.message}`);
      }
    }
  }

  async testJNT(carrierData) {
    try {
      const apiEndpoint = carrierData.api_endpoint || 'https://api.jtexpress.vn';
      
      // Try to test connection with a simple API call
      // J&T thường có endpoint để check account hoặc get shop info
      const response = await axios.get(
        `${apiEndpoint}/api/v1/account/info`,
        {
          headers: {
            'Authorization': `Bearer ${carrierData.api_key}`,
            'Content-Type': 'application/json',
            'X-API-Key': carrierData.api_key
          }
        }
      );
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      // If account info fails, try alternative test endpoint
      try {
        const altResponse = await axios.post(
          `${carrierData.api_endpoint || 'https://api.jtexpress.vn'}/api/v1/auth/verify`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${carrierData.api_key}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return { success: true, message: 'Connection successful' };
      } catch (altError) {
        return { success: false, message: error.message || 'Connection failed' };
      }
    }
  }

  // Shopee Express Integration
  async syncShopeeExpress(shipmentData) {
    try {
      const config = typeof shipmentData.api_config === 'string' 
        ? JSON.parse(shipmentData.api_config || '{}') 
        : (shipmentData.api_config || {});
      
      const apiEndpoint = shipmentData.api_endpoint || 'https://open-api.shopee.vn';
      
      // Shopee Express API - Get tracking info
      const response = await axios.post(
        `${apiEndpoint}/api/v1/logistics/get_tracking_number`,
        {
          tracking_number: shipmentData.tracking_number,
          partner_id: config.partner_id,
          shop_id: config.shop_id
        },
        {
          headers: {
            'Authorization': `Bearer ${shipmentData.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data?.response || response.data;
      if (!data) {
        throw new Error('Invalid response from Shopee Express API');
      }

      return {
        status: data.status || 'unknown',
        message: data.status_description || data.message || '',
        events: data.tracking_details || data.tracking_events || []
      };
    } catch (error) {
      console.error('Shopee Express sync error:', error);
      throw new Error(`Shopee Express API error: ${error.message}`);
    }
  }

  async testShopeeExpress(carrierData) {
    try {
      const config = typeof carrierData.api_config === 'string' 
        ? JSON.parse(carrierData.api_config || '{}') 
        : (carrierData.api_config || {});
      
      const apiEndpoint = carrierData.api_endpoint || 'https://open-api.shopee.vn';
      
      // Test connection by getting shop info
      const response = await axios.post(
        `${apiEndpoint}/api/v1/shop/get_shop_info`,
        {
          partner_id: config.partner_id,
          shop_id: config.shop_id
        },
        {
          headers: {
            'Authorization': `Bearer ${carrierData.api_key}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || error.message || 'Connection failed' };
    }
  }

  // VnPost (Vietnam Post) Integration
  async syncVnPost(shipmentData) {
    try {
      const config = typeof shipmentData.api_config === 'string' 
        ? JSON.parse(shipmentData.api_config || '{}') 
        : (shipmentData.api_config || {});
      
      const apiEndpoint = shipmentData.api_endpoint || 'https://api.vnpost.vn';
      
      // VnPost API - Get tracking info
      const response = await axios.get(
        `${apiEndpoint}/api/v1/tracking`,
        {
          params: {
            tracking_number: shipmentData.tracking_number
          },
          headers: {
            'Authorization': `Basic ${Buffer.from(`${shipmentData.api_key}:${shipmentData.api_secret || ''}`).toString('base64')}`,
            'Content-Type': 'application/json'
          },
          auth: {
            username: shipmentData.api_key,
            password: shipmentData.api_secret || ''
          }
        }
      );

      const data = response.data?.data || response.data;
      if (!data) {
        throw new Error('Invalid response from VnPost API');
      }

      return {
        status: data.status || 'unknown',
        message: data.status_description || data.message || '',
        events: data.tracking_history || data.tracking_details || []
      };
    } catch (error) {
      console.error('VnPost sync error:', error);
      throw new Error(`VnPost API error: ${error.message}`);
    }
  }

  async testVnPost(carrierData) {
    try {
      const apiEndpoint = carrierData.api_endpoint || 'https://api.vnpost.vn';
      
      // Test connection by authenticating
      const response = await axios.post(
        `${apiEndpoint}/api/v1/auth/login`,
        {
          username: carrierData.api_key,
          password: carrierData.api_secret || ''
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      // Try alternative test endpoint
      try {
        const altResponse = await axios.get(
          `${carrierData.api_endpoint || 'https://api.vnpost.vn'}/api/v1/account/info`,
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${carrierData.api_key}:${carrierData.api_secret || ''}`).toString('base64')}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return { success: true, message: 'Connection successful' };
      } catch (altError) {
        return { success: false, message: error.response?.data?.message || error.message || 'Connection failed' };
      }
    }
  }

  /**
   * Map carrier status to internal status
   */
  mapCarrierStatusToInternal(carrierStatus, apiType) {
    const statusLower = (carrierStatus || '').toLowerCase();
    
    // J&T specific status mappings
    if (apiType === 'jnt') {
      if (statusLower.includes('delivered') || statusLower.includes('đã giao') || 
          statusLower.includes('giao thành công') || statusLower === 'delivered' ||
          statusLower === 'delivery_success') {
        return 'delivered';
      }
      if (statusLower.includes('transit') || statusLower.includes('đang vận chuyển') ||
          statusLower.includes('in_transit') || statusLower === 'in_transit' ||
          statusLower === 'transporting') {
        return 'in_transit';
      }
      if (statusLower.includes('cancelled') || statusLower.includes('hủy') ||
          statusLower === 'cancelled' || statusLower === 'cancel') {
        return 'cancelled';
      }
      if (statusLower.includes('pending') || statusLower.includes('chờ') ||
          statusLower === 'pending' || statusLower === 'picked_up') {
        return 'pending';
      }
    }
    
    // Common status mappings
    if (statusLower.includes('delivered') || statusLower.includes('đã giao') || statusLower === 'delivered') {
      return 'delivered';
    }
    if (statusLower.includes('transit') || statusLower.includes('đang vận chuyển') || statusLower === 'in_transit') {
      return 'in_transit';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('hủy') || statusLower === 'cancelled') {
      return 'cancelled';
    }
    if (statusLower.includes('pending') || statusLower.includes('chờ') || statusLower === 'pending') {
      return 'pending';
    }

    return 'in_transit'; // Default
  }
}

module.exports = new CarrierService();

