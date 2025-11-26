import { useEffect, useState } from 'react'
import axios from 'axios'
import { Plus, Edit, Trash2, Truck } from 'lucide-react'
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
    sort_order: 0
  })

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
      sort_order: carrier.sort_order || 0
    })
    setShowModal(true)
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
      sort_order: 0
    })
    setEditingCarrier(null)
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
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-700"
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

