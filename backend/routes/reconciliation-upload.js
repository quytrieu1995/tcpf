const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/reconciliation');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `reconciliation-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.mimetype === 'application/vnd.ms-excel' ||
                     file.mimetype === 'text/csv' ||
                     extname;
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ cho phép upload file Excel (.xlsx, .xls) hoặc CSV'));
    }
  }
});

// Parse Excel file
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    return data;
  } catch (error) {
    throw new Error('Không thể đọc file Excel: ' + error.message);
  }
}

// Extract tracking number from various possible column names
function getTrackingNumber(row) {
  const possibleKeys = [
    'mã vận đơn', 'mã vân đơn', 'ma van don', 'tracking_number', 
    'tracking number', 'waybill', 'waybill_code', 'mã đơn'
  ];
  
  for (const key of possibleKeys) {
    const lowerKey = key.toLowerCase();
    for (const rowKey in row) {
      if (rowKey.toLowerCase() === lowerKey || rowKey.toLowerCase().includes(lowerKey)) {
        return String(row[rowKey] || '').trim();
      }
    }
  }
  return null;
}

// Extract numeric value from cell
function extractNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const str = String(value).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Get numeric value from row by possible column names
function getNumericValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    const lowerKey = key.toLowerCase();
    for (const rowKey in row) {
      if (rowKey.toLowerCase() === lowerKey || rowKey.toLowerCase().includes(lowerKey)) {
        return extractNumber(row[rowKey]);
      }
    }
  }
  return 0;
}

