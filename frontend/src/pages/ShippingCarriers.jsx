import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Truck, RefreshCw, Link2, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const ShippingCarriers = () => {
  const toast = useToast()
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCarrier, setEditingCarrier] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: '',
    estimated_days: '',
    is_active: true,
    sort_order: 0,
    api_type: '',
    api_endpoint: '',
    api_key: '',
    api_secret: '',
    api_config: {}
  })

  const carrierConfigs = {
    'ghn': {
      name: 'Giao Hàng Nhanh (GHN)',
      defaultEndpoint: 'https://dev-online-gateway.ghn.vn',
      fields: [
        { key: 'shop_id', label: 'Shop ID', type: 'text', required: true },
        { key: 'client_id', label: 'Client ID', type: 'text', required: false }
      ],
      helpText: 'Lấy Token và Shop ID từ https://api.ghn.vn'
    },
    'jnt': {
      name: 'J&T Express',
      defaultEndpoint: 'https://api.jtexpress.vn',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'customer_code', label: 'Customer Code', type: 'text', required: false }
      ],
      helpText: 'Lấy API Key từ https://jtexpress.vn'
    },
    'ghtk': {
      name: 'Giao Hàng Tiết Kiệm (GHTK)',
      defaultEndpoint: 'https://services.giaohangtietkiem.vn',
      fields: [
        { key: 'shop_id', label: 'Shop ID', type: 'text', required: false }
      ],
      helpText: 'Lấy Token từ https://giaohangtietkiem.vn'
    },
    'viettel_post': {
      name: 'Viettel Post',
      defaultEndpoint: 'https://api.viettelpost.vn',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true }
      ],
      helpText: 'Sử dụng thông tin đăng nhập Viettel Post'
    },
    'shopee_express': {
      name: 'Shopee Express',
      defaultEndpoint: 'https://open-api.shopee.vn',
      fields: [
        { key: 'partner_id', label: 'Partner ID', type: 'text', required: true },
        { key: 'shop_id', label: 'Shop ID', type: 'text', required: true }
      ],
      helpText: 'Lấy thông tin từ Shopee Partner Center'
    },
    'vnpost': {
      name: 'VnPost (Vietnam Post)',
      defaultEndpoint: 'https://api.vnpost.vn',
      fields: [
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
        { key: 'customer_code', label: 'Customer Code', type: 'text', required: false }
      ],
      helpText: 'Sử dụng thông tin đăng nhập VnPost'
    },
    'manual': {
      name: 'Thủ công',
      defaultEndpoint: '',
      fields: [],
      helpText: 'Không sử dụng API, quản lý thủ công'
    }
  }
  const [testingConnection, setTestingConnection] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)

  useEffect(() => {
    fetchCarriers()
  }, [])

  const fetchCarriers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/shipping')
      setCarriers(response.data)
    } catch (error) {
      console.error('Error fetching carriers:', error)
      toast.error('Không thể tải danh sách đơn vị vận chuyển')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Auto-fill name if not provided and api_type is selected
      if (!formData.name && formData.api_type && formData.api_type !== 'manual') {
        formData.name = carrierConfigs[formData.api_type]?.name || formData.api_type
      }

      const submitData = {
        ...formData,
        api_config: formData.api_config || {}
      }

      if (editingCarrier) {
        await api.put(`/shipping/${editingCarrier.id}`, submitData)
        toast.success('Cập nhật đơn vị vận chuyển thành công!')
      } else {
        await api.post('/shipping', submitData)
        toast.success('Tạo đơn vị vận chuyển thành công!')
      }
      setShowModal(false)
      resetForm()
      fetchCarriers()
    } catch (error) {
      console.error('Error saving carrier:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleEdit = (carrier) => {
    setEditingCarrier(carrier)
    const apiConfig = typeof carrier.api_config === 'string' 
      ? JSON.parse(carrier.api_config || '{}') 
      : (carrier.api_config || {})
    
    setFormData({
      name: carrier.name || '',
      description: carrier.description || '',
      cost: carrier.cost || '',
      estimated_days: carrier.estimated_days || '',
      is_active: carrier.is_active !== false,
      sort_order: carrier.sort_order || 0,
      api_type: carrier.api_type || '',
      api_endpoint: carrier.api_endpoint || '',
      api_key: carrier.api_key || '',
      api_secret: carrier.api_secret || '',
      api_config: apiConfig
    })
    setShowApiConfig(!!carrier.api_type)
    setShowModal(true)
  }

  const handleApiTypeChange = (apiType) => {
    const config = carrierConfigs[apiType]
    const newFormData = {
      ...formData,
      api_type: apiType,
      api_endpoint: config?.defaultEndpoint || '',
      api_config: {}
    }
    setFormData(newFormData)
    setShowApiConfig(apiType !== 'manual' && apiType !== '')
  }

  const handleTestConnection = async (carrierId) => {
    try {
      setTestingConnection(true)
      
      // If editing existing carrier, use its ID
      if (carrierId) {
        const response = await api.post(`/shipping/${carrierId}/test-connection`)
        if (response.data.success) {
          toast.success('Kết nối thành công!')
          fetchCarriers()
        } else {
          toast.error(`Kết nối thất bại: ${response.data.message}`)
        }
      } else {
        // For new carrier, save first then test
        if (!formData.name || !formData.cost) {
          toast.error('Vui lòng điền đầy đủ thông tin cơ bản trước')
          return
        }
        
        // Save carrier first
        const saveResponse = await api.post('/shipping', {
          ...formData,
          api_config: formData.api_config || {}
        })
        
        const newCarrierId = saveResponse.data.id
        
        // Then test connection
        const testResponse = await api.post(`/shipping/${newCarrierId}/test-connection`)
        if (testResponse.data.success) {
          toast.success('Kết nối thành công!')
          setEditingCarrier(saveResponse.data)
          fetchCarriers()
        } else {
          toast.error(`Kết nối thất bại: ${testResponse.data.message}`)
        }
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi kiểm tra kết nối')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSyncCarrier = async (carrierId) => {
    try {
      const response = await api.post(`/shipments/carrier/${carrierId}/sync`)
      toast.success(`Đồng bộ hoàn tất: ${response.data.success}/${response.data.total} thành công`)
      fetchCarriers()
    } catch (error) {
      console.error('Error syncing carrier:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đồng bộ')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn vị vận chuyển này?')) return
    
    try {
      await api.delete(`/shipping/${id}`)
      toast.success('Xóa đơn vị vận chuyển thành công!')
      fetchCarriers()
    } catch (error) {
      console.error('Error deleting carrier:', error)
      toast.error('Có lỗi xảy ra khi xóa đơn vị vận chuyển')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cost: '',
      estimated_days: '',
      is_active: true,
      sort_order: 0,
      api_type: '',
      api_endpoint: '',
      api_key: '',
      api_secret: '',
      api_config: {}
    })
    setEditingCarrier(null)
    setShowApiConfig(false)
  }

  const getCarrierIcon = (apiType) => {
    const icons = {
      'ghn': '🚚',
      'jnt': '📦',
      'ghtk': '🚛',
      'viettel_post': '📮',
      'shopee_express': '🛒',
      'vnpost': '📬',
      'manual': '✋'
    }
    return icons[apiType] || '🚚'
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value)
  }

  const columns = [
    {
      key: 'name',
      header: 'Tên đơn vị',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <Truck className="w-5 h-5 text-gray-400 mr-2" />
          <span className="font-semibold text-gray-900">{row.name}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Mô tả',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.description || '-'}</span>
      )
    },
    {
      key: 'cost',
      header: 'Phí vận chuyển',
      render: (row) => (
        <span className="font-semibold text-gray-900">{formatCurrency(row.cost)}</span>
      )
    },
    {
      key: 'estimated_days',
      header: 'Thời gian (ngày)',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.estimated_days || '-'}</span>
      )
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}
        </span>
      )
    },
    {
      key: 'api_type',
      header: 'Loại',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.api_type ? (
            <>
              <span className="text-lg">{getCarrierIcon(row.api_type)}</span>
              <span className="text-xs text-gray-600">
                {carrierConfigs[row.api_type]?.name || row.api_type}
              </span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">Thủ công</span>
          )}
        </div>
      )
    },
    {
      key: 'is_connected',
      header: 'Kết nối',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_connected ? (
            <span className="flex items-center text-green-600 text-xs font-medium">
              <CheckCircle className="w-4 h-4 mr-1" />
              Đã kết nối
            </span>
          ) : row.api_type ? (
            <span className="flex items-center text-yellow-600 text-xs">
              <XCircle className="w-4 h-4 mr-1" />
              Chưa kết nối
            </span>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            title="Chỉnh sửa"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {row.api_type && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestConnection(row.id)}
                disabled={testingConnection}
                title="Kiểm tra kết nối"
                className="text-blue-600 hover:text-blue-700"
              >
                <Link2 className="w-4 h-4" />
              </Button>
              {row.is_connected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSyncCarrier(row.id)}
                  title="Đồng bộ vận đơn"
                  className="text-green-600 hover:text-green-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-700"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý đơn vị vận chuyển</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý các đơn vị vận chuyển và phí ship</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm đơn vị vận chuyển
        </Button>
      </div>

      <DataTable
        data={carriers}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có đơn vị vận chuyển nào"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingCarrier ? 'Chỉnh sửa đơn vị vận chuyển' : 'Thêm đơn vị vận chuyển mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên đơn vị vận chuyển <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phí vận chuyển (₫) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian ước tính (ngày)
              </label>
              <Input
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Hoạt động</span>
            </label>
          </div>

          {/* API Configuration Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Cấu hình API (Tùy chọn)</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showApiConfig}
                  onChange={(e) => setShowApiConfig(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Kết nối API</span>
              </label>
            </div>

            {showApiConfig && (
              <div className="space-y-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-4 rounded-xl border border-blue-100/50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị vận chuyển <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.api_type}
                    onChange={(e) => handleApiTypeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Chọn đơn vị vận chuyển</option>
                    <option value="ghn">Giao Hàng Nhanh (GHN)</option>
                    <option value="jnt">J&T Express</option>
                    <option value="ghtk">Giao Hàng Tiết Kiệm (GHTK)</option>
                    <option value="viettel_post">Viettel Post</option>
                    <option value="shopee_express">Shopee Express</option>
                    <option value="vnpost">VnPost (Vietnam Post)</option>
                    <option value="manual">Thủ công (Không có API)</option>
                  </select>
                </div>

                {formData.api_type && formData.api_type !== 'manual' && (
                  <>
                    {carrierConfigs[formData.api_type]?.helpText && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-700">
                          <span className="font-semibold">💡 Hướng dẫn:</span> {carrierConfigs[formData.api_type].helpText}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Endpoint <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.api_endpoint}
                        onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                        placeholder={carrierConfigs[formData.api_type]?.defaultEndpoint || "https://api.example.com"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key / Token <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="Nhập API Key hoặc Token"
                      />
                    </div>
                    {formData.api_type === 'viettel_post' || formData.api_type === 'vnpost' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Secret / Password
                        </label>
                        <Input
                          type="password"
                          value={formData.api_secret}
                          onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                          placeholder="Nhập API Secret hoặc Password"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Secret (Nếu có)
                        </label>
                        <Input
                          type="password"
                          value={formData.api_secret}
                          onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                          placeholder="Nhập API Secret (tùy chọn)"
                        />
                      </div>
                    )}

                    {/* Carrier-specific fields */}
                    {carrierConfigs[formData.api_type]?.fields && carrierConfigs[formData.api_type].fields.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 uppercase">Cấu hình bổ sung</p>
                        {carrierConfigs[formData.api_type].fields.map((field) => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <Input
                              type={field.type}
                              value={formData.api_config?.[field.key] || ''}
                              onChange={(e) => {
                                const newConfig = { ...formData.api_config, [field.key]: e.target.value }
                                setFormData({ ...formData, api_config: newConfig })
                              }}
                              placeholder={`Nhập ${field.label.toLowerCase()}`}
                              required={field.required}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTestConnection(editingCarrier?.id)}
                      disabled={testingConnection || !formData.api_endpoint || !formData.api_key}
                      className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowModal(false); resetForm() }}
            >
              Hủy
            </Button>
            <Button type="submit">
              {editingCarrier ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ShippingCarriers

