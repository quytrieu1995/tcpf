import { useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import Button from './Button'

const ShippingLabelPrint = ({ shipment, printSettings, onClose }) => {
  const printRef = useRef(null)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const printContent = printRef.current.innerHTML
    
    const paperSize = printSettings?.paperSize || '80mm'
    const paperSizes = {
      'A4': { width: '210mm', height: '297mm' },
      'A5': { width: '148mm', height: '210mm' },
      '80mm': { width: '80mm', height: 'auto' },
      '58mm': { width: '58mm', height: 'auto' },
      '100x150mm': { width: '100mm', height: '150mm' },
      'custom': { 
        width: printSettings?.customWidth || '80mm', 
        height: printSettings?.customHeight || 'auto' 
      }
    }
    
    const size = paperSizes[paperSize] || paperSizes['80mm']
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vận đơn ${shipment?.tracking_number || ''}</title>
          <style>
            @page {
              size: ${paperSize === '80mm' || paperSize === '58mm' || paperSize === '100x150mm' ? `${size.width}` : `${size.width} ${size.height}`};
              margin: ${printSettings?.margin || '5mm'};
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: ${printSettings?.fontSize || '10'}pt;
              line-height: 1.3;
              color: #000;
              background: white;
            }
            .label-container {
              width: 100%;
              max-width: 100%;
              border: ${printSettings?.showBorder ? '2px solid #000' : 'none'};
              padding: ${printSettings?.padding || '5mm'};
            }
            .label-header {
              text-align: ${printSettings?.headerAlign || 'center'};
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 1px solid #000;
            }
            .label-header img {
              max-width: ${printSettings?.logoWidth || '80'}px;
              max-height: ${printSettings?.logoHeight || '40'}px;
              margin-bottom: 5px;
            }
            .label-header h2 {
              font-size: ${printSettings?.titleSize || '16'}pt;
              font-weight: bold;
              margin-bottom: 3px;
            }
            .label-section {
              margin: 8px 0;
              padding: 5px 0;
            }
            .label-section h3 {
              font-size: ${printSettings?.sectionTitleSize || '12'}pt;
              font-weight: bold;
              margin-bottom: 5px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 3px;
            }
            .label-section p {
              margin: 2px 0;
              font-size: ${printSettings?.fontSize || '10'}pt;
              word-wrap: break-word;
            }
            .tracking-number {
              text-align: center;
              font-size: ${(printSettings?.fontSize || 10) + 4}pt;
              font-weight: bold;
              margin: 10px 0;
              padding: 8px;
              background-color: #f0f0f0;
              border: 2px solid #000;
            }
            .barcode-area {
              text-align: center;
              margin: 10px 0;
              padding: 5px;
            }
            .label-footer {
              margin-top: 10px;
              text-align: center;
              font-size: ${printSettings?.footerFontSize || '8'}pt;
              padding-top: 8px;
              border-top: 1px solid #ccc;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              margin: 5px 0;
            }
            .info-item {
              font-size: ${printSettings?.fontSize || '10'}pt;
            }
            .info-label {
              font-weight: bold;
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

  if (!shipment) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Xem trước vận đơn</h2>
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
          <div className="label-container">
            {/* Header */}
            <div className="label-header">
              {printSettings?.logoUrl && (
                <img src={printSettings.logoUrl} alt="Logo" />
              )}
              <h2>{printSettings?.title || 'VẬN ĐƠN'}</h2>
              {printSettings?.companyName && (
                <p><strong>{printSettings.companyName}</strong></p>
              )}
            </div>

            {/* Tracking Number */}
            <div className="tracking-number">
              {shipment.tracking_number}
            </div>

            {/* From Address */}
            <div className="label-section">
              <h3>Người gửi</h3>
              {printSettings?.senderName && (
                <p><strong>{printSettings.senderName}</strong></p>
              )}
              {printSettings?.senderAddress && (
                <p>{printSettings.senderAddress}</p>
              )}
              {printSettings?.senderPhone && (
                <p>ĐT: {printSettings.senderPhone}</p>
              )}
            </div>

            {/* To Address */}
            <div className="label-section">
              <h3>Người nhận</h3>
              {shipment.customer_name && (
                <p><strong>{shipment.customer_name}</strong></p>
              )}
              {shipment.customer_phone && (
                <p>ĐT: {shipment.customer_phone}</p>
              )}
              {shipment.shipping_address && (
                <p>{shipment.shipping_address}</p>
              )}
            </div>

            {/* Shipment Info */}
            <div className="label-section">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Đơn vị vận chuyển:</span> {shipment.carrier_name || '-'}
                </div>
                <div className="info-item">
                  <span className="info-label">Mã đơn:</span> {shipment.order_number || '-'}
                </div>
                <div className="info-item">
                  <span className="info-label">Trạng thái:</span> {shipment.status || 'pending'}
                </div>
                <div className="info-item">
                  <span className="info-label">Ngày tạo:</span> {format(new Date(shipment.created_at), 'dd/MM/yyyy', { locale: vi })}
                </div>
                {shipment.estimated_delivery_date && (
                  <div className="info-item">
                    <span className="info-label">Dự kiến giao:</span> {format(new Date(shipment.estimated_delivery_date), 'dd/MM/yyyy', { locale: vi })}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {shipment.notes && (
              <div className="label-section">
                <h3>Ghi chú</h3>
                <p>{shipment.notes}</p>
              </div>
            )}

            {/* Barcode */}
            {printSettings?.showBarcode && shipment.tracking_number && (
              <div className="barcode-area">
                <p className="text-xs">Mã vận đơn: {shipment.tracking_number}</p>
              </div>
            )}

            {/* Footer */}
            <div className="label-footer">
              {printSettings?.footerText && (
                <p>{printSettings.footerText}</p>
              )}
              <p>Cảm ơn quý khách!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingLabelPrint

