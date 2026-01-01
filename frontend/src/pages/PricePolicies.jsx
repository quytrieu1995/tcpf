import { useState, useEffect } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Button from '../components/Button'
import DataTable from '../components/DataTable'

const PricePolicies = () => {
  const toast = useToast()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    customer_group_id: null,
    product_id: null,
    price: '',
    min_quantity: 1,
    start_date: '',
    end_date: '',
    is_active: true
  })

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      const response = await api.get('/price-policies')
      setPolicies(response.data || [])
    } catch (error) {
      console.error('Error fetching price policies:', error)
      toast.error('Không thể tải danh sách chính sách giá')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPolicy) {
        await api.put(`/price-policies/${editingPolicy.id}`, formData)
        toast.success('Cập nhật chính sách giá thành công')
      } else {
        await api.post('/price-policies', formData)
        toast.success('Tạo chính sách giá thành công')
      }
      setShowModal(false)
      setEditingPolicy(null)
      setFormData({
        name: '',
        customer_group_id: null,
        product_id: null,
        price: '',
        min_quantity: 1,
        start_date: '',
        end_date: '',
        is_active: true
      })
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleEdit = (policy) => {
    setEditingPolicy(policy)
    setFormData({
      name: policy.name,
      customer_group_id: policy.customer_group_id,
      product_id: policy.product_id,
      price: policy.price,
      min_quantity: policy.min_quantity || 1,
      start_date: policy.start_date ? policy.start_date.split('T')[0] : '',
      end_date: policy.end_date ? policy.end_date.split('T')[0] : '',
      is_active: policy.is_active !== false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa chính sách giá này?')) return
    
    try {
      await api.delete(`/price-policies/${id}`)
      toast.success('Xóa chính sách giá thành công')
      fetchPolicies()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Tên chính sách',
      render: (row) => <span className="font-medium">{row.name}</span>
    },
    {
      key: 'price',
      header: 'Giá',
      render: (row) => (
        <span className="text-blue-600 font-semibold">
          {new Intl.NumberFormat('vi-VN').format(row.price)} đ
        </span>
      )
    },
    {
      key: 'min_quantity',
      header: 'Số lượng tối thiểu',
      render: (row) => <span>{row.min_quantity || 1}</span>
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs ${
          row.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {row.is_active !== false ? 'Hoạt động' : 'Tạm khóa'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thiết lập giá</h1>
          <p className="text-gray-600 mt-1">Quản lý chính sách giá cho khách hàng và sản phẩm</p>
        </div>
        <Button
          onClick={() => {
            setEditingPolicy(null)
            setFormData({
              name: '',
              customer_group_id: null,
              product_id: null,
              price: '',
              min_quantity: 1,
              start_date: '',
              end_date: '',
              is_active: true
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm chính sách giá
        </Button>
      </div>

      <DataTable
        data={policies}
        columns={columns}
        loading={loading}
        searchable
        searchPlaceholder="Tìm kiếm chính sách giá..."
      />

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingPolicy(null)
        }}
        title={editingPolicy ? 'Chỉnh sửa chính sách giá' : 'Thêm chính sách giá'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên chính sách"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Giá"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
          <Input
            label="Số lượng tối thiểu"
            type="number"
            value={formData.min_quantity}
            onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
            min="1"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Kích hoạt
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                setEditingPolicy(null)
              }}
            >
              Hủy
            </Button>
            <Button type="submit">
              {editingPolicy ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PricePolicies

