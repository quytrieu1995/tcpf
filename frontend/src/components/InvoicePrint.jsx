import { useRef, useEffect } from 'react'
import { Printer, X } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import Button from './Button'

const InvoicePrint = ({ order, printSettings, onClose }) => {
  const printRef = useRef(null)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const printContent = printRef.current.innerHTML
    
    const paperSize = printSettings?.paperSize || 'A4'
    const paperSizes = {
      'A4': { width: '210mm', height: '297mm' },
      'A5': { width: '148mm', height: '210mm' },
      '80mm': { width: '80mm', height: 'auto' },
      '58mm': { width: '58mm', height: 'auto' },
      'custom': { 
        width: printSettings?.customWidth || '210mm', 
        height: printSettings?.customHeight || '297mm' 
      }
    }
    
    const size = paperSizes[paperSize] || paperSizes['A4']
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Hóa đơn ${order?.order_number || ''}</title>
          <style>
            @page {
              size: ${paperSize === '80mm' || paperSize === '58mm' ? `${size.width}` : `${size.width} ${size.height}`};
              margin: ${printSettings?.margin || '10mm'};
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: ${printSettings?.fontSize || '12'}pt;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            .invoice-container {
              width: 100%;
              max-width: 100%;
            }
            .invoice-header {
              text-align: ${printSettings?.headerAlign || 'center'};
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 2px solid #000;
            }
            .invoice-header img {
              max-width: ${printSettings?.logoWidth || '150'}px;
              max-height: ${printSettings?.logoHeight || '80'}px;
              margin-bottom: 10px;
            }
            .invoice-header h1 {
              font-size: ${printSettings?.titleSize || '20'}pt;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .invoice-header p {
              font-size: ${printSettings?.headerFontSize || '10'}pt;
              margin: 2px 0;
            }
            .invoice-info {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
              flex-wrap: wrap;
            }
            .info-block {
              flex: 1;
              min-width: 200px;
              margin: 10px;
            }
            .info-block h3 {
              font-size: ${printSettings?.sectionTitleSize || '14'}pt;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .info-block p {
              margin: 3px 0;
              font-size: ${printSettings?.fontSize || '12'}pt;
            }
            .invoice-items {
              margin: 20px 0;
            }
            .invoice-items table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .invoice-items th,
            .invoice-items td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            .invoice-items th {
              background-color: #f0f0f0;
              font-weight: bold;
              text-align: center;
            }
            .invoice-items td {
              text-align: ${printSettings?.tableAlign || 'left'};
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .invoice-summary {
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #000;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: ${printSettings?.fontSize || '12'}pt;
            }
            .summary-row.total {
              font-weight: bold;
              font-size: ${(printSettings?.fontSize || 12) + 2}pt;
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #000;
            }
            .invoice-footer {
              margin-top: 30px;
              text-align: center;
              font-size: ${printSettings?.footerFontSize || '10'}pt;
              padding-top: 15px;
              border-top: 1px solid #ccc;
            }
            .invoice-footer p {
              margin: 5px 0;
            }
            .barcode {
              text-align: center;
              margin: 15px 0;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  if (!order) return null

  const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0
  const discount = order.discount_amount || 0
  const shipping = order.shipping_cost || 0
  const tax = order.tax_amount || 0
  const total = subtotal - discount + shipping + tax

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Xem trước hóa đơn</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              In
            </Button>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Đóng
            </Button>
          </div>
        </div>
        
        <div ref={printRef} className="p-6">
          <div className="invoice-container">
            {/* Header */}
            <div className="invoice-header">
              {printSettings?.logoUrl && (
                <img src={printSettings.logoUrl} alt="Logo" />
              )}
              <h1>{printSettings?.title || 'HÓA ĐƠN BÁN HÀNG'}</h1>
              {printSettings?.companyName && (
                <p><strong>{printSettings.companyName}</strong></p>
              )}
              {printSettings?.companyAddress && (
                <p>{printSettings.companyAddress}</p>
              )}
              {printSettings?.companyPhone && (
                <p>Điện thoại: {printSettings.companyPhone}</p>
              )}
              {printSettings?.companyEmail && (
                <p>Email: {printSettings.companyEmail}</p>
              )}
              {printSettings?.companyTaxCode && (
                <p>Mã số thuế: {printSettings.companyTaxCode}</p>
              )}
            </div>

            {/* Order Info */}
            <div className="invoice-info">
              <div className="info-block">
                <h3>Thông tin đơn hàng</h3>
                <p><strong>Mã đơn:</strong> {order.order_number}</p>
                <p><strong>Ngày đặt:</strong> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</p>
                {order.sales_channel && (
                  <p><strong>Kênh bán:</strong> {order.sales_channel}</p>
                )}
                {order.tracking_number && (
                  <p><strong>Mã vận đơn:</strong> {order.tracking_number}</p>
                )}
              </div>
              
              <div className="info-block">
                <h3>Thông tin khách hàng</h3>
                {order.customer_name && (
                  <p><strong>Tên:</strong> {order.customer_name}</p>
                )}
                {order.customer_phone && (
                  <p><strong>Điện thoại:</strong> {order.customer_phone}</p>
                )}
                {order.customer_email && (
                  <p><strong>Email:</strong> {order.customer_email}</p>
                )}
                {order.shipping_address && (
                  <p><strong>Địa chỉ:</strong> {order.shipping_address}</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="invoice-items">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>STT</th>
                    <th style={{ width: '40%' }}>Sản phẩm</th>
                    <th style={{ width: '10%' }} className="text-center">SL</th>
                    <th style={{ width: '20%' }} className="text-right">Đơn giá</th>
                    <th style={{ width: '25%' }} className="text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => (
                    <tr key={item.id || index}>
                      <td className="text-center">{index + 1}</td>
                      <td>
                        <strong>{item.product_name || item.name}</strong>
                        {item.sku && <div className="text-xs text-gray-600">SKU: {item.sku}</div>}
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="invoice-summary">
              <div className="summary-row">
                <span>Tạm tính:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="summary-row">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {shipping > 0 && (
                <div className="summary-row">
                  <span>Phí vận chuyển:</span>
                  <span>{formatCurrency(shipping)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="summary-row">
                  <span>Thuế VAT:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>TỔNG CỘNG:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment Info */}
            {order.payment_method && (
              <div className="invoice-info" style={{ marginTop: '20px' }}>
                <div className="info-block">
                  <h3>Phương thức thanh toán</h3>
                  <p>{order.payment_method}</p>
                  {order.payment_status && (
                    <p>Trạng thái: {order.payment_status}</p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="invoice-footer">
              {printSettings?.footerText && (
                <p>{printSettings.footerText}</p>
              )}
              <p>Cảm ơn quý khách đã sử dụng dịch vụ!</p>
              {printSettings?.showBarcode && order.order_number && (
                <div className="barcode">
                  <p className="text-xs">Mã đơn: {order.order_number}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvoicePrint

