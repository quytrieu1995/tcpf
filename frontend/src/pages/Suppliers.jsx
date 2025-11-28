import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Search, Building } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const Suppliers = () => {
  const toast = useToast()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    tax_code: '',
    bank_account: '',
    notes: '',
    is_active: true
  })

  useEffect(() => {
    fetchSuppliers()
  }, [searchTerm])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const url = `/suppliers${searchTerm ? `?search=${searchTerm}` : ''}`
      const response = await api.get(url)
      setSuppliers(response.data)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Không thể tải danh sách nhà cung cấp')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formData)
        toast.success('Cập nhật nhà cung cấp thành công!')
      } else {
        await api.post('/suppliers', formData)
        toast.success('Tạo nhà cung cấp thành công!')
      }
      setShowModal(false)
      resetForm()
      fetchSuppliers()
    } catch (error) {
      console.error('Error saving supplier:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name || '',
      contact_name: supplier.contact_name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      tax_code: supplier.tax_code || '',
      bank_account: supplier.bank_account || '',
      notes: supplier.notes || '',
      is_active: supplier.is_active !== false
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) return
    
    try {
      await api.delete(`/suppliers/${id}`)
      toast.success('Xóa nhà cung cấp thành công!')
      fetchSuppliers()
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error('Có lỗi xảy ra khi xóa nhà cung cấp')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      tax_code: '',
      bank_account: '',
      notes: '',
      is_active: true
    })
    setEditingSupplier(null)
  }

  const columns = [
    {
      key: 'name',
      header: 'Tên nhà cung cấp',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <Building className="w-5 h-5 text-gray-400 mr-2" />
          <span className="font-semibold text-gray-900">{row.name}</span>
        </div>
      )
    },
    {
      key: 'contact_name',
      header: 'Người liên hệ',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.contact_name || '-'}</span>
      )
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.phone || '-'}</span>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.email || '-'}</span>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quản lý nhà cung cấp</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý thông tin nhà cung cấp và đối tác</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm nhà cung cấp
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Tìm kiếm nhà cung cấp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        <DataTable
          data={suppliers}
          columns={columns}
          loading={loading}
          searchable={false}
          pagination={true}
          pageSize={20}
          emptyMessage="Chưa có nhà cung cấp nào"
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingSupplier ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên nhà cung cấp <span className="text-red-500">*</span>
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
                Người liên hệ
              </label>
              <Input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Điện thoại
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Địa chỉ
              </label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã số thuế
              </label>
              <Input
                type="text"
                value={formData.tax_code}
                onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tài khoản
              </label>
              <Input
                type="text"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
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
              {editingSupplier ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Suppliers

