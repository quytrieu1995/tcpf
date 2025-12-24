const db = require('../config/database');

class ReconciliationService {
  /**
   * Generate reconciliation code
   */
  generateReconciliationCode(type, partnerName) {
    const prefix = type === 'carrier' ? 'REC-CAR' : 'REC-PLT';
    const timestamp = Date.now().toString().slice(-8);
    const partnerPrefix = partnerName ? partnerName.substring(0, 3).toUpperCase() : 'GEN';
    return `${prefix}-${partnerPrefix}-${timestamp}`;
  }

  /**
   * Create reconciliation with items
   */
  async createReconciliation({ type, partner_id, partner_name, partner_type, period_start, period_end, notes, created_by }) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate reconciliation code
      const reconciliationCode = this.generateReconciliationCode(type, partner_name);

      // Get partner name if not provided
      let finalPartnerName = partner_name;
      if (!finalPartnerName && partner_id) {
        if (type === 'carrier') {
          const carrier = await client.query('SELECT name FROM shipping_methods WHERE id = $1', [partner_id]);
          if (carrier.rows.length > 0) {
            finalPartnerName = carrier.rows[0].name;
            partner_type = 'carrier';
          }
        } else if (type === 'platform') {
          finalPartnerName = partner_id;
          partner_type = 'platform';
        }
      }

      // Fetch orders/shipments based on type
      let items = [];
      let totals = {
        total_orders: 0,
        total_amount: 0,
        total_shipping_fee: 0,
        total_cod_amount: 0,
        total_return_fee: 0,
        total_other_charges: 0,
        total_deductions: 0
      };

      if (type === 'carrier') {
        // Get shipments for carrier in period
        const shipmentsResult = await client.query(`
          SELECT s.*, o.order_number, o.total_amount, o.cod_amount, o.return_fee, 
                 o.customer_paid, o.shipping_cost, o.delivery_status, o.status as order_status,
                 c.name as customer_name, o.created_at as order_date
          FROM shipments s
          INNER JOIN orders o ON s.order_id = o.id
          LEFT JOIN customers c ON o.customer_id = c.id
          WHERE s.carrier_id = $1 
            AND DATE(s.created_at) >= $2 
            AND DATE(s.created_at) <= $3
          ORDER BY s.created_at
        `, [partner_id, period_start, period_end]);

        items = shipmentsResult.rows.map(row => ({
          shipment_id: row.id,
          order_id: row.order_id,
          order_number: row.order_number,
          tracking_number: row.tracking_number,
          customer_name: row.customer_name,
          order_date: row.order_date,
          order_amount: parseFloat(row.total_amount || 0),
          shipping_fee: parseFloat(row.shipping_cost || 0),
          cod_amount: parseFloat(row.cod_amount || 0),
          return_fee: parseFloat(row.return_fee || 0),
          other_charges: 0,
          deductions: 0,
          net_amount: parseFloat(row.total_amount || 0) + parseFloat(row.shipping_cost || 0) + parseFloat(row.cod_amount || 0) - parseFloat(row.return_fee || 0),
          status: row.delivery_status || row.order_status
        }));

        // Calculate totals
        totals.total_orders = items.length;
        totals.total_amount = items.reduce((sum, item) => sum + item.order_amount, 0);
        totals.total_shipping_fee = items.reduce((sum, item) => sum + item.shipping_fee, 0);
        totals.total_cod_amount = items.reduce((sum, item) => sum + item.cod_amount, 0);
        totals.total_return_fee = items.reduce((sum, item) => sum + item.return_fee, 0);

      } else if (type === 'platform') {
        // Get orders for platform in period
        const ordersResult = await client.query(`
          SELECT o.*, c.name as customer_name
          FROM orders o
          LEFT JOIN customers c ON o.customer_id = c.id
          WHERE o.sales_channel = $1 
            AND DATE(o.created_at) >= $2 
            AND DATE(o.created_at) <= $3
          ORDER BY o.created_at
        `, [partner_id, period_start, period_end]);

        items = ordersResult.rows.map(row => ({
          order_id: row.id,
          order_number: row.order_number,
          tracking_number: row.tracking_number,
          customer_name: row.customer_name,
          order_date: row.created_at,
          order_amount: parseFloat(row.total_amount || 0),
          shipping_fee: parseFloat(row.shipping_cost || 0),
          cod_amount: parseFloat(row.cod_amount || 0),
          return_fee: parseFloat(row.return_fee || 0),
          other_charges: parseFloat(row.other_income || 0),
          deductions: parseFloat(row.payment_discount || 0) + parseFloat(row.discount_amount || 0),
          net_amount: parseFloat(row.customer_paid || row.total_amount || 0),
          status: row.delivery_status || row.status
        }));

        // Calculate totals
        totals.total_orders = items.length;
        totals.total_amount = items.reduce((sum, item) => sum + item.order_amount, 0);
        totals.total_shipping_fee = items.reduce((sum, item) => sum + item.shipping_fee, 0);
        totals.total_cod_amount = items.reduce((sum, item) => sum + item.cod_amount, 0);
        totals.total_return_fee = items.reduce((sum, item) => sum + item.return_fee, 0);
        totals.total_other_charges = items.reduce((sum, item) => sum + item.other_charges, 0);
        totals.total_deductions = items.reduce((sum, item) => sum + item.deductions, 0);
      }

      // Calculate net amount
      totals.net_amount = totals.total_amount + 
                         totals.total_shipping_fee + 
                         totals.total_cod_amount - 
                         totals.total_return_fee + 
                         totals.total_other_charges - 
                         totals.total_deductions;

      // Create reconciliation
      const reconciliationResult = await client.query(
        `INSERT INTO reconciliations (
          reconciliation_code, type, partner_id, partner_name, partner_type,
          period_start, period_end, total_orders, total_amount, total_shipping_fee,
          total_cod_amount, total_return_fee, total_other_charges, total_deductions,
          net_amount, status, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          reconciliationCode, type, partner_id, finalPartnerName, partner_type,
          period_start, period_end, totals.total_orders, totals.total_amount, totals.total_shipping_fee,
          totals.total_cod_amount, totals.total_return_fee, totals.total_other_charges, totals.total_deductions,
          totals.net_amount, 'pending', notes, created_by
        ]
      );

      const reconciliation = reconciliationResult.rows[0];

      // Create reconciliation items
      for (const item of items) {
        await client.query(
          `INSERT INTO reconciliation_items (
            reconciliation_id, order_id, shipment_id, order_number, tracking_number,
            customer_name, order_date, order_amount, shipping_fee, cod_amount,
            return_fee, other_charges, deductions, net_amount, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            reconciliation.id,
            item.order_id || null,
            item.shipment_id || null,
            item.order_number,
            item.tracking_number || null,
            item.customer_name || null,
            item.order_date,
            item.order_amount,
            item.shipping_fee,
            item.cod_amount,
            item.return_fee,
            item.other_charges,
            item.deductions,
            item.net_amount,
            item.status
          ]
        );
      }

      await client.query('COMMIT');

      // Fetch complete reconciliation with items
      const completeReconciliation = await db.pool.query(
        `SELECT * FROM reconciliations WHERE id = $1`,
        [reconciliation.id]
      );
      const itemsResult = await db.pool.query(
        `SELECT * FROM reconciliation_items WHERE reconciliation_id = $1 ORDER BY order_date DESC`,
        [reconciliation.id]
      );

      const result = completeReconciliation.rows[0];
      result.items = itemsResult.rows;

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ReconciliationService();