// Upload and process reconciliation file
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    const { reconciliation_id, upload_type, partner_id, partner_name, period_start, period_end } = req.body;
    const user = req.user;

    await client.query('BEGIN');

    // Save upload record
    const uploadResult = await client.query(
      `INSERT INTO reconciliation_uploads (
        reconciliation_id, file_name, file_path, file_size, upload_type,
        partner_id, partner_name, period_start, period_end, status, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        reconciliation_id || null,
        req.file.originalname,
        req.file.path,
        req.file.size,
        upload_type || 'carrier',
        partner_id || null,
        partner_name || null,
        period_start || null,
        period_end || null,
        'processing',
        user.id
      ]
    );

    const uploadRecord = uploadResult.rows[0];

    // Update status to processing
    await client.query(
      'UPDATE reconciliation_uploads SET status = $1 WHERE id = $2',
      ['processing', uploadRecord.id]
    );

    await client.query('COMMIT');
    client.release();

    // Process file asynchronously
    processReconciliationFile(uploadRecord.id, req.file.path, {
      upload_type: upload_type || 'carrier',
      partner_id,
      period_start,
      period_end
    }).catch(error => {
      console.error('Error processing reconciliation file:', error);
      db.pool.query(
        'UPDATE reconciliation_uploads SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, uploadRecord.id]
      );
    });

    res.json({
      success: true,
      message: 'File đã được upload và đang được xử lý',
      upload_id: uploadRecord.id,
      status: 'processing'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    if (client) client.release();
    console.error('Upload reconciliation file error:', error);
    res.status(500).json({ message: error.message || 'Có lỗi xảy ra khi upload file' });
  }
});

// Process reconciliation file
async function processReconciliationFile(uploadId, filePath, options) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Parse Excel file
    const rows = parseExcelFile(filePath);
    let matchedCount = 0;
    let unmatchedCount = 0;
    let notFoundCount = 0;
    let totalAmountFile = 0;
    let totalAmountSystem = 0;

    // Process each row
    for (const row of rows) {
      const trackingNumber = getTrackingNumber(row);
      if (!trackingNumber) continue;

      // Get COD amount
      const codAmount = getNumericValue(row, [
        'số tiền cod', 'số tiền cod (1)', 'cod amount', 'số tiền thu hộ'
      ]);

      // Get shipping fee
      const shippingFee = getNumericValue(row, [
        'cước phí', 'cước phí pp_pm', 'cước phí pp_pm (3)', 'shipping fee', 'phí vận chuyển'
      ]);

      // Get COD collection fee
      const codFee = getNumericValue(row, [
        'phí thu hộ cod', 'phí thu hộ cod (2)', 'cod fee', 'phí thu hộ'
      ]);

      // Get return fee
      const returnFee = getNumericValue(row, [
        'phí chuyển hoàn', 'phí chuyển hoàn (nếu có)', 'phí chuyển hoàn (4)', 'return fee', 'phí hoàn'
      ]);

      // Get partial delivery fee
      const partialFee = getNumericValue(row, [
        'phí giao 1 phần', 'phí giao 1 phần (nếu có)', 'phí giao 1 phần (5)', 'partial fee'
      ]);

      // Get adjustment amount
      const adjustment = getNumericValue(row, [
        'tiền điều chỉnh', 'tiền điều chỉnh (nếu có)', 'tiền điều chỉnh (6)', 'adjustment'
      ]);

      // Calculate net amount from file
      const netAmountFile = codAmount - codFee - shippingFee - returnFee - partialFee + adjustment;
      totalAmountFile += netAmountFile;

      // Find order or shipment by tracking number
      let order = null;
      let shipment = null;

      if (options.upload_type === 'carrier') {
        // Find shipment
        const shipmentResult = await client.query(
          `SELECT s.*, o.* FROM shipments s
           LEFT JOIN orders o ON s.order_id = o.id
           WHERE s.tracking_number = $1`,
          [trackingNumber]
        );
        
        if (shipmentResult.rows.length > 0) {
          shipment = shipmentResult.rows[0];
          order = shipment;
        }
      } else {
        // Find order
        const orderResult = await client.query(
          `SELECT * FROM orders WHERE tracking_number = $1 OR order_number = $1`,
          [trackingNumber]
        );
        
        if (orderResult.rows.length > 0) {
          order = orderResult.rows[0];
        }
      }

      let reconciliationStatus = 'not_found';
      let differences = {};
      let codAmountSystem = 0;
      let shippingFeeSystem = 0;
      let netAmountSystem = 0;

      if (order || shipment) {
        codAmountSystem = parseFloat(order.cod_amount || 0);
        shippingFeeSystem = parseFloat(order.shipping_cost || 0);
        netAmountSystem = codAmountSystem - shippingFeeSystem;
        totalAmountSystem += netAmountSystem;

        // Compare values
        const codDiff = Math.abs(codAmount - codAmountSystem);
        const shippingDiff = Math.abs(shippingFee - shippingFeeSystem);
        const netDiff = Math.abs(netAmountFile - netAmountSystem);
        const tolerance = 1000; // Allow 1000 VND difference

        if (codDiff <= tolerance && shippingDiff <= tolerance && netDiff <= tolerance) {
          reconciliationStatus = 'matched';
          matchedCount++;
          
          // Update order/shipment reconciliation status
          if (options.upload_type === 'carrier' && shipment) {
            await client.query(
              'UPDATE shipments SET reconciliation_status = $1 WHERE id = $2',
              ['matched', shipment.id]
            );
          }
          if (order) {
            await client.query(
              'UPDATE orders SET reconciliation_status = $1 WHERE id = $2',
              ['matched', order.id]
            );
          }
        } else {
          reconciliationStatus = 'mismatched';
          unmatchedCount++;
          differences = {
            cod_amount: { file: codAmount, system: codAmountSystem, difference: codDiff },
            shipping_fee: { file: shippingFee, system: shippingFeeSystem, difference: shippingDiff },
            net_amount: { file: netAmountFile, system: netAmountSystem, difference: netDiff }
          };
          
          // Update order/shipment reconciliation status
          if (options.upload_type === 'carrier' && shipment) {
            await client.query(
              'UPDATE shipments SET reconciliation_status = $1 WHERE id = $2',
              ['mismatched', shipment.id]
            );
          }
          if (order) {
            await client.query(
              'UPDATE orders SET reconciliation_status = $1 WHERE id = $2',
              ['mismatched', order.id]
            );
          }
        }
      } else {
        notFoundCount++;
        reconciliationStatus = 'not_found';
      }

      // Save file item
      await client.query(
        `INSERT INTO reconciliation_file_items (
          upload_id, order_id, shipment_id, tracking_number, order_number,
          cod_amount_file, cod_amount_system, shipping_fee_file, shipping_fee_system,
          cod_fee_file, return_fee_file, partial_fee_file, adjustment_file,
          net_amount_file, net_amount_system, difference_amount, reconciliation_status, differences
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          uploadId,
          order?.id || null,
          shipment?.id || null,
          trackingNumber,
          order?.order_number || null,
          codAmount,
          codAmountSystem,
          shippingFee,
          shippingFeeSystem,
          codFee,
          returnFee,
          partialFee,
          adjustment,
          netAmountFile,
          netAmountSystem,
          netAmountFile - netAmountSystem,
          reconciliationStatus,
          JSON.stringify(differences)
        ]
      );
    }

    // Update upload record
    const differenceAmount = totalAmountFile - totalAmountSystem;
    await client.query(
      `UPDATE reconciliation_uploads SET
        total_records = $1,
        matched_records = $2,
        unmatched_records = $3,
        total_amount_file = $4,
        total_amount_system = $5,
        difference_amount = $6,
        status = $7,
        processed_at = CURRENT_TIMESTAMP
      WHERE id = $8`,
      [
        rows.length,
        matchedCount,
        unmatchedCount + notFoundCount,
        totalAmountFile,
        totalAmountSystem,
        differenceAmount,
        'completed',
        uploadId
      ]
    );

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Get upload history
router.get('/uploads', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await db.pool.query(
      `SELECT u.*, r.reconciliation_code, r.type as reconciliation_type,
              creator.full_name as creator_name
       FROM reconciliation_uploads u
       LEFT JOIN reconciliations r ON u.reconciliation_id = r.id
       LEFT JOIN users creator ON u.uploaded_by = creator.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), (parseInt(page) - 1) * parseInt(limit)]
    );

    const countResult = await db.pool.query('SELECT COUNT(*) FROM reconciliation_uploads');
    
    res.json({
      uploads: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upload details with items
router.get('/uploads/:id', authenticate, async (req, res) => {
  try {
    const uploadResult = await db.pool.query(
      `SELECT u.*, r.reconciliation_code, r.type as reconciliation_type,
              creator.full_name as creator_name
       FROM reconciliation_uploads u
       LEFT JOIN reconciliations r ON u.reconciliation_id = r.id
       LEFT JOIN users creator ON u.uploaded_by = creator.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    const upload = uploadResult.rows[0];

    // Get items
    const itemsResult = await db.pool.query(
      `SELECT * FROM reconciliation_file_items WHERE upload_id = $1 ORDER BY tracking_number`,
      [req.params.id]
    );

    upload.items = itemsResult.rows.map(item => ({
      ...item,
      differences: typeof item.differences === 'string' ? JSON.parse(item.differences) : item.differences
    }));

    res.json(upload);
  } catch (error) {
    console.error('Get upload details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete upload
router.delete('/uploads/:id', authenticate, async (req, res) => {
  try {
    const uploadResult = await db.pool.query(
      'SELECT file_path FROM reconciliation_uploads WHERE id = $1',
      [req.params.id]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    // Delete file
    const filePath = uploadResult.rows[0].file_path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record (cascade will delete items)
    await db.pool.query('DELETE FROM reconciliation_uploads WHERE id = $1', [req.params.id]);
    
    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

