import { useEffect, useState } from 'react'
import api from '../config/api'
import { Plus, Edit, Trash2, Shield, User } from 'lucide-react'
import { useToast } from '../components/ToastContainer'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const UsersManagement = () => {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff',
    full_name: '',
    phone: '',
    is_active: true,
    permissions: []
  })

  const availablePermissions = [
    'products:read',
    'products:write',
    'orders:read',
    'orders:write',
    'customers:read',
    'customers:write',
    'inventory:read',
    'inventory:write',
    'reports:read',
    'users:read',
    'users:write'
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        // Remove password field if it's empty when editing
        const updateData = { ...formData }
        if (!updateData.password || updateData.password.trim() === '') {
          delete updateData.password
        }
        await api.put(`/users/${editingUser.id}`, updateData)
        toast.success('Cập nhật người dùng thành công!')
      } else {
        await api.post('/users', formData)
        toast.success('Tạo người dùng thành công!')
      }
      setShowModal(false)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra')
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '',
      role: user.role || 'staff',
      full_name: user.full_name || '',
      phone: user.phone || '',
      is_active: user.is_active !== false,
      permissions: user.permissions || []
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    const user = users.find(u => u.id === id)
    if (!user) return

    // Prevent deleting admin
    if (user.role === 'admin') {
      toast.error('Không thể xóa tài khoản admin')
      return
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${user.username}"?\n\nHành động này không thể hoàn tác.`)) {
      return
    }
    
    try {
      const response = await api.delete(`/users/${id}`)
      toast.success(response.data?.message || 'Xóa người dùng thành công!')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi xóa người dùng'
      toast.error(errorMessage)
    }
  }

  const togglePermission = (permission) => {
    const permissions = formData.permissions.includes(permission)
      ? formData.permissions.filter(p => p !== permission)
      : [...formData.permissions, permission]
    setFormData({ ...formData, permissions })
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'staff',
      full_name: '',
      phone: '',
      is_active: true,
      permissions: []
    })
    setEditingUser(null)
  }

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-800',
      manager: 'bg-blue-100 text-blue-800',
      staff: 'bg-gray-100 text-gray-800'
    }
    const texts = {
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      staff: 'Nhân viên'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role] || colors.staff}`}>
        {texts[role] || role}
      </span>
    )
  }

  const columns = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      sortable: true,
      render: (row) => (
        <div className="flex items-center">
          <User className="w-5 h-5 text-gray-400 mr-2" />
          <span className="font-semibold text-gray-900">{row.username}</span>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.email}</span>
      )
    },
    {
      key: 'full_name',
      header: 'Họ tên',
      render: (row) => (
        <span className="text-sm text-gray-600">{row.full_name || '-'}</span>
      )
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (row) => getRoleBadge(row.role)
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
            disabled={row.role === 'admin'}
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
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Quản lý người dùng</h2>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Quản lý tài khoản và phân quyền người dùng</p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm người dùng
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        loading={loading}
        searchable={true}
        pagination={true}
        pageSize={20}
        emptyMessage="Chưa có người dùng nào"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm() }}
        title={editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên đăng nhập <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                disabled={!!editingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'} {!editingUser && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="staff">Nhân viên</option>
                <option value="manager">Quản lý</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Họ tên
              </label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
          </div>

          {formData.role !== 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-1" />
                Phân quyền
              </label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                {availablePermissions.map(permission => (
                  <label key={permission} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              {editingUser ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default UsersManagement

