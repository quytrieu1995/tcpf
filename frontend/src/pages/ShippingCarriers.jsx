import { useEffect, useState } from 'react'
import axios from 'axios'
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
  const [testingConnection, setTestingConnection] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)

  useEffect(() => {
    fetchCarriers()
  }, [])

  const fetchCarriers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/shipping')
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
      if (editingCarrier) {
        await axios.put(`/api/shipping/${editingCarrier.id}`, formData)
        toast.success('Cập nhật đơn vị vận chuyển thành công!')
      } else {
        await axios.post('/api/shipping', formData)
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
      api_config: carrier.api_config || {}
    })
    setShowApiConfig(!!carrier.api_type)
    setShowModal(true)
  }

  const handleTestConnection = async (carrierId) => {
    try {
      setTestingConnection(true)
      const response = await axios.post(`/api/shipping/${carrierId}/test-connection`)
      if (response.data.success) {
        toast.success('Kết nối thành công!')
        fetchCarriers()
      } else {
        toast.error(`Kết nối thất bại: ${response.data.message}`)
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
      const response = await axios.post(`/api/shipments/carrier/${carrierId}/sync`)
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
      await axios.delete(`/api/shipping/${id}`)
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
      key: 'is_connected',
      header: 'Kết nối',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_connected ? (
            <span className="flex items-center text-green-600 text-xs">
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
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại API
                  </label>
                  <select
                    value={formData.api_type}
                    onChange={(e) => setFormData({ ...formData, api_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Chọn loại API</option>
                    <option value="ghn">Giao Hàng Nhanh (GHN)</option>
                    <option value="viettel_post">Viettel Post</option>
                    <option value="ghtk">Giao Hàng Tiết Kiệm (GHTK)</option>
                    <option value="manual">Thủ công (Không có API)</option>
                  </select>
                </div>

                {formData.api_type && formData.api_type !== 'manual' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Endpoint
                      </label>
                      <Input
                        type="text"
                        value={formData.api_endpoint}
                        onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                        placeholder="https://api.example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <Input
                        type="password"
                        value={formData.api_key}
                        onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                        placeholder="Nhập API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Secret (Nếu có)
                      </label>
                      <Input
                        type="password"
                        value={formData.api_secret}
                        onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                        placeholder="Nhập API Secret"
                      />
                    </div>
                    {editingCarrier && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleTestConnection(editingCarrier.id)}
                        disabled={testingConnection || !formData.api_endpoint || !formData.api_key}
                        className="w-full"
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        {testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
                      </Button>
                    )}
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

