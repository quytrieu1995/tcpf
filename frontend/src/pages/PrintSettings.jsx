import { useEffect, useState } from 'react'
import { Save, Printer, FileText, Package } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import api from '../config/api'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'

const PrintSettings = () => {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('invoice')
  const [invoiceSettings, setInvoiceSettings] = useState({
    paperSize: 'A4',
    customWidth: '210mm',
    customHeight: '297mm',
    margin: '10mm',
    fontSize: 12,
    titleSize: 20,
    headerFontSize: 10,
    sectionTitleSize: 14,
    footerFontSize: 10,
    logoUrl: '',
    logoWidth: 150,
    logoHeight: 80,
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyTaxCode: '',
    title: 'HÓA ĐƠN BÁN HÀNG',
    headerAlign: 'center',
    tableAlign: 'left',
    footerText: '',
    showBarcode: true
  })
  const [shippingSettings, setShippingSettings] = useState({
    paperSize: '80mm',
    customWidth: '80mm',
    customHeight: 'auto',
    margin: '5mm',
    fontSize: 10,
    titleSize: 16,
    sectionTitleSize: 12,
    footerFontSize: 8,
    logoUrl: '',
    logoWidth: 80,
    logoHeight: 40,
    companyName: '',
    title: 'VẬN ĐƠN',
    headerAlign: 'center',
    padding: '5mm',
    showBorder: true,
    senderName: '',
    senderAddress: '',
    senderPhone: '',
    footerText: '',
    showBarcode: true
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/print-settings')
      if (response.data) {
        if (response.data.invoice) {
          setInvoiceSettings({ ...invoiceSettings, ...response.data.invoice })
        }
        if (response.data.shipping) {
          setShippingSettings({ ...shippingSettings, ...response.data.shipping })
        }
      }
    } catch (error) {
      console.error('Error fetching print settings:', error)
      // Use default settings if fetch fails
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.post('/print-settings', {
        invoice: invoiceSettings,
        shipping: shippingSettings
      })
      toast.success('Đã lưu cài đặt in thành công!')
    } catch (error) {
      console.error('Error saving print settings:', error)
      toast.error('Có lỗi xảy ra khi lưu cài đặt')
    } finally {
      setSaving(false)
    }
  }

  const paperSizes = [
    { value: 'A4', label: 'A4 (210 x 297mm)' },
    { value: 'A5', label: 'A5 (148 x 210mm)' },
    { value: '80mm', label: '80mm (Máy in nhiệt)' },
    { value: '58mm', label: '58mm (Máy in nhiệt nhỏ)' },
    { value: '100x150mm', label: '100 x 150mm' },
    { value: 'custom', label: 'Tùy chỉnh' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary drop-shadow-sm">
            Cài đặt mẫu in
          </h1>
          <p className="text-gray-600 mt-1">Cấu hình mẫu in hóa đơn và vận đơn</p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Lưu cài đặt
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="border-b border-gray-200/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
          <nav className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('invoice')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === 'invoice'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Hóa đơn</span>
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                activeTab === 'shipping'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <Package className="w-5 h-5" />
              <span>Vận đơn</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'invoice' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cài đặt in hóa đơn</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paper Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Kích thước giấy</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kích thước</label>
                    <select
                      value={invoiceSettings.paperSize}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, paperSize: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {paperSizes.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>
                  {invoiceSettings.paperSize === 'custom' && (
                    <>
                      <Input
                        label="Chiều rộng (mm)"
                        value={invoiceSettings.customWidth}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, customWidth: e.target.value })}
                      />
                      <Input
                        label="Chiều cao (mm)"
                        value={invoiceSettings.customHeight}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, customHeight: e.target.value })}
                      />
                    </>
                  )}
                  <Input
                    label="Lề (mm)"
                    value={invoiceSettings.margin}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, margin: e.target.value })}
                  />
                </div>

                {/* Font Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Cỡ chữ</h3>
                  <Input
                    label="Cỡ chữ mặc định (pt)"
                    type="number"
                    value={invoiceSettings.fontSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, fontSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ tiêu đề (pt)"
                    type="number"
                    value={invoiceSettings.titleSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, titleSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ header (pt)"
                    type="number"
                    value={invoiceSettings.headerFontSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, headerFontSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ section (pt)"
                    type="number"
                    value={invoiceSettings.sectionTitleSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, sectionTitleSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ footer (pt)"
                    type="number"
                    value={invoiceSettings.footerFontSize}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerFontSize: parseInt(e.target.value) })}
                  />
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Thông tin công ty</h3>
                  <Input
                    label="URL Logo"
                    value={invoiceSettings.logoUrl}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, logoUrl: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Chiều rộng logo (px)"
                      type="number"
                      value={invoiceSettings.logoWidth}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, logoWidth: parseInt(e.target.value) })}
                    />
                    <Input
                      label="Chiều cao logo (px)"
                      type="number"
                      value={invoiceSettings.logoHeight}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, logoHeight: parseInt(e.target.value) })}
                    />
                  </div>
                  <Input
                    label="Tên công ty"
                    value={invoiceSettings.companyName}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyName: e.target.value })}
                  />
                  <Input
                    label="Địa chỉ"
                    value={invoiceSettings.companyAddress}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyAddress: e.target.value })}
                  />
                  <Input
                    label="Điện thoại"
                    value={invoiceSettings.companyPhone}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyPhone: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={invoiceSettings.companyEmail}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyEmail: e.target.value })}
                  />
                  <Input
                    label="Mã số thuế"
                    value={invoiceSettings.companyTaxCode}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyTaxCode: e.target.value })}
                  />
                </div>

                {/* Display Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Hiển thị</h3>
                  <Input
                    label="Tiêu đề hóa đơn"
                    value={invoiceSettings.title}
                    onChange={(e) => setInvoiceSettings({ ...invoiceSettings, title: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Căn lề header</label>
                    <select
                      value={invoiceSettings.headerAlign}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, headerAlign: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="left">Trái</option>
                      <option value="center">Giữa</option>
                      <option value="right">Phải</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Căn lề bảng</label>
                    <select
                      value={invoiceSettings.tableAlign}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, tableAlign: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="left">Trái</option>
                      <option value="center">Giữa</option>
                      <option value="right">Phải</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={invoiceSettings.showBarcode}
                        onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showBarcode: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span>Hiển thị mã vạch</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Footer text</label>
                    <textarea
                      value={invoiceSettings.footerText}
                      onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Cài đặt in vận đơn</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paper Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Kích thước giấy</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kích thước</label>
                    <select
                      value={shippingSettings.paperSize}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, paperSize: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {paperSizes.map(size => (
                        <option key={size.value} value={size.value}>{size.label}</option>
                      ))}
                    </select>
                  </div>
                  {shippingSettings.paperSize === 'custom' && (
                    <>
                      <Input
                        label="Chiều rộng (mm)"
                        value={shippingSettings.customWidth}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, customWidth: e.target.value })}
                      />
                      <Input
                        label="Chiều cao (mm)"
                        value={shippingSettings.customHeight}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, customHeight: e.target.value })}
                      />
                    </>
                  )}
                  <Input
                    label="Lề (mm)"
                    value={shippingSettings.margin}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, margin: e.target.value })}
                  />
                  <Input
                    label="Padding (mm)"
                    value={shippingSettings.padding}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, padding: e.target.value })}
                  />
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shippingSettings.showBorder}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, showBorder: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span>Hiển thị viền</span>
                    </label>
                  </div>
                </div>

                {/* Font Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Cỡ chữ</h3>
                  <Input
                    label="Cỡ chữ mặc định (pt)"
                    type="number"
                    value={shippingSettings.fontSize}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, fontSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ tiêu đề (pt)"
                    type="number"
                    value={shippingSettings.titleSize}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, titleSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ section (pt)"
                    type="number"
                    value={shippingSettings.sectionTitleSize}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, sectionTitleSize: parseInt(e.target.value) })}
                  />
                  <Input
                    label="Cỡ chữ footer (pt)"
                    type="number"
                    value={shippingSettings.footerFontSize}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, footerFontSize: parseInt(e.target.value) })}
                  />
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Thông tin người gửi</h3>
                  <Input
                    label="URL Logo"
                    value={shippingSettings.logoUrl}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, logoUrl: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Chiều rộng logo (px)"
                      type="number"
                      value={shippingSettings.logoWidth}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, logoWidth: parseInt(e.target.value) })}
                    />
                    <Input
                      label="Chiều cao logo (px)"
                      type="number"
                      value={shippingSettings.logoHeight}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, logoHeight: parseInt(e.target.value) })}
                    />
                  </div>
                  <Input
                    label="Tên công ty"
                    value={shippingSettings.companyName}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, companyName: e.target.value })}
                  />
                  <Input
                    label="Tên người gửi"
                    value={shippingSettings.senderName}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, senderName: e.target.value })}
                  />
                  <Input
                    label="Địa chỉ người gửi"
                    value={shippingSettings.senderAddress}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, senderAddress: e.target.value })}
                  />
                  <Input
                    label="Điện thoại người gửi"
                    value={shippingSettings.senderPhone}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, senderPhone: e.target.value })}
                  />
                </div>

                {/* Display Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Hiển thị</h3>
                  <Input
                    label="Tiêu đề vận đơn"
                    value={shippingSettings.title}
                    onChange={(e) => setShippingSettings({ ...shippingSettings, title: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Căn lề header</label>
                    <select
                      value={shippingSettings.headerAlign}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, headerAlign: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="left">Trái</option>
                      <option value="center">Giữa</option>
                      <option value="right">Phải</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shippingSettings.showBarcode}
                        onChange={(e) => setShippingSettings({ ...shippingSettings, showBarcode: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span>Hiển thị mã vạch</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Footer text</label>
                    <textarea
                      value={shippingSettings.footerText}
                      onChange={(e) => setShippingSettings({ ...shippingSettings, footerText: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PrintSettings

