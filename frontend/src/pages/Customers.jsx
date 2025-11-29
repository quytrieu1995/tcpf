import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, User, Mail, Phone, MapPin, DollarSign, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { SkeletonTable } from '../components/Skeleton'
import AddressAutocomplete from '../components/AddressAutocomplete'

const Customers = () => {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [customerGroups, setCustomerGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    group_id: null,
    credit_limit: 0,
    tags: []
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    fetchCustomers()
    fetchCustomerGroups()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/customers?limit=1000')
      setCustomers(response.data.customers || response.data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Không thể tải danh sách khách hàng')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerGroups = async () => {
    try {
      const response = await api.get('/customer-groups')
      setCustomerGroups(response.data)
    } catch (error) {
      console.error('Error fetching customer groups:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setFormErrors({ name: 'Tên khách hàng là bắt buộc' })
      return
    }

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData)
        toast.success('Cập nhật khách hàng thành công!')
      } else {
        await api.post('/customers', formData)
        toast.success('Thêm khách hàng thành công!')
      }
      setShowModal(false)
      setEditingCustomer(null)
      setFormData({ name: '', email: '', phone: '', address: '', group_id: null, credit_limit: 0, tags: [] })
      setFormErrors({})
      fetchCustomers()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error('Có lỗi xảy ra khi lưu khách hàng')
    }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      group_id: customer.group_id,
      credit_limit: customer.credit_limit || 0,
      tags: customer.tags || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return
    
    try {
      await api.delete(`/customers/${id}`)
      toast.success('Xóa khách hàng thành công!')
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Có lỗi xảy ra khi xóa khách hàng')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value || 0)
  }

  const columns = [
    {
      key: 'name',
      header: 'Khách hàng',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{row.name}</div>
            {row.group_name && (
              <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                {row.group_name}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      render: (row) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3 h-3 mr-1" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-3 h-3 mr-1" />
              {row.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'stats',
      header: 'Thống kê',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <ShoppingCart className="w-3 h-3 mr-1 text-gray-400" />
            <span className="text-gray-600">{row.total_orders || 0} đơn</span>
          </div>
          <div className="flex items-center text-sm">
            <DollarSign className="w-3 h-3 mr-1 text-gray-400" />
            <span className="text-gray-600">{formatCurrency(row.total_purchases)}</span>
          </div>
        </div>
      )
    },
    {
      key: 'debt_amount',
      header: 'Công nợ',
      sortable: true,
      render: (row) => (
        <div>
          {row.debt_amount > 0 ? (
            <span className="text-red-600 font-semibold">{formatCurrency(row.debt_amount)}</span>
          ) : (
            <span className="text-green-600">0đ</span>
          )}
          {row.credit_limit > 0 && (
            <div className="text-xs text-gray-500">Hạn mức: {formatCurrency(row.credit_limit)}</div>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      header: 'Ngày tham gia',
      sortable: true,
      render: (row) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.created_at), 'dd/MM/yyyy')}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      sortable: false,
      render: (row) => (
        <div className="flex items-center space-x-2">
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
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      )
    }
  ]

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
        </div>
        <SkeletonTable rows={10} cols={6} />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý khách hàng</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý thông tin khách hàng</p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null)
            setFormData({ name: '', email: '', phone: '', address: '', group_id: null, credit_limit: 0, tags: [] })
            setFormErrors({})
            setShowModal(true)
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Thêm khách hàng
        </Button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có khách hàng nào"
      />

      {/* Customer Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingCustomer(null)
          setFormData({ name: '', email: '', phone: '', address: '', group_id: null, credit_limit: 0, tags: [] })
          setFormErrors({})
        }}
        title={editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên khách hàng"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Số điện thoại"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              placeholder="Nhập địa chỉ khách hàng"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm khách hàng</label>
              <select
                value={formData.group_id || ''}
                onChange={(e) => setFormData({ ...formData, group_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Không có nhóm</option>
                {customerGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Hạn mức tín dụng"
              type="number"
              step="0.01"
              min="0"
              value={formData.credit_limit}
              onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              helperText="Hạn mức công nợ cho phép"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setEditingCustomer(null)
                setFormData({ name: '', email: '', phone: '', address: '', group_id: null, credit_limit: 0, tags: [] })
                setFormErrors({})
              }}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              {editingCustomer ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Customers
